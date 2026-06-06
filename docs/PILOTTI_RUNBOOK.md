# TalentMaster™ — Pilotin aloitus: Runbook

> Operatiivinen ohje massakutsujen lähettämiseen ja pelaaja-/vanhempi-appien avaamiseen.
> Päivitetty: 2026-06-06

---

## 1. Yleiskuva — rekisteröintivirta

```
Seura.html                                 Vanhemman sähköposti
  │                                              │
  ├─ Excel-tuonti + "Lähetä kutsut"        ──►  📧 Rekisteröintikutsu (SendGrid)
  │  TAI                                         │
  ├─ 📨 Massakutsu-modaali (joukkueittain) ──►   │
  │                                              ▼
  │                                     Rekisterointi_Suostumus.html
  │                                        (GDPR-suostumus + bio-pituudet)
  │                                              │
  │                                      vahvistaSuostumus-CF
  │                                              │
  │                                    ┌─────────┴──────────┐
  │                                    ▼                    ▼
  │                              PIN (pelaajalle)    Salasana-reset-linkki
  │                                    │              (vanhemmalle)
  │                                    ▼                    ▼
  │                            Pelaaja_v7.html      Vanhempi_v2.html
  └────────────────────────────────────────────────────────────────
```

**Cloud Functionit:**

| CF | Rooli | Triggeröi |
|---|---|---|
| `lahetaRekisteriKutsu` | Lähettää sähköpostin huoltajalle (SendGrid) | Massakutsu / Excel-tuonti / yksittäinen kutsu |
| `vahvistaSuostumus` | Tallentaa suostumuksen + generoi PIN + reset-linkin | Rekisterointi_Suostumus.html lomake |

---

## 2. Ennen lähetystä — checklist

### Tekniset edellytykset

