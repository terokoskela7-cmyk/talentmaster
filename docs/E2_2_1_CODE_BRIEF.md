# CODE BRIEF — E2.2.1 · FIX: live datahukka (Poista/Palauta pyyhkii rakentumattomia pikakenttiä)

**Tyyppi:** kiireellinen korjaus (live-datahukka). **Kohde:** `TalentMaster_VP_v25.html` (kutsuja — EI primitiivi). **Oma pieni PR. Jatkoa E2.2:lle** (#296, livenä).

> **Huom:** tämä brief-tiedosto on rekonstruoitu E2.2.1-kickoffista (Teron paste) — kattaa juurisyyn, korjauksen ja valmiin toteutuksen. Ristiriidassa kickoff voittaa.

**Design-totuus:** ei UI-muutosta. Puhdas kutsuja-tason suodatin ennen `FieldValue.delete()`-kirjoitusta.

**Rakentuu valmiin päälle:**
- `tmRakennaPikakentatArkistosta(pelaajaDoc, merkinnat, optDeps)` → `{ upd, poistetut }` (P-EDIT.0, **muuttumaton**).
- E2.2: `_vpMittausRebuildKirjoita(p)` kirjoittaa `pelRef.set(upd,{merge})` + `FieldValue.delete(poistetut)`.

---

## JUURISYY

`tmRakennaPikakentatArkistosta` laskee `poistetut` = kentät jotka olivat pelaajadokumentissa mutta joita rebuild **ei tuottanut** kaikista testituloksista. Primitiivi näkee **vain** `testitulokset`-arkiston (merkinnät). Jos pelaajan pikakenttä on **peräisin muualta kuin testituloksista** (esim. `recalcHH` kirjoitti `hh_taso`/`d1_*` suoraan pelaajadokumenttiin `hh_viimeisin`:istä, ilman erillistä H-H-testitulos-dokkia), niin rebuild TKI-only-arkistosta tuottaa 0 H-H-kenttää → `poistetut` sisältää `hh_*`/`d1_*` → E2.2:n `FieldValue.delete()` **pyyhkii ne hiljaa**.

**Todiste (live):** Topiaksen `testitulokset` on pelkkää TKI:tä, mutta hänellä on H-H-pikakentät (`hh_taso=2.5`, `d1_*`). Minkä tahansa TKI-mittauksen **Poista/Palauta** ajaa rebuildin → `poistetut` = `[hh_viimeisin, hh_pvm, hh_taso, d1_taso, d1_lahde, d1_pvm]` → ne poistuvat.

**Ei primitiivin vika** — primitiivi tekee oikein sen tiedon varassa mikä sillä on. **Korjaus on kutsujassa:** älä poista kenttää jonka *domain* (H-H / TKI) ei ole lainkaan edustettuna arkistossa → sen on täytynyt tulla muualta → suojataan.

---

## KORJAUS (kutsujassa, EI primitiivissä)

Puhdas suodatin `_vpMittausSuodataPoistetut(poistetut, cacheDocs)` joka poistaa `poistetut`-listasta ne kentät joiden domain ei ole edustettuna **raa'assa** cachessa (ml. mitätöidyt — katsotaan raakoja `testit`-avaimia). Domain→kenttä-kartta johdetaan primitiivin kenttäperheistä (`_OMISTETUT_YDIN` + `_D2_KENTAT` + `hh_historia`/`tki_historia`); **kartoittamaton kenttä → suojataan (fail-safe).**

```js
// Domain-luokitin: hh_* / d1_* / d2_* → 'hh' · tki_* / tk_* → 'tki' · muu → null (suojattu).
// Kattaa primitiivin _OMISTETUT_YDIN + _D2_KENTAT + hh_historia/tki_historia (prefiksipohjainen → pysyy synkassa).
function _vpMittausKenttaDomain(f) {
  if (/^(hh_|d1_|d2_)/.test(f)) return 'hh';
  if (/^(tki_|tk_)/.test(f)) return 'tki';
  return null;
}
// Raaka-avainten domain-edustus (ml. mitätöidyt): katsotaan w.data.testit-avaimet suoraan.
var _VPM_HH_AVAIMET = { lin5m:1, lin_5m:1, lin10m:1, lin_10m:1, lin30m:1, lin_30m:1, hyppy_cj:1, cmj:1, mas:1, kasirata:1, sm_juoksu:1, sm_pallo:1, pujottelu_hh:1, syotto_hh:1 };
var _VPM_TK_AVAIMET = { ponnauttelu:1, syotto:1, pujottelu:1, kuljetus_laukaus:1, pituuspotku:1 };

function _vpMittausSuodataPoistetut(poistetut, cacheDocs) {
  if (!poistetut || !poistetut.length) return poistetut || [];
  var hhEdustettu = false, tkiEdustettu = false;
  (cacheDocs || []).forEach(function (w) {
    var testit = (w && w.data && w.data.testit) || {};
    Object.keys(testit).forEach(function (k) {
      if (_VPM_HH_AVAIMET[k]) hhEdustettu = true;
      if (_VPM_TK_AVAIMET[k]) tkiEdustettu = true;
    });
  });
  return poistetut.filter(function (f) {
    var dom = _vpMittausKenttaDomain(f);
    if (dom === 'hh')  return hhEdustettu;    // poista vain jos H-H edustettu arkistossa
    if (dom === 'tki') return tkiEdustettu;   // poista vain jos TKI edustettu arkistossa
    return false;                             // kartoittamaton → suojataan (fail-safe)
  });
}
```

**Kytkentä** `_vpMittausRebuildKirjoita`:iin heti primitiivin kutsun jälkeen:

```js
var res = tmRakennaPikakentatArkistosta(p, merkinnat) || { upd: {}, poistetut: [] };
res.poistetut = _vpMittausSuodataPoistetut(res.poistetut, _vpMittausCache[p.id]);   // E2.2.1 — älä poista rakentumattomia
```

---

## KRIITTINEN REGRESSIO (älä riko)

Jos pelaajalla **ON** H-H-mittaus arkistossa ja hän mitätöi sen **viimeisen** → `hh_*` täytyy **yhä poistua**. Domain on edustettu, koska dokki on olemassa vaikka mitätöity (`_vpMittausSuodataPoistetut` katsoo raakoja `testit`-avaimia, EI karsittua). → `hhEdustettu = true` → poisto etenee. **Testi 2 kattaa tämän.**

---

## ÄLÄ

- Koske primitiiviin (`tmRakennaPikakentatArkistosta`) tai `upd`-polkuun.
- Kytke Korjaa (E2.3).
- UI-muutos, cache-bump.

---

## DoD

1. **Repro-testi punainen → vihreä:** nykykoodilla (ilman suodatinta) primitiivin `poistetut` sisältää `hh_*` kun arkistossa ei ole H-H-mittausta; suodatin poistaa ne.
2. **Regressiotestit 1–4:**
   - **T1** (repro/ydin): TKI-only-arkisto + pelaajan `hh_*`/`d1_*` → suodatin suojaa `hh_*` (ei poistetuissa).
   - **T2** (kriittinen regressio): H-H-mittaus arkistossa (myös mitätöity) → sen viimeisen mitätöinti → `hh_*` **yhä** poistetuissa.
   - **T3**: TKI-only-arkisto, TKI-domain edustettu → `tki_*` poistuvat normaalisti (represented domain toimii).
   - **T4** (fail-safe): kartoittamaton kenttä → suojataan; tyhjä/`null` → `[]`.
3. Koko suite vihreä, eslint puhdas. Pieni PR. Kuvaus kuvaa juurisyyn.
4. **Live-verifiointi Topiaksella** (Claude): TKI-mittauksen Poista/Palauta EI enää poista H-H-kenttiä; data ennalleen.

---

## PÄÄTÖSKYSYMYS TEROLLE

Disabloidaanko **Poista/Palauta väliaikaisesti** kunnes E2.2.1 on livenä? Riski koskee jokaista pelaajaa jonka fyysinen data ei ole `testitulokset`issa (vaan tuli `recalcHH`-polusta suoraan pelaajadokumenttiin). Levinneisyyttä ei ole vielä mitattu — valinnainen levinneisyysskannaus (61 koko-dokin luku) kertoo onko kyse muutamasta vai kymmenistä.

---

## Sarjan tila

- **P-EDIT.0** · **E2.1** · **E2.2** — merged, livenä.
- **E2.2.1** — datahukka-fix · *tämä.*
- **E2.3** — Korjaa (Pikakirjaus-esitäyttö) · odottaa.
