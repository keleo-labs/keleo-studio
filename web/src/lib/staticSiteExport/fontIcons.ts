import type { Asset } from "@/lib/types";

const FONT_CDN_MAP: Record<string, (family: string) => string> = {
  "Font Awesome": (family: string) => {
    const versionMatch = family.match(/\d+/);
    const version = versionMatch ? versionMatch[0] : "6";
    return `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/${version}.5.1/css/all.min.css`;
  },
  "Material Icons": () =>
    "https://fonts.googleapis.com/icon?family=Material+Icons",
  "Material Symbols": () =>
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined",
};

export function collectFontCdnUrls(assets: Asset[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const asset of assets) {
    if (asset.type !== "font-character" || !asset.fontFamily) continue;

    for (const [pattern, urlFn] of Object.entries(FONT_CDN_MAP)) {
      if (asset.fontFamily.includes(pattern)) {
        const url = urlFn(asset.fontFamily);
        if (!seen.has(url)) {
          seen.add(url);
          urls.push(url);
        }
        break;
      }
    }

    if (asset.fontUrl && !seen.has(asset.fontUrl)) {
      seen.add(asset.fontUrl);
      urls.push(asset.fontUrl);
    }
  }

  return urls;
}

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderIconHtml(asset: Asset, size: number = 14): string {
  if (
    asset.type !== "font-character" ||
    !asset.fontFamily ||
    !asset.fontCharacter
  )
    return "";

  if (asset.fontFamily.includes("Font Awesome")) {
    const iconClass = asset.fontCharacter.startsWith("fa-")
      ? asset.fontCharacter
      : `fa-${asset.fontCharacter}`;
    const weightClass =
      asset.fontWeight === "900"
        ? "fa-solid"
        : asset.fontWeight === "400"
          ? "fa-regular"
          : "fa-solid";
    return `<i class="${weightClass} ${escAttr(iconClass)}" style="font-size:${size}px"></i>`;
  }

  if (asset.fontFamily.includes("Material Icons")) {
    return `<i class="material-icons" style="font-size:${size}px">${escAttr(asset.fontCharacter)}</i>`;
  }

  return `<span style="font-family:'${escAttr(asset.fontFamily)}';font-size:${size}px;font-weight:${asset.fontWeight || "normal"}">${escAttr(asset.fontCharacter)}</span>`;
}

export function findIconAsset(
  assetNames: Array<{ assetName: string; type: string }> | undefined,
  assets: Asset[],
): Asset | undefined {
  const iconRef = assetNames?.find((a) => a.type === "icon");
  if (!iconRef) return undefined;
  return assets.find((a) => a.name === iconRef.assetName);
}
