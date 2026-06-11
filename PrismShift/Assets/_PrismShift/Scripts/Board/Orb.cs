using System.Collections;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Componente visual y de estado de un orbe. BoardManager le dice cuándo moverse.
    /// </summary>
    [RequireComponent(typeof(SpriteRenderer))]
    public class Orb : MonoBehaviour
    {
        public OrbColor Color    { get; private set; }
        public OrbState State    { get; private set; } = OrbState.Normal;
        public Vector2Int GridPos { get; set; }

        private SpriteRenderer _sr;
        private Vector3 _baseScale;

        // ── Inicialización ───────────────────────────────────────────────────

        private void Awake()
        {
            _sr        = GetComponent<SpriteRenderer>();
            _baseScale = transform.localScale;
        }

        public void Initialize(OrbColor color, Vector2Int gridPos)
        {
            Color   = color;
            GridPos = gridPos;
            _sr.sprite = PlaceholderAssets.CircleSprite();
            _sr.color  = ColorPalette.ForOrb(color);
            State = OrbState.Normal;
        }

        // ── Animaciones ──────────────────────────────────────────────────────

        public Coroutine AnimateMoveTo(Vector3 worldPos, float duration)
        {
            State = OrbState.Moving;
            return StartCoroutine(MoveRoutine(worldPos, duration));
        }

        private IEnumerator MoveRoutine(Vector3 target, float duration)
        {
            yield return AnimationHelper.MoveTo(transform, target, duration);
            State = OrbState.Normal;
        }

        public void AnimateAbsorb(System.Action onComplete = null)
        {
            State = OrbState.Absorbed;
            StartCoroutine(AbsorbRoutine(onComplete));
        }

        private IEnumerator AbsorbRoutine(System.Action onComplete)
        {
            yield return AnimationHelper.ScaleTo(transform, Vector3.zero, 0.25f);
            onComplete?.Invoke();
            Destroy(gameObject);
        }

        public void AnimateError()
        {
            State = OrbState.Error;
            StartCoroutine(ErrorRoutine());
        }

        private IEnumerator ErrorRoutine()
        {
            yield return AnimationHelper.FlashColor(_sr, Color.white, 0.08f);
            yield return AnimationHelper.FlashColor(_sr, ColorPalette.ForOrb(Color), 0.05f);
            State = OrbState.Normal;
        }

        // ── Highlight durante swipe ──────────────────────────────────────────

        public void SetHighlight(bool on)
        {
            if (on)
            {
                var c = ColorPalette.Glow(Color);
                _sr.color = c;
            }
            else
            {
                _sr.color = ColorPalette.ForOrb(Color);
            }
        }
    }
}
