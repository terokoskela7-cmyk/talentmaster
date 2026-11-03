'use strict';
/* Laskutus L1c (.briefit/CODE_BRIEF_LASKUTUS_L1C.md §5): passiivisen joukkueen palvelinesto.
   Osa 1: laskutus_esto.js + pelaajapin.js suoraan (muistikanta). Osa 2: index.js-handlerit firebase-functions-testillä
   (lahetaRekisteriKutsu, lahetaHuoltajaKutsu, lahetaPelaajaSivuLinkki, vahvistaSuostumus) samalla muistikannalla. */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// ── Muistikanta: polku → data. Kokoelman get/where lukee suorat lapset. Kirjoitukset kirjataan. ──
const DOCS = {};
const K = { audit: [], kirjoitukset: [] };
let _id = 0;
function snapOf(p) {
  const d = DOCS[p];
  return { exists: d !== undefined, id: p.split('/').pop(), ref: docRef(p), data: () => (d === undefined ? undefined : Object.assign({}, d)), get: (k) => (d ? d[k] : undefined) };
}
function docRef(p) {
  return {
    id: p.split('/').pop(), path: p,
    get: async () => snapOf(p),
    set: async (data, o) => { K.kirjoitukset.push({ op: 'set', p, data }); DOCS[p] = o && o.merge ? Object.assign({}, DOCS[p] || {}, data) : Object.assign({}, data); },
    update: async (data) => { if (DOCS[p] === undefined) throw new Error('NOT_FOUND ' + p); K.kirjoitukset.push({ op: 'update', p, data }); Object.assign(DOCS[p], data); },
    create: async (data) => { DOCS[p] = Object.assign({}, data); },
    delete: async () => { delete DOCS[p]; },
    collection: (c) => collRef(p + '/' + c),
  };
}
function collRef(p, ehdot) {
  ehdot = ehdot || [];
  const q = {
    doc: (id) => docRef(p + '/' + (id || ('auto' + (++_id)))),
    where: (k, op, v) => collRef(p, ehdot.concat([[k, op, v]])),
    orderBy: () => q, limit: () => q, select: () => q,
    get: async () => {
      const docs = Object.keys(DOCS).filter((x) => x.startsWith(p + '/') && x.slice(p.length + 1).indexOf('/') < 0)
        .filter((x) => ehdot.every(([k, op, v]) => (op === 'array-contains' ? Array.isArray(DOCS[x][k]) && DOCS[x][k].includes(v) : DOCS[x][k] === v)))
        .map(snapOf);
      return { docs, empty: !docs.length, size: docs.length, forEach: (f) => docs.forEach(f) };
    },
    add: async (data) => { const r = docRef(p + '/auto' + (++_id)); DOCS[r.path] = Object.assign({}, data); if (p === 'audit') K.audit.push(data); return r; },
  };
  return q;
}
const db = {
  collection: (c) => collRef(c),
  collectionGroup: () => collRef('__ei__'),
  doc: (p) => docRef(p),
  batch: () => {
    const ops = [];
    return { set: (r, d, o) => ops.push(() => r.set(d, o)), update: (r, d) => ops.push(() => r.update(d)), delete: (r) => ops.push(() => r.delete()), commit: async () => { for (const f of ops) await f(); } };
  },
};
const FieldValue = { serverTimestamp: () => '__ts__', increment: (n) => n, arrayUnion: (...a) => a, arrayRemove: (...a) => a, delete: () => '__del__' };
class HttpsError extends Error { constructor(code, msg, details) { super(msg); this.code = code; this.details = details; } }

