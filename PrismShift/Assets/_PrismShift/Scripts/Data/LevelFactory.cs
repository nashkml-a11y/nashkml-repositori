using System.Collections.Generic;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Crea los 10 niveles en código. Se usa como fallback cuando no existen
    /// los ScriptableObject en Resources/Levels (útil en build sin setup previo).
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

        // ── Nivel 1 ─────────────────────────────────────────────────────────
        // Un orbe rojo que hay que llevar al portal rojo. Sin obstáculos.
        private static LevelData Level01()
        {
            var d = Make(1, moveLimit: 5);
            d.orbs.Add(Orb(OrbColor.Red, 0, 2));
            d.portals.Add(Portal(OrbColor.Red, 4, 2));
            return d;
        }

        // ── Nivel 2 ─────────────────────────────────────────────────────────
        // Dos colores, introducción a la coordinación.
        private static LevelData Level02()
        {
            var d = Make(2, moveLimit: 8);
            d.orbs.Add(Orb(OrbColor.Red,  0, 1));
            d.orbs.Add(Orb(OrbColor.Blue, 0, 3));
            d.portals.Add(Portal(OrbColor.Red,  4, 1));
            d.portals.Add(Portal(OrbColor.Blue, 4, 3));
            return d;
        }

        // ── Nivel 3 ─────────────────────────────────────────────────────────
        // Introduce movimiento vertical (portales en columnas diferentes).
        private static LevelData Level03()
        {
            var d = Make(3, moveLimit: 10);
            d.orbs.Add(Orb(OrbColor.Red,   1, 0));
            d.orbs.Add(Orb(OrbColor.Green, 3, 4));
            d.portals.Add(Portal(OrbColor.Red,   1, 4));
            d.portals.Add(Portal(OrbColor.Green, 3, 0));
            return d;
        }

        // ── Nivel 4 ─────────────────────────────────────────────────────────
        // Más orbes, movimientos más limitados.
        private static LevelData Level04()
        {
            var d = Make(4, moveLimit: 12);
            d.orbs.Add(Orb(OrbColor.Red,    0, 0));
            d.orbs.Add(Orb(OrbColor.Blue,   0, 4));
            d.orbs.Add(Orb(OrbColor.Green,  4, 0));
            d.orbs.Add(Orb(OrbColor.Yellow, 4, 4));
            d.portals.Add(Portal(OrbColor.Red,    4, 4));
            d.portals.Add(Portal(OrbColor.Blue,   4, 0));
            d.portals.Add(Portal(OrbColor.Green,  0, 4));
            d.portals.Add(Portal(OrbColor.Yellow, 0, 0));
            return d;
        }

        // ── Nivel 5 ─────────────────────────────────────────────────────────
        // Primer bloqueo central que fuerza rodear.
        private static LevelData Level05()
        {
            var d = Make(5, moveLimit: 10);
            d.orbs.Add(Orb(OrbColor.Red,  0, 2));
            d.orbs.Add(Orb(OrbColor.Blue, 4, 2));
            d.portals.Add(Portal(OrbColor.Red,  4, 2));
            d.portals.Add(Portal(OrbColor.Blue, 0, 2));
            d.blockedCells.Add(new Vector2Int(2, 2)); // centro bloqueado
            return d;
        }

        // ── Nivel 6 ─────────────────────────────────────────────────────────
        // Tres colores, planificación necesaria.
        private static LevelData Level06()
        {
            var d = Make(6, moveLimit: 14);
            d.orbs.Add(Orb(OrbColor.Red,    0, 0));
            d.orbs.Add(Orb(OrbColor.Blue,   2, 2));
            d.orbs.Add(Orb(OrbColor.Green,  4, 4));
            d.portals.Add(Portal(OrbColor.Red,   4, 0));
            d.portals.Add(Portal(OrbColor.Blue,  2, 4));
            d.portals.Add(Portal(OrbColor.Green, 0, 4));
            return d;
        }

        // ── Nivel 7 ─────────────────────────────────────────────────────────
        // Tres colores + dos bloqueos en diagonal.
        private static LevelData Level07()
        {
            var d = Make(7, moveLimit: 14);
            d.orbs.Add(Orb(OrbColor.Red,    0, 1));
            d.orbs.Add(Orb(OrbColor.Yellow, 1, 0));
            d.orbs.Add(Orb(OrbColor.Purple, 0, 3));
            d.portals.Add(Portal(OrbColor.Red,    4, 1));
            d.portals.Add(Portal(OrbColor.Yellow, 4, 0));
            d.portals.Add(Portal(OrbColor.Purple, 4, 3));
            d.blockedCells.Add(new Vector2Int(2, 2));
            d.blockedCells.Add(new Vector2Int(3, 1));
            return d;
        }

        // ── Nivel 8 ─────────────────────────────────────────────────────────
        // Bloqueos que obligan a pensar el orden de movimientos.
        private static LevelData Level08()
        {
            var d = Make(8, moveLimit: 16);
            d.orbs.Add(Orb(OrbColor.Red,  0, 0));
            d.orbs.Add(Orb(OrbColor.Blue, 0, 4));
            d.orbs.Add(Orb(OrbColor.Cyan, 2, 2));
            d.portals.Add(Portal(OrbColor.Red,  4, 4));
            d.portals.Add(Portal(OrbColor.Blue, 4, 0));
            d.portals.Add(Portal(OrbColor.Cyan, 4, 2));
            d.blockedCells.Add(new Vector2Int(2, 0));
            d.blockedCells.Add(new Vector2Int(2, 4));
            d.blockedCells.Add(new Vector2Int(3, 2));
            return d;
        }

        // ── Nivel 9 ─────────────────────────────────────────────────────────
        // Menos movimientos, todo cuenta.
        private static LevelData Level09()
        {
            var d = Make(9, moveLimit: 10);
            d.orbs.Add(Orb(OrbColor.Red,    0, 0));
            d.orbs.Add(Orb(OrbColor.Green,  0, 2));
            d.orbs.Add(Orb(OrbColor.Yellow, 0, 4));
            d.portals.Add(Portal(OrbColor.Red,    4, 0));
            d.portals.Add(Portal(OrbColor.Green,  4, 2));
            d.portals.Add(Portal(OrbColor.Yellow, 4, 4));
            d.blockedCells.Add(new Vector2Int(2, 1));
            d.blockedCells.Add(new Vector2Int(2, 3));
            return d;
        }

        // ── Nivel 10 ────────────────────────────────────────────────────────
        // Nivel más desafiante del prototipo. Cuatro colores, bloqueos múltiples.
        private static LevelData Level10()
        {
            var d = Make(10, moveLimit: 18);
            d.orbs.Add(Orb(OrbColor.Red,    0, 0));
            d.orbs.Add(Orb(OrbColor.Blue,   0, 4));
            d.orbs.Add(Orb(OrbColor.Green,  4, 0));
            d.orbs.Add(Orb(OrbColor.Purple, 4, 4));
            d.portals.Add(Portal(OrbColor.Red,    4, 4));
            d.portals.Add(Portal(OrbColor.Blue,   4, 0));
            d.portals.Add(Portal(OrbColor.Green,  0, 4));
            d.portals.Add(Portal(OrbColor.Purple, 0, 0));
            d.blockedCells.Add(new Vector2Int(1, 2));
            d.blockedCells.Add(new Vector2Int(2, 1));
            d.blockedCells.Add(new Vector2Int(2, 3));
            d.blockedCells.Add(new Vector2Int(3, 2));
            return d;
        }

        // ── Helpers ─────────────────────────────────────────────────────────

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
