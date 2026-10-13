# 40 · Harjoitteiden lähteet toimintakorttia varten — selvitys (vaihe 1)

**Tila:** raportti ennen toteutusta (docs-PR, ei sovelluskoodia). Päivätty 13.10.2026. Live-luvut: Teron 13.10. ajamat vain luku -skriptit (ei kirjoituksia; vain lukuja, kenttänimiä ja lyhyitä luokitteluarvoja, ei harjoitetekstejä); lähde `lahteet.json` + `lahteet2.json`. Skriptit eivät ole PR:ssä.
**Ristiriidat briefin kanssa on koottu kohtaan 9. Niitä ei ole ratkaistu.**

## 1. Tiivistelmä

| Lähde | Missä | Määrä | Käyttökelpoisuus toimintakortille |
|---|---|---|---|
| Seuran harjoitepankki | Firestore `seurat/{sid}/harjoitepankki` | KPV 124 (105 hyväksyttyä, 19 luonnosta, 35 arkistoitua) · SJK 34 (kaikki luonnoksia) · muilla seuroilla 0 | Ainoa lähde, jossa on seuran oma harjoite. Kenttä `teema_avain` **ei ole pankissa** (kohta 9.1); jakson osaan kohdistavaa kenttää ei ole |
| Palloliiton valmennuslinja | ei repossa (vain tiivistelmä 6 viikkopohjasta, `docs/data/spl_viikkopohjat_2023.json`) | 0 harjoitetta | Ei harjoitteita eikä käyttölupaa (`LISENSSIT.md` ei mainitse) |
| TalentMaster-konseptipeli | `tmTtHarjoitteet()` (`lib/tm_teknistaktiset.js`) | 14 Y-konseptia × 1 konseptipeli + 92 pelipaikkariviä | Konseptitasolla täysi kattavuus, ei osakohtaisia |
| Fysiikka (`harjoitelogiikka_v4.js`) | `PANKKI.T/D/S` | 58 riviä (T 17, D 12, S 29) | Sisältää ikävaihe-, PHV- ja video-tiedon; lisenssiselvitys kesken (kohta 6) |

## 2. Seuran oma valmennuslinja

- **Lataus:** ei käyttöliittymää. Vain Teron ajamat skriptit, oletuksena kuivaajo: `scripts/tuo_harjoitepankki.js` (KPV:n JSON + kuvat-zip → `harjoitepankki/{id}` + Storage `…/{id}.jpg`) ja `scripts/tuo_valmennuslinja.js` (Excel → `valmennuslinja/ikavaiheet|teemat|teemat_luonnos`, `ohjelmat/{id}`, `harjoitepankki/{id}`). Aineisto tulee Teron yksityisestä lähdeputkesta ("Linjapankki", mainittu vain `16_kentta_koko_jarjestelmassa.html`; ei repossa). Seuran aineisto ei saa olla repossa.
- **Purettu harjoitteiksi:** kyllä. Harjoite on dokumentti, jossa on nimi, kesto, pelaajamäärä, alue, ikä (`ika_min/max`), `pelikonteksti`, `painopiste`, `tags`, `vuosikello`, tavoite, järjestely, kulku, valmennuspisteet, helpota/vaikeuta, `kuva_url` (Storage-polku). Video: kenttä `video_url` on vain Excel-tuonnin (SJK/Ketteryys) rivillä.
- **Seurat (live, `lahteet.json`):**

| Seura | Harjoitepankki | Valmennuslinja | Ohjelmat | Liput (kehitystyopoyta_v2 / valmentaja_v2) |
|---|---|---|---|---|
| kpv | 124 · hyväksytty 105 · luonnos 19 · arkistoitu 35 · kaytto joukkue 123 / koti 1 · kolmas osapuoli 1 · kuva 81 · **video 0** | ikavaiheet 10 · joukkueharjoittelu 7 · teemat 7 (hyväksytty) | 15 (hyväksytty) | ✓ / ✓ |
| sjk | 34 · kaikki luonnos · joukkue 34 · **kuva 0 · video 0** | ikavaiheet 10 · teemat 0 hyväksyttyä, luonnos 7 | 15 (luonnos) | – / – |
| sibbovargarna, grifk, vifk, palloiirot, yilves, eif | 0 | 0 | 0 | sibbo: – / ✓ |
| demo, demo-fc | 0 | demo: viikkopohjat | 0 | demo: ✓ / ✓ |

  Huom. Pallo-Iirot: Linjapankissa on 43 harjoitetta (design 16), mutta tuotannossa 0. KPV:n pankissa on SJK-tyyppistä Ketteryys/Rutiinit-materiaalia (id-etuliitteet `ketteryys` 18, `rutiinit` 16, `kpvh` 89, `identiteetti_x` 1).
