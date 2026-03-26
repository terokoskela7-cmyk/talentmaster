# TalentMaster™ — Session Summary LOPULLINEN
## 26.3.2026 — Päivitetty ilta

## Projektin filosofia
"Pelaaja ensin, hallinto vahvistaa." Järjestelmä rakennettu lapsen kehitystarpeesta ylöspäin.

## Kokonaisarkkitehtuuri — 7 kerrosta
1. Pelaaja / Master v7 — streak, XP, haasteet, leikkijä-tila
2. Valmentaja / kenttähavainto + ADAR — neljän hetken malli, 10s kirjaus
3. Game IQ / D4 — pre-scanning, ADAR U10–U19, sertifikaatti (EI SAA UNOHTAA)
4. IDP-kortti v3 — ohjaava (ei dataraportti), viikkoharjoite + havainto + pelaajan oma lause
5. IDP-aktivointi — 3 reittiä, 3 tasoa (perus/laajennettu/talentti)
6. VP / Seura.html — valmentajakutsu toimii, testattu KPV:llä ✅
7. Fyysinen → teknis-taktinen — 3 vaihetta, alkurutiini 70/30, pelipaikka, DFB-malli

Yhdistävä Firestore-data: streak, havainnot, idp_kausi, adar, idp_taso, ketjut

## Tänään tehty ✅

### IDP-kortti v3 → ohjaava
- Valmentajan viimeisin havainto skKorttiin (skHavBanneri, värikoodattu)
- Pelaajan oma tavoitelause alla-the-fold (tallentuu idp_oma_lause Firestoreen)
- Konkreettinen viikkoharjoite skKorttiin (VIIKKOHARJOITE-map, 6 ketjua × 3 ikäluokkaa)
- Spider chart 240×210 → 280×260, radius 74 → 96
- Fold-grid 280px 1fr 220px → 240px 1fr 260px

### Seura.html — valmentajakutsu
- avaaKayttajaModal() rakennettu kokonaan (ei enää ohjaa Admin-näkymään)
- kutsuModal: etunimi+sukunimi, sähköposti, rooli (6 vaihtoehtoa), joukkueet checkboxeina Firestoresta
- tallennaKutsu() → luoKayttaja CF → Firebase Auth tunnus + custom claims + salasanalinkki
- ✅ TESTATTU JA TOIMII — KPV:llä, sähköposti saapuu

### Päätös: valmentajan tunnistautuminen
Vaihtoehto A (sähköposti + Firebase Auth) — pitkässä juoksussa ainoa oikea.
Skaalautuu ilman arkkitehtuurimuutoksia. PIN (B) olisi kaatunut useamman seuran kanssa.

## GitHub-tila
- TalentMaster_Seura.html ✅ valmentajakutsu toimii
- TalentMaster_IDP_Kortti_v3.html ✅ ohjaava versio
- TalentMaster_Rekisterointi_Suostumus.html ✅
- hpp_rehab_protokollat.js ✅ 25 protokollaa
- tm_import.js + tm_empty_state.js ✅
- functions/index.js ✅ 6 funktiota, luoKayttaja toimii

KPV nykytila: 6 joukkuetta, 3 pelaajaa, 1 henkilöstö, 4 kutsua kautena.

Firebase: talentmaster-pilot, Blaze, europe-west1
apiKey: AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo

## Seuraavat askeleet — Sprint 3

1. Master-appiin sähköpostikirjautuminen valmentajalle (PIN:n rinnalle)
2. haeJoukkuePelaajat() → Firestore-kysely custom claimsien perusteella
3. tallennaPlusMerkinta() → Firestore-kirjaus localStorage:n lisäksi
4. Valmentajan kenttähavainto Firestoreen (koukku pelaajalle)
5. idp_kausi-dokumentti (kytkentä IDP:stä Masteriin)
6. KPV:n pilottidatan tuonti

Sprint 4–5: IDP-kortin 6 puuttuvaa elementtiä, streak Firestoreen,
ADAR-pisteet Firestoreen, tm_nav.js integraatio.

Ennen pilottia: poista testitietueet (Tero Koskela 1976 + Tero KOsklea 2014),
yhtenäistä ketjuterminologia (SM-ketju ≠ pelkkä suunnanmuutos).

## Master v7 — valmiina, odottaa Firebase-integraatiota
rakennaPelaajIDP(), laskeTKIKetjut(), haaste-järjestelmä, leikkijä-tila,
Coach Dashboard 6 tabilla, KOULUTUS_MODUULIT 6 moduulia sertifikaatteineen.
KAIKKI data localStorage:ssa — siirto Firestoreen on Sprint 3:n kriittisin tehtävä.

## Tunnetut ratkaisut
1. Firestore Rules: allow create JA allow update molemmat
2. Syntymäaika: Date.UTC(v, kk-1, pv) ei new Date(string)
3. onAuthStateChanged-silmukka: _kirjautuminenKesken-lippu
4. SheetJS ei Excel-tyylejä ilman Pro → openpyxl Cloud Functionissa
5. IDP + hpp_rehab_protokollat.js: SAMAAN hakemistoon
6. SM-ketju: laajempi kuin suunnanmuutos — yhtenäistettävä
