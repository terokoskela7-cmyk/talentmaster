# SEURA_SV_RISKILISTA — dual-use ja logiikka-stringit (EI data-i18n-karttaan)

Lähde: `TalentMaster_Seura.html` (6046 riviä). Jokainen alla oleva stringi näkyy
käyttöliittymässä MUTTA sitä myös verrataan koodissa, tallennetaan Firestoreen
tai käytetään muussa logiikassa. Näitä EI saa kääntää sokealla
data-i18n-korvauksella — käännös vaatii koodimuutoksen (vertailuarvo →
kieliriippumaton avain) tai erillisen display-mappauksen.

---

## 1. Enum-arvot, jotka renderöidään raakana ruudulle

### 1.1 `suostumusTila` — 'pilotti' / 'odottaa' / 'annettu'
- **Rivi 5019:** `tilaTeksti = r.suostumusTila || 'pilotti'` — massakutsun
  esikatselussa enum-arvo näytetään sellaisenaan.
- **Rivi 5024:** sama arvo renderöidään listariville.
- Arvoa myös **verrataan** koodissa useassa paikassa (`=== 'pilotti'`,
  `=== 'annettu'` jne.).
- **Päätös:** ei karttaan. Kartassa on vain staattiset otsikkotason tekstit
  ("Suostumustila", "Odottaa suostumusta" jne.), joilla ei ole enum-riippuvuutta.

### 1.2 `talenttiTaso` — 'perus' / 'laajennettu'
- **Rivi 2243:** `taso.toUpperCase()` — näytetään raakana pelaajataulukossa.
- **Rivi 5720:** `'⭐ ' + talenttiTaso` — toast.
- **Rivi 4556:** toast viittaa arvoon.
- **Rivit 2224, 4423, 5847:** arvoa verrataan (`=== 'laajennettu'` jne.).
- **Päätös:** ei karttaan. Display-labelit "Perus — IDP-seuranta" /
  "Laajennettu — intensiivisempi ohjelma" (dropdownin option-tekstit) ovat
  kartassa, koska ne ovat puhtaita näyttötekstejä — mutta niiden `value`-attribuutit
  ovat enum-arvoja ja jäävät rauhaan.

### 1.3 `kaytettavyys`-tila — 'aktiivinen' / 'loukkaantunut' / 'kuntoutuksessa' / 'tauko'
- **Rivi 1681:** näytetään raakana pelaajarivissä.
- **Rivi 2176:** kirjoitetaan Firestoreen.
- **Rivi 2048:** verrataan koodissa.
- **Päätös:** ei karttaan.

### 1.4 KAYTETTAVYYS_ALUEET — Nilkka, Polvi, Reisi, Lonkka, Selkä, Olkapää, Ranne, Sääri, Pohje, Muu
- **Rivi 2044:** taulukkomäärittely.
- **Rivi 2115:** näytetään dropdownissa (label = value).
- **Rivi 2181:** tallennetaan sellaisenaan Firestoreen.
- **Rivi 2056:** näytetään takaisin badge:ssa.
- **Päätös:** ei karttaan — tallennettu arvo on suomeksi, käännös rikkoisi
  olemassa olevan datan.

## 2. Pelipaikat ja sukupuolet

### 2.1 Pelipaikannimet
Maalivahti / Keskuspuolustaja / Laitapuolustaja / Keskikenttä /
Hyökkäävä keskik. / Laitahyökkääjä / Keskushyökkääjä
- **Rivit 4349, 4385:** option-labelit.
- **Rivit 4352, 4387:** legacy-datan matchaus (`=== 'Maalivahti'` jne.).
- Pelaaja-näkymän POS-mappi riippuu samoista arvoista.
- **Päätös:** ei karttaan. Pelipaikkojen käännös vaatii erillisen
  arvo→näyttöteksti-mappingin (kuten Pelaaja-näkymässä jo on).

### 2.2 "Poika / Mies" ja "Tyttö / Nainen"
- **Rivit 4329–4330:** joukkuetta luotaessa.
- **Briefi kieltää käännöksen:** taustalla M/N-enum ja sukupuolikoodit;
  älä käännä pojke/flicka-muotoon.
- **Päätös:** ei karttaan.

