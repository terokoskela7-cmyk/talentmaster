/* B3 — VP:n mittauskorjauksen KARAKTERISOINTI (E2.2 Poista/Palauta + E2.3 Korjaa). Kirjoitettu ENNEN kuin korjauslogiikka siirrettiin jaettuun libiin
   (lib/tm_mittaus_korjaa.js), jotta Kehitystyöpöydän Profiili voi käyttää samaa reittiä. Ajaa VP_v25:n OIKEAN lähdelohkon (testikatalogi +
   tmRakennaPikakentatArkistosta oikeina) vm:ssä valekantaa vasten ja vertaa JOKAISEN Firestore-kirjoituksen, dialogin syötteen, välimuistin, in-memory-pelaajan
   ja toastin tallennettuun fixtuuriin (tests/fixtures/b3_vp_korjaa_kirjoitukset.json, generoitu mainin VP:stä). Ero = VP:n korjaus ei toimi ennallaan.
   Fixtuurin uudelleengenerointi (vain tarkoituksellinen muutos): TM_B3_TALLENNA=1 npx vitest run tests/b3_vp_mittaus_korjaa_karakterisointi.test.js */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const FIX = new URL('./fixtures/b3_vp_korjaa_kirjoitukset.json', import.meta.url);
const VP = lue('TalentMaster_VP_v25.html');
const ALKU = 'var _vpMittausCache = {};', LOPPU = '// R2 (pala 1)';
const lohko = () => { const i = VP.indexOf(ALKU), j = VP.indexOf(LOPPU, i); if (i < 0 || j < 0) throw new Error('VP:n mittauslohkoa ei löydy'); return VP.slice(i, j); };
const DEL = '<<FieldValue.delete>>';
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const siisti = (x) => JSON.parse(JSON.stringify(x, (k, v) => (typeof v === 'string' && ISO.test(v) ? '<ISO>' : v)));

const pelaaja = () => ({ id: 'pT1', nimi: 'Testi Pelaaja', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13', joukkueet: ['kpv_u13'],
  hh_viimeisin: { lin_30m: 4.82, hyppy_cj: 28, pujottelu: 12.3 }, hh_pvm: '2026-09-10', tki_pvm: '2026-09-20', recalc_vieras: 7 });
const dokit = () => [
  { __id: '2026-09-10_hh', data: { testauspvm: '2026-09-10', protokolla: 'hh', lahde: 'testitapahtuma', testit: { lin_30m: 4.82, hyppy_cj: 28, pujottelu_hh: 12.3 } } },
  { __id: '2026-09-20_tk', data: { testauspvm: '2026-09-20', protokolla: 'tk', lahde: 'pikakirjaus', testit: { pujottelu: 14.1, syotto: { tulos: 9, yritykset: 10 }, kuljetus_laukaus: { raaka: 20, rangaistukset: [5], ennenaikaiset: 0, netto: 15 } } } },
];

function sandbox(o) {
  o = o || {}; const loki = [], toastit = [], dialogit = [], vahvistukset = [];
  const ref = (polku) => ({
    collection: (c) => ({ doc: (d) => ref(polku.concat([c, d])) }),
    set: async (data, opts) => { loki.push({ op: 'set', polku: polku.join('/'), data: siisti(merkitse(data)), opts: opts || null }); },
    update: async (data) => { if (o.updateKaatuu) throw new Error('permission-denied'); loki.push({ op: 'update', polku: polku.join('/'), data: siisti(merkitse(data)) }); },
  });
  const merkitse = (d) => { const u = {}; Object.keys(d).forEach((k) => { u[k] = d[k] && d[k].__del ? DEL : d[k]; }); return u; };
  const db = { collection: (c) => ({ doc: (d) => ref([c, d]) }) };
  const sb = {
    console: { warn() {}, log() {}, error() {} }, Object, JSON, Math, Date, Array, String, Number, parseFloat, parseInt, isNaN, Promise, RegExp,
    document: { getElementById: () => null, createElement: () => { throw new Error('DOM ei käytössä (dialogi on tynkä)'); } },
    db, _seuraId: 'kpv', _uid: 'uVP', _isDemoMode: false,
    firebase: { auth: () => ({ currentUser: { getIdToken: async () => 'tok' } }), firestore: { FieldValue: { delete: () => ({ __del: true }) } } },
    vpT: (s) => s, toast: (m, t) => toastit.push([m, t]), _pvmFiVP: (d) => d.toISOString().slice(0, 10),
    _vpOmistaaPelaajan: () => !!o.omistaa,
    TM_TESTIKATALOGI: require('../lib/tm_testikatalogi.js'), tmRakennaPikakentatArkistosta: require('../lib/tm_pikakentat.js').tmRakennaPikakentatArkistosta,
    _jsvPelaajat: [], _ktLippu: false,
  };
  /* Jaettu korjauslib (B3) ladataan, jos se on olemassa: ennen siirtoa VP ei käytä sitä, siirron jälkeen VP:n lohko delegoi siihen. Testi on sama molemmissa. */
  const LIB = new URL('../lib/tm_mittaus_korjaa.js', import.meta.url);
  if (existsSync(LIB)) sb.TM_MITTAUS_KORJAA = require('../lib/tm_mittaus_korjaa.js');
  sb.window = sb; vm.createContext(sb);
  vm.runInContext(lohko(), sb);
  /* Dialogit tyngiksi SAMALLA nimellä kuin VP kutsuu: käyttäjän syöte annetaan testistä. */
  sb._vpMittausKorjaaDialog = async (opts) => { dialogit.push(siisti(opts)); return o.dialogi === undefined ? null : o.dialogi; };
  sb._vpVahvista = async (opts) => { vahvistukset.push(opts.otsikko); return o.vahvista !== false; };
  sb._vpRooli = o.rooli === undefined ? 'vp' : o.rooli;
  const p = pelaaja(); sb._vpMittausCache[p.id] = dokit(); sb._vpMittausPelaaja = p;
  return { sb, p, loki, toastit, dialogit, vahvistukset };
}

