/**
 * Helper to render icon assets in SVG using vanilla DOM manipulation
 * For use with D3 and other non-React SVG rendering
 */

import type { Asset } from "./types";

/**
 * Create an SVG element for an icon asset
 * Returns an SVG element (image or foreignObject) that can be appended to an SVG container
 */
export function createIconSvgElement(
  asset: Asset,
  x: number,
  y: number,
  size: number = 16,
  fill?: string
): SVGElement | null {
  // Image-based assets
  if ((asset.url || asset.dataUri) && asset.type !== "font-character") {
    const href = asset.url || asset.dataUri || "";
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("href", href);
    image.setAttribute("x", String(x));
    image.setAttribute("y", String(y));
    image.setAttribute("width", String(size));
    image.setAttribute("height", String(size));
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    return image;
  }

  // Font-character assets - use foreignObject to embed HTML
  if (asset.type === "font-character" && asset.fontFamily && asset.fontCharacter) {
    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreignObject.setAttribute("x", String(x));
    foreignObject.setAttribute("y", String(y));
    foreignObject.setAttribute("width", String(size));
    foreignObject.setAttribute("height", String(size));

    const div = document.createElement("div");
    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.fontSize = `${size}px`;
    if (fill) div.style.color = fill;

    // Font Awesome
    if (asset.fontFamily.includes("Font Awesome")) {
      const iconClass = asset.fontCharacter.startsWith("fa-")
        ? asset.fontCharacter
        : `fa-${asset.fontCharacter}`;

      const weightClass = asset.fontWeight === "900" ? "fa-solid" :
                         asset.fontWeight === "400" ? "fa-regular" :
                         "fa-solid";

      const icon = document.createElement("i");
      icon.className = `${weightClass} ${iconClass}`;
      if (asset.description) icon.title = asset.description;
      div.appendChild(icon);
    }
    // Material Icons
    else if (asset.fontFamily.includes("Material Icons")) {
      div.style.fontFamily = asset.fontFamily;
      const icon = document.createElement("i");
      icon.className = "material-icons";
      icon.textContent = asset.fontCharacter;
      div.appendChild(icon);
    }
    // Generic font character
    else {
      div.style.fontFamily = asset.fontFamily;
      div.style.fontWeight = asset.fontWeight || "normal";
      div.textContent = asset.fontCharacter;
    }

    foreignObject.appendChild(div);
    return foreignObject;
  }

  return null;
}
