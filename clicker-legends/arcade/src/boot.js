/* ===== Arranque de la capa visual (antes de la lógica original) ===== */
fxInit();
bgInit();
uiBoot();
for(const k in ASSETS.icons) fxIcon(k);   /* precarga de iconos usados por los efectos */