function tyhjenna() { Object.keys(DOCS).forEach((k) => delete DOCS[k]); K.audit.length = 0; K.kirjoitukset.length = 0; }
/* Seura s1: sopimusseura (laskutettava) tai pilotti. Joukkueet: akt (aktiivinen), pas (passiivinen, nimi 'S1 P12'), puu (ei laskutustilaa), demo (passiivinen demo). */
function seura({ sopimus }) {
  DOCS['seurat/s1'] = { nimi: 'FC Testi', vp_uid: 'vp1' };
  if (sopimus === true) DOCS['laskutus_asetukset/s1'] = { laskutettava: true };
  if (sopimus === false) DOCS['laskutus_asetukset/s1'] = { laskutettava: false };
  DOCS['seurat/s1/joukkueet/akt'] = { nimi: 'S1 P13', laskutustila: 'aktiivinen' };
  DOCS['seurat/s1/joukkueet/pas'] = { nimi: 'S1 P12', laskutustila: 'passiivinen' };
  DOCS['seurat/s1/joukkueet/puu'] = { nimi: 'S1 P11' };
  DOCS['seurat/s1/joukkueet/demo'] = { nimi: 'Demo', demo: true };
}
function pelaaja(id, joukkueet, lisa) {
  DOCS['seurat/s1/pelaajat/' + id] = Object.assign({ etunimi: 'Etu' + id, sukunimi: 'Suku', joukkueet, suostumusTila: 'annettu', huoltajaEmail: 'h' + id + '@esim-perhe.fi', syntymaVuosi: 2014 }, lisa || {});
}
const NIMET = /Etu\w+|Suku/;
function estoAuditit() { return K.audit.filter((a) => a.toiminto === 'laskutus_esto'); }

const esto = require('../laskutus_esto');
const pelaajapin = require('../pelaajapin');

describe('laskutus_esto.js — kenen toiminnot estetään', () => {
  beforeEach(tyhjenna);
  test('sopimusseura: passiivinen ja puuttuva laskutustila = passiivinen, aktiivinen ja demo sallittu', async () => {
    seura({ sopimus: true });
    const e = esto.luoEsto(db);
    assert.strictEqual(await e.joukkueEstetty('s1', 'akt'), false);
    assert.strictEqual(await e.joukkueEstetty('s1', 'pas'), true);
    assert.strictEqual(await e.joukkueEstetty('s1', 'puu'), true);
    assert.strictEqual(await e.joukkueEstetty('s1', 'demo'), false);
    assert.strictEqual(await e.joukkueEstetty('s1', 'ei_ole'), true);
  });
  test('sopimusseura: pelaaja aktiivisessa + passiivisessa sallittu, vain passiivisessa / ilman joukkuetta estetty', async () => {
    seura({ sopimus: true });
    const e = esto.luoEsto(db);
    assert.strictEqual(await e.pelaajaEstetty('s1', { joukkueet: ['pas', 'akt'], joukkue: 'S1 P12' }), false);
    assert.strictEqual(await e.pelaajaEstetty('s1', { joukkueet: ['pas'] }), true);
    assert.strictEqual(await e.pelaajaEstetty('s1', { joukkueet: [] }), true);
    assert.strictEqual(await e.pelaajaEstetty('s1', {}), true);
    assert.strictEqual(await e.pelaajaEstetty('s1', { joukkue: 'S1 P13' }), false, 'vanha nimikenttä tulkitaan tmPelaajanJoukkueet-säännöllä');
    assert.strictEqual(await e.pelaajaEstetty('s1', { joukkueet: ['demo'] }), false, 'demo-joukkuetta ei estetä');
  });
  test('pilottiseura (laskutettava false tai asetus puuttuu): ei estoa missään', async () => {
    for (const sopimus of [false, undefined]) {
      tyhjenna(); seura({ sopimus });
      const e = esto.luoEsto(db);
      assert.strictEqual(await e.joukkueEstetty('s1', 'pas'), false);
      assert.strictEqual(await e.pelaajaEstetty('s1', { joukkueet: ['pas'] }), false);
      assert.strictEqual(await e.pelaajaEstetty('s1', {}), false);
    }
  });
  test('välimuisti: asetukset ja joukkueet luetaan kerran per luoEsto', async () => {
    seura({ sopimus: true });
    let luvut = 0; const laskeva = { collection: (c) => { const r = db.collection(c); const doc = r.doc; r.doc = (id) => { const d = doc(id); const g = d.get; d.get = () => { luvut++; return g(); }; const col = d.collection; d.collection = (x) => { const q = col(x); const qg = q.get; q.get = () => { luvut++; return qg(); }; return q; }; return d; }; return r; } };
    const e = esto.luoEsto(laskeva);
    for (let i = 0; i < 5; i++) await e.pelaajaEstetty('s1', { joukkueet: ['pas'] });
    assert.strictEqual(luvut, 2);
  });
});

