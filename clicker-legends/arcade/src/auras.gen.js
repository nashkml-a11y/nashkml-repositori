/* GENERADO: datos y compra de auras (bloque skins-v2-engine del original). */
const AURAS_V2=[
 {id:"none",name:"Sin aura",price:0,bonus:0},
 {id:"flame",name:"Aura de Fuego",price:100000,bonus:2},
 {id:"ice",name:"Aura Glacial",price:250000,bonus:5},
 {id:"electric",name:"Aura Eléctrica",price:750000,bonus:10},
 {id:"galaxy",name:"Aura Galáctica",price:3000000,bonus:16},
 {id:"poison",name:"Aura Tóxica",price:15000000,bonus:24},
 {id:"rainbow",name:"Aura Arcoíris",price:75000000,bonus:34},
 {id:"void",name:"Aura del Vacío",price:300000000,bonus:45},
 {id:"cosmic",name:"Aura Cósmica",price:1500000000,bonus:57},
 {id:"royal",name:"Aura Real",price:15000000000,bonus:70},
 /* Halloween */
 {id:"halloween_darkness",name:"Oscuridad",price:70000000,bonus:20,season:"halloween"},
 {id:"halloween_venom",name:"Veneno",price:320000000,bonus:40,season:"halloween"},
 /* Navidad */
 {id:"christmas_snow",name:"Nieve",price:70000000,bonus:20,season:"christmas"},
 {id:"christmas_sparkle",name:"Brillos",price:320000000,bonus:40,season:"christmas"},
 /* San Valentín */
 {id:"valentine_hearts_aura",name:"Corazoncitos",price:70000000,bonus:20,season:"valentine"},
 {id:"valentine_chocolate",name:"Chocolate Fundido",price:320000000,bonus:40,season:"valentine"},
 /* Verano */
 {id:"summer_water_aura",name:"Agua",price:70000000,bonus:20,season:"summer"},
 {id:"summer_heat",name:"Calor",price:320000000,bonus:40,season:"summer"}
];

function auraById(id){return AURAS_V2.find(a=>a.id===id)||AURAS_V2[0]}

function ensureSkinsV2(){
  if(!game.skins) game.skins={button:"classic",effect:"classic",ownedButtons:["classic"],ownedEffects:["classic"]};
  if(!Array.isArray(game.skins.ownedButtons)) game.skins.ownedButtons=["classic"];
  if(!Array.isArray(game.skins.ownedEffects)) game.skins.ownedEffects=["classic"];
  if(!game.skins.button) game.skins.button="classic";
  if(!game.skins.effect) game.skins.effect="classic";
  if(!Array.isArray(game.skins.ownedAuras)) game.skins.ownedAuras=["none"];
  if(!game.skins.aura) game.skins.aura="none";
  if(!game.skins.ownedAuras.includes("none")) game.skins.ownedAuras.unshift("none");
}


function buyAuraV2(id){
  ensureSkinsV2();
  const item=auraById(id); if(!item) return;
  if(game.skins.ownedAuras.includes(id)){toast("✅ Ya tienes esta aura");return;}
  // Contenido de temporada: solo se puede comprar durante su mes
  if(item.season && !isSeasonActive(item.season)){
    const s = SEASONS[item.season];
    toast((s?s.emoji:"🔒")+" Exclusivo de la actualización de "+(s?s.name:"temporada")+" — Disponible en su mes");
    return;
  }
  const w=W();
  if(w.clicks<item.price){toast("❌ Necesitas "+fmt(item.price)+" 👆");return;}
  w.clicks-=item.price;
  game.skins.ownedAuras.push(id);
  toast("🌟 ¡"+item.name+" desbloqueada!");
  sfx("claim"); render(); save();
}

function equipAuraV2(id){
  ensureSkinsV2();
  if(!game.skins.ownedAuras.includes(id)) return;
  game.skins.aura=id;
  applyButtonSkin();
  sfx("code"); render(); save();
}

