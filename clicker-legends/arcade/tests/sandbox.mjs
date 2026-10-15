/* Carga el juego dentro de un iframe aislado (sandbox sin allow-same-origin),
   como hacen algunos visores: localStorage lanza SecurityError.
   Comprueba que el título responde al toque y que se puede jugar. */
import { createRequire } from "node:module";
const require = createRequire("/opt/node-tools/node_modules/");
const { chromium } = require("playwright");
import fs from "node:fs";
import path from "node:path";
const html = fs.readFileSync(path.resolve(process.argv[2] || "dist/Clicker_Legends_Arcade.html"), "utf8");
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium" }).catch(()=>chromium.launch());
const ctx = await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", e=>errs.push(e.message));
await p.route("http://juego.test/**", r=>r.fulfill({ contentType:"text/html", body: html }));
await p.setContent('<body style="margin:0"><iframe id="f" sandbox="allow-scripts" src="http://juego.test/index.html" style="border:0;width:390px;height:844px"></iframe></body>');
await p.waitForTimeout(2500);
const f = p.frames().find(x=>x.url().includes("juego.test"));
const errsIn = [];
f.page().on("pageerror", e=>errsIn.push(e.message));
const before = await f.evaluate(()=>({ title: !!document.getElementById("titleScreen"), titleMode: document.body.classList.contains("titleMode") }));
await p.touchscreen.tap(195, 420);
await p.waitForTimeout(1200);
const after = await f.evaluate(()=>({ title: !!document.getElementById("titleScreen"),
  gdpr: !document.getElementById("gdprOverlay").classList.contains("hidden"),
  game: typeof game!=="undefined" ? "ok" : "sin juego" }));
let clicks = null;
if(after.gdpr){ await f.evaluate(()=>setConsent("personalized")); await p.touchscreen.tap(195, 420); await p.waitForTimeout(1200); }
const after2 = await f.evaluate(()=>({ title: !!document.getElementById("titleScreen") }));
try{ clicks = await f.evaluate(()=>{ const b=document.getElementById("seasonNoticeBtn"); if(b) b.click(); doClick(); doClick(); return W().clicks; }); }catch(e){ clicks = "ERROR "+e.message; }
console.log({ before, after, after2, clicks, errores: errs.concat(errsIn) });
if(process.argv[3]) await p.screenshot({ path: process.argv[3] });
await b.close();
