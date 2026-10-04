/**
 * PR C — PHV-sanaston yhtenäistys + migraatio (4.10.2026).
 *  1) Pelaaja_v7 Kehitysvaihe-kortti (rMinaKehitysvaihe) AJETAAN lähteestä (vm): Topiaksen AN ilman mittausta →
 *     tuntematon → EI korttia, EI "Kehittynyt vaihe". Mirwald-AN → jälki-PHV-teksti. §7.22: ei lukuja lapselle.
 *  2) _laskeStage / signaalit: kuormasuoja ei heikkene (ilmoitettu PH → kevein vaihe), lapselle ei PH-varoitusta.
 *  3) tm_kypsyys: tuntematon → ei "Fyysiset ikkunat auki" -neuvoa.
 *  4) Kirjoittajat: tuontimuunnos AJETAAN (Excel_Tuonti + Testituonti), AN-solu ei kirjoitu, Testaus_v9 ei kopioi,
 *     Masterin Excel-pohja ei esitäytä.
 *  5) VARTIJA: AN = pre-PHV -merkitys ei palaa yhteenkään elävään tiedostoon; vanhat koodit (VA/huippu/PHV) poissa.
 *  6) Migraation puhdas funktio: a/b/c-luokittelu (Topias → a, Mirwald-AN → ei muutosta).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const PHV = require('../lib/tm_phv_tila.js');
const MIG = require('../scripts/migrate_phv_sanasto.js');

function pura(lahde, tunniste) {
  const i = lahde.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); } }
  throw new Error('sulkeet: ' + tunniste);
}

const VUOSI = new Date().getFullYear();
// Topias (seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I): phv_tila "AN", EI biologinenIka_viimeisin (diag 4.10.2026).
const TOPIAS = { id: 'm93GBdOaGCUuenMiCL0I', syntymaVuosi: VUOSI - 13, sukupuoli: 'M', joukkue: 'KPV U13', phv_tila: 'AN' };
const mitattu = (koodi, extra) => Object.assign({ syntymaVuosi: VUOSI - 13, phv_tila: koodi,
  biologinenIka_viimeisin: { phv_tila_koodi: koodi, mittauspaiva: '2026-09-01', maturity_offset: 1.4, phv_ika: 11.6 } }, extra || {});

// ─── 1–2) Pelaaja_v7 ─────────────────────────────────────────────────────────────────────────────
const P7 = lue('TalentMaster_Pelaaja_v7.html');
function pelaajaCtx(pelaaja) {
  const ctx = { _pelaaja: pelaaja, tmPhvTila: PHV.tmPhvTila, tmPhvKoodi: PHV.tmPhvKoodi, tmPhvIlmoitettuPH: PHV.tmPhvIlmoitettuPH,
    t: (k) => k, _streak: 0, draw: () => {}, _tmKirjaa: () => {}, Date, Object, String, Math };
  vm.createContext(ctx);
  vm.runInContext([pura(P7, 'function rMinaKehitysvaihe('), pura(P7, 'function _laskeStage('),
    pura(P7, 'function _tarkistaSignaalit('), pura(P7, 'function _signaaliLabel(')].join('\n')
    + '\nthis.kortti = rMinaKehitysvaihe; this.stage = _laskeStage; this.signaalit = _tarkistaSignaalit; this.label = _signaaliLabel;', ctx);
  return ctx;
}
const nakyva = (h) => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('Pelaaja_v7 Kehitysvaihe-kortti (rMinaKehitysvaihe ajetaan lähteestä)', () => {
  it('Topias: AN 13-vuotiaalla ILMAN mittausta → tuntematon → ei korttia, EI "Kehittynyt vaihe"', () => {
    const h = pelaajaCtx(TOPIAS).kortti();
    expect(h).toBe('');
    expect(h).not.toContain('Kehittynyt vaihe');
  });

  it('Mirwald-mitattu AN → jälki-PHV ("Kasvupyrähdys on takana"), ei "Kehittynyt vaihe"', () => {
    const h = nakyva(pelaajaCtx(mitattu('AN')).kortti());
    expect(h).toContain('Kasvupyrähdys on takana');
    expect(h).not.toContain('Kehittynyt vaihe');
    expect(h).toContain('Mitattu 2026-09-01');
  });

  it('mitattu PRE / PH → oikea vaihe; PH saa aikuisohjauksen ("kerro valmentajallesi")', () => {
    expect(nakyva(pelaajaCtx(mitattu('PRE')).kortti())).toContain('Ennen kasvupyrähdystä');
    const ph = nakyva(pelaajaCtx(mitattu('PH')).kortti());
    expect(ph).toContain('Kasvupyrähdyksessä');
    expect(ph).toContain('kerro valmentajallesi');
  });

  it('§7.22: lapselle EI lukuja (ei "±0.5 v epävarmuus", ei offsetia, ei PHV-ikää)', () => {
    for (const k of ['PRE', 'LAH', 'PH', 'POST', 'AN']) {
      const h = nakyva(pelaajaCtx(mitattu(k)).kortti());
      expect(h, k).not.toMatch(/±/);
      expect(h, k).not.toMatch(/\d+[.,]\d+\s*v\b/);    // esim. "0.5 v", "1.4 v"
      expect(h, k).not.toMatch(/offset|1\.4|11\.6/);
    }
  });

  it('vanhoja koodeja (huippu/PHV) ei tueta: ilman mittausta → ei korttia', () => {
    expect(pelaajaCtx({ phv_tila: 'huippu' }).kortti()).toBe('');
    expect(pelaajaCtx({ phv_tila: 'PHV' }).kortti()).toBe('');
  });
});

describe('Pelaaja_v7 kuormasuoja: _laskeStage + PH-signaali', () => {
  it('mitattu PH → kevein vaihe (1_leikkija), myös 16-vuotiaalla', () => {
    expect(pelaajaCtx({}).stage(VUOSI - 16, mitattu('PH'))).toBe('1_leikkija');
  });
  it('ilmoitettu PH (lomake, ei mittausta) → SAMA kevein vaihe — kuormasuoja ei heikkene', () => {
    expect(pelaajaCtx({}).stage(VUOSI - 16, { phv_tila: 'PH' })).toBe('1_leikkija');
  });
  it('Topias (AN ilman mittausta) → ikäperusteinen, ei PH-tulkintaa', () => {
    expect(pelaajaCtx({}).stage(TOPIAS.syntymaVuosi, TOPIAS)).toBe('2_rakentaja');
  });
  it('PH-varoitus lapselle VAIN mitatusta PH:sta (ilmoitettu PH / tuntematon → ei varoitusta)', () => {
    expect(pelaajaCtx(mitattu('PH', { id: 'x' })).signaalit().map((s) => s.tyyppi)).toContain('phv');
    expect(pelaajaCtx({ id: 'x', phv_tila: 'PH' }).signaalit().map((s) => s.tyyppi)).not.toContain('phv');
    expect(pelaajaCtx({ id: 'x', phv_tila: 'PH', signaali: 'phv' }).label()).toBe('');   // tallennettu signaali ei riitä
    expect(pelaajaCtx(mitattu('PH', { signaali: 'phv' })).label()).toContain('pelaaja.sig_phv');
  });
});

describe('lib-lukijat: lomakkeen/tuonnin arvo ilman mittausta ei ole PHV-tila', () => {
  const N = require('../lib/tm_eerikkila_normit.js');
  it('onNeutraaliPrePHV: PRE ilman mittausta → ikäpäättely (15 v → ei neutraali); mitattu PRE → neutraali', () => {
    const pohja = { joukkue: 'SJK P15', syntymaVuosi: VUOSI - 15, hh_pvm: VUOSI + '-02-08' };
    expect(N.onNeutraaliPrePHV(Object.assign({ phv_tila: 'PRE' }, pohja))).toBe(false);
    expect(N.onNeutraaliPrePHV(Object.assign(mitattu('PRE'), pohja))).toBe(true);
  });
  it('hhKehityskohde-kutsu Excel_Tuonnin recalcissa käyttää jaettua sääntöä (lomakkeen AN ei salli fyysistä kehityskohdetta)', () => {
    expect(lue('TalentMaster_Excel_Tuonti.html')).toContain('hhKehityskohde(hvK, ikaDes, sp, tmPhvKoodi(p))');
    expect(lue('lib/tm_pikakentat.js')).toMatch(/D\.hhKehityskohde\(hvK, ikaDes, sp, \(typeof tmPhvKoodi/);
  });
});

// ─── 3) tm_kypsyys ─────────────────────────────────────────────────────────────────────────────────
describe('tm_kypsyys: tuntematon → ei "Fyysiset ikkunat auki" -neuvoa', () => {
  const K = require('../lib/tm_kypsyys.js');
  const el = () => ({ innerHTML: '', ownerDocument: { getElementById: () => ({}), createElement: () => ({}), head: { appendChild() {} } }, querySelector: () => null });
  it('Topiaksen AN ilman mittausta (VP-syöte tmPhvKoodi → null) → "Kypsyyttä ei mitattu"', () => {
    const e = el();
    K.tmKypsyys(e, { phv_tila_koodi: PHV.tmPhvKoodi(TOPIAS) }, { muoto: 'täysi' });
    expect(e.innerHTML).toContain('Kypsyyttä ei mitattu');
    expect(e.innerHTML).not.toContain('Fyysiset ikkunat auki');
  });
  it('mitattu AN → neuvo näkyy henkilökunnalle (ennallaan)', () => {
    const e = el();
    K.tmKypsyys(e, { phv_tila_koodi: PHV.tmPhvKoodi(mitattu('AN')), maturity_offset: 1.4 }, { muoto: 'täysi' });
    expect(e.innerHTML).toContain('Fyysiset ikkunat auki');
  });
});

// ─── 4) Kirjoittajat ───────────────────────────────────────────────────────────────────────────────
function tuontiParse(tiedosto, solu) {
  const src = lue(tiedosto);
  const a = src.indexOf('...(function () { const raaka = colPhv');
  expect(a, tiedosto + ': PHV-parse käyttää jaettua muunnosta').toBeGreaterThan(-1);
  const b = src.indexOf('})(),', a) + '})()'.length;
  const ctx = { tmPhvTuontiKoodi: PHV.tmPhvTuontiKoodi, colPhv: 0, rivi: [solu], String };
  vm.createContext(ctx);
  return vm.runInContext('({' + src.slice(a, b) + '})', ctx);
}

describe('kirjoittajat kirjoittavat VAIN kanonisia koodeja (tuontimuunnos ajetaan)', () => {
  for (const f of ['TalentMaster_Excel_Tuonti.html', 'TalentMaster_Testituonti_Master.html']) {
    it(f + ': selkokielinen → koodi, AN → ei koodia (ongelma), VA → POST; ei koskaan ei-kanonista', () => {
      expect(tuontiParse(f, 'Ennen kasvupyrähdystä').phv_tila).toBe('PRE');
      expect(tuontiParse(f, 'Kasvupyrähdyksessä').phv_tila).toBe('PH');
      expect(tuontiParse(f, 'kasvupyrähdyksen jälkeen').phv_tila).toBe('POST');
      const an = tuontiParse(f, 'AN');
      expect(an.phv_tila).toBe('');
      expect(an.phv_ongelma).toBe('moniselitteinen');
      expect(tuontiParse(f, 'VA').phv_tila).toBe('POST');
      for (const s of ['AN', 'an', 'VA', 'huippu', 'PHV', 'x', '', 'PRE', 'PH', 'POST', 'LAH', '📍 Ennen kasvua']) {
        const k = tuontiParse(f, s).phv_tila;
        expect(k === '' || PHV.PHV_KANONISET.includes(k), f + ' ' + s).toBe(true);
      }
    });
    it(f + ': AN-solu → VAROITUS joka pyytää selkokielisen valinnan (ei hiljaista tulkintaa); vanha "sallittu: AN, PH, VA" poissa', () => {
      const s = lue(f);
      expect(s).toContain("if (p.phv_ongelma === 'moniselitteinen') {");
      expect(s).toMatch(/moniselitteinen[^\n]*PHV-tilaa EI tallenneta\. Valitse selkokielinen: Ennen kasvupyrähdystä \/ Kasvupyrähdyksessä \/ Kasvupyrähdyksen jälkeen/);
      expect(s).not.toContain("['AN','PH','VA'");
    });
  }

  it('Harjoitettavuus_Lomake_v4: valinnat kanonisina koodeina + selkokielinen teksti; pelaajadokkiin vain kanoninen', () => {
    const s = lue('TalentMaster_Harjoitettavuus_Lomake_v4.html');
    expect(s).toContain("var PHV_OPTS = ['PRE', 'PH', 'POST'];");
    expect(s).not.toMatch(/opts:\s*\['AN'/);
    expect(s).toContain("const _phvK = tmPhvTuontiKoodi(p.tulokset.phv_tila).koodi; if (_phvK) profiiliPaivitys['phv_tila'] = _phvK;");
    expect(s).toContain('<script src="lib/tm_phv_tila.js?v=1"></script>');
  });

  it('Testaus_v9 EI kopioi pelaajadokin phv_tila:a tulosdokkiin eikä tapahtuman pelaajadataan (kierto katkaistu)', () => {
    const s = lue('TalentMaster_Testaus_v9.html');
    const ilmanKommentteja = (t) => t.replace(/\/\/[^\n]*/g, '');
    expect(ilmanKommentteja(pura(s, 'async function _kirjoitaFirestoreTulos('))).not.toMatch(/phv_tila\s*:/);
    const i = s.indexOf('pelaajatData: pelaajatArr.map(');
    expect(ilmanKommentteja(s.slice(i, s.indexOf('})),', i)))).not.toMatch(/phv_tila\s*:/);
    // Mitattu kirjoitus säilyy: kasvumittaus kirjoittaa phv_tila:n mittauksen koodista samassa batchissa.
    expect(s).toContain("phv_tila: ops.dokumentti.phv_tila_koodi,");
  });

  it('Masterin Excel-pohja EI esitäytä PHV-tilaa pelaajadokista; ohje selkokielinen', () => {
    const s = lue('TalentMaster_Master_v16.html');
    expect(s).toContain("else if (s.key === 'phv_tila') rivi.push('');");
    expect(s).toContain('PHV-tila (vapaaehtoinen): Ennen kasvupyrähdystä | Kasvupyrähdyksessä | Kasvupyrähdyksen jälkeen');
  });
});

