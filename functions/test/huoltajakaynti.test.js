'use strict';
/** S1.1 — kirjaaHuoltajaKaynti (functions/huoltajakaynti.js): oikea huoltaja kirjataan kerran päivässä; muu ei; ei sisältöä. */
const { test } = require('node:test');
const assert = require('node:assert');
const H = require('../huoltajakaynti');
const K = require('../pelaajakirjautuminen');
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const NYT = Date.UTC(2026, 9, 12, 8, 0);
function luoDb(pelaajat) {
  const paivitykset = [];
  return { paivitykset, collection: () => ({ doc: (sid) => ({ collection: () => ({ doc: (pid) => ({
    get: async () => { const p = pelaajat[sid + '/' + pid]; return { exists: !!p, data: () => p }; },
    update: async (d) => { paivitykset.push({ sid, pid, d }); Object.assign(pelaajat[sid + '/' + pid], d); },
  }) }) }) }) };
}
const kutsu = (db, data, email) => H.luoKasittelija({ db, HttpsError, nyt: () => NYT })(data, email === undefined ? { auth: { token: { email: 'Aiti@Esimerkki.fi', email_verified: true } } } : (email ? { auth: { token: { email, email_verified: true } } } : { auth: { token: {} } }));
const P = () => ({ 'kpv/m93': { etunimi: 'Aleksi', huoltajaEmail: 'aiti@esimerkki.fi' } });

test('oikea huoltaja (email täsmää, kirjainkoko ei merkitse): kirjataan Helsingin päivä; vain tämä kenttä', async () => {
  const db = luoDb(P()); const r = await kutsu(db, { seuraId: 'kpv', pelaajaId: 'm93' });
  assert.deepStrictEqual(r, { kirjattu: true });
  assert.deepStrictEqual(db.paivitykset, [{ sid: 'kpv', pid: 'm93', d: { huoltajaViimeisinKaynti: K.helsinginPaiva(NYT) } }]);
});
test('kerran päivässä: toinen kutsu samana päivänä ei kirjoita', async () => {
  const db = luoDb(P()); await kutsu(db, { seuraId: 'kpv', pelaajaId: 'm93' });
  const r2 = await kutsu(db, { seuraId: 'kpv', pelaajaId: 'm93' });
  assert.deepStrictEqual(r2, { kirjattu: false, syy: 'jo_tanaan' }); assert.strictEqual(db.paivitykset.length, 1);
});
test('väärä huoltaja → permission-denied, ei kirjoitusta; puuttuva huoltajaEmail → myös evätty', async () => {
  const db = luoDb(P());
  await assert.rejects(kutsu(db, { seuraId: 'kpv', pelaajaId: 'm93' }, 'toinen@esimerkki.fi'), (e) => e.code === 'permission-denied');
  const db2 = luoDb({ 'kpv/m93': { etunimi: 'A' } });
  await assert.rejects(kutsu(db2, { seuraId: 'kpv', pelaajaId: 'm93' }), (e) => e.code === 'permission-denied');
  assert.deepStrictEqual(db.paivitykset.concat(db2.paivitykset), []);
});
test('B4: vahvistamaton sähköposti (email_verified != true) → ei huoltajakäyntiä, ei virhettä, ei kirjoitusta', async () => {
  const db = luoDb(P());
  for (const tok of [{ email: 'aiti@esimerkki.fi' }, { email: 'aiti@esimerkki.fi', email_verified: false }]) {
    assert.deepStrictEqual(await H.luoKasittelija({ db, HttpsError, nyt: () => NYT })({ seuraId: 'kpv', pelaajaId: 'm93' }, { auth: { token: tok } }), { kirjattu: false, syy: 'ei_vahvistettu' });
  }
  assert.deepStrictEqual(db.paivitykset, []);
});
test('ei sähköpostia (anonyymi / linkki / kirjautumaton) → ei virhettä, ei kirjoitusta; virheellinen id → invalid-argument; pelaajaa ei löydy → ei kirjoitusta', async () => {
  const db = luoDb(P());
  assert.deepStrictEqual(await kutsu(db, { seuraId: 'kpv', pelaajaId: 'm93' }, ''), { kirjattu: false, syy: 'ei_sahkopostia' });
  assert.deepStrictEqual(await H.luoKasittelija({ db, HttpsError, nyt: () => NYT })({ seuraId: 'kpv', pelaajaId: 'm93' }, {}), { kirjattu: false, syy: 'ei_sahkopostia' });
  await assert.rejects(kutsu(db, { seuraId: 'a/b', pelaajaId: 'm93' }), (e) => e.code === 'invalid-argument');
  await assert.rejects(kutsu(db, { seuraId: 'kpv' }), (e) => e.code === 'invalid-argument');
  assert.deepStrictEqual(await kutsu(db, { seuraId: 'kpv', pelaajaId: 'ei_ole' }), { kirjattu: false, syy: 'ei_loydy' });
  assert.deepStrictEqual(db.paivitykset, []);
});
test('index.js: kirjaaHuoltajaKaynti rekisteröity europe-west1 + enforceAppCheck', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
  const i = src.indexOf('exports.kirjaaHuoltajaKaynti'); assert.ok(i > 0);
  const lohko = src.slice(i, i + 300);
  assert.match(lohko, /region\('europe-west1'\)/); assert.match(lohko, /enforceAppCheck: true/); assert.match(lohko, /huoltajakaynti\.luoKasittelija/);
});
