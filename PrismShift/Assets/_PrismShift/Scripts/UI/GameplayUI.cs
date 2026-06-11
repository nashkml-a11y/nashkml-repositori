using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// HUD de la pantalla de juego.
    /// Creado completamente en código para no depender de assets de escena.
    /// </summary>
    public class GameplayUI : MonoBehaviour
    {
        // ── Referencias (asignadas en Start si son null) ─────────────────────
        private TextMeshProUGUI _movesText;
        private TextMeshProUGUI _levelText;
        private Button          _pauseBtn;
        private Button          _restartBtn;

        private void Start()
        {
            BuildUI();
            SubscribeEvents();
            RefreshFromGameManager();
        }

        private void OnDestroy() => UnsubscribeEvents();

        // ── Construcción de UI ───────────────────────────────────────────────

        private void BuildUI()
        {
            var canvas = GetComponentInParent<Canvas>();
            if (canvas == null) return;
            var rt = canvas.GetComponent<RectTransform>();

            // ── Top bar ──────────────────────────────────────────────────────
            var topBar = UIBuilder.Panel(canvas.transform, "TopBar",
                new Vector2(0, 1), new Vector2(1, 1),
                new Vector2(0, -90), new Vector2(0, 0));
            topBar.color = ColorPalette.PanelBg;

            // Movimientos
            var movesIcon = UIBuilder.TextLabel(topBar.transform, "MovesLabel",
                "MOVES", 22, ColorPalette.TextDim,
                new Vector2(0.05f, 0), new Vector2(0.35f, 1));

            _movesText = UIBuilder.TextLabel(topBar.transform, "MovesValue",
                "10", 48, ColorPalette.TextPrimary,
                new Vector2(0.05f, 0), new Vector2(0.35f, 1)).GetComponent<TextMeshProUGUI>();
            _movesText.fontStyle = FontStyles.Bold;

            // Nivel
            _levelText = UIBuilder.TextLabel(topBar.transform, "LevelText",
                "LEVEL 01", 28, ColorPalette.TextPrimary,
                new Vector2(0.35f, 0), new Vector2(0.65f, 1)).GetComponent<TextMeshProUGUI>();
            _levelText.fontStyle   = FontStyles.Bold;
            _levelText.alignment   = TextAlignmentOptions.Center;

            // Botón pausa
            _pauseBtn = UIBuilder.Button(topBar.transform, "PauseBtn", "II",
                ColorPalette.ButtonSecondary,
                new Vector2(0.78f, 0.1f), new Vector2(0.96f, 0.9f));
            _pauseBtn.onClick.AddListener(OnPauseClicked);

            // ── Bottom bar ───────────────────────────────────────────────────
            var bottomBar = UIBuilder.Panel(canvas.transform, "BottomBar",
                new Vector2(0, 0), new Vector2(1, 0),
                new Vector2(0, 0), new Vector2(0, 80));
            bottomBar.color = ColorPalette.PanelBg;

            _restartBtn = UIBuilder.Button(bottomBar.transform, "RestartBtn", "↺",
                ColorPalette.ButtonDanger,
                new Vector2(0.38f, 0.08f), new Vector2(0.62f, 0.92f));
            _restartBtn.onClick.AddListener(OnRestartClicked);
        }

        // ── Eventos ──────────────────────────────────────────────────────────

        private void SubscribeEvents()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnMovesChanged += UpdateMoves;
            GameManager.Instance.OnLevelLoaded  += UpdateLevel;
        }

        private void UnsubscribeEvents()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnMovesChanged -= UpdateMoves;
            GameManager.Instance.OnLevelLoaded  -= UpdateLevel;
        }

        private void RefreshFromGameManager()
        {
            if (GameManager.Instance == null) return;
            UpdateMoves(GameManager.Instance.MovesRemaining);
            UpdateLevel(GameManager.Instance.CurrentLevelIndex);
        }

        // ── Actualización de texto ───────────────────────────────────────────

        private void UpdateMoves(int moves)
        {
            if (_movesText == null) return;
            _movesText.text  = moves.ToString();
            _movesText.color = moves <= 3 ? ColorPalette.ButtonDanger : ColorPalette.TextPrimary;
        }

        private void UpdateLevel(int idx)
        {
            if (_levelText == null) return;
            _levelText.text = $"LEVEL {idx + 1:D2}";
        }

        // ── Botones ──────────────────────────────────────────────────────────

        private void OnPauseClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            GameManager.Instance?.SetPaused(true);
            PopupManager.Instance?.ShowPausePopup();
        }

        private void OnRestartClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            GameManager.Instance?.RestartLevel();
        }
    }
}
