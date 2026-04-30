import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ValidationIssue } from "@/lib/types";
import { relaxCardinalityInSchema } from "@/lib/schemaRelax";

function mapErrors(errors: ErrorObject[] | null | undefined): ValidationIssue[] {
  return (errors ?? []).map((e) => ({
    path: e.instancePath || e.schemaPath || "",
    message: e.message ?? "Invalid value",
  }));
}

export async function validateAgainstSchema(data: unknown): Promise<{
  /** Strict schema (language.schema.json) including minItems / cardinality. */
  ok: boolean;
  issues: ValidationIssue[];
  /** Same document against a clone with minItems/minProperties removed (render / PDF gate). */
  relaxedOk: boolean;
  relaxedIssues: ValidationIssue[];
}> {
  const schemaRes = await fetch("/language.schema.json", { cache: "no-store" });
  if (!schemaRes.ok) {
    const err = [{ path: "", message: `Failed to load schema: ${schemaRes.status}` }];
    return { ok: false, issues: err, relaxedOk: false, relaxedIssues: err };
  }
  const schema = await schemaRes.json();
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
}

