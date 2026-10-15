"""Extrae los sprites de mascotas de las maquetas del Bestiario.

Para cada tarjeta se indica la zona del sprite (encima del nombre). Se toma
el color de fondo de la tarjeta, se elimina por relleno desde los bordes
(tolerancia por distancia de color) y se reduce a su rejilla de píxel nativa
con una paleta limitada. Salida: assets/pets/<codepoints>.png
"""
import sys, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, '..', 'referencia', 'visual')
OUT = os.path.join(ROOT, 'assets', 'pets')
os.makedirs(OUT, exist_ok=True)

# (imagen, emoji, caja x0,y0,x1,y1 de la zona del sprite)
CARDS = [
    ('bestiario-halloween-a', '🐺👨', (172, 462, 545, 668)),
    ('bestiario-halloween-a', '🧟', (602, 462, 978, 668)),
    ('bestiario-halloween-a', '🧛', (172, 880, 545, 1083)),
    ('bestiario-halloween-a', '🏺', (602, 880, 978, 1083)),
    ('bestiario-volcan', '🦎', (152, 500, 540, 657)),
    ('bestiario-volcan', '🔥', (606, 494, 995, 660)),
    ('bestiario-volcan', '👹', (152, 893, 540, 1073)),
    ('bestiario-volcan', '🌋', (606, 893, 995, 1073)),
    ('bestiario-espacio', '👽', (180, 468, 548, 648)),
    ('bestiario-espacio', '🛸', (600, 468, 970, 648)),
    ('bestiario-espacio', '🌌', (180, 875, 548, 1058)),
    ('bestiario-espacio', '🪐', (600, 875, 970, 1058)),
    ('bestiario-hielo', '🐧', (82, 336, 488, 505)),
    ('bestiario-hielo', '🦭', (542, 336, 945, 505)),
    ('bestiario-hielo', '🐺', (82, 748, 488, 925)),
    ('bestiario-hielo', '🐻‍❄️', (542, 748, 945, 925)),
    ('bestiario-hielo', '🐲', (82, 1140, 488, 1292)),
    ('bestiario-verano', '🏰', (190, 462, 548, 638)),
    ('bestiario-verano', '☀️', (598, 462, 958, 638)),
    ('bestiario-verano', '💧', (190, 853, 548, 1022)),
    ('bestiario-verano', '🦈', (598, 853, 958, 1022)),
    ('bestiario-sanvalentin', '❤️', (205, 478, 545, 643)),
    ('bestiario-sanvalentin', '🦢', (612, 478, 955, 650)),
    ('bestiario-sanvalentin', '🕯️', (205, 865, 545, 1042)),
    ('bestiario-sanvalentin', '👼', (612, 860, 955, 1042)),
]


def name_of(emoji):
    return '-'.join('%x' % ord(c) for c in emoji)


def flood_bg(rgb, bg, tol):
    h, w, _ = rgb.shape
    dist = np.sqrt(((rgb.astype(int) - np.array(bg)) ** 2).sum(axis=2))
    near = dist < tol
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    # Huecos interiores del color exacto del fondo (entre patas, etc.)
    holes = dist < tol * 0.55
    return seen | holes


def components(mask):
    """Etiqueta componentes 4-conexas (mask=True es sprite)."""
    h, w = mask.shape
    lab = np.zeros((h, w), int)
    n = 0
    sizes = [0]
    for y0 in range(h):
        for x0 in range(w):
            if mask[y0, x0] and not lab[y0, x0]:
                n += 1; cnt = 0
                q = deque([(y0, x0)]); lab[y0, x0] = n
                while q:
                    y, x = q.popleft(); cnt += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                sizes.append(cnt)
    return lab, sizes


def extract(img, box, scale, tol=38, colors=20, maxsize=None):
    x0, y0, x1, y1 = box
    crop = np.array(img.crop(box).convert('RGB'))
    h, w, _ = crop.shape
    # Fondo = mediana del perímetro
    per = np.concatenate([crop[0], crop[-1], crop[:, 0], crop[:, -1]])
    bg = np.median(per, axis=0)
    bgmask = flood_bg(crop, bg, tol)
    sprite = ~bgmask
    lab, sizes = components(sprite)
    keep = np.zeros_like(sprite)
    border = set(lab[0].tolist()) | set(lab[-1].tolist()) | set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    for i, s in enumerate(sizes):
        # Fuera restos del marco de la tarjeta: piezas pequeñas pegadas al borde
        if i and s >= 40 and not (i in border and s < 900):
            keep |= lab == i
    ys, xs = np.where(keep)
    if not len(ys):
        raise SystemExit('vacío %s' % (box,))
    by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([crop, (keep * 255).astype(np.uint8)])[by0:by1, bx0:bx1]
    im = Image.fromarray(rgba, 'RGBA')
    if maxsize:
        scale = max(im.width, im.height) / maxsize
    tw, th = max(1, round(im.width / scale)), max(1, round(im.height / scale))
    # Reducción por caja con alfa premultiplicado para no ensuciar bordes
    arr = np.array(im).astype(float)
    a = arr[..., 3:4] / 255
    pre = np.dstack([arr[..., :3] * a, arr[..., 3:4]])
    small = np.array(Image.fromarray(pre.astype(np.uint8), 'RGBA').resize((tw, th), Image.BOX)).astype(float)
    alpha = small[..., 3]
    rgb = np.where(alpha[..., None] > 0, small[..., :3] / np.maximum(alpha[..., None], 1) * 255, 0)
    out = np.dstack([np.clip(rgb, 0, 255), np.where(alpha > 110, 255, 0)]).astype(np.uint8)
    o = Image.fromarray(out, 'RGBA')
    # Paleta limitada (estética 16 bits)
    q = o.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert('RGB')
    q = np.dstack([np.array(q), out[..., 3]])
    return Image.fromarray(q, 'RGBA')


def main():
    scale = float(sys.argv[1]) if len(sys.argv) > 1 else 4.4
    cache = {}
    for f, emoji, box in CARDS:
        if f not in cache:
            cache[f] = Image.open(os.path.join(REF, f + '.png'))
        spr = extract(cache[f], box, scale)
        spr.save(os.path.join(OUT, name_of(emoji) + '.png'))
        print(emoji, spr.size)


if __name__ == '__main__':
    main()
