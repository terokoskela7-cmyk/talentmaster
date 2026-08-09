# CODE BRIEF — E2.3 · Korjaa (yksittäisen mittauksen korjaus paikallaan)

**Tyyppi:** kirjoituspolku. **Kohde:** `TalentMaster_VP_v25.html`. **Oma pieni PR. Jatkoa E2.2/E2.2.1:lle** (merged, livenä).

> **Huom:** rekonstruoitu E2.3-kickoffista (Teron paste). Ristiriidassa kickoff voittaa.

**Design-totuus:** `docs/E2_design_kartta.html` §2B (Korjaa). Brändilukko, molemmat teemat.

**Rakentuu valmiin päälle:**
- `_vpMittausRebuildKirjoita(p)` — jaettu rebuild + kirjoitus, **E2.2.1-suojattu** (`_vpMittausSuodataPoistetut`). **Recompute vain tämän kautta.**
- `_vpMittausPaivitaNakyma(p)` — re-render. `_vpMittausCache[pid]`, `_vpMittausMerkinnat`, `_vpMittausKatTesti`, `_vpMittausArvo`, `_vpVoiMuokata`, `_uid`.

---

## KOHDE / TAVOITETILA

Aktiivirivin **Korjaa** alkaa toimia (E2.2 jätti no-opin). Klikkaus avaa kevyen brändätyn dialogin:
- mittauksen arvo **esitäytettynä**,
- **testipäivä lukittuna** (näkyvissä, ei muokattavissa),
- testin **nimi + yksikkö** näkyvillä.

Tallennus **ylikirjoittaa lähdedokin `testit[avain]` paikallaan** (`testitulokset/<dokkiId>`, `update` — **EI uutta pikakirjaus-dokkia**) + `korjattu`-audit, päivittää cachen, ja ajaa jaetun `_vpMittausRebuildKirjoita(p)` → `_vpMittausPaivitaNakyma`.

---

## KAKSI KOVAA INVARIANTTIA

1. **Kirjoita LÄHDEdokkiin, älä luo uutta riviä/dokkia.** `pelRef.collection('testitulokset').doc(dokkiId).update({ ['testit.'+avain]: uusiArvo, ['korjattu.'+avain]: {kuka,milloin} })`. Nested field-path korvaa arvon paikallaan.
2. **Recompute VAIN `_vpMittausRebuildKirjoita`n kautta.** EI `tmLaskePikakentat`ia eikä `TM_PIKAKIRJAUS`in tallennusta — muuten **E2.2.1-datahukkasuoja ohittuu**.

---

## ARVON MUODON SÄILYTYS

Säilytä alkuperäinen muoto:
- **objekti** (`{tulos}` / `{paras}`) → päivitä `tulos` (jos on) tai muuten `paras`, säilytä muut kentät.
- **skalaari** → korvaa suoraan uudella numerolla.
- **komposiitti** (objekti jolla `raaka` / `rangaistukset` / `ennenaikaiset`, esim. kuljetus_laukaus) → **read-only + "korjaa Pikakirjauksella" -vihje, EI tallennusta.**

```js
function _vpMittausOnkoKomposiitti(v) {
  return v != null && typeof v === 'object' &&
    (Object.prototype.hasOwnProperty.call(v, 'raaka') ||
     Object.prototype.hasOwnProperty.call(v, 'rangaistukset') ||
     Object.prototype.hasOwnProperty.call(v, 'ennenaikaiset'));
}
function _vpMittausKorjaaArvo(vanha, uusi) {   // uusi = numero
  if (_vpMittausOnkoKomposiitti(vanha)) return null;           // komposiitti → ei tallenneta
  if (vanha != null && typeof vanha === 'object') {
    var o = Object.assign({}, vanha);
    if (Object.prototype.hasOwnProperty.call(o, 'tulos')) o.tulos = uusi; else o.paras = uusi;
    return o;                                                  // objekti → säilytä muoto
  }
  return uusi;                                                 // skalaari → korvaa
}
```

---

