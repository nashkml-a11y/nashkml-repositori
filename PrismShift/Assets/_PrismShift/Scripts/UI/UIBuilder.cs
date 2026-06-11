using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace PrismShift
{
    /// <summary>
    /// Factoría interna para crear elementos UI en código, reproduciendo el estilo
    /// de la referencia: fondos oscuros, bordes redondeados, colores vivos.
    /// </summary>
    public static class UIBuilder
    {
        // ── Panel ────────────────────────────────────────────────────────────

        public static Image Panel(Transform parent, string name,
            Vector2 anchorMin, Vector2 anchorMax,
            Vector2 offsetMin, Vector2 offsetMax)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = offsetMin;
            rt.offsetMax = offsetMax;
            var img = go.AddComponent<Image>();
            img.sprite = PlaceholderAssets.RoundedSquareSprite();
            img.type   = Image.Type.Sliced;
            return img;
        }

        // ── Botón ────────────────────────────────────────────────────────────

        public static Button Button(Transform parent, string name, string label,
            Color bgColor,
            Vector2 anchorMin, Vector2 anchorMax,
            int fontSize = 28)
        {
            var go  = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = rt.offsetMax = Vector2.zero;

            var img = go.AddComponent<Image>();
            img.sprite = PlaceholderAssets.RoundedSquareSprite();
            img.type   = Image.Type.Sliced;
            img.color  = bgColor;

            var btn = go.AddComponent<Button>();
            var cb  = btn.colors;
            cb.normalColor      = bgColor;
            cb.highlightedColor = new Color(bgColor.r * 1.2f, bgColor.g * 1.2f, bgColor.b * 1.2f);
            cb.pressedColor     = new Color(bgColor.r * 0.7f, bgColor.g * 0.7f, bgColor.b * 0.7f);
            btn.colors = cb;
            btn.targetGraphic = img;

            var txtGo = new GameObject("Label");
            txtGo.transform.SetParent(go.transform, false);
            var trt = txtGo.AddComponent<RectTransform>();
            trt.anchorMin = Vector2.zero;
            trt.anchorMax = Vector2.one;
            trt.offsetMin = trt.offsetMax = Vector2.zero;

            var tmp = txtGo.AddComponent<TextMeshProUGUI>();
            tmp.text      = label;
            tmp.fontSize  = fontSize;
            tmp.color     = Color.white;
            tmp.fontStyle = FontStyles.Bold;
            tmp.alignment = TextAlignmentOptions.Center;

            return btn;
        }

        // ── Texto ────────────────────────────────────────────────────────────

        public static TextMeshProUGUI TextLabel(Transform parent, string name,
            string text, int fontSize, Color color,
            Vector2 anchorMin, Vector2 anchorMax,
            TextAlignmentOptions alignment = TextAlignmentOptions.Center)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = rt.offsetMax = Vector2.zero;

            var tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.text      = text;
            tmp.fontSize  = fontSize;
            tmp.color     = color;
            tmp.alignment = alignment;
            return tmp;
        }

        // ── Imagen/Ícono ─────────────────────────────────────────────────────

        public static Image Icon(Transform parent, string name, Sprite sprite, Color tint,
            Vector2 anchorMin, Vector2 anchorMax)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = rt.offsetMax = Vector2.zero;

            var img = go.AddComponent<Image>();
            img.sprite           = sprite;
            img.color            = tint;
            img.preserveAspect   = true;
            return img;
        }

        // ── Scroll / CanvasGroup ─────────────────────────────────────────────

        public static CanvasGroup CanvasGroupOverlay(Transform parent, string name,
            float alpha = 0f)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt  = go.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            var cg = go.AddComponent<CanvasGroup>();
            cg.alpha          = alpha;
            cg.blocksRaycasts = false;
            cg.interactable   = false;
            return cg;
        }
    }
}
