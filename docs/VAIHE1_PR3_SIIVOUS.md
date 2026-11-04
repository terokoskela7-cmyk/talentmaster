# Vaihe 1 · PR 3: henkilökunnan A-kenttien siivous pelaajadokumentista

Lähde: `.briefit/INVENTAARIO_VAIHE1_PR2.md` §5–§6 ("siivous"). Skripti: `scripts/siivoa_sisainen_vanhat.js`. Malli on `siivoa_terveys_vanhat.js`, ja säännöt ja liput ovat samat.

**Ajo vasta, kun 2d (#1179) on ollut tuotannossa vähintään 24 h** (Tero 4.11.2026). Skripti tarkistaa tämän itse, ja `--kirjoita` ei käynnisty ennen sitä.

## Mitä siivotaan

| Kohde | Toimenpide | Ehto |
|---|---|---|
| A-kentät: henkilokunta, adar_sisainen, arviointi, kypsyys_sisainen, talentti | poisto | sama arvo `sisainen/tiedot`:ssa, oikea `seuraId` |
| `arviointi_havaittu` (syvä kenttä) | poisto | sama arvo, tai sisainen sisältää vanhan kentän kaikki avaimet samoina |
| `jaksofokus.<A>` | poisto (pistepolku) | sama arvo `jaksofokus_sisainen`:ssa. Jos sisainen on leimattu toiselle jaksolle, kenttä jää (dual-read näyttää vanhan) |
| `signaali` | talenttisignaali pois, `phv` jää | sama arvo sisainen:ssa |
| `havainto_porras_ehdotus.hist` | `hist_n` asetetaan ja `hist` poistetaan **samassa päivityksessä** | sama kuin `havainto_porras_hist`; tyhjä hist poistetaan ilman ehtoa |
| `biologinenIka_viimeisin` | korvataan B-muodolla (`tmBioIkaJaa`) | koko dokumentti sama sisainen:ssa |
| `tuoja` (pelaajadokumentti) | poisto | ei ehtoa (tunniste, ei lukijoita, PM 22.10.) |
| `tuojaUid`, `tallensiUid`, `kirjaaja`, `mittaaja` dokumenteissa `testitulokset/*` ja `biologinen_ika/*` | poisto | ei ehtoa; tulokset jäävät |

**Ei siivota:** `talenttiOhjelma` ja `tavoitteet` (C-kenttiä), `jaksofokus_historia` (R8, oma viipale), D3 (`siivoa_d3_vanhat.js`) eikä terveyttä (`siivoa_terveys_vanhat.js`).

Kenttä jää, jos sisainen-kopio puuttuu tai arvo eroaa. Jääneet lasketaan, `--listaa-id` näyttää niiden polut ja `--selita` arvot (vain Teron päätteeseen). Testi varmistaa, että henkilökunnan dual-read-näkymä on siivouksen jälkeen sama kuin ennen: vain tunniste `tuoja` poistuu ja uusi `hist_n` tulee.

## Deploy-varmistus (`--kirjoita` vaatii)
1. Tuotannon tiedostoissa on 2d:n merkit: `lib/tm_sisainen.js` → `tmBioIkaJaa`, Master ja ADAR → `TM_SISAINEN_PUUTTUU`. Näin varmistetaan, ettei 2d:tä ole peruttu.
2. **Ensimmäinen onnistunut** `deploy-pages.yml`- ja `deploy-functions.yml`-ajo #1179:n mergen (2026-11-04T17:27:53Z) jälkeen on valmistunut vähintään 24 h sitten. Tieto haetaan GitHub Actions API:sta. Last-Modified ei kelpaa, koska jokainen Pages-deploy nollaa sen.

## Ajojärjestys (Teron kaista, gcloud ADC)
1. 2d deployattu (Rules v3.76 → functions → Pages).
2. `node scripts/migroi_sisainen_s4.js` (dry-run, sitten `--kirjoita`). Migraatio kopioi `biologinenIka_viimeisin`:n sisainen:iin, koska 2d lisäsi sen kypsyysryhmään. Ilman tätä vaihetta vanhat mittaukset jäävät luokkaan `sisainen_puuttuu`.
3. Odota, että on kulunut vähintään 24 h.
4. `node scripts/siivoa_sisainen_vanhat.js` (dry-run), minkä jälkeen PM kuittaa luvut.
5. `node scripts/siivoa_sisainen_vanhat.js --kirjoita`, ja sen perään dry-run, jonka pitää näyttää 0.
6. Vähintään 24 h:n kuluttua PR 2e (Rules hylkää A-avaimet pelaajadokumentissa).

Siivous laukaisee `notifValintaOdottaa`-triggerin jokaiselle muuttuvalle pelaajalle. Viestejä ei lähde (inventaario §4), ja kustannus on noin yksi kutsu pelaajaa kohden.
