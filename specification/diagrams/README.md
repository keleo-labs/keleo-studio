# Diagram System

## Overview
Keleo Studio includes seven diagram types, each split into a data/layout module (pure functions, no rendering dependencies) and one or more renderers (interactive and static). This separation ensures the same layout algorithm serves both the interactive navigator and the static site export.

## Architecture
- Data/layout modules: compute positions, dimensions, and edge paths from domain data
- Interactive renderers: consume layout data, produce interactive SVG elements with click handlers
- Static renderers: consume layout data, produce SVG strings for embedding in HTML exports

## Shared Utilities
- Text wrapping: wrapDiagramTextLines(text, maxChars) — splits text into lines respecting word boundaries
- Character limits: diagramTextCharLimits(blockWidth, paddingX, chevronWidth) → { nameMaxChars: floor(contentWidth/8), descMaxChars: floor(contentWidth/7) }
- Block height measurement: computeBlockHeightForWidth with nameLineH=18, descLineH=16, gap=8, bottomPad=22
- Arrow height measurement: computeArrowHeightForWidth with minimum height 74
- Arrow notch width: min(42, floor(blockWidth × 0.18))
- Aliased name layout: supports primary name, primary+canonical, and canonical-continuation row types
- Graph depth limits: configurable maximum depth for recursive hierarchy traversal

## Diagram Index
1. [Overview Diagram](./overview-diagram.md) — Alpha/activity hierarchy trees by focus
2. [Dependency Tree](./dependency-tree.md) — Practice dependency graph
3. [Pattern Matrix](./pattern-matrix.md) — Pattern views × alpha grid
4. [Progressive Flow](./progressive-flow.md) — Activity→state chains per persona group
5. [Radar Chart](./radar-chart.md) — Alpha coverage polar chart
6. [Sankey Flow](./sankey-flow.md) — Activity→work product→alpha state flows
7. [Alpha Contributes](./alpha-contributes.md) — Alpha contribution hierarchy layout

## Example Diagrams

The [examples/](./examples/) directory contains SVG examples generated from the **Scrum Foundations** bundle (a moderate-complexity practice with 8 alphas, 14 activities, 7 work products across 3 focuses). These are produced by `scripts/generate-example-diagrams.ts`:

| File | Diagram Type |
|------|-------------|
| [overview-concerns.svg](./examples/overview-concerns.svg) | Overview of Concerns (alpha hierarchy by focus) |
| [overview-activities.svg](./examples/overview-activities.svg) | Overview of Activities (activity spaces by focus) |
| [dependency-tree.svg](./examples/dependency-tree.svg) | Dependency tree (Scrum Foundations → Project Essentials + Delivery and Team Operations) |
| [pattern-matrix.svg](./examples/pattern-matrix.svg) | Pattern matrix (alpha rows × pattern view columns) |
| [progressive-flow.svg](./examples/progressive-flow.svg) | Progressive flow (Scrum Team persona group → activities → alpha states) |
| [radar-chart.svg](./examples/radar-chart.svg) | Radar chart (alpha coverage across Value/Solution/Endeavor focuses) |
| [sankey-flow.svg](./examples/sankey-flow.svg) | Sankey flow (activities → work products → alpha states) |
| [alpha-contributes.svg](./examples/alpha-contributes.svg) | Alpha contributes (contribution hierarchy per focus swimlane) |

To regenerate: `cd web && npx tsx ../scripts/generate-example-diagrams.ts`
