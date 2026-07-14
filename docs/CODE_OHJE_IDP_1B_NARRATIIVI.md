# CODE — ALOITUSOHJE: IDP 1b · narratiivi-välilehti pelaajakortin modaaliin

**Tyyppi:** UI/narratiivi-siirto (ei uutta moottoria, ei uutta taulua, ei rules-muutosta).
**Kohde:** `TalentMaster_VP_v25.html` (valmentaja/VP).
**Design-totuus:** `docs/design/idp-kortti/IDP-kortti.dc.html` — pixel-tarkka referenssi.
**Logiikka-brief:** `docs/CODE_BRIEF_IDP_KORTTI.md` §0 (brändi), §1 (rakenne), §4 (ääni). Tämä ohje kaventaa sen 1b-paketiksi.

---

## ⚑ Ydinperiaate (muistutus)
Mitään ei pakoteta, asiantuntija päättää. Kaikki kentät pehmeitä: puuttuva = vihje, **ei tallennusestoa**. Ei jäykkää järjestelmää.

---

## Lähtötila (merged mainiin — älä tee uudelleen)
- **1a Part A** (#165/#167): jaksofokuksen `domeeni`-kenttä + archive-before-overwrite (`_vpJfArkistoiVaihdossa`, `TM_JAKSOFOKUS.tmJfVaihtaaDomeenin`). **Testattu myös live-Firestorea vasten** (Topias: teknis → fyysinen → edellinen arkistoitui `tulos:'vaihdettu'`).
- **1a Part B** (#166): **yksi konsolidoitu jaksofokus-paneeli** + eksplisiittinen domeeni-toggle (`window._vpJfDomeeni`); vanhat 3 asetuspintaa poistettu (`_vpTtSlot` poistettu). Fyysinen tallennus: `_vpAsetaFyysFokus(pid, teemaAvain)`.
- Cache: `tm_jaksofokus.js?v=2` livenä. 761 vitest läpi.

→ **Jaksofokuksen asetuslogiikka on siis valmis.** 1b on sen ympärille rakennettava **narratiivinen esityskerros**.

---

## 1b — SCOPE (tee tämä)

Rakenna pelaajakortin modaaliin **narratiivi-välilehtirakenne** DS-tokeneilla:

**Välilehdet modaalin sisään:** `Aloitus · Nykytila · IDP · Kehitys · Viikko`. Aktiivisen alle 1.5px `--teal-d` -viiva. **Tämä paketti toteuttaa IDP-välilehden** (muut välilehdet: placeholder/olemassa oleva sisältö, ei uutta).

**IDP-välilehden 6 osaa (design §1, järjestys ylhäältä alas):**
1. **Header** — avatar (teal-tint), nimi Cormorant 26px, meta-rivi (`seura · pelipaikka · ikävaihe · 💎 FLEI`), badge-rivi (IDP aktiivinen · Jakso n/4 · roolit). Lue olemassa olevasta pelaajadatasta.
2. **Kausitavoite** — 2px teal vasen-reuna, eyebrow "🎯 Kausitavoite", Cormorant 300 ~29px lause. Lähde: `idp_kausi`.
3. **Jaksofokus (aktiivinen)** — kortti, teema Cormorant, pilli-rivit **Domeeni · Kesto · Ohjelma**. "✎ Muokkaa jaksofokus" -nappi → **avaa jo olemassa oleva konsolidoitu paneeli (Part B)**. Älä rakenna uutta editoria — kytke nappi olemassa olevaan paneeliin.
4. **SMART-tavoitteet** — tavoiterivit: nro · nimi + tyyppi-chip · mittari `lähtö→tavoite` · deadline · progress-palkki. Rakenne on jo `tm_idp.js`:ssä (`mittari/lahto/tavoitearvo/aikaraami`) → **renderöi vain**. Puuttuva mittari = haalea "—", ei estä.
5. **Silta (teema→harjoite)** — näytä olemassa oleva `tm_kehityspolku.js`-silta (teema-kortti + konseptitagit + drillit). Ei uutta logiikkaa.
6. **Pelaajan ääni & sitoumus** — 3 itsearviolausetta + sitoumus-laatikko (✓/◔ + teksti). Rekisteri ikävaiheesta: `showcase` (U16–19) / `rakentaja` (U13–15) — **vain labelit design §4:n mukaan**. VP näkee + voi vahvistaa (kenttä `idp_sitoumus_pvm` on jo säännöissä). Lue/näytä; pelaajan oma kirjaus (Pelaaja v7 / PIN) EI kuulu 1b:hen.

**Brändi-lukko (§0, ei-neuvoteltava):** DS-tokenit, ei kovakoodattuja värejä/fontteja. `--carbon/--bone/--teal/--teal-d/--slate`; Cormorant (otsikot/KPI, ei bold) · DM Sans (body) · DM Mono (badge/aikaleima). Terävät kulmat, hiusviivarajat, ei gradientteja. Molemmat teemat `data-theme`. Valmiit luokat: `tm-eyebrow · tm-stitle · tm-tab · tm-badge · tm-kpi · tm-signal · tm-mono`.

---

## 1b — EI TÄHÄN (oma P1-paketti myöhemmin)
Nämä **eivät** kuulu 1b:hen — pidä PR puhtaana narratiivi/UI-siirtona:
- Radarin PHV-korjattu normi-overlay + kehitysvaihe-bändi.
- 5D-yhteenveto 3/5 → 5/5 -bugi.
- Saatavuus/terveys-status-chip.
- Pelipaikkafundamentit-sisältö, välitavoitteet-porras.
- Pelaaja v7 -puolen sama kortti (mahdollinen 1c).

(Nämä on kuvattu `docs/CODE_BRIEF_IDP_KORTTI_AUKOT.md`:ssä — tehdään erillisenä pakettina 1b:n jälkeen.)

---

## Reunaehdot
- **Cache-versio:** jos lib (`tm_idp.js` / `tm_kehityspolku.js` / `tm_jaksofokus.js`) muuttuu → bumppaa `?v=N` kaikissa lataavissa HTML:issä.
- **Alaikäiset:** Eino Pajula · Leo Eteläaho · Emil Ahopelto = read-only (ei kirjoituksia ilman erillistä vahvistusta). **Topias Koskela = testi-OK.**
- **GDPR:** terveys/loukkaantuminen `terveys/`-alikokoelmaan, ei vapaatekstiin/pisteisiin.
- **Firestore-säännöt:** 1b ei odota rules-muutosta (pelkkä esityskerros). Jos silti tarvitset, deploy menee **PR → N4-CI** (automaattinen; ei Console-käsityötä).
- **Kaikki lisät pehmeitä** — ei pakotettuja tallennusesteitä.

---

## Hyväksymiskriteerit (DoD)
1. Pelaajakortin modaalissa toimivat välilehdet; IDP-välilehti näyttää kaikki 6 osaa design-järjestyksessä, DS-tokeneilla.
2. "✎ Muokkaa jaksofokus" avaa **olemassa olevan** konsolidoidun paneelin (ei uutta editoria); domeeni/painopiste/teema toimivat kuten Part B:ssä.
3. SMART-rivit renderöityvät olemassa olevasta datasta; puuttuva kenttä = haalea vihje, tallennus onnistuu silti.
4. Molemmat teemat (light/dark) renderöityvät oikein — **liitä screenshot molemmista**.
5. Olemassa olevat vitestit pysyvät vihreinä; ei uutta taulua/moottoria.
6. Pieni, stackattu PR mainiin; kuvaus linkkaa design-handoffiin ja tähän ohjeeseen.
