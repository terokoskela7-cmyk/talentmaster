'use strict';
/**
 * Valmennusapuri (Vaihe 2) — yksikkötestit, offline (node:test).
 * Puhtaat funktiot + onCall-käsittelijä muisti-Firestorea vasten. Mallikutsu ja tietopohja
 * korvataan riippuvuusinjektiolla → ei verkkoa, ei GCP:tä, ei Storagea.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const functions = require('firebase-functions/v1');
const va = require('../valmennusapuri');

// ── Muisti-Firestore ─────────────────────────────────────────────────────────
/* SA tunnistetaan admins-dokumentista (P2 1.10.2026: kovakoodattu SA_UID poistettu valmennusapuri.js:stä).
   Jokaisessa testikannassa on testi-SA:n admins-dokumentti. */
const SA = 'sa-testi';
function muistiDb(alku) {
  const data = Object.assign({ ['admins/' + SA]: { rooli: 'super_admin' } }, alku || {});
  let seuraava = 1;
  function snap(polku) {
    const d = data[polku];
    return { exists: d !== undefined, data: () => (d === undefined ? undefined : JSON.parse(JSON.stringify(d))), id: polku.split('/').pop() };
  }
  function docRef(polku) {
    return {
      id: polku.split('/').pop(),
      get: async () => snap(polku),
      set: async (v, o) => { data[polku] = o && o.merge ? Object.assign({}, data[polku] || {}, v) : v; },
      update: async (v) => { if (data[polku] === undefined) throw new Error('ei dokumenttia'); data[polku] = Object.assign({}, data[polku], v); },
    };
  }
  return {
    data,
    collection: (k) => ({
      doc: (id) => docRef(k + '/' + id),
      add: async (v) => { const id = 'loki' + (seuraava++); data[k + '/' + id] = v; return { id }; },
    }),
    runTransaction: async (fn) => fn({
      get: (ref) => ref.get(),
      set: (ref, v, o) => ref.set(v, o),
    }),
  };
}

const TP = { system: [{ type: 'text', text: 'ohje' }], versio: '0.7', tiedostoja: 10 };
function teeKasittelija(db, vastausTeksti, env) {
  const admin = { firestore: () => db };
  const kutsut = [];
  const h = va.kasittelija(admin, functions, {
    env: Object.assign({ VALMENNUSAPURI_PAIVAKIINTIO: '2' }, env || {}),
    haeTietopohja: async () => TP,
    haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
    kutsuMallia: async (_a, asetus, system, viestit) => {
      kutsut.push({ asetus, system, viestit });
      return { teksti: vastausTeksti || 'Vastaus', syy: 'end_turn', tokenit: { syote: 1, tuotos: 2, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } };
    },
  });
  return { h, kutsut };
}
const kysymys = (teksti) => ({ viestit: [{ role: 'user', content: teksti || 'U10, 8v8. Mitä harjoitellaan?' }] });
const ctx = (uid) => ({ auth: { uid: uid, token: {} } });

// ── Puhtaat funktiot ─────────────────────────────────────────────────────────
test('validoiKysely: hyväksyy kelvollisen ja oletuskieli fi', () => {
  const r = va.validoiKysely(kysymys());
  assert.strictEqual(r.kieli, 'fi');
  assert.strictEqual(r.viestit.length, 1);
});
test('validoiKysely: viimeinen viesti pitää olla valmentajan', () => {
  assert.throws(() => va.validoiKysely({ viestit: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }),
    (e) => e.tmKoodi === 'invalid-argument');
});
test('validoiKysely: hylkää väärän roolin, tyhjän ja liian pitkän viestin', () => {
  assert.throws(() => va.validoiKysely({ viestit: [{ role: 'system', content: 'x' }] }));
  assert.throws(() => va.validoiKysely({ viestit: [{ role: 'user', content: '   ' }] }));
  assert.throws(() => va.validoiKysely({ viestit: [{ role: 'user', content: 'x'.repeat(4001) }] }));
  assert.throws(() => va.validoiKysely({}));
});
test('rajaaHistoria: pitää viimeiset 12, aloittaa valmentajan viestillä, yhdistää peräkkäiset roolit', () => {
  const v = [];
  for (let i = 0; i < 20; i++) v.push({ role: i % 2 ? 'assistant' : 'user', content: 'v' + i });
  const r = va.rajaaHistoria(v);
  assert.ok(r.length <= 12);
  assert.strictEqual(r[0].role, 'user');
  const y = va.rajaaHistoria([{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }]);
  assert.strictEqual(y.length, 1);
  assert.strictEqual(y[0].content, 'a\n\nb');
});
test('suodataKoodit: poistaa koodit sulkeista, kauttaviivan jäljestä ja paljaana', () => {
  const r = va.suodataKoodit('Vad ni tränar: stöd (Y-H6). Bygger på Tukipeli/Y-H6 och Y-P1 1v1-försvar.', ['fråga']);
  assert.deepStrictEqual(r.poistettu.sort(), ['Y-H6', 'Y-P1']);
  assert.ok(!/Y-H6|Y-P1/.test(r.teksti), r.teksti);
  assert.ok(r.teksti.indexOf('stöd.') >= 0, r.teksti);
});
test('suodataKoodit: ei suodateta kun valmentaja käytti koodia itse (sääntö 0 poikkeus)', () => {
  const r = va.suodataKoodit('Vartioinnista irtaantuminen (Y-H7)', ['Mitä Y-H7 tarkoittaa?']);
  assert.strictEqual(r.teksti, 'Vartioinnista irtaantuminen (Y-H7)');
  assert.deepStrictEqual(r.poistettu, []);
});
test('suodataKoodit: konseptien nimet ja pelinumerot säilyvät', () => {
  const t = '#9 – Vartioinnista irtaantuminen – ✗ – 1v1-puolustaminen, U10 8v8';
  assert.strictEqual(va.suodataKoodit(t, ['x']).teksti, t);
});
test('valitseOhjeistus: numeerinen versiojärjestys, ei-versioidut ohitetaan', () => {
  assert.strictEqual(va.valitseOhjeistus(['OHJEISTUS_v0.9.md', 'OHJEISTUS_v0.10.md', 'OHJEISTUS_vanha.md']), 'OHJEISTUS_v0.10.md');
  assert.strictEqual(va.valitseOhjeistus(['muu.md']), null);
});
test('rakennaSystem: sama rakenne kuin laatutestauksessa + välimuistimerkintä tietopohjassa', () => {
  const s = va.rakennaSystem('OHJE', [{ nimi: 'b.md', sisalto: 'B' }, { nimi: 'a.md', sisalto: 'A' }]);
  assert.strictEqual(s[0].text, 'OHJE');
  assert.strictEqual(s[1].text, '<tietopohja>\n<tiedosto nimi="a.md">\nA\n</tiedosto>\n\n<tiedosto nimi="b.md">\nB\n</tiedosto>\n</tietopohja>');
  assert.deepStrictEqual(s[1].cache_control, { type: 'ephemeral' });
});
test('ohjeVersio + paivanAvain + vertexUrl', () => {
  assert.strictEqual(va.ohjeVersio('# X (versio 0.7)'), '0.7');
  assert.strictEqual(va.paivanAvain('u1', new Date(Date.UTC(2026, 8, 25, 22, 30))), 'u1_2026-09-26');   // Helsinki UTC+3
  assert.strictEqual(va.vertexUrl({ alue: 'europe-west1', projekti: 'p', malli: 'm' }),
    'https://europe-west1-aiplatform.googleapis.com/v1/projects/p/locations/europe-west1/publishers/anthropic/models/m:rawPredict');
  assert.ok(va.vertexUrl({ alue: 'global', projekti: 'p', malli: 'm' }).indexOf('https://aiplatform.googleapis.com/') === 0);
  assert.strictEqual(va.vertexUrl({ alue: 'eu', projekti: 'p', malli: 'm' }),
    'https://aiplatform.eu.rep.googleapis.com/v1/projects/p/locations/eu/publishers/anthropic/models/m:rawPredict');
  assert.strictEqual(va.vertexUrl({ alue: 'us', projekti: 'p', malli: 'm' }),
    'https://aiplatform.us.rep.googleapis.com/v1/projects/p/locations/us/publishers/anthropic/models/m:rawPredict');
});
test('asetukset: oletuksena Bedrock EU (CI-deploy ilman .env:iä = sama kuin paikallinen)', () => {
  const a = va.asetukset({});
  assert.strictEqual(a.provider, 'bedrock');
  assert.strictEqual(a.malli, 'eu.anthropic.claude-sonnet-4-6');
  assert.strictEqual(a.alue, 'eu-north-1');
  assert.strictEqual(a.paivaKiintio, 40);
  const v = va.asetukset({ VALMENNUSAPURI_PROVIDER: 'vertex' });
  assert.strictEqual(v.provider, 'vertex');
  assert.strictEqual(v.alue, 'eu');
  assert.strictEqual(v.malli, 'claude-sonnet-5');
});
test('onKayttoOikeus: SA aina, pilotti vain aktiivisena', () => {
  assert.strictEqual(va.onKayttoOikeus(true, null), true);
  assert.strictEqual(va.onKayttoOikeus(false, null), false);
  assert.strictEqual(va.onKayttoOikeus(false, { aktiivinen: false }), false);
  assert.strictEqual(va.onKayttoOikeus(false, { seuraId: 'kpv' }), true);
});
test('puraVastaus: tekstiosat ja tokenit', () => {
  const r = va.puraVastaus({ content: [{ type: 'text', text: 'a' }, { type: 'tool_use' }, { type: 'text', text: 'b' }], stop_reason: 'end_turn', usage: { input_tokens: 3, cache_read_input_tokens: 5 } });
  assert.strictEqual(r.teksti, 'a\nb');
  assert.strictEqual(r.tokenit.valimuistiLuettu, 5);
});

