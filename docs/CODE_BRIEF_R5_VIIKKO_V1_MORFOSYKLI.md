# R5 — Viikko v1: morfosykli-työpöytä (rail-vapaa · Oura-muotokoodaus · display-first) · Code-brief

> **Miksi:** DESIGN-LINJA — viimeinen välilehti karttaansa (IDP 5/5). Sekvenssi valmis: Aloitus·Mittaus·Arviointi·Kehitys → **R5 Viikko**.
> Live-Viikko (`_vpViikkoHTML` ~9342) on funktionaalisesti rikas mutta **tiheä aina-auki muokkauslista** (7 riviä number-input +
> RPE-dropdown + läsnäolo-sykli). Kartta on **rauhallinen morfosykli-korttinauha** (MD-suhteinen) jota muokataan napista.
> **Suunnitteluanalyysi (Oura × KV-benchmark × KISS) tehty + 4 päätöstä lukittu** (`docs/ANALYYSI_VIIKKO_R5_OURA_KV_KISS.md`):
> **P1** §28-PHV-kuorma ensisijainen, ACWR suuntaa-antava sekundääri · **P2** lähdekortit+mokknote ⓘ-tapin taakse ·
> **P3** display-first / edit-on-tap · **P4** pelaajan ääni honest-empty nyt, data myöhemmin.
> **Kartta (SSOT):** `docs/idp_design/VIIKKO_KISS_design_kartta_v1.html` (`.foc` · `.wk` morfosykli · `.duo` · `.voice` · `.rev` · `.empty`).
> **Luonne:** asettelu-uudistus (lista → nauha) + render-järjestys + **olemassa olevan koneiston uudelleenkäyttö** (sRPE/ACWR/§28/läsnäolo/
> tavoitejakauma/kirjaus-tallennus). **Ei uutta Firestore-kokoelmaa, ei uutta laskentaa.** Ei `?v`. **Verifiointi LIVE, monta profiilia.**

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN, älä toteuta eri versiota yksin.** Reuse yli reimplementoinnin. **Älä keksi porttia/ehtoa.**
- **ÄLÄ koske tallennuskoneistoon:** `kirjaukset/{pvm}`-kirjoitus (litteä + sessiot[] + audit) · läsnäolo `lasnaolijat.tila` (K2) ·
  sRPE-johto (`_vpViikkoSrpe`) · ACWR-laskenta · §28-kuormaehdotus · tavoitejakauma A/B/C -laskenta · `_vpViikkoTayta`-esitäyttö.
  **Vain esitys + järjestys + syöttö-paljastus muuttuu.**
- **§7.22:** kuorma/ACWR = valmentajan/VP:n työkalu, EI pelaajalle rankingina. **GDPR Art.9:** terveys-SYYT eivät koskaan kirjauksiin — vain 🩹-lippu.

---

## MUUTOS 1 — rail-vapaa Viikko (tab 4) + leveyskatto 860px

**Rivi ~9640** `_jspVaihda`: laajenna rail-vapautus tab 4:ään → `n === 0 || 1 || 2 || 3 || 4` (kaikki IDP-välilehdet rail-vapaita).
**Rivi ~1350** leveyskatto: lisää `#_jspTab4` kattoon **860px** (kartan `.wrap`, kapein — viikko on tiiviste):
```css
.jsp-grid.jsp-railvapaa #_jspTab4 { width: 100%; max-width: 860px; margin-left: auto; margin-right: auto; }
```
(Tab 3 pysyy 940px, tab 0 1040px — per-tab kartan mitta.)

## MUUTOS 2 — fokus-header `.foc` (kannettu Kehityksestä)

`_vpViikkoHTML`:n kärkeen, nykyisen eyebrow/otsikon TILALLE kartan `.foc`-teal-laatikko:
- eyebrow "Tämän viikon fokus · kannettu jaksofokuksesta" + serif konsepti_nimi + "Opittu kun: {onnistumiskriteeri||johdettu}" +
  mono-lähde "↳ Kehitys · jaksofokus ({kesto_vk} vk, {domeeni})". Data `p.jaksofokus` (reuse). Ei jaksofokusta → ei foc-laatikkoa (empty-state, MUUTOS 8).

## MUUTOS 3 — MORFOSYKLI-KORTTINAUHA (kartan `.wk`, Oura-muotokoodaus) — korvaa pystylistan

