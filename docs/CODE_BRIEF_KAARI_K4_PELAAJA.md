# Kehityskaari K4 — Pelaaja §7.22 -variantti: Kehon valmius + alusta-vartija · Code-brief

> **Kehityskaari-ketjun VIIMEINEN pala.** Recon (main, K1–K3 + K5a/b jälkeen) vahvisti tilanteen:
> `tmKaariRenderPelaaja(p, ctx)` **on jo olemassa ja kytketty** — `TalentMaster_Pelaaja_v7.html` `rMinaKehityskaari()`
> (~2585) renderöi sen Minä-välilehden runkoon (~2699). §7.22 hoidettu: näyttää **vain parannukset** (positiivinen verbi +
> sparkline, EI kovia lukuja/normia/kuormaa), §28-kannustava neutraali kun ei vielä parannusta, honest-empty ≥2-vartijalla.
> **K5a lisäsi jo ADAR-pelaajahaaran** (`_adarBlokki`, "Peliäly kehittyy 🧠", vain positiivinen suunta) — **älä koske siihen.**
> → **Kahden aukon täyttö jää, molemmat lib `tmKaariRenderPelaaja`:ssa (VP_v25:tä ei kosketa):**
> **(A) FLEI → "Kehon valmius"** §7.22-variantti — K1a lykkäsi tämän eksplisiittisesti K4:ään (`tmKaariRenderFull` näyttää
>     "Kehon valmius · FLEI", pelaaja EI näytä mitään; testi `idp_libs_k1a_flei_kaari.test.js:49` lukitsee tämän nyky­tilan).
> **(B) §22 alusta-vartija** — pelaaja-render laskee parannukset koko sekava-alusta-sarjasta → nurmi→halli voi tuottaa
>     valheellisen "30 m nopeutui 📈". VP-render (`_testiRivi`, ~225–236) segmentoi jo viimeisen alustan sisään; pelaaja EI.
> **Malli (K1–K3-kuri):** string-helperit lib-`tmKaariRenderPelaaja`:n sisällä (kuten `_adarBlokki`), **EI DOM-`tmKehityskaari(el)`**.
> **Reuse yli reimplementoinnin.** Ei `?v`-bumppia paitsi jos vaaditaan lataus (tm_kehityskaari.js on jo `?v=3` pelaajassa).

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** **Älä koske:** K5a `_adarBlokki`-haaraan (pelaaja) · `tmKaariRenderFull`:iin (VP) · `tmKaariFleiBlokki`:iin (VP-versio, näyttää luvut+amber — EI §7.22-turvallinen, älä kutsu sitä pelaajapinnassa) · §34-kaksideltaan · konsensukseen · `_testiRivi`-renderiin ellei (B) extract-and-share (ks. alla, ilmoita ENNEN).
- **§7.22:** pelaajalle EI kuormaa/ACWR/tasolukuja/normivertailua/arvioijia/sijoituksia — **vain oma positiivinen suunta.** **§28:** pre-PHV / ei-vielä-parannusta = kannustava neutraali, EI "huononit". **Ei punaista/amberia pelaajan kaareen** (VP-FLEI-amber ei kuulu tänne).

## MUUTOS A — FLEI → "Kehon valmius" pelaaja-variantti (§7.22)
Lisää `tmKaariRenderPelaaja`:aan **oma positiivinen-vain FLEI-projektio** (ÄLÄ kutsu `tmKaariFleiBlokki`:ia — se näyttää `55→62 (n mitt.)` + amber-alas, mikä rikkoo §7.22:n). Uusi pieni string-helper esim. `_fleiPelaajaRivi(p)`:
- Lue `p.flei_historia` (kenttä `.flei`, **suurempi parempi**) samalla parsinnalla kuin `tmKaariFleiBlokki` (reuse logiikka, ei numeroita ulos).
- **≥2 pistettä JA viimeinen > ensimmäinen** (eli parani) → tuota **yksi positiivinen rivi** samalla ilmeellä kuin fyysiset parannukset:
  - 📈 + **konkreettinen kannustava fraasi** (ei "FLEI"-jargonia, ei lukuja) + `_sparkline(sarja, 72, 18)` (muoto, ei akseleita/arvoja).
  - **Fraasi — ilmoita ENNEN valinta** (Teron ohje: konkreettiset sanat): suositus **"Jaksat ja palaudut paremmin"** tai **"Kehon valmius parani"**. Otsikkosana pelaajapinnassa = **"Kehon valmius"**, EI "FLEI".
- **< 2 pistettä TAI ei paranemista** → **`''`** (ei riviä; §28-kannustava neutraali-linja hoitaa "jatka treenaamista" jo rungossa). **Ei "kehon valmius laski".**
- **Sijoitus:** liitä samaan `parannukset`-listaan TAI omana rivinä juuri sen jälkeen (ennen `_adarBlokki`:ia), niin että "Kehityit! 🎉"-otsikko kattaa senkin. **Huom:** jos ainoa "kehitys" on FLEI (ei hh/tki-parannuksia), varmista että lohko silti näkyy positiivisena eikä putoa "rakentumassa"-neutraaliin. **Ilmoita ENNEN** kumpi kytkentä (suositus: FLEI-rivi mukaan parannus-laskentaan niin että `parannukset.length`-portti huomioi sen).

