"use client";

import type { WorkProduct } from "@/lib/types";
import { resolveWorkProductAncestors } from "@/lib/display/elementDisplay";
import { AliasedName } from "./AliasedName";
import { useMemo } from "react";

interface WorkProductQualifiedNameProps {
  wpName: string;
  workProducts: WorkProduct[] | undefined;
  /** "stacked" renders the ancestor chain on a separate line above the WP name. "inline" renders it inline with ⊃ separators. Default: "inline". */
  layout?: "inline" | "stacked";
}

export function WorkProductQualifiedName({ wpName, workProducts, layout = "inline" }: WorkProductQualifiedNameProps) {
  const ancestors = useMemo(
    () => resolveWorkProductAncestors(wpName, workProducts),
    [wpName, workProducts],
  );

  if (!ancestors.length) {
    return <AliasedName kind="workProduct" name={wpName} browse={false} />;
  }

  if (layout === "stacked") {
    const ancestorLabel = ancestors.map((a, i) => (
      <span key={a}>
        {i > 0 && <span style={{ margin: "0 0.2em" }}>{"⊃"}</span>}
        <AliasedName kind="workProduct" name={a} browse={false} />
      </span>
    ));

    return (
      <>
        <div style={{ fontSize: "0.65rem", color: "var(--pf-v6-global--Color--200)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ancestorLabel} ⊃
        </div>
        <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <AliasedName kind="workProduct" name={wpName} browse={false} />
        </div>
      </>
    );
  }

  return (
    <>
      {ancestors.map((ancestor) => (
        <span key={ancestor}>
          <span style={{ color: "var(--pf-v6-global--Color--200)" }}>
            <AliasedName kind="workProduct" name={ancestor} browse={false} />
          </span>
          <span style={{ margin: "0 0.25em", color: "var(--pf-v6-global--Color--200)", fontSize: "0.9em" }}>
            {"⊃"}
          </span>
        </span>
      ))}
      <AliasedName kind="workProduct" name={wpName} browse={false} />
    </>
  );
}