// ── Käsittelijä ──────────────────────────────────────────────────────────────
test('kasittelija: ilman kirjautumista → unauthenticated', async () => {
  const { h } = teeKasittelija(muistiDb());
  await assert.rejects(() => h(kysymys(), {}), (e) => e.code === 'unauthenticated');
});
test('kasittelija: kirjautunut ilman pilottioikeutta → permission-denied, mallia ei kutsuta', async () => {
  const { h, kutsut } = teeKasittelija(muistiDb());
  await assert.rejects(() => h(kysymys(), ctx('vieras')), (e) => e.code === 'permission-denied');
  assert.strictEqual(kutsut.length, 0);
});
test('kasittelija: deaktivoitu pilotti → permission-denied', async () => {
  const { h } = teeKasittelija(muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: false } }));
  await assert.rejects(() => h(kysymys(), ctx('v1')), (e) => e.code === 'permission-denied');
});
test('kasittelija: super admin (admins-dokumentti) pääsee aina ilman pilottidokumenttia', async () => {
  const { h } = teeKasittelija(muistiDb());
  const r = await h(kysymys(), ctx(SA));
  assert.strictEqual(r.vastaus, 'Vastaus');
});
test('kasittelija: admins-dokumentti antaa SA-pääsyn (adminSnap.exists)', async () => {
  const { h } = teeKasittelija(muistiDb({ 'admins/toinen': { rooli: 'super_admin' } }));
  const r = await h(kysymys(), ctx('toinen'));
  assert.ok(r.lokiId);
});
test('kasittelija: pilotti kysyy → vastaus, koodit suodatettu, loki kirjoitettu', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h, kutsut } = teeKasittelija(db, 'Opetetaan tuen tarjoamista (Y-H6).');
  const r = await h(kysymys(), ctx('v1'));
  assert.strictEqual(r.vastaus, 'Opetetaan tuen tarjoamista.');
  assert.strictEqual(r.ohjeVersio, '0.7');
  assert.strictEqual(kutsut[0].asetus.provider, 'bedrock');
  const loki = db.data['valmennusapuri_loki/' + r.lokiId];
  assert.strictEqual(loki.uid, 'v1');
  assert.strictEqual(loki.seuraId, 'kpv');
  assert.deepStrictEqual(loki.poistetutKoodit, ['Y-H6']);
  assert.strictEqual(loki.palaute, null);
});
test('kasittelija: päiväkiintiö täynnä → resource-exhausted', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true } });
  const { h } = teeKasittelija(db);
  await h(kysymys(), ctx('v1'));
  await h(kysymys(), ctx('v1'));
  await assert.rejects(() => h(kysymys(), ctx('v1')), (e) => e.code === 'resource-exhausted');
});
test('kasittelija: tila palauttaa kiintiön', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true } });
  const { h } = teeKasittelija(db);
  await h(kysymys(), ctx('v1'));
  const t = await h({ toiminto: 'tila' }, ctx('v1'));
  assert.deepStrictEqual(t, { oikeus: true, paivaKiintio: 2, kaytetty: 1, roolit: ['valmennusapuri'] });
});
test('kasittelija: palaute vain omaan vastaukseen', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true }, 'valmennusapuri_pilotti/v2': { aktiivinen: true } });
  const { h } = teeKasittelija(db);
  const r = await h(kysymys(), ctx('v1'));
  await assert.rejects(() => h({ toiminto: 'palaute', lokiId: r.lokiId, arvio: 'huono' }, ctx('v2')), (e) => e.code === 'permission-denied');
  await h({ toiminto: 'palaute', lokiId: r.lokiId, arvio: 'huono', kommentti: 'liian pitkä' }, ctx('v1'));
  assert.strictEqual(db.data['valmennusapuri_loki/' + r.lokiId].palaute.kommentti, 'liian pitkä');
  await assert.rejects(() => h({ toiminto: 'palaute', lokiId: r.lokiId, arvio: 'kiva' }, ctx('v1')), (e) => e.code === 'invalid-argument');
});
test('kasittelija: virheellinen syöte → invalid-argument ennen mallikutsua', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true } });
  const { h, kutsut } = teeKasittelija(db);
  await assert.rejects(() => h({ viestit: [] }, ctx('v1')), (e) => e.code === 'invalid-argument');
  await assert.rejects(() => h({ toiminto: 'poista' }, ctx('v1')), (e) => e.code === 'invalid-argument');
  assert.strictEqual(kutsut.length, 0);
});

// ── Bedrock EU (Plan B, 2026-09-28) ─────────────────────────────────────────
test('SigV4: AWS:n julkaistu esimerkkivektori (IAM ListUsers)', () => {
  const s = va.allekirjoitaSigV4({
    method: 'GET', canonicalUri: '/', canonicalQuery: 'Action=ListUsers&Version=2010-05-08',
    headers: { 'content-type': 'application/x-www-form-urlencoded; charset=utf-8', host: 'iam.amazonaws.com', 'x-amz-date': '20150830T123600Z' },
    payload: '', region: 'us-east-1', service: 'iam',
    accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', amzDate: '20150830T123600Z',
  });
  assert.strictEqual(s.signature, '5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7');
  assert.ok(s.authorization.indexOf('Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=') > 0);
});

test('asetukset: bedrock-oletukset = Sonnet 4.6 eu.-profiili, Tukholma', () => {
  const a = va.asetukset({ VALMENNUSAPURI_PROVIDER: 'bedrock' });
  assert.strictEqual(a.provider, 'bedrock');
  assert.strictEqual(a.malli, 'eu.anthropic.claude-sonnet-4-6');
  assert.strictEqual(a.alue, 'eu-north-1');
  const b = va.asetukset({ VALMENNUSAPURI_PROVIDER: 'bedrock', VALMENNUSAPURI_MALLI: 'eu.anthropic.claude-sonnet-5' });
  assert.strictEqual(b.malli, 'eu.anthropic.claude-sonnet-5');
});

test('Bedrock EU-vartija: global./us./ei-EU-alue estetään', () => {
  const ok = { alue: 'eu-north-1', malli: 'eu.anthropic.claude-sonnet-4-6' };
  assert.doesNotThrow(() => va.tarkistaBedrockEU(ok));
  assert.doesNotThrow(() => va.tarkistaBedrockEU({ alue: 'eu-central-1', malli: 'anthropic.claude-sonnet-4-6' }));
  for (const huono of [
    { alue: 'eu-north-1', malli: 'global.anthropic.claude-sonnet-4-6' },
    { alue: 'eu-north-1', malli: 'us.anthropic.claude-sonnet-4-6' },
    { alue: 'eu-north-1', malli: 'claude-sonnet-5' },
    { alue: 'us-east-1', malli: 'eu.anthropic.claude-sonnet-4-6' },
    { alue: 'eu', malli: 'eu.anthropic.claude-sonnet-4-6' },
  ]) {
    assert.throws(() => va.tarkistaBedrockEU(huono), (e) => e.tmKoodi === 'failed-precondition');
  }
});

test('bedrockPyynto: URL, kaksoiskoodattu kanoninen polku, allekirjoitus', () => {
  const a = { alue: 'eu-north-1', malli: 'eu.anthropic.claude-x-v1:0' };
  const p = va.bedrockPyynto(a, '{}', { id: 'AKIDEXAMPLE', salainen: 'salainen' }, new Date(Date.UTC(2026, 8, 28, 9, 0, 0)));
  assert.strictEqual(p.url, 'https://bedrock-runtime.eu-north-1.amazonaws.com/model/eu.anthropic.claude-x-v1%3A0/invoke');
  assert.strictEqual(p.headers['x-amz-date'], '20260928T090000Z');
  assert.ok(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20260928\/eu-north-1\/bedrock\/aws4_request, SignedHeaders=accept;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/.test(p.headers.authorization));
  assert.strictEqual(p.headers.host, undefined);   // fetch asettaa itse
});

test('kutsuMallia (bedrock): Messages-runko, cache_control säilyy, vastaus puretaan', async () => {
  const vanhaFetch = globalThis.fetch;
  const vanhaEnv = { id: process.env.AWS_BEDROCK_ACCESS_KEY_ID, s: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY };
  process.env.AWS_BEDROCK_ACCESS_KEY_ID = 'AKIDEXAMPLE';
  process.env.AWS_BEDROCK_SECRET_ACCESS_KEY = 'salainen';
  let saatu = null;
  globalThis.fetch = async (url, o) => {
    saatu = { url: url, o: o };
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'Hei' }], stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 2, cache_read_input_tokens: 900, cache_creation_input_tokens: 0 } }) };
  };
  try {
    const a = va.asetukset({ VALMENNUSAPURI_PROVIDER: 'bedrock' });
    const system = va.rakennaSystem('OHJE', [{ nimi: 'a.md', sisalto: 'x' }]);
    const t = await va.kutsuMallia(null, a, system, [{ role: 'user', content: 'moi' }]);
    assert.strictEqual(t.teksti, 'Hei');
    assert.strictEqual(t.tokenit.valimuistiLuettu, 900);
    assert.ok(saatu.url.indexOf('https://bedrock-runtime.eu-north-1.amazonaws.com/model/eu.anthropic.claude-sonnet-4-6/invoke') === 0);
    const runko = JSON.parse(saatu.o.body);
    assert.strictEqual(runko.anthropic_version, 'bedrock-2023-05-31');
    assert.deepStrictEqual(runko.system[1].cache_control, { type: 'ephemeral' });
    assert.ok(saatu.o.headers.authorization.indexOf('AWS4-HMAC-SHA256') === 0);
  } finally {
    globalThis.fetch = vanhaFetch;
    if (vanhaEnv.id === undefined) delete process.env.AWS_BEDROCK_ACCESS_KEY_ID; else process.env.AWS_BEDROCK_ACCESS_KEY_ID = vanhaEnv.id;
    if (vanhaEnv.s === undefined) delete process.env.AWS_BEDROCK_SECRET_ACCESS_KEY; else process.env.AWS_BEDROCK_SECRET_ACCESS_KEY = vanhaEnv.s;
  }
});

test('kutsuMallia (bedrock): ilman avaimia → failed-precondition, ei verkkokutsua', async () => {
  const vanhaFetch = globalThis.fetch;
  let kutsuttu = false;
  globalThis.fetch = async () => { kutsuttu = true; };
  const talteen = { id: process.env.AWS_BEDROCK_ACCESS_KEY_ID, s: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY };
  delete process.env.AWS_BEDROCK_ACCESS_KEY_ID; delete process.env.AWS_BEDROCK_SECRET_ACCESS_KEY;
  try {
    await assert.rejects(va.kutsuMallia(null, va.asetukset({ VALMENNUSAPURI_PROVIDER: 'bedrock' }), [], []),
      (e) => e.tmKoodi === 'failed-precondition');
    assert.strictEqual(kutsuttu, false);
  } finally {
    globalThis.fetch = vanhaFetch;
    if (talteen.id !== undefined) process.env.AWS_BEDROCK_ACCESS_KEY_ID = talteen.id;
    if (talteen.s !== undefined) process.env.AWS_BEDROCK_SECRET_ACCESS_KEY = talteen.s;
  }
});

// ── Roolit: valmennusapuri / HP-johtaja (2026-09-28) ─────────────────────────
function teeRoolikasittelija(db) {
  const admin = { firestore: () => db };
  const polut = [];
  const h = va.kasittelija(admin, functions, {
    env: { VALMENNUSAPURI_PAIVAKIINTIO: '5' },
    haeTietopohja: async (_admin, _a, polku) => { polut.push(polku); return TP; },
    haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
    kutsuMallia: async () => ({ teksti: 'HP-vastaus', syy: 'end_turn', tokenit: { syote: 1, tuotos: 1, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } }),
  });
  return { h, polut };
}