**Korvaa** `_vpViikkoGridHTML`:n pystylista (`_vpViikkoRiviHTML`) **7-korttisella nauhalla** (`display:grid;grid-template-columns:repeat(7,1fr)`,
mobiilissa pinoutuu/scrollaa). Per päiväkortti (kartan `.wd`):
- **Päivä + MD-leima:** viikonpäivä (Ma–Su, `_vpViikkoPaivat`) + **MD±n kalenterista johdettuna** (ks. MD-ANKKUROINTI alla).
- **Sisältö:** fokus/harjoitus-nimi + tag (A/B/C) · kesto · lähde (`kalenteri` / `app · pelaaja` 📱).
- **Oura-MUOTOKOODAUS (P2/brändilukko — teal ainoa vahva aksentti):**
  - **Fokus-treeni** (tag A / jaksofokus-päivä) → **teal**: `.ftag` teal-merkki + sRPE-palkki teal. **Ainoa vahva väri.**
  - **Ottelu** → **⚽-merkki + neutraali reuna** (EI amber-täyttöä). MD-leima "MD".
  - **Lepo** → **katkoviivareuna + himmeä** (`.rest`, ink3). Ei palkkia.
  - **Muu harjoitus** → kiinteä reuna, himmeä ink3 sRPE-palkki (ei väriä).
  - Päivätyyppi luetaan **muodosta/reunasta/leimasta + ⚽**, EI neljästä täyttöväristä. (Sama väri→muoto kuin Arviointi #371.)
- **Kevyt legenda:** "● fokus-treeni · ⚽ ottelu · ┈ lepo · palkki = sRPE-kuorma". Teal-piste vain fokukselle.

**MD-ANKKUROINTI (KV-benchmark, P-tarkennus 1 — ottelupäivä on muuttuja):**
- Johda ottelupäivä(t) **§35 K2 -kalenterista** (olemassa oleva `_kalenteriTapahtumat`/`_tapahtumat`, pelaajan joukkue, tämä viikko) —
  **EI kovakoodattua lauantaita.** Löytyy ottelu → MD = sen päivä, muut päivät MD±n. **Reuse kalenteri-data; älä uutta kyselyä.**
- **Honest-empty / degradaatio:** **0 ottelua** → ei MD-leimoja, paljas viikonpäivä-nauha (ei keksitä MD:tä). **2 ottelua** → kaksi MD-ankkuria
  (tai lähin-ottelu-suhteinen); ei kaadu. **Ei jaksofokusta** → nauha näyttää kalenterin/omatoimiset ilman fokus-korostusta.

## MUUTOS 4 — display-first / edit-on-tap (P3, KISS)

**Oletusnäkymä = luettava nauha (ei syöttökontrolleja esillä).** Muokkaus avautuu napautuksella:
- Päiväkortin napautus (tai "✎ muokkaa · lisää harjoite" kartan `.mokk`) → avaa **sen päivän** editoinnin (kesto / RPE / läsnäolo / fokus-tag /
  lepo / lisää harjoite) — **reuse nykyiset kontrollit + handlerit** (`_vpViikkoSetKesto`/`_vpViikkoSetRpe`/`_vpViikkoCycleLasna`/`_vpViikkoCycleFokus`),
  vain **mount-paikka** muuttuu (rivi-inline → napautuksesta avautuva editori päiväkortin alla / kevyt popover). **Älä muuta tallennuslogiikkaa.**
- Pelaajan omatoimiset (`lahde:'pelaaja'`, 📱) **valuvat nauhaan automaattisesti** (kaksisuuntainen silta, ennallaan).
- "✨ Täytä viikko" -nappi säilyy (esitäyttö jaksofokuksesta + kalenterista, ehdotus).

## MUUTOS 5 — kuorma + A/B/C tiivis (P1: §28 ensin, ACWR sekundääri)

Reuse `_vpViikkoKuormaHTML` + `_vpViikkoTavoitejakaumaHTML`, järjestä kartan `.duo`-pariksi, mutta painota P1 mukaan:
- **§28-PHV-kuormaehdotus ENSISIJAINEN** (kasvupyrähdys/kasvutahti → kevyempi viikko, "sinä päätät"). Nostettu, näkyvä.
- **ACWR SUUNTAA-ANTAVA SEKUNDÄÄRI:** oletuksena **yksi arvo + yksi sana** ("ACWR 1.12 · linjassa" / "koholla"). Kartan 4-vyöhykepalkki
  **himmeänä tai ⓘ-tapista** (ei saturoitua). Guard säilyy: "vaatii ~4 vk kroonista pohjaa" → honest-empty jos `p._viikkoKrono4` puuttuu (ei nollaa).
- A/B/C-jakauma (segmentti + "less is more" -note) ennallaan, kartan visuaali.

## MUUTOS 6 — läsnäolo (K2-kooste) + pelaajan ääni (P4 honest-empty) + cue

Kartan toinen `.duo`:
- **Läsnäolo:** K2-kooste tälle viikolle (`lasnaolijat.tila`: paikalla/osittain/lepo/poissa). Reuse `_VKO_LASNA`. Toteutunut, ei suunniteltu.
- **Pelaajan ääni · viikkorefleksio (P4 — honest-empty NYT):** rakenna lohko (kartan `.voice`) + **cue-kysymys** (jaksofokus-konseptin cue,
  reuse `tmTtKysymykset`). **Data honest-empty:** ei viikkorefleksiodataa → "Ei pelaajan refleksiota vielä" + cue silti näkyviin (ehdotus).
  **ÄLÄ fabrikoi lainausta.** (Datapolku Pelaaja-appista kytketään myöhemmin — jätä kenttäluku valmiiksi jos `p.viikko_refleksio` tms. löytyy, muuten empty.)

## MUUTOS 7 — katselmus-rivi (kartan `.rev`)
Nauhan+duojen jälkeen: "Seuraava katselmus ~{X} vk — jaksofokus ({kesto_vk} vk) päättyy. Katselmus = keskustelu, ei arvosana (EPPP)."
+ "Avaa katselmus →" (→ Seuranta/Kehitys, reuse olemassa oleva review-linkki/`_jspVaihda`). Review-ajoitus samasta EPPP-rytmistä kuin Aloitus/Kehitys.

## MUUTOS 8 — lähdekortit + mokknote ⓘ-tapin taakse (P2, Oura) + empty-state
- **3 lähdekorttia** (joukkuekalenteri · pelaajan app · kuorma&kypsyys) + **mokknote** (kaksisuuntainen silta -selite) → **ⓘ-toggle**
  "mistä viikko koostuu" (default `display:none`, sama kuvio kuin Arvioinnin `_jspArvSelit`). Ei oletusnäkymässä.
- **Empty-state** (ei jaksofokusta) kartan `.empty` mukaan: "Ei viikkosuunnitelmaa vielä" + selite + CTA "📍 Aseta jaksofokus (Kehitys) →"
  (`_jspVaihda(3)`). Rehellinen: ei keksittyä viikkoa.

---

## INVARIANTIT + DoD
- **Kartta-mitta:** rail-vapaa · 860px keskitetty. **Järjestys:** fokus-header → morfosykli-nauha (+legenda) → kuorma/§28 + A/B/C (duo) →
  läsnäolo + pelaajan ääni (duo) → katselmus-rivi → ⓘ-lähteet. Empty → `.empty` CTA.
- **Oura:** teal ainoa vahva aksentti · päivätyyppi muodosta (⚽/katkoviiva/leima), ei neliväristä täyttöä · lähteet+mokknote tapin takana ·
  ACWR yksi arvo+sana oletuksena. **0 pinkkiä.** Amber vain aito varoitus (§28-kuorma / ACWR koholla). Molemmat teemat.
- **KV-benchmark:** MD kalenterista (ei kovakoodattu) · §28-PHV ensisijainen nuorille · ACWR suuntaa-antava + 4vk-guard.
- **KISS / ei datahukkaa:** yksi lähde (`kirjaukset` + K2 kalenteri) · ei uutta kokoelmaa/laskentaa · tallennus + sRPE + ACWR + §28 + tavoitejakauma +
  esitäyttö + läsnäolo **toimivat täsmälleen kuten ennen** — vain esitys/järjestys/syöttö-paljastus muuttuu.
- **LIVE ennen valmista (protokolla — monta profiilia + poikkitaulukko):**
  - **Täysi** (jaksofokus + ottelu la + kirjauksia): fokus-header · nauha MD−4/−2/MD/+1 · teal fokus-treenit · ⚫ ottelu ⚽ · lepo katkoviiva ·
    kuorma+§28 · A/B/C · läsnäolo · katselmus. Napautus → päivän muokkaus (kesto/RPE/läsnä autosave toimii).
  - **Ei ottelua tällä viikolla** → paljas viikonpäivä-nauha, ei MD-leimoja, ei kaadu.
  - **2 ottelua** → kaksi MD-ankkuria, ei kaadu.
  - **Ei jaksofokusta** → `.empty` + CTA "Aseta jaksofokus (Kehitys)".
  - **Ei kroonista kuormaa (`_viikkoKrono4` puuttuu)** → ACWR honest-empty "kertyy ~4 vk", ei nollaa/keksittyä.
  - **Pelaajan ääni ilman dataa** → "ei refleksiota vielä" + cue (ei fabrikointia).
  - **Toiminnallinen:** kesto/RPE/läsnäolo napautus → kirjaus tallentuu (kuten ennen) · omatoiminen (`lahde:'pelaaja'` 📱) näkyy nauhassa ·
    "✨ Täytä viikko" esitäyttää. **Poikkitaulukko:** Kehitys (tab 3) ↔ Viikko (tab 4) → molemmat rail-vapaita nyt. Molemmat teemat. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ (mahdollinen jatko)
- Pelaajan viikkorefleksion **datapolku** Pelaaja-appista (P4 — kytketään kun rakennettu; nyt honest-empty + cue).
- ACWR:n korvaaminen kehittyneemmällä kuormamallilla (K5 kuorma+dropout, §35) — erillinen.
- Omatoimiharjoitteen **asetus pelaajan appiin tästä** (kartan kaksisuuntaisen sillan kirjoitussuunta) — jos ei jo toimi, erillinen pieni lisä.
