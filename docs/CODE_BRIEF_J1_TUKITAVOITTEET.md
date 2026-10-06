# CODE BRIEF · J1 — Tukitavoitteet ja joukkuejakso (lib, ei UI:ta)

**Kaista: auto** (vain `lib/` + `tests/`, ei näkyviä muutoksia). Aja koko testisarja (myös `functions/`) ennen auto-mergeä ja raportoi tulos PR:ssä.
**Design-SSOT:** `docs/design/idp-v2/12_jaksologiikka.html` (D17–D22 lukittu 6.10.2026) ja `13_kehitystyopoyta_kentta.html` §7 (kentät). Lue molemmat ennen koodia.
**Ei tässä PR:ssä:** UI (V1/J3 tulee erikseen, Teron kaista), Rules, Firestore-kirjoitukset, Pelaaja_v7.

## Tavoite
Yksi kirjasto, joka (1) validoi joukkuejakson neljä aluetta, (2) validoi ja lukee pelaajan tukitavoitteet taaksepäin yhteensopivasti ja (3) ehdottaa tukitavoitteita kuudesta lähteestä yhdellä logiikalla. Puhtaat funktiot, data sisään parametreina, ei Firebasea eikä DOMia. Dual-export kuten `lib/tm_jakso_malli.js`.

## Älä keksi uutta logiikkaa — käytä olemassa olevaa
- `lib/tm_jakso_malli.js`: `tmTukiosa`, `tmLiitaTukiosaan`, `tmJaksoTekstiKelpaa` (KIELLETYT-sanat), `tmJaksonKesto`. Laajenna tai kutsu, älä kopioi.
- `lib/tm_idp.js`: kypsyysvahti `idpKypsyysEstetty` (§28: speed/endurance/power estetty PRE/LAH). **Sama sääntö tukitavoitteisiin**; lisäksi PHV `tuntematon` käsitellään kuten PRE/LAH (CLAUDE.md §14: tuntematon = varovaisin). Jos sääntö pitää siirtää jaettuun paikkaan, tee se niin, että `tm_idp.js` käyttää samaa funktiota (ei kahta kopiota).
- `lib/tm_phv_tila.js`: `tmPhvKoodi` — älä lue `p.phv_tila`:a suoraan.
- `lib/tm_arviointi_silta.js` (`tmSiltaEhdota`) ja `lib/tm_arviointi_taksonomia.js`: arviointilähde (Palloliiton taksonomia, `arviointi_havaittu`).
- `lib/tm_pvm.js` `tmPaivaIso` (ei UTC-päivää, §7.26).

