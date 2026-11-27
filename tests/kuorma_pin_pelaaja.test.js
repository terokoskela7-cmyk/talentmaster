// Projekti 06 PR 3b — pelaajan PalloID + PIN -kirjautuminen mittauksiin: generaattorin --pin-pelaaja/--vain-pinit + tunnusrivi + SAMA kirjautumisfunktio (functions/pelaajakirjautuminen.js) vasten.
// Ei Firestorea/Authia: muistinvarainen Firestore-vale, johon generaattorin data ajetaan ja jota vasten oikea käsittelijä (luoKasittelija) kirjautuu.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync, statSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
const require = createRequire(import.meta.url);
const A = require('../scripts/kuorma/aineisto.js');
const G = require('../scripts/kuorma/generoi_aineisto.js');
const M = require('../scripts/kuorma/mittaus_lib.js');
const K = require('../functions/pelaajakirjautuminen.js');
const IKA = require('../functions/tm_pelaaja_ika.js');

class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const PIENI = Object.assign({}, A.PROFIILIT.savu, { nimi: 'pieni_pin', seurat: [{ koko: 40 }, { koko: 40 }] });
const TMP = mkdtempSync(join(tmpdir(), 'kuorma-pin-'));

/* Muistinvarainen Firestore: polku → data. Riittää generaattorille (doc/get/set/update/batch) ja kirjautumiskäsittelijälle (collection().doc(), collectionGroup().where().limit().get(), runTransaction). */
function valeDb() {
  const kanta = new Map();
  const ref = (polku) => ({
    path: polku, id: polku.split('/').pop(),
    get: async () => ({ exists: kanta.has(polku), data: () => kanta.get(polku) }),
    set: async (d, o) => { kanta.set(polku, o && o.merge ? Object.assign({}, kanta.get(polku), d) : d); },
    update: async (d) => { if (!kanta.has(polku)) throw new Error('NOT_FOUND'); kanta.set(polku, Object.assign({}, kanta.get(polku), d)); },
    delete: async () => { kanta.delete(polku); },
    collection: (n) => kokoelma(polku + '/' + n),
  });
  const kokoelma = (polku) => ({ doc: (id) => ref(polku + '/' + id), listDocuments: async () => [...kanta.keys()].filter((k) => k.startsWith(polku + '/') && k.split('/').length === polku.split('/').length + 1).map(ref) });
  const db = {
    kanta, doc: ref, collection: kokoelma,
    batch: () => { const t = []; return { set: (r, d) => t.push(() => r.set(d)), update: (r, d) => t.push(() => r.update(d)), commit: async () => { for (const f of t) await f(); } }; },
    runTransaction: async (fn) => { const t = []; const r = await fn({ get: (x) => x.get(), set: (x, d) => t.push(() => x.set(d)) }); for (const f of t) await f(); return r; },
    collectionGroup: (nimi) => ({ where: (kentta, _o, arvo) => ({ limit: () => ({ get: async () => ({ docs: [...kanta].filter(([p, d]) => p.split('/').slice(-2)[0] === nimi && d[kentta] === arvo).map(([p, d]) => { const o = p.split('/'); return { id: o[o.length - 1], data: () => d, ref: { parent: { parent: { id: o[o.length - 3], parent: { id: o[o.length - 4] } } } } }; }) }) }) }) }),
  };
  return db;
}
function ladata(db, profiili) { for (const d of A.generoi(profiili, 1)) if (/^seurat\/[^/]+$/.test(d.polku) || /^seurat\/[^/]+\/pelaajat\/[^/]+$/.test(d.polku)) db.kanta.set(d.polku, d.data); }
const kirjaaja = (db) => K.luoKasittelija({ db, auth: { createCustomToken: async (uid, claims) => JSON.stringify({ uid, claims }) }, HttpsError, FieldValue: { increment: () => ({}) }, audit: async () => {} });
const ctx = { rawRequest: { ip: '10.0.0.1' } };

