# CODE_BRIEF · 22 · Kehitystyöpöytä (Tänään · Polku · Näyttö): käytettävyys · 9.10.2026

**Kenelle:** Code-sessio. Lue tämä kokonaan ennen ensimmäistäkään muutosta. Kaksi erillistä PR-sarjaa: **A = korjauskierros ennen 1.11.** (ei designmuutoksia, ei uusia kenttiä) ja **B = uudistus R1:ssä (joulukuu)**. Älä sekoita niitä samaan PR:ään.
**Kaista:** molemmat Teron kaistaa (`*.html`, Rules). PR-kuvaukseen "kaista: Tero".
**Design SSOT tälle työlle:** `docs/design/idp-v2/22_kehitystyopoyta_kayttettavyys.html` (numero 22 vahvistettu, PM 9.10.) + `docs/22_TULKINTASAANNOT.md` + kuvapaketti `docs/design/idp-v2/kuvat/22_*.png` (54 kuvaa: 4 tilaa × 3 välilehteä × 1280/390 × tumma/vaalea + sunnuntai, Pelaajan silmin, sheetit). Mockupissa on tilavalitsin (Normaali · Vähän dataa · Jakso ei alkanut · Katselmusvaihe), rooli (VP · oto), päivä (arki · su) ja "Pelaajan silmin". Jokaisessa UI-PR:ssä raportoidaan, mitä mockupin osiota ja tilaa toteutus noudattaa. Ristiriita tai aukko → kysy, älä keksi.
**Taustadokumentit:** `docs/22_KEHITYSTYOPOYTA_ANALYYSI.md` (inventaario rivinumeroin), `docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md` (V4a/V4b, ennallaan), 18, 13, 01, 07.

## Säännöt, jotka koskevat kaikkea tässä
- VP-periaate: VP näkee ja tekee kaiken, minkä valmentaja (poikkeukset CLAUDE.md §4). Jokainen toiminto testataan sekä valmentajalla että VP:llä, vain nimetyillä KPV-testipelaajilla (§10; tarkista nimi, älä luota joukkueeseen).
- PHV vain `tmPhvTila`/`tmPhvKoodi` (`lib/tm_phv_tila.js`). Suora `p.phv_tila`-luku on virhe.
- Taso lasketaan testihetken iästä (`normiIka`), ei nykyiästä (§14). Datan ikä näytetään jokaisessa luvussa.
- Pelaajalle ja huoltajalle ei mitään tästä (§7.22). Sanasto D54: "ydinvahvuus", ei "ase". KIELLETYT-portti ajetaan kaikille lauseille, jotka voivat päätyä pelaajalle (katselmuslause, viikkohavainnon lause).
- Uudet tekstit avaimina (`tm_vp_i18n.js` ja Masterin vastaava); sv jätetään tyhjäksi, Gemini kääntää. Ei ruotsia Codelta.
- Renderöinti `lib/`-moduuleihin, kuoret pienenevät (VP_v25 vapaana ~437 riviä, Master ~225). Ei uusia tokeneita tai fontteja (Kenttä-komponentin Archivo on jo olemassa).
- Rules-muutos = versio + changelog + Rules-testi, deploy CI:llä.
- **Mockupin §- ja D-viitteet ovat suunnittelumerkintöjä, eivät käyttöliittymätekstiä** (esim. "(§28)", "(D100)"). Niitä ei kopioida käyttäjälle näkyviin teksteihin (sama periaate kuin A12).
- **Järjestys (PM 9.10.):** A ennen S2:ta, koska molemmat koskevat VP_v25:tä. Ensin oikeellisuus (A1–A6), sitten käytettävyys (A7–A13). A6:ssa `p.phv_tila`-lukuja on VP_v25:ssä 40 ja Masterissa 13 (listattu vain osa); portti kattaa kaikki, kirjoituskohdat (jos niitä on) erotellaan raportissa.

---

## A · Korjauskierros ennen 1.11. (ei designmuutoksia)

Yksi PR per kohta tai looginen nippu. Jokaiseen testi. Rivinumerot: VP_v25 main `fff6d6e`.

