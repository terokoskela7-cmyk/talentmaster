# CODE_BRIEF · 35 · Kalenteri: yksi toteutus, viikkopohjat, lähteet · 11.10.2026

**Kenelle:** Code-sessio. Lue tämä kokonaan ennen ensimmäistäkään muutosta. PR:t ovat itsenäisiä ja tehdään alla olevassa järjestyksessä. Yksi PR per rivi.
**Design SSOT:** `docs/design/idp-v2/35_kalenteri_kaytettavyys.html` (§1 viikkopohjat, §2 valmentajan viikko kolmessa tilassa, §3 pikalisäys ja tuodun tapahtuman muokkaus, §4 VP:n seuran viikko, §5 kausi, §6 kuorma, §7 perhe, §8 lähteet, §9 tyhjät tilat). Visuaalinen kieli on mockup 22 ja D169 (CLAUDE.md §5). Jokaisessa UI-PR:ssä raportoidaan, mitä mockupin osiota toteutus noudattaa. Ristiriita tai aukko → kysy, älä keksi.
**Päätökset:** D180–D194 (mockupin §10) ja D195–D198 (`docs/KOKONAISKUVA_KAUSI_JAKSO_VIIKKO.md` §8: sessioiden sopimus, ryhmän viikko, kuormanäkymä, testijakson suunnittelu), ehdotus 11.10.2026. Tero vahvisti suunnan 11.10.: integraatiot (TASO, MyClub, JOPOX, iCal) tarvitaan · RSVP pelaaja ja huoltaja, viimeisin voittaa · seura rakentaa omat viikkopohjat valmennuslinjasta, Palloliiton suositus oletuksena ja demona · kuorma rinnakkain. Lukitsemattomiin D-kohtiin ei tehdä Rules- tai functions-muutoksia ennen Teron kuittausta.
**Taustadokumentit:** `docs/KALENTERI_ARKKITEHTUURI.md` (§11–13 toteutustila, §4 integraatiot), `docs/AUDIT_KALENTERI_VP_VALMENTAJA.md`, `docs/KALENTERI_COMPLETENESS.md`, mockupit 14, 15, 26 ja 28.

## Lähtötila (inventaario 11.10.2026, main `b037adb`)
- **Kaksi toteutusta.** VP_v25 L17218–18571 (noin 1 350 riviä + 45 merkintää + noin 150 sidoskoodia) ja Master_v16 L9870–11048 (noin 1 180 riviä). Jaettua on vain `lib/tm_kalenteri.js` (toistuvuus, 79 riviä), `lib/tm_ryhmat.js` (Kenelle, ryhmät, näkyvyys), `lib/tm_viikko.js` (ISO-viikko, D140) ja `lib/tm_kal_muistiinpano.js`.
- **Neljä tyyppilistaa:** VP `KALENTERI_TYYPIT` L17579 (12, emojit), Master `tyypit` L10752 (6) + `_calEvtTyyli` L9883 (oma värikartta) + selite L1870–1904 (värit, jotka eivät vastaa tyyliä), Pelaaja `_P7_TT` L2638, Vanhempi `_VANH_TT` L498.
- **Erot:** Master on vain viikkonäkymä, ja sen tuntiruudukko 15–20 pudottaa muut ajat (`c.hours` L10116). Masterista puuttuvat Paikka, teema ja muistiinpanot luonnista, eikä päivää voi muokata. VP säilyttää Timestampit, Master muuttaa ne merkkijonoiksi ja ylikirjoittaa `joukkue`-kentän nimellä. `poistettu_pvm` on VP:ssä serverTimestamp ja Masterissa ISO. Kauden loppu: VP `_laskeKausi`, Master kovakoodattu. Session-RPE vain Masterissa.
- **Masterin otsakkeen napit:** "📅 Lisää harjoitus / ottelu" ja "🏃 Luo testitapahtuma →" (Teron kuva 11.10.: emojit, isot kirjaimet, kaksi täytettyä nappia).
- **Valmiina:** RSVP (`lasnaolijat/{pid}.saatavuus` tulossa|estynyt, Pelaaja ja Vanhempi), B4 `haePelaajanKalenteri` (sallitut kentät `lib/tm_kalenteri_pelaajalle.js` L14–16), ilmoitukset (`functions/kalenteri_notif.js`, `notifTapahtumaMuistutus`, `notifKalenteriMuutos`), seuran tauko (D171).
- **Puuttuu:** iCal (vienti ja tuonti), TASO-ottelut kalenterissa, MyClub ja JOPOX, viikkopohjat (ei libiä eikä dataa), kausinäkymä.
- **Rules v3.56:** `match /kalenteri/{tapahtumaId}` L1894–1973. `valmennuslinja/{lohko}` L1128 kattaa uudet lohkot `viikkopohjat` ja `kausisuunnitelma_{kausi}` (luku henkilökunta, kirjoitus `onKonseptiMuokkaaja`) → **ei Rules-muutosta viikkopohjille.**

