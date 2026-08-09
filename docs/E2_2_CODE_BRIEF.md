# CODE BRIEF — E2.2 · Poista + Palauta (pehmeä mitätöinti → rebuild-kirjoitus)

**Tyyppi:** kirjoituspolku (ensimmäinen E2:ssa). **Kohde:** `TalentMaster_VP_v25.html`. **Oma PR. Jatkoa E2.1:lle** (`feat/e2-1-mittauslista`, merged PR #294 — mittauslista + `_vpMittausCache` + no-op-napit jo livenä).

**Design-totuus:**
- `docs/E2_design_kartta.html` §2A (Poista → varmistus), §2C (Palauta), §3 (yhteinen virta). Brändilukko, molemmat teemat.
- `docs/E2_CODE_BRIEF.md` §E2.2 — tämä brief syventää sen itsenäisesti.

**Periaate:** mitään ei pakoteta. Poisto on **pehmeä, peruttava, auditoitu**. Varmistus ennen poistoa. **Ei kovaa poistoa** — `testit`-avainta tai dokkia ei poisteta koskaan.

**Rakentuu valmiin päälle:**
- `tmRakennaPikakentatArkistosta(pelaajaDoc, merkinnat, optDeps)` → `{ upd, poistetut }` (`lib/tm_pikakentat.js`, P-EDIT.0, livenä). **Älä muuta primitiiviä eikä §26-laskentaa.**
- E2.1: `_vpMittausCache[pid]` = `[{ __id, data }]`, `_vpMittausMerkinnat(p)` (näyttörivit), `_vpRenderMittausLista(p)`, `_vpVoiMuokata()`, `_vpMittausKatTesti(avain)`.

---

## KOHDE / TAVOITETILA

Mittaus-välilehden **Poista** ja **Palauta** alkavat toimia. Poista mitätöi yksittäisen mittauksen **pehmeästi** (lähdedokin `mitatoidut`-map), ajaa rebuild-primitiivin ja kirjoittaa pikakentät + Kehityskaaren uudelleen — arvo **regressoi edelliseen tai häviää**. Palauta poistaa mitätöinnin ja ajaa saman rebuildin takaisin. **Korjaa jää no-opiksi (E2.3).**

Muist": rivi = pari **(dokkiId, testiavain)**. Poisto koskee vain yhtä avainta; saman dokin muut testit säilyvät.

---

## LÄPILEIKKAAVAT PERIAATTEET

1. **Uudelleenkäytä.** Laskenta = primitiivi. Kirjoituskuvio = sama kuin `lib/tm_pikakirjaus.js`/`_vpPikakirjaus` (`pelRef.set(merge)` + `pelRef.update`). `FieldValue.delete()`-kuvio on jo VP_v25:ssä (~rivi 6981). Ei uutta laskentaa.
2. **Yksi kirjoitusprimitiivi kummallekin.** Poista ja Palauta eroavat vain lähde-mutaatiossa (`mitatoidut`-avaimen lisäys vs. poisto); sen jälkeen **identtinen** rebuild + kirjoitus + re-render. Tee jaettu `_vpMittausRebuildKirjoita(p)`.
3. **Pehmeä + auditoitu.** Mitätöinti tallentaa `{ kuka, milloin, syy? }`. Palautettavissa aina.
4. **Ei datahukkaa.** Rebuild palauttaa `poistetut`-listan → ne **on** poistettava `FieldValue.delete()`:llä, muuten haamuarvo jää.

---

## VAIHE E2.2 — työ (oma PR)

### 1. Rebuild-syötteen rakentaja (PUHDAS, testattava)

Erillinen funktio joka muuntaa cache-dokit **primitiivin** odottamaan muotoon `[{ pvm, tulokset, mitatoitu? }]` — **karsien mitätöidyt avaimet** `tulokset`ista:

```js
// PUHDAS: ei DOMia, ei Firestorea → yksikkötestattava (Node). Vie dual-export tai altista window'iin.
function _vpMittausRebuildMerkinnat(cacheDocs) {
  return (cacheDocs || []).map(function (w) {
    var d = w.data || {}, testit = d.testit || {}, mit = d.mitatoidut || {};
    var tulokset = {};
    Object.keys(testit).forEach(function (k) { if (!mit[k]) tulokset[k] = testit[k]; });  // karsi mitätöidyt
    return { pvm: d.testauspvm || '', tulokset: tulokset };   // täysin mitätöity dokki → tulokset:{}
  });
}
```

- `tulokset` on **raaka `testit`-objekti** (avaimet kuten `lin_30m`, `hyppy_cj`) — täsmälleen se muoto jonka primitiivi/`tmLaskePikakentat` ottaa. Älä muunna avaimia katalogimuotoon tässä (primitiivi tuntee raaka-avaimet).
- Tyhjä `tulokset` ei kontribuoi mitään — primitiivi hoitaa regression.

### 2. Jaettu rebuild + kirjoitus (Poista JA Palauta käyttävät)

```js
async function _vpMittausRebuildKirjoita(p) {
  var pelRef = db.collection('seurat').doc(_seuraId).collection('pelaajat').doc(p.id);
  var merkinnat = _vpMittausRebuildMerkinnat(_vpMittausCache[p.id]);
  var res = tmRakennaPikakentatArkistosta(p, merkinnat);           // { upd, poistetut }
  // 1) pikakentät korvaten
  if (res.upd && Object.keys(res.upd).length) await pelRef.set(res.upd, { merge: true });
  // 2) poistettavat kentät oikeasti pois (merge ei poista)
  if (res.poistetut && res.poistetut.length) {
    var del = {}; res.poistetut.forEach(function (f) { del[f] = firebase.firestore.FieldValue.delete(); });
    await pelRef.update(del);
  }
  // 3) päivitä in-memory p samoin → UI regressoi ilman uutta hakua
  if (res.upd) Object.assign(p, res.upd);
  if (res.poistetut) res.poistetut.forEach(function (f) { try { delete p[f]; } catch (e) {} });
  return res;
}
```

- **Kirjoituskohde on pelaajadokki** (pikakentät elävät siellä; sama kuin `_vpPikakirjaus`in `pelRef.update(upd)`). `testitulokset`-dokkiin kirjoitetaan vain `mitatoidut` (kohta 3/4).
- `p` on nykyinen avattu pelaaja — tallenna se renderöinnissä globaaliin (esim. `window._vpMittausPelaaja = p` `_vpRenderMittausLista`ssa), jotta nappikäsittelijät saavat sen.

### 3. Poista-käsittelijä

```js
window._vpMittausPoista = async function (dokkiId, avain) {
  if (!_vpVoiMuokata()) return;
  var p = window._vpMittausPelaaja; if (!p) return;
  // varmistus (design §2A) — käytä olemassa olevaa vahvistusmodaalia jos sellainen on; muuten minimaalinen brändätty dialogi.
  var ok = await _vpVahvista({ otsikko: 'Poistetaanko mittaus?', teksti: '… piilotetaan ja mittaristo lasketaan uudelleen. Voit palauttaa sen myöhemmin.', vahvista: 'Poista', tyyli: 'danger' });
  if (!ok) return;
  // 1) pehmeä mitätöinti lähdedokkiin (per avain) + päivitä cache paikallisesti
  var pelRef = db.collection('seurat').doc(_seuraId).collection('pelaajat').doc(p.id);
  var meta = { kuka: _uid, milloin: new Date().toISOString() };   // syy valinnainen (myöhempi)
  await pelRef.collection('testitulokset').doc(dokkiId).set({ mitatoidut: { [avain]: meta } }, { merge: true });
  var w = (_vpMittausCache[p.id] || []).find(function (x) { return x.__id === dokkiId; });
  if (w) { w.data.mitatoidut = w.data.mitatoidut || {}; w.data.mitatoidut[avain] = meta; }
  // 2) rebuild + kirjoitus + 3) re-render
  await _vpMittausRebuildKirjoita(p);
  _vpMittausPaivitaNakyma(p);
  if (typeof toast === 'function') toast('Mittaus poistettu', 'ok');
};
```

### 4. Palauta-käsittelijä

```js
window._vpMittausPalauta = async function (dokkiId, avain) {
  if (!_vpVoiMuokata()) return;
  var p = window._vpMittausPelaaja; if (!p) return;
  var ok = await _vpVahvista({ otsikko: 'Palautetaanko mittaus?', teksti: '… palautetaan listaan ja mittaristo lasketaan uudelleen.', vahvista: 'Palauta' });
  if (!ok) return;
  var pelRef = db.collection('seurat').doc(_seuraId).collection('pelaajat').doc(p.id);
  await pelRef.collection('testitulokset').doc(dokkiId).update({ ['mitatoidut.' + avain]: firebase.firestore.FieldValue.delete() });
  var w = (_vpMittausCache[p.id] || []).find(function (x) { return x.__id === dokkiId; });
  if (w && w.data.mitatoidut) { delete w.data.mitatoidut[avain]; }
  await _vpMittausRebuildKirjoita(p);
  _vpMittausPaivitaNakyma(p);
  if (typeof toast === 'function') toast('Mittaus palautettu', 'ok');
};
```

### 5. Näytön päivitys rebuildin jälkeen

```js
function _vpMittausPaivitaNakyma(p) {
  if (typeof _vpRenderMittausLista === 'function') _vpRenderMittausLista(p);   // lista + Mitätöidyt-osa
  // Yhteenveto-tiilet ("Fyysinen · mitattu") ja Kehityskaari lasketaan pelaajan pikakentistä →
  // päivitä ne p:n (juuri päivitetyistä) pikakentistä olemassa olevilla renderöijillä.
}
```

- **Selvitä koodista** miten ylälaidan tasotiilet (`_mSub('Fyysinen · mitattu')` + `f1`/`f2`) ja **Kehityskaari** rakennetaan, ja kutsu samat rakentajat uudelleen `p`:n päivitetyistä pikakentistä. Jos in-place-päivitys on kohtuuttoman kietoutunut, hyväksyttävä v1-fallback: **re-render koko Mittaus-välilehden sisältö** (`_jspTab1`) — mutta **säilytä käyttäjän paikka Mittaus-välilehdellä** (älä hyppää Aloitukseen). Kirjaa PR-kuvaukseen kumman valitsit.

### 6. Langoita napit (E2.1:n napit eivät kanna rivi-identiteettiä)

E2.1:ssä `_vpMittausRiviHTML` renderöi `onclick="_vpMittausTulossa('poista')"` **ilman** `dokkiId`/`avain`ia. Muuta rivin napit välittämään identiteetti (esc'attuna):

- Aktiivirivi: `Poista` → `_vpMittausPoista('<dokkiId>','<avain>')`. `Korjaa` → **jää** `_vpMittausTulossa('korjaa')` (E2.3).
- Mitätöity rivi: `Palauta` → `_vpMittausPalauta('<dokkiId>','<avain>')`.
- `_vpMittausRiviHTML` tarvitsee siis rividatasta `dokkiId` + `avain` (ne ovat jo `r`:ssä). Escaping: `_esc`.

**ÄLÄ:** kytke Korjaa (E2.3); poista `testit`-avainta tai dokkia (kova poisto); muuta primitiiviä tai §26-logiikkaa; lisää toista `testitulokset`-hakua (cachea päivitetään paikallisesti).

**Hyväksymiskriteeri (L3, elävä, sanktioitu testitietue):**
1. Poista viimeisin mittaus → tasotiili + Kehityskaari **regressoivat edelliseen**; audit (kuka/milloin) tallentuu; rivi siirtyy Mitätöidyt-osaan.
2. Poista pelaajan **ainoa** kyseisen mittarin tulos → kenttä **häviää** (ei jää vanhaa arvoa) — `poistetut`/`FieldValue.delete()` toimii.
3. Saman dokin toinen testi **ei muutu** kun yksi poistetaan.
4. Palauta → arvo palaa, tilat **identtiset** poistoa edeltävään.
5. `_vpVoiMuokata()===false` → ei Poista/Palauta-nappeja.

---

## REUNAEHDOT (non-negotiable)

- **Suojatut alaikäiset read-only:** live-testaus **vain sanktioituun testitietueeseen** — älä kirjoita oikean alaikäisen tietueeseen. Palauta testitietue ennalleen testin jälkeen (kaappaa alkuperäinen ensin; `FieldValue.delete()` nested-kentälle).
- **Oikeudet:** kirjoitus vain kun `_vpVoiMuokata()` (VP/johto/SA). Oman joukkueen valmentaja -kiristys tulee Master-porttauksessa — **kirjaa TODO**, älä avaa kirjoitusta laajemmalle tässä.
- **GDPR:** `mitatoidut`-map sisältää vain `uid` + aikaleima (+ valinnainen lyhyt syy) — **ei terveys- eikä vapaatekstiä muualle.**
- **Ei kovaa poistoa.** Vain `mitatoidut`-map.
- **Ei cache-bumppia:** vain `TalentMaster_VP_v25.html` muuttuu (ei jaettua libiä) → `?v=N` ennallaan. CI hoitaa version-bumpin.
- **Brändi:** design-tokenit, molemmat teemat, ei kovakoodattuja värejä.

## DoD

1. Renderöityy **molemmissa teemoissa** (screenshotit) — myös varmistusdialogi.
2. Ei datahukkaa; primitiivi + olemassa olevat kirjoituskuviot uudelleenkäytetään.
3. **Yksikkötesti** `_vpMittausRebuildMerkinnat`ille (karsii mitätöidyt; tyhjä tulokset; sekamuoto-avaimet säilyvät raakana) — Node, `tm_pikakentat.test.js`-tyyliin. Koko suite vihreä, eslint puhdas.
4. Pieni, stackattu PR; kuvaus linkkaa `docs/E2_2_CODE_BRIEF.md` + design-kartan; kertoo re-render-valinnan (in-place vs koko välilehti).
5. **Verifioi live** sanktioidulla testitietueella (regressio + palautus), palauta testidata ennalleen. Claude verifioi ennen mergeä.

---

## Sarjan tila

- **P-EDIT.0** — rebuild-primitiivi · merged, livenä.
- **E2.1** — Mittauslista (luku/render) · **merged (#294), live-verifioitu.**
- **E2.2** — Poista + Palauta · *tämä.*
- **E2.3** — Korjaa (Pikakirjaus-esitäyttö) · odottaa E2.2:ta.
- **E1** — Testit-hubin bulk-siivous · myöhempi.
