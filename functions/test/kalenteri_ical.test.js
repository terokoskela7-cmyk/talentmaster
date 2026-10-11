'use strict';
/** K35-7a — kalenteri_ical.js: luoKalenteriTilaus (oikeudet, token, mitätöinti) + kalenteriIcal (404, rajaus, ikkuna, vuorokausirajaus, vartijat). Muistissa oleva Firestore. */
const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const H = require('../kalenteri_ical');
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const NYT = Date.UTC(2026, 9, 20, 10, 0), PV = 86400000;   // ti 20.10.2026 13:00 Helsinki
const ts = (ms) => ({ toDate: () => new Date(ms), toMillis: () => ms, _ms: ms });
const Timestamp = { fromDate: (d) => ts(d.getTime()), fromMillis: (m) => ts(m) };
const val = (v) => (v && typeof v === 'object' && v._ms != null ? v._ms : v);

function luoDb(alku) {
  const data = Object.assign({}, alku), kirjoitukset = [];
  const lapset = (polku) => Object.keys(data).filter((p) => p.startsWith(polku + '/') && p.slice(polku.length + 1).indexOf('/') < 0);
  const snap = (p) => ({ id: p.split('/').pop(), exists: data[p] !== undefined, data: () => (data[p] === undefined ? undefined : JSON.parse(JSON.stringify(data[p], (k, v) => v)) && data[p]) });
  const col = (polku, ehdot) => {
    const c = {
      doc: (id) => docRef(polku + '/' + (id || 'auto' + Math.random().toString(36).slice(2))),
      where: (f, op, v) => col(polku, (ehdot || []).concat([[f, op, v]])),
      get: async () => { const arr = lapset(polku).filter((p) => (ehdot || []).every(([f, op, v]) => { const x = val(data[p][f]), y = val(v); return op === '==' ? x === y : op === '>=' ? x >= y : op === '<=' ? x <= y : false; })).map((p) => ({ id: p.split('/').pop(), data: () => data[p] })); return { size: arr.length, forEach: (fn) => arr.forEach(fn), docs: arr }; }
    }; return c;
  };
  const docRef = (p) => ({ path: p, get: async () => snap(p), set: async (d) => { data[p] = d; kirjoitukset.push(['set', p, d]); }, update: async (d) => { data[p] = Object.assign({}, data[p], d); kirjoitukset.push(['update', p, d]); }, collection: (c) => col(p + '/' + c) });
  const db = { data, kirjoitukset, collection: (c) => col(c), batch: () => { const ops = []; return { set: (r, d) => ops.push(['set', r, d]), update: (r, d) => ops.push(['update', r, d]), commit: async () => { for (const [t, r, d] of ops) await r[t](d); } }; } };
  db.collection = (c) => ({ doc: (id) => docRef(c + '/' + id), where: (f, op, v) => col(c, [[f, op, v]]), get: col(c).get });
  return db;
}
const e = (id, alkuPv, o) => Object.assign({ tyyppi: 'harjoitus', nimi: '', alkaa: ts(NYT + alkuPv * PV), paattyy: ts(NYT + alkuPv * PV + 5400000), joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'], poistettu: false, paikka: 'Kenttä 2', tila: 'suunniteltu' }, o || {});
function perus(extra) {
  const a = { 'seurat/kpv': { nimi: 'FC Demo', kieli: 'fi' }, 'seurat/kpv/joukkueet/kpv_u13': { nimi: 'KPV U13' }, 'seurat/kpv/joukkueet/kpv_u15': { nimi: 'KPV U15' },
    'seurat/kpv/pelaajat/p1': { etunimi: 'Toppari', sukunimi: 'Testi', huoltajaEmail: 'aiti@esimerkki.fi', suostumusTila: 'annettu', joukkue: 'KPV U13', joukkueet: ['kpv_u13'] },
    'seurat/kpv/pelaajat/p2': { etunimi: 'Toinen', sukunimi: 'Pelaaja', joukkueet: ['kpv_u13'] },
    'seurat/kpv/kayttajat/v1': { rooli: 'valmentaja', joukkueet: ['kpv_u13'], aktiivinen: true }, 'seurat/kpv/kayttajat/vp1': { rooli: 'vp', aktiivinen: true }, 'seurat/kpv/kayttajat/v9': { rooli: 'valmentaja', joukkueet: ['kpv_u13'], aktiivinen: false },
    'seurat/kpv/ryhmat/g1': { nimi: 'MV', valmentajat: ['v1'], aktiivinen: true } };
  return Object.assign(a, extra || {});
}
const lisaaEv = (db, id, ev) => { db.data['seurat/kpv/kalenteri/' + id] = ev; };
const pelaajaCtx = { auth: { uid: 'pel_kpv_p1', token: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'p1' } } };
const huoltajaCtx = (x) => ({ auth: { uid: 'h1', token: Object.assign({ email: 'Aiti@Esimerkki.fi', email_verified: true }, x || {}) } });
const valmCtx = (uid, rooli) => ({ auth: { uid: uid || 'v1', token: { rooli: rooli || 'valmentaja', seuraId: 'kpv', email: 'v@x.fi' } } });
const tilaa = (db, ctx, data) => H.luoTilausKasittelija({ db, HttpsError, Timestamp, nyt: () => NYT, perusUrl: 'https://esim.test/kalenteriIcal/' })(data || { seuraId: 'kpv', pelaajaId: 'p1' }, ctx);
const tokenUrlista = (r) => /\/([A-Za-z0-9_-]{43})\.ics$/.exec(r.url)[1];
function res() { const r = { headers: {}, code: null, body: null, set(k, v) { r.headers[k] = v; return r; }, status(c) { r.code = c; return r; }, send(b) { r.body = b; return r; } }; return r; }
const hae = async (db, token, o) => { const r = res(); await H.luoSyoteKasittelija({ db, Timestamp, nyt: () => (o && o.nyt) || NYT })({ method: (o && o.method) || 'GET', path: '/' + token + '.ics' }, r); return r; };

test('OIKEUDET: pelaaja itse ✓, toisen pelaajan token ✗, huoltaja (vahvistettu email + suostumus) ✓, väärä huoltaja/vahvistamaton/ei suostumusta ✗, henkilökunta pelaajaId:llä ✗, kirjautumaton ✗, anonyymi ✗', async () => {
  const db = luoDb(perus());
  assert.ok((await tilaa(db, pelaajaCtx)).url); assert.ok((await tilaa(db, pelaajaCtx, { seuraId: 'kpv' })).url);   // pelaajaId voi puuttua → oma
  await assert.rejects(tilaa(db, { auth: { uid: 'x', token: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'p2' } } }), (x) => x.code === 'permission-denied');
  assert.ok((await tilaa(db, huoltajaCtx())).url);
  await assert.rejects(tilaa(db, huoltajaCtx({ email: 'toinen@esimerkki.fi' })), (x) => x.code === 'permission-denied');
  await assert.rejects(tilaa(db, huoltajaCtx({ email_verified: false })), (x) => x.code === 'permission-denied');
  await assert.rejects(tilaa(luoDb(perus({ 'seurat/kpv/pelaajat/p1': { huoltajaEmail: 'aiti@esimerkki.fi', suostumusTila: 'odottaa' } })), huoltajaCtx()), (x) => x.code === 'permission-denied');
  await assert.rejects(tilaa(db, valmCtx(), { seuraId: 'kpv', pelaajaId: 'p1' }), (x) => x.code === 'permission-denied');
  await assert.rejects(tilaa(db, {}), (x) => x.code === 'unauthenticated');
  await assert.rejects(tilaa(db, { auth: { uid: 'a', token: { firebase: { sign_in_provider: 'anonymous' } } } }), (x) => x.code === 'permission-denied');
  await assert.rejects(tilaa(db, pelaajaCtx, { seuraId: 'a/b' }), (x) => x.code === 'invalid-argument');
});
test('HENKILÖKUNTA ilman pelaajaId:tä → oma syöte; aktiivinen vaaditaan, muun seuran claim ✗', async () => {
  const db = luoDb(perus()); assert.ok((await tilaa(db, valmCtx(), { seuraId: 'kpv' })).url); assert.ok((await tilaa(db, valmCtx('vp1', 'vp'), { seuraId: 'kpv' })).url);
  await assert.rejects(tilaa(db, valmCtx('v9'), { seuraId: 'kpv' }), (x) => x.code === 'permission-denied');
  await assert.rejects(tilaa(db, { auth: { uid: 'v1', token: { rooli: 'valmentaja', seuraId: 'muu' } } }, { seuraId: 'kpv' }), (x) => x.code === 'permission-denied');
});
test('TOKEN: 43 merkkiä base64url (32 tavua), tallennus kalenteri_tilaukset/{sha256(token)}, itse tokenia ei tallenneta; URL https + webcal', async () => {
  const db = luoDb(perus()), r = await tilaa(db, pelaajaCtx), t = tokenUrlista(r), polku = 'kalenteri_tilaukset/' + crypto.createHash('sha256').update(t).digest('hex');
  assert.match(t, /^[A-Za-z0-9_-]{43}$/); assert.strictEqual(Buffer.from(t, 'base64url').length, 32); assert.ok(db.data[polku]); assert.deepStrictEqual({ seuraId: db.data[polku].seuraId, pelaajaId: db.data[polku].pelaajaId, rooli: db.data[polku].rooli, mitatoity: db.data[polku].mitatoity }, { seuraId: 'kpv', pelaajaId: 'p1', rooli: 'pelaaja', mitatoity: false });
  assert.ok(!JSON.stringify(db.data).includes(t)); assert.ok(r.url.startsWith('https://')); assert.ok(r.webcal.startsWith('webcal://') && r.webcal.endsWith(t + '.ics'));
});
test('UUSI TILAUS MITÄTÖI saman tilaajan + kohteen vanhan; toisen tilaajan (huoltaja) tilaus säilyy; mitätöity token → 404', async () => {
  const db = luoDb(perus()); lisaaEv(db, 'a', e('a', 1));
  const t1 = tokenUrlista(await tilaa(db, pelaajaCtx)), th = tokenUrlista(await tilaa(db, huoltajaCtx()));
  assert.strictEqual((await hae(db, t1)).code, 200); const t2 = tokenUrlista(await tilaa(db, pelaajaCtx));
  assert.strictEqual((await hae(db, t1)).code, 404); assert.strictEqual((await hae(db, t2)).code, 200); assert.strictEqual((await hae(db, th)).code, 200);
});
test('404 ILMAN SELITYSTÄ: puuttuva token, väärä muoto, väärä metodi, mitätöity, poistettu pelaaja; sama vastaus kaikille', async () => {
  const db = luoDb(perus()), t = tokenUrlista(await tilaa(db, pelaajaCtx)), vastaukset = [];
  for (const x of [await hae(db, 'A'.repeat(43)), await hae(db, 'lyhyt'), await hae(db, t, { method: 'POST' })]) vastaukset.push([x.code, x.body]);
  delete db.data['seurat/kpv/pelaajat/p1']; const poistettu = await hae(db, t); vastaukset.push([poistettu.code, poistettu.body]);
  vastaukset.forEach((v) => assert.deepStrictEqual(v, [404, 'Not found']));
});
test('SYÖTE: pelaajan rajaus — oma joukkue ✓, toinen joukkue ✗, henkilökunnan tapahtuma ✗, ryhmätapahtuma vain ryhmän pelaajalle, poistettu ✗, ikkuna −30…+180 pv', async () => {
  const db = luoDb(perus());
  lisaaEv(db, 'oma', e('oma', 2)); lisaaEv(db, 'toinen', e('toinen', 3, { joukkue: 'kpv_u15', joukkue_nimi: 'KPV U15', joukkueet: ['kpv_u15'] })); lisaaEv(db, 'hk', e('hk', 4, { nakyvyys: 'henkilokunta', tyyppi: 'valmentajapalaveri' }));
  lisaaEv(db, 'ryhma_on', e('ryhma_on', 5, { joukkue: null, joukkue_nimi: null, joukkueet: [], kohde: { tyyppi: 'ryhma', ryhma_id: 'g1' }, pelaajat_id: ['p1', 'p9'] })); lisaaEv(db, 'ryhma_ei', e('ryhma_ei', 6, { joukkue: null, joukkue_nimi: null, joukkueet: [], kohde: { tyyppi: 'ryhma', ryhma_id: 'g1' }, pelaajat_id: ['p8'] }));
  lisaaEv(db, 'poistettu', e('poistettu', 7, { poistettu: true })); lisaaEv(db, 'vanha', e('vanha', -29)); lisaaEv(db, 'liian_vanha', e('liian_vanha', -31)); lisaaEv(db, 'kaukana', e('kaukana', 179)); lisaaEv(db, 'liian_kaukana', e('liian_kaukana', 181));
  const t = tokenUrlista(await tilaa(db, pelaajaCtx)), r = await hae(db, t), uidt = [...r.body.matchAll(/UID:([^@]+)@talentmaster/g)].map((m) => m[1]);
  assert.strictEqual(r.code, 200); assert.deepStrictEqual(uidt.sort(), ['kaukana', 'oma', 'ryhma_on', 'vanha'].sort());
  const th = tokenUrlista(await tilaa(db, huoltajaCtx())); assert.deepStrictEqual([...(await hae(db, th)).body.matchAll(/UID:([^@]+)@talentmaster/g)].map((m) => m[1]).sort(), ['kaukana', 'oma', 'ryhma_on', 'vanha'].sort());
});
test('SYÖTE: henkilökunta — oma joukkue + oma ryhmä + henkilökunnan tapahtumat; toisen joukkueen tapahtuma ✗; VP kaikki', async () => {
  const db = luoDb(perus());
  lisaaEv(db, 'oma', e('oma', 1)); lisaaEv(db, 'toinen', e('toinen', 2, { joukkue: 'kpv_u15', joukkue_nimi: 'KPV U15', joukkueet: ['kpv_u15'] })); lisaaEv(db, 'hk', e('hk', 3, { nakyvyys: 'henkilokunta', tyyppi: 'valmentajapalaveri', joukkue: null, joukkue_nimi: null, joukkueet: [], kohde: { tyyppi: 'henkilokunta' } }));
  lisaaEv(db, 'oma_ryhma', e('oma_ryhma', 4, { joukkue: null, joukkue_nimi: null, joukkueet: [], kohde: { tyyppi: 'ryhma', ryhma_id: 'g1' }, pelaajat_id: ['p1'] })); lisaaEv(db, 'vieras_ryhma', e('vieras_ryhma', 5, { joukkue: null, joukkue_nimi: null, joukkueet: [], kohde: { tyyppi: 'ryhma', ryhma_id: 'g7' }, luoja_uid: 'muu' }));
  const uidit = (r) => [...r.body.matchAll(/UID:([^@]+)@talentmaster/g)].map((m) => m[1]).sort();
  const tv = tokenUrlista(await tilaa(db, valmCtx(), { seuraId: 'kpv' })); assert.deepStrictEqual(uidit(await hae(db, tv)), ['hk', 'oma', 'oma_ryhma']);
  const tp = tokenUrlista(await tilaa(db, valmCtx('vp1', 'vp'), { seuraId: 'kpv' })); assert.deepStrictEqual(uidit(await hae(db, tp)), ['hk', 'oma', 'oma_ryhma', 'toinen', 'vieras_ryhma']);
});
test('VARTIJA: syötteessä ei muiden pelaajien nimiä, pelaajalistoja, luoja_uid:tä, muistiinpanoja eikä henkilökunnan kenttiä; pelaajaviesti on DESCRIPTION', async () => {
  const db = luoDb(perus()); lisaaEv(db, 'x', e('x', 2, { pelaajaviesti: 'Muista säärisuojat, ja juomapullo', pelaajat_id: ['p1', 'p2'], luoja_uid: 'LUOJA-UID-123', muokkaaja_uid: 'MUOKKAAJA-9', muistiinpanot: 'SALAINEN-MUISTIINPANO', valmentaja_rpe: 7, valmentaja_rpe_kommentti: 'RPE-KOMMENTTI', osallistujat_uid: ['u-1'], lasnaolo_kooste: { paikalla: 12 }, logistiikka: { saapumisaika: '16:30', kartta_url: 'https://kartta.test' } }));
  const t = tokenUrlista(await tilaa(db, pelaajaCtx)), body = (await hae(db, t)).body, kaikki = body.replace(/\r\n /g, '');
  ['Toinen', 'Pelaaja', 'p2', 'LUOJA-UID', 'MUOKKAAJA', 'SALAINEN', 'RPE-KOMMENTTI', 'u-1', 'lasnaolo', 'valmentaja', 'Toppari'].forEach((s) => assert.ok(!kaikki.includes(s), s));
  assert.ok(kaikki.includes('DESCRIPTION;LANGUAGE=fi:Muista säärisuojat\\, ja juomapullo')); assert.ok(kaikki.includes('SUMMARY;LANGUAGE=fi:Harjoitus · KPV U13')); assert.ok(kaikki.includes('LOCATION;LANGUAGE=fi:Kenttä 2'));
});
test('SYÖTE: otsakkeet (text/calendar, max-age=900), CRLF, peruttu → CANCELLED, SEQUENCE versiosta, kesäaika/talviaika UTC:ssä, koko päivä VALUE=DATE', async () => {
  const db = luoDb(perus()), ma = Date.UTC(2026, 9, 19, 14, 30);   // 19.10. klo 17:30 EEST = 14:30Z
  lisaaEv(db, 'a', e('a', 0, { alkaa: ts(ma), paattyy: ts(ma + 5400000), tila: 'peruttu', versio: 4 })); lisaaEv(db, 'k', e('k', 3, { tyyppi: 'seuran_tauko', joukkue: null, joukkue_nimi: null, joukkueet: [], koko_paiva: true, alkaa: ts(Date.UTC(2026, 9, 24, 21, 0)), paattyy: ts(Date.UTC(2026, 9, 25, 20, 59)) }));
  const t = tokenUrlista(await tilaa(db, valmCtx('vp1', 'vp'), { seuraId: 'kpv' })), r = await hae(db, t);
  assert.strictEqual(r.headers['Content-Type'], 'text/calendar; charset=utf-8'); assert.strictEqual(r.headers['Cache-Control'], 'max-age=900'); assert.ok(r.body.includes('\r\n') && !/[^\r]\n/.test(r.body));
  assert.ok(r.body.includes('STATUS:CANCELLED') && r.body.includes('SEQUENCE:4') && r.body.includes('DTSTART:20261019T143000Z') && r.body.includes('DTEND:20261019T160000Z'));
  assert.ok(r.body.includes('DTSTART;VALUE=DATE:20261025') && r.body.includes('DTEND;VALUE=DATE:20261026'));   // kellojen siirtopäivä 25.10. (EEST→EET): koko päivän tapahtuma oikealle päivälle
  assert.ok(r.body.includes('X-WR-CALNAME;LANGUAGE=fi:FC Demo · Kalenteri') && r.body.includes('REFRESH-INTERVAL;VALUE=DURATION:PT1H') && r.body.includes('X-PUBLISHED-TTL:PT1H'));
});
test('viimeksi_haettu päivitetään korkeintaan kerran vuorokaudessa (Helsingin päivä)', async () => {
  const db = luoDb(perus()), t = tokenUrlista(await tilaa(db, pelaajaCtx)), polku = 'kalenteri_tilaukset/' + crypto.createHash('sha256').update(t).digest('hex'), pAik = () => db.kirjoitukset.filter((k) => k[0] === 'update' && k[1] === polku && k[2].viimeksi_haettu).length;
  await hae(db, t); await hae(db, t, { nyt: NYT + 3600000 }); assert.strictEqual(pAik(), 1); await hae(db, t, { nyt: NYT + 26 * 3600000 }); assert.strictEqual(pAik(), 2);
});
test('suostumus peruttu → huoltajan syöte sulkeutuu (404); pelaajan oma syöte ei riipu suostumuksesta', async () => {
  const db = luoDb(perus()), th = tokenUrlista(await tilaa(db, huoltajaCtx())), tp = tokenUrlista(await tilaa(db, pelaajaCtx));
  db.data['seurat/kpv/pelaajat/p1'].suostumusTila = 'peruttu'; assert.strictEqual((await hae(db, th)).code, 404); assert.strictEqual((await hae(db, tp)).code, 200);
});

