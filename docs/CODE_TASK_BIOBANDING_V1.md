# Code-tehtävä: Bio-banding V1 (Mirwald-offset, ei Khamis-Rochea)

> Valmis brieffi Code-agentille. Lähde: `docs/BIOBANDING_ARKKITEHTUURI.md`. Rakentuu vain **olemassa olevaan Mirwald-PHV:hen** (§25) — ei riippuvuuksia.
> **PÄÄTÖS 2026-07-01:** Khamis-Roche (%PAH, z-score, dual-taso = V2) **lykätään**, koska Palloliitto vasta *kokeilee* KR-testejä pelaajille → KR-data ei ole luotettavaa/laajaa. V1 tuottaa arvoa heti sillä mitä on (SJK 8 PHV-pelaajaa). V2 vasta kun KR-data + erratum-kertoimet kypsiä.
> Tieteellinen pohja + vyöhykerajat: BIOBANDING_ARKKITEHTUURI §2.

## Scope — kolme palaa, kaikki Mirwald-pohjaisia

### 1. Kehitysvaihe-kaista (`tm_bioika.js`)
Uusi helper `kehitysvaiheKaista(phv_tila_koodi)` → **'pre' | 'circa' | 'post'** (bio-banding circa = ±1v PHV:stä, tiede §2B):
- `PRE` → **pre**
- `LAH` + `PH` + `POST` (offset −1…+1) → **circa**
- `AN` → **post**
- Kirjoita `laskeBioIkaDokumentti`-tulokseen `kehitysvaihe_kaista` + pelaajan pikakenttään (§26). (phv_tila jo olemassa; tämä on karkeampi bio-banding-kaista sen päälle.)

### 2. Yli-ikäisyys −0,75-kriteeri näkyviin (UI)
`yli_ikaisyys.poikkeuslupa` **lasketaan jo** (§25) — vain nostettava näkyviin. Lisää **badge/sarake VP-pelaajalistaan + pelaajan kehitysvaihekorttiin**: "✅ Poikkeuslupa mahdollinen (PHV-ikä ≥ kynnys)". Read-only, ei uutta laskentaa. (Ks. `yliIkaisyysMerkki`-helper §25 — käytä sitä.)
- **VERIFIOITU 2026-07-01: `YLI_IKAISYYS_KYNNYS`-taulukko + logiikka (`phv_ika >= kynnys`) täsmäävät Palloliiton viralliseen taulukkoon bittiin** (kaikki 12 kk × P/T). Sääntö: vertaa pelaajan **syntymäkuukautta** (E) + **PHV-ikää** (G) taulukkoon; täyttää jos PHV-ikä ≥ kynnys. **ÄLÄ muuta taulukkoa/logiikkaa — vain surface.**

### 3. Kasvutahti (cm/v) + vyöhykkeet + injury-signaali
Uusi helper `laskeKasvutahti(pituus_nyt, pvm_nyt, pituus_edell, pvm_edell)` → `{ cm_v, vyohyke }`:
- `cm_v = (pituus_nyt − pituus_edell) / (vuodet välissä)`
- **Vyöhykkeet (tiede §2C + MyE.Way-pariteetti):** hidas <3,0 · kohtalainen 3,0–7,2 · **nopea ≥7,2 cm/v**
- **≥7,2 cm/v = loukkaantumisriskisignaali** (siteerattava, PMC6293374) → valmentajasignaali `PH`-kuormarajoittimen rinnalle.
- Vaatii **≥2 kasvumittausta** (biologinen_ika-historia) → guard: `null` jos edellistä ei ole. **SJK:lla nyt 1 mittaus → ei laukea vielä**, mutta laskenta valmis 2. kierrokseen.
- Pikakentät (§26): `kasvutahti_cm_v` + `kasvutahti_vyohyke`. Laske kun uusi kasvumittaus tallennetaan JA edellinen on olemassa (Testaus_v9 "Merkitse valmiiksi" -polku hakee edellisen biologinen_ika-dokin).

### 4. Bio-banding-ryhmittelynäkymä (VP/valmentaja)
Näkymä joka **ryhmittelee joukkueen pelaajat `kehitysvaihe_kaista`:n mukaan** (pre / circa / post) treeni-/ottelu-bio-bandingiin. Lukee pikakentät (§26, ei alikokoelmakyselyjä). Näyttää per kaista pelaajat + PHV-tila + (kun on) kasvutahti-vyöhyke. Tämä on V1:n näkyvä ominaisuus valmentajalle.

## Guardrailit
- **Vain Mirwald** (phv_tila jo laskettu). **EI Khamis-Rochea / %PAH / z-scorea / dual-tasoa** (= V2, lykätty).
- **§7.22 EHDOTON:** kehitysvaihe-kaista + kasvutahti = **valmentaja/VP-työkaluja**. Lapselle EI kaistaa rankingina eikä vertailua; perheelle "miten tukea" -kielellä (§16). Kasvutahti = terveysdataa → jo suostumuksen alla (biologinen_ika).
- **Pikakenttä-arkkitehtuuri (§26):** laske kirjoitushetkellä (`tm_bioika.js` / kasvumittaus-tallennus), lue näkymissä pikakentistä.
- Kasvutahti: guard `null` kun <2 mittausta.

## Testit
- **Vitest** `tests/biobanding_v1.test.js`:
  - `kehitysvaiheKaista` (5 phv_tila-koodia → pre/circa/post).
  - `laskeKasvutahti` (vyöhykerajat 3,0 ja 7,2, ja `null` kun 1 mittaus).
  - **Yli-ikäisyys −0,75 (Palloliitto-pariteetti, 4 kanonista esimerkkiä — ÄLÄ riko):**
    - poika, syntymäkk=9 (syyskuu), phv_ika=14,6 → poikkeuslupa **true** (kynnys 14,30)
    - poika, syntymäkk=1 (tammikuu), phv_ika=14,5 → **false** (kynnys 14,97)
    - tyttö, syntymäkk=4 (huhtikuu), phv_ika=12,2 → **false** (kynnys 12,82)
    - tyttö, syntymäkk=10 (lokakuu), phv_ika=12,5 → **true** (kynnys 12,32)
  - (Testaa `laskeBioIkaDokumentti`/`yli_ikaisyys.poikkeuslupa` näillä syötteillä.)
- npm test vihreä, lint 0.

## Dokumentaatio
- **CLAUDE.md §25 tai §28:** lisää bio-banding V1: kehitysvaihe_kaista (pre/circa/post ±1v) + kasvutahti-vyöhykkeet (<3,0/3,0–7,2/≥7,2, injury ≥7,2) + −0,75-kriteeri näkyviin. **Päätös: V2 (%PAH/KR) lykätty — Palloliiton KR-data kokeiluvaiheessa.**
- Ristiviite `docs/BIOBANDING_ARKKITEHTUURI.md`.

## Firestore-kentät (V1)
- `biologinen_ika/{pvm}`: `kehitysvaihe_kaista`, (2. mittauksesta) `kasvutahti_cm_v`, `kasvutahti_vyohyke`.
- Pelaajan pikakentät: `kehitysvaihe_kaista`, `kasvutahti_cm_v`, `kasvutahti_vyohyke`. (phv_tila jo on.)

## Ei tähän (V2/V3, erikseen)
- Khamis-Roche %PAH + maturity z-score + **dual-taso** (ikäluokka↔kehitysvaihe) — vaatii KR-avauksen + kypsyysnormit + Palloliiton KR-datan kypsymisen.
- Feature branch → PR → merge, ei versionbumppia.
