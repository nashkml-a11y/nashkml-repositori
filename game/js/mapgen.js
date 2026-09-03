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
const WATER_BAND = 20; // ancho aproximado del canal de agua entre costas
const OUTER_MARGIN_BAND = 22; // banda de agua media en el borde exterior del mapa
const OUTER_MARGIN_NOISE_AMPLITUDE = 32; // cuánto ondula esa banda: la costa exterior no es una línea recta
const CONQUEST_PERTURB = 0.55; // fuerza del ruido de frontera de las islas de conquista
const CHAIKIN_ITERATIONS = 2;

const CONQUEST_PLACEMENT_RADIUS = MAP_SIZE * 0.29;
// Rango de partida bien amplio para que unas islas salgan claramente más
// grandes que otras; el tamaño mínimo real se garantiza aparte (ver
// MIN_ISLAND_AREA_FRACTION) ajustando este "bias" isla a isla si hace falta.
const CONQUEST_BIAS_RANGE = [0.55, 1.6];
// Ninguna isla de conquista puede quedar por debajo de 1/8 de la superficie
// total del mapa, aunque el reparto aleatorio sea muy desigual.
const MIN_ISLAND_AREA_FRACTION = 1 / 8;
const BIAS_ADJUST_ITERATIONS = 30;
const BIAS_SHRINK_FACTOR = 0.88;

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

// Ruido 2D simple (suma de senos con frecuencias/fases aleatorias, no
// relacionadas entre sí) usado para ondular la costa exterior del mapa:
// así el litoral que da al mar abierto tampoco es una línea recta.
function makeNoise2D(rng, octaves = 4) {
  const terms = [];
  for (let i = 0; i < octaves; i++) {
    const freq = 0.011 * Math.pow(1.9, i);
    terms.push({
      freqX: freq * (0.7 + rng() * 0.6),
      freqY: freq * (0.7 + rng() * 0.6),
      phase: rng() * Math.PI * 2,
      amplitude: Math.pow(0.55, i),
    });
  }
  const ampSum = terms.reduce((sum, t) => sum + t.amplitude, 0);
  return function noise2D(x, y) {
    let v = 0;
    for (const t of terms) v += t.amplitude * Math.sin(x * t.freqX + y * t.freqY + t.phase);
    return v / ampSum; // aprox. en [-1, 1]
  };
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

function buildConquestSeeds(rng) {
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
// los del margen exterior del mapa también quedan como agua/reservados. El
// margen exterior se ondula con ruido 2D: la costa que da al mar abierto no
// es una línea recta, como el resto de las costas del mapa.
function classifyGrid(seeds, fixedIsland, edgeNoise) {
  const cellSize = MAP_SIZE / GRID_N;
  const N1 = GRID_N + 1;
  const owner = new Int8Array(N1 * N1).fill(-1);

  for (let j = 0; j < N1; j++) {
    for (let i = 0; i < N1; i++) {
      const x = i * cellSize;
      const y = j * cellSize;
      const idx = j * N1 + i;

      const distToEdge = Math.min(x, y, MAP_SIZE - x, MAP_SIZE - y);
      const noisyMargin = OUTER_MARGIN_BAND + OUTER_MARGIN_NOISE_AMPLITUDE * edgeNoise(x, y);
      if (distToEdge < Math.max(10, noisyMargin)) {
        continue; // agua: costa exterior (ondulada, no un corte recto)
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

// Cuenta cuántas celdas de la rejilla pertenecen a cada isla y las traduce
// a área aproximada, para poder comprobar el tamaño mínimo antes de hacer
// el trazado (caro) de contornos.
function computeGridAreas(owner, cellSize, seedCount) {
  const cellArea = cellSize * cellSize;
  const counts = new Array(seedCount).fill(0);
  for (let k = 0; k < owner.length; k++) {
    if (owner[k] >= 0) counts[owner[k]]++;
  }
  return counts.map((c) => c * cellArea);
}

// Ajusta iterativamente el "bias" de cada isla (cuánto territorio reclama
// en el reparto tipo Voronoi) hasta que ninguna quede por debajo del
// tamaño mínimo exigido (1/8 del mapa). Bajar el bias hace que una isla
// reclame más celdas vecinas; es un ajuste local, así que unas pocas
// iteraciones bastan para converger en la práctica.
function enforceMinimumIslandSize(seeds, fixedIsland, edgeNoise) {
  // Se exige un poco más que el mínimo real: el suavizado de Chaikin que se
  // aplica después recorta ligeramente las esquinas y reduce el área final.
  const minArea = MAP_SIZE * MAP_SIZE * MIN_ISLAND_AREA_FRACTION * 1.08;
  let classification = classifyGrid(seeds, fixedIsland, edgeNoise);

  for (let iter = 0; iter < BIAS_ADJUST_ITERATIONS; iter++) {
    const areas = computeGridAreas(classification.owner, classification.cellSize, seeds.length);
    const tooSmall = areas
      .map((area, index) => ({ area, index }))
      .filter((entry) => entry.area < minArea);
    if (tooSmall.length === 0) break;
    for (const { index } of tooSmall) {
      seeds[index].bias *= BIAS_SHRINK_FACTOR;
    }
    classification = classifyGrid(seeds, fixedIsland, edgeNoise);
  }

  return classification;
}

function buildConquestIslands(matchSeed, fixedIsland) {
  const rng = mulberry32(matchSeed);
  const seeds = buildConquestSeeds(rng);
  const edgeNoise = makeNoise2D(rng);
  const { owner, N1, cellSize } = enforceMinimumIslandSize(seeds, fixedIsland, edgeNoise);

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
