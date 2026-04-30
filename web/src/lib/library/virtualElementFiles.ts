import {
  asBaselineDocument,
  baselineWithPracticeActivities,
  enrichBaselineWithReferencedWrappers,
  isPracticeActivityNode,
  isSynthesizedPracticeElement,
} from "@/lib/ir";

export type VirtualFileRow = {
  id: string;
  depth: number;
  path: string;
  ext: string;
  label: string;
};

function push(
  out: VirtualFileRow[],
  depth: number,
  path: string,
  ext: string,
  label: string,
  pathPrefix: string,
) {
  const fullPath = pathPrefix ? `${pathPrefix}/${path}` : path;
  out.push({ id: `${fullPath}::${ext}`, depth, path: fullPath, ext, label });
}

/**
 * Lists nested "files" for a file-browser view: each practice-related construct gets a distinct pseudo-extension.
 */
export function listVirtualElementFiles(
  body: unknown,
  options?: { pathPrefix?: string; depthBase?: number },
): VirtualFileRow[] {
  const pathPrefix = options?.pathPrefix?.replace(/\/+$/, "") ?? "";
  const depthBase = options?.depthBase ?? 0;
  const baseline = asBaselineDocument(body);
  if (!baseline) return [];

  const doc = body && typeof body === "object" ? (body as Record<string, any>) : null;
  const merged =
    doc != null
      ? enrichBaselineWithReferencedWrappers(doc, baselineWithPracticeActivities(doc, baseline))
      : baseline;

  const out: VirtualFileRow[] = [];

  for (const el of merged.focuses ?? []) {
    if (isSynthesizedPracticeElement(el)) continue;
    push(out, depthBase + 1, `focuses/${el.name}`, "focus", el.name, pathPrefix);
  }

  for (const alpha of merged.alphas ?? []) {
    if (isSynthesizedPracticeElement(alpha)) continue;
    push(out, depthBase + 1, `alphas/${alpha.name}`, "alpha", alpha.name, pathPrefix);
    let saIdx = 0;
    for (const raw of (alpha as { supportingAlphas?: string[] }).supportingAlphas ?? []) {
      const nm = String(raw ?? "").trim();
      if (!nm) continue;
      push(
        out,
        depthBase + 2,
        `alphas/${alpha.name}/supportingAlphas/${saIdx++}`,
        "alpha",
        nm,
        pathPrefix,
      );
    }
    for (const st of alpha.states ?? []) {
      if (isSynthesizedPracticeElement(st)) continue;
      push(out, depthBase + 2, `alphas/${alpha.name}/states/${st.name}`, "state", st.name, pathPrefix);
      for (const ch of st.checklist ?? []) {
        if (isSynthesizedPracticeElement(ch)) continue;
        push(
          out,
          depthBase + 3,
          `alphas/${alpha.name}/states/${st.name}/checklist/${ch.name}`,
          "checklist",
          ch.name,
          pathPrefix,
        );
      }
    }
  }

  for (const space of merged.activitySpaces ?? []) {
    if (isSynthesizedPracticeElement(space)) continue;
    if (isPracticeActivityNode(space)) {
      push(out, depthBase + 1, `activitySpaces/${space.name}`, "activity", space.name, pathPrefix);
      continue;
    }
    push(out, depthBase + 1, `activitySpaces/${space.name}`, "activitySpace", space.name, pathPrefix);
    for (const act of (space as { activities?: unknown[] }).activities ?? []) {
      if (!act || typeof act !== "object") continue;
      const ar = act as { name?: unknown; tags?: unknown };
      if (typeof ar.name !== "string") continue;
      if (isSynthesizedPracticeElement(ar)) continue;
      push(
        out,
        depthBase + 2,
        `activitySpaces/${space.name}/activities/${ar.name}`,
        "activity",
        ar.name,
        pathPrefix,
      );
    }
  }

  for (const c of merged.competencies ?? []) {
    if (isSynthesizedPracticeElement(c)) continue;
    push(out, depthBase + 1, `competencies/${c.name}`, "competency", c.name, pathPrefix);
    for (const lev of c.levels ?? []) {
      if (isSynthesizedPracticeElement(lev)) continue;
      push(out, depthBase + 2, `competencies/${c.name}/levels/${lev.name}`, "level", lev.name, pathPrefix);
    }
  }

  if (doc) {
    for (const wp of doc.workProducts ?? []) {
      if (!wp || typeof wp !== "object" || typeof wp.name !== "string") continue;
      push(out, depthBase + 1, `workProducts/${wp.name}`, "workProduct", wp.name, pathPrefix);
      for (const lod of wp.levelsOfDetail ?? []) {
        if (!lod || typeof lod !== "object" || typeof lod.name !== "string") continue;
        push(out, depthBase + 2, `workProducts/${wp.name}/lod/${lod.name}`, "lod", lod.name, pathPrefix);
      }
    }

    for (const a of doc.activities ?? []) {
      if (!a || typeof a !== "object" || typeof a.name !== "string") continue;
      push(out, depthBase + 1, `activities/${a.name}`, "activity", a.name, pathPrefix);
    }

    for (const wb of doc.workBreakdowns ?? []) {
      if (!wb || typeof wb !== "object" || typeof wb.name !== "string") continue;
      push(out, depthBase + 1, `workBreakdowns/${wb.name}`, "workBreakdown", wb.name, pathPrefix);
      for (const wi of wb.task ?? []) {
        if (!wi || typeof wi !== "object" || typeof wi.name !== "string") continue;
        push(out, depthBase + 2, `workBreakdowns/${wb.name}/tasks/${wi.name}`, "workItem", wi.name, pathPrefix);
      }
      const cx = wb.complexity;
      if (cx && typeof cx === "object" && typeof cx.name === "string") {
        push(out, depthBase + 2, `workBreakdowns/${wb.name}/complexity`, "complexity", cx.name, pathPrefix);
      }
    }

    if (Array.isArray(doc.practices)) {
      for (const pr of doc.practices) {
        if (!pr || typeof pr !== "object" || typeof pr.name !== "string") continue;
        push(out, depthBase + 1, `methodPractices/${pr.name}`, "practiceRef", pr.name, pathPrefix);
        const nested = listVirtualElementFiles(pr, {
          pathPrefix: pathPrefix ? `${pathPrefix}/methodPractices/${pr.name}` : `methodPractices/${pr.name}`,
          depthBase: depthBase + 1,
        });
        out.push(...nested);
      }
    }
  }

  return out;
}
