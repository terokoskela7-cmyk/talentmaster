"""Pelaajaraportin pizza-profiili palvelinpuolella (mplsoccer PyPizza) — PROTOTYYPPI.

Tarkoitus: todistaa, että sama pizza-profiili jonka VP_v25/Master_v16 piirtävät JS:llä voidaan tuottaa
palvelimella PDF:ksi (Firebase Functions, Python-runtime) samasta datasopimuksesta.

DATASOPIMUS (sama kuin JS-komponentilla):
  viipale = { dim: 'D1'..'D5', nimi, taso: 1–5 | None, raaka: str, lahde: 'mitattu'|'havaittu'|'xt',
              tila: None | 'kehityskaista' | 'tulossa', xfactor: bool }
  taso 3 = ikäluokan keskitaso (Eerikkilä FINAL2024 / havaittu 1–5). EI prosenttipisteitä: TalentMasterin
  normit ovat tasoja, joten pizza ei keksi persentiilejä joita datassa ei ole.

Aja: python3 docs/prototyypit/pelaajaraportti_pizza.py --fontit <kansio> --ulos <kansio>
"""
import argparse, pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Patch
from mplsoccer import PyPizza

BONE, CARBON, TEAL, TEAL_D, SLATE, AMBER = '#F2EFE6', '#1C1C1A', '#1A7A5E', '#28B090', '#585751', '#7A5A10'
DIM_NIMI = {'D1': 'Fyysinen', 'D2': 'Tekninen', 'D3': 'Psyykkinen', 'D4': 'Peliäly', 'D5': 'Sosiaalinen'}

# Esimerkkipelaaja — KUVITTEELLINEN data (ei oikea alaikäinen).
EEMIL = {
    'nimi': 'Eemil Laakso', 'rooli': 'Laituri (LA) · #7 · Esimerkki FC P16 · 16 v',
    'viipaleet': [
        ('D1', '10 m', 4, '1,76 s', 'mitattu', False), ('D1', '30 m', 5, '4,18 s', 'mitattu', True),
        ('D1', 'CMJ', 4, '39 cm', 'mitattu', False), ('D1', 'MAS', 3, '15,6 km/h', 'mitattu', False),
        ('D1', 'Kasirata', 4, '8,41 s', 'mitattu', False),
        ('D2', 'Pujottelu', 5, '3/3', 'mitattu', False), ('D2', 'Syöttö', 3, '2/3', 'mitattu', False),
        ('D2', 'SM pallolla', 4, '6,95 s', 'mitattu', False), ('D2', 'Kuljetus ahtaassa', 4, 'havaittu', 'havaittu', False),
        ('D2', 'Ensimmäinen kosketus', 3, 'havaittu', 'havaittu', False),
        ('D3', 'Kehittymisen halu', 4, 'havaittu', 'havaittu', False), ('D3', 'Itseluottamus', 3, 'havaittu', 'havaittu', False),
        ('D3', 'Kuorman sieto', 3, 'havaittu', 'havaittu', False),
        ('D4', 'Päätöksenteko', 3, 'havaittu', 'havaittu', False), ('D4', 'Ajoitus', 4, 'havaittu', 'havaittu', False),
        ('D4', 'Peli paineessa', 2, 'havaittu', 'havaittu', False), ('D4', 'Luotu uhka (xT)', 4, 'laiturit', 'xt', False),
        ('D5', 'Joukkuerooli', 4, 'havaittu', 'havaittu', False), ('D5', 'Vuorovaikutus', 3, 'havaittu', 'havaittu', False),
    ],
}


def fontit(kansio):
    k = pathlib.Path(kansio)
    for f in k.glob('*.ttf'):
        font_manager.fontManager.addfont(str(f))
    return {'serif': 'Cormorant Garamond', 'sans': 'DM Sans', 'mono': 'DM Mono'}


