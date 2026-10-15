/* GENERADO por tools/make_core.py desde referencia/Clicker_Legends_TERMINADO.html.
   No editar a mano: la lógica es copia literal del original. */

/* =====================================================
   FASE 1 — INFRAESTRUCTURA TÉCNICA Y RENDIMIENTO
   - Pooling de textos flotantes y partículas.
   - Scheduler visual limitado a 60 Hz.
   - Integridad básica del guardado crítico.
   - El build de producción no contiene el panel/código secreto.

   IMPORTANTE:
   En un HTML ejecutado en el navegador no existe una forma real de
   impedir que alguien modifique la RAM. Esta capa detecta ediciones
   casuales del guardado y restaura una copia íntegra; para anti-cheat
   real en una versión publicada se necesita autoridad del servidor.
===================================================== */
const CL1_PRODUCTION_BUILD = true;
const CL1_TARGET_FPS = 60;
const CL1_FRAME_MS = 1000 / CL1_TARGET_FPS;

/* Scheduler visual: agrupa actualizaciones visuales a un máximo de 60 Hz. */
const CL1_FRAME = {
    last: 0,
    callbacks: new Set(),
    running: false
};

function cl1FrameLoop(now){
    if(now - CL1_FRAME.last >= CL1_FRAME_MS){
        CL1_FRAME.last = now;
        for(const cb of CL1_FRAME.callbacks){
            try{ cb(now); }catch(e){ console.error("CL1 frame error",e); }
        }
    }
    requestAnimationFrame(cl1FrameLoop);
}

function cl1StartFrameLoop(){
    if(CL1_FRAME.running) return;
    CL1_FRAME.running = true;
    requestAnimationFrame(cl1FrameLoop);
}

/* =====================================================
   OBJECT POOL — FLOATS Y PARTÍCULAS
===================================================== */
const CL1_POOL = {
    float: [],
    particle: [],
    floatIndex: 0,
    particleIndex: 0,
    floatSize: 24,
    particleSize: 32
};

function cl1ResetPooledElement(el){
    el.className = el.dataset.baseClass || "";
    el.textContent = "";
    el.style.cssText = "";
    el.style.display = "none";
    el.removeAttribute("data-pool-active");
}

function cl1CreatePoolElement(type){
    const el = document.createElement("div");
    el.dataset.baseClass = type;
    el.dataset.poolType = type;
    el.style.display = "none";
    el.setAttribute("aria-hidden","true");
    return el;
}

function cl1InitPools(){
    if(CL1_POOL.float.length || CL1_POOL.particle.length) return;

    for(let i=0;i<CL1_POOL.floatSize;i++){
        const el=cl1CreatePoolElement("float");
        el.className="float";
        document.body.appendChild(el);
        CL1_POOL.float.push(el);
    }

    const btn=document.getElementById("click");
    if(btn){
        for(let i=0;i<CL1_POOL.particleSize;i++){
            const el=cl1CreatePoolElement("particle");
            el.className="particle";
            btn.appendChild(el);
            CL1_POOL.particle.push(el);
        }
    }
}

function cl1Acquire(pool,indexKey){
    const poolArray=CL1_POOL[pool];
    if(!poolArray.length) return null;

    for(let i=0;i<poolArray.length;i++){
        const index=(CL1_POOL[indexKey]+i)%poolArray.length;
        const el=poolArray[index];
        if(!el.hasAttribute("data-pool-active")){
            CL1_POOL[indexKey]=(index+1)%poolArray.length;
            el.setAttribute("data-pool-active","1");
            return el;
        }
    }

    /* Pool lleno: reutiliza el siguiente elemento en vez de crear DOM. */
    const el=poolArray[CL1_POOL[indexKey]];
    CL1_POOL[indexKey]=(CL1_POOL[indexKey]+1)%poolArray.length;
    el.setAttribute("data-pool-active","1");
    return el;
}

function cl1Release(el){
    if(!el) return;
    el.classList.remove("pool-running");
    el.style.display="none";
    el.textContent="";
    el.removeAttribute("data-pool-active");
}

function cl1RestartAnimation(el,animationName){
    el.classList.remove("pool-running");
    /* Forzamos solo el reinicio de la animación del elemento ya existente. */
    void el.offsetWidth;
    el.style.animation = animationName;
    el.classList.add("pool-running");
}

/* =====================================================
   GUARDADO CON INTEGRIDAD BÁSICA
===================================================== */
const CL1_SAVE_KEY = "CLICK_WORLDS_FINAL";
const CL1_BACKUP_KEY = "CLICK_WORLDS_FINAL_BACKUP";
const CL1_INTEGRITY_KEY = "CLICK_WORLDS_FINAL_INTEGRITY";
const CL1_INTEGRITY_SALT = "CL1-INTEGRITY-2026-v1";

function cl1CriticalSnapshot(source){
    return {
        totalClicks: Number(source.totalClicks||0),
        tokens: Number(source.tokens||0),
        petsDiscovered: source.petsDiscovered || {},
        pets: source.pets || {}
    };
}

function cl1StableStringify(value){
    if(value===null || typeof value!=="object") return JSON.stringify(value);
    if(Array.isArray(value)) return "["+value.map(cl1StableStringify).join(",")+"]";
    return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+cl1StableStringify(value[k])).join(",")+"}";
}

function cl1Hash(text){
    let h=2166136261;
    for(let i=0;i<text.length;i++){
        h^=text.charCodeAt(i);
        h=Math.imul(h,16777619);
    }
    return (h>>>0).toString(16).padStart(8,"0");
}

function cl1Integrity(snapshot){
    return cl1Hash(CL1_INTEGRITY_SALT+cl1StableStringify(snapshot));
}

function cl1SaveSecure(){
    const critical=cl1CriticalSnapshot(game);
    const full=JSON.stringify(game);
    const integrity=cl1Integrity(critical);

    localStorage.setItem(CL1_SAVE_KEY,full);
    localStorage.setItem(CL1_BACKUP_KEY,JSON.stringify(critical));
    localStorage.setItem(CL1_INTEGRITY_KEY,integrity);
}

function cl1ValidateCriticalSave(){
    try{
        const raw=localStorage.getItem(CL1_BACKUP_KEY);
        const stored=localStorage.getItem(CL1_INTEGRITY_KEY);
        if(!raw || !stored) return true; /* partidas antiguas */
        const snapshot=JSON.parse(raw);
        return cl1Integrity(snapshot)===stored;
    }catch(e){
        return false;
    }
}

function cl1RestoreCriticalBackup(){
    try{
        const raw=localStorage.getItem(CL1_BACKUP_KEY);
        const stored=localStorage.getItem(CL1_INTEGRITY_KEY);
        if(!raw || !stored) return false;
        const snapshot=JSON.parse(raw);
        if(cl1Integrity(snapshot)!==stored) return false;

        game.totalClicks=Number(snapshot.totalClicks||0);
        game.tokens=Number(snapshot.tokens||0);
        game.petsDiscovered=snapshot.petsDiscovered||{};
        game.pets=snapshot.pets||{};
        return true;
    }catch(e){
        return false;
    }
}

/* =====================================================
   INICIO DE INFRAESTRUCTURA
===================================================== */
cl1InitPools();
cl1StartFrameLoop();

/* =====================================================
   MUNDOS
===================================================== */

/* =====================================================
   SKINS
===================================================== */

const BUTTON_SKINS=[
 {id:"classic",emoji:"👆",name:"Clásico",price:0,grad:"linear-gradient(145deg,#ffd83c,#ff7920)",s1:"#a64b10",s2:"#ff9b3044"},
 {id:"coin",emoji:"🪙",name:"Moneda",price:10000,grad:"linear-gradient(145deg,#fff2b0,#d4a017)",s1:"#8a6a08",s2:"#ffe98044"},
 {id:"diamond",emoji:"💎",name:"Diamante",price:50000,grad:"linear-gradient(145deg,#c9f7ff,#3fa9d6)",s1:"#1a5f7a",s2:"#8ee7ff44"},
 {id:"fire",emoji:"🔥",name:"Fuego",price:100000,grad:"linear-gradient(145deg,#ff9142,#c81e1e)",s1:"#7a0f0f",s2:"#ff5b3044"},
 {id:"ice",emoji:"❄️",name:"Hielo",price:250000,grad:"linear-gradient(145deg,#eaffff,#4fc3e8)",s1:"#1c5c78",s2:"#a8f0ff44"},
 {id:"lightning",emoji:"⚡",name:"Rayo",price:500000,grad:"linear-gradient(145deg,#fff87a,#c8a600)",s1:"#6b5900",s2:"#fff54d44"},
 {id:"galaxy",emoji:"🌌",name:"Galaxia",price:2500000,grad:"linear-gradient(145deg,#8b5cf6,#1e1b4b)",s1:"#0e0c22",s2:"#a78bfa44"},
 {id:"lava",emoji:"🌋",name:"Lava",price:10000000,grad:"linear-gradient(145deg,#ff5722,#4a0404)",s1:"#2a0202",s2:"#ff6a3d44"},
 {id:"rainbow",emoji:"🌈",name:"Arcoíris",price:50000000,grad:"linear-gradient(145deg,#ff5bd0,#42e5ff,#a855f7)",s1:"#3d1a5c",s2:"#ff5bd044"},
 {id:"alien",emoji:"👽",name:"Alien",price:250000000,grad:"linear-gradient(145deg,#9dff42,#0d5c1f)",s1:"#053012",s2:"#9dff4244"},
 {id:"portal",emoji:"🌀",name:"Portal",price:1000000000,grad:"linear-gradient(145deg,#42e5ff,#4c1d95)",s1:"#1e0a3d",s2:"#42e5ff44"},
 {id:"crown",emoji:"👑",name:"Corona",price:10000000000,grad:"linear-gradient(145deg,#fff6cf,#d4af37)",s1:"#7a5c00",s2:"#fff6cf44"},
 /* Halloween */
 {id:"halloween_skull",emoji:"💀",name:"Calavera",price:0,grad:"linear-gradient(145deg,#e8e8e8,#555555)",s1:"#222222",s2:"#aaaaaa44",season:"halloween"},
 {id:"halloween_ghost",emoji:"👻",name:"Fantasma",price:80000000,grad:"linear-gradient(145deg,#f0f8ff,#a0c4e8)",s1:"#4a6a8a",s2:"#c0e0ff44",season:"halloween"},
 {id:"halloween_pumpkin",emoji:"🎃",name:"Calabaza",price:280000000,grad:"linear-gradient(145deg,#ff9a3c,#c45c00)",s1:"#6b3000",s2:"#ff9a3c44",season:"halloween"},
 /* Navidad */
 {id:"christmas_snowball",emoji:"❄️",name:"Bola de Nieve",price:0,grad:"linear-gradient(145deg,#ffffff,#c8e8ff)",s1:"#6a9abb",s2:"#a0d8ff44",season:"christmas"},
 {id:"christmas_gingerbread",emoji:"🍪",name:"Galleta de Jengibre",price:80000000,grad:"linear-gradient(145deg,#e8a060,#b86a30)",s1:"#6a3a10",s2:"#e8a06044",season:"christmas"},
 {id:"christmas_house",emoji:"🏠",name:"Casa de Papá Noel",price:280000000,grad:"linear-gradient(145deg,#ff6b6b,#c41e3a)",s1:"#6a1020",s2:"#ff6b6b44",season:"christmas"},
 /* San Valentín */
 {id:"valentine_heart",emoji:"❤️",name:"Corazón",price:0,grad:"linear-gradient(145deg,#ff6b8a,#c41e3a)",s1:"#6a1020",s2:"#ff6b8a44",season:"valentine"},
 {id:"valentine_bonbon",emoji:"🍫",name:"Bombón",price:80000000,grad:"linear-gradient(145deg,#5a2a0a,#3a1805)",s1:"#1a0a02",s2:"#8a4a2044",season:"valentine"},
 {id:"valentine_flower",emoji:"🌹",name:"Flor",price:280000000,grad:"linear-gradient(145deg,#ff4d6d,#8b0000)",s1:"#4a0000",s2:"#ff4d6d44",season:"valentine"},
 /* Verano */
 {id:"summer_sun",emoji:"☀️",name:"Sol",price:0,grad:"linear-gradient(145deg,#fff6a0,#ffb300)",s1:"#8a6000",s2:"#ffd54d44",season:"summer"},
 {id:"summer_sand",emoji:"🏖️",name:"Arena",price:80000000,grad:"linear-gradient(145deg,#f5e6c8,#d4b483)",s1:"#8a7040",s2:"#f5e6c844",season:"summer"},
 {id:"summer_water",emoji:"🌊",name:"Agua",price:280000000,grad:"linear-gradient(145deg,#4dd0e1,#0277bd)",s1:"#015079",s2:"#4dd0e144",season:"summer"}
];

