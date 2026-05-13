# Pattern Kanban Board Visualization

## Overview

The Pattern Kanban Board provides an interactive, swim lane-based visualization of how practices progress through temporal phases using **Pattern Views** as columns and practice elements in three distinct sections:

1. **Alpha Swim Lanes**: Track alpha state progression
2. **Work Product Swim Lanes**: Track work product level of detail progression  
3. **Activities**: Show work performed in each phase

## Structure

### Grid Layout: Three-Section Swim Lanes × Pattern Views

The board uses a **grid layout** with three sections:

**Section 1: Alpha Swim Lanes**
- **Horizontal Rows**: Each alpha gets its own row showing state progression
- **Vertical Columns**: Each pattern view is a temporal phase
- Each cell shows the alpha's state at that phase (or empty if not present)

**Section 2: Work Product Swim Lanes**
- **Horizontal Rows**: Each work product gets its own row showing level progression
- **Vertical Columns**: Each pattern view is a temporal phase
- Each cell shows the work product's level of detail at that phase (or empty if not present)

**Section 3: Activities**
- Activities performed in each pattern view (cards per column, no swim lanes)
- Shows what work is done to advance alphas and produce work products

Reading patterns:
- **Left-to-right** shows temporal progression through phases
- **Horizontally across a swim lane** shows how a single alpha or work product evolves
- **Vertically down a column** shows all elements in a specific phase

### Pattern View Columns
Each column represents a PatternView (a temporal phase or stage in the pattern):
- Ordered by `seq` (left to right progression)
- Shows the phase name and description
- Includes narrative context for storytelling
- Spans all three sections (Alpha swim lanes, Work Product swim lanes, Activities)

### Section 1: Alpha Swim Lanes

#### 🎯 Alpha States (Purple)
- Each **row** represents one alpha showing its state progression
- Each **cell** shows the alpha's state at that pattern view
- Empty cells (dashed border) indicate the alpha doesn't appear in that phase
- Example row: "Topology-Aligned Team" progressing through "Seeded → Formed → Performing"

#### 📌 Alpha Instances (Green)

- Concrete named instances of alphas displayed using **colon notation**: `Instance : Alpha`
- The notation follows object-oriented convention (instance : class)
- Specific examples or targets at a particular state
- Example: "Platform Team : Topology-Aligned Team at Performing"

### Section 2: Work Product Swim Lanes

#### 📄 Work Products (Orange)
- Each **row** represents one work product showing its level of detail progression
- Each **cell** shows the work product's level at that pattern view
- Empty cells indicate the work product doesn't appear in that phase
- **Automatically inferred** from two sources:
  1. Activities that produce them (via `activity.worksOn[]`)
  2. Work product levels that contribute to alpha states (via `levelOfDetail.contributesTo[]`)
- Example row: "Team API Specification" evolving through "Drafted → Published"

#### 📋 Work Product Instances (Yellow)

- Concrete named instances of work products displayed using **colon notation**: `Instance : WorkProduct`
- The notation follows object-oriented convention (instance : class)
- Extracted from `alphaInstance.evidenceBy[]` array
- Shows specific artifacts that evidence alpha instance states
- Example: "Core Services API : Team API Specification (Published)"

### Section 3: Activities

#### ⚡ Activities (Blue)
- Work being performed in each pattern view (no swim lanes, cards per column)
- **Explicitly referenced**: Listed in `patternView.activities[]` and `patternView.activitySpaces[]`
- **Automatically inferred**: Activities that contribute to any alpha state in this pattern view
- Example: "Define Service Boundaries (ISH)"

**Activity Inference**: The board automatically identifies activities from the baseline that contribute to any of the alpha states shown in the column. This ensures ALL relevant work appears in each phase, even if the pattern author didn't explicitly list every activity.

## Example Layout

### Swim Lane Grid

```
┌─────────────────────┬──────────────────┬────────────────────┬─────────────────────┐
│ Alpha               │ Foundation (#1)  │ Operationalize (#2)│ Improvement (#3)    │
├─────────────────────┼──────────────────┼────────────────────┼─────────────────────┤
│ Topology-Aligned    │                  │                    │                     │
│ Team                │  → Seeded        │  → Formed          │  → Performing       │
│                     │                  │                    │                     │
├─────────────────────┼──────────────────┼────────────────────┼─────────────────────┤
│ Cognitive-Optimized │                  │                    │                     │
│ Way of Working      │  → Principles    │  → Foundation      │  → Working Well     │
│                     │    Established   │    Established     │                     │
└─────────────────────┴──────────────────┴────────────────────┴─────────────────────┘

🎯 Read horizontally: See how "Topology-Aligned Team" progresses Seeded → Formed → Performing
🎯 Read vertically: See all alphas in the "Foundation" phase

┌─ Activities & Work Products (per column) ─────────────────────────────────────┐
│                                                                                │
│ Foundation (#1)          Operationalization (#2)    Improvement (#3)          │
│                                                                                │
│ ⚡ ACTIVITIES             ⚡ ACTIVITIES               ⚡ ACTIVITIES              │
│  • Define Boundaries     • Establish Team API       • Monitor Metrics         │
│  • Assess Load                                      • Retrospectives          │
│                                                                                │
│ 📄 WORK PRODUCTS         📄 WORK PRODUCTS           📄 WORK PRODUCTS          │
│  • Team API (Drafted)    • Team API (Published)     • Metrics Dashboard       │
│  • Assessment (Qual.)                               • Improvement Backlog     │
└────────────────────────────────────────────────────────────────────────────────┘
```