def piirra(pelaaja, F, ulos):
    v = pelaaja['viipaleet']
    params = [x[1] for x in v]
    arvot = [x[2] for x in v]
    slice_col, face_alpha = [], []
    for dim, nimi, taso, raaka, lahde, xf in v:
        slice_col.append(TEAL_D if xf else TEAL)
    baker = PyPizza(
        params=params, min_range=[0] * len(v), max_range=[5] * len(v),
        background_color=BONE, straight_line_color=BONE, straight_line_lw=1.2,
        last_circle_color=CARBON, last_circle_lw=0.8, other_circle_color='#C9C5B8', other_circle_lw=0.5,
        other_circle_ls='-', inner_circle_size=14,
    )
    fig, ax = baker.make_pizza(
        arvot, figsize=(8.27, 11.69), color_blank_space='same', blank_alpha=0.07,
        param_location=108, kwargs_slices=dict(facecolor=TEAL, edgecolor=BONE, zorder=2, linewidth=1),
        kwargs_params=dict(color=CARBON, fontsize=8.5, fontfamily=F['sans'], va='center'),
        kwargs_values=dict(color=BONE, fontsize=8.5, fontfamily=[F['mono'], 'DejaVu Sans'], zorder=3,
                           bbox=dict(edgecolor=TEAL, facecolor=TEAL, boxstyle='square,pad=0.25', lw=0.8)),
    )
    # lähde-tekstuuri: havaittu = vaalea täyttö + reunaviiva, xt = katkoviiva, X-Factor = kirkas teal
    for i, (dim, nimi, taso, raaka, lahde, xf) in enumerate(v):
        s = baker.get_slices_list()[i] if hasattr(baker, 'get_slices_list') else ax.patches[i]
        if xf:
            s.set_facecolor(TEAL_D)
        elif lahde in ('havaittu', 'xt'):
            s.set_facecolor((26 / 255, 122 / 255, 94 / 255, 0.22)); s.set_edgecolor(TEAL); s.set_linewidth(1.0)
            if lahde == 'xt':
                s.set_linestyle((0, (3, 2)))
    for t, (_, _, _, _, lahde, xf) in zip(baker.get_value_texts(), v):
        t.set_text(('✦ ' if xf else '') + t.get_text())
        if lahde != 'mitattu' and not xf:
            t.set_color(TEAL); t.get_bbox_patch().set_facecolor(BONE)
    ax.set_position([0.08, 0.2, 0.84, 0.6])
    fig.text(0.08, 0.955, 'TALENTMASTER™ · PELAAJARAPORTTI', fontfamily=F['sans'], fontsize=8, color=TEAL, fontweight='bold')
    fig.text(0.92, 0.955, 'Syksy 2026', fontfamily=F['mono'], fontsize=8, color=SLATE, ha='right')
    fig.text(0.08, 0.915, pelaaja['nimi'], fontfamily=F['serif'], fontsize=30, color=CARBON)
    fig.text(0.08, 0.893, pelaaja['rooli'], fontfamily=F['sans'], fontsize=9.5, color=SLATE)
    fig.text(0.08, 0.872, 'Taso 1–5 = ikäluokan normitaso (3 = ikäluokan keskitaso). Esimerkkipelaaja, kuvitteellinen data.',
             fontfamily=F['sans'], fontsize=7.5, color=SLATE)
    leg = [Patch(facecolor=TEAL, label='Mittaus'), Patch(facecolor=(26 / 255, 122 / 255, 94 / 255, .22), edgecolor=TEAL, label='Pelihavainto'),
           Patch(facecolor=(26 / 255, 122 / 255, 94 / 255, .22), edgecolor=TEAL, linestyle='--', label='Ottelu (xT, pelipaikan sisällä)'),
           Patch(facecolor=TEAL_D, label='✦ X-Factor (taso 5)')]
    fig.legend(handles=leg, loc='lower left', bbox_to_anchor=(0.08, 0.12), ncol=2, frameon=False,
               prop=font_manager.FontProperties(family=[F['sans'], 'DejaVu Sans'], size=8))
    fig.text(0.08, 0.075, 'Renderöity palvelimella: mplsoccer PyPizza · sama datasopimus kui VP:n JS-komponentilla.'.replace('kui ', 'kuin '),
             fontfamily=F['mono'], fontsize=6.5, color=SLATE)
    ulos = pathlib.Path(ulos); ulos.mkdir(parents=True, exist_ok=True)
    fig.savefig(ulos / 'pelaajaraportti_mplsoccer.pdf', facecolor=BONE)
    fig.savefig(ulos / 'pelaajaraportti_mplsoccer.png', facecolor=BONE, dpi=110)
    return ulos


if __name__ == '__main__':
    a = argparse.ArgumentParser(); a.add_argument('--fontit', required=True); a.add_argument('--ulos', required=True)
    o = a.parse_args()
    print(piirra(EEMIL, fontit(o.fontit), o.ulos))
