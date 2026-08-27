# Storage Layer

## Purpose

Pluggable document persistence with two independent subsystems: flat document store and bundle store.

---

## Document Store Interface

### Data Types

```
JsonDocumentKind
  "practice" | "method" | "upload" | "dashboard-config" | "project"

JsonDocumentMeta
  id        : string
  title     : string
  kind      : JsonDocumentKind
  createdAt : string (ISO date)
  updatedAt : string (ISO date)

JsonDocument
  (all fields from JsonDocumentMeta)
  body      : object

JsonDocumentCreateInput
  title     : string
  kind      : JsonDocumentKind
  body      : object

JsonDocumentUpdateInput
  title     : string (optional)
  kind      : JsonDocumentKind (optional)
  body      : object (optional)
```

### Operations

```
FUNCTION list(filter?):
  RETURN JsonDocument[] -- optionally filtered by kind, sorted by updatedAt desc

FUNCTION get(id):
  RETURN JsonDocument -- or not found error

FUNCTION create(input: JsonDocumentCreateInput):
  RETURN JsonDocument -- with generated id, createdAt, updatedAt

FUNCTION update(id, patch: JsonDocumentUpdateInput):
  RETURN JsonDocument -- with merged fields and bumped updatedAt

FUNCTION delete(id):
  RETURN void -- removes the document
```

---

## File-based Document Store

- **Data directory:** configurable via environment, default `<cwd>/data/documents/`
- **File naming:** `{uuid}.json` -- IDs alphanumeric plus `_` and `-`; path traversal prevented

### Behaviours

```
FUNCTION list(filter?):
  Read all .json files from the data directory
  Parse each file as a JsonDocument
  IF filter.kind is set THEN
    Retain only documents whose kind matches
  Sort by updatedAt descending
  RETURN filtered, sorted documents

FUNCTION create(input):
  Generate a new UUID as the document id
  Set createdAt and updatedAt to now
  Write JSON to {id}.json with 2-space indent
  RETURN the new document

FUNCTION update(id, patch):
  Read existing document from {id}.json
  Merge patch fields into existing document
  Set updatedAt to now
  Write updated JSON back to {id}.json
  RETURN the updated document

FUNCTION delete(id):
  Remove {id}.json from the data directory
```

---

## MongoDB Document Store

- **Collection:** configurable, default `json_documents`
- **Indexes:** unique index on `{ id: 1 }`
- Same CRUD semantics as the file-based store, implemented using MongoDB operations

---

## Bundle Store Interface

### Data Types

```
BundleManifestInfo
  slug          : string
  name          : string
  version       : string
  description   : string
  documentCount : number

BundleDocumentRef
  bundleSlug          : string
  documentPath        : string
  documentName        : string
  documentType        : string
  documentVersion     : string
  isWorkspaceOverride : boolean

BundleDocumentMeta
  (all fields from BundleDocumentRef)
  description            : string (optional)
  tags                   : object (optional)
  keywords               : string[] (optional)
  elementCount           : number (optional)
  associatedBaselineName : string (optional)
  createdAt              : string (optional)
  updatedAt              : string (optional)

BundleDocumentWithBody
  (all fields from BundleDocumentRef)
  body : object
```

### Reserved Slugs

- **Workspace bundle slug:** `_workspace` -- reserved; cannot be deleted or imported over

### Operations

```
FUNCTION listBundles():
  RETURN BundleManifestInfo[] -- all installed bundles

FUNCTION getBundleManifest(slug):
  RETURN manifest for the given bundle

FUNCTION getDocument(bundleSlug, documentPath):
  RETURN BundleDocumentWithBody

FUNCTION importBundle(zipData):
  Unpack .keleo archive, validate manifest, install bundle
  RETURN void

FUNCTION removeBundle(slug):
  Remove an installed bundle (workspace bundle cannot be removed)
  RETURN void

FUNCTION saveWorkspaceDocument(name, type, body):
  Save a document to the _workspace bundle
  RETURN void

FUNCTION deleteWorkspaceDocument(path):
  Remove a document from the _workspace bundle
  RETURN void

FUNCTION listAllDocuments():
  RETURN BundleDocumentRef[] -- all documents across all bundles

FUNCTION listAllDocumentMeta():
  RETURN BundleDocumentMeta[] -- all documents with pre-computed metadata

FUNCTION processInbox():
  Scan inbox directory, import bundles and workspace documents
  RETURN void
```

---

## File-based Bundle Store

- **Bundles directory:** configurable, default `<cwd>/data/bundles/`
- **Structure:** `data/bundles/<slug>/manifest.json` + `data/bundles/<slug>/documents/<doc>.json`

### Behaviours

```
FUNCTION importBundle(zipData):
  Unzip .keleo archive
  Validate that archive contains a manifest.json
  Derive slug from slugified package name
  Write manifest and document files to data/bundles/<slug>/
  Compute and persist metadata per document into the manifest

FUNCTION saveWorkspaceDocument(name, type, body):
  Write document to _workspace bundle directory
  Update _workspace manifest with pre-computed metadata for the document

FUNCTION listAllDocumentMeta():
  Read manifests from all bundle directories in parallel
  IF a manifest contains pre-computed metadata for its documents THEN
    Use the pre-computed metadata directly
  ELSE
    Read document bodies and compute metadata
    Backfill the manifest with computed metadata (lazy caching)
  RETURN combined metadata from all bundles

FUNCTION processInbox():
  Scan data/inbox/ for .keleo and .json files
  FOR EACH .keleo file:
    Import as a bundle via importBundle
  FOR EACH .json file:
    Save to workspace via saveWorkspaceDocument
  Move all processed files to inbox/processed/
```

---

## Asset Store

Binary file storage keyed by (documentId, filename).

### Configuration

- **Base directory:** `<data>/assets/`
- **Path segments sanitised:** only alphanumeric, dot, underscore, hyphen allowed; leading dots rejected

### Operations

```
FUNCTION save(documentId, filename, data):
  Write binary data to <base>/<documentId>/<filename>

FUNCTION get(documentId, filename):
  Read binary data from <base>/<documentId>/<filename>
  RETURN file data with auto-detected MIME type

FUNCTION list(documentId):
  RETURN filenames[] for the given document

FUNCTION deleteDocumentAssets(documentId):
  Remove the entire <base>/<documentId>/ directory
```

### HTTP Access

- Served via `GET /api/assets/{documentId}/{filename}`
- Response includes auto-detected MIME type and immutable cache headers

---

## Factory

- **Singleton pattern** per driver
- Reads `STORAGE_TYPE` environment variable (`file` or `mongo`)
- Returns configured store implementations for document store, bundle store, and asset store

---

## Integration Points

### API Routes

- All API routes use the factory to obtain store instances
- Routes are thin controllers: validate input, delegate to store, return response

### Business Logic

- Business logic never accesses storage directly -- always through the store interfaces
- Both file and MongoDB backends must be functionally equivalent
- The active backend is transparent to consumers

### Bundle Library

- The library module reads from the bundle store to populate the library browser and navigator views
- Bundle import and workspace save operations update the bundle store, which the library reads on next access

### Dashboard

- The dashboard configuration is persisted as a regular document (kind `dashboard-config`) through the document store