test('KATSELMOINTI: huoltajan sähköposti tilaukseen vain tiivisteenä (sha256, lowercase+trim); huoltajaEmail vaihdettu → 404; pelaajan oma syöte ei riipu huoltajan sähköpostista', async () => {
  const db = luoDb(perus()), th = tokenUrlista(await tilaa(db, huoltajaCtx())), tp = tokenUrlista(await tilaa(db, pelaajaCtx));
  const doc = db.data['kalenteri_tilaukset/' + crypto.createHash('sha256').update(th).digest('hex')], odotettu = crypto.createHash('sha256').update('aiti@esimerkki.fi').digest('hex');
  assert.strictEqual(doc.huoltajaEmailHash, odotettu); assert.ok(!JSON.stringify(Object.keys(db.data).filter((k) => k.startsWith('kalenteri_tilaukset/')).map((k) => db.data[k])).toLowerCase().includes('aiti@'));   // ei selväkielistä sähköpostia tilaukseen
  assert.strictEqual((await hae(db, th)).code, 200); db.data['seurat/kpv/pelaajat/p1'].huoltajaEmail = 'uusi.huoltaja@esimerkki.fi'; assert.strictEqual((await hae(db, th)).code, 404); assert.strictEqual((await hae(db, tp)).code, 200);
  db.data['seurat/kpv/pelaajat/p1'].huoltajaEmail = '  AITI@Esimerkki.fi '; assert.strictEqual((await hae(db, th)).code, 200);   // sama osoite eri kirjoitusasulla
  const vanha = luoDb(perus()); const tv = tokenUrlista(await tilaa(vanha, huoltajaCtx())); delete vanha.data['kalenteri_tilaukset/' + crypto.createHash('sha256').update(tv).digest('hex')].huoltajaEmailHash; assert.strictEqual((await hae(vanha, tv)).code, 404);   // ilman tiivistettä ei avaudu
});
test('KATSELMOINTI: pelaaja poistettu / arkistoitu / ei aktiivinen → 404 (pelaaja ja huoltaja); luonti hylätään samoin', async () => {
  for (const lippu of [{ poistettu: true }, { arkistoitu: true }, { aktiivinen: false }]) {
    const db = luoDb(perus()), tp = tokenUrlista(await tilaa(db, pelaajaCtx)), th = tokenUrlista(await tilaa(db, huoltajaCtx()));
    assert.strictEqual((await hae(db, tp)).code, 200); Object.assign(db.data['seurat/kpv/pelaajat/p1'], lippu); assert.strictEqual((await hae(db, tp)).code, 404, JSON.stringify(lippu)); assert.strictEqual((await hae(db, th)).code, 404, JSON.stringify(lippu));
    await assert.rejects(tilaa(db, pelaajaCtx), (x) => x.code === 'permission-denied'); await assert.rejects(tilaa(db, huoltajaCtx()), (x) => x.code === 'permission-denied');
  }
});

