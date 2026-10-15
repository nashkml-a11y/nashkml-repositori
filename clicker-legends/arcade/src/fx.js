/* =====================================================
   MOTOR DE EFECTOS ARCADE
   Lienzo a pantalla completa con rejilla de FX_S píxeles CSS por
   píxel de arte. Partículas, textos flotantes, confeti, destellos,
   sacudida de pantalla y auras alrededor del botón.
   API usada por la lógica original: float(), particles(), confetti().
===================================================== */

const EMOJI_RE = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)/u;
const EMOJI_TEST = /^\p{Extended_Pictographic}/u;

const FX = { cv:null, ctx:null, S:3, w:0, h:0, parts:[], floats:[], flash:0, flashColor:"#fff",
             shake:0, last:0, t:0, imgs:{}, auraAcc:0, rings:[] };

function fxIcon(key){
  if(FX.imgs[key]) return FX.imgs[key];
  const a = ASSETS.icons[key] || ASSETS.pets[key];
  if(!a) return null;
  const im = new Image(); im.src = a.src; FX.imgs[key] = im; return im;
}

function fxInit(){
  FX.cv = $id("fxCanvas");
  FX.ctx = FX.cv.getContext("2d");
  fxResize();
  window.addEventListener("resize", fxResize);
  requestAnimationFrame(fxLoop);
}
function fxResize(){
  FX.S = 3;
  FX.w = Math.ceil(window.innerWidth / FX.S); FX.h = Math.ceil(window.innerHeight / FX.S);
  FX.cv.width = FX.w; FX.cv.height = FX.h;
  FX.ctx.imageSmoothingEnabled = false;
}

/* Centro del botón de clic en coordenadas de arte */
function fxButtonCenter(){
  const b = $id("click"); if(!b) return null;
  const r = b.getBoundingClientRect();
  if(r.width===0 || r.bottom<0 || r.top>window.innerHeight) return null;
  return { x:(r.left+r.width/2)/FX.S, y:(r.top+r.height/2)/FX.S, r:r.width/2/FX.S };
}

function fxBurst(x, y, o){
  o = o || {};
  const n = o.count || 10;
  for(let i=0;i<n;i++){
    const a = (Math.PI*2/n)*i + fxRand()*0.6;
    const sp = (o.speed||60) * (0.6 + fxRand()*0.7);
    FX.parts.push({
      x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - (o.up||0),
      g:o.gravity==null ? 90 : o.gravity, life:0, max:(o.life||0.7)*(0.7+fxRand()*0.5),
      c:o.colors ? o.colors[(fxRand()*o.colors.length)|0] : null,
      img:o.sprites ? fxIcon(o.sprites[(fxRand()*o.sprites.length)|0]) : null,
      sz:o.size || (1 + (fxRand()*2|0)), spin:fxRand()<0.5
    });
  }
}

function fxText(text, x, y, o){
  o = o || {};
  if(FX.floats.length > 12) FX.floats.splice(0, FX.floats.length - 12);
  FX.floats.push({ text:String(text), x, y, vy:-(o.speed||28), life:0, max:o.life||0.9,
                   c:o.color||"#ffffff", big:!!o.big, wob:(fxRand()*2-1)*6 });
}

function fxShake(px){ FX.shake = Math.max(FX.shake, px); }
function fxFlash(color, a){ FX.flashColor = color||"#fff"; FX.flash = Math.max(FX.flash, a==null?0.35:a); }
function fxRing(x, y, color, max){ FX.rings.push({x, y, r:2, max:max||26, c:color||"#fff", life:0}); }


/* Texto pixel nítido: se rasteriza, se binariza el alfa y se añade contorno.
   Se cachea por (texto, tamaño, color). */
