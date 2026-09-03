// state.js
// Creación del estado de una partida. El estado de cada modo se construye
// exclusivamente a partir de su propia economía (config.js), así que nunca
// se filtran valores entre Infinito y 30 minutos.

import { getEconomy, GAME_MODES } from "./config.js";

function createSideState(economy) {
  const bombs = {};
  for (const bombId of economy.bombOrder) {
    bombs[bombId] = 0;
  }
  return {
    px: economy.startingPx,
    generatorLevel: economy.generator.startLevel,
    hp: economy.startingHp,
    maxHp: economy.startingHp,
    domeLevel: 0,
    bombs,
    bombCapacity: economy.baseBombCapacity,
    extras: {
      tank: false,
      radar: false,
      silo: 0,
      mine: 0,
      antiAirTower: false,
      regenerationKit: 0,
      vacuumHole: 0,
    },
    rebirthCount: 0,
    lifetimePx: 0,
    tankCooldown: 0,
    alive: true,
  };
}

export function createGameState(mode) {
  const economy = getEconomy(mode);
  const now = performance.now();
  return {
    mode,
    economy,
    startedAt: now,
    endsAt: economy.durationSeconds != null ? now + economy.durationSeconds * 1000 : null,
    remainingSeconds: economy.durationSeconds,
    isRunning: true,
    isOver: false,
    result: null, // "victory" | "defeat" | "draw" | null
    player: createSideState(economy),
    rival: createSideState(economy),
    log: [],
  };
}

export function pushLog(state, message) {
  state.log.unshift({ message, timestamp: Date.now() });
  if (state.log.length > 50) state.log.length = 50;
}

export function isThirtyMin(state) {
  return state.mode === GAME_MODES.THIRTY_MIN;
}
