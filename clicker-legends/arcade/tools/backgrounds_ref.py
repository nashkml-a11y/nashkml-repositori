"""Repixela los fondos de referencia a rejilla nativa con paleta limitada."""
import os
from PIL import Image
from extract_sprites import REF, ROOT

OUT = os.path.join(ROOT, 'assets', 'bg')
os.makedirs(OUT, exist_ok=True)
W, H = 216, 324          # rejilla nativa 2:3 (factor ~4,7 respecto a 1024x1536)
SRC = {'volcan': 'fondo-volcan', 'espacio': 'fondo-espacio',
       'verano': 'fondo-verano', 'halloween': 'fondo-halloween'}

if __name__ == '__main__':
    for key, f in SRC.items():
        im = Image.open(os.path.join(REF, f + '.png')).convert('RGB')
        small = im.resize((W, H), Image.BOX)
        q = small.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        q.convert('RGB').save(os.path.join(OUT, key + '.png'), optimize=True)
        print(key, os.path.getsize(os.path.join(OUT, key + '.png')))
