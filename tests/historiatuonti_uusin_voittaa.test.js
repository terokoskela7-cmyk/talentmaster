/**
 * Historiatuonti: uusin voittaa (docs/suunnitelmat/historiatuonti_suunnitelma.md).
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

describe('lib/tm_historiatuonti.js — testikohtainen uusin voittaa', () => {
  const nyk = { hh_viimeisin: { lin30m: 4.9, cmj: 35, mas: 15 }, hh_pvm: '2026-10-09', hh_historia: [{ pvm: '2026-05-01', cmj: 35 }, { pvm: '2026-10-09', lin30m: 4.9, mas: 15 }] };
  it('testikohtainen pvm johdetaan hh_historiasta (arvo täsmää), muuten hh_pvm', () => {
    expect(H.perTesti(nyk)).toEqual({ lin30m: '2026-10-09', cmj: '2026-05-01', mas: '2026-10-09' });
    expect(H.perTesti({ hh_viimeisin: { lin30m: 5 }, hh_pvm: '2026-02-02' })).toEqual({ lin30m: '2026-02-02' });   // vanha data ilman historiaa
    expect(H.perTesti({ hh_viimeisin: { cmj: 40 }, hh_pvm: '2026-02-02', hh_historia: [{ pvm: '2026-09-09', cmj: 38 }] })).toEqual({ cmj: '2026-02-02' });   // arvo ei täsmää → varapvm
    expect(H.perTesti({})).toEqual({});
  });
  it('vanhempi rivi: ei päivitä mitään; viesti suomeksi', () => {
    const d = H.paata(nyk, { pvm: '2025-03-15', hh: { lin30m: 5.3, cmj: 30 } });
    expect(d.hh.muuttuu).toBe(false); expect(d.hh.viimeisin).toBeNull(); expect(d.hh.pvmMuuttuu).toBe(false); expect(d.testipaivat).toEqual({});
    expect(d.viesti).toBe('Uudempi tulos jo järjestelmässä (9.10.2026) — historia tallennetaan, profiili ei muutu.');
  });
  it('osittain uudempi: päivittyvät vain vanhemmat testit; viesti nimeää ohitetut', () => {
    const d = H.paata(nyk, { pvm: '2026-07-01', hh: { lin30m: 5.0, cmj: 38, kasirata: 7.5 } });
    expect(d.hh.uudet).toEqual(['cmj', 'kasirata']); expect(d.hh.viimeisin).toEqual({ lin30m: 4.9, cmj: 38, mas: 15, kasirata: 7.5 });
    expect(d.hh.pvm).toBe('2026-10-09'); expect(d.hh.pvmMuuttuu).toBe(false); expect(d.hh.edellinen).toBe(false);
    expect(d.viesti).toBe('Uudempi tulos jo järjestelmässä (9.10.2026) — historia tallennetaan, profiilissa ei muutu: 30 m.');
  });
  it('uudempi rivi: kaikki päivittyy, hh_pvm eteenpäin, edellinen sallittu; sama pvm ei ole "edellinen"', () => {
    const d = H.paata(nyk, { pvm: '2026-11-01', hh: { mas: 16 } });
    expect(d.hh.viimeisin).toEqual({ lin30m: 4.9, cmj: 35, mas: 16 }); expect(d.hh.pvm).toBe('2026-11-01'); expect(d.hh.pvmMuuttuu).toBe(true); expect(d.hh.edellinen).toBe(true); expect(d.viesti).toBeNull();
    const sama = H.paata(nyk, { pvm: '2026-10-09', hh: { lin30m: 4.9, mas: 15 } });
    expect(sama.hh.edellinen).toBe(false); expect(sama.hh.muuttuu).toBe(true); expect(sama.hh.viimeisin).toEqual(nyk.hh_viimeisin);
  });
  it('TKI/TSI/FLEI-ryhmät: oma pvm; testipaivat ei taaksepäin', () => {
    const t = { tki_pvm: '2026-06-01', tsi_pvm: '2025-01-01', testipaivat: { fyysinen_hh: '2026-10-09', tki: '2026-06-01' } };
    const d = H.paata(t, { pvm: '2025-12-01', tki: true, tsi: true, hh: { lin30m: 5 } });
    expect(d.tki.uusi).toBe(false); expect(d.tki.ohitettu).toBe(true); expect(d.tsi.uusi).toBe(true); expect(d.tsi.edellinen).toBe(true); expect(d.testipaivat).toEqual({});   // fyysinen_hh jo 9.10. (uusi lin30m: ei hh_viimeisintä → kirjoitetaan, mutta patteristo-pvm ei mene taakse)
    expect(d.hh.muuttuu).toBe(true); expect(d.viesti).toContain('TKI');
  });
  it('sovella = Firestore set-merge: sisäkkäiset kartat yhdistyvät, taulukot korvautuvat, sentinellit ohitetaan; ei mutatoi', () => {
    class FV { }
    const a = { hh_viimeisin: { lin30m: 5 }, testipaivat: { tki: 'x' }, h: [1] }, b = { hh_viimeisin: { cmj: 3 }, h: [2], s: new FV() };
    const c = H.sovella(a, b); expect(c).toEqual({ hh_viimeisin: { lin30m: 5, cmj: 3 }, testipaivat: { tki: 'x' }, h: [2] }); expect(a.hh_viimeisin).toEqual({ lin30m: 5 });
  });
  it('suunnitelma: rivit pvm nousevaan, saman pelaajan rivit samasta tilasta (väärä järjestys → uusin voittaa)', () => {
    const S = H.suunnitelma([{ id: 'a', nimi: 'A', fd: {}, rivit: [{ pvm: '2025-10-01', hh: { lin30m: 5.0 } }, { pvm: '2025-03-15', hh: { lin30m: 5.4 } }] }]);
    expect(S.pelaajat[0].loppu.hh_viimeisin).toEqual({ lin30m: 5.0 }); expect(S.pelaajat[0].loppu.hh_pvm).toBe('2025-10-01'); expect(S.yhteenveto.rivit).toBe(2); expect(S.pelaajat[0].viestit).toEqual([]);
  });
});

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
const UUSI_TILA = () => ({ ...PERUS, hh_viimeisin: { lin30m: 4.9, cmj: 35, mas: 15 }, hh_pvm: '2026-10-09', hh_taso: 3, testipaivat: { fyysinen_hh: '2026-10-09' }, hh_historia: [{ pvm: '2026-10-09', lin30m: 4.9, cmj: 35, mas: 15, hh_taso: 3 }] });

describe('Excel_Tuonti tallennus (sivun oikea koodi): uusin voittaa', () => {
  it('(1) pelaajalla hh_pvm 9.10.2026 → tuonti 15.3.2025: testidokumentti tallentuu, pikakentät ennallaan', async () => {
    const { db, D } = luoDb({ [PP]: UUSI_TILA() });
    const k = await aja(D, db, [rivi('2025-03-15', { lin30m: '5.3', hyppy_cj: '30' })]);
    expect(k.toast.at(-1)[1]).toBe('ok');
    const doc = D.get(PP + '/testitulokset/2025-03-15_hh_laaja'); expect(doc).toBeTruthy(); expect(doc.testit.lin30m).toBe(5.3); expect(doc.lahde).toBe('historiapohja');
    const p = D.get(PP), alku = UUSI_TILA();
    expect(p.hh_viimeisin).toEqual(alku.hh_viimeisin); expect(p.hh_pvm).toBe('2026-10-09'); expect(p.hh_taso).toBe(3); expect(p.testipaivat).toEqual(alku.testipaivat);
    expect(p.hh_taso_edellinen_pvm).toBe('2025-03-15'); expect(p.d1_taso).toBeUndefined();   // edellinen = toiseksi uusin mittaus historiasta (jatko-PR), viimeisin ennallaan
    expect(p.hh_historia.map((s) => s.pvm)).toEqual(['2025-03-15', '2026-10-09']);   // historia kirjautuu
    expect(p.hh_historia[0].lin30m).toBe(5.3);
  });
  it('(2) kaksi päivää samassa tiedostossa väärässä järjestyksessä → lopputulos = uusin; edellinen = vanhempi', async () => {
    const { db, D } = luoDb({ [PP]: { ...PERUS } });
    await aja(D, db, [rivi('2025-10-01', { lin30m: '5.0', hyppy_cj: '35', mas: '15' }), rivi('2025-03-15', { lin30m: '5.6', hyppy_cj: '30', mas: '14' })]);
    const p = D.get(PP);
    expect(p.hh_viimeisin).toEqual({ lin30m: 5, cmj: 35, mas: 15 }); expect(p.hh_pvm).toBe('2025-10-01'); expect(p.testipaivat.fyysinen_hh).toBe('2025-10-01');
    expect(p.hh_historia.map((s) => s.pvm)).toEqual(['2025-03-15', '2025-10-01']);
    expect(p.hh_taso_edellinen).toBeTypeOf('number'); expect(p.hh_taso_edellinen_pvm).toBe('2025-03-15'); expect(p.hh_taso).toBeTypeOf('number');
    expect(D.get(PP + '/testitulokset/2025-03-15_hh_laaja')).toBeTruthy(); expect(D.get(PP + '/testitulokset/2025-10-01_hh_laaja')).toBeTruthy();
  });
  it('(3) viimeisin päivä vain MAS → hh_viimeisin säilyttää aiemman 30 m:n ja CMJ:n; pvm testikohtaisesti', async () => {
    const { db, D } = luoDb({ [PP]: { ...PERUS } });
    await aja(D, db, [rivi('2025-03-15', { lin30m: '5.0', hyppy_cj: '35' }), rivi('2025-10-01', { mas: '5:00' })]);
    const p = D.get(PP);
    expect(p.hh_viimeisin.lin30m).toBe(5); expect(p.hh_viimeisin.cmj).toBe(35); expect(p.hh_viimeisin.mas).toBeTypeOf('number');
    expect(p.hh_pvm).toBe('2025-10-01'); expect(H.perTesti(p)).toEqual({ lin30m: '2025-03-15', cmj: '2025-03-15', mas: '2025-10-01' });
    expect(p.testipaivat.fyysinen_hh).toBe('2025-10-01'); expect(p.hh_taso).toBeTypeOf('number');
    // myöhempi vanha 30 m -rivi ei korvaa 30 m:ää eikä pudota MAS:ia
    await aja(D, db, [rivi('2025-01-10', { lin30m: '6.0' })], { alkuTila: D.get(PP) });
    expect(D.get(PP).hh_viimeisin).toEqual(p.hh_viimeisin); expect(D.get(PP).hh_pvm).toBe('2025-10-01');
  });
  it('(4) re-import samasta tiedostosta → ei muutoksia (idempotentti), ei nolladeltaa', async () => {
    const { db, D } = luoDb({ [PP]: { ...PERUS } });
    const rivit = () => [rivi('2025-03-15', { lin30m: '5.4', hyppy_cj: '30', mas: '4:50' }), rivi('2025-10-01', { lin30m: '5.0', hyppy_cj: '35', mas: '4:40' })];
    await aja(D, db, rivit());
    const p1 = JSON.stringify(D.get(PP)), t1 = JSON.stringify([...D.entries()].filter(([k]) => k.includes('/testitulokset/')).map(([k, v]) => [k, Object.assign({}, v, { tuotu: 0 })]));
    await aja(D, db, rivit());   // sivu lukee profiilin uudelleen: alkuTila = D.get(PP)
    expect(JSON.stringify(D.get(PP))).toBe(p1);
    expect(JSON.stringify([...D.entries()].filter(([k]) => k.includes('/testitulokset/')).map(([k, v]) => [k, Object.assign({}, v, { tuotu: 0 })]))).toBe(t1);
    const pp = D.get(PP); expect(pp.hh_taso_edellinen_pvm).toBe('2025-03-15');   // ei nollaedellistä (sama pvm ei vaihda edellistä)
    expect(pp.hh_taso_edellinen).not.toBe(undefined);
  });
  it('(6) tapahtumapohjainen tuonti käyttää samaa tallennuskoodia: vanhempi tapahtuma ei korvaa uudempaa, tulos kirjoitetaan tapahtuman alle', async () => {
    const { db, D } = luoDb({ [PP]: UUSI_TILA() });
    await aja(D, db, [rivi('2025-03-15', { lin30m: '5.3' })], { moodi: 'tapahtuma' });
    expect(D.get('seurat/kpv/testitapahtumat/tap1/tulokset/' + PID).lahde).toBe('tapahtumapohja');
    const p = D.get(PP); expect(p.hh_viimeisin).toEqual(UUSI_TILA().hh_viimeisin); expect(p.hh_pvm).toBe('2026-10-09');
    await aja(D, db, [rivi('2026-11-02', { lin30m: '4.7' })], { moodi: 'tapahtuma', alkuTila: D.get(PP) });   // uudempi tapahtuma päivittää
    expect(D.get(PP).hh_viimeisin.lin30m).toBe(4.7); expect(D.get(PP).hh_pvm).toBe('2026-11-02'); expect(D.get(PP).hh_viimeisin.cmj).toBe(35);
  });
  it('lähdetaso: sivu lataa libin, käyttää lajittelua + yhteistä tilaa + esikatselupaneelia; ei vanhaa pvm-korvausta', () => {
    expect(EX).toContain('<script src="lib/tm_historiatuonti.js?v=3"></script>');
    expect(EX).toContain('uusin-voittaa-paneeli'); expect(EX).toContain('_H.paata(_fd0'); expect(EX).toContain('_tilat[docId] = _H.sovella(_fd0, profiiliUpdate)');
    expect(EX).not.toContain("profiiliUpdate.hh_viimeisin = hhViimeisin; profiiliUpdate.hh_pvm = pvmIso; }");
    expect(EX).not.toMatch(/_fd\.hh_pvm !== pvmIso/);
  });
});

describe('esikatseluviesti', () => {
  it('(5) rivi per pelaaja: "Uudempi tulos jo järjestelmässä (9.10.2026) — historia tallennetaan, profiili ei muutu."', () => {
    const S = H.suunnitelma([{ id: PID, nimi: 'Testi Pelaaja', fd: UUSI_TILA(), rivit: [{ pvm: '2025-03-15', hh: { lin30m: 5.3 } }] }]);
    expect(S.pelaajat[0].viestit).toEqual(['15.3.2025: Uudempi tulos jo järjestelmässä (9.10.2026) — historia tallennetaan, profiili ei muutu.']);
    expect(S.yhteenveto).toMatchObject({ rivit: 1, vainHistoria: 1, taysi: 0 });
  });
});
