/* Escritorio + rendimiento: fotogramas durante 3 s de clics rápidos con aura y efectos. */
import { createRequire } from "node:module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
import path from "node:path";
const out = process.argv[2];
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" }).catch(()=>chromium.launch());
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.addInitScript(()=>localStorage.setItem("CL_GDPR_CONSENT","x"));
await p.goto("file://"+path.resolve("dist/Clicker_Legends_Arcade.html"));
await p.waitForTimeout(800); await p.mouse.click(640,400); await p.waitForTimeout(1300);
await p.evaluate(()=>{ const b=document.getElementById("seasonNoticeBtn"); if(b) b.click();
  W().clicks=1e9; buyCrit(); buyCombo(); game.skins.ownedAuras.push("galaxy"); equipAuraV2("galaxy"); equipSkin("effect","classic"); render(); });
const r = await p.evaluate(()=>new Promise(res=>{
  let frames=0, worst=0, last=performance.now(); const t0=last;
  const iv=setInterval(()=>{ for(let i=0;i<3;i++) doClick(); }, 40);
  function f(now){ frames++; worst=Math.max(worst, now-last); last=now; if(now-t0<3000) requestAnimationFrame(f); else { clearInterval(iv); res({fps:frames/3, worst:Math.round(worst)}); } }
  requestAnimationFrame(f);
}));
console.log("rendimiento (escritorio, ~75 clics/s):", r);
await p.screenshot({ path: out+"/desktop.png" });
await b.close();
