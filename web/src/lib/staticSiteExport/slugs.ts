export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ElementType =
  | "introduction"
  | "overview-concerns"
  | "overview-activities"
  | "references"
  | "pattern"
  | "focus-concerns"
  | "focus-activities"
  | "alpha"
  | "activitySpace"
  | "activity"
  | "workProduct"
  | "personaGroup"
  | "persona"
  | "competency"
  | "practice";

export function elementPath(
  type: ElementType,
  name?: string,
  focusName?: string,
  parentName?: string,
): string {
  const s = name ? slugify(name) : "";
  const fs = focusName ? slugify(focusName) : "";
  const ps = parentName ? slugify(parentName) : "";

  switch (type) {
    case "introduction":
      return "docs/index.md";
    case "overview-concerns":
      return "docs/concerns/overview.md";
    case "overview-activities":
      return "docs/activities/overview.md";
    case "references":
      return "docs/references.md";
    case "pattern":
      return `docs/patterns/${s}.md`;
    case "focus-concerns":
      return `docs/concerns/${fs}/index.md`;
    case "focus-activities":
      return `docs/activities/${fs}/index.md`;
    case "alpha":
      return `docs/concerns/${fs}/${s}.md`;
    case "activitySpace":
      return `docs/activities/${fs}/${s}/index.md`;
    case "activity":
      return `docs/activities/${fs}/${ps}/${s}.md`;
    case "workProduct":
      return `docs/work-products/${s}.md`;
    case "personaGroup":
      return `docs/personas/${s}/index.md`;
    case "persona":
      return `docs/personas/${ps}/${s}.md`;
    case "competency":
      return `docs/competencies/${s}.md`;
    case "practice":
      return `docs/practices/${s}.md`;
  }
}

export function relativeLinkFrom(fromPath: string, toPath: string): string {
  const fromParts = fromPath.split("/").slice(0, -1);
  const toParts = toPath.split("/");

  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }

  const ups = fromParts.length - common;
  const remaining = toParts.slice(common);

  if (ups === 0 && remaining.length === 0) return ".";
  const upSegments = Array(ups).fill("..");
  const result = [...upSegments, ...remaining].join("/");
  return result || ".";
}

export function mdLink(label: string, fromPath: string, toPath: string): string {
  return `[${label}](${relativeLinkFrom(fromPath, toPath)})`;
}
