// config.js
// Configuración centralizada del juego: nombres visibles y economía de cada modo.
//
// REGLA DE ORO: los identificadores internos (bombLevel1, tank, radar...) nunca
// cambian. Los nombres que ve el jugador viven únicamente en DISPLAY_NAMES.
// Las dos economías (INFINITE / THIRTY_MIN) están completamente separadas:
// ningún valor se comparte ni se deriva de la otra.

export const GAME_MODES = {
  INFINITE: "infinite",
  THIRTY_MIN: "thirty_min",
};

// ---------------------------------------------------------------------------
// Nombres visibles (interfaz). Los niveles de bomba 3-5 todavía no tienen
// nombre definitivo: se dejan como placeholder configurable, tal como pide
// la especificación ("no inventar nombres arbitrarios").
// ---------------------------------------------------------------------------
export const DISPLAY_NAMES = {
  generator: "Generador",
  dome: "Cúpula",

  bombLevel1: "Huevo",
  bombLevel2: "Pollo",
  bombLevel3: "Bomba nivel 3", // PENDIENTE: nombre definitivo por fijar
  bombLevel4: "Bomba nivel 4", // PENDIENTE: nombre definitivo por fijar
  bombLevel5: "Bomba nivel 5", // PENDIENTE: nombre definitivo por fijar

  tank: "Carrito",
  radar: "Radar",
  silo: "Armario",
  mine: "Mina",
  antiAirTower: "Torre",
  regenerationKit: "Kit",
  vacuumHole: "Agujero",
};

export function getDisplayName(id) {
  return DISPLAY_NAMES[id] || id;
}

// ---------------------------------------------------------------------------
// MODO 30 MINUTOS — economía exclusiva, valores fijados por especificación.
// ---------------------------------------------------------------------------
const THIRTY_MIN_ECONOMY = {
  mode: GAME_MODES.THIRTY_MIN,
  durationSeconds: 30 * 60,
  hasRebirth: false,
  startingPx: 0,
  startingHp: 100,

  generator: {
    startLevel: 1,
    maxLevel: 10,
    // Índice = nivel. El índice 0 no se usa.
    productionPerMin: [0, 60, 120, 220, 360, 550, 800, 1150, 1600, 2200, 3000],
    // Índice = nivel de destino. upgradeCost[2] = coste de L1 -> L2.
    upgradeCost: [null, null, 100, 250, 500, 900, 1500, 2500, 4000, 6500, 10000],
  },

  dome: {
    maxLevel: 3,
    // Índice = nivel de destino.
    upgradeCost: [null, 150, 400, 900],
    // Reducción de daño recibido, por nivel.
    damageReduction: [0, 0.15, 0.30, 0.45],
  },

  bombs: {
    bombLevel1: { cost: 40, damage: 5, requiresGeneratorLevel: 1 },
    bombLevel2: { cost: 120, damage: 12, requiresGeneratorLevel: 2 },
    bombLevel3: { cost: 300, damage: 25, requiresGeneratorLevel: 4 },
    bombLevel4: { cost: 700, damage: 45, requiresGeneratorLevel: 6 },
    bombLevel5: { cost: 1500, damage: 80, requiresGeneratorLevel: 8 },
  },
  // Orden de aparición en la UI.
  bombOrder: ["bombLevel1", "bombLevel2", "bombLevel3", "bombLevel4", "bombLevel5"],

  baseBombCapacity: 5,

  extras: {
    tank: { cost: 250, description: "Ataca al rival automáticamente mientras está activo." },
    radar: { cost: 150, description: "Revela el estado del rival en todo momento." },
    silo: { cost: 200, description: "Aumenta la capacidad de bombas almacenadas.", capacityBonus: 5, maxCount: 2 },
    mine: { cost: 180, description: "Bloquea por completo el próximo impacto recibido." },
    antiAirTower: { cost: 350, description: "Da una probabilidad de interceptar bombas entrantes.", interceptChance: 0.25 },
    regenerationKit: { cost: 200, description: "Restaura estructura al usarse.", healAmount: 25 },
    vacuumHole: { cost: 500, description: "Roba PX al rival al usarse.", stealFraction: 0.20 },
  },
  extraOrder: ["tank", "radar", "silo", "mine", "antiAirTower", "regenerationKit", "vacuumHole"],

  tank: {
    damage: 4,
    attackIntervalSeconds: 8,
  },
};

