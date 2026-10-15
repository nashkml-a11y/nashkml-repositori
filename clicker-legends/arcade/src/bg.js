/* =====================================================
   ESCENARIOS ANIMADOS
   Lienzo de 216x324 (rejilla nativa) escalado sin suavizado.
   Fondo del mundo + capa animada propia de cada mundo + transición
   por tramado Bayer entre escenarios (estilo consola 16 bits).
===================================================== */

const BG_W = 216, BG_H = 324;
const WORLD_KEYS = ["bosque","desierto","hielo","volcan","espacio","halloween","navidad","sanvalentin","verano"];

const BG = {
  cv: null, ctx: null, imgs: {}, key: null, prevKey: null, fade: 1, fadeStart: 0,
  parts: [], t: 0, last: 0, masks: [], tmp: null, tmpCtx: null, cycle: null
};

function rnd(a,b){ return a + fxRand()*(b-a); }   /* solo efectos: no toca la lógica (fxRand) */

function bgInit(){
  BG.cv = document.getElementById("bgCanvas");
  BG.cv.width = BG_W; BG.cv.height = BG_H;
  BG.ctx = BG.cv.getContext("2d");
  BG.ctx.imageSmoothingEnabled = false;
  for(const k of WORLD_KEYS){
    const im = new Image(); im.src = ASSETS.bg[k]; BG.imgs[k] = im;
  }
  /* 16 máscaras de tramado ordenado para el fundido */
  const bay = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  for(let lv=1; lv<=16; lv++){
    const m = document.createElement("canvas"); m.width = BG_W; m.height = BG_H;
    const c = m.getContext("2d"); c.fillStyle = "#000";
    for(let y=0;y<BG_H;y+=2) for(let x=0;x<BG_W;x+=2){
      if(bay[((y/2)%4)*4 + ((x/2)%4)] < lv) c.fillRect(x,y,2,2);
    }
    BG.masks.push(m);
  }
  BG.tmp = document.createElement("canvas"); BG.tmp.width = BG_W; BG.tmp.height = BG_H;
  BG.tmpCtx = BG.tmp.getContext("2d"); BG.tmpCtx.imageSmoothingEnabled = false;
  requestAnimationFrame(bgLoop);
}

function bgSet(key, instant){
  if(!BG.imgs[key]) key = "bosque";
  if(key===BG.key) return;
  BG.prevKey = instant ? null : BG.key;
  BG.key = key;
  BG.fade = instant ? 1 : 0;
  BG.fadeStart = performance.now();
  BG.parts = [];
  document.documentElement.dataset.world = key;
}

