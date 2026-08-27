# API Layer

## Purpose

The API layer provides thin controller routes that validate input, delegate to business logic, and return proper HTTP responses. No business logic lives in API routes. All routes follow a consistent pattern: parse and validate the request, call the appropriate function in the business logic layer, and format the response with proper status codes and error handling.

---

## Design Principles

1. **Thin controllers only.** API routes validate input, call business logic, and return responses. Domain logic, data transformation, and storage operations belong in the business logic layer.
2. **Consistent error handling.** All routes return errors in a uniform shape with appropriate HTTP status codes.
3. **Input normalisation.** Document bodies are normalised before persistence (except for `dashboard-config` and `project` kinds, which are stored as-is).
4. **Dual-mode validation.** Document bodies are validated in both strict mode (correctness) and relaxed mode (draft tolerance). Both results are returned so consumers can choose their threshold.
5. **Server-side caching.** Computed results (metadata, alpha lists, analysis scores, diagram data, composition results) are cached with configurable TTLs. Cache keys include the document identifier and operation type. Caches are invalidated when documents are created, updated, or deleted.

---

## Document API

### List Documents

```
GET /api/documents
```

List all documents. Optional query parameters:

| Parameter | Type | Effect |
|-----------|------|--------|
| `kind` | string | Filter by document kind |
| `details` | `1` | Enrich each entry with `libraryRootKind`, `displayName`, `virtualFileCount`, `associatedBaselineName`, and `libraryTags` |
| `withBody` | `1` | Include the full document body in each entry |

**Response:** `{ documents: DocumentMeta[] }`

### Create Document

```
POST /api/documents
```

Create a new document.

**Request:** `{ title, kind, body? }`

**Behaviour:**
1. Normalise the body (skip normalisation for `dashboard-config` and `project` kinds).
2. If the kind is `practice`, `method`, or `project`, validate the body in both strict and relaxed modes.
3. Persist the document.
4. Clear the server-side cache for practice, method, and project documents.

**Response:** `{ id, ...meta }` with status `201`.

### Get Document

```
GET /api/documents/{id}
```

Retrieve the full document including its body.

**Response:** `{ id, title, kind, body, createdAt, updatedAt }`

### Update Document

```
PUT /api/documents/{id}
```

Partial update of a document. Any subset of fields may be provided.

**Request:** `{ title?, kind?, body? }`

**Behaviour:**
1. Apply the same normalisation and validation as document creation.
2. Persist the update.
3. Invalidate the server-side cache.

**Response:** The updated document.

### Delete Document

```
DELETE /api/documents/{id}
```

Delete a document and clean up any associated assets.

**Behaviour:**
1. Delete the document from storage.
2. Delete any associated binary assets.
3. Invalidate the server-side cache.

**Response:** Status `204` (no content).

### Get Document Metadata

```
GET /api/documents/{id}/metadata
```

Retrieve enriched metadata for a document without its body. Cached.

**Response:** `{ libraryRootKind, displayName, virtualFileCount, baselines, dependencies, tags }`

### Get Document Alphas

```
GET /api/documents/{id}/alphas
```

Retrieve a simplified alpha list from a resolved practice or method. Cached.

| Parameter | Type | Effect |
|-----------|------|--------|
| `resolve` | `false` | Skip library resolution; return alphas from the raw document only |

**Response:** `{ alphas: [{ name, description, focusName, stateCount, states }], metadata }`

### Upload Assets

```
POST /api/documents/{id}/assets
```

Upload file assets as multipart form data. Assets are associated with the specified document.

**Response:** `{ assets: [{ filename, url }] }`

### List Assets

```
GET /api/documents/{id}/assets
```

List all binary assets associated with a document.

**Response:** `{ assets: [{ filename, url }] }`

### Generate Static Site

```
GET /api/documents/{id}/static-site
```

Generate and return a static site archive for the document. The static site resolves all library dependencies and produces a self-contained downloadable package.

**Response:** Binary archive (ZIP).

### Generate Work Product Template

```
GET /api/documents/{id}/work-product-template
```

Generate a markdown template for a specific work product within the document.

| Parameter | Type | Effect |
|-----------|------|--------|
| `wp` | string | The name of the work product to generate a template for |

**Response:** Markdown content.

### Export as Keleo Packages

```
POST /api/documents/export-keleo
```

Export one or more documents as `.keleo` packages.

**Request:** `{ ids: string[] }`

**Behaviour:**
- When a single document id is provided, the response is a single `.keleo` package file.
- When multiple document ids are provided, the response is a ZIP archive containing multiple `.keleo` package files.

**Response:** Binary archive.

### Resolve for Render

```
POST /api/documents/resolve-for-render
```

Resolve a document with all library dependencies, producing a fully composed result suitable for rendering.

**Request:** `{ doc }`

**Response:** `{ resolved, dependencyArtifacts, versionWarnings, schemaWarning, dependencyDiagramLayout }`

