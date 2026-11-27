'use strict';
/**
 * Rivikattojen purku F0 — vientien tilannevedos (tools/viennit.js). Vartioi, että F1/F2-siirrot (käsittelijä moduuliin, index.js:ään ohut vienti)
 * eivät muuta julkaistavaa pintaa: vientien nimet, region, secrets, App Check, ajastus, triggerit, muisti ja aikaraja = test/fixtures/viennit.json.
 * Tarkoituksellinen muutos: node tools/viennit.js --kirjoita + perustelu PR:ssä (Teron kaista).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { lataaViennit, vertaa, lueFixture } = require('../tools/viennit.js');

const nyt = lataaViennit();
const vedos = lueFixture();

test('F0: viennit (nimet + asetukset) = tilannevedos', () => {
  const erot = vertaa(vedos, nyt);
  assert.deepStrictEqual(erot, [], 'Viennit poikkeavat tilannevedoksesta. Jos muutos on tarkoituksellinen: node tools/viennit.js --kirjoita ja perustele PR:ssä.\n' + erot.join('\n'));
});

test('F0: EI VACUOUS — vedos kattaa kaikki trigger-tyypit ja tunnetut asetukset', () => {
  const nimet = Object.keys(vedos);
  assert.ok(nimet.length >= 55, 'vientejä ' + nimet.length);
  const tyyppi = (e) => Object.keys(e).find((k) => /Trigger$/.test(k));
  const tyypit = new Set(nimet.map((k) => tyyppi(vedos[k])));
  for (const t of ['callableTrigger', 'httpsTrigger', 'scheduleTrigger', 'eventTrigger']) assert.ok(tyypit.has(t), 'puuttuu ' + t);
  assert.ok(nimet.every((k) => tyyppi(vedos[k])), 'jokaisella viennillä on trigger');
  // CLAUDE.md §2: Cloud Functions aina europe-west1
  assert.deepStrictEqual(nimet.filter((k) => JSON.stringify(vedos[k].region) !== '["europe-west1"]'), []);
  // App Check näkyy (ei ole v1:n __endpointissa → kääre); myös moduulissa määritelty vienti (liput_hallinta.js) tunnistuu
  assert.strictEqual(vedos.peruSuostumus.appCheck.enforceAppCheck, true);
  assert.strictEqual(vedos.asetaSeuranLippu.appCheck.enforceAppCheck, true);
  assert.strictEqual(vedos.luoKayttaja.appCheck.enforceAppCheck, false);
  assert.ok(nimet.filter((k) => vedos[k].appCheck && vedos[k].appCheck.enforceAppCheck).length >= 20);
  // secrets ja ajastus kirjautuvat
  assert.deepStrictEqual(vedos.luoKayttaja.secretEnvironmentVariables, [{ key: 'SENDGRID_API_KEY' }]);
  assert.ok(nimet.some((k) => vedos[k].scheduleTrigger && vedos[k].scheduleTrigger.timeZone === 'Europe/Helsinki'));
});

test('F0: vertaa huomaa poistuneen, uuden ja muuttuneen viennin (App Check, secret, region)', () => {
  const a = { x: { region: ['europe-west1'], callableTrigger: {}, appCheck: { enforceAppCheck: true, consumeAppCheckToken: false } }, y: { callableTrigger: {} } };
  assert.deepStrictEqual(vertaa(a, a), []);
  const b = JSON.parse(JSON.stringify(a)); b.x.appCheck.enforceAppCheck = false; delete b.y; b.z = { callableTrigger: {} };
  const erot = vertaa(a, b);
  assert.ok(erot.includes('POISTUI: y'));
  assert.ok(erot.includes('UUSI: z'));
  assert.ok(erot.some((e) => e.startsWith('MUUTTUI: x') && e.includes('"enforceAppCheck":false')));
  const c = JSON.parse(JSON.stringify(a)); c.x.secretEnvironmentVariables = [{ key: 'SENDGRID_API_KEY' }]; c.x.region = ['us-central1'];
  assert.strictEqual(vertaa(a, c).length, 1);
});

// ── Ympäristöriippumattomuus (staging-deploy kaatui: eventFilters.resource sisältää projektin nimen) ──
const { normalisoiProjekti } = require('../tools/viennit.js');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('F0: normalisoiProjekti korvaa vain projects/<nimi>/-etuliitteen (syvälle ja taulukoihin), muuta ei', () => {
  const x = { a: { eventTrigger: { eventFilters: { resource: 'projects/talentmaster-staging/databases/(default)/documents/seurat/{sid}/x/{id}' } } }, b: ['projects/abc-1/x', 'ei-projects/muutu'], c: 5, d: null, e: 'talentmaster-pilot' };
  assert.deepStrictEqual(normalisoiProjekti(x), { a: { eventTrigger: { eventFilters: { resource: 'projects/<projekti>/databases/(default)/documents/seurat/{sid}/x/{id}' } } }, b: ['projects/<projekti>/x', 'ei-projects/muutu'], c: 5, d: null, e: 'talentmaster-pilot' });
});

test('F0: vertaa on ympäristöriippumaton — tuotannon ja stagingin projektinimi antavat saman tuloksen; oikea ero huomataan yhä', () => {
  const ev = (proj, polku) => ({ f: { region: ['europe-west1'], eventTrigger: { eventFilters: { resource: 'projects/' + proj + '/databases/(default)/documents/' + polku } } } });
  const vedos = ev('talentmaster-pilot', 'seurat/{sid}/a/{id}');
  for (const proj of ['talentmaster-pilot', 'talentmaster-staging']) assert.deepStrictEqual(vertaa(vedos, ev(proj, 'seurat/{sid}/a/{id}')), [], proj);
  for (const proj of ['talentmaster-pilot', 'talentmaster-staging']) assert.strictEqual(vertaa(vedos, ev(proj, 'seurat/{sid}/b/{id}')).length, 1, proj + ': polun muutos huomataan');
});

for (const proj of ['talentmaster-pilot', 'talentmaster-staging']) {
  test('F0: koko vertailu (tools/viennit.js) läpäisee projektilla ' + proj, () => {
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'viennit.js')], { env: Object.assign({}, process.env, { GCLOUD_PROJECT: proj }), encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /^OK: \d+ vientiä/);
  });
}
