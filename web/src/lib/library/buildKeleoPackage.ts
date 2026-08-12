import { strToU8, zipSync } from "fflate";
import { classifyLibraryRoot, type LibraryRootKind } from "./classify";

const SCHEMA_VERSION = "1.0.0";

type PackageDocumentType = "practiceBaseline" | "practice" | "method" | "project";

type PackageDocumentEntry = {
  path: string;
  documentType: PackageDocumentType;
  documentName: string;
  entryPoint?: boolean;
};

type PackageDependencyEntry = {
  packageName: string;
  versionRange: string;
  documentNames?: string[];
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function documentTypeForKind(kind: LibraryRootKind): PackageDocumentType {
  switch (kind) {
    case "method":
      return "method";
    case "baselinePractice":
      return "practiceBaseline";
    case "practice":
      return "practice";
    case "project":
      return "project";
    default:
      return "practice";
  }
}

function extractName(body: Record<string, unknown>): string {
  const n = body.name;
  return typeof n === "string" && n.trim() ? n.trim() : "Untitled";
}

function extractDescription(body: Record<string, unknown>): string {
  const d = body.description;
  if (typeof d === "string" && d.trim()) return d.trim();
  return `Package containing ${extractName(body)}`;
}

function findInLibrary(
  allBodies: Record<string, unknown>[],
  name: string,
  kind: LibraryRootKind,
): Record<string, unknown> | undefined {
  const target = name.trim();
  if (!target) return undefined;
  return allBodies.find(
    b =>
      typeof b === "object" &&
      b !== null &&
      String((b as Record<string, unknown>).name ?? "").trim() === target &&
      classifyLibraryRoot(b) === kind,
  ) as Record<string, unknown> | undefined;
}

/**
 * For a method with embedded baselinePractice/practices, produce an externalized
 * version that uses string references, and return the extracted documents.
 */
function externalizeMethod(body: Record<string, unknown>): {
  externalizedMethod: Record<string, unknown>;
  extractedDocs: Array<{ body: Record<string, unknown>; kind: LibraryRootKind }>;
} {
  const extractedDocs: Array<{ body: Record<string, unknown>; kind: LibraryRootKind }> = [];
  const externalizedMethod = { ...body };

  if (body.baselinePractice && typeof body.baselinePractice === "object") {
    const baseline = body.baselinePractice as Record<string, unknown>;
    const baselineName = extractName(baseline);
    extractedDocs.push({ body: { ...baseline, kind: "practiceBaseline" }, kind: "baselinePractice" });
    externalizedMethod.baselinePracticeName = baselineName;
    delete externalizedMethod.baselinePractice;
  }

  if (Array.isArray(body.practices) && body.practices.length > 0) {
    const practiceNames: string[] = [];
    for (const p of body.practices) {
      if (p && typeof p === "object") {
        const practice = p as Record<string, unknown>;
        const name = extractName(practice);
        practiceNames.push(name);
        extractedDocs.push({ body: { ...practice, kind: "practice" }, kind: "practice" });
      }
    }
    externalizedMethod.practiceNames = practiceNames;
    delete externalizedMethod.practices;
  }

  return { externalizedMethod, extractedDocs };
}

/**
 * Build a single .keleo package (ZIP contents) for one document.
 * The allBodies parameter is the full library — used to resolve baseline
 * dependencies for practices that reference a baselinePracticeName.
 */
export function buildKeleoPackage(
  body: Record<string, unknown>,
  allBodies: Record<string, unknown>[],
): Uint8Array {
  const rootKind = classifyLibraryRoot(body);
  const rootName = extractName(body);
  const packageSlug = slugify(rootName);

  const documentEntries: PackageDocumentEntry[] = [];
  const dependencies: PackageDependencyEntry[] = [];
  const zipFiles: Record<string, Uint8Array> = {};

  const usedSlugs = new Set<string>();
  function uniqueDocPath(name: string): string {
    let slug = slugify(name);
    if (!slug) slug = "document";
    let candidate = slug;
    let i = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${slug}-${i}`;
      i++;
    }
    usedSlugs.add(candidate);
    return `documents/${candidate}.json`;
  }

  function addDocument(
    docBody: Record<string, unknown>,
    docType: PackageDocumentType,
    docName: string,
    entryPoint: boolean,
  ) {
    const path = uniqueDocPath(docName);
    documentEntries.push({ path, documentType: docType, documentName: docName, ...(entryPoint ? { entryPoint: true } : {}) });
    zipFiles[path] = strToU8(JSON.stringify(docBody, null, 2));
  }

  const includedKeys = new Set<string>();

  function addBaselineAndDeps(name: string) {
    const key = `baseline:${name.trim()}`;
    if (includedKeys.has(key)) return;
    includedKeys.add(key);
    const found = findInLibrary(allBodies, name, "baselinePractice");
    if (found) {
      addDocument({ ...found }, "practiceBaseline", name.trim(), false);
      if (Array.isArray(found.baselinePracticeNames)) {
        for (const dep of found.baselinePracticeNames) {
          if (typeof dep === "string" && dep.trim()) addBaselineAndDeps(dep.trim());
        }
      }
    } else {
      dependencies.push({ packageName: slugify(name), versionRange: ">=1.0.0" });
    }
  }

  function addPracticeAndDeps(name: string) {
    const key = `practice:${name.trim()}`;
    if (includedKeys.has(key)) return;
    includedKeys.add(key);
    const found = findInLibrary(allBodies, name, "practice");
    if (found) {
      addDocument({ ...found, kind: "practice" }, "practice", name.trim(), false);
      const bRef = typeof found.baselinePracticeName === "string" ? (found.baselinePracticeName as string).trim() : "";
      if (bRef) addBaselineAndDeps(bRef);
      if (Array.isArray(found.practiceDependencyNames)) {
        for (const dep of found.practiceDependencyNames) {
          if (typeof dep === "string" && dep.trim()) addPracticeAndDeps(dep.trim());
        }
      }
    } else {
      dependencies.push({ packageName: slugify(name), versionRange: ">=1.0.0" });
    }
  }

  function followEmbeddedDeps(docBody: Record<string, unknown>, kind: LibraryRootKind) {
    if (kind === "baselinePractice") {
      if (Array.isArray(docBody.baselinePracticeNames)) {
        for (const dep of docBody.baselinePracticeNames) {
          if (typeof dep === "string" && dep.trim()) addBaselineAndDeps(dep.trim());
        }
      }
    } else if (kind === "practice") {
      const bRef = typeof docBody.baselinePracticeName === "string" ? (docBody.baselinePracticeName as string).trim() : "";
      if (bRef) addBaselineAndDeps(bRef);
      if (Array.isArray(docBody.practiceDependencyNames)) {
        for (const dep of docBody.practiceDependencyNames) {
          if (typeof dep === "string" && dep.trim()) addPracticeAndDeps(dep.trim());
        }
      }
    }
  }

  if (rootKind === "method") {
    const { externalizedMethod, extractedDocs } = externalizeMethod(body);

    for (const { body: docBody, kind } of extractedDocs) {
      const docName = extractName(docBody);
      addDocument(docBody, documentTypeForKind(kind), docName, false);
      includedKeys.add(`${kind === "baselinePractice" ? "baseline" : "practice"}:${docName}`);
      followEmbeddedDeps(docBody, kind);
    }

    addDocument(
      { ...externalizedMethod, kind: "method" },
      "method",
      rootName,
      true,
    );

    const baselineRef = typeof externalizedMethod.baselinePracticeName === "string"
      ? (externalizedMethod.baselinePracticeName as string).trim()
      : "";
    if (baselineRef) addBaselineAndDeps(baselineRef);

    if (Array.isArray(externalizedMethod.practiceNames)) {
      for (const name of externalizedMethod.practiceNames as string[]) {
        if (typeof name === "string" && name.trim()) addPracticeAndDeps(name.trim());
      }
    }
  } else if (rootKind === "practice") {
    addDocument({ ...body, kind: "practice" }, "practice", rootName, true);
    includedKeys.add(`practice:${rootName}`);

    const baselineRef = typeof body.baselinePracticeName === "string"
      ? (body.baselinePracticeName as string).trim()
      : "";
    if (baselineRef) addBaselineAndDeps(baselineRef);

    if (Array.isArray(body.practiceDependencyNames)) {
      for (const depName of body.practiceDependencyNames) {
        if (typeof depName !== "string" || !depName.trim()) continue;
        addPracticeAndDeps(depName.trim());
      }
    }
  } else if (rootKind === "baselinePractice") {
    addDocument({ ...body, kind: "practiceBaseline" }, "practiceBaseline", rootName, true);
    includedKeys.add(`baseline:${rootName}`);

    if (Array.isArray(body.baselinePracticeNames)) {
      for (const dep of body.baselinePracticeNames as string[]) {
        if (typeof dep === "string" && dep.trim()) addBaselineAndDeps(dep.trim());
      }
    }
  } else if (rootKind === "project") {
    addDocument({ ...body, kind: "project" }, "project", rootName, true);
  } else {
    addDocument(body, "practice", rootName, true);
  }

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    package: {
      name: packageSlug || "unnamed-package",
      version: "1.0.0",
      description: extractDescription(body),
    },
    documents: documentEntries,
    ...(dependencies.length > 0 ? { dependencies } : {}),
  };

  zipFiles["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

  return zipSync(zipFiles, { level: 6 });
}

/**
 * Build a bundle of .keleo packages wrapped in an outer ZIP.
 * Each body gets its own .keleo package, and all are collected into one download.
 */
export function buildKeleoPackageBundle(
  bodies: Array<{ body: Record<string, unknown>; displayName: string }>,
  allBodies: Record<string, unknown>[],
): Uint8Array {
  const outerFiles: Record<string, Uint8Array> = {};
  const usedFilenames = new Set<string>();

  for (const { body, displayName } of bodies) {
    let filename = slugify(displayName || extractName(body));
    if (!filename) filename = "package";

    let candidate = filename;
    let i = 2;
    while (usedFilenames.has(candidate)) {
      candidate = `${filename}-${i}`;
      i++;
    }
    usedFilenames.add(candidate);

    const keleoZip = buildKeleoPackage(body, allBodies);
    outerFiles[`${candidate}.keleo`] = keleoZip;
  }

  return zipSync(outerFiles, { level: 6 });
}
