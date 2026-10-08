# CODE BRIEF · sv-läpiajo — kaikki käyttäjän näkemä suomi ruotsiksi (Sibbo 1.11.2026)

**Kaista: Tero** (sovellus-HTML, `lib/`). PR-kuvauksen ensimmäinen rivi on "Kaista: Tero".
**Tausta:** Tero ajoi käsitestin 8.10.2026 #892:n jälkeen. Kirjastojen tekstit kääntyvät, mutta iso osa näkymistä on edelleen suomeksi. Syy on se, minkä KARTOITUS.md §8 jätti mittaamatta: **reitittämätön, kovakoodattu suomi**. Se ei kulje `t()`/`vpT()`/`masterT()`-funktioiden kautta, joten mikään kartta tai portti ei näe sitä.
**Tavoite:** Sibbo-Vargarnan pelaajat, huoltajat ja henkilökunta näkevät 1.11. kaiken käyttöliittymätekstin ruotsiksi. Seuran oma data (tapahtumien nimet, seuran valmennuslinja ja harjoitepankki) pysyy sillä kielellä, jolla se on kirjoitettu (D16).
**Säännöt:** Code kirjoittaa vain fi:n ja reitityksen. Ruotsinkieliset tekstit tulevat **yhtenä Gemini-eränä** samassa muodossa kuin `docs/i18n/sv_kaannoserae_2026-10-08.json`. Älä kirjoita sv-arvoja itse.

## Teron löydökset 8.10. (lähtökohta, ei koko lista)

| Näkymä | Mitä näkyi suomeksi | Todennäköinen syy |
|---|---|---|
| Pelaaja | kielivalinta ei löytynyt | Valinta on Minä → ⚙️ Asetukset (suljettu ryhmä). Sibbon pelaaja saa sv:n seuran kielestä automaattisesti. **Ei bugi**, mutta Minä-ryhmien otsikot ("Kotiharjoitteet", "Asetukset", "Taidot & keho"…) ovat kovakoodattua suomea. |
| Vanhempi | kalenteri-ilmoitus "Harjoitus – nopeus klo 17" | Selvitä: onko "Harjoitus" tapahtumatyypin tunniste (→ käännetään) vai valmentajan kirjoittama nimi (→ data, ei käännetä). "klo" on käyttöliittymätekstiä. |
| Master | TalentMasterin konseptit, cue-kysymykset, konseptipeli | Curriculumin sv on valmis (`lib/tm_teknistaktiset_sv.js`, 1261/1261) ja kytketty **VP:hen** (`_ttSv`), mutta **ei Masteriin**. Kytke samalla tavalla. |
| Master | KPV:n valmennuslinja | Seuran oma data (D16): ei käännetä. Sibbo tuo oman linjansa ruotsiksi. |
| Master | tekniikkakisat | kovakoodattu |
| Master / VP | "ALOITA JAKSO" | `lib/tm_aloita_jakso.js` `tmJaksoTila`: noin 12 kovakoodattua `teksti: '…'` -literaalia (Aloita jakso, Vahvista jakso, Hylkää valinta, Valinta odottaa, Ei jaksoa…). Reititä kirjaston FI-kartan kautta, kuten muissa kirjastoissa. |
| Master | Säsong / träningsplan: "aktivointi", "70 % vahvuus · 30 % kohdennettu", harjoitteet | Otsikot ja jakotekstit → reititys. Harjoitteiden nimet ja ohjeet: generaattorin harjoitteet `HARJOITE_I18N.sv`:n kautta (osittain olemassa, mittaa puutteet). KPV:n oma harjoitepankki on dataa (89 harjoitetta, ei käännetä). |
| Master | valmentajan oma arviointi (valmentajana kehittyminen) | kovakoodattu |
| VP | Testit: Kirjaa kentällä, Pikakirjaus, Excel-pohja | kovakoodattu. Myös Excel-pohjan sarakeotsikot (ks. alla). |
| VP | harjoitettavuusarviointi | kovakoodattu |
| VP | "spelobservation" väärässä kohdassa | Selvitä: jokin otsikko on käännetty termillä Spelobservation, vaikka fi-teksti tarkoittaa muuta (Tero: "tämän varmistaminen"). Raportoi rivi ja konteksti, korjaus Gemini-erässä. |
| VP | kalenteri | ✅ kunnossa |

