/**
 * P0 (1.10.2026) · Deaktivointi ei estänyt pääsyä. Callablet deaktivioiKayttaja / aktivoiKayttaja /
 * poistaKayttaja / vaihdaKayttajanRooli AJETAAN functions/index.js:n rungoista vm:ssä muistinvaraista
 * Firestorea ja Auth-tynkää vasten (oikea tarkistaOikeus + kayttajaRooliSallittu). Rules: tests/rules (v3.31).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const { kayttajaRooliSallittu, kayttajaRooliClaimeista } = require_(join(ROOT, 'functions', 'authz_paatos.js'));
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const ADMIN = readFileSync(join(ROOT, 'TalentMaster_Admin.html'), 'utf8');
const SEURA = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');

class HttpsError extends Error { constructor(c, m) { super(m); this.code = c; } }
const valilta = (alku, loppu) => { const i = CF.indexOf(alku); const j = CF.indexOf(loppu, i); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku); return CF.slice(i, j); };
const runko = (nimi) => { const i = CF.indexOf('exports.' + nimi + ' = functions'); if (i < 0) throw new Error(nimi); return CF.slice(i, CF.indexOf('\n  });', i) + 6); };

function ymparisto(alku, authUsers) {
  const f = fakeDb(alku);
  const users = new Map(Object.entries(authUsers || {}).map(([k, v]) => [k, Object.assign({ disabled: false, claims: { rooli: 'valmentaja', seuraId: 'kpv' }, revoked: 0 }, v)]));
  const eiLoydy = () => Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
  const auth = {
    updateUser: async (uid, u) => { if (!users.has(uid)) throw eiLoydy(); Object.assign(users.get(uid), u); },
    setCustomUserClaims: async (uid, c) => { if (!users.has(uid)) throw eiLoydy(); users.get(uid).claims = c; },
    revokeRefreshTokens: async (uid) => { if (!users.has(uid)) throw eiLoydy(); users.get(uid).revoked++; },
    deleteUser: async (uid) => { if (!users.has(uid)) throw eiLoydy(); users.delete(uid); },
  };
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, auth, kayttajaRooliSallittu, kayttajaRooliClaimeista, console: { log() {}, warn() {}, error() {} }, String, Object, Array,
    admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
  };
  vm.createContext(ctx);
  vm.runInContext(valilta('async function tarkistaOikeus(', '// ─────────────────────────────────────────────────────────────────────────────\n// APUFUNKTIOT: henkilökunnan')
    + valilta('async function onSuperAdminUid(', '// ─────────────────────────────────────────────────────────────────────────────\n// APUFUNKTIO: Hae tai luo')
    + valilta('const SALLITUT_ROOLIT_VAIHTO', 'exports.vaihdaKayttajanRooli') + '\n'
    + ['deaktivioiKayttaja', 'aktivoiKayttaja', 'poistaKayttaja', 'vaihdaKayttajanRooli'].map(runko).join('\n'), ctx);
  const audit = () => [...f.D.entries()].filter(([k]) => k.startsWith('audit/')).map(([, v]) => v);
  return { f, users, ex: ctx.exports, audit };
}
const DATA = () => ({
  'admins/sa-1': { superAdmin: true },
  'seurat/kpv': { nimi: 'KPV' },
  'seurat/kpv/kayttajat/vp-1': { rooli: 'vp', seuraId: 'kpv', aktiivinen: true },
  'seurat/kpv/kayttajat/valm-1': { rooli: 'valmentaja', seuraId: 'kpv', aktiivinen: true },
  'seurat/kpv/kayttajat/sa-1': { rooli: 'vp', seuraId: 'kpv', aktiivinen: true },
  'seurat/kpv/kayttajat/valm-2': { rooli: 'valmentaja', seuraId: 'kpv', aktiivinen: true },
  'seurat/sjk': { nimi: 'SJK' },
  'seurat/sjk/kayttajat/vp-sjk': { rooli: 'vp', seuraId: 'sjk', aktiivinen: true },
  'seurat/sjk/kayttajat/valm-sjk': { rooli: 'valmentaja', seuraId: 'sjk', aktiivinen: true },
});
const AUTH = () => ({ 'valm-1': {}, 'valm-2': {}, 'sa-1': { claims: { rooli: 'super_admin' } }, 'vp-1': { claims: { rooli: 'vp', seuraId: 'kpv' } }, 'valm-sjk': { claims: { rooli: 'valmentaja', seuraId: 'sjk' } } });
const ctxUid = (uid) => ({ auth: { uid, token: {} } });

describe('deaktivioiKayttaja (ajettu)', () => {
  it('johto deaktivoi: Auth disabled, claimit tyhjät, tokenit mitätöity, dokumentti aktiivinen:false, audit', async () => {
    const t = ymparisto(DATA(), AUTH());
    await t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-1', seuraId: 'kpv' }, ctxUid('vp-1'));
    const u = t.users.get('valm-1');
    expect(u.disabled).toBe(true);
    expect(u.claims).toEqual({});
    expect(u.revoked).toBe(1);
    expect(t.f.D.get('seurat/kpv/kayttajat/valm-1')).toMatchObject({ aktiivinen: false, deaktivoija_uid: 'vp-1', claimsAsetettu: false });
    expect(t.audit()).toEqual([expect.objectContaining({ toiminto: 'kayttaja_deaktivoitu', kohde_uid: 'valm-1', seuraId: 'kpv', tekija_uid: 'vp-1', auth_olemassa: true })]);
  });
  it('deaktivoitu johto ei enää saa oikeuksia (tarkistaOikeus lukee aktiivinen-kentän)', async () => {
    const t = ymparisto(DATA(), AUTH());
    await t.ex.deaktivioiKayttaja({ kohdeUid: 'vp-1', seuraId: 'kpv' }, ctxUid('sa-1'));
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-2', seuraId: 'kpv' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('deaktivoitu VP vapautetaan seuran vp_uid:stä (tarkistaOikeus ei muuten tarkista aktiivinen-kenttää); aktivointi palauttaa tyhjään', async () => {
    const d = DATA(); d['seurat/kpv'] = { nimi: 'KPV', vp_uid: 'vp-1' };
    const t = ymparisto(d, AUTH());
    await t.ex.deaktivioiKayttaja({ kohdeUid: 'vp-1', seuraId: 'kpv' }, ctxUid('sa-1'));
    expect(t.f.D.get('seurat/kpv').vp_uid).toBe(null);
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-2', seuraId: 'kpv' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await t.ex.aktivoiKayttaja({ kohdeUid: 'vp-1', seuraId: 'kpv' }, ctxUid('sa-1'));
    expect(t.f.D.get('seurat/kpv').vp_uid).toBe('vp-1');
  });
  it('johto EI deaktivoi SA:ta, itseään eikä toisen seuran käyttäjää; valmentaja ei deaktivoi ketään', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'sa-1', seuraId: 'kpv' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'vp-1', seuraId: 'kpv' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-sjk', seuraId: 'sjk' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-sjk', seuraId: 'kpv' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'not-found' });
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-2', seuraId: 'kpv' }, ctxUid('valm-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.users.get('valm-sjk').disabled).toBe(false);
    expect(t.users.get('sa-1').disabled).toBe(false);
    expect(t.audit()).toEqual([]);
  });
  it('ilman kirjautumista → unauthenticated', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-1', seuraId: 'kpv' }, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });
  it('Auth-tiliä ei ole → dokumentti silti deaktivoidaan (auth_olemassa:false)', async () => {
    const t = ymparisto(DATA(), {});
    await t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-1', seuraId: 'kpv' }, ctxUid('sa-1'));
    expect(t.f.D.get('seurat/kpv/kayttajat/valm-1').aktiivinen).toBe(false);
    expect(t.audit()[0]).toMatchObject({ auth_olemassa: false });
  });
});

describe('aktivoiKayttaja (ajettu)', () => {
  it('palauttaa Auth-tilin ja claimit Firestoren roolista ja seurasta; audit kayttaja_aktivoitu', async () => {
    const t = ymparisto(DATA(), AUTH());
    await t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-1', seuraId: 'kpv' }, ctxUid('vp-1'));
    await t.ex.aktivoiKayttaja({ kohdeUid: 'valm-1', seuraId: 'kpv' }, ctxUid('vp-1'));
    const u = t.users.get('valm-1');
    expect(u.disabled).toBe(false);
    expect(u.claims).toEqual({ rooli: 'valmentaja', seuraId: 'kpv' });
    expect(t.f.D.get('seurat/kpv/kayttajat/valm-1')).toMatchObject({ aktiivinen: true, claimsAsetettu: true, aktivoija_uid: 'vp-1' });
    expect(t.audit().map((a) => a.toiminto)).toEqual(['kayttaja_deaktivoitu', 'kayttaja_aktivoitu']);
  });
  it('johto ei aktivoi toisen seuran käyttäjää', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.aktivoiKayttaja({ kohdeUid: 'valm-sjk', seuraId: 'sjk' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('poistaKayttaja (ajettu)', () => {
  it('vain SA: pääsy pois → Auth-tili poistettu → dokumentti poistettu → audit kayttaja_poistettu', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.poistaKayttaja({ kohdeUid: 'valm-1', seuraId: 'kpv' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    expect(t.users.has('valm-1')).toBe(true);
    await t.ex.poistaKayttaja({ kohdeUid: 'valm-1', seuraId: 'kpv' }, ctxUid('sa-1'));
    expect(t.users.has('valm-1')).toBe(false);
    expect(t.f.D.has('seurat/kpv/kayttajat/valm-1')).toBe(false);
    expect(t.audit()).toEqual([expect.objectContaining({ toiminto: 'kayttaja_poistettu', severity: 'warn', kohde_uid: 'valm-1' })]);
  });
});

describe('vaihdaKayttajanRooli (ajettu) — P0-lisäykset', () => {
  it('audit rooli_vaihdettu (vanha + uusi rooli), claimit päivittyvät', async () => {
    const t = ymparisto(DATA(), AUTH());
    await t.ex.vaihdaKayttajanRooli({ uid: 'valm-1', seuraId: 'kpv', uusiRooli: 'fysiikkavalmentaja' }, ctxUid('sa-1'));
    expect(t.users.get('valm-1').claims).toEqual({ rooli: 'fysiikkavalmentaja', seuraId: 'kpv' });
    expect(t.audit()).toEqual([expect.objectContaining({ toiminto: 'rooli_vaihdettu', vanha_rooli: 'valmentaja', uusi_rooli: 'fysiikkavalmentaja', kohde_uid: 'valm-1' })]);
  });
  it('johto ei vaihda omaa eikä SA:n roolia; deaktivoidulle ei palauteta claimeja roolinvaihdolla', async () => {
    const t = ymparisto(DATA(), AUTH());
    await expect(t.ex.vaihdaKayttajanRooli({ uid: 'vp-1', seuraId: 'kpv', uusiRooli: 'valmentaja' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(t.ex.vaihdaKayttajanRooli({ uid: 'sa-1', seuraId: 'kpv', uusiRooli: 'valmentaja' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'permission-denied' });
    await t.ex.deaktivioiKayttaja({ kohdeUid: 'valm-2', seuraId: 'kpv' }, ctxUid('vp-1'));
    await expect(t.ex.vaihdaKayttajanRooli({ uid: 'valm-2', seuraId: 'kpv', uusiRooli: 'vp' }, ctxUid('vp-1'))).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(t.users.get('valm-2').claims).toEqual({});
  });
});

describe('vartijat: selain ei kirjoita pääsykenttiä (Admin + Seura)', () => {
  it('Admin ja Seura eivät kirjoita kayttajat-dokumentin aktiivinen-/rooli-kenttää eivätkä poista sitä selaimesta', () => {
    for (const S of [ADMIN, SEURA]) {
      for (const m of S.matchAll(/collection\('kayttajat'\)\s*\.doc\([^)]*\)\s*\.(update|set|delete)\(([\s\S]{0,300}?)\)/g)) {
        expect(m[1], m[0].slice(0, 120)).not.toBe('delete');
        expect(m[2], m[0].slice(0, 160)).not.toMatch(/\baktiivinen\s*:\s*false|\brooli\s*:/);
      }
    }
  });
  it('Admin ja Seura käyttävät callableja', () => {
    expect(ADMIN).toMatch(/_kayttajaFn\('deaktivioiKayttaja'\)/);
    expect(ADMIN).toMatch(/_kayttajaFn\('aktivoiKayttaja'\)/);
    expect(ADMIN).toMatch(/_kayttajaFn\('poistaKayttaja'\)/);
    expect(ADMIN).toMatch(/httpsCallable\('vaihdaKayttajanRooli'\)/);
    expect(SEURA).toMatch(/httpsCallable\('deaktivioiKayttaja'\)/);
    expect(SEURA).toMatch(/httpsCallable\('aktivoiKayttaja'\)/);
    expect(ADMIN).not.toMatch(/Cloud Function reagoi tähän ja poistaa Claims/);
  });
});
