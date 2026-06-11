using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Representa visualmente una celda del tablero. No contiene lógica de juego.
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class BoardCell : MonoBehaviour
    {
        public Vector2Int GridPos  { get; private set; }
        public CellType   CellType { get; private set; }

        private SpriteRenderer _sr;

        private void Awake() => _sr = GetComponent<SpriteRenderer>();

        public void Initialize(Vector2Int pos, CellType type)
        {
            GridPos  = pos;
            CellType = type;
            RefreshVisual();
        }

        private void RefreshVisual()
        {
            _sr.sprite = PlaceholderAssets.RoundedSquareSprite();
            _sr.color = CellType switch
            {
                CellType.Blocked => ColorPalette.CellBlocked,
                _                => ColorPalette.CellNormal
            };
        }
    }
}