const peru = (db, ctx, data) => H.luoPeruutusKasittelija({ db, HttpsError, Timestamp, nyt: () => NYT })(data || { seuraId: 'kpv', pelaajaId: 'p1' }, ctx);
test('peruKalenteriTilaus: mitätöi tilaajan aktiivisen tilauksen ILMAN uutta; toisen tilaajan säilyy; ei aktiivista → 0; sama oikeustarkistus kuin luonnissa', async () => {
  const db = luoDb(perus()), tp = tokenUrlista(await tilaa(db, pelaajaCtx)), th = tokenUrlista(await tilaa(db, huoltajaCtx())), ennen = Object.keys(db.data).filter((k) => k.startsWith('kalenteri_tilaukset/')).length;
  assert.deepStrictEqual(await peru(db, pelaajaCtx), { mitatoitu: 1 }); assert.strictEqual((await hae(db, tp)).code, 404); assert.strictEqual((await hae(db, th)).code, 200); assert.strictEqual(Object.keys(db.data).filter((k) => k.startsWith('kalenteri_tilaukset/')).length, ennen);   // ei uutta dokumenttia
  assert.deepStrictEqual(await peru(db, pelaajaCtx), { mitatoitu: 0 }); assert.deepStrictEqual(await peru(db, huoltajaCtx()), { mitatoitu: 1 }); assert.strictEqual((await hae(db, th)).code, 404);
  const hk = luoDb(perus()), tv = tokenUrlista(await tilaa(hk, valmCtx(), { seuraId: 'kpv' })); assert.deepStrictEqual(await peru(hk, valmCtx(), { seuraId: 'kpv' }), { mitatoitu: 1 }); assert.strictEqual((await hae(hk, tv)).code, 404);
  await assert.rejects(peru(db, { auth: { uid: 'x', token: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'p2' } } }), (x) => x.code === 'permission-denied'); await assert.rejects(peru(db, huoltajaCtx({ email: 'toinen@esimerkki.fi' })), (x) => x.code === 'permission-denied');
  await assert.rejects(peru(db, valmCtx(), { seuraId: 'kpv', pelaajaId: 'p1' }), (x) => x.code === 'permission-denied'); await assert.rejects(peru(db, {}), (x) => x.code === 'unauthenticated'); await assert.rejects(peru(db, pelaajaCtx, { seuraId: 'a/b' }), (x) => x.code === 'invalid-argument');
});

