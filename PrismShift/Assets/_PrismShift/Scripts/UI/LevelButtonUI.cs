using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Botón individual de la pantalla de selección de niveles.
    /// </summary>
    public class LevelButtonUI : MonoBehaviour
    {
        private int    _levelNumber;
        private bool   _unlocked;
        private int    _stars;
        private Button _btn;

        public void Initialize(int levelNumber, bool unlocked, int stars)
        {
            _levelNumber = levelNumber;
            _unlocked    = unlocked;
            _stars       = stars;

            _btn = GetComponent<Button>();
            if (_btn == null) _btn = gameObject.AddComponent<Button>();

            BuildVisual();

            _btn.onClick.AddListener(OnClicked);
            _btn.interactable = unlocked;
        }

        private void BuildVisual()
        {
            // Fondo del botón
            var img = GetComponent<Image>() ?? gameObject.AddComponent<Image>();
            img.sprite = PlaceholderAssets.RoundedSquareSprite();
            img.type   = Image.Type.Sliced;
            img.color  = _unlocked
                ? new Color(0.15f, 0.13f, 0.35f)
                : new Color(0.12f, 0.11f, 0.20f);

            // Número
            var numGo = new GameObject("Number");
            numGo.transform.SetParent(transform, false);
            var nrt = numGo.AddComponent<RectTransform>();
            nrt.anchorMin = new Vector2(0f, 0.38f);
            nrt.anchorMax = new Vector2(1f, 0.92f);
            nrt.offsetMin = nrt.offsetMax = Vector2.zero;
            var numTxt = numGo.AddComponent<TextMeshProUGUI>();
            numTxt.text      = _levelNumber.ToString("D2");
            numTxt.fontSize  = 32;
            numTxt.fontStyle = FontStyles.Bold;
            numTxt.color     = _unlocked ? Color.white : new Color(0.4f, 0.38f, 0.48f);
            numTxt.alignment = TextAlignmentOptions.Center;

            // Estrellas (pequeñas)
            if (_unlocked)
            {
                for (int i = 0; i < 3; i++)
                {
                    var sGo  = new GameObject($"Star{i}");
                    sGo.transform.SetParent(transform, false);
                    var srt  = sGo.AddComponent<RectTransform>();
                    float xMin = 0.05f + i * 0.31f;
                    srt.anchorMin = new Vector2(xMin, 0.04f);
                    srt.anchorMax = new Vector2(xMin + 0.28f, 0.36f);
                    srt.offsetMin = srt.offsetMax = Vector2.zero;
                    var sImg = sGo.AddComponent<Image>();
                    sImg.sprite         = i < _stars
                        ? PlaceholderAssets.StarSprite()
                        : PlaceholderAssets.StarEmptySprite();
                    sImg.color          = i < _stars
                        ? ColorPalette.StarColor
                        : new Color(0.35f, 0.32f, 0.18f);
                    sImg.preserveAspect = true;
                }
            }
            else
            {
                // Candado
                var lockGo = new GameObject("Lock");
                lockGo.transform.SetParent(transform, false);
                var lrt    = lockGo.AddComponent<RectTransform>();
                lrt.anchorMin = new Vector2(0.3f, 0.08f);
                lrt.anchorMax = new Vector2(0.7f, 0.42f);
                lrt.offsetMin = lrt.offsetMax = Vector2.zero;
                var lTxt   = lockGo.AddComponent<TextMeshProUGUI>();
                lTxt.text      = "🔒";
                lTxt.fontSize  = 22;
                lTxt.alignment = TextAlignmentOptions.Center;
            }
        }

        private void OnClicked()
        {
            if (!_unlocked) return;
            AudioManager.Instance?.PlayButtonClick();
            SceneFlowManager.Instance?.LoadGameplay(_levelNumber - 1); // índice 0-based
        }
    }
}
