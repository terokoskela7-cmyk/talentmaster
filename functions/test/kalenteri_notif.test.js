'use strict';
/**
 * V2 P0.4 PR 2 — kalenteri-ilmoitukset: kiinteät dokumenttitunnisteet (idempotenssi), tapahtuma_alkaa, päättymisvartija.
 * Puhdas moduuli (kalenteri_notif.js) + fake-kokoelma, joka toteuttaa create/set(merge)/delete-tokenin Firestore-semantiikalla.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { notifDocId, muistutusPaatos, muutosPaatos, kirjoitaNotif } = require('../kalenteri_notif');

const ts = (iso) => { const d = new Date(iso); return { toDate: () => d, toMillis: () => d.getTime() }; };
const DELETE = Symbol('delete');
function fakeCol() {
  const store = new Map(); let t = 0;
  const col = {
    store,
    doc: (id) => ({
      create: async (data) => { if (store.has(id)) { const e = new Error('6 ALREADY_EXISTS'); e.code = 6; throw e; } store.set(id, Object.assign({}, data)); },
      set: async (data, opts) => {
        if (!(opts && opts.merge) && Object.values(data).includes(DELETE)) throw new Error('FieldValue.delete() vaatii merge:true (kuten oikea Firestore)');
        const cur = (opts && opts.merge && store.get(id)) || {};
        const next = Object.assign({}, cur);
        Object.keys(data).forEach((k) => { if (data[k] === DELETE) delete next[k]; else next[k] = data[k]; });
        store.set(id, next);
      },
    }),
  };
  col.fv = { serverTimestamp: () => ({ __ts: ++t }), delete: () => DELETE };
  return col;
}
const ALKU1 = ts('2026-10-05T15:00:00Z'); // 18:00 EEST
const ALKU2 = ts('2026-10-05T16:00:00Z');

test('dokumenttitunniste: tyyppi_evId', () => {
  assert.strictEqual(notifDocId('muistutus', 'e1'), 'muistutus_e1');
  assert.strictEqual(notifDocId('muutos', 'e1'), 'muutos_e1');
  assert.strictEqual(notifDocId('peruttu', 'e1'), 'peruttu_e1');
});

test('muistutus: kaksi peräkkäistä ajoa → YKSI dokumentti; toinen ajo ei nollaa luettua', async () => {
  const c = fakeCol(); const p = muistutusPaatos({ nimi: 'Harjoitus', alkaa: ALKU1, paikka: 'Kenttä' });
  assert.strictEqual(await kirjoitaNotif(c, p, 'e1', c.fv), true);
  c.store.get('muistutus_e1').luettu = true;   // pelaaja kuittasi
  assert.strictEqual(await kirjoitaNotif(c, p, 'e1', c.fv), false);
  assert.strictEqual(c.store.size, 1);
  assert.strictEqual(c.store.get('muistutus_e1').luettu, true);
  assert.strictEqual(c.store.get('muistutus_e1').teksti, 'Huomenna: Harjoitus klo 18:00 · Kenttä');
});

test('uusi dokumentti kantaa tapahtuma_alkaa + linkin + dedupe-id:n; teksti taaksepäin yhteensopiva', async () => {
  const c = fakeCol();
  await kirjoitaNotif(c, muistutusPaatos({ nimi: 'Peli', alkaa: ALKU1 }), 'e7', c.fv);
  const d = c.store.get('muistutus_e7');
  assert.strictEqual(d.tapahtuma_alkaa, ALKU1); assert.strictEqual(d.linkki, 'kalenteri:e7');
  assert.strictEqual(d.dedupe, 'muistutus_e7'); assert.strictEqual(d.luettu, false); assert.strictEqual(d.tyyppi, 'muistutus');
  assert.match(d.teksti, /^Huomenna: Peli klo 18:00$/);
});

test('muutos: toinen muutos PÄIVITTÄÄ saman dokumentin (teksti, aika, tapahtuma_alkaa), luettu:false, luettu_pvm pois — ei uutta riviä', async () => {
  const c = fakeCol();
  const e1 = { nimi: 'Harjoitus', alkaa: ALKU1, paikka: 'A' };
  const e2 = { nimi: 'Harjoitus', alkaa: ALKU2, paikka: 'A' };
  const nyt = new Date('2026-10-05T08:00:00Z');
  const p1 = muutosPaatos({ nimi: 'Harjoitus', alkaa: ts('2026-10-05T14:00:00Z'), paikka: 'A' }, e1, nyt);
  await kirjoitaNotif(c, p1, 'e1', c.fv);
  const luotu1 = c.store.get('muutos_e1').luotu;
  Object.assign(c.store.get('muutos_e1'), { luettu: true, luettu_pvm: '2026-10-05T09:00:00Z' });   // pelaaja luki
  await kirjoitaNotif(c, muutosPaatos(e1, e2, nyt), 'e1', c.fv);
  assert.strictEqual(c.store.size, 1);
  const d = c.store.get('muutos_e1');
  assert.strictEqual(d.teksti, 'Muutos: Harjoitus → klo 19:00'); assert.strictEqual(d.tapahtuma_alkaa, ALKU2);
  assert.strictEqual(d.luettu, false); assert.strictEqual('luettu_pvm' in d, false);
  assert.notDeepStrictEqual(d.luotu, luotu1);   // aika päivittyi (järjestys luotu desc)
});

test('viisi peräkkäistä muokkausta → edelleen yksi muutos-dokumentti; muistutus/muutos/peruttu ovat eri dokumentteja', async () => {
  const c = fakeCol(); const nyt = new Date('2026-10-05T08:00:00Z');
  for (let i = 0; i < 5; i++) {
    const a = ts('2026-10-05T' + String(12 + i).padStart(2, '0') + ':00:00Z'), b = ts('2026-10-05T' + String(13 + i).padStart(2, '0') + ':00:00Z');
    await kirjoitaNotif(c, muutosPaatos({ nimi: 'X', alkaa: a }, { nimi: 'X', alkaa: b }, nyt), 'e1', c.fv);
  }
  assert.strictEqual(c.store.size, 1);
  await kirjoitaNotif(c, muistutusPaatos({ nimi: 'X', alkaa: ALKU1 }), 'e1', c.fv);
  await kirjoitaNotif(c, muutosPaatos({ nimi: 'X' }, { nimi: 'X', poistettu: true, alkaa: ALKU1 }, nyt), 'e1', c.fv);
  assert.deepStrictEqual([...c.store.keys()].sort(), ['muistutus_e1', 'muutos_e1', 'peruttu_e1']);
});

test('peruttu: ilmoitus + tapahtuma_alkaa; toistuva peruutus päivittää samaa riviä', async () => {
  const c = fakeCol(); const nyt = new Date('2026-10-05T08:00:00Z');
  const p = muutosPaatos({ nimi: 'Peli', alkaa: ALKU1 }, { nimi: 'Peli', alkaa: ALKU1, poistettu: true }, nyt);
  assert.deepStrictEqual([p.tyyppi, p.teksti, p.alkaa], ['peruttu', 'Peruttu: Peli', ALKU1]);
  await kirjoitaNotif(c, p, 'e1', c.fv); await kirjoitaNotif(c, p, 'e1', c.fv);
  assert.strictEqual(c.store.size, 1); assert.strictEqual(c.store.get('peruttu_e1').tapahtuma_alkaa, ALKU1);
});

test('vartija vertaa PÄÄTTYMISEEN: tämän päivän koko päivän tapahtuma → ilmoitus; kesken oleva → ilmoitus; päättynyt → ei', () => {
  const nyt = new Date('2026-10-05T10:00:00Z');   // 13:00 EEST 5.10.
  const kokoPaiva = (paikka) => ({ nimi: 'Leiri', koko_paiva: true, alkaa: ts('2026-10-04T21:00:00Z'), paikka });   // 5.10. 00:00 EEST (alkaa < nyt)
  const p = muutosPaatos(kokoPaiva('A'), kokoPaiva('B'), nyt);
  assert.ok(p, 'tämän päivän koko päivän tapahtuma ilmoitetaan (ennen: alkaa < now → ei)');
  assert.strictEqual(p.teksti, 'Muutos: Leiri · B');   // ei "klo 00:00"
  const kesken = (paikka) => ({ nimi: 'Harjoitus', alkaa: ts('2026-10-05T09:00:00Z'), paattyy: ts('2026-10-05T11:00:00Z'), paikka });   // 12:00–14:00 EEST, nyt 13:00
  assert.ok(muutosPaatos(kesken('A'), kesken('B'), nyt));
  const mennyt = (paikka) => ({ nimi: 'Harjoitus', alkaa: ts('2026-10-05T05:00:00Z'), paattyy: ts('2026-10-05T07:00:00Z'), paikka });   // päättyi 10:00 EEST
  assert.strictEqual(muutosPaatos(mennyt('A'), mennyt('B'), nyt), null);
  const eilen = (paikka) => ({ nimi: 'Leiri', koko_paiva: true, alkaa: ts('2026-10-03T21:00:00Z'), paikka });   // 4.10. koko päivä, nyt 5.10.
  assert.strictEqual(muutosPaatos(eilen('A'), eilen('B'), nyt), null);
});

test('ei ilmoitettavaa: vain muistiinpano muuttui; muistutus koko päivän tapahtumalle ilman "klo 00:00"', () => {
  const nyt = new Date('2026-10-05T08:00:00Z');
  assert.strictEqual(muutosPaatos({ nimi: 'X', alkaa: ALKU1, muistiinpano: 'a' }, { nimi: 'X', alkaa: ALKU1, muistiinpano: 'b' }, nyt), null);
  assert.strictEqual(muistutusPaatos({ nimi: 'Leiri', koko_paiva: true, alkaa: ts('2026-10-05T21:00:00Z'), paikka: 'Vuokatti' }).teksti, 'Huomenna: Leiri · Vuokatti');
});

test('päivitys ei välitä aikaleimasta: set-payload on additiivinen — vanhat kentät (teksti, linkki, tyyppi) säilyvät ennallaan', async () => {
  const c = fakeCol(); const nyt = new Date('2026-10-05T08:00:00Z');
  await kirjoitaNotif(c, muutosPaatos({ nimi: 'X', alkaa: ts('2026-10-05T12:00:00Z') }, { nimi: 'X', alkaa: ALKU1 }, nyt), 'e1', c.fv);
  const d = c.store.get('muutos_e1');
  ['tyyppi', 'teksti', 'linkki', 'luotu', 'luettu'].forEach((k) => assert.ok(k in d, k));
});
