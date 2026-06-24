# Method Book Implementation

## Overview

The method book system transforms Method compositions into multi-volume book series with traditional publishing structure. The system supports multiple **organizing principles** that determine how practice elements are structured into parts and chapters.

## Organizing Principles

### 1. Pattern Organizer (`organizingPrinciple: 'pattern'`)

**Default organizer.** Organizes content based on the practice's Pattern structure.

**Structure:**
- Each `Pattern` becomes a **Part**
- Each `PatternView` becomes a **Chapter**
- Activities, alphas, and work products are extracted from pattern views

**Best for:** Temporal/sequential practices where patterns represent phases or stages.

**Example:**
```
Volume: "7S Alignment Journey"
  Part I: Systemic Alignment Pattern
    Chapter 1: Prerequisites
    Chapter 2: Diagnosis
    Chapter 3: Design
    Chapter 4: Execution
    Chapter 5: Optimization
```

---

### 2. MethodBook Organizer (`organizingPrinciple: 'methodBook'`)

**Template-based organizer** conforming to [docs/methodBook.md](./methodBook.md) outline structure.

**Structure:**
- **PART I: VALUE ARCHITECTURE** - Timeline Phases & Horizon Maps (Patterns)
- **PART II: SOLUTION ARCHITECTURE** - Concerns & Progression Tracks (Alphas)
- **PART III: ENDEAVOR MANAGEMENT** - Work Streams (Activity Spaces) & Playbooks (Activities)

**Best for:** Practices following cognitive ergonomics/UX framework with clear separation of value, solution, and execution concerns.

**Example:**
```
Volume: "7S Alignment Journey"
  Part I: VALUE ARCHITECTURE
    Chapter 1: Timeline Phases & Horizon Maps (Patterns)
      Section: 🗓️ LIFECYCLE ROADMAP: Systemic Alignment Pattern
  
  Part II: SOLUTION ARCHITECTURE
    Chapter 2: Concerns & Progression Tracks (Alphas)
      (if alphas present)
  
  Part III: ENDEAVOR MANAGEMENT & OPERATIONS
    Chapter 3: Strategic Work Stream Swimlanes (Activity Spaces)
    Chapter 4: Operational Playbooks (Activities)
```

**Mapping Logic:**

| Practice Element | Maps To |
|-----------------|---------|
| `patterns` | PART I, Chapter 1 - each pattern becomes a lifecycle roadmap |
| `alphas` | PART II, Chapter 2 - grouped by focus area into tracks |
| `activitySpaces` | PART III, Chapter 3 - high-level work streams |
| `activities` | PART III, Chapter 4 - detailed playbooks |

**Special Features:**
- Alphas are automatically grouped by their `focus` field
- Pattern views become horizon phases showing gates/milestones
- Activity spaces are rendered as swimlanes showing contained activities

---

### 3. Focus Organizer (`organizingPrinciple: 'focus'`)

**Status:** Not yet implemented. Falls back to pattern organizer.

**Planned structure:** Organize by focus areas (Value, Solution, Endeavor, etc.)

---

### 4. Hybrid Organizer (`organizingPrinciple: 'hybrid'`)

**Status:** Not yet implemented. Falls back to pattern organizer.

**Planned structure:** Combines pattern-based temporal flow with focus-based structural organization.

---

## Implementation Files

| File | Purpose |
|------|---------|
| `web/src/lib/methodBook/organizerPattern.ts` | Pattern-based organizer (default) |
| `web/src/lib/methodBook/organizerMethodBook.ts` | MethodBook template organizer (new) |
| `web/src/lib/methodBook/buildMethodBook.ts` | Main entry point - routes to appropriate organizer |
| `web/src/lib/methodBook/types.ts` | Type definitions including `OrganizingPrinciple` |

---

## Usage

### API Routes

**Test Endpoint:**
```bash
# Pattern organizer (default)
GET /api/test-book

# MethodBook organizer
GET /api/test-book?organizingPrinciple=methodBook
```

**PDF Generation:**
```typescript
POST /api/pdf
{
  "doc": { ... },
  "bookMode": true,
  "organizingPrinciple": "methodBook",  // or "pattern"
  "methodComposition": { ... }
}
```

### Programmatic Usage

```typescript
import { buildMethodBook } from '@/lib/methodBook';

const method: Method = {
  name: "My Method",
  baselinePractice: baseline,
  practices: [practice1, practice2],
};

// Pattern organizer
const bookPattern = buildMethodBook(method, 'pattern');

// MethodBook organizer
const bookMethodBook = buildMethodBook(method, 'methodBook');
```

---

## When to Use Each Organizer

### Use **Pattern Organizer** when:
- Practice follows a clear temporal/sequential flow
- Patterns represent lifecycle phases or stages
- Pattern views map directly to execution steps
- Example: Agile Scrum (Sprint phases), Software Lifecycle (Requirements → Design → Implementation → Test → Deploy)

### Use **MethodBook Organizer** when:
- Practice follows cognitive ergonomics/UX framework structure
- Clear separation between value concerns, solution concerns, and execution concerns
- Alphas represent different focus areas (e.g., Stakeholders, Requirements, Software, Team)
- Activities naturally group into strategic swimlanes vs tactical playbooks
- Example: UX Design Method, Platform Engineering Method, Technical Documentation Framework

---

## Extending the System

### Adding a New Organizer

1. Create new organizer file: `web/src/lib/methodBook/organizerYourName.ts`
2. Export function with signature:
   ```typescript
   export function organizeByYourName(
     practice: Practice | PracticeBaseline,
     registry: ElementRegistry,
     volumeIndex: number,
     aliases: DisplayAliasFn,
   ): BookSection[]
   ```
3. Update `OrganizingPrinciple` type in `types.ts`:
   ```typescript
   export type OrganizingPrinciple = 'focus' | 'pattern' | 'hybrid' | 'methodBook' | 'yourName';
   ```
4. Update `buildPracticeBody()` in `buildMethodBook.ts`:
   ```typescript
   case 'yourName':
     return organizeByYourName(practice, registry, volumeIndex, aliases);
   ```
5. Export from `index.ts`

---

## Structure Validation

All organizers must return `BookSection[]` with:
- Each top-level section must have `kind: 'part'`
- Parts contain chapters (`kind: 'chapter'`)
- Chapters contain sections (`kind: 'section'`)
- Sections contain subsections (`kind: 'subsection'`)

**Element Registry:** Track first mentions across volumes for cross-referencing:
- First mention: Full definition with description
- Subsequent mentions: Brief reference with link back

---

## Testing

```bash
# Start dev server
npm run dev

# Test pattern organizer
curl http://localhost:3000/api/test-book

# Test methodBook organizer
curl "http://localhost:3000/api/test-book?organizingPrinciple=methodBook"

# Compare structures
curl -s "http://localhost:3000/api/test-book?organizingPrinciple=pattern" | jq .
curl -s "http://localhost:3000/api/test-book?organizingPrinciple=methodBook" | jq .
```

---

## References

- [docs/methodBook.md](./methodBook.md) - Template outline for methodBook organizer
- [SOUL.md](../SOUL.md) - Engineering principles
- [CLAUDE.md](../CLAUDE.md) - Project overview and guidelines
