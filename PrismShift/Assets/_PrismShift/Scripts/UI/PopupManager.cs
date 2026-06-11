using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Gestiona los popups de victoria, derrota y pausa.
    /// Se construye en código; se coloca sobre el Canvas principal.
    /// </summary>
    public class PopupManager : MonoBehaviour
    {
        public static PopupManager Instance { get; private set; }

        private Canvas      _canvas;
        private GameObject  _victoryPanel;
        private GameObject  _defeatPanel;
        private GameObject  _pausePanel;

        private Transform[] _victoryStars = new Transform[3];

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void Start()
        {
            _canvas = GetComponent<Canvas>() ?? GetComponentInParent<Canvas>();
            if (_canvas == null) return;

            BuildVictoryPanel();
            BuildDefeatPanel();
            BuildPausePanel();

            // Suscribir eventos
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnVictory += ShowVictoryPopup;
                GameManager.Instance.OnDefeat  += ShowDefeatPopup;
            }
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnVictory -= ShowVictoryPopup;
                GameManager.Instance.OnDefeat  -= ShowDefeatPopup;
            }
        }

        // ── Victoria ─────────────────────────────────────────────────────────

        private void BuildVictoryPanel()
        {
            _victoryPanel = BuildOverlayPanel("VictoryPanel");

            var card = BuildCard(_victoryPanel.transform, "VictoryCard");

            UIBuilder.TextLabel(card, "Title", "LEVEL COMPLETE!", 42, ColorPalette.ButtonPrimary,
                new Vector2(0.05f, 0.72f), new Vector2(0.95f, 0.92f));

            // Estrellas
            for (int i = 0; i < 3; i++)
            {
                var starGo   = new GameObject($"Star_{i}");
                starGo.transform.SetParent(card, false);
                var starImg  = starGo.AddComponent<Image>();
                starImg.sprite         = PlaceholderAssets.StarEmptySprite();
                starImg.color          = new Color(0.4f, 0.35f, 0.15f);
                starImg.preserveAspect = true;
                var rt = starGo.GetComponent<RectTransform>();
                float xMin = 0.18f + i * 0.22f;
                rt.anchorMin = new Vector2(xMin, 0.54f);
                rt.anchorMax = new Vector2(xMin + 0.20f, 0.74f);
                rt.offsetMin = rt.offsetMax = Vector2.zero;
                _victoryStars[i] = starGo.transform;
            }

            UIBuilder.TextLabel(card, "MovesLabel", "", 26, ColorPalette.TextDim,
                new Vector2(0.1f, 0.42f), new Vector2(0.9f, 0.54f)).name = "MovesRemainingText";

            // Botones
            var nextBtn  = UIBuilder.Button(card, "NextBtn",  "NEXT →",
                ColorPalette.ButtonPrimary,
                new Vector2(0.08f, 0.18f), new Vector2(0.92f, 0.38f));
            nextBtn.onClick.AddListener(OnNextClicked);

            var retryBtn = UIBuilder.Button(card, "RetryBtn", "↺ RETRY",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.02f), new Vector2(0.50f, 0.17f), 24);
            retryBtn.onClick.AddListener(OnRetryClicked);

            var homeBtn  = UIBuilder.Button(card, "HomeBtn",  "⌂ HOME",
                ColorPalette.ButtonSecondary,
                new Vector2(0.52f, 0.02f), new Vector2(0.92f, 0.17f), 24);
            homeBtn.onClick.AddListener(OnHomeClicked);

            _victoryPanel.SetActive(false);
        }

        private void BuildDefeatPanel()
        {
            _defeatPanel = BuildOverlayPanel("DefeatPanel");

            var card = BuildCard(_defeatPanel.transform, "DefeatCard");

            UIBuilder.TextLabel(card, "Title", "LEVEL FAILED", 42, ColorPalette.ButtonDanger,
                new Vector2(0.05f, 0.70f), new Vector2(0.95f, 0.90f));

            UIBuilder.TextLabel(card, "Sub", "OUT OF MOVES", 28, ColorPalette.TextDim,
                new Vector2(0.05f, 0.52f), new Vector2(0.95f, 0.68f));

            var retryBtn = UIBuilder.Button(card, "RetryBtn", "↺ RETRY",
                ColorPalette.ButtonDanger,
                new Vector2(0.08f, 0.28f), new Vector2(0.92f, 0.50f));
            retryBtn.onClick.AddListener(OnRetryClicked);

            var homeBtn  = UIBuilder.Button(card, "HomeBtn",  "⌂ HOME",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.06f), new Vector2(0.92f, 0.26f));
            homeBtn.onClick.AddListener(OnHomeClicked);

            _defeatPanel.SetActive(false);
        }

        private void BuildPausePanel()
        {
            _pausePanel = BuildOverlayPanel("PausePanel");

            var card = BuildCard(_pausePanel.transform, "PauseCard");

            UIBuilder.TextLabel(card, "Title", "PAUSED", 46, ColorPalette.TextPrimary,
                new Vector2(0.05f, 0.72f), new Vector2(0.95f, 0.92f));

            var resumeBtn  = UIBuilder.Button(card, "ResumeBtn", "▶ RESUME",
                ColorPalette.ButtonPrimary,
                new Vector2(0.08f, 0.50f), new Vector2(0.92f, 0.70f));
            resumeBtn.onClick.AddListener(OnResumeClicked);

            var restartBtn = UIBuilder.Button(card, "RestartBtn", "↺ RESTART",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.28f), new Vector2(0.92f, 0.48f));
            restartBtn.onClick.AddListener(OnRetryClicked);

            var homeBtn    = UIBuilder.Button(card, "HomeBtn", "⌂ HOME",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.06f), new Vector2(0.92f, 0.26f));
            homeBtn.onClick.AddListener(OnHomeClicked);

            _pausePanel.SetActive(false);
        }

        // ── Mostrar popups ───────────────────────────────────────────────────

        public void ShowVictoryPopup(int stars)
        {
            UpdateVictoryMovesText();
            _victoryPanel.SetActive(true);
            StartCoroutine(VictoryEntrance(stars));
        }

        public void ShowDefeatPopup()
        {
            _defeatPanel.SetActive(true);
            StartCoroutine(AnimationHelper.PopIn(_defeatPanel.transform.GetChild(0), 0.3f));
        }

        public void ShowPausePopup()
        {
            _pausePanel.SetActive(true);
            StartCoroutine(AnimationHelper.PopIn(_pausePanel.transform.GetChild(0), 0.25f));
        }

        private IEnumerator VictoryEntrance(int stars)
        {
            var card = _victoryPanel.transform.GetChild(0);
            yield return AnimationHelper.PopIn(card, 0.3f);

            // Encender estrellas en secuencia
            for (int i = 0; i < 3; i++)
            {
                if (i < stars)
                {
                    var img = _victoryStars[i].GetComponent<Image>();
                    img.sprite = PlaceholderAssets.StarSprite();
                    img.color  = ColorPalette.StarColor;
                    AudioManager.Instance?.PlayStarAppear();
                }
                yield return new WaitForSeconds(0.18f);
                StartCoroutine(AnimationHelper.ScalePunch(_victoryStars[i], 1.35f, 0.3f));
            }
        }

        private void UpdateVictoryMovesText()
        {
            var gm = GameManager.Instance;
            if (gm == null) return;
            var t = _victoryPanel.GetComponentInChildren<TextMeshProUGUI>();
            // Buscar el label de movimientos
            var all = _victoryPanel.GetComponentsInChildren<TextMeshProUGUI>();
            foreach (var tmp in all)
            {
                if (tmp.gameObject.name == "MovesRemainingText")
                    tmp.text = $"Moves left: {gm.MovesRemaining}";
            }
        }

        // ── Botones ──────────────────────────────────────────────────────────

        private void OnNextClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            _victoryPanel.SetActive(false);
            GameManager.Instance?.GoToNextLevel();
        }

        private void OnRetryClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            _victoryPanel.SetActive(false);
            _defeatPanel.SetActive(false);
            _pausePanel.SetActive(false);
            GameManager.Instance?.SetPaused(false);
            GameManager.Instance?.RestartLevel();
        }

        private void OnHomeClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            _victoryPanel.SetActive(false);
            _defeatPanel.SetActive(false);
            _pausePanel.SetActive(false);
            GameManager.Instance?.GoToMainMenu();
        }

        private void OnResumeClicked()
        {
            AudioManager.Instance?.PlayButtonClick();
            _pausePanel.SetActive(false);
            GameManager.Instance?.SetPaused(false);
        }

        // ── Helpers de construcción ──────────────────────────────────────────

        private GameObject BuildOverlayPanel(string name)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(_canvas.transform, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;

            // Fondo oscuro semitransparente
            var img = go.AddComponent<Image>();
            img.color = new Color(0f, 0f, 0f, 0.72f);

            go.AddComponent<CanvasGroup>();
            return go;
        }

        private Transform BuildCard(Transform parent, string name)
        {
            var panel = UIBuilder.Panel(parent, name,
                new Vector2(0.08f, 0.28f), new Vector2(0.92f, 0.72f),
                Vector2.zero, Vector2.zero);
            panel.color = ColorPalette.PanelBg;
            return panel.transform;
        }
    }
}
