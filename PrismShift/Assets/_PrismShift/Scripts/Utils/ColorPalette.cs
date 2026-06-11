using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Paleta centralizada. Cambia aquí los colores y se reflejan en todo el juego.
    /// </summary>
    public static class ColorPalette
    {
        // ── Colores de orbes / portales ──────────────────────────────────────
        public static readonly Color Red    = new Color(0.95f, 0.18f, 0.18f);
        public static readonly Color Blue   = new Color(0.18f, 0.45f, 0.95f);
        public static readonly Color Green  = new Color(0.18f, 0.80f, 0.27f);
        public static readonly Color Yellow = new Color(0.98f, 0.82f, 0.10f);
        public static readonly Color Purple = new Color(0.60f, 0.20f, 0.90f);
        public static readonly Color Cyan   = new Color(0.10f, 0.85f, 0.95f);

        // ── Tablero / fondo ──────────────────────────────────────────────────
        public static readonly Color Background     = new Color(0.07f, 0.06f, 0.18f);
        public static readonly Color CellNormal     = new Color(0.12f, 0.11f, 0.28f);
        public static readonly Color CellBlocked    = new Color(0.20f, 0.18f, 0.22f);
        public static readonly Color BoardBorder    = new Color(0.25f, 0.22f, 0.50f);

        // ── UI ───────────────────────────────────────────────────────────────
        public static readonly Color PanelBg        = new Color(0.08f, 0.07f, 0.20f, 0.92f);
        public static readonly Color ButtonPrimary  = new Color(0.18f, 0.72f, 0.28f);
        public static readonly Color ButtonSecondary= new Color(0.40f, 0.18f, 0.80f);
        public static readonly Color ButtonDanger   = new Color(0.85f, 0.18f, 0.20f);
        public static readonly Color StarColor      = new Color(0.98f, 0.80f, 0.10f);
        public static readonly Color TextPrimary    = Color.white;
        public static readonly Color TextDim        = new Color(0.70f, 0.68f, 0.80f);

        // ── Método principal ─────────────────────────────────────────────────
        public static Color ForOrb(OrbColor orb)
        {
            return orb switch
            {
                OrbColor.Red    => Red,
                OrbColor.Blue   => Blue,
                OrbColor.Green  => Green,
                OrbColor.Yellow => Yellow,
                OrbColor.Purple => Purple,
                OrbColor.Cyan   => Cyan,
                _               => Color.white
            };
        }

        /// Versión más oscura/desaturada para portales completados.
        public static Color Dimmed(OrbColor orb)
        {
            var c = ForOrb(orb);
            return new Color(c.r * 0.4f, c.g * 0.4f, c.b * 0.4f, 1f);
        }

        /// Versión brillante para el glow.
        public static Color Glow(OrbColor orb)
        {
            var c = ForOrb(orb);
            return new Color(
                Mathf.Clamp01(c.r + 0.3f),
                Mathf.Clamp01(c.g + 0.3f),
                Mathf.Clamp01(c.b + 0.3f), 1f);
        }
    }
}
