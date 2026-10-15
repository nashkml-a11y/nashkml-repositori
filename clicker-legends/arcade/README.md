# Clicker Legends — Edición Arcade

Rediseño visual en pixel art de 16 bits de `referencia/Clicker_Legends_TERMINADO.html`.
**Las mecánicas no cambian:** la lógica del juego es una copia literal del original.

- Juego: `dist/Clicker_Legends_Arcade.html`. Es un único archivo de unos 1,1 MB, funciona sin conexión y no depende de nada externo.
- Inventario funcional del original: `../INVENTARIO.md`.

## Cómo se garantiza que la jugabilidad es la misma

1. `tools/make_core.py` copia literalmente el `<script>` principal del original y elimina solo 36 funciones de presentación: render, efectos, sonido, avisos, animación del huevo y los tres `confirm()`. La lista eliminada queda en `tools/core.removed.txt`.
2. Las fórmulas, costes, probabilidades, temporizadores y el guardado se ejecutan con el código original. Los datos de auras y los códigos extra también se extraen del original.
3. La capa visual no llama nunca a `Math.random()`: usa su propio generador (`fxRand`). Así, la secuencia aleatoria de críticos, huevos, shiny y bonus es idéntica a la del original.
4. `tests/equivalence.mjs` ejecuta las mismas 65 acciones en el original y en la versión arcade. Usa el mismo `Math.random` sembrado y el reloj congelado, y compara el objeto `game` completo tras cada paso. Cubre clics, combo, crítico, huevos, suerte (x2, x3 y árbol), shiny, fusiones, equipo, tienda, árbol, permanentes, auto-clicker, renacer, viajes, temporadas, misiones, logros, códigos, racha, tiempo, skins, auras, borrado de mascotas, orbe, auto-apertura, inventario lleno y guardado. Además carga una partida del original en la versión arcade.
   Resultado actual: **66/66 pasos idénticos**.

## Diferencias respecto al original (todas de presentación)

| Cambio | Motivo |
|---|---|
| El juego ya **no da error al arrancar** (`auraById is not defined`). | Los scripts se ensamblan en un solo bloque. Por eso ahora sí se ejecutan dos cosas que el original tenía escritas pero que nunca llegaban a correr: el **aviso de temporada** y la **vuelta al Bosque** cuando el mundo de temporada está fuera de su mes. |
| Si el visor bloquea `localStorage` (iframes aislados, vista previa de archivos), se usa un almacenamiento en memoria y se avisa de que la partida no se guardará. | El original se detenía al arrancar en esos visores (título sin respuesta). Con almacenamiento normal no cambia nada. |
| Eliminar mascota usa un modal arcade en vez de `confirm()`. | El propio original avisaba de que `confirm()` no funciona en algunos visores. Dentro del modal se vuelve a comprobar que la copia sigue existiendo antes de borrarla. |
| El aviso de temporada espera a que se cierre la pantalla de título. | Evita solaparse con ella. |
| Espacio o Intro equivalen a pulsar el botón en Inicio (se ignora la autorrepetición del teclado); Esc cierra menús. | Manejo de recreativa en escritorio. Ejecuta el mismo `doClick()`. |
| Barra inferior con 6 secciones + menú **Más** para las otras 6. | Sigue la maqueta; las secciones son las mismas 12. |
| Bestiario con filtro por mundo de origen (mundo donde aparece la mascota por primera vez). | Sigue la maqueta; solo filtra lo que se muestra. |
| Elementos visuales nuevos que **leen** el estado sin modificarlo: pantalla de título, equipo actual, medidor y temporizador de combo, celebraciones (combo x5, renacer, mundo nuevo, fusión), música por mundo con su propio interruptor (guardado en `CL_ARCADE_MUSIC`, fuera de la partida). | Presentación arcade. |

### Correcciones de errores del original (a petición del autor)

Están todas en `tools/fixes.py`: sustituciones de texto exactas sobre el original, cada una marcada `[F…]` en el código generado. `tests/fixes.mjs` comprueba cada una (22/22) y `tests/equivalence.mjs` compara la versión arcade con *el original más estas mismas correcciones* (66/66).

