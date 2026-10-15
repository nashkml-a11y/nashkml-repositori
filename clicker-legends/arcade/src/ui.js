/* =====================================================
   INTERFAZ ARCADE
   Sustituye las funciones de presentación del original
   (render, renderStats, renderPokedex, toast, showEgg…).
   Muestra la misma información, con los mismos textos y los
   mismos botones (llaman a las mismas funciones de lógica).
===================================================== */

const UI = { dexFilter:-1, moreOpen:false, ready:false, hatchEgg:null, pressFx:null, get overlayOpen(){
  return !!document.querySelector(".eggOverlay:not(#autoEggSummaryOverlay)"); } };

const RARITY_ORDER = ["common","uncommon","rare","epic","legendary","mythic","divine"];
const WORLD_ICON = ["🌳","🏜️","❄️","🌋","🚀","🎃","🎄","💝","☀️"];

/* ---------- sprites e iconos ---------- */
function ico(key, size, cls){
  const a = ASSETS.icons[key];
  if(!a) return key ? '<span class="emo">'+key+'</span>' : "";
  const s = size || a.h;
  const w = Math.round(a.w * s / a.h);
  return '<img class="ico '+(cls||"")+'" src="'+a.src+'" width="'+w+'" height="'+s+'" alt="">';
}
function emojify(text, size){
  return String(text).replace(EMOJI_RE_G, m => ASSETS.icons[m] ? ico(m, size) : m);
}
const EMOJI_RE_G = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*/gu;

function petSprite(emoji, variant, scale, cls){
  const a = ASSETS.pets[emoji];
  if(!a) return '<span class="emo">'+emoji+'</span>';
  const k = scale || 2;
  return '<span class="spr '+(variant||"")+' '+(cls||"")+'"><img src="'+a.src+'" width="'+(a.w*k)+'" height="'+(a.h*k)+'" alt=""></span>';
}
/* Sprite que cabe en una caja (escala entera cuando es posible) */
function petFit(emoji, variant, box, cls){
  const a = ASSETS.pets[emoji]; if(!a) return '<span class="emo">'+emoji+'</span>';
  const k = Math.min(box / a.w, box / a.h, 4);
  return petSprite(emoji, variant, Math.round(k*100)/100, cls);
}
function eggSprite(w, e, scale, cls){
  const a = ASSETS.eggs[w+"-"+e] || ASSETS.eggs["0-0"];
  const k = scale || 2;
  return '<img class="eggSpr '+(cls||"")+'" src="'+a.src+'" width="'+(a.w*k)+'" height="'+(a.h*k)+'" alt="">';
}
function stripEmoji(name){ return String(name).replace(/^\S+\s+/, ""); }
function worldLabel(i){ return ico(WORLD_ICON[i], 20)+" "+escHTML(stripEmoji(worlds[i].name)); }
function fmtMult(m){ m = Number(m); return m >= 1000 ? (m/1000).toFixed(m%1000?1:0)+"K" : (Number.isInteger(m) ? String(m) : m.toFixed(2).replace(/0$/,"")); }
function bar(pct, cls){
  return '<div class="pbar '+(cls||"")+'"><i style="width:'+Math.max(0,Math.min(100,pct))+'%"></i></div>';
}
function petOrigin(emoji){
  if(!UI._origin){
    UI._origin = {};
    worlds.forEach((w,wi)=>w.eggs.forEach(egg=>egg[2].forEach(p=>{ if(UI._origin[p]===undefined) UI._origin[p] = wi; })));
  }
  return UI._origin[emoji];
}

/* ---------- avisos ---------- */
let toastTimer = null;
function toast(text){
  const x = $id("toast"); if(!x) return;
  x.innerHTML = '<span>'+emojify(escHTML(text), 18)+'</span>';
  x.classList.remove("hidden"); x.classList.remove("show"); void x.offsetWidth; x.classList.add("show");
  if(/^(❌|🔒)/.test(text)) sfx("error");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ x.classList.add("hidden"); x.classList.remove("show"); }, 1800);
}

