'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { huomisenRajat: h, helsinginKeskiyo, kelloHelsinki } = require('../helsinki_paiva');

const iso = (d) => d.toISOString();
const rajat = (nyt) => { const r = h(new Date(nyt)); return [iso(r.alku), iso(r.loppu)]; };

test('kesä: UTC 20:30 (= 23:30 EEST) → huominen on seuraava Helsingin päivä', () => {
  assert.deepStrictEqual(rajat('2026-07-15T20:30:00Z'), ['2026-07-15T21:00:00.000Z', '2026-07-16T20:59:59.000Z']);
});
test('kesä: UTC 21:30 -raja (= 00:30 EEST, päivä jo vaihtunut) → huominen siirtyy yhdellä päivällä', () => {
  assert.deepStrictEqual(rajat('2026-07-15T21:30:00Z'), ['2026-07-16T21:00:00.000Z', '2026-07-17T20:59:59.000Z']);
});
test('talvi: UTC 21:30 (= 23:30 EET) vs UTC 22:30 (= 00:30 EET) -raja', () => {
  assert.deepStrictEqual(rajat('2026-01-15T21:30:00Z'), ['2026-01-15T22:00:00.000Z', '2026-01-16T21:59:59.000Z']);
  assert.deepStrictEqual(rajat('2026-01-15T22:30:00Z'), ['2026-01-16T22:00:00.000Z', '2026-01-17T21:59:59.000Z']);
});
test('ajastuksen oma hetki 17:00 Helsinki (kesä 14:00Z / talvi 15:00Z) → huominen = seuraava Helsingin päivä', () => {
  assert.deepStrictEqual(rajat('2026-07-15T14:00:00Z'), ['2026-07-15T21:00:00.000Z', '2026-07-16T20:59:59.000Z']);
  assert.deepStrictEqual(rajat('2026-01-15T15:00:00Z'), ['2026-01-15T22:00:00.000Z', '2026-01-16T21:59:59.000Z']);
});
test('kellonsiirrot: vuorokausi on 23 h / 25 h, rajat Helsingin keskiyössä', () => {
  // kevät 29.3.2026 (03→04): huomisen päivä 29.3. alkaa 00:00 EET (22:00Z) ja päättyy 23:59:59 EEST (20:59:59Z)
  assert.deepStrictEqual(rajat('2026-03-28T14:00:00Z'), ['2026-03-28T22:00:00.000Z', '2026-03-29T20:59:59.000Z']);
  // syksy 25.10.2026 (04→03)
  assert.deepStrictEqual(rajat('2026-10-24T14:00:00Z'), ['2026-10-24T21:00:00.000Z', '2026-10-25T21:59:59.000Z']);
});
test('vuodenvaihde', () => {
  assert.deepStrictEqual(rajat('2026-12-31T22:30:00Z'), ['2027-01-01T22:00:00.000Z', '2027-01-02T21:59:59.000Z']);
});
test('helsinginKeskiyo', () => {
  assert.strictEqual(iso(new Date(helsinginKeskiyo(2026, 7, 16))), '2026-07-15T21:00:00.000Z');
  assert.strictEqual(iso(new Date(helsinginKeskiyo(2026, 1, 16))), '2026-01-15T22:00:00.000Z');
});
test('tulos ei riipu ajoympäristön TZ:stä (UTC vs Helsinki vs New York)', () => {
  const koodi = `const {huomisenRajat:h}=require(${JSON.stringify(path.join(__dirname, '..', 'helsinki_paiva.js'))});
    const r=h(new Date('2026-07-15T21:30:00Z'));console.log(r.alku.toISOString()+'|'+r.loppu.toISOString())`;
  const ulos = ['UTC', 'Europe/Helsinki', 'America/New_York'].map((tz) => execFileSync(process.execPath, ['-e', koodi], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim());
  assert.strictEqual(new Set(ulos).size, 1);
  assert.strictEqual(ulos[0], '2026-07-16T21:00:00.000Z|2026-07-17T20:59:59.000Z');
});

test('kelloHelsinki: 17:00 Helsingin aikaa kesällä (14:00Z) ja talvella (15:00Z) → "17:00"', () => {
  assert.strictEqual(kelloHelsinki(new Date('2026-07-15T14:00:00Z')), '17:00');
  assert.strictEqual(kelloHelsinki(new Date('2026-01-15T15:00:00Z')), '17:00');
  assert.strictEqual(kelloHelsinki(new Date('2026-07-15T21:05:00Z')), '00:05');   // etunolla + keskiyö (h23, ei "24")
  assert.strictEqual(kelloHelsinki(new Date('2026-01-15T07:30:00Z')), '09:30');
});
test('kelloHelsinki ei riipu ajoympäristön TZ:stä', () => {
  const koodi = `const {kelloHelsinki:k}=require(${JSON.stringify(path.join(__dirname, '..', 'helsinki_paiva.js'))});console.log(k(new Date('2026-07-15T14:00:00Z')))`;
  for (const tz of ['UTC', 'Europe/Helsinki', 'America/New_York']) {
    assert.strictEqual(execFileSync(process.execPath, ['-e', koodi], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim(), '17:00', tz);
  }
});
test('klo-tekstit (muistutus + muutos) käyttävät kelloHelsinki:ä yhden apurin kautta, ei getHours (index.js + kalenteri_notif.js)', () => {
  const lue = (f) => require('node:fs').readFileSync(path.join(__dirname, '..', f), 'utf8');
  const idx = lue('index.js'), kn = lue('kalenteri_notif.js');
  assert.ok(!/aika\.getHours\(\)|\.getHours\(\)/.test(idx));
  assert.ok(!/\.getHours\(\)/.test(kn));
  assert.strictEqual(kn.split('kelloHelsinki(a)').length - 1, 1);   // _klo() — sekä muistutus että muutos käyttävät sitä
  assert.ok(/muistutusPaatos\(e\)/.test(idx) && /muutosPaatos\(before, after/.test(idx));
});

// ── V2 P0.4 PR 2: tapahtuman päättyminen (vartijat vertaavat päättymiseen, ei alkuun) ──
const { paivanLoppuHelsinki, onKellonaika, tapahtumaPaattyy } = require('../helsinki_paiva');
const ts = (iso) => { const d = new Date(iso); return { toDate: () => d, toMillis: () => d.getTime() }; };

test('paivanLoppuHelsinki: kesä (EEST) ja talvi (EET), päivän viimeinen ms', () => {
  assert.strictEqual(paivanLoppuHelsinki(new Date('2026-07-15T10:00:00Z')).toISOString(), '2026-07-15T20:59:59.999Z');
  assert.strictEqual(paivanLoppuHelsinki(new Date('2026-01-15T10:00:00Z')).toISOString(), '2026-01-15T21:59:59.999Z');
  assert.strictEqual(paivanLoppuHelsinki(new Date('2026-07-15T21:30:00Z')).toISOString(), '2026-07-16T20:59:59.999Z');   // 00:30 EEST = jo seuraava päivä
});
test('onKellonaika: koko_paiva / Helsingin keskiyö ilman päättymistä = ei kellonaikaa; päättyminen > alku = kellonaika', () => {
  assert.strictEqual(onKellonaika({ koko_paiva: true, alkaa: ts('2026-10-05T18:00:00+03:00') }), false);
  assert.strictEqual(onKellonaika({ alkaa: ts('2026-10-04T21:00:00Z') }), false);   // 00:00 EEST 5.10., ei paattyy
  assert.strictEqual(onKellonaika({ alkaa: ts('2026-10-04T21:00:00Z'), paattyy: ts('2026-10-04T21:00:00Z') }), false);
  assert.strictEqual(onKellonaika({ alkaa: ts('2026-10-04T21:00:00Z'), paattyy: ts('2026-10-05T15:00:00Z') }), true);
  assert.strictEqual(onKellonaika({ alkaa: ts('2026-10-05T15:00:00Z') }), true);
  assert.strictEqual(onKellonaika({}), false); assert.strictEqual(onKellonaika(null), false);
});
test('tapahtumaPaattyy: paattyy · kellonajaton → Helsingin päivän loppu · kellonaika ilman päättymistä → alku · monipäiväinen', () => {
  const p = (ev) => { const d = tapahtumaPaattyy(ev); return d && d.toISOString(); };
  assert.strictEqual(p({ alkaa: ts('2026-10-05T14:00:00Z'), paattyy: ts('2026-10-05T16:30:00Z') }), '2026-10-05T16:30:00.000Z');
  assert.strictEqual(p({ koko_paiva: true, alkaa: ts('2026-10-04T21:00:00Z') }), '2026-10-05T20:59:59.999Z');
  assert.strictEqual(p({ alkaa: ts('2026-10-04T21:00:00Z') }), '2026-10-05T20:59:59.999Z');
  assert.strictEqual(p({ alkaa: ts('2026-10-05T14:00:00Z') }), '2026-10-05T14:00:00.000Z');
  assert.strictEqual(p({ koko_paiva: true, alkaa: ts('2026-10-04T21:00:00Z'), paattyy: ts('2026-10-06T10:00:00Z') }), '2026-10-06T20:59:59.999Z');
  assert.strictEqual(p({}), null); assert.strictEqual(p(null), null);
});
