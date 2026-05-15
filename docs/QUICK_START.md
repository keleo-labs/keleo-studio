# Quick Start Guide

A concise guide to get started with the Adoption Framework as a developer or user.

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd adoptionframework

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
# Navigate to http://localhost:3000
```

## Project Structure at a Glance

```
adoptionframework/
├── web/                    # Next.js application
│   ├── src/
│   │   ├── app/           # Pages and API routes
│   │   ├── components/    # React components
│   │   ├── lib/           # Business logic
│   │   └── hooks/         # React hooks
│   └── public/
│       └── language.schema.json  # JSON Schema
├── practices/             # Practice library (JSON files)
├── docs/                  # Documentation
└── validate-schema.js     # CLI validation tool
```

## Five Main Features

### 1. Practice Author (`/practice-author`)

**Create and edit practices**

- Load existing practice or start from template
- Edit in JSON, WYSIWYG, or structured forms
- Validate against schema in real-time
- Preview with visualizations
- Export to PDF
- Save to library

**Quick Create**:
1. Click "New Practice"
2. Fill in name and description
3. Select baseline practice
4. Add alphas, activities, patterns
5. Save

### 2. Method Builder (`/method-builder`)

**Compose methods from practices**

- Drag baseline practice from library
- Add extension practices
- System resolves dependencies automatically
- Preview merged result
- Save as new method

**Quick Build**:
1. Select baseline (e.g., "Essence Kernel")
2. Add practices (e.g., "Scrum", "DevOps")
3. Review merged elements
4. Name and save method

### 3. Library Browser (`/library`)

**Browse and manage practices**

- Filter by tags (domain, lifecycle, organizational)
- Search by keyword
- Import/export JSON
- View metadata
- Open in author or builder

**Quick Browse**:
1. Click tag filters to narrow results
2. Use search box for keywords
3. Click practice card to open details
4. Click "Edit" to open in author

### 4. Flow Visualizer (`/flow-visualizer`)

**View Kanban pattern boards**

- Temporal progression as columns
- Alpha states, activities, work products as cards
- Focus-based swimlanes
- Interactive tooltips

**Quick View**:
1. Select practice from dropdown
2. View Kanban board
3. Hover over cards for details

### 5. Preferences (`/preferences`)

**Customize settings**

- Theme (light/dark)
- Language packs
- Saved in browser cookie

## Key Concepts

### Practice Language Model

```
PracticeBaseline (Kernel)
  ↓
Practice (Extension)
  ↓
Method (Composition)
```

### Core Elements

- **Alpha**: Essential element of concern (e.g., Requirements, Team)
- **State**: Progression checkpoint for alpha
- **Activity**: Work performed
- **Work Product**: Artifact produced
- **Pattern**: Temporal progression (how practice unfolds)

### Relationships

```
Alpha
  ├─ has States (3+)
  ├─ belongs to Focus
  └─ may contributeTo another Alpha

Activity
  ├─ belongs to ActivitySpace
  ├─ contributesTo Alpha States
  ├─ worksOn Work Products
  └─ requires Competencies

Pattern
  └─ has Pattern Views (stages)
      ├─ achieves Alpha States
      ├─ uses Activities
      └─ produces Work Product Instances
