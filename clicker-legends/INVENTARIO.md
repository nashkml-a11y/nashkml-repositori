# Clicker Legends — Inventario funcional verificado

Fuente: `referencia/Clicker_Legends_TERMINADO.html` (8.174 líneas, 242.733 bytes).
Las referencias `L1234` apuntan a líneas de ese archivo.

Leyenda de fiabilidad:
- **[C]** Confirmado leyendo el código.
- **[E]** Confirmado además ejecutando el archivo en Chromium headless (Playwright).
- **[I]** Inferido (no ejecutado ni verificable al 100 %).

---

## 0. Hallazgos críticos sobre la versión final real

| # | Hallazgo | Evidencia | Estado |
|---|----------|-----------|--------|
| H1 | **El `render()` inicial revienta**: `renderStats()` llama a `auraById()` (L6209), que se define en un `<script>` posterior (L7153). Error `ReferenceError: auraById is not defined`. | Playwright: `PAGEERROR auraById is not defined` | [E] |
| H2 | Consecuencia de H1: al cargar, Mejoras, Racha, Huevos, Mundos, Misiones, Stats, Bestiario, Logros, Árbol, Tienda… quedan **vacíos** hasta la primera navegación (`page()`) o acción que llame a `render()`. | `eggList`, `worldList`, `missionList` con `innerHTML.length = 0` tras cargar | [E] |
| H3 | Consecuencia de H1: no se ejecuta el código posterior (L6961-6973): **ni la vuelta al Bosque fuera de temporada ni el aviso de temporada**. Hoy (octubre, Halloween activo) el aviso no aparece. | `seasonNoticeOverlay` ausente tras 1,5 s | [E] |
| H4 | **El bonus de Logros y el Turbo de clics x2 NO se aplican al clic real.** Solo se muestran en el HUD "Cada clic produce". `doClick()` (L3454) no los usa. | Con `achievementBonus=100` y turbo activo: clic real = 1, HUD = 4 | [E] |
| H5 | **La Auto-Apertura de 80 Tokens no desbloquea nada**: `startAutoEggSession` no comprueba `game.autoOpenEggs`; los botones "ABRIR AUTO" funcionan sin comprarla. | `autoOpenEggs` solo aparece en tienda/carga (L2723, 2831, 4879-5039) | [C] |
| H6 | **La suerte del Árbol (rama huevos) solo actúa si hay Suerte activa**: `rr = r − (suerte ? 0,18 : 0) × eggLuck`. Sin suerte, el árbol de huevos no hace nada. | L4110, L5893 | [C] |
| H7 | **El logro "Mascota de nivel 5" es inalcanzable**: ningún sistema crea mascotas de nivel > 0 (la fusión crea Doradas/Shiny, no sube nivel). | Única aparición de `l+1` es de presentación (L6330) | [C] |
| H8 | **Requisitos del siguiente mundo desincronizados**: el panel muestra `unlock` bruto (L6006), pero `travel()` exige `cl3WorldCost()` (hiperbólico). Ej.: panel 20 M vs real 22.471.959. | Valores calculados en ejecución | [E] |
| H9 | **Un Shiny de huevo entrega 2 unidades**: `claimEgg` siempre suma la normal y, si es Shiny, además una Shiny (L4291-4296). El control de inventario solo reserva 1 hueco. | L4291-4296 | [C] |
| H10 | **La Suerte de tokens (1 h) y la del orbe (10 min) se sobrescriben**: `cl2ActivateLuck` hace `luckUntil = ahora + X` (no acumula). Coger un orbe con 50 min de suerte restantes la reduce a 10 min. | L6061 | [C] |
| H11 | El Huevo gratis (30 Tokens) usa lógica de rareza distinta: ignora Suerte de anuncio y Árbol; suena `sfx("egg")` dos veces. | L4866-4875 | [C] |
| H12 | Eliminar mascota usa `confirm()` nativo, aunque el propio código dice que no es fiable en el visor (L3217-3220). | L3798, 3823, 3842 | [C] |
| H13 | Textos inexactos: Bestiario dice "25 mascotas" (hay 41); Ajustes dice "6 códigos" (hay 11); Recompensas de tiempo 5 h/10 h dicen "Huevo especial"/"Recompensa especial" pero dan Tokens. | L1356, L1429, L5194-5202 | [C] |
| H14 | El mundo 5 (Espacio) muestra como "siguiente mundo" al de Halloween (índice 5), que es estacional. | L5998-6006 | [C] |

