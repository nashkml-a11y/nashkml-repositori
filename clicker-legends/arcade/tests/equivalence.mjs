/* =====================================================
   PRUEBA DE EQUIVALENCIA DE JUGABILIDAD
   Ejecuta la misma secuencia de acciones en el juego original
   y en la versión arcade, con:
     - Math.random sembrado igual en ambos (mulberry32),
     - reloj Date.now() congelado y avanzado a mano,
     - efectos visuales del original anulados (consumen
       Math.random; la versión arcade usa su propio generador).
   Tras cada paso compara el estado completo de `game`.
   Uso: node tests/equivalence.mjs
===================================================== */
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");

/* Referencia: el original con las MISMAS correcciones documentadas (tools/fixes.json).
   Así se demuestra que la única diferencia de lógica son esas correcciones. */
import fs from "node:fs";
const FIXES = JSON.parse(fs.readFileSync("tools/fixes.json","utf8"));
let refHtml = fs.readFileSync("../referencia/Clicker_Legends_TERMINADO.html","utf8");
for(const f of FIXES) refHtml = refHtml.split(f.old).join(f.new);
fs.writeFileSync("tests/.ref_fixed.html", refHtml);
const ORIG = "file://"+path.resolve("tests/.ref_fixed.html");
const ARC = "file://"+path.resolve("dist/Clicker_Legends_Arcade.html");
const T0 = Date.now();

const browser = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" }).catch(()=>chromium.launch());

async function open(url, isOrig){
  const ctx = await browser.newContext({ viewport:{width:390,height:844} });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e=>errors.push(e.message));
  await p.addInitScript(t0=>{
    localStorage.setItem("CL_GDPR_CONSENT","personalized");
    window.__t = t0; Date.now = ()=>window.__t;
  }, T0);
  await p.goto(url);
  await p.waitForTimeout(1500);
  await p.evaluate(isOrig=>{
    /* RNG determinista común */
    let s = 12345;
    Math.random = function(){ s|=0; s=(s+0x6D2B79F5)|0; let t=Math.imul(s^(s>>>15),1|s); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
    window.confirm = ()=>true;
    if(isOrig){ window.float=()=>{}; window.particles=()=>{}; window.confetti=()=>{}; }
    window.__confirmYes = ()=>{ const b=document.getElementById("customConfirmYes"); if(b) b.click(); };
  }, isOrig);
  return { p, errors, name: isOrig ? "original" : "arcade" };
}

const A = await open(ORIG, true);
const B = await open(ARC, false);

function norm(g){
  const c = JSON.parse(JSON.stringify(g));
  delete c.playSeconds; delete c.lastActive;
  return c;
}
function diff(a, b, pth="game", out=[]){
  if(typeof a !== typeof b || (a && b && typeof a==="object" && Array.isArray(a)!==Array.isArray(b))){ out.push(pth+": "+JSON.stringify(a)+" ≠ "+JSON.stringify(b)); return out; }
  if(a && typeof a==="object"){
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for(const k of keys) diff(a[k], b[k], pth+"."+k, out);
  }else if(a!==b && !(Number.isNaN(a)&&Number.isNaN(b))) out.push(pth+": "+JSON.stringify(a)+" ≠ "+JSON.stringify(b));
  return out;
}

let fails = 0, steps = 0;
async function step(label, fn, waitMs){
  steps++;
  for(const X of [A,B]) await X.p.evaluate(fn);
  if(waitMs) await Promise.all([A.p.waitForTimeout(waitMs), B.p.waitForTimeout(waitMs)]);
  const [ga, gb] = await Promise.all([A,B].map(X=>X.p.evaluate(()=>JSON.stringify(game))));
  const d = diff(norm(JSON.parse(ga)), norm(JSON.parse(gb)));
  if(d.length){ fails++; console.log("✗ "+label+"\n   "+d.slice(0,8).join("\n   ")); }
  else console.log("✓ "+label);
}
async function both(fn){ for(const X of [A,B]) await X.p.evaluate(fn); }

