// mapgen.js
// Generación procedural del mapa: 5 islas de forma orgánica (como continentes
// vistos desde arriba) que entre todas ocupan prácticamente el mapa entero,
// separadas sólo por canales de agua estrechos.
//
//  - 1 isla FIJA: siempre el mismo tamaño, la misma forma y la misma
//    posición en cualquier partida (semilla constante). Es donde se coloca
//    el Generador.
//  - 4 islas de CONQUISTA: se generan repartiéndose (a la manera de un
//    diagrama de Voronoi con fronteras ruidosas, no rectas) TODO el espacio
//    del mapa que deja libre la isla fija, de forma que entre las 5 islas
//    cubren casi la totalidad de la superficie. El agua queda reducida a
//    los canales mínimos entre costas y un margen exterior estrecho.
//  - Dentro de una partida, las 4 islas de conquista son las mismas para
//    todos los jugadores (se generan a partir de un único "matchSeed").

const FIXED_ISLAND_SEED = 1337; // semilla constante -> la isla del generador es siempre igual
const MAP_SIZE = 1600;
const MAP_CENTER = { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };

const FIXED_ISLAND_RADIUS = 260;
const FIXED_ISLAND_PERTURB = 0.3;

const GRID_N = 170; // resolución de la rejilla de clasificación (celdas por lado)
const WATER_BAND = 24; // ancho aproximado del canal de agua entre costas
const OUTER_MARGIN_BAND = 36; // banda de agua en el borde exterior del mapa
const CONQUEST_PERTURB = 0.55; // fuerza del ruido de frontera de las islas de conquista
const CHAIKIN_ITERATIONS = 2;

const CONQUEST_PLACEMENT_RADIUS = MAP_SIZE * 0.29;
const CONQUEST_BIAS_RANGE = [0.85, 1.15];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMatchSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

// Varios armónicos de frecuencias no relacionadas (evita patrones repetidos),
// con más peso en las bajas (silueta general) y menos en las altas (calas,
// penínsulas). La amplitud se normaliza para que la suma sea EXACTAMENTE
// totalAmplitude, así el resultado nunca supera un factor conocido.
function randomHarmonics(rng, totalAmplitude) {
  const freqs = [2, 3, 5, 8, 13];
  const baseWeights = [0.3, 0.25, 0.2, 0.15, 0.1];
  const raw = freqs.map((frequency, i) => ({
    frequency,
    amplitude: baseWeights[i] * (0.5 + rng()),
    phase: rng() * Math.PI * 2,
  }));
  const rawSum = raw.reduce((sum, h) => sum + h.amplitude, 0);
  const scale = totalAmplitude / rawSum;
  return raw.map((h) => ({ ...h, amplitude: h.amplitude * scale }));
}

function harmonicFactor(harmonics, angle) {
  let factor = 1;
  for (const h of harmonics) {
    factor += h.amplitude * Math.sin(h.frequency * angle + h.phase);
  }
  return factor;
}

function buildCirclePolygon(center, baseRadius, harmonics, steps = 110) {
  const points = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const r = baseRadius * harmonicFactor(harmonics, angle);
    points.push({ x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) });
  }
  return points;
}

