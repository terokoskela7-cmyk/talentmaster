# Arkistointiehdotus: `lib/tm-kortit.js`

> **4.10.2026** (PR B). Pelkkä ehdotus, tiedostoa ei ole poistettu eikä siirretty. Tero päättää.

## Havainto (grep kaikista `*.html`-, `*.js`-, `*.json`-, `*.yml`- ja `*.md`-tiedostoista, `node_modules` pois lukien)

`lib/tm-kortit.js` (707 riviä, `TM.kortit`, localStorage-avain `tm.kortit.v1`) **ei lataudu yhteenkään sovellukseen**:

- Yksikään HTML-tiedosto ei lataa sitä `<script src>`-tagilla, eikä mikään service worker cacheta sitä.
- `TM.kortit`- tai `tm.kortit.v1`-viittauksia on vain tiedostossa itsessään.
- Viittaukset ovat vain seuraavissa:
  - `src/lib/tm-kortit.js`: re-export (`module.exports = require('../../lib/tm-kortit.js')`). Sitä ei lataa kukaan (`src/**` ei julkaista)
  - `tests/tama_paiva_paikallinen.test.js:126–127` ja `tests/tallennus_paiva_paikallinen.test.js:113`: lähdetarkistukset (`tmPaivaIso`-käyttö)
  - `CLAUDE.md:194` sekä `docs/TILANNEKUVA_ROADMAP.md:39, 78, 140` ("käytännössä kuollutta koodia")

Elävä korttijärjestelmä on Pelaaja_v7:n `KORTTI_KATALOGI` (§36, `docs/KORTTI_KATALOGI.md`). `tm-kortit.js` on rinnakkainen, käyttämätön malli,
jossa on eri tasonimet (Nouseva, Lahjakas, Tähti, Legenda) ja 15 omaa saavutusta. Kaksi korttimallia rinnakkain hämmentää lukijaa
(ks. PR #750:n `docs/PELAAJA_KORTIT_TILANNE.md` §1.3 ja §3).

## Ehdotus

1. Siirrä `lib/tm-kortit.js` ja `src/lib/tm-kortit.js` → `archive/lib/tm-kortit.js` (`archive/**` on jo rajattu pois Pagesista ja
   Hostingista: `deploy-pages.yml` ja `firebase.json`).
2. Päivitä kaksi testiä: poista `tm-kortit.js` `tama_paiva_paikallinen.test.js`:n `arrayContaining`-listasta ja
   `tallennus_paiva_paikallinen.test.js`:n taulukosta (tai osoita ne arkistopolkuun).
3. Päivitä `CLAUDE.md:194` ja `docs/TILANNEKUVA_ROADMAP.md` (merkintä "arkistoitu").
4. Ennen siirtoa poimi katalogiin talteen ideat, joita kannattaa jatkaa. Esimerkiksi idolikorttien 5 versiota ja "sitkeys"-saavutukset sopivat
   KORTTI_VISIO §10:n Vaihe 2–3:een, mutta ne pitää toteuttaa pikakentistä (§26), ei localStoragesta.

Riski on pieni: koodia ei ladata, joten käyttäjälle näkyvää muutosta ei tule. Ainoat rikkoutuvat asiat ovat kaksi testiä, jotka päivitetään samassa PR:ssä.
