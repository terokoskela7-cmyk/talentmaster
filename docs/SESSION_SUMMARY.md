# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
# Päivitetty: 2026-03-25 ilta

## Projektin tila

TalentMaster on jalkapallon talenttiarviointialusta jossa on 7 aktiivista pilottiseuraa.
Tekninen perusta on valmis ja testattu. Tänään valmistui TalentMaster_Seura.html —
seuran hallintanäkymä joka mahdollistaa seurojen itsenäisen toiminnan ilman
TalentMaster-ylläpitäjän apua. Excel-rekisteripohja dropdowneineen on valmis.

Seuraava kriittinen askel on Excel-pohjan tuontilogiikka: täytetty pohja ladataan
takaisin → järjestelmä lukee sen → esikatselu → massakutsu huoltajille automaattisesti.

---

## GitHub

https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/

---

## Tärkeimmät tiedostot

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| TalentMaster_Admin.html | Platform-tason hallinta (super-admin + VP) | AKTIIVINEN v3 |
| TalentMaster_Seura.html | Seuran hallintanäkymä | AKTIIVINEN — uusi |
| TalentMaster_Master_v8.html | Valmentajan näkymä | AKTIIVINEN — testattu |
| TalentMaster_VP_v17.html | VP-dashboard (legacy) | AKTIIVINEN |
| TalentMaster_Rekisterointi_Suostumus.html | Huoltajan GDPR-lomake | TOIMII |
| TalentMaster_Pelaajarekisteri_Pohja.xlsx | Excel-pohja sihteerille | VALMIS |
| functions/index.js | 4 Cloud Functionia + Gmail/Nodemailer | DEPLOYATTU |
| tm_admin/firestore.rules | Security Rules (Claims-pohjainen) | AKTIIVINEN |
| .github/workflows/setup_firebase.yml | GitHub Actions | TOIMII |

Poistettavat vanhat tiedostot: TalentMaster_VP.html, TalentMaster_Master_v7.html

---

## Firebase

Projekti: talentmaster-pilot — Blaze plan (pay-as-you-go)
Tietokanta: Firestore, europe-west1
Auth: Email/Password + domain allowlist (terokoskela7-cmyk.github.io lisätty)
Functions: 4 Cloud Functionia, europe-west1
Sähköposti: Gmail (talentmasterid@gmail.com) + Nodemailer + App Password

KRIITTINEN — Firebase domain allowlist:
terokoskela7-cmyk.github.io on lisätty Firebase Auth authorized domains -listalle.
Ilman tätä Cloud Functions -kutsut epäonnistuvat "Domain not allowlisted" -virheellä.