## Säännöt, jotka koskevat kaikkea tässä
- CLAUDE.md §0: ei pushia mainiin, ei mergeä. Kaista auto vain docs, testit ja näkymättömät `lib/`-muutokset. Muuten Tero.
- Kirjoitukset ja selaintestit vain nimetyille KPV-testipelaajille (§10). Tarkista nimi, älä luota joukkueeseen. Toiminta varmistetaan seurakäyttäjällä (valmentaja ja VP), ei SA:lla.
- VP-periaate (§4): kaikki, minkä valmentaja tekee kalenterissa, toimii myös VP:llä.
- Pelaajalle ja huoltajalle ei kuormalukuja, vaiheiden nimiä, tavoitekuormaa eikä vertailevia ryhmänimiä (§7.22, 15 §4). Data vain palvelimelta (B4).
- Uudet tekstit avaimina. sv-avaimet jätetään tyhjiksi, Gemini kääntää (Sibbo 1.11.: tyyppinimet, viikkoilmoitus, Lisää kalenteriini).
- Logiikka `lib/`-moduuleihin (§41, lib ≤ noin 500 riviä). Kuoret eivät kasva (R0, `node scripts/kuoret_kasvukatto.js`).
- D169: napeissa ei emojeja eikä isoja kirjaimia, yksi täytetty nappi per näkymä, DM Mono vain `.kt-eb`-yläotsikoissa, ei uusia tokeneita eikä hex-arvoja.
- Tämä päivä `tmPaivaIso()`, palvelimella `functions/helsinki_paiva.js` (§7.26). Viikko `TM_VIIKKO` (D140).
- Mockupin §- ja D-viitteet ovat suunnittelumerkintöjä, eivät käyttöliittymätekstiä.

## PR-järjestys

### Ennen 1.11.

