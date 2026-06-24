# Embedded Practice Extraction

## Overview

When a method is added to the library, the system automatically extracts embedded baseline practices and extension practices, saving them as separate, independent documents. The method is then transformed to use `baselinePracticeName` and `practiceNames` instead of embedded objects.

## Why This Matters

This normalization process provides several benefits:

1. **Reusability**: Extracted baseline and extension practices become standalone library items that can be reused across multiple methods
2. **Consistency**: Practice definitions (both baseline and extensions) are maintained in one place rather than duplicated across methods
3. **Library Organization**: The library index can discover and reference all practices uniformly
4. **Storage Efficiency**: Reduces duplication by storing baseline and practices only once
5. **Canonical Baselines**: Ensures baseline practices are authoritative and not fragmented across methods

## How It Works

### Automatic Extraction Process

When a method document is created or updated via the API:

1. **Detection**: The system checks if the method has:
   - Embedded baseline in the `baselinePractice` object
   - Embedded practices in the `practices` array
2. **Extraction**:
   - The baseline practice is extracted (if embedded)
   - Each extension practice is extracted and checked against existing library practices
3. **Persistence**:
   - The baseline is saved/updated as a separate baseline practice document
   - Extension practices are saved/updated as separate practice documents
   - Existing documents with the same name are overwritten
4. **Transformation**: The method is modified to use:
   - `baselinePracticeName` instead of embedded `baselinePractice`
   - `practiceNames` array instead of embedded `practices`

### Example Transformation

**Before** (Method with embedded baseline and practices):

```json
{
  "name": "Agile Development Method",
  "description": "A comprehensive agile method",
  "baselinePractice": {
    "name": "Software Engineering Kernel",
    "description": "Core software engineering baseline",
    "focuses": [...],
    "alphas": [...],
    "activitySpaces": [...],
    ...
  },
  "practices": [
    {
      "name": "Scrum Practice",
      "description": "Core Scrum framework",
      "baselinePracticeName": "Software Engineering Kernel",
      ...
    },
    {
      "name": "XP Engineering Practice",
      "description": "Extreme Programming practices",
      "baselinePracticeName": "Software Engineering Kernel",
      ...
    }
  ]
}
```

**After** (Method with name references):

```json
{
  "name": "Agile Development Method",
  "description": "A comprehensive agile method",
  "baselinePracticeName": "Software Engineering Kernel",
  "practiceNames": [
    "Scrum Practice",
    "XP Engineering Practice"
  ]
}
```

**Extracted Documents** (saved as separate practice documents):

- Document 1: `Software Engineering Kernel` (baseline practice)
- Document 2: `Scrum Practice` (extension practice)
- Document 3: `XP Engineering Practice` (extension practice)

## Implementation Details

### Core Functions

- **`extractEmbeddedPractices(method)`**
  - Pure function that transforms a Method object
  - Extracts both baseline and extension practices
  - Returns: `{ transformedMethod, extractedPractices, extractedBaseline }`
  - Location: `/web/src/lib/library/extractEmbeddedPractices.ts`

- **`extractAndPersistEmbeddedPractices(methodBody, store)`**
  - Async function that both extracts and persists baseline and practices
  - Overwrites existing baseline/practices with the same name
  - Returns: Transformed method body with name references
  - Location: `/web/src/lib/library/extractEmbeddedPractices.ts`

### API Integration

The extraction happens automatically in two API routes:

1. **POST `/api/documents`** (Create)
   - When creating a new method with `kind: "method"`
   - Before persisting the method document

2. **PUT `/api/documents/:id`** (Update)
   - When updating an existing method
   - If the body contains embedded practices

### Existing Baseline/Practice Handling

The system handles existing baselines and practices intelligently:

- Before creating a baseline or practice document, it checks if one with the same name already exists
- If found, the existing document is **overwritten** with the new version from the method
- This ensures the method's embedded baseline and practices are the authoritative version
- Baselines are identified by having both `alphas` and `focuses` arrays
- The transformed method references everything by name (`baselinePracticeName`, `practiceNames`)

## Type System Updates

The `Method` type was updated to support both patterns:

```typescript
export type Method = PracticeElement & {
  baselinePractice?: PracticeBaseline;
  baselinePracticeName?: string;
  practices?: Practice[];        // Embedded practices (transformed)
  practiceNames?: string[];      // Practice name references (target)
  citations?: Citation[];
  assets?: Asset[];
};
```

## Schema Support

The JSON schema already supported `practiceNames`:

```json
{
  "practiceNames": {
    "type": "array",
    "items": { "type": "string" },
    "description": "Array of symbolic practice name references. Use this OR practices."
  }
}
```

## Testing

Unit tests are provided in:

- `/web/src/lib/library/__tests__/extractEmbeddedPractices.test.ts`

Test coverage includes:

- Extraction of embedded baseline and practices
- Overwriting existing baseline with same name
- Overwriting existing practices with same name
- Creating new baseline and practice documents
- Extraction of baseline without practices
- Empty practices array handling
- Missing practice names handling
- Preservation of method properties
- Handling methods that already use name references

## Future Considerations

### Potential Enhancements

1. **Version Tracking**: Track which version of a practice a method references
2. **Bulk Extraction**: Tool to scan and normalize all existing methods in the library
3. **Validation**: Ensure referenced practices exist when loading methods
4. **Conflict Warning**: Optionally warn users when overwriting an existing practice that differs from the embedded version

### Migration Path

For existing methods with embedded practices:

1. Methods currently work as-is with embedded practices
2. Extraction happens on next update/save
3. No data loss - embedded practices are preserved as separate documents
4. Library index already handles both patterns during resolution

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and architecture
- [SOUL.md](../SOUL.md) - Engineering principles
- [language.schema.json](../web/public/language.schema.json) - JSON Schema definition
- [types.ts](../web/src/lib/types.ts) - TypeScript type definitions
