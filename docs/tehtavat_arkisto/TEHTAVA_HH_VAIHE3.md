# Tehtävä: H-H/TSI VAIHE 3 — Pelaajan fyysinen/TSI-tavoite + selitesanasto (D1/D2 ym.)

> Speksi: `docs/HH_TSI_ANALYYSIMALLI.md` §3.3 + §0 (PHV-suodatin). Sisartoteutus
> tekniikkatavoite-kortille (commit 0ec7cab) — sama rakenne, sama §7.22-kehys.
> Lisäksi osatehtävä C: käyttäjäpalaute "D1/D2 — mitä tarkoittaa" → keskitetty
> selitesanasto + tooltipit (koskee Master + VP, ei vain pelaajaa).

## Osatehtävä A — Pelaaja_v7: vauhti & pallo -tavoiterivit (MINÄ)

Tekniikkaprofiili-kortin tapaan, oma kortti/lohko MINÄ-sivulle kun pelaajalla on
H-H-dataa (`hh_viimeisin`). SJK-pelaajat ovat ensisijainen kohde.

1. **TSI-tavoite ensisijainen** (pallollinen — aina sallittu, ei PHV-riskiä):
   ```
   🎯 Pallo mukaan vauhtiin
   SM-pallo: 9.2 s → Tavoite: 8.8 s
   Pieni parannus joka treenissä riittää.
   ```
   Tavoite: gap seuraavaan Eerikkilä-tasoon (`hhSeuraavaTaso`); jos gap > 0.4 s
   → välitavoite arvo − 0.4 s (0.1 s pyöristys) — saavutettava askel.
2. **Fyysinen tavoite VAIN kun `hh_kehityskohde` on fyysinen testi** (pikakenttä
   on jo PHV-suodatettu — älä päättele UI:ssa): "💨 30m: 4.52 s → Tavoite 4.45 s".
   Kun hh_kehityskohde on sm_pallo tai null → EI fyysistä tavoitetta.
3. **Vahvuus ensin** kun `hh_vahvuus` on: "⭐ Nopeus on vahvuutesi!" (testinimi
   lapsen kielellä: lin30m→"Nopeus", cmj→"Ponnistusvoima", mas→"Kestävyys",
   lin10m→"Kiihdytys", sm_pallo→"Vauhti pallon kanssa").
4. **§7.22-EHDOTON:** ei tasolukuja punaisena, ei "olet hidas", ei PHV/kasvu-
   selityksiä lapselle, ei vertailua muihin, yksi tavoite kerrallaan (TSI ja
   fyysinen eivät näy yhtä aikaa — TSI voittaa jos molemmat ehdot täyttyvät),
   tyhjätila positiivinen ("Nopeustestit tulossa — silloin näet tuloksesi!").
5. Delta myöhemmin: `hh_taso_edellinen` on SJK:lla tyhjä → parannusrivi-koodi
   tehdään valmiiksi (sama pattern kuin tekniikassa: vain abs-parannus > 0
   näytetään) mutta se syttyy itsestään 2. testikierroksella.

## Osatehtävä B — TÄNÄÄN-saatteen H-H-fallback

`_tekTavoiteSaate` käyttää nyt `tki_kehityskohde`-kenttää. SJK-pelaajilla sitä
ei ole → laajenna: tki_kehityskohde → fallback `hh_kehityskohde`:
- sm_pallo → "🎯 Tämä vie sinua kohti tavoitettasi: vauhtia pallon kanssa"
- fyysinen testi (vain jos pikakentässä) → vastaava lapsenkielinen saate
- null → ei saatetta (nykyinen käytös)
ÄLÄ muuta S-harjoitelogiikkaa (FLEI, §14).

## Osatehtävä C — Selitesanasto + tooltipit (Master + VP)

Käyttäjäpalaute: "D1 / D2 🔵 2.3 / 🟢 1 — mitä tarkoittaa?" Lyhenteet ilman
selitettä toistuvat muuallakin (TKI, TSI, FLEI, H-H, PHV-koodit, ikäoletus).