/* PIN-funktiot suoraan (pelaajapin.js), VP-oikeus tarkistaOikeus-stubilla. */
const pinDeps = () => ({ db, FieldValue, HttpsError, tarkistaOikeus: async () => ({ sallittu: true }), randomInt: () => 482917,
  audit: (toiminto, t) => db.collection('audit').add(Object.assign({ toiminto }, t)) });
const ctx = { auth: { uid: 'vp1', token: { seuraId: 's1', rooli: 'vp' } } };

describe('asetaPelaajanPin ja luoPinitSeuralle', () => {
  beforeEach(tyhjenna);
  test('sopimusseura: PIN passiivisen joukkueen pelaajalle → failed-precondition + syy, ei kirjoitusta, audit ilman nimiä', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas']);
    await assert.rejects(pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p1' }, ctx),
      (e) => e.code === 'failed-precondition' && e.details && e.details.syy === 'joukkue_passiivinen' && e.message === esto.VIESTI);
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p1'].pin, undefined);
    assert.strictEqual(DOCS['_pelaajaPin/s1_p1'], undefined);
    const a = estoAuditit();
    assert.strictEqual(a.length, 1);
    assert.deepStrictEqual({ funktio: a[0].funktio, seuraId: a[0].seuraId, pelaajaId: a[0].pelaajaId }, { funktio: 'asetaPelaajanPin', seuraId: 's1', pelaajaId: 'p1' });
    assert.ok(!NIMET.test(JSON.stringify(a)));
  });
  test('sopimusseura: pelaaja aktiivisessa + passiivisessa → PIN asetetaan', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas', 'akt']);
    const r = await pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p1' }, ctx);
    assert.strictEqual(r.pin, '482917');
    assert.strictEqual(estoAuditit().length, 0);
  });
  test('sopimusseura: pelaaja ilman joukkuetta → esto', async () => {
    seura({ sopimus: true }); pelaaja('p1', []);
    await assert.rejects(pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p1' }, ctx), (e) => e.details.syy === 'joukkue_passiivinen');
  });
  test('pilottiseura: passiivisen joukkueen pelaaja saa PIN:n kuten ennen', async () => {
    seura({ sopimus: false }); pelaaja('p1', ['pas']);
    const r = await pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p1' }, ctx);
    assert.strictEqual(r.pin, '482917');
  });
  test('luoPinitSeuralle: estetyt ohitetaan (ohitettuPassiivinen), aktiiviset saavat PIN:n; kuiva-ajo kertoo saman', async () => {
    seura({ sopimus: true });
    pelaaja('a1', ['akt']); pelaaja('a2', ['pas', 'akt']); pelaaja('x1', ['pas']); pelaaja('x2', ['puu']); pelaaja('x3', []);
    pelaaja('o1', ['akt'], { pin: '123987' }); pelaaja('s0', ['pas'], { suostumusTila: 'odottaa' });
    const f = pelaajapin.luoLuoPinitSeuralle(pinDeps());
    const kuiva = await f({ seuraId: 's1', kuivaAjo: true }, ctx);
    assert.strictEqual(kuiva.luotaisiin, 2); assert.strictEqual(kuiva.ohitettuPassiivinen, 3);
    assert.strictEqual(estoAuditit().length, 0, 'kuiva-ajo ei kirjaa estoa');
    const r = await f({ seuraId: 's1' }, ctx);
    assert.strictEqual(r.luotu, 2); assert.strictEqual(r.ohitettuPassiivinen, 3); assert.strictEqual(r.ohitettuSuostumus, 1); assert.strictEqual(r.oliJo, 1);
    assert.ok(DOCS['seurat/s1/pelaajat/a1'].pin && DOCS['seurat/s1/pelaajat/a2'].pin);
    ['x1', 'x2', 'x3'].forEach((id) => assert.strictEqual(DOCS['seurat/s1/pelaajat/' + id].pin, undefined, id));
    const a = estoAuditit();
    assert.strictEqual(a.length, 1); assert.strictEqual(a[0].funktio, 'luoPinitSeuralle'); assert.strictEqual(a[0].ohitettuPassiivinen, 3);
    assert.ok(!NIMET.test(JSON.stringify(a)));
    assert.strictEqual(K.audit.find((x) => x.toiminto === 'pinit_luotu').ohitettuPassiivinen, 3);
  });
  test('luoPinitSeuralle pilottiseurassa: ohitettuPassiivinen 0', async () => {
    seura({ sopimus: undefined }); pelaaja('x1', ['pas']);
    const r = await pelaajapin.luoLuoPinitSeuralle(pinDeps())({ seuraId: 's1' }, ctx);
    assert.strictEqual(r.luotu, 1); assert.strictEqual(r.ohitettuPassiivinen, 0);
  });
});

