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
function muistiDb(alku) {
  const data = Object.assign({}, alku || {});
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
test('kasittelija: super admin pääsee aina (UID-invariantti) ilman pilottidokumenttia', async () => {
  const { h } = teeKasittelija(muistiDb());
  const r = await h(kysymys(), ctx(va.SA_UID));
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
  const r = await h(Object.assign(kysymys(), { rooli: 'hp' }), ctx(va.SA_UID));
  assert.strictEqual(r.rooli, 'hp');
  assert.deepStrictEqual(polut, ['valmennusapuri/hp_johtaja/']);
  assert.strictEqual(db.data['valmennusapuri_loki/' + r.lokiId].rooli, 'hp');
});

test('kasittelija: ilman roolia → valmennusapurin polku (taaksepäin yhteensopiva)', async () => {
  const { h, polut } = teeRoolikasittelija(muistiDb());
  const r = await h(kysymys(), ctx(va.SA_UID));
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
