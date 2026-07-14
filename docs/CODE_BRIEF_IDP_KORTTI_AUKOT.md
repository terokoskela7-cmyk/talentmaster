# CODE/DESIGN BRIEF — IDP-kortti: aukot + tulevaisuus (radar-normit · saatavuus · fysioterapeutti)

**Versio:** 1.0 · **Lähde:** Claude Design -handoff (IDP-kortti.dc.html, 6 välilehteä + Palaute) arvioituna KV-benchmarkkia + TalentMaster-datamallia vasten.
**Referenssi:** artifact `talentmaster-idp-radar-normit-aukot` (visuaali).
**Periaate (muistutus):** mitään ei pakoteta, asiantuntija päättää — kaikki lisät pehmeitä. Käytä DS-tokeneita, molemmat teemat `data-theme`.

---

## 1 · KORJAA NYT (P1)

**1.1 · 5D-yhteenveto näyttää vain 3/5 ulottuvuutta (bugi).**
Nykytila-välilehden "5D-yhteenveto" -rivi listaa vain D1·D2·D3 — **lisää D4 ja D5** (radar näyttää jo kaikki 5). Näytä tyhjät (D3=0/12, D5=0/2) haaleana "—", ei nollana.

**1.2 · Radar: normi-overlay + kehitysvaihe.**
Lisää 5D-radariin toinen kerros: pelaajan viisikulmio (teal, nykyinen) + **ikäluokan normi** haaleana katkoviivana. Suurin sisällöllinen lisäarvo (KV-delta "vs. ikäluokka", Kitman-taso).

- **Kriittinen ehto — kypsyyskorjaus:** normi näytetään **PHV-korjattuna** (`phv_tila`), ei kalenteri-ikää vasten. Muuten myöhään kehittyvä näyttää heikolta pelkän kypsymättömyyden takia (Emil/PHV-oppi).
- **Kehitysvaihe kontekstina:** bändi/label radarin alle ("16+ · PHV ohitettu · voima/nopeus-ikkuna auki"), EI omana akselina.
- **Pehmennä nuoremmille:** normivertailu vain **Showcase (U16–19)**. Leikkijä/Rakentaja (U8–15): piilota normi tai näytä "kehityskaista", ei suoraa vertailua (DS-ääniohje).
- **Älä piirrä normia tyhjille akseleille** (D3/D5 0-data → harhaanjohtava). Katkoviiva/haalea kunnes dataa on.

---

## 2 · TÄYDENTÄVÄT (P2) — eivät estä pilottia, nostavat kortin täydeksi

**2.1 · Saatavuus / terveys-status -chip headeriin.**
KV-akatemiakortit (Kitman/Smartabase) näyttävät saatavuuden näkyvästi; nyt puuttuu. Lisää headeriin kevyt status: `● saatavilla` / `rajoitettu` / `loukkaantunut`.
**GDPR:** vain status-lippu, EI diagnoosia/vaivan kuvausta kortille. Terveystieto pysyy `terveys/`-alikokoelmassa (Art. 9). → Tämä on **ankkuri fysioterapeutti-visiolle (§4).**

**2.2 · Pelipaikkafundamentit — sisältö.**
"Pelipaikka"-tavoitetyyppi on, mutta pelipaikkakohtainen sisältö (cue/harjoite/kpi per rooli, U14+) puuttuu. Rakenne on, sisältö ohut.

**2.3 · Välitavoitteet (alitavoitteet) -porras.**
Kausitavoite → **välitavoitteet** → jaksofokus (arkkitehtuuri). Kortti näyttää nyt kausitavoitteen + SMART-tavoitteet, ei välitavoite-porrasta. Valinnainen (kuten pyydettiin).

---

## 3 · MYÖHEMMÄT (P3)

- **Kuormitus/RPE** Viikko-välilehteen (7.2b `kuorma_kooste`, GPS/RPE — additiivinen).
- **Ikävaihe-adaptaatio koko korttiin** (ei vain itsearvion äänirekisteri): termistö + normit pehmenevät nuoremmille.
- **Data-sidonta Firestoreen** (idp_kausi · pisteet · jaksofokus) — Coden strukturaali-follow-up, ei design-puute.

---

## 4 · TULEVAISUUS — fysioterapeutti-huomiot + kuntoutusprotokollat (KIRJATTU, ei vielä rakenneta)

> Kirjataan nyt, jotta suunta tulee huomioitua. Pohja on jo olemassa — tämä on integraatio, ei uutta perustaa.

**Valmis pohja koodissa:**
- **Rooli `fysioterapeutti`** — firestore.rules jo: kirjoittaa `jaksofokus` + `jaksofokus_historia` (v3.11, fyysisen jakson sulku/arvio) ja `ohjelmat` (v3.12). Näkyy jo Palaute-välilehdellä (mockupin "Sanna Laine · Fysiikkavalmentaja").
- **Kuntoutusprotokollat valmiina:** `src/lib/hpp_rehab_protokollat.js` — HPP ELITE v1.0, **7 vamma-aluetta, 53 harjoitteen kirjasto**. Jokaisella harjoitteella: `vaihe` (Acute/Subacute/Chronic/All), **`phv_ok`** (turvallinen kasvupyrähdyksessä), `cue`, `fascia`, `progressio`. Pohja: Anatomy Trains + Palloliiton Huuhkajapolku. Data päivittyy klinikalta ilman koodimuutoksia (`HPP_EXERCISES`).

**Visio (kun rakennetaan):**
1. **Saatavuus-status (§2.1) on ankkuri.** Kun fysioterapeutti merkitsee "rajoitettu/loukkaantunut", kortti näyttää statuksen ja **linkittää HPP_REHAB_PROTOKOLLAT-protokollan** (vamma-alue → vaihe → harjoitteet, `phv_ok`-suodatettu pelaajan PHV-tilan mukaan).
2. **Fysioterapeutin huomiot** omana kerroksena, näkyy Palaute-välilehdellä fysioterapeutti-roolina (ketju on jo olemassa). **GDPR:** huomiot `terveys/`-alikokoelmaan, ei vapaatekstiä pisteisiin/kortille.
3. **Kuntoutusjakso = jaksofokus `domeeni:'fyysinen'` + protokolla-ohjelma.** Fysioterapeutti kirjoittaa `jaksofokus`/`jaksofokus_historia` (jo säännöissä). Käyttää samaa domeeni-rakennetta kuin IDP-kortti v1 → ei törmää tekniseen jaksoon.
4. **IDP-integraatio:** loukkaantumisen aikana IDP-fokus voi siirtyä kuntoutusprotokollaan; palautuessa takaisin kehitysjaksoon. Kaari (Kehitys-välilehti) näyttää myös kuntoutusjaksot.

**Reunaehdot:** GDPR Art. 9 (terveys → `terveys/`, ei vapaatekstiä). Rehab-data klinikan päivitettävissä ilman koodia. Kaikki pehmeää — asiantuntija (fysioterapeutti) päättää protokollan/harjoitteet, järjestelmä ehdottaa `phv_ok`-suodatetut.

---

## 5 · JÄRJESTYS

1. **v1** — P1: 5D-yhteenveto 5/5 + radar normi-overlay (PHV-korjattu) + kehitysvaihe-bändi.
2. **v1.1** — P2: saatavuus/terveys-status-chip (GDPR-turvallinen) + pelipaikkafundamentit-sisältö + välitavoitteet.
3. **v2** — P3: kuormitus/RPE, ikävaihe-adaptaatio.
4. **Tulevaisuus** — §4 fysioterapeutti-huomiot + kuntoutusprotokolla-integraatio (kun saatavuus-status + rooli valmiina).
