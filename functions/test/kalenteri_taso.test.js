'use strict';
/**
 * K35-5 — TASO-ottelut kalenteriin: dedup, siirto, perutus, TM-kenttiä ei ylikirjoiteta (D181), yhdistämättömiä joukkueita ei tuoda, ilmoitus (notifKalenteriMuutos-päätös), synkan ajo fake-Firestorella.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const T = require('../kalenteri_taso');
const { muutosPaatos } = require('../kalenteri_notif');
const { helsinginHetki } = require('../helsinki_paiva');

const KARTTA = { '111': 'kpv_u13', '222': 'kpv_u14' }, NIMET = { kpv_u13: 'KPV U13', kpv_u14: 'KPV U14' };
const NYT = helsinginHetki(2026, 10, 12, 12, 0);
const ott = (id, o) => Object.assign({ match_id: id, match_time: '2026-10-24 12:00:00', home_team_id: '111', home_team_name: 'KPV U13', away_team_id: '999', away_team_name: 'Vaasan Vastus', venue_name: 'Hietalahti', status: 'Fixture', _taso_team_id: '111' }, o || {});
const ts = { fromMillis: (ms) => ({ __ms: ms, toMillis: () => ms }) }, fv = { serverTimestamp: () => 'TS', delete: () => 'DEL' };

test('tasoOttelu: id taso_<match_id>, Helsingin aika → ms, kesto 90 min, vastustaja, joukkue-id kartasta; yhdistämätön joukkue / puuttuva aika → null', () => {
  const t = T.tasoOttelu(ott(5001), KARTTA, NIMET);
  assert.strictEqual(t.id, 'taso_5001'); assert.deepStrictEqual(t.omat, ['kpv_u13']); assert.strictEqual(t.vastustaja, 'Vaasan Vastus'); assert.strictEqual(t.nimi, 'KPV U13 – Vaasan Vastus');
  assert.strictEqual(t.lahde.alkaa, helsinginHetki(2026, 10, 24, 12, 0)); assert.strictEqual(t.lahde.paattyy - t.lahde.alkaa, 90 * 60000); assert.deepStrictEqual([t.lahde.paikka, t.lahde.tila, t.lahde.koko_paiva], ['Hietalahti', 'suunniteltu', false]);
  assert.strictEqual(T.tasoOttelu(ott(5002, { home_team_id: '777', _taso_team_id: '777' }), KARTTA, NIMET), null, 'yhdistämätön joukkue → ei tuoda');
  assert.strictEqual(T.tasoOttelu(ott(5003, { match_time: null }), KARTTA, NIMET), null); assert.strictEqual(T.tasoOttelu(ott(null), KARTTA, NIMET), null);
  assert.strictEqual(T.tasoOttelu(ott(5004, { away_team_id: '111', home_team_id: '999', home_team_name: 'Vastus', away_team_name: 'KPV U13' }), KARTTA, NIMET).vastustaja, 'Vastus', 'vierasottelu: vastustaja on kotijoukkue');
});
test('tila: peruttu/siirretty/keskeytetty-tilat → peruttu (case-insensitive); tavallinen → suunniteltu', () => {
  for (const s of ['Canceled', 'cancelled', 'Postponed', 'abandoned', 'Peruttu', 'siirretty']) assert.strictEqual(T.tasoOttelu(ott(1, { status: s }), KARTTA, NIMET).lahde.tila, 'peruttu', s);
  for (const s of ['Fixture', 'Played', '', undefined]) assert.strictEqual(T.tasoOttelu(ott(1, { status: s }), KARTTA, NIMET).lahde.tila, 'suunniteltu', String(s));
});
test('DEDUP: sama ottelu kahdelta joukkueelta (molemmat omia) / toistuva haku → yksi dokumentti, joukkueet yhdistetty; toinen ajo ei luo mitään', () => {
  const o1 = ott(7, { home_team_id: '111', away_team_id: '222', away_team_name: 'KPV U14', _taso_team_id: '111' }), o2 = Object.assign({}, o1, { _taso_team_id: '222' });
  const s = T.suunnitteleSynkka([o1, o2], {}, KARTTA, NIMET, NYT);
  assert.strictEqual(s.luo.length, 1); assert.deepStrictEqual(s.luo[0].ottelu.omat.sort(), ['kpv_u13', 'kpv_u14']); assert.strictEqual(s.luo[0].ottelu.vastustaja, '', 'oma vs oma: ei vastustajaa');
  const ol = { taso_7: { lahde: 'taso', tila: 'suunniteltu', alkaa: ts.fromMillis(s.luo[0].ottelu.lahde.alkaa), paattyy: ts.fromMillis(s.luo[0].ottelu.lahde.paattyy), koko_paiva: false, paikka: 'Hietalahti', paikka_id: null } };
  const s2 = T.suunnitteleSynkka([o1, o2], ol, KARTTA, NIMET, NYT); assert.deepStrictEqual([s2.luo.length, s2.paivita.length, s2.peru.length], [0, 0, 0]);
});
test('SIIRTO: aika/paikka muuttuu → päivitetään VAIN muuttuneet lähdekentät (alkaa+paattyy / paikka), muuta ei', () => {
  const t = T.tasoOttelu(ott(8), KARTTA, NIMET).lahde, ol = { taso_8: { lahde: 'taso', tila: 'suunniteltu', alkaa: ts.fromMillis(t.alkaa), paattyy: ts.fromMillis(t.paattyy), koko_paiva: false, paikka: 'Hietalahti', paikka_id: null } };
  const s = T.suunnitteleSynkka([ott(8, { match_time: '2026-10-24 14:30:00', venue_name: 'Stadion' })], ol, KARTTA, NIMET, NYT);
  assert.strictEqual(s.paivita.length, 1); assert.deepStrictEqual(Object.keys(s.paivita[0].kentat).sort(), ['alkaa', 'paattyy', 'paikka']); assert.strictEqual(s.paivita[0].kentat.alkaa, helsinginHetki(2026, 10, 24, 14, 30)); assert.strictEqual(s.paivita[0].kentat.paikka, 'Stadion');
  const vainPaikka = T.suunnitteleSynkka([ott(8, { venue_name: 'Stadion' })], ol, KARTTA, NIMET, NYT); assert.deepStrictEqual(Object.keys(vainPaikka.paivita[0].kentat), ['paikka']);
});
test('PERUTUS: TASO ilmoittaa perutuksi → tila peruttu; peruttu palautuu jos TASO palauttaa; poistunut tuleva ottelu → peruttu; poistunut menneisyydessä / jo peruttu / ei-taso / soft-deleted → ei', () => {
  const l = T.tasoOttelu(ott(9), KARTTA, NIMET).lahde, pohja = { lahde: 'taso', tila: 'suunniteltu', alkaa: ts.fromMillis(l.alkaa), paattyy: ts.fromMillis(l.paattyy), koko_paiva: false, paikka: 'Hietalahti', paikka_id: null };
  assert.deepStrictEqual(T.suunnitteleSynkka([ott(9, { status: 'Canceled' })], { taso_9: pohja }, KARTTA, NIMET, NYT).paivita, [{ id: 'taso_9', kentat: { tila: 'peruttu' } }]);
  assert.deepStrictEqual(T.suunnitteleSynkka([ott(9)], { taso_9: Object.assign({}, pohja, { tila: 'peruttu' }) }, KARTTA, NIMET, NYT).paivita, [{ id: 'taso_9', kentat: { tila: 'suunniteltu' } }]);
  const tuleva = Object.assign({}, pohja), mennyt = Object.assign({}, pohja, { alkaa: ts.fromMillis(NYT - 86400000) });
  const ol = { taso_10: tuleva, taso_11: mennyt, taso_12: Object.assign({}, pohja, { tila: 'peruttu' }), taso_13: Object.assign({}, pohja, { lahde: 'manuaalinen' }), taso_14: Object.assign({}, pohja, { poistettu: true }) };
  assert.deepStrictEqual(T.suunnitteleSynkka([], ol, KARTTA, NIMET, NYT).peru, [{ id: 'taso_10' }]);
  assert.deepStrictEqual(T.suunnitteleSynkka([ott(9)], { taso_9: Object.assign({}, pohja, { tila: 'muu_tila' }) }, KARTTA, NIMET, NYT).paivita, [], 'muita tiloja lähde ei koske');
});
test('D181: päivitys ei koske TM:n kenttiin (teema, md, muistiinpanot, pelaajaviesti, logistiikka, pelaajat_id, joukkue): lahdePaivitys palauttaa vain LAHTEEN_KENTAT', () => {
  const t = T.tasoOttelu(ott(15, { match_time: '2026-10-25 10:00:00' }), KARTTA, NIMET).lahde;
  const ol = { lahde: 'taso', tila: 'suunniteltu', teema: 'Rakentaminen', md: -3, pelaajaviesti: 'Tuo säärisuojat', logistiikka: { saapumisaika: '11:00' }, pelaajat_id: ['p1'], joukkue: 'kpv_u13', alkaa: ts.fromMillis(1), paattyy: ts.fromMillis(2), paikka: 'x' };
  const p = T.lahdePaivitys(ol, Object.assign({}, t, { teema: 'X', md: 9, pelaajaviesti: 'Y', joukkue: 'muu', nimi: 'Z' }));
  Object.keys(p).forEach((k) => assert.ok(T.LAHTEEN_KENTAT.includes(k), k + ' ei ole lähdekenttä')); assert.deepStrictEqual(T.LAHTEEN_KENTAT, ['alkaa', 'paattyy', 'koko_paiva', 'paikka', 'paikka_id', 'tila']);
});
test('yhdistämättömät: kartta tyhjä → ei mitään; ottelut muiden joukkueiden → ohitettu', () => {
  const s = T.suunnitteleSynkka([ott(20, { home_team_id: '555', _taso_team_id: '555' })], {}, KARTTA, NIMET, NYT); assert.deepStrictEqual([s.luo.length, s.ohitettu], [0, 1]);
  assert.strictEqual(T.suunnitteleSynkka([ott(21)], {}, {}, NIMET, NYT).luo.length, 0);
});
test('ILMOITUS: tila peruttu → notifKalenteriMuutos-päätös "Peruttu: …" (ei soft-delete); siirto → muutos; päättynyt → ei', () => {
  const alku = new Date(Date.now() + 3 * 3600000), tsx = (d) => ({ toDate: () => d, toMillis: () => d.getTime() });
  const e = { nimi: 'KPV U13 – Vastus', alkaa: tsx(alku), paattyy: tsx(new Date(alku.getTime() + 5400000)), tila: 'suunniteltu', paikka: 'A' };
  const p = muutosPaatos(e, Object.assign({}, e, { tila: 'peruttu' }), new Date()); assert.ok(p); assert.strictEqual(p.tyyppi, 'peruttu'); assert.strictEqual(p.teksti, 'Peruttu: KPV U13 – Vastus');
  assert.strictEqual(muutosPaatos(e, Object.assign({}, e, { paikka: 'B' }), new Date()).tyyppi, 'muutos'); assert.strictEqual(muutosPaatos(Object.assign({}, e, { tila: 'peruttu' }), Object.assign({}, e, { tila: 'peruttu' }), new Date()), null, 'jo peruttu → ei uutta');
});

/* ── synkan ajo fake-Firestorella ── */
function fakeDb(alku) {
  const store = new Map(Object.entries(alku || {})), kirj = [];
  const col = (polku) => ({ doc: (id) => ({ _p: polku + '/' + id, get: async () => ({ exists: store.has(polku + '/' + id), data: () => store.get(polku + '/' + id) }), collection: (c) => col(polku + '/' + id + '/' + c) }),
    where: (f, op, v) => ({ get: async () => { const ds = [...store.keys()].filter((k) => k.startsWith(polku + '/') && !k.slice(polku.length + 1).includes('/') && store.get(k)[f] === v).map((k) => ({ id: k.split('/').pop(), data: () => store.get(k) })); return { docs: ds, forEach: (fn) => ds.forEach(fn) }; } }),
    get: async () => { const ds = [...store.keys()].filter((k) => k.startsWith(polku + '/') && !k.slice(polku.length + 1).includes('/')).map((k) => ({ id: k.split('/').pop(), data: () => store.get(k) })); return { docs: ds, forEach: (fn) => ds.forEach(fn) }; } });
  return { store, kirj, collection: (c) => col(c), batch: () => { const ops = []; return { set: (r, d) => ops.push(['set', r._p, d]), update: (r, d) => ops.push(['update', r._p, d]), commit: async () => { ops.forEach(([o, p, d]) => { kirj.push([o, p]); store.set(p, o === 'set' ? d : Object.assign({}, store.get(p), d)); }); } }; } };
}
test('synkkaaSeura: luo → päivittää siirron → peruu poistuneen; TM-kentät säilyvät; toinen ajo ei kirjoita; ei karttaa → ei kirjoituksia', async () => {
  const db = fakeDb({ 'seurat/kpv/konfiguraatio/kalenterilahteet': { taso: { joukkueet: KARTTA } }, 'seurat/kpv/joukkueet/kpv_u13': { nimi: 'KPV U13' }, 'seurat/kpv/joukkueet/kpv_u14': { nimi: 'KPV U14' } }), deps = { db, FieldValue: fv, Timestamp: ts };
  const r1 = await T.synkkaaSeura(deps, 'kpv', [ott(30), ott(31, { match_time: '2026-11-07 10:00:00' }), ott(32, { home_team_id: '555', _taso_team_id: '555' })], NYT);
  assert.deepStrictEqual([r1.luotu, r1.paivitetty, r1.peruttu, r1.ohitettu], [2, 0, 0, 1]);
  const d = db.store.get('seurat/kpv/kalenteri/taso_30'); assert.deepStrictEqual([d.lahde, d.lahde_id, d.tyyppi, d.joukkue, d.joukkue_nimi, d.vastustaja, d.luoja_uid, d.poistettu], ['taso', 'taso_30', 'ottelu', 'kpv_u13', 'KPV U13', 'Vaasan Vastus', 'taso_synkka', false]); assert.ok(!('muistiinpanot' in d));
  d.teema = 'Rakentaminen'; d.pelaajaviesti = 'Tuo pelipaita';   // valmentaja täydentää
  const kirj0 = db.kirj.length; const r2 = await T.synkkaaSeura(deps, 'kpv', [ott(30), ott(31, { match_time: '2026-11-07 10:00:00' })], NYT); assert.deepStrictEqual([r2.luotu, r2.paivitetty, r2.peruttu], [0, 0, 0]); assert.strictEqual(db.kirj.length, kirj0, 'toinen ajo ei kirjoita');
  const r3 = await T.synkkaaSeura(deps, 'kpv', [ott(30, { match_time: '2026-10-24 15:00:00' })], NYT);   // 30 siirtyy, 31 poistuu lähteestä
  assert.deepStrictEqual([r3.luotu, r3.paivitetty, r3.peruttu], [0, 1, 1]);
  const d2 = db.store.get('seurat/kpv/kalenteri/taso_30'); assert.strictEqual(d2.alkaa.toMillis(), helsinginHetki(2026, 10, 24, 15, 0)); assert.deepStrictEqual([d2.teema, d2.pelaajaviesti, d2.tila, d2.muokkaaja_uid], ['Rakentaminen', 'Tuo pelipaita', 'suunniteltu', 'taso_synkka']);
  assert.strictEqual(db.store.get('seurat/kpv/kalenteri/taso_31').tila, 'peruttu'); assert.strictEqual(db.store.get('seurat/kpv/kalenteri/taso_31').poistettu, false);
  const tyhja = fakeDb({ 'seurat/x/konfiguraatio/kalenterilahteet': { taso: { joukkueet: {} } } }); const r4 = await T.synkkaaSeura({ db: tyhja, FieldValue: fv, Timestamp: ts }, 'x', [ott(1)], NYT); assert.strictEqual(r4.ei_karttaa, true); assert.strictEqual(tyhja.kirj.length, 0);
});
test('ajaSeura: ilman TASO-avaimia tai karttaa → null (ei kutsua TASOon); haku virheeseen → ajo keskeytyy eikä peru mitään', async () => {
  const kutsut = []; const tasoHae = async (e, p) => { kutsut.push([e, p.team_id]); return { matches: [ott(40)] }; };
  const db0 = fakeDb({ 'seurat/a': { nimi: 'A' } }); assert.strictEqual(await T.ajaSeura({ db: db0, tasoHae, FieldValue: fv, Timestamp: ts }, 'a', NYT), null);
  const db1 = fakeDb({ 'seurat/b': { taso_api_key: 'k', taso_club_id: '1' }, 'seurat/b/konfiguraatio/kalenterilahteet': { taso: { joukkueet: {} } } }); assert.strictEqual(await T.ajaSeura({ db: db1, tasoHae, FieldValue: fv, Timestamp: ts }, 'b', NYT), null); assert.strictEqual(kutsut.length, 0);
  const db2 = fakeDb({ 'seurat/c': { taso_api_key: 'k', taso_club_id: '1' }, 'seurat/c/konfiguraatio/kalenterilahteet': { taso: { joukkueet: KARTTA } }, 'seurat/c/joukkueet/kpv_u13': { nimi: 'KPV U13' }, 'seurat/c/kalenteri/taso_41': { lahde: 'taso', tila: 'suunniteltu', alkaa: ts.fromMillis(NYT + 86400000) } });
  await assert.rejects(() => T.ajaSeura({ db: db2, tasoHae: async () => { throw new Error('TASO alhaalla'); }, FieldValue: fv, Timestamp: ts }, 'c', NYT), /TASO alhaalla/); assert.strictEqual(db2.store.get('seurat/c/kalenteri/taso_41').tila, 'suunniteltu', 'virheessä ei peruta');
  const r = await T.ajaSeura({ db: db2, tasoHae, FieldValue: fv, Timestamp: ts }, 'c', NYT); assert.ok(r.luotu >= 1); assert.deepStrictEqual(kutsut.map((k) => k[1]).sort(), ['111', '222']);   // vain yhdistetyt joukkueet haettiin
});
test('kausiTunniste: elo–joulu = vvvv-(vvvv+1), tammi–heinä = (vvvv-1)-vvvv', () => { assert.strictEqual(T.kausiTunniste(new Date(2026, 9, 12)), '2026-2027'); assert.strictEqual(T.kausiTunniste(new Date(2027, 2, 1)), '2026-2027'); assert.strictEqual(T.kausiTunniste(new Date(2026, 7, 1)), '2026-2027'); });
