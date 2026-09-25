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
test('asetukset: oletuksena Vertex EU', () => {
  const a = va.asetukset({});
  assert.strictEqual(a.provider, 'vertex');
  assert.strictEqual(a.alue, 'eu');
  assert.strictEqual(a.paivaKiintio, 40);
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
  assert.strictEqual(kutsut[0].asetus.provider, 'vertex');
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
  assert.deepStrictEqual(t, { oikeus: true, paivaKiintio: 2, kaytetty: 1 });
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
