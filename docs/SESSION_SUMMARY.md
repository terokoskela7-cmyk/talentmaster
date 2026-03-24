# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-03-24 ilta)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 7 aktiivista pilottiseuraa.
Tekninen perusta on rakennettu ja testattu end-to-end: Admin luo käyttäjän →
Gmail lähettää kutsun → Käyttäjä asettaa salasanan → Kirjautuu joukkueen sivulle.

Olemme nyt strategisessa käännekohdassa: tekninen pohja on kunnossa, seuraavaksi
rakennetaan seuran oma hallintanäkymä joka mahdollistaa seurojen itsenäisen toiminnan
ilman TalentMaster-ylläpitäjän apua. Tämä on skaalautumisen avain.

---

## GitHub-repositorio

https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/

---

## Tärkeimmät tiedostot

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| TalentMaster_VP_v17.html | VP-dashboard | AKTIIVINEN |
| TalentMaster_Admin.html | Platform-tason hallinta (super-admin) | AKTIIVINEN — v3 |
| TalentMaster_Master_v8.html | Valmentajan näkymä | AKTIIVINEN — testattu |
| TalentMaster_Rekisterointi_Suostumus.html | Huoltajan GDPR-suostumuslomake | TOIMII — ei Firebase-integraatiota täydellisesti |
| functions/index.js | 4 Cloud Functionia + Gmail/Nodemailer | DEPLOYATTU |
| tm_admin/backfill_claims.js | Custom Claims backfill | AJETTU kerran |
| tm_admin/firestore.rules | Security Rules (Claims-pohjainen) | AKTIIVINEN |
| .github/workflows/setup_firebase.yml | GitHub Actions deploy | TOIMII |

Vanhat tiedostot jotka voidaan poistaa: TalentMaster_VP.html, TalentMaster_Admin_v2.html,
TalentMaster_Master_v7.html

---

## Firebase

Projekti: talentmaster-pilot — Blaze plan (pay-as-you-go)
Tietokanta: Firestore, europe-west1
Auth: Email/Password + domain allowlist (terokoskela7-cmyk.github.io lisätty)
Functions: 4 Cloud Functionia deployattu europe-west1
Sähköposti: Gmail (talentmasterid@gmail.com) + Nodemailer + App Password
Deploy-kanava: GitHub Actions — ei tarvita paikallista terminaalia

KRIITTINEN: terokoskela7-cmyk.github.io on lisätty Firebase Auth authorized domains
-listalle. Ilman tätä Cloud Functions -kutsut epäonnistuvat.

### Konfiguraatio (kaikissa HTML-tiedostoissa)

