# TalentMaster™ — Ruotsinkielistäminen (i18n) · arkkitehtuuri + vaiheistus

> Tavoite: **koko tuote ruotsiksi** (EIF + muut ruotsinkieliset seurat: Sibbo-Vargarna, VIFK, GrIFK). Laadittu auditin
> pohjalta. **Ristiriidassa tämä doc voittaa** yksittäiset briiffit. Kukin vaihe = oma PR + kolmivaiheinen verifiointi (L1/L2/L3).

## 0. Lähtötila (auditoitu 2026-08)
- **Käännöstaulukko `src/lib/tm_lang.js` on VALMIS:** fi/sv/en, **148 avainta, sv 0 puuttuvaa** (ainoat sv=fi = brändinimi + "ID", oikein). Sisältää `t('kat.avain')`-haun + **fallback sv→en→fi** + sähköpostimallit.
- **i18n on kytketty vain YHTEEN tiedostoon:** `TalentMaster_Rekisterointi_Suostumus.html` (suostumus + onboarding-emailit).
- **Pääsovellukset (VP_v25, Master_v16, Pelaaja_v7, Vanhempi_v2, Seura.html) = 0 i18n** — kovakoodattua suomea.
- **BUGI:** kielivalinta on kovakoodattu `kieliKartta = { 'vifk':'sv','grifk':'sv' }` (Rekisterointi ~272). **Sibbo/EIF/EPS saavat jo nyt suomenkielisen suostumuslomakkeen.** Firestore-kenttä `seurat/{id}.kieli` on olemassa (§11) mutta ei ohjaa kielivalintaa.
- **Brändibugi:** `tm_lang.js` sähköpostimalli käyttää `#3EC9A7` (§5 KIELLETTY) → korjattava `#28B090`.

## 1. Arkkitehtuuriperiaatteet (pysyvät)
1. **Yksi käännöslähde:** `src/lib/tm_lang.js` (`TM_LANG.{fi,sv,en}`, `t('kat.avain')`). Laajennetaan per app, ei uusia rinnakkaisia taulukoita.
2. **Kielivalinta yhdestä totuudesta:** aktiivinen kieli = `seurat/{seuraId}.kieli` (sv/en/fi) → fallback `localStorage['tm_kieli']` (käyttäjän manuaalinen valinta) → `'fi'`. **Poista kovakoodattu `kieliKartta`** — lue Firestore-kenttä. Kartta jää vain autentikoimattomaan Rekisterointiin fallbackina kunnes seura-doc luettu.
3. **Fallback ei koskaan hajota:** puuttuva avain → sv→en→fi. Renderöinti ei kaadu vaikka avain puuttuu.
4. **§7.22 säilyy käännöksissä:** lapsi-/perhepinnan turvallinen, ei-vertaileva kieli säilyy ruotsiksi (ei "menetät/putoat"-kehyksiä). Käännös ei saa tuoda uhkakehystä.
5. **Suomi ei rikkoudu:** jokainen vaihe testataan **molemmilla kielillä** (fi ennallaan + sv toimii). Fallback pitää fi:n ehjänä.
6. **String-concat-kuri (§7.1):** i18n-merkkijonot upotetaan olemassa olevaan `'...'+t('x')+'...'`-tyyliin — EI uusia nested template literaleja (rikkoo parserin).
7. **Avainkäytäntö:** `snake_case`, `kategoria.avain`, kategoria per näkymä/app (esim. `vp.*`, `master.*`, `pelaaja.*`, `vanhempi.*`, `seura.*`). Uudelleenkäytä olemassa olevia (`yleiset.*`, `auth.*`, `nav.*`).

## 2. Erikoistapaukset (ratkaistava suunnittelussa)
- **Dynaaminen/generoitu sisältö:** harjoitegeneraattorin "miksi"-tekstit (`harjoitelogiikka_v4.js`), ADAR-narratiivit (AI), tekniikkaviitteet. → **Oma alivaihe:** joko (a) sv-sisältöpassit generaattorin teksteille tai (b) AI-narratiiviin kieli-parametri (aiProxy). Ei kuulu perus-UI-i18n:ään; merkitään erikseen.
- **Oppaat (OPAS_VP/OPAS_PERHE, in-app aloitusopas):** omat sisältötiedostot → sv-versiot erikseen (ei tm_lang-avaimia; isompia tekstejä).
- **Numerot/pvm/yksiköt:** sv käyttää samaa muotoa (pp.kk.vvvv OK); desimaalipilkku jo suomalainen. Ei muutosta.
- **Sähköpostit:** jo sv:ssä (`tm_lang.js email.*`) — korjaa vain brändiväri.
- **PWA/SW:** Pelaaja/Vanhempi SW-cache-versiot nostettava kun HTML muuttuu (§27.4). `tm_lang.js` lisättävä SW-allowlistiin (jotta latautuu offline).

