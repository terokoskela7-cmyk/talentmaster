# Teknis-taktisen curriculumin käännösputki

`lib/tm_teknistaktiset.js`:n proosa (konseptinimet · pelitilanteet · cue-tekstit · kysymykset · harjoitesisältö)
on liian iso reititettäväksi `vpT`-avaimina. Se käännetään **ulkoisesti** (esim. Gemini) ja yhdistetään takaisin
koneellisesti. Työkalu: `scripts/i18n_curriculum.cjs`.

## Nykytila

| | |
|---|---|
| Käännettäviä kenttiä | **1261** (86 120 merkkiä) |
| Konseptinimiä · pelitilanteita · cue-tekstejä | 116 · 109 · 368 |
| Osiot | youth 167 · fundamentit 643 · joukkue 151 · harjoitteet 290 · pelipaikat 7 · asteikko 3 |
| Käännetty | **1261 / 1261 (100 %)** → `curriculum_kaannettava.sv.MASTER.json` (rikssvenska) |
| Sidecar | **tehty** — `lib/tm_teknistaktiset_sv.js`, portti `tests/i18n_curriculum_sidecar.test.js` |
| Render-kytkentä | **ei tehty** — oma erä (Vaihe B) |
| Ruotsin laatukatselmus | **lykätty, ei-blokkaava** — EIF:n valmennuspäällikkö, oma sv-only-korjauserä |

## 1. Irrota (tehty)

```bash
npm run i18n:curriculum -- irrota                    # koko curriculum → docs/i18n/curriculum_kaannettava.sv.json
npm run i18n:curriculum -- irrota --osiot=youth      # vain yksi osio (chunkkaus, ks. alla)
```

**Avainskeema** (deterministinen, rekonstruoitava):

```
<avain>.nimi · <avain>.pelitilanne · <avain>.painotus · <avain>.pelaaja_miksi
<avain>.kpi.<koodi>.teksti          esim. y_h0.kpi.a.teksti
<avain>.kysymys.<indeksi0>          esim. y_h0.kysymys.0
harjoite.<koodi>.konseptipeli · harjoite.<koodi>.<i>.teema|painopisteet|pelipaikka
pelipaikka.<koodi>.nimi · asteikko.taso.<n>
```

**Ei irroteta** (dataa/enumeja): `avain` · `koodi` · `dim` · `faasi` · `ryhma` · `pelimuoto` · `ika` · `jatkuu` ·
`kpi[].koodi` · `yksilo` · `pelipaikat` · `numerot`.

## 2. Käännä (tehty — Tero, ulkoinen työkalu)

> **Tila:** valmis. Tulos = `curriculum_kaannettava.sv.MASTER.json` (1261/1261, 0 fi-jäännettä,
> 0 ei-latinalaista merkkiä, 0 `[cite:]`-artefaktia). **Teksti on lukittu** — älä aja sitä uudelleen
> minkään LLM:n läpi. Kielikorjaukset tulevat valmennuspäälliköltä omana eränä (MASTER.json → sidecar).
> Ohjeet alla pätevät seuraavaan kieleen (en) ja korjauskierroksiin.

Lataa `curriculum_kaannettava.sv.json` ja käännä **vain arvot**. Chunkkaa tarvittaessa osioittain
(`--osiot=fundamentit` on isoin, 643 avainta) jos malli ei jaksa palauttaa koko tiedostoa kerralla.

Kehote joka kannattaa antaa mallille:

> Tässä on JSON-tiedosto muodossa `"avain": "suomenkielinen teksti"`. Käännä **vain arvot** ruotsiksi
> (rikssvenska, jalkapallovalmennuksen terminologia). **Älä muuta avaimia.** Säilitä ennallaan: numerot,
> prosentit, §-viittaukset, nuolet (→), ajanjaksot ja koodit kuten `Y-H0`, `4v4+3`, `1v1`. Säilytä
> rivinvaihdot ja välimerkit. Palauta sama JSON-rakenne, samat avaimet, samassa järjestyksessä.