// ---------------------------------------------------------------------------
// MODO INFINITO — economía propia e independiente, sin límite de nivel de
// generador, con Rebirth. No comparte ni un solo valor con el modo 30 min.
// ---------------------------------------------------------------------------
const INFINITE_ECONOMY = {
  mode: GAME_MODES.INFINITE,
  durationSeconds: null, // sin límite de tiempo
  hasRebirth: true,
  startingPx: 0,
  startingHp: 150,

  generator: {
    startLevel: 1,
    maxLevel: null, // sin tope: progresión abierta
    baseProductionPerMin: 40,
    // Producción(nivel) = base * growthFactor^(nivel-1), redondeado.
    growthFactor: 1.28,
    baseUpgradeCost: 80,
    // Coste(nivel destino) = baseCost * costGrowth^(nivel-2).
    costGrowth: 1.35,
  },

  dome: {
    maxLevel: null,
    baseUpgradeCost: 200,
    costGrowth: 1.4,
    baseDamageReduction: 0.10,
    reductionPerLevel: 0.05,
    maxDamageReduction: 0.75,
  },

  bombs: {
    bombLevel1: { cost: 60, damage: 6, requiresGeneratorLevel: 1 },
    bombLevel2: { cost: 180, damage: 15, requiresGeneratorLevel: 3 },
    bombLevel3: { cost: 450, damage: 32, requiresGeneratorLevel: 6 },
    bombLevel4: { cost: 1000, damage: 60, requiresGeneratorLevel: 10 },
    bombLevel5: { cost: 2200, damage: 110, requiresGeneratorLevel: 15 },
  },
  bombOrder: ["bombLevel1", "bombLevel2", "bombLevel3", "bombLevel4", "bombLevel5"],

  baseBombCapacity: 8,

  extras: {
    tank: { cost: 400, description: "Ataca al rival automáticamente mientras está activo." },
    radar: { cost: 220, description: "Revela el estado del rival en todo momento." },
    silo: { cost: 300, description: "Aumenta la capacidad de bombas almacenadas.", capacityBonus: 6, maxCount: 5 },
    mine: { cost: 260, description: "Bloquea por completo el próximo impacto recibido." },
    antiAirTower: { cost: 500, description: "Da una probabilidad de interceptar bombas entrantes.", interceptChance: 0.25 },
    regenerationKit: { cost: 300, description: "Restaura estructura al usarse.", healAmount: 35 },
    vacuumHole: { cost: 750, description: "Roba PX al rival al usarse.", stealFraction: 0.20 },
  },
  extraOrder: ["tank", "radar", "silo", "mine", "antiAirTower", "regenerationKit", "vacuumHole"],

  tank: {
    damage: 5,
    attackIntervalSeconds: 8,
  },

  rebirth: {
    // PX totales acumulados históricamente (lifetime) necesarios para poder
    // hacer Rebirth por primera vez; cada Rebirth sucesivo exige más.
    baseRequirement: 50000,
    requirementGrowth: 1.6,
    // Cada Rebirth otorga un multiplicador permanente de producción.
    productionMultiplierPerRebirth: 0.15, // +15% por rebirth, acumulativo
  },
};

const ECONOMIES = {
  [GAME_MODES.THIRTY_MIN]: THIRTY_MIN_ECONOMY,
  [GAME_MODES.INFINITE]: INFINITE_ECONOMY,
};

export function getEconomy(mode) {
  const economy = ECONOMIES[mode];
  if (!economy) {
    throw new Error(`Modo de juego desconocido: ${mode}`);
  }
  return economy;
}

// Utilidades de economía puras (no dependen de estado de partida) -----------

export function generatorProductionPerMin(economy, level) {
  if (economy.mode === GAME_MODES.THIRTY_MIN) {
    return economy.generator.productionPerMin[level] || 0;
  }
  const g = economy.generator;
  return Math.round(g.baseProductionPerMin * Math.pow(g.growthFactor, level - 1));
}

export function generatorUpgradeCost(economy, targetLevel) {
  if (economy.mode === GAME_MODES.THIRTY_MIN) {
    return economy.generator.upgradeCost[targetLevel] ?? null;
  }
  if (targetLevel < 2) return null;
  const g = economy.generator;
  return Math.round(g.baseUpgradeCost * Math.pow(g.costGrowth, targetLevel - 2));
}

export function domeUpgradeCost(economy, targetLevel) {
  if (economy.mode === GAME_MODES.THIRTY_MIN) {
    return economy.dome.upgradeCost[targetLevel] ?? null;
  }
  if (targetLevel < 1) return null;
  const d = economy.dome;
  return Math.round(d.baseUpgradeCost * Math.pow(d.costGrowth, targetLevel - 1));
}

export function domeDamageReduction(economy, level) {
  if (level <= 0) return 0;
  if (economy.mode === GAME_MODES.THIRTY_MIN) {
    return economy.dome.damageReduction[level] ?? economy.dome.damageReduction[economy.dome.maxLevel];
  }
  const d = economy.dome;
  return Math.min(d.maxDamageReduction, d.baseDamageReduction + d.reductionPerLevel * (level - 1));
}
