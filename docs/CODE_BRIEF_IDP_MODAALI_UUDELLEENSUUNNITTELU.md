# TalentMaster™ — IDP-modaalin uudelleensuunnittelu · Code-brief v1

> **Kohde:** `TalentMaster_IDP_Kortti_v4.html` (+ jaetut `lib/`-renderöijät, joita muut apit kutsuvat)
> **Lähde-totuus (visuaalinen):** 7 design-karttaa (liitteet §10). Ristiriidassa design-kartta voittaa ulkoasusta, tämä brief arkkitehtuurista/datasta.
> **Testipelaaja:** Topias Koskela (KPV, sanktioitu) täydelle datalle · "Eino Virtanen" (rosteri) tyhjille tiloille. **EI oikeita alaikäisten nimiä.**
> **Periaate:** KISS · tulkinta ensin (OTO-valmentaja) · rehellinen tyhjä tila · muokattava/avoin (ei pakoteta) · molemmat teemat · brändilukko.

---

## 0. Yhteenveto

IDP-modaali rakennetaan viideksi pinnaksi (välilehtijärjestys) + kahdeksi jaetuksi komponentiksi. **Rakenna jaetut komponentit ensin `lib/`-renderöijinä** — niitä kutsutaan sekä IDP-modaalissa että VP/Master/Pelaaja/Vanhempi-näkymissä (reuse ilmaiseksi). Kaikki data luetaan **pikakentistä** (§26) — ei alikokoelmakyselyjä renderöinnissä.

Ketju on looginen jatkumo: **Aloitus** (selkäranka/ILP) → **Mittaus** (mitä testit kertovat) → **Arviointi** (5D-kehys) → **Kehitys** (jaksofokus-työpöytä) → **Viikko** (jaksofokus toteutuu tällä viikolla → katselmus takaisin).

---

## 1. Jaetut komponentit — RAKENNA ENSIN (`lib/`)

Molemmat = itsenäinen render-funktio joka ottaa DOM-elementin + datan + optiot. Ei riippuvuutta IDP-modaaliin → kutsuttavissa mistä tahansa apista (sama malli kuin `tm_eerikkila_normit.js`, `tm_kalenteri.js`).

### 1.1 `lib/tm_kypsyys.js` → `tmKypsyys(el, data, opts)`
Korvaa paljaan `phv_tila`-koodin ("AN") luettavalla kypsyyskuvalla. Design-kartta: **KYPSYYS_PHV_design_kartta_v1.html**.

- **data:** `{ maturity_offset, phv_ika, kronologinen_ika, phv_tila_koodi (PRE/LAH/PH/POST/AN), kasvutahti_cm_v, kasvutahti_vyohyke, kasvuhistoria:[{pvm,pituus_cm}], yli_ikaisyys:{poikkeuslupa} }` — kaikki pikakentistä (`biologinenIka_viimeisin`, `kasvutahti_*`, `phv_tila`).
- **opts:** `{ muoto:'täysi'|'siru', rooli }`.
- **Kolme kerrosta (täysi):** (1) kypsyysaikajana — marker `maturity_offset`:sta, vyöhykkeet tilakoodeista (PH = amber-varoitusvyöhyke) · (2) kasvutahti-palkki (hidas <3 / kohtalainen 3–7.2 / **nopea ≥7.2 = loukkaantumisriski**) · (3) kasvuviiva-sparkline.
- **Vartijat (EHDOTON):** kasvutahti/kasvuviiva = `null` kun <2 kasvumittausta → älä piirrä viivaa, näytä lähtötila. Sparkline vaatii ≥3 pistettä. §28: PH-tila → näytä kuormarajoitin; varhaiskypsä → "älä sekoita kokoa taitoon" (RAE).
- **Siru-muoto:** mini-aikajana + offset + kasvutahti yhdellä rivillä (Aloituksen selkärankaan, klikkaus → täysi).

### 1.2 `lib/tm_kehityskaari.js` → `tmKehityskaari(el, data, opts)`
Trendiviiva mille tahansa mitatulle ominaisuudelle. Design-kartta: **KEHITYSKAARI_KISS_design_kartta_v1.html**.

