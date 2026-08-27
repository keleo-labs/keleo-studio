# Static Site Export

## Purpose

Generates a complete, self-contained static site from a practice or method document. The output is a ZIP archive containing Markdown pages, SVG diagrams, and site configuration that can be served as a browseable, offline-capable website.

## Output Format

The export produces a directory structure compatible with MkDocs Material:

```
<practiceName>/
  mkdocs.yml
  stylesheets/custom.css
  docs/
    index.md (introduction)
    references.md
    overview-concerns.md (SVG diagram)
    overview-activities.md (SVG diagram)
    patterns/<pattern>.md
    concerns/<focus>/<alpha>.md
    activities/<focus>/<activitySpace>.md
    activities/<focus>/<activitySpace>/<activity>.md
    deliverables/<workProduct>.md
    templates/<workProduct>.md
    personas/<personaGroup>.md
    personas/<persona>.md
    competencies/<competency>.md
    practices/<practice>.md
```

---

## Generation Pipeline

```
FUNCTION generateStaticSite(doc, originalDoc?, libraryIndex?):
  1. Build ReportRenderableDoc (resolve baseline, activities, overlays)
  2. Build display alias lookup from practice element aliases
  3. Optionally generate dependency diagram SVG
  4. Collect practice pages from: inline practices, named practice references, dependencies, baseline
  5. Generate pages for all element types
  6. Generate mkdocs.yml configuration
  7. Generate custom CSS
  8. Prefix all file paths with slugified practice name
  RETURN { files: Map<path, content>, practiceName }
```

---

## Slug Generation

```
FUNCTION slugify(name):
  Lowercase, replace non-alphanumeric with hyphens, trim leading/trailing hyphens
```

---

## Page Types

16 page types:

| Page Type | Output Path | Source Element |
|-----------|-------------|----------------|
| introduction | `docs/index.md` | Root document |
| overview-concerns | `docs/overview-concerns.md` | Generated SVG diagram |
| overview-activities | `docs/overview-activities.md` | Generated SVG diagram |
| references | `docs/references.md` | Root document references |
| pattern | `docs/patterns/<pattern>.md` | Pattern element |
| focus-concerns | `docs/concerns/<focus>/` | Focus group header (alpha-centric) |
| alpha | `docs/concerns/<focus>/<alpha>.md` | Alpha element |
| focus-activities | `docs/activities/<focus>/` | Focus group header (activity-centric) |
| activitySpace | `docs/activities/<focus>/<activitySpace>.md` | Activity space element |
| activity | `docs/activities/<focus>/<activitySpace>/<activity>.md` | Activity element |
| workProduct | `docs/deliverables/<workProduct>.md` | Work product element |
| workProductTemplate | `docs/templates/<workProduct>.md` | Work product (template mode) |
| personaGroup | `docs/personas/<personaGroup>.md` | Persona group element |
| persona | `docs/personas/<persona>.md` | Persona element |
| competency | `docs/competencies/<competency>.md` | Competency element |
| practice | `docs/practices/<practice>.md` | Practice or dependency |

---

## Cross-Page Linking

```
FUNCTION relativeLinkFrom(fromPath, toPath):
  Compute relative path from source page to target page
  Used for all cross-references between element pages
```

All internal links between generated pages use relative paths so the site remains functional when served from any base URL or opened from the local filesystem.

---

## Page Content

Each page is a Markdown document with optional front matter. Key pages:

### Introduction

Version metadata, description, root narratives, dependency diagram (embedded SVG), acknowledgements, keywords, dates, tags.

### Alpha

Icon, description, narratives, common examples (alpha instances), reference examples, related concerns (relatesTo), contributing sub-alphas, parent alpha, supporting alphas, variants. States with checklists, "progressed by" activities, "evidenced by" work products.

### Activity

Contributes-to, works-on, involves (persona groups), competencies, prerequisites, verification tests, examples.

### Work Product

Icon, description, partOf/mapsTo links, child work products, variants, template download, narratives, examples. Levels of detail with checklists, "developed by" activities.

### Pattern

Matrix table (views x alphas), instance names, pattern view details with narrative contexts.

### Work Product Template

Rendered as a fillable markdown template with:

- Guidance blocks (blockquotes)
- Sections driven by narratives or activities
- Quality checklist with task-list items (`- [ ]`)
- Revision log

---

## SVG Diagram Embedding

Three SVG types generated as inline SVG strings and embedded in markdown pages:

| Diagram | Embedded In | Content |
|---------|-------------|---------|
| Concerns overview | `overview-concerns.md` | Alpha hierarchy trees grouped by focus |
| Activities overview | `overview-activities.md` | Activity space trees grouped by focus |
| Dependency diagram | `index.md` | Practice dependency graph |

See diagram specifications for layout details.

---

## Font Icon Embedding

For practices with custom font-character icons:

- CDN URLs collected from assets (Font Awesome, Material Icons, Material Symbols)
- Icons rendered as foreignObject elements in SVG with inline @font-face declarations
- CDN URLs included in site extra_css configuration

---

## Site Configuration

The generated `mkdocs.yml` includes:

- Material theme configuration
- TOC and task list extensions
- Extra CSS (custom stylesheet + font CDN URLs)
- Full navigation tree organised by: overview, patterns, concerns (by focus), activities (by focus), work products, templates, personas, competencies, references

---

## API

```
GET /api/documents/{id}/static-site
  Load document, normalise, resolve library, generate site,
  compress to ZIP (compression level 6),
  return as application/zip with content-disposition filename.

GET /api/library/static-site?bundle=<slug>&path=<path>
  Same pipeline for bundle-sourced documents.
```
