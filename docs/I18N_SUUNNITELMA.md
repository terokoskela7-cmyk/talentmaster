# Monikielisyys (i18n) — vaiheistettu suunnitelma

> Scoping 2026-06-23 (Tero). Liittyy: STRATEGIA §3 (kv-strategia) + §4 Sprint 3 (i18n suunniteltu, ei tehty) + §5 backlog #5.
> **Nykytila (tutkittu koodista):** `src/lib/tm_lang.js` on olemassa (`t('kategoria.avain')`, namespacet, fallback sv→en→fi,
> kielilähde `seurat/{id}.kieli`/localStorage, ~144 käännöstä) — **MUTTA live-appit eivät käytä sitä: `data-i18n` = 0**
> (vain arkistossa). UI on kovakoodattua suomea. Eli infra on, kytkentä puuttuu kokonaan. **Tämä on monen sprintin työ.**
> Akuutti tarve: ruotsinkieliset pilottiseurat LIVE (GrIFK, VIFK, Sibbo-Vargarna).

---

## 0. PERIAATTEET

- **Perhe-/pelaajapinta ensin.** Ruotsinkieliset *perheet* törmäävät kieleen (suostumus, pelaaja-/vanhempinäkymät). Henkilöstö (VP/valmentaja) on usein kaksikielinen → staff-appit viimeisinä.
- **Termistö ihmisen kääntämänä, ei konekäännös.** Metodologiatermit (FLEI→"kroppsberedskap", pelihavainto, kalibraatio, kehon valmius…) vaativat urheilutieteellisesti oikeat ruotsin/englannin termit. **Glossary ensin, sitten merkkijonot.**
- **Additiivinen, ei big-bang.** Jokainen vaihe tuotantokelpoinen itsessään. Suomi pysyy oletuksena; sv/en lisätään kerros kerrokselta.
- **`data-i18n` staattiseen, `t()` dynaamiseen.** §7.1 string-concat + template-literaalit → `t('avain', {muuttuja})`-interpolointi. Tämä on työn vaikein osa (dynaamiset merkkijonot).
- **RTL-valmius ilmaiseksi:** uusi CSS käyttää **logical properties** (`margin-inline-start` ei `margin-left`) → arabia/heprea myöhemmin ilman uudelleenkirjoitusta (STRATEGIA §3).

## 1. VAIHEISTUS

### Vaihe 0 — i18n-moottori + kielivalinta (perusta, ei vielä käännöksiä)
- `tm_lang.js`: varmista `t()` + **interpolointi** (`t('x', {n:5})`) + fallback-ketju. Siirrä `src/lib/` → ladattava polku jos tarpeen.
- **`applyI18n(root)`** — käy läpi `[data-i18n]`-elementit + asettaa tekstin; kutsutaan jokaisen renderin jälkeen.
- **Kielivalinta:** `kieliKartta` `seurat/{id}.kieli`:stä (grifk/vifk/sibbovargarna → sv auto) + **topbar-toggle** (fi/sv/en) + localStorage-muisti.
- **Glossary-pohja:** `docs/I18N_GLOSSARY.md` — metodologiatermit fi/sv/en (ihmisen tarkistama). Lukitaan ennen merkkijonojen kääntämistä.
- Verifiointi: toggle vaihtaa kielen, fallback ei hajota, kieliKartta-auto toimii ruotsiseuralle.

### Vaihe 1 — PERHE-/PELAAJAPINTA (korkein arvo, rajattu) — sv + en
Pinnat joita ruotsinkieliset perheet koskettavat:
1. **`Rekisterointi_Suostumus.html`** (GDPR-suostumus — kriittisin; perhe ei voi rekisteröityä jos ei ymmärrä).
2. **Huoltajakutsu-sähköposti** (`lahetaHuoltajaKutsu`/`lahetaRekisteriKutsu` — seuran `kieli`:n mukaan).
3. **`TalentMaster_Pelaaja_v7.html`** (pelaajan app, §7.22-tekstit).
4. **`TalentMaster_Vanhempi_v2.html`** (vanhemman app).
- Johdota näiden merkkijonot `t()`/data-i18n + käännä sv (+ en). Aloita staattisista labeleista, sitten dynaamiset.
- Verifiointi: ruotsiseura → suostumus + kutsu + pelaaja + vanhempi sv:llä; suomiseura ennallaan.

### Vaihe 2 — SEURAPINTA (klubihenkilöstön työkalut)
- `TalentMaster_Seura.html` (seurahallinta) + `TalentMaster_Admin.html`. Käytetään seuratasolla; sv/en.

### Vaihe 3 — HENKILÖSTÖAPIT (suurin, viimeisenä)
- `TalentMaster_VP_v25.html` + `TalentMaster_Master_v16.html` (6000-rivisiä monoliitteja, tuhansia merkkijonoja, paljon dynaamista). Suurin urakka — tehdään kun perhepinta + seura on käännetty ja kielimoottori vakaa. Mahdollisesti osissa (näkymä kerrallaan).

## 2. RISKIT & HUOMIOT

- **Dynaamiset merkkijonot (§7.1)** = työn vaikein osa; älä aliarvioi. `t()`-interpolointi pakollinen.
- **Termistön johdonmukaisuus** kaikissa appeissa → glossary on single source.
- **Testikattavuus:** jokainen vaihe vaatii kieliläpikäynnin (sv natiivin tarkistus perhepinnalle — GDPR-suostumus erityisesti).
- **Ei riko suomea:** fallback fi aina; oletuskieli fi.
- **PWA/SW-cache:** kieli-asset (tm_lang.js) versioitava (`?v=`), SW-allowlist (§27.4).

## 3. SUOSITELTU ALOITUS

**Vaihe 0 (moottori + glossary) → Vaihe 1 (perhepinta).** Tämä antaa ruotsinkielisille perheille toimivan suostumus- + perhe-/pelaajakokemuksen rajatulla työllä. Henkilöstöappit (Vaihe 3) ovat iso erillinen urakka — ei lohkaista pilottivaiheessa ellei seurat sitä erikseen vaadi.

> **Status:** suunnitelma muistissa. Aloitus Vaihe 0:sta kun i18n valitaan työjonoon. Edellyttää glossary-päätöksen (metodologiatermit sv/en) — se on oma pieni mutta tärkeä esivaihe.
