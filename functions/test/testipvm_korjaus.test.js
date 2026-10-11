'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { rakennaPaivitys } = require('../testipvm_korjaus');

const POISTO = { __poisto: true };

test('hh: hh_pvm + tsi_pvm asetetaan ja molempien *_pvm_arvio poistetaan samassa kirjoituksessa', () => {
  assert.deepStrictEqual(rakennaPaivitys(['hh_pvm', 'tsi_pvm'], '2026-09-12', POISTO), {
    hh_pvm: '2026-09-12', hh_pvm_arvio: POISTO,
    tsi_pvm: '2026-09-12', tsi_pvm_arvio: POISTO,
  });
});
test('tki / flei: yksi kenttä → yksi arviopari poistetaan, muihin ei kosketa', () => {
  assert.deepStrictEqual(rakennaPaivitys(['tki_pvm'], '2026-10-01', POISTO), { tki_pvm: '2026-10-01', tki_pvm_arvio: POISTO });
  assert.deepStrictEqual(rakennaPaivitys(['flei_pvm'], '2026-10-01', POISTO), { flei_pvm: '2026-10-01', flei_pvm_arvio: POISTO });
});
test('tyhjä kenttälista → tyhjä päivitys', () => {
  assert.deepStrictEqual(rakennaPaivitys([], '2026-10-01', POISTO), {});
  assert.deepStrictEqual(rakennaPaivitys(undefined, '2026-10-01', POISTO), {});
});
test('CF käyttää rakennaPaivitys-apuria eikä kirjoita *_pvm-kenttiä suoraan ilman arvioparin poistoa', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const alku = src.indexOf('exports.korjaaJoukkueenTestipvm');
  const runko = src.slice(alku, src.indexOf('exports.lahetaResetLinkki'));
  assert.match(runko, /rakennaPaivitys\(item\.kentat, uusiPvm, admin\.firestore\.FieldValue\.delete\(\)\)/);
  assert.doesNotMatch(runko, /upd\[k\]\s*=\s*uusiPvm/);
});
