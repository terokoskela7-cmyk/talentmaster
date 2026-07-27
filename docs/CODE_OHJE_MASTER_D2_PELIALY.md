# CODE_OHJE — Master v16: D2-tile (1.7→per-laji) + PELIÄLY-skaala (/12→/3)

**Tyyppi:** bugikorjaus (2 kohtaa) · **Kohde:** `TalentMaster_Master_v16.html` · **Base:** `main`.
**Miksi tämä on erillinen PR:** PR #262 korjasi saman kahden bugin **VP:ssä ja Pelaaja_v7:ssä**, mutta
Topiaksen kortti jonka Tero raportoi on **Valmentaja (Master v16)** -pelaajakortti — se **jäi #262:n skoopista**.
Siksi Master-kortilla D2 näyttää yhä **1.7/5 (lähde: TKI)** ja PELIÄLY yhä **2.8/12**. Sama kaanon, eri appi.

## Ristiinauditointi (arkkitehti ajoi — vain Master on jäljellä)

Kaikki 6 appia skannattu (deployattu lähde): `yht/12`, adar `/12`, ja D2 `tki/20`:
- **Vanhempi_v2 · Seura · Testaus_v9 · Admin · Excel_Tuonti:** puhtaat (0 osumaa). Ei tehtävää.
- **Pelaaja_v7:** adar `/12` = 0 (✓ #262). Yksi `tki/20` on `_fcKorttiData`-**fallback** joka on jo `d2_taso`-ensin
  -vahdittu → **oikein**, ei koske.
- **Master_v16:** `d2_taso` saatavilla (11 viittausta), mutta D2-tile käyttää ainoaa `tki/20`-kohtaa (→1.7) ja
  PELIÄLY renderöi `yht/12` (2 adar-kohtaa). **← tämän PR:n kohde.**

## Bug A-M — D2-tile johdetaan TKI:stä (1.7), ei per-lajista (d2_taso=4)

Master-pelaajakortin **D2 Tekninen -tile** laskee arvon `tki/20`:sta (tiedoston ainoa `/20`-jako) → Topias
TKI 34 → **1.7**, "lähde: TKI". Samaan aikaan **TEKNIIKKA-erittely** näyttää per-laji 2/5/4/5 (d2_taso=4).
Ristiriita on identtinen VP-bugin A kanssa — Master vain ei käytä `laskeD2Taso`:a (ei ole olemassa Masterissa),
vaan laskee inline.

**Korjaus:** D2-tile lukee **per-laji `d2_taso` ENSIN**, TKI/20 vain fallbackina jos `d2_taso == null`.
Sama kaanon kuin VP `laskeD2Taso` (#262):
```js
// D2-tile: per-laji Eerikkilä-ka ensin (kanoninen 1–5), TKI/20 vain fallback
const d2 = (p.d2_taso != null) ? p.d2_taso
         : (p.tki_viimeisin != null) ? Math.round((p.tki_viimeisin / 20) * 10) / 10
         : null;
```
Lähde-label seuraa: kun `d2_taso` määrää → "lähde: per-laji" (tai piilota "lähde: TKI"); TKI näkyy edelleen
omana indeksinään kortin yläosassa ("TKI 34 · Kehitä: Syöttö") — sitä ei poisteta.

## Bug B-M — PELIÄLY `yht/12` (pitäisi olla `/3`, keskiarvokaanon)

**§C ADAR-LOHKO** (peliäly valmentajalle, ~rivi 6739) renderöi yhteenvedon:
```js
'Peliäly' + (_av.yht != null ? ... _av.yht + '<span ...>/12</span>' : '')
```
`_av.yht` on kanonisesti **keskiarvo (max 3)**, ei summa → "2.8/12" on väärä nimittäjä (pitäisi 2.8/3 tai
summa 11/12). **Per-osa-palkit** (`v + '/3'`, `v/3*100`) ovat **jo oikein** — älä koske niihin.

**Korjaus:** yhteenveto `/12` → `/3` (näytä `_av.yht + '/3'`), TAI summa `a+d+ac+r + '/12'` — valitse sama
esitys kuin VP:ssä #262 (VP:ssä päädyttiin `/3`-suhteeseen; pidä yhtenäisenä). **Auditoi kaikki 3 `/12`:tä
Masterissa** (yht-adar-osumia 2: §C-kortti + koti-kortti ~rivi 4475; kolmas ~rivi 7170 erikoisNarr — tarkista
onko adar). Kaikki adar-`yht`-nimittäjät = `/3`-kaanon.

## Reunaehdot

- **Vain Master_v16.** VP + Pelaaja jo korjattu (#262), muut appit puhtaat (auditoitu).
- **Ei skeemamuutosta** — näyttö-/laskentakorjaus. `d2_taso`, `tki_viimeisin`, `adar_viimeisin.yht` ovat jo
  pikakentissä.
- **Design-lukko + molemmat teemat.** Ei jaettua libiä → ei `?v=`-bumppia (paitsi Master itsensä versiointi).
- **Oikeiden alaikäisten data:** L3 vain Topias Koskelalla (KPV, sanktioitu).
- **§7.22:** PELIÄLY on valmentajan näkymä — säilytä.

## Definition of Done

- **A-M:** L1 diff = D2-tile `d2_taso`-ensin. L3 Topias Master-kortti → **D2 Tekninen 4/5** (ei 1.7),
  TEKNIIKKA-erittely ennallaan, TKI 34 näkyy omana indeksinään.
- **B-M:** L1 diff = kaikki Master adar-`yht` `/12` → `/3`-suhde (§C + auditoitu). L3 Topias → **PELIÄLY 2.8/3**
  (tai 11/12), per-osa-palkit ennallaan. Molemmat teemat.
- ~805 vitest vihreä, lint clean. Pieni PR, verifioi elävänä (Topias/KPV) — **lataa Master-välilehti uudelleen
  deployn jälkeen** (ajonaikainen funktio jää muuten vanhaksi).