test('valitseRooli: oletus valmennusapuri, hp sallittu, tuntematon → invalid-argument', () => {
  assert.strictEqual(va.valitseRooli({}), 'valmennusapuri');
  assert.strictEqual(va.valitseRooli({ rooli: 'hp' }), 'hp');
  assert.throws(() => va.valitseRooli({ rooli: 'admin' }), (e) => e.tmKoodi === 'invalid-argument');
});

test('roolitKayttajalle: SA kaikki, pilotti vain valmennusapuri ellei roolit: [hp]', () => {
  assert.deepStrictEqual(va.roolitKayttajalle(true, null), ['valmennusapuri', 'hp']);
  assert.deepStrictEqual(va.roolitKayttajalle(false, { aktiivinen: true }), ['valmennusapuri']);
  assert.deepStrictEqual(va.roolitKayttajalle(false, { aktiivinen: true, roolit: ['hp'] }), ['valmennusapuri', 'hp']);
  assert.deepStrictEqual(va.roolitKayttajalle(false, { roolit: ['super'] }), ['valmennusapuri']);
});

test('kasittelija: SA + rooli hp → HP-polku, rooli lokiin', async () => {
  const db = muistiDb();
  const { h, polut } = teeRoolikasittelija(db);
  const r = await h(Object.assign(kysymys(), { rooli: 'hp' }), ctx(SA));
  assert.strictEqual(r.rooli, 'hp');
  assert.deepStrictEqual(polut, ['valmennusapuri/hp_johtaja/']);
  assert.strictEqual(db.data['valmennusapuri_loki/' + r.lokiId].rooli, 'hp');
});

test('kasittelija: ilman roolia → valmennusapurin polku (taaksepäin yhteensopiva)', async () => {
  const { h, polut } = teeRoolikasittelija(muistiDb());
  const r = await h(kysymys(), ctx(SA));
  assert.strictEqual(r.rooli, 'valmennusapuri');
  assert.deepStrictEqual(polut, ['valmennusapuri/']);
});

test('kasittelija: pilotti ilman hp-roolia → permission-denied, ei kiintiön kulutusta eikä mallikutsua', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true } });
  const { h, polut } = teeRoolikasittelija(db);
  await assert.rejects(() => h(Object.assign(kysymys(), { rooli: 'hp' }), ctx('v1')), (e) => e.code === 'permission-denied');
  assert.strictEqual(polut.length, 0);
  const t = await h({ toiminto: 'tila' }, ctx('v1'));
  assert.strictEqual(t.kaytetty, 0);
});

test('kasittelija: pilotti roolit [hp] → pääsee HP-johtajaan', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, roolit: ['hp'] } });
  const { h, polut } = teeRoolikasittelija(db);
  const r = await h(Object.assign(kysymys(), { rooli: 'hp' }), ctx('v1'));
  assert.strictEqual(r.vastaus, 'HP-vastaus');
  assert.deepStrictEqual(polut, ['valmennusapuri/hp_johtaja/']);
  const t = await h({ toiminto: 'tila' }, ctx('v1'));
  assert.deepStrictEqual(t.roolit, ['valmennusapuri', 'hp']);
});

// ── Syöttösuoja + kontekstirivi (2026-09-28) ────────────────────────────────
test('syottosuoja: rekisterin nimet taivutettuina, -nen-parit, tunnisteet ja yhteystiedot pois', () => {
  const k = va.nimiKuviot(['Matti Virtanen', 'Aino Mäkelä', 'Topias Koskela']);
  const r = va.syottosuoja('Matti Virtanen (U11). Matin isä, Matille sopii. Aino ja Ainolla, Mäkelän polvi. ' +
    'Topiaksella meni. Pekka Korhonen. PalloID 34650191, hetu 150313A123B, 040 123 4567, tero@example.com', k);
  for (const kielletty of ['Matti', 'Matin', 'Matille', 'Virtanen', 'Aino', 'Mäkelä', 'Topias', 'Korhonen', '34650191', '150313A123B', '040 123', 'tero@']) {
    assert.ok(r.teksti.indexOf(kielletty) < 0, kielletty + ' jäi: ' + r.teksti);
  }
  assert.ok(r.maarat.nimet >= 9);
  assert.strictEqual(r.maarat.tunnisteet, 2);
  assert.strictEqual(r.maarat.yhteystiedot, 2);
});

test('syottosuoja: valmennussisältö säilyy (ikäluokat, pelinumerot, vuodet, tavalliset sanat)', () => {
  const k = va.nimiKuviot(['Aino Mäkelä']);
  const t = 'Aina kun U13 pelaa 8v8, #7 ja #10 menettävät pallon. 2013 syntyneet, 60 min, 3 × 10–12 toistoa.';
  const r = va.syottosuoja(t, k);
  assert.strictEqual(r.teksti, t);
  assert.deepStrictEqual(r.maarat, { nimet: 0, tunnisteet: 0, yhteystiedot: 0 });
});

test('rakennaKonteksti: pilotin ja seuran tiedoista; SA:lle ei riviä', () => {
  assert.strictEqual(va.rakennaKonteksti(false, { seuraId: 'kpv', tehtava: 'valmennuspäällikkö', lisenssi: 'UEFA B' }, { nimi: 'KPV', taso: 'seura' }),
    'Konteksti: valmennuspäällikkö, seura KPV (seura), koulutus UEFA B. Seuran data: ei tiedossa.');
  assert.ok(va.rakennaKonteksti(false, { seuraId: 'kpv' }, null).indexOf('Konteksti: valmentaja, seura kpv, koulutus ei tiedossa') === 0);
  assert.strictEqual(va.rakennaKonteksti(true, null, null), null);
});

test('kasittelija: malli ja loki saavat suojatun tekstin, HP saa kontekstirivin, loki vain lukumäärät', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv', roolit: ['hp'], lisenssi: 'UEFA C' } });
  const admin = { firestore: () => db };
  const mallille = [];
  const h = va.kasittelija(admin, functions, {
    env: { VALMENNUSAPURI_PAIVAKIINTIO: '5' },
    haeTietopohja: async () => TP,
    haeSeuranTiedot: async () => ({ nimet: ['Matti Virtanen'], seura: { nimi: 'KPV' } }),
    kutsuMallia: async (_a, _asetus, _system, viestit) => { mallille.push(viestit); return { teksti: 'ok', syy: 'end_turn', tokenit: {} }; },
  });
  const r = await h({ rooli: 'hp', viestit: [{ role: 'user', content: 'Matin polvi, PalloID 34650191. Mitä teen?' }] }, ctx('v1'));
  const viesti = mallille[0][0].content;
  assert.ok(viesti.indexOf('Konteksti: valmentaja, seura KPV, koulutus UEFA C') === 0, viesti);
  assert.ok(viesti.indexOf('Matin') < 0 && viesti.indexOf('34650191') < 0, viesti);
  const loki = db.data['valmennusapuri_loki/' + r.lokiId];
  assert.ok(loki.kysymys.indexOf('Matin') < 0 && loki.kysymys.indexOf('34650191') < 0, loki.kysymys);
  assert.deepStrictEqual(loki.syottosuoja, { nimet: 1, tunnisteet: 1, yhteystiedot: 0 });
  assert.ok(loki.konteksti.indexOf('Konteksti:') === 0);
  // Valmennusapuri-rooli: suoja kyllä, kontekstiriviä ei
  const r2 = await h({ viestit: [{ role: 'user', content: 'Matti Virtanen ei tarjoa tukea.' }] }, ctx('v1'));
  assert.strictEqual(mallille[1][0].content, '[nimi] [nimi] ei tarjoa tukea.');
  assert.strictEqual(db.data['valmennusapuri_loki/' + r2.lokiId].konteksti, null);
});

test('kasittelija: oma Konteksti-rivi (testaus) → palvelin ei lisää toista', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv', roolit: ['hp'] } });
  const mallille = [];
  const h = va.kasittelija({ firestore: () => db }, functions, {
    env: {}, haeTietopohja: async () => TP, haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
    kutsuMallia: async (_a, _s, _y, v) => { mallille.push(v); return { teksti: 'ok', syy: 'end_turn', tokenit: {} }; },
  });
  await h({ rooli: 'hp', viestit: [{ role: 'user', content: 'Konteksti: fysiikkavalmentaja, U15. Kysymys.' }] }, ctx('v1'));
  assert.strictEqual(mallille[0][0].content, 'Konteksti: fysiikkavalmentaja, U15. Kysymys.');
});

// ── Porras 1: seuran datan kooste HP-johtajalle ──────────────────────────────
test('koostaSeuranData: kartoitus, kasvumittaus, testit ja kasvuvaiheet lukumäärinä joukkueittain', () => {
  const d = {
    pelaajat: [
      { joukkue: 'KPV U13', phv: 'PH' }, { joukkue: 'KPV U13', phv: 'PH' }, { joukkue: 'KPV U13', phv: 'LAH' },
      { joukkue: 'KPV U15', phv: 'POST' }, { joukkue: 'KPV U13', phv: null },
    ],
    kartoitukset: [{ joukkue: 'KPV U13', pvm: '2026-09-10T09:00:00Z' }, { joukkue: 'KPV U15', pvm: '2026-03-22T09:00:00Z' }],
    testit: [{ joukkue: 'KPV U13', pvm: '2026-09-12' }, { joukkue: 'KPV U15', pvm: '2026-05-01' }],
  };
  const t = va.koostaSeuranData(d, ['KPV U13']);
  assert.ok(t.indexOf('harjoitettavuuskartoitus tehty (KPV U13 09/2026, KPV U15 03/2026)') >= 0, t);
  assert.ok(t.indexOf('kasvumittaus 3/4 pelaajalla (KPV U13)') >= 0, t);
  assert.ok(t.indexOf('testitapahtumia 2 (viimeisin 09/2026)') >= 0, t);
  assert.ok(t.indexOf('KPV U13 (4 pelaajaa): kasvuvaiheet (lukumäärät): lähestyy 1, huipussa 2') >= 0, t);
  assert.ok(t.indexOf('KPV U15') < 0 || t.indexOf('KPV U15 (') < 0, 'vain pilotin joukkue: ' + t);
});

test('koostaSeuranData: ei dataa → kerrotaan puuttuvan; ilman joukkuetta kooste koko seurasta', () => {
  const tyhja = va.koostaSeuranData({ pelaajat: [{ joukkue: 'A' }], kartoitukset: [], testit: [] }, []);
  assert.ok(tyhja.indexOf('harjoitettavuuskartoitusta ei ole tehty') >= 0 && tyhja.indexOf('kasvumittausta ei ole tehty') >= 0, tyhja);
  const seura = va.koostaSeuranData({ pelaajat: [{ joukkue: 'A', phv: 'PRE' }, { joukkue: 'B', phv: 'PRE' }, { joukkue: 'B', phv: 'PRE' }] }, []);
  assert.ok(seura.indexOf('koko seura (3 pelaajaa): kasvuvaiheet (lukumäärät): ennen kasvupyrähdystä 3') >= 0, seura);
});

