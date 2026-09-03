// generator.js
// Producción continua de PX y compra secuencial de niveles del generador.
// Toda la lógica lee su economía desde state.economy, así que automáticamente
// respeta el aislamiento entre modo Infinito y modo 30 minutos.

import { generatorProductionPerMin, generatorUpgradeCost } from "./config.js";

export function productionPerSecond(economy, level) {
  return generatorProductionPerMin(economy, level) / 60;
}

/**
 * Avanza la producción de PX de un lado (player/rival) según el tiempo
 * transcurrido en segundos. Se acumula con precisión de coma flotante para
 * no perder fracciones de PX; sólo se redondea al mostrarlo en la UI.
 */
export function tickGeneratorProduction(state, side, dtSeconds) {
  if (state.isOver) return;
  const sideState = state[side];
  if (!sideState.alive) return;
  const rate = productionPerSecond(state.economy, sideState.generatorLevel);
  const multiplier = rebirthMultiplier(state.economy, sideState);
  const gained = rate * multiplier * dtSeconds;
  sideState.px += gained;
  sideState.lifetimePx += gained;
}

function rebirthMultiplier(economy, sideState) {
  if (!economy.hasRebirth) return 1;
  return 1 + economy.rebirth.productionMultiplierPerRebirth * sideState.rebirthCount;
}

export function nextGeneratorLevel(sideState, economy) {
  const maxLevel = economy.generator.maxLevel;
  if (maxLevel != null && sideState.generatorLevel >= maxLevel) return null;
  return sideState.generatorLevel + 1;
}

export function nextGeneratorUpgradeCost(sideState, economy) {
  const next = nextGeneratorLevel(sideState, economy);
  if (next == null) return null;
  return generatorUpgradeCost(economy, next);
}

/**
 * Compra la siguiente mejora del generador si hay PX suficientes. Los
 * niveles se compran estrictamente en orden (no se pueden saltar).
 */
export function buyGeneratorUpgrade(state, side) {
  if (state.isOver) return { ok: false, reason: "game_over" };
  const sideState = state[side];
  const economy = state.economy;
  const next = nextGeneratorLevel(sideState, economy);
  if (next == null) return { ok: false, reason: "max_level" };
  const cost = generatorUpgradeCost(economy, next);
  if (cost == null) return { ok: false, reason: "no_cost_defined" };
  if (sideState.px < cost) return { ok: false, reason: "insufficient_px" };

  sideState.px -= cost;
  sideState.generatorLevel = next;
  return { ok: true, newLevel: next, cost };
}

/**
 * Rebirth: exclusivo del modo Infinito (economy.hasRebirth). Reinicia nivel
 * de generador y PX a cambio de un multiplicador de producción permanente.
 * No existe equivalente en el modo 30 minutos.
 */
export function rebirthRequirement(economy, rebirthCount) {
  if (!economy.hasRebirth) return null;
  const r = economy.rebirth;
  return Math.round(r.baseRequirement * Math.pow(r.requirementGrowth, rebirthCount));
}

export function performRebirth(state, side) {
  const economy = state.economy;
  if (!economy.hasRebirth) return { ok: false, reason: "not_available" };
  if (state.isOver) return { ok: false, reason: "game_over" };
  const sideState = state[side];
  const requirement = rebirthRequirement(economy, sideState.rebirthCount);
  if (sideState.lifetimePx < requirement) return { ok: false, reason: "insufficient_lifetime_px" };

  sideState.rebirthCount += 1;
  sideState.px = 0;
  sideState.generatorLevel = economy.generator.startLevel;
  return { ok: true, rebirthCount: sideState.rebirthCount };
}
