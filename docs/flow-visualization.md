# Flow Visualization (Sankey Diagram)

## Overview

The Flow Visualizer provides an interactive Sankey diagram that shows how **Activities** flow through **Work Products** to achieve **Alpha States** in your adoption framework practices.

## What is a Sankey Diagram?

A Sankey diagram is a type of flow diagram where the width of arrows is proportional to the flow quantity. In our context:

- **Nodes** represent practice elements (Activities, Work Products, Alpha States)
- **Links** represent relationships (who works on what, what contributes to which state)
- **Width** indicates the strength/count of connections

## How to Use

1. **Access**: Navigate to http://localhost:3000/flow-visualizer from the dashboard
2. **Select Practice**: Choose a practice from the dropdown menu
3. **Explore**: Hover over nodes and links to see detailed descriptions
4. **Analyze**: Identify bottlenecks, dependencies, and value streams

## What the Visualization Shows

### Left Column: Activities (Blue)
- Work performed by teams
- Examples: "Define Service Boundaries", "Assess Cognitive Load"
- Shows **what** is being done

### Middle Column: Work Products (Orange)
- Artifacts created or evolved at specific levels of detail
- Examples: "Team API Specification (Drafted)", "Cognitive Load Assessment (Qualitative)"
- Shows **what** is being produced

### Right Column: Alpha States (Green)
- Progress states being achieved
- Examples: "Topology-Aligned Team → Seeded", "Way of Working → Working Well"
- Shows **where** you're progressing to

## Reading the Flows

1. **Activity → Work Product**: Shows which activities produce which artifacts
2. **Work Product → Alpha State**: Shows how artifacts evidence progress toward states
3. **Direct Activity → Alpha State**: Quality practices that don't produce intermediate artifacts

## Example: Team Topologies Practice

```
Define Service Boundaries (ISH)
    ↓
Team API Specification (Drafted)
    ↓
Topology-Aligned Team → Seeded
```

This flow shows:
1. The activity "Define Service Boundaries" 
2. Produces a drafted Team API Specification
3. Which evidences achieving the "Seeded" state for Topology-Aligned Teams

## Insights You Can Gain

### 1. **Value Stream Mapping**
- Trace how work flows from activities through artifacts to outcomes
- Identify the critical path for achieving alpha states

### 2. **Bottleneck Detection**
- Nodes with many incoming but few outgoing flows
- Work products that don't contribute to progress states

### 3. **Coverage Analysis**
- Alpha states with no contributing work products (gaps)
- Activities that don't produce artifacts (potential waste)

### 4. **Dependency Understanding**
- Which alpha states depend on which work products
- Which activities are prerequisites for progress

## Technical Details

### Data Extraction Logic

```typescript
// Activities connect to Work Products via "worksOn"
activity.worksOn = [
  { workProductName: "X", levelOfDetailName: "Y" }
]

// Work Products connect to Alpha States via "contributesTo"
workProduct.levelsOfDetail[i].contributesTo = [
  { alphaName: "A", stateName: "S" }
]
```

### Node Categories

1. **Activity nodes**: 
   - ID: `activity:{name}`
   - Category: `activity`
   - Color: Blue (#06c)

2. **Work Product nodes**:
   - ID: `workProduct:{name}@{level}`
   - Category: `workProduct`
   - Color: Orange (#f59e0b)

3. **Alpha State nodes**:
   - ID: `alphaState:{alphaName}→{stateName}`
   - Category: `alphaState`
   - Color: Green (#10b981)

### Flow Value Calculation

Each link has a value (currently set to 1 per connection). Future enhancements could weight flows by:
- Effort/duration of activities
- Complexity of work products
- Importance of alpha states

## Future Enhancements

### Potential Additions

1. **Filtering**
   - By focus area
   - By alpha/work product type
   - By lifecycle phase

2. **Grouping**
   - Cluster by activity spaces
   - Group by alpha families
   - Organize by persona involvement

3. **Weighting**
   - Scale flows by effort estimates
   - Priority-based sizing
   - Risk/impact factors

4. **Multi-Practice Views**
   - Compare flows across practices
   - Method-level aggregation
   - Dependency analysis between practices

5. **Interactive Editing**
   - Click to navigate to practice editor
   - Visual connection creation
   - Drag-and-drop flow adjustment

## Comparison with Pattern Matrix

While the **Pattern Matrix** shows temporal progression across pattern views (columns) and alpha states (rows), the **Sankey Flow** shows:

- **Work-based flow** instead of time-based sequence
- **Artifact lineage** from activities through work products to states
- **Value stream visualization** showing how work creates progress

Both views are complementary:
- Pattern Matrix: "When do we achieve these states?"
- Sankey Flow: "How does work flow to achieve states?"

## Related Visualizations

1. **Pattern Matrix**: Temporal progression through pattern views
2. **Alpha Contribution Diagrams**: Hierarchical alpha relationships
3. **Activity Space Diagrams**: Focus-based activity organization

## Code Location

- Data extraction: `web/src/lib/sankeyFlowData.ts`
- React component: `web/src/components/SankeyFlowDiagram.tsx`
- Page route: `web/src/app/flow-visualizer/page.tsx`
- Demo script: `web/src/lib/__demo__/sankeyFlowDemo.ts`

## Demo Script

Run the demo to see extracted flow data:

```bash
cd web
npx tsx src/lib/__demo__/sankeyFlowDemo.ts
```

This will show you:
- Flow statistics (node counts, link counts)
- All activities, work products, and alpha states
- Complete flow paths from activities to states
