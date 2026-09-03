// ui.js
// Renderizado de la interfaz de la partida. Sólo lee del estado y lo vuelca
// al DOM; toda la lógica de juego vive en generator.js / combat.js / extras.js.

import { getDisplayName } from "./config.js";
import { formatTime } from "./timer.js";
import { nextGeneratorLevel, nextGeneratorUpgradeCost } from "./generator.js";
import { nextDomeLevel, nextDomeUpgradeCost, bombCapacity } from "./combat.js";
import { isExtraOwned } from "./extras.js";

const el = (id) => document.getElementById(id);

function formatPx(value) {
  return Math.floor(value).toLocaleString("es-ES");
}

export function renderTimer(remainingSeconds, mode) {
  el("hud-timer").textContent = mode === "infinite" ? "∞" : formatTime(remainingSeconds);
}

export function renderModeLabel(mode) {
  el("hud-mode-label").textContent = mode === "infinite" ? "Modo Infinito" : "Modo 30 minutos";
}

function renderGenerator(prefix, sideState, economy) {
  el(`${prefix}-generator-title`).textContent = `Generador L${sideState.generatorLevel}`;
  const production = economy.mode === "thirty_min"
    ? economy.generator.productionPerMin[sideState.generatorLevel]
    : Math.round(60 * (sideState.generatorLevel ? productionLookup(economy, sideState.generatorLevel) : 0));
  el(`${prefix}-generator-production`).textContent = `${formatPx(production)} PX/min`;

  const nextBtn = el(`${prefix}-buy-generator`);
  if (!nextBtn) return;
  const next = nextGeneratorLevel(sideState, economy);
  const nextEl = el(`${prefix}-generator-next`);
  if (next == null) {
    nextEl.textContent = "Nivel máximo alcanzado.";
    nextBtn.disabled = true;
    nextBtn.textContent = "Nivel máximo";
  } else {
    const cost = nextGeneratorUpgradeCost(sideState, economy);
    nextEl.textContent = `Siguiente mejora: L${next} · Coste: ${formatPx(cost)} PX`;
    nextBtn.textContent = `Mejorar a L${next} (${formatPx(cost)} PX)`;
    nextBtn.disabled = sideState.px < cost;
  }
}

function productionLookup(economy, level) {
  const g = economy.generator;
  return (g.baseProductionPerMin * Math.pow(g.growthFactor, level - 1)) / 60;
}

function renderDome(prefix, sideState, economy) {
  el(`${prefix}-dome-level`).textContent = sideState.domeLevel;
  const btn = el(`${prefix}-buy-dome`);
  if (!btn) return;
  const next = nextDomeLevel(sideState, economy);
  const nextEl = el(`${prefix}-dome-next`);
  if (next == null) {
    nextEl.textContent = "Nivel máximo alcanzado.";
    btn.disabled = true;
    btn.textContent = "Nivel máximo";
  } else {
    const cost = nextDomeUpgradeCost(sideState, economy);
    nextEl.textContent = `Siguiente mejora: nivel ${next} · Coste: ${formatPx(cost)} PX`;
    btn.textContent = `Mejorar cúpula (${formatPx(cost)} PX)`;
    btn.disabled = sideState.px < cost;
  }
}

function renderBombs(state) {
  const sideState = state.player;
  const economy = state.economy;
  const container = el("player-bombs-list");
  container.innerHTML = "";
  for (const bombId of economy.bombOrder) {
    const config = economy.bombs[bombId];
    const owned = sideState.bombs[bombId] || 0;
    const row = document.createElement("div");
    row.className = "item-row";

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = `${getDisplayName(bombId)} (daño ${config.damage})`;
    row.appendChild(name);

    const count = document.createElement("span");
    count.className = "item-count";
    count.textContent = owned;
    row.appendChild(count);

    const buyBtn = document.createElement("button");
    buyBtn.className = "btn-small";
    buyBtn.textContent = `Comprar (${formatPx(config.cost)} PX)`;
    buyBtn.dataset.action = "buy-bomb";
    buyBtn.dataset.bombId = bombId;
    buyBtn.disabled =
      sideState.px < config.cost ||
      sideState.generatorLevel < config.requiresGeneratorLevel ||
      totalBombs(sideState) >= bombCapacity(sideState);
    row.appendChild(buyBtn);

    const useBtn = document.createElement("button");
    useBtn.className = "btn-small";
    useBtn.textContent = "Lanzar";
    useBtn.dataset.action = "launch-bomb";
    useBtn.dataset.bombId = bombId;
    useBtn.disabled = owned <= 0;
    row.appendChild(useBtn);

    container.appendChild(row);
  }
}

function totalBombs(sideState) {
  return Object.values(sideState.bombs).reduce((sum, n) => sum + n, 0);
}

