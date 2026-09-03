// tests/economySim.js
// Suite de simulación/verificación económica, ejecutable con Node sin
// dependencias externas:
//
//   node tests/economySim.js
//
// Cubre las fases 28-35 de la especificación: sólo-generador, jugador
// equilibrado, jugador agresivo, bombas (nombres + sin cooldown), extras,
// fin de partida por temporizador, ausencia de Rebirth en 30 min, y
// aislamiento entre las economías de Infinito y 30 minutos.

import { getEconomy, getDisplayName, GAME_MODES } from "../js/config.js";
import { createGameState } from "../js/state.js";
import { tickGeneratorProduction, buyGeneratorUpgrade, performRebirth, rebirthRequirement } from "../js/generator.js";
import { buyDomeUpgrade, buyBomb, launchBomb, resolveAttack } from "../js/combat.js";
import { buyExtra, useExtra } from "../js/extras.js";

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  OK  ${message}`);
  } else {
    failCount++;
    console.error(`FAIL  ${message}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------
// TEST A — Sólo generador (fase 28)
// ---------------------------------------------------------------------
function testGeneratorOnly() {
  section("TEST A — Jugador que sólo mejora el generador");
  const state = createGameState(GAME_MODES.THIRTY_MIN);
  const totalSeconds = 30 * 60;
  let reachedL10At = null;

  for (let t = 1; t <= totalSeconds; t++) {
    tickGeneratorProduction(state, "player", 1);
    while (buyGeneratorUpgrade(state, "player").ok) {
      if (state.player.generatorLevel === 10 && reachedL10At == null) reachedL10At = t;
    }
  }

  console.log(`  Nivel final: L${state.player.generatorLevel}, PX restantes: ${state.player.px.toFixed(1)}`);
  console.log(`  L10 alcanzado en el segundo ${reachedL10At} (minuto ${(reachedL10At / 60).toFixed(1)})`);

  assert(state.player.generatorLevel === 10, "alcanza L10 dedicándose sólo a la economía");
  assert(reachedL10At != null && reachedL10At >= 1500 && reachedL10At <= 1800, "L10 se alcanza aproximadamente entre el minuto 25 y el 30");
  assert(state.player.px >= 0, "el PX restante nunca es negativo");
}

// ---------------------------------------------------------------------
// TEST B — Jugador equilibrado (fase 29)
// ---------------------------------------------------------------------
function testBalancedPlayer() {
  section("TEST B — Jugador equilibrado (economía + ataque + defensa + extra)");
  const state = createGameState(GAME_MODES.THIRTY_MIN);
  const totalSeconds = 30 * 60;
  const economy = state.economy;
  let bombsBought = 0;
  let domeBought = 0;
  let extraBought = 0;

  // Un jugador equilibrado reserva el PX para el generador mientras no
  // tenga una base económica mínima; a partir de ahí reparte entre ataque,
  // defensa y extras sin descuidar por completo el generador.
  const BALANCED_ECONOMY_FLOOR = 5;
  for (let t = 1; t <= totalSeconds; t++) {
    tickGeneratorProduction(state, "player", 1);

    if (t % 5 !== 0) continue; // decide cada 5 segundos simulados

    if (state.player.generatorLevel < BALANCED_ECONOMY_FLOOR) {
      buyGeneratorUpgrade(state, "player");
      continue;
    }

    const roll = Math.random();
    if (roll < 0.55) {
      buyGeneratorUpgrade(state, "player");
    } else if (roll < 0.75) {
      for (const bombId of economy.bombOrder) {
        if (buyBomb(state, "player", bombId).ok) {
          bombsBought++;
          break;
        }
      }
    } else if (roll < 0.9) {
      if (buyDomeUpgrade(state, "player").ok) domeBought++;
    } else {
      for (const extraId of economy.extraOrder) {
        if (buyExtra(state, "player", extraId).ok) {
          extraBought++;
          break;
        }
      }
    }
  }

  console.log(`  Nivel final: L${state.player.generatorLevel}, PX restantes: ${state.player.px.toFixed(1)}`);
  console.log(`  Bombas compradas: ${bombsBought}, mejoras de cúpula: ${domeBought}, extras: ${extraBought}`);

  assert(state.player.generatorLevel >= 6, "progresa razonablemente en el generador (>= L6)");
  assert(state.player.generatorLevel <= 10, "no supera el máximo del modo");
  assert(bombsBought + domeBought + extraBought > 0, "las compras de ataque/defensa/extras importan y ocurren");
}

