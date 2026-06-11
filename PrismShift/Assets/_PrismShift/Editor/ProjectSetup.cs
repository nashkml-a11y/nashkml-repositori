#if UNITY_EDITOR
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace PrismShift.Editor
{
    /// <summary>
    /// Menú Tools → PrismShift → Setup Project
    /// Crea de una sola vez: niveles, config, tres escenas completas y las añade al Build Settings.
    /// Ejecutar una vez al abrir el proyecto por primera vez.
    /// </summary>
    public static class ProjectSetup
    {
        private const string SCENES_PATH  = "Assets/Scenes";
        private const string LEVELS_PATH  = "Assets/_PrismShift/Resources/Levels";
        private const string CONFIG_PATH  = "Assets/_PrismShift/Resources/Config";

        [MenuItem("Tools/PrismShift/▶  Setup Project (run once)")]
        public static void SetupProject()
        {
            EnsureFolders();
            CreateLevelAssets();
            CreateScenes();
            SetBuildSettings();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("✅ [PrismShift] Proyecto configurado correctamente.");
            EditorUtility.DisplayDialog("PrismShift Setup",
                "¡Proyecto configurado!\n\n" +
                "• 10 niveles creados en Resources/Levels\n" +
                "• Escenas MainMenu, LevelSelect y Gameplay creadas\n" +
                "• Escenas añadidas al Build Settings\n\n" +
                "Pulsa Play desde la escena MainMenu para empezar.",
                "OK");
        }

        // ── Carpetas ──────────────────────────────────────────────────────────

        private static void EnsureFolders()
        {
            foreach (var path in new[]
            {
                SCENES_PATH, LEVELS_PATH, CONFIG_PATH,
                "Assets/_PrismShift/Resources"
            })
            {
                if (!Directory.Exists(path))
                    Directory.CreateDirectory(path);
            }
        }

        // ── LevelData ScriptableObjects ───────────────────────────────────────

        private static void CreateLevelAssets()
        {
            var levels = LevelFactory.CreateAllLevels();
            foreach (var level in levels)
            {
                string path = $"{LEVELS_PATH}/Level_{level.levelNumber:D2}.asset";
                if (!File.Exists(path))
                {
                    AssetDatabase.CreateAsset(level, path);
                    Debug.Log($"  Creado {path}");
                }
            }
        }

        // ── Escenas ───────────────────────────────────────────────────────────

        private static void CreateScenes()
        {
            CreateMainMenuScene();
            CreateLevelSelectScene();
            CreateGameplayScene();
        }

        private static void CreateMainMenuScene()
        {
            string path = $"{SCENES_PATH}/MainMenu.unity";
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Cámara
            var camGo = new GameObject("Main Camera");
            var cam   = camGo.AddComponent<Camera>();
            cam.clearFlags       = CameraClearFlags.SolidColor;
            cam.backgroundColor  = ColorPalette.Background;
            cam.orthographic     = true;
            camGo.AddComponent<AudioListener>();
            camGo.tag = "MainCamera";

            // Managers persistentes (sólo en la primera escena)
            var managersGo = new GameObject("PersistentManagers");
            managersGo.AddComponent<GameManager>();
            managersGo.AddComponent<LevelManager>();
            managersGo.AddComponent<SaveManager>();
            managersGo.AddComponent<AudioManager>();
            managersGo.AddComponent<SceneFlowManager>();

            // Canvas
            var canvas = CreateCanvas("MainCanvas", sortOrder: 0);
            canvas.AddComponent<MainMenuUI>();

            CreateEventSystem();

            EditorSceneManager.SaveScene(scene, path);
            Debug.Log($"  Escena creada: {path}");
        }

        private static void CreateLevelSelectScene()
        {
            string path = $"{SCENES_PATH}/LevelSelect.unity";
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            CreateBasicCamera();
            var canvas = CreateCanvas("MainCanvas", sortOrder: 0);
            canvas.AddComponent<LevelSelectUI>();
            CreateEventSystem();

            EditorSceneManager.SaveScene(scene, path);
            Debug.Log($"  Escena creada: {path}");
        }

        private static void CreateGameplayScene()
        {
            string path = $"{SCENES_PATH}/Gameplay.unity";
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Cámara
            var camGo = CreateBasicCamera();
            camGo.GetComponent<Camera>().orthographicSize = 4.5f;

            // BoardManager en un GameObject separado
            var boardGo = new GameObject("BoardManager");
            boardGo.AddComponent<BoardManager>();

            // MoveController + InputController
            var inputGo = new GameObject("InputSystem");
            inputGo.AddComponent<MoveController>();
            inputGo.AddComponent<InputController>();

            // Canvas HUD
            var hudCanvas = CreateCanvas("HUDCanvas", sortOrder: 10);
            hudCanvas.AddComponent<GameplayUI>();

            // Canvas Popups (orden superior)
            var popupCanvas = CreateCanvas("PopupCanvas", sortOrder: 20);
            popupCanvas.AddComponent<PopupManager>();

            CreateEventSystem();

            EditorSceneManager.SaveScene(scene, path);
            Debug.Log($"  Escena creada: {path}");
        }

        // ── Build Settings ────────────────────────────────────────────────────

        private static void SetBuildSettings()
        {
            var scenes = new List<EditorBuildSettingsScene>
            {
                new EditorBuildSettingsScene($"{SCENES_PATH}/MainMenu.unity",    true),
                new EditorBuildSettingsScene($"{SCENES_PATH}/LevelSelect.unity", true),
                new EditorBuildSettingsScene($"{SCENES_PATH}/Gameplay.unity",    true)
            };
            EditorBuildSettings.scenes = scenes.ToArray();
            Debug.Log("  Build Settings actualizados.");
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private static GameObject CreateBasicCamera()
        {
            var go  = new GameObject("Main Camera");
            var cam = go.AddComponent<Camera>();
            cam.clearFlags      = CameraClearFlags.SolidColor;
            cam.backgroundColor = ColorPalette.Background;
            cam.orthographic    = true;
            go.AddComponent<AudioListener>();
            go.tag = "MainCamera";
            return go;
        }

        private static GameObject CreateCanvas(string name, int sortOrder)
        {
            var go     = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode  = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = sortOrder;

            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode         = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080, 1920);
            scaler.matchWidthOrHeight  = 0.5f;

            go.AddComponent<GraphicRaycaster>();
            return go;
        }

        private static void CreateEventSystem()
        {
            var go = new GameObject("EventSystem");
            go.AddComponent<EventSystem>();
            go.AddComponent<StandaloneInputModule>();
        }
    }
}
#endif