Termistön on oltava linjassa lukitun glossaarin kanssa (`lib/tm_i18n_common.js`): esim. **Pujottelu → Slalom**
(EI *dribbling*) · Syöttö → Passning · Ponnauttelu → Jonglering · Kuljetus-laukaus → Föring och skott ·
Kehon valmius → Kroppslig beredskap.

## 3. Yhdistä takaisin

```bash
npm run i18n:curriculum -- yhdista docs/i18n/curriculum_kaannettava.sv.MASTER.json                    # kuivaajo (raportti)
npm run i18n:curriculum -- yhdista docs/i18n/curriculum_kaannettava.sv.MASTER.json --sidecar --apply  # ajettu
```

- **`--sidecar` (suositus):** kirjoittaa `lib/tm_teknistaktiset_sv.js`:n = litteä `{ avain → sv }`.
  ⚠ `lib/tm_teknistaktiset.js` on **generoitu** (`docs/data/parse_oma_versio.py`, "ÄLÄ MUOKKAA KÄSIN") —
  sidecar säilyy curriculumin regeneroinnin yli, inline-kentät eivät.
- **Inline (briiffin alkuperäinen muoto):** ilman `--sidecar` työkalu lisää `nimi_sv` · `pelitilanne_sv` ·
  `kysymykset_sv` · `kpi[].teksti_sv` -kentät itse libiin. Toimii, mutta parseriajo pyyhkii ne.

Molemmissa: **fi-arvoja ei korvata koskaan**, ja kääntämätön (tyhjä tai fi:n kanssa identtinen) arvo
**ohitetaan** — siksi tämänhetkinen fi-täytteinen tiedosto on merge-no-op. Tuntemattomat avaimet
raportoidaan eikä mitään kirjoiteta ennen kuin ne on korjattu.

## 4. Häviöttömyys-portti

```bash
npm run i18n:curriculum:tarkista      # fi → irrota → merge → fi, pitää olla HÄVIÖTÖN
```

Todistaa että avainskeema osuu takaisin **täsmälleen** oikeisiin kenttiin ja fi-sisältö pysyy bitilleen
ennallaan. Väärään kenttään päätynyt käännös olisi hiljainen datavirhe, ei näkyvä kaatuminen — siksi tämä
ajetaan osana testisarjaa (`tests/i18n_curriculum_putki.test.js`, 19 testiä) eikä käännöstä saa mergetä
jos portti on punainen.

**Sidecar-portti** (`tests/i18n_curriculum_sidecar.test.js`, 8 testiä) vahtii tuotettua käännöstä:
jokaiselle fi-avaimelle on sv-vastine · ei orpoja sv-avaimia · ei fi-jäännettä · ei ei-latinalaisia
merkkejä tai `[cite:]`-artefakteja · generoitu lib pysyy kielineutraalina (ei `_sv`-kenttiä) · sidecar
vastaa MASTER.jsonista koneellisesti tuotettua sisältöä.

⚠ **Regenerointi-sopimus:** `parse_oma_versio.py` kirjoittaa vain `tm_teknistaktiset.js` — sidecar
säilyy. Mutta jos regenerointi **lisää tai muuttaa curriculum-avaimia**, sidecar vanhenee hiljaa
(puuttuva avain → fi-fallback sv-näkymässä, ei virhettä). Sidecar-portti punaa silloin: irrota uudet
avaimet, käännätä ne ja merge sidecar uudelleen.

## 5. Render-kytkentä (EI vielä tehty)

Oma erä sv-tiedoston valmistuttua + natiivitarkistuksen jälkeen: VP lukee sv:n samalla kuviolla kuin
taksonomia (V8c) ja silta-libit (V8e) — **lib pysyy kielineutraalina, kielivalinta tehdään renderissä**,
puuttuva käännös → fi-fallback. Sidecar-muodossa resolvi on yksi lookup: `TM_TT_SV['<avain>.<kenttä>']`.
Samalla erällä laajennetaan render-gate kattamaan esikatselupinnat.
