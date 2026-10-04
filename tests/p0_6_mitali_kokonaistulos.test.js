/**
 * Pelaaja-app V2 · Vaihe 0 · P0.6 (§31): mitali VAIN kokonaistuloksesta; lajimerkit → lajin oma paras.
 *  · _tkMitali = tkLaskeMerkki(kokonaistulos, normiIka(syntymaVuosi, TESTIPVM), sp) lukuhetkellä; "Tekniikkakilpailu 9/2026 · kultamerkki"
 *  · vanha tallennettu tki_merkki ei jää voimaan, jos uusi kokonaistulos on heikompi (vain varana, kun laskenta ei onnistu)
 *  · kokoelman lajikortit: "Pujottelu · oma paras 14,0 s" — ei kulta/hopea/pronssia, ei viitetasoa; ei dataa → lukittu (ei poistu)
 * Funktiot PURETAAN LÄHTEESTÄ ja AJETAAN (vm) oikeilla libeillä (TM_TESTIT, normiIka, tm_lang).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const TT = require('../docs/testit_indeksit.js');
const EN = require('../lib/tm_eerikkila_normit.js');
const LANG = require('../lib/tm_lang.js');
const ENN = require('../lib/tm_ennatykset.js');
function pura(tunniste) {
  const i = HTML.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') syv++; else if (HTML[k] === '}') { syv--; if (!syv) return HTML.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const ctx = () => {
  const sb = { window: { TM_TESTIT: TT, TM_ENNATYKSET: ENN }, normiIka: EN.normiIka, t: LANG.t, Date, String, Number, Object, Array, parseInt, isFinite, Math };
  vm.createContext(sb);
  vm.runInContext(['function _tkMitali(', 'function _ennRivit(', 'function _kkEnnatysTiedot(', 'function _ennLuku(', 'function _kkLajiTulos(', 'function _kkLajiAla(']
    .map(pura).join('\n') + '\nthis.m = _tkMitali; this.lt = _kkLajiTulos; this.ala = _kkLajiAla;', sb);
  return sb;
};
// Kokonaistulos jolla merkki varmasti syntyy / ei synny, ikä 12, P
const KULTA_12 = 79;   // P12 kulta < 80 (TK_KOKONAISRAJAT)
const HUONO_12 = 130;  // yli pronssirajan (105)
const pel = (o) => Object.assign({ syntymaVuosi: 2014, sukupuoli: 'M', tk_kokonaistulos_viimeisin: KULTA_12, tk_lajit_pvm: '2026-09-12' }, o);

describe('rajat (sanity)', () => {
  it('P12: 79 → kulta, 130 → ei merkkiä', () => { expect(TT.tkLaskeMerkki(KULTA_12, 12, 'P')).toBe('kulta'); expect(TT.tkLaskeMerkki(HUONO_12, 12, 'P')).toBeNull(); });
});

describe('_tkMitali — mitali vain kokonaistuloksesta', () => {
  it('teksti "Tekniikkakilpailu 9/2026 · kultamerkki" (testipvm 12.9.2026, syntymävuosi 2014 → normiIka 12)', () => {
    const m = ctx().m(pel({}));
    expect(m.merkki).toBe('kulta'); expect(m.teksti).toBe('Tekniikkakilpailu 9/2026 · kultamerkki');
  });
  it('hopea / pronssi; ikä lasketaan TESTIPÄIVÄN mukaan (ei nykyhetken): sama tulos, aiempi testipvm → nuorempi normi', () => {
    const c = ctx();
    expect(c.m(pel({ tk_kokonaistulos_viimeisin: 85 })).teksti).toBe('Tekniikkakilpailu 9/2026 · hopeamerkki');   // P12: 80 ≤ 85 < 90
    expect(c.m(pel({ tk_kokonaistulos_viimeisin: 100 })).merkki).toBe('pronssi');                                      // 90 ≤ 100 < 105
    // P11-rajat (kulta < 90): 85 → kulta kun testipvm 2025 (ikä 11); P12 (kulta < 80): 85 → hopea kun testipvm 2026
    expect(c.m(pel({ tk_kokonaistulos_viimeisin: 85, tk_lajit_pvm: '2025-09-12' })).merkki).toBe('kulta');
    expect(c.m(pel({ tk_kokonaistulos_viimeisin: 85, tk_lajit_pvm: '2026-09-12' })).merkki).toBe('hopea');
  });
  it('vanha tallennettu tki_merkki EI jää voimaan, jos kokonaistulos on heikompi', () => {
    expect(ctx().m(pel({ tk_kokonaistulos_viimeisin: HUONO_12, tki_merkki: 'kulta' }))).toBeNull();
  });
  it('ei kokonaistulosta / syntymävuotta → varana tallennettu tki_merkki; ei sitäkään → null', () => {
    const c = ctx();
    expect(c.m(pel({ tk_kokonaistulos_viimeisin: null, tki_merkki: 'hopea' })).teksti).toBe('Tekniikkakilpailu 9/2026 · hopeamerkki');
    expect(c.m({ tk_kokonaistulos_viimeisin: 79, tki_merkki: 'pronssi', tki_pvm: '2026-09-12' }).merkki).toBe('pronssi');   // ei syntymävuotta
    expect(c.m({})).toBeNull(); expect(c.m(null)).toBeNull();
  });
  it('tk_lajit_pvm puuttuu → testipäivänä tki_pvm (ikä + kuukausi sen mukaan)', () => {
    const m = ctx().m(pel({ tk_lajit_pvm: null, tki_pvm: '2025-09-12', tk_kokonaistulos_viimeisin: 85 }));
    expect(m.merkki).toBe('kulta'); expect(m.teksti).toBe('Tekniikkakilpailu 9/2025 · kultamerkki');   // ikä 11 (P11 kulta < 90)
  });
  it('kuukausi ilman etunollaa (10/2026)', () => { expect(ctx().m(pel({ tk_lajit_pvm: '2026-10-03' })).teksti).toBe('Tekniikkakilpailu 10/2026 · kultamerkki'); });
  it('tuntematon tallennettu merkki → ei mitalia (ei arvata pronssia)', () => { expect(ctx().m({ tki_merkki: 'timantti' })).toBeNull(); });
  it('testipvm puuttuu → teksti ilman päivää', () => {
    expect(ctx().m(pel({ tk_lajit_pvm: null, tki_pvm: null })).teksti).toBe('Tekniikkakilpailu · kultamerkki');
  });
  it('tavoiterivit (tekniikkaprofiili) käyttää _tkMitali:a; vanha "Sinulla on …merkki!" poissa', () => {
    expect(pura('function _minaTavoiteRivit(')).toContain('_tkMitali(p)');
    expect(HTML).not.toMatch(/Sinulla on ' \+ \(MN/);
  });
});

describe('lajimerkit → lajin oma paras (§31)', () => {
  it('oma ennätys (pääalusta) → "oma paras 14,0 s"; ei kulta/hopea/pronssia', () => {
    const c = ctx();
    const p = { ennatykset: { pujottelu: { paras: 14.0, pvm: '2026-09-12' } } };
    const lt = c.lt(p, 'pujottelu');
    expect(lt).toEqual({ arvo: 14, paras: true });
    expect(c.ala(lt, 'pujottelu')).toBe('oma paras 14,0 s');
    expect(c.ala(lt, 'pujottelu')).not.toMatch(/kulta|hopea|pronssi/i);
  });
  it('ei ennätystä (esim. kuljetus-laukaus) → viimeisin tulos tk_lajit_viimeisin:stä; ei dataa → null (kortti lukittuna, ei poistu)', () => {
    const c = ctx();
    const lt = c.lt({ tk_lajit_viimeisin: { kuljetus_laukaus_s: 16.7 } }, 'kuljetus_laukaus');
    expect(lt).toEqual({ arvo: 16.7, paras: false }); expect(c.ala(lt, 'kuljetus_laukaus')).toBe('viimeisin tulos 16,7 s');
    expect(c.lt({ tk_lajit_viimeisin: { syotto_s: 'abc' } }, 'syotto')).toBeNull();
    expect(c.lt({}, 'syotto')).toBeNull(); expect(c.lt(null, 'syotto')).toBeNull();
  });
  it('ei viitetasoa/kulta-hopea-pronssi-logiikkaa lajikorteissa: _kkMerkkiTaso/_kkMerkkiNimi poistettu', () => {
    expect(HTML).not.toContain('_kkMerkkiTaso'); expect(HTML).not.toContain('_kkMerkkiNimi');
    expect(pura('function _kkLajiTulos(')).not.toMatch(/tkLajiViite|erinomainen|hyva/);
  });
  it('kokoelma: lajikortti ansaittuna kun dataa, muuten lukittuna; edistymä laskee saman ehdon', () => {
    const lahde = pura('function _kkStripKortit(');
    expect(lahde).toMatch(/_kkLajiTulos\(p, k\.laji\)/); expect(lahde).toMatch(/_kkLajiAla\(lt, k\.laji\)/);
    expect(pura('function rMinaKokoelma(')).toMatch(/return !!_kkLajiTulos\(p, k\.laji\)/);
  });
});

describe('tm_lang: uudet avaimet fi + en, sv odotuslistalla', () => {
  const avaimet = ['tk_mitali', 'tk_mitali_ilman_pvm', 'tk_merkki_kulta', 'tk_merkki_hopea', 'tk_merkki_pronssi', 'laji_oma_paras', 'laji_viimeisin'];
  it('fi + en olemassa, sv puuttuu (Gemini)', () => {
    avaimet.forEach((k) => { expect(LANG.TM_LANG.fi.pelaaja[k], k).toBeTruthy(); expect(LANG.TM_LANG.en.pelaaja[k], k).toBeTruthy(); expect((LANG.TM_LANG.sv.pelaaja || {})[k], k).toBeUndefined(); });
  });
  it('odotuslistalla', () => {
    const lista = require('./tm_lang_sv_odotuslista.cjs');
    avaimet.forEach((k) => expect(lista).toContain('pelaaja.' + k));
  });
});
