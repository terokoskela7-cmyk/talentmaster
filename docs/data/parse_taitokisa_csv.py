#!/usr/bin/env python3
"""Alueellisten taitokilpailujen CSV-ingest (Google Sheets -vuositiedostot 2023–2025).
Korvaa PDF-pohjaisen aluelähteen (parse_taitokisa_alue.py) — sama aggregaatti­muoto.
Skeema: kausi,alue,kilpailu,nimi,pvm,ikäluokka,seura,sukupuoli,etunimi,sukunimi,
        palloid,KuljetusLaukaus(netto),Syöttö,Pujottelu,Ponnauttelu,Lopputulos,Merkki
Suodattimet:
  - 'Valtakunnallinen *' -kilpailut pois (jo kansallisessa datassa, taitokisa_data.json)
  - summavalidointi: lajisumma − Lopputulos = pituuspotkubonus (vain ≥12 v, 0–20 s)
  - swap-/korruptiosuodatus: lajikohtaiset järkevyysrajat
  - dedup per (sp, ikä, nimi): paras kokonaistulos
Tuottaa: taitokisa_alue_2023_2025.json + docs/tk_lajiviitteet.js (TK_LAJIVIITTEET_ALUE + TK_LAJIVIITTEET_VALTAK
+ TK_LAJITASOT) + saman lohkon kopiot docs/testit_indeksit.js:ään ja TalentMaster_VP_v25.html:ään (merkkien väliin).
"""
import csv, json, os, re
from collections import Counter

OUT = os.path.dirname(os.path.abspath(__file__))  # docs/data/
IK_RE = re.compile(r'^([PT])(\d{1,2})$')
CSVT = [f'{OUT}/taitokisa_alue_{v}.csv' for v in (2023, 2024, 2025)]

def fnum(s):
    s = (s or '').strip().replace(',', '.')
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None

rows, hylatyt = [], Counter()
for path in CSVT:
    with open(path, encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f):
            kilpailu = (r.get('kilpailu') or '').strip()
            if kilpailu.lower().startswith('valtakunnallinen'):
                hylatyt['valtakunnallinen']; hylatyt['valtakunnallinen'] += 1
                continue
            m = IK_RE.fullmatch((r.get('ikäluokka') or '').strip())
            if not m:
                hylatyt['ikäluokka'] += 1
                continue
            sp, ika = m.group(1), int(m.group(2))
            if not 8 <= ika <= 13:
                hylatyt['ikä-rajaus'] += 1
                continue
            kl = fnum(r.get('KuljetusLaukaus')); sy = fnum(r.get('Syöttö'))
            pu = fnum(r.get('Pujottelu')); po = fnum(r.get('Ponnauttelu'))
            loppu = fnum(r.get('Lopputulos'))
            if None in (kl, sy, pu, po, loppu):
                hylatyt['tyhjä'] += 1
                continue
            # järkevyysrajat (sarakkeenvaihto-korruptiot, esim. pujottelu 7.1 s)
            if not (4 <= kl <= 60.05 and 15 <= sy <= 60.05 and 20 <= pu <= 60.05
                    and 3 <= po <= 40.05 and loppu <= 200.05):
                hylatyt['järkevyys'] += 1
                continue
            s = kl + sy + pu + po
            if ika >= 12:
                bonus = s - loppu
                if not -0.15 <= bonus <= 20.05:
                    hylatyt['summa'] += 1
                    continue
                bonus = round(max(bonus, 0.0), 1)
            else:
                if abs(s - loppu) > 0.15:
                    hylatyt['summa'] += 1
                    continue
                bonus = None
            rows.append({
                'vuosi': int(r['kausi']), 'kilpailu': kilpailu, 'alue': r.get('alue', ''),
                'sp': sp, 'ika': ika,
                'nimi': ((r.get('etunimi') or '').strip() + ' ' + (r.get('sukunimi') or '').strip()).strip(),
                'seura': (r.get('seura') or '').strip(),
                'kl_tulos': kl, 'syotto': sy, 'pujottelu': pu, 'ponnauttelu': po,
                'pp_bonus': bonus, 'kokonaistulos': loppu,
                'merkki': (r.get('Merkki') or '').strip().lower() or None,
            })

print('Kelvollisia rivejä:', len(rows), '| hylätyt:', dict(hylatyt))

# dedup: sama pelaaja samassa ikäluokassa → paras kokonaistulos
best = {}
for r in rows:
    k = (r['sp'], r['ika'], r['nimi'].lower())
    if k not in best or r['kokonaistulos'] < best[k]['kokonaistulos']:
        best[k] = r
rows_d = list(best.values())
print('Dedupin jälkeen (uniikit pelaajat/ikäluokka):', len(rows_d))
print('Per ikäluokka:', dict(sorted(Counter(r['sp'] + str(r['ika']) for r in rows_d).items())))

def pct(vals, q):
    vals = sorted(vals)
    if not vals:
        return None
    k = (len(vals) - 1) * q
    f, c = int(k), min(int(k) + 1, len(vals) - 1)
    return round(vals[f] + (vals[c] - vals[f]) * (k - f), 1)