- **data:** `{ arvo, yksikko, historia:[{pvm, arvo, taso?, alusta?}], suunta, deltaAbs, deltaNormi, normiTaso }` — pikakentistä (`*_viimeisin` + `*_edellinen`(+`_pvm`) + `flei_historia[]` + `ennatykset`).
- **opts:** `{ ominaisuus:'fyysinen'|'flei'|'tki'|'adar', rooli:'valmentaja'|'vp'|'pelaaja', muoto:'täysi'|'siru' }`.
- **Datatasot (mukautuu automaattisesti):** 1 mittaus → lähtöpiste + "toinen mittaus avaa kaaren" · 2 → suunta (↑/↓/→ + delta, §29) · ≥3 → sparkline.
- **Vartijat (EHDOTON):**
  - **Kaksi deltaa (§34)** kun `ominaisuus==='tki'` (ja muut ikänormitetut): näytä `deltaAbs` (suoritus) JA `deltaNormi` (ikävaatimus) erikseen. **TKI-laskua EI punaisena jos deltaAbs positiivinen.**
  - **Alustavartija (§22):** `ominaisuus==='fyysinen'` nopeus/ketteryystesteille — vertaile vain saman `alusta`-arvon pisteitä. Eri alusta → ei samalle viivalle.
  - **Ikävaihe (§28):** `ominaisuus==='adar'` → dimensiokohtainen (A/D/Ac/R), ei suoraa vuosivertailua (U11≠U16).
  - **`rooli==='pelaaja'` (§7.22):** vain oma abs-parannus positiivisena — EI normilaskua, EI vertailua, EI TKI-laskua.

---

## 2. Viisi pintaa

Jokainen pinta: `datatila`-toggle (`body:not(.thin) .st` / `body.thin .sf`), rehellinen tyhjä tila + **yksi CTA**, molemmat teemat. Design-kartat liitteinä.

### 2.1 Aloitus — selkäranka / ILP
**Kartta:** IDP_KORTTI_KISS_design_kartta_v7.html. Elementit: pelaajan ääni · jaksofokus + silta ("miksi") · 5D-radar (peli edellä, D4 ylhäällä) · **Kypsyys-siru** (`tmKypsyys muoto:'siru'`) · **Kehityskaari-sirut** (`tmKehityskaari muoto:'siru'` per mittari) · seuraava askel → Viikko · pelaajan peili · katselmusrytmi · datatietoiset syvyyskortit.

### 2.2 Mittaus — mitä testit kertovat
**Kartta:** MITTAUS_KISS_design_kartta_v4.html. Tulkinta ensin OTO-valmentajalle: synteesi "mitä testit kertovat" · ⚽ mitä pelissä · **§28-kehitysikkuna = `tmKypsyys`-linssi** · luotettavuus (alusta / 1 vai 2 kertaa) · kaksi deltaa · **Kehityskaari per testi** (`tmKehityskaari ominaisuus:'fyysinen'/'flei'`) · laajennettava syväanalyysi (`<details>`).

### 2.3 Arviointi — 5D-kehys
**Kartta:** ARVIOINTI_KISS_design_kartta_v4.html. Otsikko "TalentMaster · 5D-arviointikehys" (**EI Palloliitto**). Kolme lähdettä (mitattu 🟢 / havaittu 🔵 / pelistä ⚹). D1–D5 kattavuusnauha. Monidimensioinen **muokattava** silta (peli edellä + fyysinen + rohkeus-välitavoite + ＋käsin) ✎ per rivi + Muokkaustila. ADAR-koostumus (Havaitse/Päätä/Toimi/Arvioi 1–3). D3-kalibraatio 5 dim × 3 arvioijaa. **Arviointikehys 1–5 ≠ curriculum 1–3 (§37, ÄLÄ yhdistä).**

### 2.4 Kehitys — jaksofokus-työpöytä
**Kartta:** KEHITYS_KISS_design_kartta_v2.html. VP-oversight-statusnauha · moottori 2 polkua (heikkous/vahvuus, ei pakota) · 3-taso selkäranka (kausitavoite → jaksofokus focal-editori domeeni-togglella → kehityskaari) · KPI "opittu kun" · toimenpiteet/vie kentälle · pelaajan ääni · **diagnostiikassa `tmKypsyys` + `tmKehityskaari`** · roolit §37 · peli edellä.

