"""Huevos pixel art (26x32) generados por código: uno por huevo del juego.

Forma de huevo con luz desde arriba a la izquierda, rampa de 5 colores con
tramado Bayer, patrón propio (manchas, rayas, estrellas, grietas de lava,
facetas de cristal, motivos de temporada) y contorno oscuro.
Clave de salida: <mundo>-<huevo>.png (índices del array `worlds`).
"""
import os, math
import numpy as np
from PIL import Image
from extract_sprites import ROOT

OUT = os.path.join(ROOT, 'assets', 'eggs')
os.makedirs(OUT, exist_ok=True)
W, H = 26, 32
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def hexc(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def egg(ramp, pattern, accent, accent2='#ffffff', seed=0):
    rng = np.random.default_rng(seed)
    ramp = [hexc(c) for c in ramp]
    img = np.zeros((H, W, 4), np.uint8)
    cx, cy = (W - 1) / 2, H * 0.56
    b = H * 0.47
    inside = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            dy = (y - cy) / b
            rx = (W / 2 - 1) * (0.80 + 0.20 * min(1, max(0, (dy + 1) / 1.6)))
            dx = (x - cx) / rx
            if dx * dx + dy * dy <= 1:
                inside[y, x] = True
                nz = math.sqrt(max(0, 1 - dx * dx - dy * dy))
                lum = 0.55 * nz - 0.30 * dx - 0.32 * dy + 0.25
                v = min(len(ramp) - 1.001, max(0, lum * (len(ramp) - 1)))
                i = int(v)
                if v - i > BAYER[y % 4, x % 4]:
                    i = min(i + 1, len(ramp) - 1)
                img[y, x, :3] = ramp[i]; img[y, x, 3] = 255
    acc, acc2 = hexc(accent), hexc(accent2)

    def put(x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and inside[y, x]:
            img[y, x, :3] = c

    if pattern == 'spots':
        for _ in range(7):
            sx, sy, r = rng.uniform(4, W - 4), rng.uniform(6, H - 5), rng.uniform(1.2, 2.6)
            for y in range(H):
                for x in range(W):
                    if (x - sx) ** 2 + (y - sy) ** 2 <= r * r:
                        put(x, y, acc if (x + y) % 5 else acc2)
    elif pattern == 'stripes':
        for k, yy in enumerate((11, 18, 25)):
            for x in range(W):
                off = round(math.sin(x / 2.2 + k) * 1.2)
                put(x, yy + off, acc); put(x, yy + off + 1, acc)
                if k == 1:
                    put(x, yy + off + 2, acc2)
    elif pattern == 'zigzag':
        for k, yy in enumerate((13, 22)):
            for x in range(W):
                z = abs((x % 6) - 3)
                for t in range(2):
                    put(x, yy + z + t, acc if t == 0 else acc2)
    elif pattern == 'stars':
        for _ in range(9):
            sx, sy = rng.integers(3, W - 3), rng.integers(5, H - 4)
            put(sx, sy, acc2)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(sx + dx, sy + dy, acc)
    elif pattern == 'lava':
        for _ in range(4):
            x, y = rng.uniform(5, W - 5), rng.uniform(4, 9)
            for _s in range(18):
                put(x, y, acc); put(x + 1, y, acc2 if _s % 4 == 0 else acc)
                x += rng.choice([-1, 0, 1]); y += 1
    elif pattern == 'crystal':
        for k in range(-3, 4):
            for t in range(H):
                put(cx + k * 4 + (t - cy) * 0.35, t, acc)
        for y in range(H):
            for x in range(W):
                if (x - cx) ** 2 / 9 + (y - cy) ** 2 / 14 <= 1:
                    put(x, y, acc2 if (x + y) % 3 else acc)
    elif pattern == 'band':
        for x in range(W):
            for t in range(4):
                put(x, 17 + t + round(math.sin(x / 3) * 0.8), acc if t in (0, 3) else acc2)
        for sx, sy in ((7, 9), (17, 8), (12, 27)):
            put(sx, sy, acc2); put(sx + 1, sy, acc); put(sx - 1, sy, acc); put(sx, sy + 1, acc); put(sx, sy - 1, acc)
    elif pattern == 'pumpkin':
        for x in range(W):
            if x % 5 == 2:
                for y in range(H):
                    put(x, y, acc2)
        for (ex, ey) in ((8, 15), (16, 15)):
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (-1, 1), (2, 1)):
                put(ex + dx, ey + dy, acc)
        for x in range(7, 19):
            put(x, 22 + (1 if x % 3 == 0 else 0), acc)
    elif pattern == 'candy':
        for y in range(H):
            for x in range(W):
                if ((x + y) // 4) % 2 == 0:
                    put(x, y, acc2)
        for y in range(H):
            put(cx, y, acc); put(cx + 1, y, acc)
        for x in range(W):
            put(x, 18, acc); put(x, 19, acc)
    elif pattern == 'hearts':
        for (hx, hy) in ((7, 10), (17, 13), (9, 22), (18, 25), (13, 17)):
            for dx, dy in ((0, 0), (2, 0), (-1, 1), (0, 1), (1, 1), (2, 1), (3, 1), (0, 2), (1, 2), (2, 2), (1, 3)):
                put(hx + dx - 1, hy + dy - 1, acc)
            put(hx - 1, hy, acc2)
    elif pattern == 'waves':
        for k, yy in enumerate((14, 20, 26)):
            for x in range(W):
                put(x, yy + round(math.sin(x / 1.6 + k * 2) * 1.2), acc if k != 1 else acc2)
        for y in range(4, 10):
            for x in range(W):
                if (x - 13) ** 2 + (y - 7) ** 2 <= 6:
                    put(x, y, hexc('#ffd84a'))
    # Brillo especular
    for (x, y) in ((8, 7), (7, 8), (8, 8), (7, 9), (9, 6)):
        if inside[y, x]:
            img[y, x, :3] = np.minimum(255, img[y, x, :3].astype(int) + 90)
    # Contorno
    op = img[..., 3] > 0
    ring = np.zeros_like(op)
    ring[1:] |= op[:-1]; ring[:-1] |= op[1:]; ring[:, 1:] |= op[:, :-1]; ring[:, :-1] |= op[:, 1:]
    ring &= ~op
    out = np.zeros((H, W, 4), np.uint8)
    out[op] = img[op]
    out[ring] = (24, 14, 38, 255)
    return Image.fromarray(out, 'RGBA')


CREAM = ['#6a5a48', '#a8967a', '#d8c8a8', '#f4ead4', '#ffffff']
GOLD = ['#6a3a08', '#b8760e', '#e8a81a', '#ffd84a', '#fff4b0']
SAND = ['#7a4a22', '#b07a3e', '#d8a85e', '#f0cc86', '#fff0c8']
ICE = ['#2a4a7a', '#4a7ab0', '#7ab4e0', '#b8e2fa', '#ffffff']
CHAR = ['#1a1418', '#2e2428', '#463a3c', '#625254', '#806c6a']
NAVY = ['#0a0a2a', '#1a1a4a', '#2e2a6e', '#4a3a9a', '#7a5ac8']
MYST = ['#2a0a4a', '#5a1a8a', '#8a3ac8', '#b87aee', '#e8c4ff']
INFER = ['#3a0610', '#6a0e1e', '#a01e2a', '#d84a2a', '#ffa04a']
DIVINE = ['#6a5aa0', '#a8a0d8', '#e0dcf8', '#fff8e0', '#ffffff']
ORANGE = ['#6a2a04', '#b0500a', '#e87a1a', '#ffa84a', '#ffd8a0']
RED = ['#5a0a14', '#9a1424', '#d02a3a', '#f05a6a', '#ffb0b8']
PINK = ['#6a1a4a', '#b0306a', '#e85a9a', '#ff9ac4', '#ffd8ea']
SEA = ['#0a3a6a', '#1a6aa8', '#2fa0e0', '#7ad4ff', '#d8f6ff']

EGGS = {
    '0-0': (CREAM, 'spots', '#3f9a4a', '#8ee070'),
    '0-1': (GOLD, 'stars', '#ffffff', '#fff8d0'),
    '0-2': (MYST, 'crystal', '#5ae0ff', '#c8f8ff'),
    '1-0': (SAND, 'stripes', '#a0502a', '#e88a50'),
    '1-1': (GOLD, 'zigzag', '#b0532e', '#fff4b0'),
    '1-2': (MYST, 'crystal', '#ffb84a', '#fff0c0'),
    '2-0': (ICE, 'stars', '#ffffff', '#e8f8ff'),
    '2-1': (['#4a5a7a', '#7a8ab0', '#b0c0e0', '#e0ecff', '#ffffff'], 'band', '#5ab8ff', '#e8f8ff'),
    '2-2': (MYST, 'crystal', '#9ff0ff', '#ffffff'),
    '3-0': (CHAR, 'lava', '#ff6a1a', '#ffd84a'),
    '3-1': (INFER, 'lava', '#ffd84a', '#fff4b0'),
    '3-2': (['#1a0612', '#3a0a24', '#6a1030', '#a01e3a', '#e04a4a'], 'crystal', '#ff8a2a', '#ffd84a'),
    '4-0': (NAVY, 'stars', '#9fd8ff', '#ffffff'),
    '4-1': (['#1a0a3a', '#3a1a6a', '#6a2aa0', '#a04ad0', '#e08aff'], 'band', '#42e5ff', '#ffffff'),
    '4-2': (DIVINE, 'crystal', '#ffd84a', '#ffffff'),
    '5-0': (ORANGE, 'pumpkin', '#2a0a14', '#c0500a'),
    '6-0': (['#8a8a9a', '#c8c8d4', '#ececf4', '#ffffff', '#ffffff'], 'candy', '#2a8a4a', '#e83a4a'),
    '7-0': (PINK, 'hearts', '#e8205a', '#ffffff'),
    '8-0': (SEA, 'waves', '#ffffff', '#ffe8a0'),
}

if __name__ == '__main__':
    for i, (k, (ramp, pat, a1, a2)) in enumerate(EGGS.items()):
        egg(ramp, pat, a1, a2, seed=i + 3).save(os.path.join(OUT, k + '.png'))
    print(len(EGGS), 'huevos')