const SKENAARIOT = {
  korjaa_skalaari: { o: { dialogi: 4.71 }, aja: (sb) => sb._vpMittausKorjaa('2026-09-10_hh', 'lin_30m') },
  korjaa_objekti_tulos: { o: { dialogi: 10 }, aja: (sb) => sb._vpMittausKorjaa('2026-09-20_tk', 'syotto') },
  korjaa_komposiitti: { o: { dialogi: { raaka: 19, rangaistukset: [5, 10], ennenaikaiset: 1 } }, aja: (sb) => sb._vpMittausKorjaa('2026-09-20_tk', 'kuljetus_laukaus') },
  korjaa_peruttu: { o: { dialogi: null }, aja: (sb) => sb._vpMittausKorjaa('2026-09-10_hh', 'lin_30m') },
  korjaa_ei_oikeutta: { o: { dialogi: 4.71, rooli: 'valmentaja', omistaa: false }, aja: (sb) => sb._vpMittausKorjaa('2026-09-10_hh', 'lin_30m') },
  korjaa_oma_valmentaja: { o: { dialogi: 4.6, rooli: 'valmentaja', omistaa: true }, aja: (sb) => sb._vpMittausKorjaa('2026-09-10_hh', 'lin_30m') },
  korjaa_tuntematon_dokki: { o: { dialogi: 4.71 }, aja: (sb) => sb._vpMittausKorjaa('ei-ole', 'lin_30m') },
  korjaa_kirjoitus_kaatuu: { o: { dialogi: 4.71, updateKaatuu: true }, aja: (sb) => sb._vpMittausKorjaa('2026-09-10_hh', 'lin_30m') },
  poista: { o: {}, aja: (sb) => sb._vpMittausPoista('2026-09-10_hh', 'pujottelu_hh') },
  poista_peruttu: { o: { vahvista: false }, aja: (sb) => sb._vpMittausPoista('2026-09-10_hh', 'pujottelu_hh') },
  poista_viimeinen_tk: { o: {}, aja: async (sb) => { sb._vpMittausCache.pT1[1].data.mitatoidut = { pujottelu: { kuka: 'uX', milloin: '2026-10-01T10:00:00.000Z' }, syotto: { kuka: 'uX', milloin: '2026-10-01T10:00:00.000Z' } }; await sb._vpMittausPoista('2026-09-20_tk', 'kuljetus_laukaus'); } },
  palauta: { o: {}, aja: async (sb) => { sb._vpMittausCache.pT1[0].data.mitatoidut = { hyppy_cj: { kuka: 'uX', milloin: '2026-10-01T10:00:00.000Z' } }; await sb._vpMittausPalauta('2026-09-10_hh', 'hyppy_cj'); } },
};

async function ajaKaikki() {
  const ulos = {};
  for (const [nimi, s] of Object.entries(SKENAARIOT)) {
    const x = sandbox(s.o); await s.aja(x.sb);
    ulos[nimi] = { kirjoitukset: x.loki, dialogi: x.dialogit, vahvistukset: x.vahvistukset, toastit: x.toastit, valimuisti: siisti(x.sb._vpMittausCache.pT1.map((w) => ({ id: w.__id, data: w.data }))), pelaaja: siisti(x.p) };
  }
  return ulos;
}

