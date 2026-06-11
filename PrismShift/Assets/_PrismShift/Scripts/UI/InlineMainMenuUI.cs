using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Menú principal construido en código dentro del panel que le asigna GameBootstrapper.
    /// </summary>
    public class InlineMainMenuUI : MonoBehaviour
    {
        private void Start() => BuildUI();

        private void BuildUI()
        {
            var t = transform;

            // Fondo
            var bg = UIBuilder.Panel(t, "BG", Vector2.zero, Vector2.one,
                Vector2.zero, Vector2.zero);
            bg.color = ColorPalette.Background;

            // Orbes decorativos
            AddDecorOrb(t, OrbColor.Red,    0.15f, 0.84f, 0.09f, 0.35f);
            AddDecorOrb(t, OrbColor.Blue,   0.50f, 0.88f, 0.12f, 0.30f);
            AddDecorOrb(t, OrbColor.Purple, 0.82f, 0.83f, 0.08f, 0.28f);
            AddDecorOrb(t, OrbColor.Cyan,   0.25f, 0.78f, 0.06f, 0.20f);
            AddDecorOrb(t, OrbColor.Green,  0.72f, 0.80f, 0.07f, 0.22f);

            // Logo
            var p = UIBuilder.TextLabel(t, "LogoP", "PRISM", 80, Color.white,
                new Vector2(0.05f, 0.62f), new Vector2(0.95f, 0.76f));
            p.fontStyle = FontStyles.Bold;
            p.alignment = TextAlignmentOptions.Center;

            var s = UIBuilder.TextLabel(t, "LogoS", "SHIFT", 80, ColorPalette.Purple,
                new Vector2(0.05f, 0.52f), new Vector2(0.95f, 0.64f));
            s.fontStyle = FontStyles.Bold;
            s.alignment = TextAlignmentOptions.Center;

            UIBuilder.TextLabel(t, "Sub", "Color · Puzzle · Flow", 26,
                ColorPalette.TextDim,
                new Vector2(0.1f, 0.46f), new Vector2(0.9f, 0.53f));

            // Botón PLAY
            var play = UIBuilder.Button(t, "PlayBtn", "▶  PLAY",
                ColorPalette.ButtonPrimary,
                new Vector2(0.15f, 0.32f), new Vector2(0.85f, 0.45f), 36);
            play.onClick.AddListener(OnPlayClicked);

            // Botón LEVELS
            var lvls = UIBuilder.Button(t, "LevelsBtn", "☰  LEVELS",
                ColorPalette.ButtonSecondary,
                new Vector2(0.15f, 0.18f), new Vector2(0.85f, 0.30f), 30);
            lvls.onClick.AddListener(OnLevelsClicked);
        }

        private void AddDecorOrb(Transform parent, OrbColor color,
            float cx, float cy, float halfSize, float alpha255)
        {
            float a = alpha255 / 255f;
            var img = UIBuilder.Icon(parent, $"DecorOrb_{color}",
                PlaceholderAssets.CircleSprite(), ColorPalette.ForOrb(color),
                new Vector2(cx - halfSize, cy - halfSize),
                new Vector2(cx + halfSize, cy + halfSize));
            var c = img.color;
            img.color = new Color(c.r, c.g, c.b, a);
        }

        private void OnPlayClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            int last = Mathf.Max(0, (SaveManager.Instance?.MaxUnlockedLevel ?? 1) - 1);
            GameBootstrapper.Instance?.StartLevel(last);
        }

        private void OnLevelsClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            GameBootstrapper.Instance?.ShowLevelSelect();
        }
    }
}
