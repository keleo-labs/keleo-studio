"use client";

import { useState } from "react";
import { Title } from "@patternfly/react-core";
import type { Background, Test, PracticeBaseline } from "@/lib/types";
import { IconAsset } from "../common/IconAsset";
import { findAsset } from "@/lib/display/assets";
import { AliasedName } from "../common/AliasedName";

const KEYWORD_STYLES: Record<string, { borderColor: string; label: string }> = {
  given: { borderColor: "var(--pf-v6-global--Color--200)", label: "Given" },
  when: { borderColor: "var(--pf-v6-global--primary-color--100)", label: "When" },
  then: { borderColor: "var(--pf-v6-global--success-color--100)", label: "Then" },
};

function KeywordList({ keyword, items }: { keyword: "given" | "when" | "then"; items: string[] }) {
  if (!items || items.length === 0) return null;
  const style = KEYWORD_STYLES[keyword];

  return (
    <div style={{ borderLeft: `3px solid ${style.borderColor}`, paddingLeft: "0.75rem", marginBottom: "0.5rem" }}>
      <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: style.borderColor, marginBottom: "0.25rem" }}>
        {style.label}
      </div>
      <ul style={{ margin: 0, paddingLeft: "1rem", listStyleType: "disc" }}>
        {items.map((item, idx) => (
          <li key={idx} style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "var(--pf-v6-global--Color--100)", marginBottom: "0.125rem" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TestBlock({ test, compact }: { test: Test; compact?: boolean }) {
  return (
    <div style={{
      padding: compact ? "0.5rem 0" : "0.75rem",
      backgroundColor: compact ? "transparent" : "var(--pf-v6-global--BackgroundColor--200)",
      borderRadius: compact ? 0 : "var(--pf-v6-global--BorderRadius--sm)",
    }}>
      {!compact && (
        <>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--pf-v6-global--Color--100)", marginBottom: "0.25rem" }}>
            {test.name}
          </div>
          {test.description && (
            <div style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
              {test.description}
            </div>
          )}
        </>
      )}
      <KeywordList keyword="given" items={test.given ?? []} />
      <KeywordList keyword="when" items={test.when ?? []} />
      <KeywordList keyword="then" items={test.then ?? []} />
    </div>
  );
}

export function ExamplesBlock({ examples }: { examples: Test[] }) {
  const [expanded, setExpanded] = useState(examples.length <= 2);

  if (examples.length === 0) return null;

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--pf-v6-global--Color--200)",
          marginBottom: expanded ? "0.5rem" : 0,
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", display: "inline-block" }}>
          &#9654;
        </span>
        Examples
        <span style={{
          fontSize: "0.625rem",
          backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
          borderRadius: "8px",
          padding: "0.0625rem 0.375rem",
          fontWeight: 400,
        }}>
          {examples.length}
        </span>
      </button>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {examples.map((example, idx) => (
            <TestBlock key={idx} test={example} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReferenceTileProps {
  label: string;
  sublabel: string;
  icon?: string;
  onClick?: () => void;
  baseline: PracticeBaseline;
  elementName: string;
  elementKind: "alpha" | "workProduct";
}

function ReferenceTile({ label, sublabel, baseline, elementName, elementKind, onClick }: ReferenceTileProps) {
  const assets = baseline.assets ?? [];
  const element = elementKind === "alpha"
    ? baseline.alphas.find((a) => a.name === elementName)
    : (baseline as any).workProducts?.find((w: any) => w.name === elementName);
  const assetRef = element?.assetNames?.find((a: any) => a.type === "icon");
  const asset = assetRef ? findAsset(assetRef.assetName, assets) : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.375rem 0.5rem",
        backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
        borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
        border: "1px solid var(--pf-v6-global--BorderColor--100)",
        cursor: onClick ? "pointer" : "default",
        transition: "background-color 0.2s, border-color 0.2s",
        fontSize: "0.6875rem",
      }}
      onMouseEnter={onClick ? (e) => {
        e.currentTarget.style.backgroundColor = "#ffffff";
        e.currentTarget.style.borderColor = "var(--pf-v6-global--link--Color)";
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        e.currentTarget.style.backgroundColor = "var(--pf-v6-global--BackgroundColor--200)";
        e.currentTarget.style.borderColor = "var(--pf-v6-global--BorderColor--100)";
      } : undefined}
    >
      {asset && <IconAsset asset={asset} size={14} style={{ flexShrink: 0 }} />}
      <div>
        <div style={{ fontWeight: 600, color: "var(--pf-v6-global--Color--100)" }}>
          <AliasedName kind={elementKind === "alpha" ? "alpha" : "workProduct"} name={label} browse={false} />
        </div>
        <div style={{ color: "var(--pf-v6-global--Color--200)" }}>{sublabel}</div>
      </div>
    </div>
  );
}

export function BackgroundBlock({
  background,
  baseline,
  onNavigateToElement,
}: {
  background: Background;
  baseline: PracticeBaseline;
  onNavigateToElement?: (name: string) => void;
}) {
  const hasGiven = background.given && background.given.length > 0;
  const hasAlphaStates = background.alphaStates && background.alphaStates.length > 0;
  const hasWorkProductLevels = background.workProductLevels && background.workProductLevels.length > 0;
  const hasInstanceAlpha = background.alphaInstanceStates && background.alphaInstanceStates.length > 0;
  const hasInstanceWP = background.workProductInstanceLevels && background.workProductInstanceLevels.length > 0;

  if (!hasGiven && !hasAlphaStates && !hasWorkProductLevels && !hasInstanceAlpha && !hasInstanceWP) return null;

  return (
    <div style={{
      padding: "0.75rem",
      backgroundColor: "var(--pf-v6-global--BackgroundColor--200)",
      borderRadius: "var(--pf-v6-global--BorderRadius--sm)",
      border: "1px solid var(--pf-v6-global--BorderColor--100)",
      marginBottom: "1rem",
    }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pf-v6-global--Color--200)", marginBottom: "0.5rem" }}>
        Prerequisites
      </div>

      {hasGiven && (
        <KeywordList keyword="given" items={background.given!} />
      )}

      {hasAlphaStates && (
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--200)", marginBottom: "0.25rem" }}>
            Required Alpha States
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {background.alphaStates!.map((ref, idx) => (
              <ReferenceTile
                key={idx}
                label={ref.alphaName}
                sublabel={`→ ${ref.stateName}`}
                baseline={baseline}
                elementName={ref.alphaName}
                elementKind="alpha"
                onClick={onNavigateToElement ? () => onNavigateToElement(ref.alphaName) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {hasWorkProductLevels && (
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--200)", marginBottom: "0.25rem" }}>
            Required Work Product Levels
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {background.workProductLevels!.map((ref, idx) => (
              <ReferenceTile
                key={idx}
                label={ref.workProductName}
                sublabel={`→ ${ref.levelOfDetailName}`}
                baseline={baseline}
                elementName={ref.workProductName}
                elementKind="workProduct"
                onClick={onNavigateToElement ? () => onNavigateToElement(ref.workProductName) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {hasInstanceAlpha && (
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--200)", marginBottom: "0.25rem" }}>
            Instance Prerequisites
          </div>
          <ul style={{ margin: 0, paddingLeft: "1rem", listStyleType: "disc" }}>
            {background.alphaInstanceStates!.map((ref, idx) => (
              <li key={idx} style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "var(--pf-v6-global--Color--100)" }}>
                <span style={{ fontWeight: 600 }}>{ref.instanceName}</span> {"→"} {ref.stateName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasInstanceWP && (
        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--pf-v6-global--Color--200)", marginBottom: "0.25rem" }}>
            Instance Prerequisites
          </div>
          <ul style={{ margin: 0, paddingLeft: "1rem", listStyleType: "disc" }}>
            {background.workProductInstanceLevels!.map((ref, idx) => (
              <li key={idx} style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "var(--pf-v6-global--Color--100)" }}>
                <span style={{ fontWeight: 600 }}>{ref.instanceName}</span> {"→"} {ref.levelOfDetailName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
