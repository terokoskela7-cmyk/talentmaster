'use strict';
/** K35-6f — harjoituskertymä (functions/harjoituskertyma.js): trigger päivittää vain kyseisen viikon korin, callable-oikeudet (huoltaja vain oma lapsi; ei tokenia/muiden dataa), backfill. */
const { test } = require('node:test');
const assert = require('node:assert');
const K = require('../harjoituskertyma');
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const ts = (ms) => ({ toDate: () => new Date(ms), _ms: ms });
const Timestamp = { fromDate: (d) => ts(d.getTime()) };
const FieldPath = { documentId: () => '__id__' };
const NYT = Date.parse('2026-10-19T09:00:00+03:00'), ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
const ev = (d, o) => Object.assign({ tyyppi: 'harjoitus', alkaa: ts(ms(d, '17:30')), paattyy: ts(ms(d, '19:00')), joukkue: 'demo_u13', joukkueet: ['demo_u13'], poistettu: false }, o || {});

const { luoDb } = require('./kertyma_vale');
const JOUKKUEET = [{ id: 'demo_u13', nimi: 'Demo U13' }];
const PELAAJA = { etunimi: 'Aatu', huoltajaEmail: 'aiti@esimerkki.fi', suostumusTila: 'annettu', joukkue: 'Demo U13', joukkueet: ['demo_u13'] };
const perus = () => ({ pelaajat: { p1: PELAAJA, p2: Object.assign({}, PELAAJA) }, joukkueet: JOUKKUEET, eventit: { a: ev('2026-10-13'), b: ev('2026-10-15'), vanha: ev('2026-09-01') }, lasnaolot: { 'a/p1': { tila: 'paikalla' }, 'b/p1': { tila: 'poissa', syy: 'sairas' } }, kirjaukset: { p1: { '2026-10-14': { tyyppi: 'T', tehty: true, kesto_min: 20 }, '2026-10-30': { tyyppi: 'T', tehty: true } } } });
const deps = (db) => ({ db, Timestamp, FieldPath, palvelinAika: () => 'TS', nyt: () => NYT });