// ── Osa 2: index.js-handlerit. firebase-admin stubataan ENNEN latausta (kuten sahkoposti_kutsu_handler.test.js). ──
const admin = require('firebase-admin');
const fakeFirestore = () => db;
fakeFirestore.FieldValue = FieldValue;
fakeFirestore.Timestamp = { now: () => ({ toDate: () => new Date(0), toMillis: () => 0 }), fromDate: (dd) => ({ toDate: () => dd, toMillis: () => dd.getTime() }) };
Object.defineProperty(admin, 'firestore', { configurable: true, value: fakeFirestore });
Object.defineProperty(admin, 'auth', { configurable: true, value: () => ({
  getUserByEmail: async (email) => ({ uid: 'huoltaja-uid', email }),
  createUser: async () => ({ uid: 'huoltaja-uid' }),
  generatePasswordResetLink: async () => 'https://reset.example/linkki',
  setCustomUserClaims: async () => {}, getUser: async () => ({ uid: 'x', customClaims: {} }),
}) });
admin.initializeApp = () => ({ delete: async () => {} });
const fft = require('firebase-functions-test')();
const fns = require('../index.js');
const https = require('https');
const lahetetyt = [];
https.request = (opts, cb) => ({ on() {}, write(p) { lahetetyt.push(JSON.parse(p)); }, end() { cb({ statusCode: 202, on(ev, f) { if (ev === 'end') f(); } }); } });
process.env.SENDGRID_API_KEY = 'SG.testikey123';
const vp = { auth: { uid: 'vp1', token: {} } };
const SIVU = 'https://talentmasterid.com/TalentMaster_Rekisterointi_Suostumus.html';
const sisalto = (m) => JSON.stringify(m.content || m);