- **Kielet:** `kieli: sv` on GrIFK:lla, VIFK:lla ja Sibbolla. Yhdelläkään ruotsinkielisellä seuralla ei ole linjaa tai pankkia. Seuran linja on seuran omalla kielellä (D16), ei käännetä.

## 3. Palloliiton valmennuslinja

Repossa ei ole harjoitteita. `spl_viikkopohjat_2023.json` on "johdettu tiivistelmä" 6 viikkopohjasta (`_lahde`: Valmennuslinja 2023, 86 s. PDF, ei repossa). Kentät: harjoituksia/vk, kesto_min, omatoiminen_h, muu_liikunta_h, pelit, rakenne. Pallo-Iirot-tuonti tunnistaa Palloliiton tasokoodit (G6, F9) iälle (`tmHarjoiteParsiIka`). `LISENSSIT.md` ei sisällä Palloliiton lupaa; sen oma sääntö (kohta 2): "Uutta ulkopuolista sisältöä ei lisätä moottoriin ennen kuin lupa on kirjattu."

## 4. TalentMaster-konseptipeli (`tmTtHarjoitteet()`)

- **14/14 Y-konseptilla** (Y-H0…H9, Y-P1…P4) on täsmälleen yksi `{konseptipeli, pelimuoto}`. Osakohtaisia (a/b/c/d/e) harjoitteita ei ole.
- Lisäksi 92 pelipaikkariviä (T, LP, KK, KY, KH, LA, MV): `{pelipaikka, teema, painopisteet}`. Ne ovat teemakuvauksia, eivät harjoitteita.
- Osia (kpi) on 3–7 per konsepti, yhteensä 69. Vain osan teksti on, ei harjoitetta.
- **Kysymykset (`tmTtKysymykset`):** 3 kysymystä jokaisella 14 konseptilla (42), tavallisia merkkijonoja ilman osakoodia. **Ne eivät vastaa osia** (osia 3–7, kysymyksiä aina 3; kysymys on konseptin yleinen reflektio, esim. "Minne ensimmäinen kosketuksesi vei pallon – ja miksi?"). Kysymyksiä ei voi kohdistaa osaan.
- **tmTtPelaaja:** palauttaa jo cue = `kysymykset[0]` ja `koe` = konseptipeli — pelaajan silmin -datan lähde on olemassa.
- **sv:** `lib/tm_teknistaktiset_sv.js` kattaa Y-konseptit **täysin**: nimet 14/14, osat 69/69, kysymykset 42/42, konseptipelit 14/14. (Sibbon konseptisisältö on siis ruotsiksi; seuran oma linja ei.)

## 5. Fysiikka (`harjoitelogiikka_v4.js`, `tm-prescription.js`, `tm_ohjelma.js`, HPP)

