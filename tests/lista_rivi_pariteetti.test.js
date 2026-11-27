/* Vaihe 0 B.4 PR 2 — lista-rivi → pelaajaobjekti: tmRyhmat (D1/D2) antaa SAMAN tuloksen riveistä kuin täysistä dokumenteista (§41 yksi totuus; ei hiljaista eroa lista-tilassa). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lista_yhteenveto.js');
const NR = require('../lib/tm_nakyma_ryhmat.js');
const P = require('../lib/tm_phv_tila.js');

const NYT = Date.parse('2026-11-12T10:00:00Z');
const PVM = ['2026-10-01', '2026-03-10', '2025-09-20', '2024-05-05', null];
const PHV = [null, 'PRE', 'LAH', 'PH', 'POST', 'AN'];
function pelaajat() {
  const out = []; let n = 0;
  for (const sv of [2012, 2013, 2014, 2016]) for (const sg of ['M', 'N']) for (const pv of PVM) for (const phv of PHV.slice(0, 4)) {
    n++; const p = { etunimi: 'E' + n, sukunimi: 'S' + n, joukkue: 'FCL ' + (sg === 'N' ? 'T' : 'P') + (2026 - sv), joukkueet: ['j' + sv], syntymaVuosi: sv, sukupuoli: sg, suostumusTila: 'annettu' };
    if (n % 3) { p.tki_viimeisin = 3 + (n % 7) * 0.7; if (pv) p.tki_pvm = pv; if (n % 5 === 0) p.tki_pvm_arvio = true; }
    if (n % 2) { p.hh_viimeisin = 40 + (n % 9) * 5; p.hh_taso = 1 + (n % 4); p.hh_taso_edellinen = 1 + (n % 3); if (pv) p.hh_pvm = pv; }
    if (n % 4 === 0) { p.sm_juoksu_viimeisin = 2 + (n % 3); p.sm_juoksu_taso = 1 + (n % 3); p.sm_pallo_viimeisin = 3; }
    if (n % 6 === 0) { p.tk_kokonaistulos_viimeisin = 5; p.tk_kokonaistulos_edellinen = 6; }
    if (n % 7 === 0) p.testipaivat = { hh: pv || '2025-01-01' };
    if (phv) p.biologinenIka_viimeisin = { phv_tila_koodi: phv, maturity_offset: 0.4 };
    out.push({ id: 'p' + n, data: p });
  }
  return out;
}
const tiiv = (r) => ({ ryhma: r.ryhma, syy: r.syy, mittari: r.mittari, arvo: r.arvo, iso: r.iso, kk: r.kk, arvio: r.arvio, kausi: r.kausi, tasot: r.tasot, osat: (r.osat || []).map((o) => (o && o.avain) || o) });

describe('lista-rivi → pelaaja: pariteetti täyteen dokumenttiin', () => {
  const kaikki = pelaajat();
  const docs = kaikki.map((x) => Object.assign({ id: x.id }, x.data));
  const rivit = L.tmListaJoukkueDokumentit(kaikki, [...new Set(kaikki.map((x) => x.data.joukkueet[0]))].map((id) => ({ id, nimi: id })), NYT).flatMap((d) => d.data.rivit);
  const laajennetut = rivit.map(L.tmListaRiviPelaajaksi);
  it('kaikki pelaajat löytyvät riveiltä täsmälleen kerran (ei tippuvia)', () => { expect(rivit.length).toBe(docs.length); expect(new Set(rivit.map((r) => r.id)).size).toBe(docs.length); });
  for (const dim of ['d1', 'd2']) {
    it(dim + ': tmRyhmat(rivit) = tmRyhmat(täydet dokumentit) — ryhmä, mittari, arvo, päivä, tasot per pelaaja + joukkueluokka + kortti', () => {
      const jarj = (a) => a.slice().sort((x, y) => (x.id < y.id ? -1 : 1));
      const A = NR.tmRyhmat(dim, jarj(docs), NYT, {}), B = NR.tmRyhmat(dim, jarj(laajennetut), NYT, {});
      const kartta = (R) => { const m = {}; Object.keys(R.ryhmat).forEach((g) => R.ryhmat[g].forEach((r) => { m[r.p.id] = tiiv(r); })); return m; };
      expect(kartta(B)).toEqual(kartta(A)); expect(B.kortti).toEqual(A.kortti); expect(B.luokka).toEqual(A.luokka);
      expect(Object.keys(kartta(A)).length).toBe(docs.length);
    });
  }
  it('palvelimen d1r/d2r-koodit = selaimen tmRyhmat samoista syötteistä', () => {
    for (const dim of ['d1', 'd2']) {
      const R = NR.tmRyhmat(dim, laajennetut, NYT, {});
      Object.keys(R.ryhmat).forEach((g) => R.ryhmat[g].forEach((r) => expect(r.p['_' + dim + 'r'], r.p.id).toBe(g)));
    }
  });
  it('PHV-koodi säilyy (tmPhvKoodi samoin dokumentista ja rivistä); pikakenttä ilman mittausta pysyy tuntemattomana', () => {
    docs.forEach((d, i) => expect(P.tmPhvKoodi(laajennetut[rivit.findIndex((r) => r.id === d.id)])).toBe(P.tmPhvKoodi(d)));
  });
  it('rivi ei sisällä raskaita eikä kiellettyjä kenttiä: A-kentät/historia puuttuvat (hydrataan kortissa), _lista-lippu päällä', () => {
    laajennetut.forEach((p) => { expect(p._lista).toBe(true); expect(p.jaksofokus_historia).toBeUndefined(); expect(p.pin).toBeUndefined(); expect(p.huoltajaEmail).toBeUndefined(); });
  });
  it('rivin koko pysyy rajassa vaikka pelaajalla olisi satoja tk_/tsi_/sm_/hh_-kenttiä (tiukka whitelist, ei kuviohakua)', () => {
    const p = { etunimi: 'X', sukunimi: 'Y', joukkueet: ['j'], syntymaVuosi: 2013 };
    for (let i = 0; i < 300; i++) { p['tk_roska_' + i] = 12345.6789; p['hh_roska_' + i] = 'aaaaaaaaaaaa'; p['tsi_roska_' + i] = 1; }
    const d = L.tmListaJoukkueDokumentit([{ id: 'p', data: p }], [{ id: 'j', nimi: 'J' }], NYT)[0].data;
    expect(L.tmListaRikkomukset(d)).toEqual([]); expect(JSON.stringify(d.rivit[0]).length).toBeLessThan(600); expect(Object.keys(d.rivit[0].x || {})).toEqual([]);
  });
});
