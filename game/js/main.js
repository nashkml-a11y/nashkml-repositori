// main.js
// Orquesta las pantallas (selección de modo -> mapa -> partida), el bucle de
// juego y los listeners de la interfaz.

import { createGameState, isThirtyMin } from "./state.js";
import { CountdownTimer } from "./timer.js";
import { tickGeneratorProduction, buyGeneratorUpgrade, performRebirth } from "./generator.js";
import { buyDomeUpgrade, buyBomb, launchBomb } from "./combat.js";
import { buyExtra, useExtra, tickTank } from "./extras.js";
import { tickRivalAI, createRivalAI } from "./ai.js";
import { renderGame, renderTimer } from "./ui.js";
import { generateMap, createMatchSeed } from "./mapgen.js";
import { MapView } from "./mapView.js";

const el = (id) => document.getElementById(id);

const app = {
  mode: null,
  map: null,
  mapView: null,
  battleMap: null,
  battleMapView: null,
  state: null,
  countdownTimer: null,
  rivalAI: null,
  lastFrameTime: null,
  rafId: null,
};

// --- Renderizado del mapa (compartido entre la vista previa y la partida) --

function paintMapSvg(svg, map) {
  svg.setAttribute("viewBox", `0 0 ${map.width} ${map.height}`);
  svg.innerHTML = "";
  for (const island of map.islands) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", island.path);
    path.setAttribute("class", island.kind === "fixed" ? "island island-fixed" : "island island-conquest");
    path.dataset.islandId = island.id;
    svg.appendChild(path);
  }
}

// El HUD ocupará una columna fija de 1/4 del ancho: el mapa no tiene por
// qué ser cuadrado, se genera directamente con la proporción del hueco
// libre que le queda (ver mapgen.js: generateMap(seed, aspectRatio)).
function aspectRatioOf(element) {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return 1;
  return rect.width / rect.height;
}

function generateAndShowMap() {
  const seed = createMatchSeed();
  const aspect = aspectRatioOf(el("map-container"));
  app.map = generateMap(seed, aspect);
  const svg = el("map-svg");
  paintMapSvg(svg, app.map);
  if (app.mapView) app.mapView.destroy();
  app.mapView = new MapView(svg, app.map.width, app.map.height);
  el("map-seed-label").textContent = `Semilla del mapa: ${app.map.seed}`;
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  el(screenId).classList.remove("hidden");
}

// --- Pantalla de partida -----------------------------------------------

function startBattle() {
  app.state = createGameState(app.mode);
  app.rivalAI = createRivalAI();
  showScreen("game-screen");

  // El lienzo se regenera con la misma semilla pero ajustado a la forma
  // real del hueco que deja el HUD (1/4 del ancho para el HUD, el resto
  // para el mapa) — así llena exactamente el espacio disponible.
  const battleAspect = aspectRatioOf(el("battle-map-pane"));
  app.battleMap = generateMap(app.map.seed, battleAspect);
  const battleSvg = el("battle-map-svg");
  paintMapSvg(battleSvg, app.battleMap);
  if (app.battleMapView) app.battleMapView.destroy();
  app.battleMapView = new MapView(battleSvg, app.battleMap.width, app.battleMap.height);

  if (isThirtyMin(app.state)) {
    app.countdownTimer = new CountdownTimer(
      app.state.economy.durationSeconds,
      (remainingSeconds) => {
        app.state.remainingSeconds = remainingSeconds;
        renderTimer(remainingSeconds, app.state.mode);
      },
      () => onTimeUp()
    );
    app.countdownTimer.start();
  } else {
    app.state.remainingSeconds = null;
  }

  app.lastFrameTime = performance.now();
  app.rafId = requestAnimationFrame(gameLoop);
  renderGame(app.state);
}

function onTimeUp() {
  const state = app.state;
  if (state.isOver) return;
  state.isOver = true;
  state.isRunning = false;
  if (state.result == null) {
    const playerScore = state.player.hp + state.player.px + state.player.generatorLevel * 50;
    const rivalScore = state.rival.hp + state.rival.px + state.rival.generatorLevel * 50;
    state.result = playerScore > rivalScore ? "victory" : playerScore < rivalScore ? "defeat" : "draw";
  }
  renderGame(state);
}

function gameLoop(now) {
  const state = app.state;
  if (!state) return;
  const dt = Math.min(0.25, (now - app.lastFrameTime) / 1000);
  app.lastFrameTime = now;

  if (!state.isOver) {
    tickGeneratorProduction(state, "player", dt);
    tickGeneratorProduction(state, "rival", dt);
    tickTank(state, "player", dt);
    tickTank(state, "rival", dt);
    tickRivalAI(state, app.rivalAI, dt);
  }

  renderGame(state);

  if (!state.isOver) {
    app.rafId = requestAnimationFrame(gameLoop);
  }
}

function stopBattle() {
  if (app.rafId != null) cancelAnimationFrame(app.rafId);
  if (app.countdownTimer) app.countdownTimer.stop();
  if (app.battleMapView) app.battleMapView.destroy();
  app.battleMapView = null;
  app.state = null;
  app.countdownTimer = null;
}

// --- Listeners ------------------------------------------------------------

function bindModeSelect() {
  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => {
      app.mode = card.dataset.mode;
      generateAndShowMap();
      showScreen("map-screen");
    });
  });
}

function bindMapControls() {
  el("btn-regenerate-map").addEventListener("click", generateAndShowMap);
  el("btn-start-battle").addEventListener("click", startBattle);
}

function bindBattleControls() {
  el("player-buy-generator").addEventListener("click", () => {
    buyGeneratorUpgrade(app.state, "player");
    renderGame(app.state);
  });

  el("player-buy-dome").addEventListener("click", () => {
    buyDomeUpgrade(app.state, "player");
    renderGame(app.state);
  });

  el("player-do-rebirth").addEventListener("click", () => {
    performRebirth(app.state, "player");
    renderGame(app.state);
  });

  el("btn-restart").addEventListener("click", () => {
    stopBattle();
    showScreen("mode-select");
  });

  for (const listId of ["player-bombs-list", "player-extras-list"]) {
    el(listId).addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button || !app.state) return;
      const { action, bombId, extraId } = button.dataset;
      if (action === "buy-bomb") buyBomb(app.state, "player", bombId);
      else if (action === "launch-bomb") launchBomb(app.state, "player", bombId);
      else if (action === "buy-extra") buyExtra(app.state, "player", extraId);
      else if (action === "use-extra") useExtra(app.state, "player", extraId);
      renderGame(app.state);
    });
  }
}

bindModeSelect();
bindMapControls();
bindBattleControls();
