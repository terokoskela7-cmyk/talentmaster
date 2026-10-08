'use strict';
/** Huoltajan sähköpostin vahvistus (functions/huoltajan_vahvistus.js): kohteiden valinta, kuiva-ajo (vain lukumäärät), itsepalvelu (oikeus + cooldown + linkkityyppi), SA-rajaus, esc. */
const { test } = require('node:test');
const assert = require('node:assert');
const V = require('../huoltajan_vahvistus');
const { pohjaVahvistusLinkki } = require('../sahkoposti_pohjat');
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const U = (email, o) => Object.assign({ uid: 'u_' + email, email, emailVerified: false, disabled: false, customClaims: {}, metadata: { lastSignInTime: null } }, o || {});
const SEURAT = new Map([['a@x.fi', new Set(['kpv'])], ['b@x.fi', new Set(['sjk', 'kpv'])], ['c@x.fi', new Set(['sibbo'])], ['d@x.fi', new Set(['sjk'])], ['paikka@example.com', new Set(['sjk'])]]);

test('valitseKohteet: vain vahvistamattomat huoltajatilit; ei henkilökuntaa/pelaajatokenia/estettyjä/paikkamerkkiä; linkkityyppi kirjautumisen mukaan', () => {
  const k = V.valitseKohteet([
    U('A@x.fi'), U('b@x.fi', { metadata: { lastSignInTime: 'Thu, 09 Oct 2026 10:00:00 GMT' } }), U('c@x.fi', { emailVerified: true }), U('d@x.fi', { disabled: true }),
    U('henkilosto@x.fi'), U('vp@x.fi', { customClaims: { rooli: 'vp', seuraId: 'kpv' } }), U('paikka@example.com'), { uid: 'x' }], SEURAT, (e) => /@example\.com$/.test(e));
  assert.deepStrictEqual(k.map((x) => [x.email, x.tyyppi]), [['a@x.fi', 'salasana'], ['b@x.fi', 'vahvistus']]);
  assert.deepStrictEqual(V.yhteenveto(k), { yhteensa: 2, salasanalinkki: 1, vahvistuslinkki: 1, seuroittain: { kpv: 2, sjk: 1 } });
});

function massaDb(users) {
  const sn = [...SEURAT.entries()].flatMap(([e, ss]) => [...ss].map((s) => ({ data: () => ({ huoltajaEmail: e }), ref: { parent: { parent: { id: s, parent: { id: 'seurat' } } } } })));
  return { db: { collectionGroup: () => ({ get: async () => ({ forEach: (f) => sn.forEach(f) }) }) }, auth: { listUsers: async () => ({ users, pageToken: undefined }),
    generatePasswordResetLink: async (e) => 'https://reset/' + e, generateEmailVerificationLink: async (e) => 'https://verify/' + e } };
}
const massaKutsu = (o, data, uid) => V.luoMassa(Object.assign({ HttpsError, vanhempiUrl: 'https://v', pohja: pohjaVahvistusLinkki, onSuperAdminUid: async (u) => u === 'sa', onPaikkamerkki: () => false }, o))(data, uid === null ? {} : { auth: { uid: uid || 'sa', token: {} } });

test('massa: KUIVA-AJO on oletus ({} / kuiva:true) — ei lähetä, vastaus VAIN lukumääriä (ei osoitteita/uid:itä)', async () => {
  const lahetetyt = []; const m = massaDb([U('a@x.fi'), U('b@x.fi')]);
  for (const data of [{}, { kuiva: true }, undefined, { kuiva: 'false' }]) {
    const r = await massaKutsu({ db: m.db, auth: m.auth, lahetaSahkoposti: async (x) => lahetetyt.push(x) }, data);
    assert.strictEqual(r.kuiva, true); assert.strictEqual(r.yhteensa, 2); assert.ok(!JSON.stringify(r).match(/@|u_|https/));
  }
  assert.deepStrictEqual(lahetetyt, []);
});
test('massa: lähetys vain kuiva:false + super-admin; linkkityyppi per tili; yksi virhe ei kaada muita; audit vain lukumäärät', async () => {
  const l = []; const m = massaDb([U('a@x.fi'), U('b@x.fi', { metadata: { lastSignInTime: 'x' } }), U('c@x.fi')]); const auditit = [];
  const r = await massaKutsu({ db: m.db, auth: m.auth, lahetaSahkoposti: async (x) => { if (x.to === 'c@x.fi') throw new Error('sendgrid'); l.push(x); }, audit: async (a) => auditit.push(a) }, { kuiva: false });
  assert.deepStrictEqual({ k: r.kohteita, l: r.lahetetty, e: r.epaonnistui }, { k: 3, l: 2, e: 1 });
  assert.match(l[0].html, /https:\/\/reset\/a@x\.fi/); assert.match(l[1].html, /https:\/\/verify\/b@x\.fi/); assert.match(l[0].subject, /salasana/i); assert.match(l[1].subject, /Vahvista/);
  assert.ok(!JSON.stringify(auditit).match(/@/)); assert.ok(!JSON.stringify(r).match(/@/));
  await assert.rejects(massaKutsu({ db: m.db, auth: m.auth, lahetaSahkoposti: async () => {} }, { kuiva: false }, 'joku'), (e) => e.code === 'permission-denied');
  await assert.rejects(massaKutsu({ db: m.db, auth: m.auth, lahetaSahkoposti: async () => {} }, { kuiva: false }, null), (e) => e.code === 'unauthenticated');
});

