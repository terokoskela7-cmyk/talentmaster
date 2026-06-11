#!/usr/bin/env python3
# SUPERSEDED: aluelähde on parse_taitokisa_csv.py (2026-06-11). Säilytetty PDF-parsintaesimerkkinä.
"""Alueellisen taitokilpailu-PDF:n parseri (FC Lahti / Eteläinen alue -formaatti).
Erot valtakunnalliseen: ei Piiri-saraketta, sija voi olla '-', osalta riveistä
puuttuu KL aika+vähennys (vain netto), merkki voi puuttua. Summavalidointi
suodattaa korruptoituneet rivit (sivun 2 limittyneet sarakkeet).
Tuottaa: alue-aggregaatti + päivitetty tk_lajiviitteet.js (valtak. + alueellinen).
"""
import pdfplumber, re, json

MEDALS = {'kulta', 'hopea', 'pronssi'}
IK_RE = re.compile(r'^([PT])(\d{1,2})$')
OV_RE = re.compile(r'^\d+\+\d+$')
NUM_RE = re.compile(r'^-?\d+(\.\d+)?$')

def fnum(tok):
    try:
        return float(tok.replace(',', '.'))
    except (ValueError, AttributeError):
        return None

def parse_alue(path, vuosi, kilpailu):
    rows = []
    cur = None
    prev = ''
    rajat = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for line in (page.extract_text() or '').split('\n'):
                line = line.strip()
                m = IK_RE.fullmatch(line)
                if m:
                    cur = (m.group(1), int(m.group(2)))
                    rm = re.fullmatch(r'(\d+)\s+(\d+)\s+(\d+)', prev)
                    if rm and cur not in rajat:
                        rajat[cur] = [int(rm.group(1)), int(rm.group(2)), int(rm.group(3))]
                    prev = line
                    continue
                prev = line
                if cur is None:
                    continue
                toks = line.split()
                if len(toks) < 6 or (toks[0] != '-' and not toks[0].isdigit()):
                    continue
                sp, ika = cur
                has_pp = ika >= 12
                t = list(toks)
                merkki = None
                if t[-1].lower() in MEDALS:
                    merkki = t[-1].lower(); t = t[:-1]
                # kerää loppupään numerot/OV-tokenit (nimen jälkeen)
                tail = []
                for tok in reversed(t):
                    if NUM_RE.fullmatch(tok) or OV_RE.fullmatch(tok) or tok.upper() == 'ES':
                        tail.append(tok)
                    else:
                        break
                tail.reverse()
                r = {'vuosi': vuosi, 'kilpailu': kilpailu, 'sp': sp, 'ika': ika, 'merkki': merkki}
                try:
                    if has_pp:
                        # ... syotto puj OV vah ponn loppu — alusta: [aika] [rang] tulos
                        if len(tail) < 7:
                            continue
                        r['kokonaistulos'] = fnum(tail[-1]); r['ponnauttelu'] = fnum(tail[-2])
                        vah = fnum(tail[-3]); ov = tail[-4]
                        if not OV_RE.fullmatch(ov):
                            continue
                        r['pp_bonus'] = -vah if vah is not None else None
                        r['pujottelu'] = fnum(tail[-5]); r['syotto'] = fnum(tail[-6])
                        r['kl_tulos'] = fnum(tail[-7])  # netto (aika/rang voivat puuttua → eivät haittaa)
                    else:
                        # ... tulos syotto puj ponn loppu — alusta: [aika] [rang]
                        if len(tail) < 5:
                            continue
                        r['kokonaistulos'] = fnum(tail[-1]); r['ponnauttelu'] = fnum(tail[-2])
                        r['pujottelu'] = fnum(tail[-3]); r['syotto'] = fnum(tail[-4])
                        r['kl_tulos'] = fnum(tail[-5])
                except (IndexError, TypeError):
                    continue
                # summavalidointi = ainoa hyväksymisportti (suodattaa korruptiot)
                parts = [r.get('kl_tulos'), r.get('syotto'), r.get('pujottelu'), r.get('ponnauttelu')]
                if any(p is None for p in parts) or r['kokonaistulos'] is None:
                    continue
                calc = sum(parts) - (r.get('pp_bonus') or 0)
                if abs(calc - r['kokonaistulos']) > 0.15:
                    continue
                rows.append(r)
    return rows, rajat

def pct(vals, q):
    vals = sorted(vals)
    if not vals:
        return None
    k = (len(vals) - 1) * q
    f, c = int(k), min(int(k) + 1, len(vals) - 1)
    return round(vals[f] + (vals[c] - vals[f]) * (k - f), 1)


LAHTEET = [
    ('/sessions/sharp-modest-gates/mnt/uploads/taitokisa FC Lahti.pdf', 2025, 'Eteläinen alue 5.10.2025 (FC Lahti)'),
    ('/sessions/sharp-modest-gates/mnt/uploads/taitokisa ONS 2024.pdf', 2024, 'Pohjoinen alue 13.10.2024 (ONS)'),
    ('/sessions/sharp-modest-gates/mnt/uploads/taitokisa TuPS 2025.pdf', 2025, 'Eteläinen alue 28.9.2025 (TuPS)'),
]
rows, rajat = [], {}
for path, vuosi, kilpailu in LAHTEET:
    r, rj = parse_alue(path, vuosi, kilpailu)
    print(kilpailu, '->', len(r), 'riviä')
    rows += r
    for k, v in rj.items():
        rajat.setdefault(k, v)
