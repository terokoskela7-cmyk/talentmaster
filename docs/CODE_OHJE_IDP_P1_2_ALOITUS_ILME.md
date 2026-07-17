# CODE — P1.2: Aloitus — yhtenäinen ilme (yksi tyyppiramppi · laatikot säilyvät)

**Tyyppi:** UI-selkeytys, näyttökerros (display-only). **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — `_vpIdpNarratiiviHTML(p)` (Aloitus-välilehti `_jspTab0`) + sen Aloitus-omat apurit `_vpAloitusTavoiteHTML`, `_vpAloitusJaksofokusHTML`.
**Design-totuus:** hyväksytty `idp_aloitus_yhtenainen.html` (ennen → jälkeen). Tiekartta **P1.2**. Ohje on itsenäinen.

## Miksi

Kehitys-välilehti sai yhtenäisen tyyppijärjestelmän (P4a/P4a.1: eyebrow → serif-otsikko → mono-meta → yksi CTA-tyyli). Aloitus ei jaa samaa ramppia — livemittaus (Topias) osoitti solmujen otsikot **kolmessa eri koossa ja kahdessa eri paksuudessa**: kausitavoite serif **24px/300**, jaksofokus **19px/400 + CAPS**, sitoumus **17px/400**. Lisäksi eyebrow on **9px** (kaksi eri casing-tyyliä: title-case vs UPPERCASE), meta driftaa **10 vs 10.5px**, ja CTA:t ovat samalle "vie Kehitykseen" -toiminnolle **sekaisin inline-tekstilinkki (14px) ja UPPERCASE-nappi**. Aloituksen kuuluu lukeutua yhtenä rauhallisena kokonaisuutena. P1.2 yhtenäistää **vain tyypografian** — sisältö, rakenne, laatikot ja logiikka säilyvät. **Laatikot pidetään tietoisesti** (erottavat solmut hyvin, käyttäjän toive).

## Yhtenäinen ramppi (kohde — brändilukon tokenit)

Jokainen Aloituksen solmu käyttää **samaa ramppia**:
- **Eyebrow:** `font-size:10px; font-weight:600; letter-spacing:.16em; text-transform:uppercase` — roolisävy: teal (`--teal`/`--teal-d`) · 📍 jaksofokus **amber** (`--amber`) · VP-toiminto **blue** (`--blue`) · tyhjä/neutraali `--ink3`. (Nyt 9px → **10px**.)
- **Otsikko:** `font-family:var(--font-serif); font-weight:400; font-size:20px`, **sentence case**. Yksi koko kaikille solmuille (nyt 24/19/17 → **20**). Ei `text-transform:uppercase` -poikkeuksia.
- **Meta:** `font-family:var(--font-mono); font-size:10.5px; color:var(--ink3)`. Yksi koko (nyt 10/10.5 → **10.5**).
- **CTA:** yksi nappityyli — **sama kuin Kehitys-työpöydän / loppu-CTA:n nappi** (`font-family:var(--font-sans); font-size:11px; font-weight:500; letter-spacing:.02em; terävä kulma`), roolisävytetty (`--teal-dim/-brd` · jaksofokus `--amber-dim/-brd` · VP-toiminto `--blue-dim/-brd`). Ei inline-tekstilinkkiä.
- **Pelaajan lause** (sitoumus-sitaatit) säilyy brändin "signaalilauseena": `font-family:var(--font-serif); font-style:italic; font-size:15px; color:var(--ink2)`.

## Mitä tehdään

### 1. Paikalliset apurit ramppiin (`_vpIdpNarratiiviHTML`)
- **`_eyebrow(txt, col)`** (~rivi 5149): `font-size:9px` → **`10px`** (muut arvot ennallaan). Käytä tätä apuria **kaikille** solmun eyebrow-labeleille — myös nyt inline-koodatut 9px-eyebrowit (X-Factor "⭐ Erottava ase", header-badget) kääritään samaan 10px-tyyliin. Roolisävy annetaan `col`-parametrilla.
- **`_stitle(txt)`** (~rivi 5150): serif `17px` → **`20px`**, `font-weight:400`, sentence case; `margin` ennallaan. Tämä on **yksi otsikkoapuri** jota kaikki solmuotsikot käyttävät.

### 2. Solmuotsikot yhteen kokoon
- **🎯 Suunta · kausitavoite** (`_vpAloitusTavoiteHTML`): otsikko **24px/300 → 20px/400** (`_stitle`-ramppi). Inline-tekstilinkki "→ Kehitä suunnitelmaa · Kehitys-työpöytä" → **CTA-nappi** (teal, sama tyyli kuin loppu-CTA). Chipit/edistymä-palkki/"Näkyy pelissä" ennallaan.
- **📍 Jaksofokus · tämä jakso** (`_vpAloitusJaksofokusHTML`): otsikko **19px + CAPS → 20px sentence case**. Poista `text-transform:uppercase`. Jos konseptinimi on lähdedatassa isoin kirjaimin ("HALTUUNOTTO"), normalisoi **näyttöä varten** sentence caseksi (esim. eka kirjain iso, loput pienellä) — säilytä chipeissä olevat lyhenteet (D2/D4) ennallaan (ne eivät ole otsikossa). Eyebrow → **amber**-sävy. "→ Kehitä jaksofokusta" → CTA-nappi **amber**.
- **🤝 Sitoumus**: `_stitle('🤝 Sitoumus')` saa 20px-rampin. Eyebrow-tyyli linjaan muiden kanssa (voi lisätä eyebrow-labelin muiden solmujen tapaan, otsikko sen alle).
- **⭐ Erottava ase** (X-Factor, inline ~rivi 5171): otsikko on jo serif 20px — varmista `font-weight:400`; eyebrow 9px → 10px (`_eyebrow`).

