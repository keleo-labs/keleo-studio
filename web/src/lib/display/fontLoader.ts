/**
 * Dynamic Font Loader
 *
 * Automatically loads fonts declared in assets to support font-character icons
 * from any font family (Font Awesome, Material Icons, custom fonts, etc.)
 */

import type { Asset } from "../types";

// Track which fonts have been loaded to avoid duplicates
const loadedFonts = new Set<string>();

/**
 * Common font CDN mappings
 * Maps font family patterns to their CDN URLs
 */
const FONT_CDN_MAP: Record<string, (family: string) => string> = {
  "Font Awesome": (family: string) => {
    // Extract version if specified (e.g., "Font Awesome 6 Free" -> "6")
    const versionMatch = family.match(/\d+/);
    const version = versionMatch ? versionMatch[0] : "6";
    return `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/${version}.5.1/css/all.min.css`;
  },

  "Material Icons": () =>
    "https://fonts.googleapis.com/icon?family=Material+Icons",

  "Material Symbols": () =>
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined",
};

/**
 * Get CDN URL for a font family if known
 */
function getFontCdnUrl(fontFamily: string): string | null {
  for (const [pattern, urlFn] of Object.entries(FONT_CDN_MAP)) {
    if (fontFamily.includes(pattern)) {
      return urlFn(fontFamily);
    }
  }
  return null;
}

/**
 * Load a font by creating a <link> element in the document head
 */
function loadFontStylesheet(url: string, fontFamily: string): void {
  if (loadedFonts.has(fontFamily)) {
    return; // Already loaded
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);

  loadedFonts.add(fontFamily);
  console.log(`[FontLoader] Loaded font: ${fontFamily} from ${url}`);
}

/**
 * Load a font using @font-face if it's a direct font file URL
 */
function loadFontFile(url: string, fontFamily: string, fontWeight?: string): void {
  if (loadedFonts.has(fontFamily)) {
    return; // Already loaded
  }

  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: "${fontFamily}";
      src: url("${url}");
      ${fontWeight ? `font-weight: ${fontWeight};` : ""}
    }
  `;
  document.head.appendChild(style);

  loadedFonts.add(fontFamily);
  console.log(`[FontLoader] Loaded font file: ${fontFamily} from ${url}`);
}

/**
 * Load fonts for all font-character assets in an array
 */
export function loadFontsFromAssets(assets: Asset[]): void {
  if (typeof window === "undefined") {
    console.log("[FontLoader] Skipping - running in SSR");
    return; // Skip during SSR
  }

  const fontCharAssets = assets.filter((asset) => asset.type === "font-character");
  console.log(`[FontLoader] Found ${fontCharAssets.length} font-character assets to load`, fontCharAssets.map(a => a.fontFamily));

  for (const asset of fontCharAssets) {
    if (!asset.fontFamily) {
      console.warn("[FontLoader] Asset missing fontFamily:", asset.name);
      continue;
    }

    // Priority: 1) asset.fontUrl, 2) known CDN, 3) assume already loaded
    let fontUrl: string | null = asset.fontUrl || null;
    console.log(`[FontLoader] Processing asset "${asset.name}" with fontFamily: "${asset.fontFamily}"`);

    if (!fontUrl) {
      fontUrl = getFontCdnUrl(asset.fontFamily);
      console.log(`[FontLoader] Auto-detected CDN URL for "${asset.fontFamily}": ${fontUrl}`);
    } else {
      console.log(`[FontLoader] Using explicit fontUrl: ${fontUrl}`);
    }

    if (fontUrl) {
      // Detect if it's a stylesheet or font file based on extension
      const isStylesheet = fontUrl.endsWith('.css') ||
                          fontUrl.includes('fonts.googleapis.com') ||
                          fontUrl.includes('cdnjs.cloudflare.com');

      console.log(`[FontLoader] Loading as ${isStylesheet ? 'stylesheet' : 'font file'}`);

      if (isStylesheet) {
        loadFontStylesheet(fontUrl, asset.fontFamily);
      } else {
        loadFontFile(fontUrl, asset.fontFamily, asset.fontWeight);
      }
    } else {
      // Font not in known CDNs and no URL provided
      // Assume it's already available (system font or pre-loaded)
      if (!loadedFonts.has(asset.fontFamily)) {
        console.warn(`[FontLoader] Font family "${asset.fontFamily}" has no known CDN and no fontUrl. Assuming it's already available.`);
        loadedFonts.add(asset.fontFamily); // Mark as "handled" to avoid repeat warnings
      }
    }
  }
}

/**
 * Preload fonts from a practice/method document
 * Call this when loading a practice to ensure fonts are ready before rendering
 */
export function preloadPracticeFonts(practice: any): void {
  if (!practice) {
    console.log("[FontLoader] No practice provided");
    return;
  }

  console.log("[FontLoader] Preloading fonts for practice:", practice.name);
  const assets: Asset[] = practice.assets || [];
  console.log(`[FontLoader] Practice has ${assets.length} total assets`);
  loadFontsFromAssets(assets);

  // Also check baseline if present
  if (practice.baselinePractice?.assets) {
    loadFontsFromAssets(practice.baselinePractice.assets);
  }

  // Check practices array if present
  if (Array.isArray(practice.practices)) {
    for (const p of practice.practices) {
      if (p.assets) {
        loadFontsFromAssets(p.assets);
      }
    }
  }
}

/**
 * Reset loaded fonts tracker (useful for testing)
 */
export function resetLoadedFonts(): void {
  loadedFonts.clear();
}
