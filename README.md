# Keleo Studio

A comprehensive practice management and method composition system built on a practice language derived from SEMAT Essence. While originally designed for software engineering, the system supports any domain where teams need to define, compose, and manage structured practices and methods.

## Overview

Keleo Studio provides a complete toolset for:

- **Practice Authoring**: Create and edit practices with schema validation
- **Method Building**: Compose methods from baseline practices and extensions
- **Visualization**: Kanban pattern boards, Sankey flow diagrams, and dependency visualizations
- **Library Management**: Browse, import, export, and organize practice libraries
- **PDF Export**: Generate human-readable PDF reports of practices and methods

## Philosophy: Modular and Adaptable Practices

Traditional methodologies often force teams into rigid, monolithic processes. Keleo Studio takes a different approach—building on an extensible baseline framework that allows teams to mix and match practices like they would technology choices.

Instead of being locked into a single methodology, teams can:

- Start with a common baseline (like the Platform Adoption Baseline)
- Add universal practices (SRE, GitOps, etc.)
- Layer in specialized practices for their specific needs
- Compose custom methods tailored to their challenges

This approach is inspired by SEMAT Essence but adapted to encourage alternative baselines and more composable, granular practices that fit today's diverse platform engineering needs.

**Learn more**: See [docs/ABOUT.md](docs/ABOUT.md) for the complete philosophy and vision behind modular team architecture.

## Architecture

### Technology Stack

- **Frontend**: Next.js 15 with React 19, TypeScript
- **UI Framework**: PatternFly 6 (React components)
- **Styling**: Tailwind CSS 4
- **Visualization**: Custom D3-like implementations for Kanban and Sankey diagrams
- **Storage**: Pluggable storage system (file-based and MongoDB support)
- **Validation**: JSON Schema validation based on SEMAT Essence language model

### Project Structure

```
keleo-studio/
├── web/                           # Next.js web application
│   ├── src/
│   │   ├── app/                   # Next.js app router pages
│   │   │   ├── api/              # API routes for document CRUD and PDF generation
│   │   │   ├── library/          # Practice library browser
│   │   │   ├── method-builder/   # Method composition interface
│   │   │   ├── practice-author/  # Practice authoring and editing
│   │   │   └── flow-visualizer/  # Kanban pattern visualization
│   │   ├── components/           # React components
│   │   │   └── editors/          # Field editors for practice elements
│   │   ├── lib/                  # Core business logic
│   │   │   ├── library/          # Library management and resolution
│   │   │   ├── methodMerge/      # Practice composition algorithms
│   │   │   ├── practiceReport/   # PDF report generation
│   │   │   └── storage/          # Storage abstraction layer
│   │   └── hooks/                # React hooks
│   └── public/
│       └── language.schema.json  # JSON Schema for practice language
├── practices/                     # Practice library storage
│   └── adoption-library.json     # Main practice library
├── docs/                          # Documentation
└── validate-schema.js            # Schema validation utility
```

## Core Concepts

### Practice Language Model

The system is built on a formal language model derived from SEMAT Essence, consisting of:

- **PracticeBaseline**: Foundation practices (kernel) with core elements
- **Practice**: Extensions that build on baselines
- **Method**: Composed from a baseline and multiple practices
- **Alphas**: Essential elements of concern (e.g., requirements, software system, team)
- **States**: Progression checkpoints for alphas
- **Activities**: Work that advances alpha states
- **Work Products**: Artifacts produced by activities
- **Patterns**: Temporal progressions showing how practices unfold over time

### Key Features

#### 1. Practice Authoring

- JSON editor with schema validation
- WYSIWYG editor for descriptions
- Structured field editors for practice elements
- Real-time validation and error reporting
- Preview with Kanban pattern boards

#### 2. Method Builder

- Drag-and-drop composition from library
- Automatic practice dependency resolution
- Hierarchical merge of practices
- Preserves baseline descriptions during composition

#### 3. Visualizations

- **Kanban Pattern Board**: Shows pattern views as columns with alpha states, activities, and work products as cards
- **Sankey Flow Diagram**: Visualizes alpha state progressions and dependencies
- **Alpha Contributes Diagram**: Shows relationships between alphas

#### 4. Library Management

