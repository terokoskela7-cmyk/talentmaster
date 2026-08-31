# Code-brief — i18n VAIHE 5 (henkilöstö) · VP_v25 · OHJELMASUUNNITELMA + VAIHE 0 (infra + chrome)

> **Konteksti:** Perhepinta (Pelaaja + Vanhempi) on nyt 100 % sv (V4-A…B7). Seuraava kaari = **henkilöstöpinta**,
> aloitetaan **VP_v25**:stä (ensisijainen johdon näkymä · EIF:n Jukka = VP · sv-seurat GrIFK/VIFK/Sibbo/EIF).
>
> **Mittakaava (rehellisesti):** VP_v25 = **17 892 riviä, 0 t()-kutsua, ~31 render-funktiota.** Tämä on
> **monivaiheinen ohjelma**, ei yksi PR. Perhepinta (7,7k riviä, osittainen infra) vaati 7 kierrosta — VP on
> 2,3× isompi nollasta. **Vaiheistetaan näkymä kerrallaan.** Tämä briiffi = **ohjelmasuunnitelma + Vaihe 0**
> (infra + aina-näkyvä chrome). Näkymät tulevat omina briiffeinään Vaihe 0:n jälkeen.
>
> **Käännösmuisti:** Kim käänsi koko VP:n sv:ksi → **`docs/VP_SV_KAANNOSMUISTI.json`** (2229 fi→sv-paria,
> committattu). **Käytä tätä sanktioituna sv-lähteenä** — se kattaa chromen (Pelaajat→Spelare · Kalenteri→Kalender ·
> Tilanne→Läge · Valmentajat→Tränare · Raportointi→Rapportering · Asetukset→Inställningar · Kirjaudu ulos→Logga ut …).

---

## Arkkitehtuuri (sama getter-pohja kuin perhepinta)
- **tm_lang.js on jo ladattu** (rivi 18, `?v=1`) → `t()` on käytettävissä, tarvitaan vain kieli-init + reititys.
- **Avainnamespace: `vp.*`** `lib/tm_lang.js`:ssä (fi/sv/en). Jaetut nav-termit voivat käyttää olemassa olevia
  `nav.*`-avaimia jos sopivat.
- **T()-helper** (kuten Pelaajassa): lisää VP:hen `const T = (k) => t('vp.' + k)` (tai suora `t('vp.x')`). Code valitsee.
- **fi = nykyiset stringit sanatarkasti** (regressio ehjä, fallback). Kaikki 3 kieltä (fi/sv/en).

### Kieli-init (staff — EROaa anon-pelaajasta!)
VP-käyttäjä on **kirjautunut** ja hänellä on `seuraId`-claim → **VP voi lukea seuradokin `kieli`-kentän suoraan**
(Rules §12: `onOmaSeura()` sallii). EI tarvita denormalisointia (toisin kuin Osa B pelaajalle). Boot-flow:
1. Kun seura-dokki on ladattu (VP lataa sen joka tapauksessa), lue `seura.kieli`.
2. `tmKieliInitSeura(seura.kieli)` (prioriteetti: käyttäjän localStorage-manuaalivalinta → seura.kieli → 'fi').
3. `draw()`/uudelleenrender aktiiviselle näkymälle.
4. **Kieli-valitsin** (FI/SV/EN) topbariin TAI Asetukset-näkymään → `tmAsetaKieli(k, true)` + rerender.

---

## OHJELMASUUNNITELMA (vaiheet — kukin oma PR + oma L1/L2/L3-tarkastus)

| Vaihe | Skooppi | render-funktiot |
|---|---|---|
| **V0 (TÄMÄ)** | **Infra + chrome**: kieli-init (seura.kieli) + kieli-valitsin + topbar + nav/workspace-labelit + login-box | boot + topbar + nav |
| V1 | Tilanne / Etusivu (laskeutumisnäkymä) | `renderTilanne` · `renderKotiVP` · `_renderKausipalkki` · `renderDeadlinePalkki` · `_renderSignaaliLista` · `renderVpAloitaKortti` |
| V2 | Pelaajat + kortit | `renderPelaajat` · `renderFleiKortti` · `renderKehitysKortti` · `renderKehitysLohko` · `renderTalentitLohko` · `renderPoikkeamat` |
| V3 | Joukkue-syvänäkymä (§19/§34 — §7.22-herkkä analytiikka) | `avaaJoukkueSyvanakyma` + `_jsv*`-apurit · `renderJoukkualy` |
| V4 | Kalenteri + Viikko | `renderKalenteri` · `renderVpViikko` |
| V5 | Valmentajat + Seuranta + Mentorointi | `renderValmentajat` · `renderVpSeuranta` · coach-modaali |
| V6 | IDP + Jaksofokus + Pelaajaraportti | `renderIdpJono` · `renderJaksofokus` · `_renderMDTProfiili` · `renderVPTuloskortti` · `renderReviewit` |
| V7 | Testit + Raportointi + loput | `renderVpTestit` · `renderRaportointi` |

> **Järjestys perustelu:** V0 chrome ensin (aina näkyvä) → V1 laskeutumisnäkymä (ensivaikutelma) → sitten
> käytetyimmät. **Poikkeama/uusi näkymä → ilmoita**, päivitetään suunnitelmaa.

---

## VAIHE 0 — SKOOPPI (tämä PR)

### A) Kieli-init + valitsin (infra)
1. Boot: seura-dokin latauksen jälkeen `tmKieliInitSeura(seura.kieli || null)` + rerender.
2. Kieli-valitsin (FI/SV/EN) — topbar-oikea TAI Asetukset. `tmAsetaKieli(k, true)` (localStorage voittaa seura-oletuksen).
3. `<title>` — valinnainen (staattinen; jos kieliä vaihdetaan, JS-päivitys). Matala prio.