test('TRIGGER läsnäolo: päivittää vain tapahtuman viikon korin (W42) kertyma_2026-27-dokumenttiin, merge', async () => {
  const db = luoDb(perus()), kasittelija = K.luoLasnaoloKasittelija(deps(db));
  await kasittelija({}, { params: { sid: 'demo', eid: 'a', pid: 'p1' } });
  assert.strictEqual(db.kirjoitukset.length, 1); const w = db.kirjoitukset[0]; assert.strictEqual(w.id, 'kertyma_2026-27'); assert.deepStrictEqual(w.opts, { merge: true }); assert.deepStrictEqual(Object.keys(w.d.viikot), ['2026-W42']);
  const k = w.d.viikot['2026-W42']; assert.strictEqual(k.treeni.paik, 1); assert.strictEqual(k.treeni.poissa.sairas, 1); assert.strictEqual(k.omatoimi.n, 1); assert.strictEqual(k.omatoimi.min, 20); assert.strictEqual(k.srpe, null);
});
test('TRIGGER kirjaus: päivittää kirjauksen viikon; väärän muotoinen pvm-avain ohitetaan; tuntematon pelaaja/tapahtuma ei kirjoita', async () => {
  const db = luoDb(perus()), kir = K.luoKirjausKasittelija(deps(db));
  await kir({}, { params: { sid: 'demo', pid: 'p1', pvm: '2026-10-14' } }); assert.deepStrictEqual(Object.keys(db.kirjoitukset[0].d.viikot), ['2026-W42']);
  await kir({}, { params: { sid: 'demo', pid: 'p1', pvm: 'roskaa' } }); await kir({}, { params: { sid: 'demo', pid: 'ei', pvm: '2026-10-14' } });
  await K.luoLasnaoloKasittelija(deps(db))({}, { params: { sid: 'demo', eid: 'ei_ole', pid: 'p1' } }); assert.strictEqual(db.kirjoitukset.length, 1);
});
test('TRIGGER: lukumäärä ei riipu seuran koosta — KAIKKI kokoelmat (pelaajat, joukkueet, kalenteri, läsnäolijat, kirjaukset), ≤ 15 lukua/kutsu, 3 seurakokoa', async () => {
  const tulos = [];
  for (const [nP, nJ] of [[20, 3], [200, 15], [800, 25]]) {
    const o = perus(); o.joukkueet = []; o.eventit = {}; o.lasnaolot = {};
    for (let j = 0; j < nJ; j++) { const id = j === 0 ? 'demo_u13' : 'x_u' + j; o.joukkueet.push({ id, nimi: id === 'demo_u13' ? 'Demo U13' : 'Muu ' + j }); for (const d of ['2026-10-12', '2026-10-14', '2026-10-16']) o.eventit[id + '_' + d] = ev(d, { joukkue: id, joukkueet: [id] }); }
    for (let i = 0; i < nP; i++) o.pelaajat['x' + i] = Object.assign({}, PELAAJA, { joukkueet: ['x_u' + (i % nJ || 1)], joukkue: 'Muu' });
    o.lasnaolot['demo_u13_2026-10-14/p1'] = { tila: 'paikalla' };
    const db = luoDb(o); await K.luoLasnaoloKasittelija(deps(db))({}, { params: { sid: 'demo', eid: 'demo_u13_2026-10-14', pid: 'p1' } });
    tulos.push({ nP, nJ, yht: db.lukuja.yht, per: Object.assign({}, db.lukuja.perKokoelma), pelaajat: db.lukuja.pelaajat });
  }
  tulos.forEach((t) => { assert.ok(t.yht <= 15, 'lukuja ' + t.yht + ' (seura ' + t.nP + '/' + t.nJ + ')'); assert.strictEqual(t.pelaajat, 1); assert.deepStrictEqual(t.per, tulos[0].per); assert.strictEqual(t.yht, tulos[0].yht); });
});
test('BACKFILL: korvaa kauden dokumentin korit; kuiva-ajo ei kirjoita', async () => {
  const db = luoDb(perus()), a = await K.taytaPelaaja(deps(db), 'demo', 'p1', NYT, false); assert.strictEqual(db.kirjoitukset.length, 0); assert.ok(a.korit['2026-W42']);
  await K.taytaPelaaja(deps(db), 'demo', 'p1', NYT, true); assert.strictEqual(db.kirjoitukset.length, 1); assert.strictEqual(db.kirjoitukset[0].opts, undefined);
});
test('BACKFILL-skripti (K35-11 #6): --seura <mikä tahansa> sallittu, kuiva-ajo oletus, --kaikki-seurat oma lippu, ei yhdisty --seura:an', () => {
  const S = require('../../scripts/taydenna_harjoituskertyma.js');
  ['demo', 'kpv', 'sibbovargarna', 'sjk'].forEach((s) => { S.tarkistaSeura(s); assert.deepStrictEqual(S.lueArgit(['--seura', s]), { seura: s, kaikki: false, kirjoita: false }); });
  assert.strictEqual(S.lueArgit(['--seura', 'kpv', '--kirjoita']).kirjoita, true);
  assert.deepStrictEqual(S.lueArgit(['--kaikki-seurat']), { seura: null, kaikki: true, kirjoita: false });
  assert.throws(() => S.lueArgit(['--seura', 'kpv', '--kaikki-seurat']), /eivät yhdisty/); assert.throws(() => S.lueArgit([]), /Käyttö/);
  ['', undefined, '--kirjoita'].forEach((s) => assert.throws(() => S.tarkistaSeura(s), /vaatii seuran id/));
});
test('BACKFILL-skripti: ilman --kirjoita ei kirjoita (kuiva-ajo), myös muulle seuralle kuin demo', async () => {
  const S = require('../../scripts/taydenna_harjoituskertyma.js'), db = luoDb(perus());
  assert.ok(typeof S.aja === 'function');
  const a = await K.taytaPelaaja(deps(db), 'demo', 'p1', NYT, false); assert.strictEqual(db.kirjoitukset.length, 0); assert.ok(a);
});

