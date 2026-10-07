# CODE BRIEF · Rakenne R0 — Kuorten kasvukatto

**Kaista:** auto. Työ koskee vain testejä ja skriptiä, ei näkyviä muutoksia. PR-kuvaukseen kirjoitetaan "Kaista: auto", ja koko sarja ajetaan ennen auto-mergeä.
**Tausta (Tero 8.10.2026):** isot sovelluskuoret ovat skaalautuvuusriski. VP_v25 on kasvanut 14 525 rivistä (heinäkuu) 23 201 riviin (8.10.), ja Master_v16 on 11 476 riviä. Pilkkominen tehdään vaiheittain (ROADMAP "Rakennelinja"). R0 pysäyttää kasvun, ennen kuin pilkkominen alkaa.
**Periaate:** strangler (SKAALAUTUVUUS_JA_TEKNINEN_VELKA.md B1). Uusi toiminnallisuus menee `lib/`-moduuleihin, ja kuoreen tulee vain kytkentä.

## Mitä tehdään

1. **`tests/fixtures/kuoret_kasvukatto.json`**: jokaiselle kuorelle kattoarvo riveinä ja perustelu.
   - Kuoret: `TalentMaster_VP_v25.html`, `TalentMaster_Master_v16.html`, `TalentMaster_Seura.html`, `TalentMaster_Pelaaja_v7.html`, `TalentMaster_Admin.html`, `TalentMaster_Excel_Tuonti.html`, `TalentMaster_Vanhempi_v2.html`, `functions/index.js`, `tm_admin/firestore.rules`.
   - Katto on nykyinen rivimäärä mainissa + **2 % pelivaraa** (pyöristetään ylöspäin satoihin). Pelivara on kytkentöjä varten.
   - `firestore.rules` saa oman pelivaransa (+5 %), koska siihen tulee vielä v3.47–v3.50.
2. **`tests/kuoret_kasvukatto.test.js`**: laskee rivit ja failaa, jos kuori ylittää katon. Virheilmoitus kertoo:
   - montako riviä yli
   - ohjeen: "siirrä logiikka `lib/`-moduuliin. Jos katon nosto on perusteltu, muuta fixture ja kirjoita perustelu (Teron kaista)."
3. **Räikkä alaspäin**, `node scripts/kuoret_kasvukatto.js --kirjoita`:
   - Kun kuori pienenee (esim. 1.12. vanhan kortin poisto), katto lasketaan uuteen kokoon + 2 %.
   - Skripti ei koskaan nosta kattoa automaattisesti. Nosto tehdään käsin fixtureen perustelun kanssa.
4. **Mittari README:hen tai ROADMAPiin** (yksi rivi): `node scripts/kuoret_kasvukatto.js` tulostaa taulukon (kuori, rivit, katto, muutos edelliseen).

## Ei tässä
- Ei koodin siirtoja eikä refaktorointeja (ne kuuluvat vaiheisiin R1 ja R2).
- Ei build-stepiä.

## Testit
- Testi menee läpi mainissa.
- Keinotekoinen ylitys (tilapäinen fixture-arvo testissä) failaa selkeällä viestillä.
- Räikkäskripti laskee katon mutta ei koskaan nosta sitä.
- Koko sarja (myös `functions/`) ennen auto-mergeä.

## Seuraavaksi (ei tässä PR:ssä, raportoi vain lyhyesti PR-kuvauksessa)
Ensimmäinen arvio VP_v25:n jaosta:
- Mitkä osiot ovat itsenäisiä (etusivu, joukkueet, pelaajakortti/V4, kalenteri, ryhmät, raportit, työkalut, viestit)?
- Paljonko kukin on riveinä?
- Mitä on kopioituna Masterista?

Tämä on pohja vaiheen R1 briiffille.
