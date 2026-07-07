#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse_oma_versio.py — I1: teknis-taktinen curriculum (OMA_VERSIO md) → lib/tm_teknistaktiset.js

Lukee kanoniset OMA_VERSIO-md:t (docs/data/OMA_VERSIO_*.md + cue-pankki) + valinnaisen
Excel-Harjoitepankin → generoi lib/tm_teknistaktiset.js (SSOT, DATAMALLI_TEKNISTAKTINEN.md §3).

Periaate (§15/§30): md = LÄHDE, lib = TOTUUS KOODISSA. Ei kovakoodattua curriculum-sisältöä —
kaikki rivi-/regexpohjaisesti md:stä. Idempotentti; aja uudelleen kun curriculum päivittyy.

Rakenne:  TM_TT_PELIPAIKAT · TM_TT_PELIMUODOT · TM_TT_ASTEIKKO (1–3, EI 1/3/5, §0a) ·
          TM_TT_YOUTH (14) · TM_TT_FUNDAMENTIT (7 pelipaikkaa) · TM_TT_JOUKKUE (16) ·
          TM_TT_HARJOITTEET · TM_TT_KYTKENTA · apurit tmTtItems/tmTtVaihe/tmTtKysymykset/
          tmTtHarjoitteet/tmTtNorm5.  Kieli suomi (§0c). Suomalaiskoodit T/LP/KK/KY/KH/LA/MV (§0).

Ajo:  python3 docs/data/parse_oma_versio.py
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = HERE
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "lib", "tm_teknistaktiset.js")

WARN = []


def warn(msg):
    WARN.append(msg)
    sys.stderr.write("  ⚠ " + msg + "\n")


