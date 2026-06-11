using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Pantalla de selección de niveles. Se reconstruye cada vez que se muestra
    /// para reflejar el progreso actualizado.
    /// </summary>
    public class InlineLevelSelectUI : MonoBehaviour
    {
        private GameObject _gridContainer;

        private void Start() => BuildUI();

        private void BuildUI()
        {
            var t = transform;

            // Fondo
            var bg = UIBuilder.Panel(t, "BG", Vector2.zero, Vector2.one,
                Vector2.zero, Vector2.zero);
            bg.color = ColorPalette.Background;

            // Header
            var header = UIBuilder.Panel(t, "Header",
                new Vector2(0f, 0.88f), new Vector2(1f, 1f),
                Vector2.zero, Vector2.zero);
            header.color = ColorPalette.PanelBg;

            var back = UIBuilder.Button(header.transform, "BackBtn", "←",
                ColorPalette.ButtonSecondary,
                new Vector2(0.02f, 0.1f), new Vector2(0.18f, 0.9f), 34);
            back.onClick.AddListener(OnBackClicked);

            var title = UIBuilder.TextLabel(header.transform, "Title", "LEVELS",
                36, ColorPalette.TextPrimary,
                new Vector2(0.2f, 0f), new Vector2(0.8f, 1f));
            title.fontStyle = TMPro.FontStyles.Bold;

            // Grid (container reutilizable)
            _gridContainer = new GameObject("GridContainer");
            _gridContainer.transform.SetParent(t, false);
            var rt = _gridContainer.AddComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.03f, 0.03f);
            rt.anchorMax = new Vector2(0.97f, 0.86f);
            rt.offsetMin = rt.offsetMax = Vector2.zero;

            PopulateGrid();
        }

        /// <summary>Llamado cada vez que el panel se activa para refrescar estrellas.</summary>
        public void Refresh()
        {
            if (_gridContainer == null) return;
            // Destruir botones viejos y recrear
            foreach (Transform child in _gridContainer.transform)
                Destroy(child.gameObject);
            PopulateGrid();
        }

        private void PopulateGrid()
        {
            if (_gridContainer == null) return;

            var layout = _gridContainer.GetComponent<GridLayoutGroup>()
                      ?? _gridContainer.AddComponent<GridLayoutGroup>();
            layout.padding         = new RectOffset(10, 10, 10, 10);
            layout.spacing         = new Vector2(14, 14);
            layout.cellSize        = new Vector2(160, 160);
            layout.constraint      = GridLayoutGroup.Constraint.FixedColumnCount;
            layout.constraintCount = 4;
            layout.childAlignment  = TextAnchor.UpperCenter;

            int count      = LevelManager.Instance?.LevelCount ?? 10;
            int maxUnlocked = SaveManager.Instance?.MaxUnlockedLevel ?? 1;

            for (int i = 1; i <= count; i++)
            {
                var btnGo = new GameObject($"Level_{i:D2}");
                btnGo.transform.SetParent(_gridContainer.transform, false);
                btnGo.AddComponent<Image>();
                var btn = btnGo.AddComponent<InlineLevelButton>();
                btn.Initialize(i, i <= maxUnlocked, SaveManager.Instance?.GetStars(i) ?? 0);
            }
        }

        private void OnBackClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            GameBootstrapper.Instance?.ShowMainMenu();
        }
    }
}
