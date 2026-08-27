# Technical Decisions

This document records the specific technology choices made for Keleo Studio's reference implementation, with the rationale behind each. Behavioural specifications in `modules/` and `diagrams/` are written technology-agnostically; this file is the single place where implementation bindings are documented.

---

## Application Framework

| Decision | Choice |
|----------|--------|
| **Runtime** | Node.js |
| **Framework** | Next.js 15 (App Router) |
| **Rendering model** | Server-side rendering with client components where interactivity is needed |

**Purpose:** Next.js provides file-system routing, server components for data-heavy pages, API routes co-located with the app, and built-in optimisation (code splitting, streaming). The App Router model aligns with the server-first data architecture (see SOUL.md) — data transformation happens on the server, and only interactive state management runs client-side.

**Design notes:** API routes serve as thin controllers; business logic lives in `lib/`. Server components are the default; `"use client"` is added only when hooks or browser APIs are needed. This keeps the client bundle small and moves heavy computation (merge algorithms, library resolution) to the server.

---

## UI Component Library

| Decision | Choice |
|----------|--------|
| **Component system** | PatternFly 6 (React) |
| **Supplementary styling** | Tailwind CSS 4 |

**Purpose:** PatternFly provides accessible, enterprise-grade UI components (cards, modals, tables, navigation, form controls) with built-in theming. Tailwind handles layout utilities and one-off styling that PatternFly does not cover.

**Design notes:** PatternFly components are used directly rather than wrapped, except where domain-specific behaviour is needed (e.g., `LibraryDocumentCard`). PatternFly CSS variables (e.g., `--pf-v6-global--primary-color--100`) are referenced for consistency with the component library's colour tokens. Tailwind is used for spacing, flex/grid layout, and responsive breakpoints — not for recreating PatternFly component styling.

---

## Styling Architecture

| Decision | Choice |
|----------|--------|
| **CSS approach** | Utility-first (Tailwind) with CSS custom properties for theming |
| **Theme system** | Two themes (light, dark) via CSS variables |

**Purpose:** CSS custom properties provide runtime theme switching without class toggling on every element. Tailwind utility classes keep styling co-located with markup, eliminating the need for CSS modules or styled-components.

**Design notes:** Theme tokens are defined as a `ThemeTokens` record covering: `bg`, `panel`, `text`, `muted`, `border`, `accent`, `bad`, `good`, `colorScheme`, and per-focus swimlane fill colours. The dark theme uses indigo-tinted backgrounds; the light theme uses neutral grays. Theme preference is persisted in a browser cookie.

---

## Data Persistence

| Decision | Choice |
|----------|--------|
| **Storage model** | Pluggable backend behind `JsonStore` interface |
| **Implementations** | File-based JSON (default), MongoDB |
| **Configuration** | `STORAGE_TYPE` environment variable |

**Purpose:** File-based storage provides zero-dependency local development. MongoDB supports multi-user deployments. The abstraction layer ensures business logic never depends on a specific backend.

**Design notes:** Both backends must be functionally equivalent — adding a feature that works only on one backend is a bug. The `JsonStore` interface covers: list, get, create, update, delete, and asset management. A separate `BundleStore` interface handles the package/bundle layer (manifest-based collections of documents). The file-based bundle store uses a directory convention: `data/bundles/<slug>/manifest.json` + `data/bundles/<slug>/documents/*.json`.

---

## Schema Validation

| Decision | Choice |
|----------|--------|
| **Schema format** | JSON Schema (draft 2020-12) |
| **Validation engine** | AJV (Another JSON Validator) |
| **Dual-mode validation** | Strict (all rules) and relaxed (allows draft/partial documents) |

**Purpose:** JSON Schema is the source of truth for the domain model. AJV provides fast, spec-compliant validation with detailed error paths. Dual-mode validation allows users to work with incomplete documents during authoring while still catching structural errors.

**Design notes:** The schema uses `if/then/else` chains for root type discrimination (ChangeSet → ChangeRequest → Project → Method → Practice → PracticeBaseline). Schema version is tracked in the `$comment` field and in document `schemaVersion` fields. Relaxed mode permits missing required fields so draft documents can be saved.

---

## Code Editing

| Decision | Choice |
|----------|--------|
| **Editor engine** | CodeMirror (via `@uiw/react-codemirror`) |
| **Languages** | JSON (with linting), YAML (with linting) |

**Purpose:** CodeMirror provides a mature, accessible code editor with syntax highlighting, error markers, and extensibility. The React wrapper simplifies integration.

