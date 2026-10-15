/* =====================================================
   UTILIDADES DE LA CAPA ARCADE
   fxRand(): generador aleatorio PROPIO para efectos visuales.
   La capa de presentación nunca llama a Math.random(), así la
   secuencia aleatoria de la lógica (críticos, huevos, shiny,
   bonus) es exactamente la misma que en el juego original.
===================================================== */
const fxRand = (function(){
  let s = (Date.now() ^ 0x9e3779b9) >>> 0;
  return function(){
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

function setHTML(el, html){
  if(!el) return;
  if(el._lastHTML !== html){ el.innerHTML = html; el._lastHTML = html; }
}
function $id(id){ return document.getElementById(id); }
function escHTML(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