| Id | Corrección |
|---|---|
| F1 | La racha diaria, las misiones, las recompensas por tiempo y los códigos de clics también suman a **Clics totales** (antes solo al contador del mundo). |
| F2 | El bonus de **Logros** y el **Turbo x2** se aplican al clic real. Antes solo aparecían en «Cada clic produce». |
| F3 | La **Auto-Apertura** (80 Tokens) es necesaria para abrir huevos en automático. Antes se cobraba sin efecto y la función era gratis. |
| F4 | La suerte del **Árbol** (rama huevos) funciona siempre, no solo con Suerte activa. |
| F5 | El **Huevo gratis** usa la misma suerte que los demás (Suerte x3 y Árbol). |
| F6 | La **Suerte x2** se acumula. Antes el orbe dorado podía dejar 1 h comprada en 10 min. |
| F7 | Un **Shiny** de huevo da 1 mascota Shiny. Antes daba además una normal y ocupaba 2 huecos. |
| F8 | Las mascotas **Doradas o Shiny** cuentan para los requisitos de mundo y para el Bestiario. |
| F9 | La **racha diaria** usa la fecha local. Antes usaba la UTC y el día cambiaba de madrugada. |
| F10 | Las recompensas por tiempo de 5 h, 10 h y 25 h muestran los Tokens que dan realmente. |
| U1 | El panel de requisitos muestra el coste real del siguiente mundo y no propone mundos de temporada. |
| U3 | El Bestiario cuenta las copias Doradas y Shiny como copias actuales. |

Sin corregir, porque requieren una decisión de diseño: el logro «Mascota de nivel 5» es inalcanzable (ningún sistema sube niveles) y el Auto-Clicker no usa Árbol, Aura, Logros ni Turbo.

## Origen de los gráficos

| Recurso | Origen |
|---|---|
| 25 mascotas (Hielo, Volcán, Espacio, Halloween, San Valentín, Verano) | Recortadas de las maquetas de `referencia/visual`, sin fondo y repixeladas (`tools/extract_sprites.py`). |
| 16 mascotas (Bosque, Desierto, Navidad) | Pixeladas desde Noto Color Emoji (`tools/pixelize.py`). No hay referencia propia. |
| Iconos de interfaz | Recortados de las maquetas, o Noto pixelado para el resto de emojis del juego. |
| Fondos de Volcán, Espacio, Verano y Halloween | Repixelados de las referencias (216×324, 64 colores). |
| Fondos de Bosque, Desierto, Hielo, Navidad y San Valentín | Generados por código (`tools/gen_backgrounds.py`). |
| 19 huevos, monedas de las 24 skins, auras, partículas | Generados por código. |
| Fuentes | Jersey 10 para textos y números (5/S, 8 y C/O inconfundibles) y Silkscreen para títulos (SIL OFL 1.1, licencias en `src/fonts`). |

Las animaciones de los escenarios son capas dibujadas encima (brasas, nieve, murciélagos, estrellas, olas…). Los fondos son imágenes planas, así que no hay efecto de profundidad (parallax).

## Estructura

```
src/            capa arcade (util, audio, bg, fx, ui, patches, boot, tail, body.html, style.css)
src/*.gen.js    generados: core (lógica original), auras, códigos, assets
tools/          extracción de lógica y sprites, generadores y build
tests/          equivalence.mjs, shots.mjs, scenes.mjs, perf.mjs
dist/           HTML final
```

## Construir y verificar

```bash
node tools/build.mjs                 # regenera lógica, recursos y dist/
node tools/build.mjs --skip-assets   # solo código
node tests/equivalence.mjs           # equivalencia con el original + correcciones (Playwright + Chromium)
node tests/fixes.mjs                 # verificación de cada corrección
node tests/perf.mjs <dir>            # fps con ~75 clics/s y aura activa
node tests/sandbox.mjs               # arranque dentro de un iframe aislado sin localStorage
```

Requisitos de construcción: Node 18+, Python 3 con Pillow y numpy, y la fuente `NotoColorEmoji.ttf`.