def read(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return f.read()


# ── Pelipaikkametadata (§0 suomalaiskoodit + numeroaliakset). Kiinteä taksonomia, ei curriculum-sisältöä. ──
PELIPAIKAT = {
    "MV": {"nimi": "Maalivahti", "numerot": [1]},
    "LP": {"nimi": "Laitapuolustaja", "numerot": [2, 3]},
    "T":  {"nimi": "Toppari", "numerot": [4, 5]},
    "KK": {"nimi": "Keskikenttäpelaaja", "numerot": [6, 8]},
    "KY": {"nimi": "Kymppi", "numerot": [10]},
    "LA": {"nimi": "Laituri", "numerot": [7, 11]},
    "KH": {"nimi": "Keskushyökkääjä", "numerot": [9]},
}
PELIPAIKKAKOODIT = list(PELIPAIKAT.keys())

PELIMUODOT = ["3v3", "5v5", "8v8", "11v11"]

ASTEIKKO = {"max": 3, "tasot": {1: "Ei näy pelissä", 2: "Näkyy ohjatusti", 3: "Näkyy itsenäisesti"}}

# Joukkue-ryhmäotsikko → ryhmäkoodi
JOUKKUE_RYHMA = {
    "JOUKKUEEN HYÖKKÄÄMINEN": "hyokkays",
    "JOUKKUEEN PUOLUSTAMINEN": "puolustus",
    "TILANTEENVAIHDOT": "siirtyma",
    "ERIKOISTILANTEET": "erikoistilanne",
}


def avain(koodi):
    """Koodi → lib-avain (T-P1 → t_p1, Y-H0 → y_h0, J-H1 → j_h1)."""
    return koodi.lower().replace("-", "_")


def faasi_koodista(koodi):
    """Toinen kirjain P/H → puolustus/hyokkays (yksilö + pelipaikka)."""
    m = re.match(r"^[A-Z]{1,2}-([PH])", koodi)
    if not m:
        return None
    return "puolustus" if m.group(1) == "P" else "hyokkays"


def pelimuodot_rivista(teksti):
    """Poimi pelimuodot ('5v5 → 11v11' / '8v8') tekstirivistä → järjestetty lista TM_TT_PELIMUODOT:sta."""
    loydetyt = re.findall(r"\d+v\d+", teksti or "")
    # säilytä esiintymisjärjestys, uniikit, vain viralliset
    ulos = []
    for pm in loydetyt:
        if pm in PELIMUODOT and pm not in ulos:
            ulos.append(pm)
    return ulos


def koodit_rivista(teksti):
    """Poimi pelipaikka-/yksilökoodit (T-H1, LP-H2, Y-H0, MV-H1/H2, T-H1b) → normalisoitu lista.
    Purkaa 'MV-H1/H2' → ['MV-H1','MV-H2'] ja strippaa alakirjaimet (T-H1b → T-H1)."""
    ulos = []
    if not teksti:
        return ulos
    # perusmuoto PREFIX-XN, jonka perässä voi olla /N /Nx alakirjaimineen
    for m in re.finditer(r"\b([A-Z]{1,2})-([PHSE])(\d+)([a-z]?)((?:/[A-Z]?[PHSE]?\d+[a-z]?)*)", teksti):
        pfx, faas, num = m.group(1), m.group(2), m.group(3)
        base = pfx + "-" + faas + num
        if base not in ulos:
            ulos.append(base)
        # jatko-osat '/H2' tai '/2'
        for lisa in re.findall(r"/([A-Z]{1,2}-)?([PHSE])?(\d+)[a-z]?", m.group(5) or ""):
            lf = lisa[1] or faas
            koodi = pfx + "-" + lf + lisa[2]
            if koodi not in ulos:
                ulos.append(koodi)
    return ulos


def parse_kpi_taulukko(lines, i):
    """Lue KPI-taulukko rivistä i alkaen: '| a | teksti |'. Palauta (kpi-lista, seuraava_i)."""
    kpi = []
    n = len(lines)
    while i < n:
        line = lines[i].strip()
        if line.startswith("|"):
            m = re.match(r"^\|\s*([a-z])\s*\|\s*(.+?)\s*\|\s*$", line)
            if m:
                kpi.append({"koodi": m.group(1), "teksti": m.group(2).strip()})
                i += 1
                continue
            # header/separator (| KPI | / |---|) → ohita
            if re.match(r"^\|\s*(KPI|:?-+:?)\s*\|", line) or re.match(r"^\|[\s:-]+\|", line):
                i += 1
                continue
            # muu taulukkorivi (esim. MUUTOSLOKI) → taulukko loppui tämän teeman osalta
            break
        elif line == "":
            i += 1
            continue
        else:
            break
    return kpi, i


def parse_pelitilanne(line):
    m = re.match(r"^\*Pelitilanne:\s*(.+?)\*\s*$", line.strip())
    return m.group(1).strip() if m else None


# ─────────────────────────────────────────────────────────────────────────────
# YKSILÖVAIHE (youth) — 14 konseptia + painotus/pelimuoto/jatkuu + konseptipelit + silta
# ─────────────────────────────────────────────────────────────────────────────
def parse_youth(teksti):
    youth = []
    konseptipelit = {}
    lines = teksti.split("\n")
    i, n = 0, len(lines)
    cur_dim = None
    silta_alkoi = False
    while i < n:
        line = lines[i]
        s = line.strip()
        if s.startswith("## "):
            otsikko = s[3:].strip().upper()
            if otsikko.startswith("HYÖKKÄÄMINEN"):
                cur_dim = "hyokkays"
            elif otsikko.startswith("PUOLUSTAMINEN"):
                cur_dim = "puolustus"
            elif otsikko.startswith("SILTA") or otsikko.startswith("KONSEPTIPELIT") or otsikko.startswith("MUUTOSLOKI"):
                silta_alkoi = True
                cur_dim = None
            i += 1
            continue
        m = re.match(r"^### (Y-[HP]\d+):\s*(.+?)\s*$", s)
        if m and not silta_alkoi:
            koodi, nimi = m.group(1), m.group(2).strip()
            # etsi pelitilanne, kpi, painotusrivi tähän teemablokkiin
            j = i + 1
            pelitilanne, painotus, pelimuoto, jatkuu, ika = None, None, [], [], None
            kpi = []
            while j < n:
                sj = lines[j].strip()
                if sj.startswith("### ") or sj.startswith("## "):
                    break
                pt = parse_pelitilanne(sj)
                if pt:
                    pelitilanne = pt
                    j += 1
                    continue
                if sj.startswith("| "):
                    kpi, j = parse_kpi_taulukko(lines, j)
                    continue
                pm = re.match(r"^\*Painotus:\s*(.+?)\*\s*$", sj)
                if pm:
                    blob = pm.group(1)
                    painotus = blob.split("Pelimuoto")[0].strip().rstrip(".").strip()
                    pelimuoto = pelimuodot_rivista(blob)
                    jm = re.search(r"Jatkuu:\s*(.+)$", blob)
                    if jm:
                        jatkuu = koodit_rivista(jm.group(1))
                    ika = ika_painotuksesta(blob)
                    j += 1
                    continue
                j += 1
            youth.append({
                "avain": avain(koodi), "koodi": koodi, "nimi": nimi, "dim": cur_dim,
                "faasi": faasi_koodista(koodi), "pelitilanne": pelitilanne or "",
                "pelimuoto": pelimuoto, "ika": ika, "kpi": kpi, "kysymykset": [],
                "painotus": painotus or "", "jatkuu": jatkuu,
            })
            i = j
            continue
        i += 1

    # KONSEPTIPELIT-taulukko (youth harjoitepankki): | Y-H0 | peli | pelimuoto |
    for m in re.finditer(r"^\|\s*(Y-[HP]\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$", teksti, re.M):
        koodi, peli, pm = m.group(1), m.group(2).strip(), m.group(3).strip()
        konseptipelit[koodi] = {"konseptipeli": peli, "pelimuoto": pm}
    return youth, konseptipelit


def ika_painotuksesta(blob):
    """Johda ikähaarukka painotustekstistä (perusvaihe 6–9 / yhteispelivaihe 10–14 / pelipaikkavaihe U15→)."""
    b = blob.lower()
    # eksplisiittiset ikäluvut painotuksessa (esim. '10–13', '12–14')
    m = re.search(r"(\d{1,2})\s*[–-]\s*(\d{1,2})", b)
    if m:
        return [int(m.group(1)), int(m.group(2))]
    if "perusvaihe" in b and "yhteispeli" in b:
        return [6, 14]
    if "perusvaihe" in b:
        return [6, 9]
    if "yhteispeli" in b:
        return [10, 14]
    if "pelipaikkavaihe" in b or "u15" in b:
        return [15, 19]
    return None


# ─────────────────────────────────────────────────────────────────────────────
# PELIPAIKKAFUNDAMENTIT — 7 tiedostoa, teemat X-P#/X-H# + KPI
# ─────────────────────────────────────────────────────────────────────────────
def parse_pelipaikka(teksti):
    """Palauta {pelipaikkakoodi: [teema, …]} yhdestä pelipaikkatiedostosta."""
    ulos = {}
    lines = teksti.split("\n")
    i, n = 0, len(lines)
    while i < n:
        s = lines[i].strip()
        m = re.match(r"^### ([A-Z]{1,2}-[PH]\d+):\s*(.+?)\s*$", s)
        if m:
            koodi, nimi = m.group(1), m.group(2).strip()
            pfx = koodi.split("-")[0]
            if pfx not in PELIPAIKKAKOODIT:
                i += 1
                continue
            j = i + 1
            pelitilanne, kpi = None, []
            while j < n:
                sj = lines[j].strip()
                if sj.startswith("### ") or sj.startswith("## "):
                    break
                pt = parse_pelitilanne(sj)
                if pt:
                    pelitilanne = pt
                    j += 1
                    continue
                if sj.startswith("| "):
                    kpi, j = parse_kpi_taulukko(lines, j)
                    continue
                j += 1
            ulos.setdefault(pfx, []).append({
                "avain": avain(koodi), "koodi": koodi, "nimi": nimi,
                "faasi": faasi_koodista(koodi), "pelitilanne": pelitilanne or "",
                "kpi": kpi, "kysymykset": [], "harjoitteet": [],
            })
            i = j
            continue
        i += 1
    return ulos


# ─────────────────────────────────────────────────────────────────────────────
# JOUKKUETAKTISET — 16 teemaa + cue + konseptipeli + kytkentä (yksilö + pelipaikat)
# ─────────────────────────────────────────────────────────────────────────────
def parse_joukkue(teksti):
    joukkue = []
    lines = teksti.split("\n")
    i, n = 0, len(lines)
    cur_ryhma = None
    kytkenta_alkoi = False
    while i < n:
        s = lines[i].strip()
        if s.startswith("## "):
            otsikko = s[3:].strip().upper()
            if otsikko.startswith("KYTKENTÄMATRIISI"):
                kytkenta_alkoi = True
            cur_ryhma = JOUKKUE_RYHMA.get(otsikko, cur_ryhma if not kytkenta_alkoi else None)
            i += 1
            continue
        m = re.match(r"^### (J-[HPSE]\d+):\s*(.+?)\s*$", s)
        if m and not kytkenta_alkoi:
            koodi, nimi = m.group(1), m.group(2).strip()
            j = i + 1
            pelitilanne, kpi = None, []
            kysymykset, konseptipeli, yksilo, pelipaikat, pelimuoto = [], "", [], [], []
            while j < n:
                sj = lines[j].strip()
                if sj.startswith("### ") or sj.startswith("## "):
                    break
                pt = parse_pelitilanne(sj)
                if pt:
                    pelitilanne = pt
                    j += 1
                    continue
                if re.match(r"^\|\s*[a-z]\s*\|", sj) or re.match(r"^\|\s*KPI\s*\|", sj) or re.match(r"^\|[\s:-]+\|", sj):
                    if not kpi:
                        kpi, j = parse_kpi_taulukko(lines, j)
                        continue
                pm = re.match(r"^\*Painotus:\s*(.+?)\*\s*$", sj)
                if pm:
                    pelimuoto = pelimuodot_rivista(pm.group(1))
                    j += 1
                    continue
                ym = re.match(r"^\*Yksilökonseptit:\s*(.+?)\*\s*$", sj)
                if ym:
                    blob = ym.group(1)
                    yksilo = [c for c in koodit_rivista(blob) if c.startswith("Y-")]
                    pm2 = re.search(r"Pelipaikkavaihe:\s*(.+)$", blob)
                    if pm2:
                        pelipaikat = [c for c in koodit_rivista(pm2.group(1)) if not c.startswith("Y-")]
                    j += 1
                    continue
                cm = re.match(r"^\*\*Cue:\*\*\s*(.+?)\s*$", sj)
                if cm:
                    kysymykset = jaa_kysymykset(cm.group(1))
                    j += 1
                    continue
                km = re.match(r"^\*\*Konseptipeli:\*\*\s*(.+?)\s*$", sj)
                if km:
                    konseptipeli = re.sub(r"\s+", " ", km.group(1).replace("*", "").strip())
                    j += 1
                    continue
                j += 1
            joukkue.append({
                "avain": avain(koodi), "koodi": koodi, "nimi": nimi, "ryhma": cur_ryhma,
                "pelitilanne": pelitilanne or "", "pelimuoto": pelimuoto, "kpi": kpi,
                "kysymykset": kysymykset, "konseptipeli": konseptipeli,
                "yksilo": yksilo, "pelipaikat": pelipaikat,
            })
            i = j
            continue
        i += 1
    return joukkue


def jaa_kysymykset(teksti):
    """'1. kysymys? 2. toinen? 3. kolmas?' → ['kysymys?', 'toinen?', 'kolmas?']."""
    osat = re.split(r"\s*\d+\.\s+", teksti)
    return [re.sub(r"\s+", " ", o).strip() for o in osat if o.strip()]


# ─────────────────────────────────────────────────────────────────────────────
# CUE-PANKKI (pelipaikat) — '**T-P1 Nimi**' + numeroidut kysymykset seuraavalla rivillä
# ─────────────────────────────────────────────────────────────────────────────
def parse_cue_pankki(teksti):
    cues = {}
    lines = teksti.split("\n")
    i, n = 0, len(lines)
    while i < n:
        s = lines[i].strip()
        m = re.match(r"^\*\*([A-Z]{1,2}-[PH]\d+)\b.*\*\*\s*$", s)
        if m:
            koodi = m.group(1)
            # kysymykset voivat olla tällä rivillä (harvoin) tai seuraavilla numeroituina/rivi
            blob = ""
            j = i + 1
            while j < n:
                sj = lines[j].strip()
                if sj.startswith("**") or sj.startswith("## ") or sj.startswith("### "):
                    break
                if sj:
                    blob += " " + sj
                j += 1
            cues[koodi] = jaa_kysymykset(blob)
            i = j
            continue
        # vaihtoehtoinen muoto: '- **T-P1 Nimi:** 1) k? 2) k?'
        m2 = re.match(r"^-\s*\*\*([A-Z]{1,2}-[PH]\d+)\b[^:]*:\*\*\s*(.+?)\s*$", s)
        if m2:
            cues[m2.group(1)] = jaa_kysymykset_sulkumuoto(m2.group(2))
            i += 1
            continue
        i += 1
    return cues


def jaa_kysymykset_sulkumuoto(teksti):
    """'1) k? 2) k? 3) k?' → lista."""
    osat = re.split(r"\s*\d+\)\s+", teksti)
    return [re.sub(r"\s+", " ", o).strip() for o in osat if o.strip()]


# ─────────────────────────────────────────────────────────────────────────────
# JS-serialisointi
# ─────────────────────────────────────────────────────────────────────────────
def js(obj, indent=0):
    """Deterministinen JSON→JS (suomi utf-8 säilyy; avaimet lainausmerkeissä)."""
    return json.dumps(obj, ensure_ascii=False, indent=2)


def build_js(youth, fundamentit, joukkue, harjoitteet, kytkenta):
    L = []
    L.append("// tm_teknistaktiset.js — GENEROITU (docs/data/parse_oma_versio.py). ÄLÄ MUOKKAA KÄSIN.")
    L.append("// Lähde: OMA_VERSIO-curriculum (docs/data/OMA_VERSIO_*.md). Aja parseri uudelleen kun curriculum päivittyy.")
    L.append("// §0a kanoninen · §0c suomi · suomalaiskoodit (T/LP/KK/KY/KH/LA/MV) · KPI-arviointi 1–3 (EI 1/3/5).")
    L.append("")
    L.append("var TM_TT_PELIPAIKAT = " + js(PELIPAIKAT) + ";")
    L.append("var TM_TT_PELIMUODOT = " + js(PELIMUODOT) + ";")
    L.append("var TM_TT_ASTEIKKO = " + js(ASTEIKKO) + ";")
    L.append("")
    L.append("var TM_TT_YOUTH = " + js(youth) + ";")
    L.append("")
    L.append("var TM_TT_FUNDAMENTIT = " + js(fundamentit) + ";")
    L.append("")
    L.append("var TM_TT_JOUKKUE = " + js(joukkue) + ";")
    L.append("")
    L.append("var TM_TT_HARJOITTEET = " + js(harjoitteet) + ";")
    L.append("")
    L.append("var TM_TT_KYTKENTA = " + js(kytkenta) + ";")
    L.append("")
    # ── Apurit ──
    L.append(r"""
// ── Apurit (§26/§30) ──
// tmTtNorm5: KPI-taso 1–3 → 5D/IDP-skaala 1–5 (1→1, 2→3, 3→5). EI muuta arviointiasteikkoa (§0a).
function tmTtNorm5(taso) {
  if (taso == null || isNaN(taso)) return null;
  var t = Math.max(1, Math.min(3, Number(taso)));
  return (t - 1) * 2 + 1;
}

// tmTtVaihe: pelaajan teknis-taktinen vaihe iästä/pelipaikasta. 'perus'|'yhteispeli'|'silta'|'pelipaikka'.
function tmTtVaihe(p) {
  p = p || {};
  if (p.tt_vaihe) return p.tt_vaihe;
  var ika = p.ika;
  if (ika == null && p.syntymaVuosi) {
    var v = (p.nyt_vuosi || new Date().getFullYear());
    ika = v - p.syntymaVuosi;
  }
  if (ika == null) return 'yhteispeli';
  if (ika <= 9) return 'perus';
  if (ika <= 13) return 'yhteispeli';
  if (ika <= 14) return 'silta';
  return 'pelipaikka';
}

// tmTtItems: vaihe-gating → arvioitavat teemat. Perus/yhteispeli/silta = 14 youth; pelipaikka = youth + aktiivisen pelipaikan fundamentit.
function tmTtItems(pelaaja) {
  var vaihe = tmTtVaihe(pelaaja || {});
  if (vaihe !== 'pelipaikka') return TM_TT_YOUTH.slice();
  var pos = (pelaaja && (pelaaja.tt_positio_aktiivinen || pelaaja.positio)) || null;
  var fund = (pos && TM_TT_FUNDAMENTIT[pos]) ? TM_TT_FUNDAMENTIT[pos] : [];
  return TM_TT_YOUTH.slice().concat(fund);
}

// tmTtKysymykset: teeman avaimen (t_p1 / y_h0 / j_h1) kysymykset (cue). [] jos ei lähdettä.
function tmTtKysymykset(avainTaiKoodi) {
  var a = String(avainTaiKoodi || '').toLowerCase().replace(/-/g, '_');
  var kaikki = TM_TT_YOUTH.concat(TM_TT_JOUKKUE);
  for (var i = 0; i < kaikki.length; i++) if (kaikki[i].avain === a) return kaikki[i].kysymykset || [];
  for (var pos in TM_TT_FUNDAMENTIT) {
    var arr = TM_TT_FUNDAMENTIT[pos];
    for (var j = 0; j < arr.length; j++) if (arr[j].avain === a) return arr[j].kysymykset || [];
  }
  return [];
}

// tmTtHarjoitteet: teeman harjoitteet (youth konseptipeli tai pelipaikka Excel-harjoite). [] jos ei.
function tmTtHarjoitteet(avainTaiKoodi) {
  var koodi = String(avainTaiKoodi || '').toUpperCase().replace(/_/g, '-');
  var h = TM_TT_HARJOITTEET[koodi];
  if (!h) return [];
  return Array.isArray(h) ? h : [h];
}
""")
    L.append("")
    L.append("// ── Vienti: selain-globaalit + module.exports (Vitest) ──")
    L.append("var TM_TT_API = {")
    L.append("  TM_TT_PELIPAIKAT: TM_TT_PELIPAIKAT, TM_TT_PELIMUODOT: TM_TT_PELIMUODOT, TM_TT_ASTEIKKO: TM_TT_ASTEIKKO,")
    L.append("  TM_TT_YOUTH: TM_TT_YOUTH, TM_TT_FUNDAMENTIT: TM_TT_FUNDAMENTIT, TM_TT_JOUKKUE: TM_TT_JOUKKUE,")
    L.append("  TM_TT_HARJOITTEET: TM_TT_HARJOITTEET, TM_TT_KYTKENTA: TM_TT_KYTKENTA,")
    L.append("  tmTtNorm5: tmTtNorm5, tmTtVaihe: tmTtVaihe, tmTtItems: tmTtItems,")
    L.append("  tmTtKysymykset: tmTtKysymykset, tmTtHarjoitteet: tmTtHarjoitteet")
    L.append("};")
    L.append("if (typeof module !== 'undefined' && module.exports) module.exports = TM_TT_API;")
    L.append("if (typeof window !== 'undefined') { for (var _k in TM_TT_API) { try { window[_k] = TM_TT_API[_k]; } catch (e) {} } }")
    L.append("")
    return "\n".join(L)


# ─────────────────────────────────────────────────────────────────────────────
def main():
    sys.stderr.write("parse_oma_versio.py — teknis-taktinen curriculum → lib/tm_teknistaktiset.js\n")

    # 1) Youth + konseptipelit
    yt = read(os.path.join(DATA, "OMA_VERSIO_Yksilovaihe_ja_silta.md"))
    if not yt:
        sys.exit("KRIITTINEN: OMA_VERSIO_Yksilovaihe_ja_silta.md puuttuu")
    youth, konseptipelit = parse_youth(yt)
    if len(youth) != 14:
        warn("Youth-konsepteja %d (odotus 14)" % len(youth))

    # 2) Pelipaikkafundamentit (7 tiedostoa)
    tiedostot = [f for f in os.listdir(DATA) if re.match(r"^OMA_VERSIO_.*\.md$", f)]
    fundamentit = {k: [] for k in PELIPAIKKAKOODIT}
    for f in tiedostot:
        low = f.lower()
        if "joukkuetaktiset" in low or "kysymyspankki" in low or "yksilovaihe" in low:
            continue
        t = read(os.path.join(DATA, f))
        osat = parse_pelipaikka(t)
        for pos, teemat in osat.items():
            fundamentit[pos].extend(teemat)
    for pos in PELIPAIKKAKOODIT:
        if not fundamentit[pos]:
            warn("Pelipaikalla %s ei teemoja (tiedosto puuttuu?)" % pos)

    # 3) Cue-pankki → liitä pelipaikkafundamentteihin (1:1)
    cue = read(os.path.join(DATA, "OMA_VERSIO_Kysymyspankki_pelipaikat.md")) or read(os.path.join(DATA, "kysymyspankki_pelipaikat.md"))
    cues = parse_cue_pankki(cue) if cue else {}
    fund_koodit = set()
    for pos in PELIPAIKKAKOODIT:
        for teema in fundamentit[pos]:
            fund_koodit.add(teema["koodi"])
            teema["kysymykset"] = cues.get(teema["koodi"], [])
            if not teema["kysymykset"]:
                warn("Fundamentti %s ilman cue-kysymyksiä (§0b)" % teema["koodi"])
    # orpo-cuet (cue ilman fundamenttia)
    for c in cues:
        if c not in fund_koodit:
            warn("Orpo cue-koodi %s (ei fundamenttiteemaa)" % c)

    # 4) Joukkue + kytkentä
    jt = read(os.path.join(DATA, "OMA_VERSIO_Joukkuetaktiset.md"))
    if not jt:
        sys.exit("KRIITTINEN: OMA_VERSIO_Joukkuetaktiset.md puuttuu")
    joukkue = parse_joukkue(jt)
    if len(joukkue) != 16:
        warn("Joukkueteemoja %d (odotus 16)" % len(joukkue))

    # 5) Kytkentä molempiin suuntiin (joukkue→yksilö/pelipaikka + käänteinen)
    kytkenta = {}
    for j in joukkue:
        kytkenta[j["koodi"]] = {"yksilo": j["yksilo"], "pelipaikat": j["pelipaikat"]}
    # käänteinen: yksilö-/pelipaikkakoodi → joukkueteemat
    kaanteinen = {}
    for j in joukkue:
        for y in j["yksilo"]:
            kaanteinen.setdefault(y, []).append(j["koodi"])
        for pp in j["pelipaikat"]:
            kaanteinen.setdefault(pp, []).append(j["koodi"])
    kytkenta["_kaanteinen"] = kaanteinen

    # 6) Harjoitteet: youth konseptipelit (Y-koodit) + pelipaikka Excel-harjoitteet (jos Excel löytyy)
    harjoitteet = {}
    for koodi, hp in konseptipelit.items():
        harjoitteet[koodi] = hp
    xlsx = [f for f in os.listdir(DATA) if f.lower().endswith(".xlsx")]
    if not xlsx:
        warn("Master_kokonaisuus.xlsx puuttuu → pelipaikkaharjoitteet tyhjät (youth-konseptipelit mukana). Aja uudelleen Excelin kanssa.")
    else:
        _liita_excel_harjoitteet(os.path.join(DATA, xlsx[0]), harjoitteet)

    out = build_js(youth, fundamentit, joukkue, harjoitteet, kytkenta)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(out)

    sys.stderr.write("✔ Kirjoitettu %s\n" % os.path.relpath(OUT, ROOT))
    sys.stderr.write("  youth=%d · pelipaikat=%d · joukkue=%d · harjoitteet=%d · varoituksia=%d\n" % (
        len(youth), sum(1 for k in fundamentit if fundamentit[k]), len(joukkue), len(harjoitteet), len(WARN)))


# ── Excel-alias-silta (CB→T, FB→LP, MID→KK, AMID→KY, ST→KH, WI→LA, GK→MV). Vain jos openpyxl + tiedosto. ──
EXCEL_ALIAS = {"CB": "T", "FB": "LP", "MID": "KK", "AMID": "KY", "ST": "KH", "WI": "LA", "GK": "MV"}


def _liita_excel_harjoitteet(path, harjoitteet):
    try:
        import openpyxl  # type: ignore
    except ImportError:
        warn("openpyxl puuttuu → Excel-harjoitteita ei luettu (pip install openpyxl)")
        return
    try:
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    except Exception as e:  # noqa
        warn("Excelin luku epäonnistui: %s" % e)
        return
    # Harjoitepankki-välilehti; rivit joilla teemakoodi (englanti-alias) → suomalaiskoodi
    for ws in wb.worksheets:
        if "harjoite" not in ws.title.lower() and "pankki" not in ws.title.lower():
            continue
        for row in ws.iter_rows(values_only=True):
            solut = [str(c).strip() for c in row if c not in (None, "")]
            if not solut:
                continue
            koodi = None
            for s in solut:
                m = re.match(r"^([A-Z]{2,4})-([PH]\d+)", s)
                if m and m.group(1) in EXCEL_ALIAS:
                    koodi = EXCEL_ALIAS[m.group(1)] + "-" + m.group(2)
                    break
            if koodi:
                harjoitteet.setdefault(koodi, [])
                if isinstance(harjoitteet[koodi], list):
                    harjoitteet[koodi].append({"teema": koodi, "kuvaus": " · ".join(solut)})
    wb.close()


if __name__ == "__main__":
    main()
