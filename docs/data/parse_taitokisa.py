#!/usr/bin/env python3
"""Taitokisa-loppukilpailu-PDF:ien parseri + TK_LAJIVIITTEET-aggregointi.
Loppuankkurointi kuten Excel_Tuonti-parserissa (CLAUDE.md §24).
Rivimuoto: sija nimi (id) seura piiri | KL: aika rang tulos | syöttö | pujottelu |
[O+V väh(neg)] | ponnauttelu | lopputulos | merkki
Pituuspotku vain ika>=12. ES = ei suoritusta -> None.
"""
import pdfplumber, re, json, statistics, sys

MEDALS = {'kulta', 'hopea', 'pronssi'}
IK_RE = re.compile(r'^([PT])(\d{1,2})$')
OV_RE = re.compile(r'^(\d+|ES)\+(\d+|ES)$')

def fnum(tok):
    if tok is None or tok.upper() == 'ES':
        return None
    try:
        return float(tok.replace(',', '.'))
    except ValueError:
        return None

def parse_pdf(path, vuosi):
    rows, rajat = [], {}
    cur = None  # (sp, ika)
    prev_line = ''
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for line in (page.extract_text() or '').split('\n'):
                line = line.strip()
                m = IK_RE.fullmatch(line)
                if m:
                    sp, ika = m.group(1), int(m.group(2))
                    cur = (sp, ika)
                    # merkkirajat edellisellä rivillä: "80 90 105"
                    rm = re.fullmatch(r'(\d+)\s+(\d+)\s+(\d+)', prev_line)
                    if rm and cur not in rajat:
                        rajat[cur] = {'kulta': int(rm.group(1)), 'hopea': int(rm.group(2)), 'pronssi': int(rm.group(3))}
                    prev_line = line
                    continue
                prev_line = line
                if cur is None:
                    continue
                toks = line.split()
                if len(toks) < 8 or not toks[0].isdigit():
                    continue
                sp, ika = cur
                has_pp = ika >= 12
                t = list(toks)
                merkki = None
                if t[-1].lower() in MEDALS:
                    merkki = t[-1].lower(); t = t[:-1]
                try:
                    lopputulos = fnum(t[-1]); ponnauttelu = fnum(t[-2]); i = -2
                    pp_vah = pp_ov = None
                    if has_pp:
                        pp_vah = fnum(t[-3])  # negatiivinen bonus, esim -13.6
                        pp_ov = t[-4] if OV_RE.fullmatch(t[-4]) else None
                        i = -4
                        if pp_ov is None and t[-4].upper() == 'ES':
                            pp_ov = None
                    pujottelu = fnum(t[i-1]); syotto = fnum(t[i-2])
                    kl_tulos = fnum(t[i-3]); kl_rang = fnum(t[i-4]); kl_aika = fnum(t[i-5])
                except (IndexError, ValueError):
                    continue
                # sanity: lopputulos olemassa ja järkevä
                if lopputulos is None or lopputulos < 20 or lopputulos > 250:
                    continue
                rows.append({
                    'vuosi': vuosi, 'sp': sp, 'ika': ika, 'sija': int(toks[0]),
                    'kl_aika': kl_aika, 'kl_vah': kl_rang, 'kl_tulos': kl_tulos,
                    'syotto': syotto, 'pujottelu': pujottelu,
                    'pp_ov': pp_ov, 'pp_bonus': (-pp_vah if pp_vah is not None else None),
                    'ponnauttelu': ponnauttelu, 'kokonaistulos': lopputulos, 'merkki': merkki,
                })
    return rows, rajat

def pct(vals, q):
    vals = sorted(v for v in vals if v is not None)
    if not vals:
        return None
    k = (len(vals) - 1) * q
    f, c = int(k), min(int(k) + 1, len(vals) - 1)
    return round(vals[f] + (vals[c] - vals[f]) * (k - f), 1)

def main():
    base = '/sessions/sharp-modest-gates/mnt/uploads'
    all_rows, all_rajat = [], {}
    for y in ('2023', '2024', '2025'):
        rows, rajat = parse_pdf(f'{base}/taitokisa {y}.pdf', int(y))
        all_rows += rows
        for k, v in rajat.items():
            all_rajat.setdefault(k, {})[y] = v
        print(f'{y}: {len(rows)} riviä, ikäluokat: {sorted(set((r["sp"], r["ika"]) for r in rows))}')

    # validointi: lopputulos = kl_tulos + syotto + pujottelu + ponnauttelu - pp_bonus
    bad = 0
    for r in all_rows:
        parts = [r['kl_tulos'], r['syotto'], r['pujottelu'], r['ponnauttelu']]
        if any(p is None for p in parts):
            continue
        calc = sum(parts) - (r['pp_bonus'] or 0)
        if abs(calc - r['kokonaistulos']) > 0.15:
            bad += 1
            if bad <= 5:
                print('  EPÄTÄSMÄYS:', r['vuosi'], r['sp'], r['ika'], 'sija', r['sija'],
                      'laskettu', round(calc, 1), 'vs', r['kokonaistulos'])
    print(f'Validointi: {bad}/{len(all_rows)} epätäsmäystä (toleranssi 0.15s)')

    # aggregointi per (sp, ika), poolattu 2023-25
    groups = {}
    for r in all_rows:
        groups.setdefault((r['sp'], r['ika']), []).append(r)
    agg = {}
    LAJIT = ['syotto', 'pujottelu', 'ponnauttelu', 'kl_tulos', 'pp_bonus', 'kokonaistulos']
    for (sp, ika), rs in sorted(groups.items()):
        a = {'n': len(rs), 'vuodet': sorted(set(r['vuosi'] for r in rs))}
        for laji in LAJIT:
            vals = [r[laji] for r in rs if r[laji] is not None]
            if not vals:
                continue
            a[laji] = {'n': len(vals), 'p25': pct(vals, .25), 'p50': pct(vals, .50),
                       'p75': pct(vals, .75), 'min': min(vals), 'max': max(vals)}
        agg.setdefault(sp, {})[ika] = a
    out = {'rivit': all_rows, 'aggregaatti': agg,
           'merkkirajat_pdf': {f'{k[0]}{k[1]}': v for k, v in sorted(all_rajat.items())}}
    with open('/sessions/sharp-modest-gates/mnt/outputs/taitokisa_data.json', 'w') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print('\n=== AGGREGAATTI ===')
    for sp in sorted(agg):
        for ika in sorted(agg[sp]):
            a = agg[sp][ika]
            print(f'{sp}{ika}: n={a["n"]} vuodet={a["vuodet"]}')
            for laji in LAJIT:
                if laji in a:
                    d = a[laji]
                    print(f'  {laji:13s} n={d["n"]:3d} P25={d["p25"]} P50={d["p50"]} P75={d["p75"]} min={d["min"]} max={d["max"]}')
    print('\n=== MERKKIRAJAT PDF:STÄ (validointi TK_KOKONAISRAJAT vasten) ===')
    for k, v in sorted(out['merkkirajat_pdf'].items()):
        print(k, v)

if __name__ == '__main__':
    main()
