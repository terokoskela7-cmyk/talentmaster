# Notifikaatiot + mobiilikäytettävyys — suunnitelma & auditi

> Scoping 2026-06-22 (Tero). Valinta B (adoptio ennen 3A white-labelia): suljettu silmukka **ei pyöri ilman herätteitä**,
> ja äänireflektio on kentän laidalla -käyttö → mobiili täytyy olla kunnossa. Periaate: §26, §7.22, §13 (Nodemailer/CF), §21 (Firestore-trigger→CF), §6/§17 (mobiili).

---

## A. MOBIILIKÄYTETTÄVYYS-AUDITI (Master, live 2026-06-22, viewport ~517 px / mobiili-breakpoint ≤768)

**Hyvää:**
- **Ei vaakaylivuotoa** (docScrollW ≤ viewport) — layout ei riko leveyttä.
- Perusfonttikoko 14 px (ok, ≥11 px).

**Korjattavaa (ennen kenttäkäyttöä):**
1. **🔴 Kosketuskohteet liian pieniä.** 15/24 napista < 40 px korkeita. Esim. nauhoita 92×**32**, "+ Uusi tapahtuma" 135×**28**, "⚙ Vaatimukset" 92×**28**, sulje-"×" **13** px leveä. Standardi: **≥44 px** (iOS HIG) / 48 dp (Material). Erityisesti äänireflektion nauhoita/lopeta + sulje-napit pitää suurentaa kentällä käytettäväksi (märät kädet, kiire).
2. **🔴 Mobiilinavigaatio epäselvä.** Mobiililevyydellä sivupalkki piilossa (`aside.sidebar` w:0) **eikä hampurgeri-/nav-toggleria löytynyt** → valmentaja ei välttämättä pääse navigoimaan puhelimella. (Vahvista oikealla laitteella — viewport jäi 517 px:ään selaimen min-leveyden takia; signaali silti vahva.) Seura.html:ssä on jo toimiva hampurgeri-pattern (§6/§17) → tuo sama Masteriin TAI valmentajalle bottom-nav.
3. Suositus: **Master-mobiilipassi** (kosketuskohteet ≥44 px + toimiva mobiilinav) on **adoption edellytys** — valmentaja käyttää Masteria puhelimella kentällä (etenkin äänireflektio). Tämä ennen kuin nojataan kenttäkäyttöön.

**Toimenpide (Code):** mobiilipassi Masteriin — (a) primäärinapit + sulje-napit `min-height:44px` / isompi tap-alue mobiilissa, (b) hampurgeri/nav-toggle §6/§17-patternilla (yksi `@media(max-width:768px)`-lohko, `translateX` ei display:none), (c) äänireflektion nauhoitus-UI iso ja peukalo-ystävällinen. Erillinen tarkistus oikealla puhelimella.

---

## B. NOTIFIKAATIOT — herätteet jotka pyörittävät silmukkaa

### Triggerit (tapahtumat)
| # | Heräte | Kenelle | Lähde |
|---|---|---|---|
| T1 | **Uutta palautetta** | valmentaja | `palaute_jaettu` create (event) |
| T2 | **Review erääntyy / myöhässä** | VP (+ valmentaja valinn.) | review-kadenssi §29 (scheduled) |
| T3 | **Tee itsearvio** | valmentaja | scheduled/kontekstuaalinen — etenkin kun VP teki havainnoinnin ilman valmentajan itsearviota (kalibraatio kesken) |
| T4 | **N myöhässä reviewistä** (digest) | VP | scheduled koonti |
| (on jo) | huoltajakutsu-muistutus | huoltaja | `lahetaMuistutukset` §33 (erillinen) |

### Kanavat (vaiheistettu)
- **C1 In-app notifikaatiokeskus** (rakennettavissa nyt, ei uutta infraa pl. Firestore): `seurat/{sid}/kayttajat/{uid}/notifikaatiot/{id}` `{ tyyppi, teksti, linkki, luotu, luettu }`. Kellomerkki + badge + lista + merkitse luetuksi + deep-link kohteeseen.
- **C2 Sähköpostikooste** (olemassa oleva Nodemailer-CF §13): ajastettu CF (päivä/viikko) koostaa per käyttäjä → email. Frekvenssikatto + hiljaiset tunnit + per-tyyppi/-kanava-asetukset.
- **C3 Web push (PWA)** — myöhemmin; vaatii push-infran + luvan.