- [ ] **SendGrid-plan tarkistettu** — päiväkatto riittää (Free: 100/pv, Essentials: 100k/kk). Tarkista: [app.sendgrid.com](https://app.sendgrid.com) → Settings → Account Details.
- [ ] **SPF/DKIM kunnossa** — SendGrid Sender Authentication → Domain Authentication. Ilman tätä bulk-viestit menevät roskapostiin. Tarkista: SendGrid → Settings → Sender Authentication.
- [ ] **CF:t deployattu** — GitHub Actions `deploy_functions.yml` viimeisin ajo vihreä. Tarkista: [Actions](https://github.com/terokoskela7-cmyk/talentmaster/actions/workflows/deploy_functions.yml).
- [ ] **Firestore Rules deployattu** — `tm_admin/firestore.rules` versio vastaa Consoleen deployattua. Tarkista Firebase Console → Firestore → Rules.
- [ ] **GitHub Pages päivitetty** — Seura.html ja Rekisterointi_Suostumus.html tuoreimmat versiot livenä (`?v=N` tarkistus).

### Data-edellytykset per seura

- [ ] Kaikilla pelaajilla on `huoltajaEmail` Firestoressä (tai Excelissä)
- [ ] Joukkueet luotu Firestoreen (Seura.html → Joukkueet)
- [ ] Pelaajien nimet ja syntymävuodet oikein (suostumuslomake esitäyttää näitä)

### End-to-end testi (TEE AINA ENNEN MASSALÄHETYSTÄ)

1. Avaa **Seura.html** → valitse seura (esim. KPV)
2. Valitse **yksi testipelaaja** jonka `huoltajaEmail` = oma sähköpostisi
3. Lähetä **yksittäinen kutsu** (Pelaajat → pelaajan rivi → Kutsu)
4. Tarkista sähköposti saapui (+ roskapostikansio)
5. Klikkaa linkkiä → **Rekisterointi_Suostumus.html** avautuu esitäytettynä
6. Täytä suostumus → onnistumisnäyttö: PIN + reset-linkki
7. Testaa **Pelaaja_v7** PIN-kirjautumisella
8. Testaa **Vanhempi_v2** salasanan asettamisella + kirjautumisella

> Jos jokin vaihe epäonnistuu → älä lähetä massaa ennen korjausta.

---

## 3. Lähetysprosessi — joukkue kerrallaan

### Vaihtoehto A: Massakutsu-modaali (suositeltu)

1. Avaa **Seura.html** → kirjaudu VP:nä tai SA:na
2. Klikkaa **📨 Massakutsu** sivupalkissa
3. Lataa Excel/CSV jossa sarakkeet: `PalloID | Etunimi | Sukunimi | HuoltajaEmail | Joukkue`
4. **Valitse joukkue suodattimesta** (esim. "SJK P15") → vain valitut pelaajat näkyvät
5. Tarkista esikatselu: nimet + emailit oikein, ei "⚠️ puuttuu" -rivejä
6. Klikkaa **"📨 Lähetä kutsut sähköpostilla"**
7. Seuraa progress-palkkia — jokainen rivi näyttää onnistumisen/virheen
8. Toista seuraavalle joukkueelle

### Vaihtoehto B: Excel-tuonti + kutsut (uudet pelaajat)

Jos pelaajia ei vielä ole Firestoressä:

1. Seura.html → **Tuo Excel** → lataa täytetty Excel
2. Ruksi **"Lähetä kutsut samalla"**
3. Tuo → pelaajat luodaan Firestoreen + kutsut lähetetään

### Vaihtoehto C: Firestoressa olevat pelaajat (ilman Exceliä)

Pelaajat joilla on jo `huoltajaEmail` Firestoressä:

1. Seura.html → Pelaajat → valitse pelaaja
2. **Kutsu** → yksittäinen sähköposti

> Massakutsu Firestoresta suoraan (ilman Exceliä) = tuleva ominaisuus.

---

## 4. Ajoitus ja viestintä

### Ennakkoviesti seuroille (1–2 pv ennen)

Lähetä seuran VP:lle / WhatsApp-ryhmään:

> "Huomenna lähetetään TalentMaster-rekisteröintikutsut [joukkueen] huoltajille sähköpostilla. Viesti tulee osoitteesta talentmasterid@gmail.com (tai seuran nimi). Pyydäthän vanhempia tarkistamaan myös roskapostikansion."

### Lähetysaikataulu

- **Maanantai–torstai, klo 9–17** — paras avausprosentti, tukiaika
- **EI perjantai-iltaa / viikonloppua** — kysymykset kasaantuvat ilman tukea
- **Max 1 joukkue / päivä** alussa → skaalaa kun virta todettu toimivaksi
- **Aloita pienimmästä** (esim. SJK P15, ~20 pelaajaa) → laajenna

---

## 5. Seuranta lähetyksen jälkeen

### Reaaliaikainen seuranta

| Mitä | Mistä | Tavoite |
|---|---|---|
| Kutsut lähetetty | `seurat/{sid}/kutsut` (tila: 'lahetetty') | 100 % |
| Sähköpostit perillä | SendGrid Dashboard → Activity | >95 % delivered |
| Suostumukset | Seura.html → Yhteenveto → suostumus-% | >70 % viikossa |
| Bouncet | SendGrid → Suppressions → Bounces | <5 % |
| Roskaposti | SendGrid → Suppressions → Spam Reports | 0 |

### Hälytysrajat

- **Bounce >10 %** → tarkista email-osoitteiden laatu, SPF/DKIM
- **Suostumus <30 % 3 pv jälkeen** → muistutusviesti seuran kautta
- **Roskaposti-ilmoituksia** → keskeytä lähetys, tarkista domain-verifiointi

### Muistutuskäytäntö

1. **+3 pv:** seuran VP lähettää WhatsApp-muistutuksen
2. **+7 pv:** toinen sähköposti (manuaalinen, ei automaattinen)
3. **+14 pv:** VP soittaa/viestittää henkilökohtaisesti

---

## 6. Vianetsintä

### "Sähköposti ei saapunut"

1. Tarkista roskapostikansio (Gmail: Promotions / Spam)
2. Tarkista SendGrid Activity — onko delivered/bounced/blocked
3. Jos bounced: väärä osoite → korjaa Firestoreen + lähetä uudelleen
4. Jos blocked: domain-ongelma → tarkista SPF/DKIM
5. **Varapolku:** kopioi linkki (Seura.html → Pelaajat → pelaaja → Kutsu → 📋 Kopioi) → lähetä WhatsAppilla

### "Suostumuslomake ei avaudu / näyttää virheen"

1. Tarkista URL-parametrit (seuraId, pelaajaId, hEmail pakollisia)
2. Tarkista ettei CDN tarjoa vanhaa versiota (`?v=N`)
3. Selainkonsolissa (F12): permission-denied → Rules ei päästä läpi

### "PIN ei toimi"

1. Tarkista Firestore: `seurat/{sid}/pelaajat/{pid}.pin` — onko 4-numeroinen?
2. PIN generoidaan vasta kun suostumus annettu (vahvistaSuostumus-CF)
3. Jos PIN puuttuu: CF epäonnistui → tarkista CF-logit (Firebase Console → Functions → Logs)

### "Vanhempi ei pysty kirjautumaan"

1. Salasana-reset-linkki tulee suostumuslomakkeen onnistumisnäytöstä
2. Jos linkki vanhentunut (1 h): Seura.html → Henkilöstö → ✉ Reset-nappi
3. Jos Auth-tili puuttuu: `vahvistaSuostumus`-CF luo sen (`haeOrLuoHuoltajaAuth`)

---

## 7. Pilottiseurojen järjestys (suositus)

| Prioriteetti | Seura | Pelaajia | Miksi ensin |
|---|---|---|---|
| 1 | SJK P15 | ~20 | Pieni, yhteistyökykyinen, hyvä testikohortti |
| 2 | SJK loput (P16, T14, T16) | ~34 | Sama seura, laajennus |
| 3 | KPV | ~34 | Pitkäaikainen pilotti, Rasmus aktiivinen |
| 4 | Sibbo-Vargarna | ~158 | Iso erä, sv-kieli — testaa skaalautuvuutta |
| 5 | Muut (FC Lahti, Pallo-Iirot, GrIFK, VIFK, Ylöjärven Ilves) | — | Rekisteröidään ensin |

---

## 8. Käyttöönottopäivän muistilista

```
☐ End-to-end testi omalla osoitteella OK
☐ SendGrid päiväkatto riittää
☐ SPF/DKIM vahvistettu
☐ Ennakkoviesti seuran VP:lle / WhatsApp-ryhmään
☐ Excel valmis (joukkueittain erillinen tai yksi + suodatus)
☐ Seura.html tuorein versio (?v=N)
☐ Ajoitettu arkipäivälle klo 9–17
☐ SendGrid-dashboard auki seurantaa varten
☐ Varasuunnitelma: WhatsApp-linkki + manuaalinen jako
```
