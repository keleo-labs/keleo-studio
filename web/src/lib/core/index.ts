/**
 * Core utilities - validation, error formatting, path utilities, normalization.
 * Barrel export for clean imports.
 */

export { validateAgainstSchema } from "./validate";
export { validateAgainstSchemaServer } from "./validateServer";
export { formatValidationIssue, formatRefIssue } from "./errorFormatting";
export { normalizePracticeBody } from "./normalizePractice";
export { getJsonPathValue, setJsonPathValue, removeJsonPathKey, parentJsonPath, lastPathSegment, jsonPathSegments } from "./json-path-utils";
