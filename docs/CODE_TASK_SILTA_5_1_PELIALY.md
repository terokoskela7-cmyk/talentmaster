# Silta 5.1 — D4 peliäly → joukkuetaktinen teema (pelihavainto → jaksofokus)

> V5-sillan (`tm_arviointi_silta.js`, yksilö-D2 → teknis-taktinen konsepti) **jatke D4:ään**, jonka lib itse varaa
> ("D4 (peliäly) → 4d joukkueteema, vaihe 5.1"). Tuo **pelihavainnon (D4)** osaksi kehityssilmukkaa: heikko peliäly
> → ehdotettu **joukkuetaktinen** jaksofokus (`domeeni:'joukkuetaktinen'`), joka ryhmäaggregoituu VP:n Jaksofokus-
> työkalussa joukkueteemaksi (≥3 samaa → ryhmäharjoite). **EI moottorin uudelleenkirjoitusta** — `tm_jaksokooste.js`
> on jo domeeniagnostinen. **EI uutta konseptisanastoa** — kääntää olemassa olevaan `TM_TT_JOUKKUE`-listaan (16 kpl).
> **EI uutta kokoelmaa** — lähde on olemassa oleva `havainnot` + pikakentät; kohde on olemassa oleva `jaksofokus`.
> Kohde: **VP_v25 + Master_v16**. Päätökset (Tero 2026-07-09): kevyt I+S-silta ensin · minä luonnostelen kartan,
> Tero validoi · yksilöjakso + ryhmäaggregointi. §4 · §26 · §28 · §29 · §34 · V5/V6/V7.

## 0. Nykytila — auditointi (mitä D4:stä on jo olemassa)

- **Talteenotto:** pelihavainto tehdään Master **Havainnot**-välilehdellä → `seurat/{sid}/havainnot` (+ per-pelaaja
  `pelaajat/{id}/havainnot`). Malli **TIPS 1–10**: **T** tekninen suoritus paineessa · **I** pelikuva / Game IQ ·
  **P** persoona (asenne, intensiteetti) · **S** suorituksen nopeus (päätökset). Lisäksi **IDP-kytkös**
  (näkyikö kauden tavoite ottelussa: kyllä / osittain / ei) + **vapaa havainto**. (Demo/esittely:
  `TalentMaster_Pelihavainto_Palloliitto.html`.)
- **Pikakentät:** `adar_viimeisin` (arvo), `adar_havaintoja` (lkm), `adar_pvm` (pvm). *(Vanha "adar"-nimi = D4.)*
- **Näkyvyys:** 5D-profiili (D1–D5), joukkuepulssin pelihavainto-kortti (ka + kattavuus + suunta), pelaajaraportin
  kolmas lähde ("pelihavainto, subjektiivinen").
- **Silta (V5):** `tm_arviointi_silta.js` — `tmSiltaEhdota(havaittu, ctx)`, D2 (1–5) → y_h*-konsepti; top-3, heikoin
  ensin, tasapelissä perustaito. **Varaa 5.1:n eksplisiittisesti.**
