# CODE_OHJE — Ketteryys / kasirata -korjaukset (VP_v25)

**Tyyppi:** bugikorjaus + puuttuvan määritelmän lisäys · **Kohde:** `TalentMaster_VP_v25.html` (yksi tiedosto, yksi PR) · base `main`.

## Miksi

Sibbo P2014 -historiatuonnin (30m + ketteryys) verifioinnissa löytyi neljä virhettä
siitä miten **ketteryys (kasirata)** näytetään valmentajalle VP:n pelaajakortissa
(Mittaus-välilehti → Fyysinen). Kaikki neljä ovat samassa tiedostossa ja liittyvät
samaan testiin, joten ne korjataan yhtenä PR:nä.

**Kanoninen määritelmä** (lähde: `TalentMaster_Testaus_v9.html`, `PROTOKOLLAT.hh_laaja`):

```js
{ id: 'kasirata', nimi: 'Ketteryys — kasirata', ketju: 'LL', yksikko: 's', yritykset: 3, pienempi_parempi: true }
```

Eli: **kasirata = ennalta suunniteltu 8-muotoinen suunnanmuutosrata (ketteryys), sekunteina,
pienempi = parempi, liikehallintaketju LL (lateraalinen), osa H-H laaja -patteristoa.**
Se EI ole reaktiivinen eikä "T-testi" (T-testi on täysin eri rata). Ketteryys (kasirata, LL)
on myös eri asia kuin suunnanmuutos (SM-juoksu / SM-pallo, DIAG).

## Työ — neljä korjausta, kaikki `TalentMaster_VP_v25.html`

### 1. Normivertailun suunta väärinpäin (BUGI) — rivi ~9166
`_fysNormit`-taulukossa Kasiradalle on `pien: false`, vaikka kasirata on aikatesti jossa
**pienempi = parempi** (vrt. 'Nopeus 30m' → `pien: true`). Siksi vertailulogiikka
(rivi ~9182 `edella = t.pien ? (arvo < normi) : (arvo > normi)`) menee väärinpäin:
7.34 s (hitaampi kuin normi 7.19 s) näytetään virheellisesti "olet edellä", vaikka pitäisi
olla "kehityskohde".

**Muutos:** vaihda Kasiradan `pien: false` → `pien: true`.

```js
// ENNEN
{ lbl: 'Kasirata', ek: 'kasirata', arvo: hv.kasirata, yks: 's', pien: false, gated: false }
// JÄLKEEN
{ lbl: 'Kasirata', ek: 'kasirata', arvo: hv.kasirata, yks: 's', pien: true, gated: false }
```

Logiikkaa rivillä ~9182 EI muuteta — se on jo oikein. Vain lippu on väärä.

### 2. Väärä kuvausteksti "reaktiivinen · T-testi" — rivi ~9143
Lisädiagnostiikka-kortti kovakoodaa kasiradalle seliteksi `'reaktiivinen · T-testi'`,
joka on kahdesti väärä (kasirata ei ole reaktiivinen eikä T-testi).

**Muutos:** korvaa selite kasiradan omaa määritelmää vastaavaksi:

```js
// ENNEN
if (hv.kasirata != null) _diagCards += _diagKortti('Ketteryys', hv.kasirata, 's', 'reaktiivinen · T-testi');
// JÄLKEEN
if (hv.kasirata != null) _diagCards += _diagKortti('Ketteryys', hv.kasirata, 's', 'kasirata (8-rata) · suunnanmuutos ilman palloa');
```

### 3. Harhaanjohtava osiotitle "ei H-H:ssa" — rivi ~9144
Otsikko `'Lisädiagnostiikka · ei H-H:ssa (ilman palloa)'` antaa väärän kuvan: kasirata
(ja 5m/10m-väliajat) OVAT H-H laaja -testejä — ne vain eivät ole mukana 1–5
**kokonaistasossa** (hh_taso = vain 30m·CMJ·MAS). Selvennä otsikko:

```js
// ENNEN
if (_diagCards) f1 += '<div class="diaglabel">Lisädiagnostiikka · ei H-H:ssa (ilman palloa)</div><div class="mrow">' + _diagCards + '</div>';
// JÄLKEEN
if (_diagCards) f1 += '<div class="diaglabel">Lisädiagnostiikka · ei mukana 1–5 kokonaistasossa (30m·CMJ·MAS)</div><div class="mrow">' + _diagCards + '</div>';
```

