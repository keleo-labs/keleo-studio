# System Architecture

This document describes the high-level architecture and main functions of the Adoption Framework system.

## System Overview

The Adoption Framework is a full-stack web application for managing software engineering practices based on the SEMAT Essence framework. It consists of three main layers:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Next.js React Components)             │
│  - Practice Author                      │
│  - Method Builder                       │
│  - Library Browser                      │
│  - Visualizations                       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Business Logic Layer            │
│  (TypeScript Libraries)                 │
│  - Practice Composition                 │
│  - Dependency Resolution                │
│  - Validation                           │
│  - Transformations                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Data Layer                      │
│  (Pluggable Storage)                    │
│  - File System (JSON files)             │
│  - MongoDB (optional)                   │
└─────────────────────────────────────────┘
```

## Core Functions

### 1. Practice Authoring

**Purpose**: Create and edit software engineering practices.

**User Flow**:
1. User opens Practice Author
2. Loads existing practice or starts from template
3. Edits using JSON editor, WYSIWYG editor, or structured forms
4. System validates against schema in real-time
5. User previews with visualizations (Kanban, reports)
6. Saves to library

**Technical Components**:
- `PracticeAuthorForm.tsx` - Main editing interface
- `JsonEditor.tsx` - Monaco-based JSON editing
- `WysiwygEditor.tsx` - Rich text editing
- `validate.ts` - Schema validation
- `practiceFormDefaults.ts` - Templates

**Key Features**:
- Multiple editor modes (JSON, WYSIWYG, YAML)
- Real-time validation with error highlighting
- Auto-complete for symbolic references
- Preview visualizations
- Version control integration

### 2. Practice Composition (Method Building)

**Purpose**: Compose methods from baseline practices and extensions.

**User Flow**:
1. User opens Method Builder
2. Selects baseline practice from library
3. Adds extension practices (drag-and-drop or search)
4. System resolves dependencies automatically
5. System merges into composite practice
6. User reviews merged result
7. Saves as new method to library

**Technical Components**:
- `MethodBuilderClient.tsx` - UI for composition
- `compositePracticeFromMethod.ts` - Core merge algorithm
- `practiceDependencyResolution.ts` - Dependency resolver
- `resolvePracticeForRenderApi.ts` - Server-side resolution

**Merge Algorithm**:

```typescript
function compositePracticeFromMethod(method, library) {
  // 1. Load baseline (kernel)
  const baseline = loadBaseline(method, library);
  
  // 2. Initialize accumulator from baseline
  const accumulator = {
    ...baseline,
    // Baseline arrays seed the composite
  };
  
  // 3. Resolve and load extension practices
  const practices = resolvePractices(method, library);
  
  // 4. Merge each practice in order
  for (const practice of practices) {
    // Merge named elements by key
    accumulator.alphas = mergeAlphas(
      accumulator.alphas,
      practice.alphas
    );
    // ... merge other arrays
  }
  
  // 5. Post-processing
  propagateDerivedFocusNames(accumulator);
  aggregateSupportingAlphas(accumulator);
  applyBaselineDescriptions(accumulator, baseline);
  
  return accumulator;
}
```

**Merge Rules**:
- **Baseline wins**: Descriptions from baseline always preserved
- **Union arrays**: Named elements merge by canonical name
- **Additive lists**: Contributors and tags accumulate
- **Focus resolution**: Explicit > parent > child
- **Alpha hierarchy**: Auto-populate from contributesTo

### 3. Dependency Resolution

**Purpose**: Recursively resolve practice dependencies.

**Algorithm**:

```typescript
function resolvePracticeDependencies(practice, library) {
  const resolved = [];
  const visited = new Set();
  
  function resolve(practiceName, chain = []) {
    // Cycle detection
    if (chain.includes(practiceName)) {
      throw new Error(`Circular dependency: ${chain.join(' → ')}`);
    }
    
    if (visited.has(practiceName)) return;
    visited.add(practiceName);
    
    // Load practice from library
    const practice = findPracticeInLibrary(library, practiceName);
    if (!practice) {
      throw new Error(`Practice not found: ${practiceName}`);
    }
    
    // Recursively resolve dependencies
    for (const dep of practice.practiceDependencyNames || []) {
      resolve(dep, [...chain, practiceName]);
    }
    
    // Add to resolved list (dependency-first order)
    resolved.push(practice);
  }
  
  // Start resolution
  for (const dep of practice.practiceDependencyNames || []) {
    resolve(dep, [practice.name]);
  }
  
  return resolved;
}
```

**Ordering**:
- Dependencies resolved before dependents
- Baseline always first
- Nearest-to-baseline practices merge before leaves
- Ensures correct description precedence

### 4. Validation

**Purpose**: Validate practices against schema and business rules.

**Validation Phases**:

1. **Schema Validation**:
   ```typescript
   const errors = validateAgainstSchema(document, schema);
   // Checks structure, types, required fields
   ```

2. **Reference Validation**:
   ```typescript
   const refErrors = checkSymbolicReferences(document);
   // Verifies all name references resolve
   ```

3. **Business Rules**:
   ```typescript
   const ruleErrors = checkBusinessRules(document);
   // Custom validation logic
   // - Minimum state counts
   // - Unique names
   // - Valid sequences
   ```

**Error Reporting**:
- JSON path to error location
- Human-readable message
- Suggested fix
- Error severity (error, warning, info)

### 5. Library Management

**Purpose**: Store, organize, and retrieve practices.

**Operations**:

```typescript
interface LibraryOperations {
  // CRUD
  list(): Promise<Document[]>;
  get(id: string): Promise<Document>;
  create(doc: Document): Promise<string>;
  update(id: string, doc: Document): Promise<void>;
  delete(id: string): Promise<void>;
  
