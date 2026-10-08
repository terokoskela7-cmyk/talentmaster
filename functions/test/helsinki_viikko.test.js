'use strict';
/** S1 — viikon rajat Helsingin ajassa: ISO-viikko, su klo 21 (kesä-/talviaika, DST-raja 25.10.2026), viikkotunniste. */
const { test } = require('node:test');
const assert = require('node:assert');
const H = require('../helsinki_paiva');
const iso = (ms) => new Date(ms).toISOString();

test('su 20.59 ja 21.00 Helsinki (kesäaika): sama viikko W41; su 21:00 = 18:00Z', () => {
  const a = H.viikonRajat(Date.UTC(2026, 9, 11, 17, 59)), b = H.viikonRajat(Date.UTC(2026, 9, 11, 18, 0));
  assert.strictEqual(a.tunniste, '2026-W41'); assert.strictEqual(b.tunniste, '2026-W41');
  assert.strictEqual(iso(a.su21Ms), '2026-10-11T18:00:00.000Z'); assert.strictEqual(a.maanantaiIso, '2026-10-05'); assert.strictEqual(a.sunnuntaiIso, '2026-10-11');
});
test('viikko vaihtuu maanantaina 00:00 Helsinki (su 23:59 vs ma 00:00)', () => {
  assert.strictEqual(H.viikonRajat(Date.UTC(2026, 9, 11, 20, 59)).tunniste, '2026-W41');   // su 23:59 EEST
  assert.strictEqual(H.viikonRajat(Date.UTC(2026, 9, 11, 21, 0)).tunniste, '2026-W42');     // ma 00:00 EEST
  assert.strictEqual(iso(H.viikonRajat(Date.UTC(2026, 9, 11, 21, 0)).alkuMs), '2026-10-11T21:00:00.000Z');
});
test('talviaika: 25.10.2026 kello siirtyy taaksepäin — su 21:00 Helsinki = 19:00Z (ei 18:00Z)', () => {
  const r = H.viikonRajat(Date.UTC(2026, 9, 25, 12, 0));
  assert.strictEqual(r.tunniste, '2026-W43'); assert.strictEqual(iso(r.su21Ms), '2026-10-25T19:00:00.000Z'); assert.strictEqual(iso(r.loppuMs), '2026-10-25T22:00:00.000Z');   // seuraava ma 00:00 EET = 22:00Z
  assert.strictEqual(iso(H.viikonRajat(Date.UTC(2026, 9, 18, 12, 0)).su21Ms), '2026-10-18T18:00:00.000Z');   // edellinen su vielä kesäaikaa
  assert.strictEqual(iso(r.alkuMs), '2026-10-18T21:00:00.000Z');   // ma 19.10. 00:00 EEST (kesäaika päättyi vasta su)
});
test('helsinginHetki: kaksi kierrosta oikein DST-rajan molemmin puolin; helsinginVuosi', () => {
  assert.strictEqual(iso(H.helsinginHetki(2026, 10, 25, 21, 0)), '2026-10-25T19:00:00.000Z');
  assert.strictEqual(iso(H.helsinginHetki(2026, 3, 29, 21, 0)), '2026-03-29T18:00:00.000Z');   // kevään siirtymäpäivä: 21:00 jo kesäaikaa
  assert.strictEqual(H.helsinginVuosi(Date.UTC(2026, 11, 31, 22, 30)), 2027);   // 31.12. 22:30Z = 1.1. 00:30 Helsinki
});
test('ISO-viikkovuosi: 2026-W53 (28.12.–3.1.), 2026-W01 alkaa 29.12.2025; viikkotunniste ↔ rajat', () => {
  assert.strictEqual(H.viikonRajat(Date.UTC(2027, 0, 1, 12, 0)).tunniste, '2026-W53'); assert.strictEqual(H.viikonRajat(Date.UTC(2026, 0, 1, 12, 0)).tunniste, '2026-W01'); assert.strictEqual(H.viikonRajat(Date.UTC(2026, 0, 1, 12, 0)).maanantaiIso, '2025-12-29');
  assert.strictEqual(H.viikkoTunnisteesta('2026-W41').maanantaiIso, '2026-10-05'); assert.strictEqual(H.viikkoTunnisteesta('2026-W53').sunnuntaiIso, '2027-01-03');
  assert.strictEqual(H.viikkoTunnisteesta('2026-W54'), null); assert.strictEqual(H.viikkoTunnisteesta('virhe'), null);
  for (const t of ['2026-W01', '2026-W26', '2026-W52', '2026-W53']) assert.strictEqual(H.viikkoTunnisteesta(t).tunniste, t);
});
