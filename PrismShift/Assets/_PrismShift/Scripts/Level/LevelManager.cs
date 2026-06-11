using System.Collections.Generic;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Carga y expone los LevelData.
    /// Prioridad: ScriptableObjects en Resources/Levels → fallback en código (LevelFactory).
    /// </summary>
    public class LevelManager : MonoBehaviour
    {
        public static LevelManager Instance { get; private set; }

        private List<LevelData> _levels = new List<LevelData>();
        public int LevelCount => _levels.Count;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadLevels();
        }

        // ── Carga ────────────────────────────────────────────────────────────

        private void LoadLevels()
        {
            var assets = Resources.LoadAll<LevelData>("Levels");
            if (assets != null && assets.Length > 0)
            {
                _levels = new List<LevelData>(assets);
                _levels.Sort((a, b) => a.levelNumber.CompareTo(b.levelNumber));
                Debug.Log($"[LevelManager] {_levels.Count} niveles cargados desde Resources/Levels");
            }
            else
            {
                Debug.LogWarning("[LevelManager] Sin assets en Resources/Levels. Usando datos en código.");
                _levels = LevelFactory.CreateAllLevels();
            }
        }

        // ── API pública ──────────────────────────────────────────────────────

        /// <param name="index">0-based</param>
        public LevelData GetLevel(int index)
        {
            if (index < 0 || index >= _levels.Count)
            {
                Debug.LogError($"[LevelManager] Índice fuera de rango: {index}");
                return null;
            }
            return _levels[index];
        }

        public LevelData GetCurrentLevel()
        {
            int idx = GameManager.Instance?.CurrentLevelIndex ?? 0;
            return GetLevel(idx);
        }

        public bool HasNextLevel(int currentIndex) => currentIndex + 1 < _levels.Count;
    }
}