### 2.3 "Muu" — kaksi eri merkitystä
- TYYPIT-taulukossa (rivi 2040) display-only.
- ALUEET-taulukossa (rivi 2044) tallennetaan Firestoreen.
- **Päätös:** ei karttaan kummastakaan — §1 varovaisuusperiaate: älä arvaa
  kontekstia string-pohjaisessa korvauksessa.

## 3. Excel-tuonnin dual-use-stringit

### 3.1 Sarakeotsikot (rivi 5278) — etsiSarake startsWith-matchaa (rivit 5648–5667)
`'Etunimi *'`, `'Sukunimi *'`, `'Joukkue * (katso Asetukset-välilehti)'`,
`'Huoltajan sähköposti *'`, `'PalloID (vapaaehtoinen)'`, `'Talenttiohjelma'`,
`'TalenttiTaso'`
- Excel-pohjaan kirjoitettavat otsikot ja tuonnin parseri (`etsiSarake`,
  startsWith) riippuvat näistä tasan.
- `'Etunimi *'` / `'Sukunimi *'` / `'Huoltajan sähköposti *'` näytetään
  **myös UI:ssa** (rivit 939/943 badge, 772/777 label, 603) → aito dual-use.
- **Päätös:** ei karttaan. UI:n labelit pitää erottaa omiksi
  data-i18n-avaimikseen Excel-otsikoista ennen käännöstä.

### 3.2 Paljaat yleissanat
- **"Etunimi", "Sukunimi", "Joukkue", "Sukupuoli", "Syntymäaika"** —
  briefin §3.4 no-translate-lista. "Joukkue" on `<th>` useassa taulukossa +
  `etsiSarake` (rivi 5663) + Firestore-kenttävertailut.
- **"HuoltajaEmail"** — näkyvä `<th>` (rivit 1076, 4853) + etsiSarake-hakusana
  (rivi 5664).
- **"Talenttiohjelma"** paljaana (rivi 2274) = Excel-otsikko + hakusana.
  (Kartassa on vain emojilla varustettu "⭐ Talenttiohjelma"-otsikko.)
- **"Taso"** (rivi 2264 `<th>`, 4421 label) vs `etsiSarake('taso')`
  (rivi 5667) — varovaisuusflag: case-ero auttaa, mutta string-korvaus
  osuisi myös hakusanaan jos case-normalisoidaan.
- **"PalloID"** — Excel-avain, mutta ruotsiksi identtinen → ei toimenpidettä,
  pelkkä huomio.
- **Päätös:** ei karttaan (paitsi "Syntymäaika"-NÄYTTÖ kääntyy muualla
  muotoon "Födelsedatum" — ks. briefin lukittu sanasto; paljasta "Syntymäaika"-
  stringiä ei kuitenkaan korvata sokeasti).

## 4. Tasonimet — Firestore-arvoja

### "Perustaso" / "Kehitystaso" / "Huipputaso"
- **Näyttö:** rivit 2715–2727, 2806.
- **Logiikka:** rivi 1319 `data.paketti || 'Perustaso'` — Firestore-fallback-arvo.
- **Päätös:** ei karttaan. ⚠️ Kartassa käytetyt viittaukset
  "Basnivå/Utvecklingsnivå/Toppnivå" (koriKuvaukset ja ominaisuuslistat)
  olettavat, että tasonimien display-mapping ratkaistaan erikseen — jos
  tasonimet päätetään pitää suomeksi, nämä kolme käännöstä pitää kieltää
  koodeissa.

## 5. Tekniset ankat

### 5.1 Zero-width space "kutsulink​ki"-stringeissä
- **Rivit 587, 666, 683, 2959, 3053:** stringit sisältävät U+200B
  (zero-width space) sanassa "kutsulink​ki".
- **Kartassa:** avain kirjoitettu JSON-escape-muodossa
  `"Luo kutsulink​ki vanhemmalle joukkueelle "` jne., jotta
  parsed string on tavu-tarkka.
- **Huom:** data-i18n-attribuuttiin kopiointi pitää tehdä tavu-tarkasti
  (ei käsin kirjoittaen — välilyönti on näkymätön).