// ---------------------------------------------------------------------
// TEST C — Jugador agresivo (fase 30)
// ---------------------------------------------------------------------
function testAggressivePlayer() {
  section("TEST C — Jugador agresivo (prioriza ataque)");
  const state = createGameState(GAME_MODES.THIRTY_MIN);
  const totalSeconds = 30 * 60;
  const economy = state.economy;
  let toolsUsed = 0;

  // Un jugador agresivo "hábil" (no puramente aleatorio) mantiene una base
  // económica mínima (hasta L6) y vuelca el resto en ataque/defensa: es la
  // estrategia que la fase 30 pide comprobar, no un gasto errático.
  const AGGRESSIVE_ECONOMY_FLOOR = 6;
  for (let t = 1; t <= totalSeconds; t++) {
    tickGeneratorProduction(state, "player", 1);

    if (t % 5 !== 0) continue;

    if (state.player.generatorLevel < AGGRESSIVE_ECONOMY_FLOOR) {
      // Por debajo del suelo económico, todo el PX se reserva para el
      // generador (ni siquiera se gasta en ataque si aún no llega el turno).
      buyGeneratorUpgrade(state, "player");
      continue;
    }

    const roll = Math.random();
    if (roll < 0.15) {
      buyGeneratorUpgrade(state, "player");
    } else if (roll < 0.75) {
      for (const bombId of [...economy.bombOrder].reverse()) {
        if (buyBomb(state, "player", bombId).ok) {
          toolsUsed++;
          break;
        }
      }
    } else {
      for (const extraId of economy.extraOrder) {
        if (buyExtra(state, "player", extraId).ok) {
          toolsUsed++;
          break;
        }
      }
    }
  }

  console.log(`  Nivel final: L${state.player.generatorLevel}, PX restantes: ${state.player.px.toFixed(1)}`);
  console.log(`  Herramientas ofensivas/defensivas adquiridas: ${toolsUsed}`);

  assert(state.player.generatorLevel >= 4 && state.player.generatorLevel <= 9, "economía crece más despacio pero sigue siendo viable (L4-L9 aprox.)");
  assert(toolsUsed >= 5, "puede permitirse varias herramientas ofensivas/defensivas");
}

// ---------------------------------------------------------------------
// TEST D — Bombas: nombres, sin cooldown, targeting, defensas (fase 31)
// ---------------------------------------------------------------------
function testBombs() {
  section("TEST D — Bombas");

  assert(getDisplayName("bombLevel1") === "Huevo", 'la bomba de nivel 1 se muestra como "Huevo"');
  assert(getDisplayName("bombLevel2") === "Pollo", 'la bomba de nivel 2 se muestra como "Pollo"');

  const state = createGameState(GAME_MODES.THIRTY_MIN);
  state.player.px = 10000;

  const buy1 = buyBomb(state, "player", "bombLevel1");
  const buy2 = buyBomb(state, "player", "bombLevel1");
  assert(buy1.ok && buy2.ok, "se pueden comprar varias bombas seguidas");

  // Sin cooldown: dos lanzamientos consecutivos e inmediatos deben funcionar.
  const launch1 = launchBomb(state, "player", "bombLevel1");
  const launch2 = launchBomb(state, "player", "bombLevel1");
  assert(launch1.ok && launch2.ok, "dos bombas se lanzan de forma consecutiva e inmediata (sin cooldown de recarga)");
  assert(state.player.bombs.bombLevel1 === 0, "el stock se descuenta correctamente al lanzar");

  // Targeting: el objetivo de un lanzamiento del jugador es el rival.
  const before = state.rival.hp;
  state.player.px = 10000;
  state.player.generatorLevel = 2; // requisito de nivel para bombLevel2
  const boughtL2 = buyBomb(state, "player", "bombLevel2");
  const launch3 = launchBomb(state, "player", "bombLevel2");
  assert(boughtL2.ok && launch3.ok && state.rival.hp < before, "el ataque impacta correctamente en el rival (targeting)");

  // Defensa: cúpula reduce el daño.
  const domeState = createGameState(GAME_MODES.THIRTY_MIN);
  domeState.rival.domeLevel = 2;
  const rawDamage = 100;
  const originalMathRandom = Math.random;
  Math.random = () => 0.99; // evita interceptación de torre en este sub-test
  const result = resolveAttack(domeState, "rival", rawDamage);
  Math.random = originalMathRandom;
  assert(result.damageDealt < rawDamage, "la cúpula reduce el daño recibido");

  // Defensa: mina bloquea un impacto por completo y se consume.
  const mineState = createGameState(GAME_MODES.THIRTY_MIN);
  mineState.rival.extras.mine = 1;
  const mineResult = resolveAttack(mineState, "rival", 100);
  assert(mineResult.blockedByMine === true && mineResult.damageDealt === 0, "la mina bloquea el impacto por completo");
  assert(mineState.rival.extras.mine === 0, "la mina se consume tras bloquear un impacto");

  // Defensa: torre antiaérea intercepta según probabilidad (se fuerza el resultado).
  const towerState = createGameState(GAME_MODES.THIRTY_MIN);
  towerState.rival.extras.antiAirTower = true;
  const forceIntercept = Math.random;
  Math.random = () => 0; // siempre por debajo de la probabilidad de interceptación
  const interceptResult = resolveAttack(towerState, "rival", 100);
  Math.random = forceIntercept;
  assert(interceptResult.intercepted === true && interceptResult.damageDealt === 0, "la torre puede interceptar por completo un ataque");
}