| Osa | Rivejä | Kentät | PHV / ikä | Video |
|---|---|---|---|---|
| `PANKKI.T` (T-harjoite, 4 teemaa + perus) | 17 | nimi, ohje_leikkija/rakentaja/showcase, kesto, cue, tarina, viikkotavoite, stage | stage 1–5 (Everton-progressio) ja 3 ikävaihetta | `yt` kaikilla |
| `PANKKI.D` (aktivointi, 6 ketjua) | 12 | sama + `phv`, `pallo_yhteys` | `phv`-ohje kaikilla | `yt` kaikilla |
| `PANKKI.S` (kohdennettu, 5 ketjua) | 29 | sama + `phv`, `phv_xp` | `phv`-ohje kaikilla | `yt` kaikilla |
| `tm-prescription.js` (pre-harkka) | 25 S + 5 aktivointia | nimi, ohje(+3 ikävaihetta), kesto, `phv_ohje` | `phv_ohje` 30 | `yt` 5 |
| `tm_ohjelma.js` | 2 templaattia (nopeus_voima, kuntoutus) | rakennepohjat, ei sisältöä | – | – |
| `tm_fyysteemat.js` | 5 teemaa (fy_nopeus … fy_liikehallinta) | katalogi + testit, ei harjoitteita | PHV-portti `tmFyysPHVPortti` | – |
| HPP-pankki (`hpp_rehab_protokollat.js`) | 45 harjoitetta | n, d, ohje, cue, fascia, progressio, vaihe, `phv_ok`, huomio | `phv_ok` | – |
| Seuran `ohjelmat/{id}` | KPV 15, SJK 15 | nimi, tyyppi, vaiheet, liikkeet, `teema_avain`, ika_min/max | – | liikkeissä |

## 6. Lisenssi- ja alkuperäkysymykset

**6.1 `harjoitelogiikka_v4.js`:n fysiikkatekstit: oma muotoilu vai kopio?** Tätä ei voi todeta koodista, ja siksi sitä ei väitetä. Tiedossa on:
- Tiedoston otsikko ja kommentit nimeävät rakenteellisiksi lähteiksi **Fulham FC Academy Home Practice** (T-harjoite kuukausimalli, "REPEAT INDIVIDUAL NEED"), **Noordster Basis Techniek Training** (8 sarjaa, 3 tasoa) ja **Everton Stage -progression** (stage 1–5, `EVERTON_LISAYKSET`). Nevanlinna 2014 on mainittu kahdessa kuvauksessa ja on `LISENSSIT.md`:ssä.
- Tekstit ovat suomeksi, kolmella ikävaihe-ohjeella, "tarina"/"cue"-kentillä ja omalla `phv`-lisällä (`phv`-kenttä on tiedoston oman kommentin mukaan "lisäarvo Evertoniin verrattuna"). Se viittaa omaan muotoiluun, mutta ei todista sitä.
- Fulhamia, Noordsteria ja Evertonia **ei ole `LISENSSIT.md`:ssä**; sama sivu toteaa, ettei ulkopuolista sisältöä lisätä ennen lupaa. Jokaisella harjoitteella on YouTube-id (`yt`), eli ulkopuolisia videoita viitataan.
- **Suositus (päivitetty 13.10.):** fysiikkalinja on Teron oma aineisto (kohta 13), joten tekstit saa näyttää. Fulham/Noordster/Everton-rakennemallien rivi `LISENSSIT.md`-luonnoksessa (6.3) ja YouTube-videolinkkien käyttöoikeus jäävät Teron päätettäväksi.

**6.2 HPP-kuntoutuspankki.** Tiedoston otsikko: "TalentMaster-järjestelmän ja **HPP ELITE -klinikan yhteinen** protokolladata"; lähde "HPP ELITE v9 harjoitekirjasto (Excel, 53 harjoitetta)"; 45 harjoitetta, osa "HPP ELITE -spesifit … suoraan HPP ELITE v9 -kirjastosta". Se on siis klinikan aineistoa, ei TalentMasterin omaa, eikä lupaa ole kirjattu. Ei toimintakortille.

**6.3 `LISENSSIT.md`-luonnos** (lisättäväksi taulukkoon 1, jos Tero vahvistaa; ei vielä tehty):

