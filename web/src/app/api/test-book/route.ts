import { NextResponse } from "next/server";
import { buildMethodBook } from "@/lib/methodBook";
import type { Method } from "@/lib/types";
import { loadAllLibraryDocumentBodies } from "@/lib/library/loadLibraryBodies";

/**
 * Test endpoint for book generation.
 * GET /api/test-book?organizingPrinciple=methodBook - generates a test method book and returns structure info
 */
export async function GET(req: Request) {
  // Parse query params
  const { searchParams } = new URL(req.url);
  const organizingPrinciple = (searchParams.get('organizingPrinciple') ?? 'pattern') as any;
  try {
    // Load practice library - these ARE the documents themselves
    const documents = await loadAllLibraryDocumentBodies();

    // Find baseline practice (has alphas+focuses, no baselinePracticeName)
    const baseline = documents.find((doc: any) => {
      const hasAlphas = Array.isArray(doc?.alphas) && doc.alphas.length > 0;
      const hasFocuses = Array.isArray(doc?.focuses) && doc.focuses.length > 0;
      const noBaseline = !doc?.baselinePracticeName || String(doc.baselinePracticeName).trim() === '';
      return hasAlphas && hasFocuses && noBaseline;
    });

    if (!baseline) {
      return NextResponse.json({
        error: "No baseline practice found in library",
        documentsLoaded: documents.length,
      }, { status: 404 });
    }

    // Find extension practices (have baselinePracticeName)
    const practices = documents.filter((doc: any) => {
      const hasBaseline = doc?.baselinePracticeName && String(doc.baselinePracticeName).trim() !== '';
      return hasBaseline;
    });

    // Create a test method with baseline + first 2 practices
    const method: Method = {
      name: "Platform Engineering Method (Test)",
      description: "Test method for book generation with baseline and 2 extension practices",
      baselinePractice: baseline as any,
      practices: practices.slice(0, 2) as any,
    };

    // Build the book
    const startTime = Date.now();
    const book = buildMethodBook(method, organizingPrinciple);
    const elapsed = Date.now() - startTime;

    // Build structure report
    const structure = {
      buildTimeMs: elapsed,
      series: {
        title: book.series.title,
        totalVolumes: book.volumes.length,
      },
      volumes: book.volumes.map((vol, idx) => ({
        index: idx,
        title: vol.metadata.title,
        frontMatterSections: vol.frontMatter.length,
        bodyParts: vol.body.length,
        backMatterSections: vol.backMatter.length,
        parts: vol.body.map((part, pIdx) => ({
          index: pIdx,
          heading: part.heading,
          kind: part.kind,
          chapters: part.subsections?.length ?? 0,
          chapterDetails: part.subsections?.map((chapter, cIdx) => ({
            index: cIdx,
            heading: chapter.heading,
            sections: chapter.subsections?.length ?? 0,
          })) ?? [],
        })),
      })),
    };

    return NextResponse.json({
      success: true,
      message: "Book generated successfully",
      structure,
    });

  } catch (error) {
    console.error("Error generating test book:", error);
    return NextResponse.json({
      error: "Failed to generate book",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
