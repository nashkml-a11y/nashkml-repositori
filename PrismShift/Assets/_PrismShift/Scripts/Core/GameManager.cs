using System;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Núcleo del juego. Gestiona estado global, movimientos, victoria y derrota.
    /// Persiste entre escenas con DontDestroyOnLoad.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        // ── Estado ───────────────────────────────────────────────────────────

        public GameState CurrentState { get; private set; } = GameState.MainMenu;
        public int CurrentLevelIndex  { get; private set; } = 0;
        public int MovesRemaining     { get; private set; }
        public int TotalMoves         { get; private set; }

        // ── Eventos ──────────────────────────────────────────────────────────

        public event Action<GameState> OnStateChanged;
        public event Action<int>       OnMovesChanged;    // movimientos restantes
        public event Action<int>       OnLevelLoaded;     // índice del nivel cargado
        public event Action<int>       OnVictory;         // estrellas obtenidas
        public event Action            OnDefeat;

        // ── Ciclo de vida ────────────────────────────────────────────────────

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        // ── API pública ──────────────────────────────────────────────────────

        public void SetState(GameState newState)
        {
            if (CurrentState == newState) return;
            CurrentState = newState;
            OnStateChanged?.Invoke(newState);
        }

        public void StartLevel(int levelIndex)
        {
            var data = LevelManager.Instance?.GetLevel(levelIndex);
            if (data == null)
            {
                Debug.LogError($"[GameManager] Sin datos para el nivel {levelIndex}");
                return;
            }

            CurrentLevelIndex = levelIndex;
            TotalMoves        = data.moveLimit;
            MovesRemaining    = data.moveLimit;
            SetState(GameState.Playing);
            OnLevelLoaded?.Invoke(levelIndex);
            OnMovesChanged?.Invoke(MovesRemaining);
        }

        /// <summary>Llamado por MoveController tras cada movimiento válido.</summary>
        public void ConsumeMove()
        {
            if (CurrentState != GameState.Playing && CurrentState != GameState.Moving) return;
            if (MovesRemaining <= 0) return;

            MovesRemaining--;
            OnMovesChanged?.Invoke(MovesRemaining);
        }

        /// <summary>Llamado por BoardManager cuando todos los portales están completos.</summary>
        public void TriggerVictory()
        {
            if (CurrentState is GameState.Victory or GameState.Defeat) return;

            int stars = CalculateStars();
            SaveManager.Instance?.SaveLevelProgress(CurrentLevelIndex + 1, stars);
            SaveManager.Instance?.UnlockLevel(CurrentLevelIndex + 2);

            SetState(GameState.Victory);
            AudioManager.Instance?.PlayLevelWin();
            OnVictory?.Invoke(stars);
        }

        /// <summary>Llamado por BoardManager cuando se agotan los movimientos sin completar.</summary>
        public void TriggerDefeat()
        {
            if (CurrentState is GameState.Victory or GameState.Defeat) return;
            SetState(GameState.Defeat);
            AudioManager.Instance?.PlayLevelLose();
            OnDefeat?.Invoke();
        }

        public void RestartLevel() => StartLevel(CurrentLevelIndex);

        public void GoToNextLevel()
        {
            int next = CurrentLevelIndex + 1;
            if (LevelManager.Instance != null && next < LevelManager.Instance.LevelCount)
                StartLevel(next);
            else
                GoToMainMenu();
        }

        public void GoToMainMenu()
        {
            SetState(GameState.MainMenu);
            SceneFlowManager.Instance?.LoadMainMenu();
        }

        public void GoToLevelSelect()
        {
            SetState(GameState.LevelSelect);
            SceneFlowManager.Instance?.LoadLevelSelect();
        }

        public void SetPaused(bool paused)
        {
            if (paused && CurrentState == GameState.Playing)
                SetState(GameState.Paused);
            else if (!paused && CurrentState == GameState.Paused)
                SetState(GameState.Playing);
        }

        public bool CanAcceptInput =>
            CurrentState == GameState.Playing;

        // ── Helpers ──────────────────────────────────────────────────────────

        public int CalculateStars()
        {
            if (TotalMoves <= 0) return 1;
            float ratio = (float)MovesRemaining / TotalMoves;
            if (ratio >= 0.5f) return 3;
            if (ratio >= 0.2f) return 2;
            return 1;
        }
    }
}