## Tapa: mitataan ensin, sitten yksi erä

Löydöksiä ei korjata yksitellen. Rakenna ajonaikainen läpiajo, joka näkee saman kuin käyttäjä.

1. **`tools/i18n/sv_lapiajo.mjs`** (Playwright, headless Chromium, valmiiksi asennettu).
   - Avaa jokaisen sovelluksen ja näkymän **sv-tilassa** (`localStorage.tm_kieli = 'sv'`) demo- tai fixtuuridatalla. **Ei tuotantoa eikä oikeita pelaajia.** Käytä olemassa olevaa chrome-tests-asetelmaa.
   - Käy läpi välilehdet ja avattavat ryhmät.
   - Kerää DOM:n näkyvät tekstisolmut, `placeholder`-, `title`- ja `aria-label`-arvot sekä toastit ja modaalit, jotka saa avattua ilman kirjoitusta.
   - Tunnistaa suomen heuristiikalla: ä/ö-sanat ilman å:ta + yleiset fi-sanat (ja, ei, tai, on, jakso, pelaaja, valmentaja, harjoitus, tallenna, klo…). Väärät osumat poistetaan sallitulla listalla: nimet, seuran data ja lyhenteet.
   - Tulostaa `docs/i18n/sv_lapiajo_tulos.json`: näkymä · teksti · DOM-polku · lähde, eli tiedosto ja rivi, jos se löytyy grepillä.
   - **Näkymät:** Pelaaja (Tänään, Polku, Näyttö, Minä + ryhmät, kalenteri), Vanhempi (koti, kalenteri, klippi), Master (Tänään, joukkue, kehitystyöpöytä V4, curriculum, kausi/träningsplan, testit, tekniikkakisat, oma arviointi), VP (etusivu, ryhmät, kalenteri, testit, harjoitettavuus, pelaajakortti), Seura (rosteri, käyttäjät).
2. **Raportoi luvut ennen korjauksia:** montako tekstiä per näkymä ja kuinka moni on dataa (D16) ja kuinka moni käyttöliittymää. Tero ja PM päättävät rajauksen, jos määrä on suuri.
3. **Reititys:**
   - Käyttöliittymäteksti `vpT`/`masterT`/`T()`/kirjaston FI-kartta -reitille.
   - Uudet avaimet `tm_lib_i18n.js`:n, `tm_vp_i18n.js`:n, `tm_master_i18n.js`:n ja `tm_lang.js`:n odotuslistoille. Kaikki näkyvät kielivahdissa.
   - Curriculum Masteriin samalla sidecar-tavalla kuin VP:ssä.
   - **Kuorten kasvukatto (R0) on voimassa.** Reitityksen pitäisi pikemminkin lyhentää koodia. Jos katto tulee vastaan, siirrä renderöinti `lib/`-moduuliin, älä nosta kattoa.
4. **Gemini-erä:** yksi JSON samassa muodossa kuin 8.10. erä (osiot, konteksti, termistö mukaan) → `docs/i18n/sv_kaannoserae_2.json`. Mukaan myös #892:n jäännökset:
   - `ts_otsikko`
   - Klubb/Klubben → Förening -rivit
   - "Kehityskaari (kausifokus)"
   - VP×Master: 110 eri tavoin käännettyä riviä yhtenäistettäväksi (Gemini valitsee yhden muodon)
5. **Portti:** läpiajo CI:hin raporttina. Ensimmäisessä vaiheessa se ei kaada buildia, vaan baseline-tiedostosta vain **uudet** suomenkieliset tekstit kaatavat (KARTOITUS §9 kohta 3b). Sen jälkeen uusi kovakoodattu suomi ei pääse enää huomaamatta mainiin.

## Otteluhavainnointi ja ADAR (lisäys 8.10., Tero) — eivät ole käännetty lainkaan

PM tarkisti koodista 8.10.:

