# Claude Code -komento: ADAR V0 — paivitaAdarPikakentat → saveCard()

> Käytä tätä komentoa Claude Code -sessiolle suoraan.
> Perustuu: docs/ADAR_JATKOKEHITYS_ANALYYSI.md §V0 + ADAR_JATKOKEHITYS_ANALYYSI §4

---

## TEHTÄVÄ

Lisää `paivitaAdarPikakentat`-logiikka `TalentMaster_ADAR_Pikakortti.html`:n
`saveCard(level)`-funktioon.

**TIEDOSTON RAKENNE (§15-invariantti):**
`TalentMaster_ADAR_Pikakortti.html` on bundler-tiedosto. Päälogiikka on
`__bundler/template`-skriptissä JSON-enkoodattuna (kenoviivat, unicode-escape).
Käytä raw JSON-string indeksihaun tapaa:
```python
idx = template_raw.find("etsittava_merkkijono")
template_raw = template_raw[:start] + uusi + template_raw[end:]
```
**EI koskaan** `json.loads()` + `json.dumps()` (double-encoding korruptoi tiedoston).

---

## IMPLEMENTAATIO

### Vaihe 1 — Etsi insertointikohta

Etsi `saveCard`-funktiosta kohta jossa `.add(havaintoData)` onnistuu.
Tyypillisesti näyttää tältä (exact string bundlerissa — tarkista grep:llä):
```
btn.textContent = 'Tallennettu ✓';
```
tai vastaava onnistumis-feedback. Uusi koodi lisätään **sen jälkeen** (ennen
`catch`-blokin alkua tai funktion loppua).

### Vaihe 2 — Lisättävä koodi (KANONINEN — älä muuta logiikkaa)

Lisää saveCard():n loppuun seuraava koodi. Se on **identtinen** `Master_v16`:n
`paivitaAdarPikakentat`-helperin kanssa + inlinattu `_luotuToMs`.

```javascript
// ── ADAR-pikakentät pelaajadokumenttiin (§26, kanoninen) ──────────────────
// Ei tarvitse komposiitti-indeksiä: .get() kaikki havainnot, sort clientissa.
// _luotuToMs: tyyppiturvallinen sekä Timestamp- että ISO-string-arvoille (A5).
try {
  var _luotuToMs = function(v) {
    if (!v) return 0;
    if (v.toDate) return v.toDate().getTime();
    var t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
  };
  var adarSnap = await window._tmDB
    .collection('seurat').doc(seuraId)
    .collection('pelaajat').doc(pelaajaId)
    .collection('havainnot').get();
  var adarHavainnot = adarSnap.docs.map(function(d) { return d.data(); })
    .filter(function(h) { return h && h.pisteet; })
    .sort(function(a, b) { return _luotuToMs(b.luotu) - _luotuToMs(a.luotu); });
  if (adarHavainnot.length) {
    var viim10 = adarHavainnot.slice(0, 10);
    // KANONINEN: vahvin/heikoin = 'assess'/'decide'/'act'/'reassess'
    // (frontend kääntää suomeksi; pisteet-objektin avaimet ovat 'A'/'D'/'Act'/'R')
    var KENTAT = { assess: 'A', decide: 'D', act: 'Act', reassess: 'R' };
    var summat = { assess: 0, decide: 0, act: 0, reassess: 0 };
    var lkmt   = { assess: 0, decide: 0, act: 0, reassess: 0 };
    var dim = function(h, avain) {
      var p = h.pisteet || {};
      return (p[avain] != null && !isNaN(p[avain])) ? p[avain] : null;
    };
    viim10.forEach(function(h) {
      Object.keys(KENTAT).forEach(function(nimi) {
        var v = dim(h, KENTAT[nimi]);
        if (v != null) { summat[nimi] += v; lkmt[nimi]++; }
      });
    });
    var vahvin = null, heikoin = null, maxV = -Infinity, minV = Infinity;
    Object.keys(KENTAT).forEach(function(nimi) {
      if (!lkmt[nimi]) return;
      var ka = summat[nimi] / lkmt[nimi];
      if (ka > maxV) { maxV = ka; vahvin = nimi; }
      if (ka < minV) { minV = ka; heikoin = nimi; }
    });
    var v0 = viim10[0];
    var aA = dim(v0, 'A'), aD = dim(v0, 'D'), aAc = dim(v0, 'Act'), aR = dim(v0, 'R');
    var dims4 = [aA, aD, aAc, aR].filter(function(x) { return x != null; });
    var yht = dims4.length
      ? Math.round((dims4.reduce(function(s,x){return s+x;},0) / dims4.length) * 10) / 10
      : null;
    // adar_pvm ISO-stringinä — VP lukee new Date(p.adar_pvm), Timestamp rikkoisi sen
    var v0pvm = v0.luotu ? new Date(_luotuToMs(v0.luotu)).toISOString() : null;
    await window._tmDB
      .collection('seurat').doc(seuraId)
      .collection('pelaajat').doc(pelaajaId)
      .set({
        adar_viimeisin: { a: aA, d: aD, ac: aAc, r: aR, yht: yht, pvm: v0pvm },
        adar_pvm:       v0pvm,
        adar_havaintoja: adarHavainnot.length,
        adar_vahvin:    vahvin,
        adar_heikoin:   heikoin
      }, { merge: true });
  }
} catch(adarE) { console.warn('[adar-pikakentat]', adarE.message); }
// ── /ADAR-pikakentät ───────────────────────────────────────────────────────
```

