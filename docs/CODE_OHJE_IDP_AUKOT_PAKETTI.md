# CODE — ALOITUSOHJE: IDP AUKOT-paketti (P0 z-index-korjaus + P1 radar/5D)

**Tyyppi:** korjaus + esityskerroksen täydennys. **Kohde:** `TalentMaster_VP_v25.html` (+ Pelaaja v7 vain jos sama render jaettu).
**Täysi tausta:** `docs/CODE_BRIEF_IDP_KORTTI_AUKOT.md` (P1/P2/P3 kuvattu siellä). Tämä ohje sekvensoi työn.
**Design-totuus:** `docs/design/idp-kortti/IDP-kortti.dc.html`. **Periaate:** mitään ei pakoteta, asiantuntija päättää; kaikki pehmeää.

---

## P0 — KORJAA HETI: "Muokkaa jaksofokus" aukeaa modaalin taakse (live rikki)

**Oire:** IDP-välilehden (1b) "✎ Muokkaa jaksofokus" -nappi ei näytä tekevän mitään.
**Juurisyy:** `_jfOhjaa` rakentaa `#_jfModal`-overlayn **z-index:300**. Pelaajakortti-modaali `#_jspModal` on **z-index:320** ja sen tausta on läpinäkymätön (`rgba(17,17,16,.92)`). Paneeli avautuu siis pelaajakortin **taakse** → näkymätön. (Todennettu live: `document.elementFromPoint(keskusta)` on avauksen jälkeen `_jspModal`, ei `_jfModal`.)
**Korjaus:** nosta `_jfModal` pelaajakortin yläpuolelle — vaihda sen `z-index:300` → **`z-index:360`** (yli 320:n; 340/345/360 ovat jo käytössä muilla toissijaisilla modaaleilla, joten 360 istuu turvallisesti päällimmäiseksi). `_jfOhjaa` on jaettu funktio; korotus on turvallinen kaikille kutsujille (mikään ei kuulu 320:n alle).
**Hyväksymiskriteeri:** avaa pelaajakortti → IDP-välilehti → "Muokkaa jaksofokus" → konsolidoitu jaksofokus-paneeli näkyy pelaajakortin **päällä**, domeeni/painopiste/teema toimivat, ✕ sulkee paneelin ja palauttaa kortin. Testaa myös sivupalkin Jaksofokus-taulukon "Ohjaa"-napista (sama `_jfOhjaa`, ei saa regressoida).

---

## P1 — RADAR-NORMI + 5D-YHTEENVETO (AUKOT §1)

**1.1 · 5D-yhteenveto 3/5 → 5/5.** Nykytila/IDP-yhteenveto listaa vain D1·D2·D3 — **lisää D4 ja D5**. Tyhjät akselit (esim. D3=0/12, D5=0/2) haaleana "—", ei nollana. (Radar näyttää jo 5 akselia.)

**1.2 · Radar: normi-overlay + kehitysvaihe.** Lisää 5D-radariin toinen kerros: pelaajan viisikulmio (teal, nykyinen) + **ikäluokan normi** haaleana katkoviivana.
- **KRIITTINEN — kypsyyskorjaus:** normi näytetään **PHV-korjattuna** (`phv_tila`, `tm_bioika.js`), EI kalenteri-ikää vasten. Muuten myöhään kehittyvä näyttää heikolta pelkän kypsymättömyyden takia.
- **Kehitysvaihe kontekstina:** bändi/label radarin alle (esim. "16+ · PHV ohitettu · voima/nopeus-ikkuna auki"), EI omana akselina.
- **Pehmennä nuoremmille:** normivertailu vain **Showcase (U16–19)**. Leikkijä/Rakentaja (U8–15): piilota normi tai "kehityskaista", ei suoraa vertailua.
- **Älä piirrä normia tyhjille akseleille** (D3/D5 0-data → harhaanjohtava) — katkoviiva/haalea kunnes dataa on.

---

## P2 — TÄYDENTÄVÄT (samaan pakettiin jos aikaa, muuten heti perään)

- **2.1 · Saatavuus/terveys-status-chip** headeriin: `● saatavilla` / `rajoitettu` / `loukkaantunut`. **GDPR:** vain status-lippu, EI diagnoosia kortille; terveystieto pysyy `terveys/`-alikokoelmassa (Art. 9). → ankkuri tulevalle fysioterapeutti-visiolle (AUKOT §4).
- **2.2 · Pelipaikkafundamentit** — pelipaikkakohtainen cue/harjoite/kpi per rooli (U14+). Rakenne on, sisältö ohut.
- **2.3 · Välitavoitteet-porras** — Kausitavoite → välitavoitteet → jaksofokus. Valinnainen.

---

## Reunaehdot
- **Cache-versio:** jos lib muuttuu → bumppaa `?v=N` kaikissa lataavissa HTML:issä.
- **Alaikäiset:** Eino Pajula · Leo Eteläaho · Emil Ahopelto = read-only. **Topias Koskela = testi-OK.**
- **GDPR:** terveys → `terveys/`-alikokoelmaan, ei vapaatekstiin/pisteisiin.
- **Firestore-säännöt:** ei odoteta muutosta (esityskerros + z-index). Jos tarvitaan, deploy **PR → N4-CI** (automaattinen).
- **Kaikki pehmeää** — ei pakotettuja tallennusesteitä.

---

## Järjestys & PR:t
1. **P0** omana pienenä PR:nä ensin (rikki live → nopea korjaus, helppo verifioida). Molemmat teemat, screenshot paneeli auki kortin päällä.
2. **P1** omana PR:nä (5D 5/5 + radar PHV-normi + kehitysvaihe-bändi). Screenshot molemmista teemoista + esimerkki myöhään kehittyvästä (normi ei rankaise kypsymättömyydestä).
3. **P2** joko samaan tai heti perään.
Vitestit vihreinä joka PR:ssä.
