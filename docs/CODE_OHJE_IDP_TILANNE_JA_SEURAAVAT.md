# CODE — IDP-kortti: tilannekuva + seuraavat askeleet

**Päivätty:** 2026-07 · **Main HEAD tätä kirjoitettaessa:** `6313696` · **Kohde:** `TalentMaster_VP_v25.html` (+ Pelaaja v7 vain jos render jaettu).
**Periaate (läpi koko työn):** *mitään ei pakoteta, asiantuntija päättää.* Järjestelmä ehdottaa, ihminen päättää (teema, painopiste, tavoitteet, jakso, kesto, domeeni, light/dark). Puuttuva kenttä = pehmeä vihje, EI tallennusestoa. Ei jäykkää järjestelmää.

---

## 1 · MIKÄ ON VALMIS (merged mainiin — ÄLÄ tee uudelleen)

| Vaihe | PR | Mitä |
|---|---|---|
| **1a Part A** | #165 / #167 | Jaksofokuksen `domeeni`-kenttä + archive-before-overwrite. Fyysinen ja teknis-taktinen jakso eivät enää ylikirjoita toisiaan; vaihdossa edellinen arkistoituu `jaksofokus_historia`:aan (`tulos:'vaihdettu'`). Live-Firestore-testattu. |
| **1a Part B** | #166 | **Yksi konsolidoitu jaksofokus-paneeli** (`_jfOhjaa` / `_jfModal`) + eksplisiittinen domeeni-toggle (`window._vpJfDomeeni`). Vanhat 3 asetuspintaa poistettu. |
| **1b** | #169 | **Narratiivi-IDP-välilehti** pelaajakortin modaaliin (`_vpIdpNarratiiviHTML`). 6 osaa: Header · Kausitavoite · Jaksofokus · SMART · Silta · Ääni&sitoumus. Liitetty viimeiseksi välilehdeksi (`window._jspTabN` dynaaminen), ei renumeroi vanhoja. Lukee olemassa olevaa dataa, ei uutta moottoria. |
| **P0** | #171 | `_jfModal` z-index 300 → **360**. "Muokkaa jaksofokus" avautui ennen pelaajakortin (z-320) taakse → näytti toimimattomalta. Nyt paneeli näkyy kortin päällä. |

**Datamalli (muuttumaton):** jaksofokus per pelaaja `p.jaksofokus` (`domeeni` ∈ `fyysinen`|`teknis_taktinen`); IDP `idp_kausi/<vuosi>`; PHV `phv_tila` (`tm_bioika.js`). Yksi editori (`_jfOhjaa`) — sekä sivupalkin Jaksofokus-taulukko että kortin "Muokkaa jaksofokus" kutsuvat sitä.

---

## 2 · SEURAAVA TYÖ — AUKOT-paketti

Täysi kuvaus: **`docs/CODE_OHJE_IDP_AUKOT_PAKETTI.md`** ja **`docs/CODE_BRIEF_IDP_KORTTI_AUKOT.md`**. Design-totuus: **`docs/design/idp-kortti/IDP-kortti.dc.html`**. **P0 on jo tehty — jätä väliin.**

### P1 (tee ensin, oma PR)
**1.1 · 5D-yhteenveto 3/5 → 5/5.** Nykytila/IDP-yhteenveto listaa vain D1·D2·D3 → **lisää D4 ja D5**. Tyhjät akselit haaleana "—", ei nollana.

**1.2 · Radar: normi-overlay + kehitysvaihe.** Pelaajan viisikulmio (teal) + ikäluokan normi haaleana katkoviivana.
- **KRIITTINEN — kypsyyskorjaus:** normi **PHV-korjattuna** (`phv_tila`), EI kalenteri-ikää vasten.
- **Kehitysvaihe** bändinä/labelina radarin alle, EI omana akselina.
- **Pehmennä nuoremmille:** normivertailu vain Showcase (U16–19); U8–15 "kehityskaista" tai piilota.
- **Ei normia tyhjille akseleille** (D3/D5 0-data).

### P2 (samaan tai heti perään)
- **Saatavuus/terveys-chip** headeriin (`● saatavilla`/`rajoitettu`/`loukkaantunut`). GDPR: vain status-lippu, terveystieto `terveys/`-alikokoelmaan (Art. 9).
- **Pelipaikkafundamentit** (cue/harjoite/kpi per rooli, U14+).
- **Välitavoitteet-porras** (Kausitavoite → välitavoitteet → jaksofokus). Valinnainen.

---

## 3 · MYÖHEMMIN (EI vielä koodata — design-vaihe ensin)

**Kokonaisuuden yksinkertaistus.** Sivupalkin **Jaksofokus ("joukkueen toiminta")** = joukkuetason ohjaamo (kattavuus, teemakeskittymä → ryhmäharjoite). Kortin **IDP → Jaksofokus** = pelaajan tarina. Sama data, sama editori (`_jfOhjaa`), kaksi korkeutta. Selkeytys tulee omana design-briefinä: (a) nimeäminen ("Jaksofokus — joukkue" vs kortin osio), (b) ristiinlinkitys (joukkuetaulukon rivi → pelaajan IDP-kortti), (c) yksi selkeä malli käyttäjälle. **Odota briefiä, älä toteuta vielä.**

---

## 4 · REUNAEHDOT (joka PR)
- **Alaikäiset:** Eino Pajula · Leo Eteläaho · Emil Ahopelto = read-only (ei kirjoituksia ilman erillistä vahvistusta). **Topias Koskela = testi-OK.**
- **GDPR:** terveys/loukkaantuminen `terveys/`-alikokoelmaan, ei vapaatekstiin/pisteisiin (Art. 9).
- **Cache-versio:** jos lib (`tm_idp.js`/`tm_kehityspolku.js`/`tm_jaksofokus.js`/`tm_bioika.js`) muuttuu → bumppaa `?v=N` kaikissa lataavissa HTML:issä.
- **Firestore-säännöt:** deploy **PR → N4-CI** (automaattinen, ei Console-käsityötä). P1/P2 eivät todennäköisesti tarvitse sääntömuutosta.
- **Brändi:** DS-tokenit, ei kovakoodattuja värejä/fontteja. Molemmat teemat `data-theme`. Cormorant (otsikot/KPI) · DM Sans (body) · DM Mono (badge/aikaleima). Terävät kulmat, hiusviivat, ei gradientteja.
- **Kaikki pehmeää** — ei pakotettuja tallennusesteitä.

## 5 · DoD (joka PR)
1. Toiminto renderöityy molemmissa teemoissa (**screenshot molemmista**).
2. Ei uutta taulua/moottoria ellei erikseen pyydetä; lue olemassa olevaa dataa.
3. Olemassa olevat vitestit vihreinä; uusi logiikka testattu.
4. Pieni, stackattu PR; kuvaus linkkaa design-handoffiin ja tähän ohjeeseen.
5. P1.2:ssa mukana esimerkki myöhään kehittyvästä (normi ei rankaise kypsymättömyydestä).
