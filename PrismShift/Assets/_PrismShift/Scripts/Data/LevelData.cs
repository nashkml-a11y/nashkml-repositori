using System.Collections.Generic;
using UnityEngine;

namespace PrismShift
{
    [CreateAssetMenu(menuName = "PrismShift/Level Data", fileName = "Level_01")]
    public class LevelData : ScriptableObject
    {
        public int levelNumber = 1;
        public int width      = 5;
        public int height     = 5;
        public int moveLimit  = 10;

        public List<OrbSpawnData>    orbs         = new List<OrbSpawnData>();
        public List<PortalSpawnData> portals      = new List<PortalSpawnData>();
        public List<Vector2Int>      blockedCells = new List<Vector2Int>();
    }
}