### Arkkitehtuuri (turvallinen kirjoitus)
- **Kirjoitus CF:llä, ei cross-user-clientillä.** T1 = Firestore-trigger CF `onCreate palaute_jaettu` → kirjoittaa valmentajan `notifikaatiot`-dokin (admin SDK ohittaa Rules, ei tarvita cross-user-write-sääntöä). T2/T3/T4 = ajastettu CF (päivittäin) laskee erääntyvät reviewit / puuttuvat itsearviot → kirjoittaa notifit (+ valinn. email-jono). (§21-pattern: Firestore trigger → CF.)
- **Client lukee vain omat notifit** (`request.auth.uid == uid`) + merkitsee luetuksi. Rules: `kayttajat/{uid}/notifikaatiot` read/update oma uid + SA; **create vain CF (admin)** → client ei voi väärentää.

### Hallinta (ei spämmiä, GDPR)
- Per-käyttäjä-asetukset `kayttajat/{uid}.notif_asetukset { inapp:{...}, email:{...} }` per tyyppi + kanava. Opt-out.
- Frekvenssikatto (email: max 1 kooste/pv tai /vk; in-app dedupe). Hiljaiset tunnit (ei yöllä).
- **Alaikäisyys/yksityisyys:** pelaajaa koskevat notifit minimitiedolla; valmentaja/VP-notifit omasta työstä; ei PII:tä email-otsikkoon/runkoon yli tarpeen (§33 B2 Sentry-skrubin henki).

### Vaiheistus
- **N1 (nyt):** in-app notifikaatiokeskus + Firestore-trigger-CF T1 (uutta palautetta) + ajastettu CF T2/T3 (review erääntyy, tee itsearvio) → in-app notifit. Badge + lista + deep-link + merkitse luetuksi + perusasetukset. **Vaatii CF-deployn** (`firebase deploy --only functions`) + Rules-blokin (Console).
- **N2:** sähköpostikooste (Nodemailer) + frekvenssikatto + hiljaiset tunnit + per-kanava-asetukset.
- **N3:** web push (PWA).

### Verifiointi
new Function 0 virhettä · npm test · §17 · Carbon · RUNTIME+LIVE: T1 (luo palaute → valmentajan notif + badge) · T2/T3 (ajastettu → notif) · merkitse luetuksi · deep-link · asetukset opt-out · ei cross-user-väärennöstä (client ei voi luoda toisen notifia).

---

## B2. N1.5 — "Tee itsearvio" -heräte (T3) — DETALJISUUNNITELMA (2026-06-22)

**Tarkoitus:** sulkea kalibraatiosilmukka. Kalibraatio (§2.2) vaatii sekä valmentajan **B-itsearvion** että VP:n **B-havainnoinnin** samasta harjoituksesta. Jos VP havainnoi mutta valmentaja ei ole itsearvioinut → heräte muistuttaa valmentajaa → pari syntyy.

- **Trigger (event-vetoinen, lukittu):** uusi Firestore-trigger-CF **`notifTeeItsearvio`** `onCreate seurat/{sid}/harjoitusarvioinnit/{id}` → ehto `malli=='valmennustaidot' && arviointitapa=='havainnointi'` → lue `valmentajaUid`, `joukkue`, `pvm` → kysele saman valmentajan **itsearvio** (`malli=='valmennustaidot' && arviointitapa=='itsearvio'`, sama joukkue, `pvm ±2 pv`) → **jos EI löydy** → kirjoita notif valmentajalle (`tyyppi:'tee_itsearvio'`, teksti, linkki → "Itsearvio").
- **Dedupe:** ei uutta jos samasta harjoituksesta (sama pvm/joukkue) on jo lukematon `tee_itsearvio`-notif.
- **Sulkeutuu luonnostaan:** kun valmentaja tekee itsearvion, 2.2:n auto-paritus yhdistää → (nice-to-have: merkitse `tee_itsearvio`-notif luetuksi automaattisesti).
- **Kanava:** in-app (sama `notifikaatiot`-kokoelma + Rules, jo deployattu). Ei uutta UI:ta (notif-keskus on).
- **Deploy:** `firebase deploy --only functions:notifTeeItsearvio` (Coden CLI authed; prerequisitet jo kunnossa).
- **Vaihtoehto (ei nyt):** kadenssiheräte ("et ole itsearvioinut X viikkoon") — N-myöhempi.