**K35-1 · Tyyppirekisteri, tapahtumamalli ja jaetut kyselyt (kaista auto). Ensimmäisenä, koska toinen sessio tarvitsee `tmOnTauko`n ja `tmSeuraavaTapahtuma`n ennen 1.11.**
- `lib/tm_kalenteri_tyypit.js`: 12 tyyppiä (nykyiset VP:n avaimet ja `seuran_tauko`), `nimiAvain` (i18n), `kerros` ('valmennus'|'silmukka'|'asiat', D131), `merkki` ('harj'|'ott'|'test'|'pal'|'muu'; tyylit tokeneista, ei hex), `vainHenkilokunta` (= `TM_RYHMAT.HK_TYYPIT`, yksi lähde), `pikavalinta` (5 yleisintä, D185). Ei emojeja.
- `lib/tm_kalenteri_malli.js`: `tmKalNormalisoi(doc)` → yksi muoto molemmille sovelluksille (Timestamp → `{alkaaMs, paattyyMs, pvm}`; `joukkue` id säilyy, nimi `joukkue_nimi`; `poistettu_pvm` tulkitaan kummastakin muodosta), `tmKalKaudenLoppu(pvm)` (siirretään `_laskeKausi`n logiikka), `LAHTEEN_KENTAT` (D181: `pvm`, `alkaa`, `paattyy`, `paikka`, `tila:'peruttu'`), `tmKalSaaMuokata(kentta, ev)` (lähteen kentät lukittuja, kun `lahde !== 'manuaalinen'`).
- `lib/tm_kalenteri_kyselyt.js` (puhdas, kaksi exportia, kopio `functions/`-kansioon kuten `tm_ryhmat.js`):
  - `tmOnTauko(tapahtumat, pvm, joukkueId?)` → `{tauko:boolean, nimi?}`. **Ainoa lähde on `seuran_tauko`-tapahtuma** (D171). Korvaa `lib/tm_vp_koti.js` L107–109:n sisäisen `_tauot`-funktion ja `env.tauot`-syötteen; tyypit `tauko` ja `loma` siirretään rekisteriin aliaksina, kunnes data on tarkistettu. Mockupin 15 `kausisuunnitelma.tauot` ja mockupin 26 `kalenteri/tauot/{id}` **eivät toteudu** (D193).
  - `tmTaukopaivat(alku, loppu, tapahtumat)` → taukopäivien määrä ikkunoiden pidennykseen (D131: katselmusikkunat, eskalointi 7 pv).
  - `tmSeuraavaTapahtuma(tapahtumat, {joukkue?, ryhma?, pelaajaId?, tyyppi?, nyt})` → `{id, alkaa, paattyy, paikka, tyyppi, nimi} | null`. Pelaajakohtainen haku käyttää `TM_RYHMAT.tmTapahtumaKuuluuPelaajalle`a, jotta ryhmäharjoitukset tulevat mukaan. Käyttäjät: kehitystyöpöydän "Treenattiinko?" (lähde "kalenteri · harjoitus 17.00"), valmentajan Tänään (D142), pelaajan Viikko.
  - `tmTestijaksoEhdotus(viimeisin_pvm, MUISTUTUS_KK, VANHA_KK)` → `{muistutus_pvm, vanhenee_pvm}` kausinäkymän testijaksoriville ("Suunnittele testijakso →" avaa Kalenteri · Kausi). Rajat tulevat `lib/tm_nakyma_ryhmat.js`:stä, ei omia vakioita.
- **Pelimuoto:** viikkopohjan valinta lukee `joukkueet/{jid}.pelimuoto` ('5v5'|'8v8'|'11v11', D173, Rules toisen session PR B:ssä marraskuussa). Pohjalla on oma `pelimuoto`-tunniste ("tämä on 8v8-pohja"), mutta joukkueen pelimuotoa ei tallenneta muualle. Jos kenttä puuttuu, `tmPohjaJoukkueelle` palauttaa `null` ja näkymä pyytää valitsemaan pelimuodon kerran.
- Testit: rekisteri kattaa kaikki nykyiset tyypit; normalisointi molemmista muodoista; tauko tunnistetaan vain `seuran_tauko`sta; seuraava tapahtuma pelaajalle sisältää ryhmän tapahtuman; vartija `tests/kalenteri_yksi_rekisteri.test.js`: uutta `{testitapahtuma:…, ottelu:…}`-tyyppikarttaa ei saa lisätä HTML:ään (nykyiset neljä sallittu listalla, lista saa vain pienentyä).
- Ei käyttöliittymämuutoksia.

**K35-2 · Masterin kalenterin pikakorjaukset (kaista Tero).**
- Otsakkeen napit: "Uusi tapahtuma" (täytetty, ainoa) ja "Luo testitapahtuma" (linkki tai ääriviiva), ei emojeja eikä isoja kirjaimia. Selite rekisteristä.
- Tyyppivalinta rekisteristä (12, pikavalinnat ensin). Paikka luontiin (oletus: joukkueen viimeisin vastaava tapahtuma). Päivä muokattavaksi `_calMuokkaaTapahtuma`ssa.
- Ruudukko ei pudota tapahtumia: tunnit 06–22 tai tapahtumat ruudukon ulkopuolella "aiemmin/myöhemmin"-riville. Väliratkaisu D182:een asti.
- Testit: tapahtuma klo 09 ja 21 näkyy; uusi tapahtuma tallentaa `paikka`; selaintarkistus KPV P13 valmentajalla ja VP:llä (kuvat tumma, vaalea, 390).

### Marraskuu

