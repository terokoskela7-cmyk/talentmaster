# R2-viimeistely — Kehon valmius -sijoitus + tekniikkabadge-selkeys · Code-brief

> **Miksi:** Tero katsoi live-korttia (Topias, Tekninen · Syväanalyysi) ja nosti kaksi aitoa selkeysongelmaa.
> Molemmat ovat **pre-existing** (R2-reflow peri ne, ei luonut — pala 4 jätti revealin sisällön tietoisesti ennalleen),
> mutta uusi rauhallinen hero/trow-ilme nostaa ne kontrastina esiin. Nämä ovat R2:n viimeistely ennen R3:a.
> **Luonne:** pieni, eristetty esitys-siivous — EI uutta dataa, EI uutta logiikkaa. Säilytä laskenta, muuta sijoitus + label.
> **Verifiointi: LIVE** (Topias + tyhjä tila, molemmat teemat). Arkkitehti (minä) verifioi livenä ennen valmista.

---

## Ongelma 1 — "Kehon valmius" (FLEI) väärässä paikassa

**Nyt:** `_tekSyva += renderFleiKortti(p);` (~rivi 10193) liittää **Kehon valmius -profiilin** (SBL/SFL/LL/DIAG/DFL,
62/100) **Tekninen-syväanalyysin loppuun**. FLEI ei ole tekninen mittari: §30 = **"FLEI = pohjavalmiusindeksi, EI dimensio"** —
liikevalmiuden ja loukkaantumisriskin mittari (§14: heikoin ketju ohjaa S-harjoitetta · **<40 → automaattinen klinikkalähetys**).
Sen hautaaminen Teknisen revealin pohjalle = kategoria­virhe + piilotettu tärkeä signaali (Teron sanoin "oikeasti tärkeä kun
niitä testejä tehdään").

**Korjaus — oma "Kehon valmius" -lohko:**
- **Irrota** `renderFleiKortti(p)` `_tekSyva`:sta (Tekninen reveal). Ei jää Tekniseen.
- **Sijoita** omaksi rauhalliseksi lohkoksi tab-1:n mitattujen dimensioiden joukkoon **Tekninen-lohkon jälkeen**
  (järjestys: tuoreus → §28-linssi → synth → Fyysinen (f1) → Tekninen (f2) → **Kehon valmius** → nextstep). Käytä olemassa
  olevaa `_mSub`-otsikkotyyliä (eyebrow "Kehon valmius"), EI dimensio-numerolla (§30 — ei "D-x", oma nimetty osio).
- **Nosta toimiva signaali näkyviin** (tämä on se "miksi tärkeä"): lohkon alkuun yksi tulkintarivi —
  **heikoin ketju** (min(sbl,sfl,ll,diag,dfl) → ketjun nimi) + **klinikkalippu** kun `flei_viimeisin < 40`
  (amber, "→ klinikkalähetys (§14)"). Topiaksella FLEI 62 · heikoin LL → ei klinikkaa, mutta heikoin-ketju-rivi näkyy.
- **Säilytä `renderFleiKortti`:n 3 tilaa** (A tyhjä / B osittain 1–4 ketjua / C täysi 5) — älä menetä tyhjä/osittais-käsittelyä.
  Minimimuutos: siirrä kutsu + kääri se `_mSub('Kehon valmius')`-lohkoon + lisää heikoin-ketju/klinikka-tulkintarivi.
  (`.flei-kortti`-tyylien kevyt brändipäivitys sallittu jos tarpeen, mutta ei pakollinen tässä.)

**Data-eheys (tämän palan vartija):** FLEI-profiili ei saa renderöityä kahdesti (poistettava Tekninestä kun lisätään omaksi
lohkoksi) eikä kadota tyhjällä/osittaisella datalla. Grep-varmista: `renderFleiKortti` esiintyy tasan **kerran** tab-1:ssä.

---

## Ongelma 2 — "A5" / "V3/3" tekniikkabadge on salakielinen

**Nyt:** `_jsvPerLajiHTML` (rivi 7582) "Tekniikka lajeittain" -taulussa jokaisen lajin perässä:
- `alueBadge` = `'A' + d.tkTaso` → **"A5"** (A = Alue-taso 1–5, `tkLajiTaso`, kilpailukohortti).
- `valtakBadge` = `'V' + vt + '/3'` → **"V3/3"** (V = Valtak = Eerikkilä 1–3, vain syöttö/pujottelu).
Yksikirjaiminen A→Alue / V→Valtak vaatii erillisen selitteen ylhäällä — juuri sitä salakielisyyttä jota KISS poistaa.

**Korjaus — kirjoita asteikot auki, älä yksikirjaimisiksi:**
- Vaihda näkyvä badge-teksti selkokielelle: "A5" → **"5/5 alue"** · "V3/3" → **"3/3 valtak."** (pieni mono-label sanana,
  ei irrallista A/V-kirjainta). Tavoite: rivi luettavissa ilman että pitää palata ylälaidan selitteeseen.
- Selite-rivin voi tämän jälkeen keventää (asteikot selviävät badgesta), mutta pidä lyhyt lähdemaininta
  ("alue = kilpailukohortti 1–5 · valtak. = Eerikkilä 1–3, syöttö/pujottelu").
- **`+`/★/🟡/🔴 sekuntibudjetti-rivi (matka alueen kärkeen) säilyy** — se on eri asia (gap), ei asteikko.

**EHDOTON invariantti (§34/§30 — ÄLÄ yhdistä):** Alue (TK-lajitaso 1–5, `tkLajiTaso`/`TK_LAJITASOT`) ja Valtak
(Eerikkilä 1–3, `eerikkilaTaso`, vain syöttö/pujottelu) ovat **kaksi eri asteikkoa, eri lähteestä** — molemmat säilyvät
erikseen, EI ristiin, EI yhdistetä yhdeksi luvuksi. Tämä korjaus muuttaa VAIN labelin luettavuutta, ei asteikkoja.

---

## Reunaehdot (molemmat palat)

§30 (FLEI = pohjavalmiusindeksi, ei dimensio) · §14 (heikoin ketju → S-harjoite · <40 klinikka) · §37 (julkinen termi
"Kehon valmius", ei FLEI/Fascia-jargonia) · §34/§30 (Alue 1–5 ≠ Valtak 1–3, ei ristiin) · §26 (vain pikakentät:
`flei_viimeisin`/`sbl`/`sfl`/`ll`/`diag`/`dfl`/`flei_historia`/`flei_pvm` · `tk_lajit_viimeisin` · `hh_viimeisin`) ·
brändilukko §5 (Cormorant ei-bold · teal ainoa aksentti · amber vain varoitus (klinikka/heikko) · hiusviivat · `var(--border)`
ei `--border2`) · molemmat teemat. **Per-laji-taulu + sekuntibudjetti + kultaikkuna SÄILYVÄT Teknisen revealissa** — vain
FLEI muuttaa paikkaa ja vain badge-label muuttuu.

## Jako (suositus)

Kaksi pientä eristettyä palaa (voi yhdistää yhteen PR:ään jos haluat — molemmat matalariskisiä samassa tabissa):
- **pala 5a** — Kehon valmius omaksi lohkoksi (irrota Tekninestä + heikoin-ketju/klinikka-signaali).
- **pala 5b** — tekniikkabadge selkokielelle (A5→"5/5 alue" · V3/3→"3/3 valtak.").

## Definition of Done (per pala)

- Renderöityy molemmissa teemoissa · ei datahukkaa (FLEI 3 tilaa säilyvät · per-laji-taulu ennallaan · asteikot erillään) ·
  Vitest + eslint vihreä · pieni PR · pseudonymisoitu.
- **5a:** `renderFleiKortti` tasan kerran tab-1:ssä (ei Tekninessä) · heikoin-ketju-rivi + <40-klinikkalippu näkyy · tyhjä/osittais-tila OK.
- **5b:** badge lukee "5/5 alue" / "3/3 valtak." · Alue ja Valtak erillään (§34) · sekuntibudjetti-rivi säilyy.
- **Live ennen valmista.** Arkkitehti verifioi: Topias (FLEI 62, heikoin LL · per-laji-badget) + tyhjä tila.
```