| Kohde | Tila | Tehtävä |
|---|---|---|
| `TalentMaster_ADAR_Pikakortti.html` | **ei sv-reittiä lainkaan.** Kaikki tekstit ovat jo yhdessä rakenteessa `PH_TEKSTIT` (kysymys, tasokuvaukset 1–3, vinkit, valinnat; kommentti "i18n = vaihe 3; sv EI tässä"). Sovellus ei lataa `tm_lang`ia. | Siirrä `PH_TEKSTIT` FI-kartaksi (avain = polku, esim. `adar_A_q`, `adar_A_d1`) → `tm_lib_i18n.js`-reitti. Lataa `tm_lang.js` + `tm_lib_i18n.js`. Kieli seuran kielestä (`tmKieliInitSeura`). Bundler-template (§7.10): tarkista, ettei rakennemuutos riko bundleria. |
| `lib/tm_pelialy_yksilo.js` `TM_ADAR_NIMET` | nimikanoni vain fi (valmentaja / pelaaja: Havainnointi, Päätös/Päätöksenteko, Toteutus, Palautuminen) | Reititä kirjastokartan kautta. **Nimet näkyvät myös pelaajalle ja huoltajalle** (pelaajan rekisteri), joten ne ovat perheiden näkymää ja kuuluvat prioriteettiin 1. |
| `lib/tm_adar_rubriikki.js`, `lib/tm_pelihavainto.js`, `lib/tm_havainto_kaavio.js` | ei sv-reittiä | FI-kartta + `opts.t` kuten muissa kirjastoissa |
| `lib/tm_pelihavainto_valinta.js`, `lib/tm_havaintohistoria.js` | fi-avaimet valmiina ("sv Gemini-erän kautta") | vain kartan rivit erään |
| `TalentMaster_Pelihavainto_Kentta.html` (kohdennettu pelihavainto) | vain portti ja otsikot `data-i18n`:llä (18); havainnoinnin sisältö kovakoodattua | reititys |
| Master: Ottelutarkkailut | otsikko käännetty, sisältö mitattava | läpiajoon |

- **Valmentajan kirjoittama narratiivi on dataa**, ei käännetä.
- ADAR-terminologia termistöön ennen Gemini-erää: `Havainnointi · Päätös / Päätöksenteko · Toteutus · Palautuminen`, sekä "pelihavainto", "otteluhavainnointi" ja "ottelutarkkailu". Nykyinen sv-kartta käyttää muotoa *Matchobservationer* ja *Spelobservation*. Gemini päättää yhden linjan, ja termistö lukitaan.
- Läpiajon näkymälistaan: ADAR Pikakortti (kaikki 4 ulottuvuutta, tasot 1–3 auki), Pelihavainto_Kentta, Masterin Ottelutarkkailut, pelaajan ja huoltajan havaintonäkymä.

## Excel-pohjat

Testien Excel-pohja ja pelaajarekisteripohja ladataan seuralle. Sarakeotsikot ovat tuonnin avaimia (§7.19, `etsiSarake startsWith`), joten **älä käännä niitä suoraan**. Selvitä vaihtoehdot ja raportoi:
- Pohjaan sv-ohjerivi tai -välilehti, ja otsikot pysyvät fi:nä.
- Tuonti hyväksyy sekä fi- että sv-otsikot (alias-taulu).

Tero päättää.

## Testit

- Läpiajo itse: fixtuurinäkymässä tunnettu kovakoodattu fi löytyy, ja sallittu nimi ei aiheuta osumaa.
- Reititetyt tekstit: sv-tilassa resolvi-portit vihreinä. Uudet avaimet ovat odotuslistalla, kunnes Gemini-erä on viety.
- `tmJaksoTila`: palauttaa avaimet ja tekstit `opts.t`:n kautta. Nykyinen fi-käytös ennallaan (characterization).
- Koko sarja, myös `functions/`.

## Järjestys ja aikataulu

1. Läpiajo ja luvut (PR 1, raportti), heti.
2. Reititys näkymäryhmittäin (PR 2–n). **Ensin se, minkä perheet näkevät** (Pelaaja, Vanhempi), sitten Master (jakso, curriculum, tekniikkakisat), sitten VP.
3. Gemini-erä 2 viimeistään **20.10.**, jotta vienti ja Teron käsitesti ehtivät ennen 1.11.

## Ei tässä

- Seuran oma data: tapahtumien nimet, valmennuslinja, harjoitepankki, joukkueiden nimet (D16).
- en-kieli.
- Sähköpostipohjat (oma erä).
