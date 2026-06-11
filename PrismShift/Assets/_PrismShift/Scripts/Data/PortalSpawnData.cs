using UnityEngine;

namespace PrismShift
{
    [System.Serializable]
    public class PortalSpawnData
    {
        public OrbColor color;
        public Vector2Int position;
        public int requiredCount = 1;
    }
}
