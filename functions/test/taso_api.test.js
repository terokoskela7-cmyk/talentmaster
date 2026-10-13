'use strict';
/**
 * TASO API -muoto (docs/integraatiot/TASO_API.md + TASO_API_dokumentaatio.txt): fixturet functions/test/fixtures/taso_getMatches|getClub|getNextMatches|getTeam.json ovat dokumentaation
 * OMIA esimerkkivastauksia sellaisenaan. Tilavariantit (Canceled, Suspended, Reschedule …) ja koko päivä -tapaukset johdetaan dokumentaation ottelusta muuttamalla vain status/time (variantti()).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const A = require('../taso_api');
const K = require('../kalenteri_taso');
const { helsinginHetki } = require('../helsinki_paiva');

const fx = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/taso_' + n + '.json'), 'utf8'));
const MATCHES = fx('getMatches'), CLUB = fx('getClub'), NEXT = fx('getNextMatches'), TEAM = fx('getTeam');
const DOC = MATCHES.matches[0];   // match_id 276155: HJK (team_A, koti) – RoPS (team_B, vieras), 2015-04-23 18:00, Played, fs 2–1
const KARTTA = { '60808': 'rops_u13' }, NIMET = { rops_u13: 'RoPS U13' }, NYT = helsinginHetki(2015, 4, 20, 12, 0);
const variantti = (patch) => Object.assign({}, DOC, patch);
const oma = (o) => K.tasoOttelu(Object.assign({ _taso_team_id: '60808' }, o), KARTTA, NIMET);

test('osoite: YKSI vakio https://spl.torneopal.net/taso/rest (ei .fi) — kaikki käyttäjät samasta moduulista', () => {
  assert.strictEqual(A.TASO_BASE, 'https://spl.torneopal.net/taso/rest');
  const juuri = path.join(__dirname, '..', '..'), tiedostot = ['functions/index.js', 'functions/kalenteri_taso.js', 'functions/taso_api.js', 'scripts/yhdista_taso_joukkueet.js'];
  tiedostot.forEach((f) => { const s = fs.readFileSync(path.join(juuri, f), 'utf8'); assert.ok(!/torneopal\.fi/.test(s), f + ' sisältää torneopal.fi'); if (f !== 'functions/taso_api.js') assert.ok(!/spl\.torneopal\./.test(s), f + ' määrittelee osoitteen itse'); });
  assert.ok(fs.readFileSync(path.join(juuri, 'functions/index.js'), 'utf8').includes("require('./taso_api')")); assert.ok(fs.readFileSync(path.join(juuri, 'functions/kalenteri_taso.js'), 'utf8').includes("require('./taso_api')"));
});
test('kausi: kalenterivuosi merkkijonona (Helsingin vuosi), vuodenvaihde Helsingin ajassa', () => {
  assert.strictEqual(A.kausiTunniste(helsinginHetki(2026, 10, 13, 12, 0)), '2026'); assert.strictEqual(A.kausiTunniste(Date.UTC(2026, 11, 31, 22, 30)), '2027', '31.12. klo 22:30 UTC = 1.1. Helsingissä'); assert.strictEqual(A.kausiTunniste(Date.UTC(2026, 11, 31, 20, 0)), '2026');
});
test('hakuikkuna: tänään − 30 pv … tänään + 180 pv (YYYY-MM-DD, Helsingin päivä); rajat ms:nä', () => {
  const n = helsinginHetki(2026, 10, 13, 12, 0), i = A.hakuIkkuna(n); assert.strictEqual(i.start_date, '2026-09-13'); assert.strictEqual(i.end_date, '2027-04-11'); assert.strictEqual(i.alkuMs, helsinginHetki(2026, 9, 13, 0, 0)); assert.strictEqual(i.loppuMs, helsinginHetki(2027, 4, 11, 23, 59) + 59999);
  const y = A.hakuIkkuna(Date.UTC(2026, 11, 31, 22, 30)); assert.strictEqual(y.start_date, '2026-12-02'); assert.strictEqual(y.end_date, '2027-06-30', 'Helsingin päivä 1.1.2027 + 180 pv');
  assert.strictEqual(A.HAKU_TAAKSE_PV, 30); assert.strictEqual(A.HAKU_ETEEN_PV, 180);
});
test('fixturet ovat dokumentaation muotoa: getMatches/getNextMatches date+time+team_A/B, ei vanhoja kenttiä; getClub club.teams[]; getTeam team.team_id', () => {
  [...MATCHES.matches, ...NEXT.matches].forEach((m) => { ['match_id', 'date', 'time', 'team_A_id', 'team_A_name', 'team_B_id', 'team_B_name', 'venue_name', 'status'].forEach((k) => assert.ok(k in m, k)); assert.ok(!('match_time' in m) && !('home_team_id' in m) && !('away_team_id' in m)); });
  assert.ok(Array.isArray(CLUB.club.teams) && !('teams' in CLUB), 'getClub: joukkueet polussa club.teams, ei ylätasolla'); CLUB.club.teams.forEach((t) => ['team_id', 'team_name', 'category_id', 'category_name'].forEach((k) => assert.ok(k in t, k)));
  assert.ok(TEAM.team.team_id && TEAM.team.team_name && Array.isArray(TEAM.team.categories));
});
test('otteluKentat (getMatches-esimerkki): date + time → pvm/kello; team_A koti, team_B vieras; venue_name; status', () => {
  const a = A.otteluKentat(DOC); assert.deepStrictEqual([a.id, a.pvm, a.kello, a.koti, a.vieras, a.paikka, a.status], ['276155', '2015-04-23', '18:00', { id: '60731', nimi: 'HJK' }, { id: '60808', nimi: 'RoPS' }, 'Telia 5G Areena', 'Played']);
  const n = A.otteluKentat(NEXT.matches[0]); assert.deepStrictEqual([n.id, n.pvm, n.kello, n.koti.nimi, n.vieras.nimi, n.paikka, n.status], ['782770', '2026-04-11', '09:00', 'PeTä/Diamonds/C', 'VanLe/1', 'Karkkilan liikuntahalli', 'Scheduled']);
  assert.strictEqual(A.otteluKentat(variantti({ time: '14:30' })).kello, '14:30'); assert.strictEqual(A.otteluKentat(variantti({ time: '' })).kello, null, 'time tyhjä'); const ilman = variantti({}); delete ilman.time; assert.strictEqual(A.otteluKentat(ilman).kello, null, 'time puuttuu');
  assert.strictEqual(A.otteluKentat({ match_id: 1, date: 'huomenna' }), null); assert.strictEqual(A.otteluKentat({ date: '2015-04-23' }), null); assert.strictEqual(A.otteluKentat(null), null);
});
test('getClub → joukkueet: club.teams[] (team_id, team_name, category_name); vanha ylätason teams EI käy; tyhjä → []', () => {
  const t = A.klubinJoukkueet(CLUB); assert.deepStrictEqual(t.map((x) => [x.team_id, x.team_name, x.category_name]), [['60808', 'Example Team', 'Veikkausliiga']]);
  assert.deepStrictEqual(A.klubinJoukkueet({ teams: [{ team_id: '1' }] }), []); assert.deepStrictEqual(A.klubinJoukkueet(null), []); assert.deepStrictEqual(A.klubinJoukkueet({ club: {} }), []);
});
test('tulos: fs_A–fs_B (dokumentaatio); ei tulosta → null; vanhat home_goals/away_goals eivät käy', () => {
  assert.strictEqual(A.otteluTulos(DOC), '2–1'); assert.strictEqual(A.otteluTulos(NEXT.matches[0]), null); assert.strictEqual(A.otteluTulos(variantti({ fs_A: '', fs_B: '' })), null); assert.strictEqual(A.otteluTulos({ home_goals: 3, away_goals: 1 }), null);
});
test('kalenterikartoitus (getMatches-esimerkki): vierasottelu → vastustaja = team_A (HJK); Helsingin aika; kesto 90 min; id taso_<match_id>', () => {
  const k = oma(DOC); assert.strictEqual(k.id, 'taso_276155'); assert.strictEqual(k.vastustaja, 'HJK'); assert.strictEqual(k.nimi, 'HJK – RoPS'); assert.strictEqual(k.lahde.alkaa, helsinginHetki(2015, 4, 23, 18, 0)); assert.strictEqual(k.lahde.paattyy - k.lahde.alkaa, 90 * 60000); assert.strictEqual(k.lahde.koko_paiva, false); assert.strictEqual(k.lahde.paikka, 'Telia 5G Areena'); assert.deepStrictEqual(k.omat, ['rops_u13']);
  const koti = K.tasoOttelu(Object.assign({ _taso_team_id: '60731' }, DOC), { '60731': 'hjk_u13' }, { hjk_u13: 'HJK U13' }); assert.strictEqual(koti.vastustaja, 'RoPS', 'kotiottelu: vastustaja = team_B');
  const s = K.tasoOttelu(Object.assign({ _taso_team_id: '58682' }, NEXT.matches[0]), { '58682': 'x' }, { x: 'X' }); assert.strictEqual(s.lahde.alkaa, helsinginHetki(2026, 4, 11, 9, 0)); assert.strictEqual(s.lahde.tila, 'suunniteltu', 'Scheduled ei ole peruttu');
});
test('koko päivä: time tyhjä tai puuttuu → koko_paiva, 00:00–23:59 Helsinki; luonti tallentaa koko_paiva; päivitys vaihtaa arvon', () => {
  const ilman = variantti({}); delete ilman.time;
  for (const o of [variantti({ time: '' }), ilman]) { const e = oma(o); assert.strictEqual(e.lahde.koko_paiva, true); assert.strictEqual(e.lahde.alkaa, helsinginHetki(2015, 4, 23, 0, 0)); assert.strictEqual(e.lahde.paattyy, helsinginHetki(2015, 4, 23, 23, 59)); }
  const fv = { serverTimestamp: () => 'TS' }, ts = { fromMillis: (ms) => ({ ms }) }; assert.strictEqual(K.uusiDokumentti(oma(variantti({ time: '' })), fv, ts).koko_paiva, true); assert.strictEqual(K.uusiDokumentti(oma(DOC), fv, ts).koko_paiva, false);
  assert.strictEqual(K.lahdePaivitys({ koko_paiva: false, alkaa: ts.fromMillis(1), paattyy: ts.fromMillis(2) }, oma(variantti({ time: '' })).lahde).koko_paiva, true);
});
test('tilat (dokumentaation enum Fixture,Planned,Live,Break,Played,Canceled,Suspended,Abandoned,Reschedule): Canceled/Suspended/Abandoned → peruttu; muut, myös Reschedule ja Scheduled → ei', () => {
  const tila = (s) => oma(variantti({ status: s })).lahde.tila;
  ['Canceled', 'Suspended', 'Abandoned', 'Cancelled'].forEach((s) => assert.strictEqual(tila(s), 'peruttu', s)); ['Reschedule', 'Fixture', 'Planned', 'Live', 'Break', 'Played', 'Scheduled'].forEach((s) => assert.strictEqual(tila(s), 'suunniteltu', s));
  assert.ok(!A.PERUTTU_RE.test('Reschedule'));
});
test('perutus vain hakuikkunan tulevista: ikkunan sisällä puuttuva → peruttu; ikkunan ulkopuolella tai mennyt → ei', () => {
  const ikkuna = A.hakuIkkuna(NYT), ts = { fromMillis: (ms) => ({ toMillis: () => ms }) }, ol = (alkaa) => ({ lahde: 'taso', tila: 'suunniteltu', alkaa: ts.fromMillis(alkaa), paattyy: ts.fromMillis(alkaa + 1), koko_paiva: false, paikka: null });
  const olemassa = { taso_sisalla: ol(helsinginHetki(2015, 6, 1, 12, 0)), taso_ulkona: ol(helsinginHetki(2016, 6, 1, 12, 0)), taso_mennyt: ol(helsinginHetki(2015, 4, 10, 12, 0)) };
  assert.deepStrictEqual(K.suunnitteleSynkka([], olemassa, KARTTA, NIMET, NYT, ikkuna).peru, [{ id: 'taso_sisalla' }]);
  assert.deepStrictEqual(K.suunnitteleSynkka([], olemassa, KARTTA, NIMET, NYT).peru.map((x) => x.id).sort(), ['taso_sisalla', 'taso_ulkona'], 'ilman ikkunaa kaikki tulevat');
});
test('haeOttelut: getMatches(team_id, start_date, end_date) — EI season_id:tä; vain yhdistetyt joukkueet', async () => {
  const kutsut = [], tasoHae = async (e, p) => { kutsut.push([e, p]); return MATCHES; }, ikkuna = A.hakuIkkuna(NYT);
  const o = await K.haeOttelut(tasoHae, 'avain', { '60808': 'a', '60731': 'b' }, ikkuna);
  assert.deepStrictEqual(kutsut.map((k) => k[0]), ['getMatches', 'getMatches']); kutsut.forEach(([, p]) => { assert.deepStrictEqual(Object.keys(p).sort(), ['end_date', 'start_date', 'team_id']); assert.strictEqual(p.start_date, '2015-03-21'); assert.strictEqual(p.end_date, '2015-10-17'); });
  assert.deepStrictEqual([...new Set(o.map((x) => x._taso_team_id))].sort(), ['60731', '60808']);
});
test('ajaSeura koko ketju dokumentaation esimerkillä: getMatches-parametrit, ottelu luodaan kalenteriin joukkueelle, toinen ajo ei luo uudelleen; peruttu variantti → tila peruttu', async () => {
  const store = new Map([['seurat/s', { taso_api_key: 'k', taso_club_id: '1' }], ['seurat/s/konfiguraatio/kalenterilahteet', { taso: { joukkueet: KARTTA } }], ['seurat/s/joukkueet/rops_u13', { nimi: 'RoPS U13' }]]);
  const col = (polku) => ({ doc: (id) => ({ _p: polku + '/' + id, get: async () => ({ exists: store.has(polku + '/' + id), data: () => store.get(polku + '/' + id) }), collection: (c) => col(polku + '/' + id + '/' + c) }), where: (f, op, v) => ({ get: async () => { const ds = [...store.keys()].filter((k) => k.startsWith(polku + '/') && store.get(k)[f] === v).map((k) => ({ id: k.split('/').pop(), data: () => store.get(k) })); return { docs: ds, forEach: (fn) => ds.forEach(fn) }; } }), get: async () => { const ds = [...store.keys()].filter((k) => k.startsWith(polku + '/') && !k.slice(polku.length + 1).includes('/')).map((k) => ({ id: k.split('/').pop(), data: () => store.get(k) })); return { docs: ds, forEach: (fn) => ds.forEach(fn) }; } });
  const db = { collection: (c) => col(c), batch: () => { const ops = []; return { set: (r, d) => ops.push([r._p, d]), update: (r, d) => ops.push([r._p, Object.assign({}, store.get(r._p), d)]), commit: async () => ops.forEach(([p, d]) => store.set(p, d)) }; } };
  let vastaus = MATCHES; const kutsut = [], deps = { db, tasoHae: async (e, p) => { kutsut.push(p); return vastaus; }, FieldValue: { serverTimestamp: () => 'TS' }, Timestamp: { fromMillis: (ms) => ({ toMillis: () => ms }) } };
  const r = await K.ajaSeura(deps, 's', NYT); assert.deepStrictEqual(kutsut, [{ team_id: '60808', start_date: '2015-03-21', end_date: '2015-10-17' }]); assert.strictEqual(r.luotu, 1);
  const d = store.get('seurat/s/kalenteri/taso_276155'); assert.deepStrictEqual([d.joukkue, d.vastustaja, d.tila, d.koko_paiva, d.paikka], ['rops_u13', 'HJK', 'suunniteltu', false, 'Telia 5G Areena']);
  assert.strictEqual((await K.ajaSeura(deps, 's', NYT)).luotu, 0);
  vastaus = { matches: [variantti({ status: 'Canceled' })] }; await K.ajaSeura(deps, 's', NYT); assert.strictEqual(store.get('seurat/s/kalenteri/taso_276155').tila, 'peruttu');
});