const CLICK_EFFECTS=[
 {id:"classic",emoji:"✨",name:"Clásico",price:0,particles:null},
 {id:"explosion",emoji:"💥",name:"Explosión",price:25000,particles:["💥","🔥","💢"]},
 {id:"stars",emoji:"⭐",name:"Estrellas",price:75000,particles:["⭐","✨","🌟"]},
 {id:"flames",emoji:"🔥",name:"Llamas",price:200000,particles:["🔥","🔥","💨"]},
 {id:"snow",emoji:"❄️",name:"Nieve",price:500000,particles:["❄️","❄️","🌨️"]},
 {id:"crystals",emoji:"💎",name:"Cristales",price:1500000,particles:["💎","🔷","✨"]},
 {id:"coins",emoji:"🪙",name:"Monedas",price:5000000,particles:["🪙","🪙","✨"]},
 {id:"rainbow",emoji:"🌈",name:"Arcoíris",price:20000000,particles:["🌈","💫","✨"]},
 {id:"portal",emoji:"🌀",name:"Portal",price:100000000,particles:["🌀","🌌","✨"]},
 {id:"electricity",emoji:"⚡",name:"Electricidad",price:500000000,particles:["⚡","⚡","💠"]},
 /* Halloween */
 {id:"halloween_blood",emoji:"🩸",name:"Sangre",price:65000000,particles:["🩸","🩸","💀"],season:"halloween"},
 {id:"halloween_candy",emoji:"🍬",name:"Caramelos",price:200000000,particles:["🍬","🍭","🍫"],season:"halloween"},
 /* Navidad */
 {id:"christmas_snowflakes",emoji:"❄️",name:"Copos de Nieve",price:65000000,particles:["❄️","❄️","🌨️"],season:"christmas"},
 {id:"christmas_stars",emoji:"⭐",name:"Estrellas",price:200000000,particles:["⭐","✨","🌟"],season:"christmas"},
 /* San Valentín */
 {id:"valentine_hearts",emoji:"💕",name:"Corazones",price:65000000,particles:["💕","❤️","💗"],season:"valentine"},
 {id:"valentine_arrows",emoji:"🏹",name:"Flechas",price:200000000,particles:["🏹","➡️","✨"],season:"valentine"},
 /* Verano */
 {id:"summer_granita",emoji:"🏜️",name:"Granos de arena",price:65000000,particles:["🟤","⬜","·"],season:"summer"},
 {id:"summer_drops",emoji:"💦",name:"Gotas de Agua",price:200000000,particles:["💦","💧","🌊"],season:"summer"}
];

function buttonSkinById(id){
    return BUTTON_SKINS.find(s=>s.id===id)||BUTTON_SKINS[0];
}

function effectById(id){
    return CLICK_EFFECTS.find(e=>e.id===id)||CLICK_EFFECTS[0];
}

/* =====================================================
   SISTEMA DE ACTUALIZACIONES / TEMPORADAS (FASE 1 - solo datos)
===================================================== */
const SEASONS = {
  halloween: {
    id: "halloween",
    name: "Halloween",
    emoji: "🎃",
    months: [10], // octubre
    noticeTitle: "¡Actualización de Halloween!",
    noticeText: "¡Ya ha empezado octubre!\n¡Descubre el nuevo Mundo de Halloween!",
    worldName: "🎃 Halloween",
    eggName: "🎃 Huevo Embrujado",
    eggPrice: 300000000,
    pets: ["🐺👨","🧟","🧛","🏺"]
  },
  christmas: {
    id: "christmas",
    name: "Navidad",
    emoji: "🎄",
    months: [12], // diciembre
    noticeTitle: "¡Actualización de Navidad!",
    noticeText: "¡Ya ha empezado diciembre!\n¡Descubre el nuevo Mundo de Navidad!",
    worldName: "🎄 Navidad",
    eggName: "🎄 Huevo Navideño",
    eggPrice: 300000000,
    pets: ["🧊","⛄","🦌","🎅"]
  },
  valentine: {
    id: "valentine",
    name: "San Valentín",
    emoji: "💝",
    months: [4], // abril
    noticeTitle: "¡Actualización de San Valentín!",
    noticeText: "¡Ya ha empezado abril!\n¡Descubre el nuevo Mundo de San Valentín!",
    worldName: "💝 San Valentín",
    eggName: "💝 Huevo del Amor",
    eggPrice: 300000000,
    pets: ["❤️","🦢","🕯️","👼"]
  },
  summer: {
    id: "summer",
    name: "Verano",
    emoji: "☀️",
    months: [8], // agosto
    noticeTitle: "¡Actualización de Verano!",
    noticeText: "¡Ya ha empezado agosto!\n¡Descubre el nuevo Mundo de Verano!",
    worldName: "☀️ Verano",
    eggName: "☀️ Huevo de Verano",
    eggPrice: 300000000,
    pets: ["🏰","☀️","💧","🦈"]
  }
};

function getCurrentSeason(){
  const month = new Date().getMonth() + 1;
  for(const key in SEASONS){
    if(SEASONS[key].months.includes(month)) return SEASONS[key];
  }
  return null;
}

function isSeasonActive(seasonId){
  const s = SEASONS[seasonId];
  if(!s) return false;
  const month = new Date().getMonth() + 1;
  return s.months.includes(month);
}

function hasSeenSeasonNotice(seasonId){
  if(!game.seasonNotices) game.seasonNotices = {};
  const year = new Date().getFullYear();
  return !!game.seasonNotices[seasonId + "_" + year];
}

function markSeasonNoticeSeen(seasonId){
  if(!game.seasonNotices) game.seasonNotices = {};
  const year = new Date().getFullYear();
  game.seasonNotices[seasonId + "_" + year] = true;
  save();
}

/* [arcade] showSeasonNotice() → capa de presentación */

/* =====================================================
   FASE 3 — FUSIÓN AVANZADA Y BALANCE HIPERBÓLICO
   Todas las variables de balance están agrupadas aquí para
   poder ajustar la economía sin tocar la lógica del juego.
===================================================== */
const CL3_BALANCE = {
  fusionNormalRequired: 5,
  fusionGoldenRequired: 5,
  goldenMultiplier: 2,
  worldGrowth: 0.055,
  eggGrowth: 0.045,
  upgradeGrowth: 0.065,
  hyperbolicFloor: 0.18,
  hyperbolicPower: 1.12
};

function cl3HyperCost(base, step, growth, power=1){
  const safeBase=Math.max(1,Number(base)||1);
  const n=Math.max(0,Number(step)||0);
  const denominator=Math.max(CL3_BALANCE.hyperbolicFloor,1-growth*n);
  const curve=Math.pow(1+growth*n,power)/denominator;
  return Math.max(safeBase,Math.floor(safeBase*curve));
}

function cl3WorldCost(index){
  if(index<=0) return 0;
  const base=worlds[index]?.unlock||0;
  return cl3HyperCost(base,index,CL3_BALANCE.worldGrowth,CL3_BALANCE.hyperbolicPower);
}

function cl3EggCost(worldIndex,eggIndex,base){
  // Los huevos de temporada conservan su precio fijado de 300 M.
  if(worlds[worldIndex]?.seasonal) return base;
  const step=Math.max(1,worldIndex*3+eggIndex+1);
  return cl3HyperCost(base,step,CL3_BALANCE.eggGrowth,CL3_BALANCE.hyperbolicPower);
}

function cl3UpgradeCost(node){
  const index=Math.max(1,upgradeNodes.indexOf(node)+1);
  return cl3HyperCost(node.cost,index,CL3_BALANCE.upgradeGrowth,CL3_BALANCE.hyperbolicPower);
}

const worlds=[

{
name:"🌳 Bosque",
unlock:0,

eggs:[
[
"🥚 Huevo del Bosque",
15000,
["🐶","🐱","🐰","🦊"]
],

[
"🌟 Huevo Dorado",
300000,
["🐰","🦊","🦄","🐉"]
],

[
"💎 Huevo Místico",
15000000,
["🦊","🦄","🐉","🌈"]
]
]

},

{
name:"🏜️ Desierto",
unlock:20000000,
rebirthsRequired:2,
petRequired:"🐉",

eggs:[
[
"🥚 Huevo del Desierto",
7500000,
["🦂","🐍","🦅","🐪"]
],

[
"🌟 Huevo Dorado",
150000000,
["🐍","🦅","🐪","🐫"]
],

[
"💎 Huevo Místico",
6000000000,
["🦅","🐫","🐉","🌈"]
]
]

},

{
name:"❄️ Hielo",
unlock:8000000000,
rebirthsRequired:5,
petRequired:"🐫",

eggs:[
[
"🥚 Huevo Glacial",
3000000000,
["🐧","🦭","🐺","🐻‍❄️"]
],

[
"🌟 Huevo Polar",
75000000000,
["🦭","🐺","🐻‍❄️","🐲"]
],

[
"💎 Huevo Místico",
3000000000000,
["🐺","🐲","🐉","🌈"]
]
]

},

{
name:"🌋 Volcán",
unlock:4000000000000,
rebirthsRequired:10,
petRequired:"🐲",

eggs:[
[
"🥚 Huevo Volcánico",
1500000000000,
["🦎","🔥","🐉","👹"]
],

[
"🌟 Huevo de Magma",
30000000000000,
["🔥","🐉","👹","🐲"]
],

[
"💎 Huevo Infernal",
1500000000000000,
["🐉","👹","🌋","🌈"]
]
]

},

{
name:"🚀 Espacio",
unlock:2000000000000000,
rebirthsRequired:20,
petRequired:"👹",

eggs:[
[
"🥚 Huevo Cósmico",
1500000000000000,
["👽","🛸","🌌","🪐"]
],

[
"🌟 Huevo Galáctico",
30000000000000000,
["🛸","🌌","🪐","🐲"]
],

[
"💎 Huevo Divino",
3000000000000000000,
["🌌","🪐","🐲","🌈"]
]
]

},

/* ===== MUNDO TEMPORAL DE HALLOWEEN ===== */
{
name:"🎃 Halloween",
unlock:0,
seasonal:true,
seasonId:"halloween",
eggs:[
[
"🎃 Huevo Embrujado",
300000000,
["🐺👨","🧟","🧛","🏺"]
]
]
},

/* ===== MUNDO TEMPORAL DE NAVIDAD ===== */
{
name:"🎄 Navidad",
unlock:0,
seasonal:true,
seasonId:"christmas",
eggs:[
[
"🎄 Huevo Navideño",
300000000,
["🧊","⛄","🦌","🎅"]
]
]
},

/* ===== MUNDO TEMPORAL DE SAN VALENTÍN ===== */
{
name:"💝 San Valentín",
unlock:0,
seasonal:true,
seasonId:"valentine",
eggs:[
[
"💝 Huevo del Amor",
300000000,
["❤️","🦢","🕯️","👼"]
]
]
},

/* ===== MUNDO TEMPORAL DE VERANO ===== */
{
name:"☀️ Verano",
unlock:0,
seasonal:true,
seasonId:"summer",
eggs:[
[
"☀️ Huevo de Verano",
300000000,
["🏰","☀️","💧","🦈"]
]
]
}

];



/* =====================================================
   MASCOTAS
   NINGUNA ES x1
===================================================== */

