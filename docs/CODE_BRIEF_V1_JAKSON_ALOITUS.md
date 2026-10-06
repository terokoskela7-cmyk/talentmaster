# CODE BRIEF · V1 (= J3) — Jakson aloitus: tukitavoite ehdotuksineen ja kotiharjoitteet samassa tallennuksessa

**Kaista: Tero** (Master_v16 + VP_v25 + `lib/`). PR-kuvauksen 1. rivi "Kaista: Tero".
**Design:** `docs/design/idp-v2/12_jaksologiikka.html` ("Pelaajan jakso: vahvuus ja tukitavoitteet", D18–D20) ja `13_kehitystyopoyta_kentta.html` §3 (askeleet 1–4). Raportoi PR:ssä, mitä kohtaa noudatat.
**Edellytykset:** J1 (#837) ja J2 (#839) mergetty.
**Lippu:** uudet osat näkyvät vain, kun `seurat/{id}.liput.kentta === true` (D25). Ilman lippua nykyinen D-3-modaali pysyy ennallaan.

## Mitä muuttuu
Jaettu modaali `lib/tm_aloita_jakso.js` (#830, käytössä Masterissa ja VP:ssä) saa uuden osion **"Tukitavoite"** nykyisen vapaan "Tukiosan alue + perustelu" -kentän tilalle. Muutos tehdään yhdellä kertaa molempiin sovelluksiin, koska modaali on jaettu.

1. **Ydinvahvuus** ennallaan (taito, pelaajan valinta → "Vahvista jakso").
2. **Tukitavoite (D19, portaittain):**
   - Ylimpänä **yksi ehdotus** `tmTukitavoiteEhdotukset(p, konteksti)`:sta: aluetunniste, nimi, lyhyt lähde (`lyhyt`, esim. "havainnoista (2)") ja muokattava perustelu (`perustelu_ehdotus`). Hyväksyminen on yksi napautus.
   - **"miksi?"** avaa `miksi`-tekstin. Se ei ole näkyvissä oletuksena.
   - **"Muut vaihtoehdot (n)"** avaa loput, enintään 3, sekä **"Kirjoita oma"** (alue-valinta 4:stä + kuvaus + perustelu, lähde `suunnitelma`).
   - Määrä `tmTukitavoiteMaksimi(ikävaihe, seuran profiili)`: Leikkijä 0 (osio piilossa, joukkuejakso riittää), Rakentaja 1, Showcase 1–2.
   - Perustelu kulkee `tmTukitavoite`n KIELLETYT-vartijan läpi (aina myönteinen, D20).
3. **Kotiharjoitteet valitun tukitavoitteen alta:** seuran `harjoitepankki`- ja `ohjelmat`-rivit, joissa `tila == 'hyvaksytty'`, suodatettuna tukitavoitteen alueen ja (fyysisessä) `teema_avain`in mukaan. Ilman seuran sisältöä TM-oletus (`lahde:'tm'`). Snapshot kuten #823 (`tmLiitaTukiosaan`-polku), kenttä `lahde:'seura'|'tm'`.
4. **Kesto ja vastuuhenkilö** ennallaan. **Oletuspäivät = joukkuejakson päivät** (D21), jos joukkueella on aktiivinen jakso (J2); valmentaja voi poiketa.
5. **Tallennus:** edelleen **YKSI update** (`tmAloitaJaksoKirjoitus`). Mukana `jaksofokus.tukitavoitteet` + yhteensopiva `jaksofokus.tukiosa` (`tmTukitavoitteetKirjoitus`) + `jaksofokus.joukkuejakso_viite {jid, alku}`. Ei toista kirjoitusta kotiharjoitteille.

## Adapteri (Master ja VP): konteksti libille
Hae valmiiksi ja anna `konteksti`na. Lib ei tee kyselyitä.
- `tanaan` (`tmPaivaIso`), `joukkuejakso` (J2:n `joukkueet/{jid}`), pelaajan pikakentät (§26).
- `havainnot[]`: ne rakenteiset kentät, jotka J1:ssä todettiin olemassa oleviksi. Vapaata tekstiä ei jäsennetä.
- `arviointikehys`: **`tmKehys(kehysAvain)`** (`konfiguraatio/arviointi` → oletus `palloliitto`). **Älä oleta `arviointikehys/seura`-dokumenttia** (D31 avoin).
- `d3_viimeisin`, seuran prosessiprofiili, jos sellainen on (muuten oletus).
- Rinnakkaiset haut `Promise.all`:lla. Yksittäisen lähteen virhe ei kaada modaalia, vaan lähde jää pois.

## Pelaajalle näkyvä (ei muutoksia Pelaaja_v7:ään tässä PR:ssä)
Pelaaja_v7 lukee edelleen `tukiosa`n, ja yhteensopivuuskirjoitus pitää sen toimivana. "Tämän tueksi" -kortti tukitavoitteista tulee Kenttä K1:ssä.

## Testit
- Lib: ehdotusosio 0/1/2 tukitavoitteella ikävaiheittain, "Kirjoita oma", KIELLETYT-hylkäys, kirjoitusolio sisältää sekä `tukitavoitteet` että `tukiosa`, joukkuejakson oletuspäivät, lippu pois → vanha lomake täsmälleen ennallaan (snapshot-testi).
- Rules: ei muutosta odotettavissa (pelaajadokin `jaksofokus`-kenttä). Jos tarvitaan, pysähdy ja raportoi.
- KPV U13: valmentajana JA VP:nä (Master ja VP_v25), myös Topias (PHV LAH: ei nopeusehdotusta testistä).
- Mobiili 390 px. Koko sarja (unit + functions + characterization), `?v=`-bumpit.

## Ei tässä
Kaksi reittiä ja kentälle raahaus (Kenttä K3), joukkuekenttä/taktiikkataulu ja alue → harjoite (V2, design 14 D29), Pelaaja_v7:n "Tämän tueksi" (K1), viikkopohjat ja kuorma (14).
