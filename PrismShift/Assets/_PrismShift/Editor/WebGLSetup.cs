#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;

namespace PrismShift.Editor
{
    /// <summary>
    /// Tools → PrismShift → Setup WebGL (run once)
    /// Crea una sola escena "PrismShift" que arranca el juego completo sin depender
    /// de ninguna configuración adicional. Ideal para build WebGL.
    /// </summary>
    public static class WebGLSetup
    {
        [MenuItem("Tools/PrismShift/🌐  Setup WebGL (run once)")]
        public static void SetupWebGL()
        {
            CreateBootstrapScene();
            ConfigureWebGLPlayerSettings();
            SetWebGLBuildSettings();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorUtility.DisplayDialog("PrismShift — WebGL",
                "¡Listo para WebGL!\n\n" +
                "Pasos para obtener el build:\n" +
                "1. File → Build Settings\n" +
                "2. Platform: WebGL → Switch Platform\n" +
                "3. Build (elige carpeta 'WebGLBuild')\n" +
                "4. Sube la carpeta a itch.io o Unity Play",
                "OK");
        }

        // ── Escena única ──────────────────────────────────────────────────────

        private static void CreateBootstrapScene()
        {
            const string path = "Assets/Scenes/PrismShift.unity";
            var scene = EditorSceneManager.NewScene(
                NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Cámara principal
            var camGo = new GameObject("Main Camera");
            var cam   = camGo.AddComponent<Camera>();
            cam.clearFlags       = CameraClearFlags.SolidColor;
            cam.backgroundColor  = ColorPalette.Background;
            cam.orthographic     = true;
            cam.orthographicSize = 5f;
            cam.tag = "MainCamera";
            camGo.AddComponent<AudioListener>();

            // EventSystem
            var esGo = new GameObject("EventSystem");
            esGo.AddComponent<EventSystem>();
            esGo.AddComponent<StandaloneInputModule>();

            // GameBootstrapper — todo lo demás se crea en runtime
            var bootGo = new GameObject("GameBootstrapper");
            bootGo.AddComponent<GameBootstrapper>();

            EditorSceneManager.SaveScene(scene, path);
            Debug.Log($"[PrismShift] Escena WebGL creada: {path}");
        }

        // ── Player Settings para WebGL ────────────────────────────────────────

        private static void ConfigureWebGLPlayerSettings()
        {
            PlayerSettings.productName             = "Prism Shift";
            PlayerSettings.companyName             = "PrismShiftStudio";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.linkerTarget       = WebGLLinkerTarget.Wasm;
            PlayerSettings.defaultScreenWidth       = 540;
            PlayerSettings.defaultScreenHeight      = 960;

            // Orientación portrait para móvil
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
        }

        // ── Build Settings ────────────────────────────────────────────────────

        private static void SetWebGLBuildSettings()
        {
            EditorBuildSettings.scenes = new[]
            {
                new EditorBuildSettingsScene("Assets/Scenes/PrismShift.unity", true)
            };
        }
    }
}
#endif
