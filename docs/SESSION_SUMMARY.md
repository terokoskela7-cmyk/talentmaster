# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-03-29)

TalentMaster on jalkapallon talenttiarviointialusta 7 aktiiviselle pilottiseuralle.
Firebase Blaze-backend on rakennettu ja toimii. Pilottikontakti: Topias Koskela (KPV),
test player ID: TM-MN67OLDO. Tänä päivänä rakennettiin massiivinen koulutusmateriaalin
yhdistelmädokumentti v3.8 joka kattaa koko HPP ELITE™ -metodologian.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_VP_v17.html` | VP-dashboard | AKTIIVINEN |
| `TalentMaster_Seura.html` | Seurahallintanäkymä | AKTIIVINEN |
| `TalentMaster_Master_v7.html` | Valmentajan näkymä | AKTIIVINEN |
| `TalentMaster_IDP_Kortti_v3.html` | Pelaajan kehityskortti | AKTIIVINEN, toimii KPV:llä |
| `TalentMaster_Rekisterointi_Suostumus.html` | GDPR-suostumuslomake | AKTIIVINEN |
| `hpp_rehab_protokollat.js` | 25 kuntoutusprotokollaa | AKTIIVINEN, oltava samassa hakemistossa IDP_v3:n kanssa |
| `functions/index.js` | 6 Cloud Functionia | DEPLOYED, europe-west1 |
| `tm_admin/firestore.rules` | Security Rules | AKTIIVINEN |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore, europe-west1
- **Auth:** Email/Password + Custom Claims käytössä

### Konfiguraatio
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
```

### Käyttäjät

| Sähköposti | UID | Rooli | Seura |
|---|---|---|---|
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Kaikki |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | VP | KPV |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

