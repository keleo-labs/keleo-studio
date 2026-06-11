import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { chromium } from "playwright";

import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
  groupByFocus,
} from "@/lib/ir";
import {
  buildLibraryLookupIndex,
  practiceNeedsLibraryResolution,
  resolvePracticeWithLibraryIndex,
} from "@/lib/library/practiceDependencyResolution";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";
import { THEMES, type ThemeId } from "@/lib/themeTokens";
import { PACKS } from "@/lib/languagePacksData";
import type { LanguagePackId } from "@/lib/languagePackTypes";
import { renderBrowsePdfHtml } from "@/lib/pdfBrowseHtml";
import { relaxCardinalityInSchema } from "@/lib/schemaRelax";
import { isStandaloneBaselinePracticeArtifact } from "@/lib/library/classify";
import type { Method } from "@/lib/types";
import { buildMethodBook, buildPracticeBook, renderMethodBookHtml, type OrganizingPrinciple } from "@/lib/methodBook";

function isMethodCompositionPayload(v: unknown): v is Method {
  if (!v || typeof v !== "object") return false;
  const bp = (v as { baselinePractice?: unknown }).baselinePractice;
  return Boolean(bp && typeof bp === "object" && typeof (bp as { name?: unknown }).name === "string");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const doc = (body as any).doc;
  if (!doc || typeof doc !== "object") {
    return NextResponse.json({ error: "Missing doc" }, { status: 400 });
  }
  const originalDoc = doc as Record<string, unknown>;
  let docObj = doc as Record<string, unknown>;
  if (practiceNeedsLibraryResolution(docObj)) {
    try {
      const bodies = await loadAllLibraryDocumentBodies();
      const index = buildLibraryLookupIndex(bodies);
      docObj = resolvePracticeWithLibraryIndex(docObj, index) as Record<string, unknown>;
    } catch {
      /* keep original doc if store/read fails */
    }
  }
  const showNarrativeSpineCatalog = isStandaloneBaselinePracticeArtifact(docObj);
  const themeId = ((body as any).themeId as ThemeId | undefined) ?? "light";
  const packId = ((body as any).packId as LanguagePackId | undefined) ?? "default";
  const rawComposition = (body as { methodComposition?: unknown }).methodComposition;
  const methodComposition = isMethodCompositionPayload(rawComposition) ? rawComposition : undefined;

  // Book mode parameters
  const bookMode = (body as any).bookMode === true;
  const organizingPrinciple = ((body as any).organizingPrinciple as OrganizingPrinciple | undefined) ?? "pattern";

  const schemaPath = path.join(process.cwd(), "public", "language.schema.json");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  // Allow PDF generation when only cardinality (minItems / minProperties) fails strict schema.
  const relaxedSchema = relaxCardinalityInSchema(schema);
  const validate = ajv.compile(relaxedSchema);
  const ok = validate(docObj);
  const baseline = asBaselineDocument(docObj);
  // Browse sends merged method → composite Practice; it matches what the human-readable panel renders
  // but can still fail full JSON Schema (nested Activity shape, unevaluatedProperties, …).
  // If we can derive a baseline—the same gate the renderer uses—generate the PDF anyway.
  if (!ok && !baseline) {
    return NextResponse.json({ error: "Schema validation failed", issues: validate.errors }, { status: 400 });
  }
  if (!baseline) {
    return NextResponse.json({ error: "Document did not contain a PracticeBaseline / Method.baselinePractice" }, { status: 400 });
  }

  // PDFs should be generated with high-contrast, print-friendly colors regardless of UI theme.
  // We keep the focus swimlane palette but force the overall tokens to the light theme.
  const theme = THEMES.light;
  const t = PACKS[packId] ?? PACKS.default;

  let html: string;
  let filename: string;

  // Choose rendering mode: book or browse
  if (bookMode) {
    if (methodComposition) {
      // Book mode for Method: multi-volume series
      const book = buildMethodBook(methodComposition, organizingPrinciple);
      html = renderMethodBookHtml(book, theme, t);
      filename = `${encodeURIComponent(book.series.title)}-Complete-Series.pdf`;
    } else {
      // Book mode for single Practice/PracticeBaseline: practice book format
      const book = buildPracticeBook(docObj as any, organizingPrinciple);
      html = renderMethodBookHtml(book, theme, t);
      filename = `${encodeURIComponent(book.series.title)}-Book.pdf`;
    }
  } else {
    // Browse mode: existing single-document format (for browse view)
    const baselineForRender = enrichBaselineWithReferencedWrappers(
      docObj,
      baselineWithPracticeActivities(docObj, baseline),
    );
    const grouped = groupByFocus(baselineForRender);
    const citations = Array.isArray(baselineForRender.citations) ? baselineForRender.citations : [];

    html = renderBrowsePdfHtml({
      baseline: baselineForRender,
      grouped,
      theme,
      t,
      sourceDoc: docObj,
      originalDoc,
      methodComposition,
      citations,
    });
    filename = `${encodeURIComponent(baselineForRender.name)}.pdf`;
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await browser.close();
  }
}

