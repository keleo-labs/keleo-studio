"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { FocusGroup } from "@/lib/methodFocus";
import { transformAlphaScoresToRadar, getFocusStrokeColor, getFocusSolidColor, createInitialism } from "@/lib/radarChartData";
import { polarToCartesian, generatePolygonPath, generateFocusSegmentPath } from "@/lib/radarChartGeometry";

export type RadarChartSize = "icon" | "small" | "medium" | "large";

interface PracticeRadarChartProps {
  /** Alpha scores by focus from calculateAlphaScores() */
  alphasByFocus: Map<string, FocusGroup>;
  /** Size variant */
  size?: RadarChartSize;
  /** Fixed maximum score for consistent scaling */
  fixedMaxScore?: number;
  /** Show labels on spines */
  showLabels?: boolean;
  /** Custom styles */
  style?: CSSProperties;
}

const SIZE_CONFIG = {
  icon: { width: 80, height: 80, radius: 28, fontSize: 8, showLabels: false, padding: 10 },
  small: { width: 150, height: 150, radius: 55, fontSize: 10, showLabels: true, padding: 20 },
  medium: { width: 250, height: 250, radius: 90, fontSize: 11, showLabels: true, padding: 35 },
  large: { width: 400, height: 400, radius: 145, fontSize: 13, showLabels: true, padding: 55 },
};

export function PracticeRadarChart({
  alphasByFocus,
  size = "small",
  fixedMaxScore,
  showLabels: showLabelsOverride,
  style,
}: PracticeRadarChartProps) {
  const config = SIZE_CONFIG[size];
  const showLabels = showLabelsOverride ?? config.showLabels;

  const radarData = useMemo(
    () => transformAlphaScoresToRadar(alphasByFocus, { fixedMaxScore }),
    [alphasByFocus, fixedMaxScore]
  );

  const centerX = config.width / 2;
  const centerY = config.height / 2;
  const maxRadius = config.radius;

  // Calculate angle step for positioning
  const angleStep = radarData.spines.length > 0 ? 360 / radarData.spines.length : 0;

  // Calculate grid circles (background concentric circles)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Calculate spine lines
  const spineLines = radarData.spines.map((spine) => {
    const outerPoint = polarToCartesian(spine.angle, 1, centerX, centerY, maxRadius);
    return {
      spine,
      x2: outerPoint.x,
      y2: outerPoint.y,
    };
  });

  // Calculate data polygon points (clamped to max)
  const dataPoints = radarData.spines.map((spine) => {
    const normalizedValue = Math.min(spine.value / radarData.maxScore, 1.0);
    return polarToCartesian(spine.angle, normalizedValue, centerX, centerY, maxRadius);
  });

  const dataPolygonPath = generatePolygonPath(dataPoints);

  // Handle empty state
  if (radarData.spines.length === 0) {
    return (
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        style={{ ...style }}
      >
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          fontSize={config.fontSize}
          fill="var(--pf-v6-global--Color--200)"
        >
          No data
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={config.width}
      height={config.height}
      viewBox={`0 0 ${config.width} ${config.height}`}
      style={{ ...style }}
    >
      {/* Background focus segments */}
      {radarData.focusSegments.map((segment, idx) => {
        // Start segment halfway before the first spine in this segment
        const startAngle = radarData.spines[segment.startIndex].angle - (angleStep / 2);

        // End segment halfway after the last spine in this segment
        const endAngle = radarData.spines[segment.endIndex].angle + (angleStep / 2);

        const segmentPath = generateFocusSegmentPath(
          startAngle,
          endAngle,
          centerX,
          centerY,
          maxRadius
        );

        return (
          <path
            key={segment.focusName}
            d={segmentPath}
            fill={segment.color}
            stroke="none"
          />
        );
      })}

      {/* Grid circles */}
      {gridLevels.map((level, idx) => (
        <circle
          key={idx}
          cx={centerX}
          cy={centerY}
          r={maxRadius * level}
          fill="none"
          stroke="rgba(128, 128, 128, 0.2)"
          strokeWidth={1}
        />
      ))}

      {/* Spine lines */}
      {spineLines.map(({ spine, x2, y2 }) => (
        <line
          key={spine.index}
          x1={centerX}
          y1={centerY}
          x2={x2}
          y2={y2}
          stroke={getFocusStrokeColor(spine.focus)}
          strokeWidth={1}
          opacity={0.6}
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPolygonPath}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3b82f6"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((point, idx) => (
        <circle
          key={idx}
          cx={point.x}
          cy={point.y}
          r={size === "icon" ? 2 : 3}
          fill="#3b82f6"
        />
      ))}

      {/* Labels - Initialisms in colored rectangles */}
      {showLabels &&
        radarData.spines.map((spine) => {
          const labelPoint = polarToCartesian(
            spine.angle,
            1.15,
            centerX,
            centerY,
            maxRadius
          );

          // Create initialism from alpha name
          const initialism = createInitialism(spine.label);
          const focusColor = getFocusSolidColor(spine.focus);

          const fontSize = config.fontSize;
          const rectHeight = size === "icon" ? 12 : size === "small" ? 16 : size === "medium" ? 18 : 22;
          const charWidth = fontSize * 0.65; // Approximate width per character
          const rectWidth = Math.max(rectHeight, initialism.length * charWidth + 6);
          const rectPadding = 3;

          return (
            <g key={spine.index}>
              {/* Colored rectangle background */}
              <rect
                x={labelPoint.x - rectWidth / 2}
                y={labelPoint.y - rectHeight / 2}
                width={rectWidth}
                height={rectHeight}
                fill={focusColor}
                rx={2}
              />
              {/* Initialism text */}
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fill="#000000"
                fontWeight={700}
                letterSpacing="-0.5"
              >
                {initialism}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

function truncateLabel(label: string, maxLength: number): string {
  return label.length > maxLength ? label.substring(0, maxLength) + "..." : label;
}
