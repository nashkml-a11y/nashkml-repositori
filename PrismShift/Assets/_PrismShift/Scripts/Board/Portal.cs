using System.Collections;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Portal fijo en el tablero. Registra absorción de orbes del mismo color.
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class Portal : MonoBehaviour
    {
        public OrbColor    Color     { get; private set; }
        public Vector2Int  GridPos   { get; private set; }
        public PortalState State     { get; private set; } = PortalState.Active;
        public int RequiredCount     { get; private set; }
        public int AbsorbedCount     { get; private set; }
        public bool IsComplete       => AbsorbedCount >= RequiredCount;

        private SpriteRenderer _sr;
        private Color _baseColor;

        // ── Inicialización ───────────────────────────────────────────────────

        private void Awake() => _sr = GetComponent<SpriteRenderer>();

        public void Initialize(OrbColor color, Vector2Int gridPos, int required = 1)
        {
            Color         = color;
            GridPos       = gridPos;
            RequiredCount = required;
            AbsorbedCount = 0;
            _baseColor    = ColorPalette.ForOrb(color);

            _sr.sprite = PlaceholderAssets.RingSprite();
            _sr.color  = _baseColor;
            State      = PortalState.Active;
        }

        // ── Lógica ───────────────────────────────────────────────────────────

        /// <returns>true si el orbe fue aceptado.</returns>
        public bool TryAbsorb(OrbColor orbColor)
        {
            if (orbColor != Color || IsComplete) return false;
            AbsorbedCount++;
            if (IsComplete) SetCompleted();
            else StartCoroutine(FlashSuccess());
            return true;
        }

        public void SetHighlight(bool on)
        {
            if (IsComplete) return;
            State    = on ? PortalState.Highlighted : PortalState.Active;
            _sr.color = on ? ColorPalette.Glow(Color) : _baseColor;
        }

        public void AnimateError()
        {
            if (IsComplete) return;
            StartCoroutine(ErrorFlash());
        }

        // ── Animaciones ──────────────────────────────────────────────────────

        private void SetCompleted()
        {
            State     = PortalState.Completed;
            _sr.color = ColorPalette.Dimmed(Color);
            StartCoroutine(CompleteAnimation());
            AudioManager.Instance?.PlayPortalComplete();
        }

        private IEnumerator CompleteAnimation()
        {
            yield return AnimationHelper.ScalePunch(transform, 1.4f, 0.3f);
        }

        private IEnumerator FlashSuccess()
        {
            yield return AnimationHelper.FlashColor(_sr, ColorPalette.Glow(Color), 0.15f);
            _sr.color = _baseColor;
        }

        private IEnumerator ErrorFlash()
        {
            State = PortalState.Error;
            yield return AnimationHelper.FlashColor(_sr, new Color(1f, 0.2f, 0.2f), 0.15f);
            _sr.color = _baseColor;
            State = PortalState.Active;
        }
    }
}
