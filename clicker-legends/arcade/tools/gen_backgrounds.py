"""Escenarios pixel art generados por código para los mundos sin referencia:
Bosque, Desierto, Hielo, Navidad y San Valentín.

Todos a la misma rejilla que los fondos repixelados (216x324), con paletas
cortas, degradados por bandas con tramado ordenado y composición vertical:
cielo arriba, horizonte a media altura y elementos que enmarcan los laterales.
"""
import os, math
import numpy as np
from PIL import Image, ImageDraw
from extract_sprites import ROOT

W, H = 216, 324
OUT = os.path.join(ROOT, 'assets', 'bg')
os.makedirs(OUT, exist_ok=True)

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Canvas:
    def __init__(self, seed):
        self.im = Image.new('RGB', (W, H))
        self.d = ImageDraw.Draw(self.im)
        self.r = np.random.default_rng(seed)

    # --- primitivas -------------------------------------------------------
    def gradient(self, y0, y1, stops, x0=0, x1=W):
        """Degradado vertical por bandas con tramado Bayer."""
        cols = [hexc(c) for c in stops]
        n = len(cols) - 1
        a = np.array(self.im)
        for y in range(max(0, y0), min(H, y1)):
            t = (y - y0) / max(1, (y1 - y0 - 1)) * n
            i = min(int(t), n - 1)
            f = t - i
            for x in range(x0, x1):
                c = cols[i + 1] if f > BAYER[y % 4, x % 4] else cols[i]
                a[y, x] = c
        self.im = Image.fromarray(a)
        self.d = ImageDraw.Draw(self.im)

    def px(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.im.putpixel((int(x), int(y)), hexc(c) if isinstance(c, str) else c)

    def rect(self, x0, y0, x1, y1, c):
        self.d.rectangle([x0, y0, x1, y1], fill=hexc(c))

    def ell(self, x0, y0, x1, y1, c):
        self.d.ellipse([x0, y0, x1, y1], fill=hexc(c))

    def poly(self, pts, c):
        self.d.polygon(pts, fill=hexc(c))

    def ridge(self, base, amp, rough, seed_off, cols, snow=None, step=1):
        """Cordillera por desplazamiento de punto medio, con luz a la izquierda."""
        n = 257
        h = np.zeros(n)
        h[0], h[-1] = self.r.uniform(-1, 1), self.r.uniform(-1, 1)
        span, sc = n - 1, 1.0
        while span > 1:
            for i in range(0, n - 1, span):
                m = i + span // 2
                h[m] = (h[i] + h[i + span]) / 2 + self.r.uniform(-1, 1) * sc
            span //= 2
            sc *= rough
        h = (h - h.min()) / (h.max() - h.min() + 1e-9)
        xs = np.linspace(0, n - 1, W).astype(int)
        hh = np.convolve(h[xs], np.ones(5) / 5, mode='same')
        hh[:2], hh[-2:] = h[xs][:2], h[xs][-2:]
        top = (base - hh * amp).astype(int)
        body, light, dark = [hexc(c) for c in cols]
        a = np.array(self.im)
        peak = top.min()
        for x in range(W):
            slope = top[min(W - 1, x + 3)] - top[max(0, x - 3)]
            for y in range(max(0, top[x]), H):
                c = body
                depth = y - top[x]
                if slope > 2 and depth < 12:
                    c = light
                elif slope < -2 and depth < 16:
                    c = dark
                if snow and top[x] < base - amp * snow[1] and y < peak + (base - peak) * 0.55 and depth < snow[0]:
                    c = hexc(snow[2]) if slope >= 0 else hexc(snow[3])
                a[y, x] = c
        self.im = Image.fromarray(a)
        self.d = ImageDraw.Draw(self.im)
        return top

    def cloud(self, cx, cy, s, base, hi, sh):
        blobs = [(-1.6, 0.2, 0.9), (-0.6, -0.4, 1.2), (0.6, -0.2, 1.0), (1.5, 0.3, 0.8), (0, 0.4, 1.0)]
        for dx, dy, r in blobs:
            rr = r * s
            self.ell(cx + dx * s - rr, cy + dy * s - rr + 1, cx + dx * s + rr, cy + dy * s + rr + 1, sh)
        for dx, dy, r in blobs:
            rr = r * s
            self.ell(cx + dx * s - rr, cy + dy * s - rr, cx + dx * s + rr, cy + dy * s + rr - 1, base)
        for dx, dy, r in blobs[:3]:
            rr = r * s * 0.55
            self.ell(cx + dx * s - rr - 1, cy + dy * s - rr - 2, cx + dx * s + rr - 1, cy + dy * s + rr - 2, hi)

    def disc_glow(self, cx, cy, r, core, rings):
        for i, c in reversed(list(enumerate(rings))):
            rr = r + (i + 1) * 4
            self.ell(cx - rr, cy - rr, cx + rr, cy + rr, c)
        self.ell(cx - r, cy - r, cx + r, cy + r, core)

    def stars(self, n, y1, cols):
        for _ in range(n):
            x, y = self.r.integers(0, W), self.r.integers(0, y1)
            self.px(x, y, cols[self.r.integers(0, len(cols))])
            if self.r.random() < 0.12:
                c = cols[0]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    self.px(x + dx, y + dy, c)

    def pine(self, x, base, h, cols, snow=None):
        dark, mid, light = cols
        self.rect(x - 1, base - 3, x + 1, base, '#3a2414')
        tiers = max(3, h // 7)
        for t in range(tiers):
            ty = base - 3 - t * (h / tiers)
            w = (tiers - t) * h / tiers * 0.42 + 2
            self.poly([(x - w, ty), (x + w, ty), (x, ty - h / tiers * 1.6)], dark)
            self.poly([(x - w + 1, ty - 1), (x, ty - 1), (x, ty - h / tiers * 1.5)], mid)
            self.poly([(x - w * 0.5, ty - 2), (x - 1, ty - 2), (x - 1, ty - h / tiers * 1.2)], light)
            if snow:
                self.poly([(x - w * 0.6, ty - h / tiers * 0.7), (x + w * 0.3, ty - h / tiers * 0.75), (x, ty - h / tiers * 1.5)], snow)

    def round_tree(self, x, base, s, cols, trunk=('#4a2e1a', '#6b4426')):
        dark, mid, light, hi = cols
        self.rect(x - s * 0.18, base - s * 1.1, x + s * 0.18, base, trunk[0])
        self.rect(x - s * 0.18, base - s * 1.1, x - s * 0.02, base, trunk[1])
        for dx, dy, r in ((-0.7, -1.5, 0.75), (0.7, -1.5, 0.75), (0, -2.1, 0.85), (0, -1.4, 0.8)):
            self.ell(x + dx * s - r * s, base + dy * s - r * s, x + dx * s + r * s, base + dy * s + r * s, dark)
        for dx, dy, r in ((-0.75, -1.6, 0.6), (0.55, -1.6, 0.6), (-0.1, -2.2, 0.7)):
            self.ell(x + dx * s - r * s, base + dy * s - r * s, x + dx * s + r * s, base + dy * s + r * s, mid)
        for dx, dy, r in ((-0.85, -1.75, 0.32), (-0.3, -2.4, 0.35)):
            self.ell(x + dx * s - r * s, base + dy * s - r * s, x + dx * s + r * s, base + dy * s + r * s, light)
        for _ in range(int(s * 1.5)):
            ang = self.r.uniform(0, math.tau)
            self.px(x + math.cos(ang) * s * 0.9 - s * 0.3, base - s * 2 + math.sin(ang) * s * 0.6, hi)

    def rock(self, x, y, w, h, cols):
        dark, mid, light = cols
        self.ell(x, y, x + w, y + h, dark)
        self.ell(x + 1, y, x + w - 2, y + h - 2, mid)
        self.ell(x + 2, y + 1, x + w * 0.5, y + h * 0.45, light)

    def tufts(self, n, y0, y1, cols):
        for _ in range(n):
            x, y = self.r.integers(0, W), self.r.integers(y0, y1)
            c = cols[self.r.integers(0, len(cols))]
            self.px(x, y, c); self.px(x - 1, y + 1, c); self.px(x + 1, y + 1, c); self.px(x, y - 1, c)

    def save(self, name, colors=48):
        q = self.im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        q.convert('RGB').save(os.path.join(OUT, name + '.png'), optimize=True)


# ------------------------------------------------------------------ BOSQUE
def bosque():
    c = Canvas(11)
    c.gradient(0, 170, ['#3f8fe8', '#5fb0ff', '#8ccfff', '#c4ecff'])
    c.disc_glow(168, 40, 13, '#fff6c0', ['#ffe98a', '#cfeaff'])
    c.ell(161, 33, 170, 42, '#ffffff')
    for cx, cy, s in ((40, 34, 7), (110, 58, 5), (190, 92, 5), (70, 100, 4)):
        c.cloud(cx, cy, s, '#ffffff', '#ffffff', '#b8d8f0')
    c.ridge(150, 60, 0.55, 0, ['#6f9fcf', '#93bde2', '#557fae'], snow=(6, 0.75, '#e8f4ff', '#c4d8ee'))
    c.ridge(168, 40, 0.5, 1, ['#4f8f6f', '#6fb085', '#3c745a'])
    for x in range(0, W, 7):
        c.pine(x + c.r.integers(-2, 3), 182 + c.r.integers(-3, 3), 18 + c.r.integers(0, 8), ('#1f5a3a', '#2b7048', '#3f8c58'))
    # Pradera y río
    c.gradient(182, H, ['#4fa84a', '#3f9440', '#2f7a36', '#246a2e'])
    river = [(96, 182), (120, 182), (138, 220), (150, 262), (176, 324), (90, 324), (104, 262), (98, 220)]
    c.poly(river, '#2f7fd0')
    c.poly([(100, 186), (116, 186), (128, 220), (136, 262), (150, 324), (112, 324), (114, 262), (106, 220)], '#4fa6f0')
    for i in range(40):
        y = c.r.integers(186, 320); x = 104 + (y - 186) * 0.25 + c.r.integers(0, 22)
        c.px(x, y, '#c8ecff'); c.px(x + 1, y, '#c8ecff')
    # Camino de tierra
    c.poly([(60, 324), (82, 250), (90, 230), (94, 230), (96, 252), (92, 324)], '#c9a46a')
    c.poly([(66, 324), (84, 252), (90, 236), (91, 252), (84, 324)], '#ddb97f')
    c.tufts(260, 190, H, ['#6fc85a', '#2f7a36', '#8ee070'])
    # Flores
    for _ in range(70):
        x, y = c.r.integers(0, W), c.r.integers(200, H)
        col = ['#ff6b8a', '#ffd84a', '#ffffff', '#b98cff'][c.r.integers(0, 4)]
        c.px(x, y, col); c.px(x + 1, y, col); c.px(x, y - 1, '#ffffff' if col != '#ffffff' else '#ffd84a')
    # Árboles grandes que enmarcan
    c.round_tree(18, 300, 26, ('#1d5a2a', '#2f8a3a', '#56b84a', '#8ee070'))
    c.round_tree(200, 290, 24, ('#1d5a2a', '#2f8a3a', '#56b84a', '#8ee070'))
    c.round_tree(40, 236, 13, ('#1d5a2a', '#2f8a3a', '#56b84a', '#8ee070'))
    c.round_tree(176, 228, 12, ('#1d5a2a', '#2f8a3a', '#56b84a', '#8ee070'))
    for x, y in ((150, 300), (26, 312), (120, 316), (186, 312)):
        c.rock(x, y, 18, 10, ('#4a5260', '#7a8494', '#a8b2c0'))
    # Setas
    for x, y in ((56, 296), (166, 306)):
        c.rect(x, y, x + 1, y + 4, '#f0e6d0'); c.ell(x - 3, y - 3, x + 4, y + 1, '#e83a3a'); c.px(x - 1, y - 2, '#ffffff'); c.px(x + 2, y - 1, '#ffffff')
    c.save('bosque')


# ---------------------------------------------------------------- DESIERTO
def desierto():
    c = Canvas(22)
    c.gradient(0, 175, ['#f07a3a', '#ff9a4a', '#ffbe6a', '#ffe0a0'])
    c.disc_glow(160, 62, 16, '#fff2b0', ['#ffd870', '#ffc060'])
    for cx, cy, s in ((40, 40, 6), (120, 26, 4), (196, 112, 4)):
        c.cloud(cx, cy, s, '#ffd6a0', '#ffe8c4', '#e8946a')
    c.ridge(168, 34, 0.45, 0, ['#d88a5a', '#e8a070', '#c07048'])
    # Mesetas (mesas) con estratos
    for x0, x1, top, base in ((6, 70, 112, 178), (150, 214, 124, 180), (88, 122, 140, 176)):
        c.poly([(x0, base), (x0 + 6, top + 6), (x0 + 10, top), (x1 - 10, top), (x1 - 6, top + 6), (x1, base)], '#b0532e')
        c.poly([(x0 + 6, base), (x0 + 10, top + 2), (x0 + (x1 - x0) * 0.45, top + 2), (x0 + (x1 - x0) * 0.4, base)], '#d0703c')
        for k in range(top + 10, base, 9):
            c.rect(x0 + 4, k, x1 - 4, k, '#8f4024')
        c.rect(x0 + 10, top, x1 - 10, top + 1, '#e88a50')
    c.gradient(176, H, ['#f0c070', '#e6ad5a', '#d89a48', '#c4843a'])
    # Dunas
    for k, (yy, col, hl) in enumerate(((200, '#e8b45e', '#f6cf82'), (236, '#dca052', '#f0c070'), (276, '#d0904a', '#e6ad5a'))):
        pts = [(0, H)]
        for x in range(0, W + 8, 8):
            pts.append((x, yy + math.sin(x / 26 + k * 1.7) * 8))
        pts.append((W, H))
        c.poly(pts, col)
        for x in range(0, W, 2):
            y = yy + math.sin(x / 26 + k * 1.7) * 8
            if math.cos(x / 26 + k * 1.7) > 0:
                c.px(x, y, hl); c.px(x, y + 1, hl)
    def cactus(x, base, h):
        g, gl, gd = '#3f8f3a', '#6cc04e', '#2a6a2a'
        c.rect(x - 3, base - h, x + 3, base, g)
        c.rect(x - 3, base - h, x - 1, base, gl); c.rect(x + 2, base - h, x + 3, base, gd)
        c.ell(x - 3, base - h - 3, x + 3, base - h + 2, g)
        for side in (-1, 1):
            ay = base - h * (0.55 if side < 0 else 0.4)
            ax = x + side * 9
            c.rect(min(x, ax), ay, max(x, ax), ay + 4, g)
            c.rect(ax - 2, ay - h * 0.35, ax + 2, ay + 4, g)
            c.rect(ax - 2, ay - h * 0.35, ax - 1, ay + 4, gl)
            c.ell(ax - 2, ay - h * 0.35 - 2, ax + 2, ay - h * 0.35 + 2, g)
        for yy in range(base - h, base, 4):
            c.px(x, yy, '#d8f0a0')
    cactus(24, 296, 46); cactus(194, 284, 40); cactus(58, 214, 18); cactus(170, 206, 14)
    for x, y in ((120, 300), (6, 316), (150, 314), (84, 312)):
        c.rock(x, y, 20, 10, ('#7a3e22', '#a85a32', '#d07a46'))
    c.tufts(60, 200, H, ['#8a9a3a', '#6a7a2a'])
    # Calavera de vaca
    c.ell(96, 286, 106, 293, '#f4ecd8'); c.px(99, 289, '#3a2a1a'); c.px(103, 289, '#3a2a1a')
    c.rect(92, 286, 95, 287, '#f4ecd8'); c.rect(107, 286, 110, 287, '#f4ecd8')
    c.save('desierto')


# -------------------------------------------------------------------- HIELO
def hielo():
    c = Canvas(33)
    c.gradient(0, 180, ['#081438', '#10265a', '#1d4686', '#3a74b8', '#7ab4e0'])
    c.stars(110, 120, ['#ffffff', '#bfe4ff', '#8fc8ff'])
    # Aurora boreal
    a = np.array(c.im)
    for band, (yb, col1, col2) in enumerate(((40, (60, 255, 170), (120, 255, 220)), (62, (80, 200, 255), (170, 120, 255)))):
        for x in range(W):
            yc = yb + math.sin(x / 19 + band * 2) * 10 + math.sin(x / 7) * 3
            for y in range(int(yc), int(yc + 26 - band * 6)):
                if 0 <= y < H:
                    t = (y - yc) / 26
                    if (1 - t) * 0.65 > BAYER[y % 4, x % 4]:
                        k = 0.55 * (1 - t)
                        base = a[y, x].astype(float)
                        col = np.array(col1 if (x // 9) % 2 else col2)
                        a[y, x] = (base * (1 - k) + col * k).astype(np.uint8)
    c.im = Image.fromarray(a); c.d = ImageDraw.Draw(c.im)
    c.ridge(160, 70, 0.55, 0, ['#6e8fc0', '#b8d4f2', '#4a6a9e'], snow=(16, 0.45, '#f4fbff', '#cfe2f6'))
    c.ridge(182, 40, 0.5, 1, ['#8fb4dc', '#d8ecff', '#6a90c0'], snow=(30, 0.0, '#ffffff', '#dceeff'))
    # Lago helado
    c.gradient(186, 236, ['#6ab0e0', '#8cc8ee', '#b8e2fa'])
    for _ in range(30):
        y = c.r.integers(188, 234); x = c.r.integers(0, W - 12)
        c.rect(x, y, x + c.r.integers(4, 14), y, '#e8f8ff')
    # Icebergs
    for x0, w, h in ((30, 40, 30), (150, 34, 24)):
        c.poly([(x0, 214), (x0 + w * 0.2, 214 - h), (x0 + w * 0.55, 214 - h * 1.2), (x0 + w, 214)], '#e8f6ff')
        c.poly([(x0 + w * 0.55, 214 - h * 1.2), (x0 + w, 214), (x0 + w * 0.6, 214)], '#9ccaf0')
        c.poly([(x0, 214), (x0 + w, 214), (x0 + w * 0.8, 222), (x0 + w * 0.15, 222)], '#7ab0de')
    c.gradient(234, H, ['#e8f4ff', '#d4e8fa', '#bcd8f2', '#a6c8ea'])
    for x in range(0, W, 9):
        c.pine(x + c.r.integers(-2, 3), 244 + c.r.integers(-3, 3), 16 + c.r.integers(0, 6), ('#1f4a5a', '#2b6070', '#3f7a88'), snow='#ffffff')
    # Montones de nieve y cristales en primer plano
    for cx, cy, rx, ry in ((16, 316, 40, 22), (204, 310, 36, 24), (110, 330, 60, 18)):
        c.ell(cx - rx, cy - ry, cx + rx, cy + ry, '#ffffff')
        c.ell(cx - rx + 4, cy - ry + 6, cx + rx - 2, cy + ry, '#dcecfa')
    for x0, y0, h in ((10, 290, 28), (196, 284, 32), (30, 300, 16)):
        c.poly([(x0, y0), (x0 + 5, y0 - h), (x0 + 10, y0)], '#9fe2ff')
        c.poly([(x0 + 5, y0 - h), (x0 + 10, y0), (x0 + 6, y0)], '#5fb4ea')
        c.px(x0 + 4, y0 - h + 4, '#ffffff'); c.px(x0 + 4, y0 - h + 5, '#ffffff')
    c.tufts(80, 250, H, ['#ffffff', '#c4ddf4'])
    c.save('hielo')


# ------------------------------------------------------------------ NAVIDAD
def navidad():
    c = Canvas(44)
    c.gradient(0, 190, ['#0a1030', '#141f4f', '#22336f', '#34508e'])
    c.stars(120, 150, ['#ffffff', '#ffe9a8', '#bcd8ff'])
    c.disc_glow(48, 46, 14, '#fffbe0', ['#e8e4c4', '#3a4c86'])
    c.ell(52, 40, 58, 46, '#e8e2c0'); c.ell(42, 50, 46, 54, '#e8e2c0')
    c.ridge(176, 46, 0.5, 0, ['#3c5288', '#c8d8f2', '#2c3e70'], snow=(10, 0.3, '#eaf2ff', '#b8c8e6'))
    c.gradient(190, H, ['#dce8f8', '#c8daf2', '#b2c8e8', '#9cb6dc'])
    for x in range(0, W, 8):
        c.pine(x + c.r.integers(-2, 3), 196 + c.r.integers(-2, 3), 14 + c.r.integers(0, 6), ('#16402e', '#1f5a3e', '#2f7450'), snow='#ffffff')
    # Casitas con ventanas iluminadas
    def house(x, base, w, h, wall, roof):
        c.rect(x, base - h, x + w, base, wall)
        c.rect(x, base - h, x + 2, base, '#ffffff' if wall == '#c0392b' else '#e8d8c0')
        c.poly([(x - 4, base - h), (x + w / 2, base - h - w * 0.6), (x + w + 4, base - h)], roof)
        c.poly([(x - 4, base - h), (x + w / 2, base - h - w * 0.6), (x + w / 2, base - h - w * 0.6 + 3), (x - 2, base - h + 2)], '#ffffff')
        for wx in range(x + 4, x + w - 5, 9):
            c.rect(wx, base - h + 6, wx + 4, base - h + 11, '#ffd85a')
            c.px(wx + 2, base - h + 8, '#c8902a'); c.rect(wx, base - h + 8, wx + 4, base - h + 8, '#c8902a')
        c.rect(x + w / 2 - 3, base - 9, x + w / 2 + 3, base, '#6b3a1e')
        c.rect(x + w - 8, base - h - w * 0.4, x + w - 4, base - h - 4, '#5a3a2a')
    house(8, 236, 36, 22, '#c0392b', '#7a1e1e')
    house(160, 230, 40, 24, '#8f5a3a', '#4a2a1a')
    house(120, 218, 28, 16, '#2f6a8a', '#1e3a5a')
    # Árbol de Navidad grande con luces
    tx, tb = 64, 300
    for t in range(6):
        ty = tb - 8 - t * 16
        w = (6 - t) * 9 + 4
        c.poly([(tx - w, ty), (tx + w, ty), (tx, ty - 26)], '#14502f')
        c.poly([(tx - w + 2, ty - 1), (tx, ty - 1), (tx, ty - 24)], '#1f6a3c')
        c.poly([(tx - w * 0.7, ty - 1), (tx + w * 0.7, ty - 1), (tx + w * 0.7 - 3, ty + 2), (tx - w * 0.7 + 3, ty + 2)], '#ffffff')
    c.rect(tx - 4, tb - 8, tx + 4, tb, '#5a3218')
    for _ in range(46):
        t = c.r.uniform(0, 1); y = tb - 12 - t * 92; w = (1 - t) * 54 + 4
        x = tx + c.r.uniform(-w * 0.8, w * 0.8)
        c.px(x, y, ['#ff4a4a', '#ffd84a', '#4ad0ff', '#ff8ae0'][c.r.integers(0, 4)])
    star = [(tx, tb - 112), (tx + 3, tb - 105), (tx + 9, tb - 105), (tx + 4, tb - 100), (tx + 6, tb - 93), (tx, tb - 97), (tx - 6, tb - 93), (tx - 4, tb - 100), (tx - 9, tb - 105), (tx - 3, tb - 105)]
    c.poly(star, '#ffe04a')
    # Regalos
    for x, col, rib in ((40, '#d83a3a', '#ffd84a'), (80, '#3a7ad8', '#ffffff'), (94, '#3ab85a', '#ff4a4a')):
        c.rect(x, tb - 9, x + 12, tb + 2, col); c.rect(x + 5, tb - 9, x + 7, tb + 2, rib); c.rect(x, tb - 5, x + 12, tb - 4, rib)
    # Muñeco de nieve
    sx, sy = 172, 300
    c.ell(sx - 12, sy - 14, sx + 12, sy + 6, '#ffffff'); c.ell(sx - 9, sy - 30, sx + 9, sy - 12, '#ffffff'); c.ell(sx - 7, sy - 44, sx + 7, sy - 29, '#ffffff')
    c.px(sx - 3, sy - 38, '#1a1a2a'); c.px(sx + 3, sy - 38, '#1a1a2a'); c.rect(sx, sy - 35, sx + 4, sy - 34, '#ff8a2a')
    c.rect(sx - 9, sy - 30, sx + 9, sy - 28, '#d83a3a'); c.rect(sx + 4, sy - 28, sx + 7, sy - 20, '#d83a3a')
    c.rect(sx - 8, sy - 48, sx + 8, sy - 45, '#1a1a2a'); c.rect(sx - 5, sy - 58, sx + 5, sy - 46, '#1a1a2a')
    for k in range(3):
        c.px(sx, sy - 22 + k * 6, '#1a1a2a')
    for cx, cy, rx, ry in ((200, 324, 40, 16), (110, 330, 56, 16), (6, 326, 30, 14)):
        c.ell(cx - rx, cy - ry, cx + rx, cy + ry, '#ffffff')
    c.tufts(70, 240, H, ['#ffffff', '#b8cae6'])
    c.save('navidad')


# ------------------------------------------------------------- SAN VALENTÍN
def valentin():
    c = Canvas(55)
    c.gradient(0, 196, ['#2a0838', '#4a1250', '#7a2464', '#b8407a', '#e8709a'])
    c.stars(80, 120, ['#ffffff', '#ffc4e0'])
    # Luna con corazón
    c.disc_glow(170, 52, 20, '#ffb4d0', ['#ff86b4', '#c8508e'])
    def heart(cx, cy, s, col):
        c.ell(cx - s, cy - s * 0.8, cx, cy + s * 0.2, col)
        c.ell(cx, cy - s * 0.8, cx + s, cy + s * 0.2, col)
        c.poly([(cx - s, cy - s * 0.2), (cx + s, cy - s * 0.2), (cx, cy + s * 1.1)], col)
    heart(170, 52, 11, '#ff4a8a'); heart(167, 48, 4, '#ff9cc4')
    for cx, cy, s in ((40, 60, 6), (110, 30, 4)):
        c.cloud(cx, cy, s, '#8a2e6a', '#b04a84', '#5a1a4a')
    # Ciudad con ventanas
    x = 0
    while x < W:
        w = int(c.r.integers(10, 22)); h = int(c.r.integers(18, 56))
        c.rect(x, 196 - h, x + w, 196, '#3a1040')
        if c.r.random() < 0.3:
            c.poly([(x, 196 - h), (x + w / 2, 196 - h - 8), (x + w, 196 - h)], '#3a1040')
        for wy in range(196 - h + 4, 192, 6):
            for wx in range(x + 2, x + w - 2, 4):
                if c.r.random() < 0.45:
                    c.px(wx, wy, '#ffb84a'); c.px(wx + 1, wy, '#ffb84a')
        x += w + int(c.r.integers(0, 3))
    # Río reflejando
    c.gradient(196, 236, ['#5a1a5e', '#7a2a70', '#9a3a80'])
    for _ in range(60):
        y = c.r.integers(198, 234); x0 = c.r.integers(0, W - 8)
        c.rect(x0, y, x0 + c.r.integers(2, 9), y, ['#ffb84a', '#ff8ac0', '#ffd0e8'][c.r.integers(0, 3)])
    # Barandilla
    c.rect(0, 236, W, 239, '#2a0a2a')
    for xx in range(0, W, 8):
        c.rect(xx, 228, xx + 1, 238, '#2a0a2a')
    c.rect(0, 227, W, 228, '#4a1a4a')
    # Paseo de adoquines
    c.gradient(240, H, ['#6a3a6a', '#5a2e5e', '#4a2450'])
    for y in range(242, H, 7):
        off = (y // 7) % 2 * 6
        for xx in range(-off, W, 12):
            c.rect(xx, y, xx + 10, y + 5, '#7a4a7a' if (xx + y) % 3 else '#6a3e6e')
            c.rect(xx, y, xx + 10, y, '#9a6a9a')
    # Árboles de corazones
    for tx, tb, s in ((22, 270, 18), (196, 262, 16)):
        c.rect(tx - 2, tb - s * 1.2, tx + 2, tb, '#3a1a20')
        for _ in range(26):
            hx = tx + c.r.uniform(-s * 1.1, s * 1.1); hy = tb - s * 1.4 + c.r.uniform(-s * 0.9, s * 0.6)
            heart(hx, hy, 3, ['#ff4a8a', '#ff86b4', '#e8306a'][c.r.integers(0, 3)])
    # Farolas
    for lx in (60, 156):
        c.rect(lx - 1, 236, lx + 1, 300, '#1a0a1e')
        c.rect(lx - 4, 298, lx + 4, 302, '#1a0a1e')
        c.disc_glow(lx, 230, 4, '#ffe0a0', ['#ff9ac0', '#a03a7a'])
        heart(lx, 229, 3, '#ff4a8a')
    # Rosales
    for bx in (0, 34, 182, 210):
        c.ell(bx - 16, 296, bx + 16, 330, '#1e3a24')
        for _ in range(9):
            rx = bx + c.r.uniform(-12, 12); ry = c.r.uniform(300, 322)
            c.ell(rx - 2, ry - 2, rx + 2, ry + 2, '#d81e4a'); c.px(rx - 1, ry - 1, '#ff6a8a')
    for _ in range(18):
        heart(c.r.uniform(80, 140), c.r.uniform(250, 320), 2, '#ff86b4')
    c.save('sanvalentin')


if __name__ == '__main__':
    for f in (bosque, desierto, hielo, navidad, valentin):
        f(); print(f.__name__, 'ok')
