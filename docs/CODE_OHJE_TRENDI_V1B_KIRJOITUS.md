# CODE_OHJE — Trendi Vaihe 1b: historia päivittyy tallennuksessa (write-on-save)

**Tyyppi:** kytkentä olemassa olevaan tallennukseen (ei uutta dataskeemaa) · **Base:** `main`.
**Riippuvuus:** Vaihe 1a (mergetty) — `lib/tm_historia.js` + `hh_historia`/`tki_historia` + backfill ovat jo tuotannossa.
**Laajuus:** VAIN kirjoitus-kytkentä. Näyttö (Kehityskaari) on Vaihe 2, eri PR.

## Miksi

Vaihe 1a täytti historian kertaluontoisesti testituloksista (backfill). Jotta **uudet** mittaukset
(tuonti + online-testaus) päivittyvät historiaan automaattisesti — eikä backfilliä tarvitse ajaa
joka kerta — liitetään snapshot jokaiseen H-H/TKI-tallennukseen. Backfill jää idempotentiksi varaverkoksi.

Jaettu lib on jo olemassa (`tmHhSnapshot`, `tmTkiSnapshot`, `tmHistoriaLisaa` — upsert pvm:llä, katko 20).
Käytä niitä; älä toteuta logiikkaa uudelleen.

## Työ

### 1. Excel-tuonti — `tallennaFirestoreen` (`TalentMaster_Excel_Tuonti.html`)
`profiiliUpdate`-lohkossa (siellä missä jo kirjoitetaan `hh_viimeisin` / `hh_taso` / `d1_taso`, ~rivi 2970–3027)
liitä H-H-snapshot **vain jos H-H mitattiin tässä tuonnissa** (hhViimeisin olemassa):

```js
if (hhViimeisin) {
  const _edell = (p._firestoreData && p._firestoreData.hh_historia) || [];
  profiiliUpdate.hh_historia = tmHistoriaLisaa(_edell, tmHhSnapshot(pvmIso, {
    hh_taso: hhTaso, d1_taso: profiiliUpdate.d1_taso, d2_taso: profiiliUpdate.d2_taso, hv: hhViimeisin
  }));
}
```

Sama TKI:lle siellä missä `tki_viimeisin` / `tk_lajit_viimeisin` kirjoitetaan:

```js
if (tki !== null) {
  const _edellT = (p._firestoreData && p._firestoreData.tki_historia) || [];
  profiiliUpdate.tki_historia = tmHistoriaLisaa(_edellT, tmTkiSnapshot(pvmIso, { tki: tki, tkLajit: _tkLajit }));
}
```

**Upsert pvm:llä → re-import samalle päivälle EI tuota duplikaattia** (idempotentti, `tmHistoriaLisaa` hoitaa).

### 2. Online-testaus — `TalentMaster_Testaus_v9.html`
Etsi H-H-tallennuspolku (missä `testitulokset` + hh-pikakentät `hh_viimeisin`/`hh_taso`/`d1_taso` kirjoitetaan
online-kirjauksesta) ja liitä sama snapshot-kytkentä (hh_historia + tki_historia) samalla kuviolla.
- **Lisää script-include** `<script src="lib/tm_historia.js?v=N"></script>` Testaus_v9:ään (uusi lib tälle apille).
  (eslint-globaalit on jo rekisteröity 1a:ssa — ei eslint-muutosta.)

### 3. recalcHH — EI koske historiaan
`recalcHH` on tasojen uudelleenlaskenta olemassa olevasta datasta, ei uusi mittaus → **älä liitä uutta
historiapistettä siellä**. Backfill kattaa uudelleenrakennuksen. (Pidä muutos pienenä.)

### 4. Pikkuparannus — backfillin dry-run-loki
Nyt dry-run-loki tulostaa vain `30m + kasirata`, joten SJK-pelaaja (cmj/10m/sm_juoksu/sm_pallo) näyttää
harvalta ("30m: 4.47 · kasirata: ·") vaikka snapshot on täysi. Muuta loki tulostamaan **ne avaimet joita
snapshotissa on** (esim. `Object.keys(snap).filter(k!=='pvm')`), jotta dry-run on luettava kaikilla seuroilla.
Vain logi-teksti — ei muuta datalogiikkaa.

## Reunaehdot

- **Vain kirjoitus-kytkentä, ei näyttöä** (Kehityskaari = Vaihe 2).
- **Idempotentti:** upsert pvm:llä, katko 20 — `tmHistoriaLisaa` hoitaa. Re-import ei duplikoi.
- **Testijoukko-agnostinen:** snapshot ottaa vain mitatut avaimet (§26). Toimii Sibbo (30m+kasirata) JA
  SJK (10m/30m/cmj/sm_juoksu/sm_pallo) -datalla — sama kuin backfillissa (todistettu: cmj tallentuu).
- **Ei skeema-/Rules-muutosta:** `hh_historia`/`tki_historia` kirjoitetaan samaan pelaajadokkariin, samaan
  `profiiliUpdate`-set-merge-kirjoitukseen kuin `hh_taso` jo nyt (Rules jo ok, backfill kirjoitti ne).
- **Oikeiden alaikäisten data:** L3-testit VAIN Topias Koskelalla (sanktioitu testipelaaja, KPV).
- **`?v=`-bump** Testaus_v9:ään (uusi lib-include). Excel-tuonti lataa libin jo (1a).
- **Prosessimuistutus:** uuden lib-funktion käyttö appissa vaatii `<script src>`-includen + eslint-globaalit
  (globaalit jo rekisteröity 1a:ssa → tämä PR ei koske eslint.config.js:ään).

## Definition of Done

- **L1:** diff = snapshot-liitos `tallennaFirestoreen`:iin (hh + tki) + Testaus_v9-tallennuspolkuun +
  Testaus_v9-script-include + dry-run-loki. Ei Kehityskaari-renderiä, ei recalcHH-historiaa.
- **L2:** ~790 vitest vihreä (lib jo katettu 1a:ssa; ei uutta laskentaa).
- **L3 (elävä, Topias Koskela / KPV):**
  - Tuo Topiakselle H-H-mittaus uudella pvm:llä (Excel historia) → `hh_historia` saa uuden pisteen; **re-import
    samalla pvm:llä → ei duplikaattia** (idempotentti).
  - Online-H-H-kirjaus Testaus_v9:ssä Topiakselle → `hh_historia` saa pisteen.
  - Dry-run-loki näyttää SJK-tyyppisen pelaajan avaimet (cmj/10m/sm) oikein.
- Pieni PR, verifioitu elävänä ennen Vaihe 2:ta.
