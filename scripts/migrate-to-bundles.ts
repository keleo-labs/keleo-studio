/**
 * Migration script: flat document store → workspace bundle.
 *
 * Reads all practice/method documents from web/data/documents/,
 * creates web/data/bundles/_workspace/ with a manifest and document files.
 *
 * Usage: npx tsx scripts/migrate-to-bundles.ts [--dry-run]
 *
 * Documents with kind "dashboard-config" are skipped (they remain in the flat store).
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "web", "data", "documents");
const BUNDLES_DIR = path.join(process.cwd(), "web", "data", "bundles");
const WORKSPACE_DIR = path.join(BUNDLES_DIR, "_workspace");
const WORKSPACE_DOCS_DIR = path.join(WORKSPACE_DIR, "documents");

const dryRun = process.argv.includes("--dry-run");

type StoredDocument = {
  id: string;
  title: string;
  kind: string;
  body: unknown;
  createdAt: string;
  updatedAt: string;
};

type ManifestDocument = {
  path: string;
  documentType: string;
  documentName: string;
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

function extractName(body: unknown): string {
  if (body && typeof body === "object") {
    const n = (body as Record<string, unknown>).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return "Untitled";
}

function classifyDocumentType(body: unknown): string {
  if (!body || typeof body !== "object") return "practice";
  const o = body as Record<string, unknown>;

  if (o.baselinePractice && typeof o.baselinePractice === "object") return "method";
  if (Array.isArray(o.practices) && o.practices.length > 0) return "method";
  if (Array.isArray(o.practiceNames) && o.practiceNames.length > 0) return "method";

  if (o.plan && typeof o.plan === "object" && o.current && typeof o.current === "object") return "project";

  const alphas = Array.isArray(o.alphas) ? o.alphas : [];
  const focuses = Array.isArray(o.focuses) ? o.focuses : [];
  if (alphas.length > 0 && focuses.length > 0) return "practiceBaseline";

  if (typeof o.baselinePracticeName === "string") return "practice";

  return "practice";
}

async function main() {
  console.log(dryRun ? "DRY RUN — no files will be written\n" : "");

  // Check source directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`No documents directory found at ${DATA_DIR}. Nothing to migrate.`);
    return;
  }

  // Check if workspace bundle already exists
  if (fs.existsSync(WORKSPACE_DIR)) {
    console.log(`Workspace bundle already exists at ${WORKSPACE_DIR}.`);
    console.log("Delete it first if you want to re-run the migration.");
    return;
  }

  // Read all documents
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${files.length} document files in ${DATA_DIR}\n`);

  const manifestDocs: ManifestDocument[] = [];
  const usedSlugs = new Set<string>();
  let migrated = 0;
  let skipped = 0;

  for (const file of files) {
    const fullPath = path.join(DATA_DIR, file);
    let raw: string;
    try {
      raw = fs.readFileSync(fullPath, "utf8");
    } catch {
      console.log(`  SKIP ${file} (could not read)`);
      skipped++;
      continue;
    }

    let doc: StoredDocument;
    try {
      doc = JSON.parse(raw) as StoredDocument;
    } catch {
      console.log(`  SKIP ${file} (invalid JSON)`);
      skipped++;
      continue;
    }

    // Skip dashboard-config documents
    if (doc.kind === "dashboard-config") {
      console.log(`  SKIP ${file} (dashboard-config — stays in flat store)`);
      skipped++;
      continue;
    }

    if (!doc.body || typeof doc.body !== "object") {
      console.log(`  SKIP ${file} (no body)`);
      skipped++;
      continue;
    }

    const body = doc.body as Record<string, unknown>;
    const name = extractName(body);
    const docType = classifyDocumentType(body);

    // Generate unique slug
    let slug = slugify(name);
    if (!slug) slug = "document";
    let candidate = slug;
    let i = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${slug}-${i}`;
      i++;
    }
    usedSlugs.add(candidate);

    const docPath = `documents/${candidate}.json`;

    if (!dryRun) {
      fs.mkdirSync(WORKSPACE_DOCS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(WORKSPACE_DIR, docPath),
        JSON.stringify(body, null, 2),
        "utf8",
      );
    }

    manifestDocs.push({
      path: docPath,
      documentType: docType,
      documentName: name,
    });

    console.log(`  MIGRATE ${file} → ${docPath} (${docType}: "${name}")`);
    migrated++;
  }

  // Write manifest
  const manifest = {
    schemaVersion: "2.0.0",
    package: {
      name: "_workspace",
      version: "0.0.0",
      description: "User-created and edited documents (migrated from flat store)",
    },
    documents: manifestDocs,
  };

  if (!dryRun) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(WORKSPACE_DIR, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped`);
  console.log(`Workspace bundle: ${WORKSPACE_DIR}`);
  console.log(`Manifest: ${path.join(WORKSPACE_DIR, "manifest.json")} (${manifestDocs.length} documents)`);

  if (dryRun) {
    console.log("\nThis was a dry run. No files were created. Run without --dry-run to apply.");
  } else {
    console.log("\nThe flat document store was NOT deleted. Both sources will be read (dual-source mode).");
    console.log("Once verified, you can delete web/data/documents/ to complete the migration.");
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
