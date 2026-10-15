/* =====================================================
   AUDIO ARCADE — chiptune sintetizado (Web Audio)
   - sfx(name): mismos eventos que el original (crit, fuse, egg,
     claim, unlock, rebirth, code), con timbre de consola 16 bits:
     pulsos 12,5/25/50 %, triángulo y ruido.
   - Sonidos de interfaz: tap, menu, error, knock, crack, coin, rare.
   - Música por mundo (secuenciador con planificación anticipada).
   Respeta el interruptor de sonido original (game.soundEnabled);
   la música tiene su propio interruptor guardado aparte.
===================================================== */

const AU = {
  ctx: null, sfxBus: null, musBus: null, noise: null, waves: {},
  musicOn: (function(){ try{ return localStorage.getItem("CL_ARCADE_MUSIC")!=="0"; }catch(e){ return true; } })(),
  song: null, songKey: null, step: 0, nextTime: 0, timer: null
};

function auInit(){
  const ctx = (typeof getAudioCtx==="function") ? getAudioCtx() : null;
  if(!ctx) return null;
  if(AU.ctx===ctx) return ctx;
  AU.ctx = ctx;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  comp.connect(ctx.destination);
  AU.sfxBus = ctx.createGain(); AU.sfxBus.gain.value = 0.9; AU.sfxBus.connect(comp);
  AU.musBus = ctx.createGain(); AU.musBus.gain.value = 0.32; AU.musBus.connect(comp);
  const len = ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let lfsr = 1;
  for(let i=0;i<len;i++){ /* ruido LFSR estilo consola */
    const bit = ((lfsr>>0)^(lfsr>>1))&1; lfsr = (lfsr>>1)|(bit<<14);
    d[i] = (lfsr&1) ? 0.9 : -0.9;
  }
  AU.noise = buf;
  [0.125,0.25,0.5].forEach(duty=>{
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for(let k=1;k<n;k++){ im[k] = 2/(k*Math.PI)*Math.sin(k*Math.PI*duty); }
    AU.waves[duty] = ctx.createPeriodicWave(re, im);
  });
  return ctx;
}

