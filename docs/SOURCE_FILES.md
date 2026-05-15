# Source Files Documentation

This document provides detailed explanations of the main source files in the Adoption Framework.

## Table of Contents

- [Application Structure](#application-structure)
- [Core Library Files](#core-library-files)
- [Components](#components)
- [API Routes](#api-routes)
- [Storage Layer](#storage-layer)
- [Visualization](#visualization)

## Application Structure

### `/web/src/app/page.tsx`

**Purpose**: Main dashboard landing page.

Provides navigation to the five main areas:
1. Method Builder - Compose methods from practices
2. Practice Author - Create and edit practices
3. Flow Visualizer - View Kanban pattern boards
4. Library - Browse and manage practice library
5. Preferences - Theme and language settings

**Key Features**:
- Card-based navigation with hover effects
- Responsive grid layout
- Integration with PatternFly Card components

### `/web/src/app/layout.tsx`

**Purpose**: Root layout with theme and navigation.

Provides:
- Theme provider setup
- Global navigation shell
- Metadata configuration
- Font loading (Inter font)

### `/web/src/app/providers.tsx`

**Purpose**: Client-side context providers.

Wraps the app with:
- Theme context for light/dark mode
- Language pack context for internationalization

## Core Library Files

### `/web/src/lib/types.ts`

**Purpose**: TypeScript type definitions for the entire practice language model.

**Key Types**:
- `PracticeElement` - Base type for all named elements
- `PracticeBaseline` - Kernel practice foundation
- `Practice` - Extension practice that overlays baseline
- `Method` - Composition of baseline + practices
- `Alpha`, `State`, `Checklist` - Core progress elements
- `ActivitySpace`, `Activity` - Work organization
- `WorkProduct`, `LevelOfDetail` - Artifact definitions
- `Pattern`, `PatternView` - Temporal progressions
- `Competency`, `Persona`, `PersonaGroup` - People elements
- `Narrative`, `NarrativeType` - Storytelling structures

**Conventions**:
- String symbolic references (not embedded objects)
- Tags can be structured object or legacy array
- Optional narratives on any practice element

### `/web/src/lib/methodMerge/compositePracticeFromMethod.ts`

**Purpose**: Core composition algorithm for merging practices.

**Function**: `compositePracticeFromMethod(method, library?)`

Composes a Practice-shaped document from a Method by:

1. **Loading baseline**: From embedded `baselinePractice` or library via `baselinePracticeName`
2. **Loading practices**: From embedded `practices` or library via `practiceNames`
3. **Merging hierarchy**:
   - Baseline seeds accumulator
   - Secondary baselines (from embedded methods) merge next
   - Extension practices merge in order
4. **Preserving descriptions**: Baseline descriptions always win on same-named elements
5. **Finalizing**: Propagate focus names, aggregate supporting alphas

**Key Merge Rules**:
- Named arrays merge by canonical name (case-insensitive)
- Arrays without names concatenate and dedupe
- `contributesTo` arrays merge by alpha/state key
- Tags merge by bucket (domain/lifecycle/organizational)
- Descriptions never override (base wins)
- Scalars fill vacuums but don't replace values

**Supporting Functions**:
- `mergePracticeElementRecords()` - Recursive merge of named objects
- `mergeAlphas()`, `mergeFocuses()`, etc. - Type-specific mergers
- `mergeActivityElements()` - Special handling for activities
- `applyBaselineKernelPracticeDescriptions()` - Final description override
- `aggregateSupportingAlphasFromContributesTo()` - Auto-populate alpha hierarchy

### `/web/src/lib/ir.ts`

**Purpose**: Intermediate representation utilities and transformations.

**Key Functions**:
- `canonicalPracticeElementName(name)` - Normalize names for comparison
- `activitySpaceIdentityKey(name)` - Key for activity space merging
- `canonicalizeActivitySpaces(spaces, flatActivities)` - Fold flat activities into nested
- `propagateDerivedFocusNames()` - Fill missing focus from parent/children
- `finalizeImplicitFocusPlaceholders()` - Remove temporary placeholders
- `isPracticeActivityNode()` - Distinguish activities from activity spaces

**Focus Resolution**:
- "Implicit focus" placeholders filled during merge
- Preference order: explicit > parent > child
- Final pass removes all placeholders

### `/web/src/lib/validate.ts`

**Purpose**: JSON Schema validation and error formatting.

**Key Functions**:
- `validatePracticeDocument(doc, schemaUrl?)` - Validate against schema
- `formatValidationErrors(errors)` - Convert Ajv errors to user-friendly format
- `checkMissingReferences(doc)` - Detect broken symbolic references

**Validation Phases**:
1. Schema validation (structure)
2. Reference validation (symbolic links)
3. Business rule validation (custom logic)

### `/web/src/lib/library/practiceDependencyResolution.ts`

**Purpose**: Resolve practice dependencies from library.

**Key Functions**:
- `resolvePracticeDependencies(practice, library)` - Recursively resolve deps
- `findPracticeInLibrary(library, name)` - Lookup by canonical name
- `findBaselineInLibrary(library, name)` - Lookup baseline by name
- `detectCircularDependencies(practice, library)` - Cycle detection

**Resolution Algorithm**:
1. Load practice from library by name
2. Resolve its `baselinePracticeName` to baseline object
3. Recursively resolve each `practiceDependencyNames` entry
4. Return in hierarchy order (nearest baseline first)

### `/web/src/lib/library/resolvePracticeForRenderApi.ts`

**Purpose**: Server-side practice resolution for rendering.

Combines:
- Library loading
- Dependency resolution
- Composition via `compositePracticeFromMethod()`

Used by `/api/documents/resolve-for-render` endpoint.

### `/web/src/lib/patternView.ts`

**Purpose**: Pattern view utilities and alpha state merging.

**Key Functions**:
- `mergePatternViewAlphaStates(base, overlay)` - Union alpha states
- `normalizePatternViewAlphaState(state)` - Convert legacy string format
- `parseAlphaStateToken(token)` - Parse "Alpha→State" strings

**Format Support**:
- Canonical: `{ alphaName: "X", stateName: "Y" }`
- Legacy: `"X→Y"` or `"X->Y"` strings

### `/web/src/lib/kanbanPatternData.ts`

**Purpose**: Transform practice data into Kanban board format.

**Function**: `toKanbanPatternData(practice)`

Transforms pattern views into Kanban columns with cards:
- **Columns**: Pattern views (temporal stages)
- **Cards**: Alpha states, activities, work products
- **Grouping**: By focus area (swimlanes)
- **Ordering**: By seq field and dependencies

### `/web/src/lib/sankeyFlowData.ts`

**Purpose**: Transform practice data into Sankey diagram format.

**Function**: `toSankeyFlowData(practice)`

Creates flow visualization showing:
- **Nodes**: Alpha states at different pattern views
- **Links**: Flows between states across pattern views
- **Weights**: Based on number of activities/work products

### `/web/src/lib/practiceReport/generatePracticeReport.ts`

**Purpose**: Generate human-readable practice reports.

**Function**: `generatePracticeReport(practice)`

Produces structured report with sections:
1. Overview (name, description, metadata)
2. Focuses
3. Alphas and States
4. Activity Spaces and Activities
5. Work Products
6. Patterns and Pattern Views
7. Competencies
8. Personas and Groups

Output format: Markdown-like structured text.

## Components

### `/web/src/components/PracticeAuthorForm.tsx`

**Purpose**: Main practice authoring interface.

**Features**:
- Multi-editor support (JSON, WYSIWYG, YAML)
- Real-time validation
- Structured field editors for practice elements
- Preview with Kanban pattern board
- Save to library
- PDF export

**State Management**:
- Local state for draft edits
- Validation errors displayed inline
- Auto-save to local storage

### `/web/src/components/FullPracticeView.tsx`

**Purpose**: Complete practice visualization and editing.

**Sections**:
- Metadata editor (name, description, tags)
- Baseline selection
- Practice dependencies
- Element arrays (alphas, activities, work products, etc.)
- Pattern editor with Kanban preview
- Narrative editor

### `/web/src/components/KanbanPatternBoard.tsx`

**Purpose**: Kanban board visualization of pattern progression.

**Rendering**:
- Pattern views as vertical columns
- Alpha states, activities, work products as cards
- Color coding by element type
- Hover tooltips with details
- Focus-based swimlanes

### `/web/src/components/KanbanPatternBoardPF.tsx`

**Purpose**: PatternFly-styled Kanban board variant.

Similar to `KanbanPatternBoard.tsx` but uses PatternFly components for consistent styling.

### `/web/src/components/SankeyFlowDiagram.tsx`

**Purpose**: Sankey flow visualization of alpha progressions.

**Rendering**:
- SVG-based flow diagram
- Nodes for alpha states
- Curved links showing state transitions
- Width indicates flow strength
- Color coding by alpha

### `/web/src/components/PracticeHumanReadablePanel.tsx`

**Purpose**: Plain-text human-readable practice view.

Displays practice in narrative format:
- Introduction
- Lists of elements with descriptions
- Hierarchical structure
- Suitable for PDF export

### `/web/src/components/BrowseView.tsx`

**Purpose**: Library browser with filtering and search.

**Features**:
- Tag-based filtering (domain, lifecycle, organizational)
- Keyword search
- Document type filtering (baseline, practice, method)
- Click to open in author or method builder

### `/web/src/components/ProjectManagementView.tsx`

**Purpose**: Pattern-based project progress tracking.

Shows:
- Pattern views as project phases
- Alpha instances as trackable items
- Work product instances as deliverables
- Progress indicators

### `/web/src/components/editors/` Directory

Field editors for practice elements:

- **`JsonEditor.tsx`**: Monaco-based JSON editor with schema validation
- **`WysiwygEditor.tsx`**: Rich text editor for descriptions
- **`YamlEditor.tsx`**: YAML format editor
- **`CodeEditor.tsx`**: Generic code editor wrapper

**Field Components**:
- `TextField.tsx`, `TextAreaField.tsx` - Simple text inputs
- `SelectField.tsx` - Dropdown selections
- `StringArrayField.tsx` - Array of strings editor
- `TagsField.tsx` - Structured tag editor
- `AlphaContributionsField.tsx` - Alpha/state pair editor
- `WorkProductContributionsField.tsx` - Work product/level pair editor
- `CompetencyLevelReferencesField.tsx` - Competency level references
- `NarrativesField.tsx` - Narrative tree editor
- `PropertyTable.tsx`, `PropertyRow.tsx` - Generic property editors

## API Routes

### `/web/src/app/api/documents/route.ts`

**Endpoints**:
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create new document

**Request/Response**:
```typescript
// POST body
{
  doc: Practice | PracticeBaseline | Method,
  id?: string  // Optional: specify ID
}

// Response
{
  _id: string,
  ...document
}
```

### `/web/src/app/api/documents/[id]/route.ts`

**Endpoints**:
- `GET /api/documents/:id` - Get document by ID
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### `/web/src/app/api/documents/resolve-for-render/route.ts`

**Purpose**: Resolve practice with all dependencies for rendering.

**Request**:
```typescript
POST /api/documents/resolve-for-render
{
  practiceId: string,
  libraryDocuments?: Document[]  // Optional: provide library
}
```

**Response**:
```typescript
{
  resolved: Practice,           // Fully composed practice
  baseline: PracticeBaseline,   // Resolved baseline
  dependencies: Practice[]      // Resolved dependencies
}
```

### `/web/src/app/api/pdf/route.ts`

**Purpose**: Generate PDF from practice document.

**Request**:
```typescript
POST /api/pdf
{
  practice: Practice | Method,
  format?: 'a4' | 'letter'
}
```

**Response**: Binary PDF file.

**Implementation**:
- Generates HTML from practice
- Uses headless browser or PDF library
- Includes diagrams (Kanban, Sankey)
- Formatted for printing

## Storage Layer

### `/web/src/lib/storage/types.ts`

**Purpose**: Storage interface definitions.

```typescript
interface JsonStore {
  list(): Promise<StoredDocument[]>;
  get(id: string): Promise<StoredDocument | null>;
  create(doc: any, id?: string): Promise<StoredDocument>;
  update(id: string, doc: any): Promise<StoredDocument>;
  delete(id: string): Promise<void>;
}

interface StoredDocument {
  _id: string;
  [key: string]: any;
}
```

### `/web/src/lib/storage/fileJsonStore.ts`

**Purpose**: File-based storage implementation.

**Configuration**:
- Storage directory: `practices/`
- File naming: `{id}.json` or auto-generated
- Library file: `adoption-library.json`

**Operations**:
- List: Read all JSON files in directory
- Get: Read file by ID
- Create: Write new file with ID
- Update: Overwrite existing file
- Delete: Remove file

### `/web/src/lib/storage/mongoJsonStore.ts`

**Purpose**: MongoDB storage implementation.

**Configuration**:
- Collection: `practices`
- Connection via `MONGODB_URI` environment variable

**Features**:
- Native MongoDB operations
- Index on `_id` and `name` fields
- Transaction support for consistency

### `/web/src/lib/storage/getStore.ts`

**Purpose**: Storage factory based on environment.

```typescript
const store = getStore();  // Returns JsonStore instance
```

Reads `STORAGE_TYPE` environment variable:
- `"file"` → `fileJsonStore`
- `"mongo"` → `mongoJsonStore`
- Default: `fileJsonStore`

## Visualization

### `/web/src/lib/patternMatrixDiagram.ts`

**Purpose**: Generate pattern matrix ASCII art.

Creates text-based visualization:
```
           |  View 1  |  View 2  |  View 3  |
-----------|----------|----------|----------|
Activity 1 |    X     |    X     |          |
Activity 2 |          |    X     |    X     |
```

Used in human-readable reports.

### `/web/src/lib/alphaContributesDiagram.ts`

**Purpose**: Generate alpha contribution diagram.

Shows relationships:
- Alpha hierarchy (contributesTo)
- Supporting alphas
- Focus groupings

Output: ASCII art or DOT format for GraphViz.

### `/web/src/lib/pdfHtml.ts`

**Purpose**: Generate HTML for PDF conversion.

Combines:
- Practice metadata
- Human-readable report
- Diagrams (embedded as SVG or images)
- CSS for print styling

### `/web/src/lib/pdfSvgs.ts`

**Purpose**: Generate SVG diagrams for PDF inclusion.

Renders:
- Kanban pattern boards as SVG
- Sankey flow diagrams as SVG
- Alpha contributes diagrams as SVG

## Utility Files

### `/web/src/lib/extractPracticeNames.ts`

**Purpose**: Extract all practice element names from document.

Used for:
- Autocomplete in editors
- Validation of symbolic references
- Dependency analysis

### `/web/src/lib/practiceElementTags.ts`

**Purpose**: Tag manipulation utilities.

**Functions**:
- `mergePracticeElementTags(base, overlay)` - Union tag buckets
- `normalizeTags(tags)` - Convert legacy to structured format
- `tagToString(tags)` - Display format

### `/web/src/lib/errorFormatting.ts`

**Purpose**: Format validation and runtime errors.

Converts:
- Ajv validation errors to user-friendly messages
- JSON path to human-readable location
- Error context with line numbers

### `/web/src/lib/json-path-utils.ts`

**Purpose**: JSON path manipulation.

**Functions**:
- `jsonPathToString(path)` - Convert array path to string
- `getValueAtPath(obj, path)` - Get nested value
- `setValueAtPath(obj, path, value)` - Set nested value

### `/web/src/lib/yaml-json-converter.ts`

**Purpose**: Convert between YAML and JSON.

Preserves:
- Comments (in YAML)
- Structure
- Types

Used by YAML editor.

### `/web/src/lib/practiceFormDefaults.ts`

**Purpose**: Default values for practice forms.

Provides templates for:
- New practices
- New alphas
- New activities
- New patterns

Speeds up authoring process.

## Hooks

### `/web/src/hooks/useFocusTracking.ts`

**Purpose**: Track and manage focus assignments.

Returns:
- List of focuses used in practice
- Function to add new focus
- Validation of focus references

### `/web/src/hooks/useResolvedBaseline.ts`

**Purpose**: Load and resolve baseline practice.

**Usage**:
```typescript
const { baseline, loading, error } = useResolvedBaseline(
  baselinePracticeName,
  library
);
```

Returns fully resolved baseline or null if not found.

## Test Files

### `/web/src/lib/__tests__/errorFormatting.test.ts`

**Purpose**: Unit tests for error formatting.

Tests:
- Ajv error conversion
- Path formatting
- Message generation
- Edge cases

Run with: `npm test`

## Demo Files

### `/web/src/lib/__demo__/kanbanPatternDemo.ts`

**Purpose**: Sample data for Kanban board development.

Provides realistic practice with patterns for testing visualizations.

### `/web/src/lib/__demo__/sankeyFlowDemo.ts`

**Purpose**: Sample data for Sankey diagram development.

Provides practice with alpha progressions for flow visualization testing.

## Configuration Files

### `/web/src/lib/navigationConfig.ts`

**Purpose**: Navigation structure configuration.

Defines:
- Main menu items
- Breadcrumb structure
- URL routing
- Icons and labels

### `/web/src/lib/theme.tsx`

**Purpose**: Theme configuration and provider.

Provides:
- Light/dark mode toggle
- CSS variable management
- Theme context

### `/web/src/lib/themeTokens.ts`

**Purpose**: Design token definitions.

Defines:
- Colors (primary, accent, background)
- Typography (fonts, sizes)
- Spacing scale
- Border radius values

## Next Steps

For specific implementation details, see:
- [JSON Schema](./SCHEMA.md) for data model
- [Main README](../README.md) for project overview
- Source code comments for function-level documentation
