/**
 * Kolme hiljaista datavirhettä (§26 pari-invariantti + §7.6) — funktiot PURETAAN LÄHTEESTÄ ja AJETAAN mock-Firestorea
 * vasten. Mock-batch soveltaa operaatiot vasta commitissa; epäonnistuva commit → mitään ei tallennu.
 *   a) Testituonti_Master ttTallennaPelaaja: tulos + pikakentät batchina, ISO-aika taulukossa (ei serverTimestamp),
 *      FLEI-pari vain yhdessä, tuntematon PalloID → 'ohitettu' (EI haamudokkia)
 *   b) ADAR_Pikakortti _phKirjoitaHavaintoJaPikakentat: havainto + adar_* batchina (online + offline-jonon synkka)
 *   c) Testaus_v9 _v6TallennaPelaajienKentat: ennätykset + historia + pikakentät yhtenä kirjoituksena per pelaaja;
 *      tki_merkki poistetaan, jos uudella TKI:llä ei ole merkkiä
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
function pura(lahde, tunniste) {
  const i = lahde.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0; for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (syv === 0) return lahde.slice(i, k + 1); } }
}
const SENT = { serverTimestamp: { __sentinel: 'serverTimestamp' }, delete: { __sentinel: 'delete' } };
const FV = { serverTimestamp: () => SENT.serverTimestamp, delete: () => SENT.delete, arrayUnion: (...x) => ({ __arrayUnion: x }) };

/* Polkupohjainen mock: docs = { polku: data }, where-haku kenttäarvolla, batch kaikki-tai-ei-mitään. */
function mockDb({ docs = {}, kaada = false } = {}) {
  const erilliset = [];
  const ref = (p) => ({ id: p.split('/').pop(), path: p, collection: (n) => col(p + '/' + n),
    get: async () => ({ exists: p in docs, data: () => docs[p] }),
    set: async (d, o) => { if (kaada) throw Object.assign(new Error('write epäonnistui'), { code: 'unavailable' }); erilliset.push(p); docs[p] = (o && o.merge) ? Object.assign({}, docs[p], d) : d; },
    update: async () => erilliset.push(p) });
  const col = (p) => ({
    doc: (id) => ref(p + '/' + (id || 'auto' + Object.keys(docs).length)),
    get: async () => ({ docs: Object.keys(docs).filter((k) => k.startsWith(p + '/') && k.slice(p.length + 1).indexOf('/') < 0).map((k) => ({ id: k.split('/').pop(), ref: ref(k), data: () => docs[k] })) }),
    where: (kentta, op, arvo) => ({ limit: () => ({ get: async () => {
      const osumat = Object.keys(docs).filter((k) => k.startsWith(p + '/') && k.slice(p.length + 1).indexOf('/') < 0 && docs[k][kentta] === arvo);
      return { empty: !osumat.length, docs: osumat.map((k) => ({ id: k.split('/').pop(), ref: ref(k), data: () => docs[k] })) };
    } }) }),
    add: async () => erilliset.push(p),
  });
  const db = { collection: (n) => col(n), erilliset, batches: [],
    batch: () => { const ops = []; return {
      set: (r, d, o) => ops.push({ t: 'set', p: r.path, d, o }), update: (r, d) => ops.push({ t: 'update', p: r.path, d }),
      commit: async () => {
        if (kaada) throw Object.assign(new Error('commit epäonnistui'), { code: 'unavailable' });
        db.batches.push(ops.map((o) => o.t + ' ' + o.p));
        ops.forEach((o) => { docs[o.p] = (o.t === 'update' || (o.o && o.o.merge)) ? Object.assign({}, docs[o.p], o.d) : o.d; });
      } }; } };
  return { db, docs };
}
const sisaltaaSentinelin = (x, s) => JSON.stringify(x).includes(JSON.stringify(s));

