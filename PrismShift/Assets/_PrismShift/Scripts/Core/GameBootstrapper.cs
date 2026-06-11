using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Punto de entrada único para WebGL y cualquier plataforma.
    /// Crea en runtime toda la jerarquía del juego: managers, canvas, panels, board.
    /// No requiere ejecutar el Setup del editor ni tener escenas configuradas.
    /// </summary>
    public class GameBootstrapper : MonoBehaviour
    {
        // ── Instancia ────────────────────────────────────────────────────────
        public static GameBootstrapper Instance { get; private set; }

        // ── Panels principales ───────────────────────────────────────────────
        private GameObject _mainMenuPanel;
        private GameObject _levelSelectPanel;
        private GameObject _gameplayPanel;

        // ── Canvas raíz ──────────────────────────────────────────────────────
        private Canvas _mainCanvas;
        private Canvas _popupCanvas;

        // ── Gameplay ─────────────────────────────────────────────────────────
        private BoardManager    _boardManager;
        private MoveController  _moveController;
        private InputController _inputController;

        // ── UI controllers ───────────────────────────────────────────────────
        private InlineMainMenuUI    _mainMenuUI;
        private InlineLevelSelectUI _levelSelectUI;
        private InlineGameplayUI    _gameplayUI;
        private InlinePopupManager  _popupManager;

        // ── Fade ─────────────────────────────────────────────────────────────
        private CanvasGroup _fadeGroup;
        private const float FADE_DURATION = 0.2f;

        // ── Arranque ─────────────────────────────────────────────────────────

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void AutoBootstrap()
        {
            // Si ya existe un bootstrapper en la escena (colocado en editor) no hacer nada
            if (FindFirstObjectByType<GameBootstrapper>() != null) return;

            var go = new GameObject("GameBootstrapper");
            go.AddComponent<GameBootstrapper>();
            DontDestroyOnLoad(go);
        }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private IEnumerator Start()
        {
            // Esperar un frame para que los managers se inicialicen
            yield return null;
            BuildGame();
            ShowMainMenu();
        }

        // ── Construcción del juego ───────────────────────────────────────────

        private void BuildGame()
        {
            SetupCamera();
            SetupManagers();
            SetupEventSystem();
            SetupCanvases();
            SetupFadeOverlay();
            BuildMainMenuPanel();
            BuildLevelSelectPanel();
            BuildGameplayPanel();
            BuildPopupLayer();
        }

        private void SetupCamera()
        {
            if (Camera.main != null) return;
            var go  = new GameObject("Main Camera");
            var cam = go.AddComponent<Camera>();
            cam.clearFlags      = CameraClearFlags.SolidColor;
            cam.backgroundColor = ColorPalette.Background;
            cam.orthographic    = true;
            cam.orthographicSize = 5f;
            cam.tag = "MainCamera";
            go.AddComponent<AudioListener>();
        }

        private void SetupManagers()
        {
            EnsureManager<GameManager>();
            EnsureManager<LevelManager>();
            EnsureManager<SaveManager>();
            EnsureManager<AudioManager>();

            // Suscribir eventos de GameManager
            GameManager.Instance.OnLevelLoaded += OnLevelLoaded;
        }

        private T EnsureManager<T>() where T : MonoBehaviour
        {
            var existing = FindFirstObjectByType<T>();
            if (existing != null) return existing;
            var go = new GameObject(typeof(T).Name);
            DontDestroyOnLoad(go);
            return go.AddComponent<T>();
        }

        private void SetupEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() != null) return;
            var go = new GameObject("EventSystem");
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
        }

        private void SetupCanvases()
        {
            _mainCanvas  = CreateCanvas("MainCanvas",  sortOrder: 0);
            _popupCanvas = CreateCanvas("PopupCanvas", sortOrder: 20);
        }

        private Canvas CreateCanvas(string name, int sortOrder)
        {
            var go     = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode   = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = sortOrder;

            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight  = 0.5f;

            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        private void SetupFadeOverlay()
        {
            var go  = new GameObject("FadeOverlay");
            go.transform.SetParent(_popupCanvas.transform, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            var img = go.AddComponent<Image>();
            img.color = Color.black;
            _fadeGroup = go.AddComponent<CanvasGroup>();
            _fadeGroup.alpha          = 0f;
            _fadeGroup.blocksRaycasts = false;
        }

        // ── Panels ───────────────────────────────────────────────────────────

        private void BuildMainMenuPanel()
        {
            _mainMenuPanel = CreateFullPanel(_mainCanvas.transform, "MainMenuPanel");
            _mainMenuUI    = _mainMenuPanel.AddComponent<InlineMainMenuUI>();
        }

        private void BuildLevelSelectPanel()
        {
            _levelSelectPanel = CreateFullPanel(_mainCanvas.transform, "LevelSelectPanel");
            _levelSelectUI    = _levelSelectPanel.AddComponent<InlineLevelSelectUI>();
        }

        private void BuildGameplayPanel()
        {
            _gameplayPanel = CreateFullPanel(_mainCanvas.transform, "GameplayPanel");
            _gameplayUI    = _gameplayPanel.AddComponent<InlineGameplayUI>();

            // Board (en espacio world, detrás del canvas)
            var boardGo    = new GameObject("BoardManager");
            _boardManager  = boardGo.AddComponent<BoardManager>();

            var inputGo    = new GameObject("InputSystem");
            _moveController  = inputGo.AddComponent<MoveController>();
            _inputController = inputGo.AddComponent<InputController>();
        }

        private void BuildPopupLayer()
        {
            var popupGo  = new GameObject("PopupManager");
            popupGo.transform.SetParent(_popupCanvas.transform, false);
            var rt = popupGo.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            popupGo.AddComponent<Canvas>(); // necesario para que PopupManager encuentre canvas
            _popupManager = popupGo.AddComponent<InlinePopupManager>();
        }

        private static GameObject CreateFullPanel(Transform parent, string name)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            return go;
        }

        // ── Navegación ───────────────────────────────────────────────────────

        public void ShowMainMenu()
        {
            StartCoroutine(NavigateTo(() =>
            {
                SetPanelActive(_mainMenuPanel,   true);
                SetPanelActive(_levelSelectPanel, false);
                SetPanelActive(_gameplayPanel,    false);
                GameManager.Instance?.SetState(GameState.MainMenu);
            }));
        }

        public void ShowLevelSelect()
        {
            StartCoroutine(NavigateTo(() =>
            {
                SetPanelActive(_mainMenuPanel,    false);
                SetPanelActive(_levelSelectPanel, true);
                SetPanelActive(_gameplayPanel,    false);
                _levelSelectUI?.Refresh();
                GameManager.Instance?.SetState(GameState.LevelSelect);
            }));
        }

        public void StartLevel(int levelIndex)
        {
            StartCoroutine(NavigateTo(() =>
            {
                SetPanelActive(_mainMenuPanel,    false);
                SetPanelActive(_levelSelectPanel, false);
                SetPanelActive(_gameplayPanel,    true);
                GameManager.Instance?.StartLevel(levelIndex);
            }));
        }

        private void OnLevelLoaded(int levelIndex)
        {
            _boardManager?.BuildBoard(levelIndex);
            _gameplayUI?.RefreshFromGameManager();
        }

        private IEnumerator NavigateTo(System.Action switchAction)
        {
            if (_fadeGroup != null)
            {
                _fadeGroup.blocksRaycasts = true;
                yield return AnimationHelper.FadeAlpha(_fadeGroup, 0f, 1f, FADE_DURATION);
            }

            switchAction?.Invoke();
            yield return null;

            if (_fadeGroup != null)
            {
                yield return AnimationHelper.FadeAlpha(_fadeGroup, 1f, 0f, FADE_DURATION);
                _fadeGroup.blocksRaycasts = false;
            }
        }

        private static void SetPanelActive(GameObject panel, bool active)
        {
            if (panel != null) panel.SetActive(active);
        }
    }
}
