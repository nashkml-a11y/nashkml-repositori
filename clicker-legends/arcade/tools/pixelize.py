"""Convierte emojis de Noto Color Emoji en sprites pixel art.

Se rasteriza el emoji a 109 px (tamaño nativo de la fuente), se reduce por
caja a la rejilla destino, se umbraliza el alfa, se limita la paleta y se
añade un contorno oscuro de 1 px como en los sprites de referencia.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf'
_font = None


def font():
    global _font
    if _font is None:
        _font = ImageFont.truetype(FONT_PATH, 109)
    return _font


def raster(emoji):
    im = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((80, 80), emoji, font=font(), embedded_color=True, anchor='mm')
    bb = im.getbbox()
    if not bb:
        return None
    return im.crop(bb)


def shrink(im, size):
    """Reducción con alfa premultiplicado a un cuadro de lado `size`."""
    w, h = im.size
    s = size / max(w, h)
    tw, th = max(1, round(w * s)), max(1, round(h * s))
    arr = np.array(im).astype(float)
    a = arr[..., 3:4] / 255
    pre = np.dstack([arr[..., :3] * a, arr[..., 3:4]]).astype(np.uint8)
    small = np.array(Image.fromarray(pre, 'RGBA').resize((tw, th), Image.BOX)).astype(float)
    al = small[..., 3]
    rgb = np.where(al[..., None] > 0, small[..., :3] / np.maximum(al[..., None], 1) * 255, 0)
    return np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8)


def quantize(arr, colors):
    alpha = arr[..., 3]
    rgb = Image.fromarray(np.ascontiguousarray(arr[..., :3]), 'RGB')
    q = np.array(rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert('RGB'))
    return np.dstack([q, alpha])


def outline(arr, color=(20, 14, 36)):
    """Contorno de 1 px alrededor de las zonas opacas (4-vecindad)."""
    h, w, _ = arr.shape
    pad = np.zeros((h + 2, w + 2, 4), np.uint8)
    pad[1:-1, 1:-1] = arr
    op = pad[..., 3] > 0
    ring = np.zeros_like(op)
    ring[1:, :] |= op[:-1, :]
    ring[:-1, :] |= op[1:, :]
    ring[:, 1:] |= op[:, :-1]
    ring[:, :-1] |= op[:, 1:]
    ring &= ~op
    pad[ring] = (*color, 255)
    return pad


def darken_edges(arr, k=0.55):
    """Oscurece el borde interior (sombra tipo sprite)."""
    op = arr[..., 3] > 0
    inner = op.copy()
    inner[1:, :] &= op[:-1, :]
    inner[:-1, :] &= op[1:, :]
    inner[:, 1:] &= op[:, :-1]
    inner[:, :-1] &= op[:, 1:]
    edge = op & ~inner
    out = arr.copy()
    out[edge, :3] = (out[edge, :3] * k).astype(np.uint8)
    return out


def pixelize(emoji, size=32, colors=16, line=True, tint=None):
    im = raster(emoji)
    if im is None:
        return None
    arr = shrink(im, size - (2 if line else 0))
    arr[..., 3] = np.where(arr[..., 3] > 120, 255, 0)
    if tint is not None:
        arr = apply_tint(arr, tint)
    arr = quantize(arr, colors)
    if line:
        arr = darken_edges(arr, 0.8)
        arr = outline(arr)
    return Image.fromarray(arr, 'RGBA')


def apply_tint(arr, ramp):
    """Remapea luminancia a una rampa de colores (p.ej. dorado)."""
    rgb = arr[..., :3].astype(float)
    lum = (rgb @ np.array([0.3, 0.59, 0.11])) / 255
    ramp = np.array(ramp, float)
    idx = lum * (len(ramp) - 1)
    lo = np.floor(idx).astype(int)
    hi = np.minimum(lo + 1, len(ramp) - 1)
    t = (idx - lo)[..., None]
    col = ramp[lo] * (1 - t) + ramp[hi] * t
    out = arr.copy()
    out[..., :3] = np.clip(col, 0, 255).astype(np.uint8)
    return out


GOLD = [(60, 30, 0), (140, 80, 10), (214, 150, 20), (255, 210, 60), (255, 246, 190)]


# ---------------------------------------------------------------------------
# Pixelado «pro»: estilo de los sprites de las maquetas (contorno coloreado,
# luz desde arriba a la izquierda, sombra abajo a la derecha, saturación viva).
# ---------------------------------------------------------------------------
import colorsys


def _sat(arr, k):
    out = arr.copy()
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            if arr[y, x, 3]:
                r, g, b = arr[y, x, :3] / 255.0
                h, l, s = colorsys.rgb_to_hls(r, g, b)
                r, g, b = colorsys.hls_to_rgb(h, l, min(1, s * k))
                out[y, x, :3] = (int(r * 255), int(g * 255), int(b * 255))
    return out


def _shift(c, f):
    c = np.array(c, float)
    if f >= 1:
        return np.clip(c + (255 - c) * (f - 1), 0, 255).astype(np.uint8)
    return np.clip(c * f, 0, 255).astype(np.uint8)


def pixelize_pro(emoji, height=40, colors=14, tint=None, sat=1.18):
    im = raster(emoji)
    if im is None:
        return None
    w, h = im.size
    s = (height - 2) / h
    tw, th = max(1, round(w * s)), height - 2
    arr = np.array(im).astype(float)
    a = arr[..., 3:4] / 255
    pre = np.dstack([arr[..., :3] * a, arr[..., 3:4]]).astype(np.uint8)
    small = np.array(Image.fromarray(pre, 'RGBA').resize((tw, th), Image.BOX)).astype(float)
    al = small[..., 3]
    rgb = np.where(al[..., None] > 0, small[..., :3] / np.maximum(al[..., None], 1) * 255, 0)
    arr = np.dstack([np.clip(rgb, 0, 255), np.where(al > 100, 255, 0)]).astype(np.uint8)
    if tint is not None:
        arr = apply_tint(arr, tint)
    arr = _sat(arr, sat)
    arr = quantize(arr, colors)
    op = arr[..., 3] > 0
    H, W = op.shape
    out = arr.copy()
    for y in range(H):
        for x in range(W):
            if not op[y, x]:
                continue
            def t(dy, dx):
                yy, xx = y + dy, x + dx
                return not (0 <= yy < H and 0 <= xx < W and op[yy, xx])
            c = arr[y, x, :3]
            if t(-1, 0) or t(0, -1):
                out[y, x, :3] = _shift(c, 1.28)          # luz
            elif t(1, 0) or t(0, 1):
                out[y, x, :3] = _shift(c, 0.62)          # sombra
            elif t(2, 0) or t(0, 2) or t(1, 1):
                out[y, x, :3] = _shift(c, 0.82)          # sombra suave
    # Contorno coloreado: versión muy oscura del píxel vecino
    pad = np.zeros((H + 2, W + 2, 4), np.uint8)
    pad[1:-1, 1:-1] = out
    po = pad[..., 3] > 0
    res = pad.copy()
    for y in range(H + 2):
        for x in range(W + 2):
            if po[y, x]:
                continue
            for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H + 2 and 0 <= xx < W + 2 and po[yy, xx]:
                    c = _shift(pad[yy, xx, :3], 0.28)
                    res[y, x] = (max(12, c[0]), max(8, c[1]), max(20, c[2]), 255)
                    break
    return Image.fromarray(res, 'RGBA')
