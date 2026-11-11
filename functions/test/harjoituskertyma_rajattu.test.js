'use strict';
/** Projekti 06: rajattu kertymälaskenta (paivitaViikko) vs ALKUPERÄINEN koko-seuran polku (paivitaViikkoKoko) — pariteetti 12 tilanteessa, varapolku indeksipuutteella, lukumäärä. */
const { test } = require('node:test');
const assert = require('node:assert');
const K = require('../harjoituskertyma');
const { luoDb } = require('./kertyma_vale');
const ts = (ms) => ({ toDate: () => new Date(ms), _ms: ms });
const Timestamp = { fromDate: (d) => ts(d.getTime()) }, FieldPath = { documentId: () => '__id__' };
const NYT = Date.parse('2026-10-19T09:00:00+03:00'), ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
const deps = (db) => ({ db, Timestamp, FieldPath, palvelinAika: () => 'TS', nyt: () => NYT });
const ev = (d, o) => Object.assign({ tyyppi: 'harjoitus', alkaa: ts(ms(d, '17:30')), paattyy: ts(ms(d, '19:00')), joukkue: 'demo_u13', joukkueet: ['demo_u13'], poistettu: false }, o || {});
const PEL = (o) => Object.assign({ etunimi: 'Aatu', joukkue: 'Demo U13', joukkueet: ['demo_u13'] }, o || {});
const JK = [{ id: 'demo_u13', nimi: 'Demo U13' }, { id: 'demo_u14', nimi: 'Demo U14' }, { id: 'muu_u12', nimi: 'Muu U12' }];
const pohja = () => ({
  pelaajat: { p1: PEL(), p2: PEL() }, joukkueet: JK,
  eventit: { a: ev('2026-10-13'), b: ev('2026-10-15'), c: ev('2026-10-14', { joukkue: 'muu_u12', joukkueet: ['muu_u12'] }), d: ev('2026-10-16', { joukkue: 'demo_u14', joukkueet: ['demo_u14'] }), vanha: ev('2026-09-01'), tuleva: ev('2026-10-18') },
  lasnaolot: { 'a/p1': { tila: 'paikalla' }, 'b/p1': { tila: 'poissa', syy: 'sairas' }, 'c/p1': { tila: 'paikalla' }, 'd/p1': { tila: 'myohassa' } },
  kirjaukset: { p1: { '2026-10-14': { tyyppi: 'T', tehty: true, kesto_min: 20 }, '2026-10-17': { tyyppi: 'lepo', tehty: true } } },
});
const SKENAARIOT = {
  'perus (oma joukkue + muiden joukkueiden tapahtumat)': () => pohja(),
  'kaksi joukkuetta': () => { const o = pohja(); o.pelaajat.p1 = PEL({ joukkueet: ['demo_u13', 'demo_u14'] }); return o; },
  'legacy: tapahtuma joukkue=nimi, joukkueet=[nimi] (Master)': () => { const o = pohja(); o.eventit.a = ev('2026-10-13', { joukkue: 'Demo U13', joukkueet: ['Demo U13'] }); o.eventit.b = ev('2026-10-15', { joukkue: 'Demo U13', joukkueet: [] }); return o; },
  'legacy: pelaajalla ei joukkueet[], vain joukkue-nimi': () => { const o = pohja(); o.pelaajat.p1 = { etunimi: 'Aatu', joukkue: 'Demo U13' }; return o; },
  'legacy: pelaajan joukkueet[] sisältää nimen id:n paikalla': () => { const o = pohja(); o.pelaajat.p1 = PEL({ joukkueet: ['Demo U13'] }); return o; },
  'ryhmätapahtuma (pelaajat_id, ei joukkuetta) + poimittu': () => { const o = pohja(); o.eventit.r = ev('2026-10-15', { joukkue: null, joukkueet: [], pelaajat_id: ['p1'], kohde: { tyyppi: 'ryhma', ryhma_id: 'r1' } }); o.lasnaolot['r/p1'] = { tila: 'paikalla' }; return o; },
  'peruttu / poistettu / henkilökunnan tapahtuma ei lasketa': () => { const o = pohja(); o.eventit.a = ev('2026-10-13', { tila: 'peruttu' }); o.eventit.b = ev('2026-10-15', { poistettu: true }); o.eventit.h = ev('2026-10-14', { nakyvyys: 'henkilokunta' }); o.lasnaolot['h/p1'] = { tila: 'paikalla' }; return o; },
  'aamutreeni + ottelu + vahvistamaton (ei kirjattu)': () => { const o = pohja(); o.eventit.m = ev('2026-10-12', { alalaji: 'aamutreeni' }); o.eventit.o = ev('2026-10-17', { tyyppi: 'ottelu' }); return o; },
  'ei lasnaolijoita eikä kirjauksia': () => { const o = pohja(); o.lasnaolot = {}; o.kirjaukset = {}; return o; },
  'joukkuetunniste ei ratkea (→ varapolku)': () => { const o = pohja(); o.pelaajat.p1 = PEL({ joukkueet: ['ei_ole_olemassa'] }); return o; },
  'pelaajalla ei joukkuetta lainkaan': () => { const o = pohja(); o.pelaajat.p1 = { etunimi: 'Aatu' }; o.eventit.r = ev('2026-10-15', { joukkue: null, joukkueet: [], pelaajat_id: ['p1'] }); return o; },
  'seuralla ei joukkuedokumentteja (legacy)': () => { const o = pohja(); o.joukkueet = []; return o; },
};
const viikot = (db) => JSON.parse(JSON.stringify(db.kirjoitukset.map((x) => [x.pid, x.id, x.d.kausi, x.d.viikot, x.opts])));

