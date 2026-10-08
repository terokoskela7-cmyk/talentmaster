# S1.1 Käyttöaste — toteutusraportti (brief `docs/CODE_BRIEF_S1_1_KAYTTOASTE.md`)

Kaista: Tero · 10.10.2026 · PR haarasta `feat/s1-1-kayttoaste` (origin/mainin päältä).

## 1. Mitä tehtiin
| Brief | Toteutus |
|---|---|
| §1 Pelaajan kirjautumisaikaleima | `pelaajaKirjaudu` kirjoittaa `viimeisinKirjautuminen` (Helsingin päivä `YYYY-MM-DD`) onnistuneen kirjautumisen (PIN + suostumus ok, token luotu) jälkeen, **vain jos päivä vaihtui**, vain seuran pelaajalle (ei Solo-lapselle), best-effort (virhe ei kaada kirjautumista). Sama nimi kuin henkilökunnalla (camelCase). |
| §1 Huoltaja | **Selvitys:** huoltajan sessio alkaa Vanhempi_v2:ssa sähköpostikirjautumisesta (`signInWithEmailAndPassword`), minkä jälkeen `haeLapsiHuoltajalle` (vain jos URL:ssa ei ole `?seura=&uid=`) ja `_vaihdaLapsi`. Yksinkertainen → **toteutettu:** callable `kirjaaHuoltajaKaynti({seuraId, pelaajaId})` (europe-west1, App Check), palvelin tarkistaa `token.email == pelaajan huoltajaEmail` (sama ehto kuin Rules `onLapsenHuoltaja`), kirjoittaa `huoltajaViimeisinKaynti` kerran päivässä. Vanhempi kutsuu sitä `_vaihdaLapsi`:ssa (best-effort, localStorage-vahti). **Rajaus:** vain sähköpostilla kirjautunut huoltaja lasketaan; linkkikäynti ilman sähköpostia (anonyymi) ei kirjaudu. |
| §1 Rules | v3.54: `viimeisinKirjautuminen` ja `huoltajaViimeisinKaynti` vain palvelimella — create: ei kenttiä; update: `!affectedKeys().hasAny([...])` kaikille rooleille (myös SA/henkilökunta). 5 Rules-testiä (aseta/muuta/poista, täysi korvaus, muut kentät toimivat, luonti, pelaaja+huoltaja eivät lue koostetta). |
| §2 Kooste v2 | `lib/tm_seuran_kooste.js` versio 2: `n_suostumus`, `n_kirjautunut_30`, `n_huoltaja_30`, `n_aktiivinen_7`, `n_aktiivinen_30` (+ `tmKoosteTrendi`). Lib-kopio `functions/` synkattu (vartija). Takaisinlaskenta (`arvio:true`) kattaa uudet luvut; ikkuna päättyy aina arviointihetkeen. |
| §3 Admin | "Pilotin tila" → 📈 Käyttöaste: seuroittain `<details>` (pelaajia · suostumus · aktiivinen 7/30 pv + nuoli), auki joukkueet ikäjärjestyksessä (ei mittarijärjestystä, D42), alle 5 pelaajan joukkue = lukumäärä ("3/4"), trendi = edellinen viikko + 4 viikon sarja (title). "📊 Päivitä kaikki" → `paivitaSeuranKooste` jokaiselle aktiiviselle seuralle (30 s jäähy → "tuore"). Koko osio `lib/tm_kayttoaste.js`:ssä; Admin-kuoreen vain ~10 riviä (kasvukatto 2800 pitää). |
| §4 VP | Kortti "Sovelluksen käyttö" Kotiin (lipusta riippumatta): oman seuran kooste, luvut + trendi joukkueittain. Valmentaja (ei luku-oikeutta koosteeseen) → kortti piiloon. Renderöinti libissä. |

