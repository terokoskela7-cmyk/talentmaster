# CODE BRIEF · S2b — Valmentajan sovellus (mockup 28, audit 27) · Master_v16 · valmis ennen 1.12.2026

**Kaista: Tero** (Master_v16, `lib/`, Rules). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Päivitetty 10.10.2026:** korvaa saman tiedoston aiemman version (pelkkä mockup 26 §2). Valmentajan sovellus tehdään nyt kokonaisuutena mockupin 28 mukaan.
**Miksi (audit 27):** valmentajat kirjautuvat, pelaajat eivät (467 pelaajasta 4 aktiivista 30 päivässä). Nykyinen Master rakentuu pelaajadatan varaan, joten näkymät ovat tyhjiä tai punaisia. Lisäksi kolme eri viikkonumeroa (42 / 40, oikea 41), kolme navigaatiota ja kolmen vuoden takainen mittaus nykytasona.
**Periaate (mockup 28): harjoitus ensin, data perässä.** Valmentajan omat toiminnot (läsnäolo, havainto, harjoitusarvio, jakso) toimivat jo nyt ja ovat ensimmäisinä. Pelaajadata näkyy, kun pelaajat ovat sovelluksessa.
**Design (SSOT):** `docs/design/idp-v2/28_valmentajan_sovellus.html` (näkymä, periaatteet, D137–D142) + `27_valmentaja_audit.html` (§3 luvut, §4 näkymät, §5 siirtokartta, §6 järjestys) + 26 §2 (kuittausdialogi D129). Komponentit `lib/tm_kt_komponentit.js`. **`CODE_BRIEF_S2_KOTI.md`:n osio "Design — tarkka toteutus" pätee sellaisenaan** (samat komponentit, olemassa olevat tokenit, Cormorant + DM Sans + DM Mono, tekstit sanatarkasti mockupista, tumma + vaalea, **390 px ensisijainen** + 1280, kuvavertailu `docs/design/idp-v2/kuvat/28_s2b_*`, PR-taulukko mockupin kohta → toteutus → poikkeamat).
**Järjestys:** S2 PR 2 → S2c → **S2b (neljä PR:ää alla, yksi kerrallaan tuoreen mainin päältä)**.
**Kenttä-lippu:** uusi rakenne vain lippuseuroille; ilman lippua Master ennallaan (snapshot-testi). P0-korjaukset (PR 0) koskevat kaikkia.

## PR 0 — auditin 27 P0-luvut (kaikille seuroille)
1. **D140 yksi viikkonumero:** ISO 8601 -funktio jaettuun libiin (yleistä `tm_kayttoaste.js`:n `tmIsoViikko` omaksi `lib/tm_viikko.js`:ksi tai vastaavaksi). Masterin `_getVk` ja kalenterin `weekNum` poistetaan ja korvataan; sama VP_v25:ssä, Pelaaja_v7:ssä ja Vanhempi_v2:ssa. Vartija: ei omia viikkokaavoja sovelluksissa. Testi vuodenvaihteessa (vk 53/1) ja kolmella aikavyöhykkeellä.
2. **Avoin testi yhdellä määritelmällä** (Tänään vs. Testit-sivu): sama lähde ja funktio.
3. **Profiilikortti seuraa joukkuevalitsinta** (nyt "SJK P14", vaikka valittu KPV P13).
4. **Kausi: "Joukkuedokumenttia ei ole — luo joukkue ensin"** vaikka joukkueessa on pelaajia: korjaa haku (`tmPelaajanJoukkueet`, §7.18) tai selitä tila oikein.
5. **Kattavuusportti D125** Kausi-lukuihin ja RAE:hen (`tm_koti_luvut.kattavuus`): "Kehittynyt 100 %" viidestä pelaajasta 16:sta → "5/16 mitattu kahdesti".
6. **D141 mittauksen ikä:** jokaisessa mittauksessa päivämäärä; yli 12 kk vanha ei tasona eikä värillä ("mitattu 2023 · päivitä"). Koskee Kehitystä, Kautta ja pelaajakorttia.
7. Päivämäärät suomalaisessa muodossa (Kuorma "09-20" → "20.9.").

