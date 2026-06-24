/**
 * Deep-clone JSON Schema and drop array/object cardinality floors so renderers can
 * tolerate incomplete practice data while still running strict validation elsewhere.
 */
export function relaxCardinalityInSchema(schema: unknown): object {
  const clone = JSON.parse(JSON.stringify(schema)) as object;
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const x of node) walk(x);
      return;
    }
    const o = node as Record<string, unknown>;
    if ("minItems" in o) delete o.minItems;
    if ("minProperties" in o) delete o.minProperties;
    for (const k of Object.keys(o)) walk(o[k]);
  };
  walk(clone);
  return clone;
}