## 2. Aktiivisuuden lopulliset lähteet (`n_aktiivinen_7/30` = pelaajan tai huoltajan OMA kirjoitus)
1. `pelaajat/{pid}/kirjaukset/{pvm}` — pelaajan kirjaus **ja** U12-huoltajan `jakso_kuittaus` (sama dokumentti, id = päivä)
2. `pelaajat/{pid}/viikkokatsaukset/{pvm}`
3. `kalenteri/{id}/lasnaolijat/{pid}` — vain RSVP: `saatavuus` asetettu ja `rooli` ∈ {pelaaja, vanhempi}, `paivitetty` ikkunassa (valmentajan kirjaama `tila` ei ole pelaajan oma)
4. `viestit` tyyppi `klippi_vastaus` (pelaaja/huoltaja) ja `klippi_kuittaus` (huoltaja) — ei valmentajan klippiä
5. Pelaajadokumentin omat pikakentät (jo ladattu, 0 lisälukua): `ydinvahvuus_valinta.valittu_pvm` (valinta), `idp_sitoumus_pvm` (sitoumus), `d3_pvm` (itsearvio), `streak_paivitetty` (kirjaus)
Kirjautuminen ei ole "oma kirjoitus" — oma mittari `n_kirjautunut_30`. Tulevaisuuden päivät (arviohetken jälkeen) eivät lasketa.

## 3. Lukumäärä per ajo (arvio, ei mitattu tuotannossa)
* Lähteet 1–2: 2 kyselyä/pelaaja, ≤ 31 dokumenttia kumpikin (tyypillisesti 0–3; tyhjä kysely = 1 luku) → Sibbo ~500, SJK ~125, KPV ~70 lukua.
* Lähde 3: kalenteritapahtumat joiden `pvm` ≥ ikkunan alku (myös tulevat, max 500) × niiden `lasnaolijat` — suurin yksittäinen erä: esim. 60 tapahtumaa × 25 = ~1 500 lukua/seura.
* Lähde 4: seuran `klippi_vastaus`/`klippi_kuittaus` -viestit (uusi ominaisuus, tällä hetkellä ~0).
* S1:n pohja 1 500–2 200 → **kokonaisuus n. 2 500–4 500 lukua/seura/ajo**, 2 ajoa/viikko (su 21:00, ma 06:00) + "Päivitä nyt". Ajoaika: kyselyt 25 rinnakkain; scheduled-funktioilla 540 s, callable nostettu 120 → 300 s. **Ensimmäinen tuotantoajo kannattaa katsoa lokista (kesto, lukumäärä).** Jos lähde 3 osoittautuu raskaaksi, kevennys: rajaa tapahtumat ikkunaan (`pvm` ≤ arvio + 14 pv).

## 4. Rajaukset ja havainnot
* **Alku nollasta:** v2-kentät alkavat kertyä deployn jälkeen; kirjautumis- ja huoltajamittarit täyttyvät vasta uusista käynneistä. Takaisinlaskenta antaa taaksepäin vain päivämääräisille lähteille (1–4 + pikakentät), kirjautumiselle vain uusin arvo.
* v1-koosteet (ei uusia kenttiä) → käyttöaste-osio näyttää "alkaa kertyä seuraavasta koosteesta"; trendi ohittaa v1-dokumentit.
* Pienet joukkueet: <5 pelaajaa → lukumäärä; seuran kokonaisrivi prosenttina.
* Tietosuoja: koosteessa vain `n_*`-lukumääriä (vartija `tmKoosteRikkomukset`); testi varmistaa ettei päivämääriä/ID:itä/kenttänimiä vuoda.
* Admin on vain suomeksi; VP-kortin uudet tekstit (`vpT`) odottavat Geminiä: `docs/i18n/sv_kaannoserae_s11.json` (15 riviä; elävä testi).
* Vanhempi_v2: `huoltajaViimeisinKaynti` ei kirjaudu, jos huoltaja avaa vain linkin (ei sähköpostikirjautumista). Jos tämä on yleinen reitti pilotissa, S1.2: linkkitunniste → kevyt palvelinkirjaus.

## 5. Todennus
Paikallisesti, jokaisen komennon paluuarvo tarkistettu: `npm test`, `functions/ npm test`, `npm run test:rules` (Java 21), `npm run lint`, `scripts/sync_functions_lib.js --tarkista`; tulokset PR:n kuvauksessa. **Käsin-testi (Admin ja VP KPV:llä + nimetty testipelaaja → "Päivitä nyt" näyttää +1) on tekemättä** — vaatii deployn ja tuotantokirjautumisen; tehdään mergen/deployn jälkeen.
