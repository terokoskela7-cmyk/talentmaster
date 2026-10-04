/**
 * PR B — kortit: datakatkokset (docs/PELAAJA_KORTIT_TILANNE.md §1, §4).
 *   a) Pelaaja_v7 Tekniikkaprofiili (_lataaTekniikka) lukee §26-PIKAKENTISTÄ, EI testitulokset-alikokoelmaa → Pikakirjauksella
 *      kirjattu TK näkyy (ennen "tulossa", koska vain Excel kirjoitti protokolla==='tekniikkakilpailu' -dokkeja).
 *   b) Pikakirjaus / Testaus_v9 / Testituonti_Master kirjoittavat tki_vahvuus/tki_kehityskohde + hh_vahvuus/hh_kehityskohde +
 *      *_edellinen SAMOIN kuin Excel_Tuonti (profiiliUpdate + recalcHH) samasta syötteestä, SAMASSA batchissa tuloksen kanssa.
 *   c) pvm-vahti: saman päivän uudelleenkirjaus EI vangitse _edellinen-arvoa.
 *   d) scripts/diag_phv_alkupera.js on pelkkä lukija (staattinen tarkistus).
 * Funktiot PURETAAN LÄHTEESTÄ ja AJETAAN (vm) mock-Firestorea vasten. Excel-vertailu ajaa Excel_Tuonnin OMAA koodia.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const N = require('../lib/tm_eerikkila_normit.js');
const CORE = require('../lib/tm_tki_core.js');
const CANON = require('../docs/testit_indeksit.js');
const E = require('../lib/tm_ennatykset.js');
const PVM_LIB = require('../lib/tm_pvm.js');
const PIKA = require('../lib/tm_pikakentat.js');

function pura(lahde, tunniste, alku = 0) {
  const i = lahde.indexOf(tunniste, alku); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const SENT_DEL = { __sentinel: 'delete' };
const FV = { serverTimestamp: () => ({ __sentinel: 'ts' }), delete: () => SENT_DEL, arrayUnion: (...x) => ({ __au: x }) };

/* Polkupohjainen mock: batch kaikki-tai-ei-mitään; kirjaa KAIKKI collection()-polut (alikokoelmakyselyn tunnistus). */
function mockDb(alku = {}) {
  const docs = JSON.parse(JSON.stringify(alku)); const erilliset = []; const polut = [];
  const ref = (p) => ({ id: p.split('/').pop(), path: p, collection: (n) => col(p + '/' + n),
    get: async () => ({ exists: p in docs, data: () => docs[p] }),
    set: async () => erilliset.push(p), update: async () => erilliset.push(p) });
  const col = (p) => { polut.push(p); return { doc: (id) => ref(p + '/' + id),
    get: async () => ({ docs: [] }),
    where: (kentta, op, arvo) => ({ limit: () => ({ get: async () => {
      const os = Object.keys(docs).filter((k) => k.startsWith(p + '/') && k.slice(p.length + 1).indexOf('/') < 0 && docs[k][kentta] === arvo);
      return { empty: !os.length, docs: os.map((k) => ({ id: k.split('/').pop(), ref: ref(k), data: () => docs[k] })) };
    } }) }) }; };
  const db = { collection: (n) => col(n), batches: [], polut, batch: () => { const ops = []; return {
    set: (r, d, o) => ops.push(['set', r.path, d, o]), update: (r, d) => ops.push(['update', r.path, d]),
    commit: async () => { db.batches.push(ops.map(([t, p]) => t + ' ' + p)); ops.forEach(([t, p, d, o]) => { docs[p] = (t === 'update' || (o && o.merge)) ? Object.assign({}, docs[p], d) : d; }); } }; } };
  return { db, docs, erilliset };
}

