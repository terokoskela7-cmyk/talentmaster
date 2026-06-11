# Tehtävä: Vanhempi_v2 — lapsen tekniikkaprofiili + "miten tukea" -kerros

> Tausta: vanhemman apissa ei näytetä testituloksia lainkaan (Koti/Viikko/
> Viestit/Kortti/Asetukset). Pilotin arvolupaus perheelle vaatii tämän:
> vanhempi näkee heti rekisteröinnin jälkeen mitä lapsen datalla tehdään.
> Linjaus (Tero 2026-06-11): positiivinen psykologia + "miten tukea" -ohjaus
> on näkymän ydin, ei lisuke.

## UUSI PERIAATE — perheviestinnän §7.22 (kirjaa dokumentteihin)

Vanhemmalle näytetään SAMA positiivinen kehys kuin lapselle — ei enempää dataa,
vaan enemmän kontekstia. Mekanismi: lapsi ei ahdistu suoraan datasta vaan
vanhemman painostuksen kautta (vanhempien tulosvertailu on tutkitusti
nuorisourheilun dropout-tekijä). Siksi vanhemmalle EI KOSKAAN:
- kohorttitasolukuja (T1–T5) eikä percentiilejä
- TKI-laskua tai punaisia deltoja
- vertailua muihin pelaajiin tai "ikäluokan keskitasoon"
- uhka-/kiirekehystä ("ikkuna sulkeutuu")
Sen sijaan AINA: vahvuus ensin · prosessikehu tuloskehun sijaan (Dweck) ·
autonomiaa tukevat vinkit (Deci & Ryan SDT) — "tee yhdessä, kehu yrittämistä".
Kirjaus: CLAUDE.md §16:n yhteyteen oma momentti "Perheviestintä" +
TKI_ANALYYSIMALLI.md roolinäkymiin neljäs rivi (vanhempi).

## Osatehtävä A — Tekniikkaprofiili-osio Kortti-välilehteen

Sijoitus: Kortti-välilehti (rKortti), kausikortin ALLE oma osio — ei uutta
tabia (5 tabia on mobiilinavin maksimi). Data pelaajadokumentin pikakentistä
(§26): `tki_viimeisin`, `tki_merkki`, `tki_vahvuus`, `tki_kehityskohde`,
`tk_lajit_viimeisin`, `tk_lajit_pvm`, `tk_kokonaistulos_viimeisin`,
`syntymaVuosi`, `sukupuoli` — EI alikokoelmakyselyjä.

Sisältö ylhäältä alas (sama henki kuin Pelaaja_v7 Tekniikkaprofiili, commit
0ec7cab — lainaa tekstilogiikkaa, älä keksi uutta kieltä):
1. **TKI + merkki** ("34" / 🥉 kun on) + "Mitattu {tk_lajit_pvm}"
2. **⭐ Vahvuus:** {laji lapsen kielellä} — "Tämä on {nimen} vahvin laji!"
3. **🎯 Seuraava askel:** {kehityskohde} + sama välitavoitelaskenta kuin
   pelaajalla (tkLajiViite-pohjainen; lataa docs/testit_indeksit.js?v=N →
   window.TM_TESTIT — ÄLÄ inline-kopioi funktioita)
4. **Mitalimatka** vain kun ≤15 s, positiivisesti ("Matka pronssiin: 7.3 s")
5. **Lajipalkit** — SAMA hyvyys-semantiikka kuin Pelaaja_v7:n korjauksessa
   (osuus = clamp(100 × erinomainen / arvo, 10, 100)); jos pelaajakorjaus on
   jo mergessä, kopioi sama helper, älä rinnakkaistoteuta eri kaavalla