// Convierte una lista de puntos en una curva suave cerrada (Catmull-Rom ->
// Bézier) para que la costa parezca orgánica y no un polígono anguloso.
function polygonToSmoothPath(points) {
  const n = points.length;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} `;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
  }
  d += "Z";
  return d;
}

// Área de un polígono cerrado (fórmula del shoelace).
export function polygonArea(points) {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area) / 2;
}

// --- Isla fija (Generador) --------------------------------------------

function buildFixedIsland() {
  const rng = mulberry32(FIXED_ISLAND_SEED);
  const harmonics = randomHarmonics(rng, FIXED_ISLAND_PERTURB);
  const polygon = buildCirclePolygon(MAP_CENTER, FIXED_ISLAND_RADIUS, harmonics);
  return {
    id: "generatorIsland",
    kind: "fixed",
    role: "generator",
    center: MAP_CENTER,
    baseRadius: FIXED_ISLAND_RADIUS,
    harmonics,
    polygon,
    path: polygonToSmoothPath(polygon),
  };
}

function fixedIslandRadiusAt(fixedIsland, angle) {
  return fixedIsland.baseRadius * harmonicFactor(fixedIsland.harmonics, angle);
}

// --- Islas de conquista (Voronoi orgánico sobre el resto del mapa) -----

function buildConquestSeeds(matchSeed) {
  const rng = mulberry32(matchSeed);
  const baseAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
  return baseAngles.map((baseAngle, index) => {
    const angle = baseAngle + (rng() - 0.5) * (Math.PI / 6);
    const radius = CONQUEST_PLACEMENT_RADIUS * (0.85 + rng() * 0.3);
    const [minBias, maxBias] = CONQUEST_BIAS_RANGE;
    return {
      id: `island${index + 1}`,
      kind: "conquest",
      role: "territory",
      center: {
        x: MAP_CENTER.x + Math.cos(angle) * radius,
        y: MAP_CENTER.y + Math.sin(angle) * radius,
      },
      bias: minBias + rng() * (maxBias - minBias),
      harmonics: randomHarmonics(rng, CONQUEST_PERTURB),
    };
  });
}

function effectiveDistance(seed, x, y) {
  const dx = x - seed.center.x;
  const dy = y - seed.center.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const factor = harmonicFactor(seed.harmonics, angle);
  return (dist / factor) * seed.bias;
}

// Clasifica cada punto de la rejilla: -1 = agua, 0-3 = índice de isla de
// conquista más cercana. Los puntos dentro (o muy cerca) de la isla fija y
// los del margen exterior del mapa también quedan como agua/reservados.
function classifyGrid(seeds, fixedIsland) {
  const cellSize = MAP_SIZE / GRID_N;
  const N1 = GRID_N + 1;
  const owner = new Int8Array(N1 * N1).fill(-1);

  for (let j = 0; j < N1; j++) {
    for (let i = 0; i < N1; i++) {
      const x = i * cellSize;
      const y = j * cellSize;
      const idx = j * N1 + i;

      if (
        x < OUTER_MARGIN_BAND ||
        y < OUTER_MARGIN_BAND ||
        x > MAP_SIZE - OUTER_MARGIN_BAND ||
        y > MAP_SIZE - OUTER_MARGIN_BAND
      ) {
        continue; // agua: margen exterior
      }

      const dxFixed = x - fixedIsland.center.x;
      const dyFixed = y - fixedIsland.center.y;
      const distFixed = Math.hypot(dxFixed, dyFixed);
      const angleFixed = Math.atan2(dyFixed, dxFixed);
      if (distFixed < fixedIslandRadiusAt(fixedIsland, angleFixed) + WATER_BAND) {
        continue; // agua: reservado alrededor de la isla fija
      }

      let bestIndex = -1;
      let bestDist = Infinity;
      let secondDist = Infinity;
      for (let s = 0; s < seeds.length; s++) {
        const d = effectiveDistance(seeds[s], x, y);
        if (d < bestDist) {
          secondDist = bestDist;
          bestDist = d;
          bestIndex = s;
        } else if (d < secondDist) {
          secondDist = d;
        }
      }
      owner[idx] = secondDist - bestDist < WATER_BAND ? -1 : bestIndex;
    }
  }

  return { owner, N1, cellSize };
}

// --- Marching squares: extrae el contorno de una máscara binaria -------

function marchingSquaresSegments(owner, N1, cellSize, islandIndex) {
  const segments = [];
  const val = (i, j) => (owner[j * N1 + i] === islandIndex ? 1 : 0);

  for (let j = 0; j < N1 - 1; j++) {
    for (let i = 0; i < N1 - 1; i++) {
      const tl = val(i, j);
      const tr = val(i + 1, j);
      const br = val(i + 1, j + 1);
      const bl = val(i, j + 1);
      const caseIndex = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (caseIndex === 0 || caseIndex === 15) continue;

      const x0 = i * cellSize;
      const y0 = j * cellSize;
      const x1 = (i + 1) * cellSize;
      const y1 = (j + 1) * cellSize;
      const top = { x: (x0 + x1) / 2, y: y0 };
      const bottom = { x: (x0 + x1) / 2, y: y1 };
      const left = { x: x0, y: (y0 + y1) / 2 };
      const right = { x: x1, y: (y0 + y1) / 2 };

      const table = {
        1: [[left, bottom]],
        2: [[bottom, right]],
        3: [[left, right]],
        4: [[top, right]],
        5: [
          [top, right],
          [left, bottom],
        ],
        6: [[top, bottom]],
        7: [[top, left]],
        8: [[top, left]],
        9: [[top, bottom]],
        10: [
          [top, left],
          [bottom, right],
        ],
        11: [[top, right]],
        12: [[left, right]],
        13: [[bottom, right]],
        14: [[left, bottom]],
      };
      for (const [a, b] of table[caseIndex]) segments.push([a, b]);
    }
  }
  return segments;
}

function pointKey(p) {
  return `${p.x.toFixed(3)}_${p.y.toFixed(3)}`;
}

// Une los segmentos de marching squares en uno o varios bucles cerrados.
function stitchLoops(segments) {
  const pointByKey = new Map();
  const adjacency = new Map();
  for (const [a, b] of segments) {
    const ka = pointKey(a);
    const kb = pointKey(b);
    pointByKey.set(ka, a);
    pointByKey.set(kb, b);
    if (!adjacency.has(ka)) adjacency.set(ka, []);
    if (!adjacency.has(kb)) adjacency.set(kb, []);
    adjacency.get(ka).push(kb);
    adjacency.get(kb).push(ka);
  }

  const visited = new Set();
  const loops = [];

  for (const [a] of segments) {
    const startKey = pointKey(a);
    if (visited.has(startKey)) continue;

    const loopPoints = [];
    let prevKey = null;
    let currKey = startKey;
    let guard = 0;
    while (guard < N_GUARD) {
      guard++;
      if (visited.has(currKey)) break;
      visited.add(currKey);
      loopPoints.push(pointByKey.get(currKey));
      const neighbors = adjacency.get(currKey) || [];
      const nextKey = neighbors.find((k) => k !== prevKey && !visited.has(k)) ?? neighbors.find((k) => k !== prevKey);
      if (nextKey == null) break;
      prevKey = currKey;
      currKey = nextKey;
      if (currKey === startKey) break;
    }
    if (loopPoints.length >= 3) loops.push(loopPoints);
  }

  return loops;
}
const N_GUARD = 200000;

function chaikinSmooth(points, iterations) {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    const next = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % n];
      next.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
      next.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
    }
    pts = next;
  }
  return pts;
}

function polygonToLinePath(points) {
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} `;
  for (let i = 1; i < points.length; i++) {
    d += `L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} `;
  }
  d += "Z";
  return d;
}