const TXT_CACHE = new Map();
function textSprite(text, size, color, outline){
  const key = text+"|"+size+"|"+color+"|"+(outline||"");
  if(TXT_CACHE.has(key)) return TXT_CACHE.get(key);
  const m = document.createElement("canvas").getContext("2d");
  m.font = size+"px 'Silkscreen', monospace";
  const w = Math.ceil(m.measureText(text).width) + 4, h = size + 5;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d");
  g.font = m.font; g.textBaseline = "top"; g.fillStyle = "#fff"; g.fillText(text, 2, 2);
  const id = g.getImageData(0,0,w,h), d = id.data;
  const on = new Uint8Array(w*h);
  for(let i=0;i<w*h;i++) on[i] = d[i*4+3] >= 110 ? 1 : 0;
  const fc = hexToRgb(color), oc = hexToRgb(outline || "#1a0e24");
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const i = y*w+x, o = i*4;
    if(on[i]){ d[o]=fc[0]; d[o+1]=fc[1]; d[o+2]=fc[2]; d[o+3]=255; continue; }
    const n = (x>0&&on[i-1])||(x<w-1&&on[i+1])||(y>0&&on[i-w])||(y<h-1&&on[i+w])||(y>0&&x>0&&on[i-w-1]);
    if(n){ d[o]=oc[0]; d[o+1]=oc[1]; d[o+2]=oc[2]; d[o+3]=255; } else d[o+3]=0;
  }
  g.putImageData(id,0,0);
  if(document.fonts && document.fonts.check && document.fonts.check(m.font)) TXT_CACHE.set(key, cv);
  return cv;
}

/* ----- API llamada por la lógica original ----- */
function float(text, variant){
  variant = variant || "normal";
  const c = fxButtonCenter();
  const x = c ? c.x + (fxRand()*2-1)*c.r*0.7 : FX.w*(0.35+fxRand()*0.3);
  const y = c ? c.y - c.r*0.6 : FX.h*0.45;
  const col = variant==="critical" ? "#ffd83c" : (variant==="combo" ? "#ff9a3c" : "#ffffff");
  const crit = /CR[IÍ]TICO/.test(text);
  fxText(text, x, y, { color: crit ? "#ffd83c" : col, big: crit, life: crit?1.1:0.8 });
  if(crit){ fxShake(3); fxFlash("#fff6c0", 0.22); if(c) fxRing(c.x, c.y, "#ffd83c", c.r*1.5); }
}

function particles(colors){
  const c = fxButtonCenter(); if(!c) return;
  const fx = (typeof game!=="undefined" && game.skins) ? effectById(game.skins.effect) : null;
  const sprites = fx && fx.particles ? fx.particles.filter(e=>ASSETS.icons[e]) : null;
  if(sprites && sprites.length){
    fxBurst(c.x, c.y, { count:6, sprites, speed:55, gravity:60, life:0.8, up:20 });
    fxBurst(c.x, c.y, { count:6, colors, speed:70, gravity:80, life:0.5 });
  }else{
    fxBurst(c.x, c.y, { count:10, colors, speed:70, gravity:80, life:0.6 });
  }
  UI.pressFx && UI.pressFx();
}

function confetti(){
  const cols = ["#ffd83c","#ff5bd0","#42e5ff","#a855f7","#4cff91","#ff7920"];
  for(let i=0;i<70;i++){
    FX.parts.push({ x:fxRand()*FX.w, y:-fxRand()*FX.h*0.4, vx:(fxRand()*2-1)*12, vy:20+fxRand()*25, g:8,
      life:0, max:3.2, c:cols[(fxRand()*cols.length)|0], sz:2, conf:true, ph:fxRand()*6 });
  }
  fxFlash("#ffffff", 0.3);
}

