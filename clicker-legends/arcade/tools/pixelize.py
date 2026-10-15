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