const pets={

"🐶":["Perro","Común",1.5,"common"],
"🐱":["Gato","Común",2,"common"],
"🐰":["Conejo","Poco común",2.5,"uncommon"],
"🦊":["Zorro","Rara",3,"rare"],
"🦄":["Unicornio","Épica",4,"epic"],
"🐉":["Dragón","Legendaria",6,"legendary"],
"🌈":["Ser Celestial","Mítica",10,"mythic"],

"🦂":["Escorpión","Común",7,"common"],
"🐍":["Serpiente","Poco común",8,"uncommon"],
"🦅":["Águila","Rara",10,"rare"],
"🐪":["Camello","Épica",13,"epic"],
"🐫":["Camello Dorado","Legendaria",17,"legendary"],

"🐧":["Pingüino","Común",20,"common"],
"🦭":["Foca","Poco común",24,"uncommon"],
"🐺":["Lobo","Rara",30,"rare"],
"🐻‍❄️":["Oso Polar","Épica",40,"epic"],
"🐲":["Dragón de Hielo","Legendaria",55,"legendary"],

"🦎":["Lagarto","Común",70,"common"],
"🔥":["Fénix","Épica",100,"epic"],
"👹":["Demonio","Legendaria",150,"legendary"],
"🌋":["Titán Volcánico","Mítica",250,"mythic"],

"👽":["Alien","Rara",350,"rare"],
"🛸":["OVNI","Épica",500,"epic"],
"🌌":["Nebulosa","Mítica",750,"mythic"],
"🪐":["Planeta Viviente","Divina",1500,"divine"],

/* ===== HALLOWEEN ===== */
"🐺👨":["Hombre Lobo","Común",11,"common"],
"🧟":["Zombie","Poco común",15,"uncommon"],
"🧛":["Vampiro","Épica",21,"epic"],
"🏺":["Momia","Legendaria",28,"legendary"],

/* ===== NAVIDAD ===== */
"🧊":["Cubito de Hielo","Común",11,"common"],
"⛄":["Muñeco de Nieve","Poco común",15,"uncommon"],
"🦌":["Reno","Épica",21,"epic"],
"🎅":["Papá Noel","Legendaria",28,"legendary"],

/* ===== SAN VALENTÍN ===== */
"❤️":["Corazón","Común",11,"common"],
"🦢":["Cisne","Poco común",15,"uncommon"],
"🕯️":["Vela","Épica",21,"epic"],
"👼":["Cupido","Legendaria",28,"legendary"],

/* ===== VERANO ===== */
"🏰":["Castillo de Arena","Común",11,"common"],
"☀️":["Sol","Poco común",15,"uncommon"],
"💧":["Gota de Agua","Épica",21,"epic"],
"🦈":["Tiburón","Legendaria",28,"legendary"]

};

/* Validación: 4 mascotas únicas por huevo, ordenadas por multiplicador. */
worlds.forEach(world=>{
    world.eggs.forEach(egg=>{
        egg[2]=[...new Set(egg[2])]
            .filter(e=>pets[e])
            .sort((a,b)=>pets[a][2]-pets[b][2])
            .slice(0,4);
    });
});


/* =====================================================
   MISIONES
===================================================== */

const missions=[

{id:"clicks1",icon:"👆",name:"Primeros pasos",type:"clicks",goal:1000,reward:{clicks:5000,tokens:0}},
{id:"clicks2",icon:"👆",name:"Máquina de clics",type:"clicks",goal:100000,reward:{clicks:100000,tokens:0}},
{id:"clicks3",icon:"👆",name:"Clicker profesional",type:"clicks",goal:10000000,reward:{clicks:100000,tokens:0}},
{id:"eggs1",icon:"🥚",name:"Coleccionista",type:"eggs",goal:3,reward:{clicks:100000,tokens:0}},
{id:"eggs2",icon:"🥚",name:"Abridor experto",type:"eggs",goal:10,reward:{clicks:100000,tokens:0}},
{id:"fuse1",icon:"✨",name:"¡A fusionar!",type:"fusions",goal:1,reward:{clicks:100000,tokens:0}},
{id:"fuse2",icon:"✨",name:"Maestro de fusiones",type:"fusions",goal:5,reward:{clicks:100000,tokens:0}},
{id:"rebirth1",icon:"🔄",name:"Renacer",type:"rebirths",goal:1,reward:{clicks:100000,tokens:0}},
{id:"rebirth2",icon:"🔄",name:"Renacimientos",type:"rebirths",goal:5,reward:{clicks:100000,tokens:0}},
{id:"time1",icon:"⏱️",name:"Quédate un rato",type:"playSeconds",goal:600,reward:{clicks:100000,tokens:0}},
{id:"time2",icon:"⏱️",name:"Jugador dedicado",type:"playSeconds",goal:3600,reward:{clicks:100000,tokens:0}},
{id:"streak1",icon:"🔥",name:"Constancia",type:"streak",goal:3,reward:{clicks:100000,tokens:0}},
{id:"streak2",icon:"🔥",name:"Racha de una semana",type:"streak",goal:7,reward:{clicks:100000,tokens:0}}

];

function petCount(){
    return Object.values(game.pets||{}).reduce((a,b)=>a+Number(b||0),0);
}

/* ===== FASE 3: inventario de mascotas ===== */
const MAX_PET_INVENTORY = 50;

function totalPetInventory(){
    let n = 0;
    for(const v of Object.values(game.pets||{})) n += Number(v||0);
    for(const v of Object.values(game.shinyPets||{})) n += Number(v||0);
    for(const v of Object.values(game.goldenPets||{})) n += Number(v||0);
    return n;
}

function deletePetReward(keyStr){
    /* Recompensa pequeña en clics del mundo actual al eliminar una copia.
       Las claves pueden ser:
         normal  → "🐶|||0"
         dorada  → "🌟|||🐶|||0"
         shiny   → "✨|||🐶|||0"
    */
    let k = String(keyStr||"");
    // Quitar prefijos de variante
    if(k.startsWith("✨|||")) k = k.slice(4);
    if(k.startsWith("🌟|||")) k = k.slice(4);

    const parts = k.split("|||");
    const emoji = parts[0] || "";
    const level = Number(parts[1]||0) || 0;

    let rarity = "common";
    if(typeof pets !== "undefined" && pets[emoji]) rarity = pets[emoji][3] || "common";

    const rarityMult = {
        common: 1,
        uncommon: 1.5,
        rare: 2.5,
        epic: 4,
        legendary: 7,
        mythic: 12,
        divine: 20
    }[rarity] || 1;

    const intensity = (typeof W === "function" && W()) ? (W().intensity || 1) : 1;
    const clicks = (typeof W === "function" && W()) ? (W().clicks || 0) : 0;

    const base = Math.max(50, Math.floor(intensity * 25 * (level + 1) * rarityMult));
    /* Tope suave para no abusar en mundos muy avanzados */
    return Math.max(50, Math.min(base, Math.floor(clicks * 0.02) + base));
}

function missionProgress(m){
    switch(m.type){
        case "clicks": return Math.floor(game.totalClicks);
        case "eggs": return game.eggs;
        case "fusions": return game.fusions;
        case "rebirths": return game.rebirths;
        case "playSeconds": return game.playSeconds;
        case "streak": return game.streak;
        case "pets": return petCount();
        default: return 0;
    }
}

function missionRewardText(r){
    let out=[];
    if(r.clicks) out.push("+"+fmt(r.clicks)+" 👆");
    if(r.tokens) out.push("+"+r.tokens+" ✨");
    return out.join(" • ");
}

function claimMission(id){
    let m=missions.find(x=>x.id===id);
    if(!m || game.missionsClaimed[id]) return;

    if(missionProgress(m)<m.goal){
        toast("🎯 Todavía no has completado la misión");
        return;
    }

    W().clicks+=m.reward.clicks||0;
    game.tokens+=m.reward.tokens||0;
    game.missionsClaimed[id]=true;

    toast("🎁 ¡Misión completada y recompensa reclamada!");
    sfx("claim");
    render();
}


/* =====================================================
   FASE 1 — LOGROS
===================================================== */

const achievements=[
    {id:"a_clicks_100k",icon:"👆",name:"Cien mil",type:"clicks",goal:100000,reward:2},
    {id:"a_clicks_1m",icon:"💎",name:"Millonario",type:"clicks",goal:1000000,reward:2},
    {id:"a_eggs_50",icon:"🥚",name:"Abridor experto",type:"eggs",goal:50,reward:2},
    {id:"a_fusions_10",icon:"✨",name:"Fusionador",type:"fusions",goal:10,reward:2},
    {id:"a_rebirths_5",icon:"🔄",name:"Renacido",type:"rebirths",goal:5,reward:2},
    {id:"a_pets_10",icon:"🐾",name:"Coleccionista",type:"uniquePets",goal:10,reward:2},
    {id:"a_pet_level_5",icon:"⭐",name:"Mascota de nivel 5",type:"petLevel",goal:5,reward:3},
    {id:"a_time_1h",icon:"⏱️",name:"Una hora",type:"playSeconds",goal:3600,reward:2}
];

function uniquePetCount(){
    return Object.keys(pets).filter(e=>{
        return game.petsDiscovered && game.petsDiscovered[e];
    }).length;
}

function syncPetDiscoveries(){
    if(!game.petsDiscovered) game.petsDiscovered={};
    Object.keys(pets).forEach(emoji=>{
        let owns=Object.keys(game.pets||{}).some(k=>k.startsWith(emoji+"|||") && (game.pets[k]||0)>0);
        if(owns){
            game.petsDiscovered[emoji]=true;
        }
    });
}

function highestPetLevel(){
    let max=0;
    Object.keys(game.pets||{}).forEach(k=>{
        if((game.pets[k]||0)>0){
            let parts=k.split("|||");
            max=Math.max(max,Number(parts[1]||0)+1);
        }
    });
    return max;
}

function achievementProgress(a){
    switch(a.type){
        case "clicks": return Math.floor(game.totalClicks);
        case "eggs": return game.eggs;
        case "fusions": return game.fusions;
        case "rebirths": return game.rebirths;
        case "uniquePets": return uniquePetCount();
        case "petLevel": return highestPetLevel();
        case "playSeconds": return game.playSeconds;
        default: return 0;
    }
}

function claimAchievement(id){
    let a=achievements.find(x=>x.id===id);
    if(!a || game.achievementsClaimed[id]) return;

    if(achievementProgress(a)<a.goal){
        toast("🏆 Todavía no has completado el logro");
        return;
    }

    game.achievementsClaimed[id]=true;
    game.achievementBonus=(game.achievementBonus||0)+(a.reward||0);

    toast("🏆 ¡Logro completado! +"+a.reward+"% permanente");
    sfx("claim");
    render();
    save();
}

/* [arcade] renderPokedex() → capa de presentación */

/* [arcade] renderAchievements() → capa de presentación */


/* =====================================================
   FASE 2 — ÁRBOL DE MEJORAS + SHINY
===================================================== */

const upgradeNodes=[
  {id:"root",name:"🌳 Inicio",desc:"Elige una rama de especialización.",cost:0,branch:"root",parent:null},
  {id:"click1",name:"👆 Clic potente",desc:"+10% al poder de clic",cost:5,branch:"clicks",parent:"root"},
  {id:"click2",name:"⚡ Clic mejorado",desc:"+15% adicional al poder de clic",cost:10,branch:"clicks",parent:"click1"},
  {id:"click3",name:"🔥 Clic experto",desc:"+25% adicional al poder de clic",cost:15,branch:"clicks",parent:"click2"},
  {id:"click4",name:"💥 Clic maestro",desc:"+40% adicional al poder de clic",cost:20,branch:"clicks",parent:"click3"},

  {id:"egg1",name:"🥚 Mejor incubadora",desc:"+5% de suerte al abrir huevos",cost:5,branch:"eggs",parent:"root"},
  {id:"egg2",name:"🍀 Buscador de raros",desc:"+8% de suerte al abrir huevos",cost:10,branch:"eggs",parent:"egg1"},
  {id:"egg3",name:"💎 Cazador de épicos",desc:"+12% de suerte al abrir huevos",cost:15,branch:"eggs",parent:"egg2"},
  {id:"egg4",name:"🌟 Maestro de huevos",desc:"+15% de suerte al abrir huevos",cost:20,branch:"eggs",parent:"egg3"},

  {id:"pet1",name:"🐾 Entrenamiento",desc:"+10% al multiplicador de mascotas",cost:5,branch:"pets",parent:"root"},
  {id:"pet2",name:"✨ Entrenamiento brillante",desc:"+15% al multiplicador de mascotas",cost:10,branch:"pets",parent:"pet1"},
  {id:"pet3",name:"🌈 Cazador Shiny",desc:"+2% de probabilidad Shiny",cost:15,branch:"pets",parent:"pet2"},
  {id:"pet4",name:"💫 Maestro Shiny",desc:"+3% de probabilidad Shiny",cost:20,branch:"pets",parent:"pet3"}
];

const upgradePos={
 root:[505,35],
 click1:[120,205],click2:[120,360],click3:[120,515],click4:[120,670],
 egg1:[505,205],egg2:[505,360],egg3:[505,515],egg4:[505,670],
 pet1:[890,205],pet2:[890,360],pet3:[890,515],pet4:[890,670]
};

