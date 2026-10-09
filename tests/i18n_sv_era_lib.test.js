/**
 * sv-käännöserä 8.10.2026 (docs/CODE_BRIEF_I18N_SV_ERA_2026-10-08.md; Kaista: Tero) — päätös A (vaihtoehto 2): jaettu kirjastokartta lib/tm_lib_i18n.js.
 * Ennen tätä vpT / masterT / Pelaajan _p7K1T / Vanhemman _vKpT palauttivat kirjastoavaimelle (kt_…, mv_…, ry_…) avaimen ja kirjasto putosi fi-oletukseensa
 * sv-tilassakin — eikä mikään testi huomannut sitä. Tämä portti ajaa adapterit oikeasti sv-tilassa.
 * Code ei kirjoita ruotsia (CLAUDE.md §0): testit vertaavat koodin sv-arvoja Gemini-erän JSONiin, eivät sisällä omaa ruotsia.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ERA = JSON.parse(lue('docs/i18n/sv_kaannoserae_2026-10-08.json'));
const LIB = require('../lib/tm_lib_i18n.js');
const SV = LIB.TM_LIB_I18N.sv;
const LIBIT = ['tm_kehitystyopoyta', 'tm_kevyt_katselmus', 'tm_klippi_perhe', 'tm_mediaviesti', 'tm_reitin_valinta', 'tm_ryhmat', 'tm_taman_tueksi', 'tm_tanaan_kentta', 'tm_tanaan_signaali', 'tm_viikkokatsaus'];
// Libin FI-avaimet, joille sv puuttuu (palautetaan Geminille; fi-fallback). Portti on elävä: sv saapui → poista rivi.
const LIB_SV_ODOTTAA = [];   // Tyhjä: sv-erä 3 (lib.tm_kehitystyopoyta 44 + lib.tm_tanaan_signaali 1) vietiin scripts/i18n_vie_sv_era3.cjs:llä. Uusi lib-avain → lisää tähän kunnes sv saapuu.
const _VANHA_LIB_ODOTTAA = [];   // ts_otsikko saapui Gemini-erässä 2 (lib.tm_tanaan_signaali) ja vietiin scripts/i18n_vie_sv_era2.cjs:llä
// PR 5: erän 2 lib-osiot (ADAR-nimet, rubriikit, Kenttä, ADAR-tekstit, pelihavainto-valinta, havaintohistoria, ts_otsikko) — avain = lib-avain tai fi-teksti
const ERA2 = JSON.parse(lue('docs/i18n/sv_kaannoserae_2.json'));
const ERA2_LIB_OSIOT = ['lib_adar_nimet', 'lib.rubriikit', 'lib.tm_kentta', 'lib.tm_adar_tekstit', 'lib.tm_pelihavainto_valinta', 'lib.tm_havaintohistoria', 'lib.tm_tanaan_signaali'];

const muuttujat = (s) => (String(s).match(/\{[a-zA-Z_0-9]+\}/g) || []).sort();

describe('kirjastokartta: kattavuus ja muuttujat', () => {
  const kaikkiFi = {};
  for (const l of LIBIT) for (const [k, v] of Object.entries(require('../lib/' + l + '.js').FI)) kaikkiFi[k] = v;
  for (const o of ERA2_LIB_OSIOT) for (const [k, r] of Object.entries(ERA2.osiot[o].rivit)) kaikkiFi[k] = r.fi;

  it('jokaiselle kirjaston FI-avaimelle on sv-rivi (paitsi nimetyt Geminiltä odottavat)', () => {
    const puuttuu = Object.keys(kaikkiFi).filter((k) => typeof SV[k] !== 'string' && !/^mv_pohja_/.test(k));
    expect(puuttuu.filter((k) => LIB_SV_ODOTTAA.indexOf(k) < 0)).toEqual([]);
  });
  it('odotuslista on elävä: jokainen rivi on yhä libin FI-avain JA yhä ilman sv:tä', () => {
    expect(LIB_SV_ODOTTAA.filter((k) => !(k in kaikkiFi))).toEqual([]);
    expect(LIB_SV_ODOTTAA.filter((k) => typeof SV[k] === 'string')).toEqual([]);
  });
  it('ei ylimääräisiä sv-avaimia (jokainen sv-avain on jonkin libin FI-avain, tai mv_pohjat)', () => {
    expect(Object.keys(SV).filter((k) => k !== 'mv_pohjat' && !(k in kaikkiFi))).toEqual([]);
  });
  it('sv-muuttujat vastaavat fi-muuttujia ({gen} ei sv:ssä)', () => {
    const eroavat = Object.keys(SV).filter((k) => k !== 'mv_pohjat').filter((k) => JSON.stringify(muuttujat(SV[k])) !== JSON.stringify(muuttujat(kaikkiFi[k])));
    expect(eroavat).toEqual([]);
    expect(Object.keys(SV).filter((k) => typeof SV[k] === 'string' && SV[k].indexOf('{gen}') >= 0)).toEqual([]);
  });
  it('sv-arvot ovat täsmälleen Gemini-erän JSONin arvot (kopioitu skriptillä, ei käsin) — alun/lopun välilyönnit ja entiteetit mukaan', () => {
    for (const l of LIBIT) for (const [k, r] of Object.entries(ERA.osiot['lib.' + l].rivit)) expect(SV[k], l + ' ' + k).toBe(r.sv);
  });
  it('mv_pohjat: 3 tyyppiä × 3 rekisteriä × 3 kysymystä, sama muoto kuin fi (POHJAT)', () => {
    const POHJAT = require('../lib/tm_mediaviesti.js').POHJAT;
    for (const ty of Object.keys(POHJAT)) for (const r of Object.keys(POHJAT[ty])) {
      expect(SV.mv_pohjat[ty][r].length, ty + '.' + r).toBe(POHJAT[ty][r].length);
      expect(SV.mv_pohjat[ty][r], ty + '.' + r).toEqual(ERA.osiot['lib.tm_mediaviesti.kysymyspohjat'].rivit[ty][r].sv);
    }
  });
  it('sanasto D54: sanaa "ase" ei esiinny sv-teksteissä', () => {
    const kaikki = Object.keys(SV).filter((k) => k !== 'mv_pohjat').map((k) => SV[k]).concat([].concat(...Object.values(SV.mv_pohjat).map((o) => [].concat(...Object.values(o)))));
    expect(kaikki.filter((s) => /\base\b/i.test(s))).toEqual([]);
  });
});

describe('tmLibT / tmLibPohjat (puhdas)', () => {
  it('fi → undefined (kutsuja putoaa nykyiseen reittiinsä); sv → kartan teksti; tuntematon avain → undefined', () => {
    expect(LIB.tmLibT('kt_ei_oikeutta', 'fi')).toBeUndefined();
    expect(LIB.tmLibT('kt_ei_oikeutta', 'sv')).toBe(SV.kt_ei_oikeutta);
    expect(LIB.tmLibT('ei_ole_olemassa', 'sv')).toBeUndefined();
    expect(LIB.tmLibT('toString', 'sv')).toBeUndefined();   // prototyyppiavain ei vuoda
    expect(LIB.tmLibT(null, 'sv')).toBeUndefined();
  });
  it('mv_pohja_<tyyppi>_<rekisteri>_<n> johdetaan mv_pohjat-taulukoista (yksi totuus)', () => {
    expect(LIB.tmLibT('mv_pohja_onnistui_leikkija_2', 'sv')).toBe(SV.mv_pohjat.onnistui.leikkija[1]);
    expect(LIB.tmLibT('mv_pohja_tulos_showcase_3', 'sv')).toBe(SV.mv_pohjat.tulos.showcase[2]);
    expect(LIB.tmLibT('mv_pohja_onnistui_leikkija_4', 'sv')).toBeUndefined();
    expect(LIB.tmLibPohjat('prosessi', 'rakentaja', 'fi')).toBeNull();
    expect(LIB.tmLibPohjat('prosessi', 'rakentaja', 'sv')).toEqual(SV.mv_pohjat.prosessi.rakentaja);
  });
});

function sandbox(kieli) {
  const sb = { console: { log() {}, warn() {}, error() {} } };
  sb.window = sb;
  vm.createContext(sb);
  ['lib/tm_lang.js', 'lib/tm_lib_i18n.js', 'lib/tm_i18n_common.js', 'lib/tm_vp_i18n.js', 'lib/tm_master_i18n.js', 'lib/tm_mediaviesti.js'].forEach((f) => vm.runInContext(lue(f), sb));
  vm.runInContext("tmAsetaKieli('" + kieli + "', false);", sb);
  return sb;
}

describe('adapterit sv-tilassa palauttavat kirjastoavaimelle sv-tekstin (ennen: avain → fi-oletus)', () => {
  const avaimet = ['kt_ei_oikeutta', 'mv_otsikko', 'ry_otsikko', 'k3_osio_otsikko', 'kk_otsikko', 'k4_otsikko', 'kp_otsikko', 'ts_kuorma', 'k1_vahvuutesi', 'mv_pohja_prosessi_rakentaja_1'];
  it('vpT ja masterT: sv → kartan teksti; fi → avain sellaisenaan (kirjasto käyttää FI-oletusta)', () => {
    const sv = sandbox('sv'), fi = sandbox('fi');
    for (const k of avaimet) {
      const odotettu = LIB.tmLibT(k, 'sv'); expect(odotettu, k).toBeTruthy();
      expect(sv.vpT(k), 'vpT ' + k).toBe(odotettu); expect(sv.masterT(k), 'masterT ' + k).toBe(odotettu);
      expect(fi.vpT(k), 'vpT fi ' + k).toBe(k); expect(fi.masterT(k), 'masterT fi ' + k).toBe(k);
    }
  });
  it('en-tilassa ei sv-vuotoa: kirjastoavain pysyy avaimena (fi-oletus)', () => {
    const en = sandbox('en'); expect(en.vpT('kt_ei_oikeutta')).toBe('kt_ei_oikeutta'); expect(en.masterT('mv_otsikko')).toBe('mv_otsikko');
  });
  it('fi-tekstiavain toimii ennallaan (vpT/masterT: ei törmäystä kirjastoavaimiin)', () => {
    const sv = sandbox('sv');
    expect(sv.vpT('Ryhmät')).toBe(ERA.osiot.vp_otsikot_data_i18n.rivit['Ryhmät'].sv);
    expect(sv.masterT('Ydinvahvuus')).toBe(ERA.osiot.master_kartta.rivit['Ydinvahvuus'].sv);
  });
  it('kirjasto renderöi sv:ksi: tmMvPohjat palauttaa sv-taulukon sv-tilassa, fi-taulukon fi-tilassa', () => {
    const sv = sandbox('sv'), fi = sandbox('fi');
    expect(sv.TM_MEDIAVIESTI.tmMvPohjat('onnistui', 'leikkija').map((p) => p.teksti)).toEqual(SV.mv_pohjat.onnistui.leikkija);
    expect(sv.TM_MEDIAVIESTI.tmMvPohjat('onnistui', 'leikkija').map((p) => p.avain)).toEqual(['mv_pohja_onnistui_leikkija_1', 'mv_pohja_onnistui_leikkija_2', 'mv_pohja_onnistui_leikkija_3']);   // avaimet ennallaan
    expect(fi.TM_MEDIAVIESTI.tmMvPohjat('onnistui', 'leikkija').map((p) => p.teksti)).toEqual(require('../lib/tm_mediaviesti.js').POHJAT.onnistui.leikkija);
  });
  it('kirjasto + adapteri yhdessä: tmTeksti(avain, { t: vpT | masterT }) palauttaa sv-tilassa sv:n, fi-tilassa kirjaston FI-oletuksen', () => {
    const sv = sandbox('sv'), fi = sandbox('fi');
    for (const s of [sv, fi]) vm.runInContext(lue('lib/tm_reitin_valinta.js'), s);
    const R = require('../lib/tm_reitin_valinta.js');
    for (const k of ['k3_osio_otsikko', 'k3_osio_ohje']) {
      expect(sv.TM_REITIN_VALINTA.tmTeksti(k, { t: sv.vpT }), 'vpT ' + k).toBe(SV[k]); expect(sv.TM_REITIN_VALINTA.tmTeksti(k, { t: sv.masterT }), 'masterT ' + k).toBe(SV[k]);
      expect(fi.TM_REITIN_VALINTA.tmTeksti(k, { t: fi.vpT }), 'fi ' + k).toBe(R.FI[k]);
    }
  });
});

// Pelaajan _p7K1T ja Vanhemman _vKpT: sovellus-HTML:n funktiot ajetaan vm:ssä (ei kopioita) tm_lang + tm_lib_i18n -ympäristössä.
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(i, j + 1); } throw new Error('ei sulje ' + alku); }
describe('Pelaaja _p7K1T ja Vanhempi _vKpT sv-tilassa', () => {
  const PE = lue('TalentMaster_Pelaaja_v7.html'), VA = lue('TalentMaster_Vanhempi_v2.html');
  function app(kieli) {
    const sb = { console: { log() {}, warn() {}, error() {} } }; sb.window = sb; vm.createContext(sb);
    ['lib/tm_lang.js', 'lib/tm_lib_i18n.js'].forEach((f) => vm.runInContext(lue(f), sb));
    vm.runInContext("tmAsetaKieli('" + kieli + "', false);", sb);
    vm.runInContext("const _TMAP = {}; const T = (k, m) => (typeof t === 'function' ? t(k.indexOf('.') >= 0 ? k : (_TMAP[k] || ('pelaaja.' + k)), m) : k);\n" + funktio(PE, 'function _p7K1T(') + "\n" + funktio(VA, 'function _vKpT('), sb);
    return sb;
  }
  it('sv: kirjastoavain → sv-teksti (Pelaaja + Vanhempi); tuntematon avain → avain (kirjasto putoaa fi-oletukseen)', () => {
    const sv = app('sv');
    for (const k of ['k1_vahvuutesi', 'k4_otsikko', 'k3_osio_otsikko', 'kp_otsikko', 'mv_otsikko']) {
      const o = LIB.tmLibT(k, 'sv'); expect(o, k).toBeTruthy();
      expect(vm.runInContext('_p7K1T(' + JSON.stringify(k) + ')', sv), 'Pelaaja ' + k).toBe(o);
      expect(vm.runInContext('_vKpT(' + JSON.stringify(k) + ')', sv), 'Vanhempi ' + k).toBe(o);
    }
    expect(vm.runInContext("_p7K1T('ei_ole_olemassa_xyz')", sv)).toBe('ei_ole_olemassa_xyz'); expect(vm.runInContext("_vKpT('ei_ole_olemassa_xyz')", sv)).toBe('ei_ole_olemassa_xyz');
  });
  it('fi: kirjastoavain → avain (kirjasto käyttää FI-oletusta) — käytös ennallaan', () => {
    const fi = app('fi'); expect(vm.runInContext("_p7K1T('k1_vahvuutesi')", fi)).toBe('k1_vahvuutesi'); expect(vm.runInContext("_vKpT('kp_otsikko')", fi)).toBe('kp_otsikko');
  });
});

describe('vienti: kartat sisältävät Gemini-erän rivit sellaisinaan', () => {
  const sb = sandbox('sv');
  it('tm_lang: 58 riviä, sv = JSON; ei odotuslistalla', () => {
    const L = require('../lib/tm_lang.js').TM_LANG; const rivit = ERA.osiot.tm_lang.rivit; expect(Object.keys(rivit).length).toBe(58);
    for (const [p, r] of Object.entries(rivit)) expect(p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L.sv), p).toBe(r.sv);
    // erän 58 riviä ovat valmiita: yksikään niistä ei saa olla odotuslistalla (lista sisältää vain myöhempien PR:ien uudet fi+en-avaimet)
    expect(require('./tm_lang_sv_odotuslista.cjs').filter((a) => a in rivit)).toEqual([]);
  });
  it('VP-kartta: 193 + 4 riviä (sv = JSON; tai jo common-kartassa); Master: 67 + 3', () => {
    const cm = vm.runInContext('TM_I18N_COMMON.sv', sb), vp = vm.runInContext('TM_VP_I18N.sv', sb), ma = vm.runInContext('TM_MASTER_I18N.sv', sb);
    for (const [osio, kartta, n] of [['vp_kartta', vp, 193], ['vp_otsikot_data_i18n', vp, 4], ['master_kartta', ma, 67], ['master_otsikot_data_i18n', ma, 3]]) {
      const rivit = ERA.osiot[osio].rivit; expect(Object.keys(rivit).length, osio).toBe(n);
      for (const [fi, r] of Object.entries(rivit)) expect(kartta[fi], osio + ' ' + fi).toBe(r.sv);
    }
    for (const k of [...Object.keys(ERA.osiot.vp_kartta.rivit), ...Object.keys(ERA.osiot.vp_otsikot_data_i18n.rivit), ...Object.keys(ERA.osiot.master_kartta.rivit), ...Object.keys(ERA.osiot.master_otsikot_data_i18n.rivit)]) expect(k in cm, 'dedupe-invariantti (common): ' + k).toBe(false);
  });
});

describe('kytkentä: script-tagi + SW-allowlist + cache-bumpit (§27.4)', () => {
  it('tm_lib_i18n.js ladataan VP:ssä, Masterissa, Pelaajassa ja Vanhemmassa — tm_lang.js:n JÄLKEEN', () => {
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) {
      const s = lue(f); const a = s.indexOf('lib/tm_lang.js?v='), b = s.indexOf('<script src="lib/tm_lib_i18n.js?v=');
      expect(a, f).toBeGreaterThan(0); expect(b, f).toBeGreaterThan(a);
    }
  });
  it('SW:t (Pelaaja, Vanhempi) cachettavat tm_lib_i18n.js:n; cache-versio nostettu', () => {
    expect(lue('sw_pelaaja.js')).toContain("'/lib/tm_lib_i18n.js'"); expect(lue('sw_vanhempi.js')).toContain("'/lib/tm_lib_i18n.js'");
    expect(lue('sw_pelaaja.js')).toMatch(/const CACHE = 'tm-pelaaja-v(8[2-9]|9\d|\d{3})'/); expect(lue('sw_vanhempi.js')).toMatch(/const CACHE = 'tm-vanhempi-v(5[3-9]|[6-9]\d|\d{3})'/);
  });
  it('tm_lang.js:n ?v on sama ja ≥ 33 kaikissa sovelluksissa (jokainen tm_lang-muutos bumppaa kaikki — muuten stale-klientit näkevät raakoja avaimia)', () => {
    const vs = new Set(); for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Seura.html', 'TalentMaster_Rekisterointi_Suostumus.html', 'TalentMaster_Pelihavainto_Kentta.html']) { const m = /lib\/tm_lang\.js\?v=(\d+)/.exec(lue(f)); expect(m, f).toBeTruthy(); vs.add(+m[1]); }
    expect([...vs].length).toBe(1); expect([...vs][0]).toBeGreaterThanOrEqual(33);
  });
  it('vpT / masterT / _p7K1T / _vKpT katsovat kirjastokartan ENSIN', () => {
    expect(lue('lib/tm_vp_i18n.js')).toMatch(/function vpT\(fi\) \{[^}]*tmLibT\(fi\)/); expect(lue('lib/tm_master_i18n.js')).toMatch(/function masterT\(fi\) \{[^}]*tmLibT\(fi\)/);
    expect(lue('TalentMaster_Pelaaja_v7.html')).toMatch(/function _p7K1T\(k\) \{[^\n]*tmLibT\(k\)/); expect(lue('TalentMaster_Vanhempi_v2.html')).toMatch(/function _vKpT\(k\) \{[^\n]*tmLibT\(k\)/);
  });
  it('kielivahti: lib_fi → sv-reitti = lib/tm_lib_i18n.js', () => {
    const c = JSON.parse(lue('tools/i18n/kielivahti.config.json')); expect(c.tyypit.lib_fi).toContain('lib/tm_lib_i18n.js'); expect(c.tyypit.lib_fi).not.toContain('PUUTTUU');
  });
});
