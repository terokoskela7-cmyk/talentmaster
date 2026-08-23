# Code-brief — Ruotsinkielistäminen (i18n) · KAIKKI APIT · vaiheistettu

> **Suunnitelma:** `docs/I18N_RUOTSI_SUUNNITELMA.md` (ristiriidassa se voittaa). Tavoite: **koko tuote ruotsiksi**
> (EIF + Sibbo/VIFK/GrIFK). **Käännöstaulukko `tm_lang.js` on JO valmis** (fi/sv/en 148 avainta, sv 0 puuttuvaa) —
> työ = i18n:n **kytkeminen** appeihin + puuttuvien UI-avainten lisäys per app. **Vaiheistettu: jokainen vaihe = oma PR
> + kolmivaiheinen verifiointi (L1 diff · L2 vitest+eslint · L3 live molemmilla kielillä).** Aja vaiheet järjestyksessä.
> **Suomi ei saa rikkoutua** (fallback sv→en→fi pitää fi:n ehjänä). **Poikkeama = ilmoita ENNEN.**

## KRIITTISET INFRA-LÖYDÖKSET (korjattava Vaihe 0:ssa)
1. **Latauspolku rikki:** `TalentMaster_Rekisterointi_Suostumus.html:13` lataa `https://…github.io/talentmaster/tm_lang.js`
   (juuri), mutta tiedosto on vain **`src/lib/tm_lang.js`** → juuri-URL **404** → i18n ei lataudu edes Rekisteröinnissä.
   **Vahvista live (github.io) ENNEN**: 404 vai onko Pagesissa vanha juurikopio. → **Kanonisoi:** siirrä/kopioi `tm_lang.js`
   `lib/`-kansioon (sama kuin muut libit: `lib/tm_kehityskaari.js?v=N`), päivitä KAIKKI lataukset → `lib/tm_lang.js?v=1`.
   `src/lib/tm_lang.js` → re-export (`module.exports = require('../../lib/tm_lang.js')`) tai poista jos ei ladata (§33 A6-kuvio).
2. **Kielivalinta kovakoodattu:** `kieliKartta = {'vifk':'sv','grifk':'sv'}` (Rekisterointi ~272) → **Sibbo/EIF/EPS jää suomeksi.**
   → Lue kieli **Firestore-kentästä `seurat/{seuraId}.kieli`**. Kartta jää vain autentikoimattoman Rekisteröinnin fallbackiksi
   (ennen kuin seura-doc luettu) — **lisää siihen `sibbovargarna`, `eif`, `eps`**.
3. **Brändibugi:** `tm_lang.js` sähköpostimalli käyttää `#3EC9A7` (§5 KIELLETTY) → **`#28B090`**.

## tm_lang.js API (olemassa — reuse, älä rakenna uutta)
- `t('kategoria.avain', muuttujat?)` → aktiivisen kielen teksti, fallback sv→en→fi.
- `tmAsetaKieli(kieli, tallenna=true)` → asettaa `_tm_kieli` + localStorage. `_tm_kieli` init = `localStorage['tm_kieli'] || 'fi'`.
- **Prioriteetti (suunnitelma §1.2):** `seurat/{id}.kieli` → `localStorage['tm_kieli']` (käyttäjän manuaalivalinta) → `'fi'`.

---

## VAIHE 0 — Infra + baseline (oma PR) · unlock EIF heti
**Tavoite:** i18n-putki kaikkiin appeihin + keskitetty kieli-init, ILMAN merkkijonojen irrotusta vielä. EIF saa ruotsin­kielisen suostumuksen + emailit heti.
1. **Kanonisoi `tm_lang.js`** → `lib/tm_lang.js` (löydös 1). Lataa se KAIKKIIN: VP_v25, Master_v16, Pelaaja_v7, Vanhempi_v2, Seura.html, Rekisterointi — `<script src="lib/tm_lang.js?v=1">` (Rekisterointi: korjaa absoluuttinen URL relatiiviseksi tai oikeaan polkuun).
2. **Keskitetty kieli-init** (jaettu helper esim. `tmKieliInit(seuraDoc)`): kun seura-doc on ladattu, jos käyttäjällä EI ole eksplisiittistä `localStorage['tm_kieli']`-valintaa → `tmAsetaKieli(seuraDoc.kieli || 'fi', false)`; muuten kunnioita käyttäjän valintaa. Kutsu jokaisen appin seura-latauksen jälkeen.
3. **Poista kovakoodattu `kieliKartta`** ohjaavana; Rekisteröinnin fallback-karttaan lisää `sibbovargarna/eif/eps`.
4. **Data-fix:** varmista `seurat/{id}.kieli === 'sv'` seuroille sibbovargarna, vifk, grifk, eif (+ eps jos sv). Konsolikomento/skripti (SA), idempotentti.
5. **Brändiväri** `#3EC9A7`→`#28B090` tm_lang-emaileissa.
6. Kieli-**vaihtokytkin** (asetukset/topbar, valinnainen tässä vaiheessa): `tmAsetaKieli(kieli)` + uudelleenrender/reload.
- **DoD:** kaikki apit lataavat langin kaatumatta (t() saatavilla); EIF-suostumus + emailit sv; fi ennallaan kaikkialla; `?v` vain jos tm_lang muuttuu; SW-allowlist (Pelaaja/Vanhempi) sisältää `lib/tm_lang.js`; SW-cache bumpattu jos HTML muuttuu.
- **L3:** github.io-live: EIF-seuran suostumuslomake + email sv; muut apit toimivat suomeksi ennallaan.