| Lähde | Tekijä | Käyttö TalentMasterissa | Lupa | Vahvistettu |
|---|---|---|---|---|
| Rehabilitaatioprotokollat / HPP ELITE v9 harjoitekirjasto (`lib/hpp_rehab_protokollat.js`, 45 harjoitetta) | HPP ELITE (klinikka) | Kuntoutusohjelmat (`tm_ohjelma` kuntoutus-templaatti, HPP 3-vaihe) | **Selvitettävä:** yhteiskäyttö klinikan kanssa, kirjallinen vahvistus | ❓ |
| Fulham FC Academy Home Practice; Noordster Basis Techniek Training; Everton Stage -progressio | Fulham FC / Noordster / Everton FC | `harjoitelogiikka_v4.js`: rakenne- ja progressiomallit; harjoitetekstit omia vai ei: selvitettävä | **Selvitettävä** | ❓ |
| Suomen Palloliitto, Valmennuslinja 2023 (PDF 86 s.) | Suomen Palloliitto | Johdettu tiivistelmä 6 viikkopohjasta (`spl_viikkopohjat_2023.json`) | **Selvitettävä** (ei harjoitteita käytössä) | ❓ |
| Ekkono-pohjainen materiaali | Ekkono | Vain Teron oma käyttö, ei tuotteessa | ei käyttöä tuotteessa | – |

## 7. Rules: lähdeasetus, video_url, kirjoitusoikeudet

- **`konfiguraatio/harjoitelahteet`:** `match /konfiguraatio/{konfId}` sallii luvun oman seuran henkilökunnalle (`onKirjautunut() && onOmaSeura`), `create/update` **SA ja `onJohtoRooli()`** (vp, urheilutoimenjohtaja, **seurasihteeri**), `delete` vain SA. Ei kenttävalidointia. **Uusi dokumentti ei vaadi Rules-muutosta.** Briefin "vain seuran ylläpitäjä" vs. säännön johtoryhmä: sihteeri pääsee kirjoittamaan; rajaus VP/UTJ-vain vaatisi oman `match`-haaran (`onKonseptiMuokkaaja`, kuten `harjoitepankki`). Lähdejärjestyksen kenttämuodon enum-validointi on valinnainen lisä (v3.64-tyyliin).
- **`harjoitepankki/{id}` kirjoitus:** `create/update` = **SA + `onKonseptiMuokkaaja` (vp, urheilutoimenjohtaja)**; vaatii `lahde 'seura'`, `tyyppi 'T'`, `tila ∈ {luonnos, hyvaksytty}`, `nimi` ei tyhjä. **Valmentaja ei voi kirjoittaa video_url:ia** (eikä mitään muuta kenttää). Briefin "kirjoitusoikeus ylläpitäjällä, valmennuspäälliköllä ja valmentajalla" → **Rules-muutos tarvitaan**: uusi update-haara valmentajalle `affectedKeys().hasOnly(['video_url','paivitetty'])` + `video_url` https-validointi. **Raportoitu, ei tehty.** Huom: `tm_jakso_malli`/`kotiharjoitteet` hyväksyvät nykyisin `http(s)`; brief vaatii vain `https`.
- **Pelaajan lukuoikeus:** pelaaja lukee harjoitepankista vain `tila == 'hyvaksytty' && kaytto == 'koti'`. KPV:llä 123/124 harjoitetta on `kaytto: joukkue` → pelaajan sovellus ei voi lukea niitä. "Pelaajan silmin" -tila on henkilökunnan esikatselu, joten se toimii; pelaajan oma näkymä tarvitsisi snapshotin jaksofokukseen (kuten kotiharjoitteet), ei suoraa lukua.
- **Linjapankki / tuontikentät:** `tuo_valmennuslinja.js` tukee `video_url`, `kuva_url`, `lahde_viite`, `teema_avain` (ohjelmille) ja `lahde: 'seura'`; **`lupa`-kenttää ei ole kummassakaan** (`jako_lupa` on 23 KPV-dokumentissa, alkuperä muu tuonti). `tuo_harjoitepankki.js` (KPV-JSON → `tmHarjoiteNormalisoi`) ei kanna `video_url`:ia eikä `lupa`a (normalisoija asettaa `lahde: 'seura'` aina). Lisäys: ~10 riviä per skripti + `tmHarjoiteNormalisoi` + testit = pieni (puoli päivää). **Teron Linjapankki ei ole repossa** (vain maininta design 16:ssa).

## 8. Yhdistäminen: teema/konsepti → harjoite

**Kenttien todellinen täyttö (KPV 124 / SJK 34; ei-tyhjät arvot):**