**K35-3 · Viikkopohjat ja Täytä viikko -logiikka (kaista auto).**
- `lib/tm_viikkopohja.js`:
  - `POHJAT_PALLOLIITTO` luetaan tiedostosta `docs/data/spl_viikkopohjat_2023.json` (kuusi pohjaa: 3v3, 5v5, 8v8 lapsuus, 8v8 nuoruus, 11v11 nuoruus, 11v11 erikoistuminen; harjoitusmäärät, kestot, harjoitustapahtuman rakenne, 11v11:n esimerkkiviikon päiväprofiili; sivuviitteet). `lahde:'palloliitto'`, `lahde_viite:'Palloliiton valmennuslinja 2023, s. N'`. Ikä on ohjeellinen; pohjan valinta tehdään pelimuodosta (D173), ei iästä. Vartija: JSON ja lib pysyvät samassa (testi lukee tiedoston).
  - Skeema `valmennuslinja/viikkopohjat`: `{pohjat:[{avain, nimi, pelimuoto, ikavaihe, lahde:'palloliitto'|'seura', paivat:[{md, viikonpaiva_oletus, painotus, kesto_min, alue, pelimuoto, rpe_min?, rpe_max?}], peli:{maara, teksti}}]}`. `rpe_*` vain 11v11 (D26). Lisäksi `tmViikkopohjaVirhe(pohja)`.
  - `tmKausivaihe(kausisuunnitelma, pvm)` ja `tmPohjaJoukkueelle(pohjat, kausisuunnitelma, joukkue, pvm)` (D34; ilman kausisuunnitelmaa pelimuodon mukaan).
  - Pohja voi kuulua joukkueelle tai ryhmälle (`kohde: {joukkue}|{ryhma}`, D196). Ryhmän vastaava (`ryhmat.vastuu_uid`) saa käyttää Täytä viikkoa ryhmälle.
  - `tmTaytaViikko({pohja, vaihe, ottelut, tauot, historia, kokoonpanot, maanantai})` → `{ehdotukset:[{pvm, alkaa, paattyy, paikka, tyyppi:'harjoitus', md, painotus, teema?}], paallekkaisyydet:[{pvm, pelaajia, toinen_tapahtuma_id}], ohitetut:[{pvm, syy:'tauko'}]}`. Päivät lasketaan ottelusta (14), ilman ottelua oletuspäivistä. Ajat ja paikka tulevat `historia`sta (joukkueen viimeisin saman viikonpäivän harjoitus), muuten pohjan oletus 17.30 + kesto. Taukoviikot ohitetaan.
- Testit: ottelu la → ma −5, ke −3, to −2; ei ottelua → oletuspäivät; tauko → 0 ehdotusta; päällekkäisyys ryhmän kanssa (3 yhteistä pelaajaa) tunnistetaan; 5v5 ei saa `rpe_*`-kenttiä.

**K35-4 · Demolataus (kaista Tero, Tero ajaa).** `scripts/lataa_viikkopohjat.js --seura <id> [--joukkue <id>] [--kirjoita]`. Oletuksena kuiva-ajo, joka tulostaa lukumäärät. Kirjoittaa `valmennuslinja/viikkopohjat` (Admin SDK). Ei koske olemassa olevaan seuran omaan pohjaan ilman `--korvaa`. Ensin FC Demo, sitten KPV P13 (testijoukkue) Teron päätöksellä.

**K35-5 · TASO-ottelut kalenteriin (kaista Tero, functions).** `tasoHaeSeuranOttelut` + uusi ajastettu synkka `kalenteriTasoSynkka` (europe-west1, Helsingin aika) → `kalenteri/{id}` `lahde:'taso'`, `lahde_id:'taso_<id>'`, `tyyppi:'ottelu'`. Joukkueen yhdistäminen: `konfiguraatio/kalenterilahteet.taso.joukkueet{taso_id: jid}`. D181: synkka kirjoittaa vain `LAHTEEN_KENTAT`, poistunut ottelu → `tila:'peruttu'`. Muutos laukaisee nykyisen `notifKalenteriMuutos`in (ei uutta ilmoituspolkua). Yhdistämättömiä joukkueita ei tuoda. Testit: dedup, siirto, perutus, TM-kenttiä ei ylikirjoiteta.

