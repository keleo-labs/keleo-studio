# Keleo Studio Specification

## Overview

Keleo Studio is a practice management and method composition system built on SEMAT Essence. It supports authoring, composing, visualising, and distributing structured practices and methods for any domain where teams need to define and follow structured work processes.

This specification describes the system's behaviour, data structures, and algorithms at a level of detail sufficient for reimplementation in any technology stack. Specific framework and library choices are documented separately in [technical-decisions.md](./technical-decisions.md).

## How to Use

- **New to the system?** Start with the [Specification Guide](./SPECIFICATION-GUIDE.md) for reading order and domain concepts.
- **Reimplementing?** Read [Domain Model (01)](./modules/01-domain-model.md) and [Storage (08)](./modules/08-storage.md) first — they define what data exists and how it is persisted.
- **Working on a specific feature?** Jump to the relevant module below.
- **Working on diagrams?** See the [Diagram System](./diagrams/README.md) — each diagram type has its own specification.

---

## Module Index

### Core Application Features

| # | Module | Description |
|---|--------|-------------|
| 01 | [Domain Model](./modules/01-domain-model.md) | All domain types, relationships, constraints, and type discrimination rules |
| 02 | [Dashboard](./modules/02-dashboard.md) | Configurable library dashboard with filtered sections, starring, and card carousels |
| 03 | [Library System](./modules/03-library.md) | Library browser, bundle system, resolution pipeline, import/export, .keleo packages |
| 04 | [Practice Navigator](./modules/04-practice-navigator.md) | 3-panel read-only practice explorer with sidebar, detail panels, and overview diagrams |
| 05 | [Practice Author](./modules/05-practice-author.md) | Multi-mode editor (WYSIWYG/YAML/JSON) for practice and baseline documents |
| 06 | [Method Builder](./modules/06-method-builder.md) | Drag-and-drop method composition with merge algorithm |
| 07 | [Project Manager](./modules/07-project-manager.md) | Project tracking against practices/methods with team, plan, and state management |

### Infrastructure

| # | Module | Description |
|---|--------|-------------|
| 08 | [Storage Layer](./modules/08-storage.md) | Pluggable document and bundle persistence (file-based and database backends) |
| 09 | [Validation System](./modules/09-validation.md) | Dual-mode schema validation (strict/relaxed) and reference integrity checking |
| 10 | [Static Site Export](./modules/10-static-site-export.md) | Self-contained HTML site generation from practice documents |
| 11 | [API Layer](./modules/11-api-layer.md) | All HTTP endpoints with request/response shapes |
| 12 | [Editor Components](./modules/12-editor-components.md) | Reusable field editors, containers, and code editors |
| 13 | [Preferences](./modules/13-preferences.md) | Theme and language pack system |

### Diagram Specifications

SVG diagram types are documented separately in [diagrams/](./diagrams/):

| Diagram | Description |
|---------|-------------|
| [Overview Diagram](./diagrams/overview-diagram.md) | Alpha/activity hierarchy trees grouped by focus |
| [Dependency Tree](./diagrams/dependency-tree.md) | Practice dependency graph with grouped layout |
| [Pattern Matrix](./diagrams/pattern-matrix.md) | Pattern views × alpha state grid |
| [Progressive Flow](./diagrams/progressive-flow.md) | Activity→state chains per persona group |
| [Radar Chart](./diagrams/radar-chart.md) | Alpha coverage polar chart |
| [Sankey Flow](./diagrams/sankey-flow.md) | Activity→work product→alpha state flow diagram |
| [Alpha Contributes](./diagrams/alpha-contributes.md) | Alpha contribution hierarchy layout within swimlanes |

### Cross-Cutting

| Document | Description |
|----------|-------------|
| [Technical Decisions](./technical-decisions.md) | Framework and library choices with rationale |
| [Specification Guide](./SPECIFICATION-GUIDE.md) | Reading order, conventions, and domain glossary |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                    User Interface                     │
│  Dashboard │ Navigator │ Author │ Builder │ Project   │
├─────────────────────────────────────────────────────┤
│                    API Layer                          │
│  Documents │ Library │ Bundles │ Analysis │ Diagrams  │
├─────────────────────────────────────────────────────┤
│                  Business Logic                       │
│  Merge │ Resolution │ Validation │ Scoring │ Export   │
├─────────────────────────────────────────────────────┤
│                  Storage Layer                        │
│         Document Store │ Bundle Store │ Assets        │
└─────────────────────────────────────────────────────┘
```

**Key architectural principles:**
1. **Schema-driven** — the JSON Schema is the source of truth for the domain model
2. **Storage-pluggable** — file-based and database backends are interchangeable
3. **Server-first data** — business logic and data transformation run server-side
4. **Thin API controllers** — routes validate input and delegate to business logic
5. **Diagram separation** — layout algorithms are pure functions; rendering is a separate concern

---

## Data Flow

```
Document authored/imported
  → Schema validation (strict + relaxed)
  → Reference integrity check
  → Persisted to storage (document store or bundle store)
  → Indexed in library (BundleLibraryIndex)
  → Resolved with dependencies (LibraryLookupIndex)
  → Composed via merge algorithm (if method)
  → Rendered in navigator / exported as static site
```

---

**Last Updated**: 2026-08-17
**Specification Version**: 2.0
