'use strict';
/* 8–9 v -esto (LASKUTUS_L1_VAIHE0 §7.6, PM päätös 8): PIN, kortit, pelaajalinkki ja suostumuksen PIN alle 10-vuotiaalle.
   Muistikanta ja index.js-stubit kuten laskutus_esto.test.js. Kirjautuminen: tests/pelaajakirjautuminen.test.js. */
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


const IKA = require('../tm_pelaaja_ika');
const pelaajapin = require('../pelaajapin');
const suostumuskortit = require('../suostumuskortit');
const V = IKA.tmHelsinkiVuosi(), ALLE = V - 9, KYMMENEN = V - 10;   // suhteessa kuluvaan vuoteen → ei vanhene vuodenvaihteessa
const pinDeps = () => ({ db, FieldValue, HttpsError, tarkistaOikeus: async () => ({ sallittu: true }), randomInt: () => 482917,
  audit: (toiminto, t) => db.collection('audit').add(Object.assign({ toiminto }, t)) });
const ctx = { auth: { uid: 'vp1', token: { seuraId: 's1', rooli: 'vp' } } };
const ilmanVuotta = { syntymaVuosi: undefined };

describe('tm_pelaaja_ika: sääntö', () => {
  test('ikä ≤ 9 estetty, 10 sallittu, puuttuva vuosi = ika_puuttuu (ei estetty)', () => {
    assert.strictEqual(IKA.tmPelaajaAppTila({ syntymaVuosi: 2017 }, 2026), 'ika_alle_10');
    assert.strictEqual(IKA.tmPelaajaAppTila({ syntymaVuosi: 2016 }, 2026), 'ok');
    assert.strictEqual(IKA.tmPelaajaAppTila({ syntymaVuosi: 2017 }, 2027), 'ok', 'esto poistuu itsestään vuoden vaihteessa');
    assert.strictEqual(IKA.tmPelaajaAppTila({}, 2026), 'ika_puuttuu');
    assert.strictEqual(IKA.pelaajaAppEstettyIka({}, 2026), false);
    assert.strictEqual(IKA.pelaajaAppEstettyIka({ syntymaVuosi: '2018' }, 2026), true);
  });
});

describe('asetaPelaajanPin ja luoPinitSeuralle: 8–9 v', () => {
  beforeEach(tyhjenna);
  test('alle 10 → failed-precondition ika_alle_10, ei PIN:iä, audit ilman nimiä', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], { syntymaVuosi: ALLE });
    await assert.rejects(pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p1' }, ctx),
      (e) => e.code === 'failed-precondition' && e.details.syy === 'ika_alle_10' && e.message === pelaajapin.VIRHE_IKA_ALLE);
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p1'].pin, undefined); assert.strictEqual(DOCS['_pelaajaPin/s1_p1'], undefined);
    const a = K.audit.filter((x) => x.toiminto === 'pin_estetty_ika'); assert.strictEqual(a.length, 1); assert.strictEqual(a[0].syy, 'ika_alle_10');
    assert.ok(!NIMET.test(JSON.stringify(a)));
  });
  test('syntymävuosi puuttuu → fail-closed ika_puuttuu ("lisää syntymävuosi")', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], ilmanVuotta);
    await assert.rejects(pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p1' }, ctx),
      (e) => e.code === 'failed-precondition' && e.details.syy === 'ika_puuttuu' && /lisää/.test(e.message));
  });
  test('10 vuotta täyttävä ja syntymaaika-varalla → PIN asetetaan; deps.vuosi kiinnittää vuoden', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], { syntymaVuosi: KYMMENEN }); pelaaja('p2', ['akt'], { syntymaVuosi: undefined, syntymaaika: { seconds: Date.UTC(KYMMENEN, 5, 1) / 1000 } });
    assert.strictEqual((await pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p1' }, ctx)).pin, '482917');
    assert.strictEqual((await pelaajapin.luoAsetaPelaajanPin(pinDeps())({ seuraId: 's1', pelaajaId: 'p2' }, ctx)).pin, '482917');
    pelaaja('p3', ['akt'], { syntymaVuosi: 2016 });
    await assert.rejects(pelaajapin.luoAsetaPelaajanPin(Object.assign(pinDeps(), { vuosi: 2025 }))({ seuraId: 's1', pelaajaId: 'p3' }, ctx), (e) => e.details.syy === 'ika_alle_10');
  });
  test('luoPinitSeuralle: ohitettuIka + ohitettuIkaPuuttuu (myös vainPuuttuvat:false), muut saavat PIN:n', async () => {
    seura({ sopimus: undefined });
    pelaaja('ok1', ['akt']); pelaaja('ok2', ['akt'], { syntymaVuosi: KYMMENEN });
    pelaaja('a1', ['akt'], { syntymaVuosi: ALLE }); pelaaja('a2', ['akt'], { syntymaVuosi: ALLE, pin: '135790' }); pelaaja('m1', ['akt'], ilmanVuotta);
    const f = pelaajapin.luoLuoPinitSeuralle(pinDeps());
    const kuiva = await f({ seuraId: 's1', kuivaAjo: true }, ctx);
    assert.deepStrictEqual([kuiva.luotaisiin, kuiva.ohitettuIka, kuiva.ohitettuIkaPuuttuu], [2, 2, 1]);
    const r = await f({ seuraId: 's1', vainPuuttuvat: false }, ctx);
    assert.deepStrictEqual([r.luotu, r.ohitettuIka, r.ohitettuIkaPuuttuu], [2, 2, 1]);
    assert.strictEqual(DOCS['seurat/s1/pelaajat/a1'].pin, undefined); assert.strictEqual(DOCS['seurat/s1/pelaajat/a2'].pin, '135790', 'olemassa oleva → skripti poistaa');
    assert.strictEqual(DOCS['seurat/s1/pelaajat/m1'].pin, undefined);
    const a = K.audit.find((x) => x.toiminto === 'pinit_luotu'); assert.deepStrictEqual([a.ohitettuIka, a.ohitettuIkaPuuttuu], [2, 1]);
  });
});