### 3. CTA:t yhteen tyyliin (roolisävy)
Kaikki Aloituksen CTA:t samaan nappikomponenttiin: kausitavoite/loppu = **teal**, jaksofokus = **amber**, sitoumuksen "✓ Vahvista sitoumus" = **VP-blue**. Poista inline-tekstilinkki-muoto. Loppu-CTA ("→ Avaa Kehitys-työpöytä") toimii referenssityylinä.

### 4. Meta yhteen kokoon
Solmujen mono-meta-rivit (esim. `_vpAloitusJaksofokusHTML` "Teknis-taktinen · D2/D4 · kesto 6 vk", kausitavoitteen "scoring_drive · 2/5 → ≥ 3/5") → **10.5px** yhtenäisesti.

## Reunaehdot
- **Display-only:** vain esityskerros. **Ei uutta Firestore-kenttää, ei Rules-muutosta, ei datamigraatiota, ei kirjoituspolkua, ei cache-bumppia** (vain `TalentMaster_VP_v25.html`, ei lib-muutosta).
- **Ei sisältö-/rakennemuutosta:** samat solmut, sama järjestys, samat laatikot. **Laatikot säilyvät** (myös Sitoumuksen sisälaatikko "Pelaajan ääni & sitoumus"). Ei uutta dedupea/poistoa (se tehtiin P1.1:ssä).
- **Jaetut apurit — varo regressiota:** `_eyebrow` ja `_stitle` ovat **paikallisia** `_vpIdpNarratiiviHTML`:n sisällä → muutos koskee vain Aloitusta (turvallista). **`_vpSitoumusHTML` on JAETTU** (käytössä myös Kehitys-kausitavoitteessa, ~rivi 5303) — **älä muuta sen sisäistä tyypografiaa**; koske vain Aloituksen `_stitle('🤝 Sitoumus')` -kääreeseen. `_vpAloitusTavoiteHTML`/`_vpAloitusJaksofokusHTML` ovat Aloitus-omia (P1.1) → turvallisia normalisoida.
- **Brändilukko:** arvot `talentmaster-design-system`-tokeneista — serif ei koskaan bold, eyebrow uppercase+tracking, terävät kulmat/hiusrajat, roolisävyt dimmattuina, emoji semanttisina ikoneina. Molemmat teemat (`data-theme`) renderöityvät puhtaasti.
- **Mobiili §6:** solmut/laatikot mahtuvat kapealla; CTA-napit pinoutuvat.
- **Alaikäiset read-only** (Eino·Leo·Emil): Aloitus on luku, ei kirjoitusriskiä. **Topias = testi-OK** katseluun.

## EI tässä
- **Kehitys/Arviointi/Mittaus/Viikko** — ennallaan (Kehitys on jo yhtenäinen, P4a.1).
- **Sisältö, dedupe, hierarkia** — tehty P1.1:ssä; P1.2 vain tyypografia.
- **`_vpSitoumusHTML`:n / D3-kalibraation sisäinen tyyli** — ei kosketa (jaettu).

## DoD
1. Kaikki Aloituksen solmuotsikot ovat serif **20px / 400 sentence case** — ei enää 24/19/17px, ei CAPS-otsikkoa. (Kausitavoite · Jaksofokus · Sitoumus · Erottava ase samassa koossa.)
2. Eyebrow yksi tyyli **10px / 600 / .16em / uppercase**, roolisävytetty (teal · 📍amber · VP-blue · neutraali ink3). Ei title-case-poikkeuksia.
3. Meta yksi mono **10.5px** kaikissa solmuissa.
4. CTA yksi nappityyli, roolisävytetty; inline-tekstilinkki poistettu (kausitavoitteen CTA on nyt nappi kuten muut).
5. **Laatikot säilyvät** (solmukortit + Sitoumuksen sisälaatikko); pelaajan lause pysyy serif-kursiivina 15px.
6. Ei uutta kenttää/Rules/migraatio/cache-bumppia; **ei regressiota**: Kehitys-kausitavoitteen `_vpSitoumusHTML` näyttää ennallaan (jaettua apuria ei muutettu), Arviointi/Mittaus/Viikko ennallaan.
7. Molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live:** Aloitus lukeutuu yhtenä ramppina, otsikot samankokoiset, CTA:t yhtenäiset, laatikot tallella; Kehitys-välilehden sitoumus-lohko yhä ennallaan. **Verifioi ennen mergeä.**
8. Pieni PR; kuvaus linkkaa `idp_aloitus_yhtenainen.html` + tiekartta P1.2.