| Kenttä | KPV | SJK | Huomio |
|---|---|---|---|
| `teema_avain` | – (kenttää ei ole) | – | on vain `ohjelmat`-dokumenteissa, ja siellä **0/15** täytetty |
| `konsepti` | **1** (arvo "Hyökkäys", ei TM-konseptiavain) | 0 | kenttä on olemassa 35 dokumentissa, mutta tyhjänä |
| `painopiste` | **0** | – | kenttä on olemassa 89 dokumentissa, mutta tyhjänä |
| `pelikonteksti` | 89 | 0 | 18 eri arvoa (alla) |
| `tags` | 89 | 0 | pallollinen 49, 1v1 42, havainnointi 16, tuki 14, hyökkäys 14, viimeistely 13, fyysinen 12, puolustus 12, pelijärjestelmä 1 |
| `ketju` | 34 | 34 | SFL 13, LL 10, DIAG 6, DFL 3, SBL 2 (fysiikka, ei konsepti) |
| `kehityskohde` | 0 | 0 | |
| `pelivaihe` | 1 ("Hyökkäys") | 0 | |
| `ika_min` | 14 | 0 | |
| `video_url` | **0** | **0** | |
| `kuva_url` | 81 (Storage-polku) | 0 | |

`pelikonteksti`-arvot (KPV, 89 harjoitetta): 1v1 hyökkääminen 13, 1v1 puolustaminen 10, Laukominen 8, Kuljettaminen 7, Alkulämmittely 7, Harhauttaminen 6, Kääntyminen 6, Syöttäminen ja 1. kosketus 6, Suojaaminen 5, Syöttöpelit 5, Nopeus ja ketteryys 4, Kuljetus ja kääntyminen 2, Kuljetus ja laukaus 2, Kuljetus ja syöttö 2, Kuljetus ja harhautus 2, Kuljetus ja suojaaminen 2, Peliosuus 1, Murtautuminen ja maalinteko 1.
`valmennuslinja/teemat.jaksot[]` sisältää kentän `konsepti` (id, joukkue, jakso, viikot, alkaa, paattyy, teema, konsepti, …), mutta sitä ei ole täytetty (KPV 7 hyväksyttyä jaksoa: 0; SJK 7 luonnosta: 0). Ohjelmien liikkeillä (150 kpl / seura) on kentät `video_url` ja `kuva_url`.

**Vastaus kysymykseen 7 (vain luvut): KPV:n 105 hyväksytystä harjoitteesta Y-konseptiin osuu 0** (`teema_avain`-kenttää ei ole; `konsepti` täytetty 1 harjoitteella eikä sen arvo ole konseptiavain; `painopiste` täytetty 0:lla). Osumia konseptia kohti: 0 kaikilla 14 konseptilla. **Yhteistä avainta ei siis ole nyt**; lähin ehdokas on `pelikonteksti` (89 harjoitetta, 18 arvoa) + `tags`, jotka vaativat vastaavuustaulun TM-konsepteihin (vaihtoehto a).

| Vaihtoehto | Mitä | Työmäärä | Arvio |
|---|---|---|---|
| (a) Vastaavuustaulu konsepti → harjoite-id:t lähteittäin | seuran dokumentti `konfiguraatio/harjoitelahteet` tai oma `konsepti → [id]` | Pieni: lib-funktio + taulu + testit ≈ 1–1,5 pv; täyttö käsin per seura (Linjapankki voi tuottaa) | Joustava, harjoitteiden dokumentteihin ei kosketa; ei laajene automaattisesti |
| (b) Tagit harjoitteisiin (`konsepti`/`konsepti_osa`) | kenttä pankin harjoitteeseen | Keskisuuri: tuonti + normalisointi + Rules (valmentaja saa taggata?) ≈ 2–3 pv; vaatii tuonnin uudelleenajon | Skaalautuu; osakohdistus (a/b/c) vaatii uuden kentän, jota ei nyt ole |

