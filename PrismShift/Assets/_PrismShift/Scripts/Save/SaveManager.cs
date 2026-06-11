using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Persiste progreso con PlayerPrefs. Sustituible por cloud save más adelante.
    /// </summary>
    public class SaveManager : MonoBehaviour
    {
        public static SaveManager Instance { get; private set; }

        private const string KEY_MAX_LEVEL = "prism_max_unlocked_level";
        private const string KEY_STARS     = "prism_level_{0}_stars";

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        // ── Niveles desbloqueados ────────────────────────────────────────────

        public int MaxUnlockedLevel
        {
            get => PlayerPrefs.GetInt(KEY_MAX_LEVEL, 1);
            private set => PlayerPrefs.SetInt(KEY_MAX_LEVEL, value);
        }

        public void UnlockLevel(int levelNumber)
        {
            if (levelNumber > MaxUnlockedLevel)
            {
                MaxUnlockedLevel = levelNumber;
                PlayerPrefs.Save();
            }
        }

        public bool IsLevelUnlocked(int levelNumber) => levelNumber <= MaxUnlockedLevel;

        // ── Estrellas ────────────────────────────────────────────────────────

        public int GetStars(int levelNumber)
            => PlayerPrefs.GetInt(string.Format(KEY_STARS, levelNumber), 0);

        public void SaveLevelProgress(int levelNumber, int stars)
        {
            string key = string.Format(KEY_STARS, levelNumber);
            // Solo guardar si es mejor resultado
            if (stars > PlayerPrefs.GetInt(key, 0))
            {
                PlayerPrefs.SetInt(key, stars);
                PlayerPrefs.Save();
            }
        }

        // ── Reset ────────────────────────────────────────────────────────────

        public void ResetAllProgress()
        {
            PlayerPrefs.DeleteAll();
            PlayerPrefs.Save();
        }
    }
}
