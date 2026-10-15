/* Construye dist/Clicker_Legends_Arcade.html (un único archivo autónomo).
   Uso: node tools/build.mjs [--skip-assets] */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = (p)=>path.join(ROOT, "src", p);
const ORIG = path.join(ROOT, "..", "referencia", "Clicker_Legends_TERMINADO.html");
const read = (p)=>fs.readFileSync(p, "utf8");

/* 1. Lógica original */
execFileSync("python3", [path.join(ROOT,"tools","make_core.py")], { stdio:"inherit" });

/* 2. Lista de emojis usados (original + capa arcade) */
const RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*/gu;
const texts = [read(ORIG), ...["ui.js","fx.js","body.html","bg.js","audio.js"].map(f=>read(SRC(f)))];
const set = new Set();
for(const t of texts) for(const m of t.matchAll(RE)) set.add(m[0]);
/* El original escribe a veces el mismo emoji con y sin VS16: se incluyen ambas formas */
for(const e of [...set]){ if(!e.endsWith("️") && e.length<=2) set.add(e+"️"); else if(e.endsWith("️")) set.add(e.slice(0,-1)); }
fs.writeFileSync(path.join(ROOT,"tools","emojis.json"), JSON.stringify([...set]));

/* 3. Recursos gráficos */
if(!process.argv.includes("--skip-assets"))
  execFileSync("python3", [path.join(ROOT,"tools","build_assets.py")], { stdio:"inherit" });

/* 4. Consentimiento (script original, literal) */
const orig = read(ORIG);
const gStart = orig.indexOf("<script>\n(function(){\n  var CONSENT_KEY");
const gdpr = orig.slice(orig.indexOf("\n", gStart)+1, orig.indexOf("</script>", gStart));

/* 5. Ensamblado: un solo <script> para que las declaraciones se eleven juntas */
const order = ["assets.gen.js","util.js","audio.js","bg.js","fx.js","ui.js","auras.gen.js","codes.gen.js","patches.js","boot.js","core.gen.js","tail.js"];
const script = order.map(f=>"/* ===== "+f+" ===== */\n"+read(SRC(f))).join("\n\n");

/* Comprobación: ninguna función definida dos veces */
const names = {};
for(const m of script.matchAll(/^function ([A-Za-z0-9_$]+)\s*\(/gm)) names[m[1]] = (names[m[1]]||0)+1;
const dup = Object.entries(names).filter(([,n])=>n>1);
if(dup.length){ console.error("Funciones duplicadas:", dup); process.exit(1); }

const b64 = (p)=>"data:font/woff2;base64,"+fs.readFileSync(p).toString("base64");
const css = read(SRC("style.css"))
  .replace("__FONT_PIXELIFY__", b64(SRC("fonts/pixelify-sans.woff2")))
  .replace("__FONT_SILK__", b64(SRC("fonts/silkscreen-bold.woff2")));

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#08061a">
<title>Clicker Legends Arcade</title>
<!-- Fuentes: Pixelify Sans y Silkscreen (SIL Open Font License 1.1). Emojis pixelados a partir de Noto Color Emoji (Apache 2.0 / OFL). -->
<style>
${css}
</style>
</head>
<body data-section="home">
<script>
${gdpr}
</script>
${read(SRC("body.html"))}
<script>
${script}
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(ROOT,"dist"), { recursive:true });
const out = path.join(ROOT,"dist","Clicker_Legends_Arcade.html");
fs.writeFileSync(out, html);
console.log("OK", out, Math.round(html.length/1024)+" KB");