function treeHas(id){
  return !!(game.upgradeTree && game.upgradeTree.purchased||[]).includes(id);
}
function treeNode(id){
  return upgradeNodes.find(n=>n.id===id);
}
function treeUnlocked(n){
  if(n.id==="root") return true;
  if(treeHas(n.id)) return true;
  if(n.parent && !treeHas(n.parent)) return false;
  return true;
}
function buyUpgrade(id){
  const n=treeNode(id);
  if(!n || n.id==="root") return;
  if(treeHas(id)){toast("✅ Esta mejora ya está comprada");return;}
  if(n.parent && !treeHas(n.parent)){
    toast("🔒 Primero compra la mejora anterior"); return;
  }
  const cost=cl3UpgradeCost(n);
  if(game.tokens<cost){
    toast("🪙 Necesitas "+cost+" Tokens"); return;
  }
  game.tokens-=cost;
  game.upgradeTree.purchased.push(id);
  toast("🌳 ¡Mejora desbloqueada!");
  sfx("unlock");
  save();
  render();
}
function treeEffectSummary(){
  const has=id=>treeHas(id);
  let clickBonus=0, petBonus=0, eggLuck=0, shinyBonus=0;
  if(has("click1"))clickBonus+=10;if(has("click2"))clickBonus+=15;if(has("click3"))clickBonus+=25;if(has("click4"))clickBonus+=40;
  if(has("pet1"))petBonus+=10;if(has("pet2"))petBonus+=15;
  if(has("egg1"))eggLuck+=5;if(has("egg2"))eggLuck+=8;if(has("egg3"))eggLuck+=12;if(has("egg4"))eggLuck+=15;
  if(has("pet3"))shinyBonus+=2;if(has("pet4"))shinyBonus+=3;
  return {clickBonus,petBonus,eggLuck,shinyBonus};
}
/* [arcade] renderUpgradeTree() → capa de presentación */
let treeState={scale:.65,x:20,y:5,min:false};
function treeApply(){
  const c=document.getElementById("treeCanvas"); if(!c)return;
  c.style.transform=`translate(${treeState.x}px,${treeState.y}px) scale(${treeState.scale})`;
}
function treeZoom(delta){
  treeState.scale=Math.max(.35,Math.min(1.35,treeState.scale+delta));
  treeApply();
}
function treeResetView(){treeState={scale:.65,x:20,y:5,min:false};treeApply();}
function treeToggleMin(){
  const p=document.getElementById("upgradeTreePanel"); if(!p)return;
  treeState.min=!treeState.min;
  p.classList.toggle("treeMinimized",treeState.min);
}
(function initTreePointer(){
  document.addEventListener("pointerdown",e=>{
    const v=document.getElementById("treeViewport"); if(!v || !v.contains(e.target))return;
    v.setPointerCapture?.(e.pointerId); v.classList.add("dragging");
    v.dataset.tx=e.clientX;v.dataset.ty=e.clientY;
    v.dataset.sx=treeState.x;v.dataset.sy=treeState.y;
  });
  document.addEventListener("pointermove",e=>{
    const v=document.getElementById("treeViewport"); if(!v||!v.classList.contains("dragging"))return;
    treeState.x=Number(v.dataset.sx)+(e.clientX-Number(v.dataset.tx));
    treeState.y=Number(v.dataset.sy)+(e.clientY-Number(v.dataset.ty)); treeApply();
  });
  document.addEventListener("pointerup",()=>{
    const v=document.getElementById("treeViewport"); if(v)v.classList.remove("dragging");
  });
  document.addEventListener("wheel",e=>{
    const v=document.getElementById("treeViewport"); if(!v||!v.contains(e.target))return;
    e.preventDefault(); treeZoom(e.deltaY<0?.08:-.08);
  },{passive:false});
})();

/* ===== VARIANTES SHINY ===== */
function shinyChance(){
  return 0.03 + treeEffectSummary().shinyBonus/100;
}
function isShinyKey(k){return k.startsWith("✨|||");}
function shinyBaseKey(k){return k.replace(/^✨\|\|\|/,"");}
function shinyKey(e,l){return "✨|||"+key(e,l);}
function shinyMultiplier(k){
  return goldenMultiplier(shinyBaseKey(k))*1.5;
}
function isGoldenKey(k){return k.startsWith("🌟|||");}
function goldenBaseKey(k){return k.replace(/^🌟\|\|\|/,"");}
function goldenKey(e,l){return "🌟|||"+key(e,l);}
function goldenMultiplier(k){return multiplier(goldenBaseKey(k))*CL3_BALANCE.goldenMultiplier;}
function equipShinyUnit(e,l){
  const k=shinyKey(e,l), owned=game.shinyPets[k]||0;
  const eq=game.equipped.filter(x=>x===k).length;
  if(!owned||eq>=owned){toast("❌ No tienes más copias Shiny");return;}
  if(game.equipped.length>=3){toast("❌ Máximo 3 mascotas");return;}
  game.equipped.push(k);toast("✨ ¡Shiny equipada!");render();
}
function unequipShinyUnit(e,l){
  const k=shinyKey(e,l),i=game.equipped.lastIndexOf(k);
  if(i<0){toast("❌ Esa Shiny no está equipada");return;}
  game.equipped.splice(i,1);render();
}

/* =====================================================
   PARTIDA
===================================================== */

function newWorld(){

return{

clicks:0,

intensity:1,
intensityLevel:1,

critLevel:0,

comboUnlocked:false,
comboLevel:0,
combo:1,
bestCombo:1

};

}


let game={

world:0,

worlds:[],

unlocked:[0],

pets:{},

equipped:[],

streak:0,
lastLogin:null,
streakClaimed:false,

playSeconds:0,
lastActive:Date.now(),

timeClaimed:{},

missionsClaimed:{},
redeemedCodes:{},
soundEnabled:true,

milestonesHit:{},
luckUntil:0,
clickBoostUntil:0,
autoOpenEggs:false,
adLuckUntil:0,
adSpeedUntil:0,
achievementBonus:0,
achievementsClaimed:{},
shinyPets:{},
goldenPets:{},
petLocks:{},
petFavorites:{},
petSort:"favorite",
petsDiscovered:{},
upgradeTree:{
  branch:null,
  purchased:["root"]
},

skins:{
  button:"classic",
  effect:"classic",
  ownedButtons:["classic"],
  ownedEffects:["classic"]
},

autoClicker:{
unlocked:false,
intensityLevel:0,
speedLevel:0,
nextTick:0
},

totalClicks:0,
criticals:0,
eggs:0,
fusions:0,

rebirths:0,
tokens:0,

permanent:{
clicks:0,
critical:0,
combo:0
}

};


for(let i=0;i<worlds.length;i++){
    game.worlds.push(newWorld());
}



/* =====================================================
   CARGAR
===================================================== */

const old=localStorage.getItem(CL1_SAVE_KEY);

if(old){

try{

let loaded=JSON.parse(old);

game=Object.assign(game,loaded);
if(!game.goldenPets) game.goldenPets={};
if(!game.shinyPets) game.shinyPets={};

while(game.worlds.length<worlds.length){
    game.worlds.push(newWorld());
}

if(!game.permanent){
    game.permanent={
        clicks:0,
        critical:0,
        combo:0
    };
}

if(!game.pets){
    game.pets={};
}

if(!game.equipped){
    game.equipped=[];
}

if(!game.missionsClaimed){
    game.missionsClaimed={};
}

if(!game.redeemedCodes){
    game.redeemedCodes={};
}

if(!('soundEnabled' in game)){
    game.soundEnabled=true;
}

if(!game.milestonesHit){
    game.milestonesHit={};
}

if(!('clickBoostUntil' in game)){
    game.clickBoostUntil=0;
}
if(!('autoOpenEggs' in game)){
    game.autoOpenEggs=false;
}
if(!('adLuckUntil' in game)){
    game.adLuckUntil=0;
}
if(!('adSpeedUntil' in game)){
    game.adSpeedUntil=0;
}

if(!('achievementBonus' in game)){
    game.achievementBonus=0;
}

if(!game.achievementsClaimed){
    game.achievementsClaimed={};
}
if(!game.shinyPets){
    game.shinyPets={};
}
if(!game.petLocks){
    game.petLocks={};
}
if(!game.petFavorites){
    game.petFavorites={};
}
if(!game.petSort){
    game.petSort="favorite";
}
if(!game.petsDiscovered){
    game.petsDiscovered={};
}
if(!game.upgradeTree){
    game.upgradeTree={branch:null,purchased:["root"]};
}
if(!Array.isArray(game.upgradeTree.purchased)){
    game.upgradeTree.purchased=[];
}
if(!game.upgradeTree.purchased.includes("root")){
    game.upgradeTree.purchased.push("root");
}


if(!game.autoClicker){
    game.autoClicker={
        unlocked:false,
        intensityLevel:0,
        speedLevel:0,
        nextTick:0
    };
}

if(!game.skins){
    game.skins={
        button:"classic",
        effect:"classic",
        ownedButtons:["classic"],
        ownedEffects:["classic"]
    };
}
if(!Array.isArray(game.skins.ownedButtons)){
    game.skins.ownedButtons=["classic"];
}
if(!Array.isArray(game.skins.ownedEffects)){
    game.skins.ownedEffects=["classic"];
}
if(!game.skins.button){
    game.skins.button="classic";
}
if(!game.skins.effect){
    game.skins.effect="classic";
}
if(!game.seasonNotices){
    game.seasonNotices={};
}

/* Validamos tanto la copia de respaldo como la partida cargada.
   Si una de las dos fue editada, usamos la última copia íntegra. */
function cl1IsLoadedGameCriticalValid(){
    try{
        const stored=localStorage.getItem(CL1_INTEGRITY_KEY);
        if(!stored) return true; /* partida anterior a Fase 1 */
        return cl1Integrity(cl1CriticalSnapshot(game))===stored;
    }catch(e){
        return false;
    }
}

if(!cl1ValidateCriticalSave() || !cl1IsLoadedGameCriticalValid()){
    cl1RestoreCriticalBackup();
}

}catch(e){

console.log("No se pudo cargar");

}

}



/* =====================================================
   CÓDIGOS
===================================================== */

const redeemableCodes={
    "WELCOME":{
        text:"🎁 +5.000 Clics",
        apply:()=>{ W().clicks+=5000; }
    },
    "LEAP POWER":{
        text:"⚡ +1.000.000 Clics",
        apply:()=>{ W().clicks+=1000000; }
    },
    "LUCKY":{
        text:"🍀 +250.000 Clics y +5 Tokens",
        apply:()=>{ W().clicks+=250000; game.tokens+=5; }
    },
    "PET LOVER":{
        text:"🐶 +1 Perro",
        apply:()=>{ let k=key("🐶",0); game.pets[k]=(game.pets[k]||0)+1; }
    },
    "EGG HUNT":{
        text:"🥚 +1 mascota de Huevo del Bosque",
        apply:()=>{
            let list=worlds[0].eggs[0][2];
            let e=list[Math.floor(Math.random()*list.length)];
            let k=key(e,0); game.pets[k]=(game.pets[k]||0)+1;
        }
    },
    "REBIRTH":{
        text:"✨ +25 Tokens",
        apply:()=>{ game.tokens+=25; }
    }
};

function redeemCode(){
    let input=document.getElementById("codeInput");
    if(!input) return;
    let raw=input.value.trim();
    let code=raw.toUpperCase();

    if(!code){
        toast("❌ Escribe un código");
        return;
    }

    let data=redeemableCodes[code];
    if(!data){
        toast("❌ Código no válido");
        return;
    }
    if(game.redeemedCodes[code]){
        toast("⚠️ Ya has usado este código");
        return;
    }

    data.apply();
    game.redeemedCodes[code]=true;
    input.value="";
    toast("🎉 Código canjeado: "+data.text);
    sfx("code");
    render();
    save();
}

/* =====================================================
   UTILIDADES
===================================================== */

function W(){
    return game.worlds[game.world];
}


function fmt(n){

if(n<1000){
    return Math.floor(n);
}

let u=[
"K","M","B","T",
"Qa","Qi","Sx","Sp","Oc"
];

let i=-1;

while(
    n>=1000 &&
    i<u.length-1
){

n/=1000;
i++;

}

if(n<10){
    return n.toFixed(2)+u[i];
}

if(n<100){
    return n.toFixed(1)+u[i];
}

return Math.floor(n)+u[i];

}


/* =====================================================
   SONIDO
   (tonos sintetizados con Web Audio API, sin ficheros
   externos, para que el juego siga siendo autónomo)
===================================================== */

let audioCtx=null;

function getAudioCtx(){
    if(!audioCtx){
        try{
            audioCtx=new (window.AudioContext||window.webkitAudioContext)();
        }catch(e){
            return null;
        }
    }
    if(audioCtx.state==="suspended"){
        audioCtx.resume();
    }
    return audioCtx;
}

function soundOn(){
    return typeof game!=="undefined" && game.soundEnabled!==false;
}

