/* =====================================================
   ALMACENAMIENTO SEGURO
   Algunos visores (iframes aislados, vista previa de archivos)
   bloquean localStorage: leerlo lanza SecurityError y el juego
   original se detenía al arrancar. Si no está disponible, se
   sustituye por un almacenamiento en memoria con la misma API:
   el juego funciona, pero la partida no persiste al cerrar.
===================================================== */
(function(){
  var ok = true;
  try{ var s = window.localStorage; s.setItem("__cl_test","1"); s.removeItem("__cl_test"); }
  catch(e){ ok = false; }
  window.CL_STORAGE_VOLATILE = !ok;
  if(ok) return;
  var mem = {};
  var shim = {
    getItem: function(k){ k = String(k); return Object.prototype.hasOwnProperty.call(mem,k) ? mem[k] : null; },
    setItem: function(k,v){ mem[String(k)] = String(v); },
    removeItem: function(k){ delete mem[String(k)]; },
    clear: function(){ mem = {}; },
    key: function(i){ return Object.keys(mem)[i] || null; },
    get length(){ return Object.keys(mem).length; }
  };
  try{ Object.defineProperty(window, "localStorage", { value: shim, configurable: true, writable: true }); }catch(e){}
})();

/* Errores fatales visibles en pantalla (para poder diagnosticarlos en el móvil) */
window.addEventListener("error", function(ev){
  try{
    var d = document.getElementById("fatalError");
    if(!d){ d = document.createElement("div"); d.id = "fatalError";
      d.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:#5a0a14;color:#fff;border:3px solid #ff4d6d;padding:8px;font:13px monospace;white-space:pre-wrap";
      (document.body || document.documentElement).appendChild(d); }
    d.textContent = "⚠ Error: " + (ev.message || ev.error) + (ev.lineno ? " (línea " + ev.lineno + ")" : "");
  }catch(e){}
});