await step("estado inicial", ()=>{});
await step("50 clics sin mejoras", ()=>{ for(let i=0;i<50;i++) doClick(); });
await step("comprar intensidad x6, crítico y combo", ()=>{ W().clicks+=5e6; for(let i=0;i<6;i++) buyIntensity(); buyCrit(); buyCombo(); });
await step("200 clics con combo y crítico", ()=>{ for(let i=0;i<200;i++) doClick(); });
await step("pausa 3 s (combo se reinicia) + 5 clics", ()=>{ window.__t += 3000; for(let i=0;i<5;i++) doClick(); });
await step("cambio de pestaña congela el combo", ()=>{ page("pets"); window.__t += 10000; page("home"); doClick(); doClick(); });
for(let k=0;k<6;k++){
  await step("abrir huevo del Bosque #"+(k+1)+" (animación + reclamar)", ()=>{ openEgg(worlds[0].eggs[0],0); }, 1650);
  await step("  reclamar", ()=>{ claimEggFromOverlay(); });
}
await step("abrir Huevo Dorado y Místico", ()=>{ W().clicks+=5e7; openEgg(worlds[0].eggs[1],1); }, 1650);
await step("  reclamar", ()=>{ claimEggFromOverlay(); });
await step("abrir Huevo Místico", ()=>{ openEgg(worlds[0].eggs[2],2); }, 1650);
await step("  reclamar", ()=>{ claimEggFromOverlay(); });
await step("fusión 5 normales → Dorada (x2)", ()=>{ game.pets[key("🐶",0)]=10; fuse("🐶",0); fuse("🐶",0); });
await step("fusión 5 Doradas → Shiny", ()=>{ game.goldenPets[goldenKey("🐶",0)]=5; fuse("🐶",0); });
await step("equipar mejores / equipar y quitar", ()=>{ equipBest(); unequipUnit("🐶",0); equipUnit("🐱",0); equipGoldenUnit("🐶",0); unequipGoldenUnit("🐶",0); equipBest(); });
await step("tienda de tokens: suerte, turbo, auto-apertura", ()=>{ game.tokens=600; buyTokenItem("luckHour"); buyTokenItem("clickBoost"); buyTokenItem("autoOpen"); });
await step("huevo gratis (tokens)", ()=>{ buyTokenItem("freeEgg"); }, 1650);
await step("  reclamar", ()=>{ claimEggFromOverlay(); });
await step("árbol: comprar todas las ramas", ()=>{ ["click1","click2","click3","click4","egg1","egg2","egg3","egg4","pet1","pet2","pet3","pet4"].forEach(buyUpgrade); });
for(let k=0;k<3;k++){
  await step("huevo con suerte x2 + árbol #"+(k+1), ()=>{ W().clicks+=1e7; openEgg(worlds[0].eggs[1],1); }, 1650);
  await step("  reclamar", ()=>{ claimEggFromOverlay(); });
}
await step("anuncio de suerte x3 (simulado)", ()=>{ watchAdForLuck(); }, 1700);
await step("huevo con suerte x3", ()=>{ openEgg(worlds[0].eggs[2],2); }, 1650);
await step("  reclamar", ()=>{ claimEggFromOverlay(); });
await step("100 clics con suerte (crítico 10 %)", ()=>{ for(let i=0;i<100;i++) doClick(); });
await step("mejoras permanentes x3", ()=>{ game.tokens+=200; buyPermanent("clicks"); buyPermanent("clicks"); buyPermanent("clicks"); });
await step("auto-clicker: desbloquear y mejorar", ()=>{ unlockAutoClicker(); upgradeAutoIntensity(); upgradeAutoIntensity(); upgradeAutoIntensity(); upgradeAutoSpeed(); upgradeAutoSpeed(); });
await step("100 auto-clics", ()=>{ for(let i=0;i<100;i++) performAutoClick(); });
await step("renacer", ()=>{ W().clicks=Math.max(W().clicks, rebirthCost()); rebirth(); });
await step("renacer sin clics suficientes (rechazo)", ()=>{ rebirth(); });
await step("viajar a Desierto sin requisitos (rechazo)", ()=>{ travel(1); });
await step("viajar a Desierto con requisitos", ()=>{ game.rebirths=Math.max(2,game.rebirths); game.worlds[0].clicks=3e7; game.pets[key("🐉",0)]=1; travel(1); });
await step("huevo del Desierto", ()=>{ W().clicks+=2e7; openEgg(worlds[1].eggs[0],0); }, 1650);
await step("  reclamar", ()=>{ claimEggFromOverlay(); });
await step("viajar a mundo de temporada", ()=>{ for(let i=5;i<9;i++) travel(i); travel(0); });
await step("misiones: reclamar todas", ()=>{ game.playSeconds=99999; missions.forEach(m=>claimMission(m.id)); });
await step("logros: reclamar todos", ()=>{ achievements.forEach(a=>claimAchievement(a.id)); });
await step("códigos", ()=>{ const i=document.getElementById("codeInput"); for(const c of ["welcome","EGG HUNT","LUCKY","PETBUDDY","HATCH100K","NOPE","WELCOME"]){ i.value=c; redeemCode(); } });
await step("racha y recompensas por tiempo", ()=>{ claimStreak(); claimStreak(); game.playSeconds=100000; for(let i=0;i<8;i++) claimTime(i); });
await step("skins, efectos y auras", ()=>{ W().clicks+=5e9; buySkin("button","coin"); equipSkin("button","coin"); buySkin("effect","stars"); equipSkin("effect","stars"); buyAuraV2("flame"); buyAuraV2("royal"); equipAuraV2("royal"); buySkin("button","halloween_ghost"); buySkin("button","christmas_house"); });
await step("50 clics con aura", ()=>{ for(let i=0;i<50;i++) doClick(); });
await step("proteger / favorita / ordenar", ()=>{ const k=key("🐱",0); togglePetLock(k); togglePetFavorite(k); setPetSort("multAsc"); });
await step("eliminar mascota protegida (rechazo)", ()=>{ deletePetUnit(key("🐱",0)); });
await step("eliminar 1 mascota normal", ()=>{ game.pets[key("🐰",0)]=(game.pets[key("🐰",0)]||0)+2; game.equipped=[]; deletePetUnit(key("🐰",0)); window.__confirmYes(); });
await step("eliminar 1 Dorada y 1 Shiny", ()=>{ game.goldenPets[goldenKey("🦊",0)]=2; game.shinyPets[shinyKey("🦊",0)]=2; deleteGoldenUnit(goldenKey("🦊",0)); window.__confirmYes(); deleteShinyUnit(shinyKey("🦊",0)); window.__confirmYes(); });
await step("orbe dorado", ()=>{ claimGoldenOrb(); });
await step("auto-apertura de 3 huevos", ()=>{ game.pets={}; game.goldenPets={}; game.shinyPets={}; game.equipped=[]; W().clicks=cl3EggCost(game.world,0,worlds[game.world].eggs[0][1])*3; startAutoEggSession(0); }, 9500);
await step("  cerrar resumen", ()=>{ closeAutoEggSummary(); });
await step("inventario lleno → reembolso", ()=>{ game.pets[key("🐶",0)]=50; W().clicks+=1e8; openEgg(worlds[0].eggs[0],0); }, 1650);
await step("  reclamar", ()=>{ claimEggFromOverlay(); });
await step("guardar y comprobar integridad", ()=>{ cl1SaveSecure(); if(!cl1ValidateCriticalSave()) throw new Error("integridad"); });