function auVoice(bus, t0, freq, dur, kind, vol, slideTo){
  const ctx = AU.ctx; if(!ctx) return;
  const g = ctx.createGain();
  let src;
  if(kind==="noise"){
    src = ctx.createBufferSource(); src.buffer = AU.noise;
    src.playbackRate.value = Math.max(0.05, freq/4000);
  }else{
    src = ctx.createOscillator();
    if(kind==="tri") src.type = "triangle";
    else src.setPeriodicWave(AU.waves[kind] || AU.waves[0.5]);
    src.frequency.setValueAtTime(freq, t0);
    if(slideTo) src.frequency.exponentialRampToValueAtTime(slideTo, t0+dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0+0.004);
  g.gain.setValueAtTime(vol, t0+Math.max(0.005, dur*0.55));
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  src.connect(g); g.connect(bus);
  src.start(t0); src.stop(t0+dur+0.02);
}

function auNote(f, dur, kind, vol, delay, slide){
  const ctx = auInit(); if(!ctx) return;
  auVoice(AU.sfxBus, ctx.currentTime+(delay||0), f, dur, kind, vol, slide);
}

/* sfx original: mismos nombres y mismo momento de disparo */
function sfx(name){
  if(!soundOn()) return;
  if(!auInit()) return;
  switch(name){
    case "crit":
      auNote(1800, 0.09, "noise", 0.20, 0);
      auNote(880, 0.07, 0.25, 0.13, 0); auNote(1320, 0.10, 0.25, 0.12, 0.05);
      auNote(1760, 0.12, 0.125, 0.08, 0.10);
      auNote(140, 0.16, "tri", 0.30, 0, 60);
      break;
    case "fuse":
      [523,659,784,1047,1319,1568].forEach((f,i)=>auNote(f, 0.10, 0.25, 0.11, i*0.06));
      [784,1047,1319].forEach(f=>auNote(f, 0.45, 0.125, 0.07, 0.40));
      auNote(262, 0.5, "tri", 0.25, 0.40);
      break;
    case "egg":
      auNote(440, 0.10, 0.5, 0.10, 0); auNote(660, 0.10, 0.5, 0.10, 0.07);
      [660,880,1100].forEach(f=>auNote(f, 0.35, 0.25, 0.08, 0.16));
      auNote(220, 0.4, "tri", 0.25, 0.16);
      auNote(6000, 0.25, "noise", 0.05, 0.16);
      break;
    case "claim":
      auNote(523.25, 0.11, 0.25, 0.13, 0); auNote(659.25, 0.11, 0.25, 0.13, 0.1); auNote(783.99, 0.14, 0.25, 0.14, 0.2);
      [1046.5,1318.51,1567.98].forEach(f=>auNote(f, 0.42, 0.125, 0.08, 0.33));
      auNote(261.63, 0.45, "tri", 0.28, 0.33);
      break;
    case "unlock":
      auNote(392, 0.12, 0.5, 0.11, 0); auNote(523.25, 0.12, 0.5, 0.11, 0.12); auNote(659.25, 0.14, 0.5, 0.12, 0.24);
      [783.99,987.77,1174.66].forEach(f=>auNote(f, 0.5, 0.25, 0.08, 0.38));
      auNote(196, 0.45, "tri", 0.32, 0.38); auNote(98, 0.35, "tri", 0.28, 0.38);
      auNote(300, 0.18, "noise", 0.10, 0.38);
      break;
    case "rebirth":
      auNote(130.81, 0.5, "tri", 0.32, 0, 261.63);
      [261.63,329.63,392,523.25].forEach((f,i)=>auNote(f, 0.15, 0.25, 0.12, 0.2+i*0.13));
      [523.25,659.25,783.99,1046.5].forEach(f=>auNote(f, 0.75, 0.5, 0.07, 0.76));
      auNote(130.81, 0.6, "tri", 0.35, 0.76); auNote(65.4, 0.6, "tri", 0.3, 0.76);
      auNote(200, 0.4, "noise", 0.14, 0.76);
      break;
    case "code":
      auNote(700, 0.08, 0.125, 0.12, 0); auNote(1050, 0.12, 0.125, 0.12, 0.08);
      [1050,1400].forEach(f=>auNote(f, 0.28, 0.25, 0.08, 0.16));
      break;
    /* Sonidos propios de la recreativa */
    case "tap": {
      const w = (typeof W==="function") ? W() : null;
      const c = w && w.comboUnlocked ? Math.max(1,w.combo||1) : 1;
      auNote(330*Math.pow(1.12,c-1), 0.035, 0.125, 0.05, 0, 520*Math.pow(1.12,c-1));
      break;
    }
    case "menu": auNote(988, 0.04, 0.25, 0.06, 0); auNote(1319, 0.06, 0.25, 0.05, 0.035); break;
    case "error": auNote(196, 0.09, 0.5, 0.09, 0); auNote(156, 0.14, 0.5, 0.09, 0.08); break;
    case "knock": auNote(900, 0.05, "noise", 0.12, 0); auNote(180, 0.07, "tri", 0.25, 0, 120); break;
    case "crack": auNote(3000, 0.18, "noise", 0.16, 0); auNote(80, 0.25, "tri", 0.3, 0, 40); break;
    case "coin": auNote(988, 0.07, 0.5, 0.12, 0); auNote(1319, 0.32, 0.5, 0.12, 0.07); break;
    case "rare":
      [784,988,1175,1568,1976].forEach((f,i)=>auNote(f, 0.12, 0.125, 0.08, i*0.05));
      auNote(8000, 0.4, "noise", 0.04, 0);
      break;
    default:
      auNote(600, 0.1, 0.5, 0.10, 0);
  }
}

/* ================== MÚSICA ==================
   Cada mundo: tempo, tónica, escala, progresión (grados) y un motivo.
   Canales: melodía (pulso), arpegio (pulso fino), bajo (triángulo), batería (ruido). */
const SCALES = {
  major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10], dorian:[0,2,3,5,7,9,10],
  phrygian:[0,1,3,5,7,8,10], harm:[0,2,3,5,7,8,11], lydian:[0,2,4,6,7,9,11], mixo:[0,2,4,5,7,9,10]
};
/* motivo: 16 pasos por compás, grados relativos a la raíz del acorde ("." = silencio, "-" = ligar) */
const SONGS = {
  bosque:   {bpm:118, root:60, scale:"major",   prog:[0,4,5,3], duty:0.5,  arp:0.125, drums:"pop",
             motif:["0 . 2 . 4 - - . 2 . 4 . 7 - . .", "4 . 2 . 0 - . . 1 . 2 . 4 - - ."]},
  desierto: {bpm:104, root:57, scale:"phrygian",prog:[0,1,0,6], duty:0.25, arp:0.125, drums:"desert",
             motif:["0 . . 1 2 . 1 . 0 - - . 4 . 3 .", "2 . 1 . 0 . . 6 0 - - - . . . ."]},
  hielo:    {bpm:96,  root:62, scale:"lydian",  prog:[0,4,5,3], duty:0.125,arp:0.25,  drums:"soft",
             motif:["4 - - . 3 . 2 . 4 - . . 7 - - .", "6 - . . 4 . 3 . 2 - - - . . . ."]},
  volcan:   {bpm:140, root:52, scale:"harm",    prog:[0,5,3,4], duty:0.5,  arp:0.25,  drums:"rock",
             motif:["0 . 0 . 2 . 3 . 4 . 3 . 2 . 0 .", "4 - . 3 . 2 . 6 - . 0 - - . . ."]},
  espacio:  {bpm:112, root:57, scale:"dorian",  prog:[0,3,5,4], duty:0.125,arp:0.25,  drums:"synth",
             motif:["0 . . 4 . . 7 . 6 - - . 4 . . .", "3 . 4 . 6 . 4 . 2 - - - . . . ."]},
  halloween:{bpm:126, root:55, scale:"harm",    prog:[0,5,4,0], duty:0.25, arp:0.125, drums:"swing",
             motif:["0 . 2 . 3 . 4 . 3 . 2 . 6 . 0 .", "4 - 3 - 2 - 6 . 0 - - - . . . ."]},
  navidad:  {bpm:120, root:62, scale:"major",   prog:[0,3,4,0], duty:0.5,  arp:0.125, drums:"bells",
             motif:["2 . 2 . 2 - - . 2 . 2 . 2 - - .", "2 . 4 . 0 . . 1 2 - - - . . . ."]},
  sanvalentin:{bpm:92, root:65, scale:"major",  prog:[0,5,3,4], duty:0.25, arp:0.125, drums:"soft",
             motif:["4 - - . 3 . 2 . 3 - . . 0 - - .", "2 . 3 . 4 . 7 . 6 - - - . . . ."]},
  verano:   {bpm:132, root:64, scale:"mixo",    prog:[0,6,3,0], duty:0.5,  arp:0.25,  drums:"pop",
             motif:["0 . 2 4 . 2 . 4 7 . 6 . 4 . 2 .", "4 . 4 . 2 . 0 . 6 - - . 0 . . ."]}
};

