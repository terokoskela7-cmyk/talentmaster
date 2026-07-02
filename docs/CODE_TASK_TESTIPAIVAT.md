# Code-tehtävä: Testipäivämäärät — yleisnäkymä (A) + per-patteristo-erittely

> Lähde: live-havainto 2026-07-02 (Claude + Tero). Pelaajia testataan eri ominaisuuksilla eri aikaan (esim. fyysinen H-H toukokuussa/06-05, tekniikka 06-09). `hh_viimeisin` on näiden **merge**. Tarvitaan kaksi tasoa: **yleisnäkymässä viimeisin testipäivä (A)** + **detaljissa per-patteristo-päivämäärät**.
> Rajaus: VP_v25 (per-pelaaja-modaali) + Excel_Tuonti (pikakenttä + korjaaHhPvm-hienosäätö). §26 (pikakentät, ei alikokoelmakyselyjä renderöinnissä).

## TUOTEPÄÄTÖS (Tero, lukittu)
- **`hh_pvm` = viimeisin testipäivä (semantiikka A)** — "milloin pelaaja viimeksi testattiin". EI fyysisten arvojen mittauspäivä (B). Merge-tapauksessa = **viimeisin `hh_viimeisin`:iin vaikuttanut H-H-testipäivä.**
- Detaljissa pitää lisäksi näkyä **milloin kukin patteristo mitattiin** (fyysinen / tekniikka / TKI / PHV erikseen).

## Osa 1 — `korjaaHhPvm`-hienosäätö (estä taaksepäin-datays)
Nykyinen `korjaaHhPvm` (arvo-täsmä) ehdottaa merge-pelaajille `hh_pvm 06-09 → 06-05`, koska se täsmää fyysisen osajoukon vanhempaan testiin. **Tämä on väärä semantiikan A kannalta** (pelaaja testattiin oikeasti 06-09; syöttö/pujottelu 06-09 ovat `hh_viimeisin`:issä).
- **Korjaa:** `hh_pvm` = **max** niistä H-H-`testitulokset`-dokeista jotka ovat vaikuttaneet `hh_viimeisin`:iin (protokollat `hh_suppea`/`hh_laaja` tms.). Älä koskaan aseta `hh_pvm`:ää vanhemmaksi kuin nykyinen jos nykyinen on validi (uudempi) vaikuttanut H-H-testipäivä.
- **Vaikutus:** noiden 9 SJK-pelaajan `hh_pvm` pysyy 06-09 (oikein). Yksittäistestiset (45, jo korjattu käsin) ennallaan.
- **Verifiointi:** `korjaaHhPvm('sjk', true)` → **0 korjattavaa** hienosäädön jälkeen (nyt näyttää 9 väärin). Aja sitten muille seuroille dry-run.
- **ÄLÄ aja nykyistä `korjaaHhPvm('sjk', false)`:a** ennen tätä korjausta — se taaksepäin-dataisi 9 pelaajaa.

## Osa 2 — Per-patteristo-päivämäärät (uusi pikakenttä + detaljinäkymä)

### 2a. Pikakenttä `testipaivat` (§26-clean, kirjoitetaan tuonnissa)
Uusi pikakenttä pelaajadokumenttiin: `testipaivat: { fyysinen_hh, tekniikka_hh, tki, phv }` (kukin ISO-pvm tai puuttuu). Kirjoitetaan **tuonnissa/recalcissa** kunkin testin `testauspvm`:stä.

> **⚠️ KORJAUS (live-havainto 2026-07-02): mäppäys kenttäpohjaiseksi, EI protokollanimen mukaan.** Deployattu `backfillTestipaivat` sai `fyysinen_hh`:n + `phv`:n mutta **`tekniikka_hh` jäi tyhjäksi kaikilla** — koska se mäppäsi protokollanimen (`hh_suppea`/`hh_laaja`) mukaan eikä tunnistanut `hh_laaja`n syöttö/pujottelu-sisältöä tekniikaksi (esim. Dinga: `2026-06-09_hh_laaja` = syotto_hh/pujottelu_hh → `tekniikka_hh 06-09` puuttui). Mäppää **testidokin KENTTIEN mukaan** (dokki voi tuottaa yhtä aikaa fyysisen JA tekniikan):

- Dokissa mikä tahansa `lin*`/`cmj`/`hyppy_cj`/`mas`/`sm_juoksu`/`sm_pallo` → päivitä `fyysinen_hh` = max(nykyinen, tämän dokin pvm)
- Dokissa mikä tahansa `syotto*`/`pujottelu*` → päivitä `tekniikka_hh` = max(...) **(tämä puuttui — pakollinen)**
- `tekniikkakilpailu`-dokki (TK-lajit) → `tki` (= olemassa oleva `tki_pvm`, voi peilata)
- `biologinen_ika`-alikokoelman uusin dokki → `phv` (aito kasvumittaus, EI hh_laaja)
- **Pari-invariantti (§26):** kirjoitetaan atomisesti arvojen kanssa, kuten `hh_pvm`/`hh_viimeisin` (juuri korjattu #61). Merge (`set{merge:true}`) → uusi patteristo päivittää vain oman kenttänsä.
- **Backfill:** `korjaaHhPvm`-perheen viereen (tai osaksi) pieni backfill joka täyttää `testipaivat`:n olemassa olevista `testitulokset`-dokeista. Claude voi ajaa sen käsin kuten hh_pvm-backfillin (dry-run ensin).

### 2b. Näkymä — per-pelaaja-modaali (VP_v25 `_jspModal`)
- **"Testipäivät"-erittely** (kompakti rivi/lohko modaalin yläosaan tai Kehitys-välilehteen): "Fyysinen H-H 5.6. · Tekniikka 9.6. · TKI — · PHV 1.4." Lukee `testipaivat`-pikakentästä (ei alikokoelmakyselyä, §26).
- **Per-testi-rivit:** valinnaisesti kunkin testirivin perään sen patteriston pvm (esim. "Syöttö 38.4 s · 9.6."). Vain jos `testipaivat` erottelee — muuten yleinen `hh_pvm`.
- Yleisnäkymä (KPI/tuloskortti "viimeisin testi") pysyy `hh_pvm` = A (viimeisin). Ei muutosta.

## Guardrailit
- §26 pikakentät (ei alikokoelmakyselyjä renderöinnissä) — `testipaivat` kirjoitetaan tuonnissa, luetaan pikakentästä.
- §22/A-semantiikka: `hh_pvm` = viimeisin H-H-testipäivä. `testipaivat` = per-patteristo erittely.
- Ei riko olemassa olevaa (hh_pvm/hh_viimeisin/tki_pvm ennallaan). Brändi/§7.22. Ei versionbumppia.

## Testit / verifiointi
- Vitest: `korjaaHhPvm` merge-tapauksessa → `hh_pvm` = max vaikuttanut H-H-pvm (ei backdate). `testipaivat`-täyttö protokolla→patteristo-mäppäys.
- Claude live-verify: `korjaaHhPvm('sjk',true)` → 0; Dinga-modaali näyttää "Fyysinen H-H 5.6. · Tekniikka 9.6."; yleisnäkymä yhä 9.6.

## Ei tähän
- Semantiikka B (fyysisten arvojen pvm) — hylätty.
- Feature branch → PR → merge.