## VAIHE 1 — Perhe + pelaaja (Vanhempi_v2 + Pelaaja_v7) · oma PR (tai 2)
- Irrota näkyvät kovakoodatut merkkijonot → `t('vanhempi.*')` / `t('pelaaja.*')`; **laajenna `lib/tm_lang.js`** (fi+sv+en) uusilla avaimilla.
- **§7.22-turvallinen sv-sanoitus** (vahvuus ensin, prosessikehu, EI vertailua/uhkaa). Käytä olemassa olevia `yleiset.*`/`nav.*` missä sopii.
- **Dynaaminen sisältö EI tässä:** harjoite-"miksi"-tekstit (`harjoitelogiikka_v4.js`), ADAR-narratiivi → Vaihe 4 (merkitse `// i18n TODO V4`).
- **String-concat (§7.1):** `'…'+t('x')+'…'` — EI nested template literaleja. **SW-cache-versio + allowlist** (§27.4).
- **DoD/L3:** molemmat kielet renderöityvät molemmissa teemoissa; fi-regressio ehjä; §7.22 sv:ssä; vitest+eslint vihreä.

## VAIHE 2 — Valmentaja (Master_v16) · oma PR
- `t('master.*')` + tm_lang-laajennus. Inbox/viestit/Kehitys-näkymä/testityökalu/KPI-otsikot. Sama kuri kuin V1.

## VAIHE 3 — VP (VP_v25) + Seura (Seura.html) · oma PR (jaettava näkymittäin)
- `t('vp.*')`, `t('seura.*')`. **Suurin merkkijonomäärä** → jaa alaPR:iin näkymittäin (Tilanne · Tuki · Pelaajat · Kalenteri · Raportointi · coach-paneeli) jottei yksi PR ole liian iso verifioida.

## VAIHE 4 — Dynaaminen sisältö + oppaat (erikseen, oma briffi)
- Harjoitegeneraattorin sv-tekstit · ADAR-narratiivi sv (aiProxy kieli-param) · OPAS_*-sv · in-app aloitusopas sv.

---

## INVARIANTIT (kaikki vaiheet)
- **Suomi ehjä:** fallback pitää fi:n; jokainen PR testataan sv **JA** fi.
- **Yksi käännöslähde:** `lib/tm_lang.js` — ei rinnakkaisia taulukoita. Avaimet `snake_case`, `kategoria.avain`.
- **Fallback ei kaada:** puuttuva avain → sv→en→fi, ei tyhjää/kaatumista.
- **Brändi:** 0 kiellettyä väriä (§5), molemmat teemat. **§7.22** säilyy sv:ssä (perhe/pelaaja).
- **§7.1** string-concat, ei nested template literaleja. **SW** (Pelaaja/Vanhempi) cache-versio + allowlist kun HTML muuttuu.
- **Ei `?v`-käsibumppia** muuhun kuin tm_lang.js:ään (workflow hoitaa appien version); tm_lang.js muutokset → nosta sen `?v`.

## VERIFIOINTI (Claude, per vaihe)
L1 diff · L2 `npx vitest run --exclude 'tests/rules/**'` + eslint · L3 headless **molemmat kielet + molemmat teemat**:
sv renderöityy, fi-regressio ehjä, fallback toimii puuttuvalla avaimella, 0 kiellettyä väriä. **Aloita Vaihe 0** — ilmoita RECON-löydökset (etenkin infra-löydös 1: onko juuri-URL 404 livessä) ENNEN toteutusta.
