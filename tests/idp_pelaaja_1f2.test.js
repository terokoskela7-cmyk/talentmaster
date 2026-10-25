/* Vaihe 1 / PR 1f-2 — henkilökunnan kirjoittajat ja lukijat + migraatio: idp_pelaaja/{vuosi} (lippu TM_IDP_PELAAJA_DOK.LIPPU.kirjoitus POIS oletuksena).
   Runtime-ajot: OIKEA sivukoodi (Master, VP) vm-hiekkalaatikossa + lib tmIdpKirjoitaKausi + muistinvarainen Firestore (tests/_fakeFirestore.mjs). Lippu pois = täsmälleen vanhat kirjoitukset;
   päällä = dual-write idp_kausi + idp_pelaaja samaan transaktioon/batchiin; Rules v3.71 puuttuu (permission-denied) = vanha polku. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const D = require('../lib/tm_idp_pelaaja_dok.js'), I = require('../lib/tm_idp.js'), L = require('../lib/tm_idp_lomake.js'), M = require('../scripts/migroi_idp_pelaaja.js');
afterEach(() => { D.LIPPU.kirjoitus = false; });

const SID = 's', PID = 'p1', PK = `seurat/${SID}/pelaajat/${PID}`, KAUSI = PK + '/idp_kausi/2026', IDPP = PK + '/idp_pelaaja/2026';
const NYT = new Date('2026-10-19T06:00:00.000Z');
const T = (o) => Object.assign({ status: 'aktiivinen', luotu: 'A', fokus: { alue: 'acceleration', dim: 'D1', nimi: 'Kiihdytys' }, mittari: { testId: 'sprint10', yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 2.1, pvm: '2026-06-05' }, tavoitearvo: 1.9,
  perustelu: { teksti: 'Kehityskohde (taso 2/5)', pelilause: 'Pelissä tarvitaan' }, kypsyysvaroitus: 'PHV', pelaajan_tavoite: 'Juoksen nopeammin', arviot: [{ pvm: '2026-09-01', arvo: 2.0, pelaajan_note: 'hyvä' }] }, o || {});
const luvut = (x) => { let n = 0; (function k(v) { if (typeof v === 'number') n++; else if (Array.isArray(v)) v.forEach(k); else if (v && typeof v === 'object') Object.values(v).forEach(k); })(x); return n; };
function viipale(src, a) { const i = src.indexOf(a); if (i < 0) throw new Error('viipaletta ei löytynyt: ' + a); return src.slice(i, src.indexOf('\n}\n', i) + 3); }
const permDenied = (db) => { const alku = db.runTransaction; db.runTransaction = async (fn) => { let kirj = false; const r = await alku((tx) => fn({ get: (x) => tx.get(x), set: (ref, d, o) => { if (/\/idp_pelaaja\//.test(ref._path)) kirj = true; tx.set(ref, d, o); } })); return r; }; return db; };

describe('lib/tm_idp_lomake tmIdpKirjoitaKausi (Kehitystyöpöytä + muut lomakekäyttäjät)', () => {
  it('lippu pois: vain idp_kausi + pelaajan pikakentät, ei idp_pelaaja:a', async () => {
    const { db, D: docs } = fakeDb({ [KAUSI]: { tavoitteet: [] } });
    await L.tmIdpKirjoitaKausi({ db, sid: SID, pid: PID, t: T(), ankkurit: {}, nyt: NYT });
    expect(docs.get(KAUSI).tavoitteet).toHaveLength(1); expect(docs.has(IDPP)).toBe(false);
  });
  it('lippu päällä: idp_pelaaja samaan transaktioon, puhdistettuna (ei lukuja); idp_kausi pysyy raakana; pelaaja_sitoumus säilyy', async () => {
    const { db, D: docs } = fakeDb({ [IDPP]: { pelaaja_sitoumus: { rekisteri: 'a', vahvistettu_pvm: null } } });
    await L.tmIdpKirjoitaKausi({ db, sid: SID, pid: PID, t: T(), ankkurit: {}, nyt: NYT, idpPelaajaDeps: { idpPelaajaKirjoitus: true } });
    expect(docs.get(KAUSI).tavoitteet[0].lahto).toEqual({ arvo: 2.1, pvm: '2026-06-05' });   // raaka A-data idp_kausi:ssa
    const p = docs.get(IDPP); expect(p.tavoitteet).toHaveLength(1); expect(luvut(p.tavoitteet)).toBe(0); expect(p.tavoitteet[0].fokus).toEqual({ nimi: 'Kiihdytys'}); expect(p.pelaaja_sitoumus).toEqual({ rekisteri: 'a', vahvistettu_pvm: null });
  });
  it('vuodenvaihde: vanha tavoite merkitään vaihdetuksi molemmissa dokumenteissa (2025 idp_kausi + idp_pelaaja)', async () => {
    const { db, D: docs } = fakeDb({ [PK + '/idp_kausi/2025']: { tavoitteet: [T({ luotu: 'E' })] } });
    await L.tmIdpKirjoitaKausi({ db, sid: SID, pid: PID, t: T({ luotu: 'N' }), ankkurit: { _idpVuosi: '2025', _idpVuosiLuotu: 'E' }, nyt: NYT, idpPelaajaDeps: { idpPelaajaKirjoitus: true } });
    expect(docs.get(PK + '/idp_kausi/2025').tavoitteet[0].status).toBe('vaihdettu'); expect(docs.get(PK + '/idp_pelaaja/2025').tavoitteet).toEqual([]);   // vaihdettu → ei näy pelaajalle
    expect(docs.get(IDPP).tavoitteet.map((x) => x.status)).toEqual(['aktiivinen']);
  });
  it('permission-denied idp_pelaaja:an (Rules v3.71 puuttuu) → uusi yritys: idp_kausi tallentuu ilman idp_pelaaja:a', async () => {
    const { db, D: docs } = fakeDb({}); const alku = db.runTransaction; let yritykset = 0;
    db.runTransaction = async (fn) => { yritykset++; const kirj = []; await fn({ get: (r) => r.get(), set: (r, d, o) => kirj.push([r, d, o]) }); if (kirj.some((k) => /\/idp_pelaaja\//.test(k[0]._path))) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; } return alku(async (tx) => fn(tx)); };
    await L.tmIdpKirjoitaKausi({ db, sid: SID, pid: PID, t: T(), ankkurit: {}, nyt: NYT, idpPelaajaDeps: { idpPelaajaKirjoitus: true } });
    expect(yritykset).toBe(2); expect(docs.get(KAUSI).tavoitteet).toHaveLength(1); expect(docs.has(IDPP)).toBe(false);
  });
});

describe('Master _mIdpTallennaDok + VP _vpTallennaIdpDok (OIKEA sivukoodi)', () => {
  const ympar = (db, extra) => {
    const c = Object.assign({ console, Promise, JSON, Object, Array, String, Date, Error, Math, _demo: false, _isDemoMode: false, _seuraId: SID, _db: db, db: db, firebase: { auth: () => ({ currentUser: { uid: 'u1', getIdToken: async () => 't' } }) },
      _mTuoreToken: async () => {}, toast() {}, masterT: (x) => x, vpT: (x) => x, _dvi: null, _vpIdpDvi: () => null, _vpKausitavoiteReRender() {}, TM_IDP_PELAAJA_DOK: D, TM_SISAINEN: undefined }, I, extra || {});
    c.window = c; return vm.createContext(c);
  };
  const MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
  const aja = async (src, nimi, fn, db, pel) => { const c = ympar(db); vm.runInContext(viipale(src, 'async function ' + nimi + '(') + `\nthis.f = ${nimi};`, c); return c.f(pel, 'Tallennettu'); };
  [['Master', MASTER, '_mIdpTallennaDok'], ['VP', VP, '_vpTallennaIdpDok']].forEach(([nimi, src, fn]) => {
    it(nimi + ': lippu pois → vain idp_kausi (kuten ennen)', async () => {
      const { db, D: docs } = fakeDb({ [PK]: { etunimi: 'X' } }); const p = { id: PID, _idpTavoite: T(), _mIdpTavoite: T() };
      const ok = await aja(src, fn, fn, db, p); expect(ok).toBe(true); expect(docs.get(KAUSI).tavoitteet).toHaveLength(1); expect([...docs.keys()].some((k) => /idp_pelaaja/.test(k))).toBe(false);
    });
    it(nimi + ': lippu päällä → idp_kausi raakana + idp_pelaaja puhdistettuna samassa transaktiossa', async () => {
      D.LIPPU.kirjoitus = true; const { db, D: docs, loki } = fakeDb({ [PK]: { etunimi: 'X' } }); const p = { id: PID, _idpTavoite: T(), _mIdpTavoite: T() };
      expect(await aja(src, fn, fn, db, p)).toBe(true);
      expect(docs.get(KAUSI).tavoitteet[0].tavoitearvo).toBe(1.9); expect(luvut(docs.get(IDPP).tavoitteet)).toBe(0); expect(docs.get(IDPP).tavoitteet[0].fokus.nimi).toBe('Kiihdytys');
    });
  });
});

describe('sitoumus: vahvistuksen kirjoitus + lukijat (lähdekoodikytkennät + lib)', () => {
  it('Master, VP ja Kehitystyöpöytä vahvistavat tmIdpSitoumusKirjoita:lla (idp_kausi + idp_pelaaja) ja lukevat tmIdpPelaajaLueSitoumus:lla', () => {
    ['TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html'].forEach((f) => { const s = lue(f); expect(s, f).toMatch(/tmIdpSitoumusKirjoita\(_db, _seuraId, pid, vuosi, _sitV/); expect(s, f).toMatch(/tmIdpPelaajaLueSitoumus\(_db, _seuraId, pid, vuosi/); expect(s, f).toContain('lib/tm_idp_pelaaja_dok.js?v=1'); });
    const vp = lue('TalentMaster_VP_v25.html'); expect(vp).toMatch(/tmIdpSitoumusKirjoita\(db, _seuraId, p\.id, vuosi, p\._idpSitoumus/); expect(vp).toMatch(/tmIdpPelaajaLueSitoumus\(db, _seuraId, p\.id, vuosi, sdata/); expect(vp).toContain('lib/tm_idp_pelaaja_dok.js?v=1');
    const se = lue('TalentMaster_Seura.html'); expect(se).toMatch(/tmIdpPelaajaLueSitoumus\(db, sid, p\.id, String\(vuosi\)/); expect(se).toContain('lib/tm_idp_pelaaja_dok.js?v=1');
  });
  it('tmIdpPelaajaLueSitoumus: lippu pois → idp_kausi ilman lisäkyselyä; päällä → idp_pelaaja voittaa; luku-virhe → idp_kausi; ei lukuja kumpaankaan → null', async () => {
    const { db } = fakeDb({ [IDPP]: { pelaaja_sitoumus: { s: 'pelaaja' } } }); let luettu = 0; const get0 = db.collection; 
    const seurannut = Object.assign({}, db, { collection: (c) => { luettu++; return db.collection(c); } });
    expect(await D.tmIdpPelaajaLueSitoumus(seurannut, SID, PID, '2026', { pelaaja_sitoumus: { s: 'kausi' } }, {})).toEqual({ s: 'kausi' }); expect(luettu).toBe(0);
    expect(await D.tmIdpPelaajaLueSitoumus(db, SID, PID, '2026', { pelaaja_sitoumus: { s: 'kausi' } }, { idpPelaajaKirjoitus: true })).toEqual({ s: 'pelaaja' });
    expect(await D.tmIdpPelaajaLueSitoumus(db, SID, 'toinen', '2026', { pelaaja_sitoumus: { s: 'kausi' } }, { idpPelaajaKirjoitus: true })).toEqual({ s: 'kausi' });
    const rikki = { collection: () => { throw Object.assign(new Error('x'), { code: 'permission-denied' }); } };
    expect(await D.tmIdpPelaajaLueSitoumus(rikki, SID, PID, '2026', { pelaaja_sitoumus: { s: 'kausi' } }, { idpPelaajaKirjoitus: true })).toEqual({ s: 'kausi' });
    expect(await D.tmIdpPelaajaLueSitoumus(db, SID, 'toinen', '2026', null, { idpPelaajaKirjoitus: true })).toBeNull();
  });
});

describe('scripts/migroi_idp_pelaaja.js', () => {
  const SIT = { rekisteri: 'a', sitoumus_pvm: '2026-10-01', vahvistettu_pvm: null };
  it('suunnittele (pure): ei dataa / luo / jo siirretty / vanhentunut / sitoumus: idp_pelaaja voittaa, puuttuvat lehdet täydennetään', () => {
    expect(M.suunnittele({}, null, 'N').luokka).toBe('ei_dataa'); expect(M.suunnittele(null, null, 'N').luokka).toBe('ei_dataa');
    const luo = M.suunnittele({ tavoitteet: [T()], pelaaja_sitoumus: SIT }, null, 'N'); expect(luo).toMatchObject({ luokka: 'kopioi', uusi: true, vanhentunut: false }); expect(luo.mergeFields).toEqual(['tavoitteet', 'pelaaja_sitoumus', 'paivitetty']); expect(luvut(luo.data.tavoitteet)).toBe(0);
    const sama = { tavoitteet: D.tmIdpPelaajaTavoitteet([T()]), pelaaja_sitoumus: SIT }; expect(M.suunnittele({ tavoitteet: [T()], pelaaja_sitoumus: SIT }, sama, 'N')).toMatchObject({ luokka: 'jo_siirretty', eroaa: 0 });
    const vanh = M.suunnittele({ tavoitteet: [T()] }, { tavoitteet: [] }, 'N'); expect(vanh).toMatchObject({ luokka: 'kopioi', vanhentunut: true, uusi: false }); expect(vanh.mergeFields).toEqual(['tavoitteet', 'paivitetty']);
    const e = M.suunnittele({ pelaaja_sitoumus: Object.assign({}, SIT, { rekisteri: 'b', lisa: 1 }) }, { pelaaja_sitoumus: SIT }, 'N'); expect(e).toMatchObject({ luokka: 'kopioi', eroaa: 1 }); expect(e.data.pelaaja_sitoumus).toEqual(Object.assign({}, SIT, { lisa: 1 }));   // idp_pelaaja voitti 'rekisteri'
    expect(M.suunnittele({ tavoitteet: [T({ status: 'hylatty' })] }, { tavoitteet: [] }, 'N').luokka).toBe('jo_siirretty');   // hylätty ei näy pelaajalle → [] on jo oikein
  });
  const data = () => ({ 'seurat/sjk': {}, 'seurat/sjk/pelaajat/a': { etunimi: 'Aatu' }, 'seurat/sjk/pelaajat/a/idp_kausi/2026': { tavoitteet: [T()], pelaaja_sitoumus: SIT }, 'seurat/sjk/pelaajat/a/idp_kausi/2025': { tavoitteet: [T({ status: 'vaihdettu' })] },
    'seurat/sjk/pelaajat/b': { etunimi: 'Bertta' }, 'seurat/sjk/pelaajat/b/idp_kausi/2026': {}, 'seurat/sjk/pelaajat/c': { etunimi: 'Cecil' } });
  it('DRY-RUN (oletus): ei kirjoita; laskee; ei nimiä eikä id:itä tulosteessa', async () => {
    const { db, D: docs, loki } = fakeDb(data()); const ennen = JSON.stringify([...docs.entries()]), rivit = [];
    const y = await M.aja({ db, kirjoita: false, loki: (r) => rivit.push(r) });
    expect(y).toMatchObject({ seuraa: 1, pelaajia: 3, dokumentteja: 3, ei_dataa: 1, kopioi: 2, uusia: 2, kirjoitettu: 0 }); expect(JSON.stringify([...docs.entries()])).toBe(ennen); expect(loki.commits).toBe(0);
    expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Kiihdytys|\/a\b/);
  });
  it('KIRJOITUS: luo idp_pelaaja puhdistettuna; idp_kausi ENNALLAAN; toinen ajo = 0 kirjoitusta (idempotentti); vanhentunut korvataan', async () => {
    const { db, D: docs } = fakeDb(data()); const kausiEnnen = JSON.stringify(docs.get('seurat/sjk/pelaajat/a/idp_kausi/2026'));
    const y = await M.aja({ db, kirjoita: true, nytISO: '2026-10-26T10:00:00.000Z' }); expect(y.kirjoitettu).toBe(2);
    const a = docs.get('seurat/sjk/pelaajat/a/idp_pelaaja/2026'); expect(a.tavoitteet).toHaveLength(1); expect(luvut(a.tavoitteet)).toBe(0); expect(a.pelaaja_sitoumus).toEqual(SIT); expect(a.paivitetty).toBe('2026-10-26T10:00:00.000Z');
    expect(docs.get('seurat/sjk/pelaajat/a/idp_pelaaja/2025').tavoitteet).toEqual([]); expect(JSON.stringify(docs.get('seurat/sjk/pelaajat/a/idp_kausi/2026'))).toBe(kausiEnnen);
    const y2 = await M.aja({ db, kirjoita: true }); expect(y2).toMatchObject({ kopioi: 0, kirjoitettu: 0, jo_siirretty: 2, ei_dataa: 1 });
    docs.get('seurat/sjk/pelaajat/a/idp_kausi/2026').tavoitteet.push(T({ luotu: 'B', fokus: { nimi: 'Uusi' } }));   // idp_pelaaja vanhenee
    expect((await M.aja({ db, kirjoita: false })).vanhentunut).toBe(1);
  });
  it('skripti vaatii suoran ajon (ei require tuotannossa); lib-polku', () => { const s = lue('scripts/migroi_idp_pelaaja.js'); expect(s).toContain("require('../lib/tm_idp_pelaaja_dok.js')"); expect(s).toContain('ei require/import'); });
});