---

## 1. Funciones sobrescritas y comportamiento final

| Función / dato | Versiones | Versión que manda | Comportamiento final |
|---|---|---|---|
| `applyButtonSkin` | L5049 (emoji) → L7236 (`skins-v2-engine`) → L7856 (`skins-v3-real-fix`, `window.applyButtonSkin`) | **v3** | Pone `data-skin`, `data-aura`, variables CSS de la skin; inserta `.clickSkinVisual` y `.clickAuraVisual`; vacía el emoji del botón. |
| `particles(colors)` | L5389 (emojis de `CLICK_EFFECTS.particles`, 4 uds.) → L7294 | **v2** | Partículas de forma CSS `skinFx-<id>`; 5 uds. (clásico) o 7 (resto). Los colores solo se usan con el efecto clásico. **El array `particles` de cada efecto es dato muerto.** |
| `renderSkins` | L5140 → L7276 | **v2** | Añade sección de Auras y bloqueo por temporada. |
| `skinCardHTML` | L5118 | **sin uso** | Sustituida por `skinCardHTML_V2`. |
| `redeemableCodes` | L2937 (6) + `CL2_CODES` L6980 (5) vía `Object.assign` | **11 códigos** | Ver §13. |
| `toggleAutoEggSession`, `tryAutoOpenEgg` | — | no-op | Legado. |
| `cl3EggAnimationStart/End`, `cl3RewardMessage` | L6993-7013 | sin uso | — |
| `cl2RenderCombo`, `cl2RenderCrit` | L6035, L6052 | no-op | Sus elementos (`cl2ComboTitle`, `cl2CritStatus`) no existen en el DOM. |
| `skinClicksBalance` | L5142, L7279 | no-op | El elemento no existe (se usa `skinClicksHud`). |
| Datos sin uso | `game.upgradeTree.branch`, `comboLevel`, `CL1_PRODUCTION_BUILD`, misión tipo `"pets"` | — | — |

Capas CSS (todas visuales, se sustituirán): base, `futuristic-theme`, `part3-visuals`, `clicker-legends-phase2`, `skins-v2-visuals`, `skins-v2-real-fix`, `halloween-visuals`, `season-textures-v2`, `big-special-skins`.

Temporizadores activos: tiempo de juego 1 s · auto-clicker 500 ms · autoguardado 5 s · requisitos 750 ms · combo/crit/suerte/tienda 500 ms · orbe dorado 180–420 s · scheduler visual 60 Hz.

---

## 2. Clic manual (`doClick`, L3454) [C][E]

Fórmula real:
```
clic = intensidad × combo × multMascotas × (1 + 0,10·permClics) × (1 + árbolClic%) × (1 + aura%) × (crítico ? 2 : 1)
```
- **No incluye**: bonus de Logros ni Turbo x2 (ver H4). El HUD sí los muestra.
- **Combo**: requiere desbloqueo (40.000 👆, por mundo). +1 si el clic llega < 2.500 ms después del anterior; máximo **x5**. Solo cuenta en Inicio; al salir de Inicio se congela el reloj (`page()`, L3269-3281).
- **Crítico**: requiere desbloqueo (4.000 👆, por mundo). **5 %**, ×2. Con Suerte activa (tokens u anuncio): 10 % (tope 15 %).
- **Bonus sorpresa**: 0,6 % por clic → `max(200, clic×15)`.
- Táctil: `touchstart` cuenta 1 clic por dedo (multitáctil), bloquea el clic sintético.
- Animación de botón: squash/stretch 380 ms.
- Floats: "💥 CRÍTICO +X", "+X 🔥" (combo), "👆 +X". Pool 24 floats / 32 partículas.

## 3. Mejoras por mundo (se reinician al renacer en ese mundo) [C]

| Mejora | Coste | Efecto |
|---|---|---|
| Intensidad | `floor(60 × 3^(nivel−1))` → 60, 180, 540, 1.620… | intensidad = nivel |
| Crítico | 4.000 (única compra) | 5 % ×2 |
| Combo | 40.000 (única compra) | hasta x5 |

## 4. Mascotas (41) [C]

`[nombre, rareza, multiplicador base, clase]`