const PID = 'm93GBdOaGCUuenMiCL0I';
const PEL = 'seurat/kpv/pelaajat/' + PID;
// Topias: kiinteä syntymävuosi → 2026-testeissä normiIka 13 (TKI 8–13). Ei phv_tila → hhKehityskohde 'epavarma'.
const TOPIAS = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13', tunniste: '12345678' };
const D1 = '2026-09-01', D2 = '2026-10-03';
// Sama syöte kaikille kirjoittajille (TK sekunteina + 30 m). Päivä 1 → päivä 2 (aito uusi testi, eri pvm).
const SYOTE = {
  [D1]: { ponnauttelu: 20, syotto: 30, pujottelu: 25, kuljetus_laukaus: 26, lin30m: 5.9 },
  [D2]: { ponnauttelu: 18, syotto: 26, pujottelu: 24, kuljetus_laukaus: 22, lin30m: 4.0 },
};
const JOHDETUT = ['tki_vahvuus', 'tki_kehityskohde', 'tki_edellinen', 'tki_edellinen_pvm', 'tk_kokonaistulos_edellinen', 'tk_kokonaistulos_edellinen_pvm',
  'hh_taso_edellinen', 'hh_taso_edellinen_pvm', 'hh_kehityskohde', 'hh_vahvuus'];
const poimi = (d) => { const o = {}; JOHDETUT.forEach((k) => { if (d[k] !== undefined) o[k] = d[k]; }); return o; };

beforeAll(() => {
  globalThis.TM_TESTIKATALOGI = require('../lib/tm_testikatalogi.js');
  globalThis.TM_PIKAKENTAT = PIKA;
  globalThis.TM_ENNATYKSET = E;
  const H = require('../lib/tm_historia.js');
  globalThis.tmHhSnapshot = H.tmHhSnapshot; globalThis.tmTkiSnapshot = H.tmTkiSnapshot; globalThis.tmHistoriaLisaa = H.tmHistoriaLisaa;
});
const PK = () => require('../lib/tm_pikakirjaus.js');

// ─── Kirjoittajat (oikea koodi) ─────────────────────────────────────────────────────────────────────────
async function pikakirjaa(m, pvm, s) {
  const tul = { ponnauttelu: s.ponnauttelu, syotto: s.syotto, pujottelu: s.pujottelu, kuljetus_laukaus: s.kuljetus_laukaus, lin_30m: s.lin30m };
  const payload = PK()._testitulosPayload(tul, pvm, 'vp-uid', null, pvm + 'T10:00:00.000Z');
  return PK()._tallennaPelaajanTulokset(m.db, 'kpv', PID, payload, tul, pvm);
}
const T9 = lue('TalentMaster_Testaus_v9.html');
async function testaus9(m, pvm, s) {
  const ctx = { console: { warn() {} }, tmPaivaIso: PVM_LIB.tmPaivaIso, firebase: { firestore: { FieldValue: FV } },
    _aktiivinenTapahtuma: { pvm, pelaajatData: [{ id: PID }] }, _seuraId: 'kpv', _db: m.db,
    _tulokset: { [PID]: { ponnauttelu: { paras: s.ponnauttelu }, syotto: { paras: s.syotto }, pujottelu: { paras: s.pujottelu },
      kuljetus_laukaus: { raaka: s.kuljetus_laukaus, rangaistukset: [], ennenaikaiset: 0 }, lin_30m: { paras: s.lin30m } } },
    normiIka: N.normiIka, normSukupuoliMN: N.normSukupuoliMN, eerikkilaTaso: N.eerikkilaTaso, laskeD1Joustava: N.laskeD1Joustava, laskeD2HH: N.laskeD2HH,
    laskeKokonaistulos: CORE.laskeKokonaistulos, tkLaskeTKI: CORE.tkLaskeTKI, tkLaskeMerkki: CORE.tkLaskeMerkki, tkPituuspotkuBonus: CORE.tkPituuspotkuBonus,
    TM_PIKAKENTAT: PIKA, window: { TM_PIKAKENTAT: PIKA }, Object, Array, String, Math, parseFloat, parseInt, isNaN };   // Testaus_v9 _kuljetusLaukausTulos delegoi libiin (window.TM_PIKAKENTAT)
  vm.createContext(ctx);
  const src = [T9.slice(T9.indexOf('var _V6_HH_MAP ='), T9.indexOf('\n', T9.indexOf('var _V6_HH_MAP ='))),
    pura(T9, 'function _kuljetusLaukausTulos('), pura(T9, 'function _v6HhTaso('), pura(T9, 'function _v6TkLajitPikakentat('),
    pura(T9, 'function _v6PikakentatUpd('), pura(T9, 'async function _v6TallennaPelaajienKentat(')].join('\n');
  vm.runInContext(src + '\nfunction _v6EnnatyksetUpd() { return {}; } function _v6HistoriaUpd() { return {}; }\nthis.f = _v6TallennaPelaajienKentat;', ctx);
  const tila = await ctx.f();
  expect(tila.virhe, 'Testaus_v9 ei saa kaatua').toBe(0);
  return tila;
}
const TT = lue('TalentMaster_Testituonti_Master.html');
async function testituonti(m, pvm, s) {
  const ctx = { TM_ENNATYKSET: E, TM_PIKAKENTAT: PIKA, tmPaivaIso: PVM_LIB.tmPaivaIso, firebase: { firestore: { FieldValue: FV } }, Date, Object, parseFloat, isNaN, String };
  vm.createContext(ctx);
  const src = TT.slice(TT.indexOf('const TT_LIB_AVAIN ='), TT.indexOf('};', TT.indexOf('const TT_LIB_AVAIN =')) + 2) + '\n'
    + pura(TT, 'function ttLibTulokset(') + '\n' + pura(TT, 'async function ttTallennaPelaaja(');
  vm.runInContext(src + '\nthis.f = ttTallennaPelaaja;', ctx);
  const testit = { ponnauttelu: s.ponnauttelu, syotto: s.syotto, pujottelu: s.pujottelu, kuljetus_laukaus: s.kuljetus_laukaus, lin30m: s.lin30m };
  return ctx.f(m.db, 'kpv', { id: 'tt_' + pvm, pvm }, { tunniste: '12345678', testauspvm: pvm }, { testit }, null);
}

