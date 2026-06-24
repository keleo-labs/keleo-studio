# CLAUDE.md - Keleo Studio Project Guide

> **IMPORTANT:** All engineering decisions in this project must adhere to the principles in [SOUL.md](./SOUL.md). Read SOUL.md first - it defines our architectural pillars, code quality standards, and decision framework.

---

## Project Overview

**Keleo Studio** is a comprehensive practice management and method composition system built on a practice language derived from SEMAT Essence. While originally designed for software engineering, the system supports any domain where teams need to define, compose, and manage structured practices and methods.

### Core Capabilities
- Practice authoring with schema validation
- Method composition from baseline practices and extensions
- Visualization (Kanban pattern boards, Sankey diagrams, topology views)
- Library management (import/export, browse by tags)
- PDF report generation

---

## Technology Stack

- **Frontend:** Next.js 15, React 19, TypeScript (strict mode)
- **UI Framework:** PatternFly 6 React components
- **Styling:** Tailwind CSS 4
- **Storage:** Pluggable (file-based JSON or MongoDB)
- **Validation:** JSON Schema based on SEMAT Essence language model
- **Visualization:** Custom implementations for diagrams

---

## Project Structure

```
keleo-studio/
├── web/                              # Next.js web application
│   ├── src/
│   │   ├── app/                      # Next.js app router
│   │   │   ├── api/                  # API routes (thin controllers)
│   │   │   │   ├── documents/        # CRUD operations
│   │   │   │   └── pdf/              # PDF generation
│   │   │   ├── library/              # Practice library browser
│   │   │   ├── method-builder/       # Method composition UI
│   │   │   ├── practice-author/      # Practice authoring UI
│   │   │   ├── flow-visualizer/      # Kanban pattern visualization
│   │   │   └── topology-viewer/      # Topology diagram viewer
│   │   ├── components/               # React components
│   │   │   └── editors/              # Field editors for practices
│   │   ├── lib/                      # Core business logic (storage-agnostic)
│   │   │   ├── library/              # Library management & resolution
│   │   │   ├── methodMerge/          # Practice composition algorithms
│   │   │   ├── practiceReport/       # PDF report generation
│   │   │   ├── storage/              # Storage abstraction layer
│   │   │   ├── types.ts              # TypeScript type definitions
│   │   │   └── validate.ts           # Schema validation logic
│   │   └── hooks/                    # React hooks
│   └── public/
│       └── language.schema.json      # JSON Schema (source of truth)
├── practices/                        # Practice library storage
│   └── adoption-library.json         # Main practice library
├── docs/                             # Documentation
├── validate-schema.js                # Schema validation utility
└── SOUL.md                           # Engineering philosophy (READ THIS FIRST)
```

---

## Core Concepts

### Practice Language Model

The system is built on a formal language model derived from SEMAT Essence:

- **PracticeBaseline:** Foundation practices (kernel) with core elements
- **Practice:** Extensions that build on baselines
- **Method:** Composed from a baseline + multiple practices
- **Alphas:** Essential elements of concern (e.g., requirements, software system, team)
- **States:** Progression checkpoints for alphas
- **Activities:** Work that advances alpha states
- **WorkProducts:** Artifacts produced by activities
- **Patterns:** Temporal progressions showing how practices unfold

### Key Files to Understand

| File | Purpose |
|------|---------|
| `/web/src/lib/types.ts` | All TypeScript type definitions |
| `/web/public/language.schema.json` | JSON Schema - source of truth for data structures |
| `/web/src/lib/methodMerge/compositePracticeFromMethod.ts` | Practice composition/merge algorithm |
| `/web/src/lib/validate.ts` | Schema validation logic |
| `/web/src/lib/storage/JsonStore.ts` | Storage abstraction interface |

---

## Development Guidelines

### Schema-Driven Development

**The JSON Schema is the source of truth.** When adding features:

1. Update `/web/public/language.schema.json` first
2. Update TypeScript types in `/web/src/lib/types.ts`
3. Implement business logic in `/web/src/lib/*`
4. Add UI components last
5. Validate with `node validate-schema.js <file.json>`

### Storage Layer (CRITICAL)

**Never bypass the storage abstraction.**

- Storage backend is selected via `STORAGE_TYPE` environment variable (`file` or `mongo`)
- File and MongoDB implementations must remain functionally equivalent
- Business logic should never know which storage backend is active
- All storage operations go through the `JsonStore` interface

```typescript
// Good: Uses storage abstraction
const store = getJsonStore();
const doc = await store.getDocument(id);

// Bad: Directly accesses filesystem
const doc = JSON.parse(fs.readFileSync('practices/doc.json'));
```

### API Routes (Thin Controllers)

API routes in `/web/src/app/api/*` are **thin controllers only:**

- Validate input
- Call business logic from `/web/src/lib/*`
- Return proper HTTP status codes
- Handle errors with consistent formatting

**Business logic belongs in `/web/src/lib/*`, not API routes.**

### React Component Guidelines

- Use hooks only (no class components)
- Keep components focused and single-purpose
- Extract complex logic to `/web/src/lib` utilities
- PatternFly components are the UI standard
- Wrap PatternFly components if customization is needed, don't replace them

### Visualization Logic

Visualization data transformations belong in `/web/src/lib/*Data.ts` files:

- `kanbanPatternData.ts` - Kanban board data transformation
- `sankeyFlowData.ts` - Sankey diagram data transformation
- `topologyData.ts` - Topology diagram data transformation
- `pdfSvgs.ts` - SVG generation for PDFs

**Keep rendering logic separate from data transformation.**

---

## Common Tasks

### Adding a New Practice Element Type