## 3. Vaiheistus (per PR, prioriteetti = perhe ensin)

### VAIHE 0 — Infra + baseline (unlock EIF heti)
- Lataa `tm_lang.js` **kaikkiin appeihin** (script-tag) + **keskitetty kieli-init** `seurat/{id}.kieli`:stä (poista kovakoodattu kieliKartta; korjaa Sibbo/EIF/EPS).
- **Varmista `seurat/{id}.kieli` = 'sv'** kaikille ruotsiseuroille (Sibbo, VIFK, GrIFK, EIF) — data-fix.
- Kieli-vaihtokytkin UI (asetukset/topbar): manuaalinen `localStorage['tm_kieli']`-override.
- Korjaa `#3EC9A7` → `#28B090` tm_lang-emaileissa.
- **EI vielä merkkijonojen irrotusta appeissa** — vain putkitus + jo-valmis suostumus/emailit. **EIF saa baseline-ruotsin (suostumus + emailit) heti.**
- Verifiointi: suostumus + emailit sv EIF:lle; appit lataavat langin kaatumatta; fi ennallaan.

### VAIHE 1 — Perhe- ja pelaajapinta (Vanhempi_v2 + Pelaaja_v7)
- Irrota kovakoodatut merkkijonot → `t('vanhempi.*')` / `t('pelaaja.*')`; laajenna `tm_lang.js` (fi+sv+en).
- §7.22-turvallinen sv-sanoitus (vahvuus ensin, prosessikehu, ei vertailua). Harjoite-"miksi"-tekstit = erikseen (§2).
- SW-cache-versiot + allowlist. Verifiointi molemmilla kielillä, molemmat teemat.

### VAIHE 2 — Valmentaja (Master_v16)
- `t('master.*')` + tm_lang-laajennus. Inbox/viestit/kehitysnäkymä/testityökalu.

### VAIHE 3 — VP (VP_v25) + Seura (Seura.html)
- `t('vp.*')`, `t('seura.*')`. Suurin merkkijonomäärä → jaettava tarvittaessa alaPR:iin näkymittäin (Tilanne/Tuki/Pelaajat/Kalenteri/Raportointi).

### VAIHE 4 — Dynaaminen sisältö + oppaat (erikseen)
- Harjoitegeneraattorin sv-tekstit · ADAR-narratiivi sv (aiProxy kieli-param) · OPAS_*-sv-versiot · in-app aloitusopas sv.

## 4. Per-vaihe DoD (kaikille)
- Molemmat kielet renderöityvät (sv **JA** fi ennallaan) · fallback ei kaada puuttuvalla avaimella.
- Ei uusia nested template literaleja (§7.1) · brändi ennallaan (0 kiellettyä väriä, molemmat teemat).
- §7.22 säilyy sv:ssä (perhe/pelaaja) · Vitest + eslint vihreä · tarvittaessa SW-cache bumpattu.
- L3: live sv-render per muutettu näkymä + fi-regressio.

## 5. Työmäärä-arvio (karkea)
- **V0 infra:** pieni–keskisuuri (putkitus + kieli-init + data-fix). Nopea arvo (EIF baseline).
- **V1 perhe/pelaaja:** keskisuuri (2 appia, §7.22-sanoitus).
- **V2 valmentaja:** keskisuuri.
- **V3 VP+Seura:** suurin (jaettava näkymittäin).
- **V4 dynaaminen:** erillinen, riippuu AI-/generaattorilinjauksista.

## 6. Avoin päätös (Tero)
- **Vaiheiden järjestys:** perhe ensin (V1) vai henkilöstö ensin? Suositus: **V0 → V1 (perhe) → V2 → V3** (EIF:n perheet ovat ruotsinkielisin kosketuspinta; henkilöstö sietää suomea pisimpään).
- **Kieli-init datalähde:** vahvista että `seurat/{id}.kieli` on oikea totuuslähde (suositus) vs. käyttäjäkohtainen valinta ensisijaisena.
