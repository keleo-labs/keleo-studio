import fs from "node:fs";
import path from "node:path";
import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ValidationIssue } from "@/lib/types";
import { relaxCardinalityInSchema } from "@/lib/analysis/schemaRelax";

/**
 * Maps AJV ErrorObject array to ValidationIssue array with enhanced messages.
 */
function mapErrors(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  return (errors ?? []).map((e) => {
    let message = e.message ?? "Invalid value";
    const path = e.instancePath || e.schemaPath || "";

    // For unevaluatedProperties errors, include the actual property name
    if (e.keyword === "unevaluatedProperties" && e.params && "unevaluatedProperty" in e.params) {
      const prop = e.params.unevaluatedProperty;
      message = `unexpected property '${prop}' - this property is not allowed in the schema`;
    }
    // For additionalProperties errors
    else if (e.keyword === "additionalProperties" && e.params && "additionalProperty" in e.params) {
      const prop = e.params.additionalProperty;
      message = `unexpected property '${prop}' - this property is not defined in the schema`;
    }
    // For type errors, include expected type
    else if (e.keyword === "type" && e.params && "type" in e.params) {
      const expected = e.params.type;
      message = `must be ${expected} (currently ${typeof e.data})`;
    }
    // For required errors, include missing property
    else if (e.keyword === "required" && e.params && "missingProperty" in e.params) {
      const prop = e.params.missingProperty;
      message = `missing required property '${prop}'`;
    }

    return { path, message };
  });
}

/**
 * Server-side schema validation against language.schema.json.
 * Reads schema from filesystem (unlike the client-side validateAgainstSchema that uses fetch).
 *
 * @param data - The practice/method document to validate
 * @returns Validation result with strict and relaxed schema checks
 */
export function validateAgainstSchemaServer(data: unknown): {
  /** Strict schema (language.schema.json) including minItems / cardinality. */
  ok: boolean;
  issues: ValidationIssue[];
  /** Same document against a clone with minItems/minProperties removed (render / PDF gate). */
  relaxedOk: boolean;
  relaxedIssues: ValidationIssue[];
} {
  try {
    const schemaPath = path.join(process.cwd(), "public", "language.schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

    // Two Ajv instances: strict and relaxed clones share the same root `$id`; a single
    // Ajv registry would throw "schema with key or id ... already exists" on the second compile.
    const ajvStrict = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajvStrict);
    const validateStrict = ajvStrict.compile(schema);
    const strictOk = validateStrict(data);
    const strictIssues = mapErrors(validateStrict.errors as ErrorObject[] | null | undefined);

    const relaxedSchema = relaxCardinalityInSchema(schema);
    const ajvRelaxed = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajvRelaxed);
    const validateRelaxed = ajvRelaxed.compile(relaxedSchema);
    const relaxedOk = validateRelaxed(data);
    const relaxedIssues = mapErrors(validateRelaxed.errors as ErrorObject[] | null | undefined);

    return {
      ok: !!strictOk,
      issues: strictIssues,
      relaxedOk: !!relaxedOk,
      relaxedIssues,
    };
  } catch (error) {
    const err = [
      {
        path: "",
        message: error instanceof Error ? `Schema validation error: ${error.message}` : "Failed to validate schema",
      },
    ];
    return { ok: false, issues: err, relaxedOk: false, relaxedIssues: err };
  }
}
