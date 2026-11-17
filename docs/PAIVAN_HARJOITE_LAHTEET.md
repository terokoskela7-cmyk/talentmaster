# Pelaajan päivän harjoite — mistä se valitaan ja vaikuttaako valmentajan jakso? (selvitys, 18.11.2026)

Vain koodin luku, ei logiikkamuutoksia. Menetelmäpäätös on Teron. Lähteet: `harjoitelogiikka_v4.js` (`laskeTekninenKehityskohde` 2726, `valitsePaivanHarjoite` 3202, `_seuranHarjoitteet` 3156), `TalentMaster_Pelaaja_v7.html` (1079, 1491, 3632), `lib/tm_naytto_lohkot.js` (324–345), `lib/tm_kotiharjoitteet.js`.

## 1. Lyhyt vastaus
**Se riippuu siitä, kuka kutsuu — ja Masterin Resepti kutsuu eri tavalla kuin pelaajan sovellus.** `valitsePaivanHarjoite` ottaa jakson huomioon vain jos kutsuja antaa `opts.jaksoEnsin === true` ja `seuraPankki`:n. Pelaaja_v7:n uusi Tänään-näkymä tekee niin; Masterin Resepti-lohko ei (`valitsePaivanHarjoite(p, null, _iso)`), joten se näyttää aina **pelkkään testidataan** perustuvan harjoitteen. KPV-esimerkki ("jaksofokus Harhauttaminen, Resepti: Sisäteräsyöttö, lähde TKI") on siis odotettu: Resepti ei ole se, mitä pelaaja näkee.

## 2. Kutsupaikat
| Kutsuja | Kutsu | Jakso mukana? |
|---|---|---|
| Master Resepti (`tm_naytto_lohkot.js:332`) | `valitsePaivanHarjoite(p, null, iso)` | **Ei** — ei `seuraPankki`a, ei `jaksoEnsin` |
| Pelaaja_v7 Tänään, Kenttä-näkymä (`rA1Kentta`, rivi 1491; lippu `liput/julkiset.kentta`) | `valitsePaivanHarjoite(p, PANKKI, tanaan, _p7SeuraPankki, { jaksoEnsin: true })` | **Kyllä** (konsepti_avain), ellei osumaa |
| Pelaaja_v7 vanha Tänään-näkymän D-kortti (rivi 1081) | `valitsePaivanHarjoite(p, PANKKI, iso)` | **Ei** — vain testidata |
| Solo_Koti (rivi 263) | `valitsePaivanHarjoite(pel, PANKKI, iso)` | Ei |

## 3. Valintajärjestys moottorissa
1. `laskeTekninenKehityskohde(p)` aina ensin (kohde + lähde): P1 `tki_kehityskohde` (TKI, korkea) → P2 SM-tasot (`tm_tekniikka`, kohtalainen) → P3 H-H fyysinen (`tm_fyysinen`, matala) → P4 oletus `pallonhallinta` (`lahde:'ikavaihe'`).
2. **Jakso ensin (vain `opts.jaksoEnsin === true`):** `jaksofokus.konsepti_avain` → etsitään seuran pankista harjoite, jolla `h.konsepti === konsepti_avain` (lisäehdot `_seuranHarjoitteet`: `lahde:'seura'`, `tyyppi:'T'`, `tila:'hyvaksytty'`, ei `kaytto:'joukkue'`, ikäväli, sama seura). Osuma → päivän treeni sieltä (`jaksosta:true`), päiväindeksi deterministinen. **Ei osumaa → jatkaa kohdan 3.**
3. Seuran oma pankki kehityskohteelle (`h.kehityskohde === kohde`); osuma korvaa TM:n oletuksen.
4. TM:n oma PANKKI: kehityskohteen mesosyklit + `T_KOHDE_PANKKI`, päiväindeksi `paiviaAktiivinen % n` (leikkijä: hitaammin).

**Tärkeä rajaus:** jaksofokus on KONSEPTI-tasoinen (esim. Harhauttaminen), TM:n oma PANKKI on KEHITYSKOHDE-tasoinen (pallonhallinta/syotto/…). Kohdassa 2 jakso voittaa vain jos **seuran pankissa on hyväksytty harjoite samalla konseptilla**; TM:n oma pankki ei tunne konsepteja lainkaan. Seuralla jolla ei ole konseptikohtaisia pankkiharjoitteita jakso ei siis koskaan vaikuta päivän T-harjoitteeseen, vaikka `jaksoEnsin` olisi päällä.

