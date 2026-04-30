import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** Hoisted postcss peers (workspace root npm install), or local web/node_modules */
function resolveHoisted(pkg) {
  const candidates = [
    path.join(appDir, "..", "node_modules", pkg),
    path.join(appDir, "node_modules", pkg),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
  }
  return candidates[0];
}

/** Nested Next postcss omits deps; npm workspaces hoists peers to repo root — wire both bundlers */
const postcssPeers = /** @type {const} */ ([
  "nanoid",
  "picocolors",
  "source-map-js",
]);

function postcssPeerAliasMap() {
  /** @type {Record<string, string>} */
  const aliases = {};
  for (const name of postcssPeers) {
    aliases[name] = resolveHoisted(name);
  }
  return aliases;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    const peerAliases = postcssPeerAliasMap();
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      ...peerAliases,
    };
    return config;
  },
  turbopack: {
    // Hint if you run next dev/build --turbopack (Nest PostCSS still breaks there in some workspaces)
    root: appDir,
    resolveAlias: postcssPeerAliasMap(),
  },
};

export default nextConfig;
