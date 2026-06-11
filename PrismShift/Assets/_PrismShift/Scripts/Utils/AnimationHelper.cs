using System;
using System.Collections;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Corrutinas reutilizables para animaciones sin dependencias externas.
    /// </summary>
    public static class AnimationHelper
    {
        // ── Movimiento ───────────────────────────────────────────────────────

        public static IEnumerator MoveTo(Transform t, Vector3 target, float duration,
                                         Action onComplete = null)
        {
            Vector3 start = t.localPosition;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float p = Mathf.Clamp01(elapsed / duration);
                t.localPosition = Vector3.LerpUnclamped(start, target, EaseOutCubic(p));
                yield return null;
            }
            t.localPosition = target;
            onComplete?.Invoke();
        }

        // ── Escala ───────────────────────────────────────────────────────────

        public static IEnumerator ScalePunch(Transform t, float punchScale,
                                              float duration = 0.25f)
        {
            Vector3 original = t.localScale;
            float half = duration * 0.5f;
            yield return ScaleTo(t, original * punchScale, half);
            yield return ScaleTo(t, original, half);
        }

        public static IEnumerator ScaleTo(Transform t, Vector3 target, float duration)
        {
            Vector3 start = t.localScale;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                t.localScale = Vector3.Lerp(start, target, Mathf.Clamp01(elapsed / duration));
                yield return null;
            }
            t.localScale = target;
        }

        public static IEnumerator PopIn(Transform t, float duration = 0.3f)
        {
            t.localScale = Vector3.zero;
            yield return ScaleTo(t, Vector3.one, duration);
        }

        // ── Shake ────────────────────────────────────────────────────────────

        public static IEnumerator Shake(Transform t, float magnitude = 0.12f,
                                         float duration = 0.2f)
        {
            Vector3 origin = t.localPosition;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float x = UnityEngine.Random.Range(-1f, 1f) * magnitude;
                float y = UnityEngine.Random.Range(-1f, 1f) * magnitude * 0.5f;
                t.localPosition = origin + new Vector3(x, y, 0f);
                yield return null;
            }
            t.localPosition = origin;
        }

        // ── Fade ─────────────────────────────────────────────────────────────

        public static IEnumerator FadeAlpha(CanvasGroup cg, float from, float to,
                                             float duration)
        {
            cg.alpha = from;
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                cg.alpha = Mathf.Lerp(from, to, Mathf.Clamp01(elapsed / duration));
                yield return null;
            }
            cg.alpha = to;
        }

        // ── Color flash ──────────────────────────────────────────────────────

        public static IEnumerator FlashColor(SpriteRenderer sr, Color flashColor,
                                              float duration = 0.2f)
        {
            Color original = sr.color;
            sr.color = flashColor;
            yield return new WaitForSeconds(duration);
            sr.color = original;
        }

        // ── Secuencias de estrellas ───────────────────────────────────────────

        public static IEnumerator StarsAppear(Transform[] stars, float delayBetween = 0.15f)
        {
            foreach (var s in stars)
            {
                s.localScale = Vector3.zero;
                yield return new WaitForSeconds(delayBetween);
                yield return ScalePunch(s, 1.35f, 0.3f);
            }
        }

        // ── Easings ──────────────────────────────────────────────────────────

        public static float EaseOutCubic(float t)
        {
            float f = 1f - t;
            return 1f - f * f * f;
        }

        public static float EaseInOutQuad(float t)
        {
            return t < 0.5f ? 2f * t * t : 1f - Mathf.Pow(-2f * t + 2f, 2f) / 2f;
        }
    }
}
