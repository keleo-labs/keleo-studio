import type { Asset, AssetReference } from "./types";

/**
 * Resolve an asset to a usable URL or rendering data.
 * Supports image URLs, data URIs, and font-character assets.
 * Local file paths are not supported in this initial implementation.
 *
 * @param asset - The asset to resolve
 * @returns URL string, font data, or null if asset cannot be displayed
 */
export function resolveAssetUrl(asset: Asset): string | null {
  // Priority: url > dataUri > null
  if (asset.url) {
    return asset.url;
  }

  if (asset.dataUri) {
    return asset.dataUri;
  }

  // Font-character assets don't have URLs - they need special rendering
  // Return null so callers know to use renderAsIcon instead
  if (asset.type === "font-character") {
    return null;
  }

  // Local paths not supported yet
  return null;
}

/**
 * Check if an asset can be rendered as an icon.
 * Returns true for image assets with URLs or font-character assets.
 */
export function canRenderAsIcon(asset: Asset): boolean {
  // Image-based assets with URLs
  if (asset.url || asset.dataUri) {
    return true;
  }

  // Font-character assets
  if (asset.type === "font-character" && asset.fontFamily && asset.fontCharacter) {
    return true;
  }

  return false;
}

/**
 * Find an asset by name in an assets array.
 *
 * @param assetName - Name of the asset to find
 * @param assets - Array of assets to search
 * @returns The asset if found, null otherwise
 */
export function findAsset(assetName: string, assets?: Asset[]): Asset | null {
  if (!assets) return null;
  return assets.find((a) => a.name === assetName) || null;
}

/**
 * Get the icon asset for a practice element.
 *
 * @param assetNames - AssetReference array from a practice element
 * @param assets - Available assets
 * @returns The icon asset URL if found, null otherwise
 */
export function getIconAssetUrl(
  assetNames: AssetReference[] | undefined,
  assets: Asset[] | undefined
): string | null {
  if (!assetNames || !assets) return null;

  const iconRef = assetNames.find((ref) => ref.type === "icon");
  if (!iconRef) return null;

  const asset = findAsset(iconRef.assetName, assets);
  if (!asset) return null;

  return resolveAssetUrl(asset);
}

/**
 * Get all non-icon assets for a practice element (illustrative, template, diagram).
 * These are displayed after narratives.
 *
 * @param assetNames - AssetReference array from a practice element
 * @param assets - Available assets
 * @returns Array of resolved asset URLs with their types
 */
export function getNarrativeAssets(
  assetNames: AssetReference[] | undefined,
  assets: Asset[] | undefined
): Array<{ url: string; type: string; name: string; description?: string }> {
  if (!assetNames || !assets) return [];

  const narrativeAssetTypes = ["illustrative", "template", "diagram"];
  const narrativeRefs = assetNames.filter((ref) =>
    narrativeAssetTypes.includes(ref.type)
  );

  return narrativeRefs
    .map((ref) => {
      const asset = findAsset(ref.assetName, assets);
      if (!asset) return null;

      const url = resolveAssetUrl(asset);
      if (!url) return null;

      return {
        url,
        type: ref.type,
        name: asset.name,
        description: asset.description,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