### B) Chrome-tekstit (aina näkyvä kehys) → reititä `t('vp.*')`, sv Kimin muistista
| Alue | Stringit (fi) | sv-lähde |
|---|---|---|
| **Topbar** | seura-konteksti-badge, sähköposti-labelit, **"Kirjaudu ulos"** | Kim: Kirjaudu ulos→Logga ut |
| **Nav / workspace** | **Tilanne · Pelaajat · Valmentajat · Kalenteri · Raportointi · Asetukset** (+ Etusivu/Yhteenveto/Talentit/Testit/Viikko/Työkalut) | Kim: Läge/Spelare/Tränare/Kalender/Rapportering/Inställningar (loput käännä samassa hengessä) |
| **Login-box** | rooli-teksti (`login-role`), demo-linkki (`login-demo`), kirjautumis-CTA, mahd. virheet | Kim + uudet |
| **Yleiset napit** | Tallenna/Peruuta/Sulje/Takaisin/Lataa jne. jos chromessa | Kim (Spara/Avbryt/Stäng/Tillbaka…) |

> **Kimin muistista puuttuvat** (Yhteenveto/Etusivu/Talentit ym.): käännä samassa hengessä (Yhteenveto→Sammanfattning ·
> Etusivu→Startsida · Talentit→Talanger) ja **lisää muistiin** (pidä `docs/VP_SV_KAANNOSMUISTI.json` kasvavana SSOT:na).

### C) Skooppirajaus V0:ssa
VAIN aina-näkyvä chrome (topbar + nav + login + kieli-valitsin). **EI** näkymäsisältöä (renderTilanne-body ym. = V1+).
Jos nav-labelin klikkaus vie näkymään jonka sisältö on vielä fi — se on OK (V0 kattaa vain kehyksen; sisältö tulee vaiheittain).

---

## Vartijat
- **Glossaari — KimIN MUISTISSA ON VIRHEITÄ, korjaa kanonisiin (§14/§34):**
  - Ponnauttelu → **Jonglering** (EI Kimin "Utkast") · Pujottelu → **Slalom/slalombana** (EI Kimin "Dribbling") ·
    Syöttö → Passning · Kuljetus-laukaus → Föring och skott · Pituuspotku → Längdspark.
  - Käytä samoja kanonisia sv-lajitermejä kuin perhepinta (harjoitelogiikka_v4 HARJOITE_I18N.sv). **Ristiriita → kanoninen voittaa.**
- **§7.22/§34 (kun näkymäsisältöön edetään):** VP näkee tasoluvut/TKI/analytiikan (se on työkalu) — MUTTA henkilöstön
  näkymässä säilyy metodologia-kehys (datan ikä esitettävä §Header, ei "data vanhaa"-kieltä). V0 chrome ei koske tätä.
- **§7.1 string-concat:** VP käyttää sekä template-literaaleja että `+`-konkatenointia. `${t(...)}` OK, EI nested template literaleja.
- **fi ei rikkoudu; fallback ehdoton.** Kanoninen root `lib/tm_lang.js`.
- **§5:** ei väri-/fonttimuutoksia.

## Cache-bust (§27.4 — KRIITTINEN, perhepinnan oppi)
- **VP lataa `tm_lang.js?v=1`** — vanha cache-avain. Kun tm_lang muuttuu (uudet `vp.*`), **bumppaa VP:n `?v=1 → ?v=10`**
  (perhepinta on jo ?v=9; nosta kaikki tm_langia lataavat samaan uuteen versioon TAI vähintään VP tuoreeseen).
  **JOKAINEN tm_lang-sisältömuutos bumppaa ?v:n kaikissa lataavissa apeissa** — additiivinenkin (sama ?v = sama cachetettu tavu).
- VP_v25 HTML muuttuu → **version.json auto-bump hoituu mainissa** (§33, ÄLÄ aja version:bump feature-haarassa). VP:llä ei omaa SW:tä (ei PWA) → ei SW-bumppia.

## DoD (Vaihe 0)
- VP:n **aina-näkyvä chrome sv-tilassa ruotsiksi** (topbar/nav/login/kieli-valitsin), fi/sv/en.
- Kieli-init: EIF-VP (seura.kieli='sv') laskeutuu sv-chromeen; manuaalivalinta voittaa; fi-seura → fi.
- fi-regressio ehjä. Vitest (uusi vp-chrome-i18n: avainkattavuus + fi-regressio). `npm run lint` EXIT 0.

## Verifiointi (Claude — KORJATTU 4-KERROSPORTTI, perhepinnan oppi)
i18n-täydellisyys = **"reitittämätön näkyvä teksti", EI "etsi suomea"**:
1. **Kielineutraali staattinen skannaus** (reitittämätön `>teksti<` + UI-literaalit, poista `${t(...)}`, lipputa mikä tahansa sana).
2. **Live fi/sv render-diffi** (chrome molemmilla kielillä; sana identtinen molemmissa = universaali tai reitittämätön).
3. **Toast-audit** (jokainen `_toast(`/`alert(`-kutsupaikka chromessa).
4. **`${...} <literal>`-vierus-skannaus** (interpoloinnin vieressä olevat kovakoodatut sanat).
→ V0-skooppi = chrome; sisältönäkymät saavat jäädä fi:ksi kunnes niiden vaihe tulee. Live-L3: EIF-VP kirjautuneena (Jukka) tai injektoitu seura.kieli='sv'.

## Rajaus (EI V0:ssa)
- Näkymäsisältö (renderTilanne-body… = V1+). Master/Seura/Admin (omat kaaret). aiProxy/ADAR-narratiivi (V4-C/LLM).