**A1 · Sitoumus: yksi sääntö (D97).** Uusi `lib/tm_sitoumus.js`: `tmSitoumus(p) → {sitoutunut, vahvistettu, annettu_pvm, vahvistettu_pvm}`. *Sitoutunut* = `idp_sitoumus_pvm ≥ jaksofokus.alkoi − 1 pv`. *Vahvistettu* = sitoutunut **ja** `idp_sitoumus_vahv_jakso === jaksofokus.alkoi`. Käyttäjät: `tm_aloita_jakso.js:66` (tilasiru/signaali), VP `_ktKysymyksetHTML` 11082 ja `tm_polun_tila.js:25`, `tm_seuraava_askel.js:39–43/122`, Master 6728. `_vpVahvistaSitoumus` (VP 7421–7441) **estää** vahvistuksen, jos `p._idpSitoumus.jakso_alkoi !== jaksofokus.alkoi` (toast: "Sitoumus on edelliseltä jaksolta"). Masteriin sama vahvistuspolku (nyt puuttuu). Tila `vahvistettu` tarkoittaa jatkossa "V1 vahvistettu, pelaajan sitoumus puuttuu" (18 §2 täsmennys). Testit: vanha sitoumus + uusi jakso → ei "Mukana"; `tests/v4_kasitesti_korjaukset.test.js` laajennus.

**A2 · `_jspVaihda` V4:ssä.** Polun CTA:t (14091–14095 "Aloita jakso (Polku) →", "avaa Kehitys →", "Avaa katselmus →"), viikkorivin 🩹 (14295) ja Näytön lohko 20 (`_vpMittausNextStepHTML` 15459) kutsuvat `_jspVaihda(n)`, joka V4:ssä piilottaa Polun tai Mittaukset-osion. Korvaa `_ktValilehti('polku'|'naytto')`-kutsulla, kun `liput.kentta`; lohko 20 poistetaan (kovakoodattu, §28-ristiriita).

**A3 · Viikko V4:ssä.** `_ktNayta` ei kutsu `_vpViikkoLataa` → "⋯ ladataan tallennettuja kirjauksia" ikuisesti (14146) ja `_vpViikkoInit` nollaa tilan jokaisessa `_ktPaivita`ssa. Kutsu lataus Polkua avattaessa; älä nollaa tilaa uudelleenrenderissä. (Viikon siirto joukkueelle on B5, ei tässä.)

**A4 · Mittauslista roolit.** `_vpRenderMittausLista` 15031 kutsuu `_vpVoiMuokata()` ilman pelaajaa → valmentaja aina lukutilassa. Anna `p`. `_vpMittausPaivitaNakyma` 15142 → `_ktAvaaIdx` 11055 avaa 'tanaan' → säilytä nykyinen välilehti.

**A5 · D3 "Arvioi (VP)".** `_tallennaVpD3` 16268: roolitarkistus; valmentajan arvio ei saa kirjoittaa `pisteet[dim].vp`. Valmentaja kirjoittaa `pisteet[dim].valmentaja` (tai nappi piiloon).

**A6 · PHV `p.phv_tila` → `tmPhvTila`.** VP 11009, 14340, 15569, 15615, 15664, 15935, 14709, 15407, 15447, 15476, 5807 ja Master 6636. Portti: testi, joka greppaa `p.phv_tila` suorat luvut renderöintikoodista (sallittu lista tyhjä).

**A7 · Datan ikä (§14).** `_vpMittausTuoreusHTML` 15364 näyttää vain tuoreimman pvm:n → pvm jokaiselle ryhmälle (H-H, TKI, FLEI, ADAR, kypsyys). `tmKypsyys` pvm muotoon pp.kk.vvvv; f4:n TK-pvm:t (15972–15973) muotoiltuina; tmKypsyys-tyhjätilan CTA saa `onCta`:n.

**A8 · "Pelaajan silmin".** `kt-hk`-luokka (tm_kehitystyopoyta.js:68) kaikkiin lukuihin ja signaalin lukuihin, myös Näytössä. Testi: silmin-tilassa DOM:ssa ei yhtään `.kt-hk`-ulkopuolista numeroa kysymyskorteissa.

**A9 · Kuollut koodi ja toisto.** Kehyksen oma Seuraava askel -kortti (`askel:null` VP 10984 / M 6598) pois; vanha "5D ja tilanne (siirtyy…)" (8566) pois; **Polun tila -kortti pois (D99)**, tilasiru riittää; Polun Seuraava askel -laatikko (7890) pois V4:ssä (toisto Tänään-signaalin kanssa); Pelaajan ääni -lohko (8132) ja viikkorefleksio (14403) pois V4:stä, kunnes kirjoituspolku on (D105).

**A10 · Kausitavoitteen luku (D104).** `_vpKtAlariviHTML` 7860: jos `lahto.arvo == null` ja `arviot` tyhjä → ei "tavoite 2/5" vaan "tavoite taso {tavoitearvo} · lähtötaso katselmuksessa". `tm_idp.js:202` oletus `taso+1` ei saa näkyä lukuna.

