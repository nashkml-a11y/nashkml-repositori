using System.Collections.Generic;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Diseño de niveles basado en la referencia visual:
    /// - Columna 4 (derecha) = columna fija de portales, uno por fila
    /// - Columnas 0-3 = área de juego con orbes y bloqueos
    /// - El jugador desliza filas hacia la derecha para meter orbes en portales
    /// - Los movimientos verticales permiten reorganizar qué orbe queda en qué fila
    /// </summary>
    public static class LevelFactory
    {
        public static List<LevelData> CreateAllLevels()
        {
            return new List<LevelData>
            {
                Level01(), Level02(), Level03(), Level04(), Level05(),
                Level06(), Level07(), Level08(), Level09(), Level10()
            };
        }

        // ── NIVEL 1 ──────────────────────────────────────────────────────────
        // Tutorial: un orbe rojo en fila 2, portal rojo en (4,2).
        // Solo hay que hacer un swipe derecha. Sin bloqueos.
        private static LevelData Level01()
        {
            var d = Make(1, moveLimit: 3);
            d.portals.Add(Portal(OrbColor.Red, 4, 2));
            d.orbs.Add(Orb(OrbColor.Red, 1, 2));
            return d;
        }

        // ── NIVEL 2 ──────────────────────────────────────────────────────────
        // Dos colores. Los orbes están en columna 0, portales en columna 4.
        // El jugador necesita alinear y deslizar.
        private static LevelData Level02()
        {
            var d = Make(2, moveLimit: 6);
            d.portals.Add(Portal(OrbColor.Red,  4, 1));
            d.portals.Add(Portal(OrbColor.Blue, 4, 3));
            d.orbs.Add(Orb(OrbColor.Red,  0, 1));
            d.orbs.Add(Orb(OrbColor.Blue, 0, 3));
            return d;
        }

        // ── NIVEL 3 ──────────────────────────────────────────────────────────
        // Introduce movimiento vertical. Los orbes están en filas incorrectas,
        // hay que subirlos/bajarlos antes de deslizar a la derecha.
        private static LevelData Level03()
        {
            var d = Make(3, moveLimit: 8);
            d.portals.Add(Portal(OrbColor.Red,   4, 0));
            d.portals.Add(Portal(OrbColor.Green, 4, 4));
            // Orbes en filas equivocadas — hay que mover verticalmente primero
            d.orbs.Add(Orb(OrbColor.Red,   1, 4)); // está abajo, portal arriba
            d.orbs.Add(Orb(OrbColor.Green, 1, 0)); // está arriba, portal abajo
            return d;
        }

        // ── NIVEL 4 ──────────────────────────────────────────────────────────
        // Tres colores. Los orbes empiezan mezclados entre filas.
        private static LevelData Level04()
        {
            var d = Make(4, moveLimit: 10);
            d.portals.Add(Portal(OrbColor.Red,    4, 0));
            d.portals.Add(Portal(OrbColor.Blue,   4, 2));
            d.portals.Add(Portal(OrbColor.Yellow, 4, 4));
            d.orbs.Add(Orb(OrbColor.Yellow, 0, 0));
            d.orbs.Add(Orb(OrbColor.Red,    0, 2));
            d.orbs.Add(Orb(OrbColor.Blue,   0, 4));
            return d;
        }

        // ── NIVEL 5 ──────────────────────────────────────────────────────────
        // Primer bloqueo. Una celda bloqueada en el camino de una fila
        // obliga a rodear usando movimientos verticales.
        private static LevelData Level05()
        {
            var d = Make(5, moveLimit: 10);
            d.portals.Add(Portal(OrbColor.Red,  4, 1));
            d.portals.Add(Portal(OrbColor.Blue, 4, 3));
            d.orbs.Add(Orb(OrbColor.Red,  0, 1));
            d.orbs.Add(Orb(OrbColor.Blue, 0, 3));
            d.blockedCells.Add(new Vector2Int(2, 1)); // bloquea la ruta directa del rojo
            return d;
        }

        // ── NIVEL 6 ──────────────────────────────────────────────────────────
        // Cuatro portales (filas 0-3). Los orbes están en columnas 1 y 2,
        // intercalados — hay que coordinar verticales y horizontales.
        private static LevelData Level06()
        {
            var d = Make(6, moveLimit: 12);
            d.portals.Add(Portal(OrbColor.Red,    4, 0));
            d.portals.Add(Portal(OrbColor.Blue,   4, 1));
            d.portals.Add(Portal(OrbColor.Green,  4, 2));
            d.portals.Add(Portal(OrbColor.Yellow, 4, 3));
            d.orbs.Add(Orb(OrbColor.Green,  1, 0));
            d.orbs.Add(Orb(OrbColor.Red,    1, 1));
            d.orbs.Add(Orb(OrbColor.Yellow, 2, 2));
            d.orbs.Add(Orb(OrbColor.Blue,   2, 3));
            return d;
        }

        // ── NIVEL 7 ──────────────────────────────────────────────────────────
        // Tres colores + bloqueo en posición estratégica que corta dos caminos.
        private static LevelData Level07()
        {
            var d = Make(7, moveLimit: 14);
            d.portals.Add(Portal(OrbColor.Purple, 4, 0));
            d.portals.Add(Portal(OrbColor.Red,    4, 2));
            d.portals.Add(Portal(OrbColor.Cyan,   4, 4));
            d.orbs.Add(Orb(OrbColor.Red,    0, 0));
            d.orbs.Add(Orb(OrbColor.Cyan,   0, 2));
            d.orbs.Add(Orb(OrbColor.Purple, 0, 4));
            d.blockedCells.Add(new Vector2Int(2, 0));
            d.blockedCells.Add(new Vector2Int(2, 2));
            return d;
        }

        // ── NIVEL 8 ──────────────────────────────────────────────────────────
        // Portales en las 5 filas. Los orbes están dispersos, dos bloqueos
        // en columnas intermedias que obligan a planificar el orden.
        private static LevelData Level08()
        {
            var d = Make(8, moveLimit: 16);
            d.portals.Add(Portal(OrbColor.Red,    4, 0));
            d.portals.Add(Portal(OrbColor.Blue,   4, 1));
            d.portals.Add(Portal(OrbColor.Green,  4, 2));
            d.portals.Add(Portal(OrbColor.Yellow, 4, 3));
            d.portals.Add(Portal(OrbColor.Purple, 4, 4));
            d.orbs.Add(Orb(OrbColor.Purple, 0, 0));
            d.orbs.Add(Orb(OrbColor.Red,    0, 1));
            d.orbs.Add(Orb(OrbColor.Yellow, 1, 2));
            d.orbs.Add(Orb(OrbColor.Green,  0, 3));
            d.orbs.Add(Orb(OrbColor.Blue,   0, 4));
            d.blockedCells.Add(new Vector2Int(2, 1));
            d.blockedCells.Add(new Vector2Int(2, 3));
            return d;
        }

        // ── NIVEL 9 ──────────────────────────────────────────────────────────
        // Movimientos muy contados. Portales en 5 filas, orbes ya en columna 2
        // pero en orden incorrecto — el jugador debe reordenar primero.
        private static LevelData Level09()
        {
            var d = Make(9, moveLimit: 12);
            d.portals.Add(Portal(OrbColor.Red,    4, 0));
            d.portals.Add(Portal(OrbColor.Blue,   4, 1));
            d.portals.Add(Portal(OrbColor.Green,  4, 2));
            d.portals.Add(Portal(OrbColor.Yellow, 4, 3));
            d.portals.Add(Portal(OrbColor.Cyan,   4, 4));
            // Orbes en orden invertido — mínimos movimientos para reordenar
            d.orbs.Add(Orb(OrbColor.Cyan,   2, 0));
            d.orbs.Add(Orb(OrbColor.Yellow, 2, 1));
            d.orbs.Add(Orb(OrbColor.Green,  2, 2));
            d.orbs.Add(Orb(OrbColor.Blue,   2, 3));
            d.orbs.Add(Orb(OrbColor.Red,    2, 4));
            d.blockedCells.Add(new Vector2Int(3, 0));
            d.blockedCells.Add(new Vector2Int(3, 4));
            return d;
        }

        // ── NIVEL 10 ─────────────────────────────────────────────────────────
        // Nivel más complejo del prototipo. Portales en las 5 filas,
        // orbes muy dispersos, tres bloqueos que fragmentan las rutas.
        private static LevelData Level10()
        {
            var d = Make(10, moveLimit: 18);
            d.portals.Add(Portal(OrbColor.Red,    4, 0));
            d.portals.Add(Portal(OrbColor.Purple, 4, 1));
            d.portals.Add(Portal(OrbColor.Blue,   4, 2));
            d.portals.Add(Portal(OrbColor.Green,  4, 3));
            d.portals.Add(Portal(OrbColor.Yellow, 4, 4));
            d.orbs.Add(Orb(OrbColor.Yellow,  0, 0));
            d.orbs.Add(Orb(OrbColor.Red,     3, 1));
            d.orbs.Add(Orb(OrbColor.Green,   0, 2));
            d.orbs.Add(Orb(OrbColor.Purple,  1, 3));
            d.orbs.Add(Orb(OrbColor.Blue,    2, 4));
            d.blockedCells.Add(new Vector2Int(1, 0));
            d.blockedCells.Add(new Vector2Int(2, 2));
            d.blockedCells.Add(new Vector2Int(1, 4));
            return d;
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private static LevelData Make(int number, int moveLimit)
        {
            var d = ScriptableObject.CreateInstance<LevelData>();
            d.levelNumber = number;
            d.width       = 5;
            d.height      = 5;
            d.moveLimit   = moveLimit;
            return d;
        }

        private static OrbSpawnData Orb(OrbColor c, int col, int row)
            => new OrbSpawnData { color = c, position = new Vector2Int(col, row) };

        private static PortalSpawnData Portal(OrbColor c, int col, int row, int req = 1)
            => new PortalSpawnData { color = c, position = new Vector2Int(col, row), requiredCount = req };
    }
}