### 4. Puuttuva `TM_TESTI_OHJEET.kasirata` (juurisyy) — `window.TM_TESTI_OHJEET`-objekti (~rivi 8737+)
Jokaisella testillä (nopeus_5m/10m/30m, cmj, mas, hh_taso, sm_juoksu, sm_pallo, tsi…) on
ⓘ-määritelmä `TM_TESTI_OHJEET`-rekisterissä — **paitsi ketteryydellä/kasiradalla**. Koska
kanonista kuvausta ei ole, väärä merkkijono pääsi vuotamaan korttiin (kohta 2). Lisää
kasiradalle oma määritelmä olemassa olevaa kaavaa (otsikko/mita/tulkinta/vinkki) noudattaen:

```js
kasirata: {
  otsikko: 'Ketteryys · kasirata',
  mita: 'Kasirata (8-muotoinen suunnanmuutosrata) sekunteina — ennalta suunniteltu ketteryys: jarrutus, käännös ja uudelleenkiihdytys ilman palloa. Liikehallintaketju LL (lateraalinen). Osa H-H laaja -patteristoa.',
  tulkinta: 'Taso 1–5 Eerikkilä-normista, pienempi aika = parempi. Ei mukana 30m·CMJ·MAS-kokonaistasossa (hh_taso) vaan erillinen ketteryys-osaindeksi (§30). Eroaa suunnanmuutoksesta (SM-juoksu / SM-pallo): kasirata = suljettu ketteryysrata, SM = suunnanmuutos ilman / pallon kanssa.',
  vinkki: 'Kehittyy suunnanmuutostekniikalla (jarrutus, matala painopiste, ensimmäinen askel ulos käännöksestä) ja lyhyillä ketteryyssukkuloilla — ei pitkillä juoksuilla.'
},
```

Jos kohdan 2 selite halutaan myöhemmin lukea tästä rekisteristä (yksi lähde), se on eri
PR — tässä riittää että määritelmä on olemassa ja kortin selite on korjattu.

## Reunaehdot

- **Vain `TalentMaster_VP_v25.html`.** Ei muutoksia Testaus_v9:ään, lib:eihin eikä
  laskentaan — kasiradan `pienempi_parempi`, osaindeksit (`laskeD1Osaindeksit`: `ketteryys = kasirata`,
  `suunnanmuutos = sm_juoksu`) ja radar (`_mkFysAks`, taso jo `tasoEk`-laskettu) ovat jo oikein.
  Tämä on puhtaasti VP:n **näyttö**korjaus.
- **Ei skeemamuutosta, ei Rules-muutosta.** Ei kosketa pelaajadataan.
- **§7.22:** nämä ovat valmentajan (VP) näkymän tekstejä — pelaajalle ei näytetä tasolukuja.
  Ei muuteta pelaajan (Pelaaja_v7) näkymää.
- **Design-lukko:** käytä olemassa olevia luokkia (`diag`, `diaglabel`, `mrow`) sellaisenaan —
  ei uusia värejä/fontteja. Molemmat teemat (carbon/bone) renderöityvät ennallaan (vain tekstit muuttuvat).
- **Ei `?v=`-bumppia** — ei lib-muutosta.

## Definition of Done

- L1: git-diff näyttää **vain** nämä 4 muutosta yhdessä tiedostossa; ei muuta.
- L2: olemassa olevat testit vihreät (ei uutta laskentaa; lib-testeihin ei pitäisi tulla muutosta).
- L3 (elävä, VP → pelaaja jolla on kasirata, esim. Sibbo P12 **Aleksi Rajala**):
  - Fyysinen → Syväanalyysi → Normivertailu: **Kasirata 7.34 s vs normi 7.19 s → "kehityskohde"** (ei "olet edellä").
  - Lisädiagnostiikka-kortti "Ketteryys": selite lukee "kasirata (8-rata) · suunnanmuutos ilman palloa".
  - Osiotitle: "Lisädiagnostiikka · ei mukana 1–5 kokonaistasossa (30m·CMJ·MAS)".
  - ⓘ-info kasiradalle avautuu ja näyttää uuden määritelmän.
  - Screenshot molemmista teemoista.
- Pieni PR, verifioitu elävänä ennen mahdollista seuraavaa vaihetta.
