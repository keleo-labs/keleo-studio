"use client";

import { Title } from "@patternfly/react-core";
import type { PracticeBaseline } from "@/lib/types";

interface NarrativesBlockProps {
  narratives: any[];
  baseline: PracticeBaseline;
  compact?: boolean;
}

export function NarrativesBlock({ narratives, baseline, compact }: NarrativesBlockProps) {
  if (!narratives || narratives.length === 0) return null;

  const fontSize = compact ? "0.75rem" : "0.875rem";
  const contextFontSize = compact ? "0.6875rem" : "0.75rem";
  const gap = compact ? "1rem" : "1.5rem";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {narratives.map((narrative: any, idx: number) => (
        <div key={idx}>
          <Title headingLevel={compact ? "h4" : "h3"} size="md" style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
            {narrative.name}
          </Title>
          <p style={{ fontSize, lineHeight: "1.6", color: "var(--pf-v6-global--Color--100)", marginBottom: "0.75rem" }}>
            {narrative.description}
          </p>
          {narrative.narrativeContexts && narrative.narrativeContexts.length > 0 && (
            <ol style={{
              paddingLeft: "1.5rem",
              listStyleType: "decimal",
              margin: 0,
              marginBottom: "0.75rem",
            }}>
              {narrative.narrativeContexts.map((ctx: any, ctxIdx: number) => {
                const contextText = ctx.context || "";
                const hasMarkup = /<[^>]+>/.test(contextText);
                const hasLineBreaks = contextText.includes('\n');

                return (
                  <li
                    key={ctxIdx}
                    style={{
                      fontSize: contextFontSize,
                      lineHeight: "1.6",
                      color: "var(--pf-v6-global--Color--100)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {hasMarkup ? (
                      <div dangerouslySetInnerHTML={{ __html: contextText }} />
                    ) : hasLineBreaks ? (
                      contextText.split('\n').map((line: string, lineIdx: number) => (
                        <div key={lineIdx}>{line}</div>
                      ))
                    ) : (
                      contextText
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {narrative.citationNames && narrative.citationNames.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ fontSize: contextFontSize, fontWeight: 600, color: "var(--pf-v6-global--Color--100)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Further Reading
              </div>
              <ul style={{ listStyleType: "disc", paddingLeft: "1.5rem", margin: 0 }}>
                {narrative.citationNames.map((citationName: string, citIdx: number) => {
                  const citation = baseline.citations?.find((c: any) => c.name === citationName);
                  if (!citation) return null;

                  const formattedAuthors = citation.authors?.join(", ") || "";
                  const citationText = `${citation.name} (${formattedAuthors}, ${citation.date})`;

                  return (
                    <li key={citIdx} style={{ marginBottom: "0.375rem" }}>
                      {citation.url ? (
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: contextFontSize,
                            color: "var(--pf-v6-global--link--Color)",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "baseline",
                            gap: "0.25rem",
                          }}
                        >
                          <span>{citationText}</span>
                          <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.625rem" }} />
                        </a>
                      ) : (
                        <span style={{ fontSize: contextFontSize, color: "var(--pf-v6-global--Color--100)" }}>
                          {citationText}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
