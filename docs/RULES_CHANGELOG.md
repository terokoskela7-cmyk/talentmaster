# Firestore Rules — vanhat changelog-lohkot

Lähde: `tm_admin/firestore.rules`-tiedoston alun "Muutokset vX → vY" -lohkot **v3.79 → v3.80 ja sitä vanhemmat** (aina v2.1.0 → v3.0 asti), siirretty sanatarkasti (kommenttimerkit `//` säilytetty, sisältöä ei muutettu).
Tiedostoon jäi viittausrivi tähän dokumenttiin ja viimeisimmät lohkot (v3.80 → v3.81 alkaen). Siirto ei koske sääntökoodia: `tests/rules_changelog_siirto.test.js` varmistaa, että lohkot ovat tässä sanatarkasti ja että kommentit poistamalla tiedosto on identtinen siirtoa edeltävän kanssa.
Uudet lohkot kirjoitetaan edelleen `firestore.rules`-tiedoston alkuun; kun katto lähestyy, vanhimmat siirretään tänne erillisellä PR:llä.

```
// Muutokset v3.79 → v3.80 (B9b, PM 3.11.2026 B9 päätös 4, KIRISTÄÄ; v3.79 = PR 2e): perutun suostumuksen pelaajalle (suostumusTila 'peruttu' tai suostumus.peruttu, sama ehto kuin lib/tm_suostumus.js)
//   EI uusia dokumentteja mihinkään pelaajat/{pid}/<alikokoelma>-polkuun — kaikilta, myös SA:lta (palvelin/admin-SDK ohittaa). eiUuttaPerutulle() koskee vain create-metodia: olemassa olevan päivitys/poisto ja luku ennallaan.
//   Pelaajadokumentin get() on sama luku kuin joukkuetarkistuksissa (ei lisäkustannusta niissä); puuttuva pelaajadokumentti ei estä (tuonnin batch).
//   Sama luontiesto seuratason testitapahtumat/{tid}/tulokset/{pelaajaId}:lle (PM 6.11.); PalloID-avaimiset tulosrivit (Testituonti_Master) estää sovellus.
// Muutokset v3.78 → v3.79 (Vaihe 1 · PR 2e, KIRISTÄÄ — siivous (scripts/siivoa_sisainen_vanhat.js) ajettu 5.11.2026, merge aikaisintaan ≥ 24 h siitä; PR 2d kirjoittaa A-kentät vain sisainen/tiedot:iin): pelaajadokumentin create hylkää
//   A-avaimet (pelaajaAAvaimet = lib/tm_sisainen.js tmSisainenAKentat ilman terveyttä) ja jaettujen kenttien A-osat (jaksofokus.<A>, talenttisignaali, havainto_porras_ehdotus.hist, biologinenIka_viimeisin muu kuin B-muoto) KAIKILTA, myös SA:lta;
//   update hylkää niiden lisäyksen ja muutoksen, poisto sallitaan (kuten terveys v3.73). jaksofokus_historia-rivien A-osat eivät kuulu tähän (R8). idp/{id} suljettu kokonaan (ei elävää käyttäjää; huoltajan luku pois).
// Muutokset v3.77 → v3.78 (D1 lippujen hallinta, Tero 5.11.2026, KIRISTÄÄ): käyttöönottoliput kirjoittaa VAIN SA — seurat/{id}/liput/{lippuId} create/update/delete
//   onSuperAdmin(); seura-dokin vanha liput-kenttä pois johdon create/update-oikeudesta (kuten laskutus_sopimus). SA:n Admin käyttää callablea asetaSeuranLippu (audit lippu_muutettu).
// Muutokset v3.76 → v3.77 (B10, PM 4b, KIRISTÄÄ): pelaaja EIKÄ huoltaja lue biologinen_ika/{pvm}:ta (maturity_offset = A); B-muoto pelaajadokumentin biologinenIka_viimeisin:ssa (PR 2d), art. 15 = GDPR-vienti. Mikään pelaaja-/huoltajasovellus ei lue alikokoelmaa.
// Muutokset v3.75 → v3.76 (Vaihe 1 · PR 2d, LAAJENTAA kapeasti): testivastaavan sisainen/tiedot-avaimiin `biologinenIka_viimeisin` (Testaus_v9 kasvumittaus kirjoittaa sen samaan batchiin muiden kypsyysavainten kanssa; pelaajalle jää B-muoto) — deploy ENNEN 2d:n klienttejä.
//
// Muutokset v3.74 → v3.75 (PM 3.11.2026, KIRISTÄÄ: yksikään client-polku ei kirjoita kenttää): seurat/{sid}/joukkueet/{jid}.`demo` (bool) mukaan laskutusAvaimet():iin → create/update/poisto VAIN SA.
//   Johto ei aseta luonnissa eikä muuta/poista päivityksessä; valmentajan haara oli jo hasOnly(jakso/pelimuodot). Peruste: demo-joukkue ohittaa laskennan (L1a) ja passiivisen eston (L1c).
//
// Muutokset v3.73 → v3.74 (Laskutus L1c, PM 3.11.2026: KIRISTÄÄ vain sopimusseurassa (laskutus_asetukset/{sid}.laskutettava === true); pilottiseurat ennallaan; SA ennallaan):
//   · seurat/{sid}/joukkueet/{jid}: johto ja valmentaja muuttavat jaksofokus/jaksofokus_historia VAIN, jos joukkue on aktiivinen (laskutustila; puuttuva = passiivinen) tai demo. Johdon luonti jaksolla vain demo-joukkueelle.
//   · seurat/{sid}: `laskutus_sopimus` (bool, UI:n harmaan tilan peili; kirjoittaa scripts/laskutus_alkutila.js) — create/update VAIN SA; johto ei aseta, muuta eikä poista. Muut seuradokumentin kirjoitukset ennallaan.
//
// Muutokset v3.72 → v3.73 (Vaihe 1 · PR 2b, terveys; KIRISTÄÄ — siivous ajettu 3.11.2026 (poista 0, 823/823), PR 2a (#1169) kirjoittaa terveyden vain sisainen/terveys:iin):
//   · seurat/{sid}/pelaajat/{pid}: create hylkää terveysavaimet (kaytettavyys, loukkaantuminen_tyyppi/_alue/_pvm, paluu_arvio) KAIKILTA, myös SA:lta; update hylkää niiden lisäyksen ja muutoksen (addedKeys/changedKeys) — POISTO sallitaan (FieldValue.delete). Siivous = Admin SDK.
//   · sisainen/terveys: FYSIIKKAVALMENTAJA ei enää kirjoita (v3.70:ssa pääsi onOmanJoukkueenValmentaja-polulla, vaikka ei lue). B6: fysioterapeutti kirjoittaa sisainen/terveys:iin ennallaan, pelaajadokumenttiin ei terveyspoikkeusta.
//
// Muutokset v3.71 → v3.72 (Laskutus L1a, PM 2.11.2026: ADDITIIVINEN — uudet kokoelmat + joukkueen laskutuskentät vain SA:lle; ei kiristä nykyisiä kirjoituksia):
//   · seurat/{sid}/joukkueet/{jid}: `laskutustila` ('aktiivinen'|'passiivinen'; puuttuva = passiivinen), `laskutustila_muutettu {pvm, uid}` ja `laskutus_aktivoitu {pvm, uid}`
//     (ENSIMMÄINEN aktivointi, välimallin laskuri) sekä `laskutus_vastuuvalmentaja_ok` (bool, SA:n ohitus: joukkue laskutettava ilman valmentajaroolin käyttäjää) — create/update VAIN SA. Johto ei voi asettaa eikä muuttaa niitä (create: avaimet kielletty; update: affectedKeys ei saa sisältää niitä);
//     valmentajan haara oli jo hasOnly(jakso/pelimuodot). `laskutus_aktivoitu` asetetaan kerran eikä muutu (myös SA; korjaus vain Admin SDK:lla).
//   · UUSI laskutus/{kk}/seurat/{sid}: kuukausisnapshot — luku VAIN SA, kirjoitus EI KENELLEKÄÄN clientista (Cloud Function, Admin SDK).
//   · UUSI laskutus_asetukset/{oletus|sid}: hinnat, laskentaperuste, laskutettava, sopimus_alkaen — luku ja kirjoitus VAIN SA (seuran konfiguraatio on johdon kirjoitettavissa → ei sinne).
//
// Muutokset v3.70 → v3.71 (Vaihe 1 · PR 1f-1 (idp_pelaaja perusta): ADDITIIVINEN — uusi alikokoelma, ei kiristä eikä muuta mitään olemassa olevaa):
//   · UUSI seurat/{sid}/pelaajat/{pid}/idp_pelaaja/{vuosi}: pelaajan §7.22-muotoinen IDP (tavoitteen nimi + sanatila, EI lukuja) + pelaaja_sitoumus. Lukijat: SA | oman seuran johto/valmentaja | pelaaja itse | lapsen huoltaja.
//     Kirjoittajat: kuten idp_kausi (SA | oman seuran valmentaja | johto); pelaaja itse VAIN pelaaja_sitoumus (+ paivitetty), vahvistettu_pvm ei muutu (sama vartija kuin idp_kausi). Delete vain SA.
//   · idp_kausi EI muutu tässä: pelaaja lukee ja kirjoittaa sitä edelleen (P7 lukee sieltä, kunnes lippu käännetään). idp_kausi suljetaan pelaajalta ja pelaaja_sitoumus-kirjoitusoikeus poistetaan
//     VASTA siivouksessa lipun käännön jälkeen (oma Rules-versio) — muuten nykyinen P7 menettäisi tavoitteensa heti mergessä (Rules deployataan CI:llä).
//
// Muutokset v3.69 → v3.70 (Vaihe 1 · PR 1e-1 (viipale S4 perusta + tuoja-korjaus): ADDITIIVINEN — vain LAAJENTAA sisainen/tiedot-kirjoittajia kahdelle kapealle avainjoukolle, ei kiristä mitään):
//   · sisainen/tiedot: TESTIVASTAAVA (oma seura) saa kirjoittaa VAIN kasvumittauksen kypsyys_sisainen-avaimet (kasvutahti_cm_v, kasvutahti_vyohyke, maturity_offset, kehitysvaihe_kaista, kronologinen_ika, phv_raaka, phv_huom, phv_ongelma) + seuraId/paivitetty.
//     Testaus_v9 kirjoittaa nämä pelaajadokumenttiin jo nyt (onTestivastaava) → sama kirjoittaja, uusi koti. Muut S4-ryhmät (adar_sisainen, arviointi, talentti_terveys, signaali, vanhempien pituudet) eivät: testivastaava ei niitä ennenkään kirjoittanut sisainen:iin.
//   · sisainen/tiedot: JOHTO (vp, urheilutoimenjohtaja, seurasihteeri; oma seura) saa kirjoittaa VAIN tuojaUid + seuraId/paivitetty (Seura-sivun pelaajaluonti/Excel-tuonti kirjaa tuojan uid:n; tuoja-sähköposti ei enää pelaajadokumenttiin).
//   · Pelaaja ja huoltaja: ei lue eikä kirjoita (sisainen-blokki ennallaan). Kirjoittajia S4-ryhmille ei vielä kytketä (1e-2 CF, 1e-3 selain; yhteinen lippu RYHMAT.s4.kirjoitus pois).
//   · TERVEYS-DOKUMENTTI (PM 25.10., PR #1137): UUSI `sisainen/terveys` (kaytettavyys, loukkaantuminen_tyyppi/_alue/_pvm, paluu_arvio; GDPR art. 9) — ei `sisainen/tiedot`:iin, jonka lukee koko oman seuran henkilökunta.
//     LUKU: SA | oman seuran vp, urheilutoimenjohtaja, fysioterapeutti, talenttivalmentaja | oman seuran valmentaja, jonka joukkue on pelaajan joukkueet[]:ssä. EI seurasihteeri, testivastaava, fysiikkavalmentaja, pelaaja, huoltaja.
//     KIRJOITUS: SA | onOmanJoukkueenValmentaja (= nykyiset pelaajadokumentin kirjoittajat) | oman seuran fysioterapeutti (PM 25.10.); vain terveys-avaimet + `terveysSeuraId` (== polun {sid}) + paivitetty. Avain on `terveysSeuraId`, EI `seuraId` → tiedot-joukkolataus (where seuraId == sid) ei osu terveys-dokumentteihin.
//     `sisainen/tiedot` EI enää sisällä terveys-avaimia (create/update hylätään kaikilta, myös SA:lta) → terveystieto ei voi päätyä laajemmin luettavaan dokumenttiin.
//     collectionGroup-luku: tiedot-dokumentit kuten ennen (seuraId-claim); terveys-dokumentit vain SA | vp, urheilutoimenjohtaja, fysioterapeutti (where terveysSeuraId == sid). Valmentaja lukee terveyden pelaajakohtaisilla get:illä (joukkuerajaus).
//     Edellyttää indeksiä sisainen.terveysSeuraId (COLLECTION_GROUP; firestore.indexes.json fieldOverrides).
// Muutokset v3.68 → v3.69 (Vaihe 1 · PR 1c-1 (viipale S2, henkilökunnan kenttäryhmä): KIRISTÄÄ vain sisainen/tiedot:n uusia kenttiä, ei kosketa nykyisiä kirjoituksia):
//   · sisainen/tiedot: `scout_potentiaali*`-avaimet vain SA | oman seuran johto (onJohtoRooli) — sama rajaus kuin pelaajadokumentissa (FA-potentiaali); valmentaja, talenttivalmentaja, fysioterapeutti, testivastaava eivät.
//   · sisainen/tiedot: `vastuuhenkilo` vain vastuuhenkiloAsettaja + vastuuhenkiloMuotoKelpaa (poisto sallittu asettajille) — sama ehto kuin pelaajadokumentin vastuuhenkiloMuutosKelpaa (v3.38).
//   · Testivastaava ei kirjoita sisainen:iin (ei ollut ennenkään), fysioterapeutti ennallaan (hasOnly jaksofokus-osat). Kirjoittajia ei vielä kytketä (1c-2/1c-3; lippu RYHMAT.henkilokunta.kirjoitus pois).
// Muutokset v3.67 → v3.68 (Vaihe 1 · PR 1b-1 (viipale S1, jaksofokuksen sisäiset osat): perusta; ADDITIIVINEN — vain laajentaa sisainen/tiedot-kirjoittajia, ei kiristä mitään; Tero tarkistaa, CI deployaa mergestä):
//   · seurat/{sid}/pelaajat/{pid}/sisainen/tiedot: create/update sallitaan lisäksi fysioterapeutille (oma seura), VAIN avaimille jaksofokus_sisainen / historia_sisainen / seuraId / paivitetty
//     (create: keys().hasOnly, update: affectedKeys().hasOnly). Muut kirjoittajat (SA, oman joukkueen valmentaja/johto) ja luku (oma seura) ennallaan. Pelaaja ja huoltaja eivät lue eivätkä kirjoita.
//   · Uudet sisainen-kentät (kirjoittajat kytketään 1b-2/1b-3:ssa): jaksofokus_sisainen {osa_havainnot, osa_havainnot_vk, tavoite_tarkenteet, onnistumiskriteeri, linkitetyt, tavoite_alue, valitavoite_idx, poikkeama, oma_jakso},
//     historia_sisainen {<alkoi>_<konsepti_avain>: {havainnot_vk, arvio_*, arvioija_rooli, kalibraatio_ero, delta_mitattu, d3_snapshot, sitoumus_snapshot}}. jaksofokus.asetti {rooli,pvm} ja .lahde (tyyppi) JÄÄVÄT pelaajadokumenttiin.
// Muutokset v3.66 → v3.67 (Vaihe 1 · PR 2a: D3-aukon sulkeminen; KIRISTÄÄ — poistaa v3.66:n siirtymäajan sallinnan; Tero tarkistaa, CI deployaa mergestä):
//   · seurat/{sid}/pelaajat/{pid}: pelaajan hasOnly-listasta POIS vanhat avaimet d3_viimeisin / d3_taso / d3_pvm / d3_varmuus. Pelaaja (PIN-token) saa kirjoittaa D3:sta VAIN `d3_itsearvio` (validoitu, d3ItsearvioKelpaa).
//     Huoltaja ei kirjoittanut D3:a ennenkään. Henkilökunnan kirjoitukset ennallaan (Master/VP kirjoittavat D3:n nyt vain sisainen/tiedot:iin; lib/tm_sisainen.js).
//   · Pelaajan/huoltajan LUKU: Firestore-luku on dokumenttitasolla → vanhat d3_*-kentät pelaajadokumentissa pysyvät luettavina kunnes siivousskripti (scripts/siivoa_d3_vanhat.js) poistaa ne; uutta D3-dataa niihin ei enää kirjoiteta.
//   · Ei muita muutoksia (staff-kirjoitus, sisainen-blokki, collectionGroup ennallaan).
// Muutokset v3.65 → v3.66 (Tietoturva vaihe 1 · PR 1a + 1d: henkilökunnan sisäiset kentät pois pelaajan luettavasta dokumentista; LUONNOS — Tero tarkistaa ja deployaa; additiivinen, ei migraatiota Rulesissa):
//   · seurat/{sid}/pelaajat/{pid}/sisainen/{doc} (UUSI blokki, doc-id 'tiedot'): luku SA | oman seuran henkilökunta (onOmaSeura, kaikki roolit kuten reviewit); kirjoitus SA | onOmanJoukkueenValmentaja
//     (valmentaja oma joukkue · talenttivalmentaja · VP/UTJ) JA dokumentin `seuraId` == polun {sid}; delete SA. Pelaaja ja huoltaja EIVÄT lue eivätkä kirjoita mitään.
//   · collectionGroup-sääntö /{path=**}/sisainen/{d}: vain LUKU, kun dokumentin `seuraId` == kirjautuneen `seuraId`-claim (tai SA) — mahdollistaa YHDEN kyselyn koko seuralle (where seuraId == sid, ei N+1).
//     Edellyttää indeksiä sisainen.seuraId (COLLECTION_GROUP; firestore.indexes.json fieldOverrides).
//   · seurat/{sid}/pelaajat/{pid}: pelaajan hasOnly-listaan UUSI B-kenttä `d3_itsearvio` { pisteet:{inner_drive|coachability|resilience|focus|emotional_control: 1–5}, pvm (YYYY-MM-DD), jakso_alkoi? } — vain pelaajan OMA itsearvio.
//     ⚠ SIIRTYMÄ: vanhat avaimet d3_viimeisin / d3_taso / d3_pvm / d3_varmuus JÄÄVÄT pelaajalle sallituiksi (vanha Master/Sibbo + välimuistissa olevat vanhat Pelaaja-sivut). Poisto + A-kenttien kielto: PR 2.
// Muutokset v3.64 → v3.65 (K3a · Hylkää valinta, Teron päätös 20.10.2026; additiivinen — uusi kenttä valinnainen, ei migraatiota):
//   · seurat/{sid}/pelaajat/{pid}/reviewit/{pvm}: UUSI valinnainen kenttä `hylkays_sisainen` { teksti (1–200), lahde 'valmentaja'|'vp', uid (string|null), tallennettu (ISO ≤ 40) } — täsmälleen nämä neljä.
//     Hylkää valinta -sheetin perustelu kun "Näytä myös pelaajalle" on pois. Lukijat ja kirjoittajat ennallaan (reviewit: luku/kirjoitus oman seuran henkilökunta + SA; pelaaja ja huoltaja EIVÄT lue).
// Muutokset v3.63 → v3.64 (kehitystyöpöytä 22 · kierros B · B1, D98/D107; additiivinen — uudet kentät valinnaisia, ei migraatiota):
//   · seurat/{sid}/pelaajat/{pid}: `ydinvahvuus.alue` {x,y,w,h} (koordinaatisto 0–100 × 0–140; w,h ≥ 1; x+w ≤ 100, y+h ≤ 140; täsmälleen nämä neljä numeroa). Kun alue muuttuu: muoto validoidaan JA
//     `ydinvahvuus.asetti_uid` == kirjautunut uid JA `ydinvahvuus.asetettu_pvm` (YYYY-MM-DD). Alueen poisto sallittu samoille kirjoittajille. Kirjoittajat = ennallaan koko-dokin update (SA · VP · UTJ · talenttivalmentaja ·
//     joukkueen valmentaja: onOmanJoukkueenValmentaja) JA rooli ∈ onValmentajaRooli tai SA; seurasihteeri, testivastaava, fysioterapeutti, pelaaja ja huoltaja EIVÄT kirjoita aluetta (pelaajan K3-valinta `ydinvahvuus_valinta` pysyy keys().hasOnly(vaihtoehto, valittu_pvm)).
//   · seurat/{sid}/pelaajat/{pid}.jaksofokus.reitti: {loppu} — enum 'maali' | 'kaveri' | 'kausitavoite' (hasOnly 'loppu'); puuttuva reitti sallittu (vanhat jaksot). jaksofokus_historia-alkioiden reitti.loppu: client + testit (lista-alkioita ei voi tarkistaa).
//   · seurat/{sid}/joukkueet/{jid}.pelimuodot: lista 1–3 alkiota ∈ {'5v5','8v8','11v11'} (ensimmäinen = oletus). Asettajat: SA · johto (create/update) · oman joukkueen valmentaja ja talenttivalmentaja (update: hasOnly jaksofokus, jaksofokus_historia, pelimuodot).
// Muutokset v3.62 → v3.63 (klippi ryhmälle + oma videoklippi -varaus, additiivinen §11; ei migraatiota):
//   · viestit tyyppi 'klippi': valinnainen kohde {tyyppi:'ryhma', ryhma_id, nimi} — ryhmän on oltava olemassa omassa seurassa, aktiivinen, nimen on täsmättävä ryhmädokumentin nimeen, ja lähettäjän SA / johto /
//     ryhmän valmentaja (valmentajat[], sis. vastaava vastuu_uid v3.61) / valmentaja-rooli (valmentaja, talenttivalmentaja, fysiikkavalmentaja). "Kaikki jäsenet hänen joukkueissaan" -ehto on UI:n (lib/tm_klippi_ryhma.js):
//     Rules ei tunne valmentajan joukkuetta; yksittäinen klippi pelaajalle on ollut sallittu koko henkilökunnalle jo v3.50:stä.
//   · viestit tyyppi 'klippi': valinnainen lahde ∈ ['linkki'] — 'oma_video' (klippilataus v2, lisäpalvelu) EI vielä sallittu; v2 laajentaa listan. Muut klippikentät ennallaan.
// Muutokset v3.61 → v3.62 (turvallisuus: server-only integraatioavaimet, ei migraatiota Rulesissa — datan siirto scripts/siirra_integraatioavaimet.js):
//   · seurat/{sid}/salaiset/{dokId} (UUSI blokki): allow read, write: if false — KAIKILTA selaimilta, myös SA:lta ja johdolta. Vain Admin SDK (Cloud Functions) lukee/kirjoittaa.
//     Kotipaikka ulkoisten palveluiden avaimille (salaiset/integraatiot.taso_api_key); aiemmin taso_api_key oli seura-dokissa jonka koko seuran henkilökunta luki selaimella.
//
// Muutokset v3.60 → v3.61 (K35-6c · D196 ryhmän vastaava, ei migraatiota — uusi kenttä on valinnainen):
//   · seurat/{sid}/ryhmat/{id}: UUSI valinnainen kenttä `vastuu_uid` (string; pitää olla ryhmän valmentajat[]:ssä). Ryhmän vastaava = se valmentaja joka suunnittelee ryhmän treenit.
//   · seurat/{sid}/kalenteri/{id} update: ryhmän VASTAAVA (ryhmat/{rid}.vastuu_uid == uid, valmennusrooli omassa seurassa) saa päivittää KOKONAAN (nimi, aika, paikka, tila, poistettu = soft-delete)
//     ryhmätapahtumaa jonka kohde.ryhma_id on hänen ryhmänsä — ilman että on tapahtuman luoja. Estot: kohde (tyyppi + ryhma_id) ei saa muuttua (ei siirtoa toiseen ryhmään/joukkueeseen), luoja_uid ei muutu.
//     Ryhmän muu valmentaja pysyy v3.47:n kokoonpano-/läsnäolo-oikeudessa (ei nimi/aika/poisto). Luonti ennallaan (luoja_uid == oma uid; vastaava luo omiin ryhmiinsä valmentajana).
//
// Muutokset v3.59 → v3.60 (K35-10 korjaus, ei migraatiota):
//   · seurat/{sid}/pelaajat/{pid}/kooste/{id} read: lisätty talenttivalmentaja (oma seura) — v3.59:n kommentti lupasi sen, mutta onJohtoRooli kattaa vain vp/utj/seurasihteeri. Pelaaja/huoltaja edelleen vain callablella; write false.
// Muutokset v3.58 → v3.59 (K35-6f pelaajan harjoituskertymä — UUSI alikokoelma, ei migraatiota):
//   · seurat/{sid}/pelaajat/{pid}/kooste/{id}: read SA | oman seuran johto (VP/UTJ/seurasihteeri) | talenttivalmentaja | OMAN joukkueen valmentaja (onOmanJoukkueenValmentaja); write false (vain palvelin: triggerit kertymaLasnaolijaOnWrite / kertymaKirjausOnWrite
//     ja taydenna_harjoituskertyma.js, Admin SDK). Pelaaja ja huoltaja EIVÄT lue suoraan — vain callable haePelaajanKertyma (sama tunnistus kuin haePelaajanKalenteri). Sisältö: pelaajan omat viikkokorit (ei vertailua muihin).
// Muutokset v3.57 → v3.58 (K35-6d joukkueen omat: vapaa, erikoisohjelma — D240/D241; ei migraatiota, vain uusi kirjoitusehto):
//   · seurat/{sid}/kalenteri/{id} create/update: tyyppi (lower+trim) 'seuran_tauko' | 'tauko' | 'loma' → KOKONAAN vain johto (VP/UTJ/seurasihteeri) tai SA, myös joukkueeseen rajattuna (valmentaja ei luo eikä muokkaa; valmentajan joukkuekohtainen tauko = joukkueen_vapaa);
//     'joukkueen_vapaa' | 'erikoisohjelma' → `joukkue` (joukkue-id) PAKOLLINEN ja valmentaja vain OMA joukkue (kayttajat.joukkueet ∋ joukkue; johto ja talenttivalmentaja kaikki joukkueet). //     Update tarkistaa sekä uuden että vanhan dokumentin (ei tyypin vaihtoa toiseksi eikä toisen joukkueen vapaan muokkausta). Muut tyypit ennallaan (valmentaja kirjoittaa kuten ennen).
// Muutokset v3.56 → v3.57 (K35-7a kalenterin iCal-syöte, D190 — UUSI kokoelma, ei migraatiota):
//   · kalenteri_tilaukset/{sha256(token)}: allow read, write: if false — VAIN palvelin (Admin SDK: callable luoKalenteriTilaus kirjoittaa, HTTPS kalenteriIcal lukee). Dokumentti { seuraId, pelaajaId|null, uid|null, tilaajaUid, kohde, rooli, luotu, mitatoity, viimeksi_haettu };
//     asiakas ei näe eikä muuta tilauksia (tokenin tiiviste on dokumentin id → ei listausta). Token on syötteen ainoa suoja (kalenterisovellus ei osaa App Checkia).
// Muutokset v3.55 → v3.56 (S2 Seuran pulssi / kooste v4 — D70 — KOVENNUS (enum), ei migraatiota; puuttuva `tyyppi` = 'kilpa'):
//   · seurat/{sid}/joukkueet/{jid}.tyyppi: jos kenttä on mukana, arvon on oltava 'kilpa' tai 'harraste' (create ja update; sama paikka ja samat kirjoittajat kuin valmentajaprofiili: SA | johto). Valmentaja ei aseta (update-haara
//     sallii vain jaksofokus/jaksofokus_historia). Pulssi lukee tyypin koosteesta (kooste v4: joukkueet.<jid>.tyyppi/profiili, n_toiminto_7, n_perhe_kuittaus_7 — vain palvelin kirjoittaa, koosteet ennallaan: luku johto/SA, ei pelaaja/huoltaja).
// Muutokset v3.54 → v3.55 (B4 pelaajan ja huoltajan kalenteri palvelimelta — KOVENNUS + huoltajan RSVP-korjaus; ei migraatiota):
//   · seurat/{sid}/kalenteri/{id}.read: `onPelaajanSeura` POISTETTU. Pelaaja ja huoltaja saavat kalenterin vain callablesta `haePelaajanKalenteri` (rajattu: oma joukkue §7.18/ryhmä/pelaajat_id, nakyvyys, sallitut kentät, ikkuna).
//     Henkilökunta ja SA ennallaan. Deployjärjestys: funktio → selain (Pelaaja_v7 v86 / Vanhempi_v2 v57) → TÄMÄ viimeisenä.
//   · lasnaolijat/{pid}: HUOLTAJAN saatavuusvastaus (RSVP) — aiemmin hylätty (huoltajalla ei seuraId-claimia eikä pelaajatokenia, joten create/update epäonnistui hiljaa). Nyt create/update kun
//     onLapsenHuoltaja && email_verified == true && pelaajan suostumusTila == 'annettu' && rooli == 'huoltaja' (pakotettu) && vain kentät saatavuus/paivitetty/rooli && saatavuus in [tulossa, estynyt].
//     Pelaajan oma polku, luku (pelaaja/huoltaja vain oma dokumentti) ja henkilökunta ENNALLAAN.
//
// Muutokset v3.53 → v3.54 (S1.1 Käyttöaste — 10.10.2026 — additiivinen, §11; ei migraatiota; kentät syntyvät vasta palvelimen kirjoituksesta):
//   · seurat/{sid}/pelaajat/{pid}: `viimeisinKirjautuminen` (pelaajaKirjaudu kirjoittaa) ja `huoltajaViimeisinKaynti` (kirjaaHuoltajaKaynti kirjoittaa) VAIN palvelimella (Admin SDK).
//     Client ei saa asettaa (create) eikä muuttaa tai poistaa (update: !affectedKeys().hasAny) — myös henkilökunta ja SA. Sama malli kuin pin/suostumus (v3.30/v3.33).
//   · Koosteet (kooste, kooste_joukkue) ennallaan: luku johto/SA (+ oman joukkueen valmentaja joukkuekoosteeseen); pelaaja ja huoltaja eivät lue (§7.22). Versio 2 -kentät ovat uusia lukumääriä samoissa dokumenteissa.
//
// Muutokset v3.52 → v3.53 (Seuran pulssi S1 — 9.10.2026 — additiivinen, §11; ei migraatiota; client ei kirjoita):
//   · seurat/{sid}/kooste/{vvvv-Www}: luku SA | oman seuran johto (VP/UTJ/seurasihteeri). Kirjoitus `false` (vain palvelin, Admin SDK: laskeSeuranKooste / paivitaSeuranKooste).
//   · seurat/{sid}/kooste_joukkue/{jid}_{vvvv-Www}: luku kuten yllä + talenttivalmentaja (koko seura) + OMAN joukkueen valmentaja (dokumentin `jid` ∈ kayttajat/{uid}.joukkueet, valmentajanJoukkueet).
//     Kirjoitus `false`. Pelaaja ja huoltaja eivät lue kumpaakaan (§7.22; heillä ei seuraId-claimia → onOmaSeura epätosi).
//   · seurat/{sid}/konfiguraatio/kooste_tavoitteet (S3): EI uutta blokkia — yleinen konfiguraatio/{konfId} kattaa jo (luku oman seuran henkilökunta, kirjoitus johto/SA). Testattu.
//   · v3.52:n jälkisiivous: kalenterin valmentajan field-level-haara (muiden tapahtumat) — 'muistiinpanot' pois hasOnly-listasta. Seuraus: muun kuin oman tapahtuman legacy-`muistiinpanot`-kentän
//     poisto onnistuu enää johdolta, tapahtuman luojalta ja SA:lta (migraatio = Excel_Tuonti/SA); valmentajan field-level-päivitys muuten ennallaan (paivitetty, muokkaaja_uid, lasnaolo_kooste, valmentaja_rpe, valmentaja_rpe_pvm).
//
// Muutokset v3.51 → v3.52 (#882 vaihe 3 — 9.10.2026 — KOVENNUS, ei migraatiota; ⚠ v3.49 on varattu Seuran pulssille S1 tässä numeroinnissa):
//   · seurat/{sid}/kalenteri/{id}: create ja update EIVÄT salli kenttää `muistiinpanot` tapahtumadokumentissa (!('muistiinpanot' in request.resource.data)) —
//     kaikille rooleille (SA mukaan lukien). Muistiinpanot VAIN alikokoelmassa kalenteri/{id}/henkilokunta/muistiinpanot (v3.48-blokki ennallaan).
//   · Kentän POISTAVA update sallitaan edelleen (request.resource.data ei sisällä kenttää) — vanhan datan siivous / Excel_Tuonti-migraatio.
//     Seuraus: legacy-dokumentin, jossa kenttä vielä on, muu päivitys vaatii kentän poiston samassa kirjoituksessa.
//
// Muutokset v3.50 → v3.51 (R6.4 PR 2 — 9.10.2026 — KOVENNUS, ei migraatiota):
//   · viestit-luku, huoltajan haara: suostumusTila == 'annettu' vaaditaan KAIKILTA huoltajan luvuilta (ei vain tyyppi 'klippi'). Aiempi `tyyppi != 'klippi' || suostumus` ei suojannut KYSELYÄ: emulaattori arvioi
//     rajaamattoman `resource.data.get('tyyppi','')` oletusarvona '' → `list`-kysely pelaajaId+nakyvyys palautti klipit ilman suostumusta (getDoc kyllä esti). Huoltajan sovellus ei lue viestit-kokoelmaa muuhun (Vanhempi_v2 lukee vasta R6.4 PR 2:ssa).
//   · Pelaajan klippivastauksen pelaajaId == klipin pelaajaId oli jo v3.50:ssä (klippiVastausKelpaa) — nyt nimetty testi.
//
// Muutokset v3.49 → v3.50 (R6.4 Mediaviesti M1, D55–D64 — 8.10.2026 — additiivinen, §11; ei migraatiota; uusi tyyppi samassa viestit-kokoelmassa):
//   · viestit tyyppi 'klippi' (henkilökunta luo): url https:// ≤500, domain, mediatyyppi video|kuva|linkki, klippityyppi onnistui|prosessi|tulos, kysymys 1–160, saate ≤120, nakyvyys pelaaja|huoltaja, pelaajaId, vastaanottajaUid, klippi_id, nakyva_alkaen (timestamp), tila 'lahetetty', kohta_s/osa/tukitavoite_id/kysymys_avain valinnaisia.
//     Henkilökunta ei voi luoda tyyppejä klippi_vastaus/klippi_kuittaus (ne ovat pelaajan/huoltajan).
//   · Pelaajan/huoltajan luonti (viestiPelaajanLuonti): tyyppi 'klippi_vastaus' (pelaaja tai huoltaja) ja 'klippi_kuittaus' (vain huoltaja): vastaus_viestille viittaa OMAN pelaajan klippiin, vastaanottajaUid = klipin vastaanottaja, teksti valinnainen ≤200, valinta ≤60, EI url:ia (hasOnly), nakyvyys 'pelaaja' pakotettu.
//   · Huoltajan luku klippi-dokumenttiin vaatii pelaajan suostumusTila == 'annettu' (D58; huoltajalla voi olla sähköposti ennen suostumusta).
//   · Kuittaus klippiin: lähettäjä | vastaanottaja (vastuuhenkilö) | johto | SA päivittää VAIN kuittaus_lause (≤120) + tila (vastattu|suljettu). Vastaanottajan luettu-päivitys ennallaan.
//   · Seuran pulssi (S1) siirtyy v3.51:een.
//
// Muutokset v3.48 → v3.49 (R1 Ryhmät, D33 — 8.10.2026 — additiivinen, §11; uusi kokoelma + yksi kalenterikenttäsääntö, ei migraatiota):
//   · seurat/{sid}/ryhmat/{rid}: nimi (≤60) · tyyppi 'lista'|'saanto' · saanto {kentta:'talenttiOhjelma', arvo:true} (vain tyyppi 'saanto', pelaajat_id tyhjä) · pelaajat_id[] (≤200) · valmentajat[] (uid, ≤10) · kuvaus? (≤200) · aktiivinen · luotu/luoja_uid/muokattu.
//     Luku: oman seuran käyttäjä (onKirjautunut && onOmaSeura) — pelaaja ja huoltaja EIVÄT lue (heillä ei seuraId-claimia). Luonti: SA | johto | valmentaja/talenttivalmentaja/fysiikkavalmentaja; luoja kentässä valmentajat[] ellei johto/SA.
//     Päivitys: SA | johto | ryhmän valmentaja (uid in resource.valmentajat). Poisto: SA | johto (mieluummin aktiivinen:false). Ei uutta roolia "maalivahtivalmentaja": valmentaja-rooli + merkintä valmentajat[]:ään.
//   · seurat/{sid}/kalenteri/{id}: ryhmätapahtuman (kohde.tyyppi == 'ryhma') kokoonpanon synkka + jäädytys: ryhmän valmentaja (uid in get(ryhmat/{kohde.ryhma_id}).valmentajat) saa päivittää VAIN pelaajat_id/jaadytetty/paivitetty/muokkaaja_uid/lasnaolo_kooste, vaikka ei ole tapahtuman luoja.
//     Jäädytetyn (jaadytetty asetettu) tapahtuman pelaajat_id:tä ei voi enää muuttaa (jaadytetty ei muutu). Läsnäolon kirjaus (lasnaolijat) toimi jo kaikille valmentajaroolille — ennallaan.
//   · Seuran pulssi (S1) siirtyy v3.50:een (v3.49 = tämä; v3.48 = P0 tietosuoja #882).
//
// Muutokset v3.46 → v3.48 (P0 TIETOSUOJA 8.10.2026 — kalenterin muistiinpanot + läsnäolijat; additiivinen alikokoelma + lukukiristys): ⚠ v3.47 = R1 Ryhmät (PR #881); tämä haara tehty main:in (v3.46) päälle → mergen jälkeen versiot ketjuvat. Seuran pulssi (S1) → v3.49.
//   · AUKKO: kalenteri/{id}.read salli onPelaajanSeura-lukijalle koko kokoelman → pelaajan/huoltajan client pystyi lukemaan valmentajien `muistiinpanot`-kentän ja kaikkien läsnäolot (lasnaolijat).
//   · seurat/{sid}/kalenteri/{id}/henkilokunta/muistiinpanot = { teksti ≤ 500, muokkaaja_uid, paivitetty }: luku VAIN oman seuran henkilökunta (SA | onKirjautunut && onOmaSeura — pelaajalla pelaajaSeuraId, ei seuraId); kirjoitus SA | johto | valmentajaroolit; vain dokumentti 'muistiinpanot'.
//     Henkilökunnan clientit lukevat ja kirjoittavat tänne (vanha `muistiinpanot`-kenttä poistetaan tallennettaessa); migraatio = SA-työkalu (Excel_Tuonti). Tapahtumadokumentin `muistiinpanot`-kenttää EI vielä estetä Rulesissa (vanhat clientit/data) — kiristys migraation jälkeen.
//   · kalenteri/{id}/lasnaolijat/{osallistujaId}.read: pelaaja/huoltaja lukee VAIN oman dokumenttinsa (onPelaajaItse | onLapsenHuoltaja); aiemmin kaikkien (onPelaajanSeura). Saatavuus-RSVP (oman dokin read-back + kirjoitus) ennallaan. Henkilökunta ennallaan.
//
// Muutokset v3.45 → v3.46 (V4b-2: kevyt katselmus + valmentajaprofiili, 7.10.2026 — additiivinen, §11; ei migraatiota):
//   · reviewit/{pvm}.kevyt: kevyt katselmus (3 kysymystä SANOINA) { nakyi: ei_viela|ohjatusti|itsenaisesti, treeni: harvoin|joskus|usein, mukana: vahan|jonkin_verran|hyvin } — hasOnly + hasAll + enum (kenttä `nakyi` = "Näkyikö ydinvahvuus pelissä?"; briiffin alkuperäinen kenttänimi korvattu neutraalilla; SANATESTI kieltää sanan kenttänimistä). EI pelaajadokumenttiin (pelaaja lukee oman dokumenttinsa; reviewit ei ole pelaajan luettavissa).
//     `kevyt_tallennettu` (ISO-merkkijono) valinnainen. Kevyt katselmus kirjoittaa reviewit-dokumenttiin VAIN nämä kentät (set-merge): ei `tyyppi`-kenttää eikä review_viimeisin_* -pikakenttiä (MDT-rytmi päivittyy vain täydestä katselmuksesta).
//   · joukkueet/{jid}.valmentajaprofiili: 'ammatti' | 'oto' (oletus 'oto' koodissa; puuttuva sallittu). Kirjoittaa vain SA/johto (valmentajan joukkuedokumentti-update on jo rajattu jaksokenttiin → profiilia ei voi muuttaa itse). Enum-validointi.
//   · Ryhmät (D33) siirtyvät v3.47:ään (v3.46 = tämä).
//
// Muutokset v3.44 → v3.45 (pelaajadokumentin `ennatys_nahty` — ennätysjuhlan nähty-merkki, 7.10.2026 — additiivinen, §11; ei migraatiota):
//   · Ongelma: "Uusi oma ennätys" -ilmoitus (Pelaaja_v7 _naytaUusiEnnatys) toistui, koska nähty-merkki oli vain localStorage:ssa (uusi laite, selain, yksityinen tila, tyhjentyvä PWA-muisti).
//   · Korjaus: PIN-pelaaja (onPelaajaItse) saa päivittää omaan dokumenttiinsa VAIN kentän `ennatys_nahty` (map { avain: 'YYYY-MM-DD' }; affectedKeys().hasOnly + is map + ≤ 200 avainta). localStorage jää välimuistiksi.
//     Avaimen/arvon muotoa ei voi tarkistaa säännöissä (ei silmukkaa) → sama anon-luottamusmalli kuin xp/streak; kenttä ei vaikuta mihinkään muuhun kuin juhlan toistoon.
//   · Ryhmät (D33) siirtyivät v3.46:een → v3.47 (v3.46 = V4b-2, ks. yllä).
//
// Muutokset v3.43 → v3.44 (seurat/{sid}/pelaajat/{pid}/viikkokatsaukset/{sunnuntain pvm} — K4, 7.10.2026 — additiivinen, §11; uusi alikokoelma, ei migraatiota):
//   · Pelaajan sunnuntain viikkokatsaus: { vk, jakso_alkoi, vastaukset:[{osa, teksti, arvo:'usein'|'joskus'|'ei_viela'}], lause?, luotu }. Oma alikokoelma, EI kirjaukset/{pvm}: kirjauksia lukee ainakin seitsemän lukijaa (Vanhempi_v2, Palloliiton viikkoseuranta, VP:n hiljaiset ym.).
//   · Luku: SA | oman seuran henkilökunta | pelaaja itse. Huoltaja ei lue (K5 lisää tarvittaessa).
//   · Create: vain pelaaja itse; hasOnly/hasAll-kentät, arvo-enum, 1–3 vastausta, lause ≤ 140, luotu == request.time. Henkilökunta ja huoltaja eivät kirjoita.
//   · Update ja delete: EI KOSKAAN (yksinkertaisin: yksi vastaus per sunnuntai, ei korjausikkunaa; UI ei näytä korttia vastauksen jälkeen). Päivä on dokumentin id (YYYY-MM-DD), joten kaksoispainallus = toinen create = update = hylätty.
//   · (Ryhmät D33 siirtyvät v3.46:een — v3.45 on ennätysjuhlan nähty-merkki.)
// Muutokset v3.42 → v3.43 (seurat/{id}/liput/julkiset — K1 osa 2, 7.10.2026 — additiivinen, §11; uusi polku, ei migraatiota):
//   · seurat/{id}/liput/julkiset = { kentta: bool, … } — seuran PELAAJALLE LUETTAVAT käyttöönottoliput (Kenttä-UI). Syy: seurat/{id} on luettavissa vain onOmaSeura:lle, eikä pelaajan token (pelaajaSeuraId) läpäise sitä.
//     Dokumentissa EI saa olla mitään pelaajalta piilotettavaa (vain boolean-liput). Yksi totuus: Pelaaja_v7, Master, VP ja V1/J4-polut lukevat tämän; vanha seurat/{id}.liput.kentta on fallback K7:ään asti.
//   · Luku: SA | oman seuran henkilökunta | oman seuran pelaaja (onPelaajanSeura) — kokonaisuus funktiossa onLiputLuku(): K5 lisää huoltajan luvun TÄHÄN yhteen paikkaan (ei muita sääntöjä muutettavaksi).
//   · Kirjoitus: SA | oman seuran johto (onJohtoRooli). Pelaaja/huoltaja/valmentaja eivät kirjoita. (Ryhmät D33 siirtyvät v3.44:ään.)
// Muutokset v3.41 → v3.42 (harjoitepankki.kaytto, 6.10.2026 — kovennus, ei data-muutosta):
//   · PELAAJA lukee harjoitepankista vain tila=='hyvaksytty' && kaytto=='koti' (arvot: koti | joukkue → ekvivalentti "kaytto != 'joukkue'", mutta FAIL-CLOSED: kaytto-kentätön rivi ei kelpaa).
//     Joukkueharjoite (valmentajan rata/rutiini, kaytto 'joukkue') ei ole koskaan pelaajan luettavissa, vaikka se olisi hyväksytty. Henkilökunta lukee kaikki.
//     ⚠ KYSELY: pelaajan kyselyssä PAKKO olla molemmat ehdot where('tila','==','hyvaksytty') + where('kaytto','==','koti') — Rules ei suodata, ja `get(kentta, oletus)`-muoto päästäisi
//     rajaamattoman kyselyn läpi (testattu: where tila== yksin palautti joukkue-rivin), siksi kaytto luetaan suoraan (resource.data.kaytto). Kaksi yhtäsuuruusehtoa → ei komposiittiindeksiä.
// Muutokset v3.40 → v3.41 (harjoitepankki.tila, 6.10.2026 — additiivinen, §11; ei vanhoja harjoitepankki-dokkeja):
//   · seurat/{id}/harjoitepankki/{id}.tila: 'luonnos' | 'hyvaksytty' (pakollinen luonnissa/päivityksessä). PELAAJA lukee VAIN tila=='hyvaksytty' (kyselyssä oltava where('tila','==','hyvaksytty'), Rules ei suodata);
//     henkilökunta lukee kaikki. Luonnos-rivi ei koskaan päädy pelaajalle. `valmennuslinja/teemat` = vain hyväksytyt rivit; luonnokset tuodaan staff-only-lohkoon `valmennuslinja/teemat_luonnos`
//     (pelaaja lukee vain lohkon 'teemat' — v3.40:n ehto riittää, ei Rules-muutosta).
// Muutokset v3.39 → v3.40 (Seuran linja -paketti, B PR1, 6.10.2026 — additiivinen, §11; uudet polut, ei migraatiota):
//   · seurat/{id}/valmennuslinja/{lohko}: `ikavaiheet` (rivit {ika_min, ika_max, dimensio D1–D5, sisalto[], lahde_viite} — vain henkilökunta, EI pelaajalle/huoltajalle)
//     ja `teemat` (jaksot[{joukkue, alkaa, paattyy, teema, konsepti}] — henkilökunta + oman seuran pelaajat). Kirjoitus SA | VP/UTJ (onKonseptiMuokkaaja).
//   · seurat/{id}/harjoitepankki/{id}: henkilökunta + oman seuran pelaajat lukevat; kirjoitus SA | VP/UTJ; muoto: lahde=='seura' (seuran oma materiaali — ei TM:n oletuspankkiin), tyyppi 'T', nimi merkkijono.
//   · seurat/{id}/arviointikehys/{docId}: SJK:n pelipaikkaprofiilit — vain data; luku oman seuran henkilökunta, kirjoitus SA | VP/UTJ. Ei pelaajalle.
//   · `ohjelmat` ennallaan (henkilökunta lukee; pelaaja EI — ohjelma kopioidaan jaksoon). Uudet kentät (teema_avain, ika_min, ika_max, lahde_viite) mahtuvat nykysääntöön.
//   · SEURAN SISÄLTÖ ON VAIN SEURAN OMAA: jokainen polku on seurat/{id}/-alla, `onOmaSeura`/`onPelaajanSeura` sitoo luvun omaan seuraan → toinen seura (esim. SJK ↔ Sibbo) ei lue eikä kirjoita (parametrisoidut eristystestit).
// Muutokset v3.38 → v3.39 (viestit.nakyvyys — D-2 + R6.4:n pohja, 6.10.2026 — additiivinen, §11; vanhat viestit ilman kenttää = 'henkilokunta'):
//   · seurat/{sid}/viestit/{id}.nakyvyys: 'henkilokunta' (oletus/puuttuva) | 'pelaaja' (pelaaja + huoltaja + henkilökunta) | 'huoltaja' (huoltaja + henkilökunta, pelaaja EI näe).
//     Sama sanasto kuin havainnot.nakyvyys. Lukuoikeus: SA; henkilökunta kuten ennen (vastaanottaja/lähettäjä/johto) + KAIKKI oman seuran henkilökunta kun nakyvyys 'pelaaja'|'huoltaja'
//     (keskustelu pelaajan asiasta); pelaaja vain nakyvyys=='pelaaja' && onPelaajaItse(resource.pelaajaId); huoltaja nakyvyys 'pelaaja'|'huoltaja' && onLapsenHuoltaja. Rules EI suodata → kyselyssä oltava nakyvyys-ehto.
//   · Pelaajan/huoltajan LUOMA viesti: nakyvyys pakotettu 'pelaaja', ei video_url-kenttää, avainjoukko rajattu, lahettajaUid == auth.uid, luettu:false. Henkilökunta saa asettaa nakyvyys-arvon ja video_url:n.
//   · KOVENNUS: vastaanottajan update VAIN `luettu` (bool) — ei nakyvyys/teksti/lahettajaUid/video_url (SA vapaa). Pelaaja/huoltaja eivät voi päivittää viestejä (R6.4 päättää lukukuittauksen).
//   · R6.4 (Veo-linkit + keskustelu) EI rakenneta tässä — vain kenttä + Rules.
// Muutokset v3.37 → v3.38 (vastuuhenkilö per pelaaja, 5.10.2026 — additiivinen, §11, ei migraatiota):
//   · seurat/{sid}/pelaajat/{pid}.vastuuhenkilo = {uid, rooli, asetettu_pvm}: kertoo vain KENEN TEHTÄVÄ pelaajan asia on; EI rajaa oikeuksia (VP ja talenttivalmentaja toimivat kaikkien pelaajien kohdalla).
//     Kentän (asetus/vaihto/poisto) saavat muuttaa VAIN: SA, VP, urheilutoimenjohtaja, talenttivalmentaja (oma seura) ja joukkueen valmentaja (rooli 'valmentaja', pelaajan joukkue
//     = valmentajan joukkue; onOmanJoukkueenValmentaja). EI fysiikkavalmentaja/fysioterapeutti/seurasihteeri/pelaaja/huoltaja. Muoto: map, keys().hasOnly/hasAll [uid, rooli, asetettu_pvm],
//     uid merkkijono = seuran kayttajat-dokumentti TAI seuran vp_uid (ei toisen seuran käyttäjää), rooli ∈ valmentaja|apuvalmentaja|talenttivalmentaja|vp, asetettu_pvm YYYY-MM-DD (10 merkkiä).
//     Poisto (kenttä pois) sallittu samoille. Uusi funktio vastuuhenkiloMuutosKelpaa liitetty pelaajat.update-sääntöön (AND) — muut kentät ja roolit ennallaan.
//
// Muutokset v3.36 → v3.37 (R6.3-B: jakson pelaajan valinta, joukkueen jakso, kuittaus; 5.10.2026 — kaikki additiivisia, ei migraatiota):
//   · seurat/{sid}/pelaajat/{pid}: update += PIN-pelaaja (onPelaajaItse) VAIN `ydinvahvuus_valinta` (map {vaihtoehto ≤ 60 merkkiä, valittu_pvm?}, keys().hasOnly) — D8: pelaaja valitsee, EI voi kirjoittaa
//     jaksofokus-kenttää (jakso alkaa vasta valmentajan vahvistuksesta/aktivoinnista, D14).
//   · seurat/{sid}/joukkueet/{jid}: `allow write` jaettu — create + delete ennallaan (SA | johto), update += valmentaja (oman joukkueen valmentaja; talenttivalmentaja koko seuraan — EI ollut oikeutta ennen v3.37:ää) VAIN affectedKeys().hasOnly(['jaksofokus','jaksofokus_historia']) (joukkueen jakso, sama tmAsetaJaksofokus). Valmentaja EI luo joukkuedokumenttia.
//   · seurat/{sid}/pelaajat/{pid}/kirjaukset/{pvm}: update += U12-huoltaja (onU12HuoltajaIka) VAIN `jakso_kuittaus` (map, lahde=='vanhempi') — kuittaus ei vaadi top-level lahde-kentän
//     ylikirjoitusta (aiempi onU12Huoltaja vaati lahde=='vanhempi' koko dokista → merge olisi pyyhkinyt pelaajan kirjauksen lahteen). Pelaaja itse kuittaa jo nykyisillä oikeuksilla.
//
// Muutokset v3.35 → v3.36 (Pikakirjaus valmentajalle, 3.10.2026 — Teron päätös A):
//   · seurat/{sid}/pelaajat/{pid}/testitulokset/{pvmProto}: create + update += onOmanJoukkueenValmentaja(seuraId,
//     pelaajaId) — oman joukkueen valmentaja (talenttivalmentaja ja johto koko seuraan, kuten pelaajadokin update).
//     Masterin Pikakirjaus kirjoittaa testituloksen + pikakentät samassa batchissa (§26, #743); pelaajadokin
//     pikakenttäpäivitys oli valmentajalle jo sallittu → ei muuta muutosta. delete ennallaan (vain SA).
//     Seurasihteeri EI (ei valmentajarooli), pelaaja/huoltaja EI.
//   · Kommentti tulokset/{pelaajaId}: IDP_Kortti_v4-maininta pois (kortti arkistoitu 2026-10).
//
// Muutokset v3.34 → v3.35 (Kehitystilanne v0.1: seuran omat vapaat tavoitteet, 2.10.2026):
//   · seurat/{sid}/omat_tavoitteet/{tid}: luku johtoroolit + SA; luonti vp ja urheilutoimenjohtaja + SA, kenttien
//     tarkistus (tyyppi maara/summa/viimeisin/kylla_ei, tekijä, aikaraja pvm, suunta "pienempi" vain viimeisin-tyypille,
//     luoja_uid == auth.uid, arkistoitu == false). Päivitys VAIN arkistointi (arkistoitu/paivitetty/paivittaja_uid).
//     Poisto estetty (historia; kirjaukset viittaavat tavoitteeseen).
//   · …/omat_tavoitteet/{tid}/kirjaukset/{kid}: luku johtoroolit + SA; VAIN luonti (ei päivitystä, ei poistoa) →
//     historia säilyy. Korjaus = uusi kirjaus, jonka mitatoi = kumottavan kirjauksen id (arvo null). Arvo tyypin mukaan
//     (maara: 1, summa/viimeisin: luku, kylla_ei: bool). Summa-tyypissä EI pelaajalinkkiä (ei pelaajakohtaisia summia);
//     pelaajalinkin pelaajan oltava seuran pelaaja. Arkistoituun tavoitteeseen ei kirjata.
//     GDPR: poistaPelaajaGDPR (Admin SDK) nollaa pelaajaId:n kirjauksista; Rules eivät salli sitä selaimesta.
//   · kausikuvat/{kausi}: demorajaus (demo == true) PURETTU. poistaPelaajaGDPR poistaa nyt pelaajan rivin
//     kausikuvista (Admin SDK), joten kausikuvan voi tallentaa oikeallekin seuralle. Muuten ennallaan (vain luonti).
//
// Muutokset v3.33 → v3.34 (Kehitystilanne v0, 2.10.2026):
//   · seurat/{sid}/kehitysasetukset/{vuosi} ja seuratuki/{vuosi}: lukevat seuran johtoroolit (vp, urheilutoimenjohtaja,
//     seurasihteeri) + SA; kirjoittavat vp ja urheilutoimenjohtaja + SA. Poisto vain SA.
//   · seurat/{sid}/kausikuvat/{kausi}: luku johtoroolit + SA; VAIN luonti (ei päivitystä, ei poistoa selaimesta).
//     Luonti sallitaan toistaiseksi vain seuralle, jonka dokumentissa demo == true: poistaPelaajaGDPR ei vielä poista
//     pelaajaa kausikuvista (briefin edellytys ennen ensimmäistä oikeaa kausikuvaa).
//
// Muutokset v3.32 → v3.33 (suostumus-kovennus, 2.10.2026):
//   · seurat/{sid}/pelaajat: suostumusTila, suostumus, suostumusAnnettu, suostumukset ja huoltajaEmail
//     muuttuvat VAIN palvelimella (vahvistaSuostumus / lahetaRekisteriKutsu / luoSuostumusKortit /
//     asetaHuoltajaEmail) — myös SA:lta estetty. Luonnissa (uusi pelaaja, Excel-tuonti) huoltajaEmail sallitaan,
//     suostumusTila vain 'pilotti' tai 'odottaa', eikä suostumus-/suostumusAnnettu-/suostumukset-kenttiä.
//     → Henkilökunta ei voi enää merkitä suostumusta annetuksi selaimesta.
//   · seurat/{sid}/kutsut update: ei enää kirjautumatonta päivitystä tilassa 'odottaa' (suostumuslomakkeen
//     vanha reitti poistettu; vahvistaSuostumus hyväksyy kutsun palvelimella).
//   · Ylätason suostumukset/{id}: ei selainkirjoituksia (oli create: if true + kirjautumaton update);
//     luku vain SA. Kokoelmaa ei käytä mikään koodi.
//   · audit/{id}: nimenomainen esto (luku vain haeAuditLoki-funktion kautta, kirjoitus vain palvelimelta).
//
// Muutokset v3.31 → v3.32 (haamuvalmentaja, 1.10.2026):
//   · seurat/{sid}/kayttajat/{uid} create: VAIN palvelimella (luoKayttaja). Seura-sivu kirjoitti ennen koko
//     dokumentin selaimesta luoKayttajan perään; nyt kentät kulkevat callablen kautta. luoKayttaja hylkää
//     SA-tunnuksen (admins), joten SA:lle ei synny seuran henkilöstödokumenttia.
//
// Muutokset v3.30 → v3.31 (P0 — deaktivointi ei estänyt pääsyä, 1.10.2026):
//   · seurat/{sid}/kayttajat/{uid} update: rooli, seuraId, aktiivinen, deaktivoitu/deaktivoija_uid,
//     aktivoitu/aktivoija_uid ja claimsAsetettu muuttuvat VAIN palvelimella — myös SA:lta ja käyttäjältä
//     itseltään estetty (ennen SA:lla ei ollut kenttärajausta). delete vain palvelimella (poistaKayttaja).
//     Deaktivointi/aktivointi/roolinvaihto tekevät Auth disabled + claimit + token-mitätöinnin samassa.
//
// Muutokset v3.29 → v3.30 (Vaihe 0 / PR 4 — PIN vain palvelimella):
//   · seurat/{sid}/pelaajat: selain EI aseta (create) eikä muuta (update) kenttiä pin / pin_asetettu —
//     myöskään SA. PIN kirjoitetaan asetaPelaajanPin / luoPinitSeuralle / vahvistaSuostumus -funktioissa,
//     jotka kirjoittavat hajautuksen (_pelaajaPin) ja selväkielisen kopion samassa erässä.
//   · players (Solo): vanhempi ei aseta eikä muuta child_pin-kenttää (soloHyvaksyLupa + _soloPin).
//   · lupapyynnot/{rid}/tulos/{token}: get sallittu, list ja kirjoitus kielletty. Päädokumentissa ei enää
//     child_pin/playerCode (uudet pyynnöt: vain token_hash).
//
// Muutokset v3.28 → v3.29 (Vaihe 0 / PR 3b):
//   · playerCodes: `read` → `get` kirjautuneelle + `list: if false`. Selain tarvitsee vain getin
//     (tmVaraaPlayerCode); pelaajaKirjaudu/soloLapsiKirjaudu ja skriptit käyttävät Admin SDK:ta.
//
// Muutokset v3.27 → v3.28 (Vaihe 0 / PR 3 — ANONYYMIN SULKU, CODE_BRIEF_PELAAJAN_TUNNISTUS v2):
//   · Anonyymi-funktio POISTETTU kokonaan (funktio + 29 haaraa: 27 seurapuussa, 2 Solon players-säännössä). Pelaajan polut sallivat vain
//     palvelintokenin: onPelaajaItse / onPelaajanSeura (pelaajaKirjaudu, v3.25) ja Solo-lapsella
//     onSoloLapsiItse (soloLapsiKirjaudu, v3.26). Kenttärajaukset ennallaan.
//   · Poistunut aukko: anonyymi (kuka tahansa julkisella Firebase-avaimella) listasi kaikkien seurojen
//     pelaajat PIN-kenttineen, loi kirjauksia mille tahansa pelaajalle ja luki Solo-pelaajan, jolla child_pin.
//   · Haaroja, jotka sallivat anonyymin ILMAN rinnakkaishaaraa, ei ollut. onKirjautunut()-ehdon
//     (ilman roolia) anonyymi läpäisee yhä, kunnes Anonymous-provider suljetaan Consolesta:
//     errors create, kaaviot (hyväksytyn luku), playerCodes get (list suljettu v3.29).
//
// Muutokset v3.26 → v3.27 (Solo Polku A -tallennuskorjaus):
//   · players/{playerId}/{sub=**} → /{alikokoelma}/{polku=**}: kirjoitus get() → getAfter(), luku
//     ennallaan get():llä. Match rajattu alikokoelmiin, koska {sub=**} täsmäsi myös pelaajadokkiin
//     (getAfter olisi sallinut parent_uid-kaappauksen — emulaattoritesti todentaa, ettei ole).
//     Juurisyy: vanhemman profiilierä loi pelaajan ja suostumuksen samassa erässä → get() ei nähnyt
//     pelaajaa → PERMISSION_DENIED koko erälle (playerCodes-varaus jäi orvoksi). Ei uusia anonyymihaaroja.
//
// Muutokset v3.25 → v3.26 (Vaihe 0 / PR 2b — Solo-lapsen palvelinkirjautuminen, VAIN LISÄYS):
//   · Uusi funktio onSoloLapsiItse(playerId): token `soloLapsiKirjaudu`-funktiolta
//     (playerCode + PIN), claimit { rooli:'solo_lapsi', soloPlayerId } — EI seura-avaruuden kenttiä.
//   · players/{playerId} get/update: anonyymin haaran rinnalle `|| onSoloLapsiItse(playerId)`
//     SAMOILLA kenttärajauksilla (parent_uid/child_pin/playerCode/seuraId muuttumattomia).
//     Anonyymiä haaraa EI poisteta vielä (PR 3).
//   · _soloPin: Solo-PIN-hajautukset, vain Admin SDK (deny-all).
//
// Muutokset v3.24 → v3.25 (Vaihe 0 / PR 1 — palvelinkirjautuminen, VAIN LISÄYS):
//   · Uudet funktiot onPelaaja / onPelaajaItse(seuraId, pelaajaId) / onPelaajanSeura(seuraId):
//     token `pelaajaKirjaudu`-funktiolta (PalloID + PIN), claim `pelaajaSeuraId` (EI `seuraId`).
//   · Jokaisen seuraan sidotun anonyymihaaran (27 kpl) rinnalle `|| onPelaajaItse(...)`
//     SAMOILLA kenttärajauksilla (`(anonyymi || onPelaajaItse(...)) && affectedKeys...`).
//     Pelaajan omat polut → onPelaajaItse; läsnäolon kirjoitus → vain oma rivi (osallistujaId);
//     seura-tason luvut (kalenteri, läsnäolon luku, harjoitusprioriteetti) → onPelaajanSeura.
//     Solo `players` ennallaan. Anonyymihaara EI poistu (PR 3).
//   · konseptit: pelaaja lukee oman seuransa linjan.
//   · _kirjautumisyritykset + _pelaajaPin: vain Admin SDK (deny-all).
//
// Muutokset v3.23 → v3.24 (Vaihe 0 / PR 0 — CODE_BRIEF_PELAAJAN_TUNNISTUS v2):
//   · `admins/{uid}` read: vain SA tai käyttäjä itse (`request.auth.uid == uid`). Aiemmin kuka
//     tahansa kirjautunut — myös anonyymi — sai lukea super-admin-taulukon. Kaikki selainpuolen
//     lukijat (Admin, Seura, Master, VP, UTJ, Testaus_v9, Excel_Tuonti, Testituonti_Master) lukevat
//     VAIN omaa dokumenttiaan (`doc(user.uid)`) SA-fallbackina → rajaus ei riko niitä. Admin SDK
//     (functions, tm_admin-skriptit) ohittaa säännöt.
//   · Anonyymi pääsy (35 haaraa) on YHÄ AUKI: se suljetaan vasta PR 3:ssa, kun
//     palvelinkirjautuminen (PR 1, `pelaajaKirjaudu`) on käytössä. Tavoitetila on kirjattu
//     punaisina testeinä (`it.fails`) tests/rules/firestore.rules.test.js → "Vaihe 0 · tavoitetila".
//
// Muutokset v3.22 → v3.23 (Perumisen oikeus):
//   · `peruminenKelpaa(seuraId)`: tekijäkenttä kattaa myös `valmentajaUid` (valmentaja_viesti),
//     ja seuran JOHTO (VP / urheilutoimenjohtaja) saa perua oman seuran merkinnän.
//     Juurisyy: viestin kirjoittaja ei voinut perua omaa viestiään, koska sääntö vertasi vain
//     `tekija_uid`-kenttään, jota viesteillä ei ole. Muut valmentajat eivät edelleenkään saa perua.
//     Peruttu pysyy lukittuna (vain SA palauttaa); pisteitä ei saa muuttaa samassa kirjoituksessa.
//
// Muutokset v3.21 → v3.22 (ADAR-tietosuoja, vaihe 1):
//   · `havainnot` read: anonyymi pelaajaistunto JA huoltaja näkevät vain `nakyvyys=='pelaaja'`
//     -havainnot. Aiemmin kumpikin näki kaikki valmiit, joten Taso 1:n valmentajan muistiinpano
//     meni 8–12-vuotiaalle sellaisenaan. Kyselyssä on oltava nakyvyys-ehto (Rules ei suodata).
//   · `havainnot` update: anonyymi saa muuttaa VAIN `pelaaja_lukenut`-kentän ja vain
//     pelaajalle näkyvässä havainnossa. Aiemmin se sai muuttaa mitä tahansa kenttää.
//   · ⚠ JÄRJESTYS: migraatio (scripts/migroi_havainto_nakyvyys.js) ENNEN tämän deployta,
//     muuten vanhat havainnot katoavat pelaajilta hetkeksi.
//
// Muutokset v3.20 → v3.21 (Havainnon kumoaminen):
//   · `havainnot` update: kun `tila` muuttuu arvoon 'peruttu', vaaditaan että kirjoittaja on
//     havainnon TEKIJÄ (SA ohittaa) eikä `pisteet` muutu samassa kirjoituksessa.
//   · Kumoaminen on tilamuutos eikä poisto: valmentajalla ei ole poisto-oikeutta, ja peruttu
//     havainto jää historiaan. Peliälylaskenta ohittaa perutut (lib tmAdarKonsensus).
//   · Aikaikkunaa EI ole säännössä — offline-kumous synkkaa myöhemmin eikä saa kaatua siihen.
//   · Jo peruttu havainto on LUKITTU (vain SA päivittää): muuten peruutuksen olisi voinut
//     kumota kuka tahansa joukkueen valmentaja palauttamalla tilan 'valmis'-arvoon.
//
// Muutokset v3.19 → v3.20 (Kenttätarkkailut — kohdennettu pelihavainto):
//   · UUSI kokoelma `seurat/{sid}/pelaajat/{pid}/kenttatarkkailut/{id}`.
//   · EI `havainnot`-kokoelmaan: sen lukusääntö sisälsi anonyymiehdon (pelaajan
//     PIN-istunto) eikä sitä ole rajattu omaan pelaajaan. Kenttätarkkailu on valmentajan
//     havainto alaikäisestä eikä sitä tarvitse näyttää pelaajalle lainkaan (§7.22), joten
//     oma kokoelma rajaa luvun heti oikein koskematta laajempaan anonyymiaukkoon.
//   · read: SA | oman seuran johto TAI valmentaja. EI anonyymiä, EI huoltajaa.
//   · create: SA | oman joukkueen valmentaja, `valmentajaUid == auth.uid`, luotu-vartija.
//   · update: vain OMAN dokumentin kirjoittaja (tai SA) — toisen tarkkailua ei muokata, eikä
//     tekijää voi vaihtaa (`valmentajaUid` on muuttumaton).
//   · create: doc-id päättyy kirjoittajan uid:hen — muuten toisen uid:llä varattu id kääntäisi
//     hänen oman tallennuksensa päivitykseksi, jonka update-sääntö torjuu.
//   · create/update kieltävät kentät `pisteet`/`narratiivi`/`teksti`/`oppimisnakokohta`:
//     ne kääntäisivät toisen näkymän tulkitsemaan dokumentin väärin (Masterin ADAR-pikakentät
//     lukisivat `pisteet`:n ADAR-pisteinä; Pelaaja_v7 näyttäisi tekstin lapselle).
//
// Muutokset v3.18 → v3.19 (Johto näkee vain valmiit kaaviot):
//   · kaaviot-luku: `|| onJohtoRooli()` poistettu oman seuran haarasta. onValmentajaRooli()
//     sisältää vp/UTJ → hyväksyjä näkee luonnokset ja voi katselmoida (ennallaan). Erotus on
//     seurasihteeri → hän putoaa 'hyvaksytty'-haaraan ja näkee vain valmiit.
//   · kommentit-luku PEILATTU samaan: muuten keskeneräisen kaavion katselmuslanka olisi
//     vuotanut seurasihteerille vaikka itse kaavio ei. Langan seurarajaus pysyy tiukempana
//     kuin kaaviotason (hyväksytynkin langan luku vaatii oman seuran).
//   · lib/tm_kaavio_policy.js oli JO tiukempi (ei johto-haaraa) → klientti ei muuttunut.
//
// Muutokset v3.17 → v3.18 (TIETOTURVAKORJAUS — kommentin kirjoitusportti vuoti seurarajan yli):
//   ! onStaffKirjoitus() puuttui sulkeet: (onOmaSeura && onValmentajaRooli) || onKaavioHyvaksyja().
//     Jälkimmäinen haara on seuraneutraali roolitesti → MINKÄ TAHANSA seuran vp/UTJ saattoi
//     luoda kommentin toisen seuran kaavion lankaan. Luku oli koko ajan suojattu (onStaffLuku
//     vaatii onOmaSeura), joten kyse oli sokkokirjoituksesta tunnettuun polkuun — ei vuodosta.
//     Korjaus: onSuperAdmin() || (onOmaSeura(seuraId) && (onValmentajaRooli() || onKaavioHyvaksyja())).
//     Regressio lukittu: tests/rules/kaavio.rules.test.js cross-seura-deny (punainen ennen korjausta).
//     Auditoitu: kaikki muut onKaavioHyvaksyja()-kutsukohdat ovat onOmaSeura-vartion sisällä.
//
// Muutokset v3.16 → v3.17 (Katselmuksen kommenttilanka — erä E):
//   + seurat/{sid}/kaaviot/{kid}/kommentit/{cid}: append-only staff-lanka. read = emokaavion
//     lukuportti (kaavioLukuOkDoc(get(emo))) + oma seura + valmentaja/johto — PELAAJA EI NÄE,
//     vaikka näkisi hyväksytyn kaavion (palaute on staffin työkalu). create vaatii
//     kirjoittaja == auth.uid, tyyppi in ['kommentti','hylkays'], aika == request.time,
//     teksti 1–2000 merkkiä. update KIELLETTY (myös kirjoittajalta), delete vain SA.
//   · kaavioLukuOk() → kaavioLukuOkDoc(d) + ohut kääre: alikokoelmassa resource.data on
//     kommentti, joten yksityisyys on kysyttävä emodokista.
//   · Kommentin KIRJOITUS on kapeampi kuin luku: seurasihteeri lukee (hän näkee kaaviotkin)
//     muttei kirjoita — sama rajaus kuin onKaavioHyvaksyja():ssa, koska katselmuspalaute on
//     valmennussisältöä eikä hallintoa.
//
// Muutokset v3.15 → v3.16 (Keskeneräinen luonnos — review.yksityinen):
//   + kaavioYksityinen() / kaavioTekija() / kaavioLukuOk(): yksityinen luonnos näkyy VAIN
//     tekijälle (review.luonut) ja SA:lle. Puuttuva kenttä = julkinen (taaksepäinyhteensopiva).
//     Hyväksytty ei voi olla yksityinen — katselmuksen läpäissyt on julkaistu määritelmällisesti.
//   ⚠ Johto (VP/UTJ) EI näe keskeneräisiä. Tämä on tulkinta ("yksityinen = ei valmis
//     kenellekään"), ei vahvistettu päätös — muutospiste on kaavioLukuOk() + policyn
//     kaavioVoiLukea, molemmat merkitty samalla varoituksella.
//
// Muutokset v3.14 → v3.15 (Kaavion kohdistus — neljäs taso 'valmentaja'):
//   + kaavioNakyvyysLuontiOk(): 'valmentaja' sallittujen tasojen joukkoon. Se on HENKILÖSTÖ-
//     REITITYS (kenelle valmentajalle kuva annetaan käytettäväksi), ei pelaajayleisö — se ei
//     laajenna pelaajien näkyvyyttä lainkaan, joten se ei vaadi hyväksyjää.
//   · review.valmentajaId — UUSI kohdekenttä. EI erillistä sääntömuutosta: kaaviot-blokissa ei
//     ole kenttäkohtaista allowlistia (create/update kirjoittavat koko dokumentin), joten uusi
//     review-kenttä kulkee olemassa olevien porttien läpi.
//   · Lukuportti ENNALLAAN: oman seuran valmentaja lukee jo KAIKKI seuran kaaviot kaikissa
//     tiloissa (allow read alla), joten valmentajalle osoitettu kaavio näkyy hänen pankissaan
//     ilman uutta ehtoa. Erillinen "valmentajaId == uid" -lisäys olisi kuollut sääntörivi.
//
// Muutokset v3.13 → v3.14 (Piirrokset Vaihe 1 — toissijainen pelipaikka):
//   + seurat/{sid}/pelaajat/{pid} update — field-level-allowlistiin 'tt_positio_toissijainen'
//     ensisijaisen rinnalle (sama omistajuus: valmentajaroolit + johto). Fysioterapeutti EI saa
//     tätä kenttää (sen allowlist pysyy jaksofokus + jaksofokus_historia).
//
// Muutokset (näkyvyystason roolilukko — kaaviot):
//   + kaavioNakyvyysLuontiOk() / kaavioNakyvyysMuutosOk(): seuratason näkyvyyden ('seura') saa
//     asettaa VAIN onKaavioHyvaksyja() (vp | urheilutoimenjohtaja | SA). Valmentaja luo ja
//     kohdistaa oman joukkueensa sisältöä ('joukkue'|'pelaaja'); seuran yhteisen kirjaston
//     kuratoi metodologiajohto. Muokkausportti koskee NOSTOA seuratasolle — jo seuratasoisen
//     kaavion sisältömuokkaus säilyy valmentajalla joukkuerajauksen puitteissa.
//
// Muutokset v3.12 → v3.13 (Seurakerros TIER 1 — seurakohtaiset konseptit):
//   + seurat/{sid}/konseptit/{avain} — kaanonin (lib/tm_teknistaktiset.js) päälle tuleva
//     seuraoverride: nimi/kpi/pelaaja_miksi/pelitilanne/kysymykset/piilotettu + seuran omat
//     (avain 'seura_*'). read: KOKO seura (valmentaja tarvitsee konseptit renderiin).
//     write: VAIN onKonseptiMuokkaaja() = vp | urheilutoimenjohtaja (+ SA). Valmentaja EI —
//     muuten seuran konseptikieli hajoaisi joukkueittain (§37 roolimalli). Valmentajan oma
//     kerros on TIER 2 (konseptin VALINTA + per-pelaaja tavoitteet), joka on ennallaan.
//     seurasihteeri EI mukana: hallinnollinen rooli, ei pedagoginen.
//     delete sallittu muokkaajalle: "palauta kaanoniin" = override-dokumentin poisto.
//
// Muutokset v3.11 → v3.12 (Vaihe 7.2a — fysiikkaohjelmakirjasto):
//   + seurat/{sid}/ohjelmat/{id} — deterministinen ohjelmakirjasto. read: oma seura.
//     create/update: oman seuran valmentajaroolit (sis. fysiikkavalmentaja) + fysioterapeutti
//     + johto. KOVA DELETE ESTETTY (vain SA) — arkistointi = update (arkistoitu:true). §6.
//
// Muutokset v3.10 → v3.11 (Vaihe 7 — fysiikkajakso, fysioterapeutti-klausuuli):
//   + seurat/{sid}/pelaajat/{pid} update — fysioterapeutti saa field-level-writen
//     VAIN ['jaksofokus', 'jaksofokus_historia'] (fyysisen jakson sulku/arvio, §4/§37).
//     EI tt_positio_aktiivinen (ei kuulu fysioterapeutille). fysiikkavalmentaja kuuluu jo
//     onValmentajaRooli → toimii ilman muutosta. Fysioterapeutti EI onValmentajaRooli-listassa
//     (ei luo kalenteritapahtumia) — TIETOINEN RAJAUS, ei "korjata".
//
// Muutokset v3.9 → v3.10 (Vaihe 3a — IDP-kausitavoite):
//   + seurat/{sid}/pelaajat/{pid}/idp_kausi/{vuosi} — kausitavoite (IDP-ydin,
//     IDP_YDIN_SPEC §2). Kirjoitus johto + oman seuran valmentaja (§15-pattern).
//     LUKU myös pelaajalle (PIN/anon) — kausitavoite jaetaan 3c-peilissä
//     (§7.22-turvallinen render); ERI kuin raaka arviointi (jota anon ei lue).
//     Pikakentät idp_tila/idp_edistyma/idp_fokus pelaajadokumenttiin (jo sallittu).
//     doc-ID = vuosi ilman "/" (§11).
//
// Muutokset v3.8 → v3.9 (Vaihe 2b — ominaisuusarviointi, Palloliitto-taksonomia):
//   + seurat/{sid}/pelaajat/{pid}/arviointi/{kausiId} — havaittu 1–5 -arvio
//     (Palloliitto Player Development Card). Aikuisten työkalu (§7.22): luku VAIN
//     SA + oman seuran henkilöstö (EI anon/pelaaja eikä huoltaja — raaka "Poor"
//     ei näy lapselle/perheelle). Kirjoitus valmentaja/johto. doc-ID = kausi ilman
//     "/" (esim. 2026-27, §11 — "2026/27" tulkittui polkuerottimeksi → korjattu).
//     Ilman tätä blokkia tallennus kaatui "Missing or insufficient permissions".
//
// Muutokset v3.7 → v3.8 (Solo Polku B, SOLO_P0_TIETOMALLI_SPEC.md §9):
//   + lupapyynnot/{requestId} — lapsi luo (status 'odottaa'), get omalla requestId:llä, EI list;
//     update/delete VAIN CF (Admin SDK hyväksynnässä).
//   ~ players/{id} — read jaettu get/list; lapsi (anonymous + child_pin) saa single-doc GET +
//     rajatun UPDATEn omaan dokkiin (ei muuta parent_uid/child_pin/playerCode/seuraId). EI list anonyymille.
//
// Muutokset v3.6 → v3.7 (Solo Player™ P0, SOLO_P0_TIETOMALLI_SPEC.md §4):
//   + parents/{uid}      — vanhemman tili (vain oma uid).
//   + players/{playerId} — Solo-pelaaja (litteä), omistus parent_uid == auth.uid + alikokoelmat.
//   + playerCodes/{code} — club-bridge-indeksi (luo oma vanhempi; luku kirjautuneelle).
//   ERILLINEN lohko klubin seurat/-puusta. Polku B (lupapyynnot + lapsi-PIN) = PR 2.
//
// Muutokset v3.5 → v3.6 (V1 kuorma & fiilis, KUORMA_FIILIS_SPEC.md §5):
//   ~ kalenteri/{id} update field-level (valmentaja, ei-omistaja) sallii nyt myös
//     'valmentaja_rpe' + 'valmentaja_rpe_pvm' (valmentajan session-RPE -arvio).
//     Johto/omistaja (luoja_uid==uid) saa jo täyden updaten → ei muutosta heille.
//
// Muutokset v3.4 → v3.5 (kalenteri-omistajuus + läsnäolo, KALENTERI_ARKKITEHTUURI.md §7):
//   ~ seurat/{sid}/kalenteri/{tapahtumaId} update — valmentaja/talenttivalmentaja saa nyt
//     TÄYDEN muokkauksen OMIIN tapahtumiinsa (resource.data.luoja_uid == auth.uid) JA
//     field-level muokkauksen MUIDEN tapahtumiin (vain muistiinpanot + läsnäolo-kooste + audit).
//   ~ create — valmentajaroolilta vaaditaan luoja_uid == auth.uid (omistajuus aina kirjautuu).
//   ~ lasnaolijat/{osallistujaId} — valmentaja/johto saa merkitä läsnäolon kenelle tahansa
//     pelaajalle (osallistujaId = pelaajaId); pelaaja vahvistaa edelleen OMAN (uid==osallistujaId).
//
// Muutokset v3.3 → v3.4 (kalenteri-kokoelma):
//   + seurat/{sid}/kalenteri/{tapahtumaId} — seuran pääkalenteri (KALENTERI_ARKKITEHTUURI.md §3).
//     VP/johto: full CRUD. Valmentaja: create + field-level update (muistiinpanot, tila, soft-delete).
//     Ei hard-deletea (audit-jälki, soft-delete update-kautta).
//   + seurat/{sid}/kalenteri/{tapahtumaId}/lasnaolijat/{uid} — läsnäolovahvistukset.
//     Osallistuja saa päivittää oman läsnäolonsa.
//
// Muutokset v3.2 → v3.3 (kirjaus-permissionit, PÄÄTÖS 1+2):
//   + kirjaukset: VP + talenttivalmentaja (oma seura) eksplisiittinen kirjoitusoikeus.
//   + onU12Huoltaja() — huoltaja saa kirjata alle 13v -lapselle kun lahde=='vanhempi'.
//     Kaikissa kirjauksissa pakollinen lahde-kenttä (valmentaja|pelaaja|vanhempi|vp|talenttivalmentaja).
//
// Muutokset v3.1 → v3.2 (universaali testi-arkkitehtuuri):
//   + seurat/{sid}/konfiguraatio/{konfId} — seuran normijärjestelmä (maa/kieli).
//     Ladataan tuonti/analyysihetkellä; mahdollistaa kv-normit (DFB/KNVB) tulevaisuudessa.
//
// Muutokset v3.0 → v3.1 (VP_v25 Sprint A):
//   + seurat/{sid}/toimenpiteet/{tid} —
//     TalentMasterin automaattiset ehdotukset +
//     VP:n kuittaus/muokkaus/hylkäys.
//     Ei delete: audit-jälki säilyy aina.
//
// Muutokset v2.1.0 → v3.0 (tiivistetty v3.78:ssa; täysi teksti git-historiassa, tm_admin/firestore.rules ennen 5.11.2026):
//   + huoltajan luku (onLapsenHuoltaja), kehut, testitapahtumat/tulokset, idp_jono, valmentajat, viestit (v2.3) · vp_muistiinpanot (v2.4)
//   + meta/{key}, idp_jono 'odottaa' (v2.5) · testitulokset/{pvm}_{protokolla} historiatuonti (v2.6) · joukkueet/{jid}/kalenteri (v2.7)
//   + biologinen_ika/{mittausPvm} (v2.8) · seurat/{sid}/tapahtumat + vp_kalenteri (v2.9) · palautteet/{pvm}_tki + harjoitusprioriteetti (v3.0)
//   Firestore EI periydy alikokoelmiin → jokaisella alikokoelmalla oma match-blokki (§17 #18).
```