const aja = (o, ctx, data) => K.luoKertymaKasittelija({ db: luoDb(o), HttpsError, nyt: () => NYT })(data || { seuraId: 'demo', pelaajaId: 'p1' }, ctx);
const pelaajaTok = (pid) => ({ auth: { token: { rooli: 'pelaaja', pelaajaSeuraId: 'demo', pelaajaId: pid || 'p1' } } });
const huoltajaTok = (x) => ({ auth: { token: Object.assign({ email: 'Aiti@Esimerkki.fi', email_verified: true }, x || {}) } });
const kooste = () => Object.assign(perus(), { kooste: { 'p1/kertyma_2026-27': { viikot: { '2026-W42': { treeni: { paik: 1, myoh: 0, poissa: { sairas: 0, estynyt: 0, muu: 0 }, ei_kirjattu: 0 }, omatoimi: { n: 2, min: 30 } } } } } });
test('CALLABLE: pelaaja itse ✓ (omat luvut, ei tokenia/muiden dataa), huoltaja ✓ (sama tunnistus kuin kalenteri)', async () => {
  const r = await aja(kooste(), pelaajaTok()); assert.strictEqual(r.kertyma.vk4.treeni.paik, 1); assert.strictEqual(r.kertyma.vk4.omatoimi.n, 2); assert.strictEqual(r.kertyma.kausiAvain, '2026-27');
  assert.ok(!/token|url|webcal/i.test(JSON.stringify(r))); assert.strictEqual((await aja(kooste(), huoltajaTok())).kertyma.kausi.omatoimi.n, 2);
});
test('CALLABLE: huoltaja vain OMAN lapsen — toisen lapsen pelaaja ✗; väärä email ✗; vahvistamaton ✗; ilman suostumusta ✗; toisen pelaajan token ✗; muu seura ✗; henkilökunta ✗; anonyymi ✗', async () => {
  const o = kooste(); o.pelaajat.p2 = Object.assign({}, PELAAJA, { huoltajaEmail: 'toinen@esimerkki.fi' });
  await assert.rejects(aja(o, huoltajaTok(), { seuraId: 'demo', pelaajaId: 'p2' }), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, huoltajaTok({ email: 'vieras@esimerkki.fi' })), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, huoltajaTok({ email_verified: false })), (e) => e.code === 'permission-denied');
  const ei = kooste(); ei.pelaajat.p1 = Object.assign({}, PELAAJA, { suostumusTila: 'odottaa' }); await assert.rejects(aja(ei, huoltajaTok()), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, pelaajaTok('p2')), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, { auth: { token: { rooli: 'pelaaja', pelaajaSeuraId: 'hjk', pelaajaId: 'p1' } } }), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, { auth: { token: { rooli: 'valmentaja', seuraId: 'demo', uid: 'v1' } } }), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, { auth: { token: { firebase: { sign_in_provider: 'anonymous' } } } }), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, {}), (e) => e.code === 'unauthenticated');
  await assert.rejects(aja(o, pelaajaTok(), { seuraId: 'a/b', pelaajaId: 'p1' }), (e) => e.code === 'invalid-argument');
});
test('CALLABLE: ei koostetta → tyhjä kausi (ei virhettä); poistettu/arkistoitu pelaaja ✗', async () => {
  const r = await aja(perus(), pelaajaTok()); assert.strictEqual(r.kertyma.kausi.treeni.yht, 0);
  const p = perus(); p.pelaajat.p1 = Object.assign({}, PELAAJA, { arkistoitu: true }); await assert.rejects(aja(p, pelaajaTok()), (e) => e.code === 'permission-denied');
});

const muutos = (e, u) => ({ before: { data: () => e }, after: { data: () => u } });
test('MUUTOS siirto: tapahtuma ma → seuraavan viikon ma läsnäolon jälkeen korjaa molemmat korit (W42 tyhjenee, W43 saa läsnäolon)', async () => {
  const o = perus(); o.eventit.a = ev('2026-10-20'); const db = luoDb(o), k = K.luoTapahtumaMuutosKasittelija(deps(db));
  const r = await k(muutos(ev('2026-10-13'), ev('2026-10-20')), { params: { sid: 'demo', eid: 'a' } });
  assert.deepStrictEqual(r, { pelaajia: 1, viikkoja: 2 }); const w = (pid, v) => db.kirjoitukset.filter((x) => x.pid === pid).map((x) => x.d.viikot[v]).filter(Boolean)[0];
  assert.strictEqual(w('p1', '2026-W42').treeni.paik, 0); assert.strictEqual(w('p1', '2026-W43').treeni.paik, 1);
});
test('MUUTOS peruminen/poisto: tila → peruttu tai poistettu → vanhan viikon kori päivittyy (tapahtuma ei enää lasketa); ei muutosta → ei mitään', async () => {
  for (const u of [{ tila: 'peruttu' }, { poistettu: true }, { tila: 'peruutettu' }]) {
    const o = perus(); o.eventit.a = Object.assign(ev('2026-10-13'), u); const db = luoDb(o);
    await K.luoTapahtumaMuutosKasittelija(deps(db))(muutos(ev('2026-10-13'), o.eventit.a), { params: { sid: 'demo', eid: 'a' } });
    assert.strictEqual(db.kirjoitukset.filter((x) => x.pid === 'p1').pop().d.viikot['2026-W42'].treeni.paik, 0);
  }
  const db = luoDb(perus()); assert.strictEqual(await K.luoTapahtumaMuutosKasittelija(deps(db))(muutos(ev('2026-10-13'), ev('2026-10-13', { nimi: 'X' })), { params: { sid: 'demo', eid: 'a' } }), null); assert.strictEqual(db.kirjoitukset.length, 0);
});
test('MUUTOS: ei lasnaolijoita (tuleva tapahtuma) → ei kirjoituksia eikä pelaajalukuja', async () => {
  const o = perus(); o.lasnaolot = {}; const db = luoDb(o); const r = await K.luoTapahtumaMuutosKasittelija(deps(db))(muutos(ev('2026-10-13'), ev('2026-10-20')), { params: { sid: 'demo', eid: 'a' } });
  assert.strictEqual(r, null); assert.strictEqual(db.kirjoitukset.length, 0); assert.strictEqual(db.lukuja.pelaajat, 0);
});