1. **Keskitetty sanasto** `TM_SELITTEET` lib/tm_eerikkila_normit.js:ään TAI
   docs/testit_indeksit.js:ään (valitse se joka on ladattuna molemmissa —
   tarkista; tarvittaessa lib, joka on jo Master+VP+Excel:ssä):
   ```javascript
   const TM_SELITTEET = {
     d1: 'D1 Fyysinen — testitasojen keskiarvo, 1–5 (3 = ikäluokan keskitaso)',
     d2: 'D2 Tekninen — TKI- tai SM-testipohjainen, 1–5 (3 = ikäluokan keskitaso)',
     tki: 'Tekniikkakilpailuindeksi 0–100 ikäluokan merkkirajoja vasten',
     tsi: 'SM-pallo − SM-juoksu: paljonko pallo hidastaa (tavoite < 0.5 s)',
     flei: 'Kehon valmiusindeksi 0–100 % (liikehallintaketjut)',
     hh_taso: 'Huippu-Haastaja-testitasot 1–5 (Palloliiton normit)',
     phv: 'Kasvupyrähdysstatus (PRE/LÄH/PH/POST) — PH = kuormarajoitin',
     ikaoletus: 'Ei kasvumittausta — kehityskohde perustuu ikään (T≥13/P≥15)',
   };
   ```
   Julkinen kieli §14:n mukaan (FLEI → "kehon valmiusindeksi" jne.).
2. **ℹ️/title-tooltipit** kaikkiin paikkoihin joissa lyhenne näkyy ilman
   selitettä: Master Kehitys M3 (D1/D2-KPI — palautteen lähde), VP syvänäkymän
   Pelaajat-taulukon sarakeotsikot (D1, H-H, TKI, TSI), joukkuekorttien
   D1/D2-labelit, FYYSINEN-osion otsikot. Olemassa olevat ℹ️:t (TSI/TKI
   Master-detailissa) → vaihda lukemaan TM_SELITTEET:stä (yksi totuus).
   Mobiilissa title ei riitä → ℹ️-klikkaus näyttää selitteen (sama pattern
   kuin Testaus_v9:n ℹ-kenttäohjeet jos sellainen on; muuten pieni toast).
3. **Pelaajalle EI lyhenteitä:** Pelaaja_v7:ssä ei näytetä D1/D2/TSI-termejä
   lainkaan (osatehtävä A käyttää lapsen kieltä) — sanasto on aikuisnäkymiin.

## Rajoitukset — ÄLÄ RIKO

- §7.22 (osatehtävä A — herkin osa, lue CLAUDE.md §16 tekniikkatavoite-malli)
- §7.1 string concat · §5 tokenit · §26 vain pikakentät · §6 yksi @media
- PHV-suodatin asuu hhKehityskohde-funktiossa — UI lukee vain pikakenttiä
- PWA: Pelaaja SW-cacheversio + ?v-nosto + version:bump
- Sanasto = yksi lähde (TM_SELITTEET), ei copy-paste-selitteitä

## Verifiointi

1. npm test vihreä · inline-syntaksit (Pelaaja/Master/VP)
2. §7.22-skannaus Pelaajan uusista teksteistä rivi riviltä
3. Selaimessa:
   - SJK-pelaaja jolla hh_kehityskohde=sm_pallo: TSI-tavoite näkyy, EI fyysistä
   - SJK-pelaaja jolla hh_kehityskohde=lin30m: fyysinen tavoite näkyy
   - Topias (KPV, ei H-H-dataa): uusi kortti EI näy, tekniikkakortti ennallaan
   - Master M3 D1/D2: tooltip aukeaa ja teksti tulee TM_SELITTEET:stä
   - VP syvänäkymä: sarakeotsikoiden tooltipit
4. Commit + push + version:bump

## HUOM testidata

SJK-pelaajilla ei välttämättä ole PIN-koodeja (Excel-tuonti). Positiivinen
polku: aseta yhdelle SJK-pelaajalle PIN konsolista (SA) TAI testaa Topiaksella
asettamalla hänelle väliaikaiset hh_viimeisin+hh_kehityskohde-pikakentät
(poista lopuksi). Kirjaa kumman teit.