const firebaseConfig = {
  apiKey:            "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain:        "talentmaster-pilot.firebaseapp.com",
  projectId:         "talentmaster-pilot",
  storageBucket:     "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId:             "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
// Functions — KRIITTINEN: täsmättävä Cloud Functionsin regioniin
const functions = firebase.app().functions('europe-west1');

---

## Käyttäjät

| Sähköposti | Rooli | Seura | Claims |
|---|---|---|---|
| talentmasterid@gmail.com | Super Admin | Kaikki | OK |
| vp.fcl@talentmaster.fi | VP | FC Lahti Juniorit | OK |
| vp.kpv@talentmaster.fi | VP | KPV | OK |
| vp.palloiirot@talentmaster.fi | VP | Pallo-Iirot | OK |
| vp.yvies@talentmaster.fi | VP | Ylöjärven Ilves | OK |
| vp.sjk@talentmaster.fi | VP | SJK Juniorit | OK |
| vp.grifk@talentmaster.fi | VP | GrIFK | OK |
| vp.hjk@talentmaster.fi | VP | HJK Juniorit | Odottaa |

VP-salasanojen kaava: TM_[SEURA]_2026! — vaihdetaan ennen oikeaa pilottia.
Super-adminin UID haetaan automaattisesti sähköpostista backfill_claims.js:ssä
(vanha UID SESSION_SUMMARYssa oli väärä).

---

## Firestore-rakenne

seurat/{seuraId}/
  nimi, kaupunki, laji, paketti, vp_uid, vp_email, aktiivinen
  joukkueet/{joukkueId}/   — nimi, ikaryhma, vuosi, valmentaja, jarjestys
  kayttajat/{uid}/         — email, rooli, joukkue, claimsAsetettu
  pelaajat/{pelaajaId}/    — perustiedot + GDPR-suostumus
  kirjaukset/{id}/         — harjoituskirjaukset
  testit/{id}/             — testitulokset
  kartoitukset/{id}/       — harjoitettavuuskartoitukset
  kutsut/{id}/             — rekisteröintikutsut vanhemmille

admins/{uid}/              — super-admin dokumentti

Joukkueet Firestoressä tällä hetkellä:
- KPV: kpv_u10, kpv_u11, kpv_u12, kpv_u13, kpv_u14
- HJK: hjk_u10, hjk_u11, hjk_u12
- Muut seurat: ei vielä joukkueita tai pelaajia

---

## Cloud Functions

| Funktio | Tyyppi | Tekee |
|---|---|---|
| asetaClaimsUudelle | Firestore trigger | Custom Claims uudelle kayttajat-dokumentille |
| paivitaClaimsRoolimuutoksessa | Firestore trigger | Claims päivittyy jos rooli/joukkue muuttuu |
| asetaSuperAdminClaims | Firestore trigger | Super-admin claims admins/-kokoelmasta |
| luoKayttaja | Callable HTTP | Luo Auth + Firestore + lähettää Gmail-kutsun |

---

## GitHub Secrets

FIREBASE_SERVICE_ACCOUNT — palvelutilin avain JSON
GMAIL_EMAIL — talentmasterid@gmail.com
GMAIL_APP_PASSWORD — 16-merkkinen App Password ilman välejä

---

## GitHub Actions toiminnot

deploy_functions — deployaa Cloud Functions (käytetyin)
backfill_claims — asettaa Claims olemassa oleville käyttäjille (ajettu kerran)
setup_seurat / setup_admin / setup_all — Firestore-alustus

---

## Testattu ja toimii

Koko käyttäjänhallintaketju on testattu 2026-03-24: super-admin kirjautuu Admin-näkymään,
luo valmentajan, Gmail lähettää kutsusähköpostin (menee roskapostiin — normaali uudelle
lähettäjälle), valmentaja asettaa salasanan ja kirjautuu Master v8:aan, näkee KPV U14
joukkueen. Sessio pysyy kun navigoidaan toiselle sivulle ja palataan.

---

## STRATEGINEN SUUNTA — mihin nyt mennään

Tämä on tärkein osio. Teimme tänään strategisen päätöksen joka ohjaa kaikkea
tulevaa kehitystä.

### Kolmitasoinen hallintamalli (alan standardi)

Analysoimme miten PlayMetrics, 360Player ja muut johtavat urheiluseurajärjestelmät
ovat ratkaisseet saman ongelman. Kaikki ovat päätyneet samaan kolmitasoiseen malliin:

Taso 1 — TalentMaster Platform (Tero / super-admin): hallinnoi seuroja, paketteja,
laskutusta. Näkee kaikki seurat aggregoituna. Ei puutu yksittäisen seuran operatiiviseen
toimintaan — mutta voi toimia minkä tahansa seuran kontekstissa pilotin aikana.

Taso 2 — Seuran hallinto (VP, UTJ, seurasihteeri): omistaa kaiken seuraan liittyvän.
Lähettää rekisteröintilinkkejä vanhemmille, hallinnoi joukkueita, kutsuu valmentajia,
hallinnoi sopimuksia ja Palloliiton kriteerejä. Toimii itsenäisesti ilman Teron apua.

Taso 3 — Operatiivinen työ (valmentajat, testivastaavat, fysioterapeutit): käyttävät
järjestelmää päivittäin. Eivät hallinnoi mitään, näkevät vain oman datansa.

### Miksi tämä on tärkeää

Ilman tätä rakennetta Tero joutuu auttamaan jokaisen pelaajan lisäämisessä. KPV:llä
voi olla 200 pelaajaa, Pallo-Iirot kolme joukkuetta — se on satoja rekisteröintejä.
Järjestelmä ei skaalaudu ilman seuran omaa hallintanäkymää.

### Nykyinen ongelma

TalentMaster_Admin.html sekoittaa tällä hetkellä Tason 1 (platform-hallinta) ja
Tason 2 (seuran hallinta) yhteen näkymään. Se toimii nyt kun Tero hoitaa kaikkea,
mutta se ei ole oikea pitkän tähtäimen ratkaisu.

### Seuraava rakennettava: Seuran hallintanäkymä

Rakennetaan TalentMaster_Seura.html — seuran oma hallintapaneeli joka sisältää:

Pelaajien rekisteröinti: VP luo kutsulinkin → lähettää vanhemmalle → vanhempi täyttää
suostumuslomakkeen → pelaaja tallentuu automaattisesti Firestoreen. Tero pystyy tekemään
saman pilotin aikana super-adminin oikeuksilla.

Joukkueiden hallinta: joukkueiden luonti, muokkaus, pelaajien siirtäminen joukkueiden
välillä, Excel-pohjan lataus testipäiville.

Henkilöstöhallinta: valmentajien kutsuminen (sama toiminto kuin nyt Admin-näkymässä
mutta seurakontekstissa).

Sopimukset ja kriteerit: Palloliiton kriteerien seuranta, seuran omat sopimukset,
kausisuunnitelmat.

Super-admin seuravalitsin: kun Tero kirjautuu Seura-näkymään, hän näkee ylävalikossa
"Toimin seurana: [valittu seura]" -pudotusvalikon. Hän voi toimia minkä tahansa seuran
kontekstissa täsmälleen kuten kyseisen seuran VP toimisi — ilman erillisiä tunnuksia.

---

## Seuraavat tehtävät tärkeysjärjestyksessä

1. SEURAN HALLINTANÄKYMÄ (TalentMaster_Seura.html) — KRIITTISIN
   Rekisteröintilinkin lähetys vanhemmalle, joukkueiden hallinta, seuravalitsin
   super-adminille. Tämä on se työkalu jonka avulla pelaajat saadaan järjestelmään.

2. TESTIPELAAJAT KPV:HEN — pelaajien lisäys Firestoreen
   Lisätään muutama testipelaaja käsin tai rekisteröintilinkin kautta ennen
   Excel-tuontityökalun rakentamista. Testataan koko ketju: pelaaja Firestoressä →
   valmentaja näkee joukkueessa → Excel-pohja latautuu pelaajilla.

3. EXCEL-POHJA JA TUONTI
   Joukkueen testipohja latautuu pelaajilla valmiina → valmentaja täyttää kentällä →
   tuo takaisin → data Firestoreen. Tämä on se työkalu jota KPV odottaa.

4. SUOSTUMUSLOMAKKEEN VIIMEISTELY
   TalentMaster_Rekisterointi_Suostumus.html on jo pitkälle tehty. Kytketään se
   kutsulinkki-järjestelmään jotta kutsuId kulkee URL-parametrina oikein.

5. VP-DASHBOARD PARANNUKSET
   Musta ruutu → tervetuloa-näkymä, super-admin näkee kaikki seurat dropdownissa.

6. IDP-KORTTI JA FIFA-KORTTI (strategisesti tärkeä myöhemmin)
   Pelaajatason pilotointi + orgaaninen kasvu jakolinkeillä.

---

## Opittua — kriittiset arkkitehtuurihuomiot

Firebase double-init on TÄRKEIN korjaus: käytä aina if (!firebase.apps.length) ennen
initializeApp():ta. Ilman tätä sessio katoaa kun navigoidaan pois ja palataan.

orderBy() Firestoressä vaatii composite-indeksin. Jos indeksiä ei ole, epäonnistuu
hiljaisesti. Ratkaisu: poista orderBy, järjestä JavaScriptissä localeCompare:lla.

YAML heredoc + ${} aiheuttaa syntaksivirheen GitHub Actions -tiedostossa. Käytä
printf:ä sen sijaan. Run workflow -nappi katoaa jos YAML:ssa on syntaksivirhe.

naytaVirhe-funktioissa tarkista aina että elementti löytyy ennen käyttöä:
const el = document.getElementById(id); if (!el) return;

onSnapshot-kuuntelija täytyy purkaa ENNEN signOut():ta. Muuten permission-denied virhe.

Cloud Functions region: sekä functions/index.js että frontend käyttävät europe-west1.
Jos ei täsmää, funktioita ei löydy.

CSS-spesifisyys: ID-selektori (#id) voittaa luokkaselektorin (.class) aina.
Näkymänvaihto tehdään style.display:llä eikä classList:llä.

Firebase sessio: yksi sessio per projekti per selain. Älä testaa eri rooleja samassa
selainistunnossa — super-admin sessio sotkee VP-testin.

---

## Bisnesmalli

Kiinteä seuralisenssi 200-400€/kausi (MRR), per-pelaaja raportti (skaalautuva),
klinikka kertamaksuna. Paketit: Perustaso / Kehitystaso / Huipputaso.

Kasvulogiikka: FIFA-kortti + jakolinkki → pelaaja jakaa kaverille → kaverin seura
tulee asiakkaaksi. Sama orgaaninen malli kuin Strava/Duolingo.

---

## HPP ELITE -yhteys

Google Sheets ID: 1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M
28 välilehteä: asiakasrekisteri, käyntiloki, vammakirjasto, harjoitekirjasto.
Integroidaan fysioterapeutin näkymän kautta tulevaisuudessa.

---

## Identiteetti-arkkitehtuuri

Firebase UID on aina "ankkuri" — PalloID ja SporttiID ovat lisätunnisteet.
Vaihe 1 (nyt): sähköposti + manuaalinen PalloID.
Vaihe 2: PalloID OAuth (Palloliitto-yhteistyö).
Vaihe 3: SporttiID universaali yli lajirajojen.