// ---------------------------------------------------------------------
// TEST E — Extras: nombres visibles (fase 32)
// ---------------------------------------------------------------------
function testExtrasNames() {
  section("TEST E — Nombres visibles de los extras");
  const expected = {
    tank: "Carrito",
    radar: "Radar",
    silo: "Armario",
    mine: "Mina",
    antiAirTower: "Torre",
    regenerationKit: "Kit",
    vacuumHole: "Agujero",
  };
  for (const [id, name] of Object.entries(expected)) {
    assert(getDisplayName(id) === name, `${id} se muestra como "${name}"`);
  }

  const state = createGameState(GAME_MODES.THIRTY_MIN);
  state.player.px = 10000;
  buyExtra(state, "player", "regenerationKit");
  state.player.hp = 50;
  const healResult = useExtra(state, "player", "regenerationKit");
  assert(healResult.ok && state.player.hp > 50, "el Kit restaura estructura al usarse");

  buyExtra(state, "player", "vacuumHole");
  state.rival.px = 1000;
  const stealResult = useExtra(state, "player", "vacuumHole");
  assert(stealResult.ok && state.rival.px < 1000, "el Agujero roba PX al rival al usarse");
}

// ---------------------------------------------------------------------
// TEST F — Fin de partida por temporizador (fase 33)
// ---------------------------------------------------------------------
function testGameEnd() {
  section("TEST F — Bloqueo de acciones al finalizar la partida");
  const state = createGameState(GAME_MODES.THIRTY_MIN);
  state.player.px = 10000;
  buyBomb(state, "player", "bombLevel1");

  state.isOver = true;
  state.isRunning = false;
  state.remainingSeconds = 0;

  const pxBefore = state.player.px;
  tickGeneratorProduction(state, "player", 5);
  assert(state.player.px === pxBefore, "no se genera más PX después de terminar la partida");

  assert(buyGeneratorUpgrade(state, "player").reason === "game_over", "no se pueden comprar mejoras de generador tras el final");
  assert(buyBomb(state, "player", "bombLevel1").reason === "game_over", "no se pueden comprar bombas tras el final");
  assert(launchBomb(state, "player", "bombLevel1").reason === "game_over", "no se pueden lanzar bombas tras el final");
}

// ---------------------------------------------------------------------
// TEST G — Rebirth ausente en 30 minutos, presente en Infinito (fase 34)
// ---------------------------------------------------------------------
function testRebirth() {
  section("TEST G — Rebirth");
  const thirtyMinEconomy = getEconomy(GAME_MODES.THIRTY_MIN);
  const infiniteEconomy = getEconomy(GAME_MODES.INFINITE);

  assert(thirtyMinEconomy.hasRebirth === false, "el modo 30 minutos no tiene Rebirth");
  assert(infiniteEconomy.hasRebirth === true, "el modo Infinito conserva el Rebirth");

  const thirtyMinState = createGameState(GAME_MODES.THIRTY_MIN);
  thirtyMinState.player.lifetimePx = 1_000_000;
  const rebirthAttempt = performRebirth(thirtyMinState, "player");
  assert(rebirthAttempt.reason === "not_available", "intentar hacer Rebirth en 30 minutos se rechaza explícitamente");

  const infiniteState = createGameState(GAME_MODES.INFINITE);
  const requirement = rebirthRequirement(infiniteEconomy, 0);
  infiniteState.player.lifetimePx = requirement + 1;
  const infiniteRebirth = performRebirth(infiniteState, "player");
  assert(infiniteRebirth.ok === true && infiniteState.player.rebirthCount === 1, "en Infinito el Rebirth funciona cuando se cumple el requisito");
}

