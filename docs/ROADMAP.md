# TalentMaster™ — Kehityssuunnitelma (Roadmap)
## Päivitetty 2026-04-07

---

## ✅ TEHTY (Sprint 1–3)

### Firebase-infrastruktuuri
- [x] Firebase-projekti `talentmaster-pilot` luotu (Blaze)
- [x] Firestore `eur3` multi-region
- [x] Firebase Auth — Email/Password + Custom Claims
- [x] 7 käyttäjää (6 VP + 1 super-admin)
- [x] 7 pilottiseuraa Firestoreen
- [x] `luoKayttaja` — setCustomUserClaims (lisätty 2026-04-04)
- [x] Firestore Security Rules — tietosuoja rakenteellisesti
- [x] GitHub Actions — deploy_functions.yml

### Sivut — rakennettu ja GitHubissa
- [x] `TalentMaster_VP_v18.html` — VP-dashboard
- [x] `TalentMaster_Master_v9.html` — Valmentajan näkymä
- [x] `TalentMaster_Seura.html` — Seurahallinta
- [x] `TalentMaster_Vanhempi.html` — Huoltajan sivu
- [x] `TalentMaster_Pelaaja_v1.html` — Pelaajan sivu (**päivitetty 2026-04-07:** Stage-badge, jaksoinfo-palkki, ohjeet-popup, fiilinki-lukitus, v4-integraatio)
- [x] `TalentMaster_IDP_Kortti_v3.html` — IDP-kortti
- [x] `TalentMaster_Rekisterointi_Suostumus.html` — Suostumuslomake
- [x] `TalentMaster_UTJ_v1.html` — **UUSI 2026-04-07** Urheilutoimenjohtajan kasvattisuppilo + Firestore
- [x] `TalentMaster_Kortit.html` — **UUSI 2026-04-07** Keräilykortit: 3 perussarjaa + 4 spesiaalikorttiluokkaa + WOW-animaatio

### JavaScript-kirjastot
- [x] `harjoitelogiikka_v3.js` — T/D/S/P-harjoitteet, 70/30, ikäkielet
- [x] `harjoitelogiikka_v4.js` — **UUSI 2026-04-07** kolme kielitasoa (leikkija/rakentaja/showcase), DIAG-ketju, Everton Stage 1–5, YouTube embed-URL:t, pallo_yhteys
- [x] `hpp_rehab_protokollat.js` — 25 kuntoutusprotokollaa
- [x] `tm_testipankki.js` — 64 testiä, 8 protokollaa, FLEI (5 ketjua)
- [x] `tm_import.js` + `tm_empty_state.js` — Seura.html integraatiot

### Testikerrosjärjestelmä
- [x] Kolme testikerrosta: Tekniikkakilpailut / H-H ominaisuustestit / Harjoitettavuuskartoitus
- [x] TKI-Perus + TKI-Laajennettu (biologiseen ikään normalisoitu)
- [x] TSI, EI, FVP, OVR — laskentakaavat
- [x] FLEI 5 ketjua (SBL/SFL/LL/DIAG/DFL) — SL+FL yhdistetty
- [x] Soveltava testaus: `kattavuus`-kenttä

### Teknis-fyysinen kokonaisuus (2026-04-06)
- [x] `tm_ketju_matriisi.js` — fascia ↔ testi ↔ pallotekniikka (PENDING GitHubiin)
- [x] `TalentMaster_Valmentaja_Matriisi.html` — 5-välilehtinen työkalu (PENDING)
- [x] `TalentMaster_Koukutus.html` — 3 kohderyhmää (PENDING)
- [x] Kansainväliset esimerkit analysoitu (Ajax, KNVB, Premier League)
- [x] Fysiikkavalmentaja-kysymys ratkaistu: U8–U15 ei tarvita erillistä

### Pelaajaprosessi (testattu 2026-04-04)
- [x] VP lähettää rekisteröintikutsun → huoltaja saa sähköpostin
- [x] Suostumuslomake → pelaaja aktiivinen Firestoressä
- [x] Vanhemman sivu + Pelaajan sivu aukeavat oikein
- [x] Salasanalinkki sähköpostissa

---

## 🔄 KESKEN / SEURAAVAKSI (Sprint 4–5)

### KRIITTISIN — Testisyöttölomake
- [ ] Kartoitukset-välilehti Master v9:ään
- [ ] Harjoitettavuuslomake lukee `tapahtumaId` URL:sta → pelaajat tapahtumasta
- [ ] Tulokset tallentuvat oikeaan Firestore-rakenteeseen

### Harjoitekirjauksen Firestore-rakenne
- [x] `kirjaukset/{pvm}` rakenne: tyyppi, tehty, kesto_min, rpe, aika, fiilinki, uni, lihaskunto, fiilinki_paivitetty
- [x] Fiilinki-lukitus: päiväkohtainen tarkistus Firestoresta + visuaalinen badge
- [ ] Streak-historia Firestoreen (nyt localStoragessa)

### IDP-aktivointilogiikka
- [ ] Reitti 1: Manuaalinen pyyntö (valmentaja/TV/VP)
- [ ] Reitti 2: Automaattisignaali (X-Factor/Hidden Gem)
- [ ] Reitti 3: Talenttiohjelma (KORI-kriteerit)
- [ ] Kolme tasoa: perus / laajennettu / talenttikortti

### VP-dashboard parannukset
- [ ] OVR-jakauma joukkueittain
- [ ] HG-hälytykset (Hidden Gem -signaalit)
- [ ] ADAR-trendit yli ajan
- [ ] Streak-seuranta VP:lle

