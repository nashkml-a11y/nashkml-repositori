using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace PrismShift
{
    /// <summary>
    /// Genera el tablero, mantiene la matriz lógica, valida y ejecuta movimientos.
    /// Coordenadas: (col, row), (0,0) = esquina inferior-izquierda.
    /// </summary>
    public class BoardManager : MonoBehaviour
    {
        public static BoardManager Instance { get; private set; }

        // ── Config visual ────────────────────────────────────────────────────
        [Header("Layout")]
        [SerializeField] private float cellSize      = 1.1f;   // unidades world
        [SerializeField] private float cellSpacing   = 0.08f;
        [SerializeField] private float moveDuration  = 0.18f;

        // ── Estado del tablero ───────────────────────────────────────────────
        private int _width, _height;
        private CellType[,] _cellTypes;
        private BoardCell[,] _cells;
        private Orb[,]       _orbGrid;
        private Portal[,]    _portalGrid;

        private List<Portal> _allPortals = new List<Portal>();
        private bool         _isAnimating;

        public bool IsAnimating => _isAnimating;

        // ── Raíz de objetos del tablero ──────────────────────────────────────
        private Transform _boardRoot;

        // ── Ciclo de vida ────────────────────────────────────────────────────

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void OnEnable()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnLevelLoaded += BuildBoard;
        }

        private void OnDisable()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnLevelLoaded -= BuildBoard;
        }

        // ── Construcción del tablero ─────────────────────────────────────────

        public void BuildBoard(int levelIndex)
        {
            ClearBoard();
            var data = LevelManager.Instance?.GetLevel(levelIndex);
            if (data == null) return;

            _width  = data.width;
            _height = data.height;

            _cellTypes  = new CellType[_width, _height];
            _cells      = new BoardCell[_width, _height];
            _orbGrid    = new Orb[_width, _height];
            _portalGrid = new Portal[_width, _height];
            _allPortals.Clear();

            _boardRoot = new GameObject("BoardRoot").transform;
            _boardRoot.SetParent(transform);
            CenterBoard();

            SpawnCells(data);
            SpawnPortals(data);
            SpawnOrbs(data);
        }

        private void ClearBoard()
        {
            if (_boardRoot != null) Destroy(_boardRoot.gameObject);
            _allPortals.Clear();
        }

        private void CenterBoard()
        {
            float step   = cellSize + cellSpacing;
            float totalW = (_width  - 1) * step;
            float totalH = (_height - 1) * step;
            _boardRoot.localPosition = new Vector3(-totalW * 0.5f, -totalH * 0.5f, 0f);
        }

        // ── Spawn helpers ────────────────────────────────────────────────────

        private void SpawnCells(LevelData data)
        {
            // Marcar bloqueadas
            foreach (var b in data.blockedCells)
                if (InBounds(b)) _cellTypes[b.x, b.y] = CellType.Blocked;

            for (int col = 0; col < _width; col++)
            for (int row = 0; row < _height; row++)
            {
                if (_cellTypes[col, row] == CellType.Empty)
                    _cellTypes[col, row] = CellType.Normal;

                var go   = new GameObject($"Cell_{col}_{row}");
                go.transform.SetParent(_boardRoot, false);
                go.transform.localPosition = GridToLocal(col, row);
                go.transform.localScale    = Vector3.one * cellSize;

                var cell = go.AddComponent<BoardCell>();
                cell.Initialize(new Vector2Int(col, row), _cellTypes[col, row]);
                _cells[col, row] = cell;
            }
        }

        private void SpawnPortals(LevelData data)
        {
            foreach (var pd in data.portals)
            {
                if (!InBounds(pd.position)) continue;
                _cellTypes[pd.position.x, pd.position.y] = CellType.Portal;

                var go = new GameObject($"Portal_{pd.color}_{pd.position.x}_{pd.position.y}");
                go.transform.SetParent(_boardRoot, false);
                go.transform.localPosition = GridToLocal(pd.position.x, pd.position.y);
                go.transform.localScale    = Vector3.one * cellSize;

                var portal = go.AddComponent<Portal>();
                portal.Initialize(pd.color, pd.position, pd.requiredCount);
                _portalGrid[pd.position.x, pd.position.y] = portal;
                _allPortals.Add(portal);
            }
        }

        private void SpawnOrbs(LevelData data)
        {
            foreach (var od in data.orbs)
            {
                if (!InBounds(od.position)) continue;
                CreateOrb(od.color, od.position);
            }
        }

        private Orb CreateOrb(OrbColor color, Vector2Int pos)
        {
            var go = new GameObject($"Orb_{color}_{pos.x}_{pos.y}");
            go.transform.SetParent(_boardRoot, false);
            go.transform.localPosition = GridToLocal(pos.x, pos.y);
            go.transform.localScale    = Vector3.one * cellSize * 0.78f;

            var orb = go.AddComponent<Orb>();
            orb.Initialize(color, pos);
            _orbGrid[pos.x, pos.y] = orb;
            return orb;
        }

        // ── Validación de movimientos ────────────────────────────────────────

        /// <summary>
        /// Valida si todos los orbes de la fila o columna pueden moverse.
        /// No consuma nada: sólo devuelve si es válido.
        /// </summary>
        public bool ValidateMove(int index, SwipeDirection dir)
        {
            bool isHorizontal = dir == SwipeDirection.Left || dir == SwipeDirection.Right;
            int  delta        = (dir == SwipeDirection.Right || dir == SwipeDirection.Up) ? 1 : -1;

            for (int i = 0; i < (isHorizontal ? _width : _height); i++)
            {
                int col = isHorizontal ? i : index;
                int row = isHorizontal ? index : i;
                if (_orbGrid[col, row] == null) continue;

                int newCol = col + (isHorizontal ? delta : 0);
                int newRow = row + (isHorizontal ? 0     : delta);

                if (!InBounds(newCol, newRow)) return false;
                if (_cellTypes[newCol, newRow] == CellType.Blocked) return false;

                // Portal de color incorrecto bloquea
                var portal = _portalGrid[newCol, newRow];
                if (portal != null && !portal.IsComplete && portal.Color != _orbGrid[col, row].Color)
                    return false;
            }
            return true;
        }

        // ── Ejecución de movimientos ─────────────────────────────────────────

        /// <summary>Ejecuta el movimiento y llama a onComplete cuando termine la animación.</summary>
        public void ExecuteMove(int index, SwipeDirection dir, System.Action onComplete = null)
        {
            if (_isAnimating) return;
            StartCoroutine(ExecuteMoveRoutine(index, dir, onComplete));
        }

        private IEnumerator ExecuteMoveRoutine(int index, SwipeDirection dir,
                                                System.Action onComplete)
        {
            _isAnimating = true;
            bool isHorizontal = dir == SwipeDirection.Left || dir == SwipeDirection.Right;
            int  delta        = (dir == SwipeDirection.Right || dir == SwipeDirection.Up) ? 1 : -1;

            // Recopilar orbes que se mueven (en orden seguro para no solapar)
            var moves = new List<(Orb orb, Vector2Int newPos)>();

            // Iterar en dirección del movimiento para que no haya colisiones lógicas
            int start = delta > 0 ? (isHorizontal ? _width - 1 : _height - 1) : 0;
            int end   = delta > 0 ? -1 : (isHorizontal ? _width : _height);
            int step  = delta > 0 ? -1 : 1;

            for (int i = start; i != end; i += step)
            {
                int col = isHorizontal ? i : index;
                int row = isHorizontal ? index : i;
                if (_orbGrid[col, row] == null) continue;

                int newCol = col + (isHorizontal ? delta : 0);
                int newRow = row + (isHorizontal ? 0     : delta);
                moves.Add((_orbGrid[col, row], new Vector2Int(newCol, newRow)));
            }

            // Actualizar matriz lógica antes de animar para evitar lecturas sucias
            foreach (var (orb, newPos) in moves)
            {
                _orbGrid[orb.GridPos.x, orb.GridPos.y] = null;
            }
            foreach (var (orb, newPos) in moves)
            {
                _orbGrid[newPos.x, newPos.y] = orb;
                orb.GridPos = newPos;
            }

            // Animar todos en paralelo
            var coroutines = new List<Coroutine>();
            foreach (var (orb, newPos) in moves)
            {
                Vector3 worldTarget = _boardRoot.TransformPoint(GridToLocal(newPos.x, newPos.y));
                // Convertir a local (orb es hijo de _boardRoot)
                coroutines.Add(orb.AnimateMoveTo(GridToLocal(newPos.x, newPos.y), moveDuration));
            }

            // Esperar la animación más larga
            yield return new WaitForSeconds(moveDuration + 0.02f);

            // Comprobar absorción en portales
            CheckPortalAbsorptions();

            _isAnimating = false;
            onComplete?.Invoke();
        }

        // ── Portales ─────────────────────────────────────────────────────────

        private void CheckPortalAbsorptions()
        {
            var toAbsorb = new List<(Orb orb, Portal portal)>();

            foreach (var portal in _allPortals)
            {
                if (portal.IsComplete) continue;
                int col = portal.GridPos.x, row = portal.GridPos.y;
                var orb = _orbGrid[col, row];
                if (orb != null) toAbsorb.Add((orb, portal));
            }

            foreach (var (orb, portal) in toAbsorb)
            {
                if (portal.TryAbsorb(orb.Color))
                {
                    _orbGrid[orb.GridPos.x, orb.GridPos.y] = null;
                    orb.AnimateAbsorb();
                }
            }

            CheckVictory();
        }

        private void CheckVictory()
        {
            bool allComplete = true;
            foreach (var p in _allPortals)
                if (!p.IsComplete) { allComplete = false; break; }

            if (allComplete)
                GameManager.Instance?.TriggerVictory();
        }

        /// <summary>
        /// Llamado por GameManager cuando se agotan movimientos (sin victoria previa).
        /// </summary>
        public void CheckDefeatCondition()
        {
            bool anyIncomplete = false;
            foreach (var p in _allPortals)
                if (!p.IsComplete) { anyIncomplete = true; break; }

            if (anyIncomplete)
                GameManager.Instance?.TriggerDefeat();
        }

        // ── Highlight de fila/columna ────────────────────────────────────────

        public void HighlightRow(int row, bool on)
        {
            for (int col = 0; col < _width; col++)
                _orbGrid[col, row]?.SetHighlight(on);
        }

        public void HighlightColumn(int col, bool on)
        {
            for (int row = 0; row < _height; row++)
                _orbGrid[col, row]?.SetHighlight(on);
        }

        public void AnimateErrorRow(int row)    => StartCoroutine(ShakeRow(row));
        public void AnimateErrorColumn(int col) => StartCoroutine(ShakeCol(col));

        private IEnumerator ShakeRow(int row)
        {
            var orbs = new List<Transform>();
            for (int col = 0; col < _width; col++)
                if (_orbGrid[col, row] != null) orbs.Add(_orbGrid[col, row].transform);

            var targets = new List<IEnumerator>();
            foreach (var t in orbs) targets.Add(AnimationHelper.Shake(t, 0.1f, 0.2f));

            // Iniciar todos en paralelo
            var routines = new List<Coroutine>();
            foreach (var co in targets) routines.Add(StartCoroutine(co));
            yield return new WaitForSeconds(0.25f);
        }

        private IEnumerator ShakeCol(int col)
        {
            var orbs = new List<Transform>();
            for (int row = 0; row < _height; row++)
                if (_orbGrid[col, row] != null) orbs.Add(_orbGrid[col, row].transform);

            foreach (var t in orbs) StartCoroutine(AnimationHelper.Shake(t, 0.1f, 0.2f));
            yield return new WaitForSeconds(0.25f);
        }

        // ── Helpers de coordenadas ───────────────────────────────────────────

        private Vector3 GridToLocal(int col, int row)
        {
            float step = cellSize + cellSpacing;
            return new Vector3(col * step, row * step, 0f);
        }

        private bool InBounds(Vector2Int p) => InBounds(p.x, p.y);
        private bool InBounds(int col, int row) =>
            col >= 0 && col < _width && row >= 0 && row < _height;

        /// <summary>
        /// Convierte posición en pantalla a coordenada de grilla.
        /// Devuelve (-1,-1) si no hay celda en esa posición.
        /// </summary>
        public Vector2Int ScreenToGrid(Vector2 screenPos)
        {
            if (_boardRoot == null) return new Vector2Int(-1, -1);

            var cam = Camera.main;
            if (cam == null) return new Vector2Int(-1, -1);

            Vector3 world = cam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, 0f));
            Vector3 local = _boardRoot.InverseTransformPoint(world);

            float step = cellSize + cellSpacing;
            int col = Mathf.RoundToInt(local.x / step);
            int row = Mathf.RoundToInt(local.y / step);

            return InBounds(col, row) ? new Vector2Int(col, row) : new Vector2Int(-1, -1);
        }
    }
}