// ---------------------------------------------------------------------
// TEST H — Aislamiento entre economías (fase 35)
// ---------------------------------------------------------------------
function testIsolation() {
  section("TEST H — Aislamiento Infinito / 30 minutos");
  const thirtyMinEconomy = getEconomy(GAME_MODES.THIRTY_MIN);
  const infiniteEconomy = getEconomy(GAME_MODES.INFINITE);

  assert(thirtyMinEconomy !== infiniteEconomy, "las dos economías son objetos completamente independientes");
  assert(Array.isArray(thirtyMinEconomy.generator.productionPerMin), "30 minutos usa una tabla fija de producción");
  assert(infiniteEconomy.generator.productionPerMin === undefined, "Infinito no usa la tabla del modo 30 minutos (usa fórmula propia)");

  const ratioL1 = infiniteEconomy.bombs.bombLevel1.cost / thirtyMinEconomy.bombs.bombLevel1.cost;
  const ratioL5 = infiniteEconomy.bombs.bombLevel5.cost / thirtyMinEconomy.bombs.bombLevel5.cost;
  assert(Math.abs(ratioL1 - ratioL5) > 0.01, "los costes de bombas no son el resultado de aplicar un multiplicador único al Infinito");

  // Jugar una partida de 30 min no debe alterar la configuración de Infinito.
  const before30 = JSON.stringify(thirtyMinEconomy);
  const stateA = createGameState(GAME_MODES.THIRTY_MIN);
  stateA.player.px = 999999;
  buyGeneratorUpgrade(stateA, "player");
  buyGeneratorUpgrade(stateA, "player");
  const afterInfinite = getEconomy(GAME_MODES.INFINITE);
  const after30 = JSON.stringify(getEconomy(GAME_MODES.THIRTY_MIN));
  assert(before30 === after30, "la economía de 30 min no se modifica jugando");
  assert(JSON.stringify(afterInfinite) === JSON.stringify(infiniteEconomy), "jugar en 30 minutos no altera la economía Infinita");
}

// ---------------------------------------------------------------------
// TEST I — Precios y producción exactos del generador de 30 min (fase 4/23/43)
// ---------------------------------------------------------------------
function testGeneratorNumbers() {
  section("TEST I — Valores exactos de la especificación (modo 30 minutos)");
  const economy = getEconomy(GAME_MODES.THIRTY_MIN);
  const expectedProduction = [null, 60, 120, 220, 360, 550, 800, 1150, 1600, 2200, 3000];
  const expectedCost = [null, null, 100, 250, 500, 900, 1500, 2500, 4000, 6500, 10000];

  for (let level = 1; level <= 10; level++) {
    assert(
      economy.generator.productionPerMin[level] === expectedProduction[level],
      `producción L${level} = ${expectedProduction[level]} PX/min`
    );
  }
  for (let level = 2; level <= 10; level++) {
    assert(
      economy.generator.upgradeCost[level] === expectedCost[level],
      `coste de mejora a L${level} = ${expectedCost[level]} PX`
    );
  }

  const totalCost = economy.generator.upgradeCost.slice(2).reduce((a, b) => a + b, 0);
  assert(totalCost === 26250, `coste acumulado total L1->L10 = 26.250 PX (obtenido: ${totalCost})`);

  assert(economy.durationSeconds === 1800, "la duración del modo 30 minutos es exactamente 1800 segundos (30:00)");
}

// ---------------------------------------------------------------------

function run() {
  testGeneratorOnly();
  testBalancedPlayer();
  testAggressivePlayer();
  testBombs();
  testExtrasNames();
  testGameEnd();
  testRebirth();
  testIsolation();
  testGeneratorNumbers();

  console.log(`\n===============================`);
  console.log(`Resultado: ${passCount} OK, ${failCount} FAIL`);
  console.log(`===============================`);
  if (failCount > 0) process.exit(1);
}

run();