/* Una nota simple: frecuencia, duración, tipo de onda,
   volumen y desde cuándo (delay en segundos) */
/* [arcade] tone() → capa de presentación */

/* Varias notas a la vez = acorde (para que las fanfarrias
   suenen "llenas" en vez de una sola nota fina) */
/* [arcade] chord() → capa de presentación */

/* Golpe grave corto, para dar "impacto" al final de una fanfarria */
/* [arcade] punch() → capa de presentación */

/* [arcade] sfx() → capa de presentación */


function toggleSound(){

    game.soundEnabled = !soundOn();

    toast(
        soundOn() ? "🔊 Sonido activado" : "🔇 Sonido silenciado"
    );

    /* Desbloquea el audio en móvil: hace falta un gesto
       del usuario para poder reproducir sonido después */
    getAudioCtx();

    save();
    render();

}


/* [arcade] toast() → capa de presentación */


/* =====================================================
   CONFIRMACIÓN PERSONALIZADA
   (el confirm() nativo del navegador no es fiable
   dentro de este visor, así que usamos nuestro propio
   modal en HTML/CSS)
===================================================== */

/* [arcade] showConfirm() → capa de presentación */


let sectionScroll={};
let currentSection="home";

function page(id){

sectionScroll[currentSection]=
window.scrollY||document.documentElement.scrollTop||0;

/* FASE 2: congelar / reanudar combo al cambiar de pestaña */
const prev=currentSection;
if(prev==="home" && id!=="home"){
  /* Salimos del grind: congelar el reloj del combo */
  comboPausedAt=Date.now();
}else if(prev!=="home" && id==="home"){
  /* Volvemos al grind: el tiempo fuera no cuenta contra el combo */
  if(comboPausedAt>0){
    const pausedFor=Date.now()-comboPausedAt;
    lastClick+=pausedFor;
    comboPausedAt=0;
  }
}

document.querySelectorAll("section")
.forEach(x=>x.classList.add("hidden"));

document.getElementById(id)
.classList.remove("hidden");

currentSection=id;

render();

/* Centra el botón de la pestaña activa en el menú inferior
   para que el scroll horizontal lo mantenga visible */
let navBtn=document.querySelector('.nav button[onclick="page(\''+id+'\')"]');
if(navBtn&&navBtn.scrollIntoView){
    navBtn.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
}

requestAnimationFrame(()=>{
    window.scrollTo(0,sectionScroll[id]||0);
});

}



/* =====================================================
   GUARDADO AUTOMÁTICO
===================================================== */

function save(){
    cl1SaveSecure();
    toast("💾 Partida guardada");
}

setInterval(()=>{
    cl1SaveSecure();
},5000);



/* =====================================================
   ACTIVIDAD / TIEMPO
===================================================== */

function active(){

game.lastActive=Date.now();

}

document.addEventListener(
    "click",
    active
);


/* El botón de clic usa touchstart en vez de depender solo
   del evento "click": en móvil, toques rápidos/con varios
   dedos pueden perderse o confundirse con un gesto de zoom
   antes de generar el click sintético. Con touchstart
   respondemos al instante y contamos un clic por cada dedo
   que toca, y bloqueamos el click sintético posterior para
   no contar el mismo toque dos veces. */
(function(){
    let clickBtn=document.getElementById("click");
    if(!clickBtn) return;

    clickBtn.addEventListener("touchstart",function(e){

        e.preventDefault();

        let n=e.changedTouches.length;

        for(let i=0;i<n;i++){
            doClick();
        }

    },{passive:false});

    clickBtn.addEventListener("touchend",function(){
        /* La animación la controla pulseClickButton(); así los toques
           rápidos no cortan la pulsación antes de que se vea. */
        clickBtn.classList.remove("touchActive");
    },{passive:true});

    clickBtn.addEventListener("touchcancel",function(){
        clickBtn.classList.remove("touchActive");
    },{passive:true});
})();


setInterval(()=>{

let idle=
(Date.now()-game.lastActive)/1000;

if(idle<=60){

game.playSeconds++;

let a=document.getElementById("activity");

if(a){
    a.textContent="● ACTIVO";
    a.style.color="#4cff91";
}

}else{

let a=document.getElementById("activity");

if(a){
    a.textContent="● INACTIVO";
    a.style.color="#ff6666";
}

}

renderTime();

},1000);



/* =====================================================
   CLIC
===================================================== */

let lastClick=0;
/* FASE 2: el combo solo vive en la pantalla Inicio.
   Al salir se congela el temporizador para no perder la racha. */
let comboPausedAt=0;

let lastVisualPress=0;
/* [arcade] pulseClickButton() → capa de presentación */


function doClick(){

pulseClickButton();

active();

let w=W();

let now=Date.now();


/* COMBO — solo en pantalla Inicio (Fase 2) */
if(currentSection!=="home"){
  /* Si por cualquier motivo se clica fuera, no tocamos el combo */
}else if(w.comboUnlocked){
  /* Si venimos de pausa, ya se ajustó lastClick en page() */
  if(now-lastClick<2500){
    w.combo++;
  }else{
    w.combo=1;
  }
  /* El Combo no tiene niveles ni mejoras: máximo x5 */
  w.combo=Math.min(w.combo,5);
}else{
  w.combo=1;
}

if(currentSection==="home"){
  lastClick=now;
  comboPausedAt=0;
}


/* MULTIPLICADOR MASCOTAS */

let petMulti=
petMultiplier();


/* PODER BASE */

let amount=
w.intensity;


/* COMBO */

amount*=w.combo;


/* MASCOTAS */

amount*=petMulti;


/* PERMANENTES */

amount*=
1+
game.permanent.clicks*0.10;

amount*=
1+
treeEffectSummary().clickBonus/100;

/* BONUS DE AURA — la estética sigue siendo lo principal,
   pero cada aura aporta un pequeño bonus permanente de clic. */
const equippedAura=auraById(game.skins&&game.skins.aura);
amount*=1+(equippedAura.bonus||0)/100;


/* CRÍTICO
   Base 5% si está desbloqueado.
   FASE 2: la Suerte temporal SOLO puede subir la probabilidad de crítico
   (y los drops de huevos). Nunca afecta daño base, precios ni mundos. */
let critChance = w.critLevel>0 ? 0.05 : 0;
const luckActive = (game.luckUntil && game.luckUntil>Date.now()) ||
                   (game.adLuckUntil && game.adLuckUntil>Date.now());
if(critChance>0 && luckActive){
  critChance = Math.min(0.15, critChance + 0.05); /* +5% mientras hay suerte */
}
let critical=Math.random()<critChance;


if(critical){

/* Crítico desbloqueado = x2 */
amount*=2;

game.criticals++;

float(
"💥 CRÍTICO +"+
fmt(amount)
);

particles(["#ffd83c","#ff7920","#fff7d0"]);

sfx("crit");

}else{

float(
(w.combo>1 ? "+"+fmt(amount)+" 🔥" : "👆 +"+fmt(amount)),
(w.combo>1 ? "combo" : "normal")
);

particles(["#42e5ff","#a855f7","#ff5bd0"]);

}


/* GUARDAR */

w.clicks+=amount;

game.totalClicks+=amount;


if(w.combo>w.bestCombo){

w.bestCombo=w.combo;

}


/* BONUS SORPRESA: pequeña probabilidad por clic */
if(Math.random()<0.006){

let bonus=
Math.max(200,Math.floor(amount*15));

w.clicks+=bonus;

game.totalClicks+=bonus;

toast(
"🎁 ¡BONUS SORPRESA +"+fmt(bonus)+" 👆!"
);

sfx("claim");

particles(["#4cff91","#ffd83c","#ffffff"]);

}


checkMilestones();

renderStats();

}



/* =====================================================
   MULTIPLICADOR DE MASCOTAS
===================================================== */

function petMultiplier(){

let total=1;


/*
   Las mascotas se multiplican.
   
   Ejemplo:
   x2 × x3 × x4 = x24
*/

game.equipped.forEach(k=>{

total*=multiplier(k);

});


return total;

}



/* =====================================================
   MULTIPLICADOR INDIVIDUAL
===================================================== */

function key(e,l){

return e+"|||"+l;

}


function multiplier(k){
let shiny=isShinyKey(k);
if(shiny) return shinyMultiplier(k);
let golden=isGoldenKey(k);
if(golden) return goldenMultiplier(k);
let parts=k.split("|||");
let e=parts[0];
let l=Number(parts[1]);
if(!pets[e]) return 1.5;
let bonus=1+(treeEffectSummary().petBonus/100);
return pets[e][2]*Math.pow(1.35,l)*bonus;
}



/* =====================================================
   INTENSIDAD
===================================================== */

function intensityCost(){

return Math.floor(
    60*
    Math.pow(
        3.0,
        W().intensityLevel-1
    )
);

}


function buyIntensity(){

let w=W();

let cost=intensityCost();


if(w.clicks<cost){

toast("❌ No tienes suficientes Clics");

return;

}


w.clicks-=cost;

w.intensityLevel++;

w.intensity=
w.intensityLevel;

toast(
"⚡ Intensidad "+w.intensity
);

render();

}



/* =====================================================
   CRÍTICO
===================================================== */

function critCost(){
/* Solo existe una compra: desbloquear */
return 4000;
}

function buyCrit(){
let w=W();
if(w.critLevel>0){
toast("💥 ¡Crítico ya está desbloqueado!");
return;
}
let cost=critCost();
if(w.clicks<cost){
toast("❌ No tienes suficientes Clics");
return;
}
w.clicks-=cost;
w.critLevel=1;
toast("💥 ¡CRÍTICO DESBLOQUEADO!");
render();
}

/* =====================================================
   COMBO
===================================================== */

function comboCost(){
/* Solo existe una compra: desbloquear */
return 40000;
}

function buyCombo(){
let w=W();
if(w.comboUnlocked){
toast("🔥 ¡Combo ya está desbloqueado!");
return;
}
let cost=comboCost();
if(w.clicks<cost){
toast("❌ No tienes suficientes Clics");
return;
}
w.clicks-=cost;
w.comboUnlocked=true;
w.comboLevel=0;
w.combo=1;
toast("🔥 ¡COMBO DESBLOQUEADO!");
render();
}

/* =====================================================
   GESTIÓN DE MASCOTAS
===================================================== */

function petLocked(k){ return !!game.petLocks?.[k]; }
function petFavorite(k){ return !!game.petFavorites?.[k]; }

function togglePetLock(k){
    game.petLocks[k]=!petLocked(k);
    toast(game.petLocks[k] ? "🔒 Mascota protegida" : "🔓 Mascota desbloqueada");
    save(); render();
}

function togglePetFavorite(k){
    game.petFavorites[k]=!petFavorite(k);
    toast(game.petFavorites[k] ? "⭐ Añadida a favoritas" : "☆ Quitada de favoritas");
    save(); render();
}

/* [arcade] deletePetUnit() → capa de presentación */

/* [arcade] deleteShinyUnit() → capa de presentación */

/* [arcade] deleteGoldenUnit() → capa de presentación */

function equipGoldenUnit(e,l){
    const k=goldenKey(e,l), owned=game.goldenPets[k]||0;
    const eq=game.equipped.filter(x=>x===k).length;
    if(!owned || eq>=owned){ toast("❌ No tienes más copias Doradas"); return; }
    if(game.equipped.length>=3){ toast("❌ Máximo 3 mascotas"); return; }
    game.equipped.push(k); toast("🌟 ¡Dorada equipada!"); render();
}
function unequipGoldenUnit(e,l){
    const k=goldenKey(e,l),i=game.equipped.lastIndexOf(k);
    if(i<0){ toast("❌ Esa Dorada no está equipada"); return; }
    game.equipped.splice(i,1); render();
}

function setPetSort(value){
    game.petSort=value;
    save(); render();
}

/* =====================================================
   EQUIPAR / DESEQUIPAR
===================================================== */

function equipUnit(e,l){

let k=key(e,l);

let owned=game.pets[k]||0;

let equippedCount=
game.equipped.filter(x=>x===k).length;


if(equippedCount>=owned){

toast(
"❌ No tienes más copias de esta mascota"
);

return;

}


if(game.equipped.length>=3){

toast(
"❌ Máximo 3 mascotas"
);

return;

}


game.equipped.push(k);

toast(
"🐾 Mascota equipada ("+(equippedCount+1)+"/"+owned+")"
);

render();

}


function unequipUnit(e,l){

let k=key(e,l);

let idx=
game.equipped.lastIndexOf(k);


if(idx===-1){

toast(
"❌ Esa mascota no está equipada"
);

return;

}


game.equipped.splice(idx,1);

toast("❌ Desequipada");

render();

}



