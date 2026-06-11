/**
 * IconAsset Component
 *
 * Renders an asset icon - supports both image URLs and font characters.
 * For font-character assets, renders as an <i> element with appropriate font family.
 */

import type { Asset } from "@/lib/types";

type IconAssetProps = {
  asset: Asset;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function IconAsset({ asset, size = 16, className = "", style = {} }: IconAssetProps) {
  // Image-based assets (url or dataUri)
  if ((asset.url || asset.dataUri) && asset.type !== "font-character") {
    const src = asset.url || asset.dataUri || "";
    return (
      <img
        src={src}
        alt={asset.description || asset.name}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: "contain",
          ...style,
        }}
        className={className}
      />
    );
  }

  // Font-character assets
  if (asset.type === "font-character" && asset.fontFamily && asset.fontCharacter) {
    const fontStyles: React.CSSProperties = {
      fontFamily: asset.fontFamily,
      fontWeight: asset.fontWeight || "normal",
      fontSize: `${size}px`,
      width: `${size}px`,
      height: `${size}px`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    };

    // Font Awesome class names (e.g., "fa-lightbulb" -> "fa-solid fa-lightbulb")
    if (asset.fontFamily.includes("Font Awesome")) {
      const iconClass = asset.fontCharacter.startsWith("fa-")
        ? asset.fontCharacter
        : `fa-${asset.fontCharacter}`;

      // Determine Font Awesome style based on weight
      const weightClass = asset.fontWeight === "900" ? "fa-solid" :
                         asset.fontWeight === "400" ? "fa-regular" :
                         "fa-solid";

      return (
        <i
          className={`${weightClass} ${iconClass} ${className}`.trim()}
          style={fontStyles}
          title={asset.description || asset.name}
        />
      );
    }

    // Material Icons (e.g., "settings")
    if (asset.fontFamily.includes("Material Icons")) {
      return (
        <i
          className={`material-icons ${className}`.trim()}
          style={fontStyles}
          title={asset.description || asset.name}
        >
          {asset.fontCharacter}
        </i>
      );
    }

    // Generic font character - render as text content
    return (
      <i
        className={className}
        style={fontStyles}
        title={asset.description || asset.name}
      >
        {asset.fontCharacter}
      </i>
    );
  }

  // No renderable asset
  return null;
}

/**
 * SVG-based IconAsset for use in SVG contexts
 * Renders font-character assets using foreignObject to embed HTML
 */
export function IconAssetSvg({ asset, x, y, size = 16, fill, className }: {
  asset: Asset;
  x: number;
  y: number;
  size?: number;
  fill?: string;
  className?: string;
}) {
  // Image-based assets
  if ((asset.url || asset.dataUri) && asset.type !== "font-character") {
    const href = asset.url || asset.dataUri || "";
    return (
      <image
        href={href}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        className={className}
      />
    );
  }

  // Font-character assets - use foreignObject to embed HTML
  if (asset.type === "font-character" && asset.fontFamily && asset.fontCharacter) {
    // Font Awesome
    if (asset.fontFamily.includes("Font Awesome")) {
      const iconClass = asset.fontCharacter.startsWith("fa-")
        ? asset.fontCharacter
        : `fa-${asset.fontCharacter}`;

      const weightClass = asset.fontWeight === "900" ? "fa-solid" :
                         asset.fontWeight === "400" ? "fa-regular" :
                         "fa-solid";

      return (
        <foreignObject x={x} y={y} width={size} height={size}>
          <div
            style={{
              width: `${size}px`,
              height: `${size}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${size}px`,
              color: fill || "currentColor",
            }}
          >
            <i className={`${weightClass} ${iconClass}`} title={asset.description || asset.name} />
          </div>
        </foreignObject>
      );
    }

    // Material Icons
    if (asset.fontFamily.includes("Material Icons")) {
      return (
        <foreignObject x={x} y={y} width={size} height={size}>
          <div
            style={{
              width: `${size}px`,
              height: `${size}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${size}px`,
              color: fill || "currentColor",
              fontFamily: asset.fontFamily,
            }}
          >
            <i className="material-icons">{asset.fontCharacter}</i>
          </div>
        </foreignObject>
      );
    }

    // Generic font character
    return (
      <foreignObject x={x} y={y} width={size} height={size}>
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${size}px`,
            fontFamily: asset.fontFamily,
            fontWeight: asset.fontWeight || "normal",
            color: fill || "currentColor",
          }}
        >
          {asset.fontCharacter}
        </div>
      </foreignObject>
    );
  }

  return null;
}
