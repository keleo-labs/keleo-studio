# Validation System

## Purpose

Dual-mode schema validation (strict and relaxed) plus reference integrity checking.

---

## Schema Validation

- Uses JSON Schema (draft 2020-12) as the canonical validation schema
- Two passes per validation:
  1. **Strict:** full schema rules including minItems, cardinality constraints
  2. **Relaxed:** schema with minItems, minProperties, and restrictive property rules removed

### Result Shape

```
ValidationResult
  ok             : boolean       -- strict pass succeeded
  issues         : Issue[]       -- strict pass errors
  relaxedOk      : boolean       -- relaxed pass succeeded
  relaxedIssues  : Issue[]       -- relaxed pass errors

Issue
  path           : string        -- JSON pointer to the failing location
  message        : string        -- human-readable error description
```

- The relaxed pass gates rendering and export (tolerates incomplete drafts)
- The strict pass represents full compliance with the schema

---

## Schema Relaxation Algorithm

```
FUNCTION relaxCardinalityInSchema(schema):
  Clone schema deeply
  Recursively walk all nodes:
    Remove minItems
    Remove minProperties
    IF unevaluatedProperties is false THEN remove it
    IF additionalProperties is false THEN remove it
  RETURN relaxed schema
```

---

## Enhanced Error Messages

For specific error types, include contextual information beyond the default validator output:

| Error Type | Enhancement |
|---|---|
| unevaluatedProperties / additionalProperties | Include the actual property name that was unexpected |
| type errors | Include the expected type |
| required errors | Include the name of the missing property |

---

## Reference Validation

After schema validation passes, check reference integrity across the document's elements. Each check verifies that a named reference points to an element that actually exists.

### Reference Checks

| Reference Type | Rule |
|---|---|
| Focus references | Every element's `focusName` must exist in `focuses[]` |
| Alpha references | `contributesTo` and `mapsTo` must reference existing alphas |
| State references | `contributesToState` must exist in the target alpha's `states[]` |
| Activity references | `activitySpaceName` must exist in the document's activity spaces |
| Competency references | `competencyName` and `competencyLevelName` must exist |
| Work product references | `workProductName` and `levelOfDetailName` must exist |
| Pattern references | `alphaNames` and `stateNames` in pattern view `alphaStates` must exist |
| Persona references | `personaNames` in persona groups must exist |

### Result Shape

```
RefIssue
  kind           : "missing"
  referenceType  : string        -- which reference category failed
  path           : string        -- location of the broken reference
  message        : string        -- human-readable description
```

---

## Validation API

```
POST /api/validate
  Request body:  raw document JSON
  Response body: { ok, issues, relaxedOk, relaxedIssues }
```

- Client-side validation fetches the schema via HTTP
- Server-side validation reads the schema from the filesystem

---

## Integration Points

### Practice Author

- Runs validation after every document change
- Displays strict issues as warnings and relaxed issues as errors
- Allows saving drafts that pass relaxed validation

### Method Builder

- Validates composed results after practice merging
- Reports validation issues on the composite output

### Document Persistence

- Document creation and update operations validate before persistence
- Relaxed mode allows saving incomplete drafts

### Import Pipeline

- Incoming documents (via bundle import or inbox processing) are validated on ingestion
- Invalid documents are flagged but may still be stored depending on the import path