test('kasittelija: HP-kontekstiin seuran datan kooste; SA voi testata seuraId:llä, muut eivät', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv', roolit: ['hp'], joukkue: 'KPV U13' } });
  const pyydetyt = [];
  const mallille = [];
  const h = va.kasittelija({ firestore: () => db }, functions, {
    env: {}, haeTietopohja: async () => TP,
    haeSeuranTiedot: async (_db, sid) => { pyydetyt.push(sid); return { nimet: [], seura: { nimi: 'KPV' },
      data: { pelaajat: [{ joukkue: 'KPV U13', phv: 'PH' }], kartoitukset: [], testit: [] } }; },
    kutsuMallia: async (_a, _s, _y, v) => { mallille.push(v[v.length - 1].content); return { teksti: 'ok', syy: 'end_turn', tokenit: {} }; },
  });
  await h({ rooli: 'hp', viestit: [{ role: 'user', content: 'Kysymys.' }] }, ctx('v1'));
  assert.ok(mallille[0].indexOf('Seuran data: harjoitettavuuskartoitusta ei ole tehty; kasvumittaus 1/1 pelaajalla') >= 0, mallille[0]);
  assert.ok(mallille[0].indexOf('KPV U13 (1 pelaajaa): kasvuvaihe mitattu alle 3 pelaajalla (ei koostetta)') >= 0, mallille[0]);
  // pilotti ei voi vaihtaa seuraa
  await h({ rooli: 'hp', seuraId: 'hjk', viestit: [{ role: 'user', content: 'Kysymys.' }] }, ctx('v1'));
  assert.deepStrictEqual(pyydetyt, ['kpv', 'kpv']);
  // SA: seuraId → konteksti; ilman seuraId:tä ei kontekstia
  await h({ rooli: 'hp', seuraId: 'kpv', viestit: [{ role: 'user', content: 'Kysymys.' }] }, ctx(SA));
  assert.ok(mallille[2].indexOf('Konteksti: valmentaja, seura KPV') === 0, mallille[2]);
  await h({ rooli: 'hp', viestit: [{ role: 'user', content: 'Kysymys.' }] }, ctx(SA));
  assert.strictEqual(mallille[3], 'Kysymys.');
});

test('tunnistaJoukkueet: kysymyksessä mainittu joukkue, myös ilman seuran etuliitettä', () => {
  const data = { pelaajat: [{ joukkue: 'KPV P13' }, { joukkue: 'KPV P14' }, { joukkue: 'KPV T18' }], kartoitukset: [], testit: [] };
  assert.deepStrictEqual(va.tunnistaJoukkueet('Kerro KPV P13 joukkueen fyysinen tilannekatsaus', data), ['KPV P13']);
  assert.deepStrictEqual(va.tunnistaJoukkueet('miten p14 kuormitetaan?', data), ['KPV P14']);
  assert.deepStrictEqual(va.tunnistaJoukkueet('U13-ikäisille yleisesti', data), []);
  assert.deepStrictEqual(va.tunnistaJoukkueet('P133 ei ole joukkue', data), []);
});

test('tunnistaJoukkueet: "p13" osuu seuran U13-joukkueeseen vain jos ikä täsmää yhteen joukkueeseen', () => {
  const kpv = { pelaajat: [{ joukkue: 'KPV T18' }, { joukkue: 'KPV U13' }], kartoitukset: [], testit: [] };
  assert.deepStrictEqual(va.tunnistaJoukkueet('Analysoi p13 ikäluokan testitulokset', kpv), ['KPV U13']);
  assert.deepStrictEqual(va.tunnistaJoukkueet('analysoi t18', kpv), ['KPV T18']);
  assert.deepStrictEqual(va.tunnistaJoukkueet('analysoi p18', kpv), []);   // T18 ei ole poikajoukkue
  const kaksi = { pelaajat: [{ joukkue: 'A U13' }, { joukkue: 'B U13' }], kartoitukset: [], testit: [] };
  assert.deepStrictEqual(va.tunnistaJoukkueet('p13', kaksi), []);          // monitulkintainen: ei arvata
});

test('koostaSeuranData: testitulosten ja liikeketjujen mediaanit; alle 3 pelaajaa → ei arvoja (yksityisyys)', () => {
  const pel = (lin30m, sbl, ll) => ({ joukkue: 'KPV P13', ennatykset: { lin30m: { paras: lin30m } }, ketjut: { sbl: sbl, sfl: 2.3, ll: ll, diag: 2.4, dfl: 2.2 } });
  const t = va.koostaSeuranData({ pelaajat: [pel(5.1, 2.2, 2.0), pel(4.9, 2.1, 1.9), pel(5.3, 2.4, 2.1), { joukkue: 'KPV P14' }] }, ['KPV P13']);
  assert.ok(t.indexOf('30 m 5,1 s (n=3)') >= 0, t);
  assert.ok(t.indexOf('Vauhtiketju 2,2') >= 0 && t.indexOf('heikoin Sivuketju') >= 0, t);
  const yksi = va.koostaSeuranData({ pelaajat: [pel(4.42, 2.16, 2.1)] }, ['KPV P13']);
  assert.ok(yksi.indexOf('4,42') < 0 && yksi.indexOf('2,2') < 0, 'yksilön arvot eivät saa näkyä: ' + yksi);
  assert.ok(yksi.indexOf('testituloksia alle 3 pelaajalla (ei koostetta)') >= 0, yksi);
});

test('yhdistaTulokset: ennätykset ensin, vanhat tuonnit täydentyvät hh_viimeisin/tk_lajit-pikakentistä', () => {
  const r = va.yhdistaTulokset({ ennatykset: { lin30m: { paras: 4.9 }, flei: { paras: 60 } },
    hh_viimeisin: { lin30m: 5.2, cmj: 31 }, tk_lajit_viimeisin: { pujottelu_s: 12.4 }, sm_juoksu_viimeisin: 6.1 });
  assert.deepStrictEqual(r, { lin30m: { paras: 4.9 }, cmj: { paras: 31 }, sm_juoksu: { paras: 6.1 }, pujottelu: { paras: 12.4 } });
  assert.strictEqual(va.yhdistaTulokset({ nimi: 'x' }), null);
});

test('koostaSeuranData: tasojen (H-H, D1, D2) mediaani ja jakauma vain kun ≥3 pelaajaa', () => {
  const p = (hh, d1, d2) => ({ joukkue: 'SJK P15', tasot: { hh: hh, d1: d1, d2: d2 } });
  const t = va.koostaSeuranData({ pelaajat: [p(2.3, 2.2, 2), p(1.3, 1.4, 1), p(3.7, 3, 4), p(1, null, 1)] }, ['SJK P15']);
  assert.ok(t.indexOf('H-H-fyysistaso mediaani 1,8 (n=4; tasolla 1–1,9: 2, 2–2,9: 1, 3–3,9: 1, 4–5: 0)') >= 0, t);
  assert.ok(t.indexOf('fyysinen valmius (D1) mediaani 2,2 (n=3') >= 0 && t.indexOf('tekninen taso (D2) mediaani 1,5 (n=4') >= 0, t);
  const k = va.koostaSeuranData({ pelaajat: [p(3, 3, 3), p(2, 2, 2)] }, ['SJK P15']);
  assert.ok(k.indexOf('mediaani') < 0, k);
});

test('tunnistaJoukkueet: numero-osa missä kohtaa nimeä tahansa', () => {
  const data = { pelaajat: [{ joukkue: 'SJK P15 Musta' }, { joukkue: 'SJK 2011' }, { joukkue: 'SJK P14' }] };
  assert.deepStrictEqual(va.tunnistaJoukkueet('kerro p15 tilanne', data), ['SJK P15 Musta']);
  assert.deepStrictEqual(va.tunnistaJoukkueet('entä 2011-syntyneet', data), ['SJK 2011']);
});

test('joukkueHuomio: tunnistamaton joukkue → huomio ja joukkuelista; tunnistettu tai ei mainintaa → null', () => {
  const data = { pelaajat: [{ joukkue: 'SJK P2010' }, { joukkue: 'SJK P2011' }] };
  const h = va.joukkueHuomio('Kerro SJK P15 fyysinen tilanne', data, []);
  assert.ok(h.indexOf('ei tunnistettu') >= 0 && h.indexOf('SJK P2010, SJK P2011') >= 0, h);
  assert.strictEqual(va.joukkueHuomio('Kerro P2010 tilanne', data, ['SJK P2010']), null);
  assert.strictEqual(va.joukkueHuomio('Yleisiä plyometrisiä harjoitteita', data, []), null);
  assert.ok(va.joukkueHuomio('Tee P9-joukkueelle kausisuunnitelma', data, []).indexOf('ei tunnistettu') >= 0);
});

test('koostaSeuranData: TSI pelaajakohtaisen eron mediaanina', () => {
  const p = (j, b) => ({ joukkue: 'SJK T16', ennatykset: { sm_juoksu: { paras: j }, sm_pallo: { paras: b } } });
  const t = va.koostaSeuranData({ pelaajat: [p(8, 9), p(8.2, 9.8), p(7.9, 9.1)] }, ['SJK T16']);
  assert.ok(t.indexOf('pelaajakohtaisen eron mediaani) 1,2 s (n=3)') >= 0, t);
});

test('koostaSeuranData: tekniikkakilpailun TKI, merkit ja kehityskohteet; ponnauttelu on pallotehtävä', () => {
  const p = (tki, merkki, kk, e) => ({ joukkue: 'Sibbo P9', tki: { indeksi: tki, merkki: merkki, kehityskohde: kk, vahvuus: 'pujottelu' }, ennatykset: e });
  const e = { ponnauttelu: { paras: 30 } };
  const t = va.koostaSeuranData({ pelaajat: [p(35, null, 'syotto', e), p(62, 'hopea', 'syotto', e), p(45, 'pronssi', 'ponnauttelu', e)] }, ['Sibbo P9']);
  assert.ok(t.indexOf('TKI-indeksi (0–100') >= 0 && t.indexOf('mediaani 45 (n=3)') >= 0, t);
  assert.ok(t.indexOf('kulta 0, hopea 1, pronssi 1, ei merkkiä 1') >= 0, t);
  assert.ok(t.indexOf('järjestelmän laskema pelaajittain (pelaajia): syöttö 2, pallon ponnauttelu 1') >= 0, t);
  assert.ok(t.indexOf('tekniikkakilpailu: pallon ponnauttelu 30 s') >= 0, t);
});

