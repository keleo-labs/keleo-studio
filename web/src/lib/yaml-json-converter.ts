import * as yaml from 'js-yaml';

export type YamlToJsonResult =
  | { ok: true; json: unknown }
  | { ok: false; error: string };

export type JsonToYamlResult =
  | { ok: true; yaml: string }
  | { ok: false; error: string };

/**
 * Convert YAML string to JSON object
 */
export function yamlToJson(yamlString: string): YamlToJsonResult {
  try {
    const parsed = yaml.load(yamlString, {
      // Use strict schema to prevent arbitrary code execution
      schema: yaml.JSON_SCHEMA,
      // Parse with explicit error reporting
      json: true,
    });

    return { ok: true, json: parsed };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: String(error) };
  }
}

/**
 * Convert JSON object to YAML string
 */
export function jsonToYaml(json: unknown): JsonToYamlResult {
  try {
    const yamlString = yaml.dump(json, {
      // Indent with 2 spaces
      indent: 2,
      // Don't use flow (inline) style
      flowLevel: -1,
      // Sort keys for consistency
      sortKeys: false,
      // Line width for wrapping
      lineWidth: 120,
      // Don't use aliases/anchors for repeated objects
      noRefs: true,
      // Don't include YAML document markers (---)
      noCompatMode: false,
    });

    return { ok: true, yaml: yamlString };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: String(error) };
  }
}

/**
 * Validate YAML syntax without converting to JSON
 */
export function validateYamlSyntax(yamlString: string): { ok: boolean; error?: string } {
  try {
    yaml.load(yamlString, { schema: yaml.JSON_SCHEMA });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: String(error) };
  }
}
