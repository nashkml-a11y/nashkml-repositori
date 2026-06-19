'use strict';

// ─── GameState central ────────────────────────────────────────────────────────
const gameState = {
  points:             0,
  totalPoints:        0,
  totalClicks:        0,
  baseClickValue:     1,
  clickMultiplier:    1,
  rebirthMultiplier:  1,
  currentWorld:       1,
  playTime:           0,   // segundos jugados

  // Reservados para fases futuras
  generators:   [],
  upgrades:     [],
  achievements: [],
  missions:     []
};

// ─── Economía ─────────────────────────────────────────────────────────────────

/** Puntos que otorga un click manual. */
function getPointsPerClick() {
  return gameState.baseClickValue
    * gameState.clickMultiplier
    * gameState.rebirthMultiplier;
}

/**
 * Puntos generados automáticamente por segundo.
 * En fases futuras sumará la producción de todos los generadores.
 */
function getPointsPerSecond() {
  let pps = 0;
  for (const gen of gameState.generators) {
    if (gen.owned > 0) {
      // producción por ciclo / velocidad en segundos
      pps += (gen.owned * gen.power * gen.level) / gen.speed;
    }
  }
  return pps;
}

/** Añade puntos al estado, acumulando también el total histórico. */
function addPoints(amount) {
  gameState.points      += amount;
  gameState.totalPoints += amount;
}

// ─── Interacción ─────────────────────────────────────────────────────────────

/** Gestiona cada click manual del jugador. */
function handleClick(event) {
  const earned = getPointsPerClick();
  addPoints(earned);
  gameState.totalClicks++;
  spawnFloatText(event, earned);
  updateUI();
}

// ─── UI ──────────────────────────────────────────────────────────────────────

/** Actualiza todos los elementos del DOM con el estado actual. */
function updateUI() {
  const ppc = getPointsPerClick();
  const pps = getPointsPerSecond();

  setText('points',           formatNumber(gameState.points));
  setText('total-points',     formatNumber(gameState.totalPoints));
  setText('points-per-click', formatNumber(ppc));
  setText('points-per-second',formatNumber(pps));
  setText('total-clicks',     formatNumber(gameState.totalClicks));
  setText('current-world',    gameState.currentWorld);
  setText('play-time',        formatTime(gameState.playTime));
  setText('hint-ppc',         formatNumber(ppc));
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ─── Texto flotante ──────────────────────────────────────────────────────────

/**
 * Muestra "+N puntos" flotando desde donde hizo click el jugador.
 * El contenedor ya es position:relative sobre el botón.
 */
function spawnFloatText(event, amount) {
  const container = document.getElementById('float-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const el = document.createElement('span');
  el.className = 'float-text';
  el.textContent = '+' + formatNumber(amount);
  el.style.left = x + 'px';
  el.style.top  = y + 'px';

  container.appendChild(el);
  // Eliminar el nodo cuando acabe la animación para no acumular DOM
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// ─── Game loop ────────────────────────────────────────────────────────────────

/**
 * Tick principal (cada segundo).
 * Incrementa el tiempo jugado y la producción automática.
 */
function gameLoop() {
  gameState.playTime++;

  // Producción automática de generadores (Fase 3+)
  const pps = getPointsPerSecond();
  if (pps > 0) {
    addPoints(pps);
  }

  updateUI();
}

// ─── Formato de números ───────────────────────────────────────────────────────

/** Abrevia números grandes: 1.5K, 2.3M, 4.1B, 1.0T … */
function formatNumber(n) {
  if (!isFinite(n) || n < 0) return '0';
  if (n >= 1e15) return (n / 1e15).toFixed(1) + 'Qa';
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(1)  + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(1)  + 'M';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return Math.floor(n).toString();
}

/** Convierte segundos en "Xh Ym Zs". */
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
}

// ─── Inicialización ───────────────────────────────────────────────────────────

function init() {
  const btn = document.getElementById('main-click-btn');
  if (btn) btn.addEventListener('click', handleClick);

  updateUI();
  setInterval(gameLoop, 1000);
}

document.addEventListener('DOMContentLoaded', init);