// ─── Excel_Tuonti-referenssi: ajetaan Excelin OMAA koodia (TKI-lohko + pvm-vahti + recalcHH:n kehityskohde) ──────
const EX = lue('TalentMaster_Excel_Tuonti.html');
function excelReferenssi(fd, pvmIso, s, uusiHhTaso) {
  const ctx = { tmPaivaIso: PVM_LIB.tmPaivaIso, hhKehityskohde: N.hhKehityskohde, normiIka: N.normiIka, tmPhvKoodi: require('../lib/tm_phv_tila.js').tmPhvKoodi, Math, Object, Array, String, Date, parseFloat, parseInt, isNaN };
  vm.createContext(ctx);
  const recalc = EX.indexOf('window.recalcHH = async function');
  const segAlku = EX.indexOf("    const joukkue = p.joukkue || (Array.isArray(p.joukkueet)", recalc);
  const segLoppu = EX.indexOf('else ikaDes = (joukkueIka != null) ? joukkueIka : null;', segAlku) + 'else ikaDes = (joukkueIka != null) ? joukkueIka : null;'.length;
  const kkAlku = EX.indexOf('    const hvK = Object.assign({}, hv);', segLoppu);
  const kkLoppu = EX.indexOf('\n', EX.indexOf('    const kk = (typeof hhKehityskohde', kkAlku));
  const tkiAlku = EX.indexOf('    let tki = null, merkki = null, vahvuus = null, kehityskohde = null, kokonaistulos = null;');
  const tkiBlokki = pura(EX, '    if (onTekniikka) {', tkiAlku);
  const vahti = pura(EX, '{\n          const _fd = p._firestoreData || {};', EX.indexOf('VAIHE 2 — kehitysvauhti: vangitse EDELLINEN'));
  const src = [
    pura(EX, 'const TK_KOKONAISRAJAT = {') + ';', pura(EX, 'const TK_LAJIT_META = {') + ';', pura(EX, 'function tkPituuspotkuBonus('),
    pura(EX, 'function laskeKokonaistulos('), pura(EX, 'function tkLaskeMerkki('), pura(EX, 'function tkLaskeTKI('),
    pura(EX, 'function _laskeVahvuudetJaKehityskohteet('), pura(EX, 'function _paivaIso('),
    'this.aja = function (p, pvmIso, testitSkalaari, ika, spTki, hhTaso, hv) {',
    '  const onTekniikka = true; const profiiliUpdate = {};',
    '  (function (sp) {',                                      // prosessoiExcel: TKI-lohko + profiiliUpdate + pvm-vahti
    EX.slice(tkiAlku, EX.indexOf('\n', tkiAlku)), tkiBlokki,
    '  if (vahvuus) profiiliUpdate.tki_vahvuus = vahvuus; if (kehityskohde) profiiliUpdate.tki_kehityskohde = kehityskohde;',
    vahti,
    '  })(spTki);',
    '  { p = Object.assign({}, p, { hh_pvm: pvmIso, hh_viimeisin: hv });',   // recalcHH ajetaan tuonnin jälkeen (oma skooppi)
    EX.slice(segAlku, segLoppu), EX.slice(kkAlku, kkLoppu),
    '  if (hhTaso != null) { profiiliUpdate.hh_kehityskohde = kk ? kk.kehityskohde : null; profiiliUpdate.hh_vahvuus = kk ? kk.vahvuus : null; } }',
    '  return profiiliUpdate; };',
  ].join('\n');
  vm.runInContext(src, ctx);
  const testitSkalaari = { ponnauttelu: s.ponnauttelu, syotto: s.syotto, pujottelu: s.pujottelu, kuljetus_laukaus: s.kuljetus_laukaus };
  const p = Object.assign({}, fd, { _firestoreData: fd });
  return ctx.aja(p, pvmIso, testitSkalaari, N.normiIka(fd.syntymaVuosi, pvmIso, fd.joukkue), 'M', uusiHhTaso, Object.assign({}, fd.hh_viimeisin || {}, { lin30m: s.lin30m }));
}