Lukujen valossa: kumpikaan avain (`konsepti`, `painopiste`) ei ole käytössä, joten (b) vaatisi kentän täytön 89+ harjoitteelle, kun taas (a) voi lähteä liikkeelle 18 `pelikonteksti`-arvosta (taulu pelikonteksti → Y-konsepti, ≈ 18 riviä KPV:lle; jokainen seura tarvitsee oman taulunsa). Kumpikaan ei kohdista osaan (a/b/c/d). **Ei ratkaistu tässä.**

## 9. Ristiriidat briefin kanssa (raportoitu, ei ratkaistu)

1. **`teema_avain` ei ole harjoitepankin kenttä.** KPV:n 124 dokumentissa on `konsepti` (kenttä 35 dokumentissa, **täytetty 1:ssä**, arvo "Hyökkäys"), ei `teema_avain`ia. `teema_avain` on vain `ohjelmat`-dokumenteissa (täytetty 0/15). Vaiheen 2 ensimmäinen lähdeehto ("teema_avain vastaa jakson konseptia") **ei täyty yhdelläkään KPV:n harjoitteella**; seura → TM-järjestys antaisi nykydatalla aina TM-konseptipelin.
2. **`painopiste` ei kohdista osaan (a/b/c/d).** Kenttä on olemassa 89:ssä KPV-dokumentissa mutta **täytetty 0:ssa** (KPV: 0/124; seuraa kohden täytettyjä: 0). Se on lisäksi vapaa luokittelu (`tmHarjoiteHaku` käyttää sitä haun pisteytykseen), eikä osakohdistukseen ole kenttää.
3. **Kysymykset ≠ osat:** 3 kysymystä per konsepti, 3–7 osaa. Ei kohdistettavissa.
4. **Kirjoitusoikeus:** brief sallii valmentajan `video_url`-kirjoituksen; nykyiset Rules sallivat harjoitepankin kirjoituksen vain VP/UTJ/SA → Rules-muutos tarvitaan (kohta 7). Seurasihteeri voi kirjoittaa `konfiguraatio/harjoitelahteet`, vaikka brief sanoo "vain ylläpitäjä".
5. **Pelaajan silmin ja pankki:** pelaaja ei voi lukea `kaytto: joukkue` -harjoitteita (KPV 123/124) → pelaajan oman näkymän data vain `tmTtPelaaja()`:sta (TM-konseptipeli), ellei harjoitteesta tehdä snapshotia.
6. **KPV:llä ei ole yhtään videolinkkiä** ja SJK:lla ei kuvia eikä videoita: "Katso video" näkyy aluksi vain käsin lisätyille linkeille.
7. **`http`/`https`:** nykyiset validaattorit (`tm_jakso_malli`) hyväksyvät `http(s)`; brief vaatii vain `https`.
8. **Palloliiton linja:** pelkkä tiivistelmä viikkopohjista; ei harjoitteita eikä lupaa — ei koodiin (kuten briefissä).

## 10. Vaiheen 2 riskit

- Hyväksytyistä KPV-harjoitteista **0 kohdistuu konseptiin** nykyisillä kentillä → ilman vastaavuustaulua tai täyttöä kaikille näytetään konseptipeli.
- Sibbo: Y-konseptit ovat ruotsiksi (14/14), mutta seuran oma linja puuttuu kokonaan; lähdejärjestys "seura → TM" tuottaa Sibbolle aina TM-konseptipelin.
- Videot: ei yhtään `video_url`:ia KPV:llä eikä SJK:lla, joten "Katso video" on aluksi tyhjä kaikille; konseptipeleillä ei voi olla seuran linkkiä. Pelaajalle (kaytto) 123/124 KPV-harjoitteesta ei ole lukuoikeutta.
- Ruotsin avaimet vaiheessa 2: uudet fi-avaimet → `SV_ODOTTAA` + Gemini-erä.
- Kolmas osapuoli: KPV:llä 1 `kolmas_osapuoli`-harjoite (luonnos) — ei näytetä (luonnos).

## 11. Päätökset kohtaan 9 (Tero/PM 13.10.; vaihe 2 hyväksytty näillä)