TOP_N = 20
alue_agg = {}
for sp in ('P', 'T'):
    for ika in range(8, 14):
        rs = [r for r in rows_d if r['sp'] == sp and r['ika'] == ika]
        if len(rs) < 5:
            continue
        rs = sorted(rs, key=lambda r: r['kokonaistulos'])[:TOP_N]
        a = {'n': len(rs), 'pool': len([r for r in rows_d if r['sp'] == sp and r['ika'] == ika])}
        for laji in ('syotto', 'pujottelu', 'ponnauttelu', 'kl_tulos', 'pp_bonus', 'kokonaistulos'):
            vals = [r[laji] for r in rs if r.get(laji) is not None]
            if vals:
                a[laji] = {'n': len(vals), 'p25': pct(vals, .25), 'p50': pct(vals, .50), 'p75': pct(vals, .75)}
        alue_agg.setdefault(sp, {})[ika] = a
        print('%s%d: pool=%d top-%d  ' % (sp, ika, a['pool'], a['n']),
              {k: (v['p25'], v['p50']) for k, v in a.items() if isinstance(v, dict)})

json.dump({'aggregaatti': alue_agg, '_huom': 'raakarivit: taitokisa_alue_*.csv'},
          open(f'{OUT}/taitokisa_alue_2023_2025.json', 'w'), ensure_ascii=False, indent=1)

# --- tk_lajiviitteet.js: KAKSI RINNAKKAISTA LÄHDETTÄ (PR G, 4.10.2026) ---
# Ennen: yksi TK_LAJIVIITTEET jossa ikäluokittain SEKALÄHDE (valtak. P9/P10/P12/T9–T12, muut alueellinen) →
# lapsen välitavoite laskettiin osin loppukilpailun finalistien tasosta. Nyt molemmat tasot rinnakkain:
#   TK_LAJIVIITTEET_ALUE   — alueelliset 2023–25 top-20 (KAIKKI P8–13 + T8–13) → lapsen/huoltajan tavoite + oletus
#   TK_LAJIVIITTEET_VALTAK — valtakunnalliset loppukilpailut 2023–25 (vain ikäluokat joilla finaalidataa) → vain henkilökunta
#   TK_LAJIVIITTEET        — alias = ALUE (taaksepäin yhteensopiva; tkLajiViite(laji, ika, sp[, lahde]) oletus 'alueellinen')
# Sama generoitu lohko kirjoitetaan merkkien väliin docs/testit_indeksit.js:ään ja TalentMaster_VP_v25.html:ään
# (yksi lähde → kolme identtistä kopiota; tests/tk_protokolla_viitelahde.test.js vartioi pariteetin).
nat = json.load(open(f'{OUT}/taitokisa_2023_2025.json'))['aggregaatti']
LAJIT = [('syotto', 'syotto'), ('pujottelu', 'pujottelu'), ('ponnauttelu', 'ponnauttelu'),
         ('kl_tulos', 'kuljetus_laukaus')]

def blokki(a, ika, lahde, kommentti):
    out = ['    %d: { // %s' % (ika, kommentti)]
    for key, nimi in LAJIT:
        if key in a:
            out.append('      %s: { erinomainen: %.1f, hyva: %.1f },' % (nimi, a[key]['p25'], a[key]['p50']))
    if 'pp_bonus' in a and ika >= 12:
        out.append('      pituuspotku_bonus: { erinomainen: %.1f, hyva: %.1f },' % (a['pp_bonus']['p75'], a['pp_bonus']['p50']))
    out.append("      _n: %d, _lahde: '%s'," % (a['n'], lahde))
    out.append('    },')
    return out

GEN_ALKU = '// <<< TK_VIITTEET_GEN — generoitu: docs/data/parse_taitokisa_csv.py. ÄLÄ MUOKKAA KÄSIN (aja generaattori).'
GEN_LOPPU = '// >>> TK_VIITTEET_GEN'
L = [GEN_ALKU]
L.append('// TK-lajiviitteet KAHDELLA rinnakkaisella lähteellä (per laji: erinomainen = kohortin P25 · hyva = P50 · kehitettävä > hyva;')
L.append('// pituuspotku_bonus SUUREMPI=parempi → P75/P50). EI MITALI — mitali vain kokonaisajasta (§31). kuljetus_laukaus = NETTO.')
L.append('// EI interpolointia puuttuville ikäluokille — radat ovat ikäluokkakohtaisia. EI fallbackia lähteestä toiseen.')
L.append("//   TK_LAJIVIITTEET_ALUE   _lahde 'alueellinen'      = alueelliset kilpailut 2023–25 (Palloliiton tuloskooste, ~60 kilpailua /")
L.append('//                          4 aluetta), top-20 kokonaisajalla per ikä/sp, dedup per pelaaja. KATTAA P8–13 + T8–13.')
L.append('//                          → pelaajan + huoltajan välitavoite, merkit ja "kärkitaso" AINA tästä (oletuslähde).')
L.append("//   TK_LAJIVIITTEET_VALTAK _lahde 'valtakunnallinen' = valtakunnalliset loppukilpailut 2023–25 (PDF, summavalidointi).")
L.append('//                          Vain ikäluokat joilla finaalidataa (n voi olla pieni → UI näyttää n:n). VAIN henkilökunnalle')
L.append('//                          merkinnällä "Loppukilpailutaso" — EI koskaan lapsen tavoitteeksi.')
L.append('//   TK_LAJIVIITTEET        = TK_LAJIVIITTEET_ALUE (taaksepäin yhteensopiva alias).')
L.append('// Vuosipäivitys: lisää uusi vuosi-CSV (alue) / aja parse_taitokisa.py (valtak.) → aja parse_taitokisa_csv.py.')
L.append('const TK_LAJIVIITTEET_ALUE = {')
for sp in ('P', 'T'):
    L.append('  %s: {' % sp)
    for ika in range(8, 14):
        if ika in alue_agg.get(sp, {}):
            a = alue_agg[sp][ika]
            L += blokki(a, ika, 'alueellinen', 'n=%d (pool %d), alueelliset 2023–25, top-20' % (a['n'], a['pool']))
    L.append('  },')