describe('pinPelaajat (aineisto)', () => {
  it('yksi pelaaja per seura, ikä ≥ 10 (kirjautuminen sallittu), palloId normalisoitu = sama kuin kirjautumisfunktion normalisoiTunnus antaa', () => {
    const lista = A.pinPelaajat(PIENI); expect(lista.map((x) => x.sid)).toEqual(['kuorma_seura_01', 'kuorma_seura_02']);
    const docit = new Map([...A.generoi(PIENI, 1)].map((d) => [d.polku, d.data]));
    lista.forEach((h) => {
      expect(K.normalisoiTunnus(h.palloId)).toBe(h.palloId); expect(h.palloId).not.toContain('-');
      const p = docit.get('seurat/' + h.sid + '/pelaajat/' + h.pid); expect(p, h.pid).toBeTruthy();
      expect(IKA.tmPelaajaAppTila(p, A.KAUSI), 'ikä ≥ 10').toBe('ok');
    });
    expect(A.pinPelaajat(PIENI)).toEqual(lista);   // deterministinen
  });
});

describe('luoPelaajaPinit + oikea pelaajaKirjaudu', () => {
  it('generoitu PalloID + PIN kirjautuu (custom token, claim pelaajaSeuraId, ei seuraId); väärä PIN hylätään; PIN vain tiedostossa (0600), ei hajautuksessa/selvänä dokumentissa', async () => {
    const db = valeDb(); ladata(db, PIENI); const f = join(TMP, 'a', 't.txt');
    const t = await G.luoPelaajaPinit(db, A.pinPelaajat(PIENI), f); expect(t).toEqual({ luotu: 2, olemassa: 0, puuttuu: 0 });
    expect((statSync(f).mode & 0o777).toString(8)).toBe('600');
    const teksti = readFileSync(f, 'utf8'), m = M.lueTunnukset(teksti), tunn = M.haeTunnus(m, 'pelaaja', 1), palloId = M.haePalloId(teksti, 1);
    expect(tunn.salasana).toMatch(/^[0-9]{6}$/); expect(palloId).toBe('SYNT0100003'); expect(M.haePalloId(teksti, 3)).toBeNull();
    const kirjaudu = kirjaaja(db), r = await kirjaudu({ liittoTunnus: palloId, pin: tunn.salasana }, ctx);
    expect(JSON.parse(r.token)).toEqual({ uid: 'pel_kuorma_seura_01_kuorma_s01_p00003', claims: { rooli: 'pelaaja', pelaajaSeuraId: 'kuorma_seura_01', pelaajaId: 'kuorma_s01_p00003' } });
    const e = await kirjaudu({ liittoTunnus: palloId, pin: tunn.salasana === '123456' ? '654321' : '123456' }, ctx).catch((x) => x); expect(e.code).toBe('unauthenticated');
    expect(JSON.stringify([...db.kanta.entries()])).not.toContain(tunn.salasana + '"');   // PIN ei selvänä missään dokumentissa (vain scrypt-hajautus)
    const pin2 = M.haeTunnus(m, 'pelaaja', 2); expect(pin2.salasana).not.toBe(tunn.salasana);
    expect(M.piilota('x ' + tunn.salasana, m)).toBe('x ***');   // piilota() peittää PIN:in tulosteesta
  });
  it('toinen ajo ei luo uutta PIN:iä (rivi säilyy); puuttuva pelaaja / ei-synteettinen dokumentti → puuttuu, tiedostoa ei kosketa', async () => {
    const db = valeDb(); ladata(db, PIENI); const f = join(TMP, 'b', 't.txt'), lista = A.pinPelaajat(PIENI);
    await G.luoPelaajaPinit(db, lista, f); const ennen = readFileSync(f, 'utf8');
    expect(await G.luoPelaajaPinit(db, lista, f)).toEqual({ luotu: 0, olemassa: 2, puuttuu: 0 }); expect(readFileSync(f, 'utf8')).toBe(ennen);
    const db2 = valeDb(); ladata(db2, PIENI); db2.kanta.delete('seurat/kuorma_seura_01/pelaajat/kuorma_s01_p00003'); db2.kanta.get('seurat/kuorma_seura_02/pelaajat/kuorma_s02_p00003').synteettinen = false;
    const f2 = join(TMP, 'c', 't.txt'); expect(await G.luoPelaajaPinit(db2, lista, f2)).toEqual({ luotu: 0, olemassa: 0, puuttuu: 2 }); expect(() => statSync(f2)).toThrow();
    expect([...db2.kanta.keys()].some((k) => k.startsWith('_pelaajaPin/'))).toBe(false);
  });
  it('ei-synteettinen seura listassa → heittää (ei kirjoita mitään)', async () => {
    const db = valeDb(); await expect(G.luoPelaajaPinit(db, [{ si: 0, sid: 'kpv', pid: 'x', palloId: 'X1' }], join(TMP, 'd', 't.txt'))).rejects.toThrow(/Ei-synteettinen/);
  });
  it('olemassa oleva henkilökunnan tunnusrivi säilyy, kun pelaajarivi lisätään (ja päinvastoin: luoTilit ei pudota pelaajariviä)', async () => {
    const db = valeDb(); ladata(db, PIENI); const f = join(TMP, 'e', 't.txt'), fs = require('fs'); fs.mkdirSync(join(TMP, 'e'), { recursive: true });
    fs.writeFileSync(f, '# x\nvp.s01@kuorma.test\tVP-Salasana-1\tvp\tkuorma_seura_01\n');
    await G.luoPelaajaPinit(db, A.pinPelaajat(PIENI), f); const m = M.lueTunnukset(readFileSync(f, 'utf8'));
    expect(m.get('vp.s01@kuorma.test')).toBe('VP-Salasana-1'); expect(m.has('pelaaja.s01@kuorma.test')).toBe(true);
    const auth = { getUser: async () => ({}), createUser: async () => ({}), setCustomUserClaims: async () => {} };
    await G.luoTilit(auth, [{ uid: 'kuorma_s01_vp', email: 'vp.s01@kuorma.test', etunimi: 'a', sukunimi: 'b', rooli: 'vp', seuraId: 'kuorma_seura_01' }, { uid: 'kuorma_s01_valmentaja1', email: 'valmentaja1.s01@kuorma.test', etunimi: 'a', sukunimi: 'b', rooli: 'valmentaja', seuraId: 'kuorma_seura_01' }], f);
    expect(readFileSync(f, 'utf8')).toContain('pelaaja.s01@kuorma.test\t');
  });
});