1. **Hakukenttä:** harjoite haetaan pankin kentällä `konsepti`, ei `teema_avain`. *(Seuraus: KPV:llä kenttä on täytetty 1/124:ssä, joten ennen täyttöä tai vastaavuustaulua näkyy TM-konseptipeli.)*
2. **Ei osakohtaisia harjoitteita.** Harjoite näytetään vain jakson tasolla; pankkiin ei lisätä osa-kenttää nyt (kirjataan myöhemmäksi).
3. **Cuet jakson tasolla:** "Miten valmennetaan" -lohkossa kaikki kolme kysymystä + harjoite. Osarivit avautuvat edelleen, mutta vain osan teksti, tila ja viikkohavainto — ei cueta.
4. **Rules:** valmentajalle ei löysennetä. "+ Lisää video" näkyy vain niille, joilla on jo kirjoitusoikeus pankkiin (VP, UTJ, SA). `konfiguraatio/harjoitelahteet` kiristetään niin, että kirjoittaa vain SA ja VP — **samassa PR:ssä kuin testivastaavan kiristys**. Siihen asti dokumenttia ei kirjoiteta käyttöliittymästä, ja oletusjärjestys (seura → TalentMaster) on koodissa.
5. **Pelaajan silmin:** vain TalentMaster-data (`tmTtPelaaja()`): cuet ja konseptipelin nimi. Seuran harjoitetta ei näytetä pelaajalle, snapshotia ei tehdä nyt.
6. **Video:** "Katso video" vain jos linkki on olemassa (KPV:llä ei yhtään); kuvan näyttö ennallaan.
7. **https:** uusi `video_url`-syöttö hyväksyy vain https; muiden linkkien nykyistä validointia ei muuteta.
8. **Lisenssit:** ~~fysiikkapankki ei näy uudessa näkymässä~~ — **kumottu 13.10. (kohta 13):** fysiikkalinja on Teron / TalentMasterid Oy:n omaa aineistoa, ja fysiikkaharjoitteet saa näyttää toimintakortissa. **HPP-pankki ei näy uudessa näkymässä**; sen `LISENSSIT.md`-luonnos (kohta 6.3) jää raporttiin.
9. **Tuontiskriptit:** `lupa`- ja `video_url`-kenttien lisäys `tuo_harjoitepankki.js`:ään on oma pieni PR B4:n jälkeen.

## 12. KPV: pelikonteksti-arvot (vain luvut; Teron 13.10. ajama vain luku -skripti)

KPV:n harjoitepankissa 124 harjoitetta; **pelikonteksti täytetty 89:llä (18 eri arvoa)**, joista hyväksyttyjä 88, luonnoksia 1 ja arkistoituja 0. Hyväksyttyjä harjoitteita on yhteensä 105 (arkistoimattomia 88); **loput 17 hyväksyttyä ja kaikki 35 arkistoitua harjoitetta ovat ilman pelikontekstia** (Ketteryys/Rutiinit-tuonti ym.). Ikäväli = `ika_min`–`ika_max`; "≤N" tarkoittaa, että `ika_min` on tyhjä ja `ika_max` = N (`ika_min` on täytetty vain 14 KPV-harjoitteella). Ikäjakauma on laskettu kaikista kyseisen arvon harjoitteista (luonnos mukaan lukien; muutos on vain "1v1 hyökkääminen", jossa on yksi luonnos, ikäväli 8–19).

