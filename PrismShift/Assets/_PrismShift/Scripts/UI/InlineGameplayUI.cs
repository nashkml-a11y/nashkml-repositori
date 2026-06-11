using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// HUD del gameplay: movimientos, nivel, botones de pausa y restart.
    /// Se construye en código y se suscribe a los eventos de GameManager.
    /// </summary>
    public class InlineGameplayUI : MonoBehaviour
    {
        private TextMeshProUGUI _movesText;
        private TextMeshProUGUI _levelText;

        private void Start()
        {
            BuildUI();
            Subscribe();
        }

        private void OnDestroy() => Unsubscribe();

        private void BuildUI()
        {
            var t = transform;

            // ── Top bar ──────────────────────────────────────────────────────
            var top = UIBuilder.Panel(t, "TopBar",
                new Vector2(0f, 1f), new Vector2(1f, 1f),
                new Vector2(0f, -100f), new Vector2(0f, 0f));
            top.color = ColorPalette.PanelBg;

            // Movimientos — bloque izquierdo
            UIBuilder.TextLabel(top.transform, "MovesLbl", "MOVES", 20,
                ColorPalette.TextDim,
                new Vector2(0.03f, 0.55f), new Vector2(0.30f, 0.95f));

            var movesGo = UIBuilder.TextLabel(top.transform, "MovesVal", "10", 52,
                ColorPalette.TextPrimary,
                new Vector2(0.03f, 0.05f), new Vector2(0.30f, 0.60f));
            movesGo.fontStyle = FontStyles.Bold;
            _movesText = movesGo;

            // Nivel — centro
            var lvlGo = UIBuilder.TextLabel(top.transform, "LevelTxt", "LEVEL 01", 30,
                ColorPalette.TextPrimary,
                new Vector2(0.30f, 0.1f), new Vector2(0.72f, 0.9f));
            lvlGo.fontStyle = FontStyles.Bold;
            _levelText = lvlGo;

            // Pausa — derecha
            var pause = UIBuilder.Button(top.transform, "PauseBtn", "⏸",
                ColorPalette.ButtonSecondary,
                new Vector2(0.76f, 0.08f), new Vector2(0.96f, 0.92f), 28);
            pause.onClick.AddListener(OnPauseClicked);

            // ── Bottom bar ───────────────────────────────────────────────────
            var bot = UIBuilder.Panel(t, "BotBar",
                new Vector2(0f, 0f), new Vector2(1f, 0f),
                new Vector2(0f, 0f), new Vector2(0f, 88f));
            bot.color = ColorPalette.PanelBg;

            var restart = UIBuilder.Button(bot.transform, "RestartBtn", "↺ RESTART",
                ColorPalette.ButtonDanger,
                new Vector2(0.25f, 0.08f), new Vector2(0.75f, 0.92f), 26);
            restart.onClick.AddListener(OnRestartClicked);
        }

        // ── Actualización ────────────────────────────────────────────────────

        public void RefreshFromGameManager()
        {
            var gm = GameManager.Instance;
            if (gm == null) return;
            UpdateMoves(gm.MovesRemaining);
            UpdateLevel(gm.CurrentLevelIndex);
        }

        private void UpdateMoves(int moves)
        {
            if (_movesText == null) return;
            _movesText.text  = moves.ToString();
            _movesText.color = moves <= 3 ? ColorPalette.ButtonDanger : ColorPalette.TextPrimary;
        }

        private void UpdateLevel(int idx)
        {
            if (_levelText != null)
                _levelText.text = $"LEVEL {idx + 1:D2}";
        }

        // ── Suscripciones ────────────────────────────────────────────────────

        private void Subscribe()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnMovesChanged += UpdateMoves;
            GameManager.Instance.OnLevelLoaded  += UpdateLevel;
        }

        private void Unsubscribe()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnMovesChanged -= UpdateMoves;
            GameManager.Instance.OnLevelLoaded  -= UpdateLevel;
        }

        // ── Botones ──────────────────────────────────────────────────────────

        private void OnPauseClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            GameManager.Instance?.SetPaused(true);
            InlinePopupManager.Instance?.ShowPause();
        }

        private void OnRestartClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            GameManager.Instance?.RestartLevel();
        }
    }
}