Konfiguraatio (kaikissa HTML-tiedostoissa):
const firebaseConfig = {
  apiKey:            "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain:        "talentmaster-pilot.firebaseapp.com",
  projectId:         "talentmaster-pilot",
  storageBucket:     "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId:             "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
const functions = firebase.app().functions('europe-west1'); // region kriittinen!

---

## Käyttäjät

| Sähköposti | Rooli Firestoressä | Seura | Claims |
|---|---|---|---|
| talentmasterid@gmail.com | super_admin (alaviivalla!) | Kaikki | OK |
| vp.fcl@talentmaster.fi | vp | FC Lahti Juniorit | OK |
| vp.kpv@talentmaster.fi | vp | KPV | OK |
| vp.palloiirot@talentmaster.fi | vp | Pallo-Iirot | OK |
| vp.yvies@talentmaster.fi | vp | Ylöjärven Ilves | OK |
| vp.sjk@talentmaster.fi | vp | SJK Juniorit | OK |
| vp.grifk@talentmaster.fi | vp | GrIFK | OK |
| vp.hjk@talentmaster.fi | vp | HJK Juniorit | Odottaa |

TÄRKEÄ: Firestoressä super-adminin rooli on "super_admin" (alaviivalla).
Kaikki uudet näkymät hyväksyvät sekä "superadmin" että "super_admin".
VP-salasanojen kaava: TM_[SEURA]_2026! — vaihdetaan ennen pilottia.

---

## Firestore-rakenne

admins/{uid}/
  email, rooli ("super_admin"), superAdmin (true), luotu

seurat/{seuraId}/   ← fcl, kpv, palloiirot, yvies, sjk, grifk, hjk
  nimi, kaupunki, laji, paketti, vp_uid, vp_email, aktiivinen

  joukkueet/{joukkueId}/
    nimi, ikaryhma, vuosi, jarjestys, aktiivinen

  kayttajat/{uid}/
    email, rooli, joukkue (vanha), joukkueet[] (uusi), joukkueNimi,
    etunimi, sukunimi, aktiivinen, claimsAsetettu, luotu

  pelaajat/{pelaajaId}/
    etunimi, sukunimi, nimi, syntymaaika, joukkue, palloID, laji
    suostumus: { annettu, antaja, antajaRooli, versio, hyväksytyt, aikaleima }
    huoltaja: { etunimi, sukunimi, email, puhelin }

  kirjaukset/{id}/     — harjoituskirjaukset (valmentaja)
  testit/{id}/         — testitulokset
  kartoitukset/{id}/   — harjoitettavuuskartoitukset
  kutsut/{id}/         — rekisteröintikutsut vanhemmille (tila: lahetetty/hyvaksytty)
  sopimukset/kriteerit — Palloliiton kori-kriteerit (kori1_0: true/false jne.)
  tapahtumat/{id}/     — auditointi (pohja ladattu, kutsu lähetetty jne.)

Joukkueet tällä hetkellä:
  KPV: kpv_u10, kpv_u11, kpv_u12, kpv_u13, kpv_u14
  HJK: hjk_u10, hjk_u11, hjk_u12
  Muut seurat: ei vielä joukkueita

---

## Cloud Functions (functions/index.js)

| Funktio | Tyyppi | Tekee |
|---|---|---|
| asetaClaimsUudelle | Firestore trigger .onCreate | Claims uudelle kayttajat-dokumentille |
| paivitaClaimsRoolimuutoksessa | Firestore trigger .onUpdate | Claims päivittyy muutoksissa |
| asetaSuperAdminClaims | Firestore trigger .onCreate admins/ | Super-admin claims |
| luoKayttaja | Callable HTTP | Luo Auth + Firestore + Gmail-kutsu |

rakennaClaims-funktio — tukee joukkueet-taulukkoa:
  Valmentaja/testivastaava/fysiikkavalmentaja/fysioterapeutti:
    claims.joukkue   = joukkueetLista[0]  (yhteensopivuus Master v8:n kanssa)
    claims.joukkueet = joukkueetLista     (uusi rakenne)
  Talenttivalmentaja: ei joukkuerajausta (näkee kaikki seuran pelaajat)
  VP/sihteeri/UTJ: ei joukkuerajausta
  super_admin: ei seura- eikä joukkuerajausta, superAdmin: true

---

## GitHub Secrets

FIREBASE_SERVICE_ACCOUNT — palvelutilin avain JSON-muodossa
GMAIL_EMAIL — talentmasterid@gmail.com
GMAIL_APP_PASSWORD — 16-merkkinen App Password ilman välejä

---

## TalentMaster_Seura.html — toiminnot ja bugikorjaukset

Tämä on tänään rakennettu seuran hallintanäkymä. Se on Taso 2 kolmitasoisessa
hallintamallissa (TalentMaster Platform → Seuran hallinto → Operatiivinen työ).

Super-admin näkee topbarissa seuravalitsimen (kaikki seurat dropdownissa) ja
voi toimia minkä tahansa seuran kontekstissa. VP ja sihteeri näkevät vain
oman seuransa.

Välilehdet:
  Yhteenveto: KPI-kortit (joukkueet, pelaajat, henkilöstö, kutsut).
    Henkilöstö-KPI erottaa operatiiviset (valmentajat) ja hallinnolliset (VP) roolit.
    requestAnimationFrame varmistaa KPI-päivityksen DOM-renderöinnin jälkeen.
  Pelaajat: rekisteripohjan lataus GitHubista, yksittäinen kutsu, pelaajalistaus.
    Latausnappi avaa ohjemodal (3-vaiheinen prosessikuva) ennen latauksen käynnistymistä.
  Joukkueet: lisäys (auto-ID ei kaksinkertaistu), kutsu per joukkue, poisto.
  Henkilöstö: käyttäjälista, Joukkueet-nappi (checkbox useille joukkueille), deaktivointi.
  Sopimukset: Palloliiton kolme koria (6 kriteeriä per kori), rastiboksit,
    edistymispalkki, tallennus Firestoreen merge:true.

Korjatut bugit:
  - requestAnimationFrame ennen KPI-päivitystä (setTimeout funktion lopussa ei aja)
  - JSON.stringify siirretty data-attribuuttiin (onclick-attribuutti vaarallinen)
  - joukkueNimi käytetään rekisterimodalin kuvauksessa
  - auto-ID ei kaksinkertaistu (kpv_kpv_u14 → kpv_u14)

---

## Excel-rekisteripohja (TalentMaster_Pelaajarekisteri_Pohja.xlsx)

Rakennettu openpyxl:lla — tukee DataValidation dropdowneja (SheetJS ei tue).

Rakenne: kaksi välilehteä.
  Pelaajat: otsikot, tilastorivit (COUNTA/COUNTIF kaavat), 500 datarivit
  Asetukset: joukkueet (täytettävä, 20 riviä), roolit (Pelaaja, Maalivahti)

Sarakkeet: # | Etunimi * | Sukunimi * | Huoltajan sähköposti * | PalloID | Joukkue * | Rooli | Muistiinpanot
Dropdownit: Joukkue (Asetukset!A3:A22), Rooli (Asetukset!D2:D3)
Freeze panes: rivi 5 (otsikot 1-4 pysyvät näkyvissä)

Lataus: fetch GitHubista raw URL → Blob → a.click() → selaimen latausdialogi
Tiedostonimi: {SEURAID}_Pelaajarekisteri_{PÄIVÄMÄÄRÄ}.xlsx
Tapahtumaloki: tallennetaan seurat/{id}/tapahtumat/ Firestoreen

Sihteerin ohje (näkyy ohjemodaalissa ennen latausta):
  1. Täytä joukkueet Asetukset-välilehdelle → dropdown aktivoituu
  2. Täytä pelaajat Pelaajat-välilehdelle (pakollinen: etunimi, sukunimi, s-posti)
  3. Lataa täytetty pohja takaisin TalentMasteriin → massakutsu automaattisesti

---

## Joukkueet-arkkitehtuuri (useampi joukkue per henkilö)

Firestoreen tallennetaan molemmat kentät yhteensopivuuden vuoksi:
  joukkue: "u14"           (vanha — Master v8 lukee tätä)
  joukkueet: ["u14","u12"] (uusi — Seura-näkymä ja tulevat versiot)

Joukkueen vaihto Seura-näkymässä: checkbox-lista kaikista seuran joukkueista.
data-attribuutit HTML:ssä (ei JSON.stringify onclickissä).

Ikäluokkasiirtymä: pilotin aikana joukkue nimetään uudelleen kauden vaihtuessa.
Automaattinen siirto syntymävuoden perusteella rakennetaan myöhemmin.

---

## Pelaajan elinkaari järjestelmässä

1. Joukkueet luodaan Seura-näkymän Joukkueet-välilehdellä
2. Sihteeri lataa Excel-pohjan (ohjemodal näyttää prosessin)
3. Sihteeri täyttää Asetukset-välilehteen joukkueet → dropdown aktivoituu
4. Sihteeri täyttää pelaajat Pelaajat-välilehdelle
5. TULOSSA: Tuontilogiikka → esikatselu → massakutsu → suostumusseuranta
6. Huoltaja saa sähköpostin, täyttää suostumuslomakkeen (PalloID tässä vaiheessa)
7. Pelaaja tallentuu Firestoreen, valmentaja näkee hänet Master v8:ssa

PalloID kerätään kahdessa vaiheessa: sihteeri täyttää jos tietää (Excel),
vanhempi täyttää suostumuslomakkeessa jos puuttui. PalloID on pelaajan
tunniste mutta ei estä rekisteröitymistä.

---

## Pelaajan mobiilietusivu — rakennespeksi

Tämä on strategisesti tärkein yksittäinen näkymä koko TalentMasterissa.
Se ratkaisee käyttöaktiivisuuden — jos pelaaja avaa sen ja tietää 3 sekunnissa
mikä hänen seuraava kehitysaskelensa on, järjestelmä toimii. Jos ei, jää passiiviseksi.

Etusivun päätavoite: vastata viiteen kysymykseen heti.
  1. Kuka minä olen täällä?
  2. Mitä minun kannattaa tehdä tänään?
  3. Mikä on tämän jakson tärkein kehitysfokus?
  4. Mitä hyötyä saan, jos teen tämän nyt?
  5. Olenko menossa eteenpäin?

Elementtijärjestys ylhäältä alas (psykologinen logiikka: identiteetti → toiminta → suunta → palaute → palkinto → yhteys):

  A. HEADER — "Minä täällä"
     Pelaajan etunimi/kutsumanimi, taso, streak.
     Esim: "Moi, Elias 👋 / Treenaaja · Taso 2 / 🔥 3 päivän putki"
     Lämmin, kevyt, ei liikaa dataa. Pelaaja tuntee: tämä on mun paikka.

  B. HERO-KORTTI — päivän tärkein asia (koko sivun ydin)
     YKSI selkeä tehtävä. Yksi pää-CTA. Ei enempää.
     Esim: "Tänään / Harjoittele heikompaa jalkaa 5 min / [Aloita tehtävä]"
     PAKOLLINEN SÄÄNTÖ: etusivulla saa olla vain yksi pää-CTA.

  C. TAVOITEJAKSO-KORTTI — sitoo päivän isompaan kaareen
     Tavoitejakson nimi, edistyminen (2/5 tehtävää), jäljellä-aika, seuraava askel.
     Etenemispalkki näkyväksi. Yksi fokus kerrallaan.

  D. KEHITYSSIGNAALI-KORTTI — "kehityksesi juuri nyt"
     1–2 nostoa: missä on nousua, mikä on seuraava fokus.
     Suunta eikä raakadata. Ei tutkadiagrammia etusivulle.
     Esim: "📈 Pallonhallinta paineessa on nousussa / 👀 Seuraava: scanning"

  E. ETENEMISKORTTI — motivaatio ilman pistekeräystä
     Streak, tämän viikon aktiivisuus, seuraava level-up-ehto.
     Palkitse: säännöllisyys, tehtävien loppuun vieminen, kehittyminen.
     ÄLÄ palkitse pelkästä kirjautumisesta tai klikkailusta.

  F. PIKANAPIT — sekundaariset oikopolut
     🃏 Kortti / 📈 Kehitys / 🏆 Joukkue — sijoitetaan pääkorttien ALLE.

  G. VALMENTAJALTA-KORTTI — tekee järjestelmästä aidon
     Lyhyt, lämmin, konkreettinen valmentajan viesti tai palaute.
     "Hyvä nousu viime viikolla. Seuraavaksi keskity siihen, että..."
     Ilman tätä appi jää mekaaniseksi.

  H. BONUSHAASTE — alimpana, vapaaehtoinen
     Visa, lisähaaste. EI saa nousta päivän päätehtävän ohi.

Navigaatio (alareunan tabs):
  Tänään | Kehitys | Joukkue | Tavoite
  Visa ei omaksi tabiksi — osa Tänään- tai Tavoite-osiota.

Tone of voice — etusivun tekstit:
  Hyvä: "Tämän päivän tehtävä", "Seuraava askel", "Kehityksesi juuri nyt"
  Huono: "Attribuutit päivittyvät testausten perusteella", "AI-valmentaja on fiktiivinen"
  Nämä tärkeät disclaimerit kuuluvat onboardingiin ja asetuksiin, eivät etusivulle.

Onboarding-kortit (VAIN ensimmäisellä käyttökerralla):
  Tämä ei ole arvosana → Kortti kehittyy mukana → Datan käyttö ja yksityisyys
  → Aloita ensimmäinen tavoitejakso. Sen jälkeen etusivu = toiminnallinen.

V1 minimi (rakennetaan ensin):
  Nimi + taso, päivän tehtävä, tavoitejakso, streak, kehityssignaali.
V2 (seuraava vaihe):
  Valmentajan viesti, pikanapit, level-up-ehto, bonusvisa.
V3 (pilotin jälkeen):
  Adaptiivinen etusivu pelaajaprofiilin mukaan (cognitive runner vs creative disruptor).

---

## Seuraavat tehtävät tärkeysjärjestyksessä

1. EXCEL-TUONTILOGIIKKA — KRIITTISIN
   Sihteeri lataa täytetyn pohjan → järjestelmä lukee SheetJS:llä →
   esikatselu (N pelaajaa, N sähköpostia, N joukkuetta) →
   VP vahvistaa → massakutsu huoltajille → pelaajat Firestoreen.

2. MASSAKUTSU JA SUOSTUMUSSEURANTA
   Pelaajat-välilehti: kuinka monta kutsua lähetetty, keneltä puuttuu suostumus.
   Statusampeli: vihreä (suostumus OK) / keltainen (kutsu lähetetty) / harmaa (ei kutsuttu).
   Muistutusnappi niille joilta suostumus puuttuu.

3. ILMOITUSJÄRJESTELMÄ
   Kun uusi pelaaja rekisteröityy, VP näkee ilmoituksen seuraavalla kirjautumiskerralla.

4. KPI-MITTARIT SEURANÄKYMÄÄN
   Palloliiton pelaajapassimäärät Power BI:stä vertailulukuna:
   https://app.powerbi.com/view?r=eyJrIjoiOWZhZGExZTMtODRhMC00NmI1LTk2N2QtNGU5OThkNjg2Mjk1IiwidCI6IjQ2OTM4YzQyLTk2MDgtNDU4ZC1iMjVlLTg3MTMzNjJhOTk5MSIsImMiOjh9
   Seuran passinomistajat vs. TalentMasteriin rekisteröityneet.

5. YHTEINEN NAVIGAATIOKOMPONENTTI
   tm_nav.js — yhteinen topbar kaikissa näkymissä joka lukee Custom Claims:ista
   roolin ja rakentaa linkit automaattisesti. Tämä tekee järjestelmästä yhtenäisen.

6. VP-DASHBOARD PARANNUKSET
   Musta ruutu → tervetuloa-näkymä. Super-admin näkee kaikki seurat.

7. EMPTY STATE -SUUNNITTELU (kriittinen aktivointiprosentille)
   Kun VP kirjautuu ensimmäistä kertaa: ei tyhjää nollaa vaan toimintakutsu.
   "Aloita lisäämällä joukkueet → 2 min" ja sen jälkeen automaattisesti
   seuraava vaihe. Järjestelmä johtaa kädestä pitäen ensimmäiset 48h.

8. MOBIILIRESPONSIVISUUS — erityisesti Master v8
   Valmentaja on kentällä, ei toimistossa. Tarkista kaikki näkymät 390px leveydellä.
   Jos ei toimi puhelimella, valmentajat eivät käytä sitä.

9. IDP-KORTTI JA PELAAJAN MOBIILIETUSIVU (strategisesti tärkein pitkällä tähtäimellä)
   Firebase-auth + pelaajan etusivu speksin mukaan + FIFA-kortti + jakolinkki.
   Tämä on se näkymä joka ratkaisee orgaanisen kasvun.
   Rakenna V1 minimi ensin: nimi+taso, päivän tehtävä, tavoitejakso, streak.

---

## Opittua — kriittiset arkkitehtuurihuomiot

Firebase double-init: AINA if (!firebase.apps.length) ennen initializeApp().
Ilman tätä sessio katoaa kun navigoidaan pois ja palataan.

orderBy() Firestoressä vaatii composite-indeksin. Järjestä JS:ssä localeCompare:lla.

YAML heredoc + ${} = syntaksivirhe GitHub Actionsissa. Käytä printf:ä.
Run workflow -nappi katoaa jos YAML:ssa on syntaksivirhe.

requestAnimationFrame ennen DOM-manipulaatiota: varmistaa elementtien olemassaolon.
setTimeout funktion lopussa return-lauseen jälkeen ei koskaan aja.

JSON.stringify HTML onclick-attribuutissa on vaarallinen. Käytä data-attribuutteja.

Excel-dropdownit: openpyxl osaa DataValidation, SheetJS ei luotettavasti.
Ratkaisu: staattinen pohja GitHubissa, ladataan fetch + Blob URL.

Cloud Functions region: molemmat sekä functions/index.js että frontend europe-west1.

super_admin vs superadmin: Firestoressä on "super_admin" (alaviivalla).
Kaikki SALLITUT_ROOLIT-listat sisältävät molemmat muodot.

CSS: ID-selektori (#id) voittaa luokan (.class). Näkymänvaihto style.display:llä.

onSnapshot puretaan ENNEN signOut():ta. Muuten permission-denied -virhe.

---

## Käyttäjätutkimus 2026 — keskeiset löydöt

Lähde: TalentMaster_Kayttajatutkimus_10.html
Tutkimusperusta: Forsman 2013 JY N=509, Liikanen & Törmä 2025 N=1843,
KNVB 2023, Ajax 2019-23, DFB 2022, NFF 2018-, Philippaerts 2006, Vaeyens 2007,
Duckworth 2007, Dweck 2006, Côté 2007, Deci & Ryan 1985.

### Johtamisjärjestelmän vaje — suomalainen konteksti

Suomessa valmennuspäälliköllä ei ole systemaattista tapaa seurata mitä tapahtuu.
Hän ei näe mitä valmentaja on kirjannut, ei kehitystrendiä, ei milloin kehitysikkuna
sulkeutuu. Tiedonkulku on katkennut joka tasolla:
VP ei näe mitä valmentaja kirjaa → valmentaja ei saa automaattisia herätteitä →
pelaaja ei tiedä missä on kehityspolullaan. Kolme tasoa toimii omissa siiloissaan.

KNVB 2023: valmentajat jotka saivat visuaalisen muistutuksen pelaajan
kehityskäyrästä antoivat 40% enemmän yksilöllisiä pedagogisia interventioita.
Ajax: IDP:n omaavat pelaajat ammattilaisuralle 3,2× todennäköisemmin.
DFB: Spielerprofil — kehityssuunnitelma kolmitasoisella aikajanalla (3kk/12kk/3-5v).

### Kolme roolia — kolme eri tarvetta

VP/Urheilujohtaja: "Missä seuramme kehitystyö menee?"
  Tarvitsee kokonaiskuvan yli ikäluokkien. Kolme aikaväliä: päivittäinen hälytys
  (P1 punaiset/P2 kelltaiset/P3 vihreät), viikottainen ikäluokkavertailu,
  kuukausittainen kehitystrendi. Valmentajataulu: kirjausaktiivisuus, havaintojen
  kattavuus, mentoroinnin rytmi (14-21 päivää). Kehitysvauhti on tärkein mittari —
  ei nykytaso. "Piilotettu potentiaali löytyy sieltä missä kehitysvauhti on korkea
  mutta nykytaso matala."

Valmentaja: "Mitä harjoitellaan tänään — ja kenelle?"
  Neljän hetken malli (KNVB Coaching Moments -tutkimuksen pohjalta):
  Aamu: kolme pelaajaa joille sanoa jotain tänään (järjestelmä muistaa).
  Ennen harjoitusta: 70/30-alkurutiinin ehdotus + pelaajien vointi + eilinen kuorma.
  Harjoituksen aikana: merkitset vain kenet näit — yhdellä pyyhkäisyllä.
  Harjoituksen jälkeen: kuormitus liukusäätimellä + yksi havainto yhdestä
  pelaajasta kahdessa lauseessa. Siinä kaikki.
  ADAR-havainnot (Arvioi, Päätä, Toteuta, Arvioi uudelleen): narratiivisessa muodossa
  numeroiden lisäksi. Valmentajan tekstikommentit ovat järjestelmän arvokkain data.

Pelaaja (10-19v): "Kehitynkö — ja mihin suuntaan?"
  Kolme ikäryhmää — kolme eri filosofiaa (Côté 2007):
  10-12v Kilpailija: FIFA-kortti isona, streak iso numero, pelimäisyys, ei positiota,
    ei vertailua. Välitön palaute. Deliberate play.
  13-15v Rakentaja: kokonaispisteet + taso + kasvuvaihe. Autonomia, oma data omilla
    ehdoilla. Pelaajatyypit aukeaa 14v.
  16-19v Showcase Pro: kehitysaikajana, CV-paketti (Luo/Jaa/Pidä yksityisenä),
    Mastery Basic→Signature. Portfolio, ura, tunnustus.

### TalentMaster 5D Framework™ — tutkimuspohja

D1 Fyysinen (max 40p): ikäspesifi, PHV-modifikaattori (-3p huipulla = suoja
  ylikuormitukselta), RAE-korjaus (Q1: ×0.92, Q4: ×1.06).
D2 Tekninen (max 25p): pujottelu painoarvo U12:lla 0.28. Liikanen & Törmä 2025
  vahvistaa: kevennyshyppy ei erota lahjakkuutta, ketteryys erottaa (p=0.001).
D3 Psykologinen (max 15p): sitkeys (Duckworth 2007), kasvumindset (Dweck 2006),
  koachattavuus, sisäinen motivaatio. Korkea D3 ennustaa harjoittelusta hyötymistä.
D4 Kognitiivinen (max 10p): pre-scanning, päätös paineessa, inhibitiokyky.
  Vaeyens 2007: erottelee eliittipelaajat paremmin kuin fyysinen suorituskyky.
D5 Sosiaalinen (max 10p): valmentautuvuus, vertaisjohtajuus (kasvaa U19:lle).

Viisi liikeketjua: Vauhtiketju, Lähtöketju, SM-ketju (pallonhallinta),
Hallintaketju, Peliälyketju. 70/30-malli koskee VAIN alkurutiinia (20-30 min
ennen kenttäharjoitusta) — ei koko harjoitusta. Kenttäharjoitus on täysin
valmentajan. 70% kiertää joukkueen heikointa ketjua, 30% pelaajan henkilökohtaisesti
heikoimpaan.

### Neljä profiilityyppiä (aukeaa 14v jälkeen)

Railgun: Vauhtiketju dominoi. Räjähtävä, nopea, suora.
Maestro: Peliälyketju dominoi. Näkee enemmän kuin muut, pre-scanning.
Shadowstep: SM-ketju dominoi. Pallonhallinta, 1v1, tekninen tarkkuus.
Titan: Hallintaketju dominoi. Vakaus, joukkueen selkäranka.

Mastery-tasot: Basic → Sharp → Elite → Signature.
Signature = "tämä pelaaja tietää kuka hän on." Ronaldo on Railgun Signature.
Modric on Maestro Signature. Ei "paras joukkueessa" vaan tunnistettava identiteetti.

### FIFA-kortti — miksi se toimii (tutkimustausta)

Forsman 2013: lahjakkaimmiksi nimetyt 11-14v pelaajat harjoittelivat omatoimisesti
merkitsevästi enemmän. Omatoiminen harjoittelu on erottava tekijä — streak-mekaniikka
rakentuu tälle empiiriselle havainnolle.

Deci & Ryan 1985 (itsemääräämisteoria): ulkoiset palkkiot heikentävät pitkällä
aikavälillä sisäistä motivaatiota. FIFA-kortti kääntää logiikan — "minä tein jotain
ja se muuttui" on sisäinen motivaattori.

Duolingo-efekti: streak-laskuri on yksittäinen tehokkain retentiotyökalu alle
18-vuotiailla. Tappionvälttäminen ("en halua katkaista putkea") on vahvempi
motivaattori kuin voiton tavoittelu ("haluan saada lisää pisteitä").

Barcelona ja Ajax: identiteetti ennen taitoja. "Millainen pelaaja minä olen?"
on tärkeämpi kysymys kuin "olenko hyvä?" James Clear (Atomic Habits):
"Olen Maestro joka kehittää Peliälyketjuaan" on eri asia kuin "minun pitää harjoitella."

### Showcase Pro™ vs. Wyscout

TalentMaster: kehitysdata-pohjainen, 5D + kehitysvauhti + FLEI + biologinen ikä.
  Kertoo minne pelaaja on menossa. Tunnistaa Hidden Gemin 2-3 vuotta ennen
  kuin hän näkyy Wyscoutissa. Saatavissa jo 15v alkaen.
Wyscout/InStat: videopohjainen, viimeisin ottelu. Ei biologista ikää, ei RAE-korjausta.
  Alkaa olla hyödyllinen vasta 17-18v.

FLEI™ (Fascia Load Efficiency Index): harjoitettavuusindeksi — onko pelaajan
keho tällä hetkellä kunnossa ottaa vastaan harjoittelua? Matala arvo = tarvitsee
ensin kuntouttavaa pohjatyötä. Yhdistettynä PHV-vaiheeseen on loukkaantumisriskin
tärkein ennustaja nuorella pelaajalla.

### Roadmap (tutkimusdokumentista)

Q1-Q2 2026: Pilotit käynnissä — käyttäjähaastattelut, anonyymi testaus.
Q2-Q3 2026: Multi-seura 3-5 pilottia yhtä aikaa, PalloID-integraatio.
Q3 2026-2027: Showcase Pro portaali, laiteintegraatio (XPS, Catapult, Polar Team Pro),
  kansallinen TKI-tietokanta opt-in.
2027+: ML-ennuste kehityspolusta, tyttöjen normisto, laajennus Pohjoismaihin.
  TalentMaster muuttuu palvelusta infrastruktuuriksi — kansallisen kehitystyön datapohjaksi.

## Kriittiset oivallukset alan huipuista (analyysi 2026-03-25)

PlayMetrics, 360Player ja Playbook365 vertailusta nousi neljä asiaa jotka
ratkaisevat käyttöaktiivisuuden — kaikki ovat tärkeämpiä kuin yksittäiset ominaisuudet.

Onboarding on tuote, ei prosessi: PlayMetrics tarjoaa "one-on-one video chats, group
trainings, emails replied to within minutes, phone calls when you need them most."
360Player sanoo onboardingin kestävän 1-4 viikkoa onboarding-specialistien kanssa.
Playbook365 lupaa 3 minuutin vastausajan. Kaikki ovat rakentaneet henkilökohtaisen
onboarding-prosessin palvelutuotteekseen. TalentMasterin kilpailuetu pilotin aikana
on se, että Tero auttaa henkilökohtaisesti — tämä on rakennettava eksplisiittiseksi
prosessiksi, ei satunnaiseksi tueksi.

Empty state on aktivoinnin ratkaiseva hetki: kun käyttäjä kirjautuu ensimmäistä
kertaa ja näkee tyhjän järjestelmän, suurin osa lopettaa. Järjestelmän pitää näyttää
seuraava toimenpide automaattisesti — ei nollia vaan toimintakutsu.

Mobiili on ehto, ei ominaisuus: valmentaja on kentällä puhelimella. Jos järjestelmä
ei toimi sujuvasti 390px näytöllä, valmentajat eivät käytä sitä. Tarkista kaikki
näkymät mobiililla ennen pilottia.

Paikallinen asiantuntemus on suurin kilpailuetu: PlayMetrics ei tunne PalloID:tä,
Palloliiton kolmea koria eikä suomalaista VP:tä. TalentMaster tuntee. Tämä on se syy
miksi seura valitsee TalentMasterin — ei siksi että teknologia on parempi.

## Bisnesmalli

Kiinteä seuralisenssi 200-400€/kausi (MRR), per-pelaaja raportti, klinikka kertamaksuna.
Paketit: Perustaso / Kehitystaso / Huipputaso.
Kasvulogiikka: FIFA-kortti + jakolinkki → orgaaninen kasvu (Strava/Duolingo-malli).

---

## HPP ELITE

Google Sheets ID: 1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M
Integroidaan fysioterapeutin näkymän kautta myöhemmin.

---

## Identiteetti-arkkitehtuuri

Firebase UID on aina "ankkuri" johon kaikki data kiinnittyy.
PalloID ja SporttiID ovat lisätunnisteet.
Vaihe 1 (nyt): sähköposti + manuaalinen PalloID.
Vaihe 2: PalloID OAuth (Palloliitto-yhteistyö).
Vaihe 3: SporttiID universaali yli lajirajojen.
