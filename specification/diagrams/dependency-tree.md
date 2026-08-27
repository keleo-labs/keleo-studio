# Dependency Tree Diagram

## Purpose
Visualises the dependency graph between practices, baselines, and the root document. Shows which documents depend on which others.

## Data Model
- DependencyNode: { name, kind (practice|baselinePractice|root), baselineName, version, children: DependencyNode[] }
- DependencyCrossEdge: { fromName, toName } — edges for already-visited nodes (prevents infinite recursion)
- DependencyTreeData: { root, baselineNames, crossEdges }

## Tree Building
FUNCTION buildDependencyTree(doc, libraryIndex, visited):
  Classify document as practice, method, or baselinePractice
  FOR EACH dependency (practiceDependencyNames for practices, baselinePracticeNames for baselines, practices/practiceNames for methods):
    IF already visited: add to crossEdges, skip
    Mark as visited
    Recurse into dependency
    Add as child node
  RETURN DependencyNode

## Layout Algorithm
FUNCTION computeDependencyLayout(tree):
  1. Flatten tree to FlatNode[] with column assignments
  2. Adjust columns iteratively so cross-edge targets always right of sources
  3. Group nodes by baseline for visual clustering
  4. Within each group: baselines get own row first, then practices arranged in chain rows following parent→child relationships
  5. Compute group bounding boxes, node positions
  6. Route inter-group edges with perpendicular-tangent bezier curves

## Layout Constants
- NODE_WIDTH: 160
- NODE_HEIGHT: 48
- COLUMN_GAP: 60
- ROW_GAP: 16
- GROUP_PADDING_X: 16
- GROUP_PADDING_Y: 28
- GROUP_GAP: 24

## Edge Routing
FUNCTION computeEdgePath(source, target, exitDirection, entryDirection):
  Compute control point offset: span × 0.45
  Generate cubic bezier: M source C controlPoint1 controlPoint2 target
  Exit/entry directions: right, left, top, bottom

Detects vertically stacked vs horizontally separated groups and routes accordingly.

## Node Styling
- Root/baseline: blue border (#0066cc), root fill light blue (#f0f0ff), baseline fill light gray (#f5f5f5)
- Practice: gray border (#d2d2d2), white fill
- Selected: blue border, highlighted fill (#edf1ff), thicker stroke

## Static Export
Uses same computeEdgePath and computeNodeStyle functions. Adds SVG arrow markers for edge tips. Groups rendered as rounded rectangles with labels.

## Example

### Scrum Foundations Dependency Tree

![Dependency Tree — Scrum Foundations](./examples/dependency-tree.svg)
