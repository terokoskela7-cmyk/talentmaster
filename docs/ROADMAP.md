# TalentMaster™ — Kehityssuunnitelma (Roadmap)

## ✅ TEHTY (Sprint 1-2)

### Firebase-infrastruktuuri
- [x] Firebase-projekti `talentmaster-pilot` luotu
- [x] Firestore-tietokanta (europe-west1)
- [x] Firebase Authentication — Email/Password
- [x] 7 käyttäjää luotu (6 VP + 1 super-admin)
- [x] Seurarakenne Firestoreen (6 seuraa)
- [x] Custom claims VP:ille ja super-adminille
- [x] Firestore Security Rules — tietosuoja rakenteellisesti
- [x] GitHub Actions — automatisoitu setup

### VP-dashboard (v17)
- [x] Firebase-integraatio (luku + kirjoitus)
- [x] Sähköpostikirjautuminen PIN-koodin rinnalle
- [x] Session-load: kirjaukset haetaan Firebasesta kirjautuessa
- [x] Stale-while-revalidate: pikakirjaus-modal päivittyy Firebasesta
- [x] Dynaaminen seuralisäys: pilottiseurat näkyvät vaikka ei tm_data.js:ssä

### Admin-näkymä (TalentMaster_Admin.html)
- [x] Super-admin kirjautuminen
- [x] Seurojen listaus Firebasesta
- [x] KPI-kortit (seuroja, käyttäjiä, kirjauksia)
- [x] Uuden seuran luonti modalista → Firestore
- [x] Käyttäjät-välilehti seurakohtaisesti
- [x] Tilastot-välilehti

---

## 🔄 KESKEN / SEURAAVAKSI (Sprint 3)

### Pilottidatan tuonti
- [ ] KPV: harjoitettavuuskartoitukset → Firestore
- [ ] KPV: edellisen kauden testidata → Firestore
- [ ] Pallo-Iirot: 3 joukkueen data → Firestore
- [ ] Ylöjärven Ilves: testidata + tekniikkakilpailut → Firestore
- [ ] FC Lahti: joukkueet ja pelaajat → Firestore
- [ ] Excel/CSV tuonti-toiminto admin-näkymään

### Admin-näkymän laajennus
- [ ] Uuden VP:n kutsuminen sähköpostitse
- [ ] Seuran tietojen muokkaus
- [ ] Käyttäjän poisto / deaktivointi
- [ ] Pakettitason vaihto

### VP-dashboard parannukset
- [ ] Musta ruutu → tyhjä seura näyttää tervetuloa-näkymän
- [ ] Super-admin näkee kaikki seurat dropdownissa
- [ ] Seuran vaihto super-adminille

---

## 📋 TULOSSA (Sprint 4-5)

### Autentikointi laajennus
- [ ] Valmentajatunnukset joukkuekohtaisilla oikeuksilla
- [ ] VP voi kutsua valmentajia itse admin-näkymästä
- [ ] Salasanan vaihto sovelluksessa
- [ ] PalloID-linkitys (kun Palloliiton API saatavilla)

### Tietosuoja
- [ ] GDPR-suostumuslomake pelaajille/huoltajille
- [ ] Datan poistopyyntö-toiminto
- [ ] Audit trail — kuka muutti mitä milloin

### Datan synkronointi
- [ ] tm_data.js → Firebase migraatio (historiallinen data)
- [ ] Offline-tuki: kirjaukset tallentuvat LocalStorageen → synkronoidaan kun verkko palaa
- [ ] Reaaliaikainen kuuntelu (Firebase onSnapshot)

### Lajilaajennus
- [ ] Lajiriippumaton tietokantarakenne
- [ ] Salibandy-konfiguraatio
- [ ] Jääkiekko-konfiguraatio

### Laskutus ja sopimukset
- [ ] Pakettien hallinta admin-näkymässä
- [ ] Asiakkuuden vanhentuminen / uusiminen
- [ ] Laskutusintegraatio (Stripe tai vastaava)

---

## 🎯 PILOTTITAVOITTEET

| Seura | Status | Prioriteetti |
|---|---|---|
| FC Lahti Juniorit | 🟡 Kirjautuminen toimii, data puuttuu | Korkea |
| KPV | 🔴 Ei dataa | Korkea (harjoitettavuuskartoitus) |
| Pallo-Iirot | 🔴 Ei dataa | Korkea (3 joukkuetta) |
| Ylöjärven Ilves | 🔴 Ei dataa | Korkea (tekniikkakilpailut) |
| SJK Juniorit | 🟡 Tunnus luotu | Normaali |
| GrIFK | 🟡 Tunnus luotu | Normaali |