// ─── a) Testituonti_Master ────────────────────────────────────────────────────────────────────────────────
describe('a) Testituonti_Master · ttTallennaPelaaja', () => {
  const T = lue('TalentMaster_Testituonti_Master.html');
  const aja = (db, p, fleiPct) => {
    const ctx = { firebase: { firestore: { FieldValue: FV } }, Date };
    vm.createContext(ctx); vm.runInContext(pura(T, 'async function ttTallennaPelaaja(') + '\nthis.f = ttTallennaPelaaja;', ctx);
    return ctx.f(db, 'kpv', { id: 'tt1', pvm: '2026-10-03' }, p, { testit: { kyykky: 3 }, tallennettu: SENT.serverTimestamp }, fleiPct);
  };
  const PEL = 'seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I';
  it('löytyy tunniste-kentällä → tulos + FLEI-pari + historia samassa batchissa; taulukossa ISO-aika, ei serverTimestampia', async () => {
    const m = mockDb({ docs: { [PEL]: { tunniste: '12345678', etunimi: 'Topias' } } });
    expect(await aja(m.db, { tunniste: '12345678', testauspvm: '2026-10-03' }, 72)).toBe('ok');
    expect(m.db.batches).toEqual([['set seurat/kpv/testitapahtumat/tt1/tulokset/12345678', 'update ' + PEL]]);
    expect(m.docs[PEL]).toMatchObject({ flei_viimeisin: 72, flei_pvm: '2026-10-03' });
    const rivi = m.docs[PEL].flei_historia.__arrayUnion[0];
    expect(typeof rivi.tallennettu).toBe('string');
    expect(sisaltaaSentinelin(m.docs[PEL].flei_historia, SENT.serverTimestamp), '§7.6: serverTimestamp taulukossa').toBe(false);
    expect(m.db.erilliset).toEqual([]);
  });
  it('fleiPct null → EI flei_pvm:ää ilman arvoa (pari vain yhdessä), EI historiariviä', async () => {
    const m = mockDb({ docs: { [PEL]: { tunniste: '12345678' } } });
    await aja(m.db, { tunniste: '12345678', testauspvm: '2026-10-03', phv_tila: 'PRE' }, null);
    expect(m.docs[PEL]).toEqual({ tunniste: '12345678', phv_tila: 'PRE' });
  });
  it('palloID-kenttä toimii varahakuna (vanhat tuonnit)', async () => {
    const m = mockDb({ docs: { [PEL]: { palloID: '12345678' } } });
    expect(await aja(m.db, { tunniste: '12345678' }, 50)).toBe('ok');
    expect(m.docs[PEL].flei_viimeisin).toBe(50);
  });
  it('tuntematon PalloID → ohitettu: EI tulosta, EI pelaajadokkia (ei haamua doc-ID:llä = PalloID)', async () => {
    const m = mockDb({ docs: { [PEL]: { tunniste: '99999999' } } });
    expect(await aja(m.db, { tunniste: '12345678' }, 50)).toBe('ohitettu');
    expect(Object.keys(m.docs)).toEqual([PEL]);
    expect(m.db.batches).toEqual([]); expect(m.db.erilliset).toEqual([]);
  });
  it('commit epäonnistuu → ei tulosta eikä pikakenttiä', async () => {
    const m = mockDb({ docs: { [PEL]: { tunniste: '12345678' } }, kaada: true });
    await expect(aja(m.db, { tunniste: '12345678', testauspvm: '2026-10-03' }, 72)).rejects.toThrow();
    expect(m.docs).toEqual({ [PEL]: { tunniste: '12345678' } });
  });
  it('tallennussilmukka käyttää apuria eikä enää luo dokkia .doc(p.tunniste)-fallbackilla', () => {
    const t = pura(T, 'async function tallennaFirestoreen(');
    expect(t).toContain('await ttTallennaPelaaja(db, seuraId, tapahtuma, p, tallennusData, fleiPct)');
    expect(t).toContain("if (tulos === 'ohitettu') { ohitetut.push(p); continue; }");
    expect(T).not.toMatch(/collection\('pelaajat'\)\.doc\(p\.tunniste\)/);
    const ilmanKommentteja = T.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(ilmanKommentteja).not.toMatch(/arrayUnion\(\{[^}]*serverTimestamp/);
  });
});

// ─── b) ADAR_Pikakortti ───────────────────────────────────────────────────────────────────────────────────
describe('b) ADAR_Pikakortti · havainto + adar_*-pikakentät batchina', () => {
  const A = lue('TalentMaster_ADAR_Pikakortti.html');
  const PEL = 'seurat/kpv/pelaajat/p1';
  const aja = (m, laske, onLahetetty) => {
    const nahdyt = [];
    const ctx = { _PH_DB: m.db, Date, console: { warn() {} }, _phIka: () => 13,
      tmAdarPikakentat: laske || ((hav) => { nahdyt.push(hav.length); return { adar_viimeisin: { yht: 2, pvm: '2026-10-03' }, adar_pvm: '2026-10-03', adar_havaintoja: hav.length }; }),
      window: { _pelaajaMap: { p1: {} } } };
    vm.createContext(ctx);
    vm.runInContext(pura(A, 'function _phPelaajaRef(') + '\n' + pura(A, 'async function _phKirjoitaHavaintoJaPikakentat(') + '\nthis.f = _phKirjoitaHavaintoJaPikakentat; this.ref = _phPelaajaRef;', ctx);
    const havRef = ctx.ref('kpv', 'p1').collection('havainnot').doc('h2');
    return { p: ctx.f(havRef, { pisteet: { A: 2 }, porras: 1 }, 'kpv', 'p1', 1, true, onLahetetty), nahdyt, ctx };
  };
  const HAV = PEL + '/havainnot/h2', HAV3 = PEL + '/havainnot/h3';
  it('havainto OMANA kirjoituksenaan ENSIN, pikakentät (adar_viimeisin + adar_pvm yhdessä) erikseen; uusi havainto mukana laskennassa', async () => {
    const m = mockDb({ docs: { [PEL]: { etunimi: 'Topias' }, [PEL + '/havainnot/h1']: { pisteet: { A: 1 } } } });
    let lahetetty = false;
    const r = aja(m, null, () => { lahetetty = true; });
    await r.p;
    expect(lahetetty).toBe(true);
    expect(r.nahdyt).toEqual([2]);
    expect(m.db.erilliset, 'järjestys: havainto ensin, sitten pelaajan pikakentät').toEqual([HAV, PEL]);
    expect(m.db.batches, 'EI yhteistä batchia: toisen opin hylkäys veisi havainnon').toEqual([]);
    expect(m.docs[PEL]).toMatchObject({ adar_pvm: '2026-10-03', adar_viimeisin: { pvm: '2026-10-03' }, havainto_porras: 1 });
    expect(r.ctx.window._pelaajaMap.p1.adar_pvm).toBe('2026-10-03');
  });
  it('havainnon kirjoitus epäonnistuu → promise hylkää (UI näyttää virheen); ei pikakenttien sivuvaikutusta havainnon puuttuessa ei ole estetty', async () => {
    const m = mockDb({ docs: { [PEL]: { etunimi: 'Topias' } }, kaada: true });
    await expect(aja(m).p).rejects.toThrow();
    expect(m.docs[HAV], 'havaintoa ei saa olla').toBeUndefined();
  });
  it('pikakenttälaskenta kaatuu → havainto kirjoitetaan silti (data ei katoa), pikakentät seuraavalla', async () => {
    const m = mockDb({ docs: { [PEL]: {} } });
    await aja(m, () => { throw new Error('laskenta'); }).p;
    expect(m.db.erilliset).toEqual([HAV]);
  });
  it('pikakenttäkirjoitus hylätään (esim. Rules) → havainto silti tallessa JA promise ei hylkää (EI vacuous: pelaajadokin set todella heittää)', async () => {
    const m = mockDb({ docs: { [PEL]: { etunimi: 'Topias' } } });
    let pikakenttaYritys = 0;
    const ctx = { _PH_DB: m.db, Date, console: { warn() {} }, _phIka: () => 13,
      tmAdarPikakentat: () => ({ adar_viimeisin: { yht: 2, pvm: '2026-10-03' }, adar_pvm: '2026-10-03' }),
      window: { _pelaajaMap: { p1: {} } } };
    vm.createContext(ctx);
    vm.runInContext(pura(A, 'function _phPelaajaRef(') + '\n' + pura(A, 'async function _phKirjoitaHavaintoJaPikakentat(')
      + '\nthis.f = _phKirjoitaHavaintoJaPikakentat; this.ref = _phPelaajaRef;', ctx);
    const pRef = ctx.ref('kpv', 'p1');
    const havRef = pRef.collection('havainnot').doc('h3');
    // pelaajadokin set hylätään; havainnon set kirjautuu
    const alkupSet = pRef.set;
    pRef.set = async () => { pikakenttaYritys++; throw Object.assign(new Error('denied'), { code: 'permission-denied' }); };
    ctx._phPelaajaRef = () => pRef;
    havRef.set = async (d) => { m.docs[HAV3] = d; };
    expect(alkupSet).toBeTruthy();
    await ctx.f(havRef, { pisteet: { A: 2 }, porras: 1 }, 'kpv', 'p1', 1, true);
    await new Promise((r) => setTimeout(r, 0));
    expect(pikakenttaYritys, 'pikakenttäkirjoitusta ei yritetty → testi vacuous').toBe(1);
    expect(m.docs[HAV3], 'havainto katosi pikakenttäkirjoituksen hylkäyksen takia').toBeTruthy();
  });
  it('online-tallennus ja offline-jonon synkka käyttävät molemmat atomista apuria', () => {
    expect(pura(A, 'async function _phTallenna(')).toContain('_phKirjoitaHavaintoJaPikakentat(ref, data, seuraId, pelaajaId, S.porras, porrasTallennetaan, _lahetetty);');
    const s = pura(A, 'async function _synkronoiOfflineJono(');
    expect(s).toContain('await _phKirjoitaHavaintoJaPikakentat(havRef,');
    expect(s).not.toContain('.add(');
  });
  it('PWA: sw_adar CACHE nostettu (HTML muuttui)', () => {
    expect(lue('sw_adar.js')).toMatch(/const CACHE = 'tm-adar-v([7-9]|\d\d+)'/);
  });
});

// ─── c) Testaus_v9 ────────────────────────────────────────────────────────────────────────────────────────
describe('c) Testaus_v9 · valmiiksi-merkinnän pelaajakentät yhtenä kirjoituksena', () => {
  const T9 = lue('TalentMaster_Testaus_v9.html');
  const PEL = (id) => 'seurat/kpv/pelaajat/' + id;
  const aja = (m, upd) => {
    const ctx = { _db: m.db, _seuraId: 'kpv', console: { warn() {} },
      _aktiivinenTapahtuma: { pelaajatData: [{ id: 'a' }, { id: 'b' }, { id: 'puuttuu' }] },
      _v6EnnatyksetUpd: (pl) => (upd[pl.id] || {}).e || {}, _v6HistoriaUpd: (pl) => (upd[pl.id] || {}).h || {}, _v6PikakentatUpd: (pl) => (upd[pl.id] || {}).p || {} };
    vm.createContext(ctx); vm.runInContext(pura(T9, 'async function _v6TallennaPelaajienKentat(') + '\nthis.f = _v6TallennaPelaajienKentat;', ctx);
    return ctx.f();
  };
  const upd = { a: { e: { ennatykset: { lin30m: { paras: 4.6 } } }, h: { hh_historia: [{ pvm: '2026-10-03' }] }, p: { hh_viimeisin: { lin30m: 4.6 }, hh_pvm: '2026-10-03' } },
    b: { p: { tki_viimeisin: 55, tki_pvm: '2026-10-03' } } };
  it('per pelaaja YKSI kirjoitus (ennätykset + historia + pikakentät); puuttuva profiili ohitetaan', async () => {
    const m = mockDb({ docs: { [PEL('a')]: {}, [PEL('b')]: {} } });
    expect(await aja(m, upd)).toEqual({ ok: 2, virhe: 0, ohitettu: 1 });
    expect(m.db.batches).toEqual([['update ' + PEL('a')], ['update ' + PEL('b')]]);
    expect(Object.keys(m.docs[PEL('a')]).sort()).toEqual(['ennatykset', 'hh_historia', 'hh_pvm', 'hh_viimeisin']);
    expect(m.db.erilliset).toEqual([]);
  });
  it('kirjoitus epäonnistuu → pelaajalle ei osittaista tilaa, virhe raportoidaan', async () => {
    const m = mockDb({ docs: { [PEL('a')]: { hh_pvm: '2026-04-01' }, [PEL('b')]: {} }, kaada: true });
    expect(await aja(m, upd)).toEqual({ ok: 0, virhe: 2, ohitettu: 1 });
    expect(m.docs[PEL('a')]).toEqual({ hh_pvm: '2026-04-01' });
  });
  it('valmiiksi-merkintä kutsuu yhdistettyä tallennusta (ei enää kolmea erillistä) ja näyttää virheet', () => {
    const f = T9.slice(T9.indexOf('window._v6MerkitseValmiiksi = async function'), T9.indexOf('window._v6MerkitseValmiiksi = async function') + 2500);
    expect(f).toContain('await _v6TallennaPelaajienKentat()');
    expect(T9).not.toMatch(/function _v6TallennaEnnatykset|function _v6TallennaHistoria\(|function _v6TallennaPikakentat\(/);
  });
  it('tki_merkki: uusi TKI ilman merkkiä → FieldValue.delete() (vanha merkki ei jää); merkin kanssa → merkki', () => {
    const tee = (merkki) => {
      const ctx = { console: { warn() {} }, tmPaivaIso: () => '2026-10-03', _aktiivinenTapahtuma: { pvm: '2026-10-03' },
        _tulokset: { a: { ponnauttelu: 20, syotto: 25, pujottelu: 22, kuljetus_laukaus: 18 } },
        normiIka: () => 11, normSukupuoliMN: () => 'M', laskeKokonaistulos: () => 85, tkLaskeTKI: () => 62, tkLaskeMerkki: () => merkki,
        _v6TkLajitPikakentat: () => null, _V6_HH_MAP: {}, _v6HhTaso: () => null, _kuljetusLaukausTulos: (x) => x,
        firebase: { firestore: { FieldValue: FV } } };
      vm.createContext(ctx); vm.runInContext(pura(T9, 'function _v6PikakentatUpd(') + '\nthis.f = _v6PikakentatUpd;', ctx);
      return ctx.f({ id: 'a' }, { syntymaVuosi: 2015, sukupuoli: 'M', tki_merkki: 'kulta' });
    };
    const ilman = tee(null);
    expect(ilman).toMatchObject({ tki_viimeisin: 62, tki_pvm: '2026-10-03' });
    expect(ilman.tki_merkki).toBe(SENT.delete);
    expect(tee('hopea').tki_merkki).toBe('hopea');
  });
});