  // Search & Filter
  search(query: string): Promise<Document[]>;
  filterByTags(tags: TagFilter): Promise<Document[]>;
  
  // Import & Export
  importFromJson(json: string): Promise<void>;
  exportToJson(): Promise<string>;
  importFromDirectory(path: string): Promise<void>;
  exportToDirectory(path: string): Promise<void>;
}
```

**Storage Backends**:

1. **File Storage** (default):
   - Each document = JSON file
   - Directory: `practices/`
   - Main library: `adoption-library.json`
   - Advantages: Simple, version-controllable
   - Disadvantages: No concurrent access control

2. **MongoDB Storage** (optional):
   - Collection: `practices`
   - Index on `name` and tags
   - Advantages: Scalable, concurrent access
   - Disadvantages: Requires MongoDB server

**Library Index**:
```typescript
interface LibraryLookupIndex {
  baselines: Map<string, PracticeBaseline>;
  practices: Map<string, Practice>;
  methods: Map<string, Method>;
  
  // Lookup helpers
  findBaseline(name: string): PracticeBaseline | null;
  findPractice(name: string): Practice | null;
  findMethod(name: string): Method | null;
}
```

### 6. Visualization

**Purpose**: Transform practice data into visual representations.

#### Kanban Pattern Board

**Transformation**:
```typescript
function toKanbanPatternData(practice) {
  const columns = practice.patterns[0].patternViews.map(view => ({
    id: view.name,
    title: view.name,
    seq: view.seq,
    cards: extractCardsForView(practice, view)
  }));
  
  return { columns, swimlanes };
}

