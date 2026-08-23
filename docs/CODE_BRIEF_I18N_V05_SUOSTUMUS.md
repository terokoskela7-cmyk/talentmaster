# Code-brief — i18n VAIHE 0.5 · Suostumuslomakkeen sv/en-kytkentä

> **Konteksti:** VAIHE 0 (i18n-putki + `lib/tm_lang.js` + kieli-init `seurat/{id}.kieli`:stä) on jo mainissa (#397).
> Tämä on **V0.5** — irrota `TalentMaster_Rekisterointi_Suostumus.html`:n **kovakoodattu suomi** `t('suostumus.*')`-kutsuihin
> ja lisää avaimet `lib/tm_lang.js`:ään (fi+sv+en). Käännöstaulukko on **valmiina**: `docs/I18N_SUOSTUMUS_KAANNOKSET.md`.
> **Miksi tärkeä:** GDPR — suostumus on annettava kielellä jonka huoltaja ymmärtää. EIF (ruotsinkielinen) ei voi mennä
> liveen ennen kuin suostumuslomake renderöityy ruotsiksi. Ristiriidassa `docs/I18N_RUOTSI_SUUNNITELMA.md` voittaa.
>
> **⚠ LEGAL-GATE:** sv/en-tekstit ovat **LUONNOS** (`docs/I18N_SUOSTUMUS_KAANNOKSET.md`). **Tero/juristi vahvistaa
> sv- ja en-sanamuodot ennen kuin tämä menee tuotantoon (EIF-live).** Toteuta kytkentä; älä julkaise EIF:lle ennen vahvistusta.
>
> **⚠ PERUSVAATIMUS (Tero 2026-08): kieli on valittavissa AINA, KAIKISSA seuroissa — ei vain ruotsiseuroissa.**
> Ruotsinkielinen perhe voi olla myös suomenkielisessä seurassa (esim. SJK). GDPR: suostumus on saatava kielellä jonka
> huoltaja ymmärtää → **suostumuslomakkeessa on oltava näkyvä kielivalitsin (fi/sv/en) riippumatta seuran `kieli`-oletuksesta.**
> Seuran `kieli` = **oletus** (mikä kieli aukeaa ensin); huoltajan valinta **ohittaa** sen. Tämä on tämän vaiheen tärkein osa.

## Lähde (valmis, käytä sellaisenaan)
- **Käännöstaulukko:** `docs/I18N_SUOSTUMUS_KAANNOKSET.md` — 24 avainta fi/sv/en. **fi-arvot = normalisoidut** (ä/ö palautettu).
- **Kohde-DOM:** `TalentMaster_Rekisterointi_Suostumus.html` "Suostumukset"-kortti (rivit ~180–200) + onnistumisnäkymä.

## Tehtävä

### 1. Lisää `suostumus.*`-avaimet `lib/tm_lang.js`:ään (fi+sv+en)
Lisää `TM_LANG.fi.suostumus` / `.sv.suostumus` / `.en.suostumus` -kategoriaan **kaikki 24 avainta**
`docs/I18N_SUOSTUMUS_KAANNOKSET.md`-taulukosta. **Nosta `lib/tm_lang.js`:n `?v`** (kaikissa lataavissa apeissa) koska tiedosto muuttuu.
- **Nykyiset 7 geneeristä `suostumus.*`-avainta säilyvät** (otsikko/kuvaus/huoltajan_nimi jne.) — nämä 24 **täydentävät**, eivät korvaa.
- **Korjaa samalla fi-puolen puuttuvat ä/ö:t** jos jokin nykyinen fi-arvo on ilman diakriittejä.

### 2. Kytke lomakkeen näkyvä teksti `t()`:hen (ei rakennemuutoksia)
**Vain näkyvä teksti → `t()`. Checkbox-id:t (`c1`–`c7`), luokat (`req-b`/`opt-b`), `chkConsent()`-logiikka, `showPrivacy()`-nappi = ENNALLAAN.**

| DOM-elementti (nyt) | Avain |
|---|---|
| info-laatikko otsikko "Mitä tämä tarkoittaa käytännössä?" | `suostumus.info_otsikko` |
| info-laatikko `<p>` (Seura seuraa lapsesi…) | `suostumus.info_teksti` |
| `.cg-title` "Pakolliset" | `suostumus.ryhma_pakolliset` |
| `.cg-title` "Testaaminen ja kehitysseuranta" | `suostumus.ryhma_testaus` |
| `.cg-title` "Tietojen jakaminen" | `suostumus.ryhma_jakaminen` |
| `.req-b`-badge "PAKOLLINEN" (×2) | `suostumus.badge_pakollinen` |
| `.opt-b`-badge "VAPAAEHTOINEN" (×4) | `suostumus.badge_vapaaehtoinen` |
| c1 `<strong>` / `<span>` | `suostumus.c1_otsikko` / `suostumus.c1_teksti` |
| c2 `<strong>` | `suostumus.c2_otsikko` |
| c2 `<span>` **kolmiosainen** (linkkinapin ympärillä) | `suostumus.c2_teksti_alku` + [nappi: `suostumus.c2_linkki`] + `suostumus.c2_teksti_loppu` |
| c3 `<strong>` / `<span>` | `suostumus.c3_otsikko` / `suostumus.c3_teksti` |
| c4 `<strong>` / `<span>` | `suostumus.c4_otsikko` / `suostumus.c4_teksti` |
| c5 `<strong>` / `<span>` | `suostumus.c5_otsikko` / `suostumus.c5_teksti` |
| c6 `<strong>` / `<span>` | `suostumus.c6_otsikko` / `suostumus.c6_teksti` |
| nav "Takaisin" | `suostumus.nappi_takaisin` |
| nav "Vahvista ja lähetä" | `suostumus.nappi_vahvista` |
| onnistumisnäkymä otsikko | `suostumus.onnistui_otsikko` |
| onnistumisnäkymä teksti | `suostumus.onnistui_teksti` |

**c2 (kriittinen):** keskellä on `<button onclick="showPrivacy()">`-linkkinappi. **Säilytä nappi + sen tyylit + `onclick`;
korvaa vain napin ympärillä olevat tekstit ja napin oma teksti.** Rakenne:
`t('suostumus.c2_teksti_alku') + '<button …onclick="showPrivacy()">' + t('suostumus.c2_linkki') + '</button>' + t('suostumus.c2_teksti_loppu')`.
**§7.1 string-concat `+`** — EI nested template literaleja.

**`c7`** on piilotettu (`display:none`, ei näkyvää tekstiä) → **ei `t()`-kytkentää.**

### 3. Näkyvä kielivalitsin (fi/sv/en) — PAKOLLINEN, kaikissa seuroissa
Lisää suostumuslomakkeen **yläosaan (ennen suostumuskorttia) näkyvä kielivalitsin**: `Suomi · Svenska · English`
(esim. segmentoitu painikeryhmä tai selkeät napit). **Näytetään AINA**, riippumatta seuran `kieli`-oletuksesta — myös
suomenkielisen seuran (SJK) lomakkeella, jotta ruotsinkielinen huoltaja voi vaihtaa.
- **Klikkaus →** `tmAsetaKieli(kieli)` (tallentaa `localStorage['tm_kieli']`) **+ re-renderöi lomakkeen kaikki tekstit** `t()`:llä
  (mukaan lukien info-laatikko, ryhmäotsikot, badget, c1–c6, napit, onnistumisnäkymä). Ei sivunlatausta pakko, kunhan tekstit päivittyvät.
- **Aktiivinen kieli korostettuna** valitsimessa.
- **Prioriteetti (yksi totuus, sama kuin suunnitelma §1.2):** huoltajan valinta `localStorage['tm_kieli']` **ohittaa** →
  muuten seuran `seurat/{id}.kieli` (V0 `tmKieliInitSeura`, fallback-kartta `{vifk,grifk,sibbovargarna,eif}` autentikoimattomassa
  Rekisteröinnissä) → muuten `'fi'`. **Kun huoltaja on klikannut valitsinta, seuraoletus ei enää ohita valintaa.**

### 4. GDPR-audit: tallenna näytön kieli suostumuksen mukana (suositus)
Suostumuksen vahvistus kulkee `vahvistaSuostumus`-CF:n kautta. **Suositus:** välitä + tallenna kenttä `suostumus_kieli`
(aktiivinen `tmNykyinenKieli()` lähetyshetkellä) suostumusdokumenttiin → todiste että suostumus näytettiin huoltajan
ymmärtämällä kielellä (GDPR-tilivelvollisuus). Jos tämä laajentaa CF:ää, **ilmoita ENNEN** — voidaan tehdä omana pikku-lisänä.

### 5. Renderöinnin ajoitus
Jos teksti on staattista HTML:ää, muunna se rakennettavaksi `t()`-pohjaisesti tai päivitä kortin tekstit kieli-initin JA
jokaisen valitsinklikkauksen jälkeen. **Älä riko fi-oletusta** (kieli-init ilman seura-valintaa + ilman käyttäjävalintaa → fi).

## DoD
- **Kielivalitsin (fi/sv/en) näkyy JA toimii KAIKKIEN seurojen lomakkeella** (myös suomenkielisen seuran, esim. SJK) — huoltaja voi vaihtaa kielen aina.
- Valitsinklikkaus vaihtaa **koko lomakkeen** kielen välittömästi (info + ryhmät + badget + c1–c6 + napit + onnistumisnäkymä); huoltajan valinta ohittaa seuraoletuksen ja säilyy (`localStorage['tm_kieli']`).
- Suostumuslomake + onnistumisnäkymä renderöityvät **sv** kun `seurat/{id}.kieli==='sv'` (EIF/Sibbo/VIFK/GrIFK) ja **fi** muuten oletuksena — **fi-regressio ehjä**.
- Fallback ei kaada: puuttuva avain → sv→en→fi (mutta suostumuksessa **sv oltava täydellinen** ennen live'ä — se on).
- `showPrivacy()`-linkki toimii kaikilla kielillä; `chkConsent()` (pakolliset c1+c2 → nappi aktivoituu) **koskematon**.
- **0 kiellettyä väriä** (§5, teal `#28B090`), molemmat teemat.
- **§7.1** string-concat, ei nested template literaleja. `lib/tm_lang.js` `?v` nostettu.
- Rekisteröinti ei ole PWA/SW-scopessa samalla tapaa kuin Pelaaja/Vanhempi — jos SW koskee, bumppaa cache + allowlist `lib/tm_lang.js` (§27.4).

## Verifiointi (Claude L3)
Live (github.io) **molemmat kielet + molemmat teemat**: **(a)** kielivalitsin näkyy suomenkielisen seuran (esim. SJK)
lomakkeella ja klikkaus vaihtaa koko lomakkeen sv↔fi↔en välittömästi; huoltajan valinta säilyy latauksen yli; **(b)**
sv-suostumus renderöityy täydellisenä (kaikki 6 checkboxia + badget + ryhmäotsikot + napit + onnistumisnäkymä), fi-regressio ehjä,
`showPrivacy()`-nappi toimii kaikilla kielillä, `chkConsent()` sallii lähetyksen vasta c1+c2, 0 kiellettyä väriä. **Poikkeama = ilmoita ENNEN.**

## EI TÄSSÄ
- Tietosuojaselosteen (`showPrivacy()`-modaali) sisällön kääntäminen — oma taski jos tarvitaan (isompi lakiteksti).
- Muut apit (Vanhempi/Pelaaja/Master/VP) — omat vaiheensa (V1–V3, `docs/CODE_BRIEF_I18N_RUOTSI.md`).
- sv/en-sanamuotojen lakivahvistus — **Tero/juristi** ennen EIF-liveä.
