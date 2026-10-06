/**
 * Korjaus-PR 2 (VP-periaate 5.10.2026): tarkistaOikeus tunnistaa VP:n myös custom claimeista (rooli + seuraId), kun seura.vp_uid on tyhjä/osoittaa muualle JA kayttajat-dokumenttia ei ole.
 * Aito functions/index.js:n tarkistaOikeus puretaan lähteestä ja ajetaan vm:ssä Firestore-tynkää vasten; pure päätös functions/authz_paatos.js. Seura 'kpv', VP = KPV:n VP-tunnus.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = require('../functions/authz_paatos.js');
const SRC = readFileSync(join(juuri, 'functions/index.js'), 'utf8');
function pura(t) {
  const i = SRC.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const VP = 'vp-kpv-001', SEURA = 'kpv';
function aja({ vpUid = null, kayttaja, admin = null, token, uid = VP, seuraId = SEURA } = {}) {
  const docs = { ['admins/' + uid]: admin, ['seurat/' + SEURA]: { vp_uid: vpUid }, ['seurat/' + SEURA + '/kayttajat/' + uid]: kayttaja };
  const ref = (p) => ({ get: async () => ({ exists: docs[p] != null, data: () => docs[p] }) });
  const db = { collection: (c) => ({ doc: (id) => Object.assign(ref(c + '/' + id), { collection: (c2) => ({ doc: (id2) => ref(c + '/' + id + '/' + c2 + '/' + id2) }) }) }) };
  const ctx = { db, kayttajaRooliSallittu: P.kayttajaRooliSallittu, kayttajaRooliClaimeista: P.kayttajaRooliClaimeista };
  vm.createContext(ctx);
  vm.runInContext(pura('async function tarkistaOikeus(') + '\nthis.f = tarkistaOikeus;', ctx);
  return ctx.f(uid, seuraId, token);
}
const CL = (o) => Object.assign({ rooli: 'vp', seuraId: SEURA }, o);

describe('pure: kayttajaRooliClaimeista', () => {
  it('claimit riittävät kun dokumenttia ei ole: vp / urheilutoimenjohtaja / seurasihteeri omassa seurassa', () => {
    ['vp', 'urheilutoimenjohtaja', 'seurasihteeri'].forEach((r) => expect(P.kayttajaRooliClaimeista(CL({ rooli: r }), SEURA, null), r).toBe(r));
  });
  it('EI oikeutta: ei tokenia, toinen seura, valmentaja-/pelaaja-/testivastaava-claimi, anonyymi, seuraId puuttuu, tuntematon rooli', () => {
    expect(P.kayttajaRooliClaimeista(null, SEURA, null)).toBeNull(); expect(P.kayttajaRooliClaimeista(undefined, SEURA, null)).toBeNull();
    expect(P.kayttajaRooliClaimeista(CL({ seuraId: 'sjk' }), SEURA, null)).toBeNull(); expect(P.kayttajaRooliClaimeista(CL({ seuraId: undefined }), SEURA, null)).toBeNull();
    ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja', 'fysioterapeutti', 'testivastaava', 'pelaaja', 'solo_lapsi', 'super_admin', 'admin', '', undefined].forEach((r) => expect(P.kayttajaRooliClaimeista(CL({ rooli: r }), SEURA, null), String(r)).toBeNull());
    expect(P.kayttajaRooliClaimeista(CL({ firebase: { sign_in_provider: 'anonymous' } }), SEURA, null)).toBeNull(); expect(P.kayttajaRooliClaimeista(CL(), '', null)).toBeNull();
  });
  it('dokumentti on TOTUUS kun se on olemassa: deaktivoitu → ei; alennettu rooli (claimi vanhentunut) → ei; rooli täsmää → kyllä', () => {
    expect(P.kayttajaRooliClaimeista(CL(), SEURA, { rooli: 'vp', aktiivinen: false })).toBeNull();
    expect(P.kayttajaRooliClaimeista(CL(), SEURA, { rooli: 'valmentaja' })).toBeNull(); expect(P.kayttajaRooliClaimeista(CL(), SEURA, { rooli: 'urheilutoimenjohtaja' })).toBeNull();
    expect(P.kayttajaRooliClaimeista(CL(), SEURA, { rooli: 'vp' })).toBe('vp'); expect(P.kayttajaRooliClaimeista(CL(), SEURA, { rooli: 'vp', aktiivinen: true })).toBe('vp');
  });
});

describe('tarkistaOikeus (aito funktio lähteestä) — VP:n oikeudet eivät katoa', () => {
  it('olemassa olevat polut ennallaan: SA; seura.vp_uid; kayttajat-dokumentin rooli (2. VP); ilman tokenia (vanha kutsu 2 argumentilla)', async () => {
    expect(await aja({ admin: { superAdmin: true } })).toEqual({ sallittu: true, rooli: 'superadmin' });
    expect(await aja({ vpUid: VP })).toEqual({ sallittu: true, rooli: 'vp' });
    expect(await aja({ vpUid: 'toinen-vp', kayttaja: { rooli: 'vp' } })).toEqual({ sallittu: true, rooli: 'vp' });
    expect(await aja({ kayttaja: { rooli: 'urheilutoimenjohtaja' } })).toEqual({ sallittu: true, rooli: 'urheilutoimenjohtaja' });
    expect(await aja({})).toEqual({ sallittu: false, rooli: null });   // ei vp_uid, ei dokkia, ei tokenia → ei oikeutta (ennallaan)
  });
  it('UUSI: vp_uid TYHJÄ + dokumenttia ei ole + claimit {vp, kpv} → VP (esim. kesken jäänyt luoKayttaja)', async () => {
    expect(await aja({ vpUid: null, token: CL() })).toEqual({ sallittu: true, rooli: 'vp' });
  });
  it('UUSI: vp_uid osoittaa MUUALLE (toiseen uid:hen) + dokumenttia ei ole + claimit → VP', async () => {
    expect(await aja({ vpUid: 'joku-muu', token: CL() })).toEqual({ sallittu: true, rooli: 'vp' });
  });
  it('UUSI: deaktivoinnin jälkeen (vapautaVpUid tyhjensi vp_uid:n) VP, jolla on claimit, säilyttää oikeudet; deaktivoitu itse EI', async () => {
    expect(await aja({ vpUid: null, token: CL() })).toEqual({ sallittu: true, rooli: 'vp' });   // toisen VP:n deaktivointi tyhjensi vp_uid:n
    expect(await aja({ vpUid: null, kayttaja: { rooli: 'vp', aktiivinen: false }, token: CL() })).toEqual({ sallittu: false, rooli: null });   // deaktivoitu → ei vaikka claimi on vielä tokenissa
  });
  it('turva: alennettu rooli (dokissa valmentaja, claimi vielä vp) → EI; toisen seuran claimi → EI; valmentaja-claimi → EI; anonyymi → EI', async () => {
    expect(await aja({ kayttaja: { rooli: 'valmentaja' }, token: CL() })).toEqual({ sallittu: false, rooli: null });
    expect(await aja({ token: CL({ seuraId: 'sjk' }) })).toEqual({ sallittu: false, rooli: null });
    expect(await aja({ token: CL({ rooli: 'valmentaja' }) })).toEqual({ sallittu: false, rooli: null });
    expect(await aja({ token: CL({ firebase: { sign_in_provider: 'anonymous' } }) })).toEqual({ sallittu: false, rooli: null });
  });
  it('SA-polku ja vp_uid-polku voittavat claimit (järjestys: SA → vp_uid → dokumentti → claimit)', async () => {
    expect(await aja({ admin: { rooli: 'super_admin' }, token: CL({ rooli: 'seurasihteeri' }) })).toEqual({ sallittu: true, rooli: 'superadmin' });
    expect(await aja({ vpUid: VP, token: CL({ rooli: 'seurasihteeri' }) })).toEqual({ sallittu: true, rooli: 'vp' });
  });
});

describe('lähdevartijat: kaikki kutsupaikat välittävät tokenin', () => {
  it('jokainen tarkistaOikeus(...)-kutsu index.js:ssä ja pinOikeus (pelaajapin.js) antaa 3. argumentin (token); määrittely ottaa tokenin', () => {
    expect(SRC).toMatch(/async function tarkistaOikeus\(kutsujaUid, kohdeSeuraId, token\)/);
    const kutsut = [...SRC.matchAll(/(?<![\w.])tarkistaOikeus\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)].map((m) => m[1]).filter((a) => !/^kutsujaUid, kohdeSeuraId, token$/.test(a));
    expect(kutsut.length).toBeGreaterThan(10); kutsut.forEach((a) => expect(a, a).toMatch(/context\.auth(\.token| && context\.auth\.token)$/));
    expect(readFileSync(join(juuri, 'functions/pelaajapin.js'), 'utf8')).toMatch(/tarkistaOikeus\(context\.auth\.uid, seuraId, context\.auth\.token\)/);
  });
});
