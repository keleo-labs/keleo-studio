/**
 * Next bundles postcss under node_modules/next/node_modules/postcss without nested
 * node_modules; npm workspaces hoist postcss's deps to the repo root. Turbopack's
 * Node and browser loaders do not always walk up far enough from that postcss path,
 * so we symlink peers into locations Node's resolution expects.
 *
 * Symlink both:
 *   - web/node_modules/<name>               (upstream from postcss/next)
 *   - web/node_modules/next/node_modules/postcss/node_modules/<name> (direct peer)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.join(webDir, "..");
const webNodeModules = path.join(webDir, "node_modules");
const rootNodeModules = path.join(workspaceRoot, "node_modules");
/** Next's nested postcss (no hoist for subdeps npm install would add) */
const postcssNestedMods = path.join(
  webNodeModules,
  "next",
  "node_modules",
  "postcss",
  "node_modules",
);

const peers = ["source-map-js", "picocolors", "nanoid"];

function symlinkDir(to, dest) {
  if (!fs.existsSync(path.join(to, "package.json"))) {
    return;
  }
  try {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(dest);
    } else if (stat.isDirectory()) {
      return;
    }
  } catch {
    /* dest missing */
  }
  if (fs.existsSync(dest)) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const rel = path.relative(path.dirname(dest), to);
  fs.symlinkSync(rel, dest, "dir");
}

for (const name of peers) {
  const src = path.join(rootNodeModules, name);
  const underWeb = path.join(webNodeModules, name);
  symlinkDir(src, underWeb);

  /** ../../../<name>: postcss/node_modules -> web/node_modules/<name> */
  const nestedDest = path.join(postcssNestedMods, name);
  symlinkDir(src, nestedDest);

  console.log(`[ensure-postcss-peer-symlinks] ok ${name}`);
}