## How to Use

### Accessing the Board

1. Navigate to http://localhost:3000/flow-visualizer (or click "Pattern Kanban" from dashboard)
2. Select a practice from the dropdown
3. If multiple patterns exist, select the pattern to visualize

### Reading the Board

**Horizontal Swim Lanes (Rows)**:
- Each row represents one alpha
- Shows that alpha's state progression across all pattern views
- Empty cells (dashed border) indicate the alpha doesn't appear in that phase
- Follow a row left-to-right to see alpha evolution

**Vertical Columns (Pattern Views)**:
- Represents temporal progression through the pattern
- Start at the leftmost column (earliest phase)
- Progress through to the right (later phases)
- Activities and work products appear below the swim lane grid

**Grid Intersections (Cells)**:
- Show the specific state of an alpha at that pattern view
- Purple/green cards indicate state or instance
- Empty cells show the alpha isn't targeted in that phase

### Understanding Relationships

- **Activities produce Work Products**: Look at activity cards and their corresponding work product cards in the same column
- **Work Products contribute to Alpha States**: Work products at specific levels of detail evidence achieving alpha states
- **Narrative context**: Read the 💡 narrative notes to understand the story of each phase

### Visual Design and Navigation

- **Label Tiles**: All elements are displayed as clickable label tiles with text wrapping for longer names
  - **Purple labels**: Alpha names and generic states
  - **Green labels**: Alpha instances (using `instance : alpha` notation)
  - **Orange labels**: Work product names and generic levels of detail
  - **Yellow labels**: Work product instances (using `instance : workProduct` notation)
  - **Blue labels**: Activity names
  - Long names wrap onto multiple lines while maintaining the tile appearance
- **Clickable Navigation**: Click any label to jump to the element's full definition elsewhere in the document
  - Alpha labels → Navigate to the alpha's full definition in the "Core Concepts & Progression" section
  - Work product labels → Navigate to the work product's full definition in the "Evidentiary Artifacts" section
  - Activity labels → Navigate to the activity's full definition in the "Execution & Roles" section
- **Tooltips**: Hover over any label to see the element's description
- **Row Headers**: Alpha and work product names in the first column are also clickable labels linking to their definitions

## Comparison with Other Views

### vs. Pattern Matrix
- **Pattern Matrix**: Tabular, dense, shows all alphas × all pattern views
- **Kanban Board**: Card-based, visual, shows active elements per phase
- **Use Matrix for**: Comprehensive overview, planning coverage
- **Use Kanban for**: Understanding flow, seeing what happens when

### vs. Alpha Contribution Diagrams
- **Alpha Diagrams**: Hierarchical relationships between alphas
- **Kanban Board**: Temporal progression through phases
- **Use Diagrams for**: Understanding alpha dependencies
- **Use Kanban for**: Understanding temporal sequencing

### vs. Flow Visualization (Sankey)
- **Sankey**: Activity → Work Product → Alpha State flows
- **Kanban**: Pattern View phases with all elements
- **Use Sankey for**: Tracing value streams
- **Use Kanban for**: Understanding phase-based progression

## Benefits

### 1. **Alpha Progression Clarity**
- **Horizontal swim lanes** make alpha evolution visually obvious
- Easy to see how any alpha progresses through states
- Identify which alphas advance in which phases
- Spot gaps where alphas stall or skip phases

### 2. **Temporal Clarity**
- **Vertical columns** show exactly what happens in each phase
- Understand the progression from start to finish
- Identify phase transitions and dependencies

### 3. **Complete Coverage (Activities & Work Products)**
- **Activities**: All activities that contribute to alpha states are shown, even if not explicitly listed
- **Work Products**: All work products appear via two paths:
  - Produced by shown activities
  - Contribute to shown alpha states (evidence-based inference)
