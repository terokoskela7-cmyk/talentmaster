'use strict';
/**
 * K2 (CODE_BRIEF_K2_APURI_KAAVIO 2.11.2026): valmennusapurin kaavio. Offline (node:test).
 * Poiminta, avaimen normalisointi, validaattori (sama kuin editorissa), koodisuodatin selitteisiin,
 * lippu ja rooli käsittelijän läpi muisti-Firestorea vasten.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const functions = require('firebase-functions/v1');
const va = require('../valmennusapuri');
const K = require('../valmennusapuri_kaavio');

const SPEC = {
  avain: 'Y-H5', suunta: 'ylos', pelimuoto: '2v2+1', nakyma: 'alue',
  vyohyke: { x: 39, y: 43, w: 22, h: 14 },
  pelaajat: [
    { id: 'A', joukkue: 'oma', rooli: 'syöttäjä', x: 45, y: 54, pallo: true },
    { id: 'B', joukkue: 'oma', rooli: 'vastaanottaja', x: 55, y: 46 },
    { id: 'J', joukkue: 'oma', rooli: 'tuki', x: 50, y: 56 },
    { id: 'V1', joukkue: 'vastustaja', rooli: 'paine', x: 47, y: 51 },
    { id: 'V2', joukkue: 'vastustaja', rooli: 'paine', x: 53, y: 49 },
  ],
  liikkeet: [{ id: 'm1', tyyppi: 'syotto', from: { ref: 'A' }, to: { ref: 'B' } }],
  selitteet: [{ id: 's1', x: 50, y: 59, t: { fi: 'Jokeri pelaa pallollisen kanssa' } }],
};
const lohko = (spec) => '<kaavio>' + JSON.stringify(spec || SPEC) + '</kaavio>';
const VASTAUS = 'Konseptipeli: 2v2+1 alueella 15×15 m.\n\n' + lohko();

// ── Poiminta ──────────────────────────────────────────────────────────────────
test('K2 poiminta: ei lohkoa → teksti ennallaan, tila null', () => {
  const r = K.kasitteleKaavio('Pelkkä teksti.', { paalla: true });
  assert.deepStrictEqual(r, { teksti: 'Pelkkä teksti.', kaavio: null, tila: null, virheet: [], merkit: null });
});
test('K2 poiminta: yksi lohko → ok, spec palautuu, lohko pois tekstistä', () => {
  const r = K.kasitteleKaavio(VASTAUS, { paalla: true });
  assert.strictEqual(r.tila, 'ok');
  assert.strictEqual(r.teksti, 'Konseptipeli: 2v2+1 alueella 15×15 m.');
  assert.strictEqual(r.kaavio.avain, 'y_h5');
  assert.ok(r.merkit > 100);
  assert.deepStrictEqual(r.virheet, []);
});
test('K2 poiminta: kaksi lohkoa → hylätty, molemmat pois tekstistä', () => {
  const r = K.kasitteleKaavio('Alku ' + lohko() + ' väli ' + lohko() + ' loppu', { paalla: true });
  assert.strictEqual(r.tila, 'hylatty');
  assert.strictEqual(r.kaavio, null);
  assert.match(r.virheet[0], /useampi kaaviolohko \(2\)/);
  assert.ok(!/kaavio>|"avain"/.test(r.teksti), r.teksti);
});
test('K2 poiminta: rikki JSON → hylätty, ei raakaa JSONia tekstiin', () => {
  const r = K.kasitteleKaavio('Teksti.\n<kaavio>{"avain": "Y-H5", </kaavio>', { paalla: true });
  assert.strictEqual(r.tila, 'hylatty');
  assert.deepStrictEqual(r.virheet, ['rikkinäinen JSON']);
  assert.strictEqual(r.teksti, 'Teksti.');
});
test('K2 poiminta: katkennut lohko (ei loppumerkkiä) → loppuosa pois, hylätty', () => {
  const r = K.kasitteleKaavio('Teksti.\n<kaavio>{"avain":"Y-H5","pelaajat":[', { paalla: true });
  assert.strictEqual(r.teksti, 'Teksti.');
  assert.strictEqual(r.tila, 'hylatty');
});
test('K2 poiminta: ```json-aita lohkon sisällä sallitaan', () => {
  const r = K.kasitteleKaavio('<kaavio>\n```json\n' + JSON.stringify(SPEC) + '\n```\n</kaavio>', { paalla: true });
  assert.strictEqual(r.tila, 'ok');
});

// ── Avain ─────────────────────────────────────────────────────────────────────
test('K2 avain: Y-H5 → y_h5, y_p4 sellaisenaan, tuntematon → null', () => {
  assert.strictEqual(K.normalisoiAvain('Y-H5'), 'y_h5');
  assert.strictEqual(K.normalisoiAvain(' y-p4 '), 'y_p4');
  assert.strictEqual(K.normalisoiAvain('y_h0'), 'y_h0');
  assert.strictEqual(K.normalisoiAvain('Y-H15'), null);
  assert.strictEqual(K.normalisoiAvain('J-H1'), null);
  assert.strictEqual(K.normalisoiAvain('t_h0'), null);
  assert.strictEqual(K.normalisoiAvain(5), null);
});
test('K2 avain: tuntematon avain → hylätty', () => {
  const r = K.kasitteleKaavio(lohko(Object.assign({}, SPEC, { avain: 'Y-H99' })), { paalla: true });
  assert.strictEqual(r.tila, 'hylatty');
  assert.match(r.virheet[0], /tuntematon avain: Y-H99/);
});

// ── Validaattori ──────────────────────────────────────────────────────────────
test('K2 validaattori: virhe → ei kaaviota, virheet talteen (max 10)', () => {
  const pel = []; for (let i = 0; i < 14; i++) pel.push({ id: 'P' + i, joukkue: 'muu', rooli: 'x', x: 50, y: 50 });
  const r = K.kasitteleKaavio(lohko(Object.assign({}, SPEC, { pelaajat: pel })), { paalla: true });
  assert.strictEqual(r.tila, 'hylatty');
  assert.strictEqual(r.kaavio, null);
  assert.strictEqual(r.virheet.length, 10);
});
test('K2 validaattori: KPI tarkistetaan kaanonia vasten (y_h8 KPI:t a–c → d hylätään)', () => {
  const r = K.kasitteleKaavio(lohko(Object.assign({}, SPEC, { avain: 'Y-H8', kpi: 'd' })), { paalla: true });
  assert.strictEqual(r.tila, 'hylatty');
  assert.match(r.virheet.join(' '), /kpi "d" ei ole konseptin y_h8 KPI-listalla/);
  assert.strictEqual(K.kasitteleKaavio(lohko(Object.assign({}, SPEC, { avain: 'Y-H8', kpi: 'c' })), { paalla: true }).tila, 'ok');
});
test('K2 pelimuoto: 2v2+1 + jokeri omana → ok; 2v2 + jokeri → hylätty; tuntematon muoto → hylätty', () => {
  assert.strictEqual(K.kasitteleKaavio(lohko(), { paalla: true }).tila, 'ok');
  const r = K.kasitteleKaavio(lohko(Object.assign({}, SPEC, { pelimuoto: '2v2' })), { paalla: true });
  assert.match(r.virheet.join(' '), /omia 3 > pelimuoto 2/);
  const r2 = K.kasitteleKaavio(lohko(Object.assign({}, SPEC, { pelimuoto: '2 vs 2' })), { paalla: true });
  assert.match(r2.virheet[0], /pelimuoto ei kelpaa/);
});

// ── Koodit ────────────────────────────────────────────────────────────────────
test('K2 koodit eivät vuoda selitteisiin eivätkä tilanteeseen', () => {
  const s = Object.assign({}, SPEC, {
    selitteet: [{ id: 's1', x: 50, y: 59, t: { fi: 'Avaudu (Y-H5) ja katso', sv: 'Y-H5: öppna' } }],
    tilanne: { fi: 'Paine Y-H5b', sv: '', en: '' },
  });
  const suodata = (t) => va.suodataKoodit(t, ['U12, 2v2+1']).teksti;
  const r = K.kasitteleKaavio(lohko(s), { paalla: true, suodata });
  assert.strictEqual(r.tila, 'ok');
  assert.strictEqual(JSON.stringify(r.kaavio).match(/Y-H\d/g), null);
  assert.strictEqual(r.kaavio.selitteet[0].t.fi, 'Avaudu ja katso');
});
test('K2 koodit: selite joka suodattuu tyhjäksi → validaattori hylkää (ei tyhjää lappua kuvaan)', () => {
  const s = Object.assign({}, SPEC, { selitteet: [{ id: 's1', x: 50, y: 59, t: { fi: 'Y-H5' } }] });
  const r = K.kasitteleKaavio(lohko(s), { paalla: true, suodata: (t) => va.suodataKoodit(t, []).teksti });
  assert.strictEqual(r.tila, 'hylatty');
  assert.match(r.virheet.join(' '), /selite s1: teksti puuttuu/);
});

// ── Lippu pois ────────────────────────────────────────────────────────────────
test('K2 lippu pois → ei poimintaa, mutta raaka lohko poistetaan tekstistä', () => {
  const r = K.kasitteleKaavio(VASTAUS, { paalla: false });
  assert.deepStrictEqual(r, { teksti: 'Konseptipeli: 2v2+1 alueella 15×15 m.', kaavio: null, tila: null, virheet: [], merkit: null });
});

// ── Käsittelijä (muisti-Firestore) ────────────────────────────────────────────
function muistiDb(alku) {
  const data = Object.assign({ 'admins/sa': { rooli: 'super_admin' } }, alku || {});
  let n = 1;
  const ref = (p) => ({ id: p.split('/').pop(), get: async () => ({ exists: data[p] !== undefined, data: () => data[p] }),
    set: async (v, o) => { data[p] = o && o.merge ? Object.assign({}, data[p] || {}, v) : v; } });
  return { data, collection: (k) => ({ doc: (id) => ref(k + '/' + id), add: async (v) => { const id = 'l' + (n++); data[k + '/' + id] = v; return { id }; } }),
    runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, v, o) => r.set(v, o) }) };
}
function kasittelija(env, vastaus) {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv', roolit: ['hp'] } });
  const h = va.kasittelija({ firestore: () => db }, functions, {
    env: Object.assign({ VALMENNUSAPURI_PAIVAKIINTIO: '50' }, env || {}),
    haeTietopohja: async () => ({ system: [{ type: 'text', text: 'ohje' }], versio: '0.21', tiedostoja: 1 }),
    haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
    haeSeuranLinja: async () => null,
    kutsuMallia: async () => ({ teksti: vastaus || VASTAUS, syy: 'end_turn', tokenit: { syote: 1, tuotos: 1, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } }),
  });
  const loki = () => Object.keys(db.data).filter((k) => k.startsWith('valmennusapuri_loki/')).map((k) => db.data[k]).pop();
  return { h, loki };
}
const kys = (rooli) => ({ viestit: [{ role: 'user', content: 'U12, 2v2+1: miten harjoitellaan?' }], rooli });
const ctx = { auth: { uid: 'v1', token: {} } };

test('K2 käsittelijä: lippu päällä + VA → kaavio vastauksessa, lokissa ok + merkit, teksti ilman lohkoa', async () => {
  const { h, loki } = kasittelija({ VALMENNUSAPURI_KAAVIO: '1' });
  const r = await h(kys(), ctx);
  assert.strictEqual(r.kaavio.avain, 'y_h5');
  assert.strictEqual(r.vastaus, 'Konseptipeli: 2v2+1 alueella 15×15 m.');
  const l = loki();
  assert.strictEqual(l.kaavio, 'ok');
  assert.deepStrictEqual(l.kaavioVirheet, []);
  assert.ok(l.kaavioMerkit > 100);
  assert.ok(!/<kaavio>/.test(l.vastaus));
});
test('K2 käsittelijä: validaattorivirhe → ei kaavio-kenttää, teksti palautuu, ei virhettä käyttäjälle', async () => {
  const huono = 'Teksti.\n' + lohko(Object.assign({}, SPEC, { pelimuoto: '1v1' }));
  const { h, loki } = kasittelija({ VALMENNUSAPURI_KAAVIO: '1' }, huono);
  const r = await h(kys(), ctx);
  assert.strictEqual('kaavio' in r, false);
  assert.strictEqual(r.vastaus, 'Teksti.');
  assert.strictEqual(loki().kaavio, 'hylatty');
  assert.ok(loki().kaavioVirheet.length > 0);
});
test('K2 käsittelijä: lippu pois (oletus) → ei kaaviota, lohko silti pois tekstistä, loki null', async () => {
  const { h, loki } = kasittelija({});
  const r = await h(kys(), ctx);
  assert.strictEqual('kaavio' in r, false);
  assert.strictEqual(r.vastaus, 'Konseptipeli: 2v2+1 alueella 15×15 m.');
  assert.strictEqual(loki().kaavio, null);
  assert.strictEqual(va.asetukset({}).kaavio, false);
});
test('K2 käsittelijä: HP-rooli → ei kaaviota vaikka lippu päällä, lohko pois', async () => {
  const { h, loki } = kasittelija({ VALMENNUSAPURI_KAAVIO: '1' });
  const r = await h(kys('hp'), ctx);
  assert.strictEqual('kaavio' in r, false);
  assert.ok(!/<kaavio>|"avain"/.test(r.vastaus));
  assert.strictEqual(loki().kaavio, null);
});
test('K2 käsittelijä: JSON:n koodi "Y-H5" ei sotke tekstin koodisuodatinta (lohko pois ensin)', async () => {
  const { h, loki } = kasittelija({ VALMENNUSAPURI_KAAVIO: '1' });
  await h(kys(), ctx);
  assert.deepStrictEqual(loki().poistetutKoodit, []);
});
