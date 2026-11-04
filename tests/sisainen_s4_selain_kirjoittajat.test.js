/* Vaihe 1 / PR 1e-3b → PR 2d (S4) — selaimen kirjoittajat: Pikakortti, Master paivitaAdarPikakentat, VP _vpTallennaHavaittu (tx), Testaus_v9 kasvumittaus, Seura (terveys, talentti, Excel-luonti).
   PR 2d: lippuriippuvuus poistettu — A-kentät VAIN sisainen/tiedot:iin (pelaajadokumentti riisutaan, jaetut arvot B-muotoon), YKSI batch, ei permission-denied-varapolkua (virhe → kutsujalle).
   Runtime-ajot: OIKEA sivukoodi vm-hiekkalaatikossa + muistinvarainen Firestore. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js');
afterEach(() => { S.RYHMAT.s4.kirjoitus = true; });

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

describe('Pikakortti: adar_* VAIN sisainen (_phS4Kirjoita = tmS4Kirjoita, yksi batch, virhe hylkää)', () => {
  const koodi = viipale(PIKA, 'function _phS4Valmista(', 'async function _phPaivitaPikakentat(');
  const aja = (fs, lib) => { const c = vm.createContext({ console, Promise, Object, Error, window: { TM_SISAINEN: lib === undefined ? S : lib }, _PH_DB: fs.db }); vm.runInContext(koodi, c); return c; };
  it('_phS4Valmista: pelaajalle porrasehdotus ilman hist:iä (hist_n), raakapisteet lisa:ssa', () => {
    const c = aja(mkFs()); const v = c._phS4Valmista(kentat());
    expect(v.upd.havainto_porras_ehdotus).toEqual({ valmis: false, seuraava: 'x', hist_n: 2 }); expect(v.lisa).toEqual({ havainto_porras_hist: [1, 2] });
  });
  it('_phS4Kirjoita: pelaajalle vain B (adar_pvm, adar_heikoin, ehdotus hist_n), sisainen saa adar-konsensuksen + raakapisteet — samassa batchissa', async () => {
    const f = mkFs(); f.docs[PEL] = { etunimi: 'X' }; const c = aja(f); const v = c._phS4Valmista(kentat());
    await c._phS4Kirjoita(SID, PID, v);
    expect(f.docs[PEL]).toMatchObject({ etunimi: 'X', adar_pvm: '2026-11-02', adar_heikoin: 'r', havainto_porras_ehdotus: { hist_n: 2 } });
    ['adar_arvioijat', 'adar_arvioijia', 'adar_vahvin', 'havainto_porras_hist'].forEach((k) => expect(f.docs[PEL][k], k).toBeUndefined()); expect(f.docs[PEL].havainto_porras_ehdotus.hist).toBeUndefined();
    expect(f.docs[SIS].havainto_porras_hist).toEqual([1, 2]); expect(f.docs[SIS].adar_arvioijia).toBe(1); expect(f.docs[SIS].adar_vahvin).toBe('a'); expect(f.docs[SIS].adar_heikoin).toBeUndefined();
    expect(f.loki).toHaveLength(2);   // pelaaja + sisainen yhdessä commitissa
  });
  it('sisainen permission-denied → koko batch hylätään (kaikki tai ei mitään), virhe kutsujalle; lib puuttuu → hylätty lupaus', async () => {
    const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = { etunimi: 'X' }; const c = aja(f); const v = c._phS4Valmista(kentat());
    await expect(c._phS4Kirjoita(SID, PID, v)).rejects.toMatchObject({ code: 'permission-denied' }); expect(f.docs[PEL]).toEqual({ etunimi: 'X' }); expect(sisaa(f)).toBe(false);
    const g = mkFs(); g.docs[PEL] = {}; await expect(aja(g, null)._phS4Kirjoita(SID, PID, { upd: { adar_vahvin: 'a' }, lisa: null })).rejects.toThrow('TM_SISAINEN_PUUTTUU'); expect(g.docs[PEL]).toEqual({});
  });
  it('lähdekoodi: havainto + havainto_viimeisin_pvm (tmS4Lisaa → VAIN sisainen) SAMASSA batchissa; ei pelaajadokumentin havainto_viimeisin_pvm-kirjoitusta; sw sallii libin', () => {
    const t = viipale(PIKA, 'var batch = _PH_DB.batch();', 'async function _phTallenna(');
    expect(t).toMatch(/tmS4Lisaa\(batch, _PH_DB, seuraId, pelaajaId, \{ havainto_viimeisin_pvm: havPvm \}/); expect(t.indexOf('tmS4Lisaa(batch')).toBeLessThan(t.indexOf('batch.commit()'));
    expect(t).not.toMatch(/batch\.set\(pRef, \{ havainto_viimeisin_pvm/); expect(t).not.toMatch(/pRef\.set\(_s4/); expect(PIKA).not.toMatch(/_phS4Sisainen/);
    expect(PIKA).toMatch(/lib\/tm_sisainen\.js/); expect(lue('sw_adar.js')).toContain("'/lib/tm_sisainen.js'");
  });
});

describe('Master paivitaAdarPikakentat → _adarS4Kirjoita', () => {
  const koodi = viipale(MASTER, 'function _adarS4Kirjoita(', 'async function paivitaAdarPikakentat(');
  const aja = (fs, lib) => { const c = vm.createContext({ console, Promise, Object, Error, _db: fs.db, _seuraId: SID, window: {} }); c.window.TM_SISAINEN = lib === undefined ? S : lib; vm.runInContext(koodi, c); return c; };
  it('YKSI batch: pelaajalle B-osa (hist_n), sisainen raakapisteet + konsensus; muut pelaajakentät säilyvät', async () => {
    const f = mkFs(); f.docs[PEL] = { nimi: 'X' }; await aja(f)._adarS4Kirjoita(PID, kentat());
    expect(f.docs[SIS].havainto_porras_hist).toEqual([1, 2]); expect(f.docs[SIS].adar_arvioijia).toBe(1);
    expect(f.docs[PEL]).toMatchObject({ nimi: 'X', adar_pvm: '2026-11-02', havainto_porras_ehdotus: { hist_n: 2 } }); expect(f.docs[PEL].havainto_porras_ehdotus.hist).toBeUndefined(); expect(f.docs[PEL].adar_arvioijia).toBeUndefined();
  });
  it('fail-closed: permission-denied → hylkää, ei vanhaa kenttää; lib puuttuu → hylkää ilman raakaa set:iä', async () => {
    const g = mkFs({ hylkaaSisainen: true }); g.docs[PEL] = {}; await expect(aja(g)._adarS4Kirjoita(PID, kentat())).rejects.toMatchObject({ code: 'permission-denied' }); expect(g.docs[PEL]).toEqual({}); expect(sisaa(g)).toBe(false);
    const h = mkFs(); h.docs[PEL] = {}; await expect(aja(h, null)._adarS4Kirjoita(PID, kentat())).rejects.toThrow('TM_SISAINEN_PUUTTUU'); expect(h.docs[PEL]).toEqual({});
  });
});

describe('VP _vpTallennaHavaittu: arviointi_* VAIN sisainen:iin samassa transaktiossa (pistepolku)', () => {
  const sis = (f, pika) => f.db.runTransaction(async (tx) => { S.tmS4Lisaa(tx, f.db, SID, PID, pika, {}); });
  it('lähdekoodi: tmS4Lisaa transaktioon, ei pelaajadokumentin tx.set:iä, _kirjA(true) ilman varapolkua', () => {
    const t = viipale(VP, 'window._vpTallennaHavaittu = async', 'function _jsvTkiVari');
    expect(t).toMatch(/tmS4Lisaa\(tx, db, _seuraId, pid, pikaPaivitys/); expect(t).not.toMatch(/tmS4Varapolulla/); expect(t).toMatch(/await _kirjA\(true\)/);
    expect(t).not.toMatch(/tx\.set\(\w*[pP]\w*Ref, pikaPaivitys/);
  });
  it('muut avaimet säilyvät sisainen:ssä; delete-sentinel poistaa vain oman avaimen; pelaajadokumenttia ei kosketa', async () => {
    const f = mkFs(); f.docs[PEL] = { nimi: 'X' };
    await sis(f, { arviointi_pvm: 'p1', arviointi_havaittu: { a: 3, b: 4 } });
    await sis(f, { arviointi_pvm: 'p2', arviointi_havaittu: { a: DEL } });
    expect(f.docs[SIS].arviointi_havaittu).toEqual({ b: 4 }); expect(f.docs[SIS].arviointi_pvm).toBe('p2'); expect(f.docs[PEL]).toEqual({ nimi: 'X' });
  });
  it('permission-denied → transaktio hylätään (ei uusintaa ilman sisainen:iä, ei vanhaa kenttää)', async () => {
    const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = {};
    await expect(sis(f, { arviointi_pvm: 'p1', arviointi_havaittu: { a: 3 } })).rejects.toMatchObject({ code: 'permission-denied' }); expect(f.docs[PEL]).toEqual({}); expect(sisaa(f)).toBe(false);
  });
});

describe('Testaus_v9 kasvumittaus: pelaajalle riisuttu päivitys, kypsyys + koko biologinenIka_viimeisin sisainen:iin samaan batchiin', () => {
  it('lähdekoodi: b.update(baseRef, tmS4Riisu(upd)) + tmS4Lisaa, ei Varapolulla; lib ladattu', () => {
    const t = viipale(TEST, 'const upd = {', "console.warn('[kasvu] tallennus'");
    expect(t).toMatch(/b\.update\(baseRef, S4\.tmS4Riisu\(upd\)\)/); expect(t).toMatch(/S4\.tmS4Lisaa\(b, baseRef\.firestore/); expect(t).not.toMatch(/tmS4Varapolulla/); expect(TEST).toMatch(/lib\/tm_sisainen\.js/);
  });
  it('batch: pelaajalle phv_tila + biologinenIka_viimeisin B-muodossa; sisainen kypsyys (myös null-kasvutahti) + täysi dokumentti', async () => {
    const bio = { phv_tila: 'Lähellä', phv_tila_koodi: 'LAH', phv_ika: 13.1, ika_mittaushetkella: 12.6, mittauspaiva: '2026-10-01', maturity_offset: -0.5, kehitysvaihe_kaista: 'circa' };
    const upd = { phv_tila: 'LAH', kehitysvaihe_kaista: 'circa', kasvutahti_cm_v: null, kasvutahti_vyohyke: null, biologinenIka_viimeisin: bio };
    const f = mkFs(); f.docs[PEL] = {}; const b = f.db.batch(), pel = f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID);
    b.update(pel, S.tmS4Riisu(upd)); S.tmS4Lisaa(b, f.db, SID, PID, upd, {}); await b.commit();
    expect(f.docs[SIS]).toMatchObject({ kehitysvaihe_kaista: 'circa', kasvutahti_cm_v: null }); expect(f.docs[SIS].biologinenIka_viimeisin.maturity_offset).toBe(-0.5); expect(f.docs[SIS].phv_tila).toBeUndefined();
    expect(f.docs[PEL].phv_tila).toBe('LAH'); expect(f.docs[PEL].kehitysvaihe_kaista).toBeUndefined(); expect(f.docs[PEL].kasvutahti_cm_v).toBeUndefined();
    expect(f.docs[PEL].biologinenIka_viimeisin).toEqual({ phv_tila: 'Lähellä', phv_tila_koodi: 'LAH', phv_ika: 13.1, ika_mittaushetkella: 12.6, mittauspaiva: '2026-10-01' });
  });
});

describe('Seura: terveys, talentti-muokkaus, Excel-luonti', () => {
  it('käytettävyys (PR 2a): vain terveys-dokumentti, delete poistaa sieltä; pelaajadokumenttia ei kosketa', async () => {
    const data = { kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'polvi' };
    const f = mkFs(); f.docs[PEL] = { loukkaantuminen_alue: 'x' };
    await S.tmTerveysKirjoita(f.db, SID, PID, data, {}); expect(f.docs[TERV]).toMatchObject({ kaytettavyys: 'loukkaantunut', loukkaantuminen_alue: 'polvi', terveysSeuraId: SID }); expect(f.docs[SIS]).toBeUndefined();
    await S.tmTerveysKirjoita(f.db, SID, PID, { kaytettavyys: 'aktiivinen', loukkaantuminen_alue: DEL }, {}); expect(f.docs[TERV].loukkaantuminen_alue).toBeUndefined();
    expect(f.docs[PEL]).toEqual({ loukkaantuminen_alue: 'x' });   // vanha kenttä jää siivousskriptille
  });
  it('talentti-muokkaus: tmS4Kirjoita update-polulla — talenttiTaso/Alku sisainen:iin, talenttiOhjelma (C) + muu pelaajalle; permission-denied → hylkää, ei vanhaa kenttää', async () => {
    const p = { nimi: 'X', talenttiOhjelma: true, talenttiTaso: 'perus', talenttiAlku: { __ts: 1 } };
    const f = mkFs(); f.docs[PEL] = {}; await S.tmS4Kirjoita(f.db, SID, PID, p, {});
    expect(f.docs[SIS]).toMatchObject({ talenttiTaso: 'perus' }); expect(f.docs[SIS].talenttiOhjelma).toBeUndefined(); expect(f.docs[SIS].nimi).toBeUndefined();
    expect(f.docs[PEL]).toEqual({ nimi: 'X', talenttiOhjelma: true });
    const g = mkFs({ hylkaaSisainen: true }); g.docs[PEL] = {}; await expect(S.tmS4Kirjoita(g.db, SID, PID, p, {})).rejects.toMatchObject({ code: 'permission-denied' }); expect(g.docs[PEL]).toEqual({}); expect(sisaa(g)).toBe(false);
  });
  it('Excel-luonti: talenttiTaso/Alku/Aktivoi tmS4Sisainen:llä — permission-denied HEITETÄÄN (rivi näkyy epäonnistuneena), onnistuessa vain sisainen', async () => {
    const u = { talenttiTaso: 'perus', talenttiAlku: { __ts: 1 }, talenttiAktivoi: 'u1' };
    const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = { etunimi: 'X', talenttiOhjelma: true };
    await expect(S.tmS4Sisainen(f.db, SID, PID, u, {})).rejects.toMatchObject({ code: 'permission-denied' }); expect(f.docs[PEL]).toEqual({ etunimi: 'X', talenttiOhjelma: true });
    const g = mkFs(); g.docs[PEL] = { talenttiOhjelma: true }; await S.tmS4Sisainen(g.db, SID, PID, u, {}); expect(g.docs[SIS]).toMatchObject({ talenttiTaso: 'perus', talenttiAktivoi: 'u1' }); expect(g.docs[PEL]).toEqual({ talenttiOhjelma: true });
  });
  it('lähdekoodi kytketty: lib ladattu, terveys, talentti-muokkaus ilman raakavarapolkua, Excel-luonnissa pelaajalle vain talenttiOhjelma', () => {
    expect(SEURA).toMatch(/lib\/tm_sisainen\.js/); expect(SEURA).toMatch(/tmTerveysKirjoita\(db, tila\.seuraId, pelaajaId, data/); expect(SEURA).toContain('const TERVEYS_VAIN_SISAINEN = true;');
    expect(SEURA).toMatch(/await window\.TM_SISAINEN\.tmS4Kirjoita\(db, tila\.seuraId, pelaajaId, paivitys, \{\}\);/); expect(SEURA).not.toMatch(/if \(window\.TM_SISAINEN\) await window\.TM_SISAINEN\.tmS4Kirjoita/);
    expect(SEURA).toMatch(/if \(_tal\) await window\.TM_SISAINEN\.tmS4Sisainen\(db, tila\.seuraId, pelaajaId, \{ talenttiTaso:/);
    const luonti = viipale(SEURA, 'const pelaajaRef = pelCol.doc();', 'tuotu++;'); expect(luonti).toMatch(/talenttiOhjelma: p\.talentti/); expect(luonti).not.toMatch(/talenttiTaso:\s+\(p\.talentti/); expect(luonti).not.toMatch(/talenttiAktivoi:\s+\(p\.talentti/);
  });
});