describe('CLI --pin-pelaaja / --vain-pinit / --tyhjenna', () => {
  const yhteys = (db, auth) => ({ luoDb: async (projekti) => ({ db, auth: auth || { listUsers: async () => ({ users: [], pageToken: undefined }), deleteUsers: async () => {} }, projekti, bulkWriter: () => ({ set: (r, d) => { db.kanta.set(r.polku, d); return Promise.resolve(); }, delete: (r) => { db.kanta.delete(r.path); return Promise.resolve(); }, onWriteError: () => {}, close: async () => {} }) }) });
  const aja = async (argv, y) => { const ulos = []; const koodi = await G.main(argv, { luoDb: y.luoDb, kirjaa: (r) => ulos.push(r), virhe: (r) => ulos.push('VIRHE ' + r), env: {}, adc: undefined }); return { koodi, ulos: ulos.join('\n') }; };
  const db0 = () => { const db = valeDb(); db.doc = ((orig) => (p) => Object.assign(orig(p), { polku: p }))(db.doc); return db; };
  it('--vain-pinit: kuiva-ajo ei kirjoita; --aja luo PIN:n ilman että PIN/PalloID tulostuu; --tyhjenna-yhdistelmä hylätään', async () => {
    const db = db0(); ladata(db, A.PROFIILIT.savu); const f = join(TMP, 'f', 't.txt'), y = yhteys(db), pelaajaA = 'seurat/kuorma_seura_01/pelaajat/kuorma_s01_p00003';
    const k = await aja(['--projekti=talentmaster-staging', '--vain-pinit', '--tunnukset=' + f], y); expect(k.koodi).toBe(0); expect(k.ulos).toMatch(/pin-pelaajat\s+2/); expect(() => statSync(f)).toThrow(); expect(db.kanta.get(pelaajaA).suostumusTila).toBeUndefined();
    const r = await aja(['--projekti=talentmaster-staging', '--vain-pinit', '--aja', '--tunnukset=' + f], y); expect(r.koodi).toBe(0); expect(r.ulos).toContain('PIN-pelaajat: luotu 2, jo olemassa 0');
    const tunn = M.haeTunnus(M.lueTunnukset(readFileSync(f, 'utf8')), 'pelaaja', 1); expect(r.ulos).not.toContain(tunn.salasana); expect(r.ulos).not.toMatch(/SYNT/); expect(db.kanta.get(pelaajaA).suostumusTila).toBe('annettu');
    expect((await aja(['--projekti=talentmaster-staging', '--vain-pinit', '--tyhjenna'], y)).koodi).toBe(2);
    const e = await aja(['--projekti=talentmaster-staging', '--vain-pinit', '--aja', '--tunnukset=' + join(TMP, 'g', 't.txt')], yhteys(db0())); expect(e.koodi).toBe(1); expect(e.ulos).toMatch(/EI löytynyt 2/);   // tyhjä Firestore → ei luo tynkiä
  });
  it('lukko: pilotti-projekti → exit 1 ennen mitään (myös --vain-pinit --aja)', async () => {
    const r = await aja(['--projekti=talentmaster-pilot', '--vain-pinit', '--aja'], { luoDb: () => { throw new Error('ei saa avata'); } }); expect(r.koodi).toBe(1); expect(r.ulos).toContain('LUKKO');
  });
  it('--tyhjenna: poistaa myös _pelaajaPin/kuorma_… ja pel_kuorma_… -Auth-tilit; muut säilyvät', async () => {
    const db = db0(); db.kanta.set('_pelaajaPin/kuorma_seura_01_kuorma_s01_p00003', { hash: 'x' }); db.kanta.set('_pelaajaPin/kpv_m93', { hash: 'y' });
    const poistetut = []; const auth = { listUsers: async () => ({ users: [{ uid: 'pel_kuorma_seura_01_kuorma_s01_p00003' }, { uid: 'pel_kpv_m93' }, { uid: 'tero' }], pageToken: undefined }), deleteUsers: async (ids) => poistetut.push(...ids) };
    const y = yhteys(db, auth); y.luoDb = ((o) => async (p) => { const x = await o(p); x.db.collection = (n) => ({ get: async () => ({ docs: [] }), listDocuments: async () => [...db.kanta.keys()].filter((k) => k.startsWith(n + '/')).map((k) => ({ id: k.split('/')[1], path: k })) }); return x; })(y.luoDb);
    const kuiva = await aja(['--projekti=talentmaster-staging', '--tyhjenna'], y); expect(kuiva.ulos).toContain('PIN-hajautuksia (_pelaajaPin/kuorma_…): 1'); expect(kuiva.ulos).toContain('pelaajien Auth-tilejä (pel_kuorma_…): 1'); expect(poistetut).toEqual([]);
    const r = await aja(['--projekti=talentmaster-staging', '--tyhjenna', '--aja'], y); expect(r.koodi).toBe(0); expect(poistetut).toEqual(['pel_kuorma_seura_01_kuorma_s01_p00003']); expect([...db.kanta.keys()]).toEqual(['_pelaajaPin/kpv_m93']);
  });
});
