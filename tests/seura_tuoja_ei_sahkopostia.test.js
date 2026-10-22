/* Tietoturva (vaihe 1): henkilökunnan sähköposti EI saa päätyä pelaajadokumenttiin (`tuoja`) — pelaaja ja huoltaja lukevat sen.
   Ajetaan OIKEA Seura-sivun koodi (lahetaRekisteriSahkoposti = yksittäinen lisäys, ajaExcelTuonti = Excel-tuonti) vm:ssä, muistinvarainen Firestore, keksityt demo-pelaajat.
   Vanhoja dokumentteja ei kosketa (poisto PR 2:n skriptillä). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { lataaSivu } from './helpers/sivu_ajuri.mjs';
import { fakeDb } from './_fakeFirestore.mjs';

const SPOSTI = 'vp@tm-testi.fi';
const JOUKKUEET = [{ id: 'demo_p9', nimi: 'P9' }, { id: 'demo_p10', nimi: 'P10' }];
const OTSIKOT = ['Etunimi *', 'Sukunimi *', 'Syntymävuosi *', 'Joukkue *', 'Huoltajan sähköposti *', 'PalloID (vapaaehtoinen)'];

function ymp(kentat) {
  const f = fakeDb({}), loki = { fn: [] }, el = {}, rivit = [];
  const E = (id) => el[id] || (el[id] = { id, value: (kentat || {})[id] || '', textContent: '', innerHTML: '', checked: true, disabled: false, style: {}, classList: { add() {}, remove() {} }, appendChild() {} });
  const c = lataaSivu('TalentMaster_Seura.html', {
    auth: { currentUser: { uid: 'vp' } }, db: f.db, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS' } }, app: () => ({ functions: () => ({ httpsCallable: () => async () => ({ data: { ok: true } }) }) }) },
    functions: { httpsCallable: (n) => async (d) => { loki.fn.push([n, d]); return { data: { ok: true } }; } },
    tila: { seuraId: 'demo', seuraNimi: 'Demo FC', seuraKieli: 'fi', rooli: 'vp', joukkueet: JOUKKUEET, kayttaja: { uid: 'vp-uid', email: SPOSTI }, _rekLinkki: 'https://tm.example/Rek.html?seuraId=demo', _rekHEmail: 'huoltaja@tm-testi.fi' },
    URL, URLSearchParams, setTimeout: (fn) => { fn(); return 0; }, naytaToast: () => {}, renderPelaajat() {}, _rekBaseUrl: () => 'https://tm.example/Rek.html',
    XLSX: { read: () => ({ Sheets: { S: {} }, SheetNames: ['S'] }), utils: { sheet_to_json: () => [OTSIKOT].concat(rivit) } },
    FileReader: class { readAsArrayBuffer() { Promise.resolve().then(() => this.onload({ target: { result: new ArrayBuffer(1) } })); } },
  });
  c.document = Object.assign({}, c.document, { getElementById: E, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, set textContent(v) {} }) });
  return { c, f, loki, E, rivit };
}
const pelaajat = (t) => [...t.f.D.entries()].filter(([k]) => k.startsWith('seurat/demo/pelaajat/')).map(([, v]) => v);
const onSposti = (v) => JSON.stringify(v).includes(SPOSTI);

describe('tuoja-sähköposti pois pelaajadokumentista', () => {
  it('Excel-tuonti: uusi pelaajadokumentti ei sisällä tuoja-kenttää eikä henkilökunnan sähköpostia; muu sisältö ennallaan', async () => {
    const t = ymp(); t.rivit.push(['Liisa', 'Uusi', 2016, 'P10', 'l@tm-testi.fi', '']);
    t.c.kasitteleExcelTuonti({ target: { files: [{ name: 'p2016.xlsx' }] } }); await new Promise((r) => setTimeout(r, 30));
    await t.c.ajaExcelTuonti(true);
    const p = pelaajat(t); expect(p).toHaveLength(1);
    expect('tuoja' in p[0]).toBe(false); expect(onSposti(p[0])).toBe(false);
    expect(p[0]).toMatchObject({ etunimi: 'Liisa', sukunimi: 'Uusi', seuraId: 'demo', huoltajaEmail: 'l@tm-testi.fi', suostumusTila: 'odottaa', tila: 'pilotti', lahde: 'excel_tuonti', tuotu: 'TS' });
  });
  it('Yksittäinen lisäys (kutsu sähköpostilla): uusi pelaajadokumentti ei sisällä tuoja-kenttää eikä henkilökunnan sähköpostia; muu sisältö ennallaan', async () => {
    const t = ymp({ rek_hEmail: 'huoltaja@tm-testi.fi', rek_etunimi: 'Pekko', rek_sukunimi: 'Testi', rek_joukkue: 'demo_p9' });
    await t.c.lahetaRekisteriSahkoposti();
    const p = pelaajat(t); expect(p).toHaveLength(1);
    expect('tuoja' in p[0]).toBe(false); expect(onSposti(p[0])).toBe(false);
    expect(p[0]).toMatchObject({ etunimi: 'Pekko', sukunimi: 'Testi', seuraId: 'demo', huoltajaEmail: 'huoltaja@tm-testi.fi', suostumusTila: 'odottaa', tuotu: 'TS' });
    expect(t.loki.fn.map((x) => x[0])).toContain('lahetaRekisteriKutsu');
  });
  it('lähdekoodissa ei ole `tuoja:`-kirjoitusta pelaajadokumenttiin', () => {
    expect(readFileSync(new URL('../TalentMaster_Seura.html', import.meta.url), 'utf8')).not.toMatch(/\btuoja\s*:/);
  });
});
