/**
 * Geometry calculations for radar/spider charts
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Convert polar coordinates to Cartesian
 * @param angle Angle in degrees (0 = top, clockwise)
 * @param radius Distance from center (0-1 normalized)
 * @param centerX Center X coordinate
 * @param centerY Center Y coordinate
 * @param maxRadius Maximum radius in pixels
 */
export function polarToCartesian(
  angle: number,
  radius: number,
  centerX: number,
  centerY: number,
  maxRadius: number
): Point {
  // Convert to radians and adjust so 0° is at top
  const angleRad = ((angle - 90) * Math.PI) / 180;
  return {
    x: centerX + maxRadius * radius * Math.cos(angleRad),
    y: centerY + maxRadius * radius * Math.sin(angleRad),
  };
}

/**
 * Generate SVG path for a polygon connecting points
 */
export function generatePolygonPath(points: Point[]): string {
  if (points.length === 0) return "";

  const pathParts = points.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${p.x},${p.y}`
  );

  return `${pathParts.join(" ")} Z`;
}

/**
 * Generate SVG path for a focus segment (pie slice)
 */
export function generateFocusSegmentPath(
  startAngle: number,
  endAngle: number,
  centerX: number,
  centerY: number,
  maxRadius: number
): string {
  const innerPoint = { x: centerX, y: centerY };
  const startPoint = polarToCartesian(startAngle, 1, centerX, centerY, maxRadius);
  const endPoint = polarToCartesian(endAngle, 1, centerX, centerY, maxRadius);

  // Create arc for the outer edge
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `
    M ${innerPoint.x},${innerPoint.y}
    L ${startPoint.x},${startPoint.y}
    A ${maxRadius},${maxRadius} 0 ${largeArcFlag} 1 ${endPoint.x},${endPoint.y}
    Z
  `.trim();
}