/* ----- Auras: definición declarativa por id ----- */
const AURA_FX = {
  flame:{ ring:["#ff5a16","#ffd15c"], emit:{rate:40, kind:"rise", colors:["#fff4a0","#ffd15c","#ff8a1a","#e0300a"]} },
  ice:{ ring:["#64eaff","#ffffff"], orbit:{n:6, sprite:"❄️", speed:0.8}, emit:{rate:10, kind:"spark", colors:["#ffffff","#9ff0ff"]} },
  electric:{ ring:["#ffe23d","#ffffff"], bolts:true, emit:{rate:14, kind:"spark", colors:["#fff05c","#ffffff"]} },
  galaxy:{ ring:["#9d6cff","#d33cff"], orbit:{n:10, dots:["#ffffff","#d6b4ff","#ff8ae0"], speed:0.6, spiral:true} },
  poison:{ ring:["#58ff47","#d7ff4d"], dashed:true, emit:{rate:18, kind:"bubble", colors:["#73ff44","#b8ff6a","#2a9a2a"]} },
  rainbow:{ rainbow:true, emit:{rate:12, kind:"spark", colors:["#ff4d4d","#ffd23d","#55ff73","#42e5ff","#6575ff","#d65cff"]} },
  void:{ ring:["#2a0a5a","#7c4dff"], emit:{rate:22, kind:"sink", colors:["#7c4dff","#3a1a8a","#c0a0ff"]} },
  cosmic:{ ring:["#65eaff","#b64cff"], orbit:{n:3, sprite:"🪐", speed:0.5}, orbit2:{n:12, dots:["#ffffff","#9ff0ff"], speed:-0.9} },
  royal:{ ring:["#ffd83c","#fff6aa"], orbit:{n:8, dots:["#ffd83c","#ffffff","#ff9d00"], speed:0.7}, crown:true, emit:{rate:8, kind:"spark", colors:["#fff6aa","#ffd83c"]} },
  halloween_darkness:{ ring:["#2a0a3a","#8a3aff"], emit:{rate:24, kind:"rise", colors:["#3a1050","#5a2080","#8a3aff"]}, orbit:{n:3, sprite:"🦇", speed:1.0} },
  halloween_venom:{ ring:["#3aff6a","#a0ff3a"], emit:{rate:16, kind:"drip", colors:["#3aff6a","#a0ff3a","#1a8a3a"]} },
  christmas_snow:{ ring:["#cfe8ff","#ffffff"], orbit:{n:7, sprite:"❄️", speed:0.5}, emit:{rate:14, kind:"fall", colors:["#ffffff"]} },
  christmas_sparkle:{ lights:["#ff4a4a","#ffd84a","#4ad0ff","#4aff7a"], emit:{rate:12, kind:"spark", colors:["#fff6aa","#ffffff"]} },
  valentine_hearts_aura:{ ring:["#ff4a8a","#ffb4d0"], orbit:{n:6, sprite:"💕", speed:0.7}, emit:{rate:8, kind:"rise", colors:["#ff86b4"]} },
  valentine_chocolate:{ ring:["#6a3a1a","#a86a3a"], emit:{rate:16, kind:"drip", colors:["#5a2a0a","#8a4a20","#c88a5a"]} },
  summer_water_aura:{ ring:["#2fa0e0","#d8f6ff"], orbit:{n:6, sprite:"💧", speed:0.9}, emit:{rate:10, kind:"spark", colors:["#ffffff","#7ad4ff"]} },
  summer_heat:{ ring:["#ffb300","#fff6a0"], emit:{rate:30, kind:"rise", colors:["#fff6a0","#ffd54d","#ff8a1a"]}, wave:true }
};