| pelikonteksti | hyväksytty (määrä) | luonnos / arkistoitu | ikäväli (harjoitteiden määrä) |
|---|---|---|---|
| 1v1 hyökkääminen | 12 | 1 / 0 | 8–13: 6; ≤9: 6; 8–19: 1 |
| 1v1 puolustaminen | 10 | 0 / 0 | ≤9: 5; ≤13: 4; ≤7: 1 |
| Laukominen | 8 | 0 / 0 | ≤9: 4; ≤11: 3; ≤7: 1 |
| Alkulämmittely | 7 | 0 / 0 | ≤13: 7 |
| Kuljettaminen | 7 | 0 / 0 | ≤11: 3; ≤7: 2; ≤9: 2 |
| Harhauttaminen | 6 | 0 / 0 | ≤9: 6 |
| Kääntyminen | 6 | 0 / 0 | ≤11: 2; ≤9: 2; ≤13: 1; ≤19: 1 |
| Syöttäminen ja 1. kosketus | 6 | 0 / 0 | ≤11: 3; ≤9: 2; ≤13: 1 |
| Suojaaminen | 5 | 0 / 0 | ≤11: 3; ≤9: 2 |
| Syöttöpelit | 5 | 0 / 0 | 8–13: 5 |
| Nopeus ja ketteryys | 4 | 0 / 0 | ≤9: 3; ≤11: 1 |
| Kuljetus ja harhautus | 2 | 0 / 0 | ≤11: 1; ≤9: 1 |
| Kuljetus ja kääntyminen | 2 | 0 / 0 | ≤9: 2 |
| Kuljetus ja laukaus | 2 | 0 / 0 | ≤9: 2 |
| Kuljetus ja suojaaminen | 2 | 0 / 0 | ≤11: 2 |
| Kuljetus ja syöttö | 2 | 0 / 0 | ≤11: 1; ≤9: 1 |
| Murtautuminen ja maalinteko | 1 | 0 / 0 | 10–13: 1 |
| Peliosuus | 1 | 0 / 0 | ≤9: 1 |

Yhteensä 18 arvoa. Taulu on pohja seurakohtaiselle vastaavuudelle `pelikonteksti → Y-konsepti` (ROADMAP: "Konseptivastaavuus (seura)"); **vastaavuuksia ei ole arvattu** — sisällön päättää Tero KPV-linjan tarkistuksessa.

## 13. Uudet päätökset (Tero 13.10.)

1. **Konsepti tuodaan lähteestä, ei vastaavuustaululla.** Erillistä taulua ja `konfiguraatio/konseptivastaavuus`-dokumenttia ei tehdä (korvaa ROADMAP-rivin "Konseptivastaavuus (seura)"). Vientipohjiin (Teemat, Identiteettiharjoitteet, harjoituspankki) tulee sarake "Mitä harjoitellaan" (pudotusvalikko: D248:n 14 nimeä + "ei TalentMaster-konseptia") ja pankkiin sarake `lahde_tyyppi` (oma / SoccerTutor / SPL-pohja). `tuo_valmennuslinja.js` ja `tuo_harjoitepankki.js` muuntavat nimen avaimeksi ja kirjoittavat `konsepti`, `lahde_tyyppi`, `video_url`. SoccerTutor-harjoitteista tuodaan vain nimi ja kuva (ei tekstejä). Tero esitäyttää KPV:n konseptit KPV-linjan tarkistuksessa, seura kuittaa kuittausmallilla. Arvio ~0,5 pv; ROADMAP-rivi "Konsepti vientipohjaan" (B4:n jälkeen). KPV:n kuittauspohjassa 89 riviä (kohta 12).
2. **Fysiikkalinja on Teron omaa aineistoa** (`harjoitelogiikka_v4.js` + SJK/KPV-vientipohjan fysiikkasisältö; Tero Koskela / TalentMasterid Oy). Käyttö sallittu anonyymisti kaikille seuroille; **fysiikkaharjoitteet saa näyttää toimintakortissa** (kumoaa kohdan 11 päätöksen 8 fysiikan osalta). Kirjattu `docs/LISENSSIT.md`:hen. Fysiikkaharjoite näkyy, kun jakso on fyysinen tai pelaajalla on kasvupyrähdysmerkintä. HPP-pankki pysyy poissa.
3. **D248 Sanasto** (07, lukittu 13.10.): käyttöliittymän tekstit arkikielelle (Mitä harjoitellaan · Ydinasiat · Kysy pelaajalta · Peliharjoite · osaa jo / tällä viikolla / myöhemmin · Mittaukset · Jakson arviointi · Pelaajan lupaus · Huomio …); kenttien nimet tietokannassa eivät muutu. Uusi sivu (B3/B4) ottaa sanaston käyttöön heti; vanhat näkymät sitä mukaa kuin uusitaan.
4. **Toimintakortin tekstit D248:n mukaan** (B3/B4); muuten kohdan 11 päätökset ennallaan.
