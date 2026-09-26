/**
 * Post-traitement de l'export statique pour l'hébergement en artifact Claude :
 *  - l'hébergeur ne résout pas les chemins absolus (« /nx/... ») → on passe en relatif (« nx/... ») ;
 *  - il refuse les chemins commençant par « _ » → d'où le préfixe ASSET_PREFIX=/nx au build ;
 *  - il refuse le fichier polyfills-*.js (caractère U+FFFD) → on l'exclut de la liste à publier.
 *
 * Usage : ASSET_PREFIX=/nx next build && node scripts/prepare-artifact.mjs
 * Écrit out/artifact-files.json : la carte { "chemin publié": "chemin dans out/" } à passer à l'outil Artifact.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve(process.cwd(), "out");
const PREFIX = "/nx/";

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// 1. index.html : attributs href/src absolus → relatifs
const indexPath = path.join(OUT, "index.html");
let html = fs.readFileSync(indexPath, "utf8");
html = html
  .replaceAll(`="${PREFIX}`, `="nx/`)
  .replaceAll(`\\"${PREFIX}`, `\\"nx/`) // charge RSC (self.__next_f) : mêmes URL, échappées
  .replaceAll(`="/menu.jpg"`, `="menu.jpg"`);
fs.writeFileSync(indexPath, html);

// 2. chunks JS : publicPath webpack et références internes
const files = walk(OUT).map((p) => path.relative(OUT, p));
for (const rel of files) {
  if (!rel.endsWith(".js")) continue;
  const p = path.join(OUT, rel);
  const src = fs.readFileSync(p, "utf8");
  const next = src.replaceAll(`"${PREFIX}`, `"nx/`).replaceAll(`\\"${PREFIX}`, `\\"nx/`);
  if (next !== src) fs.writeFileSync(p, next);
}

// 3. carte des fichiers à publier
const map = {};
for (const rel of files) {
  if (rel.startsWith("_next/") && !rel.endsWith(".txt")) {
    if (path.basename(rel).startsWith("polyfills-")) continue;
    map["nx/" + rel] = rel;
  } else if (rel === "menu.jpg") {
    map[rel] = rel;
  }
}
fs.writeFileSync(path.join(OUT, "artifact-files.json"), JSON.stringify(map, null, 1));
console.log(`index.html réécrit, ${Object.keys(map).length} fichiers listés dans out/artifact-files.json`);
