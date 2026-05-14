import type { ValidationIssue, RefIssue } from "./types";

/**
 * Converts a JSON path and validation message into a human-readable error message.
 *
 * Examples:
 * - "/activities/0/name" -> "Activity #1"
 * - "/alphas/2/states/1/name" -> "Alpha #3, State #2"
 * - "/activitySpaces/0/activities/3" -> "Activity Space #1, Activity #4"
 */
function parseJsonPath(path: string): { humanPath: string; elementType: string; elementIndex?: number } {
  if (!path || path === "/") {
    return { humanPath: "Document root", elementType: "document" };
  }

  const segments = path.split("/").filter(Boolean);
  const parts: string[] = [];
  let elementType = "unknown";
  let elementIndex: number | undefined;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const nextSegment = i + 1 < segments.length ? segments[i + 1] : null;

    // If this is a number, it's an array index
    if (/^\d+$/.test(segment)) {
      const index = parseInt(segment, 10) + 1; // Convert to 1-based
      const prevSegment = i > 0 ? segments[i - 1] : "";

      switch (prevSegment) {
        case "activities":
          parts.push(`Activity #${index}`);
          elementType = "activity";
          elementIndex = index - 1;
          break;
        case "alphas":
          parts.push(`Alpha #${index}`);
          elementType = "alpha";
          elementIndex = index - 1;
          break;
        case "activitySpaces":
          parts.push(`Activity Space #${index}`);
          elementType = "activitySpace";
          elementIndex = index - 1;
          break;
        case "focuses":
          parts.push(`Focus #${index}`);
          elementType = "focus";
          elementIndex = index - 1;
          break;
        case "competencies":
          parts.push(`Competency #${index}`);
          elementType = "competency";
          elementIndex = index - 1;
          break;
        case "states":
          parts.push(`State #${index}`);
          break;
        case "checklist":
          parts.push(`Checklist item #${index}`);
          break;
        case "narratives":
          parts.push(`Narrative #${index}`);
          break;
        case "personaGroups":
          parts.push(`Persona Group #${index}`);
          break;
        default:
          parts.push(`Item #${index}`);
      }
    } else if (segment === "name") {
      parts.push("name");
    } else if (segment === "description") {
      parts.push("description");
    } else if (!nextSegment || !/^\d+$/.test(nextSegment)) {
      // Only add non-array segments that aren't followed by an index
      const readable = segment
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      parts.push(readable);
    }
  }

  return {
    humanPath: parts.join(" → ") || "Unknown location",
    elementType,
    elementIndex,
  };
}

/**
 * Formats a validation issue into a human-readable error message.
 */
export function formatValidationIssue(issue: ValidationIssue, doc?: Record<string, unknown>): {
  summary: string;
  detail: string;
  severity: "error" | "warning";
} {
  const { humanPath, elementType, elementIndex } = parseJsonPath(issue.path);

  // Try to extract the element's name from the document for better context
  let elementName: string | null = null;
  if (doc && elementIndex !== undefined && elementType !== "unknown") {
    try {
      const segments = issue.path.split("/").filter(Boolean);
      let current: any = doc;

      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (current && typeof current === "object") {
          current = current[segment];
        }
      }

      if (current && typeof current === "object" && "name" in current) {
        elementName = String(current.name);
      }
    } catch (e) {
      // Ignore errors in name extraction
    }
  }

  // Format the message to be more human-readable
  let message = issue.message;

  // Common validation message improvements
  if (message.includes("must be string")) {
    message = "is required and must be a text value";
  } else if (message.includes("must be array")) {
    message = "must be a list";
  } else if (message.includes("must have required property")) {
    const match = message.match(/must have required property '([^']+)'/);
    if (match) {
      message = `is missing required field '${match[1]}'`;
    }
  } else if (message.includes("must match pattern")) {
    message = "has an invalid format";
  } else if (message.includes("must NOT have fewer than")) {
    const match = message.match(/must NOT have fewer than (\d+) items/);
    if (match) {
      message = `must have at least ${match[1]} item${parseInt(match[1]) > 1 ? "s" : ""}`;
    }
  }

  const nameContext = elementName ? ` "${elementName}"` : "";
  const summary = elementName
    ? `${humanPath}${nameContext}: ${message}`
    : `${humanPath}: ${message}`;

  return {
    summary,
    detail: `At ${issue.path}`,
    severity: "error",
  };
}

/**
 * Formats a reference issue into a human-readable error message.
 */
export function formatRefIssue(issue: RefIssue): {
  summary: string;
  detail: string;
  severity: "error" | "warning";
} {
  const typeLabel = issue.type.replace(/([A-Z])/g, " $1").trim();

  // Parse the context to extract element name and field
  let contextElement = "";
  let contextField = "";

  if (issue.context) {
    const match = issue.context.match(/^(\w+):([^(]+)(?:\(([^)]+)\))?$/);
    if (match) {
      const [, elementType, elementName, field] = match;
      contextElement = `${elementType} "${elementName.trim()}"`;
      contextField = field ? ` (${field})` : "";
    } else {
      contextElement = issue.context;
    }
  }

  let summary: string;
  if (contextElement) {
    summary = `${contextElement}${contextField} references a missing ${typeLabel}: "${issue.ref}"`;
  } else {
    summary = `Missing ${typeLabel}: "${issue.ref}"`;
  }

  const detail = issue.context
    ? `The referenced ${typeLabel.toLowerCase()} "${issue.ref}" does not exist in this practice`
    : `"${issue.ref}" is not defined`;

  return {
    summary,
    detail,
    severity: "warning",
  };
}
