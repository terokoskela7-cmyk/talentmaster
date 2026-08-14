# R4 — Kehitys v2: jaksofokus-työpöytä (rail-vapaa · inline-focal editori · Oura-rauhallinen) · Code-brief

> **Miksi:** DESIGN-LINJA — kaikki välilehdet karttoihinsa. Sekvenssi: Aloitus (v7) · Mittaus (v4) · Arviointi (v4+#371) → **nyt R4 Kehitys**.
> Live-Kehitys on ~70 % kartasta (moottori 2 polkua · IDP-selkäranka 3 tasoa · diagnostiikka revealin takana kaikki olemassa),
> mutta poikkeaa viidessä kohdassa: (1) pitää **profiilirailin** (kartta = yksi 940px-sarake), (2) ei **otsikkoa**, (3) ei
> **VP-oversight-statusriviä**, (4) jaksofokus-editori on **modaalissa** (kartta = inline-focal, aina auki työpöytänä),
> (5) **off-palette-pinkki** (#c060a8) lähdechipeissä (brändi-drift, sama kuin Arviointi #371). Tero-ohje: *"kausitavoite ja
> jaksofokus erittäin helpot käyttää ja selkeät"* → inline-focal (konteksti + toiminta samassa näkymässä, vähemmän klikkauksia).
> **Kartta (SSOT):** `docs/idp_design/KEHITYS_KISS_design_kartta_v2.html` (`.wrap` 940px · `.fwh` otsikko · `.status` strip ·
> `.spine` 3 tasoa, **TASO 2 `.focal open`** · `.diag` reveal · rolenote + pelifoot).
> **Luonne:** asettelu + render-järjestys + **editorin uudelleen-mount (REUSE, ei reimplementointi)** + CSS-väri. Ei uutta dataa,
> ei uutta arviointilogiikkaa. Ei `?v`. **Verifiointi: LIVE** protokollan mukaan — **monta dataprofiilia** (täysi/vajaa/tyhjä) + molemmat teemat.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN, älä toteuta eri versiota yksin.** Reuse yli reimplementoinnin. **Älä keksi porttia/ehtoa.**
- **ÄLÄ koske editorikoneistoon:** `_jfOhjaa` state-init · `_vpJfBodyHTML`/`_vpJfToggleHTML`/`_vpJfLinkitHTML` sisältö + autosave/handlerit ·
  domeeni-vaihto (`_vpJfSetDomeeni`) · silta-syöttö · re-render-koukku (7662–7666). **Vain mount-paikka (modaali → inline) muuttuu.**
- **§37-INVARIANTTI:** kausitavoite (makro, VP asettaa/hyväksyy) ja jaksofokus (meso, valmentaja) ovat **eri tasot** — EI yhdistetä.
  `_vpFokusValintaHTML` (kausitavoite-editori) ≠ moottorin 2 polkua (jaksofokus). KISS ① "yksi fokusvalitsin" on jo täytetty jaksofokukselle.

---

## MUUTOS 1 — rail-vapaa Kehitys + leveyskatto (940px)

**Rivi ~9543** `_jspVaihda`: rail-vapautus koskee nyt tabeja 0/1/2. **Laajenna tab 3:een:**
```js
if (_grid) _grid.classList.toggle('jsp-railvapaa', n === 0 || n === 1 || n === 2 || n === 3);
```
**Rivi ~1350** leveyskatto: lisää `#_jspTab3` samaan 940px-kattoon (kartan `.wrap` = 940px):
```css
.jsp-grid.jsp-railvapaa #_jspTab1, .jsp-grid.jsp-railvapaa #_jspTab2, .jsp-grid.jsp-railvapaa #_jspTab3 {
  width: 100%; max-width: 940px; margin-left: auto; margin-right: auto; }
```
**Perustelu:** kartta ei toista tutkaa (se on Aloituksessa) → raili piiloon, sisältö keskitetty 940px. Sisältö on jo `.jsp-right`:ssä
(`_kehExtra` → `#_jspTab3`). Tab 4 (Viikko) säilyy railillisena (oma R5). Molemmat teemat + mobiili pinoutuu ennallaan (§6).

## MUUTOS 2 — otsikko (`.fwh`) `_kehExtra`:n kärkeen

**Rivi ~10898**, ENNEN `_vpMoottoriKortitHTML`-kutsua: lisää kartan otsikkolohko (kompakti, ei uutta dataa):
```
eyebrow "Jaksofokus-työpöytä" (teal, .06em, uppercase)
serif  "Suunnitelman muokkauskoti"   (Cormorant Garamond, ~23px)
mono-sub "kausitavoite → jaksofokus → kaari · aseta · muokkaa · sulje · näkyy pelaajalle"  (DM Mono, ink3)
```
Käytä samaa tyylikuviota kuin muiden v4-välilehtien otsikoissa (Arviointi/Mittaus). Ei toimintoja — pelkkä orientaatio-otsikko.

## MUUTOS 3 — VP-oversight-statusrivi (kartan "Parannus 1", REUSE Aloituksen kuvio)

**Sijainti:** otsikon JÄLKEEN, moottorin EDELLÄ. **Reuse Aloituksen `_vpAloitusJaksofokusHTML`:n `vpal-status` + `_st(otsikko, arvo, sävy?)`-apuri**
(~7604) — älä keksi uutta komponenttia. Yksi rivi, silmäiltävä tila **olemassa olevasta datasta (EI uutta dataa):**

| kohta | lähde | esitys |
|---|---|---|
| Aikataulu | `idpJumissa(p.idp_kausi_tavoite / t)` | jumissa → ⚠ "Jumissa 8 vk" (amber) · muuten → ● "Aikataulussa" (teal) |
| Kausitavoite | `t.tila` / hyväksyntäkenttä | "hyväksytty" / "ei asetettu" |
| Jaksofokus | `p.jaksofokus` (alku + kesto_vk) | "X vk jäljellä" (laske kestosta; puuttuu → "ei jaksoa") |
| Seuraava review | `p.arvio_pvm` / review-sykli | "~X vk" (amber jos ≤2 vk) |

**Jos jokin kenttä puuttuu → ILMOITA (älä fabrikoi lukua).** Honest-empty: näytä "—" tai jätä kohta pois, ei keksittyä arvoa.
Kartan `.status`-tyyli: eyebrow "VP-oversight · tila yhdellä silmäyksellä" + `.strow` mono-rivi, `.stitem.ok` teal / `.warn` amber.

## MUUTOS 4 — jaksofokus TASO 2 → **inline-focal editori** (REUSE `_jfOhjaa`-slotit)

**Kartan TASO 2** on `.focal open` -editori: domeeni-toggle + konsepti + "opittu kun" -KPI:t + toimenpiteet + tallenna **suoraan sivulla**,
kun TASO 1 (kausi) ja TASO 3 (kaari) pysyvät **kiinni** (rauhallisuus). Live avaa saman editorin **modaalissa** (`_jfOhjaa` → `#_jfModal`).

**Toteutus = mount-paikan vaihto uudelleenkäyttäen (EI reimplementointi):**
`_jfOhjaa` (rivi 6931) rakentaa editorin **kolmesta slotista** modaalikääreen sisään:
`<div id="_vpJfToggle">` (`_vpJfToggleHTML`) · `<div id="_jfOhjausSlot">` (`_vpJfBodyHTML`) · `<div id="_jfLinkitSlot">` (`_vpJfLinkitHTML`).
Re-render-koukku (7662–7666) synkkaa `#_jfOhjausSlot`/`#_jfLinkitSlot` slot-ID:n kautta kun `window._jfOhjausP` on asetettu.

1. **`_vpKehSuunnitelmaHTML`:n TASO 2** (rivi ~5558, accordion-rivi `_accJaksofokus`): aseta **avoin oletuksena** (`avoin=true`) ja
   korvaa read-only-runko (`_vpTyopoytaJaksofokusHTML`) **inline-editorilla**: renderöi accordion-bodyyn **samat kolme slottia samoilla ID:illä**
   (`_vpJfToggle` · `_jfOhjausSlot` · `_jfLinkitSlot`) `_vpJfToggleHTML(p)` + `_vpJfBodyHTML(p)` + `_vpJfLinkitHTML(p)`:llä.
2. **State-init:** editorin slotit tarvitsevat saman alustuksen jonka `_jfOhjaa` tekee (rivit 6934–6949: `window._jfOhjausP`,
   `_vpJfDomeeni[p.id]`, `_vpJfLinkit/_vpJfKriteeri/_vpJfTarkenteet`). **Poimi tämä init jaettuun apuriin** (esim. `_jfAlustaTila(p, lahde, domeeni)`)
   jota SEKÄ `_jfOhjaa` ETTÄ inline-render kutsuvat — ei kopioida logiikkaa. Kutsu inline-init modaalitilan tapaan (`lahde:'vp'`,
   domeeni = aktiivisen jakson domeeni). Näin autosave-writerit lukevat oikean tilan myös inline.
3. **Tyhjä tila (ei jaksofokusta):** TASO 2 body näyttää editorin **tyhjänä valmiina** (domeeni-toggle + "＋ valitse konsepti" -CTA) +
   moottorin ehdotus toimii syöttönä. EI katoa, EI "Ei jaksofokusta" -umpikuja. (Sama periaate kuin tutka: aina esillä, täyttyy.)
4. **`_jfOhjaa`-modaali SÄILYY** muille sisääntuloille (Aloitus-linkki · silta `_jfOhjaa(pid,esiValinta,'silta',...)` · D1-fokus 4370) —
   **älä riko sitä.** Sama slot-ID-konventio → jos molemmat auki yhtä aikaa ID-törmäys; estä: inline käyttää editoria kun Kehitys-tab auki,
   modaali muualta. **Jos ID-uniikkius vaatii huomiota → ilmoita ENNEN** (esim. inline-slotit prefiksillä + re-render-koukku tunnistaa molemmat).
5. **TASO 1 + TASO 3 pysyvät kiinni** oletuksena (accordion `avoin=false`) → työpöytä rauhallinen, vain aktiivinen taso auki.

> **Kriittinen:** `_vpJfBodyHTML`/`_vpJfToggleHTML`/`_vpJfLinkitHTML` sisältö + kaikki handlerit (autosave, domeeni-vaihto, konseptivalinta,
> "opittu kun", tallenna, sulje jakso) **ennallaan** — vain renderöintipaikka muuttuu modaalista accordion-bodyyn. Ei uutta editorilogiikkaa.

## MUUTOS 5 — Oura/brändi: pinkki (#c060a8) pois + siniset linkit tealiksi

**a) Pinkki → neutraali (KAIKKI näkyvät lähdechipit, Tero: "kaikki tabit kerralla"):** korvaa `#c060a8` **kolmessa** kohdassa
(◎-merkki säilyy, kantaa merkityksen "lähde = pelihavainto"):
- **rivi 5947** (`_vpKausitavoiteHTML`, idp_lahde-pilleri): `<span class="chip" style="color:#c060a8...">◎ pelihavainto` → `color:var(--ink3)` (neutraali)
- **rivi 5974** (`_vpKausitavoiteHTML`, fokus-chipit): `color:#c060a8;border-color:rgba(192,96,168,.4)` → `color:var(--ink3);border-color:var(--border)`
- **rivi 7565** (`_vpAloitusJaksofokusHTML`, `vpal-meta`): `color:#c060a8` → `color:var(--ink3)`

Grep-varmista: **0 näkyvää `c060a8`** lähdechipeissä (Kehitys + Aloitus). (Muut `c060a8` = Arviointin `_jspArvSelit`-tapin takana / info-tooltip — EI tässä, ellei erikseen.)

**b) Siniset linkit → teal (Oura, teal ainoa aksentti):**
- **rivi ~10905** D3-kalibraatio-linkki `color:var(--blue)` → `color:var(--teal)`
- **rivi ~10908** diagnostiikka-toggle `color:var(--blue)` → `color:var(--teal)`
(Sama kuin Arvioinnissa ⓘ-siirto #371.) Sininen säilyy vain sanktioituna sekundäärinä (esim. override-note 6951), ei linkkiaksenttina.

## MUUTOS 6 — rolenote (§37) + pelifoot (kartan rauhalliset alaviitteet)

`_kehExtra`:n LOPPUUN (diagnostiikan jälkeen), kartan `.rolenote` + `.pelifoot` mukaan (mono/ink3, hienovarainen):
- **rolenote §37:** "Valmentaja omistaa operatiivisen jaksofokuksen · talenttivalmentaja talentit · VP asettaa kausitavoitteen + oversight."
- **pelifoot:** "Peli edellä, muut mukana. Jaksofokus voi olla fyysinen, teknis-taktinen tai psyykkinen — peli on painotus. Aloitus lukee tämän ja linkkaa tänne; Arvioinnin silta syöttää ehdotuksen; Viikko vie jakson kentälle."

---

## INVARIANTIT + DoD
- **Kartta-mitta:** rail-vapaa · sisältö keskitetty 940px · ei venytystä. **Järjestys (kartta):** otsikko → statusrivi → moottori 2 polkua →
  IDP-selkäranka (TASO 1 kiinni · **TASO 2 inline-editori auki** · TASO 3 kiinni) → D3-linkki → diagnostiikka (reveal) → rolenote + pelifoot.
- **Ei toiminnallista regressiota:** jaksofokus-autosave · domeeni-vaihto · konseptivalinta · "opittu kun" · silta-syöttö · moottori-ehdotus ·
  kausitavoite-editori (§37 eri taso) · `_jfOhjaa`-modaali muualta **toimivat täsmälleen kuten ennen**. Vain mount-paikka + asettelu + väri muuttuu.
- **§37:** kausi (VP) vs jakso (valmentaja) erillään — EI yhdistetty. **Brändilukko §5:** teal ainoa aksentti · **0 näkyvää pinkkiä** · sininen
  vain sanktioitu sekundääri · amber vain varoitus (jumissa/review). Molemmat teemat.
- **Rauhallisuus (Oura):** vain aktiivinen taso (jaksofokus) auki; kausi + kaari kiinni; vähemmän väriä; konteksti + toiminta samassa näkymässä.
- **LIVE ennen valmista (protokolla — monta profiilia + poikkitaulukko):**
  - **Täysi pelaaja** (kausitavoite + aktiivinen jaksofokus) → statusrivi täyttyy · TASO 2 editori auki inline · domeeni-toggle vaihtaa runkoa ·
    konseptivalinta + "opittu kun" + tallenna toimivat inline (ei modaalia) · TASO 1/3 kiinni.
  - **Vajaa** (kausitavoite mutta ei jaksofokusta) → TASO 2 editori tyhjänä valmiina + moottori-ehdotus toimii syöttönä · ei kaadu.
  - **Tyhjä** (ei kausitavoitetta/jaksofokusta) → honest-empty CTA:t · statusrivi "ei jaksoa / ei asetettu" (ei fabrikoituja lukuja) · ei kaadu.
  - **Toiminnallinen:** aseta jaksofokus moottorista → tallentuu · domeeni fyysinen↔teknis-taktinen → runko vaihtuu · `_jfOhjaa`-modaali
    Aloituksesta/sillasta → toimii yhä (ei ID-törmäystä).
  - **Poikkitaulukko:** vaihto Viikkoon (tab 4) → rail palaa; takaisin Kehitykseen → rail pois. **0 näkyvää pinkkiä** (Kehitys + Aloitus). Molemmat teemat. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ (mahdollinen jatko)
- Kausitavoite/jaksofokus-tason **yhdistäminen** (§37 kieltää) · `_vpFokusValintaHTML`-poisto (eri taso, tarpeen).
- Diagnostiikan (f4) trimmaus 2 riviin (jo revealin takana → rauhallinen; kartan kevennys valinnainen myöhemmin; kaari-historian
  päällekkäisyys TASO 3:n kanssa = erillinen pieni siivous jos Tero haluaa).
- Muiden tabien pinkki `_jspArvSelit`-tapin takana / info-tooltipeissä (ei näkyvää; erillinen jos halutaan täydellinen 0×).
