'use strict';
/**
 * Seuran pulssi S1 — functions/seuran_kooste.js mock-Firestorella (ei emulaattoria): kirjoittaa VAIN kooste-dokumentit, idempotentti, yhden seuran virhe ei kaada muita,
 * viikkokatsaus ja täysi katselmus haetaan, ajastetut käsittelijät (su = kuluva, ma = edellinen viikko), callable-oikeudet (johto/SA, ei valmentaja/pelaaja), 30 s jäähy.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../seuran_kooste');
const H = require('../helsinki_paiva');

const SERVER_TS = { __ts: 'palvelin' };
const FieldValue = { serverTimestamp: () => SERVER_TS };
const FieldPath = { documentId: () => ({ __docId: true }) };
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

function luoDb(data, opts) {
  const STORE = new Map(Object.entries(data)); const kirjoitukset = []; opts = opts || {};
  const lapset = (polku) => [...STORE.keys()].filter((k) => k.startsWith(polku + '/') && k.slice(polku.length + 1).indexOf('/') < 0);
  const docSnap = (polku) => ({ id: polku.split('/').pop(), exists: STORE.has(polku), data: () => STORE.get(polku), ref: docRef(polku) });
  function colRef(polku, suodattimet) {
    const c = {
      doc: (id) => docRef(polku + '/' + id),
      where: (f, op, v) => colRef(polku, (suodattimet || []).concat([[f, op, v]])),
      limit: () => c,
      get: async () => {
        if (opts.heitaPolulle && polku.indexOf(opts.heitaPolulle) >= 0) throw new Error('mock-virhe ' + polku);
        let ids = lapset(polku);
        (suodattimet || []).forEach(([f, op, v]) => { if (f && f.__docId) ids = ids.filter((k) => { const id = k.split('/').pop(); return op === '>=' ? id >= v : op === '<=' ? id <= v : true; }); });
        const docs = ids.map(docSnap); return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
    return c;
  }
  function docRef(polku) { return { path: polku, id: polku.split('/').pop(), get: async () => docSnap(polku), collection: (n) => colRef(polku + '/' + n), set: async (d) => { kirjoitukset.push(polku); STORE.set(polku, d); } }; }
  return {
    STORE, kirjoitukset,
    collection: (n) => colRef(n),
    getAll: async (...refs) => refs.map((r) => docSnap(r.path)),
    batch: () => { const ops = []; return { set: (ref, d) => { ops.push([ref.path, d]); }, commit: async () => { ops.forEach(([p, d]) => { kirjoitukset.push(p); STORE.set(p, d); }); } }; },
  };
}

const NYT = Date.UTC(2026, 9, 11, 18, 0);   // su 11.10.2026 klo 21:00 Helsinki (EEST) → W41
const iso = (ms) => new Date(ms).toISOString();
const DAY = 86400000;
function seuraData(sid, o) {
  o = o || {};
  const d = {};
  d['seurat/' + sid] = { nimi: sid };
  d['seurat/' + sid + '/joukkueet/u13'] = { nimi: 'KPV U13', jaksofokus: { osa_alueet: { tekninen_taktinen: { nimi: 'Pelaaminen' } }, alku: '2026-10-01', kesto_vk: 4 } };
  d['seurat/' + sid + '/pelaajat/a'] = { etunimi: 'Aleksi', sukunimi: 'Mäkinen', joukkue: 'KPV U13', joukkueet: ['u13'], syntymaVuosi: 2013, jaksofokus: { konsepti_avain: 'k', alkoi: iso(NYT - 10 * DAY), kesto_vk: 4 } };
  d['seurat/' + sid + '/pelaajat/b'] = { etunimi: 'Eeli', sukunimi: 'Virtanen', joukkue: 'KPV U13', joukkueet: ['u13'], syntymaVuosi: 2013, jaksofokus: { konsepti_avain: 'k', alkoi: iso(NYT - 10 * DAY), kesto_vk: 4 } };
  d['seurat/' + sid + '/pelaajat/c'] = { etunimi: 'Mikko', sukunimi: 'Korhonen', joukkue: 'KPV U13', joukkueet: ['u13'], syntymaVuosi: 2013, poistettu: true, jaksofokus: { konsepti_avain: 'k', alkoi: iso(NYT - 10 * DAY) } };
  if (o.vastaus) d['seurat/' + sid + '/pelaajat/a/viikkokatsaukset/2026-10-11'] = { vk: 1 };
  return d;
}
const deps = (db, extra) => Object.assign({ db, FieldValue, FieldPath, HttpsError, nyt: () => NYT, loki: { log() {}, error() {} } }, extra || {});

test('laskeSeura: kirjoittaa vain kooste + kooste_joukkue; lasketut luvut; ei nimiä/ID:itä; poistettu pelaaja ohitetaan', async () => {
  const db = luoDb(seuraData('kpv', { vastaus: true }));
  const r = await S.laskeSeura(deps(db), 'kpv', { rajat: H.viikonRajat(NYT), nytMs: NYT });
  assert.deepStrictEqual(db.kirjoitukset.sort(), ['seurat/kpv/kooste/2026-W41', 'seurat/kpv/kooste_joukkue/u13_2026-W41']);
  const k = db.STORE.get('seurat/kpv/kooste/2026-W41'), j = k.joukkueet.u13;
  assert.strictEqual(j.n_pelaajat, 2); assert.strictEqual(j.n_jaksolla, 2); assert.strictEqual(j.n_vastausperusta, 2); assert.strictEqual(j.n_vastanneet, 1); assert.strictEqual(j.jakso, true);
  assert.strictEqual(k.laskettu, SERVER_TS); assert.strictEqual(k.versio, 3); assert.strictEqual(k.vk, '2026-W41'); assert.ok(!('arvio' in k));
  const s = JSON.stringify([...db.STORE.entries()].filter(([p]) => /kooste/.test(p)));
  for (const kielletty of ['Aleksi', 'Mäkinen', 'Eeli', 'Virtanen', 'Korhonen', '"a"', '"b"', 'pelaajaId']) assert.ok(!s.includes(kielletty), 'koosteessa ei saa olla: ' + kielletty);
  assert.strictEqual(r.joukkueita, 1);
});

test('idempotentti: sama viikko uudelleen → samat dokumentit (set, ei add), sama sisältö', async () => {
  const db = luoDb(seuraData('kpv'));
  const rajat = H.viikonRajat(NYT);
  await S.laskeSeura(deps(db), 'kpv', { rajat, nytMs: NYT }); const eka = JSON.stringify([...db.STORE.entries()].filter(([p]) => /kooste/.test(p)));
  await S.laskeSeura(deps(db), 'kpv', { rajat, nytMs: NYT }); const toka = JSON.stringify([...db.STORE.entries()].filter(([p]) => /kooste/.test(p)));
  assert.strictEqual(eka, toka); assert.strictEqual([...db.STORE.keys()].filter((p) => /\/kooste/.test(p)).length, 2);
});

test('yhden seuran virhe ei kaada muita: loki, virheet-lista, jatketaan', async () => {
  const data = Object.assign({}, seuraData('hajonnut'), seuraData('kpv'));
  const db = luoDb(data, { heitaPolulle: 'seurat/hajonnut/joukkueet' });
  const lokit = []; const r = await S.laskeKaikki(deps(db, { loki: { log() {}, error: (m) => lokit.push(m) } }), { viikot: [H.viikonRajat(NYT)], nytMs: NYT, loki: { log() {}, error: (m) => lokit.push(m) } });
  assert.strictEqual(r.virheet.length, 1); assert.strictEqual(r.virheet[0].sid, 'hajonnut'); assert.strictEqual(r.tulokset.length, 1);
  assert.ok(db.STORE.has('seurat/kpv/kooste/2026-W41')); assert.ok(!db.STORE.has('seurat/hajonnut/kooste/2026-W41')); assert.ok(lokit.some((m) => /hajonnut/.test(m)));
});

test('deaktivoitu seura (aktiivinen:false) ohitetaan', async () => {
  const data = Object.assign({}, seuraData('kpv'), seuraData('vanha')); data['seurat/vanha'] = { aktiivinen: false };
  const db = luoDb(data); await S.laskeKaikki(deps(db), { viikot: [H.viikonRajat(NYT)], nytMs: NYT });
  assert.ok(db.STORE.has('seurat/kpv/kooste/2026-W41')); assert.ok(!db.STORE.has('seurat/vanha/kooste/2026-W41'));
});

test('täysi katselmus (reviewit/{pvm}) ikkunassa pelastaa myöhässä suljetun jakson', async () => {
  const data = seuraData('kpv'), loppu = NYT - 16 * DAY;   // ikkuna sulkeutui pe 9.10.
  data['seurat/kpv/pelaajat/a'].jaksofokus = null;
  data['seurat/kpv/pelaajat/a'].jaksofokus_historia = [{ sulkutapa: 'suljettu', paattyi: iso(loppu), suljettu: iso(loppu + 20 * DAY) }];
  const db1 = luoDb(JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(data)))) && Object.assign({}, data));
  await S.laskeSeura(deps(db1), 'kpv', { rajat: H.viikonRajat(NYT), nytMs: NYT });
  assert.strictEqual(db1.STORE.get('seurat/kpv/kooste/2026-W41').joukkueet.u13.n_katselmus_perusta, 1);
  assert.strictEqual(db1.STORE.get('seurat/kpv/kooste/2026-W41').joukkueet.u13.n_katselmus_ajallaan, 0);
  const data2 = Object.assign({}, data); data2['seurat/kpv/pelaajat/a/reviewit/2026-10-02'] = { tyyppi: 'mdr' };   // ikkunassa (25.9.–9.10.)
  const db2 = luoDb(data2); await S.laskeSeura(deps(db2), 'kpv', { rajat: H.viikonRajat(NYT), nytMs: NYT });
  assert.strictEqual(db2.STORE.get('seurat/kpv/kooste/2026-W41').joukkueet.u13.n_katselmus_ajallaan, 1);
});

test('arvio:true merkitään; eiYlikirjoitaTodellista ei korvaa oikeaa koostetta', async () => {
  const db = luoDb(seuraData('kpv')); const rajat = H.viikonRajat(NYT);
  await S.laskeSeura(deps(db), 'kpv', { rajat, nytMs: NYT, arvio: true }); assert.strictEqual(db.STORE.get('seurat/kpv/kooste/2026-W41').arvio, true); assert.strictEqual(db.STORE.get('seurat/kpv/kooste_joukkue/u13_2026-W41').arvio, true);
  await S.laskeSeura(deps(db), 'kpv', { rajat, nytMs: NYT, arvio: false });   // oikea ajo korvaa arvion
  assert.ok(!('arvio' in db.STORE.get('seurat/kpv/kooste/2026-W41')));
  const n = db.kirjoitukset.length; const r = await S.laskeSeura(deps(db), 'kpv', { rajat, nytMs: NYT, arvio: true, eiYlikirjoitaTodellista: true });
  assert.strictEqual(r.ohitettu, 'todellinen_olemassa'); assert.strictEqual(db.kirjoitukset.length, n); assert.ok(!('arvio' in db.STORE.get('seurat/kpv/kooste/2026-W41')));
});

test('ajastetut: sunnuntai = kuluva viikko; maanantai 06:00 = EDELLINEN viikko (arviointi silti su 21:00)', async () => {
  const db = luoDb(seuraData('kpv'));
  await S.ajastettuKasittelija(deps(db), 'sunnuntai')(); assert.ok(db.STORE.has('seurat/kpv/kooste/2026-W41'));
  const db2 = luoDb(seuraData('kpv')); const ma = Date.UTC(2026, 9, 12, 3, 0);   // ma 12.10. klo 06:00 Helsinki
  await S.ajastettuKasittelija(deps(db2, { nyt: () => ma }), 'maanantai')();
  assert.ok(db2.STORE.has('seurat/kpv/kooste/2026-W41')); assert.ok(!db2.STORE.has('seurat/kpv/kooste/2026-W42'));
  assert.strictEqual(db2.STORE.get('seurat/kpv/kooste/2026-W41').joukkueet.u13.n_jaksolla, 2);
});

test('paivitaSeuranKooste: johto ja SA saavat; valmentaja, pelaaja, kirjautumaton ei; jäähy 30 s', async () => {
  const db = luoDb(seuraData('kpv'));
  const oikeudet = { u_vp: { sallittu: true, rooli: 'vp' }, u_utj: { sallittu: true, rooli: 'urheilutoimenjohtaja' }, u_sihteeri: { sallittu: true, rooli: 'seurasihteeri' }, u_sa: { sallittu: true, rooli: 'superadmin' }, u_valm: { sallittu: true, rooli: 'valmentaja' }, u_talent: { sallittu: true, rooli: 'talenttivalmentaja' }, u_pelaaja: { sallittu: false, rooli: null } };
  const kas = S.paivitaKasittelija(deps(db, { tarkistaOikeus: async (uid) => oikeudet[uid] || { sallittu: false, rooli: null } }));
  await assert.rejects(() => kas({ seuraId: 'kpv' }, {}), (e) => e.code === 'unauthenticated');
  await assert.rejects(() => kas({}, { auth: { uid: 'u_vp', token: {} } }), (e) => e.code === 'invalid-argument');
  for (const uid of ['u_valm', 'u_talent', 'u_pelaaja', 'u_tuntematon']) await assert.rejects(() => kas({ seuraId: 'kpv' }, { auth: { uid, token: {} } }), (e) => e.code === 'permission-denied', uid);
  await assert.rejects(() => kas({ seuraId: 'ei-ole' }, { auth: { uid: 'u_vp', token: {} } }), (e) => e.code === 'not-found');
  assert.ok(!db.STORE.has('seurat/kpv/kooste/2026-W41'), 'evätty kutsu ei kirjoita');
  const r = await kas({ seuraId: 'kpv' }, { auth: { uid: 'u_vp', token: {} } }); assert.strictEqual(r.vk, '2026-W41'); assert.strictEqual(r.tuore, false); assert.ok(db.STORE.has('seurat/kpv/kooste/2026-W41'));
  for (const uid of ['u_utj', 'u_sihteeri', 'u_sa']) { const x = await kas({ seuraId: 'kpv' }, { auth: { uid, token: {} } }); assert.strictEqual(x.vk, '2026-W41'); }
  // jäähy: laskettu < 30 s sitten → ei uutta laskentaa
  db.STORE.get('seurat/kpv/kooste/2026-W41').laskettu = { toMillis: () => NYT - 5000 };
  const n = db.kirjoitukset.length; const j = await kas({ seuraId: 'kpv' }, { auth: { uid: 'u_vp', token: {} } }); assert.strictEqual(j.tuore, true); assert.strictEqual(db.kirjoitukset.length, n);
  db.STORE.get('seurat/kpv/kooste/2026-W41').laskettu = { toMillis: () => NYT - 60000 };
  assert.strictEqual((await kas({ seuraId: 'kpv' }, { auth: { uid: 'u_vp', token: {} } })).tuore, false);
});

test('index.js: kolme funktiota rekisteröity — su 21:00 ja ma 06:00 Europe/Helsinki, callable App Checkillä', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(src, /exports\.laskeSeuranKooste = functions[\s\S]*?\.pubsub\.schedule\('0 21 \* \* 0'\)\s*\.timeZone\('Europe\/Helsinki'\)/);
  assert.match(src, /exports\.laskeSeuranKoosteMa = functions[\s\S]*?\.pubsub\.schedule\('0 6 \* \* 1'\)\s*\.timeZone\('Europe\/Helsinki'\)/);
  assert.match(src, /exports\.paivitaSeuranKooste = functions[\s\S]*?enforceAppCheck: true[\s\S]*?\.https\.onCall\(seuranKooste\.paivitaKasittelija/);
  assert.match(src, /region\('europe-west1'\)[\s\S]{0,200}pubsub\.schedule\('0 21 \* \* 0'\)/);
});

test('takaisinlaskenta (Excel_Tuonti, vain SA): oletus KUIVA — ei kirjoita; palauttaa vain lukumääriä 3 viikolta (vanhin ensin)', async () => {
  const db = luoDb(seuraData('kpv', { vastaus: true }));
  const kas = S.paivitaKasittelija(deps(db, { tarkistaOikeus: async (uid) => (uid === 'u_sa' ? { sallittu: true, rooli: 'superadmin' } : { sallittu: true, rooli: 'vp' }) }));
  const r = await kas({ seuraId: 'kpv', takaisin: 3 }, { auth: { uid: 'u_sa', token: {} } });   // kuiva puuttuu → true
  assert.strictEqual(r.kuiva, true); assert.strictEqual(r.takaisin, 3); assert.deepStrictEqual(r.viikot.map((w) => w.vk), ['2026-W38', '2026-W39', '2026-W40']);
  assert.strictEqual(db.kirjoitukset.length, 0, 'kuiva-ajo ei kirjoita');
  const w = r.viikot[2]; assert.strictEqual(w.joukkueita, 1); assert.strictEqual(typeof w.pelaajat, 'number');
  const s = JSON.stringify(r); for (const kielletty of ['Aleksi', 'Mäkinen', 'Eeli', '"a"', '"b"', 'pelaajaId']) assert.ok(!s.includes(kielletty), 'vastauksessa vain lukumääriä: ' + kielletty);
});

test('takaisinlaskenta kuiva:false kirjoittaa arvio:true -dokumentit; EI korvaa oikeaa koostetta; muu kuin SA evätty; virheellinen takaisin hylätään', async () => {
  const data = seuraData('kpv'); data['seurat/kpv/kooste/2026-W39'] = { vk: '2026-W39', versio: 1, joukkueet: {}, oikea: true };   // oikea (ei-arvio) kooste olemassa
  const db = luoDb(data);
  const kas = S.paivitaKasittelija(deps(db, { tarkistaOikeus: async (uid) => (uid === 'u_sa' ? { sallittu: true, rooli: 'superadmin' } : { sallittu: true, rooli: 'vp' }) }));
  await assert.rejects(() => kas({ seuraId: 'kpv', takaisin: 3 }, { auth: { uid: 'u_vp', token: {} } }), (e) => e.code === 'permission-denied');   // johtokaan ei
  for (const huono of [0, 9, 2.5, 'x', -1]) await assert.rejects(() => kas({ seuraId: 'kpv', takaisin: huono }, { auth: { uid: 'u_sa', token: {} } }), (e) => e.code === 'invalid-argument', String(huono));
  assert.strictEqual(db.kirjoitukset.length, 0);
  const r = await kas({ seuraId: 'kpv', takaisin: 3, kuiva: false }, { auth: { uid: 'u_sa', token: {} } });
  assert.strictEqual(r.kuiva, false); assert.strictEqual(r.viikot.find((w) => w.vk === '2026-W39').ohitettu, 'todellinen_olemassa');
  assert.strictEqual(db.STORE.get('seurat/kpv/kooste/2026-W38').arvio, true); assert.strictEqual(db.STORE.get('seurat/kpv/kooste/2026-W40').arvio, true); assert.strictEqual(db.STORE.get('seurat/kpv/kooste_joukkue/u13_2026-W40').arvio, true);
  assert.strictEqual(db.STORE.get('seurat/kpv/kooste/2026-W39').oikea, true, 'oikea kooste koskematon'); assert.ok(!('arvio' in db.STORE.get('seurat/kpv/kooste/2026-W39')));
  assert.ok(!db.STORE.has('seurat/kpv/kooste/2026-W41'), 'takaisinlaskenta ei kosketa kuluvaa viikkoa');
  // kuiva:true näyttää ohituksen jo kuivana
  const k = await kas({ seuraId: 'kpv', takaisin: 3, kuiva: true }, { auth: { uid: 'u_sa', token: {} } }); assert.ok(k.viikot.some((w) => w.ohitettu));
});

// ── S1.1 Käyttöaste: palvelin kerää pelaajan/huoltajan OMAT kirjoitukset ja kirjautumisaikaleimat (vain päivämääriä, ei sisältöä) ──
test('S1.1: laskeSeura laskee suostumuksen, kirjautumisen, huoltajakäynnin ja aktiivisuuden 7/30 pv kaikista lähteistä; ei vuotoja', async () => {
  const d = seuraData('kpv');
  const P = (id) => 'seurat/kpv/pelaajat/' + id;
  Object.assign(d[P('a')], { suostumusTila: 'annettu', viimeisinKirjautuminen: '2026-10-10', huoltajaViimeisinKaynti: '2026-10-09' });
  Object.assign(d[P('b')], { suostumus: { annettu: true } });                                   // vanha muoto (suostumusAnnettu hyväksyy)
  d[P('a') + '/kirjaukset/2026-10-08'] = { tehty: true };                                         // (1) a: kirjaus 7 pv sisällä
  d[P('a') + '/kirjaukset/2026-08-01'] = { tehty: true };                                         // ikkunan ulkopuolella
  d[P('b') + '/viikkokatsaukset/2026-09-20'] = { vk: 1 };                                         // (2) b: viikkokatsaus 30 pv sisällä, ei 7
  d['seurat/kpv/kalenteri/e1'] = { pvm: '2026-10-14', nimi: 'Harjoitus' };                        // (3) tuleva tapahtuma, RSVP tehty ikkunassa
  d['seurat/kpv/kalenteri/e1/lasnaolijat/b'] = { saatavuus: 'tulossa', rooli: 'vanhempi', paivitetty: '2026-10-06T10:00:00.000Z' };
  d['seurat/kpv/kalenteri/e1/lasnaolijat/a'] = { tila: 'paikalla', rooli: 'valmentaja', paivitetty: '2026-10-10T10:00:00.000Z' };   // valmentajan kirjaus EI ole pelaajan oma
  d['seurat/kpv/kalenteri/e0'] = { pvm: '2026-06-01' };                                           // vanha tapahtuma ohitetaan
  d['seurat/kpv/viestit/v1'] = { tyyppi: 'klippi_vastaus', pelaajaId: 'a', aika: { toDate: () => new Date('2026-10-07T12:00:00Z') } };   // (4)
  d['seurat/kpv/viestit/v2'] = { tyyppi: 'klippi', pelaajaId: 'b', aika: '2026-10-09T00:00:00Z' };                                       // valmentajan klippi ei ole oma
  const db = luoDb(d);
  await S.laskeSeura(deps(db), 'kpv', { rajat: H.viikonRajat(NYT), nytMs: NYT });
  const j = db.STORE.get('seurat/kpv/kooste/2026-W41').joukkueet.u13;
  assert.strictEqual(j.n_pelaajat, 2);                       // c on poistettu
  assert.strictEqual(j.n_suostumus, 2);
  assert.strictEqual(j.n_kirjautunut_30, 1); assert.strictEqual(j.n_huoltaja_30, 1);
  assert.strictEqual(j.n_aktiivinen_7, 2);                   // a (kirjaus 8.10. + klippivastaus 7.10.), b (RSVP 6.10.)
  assert.strictEqual(j.n_aktiivinen_30, 2);
  const s = JSON.stringify([...db.STORE.entries()].filter(([p]) => /kooste/.test(p)));
  for (const kielletty of ['2026-10-08', '2026-09-20', 'tulossa', 'Harjoitus', 'klippi', 'viimeisin', 'Aleksi']) assert.ok(!s.includes(kielletty), 'vuoto: ' + kielletty);
});

test('S1.1: ikkuna päättyy arviointihetkeen — takaisinlaskennassa myöhemmät päivät eivät lasketa; valmentajan/lähettäjän kirjoitus ei ole pelaajan', async () => {
  const d = seuraData('kpv');
  d['seurat/kpv/pelaajat/a/kirjaukset/2026-10-20'] = { tehty: true };       // arvion (11.10.) jälkeen
  const db = luoDb(d);
  await S.laskeSeura(deps(db), 'kpv', { rajat: H.viikonRajat(NYT), nytMs: NYT });
  assert.strictEqual(db.STORE.get('seurat/kpv/kooste/2026-W41').joukkueet.u13.n_aktiivinen_30, 0);
});

test('S1.1: lähdekysely epäonnistuu → ei kirjoiteta (virhe nousee, ei puolikasta koostetta)', async () => {
  const db = luoDb(seuraData('kpv'), { heitaPolulle: '/kirjaukset' });
  await assert.rejects(S.laskeSeura(deps(db), 'kpv', { rajat: H.viikonRajat(NYT), nytMs: NYT }), /mock-virhe/);
  assert.deepStrictEqual(db.kirjoitukset, []);
});

test('S1.1: takaisinlaskenta (arvio:true) toimii käyttöasteelle — aktiivisuus vain arviohetkeen asti; yhteenveto sisältää uudet luvut', async () => {
  const d = seuraData('kpv'); const P = 'seurat/kpv/pelaajat/a';
  d[P + '/kirjaukset/2026-09-30'] = { tehty: true };   // viikon W40 (28.9.–4.10.) sisällä, W38:n (14.–20.9.) arviohetken jälkeen
  const db = luoDb(d);
  const kas = S.paivitaKasittelija(deps(db, { tarkistaOikeus: async () => ({ sallittu: true, rooli: 'superadmin' }) }));
  const r = await kas({ seuraId: 'kpv', takaisin: 3 }, { auth: { uid: 'u_sa', token: {} } });
  const w = Object.fromEntries(r.viikot.map((x) => [x.vk, x]));
  assert.strictEqual(w['2026-W38'].aktiivinen_30, 0);      // kirjaus 30.9. on W38-arvion (su 20.9.) jälkeen
  assert.strictEqual(w['2026-W40'].aktiivinen_30, 1); assert.strictEqual(w['2026-W40'].aktiivinen_7, 1);
  for (const k of ['suostumus', 'kirjautunut_30', 'huoltaja_30']) assert.strictEqual(typeof w['2026-W40'][k], 'number', k);
});