test('validoiKysely: pitkä apurin vastaus historiassa ei kaada jatkokysymystä; pitkä kysymys hylätään', () => {
  const r = va.validoiKysely({ viestit: [{ role: 'user', content: 'Kysymys' }, { role: 'assistant', content: 'x'.repeat(7000) }, { role: 'user', content: 'Jatko' }] });
  assert.strictEqual(r.viestit.length, 3);
  const valtava = va.validoiKysely({ viestit: [{ role: 'user', content: 'K' }, { role: 'assistant', content: 'y'.repeat(20000) }, { role: 'user', content: 'J' }] });
  assert.ok(valtava.viestit[1].content.length < 12100, 'lyhennetty');
  assert.throws(() => va.validoiKysely({ viestit: [{ role: 'user', content: 'z'.repeat(4001) }] }), /liian pitkä/);
});

test('onRuotsiksi: ruotsinkielinen kysymys tunnistetaan, suomenkielinen ei', () => {
  assert.strictEqual(va.onRuotsiksi('Vad ska Sibbo P9 lära sig de kommande säsongerna?'), true);
  assert.strictEqual(va.onRuotsiksi('Hur lägger jag upp styrketräningen för laget?'), true);
  assert.strictEqual(va.onRuotsiksi('Mitä Sibbo P9 joukkueen tulisi oppia seuraavana kahtena kautena?'), false);
  assert.strictEqual(va.onRuotsiksi('Nosta P9 joukkueesta kaksi kehityskohdetta'), false);
});

test('onTestidata: siemenskriptin testidata tunnistetaan, oikea data ei', () => {
  assert.strictEqual(va.onTestidata({ _tag: 'testi_U12_P' }, 'abc'), true);
  assert.strictEqual(va.onTestidata({ pelaajaId: 'TEST_kpv_001' }, 'abc'), true);
  assert.strictEqual(va.onTestidata({ arvioija: 'TESTI – voidaan poistaa' }, 'abc'), true);
  assert.strictEqual(va.onTestidata({}, 'TEST_kpv_002'), true);
  assert.strictEqual(va.onTestidata({ joukkue: 'KPV P13', arvioija: 'Rasmus' }, 'm93GBdOaGCUuenMiCL0I'), false);
  assert.strictEqual(va.onTestidata({ arvioija: 'Testinen Matti' }, 'x'), false);
});


test('seurakerros: rakennaSeuranLinja tekee oman välimuistilohkon seuran tunnisteella', () => {
  const r = va.rakennaSeuranLinja('kpv', [{ nimi: '20_b.md', sisalto: 'B' }, { nimi: '10_a.md', sisalto: 'A' }]);
  assert.strictEqual(r.tiedostoja, 2);
  assert.ok(r.lohko.text.indexOf('<seuran_linja seura="kpv">') === 0);
  assert.ok(r.lohko.text.indexOf('10_a.md') < r.lohko.text.indexOf('20_b.md'));
  assert.deepStrictEqual(r.lohko.cache_control, { type: 'ephemeral' });
});

test('seurakerros: haeSeuranLinja lukee vain oman seuran polun ja hylkää väärän tunnisteen', async () => {
  const haetut = [];
  const tied = (nimi, sis) => ({ name: nimi, download: async () => [Buffer.from(sis)] });
  const admin = { storage: () => ({ bucket: () => ({ getFiles: async ({ prefix }) => { haetut.push(prefix); return [[
    tied(prefix + '10_x.md', 'X'), tied(prefix + 'alikansio/y.md', 'Y'), tied(prefix + 'luevinkki.txt', 'Z')]]; } }) }) };
  const a = { polku: 'valmennusapuri/' };
  assert.strictEqual(await va.haeSeuranLinja(admin, a, '../hp_johtaja'), null);
  assert.strictEqual(await va.haeSeuranLinja(admin, a, null), null);
  const r = await va.haeSeuranLinja(admin, a, 'testiseura1');
  assert.deepStrictEqual(haetut, ['valmennusapuri/seurat/testiseura1/']);
  assert.strictEqual(r.tiedostoja, 1);
  assert.ok(r.lohko.text.indexOf('X') > 0 && r.lohko.text.indexOf('Y') < 0);
});

test('seurakerros: käsittelijä lisää seuran linjan järjestelmään vain seuralle jolla se on; virhe ei kaada vastausta', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/u1': { aktiivinen: true, seuraId: 'kpv', nimi: 'T', tehtava: 'valmentaja' } });
  const kutsut = [];
  const lohko = { type: 'text', text: '<seuran_linja seura="kpv">K</seuran_linja>' };
  const h = va.kasittelija({ firestore: () => db }, functions, {
    env: { VALMENNUSAPURI_PAIVAKIINTIO: '5' },
    haeTietopohja: async () => TP,
    haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
    haeSeuranLinja: async (_ad, _a, id) => { if (id === 'kpv') return { lohko, tiedostoja: 1 }; return null; },
    kutsuMallia: async (_a, asetus, system) => { kutsut.push(system); return { teksti: 'V', syy: 'end_turn', tokenit: { syote: 1, tuotos: 1, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } }; },
  });
  await h(kysymys(), ctx('u1'));
  assert.strictEqual(kutsut[0].length, TP.system.length + 1);
  assert.strictEqual(kutsut[0][kutsut[0].length - 1], lohko);

  const h2 = va.kasittelija({ firestore: () => db }, functions, {
    env: { VALMENNUSAPURI_PAIVAKIINTIO: '5' },
    haeTietopohja: async () => TP,
    haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
    haeSeuranLinja: async () => { throw new Error('storage alhaalla'); },
    kutsuMallia: async (_a, asetus, system) => { kutsut.push(system); return { teksti: 'V', syy: 'end_turn', tokenit: { syote: 1, tuotos: 1, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } }; },
  });
  const r = await h2(kysymys(), ctx('u1'));
  assert.strictEqual(r.vastaus, 'V');
  assert.strictEqual(kutsut[1].length, TP.system.length);
});

// ── Aihejako: vain kysymyksen aihepiiri tietopohjasta (3.10.2026) ────────────
const u = (t) => [{ role: 'user', content: t }];
test('tunnistaAihe: yksi selvä aihe rajaa, epävarma/usea/kausi → kaikki', () => {
  assert.strictEqual(va.tunnistaAihe(u('Mikä on P13-pelaajan 30 m juoksun tavoitetaso?')), 'fysiikka');
  assert.strictEqual(va.tunnistaAihe(u('Voiko U14-pelaaja aloittaa lisäpainot?')), 'fysiikka');
  assert.strictEqual(va.tunnistaAihe(u('Anna syöttöharjoitus U10-ikäisille')), 'tekniikka');
  assert.strictEqual(va.tunnistaAihe(u('Suunnittele kausisuunnitelma U13:lle')), 'kaikki');
  assert.strictEqual(va.tunnistaAihe(u('Miten tekniikka ja voima yhdistetään?')), 'kaikki');
  assert.strictEqual(va.tunnistaAihe(u('Entä U15?')), 'kaikki');
  assert.strictEqual(va.tunnistaAihe([]), 'kaikki');
});
test('tunnistaAihe: aihe päätellään koko keskustelun käyttäjän viesteistä, ei apurin vastauksista', () => {
  const v = [{ role: 'user', content: 'Tavoitetasot P13 nopeus' }, { role: 'assistant', content: 'syöttö tekniikka konsepti' }, { role: 'user', content: 'Entä U14?' }];
  assert.strictEqual(va.tunnistaAihe(v), 'fysiikka');
});
test('suodataAihe: VA — ydin + paketti, tuntematon numero aina mukaan', () => {
  const f = ['00_a.md', '01_b.md', '10_c.md', '20_d.md', '30_e.md', '40_f.md', '60_uusi.md'].map((n) => ({ nimi: n, sisalto: 'x' }));
  assert.deepStrictEqual(va.suodataAihe(f, 'fysiikka', false).map((t) => t.nimi), ['00_a.md', '01_b.md', '30_e.md', '40_f.md', '60_uusi.md']);
  assert.deepStrictEqual(va.suodataAihe(f, 'tekniikka', false).map((t) => t.nimi), ['00_a.md', '01_b.md', '10_c.md', '60_uusi.md']);
  assert.strictEqual(va.suodataAihe(f, 'kaikki', false).length, f.length);
});
test('suodataAihe: HP — omat tiedostot (ei opas_) aina mukana, opas_-tiedostot rajataan', () => {
  const f = ['00_aani.md', '10_periaatteet.md', '20_termit_sv.md', 'opas_00_jarjestelma.md', 'opas_10_yksilokonseptit.md', 'opas_40_liikehallintamatriisi.md']
    .map((n) => ({ nimi: n, sisalto: 'x' }));
  assert.deepStrictEqual(va.suodataAihe(f, 'fysiikka', true).map((t) => t.nimi),
    ['00_aani.md', '10_periaatteet.md', '20_termit_sv.md', 'opas_00_jarjestelma.md', 'opas_40_liikehallintamatriisi.md']);
});
test('rakennaSystem: aihe lisää huomautuksen, ilman aihetta rakenne ennallaan', () => {
  const t = [{ nimi: 'a.md', sisalto: 'A' }];
  assert.ok(va.rakennaSystem('OHJE', t, 'fysiikka')[1].text.indexOf('<huomautus>') > 0);
  assert.strictEqual(va.rakennaSystem('OHJE', t)[1].text.indexOf('<huomautus>'), -1);
  assert.strictEqual(va.rakennaSystem('OHJE', t, 'kaikki')[1].text.indexOf('<huomautus>'), -1);
});
test('kasittelija: aihejako rajaa mallille menevän tietopohjan ja kirjaa aiheen; VALMENNUSAPURI_AIHEJAKO=0 palauttaa kaiken', async () => {
  const sisallot = ['00_j.md', '01_k.md', '10_y.md', '30_p.md', '40_m.md'].map((n) => ({ nimi: n, sisalto: 'S-' + n }));
  const TP2 = { system: [{ type: 'text', text: 'KAIKKI' }], ohjeistus: 'OHJE', sisallot, versio: '0.19', tiedostoja: 5 };
  const aja = async (env, teksti) => {
    const db = muistiDb();
    const kutsut = [];
    const h = va.kasittelija({ firestore: () => db }, functions, {
      env: Object.assign({ VALMENNUSAPURI_PAIVAKIINTIO: '5' }, env),
      haeTietopohja: async () => TP2,
      haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
      kutsuMallia: async (_a, _as, system) => { kutsut.push(system); return { teksti: 'V', syy: 'end_turn', tokenit: { syote: 1, tuotos: 1, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } }; },
    });
    const r = await h(kysymys(teksti), ctx(SA));
    return { kutsut, loki: db.data['valmennusapuri_loki/' + r.lokiId] };
  };
  const a = await aja({}, 'Mikä on P13-pelaajan 30 m juoksun tavoitetaso?');
  const teksti = a.kutsut[0][1].text;
  assert.ok(teksti.indexOf('40_m.md') > 0 && teksti.indexOf('30_p.md') > 0 && teksti.indexOf('00_j.md') > 0);
  assert.strictEqual(teksti.indexOf('10_y.md'), -1);
  assert.strictEqual(a.loki.aihe, 'fysiikka');
  assert.strictEqual(a.loki.tietopohjaTiedostoja, 4);
  const b = await aja({ VALMENNUSAPURI_AIHEJAKO: '0' }, 'Mikä on P13-pelaajan 30 m juoksun tavoitetaso?');
  assert.strictEqual(b.kutsut[0][0].text, 'KAIKKI');
  assert.strictEqual(b.loki.aihe, 'kaikki');
  const c = await aja({}, 'Suunnittele kausisuunnitelma');
  assert.strictEqual(c.kutsut[0][0].text, 'KAIKKI');
});

