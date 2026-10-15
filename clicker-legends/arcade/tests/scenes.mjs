/* Capturas de escenas dinámicas. Uso: node tests/scenes.mjs <outdir> */
import { createRequire } from "node:module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
import path from "node:path";
const out = process.argv[2];
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" }).catch(()=>chromium.launch());
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e=>errs.push("PAGEERROR "+e.message));
await p.addInitScript(()=>{ localStorage.setItem("CL_GDPR_CONSENT","x"); });
await p.goto("file://"+path.resolve("dist/Clicker_Legends_Arcade.html"));
await p.waitForTimeout(900);
await p.mouse.click(195,400); await p.waitForTimeout(1500);
await p.evaluate(()=>{ const b=document.getElementById("seasonNoticeBtn"); if(b) b.click(); });
const shot = async (n)=>p.screenshot({ path: out+"/"+n+".png" });
/* Partida con contenido */
await p.evaluate(()=>{
  W().clicks=5e9; game.tokens=500;
  for(const e of Object.keys(pets)) { game.pets[key(e,0)]=1+(e.length%3); game.petsDiscovered[e]=true; }
  game.goldenPets[goldenKey("🐉",0)]=2; game.shinyPets[shinyKey("🦄",0)]=1;
  buyCrit(); buyCombo(); equipBest();
  game.skins.ownedAuras.push("flame","royal","electric"); game.skins.aura="flame";
  render();
});
await p.evaluate(()=>uiGo("eggs")); await p.waitForTimeout(400);
await p.evaluate(()=>{ UI.hatchEgg=[0,1]; openEgg(worlds[0].eggs[1],1); });
for(const t of [300,520,800,1120]){ await p.waitForTimeout(t - (t===300?0:[300,520,800,1120][[300,520,800,1120].indexOf(t)-1])); await shot("egg_"+t); }
await p.waitForTimeout(500); await shot("egg_reveal");
await p.evaluate(()=>claimEggFromOverlay());
await p.evaluate(()=>{ const r=Math.random; let n=0; Math.random=()=> (n++===1?0.001:r()); openEgg(worlds[0].eggs[2],2); setTimeout(()=>Math.random=r,50); });
await p.waitForTimeout(1700); await shot("egg_shiny");
await p.evaluate(()=>claimEggFromOverlay());
await p.evaluate(()=>{ startAutoEggSession(0); setTimeout(()=>stopAutoEggSession("cancel"), 6000); });
await p.waitForTimeout(9000); await shot("auto_summary");
await p.evaluate(()=>closeAutoEggSummary());
await p.evaluate(()=>uiGo("pets")); await p.waitForTimeout(500); await shot("pets_full");
await p.evaluate(()=>uiGo("pokedex")); await p.waitForTimeout(300);
await p.evaluate(()=>dexSetFilter(3)); await p.waitForTimeout(900); await shot("dex_volcan");
await p.evaluate(()=>dexSetFilter(1)); await p.waitForTimeout(900); await shot("dex_desierto");
await p.evaluate(()=>uiGo("home")); await p.waitForTimeout(300);
await p.evaluate(()=>{ for(let i=0;i<4;i++) doClick(); });
await p.waitForTimeout(250); await shot("home_flame");
await p.evaluate(()=>{ equipAuraV2("royal"); });
await p.waitForTimeout(400); await shot("home_royal");
await p.evaluate(()=>{ game.rebirths=30; for(let i=1;i<5;i++){ game.unlocked.push(i);} travel(3); });
await p.waitForTimeout(1500); await shot("home_volcan");
await p.evaluate(()=>{ travel(5); }); await p.waitForTimeout(1500); await shot("home_halloween");
await p.evaluate(()=>{ toggleMore(); }); await p.waitForTimeout(300); await shot("more_menu");
console.log(errs.join("\n")||"sin errores");
await b.close();