## PR 1 — navigaatio ja joukkuevalitsin (D137, D138)
- **Yksi navigaatio:** Tänään · Joukkue · Viestit · Kalenteri · Lisää. Sivupalkkina työpöydällä, alapalkkina mobiilissa. Välilehtirivi 01–07 ja 14 kohdan sivupalkki poistuvat.
- **Lisää-valikko:** Testit · Havainnot · Taktiikkataulu · Arvioi harjoitus (nyt "Itsearvio", yhtenäinen nimi VP:n kanssa) · Valmentajana kehittyminen · Asetukset.
- **Vanhat näkymät ohjataan** uusiin paikkoihin auditin 27 §5 siirtokartan mukaan; vanhat URL-parametrit ja syvälinkit eivät rikkoudu (vartijatesti).
- **Joukkuevalitsin otsikossa** (D138): omat joukkueet ja omat ryhmät (`lib/tm_ryhmat.js`, D136). Valinta ohjaa kaikkia näkymiä ja profiilitietoja. Jos valmentajalla on vain ryhmä, se on oletus. Valinta muistetaan (localStorage try/catch).

## PR 2 — Tänään (D142, D139, Koti + Tänään yhdeksi)
Järjestys mockupin 28 `tanaan()`-näkymän mukaan:
1. **Käyttöönottonauha** (D139, vain kun < 50 % pelaajista kirjautunut): "Sovelluksessa x/y pelaajaa · perheiden suostumus x/y" + **Jaa PIN-koodit** (olemassa oleva PIN-jakotoiminto) · **Muistuta perheitä** (olemassa oleva suostumusmuistutus; jos ei ole valmentajalle, raportoi).
2. **Lead:** "Pe 9.10. · …" + "Harjoitus tänään 17.30." + "N asiaa avoinna."
3. **Harjoituskortti** (ankkuri): seuraava harjoitus kalenterista (aika, paikka), jakson teema ja Kenttä (`tm_kentta`, alue ja reitti jakson datasta, D98), **Läsnäolo**-nappi (olemassa oleva läsnäolokirjaus), "Avaa harjoitus", alarivillä "Harjoituksen jälkeen: Kirjaa havainto · Arvioi harjoitus". Ryhmällä: seuraava ryhmän tapahtuma, ei jaksoa.
4. **Pikatoiminnot:** + Havainto · + Arvioi harjoitus · + Muistiinpano (muistiinpano vasta R1:ssä Asioiden mukana; S2b:ssä nappi piilossa).
5. **Asiat** (`.vl`-rivilista, enintään 3 + "Palaa myöhemmin N →"): lähteet signaali (`kooste_joukkue`), VP:n viesti (`viestit`), jakso (`tm_tanaan_signaali.js`), käyttöönottovaiheessa käyttöönotto (suostumus puuttuu). Rivillä yksi täytetty nappi + **Kuittaa…** → kuittausdialogi D129 (26 §2): Hoidettu · Palaan päivänä · Palaan kun (katsaus / testipäivä / katselmukset) · Ei koske + syy. Sävy valmentajalle "kun ehdit", ei myöhästymispäiviä eikä punaista.
6. **Poistuu Tänäänistä:** vanha Koti (tervehdys, profiilikortti, "Mitä sinun pitää tehdä"), "Nämä kolme tänään", Pulssi-ruudukko ja Kuorma & fiilis (ne siirtyvät Joukkue · Viikkoon D139-portin taakse), "Aloita tästä" muuttuu Tänään-näkymän oppaaksi, kunnes valmis.

**Kuittauksen tallennus = sama dokumentti kuin VP:llä** (S2 PR 2): `seurat/{s}/toimenpiteet/pulssi_{lähde}_{tunniste}` laajennettuna kentillä `tila: 'avoin'|'sovittu'|'hoidettu'|'ei_koske'`, `palaa: { tyyppi: 'pvm'|'ehto', pvm, ehto }`, `ei_koske_syy`, `omistaja: { rooli, uid }`, `historia: [{ tila, kuka, aika ISO }]`. **VP:n Koti noudattaa D128:aa:** valmentajan "sovittu" ei näy VP:n Tarvitsee huomiota -listassa ennen paluupäivää. **Rules (seuraava versio):** valmentaja luo ja päivittää `toimenpiteet`-dokumentin vain, kun `tyyppi == 'pulssi'` ja `joukkue in valmentajanJoukkueet(seuraId)`, kentät rajattu yllä oleviin. Rules-testit: oma joukkue ✓, toinen ✗, muu tyyppi ✗, VP ennallaan ✓. Kentät on valittu niin, että siirto Asia-kokoelmaan R1:ssä on suora.