**Base (25)**
| Emoji | Nombre | Rareza | Mult. |
|---|---|---|---|
| 🐶 | Perro | Común | 1,5 |
| 🐱 | Gato | Común | 2 |
| 🐰 | Conejo | Poco común | 2,5 |
| 🦊 | Zorro | Rara | 3 |
| 🦄 | Unicornio | Épica | 4 |
| 🐉 | Dragón | Legendaria | 6 |
| 🌈 | Ser Celestial | Mítica | 10 |
| 🦂 | Escorpión | Común | 7 |
| 🐍 | Serpiente | Poco común | 8 |
| 🦅 | Águila | Rara | 10 |
| 🐪 | Camello | Épica | 13 |
| 🐫 | Camello Dorado | Legendaria | 17 |
| 🐧 | Pingüino | Común | 20 |
| 🦭 | Foca | Poco común | 24 |
| 🐺 | Lobo | Rara | 30 |
| 🐻‍❄️ | Oso Polar | Épica | 40 |
| 🐲 | Dragón de Hielo | Legendaria | 55 |
| 🦎 | Lagarto | Común | 70 |
| 🔥 | Fénix | Épica | 100 |
| 👹 | Demonio | Legendaria | 150 |
| 🌋 | Titán Volcánico | Mítica | 250 |
| 👽 | Alien | Rara | 350 |
| 🛸 | OVNI | Épica | 500 |
| 🌌 | Nebulosa | Mítica | 750 |
| 🪐 | Planeta Viviente | Divina | 1.500 |

**Temporada (16)** — mismos valores en las 4 temporadas: Común 11 · Poco común 15 · Épica 21 · Legendaria 28
| Temporada | Común | Poco común | Épica | Legendaria |
|---|---|---|---|---|
| Halloween | 🐺👨 Hombre Lobo | 🧟 Zombie | 🧛 Vampiro | 🏺 Momia |
| Navidad | 🧊 Cubito de Hielo | ⛄ Muñeco de Nieve | 🦌 Reno | 🎅 Papá Noel |
| San Valentín | ❤️ Corazón | 🦢 Cisne | 🕯️ Vela | 👼 Cupido |
| Verano | 🏰 Castillo de Arena | ☀️ Sol | 💧 Gota de Agua | 🦈 Tiburón |

### Variantes y multiplicadores
```
normal  = base × 1,35^nivel × (1 + árbolMascotas%)      (nivel siempre 0 en la práctica, H7)
dorada  = normal × 2
shiny   = dorada × 1,5   (= normal × 3)
equipo  = producto de las 3 equipadas (máx. 3 unidades; se permiten copias repetidas)
```
- Claves: normal `🐶|||0`, dorada `🌟|||🐶|||0`, shiny `✨|||🐶|||0`.
- **Fusión**: 5 normales iguales → 1 Dorada; 5 Doradas iguales → 1 Shiny (prioriza normal→dorada). Cuenta `fusions`.
- **Shiny en huevo**: 3 % + árbol (pet3 +2 %, pet4 +3 %) = máx. 8 %. Entrega normal **y** shiny (H9).
- **Inventario**: máx. 50 (normales+doradas+shiny). Lleno → huevo se convierte en `max(100, intensidad×40)` 👆 y cuenta como huevo abierto.
- **Eliminar 1 copia** (no protegida ni equipada): `max(50, floor(intensidad × 25 × (nivel+1) × rarezaMult))` 👆; dorada ×2, shiny ×3,5. RarezaMult: común 1 · poco común 1,5 · rara 2,5 · épica 4 · legendaria 7 · mítica 12 · divina 20.
- Proteger 🔒 / Favorita ⭐ por clave.
- Orden (7): favoritas, mult ↓, mult ↑, nivel ↓, nivel ↑, "más raras" (idéntico a mult ↓), shiny primero.
- "Equipar mejores": top 3 unidades por multiplicador entre las tres variantes.
- Descubrimiento (Bestiario): solo cuenta tener copias **normales** (`syncPetDiscoveries`).

## 5. Huevos [C][E]

Cada huevo: 4 mascotas ordenadas de menor a mayor multiplicador (el índice 0 es el más probable).

**Probabilidades por índice (0/1/2/3)**
| Estado | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Normal | 55 % | 27 % | 14 % | 4 % |
| Suerte "x2" (tokens 1 h u orbe 10 min) | 30 % | 30 % | 25 % | 15 % |
| Suerte "x3" (anuncio 10 min; tiene prioridad) | 15 % | 25 % | 30 % | 30 % |