## Funktiot (uusi `lib/tm_tukitavoitteet.js`, nimet voi tarkentaa)
1. `tmJoukkuejaksoOsaAlueet(x)` → validoi `{tekninen_taktinen:{teema_avain,nimi,lahde}, fyysinen:{alue,ohjelma_id?,lahde}, henkinen:{kuvaus}|null, sosiaalinen:{kuvaus}|null}`. Tekn.-takt. ja fyysinen pakollisia (D17), henkinen/sosiaalinen valinnaisia, ≤ 120 merkkiä, KIELLETYT-tarkistus.
2. `tmTukitavoite(x)` → validoi `{alue:'fyysinen'|'tekninen_taktinen'|'henkinen'|'sosiaalinen', kuvaus ≤ 80, perustelu (pakollinen, ≤ 400, KIELLETYT-tarkistus = aina myönteinen, D20), lahde:{tyyppi:'joukkuejakso'|'testi'|'havainto'|'arviointi'|'pelaajan_arvio'|'suunnitelma', viite ≤ 120, pvm YYYY-MM-DD}, harjoitteet[]}`. Harjoitteiden kenttä on **`lahde:'seura'|'tm'`** kuten #823-snapshotissa (ei `sisalto`).
3. `tmTukitavoitteet(jf)` → lukija: `jf.tukitavoitteet` tai vanhasta `jf.tukiosa` johdettu `[{alue:null, kuvaus:tukiosa.alue, perustelu, lahde:{tyyppi:'suunnitelma'}, harjoitteet}]`. Ei heitä vanhalle datalle.
4. `tmTukitavoitteetKirjoitus(lista)` → `{tukitavoitteet, tukiosa}`: siirtymän ajan kirjoitetaan molemmat (tukiosa = ensimmäinen tukitavoite muodossa `{alue: kuvaus, perustelu, harjoitteet}`), jotta Pelaaja_v7 ja K1 toimivat.
5. `tmTukitavoiteMaksimi(ikavaihe, seuraProfiili?)` → Leikkijä 0 · Rakentaja 1 · Showcase 2 (D18); seuran prosessiprofiili voi ylikirjoittaa (0–2).
6. `tmTukitavoiteEhdotukset(p, konteksti)` → järjestetty lista, **enintään 4** (UI näyttää 1 + "Muut vaihtoehdot (3)", D19). Jokaisessa: `{alue, kuvaus, perustelu_ehdotus, lahde:{tyyppi,viite,pvm}, lyhyt, miksi}`:
   - `lyhyt` = valmentajan rivi ilman lukuja ("havainnoista (2)", "arvioinnista", "joukkuejaksosta").
   - `miksi` = yksityiskohdat ("miksi?"-avaukseen): päivämäärät, lähde, kypsyysvahdin syy.
   - Järjestys (12, moottoritaulukko): 0 kypsyyssuoja → 1 testi (≤ 6 kk, kypsyysvahti) → 2 havainto (sama asia ≥ 2 rakenteisessa havainnossa) / arviointi (alin tai laskeva attribuutti ≤ 6 kk; seuran `arviointikehys/seura` kumoaa Palloliiton taksonomian, jos annettu) → 2b pelaajan arvio (vain D3, `d3_viimeisin.pisteet[].pelaaja`; D5 tulossa) → 3 joukkuejakso (aina oletus, jos annettu).
   - `konteksti` sisältää valmiiksi haetun datan: `tanaan`, `havainnot[]`, `joukkuejakso`, `arviointikehys?`, `seuraProfiili?`. Ei kyselyitä.
   - **Havainnot:** käytä vain rakenteisia kenttiä (konsepti/osa/attribuutti-tagit, jos niitä on). Vapaata tekstiä ei jäsennetä. Jos rakenteisia tageja ei ole, havaintolähde ei ehdota mitään. Raportoi PR:ssä, mitä kenttiä havainnoista oikeasti löytyy.
   - Moottori ei koskaan valitse itse; palauttaa vain listan.

## Vartijatestit (`tests/tukitavoitteet.test.js`)
- Topias-tyyppinen pelaaja (PHV LAH, heikko 30 m) → ei fyysistä nopeusehdotusta testistä; kiihdytys sallittu. Sama `tuntematon`-tilalle. POST-pelaajalle nopeus sallittu.
- Lähdejärjestys ja enintään 4 ehdotusta; joukkuejakso aina mukana, jos annettu.
- Seuran arviointikehys kumoaa Palloliiton taksonomian.
- **Ketjunimet (SBL/SFL/LL/DIAG/DFL) eivät esiinny missään palautetussa merkkijonossa** (ketjut ovat TM:n sisäisiä).
- KIELLETYT-sanat hylätään perustelussa ja joukkuejakson henkisessä/sosiaalisessa lauseessa.
- Vanha `tukiosa` luetaan oikein; `tmTukitavoitteetKirjoitus` tuottaa yhteensopivan `tukiosa`n.
- `tmTukitavoiteMaksimi` ikävaiheittain ja seuran ylikirjoituksella.
- `tm_idp.js`:n olemassa olevat testit pysyvät vihreinä (kypsyysvahti yksi lähde).

## Raportoi PR:ssä
Funktiot ja niiden allekirjoitukset, havaintojen rakenteiset kentät jotka löytyivät, mihin kypsyysvahti siirtyi (jos siirtyi), testitulokset (unit + functions + characterization `harjoitelogiikka`), ja mitä 12:sta jäi toteuttamatta. "Kaista: auto" PR-kuvauksen ensimmäiselle riville.