function fxDrawAura(ctx, id, cx, cy, r, t, dt, emitInto){
  const d = AURA_FX[id]; if(!d) return;
  const R = r + 3;
  const px = (x,y,c)=>{ ctx.fillStyle = c; ctx.fillRect(x|0, y|0, 1, 1); };
  if(d.ring){
    const steps = Math.ceil(R*7);
    for(let i=0;i<steps;i++){
      const a = i/steps*Math.PI*2;
      if(d.dashed && ((i + (t*12|0)) % 6) < 3) continue;
      const pulse = Math.sin(a*3 + t*4) > 0.2;
      const rr = R + (d.wave ? Math.sin(a*6+t*6)*1.2 : 0);
      px(cx+Math.cos(a)*rr, cy+Math.sin(a)*rr, pulse ? d.ring[1] : d.ring[0]);
      if(pulse) px(cx+Math.cos(a)*(rr+1), cy+Math.sin(a)*(rr+1), d.ring[0]);
    }
  }
  if(d.rainbow){
    const cols = ["#ff4d4d","#ffd23d","#55ff73","#42e5ff","#6575ff","#d65cff"];
    const steps = Math.ceil(R*7);
    for(let i=0;i<steps;i++){
      const a = i/steps*Math.PI*2;
      const c = cols[Math.floor((i/steps*6 + t*2))%6];
      px(cx+Math.cos(a)*R, cy+Math.sin(a)*R, c); px(cx+Math.cos(a)*(R+1), cy+Math.sin(a)*(R+1), c);
    }
  }
  if(d.lights){
    const n = 16;
    for(let i=0;i<n;i++){
      const a = i/n*Math.PI*2 + t*0.3;
      const on = ((i + (t*3|0)) % 3) !== 0;
      const x = cx+Math.cos(a)*(R+1), y = cy+Math.sin(a)*(R+1);
      ctx.fillStyle = "#1f5a3a"; ctx.fillRect(x|0, y|0, 1, 1);
      if(on){ ctx.fillStyle = d.lights[i%d.lights.length]; ctx.fillRect((x-1)|0, (y-1)|0, 2, 2); }
    }
  }
  const orbit = (o, rad)=>{
    for(let i=0;i<o.n;i++){
      const a = i/o.n*Math.PI*2 + t*o.speed*2;
      const rr = rad + (o.spiral ? Math.sin(t*2+i)*3 : 0);
      const x = cx+Math.cos(a)*rr, y = cy+Math.sin(a)*rr*0.92;
      if(o.sprite){ const im = fxIcon(o.sprite); if(im && im.complete) ctx.drawImage(im, (x-im.width/4)|0, (y-im.height/4)|0, im.width/2|0, im.height/2|0); }
      else { const c = o.dots[i%o.dots.length]; px(x,y,c); if((i+(t*4|0))%3===0){ px(x+1,y,c); px(x-1,y,c); px(x,y+1,c); px(x,y-1,c);} }
    }
  };
  if(d.orbit) orbit(d.orbit, R+6);
  if(d.orbit2) orbit(d.orbit2, R+11);
  if(d.bolts && fxRand()<0.35){
    let a = fxRand()*Math.PI*2, rr = R;
    let x = cx+Math.cos(a)*rr, y = cy+Math.sin(a)*rr;
    ctx.fillStyle = fxRand()<0.5 ? "#ffffff" : "#ffe23d";
    for(let k=0;k<10;k++){ ctx.fillRect(x|0,y|0,1,1); x += Math.cos(a)*1.4 + (fxRand()*2-1)*1.4; y += Math.sin(a)*1.4 + (fxRand()*2-1)*1.4; }
  }
  if(d.crown){
    const y = cy - R - 7, x = cx;
    ctx.fillStyle = "#ffd83c";
    ctx.fillRect(x-5,y+2,11,3); ctx.fillRect(x-5,y,1,2); ctx.fillRect(x,y-1,1,3); ctx.fillRect(x+5,y,1,2);
    ctx.fillStyle = "#ff4a6a"; ctx.fillRect(x,y+3,1,1);
    ctx.fillStyle = "#fff6aa"; ctx.fillRect(x-4,y+2,1,1);
  }
  if(d.emit && emitInto){
    FX.auraAcc += d.emit.rate*dt;
    while(FX.auraAcc >= 1){
      FX.auraAcc -= 1;
      const a = fxRand()*Math.PI*2;
      const x = cx+Math.cos(a)*R, y = cy+Math.sin(a)*R;
      const c = d.emit.colors[(fxRand()*d.emit.colors.length)|0];
      const k = d.emit.kind;
      const p = { x, y, vx:0, vy:0, g:0, life:0, max:0.6+fxRand()*0.6, c, sz:1 };
      if(k==="rise"){ p.vy = -12-fxRand()*14; p.vx = (fxRand()*2-1)*4; }
      if(k==="spark"){ p.vx = Math.cos(a)*10; p.vy = Math.sin(a)*10; p.max = 0.4; }
      if(k==="bubble"){ p.vy = -8-fxRand()*6; p.sz = 2; p.bubble = true; }
      if(k==="sink"){ p.x = cx+Math.cos(a)*(R+12); p.y = cy+Math.sin(a)*(R+12); p.vx = -Math.cos(a)*16; p.vy = -Math.sin(a)*16; p.max = 0.7; }
      if(k==="drip"){ if(Math.sin(a) < 0.2) continue; p.g = 40; p.max = 0.9; }
      if(k==="fall"){ p.y = cy - R - 10; p.x = cx + (fxRand()*2-1)*R; p.vy = 10; p.max = 1.6; }
      emitInto.push(p);
    }
  }
}