for (const [nimi, rakenna] of Object.entries(SKENAARIOT)) {
  test('PARITEETTI: ' + nimi + ' — rajattu = alkuperäinen (sama kooste)', async () => {
    for (const iso of ['2026-10-14', '2026-10-12']) {
      const a = luoDb(rakenna()), b = luoDb(rakenna());
      await K.paivitaViikko(deps(a), 'demo', 'p1', iso, NYT); await K.paivitaViikkoKoko(deps(b), 'demo', 'p1', iso, NYT);
      assert.strictEqual(a.kirjoitukset.length, 1); assert.deepStrictEqual(viikot(a), viikot(b), iso);
    }
  });
}
test('PARITEETTI: rajattu ei lue enempää kuin alkuperäinen, ja ≤ 15 lukua/kutsu tavallisessa tilanteessa', async () => {
  const a = luoDb(pohja()), b = luoDb(pohja()); await K.paivitaViikko(deps(a), 'demo', 'p1', '2026-10-14', NYT); await K.paivitaViikkoKoko(deps(b), 'demo', 'p1', '2026-10-14', NYT);
  assert.ok(a.lukuja.yht <= 15, 'lukuja ' + a.lukuja.yht); assert.ok(a.lukuja.yht < b.lukuja.yht);
});
test('VARAPOLKU: indeksipuute (FAILED_PRECONDITION / code 9) → koko-seuran polku, sama kooste; muu virhe heitetään', async () => {
  const indeksi = (kok, f) => (f.some(([a]) => a === 'joukkueet' || a === 'joukkue' || a === 'pelaajat_id') ? Object.assign(new Error('9 FAILED_PRECONDITION: The query requires an index.'), { code: 9 }) : undefined);
  const a = luoDb(pohja(), { kyselyVirhe: indeksi }), b = luoDb(pohja());
  const varoitukset = []; const w = console.warn; console.warn = (...x) => varoitukset.push(x.join(' '));
  try { await K.paivitaViikko(deps(a), 'demo', 'p1', '2026-10-14', NYT); } finally { console.warn = w; }
  await K.paivitaViikkoKoko(deps(b), 'demo', 'p1', '2026-10-14', NYT); assert.deepStrictEqual(viikot(a), viikot(b)); assert.ok(varoitukset.some((x) => /indeksin/.test(x)));
  const rikki = luoDb(pohja(), { kyselyVirhe: () => Object.assign(new Error('permission denied'), { code: 7 }) });
  await assert.rejects(K.paivitaViikko(deps(rikki), 'demo', 'p1', '2026-10-14', NYT), /permission denied/);
});
test('tuntematon pelaaja → null, ei kirjoituksia; väärä pvm → null', async () => {
  const db = luoDb(pohja()); assert.strictEqual(await K.paivitaViikko(deps(db), 'demo', 'ei', '2026-10-14', NYT), null); assert.strictEqual(await K.paivitaViikko(deps(db), 'demo', 'p1', 'roskaa', NYT), null); assert.strictEqual(db.kirjoitukset.length, 0);
});