## B3. N2 — Sähköpostikooste — DETALJISUUNNITELMA (2026-06-22)

**Tarkoitus:** herätteet tavoittavat myös ne jotka eivät ole aktiivisesti appissa. **Kooste, ei per-tapahtuma-postia.**

- **Mekanismi:** ajastettu CF **`notifKoosteEmail`** (esim. joka aamu **07:00 Europe/Helsinki**) → iteroi käyttäjät joilla email + email-opt-in → kerää **lukemattomat notifit edellisen koosteen jälkeen** (`notif_digest_pvm`-merkki) → jos ≥1 → kokoa kooste → lähetä olemassa olevalla **Nodemailer-CF:llä** (§13) → päivitä `notif_digest_pvm`.
- **Sisältö (lukumäärät, ei sisältöä):** *"Sinulla on: 2 uutta palautetta · 1 review erääntyy · tee itsearvio"* + linkki appiin + seuran nimi. VP:lle review-roll-up ("3 pelaajaa myöhässä reviewistä").
- **Hallinta:**
  - **Asetukset** `kayttajat/{uid}.notif_asetukset.email { enabled, kadenssi:'paivittain'|'viikoittain' }` + kevyt **"Ilmoitusasetukset"** -UI (Master + VP): email päälle/pois + kadenssi.
  - **Frekvenssikatto:** max 1 kooste / kadenssi-ikkuna (päivä tai viikko). **Hiljaiset tunnit:** lähetys aamulla, ei yöllä.
  - **Peruutuslinkki** sähköpostissa → kytkee `email.enabled=false` (in-app-asetuksen kautta / kevyt endpoint).
  - **GDPR/PII:** vastaanottaja = henkilöstö (valmentaja/VP), kooste **omasta työstä** — ei pelaajan henkilötietoja runkoon (review = lukumäärät, palaute = "uutta palautetta", ei sisältöä/nimiä). §33 B2 -skrubin henki.
- **Opt-in oletus (päätettävä):** suositus **päällä** (työhön liittyvä, oikeutettu etu) + helppo peruutus — vai pois oletuksena (eksplisiittinen opt-in)?
- **Arkkitehtuuri:** scheduled CF + Nodemailer (jo konffattu §2). `notifikaatiot`-luku per käyttäjä (admin SDK). Ei uutta Rules-deployta (notifikaatiot-blokki on; asetukset `kayttajat`-dokin write-säännön piirissä — oma uid).
- **Deploy:** `firebase deploy --only functions:notifKoosteEmail` (ajastettu → käyttää jo enabloituja Scheduler/PubSub-API:ja + App Enginea).

### N1.5 + N2 — vaiheistus & verifiointi
1. **N1.5 ensin** (in-app, sulkee silmukan, ei email-infraa): `notifTeeItsearvio`-CF + deploy → verify (VP havainnointi ilman itsearviota → valmentajan "tee itsearvio" -notif; dedupe).
2. **N2** (email): `notifKoosteEmail`-CF + asetukset-UI + deploy → verify (kooste lähtee opt-in-käyttäjälle, frekvenssikatto, peruutus, ei PII:tä, opt-out estää).

---

## C. SUOSITELTU JÄRJESTYS (valinta B)

1. **Master-mobiilipassi** (§A) — adoption edellytys, nopea, ei riipu muusta.
2. **N1 notifikaatiot** (in-app + CF-triggerit) — silmukka alkaa pyöriä.
3. (Rinnalla) **1–2 valmentajan käytettävyystesti** oikealla datalla.
4. N2 email-kooste · sitten 3A white-label · 3B cross-club · GDPR-äänidata-pass (§33 B4).