test('tunnistaAihe: taktiikka → joukkue; taktiikka + fysiikka → kaikki', () => {
  assert.strictEqual(va.tunnistaAihe(u('U13, 8v8. Taktiikka: avaus hajoaa paineessa')), 'joukkue');
  assert.strictEqual(va.tunnistaAihe(u('Miten pelaamme korkealla prässillä?')), 'joukkue');
  assert.strictEqual(va.tunnistaAihe(u('Taktiikka ja voimaharjoittelu')), 'kaikki');
});
test('suodataAihe: joukkue-paketti sisältää yksilökonseptit mutta ei fysiikkatiedostoja', () => {
  const f = ['00_a.md', '01_b.md', '10_c.md', '14_d.md', '20_e.md', '30_f.md', '40_g.md', '41_h.md', '42_i.md'].map((n) => ({ nimi: n, sisalto: 'x' }));
  const nimet = va.suodataAihe(f, 'joukkue', false).map((t) => t.nimi);
  assert.deepStrictEqual(nimet, ['00_a.md', '01_b.md', '10_c.md', '14_d.md', '20_e.md', '30_f.md']);
});
test('pikavalintojen pohjat osuvat oikeaan aiheeseen (kustannus + laatu)', () => {
  const alut = {
    'U13, 8v8. Taktiikka: ': 'joukkue',
    'Valmennuspäällikkö, U13. Kuorma ja kasvu: ': 'fysiikka',
    'Valmennuspäällikkö, U13. Testit ja tavoitetasot: ': 'fysiikka',
    'Valmennuspäällikkö, U13. Liikehallintamatriisi, portti: ': 'fysiikka',
    'Valmennuspäällikkö, U13. Kausisuunnitelma: ': 'kaikki',
    'U13, 8v8. Tee harjoitus tilanteeseen: ': 'kaikki',
    'U13, 8v8. Kirjaa havainnot: ': 'kaikki',
    'U13, 8v8. Mitä minun kannattaa havainnoida: ': 'kaikki',
  };
  Object.keys(alut).forEach((a) => assert.strictEqual(va.tunnistaAihe(u(a)), alut[a], a));
});

// ── K1 kustannus (CODE_BRIEF_K1_APURI_KUSTANNUS 29.10.2026) ──────────────────
// Synteettinen tietopohja: oikea tietopohja on yksityinen eikä kuulu julkiseen repoon.
const O = require('../valmennusapuri_osiot');
const TAYTE = (n) => ('täytettä ' + 'x'.repeat(40) + '\n').repeat(n);
const VA_TIEDOSTOT = [
  { nimi: '00_jarjestelma.md', sisalto: '# Järjestelmä\n\n## Periaate\nYdinteksti.\n' },
  { nimi: '01_koodisto.md', sisalto: '# Koodisto\n\n## Y-H1 Haltuunotto\nEnsimmäinen kosketus.\n\n## Y-H2 Syöttäminen\nSyöttö.\n' },
  { nimi: '10_yksilokonseptit.md', sisalto: '# Yksilö\n\n## Y-H1: Haltuunotto\nEnsimmäinen kosketus vie suuntaan.\n' },
  { nimi: '11_silta.md', sisalto: 'Otsikoton tiedosto: silta pelipaikkavaiheeseen.\n' },
  { nimi: '20_joukkueteemat.md', sisalto: '# Joukkue\n\n## Prässi\nJoukkueprässi avauksessa.\n\n## Prässi\nToinen samanniminen osio.\n' },
  { nimi: '40_liikehallintamatriisi.md', sisalto: '## Kuorma ja voima\nLisäpaino.\n' + TAYTE(200) },
];
const HP_TIEDOSTOT = [
  { nimi: '00_aani.md', sisalto: '# Ääni\n\n## Sävy\nRauhallinen.\n' },
  { nimi: '20_termit_sv.md', sisalto: '# Termit\n\n## Termit\n\n| fi | sv |\n| --- | --- |\n| kasvupyrähdys (PHV) | tillväxtspurt (PHV) |\n' },
  { nimi: 'opas_42_tavoitetasot.md', sisalto: '# Tavoitetasot\n\n## Kasvupyrähdys ja kuorma\nKevennä kuormaa.\n\n## Pojat\nTaulukko.\n' },
];
const u1 = (t) => [{ role: 'user', content: t }];

test('K1b pilkoOsiot: otsikoton tiedosto = yksi osio, id:t uniikit, merkit summautuvat, teksti säilyy', () => {
  const osiot = O.pilkoOsiot(VA_TIEDOSTOT);
  const silta = osiot.filter((o) => o.tiedosto === '11_silta.md');
  assert.strictEqual(silta.length, 1);
  assert.strictEqual(silta[0].id, '11_silta#alku');
  assert.strictEqual(new Set(osiot.map((o) => o.id)).size, osiot.length);
  assert.ok(osiot.some((o) => o.id === '20_joukkueteemat#prassi-2'), 'samanniminen otsikko saa juoksevan numeron');
  VA_TIEDOSTOT.forEach((t) => {
    const omat = osiot.filter((o) => o.tiedosto === t.nimi);
    assert.strictEqual(omat.map((o) => o.teksti).join(''), t.sisalto, t.nimi);
    assert.strictEqual(omat.reduce((s, o) => s + o.merkit, 0), t.sisalto.length);
  });
});
test('K1b pilkoOsiot: iso ##-osio pilkotaan ###-otsikoista, pieni ei', () => {
  const iso = '## Iso\nalku\n### A\n' + TAYTE(80) + '### B\n' + TAYTE(80);
  const pieni = '## Pieni\n### A\nx\n### B\ny\n';
  const a = O.pilkoOsiot([{ nimi: '30_iso.md', sisalto: iso }, { nimi: '31_pieni.md', sisalto: pieni }]);
  assert.deepStrictEqual(a.filter((o) => o.tiedosto === '30_iso.md').map((o) => o.otsikko), ['Iso', 'A', 'B']);
  assert.strictEqual(a.filter((o) => o.tiedosto === '31_pieni.md').length, 1);
  assert.strictEqual(a.filter((o) => o.tiedosto === '30_iso.md').map((o) => o.teksti).join(''), iso);
});
test('K1b valitseOsiot: ydin aina mukana, osuva osio valitaan, budjetti ei ylity', () => {
  const osiot = O.pilkoOsiot(VA_TIEDOSTOT);
  const v = O.valitseOsiot(osiot, u1('U10: pelaajat ottavat pallon huonosti vastaan, haltuunotto on hidas'), 2000, 'valmennusapuri');
  assert.strictEqual(v.kaikki, false);
  assert.strictEqual(v.syy, 'osiot');
  assert.deepStrictEqual([...new Set(v.ydin.map((o) => o.tiedosto))], ['00_jarjestelma.md', '01_koodisto.md']);
  assert.ok(v.valitut.some((o) => o.id === '10_yksilokonseptit#y-h1-haltuunotto'));
  assert.ok(!v.valitut.some((o) => o.tiedosto === '40_liikehallintamatriisi.md'));
  assert.ok(v.merkit <= 2000);
  assert.strictEqual(v.merkit, v.ydin.concat(v.valitut).reduce((s, o) => s + o.merkit, 0));
});
test('K1b valitseOsiot: jos mikään osuva osio ei mahdu → vain ydin + huomautus, ei koko tietopohjaa', () => {
  const osiot = O.pilkoOsiot(VA_TIEDOSTOT);
  const ydin = osiot.filter((o) => /^0[01]_/.test(o.tiedosto)).reduce((s, o) => s + o.merkit, 0);
  const v = O.valitseOsiot(osiot, u1('Voima ja kuorma: lisäpaino U15'), ydin + 50, 'valmennusapuri');
  assert.strictEqual(v.kaikki, false);
  assert.strictEqual(v.syy, 'ei-mahdu');
  assert.deepStrictEqual(v.valitut, []);
  assert.strictEqual(v.merkit, ydin);
  const s = O.rakennaSystemOsiot('OHJE', v, { vmYdin: true });
  assert.strictEqual(s.length, 1, 'vain ydinlohko');
  assert.ok(s[0].text.includes('<huomautus>'));
  assert.ok(!s[0].text.includes('Lisäpaino'));
  const ilman = O.rakennaSystemOsiot('OHJE', v, {});
  assert.ok(ilman[1].text.includes('<huomautus>') && !ilman[1].text.includes('Lisäpaino'));
});
test('K1b valitseOsiot: AIHE_KAIKKI ja ei osumia → koko tietopohja', () => {
  const osiot = O.pilkoOsiot(VA_TIEDOSTOT);
  const kausi = O.valitseOsiot(osiot, u1('Tee kausisuunnitelma U12:lle'), 60000, 'valmennusapuri');
  assert.strictEqual(kausi.kaikki, true);
  assert.strictEqual(kausi.syy, 'aihe-kaikki');
  assert.strictEqual(kausi.ydin.length + kausi.valitut.length, osiot.length);
  const ei = O.valitseOsiot(osiot, u1('Mikä on paras kahvila?'), 60000, 'valmennusapuri');
  assert.strictEqual(ei.kaikki, true);
  assert.strictEqual(ei.syy, 'ei-osumia');
});
test('K1b valitseOsiot: kaksi edellistä käyttäjän viestiä mukana, vanhemmat eivät', () => {
  const osiot = O.pilkoOsiot(VA_TIEDOSTOT);
  const viestit = [
    { role: 'user', content: 'joukkueprässi' }, { role: 'assistant', content: 'a' },
    { role: 'user', content: 'haltuunotto' }, { role: 'assistant', content: 'b' },
    { role: 'user', content: 'entä tämä' }, { role: 'assistant', content: 'c' },
    { role: 'user', content: 'ja vielä' },
  ];
  const v = O.valitseOsiot(osiot, viestit, 60000, 'valmennusapuri');
  assert.ok(v.valitut.some((o) => o.id === '10_yksilokonseptit#y-h1-haltuunotto'));
  assert.ok(!v.valitut.some((o) => o.tiedosto === '20_joukkueteemat.md'), 'neljänneksi viimeinen käyttäjän viesti ei vaikuta');
});
test('K1b valitseOsiot: ruotsinkielinen kysymys löytää osion sv-sanaston kautta (HP)', () => {
  const osiot = O.pilkoOsiot(HP_TIEDOSTOT);
  const v = O.valitseOsiot(osiot, u1('Hur hanterar vi tillväxtspurt i P14?'), 90000, 'hp');
  assert.strictEqual(v.kaikki, false);
  assert.ok(v.valitut.some((o) => o.id === 'opas_42_tavoitetasot#kasvupyrahdys-ja-kuorma'));
  assert.ok(v.ydin.some((o) => o.tiedosto === '20_termit_sv.md'), 'HP:n sv-termit ovat ytimessä');
});
test('K1c rakennaSystemOsiot: vmYdin → cache_control vain ensimmäisessä lohkossa; koko tietopohja → vanha rakenne', () => {
  const osiot = O.pilkoOsiot(VA_TIEDOSTOT);
  const v = O.valitseOsiot(osiot, u1('haltuunotto U10'), 60000, 'valmennusapuri');
  const s = O.rakennaSystemOsiot('OHJE', v, { vmYdin: true });
  assert.strictEqual(s.length, 2);
  assert.deepStrictEqual(s[0].cache_control, { type: 'ephemeral' });
  assert.ok(s[0].text.startsWith('OHJE') && s[0].text.includes('<huomautus>') && s[0].text.includes('01_koodisto.md'));
  assert.strictEqual(s[1].cache_control, undefined);
  assert.ok(s[1].text.includes('10_yksilokonseptit.md'));
  const ilman = O.rakennaSystemOsiot('OHJE', v, {});
  assert.strictEqual(ilman[0].cache_control, undefined);
  assert.ok(ilman[1].cache_control);
  const kaikki = O.valitseOsiot(osiot, u1('kausisuunnitelma'), 60000, 'valmennusapuri');
  const k = O.rakennaSystemOsiot('OHJE', kaikki, { vmYdin: true, ttl: '1h' });
  assert.deepStrictEqual(k.map((l) => !!l.cache_control), [false, true]);
  assert.deepStrictEqual(k[1].cache_control, { type: 'ephemeral', ttl: '1h' });
  assert.ok(!k[1].text.includes('<huomautus>'));
});
test('K1a hintaArvio: tokenit × hinnasto ($/M)', () => {
  const h = { syote: 3, tuotos: 15, vmKirj: 3.75, vmLuku: 0.3 };
  assert.strictEqual(O.hintaArvio({ syote: 10000, tuotos: 1000, valimuistiKirjoitettu: 20000, valimuistiLuettu: 100000 }, h),
    0.03 + 0.015 + 0.075 + 0.03);
  assert.strictEqual(O.hintaArvio(null, h), 0);
});
test('K1 asetukset: kaikki uudet liput oletuksena pois', () => {
  const a = va.asetukset({});
  assert.strictEqual(a.osiohaku, false);
  assert.strictEqual(a.vmYdin, false);
  assert.strictEqual(a.vmTtl, '5m');
  assert.strictEqual(a.kevytMalli, '');
  assert.strictEqual(a.reititys, false);
  assert.strictEqual(a.seurabudjetti, false);
  assert.strictEqual(a.seurabudjettiUsd, 30);
  assert.deepStrictEqual(a.osioBudjetti, { valmennusapuri: 60000, hp: 120000 });
  assert.deepStrictEqual(a.hinnat.perus, { syote: 3, tuotos: 15, vmKirj: 3.75, vmLuku: 0.3, vmKirj1h: 6 });
  assert.strictEqual(va.asetukset({ VALMENNUSAPURI_HINTA_KEVYT_SYOTE: '0.8' }).hinnat.kevyt.syote, 0.8);
  assert.strictEqual(va.asetukset({ VALMENNUSAPURI_HINTA_SYOTE: 'abc' }).hinnat.perus.syote, 3);
});

