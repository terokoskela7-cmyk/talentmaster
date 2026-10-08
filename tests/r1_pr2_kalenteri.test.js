/**
 * R1 PR 2 — kalenteri: "Kenelle" (ryhmä · poimitut · useampi joukkue · Vain valmennus / henkilökunta), ryhmätapahtuman kokoonpano + jäädytys, jäsenmuutoksen synkka, Masterin omat ryhmät,
 * pelaajan/huoltajan suodatin (henkilökunnan tapahtumat piilossa). SIVUN OIKEA koodi vm:ssä (VP + Master). Rules-testit: tests/rules (v3.49).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const R = require('../lib/tm_ryhmat.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const VP = lue('TalentMaster_VP_v25.html'), MA = lue('TalentMaster_Master_v16.html'), PE = lue('TalentMaster_Pelaaja_v7.html'), VA = lue('TalentMaster_Vanhempi_v2.html');
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); } } throw new Error('ei päättynyt'); }

describe('näkyvyys: Vain valmennus / henkilökunta', () => {
  it('oletus palaveri-tyypeille (jaksopalaveri, valmentajapalaveri, tiimipalaveri, kokous, kalibraatiopaja, mentorointi); muut kaikille; eksplisiittinen nakyvyys voittaa', () => {
    for (const t of ['jaksopalaveri', 'valmentajapalaveri', 'tiimipalaveri', 'kokous', 'kalibraatiopaja', 'mentorointitapaaminen']) { expect(R.tmOletusNakyvyys(t), t).toBe('henkilokunta'); expect(R.tmNakyvyys({ tyyppi: t }), t).toBe('henkilokunta'); }
    for (const t of ['harjoitus', 'ottelu', 'testitapahtuma', 'talenttileiri', 'muu', undefined]) expect(R.tmNakyvyys({ tyyppi: t }), String(t)).toBe('kaikki');
    expect(R.tmNakyvyys({ tyyppi: 'jaksopalaveri', nakyvyys: 'kaikki' })).toBe('kaikki'); expect(R.tmNakyvyys({ tyyppi: 'harjoitus', nakyvyys: 'henkilokunta' })).toBe('henkilokunta'); expect(R.tmNakyvyys({ tyyppi: 'ottelu', nakyvyys: 'outo' })).toBe('kaikki'); expect(R.tmNakyvyys(null)).toBe('kaikki');
  });
  it('pelaajan/huoltajan suodatin: henkilökunnan tapahtuma EI näy; VANHA tapahtuma ilman kenttää (harjoitus, ottelu) näkyy ennallaan → kalenteri ei tyhjene', () => {
    const p = { id: 'a', joukkue: 'KPV U13', joukkueet: ['kpv_u13'] };
    expect(R.tmTapahtumaKuuluuPelaajalle({ tyyppi: 'harjoitus', joukkue: 'kpv_u13' }, p)).toBe(true); expect(R.tmTapahtumaKuuluuPelaajalle({ tyyppi: 'ottelu', joukkueet: ['kpv_u13'] }, p)).toBe(true);
    expect(R.tmTapahtumaKuuluuPelaajalle({ tyyppi: 'harjoitus', joukkue: 'kpv_u13', nakyvyys: 'henkilokunta' }, p)).toBe(false); expect(R.tmTapahtumaKuuluuPelaajalle({ tyyppi: 'jaksopalaveri', joukkue: 'kpv_u13' }, p)).toBe(false); expect(R.tmTapahtumaKuuluuPelaajalle({ tyyppi: 'kokous', pelaajat_id: ['a'] }, p)).toBe(false);
    expect(R.tmTapahtumaKuuluuPelaajalle({ tyyppi: 'harjoitus', nakyvyys: 'kaikki', pelaajat_id: ['a'], kohde: { tyyppi: 'ryhma' } }, p)).toBe(true);
  });
  it('B4: Pelaaja_v7 ja Vanhempi_v2 EIVÄT suodata selaimessa (_p7EvKuuluu / _vanhEvKuuluu poistettu) — rajaus palvelimella; palvelimen lib antaa näkyvyydestä saman vastauksen kuin tmNakyyPelaajalle', () => {
    expect(PE).not.toContain('function _p7EvKuuluu('); expect(VA).not.toContain('function _vanhEvKuuluu(');
    const S = require('../lib/tm_kalenteri_pelaajalle.js'); const docs = [{ id: 'kpv_u13', nimi: 'KPV U13' }]; const p = { id: 'a', joukkue: 'KPV U13', joukkueet: ['kpv_u13'] };
    const tapaukset = [{ tyyppi: 'harjoitus', joukkue: 'kpv_u13' }, { tyyppi: 'harjoitus', joukkue: 'kpv_u13', nakyvyys: 'henkilokunta' }, { tyyppi: 'jaksopalaveri', joukkue: 'kpv_u13' }, { tyyppi: 'jaksopalaveri', joukkue: 'kpv_u13', nakyvyys: 'kaikki' }, { tyyppi: 'kokous', pelaajat_id: ['a'] }, { tyyppi: 'ottelu', pelaajat_id: ['a'] }];
    for (const ev of tapaukset) expect(S.tmKuuluuPelaajalle(ev, p, docs), JSON.stringify(ev)).toBe(R.tmTapahtumaKuuluuPelaajalle(ev, p));
  });
});

describe('Kenelle → tapahtuman kohdekentät', () => {
  const RY = [{ id: 'mv', nimi: 'Maalivahdit', aktiivinen: true, valmentajat: ['u1'] }], NIMET = { kpv_u13: 'KPV U13', kpv_u15: 'KPV U15' };
  it('joukkue (ennallaan: joukkue/joukkueet/pelaajat_id oletus), useampi joukkue, ryhmä (jäsenet nyt + kohde), poimitut, Vain henkilökunta', () => {
    expect(R.tmKenelleDoc({ tapa: 'joukkue', joukkue: 'kpv_u13', joukkueNimet: NIMET }, { oletusPelaajat: ['x'] }).osa).toEqual({ joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'], pelaajat_id: ['x'], kohde: { tyyppi: 'joukkue' }, nakyvyys: 'kaikki' });
    expect(R.tmKenelleDoc({ tapa: 'joukkue', joukkue: '' }, {}).osa).toMatchObject({ joukkue: null, joukkueet: [], kohde: { tyyppi: 'joukkue' } });
    expect(R.tmKenelleDoc({ tapa: 'joukkueet', joukkueet: ['kpv_u13', 'kpv_u15', 'kpv_u13'], joukkueNimet: NIMET }, {}).osa).toEqual({ joukkue: null, joukkue_nimi: 'KPV U13 · KPV U15', joukkueet: ['kpv_u13', 'kpv_u15'], pelaajat_id: [], kohde: { tyyppi: 'joukkueet' }, nakyvyys: 'kaikki' });
    expect(R.tmKenelleDoc({ tapa: 'ryhma', ryhma_id: 'mv' }, { ryhmat: RY, ryhmaIdt: ['a', 'b', 'a'] }).osa).toEqual({ joukkue: null, joukkue_nimi: null, joukkueet: [], pelaajat_id: ['a', 'b'], kohde: { tyyppi: 'ryhma', ryhma_id: 'mv', ryhma_nimi: 'Maalivahdit' }, nakyvyys: 'kaikki' });
    expect(R.tmKenelleDoc({ tapa: 'pelaajat', pelaajat_id: ['p', 'q', 'p'] }, {}).osa).toMatchObject({ pelaajat_id: ['p', 'q'], kohde: { tyyppi: 'pelaajat' }, joukkue: null, nakyvyys: 'kaikki' });
    expect(R.tmKenelleDoc({ tapa: 'henkilokunta' }, {}).osa).toEqual({ joukkue: null, joukkue_nimi: null, joukkueet: [], pelaajat_id: [], kohde: { tyyppi: 'henkilokunta' }, nakyvyys: 'henkilokunta' });
  });
  it('VALIDOINTI: ryhmää ei valittu / tuntematon, ei joukkueita, ei pelaajia → { ok:false } + virheteksti', () => {
    expect(R.tmKenelleDoc({ tapa: 'ryhma', ryhma_id: '' }, { ryhmat: RY })).toEqual({ ok: false, syy: 'ryhma' }); expect(R.tmKenelleDoc({ tapa: 'ryhma', ryhma_id: 'ei' }, { ryhmat: RY }).ok).toBe(false); expect(R.tmKenelleDoc({ tapa: 'joukkueet', joukkueet: [] }, {})).toEqual({ ok: false, syy: 'joukkueet' }); expect(R.tmKenelleDoc({ tapa: 'pelaajat', pelaajat_id: [] }, {})).toEqual({ ok: false, syy: 'pelaajat' });
    for (const s of ['ryhma', 'joukkueet', 'pelaajat']) expect(R.tmKenelleVirhe(s, {})).toMatch(/Valitse/);
  });
  it('lomake-HTML: viisi tapaa (Master: neljä), oletus valitaan, ryhmät jäsenmäärineen, "Vain valmennus / henkilökunta" + ohje; lue/näytä toimii juuren kautta', () => {
    const h = R.tmKenelleHTML({ tapa: 'henkilokunta', joukkueNimet: NIMET, ryhmat: [{ id: 'mv', nimi: 'Maalivahdit', pelaajat_id: ['a', 'b'] }, { id: 'x', nimi: 'Vanha', aktiivinen: false }], pelaajat: [{ id: 'a', nimi: 'Aatu', joukkue: 'KPV U13' }], joukkueTapaNimi: 'Joukkue' });
    for (const t of ['Joukkue', 'Useampi joukkue', 'Ryhmä', 'Poimitut pelaajat', 'Vain valmennus / henkilökunta', 'Ei näy pelaajalle eikä huoltajalle.', 'Maalivahdit · 2 jäsentä', 'Aatu · KPV U13']) expect(h, t).toContain(t); expect(h).toContain('<option value="henkilokunta" selected>'); expect(h).not.toContain('Vanha'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(R.tmKenelleHTML({ sallitut: ['joukkue', 'henkilokunta'] })).not.toContain('value="ryhma"');
    const os = {}; const root = { querySelector: (q) => (q === '[data-kn-tapa]' ? { value: 'ryhma' } : q === '[data-kn-ryhma]' ? { value: 'mv' } : null), querySelectorAll: (q) => (q === '[data-kn-os]' ? ['joukkueet', 'ryhma', 'pelaajat', 'henkilokunta'].map((n) => ({ getAttribute: () => n, style: os[n] = os[n] || {} })) : q === '[data-kn-joukkue]' ? [{ checked: true, getAttribute: () => 'kpv_u13' }, { checked: false, getAttribute: () => 'kpv_u15' }] : []) };
    R.tmKenelleNayta(root); expect(os).toEqual({ joukkueet: { display: 'none' }, ryhma: { display: 'block' }, pelaajat: { display: 'none' }, henkilokunta: { display: 'none' } }); expect(R.tmKenelleLue(root)).toEqual({ tapa: 'ryhma', joukkueet: ['kpv_u13'], pelaajat_id: [], ryhma_id: 'mv' }); expect(R.tmKenelleLue(null).tapa).toBe('joukkue');
  });
  it('Masterin kalenteri: ryhmätapahtuma vain ryhmän valmentajalle / johdolle / luojalle; poimitut vain omille pelaajille; joukkue-/henkilökuntatapahtumat ennallaan', () => {
    const ry = { kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, luoja_uid: 'vp' };
    expect(R.tmNakyyKalenterissa(ry, { uid: 'u1', ryhmaIdt: ['mv'] })).toBe(true); expect(R.tmNakyyKalenterissa(ry, { uid: 'u2', ryhmaIdt: [] })).toBe(false); expect(R.tmNakyyKalenterissa(ry, { uid: 'u2', johto: true, ryhmaIdt: [] })).toBe(true); expect(R.tmNakyyKalenterissa(ry, { uid: 'vp', ryhmaIdt: [] })).toBe(true);
    const po = { kohde: { tyyppi: 'pelaajat' }, pelaajat_id: ['a'], luoja_uid: 'x' }; expect(R.tmNakyyKalenterissa(po, { uid: 'u', omatPelaajat: ['a', 'b'] })).toBe(true); expect(R.tmNakyyKalenterissa(po, { uid: 'u', omatPelaajat: ['z'] })).toBe(false);
    for (const k of [{ kohde: { tyyppi: 'joukkue' } }, { kohde: { tyyppi: 'henkilokunta' } }, {}]) expect(R.tmNakyyKalenterissa(k, { uid: 'u', ryhmaIdt: [] })).toBe(true);
  });
  it('jäädytysoikeus (peilaa Rules v3.49): luoja | johto | ryhmän valmentaja; muu ei', () => {
    const ev = { luoja_uid: 'l' }, ry = { valmentajat: ['v'] }; expect([R.tmVoiJaadyttaa(ev, ry, { uid: 'l' }), R.tmVoiJaadyttaa(ev, ry, { uid: 'v' }), R.tmVoiJaadyttaa(ev, ry, { uid: 'x', johto: true }), R.tmVoiJaadyttaa(ev, ry, { uid: 'x' }), R.tmVoiJaadyttaa(ev, null, { uid: 'x' })]).toEqual([true, true, true, false, false]);
    expect(R.tmJaadytysKentat(['a', 'b'], '2026-11-05T18:00:00.000Z')).toEqual({ pelaajat_id: ['a', 'b'], jaadytetty: '2026-11-05T18:00:00.000Z' });
  });
});

/* ── Adapterit (vm) ── */
const NYT = new Date(), PVM = (p) => new Date(Date.now() + p * 86400000);
const PEL = [{ id: 'a', etunimi: 'Aatu', sukunimi: 'A', joukkue: 'KPV U13' }, { id: 'b', etunimi: 'Bo', sukunimi: 'B', joukkue: 'KPV U15' }, { id: 'c', etunimi: 'Cee', sukunimi: 'C', joukkue: 'KPV U13' }];
const RYH = (o = {}) => Object.assign({ id: 'mv', nimi: 'Maalivahdit', tyyppi: 'lista', pelaajat_id: ['a', 'b'], valmentajat: ['mv-uid'], aktiivinen: true }, o);
const TS = (d) => ({ toDate: () => d });
function ymp(sov, o = {}) {
  const master = sov === 'Master', src = master ? MA : VP, log = { batch: [], update: [], toast: [], warn: [] };
  const docsOf = (ids) => PEL.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, data: () => ({ etunimi: p.etunimi, sukunimi: p.sukunimi, joukkue: p.joukkue }) }));
  const mkRef = (polku) => ({ polku, collection: (c) => mkRef(polku + '/' + c), doc: (d) => mkRef(polku + '/' + d), where: (a, op, v) => ({ get: async () => (/\/pelaajat$/.test(polku) ? { docs: docsOf(v) } : { docs: (o.kalenteri || []).filter((e) => e.kohde && e.kohde.ryhma_id === v).map((e) => ({ id: e.id, data: () => { const { id, ...x } = e; return x; } })) }) }), get: async () => ({ docs: [], exists: false }) });
  const db = { collection: (c) => mkRef(c), batch: () => { const ops = []; return { set: (r, d, op) => ops.push(['set', r.polku, d, op]), update: (r, d) => ops.push(['update', r.polku, d]), commit: async () => { if (o.kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); log.batch.push(ops); } }; } };
  const sb = { window: { TM_RYHMAT: R, _ryLista: o.ryLista === undefined ? [RYH()] : o.ryLista, _mRyLista: o.ryLista === undefined ? [RYH()] : o.ryLista }, console: { warn: (...a) => log.warn.push(a), error() {} }, Object, Array, Date, JSON, Math, Promise, String, Number, firebase: { auth: () => ({ currentUser: { getIdToken: async () => 't' } }), firestore: { FieldValue: { serverTimestamp: () => 'TS' }, FieldPath: { documentId: () => '__id__' } } },
    db, _db: db, _seuraId: 's', _uid: o.uid || 'mv-uid', _isDemoMode: false, _demo: false, _pelaajat: PEL, _pelaajatData: PEL, _tmHenkiloNimi: (p) => p.etunimi + ' ' + p.sukunimi, _vpEsc: (x) => String(x), _mEsc: (x) => String(x), vpT: (x) => x, masterT: (x) => x,
    toast: (t, k) => log.toast.push([t, k]), _ryCtx: () => ({ uid: o.uid || 'mv-uid', johto: !!o.johto }), _ryPelaajat: () => PEL.map((p) => ({ id: p.id, nimi: p.etunimi, joukkue: p.joukkue, joukkueet: [] })), _ryHaeListaHiljaa: async () => {}, _mRyJohto: () => !!o.johto, _calMerkUid: () => o.uid || 'mv-uid', _auth: { currentUser: { getIdToken: async () => 't' } }, _mTuoreToken: async () => {},
    _tmLaskuri() {}, _tmLaskuriVP() {}, renderCal() {}, renderKalenteri() {}, _kalenteriTapahtumat: [], _mRyHaeLista: async () => sb.window._mRyLista, _mRyJasenIdt: async (r) => r.pelaajat_id || [] };
  sb.window._mRyHaeLista = sb._mRyHaeLista; vm.createContext(sb);
  const ap = [];
  if (master) { ap.push(funktio(src, 'async function _mRyKokoonpano(t)'), funktio(src, 'async function _calHaeOsallistujat(t)'), funktio(src, 'async function _calTallennaLasnaolo(t, roster, state, btn)')); }
  else { ap.push(funktio(src, 'async function _vpHaeOsallistujat(t)'), funktio(src, 'async function _vpTallennaLasnaolo(t, roster, state, btn)'), funktio(src, 'async function _rySynkkaa(id, data)')); }
  vm.runInContext(ap.join('\n') + '\nthis.__haku=' + (master ? '_calHaeOsallistujat' : '_vpHaeOsallistujat') + ';this.__tall=' + (master ? '_calTallennaLasnaolo' : '_vpTallennaLasnaolo') + ';' + (master ? 'this.__kok=_mRyKokoonpano;' : 'this.__synkka=_rySynkkaa;'), sb);
  return { sb, log };
}
for (const sov of ['Master', 'VP']) {
  describe(sov + ' · ryhmätapahtuma: kokoonpano, läsnäolo, jäädytys (vm)', () => {
    const EV = (o = {}) => Object.assign({ id: 'e1', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: ['a'], alkaa: TS(PVM(2)), luoja_uid: 'vp-uid' }, o);
    const tallenna = async (e, t, roster, tila = 'paikalla') => { const state = {}; roster.forEach((p) => { state[p.id] = { tila }; }); await e.sb.__tall(t, roster, state, null); };
    it('TULEVA tapahtuma: kokoonpano ELÄVÄSTI ryhmästä (eri joukkueiden pelaajat, joukkue näkyy rosterissa)', async () => {
      const e = ymp(sov); const r = await e.sb.__haku(EV()); expect(r.map((p) => p.id).sort()).toEqual(['a', 'b']); expect(r.map((p) => p.joukkue).sort()).toEqual(['KPV U13', 'KPV U15']);
    });
    it('JÄÄDYTETTY tai OHI: tapahtuman oma snapshot (jäsenmuutos ei muuta historiaa); tyhjä ryhmä → ei rosteria (ei talenttifallbackia)', async () => {
      const e = ymp(sov, { ryLista: [RYH({ pelaajat_id: ['c'] })] });
      expect((await e.sb.__haku(EV({ jaadytetty: '2026-11-05T18:00:00.000Z', pelaajat_id: ['a', 'b'] }))).map((p) => p.id).sort()).toEqual(['a', 'b']);
      expect((await e.sb.__haku(EV({ alkaa: TS(PVM(-3)), pelaajat_id: ['a'] }))).map((p) => p.id)).toEqual(['a']);
      expect((await e.sb.__haku(EV())).map((p) => p.id)).toEqual(['c']);   // tuleva: elävä uusi jäsenyys
      const tyhja = ymp(sov, { ryLista: [RYH({ pelaajat_id: [] })] }); expect(await tyhja.sb.__haku(EV({ pelaajat_id: [] }))).toEqual([]);
    });
    it('LÄSNÄOLON KIRJAUS jäädyttää: samassa batchissa lasnaolijat + tapahtuma {lasnaolo_kooste, pelaajat_id, jaadytetty, paivitetty}; lokaali tapahtuma päivittyy', async () => {
      const e = ymp(sov), t = EV(); await tallenna(e, t, [{ id: 'a', nimi: 'Aatu' }, { id: 'b', nimi: 'Bo' }]);
      expect(e.log.batch).toHaveLength(1); const ops = e.log.batch[0], kal = ops.find((o) => o[1] === 'seurat/s/kalenteri/e1'); expect(ops.filter((o) => /lasnaolijat/.test(o[1]))).toHaveLength(2);
      expect(kal[2]).toMatchObject({ lasnaolo_kooste: { paikalla: 2, myohassa: 0, poissa: 0, merkitsematta: 0 }, pelaajat_id: ['a', 'b'], paivitetty: 'TS', muokkaaja_uid: 'mv-uid' }); expect(kal[2].jaadytetty).toMatch(/^\d{4}-/); expect(t.jaadytetty).toBe(kal[2].jaadytetty); expect(t.pelaajat_id).toEqual(['a', 'b']);
    });
    it('EI jäädytetä uudelleen (jo jäädytetty) eikä muulle kuin ryhmätapahtumalle; ei-oikeutettu käyttäjä (ei luoja/johto/ryhmän valmentaja) tallentaa vain kooste (Rules estäisi muuten koko batchin)', async () => {
      const a = ymp(sov); await tallenna(a, EV({ jaadytetty: '2026-11-05T18:00:00.000Z', pelaajat_id: ['a'] }), [{ id: 'a', nimi: 'A' }]); const k1 = a.log.batch[0].find((o) => o[1] === 'seurat/s/kalenteri/e1'); expect('jaadytetty' in k1[2]).toBe(false); expect('pelaajat_id' in k1[2]).toBe(false);
      const b = ymp(sov); await tallenna(b, { id: 'e2', joukkue: 'kpv_u13', alkaa: TS(PVM(1)) }, [{ id: 'a', nimi: 'A' }]); const k2 = b.log.batch[0].find((o) => o[1] === 'seurat/s/kalenteri/e2'); expect('jaadytetty' in k2[2]).toBe(false);
      const c = ymp(sov, { uid: 'muu-valmentaja', ryLista: [RYH()] }); await tallenna(c, EV({ luoja_uid: 'vp-uid' }), [{ id: 'a', nimi: 'A' }]); const k3 = c.log.batch[0].find((o) => o[1] === 'seurat/s/kalenteri/e1'); expect('jaadytetty' in k3[2]).toBe(false); expect(k3[2].lasnaolo_kooste.paikalla).toBe(1);
      const d = ymp(sov, { uid: 'johto-uid', johto: true, ryLista: [RYH()] }); await tallenna(d, EV(), [{ id: 'a', nimi: 'A' }]); expect(d.log.batch[0].find((o) => o[1] === 'seurat/s/kalenteri/e1')[2].jaadytetty).toBeTruthy();   // johto saa
    });
    it('D53-tyyppinen virhe: permission-denied → toast, lokaali tapahtuma EI jäädy', async () => { const e = ymp(sov, { kaada: true }), t = EV(); await tallenna(e, t, [{ id: 'a', nimi: 'A' }]); expect(e.log.toast.at(-1)[1]).toMatch(/^(err|error)$/); expect(t.jaadytetty).toBeUndefined(); });
  });
}
describe('VP: jäsenmuutoksen synkka tulevien ryhmätapahtumien pelaajat_id:hen', () => {
  const EVS = [{ id: 'tuleva', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: ['a'], alkaa: TS(PVM(3)) }, { id: 'sama', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: ['b', 'a', 'c'], alkaa: TS(PVM(4)) }, { id: 'ohi', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: ['a'], alkaa: TS(PVM(-2)) }, { id: 'jaadytetty', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: ['a'], jaadytetty: 'x', alkaa: TS(PVM(5)) }, { id: 'poistettu', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: [], poistettu: true, alkaa: TS(PVM(6)) }];
  it('vain tulevat, jäädyttämättömät ja muuttuneet päivitetään (yksi batch); ei muutoksia → ei batchia; virhe heitetään', async () => {
    const e = ymp('VP', { kalenteri: EVS }); await e.sb.__synkka('mv', { tyyppi: 'lista', pelaajat_id: ['a', 'b', 'c'] }); expect(e.log.batch).toHaveLength(1); expect(e.log.batch[0]).toEqual([['update', 'seurat/s/kalenteri/tuleva', { pelaajat_id: ['a', 'b', 'c'], paivitetty: 'TS', muokkaaja_uid: 'mv-uid' }]]);
    const ei = ymp('VP', { kalenteri: [EVS[1]] }); await ei.sb.__synkka('mv', { tyyppi: 'lista', pelaajat_id: ['a', 'b', 'c'] }); expect(ei.log.batch).toEqual([]);
    const k = ymp('VP', { kalenteri: EVS, kaada: true }); await expect(k.sb.__synkka('mv', { tyyppi: 'lista', pelaajat_id: ['a'] })).rejects.toThrow();
  });
});
describe('Master: kalenteri näyttää omat ryhmät; ryhmätapahtuma vain ryhmän valmentajalle; luku vain valmentajalle itselleen (array-contains)', () => {
  it('lähdetarkistukset: Kenelle-lohko, kohdekentät-override, tapahtuman luonti ennen logistiikkaa, omat ryhmät -strippi, suodatus tmNakyyKalenterissa, ryhmälista valmentajalle where valmentajat array-contains', () => {
    expect(MA).toContain("sallitut: ['joukkue', 'ryhma', 'pelaajat', 'henkilokunta']"); expect(MA).toContain('Object.assign(doc, _kd.osa); }'); expect(MA).toContain('id="calOmatRyhmat"'); expect(MA).toContain('TM_RYHMAT.tmNakyyKalenterissa(t, {'); expect(MA).toContain("col.where('valmentajat', 'array-contains', _uid)"); expect(MA).toContain('_mKnTyyppiMuuttui();   // R1 PR 2');
    expect(VP).toContain('Object.assign(doc, _kd.osa); }'); expect(VP).toContain('_knTyyppiMuuttui();   // R1 PR 2'); expect(VP).toContain('<script src="lib/tm_ryhmat.js?v=2"></script>'); expect(MA).toContain('<script src="lib/tm_ryhmat.js?v=2"></script>');
    for (const [nimi, src] of [['Pelaaja', PE], ['Vanhempi', VA]]) expect(src, nimi).not.toContain('<script src="lib/tm_ryhmat');   // pelaajasovellus ei lataa henkilökunnan libiä (inline-suodatin)
  });
  it('omat ryhmät -strippi: nimet escapataan, tyhjä → ei mitään', () => {
    const els = { calOmatRyhmat: { innerHTML: '' } }; const sb = { window: { TM_RYHMAT: R, _mRyLista: [{ id: 'mv', nimi: '<b>MV</b>' }] }, document: { getElementById: (id) => els[id] }, _mEsc: (s) => String(s).replace(/</g, '&lt;'), masterT: (x) => x }; vm.createContext(sb); vm.runInContext(funktio(MA, 'function _mRyOmatNayta()') + '\n_mRyOmatNayta();', sb);
    expect(els.calOmatRyhmat.innerHTML).toContain('Omat ryhmät'); expect(els.calOmatRyhmat.innerHTML).toContain('&lt;b>MV'); sb.window._mRyLista = []; vm.runInContext('_mRyOmatNayta();', sb); expect(els.calOmatRyhmat.innerHTML).toBe('');
  });
});