## KÄSITTELIJÄ (runko)

```js
window._vpMittausKorjaa = async function (dokkiId, avain) {
  if (!_vpVoiMuokata()) return;
  var p = window._vpMittausPelaaja; if (!p || !dokkiId || !avain) return;
  var w = (_vpMittausCache[p.id] || []).find(function (x) { return x.__id === dokkiId; });
  if (!w) return;
  var vanha = (w.data.testit || {})[avain];
  var kat = _vpMittausKatTesti(avain) || {};
  var komposiitti = _vpMittausOnkoKomposiitti(vanha);
  var uusi = await _vpMittausKorjaaDialog({ nimi: kat.nimi || avain, yksikko: kat.yksikko || '', arvo: _vpMittausArvo(vanha), pvm: w.data.testauspvm || '', komposiitti: komposiitti });
  if (uusi == null) return;                                    // peruttu / komposiitti
  var uusiArvo = _vpMittausKorjaaArvo(vanha, uusi);
  if (uusiArvo == null) return;
  try {
    var pelRef = db.collection('seurat').doc(_seuraId).collection('pelaajat').doc(p.id);
    var cu = firebase.auth().currentUser; if (cu) { try { await cu.getIdToken(true); } catch (e) {} }
    var kentat = {};
    kentat['testit.' + avain] = uusiArvo;                      // INV1: lähdedokki paikallaan
    kentat['korjattu.' + avain] = { kuka: _uid || null, milloin: new Date().toISOString() };
    await pelRef.collection('testitulokset').doc(dokkiId).update(kentat);
    w.data.testit = w.data.testit || {}; w.data.testit[avain] = uusiArvo;
    w.data.korjattu = w.data.korjattu || {}; w.data.korjattu[avain] = kentat['korjattu.' + avain];
    await _vpMittausRebuildKirjoita(p);                        // INV2: recompute vain jaetun (E2.2.1-suojatun) kautta
    _vpMittausPaivitaNakyma(p);
    if (typeof toast === 'function') toast('Mittaus korjattu', 'ok');
  } catch (e) { console.warn('[mittaus korjaa]', e && e.message); if (typeof toast === 'function') toast('Korjaus epäonnistui', 'err'); }
};
```

**Dialogi** (`_vpMittausKorjaaDialog`): brändätty (design-tokenit, molemmat teemat), Promise<number|null>. Ei-komposiitti: number-input esitäytettynä + lukittu testipäivä + nimi/yksikkö + Peruuta/Tallenna. Komposiitti: read-only arvo + "Korjaa Pikakirjauksella" -vihje + vain Sulje (resolve null).

---

## ÄLÄ

- Luo uutta riviä/dokkia (INV1); käytä `tmLaskePikakentat`ia tai `TM_PIKAKIRJAUS`in tallennusta (INV2).
- **Uudelleenkäytä `TM_PIKAKIRJAUS`** (kickoff: EI tässä).
- Korjaa komposiittitestin (kuljetus_laukaus) tallennusta — deferoitu, read-only + vihje.
- Lib-muutos → ei cache-bumppia. Kirjoitus vain `_vpVoiMuokata()`.

---

## DoD

1. **Yksikkötesti arvomuodon säilytykselle** (`_vpMittausKorjaaArvo`): skalaari→korvaa, `{tulos}`→päivitä tulos, `{paras}`→päivitä paras, komposiitti→null. Node.
2. Koko suite vihreä, eslint puhdas. Pieni PR.
3. Molemmat teemat (dialogi). Design-tokenit.
4. **Live-verifiointi** Topias-testitietueeseen (korjaus paikallaan, ei uutta riviä; tasotiili + Kehityskaari päivittyvät; audit tallentuu; komposiitti read-only), data ennalleen.

---

## Sarjan tila

- **P-EDIT.0 · E2.1 · E2.2 · E2.2.1** — merged, livenä.
- **E2.3** — Korjaa · *tämä.*
- **E1** — Testit-hubin bulk-siivous · myöhempi.
