'use strict';
/** Huoltajakutsu (functions/huoltajakutsu.js): kelpoisuus (7 pv · 1. kirjautumiseen/salasanan asetukseen asti · 10 avausta), tuore linkki joka avauksella, uusi linkki aina huoltajaEmailiin, rajat, tietosuoja. */
const { test } = require('node:test');
const assert = require('node:assert');
const H = require('../huoltajakutsu');
const { pohjaHuoltajakutsu, pohjaSuostumusLinkki } = require('../sahkoposti_pohjat');
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const NYT = Date.UTC(2026, 9, 12, 12, 0), PV = 86400000;
function luo(o) {
  o = o || {};
  const store = new Map(); const pelaaja = Object.assign({ etunimi: 'Aleksi', sukunimi: 'X', huoltajaEmail: 'Aiti@Esimerkki.fi' }, o.pelaaja || {});
  const sijainti = (polku) => polku.join('/');
  const col = (polku) => ({ doc: (id) => doc(polku.concat([id])) });
  const doc = (polku) => ({
    get: async () => { const k = sijainti(polku); if (polku[0] === 'seurat') return { exists: o.eiPelaajaa ? false : true, data: () => pelaaja }; return { exists: store.has(k), data: () => store.get(k) }; },
    set: async (d) => { store.set(sijainti(polku), JSON.parse(JSON.stringify(d))); }, update: async (d) => { store.set(sijainti(polku), Object.assign({}, store.get(sijainti(polku)), d)); },
    collection: (c) => col(polku.concat([c])),
  });
  const db = { collection: (c) => col([c]), runTransaction: async (f) => f({ get: async (r) => r.get(), update: (r, d) => { r.update(d); } }) };
  const user = Object.assign({ uid: 'u1', email: 'aiti@esimerkki.fi', metadata: { creationTime: new Date(NYT - 3 * PV).toUTCString(), lastSignInTime: null }, tokensValidAfterTime: new Date(NYT - 3 * PV).toUTCString() }, o.user || {});
  const linkit = []; let luotuAuth = 0;
  const auth = { getUserByEmail: async () => { if (o.eiTilia) throw Object.assign(new Error('nf'), { errorInfo: { code: 'auth/user-not-found' } }); return user; }, generatePasswordResetLink: async (e, s) => { linkit.push([e, s]); return 'https://talentmaster.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=C' + linkit.length; } };
  const posti = [];
  const deps = { db, auth, HttpsError, haeOrLuoHuoltajaAuth: async () => { luotuAuth++; return user; }, lahetaSahkoposti: async (m) => { posti.push(m); }, pohja: pohjaHuoltajakutsu, base: 'https://tm', jatkoUrl: 'https://tm/V.html', seuranKieli: async () => 'sv', nyt: () => deps._nyt };
  deps._nyt = NYT;
  return { deps, store, user, linkit, posti, pelaaja, aika: (ms) => { deps._nyt = ms; }, luotuAuth: () => luotuAuth };
}
const avaa = (e, token) => H.luoAvaa(e.deps)({ token });
const uusi = (e, token) => H.luoPyydaUusi(e.deps)({ token });
const kutsu = (e) => H.luoKutsu(e.deps, { seuraId: 'kpv', pelaajaId: 'p1' });