/* Guardado compatible: la partida del original se carga en la versión arcade */
const saved = await A.p.evaluate(()=>{ cl1SaveSecure(); return { t: window.__t,
  s: localStorage.getItem("CLICK_WORLDS_FINAL"), b: localStorage.getItem("CLICK_WORLDS_FINAL_BACKUP"), i: localStorage.getItem("CLICK_WORLDS_FINAL_INTEGRITY") }; });
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.addInitScript(sv=>{ window.__t = sv.t; Date.now = ()=>window.__t; localStorage.setItem("CL_GDPR_CONSENT","x"); localStorage.setItem("CLICK_WORLDS_FINAL",sv.s); localStorage.setItem("CLICK_WORLDS_FINAL_BACKUP",sv.b); localStorage.setItem("CLICK_WORLDS_FINAL_INTEGRITY",sv.i); }, saved);
await p2.goto(ARC); await p2.waitForTimeout(1200);
const loaded = await p2.evaluate(()=>JSON.stringify(game));
const dl = diff(norm(JSON.parse(saved.s)), norm(JSON.parse(loaded))).filter(l=>!/lastLogin|streakClaimed|streak:|seasonNotices/.test(l));
steps++;
if(dl.length){ fails++; console.log("✗ cargar partida del original en arcade\n   "+dl.slice(0,8).join("\n   ")); }
else console.log("✓ cargar partida del original en arcade");

console.log("\nErrores JS original:", A.errors.length ? A.errors : "ninguno");
console.log("Errores JS arcade:", B.errors.length ? B.errors : "ninguno");
console.log("\n"+(steps-fails)+"/"+steps+" pasos idénticos");
await browser.close();
process.exit(fails ? 1 : 0);