```

## Common Tasks

### Create a New Practice

```typescript
// 1. Define basic structure
{
  "name": "My Practice",
  "description": "A practice for...",
  "baselinePracticeName": "Essence Kernel",
  
  // 2. Add alphas (optional, to extend baseline)
  "alphas": [
    {
      "name": "Custom Alpha",
      "description": "...",
      "focusName": "Solution",
      "states": [
        {
          "name": "Started",
          "description": "...",
          "seq": 1,
          "checklist": [
            {
              "name": "Initial check",
              "description": "...",
              "seq": 1
            }
          ]
        }
        // ... minimum 3 states
      ]
    }
  ],
  
  // 3. Add activities
  "activitySpaces": [
    {
      "name": "My Activities",
      "description": "...",
      "focusName": "Solution",
      "contributesTo": [
        { "alphaName": "Custom Alpha", "stateName": "Started" }
      ],
      "requiredCompetencies": ["Analysis"],
      "activities": [
        {
          "name": "Do Something",
          "description": "...",
          "focusName": "Solution",
          "contributesTo": [
            { "alphaName": "Custom Alpha", "stateName": "Started" }
          ],
          "requiredCompetencies": ["Analysis"],
          "worksOn": [
            { "workProductName": "Document", "levelOfDetailName": "Draft" }
          ],
          "recommendedCompetencyLevels": [
            { "competencyName": "Analysis", "competencyLevelName": "Proficient" }
          ]
        }
      ]
    }
  ],
  
  // 4. Add patterns
  "patterns": [
    {
      "name": "My Pattern",
      "description": "...",
      "patternViews": [
        {
          "name": "Phase 1",
          "description": "...",
          "seq": 1,
          "alphaStates": [
            { "alphaName": "Custom Alpha", "stateName": "Started" }
          ],
          "activitySpaces": ["My Activities"]
        }
        // ... more views
      ]
    }
  ],
  
  // 5. Metadata
  "authors": ["Your Name"],
  "version": "1.0.0",
  "keywords": ["keyword1", "keyword2"],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Compose a Method

```typescript
// Option 1: Embedded objects
{
  "name": "My Method",
  "description": "Composed method",
  "baselinePractice": {
    // Full baseline object
  },
  "practices": [
    // Full practice objects
  ]
}

// Option 2: Name references (requires library)
{
  "name": "My Method",
  "description": "Composed method",
  "baselinePracticeName": "Essence Kernel",
  "practiceNames": ["Scrum", "DevOps", "Custom Practice"]
}
```

### Validate a Practice

```bash
# CLI validation
node validate-schema.js practices/my-practice.json

# Programmatic validation
import { validatePracticeDocument } from '@/lib/validate';

const errors = await validatePracticeDocument(practice);
if (errors.length > 0) {
  console.error('Validation failed:', errors);
}
```

### Import/Export Practices

```typescript
// Import from JSON file
const practice = JSON.parse(fs.readFileSync('practice.json', 'utf8'));
await store.create(practice);

// Export to JSON file
const practice = await store.get(id);
fs.writeFileSync('practice.json', JSON.stringify(practice, null, 2));

// Import library
const library = JSON.parse(fs.readFileSync('library.json', 'utf8'));
for (const doc of library) {
  await store.create(doc);
}
```

## API Quick Reference

### Documents API

```bash
# List all documents
GET /api/documents

# Get document by ID
GET /api/documents/:id

# Create document
POST /api/documents
Content-Type: application/json
{ "doc": { ... } }

# Update document
PUT /api/documents/:id
Content-Type: application/json
{ ... }

# Delete document
DELETE /api/documents/:id
```

### Resolve Practice

```bash
# Resolve practice with dependencies
POST /api/documents/resolve-for-render
Content-Type: application/json
{
  "practiceId": "practice-id",
  "libraryDocuments": [ ... ]  # optional
}
```

### Generate PDF

```bash
# Generate PDF from practice
POST /api/pdf
Content-Type: application/json
{
  "practice": { ... },
  "format": "a4"  # or "letter"
}
```

## Configuration

### Environment Variables

Create `.env.local` in `web/` directory:

```bash
# Storage backend
STORAGE_TYPE=file          # or "mongo"

# MongoDB (if using mongo storage)
MONGODB_URI=mongodb://localhost:27017/adoptionframework

# Optional
PORT=3000
NODE_ENV=development       # or "production"
```

### Storage Configuration

**File Storage** (default):
- Location: `practices/`
- Format: JSON files
- Main library: `practices/adoption-library.json`

**MongoDB Storage** (optional):
- Collection: `practices`
- Indexes: `_id`, `name`
- Connection: via `MONGODB_URI`

## Common Patterns

### Tags Structure

```typescript
// Structured tags (preferred)
{
  "tags": {
    "domainTags": ["Architecture", "Security"],
    "lifecycleTags": ["Strategy", "Implementation"],
    "organizationalTags": ["Engineering", "Operations"]
  }
}

// Legacy tags (flat array)
{
  "tags": ["Strategy", "Implementation"]
}
```

### Symbolic References

```typescript
// Use string names, not embedded objects
{
  "contributesTo": [
    { "alphaName": "Requirements", "stateName": "Conceived" }  // ✓ Correct
  ]
}

// NOT:
{
  "contributesTo": [
    { "alpha": { "name": "Requirements" }, ... }  // ✗ Wrong
  ]
}
```

### Practice Dependencies

```typescript
{
  "name": "Advanced Practice",
  "baselinePracticeName": "Essence Kernel",      // Always required
  "practiceDependencyNames": [                   // Optional
    "Basic Practice",                            // Merges first
    "Intermediate Practice"                      // Merges second
  ]
  // Current practice merges last
}
```

## Troubleshooting

### Validation Errors

**Problem**: "Property X is not valid"
- **Solution**: Check schema definition for required properties
- **Tool**: Use JSON editor with schema validation enabled

**Problem**: "Alpha State reference not found"
- **Solution**: Verify alpha and state names match exactly (case-sensitive)
- **Tool**: Use autocomplete in structured editors

### Merge Issues

**Problem**: Description overridden in merged method
- **Solution**: This is expected - baseline descriptions always win
- **Workaround**: Use narratives for extension-specific prose

**Problem**: Circular dependency detected
- **Solution**: Review practice dependency chain, remove cycle
- **Tool**: Check `practiceDependencyNames` arrays

### Performance Issues

**Problem**: Slow rendering of large practices
- **Solution**: Enable lazy loading in visualization components
- **Optimization**: Use pattern filters to show subset

**Problem**: Large library file
- **Solution**: Split into multiple files, use MongoDB storage
- **Alternative**: Archive old practices

## Best Practices

### Practice Authoring

1. **Start with baseline**: Always extend from a baseline practice
2. **Minimal alphas**: Only add alphas specific to your practice
3. **Clear names**: Use descriptive, consistent naming
4. **Complete states**: Minimum 3 states per alpha
5. **Meaningful patterns**: Patterns should show temporal flow

### Method Building

1. **Order matters**: Dependencies merge before dependents
2. **Test composition**: Preview merged result before saving
3. **Document rationale**: Add description explaining method purpose
4. **Version control**: Use semantic versioning

### Library Management

1. **Organize by tags**: Use structured tags consistently
2. **Unique names**: Ensure practice names are unique
3. **Regular backups**: Export library regularly
4. **Clean metadata**: Keep authors, keywords up to date

## Resources

- [Main README](../README.md) - Project overview
- [Schema Documentation](./SCHEMA.md) - Complete schema reference
- [Source Files](./SOURCE_FILES.md) - Code documentation
- [System Architecture](./SYSTEM_ARCHITECTURE.md) - Architecture details

## Getting Help

1. Check documentation in `docs/` directory
2. Review example practices in `practices/adoption-library.json`
3. Use validation tools to identify issues
4. Check browser console for errors
5. Review API responses for error details

## Next Steps

1. **Try the examples**: Load and edit example practices
2. **Create your own**: Start with a simple practice
3. **Build a method**: Compose your first method
4. **Export reports**: Generate PDFs of your practices
5. **Contribute**: Add your practices to the library

## Keyboard Shortcuts (Future)

Coming soon:
- `Ctrl+S` - Save current practice
- `Ctrl+K` - Quick search
- `Ctrl+/` - Toggle editor mode
- `Ctrl+Shift+P` - Command palette

## Version Information

- Current Version: See `package.json`
- Schema Version: Draft 2020-12
- Next.js Version: 15
- React Version: 19

---

For more detailed information, see the complete documentation in the `docs/` directory.
