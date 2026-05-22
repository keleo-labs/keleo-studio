import fs from 'fs';
import path from 'path';

interface NarrativeContext {
  seq: number;
  narrativeElementName: string;
  context: string;
}

interface Narrative {
  name?: string;
  description?: string;
  narrativeTypeName?: string;
  narrativeContexts?: NarrativeContext[];
  narratives?: Narrative[];
}

interface Citation {
  name: string;
  description: string;
  authors: string[];
  date: string;
  source: string;
}

/**
 * Extract citation data from a Citation Standard narrative
 */
function narrativeToCitation(narrative: Narrative): Citation | null {
  const typeName = String(narrative.narrativeTypeName ?? '').toLowerCase().trim();

  // Only process Citation Standard narratives
  if (!['citation standard', 'citation', 'reference', 'source'].includes(typeName)) {
    return null;
  }

  const contexts = narrative.narrativeContexts ?? [];

  // Extract fields from narrative contexts
  let authorsRaw = '';
  let date = '';
  let title = '';
  let source = '';

  for (const ctx of contexts) {
    const elementName = ctx.narrativeElementName.toLowerCase();
    const context = ctx.context || '';

    if (elementName === 'author') {
      authorsRaw = context;
    } else if (elementName === 'date') {
      date = context;
    } else if (elementName === 'title') {
      title = context;
    } else if (elementName === 'source') {
      source = context;
    }
  }

  // Parse authors: split by commas and ampersands
  const authors = authorsRaw
    .split(/[,&]/)
    .map(a => a.trim())
    .filter(a => a.length > 0);

  // Use title as the citation name
  const name = title || narrative.name || '';
  const description = narrative.description || '';

  if (!name) {
    console.warn('Citation missing title/name, skipping:', narrative);
    return null;
  }

  return {
    name,
    description,
    authors,
    date,
    source,
  };
}

/**
 * Process narratives array and extract citations
 */
function extractCitationsFromNarratives(narratives: Narrative[]): {
  citations: Citation[];
  remainingNarratives: Narrative[];
} {
  const citations: Citation[] = [];
  const remainingNarratives: Narrative[] = [];

  for (const narrative of narratives) {
    const citation = narrativeToCitation(narrative);

    if (citation) {
      citations.push(citation);
    } else {
      // Recursively process nested narratives
      if (narrative.narratives && narrative.narratives.length > 0) {
        const nested = extractCitationsFromNarratives(narrative.narratives);
        citations.push(...nested.citations);
        narrative.narratives = nested.remainingNarratives;
      }
      remainingNarratives.push(narrative);
    }
  }

  return { citations, remainingNarratives };
}

/**
 * Recursively extract citations from any object with narratives arrays
 */
function extractCitationsFromObject(obj: any): Citation[] {
  const citations: Citation[] = [];

  if (!obj || typeof obj !== 'object') return citations;

  // Process narratives array if present
  if (Array.isArray(obj.narratives)) {
    const result = extractCitationsFromNarratives(obj.narratives);
    citations.push(...result.citations);
    obj.narratives = result.remainingNarratives;
  }

  // Recursively process nested objects and arrays
  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (Array.isArray(value)) {
      for (const item of value) {
        citations.push(...extractCitationsFromObject(item));
      }
    } else if (value && typeof value === 'object') {
      citations.push(...extractCitationsFromObject(value));
    }
  }

  return citations;
}

/**
 * Migrate a single practice document
 */
function migratePractice(practice: any): void {
  console.log(`  Processing practice: ${practice.name || 'Unnamed'}`);

  // Extract all citations from embedded narratives
  const citations = extractCitationsFromObject(practice);

  // Deduplicate by name
  const citationsByName = new Map<string, Citation>();
  for (const citation of citations) {
    const key = citation.name.toLowerCase().trim();
    if (!citationsByName.has(key)) {
      citationsByName.set(key, citation);
    } else {
      console.log(`    Duplicate citation found: "${citation.name}"`);
    }
  }

  // Add to practice
  practice.citations = [...citationsByName.values()];

  // Remove "Citation Standard" narrative type from narrativeTypes array
  if (Array.isArray(practice.narrativeTypes)) {
    const beforeCount = practice.narrativeTypes.length;
    practice.narrativeTypes = practice.narrativeTypes.filter((nt: any) => {
      const ntName = String(nt?.name ?? '').toLowerCase().trim();
      return ntName !== 'citation standard' && ntName !== 'citation';
    });
    const removed = beforeCount - practice.narrativeTypes.length;
    if (removed > 0) {
      console.log(`    Removed ${removed} Citation Standard narrative type(s)`);
    }
  }

  console.log(`  ✓ Extracted ${practice.citations.length} unique citations`);
}

/**
 * Migrate a JSON file containing practices
 */
function migrateFile(filePath: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migrating: ${filePath}`);
  console.log('='.repeat(60));

  // Backup original
  const backupPath = filePath.replace('.json', '.backup.json');
  fs.copyFileSync(filePath, backupPath);
  console.log(`✓ Created backup: ${backupPath}`);

  // Read file
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  let totalCitations = 0;

  // Process all practices (file may be array or single object)
  if (Array.isArray(data)) {
    console.log(`\nProcessing ${data.length} practices...`);
    for (const practice of data) {
      migratePractice(practice);
      totalCitations += (practice.citations || []).length;
    }
  } else {
    console.log('\nProcessing single practice...');
    migratePractice(data);
    totalCitations = (data.citations || []).length;
  }

  // Write result
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n✓ Migration complete!`);
  console.log(`✓ Total citations extracted: ${totalCitations}`);
}

// Main execution
const practicesDir = path.join(__dirname, '..', 'practices');
const adoptionLibraryPath = path.join(practicesDir, 'adoption-library.json');

console.log('Citation Migration Script');
console.log('='.repeat(60));

if (!fs.existsSync(adoptionLibraryPath)) {
  console.error(`\n❌ Error: File not found: ${adoptionLibraryPath}`);
  process.exit(1);
}

try {
  migrateFile(adoptionLibraryPath);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Review migrated adoption-library.json');
  console.log('2. Remove Citation Standard from platform-adoption-kernel.json');
  console.log('3. Validate JSON against schema');
  console.log('4. Test application with migrated data');
  console.log('5. If everything looks good, delete the backup file');

} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
}
