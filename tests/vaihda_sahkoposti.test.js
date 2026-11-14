/**
 * vaihdaKayttajanSahkoposti (ajettu vm:ssä muistinvaraista Firestorea + Auth-tynkää vasten; oikea tarkistaOikeus + tarkistaKayttajaToimenpide).
 * Oikeus: SA kaikille; VP oman seuran henkilökunnalle; ei toisen seuran, ei valmentaja, ei omaa/SA-tunnusta. Varattu osoite → ei muutosta. Rules v3.84: tests/rules/v384_sahkoposti.rules.test.js.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';
const require_ = createRequire(import.meta.url);
const { lueFunctionsLahde, runko: _fnRunko } = require_('../scripts/functions_lahde.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { kayttajaRooliSallittu, kayttajaRooliClaimeista } = require_(join(ROOT, 'functions', 'authz_paatos.js'));
const { onPaikkamerkkiOsoite } = require_(join(ROOT, 'functions', 'paikkamerkki.js'));
const CF = lueFunctionsLahde(ROOT);
class HttpsError extends Error { constructor(c, m) { super(m); this.code = c; } }
const valilta = (alku, loppu) => { const i = CF.indexOf(alku); const j = CF.indexOf(loppu, i); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku); return CF.slice(i, j); };

function ymparisto(alku, authUsers) {
  const f = fakeDb(alku);
  const users = new Map(Object.entries(authUsers).map(([k, v]) => [k, Object.assign({ uid: k, disabled: false, revoked: 0, claims: {} }, v)]));
  const eiLoydy = () => Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
  const auth = {
    getUser: async (uid) => { if (!users.has(uid)) throw eiLoydy(); return users.get(uid); },
    getUserByEmail: async (e) => { const u = [...users.values()].find((x) => x.email === e); if (!u) throw eiLoydy(); return u; },
    updateUser: async (uid, u) => {
      if (!users.has(uid)) throw eiLoydy();
      if (u.email && [...users.values()].some((x) => x.email === u.email && x.uid !== uid)) throw Object.assign(new Error('dup'), { code: 'auth/email-already-exists' });
      Object.assign(users.get(uid), u);
    },
    revokeRefreshTokens: async (uid) => { users.get(uid).revoked++; },
  };
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, require: (p) => require_(join(ROOT, 'functions', p)), db: f.db, auth, kayttajaRooliSallittu, kayttajaRooliClaimeista, console: { log() {}, warn() {}, error() {} }, String, Object, Array, RegExp,
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    estaPaikkamerkkiOsoite: (e) => { if (onPaikkamerkkiOsoite(e)) throw new HttpsError('failed-precondition', 'paikkamerkki_osoite'); },
  };
  vm.createContext(ctx);
  vm.runInContext(valilta('async function tarkistaOikeus(', '// ─────────────────────────────────────────────────────────────────────────────\n// APUFUNKTIOT: henkilökunnan')
    + valilta('async function onSuperAdminUid(', '// ─────────────────────────────────────────────────────────────────────────────\n// APUFUNKTIO: Hae tai luo')
    + valilta('const _authEiLoydy', 'exports.luoKayttaja = (async')
    + "const sahkopostinVaihto = require('./sahkopostin_vaihto');\n" + valilta('const SALLITUT_ROOLIT_VAIHTO', 'exports.vaihdaKayttajanRooli') + '\n'
    + _fnRunko(CF, 'vaihdaKayttajanSahkoposti'), ctx);
  const audit = () => [...f.D.entries()].filter(([k]) => k.startsWith('audit/')).map(([, v]) => v);
  return { f, users, ex: ctx.exports, audit };
}
const DATA = () => ({
  'admins/sa-1': { superAdmin: true },
  'seurat/kpv': { nimi: 'KPV' },
  'seurat/kpv/kayttajat/vp-1': { rooli: 'vp', seuraId: 'kpv', aktiivinen: true, email: 'vp@kpv.fi' },
  'seurat/kpv/kayttajat/valm-1': { rooli: 'valmentaja', seuraId: 'kpv', aktiivinen: true, email: 'vanha@kpv.fi' },
  'seurat/kpv/kayttajat/valm-2': { rooli: 'valmentaja', seuraId: 'kpv', aktiivinen: true, email: 'toinen@kpv.fi' },
  'seurat/sjk': { nimi: 'SJK' },
  'seurat/sjk/kayttajat/vp-sjk': { rooli: 'vp', seuraId: 'sjk', aktiivinen: true, email: 'vp@sjk.fi' },
  'seurat/sjk/kayttajat/valm-sjk': { rooli: 'valmentaja', seuraId: 'sjk', aktiivinen: true, email: 'valm@sjk.fi' },
});
const AUTH = () => ({
  'sa-1': { email: 'sa@tm.fi', claims: { rooli: 'super_admin' } }, 'vp-1': { email: 'vp@kpv.fi', claims: { rooli: 'vp', seuraId: 'kpv' } },
  'valm-1': { email: 'vanha@kpv.fi', claims: { rooli: 'valmentaja', seuraId: 'kpv' } }, 'valm-2': { email: 'toinen@kpv.fi', claims: { rooli: 'valmentaja', seuraId: 'kpv' } },
  'vp-sjk': { email: 'vp@sjk.fi', claims: { rooli: 'vp', seuraId: 'sjk' } }, 'valm-sjk': { email: 'valm@sjk.fi', claims: { rooli: 'valmentaja', seuraId: 'sjk' } },
});
const ctxUid = (uid) => ({ auth: { uid, token: {} } });
const PYYNTO = (o) => Object.assign({ kohdeUid: 'valm-1', seuraId: 'kpv', uusiEmail: 'uusi@kpv.fi' }, o);

describe('vaihdaKayttajanSahkoposti (ajettu)', () => {
  it('VP oman seuran henkilökunnalle: Auth email + kayttajat.email + tokenit mitätöity + audit (vanha → uusi, tekijä); UID ja claimit säilyvät', async () => {
    const t = ymparisto(DATA(), AUTH());
    const r = await t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ uusiEmail: '  Uusi@KPV.fi ' }), ctxUid('vp-1'));
    expect(r).toMatchObject({ ok: true, vanhaEmail: 'vanha@kpv.fi', uusiEmail: 'uusi@kpv.fi' });
    const u = t.users.get('valm-1');
    expect(u).toMatchObject({ uid: 'valm-1', email: 'uusi@kpv.fi', emailVerified: false, revoked: 1, claims: { rooli: 'valmentaja', seuraId: 'kpv' } });
    expect(t.f.D.get('seurat/kpv/kayttajat/valm-1')).toMatchObject({ email: 'uusi@kpv.fi', rooli: 'valmentaja', seuraId: 'kpv', aktiivinen: true });
    expect(t.audit()).toEqual([expect.objectContaining({ toiminto: 'sahkoposti_vaihdettu', kohde_uid: 'valm-1', seuraId: 'kpv', vanha_email: 'vanha@kpv.fi', uusi_email: 'uusi@kpv.fi', tekija_uid: 'vp-1' })]);
  });
  it('SA voi vaihtaa kenen tahansa seuran henkilökunnan osoitteen', async () => {
    const t = ymparisto(DATA(), AUTH());
    await t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'valm-sjk', seuraId: 'sjk', uusiEmail: 'uusi@sjk.fi' }), ctxUid('sa-1'));
    expect(t.users.get('valm-sjk').email).toBe('uusi@sjk.fi'); expect(t.f.D.get('seurat/sjk/kayttajat/valm-sjk').email).toBe('uusi@sjk.fi');
  });
  it('VP toisen seuran henkilökunnalle estetty (ei muutosta, ei auditia)', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'valm-sjk', seuraId: 'sjk', uusiEmail: 'uusi@sjk.fi' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'valm-sjk', seuraId: 'kpv' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'not-found' });
    expect(t.users.get('valm-sjk').email).toBe('valm@sjk.fi'); expect(t.f.D.get('seurat/sjk/kayttajat/valm-sjk').email).toBe('valm@sjk.fi'); expect(t.audit()).toEqual([]);
  });
  it('valmentaja estetty (ei omaa, ei toisen)', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'valm-2' }), ctxUid('valm-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'valm-1' }), ctxUid('valm-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.users.get('valm-1').email).toBe('vanha@kpv.fi'); expect(t.audit()).toEqual([]);
  });
  it('varattu osoite (toisella käyttäjällä Authissa) → already-exists, ei muutosta', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ uusiEmail: 'toinen@kpv.fi' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'already-exists' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ uusiEmail: 'valm@sjk.fi' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'already-exists' });   // toisen seuran tili
    expect(t.users.get('valm-1')).toMatchObject({ email: 'vanha@kpv.fi', revoked: 0 }); expect(t.f.D.get('seurat/kpv/kayttajat/valm-1').email).toBe('vanha@kpv.fi'); expect(t.audit()).toEqual([]);
  });
  it('validointi: muoto, paikkamerkki, sama kuin nykyinen; VP ei vaihda omaa eikä SA:n osoitetta', async () => {
    const t = ymparisto(DATA(), AUTH());
    for (const huono of ['', 'ei-sahkoposti', 'a@b', 'a b@kpv.fi', null, 42]) await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ uusiEmail: huono }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ uusiEmail: 'x@example.com' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ uusiEmail: 'VANHA@kpv.fi' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'vp-1' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'sa-1' }), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO(), {})).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(t.audit()).toEqual([]);
  });
  it('Google-kirjautuja (providerData google.com) → failed-precondition, EI muutosta (ei Auth-, Firestore-muutosta, ei tokenien mitätöintiä, ei auditia); salasanatili menee läpi', async () => {
    const a = AUTH(); a['valm-1'].providerData = [{ providerId: 'google.com', uid: 'g-1', email: 'vanha@kpv.fi' }];
    const t = ymparisto(DATA(), a);
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO(), ctxUid('vp-1'))).rejects.toMatchObject({ code: 'failed-precondition', message: 'Google-tunnuksella kirjautuvan osoitetta ei voi vaihtaa.' });
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO(), ctxUid('sa-1'))).rejects.toMatchObject({ code: 'failed-precondition' });   // SA:llakaan ei
    expect(t.users.get('valm-1')).toMatchObject({ email: 'vanha@kpv.fi', revoked: 0 }); expect(t.users.get('valm-1').emailVerified).toBeUndefined();
    expect(t.f.D.get('seurat/kpv/kayttajat/valm-1').email).toBe('vanha@kpv.fi'); expect(t.audit()).toEqual([]);
    const b = AUTH(); b['valm-1'].providerData = [{ providerId: 'password', uid: 'vanha@kpv.fi' }];
    const t2 = ymparisto(DATA(), b);
    await expect(t2.ex.vaihdaKayttajanSahkoposti(PYYNTO(), ctxUid('vp-1'))).resolves.toMatchObject({ ok: true });
  });
  it('ei-henkilöstörooli (esim. pelaaja/huoltaja-rooli kayttajat-dokumentissa) estetty', async () => {
    const d = DATA(); d['seurat/kpv/kayttajat/huolt-1'] = { rooli: 'huoltaja', seuraId: 'kpv', aktiivinen: true, email: 'h@kpv.fi' };
    const t = ymparisto(d, Object.assign(AUTH(), { 'huolt-1': { email: 'h@kpv.fi' } }));
    await expect(t.ex.vaihdaKayttajanSahkoposti(PYYNTO({ kohdeUid: 'huolt-1' }), ctxUid('sa-1'))).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(t.users.get('huolt-1').email).toBe('h@kpv.fi');
  });
});

describe('Seura.html · Muokkaa henkilön tietoja (lähdetarkistus)', () => {
  const src = readFileSync(join(ROOT, 'seura', 'seura_hallinta.js'), 'utf8');
  const fn = src.slice(src.indexOf('async function tallennaHenkiloMuutos'), src.indexOf('P0 (1.10.2026): deaktivointi'));
  it('sähköpostikenttä muokattava (ei omaa tunnusta), vahvistus ennen kirjoituksia, callable ensin, salasanalinkki uuteen osoitteeseen lopuksi', () => {
    expect(src).toMatch(/id="hm_email"/); expect(src).not.toMatch(/Sähköposti \(ei muokattavissa\)/);
    expect(fn.indexOf('confirm(')).toBeGreaterThan(-1);
    expect(fn.indexOf('confirm(')).toBeLessThan(fn.indexOf("httpsCallable('vaihdaKayttajanSahkoposti')"));
    expect(fn.indexOf("httpsCallable('vaihdaKayttajanSahkoposti')")).toBeLessThan(fn.indexOf("collection('kayttajat')"));
    expect(fn).toMatch(/_lahetaSalasanaReset\(uid, emailUusi,/);
    expect(src).toContain("tmHT('Google-tunnuksella kirjautuvan osoitetta ei voi vaihtaa.')");   // selite lomakkeella
    expect(fn).not.toMatch(/\.set\(\{[^}]*email:/);   // email ei mene selaimen set-kirjoitukseen
  });
});