Con suerte activa, `r` se desplaza `0,18 × árbolHuevos` (máx. 0,072). Sin suerte, el árbol no influye (H6).

**Precio real** = `cl3EggCost` (hiperbólico; estacionales fijos 300 M):
| Mundo | Huevo | Nominal | **Real** | Mascotas (orden de prob.) |
|---|---|---|---|---|
| 🌳 Bosque | 🥚 Huevo del Bosque | 15.000 | **16.500** | 🐶 🐱 🐰 🦊 |
| | 🌟 Huevo Dorado | 300.000 | **363.075** | 🐰 🦊 🦄 🐉 |
| | 💎 Huevo Místico | 15.000.000 | **19.983.452** | 🦊 🦄 🐉 🌈 |
| 🏜️ Desierto | 🥚 Huevo del Desierto | 7.500.000 | **11.009.187** | 🦂 🐍 🦅 🐪 |
| | 🌟 Huevo Dorado | 150.000.000 | **242.941.649** | 🐍 🦅 🐪 🐫 |
| | 💎 Huevo Místico | 6.000.000.000 | **10.742.084.336** | 🐉 🦅 🌈 🐫 |
| ❄️ Hielo | 🥚 Huevo Glacial | 3 B | **5.951.514.916** | 🐧 🦭 🐺 🐻‍❄️ |
| | 🌟 Huevo Polar | 75 B | **165.365.484.174** | 🦭 🐺 🐻‍❄️ 🐲 |
| | 💎 Huevo Místico | 3 T | **7.379.072.411.577** | 🐉 🌈 🐺 🐲 |
| 🌋 Volcán | 🥚 Huevo Volcánico | 1,5 T | **4.134.859.261.850** | 🐉 🦎 🔥 👹 |
| | 🌟 Huevo de Magma | 30 T | **93.202.596.713.169** | 🐉 🐲 🔥 👹 |
| | 💎 Huevo Infernal | 1,5 Qa | **5.288.793.796.064.233** | 🐉 🌈 👹 🌋 |
| 🚀 Espacio | 🥚 Huevo Cósmico | 1,5 Qa | **6.054.467.341.243.673** | 👽 🛸 🌌 🪐 |
| | 🌟 Huevo Galáctico | 30 Qa | **140.142.431.262.378.430** | 🐲 🛸 🌌 🪐 |
| | 💎 Huevo Divino | 3 Qi | **16.448.809.938.508.233.000** | 🌈 🐲 🌌 🪐 |
| 🎃 Halloween | 🎃 Huevo Embrujado | 300 M | **300 M** | 🐺👨 🧟 🧛 🏺 |
| 🎄 Navidad | 🎄 Huevo Navideño | 300 M | **300 M** | 🧊 ⛄ 🦌 🎅 |
| 💝 San Valentín | 💝 Huevo del Amor | 300 M | **300 M** | ❤️ 🦢 🕯️ 👼 |
| ☀️ Verano | ☀️ Huevo de Verano | 300 M | **300 M** | 🏰 ☀️ 💧 🦈 |

Nota: en varios huevos "místicos" el 🌈 (x10) no es el más raro porque el orden es por multiplicador.

**Animación de apertura**: 3 sacudidas (0/250/500 ms), destello 760 ms, explosión 1.030 ms, revelación 1.450 ms con tarjeta de rareza (o Shiny).
**Auto-apertura** (por huevo, botón "ABRIR AUTO ×N"): N = huevos pagables con clics y hueco de inventario (≤ 9.999); abre uno a uno (850 ms de tarjeta + 280 ms de pausa), cancelable; se detiene por cancelar / sin clics / inventario lleno; resumen agrupado (emoji, nombre, shiny, ×cantidad, mult., total gastado, nº shinys).

## 6. Mundos [C][E]

Cada mundo guarda sus propios clics, intensidad, crítico, combo y mejor combo. Viajar no da Tokens.

| # | Mundo | Coste real (clics en el mundo anterior) | Nominal | Renac. | Mascota requerida |
|---|---|---|---|---|---|
| 0 | 🌳 Bosque | — | 0 | — | — |
| 1 | 🏜️ Desierto | **22.471.959** | 20 M | 2 | 🐉 Dragón |
| 2 | ❄️ Hielo | **10.103.264.355** | 8 B | 5 | 🐫 Camello Dorado |
| 3 | 🌋 Volcán | **5.684.058.673.256** | 4 T | 10 | 🐲 Dragón de Hielo |
| 4 | 🚀 Espacio | **3.203.748.407.598.519** | 2 Qa | 20 | 👹 Demonio |
| 5–8 | Estacionales | gratis durante su mes | 0 | — | — |