**A11 · Kysymykset lähteineen (D103, kevyt muoto).** `tmKtKysymyksetHTML` (tm_kehitystyopoyta.js:124–139): alarivi = lähde + pvm. Q1 "viikkohavaintosi {pvm}" / "katselmus {pvm}" / "ei vielä havaintoa · merkitse viikkohavainto". Q2: hae jakson `viikkokatsaukset` (≤ 6 dok., Tänään-avauksessa; 18 §6 sallii) → "{n}/{vk} viikkoa · pelaajan viikkokatsaus su {pvm}"; sunnuntai & vastaamatta → "Tulee tänään"; ei yhtään → "pelaaja vastaa sunnuntaina". Q3 (sitoumus) → **rivi** signaalikortin alle; kortiksi vain tilassa sitoutunut-ei-vahvistettu ("Sitoutui {pvm} · vahvista" + nappi). Kaksi korttia, ei kolmea.

**A12 · Kehittäjäkieli pois käyttäjätekstistä.** "§35 K2" (14390, 14399), "(EPPP-rytmi, §37)" (14423), "lahde:pelaaja" (14438), murupolku `kausi › jakso › eteneminen` (8013), "ottelupäivä-suhteinen · fokus jaettuna…" (14109). Avaimet säilyvät, tekstit siistitään; sv tyhjäksi.

**A13 · Viikkohavainto inline (D100, kevyt muoto).** Signaalikortin nappi "Merkitse havainto" ei vaihda välilehteä. V4:ssä se avaa saman osa-arvion kirjoituksen kuin Polun "Merkitse viikon havainto" (kirjoittaa `jaksofokus.osa_arviot[konsepti_avain]`), kolme vaihtoehtoa inline (Ei vielä · Ohjatusti · Itsenäisesti), lause ja VEO-linkki valinnaisina. Tallennuksen jälkeen `_ktPaivita` (Tänään + Polku), välilehti ei vaihdu. Sheet-komponentti (B2) ei ole tässä: riittää inline-rivi kortissa.

**A-testit yhteensä (vähintään):** A1 ×3 · A2 ×1 (CTA ei piilota osioita) · A4 ×2 (valmentaja muokkaa omaa, ei toisen joukkueen) · A5 ×1 · A6 portti · A7 ×1 · A8 ×1 · A10 ×1 · A11 ×3 · A13 ×2 (VP ja valmentaja kirjoittavat, pelaaja ei).

---

## B · Uudistus R1 (joulukuu, VP_v25:n jaon yhteydessä)

