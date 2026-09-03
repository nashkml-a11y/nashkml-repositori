// extras.js
// Carrito, Radar, Armario, Mina, Torre, Kit y Agujero.
// Los identificadores internos (tank, radar, silo, mine, antiAirTower,
// regenerationKit, vacuumHole) se traducen a nombres visibles únicamente en
// config.js / DISPLAY_NAMES — aquí sólo se trabaja con los ids técnicos.

import { pushLog } from "./state.js";
import { resolveAttack, checkGameEnd, selectTarget } from "./combat.js";

const SINGLE_PURCHASE_EXTRAS = new Set(["tank", "radar", "antiAirTower"]);
const STACKABLE_EXTRAS = new Set(["silo", "mine", "regenerationKit", "vacuumHole"]);

export function isExtraOwned(sideState, extraId) {
  if (SINGLE_PURCHASE_EXTRAS.has(extraId)) return !!sideState.extras[extraId];
  return (sideState.extras[extraId] || 0) > 0;
}

export function canBuyExtra(sideState, economy, extraId) {
  const config = economy.extras[extraId];
  if (!config) return { ok: false, reason: "unknown_extra" };
  if (SINGLE_PURCHASE_EXTRAS.has(extraId) && sideState.extras[extraId]) {
    return { ok: false, reason: "already_owned" };
  }
  if (extraId === "silo") {
    const owned = sideState.extras.silo || 0;
    if (owned >= config.maxCount) return { ok: false, reason: "max_count" };
  }
  if (sideState.px < config.cost) return { ok: false, reason: "insufficient_px" };
  return { ok: true, cost: config.cost };
}

export function buyExtra(state, side, extraId) {
  if (state.isOver) return { ok: false, reason: "game_over" };
  const sideState = state[side];
  const economy = state.economy;
  const check = canBuyExtra(sideState, economy, extraId);
  if (!check.ok) return check;

  sideState.px -= check.cost;
  if (SINGLE_PURCHASE_EXTRAS.has(extraId)) {
    sideState.extras[extraId] = true;
  } else {
    sideState.extras[extraId] = (sideState.extras[extraId] || 0) + 1;
    if (extraId === "silo") {
      sideState.bombCapacity += economy.extras.silo.capacityBonus;
    }
  }
  return { ok: true, extraId, cost: check.cost };
}

/**
 * Usa un extra consumible (Kit o Agujero) de forma explícita.
 */
export function useExtra(state, side, extraId) {
  if (state.isOver) return { ok: false, reason: "game_over" };
  const sideState = state[side];
  if (!(sideState.extras[extraId] > 0)) return { ok: false, reason: "not_owned" };

  if (extraId === "regenerationKit") {
    const healAmount = state.economy.extras.regenerationKit.healAmount;
    sideState.extras.regenerationKit -= 1;
    sideState.hp = Math.min(sideState.maxHp, sideState.hp + healAmount);
    pushLog(state, `${side === "player" ? "Jugador" : "Rival"} usó el Kit y recuperó ${healAmount} de estructura.`);
    return { ok: true, healed: healAmount };
  }

  if (extraId === "vacuumHole") {
    const targetSide = selectTarget(state, side);
    if (targetSide == null) return { ok: false, reason: "no_target" };
    const target = state[targetSide];
    const stealFraction = state.economy.extras.vacuumHole.stealFraction;
    const stolen = target.px * stealFraction;
    sideState.extras.vacuumHole -= 1;
    target.px -= stolen;
    sideState.px += stolen;
    pushLog(state, `${side === "player" ? "Jugador" : "Rival"} usó el Agujero y robó ${stolen.toFixed(1)} PX.`);
    return { ok: true, stolen };
  }

  return { ok: false, reason: "not_consumable" };
}

/**
 * Avanza el ataque automático del Carrito. Se acumula tiempo real hasta
 * alcanzar el intervalo de ataque configurado, momento en el que dispara.
 */
export function tickTank(state, side, dtSeconds) {
  if (state.isOver) return;
  const sideState = state[side];
  if (!sideState.alive || !sideState.extras.tank) return;

  sideState.tankCooldown += dtSeconds;
  const interval = state.economy.tank.attackIntervalSeconds;
  while (sideState.tankCooldown >= interval) {
    sideState.tankCooldown -= interval;
    const targetSide = selectTarget(state, side);
    if (targetSide == null) break;
    resolveAttack(state, targetSide, state.economy.tank.damage);
    checkGameEnd(state);
    if (state.isOver) break;
  }
}
