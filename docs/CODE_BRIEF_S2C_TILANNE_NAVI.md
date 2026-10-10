# CODE BRIEF · S2c — Tilanne, navigaatio v3 ja Joukkueet ja ryhmät (mockup 25) · valmis ennen 1.12.2026

**Kaista: Tero** (VP_v25, `lib/`). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Miksi:** S2 toteutti mockupin 25 Kodin puolen (#949, #955). Tilanne, navigaatio ja Joukkueet ja ryhmät jäivät. Tilanteessa ovat yhä "Mihin tartut nyt" ja "Kriittiset signaalit", jotka toistavat Kotia (audit 24 §4), ja sivu on noin kuusi näytöllistä. Tero 10.10.: tuodaan ennen 1.12. (käyttö on vielä vähäistä, joten navigaation muutos ei riko tottumuksia).
**Design (SSOT):** `docs/design/idp-v2/25_vp_koti_tilanne.html` (§1 Näkymä, §2 Mobiili, §4 Mitä poistui ja minne, D122–D126, D133–D136) + `24_koti_tilanne_audit.html` §4–§6. Komponentit 22:sta (`lib/tm_kt_komponentit.js`). **`CODE_BRIEF_S2_KOTI.md`:n osio "Design — tarkka toteutus" pätee sellaisenaan:** samat komponentit, olemassa olevat tokenit, fontit, tekstit sanatarkasti mockupista, molemmat teemat, 1280 + 390, kuvavertailu (`docs/design/idp-v2/kuvat/25_s2c_*`) ja PR-taulukko mockupin kohta → toteutus → poikkeamat.
**Järjestys:** S2 PR 2:n jälkeen, ennen S2b:tä. Kolme PR:ää, yksi kerrallaan tuoreen mainin päältä.
**Kenttä-lippu:** kuten S2. Ilman lippua VP_v25 ennallaan (snapshot-testi).

## PR 1 — Tilanne = kausi (D123, D121)
Järjestys ylhäältä, enintään kolme näytöllistä 1280 px:llä:
1. **Neljä tilannekorttia** (`.tk`, mockup 25 `kpi`): Jaksolla (x/y joukkuetta) · Katselmukset ajallaan (kausi) · Mitattu tällä kaudella (x/y joukkuetta + seuraava testijakso) · IDP odottaa. Kattavuusportti D125 (`tm_koti_luvut.kattavuus`).
2. **Kauden aikajana** (D43, mockup 25 §1 aikajana): joukkueiden jaksot viikkoina, ◆ katselmus, "nyt"-merkki, jaksopalaveri- ja testijaksomerkit. Mobiilissa aikajana vierii omassa laatikossaan, sivu ei. Data: koosteen `kooste_joukkue`-historia + joukkueiden jaksot.
3. **Jaksopalaveri** (uusi lohko): seuraava jaksopalaveri kalenterista, "x/y joukkuetta valmiina" (jakso päättynyt ja katselmukset tehty) ja esityslista: päättyneet jaksot + katselmuslauseet, ehdotukset (kohta 6) ja poikkeamat. **Raportointi-työtilan sisältö siirtyy tänne** (D135). Ei uusia kokoelmia: palaveri on kalenteritapahtuma (`tyyppi: 'jaksopalaveri'`, olemassa oleva tyyppi).
4. **Poikkeamat joukkueittain** (audit 24 §4 03): yksi rivi per joukkue ja osa-alue, ei neljää riviä samasta asiasta. Kypsyysvahti (`tm_koti_luvut.poikkeamaPortti`), alaraja-merkintä, datan ikä jokaisella rivillä, testisyklin asiat "odottaa testiä 12.2." (D118).
5. **Mittaustilanne** (D120, #955): seurarivi "13/15 mittaus yli 6 kk" + yksi nappi; joukkuekortit tiivistettynä. Tyhjä D1 = "ei mitattu", ei palkkia. Selitä tai poista yläindeksi ¹.
6. **Ehdotukset** (D124, D134): enintään 5, "TalentMaster ehdottaa, sinä päätät" säilyy (audit: paras lohko). Ehdotukset ovat suunnitelmia, eivät signaaleja; "tekniikka alle normin" yhdellä määritelmällä (audit 24 §2: D2-normi vs TKI-raja → valitse D2-normi ja nimeä TKI-raja erikseen "TKI alle 40").
7. **Talentit ja syntymäkvartaalit:** talentit + Hidden Gem -ehdokkaat (§28-portti, `hiddenGemPortti`), tyhjät sarakkeet piiloon; RAE kattavuusportilla (#955 siirsi sen tänne).

**Poistetaan Tilanteesta:** "Mihin tartut nyt" (kaksoiskappale Kodin kanssa), "Kriittiset signaalit" -lohkon signaalit (ne ovat Kodissa; "Onnistumiset" jaksopalaverin esityslistaan), erillinen "IDP-hyväksyntäjono" kun tyhjä, tervehdys "Hyvää iltaa, …" + perusteeton pääotsikko (tilalle tulkintalause kattavuudella). Poistuvan koodin pois samassa PR:ssä (kasvukatto R0).
**Seuranta- ja Jaksofokus-työtilat sulautuvat Tilanteeseen** (D135): niiden sisältö kohtiin 2–4; työtilat jäävät URL-tasolla toimimaan ohjauksena Tilanteen ankkuriin (syvälinkit eivät rikkoudu).

## PR 2 — Navigaatio v3 (D135)
- **Sivupalkki 1280 px:** Päivittäin **Koti · Viestit · Kalenteri · Tilanne** · Porautuminen **Joukkueet ja ryhmät · Valmentajat** · **Työkalut** (suljettu ryhmä): Testit · Pelihavainto · Bio-banding · Taktiikkataulu · Ohjelmakirjasto · Asetukset alhaalla.
- **Poistuvat kohdat:** Pelaajat (pelaajahaku yläpalkissa ⌘K + Joukkueet ja ryhmät → joukkue → pelaaja), Ryhmät (→ Joukkueet ja ryhmät), Raportointi (→ Tilanne · Jaksopalaveri), Seuranta ja Jaksofokus (→ Tilanne), Aloita tästä (→ Koti, opas), Arvioi harjoitus (→ Kodin pikatoiminto). **Vanhat `setWs`-avaimet ja URL-parametrit ohjataan uusiin paikkoihin** (syvälinkit, oppaat ja sähköpostilinkit eivät rikkoudu); vartijatesti listaa kaikki vanhat avaimet.
- **Kodin pikatoiminnot** (mockup 25): Arvioi harjoitus · Kirjaa mentorointi · Uusi tapahtuma, Kodin oikeassa palstassa Tänään-lohkon yllä.
- **Mobiilin alapalkki:** Koti · Viestit · Kalenteri · Tilanne · Joukkueet (nyt: Koti · Joukkueet · Valmentajat · Raportit · Testit).
- **Viestit v0** (ennen Asiat-kokoelmaa, R1): lista VP:n henkilökuntaviesteistä (`viestit`, Rules v3.39: VP lähettäjänä tai vastaanottajana), uusin ensin, lukematon-merkki, avaa nykyisen viestiketjun ja vastausmodaalin. Ei Asia-kytköstä, ei suodattimia Avoimet/Sovitut (R1). Laskuri navigaatiossa = lukemattomat.
- **Murupolku** seuraa uutta rakennetta (P0-korjaus säilyy).
- **Tilanne harvalla datalla (mockup 29, D143–D146, Tero 10.10.).** KPV:n oikealla datalla Tilanne listasi 16 joukkuetta tekstinä ja aikajanalla oli 16 tyhjää riviä. Korjataan samassa PR:ssä (SSOT `docs/design/idp-v2/29_tilanne_harva_data.html`, kuvat `kuvat/29_*`):
  - **Tyhjät joukkueet (0 pelaajaa) pois** kaikista Tilanteen luvuista, nauhasta ja aikajanalta (esim. KPV T8, U8). Ne näkyvät vain Joukkueet ja ryhmät -sivulla merkinnällä "ei pelaajia". Nimittäjä = joukkueet, joilla on pelaajia (jäsenyys `tmPelaajanJoukkueet`, §7.18).
  - **Joukkuenauha (D143)** jaettuna komponenttina `lib/tm_kt_komponentit.js`:ään: segmentti per joukkue ikäjärjestyksessä; täytetty teal = jakso käynnissä ja katselmukset ajallaan, amber-ääriviiva = jakso kesken / katselmus odottaa, katkoviiva = ei jaksoa. Tila myös muodolla, ei vain värillä; segmentin `title` + `aria-label` = joukkueen tunniste ja tila. Käytetään Jaksolla-kortissa ("N ilman jaksoa · näytä") ja jaksopalaverissa. Ei uusia tokeneita.
  - **Ryhmittely ja tiivistys (D144):** jaksopalaverissa tilat ryhminä Valmiina · Kesken · Ei jaksoa lyhyillä tunnisteilla (P13, T14); yli 6 → kuusi ensimmäistä + "+N", klikkaus avaa ryhmän. Sama sääntö kaikkiin Tilanteen "kesken"-listoihin. Ei pitkiä lauseita joukkuenimistä.
  - **Aikajanan kooste-kaista (D145):** omat rivit vain joukkueille, joilla on jakso; jaksottomat yhdellä vinoviivoitetulla kaistalla "Ei jaksoa · N joukkuetta" (tunnisteet klikattavina, "Aloita jaksot →"). Kun jaksoja ei ole yhtään, kaista on ainoa rivi. Mobiilissa kaista on oma korttinsa aikajanan alla.
  - **Tyhjä tila = toiminto (D146):** kun alle puolella joukkueista on jakso, jaksopalaverin otsikko on "Jaksot puuttuvat N joukkueelta." ja päätoiminto "Aloita jaksot N joukkueelle" avaa olemassa olevan joukkoaloituksen (J4) valmiiksi rajattuna jaksottomiin joukkueisiin; toissijainen "Avaa esityslista". Muuten päätoiminto "Avaa esityslista". Ei uutta kirjoituspolkua.
  - Testit: tyhjä joukkue ei nimittäjässä; nauhan tilat (3) ja ikäjärjestys; ryhmä > 6 → "+N"; aikajana 1/15 → 1 rivi + kaista, 15/15 → ei kaistaa; D146-kynnys (7/15 vs 8/15); 390 px ilman vaakavieritystä. Kuvavertailu mockupin kolmea tilaa vasten (Pilotti 1/15 · Kasvu 6/15 · Kypsä 15/15).
- Valmentajan näkymään (Master) ei muutoksia tässä; S2b hoitaa sen.

## PR 3 — Joukkueet ja ryhmät (D136)
- Yksi sivu: joukkueet ikäjärjestyksessä (sama rivi kuin pulssissa: nimi, ikävaihe, pelaajamäärä, kilpa/harraste, ammatti/oto, valmentaja) ja niiden alla **ryhmät** (`lib/tm_ryhmat.js`: nimi, jäsenmäärä, joukkueet joista jäsenet tulevat).
- Joukkue ja ryhmä avautuvat samaan tiiminäkymään (Viikko · Kausi, D121). Ryhmällä ei ole pulssia eikä jaksoa (§7.18, D136): ryhmän näkymä näyttää jäsenet, ryhmän kalenterin ja jäsenten omat jaksot.
- Joukkueen asetukset (tyyppi, valmentajaprofiili, D50/D70) avautuvat riviltä.
- Pelaajat-työtilan toiminnot (haku, suodatus, tuonti, siirto joukkueeseen `tmJasenyysPaivitys`) siirtyvät tämän sivun alle välilehdeksi "Pelaajat", jotta mikään toiminto ei katoa.

## Rajat
- Ei `functions/`- eikä Rules-muutoksia (Viestit v0 lukee olemassa olevaa). Jos Rules estää jotain, raportoi ennen kiertotietä.
- Ei pelaajanimiä Tilanteen seuratason lohkoissa (§7.22); poikkeamat ja talentit kuten nyt (henkilökunta).
- Tekstit `vpT`:n kautta, uudet sv-avaimet uuteen Gemini-erään tyhjinä.
- Kasvukatto: VP_v25 ei kasva yli katon; uudet lohkot `lib/`-moduuleihin (`tm_vp_tilanne.js`, `tm_vp_navi.js`), VP:hen vain kytkentä.
- Testaa KPV:n VP-tunnuksella (Tero) ja Demo FC:n datalla (kuvat).

## Testit
- Tilanne: järjestys D123, kattavuusportti korteissa, poikkeamat joukkueittain, kypsyysvahti, ehdotukset ≤ 5, ei "Mihin tartut nyt" -lohkoa (vartija).
- Navigaatio: vanhat `setWs`-avaimet ja URL:t ohjautuvat (taulukkotesti), sivupalkissa 6 + Työkalut, mobiilin alapalkki 5, murupolku.
- Viestit v0: vain VP:n henkilökuntaviestit, lukematon-laskuri.
- Joukkueet ja ryhmät: ryhmä ei näy pulssissa, ryhmä avautuu tiiminäkymään, Pelaajat-välilehden toiminnot toimivat.
- Lippu pois → ennallaan (snapshot). 390 px ilman vaakavieritystä. Koko sarja oletus-TZ:llä ja `TZ=UTC`:llä, raportoi `Test Files` ja `Tests`.