describe('luoSuostumusKortit: 8–9 v', () => {
  beforeEach(tyhjenna);
  test('suostumuksen antanut alle 10 / ilman vuotta → pelaajakortti estetty + syy (ei PIN:iä eikä pelaajalinkkiä); suostumuskortti ennallaan', async () => {
    seura({ sopimus: undefined });
    pelaaja('a1', ['akt'], { syntymaVuosi: ALLE }); pelaaja('m1', ['akt'], ilmanVuotta); pelaaja('ok', ['akt']);
    pelaaja('s1p', ['akt'], { syntymaVuosi: ALLE, suostumusTila: 'odottaa' });
    const r = await suostumuskortit.luoKasittelija(pinDeps())({ seuraId: 's1', pelaajaIds: ['a1', 'm1', 'ok', 's1p'] }, ctx);
    const k = Object.fromEntries(r.kortit.map((x) => [x.pelaajaId, x]));
    assert.deepStrictEqual([k.a1.estetty, k.a1.syy], [true, 'ika_alle_10']);
    assert.deepStrictEqual([k.m1.estetty, k.m1.syy], [true, 'ika_puuttuu']);
    assert.strictEqual(k.ok.estetty, undefined);
    assert.strictEqual(k.s1p.tyyppi, 'suostumuskortti', 'suostumuspolku ei esty (huoltaja saa Vanhempi-näkymän)');
    assert.strictEqual(K.audit.find((x) => x.toiminto === 'suostumuskortit_luotu').ika_estettyja, 2);
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
process.env.GCLOUD_PROJECT = 'talentmaster-pilot';   // projekti 06 P6: tuotantoprojekti → sähköpostiesto ei estä (testi tarkistaa lähtevän viestin)
const vp = { auth: { uid: 'vp1', token: {} } };
const SIVU = 'https://talentmasterid.com/TalentMaster_Rekisterointi_Suostumus.html';
const sisalto = (m) => JSON.stringify(m.content || m);


describe('lahetaPelaajaSivuLinkki ja vahvistaSuostumus (index.js): 8–9 v', () => {
  beforeEach(() => { tyhjenna(); lahetetyt.length = 0; });
  const linkki = (pid) => fft.wrap(fns.lahetaPelaajaSivuLinkki)({ seuraId: 's1', pelaajaId: pid, hEmail: 'h' + pid + '@esim-perhe.fi' }, vp);
  test('alle 10: viesti lähtee vain Vanhemman sivulla — ei pelaajalinkkiä, ei PIN:iä, pelaajaLinkki-kenttää ei kirjoiteta', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], { syntymaVuosi: ALLE, pin: '246813' });
    const r = await linkki('p1');
    assert.deepStrictEqual([r.ok, r.vainVanhempi, r.syy, r.linkki], [true, true, 'ika_alle_10', null]);
    assert.strictEqual(lahetetyt.length, 1);
    const s = sisalto(lahetetyt[0]);
    assert.ok(/Vanhempi_v2/.test(s)); assert.ok(!/Pelaaja_v7/.test(s)); assert.ok(!/246813/.test(s));
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p1'].pelaajaLinkki, undefined);
    assert.strictEqual(K.audit.filter((a) => a.toiminto === 'pelaajalinkki_estetty_ika').length, 1);
  });
  test('syntymävuosi puuttuu: failed-precondition ika_puuttuu, ei sähköpostia', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], ilmanVuotta);
    await assert.rejects(linkki('p1'), (e) => e.code === 'failed-precondition' && e.details.syy === 'ika_puuttuu');
    assert.strictEqual(lahetetyt.length, 0);
  });
  test('10 v: pelaajalinkki + PIN kuten ennen', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], { syntymaVuosi: KYMMENEN, pin: '246813' });
    const r = await linkki('p1');
    assert.strictEqual(r.vainVanhempi, false); assert.ok(/Pelaaja_v7/.test(sisalto(lahetetyt[0]))); assert.ok(/246813/.test(sisalto(lahetetyt[0])));
    assert.ok(DOCS['seurat/s1/pelaajat/p1'].pelaajaLinkki);
  });
  const vahvista = (pid, lisa) => fft.wrap(fns.vahvistaSuostumus)(Object.assign({ seuraId: 's1', pelaajaId: pid, hEmail: 'h' + pid + '@esim-perhe.fi', antaja: 'Huoltaja Testi', etunimi: 'Etu' + pid, suostumusMap: { rekisteri: true } }, lisa || {}), {});
  test('vahvistaSuostumus alle 10: suostumus tallentuu, ei uutta PIN:iä, olemassa olevaa PIN:iä ei viestiin; Vanhempi-linkki lähtee', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], { syntymaVuosi: ALLE, suostumusTila: 'odottaa' }); pelaaja('p2', ['akt'], { syntymaVuosi: ALLE, suostumusTila: 'odottaa', pin: '246813' });
    await vahvista('p1'); await vahvista('p2');
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p1'].suostumusTila, 'annettu');
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p1'].pin, undefined); assert.strictEqual(DOCS['_pelaajaPin/s1_p1'], undefined);
    assert.strictEqual(lahetetyt.length, 2);
    lahetetyt.forEach((m) => { assert.ok(!/PIN-koodi/.test(sisalto(m))); assert.ok(!/246813/.test(sisalto(m))); });
    assert.strictEqual(K.audit.filter((a) => a.toiminto === 'suostumus_pin_estetty_ika').length, 2);
  });
  test('vahvistaSuostumus: lomakkeen syntymäpäivä täyttää puuttuvan vuoden → 10 v saa PIN:n; ilman vuotta ei PIN:iä', async () => {
    seura({ sopimus: undefined }); pelaaja('p1', ['akt'], { syntymaVuosi: undefined, suostumusTila: 'odottaa' }); pelaaja('p2', ['akt'], { syntymaVuosi: undefined, suostumusTila: 'odottaa' });
    await vahvista('p1', { syntyma: KYMMENEN + '-05-01' });
    assert.ok(/^\d{6}$/.test(String(DOCS['seurat/s1/pelaajat/p1'].pin)), 'PIN syntyy');
    await vahvista('p2');
    assert.strictEqual(DOCS['seurat/s1/pelaajat/p2'].pin, undefined);
    assert.strictEqual(K.audit.find((a) => a.toiminto === 'suostumus_pin_estetty_ika' && a.pelaajaId === 'p2').syy, 'ika_puuttuu');
  });
});
