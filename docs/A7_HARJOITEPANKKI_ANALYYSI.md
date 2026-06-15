# A7 — Harjoitepankin tekninen velka: scoping & refaktorointi-toimeksianto

> **Tuotettu:** 2026-06-15 moni-agenttityönkulkuna (`a7-harjoitepankki-analyysi`, 6 agenttia: 4 syvämappaajaa → seniori-pääarkkitehti → adversariaalinen reviewer). 1,46 M tokenia.
> **Tarkoitus:** toimeksiantodokumentti, jonka pohjalta huippukoodari/-analyytikko voi tehdä harjoitepankin yhtenäistämisen **turvallisesti**. EI itse refaktorointi.
> **Status:** scoping valmis. Vaihe 0 (kanoonisuus + deploy-lähde) lukittava ennen koodausta.

---

## ⚠️ VERIFIOINTI-ADDENDUM (2026-06-15, gripillä ratkaistut ristiriidat)

Synteesi-arkkitehti verifioi mappaajien väitteet ja korjasi 3 — mutta **yksi korjaus oli itse väärä**. Ratkaistu suoraan koodista:

1. **`generoimViikoOhjelma` ON olemassa** — `harjoitelogiikka_v4.js:2379` (nimessä kirjoitusvirhe: "Viiko", ei "Viikko"). Arkkitehdin väite "ei ole olemassa, mappaaja keksi rivit" oli **virheellinen**; mappaaja oli oikeassa rivinumerosta. **MUTTA:** funktio EI ole `module.exports`-listalla (§3A) → **kuollut/sisäinen koodi** kunnes kutsupinta osoitetaan. Vahvistettava: `grep -rn generoimViiko *.html`.
2. **`generoimTehtavatV2` (R5-käyttäjä) ei kutsuta yhdestäkään HTML:stä** — määritelty `:1961`, mutta 0 kutsua live-tiedostoissa → **R5 `HARJOITEPANKKI` + V2 ovat poistettavissa** (ratkaisee §2B-alaviitteen + §7 avoimen kysymyksen #2). Iso siivousmahdollisuus Vaihe 4:ssä.

Kaikki muut rivinumerot tässä dokumentissa on arkkitehti verifioinut `harjoitelogiikka_v4.js`-rootista (2803 riviä, muokattu 10.6.2026).

---

## 0. Kanoonisuuden ratkaisu (lukittava ennen kaikkea muuta)

Dokumentin tärkein yksittäinen löydös — kumoaa oletuksen `src/lib` kanonisuudesta.

| Fakta | Evidenssi |
|---|---|
| Pelaaja_v7 lataa harjoitelogiikan **GitHub Pagesista**, ei lokaalista | `TalentMaster_Pelaaja_v7.html:316` → `src="https://terokoskela7-cmyk.github.io/talentmaster/harjoitelogiikka_v4.js?v=6"` |
| Deployattu = **root** `harjoitelogiikka_v4.js` (2803 r, 167 KB, 10.6.) | sisältää `valitsePaivanHarjoite` (2721), `laskeTekninenKehityskohde` (2695), `generoiMiksiteksti` (2768), `EVERTON_LISAYKSET` (2201) |
| `src/lib/harjoitelogiikka_v4.js` on **vanhempi stub** (2139 r, 119 KB, 29.5.) | EI sisällä `valitsePaivanHarjoite`-funktiota; HARJOITEPANKKI rivillä 1095 |

**Päätös:** root on totuus. `src/lib`-versio = kuollut tiedosto kunnes toisin osoitetaan. Vahvista ettei build kopioi lib→Pages, sitten poista lib tai korvaa re-exportilla. Tämä on **Vaihe 0**.

---

## 1. Datainventaario — kaikki harjoitepankki-rakenteet

| # | Rakenne | Tiedosto:rivi | Domain | Kenttäkonventio (avain) |
|---|---|---|---|---|
| R1 | `KETJUT` (5 fascia-linjaa + `pig` legacy) | `harjoitelogiikka_v4.js:40` | fysiikka | `{sbl,sfl,ll,diag,dfl,pig}` → `{nimi, lyhyt, cue}` |
| R2 | `PANKKI.T` (Fulham-mesosyklit) | `harjoitelogiikka_v4.js:92,98` | tekniikka | `T[leikkija/rakentaja/showcase][meso].vk1..4` + `ohje_*` |
| R3 | `PANKKI.D` (stage-pohjainen aktivointi) | `harjoitelogiikka_v4.js:357` | fysiikka | `D[ketju][]` → `{stage:[1,2], ohje_*, phv, phv_xp}` |
| R4 | `PANKKI.S` (kohdennettu 30%, U13+) | `harjoitelogiikka_v4.js:518` | sekoitettu | `S[ketju][]` → `{vk:'parillinen', stage_tasot, ohje_*, normit}` |
| R5 | `HARJOITEPANKKI` (V2, 6 linjaa, D/S/P) | `harjoitelogiikka_v4.js:1410` | fysiikka | `HARJOITEPANKKI[ketju].{D[pv:0-6], S, P.vaiheet}` — **POISTETTAVISSA (V2 ei kutsuta)** |
| R6 | `EVERTON_LISAYKSET` (ACL, laskeutuminen, core) | `harjoitelogiikka_v4.js:2201` | fysiikka | `[kategoria][ketju].S[]` → `{vk, ohje, phv, min_ika}` — **AKTIIVINEN** |
| R7 | `T_MESOSYKLI_KOHDE` + `T_KOHDE_PANKKI` | `harjoitelogiikka_v4.js:2569–2651` | tekniikka | meso→kohde-map + kohde→harjoite[]-pankki |
| R8 | Pelaaja_v7:n oma `window.PANKKI` (ketju-stub) | `TalentMaster_Pelaaja_v7.html:3560` | tekniikka | `PANKKI[KETJU][stage]` → `{nimi,kuvaus,kesto,taso,tyyppi}` |
| R9 | `TM_TESTIPANKKI` (64 testin metadata) | `src/lib/tm_testipankki.js:43–1722` | sekoitettu | `{id,kategoria,alikategoria,dimensio:D1/D2,ketju,fleiBidrag}` |
| R10 | `TM_KETJU_MATRIISI` (fascia + ICC + pallotekn.) | `src/lib/tm_ketju_matriisi.js:23–318` | fysiikka | `[ketju].{testit:[{id,icc,perustelu}], pallotekniikka:[{laji,rooli}]}` |
| R11 | `TM_PALLOTEKNIIKKA` (erillinen objekti) | `src/lib/tm_ketju_matriisi.js:325–396` | sekoitettu | `{laji}` → aktivaatiomekanismi (ei viitaa testipankkiin) |
| R12 | `WHY_LAUSEET` (narratiivi) | `tm_why_lauseet.js:35–156` | fysiikka | `[KETJU][tyyppi:T/D/S][ikä-stage]` → string ≤25 sanaa |
| R13 | `NIMIKKO_VIIKOT` + `IDOLIT` (8 vk makrosykli) | `src/lib/tm-microcycles.js:60–150` | tekniikka | `{vk, idoli, teema, ketju, jakso}` + 4 mikrosykliä/pv |

**Yhteenveto:** 5 päällekkäistä harjoitepankki-rakennetta (R2/R3/R4 = PANKKI; R5 = HARJOITEPANKKI; R6 = EVERTON; R8 = consumer-stub) + 2 testikerrosta (R9 mittaa, R10 kartoittaa) + 3 narratiivikerrosta (R12, R13, R7).

---

## 2. Konventioristiriita-matriisi

### 2A. Sama käsite eri muodoissa

| Käsite | Muoto A | Muoto B | Muoto C | Evidenssi |
|---|---|---|---|---|
| **Ikäkohtainen kieli** | `ohje_leikkija/rakentaja/showcase` (PANKKI) | `T[leikkija/rakentaja/showcase]` wrapper (R2) | `WHY_LAUSEET[…][ikä-stage]` (R12) | `:971` (`_ohje`), `:2682` (`_ohjeIkavaiheelle`), `tm_why_lauseet.js:35` |
| **Stage-progressio** | `stage:[1,2]` array (R3) | `stage_tasot:[[1,2],[3,4]]` (R4) | `pelaaja.harjoitettavuus_pisteet→1–5` (`_laskeStage:61`) | verifioitu rivinumeroin |
| **D-harjoitteen indeksointi** | stage-pohjainen `D[ketju][]` (R3) | viikonpäivä `D[ketju].D[pv:0–6]` (R5) | — | kaksi täysin eri D-mallia |
| **Ketjun nimeäminen** | `diag` (canonical, R1) | `sl`+`fl` (legacy) | `pig` (legacy, ei matriisissa) | `:40` vs `:36` |
| **Pallotekniikka** | mitattava aika (R9) | aktivaatiomekanismi (R11) | T_KOHDE-harjoite (R7) | `tm_testipankki.js:460` vs `tm_ketju_matriisi.js:325` |
| **FLEI-indeksi** | HPP ELITE fascia (`hpp_sbl` 1–3) | Palloliiton harjoitettavuus (`valakyykky`) | — | `tm_testipankki.js:789` vs `:917`, molemmat `fleiBidrag=true` |

### 2B. Päällekkäiset rakenteet — status

| Rakenne | Käyttäjä | Indeksointi | Status |
|---|---|---|---|
| `PANKKI` (R2–4) | `generoimTehtavat` (`:1030`), `valitsePaivanHarjoite` (`:2721`) | T=mesosykli, D=stage, S=ketju+vk | **AKTIIVINEN/kanon** |
| `HARJOITEPANKKI` (R5) | vain `generoimTehtavatV2` (`:1961`) | D=viikonpäivä, P=6vk | **POISTETTAVISSA** (V2 ei kutsuta — addendum) |
| `EVERTON_LISAYKSET` (R6) | `generoimTehtavat` (`:2482`, `:2524`) | kategoria→ketju→S[] | **AKTIIVINEN** (ei dead) |
| `window.PANKKI`-stub (R8) | Pelaaja_v7 `_haeHarjoiteData` (`:3525`), `_luoOhjelma` (`:3678`) | ketju→stage→[] | **shadow-stub** (§3D) |

---

## 3. Kuluttajasopimus — SÄILYTETTÄVÄ pinta

### 3A. Julkinen export-pinta (lukittava — `harjoitelogiikka_v4.js:2791–2802`)
```
module.exports = { PANKKI, laskeKetjuProfiili, generoimTehtavat,
  laskeTekninenKehityskohde, valitsePaivanHarjoite, generoiMiksiteksti,
  _laskeIkavaihe, T_MESOSYKLI_KOHDE, T_KOHDE_PANKKI }
```
Browser-globaalit (Pelaaja_v7): `valitsePaivanHarjoite`, `laskeTekninenKehityskohde`, `generoiMiksiteksti`, `_luoOhjelma` (consumer-lokaali). **Nimet + paluuobjektin kentät eivät saa muuttua.**

### 3B. Funktiosignatuurit
| Funktio | Signatuuri | Paluu-kentät (kuluttaja lukee) | Kutsukohta |
|---|---|---|---|
| `valitsePaivanHarjoite` | `(pelaaja, pankki, pvm)` | `{nimi, ohje, kesto, xp, yt, cue, tarina, viikkotavoite, kehityskohde, tyyppi, paiviaAktiivinen}` | `Pelaaja_v7:757, :1608` |
| `laskeTekninenKehityskohde` | `(pelaaja)` | `{kohde, lahde, varmuus, rawKohde}` | `Pelaaja_v7:755-ymp.` |
| `generoiMiksiteksti` | `(pelaaja, kehityskohde, ikavaihe)` | `{miksi_lause1, miksi_lause2, miksi_lause3}` | `Pelaaja_v7:1719` (try/catch) |

### 3C. Pelaajadokumentin kentät (Firestore-sopimus — poisto degradoi, ei kaada)
- `tki_kehityskohde` → ilman: oletus `pallonhallinta`
- `tsi_viimeisin`, `hh_taso` → prioriteettiketju P2/P3
- `syntymaVuosi`|`ika`|`ikaluokka` → ilman: oletus `rakentaja` (`_laskeIkavaihe:2673`)
- **`luotu`|`tuotu` → ilman: `paiviaAktiivinen=0`, harjoite EI vaihdu päivittäin** ← kriitikon korostama riski, ks. alla
- `flei_viimeisin` → ilman: S-kortti piilotettu (`Pelaaja_v7:781`)
- `harjoitettavuus_pisteet`, `phv_tila`, `adar_pisteet`, `flei_ketjut`, `testit.*` → ketju-/stage-valinta

### 3D. KRIITTINEN shadow-bug (verifioitu)
Pelaaja_v7 määrittelee **oman** `window.PANKKI`:n (`:3560`, R8) ja syöttää sen `valitsePaivanHarjoite(_pelaaja, window.PANKKI, …)`:lle (`:757`). Funktio odottaa `.T`-haaraa → fallback `:2725` **hylkää annetun pankin** ja käyttää moduulin sisäistä PANKKIa. → kuluttajan `window.PANKKI`-argumentti on **no-op** tässä kutsussa; relevantti vain `_haeHarjoiteData`/`_luoOhjelma`-fallbackille. Ei kuollut, vaan defensiivinen — mutta hämmentävä. Dokumentoitava.

---

## 4. Domain-invariantit — mitä EI saa rikkoa

| Invariantti | Sääntö | Lähde | Rikkomisen seuraus |
|---|---|---|---|
| **DIAG-lukitus** | `diag` korvaa SL+FL pysyvästi | Wilke 2016; `KETJUT:40`; Liikanen 2025 | Menetetään ammattilaisennustaja; `flei_ketjut.sl`-compat säilytettävä |
| **Ikävaihe-raja** | ≤12 leikkija, 13–15 rakentaja, 16+ showcase | `_ikatyyppi:52` | Väärä kielisävy + §28-rikkomus |
| **§28 ikätasoisuus** | leikkijälle EI rakentajan drilliä → fallback | `_ohjeIkavaiheelle:2687` | Liian vaikeat harjoitteet lapsille |
| **Domain-erottelu T vs D/S** | T=tekniikka (joka päivä), D=fys-aktivointi, S=fys-kohdennus | `generoimTehtavat:1030` | Väärä kuorma/teema |
| **Heikoin ketju S:lle** | S kohdistuu `min(FLEI-ketjut)`, EI profiiliin; ADAR<30→`diag` | `_laskeSKetju:1154`; `:1041` | -30% kohdennettu kuorma |
| **D1/D2-dimensio** | D1=fysiikka/antropometria, D2=lajitekniikka | `tm_testipankki.js:60` | TKI/FLEI sekoittuu |
| **PHV-override** | `phv_tila` ylikirjoittaa kuorman (xp×0.7) | verifioitava rivi | Ylirasitus |

**Domain-juuriongelma:** R9-testipankissa kategoria `tekniikka` sisältää sekä `lajitekniikka` että `tekniikkakilpailu` (sama `pujottelu` riveillä 460 JA 1074). Erottava **protokolla**-kenttä (H-H vs Palloliitto) puuttuu.

---

## 5. Tavoitekonventio — YKSI yhtenäinen kenttämalli

```
Harjoite = {
  id:        string,              // globaalisti uniikki, esim. "t_kaka_vk1"
  tyyppi:    'T'|'D'|'S'|'P',     // domain implisiittisesti: T=tekn, D/S/P=fys
  ketju:     'sbl'|'sfl'|'ll'|'diag'|'dfl'|'pig',  // canonical, EI sl/fl
  ohje:      { leikkija, rakentaja, showcase },     // korvaa ohje_leikkija/_rakentaja/_showcase
  stage:     [1,2] | [3,4] | [5],
  phv:       { ohje, xp } | null, // korvaa phv + phv_xp
  kesto:     number,  xp: number,
  cue:       string,              // idoli + lähde (tutkimusperusta LUKITTU)
  tarina:    string | null,       // vain T
  viikkotavoite: string | null,
  yt:        string | null,       // 11-merkkinen YouTube-ID (verifioitava, §7)
  vk:        'parillinen'|'pariton' | null,
  normit:    {...} | null,
  pallo_yhteys: string | null     // DIAG-linkki
}
```

**Keskeiset muutokset:** (1) `ohje_*` → nested `ohje:{}`; (2) `phv`+`phv_xp` → `phv:{ohje,xp}`; (3) ikäluokka-wrapper R2:ssa puretaan; (4) D-rakenne stage-pohjainen kanoniksi, R5-viikonpäivämalli deprekoidaan; (5) ketju aina canonical `diag`, `sl`/`fl`/`pig` vain lukukerroksessa.

---

## 6. Migraatiosekvenssi

**Vaihe 0 (esiehto, §0):** Ratkaise root vs lib + deploy-lähde. `grep -rn "src/lib/harjoitelogiikka" tests/`. Tee lib:istä re-export tai poista.

**Vaihe 1 — Characterization-testit ENSIN (Vitest, jo käytössä):** importtaa **rootista** (`require('../harjoitelogiikka_v4.js')`). Golden-master `valitsePaivanHarjoite`/`laskeTekninenKehityskohde`/`generoiMiksiteksti`/`generoimTehtavat` edustavalla pelaaja-fikstuurimatriisilla (ikä×phv_tila×stage×flei_ketjut×testit×adar) → snapshot koko paluuobjekti. Reunatapaukset: leikkija §28-fallback (2687), ADAR<30→diag (1154), puuttuvat kentät→oletukset, `luotu`-puute→`paiviaAktiivinen=0`, shadow-PANKKI (2725). Riski: matala.

**Vaihe 2 — Konvention yhtenäistys (§5):** adapter-kerros: `_ohje(harj,iv)` tukee molempia muotoja → migratoi data → poista vanha. Export-pinta ennallaan. Riski: keskisuuri (`_ohje:971`, `_ohjeIkavaiheelle:2682`, R2–R6). Snapshotit eivät saa muuttua.

**Vaihe 3 — Datan co-location:** yhdistä T/D/S/T_KOHDE → `HARJOITTEET[id]`; `PANKKI` säilyy export-faceadina. `WHY_LAUSEET` viittauksella, ei kopiona. Riski: keskisuuri.

**Vaihe 4 — Duplikaattien poisto:** (a) `src/lib`-versio; (b) **R5 `HARJOITEPANKKI` + V2 — poistettavissa** (addendum: ei kutsuta); (c) `window.PANKKI`-stub jos shadow-fallback poistettavissa; (d) FLEI kaksi-protokolla → `protokolla`-kenttä. Riski: korkea → tee viimeisenä, vaatii Pelaaja_v7-integraatiotestin.

---

## 7. Riskit & avoimet kysymykset

### Ratkaistava ENNEN koodausta
1. **Deploy-lähde (Vaihe 0):** Mikä julkaisee `…github.io/.../harjoitelogiikka_v4.js`? (Muisti: "verifioi live-bundle hash-vaihdosta".)
2. ~~`generoimTehtavatV2`-kutsupinta~~ → **RATKAISTU (addendum): ei kutsuta → R5 poistettavissa.**
3. **Shadow-PANKKI (§3D):** poistetaanko Pelaaja_v7-stub vai säilytetäänkö fallback `_luoOhjelma`:lle?
4. **`generoimViikoOhjelma` (`:2379`):** olemassa mutta ei exported — poistetaanko (dead) vai kytketäänkö (design)?

### Puuttuva data (priorisoitu)
| Avoin kysymys | Vaikutus |
|---|---|
| **`luotu`/`tuotu` pilottidatassa** — kriitikon #1 riski: ilman → `paiviaAktiivinen=0`, harjoite ei vaihdu päivittäin | KORKEA — kuluttajasopimus §3C |
| `testit.valakyykky_p` ym. harjoitettavuus-pisteet — mitataanko Firestoreen? | S-ketjuvalinta jää FLEI-fallbackiin |
| `tki_kehityskohde`, `tsi_viimeisin` kirjoituslähde | Kuluttajasopimus 3C |
| `yt`-YouTube-ID:t — verifioidut vai placeholderit? (`fHbM1v9G6xk` ×4) | Ylläpitoriski; verifioi ennen Vaihe 3 |
| FLEI kaksi protokollaa — `protokolla`-kenttä erottamaan HPP ELITE vs Palloliitto | Vaihe 4d |
| Pelaaja_v7:n oma `_laskeStage(sy,phv)` ≠ moduulin `_laskeStage(pelaaja)` — eri params, string vs numero | Ristiinkäyttöriski (kriitikko #2) |

---

## Adversariaalinen kritiikki (reviewer-agentti)

- **Invariantti (tekniikka≠fysiikka) säilyy:** ✅ kyllä
- **Kuluttajat turvassa:** ❌ EI — `luotu`-kentän puute (`paiviaAktiivinen=0`) ei ollut merkitty pakolliseksi kuluttajasopimuksessa; characterization-testien on varmistettava ettei `luotu`/`tuotu` nollata migraatiossa.
- **Suurimmat riskit:** (1) `luotu` puuttuu → harjoite ei vaihdu; (2) Pelaaja_v7 luo oman PANKKI/_laskeStage/_ohjelma → moduuli latautuu mutta osin käyttämätön; (3) S-valinta testidatasta ilman `harjoitettavuus_pisteet`-validointia.
- **Verdict:** Migraatiosuunnitelma periaatteessa kelpoinen ja invariantti säilyy, mutta kuluttajan näkökulmasta epävalmis kunnes `luotu`/`tuotu`-pakollisuus + Pelaaja_v7:n omat logiikat on huomioitu. Vaihe 0 (root vs lib) + Vaihe 1 (characterization-testit, jotka tarkistavat `luotu` säilyy) ovat ehdottomat ensiaskeleet.

---

## Verifioidut tiedostot
- `harjoitelogiikka_v4.js` (**kanon**, 2803 r) · `src/lib/harjoitelogiikka_v4.js` (vanha stub, ratkaistava)
- `TalentMaster_Pelaaja_v7.html` (pääkuluttaja, lataa Pagesista r316) · `TalentMaster_Agent_v1.html` (kuluttaja — viittaus vahvistettava)
- `src/lib/{tm_testipankki,tm_ketju_matriisi,tm-microcycles}.js`, `tm_why_lauseet.js`, `docs/PANKKI_harjoitteet.md`
- Testit: `vitest.config.js`, `tests/*.test.js` (esikuvat characterization-testeille)
