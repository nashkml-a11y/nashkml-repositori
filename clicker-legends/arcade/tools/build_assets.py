"""Empaqueta todos los recursos gráficos en src/assets.gen.js (data URIs).

- Mascotas: 25 recortadas de las maquetas + 16 pixeladas desde Noto Emoji.
- Iconos: recortes de las maquetas + Noto pixelado para cada emoji usado
  en el juego (lista en tools/emojis.json, generada por build.mjs).
- Fondos (9) y huevos (19).
"""
import os, io, json, base64, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixelize import pixelize, GOLD

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')

NOTO_PETS = ["🐶","🐱","🐰","🦊","🦄","🐉","🌈","🦂","🐍","🦅","🐪","🐫","🧊","⛄","🦌","🎅"]
ALIAS = {'🏠':'home','🐾':'paw','🥚':'egg','🌎':'globe','🔄':'rebirth','🎯':'target','💾':'floppy',
         '👆':'hand','⚡':'bolt','🔥':'fire','💥':'crit','📖':'book','🌳':'tree','🏜️':'cactus','🌵':'cactus',
         '🌋':'volcano','🚀':'rocket','🎃':'pumpkin','🎄':'xmastree','💝':'heart','❤️':'heart','☀️':'sun'}


def uri(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


def ent(im, **extra):
    d = {'src': uri(im), 'w': im.width, 'h': im.height}; d.update(extra); return d


def name_of(e):
    return '-'.join('%x' % ord(c) for c in e)


def shade(im):
    """Sombreado vertical suave para dar volumen a los sprites de Noto."""
    a = np.array(im).astype(float)
    h = a.shape[0]
    k = np.linspace(1.10, 0.82, h)[:, None]
    a[..., :3] = np.clip(a[..., :3] * k[..., None] if a.ndim == 3 else a, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main():
    emojis = json.load(open(os.path.join(ROOT, 'tools', 'emojis.json'), encoding='utf-8'))
    out = {'pets': {}, 'icons': {}, 'bg': {}, 'eggs': {}}
    # Mascotas
    for f in os.listdir(os.path.join(A, 'pets')):
        e = ''.join(chr(int(x, 16)) for x in f[:-4].split('-'))
        out['pets'][e] = ent(Image.open(os.path.join(A, 'pets', f)).convert('RGBA'))
    for e in NOTO_PETS:
        im = pixelize(e, 42, 18, tint=GOLD if e == '🐫' else None)
        out['pets'][e] = ent(shade(im))
    # Iconos de referencia (por nombre y por alias de emoji)
    ref = {}
    for f in os.listdir(os.path.join(A, 'icons_ref')):
        ref[f[:-4]] = ent(Image.open(os.path.join(A, 'icons_ref', f)).convert('RGBA'))
    out['icons'].update(ref)
    for e in emojis:
        if e in ALIAS and ALIAS[e] in ref:
            out['icons'][e] = ref[ALIAS[e]]; continue
        im = pixelize(e, 20, 14)
        if im is None:
            print('sin glifo:', e); continue
        out['icons'][e] = ent(im)
    # Fondos
    for f in os.listdir(os.path.join(A, 'bg')):
        out['bg'][f[:-4]] = uri(Image.open(os.path.join(A, 'bg', f)))
    # Huevos (+ paleta para los fragmentos de cáscara)
    for f in os.listdir(os.path.join(A, 'eggs')):
        im = Image.open(os.path.join(A, 'eggs', f)).convert('RGBA')
        px = [tuple(p[:3]) for p in np.array(im).reshape(-1, 4) if p[3] > 0]
        vals, cnt = np.unique(np.array(px), axis=0, return_counts=True)
        top = vals[np.argsort(-cnt)][:4]
        pal = ['#%02x%02x%02x' % tuple(int(v) for v in c) for c in top]
        out['eggs'][f[:-4]] = ent(im, pal=pal)
    js = '/* GENERADO por tools/build_assets.py */\nconst ASSETS = ' + json.dumps(out, ensure_ascii=False) + ';\n'
    open(os.path.join(ROOT, 'src', 'assets.gen.js'), 'w', encoding='utf-8').write(js)
    print('mascotas', len(out['pets']), 'iconos', len(out['icons']), 'fondos', len(out['bg']), 'huevos', len(out['eggs']),
          'tamaño', len(js) // 1024, 'KB')


if __name__ == '__main__':
    main()
