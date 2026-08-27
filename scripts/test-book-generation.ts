/**
 * Test script for book generation.
 * Usage: npx tsx test-book-generation.ts
 */

import fs from "node:fs";
import path from "node:path";
import { buildMethodBook } from "./web/src/lib/methodBook";
import type { Method } from "./web/src/lib/types";

async function main() {
  console.log("Testing Method Book Generation...\n");

  // Load practice library
  const libraryPath = path.join(__dirname, "practices", "adoption-library.json");
  console.log(`Loading practice library from: ${libraryPath}`);

  const libraryData = JSON.parse(fs.readFileSync(libraryPath, "utf-8"));
  const documents = Array.isArray(libraryData.documents) ? libraryData.documents : [];

  console.log(`Loaded ${documents.length} documents from library\n`);

  // Find baseline practice
  const baseline = documents.find((doc: any) => doc.kind === "practiceBaseline");
  if (!baseline) {
    throw new Error("No baseline practice found in library");
  }

  console.log(`Found baseline practice: ${baseline.name}\n`);

  // Find extension practices
  const practices = documents.filter((doc: any) => doc.kind === "practice");
  console.log(`Found ${practices.length} extension practices:`);
  practices.forEach((p: any) => console.log(`  - ${p.name}`));
  console.log();

  // Create a method with baseline + first 2 practices
  const method: Method = {
    kind: "method",
    name: "Platform Engineering Method (Test)",
    description: "Test method for book generation with baseline and 2 extension practices",
    baselinePractice: baseline,
    practices: practices.slice(0, 2),
  };

  console.log("Building method book...");
  const startTime = Date.now();

  const book = buildMethodBook(method, "pattern");

  const elapsed = Date.now() - startTime;
  console.log(`Book built in ${elapsed}ms\n`);

  // Report structure
  console.log("=== Book Structure ===");
  console.log(`Series: ${book.series.title}`);
  console.log(`Total Volumes: ${book.volumes.length}\n`);

  book.volumes.forEach((vol, idx) => {
    console.log(`Volume ${idx}: ${vol.metadata.title}`);
    console.log(`  Front Matter Sections: ${vol.frontMatter.length}`);
    console.log(`  Body Parts: ${vol.body.length}`);
    console.log(`  Back Matter Sections: ${vol.backMatter.length}`);

    // Show body structure
    vol.body.forEach((part, pIdx) => {
      console.log(`  Part ${pIdx + 1}: ${part.heading} (${part.kind})`);
      if (part.subsections) {
        console.log(`    Chapters: ${part.subsections.length}`);
        part.subsections.forEach((chapter, cIdx) => {
          const sectionCount = chapter.subsections ? chapter.subsections.length : 0;
          console.log(`      Ch ${cIdx + 1}: ${chapter.heading} (${sectionCount} sections)`);
        });
      }
    });

    console.log();
  });

  console.log("=== Element Registry ===");
  console.log("(Elements tracked for first-mention deduplication)");

  // Access registry would require returning it from buildMethodBook
  // For now, just report success
  console.log("\nBook generation completed successfully!");
  console.log("\nTo generate PDF, send POST request to /api/pdf with:");
  console.log(JSON.stringify({
    doc: method,
    methodComposition: method,
    bookMode: true,
    organizingPrinciple: "pattern"
  }, null, 2));
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