- Pattern authors can focus on key elements; inference fills in the gaps
- Reduces risk of missing critical work or artifacts in a phase
- Ensures completeness without manual exhaustive listing

### 4. **Visual Alignment**
- Grid layout creates visual structure
- Alphas stay in consistent vertical positions across columns
- Easy to scan horizontally for a single alpha's journey
- Easy to scan vertically for a single phase's scope

### 5. **Element Grouping**
- Activities and work products grouped by phase (below swim lanes)
- Alpha states aligned in swim lanes
- Clear separation of "progress" (swim lanes) vs. "work" (activities/artifacts)

### 6. **Visual Scanning**
- Quick identification by color coding
- Empty cells (dashed) show where alphas don't appear
- Hover over any cell for details
- Easy to spot gaps or imbalances

### 7. **Storytelling**
- Narrative context provides the "why" for each phase
- Natural left-to-right progression tells a story
- Horizontal alpha lanes show character development
- Easier to communicate to stakeholders

## Technical Details

### Data Extraction

```typescript
// Pattern Views → Columns
for each patternView in pattern.patternViews:
  column = {
    name: patternView.name,
    seq: patternView.seq,
    alphaStates: resolve(patternView.alphaStates[]),
    activities: resolve(patternView.activities[]),
    workProducts: infer from activities.worksOn[],
  }
```

### Card Resolution

1. **Alpha State Cards**: Parse `alphaStates[]` (AlphaContribution objects or string tokens)
   - Display format: just the state name (e.g., "Seeded")
   - Shown in purple cells
2. **Alpha Instance Cards**: Extract from `patternView.alphaInstances[]`
   - Display format: `instanceName : alphaName` with optional state info (e.g., "Platform Team : Topology-Aligned Team at Performing")
   - Shown in green cells to distinguish from generic states
   - Extract work product instances from each `alphaInstance.evidenceBy[]` array
3. **Activity Cards**: 
   - Resolve explicit activity names from `patternView.activities[]` and `patternView.activitySpaces[]`
   - **Infer** additional activities by finding all baseline activities whose `contributesTo[]` matches any alpha state in this pattern view
   - Mark inferred activities with `metadata.inferred = true`
4. **Work Product Cards** (triple-path inference):
   - **Path 1 (Instances)**: From `alphaInstance.evidenceBy[]` arrays - concrete work product instances that evidence alpha instances
     - Display format: `instanceName : workProductName` with level (e.g., "Core Services API : Team API Specification (Published)")
     - Shown in yellow cells to distinguish from generic work products
   - **Path 2 (Activity outputs)**: From activities shown (explicit or inferred) via `activity.worksOn[]`
     - Display format: just the level name (e.g., "Published")
     - Shown in orange cells
   - **Path 3 (State evidence)**: From baseline work products whose `levelOfDetail.contributesTo[]` matches any alpha state in this pattern view
     - Display format: just the level name
     - Shown in orange cells
   - Mark as inferred if either: (a) produced by an inferred activity, or (b) found via Path 3 with no producing activity
   - This ensures work products that evidence alpha states appear even if no activity is shown producing them

### Styling

- Elements displayed as clickable label tiles using PatternFly Label components
- Color scheme: purple (alphas), orange (work products), blue (activities)
- Consistent with label styling throughout Browse and Project Manager views
- Responsive layout (horizontal scroll for many columns)

## Future Enhancements

### Potential Features

1. **Drag and Drop**
   - Reorganize cards within columns
   - Move cards between phases (update pattern view assignments)
   - Visual pattern editing

2. **Filtering & Search**
   - Show/hide card types
   - Filter by focus area
   - Search for specific alphas or activities

3. **Card Expansion**
   - Click to see full details
   - Show checklists from alpha states
   - Display activity competencies and personas

4. **Progress Tracking**
   - Mark cards as complete/in-progress
   - Show completion percentage per column
   - Highlight critical path

5. **Export**
   - Generate PNG/PDF of board
   - Export as CSV for planning
   - Print-friendly layout

6. **Multi-Pattern View**
   - Show multiple patterns side-by-side
   - Compare pattern flows
   - Identify pattern dependencies

## Demo

Run the demo to see extracted data structure:

```bash
cd web
npx tsx src/lib/__demo__/kanbanPatternDemo.ts
```

This shows:
- Column structure (Pattern Views)
- Card distribution (Alpha States, Activities, Work Products)
- Narrative context
- Complete board layout in ASCII art

## Code Location

- Data extraction: `web/src/lib/kanbanPatternData.ts`
- React component: `web/src/components/KanbanPatternBoard.tsx`
- Page route: `web/src/app/flow-visualizer/page.tsx`
- Demo script: `web/src/lib/__demo__/kanbanPatternDemo.ts`
