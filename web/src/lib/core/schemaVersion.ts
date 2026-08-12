export const TOOL_SCHEMA_VERSION = "1.0.0";

type SchemaCompatResult = {
  compatible: boolean;
  warning?: string;
};

function parseMajorMinor(version: string): { major: number; minor: number } | null {
  const m = /^(\d+)\.(\d+)(?:\.\d+)?$/.exec(version.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]) };
}

export function checkSchemaCompatibility(docSchemaVersion: string | undefined): SchemaCompatResult {
  if (!docSchemaVersion) return { compatible: true };

  const doc = parseMajorMinor(docSchemaVersion);
  const tool = parseMajorMinor(TOOL_SCHEMA_VERSION);
  if (!doc || !tool) return { compatible: true };

  if (doc.major > tool.major) {
    return {
      compatible: false,
      warning: `This document targets schema version ${docSchemaVersion} but this tool supports ${TOOL_SCHEMA_VERSION}. Major version mismatch — the document may not be compatible.`,
    };
  }

  if (doc.major === tool.major && doc.minor > tool.minor) {
    return {
      compatible: true,
      warning: `This document targets schema version ${docSchemaVersion} but this tool supports ${TOOL_SCHEMA_VERSION}. Some features may not be fully understood.`,
    };
  }

  return { compatible: true };
}
