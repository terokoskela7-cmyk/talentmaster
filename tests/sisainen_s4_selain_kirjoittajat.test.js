/* Vaihe 1 / PR 1e-3b (S4) — selaimen kirjoittajat: Pikakortti (omana kirjoituksenaan havainnon jälkeen), Master paivitaAdarPikakentat, VP _vpTallennaHavaittu (tx), Testaus_v9 kasvumittaus, Seura (terveys, talentti, Excel-luonti).
   Lippu RYHMAT.s4.kirjoitus POIS oletuksena. Runtime-ajot: OIKEA sivukoodi vm-hiekkalaatikossa + muistinvarainen Firestore. Lippu pois = täsmälleen vanhat kirjoitukset; päällä = dual-write + sisainen; Rules ei vielä = vanha kenttä;
   Pikakortti: sisainen-kirjoitus permission-denied → havainto/pikakentät silti tallessa. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js');
afterEach(() => { S.RYHMAT.s4.kirjoitus = false; });

const DEL = { __fv: 'delete' }, FV = { delete: () => DEL, arrayUnion: (...a) => ({ __fv: 'union', a }), serverTimestamp: () => ({ __ts: 1 }) };
const kopio = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const olio = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && !x.__fv;
function aseta(d, polku, arvo) {
  const k = polku.split('.'); let o = d; for (let i = 0; i < k.length - 1; i++) { if (!olio(o[k[i]])) o[k[i]] = {}; o = o[k[i]]; }
  const l = k[k.length - 1];
  if (arvo && arvo.__fv === 'delete') delete o[l]; else if (arvo && arvo.__fv === 'union') { const v = Array.isArray(o[l]) ? o[l] : []; o[l] = v.concat(arvo.a); } else o[l] = kopio(arvo);
}
function yhdista(kohde, lahde) { Object.keys(lahde).forEach((k) => { const v = lahde[k]; if (v && v.__fv) aseta(kohde, k, v); else if (olio(v)) { if (!olio(kohde[k])) kohde[k] = {}; yhdista(kohde[k], v); } else kohde[k] = kopio(v); }); }
function mkFs(opts) {
  opts = opts || {}; const docs = {}, loki = [];
  const op = { update(p, u) { if (!docs[p]) throw new Error('NOT_FOUND ' + p); Object.keys(u).forEach((k) => aseta(docs[p], k, u[k])); },
    set(p, d, o) { if (!o) { docs[p] = {}; yhdista(docs[p], d); return; } docs[p] = docs[p] || {}; if (o.mergeFields) o.mergeFields.forEach((f) => aseta(docs[p], f, f.split('.').reduce((x, k) => (x == null ? undefined : x[k]), d))); else if (o.merge) yhdista(docs[p], d); } };
  const hylkaa = (ops) => { if (opts.hylkaaSisainen && ops.some((x) => /\/sisainen\//.test(x[1]))) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; } };
  const kaikkiTaiEi = (ops) => { hylkaa(ops); const varm = kopio(docs); try { ops.forEach((x) => { loki.push(x[0] + ' ' + x[1]); op[x[0]](x[1], x[2], x[3]); }); } catch (e) { Object.keys(docs).forEach((k) => delete docs[k]); Object.assign(docs, varm); throw e; } };
  const ref = (path) => ({ _path: path, id: path.split('/').pop(), collection: (c) => ({ doc: (i) => ref(path + '/' + c + '/' + i) }), get: async () => ({ exists: !!docs[path], data: () => docs[path] }),
    update: async (u) => { kaikkiTaiEi([['update', path, u]]); }, set: async (d, o) => { kaikkiTaiEi([['set', path, d, o]]); } });
  const db = { collection: (c) => ({ doc: (i) => ref(c + '/' + i) }),
    batch: () => { const b = []; return { update: (r, u) => b.push(['update', r._path, u]), set: (r, d, o) => b.push(['set', r._path, d, o]), commit: async () => kaikkiTaiEi(b) }; },
    runTransaction: async (fn) => { const b = []; await fn({ get: async (r) => ({ exists: !!docs[r._path], data: () => docs[r._path] }), set: (r, d, o) => b.push(['set', r._path, d, o]) }); kaikkiTaiEi(b); } };
  return { db, docs, loki };
}
const sisaa = (fs) => Object.keys(fs.docs).some((k) => /sisainen/.test(k));
const SID = 's', PID = 'p1', PEL = `seurat/${SID}/pelaajat/${PID}`, SIS = PEL + '/sisainen/tiedot', TERV = PEL + '/sisainen/terveys';
const PIKA = lue('TalentMaster_ADAR_Pikakortti.html'), MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html'), TEST = lue('TalentMaster_Testaus_v9.html'), SEURA = lue('TalentMaster_Seura.html');
function viipale(src, a, b) { const i = src.indexOf(a), j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('viipaletta ei löytynyt: ' + a); return src.slice(i, j); }
const kentat = () => ({ adar_pvm: '2026-11-02', adar_arvioijat: [{ uid: 'u' }], adar_arvioijia: 1, adar_vahvin: 'a', adar_heikoin: 'r', havainto_porras_ehdotus: { valmis: false, seuraava: 'x', hist: [1, 2] } });
const pelaajaOnTallessa = (f) => f.docs[PEL] && f.docs[PEL].adar_pvm === '2026-11-02';

describe('Pikakortti: sisainen omana kirjoituksenaan pelaajan jälkeen (ei heitä)', () => {
  const koodi = viipale(PIKA, 'function _phS4Valmista(', 'async function _phPaivitaPikakentat(');
  const aja = (fs) => { const c = vm.createContext({ console, Promise, Object, window: { TM_SISAINEN: S }, _PH_DB: fs.db }); c.window.TM_SISAINEN = S; vm.runInContext(koodi, c); return c; };
  it('lippu pois (peruutus): pelaajalle kentät sellaisenaan, sisainen-kirjoitusta ei tehdä', async () => {
    S.RYHMAT.s4.kirjoitus = false;
    const f = mkFs(); const c = aja(f); const v = c._phS4Valmista(kentat());
    expect(v.upd).toEqual(kentat()); expect(v.lisa).toBeNull();
    const r = await c._phS4Sisainen(SID, PID, v); expect(r.sisainen).toBe(false); expect(sisaa(f)).toBe(false);
  });
  it('lippu päällä: pelaajalle hist_n (hist säilyy), raakapisteet vain sisainen:iin', async () => {
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs(); f.docs[PEL] = {}; const c = aja(f); const v = c._phS4Valmista(kentat());
    await f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).set(v.upd, { merge: true });
    const r = await c._phS4Sisainen(SID, PID, v); expect(r).toMatchObject({ ok: true, sisainen: true });
    expect(f.docs[PEL].havainto_porras_ehdotus).toMatchObject({ hist_n: 2, hist: [1, 2] }); expect(f.docs[PEL].havainto_porras_hist).toBeUndefined();
    expect(f.docs[SIS].havainto_porras_hist).toEqual([1, 2]); expect(f.docs[SIS].adar_arvioijia).toBe(1); expect(f.docs[SIS].adar_heikoin).toBeUndefined();
  });
  it('havainto_viimeisin_pvm: sisainen-kopio omana kirjoituksenaan', async () => {
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs(); const c = aja(f);
    await c._phS4Sisainen(SID, PID, { upd: { havainto_viimeisin_pvm: '2026-11-02' }, lisa: null }); expect(f.docs[SIS].havainto_viimeisin_pvm).toBe('2026-11-02');
  });
  it('sisainen-batch permission-denied → EI heitä, pelaajan havainto/pikakentät jäävät tallelle', async () => {
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = {}; const c = aja(f); const v = c._phS4Valmista(kentat());
    await f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).set(v.upd, { merge: true });
    const r = await c._phS4Sisainen(SID, PID, v); expect(r.ok).toBe(false); expect(r.virhe).toBe('permission-denied');
    expect(pelaajaOnTallessa(f)).toBe(true); expect(sisaa(f)).toBe(false);
  });
  it('lähdekoodi: havainto kirjoitetaan ENNEN sisainen-kirjoitusta, ei samassa batchissa; sw sallii libin', () => {
    const t = viipale(PIKA, 'var batch = _PH_DB.batch();', 'async function _phTallenna(');
    expect(t).not.toMatch(/batch\.set\([^)]*sisainen/); expect(t.indexOf('batch.commit()')).toBeLessThan(t.indexOf('_phS4Sisainen('));
    expect(PIKA).toMatch(/lib\/tm_sisainen\.js/); expect(lue('sw_adar.js')).toContain("'/lib/tm_sisainen.js'");
  });
});

describe('Master paivitaAdarPikakentat → _adarS4Kirjoita', () => {
  const koodi = viipale(MASTER, 'function _adarS4Kirjoita(', 'async function paivitaAdarPikakentat(');
  const aja = (fs) => { const c = vm.createContext({ console, Promise, Object, _db: fs.db, _seuraId: SID, window: {} }); c.window.TM_SISAINEN = S; vm.runInContext(koodi, c); return c; };
  it('lippu pois: yksi set-merge pelaajalle kuten ennen', async () => {
    const f = mkFs(); f.docs[PEL] = { nimi: 'X' }; await aja(f)._adarS4Kirjoita(PID, kentat());
    expect(f.docs[PEL].havainto_porras_ehdotus.hist).toEqual([1, 2]); expect(f.docs[PEL].nimi).toBe('X'); expect(sisaa(f)).toBe(false);
  });
  it('lippu päällä: dual-write batchissa; permission-denied → vanha kenttä', async () => {
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs(); f.docs[PEL] = {}; await aja(f)._adarS4Kirjoita(PID, kentat());
    expect(f.docs[SIS].havainto_porras_hist).toEqual([1, 2]); expect(f.docs[PEL].havainto_porras_ehdotus.hist_n).toBe(2);
    const g = mkFs({ hylkaaSisainen: true }); g.docs[PEL] = {}; await aja(g)._adarS4Kirjoita(PID, kentat()); expect(pelaajaOnTallessa(g)).toBe(true); expect(sisaa(g)).toBe(false);
  });
});

describe('VP _vpTallennaHavaittu: arviointi_* samaan transaktioon pistepolulla', () => {
  const sis = (f, mukaan, pika) => f.db.runTransaction(async (tx) => { tx.set(f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID), pika, { merge: true }); if (mukaan) S.tmS4Lisaa(tx, f.db, SID, PID, pika, {}); });
  it('lähdekoodi kytketty Varapolulla + Lisaa', () => { const t = viipale(VP, 'window._vpTallennaHavaittu = async', 'function _jsvTkiVari'); expect(t).toMatch(/tmS4Varapolulla/); expect(t).toMatch(/tmS4Lisaa\(tx, db, _seuraId, pid, pikaPaivitys/); });
  it('muut avaimet säilyvät sisainen:ssä; delete-sentinel poistaa vain oman avaimen', async () => {
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs(); f.docs[PEL] = {};
    await S.tmS4Varapolulla({}, (m) => sis(f, m, { arviointi_pvm: 'p1', arviointi_havaittu: { a: 3, b: 4 } }));
    await S.tmS4Varapolulla({}, (m) => sis(f, m, { arviointi_pvm: 'p2', arviointi_havaittu: { a: DEL } }));
    expect(f.docs[SIS].arviointi_havaittu).toEqual({ b: 4 }); expect(f.docs[PEL].arviointi_havaittu).toEqual({ b: 4 });
  });
  it('permission-denied → uusi yritys ilman sisainen:iä; lippu pois ei sisainen:iä', async () => {
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = {};
    await S.tmS4Varapolulla({}, (m) => sis(f, m, { arviointi_pvm: 'p1', arviointi_havaittu: { a: 3 } })); expect(f.docs[PEL].arviointi_havaittu).toEqual({ a: 3 }); expect(sisaa(f)).toBe(false);
    S.RYHMAT.s4.kirjoitus = false; const g = mkFs(); g.docs[PEL] = {}; await S.tmS4Varapolulla({}, (m) => sis(g, m, { arviointi_pvm: 'p1' })); expect(sisaa(g)).toBe(false);
  });
});

describe('Testaus_v9 kasvumittaus: kypsyyskentät samaan batchiin', () => {
  it('lähdekoodi: tmS4Lisaa batchiin, Varapolulla, lib ladattu', () => {
    const t = viipale(TEST, 'const upd = {', "console.warn('[kasvu] tallennus'"); expect(t).toMatch(/tmS4Lisaa\(b, baseRef\.firestore/); expect(t).toMatch(/tmS4Varapolulla/); expect(TEST).toMatch(/lib\/tm_sisainen\.js/);
  });
  it('batch: pelaaja update + sisainen mergeFields; kasvutahti null kirjoittuu; ilman lippua ei sisainen:iä', async () => {
    const upd = { phv_tila: 'LAH', kehitysvaihe_kaista: 'circa', kasvutahti_cm_v: null, kasvutahti_vyohyke: null, biologinenIka_viimeisin: { x: 1 } };
    const aja = async (f, mukaan) => { const b = f.db.batch(), pel = f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID); b.update(pel, upd); if (mukaan) S.tmS4Lisaa(b, f.db, SID, PID, upd, {}); await b.commit(); };
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs(); f.docs[PEL] = {}; await S.tmS4Varapolulla({}, (m) => aja(f, m));
    expect(f.docs[SIS]).toMatchObject({ kehitysvaihe_kaista: 'circa', kasvutahti_cm_v: null }); expect(f.docs[SIS].phv_tila).toBeUndefined(); expect(f.docs[SIS].biologinenIka_viimeisin).toBeUndefined(); expect(f.docs[PEL].phv_tila).toBe('LAH');
    S.RYHMAT.s4.kirjoitus = false; const g = mkFs(); g.docs[PEL] = {}; await S.tmS4Varapolulla({}, (m) => aja(g, m)); expect(sisaa(g)).toBe(false);
  });
});

describe('Seura: terveys, talentti-muokkaus, Excel-luonti', () => {
  it('käytettävyys: lippu päällä terveys-dokumentti (ei tiedot:iin), delete poistaa; pois = yksi update()', async () => {
    const data = { kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'polvi', muokattu: { __ts: 1 } };
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs(); f.docs[PEL] = { loukkaantuminen_alue: 'x' };
    await S.tmTerveysKirjoita(f.db, SID, PID, data, {}); expect(f.docs[TERV]).toMatchObject({ kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'polvi', terveysSeuraId: SID }); expect(f.docs[TERV].muokattu).toBeUndefined(); expect(f.docs[SIS]).toBeUndefined();
    await S.tmTerveysKirjoita(f.db, SID, PID, { kaytettavyys: 'aktiivinen', loukkaantuminen_alue: DEL }, {}); expect(f.docs[TERV].loukkaantuminen_alue).toBeUndefined(); expect(f.docs[PEL].loukkaantuminen_alue).toBeUndefined();
    S.RYHMAT.s4.kirjoitus = false; const g = mkFs(); g.docs[PEL] = {}; await S.tmTerveysKirjoita(g.db, SID, PID, data, {}); expect(sisaa(g)).toBe(false); expect(g.docs[PEL].kaytettavyys).toBe('loukkaantunut');
  });
  it('talentti-muokkaus: tmS4Kirjoita update-polulla; permission-denied → vanha kenttä', async () => {
    const p = { nimi: 'X', talenttiOhjelma: true, talenttiTaso: 'perus', talenttiAlku: { __ts: 1 } };
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs(); f.docs[PEL] = {}; await S.tmS4Kirjoita(f.db, SID, PID, p, {}); expect(f.docs[SIS]).toMatchObject({ talenttiOhjelma: true, talenttiTaso: 'perus' }); expect(f.docs[SIS].nimi).toBeUndefined(); expect(f.docs[PEL].nimi).toBe('X');
    const g = mkFs({ hylkaaSisainen: true }); g.docs[PEL] = {}; await S.tmS4Kirjoita(g.db, SID, PID, p, {}); expect(g.docs[PEL].talenttiOhjelma).toBe(true); expect(sisaa(g)).toBe(false);
  });
  it('Excel-luonti: tmS4Sisainen ei heitä (permission-denied), pelaaja jää luotuksi', async () => {
    const u = { talenttiOhjelma: true, talenttiTaso: 'perus', talenttiAlku: { __ts: 1 }, talenttiAktivoi: 'u1' };
    S.RYHMAT.s4.kirjoitus = true; const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = { etunimi: 'X' };
    const r = await S.tmS4Sisainen(f.db, SID, PID, u, {}); expect(r.ok).toBe(false); expect(f.docs[PEL].etunimi).toBe('X');
    const g = mkFs(); g.docs[PEL] = {}; await S.tmS4Sisainen(g.db, SID, PID, u, {}); expect(g.docs[SIS]).toMatchObject({ talenttiOhjelma: true, talenttiAktivoi: 'u1' });
  });
  it('lähdekoodi kytketty (lib ladattu, kolme kirjoituspaikkaa)', () => {
    expect(SEURA).toMatch(/lib\/tm_sisainen\.js/); expect(SEURA).toMatch(/tmTerveysKirjoita\(db, tila\.seuraId, pelaajaId, data/); expect(SEURA).toMatch(/tmS4Kirjoita\(db, tila\.seuraId, pelaajaId, paivitys/); expect(SEURA).toMatch(/tmS4Sisainen\(db, tila\.seuraId, pelaajaId, \{ talenttiOhjelma/);
  });
});
