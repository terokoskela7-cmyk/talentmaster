/**
 * Haamuvalmentaja (1.10.2026): SA:n uid:lle syntyi seuran kayttajat-dokumentti, joka näkyi VP:n
 * Valmentajatiimissä "Nimetön"-valmentajana. Juurisyy: ennen #540:tä (18.9.) Master/VP:n ilmoitusasetukset
 * ja harjoitusarvioinnin pikakentät kirjoittivat kayttajat/{uid}:hin set(merge):llä, joka LUO puuttuvan
 * dokumentin — kun SA käytti Masteria/VP:tä seuran kontekstissa, hänelle syntyi nimetön dokumentti.
 * Nyt: luoKayttaja hylkää SA-tunnuksen, luonti vain palvelimella (Rules v3.32), deaktivoidut ja haamut
 * eivät näy listoissa eivätkä lukuihin.
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
const lue = (n) => readFileSync(join(ROOT, n), 'utf8');
const CF = lue('functions/index.js');
class HttpsError extends Error { constructor(c, m, d) { super(m); this.code = c; this.details = d; } }
const valilta = (alku, loppu) => { const i = CF.indexOf(alku); const j = CF.indexOf(loppu, i); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku); return CF.slice(i, j); };
const runko = (nimi) => { const i = CF.indexOf('exports.' + nimi + ' = functions'); return CF.slice(i, CF.indexOf('\n  });', i) + 6); };

function luoKayttaja(alku, authUsers) {
  const f = fakeDb(alku);
  const users = new Map(Object.entries(authUsers || {}));
  const loki = { claims: [], luotu: [] };
  const auth = {
    getUserByEmail: async (email) => { for (const [uid, u] of users) if (u.email === email) return { uid }; throw Object.assign(new Error('nf'), { errorInfo: { code: 'auth/user-not-found' } }); },
    createUser: async (u) => { const uid = 'uusi-' + (loki.luotu.length + 1); users.set(uid, u); loki.luotu.push(uid); return { uid }; },
    setCustomUserClaims: async (uid, c) => { loki.claims.push([uid, c]); },
    generatePasswordResetLink: async () => 'https://reset',
    deleteUser: async () => {},
  };
  const ketju = { region() { return ketju; }, runWith() { return ketju; }, https: { onCall: (fn) => fn, HttpsError } };
  const ctx = {
    functions: ketju, exports: {}, db: f.db, auth, kayttajaRooliSallittu, console: { log() {}, warn() {}, error() {} },
    String, Object, Array, Math, JSON, admin: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } } },
    lahetaSahkoposti: async () => {}, pohjaSalasanaAsetus: () => '', TM_BASE_URL: 'https://tm',
  };
  vm.createContext(ctx);
  vm.runInContext(valilta('async function tarkistaOikeus(', '// ─────────────────────────────────────────────────────────────────────────────\n// APUFUNKTIOT: henkilökunnan')
    + valilta('async function onSuperAdminUid(', 'const _authEiLoydy') + '\n'
    + valilta('const SALLITUT_ROOLIT_VAIHTO', 'exports.vaihdaKayttajanRooli') + '\n' + runko('luoKayttaja'), ctx);
  return { f, loki, fn: ctx.exports.luoKayttaja };
}
const SA = { auth: { uid: 'sa-1', token: { email: 'sa@x.fi' } } };
const DATA = () => ({ 'admins/sa-1': { superAdmin: true }, 'seurat/kpv': { nimi: 'KPV' }, 'seurat/kpv/kayttajat/vp-1': { rooli: 'vp', seuraId: 'kpv', aktiivinen: true } });

describe('luoKayttaja (ajettu)', () => {
  it('SA-tunnuksen sähköposti → failed-precondition sa_tunnus; ei dokumenttia, ei claimeja', async () => {
    const t = luoKayttaja(DATA(), { 'sa-1': { email: 'talentmasterid@gmail.com' } });
    const e = await t.fn({ email: 'talentmasterid@gmail.com', rooli: 'valmentaja', seuraId: 'kpv' }, { auth: { uid: 'vp-1', token: {} } }).catch((x) => x);
    expect(e).toMatchObject({ code: 'failed-precondition', message: 'sa_tunnus' });
    expect(t.f.D.has('seurat/kpv/kayttajat/sa-1')).toBe(false);
    expect(t.loki.claims).toEqual([]);
  });
  it('tavallinen kutsu: palvelin kirjoittaa koko dokumentin (joukkueet[], joukkueNimet[], puhelin, kutsuja)', async () => {
    const t = luoKayttaja(DATA(), {});
    const r = await t.fn({ email: 'v@x.fi', etunimi: 'Ville', sukunimi: 'V', rooli: 'valmentaja', seuraId: 'kpv',
      joukkueet: ['kpv_u13', 'kpv_u14'], joukkueNimet: ['KPV U13', 'KPV U14'], suuntakoodi: '+358', puhelin: '040 123-4567' }, SA);
    const d = t.f.D.get('seurat/kpv/kayttajat/' + r.uid);
    expect(d).toMatchObject({ email: 'v@x.fi', rooli: 'valmentaja', seuraId: 'kpv', aktiivinen: true, joukkueet: ['kpv_u13', 'kpv_u14'],
      joukkueNimet: ['KPV U13', 'KPV U14'], joukkue: 'kpv_u13', joukkueNimi: 'KPV U13', puhelin: '0401234567', kutsuja: 'sa@x.fi', claimsAsetettu: true });
    expect(t.loki.claims).toEqual([[r.uid, { rooli: 'valmentaja', seuraId: 'kpv' }]]);
  });
});

describe('vartijat', () => {
  it('Seura-sivu ei enää luo kayttajat-dokumenttia selaimesta (luoKayttaja hoitaa)', () => {
    const S = lue('TalentMaster_Seura.html');
    expect(S).not.toMatch(/collection\('kayttajat'\)\.doc\(uid\)\.set\(\{\s*uid,/);
    expect(S).toMatch(/joukkueNimet: joukkueet\.map\(j => j\.nimi\)/);
  });
  it('yksikään sivukirjoitus ei käytä set(merge):ä kayttajat-dokkiin (#540-periaate pysyy)', () => {
    for (const f of ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html', 'lib/tm_harjoitusarviointi.js', 'lib/tm_aktiivisuus.js', 'lib/tm_reflektio.js']) {
      const s = lue(f);
      for (const m of s.matchAll(/collection\('kayttajat'\)\.doc\([^)]*\)\s*\.set\(([\s\S]{0,200}?)\)/g)) {
        expect(m[1], f).not.toMatch(/merge/);
      }
    }
  });
});

/* VP:n Valmentajatiimi ajettuna: deaktivoidut ja haamut eivät kuulu listaan */
describe('VP · lataaValmentajat (ajettu)', () => {
  it('deaktivoidut ja nimettömät roolittomat (haamu) pois _valmentajat-listasta; kaikki säilyvät nimihakua varten', async () => {
    const S = lue('TalentMaster_VP_v25.html');
    const pura = (t) => { const a = S.indexOf(t); let d = 0; for (let j = S.indexOf(') {', a) + 2; j < S.length; j++) { if (S[j] === '{') d++; else if (S[j] === '}') { d--; if (!d) return S.slice(a, j + 1); } } };
    const f = fakeDb({
      'seurat/kpv/kayttajat/a': { etunimi: 'Aktiivi', rooli: 'valmentaja', aktiivinen: true },
      'seurat/kpv/kayttajat/d': { etunimi: 'Deakt', rooli: 'valmentaja', aktiivinen: false },
      'seurat/kpv/kayttajat/haamu': { notif_asetukset: { email: { enabled: true } } },
      'seurat/kpv/kayttajat/e': { email: 'pelkka@x.fi', rooli: 'valmentaja' },
    });
    const ctx = { db: f.db, _seuraId: 'kpv', console: { warn() {}, error() {} }, String, Object, Array, Promise,
      lataaVAIArvot: async () => {}, _tmHenkiloNimi: (x) => [x.etunimi, x.sukunimi].filter(Boolean).join(' ') || x.email || 'Nimetön' };
    vm.createContext(ctx);
    vm.runInContext('var _valmentajat = [], _valmentajatKaikki = [];\n' + pura('function _vpOnHaamuprofiili(v) {') + '\n' + pura('async function lataaValmentajat() {')
      + '\nthis.aja = lataaValmentajat; this.hae = () => ({ v: _valmentajat, k: _valmentajatKaikki });', ctx);
    await ctx.aja();
    const r = ctx.hae();
    expect(r.v.map((x) => x.id).sort()).toEqual(['a', 'e']);
    expect(r.k.map((x) => x.id).sort()).toEqual(['a', 'd', 'e', 'haamu']);
  });
});