**B1 · Datamalli (D98, lukittu 9.10.).** Pelaajadokumenttiin:
- `ydinvahvuus.alue: {x, y, w, h}` (kentän koordinaatisto 0–100 × 0–140, `tm_kentta.js`), `ydinvahvuus.asetti_uid`, `ydinvahvuus.asetettu_pvm`.
- `jaksofokus.reitti: {loppu: 'maali'|'kaveri'|'kausitavoite'}` (kiinteät päätepisteet, ei vapaata piirtoa; `tm_kentta.js` LOPPU).
- Osien koordinaatit: `jaksofokus.osat[i].x/y` (valinnainen; oletus = alueen ympärillä tasavälein) ja tila `jaksofokus.osa_arviot` → `tmKentta`-spec `osat[].tila`.
- Historia: `jaksofokus_historia[i].reitti.loppu` (kirjoitetaan sulkemisessa).
- Rules (seuraava vapaa versio): `ydinvahvuus.alue` kirjoitus SA/VP/UTJ/joukkueen valmentaja; pelaaja ja huoltaja vain luku. Enum-validointi `reitti.loppu`. Pelaajan K3-valinta ei kirjoita aluetta.
- Adapteri `lib/tm_kentta_spec.js`: `tmKenttaSpec(p, {rooli}) → spec` (pure, testattava: alue → ase, jakso → reitti, `tmTanaanTila` → viikot, osa_arviot → osat, historia). Sama adapteri VP:lle, Masterille ja Pelaaja_v7:lle ("yhtenäistetään"). `ilmanAluetta` poistuu henkilökunnan Tänään-välilehdeltä; ilman aluetta renderöidään jaksokortti + CTA "Aseta ydinvahvuus kentälle → Polku", ei tyhjää kenttää. Testi `tests/v4a_kehitystyopoyta.test.js:148` päivitetään.
- **Kenttä on valintapinta (D107, Tero 9.10.):** Polussa valmentaja tai VP **napauttaa kentän aluetta** → sheet "Jakson tavoitteet tälle alueelle" → valinta esitäyttää Aloita jakso -sheetin ja tallentaa alueen. Tänään-välilehdellä Kenttä on vain luku. Ihminen päättää: mitään ei tallennu ilman valintaa.
  - **Vyöhykejako pelimuodon mukaan:** 5v5 = 2 × 3 (puoliskot × laita 0–25 / keski 25–75 / laita 75–100), 8v8 = 3 × 3 (kolmannekset × sama kaistajako), 11v11 = 3 × 5 (= `phVyohyke`, `lib/tm_pelihavainto.js`, kaistarajat 25/40/60/75). **Pelimuoto on joukkueen asetus** `joukkueet/{jid}.pelimuodot: ['11v11','8v8']` (lista, ensimmäinen = oletus): sama joukkue voi pelata kahta (Tero 9.10.: 13-vuotiaat pelaavat sekä 8v8 että 11v11). Kun listassa on kaksi, kentän yläpuolella on vaihtokytkin. Ilman asetusta oletus iästä: ≤ 9 v [5v5], 10–12 v [8v8], 13 v [11v11, 8v8], 14+ v [11v11]. Asettaja: VP, UTJ, joukkueen valmentaja (Rules: kenttä `pelimuodot` enum-listana). Pelaajan alue ei riipu valitusta pelimuodosta. Karkeat jaot ovat hienojaon yhdistelmiä; **alue tallennetaan aina hienojaon koordinaatteina** (`ydinvahvuus.alue {x,y,w,h}` 0–100 × 0–140), joten se säilyy pelimuodon vaihtuessa. Pelihavainnot luokitellaan valittuun jakoon raakakoordinaateista (`len`, `wid`). Osumapinnat ≥ 44 px (390).
  - **Ehdotusten järjestys:** 1) **seuran linja** (`valmennuslinja`/`harjoitepankki`, alueelle merkityt); 2) "Muut vaihtoehdot" (konseptikaanon) napin takana — näytetään suoraan, jos seura ei ole tuonut linjaa tai linjassa ei ole tavoitetta alueelle; 3) **"+ Lisää oma tavoite"**: nimi, osat a/b/c (valinnainen), domeeni; KIELLETYT-tarkistus; VP/UTJ voi valita "Tallenna myös seuran linjaan tälle alueelle" (kirjoittaa `harjoitepankki`, `tila:'luonnos'`, alue-tagi) — linja kasvaa käytöstä.
  - **Suodattimet ja miksi-rivi:** ydinvahvuus (nykyinen alue), kausitavoite, pelihavainnot (määrä + viimeisin pvm), seuran linjan teema ja viikot. PRE/LAH/tuntematon → ei fyysisiä (§28); PH → fyysiset merkinnällä "kuorma rajattu §25"; 5v5 (Leikkijä) → leikkinimet, ei osien tasoja, ei K3:a.
  - Ehdotusfunktio `tmJaksoEhdotukset(p, alue, {pelimuoto, linja, kaanon, havainnot, phv}) → [{konsepti, domeeni, lahde:'linja'|'kaanon'|'oma', miksi[], osat[], loppu}]` puhtaana lib-funktiona; ruudukko `tmKenttaRuudukko(pelimuoto)`.
  - Mockup: osio 2b, kuvat `22_08`–`22_14` (11v11, muut vaihtoehdot, 8v8, 5v5, ei linjaa, oma tavoite, oma valittu).

**B2 · Sheet-komponentti (D100).** `lib/tm_sheet.js`: alasheet 390 px:llä, dialogi työpöydällä. Käyttäjät: kevyt katselmus (3 kysymystä + lause + K3, sama kuin `tm_kevyt_katselmus.js`), Aloita jakso (`tm_aloita_jakso` modaali → sheet), Vahvista jakso. Mockup osio 5.

**B3 · Tänään (mockup osio 1).** Järjestys: otsikkorivi (D46) · signaalikortti (D48; inline-napit A13) · Kenttä adapterista (B1) · kaksi kysymyskorttia + sitoumusrivi (A11) · Osat tiloineen (`osa_arviot`) · "Valmentajalta uusin" (`viestit`, viimeisin klippi tai lause, 1 dokumentti). Mobiili < 720 px: signaali ennen Kenttää (`order`), arkisin 0 lukua, su 1. "Pelaajan silmin" piilottaa kaikki luvut.