## PR 3 — Joukkue (Viikko · Kausi)
- **Viikko:** joukkuejakso isolla kentällä (`tm_kentta`) + teema, viikko ja katselmusikkuna; luvut Läsnäolo 4 vk · Havainnoitu tällä jaksolla x/y · (D139-portin jälkeen) Viikkokatsaus ja Kotitehtävät 7 pv tavoitteineen. Pelaajalista: läsnä viimeksi · havainto · sovelluksessa (käyttöönotto) tai merkinnät 7 pv. **Nimi avaa pelaajakortin = kehitystyöpöytä 22** (olemassa oleva V4-näkymä). Nykyiset Pulssi ja Kuorma & fiilis tänne D139-portin taakse; ennen porttia "näkyy kun ≥ N/y sovelluksessa".
- **Kausi:** "Mitattu x/y tällä kaudella" + seuraava testijakso; tasot vain kattavuusrajan yli (D125); RAE kattavuusportilla; jokaisessa luvussa otos ja ikä (D141); joukkuejakso aikajanana.
- **Ryhmä** (D136): sama näkymä; Viikko näyttää tapahtumat, läsnäolon ja jäsenet (jäsenen jakso omassa joukkueessa), Kausi jäsenten mittaukset. Ei pulssia, ei jaksoa.

## Ei tässä (R1, tammikuu)
Asia-kokoelma, ketju ja eskalaatio (D127–D130) · oma muistiinpano · tauot ja kalenterin kerrokset (D131) · Viestit-näkymän uudistus Asia-ketjuiksi (S2b:ssä Viestit-kohta avaa nykyisen 01 Viestit -näkymän, jossa pelaajan merkintöjen kuittaus ja "Viestitä perheelle" säilyvät).

## Rajat
- Ei `functions/`-muutoksia. Rules vain PR 2:n toimenpiteet-laajennus.
- §7.22 ei koske henkilökunnan näkymää, mutta pelaajalistaa ei lajitella "huonoimmasta" eikä nimetä 0/7-pelaajia punaisella; käyttöönoton tila neutraalisti ("ei vielä").
- Tekstit `masterT`:n kautta, uudet sv-avaimet uuteen Gemini-erään tyhjinä. Nimet yhtenäiset VP:n kanssa.
- Kasvukatto: uudet näkymät `lib/`-moduuleihin (`tm_valmentaja_tanaan.js`, `tm_valmentaja_joukkue.js`), Masteriin vain kytkentä; poistuva koodi pois samoissa PR:issä.
- Testaa KPV:n valmentajatunnuksella (Tero) ja Demo FC:n datalla (kuvat). §0: kirjoitukset vain nimetyille testipelaajille.

## Testit
- PR 0: ISO-viikko (vuodenvaihde, 3 aikavyöhykettä), vartija omia viikkokaavoja vastaan; avoin testi sama luku kahdessa näkymässä; profiilikortti seuraa valitsinta; kattavuusportti; yli 12 kk mittaus ilman tasoa/väriä.
- PR 1: viisi kohtaa + Lisää, vanhat reitit ohjautuvat, valitsin ohjaa kaikkia näkymiä, ryhmä oletuksena kun vain ryhmä.
- PR 2: harjoituskortti seuraavasta tapahtumasta; käyttöönottonauha vain < 50 %; asiat ≤ 3; kuittaus kirjoittaa oikeat kentät; D128 VP:n Kodissa (sandbox); Rules-testit.
- PR 3: D139-portti; pelaajan nimi avaa kehitystyöpöydän; ryhmällä ei pulssia; kattavuus ja ikä Kaudessa.
- Lippu pois → Master ennallaan (snapshot), paitsi PR 0. 390 px ilman vaakavieritystä. Koko sarja oletus-TZ:llä ja `TZ=UTC`:llä, raportoi `Test Files` ja `Tests`.