function midiHz(m){ return 440*Math.pow(2,(m-69)/12); }
function songDegree(s, deg){
  const sc = SCALES[s.scale], o = Math.floor(deg/7), i = ((deg%7)+7)%7;
  return s.root + sc[i] + 12*o;
}

function musicPlay(key){
  if(!SONGS[key]) key = "bosque";
  if(AU.songKey===key && AU.timer) return;
  AU.songKey = key; AU.song = SONGS[key]; AU.step = 0;
  if(!AU.musicOn || !auInit()) return;
  AU.nextTime = AU.ctx.currentTime + 0.08;
  if(!AU.timer) AU.timer = setInterval(musicTick, 25);
}
function musicStop(){
  if(AU.timer){ clearInterval(AU.timer); AU.timer = null; }
}
function musicToggle(){
  AU.musicOn = !AU.musicOn;
  try{ localStorage.setItem("CL_ARCADE_MUSIC", AU.musicOn?"1":"0"); }catch(e){}
  if(AU.musicOn){ const k=AU.songKey; AU.songKey=null; musicPlay(k||"bosque"); } else musicStop();
  if(typeof renderSettingsExtra==="function") renderSettingsExtra();
}

function musicTick(){
  const ctx = AU.ctx; const s = AU.song; if(!ctx || !s) return;
  const stepDur = 60/s.bpm/4;
  while(AU.nextTime < ctx.currentTime + 0.12){
    musicStep(s, AU.step, AU.nextTime, stepDur);
    AU.step = (AU.step+1) % 64;
    AU.nextTime += stepDur;
  }
}

function musicStep(s, step, t, sd){
  const bar = Math.floor(step/16), pos = step%16;
  const chordDeg = s.prog[bar];
  const bus = AU.musBus;
  /* Bajo */
  if(pos%4===0 || (s.drums==="rock" && pos%2===0)){
    const n = songDegree(s, chordDeg + (pos===8 && s.drums!=="soft" ? 4 : 0)) - 24;
    auVoice(bus, t, midiHz(n), sd*(s.drums==="rock"?1.6:3.2), "tri", 0.30);
  }
  /* Arpegio */
  if(pos%2===0){
    const pat = [0,2,4,7,4,2,0,4];
    const n = songDegree(s, chordDeg + pat[(pos/2)%8]) ;
    auVoice(bus, t, midiHz(n), sd*1.4, s.arp, 0.035);
  }
  /* Melodía (motivo de 2 compases que alterna) */
  const tokens = s.motif[bar%2].split(" ");
  const tok = tokens[pos];
  if(tok!=="." && tok!=="-"){
    let len = 1; while(pos+len<16 && tokens[pos+len]==="-") len++;
    const n = songDegree(s, chordDeg + Number(tok)) + 12;
    auVoice(bus, t, midiHz(n), sd*len*0.95, s.duty, 0.06);
    if(len>2) auVoice(bus, t+sd*0.5, midiHz(n)*1.006, sd*(len-0.5), s.duty, 0.02);
  }
  /* Batería */
  const k = s.drums;
  const kick = (k==="rock"||k==="pop"||k==="synth") ? (pos%4===0) : (k==="swing" ? (pos===0||pos===6||pos===10) : (pos===0||pos===8));
  const snare = (k==="soft"||k==="bells") ? (pos===12) : (pos===4||pos===12);
  const hat = (k==="desert") ? (pos%4===2) : (k==="soft" ? false : pos%2===0);
  if(kick) auVoice(bus, t, 140, 0.12, "tri", 0.38, 45);
  if(snare) auVoice(bus, t, 1800, 0.10, "noise", 0.11);
  if(hat) auVoice(bus, t, 9000, 0.03, "noise", 0.035);
  if(k==="bells" && pos%8===4) auVoice(bus, t, midiHz(songDegree(s, chordDeg+7)+24), sd*3, 0.125, 0.03);
}

document.addEventListener("visibilitychange",()=>{
  if(document.hidden) musicStop();
  else if(AU.musicOn && AU.songKey && AU.ctx){ const k=AU.songKey; AU.songKey=null; musicPlay(k); }
});