function bgDrawOverlay(ctx, key, dt){
  const P = BG.parts, t = BG.t;
  const spawn = (n, fn)=>{ for(let i=0;i<n;i++) P.push(fn()); };
  const want = {bosque:26, desierto:22, hielo:70, volcan:50, espacio:40, halloween:14, navidad:80, sanvalentin:26, verano:22}[key] || 20;
  while(P.length < want){
    switch(key){
      case "bosque": spawn(1,()=>fxRand()<0.6
        ? {k:"leaf", x:rnd(-20,BG_W), y:rnd(-30,BG_H*0.9), vx:rnd(6,14), vy:rnd(8,16), ph:rnd(0,6), c:["#e8a030","#c8d840","#f0c050","#8ee070"][fxRand()*4|0]}
        : {k:"fly", x:rnd(0,BG_W), y:rnd(190,300), ph:rnd(0,6), c:["#ffffff","#ffd84a","#ff8ac0"][fxRand()*3|0]}); break;
      case "desierto": spawn(1,()=>fxRand()<0.92
        ? {k:"sand", x:rnd(-40,BG_W), y:rnd(170,BG_H), vx:rnd(30,60), len:rnd(3,9)|0, c:fxRand()<0.5?"#fff0c8":"#f6cf82"}
        : {k:"tumble", x:-12, y:rnd(250,300), vx:rnd(18,28), r:0}); break;
      case "hielo": case "navidad": spawn(1,()=>({k:"snow", x:rnd(0,BG_W), y:rnd(-BG_H,0), vy:rnd(10,26), ph:rnd(0,6), s:fxRand()<0.2?2:1})); break;
      case "volcan": spawn(1,()=>({k:"ember", x:rnd(0,BG_W), y:rnd(BG_H*0.4,BG_H+20), vy:-rnd(10,30), ph:rnd(0,6), life:rnd(2,6)})); break;
      case "espacio": spawn(1,()=>fxRand()<0.97
        ? {k:"twinkle", x:rnd(0,BG_W)|0, y:rnd(0,BG_H*0.6)|0, ph:rnd(0,6), sp:rnd(1,4), c:["#ffffff","#bfe4ff","#ffc4f0"][fxRand()*3|0]}
        : {k:"comet", x:rnd(0,BG_W), y:rnd(0,80), vx:-rnd(60,100), vy:rnd(30,50), life:1.2}); break;
      case "halloween": spawn(1,()=>fxRand()<0.6
        ? {k:"bat", x:fxRand()<0.5?-10:BG_W+10, y:rnd(20,140), vx:0, ph:rnd(0,6)}
        : {k:"fog", x:rnd(-60,BG_W), y:rnd(200,300), vx:rnd(3,7), w:rnd(30,70)|0}); break;
      case "sanvalentin": spawn(1,()=>({k:"heart", x:rnd(0,BG_W), y:rnd(BG_H,BG_H+80), vy:-rnd(8,16), ph:rnd(0,6), c:["#ff4a8a","#ff86b4","#ffd0e8"][fxRand()*3|0]})); break;
      case "verano": spawn(1,()=>fxRand()<0.75
        ? {k:"glint", x:rnd(70,200)|0, y:rnd(140,215)|0, ph:rnd(0,6), sp:rnd(2,5)}
        : {k:"gull", x:-10, y:rnd(30,110), vx:rnd(10,18), ph:rnd(0,6)}); break;
      default: return;
    }
  }
  for(let i=P.length-1;i>=0;i--){
    const p = P[i]; let dead = false;
    switch(p.k){
      case "leaf":
        p.x += (p.vx + Math.sin(t*2+p.ph)*10)*dt; p.y += p.vy*dt;
        ctx.fillStyle = p.c; ctx.fillRect(p.x|0, p.y|0, Math.sin(t*5+p.ph)>0?2:1, 1);
        dead = p.y > BG_H || p.x > BG_W+4; break;
      case "fly":
        p.ph += dt*8;
        ctx.fillStyle = p.c;
        { const x=(p.x + Math.sin(t*0.7+p.ph*0.05)*20)|0, y=(p.y + Math.sin(t*1.3+p.ph*0.1)*8)|0;
          ctx.fillRect(x,y,1,1); if(Math.sin(p.ph)>0){ ctx.fillRect(x-1,y-1,1,1); ctx.fillRect(x+1,y-1,1,1);} }
        break;
      case "sand":
        p.x += p.vx*dt; ctx.fillStyle = p.c; ctx.globalAlpha = 0.6; ctx.fillRect(p.x|0, p.y|0, p.len, 1); ctx.globalAlpha = 1;
        dead = p.x > BG_W; break;
      case "tumble":
        p.x += p.vx*dt; p.r += dt*6;
        { const by = p.y - Math.abs(Math.sin(p.r*0.7))*6;
          ctx.fillStyle = "#8a5a2a"; ctx.fillRect((p.x-3)|0, (by-3)|0, 7, 7);
          ctx.fillStyle = "#c08a4a";
          for(let a=0;a<4;a++){ ctx.fillRect((p.x+Math.cos(p.r+a*1.6)*2)|0, (by+Math.sin(p.r+a*1.6)*2)|0, 1, 1); } }
        dead = p.x > BG_W+10; break;
      case "snow":
        p.y += p.vy*dt; p.x += Math.sin(t*1.5+p.ph)*6*dt;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(p.x|0, p.y|0, p.s, p.s);
        dead = p.y > BG_H; break;
      case "ember":
        p.y += p.vy*dt; p.x += Math.sin(t*3+p.ph)*8*dt; p.life -= dt;
        ctx.fillStyle = p.life>3 ? "#fff4a0" : (p.life>1.5 ? "#ffa030" : "#e0401a");
        if(Math.sin(t*20+p.ph)>-0.6) ctx.fillRect(p.x|0, p.y|0, 1, 1);
        dead = p.life <= 0 || p.y < -4; break;
      case "twinkle": {
        const v = Math.sin(t*p.sp+p.ph);
        if(v>0.55){ ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 1, 1);
          if(v>0.93){ ctx.fillRect(p.x-1,p.y,1,1); ctx.fillRect(p.x+1,p.y,1,1); ctx.fillRect(p.x,p.y-1,1,1); ctx.fillRect(p.x,p.y+1,1,1); } }
        break; }
      case "comet":
        p.x += p.vx*dt; p.y += p.vy*dt; p.life -= dt;
        for(let k=0;k<8;k++){ ctx.fillStyle = k<2 ? "#ffffff" : (k<5 ? "#9fe0ff" : "#4a7ad0");
          ctx.fillRect((p.x - p.vx*k*0.012)|0, (p.y - p.vy*k*0.012)|0, 1, 1); }
        dead = p.life <= 0; break;
      case "bat": {
        if(!p.vx) p.vx = p.x < 0 ? rnd(22,36) : -rnd(22,36);
        p.x += p.vx*dt; const y = (p.y + Math.sin(t*3+p.ph)*6)|0; const x = p.x|0;
        const up = Math.sin(t*16+p.ph) > 0;
        ctx.fillStyle = "#120818";
        ctx.fillRect(x-1,y,3,2);
        if(up){ ctx.fillRect(x-4,y-2,3,1); ctx.fillRect(x+2,y-2,3,1); ctx.fillRect(x-2,y-1,1,1); ctx.fillRect(x+2,y-1,1,1); }
        else { ctx.fillRect(x-4,y+1,3,1); ctx.fillRect(x+2,y+1,3,1); }
        ctx.fillStyle = "#ffb030"; ctx.fillRect(x,y,1,1);
        dead = x < -14 || x > BG_W+14; break; }
      case "fog":
        p.x += p.vx*dt; ctx.fillStyle = "#b8a0e0"; ctx.globalAlpha = 0.14;
        ctx.fillRect(p.x|0, p.y|0, p.w, 2); ctx.fillRect((p.x+6)|0, (p.y-2)|0, p.w-12, 2); ctx.globalAlpha = 1;
        dead = p.x > BG_W; break;
      case "heart": {
        p.y += p.vy*dt; const x = (p.x + Math.sin(t*1.4+p.ph)*5)|0, y = p.y|0;
        ctx.fillStyle = p.c; ctx.fillRect(x-1,y,1,1); ctx.fillRect(x+1,y,1,1); ctx.fillRect(x-1,y+1,3,1); ctx.fillRect(x,y+2,1,1);
        dead = p.y < -6; break; }
      case "glint": {
        const v = Math.sin(t*p.sp+p.ph);
        if(v>0.7){ ctx.fillStyle = "#ffffff"; ctx.fillRect(p.x,p.y,v>0.95?2:1,1); }
        break; }
      case "gull": {
        p.x += p.vx*dt; const y = (p.y + Math.sin(t*2+p.ph)*3)|0, x = p.x|0; const up = Math.sin(t*8+p.ph)>0;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x,y,1,1); ctx.fillRect(x-1,up?y-1:y,1,1); ctx.fillRect(x+1,up?y-1:y,1,1); ctx.fillRect(x-2,up?y-2:y,1,1); ctx.fillRect(x+2,up?y-2:y,1,1);
        dead = x > BG_W+6; break; }
    }
    if(dead) P.splice(i,1);
  }
  /* Iluminación ambiental por mundo */
  if(key==="volcan"){
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.06 + 0.05*Math.sin(t*1.7);
    ctx.fillStyle = "#ff5a1a"; ctx.fillRect(0, BG_H*0.45, BG_W, BG_H*0.55);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  if(key==="hielo"){
    ctx.globalAlpha = 0.10 + 0.08*Math.sin(t*0.6);
    ctx.fillStyle = "#6affc8";
    for(let x=0;x<BG_W;x+=2){ const y = 44 + Math.sin(x/19+t*0.4)*10 + Math.sin(x/7+t)*2; ctx.fillRect(x, y|0, 2, 3); }
    ctx.globalAlpha = 1;
  }
  if(key==="halloween" || key==="navidad"){
    const flick = 0.5 + 0.5*Math.sin(t*9) * Math.sin(t*3.3);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.05 + 0.05*flick;
    ctx.fillStyle = key==="halloween" ? "#ff8a20" : "#ffd84a"; ctx.fillRect(0, BG_H*0.6, BG_W, BG_H*0.4);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
}

function bgLoop(now){
  const dt = Math.min(0.05, (now - (BG.last||now))/1000); BG.last = now; BG.t += dt;
  const ctx = BG.ctx;
  if(BG.key){
    const img = BG.imgs[BG.key];
    if(BG.fade < 1 && BG.prevKey){
      BG.fade = Math.min(1, (now - BG.fadeStart)/650);
      const prev = BG.imgs[BG.prevKey];
      if(prev.complete) ctx.drawImage(prev, 0, 0);
      const lv = Math.max(0, Math.min(15, Math.floor(BG.fade*16)));
      const tc = BG.tmpCtx;
      tc.globalCompositeOperation = "source-over"; tc.clearRect(0,0,BG_W,BG_H);
      if(img.complete) tc.drawImage(img, 0, 0);
      tc.globalCompositeOperation = "destination-in"; tc.drawImage(BG.masks[lv], 0, 0);
      tc.globalCompositeOperation = "source-over";
      ctx.drawImage(BG.tmp, 0, 0);
    }else{
      BG.fade = 1;
      if(img.complete) ctx.drawImage(img, 0, 0);
      bgDrawOverlay(ctx, BG.key, dt);
    }
  }
  requestAnimationFrame(bgLoop);
}

/* Mundo que debe verse según la pantalla actual */
function bgSyncWorld(){
  if(BG.cycle) return;
  let idx = (typeof game!=="undefined") ? game.world : 0;
  if(typeof currentSection!=="undefined" && currentSection==="pokedex" && UI.dexFilter>=0) idx = UI.dexFilter;
  bgSet(WORLD_KEYS[idx] || "bosque");
  if(typeof musicPlay==="function" && AU.ctx) musicPlay(WORLD_KEYS[idx] || "bosque");
}
