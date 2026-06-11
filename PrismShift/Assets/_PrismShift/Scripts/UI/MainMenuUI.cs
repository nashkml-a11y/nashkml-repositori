using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Pantalla de menú principal. Se autoconstruye en Start.
    /// </summary>
    public class MainMenuUI : MonoBehaviour
    {
        private Canvas _canvas;

        private void Start()
        {
            _canvas = GetComponent<Canvas>() ?? GetComponentInParent<Canvas>();
            if (_canvas != null) BuildUI();
        }

        private void BuildUI()
        {
            var root = _canvas.transform;

            // ── Fondo ────────────────────────────────────────────────────────
            var bg = UIBuilder.Panel(root, "Background",
                Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            bg.color = ColorPalette.Background;

            // ── Logo ─────────────────────────────────────────────────────────
            var logoP = UIBuilder.TextLabel(root, "LogoPrism", "PRISM", 72, Color.white,
                new Vector2(0.05f, 0.60f), new Vector2(0.95f, 0.76f));
            logoP.fontStyle = FontStyles.Bold;

            var logoS = UIBuilder.TextLabel(root, "LogoShift", "SHIFT", 72,
                ColorPalette.Purple,
                new Vector2(0.05f, 0.50f), new Vector2(0.95f, 0.62f));
            logoS.fontStyle = FontStyles.Bold;

            UIBuilder.TextLabel(root, "Tagline", "Color · Puzzle · Flow", 24,
                ColorPalette.TextDim,
                new Vector2(0.1f, 0.45f), new Vector2(0.9f, 0.52f));

            // ── Placeholder de orbes decorativos (3 círculos) ────────────────
            AddDecorativeOrbs(root);

            // ── Botón PLAY ───────────────────────────────────────────────────
            var playBtn = UIBuilder.Button(root, "PlayBtn", "▶  PLAY",
                ColorPalette.ButtonPrimary,
                new Vector2(0.15f, 0.30f), new Vector2(0.85f, 0.44f), 36);
            playBtn.onClick.AddListener(OnPlayClicked);

            // ── Botón LEVELS ─────────────────────────────────────────────────
            var levelsBtn = UIBuilder.Button(root, "LevelsBtn", "☰  LEVELS",
                ColorPalette.ButtonSecondary,
                new Vector2(0.15f, 0.16f), new Vector2(0.85f, 0.29f), 30);
            levelsBtn.onClick.AddListener(OnLevelsClicked);

            // ── Botón SETTINGS (placeholder) ─────────────────────────────────
            UIBuilder.Button(root, "SettingsBtn", "⚙",
                new Color(0.2f, 0.2f, 0.3f),
                new Vector2(0.40f, 0.04f), new Vector2(0.60f, 0.14f), 28);
        }

        private void AddDecorativeOrbs(Transform root)
        {
            // Tres orbes de fondo con colores distintos
            var colors = new[] { OrbColor.Red, OrbColor.Blue, OrbColor.Purple };
            float[] xPositions = { 0.15f, 0.50f, 0.80f };
            float[] yPositions = { 0.82f, 0.86f, 0.80f };
            float[] scales     = { 0.10f, 0.13f, 0.09f };

            for (int i = 0; i < 3; i++)
            {
                float x = xPositions[i], y = yPositions[i], s = scales[i];
                var img = UIBuilder.Icon(root, $"DecorOrb_{i}",
                    PlaceholderAssets.CircleSprite(), ColorPalette.ForOrb(colors[i]),
                    new Vector2(x - s * 0.5f, y - s * 0.5f),
                    new Vector2(x + s * 0.5f, y + s * 0.5f));
                img.color = new Color(img.color.r, img.color.g, img.color.b, 0.55f);
            }
        }

        // ── Botones ──────────────────────────────────────────────────────────

        private void OnPlayClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            int lastLevel = (SaveManager.Instance?.MaxUnlockedLevel ?? 1) - 1;
            SceneFlowManager.Instance?.LoadGameplay(Mathf.Max(0, lastLevel));
        }

        private void OnLevelsClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            SceneFlowManager.Instance?.LoadLevelSelect();
        }
    }
}
