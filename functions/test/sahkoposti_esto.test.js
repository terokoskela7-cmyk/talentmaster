'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { projektiId, sahkopostiEsto, TUOTANTOPROJEKTI } = require('../sahkoposti_esto');

test('tuotanto (talentmaster-pilot) EI estä: GCLOUD_PROJECT, GCP_PROJECT, GOOGLE_CLOUD_PROJECT ja FIREBASE_CONFIG', () => {
  assert.strictEqual(TUOTANTOPROJEKTI, 'talentmaster-pilot');
  for (const env of [
    { GCLOUD_PROJECT: 'talentmaster-pilot' },
    { GCP_PROJECT: 'talentmaster-pilot' },
    { GOOGLE_CLOUD_PROJECT: 'talentmaster-pilot' },
    { FIREBASE_CONFIG: JSON.stringify({ projectId: 'talentmaster-pilot', storageBucket: 'x' }) },
  ]) assert.deepStrictEqual(sahkopostiEsto(env), { estetty: false, projekti: 'talentmaster-pilot' });
});

test('staging ja muut projektit estetään kaikista lähteistä', () => {
  for (const env of [
    { GCLOUD_PROJECT: 'talentmaster-staging' },
    { GOOGLE_CLOUD_PROJECT: 'talentmaster-staging' },
    { FIREBASE_CONFIG: JSON.stringify({ projectId: 'talentmaster-staging' }) },
    { GCLOUD_PROJECT: 'demo-kuorma' },
    { GCLOUD_PROJECT: 'Talentmaster-Pilot' },          // ei kirjainkoon löysyyttä
    { GCLOUD_PROJECT: 'talentmaster-pilot-2' },        // ei etuliiketäsmäystä
  ]) assert.strictEqual(sahkopostiEsto(env).estetty, true, JSON.stringify(env));
});

test('GCLOUD_PROJECT voittaa FIREBASE_CONFIGin; välilyönnit trimmataan', () => {
  assert.strictEqual(sahkopostiEsto({ GCLOUD_PROJECT: 'talentmaster-staging', FIREBASE_CONFIG: JSON.stringify({ projectId: 'talentmaster-pilot' }) }).estetty, true);
  assert.strictEqual(projektiId({ GCLOUD_PROJECT: ' talentmaster-pilot ' }), 'talentmaster-pilot');
});

test('tuntematon projekti (ei muuttujia / rikkinäinen FIREBASE_CONFIG) EI estä — tuotannon viestit eivät saa pysähtyä', () => {
  for (const env of [{}, undefined, { FIREBASE_CONFIG: '{rikki' }, { FIREBASE_CONFIG: '{}' }, { GCLOUD_PROJECT: '' }])
    assert.deepStrictEqual(sahkopostiEsto(env), { estetty: false, projekti: null }, JSON.stringify(env));
});