### Vaihe 3 — Bundler-escape

Kun lisäät koodin JSON-enkoodattuun template-stringiin, escapeta:
- `"` → `\"`
- `\n` → `\\n` (tai käytä raw-splice ilman JSON-deserialisointia)
- Template literals (`\``) → muunna string concatenationiksi `+` (§7.1)
- **Yllä olevassa koodissa ei ole template literaleja** — kaikki on `function`-syntaksia ja `+`.
  Arrow functions (`=>`) ovat OK ES6-ympäristössä (Chrome/mobile).

### Vaihe 4 — Tarkista myös _pikaTallenna()

`_pikaTallenna()` kirjoittaa `tila:'luonnos'` (§15 pikatila).
**EI tarvitse pikakenttiä** — luonnos ei ole valmis havainto, pelaaja ei voi lukea sitä.
Älä lisää koodia sinne.

---

## INVARIANTIT (tarkista ennen commitia)

1. `seuraId` ja `pelaajaId` ovat scopessa saveCard():n lopussa ✅ (verifioitu)
2. `window._tmDB` on alustettu Firebase-instanssissa ✅
3. Koko blokki on `try/catch` → pikakentät ovat **best-effort**, EI estä havinnon tallennusta
4. `.set({...}, {merge:true})` — ei korvaa muita pelaajadokumentin kenttiä
5. Ei `firebase.functions()` -kutsuja (§7.4)
6. Ei `serverTimestamp()` arrayn sisällä (§7.6) — `v0pvm` on ISO-string ✅
7. Nested template literals → string concatenation (§7.1) — koodissa ei template literaleja ✅

---

## TESTAUSOHJE

1. Kirjaudu super-adminina (talentmasterid@gmail.com, Google Sign-In)
2. Avaa `TalentMaster_ADAR_Pikakortti.html?v=N+1`
3. Tee testihavainto: valitse seura=kpv → pelaaja Topias Koskela (tunniste 12345678) → pisteet kaikille
4. Tallenna (Taso 2 tai 3 — Taso 1 voi jättää osan pisteistä null)
5. Tarkista Firestoresta: `seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I` →
   - `adar_viimeisin.a/d/ac/r/yht/pvm` täyttynyt
   - `adar_pvm` on ISO-string (ei Timestamp-objekti)
   - `adar_vahvin` on jokin näistä: 'assess'/'decide'/'act'/'reassess'
6. Avaa `TalentMaster_VP_v25.html?seura=kpv` → KPV joukkuepulssin ADAR-sarake ei ole enää tyhjä

---

## ÄLÄ MUUTA

- saveCard():n varsinaista havaintologiikkaa tai Firestore-havaintopolkua
- `_pikaTallenna()`:a (pikatila, kirjoittaa luonnoksen)
- ADAR Vision -kuvan latauslogiikkaa (`_lataaKuvaStorageen`)
- Bundler-rakennetta (manifest, ext_resources, template -jako §15)
- Tiedoston versiotunnistetta ennen testausta (`?v=` URL:ssa)