function renderExtras(state) {
  const sideState = state.player;
  const economy = state.economy;
  const container = el("player-extras-list");
  container.innerHTML = "";
  for (const extraId of economy.extraOrder) {
    const config = economy.extras[extraId];
    const owned = isExtraOwned(sideState, extraId);
    const row = document.createElement("div");
    row.className = "item-row";

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = getDisplayName(extraId);
    row.appendChild(name);

    if (extraId === "silo" || extraId === "mine" || extraId === "regenerationKit" || extraId === "vacuumHole") {
      const count = document.createElement("span");
      count.className = "item-count";
      count.textContent = sideState.extras[extraId] || 0;
      row.appendChild(count);
    }

    const buyBtn = document.createElement("button");
    buyBtn.className = "btn-small";
    buyBtn.dataset.action = "buy-extra";
    buyBtn.dataset.extraId = extraId;
    if (extraId === "tank" || extraId === "radar" || extraId === "antiAirTower") {
      buyBtn.textContent = owned ? "Adquirido" : `Comprar (${formatPx(config.cost)} PX)`;
      buyBtn.disabled = owned || sideState.px < config.cost;
    } else if (extraId === "silo") {
      const count = sideState.extras.silo || 0;
      buyBtn.textContent = `Comprar (${formatPx(config.cost)} PX)`;
      buyBtn.disabled = count >= config.maxCount || sideState.px < config.cost;
    } else {
      buyBtn.textContent = `Comprar (${formatPx(config.cost)} PX)`;
      buyBtn.disabled = sideState.px < config.cost;
    }
    row.appendChild(buyBtn);

    if (extraId === "regenerationKit" || extraId === "vacuumHole") {
      const useBtn = document.createElement("button");
      useBtn.className = "btn-small";
      useBtn.textContent = "Usar";
      useBtn.dataset.action = "use-extra";
      useBtn.dataset.extraId = extraId;
      useBtn.disabled = !(sideState.extras[extraId] > 0);
      row.appendChild(useBtn);
    }

    container.appendChild(row);
  }
}

function renderRivalExtras(state) {
  const container = el("rival-extras-list");
  container.innerHTML = "";
  const radarOwned = isExtraOwned(state.player, "radar");
  el("radar-hint").classList.toggle("hidden", radarOwned);
  if (!radarOwned) return;

  const economy = state.economy;
  for (const extraId of economy.extraOrder) {
    if (!isExtraOwned(state.rival, extraId)) continue;
    const row = document.createElement("div");
    row.className = "item-row";
    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = getDisplayName(extraId);
    row.appendChild(name);
    container.appendChild(row);
  }
}

function renderRebirth(state) {
  const card = el("player-rebirth-card");
  if (!state.economy.hasRebirth) {
    card.classList.add("hidden");
    return;
  }
  card.classList.remove("hidden");
  const sideState = state.player;
  const rebirth = state.economy.rebirth;
  const requirement = Math.round(rebirth.baseRequirement * Math.pow(rebirth.requirementGrowth, sideState.rebirthCount));
  el("player-rebirth-info").textContent =
    `Rebirths: ${sideState.rebirthCount} · Requiere ${formatPx(requirement)} PX de por vida (tienes ${formatPx(sideState.lifetimePx)}).`;
  const btn = el("player-do-rebirth");
  btn.disabled = sideState.lifetimePx < requirement;
  btn.dataset.requirement = requirement;
}

function renderHp(prefix, sideState) {
  const pct = Math.max(0, Math.min(100, (sideState.hp / sideState.maxHp) * 100));
  el(`${prefix}-hp-bar`).style.width = `${pct}%`;
  el(`${prefix}-hp-label`).textContent = `${Math.round(sideState.hp)} / ${sideState.maxHp}`;
}

function renderResultBanner(state) {
  const banner = el("result-banner");
  if (!state.isOver) {
    banner.classList.add("hidden");
    banner.className = "hidden";
    return;
  }
  banner.classList.remove("hidden");
  const messages = {
    victory: "¡Victoria! El rival ha sido derrotado.",
    defeat: "Derrota. Tu base ha sido destruida.",
    draw: "Empate.",
  };
  let message = messages[state.result] || "Partida finalizada.";
  if (state.mode === "thirty_min" && state.result !== "victory" && state.result !== "defeat" && state.remainingSeconds <= 0) {
    message = "Tiempo agotado. " + compareFinalScore(state);
  }
  banner.textContent = message;
  banner.className = `result-${state.result || "draw"}`;
}

function compareFinalScore(state) {
  const playerScore = state.player.hp + state.player.px + state.player.generatorLevel * 50;
  const rivalScore = state.rival.hp + state.rival.px + state.rival.generatorLevel * 50;
  if (playerScore > rivalScore) return "¡Ganas por puntuación final!";
  if (rivalScore > playerScore) return "Pierdes por puntuación final.";
  return "Empate por puntuación final.";
}

function renderLog(state) {
  const list = el("log-list");
  list.innerHTML = "";
  for (const entry of state.log.slice(0, 20)) {
    const li = document.createElement("li");
    li.textContent = entry.message;
    list.appendChild(li);
  }
}

export function renderGame(state) {
  renderModeLabel(state.mode);
  renderTimer(state.remainingSeconds ?? 0, state.mode);
  renderHp("player", state.player);
  renderHp("rival", state.rival);

  el("player-px").textContent = formatPx(state.player.px);
  el("rival-px").textContent = isExtraOwned(state.player, "radar") ? formatPx(state.rival.px) : "?";

  renderGenerator("player", state.player, state.economy);
  renderGenerator("rival", state.rival, state.economy);
  renderDome("player", state.player, state.economy);
  renderDome("rival", state.rival, state.economy);

  renderBombs(state);
  renderExtras(state);
  renderRivalExtras(state);
  renderRebirth(state);
  renderResultBanner(state);
  renderLog(state);

  const disable = state.isOver;
  document.querySelectorAll("#player-panel button, #rival-panel button").forEach((btn) => {
    if (disable) btn.disabled = true;
  });
}