function showConfirm(message, onConfirm){
  const existing = $id("customConfirmOverlay"); if(existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "customConfirmOverlay"; overlay.className = "modal";
  overlay.innerHTML =
    '<div class="panel dialog">'+
      '<div class="dlgTitle">¿CONTINUAR?</div>'+
      '<div class="dlgText">'+emojify(escHTML(message)).replace(/\n/g,"<br>")+'</div>'+
      '<button id="customConfirmYes" class="btn red">✅ SÍ, CONTINUAR</button>'+
      '<button id="customConfirmNo" class="btn">❌ CANCELAR</button>'+
    '</div>';
  overlay.querySelectorAll("button").forEach(b=>b.innerHTML = emojify(b.innerHTML, 18));
  document.body.appendChild(overlay);
  sfx("menu");
  $id("customConfirmYes").onclick = ()=>{ overlay.remove(); onConfirm(); };
  $id("customConfirmNo").onclick = ()=>{ overlay.remove(); sfx("menu"); };
}

function showSeasonNotice(){
  if($id("titleScreen")){ UI.pendingNotice = true; return; }   /* se muestra al salir del título */
  const season = getCurrentSeason();
  if(!season) return;
  if(hasSeenSeasonNotice(season.id)) return;
  const existing = $id("seasonNoticeOverlay"); if(existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "seasonNoticeOverlay"; overlay.className = "modal";
  const wi = worlds.findIndex(w=>w.seasonId===season.id);
  overlay.innerHTML =
    '<div class="panel dialog season" data-season="'+season.id+'">'+
      '<div class="seasonArt" style="background-image:url('+ASSETS.bg[WORLD_KEYS[wi]]+')"></div>'+
      '<div class="seasonIcon">'+ico(season.emoji, 44)+'</div>'+
      '<div class="dlgTitle gold">'+escHTML(season.noticeTitle)+'</div>'+
      '<div class="dlgText">'+escHTML(season.noticeText).replace(/\n/g,"<br>")+'</div>'+
      '<div class="seasonPets">'+season.pets.map(p=>petFit(p,"",56)).join("")+'</div>'+
      '<button class="btn gold" id="seasonNoticeBtn">¡ENTENDIDO!</button>'+
    '</div>';
  document.body.appendChild(overlay);
  sfx("unlock");
  $id("seasonNoticeBtn").onclick = ()=>{ markSeasonNoticeSeen(season.id); overlay.remove(); sfx("menu"); };
}

/* ---------- botón de clic ---------- */
function pulseClickButton(){
  const btn = $id("click"); if(!btn) return;
  btn.classList.remove("press"); void btn.offsetWidth; btn.classList.add("press");
  clearTimeout(btn._pressTimer);
  btn._pressTimer = setTimeout(()=>btn.classList.remove("press"), 160);
  sfx("tap");
}

function applyButtonSkin(){
  if(typeof ensureSkinsV2==="function") ensureSkinsV2();
  const btn = $id("click"); if(!btn || typeof game==="undefined") return;
  const skin = buttonSkinById(game.skins.button);
  btn.dataset.skin = skin.id;
  btn.dataset.aura = game.skins.aura || "none";
  const url = renderCoin(skin, 64);
  if(btn._coin !== url){ btn.style.backgroundImage = "url("+url+")"; btn._coin = url; }
  const icon = $id("clickIcon"); if(icon) icon.textContent = "";
}

/* ---------- orbe dorado ---------- */
function spawnGoldenOrb(){
  if($id("goldenOrb")) return;
  const o = document.createElement("div");
  o.id = "goldenOrb"; o.className = "goldenOrb";
  o.innerHTML = ico("🍀", 40)+'<i></i>';
  o.style.left = (15+fxRand()*65)+"%";
  o.style.top = (22+fxRand()*45)+"%";
  o.onclick = claimGoldenOrb;
  document.body.appendChild(o);
  sfx("coin");
  setTimeout(()=>{ if(o.parentNode) o.remove(); }, 9000);
}

/* ---------- HUD ligero (cada clic) ---------- */
function renderStats(){
  let w = W();
  $id("clicks").textContent = fmt(w.clicks);
  $id("clicksExact").textContent = Math.floor(w.clicks).toLocaleString("es-ES")+" exactos";
  $id("worldName").textContent = stripEmoji(worlds[game.world].name);
  setHTML($id("worldIcon"), ico(WORLD_ICON[game.world], 22));
  $id("intensity").textContent = w.intensity;
  $id("combo").textContent = w.comboUnlocked ? ("x"+w.combo) : "Bloqueado";
  $id("combo").classList.toggle("locked", !w.comboUnlocked);
  $id("crit").textContent = w.critLevel ? "5%" : "Bloqueado";
  $id("crit").classList.toggle("locked", !w.critLevel);
  $id("equipped").textContent = game.equipped.length+"/3";
  const clicksTxt = fmt(w.clicks);
  ["eggClicksHud","worldClicksHud","skinClicksHud"].forEach(id=>{ const el=$id(id); if(el) el.textContent = clicksTxt; });

  /* PODER DE CLIC — misma expresión que el original */
  let power=
  w.intensity*
  w.combo*
  petMultiplier()*
  (
  1+
  game.permanent.clicks*0.10
  )*
  (1+treeEffectSummary().clickBonus/100)*
  (1+(auraById(game.skins&&game.skins.aura).bonus||0)/100)*
  (1+(game.achievementBonus||0)/100)*
  ((game.clickBoostUntil&&game.clickBoostUntil>Date.now())?2:1);

  $id("clickPower").textContent = fmt(power);
  $id("clickPowerExact").textContent = "("+Math.floor(power).toLocaleString("es-ES")+" exactos)";
  cl2RenderCombo();
}

/* Medidor de combo (lee el estado; no lo modifica) */
function cl2RenderCombo(){
  const m = $id("comboMeter"); if(!m || typeof W!=="function") return;
  const w = W();
  if(!w.comboUnlocked){ m.classList.add("off"); setHTML(m, '<span class="cmLbl">COMBO BLOQUEADO</span>'); return; }
  m.classList.remove("off");
  const cur = Math.max(1, Math.min(5, w.combo||1));
  let pips = "";
  for(let i=1;i<=5;i++) pips += '<i class="'+(i<=cur?"on":"")+(i===5&&cur===5?" max":"")+'"></i>';
  if(cur===5 && (UI.lastCombo||1)<5){ const c=fxButtonCenter(); if(c){ fxText("¡COMBO x5!", c.x, c.y-c.r-6, { color:"#ff9a3c", big:true, life:1.1 }); fxRing(c.x,c.y,"#ff9a3c",c.r*1.6); } }
  UI.lastCombo = cur;
  setHTML(m, '<span class="cmLbl">COMBO</span><span class="pips">'+pips+'</span><span class="cmVal'+(cur===5?" max":"")+'">x'+cur+'</span><span class="cmTimer"><b id="comboTimer"></b></span>');
}
function cl2RenderCrit(){ /* El original no tiene elemento visible para esto. */ }
function cl2RenderLuck(){
  const e = $id("cl2LuckStatus"); if(!e || typeof game==="undefined") return;
  const leftTok = Math.max(0,(game.luckUntil||0)-Date.now());
  const leftAd = Math.max(0,(game.adLuckUntil||0)-Date.now());
  const left = Math.max(leftTok,leftAd);
  const box = $id("cl2LuckBox");
  if(left<=0){ e.textContent = "Suerte: inactiva"; if(box) box.classList.remove("on"); return; }
  const s = Math.ceil(left/1000), m = Math.floor(s/60), sec = s%60;
  const label = leftAd>leftTok ? "x3" : "x2";
  e.textContent = "Suerte "+label+": "+m+":"+String(sec).padStart(2,"0");
  if(box) box.classList.add("on");
}
/* Barra del temporizador de combo (2,5 s, igual que doClick) */
function comboTimerTick(){
  const el = $id("comboTimer"); if(!el || typeof W!=="function") return;
  const w = W();
  if(!w.comboUnlocked || currentSection!=="home"){ el.style.width = "0%"; return; }
  const left = comboPausedAt>0 ? 2500 : Math.max(0, 2500 - (Date.now()-lastClick));
  el.style.width = (left/2500*100)+"%";
}

/* ---------- tiempo ---------- */
function timeRewardButtonHTML(i,r,claimed,unlocked,progress){
  if(claimed) return '<button class="btn disabled">'+ico("✅",16)+' RECLAMADA</button>';
  if(unlocked) return '<button class="btn gold" onclick="claimTime('+i+')">'+ico("🎁",16)+' RECLAMAR</button>';
  return '<button class="btn disabled">'+ico("🔒",16)+' '+Math.floor(progress)+'%</button>';
}
function timeRewardItemHTML(i,r){
  const progress = Math.min(100, game.playSeconds/r[0]*100);
  const claimed = game.timeClaimed[i], unlocked = game.playSeconds>=r[0];
  const state = claimed?"claimed":(unlocked?"claimable":"locked");
  return '<div class="tr item '+state+'" data-state="'+state+'">'+
    '<div class="trHead">'+ico("⏱️",18)+' <b>'+r[1]+'</b></div>'+
    '<div class="small">'+emojify("🎁 "+timeRewardText(i,r),16)+'</div>'+
    bar(progress)+ timeRewardButtonHTML(i,r,claimed,unlocked,progress)+'</div>';
}
function renderTime(){
  const x = $id("time"); if(x) x.textContent = formatTime();
  const box = $id("timeRewards"); if(!box) return;
  const items = box.querySelectorAll(".tr");
  if(items.length!==timeRewards.length){
    box.innerHTML = timeRewards.map((r,i)=>timeRewardItemHTML(i,r)).join(""); return;
  }
  timeRewards.forEach((r,i)=>{
    const el = items[i];
    const progress = Math.min(100, game.playSeconds/r[0]*100);
    const claimed = game.timeClaimed[i], unlocked = game.playSeconds>=r[0];
    const state = claimed?"claimed":(unlocked?"claimable":"locked");
    const b = el.querySelector(".pbar i"); if(b) b.style.width = progress+"%";
    const btn = el.querySelector("button");
    if(el.dataset.state!==state){
      if(btn) btn.outerHTML = timeRewardButtonHTML(i,r,claimed,unlocked,progress);
      el.dataset.state = state; el.className = "tr item "+state;
    }else if(state==="locked" && btn){
      btn.innerHTML = ico("🔒",16)+" "+Math.floor(progress)+"%";
    }
  });
}

/* ---------- requisitos (mismo texto que el original) ---------- */
function renderWorldRequirements(){
  const box = $id("worldRequirements");
  if(!box||typeof game==="undefined"||typeof worlds==="undefined") return;
  const next = game.world+1;
  /* [U1] Los mundos de temporada no se desbloquean por requisitos: no son «el siguiente mundo» */
  if(next>=worlds.length || worlds[next].seasonal || worlds[game.world].seasonal){
    setHTML(box, "<b>"+ico("🏆",18)+" ¡Último mundo desbloqueado!</b>"+(worlds[game.world].seasonal?"":"<div class='small'>Los mundos de temporada se abren gratis durante su mes.</div>")); return; }
  const target = worlds[next];
  const need = cl3WorldCost(next);   /* [U1] coste real que exige travel(), no el nominal */
  let petText = "No necesaria";
  if(target.petRequired && typeof pets!=="undefined" && pets[target.petRequired]){
    petText = petSprite(target.petRequired,"",0.5,"inl")+" "+pets[target.petRequired][0]+(hasPet(target.petRequired)?" "+ico("✅",16):" "+ico("❌",16));
  }
  setHTML(box,
    '<div class="reqRow">'+ico("👆",18)+' Clics necesarios en <b>'+escHTML(stripEmoji(worlds[game.world].name))+'</b>: <b class="num">'+fmt(need)+'</b></div>'+
    '<div class="reqRow">'+ico("🔄",18)+' Renacimientos: <b class="num">'+(target.rebirthsRequired||0)+'</b></div>'+
    '<div class="reqRow">'+ico("🐾",18)+' Mascota: <b>'+petText+'</b></div>');
}
function renderRebirthRequirements(){
  const box = $id("rebirthRequirementsText");
  if(!box||typeof game==="undefined"||typeof W!=="function") return;
  const need = rebirthCost(), reward = rebirthTokenReward();
  const have = W().clicks, ready = have >= need;
  setHTML(box,
    '<div class="reqRow">'+ico("👆",18)+' Clics necesarios: <b class="num">'+fmt(need)+'</b> '+(ready?ico("✅",16):'<span class="muted">('+fmt(have)+' / '+fmt(need)+')</span>')+'</div>'+
    bar(Math.min(100, have/need*100), ready?"ok":"")+
    '<div class="reqRow">'+ico("✨",18)+' Tokens que recibirás: <b class="num gold">+'+reward+'</b></div>'+
    '<div class="small muted">El Renacimiento es la única forma de conseguir Tokens. Conservas mascotas, mundos y mejoras permanentes.</div>');
  const rb = $id("rebirthBtn"); if(rb) rb.classList.toggle("ready", ready);
}

/* ---------- tiendas ---------- */
function tokenTimer(ms, long){
  if(ms<=0) return "";
  const s = Math.ceil(ms/1000), h = Math.floor(s/3600), m = long ? Math.floor((s%3600)/60) : Math.floor(s/60), sec = s%60;
  return "Activo: "+(long&&h>0?h+"h ":"")+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
}
function renderTokenShop(){
  const box = $id("tokenShop"); if(!box) return;
  const luckLeft = Math.max(0,(game.luckUntil||0)-Date.now());
  const boostLeft = Math.max(0,(game.clickBoostUntil||0)-Date.now());
  const tokenBalance = game.tokens||0;
  const canLuck = tokenBalance>=20, canBoost = tokenBalance>=15, canEgg = tokenBalance>=30;
  const canAutoOpen = tokenBalance>=80 && !game.autoOpenEggs;
  setHTML(box,
    '<div class="item wide center">'+ico("🪙",20)+' <b>Tokens disponibles: <span class="num gold">'+fmt(tokenBalance)+'</span></b></div>'+
    shopItem("🍀","Suerte x2 — 1 hora","Duplica la suerte al abrir huevos.","tokLuckT",
      '<button class="btn '+(canLuck?"gold":"disabled")+'" onclick="'+(canLuck?"buyTokenItem(\'luckHour\')":"toast(\'❌ No tienes suficientes Tokens\')")+'">COMPRAR • 20 '+ico("✨",14)+'</button>')+
    shopItem("⚡","Turbo de clics x2 — 15 min","Duplica los clics que generas durante 15 minutos.","tokBoostT",
      '<button class="btn '+(canBoost?"":"disabled")+'" onclick="'+(canBoost?"buyTokenItem(\'clickBoost\')":"toast(\'❌ No tienes suficientes Tokens\')")+'">COMPRAR • 15 '+ico("✨",14)+'</button>')+
    shopItem("🥚","Huevo gratis del mundo actual","Abre un huevo aleatorio sin gastar Clics.","",
      '<button class="btn '+(canEgg?"":"disabled")+'" onclick="'+(canEgg?"buyTokenItem(\'freeEgg\')":"toast(\'❌ No tienes suficientes Tokens\')")+'">COMPRAR • 30 '+ico("✨",14)+'</button>')+
    shopItem("🤖","Auto-Apertura (bonus)","Marca la función como desbloqueada en tu partida. El control real está en la pestaña <b>Huevos</b> (botón Abrir automáticamente + resumen).","",
      '<button class="btn '+(game.autoOpenEggs?"disabled":(canAutoOpen?"gold":"disabled"))+'" onclick="'+(game.autoOpenEggs?"toast(\'✅ Ya desbloqueada\')":(canAutoOpen?"buyTokenItem(\'autoOpen\')":"toast(\'❌ Necesitas 80 Tokens\')"))+'">'+
        (game.autoOpenEggs?ico("✅",14)+" DESBLOQUEADA":"DESBLOQUEAR • 80 "+ico("✨",14))+'</button>'));
  const lt = $id("tokLuckT"); if(lt) lt.textContent = tokenTimer(luckLeft, true);
  const bt = $id("tokBoostT"); if(bt) bt.textContent = tokenTimer(boostLeft, true);
}
function shopItem(icon, title, desc, timerId, button){
  return '<div class="item shop"><div class="shopHead">'+ico(icon,26)+'<b>'+title+'</b></div>'+
    (timerId?'<div class="small timer" id="'+timerId+'"></div>':'')+
    '<div class="small">'+desc+'</div>'+button+'</div>';
}
function renderAdShop(){
  const box = $id("adShop"); if(!box) return;
  setHTML(box,
    shopItem("🍀","Suerte x3 — 10 minutos","La mejor suerte del juego al abrir huevos, gratis.","adLuckT",
      '<button class="btn gold" onclick="watchAdForLuck()">'+ico("📺",14)+' VER ANUNCIO</button>')+
    shopItem("⚡","Auto-Clicker x2 — 5 minutos",game.autoClicker.unlocked?"Duplica la velocidad del Auto-Clicker.":"Desbloquea el Auto-Clicker primero.","adSpeedT",
      '<button class="btn '+(game.autoClicker.unlocked?"":"disabled")+'" onclick="watchAdForSpeed()">'+ico("📺",14)+' VER ANUNCIO</button>'));
  const a = $id("adLuckT"); if(a) a.textContent = tokenTimer(Math.max(0,(game.adLuckUntil||0)-Date.now()), false);
  const b = $id("adSpeedT"); if(b) b.textContent = tokenTimer(Math.max(0,(game.adSpeedUntil||0)-Date.now()), false);
}

/* ---------- auto-apertura (misma lógica que el original) ---------- */
function updateAutoEggButton(){
  const cancel = $id("autoEggCancelBtn"), st = $id("autoOpenStatus");
  if(cancel){
    if(AUTO_EGG.active){ cancel.classList.remove("hidden"); cancel.style.display = "block"; }
    else { cancel.classList.add("hidden"); cancel.style.display = "none"; }
  }
  if(st){
    if(AUTO_EGG.active){
      const eggs = worlds[game.world] && worlds[game.world].eggs;
      const name = (eggs && eggs[AUTO_EGG.eggIndex]) ? eggs[AUTO_EGG.eggIndex][0] : "Huevo";
      st.innerHTML = ico("🤖",18)+" Abriendo <b>"+escHTML(stripEmoji(name))+"</b>… "+AUTO_EGG.opened+" abiertos · "+fmt(AUTO_EGG.spent)+" "+ico("👆",16)+" gastados";
    }else{
      st.innerHTML = "En cada huevo: <b>Abrir ×N</b> abre varios seguidos con animación. Puedes cancelar y ver el resumen.";
    }
  }
  document.querySelectorAll("[data-auto-egg-index]").forEach(btn=>{
    const idx = Number(btn.getAttribute("data-auto-egg-index"));
    const n = countAffordableEggs(idx);
    const label = btn.querySelector(".autoEggCount");
    if(label) label.textContent = n > 0 ? ("×"+n) : "×0";
    btn.disabled = AUTO_EGG.active || n <= 0;
    if(AUTO_EGG.active) btn.classList.add("disabled");
    else if(n > 0) btn.classList.remove("disabled");
    else btn.classList.add("disabled");
  });
}

function showAutoEggSummary(){
  const overlay = $id("autoEggSummaryOverlay"), title = $id("autoEggSummaryTitle");
  const meta = $id("autoEggSummaryMeta"), grid = $id("autoEggSummaryGrid");
  if(!overlay || !grid) return;
  if(AUTO_EGG.opened <= 0){ overlay.classList.add("hidden"); overlay.style.display = "none"; return; }
  const reasonText = {cancel:"Cancelaste la apertura", noclicks:"Se acabaron los clics", inventory:"Inventario lleno",
    error:"Se detuvo", stop:"Apertura finalizada"}[AUTO_EGG.stopReason] || "Apertura finalizada";
  if(title) title.innerHTML = ico("🥚",26)+" "+AUTO_EGG.opened+" huevos abiertos";
  if(meta) meta.innerHTML = reasonText+" · Gastados <b>"+fmt(AUTO_EGG.spent)+"</b> "+ico("👆",16)+
    "<br>"+ico("✨",16)+" Shinys: <b>"+AUTO_EGG.results.filter(r=>r.shiny).length+"</b>";
  const groups = {};
  AUTO_EGG.results.forEach(r=>{
    const gk = (r.shiny?"✨":"")+r.emoji;
    if(!groups[gk]) groups[gk] = {emoji:r.emoji, name:r.name, rarity:r.rarity, shiny:r.shiny, count:0, mult:r.mult};
    groups[gk].count++;
  });
  grid.innerHTML = Object.values(groups).map(g=>
    '<div class="sumCard r-'+g.rarity+(g.shiny?" isShiny":"")+'">'+
      petFit(g.emoji, g.shiny?"shiny":"", 48)+
      '<div class="small rname r-'+g.rarity+'">'+escHTML(g.name)+'</div>'+
      (g.shiny?'<div class="small shinyTxt">'+ico("✨",14)+' Shiny</div>':'')+
      '<div class="cnt">×'+g.count+'</div>'+
      '<div class="small">'+ico("⚡",14)+' x'+Number(g.mult).toFixed(2)+'</div>'+
    '</div>').join("");
  overlay.classList.remove("hidden"); overlay.style.display = "flex";
  sfx("claim");
}

/* ---------- animación de huevo: lógica idéntica, nueva escena ---------- */
function hatchEggKey(emoji, isAuto){
  const wi = game.world, eggs = worlds[wi].eggs;
  let ei = null;
  if(isAuto) ei = AUTO_EGG.eggIndex;
  else if(UI.hatchEgg && UI.hatchEgg[0]===wi) ei = UI.hatchEgg[1];
  if(ei===null || !eggs[ei] || !orderedEggPets(eggs[ei]).includes(emoji)){
    ei = Math.max(0, eggs.findIndex(e=>orderedEggPets(e).includes(emoji)));
  }
  UI.hatchEgg = null;
  return [wi, ei];
}

function showEgg(emoji, opts){
    opts = opts || {};
    const isAuto = !!opts.auto;
    const autoPrice = opts.price || 0;
    const p=pets[emoji];
    if(!p) {
      if(isAuto){ AUTO_EGG.busy=false; if(AUTO_EGG.active) openNextAutoEgg(); }
      return;
    }

    /* La variante Shiny se decide al abrir el huevo y queda fijada para
       que la tarjeta mostrada coincida con la recompensa reclamada. */
    const isShiny=Math.random()<shinyChance();

    const [ew, ee] = hatchEggKey(emoji, isAuto);
    let o=document.createElement("div");
    o.className="eggOverlay";
    o.dataset.eggPet=emoji;
    o.dataset.shiny=isShiny?"1":"0";
    o.dataset.auto=isAuto?"1":"0";
    o.dataset.autoPrice=String(autoPrice);

    const progress = isAuto ? (" · "+(AUTO_EGG.opened+1)) : "";
    o.innerHTML=
      '<div class="hatch">'+
        '<div class="hatchStage"><div class="hatchGlow"></div>'+
          '<div class="hatchEggWrap" id="egg">'+eggSprite(ew, ee, 4, "hatchEgg")+'<canvas class="cracks" width="26" height="32"></canvas></div>'+
          '<div class="hatchFlash" id="eggFlash"></div></div>'+
        '<h2 class="blinkSlow">ABRIENDO HUEVO...'+progress+'</h2>'+
        '<p>'+ico("✨",16)+' Algo poderoso está dentro...</p>'+
        (isAuto?'<button class="btn red" onclick="stopAutoEggSession(\'cancel\')">'+ico("⏹️",16)+' CANCELAR</button>':'')+
      '</div>';
    document.body.appendChild(o);
    const egg=o.querySelector("#egg");
    const flash=o.querySelector("#eggFlash");
    const cracks=o.querySelector(".cracks");
    const eggAsset = ASSETS.eggs[ew+"-"+ee] || ASSETS.eggs["0-0"];

    /* Tres sacudidas separadas (mismos tiempos que el original). */
    [0,250,500].forEach((delay,index)=>{
      setTimeout(()=>{
        if(!egg || !document.body.contains(egg)) return;
        egg.classList.remove("shake-1","shake-2","shake-3");
        void egg.offsetWidth;
        egg.classList.add("shake-"+(index+1));
        drawCracks(cracks, index+1);
        sfx("knock");
      },delay);
    });

    setTimeout(()=>{
      if(flash){ flash.classList.remove("active"); void flash.offsetWidth; flash.classList.add("active"); }
      drawCracks(cracks, 4);
      sfx("crack");
    },760);

    setTimeout(()=>{
      if(egg){
        egg.classList.remove("shake-1","shake-2","shake-3");
        egg.classList.add("explode");
        const r = egg.getBoundingClientRect();
        const cx = (r.left+r.width/2)/FX.S, cy = (r.top+r.height/2)/FX.S;
        fxBurst(cx, cy, { count:18, colors:eggAsset.pal || ["#ffffff","#f4ead4","#d8c8a8"], speed:90, gravity:120, life:0.9, size:3 });
        fxBurst(cx, cy, { count:14, colors:[rarityColor(isShiny?"shiny":p[3]),"#ffffff"], speed:120, gravity:0, life:0.6 });
        fxRing(cx, cy, "#ffffff", 50); fxFlash("#ffffff", 0.5); fxShake(2);
      }
    },1030);

    setTimeout(()=>{
      if(!document.body.contains(o)) return;
      const rarityClass=isShiny?"shiny":p[3];
      const rarityText=isShiny?"✨ Shiny":p[1];
      sfx("egg");
      if(isShiny || RARITY_ORDER.indexOf(p[3])>=3) setTimeout(()=>sfx("rare"), 180);

      o.innerHTML=
        '<div class="hatch">'+
          '<div class="revealCard r-'+rarityClass+'">'+
            '<div class="rays r-'+rarityClass+'"></div>'+
            '<div class="revealPet">'+petFit(emoji, isShiny?"shiny":"", 132)+'</div>'+
            '<div class="rarityBadge r-'+rarityClass+'">'+emojify(rarityText,16)+'</div>'+
            '<h2 class="r-'+rarityClass+'">'+escHTML(p[0])+'</h2>'+
            '<p>'+ico("⚡",16)+' Multiplicador: <b>x'+p[2]+'</b></p>'+
            (isShiny?'<p class="shinyTxt">'+ico("✨",16)+' ¡VARIANTE SHINY!</p>':'')+
            (isAuto
              ? '<p class="small">Auto '+(AUTO_EGG.opened+1)+' · siguiente en un momento…</p><button class="btn red" onclick="stopAutoEggSession(\'cancel\')">'+ico("⏹️",16)+' CANCELAR</button>'
              : '<button class="btn gold" onclick="claimEggFromOverlay()">'+ico("🐾",16)+' RECLAMAR MASCOTA</button>')+
          '</div>'+
        '</div>';

      const card=o.querySelector(".revealCard");
      if(card){ card.classList.add("pop"); setTimeout(()=>card.classList.remove("pop"),650); }
      const pr = card && card.querySelector(".revealPet").getBoundingClientRect();
      if(pr) fxBurst((pr.left+pr.width/2)/FX.S, (pr.top+pr.height/2)/FX.S, { count:16, colors:[rarityColor(rarityClass),"#ffffff","#ffd83c"], speed:80, gravity:40, life:0.9 });

      /* Modo auto: reclamar solo y continuar */
      if(isAuto){
        setTimeout(()=>{
          if(!document.body.contains(o)) return;
          if(!AUTO_EGG.active){
            claimEgg(emoji, isShiny);
            recordAutoEggResult(emoji, isShiny, autoPrice);
            o.remove();
            AUTO_EGG.busy = false;
            showAutoEggSummary();
            return;
          }
          claimEgg(emoji, isShiny);
          recordAutoEggResult(emoji, isShiny, autoPrice);
          o.remove();
          AUTO_EGG.busy = false;
          if(AUTO_EGG.active){
            setTimeout(()=>openNextAutoEgg(), 280);
          }else{
            showAutoEggSummary();
          }
        }, 850);
      }
    },1450);
}

function rarityColor(r){
  return {common:"#c8c8d8",uncommon:"#4cff91",rare:"#4aa8ff",epic:"#c86aff",legendary:"#ffd83c",mythic:"#ff4d7a",divine:"#42f0ff",shiny:"#fff36a"}[r] || "#ffffff";
}
function drawCracks(cv, level){
  if(!cv) return;
  const g = cv.getContext("2d");
  g.fillStyle = "#1a0e24";
  const paths = [
    [[13,8],[12,10],[14,12],[12,14]],
    [[6,16],[8,17],[7,19],[9,20],[8,22]],
    [[19,14],[17,16],[19,18],[18,20],[20,22]],
    [[13,4],[13,8],[10,6],[16,6],[12,14],[13,18],[11,21],[14,24]]
  ];
  for(let l=0;l<Math.min(level,4);l++) for(const [x,y] of paths[l]) g.fillRect(x,y,1,1);
}

/* =====================================================
   RENDER PRINCIPAL
===================================================== */
function render(){
  const soundBtn = $id("soundToggleBtn");
  if(soundBtn) soundBtn.innerHTML = soundOn() ? ico("🔊",18)+" SONIDO: ACTIVADO" : ico("🔇",18)+" SONIDO: SILENCIADO";
  renderSettingsExtra();
  let w = W();
  const elReb = $id("rebirths"); if(elReb) elReb.textContent = game.rebirths;
  const elTok = $id("tokens"); if(elTok) elTok.textContent = fmt(game.tokens);

  renderStats();

  /* MEJORAS */
  const ic = intensityCost(), cc = critCost(), fc = comboCost();
  setHTML($id("upgrades"),
    '<div class="item upg">'+ico("⚡",30)+'<div class="upgBody"><b>Intensidad de Clic — Nivel '+w.intensityLevel+'</b>'+
      '<div class="small">Cada mejora aumenta directamente la cantidad de Clics que genera cada clic.</div>'+
      '<button class="btn '+(w.clicks>=ic?"":"dim")+'" onclick="buyIntensity()">MEJORAR • '+fmt(ic)+' '+ico("👆",14)+'</button></div></div>'+
    '<div class="item upg">'+ico("💥",30)+'<div class="upgBody"><b>Crítico</b>'+
      '<div class="small">'+(w.critLevel?"Desbloqueado • 5% de probabilidad • x2":"Solo se puede desbloquear. No tiene mejoras.")+'</div>'+
      '<button class="btn '+(w.critLevel?"disabled":"")+'" onclick="buyCrit()">'+(w.critLevel?ico("✅",14)+" CRÍTICO DESBLOQUEADO":ico("💥",14)+" DESBLOQUEAR • "+fmt(cc)+" "+ico("👆",14))+'</button></div></div>'+
    '<div class="item upg">'+ico("🔥",30)+'<div class="upgBody"><b>Combo</b>'+
      '<div class="small">'+(w.comboUnlocked?"Desbloqueado • contador máximo x5":"Solo se puede desbloquear. No tiene mejoras.")+'</div>'+
      '<button class="btn '+(w.comboUnlocked?"disabled":"")+'" onclick="buyCombo()">'+(w.comboUnlocked?ico("✅",14)+" COMBO DESBLOQUEADO":ico("🔥",14)+" DESBLOQUEAR COMBO • "+fmt(fc)+" "+ico("👆",14))+'</button></div></div>');

  renderPets();

  /* HUEVOS */
  if(typeof updateAutoEggButton==="function") updateAutoEggButton();
  setHTML($id("eggList"), worlds[game.world].eggs.map((e,eggIndex)=>{
    const displayPrice = cl3EggCost(game.world,eggIndex,e[1]);
    const canN = countAffordableEggs(eggIndex);
    const ordered = orderedEggPets(e);
    return '<div class="item eggCard">'+
      '<div class="eggHead"><div class="eggPed">'+eggSprite(game.world, eggIndex, 3, "wobble")+'</div>'+
        '<div><h3>'+escHTML(stripEmoji(e[0]))+'</h3>'+
        '<div class="small">Precio: <b class="num gold">'+fmt(displayPrice)+'</b> '+ico("👆",14)+'</div>'+
        '<div class="small">Puedes abrir ahora: <b class="num">'+canN+'</b></div></div></div>'+
      '<div class="lineup">'+ordered.map(x=>'<div class="lu r-'+pets[x][3]+'">'+petFit(x,"",40)+'<div class="luN">'+escHTML(pets[x][0])+'</div><div class="luM">x'+pets[x][2]+'</div></div>').join("")+'</div>'+
      '<div class="btnRow"><button class="btn gold" onclick="UI.hatchEgg=['+game.world+','+eggIndex+'];openEgg(worlds['+game.world+'].eggs['+eggIndex+'],'+eggIndex+')">'+ico("🥚",14)+' ABRIR 1 • '+fmt(displayPrice)+' '+ico("👆",14)+'</button>'+
      '<button class="btn green '+(canN>0 && !AUTO_EGG.active ? "" : "disabled")+'" data-auto-egg-index="'+eggIndex+'" onclick="startAutoEggSession('+eggIndex+')" '+(canN<=0 || AUTO_EGG.active ? "disabled" : "")+'>'+
        (game.autoOpenEggs ? ico("🤖",14)+' ABRIR AUTO' : ico("🔒",14)+' AUTO (TIENDA)')+' <span class="autoEggCount">×'+canN+'</span></button></div>'+
    '</div>';
  }).join(""));

  /* MUNDOS */
  setHTML($id("worldList"), worlds.map((x,i)=>{
    const isSeasonal = !!x.seasonal;
    const seasonData = isSeasonal ? SEASONS[x.seasonId] : null;
    const seasonActive = isSeasonal && isSeasonActive(x.seasonId);
    const isSeasonalLocked = isSeasonal && !seasonActive;
    const clicks = (game.worlds[i] && game.worlds[i].clicks) ? game.worlds[i].clicks : 0;
    const alreadyUnlocked = game.unlocked.includes(i);
    const sEmoji = seasonData ? seasonData.emoji : "🔒";
    const sName = seasonData ? seasonData.name : "Temporada";
    const here = game.world===i;
    const desc = isSeasonal
      ? (seasonActive ? emojify(sEmoji,16)+" Mundo temporal de "+sName+". Disponible solo durante su temporada."
                      : ico("🔒",16)+" <b>Exclusivo de la actualización de "+sName+"</b><br>Disponible durante su mes en el Mundo de "+sName+".")
      : (i===0 ? ico("🌳",16)+" Mundo inicial."
               : ico("🔒",16)+" Necesitas "+fmt(cl3WorldCost(i))+" Clics en el mundo anterior"+
                 (x.rebirthsRequired?" • "+ico("🔄",16)+" "+x.rebirthsRequired+" Renacimientos":"")+
                 (x.petRequired?" • "+ico("🐾",16)+" "+petSprite(x.petRequired,"",0.5,"inl")+" "+(pets[x.petRequired]?pets[x.petRequired][0]:""):"")+".");
    const label = here ? ico("✅",14)+" ESTÁS AQUÍ"
      : (isSeasonalLocked ? ico("🔒",14)+" EXCLUSIVO DE "+sName.toUpperCase()
        : (seasonActive && !alreadyUnlocked ? emojify(sEmoji,14)+" ENTRAR AL MUNDO DE "+sName.toUpperCase()
          : (alreadyUnlocked ? ico("🌎",14)+" VIAJAR" : ico("🔒",14)+" DESBLOQUEAR")));
    const onclick = isSeasonalLocked ? "toast('"+sEmoji+" Exclusivo de la actualización de "+sName+" — Disponible en su mes')" : "travel("+i+")";
    return '<div class="item worldCard '+(here?"here":"")+' '+(isSeasonalLocked?"sealed":"")+'">'+
      '<div class="worldThumb" style="background-image:url('+ASSETS.bg[WORLD_KEYS[i]]+')"><span class="wtName">'+worldLabel(i)+'</span>'+
        (isSeasonal ? (seasonActive ? '<span class="chip legendary">ACTIVO</span>' : '<span class="chip">'+ico("🔒",12)+' EXCLUSIVO</span>') : "")+'</div>'+
      '<div class="small">'+ico("👆",16)+' Clics guardados: <b class="num">'+fmt(clicks)+'</b></div>'+
      '<div class="small">'+desc+'</div>'+
      '<button class="btn '+(isSeasonalLocked?"disabled":(here?"":"gold"))+'" onclick="'+onclick+'">'+label+'</button>'+
    '</div>';
  }).join(""));

  /* RACHA */
  $id("streak").textContent = game.streak;
  const d = ((game.streak-1)%7)+1;
  setHTML($id("week"), [1,2,3,4,5,6,7].map(x=>
    '<div class="day '+(x<d?"done":"")+' '+(x===d?"today":"")+'"><span>DÍA '+x+'</span>'+ico(x===7?"💎":"🎁", 22)+(x<d?'<i class="tick">'+ico("✅",12)+'</i>':'')+'</div>').join(""));
  const sr = streakReward();
  setHTML($id("streakBox"),
    '<div class="center"><b>'+(sr.weekly ? ico("💎",18)+" RECOMPENSA ESPECIAL DEL DÍA 7" : ico("🎁",18)+" "+fmt(sr.clicks)+" "+ico("👆",16))+'</b></div>'+
    (game.streakClaimed ? '<button class="btn disabled">'+ico("✅",14)+' RECLAMADA</button>'
                        : '<button class="btn gold pulse" onclick="claimStreak()">'+ico("🔥",14)+' RECLAMAR RECOMPENSA</button>'));

  /* RENACIMIENTO */
  $id("rebirths").textContent = game.rebirths;
  $id("tokens").textContent = game.tokens;
  setHTML($id("permanent"),
    '<div class="item upg">'+ico("⚡",30)+'<div class="upgBody"><b>Más Clics — Nivel '+game.permanent.clicks+'</b>'+
    '<div class="small">+10 % de clics por nivel.</div>'+
    '<button class="btn gold" onclick="buyPermanent(\'clicks\')">MEJORAR • '+permanentCost("clicks")+' '+ico("✨",14)+'</button></div></div>');

  /* AUTO-CLICKER */
  const autoBox = $id("autoClickerBox");
  if(autoBox){
    const ac = game.autoClicker;
    if(!ac.unlocked){
      setHTML(autoBox, '<div class="item upg">'+ico("🤖",30)+'<div class="upgBody">Desbloquéalo para que el juego siga produciendo clics por sí solo.'+
        '<button class="btn gold" onclick="unlockAutoClicker()">'+ico("🤖",14)+' DESBLOQUEAR • '+AUTO_UNLOCK_COST+' '+ico("✨",14)+'</button></div></div>');
    }else{
      const intMaxed = ac.intensityLevel>=AUTO_MAX_LEVEL, spdMaxed = ac.speedLevel>=AUTO_MAX_LEVEL;
      const lv = n=>'<span class="lvPips">'+Array.from({length:AUTO_MAX_LEVEL},(_,k)=>'<i class="'+(k<n?"on":"")+'"></i>').join("")+'</span>';
      setHTML(autoBox,
        '<div class="item center robo">'+ico("🤖",30)+' Produciendo <b class="num gold">+'+fmt(autoClickAmount())+'</b> '+ico("👆",14)+' cada <b class="num">'+(autoClickInterval()/1000).toFixed(1)+'s</b>'+
        '<div class="small">Probabilidad reducida de '+ico("💥",14)+' Crítico (~1 %) y '+ico("🔥",14)+' Combo (~15 %) si los tienes desbloqueados.</div></div>'+
        '<div class="item">'+ico("⚡",18)+' Intensidad — Nivel '+ac.intensityLevel+'/'+AUTO_MAX_LEVEL+lv(ac.intensityLevel)+
        '<button class="btn '+(intMaxed?"disabled":"")+'" onclick="upgradeAutoIntensity()">'+(intMaxed?ico("✅",14)+" MÁXIMO":"MEJORAR • "+autoLevelCost(ac.intensityLevel)+" "+ico("✨",14))+'</button></div>'+
        '<div class="item">'+ico("🚀",18)+' Velocidad — Nivel '+ac.speedLevel+'/'+AUTO_MAX_LEVEL+lv(ac.speedLevel)+
        '<button class="btn '+(spdMaxed?"disabled":"")+'" onclick="upgradeAutoSpeed()">'+(spdMaxed?ico("✅",14)+" MÁXIMO":"MEJORAR • "+autoLevelCost(ac.speedLevel)+" "+ico("✨",14))+'</button></div>');
    }
  }

  /* MISIONES */
  setHTML($id("missionList"), missions.map(m=>{
    const progress = missionProgress(m), pct = Math.min(100, progress/m.goal*100);
    const claimed = !!game.missionsClaimed[m.id], complete = progress>=m.goal;
    return '<div class="item quest '+(claimed?"claimed":complete?"ready":"")+'">'+
      '<div class="qHead">'+ico(m.icon,26)+'<h3>'+escHTML(m.name)+'</h3></div>'+
      '<div class="small">'+fmt(Math.min(progress,m.goal))+' / '+fmt(m.goal)+'<br>'+ico("🎁",14)+' Recompensa: <b>'+emojify(missionRewardText(m.reward),14)+'</b></div>'+
      bar(pct, complete?"ok":"")+
      (claimed ? '<button class="btn disabled">'+ico("✅",14)+' RECLAMADA</button>'
        : complete ? '<button class="btn gold pulse" onclick="claimMission(\''+m.id+'\')">'+ico("🎁",14)+' RECLAMAR RECOMPENSA</button>'
        : '<button class="btn disabled">'+ico("🔒",14)+' '+Math.floor(pct)+'%</button>')+
    '</div>';
  }).join(""));

  /* ESTADÍSTICAS */
  const row = (i,l,v)=>'<div class="hsRow">'+ico(i,22)+'<span>'+l+'</span><b class="num">'+v+'</b></div>';
  setHTML($id("statistics"),
    row("🔥","Racha",game.streak)+row("⏱️","Tiempo jugado",formatTime())+row("👆","Clics totales",fmt(game.totalClicks))+
    row("💥","Críticos",game.criticals)+row("🥚","Huevos abiertos",game.eggs)+row("✨","Fusiones",game.fusions)+
    row("🔥","Mejor combo","x"+w.bestCombo)+row("🔄","Renacimientos",game.rebirths)+
    row("🐾","Multiplicador de mascotas actual","x"+petMultiplier().toFixed(2)));

  renderTime();
  syncPetDiscoveries();
  renderPokedex();
  renderAchievements();
  renderTokenShop();
  renderAdShop();
  renderUpgradeTree();
  applyButtonSkin();
  renderSkins();
  try{ renderWorldRequirements(); }catch(e){}
  try{ renderRebirthRequirements(); }catch(e){}
  uiAfterRender();
}

/* ---------- mascotas ---------- */
function renderPets(){
  let normalPetKeys = Object.keys(game.pets).filter(k=>(game.pets[k]||0)>0);
  let shinyPetKeys = Object.keys(game.shinyPets||{}).filter(k=>(game.shinyPets[k]||0)>0);
  const sortPetKeys=(arr, shiny=false)=>arr.sort((a,b)=>{
    if(game.petSort==="favorite") return Number(petFavorite(b))-Number(petFavorite(a)) || (shiny?shinyMultiplier(b)-shinyMultiplier(a):multiplier(b)-multiplier(a));
    if(game.petSort==="multDesc") return (shiny?shinyMultiplier(b):multiplier(b))-(shiny?shinyMultiplier(a):multiplier(a));
    if(game.petSort==="multAsc") return (shiny?shinyMultiplier(a):multiplier(a))-(shiny?shinyMultiplier(b):multiplier(b));
    if(game.petSort==="levelDesc" || game.petSort==="levelAsc"){
      let la=Number(a.split("|||").pop()), lb=Number(b.split("|||").pop());
      return game.petSort==="levelDesc" ? lb-la : la-lb;
    }
    if(game.petSort==="rarity") return (shiny?shinyMultiplier(b):multiplier(b))-(shiny?shinyMultiplier(a):multiplier(a));
    return 0;
  });
  normalPetKeys = sortPetKeys(normalPetKeys,false);
  shinyPetKeys = sortPetKeys(shinyPetKeys,true);

  const actions = (k, delFn)=>'<div class="petActionRow">'+
    '<button class="mini '+(petFavorite(k)?"on":"")+'" onclick="togglePetFavorite(\''+k+'\')">'+(petFavorite(k)?ico("⭐",14)+" FAVORITA":"☆ FAVORITA")+'</button>'+
    '<button class="mini '+(petLocked(k)?"on lock":"")+'" onclick="togglePetLock(\''+k+'\')">'+(petLocked(k)?ico("🔒",14)+" PROTEGIDA":ico("🔓",14)+" PROTEGER")+'</button>'+
    '<button class="mini del" onclick="'+delFn+'(\''+k+'\')">'+ico("🗑️",14)+' ELIMINAR 1</button></div>';

  const normalHtml = normalPetKeys.map(k=>{
    const parts = k.split("|||"), e = parts[0], l = Number(parts[1]), p = pets[e];
    if(!p || !game.pets[k]) return "";
    const multi = multiplier(k), equippedCount = game.equipped.filter(x=>x===k).length, owned = game.pets[k];
    const canEquipMore = equippedCount<owned && game.equipped.length<3, canUnequip = equippedCount>0;
    return '<div class="item petCard r-'+p[3]+(equippedCount?" eq":"")+'">'+
      '<div class="petPic">'+petFit(e,"",64)+(equippedCount?'<span class="eqTag">EQ</span>':'')+'</div>'+
      '<div class="petInfo"><b>'+escHTML(p[0])+'</b>'+(l>0?" "+ico("✨",14)+" Nivel "+(l+1):"")+
        '<div><span class="chip r-'+p[3]+'">'+p[1]+'</span> <span class="mult r-'+p[3]+'">'+ico("⚡",14)+' x'+multi.toFixed(2)+'</span></div>'+
        '<div class="small">Cantidad: <b>'+owned+'</b> · Equipadas: <b>'+equippedCount+'/'+owned+'</b><br>Cada una multiplica tus Clics por <b>x'+multi.toFixed(2)+'</b></div>'+
        '<div class="btnRow">'+
          '<button class="btn '+(canEquipMore?"":"disabled")+'" onclick="equipUnit(\''+e+'\','+l+')">'+ico("🐾",14)+' EQUIPAR'+(owned>1?" ("+equippedCount+"/"+owned+")":"")+'</button>'+
          (canUnequip?'<button class="btn red" onclick="unequipUnit(\''+e+'\','+l+')">'+ico("❌",14)+' QUITAR 1</button>':'')+
          (game.pets[k]>=CL3_BALANCE.fusionNormalRequired?'<button class="btn green" onclick="fuse(\''+e+'\','+l+')">'+ico("🌟",14)+' FUSIONAR 5 → DORADA</button>':'')+
        '</div>'+actions(k,"deletePetUnit")+'</div></div>';
  });

  const goldenPetKeys = Object.keys(game.goldenPets||{}).filter(k=>(game.goldenPets[k]||0)>0);
  goldenPetKeys.sort((a,b)=>goldenMultiplier(b)-goldenMultiplier(a));
  const goldenHtml = goldenPetKeys.map(gk=>{
    const base = goldenBaseKey(gk), parts = base.split("|||"), e = parts[0], l = Number(parts[1]||0), p = pets[e];
    const owned = game.goldenPets[gk]||0;
    if(!p || !owned) return "";
    const eq = game.equipped.filter(x=>x===gk).length, multi = goldenMultiplier(gk);
    return '<div class="item petCard golden r-'+p[3]+(eq?" eq":"")+'">'+
      '<div class="petPic">'+petFit(e,"golden",64)+(eq?'<span class="eqTag">EQ</span>':'')+'</div>'+
      '<div class="petInfo"><b>'+escHTML(p[0])+' <span class="varTag gold">DORADA</span></b>'+
        '<div><span class="chip r-'+p[3]+'">'+p[1]+'</span> <span class="mult r-'+p[3]+'">'+ico("⚡",14)+' x'+multi.toFixed(2)+'</span></div>'+
        '<div class="small">Cantidad: <b>'+owned+'</b> · Equipadas: <b>'+eq+'/'+owned+'</b><br>5 Doradas iguales → 1 Shiny</div>'+
        '<div class="btnRow">'+
          '<button class="btn '+(eq<owned&&game.equipped.length<3?"gold":"disabled")+'" onclick="equipGoldenUnit(\''+e+'\','+l+')">'+ico("🌟",14)+' EQUIPAR DORADA</button>'+
          (eq>0?'<button class="btn red" onclick="unequipGoldenUnit(\''+e+'\','+l+')">'+ico("❌",14)+' QUITAR 1</button>':'')+
          (owned>=CL3_BALANCE.fusionGoldenRequired?'<button class="btn green" onclick="fuse(\''+e+'\','+l+')">'+ico("✨",14)+' FUSIONAR 5 → SHINY</button>':'')+
        '</div>'+actions(gk,"deleteGoldenUnit")+'</div></div>';
  });

  const shinyHtml = shinyPetKeys.map(sk=>{
    const owned = game.shinyPets[sk]||0; if(!owned) return "";
    const base = shinyBaseKey(sk), parts = base.split("|||"), e = parts[0], l = Number(parts[1]||0), p = pets[e];
    if(!p) return "";
    const eq = game.equipped.filter(x=>x===sk).length, multi = shinyMultiplier(sk);
    return '<div class="item petCard shinyCard r-'+p[3]+(eq?" eq":"")+'">'+
      '<div class="petPic">'+petFit(e,"shiny",64)+(eq?'<span class="eqTag">EQ</span>':'')+'</div>'+
      '<div class="petInfo"><b>'+escHTML(p[0])+' <span class="varTag shiny">SHINY</span></b>'+
        '<div><span class="chip r-'+p[3]+'">'+p[1]+'</span> <span class="mult r-'+p[3]+'">'+ico("⚡",14)+' x'+multi.toFixed(2)+'</span></div>'+
        '<div class="small">Cantidad: <b>'+owned+'</b> · Equipadas: <b>'+eq+'/'+owned+'</b></div>'+
        '<div class="btnRow">'+
          '<button class="btn '+(eq<owned&&game.equipped.length<3?"":"disabled")+'" onclick="equipShinyUnit(\''+e+'\','+l+')">'+ico("✨",14)+' EQUIPAR SHINY</button>'+
          (eq>0?'<button class="btn red" onclick="unequipShinyUnit(\''+e+'\','+l+')">'+ico("❌",14)+' QUITAR 1</button>':'')+
        '</div>'+actions(sk,"deleteShinyUnit")+'</div></div>';
  });

  const n = normalHtml.join(""), g = goldenHtml.join(""), s = shinyHtml.join("");
  const ph = game.petSort==="shiny" ? s+g+n : n+g+s;
  const sortSelect = $id("petSortSelect"); if(sortSelect) sortSelect.value = game.petSort||"favorite";
  setHTML($id("petList"), ph || "<div class='small center'>Todavía no tienes mascotas.</div>");

  /* Equipo actual (resumen visual de game.equipped) */
  setHTML($id("teamBar"), [0,1,2].map(i=>{
    const k = game.equipped[i];
    if(!k) return '<div class="slot empty">'+ico("🐾",22,"faint")+'</div>';
    const variant = isShinyKey(k) ? "shiny" : (isGoldenKey(k) ? "golden" : "");
    const base = isShinyKey(k) ? shinyBaseKey(k) : (isGoldenKey(k) ? goldenBaseKey(k) : k);
    const e = base.split("|||")[0];
    return '<div class="slot r-'+(pets[e]?pets[e][3]:"common")+'">'+petFit(e, variant, 52)+'<span class="slotM">x'+multiplier(k).toFixed(2)+'</span></div>';
  }).join("")+'<div class="teamTotal"><span>TOTAL</span><b class="num gold">x'+(petMultiplier()>=1e4?fmt(petMultiplier()):petMultiplier().toFixed(2))+'</b></div>');

  const inv = totalPetInventory();
  const cnt = $id("petInvCount"), bar2 = $id("petInvBar");
  if(cnt) cnt.textContent = inv;
  if(bar2){
    bar2.style.width = Math.min(100, inv/MAX_PET_INVENTORY*100)+"%";
    bar2.className = inv >= MAX_PET_INVENTORY ? "full" : (inv >= MAX_PET_INVENTORY*0.85 ? "warn" : "");
  }
}

/* ---------- bestiario ---------- */
function dexSetFilter(i){ UI.dexFilter = i; sfx("menu"); renderPokedex(); bgSyncWorld(); }
function renderPokedex(){
  const box = $id("pokedexList"); if(!box) return;
  function getPetSeason(emoji){
    for(const key in SEASONS){ if(SEASONS[key].pets && SEASONS[key].pets.includes(emoji)) return SEASONS[key]; }
    return null;
  }
  const chips = [-1].concat(worlds.map((_,i)=>i)).map(i=>{
    const label = i<0 ? ico("🐾",20)+" Todas" : worldLabel(i);
    return '<button class="dexChip '+(UI.dexFilter===i?"on":"")+'" data-w="'+(i<0?"all":WORLD_KEYS[i])+'" onclick="dexSetFilter('+i+')">'+label+'</button>';
  }).join("");
  setHTML($id("dexFilters"), chips);
  let entries = Object.entries(pets);
  if(UI.dexFilter>=0) entries = entries.filter(([e])=>petOrigin(e)===UI.dexFilter);
  box.innerHTML = entries.map(([emoji,p])=>{
    const ownedKeys = Object.keys(game.pets||{}).filter(k=>k.startsWith(emoji+"|||") && (game.pets[k]||0)>0);
    const currentlyOwned = ownedKeys.length>0 || hasPet(emoji);   /* [U3] incluye Doradas y Shiny */
    const discovered = !!(game.petsDiscovered && game.petsDiscovered[emoji]) || currentlyOwned;
    const shinyCount = Object.entries(game.shinyPets||{}).filter(([k,v])=>k.includes("|||"+emoji+"|||")&&v>0).reduce((a,[k,v])=>a+v,0);
    const highestLevel = ownedKeys.length ? Math.max(...ownedKeys.map(k=>Number(k.split("|||")[1]||0)+1)) : (currentlyOwned ? 1 : 0);
    const petSeason = getPetSeason(emoji);
    const seasonLocked = petSeason && !isSeasonActive(petSeason.id) && !discovered;
    const ow = petOrigin(emoji);
    const worldChip = '<span class="wchip">'+ico(WORLD_ICON[ow],16)+' '+escHTML(stripEmoji(worlds[ow].name))+'</span>';
    if(seasonLocked){
      return '<div class="dexCard missing">'+petFit(emoji,"silhouette",104)+'<h3>'+escHTML(p[0])+'</h3>'+
        '<span class="chip">'+emojify(petSeason.emoji,14)+' '+petSeason.name+'</span>'+
        '<div class="small warnTxt">'+ico("🔒",14)+' Exclusivo de la actualización de '+petSeason.name+'<br>Disponible durante su mes en el Mundo de '+petSeason.name+'</div></div>';
    }
    if(!discovered){
      return '<div class="dexCard missing">'+petFit(emoji,"silhouette",104)+'<h3>???</h3><span class="chip">Desconocida</span>'+
        '<div class="small">'+ico("🔒",14)+' Todavía no descubierta</div>'+worldChip+'</div>';
    }
    return '<div class="dexCard r-'+p[3]+'">'+petFit(emoji,"",104)+'<h3>'+escHTML(p[0])+'</h3>'+
      '<div class="rname r-'+p[3]+'">'+p[1]+'</div>'+
      '<div class="mult big r-'+p[3]+'">'+ico("⚡",18)+' ×'+fmtMult(p[2])+'</div>'+
      worldChip+
      '<div class="small">Nivel máximo: <b>'+highestLevel+'</b></div>'+
      '<div class="small">'+ico("✅",14)+' Descubierta '+(shinyCount?'· '+ico("✨",14)+' Shiny x'+shinyCount:'')+(currentlyOwned?"":" · (sin copias actuales)")+'</div></div>';
  }).join("");
  const c = $id("dexCount"); if(c) c.textContent = entries.length+" mascotas";
}

/* ---------- logros ---------- */
function renderAchievements(){
  const box = $id("achievementList"); if(!box) return;
  setHTML(box, achievements.map(a=>{
    const progress = achievementProgress(a), pct = Math.min(100, progress/a.goal*100);
    const claimed = !!game.achievementsClaimed[a.id], complete = progress>=a.goal;
    return '<div class="item quest trophy '+(claimed?"claimed":complete?"ready":"")+'">'+
      '<div class="qHead"><span class="medal">'+ico(a.icon,26)+'</span><h3>'+escHTML(a.name)+'</h3></div>'+
      '<div class="small">'+fmt(Math.min(progress,a.goal))+' / '+fmt(a.goal)+'<br><span class="gold">'+ico("🎁",14)+' +'+a.reward+'% de clics permanente</span></div>'+
      bar(pct, complete?"ok":"")+
      (claimed ? '<button class="btn disabled">'+ico("✅",14)+' CONSEGUIDO</button>'
        : complete ? '<button class="btn gold pulse" onclick="claimAchievement(\''+a.id+'\')">'+ico("🏆",14)+' RECLAMAR LOGRO</button>'
        : '<button class="btn disabled">'+ico("🔒",14)+' '+Math.floor(pct)+'%</button>')+
    '</div>';
  }).join(""));
}

/* ---------- árbol de mejoras (mismo lienzo 1200x900 y mismas posiciones) ---------- */
function renderUpgradeTree(){
  const box = $id("upgradeTreeBox"); if(!box) return;
  const eff = treeEffectSummary();
  const lines = upgradeNodes.filter(n=>n.parent).map(n=>{
    const a = upgradePos[n.parent], b = upgradePos[n.id];
    const x1 = a[0]+95, y1 = a[1]+52, x2 = b[0]+95, y2 = b[1]+52, my = (y1+y2)/2;
    return '<polyline class="treeLine '+(treeHas(n.id)?"active":"")+'" points="'+x1+','+y1+' '+x1+','+my+' '+x2+','+my+' '+x2+','+y2+'"></polyline>';
  }).join("");
  const nodes = upgradeNodes.map(n=>{
    const pos = upgradePos[n.id];
    const purchased = treeHas(n.id), unlocked = treeUnlocked(n), root = n.id==="root";
    const ic = n.name.match(EMOJI_RE_G);
    return '<div class="treeNode '+(purchased?"purchased":"")+' '+(!unlocked&&!purchased?"locked":"")+' b-'+n.branch+'" style="left:'+pos[0]+'px;top:'+pos[1]+'px">'+
      '<h3>'+(ic?ico(ic[0],22)+" ":"")+escHTML(stripEmoji(n.name))+'</h3><div class="treeMini">'+escHTML(n.desc)+'</div>'+
      (root ? '<div class="treeMini">Puedes invertir en las tres ramas libremente.</div>'
        : '<div class="treeCost">'+ico("🪙",16)+' '+cl3UpgradeCost(n)+' Tokens</div>'+
          '<button class="btn '+(purchased||!unlocked?"disabled":"gold")+'" onclick="buyUpgrade(\''+n.id+'\')">'+
          (purchased?ico("✅",14)+" DESBLOQUEADA":!unlocked?ico("🔒",14)+" BLOQUEADA":ico("🌳",14)+" DESBLOQUEAR")+'</button>')+
    '</div>';
  }).join("");
  box.innerHTML =
    '<div class="upgradeTreePanel" id="upgradeTreePanel">'+
      '<div class="treeToolbar"><b>'+ico("🪙",18)+' Tokens: <span class="num gold">'+fmt(game.tokens)+'</span></b>'+
        '<button class="btn sq" onclick="treeZoom(-.15)">−</button><button class="btn sq" onclick="treeZoom(.15)">+</button>'+
        '<button class="btn" onclick="treeResetView()">'+ico("🎯",14)+' Centrar</button><button class="btn" onclick="treeToggleMin()">▣ Minimizar</button></div>'+
      '<div class="small">Puedes arrastrar el árbol, hacer zoom con los botones o con la rueda/pellizco. Puedes comprar mejoras en las tres ramas, sin límite.</div>'+
      '<div class="treeViewport" id="treeViewport"><div class="treeCanvas" id="treeCanvas">'+
        '<svg class="treeLines" viewBox="0 0 1200 900" shape-rendering="crispEdges">'+lines+'</svg>'+nodes+'</div></div>'+
      '<div class="item"><b>'+ico("📈",18)+' Efectos actuales</b><div class="small">'+
        ico("👆",14)+' Clics: +'+eff.clickBonus+'% · '+ico("🥚",14)+' Suerte: +'+eff.eggLuck+'% · '+ico("🐾",14)+' Mascotas: +'+eff.petBonus+'% · '+ico("✨",14)+' Shiny: +'+eff.shinyBonus+'%</div></div>'+
    '</div>';
  treeResetView();
}

/* ---------- skins ---------- */
function skinCardHTML_V2(kind,item){
  const ownedKey = kind==="button"?"ownedButtons":"ownedEffects";
  const owned = (game.skins[ownedKey]||[]).includes(item.id);
  const equipped = game.skins[kind]===item.id;
  const seasonLocked = item.season && !isSeasonActive(item.season) && !owned;
  let action;
  if(equipped) action = '<button class="btn disabled">'+ico("⭐",14)+' EQUIPADA</button>';
  else if(owned) action = '<button class="btn green" onclick="equipSkin(\''+kind+'\',\''+item.id+'\')">'+ico("✅",14)+' EQUIPAR</button>';
  else if(seasonLocked){
    const s = SEASONS[item.season];
    action = '<button class="btn disabled">'+ico("🔒",14)+' EXCLUSIVO '+(s?s.name:"TEMPORADA").toUpperCase()+'</button><div class="small warnTxt">Disponible en su temporada</div>';
  }else action = '<button class="btn gold" onclick="buySkin(\''+kind+'\',\''+item.id+'\')">'+ico("🔒",14)+' '+(item.price===0?"GRATIS":fmt(item.price)+" "+ico("👆",14))+'</button>';
  const sLabel = item.season && SEASONS[item.season] ? emojify(SEASONS[item.season].emoji,14)+" "+SEASONS[item.season].name : "";
  const prev = kind==="button" ? renderCoin(item, 64) : renderEffectPreview(item);
  return '<div class="skinCard '+(equipped?"equipped":"")+' '+(seasonLocked?"sealed":"")+'">'+
    '<div class="skinPrev"><img src="'+prev+'" width="'+(kind==="button"?96:96)+'" height="96" alt=""></div>'+
    '<b>'+escHTML(item.name)+'</b>'+(item.season && !owned ? '<div class="small seasonTxt">'+sLabel+'</div>' : "")+action+'</div>';
}
function auraCardHTML_V2(item){
  const owned = (game.skins.ownedAuras||[]).includes(item.id);
  const equipped = game.skins.aura===item.id;
  const seasonLocked = item.season && !isSeasonActive(item.season) && !owned;
  let action;
  if(equipped) action = '<button class="btn disabled">'+ico("⭐",14)+' EQUIPADA</button>';
  else if(owned) action = '<button class="btn green" onclick="equipAuraV2(\''+item.id+'\')">'+ico("✅",14)+' EQUIPAR</button>';
  else if(seasonLocked){
    const s = SEASONS[item.season];
    action = '<button class="btn disabled">'+ico("🔒",14)+' EXCLUSIVO '+(s?s.name:"TEMPORADA").toUpperCase()+'</button><div class="small warnTxt">Disponible en su temporada</div>';
  }else action = '<button class="btn gold" onclick="buyAuraV2(\''+item.id+'\')">'+ico("🔒",14)+' '+(item.price===0?"GRATIS":fmt(item.price)+" "+ico("👆",14))+'</button>';
  const sLabel = item.season && SEASONS[item.season] ? emojify(SEASONS[item.season].emoji,14)+" "+SEASONS[item.season].name : "";
  return '<div class="skinCard '+(equipped?"equipped":"")+' '+(seasonLocked?"sealed":"")+'">'+
    '<div class="skinPrev"><img src="'+renderAuraPreview(item.id)+'" width="96" height="96" alt=""></div>'+
    '<b>'+escHTML(item.name)+'</b><div class="small auraBonus">+'+(item.bonus||0)+'% de clic</div>'+
    (item.season && !owned ? '<div class="small seasonTxt">'+sLabel+'</div>' : "")+action+'</div>';
}
function renderSkins(){
  ensureSkinsV2();
  const btnBox = $id("buttonSkinGrid"); if(btnBox) setHTML(btnBox, BUTTON_SKINS.map(s=>skinCardHTML_V2("button",s)).join(""));
  const fxBox = $id("clickEffectGrid"); if(fxBox) setHTML(fxBox, CLICK_EFFECTS.map(e=>skinCardHTML_V2("effect",e)).join(""));
  const auraBox = $id("auraGridV2"); if(auraBox) setHTML(auraBox, AURAS_V2.map(a=>auraCardHTML_V2(a)).join(""));
  applyButtonSkin();
}

/* ---------- ajustes extra ---------- */
function renderSettingsExtra(){
  const b = $id("musicToggleBtn");
  if(b) b.innerHTML = AU.musicOn ? ico("🎵",18)+" MÚSICA: ACTIVADA" : ico("🔇",18)+" MÚSICA: SILENCIADA";
}

/* ---------- navegación ---------- */
/* Celebraciones visuales: comparan contadores entre renders (no modifican nada) */
function uiCelebrate(){
  const snap = { reb:game.rebirths, unl:game.unlocked.length, fus:game.fusions, mis:Object.keys(game.missionsClaimed).length,
                 ach:Object.keys(game.achievementsClaimed).length, world:game.world };
  const prev = UI._snap; UI._snap = snap;
  if(!prev || !UI.ready) return;
  const cx = FX.w/2, cy = FX.h*0.42;
  const banner = (txt, col)=>{ fxText(txt, cx, cy, { color:col, big:true, life:1.6, speed:10 }); };
  if(snap.reb > prev.reb){
    fxFlash("#ffffff", 0.8); fxShake(5);
    for(let i=0;i<4;i++) setTimeout(()=>fxRing(cx, cy, ["#ff4d6d","#ffd83c","#42e5ff","#ffffff"][i], 90), i*120);
    confetti(); banner("¡RENACIMIENTO!", "#ff8aa0");
  }
  if(snap.unl > prev.unl){ fxFlash("#ffffff",0.5); confetti(); banner("¡NUEVO MUNDO!", "#7af0ff"); }
  if(snap.fus > prev.fus){ fxRing(cx, cy, "#ffd83c", 70); fxBurst(cx, cy, { count:30, colors:["#ffd83c","#fff6aa","#ffffff","#ff9cf0"], speed:110, gravity:30, life:1 }); banner("¡FUSIÓN!", "#ffd83c"); }
  if(snap.mis > prev.mis || snap.ach > prev.ach){ fxBurst(cx, cy, { count:24, colors:["#4cff91","#ffd83c","#ffffff"], speed:90, gravity:60, life:0.9 }); }
}
function uiAfterRender(){
  uiCelebrate();
  document.querySelectorAll(".nav button[data-sec]").forEach(b=>b.classList.toggle("on", b.dataset.sec===currentSection));
  const more = $id("navMore");
  if(more) more.classList.toggle("on", ["stats","pokedex","achievements","upgradeTree","skins","settings"].includes(currentSection));
  document.body.dataset.section = currentSection;
  bgSyncWorld();
}
function uiGo(id){
  closeMore();
  if(id!==currentSection) sfx("menu");
  page(id);
}
function toggleMore(){
  UI.moreOpen = !UI.moreOpen;
  $id("moreMenu").classList.toggle("open", UI.moreOpen);
  sfx("menu");
}
function closeMore(){ UI.moreOpen = false; const m=$id("moreMenu"); if(m) m.classList.remove("open"); }

/* ---------- pantalla de título ---------- */
function titleStart(){
  const t = $id("titleScreen");
  const parade = $id("titleParade");
  const all = Object.keys(ASSETS.pets);
  const pick = [];
  while(pick.length<7){ const e = all[(fxRand()*all.length)|0]; if(!pick.includes(e)) pick.push(e); }
  parade.innerHTML = pick.map((e,i)=>'<span class="walker" style="animation-delay:'+(-i*1.4)+'s">'+petFit(e,"",48)+'</span>').join("");
  let ci = 0;
  BG.cycle = setInterval(()=>{ ci = (ci+1)%WORLD_KEYS.length; bgSet(WORLD_KEYS[ci]); }, 3600);
  bgSet(WORLD_KEYS[0], true);
  document.body.classList.add("titleMode");
  const go = (ev)=>{
    if($id("gdprOverlay") && !$id("gdprOverlay").classList.contains("hidden")) return;
    if(ev && ev.type==="keydown" && !["Enter"," ","Spacebar"].includes(ev.key)) return;
    if(t.dataset.go) return; t.dataset.go = "1";
    window.removeEventListener("keydown", go);
    t.removeEventListener("pointerdown", go); t.removeEventListener("click", go);
    if(ev) ev.preventDefault();
    getAudioCtx(); auInit();
    sfx("coin");
    clearInterval(BG.cycle); BG.cycle = null;
    t.classList.add("leaving");
    setTimeout(()=>{
      t.remove(); document.body.classList.remove("titleMode");
      bgSyncWorld(); musicPlay(WORLD_KEYS[game.world]||"bosque");
      if(window.CL_STORAGE_VOLATILE) setTimeout(()=>toast("⚠️ Este visor no permite guardar: la partida se perderá al cerrar. Ábrelo en el navegador para guardar."), 300);
      if(UI.pendingNotice){ UI.pendingNotice = false; setTimeout(()=>{ try{ showSeasonNotice(); }catch(e){} }, 400); }
    }, 520);
  };
  t.addEventListener("pointerdown", go);
  t.addEventListener("click", go);
  window.addEventListener("keydown", go);
}

/* ---------- inicio de la capa visual ---------- */
function uiBoot(){
  /* Etiquetas estáticas con iconos pixel */
  document.querySelectorAll("[data-ico]").forEach(el=>{
    el.insertAdjacentHTML("afterbegin", ico(el.dataset.ico, Number(el.dataset.size||20))+(el.dataset.gap==="0"?"":" "));
  });
  document.querySelectorAll("[data-emojify]").forEach(el=>{ el.innerHTML = emojify(el.innerHTML, Number(el.dataset.emojify)||18); });
  /* Atajos de teclado: Espacio/Enter = clic en Inicio (sin autorrepetición), Esc cierra menús */
  window.addEventListener("keydown", e=>{
    if(!$id("titleScreen") && currentSection==="home" && !UI.overlayOpen && (e.key===" "||e.key==="Enter") && !e.repeat &&
       !(document.activeElement && /INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName))){
      e.preventDefault(); doClick();
    }
    if(e.key==="Escape") closeMore();
  });
  setInterval(comboTimerTick, 50);
  UI.ready = true;
}