/* =====================================================
   EQUIPAR MEJORES
===================================================== */

function equipBest(){

let available=[];


Object.keys(game.pets)
.forEach(k=>{

let owned=game.pets[k]||0;

/* Cada copia poseída es una unidad equipable independiente,
   pero como máximo hay 3 huecos, no hace falta apilar más de 3 */
let copies=Math.min(owned,3);

for(let i=0;i<copies;i++){

available.push({

key:k,

power:multiplier(k)

});

}

});


Object.keys(game.goldenPets||{}).forEach(k=>{
 let owned=game.goldenPets[k]||0;
 let copies=Math.min(owned,3);
 for(let i=0;i<copies;i++) available.push({key:k,power:goldenMultiplier(k)});
});

Object.keys(game.shinyPets||{}).forEach(k=>{
 let owned=game.shinyPets[k]||0;
 let copies=Math.min(owned,3);
 for(let i=0;i<copies;i++) available.push({key:k,power:shinyMultiplier(k)});
});

/* ORDENAR DE MAYOR A MENOR */

available.sort(
(a,b)=>b.power-a.power
);


/* SOLO LAS 3 MEJORES UNIDADES (pueden ser copias del mismo tipo) */

game.equipped=
available
.slice(0,3)
.map(x=>x.key);


if(game.equipped.length===0){

toast(
"🐾 No tienes mascotas"
);

}else{

toast(
"⚡ ¡3 mejores mascotas equipadas!"
);

}

render();

}



/* =====================================================
   FUSIÓN
===================================================== */

function fuse(e,l){
  const normalKey=key(e,l);
  const golden=game.goldenPets||{};
  const goldenK=goldenKey(e,l);
  const normalOwned=game.pets[normalKey]||0;
  const goldenOwned=golden[goldenK]||0;

  // 5 mascotas normales idénticas -> 1 Dorada.
  if(normalOwned >= CL3_BALANCE.fusionNormalRequired){
    game.pets[normalKey]=normalOwned-CL3_BALANCE.fusionNormalRequired;
    if(game.pets[normalKey]<=0) delete game.pets[normalKey];
    golden[goldenK]=(golden[goldenK]||0)+1;
    game.fusions++;
    toast("🌟 ¡5 mascotas fusionadas en una DORADA!");
    sfx("fuse");
    save(); render();
    return;
  }

  // 5 Doradas idénticas -> 1 Shiny.
  if(goldenOwned >= CL3_BALANCE.fusionGoldenRequired){
    golden[goldenK]=goldenOwned-CL3_BALANCE.fusionGoldenRequired;
    if(golden[goldenK]<=0) delete golden[goldenK];
    const sk=shinyKey(e,l);
    game.shinyPets[sk]=(game.shinyPets[sk]||0)+1;
    game.fusions++;
    toast("✨ ¡5 DORADAS fusionadas en una SHINY!");
    sfx("fuse");
    save(); render();
    return;
  }

  toast("❌ Necesitas 5 mascotas iguales o 5 Doradas iguales");
}



/* =====================================================
   HUEVOS
===================================================== */

/* Cada huevo tiene exactamente 4 mascotas, sin repetidas.
   Se muestran y se usan de menor a mayor multiplicador. */
function orderedEggPets(egg){
    return (egg[2]||[])
        .slice(0,4)
        .sort((a,b)=>(pets[a]?.[2]||0)-(pets[b]?.[2]||0));
}

function openEgg(egg,eggIndex){
    const worldIndex=game.world;
    if(eggIndex===undefined){
        eggIndex=worlds[worldIndex].eggs.indexOf(egg);
    }
    const price=cl3EggCost(worldIndex,Math.max(0,eggIndex),egg[1]);
    egg=[egg[0],price,orderedEggPets(egg)];

if(W().clicks<egg[1]){

toast(
"❌ No tienes suficientes Clics"
);

return;

}


W().clicks-=egg[1];


let list=orderedEggPets(egg);
let r=Math.random();

let luckyActive=
game.luckUntil && game.luckUntil>Date.now();

let adLuckyActive=
game.adLuckUntil && game.adLuckUntil>Date.now();

let luckBonus=treeEffectSummary().eggLuck/100;
let rr=Math.max(0,r-(luckyActive||adLuckyActive?0.18:0)*luckBonus);
let i=
adLuckyActive
? (rr<0.15 ? 0 : rr<0.40 ? 1 : rr<0.70 ? 2 : 3)
: luckyActive
? (rr<0.30 ? 0 : rr<0.60 ? 1 : rr<0.85 ? 2 : 3)
: (rr<0.55 ? 0 : rr<0.82 ? 1 : rr<0.96 ? 2 : 3);

showEgg(list[i]);

}



/* =====================================================
   ANIMACIÓN HUEVO
===================================================== */

/* [arcade] showEgg() → capa de presentación */

function claimEggFromOverlay(){
    const overlay=[...document.querySelectorAll(".eggOverlay")].find(el=>el.id!=="autoEggSummaryOverlay" && !el.classList.contains("hidden"));
    if(!overlay) return;
    const emoji=overlay.dataset.eggPet;
    claimEgg(emoji,overlay.dataset.shiny==="1");
}


/* =====================================================
   RECLAMAR MASCOTA
===================================================== */

function removeEggAnimOverlays(){
  document.querySelectorAll(".eggOverlay").forEach(el=>{
    if(el.id === "autoEggSummaryOverlay") return;
    el.remove();
  });
}

function claimEgg(e,forcedShiny=null){
let k=key(e,0);
let shiny=forcedShiny===null ? Math.random()<shinyChance() : !!forcedShiny;
const quiet = typeof AUTO_EGG!=="undefined" && AUTO_EGG.active;

/* FASE 3: control de inventario */
const inv = totalPetInventory();
if(inv >= MAX_PET_INVENTORY){
  const refund = Math.max(100, Math.floor((W().intensity||1) * 40));
  W().clicks += refund;
  game.totalClicks += refund;
  game.eggs++;
  removeEggAnimOverlays();
  if(!quiet) toast("📦 Inventario lleno ("+inv+"/"+MAX_PET_INVENTORY+"). Mascota convertida en +"+fmt(refund)+" 👆");
  if(!quiet) render();
  else {
    renderStats();
    if(typeof AUTO_EGG!=="undefined" && AUTO_EGG.active){
      AUTO_EGG.busy=false;
      stopAutoEggSession("inventory");
    }
  }
  return;
}

game.pets[k]=(game.pets[k]||0)+1;
if(shiny){
  if(!game.shinyPets) game.shinyPets={};
  let sk=shinyKey(e,0);
  game.shinyPets[sk]=(game.shinyPets[sk]||0)+1;
  if(!quiet){ toast("✨ ¡HAS CONSEGUIDO UNA VARIANTE SHINY!"); sfx("unlock"); }
}

game.eggs++;

removeEggAnimOverlays();

if(!quiet){
  toast("🐾 ¡Mascota conseguida! ("+(inv+1)+"/"+MAX_PET_INVENTORY+")");
  render();
}else{
  if(typeof syncPetDiscoveries==="function") syncPetDiscoveries();
  renderStats();
}
}



/* =====================================================
   MUNDOS
===================================================== */

function hasPet(emoji){

if(!emoji){
    return true;
}

return Object.keys(game.pets).some(k=>{
    return k.startsWith(emoji+"|||") && (game.pets[k]||0)>0;
});

}


function travel(i){
/* FASE 3: requisitos 100% deterministas (clics del mundo anterior,
   renacimientos, mascota). La Suerte NO interviene aquí.
   Los multiplicadores del mundo activo solo afectan al combate. */

let target = worlds[i];
if(!target) return;

// Mundos de temporada
if(target.seasonal){
  const season = SEASONS[target.seasonId];
  if(!isSeasonActive(target.seasonId)){
    toast((season?season.emoji:"🔒")+" Este mundo solo está disponible durante su temporada");
    return;
  }
  if(!game.unlocked.includes(i)){
    game.unlocked.push(i);
  }
  game.world = i;
  toast((season?season.emoji:"🎉")+" ¡Bienvenido al Mundo de "+(season?season.name:"Temporada")+"!");
  sfx("unlock");
  render();
  return;
}

if(game.unlocked.includes(i)){

game.world=i;

render();

return;

}


if(i===0){
    return;
}


let need=
cl3WorldCost(i);


let previous=
(game.worlds[i-1]||{clicks:0}).clicks;


if(previous<need){

toast(
"🔒 Necesitas "+
fmt(need)+
" Clics en "+
worlds[i-1].name
);

return;

}


if(
target.rebirthsRequired &&
game.rebirths<target.rebirthsRequired
){

toast(
"🔒 Necesitas "+
target.rebirthsRequired+
" Renacimientos"
);

return;

}


if(
target.petRequired &&
!hasPet(target.petRequired)
){

let p=
pets[target.petRequired];

toast(
"🔒 Necesitas la mascota "+
target.petRequired+" "+
(p?p[0]:"")
);

return;

}


game.unlocked.push(i);

game.world=i;


toast(
"🌎 ¡NUEVO MUNDO!"
);

sfx("unlock");

render();

}



/* =====================================================
   RACHA
===================================================== */

function today(){

let d=new Date();

return d
.toISOString()
.slice(0,10);

}


function yesterday(){

let d=new Date();

d.setDate(
    d.getDate()-1
);

return d
.toISOString()
.slice(0,10);

}


function updateStreak(){

let t=today();


if(game.lastLogin===t){

return;

}


if(!game.lastLogin){

game.streak=1;

}else if(
game.lastLogin===yesterday()
){

game.streak++;

}else{

/*
   Si no entra un día,
   la racha se pierde.
*/

game.streak=1;

}


game.lastLogin=t;

game.streakClaimed=false;

}


updateStreak();



/* =====================================================
   RECOMPENSA RACHA
===================================================== */

function streakReward(){

let day=
((game.streak-1)%7)+1;


if(day===7){

let week=
Math.floor(
    (game.streak-1)/7
)+1;


return{

weekly:true,

clicks:
Math.floor(
40000*
Math.pow(
1.5,
Math.min(
week,
20
)
)
),

tokens:10

};

}


return{

weekly:false,

clicks:
Math.floor(
500*
Math.pow(
1.4,
day-1
)
),

tokens:0

};

}



/* =====================================================
   RECLAMAR RACHA
===================================================== */

function claimStreak(){

if(game.streakClaimed){

toast(
"✅ Ya has reclamado la recompensa de hoy"
);

return;

}


let r=
streakReward();


W().clicks+=r.clicks;

game.tokens+=r.tokens;

game.streakClaimed=true;


toast(

r.weekly

?

"💎 ¡RECOMPENSA DEL DÍA 7!"

:

"🔥 ¡RECOMPENSA RECLAMADA!"

);

sfx("claim");

render();

}



/* =====================================================
   RECOMPENSAS TIEMPO
===================================================== */

const timeRewards=[

[300,"5 minutos",1000],

[900,"15 minutos",5000],

[1800,"30 minutos",25000],

[3600,"1 hora",150000],

[7200,"2 horas",1000000],

[18000,"5 horas",0],

[36000,"10 horas",0],

[90000,"25 horas",0]

];


function claimTime(i){

if(game.timeClaimed[i]){

return;

}


let r=
timeRewards[i];


if(game.playSeconds<r[0]){

toast(
"⏱️ Todavía no puedes reclamarlo"
);

return;

}


if(i<=4){

W().clicks+=r[2];

toast(
"🎁 +"+
fmt(r[2])+
" 👆"
);

}

else if(i===5){

game.tokens+=5;

toast(
"🥚 ¡Recompensa especial!"
);

}

else if(i===6){

game.tokens+=15;

toast(
"🐾 ¡Recompensa de mascota!"
);

}

else{

game.tokens+=50;

toast(
"💎 ¡RECOMPENSA DIVINA!"
);

}


game.timeClaimed[i]=true;

sfx("claim");

render();

}



/* =====================================================
   RENACIMIENTO
===================================================== */

function rebirthCost(){
/* Coste escalado por número de renacimientos ya hechos */
return Math.floor(500000 * Math.pow(10, game.rebirths));
}

/* Tokens otorgados al renacer: basan en los clics sacrificados y el nº de renacimiento.
   Fórmula visible y generosa para que el jugador sienta progreso. */
function rebirthTokenReward(){
  const cost = rebirthCost();
  const sacrificed = Math.max(W().clicks, cost);
  /* Base 5 + 3 por cada renacimiento previo + bonus logarítmico por clics sacrificados */
  const base = 5 + (game.rebirths * 3);
  const bonus = Math.floor(Math.log10(sacrificed + 1) * 2);
  return Math.max(5, base + bonus);
}