print('Kelvollisia rivejä yhteensä:', len(rows))
from collections import Counter
print('Per ikäluokka:', dict(sorted(Counter(r['sp'] + str(r['ika']) for r in rows).items())))
print('Merkkirajat PDF:istä:', {k[0]+str(k[1]): v for k, v in sorted(rajat.items())})

TOP_N = 20
alue_agg = {}
for (sp, ika) in [('P', 8), ('P', 11), ('P', 13), ('T', 8), ('T', 11), ('T', 13)]:
    rs = [r for r in rows if r['sp'] == sp and r['ika'] == ika]
    if len(rs) < 5:
        if rs:
            print(f'OHITETTU {sp}{ika}: n={len(rs)} < 5')
        continue
    rs = sorted(rs, key=lambda r: r['kokonaistulos'])[:TOP_N]
    a = {'n': len(rs)}
    for laji in ['syotto', 'pujottelu', 'ponnauttelu', 'kl_tulos', 'pp_bonus', 'kokonaistulos']:
        vals = [r[laji] for r in rs if r.get(laji) is not None]
        if vals:
            a[laji] = {'n': len(vals), 'p25': pct(vals, .25), 'p50': pct(vals, .50), 'p75': pct(vals, .75)}
    alue_agg.setdefault(sp, {})[ika] = a
    print(f'{sp}{ika}: top-{len(rs)} ->', {k: (v['p25'], v['p50']) for k, v in a.items() if isinstance(v, dict)})

import json
json.dump({'rivit': rows, 'aggregaatti': alue_agg},
          open('/sessions/sharp-modest-gates/mnt/outputs/taitokisa_alue_data.json', 'w'),
          ensure_ascii=False, indent=1)

nat = json.load(open('/sessions/sharp-modest-gates/mnt/outputs/taitokisa_data.json'))['aggregaatti']
LAJIT = [('syotto', 'syotto'), ('pujottelu', 'pujottelu'), ('ponnauttelu', 'ponnauttelu'),
         ('kl_tulos', 'kuljetus_laukaus')]

def blokki(a, ika, lahde, vuodet):
    out = ['    %d: { // n=%d, %s' % (ika, a['n'], vuodet)]
    for key, nimi in LAJIT:
        if key in a:
            out.append('      %s: { erinomainen: %.1f, hyva: %.1f },' % (nimi, a[key]['p25'], a[key]['p50']))
    if 'pp_bonus' in a:
        out.append('      pituuspotku_bonus: { erinomainen: %.1f, hyva: %.1f },' % (a['pp_bonus']['p75'], a['pp_bonus']['p50']))
    out.append("      _n: %d, _lahde: '%s'," % (a['n'], lahde))
    out.append('    },')
    return out

L = []
L.append('// TK_LAJIVIITTEET — per-laji viitetasot.')
L.append("// Lähteet: _lahde 'valtakunnallinen' = loppukilpailut 2023–2025 (84 riviä, summavalidointi 0 virhettä)")
L.append("//          _lahde 'alueellinen'      = alueelliset kilpailut: Eteläinen 2025 (FC Lahti + TuPS) +")
L.append('//                                      Pohjoinen 2024 (ONS) — top-20 kokonaisajalla per ikä/sp.')
L.append('//          P8, P11 ja 13-v eivät ole valtakunnallisissa → alueellinen lähde (TKI_ANALYYSIMALLI.md §8.7).')
L.append('// erinomainen = kohortin P25 · hyva = P50 · kehitettävä = > hyva. pituuspotku_bonus: SUUREMPI=parempi (P75/P50).')
L.append('// EI MITALI — mitali jaetaan vain kokonaisajasta (CLAUDE.md §31). kuljetus_laukaus = NETTO.')
L.append('// EI interpolointia puuttuville ikäluokille — radat ovat ikäluokkakohtaisia.')
L.append('const TK_LAJIVIITTEET = {')
for sp in ('P', 'T'):
    L.append('  %s: {' % sp)
    iat = sorted(set(list(map(int, nat.get(sp, {}).keys())) + list(alue_agg.get(sp, {}).keys())))
    for ika in iat:
        a_nat = nat.get(sp, {}).get(str(ika))
        if a_nat and a_nat['n'] >= 5:
            L += blokki(a_nat, ika, 'valtakunnallinen', 'vuodet ' + '+'.join(map(str, a_nat['vuodet'])))
        elif alue_agg.get(sp, {}).get(ika):
            L += blokki(alue_agg[sp][ika], ika, 'alueellinen', 'alueelliset 2024–25, top-20')
        else:
            L.append('    // %d: ei riittävää dataa (n<5)' % ika)
    L.append('  },')
L.append('};')
open('/sessions/sharp-modest-gates/mnt/outputs/tk_lajiviitteet_v2.js', 'w').write('\n'.join(L) + '\n')
print('--- generoitu ---')