describe('kutsut (index.js): lahetaRekisteriKutsu, lahetaHuoltajaKutsu, lahetaPelaajaSivuLinkki', () => {
  beforeEach(() => { tyhjenna(); lahetetyt.length = 0; });
  const rek = (pid, joukkue) => fft.wrap(fns.lahetaRekisteriKutsu)({ seuraId: 's1', hEmail: 'huoltaja@esim-perhe.fi', etunimi: 'Ella', sukunimi: 'K', joukkue,
    linkki: SIVU + '?seuraId=s1' + (pid ? '&pelaajaId=' + pid : '') }, vp);

  test('sopimusseura: rekisterikutsu passiivisen joukkueen pelaajalle → failed-precondition + syy, ei sähköpostia', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas'], { suostumusTila: 'odottaa' });
    await assert.rejects(rek('p1'), (e) => e.code === 'failed-precondition' && e.details.syy === 'joukkue_passiivinen');
    assert.strictEqual(lahetetyt.length, 0);
    const a = estoAuditit(); assert.strictEqual(a.length, 1); assert.strictEqual(a[0].funktio, 'lahetaRekisteriKutsu'); assert.strictEqual(a[0].pelaajaId, 'p1');
    assert.ok(!NIMET.test(JSON.stringify(a)) && !/Ella/.test(JSON.stringify(a)));
  });
  test('sopimusseura: uusi kutsu ilman pelaajadokumenttia tulkitaan joukkueen nimestä (aktiivinen → lähtee, passiivinen/ei joukkuetta → esto)', async () => {
    seura({ sopimus: true });
    await rek(null, 'S1 P13'); assert.strictEqual(lahetetyt.length, 1);
    await assert.rejects(rek(null, 'S1 P12'), (e) => e.details.syy === 'joukkue_passiivinen');
    await assert.rejects(rek(null, ''), (e) => e.details.syy === 'joukkue_passiivinen');
    assert.strictEqual(lahetetyt.length, 1);
  });
  test('sopimusseura: pelaaja aktiivisessa ja passiivisessa → kutsu lähtee', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas', 'akt'], { suostumusTila: 'odottaa' });
    await rek('p1'); assert.strictEqual(lahetetyt.length, 1);
  });
  test('pilottiseura: kutsu passiivisen joukkueen pelaajalle lähtee kuten ennen', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['pas'], { suostumusTila: 'odottaa' });
    await rek('p1'); assert.strictEqual(lahetetyt.length, 1); assert.strictEqual(estoAuditit().length, 0);
  });
  test('lahetaHuoltajaKutsu: sopimusseuran passiivinen → esto ilman kutsudokumenttia; aktiivinen → kutsu luodaan', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas']); pelaaja('p2', ['akt']);
    const f = fft.wrap(fns.lahetaHuoltajaKutsu);
    await assert.rejects(f({ seuraId: 's1', pelaajaId: 'p1', huoltajaEmail: 'h@esim-perhe.fi' }, vp), (e) => e.code === 'failed-precondition' && e.details.syy === 'joukkue_passiivinen');
    assert.strictEqual(Object.keys(DOCS).filter((k) => k.startsWith('seurat/s1/kutsut/')).length, 0);
    const r = await f({ seuraId: 's1', pelaajaId: 'p2', huoltajaEmail: 'h@esim-perhe.fi' }, vp);
    assert.strictEqual(r.ok, true);
    assert.strictEqual(Object.keys(DOCS).filter((k) => k.startsWith('seurat/s1/kutsut/')).length, 1);
    assert.strictEqual(estoAuditit()[0].funktio, 'lahetaHuoltajaKutsu');
  });
  test('lahetaPelaajaSivuLinkki: sopimusseuran passiivinen → esto, ei sähköpostia eikä pelaajaLinkki-kenttää', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas']);
    await assert.rejects(fft.wrap(fns.lahetaPelaajaSivuLinkki)({ seuraId: 's1', pelaajaId: 'p1', hEmail: 'hp1@esim-perhe.fi' }, vp),
      (e) => e.code === 'failed-precondition' && e.details.syy === 'joukkue_passiivinen');
    assert.strictEqual(lahetetyt.length, 0);
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p1'].pelaajaLinkki, undefined);
    assert.strictEqual(estoAuditit()[0].funktio, 'lahetaPelaajaSivuLinkki');
  });
  test('lahetaPelaajaSivuLinkki: pilottiseuran passiivinen → lähtee', async () => {
    seura({ sopimus: false }); pelaaja('p1', ['pas']);
    const r = await fft.wrap(fns.lahetaPelaajaSivuLinkki)({ seuraId: 's1', pelaajaId: 'p1', hEmail: 'hp1@esim-perhe.fi' }, vp);
    assert.strictEqual(r.ok, true); assert.strictEqual(lahetetyt.length, 1);
  });
});