function rebirth(){

let cost = rebirthCost();
let reward = rebirthTokenReward();

if(W().clicks < cost){
  toast("❌ Necesitas "+fmt(cost)+" Clics para renacer");
  return;
}

/* Sacrificamos los clics del mundo actual */
W().clicks = 0;

/* Reiniciamos solo las mejoras temporales del mundo actual */
W().intensity = 1;
W().intensityLevel = 1;
W().critLevel = 0;
W().comboUnlocked = false;
W().comboLevel = 0;
W().combo = 1;

game.rebirths++;
game.tokens += reward;

toast("🔄 ¡RENACIMIENTO! +"+reward+" ✨ Tokens");
sfx("rebirth");
render();
}



/* =====================================================
   MEJORAS PERMANENTES
===================================================== */

function permanentCost(type){

return 5+
game.permanent[type]*5;

}


function buyPermanent(type){
/* Crítico y Combo no tienen mejoras permanentes */
if(type!=="clicks") return;
let cost=
permanentCost(type);


if(game.tokens<cost){

toast(
"❌ No tienes suficientes Tokens"
);

return;

}


game.tokens-=cost;

game.permanent[type]++;


toast(
"🌟 ¡MEJORA PERMANENTE!"
);

render();

}




/* =====================================================
   FASE 1 — USOS EXTRA DE TOKENS
===================================================== */

function buyTokenItem(type){
    const costs={
        luckHour:20,
        clickBoost:15,
        freeEgg:30,
        autoOpen:80
    };

    const cost=costs[type];
    if(cost==null){ toast("❌ Opción no válida"); return; }
    if(game.tokens<cost){
        toast("❌ No tienes suficientes Tokens");
        return;
    }

    if(type==="luckHour"){
        game.tokens-=cost;
        cl2ActivateLuck(60);
        toast("🍀 ¡Suerte x2 activada durante 1 hora!");
        sfx("unlock");
    }

    if(type==="clickBoost"){
        game.tokens-=cost;
        game.clickBoostUntil=Math.max(game.clickBoostUntil||0,Date.now())+15*60000;
        toast("⚡ ¡x2 Clics activado durante 15 minutos!");
        sfx("unlock");
    }

    if(type==="freeEgg"){
        game.tokens-=cost;
        let egg=worlds[game.world].eggs[Math.floor(Math.random()*worlds[game.world].eggs.length)];
        let list=orderedEggPets(egg);
        let r=Math.random();
        let luckyActive=game.luckUntil && game.luckUntil>Date.now();
        let i=luckyActive ? (r<0.30?0:r<0.60?1:r<0.85?2:3) : (r<0.55?0:r<0.82?1:r<0.96?2:3);
        showEgg(list[i]);
        sfx("egg");
    }

    /* FASE 4: Auto-Apertura permanente */
    if(type==="autoOpen"){
        if(game.autoOpenEggs){
            toast("✅ Ya tienes Auto-Apertura desbloqueada");
            return;
        }
        game.tokens-=cost;
        game.autoOpenEggs=true;
        toast("🥚🤖 ¡AUTO-APERTURA DESBLOQUEADA!");
        sfx("unlock");
    }

    render();
    save();
}

/* =====================================================
   ANUNCIOS RECOMPENSADOS (Rewarded Ads)
   ---------------------------------------------------
   requestRewardedAd() es el único punto de contacto con el
   SDK de anuncios. Ahora mismo SIMULA que el anuncio se ve
   completo tras 1.5s, para poder probar el resto del sistema
   sin tener ningún SDK instalado todavía.

   PARA INTEGRAR EL SDK REAL:
   - AdMob (Capacitor/Cordova, plugin @capacitor-community/admob
     u otro): sustituye el contenido marcado abajo por la carga
     y mostrado de un AdMob.RewardedAd real. Llama a onReward()
     SOLO cuando llegue el evento "onRewarded"/"onUserEarnedReward"
     (el usuario vio el anuncio completo). Llama a onFail() si
     el usuario lo cierra antes de tiempo, si falla la carga, o
     si no hay anuncios disponibles en ese momento.
   - Unity Ads: igual, sustituye por Advertisement.Show(placementId,
     {onFinished:onReward, onSkipped:onFail, onError:onFail}).
===================================================== */

function requestRewardedAd(onReward,onFail){

    /* ⬇⬇⬇ SUSTITUIR ESTE BLOQUE POR LA LLAMADA REAL AL SDK ⬇⬇⬇ */

    toast("📺 Cargando anuncio...");

    setTimeout(()=>{
        // Simulación de prueba: el anuncio siempre se completa.
        // El SDK real decide aquí si hubo éxito o no.
        onReward();
    },1500);

    /* ⬆⬆⬆ SUSTITUIR ESTE BLOQUE POR LA LLAMADA REAL AL SDK ⬆⬆⬆ */

}

function watchAdForLuck(){

    requestRewardedAd(
        ()=>{
            game.adLuckUntil=Math.max(game.adLuckUntil||0,Date.now())+10*60000;
            toast("🍀 ¡Suerte x3 activada durante 10 minutos!");
            sfx("unlock");
            render(); save();
        },
        ()=>{
            toast("❌ No se pudo completar el anuncio");
        }
    );

}

function watchAdForSpeed(){

    if(!game.autoClicker.unlocked){
        toast("🔒 Primero desbloquea el Auto-Clicker");
        return;
    }

    requestRewardedAd(
        ()=>{
            game.adSpeedUntil=Math.max(game.adSpeedUntil||0,Date.now())+5*60000;
            toast("⚡ ¡Velocidad de Auto-Clicker x2 activada durante 5 minutos!");
            sfx("unlock");
            render(); save();
        },
        ()=>{
            toast("❌ No se pudo completar el anuncio");
        }
    );

}

/* [arcade] renderAdShop() → capa de presentación */

/* [arcade] renderTokenShop() → capa de presentación */

/* =====================================================
   SKINS
===================================================== */

/* [arcade] applyButtonSkin() → capa de presentación */

function buySkin(kind,id){

    let list = kind==="button" ? BUTTON_SKINS : CLICK_EFFECTS;
    let ownedKey = kind==="button" ? "ownedButtons" : "ownedEffects";

    let item=list.find(s=>s.id===id);
    if(!item) return;

    if(game.skins[ownedKey].includes(id)){
        toast("✅ Ya tienes esta skin");
        return;
    }

    // Contenido de temporada: solo se puede comprar durante su mes
    if(item.season && !isSeasonActive(item.season)){
        const s = SEASONS[item.season];
        toast((s?s.emoji:"🔒")+" Exclusivo de la actualización de "+(s?s.name:"temporada")+" — Disponible en su mes");
        return;
    }

    let w=W();

    if(w.clicks<item.price){
        toast("❌ Necesitas "+fmt(item.price)+" 👆");
        return;
    }

    w.clicks-=item.price;
    game.skins[ownedKey].push(id);

    toast("🎉 ¡"+item.name+" desbloqueada!");
    sfx("claim");

    render();

}

function equipSkin(kind,id){

    let ownedKey = kind==="button" ? "ownedButtons" : "ownedEffects";

    if(!game.skins[ownedKey].includes(id)) return;

    game.skins[kind]=id;

    if(kind==="button") applyButtonSkin();

    sfx("code");

    render();

}

/* [arcade] skinCardHTML() → capa de presentación */

/* [arcade] renderSkins() → capa de presentación */

/* =====================================================
   TIEMPO
===================================================== */

function formatTime(){

let s=
game.playSeconds;

let h=
Math.floor(s/3600);

let m=
Math.floor(
    s%3600/60
);

let sec=
s%60;


return String(h)
.padStart(2,"0")
+
":"
+
String(m)
.padStart(2,"0")
+
":"
+
String(sec)
.padStart(2,"0");

}


function timeRewardText(i,r){

return i<=4
? fmt(r[2])+" 👆"
: i===5
? "🥚 Huevo especial"
: i===6
? "🐾 Recompensa especial"
: "💎 Recompensa divina";

}


/* [arcade] timeRewardButtonHTML() → capa de presentación */


/* [arcade] timeRewardItemHTML() → capa de presentación */


/* [arcade] renderTime() → capa de presentación */



/* =====================================================
   FLOAT
===================================================== */

/* [arcade] float() → capa de presentación */

/* [arcade] particles() → capa de presentación */



/* =====================================================
   HITOS (confeti + fanfarria)
===================================================== */

/* [arcade] confetti() → capa de presentación */


const clickMilestones=
[1000000,1000000000,1000000000000,1000000000000000];

function checkMilestones(){

if(!game.milestonesHit){
    game.milestonesHit={};
}

for(let m of clickMilestones){

    if(
        game.totalClicks>=m &&
        !game.milestonesHit[m]
    ){

        game.milestonesHit[m]=true;

        confetti();

        sfx("rebirth");

        toast(
            "🏆 ¡"+fmt(m)+" CLICS TOTALES!"
        );

    }

}

}



/* =====================================================
   AUTO-CLICKER
   Desbloqueable con Tokens (no gratis), con dos mejoras
   independientes —intensidad y velocidad—, cada una con
   un máximo de 10 niveles.
   FASE 3: ahora tiene una probabilidad reducida (~15-20 %
   de la del jugador) de activar Combo o Crítico.
===================================================== */

const AUTO_MAX_LEVEL=10;
const AUTO_UNLOCK_COST=30;

function autoLevelCost(level){
/* Coste en Tokens para subir del nivel indicado al siguiente */
return 10+level*6;
}

function autoClickAmount(){

if(!game.autoClicker.unlocked) return 0;

let w=W();

let base=
w.intensity*
petMultiplier()*
(1+game.permanent.clicks*0.10);

/* Nivel 1 = 15% de un clic manual normal.
   Nivel 10 (máximo) = 105%, es decir, similar a un
   clic manual sin combo ni crítico. */
let factor=
0.15+(game.autoClicker.intensityLevel-1)*0.10;

return base*Math.max(0,factor);

}

function autoClickInterval(){

/* Nivel 1 = cada 5s. Nivel 10 (máximo) = cada 1.2s. */
let level=
Math.max(1,game.autoClicker.speedLevel);

let base=Math.round(
5000-(level-1)*(3800/(AUTO_MAX_LEVEL-1))
);

/* Ventaja por anuncio: Velocidad x2 durante un tiempo limitado */
let adSpeedActive=
game.adSpeedUntil && game.adSpeedUntil>Date.now();

return adSpeedActive ? Math.round(base/2) : base;

}

function unlockAutoClicker(){

if(game.autoClicker.unlocked){
    toast("🤖 Ya está desbloqueado");
    return;
}

if(game.tokens<AUTO_UNLOCK_COST){
    toast("❌ Necesitas "+AUTO_UNLOCK_COST+" Tokens");
    return;
}

game.tokens-=AUTO_UNLOCK_COST;

game.autoClicker.unlocked=true;
game.autoClicker.intensityLevel=1;
game.autoClicker.speedLevel=1;
game.autoClicker.nextTick=Date.now()+autoClickInterval();

toast("🤖 ¡AUTO-CLICKER DESBLOQUEADO!");

sfx("unlock");

render(); save();

}

function upgradeAutoIntensity(){

if(!game.autoClicker.unlocked) return;

if(game.autoClicker.intensityLevel>=AUTO_MAX_LEVEL){
    toast("🤖 La intensidad ya está al máximo");
    return;
}

let cost=autoLevelCost(game.autoClicker.intensityLevel);

if(game.tokens<cost){
    toast("❌ Necesitas "+cost+" Tokens");
    return;
}

game.tokens-=cost;

game.autoClicker.intensityLevel++;

toast("🤖 Intensidad del auto-clicker: Nivel "+game.autoClicker.intensityLevel);

render(); save();

}

function upgradeAutoSpeed(){

if(!game.autoClicker.unlocked) return;

if(game.autoClicker.speedLevel>=AUTO_MAX_LEVEL){
    toast("🤖 La velocidad ya está al máximo");
    return;
}

let cost=autoLevelCost(game.autoClicker.speedLevel);

if(game.tokens<cost){
    toast("❌ Necesitas "+cost+" Tokens");
    return;
}

game.tokens-=cost;

game.autoClicker.speedLevel++;

game.autoClicker.nextTick=
Math.min(
    game.autoClicker.nextTick||0,
    Date.now()+autoClickInterval()
);

toast("🤖 Velocidad del auto-clicker: Nivel "+game.autoClicker.speedLevel);

render(); save();

}