function extractCardsForView(practice, view) {
  const cards = [];
  
  // Alpha state cards
  for (const alphaState of view.alphaStates) {
    cards.push({
      type: 'alpha-state',
      alphaName: alphaState.alphaName,
      stateName: alphaState.stateName,
      ...
    });
  }
  
  // Activity cards
  for (const activityName of view.activities) {
    const activity = findActivity(practice, activityName);
    cards.push({
      type: 'activity',
      name: activity.name,
      ...
    });
  }
  
  // Work product cards
  // ... extract from activities
  
  return cards;
}
```

**Rendering**:
- CSS Grid layout for columns
- Cards as draggable elements (future)
- Color coding by type
- Tooltips with details

#### Sankey Flow Diagram

**Transformation**:
```typescript
function toSankeyFlowData(practice) {
  const nodes = [];
  const links = [];
  
  // Create nodes for each alpha state at each pattern view
  for (const view of pattern.patternViews) {
    for (const alphaState of view.alphaStates) {
      nodes.push({
        id: `${view.name}::${alphaState.alphaName}::${alphaState.stateName}`,
        alphaName: alphaState.alphaName,
        stateName: alphaState.stateName,
        viewSeq: view.seq
      });
    }
  }
  
  // Create links between consecutive pattern views
  for (let i = 0; i < pattern.patternViews.length - 1; i++) {
    const sourceView = pattern.patternViews[i];
    const targetView = pattern.patternViews[i + 1];
    
    // Connect states of same alpha across views
    for (const alphaName of getCommonAlphas(sourceView, targetView)) {
      links.push({
        source: `${sourceView.name}::${alphaName}::...`,
        target: `${targetView.name}::${alphaName}::...`,
        value: calculateFlowWeight(...)
      });
    }
  }
  
  return { nodes, links };
}
```

**Rendering**:
- SVG path elements for flows
- Bezier curves for smooth transitions
- Width proportional to flow strength
- Interactive hover effects

### 7. PDF Report Generation

**Purpose**: Generate printable PDF reports of practices.

**Pipeline**:

```typescript
async function generatePDF(practice) {
  // 1. Generate human-readable report
  const report = generatePracticeReport(practice);
  
  // 2. Generate diagrams as SVG
  const kanbanSvg = renderKanbanToSvg(practice);
  const sankeySvg = renderSankeyToSvg(practice);
  const alphaContributesSvg = renderAlphaContributesToSvg(practice);
  
  // 3. Build HTML document
  const html = buildPdfHtml({
    practice,
    report,
    diagrams: { kanbanSvg, sankeySvg, alphaContributesSvg }
  });
  
  // 4. Convert to PDF
  const pdf = await htmlToPdf(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
  });
  
  return pdf;
}
```

**Report Structure**:
1. Cover page (name, description, metadata)
2. Table of contents
3. Executive summary
4. Alphas and states
5. Activities and activity spaces
6. Work products
7. Patterns (with Kanban visualization)
8. Competencies and personas
9. Appendices (diagrams, references)

## Data Flow

### Practice Authoring Flow

```
User Input → Editor Component
              ↓
        Validation (client-side)
              ↓
        State Update (React)
              ↓
        Preview Rendering
              ↓
        Save Button Click
              ↓
        POST /api/documents
              ↓
        Storage Layer
              ↓
        Library Update
```

### Method Composition Flow

```
User Selection → Method Builder UI
                    ↓
              Add Baseline + Practices
                    ↓
              POST /api/documents/resolve-for-render
                    ↓
              Server-side Resolution:
                - Load from library
                - Resolve dependencies
                - Compose via merge algorithm
                    ↓
              Return Composed Practice
                    ↓
              Client-side Visualization
                    ↓
              User Review & Save
```

### Visualization Flow

```
Practice Document → Data Transformer
                       ↓
                  View Model
                  (columns, cards, nodes, links)
                       ↓
                  React Component
                       ↓
                  DOM Rendering
                  (SVG, Canvas, HTML)
                       ↓
                  User Interaction
                  (hover, click, zoom)