- "Mascota requerida" solo cuenta copias **normales**.
- Fórmula: `cl3HyperCost(base, n, g, 1,12) = max(base, floor(base × (1+g·n)^1,12 / max(0,18, 1−g·n)))`; mundos g=0,055 (n=índice), huevos g=0,045 (n=mundo×3+huevo+1), árbol g=0,065 (n=posición en la lista).

## 7. Temporadas [C]

Por mes del reloj del dispositivo:
| Temporada | Mes | Mundo / huevo | Skins botón (precio) | Efectos (precio) | Auras (precio, bonus) |
|---|---|---|---|---|---|
| 🎃 Halloween | Octubre | 🎃 Halloween / 300 M | Calavera (0), Fantasma (80 M), Calabaza (280 M) | Sangre (65 M), Caramelos (200 M) | Oscuridad (70 M, +20 %), Veneno (320 M, +40 %) |
| 🎄 Navidad | Diciembre | 🎄 Navidad / 300 M | Bola de Nieve (0), Galleta de Jengibre (80 M), Casa de Papá Noel (280 M) | Copos de Nieve (65 M), Estrellas (200 M) | Nieve (70 M, +20 %), Brillos (320 M, +40 %) |
| 💝 San Valentín | **Abril** | 💝 San Valentín / 300 M | Corazón (0), Bombón (80 M), Flor (280 M) | Corazones (65 M), Flechas (200 M) | Corazoncitos (70 M, +20 %), Chocolate Fundido (320 M, +40 %) |
| ☀️ Verano | Agosto | ☀️ Verano / 300 M | Sol (0), Arena (80 M), Agua (280 M) | Granos de arena (65 M), Gotas de Agua (200 M) | Agua (70 M, +20 %), Calor (320 M, +40 %) |

- Fuera de temporada: mundo bloqueado, contenido no comprable; lo ya comprado sigue usable; mascotas no descubiertas aparecen como "Exclusivo".
- Aviso de temporada una vez por año (roto por H3).

## 8. Renacimiento y Tokens [C]

- Coste: `500.000 × 10^renacimientos` clics del mundo actual.
- Tokens: `max(5, 5 + 3·renac + floor(log10(max(clics, coste)+1) × 2))`. Ej. primer renacimiento con 500 K → 16.
- Reinicia en el mundo actual: clics, intensidad, crítico, combo. Conserva mascotas, mundos, permanentes.
- **Mejora permanente "Más Clics"**: coste `5 + 5·nivel` Tokens, +10 % aditivo por nivel. (Crítico/Combo no tienen permanente.)

## 9. Árbol de mejoras (Tokens) [C][E]

Tres ramas independientes; todas comprables.
| Nodo | Efecto | Coste nominal | **Coste real** |
|---|---|---|---|
| click1 👆 Clic potente | +10 % clic | 5 | **6** |
| click2 ⚡ Clic mejorado | +15 % | 10 | **15** |
| click3 🔥 Clic experto | +25 % | 15 | **26** |
| click4 💥 Clic maestro | +40 % | 20 | **40** |
| egg1 🥚 Mejor incubadora | +5 % suerte huevos | 5 | **11** |
| egg2 🍀 Buscador de raros | +8 % | 10 | **27** |
| egg3 💎 Cazador de épicos | +12 % | 15 | **49** |
| egg4 🌟 Maestro de huevos | +15 % | 20 | **80** |
| pet1 🐾 Entrenamiento | +10 % mascotas | 5 | **25** |
| pet2 ✨ Entrenamiento brillante | +15 % | 10 | **64** |
| pet3 🌈 Cazador Shiny | +2 % shiny | 15 | **130** |
| pet4 💫 Maestro Shiny | +3 % shiny | 20 | **220** |

Totales: clic +90 %, huevos +40 %, mascotas +25 %, shiny +5 %. UI: lienzo 1200×900 con arrastre, zoom 0,35–1,35, rueda/pellizco, centrar, minimizar.

## 10. Tienda de Tokens y anuncios [C]