test('luoKutsu: tallentaa VAIN tiivisteen (ei tokenia, ei sähköpostia/nimiä); token 43 merkkiä; voimassa 7 pv; varmistaa Auth-tilin', async () => {
  const e = luo(); const t = await kutsu(e);
  assert.ok(H.tokenKelpaa(t)); assert.strictEqual(e.luotuAuth(), 1);
  const avain = [...e.store.keys()][0]; assert.strictEqual(avain, 'huoltajakutsut/' + H.hash(t)); assert.ok(!avain.includes(t));
  const d = e.store.get(avain); assert.strictEqual(d.vanhenee - d.luotu, 7 * PV); assert.deepStrictEqual(Object.keys(d).sort(), ['avauksia', 'luotu', 'pelaajaId', 'seuraId', 'validSince0', 'vanhenee']);
  assert.ok(!JSON.stringify([...e.store.values()]).match(/@|Aleksi|X"/));
  await assert.rejects(H.luoKutsu(luo({ pelaaja: { huoltajaEmail: '' } }).deps, { seuraId: 'kpv', pelaajaId: 'p1' }), /huoltajaEmail/);
});
test('avaus: ok → TUORE salasanalinkki huoltajaEmailiin (jatkoUrl lapsi/seura), avauksia kasvaa, kieli mukana; ei palauta sähköpostia', async () => {
  const e = luo(); const t = await kutsu(e);
  const r = await avaa(e, t);
  assert.strictEqual(r.tila, 'ok'); assert.match(r.linkki, /^https:\/\//); assert.strictEqual(r.kieli, 'sv');
  assert.deepStrictEqual(e.linkit[0], ['aiti@esimerkki.fi', { url: 'https://tm/V.html?pelaajaId=p1&seuraId=kpv', handleCodeInApp: false }]);
  assert.strictEqual(e.store.get('huoltajakutsut/' + H.hash(t)).avauksia, 1); assert.ok(!JSON.stringify(r).includes('@'));
});
test('pysyy voimassa 7 pv ensimmäiseen kirjautumiseen asti: avaus 1 h, 3 pv, 6 pv myöhemmin → ok (jokainen luo tuoreen linkin); 10 avausta → raja', async () => {
  const e = luo(); const t = await kutsu(e);
  for (const ms of [NYT + 3600000, NYT + 3 * PV, NYT + 6 * PV]) { e.aika(ms); assert.strictEqual((await avaa(e, t)).tila, 'ok'); }
  assert.strictEqual(e.linkit.length, 3); assert.notStrictEqual(e.linkit[0], e.linkit[1]);
  e.aika(NYT + 6 * PV); for (let i = 3; i < 10; i++) assert.strictEqual((await avaa(e, t)).tila, 'ok');
  assert.strictEqual((await avaa(e, t)).tila, 'raja'); assert.strictEqual(e.linkit.length, 10);
});
test('vanhentunut 7 pv:n jälkeen; käytetty kun tilillä on 1. onnistunut kirjautuminen TAI salasana asetettu luonnin jälkeen; "ei kirjautumista" (lastSignInTime = luontihetki) ei sulje', async () => {
  const e = luo(); const t = await kutsu(e);
  e.aika(NYT + 7 * PV + 1000); assert.strictEqual((await avaa(e, t)).tila, 'vanhentunut'); assert.strictEqual(e.linkit.length, 0);
  e.aika(NYT + PV); e.user.metadata.lastSignInTime = e.user.metadata.creationTime; assert.strictEqual((await avaa(e, t)).tila, 'ok');   // Admin SDK: ei kirjautumista ≈ luontihetki
  e.user.metadata.lastSignInTime = new Date(NYT + PV - 1000).toUTCString(); assert.strictEqual((await avaa(e, t)).tila, 'kaytetty');
  const e2 = luo(); const t2 = await kutsu(e2); e2.user.tokensValidAfterTime = new Date(NYT + 1000).toUTCString(); assert.strictEqual((await avaa(e2, t2)).tila, 'kaytetty');   // salasana asetettu
});
test('tuntematon / virheellinen token → ei_loydy (ei virhettä, ei vuotoa); puuttuva pelaaja/huoltajaEmail → ei_loydy; tilin puuttuessa se luodaan uudelleen', async () => {
  const e = luo(); await kutsu(e);
  for (const t of [undefined, null, '', 'x', 'a'.repeat(43), 123]) assert.strictEqual((await avaa(e, t)).tila, 'ei_loydy');
  const t = await kutsu(e); e.pelaaja.huoltajaEmail = ''; assert.strictEqual((await avaa(e, t)).tila, 'ei_loydy');
  const e3 = luo({ eiTilia: true }); const t3 = await kutsu(e3); assert.strictEqual((await avaa(e3, t3)).tila, 'ok'); assert.strictEqual(e3.luotuAuth(), 2);
});
test('huoltajaEmailin korjaus näkyy heti: linkki menee UUTEEN osoitteeseen (kutsuun ei tallennettu osoitetta)', async () => {
  const e = luo(); const t = await kutsu(e); e.pelaaja.huoltajaEmail = 'Uusi@Esimerkki.fi';
  await avaa(e, t); assert.strictEqual(e.linkit[0][0], 'uusi@esimerkki.fi');
});
test('uusi linkki: lähtee aina huoltajaEmailiin (ei clientin antamaan), maskattu osoite vastauksessa; vanhentunutkin kutsu kelpaa pyyntöön', async () => {
  const e = luo(); const t = await kutsu(e); e.aika(NYT + 9 * PV);
  const r = await H.luoPyydaUusi(e.deps)({ token: t, email: 'hyokkaaja@x.fi', to: 'hyokkaaja@x.fi' });
  assert.deepStrictEqual(r, { tila: 'lahetetty', osoite: 'a***@esimerkki.fi' });
  assert.strictEqual(e.posti.length, 1); assert.strictEqual(e.posti[0].to, 'aiti@esimerkki.fi'); assert.match(e.posti[0].html, /Linkki on voimassa 7 p/);
  assert.match(e.posti[0].html, /https:\/\/tm\/TalentMaster_Huoltajakutsu\.html#k=[A-Za-z0-9_-]{43}/);
  assert.strictEqual([...e.store.keys()].filter((k) => k.startsWith('huoltajakutsut/')).length, 2);   // vanha + uusi
});
test('uuden linkin rajat: 5 min jäähy, enintään 3 / vrk / pelaaja, 24 h jälkeen taas; käytetty tunnus → kaytetty (ei sähköpostia); tuntematon token → ei_loydy', async () => {
  const e = luo(); const t = await kutsu(e);
  assert.strictEqual((await uusi(e, t)).tila, 'lahetetty'); assert.strictEqual((await uusi(e, t)).tila, 'odota');
  e.aika(NYT + 6 * 60000); assert.strictEqual((await uusi(e, t)).tila, 'lahetetty');
  e.aika(NYT + 12 * 60000); assert.strictEqual((await uusi(e, t)).tila, 'lahetetty');
  e.aika(NYT + 20 * 60000); assert.strictEqual((await uusi(e, t)).tila, 'raja'); assert.strictEqual(e.posti.length, 3);
  e.aika(NYT + 25 * 3600000); assert.strictEqual((await uusi(e, t)).tila, 'lahetetty');
  const e2 = luo(); const t2 = await kutsu(e2); e2.user.metadata.lastSignInTime = new Date(NYT + 1000).toUTCString();
  assert.strictEqual((await uusi(e2, t2)).tila, 'kaytetty'); assert.strictEqual(e2.posti.length, 0);
  assert.strictEqual((await uusi(e, 'a'.repeat(43))).tila, 'ei_loydy');
});
test('päättely: kutsunTila-rajat täsmälleen (vanhenee-hetki ok, +1 ms vanhentunut; 9 avausta ok, 10 raja)', () => {
  const d = { vanhenee: 1000, avauksia: 9, validSince0: null };
  assert.strictEqual(H.kutsunTila(d, null, 1000), 'ok'); assert.strictEqual(H.kutsunTila(d, null, 1001), 'vanhentunut'); assert.strictEqual(H.kutsunTila(Object.assign({}, d, { avauksia: 10 }), null, 5), 'raja'); assert.strictEqual(H.kutsunTila(null, null, 5), 'ei_loydy');
  assert.strictEqual(H.maskaa('a@x.fi'), 'a***@x.fi'); assert.strictEqual(H.maskaa('ei'), '');
});
test('pohjat: kutsulinkki esc():n kautta; suostumusviesti sanoo 7 pv kun kutsu, 1 h kun varalinkki', () => {
  assert.ok(!pohjaHuoltajakutsu({ kutsuLinkki: 'https://x/#k="><script>' }).includes('<script>'));
  assert.match(pohjaSuostumusLinkki({ resetLinkki: 'https://x', kutsu: true }), /7 p/); assert.match(pohjaSuostumusLinkki({ resetLinkki: 'https://x', kutsu: false }), /1 tunnin/);
});
test('index.js: callablet europe-west1 + enforceAppCheck; vahvistaSuostumus ja lahetaPelaajaSivuLinkki käyttävät huoltajaSalasanaLinkki-apuria (ei suoraa generatePasswordResetLinkiä niissä)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
  for (const n of ['avaaHuoltajakutsu', 'pyydaUusiHuoltajakutsu']) { const i = src.indexOf('exports.' + n); assert.ok(i > 0, n); const l = src.slice(i, i + 260); assert.match(l, /region\('europe-west1'\)/); assert.match(l, /enforceAppCheck: true/); }
  assert.match(src.slice(src.indexOf('exports.pyydaUusiHuoltajakutsu'), src.indexOf('exports.pyydaUusiHuoltajakutsu') + 300), /SENDGRID_API_KEY/);
  const lohko = (n) => { const a = src.indexOf('exports.' + n); const b = src.indexOf('\nexports.', a + 10); return src.slice(a, b < 0 ? undefined : b); };
  for (const n of ['vahvistaSuostumus', 'lahetaPelaajaSivuLinkki']) { const l = lohko(n); assert.ok(l.includes('huoltajaSalasanaLinkki('), n); assert.ok(!l.includes('auth.generatePasswordResetLink('), n); }
});