function performAutoClick(){

if(!game.autoClicker.unlocked) return;

let w=W();

let amount=autoClickAmount();

if(amount<=0) return;

/* FASE 3: probabilidad reducida de Combo / Crítico (≈15-20 % de la del jugador) */
let isCrit = false;
let isCombo = false;

/* Crítico del jugador es 5 % fijo cuando está desbloqueado → auto usa ~1 % */
const playerCritChance = (w.critLevel > 0) ? 0.05 : 0;
const autoCritChance = playerCritChance * 0.20; /* 20 % de la del jugador */
if(Math.random() < autoCritChance){
  amount *= 2;
  isCrit = true;
  game.criticals++;
}

/* Combo: si está desbloqueado, ~15 % de probabilidad de aplicar un pulso de combo */
if(!isCrit && w.comboUnlocked && Math.random() < 0.15){
  const comboMulti = Math.min(2.0, 1 + ((w.combo || 1) * 0.12));
  amount *= comboMulti;
  isCombo = true;
}

w.clicks += amount;
game.totalClicks += amount;

if(isCrit){
  float("🤖💥 CRÍTICO +"+fmt(amount), "critical");
}else if(isCombo){
  float("🤖🔥 +"+fmt(amount), "combo");
}else{
  float("🤖 +"+fmt(amount));
}

checkMilestones();
renderStats();
}

setInterval(()=>{

if(typeof game==="undefined" || !game.autoClicker || !game.autoClicker.unlocked) return;

let now=Date.now();

if(!game.autoClicker.nextTick){
    game.autoClicker.nextTick=now+autoClickInterval();
    return;
}

if(now>=game.autoClicker.nextTick){

    performAutoClick();

    game.autoClicker.nextTick=now+autoClickInterval();

}

},500);

/* =====================================================
   AUTO-APERTURA DE HUEVOS
   - Botón por cada tipo de huevo (cualquier mundo)
   - Animación una a una
   - Muestra cuántos puedes comprar
   - Cancelable + resumen final
===================================================== */
const AUTO_EGG = {
  active: false,
  eggIndex: 0,
  results: [],
  opened: 0,
  spent: 0,
  stopReason: "",
  busy: false
};

function countAffordableEggs(eggIndex){
  if(typeof game==="undefined" || typeof W!=="function") return 0;
  const eggs = worlds[game.world] && worlds[game.world].eggs;
  if(!eggs || !eggs[eggIndex]) return 0;
  const price = cl3EggCost(game.world, eggIndex, eggs[eggIndex][1]);
  if(price <= 0) return 0;
  let clicks = W().clicks;
  let invRoom = MAX_PET_INVENTORY - (typeof totalPetInventory==="function" ? totalPetInventory() : 0);
  if(invRoom <= 0) return 0;
  let n = 0;
  while(clicks >= price && n < invRoom && n < 9999){
    clicks -= price;
    n++;
  }
  return n;
}

/* [arcade] updateAutoEggButton() → capa de presentación */

function toggleAutoEggSession(){ /* compat */ }

function startAutoEggSession(eggIndex){
  if(AUTO_EGG.active || AUTO_EGG.busy) return;
  if(typeof game==="undefined" || typeof W!=="function") return;

  eggIndex = Number(eggIndex);
  const eggs = worlds[game.world] && worlds[game.world].eggs;
  if(!eggs || !eggs[eggIndex]){
    toast("❌ Huevo no válido");
    return;
  }

  const can = countAffordableEggs(eggIndex);
  if(can <= 0){
    toast("❌ No puedes abrir ninguno ahora (clics o inventario)");
    return;
  }

  /* Cerrar resumen si estuviera abierto */
  closeAutoEggSummary(true);

  AUTO_EGG.active = true;
  AUTO_EGG.eggIndex = eggIndex;
  AUTO_EGG.results = [];
  AUTO_EGG.opened = 0;
  AUTO_EGG.spent = 0;
  AUTO_EGG.stopReason = "";
  AUTO_EGG.busy = false;
  updateAutoEggButton();
  toast("🤖 Auto-apertura: hasta "+can+" huevos");
  openNextAutoEgg();
}

function stopAutoEggSession(reason){
  const wasActive = AUTO_EGG.active;
  AUTO_EGG.active = false;
  AUTO_EGG.stopReason = reason || "stop";
  updateAutoEggButton();
  if(typeof save==="function") save();
  if(typeof renderStats==="function") renderStats();

  if(wasActive && AUTO_EGG.opened > 0){
    /* Si hay overlay de animación en curso, el resumen se muestra al terminar claim */
    if(!AUTO_EGG.busy){
      showAutoEggSummary();
    }
  }else if(wasActive && reason==="cancel"){
    toast("⏹ Auto-apertura cancelada");
  }
}

function openNextAutoEgg(){
  if(!AUTO_EGG.active){
    if(AUTO_EGG.opened > 0 && !document.getElementById("autoEggSummaryOverlay")?.classList.contains("hidden")===false){
      /* noop */
    }
    return;
  }
  if(AUTO_EGG.busy) return;

  if(typeof totalPetInventory==="function" && totalPetInventory() >= MAX_PET_INVENTORY){
    AUTO_EGG.busy = false;
    stopAutoEggSession("inventory");
    return;
  }

  const eggs = worlds[game.world] && worlds[game.world].eggs;
  const egg = eggs && eggs[AUTO_EGG.eggIndex];
  if(!egg){
    stopAutoEggSession("stop");
    return;
  }
  const price = cl3EggCost(game.world, AUTO_EGG.eggIndex, egg[1]);
  if(W().clicks < price){
    stopAutoEggSession("noclicks");
    return;
  }

  /* Deducir y lanzar animación */
  W().clicks -= price;
  AUTO_EGG.spent += price;
  AUTO_EGG.busy = true;
  if(typeof renderStats==="function") renderStats();
  updateAutoEggButton();

  /* Misma lógica de rareza que openEgg */
  let list = orderedEggPets(egg);
  let r = Math.random();
  let luckyActive = game.luckUntil && game.luckUntil > Date.now();
  let adLuckyActive = game.adLuckUntil && game.adLuckUntil > Date.now();
  let luckBonus = (typeof treeEffectSummary==="function") ? treeEffectSummary().eggLuck/100 : 0;
  let rr = Math.max(0, r - (luckyActive||adLuckyActive?0.18:0)*luckBonus);
  let i = adLuckyActive
    ? (rr<0.15?0:rr<0.40?1:rr<0.70?2:3)
    : luckyActive
      ? (rr<0.30?0:rr<0.60?1:rr<0.85?2:3)
      : (rr<0.55?0:rr<0.82?1:rr<0.96?2:3);
  i = Math.min(Math.max(0,i), list.length-1);
  const emoji = list[i];

  showEgg(emoji, { auto: true, price: price });
}

function recordAutoEggResult(emoji, isShiny, price){
  const p = pets[emoji];
  if(!p) return;
  AUTO_EGG.opened++;
  AUTO_EGG.results.push({
    emoji: emoji,
    name: p[0] || emoji,
    rarity: p[3] || "common",
    rarityName: p[1] || "",
    mult: p[2],
    shiny: !!isShiny,
    price: price || 0
  });
  updateAutoEggButton();
}

/* [arcade] showAutoEggSummary() → capa de presentación */

function closeAutoEggSummary(silent){
  const overlay = document.getElementById("autoEggSummaryOverlay");
  if(overlay){
    overlay.classList.add("hidden");
    overlay.style.display = "none";
  }
  if(!silent){
    AUTO_EGG.results = [];
    AUTO_EGG.opened = 0;
    AUTO_EGG.spent = 0;
    if(typeof render==="function") render();
    else if(typeof renderStats==="function") renderStats();
  }
}

function tryAutoOpenEgg(){ /* legacy no-op */ }




/* =====================================================
   RENDER PRINCIPAL
===================================================== */

/* [arcade] renderWorldRequirements() → capa de presentación */

/* [arcade] renderRebirthRequirements() → capa de presentación */


/* [arcade] cl2RenderCombo() → capa de presentación */


/* [arcade] cl2RenderCrit() → capa de presentación */


function cl2ActivateLuck(minutes){
  if(typeof game==="undefined")return;
  game.luckUntil=Date.now()+(minutes||10)*60000;
  if(typeof save==="function")save();
  cl2RenderLuck();
}
/* [arcade] cl2RenderLuck() → capa de presentación */


/* =====================================================
   HORA DORADA
   Un orbe brillante aparece de vez en cuando en pantalla.
   Si lo tocas a tiempo: 10 min de suerte x2 en huevos
   + un pequeño bonus instantáneo de clics.
===================================================== */

/* [arcade] spawnGoldenOrb() → capa de presentación */

function claimGoldenOrb(){

    let o=document.getElementById("goldenOrb");

    if(o){
        o.remove();
    }

    if(typeof game==="undefined") return;

    cl2ActivateLuck(10);

    let bonus=
    Math.max(1000,Math.floor((W().clicks||0)*0.05));

    W().clicks+=bonus;

    game.totalClicks+=bonus;

    toast(
        "🍀 ¡SUERTE x2 EN HUEVOS (10 min) + "+
        fmt(bonus)+" 👆!"
    );

    sfx("unlock");

    particles(["#ffd83c","#fff176","#ffecb3"]);

    render(); save();

}

function scheduleGoldenOrb(){

    /* Aparece cada 3-7 minutos de juego activo, de forma
       aleatoria, para que sea una sorpresa cada vez */
    let delay=(180+Math.random()*240)*1000;

    setTimeout(()=>{

        spawnGoldenOrb();

        scheduleGoldenOrb();

    },delay);

}

scheduleGoldenOrb();

/* =====================================================
   RENDER LIGERO (solo números que cambian con cada clic)
===================================================== */

/* [arcade] renderStats() → capa de presentación */


/* [arcade] render() → capa de presentación */



/* =====================================================
   BORRAR PARTIDA
===================================================== */

/* =====================================================
   ELIMINAR CUENTA Y DATOS (requisito de privacidad)
   ---------------------------------------------------
   A diferencia de "BORRAR PARTIDA" (que solo reinicia el
   progreso para seguir jugando), esto está pensado para
   cumplir con el derecho de borrado de datos: elimina TODO
   rastro del jugador, local y en la nube, y no vuelve a
   arrancar una partida nueva automáticamente.

   PUNTO DE ENGANCHE PARA DATOS EN LA NUBE:
   Si en el futuro se añade sincronización (Firebase u otro
   backend), aquí es donde hay que borrar también el
   documento/cuenta del jugador en el servidor ANTES de
   limpiar el almacenamiento local, por ejemplo:

     await deleteDoc(doc(db,"saves",userId));
     await deleteUser(auth.currentUser);

   Ahora mismo no hay ninguna cuenta en la nube conectada,
   así que ese paso no existe todavía.
===================================================== */

function deleteAccountAndData(){

showConfirm(
"¿Eliminar tu cuenta y TODOS tus datos (local y en la nube si los hubiera)? Esta acción no se puede deshacer y no podrás recuperarlos.",
()=>{

    /* ⬇⬇⬇ AQUÍ IRÍA EL BORRADO EN LA NUBE, SI EXISTE ⬇⬇⬇ */
    /* await deleteDoc(doc(db,"saves",userId)); */
    /* ⬆⬆⬆ AQUÍ IRÍA EL BORRADO EN LA NUBE, SI EXISTE ⬆⬆⬆ */

    localStorage.removeItem(CL1_SAVE_KEY);
    localStorage.removeItem(CL1_BACKUP_KEY);
    localStorage.removeItem(CL1_INTEGRITY_KEY);
    localStorage.removeItem("CL_GDPR_CONSENT");

    toast("❌ Cuenta y datos eliminados");

    setTimeout(()=>location.reload(),600);

}
);

}

function resetGame(){

showConfirm(
"¿Seguro que quieres borrar TODA la partida?",
()=>{

localStorage.removeItem(CL1_SAVE_KEY);
localStorage.removeItem(CL1_BACKUP_KEY);
localStorage.removeItem(CL1_INTEGRITY_KEY);

location.reload();

}
);

}



/* =====================================================
   INICIAR
===================================================== */

render();

// Si estás en un mundo de temporada fuera de su mes, volver al Bosque
try{
  const w = worlds[game.world];
  if(w && w.seasonal && !isSeasonActive(w.seasonId)){
    game.world = 0;
    render();
  }
}catch(e){}

// Aviso de actualización de temporada (solo una vez por año)
setTimeout(()=>{
  try{ showSeasonNotice(); }catch(e){}
}, 600);

