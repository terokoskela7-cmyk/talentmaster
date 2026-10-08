'use strict';
/** B4 — haePelaajanKalenteri (functions/pelaajan_kalenteri.js): oikeus, rajaus (jäsenyys §7.18, nakyvyys, ryhmä/pelaajat_id), ikkuna, 24 h -pudotus, 20 aikaisinta, kenttävartija. */
const { test } = require('node:test');
const assert = require('node:assert');
const H = require('../pelaajan_kalenteri');
const class_ = (c, m) => Object.assign(new Error(m), { code: c });
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const NYT = Date.UTC(2026, 9, 20, 10, 0);   // ti 20.10.2026 13:00 Helsinki
const ts = (ms) => ({ toDate: () => new Date(ms), _ms: ms });
const Timestamp = { fromDate: (d) => ts(d.getTime()) };
const PV = 24 * 3600 * 1000;
function ev(id, alkuPv, extra) { return Object.assign({ id, nimi: 'T ' + id, tyyppi: 'harjoitus', alkaa: ts(NYT + alkuPv * PV), paattyy: ts(NYT + alkuPv * PV + 3600000), joukkue: 'kpv_u13', joukkueet: ['kpv_u13'], poistettu: false }, extra || {}); }
function luoDb(o) {
  const lukuja = { kalenteri: 0 };
  const lasn = o.lasnaolijat || {};
  const kal = (alku, loppu) => ({ get: async () => { const docs = o.eventit.filter((e) => (alku == null || e.alkaa._ms >= alku) && (loppu == null || e.alkaa._ms <= loppu)); lukuja.kalenteri += docs.length; return { forEach: (f) => docs.forEach((e) => f({ id: e.id, data: () => { const c = Object.assign({}, e); delete c.id; return c; } })) }; } });
  const seura = { collection: (n) => {
    if (n === 'pelaajat') return { doc: (pid) => ({ get: async () => ({ exists: !!o.pelaajat[pid], data: () => o.pelaajat[pid] }) }) };
    if (n === 'joukkueet') return { get: async () => ({ forEach: (f) => o.joukkueet.forEach((j) => f({ id: j.id, data: () => ({ nimi: j.nimi }) })) }) };
    if (n === 'kalenteri') return Object.assign({ doc: (eid) => ({ collection: () => ({ doc: (pid) => ({ get: async () => ({ exists: !!lasn[eid + '/' + pid], data: () => lasn[eid + '/' + pid] }) }) }) }) },
      { where: (_k, _o1, a) => ({ where: (_k2, _o2, l) => kal(a._ms, l._ms) }) });
    throw new Error('? ' + n);
  } };
  return { lukuja, collection: () => ({ doc: () => seura }) };
}
const JOUKKUEET = [{ id: 'kpv_u13', nimi: 'KPV U13' }, { id: 'kpv_u15', nimi: 'KPV U15' }, { id: 'sibbo_p12', nimi: '2014' }, { id: 'sibbo_bl', nimi: '2014 Blå' }];
const PELAAJA = { etunimi: 'Toppari', huoltajaEmail: 'aiti@esimerkki.fi', suostumusTila: 'annettu', joukkue: 'KPV U13', joukkueet: ['kpv_u13'] };
const pelaajaTok = { auth: { token: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'p1' } } };
const huoltajaTok = (x) => ({ auth: { token: Object.assign({ email: 'Aiti@Esimerkki.fi', email_verified: true }, x || {}) } });
const aja = (o, ctx, data) => H.luoKasittelija({ db: luoDb(o), HttpsError, Timestamp, nyt: () => NYT })(data || { seuraId: 'kpv', pelaajaId: 'p1' }, ctx);
const perus = (eventit, p) => ({ eventit, pelaajat: { p1: p || PELAAJA }, joukkueet: JOUKKUEET });
const idt = (r) => r.tapahtumat.map((t) => t.id);