function buildConquestIslands(matchSeed, fixedIsland) {
  const seeds = buildConquestSeeds(matchSeed);
  const { owner, N1, cellSize } = classifyGrid(seeds, fixedIsland);

  return seeds.map((seed, index) => {
    const segments = marchingSquaresSegments(owner, N1, cellSize, index);
    const loops = stitchLoops(segments);
    const mainLoop = loops.reduce(
      (best, loop) => (polygonArea(loop) > polygonArea(best) ? loop : best),
      loops[0] || []
    );
    const decimated = mainLoop.length > 60 ? mainLoop.filter((_, i) => i % 2 === 0) : mainLoop;
    const smoothed = decimated.length >= 3 ? chaikinSmooth(decimated, CHAIKIN_ITERATIONS) : [];
    const polygon = smoothed.length >= 3 ? smoothed : buildCirclePolygon(seed.center, 80, seed.harmonics);
    return {
      id: seed.id,
      kind: "conquest",
      role: "territory",
      center: seed.center,
      polygon,
      path: polygonToLinePath(polygon),
    };
  });
}

/**
 * Genera el mapa completo de una partida: 1 isla fija (generador, siempre
 * idéntica) + 4 islas de conquista orgánicas y aleatorias que se reparten
 * TODO el resto del mapa, separadas sólo por canales estrechos de agua.
 * @param {number} matchSeed semilla de la partida (misma semilla = mismo mapa)
 */
export function generateMap(matchSeed) {
  const fixedIsland = buildFixedIsland();
  const conquestIslands = buildConquestIslands(matchSeed, fixedIsland);
  const islands = [fixedIsland, ...conquestIslands];

  const landArea = islands.reduce((sum, island) => sum + polygonArea(island.polygon), 0);
  const landFraction = landArea / (MAP_SIZE * MAP_SIZE);

  return { seed: matchSeed, width: MAP_SIZE, height: MAP_SIZE, islands, landFraction };
}
