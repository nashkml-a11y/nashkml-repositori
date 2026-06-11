using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Intermediario entre InputController y BoardManager.
    /// Valida, ejecuta y descuenta movimientos.
    /// </summary>
    public class MoveController : MonoBehaviour
    {
        public static MoveController Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        /// <summary>
        /// Solicita un movimiento. Si es válido lo ejecuta; si no, dispara feedback de error.
        /// </summary>
        public void RequestMove(int lineIndex, SwipeDirection dir)
        {
            var board = BoardManager.Instance;
            var gm    = GameManager.Instance;
            if (board == null || gm == null) return;
            if (!gm.CanAcceptInput || board.IsAnimating) return;

            bool valid = board.ValidateMove(lineIndex, dir);

            if (!valid)
            {
                // Feedback de movimiento inválido
                AudioManager.Instance?.PlayInvalidMove();
                bool isHorizontal = dir == SwipeDirection.Left || dir == SwipeDirection.Right;
                if (isHorizontal) board.AnimateErrorRow(lineIndex);
                else              board.AnimateErrorColumn(lineIndex);
                return;
            }

            // Movimiento válido
            AudioManager.Instance?.PlaySwipe();
            gm.ConsumeMove();

            board.ExecuteMove(lineIndex, dir, () =>
            {
                // Comprobar derrota sólo si ya se consumió el último movimiento
                if (gm.MovesRemaining <= 0)
                    board.CheckDefeatCondition();
            });
        }
    }
}