| Ítem | Coste | Efecto real |
|---|---|---|
| 🍀 Suerte x2 — 1 h | 20 ✨ | `luckUntil = ahora + 60 min` (sobrescribe, H10) |
| ⚡ Turbo de clics x2 — 15 min | 15 ✨ | acumula tiempo; **sin efecto real en el clic** (H4) |
| 🥚 Huevo gratis | 30 ✨ | huevo aleatorio del mundo actual (H11) |
| 🥚🤖 Auto-Apertura | 80 ✨ | marca bandera; **no desbloquea nada** (H5) |
| 📺 Suerte x3 — 10 min | anuncio | acumula; tabla de probabilidades x3 |
| 📺 Auto-Clicker x2 — 5 min | anuncio | requiere Auto-Clicker; intervalo ÷2; acumula |

Anuncio simulado: siempre éxito tras 1,5 s (`requestRewardedAd`, punto de integración de SDK).

## 11. Auto-Clicker (Tokens) [C]

- Desbloqueo 30 ✨ (deja intensidad y velocidad en nivel 1). Máx. nivel 10 cada una. Subir de L a L+1: `10 + 6·L` ✨ (16 … 64).
- Cantidad: `intensidad × multMascotas × (1+0,10·perm) × (0,15 + 0,10·(nivel−1))` → 15 %…105 %. No usa árbol, aura ni logros.
- Intervalo: `5000 − (nivel−1)·422,2` ms → 5,0 s … 1,2 s (÷2 con anuncio).
- Crítico automático: 1 % (20 % del 5 %) ×2. Combo automático: 15 % → `min(2, 1 + combo·0,12)`.

## 12. Progresión y recompensas [C]

**Racha diaria** (día = `((racha−1) mod 7)+1`; se pierde si falta un día; fecha UTC vía `toISOString`):
- Días 1–6: `floor(500 × 1,4^(día−1))` → 500, 700, 980, 1.372, 1.920, 2.689 👆.
- Día 7: `floor(40.000 × 1,5^min(semana,20))` 👆 + 10 ✨ (semana 1 → 60.000).

**Recompensas por tiempo activo** (cuenta si inactividad ≤ 60 s):
| Tiempo | Recompensa real |
|---|---|
| 5 min | 1.000 👆 |
| 15 min | 5.000 👆 |
| 30 min | 25.000 👆 |
| 1 h | 150.000 👆 |
| 2 h | 1.000.000 👆 |
| 5 h | 5 ✨ |
| 10 h | 15 ✨ |
| 25 h | 50 ✨ |

**Misiones (13)**
| id | Nombre | Objetivo | Recompensa |
|---|---|---|---|
| clicks1 | Primeros pasos | 1.000 clics totales | 5.000 👆 |
| clicks2 | Máquina de clics | 100.000 | 100.000 👆 |
| clicks3 | Clicker profesional | 10.000.000 | 100.000 👆 |
| eggs1 | Coleccionista | 3 huevos | 100.000 👆 |
| eggs2 | Abridor experto | 10 huevos | 100.000 👆 |
| fuse1 | ¡A fusionar! | 1 fusión | 100.000 👆 |
| fuse2 | Maestro de fusiones | 5 fusiones | 100.000 👆 |
| rebirth1 | Renacer | 1 renac. | 100.000 👆 |
| rebirth2 | Renacimientos | 5 renac. | 100.000 👆 |
| time1 | Quédate un rato | 600 s | 100.000 👆 |
| time2 | Jugador dedicado | 3.600 s | 100.000 👆 |
| streak1 | Constancia | racha 3 | 100.000 👆 |
| streak2 | Racha de una semana | racha 7 | 100.000 👆 |

**Logros (8)** — recompensa: % permanente de clic (que hoy no se aplica, H4)
| id | Nombre | Objetivo | Bonus |
|---|---|---|---|
| a_clicks_100k | Cien mil | 100.000 clics | +2 % |
| a_clicks_1m | Millonario | 1.000.000 clics | +2 % |
| a_eggs_50 | Abridor experto | 50 huevos | +2 % |
| a_fusions_10 | Fusionador | 10 fusiones | +2 % |
| a_rebirths_5 | Renacido | 5 renac. | +2 % |
| a_pets_10 | Coleccionista | 10 especies descubiertas | +2 % |
| a_pet_level_5 | Mascota de nivel 5 | nivel 5 | +3 % (inalcanzable, H7) |
| a_time_1h | Una hora | 3.600 s | +2 % |

