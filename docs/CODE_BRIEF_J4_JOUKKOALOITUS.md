# CODE BRIEF · J4 — Kotiharjoitteiden synkka, viikkotavoitteet ja joukkoaloitus (D32, D36)

**Kaista: Tero** (Master_v16 + VP_v25 + `lib/`). PR-kuvauksen 1. rivi "Kaista: Tero".
**Design:** `12_jaksologiikka.html`, `14_joukkueen_viikko_kentta.html` (D32), `15_kausisuunnitelma.html` (D36, viikkotavoitteet). Raportoi PR:ssä, mitä kohtaa noudatat.
**Edellytykset:** V1 (#846) mergetty. **Lippu:** kaikki uusi vain kun `seurat/{id}.liput.kentta === true`; ilman lippua ei muutoksia (snapshot-testi kuten V1).
Tee kolme osaa **kolmena committina samaan PR:ään** järjestyksessä A → B → C, jotta A voidaan tarvittaessa ottaa erikseen.

## A · #823-liitoksen synkka (korjaus V1:n jälkeen)
"Liitä jakson kotiharjoitteiksi" päivittää nyt vain `tukiosa.harjoitteet`. Kun jaksolla on `tukitavoitteet`, ne jäävät vanhoiksi.
- Liitos kirjoittaa valitun tukitavoitteen `harjoitteet` (oletus: ensimmäinen; jos tukitavoitteita on 2, kysy kumpaan) JA yhteensopivan `tukiosa`n `tmTukitavoitteetKirjoitus`-polulla, YHDESSÄ updatessa.
- Vanha jakso ilman `tukitavoitteet`-kenttää: käytös ennallaan.
- Testi: liitos jaksoon, jossa 1 ja 2 tukitavoitetta; vanha jakso; `tukiosa` = ensimmäinen tukitavoite liitoksen jälkeen.

## B · Viikkotavoitteet joukkuejaksoon (D36)
- J2-lomakkeeseen osio "Viikkotavoitteet" (valinnainen): yksi rivi per jakson viikko, ≤ 120 merkkiä, KIELLETYT-vartija.
- Esitäyttö seuran vuosikellosta, jos teemassa on viikkojako (tarkista `valmennuslinja/teemat`- ja `joukkueharjoittelu`-rakenne; SJK:lla avainasiat). Muuten tyhjä. Raportoi, mistä kentästä esitäyttö tuli.
- Data: `joukkueet/{jid}.jaksofokus.viikot: [{vk, tavoite, lahde: 'vuosikello'|'valmentaja'}]` (Rules v3.37 sallii, ei muutosta).
- Joukkuejakso-kortti näyttää kuluvan viikon tavoitteen. Pelaaja_v7:ään EI tässä (K1).

## C · Joukkoaloitus (D32)
Joukkuejakso-kortille (Master → Kausi, ja VP samalla komponentilla) osio **"Pelaajien jaksot"**:
- Lista joukkueen pelaajista (kaksoiskysely `joukkue` + `joukkueet`, §7.18). Rivi: pelaaja · ydinvahvuus · ehdotettu tukitavoite (`lyhyt` + "miksi?") · toiminto.
- **Ehdotuksia EI tallenneta luonnoksina.** Ne lasketaan lennossa samoilla funktioilla kuin V1 (`tmTukitavoiteEhdotukset`, `tmTukitavoiteMaksimi`, kesto ja päivät joukkuejaksosta). Ei uusia kenttiä, ei Rules-muutosta.
- Toiminnot riveittäin:
  - **Hyväksy**: kirjoittaa jakson täsmälleen kuten V1-modaalin tallennus (`tmAloitaJaksoKirjoitus`, yksi update per pelaaja): ydinvahvuus, ensimmäinen ehdotettu tukitavoite, päivät joukkuejaksosta, `joukkuejakso_viite`.
  - **Avaa**: avaa V1-modaalin esitäytettynä (muokkausta varten).
  - Pelaaja, jolla on jo käynnissä oleva jakso: "jakso käynnissä", ei toimintoa.
  - Ei ydinvahvuutta (ei IDP-korttia eikä pelaajan valintaa): "Avaa", ei mukana "Hyväksy kaikki" -toiminnossa.
  - Leikkijä (tukitavoitteita 0): Hyväksy kirjoittaa vain päivät ja ydinvahvuuden.
- **Hyväksy kaikki**: hyväksyy kelpaavat rivit peräkkäin (ei batch-kirjoitusta, jotta yksi hylätty kirjoitus ei kaada muita), näyttää edistymisen ja lopuksi listan epäonnistuneista. `getIdToken(true)` ennen ensimmäistä kirjoitusta.
- Kontekstihaku per pelaaja rinnakkain rajattuna (esim. 5 kerrallaan). Yhden pelaajan virhe ei kaada listaa.
- Lähde ja testiarvot näkyvät vain henkilökunnalle (D19, §7.22).

## Testit
- Lib: A-, B- ja C-osien puhtaat funktiot (rivin tila: käynnissä / ei ydinvahvuutta / hyväksyttävissä; ehdotus; kirjoitusolio = V1:n kanssa identtinen).
- Rules-emulaattori: joukkoaloituksen payload kulkee oman joukkueen valmentajalla ja VP:llä, muun joukkueen valmentajalla ei.
- KPV U13: valmentajana ja VP:nä; Topias (PHV LAH) ei saa nopeus-, voima- tai kestävyysehdotusta.
- Koko sarja (unit + functions + characterization) **viimeisen main-mergen jälkeen**, `?v=`-bumpit, mobiili 390 px.

## Ei tässä
Pelaaja_v7:n "Tämän tueksi" ja viikkotavoite (K1), kausisuunnitelma ja vaiheet (15), ryhmät (D33, Rules), viikkonäkymä ja alue → harjoite (14), tuontiskriptin laajennus harjoitepankin uusille kentille (tulee, kun Pallo-Iirojen Excel palaa).