test('OIKEUDET: pelaaja itse ✓; toisen pelaajan token ✗; muu seura ✗; huoltaja (vahvistettu email, suostumus) ✓; väärä huoltaja ✗; vahvistamaton ✗; ilman suostumusta ✗; henkilökunta ✗; anonyymi ✗; kirjautumaton ✗', async () => {
  const o = perus([ev('a', 1)]);
  assert.deepStrictEqual(idt(await aja(o, pelaajaTok)), ['a']);
  await assert.rejects(aja(o, { auth: { token: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'p2' } } }), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, { auth: { token: { rooli: 'pelaaja', pelaajaSeuraId: 'hjk', pelaajaId: 'p1' } } }), (e) => e.code === 'permission-denied');
  assert.deepStrictEqual(idt(await aja(o, huoltajaTok())), ['a']);
  await assert.rejects(aja(o, huoltajaTok({ email: 'toinen@esimerkki.fi' })), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, huoltajaTok({ email_verified: false })), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, huoltajaTok({ email_verified: undefined })), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(perus([ev('a', 1)], Object.assign({}, PELAAJA, { suostumusTila: 'odottaa' })), huoltajaTok()), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, { auth: { token: { rooli: 'valmentaja', seuraId: 'kpv', uid: 'v1' } } }), (e) => e.code === 'permission-denied');   // ei email → hylkäys
  await assert.rejects(aja(o, { auth: { token: { firebase: { sign_in_provider: 'anonymous' } } } }), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, { auth: { token: { rooli: 'solo_lapsi' } } }), (e) => e.code === 'permission-denied');
  await assert.rejects(aja(o, {}), (e) => e.code === 'unauthenticated');
  await assert.rejects(aja(o, pelaajaTok, { seuraId: 'a/b', pelaajaId: 'p1' }), (e) => e.code === 'invalid-argument');
  await assert.rejects(aja({ eventit: [], pelaajat: {}, joukkueet: [] }, pelaajaTok), (e) => e.code === 'permission-denied');   // pelaajaa ei ole → ei vuoda olemassaoloa
});
test('RAJAUS: oma joukkue ✓, toinen joukkue ✗, kaksi joukkuetta (§7.18) ✓ molemmat, pelaajat_id ✓, ryhmätapahtuma (pelaaja ryhmässä ✓ / ei ✗), poistettu ✗', async () => {
  const p = Object.assign({}, PELAAJA, { joukkueet: ['kpv_u13', 'kpv_u15'] });
  const e = [ev('oma', 1), ev('toinen', 2, { joukkue: 'sibbo_p12', joukkueet: ['sibbo_p12'] }), ev('u15', 3, { joukkue: 'kpv_u15', joukkueet: ['kpv_u15'] }),
    ev('poimittu', 4, { joukkue: null, joukkueet: [], pelaajat_id: ['p1', 'p9'] }), ev('ryhma_ei', 5, { joukkue: null, joukkueet: [], kohde: { tyyppi: 'ryhma' }, pelaajat_id: ['p8'] }),
    ev('ryhma_on', 6, { joukkue: null, joukkueet: [], kohde: { tyyppi: 'ryhma' }, pelaajat_id: ['p8', 'p1'] }), ev('poistettu', 7, { poistettu: true })];
  assert.deepStrictEqual(idt(await aja(perus(e, p), pelaajaTok)), ['oma', 'u15', 'poimittu', 'ryhma_on']);
  assert.deepStrictEqual(idt(await aja(perus(e), pelaajaTok)), ['oma', 'poimittu', 'ryhma_on']);   // vain kpv_u13
});
test('JÄSENYYS §7.18: Sibbo Blå — joukkue-nimi "2014 Blå" mutta joukkueet[] = [sibbo_bl] → vain Blå-tapahtumat (ei p12:ta nimen perusteella)', async () => {
  const p = { etunimi: 'Blå', suostumusTila: 'annettu', joukkue: '2014', joukkueet: ['sibbo_bl'] };
  const e = [ev('bl', 1, { joukkue: 'sibbo_bl', joukkueet: ['sibbo_bl'] }), ev('p12', 2, { joukkue: 'sibbo_p12', joukkueet: ['sibbo_p12'] }), ev('nimella', 3, { joukkue: '2014 Blå', joukkueet: [] })];
  assert.deepStrictEqual(idt(await aja(perus(e, p), pelaajaTok)), ['bl', 'nimella']);   // vanha tapahtuma, jonka joukkue on NIMI → kanonisoituu docille sibbo_bl
});
test('NÄKYVYYS: henkilokunta ✗ (myös vanha palaveri ilman kenttää), nakyvyys:kaikki -palaveri ✓', async () => {
  const e = [ev('hk', 1, { nakyvyys: 'henkilokunta' }), ev('palaveri', 2, { tyyppi: 'valmentajapalaveri' }), ev('palaveri_kaikki', 3, { tyyppi: 'valmentajapalaveri', nakyvyys: 'kaikki' }), ev('ok', 4)];
  assert.deepStrictEqual(idt(await aja(perus(e), pelaajaTok)), ['palaveri_kaikki', 'ok']);
});
test('IKKUNA: alkaa −7…+30 pv (Helsinki); >24 h menneet pois (paattyy / alkaa jos paattyy puuttuu); monipäiväinen leiri joka alkoi −5 pv ja päättyy +2 pv mukana; 20 aikaisinta', async () => {
  const e = [ev('liian_vanha_alku', -8), ev('vanha', -3), ev('leiri', -5, { paattyy: ts(NYT + 2 * PV) }), ev('eilen_ilman_paattyy', -1, { paattyy: undefined }), ev('tulossa', 29), ev('liian_kaukana', 32)];
  assert.deepStrictEqual(idt(await aja(perus(e), pelaajaTok)), ['leiri', 'eilen_ilman_paattyy', 'tulossa']);
  const monta = []; for (let i = 0; i < 30; i++) monta.push(ev('e' + String(i).padStart(2, '0'), 1 + i * 0.5));
  const r = await aja(perus(monta), pelaajaTok); assert.strictEqual(r.tapahtumat.length, 20); assert.strictEqual(r.tapahtumat[0].id, 'e00'); assert.strictEqual(r.tapahtumat[19].id, 'e19');
  const menneet = []; for (let i = 0; i < 25; i++) menneet.push(ev('m' + i, -3)); menneet.push(ev('uusi', 2));
  assert.deepStrictEqual(idt(await aja(perus(menneet), pelaajaTok)), ['uusi']);   // menneet eivät syö 20 rajaa
  assert.deepStrictEqual(H.ikkuna(NYT).alku, Date.UTC(2026, 9, 12, 21, 0));   // 13.10. 00:00 EEST... (20.10.−7 pv = 13.10. Helsinki; talviaika alkaa 25.10.)
});
test('KENTTÄVARTIJA: vastauksessa vain sallitut kentät; ei luoja_uid / muokkaaja_uid / osallistujat_uid / pelaajat_id / lasnaolo_kooste / valmentaja_rpe / muistiinpanot / mentoroitava_*; logistiikka vain 4 kenttää; oma saatavuus mukana', async () => {
  const lisa = { luoja_uid: 'u1', muokkaaja_uid: 'u2', osallistujat_uid: ['u1'], pelaajat_id: ['p1', 'p2'], lasnaolo_kooste: { n: 3 }, valmentaja_rpe: 7, valmentaja_rpe_pvm: 'x', muistiinpanot: 'sisäinen', mentoroitava_nimi: 'X', lahde: 'manuaalinen',
    paikka: 'Kenttä 2', pelaajaviesti: 'Tuo pullo', koko_paiva: false, logistiikka: { saapumisaika: '17:30', peliasu: 'kotipaita', kartta_url: 'https://x', kimppakyyti: true, sisainen: 'EI' }, joukkue_nimi: 'KPV U13' };
  const r = await aja(Object.assign(perus([ev('a', 1, lisa)]), { lasnaolijat: { 'a/p1': { saatavuus: 'tulossa', tila: 'paikalla' } } }), pelaajaTok);
  const t = r.tapahtumat[0];
  const SALLITUT = ['id', 'nimi', 'tyyppi', 'alkaa', 'paattyy', 'pvm', 'koko_paiva', 'paikka', 'pelaajaviesti', 'logistiikka', 'omaSaatavuus'];
  assert.deepStrictEqual(Object.keys(t).filter((k) => !SALLITUT.includes(k)), []);
  assert.deepStrictEqual(Object.keys(t.logistiikka).sort(), ['kartta_url', 'kimppakyyti', 'peliasu', 'saapumisaika']);
  assert.strictEqual(t.omaSaatavuus, 'tulossa'); assert.ok(!JSON.stringify(r).includes('tila":"paikalla'));   // toteutunut läsnäolo (tila) ei lähde
  assert.strictEqual(t.alkaa, new Date(NYT + PV).toISOString());
  assert.strictEqual(typeof r.laskettu, 'string');
});
test('index.js: haePelaajanKalenteri rekisteröity europe-west1 + enforceAppCheck', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
  const i = src.indexOf('exports.haePelaajanKalenteri'); assert.ok(i > 0);
  const lohko = src.slice(i, i + 300);
  assert.match(lohko, /region\('europe-west1'\)/); assert.match(lohko, /enforceAppCheck: true/); assert.match(lohko, /pelaajanKalenteri\.luoKasittelija/);
});
test('_c4Roster käyttää samaa libiä (ilmoitusjoukko = näkyvä kalenteri) ja säilyttää peruutusilmoituksen (poistettu:false -kopio)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
  const i = src.indexOf('async function _c4Roster'); const lohko = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(lohko, /kalenteriPelaajalle\.tmKuuluuPelaajalle/); assert.match(lohko, /poistettu: false/); assert.ok(lohko.split('\n').length <= 12);
});