function fxLoop(now){
  const dt = Math.min(0.05, (now - (FX.last||now))/1000); FX.last = now; FX.t += dt;
  const ctx = FX.ctx;
  ctx.clearRect(0,0,FX.w,FX.h);
  /* Aura del botón */
  if(typeof game!=="undefined" && game.skins && game.skins.aura && game.skins.aura!=="none" && currentSection==="home" && !UI.overlayOpen){
    const c = fxButtonCenter();
    if(c) fxDrawAura(ctx, game.skins.aura, c.x, c.y, c.r, FX.t, dt, FX.parts);
  }
  /* Anillos */
  for(let i=FX.rings.length-1;i>=0;i--){
    const g = FX.rings[i]; g.life += dt; g.r += dt*70;
    const steps = Math.ceil(g.r*6);
    ctx.fillStyle = g.c; ctx.globalAlpha = Math.max(0, 1 - g.r/g.max);
    for(let k=0;k<steps;k++){ const a = k/steps*Math.PI*2; ctx.fillRect((g.x+Math.cos(a)*g.r)|0, (g.y+Math.sin(a)*g.r)|0, 1, 1); }
    ctx.globalAlpha = 1;
    if(g.r >= g.max) FX.rings.splice(i,1);
  }
  /* Partículas */
  for(let i=FX.parts.length-1;i>=0;i--){
    const p = FX.parts[i]; p.life += dt;
    if(p.life >= p.max){ FX.parts.splice(i,1); continue; }
    p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    if(p.conf){ p.x += Math.sin(FX.t*4+p.ph)*0.4; }
    const fade = 1 - p.life/p.max;
    if(p.img){
      if(p.img.complete){
        const s = fade > 0.4 ? 1 : 0.5;
        const w = Math.max(4, (p.img.width*0.5*s)|0), h = Math.max(4, (p.img.height*0.5*s)|0);
        ctx.drawImage(p.img, (p.x-w/2)|0, (p.y-h/2)|0, w, h);
      }
    }else{
      ctx.fillStyle = p.c;
      if(p.conf){ const flip = Math.sin(FX.t*10+p.ph) > 0; ctx.fillRect(p.x|0, p.y|0, flip?2:1, flip?1:2); }
      else if(p.bubble){ ctx.fillRect(p.x|0, p.y|0, 2, 1); ctx.fillRect(p.x|0, (p.y+1)|0, 1, 1); }
      else { const s = fade > 0.5 ? p.sz : 1; ctx.fillRect((p.x-s/2)|0, (p.y-s/2)|0, s, s); }
    }
  }
  /* Textos flotantes */
  for(let i=FX.floats.length-1;i>=0;i--){
    const f = FX.floats[i]; f.life += dt;
    if(f.life >= f.max){ FX.floats.splice(i,1); continue; }
    const k = f.life/f.max;
    const x = f.x + Math.sin(k*3)*f.wob, y = f.y + f.vy*f.life*(1 - k*0.4);
    const size = 8;
    const segs = f.segs || (f.segs = String(f.text).split(EMOJI_RE).filter(Boolean));
    const blink = (k > 0.75 && ((f.life*20)|0)%2);
    const parts = segs.map(sg => EMOJI_TEST.test(sg)
      ? (ASSETS.icons[sg] ? { img: fxIcon(sg), w: size+1 } : null)
      : { cv: textSprite(sg, size, blink ? "#ffffff" : f.c) });
    let total = 0;
    for(const pt of parts) if(pt) total += pt.cv ? pt.cv.width - 2 : pt.w;
    const sc = (f.big && total*2 < FX.w*0.92) ? 2 : 1;
    let cx = Math.round(Math.max(1, Math.min(FX.w - total*sc - 1, x - total*sc/2)));
    const cy = (y - (f.life < 0.08 ? 1 : 0))|0;
    for(const pt of parts){
      if(!pt) continue;
      if(pt.cv){ ctx.drawImage(pt.cv, cx-2*sc, cy - (pt.cv.height*sc/2|0), pt.cv.width*sc, pt.cv.height*sc); cx += (pt.cv.width - 2)*sc; }
      else { if(pt.img && pt.img.complete) ctx.drawImage(pt.img, cx, cy - (size*sc/2|0) - 1, size*sc, size*sc); cx += pt.w*sc; }
    }
  }
  /* Destello */
  if(FX.flash > 0.01){
    ctx.globalAlpha = FX.flash; ctx.fillStyle = FX.flashColor; ctx.fillRect(0,0,FX.w,FX.h); ctx.globalAlpha = 1;
    FX.flash *= Math.pow(0.0005, dt);
  }
  /* Sacudida (sobre la app, en múltiplos de píxel de arte) */
  const app = $id("app");
  if(app){
    if(FX.shake > 0.3){
      const s = FX.shake*FX.S;
      app.style.transform = "translate("+(Math.round((fxRand()*2-1)*s/FX.S)*FX.S)+"px,"+(Math.round((fxRand()*2-1)*s/FX.S)*FX.S)+"px)";
      FX.shake *= Math.pow(0.002, dt);
    }else if(app.style.transform){ app.style.transform = ""; FX.shake = 0; }
  }
  requestAnimationFrame(fxLoop);
}