## MUUTOS B — §22 alusta-vartija pelaaja-kaareen
Pelaaja-render laskee parannukset per avain `tmKaariSuunta(k, tmKaariSarja(hh,k))` **koko sarjasta** — alustaherkillä avaimilla (`ALUSTAHERKAT`: lin5m/lin10m/lin30m/kasirata/sm_juoksu/sm_pallo/mas/pujottelu/syotto) sekava nurmi+halli → **valheellinen parannus**. Korjaa niin että pelaaja näkee parannuksen **vain saman alustan sisällä** (sama §22-periaate kuin VP `_testiRivi` ~225–236):
- Alustaherkälle avaimelle: kun sarjassa ≥2 **eksplisiittistä eri** alustaa → segmentoi **viimeisimmän alustan pisteisiin** (sama suodatus kuin `_testiRivi`: pidä `alusta==null || alusta===viimAlusta`), laske suunta vasta siitä. **Kaikki-null (vanha data) → nykykäytös** (ei regressiota). CMJ ei ole alustaherkkä → ennallaan.
- **Ei alusta-merkkiä/varoitusta pelaajapinnalle** (§7.22: ei "eri alusta ⚠" -metatietoa lapselle) — vartija toimii **hiljaa**: jos segmentointi poistaa ainoan "parannuksen", rivi vain jää pois (kannustava neutraali hoitaa lopun). VP saa §22-merkin (ennallaan), pelaaja ei.
- **Reuse — ilmoita ENNEN:** (a) **extract**: nosta `_testiRivi`:n segmentointi pieneen sisäiseen helperiin (esim. `_alustaViimSegmentti(avain, sarja) → sarja`) ja kutsu sitä **sekä** `_testiRivi`:ssä että pelaaja-renderissä (yksi lähde, VP-käytös bittiä myöten ennallaan) — **VAI** (b) **inline** sama 4-rivinen filter pelaaja-renderiin (ei kosketa `_testiRivi`:ä). **Suositus: (a)** yksi lähde §22:lle; jos (a) muuttaa `_testiRivi`:n ulostuloa edes kosmeettisesti → ilmoita ENNEN. Jos epävarma → (b).

## INVARIANTIT + DoD
- **§7.22 ehjä:** pelaajalle vain positiivinen suunta — Kehon valmius (parani) + fyysiset/tekniset parannukset + K5a peliäly. **Ei lukuja, ei normia, ei kuormaa, ei alusta-varoitusta, ei amberia/punaista.**
- **§22 aito:** alustaherkkä parannus vain saman alustan sisällä; sekava sarja → ei valheellista "nopeutui"; vanha null-data → nykykäytös.
- **§28:** ei-vielä-parannusta = kannustava neutraali (ennallaan). **FLEI-laskua ei näytetä** pelaajalle.
- **Ei regressiota:** K5a `_adarBlokki` (pelaaja) · `tmKaariRenderFull` (VP, ml. "Kehon valmius · FLEI") · `_testiRivi` §22-merkki · §34 · honest-empty ≥2 — kaikki ennallaan. `idp_libs_k1a_flei_kaari.test.js:49` (pelaaja EI sisällä "Kehon valmius · FLEI" -stringiä) **pysyy vihreänä** → pelaaja-fraasi EI saa olla "Kehon valmius · FLEI" (käytä "Kehon valmius"/"Jaksat ja palaudut paremmin" ilman "· FLEI").
- **Brändi:** teal-aksentti, 0 pinkkiä, molemmat teemat. Reuse `_sparkline`/`tmKaariSuunta`/`ALUSTAHERKAT`.
- **LIVE ennen valmista (molemmat teemat, pelaaja-app Minä-välilehti):**
  - Pelaaja jolla ≥2 nousevaa FLEI-pistettä → "Kehon valmius / Jaksat paremmin 📈" + sparkline (ei lukuja). Laskeva/1 piste → ei riviä.
  - Alustaherkkä sarja jossa nurmi→halli "parani" vain alustan takia → parannusta EI väitetä (segmentointi pudottaa sen); saman alustan aito parannus → näkyy. Vanha null-alusta-data → nykykäytös.
  - Adar-only-pelaaja (K5a) → "Peliäly kehittyy 🧠" ennallaan. Ei-dataa → honest-empty "täyttyy kun ≥2 mittausta 🌱".
  - Vitest (ml. K1a §7.22-testi) + eslint vihreä.

## EI TÄSSÄ
- VP-pinnat (K1–K3, K5b) — valmiit.
- Alustan **normalisointikaava** (`_alustaNormi`-stub) — kun Tero toimittaa; K4 vain segmentoi (ei normalisoi), stub ennallaan.
- **Kehityskaari-ketju valmis K4:n jälkeen** (K1 · K2 · K3 · K4 · K5a · K5b).