test('K35-6d D242: joukkueen valmennuspalaveri (kohde henkilokunta + joukkue) — oman joukkueen valmentaja ✓, toisen joukkueen valmentaja ✗, johto ✓, luoja ✓, pelaajan syöte ✗; koko henkilökunnan palaveri (ei joukkuetta) kaikille henkilökunnalle', async () => {
  const hk = (id, jid, o) => Object.assign(e(id, 3, { tyyppi: 'valmentajapalaveri', nakyvyys: 'henkilokunta', joukkue: jid, joukkue_nimi: jid === 'kpv_u15' ? 'KPV U15' : 'KPV U13', joukkueet: [jid], luoja_uid: 'muu', kohde: { tyyppi: 'henkilokunta', joukkue: jid } }), o || {});
  const db = luoDb(perus({ 'seurat/kpv/kayttajat/v2': { rooli: 'valmentaja', joukkueet: ['kpv_u15'], aktiivinen: true } }));
  lisaaEv(db, 'u13_hk', hk('u13_hk', 'kpv_u13')); lisaaEv(db, 'u15_hk', hk('u15_hk', 'kpv_u15')); lisaaEv(db, 'luoja_u15', hk('luoja_u15', 'kpv_u15', { luoja_uid: 'v1' })); lisaaEv(db, 'koko_hk', e('koko_hk', 4, { tyyppi: 'valmentajapalaveri', nakyvyys: 'henkilokunta', joukkue: null, joukkue_nimi: null, joukkueet: [], kohde: { tyyppi: 'henkilokunta' } }));
  const uidit = (r) => [...r.body.matchAll(/UID:([^@]+)@talentmaster/g)].map((m) => m[1]).sort();
  const t1 = tokenUrlista(await tilaa(db, valmCtx('v1'), { seuraId: 'kpv' })), t2 = tokenUrlista(await tilaa(db, valmCtx('v2'), { seuraId: 'kpv' })), tp = tokenUrlista(await tilaa(db, valmCtx('vp1', 'vp'), { seuraId: 'kpv' })), tpl = tokenUrlista(await tilaa(db, pelaajaCtx));
  assert.deepStrictEqual(uidit(await hae(db, t1)), ['koko_hk', 'luoja_u15', 'u13_hk']);   // v1: oma joukkue U13 + luoja + koko henkilökunta; EI U15:n u15_hk
  assert.deepStrictEqual(uidit(await hae(db, t2)), ['koko_hk', 'luoja_u15', 'u15_hk']);   // v2: U15 (luoja_u15 on U15:n palaveri, nakyy joukkueena)
  assert.deepStrictEqual(uidit(await hae(db, tp)), ['koko_hk', 'luoja_u15', 'u13_hk', 'u15_hk']);   // johto kaikki
  assert.deepStrictEqual(uidit(await hae(db, tpl)), []);   // pelaaja: henkilökunnan tapahtumat eivät näy
});
test('K35-6d: joukkueen_vapaa ja erikoisohjelma näkyvät joukkueen pelaajalle koko päivän (VALUE=DATE), toisen joukkueen eivät; SUMMARY tyypin nimi · joukkue', async () => {
  const db = luoDb(perus()), a = Date.UTC(2026, 9, 21, 21, 0), b = Date.UTC(2026, 9, 24, 20, 59);   // to 22.10.–la 24.10. (EEST)
  lisaaEv(db, 'vapaa', e('vapaa', 2, { tyyppi: 'joukkueen_vapaa', koko_paiva: true, alkaa: ts(a), paattyy: ts(b), paikka: null })); lisaaEv(db, 'leiri', e('leiri', 5, { tyyppi: 'erikoisohjelma', laji: 'leiri', koko_paiva: true, alkaa: ts(a), paattyy: ts(b), joukkue: 'kpv_u15', joukkue_nimi: 'KPV U15', joukkueet: ['kpv_u15'] }));
  const body = (await hae(db, tokenUrlista(await tilaa(db, pelaajaCtx)))).body; assert.ok(body.includes('UID:vapaa@talentmaster')); assert.ok(!body.includes('UID:leiri@talentmaster')); assert.ok(body.includes('DTSTART;VALUE=DATE:20261022') && body.includes('DTEND;VALUE=DATE:20261025')); assert.ok(body.includes('SUMMARY;LANGUAGE=fi:Joukkueen vapaa · KPV U13'));
});
