# Kimi-briefi — TalentMaster_Seura.html ruotsinnos (seuraava käännöspinta)

## Tehtävä
Käännä **`TalentMaster_Seura.html`** (Seurahallinta: VP/sihteeri/UTJ, ~6047 riviä) käyttäjälle näkyvät
merkkijonot suomi → ruotsi. Sama lukittu sanasto kuin lib_sv- ja Master/VP-käännöksissä.

## Toimitusmuoto (kumpi tahansa käy — vaihtoehto A suositeltu)
- **A (suositus, suoraan getter-yhteensopiva):** `fi → sv` -merkkijonokartta JSON:ina
  (`docs/SEURA_SV_KAANNOSMUISTI.json`, kuten lib-harvest). Ei forkattua HTML:ää → ei tuplaylläpitoa.
- **B:** forkattu `TalentMaster_Seura_SV.html` — kelpaa myös (harvestaamme sen diffillä), mutta A on siistimpi.

## Sanasto (LUKITTU — sama kuin aiemmin)
tränare · spelare · lag · periodfokus · säsongsmål · spelintelligens · registrering · självbedömning ·
utvecklingsområde · Observera–Besluta–Agera–Bedöm. **Lajitermit (KANONINEN, älä poikkea):**
Ponnauttelu → **Jonglering** (EI "Utkast") · Pujottelu → **Slalom** (EI "Dribbling") · Syöttö → **Passning** ·
Kuljetus-laukaus → **Föring och skott** · Pituuspotku → **Längdspark**.

## ⛔ ÄLÄ KÄÄNNÄ (nämä rikkovat logiikan — opittu lib-forkista)
Nämä ovat **data-/vertailuarvoja tai kirjoitetaan Firestoreen**, EIVÄT näyttötekstiä. Jätä suomeksi:
1. **Tila-/enum-arvot:** `suostumusTila` `'pilotti'/'odottaa'/'annettu'` · `lahde` `'excel_tuonti'/'kutsu'/'manuaalinen'` ·
   `talenttiTaso` `'perus'/'laajennettu'` · `aktiivinen` · `sukupuoli` `'M'/'N'` (EI "poika/tyttö/pojke/flicka").
2. **Roolistringit:** `'vp'`, `'valmentaja'`, `'seurasihteeri'`, `'urheilutoimenjohtaja'`, `'talenttivalmentaja'` (Custom Claims / Rules).
3. **Vertailuavaimet:** joukkuenimet, `seuraId`, pelipaikka-arvot JOS niitä verrataan koodissa (`=== 'Maalivahti'` tms.).
4. **Excel-pohjan sarakeotsikot** joita tuonti matchaa (`etsiSarake` `startsWith`) — esim. `PalloID`, `Etunimi`, `Sukunimi`,
   `Joukkue`, `Syntymäaika`, `Sukupuoli`. **Näiden kääntäminen rikkoo Excel-tuonnin.** (Sulkeita ei muutenkaan saa lisätä.)
5. CSS-luokat, element-id:t, `data-*`-attribuutit, `onclick`-funktionimet, konsoli/kommentit.

## ✅ KÄÄNNÄ (näkyvä UI)
Otsikot, napit, taulukoiden **näyttö**-otsikot, KPI-labelit, suodatin-välilehtien **näyttötekstit**
("Kaikki/Pilotti/Kutsu/Rekisteröity/Ilman PalloID" = näyttö, vaikka enum alla on suomeksi), pilottibanneri,
suostumus-% -tekstit, modaalilomakkeiden labelit, placeholderit, toastit, tyhjätilat, tooltipit (`title=`).

> **Vinkki suodattimiin:** näyttöteksti "Pilotti" käännetään ("Pilot"), mutta sen takana oleva enum `'pilotti'`
> pysyy suomeksi. Erota **näyttö vs. avain** — käännä vain näyttö.

## 🚩 FLAGAA (kuten teit lib-luovutuksessa — erinomaista)
Listaa erikseen jokainen merkkijono joka on **sekä näkyvä ETTÄ käytössä logiikassa** (vertailu/regex/Firestore-kirjoitus)
→ älä käännä sitä itse, me hoidamme sen getter-näyttökerroksella. (Kuten lib-forkin `DIAGNOOSI_RE` + pelipaikat.)

## Varmistus (kuten ennen)
`node --check` jos toimitat HTML:n · jäämäskannaus (näkyvää suomea ei jää) · sanasto johdonmukainen · älä koske
`data-i18n`-attribuutteihin jos niitä on (Claude lisää getter-kytkennän).

## Toimitus
`docs/SEURA_SV_KAANNOSMUISTI.json` (tai Seura_SV.html) + **riskilista** (flagatut logiikka-stringit) +
lyhyt yhteenveto (montako käännetty, mitkä jätetty enum-syistä).
