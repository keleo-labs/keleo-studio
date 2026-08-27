# Specification Guide

## Introduction

This specification describes Keleo Studio — a practice management and method composition system built on SEMAT Essence — at a level of detail that supports reimplementation in any technology stack.

**Behavioural specifications** (in `modules/` and `diagrams/`) are technology-agnostic: they describe *what* the system does and *why*, not *how* it is built. Specific framework and library choices are documented separately in [technical-decisions.md](./technical-decisions.md) with rationale for each.

The specification is intended for:
- Developers reimplementing the system in a different stack
- Developers new to the codebase who need a conceptual map
- AI-assisted development and code generation
- System design review and refactoring planning

---

## How to Read This Specification

### Recommended Reading Order

1. **[README.md](./README.md)** — high-level overview, architecture, module index
2. **[Domain Model (Module 01)](./modules/01-domain-model.md)** — all domain types, relationships, and constraints
3. **[Storage Layer (Module 08)](./modules/08-storage.md)** — how documents are persisted
4. **[Library System (Module 03)](./modules/03-library.md)** — how documents are indexed, resolved, and packaged
5. Feature modules based on your area of interest
6. **[Diagram specifications](./diagrams/README.md)** — layout algorithms and rendering rules for each diagram type

### Module Categories

#### Core Application Features
- **Module 01: Domain Model** — type system, schema, constraints
- **Module 02: Dashboard** — configurable library dashboard with filtered sections
- **Module 03: Library System** — browsing, bundles, resolution, import/export
- **Module 04: Practice Navigator** — read-only practice exploration with 3-panel layout
- **Module 05: Practice Author** — multi-mode practice document editor
- **Module 06: Method Builder** — drag-and-drop practice composition
- **Module 07: Project Manager** — project tracking against practices/methods

#### Infrastructure
- **Module 08: Storage Layer** — pluggable document and bundle persistence
- **Module 09: Validation System** — dual-mode schema and reference validation
- **Module 10: Static Site Export** — self-contained HTML site generation
- **Module 11: API Layer** — all HTTP endpoints
- **Module 12: Editor Components** — reusable field editors and containers
- **Module 13: Preferences** — theme and language pack system

#### Diagrams (separate hierarchy)
- **Overview Diagram** — alpha/activity hierarchy trees by focus
- **Dependency Tree** — practice dependency graph
- **Pattern Matrix** — pattern views × alpha grid
- **Progressive Flow** — activity→state chains per persona group
- **Radar Chart** — alpha coverage polar chart
- **Sankey Flow** — activity→work product→alpha state flows
- **Alpha Contributes** — alpha contribution hierarchy layout

---

## Specification Conventions

### Data Types

Specifications use generic pseudo-type notation, not language-specific syntax:

```
string          — text value
integer         — whole number
number          — numeric value (integer or decimal)
boolean         — TRUE or FALSE
Array<T>        — ordered collection of T
Map<K, V>       — key-value collection
Set<T>          — unordered unique collection
Record           — structured data with named fields
enum(a | b | c) — one of the listed values
T?              — optional (may be absent)
T | U           — union (one of the listed types)
```

### Pseudo-code

Algorithms are written in structured plain English:

```
FUNCTION name(param1, param2) → ReturnType:
  // description of logic
  RETURN result

IF condition THEN
  action
ELSE IF other THEN
  other action
ELSE
  default

FOR EACH item IN collection:
  process item

SWITCH value:
  CASE option1: action1
  CASE option2: action2
  DEFAULT: fallback
```

### Common Operations

```
filtered  = FILTER collection WHERE condition
mapped    = MAP collection TO transformation
found     = FIND item IN collection WHERE condition
sorted    = SORT collection BY property
grouped   = GROUP collection BY property
combined  = UNION of collection1 AND collection2
```

---

## Domain Concepts

### Essence Framework Elements

The system is built on SEMAT Essence, a standard for describing software engineering practices:

| Concept | Description |
|---------|-------------|
| **Focus** | A key area of concern (e.g., "Solution", "Stakeholders") |
| **Alpha** | A critical dimension with measurable states and checklists |
| **State** | A progression checkpoint for an alpha |
| **Activity Space** | A grouping of related activities under a focus |
| **Activity** | Work performed to progress alphas and produce work products |
| **Competency** | A skill or capability with progressive levels |
| **Work Product** | An artifact with levels of detail |
| **Pattern** | A lifecycle template with sequential views targeting alpha states |
| **Narrative** | Contextualised storytelling structure for practice elements |
| **Persona** | A role archetype requiring specific competencies |

### Document Types

| Type | Description |
|------|-------------|
| **PracticeBaseline** | Foundational kernel defining core elements |
| **Practice** | Extension of a baseline, adding domain-specific elements |
| **Method** | Composition of a baseline + multiple extension practices |
| **Project** | Tracking document recording team state against a practice/method |
| **ChangeRequest** | Proposed modification to a practice element |
| **ChangeSet** | Grouped collection of change requests |

### Practice Composition

```
Method
  ├── baselinePractice (foundation)
  └── practices[] (extensions in hierarchy order)
        ├── practices[0] (nearest to baseline)
        ├── practices[1] (next layer)
        └── practices[n] (leaf/primary)

Merge Process:
  1. Start with baseline
  2. Merge practices[0] onto baseline
  3. Merge practices[1] onto accumulator
  ...
  N. Merge practices[n] onto accumulator
  = Composite Practice
```

---

## Architecture Principles

These principles (from SOUL.md) guide all specification decisions:

1. **Schema-driven development** — the JSON Schema is the source of truth; update schema before implementation
2. **Separation of concerns** — business logic independent of UI and storage
3. **Server-first data** — data transformation happens server-side; API endpoints serve derived data
4. **Storage pluggability** — file and database backends must be functionally equivalent
5. **Validation pipeline** — all data validates against JSON Schema before persistence

---

## Keeping Specifications Current

When changing behaviour, UI, APIs, or data structures:

1. Identify which specification module(s) are affected
2. Update the relevant module to reflect the change
3. If adding a new feature area, create a new module
4. If adding a new diagram type, create a new diagram specification
5. Keep `technical-decisions.md` up to date if technology choices change

Stale specifications are worse than no specifications — they mislead reimplementers.

---

**Last Updated**: 2026-08-17
**Specification Version**: 2.0
