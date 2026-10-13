'use strict';
/**
 * TASO API -muoto (docs/integraatiot/TASO_API.md): fixturet functions/test/fixtures/taso_getMatches.json + taso_getClub.json (kentät: date + time, team_A/team_B, status…).
 * HUOM: fixturet on rakennettu Teron toimittaman dokumentaation kenttäkuvauksesta — vaihda dokumentaation esimerkkivastauksiin, kun tiedosto on repossa.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const A = require('../taso_api');
const K = require('../kalenteri_taso');
const { helsinginHetki } = require('../helsinki_paiva');

const MATCHES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/taso_getMatches.json'), 'utf8')).matches, CLUB = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/taso_getClub.json'), 'utf8'));
const KARTTA = { '111': 'kpv_p13' }, NIMET = { kpv_p13: 'KPV P13' }, NYT = helsinginHetki(2026, 10, 13, 12, 0);
const mid = (id) => MATCHES.find((m) => m.match_id === id);
const omaOttelu = (id) => K.tasoOttelu(Object.assign({ _taso_team_id: '111' }, mid(id)), KARTTA, NIMET);

test('osoite: YKSI vakio https://spl.torneopal.net/taso/rest (ei .fi) — kaikki käyttäjät samasta moduulista', () => {
  assert.strictEqual(A.TASO_BASE, 'https://spl.torneopal.net/taso/rest');
  const juuri = path.join(__dirname, '..', '..'), tiedostot = ['functions/index.js', 'functions/kalenteri_taso.js', 'functions/taso_api.js', 'scripts/yhdista_taso_joukkueet.js'];
  tiedostot.forEach((f) => { const s = fs.readFileSync(path.join(juuri, f), 'utf8'); assert.ok(!/torneopal\.fi/.test(s), f + ' sisältää torneopal.fi'); if (f !== 'functions/taso_api.js') assert.ok(!/spl\.torneopal\./.test(s), f + ' määrittelee osoitteen itse'); });
  assert.ok(fs.readFileSync(path.join(juuri, 'functions/index.js'), 'utf8').includes("require('./taso_api')")); assert.ok(fs.readFileSync(path.join(juuri, 'functions/kalenteri_taso.js'), 'utf8').includes("require('./taso_api')"));
});
test('kausi: kalenterivuosi merkkijonona (Helsingin vuosi), vuodenvaihde Helsingin ajassa', () => {
  assert.strictEqual(A.kausiTunniste(NYT), '2026'); assert.strictEqual(A.kausiTunniste(Date.UTC(2026, 11, 31, 22, 30)), '2027', '31.12. klo 22:30 UTC = 1.1. Helsingissä'); assert.strictEqual(A.kausiTunniste(Date.UTC(2026, 11, 31, 20, 0)), '2026');
});
test('hakuikkuna: tänään − 30 pv … tänään + 180 pv (YYYY-MM-DD, Helsingin päivä); rajat ms:nä', () => {
  const i = A.hakuIkkuna(NYT); assert.strictEqual(i.start_date, '2026-09-13'); assert.strictEqual(i.end_date, '2027-04-11'); assert.strictEqual(i.alkuMs, helsinginHetki(2026, 9, 13, 0, 0)); assert.strictEqual(i.loppuMs, helsinginHetki(2027, 4, 11, 23, 59) + 59999);
  const y = A.hakuIkkuna(Date.UTC(2026, 11, 31, 22, 30)); assert.strictEqual(y.start_date, '2026-12-02'); assert.strictEqual(y.end_date, '2027-06-30', 'Helsingin päivä 1.1.2027 + 180 pv');
  assert.strictEqual(A.HAKU_TAAKSE_PV, 30); assert.strictEqual(A.HAKU_ETEEN_PV, 180);
});
test('otteluKentat (fixture getMatches): date + time → pvm/kello; time HH:MM:SS ja HH:MM; tyhjä/puuttuva → null; team_A koti, team_B vieras; ei match_id/date → null', () => {
  const a = A.otteluKentat(mid('1001')); assert.deepStrictEqual([a.id, a.pvm, a.kello, a.koti, a.vieras, a.paikka, a.status], ['1001', '2026-10-24', '12:00', { id: '111', nimi: 'KPV P13' }, { id: '999', nimi: 'Vaasan Vastus' }, 'Hietalahti', 'Fixture']);
  assert.strictEqual(A.otteluKentat(mid('1002')).kello, '14:30'); assert.strictEqual(A.otteluKentat(mid('1003')).kello, null, 'time = ""'); assert.strictEqual(A.otteluKentat(mid('1004')).kello, null, 'time puuttuu');
  assert.strictEqual(A.otteluKentat({ match_id: 1, date: 'huomenna' }), null); assert.strictEqual(A.otteluKentat({ date: '2026-10-24' }), null); assert.strictEqual(A.otteluKentat(null), null);
  MATCHES.forEach((m) => { assert.ok(!('match_time' in m) && !('home_team_id' in m) && !('away_team_id' in m), 'fixture ei sisällä vanhoja kenttiä'); });
});
test('kalenterikartoitus fixturesta: kotiottelu / vierasottelu / koko päivä (time tyhjä tai puuttuu) / kesto 90 min / vastustaja', () => {
  const k = omaOttelu('1001'); assert.strictEqual(k.id, 'taso_1001'); assert.strictEqual(k.lahde.alkaa, helsinginHetki(2026, 10, 24, 12, 0)); assert.strictEqual(k.lahde.paattyy - k.lahde.alkaa, 90 * 60000); assert.strictEqual(k.lahde.koko_paiva, false); assert.strictEqual(k.vastustaja, 'Vaasan Vastus'); assert.strictEqual(k.nimi, 'KPV P13 – Vaasan Vastus');
  const v = omaOttelu('1002'); assert.strictEqual(v.vastustaja, 'Kokkolan Kotijoukkue', 'vierasottelu: vastustaja = team_A'); assert.strictEqual(v.lahde.alkaa, helsinginHetki(2026, 10, 31, 14, 30));
  for (const id of ['1003', '1004']) { const e = omaOttelu(id); assert.strictEqual(e.lahde.koko_paiva, true, id); assert.strictEqual(e.lahde.alkaa, helsinginHetki(2026, 11, id === '1003' ? 7 : 14, 0, 0)); assert.strictEqual(e.lahde.paattyy, helsinginHetki(2026, 11, id === '1003' ? 7 : 14, 23, 59)); }
});
test('tilat dokumentaation arvoille: Canceled, Suspended, Abandoned → peruttu; Reschedule → EI peruttu; Fixture/Played → suunniteltu', () => {
  const tila = (id) => omaOttelu(id).lahde.tila;
  assert.deepStrictEqual(['1005', '1006', '1007'].map(tila), ['peruttu', 'peruttu', 'peruttu']); assert.strictEqual(tila('1008'), 'suunniteltu', 'Reschedule ei ole peruttu'); assert.deepStrictEqual(['1001', '0999'].map(tila), ['suunniteltu', 'suunniteltu']);
  assert.ok(!A.PERUTTU_RE.test('Reschedule')); ['Canceled', 'Suspended', 'Abandoned'].forEach((s) => assert.ok(A.PERUTTU_RE.test(s), s));
});
test('koko päivä: päivitys ei vaihda koko_paiva-arvoa väärin; luonti tallentaa koko_paiva:true', () => {
  const e = omaOttelu('1003'), fv = { serverTimestamp: () => 'TS' }, ts = { fromMillis: (ms) => ({ ms }) }; const d = K.uusiDokumentti(e, fv, ts); assert.strictEqual(d.koko_paiva, true); assert.strictEqual(d.alkaa.ms, e.lahde.alkaa);
  assert.strictEqual(K.uusiDokumentti(omaOttelu('1001'), fv, ts).koko_paiva, false);
  assert.deepStrictEqual(K.lahdePaivitys({ koko_paiva: false, alkaa: ts.fromMillis(1), paattyy: ts.fromMillis(2) }, e.lahde).koko_paiva, true);   // time poistui lähteestä → koko päivä
});
test('perutus vain hakuikkunan tulevista: ikkunan sisällä puuttuva → peruttu; ikkunan ulkopuolella (> end_date) tai mennyt → ei', () => {
  const ikkuna = A.hakuIkkuna(NYT), ts = { fromMillis: (ms) => ({ toMillis: () => ms }) }, ol = (alkaa) => ({ lahde: 'taso', tila: 'suunniteltu', alkaa: ts.fromMillis(alkaa), paattyy: ts.fromMillis(alkaa + 1), koko_paiva: false, paikka: null });
  const olemassa = { taso_sisalla: ol(helsinginHetki(2026, 12, 1, 12, 0)), taso_ulkona: ol(helsinginHetki(2027, 6, 1, 12, 0)), taso_mennyt: ol(helsinginHetki(2026, 10, 1, 12, 0)) };
  const s = K.suunnitteleSynkka([], olemassa, KARTTA, NIMET, NYT, ikkuna); assert.deepStrictEqual(s.peru, [{ id: 'taso_sisalla' }]);
  assert.deepStrictEqual(K.suunnitteleSynkka([], olemassa, KARTTA, NIMET, NYT).peru.map((x) => x.id).sort(), ['taso_sisalla', 'taso_ulkona'], 'ilman ikkunaa (taaksepäin yhteensopiva) kaikki tulevat');
});
test('haeOttelut: getMatches(team_id, start_date, end_date) — EI season_id:tä; vain yhdistetyt joukkueet; getClub-fixture → joukkuelista (team_id, team_name, category_name)', async () => {
  const kutsut = [], tasoHae = async (e, p) => { kutsut.push([e, p]); return { matches: MATCHES }; }, ikkuna = A.hakuIkkuna(NYT);
  const o = await K.haeOttelut(tasoHae, 'avain', { '111': 'kpv_p13', '222': 'kpv_p14' }, ikkuna);
  assert.deepStrictEqual(kutsut.map((k) => k[0]), ['getMatches', 'getMatches']); kutsut.forEach(([, p]) => { assert.deepStrictEqual(Object.keys(p).sort(), ['end_date', 'start_date', 'team_id']); assert.ok(!('season_id' in p)); assert.strictEqual(p.start_date, '2026-09-13'); assert.strictEqual(p.end_date, '2027-04-11'); });
  assert.deepStrictEqual([...new Set(o.map((x) => x._taso_team_id))].sort(), ['111', '222']);
  CLUB.teams.forEach((t) => assert.ok(t.team_id && t.team_name && t.category_name)); assert.deepStrictEqual(CLUB.teams.map((t) => t.category_name), ['P13', 'P14', 'Naiset']);
});
test('koko fixture synkassa: ajaSeura → getMatches-parametrit, luonti (koko päivä + normaalit), peruttu-tilat; mennyt Played-ottelu luodaan (ikkuna −30 pv sisällä)', async () => {
  const store = new Map([['seurat/s', { taso_api_key: 'k', taso_club_id: '1' }], ['seurat/s/konfiguraatio/kalenterilahteet', { taso: { joukkueet: KARTTA } }], ['seurat/s/joukkueet/kpv_p13', { nimi: 'KPV P13' }]]);
  const col = (polku) => ({ doc: (id) => ({ _p: polku + '/' + id, get: async () => ({ exists: store.has(polku + '/' + id), data: () => store.get(polku + '/' + id) }), collection: (c) => col(polku + '/' + id + '/' + c) }), where: (f, op, v) => ({ get: async () => { const ds = [...store.keys()].filter((k) => k.startsWith(polku + '/') && store.get(k)[f] === v).map((k) => ({ id: k.split('/').pop(), data: () => store.get(k) })); return { docs: ds, forEach: (fn) => ds.forEach(fn) }; } }), get: async () => { const ds = [...store.keys()].filter((k) => k.startsWith(polku + '/') && !k.slice(polku.length + 1).includes('/')).map((k) => ({ id: k.split('/').pop(), data: () => store.get(k) })); return { docs: ds, forEach: (fn) => ds.forEach(fn) }; } });
  const db = { collection: (c) => col(c), batch: () => { const ops = []; return { set: (r, d) => ops.push([r._p, d]), update: (r, d) => ops.push([r._p, Object.assign({}, store.get(r._p), d)]), commit: async () => ops.forEach(([p, d]) => store.set(p, d)) }; } };
  const kutsut = []; const r = await K.ajaSeura({ db, tasoHae: async (e, p) => { kutsut.push(p); return { matches: MATCHES }; }, FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromMillis: (ms) => ({ toMillis: () => ms }) } }, 's', NYT);
  assert.deepStrictEqual(kutsut, [{ team_id: '111', start_date: '2026-09-13', end_date: '2027-04-11' }]);
  assert.strictEqual(r.luotu, 9, 'kaikki fixturen ottelut luodaan (oma joukkue 111 mukana kaikissa)'); const d = (id) => store.get('seurat/s/kalenteri/taso_' + id);
  assert.deepStrictEqual([d('1005').tila, d('1006').tila, d('1007').tila, d('1008').tila, d('1001').tila], ['peruttu', 'peruttu', 'peruttu', 'suunniteltu', 'suunniteltu']); assert.deepStrictEqual([d('1003').koko_paiva, d('1004').koko_paiva, d('1001').koko_paiva], [true, true, false]); assert.strictEqual(d('1002').vastustaja, 'Kokkolan Kotijoukkue'); assert.strictEqual(d('1001').joukkue, 'kpv_p13');
});
