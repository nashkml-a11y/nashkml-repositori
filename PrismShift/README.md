# Prism Shift — Prototipo MVP

Puzzle móvil casual en Unity 2D. Desliza filas y columnas para llevar orbes de color a los portales correspondientes.

---

## Estructura del proyecto

```
PrismShift/
├── Assets/
│   ├── _PrismShift/
│   │   ├── Scripts/
│   │   │   ├── Core/         GameManager, SceneFlowManager, GameEnums
│   │   │   ├── Data/         LevelData (ScriptableObject), OrbSpawnData, PortalSpawnData, LevelFactory
│   │   │   ├── Level/        LevelManager
│   │   │   ├── Board/        BoardManager, BoardCell, Orb, Portal
│   │   │   ├── Input/        InputController, MoveController
│   │   │   ├── UI/           GameplayUI, MainMenuUI, LevelSelectUI, PopupManager, UIBuilder
│   │   │   ├── Audio/        AudioManager
│   │   │   ├── Save/         SaveManager
│   │   │   └── Utils/        PlaceholderAssets, AnimationHelper, ColorPalette
│   │   ├── Editor/           ProjectSetup, LevelDataCreator
│   │   └── Resources/
│   │       ├── Levels/       Level_01.asset … Level_10.asset (creados por Setup)
│   │       └── Config/       (ampliable con GameConfig)
│   └── Scenes/               MainMenu, LevelSelect, Gameplay (creadas por Setup)
├── Packages/
│   └── manifest.json
└── ProjectSettings/
    └── ProjectSettings.asset
```

---

## Requisitos

- **Unity 2022.3 LTS** o superior (recomendado)
- Módulo **Android Build Support** instalado
- Package **TextMeshPro** (incluido en manifest.json, Unity lo descarga automáticamente)

---

## Instalación — paso a paso

### 1. Abrir el proyecto

1. Abrir Unity Hub
2. Clic en **Add > Add project from disk**
3. Seleccionar la carpeta `PrismShift/`
4. Seleccionar la versión de Unity 2022.3 LTS
5. Esperar a que Unity importe los assets (puede tardar 1-2 min la primera vez)

### 2. Instalar TextMeshPro

Si Unity muestra el diálogo de TMP Essentials:
- Pulsar **Import TMP Essentials**

### 3. Ejecutar el Setup del proyecto

En Unity:
```
Menú superior → Tools → PrismShift → ▶  Setup Project (run once)
```

Esto crea automáticamente:
- 10 `LevelData` ScriptableObjects en `Resources/Levels/`
- Tres escenas: `MainMenu`, `LevelSelect`, `Gameplay`
- Configura el Build Settings para Android

**Solo es necesario ejecutarlo una vez.**

### 4. ¡Jugar!

1. Abrir la escena `Assets/Scenes/MainMenu.unity`
2. Pulsar **▶ Play** en Unity
3. Clic en **PLAY** para empezar el Nivel 1

---

## Controles en el editor

| Acción | Input |
|--------|-------|
| Swipe horizontal | Click + arrastrar izq/der sobre una fila |
| Swipe vertical | Click + arrastrar arr/abajo sobre una columna |

En móvil funciona con un dedo.

---

## Diseño de niveles

Los 10 niveles están definidos en `LevelFactory.cs`. Para modificarlos o añadir más:

**Opción A — Editar código:**
- Modificar `LevelFactory.cs`
- Ejecutar `Tools → PrismShift → ↺ Recreate Level Assets`

**Opción B — Editor de Unity:**
- Abrir cualquier `Level_XX.asset` desde `Resources/Levels/`
- Modificar directamente en el Inspector
- Los campos son: `moveLimit`, `orbs` (lista de posición+color), `portals`, `blockedCells`

---

## Build para Android

1. `File → Build Settings`
2. Seleccionar **Android**
3. `Switch Platform` (si no está ya en Android)
4. Conectar dispositivo o configurar emulador
5. **Build And Run**

Configuración ya incluida:
- Orientación: Portrait
- Resolución base: 1080×1920
- Min SDK: API 22 (Android 5.1)
- Target SDK: API 33

---

## Arquitectura de estados

```
MainMenu
    ↓ Play / Levels
LevelSelect  ←──────────────────────────────┐
    ↓ Level button                          │
Playing ──── ConsumeMove ──→ Moving         │
    ↓ allPortalsComplete                    │
Victory ──── Next ──→ Playing (nivel+1)     │
    │         Retry ──→ Playing             │
    │         Home ──────────────────────────┘
    │
Defeat ───── Retry ──→ Playing
              Home ──────────────────────────┘
```

---

## Próximos pasos sugeridos

### Prioridad alta (antes de test con usuarios)
1. **Assets visuales finales** — Sustituir sprites placeholder por sprites 2D reales. Los métodos en `PlaceholderAssets.cs` devuelven los sprites; solo hay que cambiarlos por `Resources.Load<Sprite>()`.
2. **Sonidos** — Asignar AudioClips en el Inspector del `AudioManager` en la escena `MainMenu`.
3. **Partículas** — Añadir `ParticleSystem` en `Portal.cs` método `SetCompleted()`.
4. **Más niveles** — Añadir niveles 11-30 en `LevelFactory.cs` y ejecutar Recreate.

### Prioridad media
5. **Undo (deshacer)** — Guardar estado del tablero antes de cada movimiento en una pila.
6. **Tutorial** — Overlay de flechas en Nivel 1 que indica el primer swipe.
7. **Pistas (hints)** — Calcular movimiento mínimo hacia un portal y resaltarlo.
8. **Animación de fondo** — Partículas flotantes en menú principal.

### Prioridad baja (post-validación)
9. **Monetización** — Ads intersticiales entre niveles, rewarded por pistas.
10. **Cloud Save** — Sustituir `PlayerPrefs` por backend (Firebase, Unity Gaming Services).
11. **Tienda** — Skins de orbes/portales, paquetes de pistas.
12. **Analytics** — Firebase Analytics para medir abandono por nivel.
13. **Editor de niveles** — Herramienta en Unity para diseñar niveles visualmente.

---

## Arquitectura técnica resumida

| Sistema | Responsabilidad |
|---------|----------------|
| `GameManager` | Estado global (Playing/Victory/Defeat/Paused), movimientos restantes, eventos |
| `LevelManager` | Carga y expone LevelData, gestiona progresión |
| `BoardManager` | Matriz lógica, validación de movimientos, animaciones del tablero |
| `InputController` | Swipes táctiles y de ratón → `MoveController` |
| `MoveController` | Valida con BoardManager, consume movimiento, feedback de error |
| `SaveManager` | PlayerPrefs wrapper (estrellas + niveles desbloqueados) |
| `AudioManager` | Reproducción de SFX sin romper si faltan clips |
| `SceneFlowManager` | Carga de escenas con fundido, persiste entre escenas |
| `PlaceholderAssets` | Genera Sprites en runtime (círculo, anillo, cuadrado redondeado, estrella) |
| `AnimationHelper` | Corrutinas de animación reutilizables sin dependencias externas |
| `ColorPalette` | Paleta centralizada de colores |
| `UIBuilder` | Factoría de elementos UI construidos en código |

---

*Prism Shift MVP — Prototipo de validación de mecánica*