/* =====================================================
   BOTÓN-MONEDA PIXEL ART POR SKIN (64x64 de arte)
===================================================== */
const COIN_CACHE = {};
function hexToRgb(h){ h=h.replace("#","").slice(0,6); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function mixRgb(a,b,t){ return a.map((v,i)=>Math.round(v+(b[i]-v)*t)); }
function rgbCss(c){ return "rgb("+c[0]+","+c[1]+","+c[2]+")"; }

function renderCoin(skin, size){
  size = size || 64;
  const key = skin.id+"@"+size;
  if(COIN_CACHE[key]) return COIN_CACHE[key];
  const cols = (skin.grad.match(/#[0-9a-fA-F]{6}/g) || ["#ffd83c","#ff7920"]).map(hexToRgb);
  const c1 = cols[0], c2 = cols[cols.length-1], s1 = hexToRgb(skin.s1||"#553300");
  const ramp = [mixRgb(s1,[0,0,0],0.2), mixRgb(c2,s1,0.35), c2, mixRgb(c1,c2,0.35), c1, mixRgb(c1,[255,255,255],0.55)];
  const cv = document.createElement("canvas"); cv.width = size; cv.height = size;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  const img = g.createImageData(size, size);
  const R = size/2 - 2, cx = size/2 - 0.5, cy = size/2 - 1;
  const bay = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const multi = cols.length > 2;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++){
    const dx = x-cx, dy = y-cy, d = Math.sqrt(dx*dx+dy*dy);
    const i = (y*size+x)*4;
    let col = null;
    if(d <= R+1.2 && d > R-0.2) col = [20,12,28];                     /* contorno */
    else if(d <= R-0.2 && d > R-3.4) col = (dy+dx*0.3) < 0 ? ramp[3] : ramp[1];   /* canto */
    else if(d <= R-3.4){
      let l = 0.62 - (dx+dy)/(R*2.6) - (d/R)*0.18;
      if(multi){ const a = (Math.atan2(dy,dx)/(Math.PI*2)+0.5); const cc = cols[Math.floor(a*cols.length)%cols.length]; ramp[2]=mixRgb(cc,s1,0.15); ramp[3]=cc; ramp[4]=mixRgb(cc,[255,255,255],0.25); }
      let v = Math.max(0, Math.min(4.99, l*5));
      let k = Math.floor(v); if(v-k > bay[(y%4)*4+(x%4)]/16) k = Math.min(5, k+1);
      col = ramp[Math.max(1,k)];
      if(d > R-6 && d <= R-4.4) col = mixRgb(col,[0,0,0],0.25);     /* surco interior */
    }
    if(d > R+1.2 && d <= R+2.2 && dy > 0) col = [0,0,0,90];             /* sombra */
    if(col){ img.data[i]=col[0]; img.data[i+1]=col[1]; img.data[i+2]=col[2]; img.data[i+3]=col[3]==null?255:col[3]; }
  }
  g.putImageData(img, 0, 0);
  /* Brillo especular */
  g.fillStyle = "rgba(255,255,255,.85)";
  g.fillRect(cx-R*0.55|0, cy-R*0.62|0, 4, 2); g.fillRect(cx-R*0.62|0, cy-R*0.5|0, 2, 3);
  /* Emblema de la skin */
  const em = fxIcon(skin.emoji);
  if(em && em.complete && em.width){
    const k = size >= 64 ? 1 : 0.5;
    const w = em.width*k, h = em.height*k;
    g.drawImage(em, (cx - w/2 + 0.5)|0, (cy - h/2 - size*0.11)|0, w|0, h|0);
  }
  /* Rótulo CLICK */
  if(size >= 64){
    const ts = textSprite("CLICK", 8, "#ffffff");
    g.drawImage(ts, Math.round(cx + 0.5 - ts.width/2), Math.round(cy + size*0.22 - ts.height/2));
  }
  const url = cv.toDataURL();
  if(em && em.complete) COIN_CACHE[key] = url;
  return url;
}

/* Vista previa estática de un aura (para la tienda) */
function renderAuraPreview(id){
  const key = "aura:"+id;
  if(COIN_CACHE[key]) return COIN_CACHE[key];
  const cv = document.createElement("canvas"); cv.width = 48; cv.height = 48;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  const skin = buttonSkinById(game.skins.button);
  const coin = new Image(); coin.src = renderCoin(skin, 32);
  const tmp = [];
  if(coin.complete) g.drawImage(coin, 8, 8);
  fxDrawAura(g, id, 24, 23, 15, 1.3, 0, null);
  const url = cv.toDataURL();
  if(coin.complete) COIN_CACHE[key] = url;
  return url;
}

/* Vista previa estática de un efecto de clic */
function renderEffectPreview(fx){
  const key = "fx:"+fx.id;
  if(COIN_CACHE[key]) return COIN_CACHE[key];
  const cv = document.createElement("canvas"); cv.width = 48; cv.height = 48;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  let ok = true;
  if(fx.particles){
    fx.particles.forEach((e,i)=>{
      const im = fxIcon(e); if(!im || !im.complete){ ok = false; return; }
      const pos = [[6,6],[26,4],[16,22],[4,26],[28,26]];
      [0,1,2,3,4].filter(k=>k%3===i).forEach(k=>g.drawImage(im, pos[k][0], pos[k][1], im.width*0.75|0, im.height*0.75|0));
    });
  }else{
    const cols = ["#42e5ff","#a855f7","#ff5bd0","#ffd83c"];
    for(let i=0;i<14;i++){ const a=i/14*Math.PI*2, r=8+(i%3)*5; g.fillStyle=cols[i%4]; g.fillRect((24+Math.cos(a)*r)|0,(24+Math.sin(a)*r)|0, i%2?2:1, i%2?2:1); }
  }
  const url = cv.toDataURL();
  if(ok) COIN_CACHE[key] = url;
  return url;
}
