/* =====================================================
   COLA: lo que en el original iba en <script> sueltos
   tras el principal (códigos extra, temporizadores de HUD
   e inicialización de skins/auras), más el arranque arcade.
===================================================== */
try{if(typeof redeemableCodes!=="undefined"&&window.CL2_CODES)Object.assign(redeemableCodes,window.CL2_CODES)}catch(e){}
setInterval(()=>{try{renderWorldRequirements();renderRebirthRequirements()}catch(e){}},750);
setInterval(()=>{try{cl2RenderCombo();cl2RenderCrit();cl2RenderLuck();renderTokenShop();renderAdShop()}catch(e){}},500);
ensureSkinsV2();
renderSkins();
applyButtonSkin();

/* Cuando terminan de cargar fuentes e imágenes, se regeneran las monedas y vistas previas */
function uiRefreshArt(){
  for(const k in COIN_CACHE) delete COIN_CACHE[k];
  try{ renderSkins(); }catch(e){}
}
if(document.fonts && document.fonts.load){
  Promise.all([document.fonts.load("8px Silkscreen"), document.fonts.load("15px 'Pixelify Sans'")]).then(()=>setTimeout(uiRefreshArt, 60));
}
window.addEventListener("load", ()=>setTimeout(uiRefreshArt, 120));

bgSyncWorld();
titleStart();