**Design notes:** The practice author and project manager pages support three editing modes: WYSIWYG (structured form), YAML (text), and JSON (text). Switching between modes commits the current draft before generating the new mode's representation. YAML/JSON editors include validation feedback via `POST /api/validate`.

---

## Visualisations

| Decision | Choice |
|----------|--------|
| **SVG diagrams** | Custom implementations (no charting library) |
| **Sankey diagrams** | D3.js (`d3-sankey`) for layout, custom SVG rendering |
| **Radar charts** | Custom SVG with polar coordinate geometry |
| **All other diagrams** | Custom layout algorithms with SVG string generation |

**Purpose:** The domain's diagram types (alpha hierarchy trees, pattern matrices, dependency graphs, progressive flows) have no off-the-shelf equivalents. Custom implementations allow precise control over layout, interaction, and static export.

**Design notes:** Diagram logic is split into data/layout modules (`lib/diagrams/<type>/`) and rendering (React components or SVG string generators). This separation enables the same layout algorithm to serve both the interactive navigator and the static site export. Layout modules export pure functions with no DOM or framework dependencies. D3 is used only for the Sankey diagram's node positioning algorithm — all other layout is hand-written.

---

## Icons

| Decision | Choice |
|----------|--------|
| **Icon set** | Font Awesome 6.5 (loaded via CDN) |
| **Custom icons** | Asset system supporting font characters, images, data URIs |

**Purpose:** Font Awesome provides a comprehensive icon set for navigation and UI affordances. The asset system allows practices to define custom icons using any font family or image format.

**Design notes:** Font-character icons are embedded in SVG diagrams via `<foreignObject>` elements with inline `@font-face` declarations. The CDN URL is collected at render time so static exports include the correct font resources.

---

## Package Format

| Decision | Choice |
|----------|--------|
| **Format** | `.keleo` — a ZIP archive containing `manifest.json` + `documents/*.json` |
| **Manifest version** | `1.2.0` |

**Purpose:** ZIP-based packaging allows practices, methods, and their transitive dependencies to be distributed as a single portable file. The manifest captures package identity, document inventory, and dependency declarations.

**Design notes:** Methods are externalised during packaging — embedded baselines and practices are extracted into separate documents with name-based references, making each document independently addressable. An inbox directory (`data/inbox/`) supports drop-in import of `.keleo` and `.json` files.

---

## Internationalisation

| Decision | Choice |
|----------|--------|
| **Approach** | Language pack system with two built-in packs |
| **Packs** | `"default"` (Essence/OMG terminology) and `"alt"` (simplified terminology) |

**Purpose:** The domain uses specialised vocabulary (Alpha, State, Activity Space, Competency) that can be a barrier for non-specialists. The alt pack substitutes accessible equivalents (Concept, Stage, Work Area, Capability) without changing application behaviour.

**Design notes:** `LanguagePack` is a record of ~190 string fields covering every user-facing label. The active pack is selected on the preferences page and persisted as a cookie. Components access labels via the `useLanguagePack()` hook. This is a label-replacement system, not a full i18n framework — it does not handle pluralisation, date formatting, or RTL layout.

---

## PDF and Static Export

| Decision | Choice |
|----------|--------|
| **Static site format** | Self-contained HTML + CSS ZIP archive |
| **PDF generation** | Server-side HTML-to-PDF (planned reimplementation) |

**Purpose:** Static site export produces a browseable, offline-capable HTML site from any practice or method document, including SVG diagrams. PDF generation (currently under reimplementation) provides a printable report format.

**Design notes:** The static site export generates SVG diagram strings server-side using the same layout algorithms as the interactive navigator, ensuring visual consistency. HTML pages use inline styles and embedded fonts — no external dependencies.

---

## Version Control and Dependency Management

| Decision | Choice |
|----------|--------|
| **Document versioning** | Semantic versioning (semver) on practice/method/baseline documents |
| **Dependency constraints** | npm-style semver ranges in `dependencyVersions` |
| **Schema versioning** | `schemaVersion` field in documents, `$comment` in the JSON Schema |

**Purpose:** Semver enables consumers to declare compatible version ranges for their dependencies. Schema versioning tracks structural evolution of the data model independently of document content.

**Design notes:** The `DocumentVersionConstraint` type pairs a `documentName` with a `versionRange` (e.g., `">=1.0.0 <2.0.0"`). During library resolution, `collectDependencyVersionWarnings` checks constraints against resolved versions and produces `"mismatch"` or `"orphan"` warnings.

---

**Last Updated**: 2026-08-17