1. Update JSON Schema: `/web/public/language.schema.json`
2. Update TypeScript types: `/web/src/lib/types.ts`
3. Update merge algorithm if needed: `/web/src/lib/methodMerge/compositePracticeFromMethod.ts`
4. Add field editor: `/web/src/components/editors/*`
5. Update validation: `/web/src/lib/validate.ts`
6. Test with: `node validate-schema.js <test-file.json>`

### Adding a New Visualization

1. Create data transformation: `/web/src/lib/<name>Data.ts`
2. Create React component: `/web/src/components/<Name>Diagram.tsx`
3. Add route: `/web/src/app/<route>/page.tsx`
4. Update navigation: `/web/src/lib/navigationConfig.ts`

### Modifying the Merge Algorithm

**Be extremely careful.** The merge algorithm in `compositePracticeFromMethod.ts` is complex because the domain demands it:

- Preserves hierarchical baseline descriptions
- Unions arrays by named keys
- Merges structured tags by bucket
- Resolves focus (explicit over implicit placeholders)
- Auto-populates `supportingAlphas` from `contributesTo`

Test thoroughly with existing practice libraries before committing changes.

### Adding a New Storage Backend

1. Implement the `JsonStore` interface in `/web/src/lib/storage/`
2. Add initialization logic to `/web/src/lib/storage/index.ts`
3. Update environment variable documentation
4. Test that all CRUD operations work identically to existing backends

---

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Environment Configuration

Create `/web/.env.local`:

```env
# Storage backend (file or mongo)
STORAGE_TYPE=file

# MongoDB connection (if using mongo storage)
MONGODB_URI=mongodb://localhost:27017/keleo-studio
```

### Testing Changes

```bash
# Validate a practice file
node validate-schema.js practices/my-practice.json

# Run in development mode
npm run dev

# Build and verify
npm run build
```

---

## API Reference

### Document API

```
GET    /api/documents                      # List all documents
GET    /api/documents/:id                  # Get document by ID
POST   /api/documents                      # Create document
PUT    /api/documents/:id                  # Update document
DELETE /api/documents/:id                  # Delete document
POST   /api/documents/resolve-for-render   # Resolve practice with dependencies
```

### PDF Export API

```
POST   /api/pdf                            # Generate PDF from practice/method
```

---

## Practice Composition & Merge Algorithm

### Dependencies

Practices can depend on other practices:

- `baselinePracticeName`: The kernel practice this extends
- `practiceDependencyNames`: Other practices to merge before this one

Dependencies are resolved recursively with cycle detection.

### Merge Rules

1. **Preserves hierarchy:** Baseline descriptions override extensions
2. **Unions arrays:** Combines named elements by key
3. **Merges tags:** Combines structured tags by bucket
4. **Resolves focus:** Prefers explicit focus over implicit placeholders
5. **Aggregates alphas:** Auto-populates `supportingAlphas` from `contributesTo`

See implementation: `/web/src/lib/methodMerge/compositePracticeFromMethod.ts`

---

## Testing & Validation

### Unit Testing Strategy

- **Core business logic:** `methodMerge`, `validate`, data transformations
- **Storage layer:** Both file and MongoDB implementations
- **Visualization data:** Transformations in `*Data.ts` files

### Integration Testing

- API routes with both storage backends
- Practice dependency resolution
- PDF generation

### Manual Testing

- Practice authoring UI with schema validation
- Method composition with complex dependencies
- Visualization rendering with edge cases

---

## Troubleshooting

### Schema Validation Errors

Use `node validate-schema.js <file.json>` to get detailed error messages.

Common issues:
- Missing required fields
- Type mismatches (string vs array)
- Invalid references (alphaId, activityId not found)

### Storage Issues

Check:
- `STORAGE_TYPE` environment variable is set correctly
- MongoDB connection string (if using `mongo` storage)
- File permissions (if using `file` storage)
- Storage abstraction is being used (not direct filesystem access)

### Merge Algorithm Issues

The merge algorithm is complex. Common pitfalls:
- Circular dependencies in `practiceDependencyNames`
- Missing baseline practice
- Conflicting element keys (should be handled by union logic)

Debug by checking intermediate merge results in `compositePracticeFromMethod.ts`.

---

## Documentation

- **Quick Start:** [docs/QUICK_START.md](docs/QUICK_START.md)
- **JSON Schema:** [docs/SCHEMA.md](docs/SCHEMA.md)
- **Source Files:** [docs/SOURCE_FILES.md](docs/SOURCE_FILES.md)
- **Architecture:** [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)
- **Philosophy:** [docs/ABOUT.md](docs/ABOUT.md)
- **Method Book:** [docs/methodBook-implementation.md](docs/methodBook-implementation.md) - Multi-volume book generation with organizing principles

---

## Critical Reminders

1. **Read [SOUL.md](./SOUL.md) first** - it defines our engineering principles
2. **JSON Schema is the source of truth** - update it first
3. **Never bypass storage abstraction** - file and MongoDB must be equivalent
4. **API routes are thin controllers** - business logic goes in `/web/src/lib/*`
5. **Test with both storage backends** - don't assume file storage only
6. **Validate all changes** - use `validate-schema.js` before committing
7. **Keep visualizations separate** - data transformation ≠ rendering logic
8. **Follow TypeScript strict mode** - no implicit `any`, no null/undefined confusion

---

## When You're Stuck

Ask yourself:

1. Does this violate Separation of Concerns? (SOUL.md pillar #1)
2. Is this a premature abstraction? (SOUL.md pillar #2)
3. Is this the simplest thing that could work? (SOUL.md pillar #4)
4. Can I test this in isolation? (SOUL.md testing mindset)
5. Does this maintain schema-driven validation?
6. Does this preserve storage pluggability?

If any answer is "no," reconsider the approach.

---

**Remember: SOUL.md principles override default behaviors. When in doubt, consult SOUL.md.**