---

## Method Builder API

### Compose Method

```
POST /api/method-builder/compose
```

Batch compose a method from named references. Cached.

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baselineName` | string | yes | Name of the baseline practice |
| `practiceNames` | string[] | no | Names of extension practices to include |
| `includeMetadata` | boolean | no | Include enriched metadata for each resolved document |

**Response:**

```
{
  baseline: { libraryId, body, metadata? },
  practices: [{ libraryId, name, body, metadata? }],
  validation: { valid, errors },
  metadata: { cached, cachedAt? }
}
```

---

## Validation API

### Validate Document

```
POST /api/validate
```

Validate a document body against the schema.

**Request:** Raw JSON document body.

**Response:** `{ ok, issues, relaxedOk, relaxedIssues }`

- `ok` / `issues`: Strict validation result and any issues found.
- `relaxedOk` / `relaxedIssues`: Relaxed validation result permitting incomplete drafts.

---

## Analysis API

### Alpha Coverage Scores

```
POST /api/analysis/alpha-scores
```

Compute alpha coverage scores for a document. Cached.

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `documentId` | string | yes | Document to analyse |
| `resolveLibrary` | boolean | no | Resolve library dependencies before scoring |

**Response:** `{ scoresByFocus, metadata }`

### Activity Space Scores

```
POST /api/analysis/activity-scores
```

Compute activity space coverage scores for a document. Cached. Same request and response shape as alpha coverage scores.

---

## Diagram API

### Radar Chart Data

```
POST /api/diagrams/radar
```

Compute radar chart data for a document. Cached.

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `documentId` | string | yes | Document to analyse |
| `resolveLibrary` | boolean | no | Resolve library dependencies |
| `fixedMaxScore` | number | no | Fixed maximum for radar axes |
| `focusOrder` | string[] | no | Custom ordering of focus areas on the radar |

**Response:** `{ data: RadarDataset, metadata }`

### Sankey Flow Data

```
POST /api/diagrams/sankey
```

Compute Sankey flow diagram data for a document. Cached.

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `documentId` | string | yes | Document to analyse |
| `resolveLibrary` | boolean | no | Resolve library dependencies |

**Response:** `{ data: SankeyFlowData, statistics, metadata }`

---

## Library API

Full documentation is provided in Module 03 (Library System). The endpoints are listed here for completeness.

### Library Index

```
GET /api/library/index
```

Retrieve the library index listing all available documents with metadata.

### Library Document

```
GET /api/library/document
```

Retrieve a single document from the library by name.

### Batch Resolve

```
POST /api/library/batch-resolve
```

Resolve multiple documents from the library in a single request.

### Baseline Alphas

```
GET /api/library/baseline-alphas
```

Retrieve the alpha list for a named baseline.

### Static Site from Library

```
GET /api/library/static-site
```

Generate a static site archive from a library document.

### Practices by Tags

```
GET /api/library/practices/by-tags
```

Query practices filtered by tag criteria.

---

## Bundle API

Full documentation is provided in Module 03 (Library System). The endpoints are listed here for completeness.

### List Bundles

```
GET /api/bundles
```

List all registered bundles.

### Create Bundle

```
POST /api/bundles
```

Register a new bundle.

### Get Bundle

```
GET /api/bundles/{slug}
```

Retrieve a bundle by its slug identifier.

### Delete Bundle

```
DELETE /api/bundles/{slug}
```

Remove a bundle registration.

### Import Bundle from Inbox

```
POST /api/bundles/inbox
```

Import bundle packages from the inbox directory.

---

## Baseline API

### Narrative Types

```
GET /api/baselines/{baselineId}/narrative-types
```

Retrieve the narrative types defined by a baseline.

**Response:** `{ narrativeTypes: [{ name, narrativeElements }] }`

---

## Asset API

### Serve Asset

```
GET /api/assets/{documentId}/{filename}
```

Serve a binary asset file associated with a document.

**Behaviour:**
- Expects exactly two path segments: the document identifier and the filename.
- The MIME type is auto-detected from the file content or extension.
- Cache headers: `public, max-age=31536000, immutable`.

---

## Caching Strategy

The API layer maintains a server-side cache for computed results. The caching strategy follows these rules:

1. **Cache keys** include the document identifier and the operation type (e.g., metadata, alphas, composition, analysis, diagram).
2. **TTLs** are configurable per operation type.
3. **Cache invalidation** occurs automatically when a document is created, updated, or deleted. All cache entries associated with the affected document are cleared.
4. **Cache metadata** is included in responses where applicable (e.g., `metadata: { cached: true, cachedAt: "..." }`).

---

## Error Handling

All error responses follow a consistent shape:

- `400` -- Invalid request (missing required fields, malformed body, invalid query parameters).
- `404` -- Document or resource not found.
- `500` -- Unexpected server error.

Error responses include a descriptive message. Validation errors include the full list of issues for diagnostic use.
