/**
 * PR G — H-H- vs tekniikkakilpailu-pujottelu/-syöttö (protokollaero TUNNISTEELLA) + TK-viitetason lähde näkyviin.
 *
 * Tero 4.10.2026: "tärkeää erottaa H-H-pujottelu ja tekniikkakilpailun pujottelu, alueellinen ja valtakunnallinen ero."
 *
 *  a) pujottelu_hh/syotto_hh (H-H, hh_viimeisin, FINAL2024 eerikkilaTaso) ≠ pujottelu/syotto (TK, tk_lajit_viimeisin,
 *     TK_LAJIVIITTEET/TKI). Erottelu avaimella/protokollamerkinnällä — EI mittakaavalla (tkValitavoitteen 0.6–1.8 on
 *     vain varmistus). Ajetaan OIKEAT kirjoittajat ja lukijat (lib + HTML-funktiot vm:ssä lähteestä).
 *  b) TK_LAJIVIITTEET_ALUE (alueellinen, kaikki P8–13/T8–13) ja TK_LAJIVIITTEET_VALTAK (loppukilpailut) rinnakkain.
 *     Lapsen + huoltajan tavoite AINA alueellisesta; valtakunnallinen vain henkilökunnalle "loppukilpailutaso"-merkinnällä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const T = require('../docs/testit_indeksit.js');
const GEN = require('../docs/tk_lajiviitteet.js');
const K = require('../lib/tm_testikatalogi.js');
const PK = require('../lib/tm_pikakentat.js');
const E = require('../lib/tm_ennatykset.js');
const KAARI = require('../lib/tm_kehityskaari.js');
const EN = require('../lib/tm_eerikkila_normit.js');
const LANG = require('../lib/tm_lang.js');
const VUOSI = new Date().getFullYear();

function pura(src, tun) {
  const i = src.indexOf(tun); expect(i, tun).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } }
  throw new Error('sulkeet: ' + tun);
}
const tx = (h) => String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
// Kaikki testit_indeksit.js:n eksportit globaaleiksi (Master/Pelaaja lataavat sen klassisena scriptinä).
const T_GLOBAALIT = Object.assign({}, T);

const P13 = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'KPV U13' };
const TK_TAYSI = { ponnauttelu: 18.0, syotto: 35.0, pujottelu: 26.0, kuljetus_laukaus: 14.0 };

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// a) PROTOKOLLAERO TUNNISTEELLA — kirjoittajat
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('a) lib/tm_testikatalogi.tmTestiProtokollaId — tunnistesääntö', () => {
  it.each([
    ['pujottelu_hh', {}, 'tekniikkakilpailu', 'pujottelu_hh'],        // kanoninen H-H-id voittaa aina
    ['pujottelu', {}, 'tekniikkakilpailu', 'pujottelu'],              // TK-dokki → TK
    ['pujottelu', {}, undefined, 'pujottelu'],                        // Pikakirjaus/Testaus (ei protokollaa) → TK-id
    ['pujottelu', {}, 'hh_laaja', 'pujottelu_hh'],                    // vanha Excel-H-H-dokki ilman merkintää
    ['syotto', {}, 'hh_suppea', 'syotto_hh'],
    ['pujottelu', { pujottelu_protokolla: 'hh' }, 'tekniikkakilpailu', 'pujottelu_hh'],   // merkintä voittaa
    ['pujottelu', { pujottelu_protokolla: 'tk' }, 'hh_laaja', 'pujottelu'],
    ['pujottelu_hh', { pujottelu_protokolla: 'tk' }, 'hh_laaja', 'pujottelu'],             // Excel tallensi TK-valinnan H-H-sarakkeella
    ['lin30m', {}, 'hh_laaja', 'lin30m'],
  ])('%s + %j (%s) → %s', (avain, testit, proto, odotus) => {
    expect(K.tmTestiProtokollaId(avain, testit, proto)).toBe(odotus);
  });
  it('tmTkHhNormalisoi: merkinnät pois, eksplisiittinen avain voittaa törmäyksessä, ei mutatoi', () => {
    const t = { pujottelu: 12.1, pujottelu_protokolla: 'hh', syotto_hh: 11.0, syotto: 35, ponnauttelu: 18 };
    const n = K.tmTkHhNormalisoi(t, 'tekniikkakilpailu');
    expect(n).toEqual({ pujottelu_hh: 12.1, syotto_hh: 11.0, syotto: 35, ponnauttelu: 18 });
    expect(t.pujottelu).toBe(12.1);
  });
});

describe('a) tm_pikakentat (Pikakirjaus/Testituonti/Testaus-pariteetti): H-H → hh_viimeisin, TK → tk_lajit/TKI', () => {
  it('H-H-avaimet eivät tuota TK-pikakenttiä eikä TKI:tä', () => {
    const u = PK.tmLaskePikakentat(P13, { pujottelu_hh: 12.1, syotto_hh: 11.5 }, '2026-09-01');
    expect(u.hh_viimeisin).toEqual({ pujottelu: 12.1, syotto: 11.5 });
    expect(u.tk_lajit_viimeisin).toBeUndefined();
    expect(u.tki_viimeisin).toBeUndefined();
  });
  it('TK-avaimet eivät tuota hh_viimeisin-pujottelua', () => {
    const u = PK.tmLaskePikakentat(P13, TK_TAYSI, '2026-09-01');
    expect(u.tk_lajit_viimeisin.pujottelu_s).toBe(26.0);
    expect(u.tki_viimeisin).not.toBeUndefined();
    expect(u.hh_viimeisin).toBeUndefined();
  });
});

describe('a) Testituonti_Master: sarakkeen tunnistus tapahtuman protokollalla + otsikkomerkinnällä', () => {
  const S = lue('TalentMaster_Testituonti_Master.html');
  const ctx = vm.createContext({ console });
  vm.runInContext([
    'var tuontiData = { testiSarakkeet: [], pelaajat: [] };',
    pura(S, 'const PROTOKOLLAT = {'),
    S.slice(S.indexOf('const TT_TKHH_PARI'), S.indexOf('\n', S.indexOf('const TT_TKHH_PARI'))),
    pura(S, 'function ttOtsikonProtokolla('), pura(S, 'function tunnistaTestiId('), pura(S, 'function ttTunnistaProtokollista('),
    pura(S, 'function ttKohdistaProtokollaan('),
    pura(S, 'const TT_LIB_AVAIN = {') + ';', pura(S, 'function ttLibTulokset('),
    'this.api = { tunnistaTestiId, ttKohdistaProtokollaan, ttLibTulokset, get tuontiData() { return tuontiData; } };',
  ].join('\n'), ctx);
  const A = ctx.api;
  it.each([
    ['Pujottelu', 'tekniikkakilpailu', 'pujottelu'],     // ENNEN: pujottelu_hh (hh_laaja ensin PROTOKOLLAT-järjestyksessä)
    ['Syöttö', 'tekniikkakilpailu', 'syotto'],           // ENNEN: syotto_hh
    ['Pujottelu', 'hh_laaja', 'pujottelu_hh'],
    ['Syöttö', 'hh_laaja', 'syotto_hh'],
    ['Pujottelu (H-H)', 'tekniikkakilpailu', 'pujottelu_hh'],   // otsikon eksplisiittinen merkintä voittaa
    ['Pujottelu (lajitekniikka)', 'tekniikkakilpailu', 'pujottelu_hh'],
    ['Pujottelu TK', 'hh_laaja', 'pujottelu'],
    ['Ponnauttelu', 'tekniikkakilpailu', 'ponnauttelu'],
  ])('"%s" tapahtumassa %s → %s', (otsikko, proto, odotus) => {
    expect(A.tunnistaTestiId(otsikko, proto).id).toBe(odotus);
  });
  it('ttKohdistaProtokollaan: Excel luettu ennen tapahtumaa → TK-tapahtuma siirtää arvot TK-id:lle → tmLaskePikakentat TK-polulle', () => {
    const td = A.tuontiData;
    td.testiSarakkeet = ['Ponnauttelu', 'Syöttö', 'Pujottelu', 'Kuljetus-laukaus'].map((o, i) => {
      const r = A.tunnistaTestiId(o); return { index: i, otsikko: o, testiId: r.id, testiData: r.testi, protoKey: r.proto };
    });
    expect(td.testiSarakkeet.map((s) => s.testiId)).toContain('pujottelu_hh');   // EI VACUOUS: vanha protokollasokea tulos
    td.pelaajat = [{ testit: { ponnauttelu: '18', syotto_hh: '35', pujottelu_hh: '26', kuljetus_laukaus: '14' } }];
    A.ttKohdistaProtokollaan('tekniikkakilpailu');
    expect(td.pelaajat[0].testit).toEqual({ ponnauttelu: '18', syotto: '35', pujottelu: '26', kuljetus_laukaus: '14' });
    const u = PK.tmLaskePikakentat(P13, A.ttLibTulokset(td.pelaajat[0].testit), '2026-09-01');
    expect(u.tk_lajit_viimeisin).toMatchObject({ pujottelu_s: 26, syotto_s: 35 });
    expect(u.hh_viimeisin).toBeUndefined();   // TK-sekunnit EIVÄT H-H-normiin
  });
});

// Excel_Tuonti: aja tallennaFirestoreen-funktion OMA paketinrakennus (pelaajat.map) vm:ssä.
function ajaExcelPaketit({ protokolla, sarakkeet, testit, protoValinta }) {
  const S = lue('TalentMaster_Excel_Tuonti.html');
  const a = S.indexOf('const paketit = pelaajat.map(p => {');
  const runko = pura(S.slice(a), 'const paketit = pelaajat.map(p => {');
  const ctx = vm.createContext(Object.assign({}, T_GLOBAALIT, {
    console, Math, Number, String, Object, isNaN, parseFloat, parseInt, Date, Set, Array,
    laskeHHTaso: EN.laskeHHTaso, laskeIka: () => 13, _kausiPvm: () => null, _paivaIso: () => '2026-09-01',
    tuontiData: { testiSarakkeet: sarakkeet.map((id) => ({ testiId: id })), meta: { protoValinta: protoValinta || {}, kausi: '' } },
    pelaajat: [{ testit, testauspvm: '2026-09-01', sukupuoli: 'M', syntymaVuosi: 2013 }],
    tapahtuma: { pvm: '2026-09-01', protokolla }, onTekniikka: protokolla === 'tekniikkakilpailu',
    onHH: protokolla === 'hh_laaja', proto: {},
  }));
  vm.runInContext(runko + ');\nthis.paketit = paketit;', ctx);
  return ctx.paketit[0];
}

describe('a) Excel_Tuonti: pujottelu/syöttö-protokollavalinta reititetään TUNNISTEELLE ennen TKI-laskentaa', () => {
  it('TK-tiedosto + "Pujottelu"-sarake valittu H-H:ksi → arvo pujottelu_hh:ksi + hh_viimeisin; EI TKI:hin/TK-avaimeen', () => {
    const pk = ajaExcelPaketit({ protokolla: 'tekniikkakilpailu', sarakkeet: ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'],
      testit: { ponnauttelu: '18', syotto: '35', pujottelu: '12.1', kuljetus_laukaus: '14' }, protoValinta: { pujottelu: 'hh' } });
    expect(pk.testit.pujottelu).toBeUndefined();
    expect(pk.testit.pujottelu_hh).toBe(12.1);
    expect(pk.testit.pujottelu_protokolla).toBe('hh');
    expect(pk.hhViimeisin).toEqual({ pujottelu: 12.1 });
    // TKI/kokonaistulos ILMAN H-H-arvoa: 18 + 35 + 14 = 67 (ennen 79.1 = H-H-sekunnit mukana)
    expect(pk.kokonaistulos).toBe(T.laskeKokonaistulos({ ponnauttelu: 18, syotto: 35, kuljetus_laukaus: 14 }, 13, 'P'));
    // ennätys-/tk_lajit-syötteet (testit-kartta) eivät näe H-H-arvoa TK-avaimella
    expect(E.tmEnnatysTulokset(pk.testit, 'tuntematon', '2026-09-01').map((r) => r.testi)).not.toContain('pujottelu');
  });
  it('TK-tiedosto, oletusvalinta → pujottelu pysyy TK-avaimella ja TKI:ssä; ei hh_viimeisiniin', () => {
    const pk = ajaExcelPaketit({ protokolla: 'tekniikkakilpailu', sarakkeet: ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'],
      testit: { ponnauttelu: '18', syotto: '35', pujottelu: '26', kuljetus_laukaus: '14' } });
    expect(pk.testit.pujottelu).toBe(26);
    expect(pk.testit.pujottelu_protokolla).toBe('tk');
    expect(pk.hhViimeisin).toBeNull();
    expect(pk.kokonaistulos).toBe(T.laskeKokonaistulos(TK_TAYSI, 13, 'P'));
  });
  it('H-H-tiedosto + H-H-sarake valittu TK:ksi → TK-avaimelle (ei hh_viimeisiniin)', () => {
    const pk = ajaExcelPaketit({ protokolla: 'hh_laaja', sarakkeet: ['lin30m', 'pujottelu_hh'],
      testit: { lin30m: '5.0', pujottelu_hh: '26' }, protoValinta: { pujottelu: 'tk' } });
    expect(pk.testit.pujottelu).toBe(26);
    expect(pk.testit.pujottelu_hh).toBeUndefined();
    expect(pk.hhViimeisin.pujottelu).toBeUndefined();
    expect(pk.hhViimeisin.lin30m).toBe(5);
  });
  it('recalc/backfill lukevat tallennetun dokin normalisoituna (_tkHhNorm → lib)', () => {
    const S = lue('TalentMaster_Excel_Tuonti.html');
    const ctx = vm.createContext({ TM_TESTIKATALOGI: K });
    vm.runInContext(pura(S, 'function _tkHhNorm(') + '\nthis.f = _tkHhNorm;', ctx);
    expect(ctx.f({ pujottelu: 12.1, pujottelu_protokolla: 'hh', ponnauttelu: 18 }, 'tekniikkakilpailu')).toEqual({ pujottelu_hh: 12.1, ponnauttelu: 18 });
    // kaikki tallennettujen dokkien TK-lukijat käyttävät normalisoitua karttaa
    expect(S.match(/laskeKokonaistulos\(_dTestit, ika, sp\)/g).length).toBe(2);
    expect(S.match(/_tkLajitPikakentat\(_dTestit, ika\)/g).length).toBe(2);
    expect(S).not.toMatch(/laskeKokonaistulos\(d\.testit/);
    expect(S).toContain("const hvOf = function(testit, proto){ testit = _tkHhNorm(testit, proto);");
  });
});

describe('a) VP-mittauslista/rebuild: vanha Excel-H-H-dokki ei valu TK-polulle', () => {
  const S = lue('TalentMaster_VP_v25.html');
  const lines = S.split('\n');
  const s = lines.findIndex((l) => l.includes('var _VPM_KEYNORM'));
  const e = lines.findIndex((l) => l.includes('window._vpMittausRebuildMerkinnat = _vpMittausRebuildMerkinnat'));
  const ctx = vm.createContext({ window: { TM_TESTIKATALOGI: K } });
  vm.runInContext(lines.slice(s, e).join('\n') + '\nthis.f = _vpMittausRebuildMerkinnat;', ctx);
  it('legacy {pujottelu + _protokolla:hh} TK-dokissa → hh_viimeisin.pujottelu; tk_lajit ilman pujottelua', () => {
    const cache = [{ __id: 'a', data: { testauspvm: '2026-09-01', protokolla: 'tekniikkakilpailu',
      testit: Object.assign({}, TK_TAYSI, { pujottelu: 12.1, pujottelu_protokolla: 'hh' }) } }];
    const m = ctx.f(cache);
    expect(m[0].tulokset.pujottelu).toBeUndefined();
    expect(m[0].tulokset.pujottelu_hh).toBe(12.1);
    const r = PK.tmRakennaPikakentatArkistosta(P13, m);
    expect(r.upd.hh_viimeisin.pujottelu).toBe(12.1);
    expect(r.upd.tk_lajit_viimeisin.pujottelu_s).toBeUndefined();
    expect(r.upd.tki_historia[0].pujottelu_s).toBeUndefined();
  });
});

describe('a) tm_ennatykset: H-H ei TK-ennätykseen eikä siemeneksi', () => {
  it('pujottelu_hh ja hh-merkitty pujottelu eivät tuota pujottelu-ennätystä; TK-pujottelu tuottaa', () => {
    expect(E.tmEnnatyksetUpd(null, { pujottelu_hh: 12.1 }, 'tuntematon', '2026-09-01')).toBeNull();
    expect(E.tmEnnatyksetUpd(null, { pujottelu: 12.1, pujottelu_protokolla: 'hh' }, 'tuntematon', '2026-09-01')).toBeNull();
    expect(E.tmEnnatyksetUpd(null, { pujottelu: 26 }, 'tuntematon', '2026-09-01').ennatykset.pujottelu.paras).toBe(26);
  });
  it('siemen: hh_historia/hh_viimeisin-pujottelu EI; tki_historia/tk_lajit pujottelu_s KYLLÄ', () => {
    const s = E.tmEnnatysSiemenet({ hh_historia: [{ pvm: '2026-05-01', pujottelu: 12.1, syotto: 11 }], hh_viimeisin: { pujottelu: 12.0 }, hh_pvm: '2026-06-01',
      tki_historia: [{ pvm: '2026-05-01', pujottelu_s: 26.4 }] });
    expect(s.pujottelu).toEqual([{ arvo: 26.4, pvm: '2026-05-01', alusta: null }]);
    expect(s.syotto).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// a) PROTOKOLLAERO — lukijat (kehityskaari, Pelaaja-tekniikkaprofiili)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('a) tm_kehityskaari: H-H- ja TK-sarjat eri riveinä, jaksosidos lukee TK-sarjan', () => {
  const p = {
    hh_historia: [{ pvm: '2026-03-01', pujottelu: 12.5 }, { pvm: '2026-06-01', pujottelu: 12.0 }],
    tki_historia: [{ pvm: '2026-03-01', pujottelu: 26 }, { pvm: '2026-06-01', pujottelu: 25 }],
    jaksofokus_historia: [{ nimi: 'Pujottelujakso', domeeni: 'tekninen', alkoi: '2026-04-01', paattyi: '2026-05-01' }],
  };
  const h = tx(KAARI.tmKaariRenderFull(p, {}));
  it('valmentajanäkymä nimeää lähteen', () => {
    expect(h).toMatch(/Pujottelu \(H-H\).*12\.5→12/);
    expect(h).toMatch(/Pujottelu \(TK-kisa\).*26→25/);
  });
  it('jaksofokus-sidos (tekninen) = TK-sarja, EI H-H-sekunnit', () => {
    expect(h).toMatch(/Jakso: .*Pujottelu \(TK-kisa\) 26→25/);
    expect(h).not.toMatch(/Jakso: .*12\.5→12/);
  });
  it('pelaajanäkymä: kaksi eri lausetta (ei samaa "Pujottelu parani" kahteen kertaan)', () => {
    const hp = tx(KAARI.tmKaariRenderPelaaja(p, {}));
    expect(hp).toContain('Pujottelu (H-H-testi) parani');
    expect(hp).toContain('Pujottelu (tekniikkakisa) parani');
  });
});

describe('a) Pelaaja_v7 Tekniikkaprofiili: H-H-sekunnit merkitty H-H-testiksi, ei TK-tavoitetta', () => {
  const P7 = lue('TalentMaster_Pelaaja_v7.html');
  const ctx = vm.createContext({ ...PEL_APU, window: { TM_TESTIT: T }, Math, Number, String, Date, parseFloat, isNaN, Array, Object });
  vm.runInContext(['let _pelaaja = null;', 'let _tekniikkaData = null;', "const _TEK_LAJIT = ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'];",
    pura(P7, 'function _tekniikkaPikakentista('), pura(P7, 'function _minaTekLajiNimi('), pura(P7, 'function _minaValitavoite('),
    pura(P7, 'function _tekKorttiData('), pura(P7, 'function _minaTavoiteRivit('), pura(P7, 'function rMinaTekniikkaprofiili('),
    'this.api = { aseta(p) { _pelaaja = p; _tekniikkaData = _tekniikkaPikakentista(p); }, render: rMinaTekniikkaprofiili, data: () => _tekniikkaData, tek: _tekKorttiData };'].join('\n'), ctx);
  it('vain H-H → "(H-H-testi)"-rivit; ei TK-tavoitetta eikä viitetta', () => {
    const p = { syntymaVuosi: VUOSI - 13, sukupuoli: 'M', hh_viimeisin: { pujottelu: 12.1, syotto: 11.4 }, tki_kehityskohde: 'pujottelu' };
    ctx.api.aseta(p);
    const h = tx(ctx.api.render());
    expect(h).toContain('Pujottelu (H-H-testi) 12.1 s');
    expect(h).toContain('Syöttö (H-H-testi) 11.4 s');
    expect(h).not.toMatch(/Tavoite/);
    expect(ctx.api.tek(p)).toBeNull();   // ei tk_lajit → H-H-arvo ei koskaan TK-tavoitteeseen
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// b) VIITETASON LÄHDE
// ════════════════════════════════════════════════════════════════════════════════════════════════════════
const JSON_ALUE = JSON.parse(lue('docs/data/taitokisa_alue_2023_2025.json')).aggregaatti;
const JSON_VALTAK = JSON.parse(lue('docs/data/taitokisa_2023_2025.json')).aggregaatti;
const LAJIT = [['syotto', 'syotto'], ['pujottelu', 'pujottelu'], ['ponnauttelu', 'ponnauttelu'], ['kl_tulos', 'kuljetus_laukaus']];
function odotettuTaulu(agg, lahde) {
  const out = {};
  for (const sp of ['P', 'T']) {
    out[sp] = {};
    for (const ika of Object.keys(agg[sp] || {})) {
      const a = agg[sp][ika], r = {};
      for (const [k, n] of LAJIT) if (a[k]) r[n] = { erinomainen: a[k].p25, hyva: a[k].p50 };
      if (a.pp_bonus && Number(ika) >= 12) r.pituuspotku_bonus = { erinomainen: a.pp_bonus.p75, hyva: a.pp_bonus.p50 };
      r._n = a.n; r._lahde = lahde;
      out[sp][ika] = r;
    }
  }
  return out;
}

describe('b) generoitu viitetaulu = JSON-aggregaatit (pariteetti) + kopiot identtiset', () => {
  it('TK_LAJIVIITTEET_ALUE = alueaggregaatti (kaikki P8–13, T8–13)', () => {
    expect(JSON.parse(JSON.stringify(GEN.TK_LAJIVIITTEET_ALUE))).toEqual(odotettuTaulu(JSON_ALUE, 'alueellinen'));
    for (const sp of ['P', 'T']) expect(Object.keys(GEN.TK_LAJIVIITTEET_ALUE[sp])).toEqual(['8', '9', '10', '11', '12', '13']);
  });
  it('TK_LAJIVIITTEET_VALTAK = loppukilpailuaggregaatti (vain ikäluokat joilla finaalidataa)', () => {
    expect(JSON.parse(JSON.stringify(GEN.TK_LAJIVIITTEET_VALTAK))).toEqual(odotettuTaulu(JSON_VALTAK, 'valtakunnallinen'));
    expect(GEN.TK_LAJIVIITTEET_VALTAK.P[13]).toBeUndefined();
    expect(GEN.TK_LAJIVIITTEET_VALTAK.P[10]._n).toBe(8);
  });
  it('alias TK_LAJIVIITTEET = ALUE (taaksepäin yhteensopiva) kaikissa lähteissä', () => {
    expect(GEN.TK_LAJIVIITTEET).toBe(GEN.TK_LAJIVIITTEET_ALUE);
    expect(T.TK_LAJIVIITTEET).toBe(T.TK_LAJIVIITTEET_ALUE);
  });
  it('generoitu lohko on byte-identtinen SSOT:ssa, testit_indeksit.js:ssä ja VP_v25:ssä; ei muita kopioita', () => {
    const lohko = (s) => { const a = s.indexOf('// <<< TK_VIITTEET_GEN'), b = s.indexOf('// >>> TK_VIITTEET_GEN'); expect(a).toBeGreaterThan(-1); return s.slice(a, b); };
    const ssot = lohko(lue('docs/tk_lajiviitteet.js'));
    expect(lohko(lue('docs/testit_indeksit.js'))).toBe(ssot);
    expect(lohko(lue('TalentMaster_VP_v25.html'))).toBe(ssot);
    for (const f of ['docs/testit_indeksit.js', 'TalentMaster_VP_v25.html', 'TalentMaster_Excel_Tuonti.html', 'TalentMaster_Testaus_v9.html',
      'TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'lib/tm_tki_core.js']) {
      const s = lue(f);
      expect((s.match(/const TK_LAJIVIITTEET(_ALUE|_VALTAK)? = \{/g) || []).length, f).toBe(f === 'docs/testit_indeksit.js' || f === 'TalentMaster_VP_v25.html' ? 2 : 0);
    }
  });
  it('Excel_Tuonnin inline TK_LAJITASOT = generoitu (yksi alueellinen poolilähde)', () => {
    const S = lue('TalentMaster_Excel_Tuonti.html');
    const ctx = vm.createContext({});
    vm.runInContext(pura(S, 'const TK_LAJITASOT = {') + ';\nthis.t = TK_LAJITASOT;', ctx);
    expect(JSON.parse(JSON.stringify(ctx.t))).toEqual(JSON.parse(JSON.stringify(GEN.TK_LAJITASOT)));
  });
  it('generaattori kirjoittaa molemmat taulut + synkkaa kopiot (vuosipäivitys tuottaa molemmat)', () => {
    const py = lue('docs/data/parse_taitokisa_csv.py');
    expect(py).toContain('const TK_LAJIVIITTEET_ALUE = {');
    expect(py).toContain('const TK_LAJIVIITTEET_VALTAK = {');
    expect(py).toMatch(/for rel in \('docs\/testit_indeksit\.js', 'TalentMaster_VP_v25\.html'\)/);
  });
});

describe('b) tkLajiViite(laji, ika, sp, [lahde]) — oletus alueellinen, ei fallbackia lähteestä toiseen', () => {
  it('P10 pujottelu: oletus = alue (p50 27.1), valtakunnallinen eksplisiittisesti (26.2)', () => {
    expect(T.tkLajiViite('pujottelu', 10, 'P')).toEqual({ erinomainen: 26.3, hyva: 27.1, n: 20, lahde: 'alueellinen' });
    expect(T.tkLajiViite('pujottelu', 10, 'P', 'alueellinen').hyva).toBe(27.1);
    expect(T.tkLajiViite('pujottelu', 10, 'P', 'valtakunnallinen')).toEqual({ erinomainen: 25.7, hyva: 26.2, n: 8, lahde: 'valtakunnallinen' });
  });
  it('P13: ei loppukilpailudataa → valtakunnallinen null (ei fallbackia alueelliseen)', () => {
    expect(T.tkLajiViite('pujottelu', 13, 'P', 'valtakunnallinen')).toBeNull();
    expect(T.tkLajiViite('pujottelu', 13, 'P').lahde).toBe('alueellinen');
  });
  it('VP:n inline-tkLajiViite käyttäytyy samoin (sama lohko + sama lähdevalinta)', () => {
    const S = lue('TalentMaster_VP_v25.html');
    const a = S.indexOf('// <<< TK_VIITTEET_GEN'), b = S.indexOf('// >>> TK_VIITTEET_GEN');
    const ctx = vm.createContext({});
    vm.runInContext(S.slice(a, b) + '\n' + pura(S, 'function tkLajiViite(') + '\nthis.f = tkLajiViite;', ctx);
    for (const [l, i, sp, lahde] of [['pujottelu', 10, 'P'], ['pujottelu', 10, 'P', 'valtakunnallinen'], ['syotto', 12, 'T'], ['pujottelu', 13, 'P', 'valtakunnallinen'], ['pituuspotku_bonus', 12, 'P', 'valtakunnallinen']]) {
      expect(ctx.f(l, i, sp, lahde)).toEqual(T.tkLajiViite(l, i, sp, lahde));
    }
  });
});

// Testiä varten: testit_indeksit.js vm:ssä, josta POISTETAAN P10:n alueellinen data (vain valtakunnallinen jää).
function tIlmanAluetta(sp, ika) {
  const ctx = vm.createContext({ module: { exports: {} } });
  vm.runInContext(lue('docs/testit_indeksit.js'), ctx);
  const TT = ctx.module.exports;
  delete TT.TK_LAJIVIITTEET_ALUE[sp][ika];
  return TT;
}

describe('b) lapsen + huoltajan tavoite AINA alueellisesta', () => {
  const P7 = lue('TalentMaster_Pelaaja_v7.html');
  const tek = (TT) => {
    const ctx = vm.createContext({ ...PEL_APU, window: { TM_TESTIT: TT }, Math, Number, String, Date });
    vm.runInContext([pura(P7, 'function _minaTekLajiNimi('), pura(P7, 'function _minaValitavoite('), pura(P7, 'function _tekKorttiData(')].join('\n') + '\nthis.f = _tekKorttiData;', ctx);
    return ctx.f;
  };
  const p10 = (s) => ({ syntymaVuosi: VUOSI - 10, sukupuoli: 'M', tki_kehityskohde: 'pujottelu', tk_lajit_viimeisin: { pujottelu_s: s } });
  it('Pelaaja P10 pujottelu 28.0 → tavoite 27 (alue p50 27.1), EI 26 (valtak p50 26.2)', () => {
    expect(tek(T)(p10(28.0)).kehitys).toMatchObject({ nyt: 28, tavoite: 27 });
  });
  it('Pelaaja: ikäluokalta puuttuu alueellinen → EI finaalitasoa tavoitteeksi (nyt+tavoite null → rivi piiloon)', () => {
    const TT = tIlmanAluetta('P', 10);
    expect(TT.tkLajiViite('pujottelu', 10, 'P', 'valtakunnallinen')).not.toBeNull();   // EI VACUOUS: valtak. olemassa
    expect(tek(TT)(p10(28.0)).kehitys).toMatchObject({ nyt: null, tavoite: null });
  });
  const V2 = lue('TalentMaster_Vanhempi_v2.html');
  const vanh = (TT, pujS) => {
    const lapsi = { syntymaVuosi: VUOSI - 10, sukupuoli: 'M', tki_viimeisin: 60, tki_kehityskohde: 'pujottelu', tki_vahvuus: 'syotto',
      tk_lajit_viimeisin: { syotto_s: 36, pujottelu_s: pujS } };
    const ctx = vm.createContext({ ...PEL_APU, window: { _lapsi: lapsi, TM_TESTIT: TT }, t: LANG.t, IKA: {}, _age: 'u11', Math, Number, String, Object, isNaN });
    const a = V2.indexOf('const _VANH_LAJINIMI'), b = V2.indexOf('const TUKIVINKIT');
    vm.runInContext([V2.slice(a, V2.indexOf(';', a) + 1), V2.slice(b, V2.indexOf('};', b) + 2), pura(V2, 'function _genetiivi('),
      pura(V2, 'function _vanhValitavoite('), pura(V2, 'function rVanhempiTekniikka(')].join('\n') + '\nthis.f = rVanhempiTekniikka;', ctx);
    return tx(ctx.f());
  };
  it('Vanhempi P10 pujottelu 28.0 → "28 … 27" (alueellinen); ilman aluedataa → ei Nyt→tavoite-riviä', () => {
    const h = vanh(T, 28.0);
    expect(h).toMatch(/28\D+27\b/);
    expect(h).not.toMatch(/\b26\b/);
    expect(vanh(tIlmanAluetta('P', 10), 28.0)).not.toMatch(/→/);
  });
  it('lapsen/huoltajan pinnoilla ei sanaa "loppukilpailu"', () => {
    expect(vanh(T, 28.0)).not.toMatch(/loppukilpailu/i);
    for (const [f, fn] of [['TalentMaster_Pelaaja_v7.html', 'function _minaTavoiteRivit('], ['TalentMaster_Pelaaja_v7.html', 'function rMinaTekniikkaprofiili('],
      ['TalentMaster_Pelaaja_v7.html', 'function _kkLajiTulos('], ['TalentMaster_Vanhempi_v2.html', 'function rVanhempiTekniikka(']]) {
      expect(pura(lue(f), fn), fn).not.toMatch(/loppukilpailu|valtakunnallinen'/i);
    }
  });
  // 4.10.2026 (Teron tarkastus): välitavoite = tkLajiViiteLapsi (hyvä = LIEVEMPI alue/finaali, erinomainen alueellinen,
  // ei aluetta → null) — tests/tk_lapsi_lievempi.test.js. Muut lapsen viitekutsut (merkit) pyytävät alueellisen eksplisiittisesti.
  // 4.10.2026: välitavoite = tkLajiViiteLapsi. §31 (V2 P0.6): lajikohtainen merkki ei enää kutsu tkLajiViite:ä (oma ennätys, ei mitali)
  // → muita lapsen viitekutsuja kuin tavoite ei ole; mahdollinen kutsu pyytäisi alueellisen eksplisiittisesti.
  it('lapsen/huoltajan viitekutsut: tavoite tkLajiViiteLapsi:sta, ei lajimerkkien tkLajiViite-kutsua (§31)', () => {
    const kutsut = ((P7 + V2).match(/tkLajiViite\([^)]*\)/g) || []).filter((k) => !/^tkLajiViite\(laji, ika, sp\)$/.test(k));
    expect(kutsut.length).toBe(0);
    expect((P7 + V2).match(/tkLajiViiteLapsi\(/g).length).toBe(3);   // Pelaaja ×2 + Vanhempi
  });
});

describe('b) henkilökunta näkee lähteen + n (alueellinen + loppukilpailutaso erikseen)', () => {
  const S = lue('TalentMaster_VP_v25.html');
  const a = S.indexOf('// <<< TK_VIITTEET_GEN'), b = S.indexOf('// >>> TK_VIITTEET_GEN');
  const ctx = vm.createContext({ vpT: (x) => x, _vpSelTip: () => '', eerikkilaTaso: EN.eerikkilaTaso, Math, Number, isNaN });
  vm.runInContext([S.slice(a, b), pura(S, 'function tkLajiViite('), pura(S, 'function tkLajiTaso('), pura(S, 'function _jsvViiteLabel('),
    S.slice(S.indexOf('const _JSV_TKLAJIT = ['), S.indexOf('];', S.indexOf('const _JSV_TKLAJIT = [')) + 2),
    pura(S, 'function _jsvLajiData('), pura(S, 'function _jsvTasoVari5('), pura(S, 'function _jsvPerLajiHTML('),
    'this.f = _jsvPerLajiHTML;'].join('\n'), ctx);
  it('VP P10: "Alueellinen huipputaso 2023–25 (n=20)" + "Loppukilpailutaso 2023–25 (n=8)" + rivin loppukilpailutaso', () => {
    const h = tx(ctx.f({ pujottelu_s: 28.0, syotto_s: 40 }, 10, 'P', 'Tekniikka', null).html);
    expect(h).toContain('Alueellinen huipputaso 2023–25 (n=20)');
    expect(h).toContain('Loppukilpailutaso 2023–25 (n=8)');
    expect(h).toMatch(/huipputaso ≤27\.1s · loppukilpailutaso ≤26\.2s/);
    expect(h).toContain('+0.9s');   // gap alueelliseen (28.0 − 27.1), EI valtakunnalliseen (1.8)
  });
  it('VP P13: ei loppukilpailudataa → näkyy erikseen, gap alueelliseen', () => {
    const h = tx(ctx.f({ pujottelu_s: 26.0 }, 13, 'P', 'Tekniikka', null).html);
    expect(h).toContain('Alueellinen huipputaso 2023–25 (n=20)');
    expect(h).toContain('Loppukilpailutaso 2023–25 — ei loppukilpailudataa tälle ikäluokalle');
    expect(h).not.toMatch(/loppukilpailutaso ≤/);
  });
  it('Master TKI-detail: sama lähde + n -merkintä', () => {
    const M = lue('TalentMaster_Master_v16.html');
    const mctx = vm.createContext(Object.assign({}, T_GLOBAALIT, {
      masterT: (x) => x, _devIkaSp: () => ({ ika: 10, sp: 'M' }), _tkiMerkkiM: () => null, _tkLajiNimi: (x) => x, _devNimi: () => 'Testi',
      Math, Number, String, parseInt, isNaN,
    }));
    vm.runInContext(pura(M, 'function _buildTKIDetail(') + '\nthis.f = _buildTKIDetail;', mctx);
    const h = tx(mctx.f({ tki_viimeisin: 50, tk_lajit_viimeisin: { pujottelu_s: 28.0, syotto_s: 40 }, tk_kokonaistulos_viimeisin: 110 }));
    expect(h).toContain('Alueellinen huipputaso 2023–25 (n=20)');
    expect(h).toContain('Loppukilpailutaso 2023–25 (n=8)');
    expect(h).toMatch(/huipputaso ≤27\.1s · loppukilpailutaso ≤26\.2s/);
  });
});
