// combat.js
// Compra y lanzamiento de bombas, cúpula de defensa, daño, targeting y
// condiciones de victoria/derrota.
//
// IMPORTANTE (Fase 11 de la especificación): las bombas NO tienen cooldown
// de recarga. Si el jugador tiene una bomba en su inventario, puede lanzarla
// inmediatamente. Lo único que limita el uso es el stock/coste, nunca un
// temporizador de recarga.

import { domeUpgradeCost, domeDamageReduction } from "./config.js";
import { pushLog } from "./state.js";

function otherSide(side) {
  return side === "player" ? "rival" : "player";
}

function totalBombCount(sideState) {
  return Object.values(sideState.bombs).reduce((sum, n) => sum + n, 0);
}

export function bombCapacity(sideState) {
  return sideState.bombCapacity;
}

// --- Cúpula -----------------------------------------------------------

export function nextDomeLevel(sideState, economy) {
  const maxLevel = economy.dome.maxLevel;
  if (maxLevel != null && sideState.domeLevel >= maxLevel) return null;
  return sideState.domeLevel + 1;
}

export function nextDomeUpgradeCost(sideState, economy) {
  const next = nextDomeLevel(sideState, economy);
  if (next == null) return null;
  return domeUpgradeCost(economy, next);
}

export function buyDomeUpgrade(state, side) {
  if (state.isOver) return { ok: false, reason: "game_over" };
  const sideState = state[side];
  const economy = state.economy;
  const next = nextDomeLevel(sideState, economy);
  if (next == null) return { ok: false, reason: "max_level" };
  const cost = domeUpgradeCost(economy, next);
  if (cost == null) return { ok: false, reason: "no_cost_defined" };
  if (sideState.px < cost) return { ok: false, reason: "insufficient_px" };

  sideState.px -= cost;
  sideState.domeLevel = next;
  return { ok: true, newLevel: next, cost };
}

// --- Bombas -------------------------------------------------------------

export function buyBomb(state, side, bombId) {
  if (state.isOver) return { ok: false, reason: "game_over" };
  const sideState = state[side];
  const economy = state.economy;
  const bombConfig = economy.bombs[bombId];
  if (!bombConfig) return { ok: false, reason: "unknown_bomb" };
  if (sideState.generatorLevel < bombConfig.requiresGeneratorLevel) {
    return { ok: false, reason: "generator_level_too_low" };
  }
  if (totalBombCount(sideState) >= bombCapacity(sideState)) {
    return { ok: false, reason: "capacity_full" };
  }
  if (sideState.px < bombConfig.cost) return { ok: false, reason: "insufficient_px" };

  sideState.px -= bombConfig.cost;
  sideState.bombs[bombId] += 1;
  return { ok: true, bombId, cost: bombConfig.cost };
}

/**
 * Selecciona el objetivo de un ataque. En esta versión 1 vs 1 el objetivo es
 * siempre el rival del lado atacante, pero se mantiene como función propia
 * para no acoplar el lanzamiento de bombas a esa suposición.
 */
export function selectTarget(state, attackerSide) {
  const targetSide = otherSide(attackerSide);
  const targetState = state[targetSide];
  if (!targetState.alive) return null;
  return targetSide;
}

/**
 * Lanza una bomba del inventario del atacante contra su rival. No consulta
 * ni respeta ningún cooldown: si hay stock, se puede lanzar ya.
 */
export function launchBomb(state, attackerSide, bombId) {
  if (state.isOver) return { ok: false, reason: "game_over" };
  const attacker = state[attackerSide];
  if ((attacker.bombs[bombId] || 0) <= 0) return { ok: false, reason: "no_stock" };

  const targetSide = selectTarget(state, attackerSide);
  if (targetSide == null) return { ok: false, reason: "no_target" };

  attacker.bombs[bombId] -= 1;
  const bombConfig = state.economy.bombs[bombId];
  const result = resolveAttack(state, targetSide, bombConfig.damage);
  pushLog(state, describeAttack(attackerSide, bombId, result));
  checkGameEnd(state);
  return { ok: true, ...result };
}

function describeAttack(attackerSide, bombId, result) {
  const who = attackerSide === "player" ? "Jugador" : "Rival";
  if (result.intercepted) return `${who} lanzó ${bombId} pero fue interceptado.`;
  if (result.blockedByMine) return `${who} lanzó ${bombId} pero una mina lo bloqueó por completo.`;
  return `${who} lanzó ${bombId} e infligió ${result.damageDealt.toFixed(1)} de daño.`;
}

/**
 * Aplica el daño de un ataque contra el lado defensor, resolviendo en orden:
 * 1) Torre AA (probabilidad de interceptación total)
 * 2) Mina (bloqueo total de un único impacto, se consume)
 * 3) Cúpula (reducción porcentual del daño restante)
 */
export function resolveAttack(state, defenderSide, rawDamage) {
  const defender = state[defenderSide];
  const economy = state.economy;

  if (defender.extras.antiAirTower) {
    const chance = economy.extras.antiAirTower.interceptChance;
    if (Math.random() < chance) {
      return { intercepted: true, blockedByMine: false, damageDealt: 0 };
    }
  }

  if (defender.extras.mine > 0) {
    defender.extras.mine -= 1;
    return { intercepted: false, blockedByMine: true, damageDealt: 0 };
  }

  const reduction = domeDamageReduction(economy, defender.domeLevel);
  const damageDealt = Math.max(0, rawDamage * (1 - reduction));
  defender.hp = Math.max(0, defender.hp - damageDealt);
  return { intercepted: false, blockedByMine: false, damageDealt };
}

// --- Fin de partida por destrucción -------------------------------------

export function checkGameEnd(state) {
  if (state.isOver) return;
  if (state.player.hp <= 0) state.player.alive = false;
  if (state.rival.hp <= 0) state.rival.alive = false;

  if (!state.player.alive || !state.rival.alive) {
    state.isOver = true;
    state.isRunning = false;
    if (!state.player.alive && !state.rival.alive) {
      state.result = "draw";
    } else if (!state.rival.alive) {
      state.result = "victory";
    } else {
      state.result = "defeat";
    }
  }
}
