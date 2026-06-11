#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using System.IO;

namespace PrismShift.Editor
{
    /// <summary>
    /// Menú Tools → PrismShift → Recreate Level Assets
    /// Regenera los ScriptableObjects de niveles desde LevelFactory.
    /// Útil si se quieren resetear los niveles o añadir más.
    /// </summary>
    public static class LevelDataCreator
    {
        private const string LEVELS_PATH = "Assets/_PrismShift/Resources/Levels";

        [MenuItem("Tools/PrismShift/↺  Recreate Level Assets")]
        public static void RecreateLevels()
        {
            if (!Directory.Exists(LEVELS_PATH))
                Directory.CreateDirectory(LEVELS_PATH);

            var levels = LevelFactory.CreateAllLevels();
            int created = 0, skipped = 0;

            foreach (var level in levels)
            {
                string path = $"{LEVELS_PATH}/Level_{level.levelNumber:D2}.asset";
                if (File.Exists(path))
                {
                    // Sobreescribir
                    AssetDatabase.DeleteAsset(path);
                }
                AssetDatabase.CreateAsset(level, path);
                created++;
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorUtility.DisplayDialog("PrismShift",
                $"Niveles recreados: {created}\nSkipped: {skipped}",
                "OK");
        }

        [MenuItem("Tools/PrismShift/✎  Open Level in Inspector")]
        public static void OpenLevelInspector()
        {
            var gm = Object.FindFirstObjectByType<GameManager>();
            int idx = gm != null ? gm.CurrentLevelIndex : 0;
            string path = $"{LEVELS_PATH}/Level_{(idx + 1):D2}.asset";
            var asset = AssetDatabase.LoadAssetAtPath<LevelData>(path);
            if (asset != null)
                Selection.activeObject = asset;
            else
                EditorUtility.DisplayDialog("PrismShift",
                    $"No se encontró el asset: {path}\nEjecuta Setup Project primero.",
                    "OK");
        }
    }
}
#endif