describe('vahvistaSuostumus (index.js)', () => {
  beforeEach(() => { tyhjenna(); lahetetyt.length = 0; });
  const vahvista = (pid) => fft.wrap(fns.vahvistaSuostumus)({ seuraId: 's1', pelaajaId: pid, hEmail: 'h' + pid + '@esim-perhe.fi', antaja: 'Huoltaja Testi', etunimi: 'Etu' + pid, suostumusMap: { rekisteri: true } }, {});

  test('sopimusseuran passiivinen: suostumus tallentuu, PIN:iä ei luoda, huoltajan viesti lähtee ilman PIN:iä, audit ilman nimiä', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas'], { suostumusTila: 'odottaa' });
    const r = await vahvista('p1');
    assert.strictEqual(r.ok, true);
    const p = DOCS['seurat/s1/pelaajat/p1'];
    assert.strictEqual(p.suostumusTila, 'annettu');
    assert.strictEqual(p.pin, undefined);
    assert.strictEqual(DOCS['_pelaajaPin/s1_p1'], undefined);
    assert.strictEqual(lahetetyt.length, 1, 'huoltajan viesti lähtee');
    assert.ok(!/PIN-koodi/.test(sisalto(lahetetyt[0])), 'viestissä ei PIN-laatikkoa');
    assert.ok(/Vanhempi_v2/.test(sisalto(lahetetyt[0])) || r.emailLahetetty === true);
    const a = estoAuditit(); assert.strictEqual(a.length, 1);
    assert.deepStrictEqual({ funktio: a[0].funktio, seuraId: a[0].seuraId, pelaajaId: a[0].pelaajaId }, { funktio: 'vahvistaSuostumus', seuraId: 's1', pelaajaId: 'p1' });
    assert.ok(!NIMET.test(JSON.stringify(a)) && !/Huoltaja Testi/.test(JSON.stringify(a)));
  });
  test('sopimusseuran passiivinen, PIN jo olemassa: PIN säilyy ja menee viestiin (esto ei koske olemassa olevia)', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['pas'], { suostumusTila: 'odottaa', pin: '246813' });
    await vahvista('p1');
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p1'].pin, '246813');
    assert.ok(/246813/.test(sisalto(lahetetyt[0])));
  });
  test('sopimusseuran aktiivinen: PIN luodaan kuten ennen', async () => {
    seura({ sopimus: true }); pelaaja('p1', ['akt'], { suostumusTila: 'odottaa' });
    await vahvista('p1');
    assert.match(String(DOCS['seurat/s1/pelaajat/p1'].pin), /^\d{6}$/);
    assert.strictEqual(estoAuditit().length, 0);
  });
  test('pilottiseuran passiivinen: PIN luodaan kuten ennen', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['pas'], { suostumusTila: 'odottaa' });
    await vahvista('p1');
    assert.match(String(DOCS['seurat/s1/pelaajat/p1'].pin), /^\d{6}$/);
  });
});

describe('lähdevartijat', () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  test('jokainen briiffin funktio käyttää laskutus_esto.js:ää (ei omaa joukkuetulkintaa)', () => {
    ['lahetaRekisteriKutsu', 'lahetaHuoltajaKutsu', 'lahetaPelaajaSivuLinkki'].forEach((f) => assert.match(idx, new RegExp("vaadiPelaaja(Doc)?Sallittu\\(_estoDeps\\(\\), \\{ funktio: '" + f + "'")));
    assert.match(idx, /laskutusEsto\.luoEsto\(db\)\.pelaajaEstetty\(seuraId, snap\.data\(\)/);
    const pin = fs.readFileSync(path.join(__dirname, '..', 'pelaajapin.js'), 'utf8');
    assert.match(pin, /funktio: 'asetaPelaajanPin'/); assert.match(pin, /ohitettuPassiivinen/);
    const e = fs.readFileSync(path.join(__dirname, '..', 'laskutus_esto.js'), 'utf8');
    assert.match(e, /require\('\.\/tm_laskutus'\)/); assert.ok(!/\)\.(set|update|create)\(/.test(e), 'esto ei kirjoita muuta kuin audit-rivin');
  });
});