## 4. Mitä pelaaja näkee Pelaaja_v7:ssä (Kenttä-näkymä, Tänään)
- **Päivän treeni** (`tmPaivanTreeniHTML`): kohdan 3 tulos (jakso → seuran kehityskohde → TM).
- **Ydinasiat / viikon osa:** `tmTanaanOsat(jf)` + `tmViikonOsaPelaajalle` — jaksosta, ei testidatasta.
- **Kotiharjoitteet (Minä-välilehti):** `jaksofokus.tukiosa.harjoitteet[]` — valmentajan liittämä snapshot (`tm_kotiharjoitteet.js`), **ei** testidataa; tämä on jaksoon sidottu omatoiminen sisältö.
- Vanha Tänään-näkymä (lippu pois) näyttää vain testidatapohjaisen T-harjoitteen + FLEI-fallbackin.

## 5. Vaihtoehdot (ehdotus; ei toteutettu)
**A. Jakso ensisijainen, testidata täydentää (suositus).** Master-Resepti kutsuu samaa polkua kuin pelaaja (`seuraPankki` + `{ jaksoEnsin: true }`) ja näyttää lähteen ("Jaksosta: Harhauttaminen" / "Testidata: TKI"). Hyöty: valmentaja näkee sen, minkä pelaaja näkee; ei kahta totuutta. Vaatii: seuran pankin lataus Masteriin (Pelaaja_v7:ssä `_p7LataaSeuranPankki`), yksi kutsu-muutos, sekä päätös mitä näytetään kun jaksolla ei ole pankkiosumaa (nyt: hiljainen paluu testidataan → pelaaja saa eri kuin jakso sanoo).
**B. Kaksi erillistä riviä.** "Jakson fokus: X" (jaksofokus, aina) + "Testidatan ehdotus: Y (lähde TKI)" erikseen. Hyöty: ei kätke ristiriitaa; valmentaja näkee molemmat. Haitta: pelaajan treeni-ehdotus pysyy ennallaan ja jakso/testidata-ristiriita jää pelaajalle näkyviin, ellei A:ta tehdä myös Pelaaja_v7:n vanhaan Tänään-näkymään.
Kumpikin edellyttää Teron päätöstä: kuuluuko TKI-heikoin laji pelaajan päivän harjoitteeseen silloinkin, kun jakso sanoo muuta? (Nykyinen koodi: kyllä, paitsi Kenttä-näkymässä seuran konseptiharjoitteella.)

## 6. "Omatoiminen tällä viikolla: X" — yksi rivi uuden näkymän (Kehitystyopoyta.html) Polkuun
Tarvittava data on jo pelaajadokissa ja olemassa olevissa libeissä; uutta tallennusta tai Rules-muutosta ei tarvita:
- **X = viikon osa:** `TM_VIIKON_OSA.tmViikonOsa(osat, valittuKoodi)` (`lib/tm_viikon_osa.js`; valmentajan valinta "Tämän viikon fokus" voittaa, muuten ensimmäinen ei-itsenäisesti-osa) — sama sääntö jonka Kehitystyopoyta jo näyttää rivinä "Tällä viikolla: {ydinasia}" (`tm_kehitystyopoyta.js:303`). Nimi: `tmTanaanOsat(jf)` + `_naytaNimet`.
- **Tai X = kotiharjoite:** `TM_KOTIHARJOITTEET.tmKotiharjoitteet(jf)[0].nimi` (jakson tukiosa; tyhjä → rivi piiloon).
- **Omatoimisuuden määrä** (valinnainen kolmas osa): `tm_harjoituskertyma.js` `omatoimi: {n, min}` per viikko (`tmKertymaKoreista(...).viikot`) (Polku lataa jo viikon luvun `tmKtPolkuLataaViikko`; tarkista lähdekokoelma toteutuksessa).
Käytännössä: yksi uusi puhdas funktio `tmKtPolkuOmatoimiRivi(jf, osat, valittuKoodi, kertyma, c)` → teksti tai `''`, kutsutaan `tm_kt_polku.js`:n Tämä viikko -osiosta (rivin ~290 viikonOsa-kohta); i18n: yksi uusi avain (`Omatoiminen tällä viikolla: {x}`) + sv. Arvio: pieni PR (~1 lib-funktio + testi + sv-avain). Päätettävä: onko X viikon osa vai kotiharjoite (suosittelen viikon osaa; kotiharjoite jos jakso on niitä liittänyt).