```

## Security Considerations

### Input Validation

- All user input validated against schema
- Symbolic references checked for existence
- No code execution in descriptions (XSS prevention)
- File upload size limits

### API Security

- CORS configured for same-origin only
- Rate limiting on API endpoints
- Input sanitization on all routes
- Error messages don't leak internal paths

### Storage Security

- File storage isolated to designated directory
- MongoDB credentials in environment variables
- No eval() or dynamic code execution
- Practice documents don't contain executable code

## Performance Optimizations

### Client-Side

- React memoization for expensive renders
- Virtual scrolling for large lists
- Debounced validation (300ms delay)
- Lazy loading of visualizations
- Code splitting for editor components

### Server-Side

- Library caching in memory
- Schema validation cached
- Dependency resolution memoized
- Database connection pooling (MongoDB)

### Network

- API response compression
- Client-side caching of library documents
- Incremental static regeneration (Next.js)
- CDN for static assets

## Error Handling

### Client-Side Errors

```typescript
try {
  const result = await composePractice(method);
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    // Show validation errors to user
    showValidationPanel(error.issues);
  } else if (error instanceof NotFoundError) {
    // Show missing dependency error
    showDependencyError(error.missingPractice);
  } else {
    // Show generic error
    showErrorToast(error.message);
  }
}
```

### Server-Side Errors

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await processDocument(body);
    return Response.json(result);
  } catch (error) {
    logger.error('Document processing failed', error);
    
    if (error instanceof ValidationError) {
      return Response.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }
    
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Extension Points

### Adding New Practice Elements

1. Add type definition to `types.ts`
2. Add schema definition to `language.schema.json`
3. Add merge logic to `compositePracticeFromMethod.ts`
4. Add field editor component
5. Add to form in `FullPracticeView.tsx`
6. Update report generator
7. Update visualizations if applicable

### Adding New Visualizations

1. Create data transformer in `lib/`
2. Create React component in `components/`
3. Add to practice author preview
4. Add to PDF report if applicable
5. Document in user guide

### Adding New Storage Backends

1. Implement `JsonStore` interface
2. Add configuration option
3. Add to `getStore()` factory
4. Update environment variable docs
5. Test CRUD operations

## Deployment

### Development

```bash
npm run dev
```

- Hot reload enabled
- Source maps for debugging
- Verbose error messages
- File storage by default

### Production

```bash
npm run build
npm start
```

- Minified JavaScript
- Optimized images
- Error tracking
- Optional MongoDB storage
- CDN for static assets

### Environment Variables

```bash
# Required
NODE_ENV=production

# Storage
STORAGE_TYPE=mongo
MONGODB_URI=mongodb://...

# Optional
PORT=3000
LOG_LEVEL=info
```

## Monitoring & Logging

### Application Logs

- Request/response logging
- Error tracking with stack traces
- Performance metrics
- User action auditing

### Metrics

- API response times
- Database query times
- Validation error rates
- Library size and growth
- User activity patterns

## Future Enhancements

### Planned Features

1. **Collaborative Editing**: Real-time multi-user editing
2. **Version Control**: Built-in version management and diffs
3. **Import/Export**: Support for more formats (XML, RDF)
4. **Advanced Search**: Full-text search, faceted navigation
5. **AI Assistance**: Suggest practices based on context
6. **Integration**: Hooks for external tools (Jira, GitHub)
7. **Mobile App**: Native mobile interface
8. **Templates**: Library of practice templates
9. **Analytics**: Usage analytics and insights
10. **Accessibility**: WCAG 2.1 AA compliance

### Technical Improvements

1. **GraphQL API**: Replace REST with GraphQL
2. **WebSocket**: Real-time updates
3. **PWA**: Offline support
4. **i18n**: Multi-language support
5. **Testing**: Comprehensive test coverage
6. **Documentation**: Interactive API docs
7. **CI/CD**: Automated testing and deployment
8. **Monitoring**: Application performance monitoring

## References

- [SEMAT Essence](https://www.semat.org/)
- [JSON Schema](https://json-schema.org/)
- [Next.js](https://nextjs.org/)
- [PatternFly](https://www.patternfly.org/)
- [React](https://react.dev/)