Super Admin (`talentmasterid@gmail.com`, UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`) on
absoluuttinen periaate — sillä on aina pääsy kaikkeen. Tämä ei saa koskaan rikkoutua
koodipäivityksissä.

---

## Välittömät seuraavat tehtävät (prioriteettijärjestys)

1. **Valmentajan kenttähavainto (kenttähavainto) → Firestore** — Coach field observation
2. **IDP-aktivointilogiikka** — 3 reittiä (manuaalinen / automaattinen signaali / KORI)
3. **Email + salasana -kirjautuminen Master-appiin** PIN-järjestelmän rinnalle
4. **`haeJoukkuePelaajat()`** — päivitä hakemaan Firestoresta custom claimseilla
5. **`tallennaPlusMerkinta()`** — kirjoita myös Firestoreen localStoragen lisäksi

---

## Tänään rakennettu (2026-03-29) — Koulutusmateriaalit

### TalentMaster_Koulutus_Yhdistelma_v38.docx ✅
Täydellinen HPP ELITE™ -metodologian koulutusmateriaalin yhdistelmädokumentti.
62 770 tavua. 11 osaa.

**Rakenne:**
- Osa 1 — Tiedolla johtaminen (sisältää uuden 1.6 Seuran identiteettijohtaminen)
- Osa 2 — Testimanuaali (sisältää uuden TKI-indeksin)
- Osa 3 — Game IQ™ / ADAR (sisältää Vänttinen 2015 -perustelun ikäjalkautukselle + 3.5 ADAR-psykologia-silta)
- Osa 4 — Harjoitusohjelmointi (sisältää 4.5 Teknisen taidon kultaikkuna + T-harjoite + 4.6 Omatoimiharjoitteet D/S/P/T)
- Osa 5 — Talentin tunnistaminen (sisältää 5.0 Noidankehä/Sudenkuoppa — Vänttinen/Helsen 2012)
- Osa 6 — FLEI ja fascia-analyysi
- Osa 7 — Tieteellinen perusta ja valmentajabias
- Osa 8 — Koulutusmoduulit
- Osa 9 — (jatkuu Osaan 10)
- Osa 10 — D3-psykologinen dimensio: Fulham FC -integraatio
- Osa 11 — Täydellinen lähdeluettelo

### TalentMaster_Omatoimi_Arkkitehtuuri.md ✅
Omatoimiharjoitegeneraattorin tekninen arkkitehtuurimäärittely. Sisältää
Firestore-rakenteen, generointialgoritmin syötteet, prioriteettijärjestyksen
ja ikäluokkakohtaiset rajoitukset.

---

## Tänään syntyneet uudet konseptit ja mittarit

### TKI — Tekninen taitoindeksi (UUSI)
```
TKI = (Syöttö × 0.40) + (Pujottelu × 0.30) + (SM-pallo × 0.30)
→ normalisoitu 0–100 biologiseen ikään
```
Perustuu Liikanen & Törmä 2025 painotuksiin. Eroaa TSI:stä:
TSI = tekniikka vs. nopeus (pullonkaulamittari),
TKI = absoluuttinen tekninen taso suhteessa biologiseen ikäluokkaan.
Firestore: tallennettava `tekniikka/{kilpailuId}` -kokoelmaan osana tekniikkakilpailutulosta.

### T-harjoite — Tekninen päivittäinen pallokosketus (UUSI)
Neljäs omatoimiharjoitetyyppi D/S/P-rakenteen lisäksi. Tehdään joka päivä.
Perustuu teknisen taidon kultaikkunaan (hermostollinen automatisoituminen
tehokkaimmillaan ennen murrosikää) ja Ajax/Benfica "daily touches" -filosofiaan.
U8–U12: täysin vapaamuotoinen 15–30 min palloleikki. U12–U15: puolistrukturoitu.
U15+: pelipaikkasidonnainen.

### Seuran identiteettiprofiili (UUSI konsepti)
VP:n strateginen työkalu: aggregoitu kuva seuran pelaajien viiden dimension
kehityksestä yli ikäluokkien verrattuna seuran itse asettamaan tavoiteprofiiliin.
Kausittainen — ei reaaliaikainen. Vaatii uuden Firestore-rakenteen:
`seurat/{seuraId}/identiteettiprofiili/{kaudenId}`.

### 1v1-pelitaidon todistusketju (UUSI rakenne)
Kolme todistetta: TKI (tekninen perusta) + TSI (tekniikka nopeuden alla) +
ADAR Act -pisteet (toteutus paineessa). Taso 3 -lisä tulevaisuudessa:
kenttähavainnointidata ottelutilanteiden onnistumisprosenteista.

### D3-psykologinen profiili — Fulham FC -integraatio (UUSI)
Viisi ominaisuutta: Inner Drive, Coachability, Resilience, Focus, Emotional Control.
Kolmitasoinen profilointi: itsearviointilomake (kirjallinen) + haastattelu (suullinen) +
valmentajan observointi (toiminnallinen). Tehdään 2× kaudessa.
Kyselylomake alkaa U13-ikäluokasta. Ei deselektiota yksin D3:n perusteella.
Firestore: `seurat/{seuraId}/pelaajat/{pelaajaId}/d3_profiili/{profiiliId}`.

---

## Analysoidut lähdedokumentit (tänään)

| Dokumentti | Tärkein löydös TalentMasterille |
|---|---|
| HPP_ELITE_Luotettavuusanalyysi.docx | ICC-arvot testeille, kolmitasoinen näyttöarvio (vahva/kohtalainen/teoreettinen) |
| TalentMaster_Kayttajatutkimus.html | 70/30-periaate, Peliälyketju viidentenä, kehitysvauhti tärkeimpänä mittarina |
| Jalkapallojunioreiden_fysiikka_Nevanlinna.pptx | Omatoimiharjoitteiden jaksotuslogiikka, hermoston kehitys, ikäluokkakohtaiset painopisteet |
| Biologinen-ikä-Tomi-Vänttinen.zip | Noidankehä/sudenkuoppa (Helsen 2012), havaintomotoriikan ikäkehitys (reagointi ennen murrosikää, ennakointi sen jälkeen) |
| FFC_Winning_mentality.zip | D3-psykologinen dimensio: 10 ominaisuutta → 5 TalentMasteriin, kolmitasoinen profilointi, 50-kysymyksen kyselylomake |

---

## Metodologiset periaatteet (vahvistettu tänään)

**"Siirtyykö tämä peliin?"** — Kaikella mitä järjestelmässä tehdään pitää olla
mitattava yhteys pelaajan teknis-taktisen osaamisen kehittymiseen kentällä.
Seuran johtaminen on väline tähän tavoitteeseen, ei tavoite itsessään.

**70/30-periaate** koskee alkurutiinia (20–30 min ennen kenttäharjoitusta), ei koko
harjoitusta eikä koko kehitysfilosofiaa. Kenttäharjoitus on täysin valmentajan.
70% = kokonaisvaltainen, 30% = kohdennettu pelaajan heikoimpaan liikeketjuun.

**Teknisen taidon kultaikkuna** — hermostollinen automatisoituminen on tehokkaammpaa
ennen murrosikää. T-harjoite joka päivä on tärkeämpi kuin mikään yksittäinen
fyysinen harjoite U8–U12-ikäluokassa.

**ADAR-psykologia-silta** — Re-assess = Resilience, Assess = Focus, Act = Emotional Control,
Decide = Coachability. Matala D3-profiili selittää ADAR-heikkouksia — niihin vastataan
eri harjoitteilla kuin teknisiin tai fyysisiin heikkouksiin.

---

## Seitsemän kerroksen arkkitehtuuri

```
1. Pelaaja / Master v7
2. Valmentaja / kenttähavainto + ADAR
3. Game IQ / D4 / koulutusmoduuli
4. IDP-kortti v3
5. IDP-aktivointi (3 reittiä / 3 tasoa)
6. VP / hallintajärjestelmä
7. Fyysinen → teknis-taktinen integraatio
```

Kaikki kytkeytyy Firestoreen:
`streak + havainnot + idp_kausi + adar + idp_taso + ketjut + tki + d3_profiili + omatoimi_ohjelmat`

---

## HPP ELITE -yhteys

- **Google Sheets ID:** `1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M`
- 28 välilehteä: asiakasrekisteri, käyntiloki, vammakirjasto, harjoitekirjasto
- 25 kuntoutusprotokollaa käytössä hpp_rehab_protokollat.js:ssä
- Integroitu fysioterapeutin näkymään (IDP_v3:ssa klinikkamerkinnät)

---

## Palloliitto-kumppanuus

Koulutusmateriaalin yhdistelmädokumentti v3.8 on keskeinen osa
Palloliitto-esittelymateriaalia. Kolme koulutustasoa (Taso 1–3) on
suunniteltu myös VEAT-integraationa toteutettavaksi. Seuraava askel:
outreach ja neuvottelu.

---

## Bisnesmalli

- Kiinteä seuralisenssi 200–400€/kausi (MRR)
- Per-pelaaja raportti (skaalautuva)
- Klinikka kertamaksuna
- Paketit: Perustaso / Kehitystaso / Huipputaso

---

## Kriittiset tekniset muistiinpanot (kertyneet)

1. Firestore Rules: `allow create` JA `allow update` (set+merge käyttää update jos doc olemassa)
2. Syntymäpäivä: `Date.UTC(y, m-1, d)` — EI `new Date(string)`
3. `onAuthStateChanged` loop estetty `_kirjautuminenKesken`-flagilla
4. SheetJS ei kirjoita Excel-tyylejä ilman Pro-lisenssiä
5. Näkymien vaihto: `style.display = 'none'` ei classList (CSS specificity)
6. VP-dashboard ja Admin: ÄLÄ testaa samassa selainistunnossa (yksi auth/projekti/selain)
7. `onAuthStateChanged` laukeaa ennen JS-funktioiden määrittelyä hitailla yhteyksillä — käytä `_odotaJaSiirryDashboardiin()` polling-looppia
8. GitHub Pages käyttää Fastly CDN-välimuistia — vaatii hard reload (`Ctrl+Shift+R`)
9. `tm_nav.js` lähettää `tm:logout` -eventin, odottaa 50ms, sitten `signOut()` — kaikki `onSnapshot`-kuuntelijat vaativat `window.addEventListener('tm:logout', () => { unsubscribe && unsubscribe(); })`
10. `super_admin` rooli: Firestore ja Custom Claims käyttävät alaviivaa — vanhemmissa näkymissä camelCase (`superAdmin`). `normalizeRooli()` hoitaa normalisoinnin `tm_nav.js`:ssä
11. openpyxl (server-side) vaaditaan Excel DataValidation-pudotuslistoille — SheetJS 0.18.5 ei tue luotettavasti
12. GitHub Pages: testaa aina Pages-URL:lla, ei file://-protokollalla (Firebase-kirjoitukset estetty)