L.append('};')
L.append('const TK_LAJIVIITTEET_VALTAK = {')
for sp in ('P', 'T'):
    L.append('  %s: {' % sp)
    for ika in range(8, 14):
        if str(ika) in nat.get(sp, {}):
            a = nat[sp][str(ika)]
            L += blokki(a, ika, 'valtakunnallinen', 'n=%d, loppukilpailut %s' % (a['n'], a.get('vuodet', '2023–25')))
    L.append('  },')
L.append('};')
L.append('const TK_LAJIVIITTEET = TK_LAJIVIITTEET_ALUE;   // alias: oletuslähde alueellinen')
L.append('')
L.append('// TK_LAJITASOT — populaatiotasot 1–5 KOKO alueellisesta kilpailupoolista (ei top-20; yksi lähde, ei sekalähdettä).')
L.append('// Rajat = kohortin P20/P40/P60/P80. taso 5 = paras 20 % · taso 3 = kohortin keskitaso · taso 1 = hitain 20 %.')
L.append('// Logiikka STRICT <: taso=5 jos arvo<r[0], 4 jos <r[1], 3 jos <r[2], 2 jos <r[3], muuten 1')
L.append('// (tasan rajalla alempi taso — sama konventio kuin tkLaskeMerkki; maksimiajat 40/60 s → taso 1).')
L.append('// Otos = kilpailuihin osallistuneet (kilpailukohortti, EI väestönormi) — dokumentoi UI:ssa.')
L.append('// Käyttö: valmentaja/VP + D2/OVR-input. Pelaajalle EI tasolukua (§7.22).')
L.append('// H-H pujottelu/syöttö arvioidaan FINAL2024-normilla, TK-tulos näillä — ei ristiin (§30).')
L.append('const TK_LAJITASOT = {')
for sp in ('P', 'T'):
    L.append('  %s: {' % sp)
    for ika in range(8, 14):
        rs = [r for r in rows_d if r['sp'] == sp and r['ika'] == ika]
        if len(rs) < 80:
            continue
        L.append('    %d: { // pooli n=%d' % (ika, len(rs)))
        for key, nimi in LAJIT:
            vals = [r[key] for r in rs if r.get(key) is not None]
            rajat = [pct(vals, q) for q in (.2, .4, .6, .8)]
            L.append('      %s: [%s],' % (nimi, ', '.join('%.1f' % v for v in rajat)))
        L.append("      _n: %d," % len(rs))
        L.append('    },')
    L.append('  },')
L.append('};')
L.append(GEN_LOPPU)
LOHKO = '\n'.join(L)

# 1) SSOT-tiedosto
with open(os.path.join(OUT, '..', 'tk_lajiviitteet.js'), 'w', encoding='utf-8') as f:
    f.write(LOHKO + '\n'
            + "if (typeof module !== 'undefined') module.exports = { TK_LAJIVIITTEET, TK_LAJIVIITTEET_ALUE, TK_LAJIVIITTEET_VALTAK, TK_LAJITASOT };\n")
print('\nKirjoitettu docs/tk_lajiviitteet.js')

# 2) Kopiot merkkien väliin (lue muuttujaan ENNEN kirjoitusta — ei in-place-truncaatiota).
JUURI = os.path.abspath(os.path.join(OUT, '..', '..'))
for rel in ('docs/testit_indeksit.js', 'TalentMaster_VP_v25.html'):
    polku = os.path.join(JUURI, rel)
    with open(polku, encoding='utf-8') as f:
        sisalto = f.read()
    a = sisalto.find(GEN_ALKU)
    b = sisalto.find(GEN_LOPPU)
    if a < 0 or b < 0 or b < a:
        raise SystemExit('Merkit puuttuvat: ' + rel)
    uusi = sisalto[:a] + LOHKO + sisalto[b + len(GEN_LOPPU):]
    if uusi != sisalto:
        with open(polku, 'w', encoding='utf-8') as f:
            f.write(uusi)
    print('Synkattu', rel, '(muuttui)' if uusi != sisalto else '(ennallaan)')