// Käsittelijä K1-lipuilla: oikea rakennettu tietopohja (ohjeistus + sisällöt + osiot), tokenit säädettävissä.
const KEVYT = 'eu.anthropic.claude-haiku-4-5-20251001-v1:0';
function teeK1(db, o) {
  const opt = o || {};
  const kutsut = [];
  const tpVa = { system: va.rakennaSystem('OHJE', VA_TIEDOSTOT), ohjeistus: 'OHJE', sisallot: VA_TIEDOSTOT, versio: '0.19',
    tiedostoja: VA_TIEDOSTOT.length, osiot: O.pilkoOsiot(VA_TIEDOSTOT) };
  const tpHp = { system: va.rakennaSystem('HP-OHJE', HP_TIEDOSTOT), ohjeistus: 'HP-OHJE', sisallot: HP_TIEDOSTOT, versio: '0.25',
    tiedostoja: HP_TIEDOSTOT.length, osiot: O.pilkoOsiot(HP_TIEDOSTOT) };
  const h = va.kasittelija({ firestore: () => db }, functions, {
    env: Object.assign({ VALMENNUSAPURI_PAIVAKIINTIO: '50' }, opt.env || {}),
    haeTietopohja: async (_a, _as, polku) => (/hp_johtaja/.test(polku) ? tpHp : tpVa),
    haeSeuranTiedot: async () => ({ nimet: [], seura: null }),
    haeSeuranLinja: async (_a, _as, seuraId) => (opt.linja ? va.rakennaSeuranLinja(seuraId, [{ nimi: 'linja.md', sisalto: 'Seuran linja.' }]) : null),
    kutsuMallia: async (_a, asetus, system, viestit) => {
      kutsut.push({ asetus, system, viestit });
      if (opt.kevytKaatuu && asetus.malli === KEVYT) throw Object.assign(new Error('kevyt alhaalla'), { tmKoodi: 'unavailable' });
      return { teksti: 'Vastaus', syy: 'end_turn', tokenit: opt.tokenit || { syote: 1000, tuotos: 100, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } };
    },
  });
  return { h, kutsut };
}
const lokit = (db) => Object.keys(db.data).filter((k) => k.indexOf('valmennusapuri_loki/') === 0).map((k) => db.data[k]);
const OSIO_ENV = { VALMENNUSAPURI_OSIOHAKU: '1', VALMENNUSAPURI_VM_YDIN: '1' };

test('K1 käsittelijä, liput pois: system ennallaan, lokiin malliTaso perus + hintaArvioUsd', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h, kutsut } = teeK1(db, { tokenit: { syote: 10000, tuotos: 1000, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } });
  await h(kysymys('haltuunotto U10'), ctx('v1'));
  assert.deepStrictEqual(kutsut[0].system, va.rakennaSystem('OHJE', VA_TIEDOSTOT), 'ei aihetta → koko tietopohja kuten ennen');
  const l = lokit(db)[0];
  assert.strictEqual(l.aihe, 'kaikki');
  assert.strictEqual(l.malliTaso, 'perus');
  assert.strictEqual(l.osiot, null);
  assert.strictEqual(l.osioSyy, null);
  assert.strictEqual(l.hintaArvioUsd, 0.045);
  assert.strictEqual(Object.keys(db.data).some((k) => k.indexOf('valmennusapuri_budjetti/') === 0), false);
});
test('K1 käsittelijä, OSIOHAKU + VM_YDIN: cache_control vain ytimessä, seuran linja ilman, lokiin osiot', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h, kutsut } = teeK1(db, { env: OSIO_ENV, linja: true });
  await h(kysymys('U10: haltuunotto on hidas'), ctx('v1'));
  const s = kutsut[0].system;
  assert.deepStrictEqual(s.map((l) => !!l.cache_control), [true, false, false]);
  assert.ok(s[0].text.startsWith('OHJE'));
  assert.ok(s[2].text.startsWith('<seuran_linja'));
  const l = lokit(db)[0];
  assert.strictEqual(l.osioSyy, 'osiot');
  assert.ok(l.osiot.includes('10_yksilokonseptit#y-h1-haltuunotto'));
  assert.ok(l.osiot.includes('00_jarjestelma#periaate'), 'ydin lokissa');
  assert.strictEqual(l.aihe, 'osiot');
  assert.ok(l.tietopohjaMerkit > 0);
});
test('K1 käsittelijä, OSIOHAKU ilman VM_YDIN: seuran linja pitää välimuistinsa (rakenne kuten ennen)', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h, kutsut } = teeK1(db, { env: { VALMENNUSAPURI_OSIOHAKU: '1' }, linja: true });
  await h(kysymys('U10: haltuunotto on hidas'), ctx('v1'));
  assert.deepStrictEqual(kutsut[0].system.map((l) => !!l.cache_control), [false, true, true]);
});
test('K1c VM_TTL=1h: jokainen cache_control saa ttl 1h (myös vanha rakenne ja seuran linja)', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h, kutsut } = teeK1(db, { env: { VALMENNUSAPURI_VM_TTL: '1h', VALMENNUSAPURI_AIHEJAKO: '0' }, linja: true });
  await h(kysymys('kysymys'), ctx('v1'));
  const cc = kutsut[0].system.filter((l) => l.cache_control).map((l) => l.cache_control);
  assert.strictEqual(cc.length, 2);
  cc.forEach((c) => assert.deepStrictEqual(c, { type: 'ephemeral', ttl: '1h' }));
  assert.strictEqual(lokit(db)[0].vmTtl, '1h');
});

const REITITYS_ENV = Object.assign({ VALMENNUSAPURI_REITITYS: '1', VALMENNUSAPURI_KEVYT_MALLI: KEVYT }, OSIO_ENV);
test('K1d reititys: VA + osumat → kevyt malli, kevyen hinnat lokissa', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h, kutsut } = teeK1(db, { env: REITITYS_ENV, tokenit: { syote: 10000, tuotos: 1000, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } });
  await h(kysymys('U10: haltuunotto on hidas'), ctx('v1'));
  assert.strictEqual(kutsut.length, 1);
  assert.strictEqual(kutsut[0].asetus.malli, KEVYT);
  const l = lokit(db)[0];
  assert.strictEqual(l.malliTaso, 'kevyt');
  assert.strictEqual(l.malli, KEVYT);
  assert.strictEqual(l.hintaArvioUsd, 0.015);
});
test('K1d reititys: VA + kaikki → perusmalli; HP → perusmalli aina', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv', roolit: ['hp'] } });
  const { h, kutsut } = teeK1(db, { env: REITITYS_ENV });
  await h(kysymys('Tee kausisuunnitelma U12:lle'), ctx('v1'));
  await h(Object.assign(kysymys('Hur hanterar vi tillväxtspurt i P14?'), { rooli: 'hp' }), ctx('v1'));
  assert.deepStrictEqual(kutsut.map((k) => k.asetus.malli), ['eu.anthropic.claude-sonnet-4-6', 'eu.anthropic.claude-sonnet-4-6']);
  assert.deepStrictEqual(lokit(db).map((l) => l.malliTaso), ['perus', 'perus']);
  assert.strictEqual(lokit(db)[1].osioSyy, 'osiot', 'HP:n osiohaku löysi osumat, silti perusmalli');
});
test('K1d reititys: kevyen mallin ei-EU-ID → estetty ennen kutsua (ei varamallia)', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const env = Object.assign({}, REITITYS_ENV, { VALMENNUSAPURI_KEVYT_MALLI: 'us.anthropic.claude-haiku-4-5-20251001-v1:0' });
  const { h, kutsut } = teeK1(db, { env });
  await assert.rejects(h(kysymys('U10: haltuunotto on hidas'), ctx('v1')), (e) => e.code === 'failed-precondition');
  assert.strictEqual(kutsut.length, 0);
  assert.throws(() => va.valitseMalli(va.asetukset(Object.assign({}, env)), 'valmennusapuri', { kaikki: false, syy: 'osiot' }),
    (e) => e.tmKoodi === 'failed-precondition');
});
test('K1d reititys: kevyen mallin virhe → yksi uusi yritys perusmallilla, lokiin varamalli', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h, kutsut } = teeK1(db, { env: REITITYS_ENV, kevytKaatuu: true });
  const r = await h(kysymys('U10: haltuunotto on hidas'), ctx('v1'));
  assert.strictEqual(r.vastaus, 'Vastaus');
  assert.deepStrictEqual(kutsut.map((k) => k.asetus.malli), [KEVYT, 'eu.anthropic.claude-sonnet-4-6']);
  const l = lokit(db)[0];
  assert.strictEqual(l.malliTaso, 'perus');
  assert.strictEqual(l.varamalli, true);
});