### 5.2 suostumus.hyvaksytyt-objektin avaimet
- **Rivit 4021–4025:** avaimet (esim. lomakkeen kenttien nimet) näytetään
  raakana tietokannasta.
- **Päätös:** data, ei käännettävää kartalla. Vaatii erillisen label-mappingin.

### 5.3 Joukkueiden nimien ===-vertailut
- **Rivit 1727, 3440, 4992:** joukkuenimiä verrataan tasan.
- **Päätös:** joukkuenimet ovat dataa — ei karttaan, ei toimenpiteitä.

### 5.4 Excel-ohjerivit 4–5 (rivit 5284–5285)
- Sisältävät logiikka-kriittiset arvot `"kyllä"` / `"perus"` / `"laajennettu"`
  (tuonnin parseri hyväksyy nämä arvot).
- **Päätös:** EI käännetty karttaan. Rivit 1–3 ja 6–7 ovat kartassa.

### 5.5 Kuollut koodi `_avaaTuoJaLahetaModal_vanha`
- **Rivit 5515–5569:** funktiota ei kutsuta mistään.
- Sen stringit ("⬇ Lataa pohja ensin", "📥 Minulla on täytetty Excel → Tuo ja
  lähetä kutsut") jätetty pois kartasta.
- **Suositus:** poista kuollut koodi erillisellä siivouscommitilla.

### 5.6 " — tallennettu ✓" — yksikkö/monikko
- **Rivi 3465** (yksikkö) vs **4557** (monikko) — sama avainstringi, mutta
  ruotsin sija muotoriippuvainen (l substantiivin jälkeen).
- **Päätös:** ei karttaan — käsitellään dynaamisten tekstien puolella.

## 6. Dynaamiset (muuttujia sisältävät) tekstit — käännettävä koodissa, ei data-i18n:llä

Nämä ovat template-stringejä, joihin interpoloituu nimiä/lukuja. Ne eivät sovi
litteään data-i18n-karttaan (korvaus kohdistuisi osaan lauseesta). Käännetään
koodissa i18n-funktiolla. Suositellut ruotsinnokset:

| Rivi | FI (pohja) | SV (suositus) |
|---|---|---|
| 3030–3031, 3259, 3702–3706 | WA/mail-viestirunko "Hei! 👋 {seura} kutsuu..." | "Hej! 👋 {seura} bjuder in er att registrera {nimi} i TalentMaster-systemet..." |
| 3714–3715, 3786–3788, 3793–3794 | mailto-aiheet ja rungot | vastaavat ruotsiksi |
| 3476 | `Poistetaanko joukkue "{X}"? Tämä ei poista joukkueen pelaajia.` | `Ta bort laget "{X}"? Detta tar inte bort lagets spelare.` |
| 3981 | pelaajan poisto-confirm | mukautettu ruotsinnos |
| 5044–5060 | massakutsun confirm-template | "Skicka {n} inbjudningar?" tms. |
| 1563, 1570, 1578–1579, 1606, 1709, 3337, 3457, 3465, 3676–3677, 3945, 4557, 4675, 4739, 4771, 4945, 4960, 4968–4972, 5002, 5028, 5173–5186, 5347, 5370, 5389, 5409, 5425, 5747, 5810, 5823, 5909, 5915, 5921, 5935–5938, 5949 | laskuri-/statustoastit | esim. `Joukkue {X} lisätty!`→`Lag {X} tillagt!`, `{X} deaktivoitu.`→`{X} inaktiverad.`, `PIN {X} on jo käytössä toisella pelaajalla. Valitse eri koodi.`→`PIN {X} används redan av en annan spelare. Välj en annan kod.` |

## 7. Yleishuomiot

- **TMEmptyState-tekstit** ovat erillisessä moduulissa (eivät tässä
  tiedostossa) — käännetään omana kokonaisuutenaan.
- **Moniriviset HTML-lohkot** (rivit 587, 764, 896–901, 929–934, 971–975,
  4704–4706) sisältävät rivinvaihtoja ja tagien sisäistä tekstiä — kartan
  avaimet on whitespace-kollapsoitu; data-i18n-attribuutteja kirjoitettaessa
  käytä kartan avainta sellaisenaan, älä HTML-lähdesyntaksia.
