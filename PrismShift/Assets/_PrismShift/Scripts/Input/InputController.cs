using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Detecta swipes táctiles y de ratón. Convierte a fila/columna/dirección
    /// y delega en MoveController.
    /// </summary>
    public class InputController : MonoBehaviour
    {
        [SerializeField] private float minSwipeDist   = 0.25f; // unidades world
        [SerializeField] private float maxSwipeAngle  = 35f;   // grados de tolerancia

        private Vector2 _touchStart;
        private Vector2Int _touchCell = new Vector2Int(-1, -1);
        private bool _dragging;

        private void Update()
        {
            if (GameManager.Instance == null || !GameManager.Instance.CanAcceptInput) return;
            if (BoardManager.Instance == null || BoardManager.Instance.IsAnimating) return;

#if UNITY_EDITOR || UNITY_STANDALONE
            HandleMouseInput();
#else
            HandleTouchInput();
#endif
        }

        // ── Ratón (editor) ───────────────────────────────────────────────────

        private void HandleMouseInput()
        {
            if (Input.GetMouseButtonDown(0))
            {
                _touchStart = Input.mousePosition;
                _touchCell  = BoardManager.Instance.ScreenToGrid(Input.mousePosition);
                _dragging   = _touchCell.x >= 0;
            }
            else if (Input.GetMouseButtonUp(0) && _dragging)
            {
                _dragging = false;
                TryProcessSwipe(Input.mousePosition);
            }
        }

        // ── Touch (móvil) ────────────────────────────────────────────────────

        private void HandleTouchInput()
        {
            if (Input.touchCount == 0) return;
            var touch = Input.GetTouch(0);

            switch (touch.phase)
            {
                case TouchPhase.Began:
                    _touchStart = touch.position;
                    _touchCell  = BoardManager.Instance.ScreenToGrid(touch.position);
                    _dragging   = _touchCell.x >= 0;
                    break;

                case TouchPhase.Ended:
                case TouchPhase.Canceled:
                    if (_dragging)
                    {
                        _dragging = false;
                        TryProcessSwipe(touch.position);
                    }
                    break;
            }
        }

        // ── Lógica de swipe ──────────────────────────────────────────────────

        private void TryProcessSwipe(Vector2 endScreenPos)
        {
            if (_touchCell.x < 0) return;

            // Convertir desplazamiento de pantalla a desplazamiento world
            var cam = Camera.main;
            if (cam == null) return;

            Vector2 startWorld = cam.ScreenToWorldPoint(new Vector3(_touchStart.x, _touchStart.y, 0f));
            Vector2 endWorld   = cam.ScreenToWorldPoint(new Vector3(endScreenPos.x,  endScreenPos.y, 0f));
            Vector2 delta      = endWorld - startWorld;

            if (delta.magnitude < minSwipeDist) return;

            float angle = Mathf.Abs(Vector2.Angle(delta, Vector2.right));
            SwipeDirection dir;

            if (angle <= maxSwipeAngle)
                dir = SwipeDirection.Right;
            else if (angle >= 180f - maxSwipeAngle)
                dir = SwipeDirection.Left;
            else if (angle >= 90f - maxSwipeAngle && angle <= 90f + maxSwipeAngle)
                dir = delta.y > 0 ? SwipeDirection.Up : SwipeDirection.Down;
            else
                return; // Ángulo ambiguo, ignorar

            bool isHorizontal = dir == SwipeDirection.Left || dir == SwipeDirection.Right;
            int lineIndex = isHorizontal ? _touchCell.y : _touchCell.x;

            MoveController.Instance?.RequestMove(lineIndex, dir);
        }
    }
}
