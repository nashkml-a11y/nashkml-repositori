"""Recorta iconos pixel art de las maquetas (pestañas, barra inferior, marcadores)."""
import os
from PIL import Image
from extract_sprites import extract, REF, ROOT

OUT = os.path.join(ROOT, 'assets', 'icons_ref')
os.makedirs(OUT, exist_ok=True)

ICONS = [
    # (imagen, nombre, caja, tolerancia)
    ('bestiario-hielo', 'paw', (92, 14, 162, 70), 40),
    ('bestiario-hielo', 'tree', (392, 21, 452, 70), 40),
    ('bestiario-hielo', 'cactus', (698, 12, 752, 72), 40),
    ('bestiario-hielo', 'volcano', (392, 90, 452, 154), 40),
    ('bestiario-hielo', 'rocket', (698, 90, 754, 154), 40),
    ('bestiario-hielo', 'pumpkin', (92, 170, 154, 234), 40),
    ('bestiario-hielo', 'xmastree', (392, 175, 449, 231), 40),
    ('bestiario-hielo', 'heart', (698, 173, 754, 234), 40),
    ('bestiario-hielo', 'sun', (392, 248, 454, 309), 40),
    ('bestiario-hielo', 'bolt', (220, 588, 264, 638), 40),
    ('home-desierto', 'hand', (56, 20, 167, 137), 46),
    ('home-desierto', 'floppy', (893, 43, 967, 117), 30),
    ('home-desierto', 'home', (52, 1368, 138, 1450), 40),
    ('home-desierto', 'egg', (388, 1366, 462, 1452), 40),
    ('home-desierto', 'globe', (552, 1366, 635, 1450), 40),
    ('home-desierto', 'rebirth', (718, 1368, 802, 1450), 40),
    ('home-desierto', 'target', (884, 1366, 972, 1452), 40),
    ('home-desierto', 'bolt_big', (108, 1030, 184, 1130), 46),
    ('home-desierto', 'fire', (590, 1030, 685, 1130), 46),
    ('home-desierto', 'crit', (88, 1186, 192, 1294), 46),
    ('home-desierto', 'paw_big', (586, 1186, 686, 1276), 46),
    ('bestiario-espacio', 'book', (334, 16, 431, 88), 40),
    ('bestiario-espacio', 'back', (76, 20, 170, 108), 30),
]

if __name__ == '__main__':
    cache = {}
    for f, name, box, tol in ICONS:
        if f not in cache:
            cache[f] = Image.open(os.path.join(REF, f + '.png'))
        try:
            im = extract(cache[f], box, 1, tol=tol, colors=14, maxsize=22)
            im.save(os.path.join(OUT, name + '.png')); print(name, im.size)
        except SystemExit as e:
            print('FALLO', name, e)