// K1e: 1 kysymys = 10 000 syötettä + 1 000 tuotosta perusmallilla = 0,045 $. Raja 1 $ (seuradokista).
const BUDJETTI_ENV = { VALMENNUSAPURI_SEURABUDJETTI: '1' };
const KK = O.kuukausiAvain();
const TOK = { syote: 10000, tuotos: 1000, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 };
function budjettiDb(usd, lisat) {
  return muistiDb(Object.assign({
    'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' },
    'valmennusapuri_seurat/kpv': { budjettiUsd: 1 },
    ['valmennusapuri_budjetti/kpv_' + KK]: { usd: usd, kysymyksia: 5 },
  }, lisat || {}));
}
async function varoitukset(fn) {
  const alkup = console.warn, ulos = [];
  console.warn = (...a) => ulos.push(a.join(' '));
  try { await fn(); } finally { console.warn = alkup; }
  return ulos.filter((x) => /seurabudjetti 80 %/.test(x));
}
test('K1e budjetti: 79 % → kutsu, laskuri kasvaa transaktiolla, ei varoitusta', async () => {
  const db = budjettiDb(0.7);
  const { h, kutsut } = teeK1(db, { env: BUDJETTI_ENV, tokenit: TOK });
  const w = await varoitukset(() => h(kysymys('kysymys'), ctx('v1')));
  assert.strictEqual(kutsut.length, 1);
  const d = db.data['valmennusapuri_budjetti/kpv_' + KK];
  assert.strictEqual(d.usd, 0.745);
  assert.strictEqual(d.kysymyksia, 6);
  assert.strictEqual(d.varoitettu80, undefined);
  assert.strictEqual(w.length, 0);
});
test('K1e budjetti: 80 % ylittyy → varoitus kerran kuussa', async () => {
  const db = budjettiDb(0.77);
  const { h } = teeK1(db, { env: BUDJETTI_ENV, tokenit: TOK });
  const w1 = await varoitukset(() => h(kysymys('kysymys'), ctx('v1')));
  const w2 = await varoitukset(() => h(kysymys('kysymys'), ctx('v1')));
  assert.strictEqual(w1.length, 1);
  assert.strictEqual(w2.length, 0);
  assert.strictEqual(db.data['valmennusapuri_budjetti/kpv_' + KK].varoitettu80, true);
});
test('K1e budjetti: 100 % → resource-exhausted ennen mallikutsua (fi/sv), päiväkiintiö ei kulu', async () => {
  const db = budjettiDb(1);
  const { h, kutsut } = teeK1(db, { env: BUDJETTI_ENV });
  await assert.rejects(h(kysymys('kysymys'), ctx('v1')),
    (e) => e.code === 'resource-exhausted' && e.message === 'Seuran kuukauden apurikiintiö on käytetty. Ota yhteyttä TalentMasteriin.'
      && e.details && e.details.syy === 'seurabudjetti');
  await assert.rejects(h(Object.assign(kysymys('fråga'), { kieli: 'sv' }), ctx('v1')),
    (e) => e.code === 'resource-exhausted' && e.message === 'Föreningens månadskvot för assistenten är använd. Kontakta TalentMaster.');
  assert.strictEqual(kutsut.length, 0);
  assert.strictEqual(Object.keys(db.data).some((k) => k.indexOf('valmennusapuri_kaytto/') === 0), false);
});
test('K1e budjetti: oletusraja envistä, kun seuralla ei omaa', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' }, ['valmennusapuri_budjetti/kpv_' + KK]: { usd: 2 } });
  const { h } = teeK1(db, { env: Object.assign({ VALMENNUSAPURI_SEURABUDJETTI_USD: '2' }, BUDJETTI_ENV) });
  await assert.rejects(h(kysymys('kysymys'), ctx('v1')), (e) => e.code === 'resource-exhausted');
  const { h: h30, kutsut } = teeK1(db, { env: BUDJETTI_ENV });
  await h30(kysymys('kysymys'), ctx('v1'));
  assert.strictEqual(kutsut.length, 1, 'oletus 30 $');
});
test('K1e budjetti: SA ohittaa (ei tarkistusta, ei laskuria) myös seuran datalla', async () => {
  const db = budjettiDb(5);
  const { h, kutsut } = teeK1(db, { env: BUDJETTI_ENV });
  await h(Object.assign(kysymys('kysymys'), { seuraId: 'kpv' }), ctx(SA));
  assert.strictEqual(kutsut.length, 1);
  assert.strictEqual(db.data['valmennusapuri_budjetti/kpv_' + KK].usd, 5);
});
test('K1e budjetti: lippu pois → ei tarkistusta eikä laskuria', async () => {
  const db = budjettiDb(5);
  const { h, kutsut } = teeK1(db, {});
  await h(kysymys('kysymys'), ctx('v1'));
  assert.strictEqual(kutsut.length, 1);
  assert.strictEqual(db.data['valmennusapuri_budjetti/kpv_' + KK].kysymyksia, 5);
});
test('K1e budjettiAvain: Suomen kuukausi (UTC-ilta 31.10. = marraskuu Helsingissä)', () => {
  assert.strictEqual(va.budjettiAvain('kpv', new Date('2026-10-31T22:30:00Z')), 'kpv_2026-11');
  assert.strictEqual(va.budjettiAvain('kpv', new Date('2026-10-31T20:30:00Z')), 'kpv_2026-10');
});
test('K1a apuri_kooste: koosta laskee mediaanit ja $; select-kentissä ei kysymystä, vastausta eikä kontekstia', async () => {
  const k = await import('../tools/apuri_kooste.mjs');
  ['kysymys', 'vastaus', 'konteksti', 'uid'].forEach((x) => assert.ok(!k.KENTAT.includes(x), x));
  const tulos = k.koosta([
    { rooli: 'valmennusapuri', seuraId: 'kpv', hintaArvioUsd: 0.05, kestoMs: 4000, osioSyy: 'osiot', malliTaso: 'kevyt',
      tokenit: { syote: 10000, tuotos: 500, valimuistiLuettu: 10000, valimuistiKirjoitettu: 0 } },
    { rooli: 'valmennusapuri', seuraId: 'kpv', kestoMs: 6000, aihe: 'kaikki', palaute: { arvio: 'hyva' },
      tokenit: { syote: 20000, tuotos: 1000, valimuistiLuettu: 0, valimuistiKirjoitettu: 0 } },
    { rooli: 'hp', seuraId: 'fcl', hintaArvioUsd: 0.2, stopReason: 'max_tokens', tokenit: { syote: 30000 } },
  ], va.asetukset({}).hinnat);
  assert.strictEqual(tulos.kysymyksia, 3);
  assert.strictEqual(tulos.hintaArvioitu, 1);
  const v = tulos.roolit.valmennusapuri;
  assert.strictEqual(v.syoteTokenitMediaani, 20000);
  assert.strictEqual(v.usdPerKysymysKa, 0.0625);   // (0,05 + 0,075) / 2; jälkimmäinen arvioitu: 20 000×3 + 1 000×15 = 0,075 $
  assert.strictEqual(v.kestoSMediaani, 5);
  assert.strictEqual(v.valimuistiOsuus, 0.25);
  assert.deepStrictEqual(v.osiohaunSyyt, { osiot: 1, 'aihe:kaikki': 1 });
  assert.deepStrictEqual(v.malliTasot, { kevyt: 1, perus: 1 });
  assert.deepStrictEqual(v.palaute, { hyva: 1, huono: 0 });
  assert.strictEqual(tulos.roolit.hp.katkenneita, 1);
  assert.deepStrictEqual(tulos.seurat, [{ seura: 'fcl', kysymyksia: 1, usd: 0.2 }, { seura: 'kpv', kysymyksia: 2, usd: 0.13 }]);
});
test('K1 käsittelijä: ei-mahdu → vain ydin mallille, perusmalli vaikka REITITYS=1, lokiin ytimen osiot', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const ydin = O.pilkoOsiot(VA_TIEDOSTOT).filter((o) => /^0[01]_/.test(o.tiedosto));
  const env = Object.assign({ VALMENNUSAPURI_OSIOBUDJETTI_VA: String(ydin.reduce((s, o) => s + o.merkit, 0) + 50) }, REITITYS_ENV);
  const { h, kutsut } = teeK1(db, { env });
  await h(kysymys('Voima ja kuorma: lisäpaino U15'), ctx('v1'));
  assert.strictEqual(kutsut[0].asetus.malli, 'eu.anthropic.claude-sonnet-4-6');
  assert.strictEqual(kutsut[0].system.length, 1);
  assert.ok(!kutsut[0].system[0].text.includes('Lisäpaino'));
  const l = lokit(db)[0];
  assert.strictEqual(l.osioSyy, 'ei-mahdu');
  assert.strictEqual(l.malliTaso, 'perus');
  assert.deepStrictEqual(l.osiot, ydin.map((o) => o.id));
});
test('K1e päiväkiintiö pysyy erillään: resource-exhausted ilman seurabudjetti-merkintää', async () => {
  const db = muistiDb({ 'valmennusapuri_pilotti/v1': { aktiivinen: true, seuraId: 'kpv' } });
  const { h } = teeK1(db, { env: { VALMENNUSAPURI_PAIVAKIINTIO: '1' } });
  await h(kysymys('kysymys'), ctx('v1'));
  await assert.rejects(h(kysymys('kysymys'), ctx('v1')), (e) => e.code === 'resource-exhausted' && !(e.details && e.details.syy));
});
