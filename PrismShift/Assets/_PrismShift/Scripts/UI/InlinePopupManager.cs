using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Gestiona los popups de victoria, derrota y pausa.
    /// Se construye sobre el PopupCanvas (sortOrder 20).
    /// </summary>
    public class InlinePopupManager : MonoBehaviour
    {
        public static InlinePopupManager Instance { get; private set; }

        private GameObject _victoryPanel;
        private GameObject _defeatPanel;
        private GameObject _pausePanel;
        private Transform[] _stars = new Transform[3];

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void Start()
        {
            BuildAllPopups();
            SubscribeEvents();
        }

        private void OnDestroy() => UnsubscribeEvents();

        // ── Construcción ─────────────────────────────────────────────────────

        private void BuildAllPopups()
        {
            _victoryPanel = BuildVictory();
            _defeatPanel  = BuildDefeat();
            _pausePanel   = BuildPause();

            _victoryPanel.SetActive(false);
            _defeatPanel.SetActive(false);
            _pausePanel.SetActive(false);
        }

        private GameObject BuildVictory()
        {
            var overlay = Overlay("VictoryOverlay");
            var card    = Card(overlay.transform, "VCard");

            UIBuilder.TextLabel(card, "Title", "LEVEL COMPLETE!", 40,
                ColorPalette.ButtonPrimary,
                new Vector2(0.04f, 0.74f), new Vector2(0.96f, 0.94f))
                .fontStyle = FontStyles.Bold;

            // Estrellas
            for (int i = 0; i < 3; i++)
            {
                var sGo = new GameObject($"Star{i}");
                sGo.transform.SetParent(card, false);
                var srt = sGo.AddComponent<RectTransform>();
                float x = 0.16f + i * 0.24f;
                srt.anchorMin = new Vector2(x, 0.54f);
                srt.anchorMax = new Vector2(x + 0.22f, 0.76f);
                srt.offsetMin = srt.offsetMax = Vector2.zero;
                var si  = sGo.AddComponent<Image>();
                si.sprite         = PlaceholderAssets.StarEmptySprite();
                si.color          = new Color(0.35f, 0.30f, 0.12f);
                si.preserveAspect = true;
                _stars[i] = sGo.transform;
            }

            UIBuilder.TextLabel(card, "MovesTxt", "", 24, ColorPalette.TextDim,
                new Vector2(0.1f, 0.44f), new Vector2(0.9f, 0.56f))
                .name = "MovesRemainingTxt";

            var next = UIBuilder.Button(card, "NextBtn", "NEXT  →",
                ColorPalette.ButtonPrimary,
                new Vector2(0.08f, 0.20f), new Vector2(0.92f, 0.40f));
            next.onClick.AddListener(OnNext);

            var retry = UIBuilder.Button(card, "RetryBtn", "↺ RETRY",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.02f), new Vector2(0.50f, 0.18f), 24);
            retry.onClick.AddListener(OnRetry);

            var home = UIBuilder.Button(card, "HomeBtn", "⌂ HOME",
                ColorPalette.ButtonSecondary,
                new Vector2(0.52f, 0.02f), new Vector2(0.92f, 0.18f), 24);
            home.onClick.AddListener(OnHome);

            return overlay;
        }

        private GameObject BuildDefeat()
        {
            var overlay = Overlay("DefeatOverlay");
            var card    = Card(overlay.transform, "DCard");

            UIBuilder.TextLabel(card, "Title", "LEVEL FAILED", 42,
                ColorPalette.ButtonDanger,
                new Vector2(0.04f, 0.68f), new Vector2(0.96f, 0.90f))
                .fontStyle = FontStyles.Bold;

            UIBuilder.TextLabel(card, "Sub", "Out of moves", 28, ColorPalette.TextDim,
                new Vector2(0.1f, 0.52f), new Vector2(0.9f, 0.68f));

            var retry = UIBuilder.Button(card, "RetryBtn", "↺ RETRY",
                ColorPalette.ButtonDanger,
                new Vector2(0.08f, 0.28f), new Vector2(0.92f, 0.50f));
            retry.onClick.AddListener(OnRetry);

            var home = UIBuilder.Button(card, "HomeBtn", "⌂ HOME",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.06f), new Vector2(0.92f, 0.26f));
            home.onClick.AddListener(OnHome);

            return overlay;
        }

        private GameObject BuildPause()
        {
            var overlay = Overlay("PauseOverlay");
            var card    = Card(overlay.transform, "PCard");

            UIBuilder.TextLabel(card, "Title", "PAUSED", 48, ColorPalette.TextPrimary,
                new Vector2(0.05f, 0.72f), new Vector2(0.95f, 0.92f))
                .fontStyle = FontStyles.Bold;

            var resume = UIBuilder.Button(card, "ResumeBtn", "▶ RESUME",
                ColorPalette.ButtonPrimary,
                new Vector2(0.08f, 0.50f), new Vector2(0.92f, 0.70f));
            resume.onClick.AddListener(OnResume);

            var restart = UIBuilder.Button(card, "RestartBtn", "↺ RESTART",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.28f), new Vector2(0.92f, 0.48f));
            restart.onClick.AddListener(OnRetry);

            var home = UIBuilder.Button(card, "HomeBtn", "⌂ HOME",
                ColorPalette.ButtonSecondary,
                new Vector2(0.08f, 0.06f), new Vector2(0.92f, 0.26f));
            home.onClick.AddListener(OnHome);

            return overlay;
        }

        // ── Mostrar ──────────────────────────────────────────────────────────

        public void ShowVictory(int stars)
        {
            UpdateMovesLabel();
            _victoryPanel.SetActive(true);
            StartCoroutine(VictoryEntrance(stars));
        }

        public void ShowDefeat()
        {
            _defeatPanel.SetActive(true);
            StartCoroutine(AnimationHelper.PopIn(_defeatPanel.transform.GetChild(0), 0.3f));
        }

        public void ShowPause()
        {
            _pausePanel.SetActive(true);
            StartCoroutine(AnimationHelper.PopIn(_pausePanel.transform.GetChild(0), 0.25f));
        }

        private IEnumerator VictoryEntrance(int stars)
        {
            yield return AnimationHelper.PopIn(_victoryPanel.transform.GetChild(0), 0.3f);
            for (int i = 0; i < 3; i++)
            {
                yield return new WaitForSeconds(0.18f);
                if (i < stars)
                {
                    var img = _stars[i].GetComponent<Image>();
                    img.sprite = PlaceholderAssets.StarSprite();
                    img.color  = ColorPalette.StarColor;
                    AudioManager.Instance?.PlayStarAppear();
                    StartCoroutine(AnimationHelper.ScalePunch(_stars[i], 1.4f, 0.3f));
                }
            }
        }

        private void UpdateMovesLabel()
        {
            var all = _victoryPanel.GetComponentsInChildren<TextMeshProUGUI>();
            foreach (var t in all)
                if (t.name == "MovesRemainingTxt")
                    t.text = $"Moves remaining: {GameManager.Instance?.MovesRemaining ?? 0}";
        }

        // ── Botones ──────────────────────────────────────────────────────────

        private void OnNext()
        {
            AudioManager.Instance?.PlayButtonClick();
            HideAll();
            GameManager.Instance?.GoToNextLevel();
        }

        private void OnRetry()
        {
            AudioManager.Instance?.PlayButtonClick();
            HideAll();
            GameManager.Instance?.SetPaused(false);
            GameManager.Instance?.RestartLevel();
        }

        private void OnHome()
        {
            AudioManager.Instance?.PlayButtonClick();
            HideAll();
            GameBootstrapper.Instance?.ShowMainMenu();
        }

        private void OnResume()
        {
            AudioManager.Instance?.PlayButtonClick();
            _pausePanel.SetActive(false);
            GameManager.Instance?.SetPaused(false);
        }

        private void HideAll()
        {
            _victoryPanel.SetActive(false);
            _defeatPanel.SetActive(false);
            _pausePanel.SetActive(false);
        }

        // ── Suscripciones ────────────────────────────────────────────────────

        private void SubscribeEvents()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnVictory += ShowVictory;
            GameManager.Instance.OnDefeat  += ShowDefeat;
        }

        private void UnsubscribeEvents()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnVictory -= ShowVictory;
            GameManager.Instance.OnDefeat  -= ShowDefeat;
        }

        // ── Helpers ──────────────────────────────────────────────────────────

        private GameObject Overlay(string name)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(transform, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            var img = go.AddComponent<Image>();
            img.color = new Color(0f, 0f, 0f, 0.75f);
            return go;
        }

        private Transform Card(Transform parent, string name)
        {
            var p = UIBuilder.Panel(parent, name,
                new Vector2(0.08f, 0.27f), new Vector2(0.92f, 0.73f),
                Vector2.zero, Vector2.zero);
            p.color = ColorPalette.PanelBg;
            return p.transform;
        }
    }
}
