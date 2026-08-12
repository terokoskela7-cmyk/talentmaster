# IDP-kortti — KISS-redesign (KORJATTU KOHDE) · Code-brief

> **Miksi:** SJK:n valmennuspäällikkö + muut: nykyinen IDP-kortti on **levoton ja vaikealukuinen**. Design-kartat (`docs/idp_design/`) ovat tämän ratkaisu — hyväksytty KISS-suunnitelma + kansainväliset benchmarkit. **Tehdään täsmälleen se.**
> **⚠ MITÄTÖINTI:** aiempi VAIHE 2.0/2.0b osui **kuolleeseen `_vpAloitusHTML`:ään** (→ `_jspAloitus`, jota ei koskaan luoda DOM:iin). Se ei renderöidy — älä jatka siihen. #334 EI mergetä. `_vpAloitusHTML`/`_vpAloitusReRender`/`_vpAloitusKypsyysData` = kuollutta (siivotaan erikseen).
> **OIKEA KOHDE (audit-vahvistettu, TalentMaster_VP_v25.html):** IDP-kortti = `_avaaPerPelaajaPikakatsaus(idx, joukkue)` (rivi 9844) → vasen paneeli + 5-tab-modaali. **Aloitus-tab (0) = `_vpIdpNarratiiviHTML` (rivi 5490).**
> **Luonne:** ESITYKSEN uudelleenrakennus kartan ilmeeseen (rauhallinen, tulkinta-ensin), **data/logiikka säilyttäen**. EI additiivinen pulttaus vanhaan layoutiin.
> **Verifiointi: LIVE.** Jokaisen vaiheen jälkeen kortti katsotaan selaimessa (Topias Koskela, KPV — sanktioitu testipelaaja) ennen kuin se on valmis. Arkkitehti (minä) verifioi myös livenä.

---

## 0. Periaate (koko redesignin läpi)

KISS · **rauhallinen ja luettava** (SJK-palautteen ydin: vähemmän värejä/emojia/tiheyttä, selkeä hierarkia) · tulkinta ensin · brändilukko §5 (Cormorant ei-bold / DM Sans / DM Mono · teal ainoa aksentti · amber vain varoitus · terävät kulmat · semanttinen emoji vain 💎🎯📍⚽) · molemmat teemat · kansainväliset benchmarkit kartoista (PDP ILP · StatsBomb-radar · EPPP · Benfica) · rehellinen tyhjä tila.

**Säilytä data/logiikka, rakenna esitys uudelleen:** älä poista pikakenttä-lukuja (§26), olemassa olevia data-apureita (`_vpAloitusTavoiteHTML` 5421, `_vpAloitusJaksofokusHTML` 5465, `_vpSitoumusHTML`, `_vpKausitavoiteHTML`) eikä tallennettua sisältöä. Muuta se MITEN ne esitetään → kartan mukaan.

---

## 1. Vaiheistus (jokainen oma PR, verifioitu LIVENÄ ennen seuraavaa)

| Vaihe | Kohde (renderöijä) | Kartta |
|---|---|---|
| **R1** | Aloitus — `_vpIdpNarratiiviHTML` (5490) + vasemman paneelin radar/kypsyys | `IDP_KORTTI_KISS_design_kartta_v7.html` |
| R2 | Mittaus — tab 1 (f1/f2) | `MITTAUS_KISS_design_kartta_v4.html` |
| R3 | Arviointi — tab 2 (`_vpArviointiHTML`) | `ARVIOINTI_KISS_design_kartta_v4.html` |
| R4 | Kehitys — tab 3 (`_vpKehSuunnitelmaHTML`/`_vpMoottoriKortitHTML`) | `KEHITYS_KISS_design_kartta_v2.html` |
| R5 | Viikko — tab 4 (`_vpViikkoHTML`) | `VIIKKO_KISS_design_kartta_v1.html` |

5-tab-rakenne säilyy (kartat = juuri nämä 5 pintaa). Redesign = kunkin tabin **esitys** kartan ilmeeseen.

---

## 2. VAIHE R1 — Aloitus (TÄMÄ PR)

**Kohde:** `_vpIdpNarratiiviHTML` (rivi 5490, renderöi `_jspIdpNarratiivi`) + vasemman paneelin 5D-radar (rivi 10391) + kypsyysproosa (rivit 9223–9226 / 15371).

