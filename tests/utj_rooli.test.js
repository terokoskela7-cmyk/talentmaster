/**
 * UTJ-rooli (1.10.2026): henkilöstön claim on 'urheilutoimenjohtaja', mutta UTJ-sivu hyväksyi vain 'utj' ja luki
 * seuran claimista 'seura' (oikea: seuraId) → oikea UTJ kirjattiin ulos ("Ei UTJ-oikeuksia"). Ajettu vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const UTJ = readFileSync(join(ROOT, 'TalentMaster_UTJ_v1.html'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');

async function kirjaudu(claims, { admin = false, uid = 'u1' } = {}) {
  const i = UTJ.indexOf('const db=firebase.firestore()');
  const j = UTJ.indexOf('\nfunction show(', i);
  let kasittelija = null;
  const tapahtumat = [];
  const doc = (polku) => ({ get: async () => ({ exists: polku === 'admins/' + uid ? admin : true, data: () => ({ nimi: 'KPV' }) }), collection: (k) => coll(polku + '/' + k) });
  const coll = (polku) => ({ doc: (id) => doc(polku + '/' + id), limit: () => ({ get: async () => ({ empty: false, docs: [{ id: 'kpv', data: () => ({ nimi: 'KPV' }) }] }) }) });
  const db = { collection: (k) => coll(k), collectionGroup: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }) };
  const el = () => ({ textContent: '', style: {} });
  const ctx = {
    firebase: { firestore: () => db, auth: () => ({ onAuthStateChanged: (f) => { kasittelija = f; }, signOut: () => tapahtumat.push('ulos') }) },
    document: { getElementById: el }, Date,
    toast: (m) => tapahtumat.push('toast:' + m), show: (v) => tapahtumat.push('show:' + v), alusta: () => tapahtumat.push('alusta'),
    tmMerkitseKirjautuminen: (d, sid) => tapahtumat.push('kirjaus:' + sid),
  };
  vm.createContext(ctx);
  vm.runInContext(UTJ.slice(i, j) + '\nthis._sidLue = () => _sid;', ctx);
  await kasittelija({ uid, getIdTokenResult: async () => ({ claims }) });
  return { tapahtumat, sid: ctx._sidLue() };
}

describe('UTJ-sivu · rooli ja seura claimeista (ajettu)', () => {
  it('urheilutoimenjohtaja + seuraId → sisään oman seuran näkymään', async () => {
    const r = await kirjaudu({ rooli: 'urheilutoimenjohtaja', seuraId: 'kpv' });
    expect(r.tapahtumat).not.toContain('ulos');
    expect(r.tapahtumat).toContain('show:a');
    expect(r.sid).toBe('kpv');
  });
  it('vanha utj-claim (setup_seurat.js) hyväksytään yhä; legacy seura-claim varalla', async () => {
    const r = await kirjaudu({ rooli: 'utj', seura: 'sjk' });
    expect(r.tapahtumat).toContain('show:a');
    expect(r.sid).toBe('sjk');
  });
  it('muu rooli → ulos', async () => {
    const r = await kirjaudu({ rooli: 'valmentaja', seuraId: 'kpv' });
    expect(r.tapahtumat).toContain('ulos');
    expect(r.tapahtumat).not.toContain('show:a');
  });
});

describe('utj-epäjohdonmukaisuus muualla', () => {
  it('Rules eivät anna oikeuksia utj-claimille (roolilistat käyttävät urheilutoimenjohtaja-nimeä)', () => {
    const koodi = RULES.split('\n').filter((r) => !r.trim().startsWith('//')).join('\n');
    expect(koodi).not.toMatch(/'utj'/);
    expect(koodi).toMatch(/'vp', 'urheilutoimenjohtaja', 'seurasihteeri'/);
  });
});
