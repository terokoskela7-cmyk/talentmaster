/**
 * HOTFIX 1.10.2026 · Oikeuksien korotus luoKayttajan kautta.
 * luoKayttaja asetti pyynnön roolin sellaisenaan claimeihin; Rules pitää claimia rooli:'super_admin'/'superadmin'
 * super-adminina → seuran johto pystyi tekemään kenestä tahansa (myös itsestään) super-adminin.
 * Nyt vain seuran henkilöstöroolit (SALLITUT_ROOLIT_VAIHTO); estetty yritys → audit alert. aktivoiKayttaja samoin.
 * backfill_claims antaa SA-claimit vain admins-kokoelmasta.
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
const { kayttajaRooliSallittu } = require_(join(ROOT, 'functions', 'authz_paatos.js'));
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
const valilta = (alku, loppu) => { const i = CF.indexOf(alku); const j = CF.indexOf(loppu, i); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku); return CF.slice(i, j); };
const runko = (nimi) => { const i = CF.indexOf('exports.' + nimi + ' = functions'); return CF.slice(i, CF.indexOf('\n  });', i) + 6); };

function ymp(alku, authUsers) {
  const f = fakeDb(alku);
  const users = new Map(Object.entries(authUsers || {}));
  const claims = [];
  const auth = {
    getUserByEmail: async (email) => { for (const [uid, u] of users) if (u.email === email) return { uid }; throw Object.assign(new Error('nf'), { errorInfo: { code: 'auth/user-not-found' } }); },
    createUser: async (u) => { const uid = 'uusi-' + users.size; users.set(uid, u); return { uid }; },
    setCustomUserClaims: async (uid, c) => { claims.push([uid, c]); },
    updateUser: async () => {}, revokeRefreshTokens: async () => {}, deleteUser: async () => {},
    generatePasswordResetLink: async () => 'https://reset',
  };
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, auth, kayttajaRooliSallittu, console: { log() {}, warn() {}, error() {} },
    String, Object, Array, Math, JSON, admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    lahetaSahkoposti: async () => {}, pohjaSalasanaAsetus: () => '', TM_BASE_URL: 'https://tm',
  };
  vm.createContext(ctx);
  vm.runInContext(valilta('async function tarkistaOikeus(', '// ─────────────────────────────────────────────────────────────────────────────\n// APUFUNKTIOT: henkilökunnan')
    + valilta('async function onSuperAdminUid(', '// ─────────────────────────────────────────────────────────────────────────────\n// APUFUNKTIO: Hae tai luo')
    + valilta('const SALLITUT_ROOLIT_VAIHTO', 'exports.vaihdaKayttajanRooli') + '\n' + runko('luoKayttaja') + '\n' + runko('aktivoiKayttaja'), ctx);
  const audit = () => [...f.D.entries()].filter(([k]) => k.startsWith('audit/')).map(([, v]) => v);
  return { f, claims, ex: ctx.exports, audit };
}
const DATA = () => ({ 'admins/sa-1': { superAdmin: true }, 'seurat/kpv': { nimi: 'KPV' },
  'seurat/kpv/kayttajat/vp-1': { rooli: 'vp', seuraId: 'kpv', aktiivinen: true, email: 'vp@x.fi' } });
const VP = { auth: { uid: 'vp-1', token: { email: 'vp@x.fi' } } };

describe('luoKayttaja · rooli vain seuran henkilöstörooleista (ajettu)', () => {
  it.each([['super_admin'], ['superadmin'], ['admin'], ['pelaaja'], ['solo_lapsi']])('rooli %s → invalid-argument, ei claimeja, ei dokumenttia, audit alert', async (rooli) => {
    const t = ymp(DATA(), { 'vp-1': { email: 'vp@x.fi' } });
    await expect(t.ex.luoKayttaja({ email: 'vp@x.fi', rooli, seuraId: 'kpv' }, VP)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(t.claims).toEqual([]);
    expect(t.f.D.get('seurat/kpv/kayttajat/vp-1').rooli).toBe('vp');
    expect(t.audit()).toEqual([expect.objectContaining({ toiminto: 'kayttaja_rooli_estetty', severity: 'alert', yritetty_rooli: rooli, tekija_uid: 'vp-1' })]);
  });
  it('sallittu rooli toimii edelleen', async () => {
    const t = ymp(DATA(), {});
    const r = await t.ex.luoKayttaja({ email: 'uusi@x.fi', rooli: 'valmentaja', seuraId: 'kpv' }, VP);
    expect(t.claims).toEqual([[r.uid, { rooli: 'valmentaja', seuraId: 'kpv' }]]);
  });
});

describe('aktivoiKayttaja · dokumentin super_admin-rooli ei palaudu claimeihin (ajettu)', () => {
  it('rooli super_admin seuradokumentissa → failed-precondition, ei claimeja', async () => {
    const d = DATA(); d['seurat/kpv/kayttajat/x-1'] = { rooli: 'super_admin', seuraId: 'kpv', aktiivinen: false };
    const t = ymp(d, { 'x-1': { email: 'x@x.fi' } });
    await expect(t.ex.aktivoiKayttaja({ kohdeUid: 'x-1', seuraId: 'kpv' }, { auth: { uid: 'sa-1', token: {} } })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(t.claims).toEqual([]);
  });
});

describe('tm_admin/backfill_claims.js', () => {
  const B = readFileSync(join(ROOT, 'tm_admin', 'backfill_claims.js'), 'utf8');
  const i = B.indexOf('function rakennaClaims(');
  const rakenna = new Function(B.slice(i, B.indexOf('\n}\n', i) + 3) + '; return rakennaClaims;')();
  it('SA-claimit vain admins-dokumentista; seuradokumentin super_admin-rooli → ei claimeja', () => {
    expect(rakenna({}, null, true)).toMatchObject({ superAdmin: true });
    expect(rakenna({ rooli: 'super_admin' }, 'kpv', false)).toBe(null);
    expect(rakenna({ rooli: 'superadmin' }, 'kpv', false)).toBe(null);
    expect(rakenna({ rooli: 'vp', superAdmin: true }, 'kpv', false)).toBe(null);
    expect(rakenna({ rooli: 'vp' }, 'kpv', false)).toMatchObject({ rooli: 'vp', seuraId: 'kpv' });
  });
  it('lippu kirjoitetaan update():lla (ei luo puuttuvaa) ja deaktivoidut ohitetaan', () => {
    expect(B).toContain('await ref.update(LIPPU());');
    expect(B).not.toMatch(/ref\.set\(LIPPU\(\), \{ merge: true \}\)/);
    expect(B).toMatch(/!onAdmin && data\.aktiivinen === false/);
  });
});