**Hitos** (clics totales): 1 M, 1 B, 1 T, 1 Qa → confeti (28 piezas) + fanfarria de renacer + aviso.

**Orbe dorado 🍀**: aparece cada 180–420 s, dura 9 s; al tocar: Suerte x2 10 min (sobrescribe, H10) + `max(1.000, 5 % de los clics del mundo)`.

## 13. Códigos (11, un uso cada uno; se escriben en mayúsculas) [E]
WELCOME (+5.000 👆) · LEAP POWER (+1.000.000 👆) · LUCKY (+250.000 👆, +5 ✨) · PET LOVER (+1 🐶) · EGG HUNT (+1 mascota aleatoria del Huevo del Bosque) · REBIRTH (+25 ✨) · CLICK5K (+5.000 👆) · PETBUDDY (+1 🐰) · BOOST25K (+25.000 👆) · CATFRIEND (+1 🐱) · HATCH100K (+100.000 👆).

## 14. Personalización [C]

**Skins de botón (24)** — normales: Clásico 0 · Moneda 10 K · Diamante 50 K · Fuego 100 K · Hielo 250 K · Rayo 500 K · Galaxia 2,5 M · Lava 10 M · Arcoíris 50 M · Alien 250 M · Portal 1 B · Corona 10 B; + 12 de temporada (§7). Solo estéticas.

**Efectos de clic (18)** — Clásico 0 · Explosión 25 K · Estrellas 75 K · Llamas 200 K · Nieve 500 K · Cristales 1,5 M · Monedas 5 M · Arcoíris 20 M · Portal 100 M · Electricidad 500 M; + 8 de temporada. Solo estéticos.

**Auras (18)** — con bonus de clic: Sin aura 0 (0 %) · Fuego 100 K (+2 %) · Glacial 250 K (+5 %) · Eléctrica 750 K (+10 %) · Galáctica 3 M (+16 %) · Tóxica 15 M (+24 %) · Arcoíris 75 M (+34 %) · Vacío 300 M (+45 %) · Cósmica 1,5 B (+57 %) · Real 15 B (+70 %); + 8 de temporada.

Todo se paga con clics del mundo actual.

## 15. Sonido (Web Audio sintetizado) [C]

| Evento | sfx | Composición |
|---|---|---|
| Crítico | `crit` | 880 Hz + 1.320 Hz triangle |
| Fusión | `fuse` | arpegio 520/780/1.040 + acorde |
| Revelar huevo | `egg` | 440/660 square + acorde saw |
| Reclamar, bonus, comprar skin | `claim` | Do-Mi-Sol + acorde |
| Mundo, árbol, tienda, shiny, orbe | `unlock` | fanfarria saw + golpe grave |
| Renacer, hitos | `rebirth` | swell + arpegio + acorde + golpe |
| Código, equipar skin/aura | `code` | chispa doble |
Interruptor de sonido persistente (`soundEnabled`).

## 16. Interfaz y flujo [C]

- 12 secciones: Inicio, Mascotas, Huevos, Mundos, Renacer, Misiones, Stats, Bestiario, Logros, Árbol, Skins, Ajustes.
- Inicio: clics del mundo (abreviado y exacto), nombre del mundo, estado de suerte, botón, poder por clic, 4 stats, racha con semana, tiempo jugado/activo, recompensas de tiempo, mejoras.
- Estadísticas: racha, tiempo, clics totales, críticos, huevos, fusiones, mejor combo (mundo actual), renacimientos, mult. mascotas.
- Modales: GDPR (personalizados / no personalizados), confirmación propia, aviso de temporada, apertura de huevo, resumen de auto-apertura, toasts 1,8 s.
- Formato de números: K, M, B, T, Qa, Qi, Sx, Sp, Oc (2/1/0 decimales).

## 17. Guardado e integridad [C]

- `localStorage`: `CLICK_WORLDS_FINAL` (partida), `CLICK_WORLDS_FINAL_BACKUP` + `CLICK_WORLDS_FINAL_INTEGRITY` (hash FNV-1a con sal `CL1-INTEGRITY-2026-v1` de totalClicks, tokens, petsDiscovered, pets), `CL_GDPR_CONSENT`.
- Autoguardado cada 5 s; guardado manual con aviso.
- Si el hash no cuadra → restaura los campos críticos de la copia.
- Borrar partida (conserva consentimiento) / Eliminar cuenta y datos (borra también consentimiento).
