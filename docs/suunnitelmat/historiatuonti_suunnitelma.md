# Historiatuonti: uusin voittaa — pikakentät testikohtaisesti

Kaista: Tero (HTML + lib). Pohja: origin/main. Brief: `.briefit/CODE_BRIEF_HISTORIATUONTI_PIKAKENTAT.md`.

## Ongelma (TalentMaster_Excel_Tuonti.html, `tallennaFirestoreen`)
1. Vanhempi korvaa uudemman: `hh_viimeisin`, `hh_pvm`, `hh_taso`, `testipaivat.*`, `*_edellinen` kirjoitetaan aina tuodun rivin päivällä.
2. Osittainen rivi korvaa koko kartan: `hh_viimeisin` = vain rivin testit (30 m ja CMJ katoavat, jos viimeinen päivä oli vain MAS).
3. Tiedoston rivit käsitellään tiedoston järjestyksessä. Saman pelaajan useat rivit lukevat samaa vanhentunutta `_firestoreData`a (esim. `hh_historia` ja `*_edellinen` laskettiin jokaiselle rivillä alkutilasta).
4. Sama tallennuskoodi palvelee tapahtumapohjaista tuontia (`moodi === 'tapahtuma'`), joten sama sääntö koskee molempia.

## Ratkaisu
Uusi puhdas lib `lib/tm_historiatuonti.js` (`TM_HISTORIATUONTI`, ei Firestorea/DOMia, ≤ 500 riviä, §41). Sovellus ja testit kutsuvat samaa funktiota.

- **Testidokumentit** `pelaajat/{id}/testitulokset/{pvm}_{protokolla}` kirjoitetaan ennallaan (merge). Historia säilyy aina.
- **Testikohtainen pvm — ei uusia kenttiä.** Pelaajadokumentissa ei ole per-testi-pvm:ää (`testipaivat.*` on per patteristo, `hh_pvm` yksi päivä). Johdetaan olemassa olevasta `hh_historia`-aikasarjasta (jokainen snapshot: `{pvm, lin30m, cmj, mas, ...}`): testin pvm = uusin snapshot, jonka arvo on sama kuin `hh_viimeisin[testi]`; jos sellaista ei ole (vanha data) → `hh_pvm` (varovainen: suojaa enemmän kuin vähemmän). Ei lisäkyselyjä, ei Rules-muutoksia.
- **Uusin voittaa per testi:** testin arvo kirjoitetaan vain jos tuotu pvm ≥ testin nykyinen pvm (tai testiä ei vielä ole). `hh_viimeisin` = yhdistelmä (merge per testi). `hh_pvm` = uusimman testin pvm (ei taaksepäin). `hh_taso`, `d1_taso`, `d2_taso` lasketaan yhdistelmästä; ikä `normiIka`n mukaan `hh_pvm`:n testihetkestä kuten nyt (§7.22 ennallaan).
- **`testipaivat.*`**: patteristo päivittyy vain jos sen testi päivittyi ja pvm ≥ nykyinen.
- **`*_edellinen`** (hh_taso, tki, tk_kokonaistulos, tsi): vain kun tuotu pvm on tiukasti uudempi kuin ryhmän nykyinen pvm. Sama pvm (re-import) → ei muutosta, ei nolladeltaa.
- **TKI-, FLEI- ja TSI-ryhmät** noudattavat samaa sääntöä ryhmän omalla pvm:llä (`tki_pvm`, `flei_pvm`, `tsi_pvm`). `phv_tila` kirjoitetaan vain jos rivi on pelaajan uusin. Historiasarjat (`hh_historia`, `tki_historia`, `flei_historia`) ja ennätykset (PB) kirjataan aina — ne ovat historiaa, eivät "nykytila".
- **Järjestys:** rivit lajitellaan pvm nousevaan ennen kirjoitusta; saman pelaajan rivit laskevat peräkkäin yhteisestä tilasta (`tila` päivittyy rivi riviltä), joten `hh_historia`, `*_edellinen` ja yhdistelmä ovat oikein myös monen päivän tiedostossa.
- **Esikatselu:** pelaajalle, jolta jotain jätetään päivittämättä: "Uudempi tulos jo järjestelmässä (9.10.2026) — historia tallennetaan, profiili ei muutu." (osittain: "… profiilissa päivittyy vain: …"). Vain suomeksi; Excel_Tuonti on henkilökunnan fi-sivu (ei sv-reittiä) → ei sv-erää.

## Testit (`tests/historiatuonti_uusin_voittaa.test.js`)
1. pelaajalla hh_pvm 2026-10-09 → tuonti 2025-03-15: testidokumentti tallentuu, pikakentät ennallaan.
2. kaksi päivää väärässä järjestyksessä samassa tiedostossa → lopputulos = uusin.
3. viimeisin päivä vain MAS → hh_viimeisin säilyttää aiemman 30 m:n ja CMJ:n (pvm:t testikohtaisesti).
4. re-import samasta tiedostosta → ei muutoksia (idempotentti), ei nolladeltaa.
5. esikatseluviesti.
6. tapahtumapohjainen tuonti käyttää samaa koodia (lähdetason vartija + ajotesti fake-Firestorella).
Lisäksi kuiva-ajo KPV-tiedostoilla fake-Firestorea vasten (ei kirjoitusta mihinkään oikeaan).

## Toimintokartta (D158)
Nappi: Excel_Tuonti → "Historiapohjainen tuonti" → "Tallenna" → avautuu: esikatselu (uusi paneeli "Uudempi tulos jo järjestelmässä") → kirjoittaa: `pelaajat/{id}/testitulokset/{pvm}_{protokolla}` (kuten ennen) + `pelaajat/{id}` pikakentät (uusi: testikohtainen uusin-voittaa) → rooli: SA/seura-admin (ennallaan, ei Rules-muutosta).