6. **💛 Miten tukea kotona** — näkymän ydin, kehityskohteen mukaan:
   ```javascript
   const TUKIVINKIT = {
     syotto: 'Syöttötarkkuus kehittyy leikinomaisella toistolla — 10 min
       pihapeliä seinää tai sinua vasten riittää. Kehu yrittämistä, älä aikaa.',
     pujottelu: 'Pujottelu vaatii pallotuntumaa — kartioiksi käyvät kengät tai
       pullot. Tee siitä leikki, älä suoritus.',
     ponnauttelu: 'Ponnauttelu on kärsivällisyyslaji — ennätykset tulevat
       aaltoina. Juhlikaa pieniä onnistumisia yhdessä.',
     kuljetus_laukaus: 'Kuljetus ja laukaus kehittyvät vapaassa pelissä
       parhaiten — pihapelit ja vapaa pallottelu ovat arvokkainta harjoitusta.',
     pituuspotku: 'Potkuvoima kasvaa kehon mukana — tekniikka ratkaisee.
       Pitkät syötöt pihalla ovat hyvä yhteisharjoitus.'
   };
   ```
   + alle pysyvä periaaterivi: "Tärkeintä: kehu yrittämistä ja harjoittelua,
   ei tulosta. Kiinnostus kantaa pidemmälle kuin paine."
7. **Tyhjätila** kun ei TK-dataa: "Tekniikkakisa tulossa — täältä näet sitten
   {nimen} vahvuudet ja miten voit tukea harjoittelua." (positiivinen, ei
   "Ei tuloksia")

## Osatehtävä B — Dokumentointikirjaukset

1. CLAUDE.md §16 perään lyhyt momentti: "Perheviestintä (Vanhempi_v2):
   sama §7.22-kehys kuin pelaajalle + miten tukea -kerros; ei tasolukuja/
   vertailua/TKI-laskua vanhemmallekaan — painostusmekanismi."
2. TKI_ANALYYSIMALLI.md roolinäkymät: + vanhempi-rivi (sama data, neljäs
   kieli: tukemisen kieli).

## Rajoitukset — ÄLÄ RIKO

- Vanhempi_v2 käyttää template literaleja natiivisti — seuraa tiedoston omaa
  tyyliä (§7.1 koskee Python-generoituja tiedostoja)
- testit_indeksit.js ladataan script-tagilla versioparametrilla; SW
  `sw_vanhempi.js`: lisää versioitu testit_indeksit allowlistiin (cache-first
  versioidulle, kuten Pelaaja-SW:ssä) TAI anna mennä verkosta — kumpikin ok,
  mutta PRECACHEen EI saa lisätä mitään (atominen addAll, §27.4)
- Rules: huoltaja lukee pelaajadokumentin jo (onHuoltaja) — EI Rules-muutoksia;
  jos lukuoikeus ei riitäkään pikakenttiin, pysähdy ja raportoi (ei omia
  Rules-deployja)
- PWA: Vanhempi ?v-nosto + sw_vanhempi cache-versio +1 + version:bump
- Kieli: fi ensin; sv/en-käännökset tm_lang-avaimiksi vain jos Vanhempi_v2
  käyttää tm_lang:ia jo — muuten suomeksi kuten muukin appi

## Verifiointi

1. npm test vihreä · inline-syntaksi (Vanhempi)
2. Selaimessa (huoltaja TeroKoskela7@gmail.com / Topias):
   - Kortti-tab: TKI 34, vahvuus Kuljetus-laukaus ⭐, askel Syöttö 44.1→tavoite,
     matka pronssiin 7.3 s, palkit OIKEIN PÄIN (KL+pujottelu pisimmät),
     tukivinkki syötöstä + periaaterivi
   - Lapsi ilman TK-dataa (esim. SJK): tyhjätila positiivisena
   - Missään EI T-tasoja, ei punaista deltaa, ei vertailua
3. §7.22-perhekehysskannaus kaikille uusille teksteille rivi riviltä
4. Commit: "Vanhempi_v2: tekniikkaprofiili + miten tukea -kerros
   (perheviestinnän §7.22)" + push + version:bump