describe('B3 · VP:n mittauskorjaus toimii ennallaan (karakterisointi)', () => {
  it('jokainen skenaario: Firestore-kirjoitukset, dialogin syöte, välimuisti, pelaaja ja toast = tallennettu VP:n käytös', async () => {
    const nyt = await ajaKaikki();
    if (process.env.TM_B3_TALLENNA === '1' || !existsSync(FIX)) { writeFileSync(FIX, JSON.stringify(nyt, null, 1) + '\n'); if (process.env.TM_B3_TALLENNA !== '1') throw new Error('fixtuuri puuttui → luotiin; aja uudelleen'); }
    const odotettu = JSON.parse(readFileSync(FIX, 'utf8'));
    expect(Object.keys(nyt)).toEqual(Object.keys(odotettu));
    for (const k of Object.keys(odotettu)) expect(nyt[k], k).toEqual(odotettu[k]);
  });
  it('fixtuuri on mielekäs: korjaus kirjoittaa lähdedokin paikallaan + audit, ja rebuild kirjoittaa pikakentät; peruttu/ei oikeutta ei kirjoita mitään', () => {
    const f = JSON.parse(readFileSync(FIX, 'utf8'));
    const k = f.korjaa_skalaari.kirjoitukset;
    expect(k[0]).toEqual({ op: 'update', polku: 'seurat/kpv/pelaajat/pT1/testitulokset/2026-09-10_hh', data: { 'testit.lin_30m': 4.71, 'korjattu.lin_30m': { kuka: 'uVP', milloin: '<ISO>' } } });
    expect(k[1].op).toBe('set'); expect(k[1].polku).toBe('seurat/kpv/pelaajat/pT1'); expect(k[1].opts).toEqual({ merge: true }); expect(k[1].data.hh_viimeisin.lin30m).toBe(4.71);
    expect(f.korjaa_skalaari.dialogi).toEqual([{ nimi: 'Lineaarinopeus 30m', yksikko: 's', arvo: 4.82, pvm: '2026-09-10', komposiitti: null }]);
    expect(f.korjaa_skalaari.toastit).toEqual([['Mittaus korjattu', 'ok']]);
    expect(f.korjaa_objekti_tulos.kirjoitukset[0].data['testit.syotto']).toEqual({ tulos: 10, yritykset: 10 });
    expect(f.korjaa_komposiitti.kirjoitukset[0].data['testit.kuljetus_laukaus']).toEqual({ raaka: 19, rangaistukset: [5, 10], ennenaikaiset: 1, netto: 15 });
    expect(f.korjaa_komposiitti.dialogi[0].komposiitti).toEqual({ raaka: 20, rangaistukset: [5], ennenaikaiset: 0, netto: 15 });
    for (const s of ['korjaa_peruttu', 'korjaa_ei_oikeutta', 'korjaa_tuntematon_dokki', 'poista_peruttu']) expect(f[s].kirjoitukset, s).toEqual([]);
    expect(f.korjaa_ei_oikeutta.dialogi).toEqual([]);
    expect(f.korjaa_oma_valmentaja.kirjoitukset.length).toBeGreaterThan(0);
    expect(f.korjaa_kirjoitus_kaatuu.kirjoitukset).toEqual([]); expect(f.korjaa_kirjoitus_kaatuu.toastit).toEqual([['Korjaus epäonnistui', 'err']]);
    expect(f.poista.kirjoitukset[0]).toEqual({ op: 'set', polku: 'seurat/kpv/pelaajat/pT1/testitulokset/2026-09-10_hh', data: { mitatoidut: { pujottelu_hh: { kuka: 'uVP', milloin: '<ISO>' } } }, opts: { merge: true } });
    expect(f.palauta.kirjoitukset[0]).toEqual({ op: 'update', polku: 'seurat/kpv/pelaajat/pT1/testitulokset/2026-09-10_hh', data: { 'mitatoidut.hyppy_cj': DEL } });
    const del = f.poista_viimeinen_tk.kirjoitukset.filter((x) => x.op === 'update' && x.polku === 'seurat/kpv/pelaajat/pT1');
    expect(del).toHaveLength(1); expect(Object.values(del[0].data).every((v) => v === DEL)).toBe(true); expect(Object.keys(del[0].data)).toEqual(['tki_pvm']);   // pelaajadokissa oli TK:sta vain tki_pvm
    expect(Object.keys(del[0].data).some((k) => /^(hh_|d1_)/.test(k))).toBe(false);   // H-H edustettu → ei poistu
    expect(f.korjaa_skalaari.pelaaja.recalc_vieras).toBe(7);   // E2.2.1: rakentumaton kenttä ei poistu
  });
});