### 2.5 Viikko — jaksofokus → tämä viikko
**Kartta:** VIIKKO_KISS_design_kartta_v1.html. Fokus kannettu jaksofokuksesta · morfosykli (MD-suhteinen viikko) · A/B/C-tavoitejakauma (less is more) · **ACWR-kuorma** (session-RPE, turva 0.8–1.3; §28-kuormarajoitin PH-tilassa) · läsnäolo (K2) · pelaajan ääni + §4b cue · katselmus takaisin. **✎ muokattava.** → **P0-silta §4.**

---

## 3. ⭐ P0 — Viikon kolmen lähteen silta [MERKITTY]

> **Tämä on koko IDP-modaalin isoin yksittäinen kytkentä — omaksi kohdakseen, EI "hoituu ohessa".**

Viikko on kolmen lähteen yhtymäkohta. **Putki on suurelta osin jo olemassa** — verifioitu koodista:

| Lähde | Mistä | Tila | Viikon tehtävä |
|---|---|---|---|
| **Joukkuekalenteri** | `seurat/{sid}/kalenteri` (K2, §35) | ✅ olemassa | Lue joukkueharjoitukset + ottelut + läsnäolo viikkoon |
| **Pelaajan app (omatoimiset)** | `kirjaukset/{pvm}` (tyyppi T/S, `lahde:'pelaaja'`, kesto_min, rpe, fiilinki) — generaattori `valitsePaivanHarjoite()` (harjoitelogiikka_v4.js) → pelaaja kirjaa; Master `_lataaKirjaukset()` jo lukee (§32) | ✅ olemassa | Sijoita omatoimiset viikkoon (C·ylläpito) + summaa session-RPE-kuormaan + fiilinki pelaajan ääneen |
| **Kuorma & kypsyys** | session-RPE (kesto×rpe) + `phv_tila`/`biologinenIka_viimeisin` | ✅ laskettavissa | ACWR-vyöhyke + §28-kuormarajoitin |

**UUSI rakennettava (kirjoituspolku):** valmentaja **asettaa omatoimiharjoitteen** Viikosta → työntyy pelaajan appiin **ehdotuksena** (ei käsky; Deci & Ryan autonomia, §7.22). Nykyään generaattori toimii itsenäisesti pelaajalle → tämä "valmentaja → pelaajan ehdotus" -polku on uusi. Kohderakenne: pelaajan `ohjelmat/` tai `kirjaukset`-ehdotuskenttä, jonka Pelaaja_v7 MINÄ-näkymä lukee (§4b-sillan jatke; `tmTtPelaaja`/`pelaaja_miksi` jo olemassa lib/tm_teknistaktiset.js).

**Kaksisuuntainen + roolit:** ylös (pelaajan tekemät valuvat automaattisesti, `lahde:'pelaaja'`) · alas (valmentaja/talenttivalmentaja/VP asettaa, §37). Rules: field-level kuten §37 jaksofokus.

---

## 4. Rehellisyys- ja brändi-invariantit (EHDOTTOMAT)