### Pilottidatan tuonti
- [ ] KPV: harjoitettavuuskartoitukset → Firestore
- [ ] Pallo-Iirot: 3 joukkueen data
- [ ] Ylöjärven Ilves: testidata + tekniikkakilpailut
- [ ] Muut seurat: `palloliittoKori` + `tmTaso` Firestoreen

---

## 📋 TULOSSA (Sprint 5–6)

### Valmentajan kenttähavainto
- [ ] Kenttähavainto → Firestore (`havainnot`-kokoelma) — UI valmis, tallennuslogiikka puuttuu
- [ ] ADAR-pisteiden tallennus Firestoreen (`adar`-kokoelma, ei `havainnot`)
- [ ] Pikamerkintä-toiminto (tyyppi + kommentti + pelaajaId)
- [ ] Valmentaja näkee tulokset suoraan Master v9:ssä

### Autentikointi laajennus
- [ ] Valmentajatunnukset joukkuekohtaisilla oikeuksilla
- [ ] VP voi kutsua valmentajia itse Seura.html:stä
- [ ] PalloID-linkitys (kun Palloliiton API saatavilla)

### Bio-ikälomake
- [ ] BioIka-lomake rakentuu `TalentMaster_BioIka.xlsx`:n päälle
- [ ] Tallentaa `maturity_offset` + `phv_tila` Firestoreen
- [ ] PHV-tila näkyy Master v9:ssä + IDP-kortissa

### Excel-tuonti
- [ ] Excel/CSV → Firestore admin-näkymässä
- [ ] openpyxl server-side (SheetJS ei tue DataValidation)

---

## 🎯 SPRINT 6–8 (Kun dataa 2–4 viikkoa)

### AI Behavioural Science -agentti
- [ ] Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä
- [ ] Puhuu VAIN oikeaan aikaan: streak katkeamassa, 3pv putki, fiilinki matala, uusi viikko, PHV-huippu
- [ ] Periaatteet: Habit loop, Implementation intention, Loss aversion, Fresh start
- [ ] Ikäkohtainen ääni: leikkija/rakentaja/showcase
- [ ] Vaatii min 2–4vk dataa ennen aktivointia

### Laskutus ja sopimukset
- [ ] Pakettien hallinta admin-näkymässä
- [ ] Laskutusintegraatio (Stripe tai vastaava)
- [ ] Asiakkuuden vanhentuminen / uusiminen

### Klinikkamoduuli
- [ ] FLEI < 40% → automaattinen klinikkamoduuli
- [ ] Vammarekisteri + RTS-kriteerit
- [ ] Fysioterapeutin näkymä

---

## 🎯 PILOTTITAVOITTEET

| Seura | Status | Prioriteetti |
|---|---|---|
| KPV | 🟡 Tunnus + testipelaaja, data puuttuu | Korkea — harjoitettavuuskartoitus |
| FC Lahti Juniorit | 🟡 Kirjautuminen toimii, data puuttuu | Korkea |
| Pallo-Iirot | 🔴 Ei dataa | Korkea — 3 joukkuetta |
| Ylöjärven Ilves | 🔴 Ei dataa | Korkea — tekniikkakilpailut |
| SJK Juniorit | 🟡 Tunnus luotu | Normaali |
| GrIFK | 🟡 Tunnus luotu | Normaali |
| VIFK | 🟡 Tunnus luotu (sv-kieli) | Normaali |
| HJK Juniorit | 🟡 Tunnus luotu | Normaali |

---


---

## 🚀 PENDING DEPLOY — Tämä sessio (2026-04-07)

Nämä tiedostot on rakennettu mutta EI vielä ladattu GitHubiin:

| Tiedosto | Muutos | Prioriteetti |
|---|---|---|
| `TalentMaster_Pelaaja_v1.html` | Stage-badge, jaksoinfo, ohjeet-popup, fiilinki-lukitus, v4-integraatio | 🔴 Kriittinen |
| `harjoitelogiikka_v4.js` | UUSI — kolme kielitasoa, DIAG, Stage 1–5, YouTube embed | 🔴 Kriittinen (pelaaja riippuu tästä) |
| `TalentMaster_UTJ_v1.html` | UUSI — kasvattisuppilo-aikajana | 🟡 Korkea |
| `TalentMaster_Kortit.html` | Spesiaalikortit (FIRE/ICON/MILESTONE/TOTY) + WOW | 🟡 Korkea |
| `ARKKITEHTUURI.md` | Päivitetty 2026-04-07 | 🟢 Dokumentaatio |
| `PERMISSION_MATRIX.md` | Päivitetty 2026-04-07 | 🟢 Dokumentaatio |
| `ROADMAP.md` | Tämä tiedosto | 🟢 Dokumentaatio |

**Latausjärjestys:** `harjoitelogiikka_v4.js` ENSIN — pelaaja-sivu riippuu siitä.

## Avoimet tekniset asiat

- Cloud Scheduler API aktivointi (tasoHaeMaatcheck): https://console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=talentmaster-pilot
- Rules-deploy saa 403 GitHub Actionsista → käytä Firebase-konsolia suoraan
- H-H normitaulukon tarkat raja-arvot: verifioi `testit_indeksit.js`:n arvot virallisesta taulukosta
- Fastly CDN cache: `?v=N` jokaisen deploy:n jälkeen
- `_pelaaja` on `let`-muuttuja — EI `window._pelaaja` — aiheuttaa renderöintivirheitä jos sekoitetaan
- `harjoitelogiikka_v4.js` ladattava ennen pääscriptejä — järjestys kriittinen
- DIAG-ketju: `sl`-avain poistunut — käytä `diag` kaikkialla
- Fiilinki-lukitus: tarkista `fiilinki_paivitetty` ennen renderöintiä
