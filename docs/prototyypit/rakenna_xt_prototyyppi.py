"""Rakentaa xT-prototyypin kaksi versiota samasta rungosta:
   1) TalentMaster_xT_Prototyyppi.html (repo juuri) — lataa libit <script src>:llä kuten muutkin apit
   2) --artifact POLKU — libit inlinena (itsenäinen sivu jaettavaksi)
Aja: python3 docs/prototyypit/rakenna_xt_prototyyppi.py [--artifact /polku/ulos.html]"""
import sys, pathlib
JUURI = pathlib.Path(__file__).resolve().parents[2]
RUNKO = (JUURI / 'docs/prototyypit/xt_prototyyppi_runko.html').read_text(encoding='utf-8')
LIBIT = ['lib/tm_kaavio_render.js', 'lib/tm_kaavio_kanon_data.js', 'lib/tm_xt.js', 'lib/tm_xt_kerros.js']

tagit = '\n'.join('<script src="%s?v=1"></script>' % l for l in LIBIT)
repo = '<!DOCTYPE html>\n<html lang="fi">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' \
       + RUNKO.replace('<!--LIBS-->', tagit).replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1) + '\n</body>\n</html>\n'
(JUURI / 'TalentMaster_xT_Prototyyppi.html').write_text(repo, encoding='utf-8')

if '--artifact' in sys.argv:
    ulos = pathlib.Path(sys.argv[sys.argv.index('--artifact') + 1])
    inline = '\n'.join('<script>\n/* %s */\n%s\n</script>' % (l, (JUURI / l).read_text(encoding='utf-8').replace('</script', '<\\/script')) for l in LIBIT)
    ulos.parent.mkdir(parents=True, exist_ok=True)
    ulos.write_text(RUNKO.replace('<!--LIBS-->', inline), encoding='utf-8')
print('ok')