// ─── 5) VARTIJA ────────────────────────────────────────────────────────────────────────────────────
const OHITA_HAK = new Set(['.git', 'node_modules', 'archive', 'tests', '.claude']);
// Historialliset kuvaukset vanhasta sanastosta (eivät ole eläviä lukijoita/kirjoittajia):
const OHITA_TIED = new Set(['docs/PHV_AN_ALKUPERA.md', 'scripts/diag_phv_alkupera.js']);
function elavat(hak, out) {
  for (const n of readdirSync(hak)) {
    const p = join(hak, n), r = relative(juuri, p);
    if (OHITA_HAK.has(n)) continue;
    const st = statSync(p);
    if (st.isDirectory()) elavat(p, out);
    else if (/\.(html|js|md|cjs|mjs)$/.test(n) && !OHITA_TIED.has(r)) out.push(r);
  }
  return out;
}

describe('VARTIJA: AN = pre-PHV ei palaa elävään koodiin/dokumentaatioon', () => {
  const tiedostot = elavat(juuri, []);
  it('ei-vacuous: tiedostoja on runsaasti ja kriittiset mukana', () => {
    expect(tiedostot.length).toBeGreaterThan(200);
    for (const f of ['harjoitelogiikka_v4.js', 'TalentMaster_Harjoitettavuus_Lomake_v4.html', 'TalentMaster_Excel_Tuonti.html', 'src/lib/tm_tapahtumat.js', 'CLAUDE.md']) expect(tiedostot).toContain(f);
  });
  const KIELLETYT = [
    [/\bAN\b\s*[=:(—–-]+\s*['"(]?\s*pre-?PHV/i, 'AN = Pre-PHV / AN (pre-PHV)'],
    [/Ennen kasvua\b/, '"Ennen kasvua" (vanha lomakeselite)'],
    [/['"]AN['"]\s*,\s*['"]PH['"]\s*,\s*['"]VA['"]/, "['AN','PH','VA'] -valikko/validointi"],
    [/sallittu: AN, PH, VA/, 'vanha validointiviesti'],
    [/phv[A-Za-z_]*\s*===?\s*['"](huippu|PHV|VA)['"]/, 'vanha PHV-koodi lukijassa'],
    [/phv_tila\s*:\s*['"](VA|huippu|PHV)['"]/, 'vanha PHV-koodi datassa'],
  ];
  for (const [re, nimi] of KIELLETYT) {
    it('ei: ' + nimi, () => {
      const osumat = [];
      for (const f of tiedostot) {
        lue(f).split('\n').forEach((rivi, i) => { if (re.test(rivi)) osumat.push(f + ':' + (i + 1)); });
      }
      expect(osumat).toEqual([]);
    });
  }
  it('src/lib/tm-profile.js on re-export (ei erillistä kopiota, joka jäisi vanhaan oletukseen)', () => {
    expect(lue('src/lib/tm-profile.js')).toContain("module.exports = require('../../lib/tm-profile.js');");
    expect(lue('lib/tm-profile.js')).not.toMatch(/phv_tila\s*\|\|\s*'AN'/);
    expect(lue('harjoitelogiikka_v4.js')).not.toMatch(/phv_tila\s*\|\|\s*'AN'/);
    expect(lue('lib/tm-prescription.js')).not.toMatch(/\?\s*'PH'\s*:\s*'AN'/);
  });
});

describe('lataajat: jokainen PHV-lukijalibin lataaja lataa myös lib/tm_phv_tila.js:n', () => {
  const LUKIJALIBIT = ['lib/tm_eerikkila_normit.js', 'lib/tm_idp.js', 'lib/tm_kehitystilanne.js', 'lib/tm_mittarit.js', 'lib/tm_fyysteemat.js',
    'lib/tm_ohjelma_analytiikka.js', 'lib/tm_pikakentat.js', 'lib/tm-profile.js', 'lib/tm-prescription.js', 'harjoitelogiikka_v4.js'];
  const html = readdirSync(juuri).filter((f) => f.endsWith('.html'));
  it('ei-vacuous + kaikki lataajat', () => {
    let n = 0;
    for (const f of html) {
      const s = lue(f);
      if (!LUKIJALIBIT.some((l) => s.includes('src="' + l))) continue;
      n++;
      expect(s, f).toContain('<script src="lib/tm_phv_tila.js?v=1"></script>');
    }
    expect(n).toBeGreaterThanOrEqual(8);
  });
  it('Pelaaja-SW: tm_phv_tila.js allowlistissa + cache nostettu (v59)', () => {
    const sw = lue('sw_pelaaja.js');
    expect(sw).toContain("const CACHE = 'tm-pelaaja-v59';");
    expect(sw).toContain("/lib/tm_phv_tila.js");
  });
});

// ─── 6) Migraatio ─────────────────────────────────────────────────────────────────────────────────
describe('migrate_phv_sanasto.js — puhdas luokittelu (ei Firestorea)', () => {
  it('Topias: AN ilman mittausta (ei bio-pikakenttää, 0 biologinen_ika-dokkia) → (a) poista kenttä', () => {
    const r = MIG.luokittelePhv({ data: TOPIAS, bioDokLkm: 0 });
    expect(r.luokka).toBe('a');
    expect(r.nykyinen).toBe('AN');
    expect(r.paivitys).toEqual({ phv_tila: MIG.POISTA });
    expect(r.peruste).toMatch(/ei mittauslähdettä/);
  });
  it('(a) poistaa parin kehitysvaihe_kaista samassa kirjoituksessa (§26)', () => {
    expect(MIG.luokittelePhv({ data: { phv_tila: 'VA', kehitysvaihe_kaista: 'post' }, bioDokLkm: 0 }).paivitys)
      .toEqual({ phv_tila: MIG.POISTA, kehitysvaihe_kaista: MIG.POISTA });
  });
  it('(a) ilmoitettu PH ilman mittausta → säilytä (kuormasuoja), ei kirjoitusta', () => {
    const r = MIG.luokittelePhv({ data: { phv_tila: 'PH' }, bioDokLkm: 0 });
    expect(r.luokka).toBe('a');
    expect(r.paivitys).toBe(null);
    expect(r.ehdotus).toMatch(/säilytä/);
  });
  it('Mirwald-AN (biologinenIka_viimeisin.phv_tila_koodi === phv_tila) → ok, EI muutosta', () => {
    const r = MIG.luokittelePhv({ data: mitattu('AN') });
    expect(r.luokka).toBe('ok');
    expect(r.paivitys).toBe(null);
  });
  it('(b) mittauslähteellinen ei-kanoninen / puuttuva pikakenttä → mittauksen koodi', () => {
    expect(MIG.luokittelePhv({ data: { phv_tila: 'VA', biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } } })).toMatchObject({ luokka: 'b', paivitys: { phv_tila: 'POST' } });
    expect(MIG.luokittelePhv({ data: { biologinenIka_viimeisin: { phv_tila_koodi: 'PRE' } } })).toMatchObject({ luokka: 'b', paivitys: { phv_tila: 'PRE' } });
  });
  it('(b) huippu/PHV ilman mittausta → PH (yksiselitteinen)', () => {
    expect(MIG.luokittelePhv({ data: { phv_tila: 'huippu' }, bioDokLkm: 0 })).toMatchObject({ luokka: 'b', paivitys: { phv_tila: 'PH' } });
    expect(MIG.luokittelePhv({ data: { phv_tila: 'PHV' }, bioDokLkm: 0 })).toMatchObject({ luokka: 'b', paivitys: { phv_tila: 'PH' } });
  });
  it('(c) epäselvät → ei muutosta: ristiriita mittauksen kanssa, biologinen_ika-dokkeja ilman pikakenttää', () => {
    expect(MIG.luokittelePhv({ data: { phv_tila: 'PRE', biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } } })).toMatchObject({ luokka: 'c', paivitys: null });
    expect(MIG.luokittelePhv({ data: { phv_tila: 'AN' }, bioDokLkm: 2 })).toMatchObject({ luokka: 'c', paivitys: null });
  });
  it('ei PHV-tietoa → null (ei listata); yhteenveto laskee a/b/c', () => {
    expect(MIG.luokittelePhv({ data: {} })).toBe(null);
    const rivit = [TOPIAS, { phv_tila: 'PH' }, { phv_tila: 'huippu' }, { phv_tila: 'PRE', biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } }, mitattu('AN')]
      .map((d) => MIG.luokittelePhv({ data: d, bioDokLkm: 0 }));
    expect(MIG.yhteenveto(rivit)).toEqual({ a: 2, a_poisto: 1, a_sailyta: 1, b: 1, c: 1, ok: 1 });
  });
  it('kirjoitus vain --apply-lipulla; ADC (ei palvelutilin avainta); batch ≤ 450', () => {
    const s = lue('scripts/migrate_phv_sanasto.js');
    expect(s).toContain("const APPLY = argv.includes('--apply');");
    expect(s).toContain("if (!APPLY) { console.log('\\nDRY-RUN");
    expect(s).not.toMatch(/serviceAccount|credential\.cert|\.json['"]\s*\)/);
    expect(s).toContain('const BATCH = 450;');
  });
});
