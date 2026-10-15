/* Prueba táctil (móvil): toques reales sobre la moneda, el orbe y la navegación. */
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium, devices } = require("playwright");
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" }).catch(()=>chromium.launch());
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const p = await ctx.newPage();
const errs = []; p.on("pageerror", e=>errs.push(e.message));
await p.addInitScript(()=>localStorage.setItem("CL_GDPR_CONSENT","x"));
await p.goto("file://"+path.resolve("dist/Clicker_Legends_Arcade.html"));
await p.waitForTimeout(900);
await p.tap("#titleScreen"); await p.waitForTimeout(1400);
await p.evaluate(()=>{ const b=document.getElementById("seasonNoticeBtn"); if(b) b.click(); });
await p.waitForTimeout(300);
const c0 = await p.evaluate(()=>W().clicks);
for(let i=0;i<10;i++){ await p.tap("#click"); await p.waitForTimeout(40); }
const c1 = await p.evaluate(()=>W().clicks);
await p.evaluate(()=>spawnGoldenOrb()); await p.waitForTimeout(200);
await p.tap("#goldenOrb"); await p.waitForTimeout(200);
const orb = await p.evaluate(()=>({ gone: !document.getElementById("goldenOrb"), luck: game.luckUntil > Date.now() }));
await p.tap(".nav button[data-sec='eggs']"); await p.waitForTimeout(300);
const sec = await p.evaluate(()=>currentSection);
await p.tap("#navMore"); await p.waitForTimeout(200); await p.tap("#moreMenu button:nth-child(2)"); await p.waitForTimeout(300);
const sec2 = await p.evaluate(()=>currentSection);
console.log({ "10 toques → clics": c1-c0, orbe: orb, nav: sec, mas: sec2, errores: errs });
const ok = c1-c0===10 && orb.gone && orb.luck && sec==="eggs" && sec2==="pokedex" && !errs.length;
console.log(ok ? "OK táctil" : "FALLO táctil");
await b.close(); process.exit(ok?0:1);
