/* Capturas de pantalla de control visual. Uso: node tests/shots.mjs <outdir> */
import { createRequire } from "node:module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
import path from "node:path";
const out = process.argv[2];
const file = "file://"+path.resolve("dist/Clicker_Legends_Arcade.html");
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" }).catch(()=>chromium.launch());
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e=>errs.push("PAGEERROR "+e.message));
p.on("console", m=>{ if(m.type()==="error") errs.push("CONSOLE "+m.text()); });
await p.addInitScript(()=>localStorage.setItem("CL_GDPR_CONSENT","personalized"));
await p.goto(file);
await p.waitForTimeout(1200);
await p.screenshot({ path: out+"/0_title.png" });
await p.mouse.click(195, 400);
await p.waitForTimeout(1500);
await p.screenshot({ path: out+"/0b_notice.png" });
await p.evaluate(()=>{ const b=document.getElementById("seasonNoticeBtn"); if(b) b.click(); });
await p.waitForTimeout(300);
await p.evaluate(()=>{ W().clicks = 2e6; game.tokens = 200; for(let i=0;i<30;i++) doClick(); render(); });
await p.waitForTimeout(200);
await p.screenshot({ path: out+"/1_home.png" });
for(const s of (process.argv[3]||"pets,eggs,worlds,rebirth,missions,stats,pokedex,achievements,upgradeTree,skins,settings").split(",")){
  await p.evaluate(s=>uiGo(s), s); await p.waitForTimeout(700);
  await p.screenshot({ path: out+"/s_"+s+".png" });
}
console.log(errs.join("\n") || "sin errores");
await b.close();