// ─── a) Tekniikkaprofiili pikakentistä ────────────────────────────────────────────────────────────────
const P7 = lue('TalentMaster_Pelaaja_v7.html');
function lataaTekniikka(pelaaja, db) {
  const ctx = { _pelaaja: pelaaja, window: { _db: db, TM_TESTIT: CANON }, draw: () => { ctx.piirretty = true; }, console: { warn: (...x) => { ctx.varoitus = x.join(' '); } },
    Date, Object, Array, String, Math, parseFloat, parseInt, isNaN, _minaTavoiteRivit: () => '' };
  vm.createContext(ctx);
  const src = 'var _tekniikkaData = null;\n' + P7.slice(P7.indexOf('const _TEK_LAJIT ='), P7.indexOf('\n', P7.indexOf('const _TEK_LAJIT ='))) + '\n'
    + pura(P7, 'function _tekniikkaPikakentista(') + '\n' + pura(P7, 'async function _lataaTekniikka(') + '\n' + pura(P7, 'function rMinaTekniikkaprofiili(')
    + '\nthis.lataa = _lataaTekniikka; this.data = function () { return _tekniikkaData; }; this.render = rMinaTekniikkaprofiili;';
  vm.runInContext(src, ctx);
  return ctx;
}

describe('a) Pelaaja_v7 · Tekniikkaprofiili lukee pikakentistä (ei alikokoelmakyselyä)', () => {
  it('JUURISYY-TOISTO: TK kirjattu Pikakirjauksella → _tekniikkaData EI tyhjä, ilman testitulokset-kyselyä', async () => {
    const m = mockDb({ [PEL]: TOPIAS });
    await pikakirjaa(m, D1, SYOTE[D1]);
    await pikakirjaa(m, D2, SYOTE[D2]);
    const pelaaja = Object.assign({ id: PID, seuraId: 'kpv' }, m.docs[PEL]);
    expect(pelaaja.tki_viimeisin, 'aineisto: TKI kirjoitettu').toEqual(expect.any(Number));
    const lukuDb = mockDb({});
    const ctx = lataaTekniikka(pelaaja, lukuDb.db);
    await ctx.lataa();
    const d = ctx.data();
    expect(ctx.varoitus).toBeUndefined();
    expect(d.tyhja).toBeUndefined();
    expect(d.tki).toBe(pelaaja.tki_viimeisin);
    expect(d.merkki).toBe(pelaaja.tki_merkki || null);
    expect(d.testit).toEqual({ ponnauttelu: 18, syotto: 26, pujottelu: 24, kuljetus_laukaus: 22 });   // sekunteina
    expect(d.vahvuudet.map((z) => z.laji)).toContain('ponnauttelu');
    expect(d.kehityskohteet.map((z) => z.laji)).toContain('syotto');
    expect(d.trendi).toEqual({ ero: 11, parani: true });                       // tk_kokonaistulos_edellinen 101 → 90
    expect(lukuDb.db.polut, 'EI alikokoelmakyselyä renderöinnissä (§26)').toEqual([]);
    expect(ctx.piirretty).toBe(true);
    const html = ctx.render();
    expect(html).toContain('Tekniikkaprofiili');
    expect(html).not.toContain('tulossa');
    expect(html).toContain('Ponnauttelu');
  });
  it('ennallaan: sama muoto kuin vanha alikokoelmalataaja (vk = sama kanoninen funktio samoista sekunneista)', async () => {
    const p = Object.assign({ id: PID }, TOPIAS, { tki_viimeisin: 70, tki_merkki: 'hopea', tki_pvm: D2, tk_lajit_pvm: D2,
      tk_lajit_viimeisin: { ponnauttelu_s: 18, syotto_s: 26, pujottelu_s: 24, kuljetus_laukaus_s: 22 } });
    const ctx = lataaTekniikka(p, mockDb({}).db); await ctx.lataa();
    const vanha = CANON._laskeVahvuudetJaKehityskohteet({ ponnauttelu: 18, syotto: 26, pujottelu: 24, kuljetus_laukaus: 22 }, { ika: 13 }, null);
    expect(ctx.data().vahvuudet).toEqual(vanha.vahvuudet);
    expect(ctx.data().kehityskohteet).toEqual(vanha.kehityskohteet);
    expect(Object.keys(ctx.data()).sort()).toEqual(['kehityskohteet', 'kpl', 'merkki', 'testit', 'tki', 'trendi', 'vahvuudet']);
    expect(ctx.data().trendi, 'ei edellistä → ei trendiä').toBeNull();
  });
  it('H-H syöttö/pujottelu -fallback säilyy, kun TK-pikakenttiä ei ole; ei mitään → "tulossa"', async () => {
    const a = lataaTekniikka(Object.assign({ id: PID }, TOPIAS, { hh_viimeisin: { syotto: 9.1, pujottelu: 10.2, lin30m: 5 } }), mockDb({}).db);
    await a.lataa();
    // PR G: H-H-arvot nimetään selvästi H-H-testiksi (eri testi kuin tekniikkakisan pujottelu/syöttö) — tunniste *_hh.
    expect(a.data()).toEqual({ tyhja: true, hhTekn: [{ laji: 'syotto_hh', nimi: 'Syöttö (H-H-testi)', aika: 9.1 }, { laji: 'pujottelu_hh', nimi: 'Pujottelu (H-H-testi)', aika: 10.2 }] });
    const b = lataaTekniikka(Object.assign({ id: PID }, TOPIAS), mockDb({}).db);
    await b.lataa();
    expect(b.data()).toEqual({ tyhja: true, hhTekn: null });
    expect(b.render()).toContain('Mittaukset tulossa');
  });
  it('demo-polku ennallaan + lähteessä ei enää testitulokset-kyselyä Tekniikkaprofiilissa', () => {
    expect(P7).toContain("if (!_isDemoUser) { _tekniikkaData = null; _lataaTekniikka(); }");
    const lataaja = (pura(P7, 'async function _lataaTekniikka(') + pura(P7, 'function _tekniikkaPikakentista(')).replace(/\/\/[^\n]*/g, '');
    expect(lataaja).not.toMatch(/collection\(|testitulokset|tekniikkakilpailu/);
  });
});

// ─── b) Kirjoittajat = Excel samasta syötteestä, samassa batchissa ─────────────────────────────────────
describe('b) Pikakirjaus / Testaus_v9 / Testituonti tuottavat johdetut pikakentät kuten Excel_Tuonti', () => {
  const KIRJOITTAJAT = { Pikakirjaus: pikakirjaa, Testaus_v9: testaus9, Testituonti_Master: testituonti };
  let excelD2, d1Tila;
  beforeAll(async () => {
    const m = mockDb({ [PEL]: TOPIAS });
    await pikakirjaa(m, D1, SYOTE[D1]);
    d1Tila = JSON.parse(JSON.stringify(m.docs[PEL]));
    await pikakirjaa(m, D2, SYOTE[D2]);
    excelD2 = excelReferenssi(d1Tila, D2, SYOTE[D2], m.docs[PEL].hh_taso);
  });
  it('EI VACUOUS: Excel-referenssi tuottaa kaikki johdetut kentät (vahvuus, kehityskohde, edelliset, hh-vahvuus)', () => {
    expect(excelD2).toMatchObject({ tki_vahvuus: 'ponnauttelu', tki_kehityskohde: 'syotto', tki_edellinen_pvm: D1,
      tk_kokonaistulos_edellinen: 101, tk_kokonaistulos_edellinen_pvm: D1, hh_taso_edellinen_pvm: D1, hh_vahvuus: 'lin30m', hh_kehityskohde: null });
    expect(excelD2.tki_edellinen).toEqual(expect.any(Number));
    expect(excelD2.hh_taso_edellinen).toEqual(expect.any(Number));
  });
  for (const [nimi, kirjoita] of Object.entries(KIRJOITTAJAT)) {
    it(nimi + ': päivä 1 → päivä 2 tuottaa SAMAT johdetut kentät kuin Excel, samassa batchissa testituloksen kanssa', async () => {
      const m = mockDb({ [PEL]: TOPIAS });
      await kirjoita(m, D1, SYOTE[D1]);
      expect(m.docs[PEL].tki_edellinen, '1. mittaus: ei edellistä').toBeUndefined();
      expect(m.docs[PEL].tki_vahvuus).toBe('ponnauttelu');
      await kirjoita(m, D2, SYOTE[D2]);
      const tila = m.docs[PEL];
      const odotus = Object.assign({}, excelD2);
      expect(poimi(tila)).toEqual(odotus);
      expect(m.erilliset, 'ei erillisiä kirjoituksia batchin ohi').toEqual([]);
      const viim = m.db.batches.at(-1);
      expect(viim, 'pikakentät (myös johdetut) samassa batchissa').toContain('update ' + PEL);
      if (nimi !== 'Testaus_v9') expect(viim.length, 'tulos + pelaaja samassa batchissa').toBe(2);   // Testaus_v9: tulos kirjoitettu jo kentällä
      // §26 pari-invariantti: arvo + pvm yhdessä
      ['tki_edellinen', 'tk_kokonaistulos_edellinen', 'hh_taso_edellinen'].forEach((k) => expect(tila[k + '_pvm'], k).toBe(D1));
      expect(tila.tki_pvm).toBe(D2); expect(tila.hh_pvm).toBe(D2); expect(tila.tk_lajit_pvm).toBe(D2);
    });
  }
  it('VP-ympäristö (tm_tki_core, ei testit_indeksit): tki_vahvuus/kehityskohde syntyy samoin', () => {
    const deps = { normiIka: N.normiIka, normSukupuoliMN: N.normSukupuoliMN, eerikkilaTaso: N.eerikkilaTaso, laskeD1Joustava: N.laskeD1Joustava, laskeD2HH: N.laskeD2HH,
      hhKehityskohde: N.hhKehityskohde, laskeKokonaistulos: CORE.laskeKokonaistulos, tkLaskeTKI: CORE.tkLaskeTKI, tkLaskeMerkki: CORE.tkLaskeMerkki,
      tkPituuspotkuBonus: CORE.tkPituuspotkuBonus, _laskeVahvuudetJaKehityskohteet: CORE._laskeVahvuudetJaKehityskohteet };
    const upd = PIKA.tmLaskePikakentat(d1Tila, { ponnauttelu: 18, syotto: 26, pujottelu: 24, kuljetus_laukaus: 22, lin_30m: 4.0 }, D2, deps);
    expect(poimi(upd)).toEqual(excelD2);
  });
  it('self-guard: ilman _laskeVahvuudetJaKehityskohteet/hhKehityskohde → kentät jäävät kirjoittamatta, ei kaadu', () => {
    const deps = { normiIka: N.normiIka, normSukupuoliMN: N.normSukupuoliMN, eerikkilaTaso: N.eerikkilaTaso,
      laskeKokonaistulos: CORE.laskeKokonaistulos, tkLaskeTKI: CORE.tkLaskeTKI, tkLaskeMerkki: CORE.tkLaskeMerkki };
    const upd = PIKA.tmLaskePikakentat(d1Tila, { ponnauttelu: 18, syotto: 26, pujottelu: 24, kuljetus_laukaus: 22, lin_30m: 4.0 }, D2, deps);
    expect(upd.tki_viimeisin).toEqual(expect.any(Number));
    ['tki_vahvuus', 'tki_kehityskohde', 'hh_vahvuus', 'hh_kehityskohde'].forEach((k) => expect(upd[k], k).toBeUndefined());
    expect(upd.tki_edellinen_pvm, 'edelliset eivät vaadi lisäriippuvuuksia').toBe(D1);
  });
  it('kanoninen _laskeVahvuudetJaKehityskohteet: tm_tki_core = testit_indeksit = Excel-inline (numerosyötteillä)', () => {
    const ctx = { Math, Object }; vm.createContext(ctx);
    vm.runInContext(pura(EX, 'const TK_LAJIT_META = {') + ';\n' + pura(EX, 'function _laskeVahvuudetJaKehityskohteet(') + '\nthis.f = _laskeVahvuudetJaKehityskohteet;', ctx);
    const syotteet = [SYOTE[D1], SYOTE[D2], { ponnauttelu: 10, syotto: 10, pujottelu: 10, kuljetus_laukaus: 10 }, { syotto: 45, pujottelu: 33 },
      { ponnauttelu: 5, syotto: 30, pujottelu: 9, kuljetus_laukaus: 6 }, {}];
    syotteet.forEach((t) => {
      const testit = {}; ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'].forEach((l) => { if (t[l] != null) testit[l] = t[l]; });
      const a = CORE._laskeVahvuudetJaKehityskohteet({ testit }, { ika: 12 });
      expect(a).toEqual(CANON._laskeVahvuudetJaKehityskohteet({ testit }, { ika: 12 }));
      const ex = ctx.f({ testit }, { ika: 12 });
      expect(ex.vahvuudet.map((z) => z.laji)).toEqual(a.vahvuudet.map((z) => z.laji));
      expect(ex.kehityskohteet.map((z) => z.laji)).toEqual(a.kehityskohteet.map((z) => z.laji));
    });
    expect(CORE.TK_LAJIT_META).toEqual(CANON.TK_LAJIT_META);
  });
  it('lataajat: Testaus_v9 + Testituonti lataavat libit; ?v nostettu kaikissa lataajissa', () => {
    for (const f of ['TalentMaster_Testaus_v9.html', 'TalentMaster_Testituonti_Master.html', 'TalentMaster_VP_v25.html']) {
      const s = lue(f);
      expect(s, f).toContain('<script src="lib/tm_tki_core.js?v=2"></script>');
      expect(s, f).toContain('<script src="lib/tm_pikakentat.js?v=6"></script>');   // v6: KL virallinen laskutapa (tmKlTulos)
      expect(s.indexOf('lib/tm_tki_core.js'), f + ': TKI-ydin ennen pikakenttiä').toBeLessThan(s.indexOf('lib/tm_pikakentat.js'));
    }
    expect(lue('TalentMaster_Master_v16.html')).toContain('<script src="lib/tm_pikakentat.js?v=6"></script>');
    const tt = lue('TalentMaster_Testituonti_Master.html');
    for (const l of ['lib/tm_pvm.js?v=3', 'lib/tm_eerikkila_normit.js?v=47']) expect(tt).toContain('<script src="' + l + '"></script>');
    for (const f of ['TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Testaus_v9.html', 'TalentMaster_Testituonti_Master.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) {
      expect(lue(f), f + ': ei vanhaa ?v:tä').not.toMatch(/tm_pikakentat\.js\?v=[34]"|tm_tki_core\.js\?v=1"/);
    }
  });
});

// ─── c) pvm-vahti ─────────────────────────────────────────────────────────────────────────────────────
describe('c) pvm-vahti: saman päivän uudelleenkirjaus EI vangitse _edellinen-arvoa', () => {
  for (const [nimi, kirjoita] of Object.entries({ Pikakirjaus: pikakirjaa, Testaus_v9: testaus9, Testituonti_Master: testituonti })) {
    it(nimi + ': päivä 2 kirjataan kahdesti (korjaus) → edellinen = päivän 1 arvo, ei päivän 2 ensimmäinen', async () => {
      const m = mockDb({ [PEL]: TOPIAS });
      await kirjoita(m, D1, SYOTE[D1]);
      const d1 = JSON.parse(JSON.stringify(m.docs[PEL]));
      await kirjoita(m, D2, Object.assign({}, SYOTE[D2], { ponnauttelu: 30, lin30m: 5.0 }));   // virheellinen syöttö
      await kirjoita(m, D2, SYOTE[D2]);                                                        // korjaus samana päivänä
      const t = m.docs[PEL];
      expect(t.tki_edellinen).toBe(d1.tki_viimeisin); expect(t.tki_edellinen_pvm).toBe(D1);
      expect(t.tk_kokonaistulos_edellinen).toBe(d1.tk_kokonaistulos_viimeisin); expect(t.tk_kokonaistulos_edellinen_pvm).toBe(D1);
      expect(t.hh_taso_edellinen).toBe(d1.hh_taso); expect(t.hh_taso_edellinen_pvm).toBe(D1);
      expect(t.tki_vahvuus, 'vahvuus päivittyy korjatusta tuloksesta').toBe('ponnauttelu');
    });
  }
  it('ensimmäinen kirjaus samana päivänä kuin olemassa oleva *_pvm → ei edellistä; vanhempi tulos → ei mitään (viimeisin-vartija)', () => {
    const d = { syntymaVuosi: 2013, sukupuoli: 'M', tki_viimeisin: 60, tki_pvm: D2, tk_kokonaistulos_viimeisin: 95, tk_lajit_pvm: D2, hh_taso: 3, hh_pvm: D2, hh_viimeisin: { lin30m: 5 } };
    const tul = { ponnauttelu: 18, syotto: 26, pujottelu: 24, kuljetus_laukaus: 22, lin_30m: 4.0 };
    const sama = PIKA.tmLaskePikakentat(d, tul, D2);
    ['tki_edellinen', 'tk_kokonaistulos_edellinen', 'hh_taso_edellinen'].forEach((k) => expect(sama[k], k).toBeUndefined());
    const vanha = PIKA.tmLaskePikakentat(d, tul, D1);
    expect(Object.keys(vanha).filter((k) => JOHDETUT.includes(k))).toEqual([]);
  });
});

// ─── d) diag-skripti on pelkkä lukija ─────────────────────────────────────────────────────────────────
describe('d) scripts/diag_phv_alkupera.js — vain luku', () => {
  const S = lue('scripts/diag_phv_alkupera.js');
  const koodi = S.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  it('ei kirjoituskutsuja (set/update/delete/add/batch/commit/create/transaktio/bulkWriter)', () => {
    expect(koodi).not.toMatch(/\.(set|update|delete|add|batch|commit|create|runTransaction|bulkWriter|recursiveDelete)\s*\(/);
    expect(koodi).toMatch(/\.get\(\)/);
  });
  it('gcloud ADC (ei palvelutilin avainta), Topias oletuksena, --seura/--id parametrit', () => {
    expect(koodi).not.toMatch(/serviceAccount|credential\.cert|GOOGLE_APPLICATION_CREDENTIALS|\.json['"]\)/);
    expect(koodi).toContain("admin.initializeApp({ projectId: 'talentmaster-pilot' })");
    expect(koodi).toContain("arg('id', 'm93GBdOaGCUuenMiCL0I')");
    expect(koodi).toContain("arg('seura', 'kpv')");
  });
  it('tulosteeseen ei nimiä', () => {
    expect(koodi).not.toMatch(/etunimi|sukunimi|pelaajaNimi|email/);
  });
});