function itseDb(o) { const cd = o.cooldown || {};
  return { db: { collectionGroup: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: !o.huoltaja }) }) }) }), collection: () => ({ doc: (uid) => ({ get: async () => ({ exists: uid in cd, data: () => cd[uid] }), set: async (d) => { cd[uid] = d; } }) }) }, cd };
}
const itse = (o, ctx, nyt) => { const l = []; return V.luoItselle({ db: o.db, auth: o.auth, HttpsError, lahetaSahkoposti: async (x) => l.push(x), pohja: pohjaVahvistusLinkki, vanhempiUrl: 'https://v', nyt: () => nyt || 1e12 })({}, ctx).then((r) => ({ r, l })); };
const ctxK = (x) => ({ auth: { uid: 'g1', token: Object.assign({ email: 'Aiti@X.fi' }, x || {}) } });
const authK = (u) => ({ getUser: async () => u, generatePasswordResetLink: async (e) => 'https://reset/' + e, generateEmailVerificationLink: async (e) => 'https://verify/' + e });

test('itsepalvelu: huoltaja (osoite on pelaajan huoltajaEmail) saa linkin TOKENIN osoitteeseen; ei kirjautunut → salasanalinkki, kirjautunut → vahvistuslinkki; cooldown 5 min', async () => {
  const d = itseDb({ huoltaja: true });
  let { r, l } = await itse({ db: d.db, auth: authK({ emailVerified: false, metadata: {} }) }, ctxK());
  assert.strictEqual(r.tila, 'lahetetty'); assert.strictEqual(l[0].to, 'aiti@x.fi'); assert.match(l[0].html, /reset\/aiti@x\.fi/);
  ({ r, l } = await itse({ db: d.db, auth: authK({ emailVerified: false, metadata: {} }) }, ctxK(), 1e12 + 1000)); assert.strictEqual(r.tila, 'odota'); assert.strictEqual(l.length, 0);
  ({ r, l } = await itse({ db: d.db, auth: authK({ emailVerified: false, metadata: { lastSignInTime: 'x' } }) }, ctxK(), 1e12 + V.COOLDOWN_MS + 1)); assert.strictEqual(r.tila, 'lahetetty'); assert.match(l[0].html, /verify\//);
});
test('itsepalvelu: jo vahvistettu → ei lähetystä; ei huoltaja → permission-denied; pelaajatoken / anonyymi / kirjautumaton / ei emailia → hylkäys', async () => {
  const d = itseDb({ huoltaja: true });
  assert.strictEqual((await itse({ db: d.db, auth: authK({ emailVerified: true }) }, ctxK())).r.tila, 'jo_vahvistettu');
  await assert.rejects(itse({ db: itseDb({ huoltaja: false }).db, auth: authK({ emailVerified: false, metadata: {} }) }, ctxK()), (e) => e.code === 'permission-denied');
  for (const ctx of [{ auth: { uid: 'p', token: { rooli: 'pelaaja', pelaajaSeuraId: 's', pelaajaId: 'p', email: 'a@x.fi' } } }, { auth: { uid: 'a', token: { firebase: { sign_in_provider: 'anonymous' }, email: 'a@x.fi' } } }, ctxK({ email: '' }), { auth: { uid: 'g', token: {} } }])
    await assert.rejects(itse({ db: d.db, auth: authK({ emailVerified: false, metadata: {} }) }, ctx), (e) => e.code === 'permission-denied');
  await assert.rejects(itse({ db: d.db, auth: authK({}) }, {}), (e) => e.code === 'unauthenticated');
});
test('pohja: linkit ja arvot esc():n kautta (§39); tyyppi ohjaa otsikkoa; vanheneminen 1 h mainittu', () => {
  const h = pohjaVahvistusLinkki({ tyyppi: 'salasana', linkki: 'https://x/?a=1&b="><script>', vanhempiLinkki: 'https://v/"x' });
  assert.ok(!h.includes('<script>')); assert.ok(!h.includes('"x')); assert.match(h, /1 tunnin/); assert.match(h, /Aseta salasana/);
  assert.match(pohjaVahvistusLinkki({ tyyppi: 'vahvistus', linkki: 'https://x' }), /Vahvista osoite/);
});
test('index.js: callablet rekisteröity europe-west1 + enforceAppCheck + SendGrid-secret; massalähetys vaatii super-adminin (onSuperAdminUid)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
  for (const n of ['lahetaVahvistuslinkkiItselle', 'lahetaHuoltajienVahvistuslinkit']) { const i = src.indexOf('exports.' + n); assert.ok(i > 0, n); const l = src.slice(i, i + 350); assert.match(l, /region\('europe-west1'\)/); assert.match(l, /enforceAppCheck: true/); assert.match(l, /SENDGRID_API_KEY/); }
  assert.match(src.slice(src.indexOf('exports.lahetaHuoltajienVahvistuslinkit'), src.indexOf('exports.lahetaHuoltajienVahvistuslinkit') + 700), /onSuperAdminUid/);
});
