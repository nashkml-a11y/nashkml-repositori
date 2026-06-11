using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Pantalla de selección de niveles. Grid de 4 columnas con los 10 niveles.
    /// </summary>
    public class LevelSelectUI : MonoBehaviour
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

            // Fondo
            var bg = UIBuilder.Panel(root, "Background",
                Vector2.zero, Vector2.one, Vector2.zero, Vector2.zero);
            bg.color = ColorPalette.Background;

            // Header
            var header = UIBuilder.Panel(root, "Header",
                new Vector2(0, 0.88f), new Vector2(1, 1f),
                Vector2.zero, Vector2.zero);
            header.color = ColorPalette.PanelBg;

            var backBtn = UIBuilder.Button(header.transform, "BackBtn", "←",
                ColorPalette.ButtonSecondary,
                new Vector2(0.02f, 0.1f), new Vector2(0.18f, 0.9f), 32);
            backBtn.onClick.AddListener(OnBackClicked);

            UIBuilder.TextLabel(header.transform, "Title", "LEVELS",
                36, ColorPalette.TextPrimary,
                new Vector2(0.2f, 0f), new Vector2(0.8f, 1f), TextAlignmentOptions.Center)
                .fontStyle = FontStyles.Bold;

            // Grid de niveles
            BuildLevelGrid(root);
        }

        private void BuildLevelGrid(Transform root)
        {
            var gridGo = new GameObject("LevelGrid");
            gridGo.transform.SetParent(root, false);
            var grt = gridGo.AddComponent<RectTransform>();
            grt.anchorMin = new Vector2(0.04f, 0.04f);
            grt.anchorMax = new Vector2(0.96f, 0.86f);
            grt.offsetMin = grt.offsetMax = Vector2.zero;

            var layout = gridGo.AddComponent<GridLayoutGroup>();
            layout.padding       = new RectOffset(8, 8, 8, 8);
            layout.spacing       = new Vector2(12, 12);
            layout.cellSize      = new Vector2(160, 160);
            layout.constraint    = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 4;
            layout.childAlignment = TextAnchor.UpperCenter;

            int levelCount = LevelManager.Instance?.LevelCount ?? 10;
            int maxUnlocked = SaveManager.Instance?.MaxUnlockedLevel ?? 1;

            for (int i = 1; i <= levelCount; i++)
            {
                var btnGo = new GameObject($"Level_{i:D2}");
                btnGo.transform.SetParent(gridGo.transform, false);
                btnGo.AddComponent<Image>(); // requerido para Button
                var lvlBtn = btnGo.AddComponent<LevelButtonUI>();
                lvlBtn.Initialize(i,
                    unlocked: i <= maxUnlocked,
                    stars:    SaveManager.Instance?.GetStars(i) ?? 0);
            }
        }

        private void OnBackClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            SceneFlowManager.Instance?.LoadMainMenu();
        }
    }
}