1. **§7.22** — pelaajalle/perheelle: ei XP/progressbaria/loss aversion -kieltä, ei vertailua muihin, ei TKI-laskua, ei kuormarankingia. Kaikki jaettu komponentti saa `rooli`-optin.
2. **§28** — pre-PHV heikko 30m/MAS/CMJ = NEUTRAALI (ei kehityskohde). PHV ohittaa kronologisen iän. PH-tila → kuormarajoitin.
3. **§34 kaksi deltaa** — abs-parannus ≠ ikänormi; TKI-laskua ei punaisena jos abs positiivinen.
4. **§22 alustavartija** — nopeus/ketteryystrendi vain saman alustan sisällä.
5. **Tyhjä tila = rehellinen** — jokaisella pinnalla ja komponentilla: näytä mitä on + yksi CTA, älä keksi dataa/viivaa. **Standardoi tyhjätila-CTA yhtenäiseksi** (📍 + toiminto) — nyt vain Viikossa (löydös §7).
6. **GDPR** — terveys/terveys-data erillään (Art. 9, oma suostumus).
7. **Brändilukko (§5):** Cormorant Garamond (ei bold) / DM Sans / DM Mono · teal ainoa aksentti (#28B090 tumma / #1A7A5E vaalea) · amber vain varoituksiin · terävät kulmat (kortit ~10px, sirut 6px) · semanttinen emoji vain (💎🎯📍⚽) · eyebrow DM Sans 600 .15em. **KIELLETTY:** Playfair, #3EC9A7, #4A7ED9, #06090F.

---

## 5. Roolimalli (§37)

- **Operatiivinen jaksofokus / Viikko** = valmentaja omille pelaajilleen (omistaa) · talenttivalmentaja talenteille · VP oversight/override + näkee kaikki. **Ei erillistä hyväksyntää.**
- **Strateginen kausitavoite** (Aloitus/IDP makro) = VP asettaa/hyväksyy; valmentaja ehdottaa. VP-hyväksyntä = kausitaso, ei joka jakso.
- **Arviointi** = talenttivalmentaja profiloi; muokattava/avoin muillekin (ei pakoteta).

---

## 6. Loogisuustarkastus — tulokset + lukitut konventiot

**Todennettu puhtaaksi (7 tiedostoa):** brändi (0 kiellettyä arvoa) · fontit · datatila-toggle · pseudonyymit (Topias/Eino) · ei MDT-termiä.

**Korjattu:** Aloituksen tyhjä tila käytti "Palloliitto"- ja "ADAR"-termejä julkisena → "5D-arviointi" + "pelihavainto" (§37).

**Lukitut konventiot Codelle:**
- **C1 — Julkinen kieli (§37):** FLEI → "kehon valmius" UI:ssa · peliäly (ei "ADAR" julkisena; ADAR vain sisäinen menetelmäviite / "kenttähavainto" työkaluna) · ei "Palloliitto"-brändiä · Mittaus/Ottelu/Pelihavainto. **Päätös:** radar/kattavuusriveillä label = "D4 Peliäly" (pudota "· ADAR" julkisesta UI:sta, säilytä koodissa). **✅ Sovellettu design-karttoihin** (Aloitus radar-rivit + Kehityskaari-kortti). ⏳ Avoin: Arvioinnin "ADAR-koostumus" -lohko (A/D/Ac/R) = menetelmäselite — Code päättää saman käsittelyn.
- **C2 — Jaetut komponentit:** PHV ja Kehityskaari **aina `lib/`-renderöijän kautta**, ei inline-kopioita per pinta (Aloitus/Mittaus/Kehitys kutsuvat samaa).
- **C3 — Tyhjätila-pattern:** yksi jaettu tyhjätila-tyyli (otsikko + selitys + yksi 📍-CTA) kaikille pinnoille.
- **C4 — Pikakentät ainoa lukulähde renderöinnissä (§26)**, pari-invariantti (arvo+pvm atomisesti).

---

## 7. Toteutusjärjestys

1. **`lib/tm_kypsyys.js` + `lib/tm_kehityskaari.js`** (jaetut renderöijät + vartijat + rooli-variantit + tyhjätilat).
2. **IDP-modaalin runko** 5 pintaa + datatila-toggle + teemat + brändilukko.
3. Pinnat 1–5 design-karttojen mukaan, komponentit kutsuina (C2).
4. **P0-silta (§3):** lue kalenteri + omatoimiset kirjaukset Viikkoon; ACWR-laskenta; sitten **uusi kirjoituspolku** (valmentaja → pelaajan ehdotus).
5. Lukitut konventiot C1–C4 kauttaaltaan.
6. Verifiointi: molemmat teemat · tyhjät tilat · §7.22 pelaajavariantti · P0-silta kaksisuuntaisuus.

---

## 8. Liitteet — design-kartat (visuaalinen totuus)

Kaikki `docs/idp_design/`-kansiossa tämän briefin vieressä.

| # | Pinta/komponentti | Tiedosto |
|---|---|---|
| 01 | Aloitus (selkäranka) | idp_design/IDP_KORTTI_KISS_design_kartta_v7.html |
| 02 | Mittaus | idp_design/MITTAUS_KISS_design_kartta_v4.html |
| 03 | Arviointi | idp_design/ARVIOINTI_KISS_design_kartta_v4.html |
| 04 | Kehitys | idp_design/KEHITYS_KISS_design_kartta_v2.html |
| 05 | Viikko | idp_design/VIIKKO_KISS_design_kartta_v1.html |
| K1 | Kypsyys/PHV -komponentti | idp_design/KYPSYYS_PHV_design_kartta_v1.html |
| K2 | Kehityskaari -komponentti | idp_design/KEHITYSKAARI_KISS_design_kartta_v1.html |
