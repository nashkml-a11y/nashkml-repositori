using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    public class InlineLevelButton : MonoBehaviour
    {
        private int  _levelNumber;
        private bool _unlocked;
        private int  _stars;

        public void Initialize(int levelNumber, bool unlocked, int stars)
        {
            _levelNumber = levelNumber;
            _unlocked    = unlocked;
            _stars       = stars;
            BuildVisual();
        }

        private void BuildVisual()
        {
            // Fondo
            var img = GetComponent<Image>();
            img.sprite = PlaceholderAssets.RoundedSquareSprite();
            img.type   = Image.Type.Sliced;
            img.color  = _unlocked
                ? new Color(0.15f, 0.13f, 0.35f)
                : new Color(0.10f, 0.09f, 0.18f);

            // Número
            var numGo = new GameObject("Num");
            numGo.transform.SetParent(transform, false);
            var nrt   = numGo.AddComponent<RectTransform>();
            nrt.anchorMin = new Vector2(0f, 0.38f);
            nrt.anchorMax = new Vector2(1f, 0.92f);
            nrt.offsetMin = nrt.offsetMax = Vector2.zero;
            var ntmp  = numGo.AddComponent<TextMeshProUGUI>();
            ntmp.text      = _levelNumber.ToString("D2");
            ntmp.fontSize  = 34;
            ntmp.fontStyle = FontStyles.Bold;
            ntmp.color     = _unlocked ? Color.white : new Color(0.35f, 0.33f, 0.45f);
            ntmp.alignment = TextAlignmentOptions.Center;

            if (_unlocked)
            {
                // Estrellas
                for (int i = 0; i < 3; i++)
                {
                    var sGo = new GameObject($"S{i}");
                    sGo.transform.SetParent(transform, false);
                    var srt  = sGo.AddComponent<RectTransform>();
                    float x  = 0.05f + i * 0.31f;
                    srt.anchorMin = new Vector2(x, 0.04f);
                    srt.anchorMax = new Vector2(x + 0.28f, 0.36f);
                    srt.offsetMin = srt.offsetMax = Vector2.zero;
                    var sImg = sGo.AddComponent<Image>();
                    sImg.sprite         = i < _stars
                        ? PlaceholderAssets.StarSprite()
                        : PlaceholderAssets.StarEmptySprite();
                    sImg.color          = i < _stars
                        ? ColorPalette.StarColor
                        : new Color(0.3f, 0.28f, 0.15f);
                    sImg.preserveAspect = true;
                }

                // Botón
                var btn = GetComponent<Button>() ?? gameObject.AddComponent<Button>();
                btn.targetGraphic = img;
                btn.onClick.AddListener(() =>
                {
                    AudioManager.Instance?.PlayButtonClick();
                    GameBootstrapper.Instance?.StartLevel(_levelNumber - 1);
                });
            }
            else
            {
                // Candado
                var lGo = new GameObject("Lock");
                lGo.transform.SetParent(transform, false);
                var lrt  = lGo.AddComponent<RectTransform>();
                lrt.anchorMin = new Vector2(0.25f, 0.06f);
                lrt.anchorMax = new Vector2(0.75f, 0.40f);
                lrt.offsetMin = lrt.offsetMax = Vector2.zero;
                var ltmp = lGo.AddComponent<TextMeshProUGUI>();
                ltmp.text      = "🔒";
                ltmp.fontSize  = 24;
                ltmp.alignment = TextAlignmentOptions.Center;
            }
        }
    }
}