**B4 · Polku (mockup osio 2).** Yksi jana: **Kausi** (kausitavoite + omin sanoin; lähtötaso vain mitattuna) → **Jakso nyt** (ainoa paikka konseptin nimelle otsikkona; osat tiloineen; klipit jakson sisällä `viestit` pelaajaId-kyselyllä; toiminnot: Merkitse viikkohavainto · ⋯ Lisää klippi · Muokkaa jaksoa · Siirrä ydinvahvuutta kentällä · Sulje jakso) → **Tämä viikko (luku)** → **Historia** (suljetut jaksot + kevyen katselmuksen lause + trendi "↗ a/b osaa itsenäisesti"). Pois: Pelaajan ääni, Seuraava askel -laatikko, Kehityssuunnitelma-haitari sellaisenaan (kausi ja jakso ovat janan kortteja), Tämän viikon fokus, Viikon rakenne (→ B5).

**B5 · Viikko joukkueelle (D101).** Viikon rakenne (7 pv, Täytä viikko, kuorma, läsnäolo, tavoitejakauma) siirtyy joukkueen viikkoon (design 14). Pelaajan Polku näyttää tämän pelaajan viikon **lukuna**: joukkueen harjoitukset (kalenteri `joukkue`/`pelaajat_id`), omatoimi (`kirjaukset`, D95 `kenen_kanssa`), viikkokatsaus su, ottelu; linkki "Avaa joukkueen viikko". Kunnes 14 on toteutettu: pelkkä kalenterin tapahtumat lukuna. Kuormalaskenta (ACWR) siirtyy 14:ään, `p.phv_tila`-luku korjataan samalla (A6).

**B6 · Näyttö (mockup osio 3 + 3b, D102).** `lib/tm_todistekortit.js`: `tmTodistekortit(p, ctx) → [{avain, otsikko, lause, ika, luvut[], trendi, toiminto, fokus}]`, lauseet `docs/22_TULKINTASAANNOT.md`:n sääntöjen mukaan (pure, testattava; PHV kerran `tmPhvTila`; taso testihetken iästä; datan ikä → toiminto). Järjestys: Profiili (5D-tutka henkilökunnalle, akseliluku + pvm) · Kasvu ja kypsyys · Fyysinen · Tekninen · Peli (ADAR + arviointi + D3) · Kehon valmius. **Fokuskortti** = jakson domeeniin liittyvä (teknis_taktinen → Tekninen; fyysinen → Fyysinen), työpöydällä korostettu, mobiilissa (< 720 px) haitari: fokuskortti auki, muut `<details>` yhden rivin yhteenvetona. **≥ 3 tyhjää korttia → yksi "Mittauskierros puuttuu"**. "Näytä kaikki mittaukset" = nykyiset lohkot 10–21 ja 26–32 (`_vpKorttiRakenna` vainOsat) avattavan taakse, pvm ja lähde joka rivillä. VP ja Master samasta moduulista (D106). Oletusnäkymä ≤ 30 lukua (testi laskee `.nums .v`).

**B7 · Oma sivu (D106).** Kehitystyöpöytä omaksi kevyeksi sivuksi `TalentMaster_Kehitystyopoyta.html` (App Check pakollinen §38, SW allowlist), johon VP_v25 ja Master linkittävät `#pelaaja/{pid}/tanaan`. Kuoret pienenevät. Tero päättää ajoituksen R1:n sisällä.

**B-testit:** adapteri (geometria: alue → ase, reitti päätepiste, viikkomerkit n/tehty) · todistekortit (7 testiä TULKINTASAANNOT §Testit) · Rules (alue-kirjoitus roolit, pelaaja ei kirjoita; enum) · mobiili 390 (otsikko + signaali + nappi ilman vieritystä; ei vaakavieritystä; arkisin 0 lukua) · lukumäärä ≤ 30 · "Pelaajan silmin" 0 lukua · VP ja valmentaja molemmat (nimetyt testipelaajat).

---

## Ei tässä
Pelaaja_v7:n ja Vanhemman näkymät (oma kierros; adapteri B1 jaetaan niille myöhemmin) · Seuran pulssi · joukkueen viikko 14 (oma briiffi; B5 vain siirtää vastuun) · uudet tokenit/fontit · sv-tekstit · massasyöttö joukkuelistasta (taustalla, 14/Pulssi) · videon upotus tai autoplay (R6.4: linkki vain).

## Avoimet päätökset (Tero / PM) ennen B:tä
- D97–D106 lukitus (07).
- B7:n ajoitus ja sivun nimi.
- D107: vyöhykejako pelimuodon mukaan, pelimuoto joukkueen asetuksena (voi olla kaksi), järjestys linja → kaanon → oma vahvistettu (Tero 9.10.).