**K35-6 · Täytä viikko Masteriin (kaista Tero).** VP- ja valmentajanäkymät pysyvät erillisinä (D186 tarkennus, Tero 11.10.): yhteistä on data, tyyppirekisteri ja laskenta, ei näkymä. Sisältää Rules-muutoksen ryhmän vastaavalle (D196): luonti ja täysi muokkaus tapahtumiin, joiden `kohde.ryhma_id` on oma ryhmä (`ryhmat/{rid}.vastuu_uid == auth.uid`). Versio + changelog + Rules-testi.
- Masterin oma kalenteri (ei yhteistä näkymäkomponenttia, D186 tarkennus 11.10.): päiväsarakkeet, kortit aikajärjestyksessä (D182, mockup §2), mobiilissa päivät riveinä. Esikatselutila katkoviivakortein, päällekkäisyys amber-kortissa. Yksi signaalikortti, jossa on Täytä viikko tai Vahvista N harjoitusta. Monista viikko ja Lisää yksittäinen tapahtuma linkkeinä.
- Vahvistus kirjoittaa batchina (`luoja_uid`), ja perheet saavat yhden viikkoilmoituksen (`pelaajat/{pid}/notifikaatiot`, D192). Ilmoitus on uusi päätöshaara `kalenteri_notif.js`iin: tunniste `viikko_<jid>_<isoviikko>`, ja saman batchin yksittäiset muutosilmoitukset ohitetaan. Tämä on functions-muutos, joten sen voi tehdä omana PR:nään.
- Näkymä on Masterin oma. VP:n seuran viikko on eri näkymä (K35-8); molemmat käyttävät samaa `tmTaytaViikko`a ja tyyppirekisteriä.
- Selaintarkistus: KPV P13 valmentaja ja VP, kolme tilaa, tumma, vaalea ja 390.

### Joulukuu

**K35-7 · iCal-vienti (kaista Tero, functions + Rules; vaatii D190-kuittauksen).** HTTPS-funktio `kalenteriIcal` (europe-west1): RFC 5545, `UID` = tapahtuman id, `SEQUENCE` = muokkauslaskuri, perutut `STATUS:CANCELLED`. Token on tilaajakohtainen (pelaaja, huoltaja tai henkilökunta), hajautettuna palvelimella (`kalenteri_tilaukset/{hash}` → `{seuraId, pelaajaId|uid, rooli}`), ja sen voi luoda uudelleen. Sisältö on sama kuin `haePelaajanKalenteri`n sallittujen kenttien lista (`tmProjisoi`), ei nimiä. Rules: `kalenteri_tilaukset` vain palvelin. Pelaajaan ja Vanhempaan "Lisää kalenteriini" -sheet (mockup §7). App Check ei koske syötettä (kalenterisovellus ei osaa), joten token on ainoa suoja. Dokumentoi tämä PR:ssä.

**K35-8 · R1: VP:n Kalenteri-sivu (kaista Tero).** Osana R1:tä (VP_v25:n jako). VP:n oma näkymä (ei Masterin kalenterin kopio, D186 tarkennus 11.10.), yhteiset libit; välilehdet Viikko · Kausi · Viikkopohjat · Lähteet · Kuorma (D180, D197). SA:lla seuravalitsin ennen latausta (§3). Testijakson sheet (D198) samaan PR:ään tai omanaan. Seuran viikko (D187, mockup §4): joukkueet × päivät ikävaiheittain, ryhmät riveinä, kerrokset ja poikkeamat. Poikkeamat ovat `lib/tm_kalenteri_poikkeamat.js`: päällekkäisyys pelaajalla, täyttämätön viikko kun pohja on olemassa, synkkavirhe, ottelu ilman edeltäviä harjoituksia. Kausi (mockup §5) ja Viikkopohjat-työkalu (mockup §1) tallentavat `valmennuslinja/viikkopohjat`. Ei rakenneta VP_v25:een ennen R1:tä.

### Tammikuu ja myöhemmin

