using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace PrismShift
{
    /// <summary>
    /// Centraliza la carga de escenas con fundidos opcionales.
    /// </summary>
    public class SceneFlowManager : MonoBehaviour
    {
        public static SceneFlowManager Instance { get; private set; }

        public const string SCENE_MAIN_MENU    = "MainMenu";
        public const string SCENE_LEVEL_SELECT = "LevelSelect";
        public const string SCENE_GAMEPLAY     = "Gameplay";

        [SerializeField] private float transitionDuration = 0.25f;

        private CanvasGroup _fadeGroup;
        private bool _isTransitioning;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start() => CreateFadeOverlay();

        // ── Carga de escenas ─────────────────────────────────────────────────

        public void LoadMainMenu()    => LoadScene(SCENE_MAIN_MENU);
        public void LoadLevelSelect() => LoadScene(SCENE_LEVEL_SELECT);

        public void LoadGameplay(int levelIndex)
        {
            GameManager.Instance?.StartLevel(levelIndex);
            LoadScene(SCENE_GAMEPLAY);
        }

        public void LoadGameplay() => LoadScene(SCENE_GAMEPLAY);

        private void LoadScene(string name)
        {
            if (_isTransitioning) return;
            StartCoroutine(TransitionTo(name));
        }

        private IEnumerator TransitionTo(string sceneName)
        {
            _isTransitioning = true;

            // Fundido a negro
            if (_fadeGroup != null)
                yield return AnimationHelper.FadeAlpha(_fadeGroup, 0f, 1f, transitionDuration);

            SceneManager.LoadScene(sceneName);
            yield return null; // Un frame para que cargue

            // Fundido desde negro
            if (_fadeGroup != null)
                yield return AnimationHelper.FadeAlpha(_fadeGroup, 1f, 0f, transitionDuration);

            _isTransitioning = false;
        }

        // ── Overlay de fundido ───────────────────────────────────────────────

        private void CreateFadeOverlay()
        {
            var canvasGo = new GameObject("FadeCanvas");
            DontDestroyOnLoad(canvasGo);

            var canvas = canvasGo.AddComponent<Canvas>();
            canvas.renderMode  = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 999;

            var img = new GameObject("FadeImage").AddComponent<UnityEngine.UI.Image>();
            img.transform.SetParent(canvasGo.transform, false);
            img.color = Color.black;
            var rect = img.GetComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = rect.offsetMax = Vector2.zero;

            _fadeGroup = canvasGo.AddComponent<CanvasGroup>();
            _fadeGroup.alpha          = 0f;
            _fadeGroup.blocksRaycasts = false;
            _fadeGroup.interactable   = false;
        }
    }
}