- Import/export practices and methods
- Browse by tags (domain, lifecycle, organizational)
- Version control integration
- Metadata management

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Optional: MongoDB for database storage (defaults to file storage)

### Installation

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

### Environment Variables

Create a `.env.local` file in the `web/` directory:

```env
# Storage backend (file or mongo)
STORAGE_TYPE=file

# MongoDB connection (if using mongo storage)
MONGODB_URI=mongodb://localhost:27017/keleo-studio
```

### Using the Application

1. **Dashboard** (`/`): Access all features from the main dashboard
2. **Practice Author** (`/practice-author`): Create and edit practices
3. **Method Builder** (`/method-builder`): Compose methods from practices
4. **Library** (`/library`): Browse and manage your practice library
5. **Flow Visualizer** (`/flow-visualizer`): View Kanban pattern boards

## Documentation

Complete documentation is available in the `docs/` directory:

- **[Quick Start Guide](docs/QUICK_START.md)** - Get started quickly with common tasks
- **[JSON Schema](docs/SCHEMA.md)** - Complete schema reference
- **[Source Files](docs/SOURCE_FILES.md)** - Detailed code documentation
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Architecture and main functions

### JSON Schema Overview

The schema defines:

- Identity and metadata fields (name, description, tags)
- Core elements (Alphas, States, Activities, WorkProducts)
- Composition structures (Patterns, PatternViews)
- People elements (Personas, PersonaGroups, Competencies)
- Narrative structures for storytelling
- Validation rules and constraints

See [docs/SCHEMA.md](docs/SCHEMA.md) for complete details.

## Practice Composition

### Merge Algorithm

The system uses a sophisticated merge algorithm that:

1. **Preserves hierarchy**: Baseline descriptions override extensions
2. **Unions arrays**: Combines named elements by key
3. **Merges tags**: Combines structured tags by bucket
4. **Resolves focus**: Prefers explicit focus over implicit placeholders
5. **Aggregates alphas**: Auto-populates supportingAlphas from contributesTo

See [web/src/lib/methodMerge/compositePracticeFromMethod.ts](web/src/lib/methodMerge/compositePracticeFromMethod.ts) for implementation details.

### Practice Dependencies

Practices can depend on other practices:

- `baselinePracticeName`: The kernel practice this extends
- `practiceDependencyNames`: Other practices to merge before this one

Dependencies are resolved recursively with cycle detection.

## API

### Document API

```
GET    /api/documents           # List all documents
GET    /api/documents/:id       # Get document by ID
POST   /api/documents           # Create document
PUT    /api/documents/:id       # Update document
DELETE /api/documents/:id       # Delete document
POST   /api/documents/resolve-for-render  # Resolve practice with dependencies
```

### PDF Export API

```
POST   /api/pdf                 # Generate PDF from practice/method
```

## Storage

The system supports pluggable storage backends:

- **File Storage** (`fileJsonStore`): Stores documents as JSON files
- **MongoDB Storage** (`mongoJsonStore`): Uses MongoDB for persistence

Storage backend is selected via `STORAGE_TYPE` environment variable.

## Development

### Running Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Validate a practice file
node validate-schema.js practices/my-practice.json
```

### Project Guidelines

- Follow TypeScript strict mode
- Use React hooks (no class components)
- Validate all user input against schema
- Document public APIs with JSDoc
- Write tests for business logic
- Use semantic versioning

### Contributing

See source code documentation in [docs/SOURCE_FILES.md](docs/SOURCE_FILES.md) for detailed information about each module.

Key files to understand:

- [types.ts](web/src/lib/types.ts) - Type definitions
- [compositePracticeFromMethod.ts](web/src/lib/methodMerge/compositePracticeFromMethod.ts) - Merge algorithm
- [validate.ts](web/src/lib/validate.ts) - Validation logic
- [language.schema.json](web/public/language.schema.json) - JSON Schema

### Development Workflow

1. Make changes to source files
2. Run validation: `node validate-schema.js <file.json>`
3. Test in development mode: `npm run dev`
4. Build and verify: `npm run build`

## License

[Add license information]

## Authors

See `authors` field in practice documents.

## References

- [SEMAT Essence](https://www.semat.org/) - Software Engineering Method and Theory
- [PatternFly Design System](https://www.patternfly.org/) - React component library
- [Next.js Documentation](https://nextjs.org/docs) - React framework