**K35-9 · iCal-tuonti (kaista Tero, functions).** `kalenteriIcalTuonti` ajastettuna 60 min välein: `konfiguraatio/kalenterilahteet.ical[{url, joukkue, tyyppi_oletus, lahde_nimi:'jopox'|'muu'}]`. URL on salaisuuden kaltainen, joten se ei saa näkyä selaimessa kokonaisena. `lahde_id:'ical_<UID>'`. D181-säännöt kuten K35-5. Lähteet-näkymä VP:lle (mockup §8). Ennen toteutusta: vahvista JOPOXilta tai seuralta, että iCal-linkki on saatavilla.

**K35-10 · MyClub API (kaista Tero, functions).** ARKKITEHTUURI §4.1: polling 15 min, `updated_after`, avain Secret Managerissa (`runWith({secrets})`, §39), ryhmäyhdistäminen. Vain seuralle, joka on tilannut API:n. EU-sijainti: MyClub on suomalainen palvelu, mutta käsittelijäsuhde kirjataan alihankkijalistaan (§39).

**K35-11 · Kuorma rinnakkain (kaista Tero, K5:n yhteydessä).** `lib/tm_kuorma_rinnakkain.js`: `{valmentaja: valmentaja_rpe, pelaajat: mediaani, vastasi, n, ero, huomio: |ero| > 2}`. Pelaajien luku vasta, kun vastanneita on vähintään 50 % (D139). Näytetään vain henkilökunnalle. Vartija: pelaaja- ja huoltajanäkymissä ei kutsuja.

## Rajapinnat toiseen sessioon (lisäbriiffi 11.10., tarkistettu)
- **Yhteiset tiedot, yksi lähde:** pelimuoto `joukkueet.pelimuoto` · jaksot `jaksofokus` (kalenteri näyttää nauhoina, ei omista) · ISO-viikko `lib/tm_viikko.js` · tauot `seuran_tauko` (D193) · seuraava tapahtuma `tmSeuraavaTapahtuma` · testirajat `MUISTUTUS_KK`/`VANHA_KK` `tm_nakyma_ryhmat.js`:stä. Kokonaiskuva: `docs/KOKONAISKUVA_KAUSI_JAKSO_VIIKKO.md`.
- **Ilmoitukset (D192):** automaattiset (tapahtuma, muutos, peruutus, viikko-ohjelma, muistutus) ovat `notifikaatiot`-kokoelmassa ja vain funktiot kirjoittavat niitä (Rules v3.56 L1480–1484). Ihmisen lähettämät ("Muistuta pelaajaa", toisen session PR D) ovat `viestit`-kokoelmassa. Pelaajan sovelluksessa yksi "Sinulle"-lista yhdistää molemmat selaimessa (`lib/tm_sinulle.js`, kalenterisession omistuksessa). Ei toista muistutusjärjestelmää.
- **D-numerot (sovittu 11.10.):** toinen sessio käyttää D172–D176 (D172 alue klikkaamalla · D173 aluejako pelimuodosta · D174 hyökkäys ylöspäin · D175 korttitaso · D176 PHV sanoin) ja jatkaa D177–D179 ja D200→. D108 = viikkohavainto. D109–D121 on mockupin 23. Kalenteri käyttää D180–D199.
- **Jaetut tiedostot:** kalenterin koodi-PR:t Masteriin ja VP:hen vasta #995:n mergen jälkeen; ROADMAP-muutokset #998:n jälkeen. `docs/design/idp-v2/README.md` on molempien käytössä: yksi rivi per mockup, ei muita muokkauksia.

## Avoimet (Tero)
1. D180–D191 kuittaus. Erityisesti D190 (pelaajakohtainen iCal-token) ennen K35-7:ää ja D188 vs. D27 (kumpi luku ensin mobiilissa).
2. Palloliiton pohjien ikäkohdistus ennen K35-4:ää (lähteen sarakkeita ei ole sidottu ikävuosiin).
3. JOPOX-iCal-saatavuus ja MyClub-API-tilaus (KPV, Sibbo) ennen K35-9:ää ja K35-10:tä.
4. Sibbo 1.11.: kalenterin sv-avaimet Gemini-erään (lisätään sv-erän 19 jatkoksi).