- **Moottori:** `tm_jaksokooste.js` domeeniagnostinen (`DOMEENI_OLETUS='teknis_taktinen'`; "muut domeenit → sama
  koodi, eri tagi"). V7 lisäsi `'fyysinen'`. 5.1 lisää `'joukkuetaktinen'`.
- **Konseptisanasto valmiina:** `TM_TT_JOUKKUE` (`tm_teknistaktiset.js`), **16 konseptia**: hyökkäys j_h1–j_h6,
  puolustus j_p1–j_p6, siirtymä j_s1–j_s2, erikoistilanne j_e1–j_e2 — kukin `avain/koodi/nimi/ryhma/pelitilanne/
  kpi/kysymykset/konseptipeli/pelipaikat`. **Silta kääntää tähän listaan.**
- **VP Jaksofokus-työkalu:** aggregoi jo teemakeskittymän ("≥3 samaa → ryhmäharjoite"); näyttää oikean joukkueteeman.
  Ryhmäteeman esiinnostus on siis jo olemassa — 5.1 vain syöttää siihen joukkuetaktisen domeenin.

## 1. Periaate — D4 on yksilöhavainto, teema harjoitellaan ryhmässä

Peliäly havainnoidaan **per pelaaja** (TIPS), mutta joukkuetaktiikkaa **treenataan ryhmässä**. Siksi 5.1:
yksilötason **jaksofokus** (`domeeni:'joukkuetaktinen'`) pitää **pelaajan tarinan** elossa (jokaisen D4-kaari), ja
kun **≥3 pelaajalla** on sama joukkuetaktinen teema, VP:n **teemakeskittymä** nostaa sen **ryhmäteemaksi** automaattisesti
(olemassa oleva mekanismi). Ei erillistä joukkuejakso-objektia (päätös 2026-07-09). Ei moottorin muutosta.

## 2. Lähde — pelihavainto (TIPS) ja laukaisukynnykset

5.1a lukee **olemassa olevaa** pelihavaintodataa (ei muuta talteenottoa). Silta laukeaa yksilölle kun tuoreessa
pelihavainnossa on **joukkuetaktinen heikkoussignaali**:

- **I (pelikuva) ≤ kynnys** → pelin lukeminen / ryhmitys heikkoa.
- **S (suorituksen nopeus / päätökset) ≤ kynnys** → päätöksenteko / tilanteenvaihto hidasta.
- **tai IDP-kytkös = "ei" / "osittain"** → kauden (usein joukkuetaktinen) tavoite ei toteudu pelissä.

**T** ja **P** eivät laukaise joukkuetaktista siltaa (T ≈ D2-tekninen → V5:n silta; P ≈ asenne/D3). **§29-tuoreus:**
signaali huomioidaan vain jos pelihavainto on tuore (`adar_pvm` / havainnon pvm riittävän uusi); vanhentunut → "päivitä
havainto". Kynnys (esim. ≤5/10) parametrina — **Tero validoi §12**.

## 3. PURE-lib `lib/tm_pelialy_silta.js` (§34 — dual-export, Vitest, EI window/DOM/Firestore)

- `tmPelialySiltaEhdota(tips, ctx)` → top-3 joukkuetaktista ehdotusta (ehdotus, ei pakko §4).
  - `tips`: `{ T, I, P, S, idp_kytkos }` (1–10 | null; idp_kytkos: 'kylla'|'osittain'|'ei'|null).
  - `ctx` (valinnaiset): `sallitutKonseptit` (ika/vaihe-gating, j_*-avaimet) · `ryhmaVihje`
    ('hyokkays'|'puolustus'|'siirtyma' esim. IDP-tavoitteesta / pelipaikasta) · `konseptiNimi(avain)→nimi`
    (oletus `TM_TT_JOUKKUE`-nimi) · `kynnys` (oletus 5).
  - Logiikka: laske heikkoussignaalit (I, S, idp) → valitse **ryhmä-painotus** (heikko I → lukeminen/ryhmitys;
    heikko S → nopea päätös / siirtymä; ryhmaVihje suodattaa ensin) → järjestä `PELIALY_SILTA_PRIORITEETTI`
    mukaan → suodata `sallitutKonseptit` → palauta top-3 `{ konsepti_avain, konsepti_nimi, ryhma, syy, arvo }`.
    Tyhjä = graceful (ei heikkoutta / ei tuoretta havaintoa).
- Kartta `PELIALY_SILTA_MAP` (I/S/idp → j_*-shortlist) + `PELIALY_SILTA_PRIORITEETTI` = **§12 draft, Tero lukitsee.**
- **cue + koe** joukkuetaktiseen jaksofokukseen otetaan **suoraan `TM_TT_JOUKKUE`-konseptista** (`kysymykset[0]` = cue,
  `konseptipeli`/harjoite = koe) — ei uutta sisältöä. Pelaajaturvallinen kääntö `tmTtPelaaja` on jo olemassa.
- Dual-export CommonJS + `window.TM_PELIALY_SILTA`. EI yhdistä asteikkoja (TIPS 1–10 ≠ Palloliitto 1–5) — vain kääntää.

## 4. Kohde — `TM_TT_JOUKKUE` (olemassa, ei uutta sisältöä)

Silta kääntää 16 valmiiseen konseptiin. Ryhmät: **hyökkäys** (j_h1 rakentaminen paineessa … j_h6 rest defence) ·
**puolustus** (j_p1 yhdessä puolustaminen … j_p6 joukkueprässi) · **siirtymä** (j_s1 vastaprässi menetyshetkellä,
j_s2 puolustus→hyökkäys) · **erikoistilanteet** (j_e1/j_e2). Ika/vaihe-gating: nuoremmilla perusryhmitys (j_h2/j_p1)
ennen erikoistilanteita (j_e*) — `ctx.sallitutKonseptit` kutsujan puolelta (kuten V5 `sallitutKonseptit`).

## 5. Jaksofokus `domeeni:'joukkuetaktinen'` + ryhmäaggregointi (moottori ennallaan)

- **Aseta:** valittu ehdotus → `jaksofokus = { domeeni:'joukkuetaktinen', konsepti:{avain, nimi, ryhma}, cue, koe,
  lahde:'pelihavainto', lahtotaso:{ tips_I, tips_S, idp_kytkos, adar_viimeisin, pvm }, alkoi }`. Sama rakenne kuin
  V6/V7 (`ohjelma`-slotti korvautuu `konsepti`-slotilla), sama sulku/historia.
- **Ryhmäaggregointi:** VP:n teemakeskittymä laskee jo `jaksofokus.konsepti`-jakauman → **≥3 samaa joukkuetaktista
  teemaa = "ryhmäharjoite kannattaa"**. Ei uutta koodia aggregointiin; varmista että laskuri lukee myös
  `domeeni:'joukkuetaktinen'`-fokukset (ei suodata pois).
- **Moottori:** `tm_jaksokooste.js` käsittelee domeenin tagina (`o.domeeni || DOMEENI_OLETUS`) → sulku/kaari toimivat
  sellaisenaan. **EI muutosta moottoriin.**

## 6. UI — Master (aseta) + VP (oversight)

- **Master (valmentaja):** pelaajan D4/pelihavainto-kohdassa (tai jaksofokuksen asetuksessa) näytä **"Peliäly →
  joukkuetaktinen teema"**: jos tuore pelihavainto laukaisee (§2), näytä top-3 ehdotusta (`tmPelialySiltaEhdota`).
  Valinta → aseta jaksofokus (`domeeni:'joukkuetaktinen'`, cue/koe konseptista). Sama modaali-idea kuin V5-silta /
  V7 fyysteema. Jos ei signaalia → ei ehdotusta (graceful, ei pakoteta).
- **VP (oversight):** Jaksofokus-työkalu näyttää joukkuetaktiset fokukset osana **kattavuutta** ja **teemakeskittymää**
  (domeeni-suodatin / -merkintä, jotta joukkuetaktinen erottuu teknisestä ja fyysisestä). "≥3 samaa → ryhmäteema"
  toimii sellaisenaan. Ei uutta näkymää — laajennus olemassa olevaan.

## 7. Sulku + kehitysvaste (delta) — D4

- Jakson sulku kirjaa D4-vasteen `jaksofokus_historia`-riville (kuten V6/V7). **Delta vain tuoreesta pelihavainnosta**
  (§29-vahti: uusi `adar_pvm`/havainto jakson `alkoi`-jälkeen), muuten subjektiivinen "arvioi pelitilanteessa".
- **Kehityskieli (§28-henki, ei biologinen portti):** peliäly ei ole biologisesti portitettu kuten fyysinen, mutta
  kehittyy **peli-altistuksella ja kypsymisellä** → lyhyessä ikkunassa "ennallaan" on normaalia; ei syyllistävää
  kieltä (§7.22). Delta on taso-vaste, ei tuomio.
- **IDP-kytkös vasteena:** jos jakson teema vastasi IDP-tavoitetta, sulun yhteydessä voi lukea IDP-kytköksen
  ("näkyikö tavoite pelissä") vahvistuksena — ei pakollinen 5.1a:ssa.

## 8. Roolit + Rules (minimimuutos)

- **Ei uutta kokoelmaa.** Lähde `havainnot` (rules olemassa V-aiemmista), kohde `jaksofokus`-kenttä
  (rules olemassa V6/V7). `domeeni:'joukkuetaktinen'` on kenttäarvo `jaksofokus`-objektin sisällä → **ei uutta
  rules-klausuulia**, kunhan jaksofokus-write ei whitelistaa domeeni-arvoja (varmista: ei estä uutta domeeni-stringiä).
- **Verifioi rules-testillä** (emulaattori): valmentaja voi kirjoittaa `jaksofokus.domeeni='joukkuetaktinen'` (sama
  klausuuli kuin muut jaksofokukset), toisen seuran → estetty. Jos domeeni-arvoja ei validoi → **ei rules-deployta
  tarvita** (kirjaa tämä). Jos validoidaan → header-bump + Console-deploy (§12-työnkulku).

## 9. Rajaus (EI 5.1a:ssa)

- **5.1b — pelivaihe-tagi talteenottoon:** pelihavaintoon lisättävä hyökkäys/puolustus/siirtymä + alateema → **tarkka**
  silta (ei enää coarse I/S). Oma vaihe (muuttaa Havainnot-työkalua). 5.1a:n `ryhmaVihje` on tämän kevyt esiaste.
- **AI-tulkinta** (vapaa havainto → NLP → teema) — EI; 5.1a on deterministinen sääntösilta.
- **Joukkuejakso-objekti** (yksi teema koko ryhmälle omana dokumenttinaan) — EI; ryhmäteema syntyy aggregoinnista.
- **Cross-club-vertailu** — tenant-eristys pysyy.

## 10. Verifiointi

- **Vitest `tm_pelialy_silta.js`:** I≤kynnys → hyökkäys/ryhmitys-shortlist; S≤kynnys → siirtymä/päätös-shortlist;
  idp='ei' laukaisee; ryhmaVihje suodattaa; sallitutKonseptit-gating; ei signaalia → tyhjä; top-3 järjestys.
- **Rules emulaattorilla** (§8): valmentaja joukkuetaktinen jaksofokus ✓ · toisen seuran → estetty ✓ (tai: domeenia ei
  validoi → ei muutosta, kirjaa).
- **Live VP_v25 + Master_v16:** pelihavainto (heikko I/S) → Master ehdottaa top-3 joukkuetaktista → aseta jaksofokus →
  VP Jaksofokus näyttää sen kattavuudessa + teemakeskittymässä → aseta sama ≥3 pelaajalle → "ryhmäharjoite kannattaa"
  laukeaa → sulje jakso tuoreella pelihavainnolla → delta kirjautuu. Ei konsolivirheitä. Kevyt/tekninen/fyysinen
  jaksofokus ennallaan (regressio).
- `npm test` + lint + selain-tarkistus. **Merge vasta kun Tero sanoo "live".** Oma branch (esim. `feat/silta5_1-pelialy`).

## 11. Vaiheistus — 5.1a (kevyt) → 5.1b (tarkka)

- **5.1a (tämä):** kevyt I+S+IDP-silta olemassa olevaan pelihavaintodataan → joukkuetaktinen jaksofokus +
  ryhmäaggregointi. Ei talteenoton muutosta. Tuottaa arvoa heti nykydatalla; matala riski.
- **5.1b (myöhemmin):** pelivaihe-tagi pelihavaintoon → tarkka silta + tarkempi ryhmäteema-analytiikka. Portti: 5.1a
  käytössä + pelihavaintoja kertyy.

## 12. Draft-kartta — TERO VALIDOI (kuten D2-parit V5:ssä)

Alla luonnos. Lukitse parit + kynnys + prioriteetti ennen koodausta. (Ei mekaaninen 1:1 kuten D2 — coarse I/S antaa
**ryhmä-painotuksen**, konsepti valitaan shortlististä; ika/vaihe suodattaa.)

**Laukaisukynnys:** I ≤ 5 tai S ≤ 5 (1–10) **tai** IDP-kytkös ∈ {ei, osittain}. *(Validoi kynnysluku.)*

**I (pelikuva/Game IQ) heikko → lukeminen & ryhmitys:**
- ensisijaisesti: **j_h2** (hyökkäysryhmitys ja tilan tasapaino), **j_p2** (pelikeskustan tasapaino),
  **j_p3** (varmistuslinja), **j_h6** (rest defence / valppaus hyökätessä).

**S (suorituksen nopeus/päätökset) heikko → nopea päätös & tilanteenvaihto:**
- ensisijaisesti: **j_s1** (vastaprässi menetyshetkellä), **j_s2** (puolustus→hyökkäys), **j_h1** (rakentaminen
  paineessa), **j_h4** (ylivoima / linjan ohittaminen).

**IDP-kytkös = ei/osittain → suodata IDP-tavoitteen ryhmä ensin** (jos tavoite puolustuksellinen → j_p*, hyökkäävä → j_h*).

**Ryhmä-vihje (ctx.ryhmaVihje):** IDP-tavoitteesta tai pelipaikasta (esim. topparille j_p*/j_h1, laidalle j_h3/j_h4).

**Ika/vaihe-gating (ctx.sallitutKonseptit):** nuoremmat (esim. ≤U13) → perusryhmitys j_h2/j_h3/j_p1/j_p2 ennen
erikoistilanteita j_e1/j_e2 ja monimutkaista j_p5 (paitsiolinja). *(Validoi ikärajat.)*

**Prioriteetti tasapelissä:** perusrakenne (ryhmitys, yhdessä puolustaminen) ennen viimeistelyä/erikoistilanteita
— sama filosofia kuin V5 (perustaito ensin).