**RECON ENSIN (PR-kuvaukseen):** listaa nykyisen Aloituksen + vasemman paneelin elementit → kartta v7:n elementit → "säilyy datana / muuttuu esityksenä / uusi / poistuu". Tämä on data-loss-vartija.

**Rakenna Aloitus kartta v7:n mukaan** (rauhallinen ILP-selkäranka). Kartan elementit → kytkentä:
- **Pelaajan ääni** — on jo (`_vpIdpNarratiiviHTML` P1, ~5514). ESITÄ kartan mukaan, ÄLÄ lisää toista.
- **Jaksofokus + silta ("miksi")** — reuse `_vpAloitusJaksofokusHTML` + `tm_arviointi_silta.js`. Esitä kartan mukaan.
- **5D-radar peli edellä (D4 ylhäällä)** — nykyinen vasen radar (rivi 10391) on D1-top; reuse `_tmRadar5D` game-first-akselijärjestyksellä (D4·D3·D5·D2·D1, label "Peliäly" ei "ADAR", C1). Sijoita kartan v7 mukaan. §28-normigate: referenssirengas vain 16+ eikä PHV-keskellä.
- **Kypsyys** — **korvaa vasemman paneelin kypsyysproosa** (9223–9226/15371) komponentilla `tmKypsyys(el, data, {muoto:'siru'|'täysi'})` (aito lisä: proosassa EI kasvutahtia/kasvuviivaa; komponentti tuo ne). Data pikakentistä; kokoa syöte kuten aiemmin verifioitu (`biologinenIka_viimeisin`/`phv_tila`/`kasvutahti_*`).
- **Kausitavoite / X-factor / sitoumus** — on jo (reuse `_vpAloitusTavoiteHTML`/`_vpSitoumusHTML` + X-factor-osio). Esitä kartan rauhallisella hierarkialla.
- **Seuraava askel → Viikko · katselmusrytmi · pelaajan peili** — kartan v7 mukaan (CTA → `_jspVaihda(4)` Viikko; katselmusrytmi olemassa olevasta review-datasta).

**Libit:** `lib/tm_kypsyys.js?v=…` + `lib/tm_kehityskaari.js?v=…` ladataan jo (2.0). Nosta `?v` kun kutsut ne oikeasti näkyviin. Komponentti tarvitsee DOM-elementin → renderöi narratiivin innerHTML-asetuksen jälkeen (kuten `_vpIdpNarratiivi`-slotti hydratoidaan, rivit 4836/7289/10465 — käytä samaa hydrataatiopolkua, EI kuollutta `_vpAloitusReRender`iä).

**EI TÄSSÄ:** muut tabit (R2–R5) · P0-silta pelaajan appiin · kuolleen `_vpAloitusHTML`:n poisto (erikseen).

## 3. Reunaehdot

Säilytä data + olemassa olevat data-apurit (recon-delta osoittaa) · pikakentät ainoa lukulähde renderöinnissä (§26) · §7.22 (pelaaja/perhe-variantit `rooli`-optilla) · §28 (pre-PHV neutraali · PHV ohittaa kronologisen · PH kuormarajoitin · normigate 16+) · §34 (kaksi deltaa) · §22 (alustavartija) · GDPR terveys erikseen · suojatut alaikäiset read-only (kirjoitus vain sanktioituun testidataan) · brändilukko §5 · molemmat teemat.

## 4. Definition of Done (per vaihe) — LIVE-verifiointi pakollinen

- **Kortti renderöityy LIVENÄ oikeassa modaalissa** (`_avaaPerPelaajaPikakatsaus` → Aloitus-tab) — kuvakaappaus **Topias Koskelan oikeasta live-kortista** selaimessa, EI vain funktioharness. Molemmat teemat.
- Kortti **näyttää kartta v7:ltä** (rauhallinen, luettava) — sivu sivulta kartan kanssa.
- Ei datahukkaa eikä toiminnallisuuden menetystä (recon-delta + klikkaus läpi: tavoite/jaksofokus/sitoumus/CTA:t toimivat).
- Vitest + eslint vihreä · pieni PR (vain Aloitus) · pseudonymisoitu (Topias/Eino).
- **Verify live ENNEN R2:ta.**
