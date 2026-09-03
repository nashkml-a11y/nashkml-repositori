// ai.js
// IA sencilla para el rival: decide periódicamente si mejorar su economía,
// comprar defensas/extras o atacar. No es un sistema "inteligente" complejo,
// sólo lo suficiente para dar contexto real al targeting y a la defensa.

import { buyGeneratorUpgrade } from "./generator.js";
import { buyDomeUpgrade, buyBomb, launchBomb } from "./combat.js";
import { buyExtra, useExtra } from "./extras.js";

const DECISION_INTERVAL_SECONDS = 4;

export function createRivalAI() {
  return { timer: 0 };
}

function pickWeighted(options) {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option;
  }
  return options[options.length - 1];
}

function attemptAttack(state) {
  const rival = state.rival;
  const availableBombs = state.economy.bombOrder.filter((id) => rival.bombs[id] > 0);
  if (availableBombs.length === 0) return false;
  // Prefiere la bomba más fuerte disponible.
  const bombId = availableBombs[availableBombs.length - 1];
  launchBomb(state, "rival", bombId);
  return true;
}

function attemptPurchase(state) {
  const rival = state.rival;
  const economy = state.economy;
  const options = [];

  options.push({ weight: 5, action: () => buyGeneratorUpgrade(state, "rival") });

  for (const bombId of economy.bombOrder) {
    options.push({ weight: 3, action: () => buyBomb(state, "rival", bombId) });
  }

  options.push({ weight: 2, action: () => buyDomeUpgrade(state, "rival") });

  for (const extraId of economy.extraOrder) {
    options.push({ weight: 1.5, action: () => buyExtra(state, "rival", extraId) });
  }

  // Baraja y prueba opciones hasta que una tenga éxito (fondos suficientes).
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  for (const option of shuffled) {
    const result = option.action();
    if (result.ok) return true;
  }
  return false;
}

export function tickRivalAI(state, ai, dtSeconds) {
  if (state.isOver || !state.rival.alive) return;
  ai.timer += dtSeconds;
  if (ai.timer < DECISION_INTERVAL_SECONDS) return;
  ai.timer = 0;

  const rival = state.rival;
  if (rival.extras.regenerationKit > 0 && rival.hp < rival.maxHp * 0.5) {
    useExtra(state, "rival", "regenerationKit");
    return;
  }

  const shouldAttack = Math.random() < 0.5;
  if (shouldAttack && attemptAttack(state)) return;

  attemptPurchase(state);
}
