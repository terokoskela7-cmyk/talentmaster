/**
 * Historiatuonti jatko: edellinen historiasta + yksikkövaroitus (docs/suunnitelmat/historiatuonti_suunnitelma.md).
 * (1) lib/tm_historiatuonti.js yksikkötestit; (2) SIVUN OIKEA tallennuskoodi (tallennaFirestoreen) vm:ssä muistinvaraista Firestorea vasten
 * — keksityt pelaajat, ei oikeaa Firestorea, ei palveluavaimia. Sama tallennusfunktio palvelee historia- ja tapahtumapohjaista tuontia.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const H = require('../lib/tm_historiatuonti.js');
const EX = lue('TalentMaster_Excel_Tuonti.html');

function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); } } throw new Error('ei sulkua'); }

// ── Sivun oikea tallennuskoodi vm:ssä ──────────────────────────────────────────────────────────────────────────
function luoDb(alku) {
  const D = new Map(Object.entries(JSON.parse(JSON.stringify(alku || {}))));
  const plain = (v) => v && typeof v === 'object' && !Array.isArray(v) && !v.__fv;
  const yhdista = (a, b) => { const o = Object.assign({}, a); Object.keys(b).forEach((k) => { const v = b[k]; if (v && v.__fv === 'delete') delete o[k]; else if (v && v.__fv === 'union') o[k] = (o[k] || []).concat(v.x); else if (plain(v)) o[k] = yhdista(plain(o[k]) ? o[k] : {}, v); else o[k] = v; }); return o; };
  const kirj = (path, d, opts) => D.set(path, opts && opts.merge ? yhdista(D.get(path) || {}, d) : JSON.parse(JSON.stringify(d)));
  const doc = (path) => ({ _path: path, id: path.split('/').pop(), collection: (c) => ({ doc: (i) => doc(path + '/' + c + '/' + i) }) });
  const db = { collection: (c) => ({ doc: (i) => doc(c + '/' + i) }), batch: () => { const ops = []; return { set: (r, d, o) => ops.push(() => kirj(r._path, d, o)), commit: async () => { ops.forEach((f) => f()); } }; } };
  return { db, D };
}
const LIBIT = ['tm_eerikkila_normit.js', 'tm_pvm.js', 'tm_testipaiva.js', 'tm_sukupuoli.js', 'tm_alusta.js', 'tm_ennatykset.js', 'tm_historia.js', 'tm_historiatuonti.js', 'tm_testikatalogi.js', 'tm_istunto.js'];
function sivu(D, db) {
  const kirjaus = { toast: [] };
  const el = () => ({ style: {}, textContent: '', innerHTML: '', disabled: false, classList: { add() {}, remove() {} } });
  const sb = {
    console, seuraId: 'kpv', kayttaja: { uid: 'testi-uid' }, db, document: { getElementById: () => el() }, toast: (t, k) => kirjaus.toast.push([t, k]), asetaStepAktiivinen() {},
    firebase: { auth: () => ({ currentUser: { uid: 'testi-uid' } }), firestore: { FieldValue: { serverTimestamp: () => 'TS', arrayUnion: (x) => ({ __fv: 'union', x: [x] }), delete: () => ({ __fv: 'delete' }) } } },
    PROTOKOLLAT: { hh_laaja: { tyyppi: 'num', testit: [] } }, tuontiData: null,
  };
  sb.window = sb;   // IIFE-libit rekisteröityvät window.* (selainympäristö)
  vm.createContext(sb);
  for (const l of LIBIT) vm.runInContext(lue('lib/' + l), sb, { filename: l });
  const tarvitaan = ['function _paivaIso', 'function _protokollaRistiriita', 'function laskeIka', 'function _ennatysKandidaatit', 'function _tkHhNorm', 'async function tallennaFirestoreen'];
  vm.runInContext('const BATCH_KOKO = 400;\n' + tarvitaan.map((a) => funktio(EX, a)).join('\n') + '\nthis.__tallenna = tallennaFirestoreen;', sb, { filename: 'Excel_Tuonti(osa)' });
  return { sb, kirjaus };
}
const SAR = [{ testiId: 'lin30m', otsikko: 'Lin30m' }, { testiId: 'hyppy_cj', otsikko: 'CMJ' }, { testiId: 'mas', otsikko: 'MAS' }, { testiId: 'kasirata', otsikko: 'Kasirata' }];
const PID = 'pelaaja-1', PP = 'seurat/kpv/pelaajat/' + PID;
function rivi(pvm, testit, lisa) {
  return Object.assign({ tunniste: '99999991', etunimi: 'Testi', sukunimi: 'Pelaaja', sukupuoli: 'P', syntymaVuosi: 2013, joukkue: 'KPV P13', testauspvm: pvm, phv_tila: '', testit: Object.assign({ lin30m: '', hyppy_cj: '', mas: '', kasirata: '' }, testit), testitRakenne: {} }, lisa);
}
async function aja(D, db, rivit, { moodi = 'historia', alkuTila } = {}) {
  const { sb, kirjaus } = sivu(D, db);
  const fd = alkuTila === undefined ? D.get(PP) : alkuTila;
  rivit.forEach((r) => { r._loytyyFirestoresta = true; r._firestoreDocId = PID; r._firestoreData = fd; });   // sama alkuperäinen luku jokaiselle riville (kuten sivu)
  sb.tuontiData = { valid: true, moodi, meta: { kausi: '2025-kevat', protokolla: 'hh_laaja' }, testiSarakkeet: SAR, pelaajat: rivit, tuontiStrategia: 'vain_loytyneet', palloIdTarkistus: {}, virheet: [], varoitukset: [] };
  if (moodi === 'tapahtuma') sb.tuontiData.tapahtumaData = { id: 'tap1', pvm: rivit[0].testauspvm, protokolla: 'hh_laaja' };
  await sb.__tallenna();
  return kirjaus;
}
const PERUS = { etunimi: 'Testi', sukunimi: 'Pelaaja', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV P13' };
const R = (pvm, l, c, m) => rivi(pvm, { lin30m: l, hyppy_cj: c, mas: m });

describe('lib: edellinen historiasta + yksikkövaroitukset', () => {
  it('edellisetHistoriasta: toiseksi uusin per sarja; yksi piste → ei mitään; TSI sm-pareista', () => {
    const h = [{ pvm: '2026-01-01', hh_taso: 4, sm_juoksu: 8, sm_pallo: 10 }, { pvm: '2025-01-01', hh_taso: 2, sm_juoksu: 9, sm_pallo: 12 }, { pvm: '2025-06-01', hh_taso: 3 }];
    expect(H.edellisetHistoriasta(h, [{ pvm: '2025-01-01', tki: 30 }, { pvm: '2025-09-01', tki: 35 }])).toEqual({ hh_taso_edellinen: 3, hh_taso_edellinen_pvm: '2025-06-01', tki_edellinen: 30, tki_edellinen_pvm: '2025-01-01', tsi_edellinen: 3, tsi_edellinen_pvm: '2025-01-01' });
    expect(H.edellisetHistoriasta([{ pvm: '2025-01-01', hh_taso: 2 }], [])).toEqual({}); expect(H.edellisetHistoriasta(undefined, null)).toEqual({});
  });
  it('yksikkoVaroitukset: rajat 4,9/5,0 cm ja 1,39/1,40 s; tyhjä ei varoita; SJ-avaimet; ei muuta arvoja', () => {
    expect(H.yksikkoVaroitukset({ hyppy_cj: '0.45' })).toEqual(['Epäilyttävä arvo: CMJ 0,45 — onko yksikkö cm (ei m)?']);
    expect(H.yksikkoVaroitukset({ hyppy_cj: '4.9' })).toHaveLength(1); expect(H.yksikkoVaroitukset({ hyppy_cj: '5.0' })).toEqual([]); expect(H.yksikkoVaroitukset({ hyppy_sj: 0.4 })[0]).toContain('SJ 0,4'); expect(H.yksikkoVaroitukset({ sj_jump: '3' })).toHaveLength(1);
    expect(H.yksikkoVaroitukset({ lin10m: '1.39' })[0]).toContain('10 m 1,39 s'); expect(H.yksikkoVaroitukset({ lin10m: '1.40' })).toEqual([]);
    expect(H.yksikkoVaroitukset({ hyppy_cj: '', hyppy_sj: undefined, lin10m: null })).toEqual([]); expect(H.yksikkoVaroitukset({})).toEqual([]); expect(H.yksikkoVaroitukset()).toEqual([]);
  });
  it('sivu: validointi kutsuu libiä varoituksena (ei virheenä)', () => {
    expect(EX).toContain("TM_HISTORIATUONTI.yksikkoVaroitukset(p.testit).forEach(m => varoitukset.push("); expect(EX).not.toContain('virheet.push({ rivi: idx, kentta: \'Yksikkö\'');
  });
});

describe('Excel_Tuonti: *_edellinen historiasta (sivun oikea koodi)', () => {
  it('vanha tiedosto tuodaan uuden jälkeen → edellinen muodostuu (2. uusin), viimeisin ennallaan', async () => {
    const { db, D } = luoDb({ [PP]: { ...PERUS } });
    await aja(D, db, [R('2025-10-01', '5.0', '35', '4:40'), R('2026-03-01', '4.9', '37', '4:30')]);
    const v = JSON.stringify(D.get(PP).hh_viimeisin);
    await aja(D, db, [R('2025-03-15', '5.4', '30', '4:50')], { alkuTila: D.get(PP) });
    const p = D.get(PP); expect(p.hh_viimeisin && JSON.stringify(p.hh_viimeisin)).toBe(v); expect(p.hh_pvm).toBe('2026-03-01');
    expect(p.hh_taso_edellinen_pvm).toBe('2025-10-01'); expect(p.hh_taso_edellinen).toBe(p.hh_historia.find((s) => s.pvm === '2025-10-01').hh_taso);
  });
  it('kaksi mittausta → edellinen = vanhempi; yksi → ei edellistä; väärä järjestys tiedostossa', async () => {
    const y = luoDb({ [PP]: { ...PERUS } }); await aja(y.D, y.db, [R('2025-03-15', '5.4', '30', '4:50')]);
    expect(y.D.get(PP).hh_taso_edellinen).toBeUndefined(); expect(y.D.get(PP).hh_taso_edellinen_pvm).toBeUndefined();
    const k = luoDb({ [PP]: { ...PERUS } }); await aja(k.D, k.db, [R('2025-10-01', '5.0', '35', '4:40'), R('2025-03-15', '5.4', '30', '4:50')]);
    expect(k.D.get(PP).hh_taso_edellinen_pvm).toBe('2025-03-15'); expect(k.D.get(PP).hh_pvm).toBe('2025-10-01');
  });
  it('pelaajalla jo uudempi arvo (yksi historiapiste) + vanha tuonti → edellinen = vanha; re-import ei muuta mitään', async () => {
    const { db, D } = luoDb({ [PP]: { ...PERUS, hh_viimeisin: { lin30m: 4.9, cmj: 35, mas: 15 }, hh_pvm: '2026-10-09', hh_taso: 3, testipaivat: { fyysinen_hh: '2026-10-09' }, hh_historia: [{ pvm: '2026-10-09', lin30m: 4.9, cmj: 35, mas: 15, hh_taso: 3 }] } });
    await aja(D, db, [R('2025-03-15', '5.4', '30', '4:50')]);
    expect(D.get(PP).hh_taso_edellinen_pvm).toBe('2025-03-15'); expect(D.get(PP).hh_pvm).toBe('2026-10-09'); expect(D.get(PP).hh_taso).toBe(3);
    const a = JSON.stringify(D.get(PP)); await aja(D, db, [R('2025-03-15', '5.4', '30', '4:50')], { alkuTila: D.get(PP) }); expect(JSON.stringify(D.get(PP))).toBe(a);
  });
});

describe('protokollaRistiriita — HARD BLOCK väärä protokolla', () => {
  const HHV = 'Tiedoston testit ovat H-H-testejä. Valitse protokollaksi HH-testi laaja.', TKV = 'Tiedoston testit ovat tekniikkakilpailun testejä. Valitse protokollaksi Tekniikkakilpailu.';
  it('H-H-sarakkeet + tekniikkakilpailu → esto; TK-sarakkeet + H-H → esto; täsmäävä → ei', () => {
    expect(H.protokollaRistiriita(['lin10m', 'lin30m', 'hyppy_cj', 'mas', 'kasirata'], 'tekniikkakilpailu')).toBe(HHV);
    expect(H.protokollaRistiriita(['ponnauttelu', 'kuljetus_laukaus'], 'hh_laaja')).toBe(TKV); expect(H.protokollaRistiriita(['pituuspotku'], 'hh_suppea')).toBe(TKV);
    expect(H.protokollaRistiriita(['lin30m', 'mas'], 'hh_laaja')).toBeNull(); expect(H.protokollaRistiriita(['ponnauttelu', 'pujottelu', 'syotto'], 'tekniikkakilpailu')).toBeNull();
  });
  it('osa H-H-sarakkeista (vain MAS) + H-H ok; tyhjä/tuntematon ei laukaise; moniselitteinen pujottelu/syotto ei laukaise; muu protokolla ei tarkisteta; sekatiedosto estetään nimeten', () => {
    expect(H.protokollaRistiriita(['mas'], 'hh_laaja')).toBeNull(); expect(H.protokollaRistiriita([], 'tekniikkakilpailu')).toBeNull(); expect(H.protokollaRistiriita(undefined, 'hh_laaja')).toBeNull();
    expect(H.protokollaRistiriita(['jokin_outo'], 'tekniikkakilpailu')).toBeNull(); expect(H.protokollaRistiriita(['pujottelu', 'syotto'], 'hh_laaja')).toBeNull(); expect(H.protokollaRistiriita(['lin30m'], 'harjoitettavuus_u15')).toBeNull();
    const m = H.protokollaRistiriita(['lin30m', 'ponnauttelu'], 'hh_laaja'); expect(m).toContain('sekä H-H-testejä (30 m)'); expect(m).toContain('tekniikkakilpailun testejä (ponnauttelu)');
  });
});

describe('protokollaesto: oikea tallennusfunktio ei kirjoita mitään', () => {
  it('H-H-data + tekniikkakilpailu → ei kirjoituksia, virhetoast; H-H + hh_laaja kirjoittaa; tapahtumamoodi sama sääntö', async () => {
    const { db, D } = luoDb({ [PP]: { ...PERUS } }); const alku = JSON.stringify([...D.entries()]);
    const { sb, kirjaus } = sivu(D, db);
    const rs = [rivi('2025-03-15', { lin30m: '5.3', hyppy_cj: '30' })]; rs.forEach((r) => { r._loytyyFirestoresta = true; r._firestoreDocId = PID; r._firestoreData = D.get(PP); });
    sb.tuontiData = { valid: true, moodi: 'historia', meta: { kausi: '2025-kevat', protokolla: 'tekniikkakilpailu' }, testiSarakkeet: SAR, pelaajat: rs, tuontiStrategia: 'vain_loytyneet', palloIdTarkistus: {}, virheet: [], varoitukset: [] };
    await sb.__tallenna();
    expect(JSON.stringify([...D.entries()])).toBe(alku); expect(kirjaus.toast.at(-1)).toEqual(['Tiedoston testit ovat H-H-testejä. Valitse protokollaksi HH-testi laaja.', 'err']);
    sb.tuontiData.moodi = 'tapahtuma'; sb.tuontiData.tapahtumaData = { id: 't1', pvm: '2025-03-15', protokolla: 'tekniikkakilpailu' }; await sb.__tallenna(); expect(JSON.stringify([...D.entries()])).toBe(alku);
    const ok = luoDb({ [PP]: { ...PERUS } }); await aja(ok.D, ok.db, [rivi('2025-03-15', { lin30m: '5.3' })]); expect(ok.D.get(PP + '/testitulokset/2025-03-15_hh_laaja')).toBeTruthy();
  });
  it('lähdetaso: validointi lisää punaisen virheen (valid=false)', () => { expect(EX).toContain("virheet.push({ rivi: -1, kentta: 'Protokolla', msg: _rr })"); });
});
