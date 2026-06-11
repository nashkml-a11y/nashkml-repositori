using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Genera sprites en runtime sin necesitar assets externos.
    /// Usa Texture2D con pintura pixel a pixel.
    /// Sustituir los métodos por Resources.Load cuando haya sprites finales.
    /// </summary>
    public static class PlaceholderAssets
    {
        private const int ORB_SIZE    = 64;
        private const int PORTAL_SIZE = 64;
        private const int CELL_SIZE   = 8;

        // ── Cache ────────────────────────────────────────────────────────────
        private static Sprite _circleSprite;
        private static Sprite _ringSprite;
        private static Sprite _squareSprite;
        private static Sprite _roundedSquareSprite;
        private static Sprite _starSprite;
        private static Sprite _starEmptySprite;

        // ── API pública ──────────────────────────────────────────────────────

        public static Sprite CircleSprite()
        {
            if (_circleSprite == null) _circleSprite = MakeCircle(ORB_SIZE, Color.white);
            return _circleSprite;
        }

        public static Sprite RingSprite()
        {
            if (_ringSprite == null) _ringSprite = MakeRing(PORTAL_SIZE, Color.white, thickness: 10);
            return _ringSprite;
        }

        public static Sprite SquareSprite()
        {
            if (_squareSprite == null) _squareSprite = MakeSolidSquare(CELL_SIZE, Color.white);
            return _squareSprite;
        }

        public static Sprite RoundedSquareSprite()
        {
            if (_roundedSquareSprite == null)
                _roundedSquareSprite = MakeRoundedSquare(64, Color.white, radius: 12);
            return _roundedSquareSprite;
        }

        public static Sprite StarSprite()
        {
            if (_starSprite == null) _starSprite = MakeStar(64, Color.white, filled: true);
            return _starSprite;
        }

        public static Sprite StarEmptySprite()
        {
            if (_starEmptySprite == null) _starEmptySprite = MakeStar(64, Color.white, filled: false);
            return _starEmptySprite;
        }

        // ── Generadores ──────────────────────────────────────────────────────

        private static Sprite MakeCircle(int size, Color color)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Bilinear;
            float r = size * 0.5f;
            float cx = r, cy = r;
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float dx = x - cx, dy = y - cy;
                float dist = Mathf.Sqrt(dx * dx + dy * dy);
                float alpha = Mathf.Clamp01((r - dist) / 1.5f);

                // Highlight suave para aspecto 3D
                float hlX = x - cx * 0.65f, hlY = y - cy * 0.65f;
                float hlDist = Mathf.Sqrt(hlX * hlX + hlY * hlY);
                float hl = Mathf.Clamp01(1f - hlDist / (r * 0.55f)) * 0.55f;

                var c = new Color(
                    Mathf.Clamp01(color.r + hl),
                    Mathf.Clamp01(color.g + hl),
                    Mathf.Clamp01(color.b + hl),
                    alpha);
                tex.SetPixel(x, y, c);
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static Sprite MakeRing(int size, Color color, int thickness)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Bilinear;
            float r = size * 0.47f;
            float cx = size * 0.5f, cy = size * 0.5f;
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float dx = x - cx, dy = y - cy;
                float dist = Mathf.Sqrt(dx * dx + dy * dy);
                float inner = r - thickness;
                float alpha = 0f;
                if (dist < r)   alpha = Mathf.Clamp01((r - dist) / 1.5f);
                if (dist < inner) alpha -= Mathf.Clamp01((inner - dist) / 1.5f);
                alpha = Mathf.Clamp01(alpha);
                tex.SetPixel(x, y, new Color(color.r, color.g, color.b, alpha));
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static Sprite MakeSolidSquare(int size, Color color)
        {
            var tex = new Texture2D(size, size);
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
                tex.SetPixel(x, y, color);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f));
        }

        private static Sprite MakeRoundedSquare(int size, Color color, int radius)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Bilinear;
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                // Esquinas redondeadas: medir distancia a la esquina más cercana
                int cx = Mathf.Clamp(x, radius, size - radius);
                int cy = Mathf.Clamp(y, radius, size - radius);
                float dx = x - cx, dy = y - cy;
                float dist = Mathf.Sqrt(dx * dx + dy * dy);
                float alpha = Mathf.Clamp01((radius - dist) / 1.5f);
                tex.SetPixel(x, y, new Color(color.r, color.g, color.b, alpha));
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static Sprite MakeStar(int size, Color color, bool filled)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false);
            float cx = size * 0.5f, cy = size * 0.5f;
            float outerR = size * 0.46f, innerR = size * 0.19f;
            int points = 5;

            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
            {
                float dx = x - cx, dy = y - cy;
                float angle = Mathf.Atan2(dy, dx);
                float dist  = Mathf.Sqrt(dx * dx + dy * dy);
                // Radio de la estrella en ese ángulo
                float sector = Mathf.PI * 2f / points;
                float normAngle = ((angle + Mathf.PI / 2f) % sector + sector) % sector;
                float t = normAngle / (sector * 0.5f);
                if (t > 1f) t = 2f - t;
                float starR = Mathf.Lerp(innerR, outerR, t);
                float alpha = 0f;
                if (filled)
                    alpha = Mathf.Clamp01((starR - dist) / 1.5f);
                else
                    alpha = Mathf.Clamp01(Mathf.Abs(starR - dist) < 2.5f ? 1f : 0f);
                tex.SetPixel(x, y, new Color(color.r, color.g, color.b, alpha));
            }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }
    }
}
