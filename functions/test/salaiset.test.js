'use strict';
/** Server-only integraatioavaimet: tasoAvain (salainen doc ensin, siirtymävara), syötteen tarkistus, asetaTaso (avain vain salaiseen dokumenttiin; seura-dokiin lippu + club_id; vanha kenttä pois), callable-oikeudet. */
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../salaiset');

const DEL = Symbol('del'), fv = { serverTimestamp: () => 'TS', delete: () => DEL };
function fakeDb(alku) {
  const store = new Map(Object.entries(alku || {})), kirj = [];
  const doc = (p) => ({ get: async () => ({ exists: store.has(p), data: () => store.get(p) }), set: async (d, o) => { kirj.push(['set', p]); store.set(p, Object.assign({}, o && o.merge ? store.get(p) : {}, d)); }, update: async (d) => { kirj.push(['update', p]); const c = Object.assign({}, store.get(p)); Object.keys(d).forEach((k) => { if (d[k] === DEL) delete c[k]; else c[k] = d[k]; }); store.set(p, c); }, collection: (c) => ({ doc: (id) => doc(p + '/' + c + '/' + id) }) });
  return { store, kirj, collection: (c) => ({ doc: (id) => doc(c + '/' + id) }) };
}
test('tasoAvain: salainen dokumentti voittaa; varalla vanha seura-dokin kenttä (siirtymä); ei kumpaakaan → null', async () => {
  const db = fakeDb({ 'seurat/a/salaiset/integraatiot': { taso_api_key: 'SERVER-KEY-1' } });
  assert.strictEqual(await S.tasoAvain(db, 'a', { taso_api_key: 'LEGACY-KEY-2' }), 'SERVER-KEY-1');
  assert.strictEqual(await S.tasoAvain(fakeDb(), 'b', { taso_api_key: 'LEGACY-KEY-2' }), 'LEGACY-KEY-2'); assert.strictEqual(await S.tasoAvain(fakeDb(), 'b', {}), null); assert.strictEqual(await S.tasoAvain(fakeDb(), 'b', null), null);
});
test('tarkistaSyote: avain 8–200 merkkiä ilman välilyöntejä; clubId [A-Za-z0-9_-] ≤ 40; tyhjä syöte hylätään; tyhjä avain = ennallaan', () => {
  assert.deepStrictEqual(S.tarkistaSyote({ apiKey: ' abcdefgh12 ', clubId: '1234' }), { apiKey: 'abcdefgh12', clubId: '1234' }); assert.deepStrictEqual(S.tarkistaSyote({ apiKey: '', clubId: '9' }), { clubId: '9' });
  for (const d of [{ apiKey: 'lyhyt' }, { apiKey: 'x'.repeat(201) }, { apiKey: 'on väli ja pitkä' }, { clubId: 'rikki id' }, { clubId: '' }, {}, null]) assert.ok(S.tarkistaSyote(d).virhe, JSON.stringify(d));
});
test('asetaTaso: avain VAIN salaiseen dokumenttiin; seura-dokiin lippu + club_id, vanha taso_api_key-kenttä poistetaan; pelkkä clubId ei koske avaimeen', async () => {
  const db = fakeDb({ 'seurat/a': { nimi: 'A', taso_api_key: 'VANHA-AVAIN-0' } });
  const r = await S.asetaTaso(db, fv, 'a', { apiKey: 'UUSI-AVAIN-123', clubId: '77' }); assert.deepStrictEqual(r, { avain_asetettu: true, club_id: '77' });
  assert.strictEqual(db.store.get('seurat/a/salaiset/integraatiot').taso_api_key, 'UUSI-AVAIN-123'); const s = db.store.get('seurat/a'); assert.deepStrictEqual([s.taso_avain_asetettu, s.taso_club_id, 'taso_api_key' in s, s.nimi], [true, '77', false, 'A']);
  await S.asetaTaso(db, fv, 'a', { clubId: '88' }); assert.strictEqual(db.store.get('seurat/a/salaiset/integraatiot').taso_api_key, 'UUSI-AVAIN-123'); assert.strictEqual(db.store.get('seurat/a').taso_club_id, '88');
  await assert.rejects(() => S.asetaTaso(db, fv, 'a', { apiKey: 'lyhyt' }), (e) => e.koodi === 'invalid-argument');
});
test('voiAsettaa: SA / VP / UTJ / seurasihteeri; valmentaja, talenttivalmentaja, tuntematon ei', () => { for (const r of ['superadmin', 'vp', 'urheilutoimenjohtaja', 'seurasihteeri']) assert.ok(S.voiAsettaa(r), r); for (const r of ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja', 'testivastaava', null, undefined]) assert.ok(!S.voiAsettaa(r), String(r)); });
test('SALAINEN_KENTTA: tunnistaa avainkentät (taso_api_key, *_secret, *_token …), ei tavallisia kenttiä', () => {
  for (const k of ['taso_api_key', 'foo_apikey', 'x_secret', 'myclub_token', 'a_password', 'api_key', 'private_api_key']) assert.ok(S.SALAINEN_KENTTA.test(k), k);
  for (const k of ['taso_club_id', 'nimi', 'vp_uid', 'taso_avain_asetettu', 'tokenizer', 'kieli']) assert.ok(!S.SALAINEN_KENTTA.test(k), k);
});
/* callable: oikeudet + vastaus ei sisällä avainta */
function kutsu(rooli, data, auth = { uid: 'u1', token: {} }) {
  const db = fakeDb({ 'seurat/a': { nimi: 'A' } }), HttpsError = class extends Error { constructor(c, m) { super(m); this.code = c; } };
  let kasittelija; const functions = { region: () => ({ https: { onCall: (f) => { kasittelija = f; return f; } } }), https: { HttpsError } }, admin = { firestore: { FieldValue: fv } };
  S.luo({ functions, db, admin, tarkistaOikeus: async () => (rooli ? { sallittu: true, rooli } : { sallittu: false, rooli: null }) }); return { db, aja: () => kasittelija(data, { auth }) };
}
test('callable asetaTasoAsetukset: johto saa; valmentaja/ei oikeutta/kirjautumaton/virheellinen id ei; vastaus ei sisällä avainta eikä virheissä', async () => {
  const k = kutsu('vp', { seuraId: 'a', apiKey: 'SALAINEN-ABC-999', clubId: '5' }); const r = await k.aja(); assert.deepStrictEqual(r, { ok: true, avain_asetettu: true, club_id: '5' }); assert.ok(!JSON.stringify(r).includes('SALAINEN')); assert.strictEqual(k.db.store.get('seurat/a/salaiset/integraatiot').taso_api_key, 'SALAINEN-ABC-999');
  await assert.rejects(() => kutsu('valmentaja', { seuraId: 'a', apiKey: 'SALAINEN-ABC-999' }).aja(), (e) => e.code === 'permission-denied' && !e.message.includes('SALAINEN'));
  await assert.rejects(() => kutsu(null, { seuraId: 'a', apiKey: 'SALAINEN-ABC-999' }).aja(), (e) => e.code === 'permission-denied');
  await assert.rejects(() => kutsu('vp', { seuraId: 'a', apiKey: 'SALAINEN-ABC-999' }, null).aja(), (e) => e.code === 'unauthenticated'); await assert.rejects(() => kutsu('vp', { seuraId: 'a/b', apiKey: 'SALAINEN-ABC-999' }).aja(), (e) => e.code === 'invalid-argument');
  await assert.rejects(() => kutsu('vp', { seuraId: 'a', apiKey: 'lyhyt' }).aja(), (e) => e.code === 'invalid-argument' && !e.message.includes('lyhyt'));
});
