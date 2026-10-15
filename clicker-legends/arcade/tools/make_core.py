"""Genera src/core.gen.js a partir del HTML original.

Copia literalmente el <script> principal del original y elimina SOLO las
funciones de presentación (render, efectos, sonido, avisos), que la versión
arcade redefine en src/ui.js, src/fx.js y src/audio.js. Toda la lógica de
juego (fórmulas, probabilidades, costes, guardado, temporizadores) queda
byte a byte igual. También extrae los datos de auras y los códigos extra.

Además escribe tools/core.removed.txt con lo eliminado, para auditoría.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'referencia', 'Clicker_Legends_TERMINADO.html')

# Funciones de presentación sustituidas por la capa arcade.
REMOVE = [
    # render y HUD
    'render', 'renderStats', 'renderPokedex', 'renderAchievements', 'renderUpgradeTree',
    'renderAdShop', 'renderTokenShop', 'renderSkins', 'skinCardHTML', 'applyButtonSkin',
    'renderTime', 'timeRewardButtonHTML', 'timeRewardItemHTML', 'renderWorldRequirements',
    'renderRebirthRequirements', 'cl2RenderCombo', 'cl2RenderCrit', 'cl2RenderLuck',
    'updateAutoEggButton', 'showAutoEggSummary',
    # efectos visuales
    'float', 'particles', 'confetti', 'pulseClickButton', 'spawnGoldenOrb',
    # avisos y modales
    'toast', 'showConfirm', 'showSeasonNotice',
    # animación de huevo (misma lógica, nueva presentación)
    'showEgg',
    # sonido (mismos eventos, timbre chiptune)
    'tone', 'chord', 'punch', 'sfx',
    # usan confirm() nativo: se sustituyen por el modal arcade (src/patches.js)
    'deletePetUnit', 'deleteShinyUnit', 'deleteGoldenUnit',
]


def main_script(html):
    start = html.index('<script>\n\n/* =====================================================\n   FASE 1')
    body_start = html.index('\n', start) + 1
    end = html.index('</script>', body_start)
    return html[body_start:end]


def find_function(src, name):
    m = re.search(r'(^|\n)function %s\(' % re.escape(name), src)
    if not m:
        return None
    i = m.start() + (1 if m.group(1) else 0)
    j = src.index('{', i)
    depth, k = 0, j
    in_str = None
    while k < len(src):
        ch = src[k]
        if in_str:
            if ch == '\\':
                k += 2; continue
            if ch == in_str:
                in_str = None
            elif in_str == '`' and ch == '$' and src[k + 1] == '{':
                # interpolación: contar llaves dentro con un subescáner simple
                d2, k = 1, k + 2
                while d2:
                    if src[k] == '{': d2 += 1
                    elif src[k] == '}': d2 -= 1
                    k += 1
                continue
        else:
            if ch in '"\'`':
                in_str = ch
            elif ch == '/' and src[k + 1] == '*':
                k = src.index('*/', k) + 2; continue
            elif ch == '/' and src[k + 1] == '/':
                k = src.index('\n', k); continue
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i, k + 1
        k += 1
    raise SystemExit('sin cierre: ' + name)


def block(html, sid):
    a = html.index('<script id="%s">' % sid)
    a = html.index('\n', a) + 1
    return html[a:html.index('</script>', a)]


def main():
    html = open(SRC, encoding='utf-8').read()
    core = main_script(html)
    removed = []
    for name in REMOVE:
        span = find_function(core, name)
        if not span:
            raise SystemExit('no encontrada: ' + name)
        i, j = span
        removed.append('/* ---- %s ---- */\n%s\n' % (name, core[i:j]))
        core = core[:i] + '/* [arcade] %s() → capa de presentación */' % name + core[j:]
        if find_function(core, name):
            raise SystemExit('duplicada: ' + name)

    # Datos/funciones de auras del bloque skins-v2-engine (lógica de compra y bonus).
    eng = block(html, 'skins-v2-engine')
    aura_data = eng[eng.index('const AURAS_V2=['):eng.index('function ensureAuraSection')]
    aura_buy = eng[eng.index('function buyAuraV2'):eng.index('function renderSkins')]
    codes = block(html, 'CL2_CODES')

    out = os.path.join(ROOT, 'src', 'core.gen.js')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('/* GENERADO por tools/make_core.py desde referencia/Clicker_Legends_TERMINADO.html.\n'
                '   No editar a mano: la lógica es copia literal del original. */\n')
        f.write(core)
    with open(os.path.join(ROOT, 'src', 'auras.gen.js'), 'w', encoding='utf-8') as f:
        f.write('/* GENERADO: datos y compra de auras (bloque skins-v2-engine del original). */\n')
        f.write(aura_data + '\n' + aura_buy)
    with open(os.path.join(ROOT, 'src', 'codes.gen.js'), 'w', encoding='utf-8') as f:
        f.write('/* GENERADO: códigos extra (bloque CL2_CODES del original). */\n' + codes)
    with open(os.path.join(ROOT, 'tools', 'core.removed.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(removed))
    print('core.gen.js', len(core), 'bytes; eliminadas', len(removed))


if __name__ == '__main__':
    main()
