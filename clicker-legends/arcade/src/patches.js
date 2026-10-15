/* =====================================================
   PARCHES DE PRESENTACIÓN SOBRE LA LÓGICA ORIGINAL
   Únicas funciones de lógica reescritas. Cuerpo idéntico al
   original salvo el confirm() nativo (bloqueado en algunos
   visores, como advertía el propio código original), que pasa
   a ser el modal arcade showConfirm(). Mismas comprobaciones,
   mismas recompensas, mismo orden de operaciones.
===================================================== */

function deletePetUnit(k){
    if(!game.pets[k] || game.pets[k]<=0) return;
    if(petLocked(k)){
        toast("🔒 Esta mascota está protegida");
        return;
    }
    if(game.equipped.includes(k)){
        toast("❌ Primero quita esta mascota del equipo");
        return;
    }
    const reward = deletePetReward(k);
    showConfirm("¿Eliminar 1 copia de esta mascota?\nRecibirás ~"+fmt(reward)+" 👆 del mundo actual.",()=>{
    if(!game.pets[k] || game.pets[k]<=0) return;
    game.pets[k]--;
    if(game.pets[k]<=0){
        delete game.pets[k];
        delete game.petLocks[k];
        delete game.petFavorites[k];
    }
    W().clicks += reward;
    game.totalClicks += reward;
    toast("🗑️ Mascota eliminada · +"+fmt(reward)+" 👆");
    save(); render();
    });
}

function deleteShinyUnit(k){
    if(!game.shinyPets[k] || game.shinyPets[k]<=0) return;
    if(petLocked(k)){
        toast("🔒 Esta mascota Shiny está protegida");
        return;
    }
    if(game.equipped.includes(k)){
        toast("❌ Primero quita esta mascota del equipo");
        return;
    }
    /* Shiny es la más difícil (5 Doradas = 25 normales) y la más fuerte → mayor recompensa */
    const reward = Math.floor(deletePetReward(k) * 3.5);
    showConfirm("¿Eliminar 1 copia de esta mascota Shiny?\nRecibirás ~"+fmt(reward)+" 👆 del mundo actual.",()=>{
    if(!game.shinyPets[k] || game.shinyPets[k]<=0) return;
    game.shinyPets[k]--;
    if(game.shinyPets[k]<=0){
        delete game.shinyPets[k];
        delete game.petLocks[k];
        delete game.petFavorites[k];
    }
    W().clicks += reward;
    game.totalClicks += reward;
    toast("🗑️ Mascota Shiny eliminada · +"+fmt(reward)+" 👆");
    save(); render();
    });
}

function deleteGoldenUnit(k){
    if(!game.goldenPets[k] || game.goldenPets[k]<=0) return;
    if(petLocked(k)){ toast("🔒 Esta mascota Dorada está protegida"); return; }
    if(game.equipped.includes(k)){ toast("❌ Primero quita esta mascota del equipo"); return; }
    /* Dorada: intermedio entre normal y shiny */
    const reward = Math.floor(deletePetReward(k) * 2.0);
    showConfirm("¿Eliminar 1 copia de esta mascota Dorada?\nRecibirás ~"+fmt(reward)+" 👆 del mundo actual.",()=>{
    if(!game.goldenPets[k] || game.goldenPets[k]<=0) return;
    game.goldenPets[k]--;
    if(game.goldenPets[k]<=0){ delete game.goldenPets[k]; delete game.petLocks[k]; delete game.petFavorites[k]; }
    W().clicks += reward;
    game.totalClicks += reward;
    toast("🗑️ Mascota Dorada eliminada · +"+fmt(reward)+" 👆");
    save(); render();
    });
}
