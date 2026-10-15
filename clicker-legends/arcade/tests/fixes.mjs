/* Comprueba en la versión arcade el comportamiento de cada corrección (tools/fixes.py). */
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" }).catch(()=>chromium.launch());
const p = await (await b.newContext()).newPage();
const errs = []; p.on("pageerror", e=>errs.push(e.message));
await p.addInitScript(()=>localStorage.setItem("CL_GDPR_CONSENT","x"));
await p.goto("file://"+path.resolve("dist/Clicker_Legends_Arcade.html"));
await p.waitForTimeout(1200);
const res = await p.evaluate(async ()=>{
  const out = [];
  const ok = (id, cond, info)=>out.push((cond?"✓ ":"✗ ")+id+(info?"  ("+info+")":""));
  const T = ()=>game.totalClicks;
  let t;
  /* F1 */
  t=T(); game.streakClaimed=false; claimStreak(); ok("F1b racha suma a Clics totales", T()-t===streakReward().clicks, "+"+(T()-t));
  t=T(); game.totalClicks=2000; t=T(); claimMission("clicks1"); ok("F1a misión suma a Clics totales", T()-t===5000, "+"+(T()-t));
  game.playSeconds=99999; t=T(); claimTime(0); ok("F1c tiempo suma a Clics totales", T()-t===1000, "+"+(T()-t));
  const inp=document.getElementById("codeInput");
  for(const [c,v] of [["WELCOME",5000],["LEAP POWER",1e6],["LUCKY",250000],["CLICK5K",5000],["BOOST25K",25000],["HATCH100K",100000]]){
    t=T(); inp.value=c; redeemCode(); ok("F1 código "+c, T()-t===v, "+"+(T()-t)); }
  /* F2 */
  game.achievementBonus=0; game.clickBoostUntil=0; const r0=Math.random; Math.random=()=>0.99;
  let c=W().clicks; doClick(); const base=W().clicks-c;
  game.achievementBonus=50; c=W().clicks; doClick(); const withAch=W().clicks-c;
  game.clickBoostUntil=Date.now()+60000; c=W().clicks; doClick(); const withBoost=W().clicks-c;
  Math.random=r0;
  ok("F2 logros +50% aplicado al clic", Math.abs(withAch/base-1.5)<1e-9, base+" → "+withAch);
  ok("F2 turbo x2 aplicado al clic", Math.abs(withBoost/withAch-2)<1e-9, withAch+" → "+withBoost);
  renderStats(); ok("F2 HUD = clic real", String(fmt(withBoost))===document.getElementById("clickPower").textContent, document.getElementById("clickPower").textContent);
  game.achievementBonus=0; game.clickBoostUntil=0;
  /* F3 */
  game.autoOpenEggs=false; W().clicks=1e9; startAutoEggSession(0); ok("F3 auto-apertura bloqueada sin comprar", !AUTO_EGG.active);
  /* F6 */
  game.luckUntil=Date.now()+50*60000; cl2ActivateLuck(10); ok("F6 la suerte se acumula", Math.round((game.luckUntil-Date.now())/60000)===60, Math.round((game.luckUntil-Date.now())/60000)+" min");
  game.luckUntil=0;
  /* F7 */
  game.pets={}; game.shinyPets={}; game.petsDiscovered={}; claimEgg("🦄", true);
  ok("F7 shiny de huevo = 1 sola mascota", totalPetInventory()===1 && !game.pets[key("🦄",0)] && game.shinyPets[shinyKey("🦄",0)]===1);
  ok("F7 shiny cuenta como descubierta", !!game.petsDiscovered["🦄"]);
  /* F8 */
  game.pets={}; game.goldenPets={}; game.goldenPets[goldenKey("🐉",0)]=1; ok("F8a dragón dorado cumple requisito de mundo", hasPet("🐉"));
  game.petsDiscovered={}; syncPetDiscoveries(); ok("F8b dorada cuenta en el bestiario", !!game.petsDiscovered["🐉"]);
  /* F9 */
  const d=new Date(); ok("F9 fecha local", today()===d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"), today());
  /* F10 */
  ok("F10 texto de recompensa 5 h", timeRewardText(5,timeRewards[5]).includes("+5 Tokens"));
  /* U1 */
  game.world=0; renderWorldRequirements(); ok("U1 requisito con coste real", document.getElementById("worldRequirements").textContent.includes(fmt(cl3WorldCost(1))), fmt(cl3WorldCost(1)));
  game.world=4; renderWorldRequirements(); ok("U1 tras Espacio no propone Halloween", document.getElementById("worldRequirements").textContent.includes("Último mundo")); game.world=0;
  return out;
});
console.log(res.join("\n"));
console.log(errs.length ? "Errores: "+errs.join(" | ") : "Sin errores JS");
const fails = res.filter(x=>x.startsWith("✗")).length;
console.log((res.length-fails)+"/"+res.length+" correcciones verificadas");
await b.close(); process.exit(fails?1:0);
