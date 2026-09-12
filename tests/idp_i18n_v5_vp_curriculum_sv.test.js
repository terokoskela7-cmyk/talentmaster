/**
 * i18n V5 · Vaihe B — teknis-taktisen curriculumin RESOLVE-TODISTE (VP_v25).
 *
 * MIKSI OMA PORTTI: render-gate (idp_i18n_v5_vp_render_dom) näkee vain VP:n LÄHDEKOODIN literaalit.
 * Curriculum ei ole literaaleja vaan lib-dataa → gate on tälle sokea (siksi lib-nimet ovat sen
 * allowlistilla). Kattavuuden voi todistaa vain AJAMALLA resolvin: jokainen curriculum-avain, jonka VP
 * voi renderöidä, palauttaa sv-arvon kun kieli on sv — ja fi-arvon kun kieli on fi.
 *
 * Ajo tapahtuu vm-sandboxissa shippaavalla koodilla (HTML:n [TT-I18N]-lohko + oikeat libit), ei stubeilla:
 * new Function -tyylinen poiminta ei nappaa ReferenceErroreita samalla tavalla.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const juuri = join(__dir, '..');
const HTML = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const T = require('../lib/tm_teknistaktiset.js');
const { TM_TT_SV } = require('../lib/tm_teknistaktiset_sv.js');
const P = require('../scripts/i18n_curriculum.cjs');
const FI = P.irrota().avaimet;
// Sama kenttälista kuin irrotuksessa JA VP:n _TT_TEKSTIKENTAT:issa — todiste rikkoutuu jos ne eriytyvät.
const TEKSTIKENTAT = P.TEKSTIKENTAT;

const lue = (f) => readFileSync(join(juuri, f), 'utf8');
function lohko(alku, loppu) {
  const a = HTML.indexOf(alku), b = HTML.indexOf(loppu);
  if (a < 0 || b < 0) throw new Error('lohko puuttuu: ' + alku);
  return HTML.slice(a, b + loppu.length);
}

function sandbox(kieli, svKartta) {
  const sb = { console };
  sb.window = sb;
  vm.createContext(sb);
  ['lib/tm_lang.js', 'lib/tm_teknistaktiset.js', 'lib/tm_teknistaktiset_sv.js'].forEach((f) => vm.runInContext(lue(f), sb));
  if (svKartta) vm.runInContext('TM_TT_SV = window.TM_TT_SV = ' + JSON.stringify(svKartta) + ';', sb);
  vm.runInContext('tmAsetaKieli(' + JSON.stringify(kieli) + ', false);', sb);
  vm.runInContext("function _vpTaksLang() { try { return (typeof tmNykyinenKieli === 'function' && tmNykyinenKieli()) || 'fi'; } catch (e) { return 'fi'; } }", sb);
  vm.runInContext(lohko('// ─── [TT-I18N-ALKU]', '// ─── [TT-I18N-LOPPU]'), sb);
  return sb;
}

// Kaikki konseptit yhtenä listana (youth · fundamentit · joukkue) — sama joukko jonka VP voi renderöidä.
function kaikkiKonseptit() {
  const out = T.TM_TT_YOUTH.concat(T.TM_TT_JOUKKUE);
  Object.keys(T.TM_TT_FUNDAMENTIT).forEach((pos) => T.TM_TT_FUNDAMENTIT[pos].forEach((it) => out.push(it)));
  return out;
}

// Resolvi kaikkien VP:n tavoittamien avainten yli → { osui:Set, ohi:[] }
function resolvoi(sb) {
  const osui = new Set(), ohi = [];
  const tarkista = (avain, saatu) => {
    const odotus = TM_TT_SV[avain];
    if (odotus == null) return;                       // avainta ei ole käännettävissä
    if (saatu === odotus) osui.add(avain);
    else ohi.push(avain + ' → ' + String(saatu).slice(0, 50));
  };
  kaikkiKonseptit().forEach((it) => {
    const sv = sb._ttKonsepti(it);
    TEKSTIKENTAT.forEach((f) => {
      if (typeof it[f] === 'string') tarkista(it.avain + '.' + f, sv[f]);
    });
    (it.kpi || []).forEach((c, i) => {
      if (c && typeof c.teksti === 'string') tarkista(it.avain + '.kpi.' + c.koodi + '.teksti', sv.kpi[i].teksti);
    });
    const kys = sb._ttKys(it.avain);
    (it.kysymykset || []).forEach((q, i) => tarkista(it.avain + '.kysymys.' + i, kys[i]));
  });
  Object.keys(T.TM_TT_HARJOITTEET).forEach((koodi) => {
    const raaka = T.TM_TT_HARJOITTEET[koodi], lista = Array.isArray(raaka);
    const sv = sb._ttHarj(koodi);
    (lista ? raaka : [raaka]).forEach((h, i) => {
      TEKSTIKENTAT.forEach((f) => {
        if (typeof h[f] === 'string') tarkista('harjoite.' + koodi + (lista ? '.' + i : '') + '.' + f, sv[i][f]);
      });
    });
  });
  Object.keys(T.TM_TT_PELIPAIKAT).forEach((k) => tarkista('pelipaikka.' + k + '.nimi', sb._ttPpNimi(k)));
  return { osui, ohi };
}

let SV, FIS;
beforeAll(() => { SV = sandbox('sv'); FIS = sandbox('fi'); });

describe('curriculum-resolvi · sv (kattavuus)', () => {
  it('jokainen VP:n tavoittama curriculum-avain resolvoituu sv:hen', () => {
    const { osui, ohi } = resolvoi(SV);
    expect(ohi).toEqual([]);
    expect(osui.size).toBeGreaterThan(1200);
  });
  it('kattavuus = kaikki sidecarin avaimet PAITSI asteikko (jota VP ei renderöi libistä)', () => {
    const { osui } = resolvoi(SV);
    const tavoittamattomat = Object.keys(TM_TT_SV).filter((k) => !osui.has(k));
    // asteikko.taso.1..3 = ainoa tietoinen aukko; VP näyttää oman lyhennetyn vpT-vihjeensä.
    expect(tavoittamattomat.sort()).toEqual(['asteikko.taso.1', 'asteikko.taso.2', 'asteikko.taso.3']);
  });
  it('ei fi-vuotoa: yksikään resolvoitu arvo ei ole fi-lähteen arvo', () => {
    const { osui } = resolvoi(SV);
    const vuodot = [...osui].filter((k) => TM_TT_SV[k] === FI[k]);
    expect(vuodot).toEqual([]);
  });
});

describe('curriculum-resolvi · fi (ei regressiota suomelle)', () => {
  it('fi-tilassa resolvi palauttaa libin fi-arvon muuttumattomana', () => {
    const it0 = T.TM_TT_YOUTH[0];
    const sv = FIS._ttKonsepti(it0);
    expect(sv.nimi).toBe(it0.nimi);
    expect(sv.pelitilanne).toBe(it0.pelitilanne);
    expect(FIS._ttKys(it0.avain)).toEqual(it0.kysymykset || []);
    expect(FIS._ttPpNimi('MV')).toBe(T.TM_TT_PELIPAIKAT.MV.nimi);
  });
  it('fi-tilassa palautetaan ALKUPERÄINEN objekti (ei turhaa kopiota renderin kuumalla polulla)', () => {
    expect(FIS._ttKonsepti(T.TM_TT_YOUTH[0])).toBe(T.TM_TT_YOUTH[0]);
  });
});

describe('curriculum-resolvi · enum-invariantti', () => {
  it('avain · koodi · kpi[].koodi EIVÄT käänny (Firestore-vertailut nojaavat niihin)', () => {
    kaikkiKonseptit().slice(0, 40).forEach((it) => {
      const sv = SV._ttKonsepti(it);
      expect(sv.avain).toBe(it.avain);
      expect(sv.koodi).toBe(it.koodi);
      (it.kpi || []).forEach((c, i) => expect(sv.kpi[i].koodi).toBe(c.koodi));
    });
  });
  it('lib-dataa ei mutatoida (kopio, ei paikallaan kirjoitus)', () => {
    const it0 = T.TM_TT_YOUTH[0], ennen = it0.nimi;
    SV._ttKonsepti(it0);
    expect(it0.nimi).toBe(ennen);
    expect(SV._ttKonsepti(it0)).not.toBe(it0);
  });
});

describe('curriculum-resolvi · fi-fallback (puuttuva käännös)', () => {
  it('puuttuva sv-avain → fi (ei tyhjää, ei kaatumista)', () => {
    const vaillinainen = Object.assign({}, TM_TT_SV);
    const avain = T.TM_TT_YOUTH[0].avain + '.nimi';
    delete vaillinainen[avain];
    const sb = sandbox('sv', vaillinainen);
    expect(sb._ttKonsepti(T.TM_TT_YOUTH[0]).nimi).toBe(T.TM_TT_YOUTH[0].nimi);
    // muut kentät kääntyvät yhä → fallback on avainkohtainen, ei koko konseptin
    expect(sb._ttKonsepti(T.TM_TT_YOUTH[0]).pelitilanne).toBe(TM_TT_SV[T.TM_TT_YOUTH[0].avain + '.pelitilanne']);
  });
  it('sidecar puuttuu kokonaan → fi, ei heittoa (graceful, sama kuvio kuin muut libit)', () => {
    const sb = sandbox('sv', {});
    expect(sb._ttKonsepti(T.TM_TT_YOUTH[0]).nimi).toBe(T.TM_TT_YOUTH[0].nimi);
    expect(sb._ttPpNimi('MV')).toBe(T.TM_TT_PELIPAIKAT.MV.nimi);
  });
});

describe('curriculum-resolvi · EI VACUOUS (mutaatiotodistus)', () => {
  it('synteettinen fi-vuoto sidecarissa → kattavuusportti punaiseksi', () => {
    const vuotava = Object.assign({}, TM_TT_SV);
    const avain = T.TM_TT_YOUTH[1].avain + '.nimi';
    vuotava[avain] = FI[avain];                       // sv = fi → vuoto
    const sb = sandbox('sv', vuotava);
    const saatu = sb._ttKonsepti(T.TM_TT_YOUTH[1]).nimi;
    expect(saatu).toBe(FI[avain]);                    // resolvi palauttaa vuotavan arvon…
    expect(saatu).not.toBe(TM_TT_SV[avain]);          // …eli EI oikeaa sv-arvoa → portti huomaisi
  });
  it('väärään kenttään mennyt käännös näkyy (avainskeema ei saa liukua)', () => {
    const sekaisin = Object.assign({}, TM_TT_SV);
    const a = T.TM_TT_YOUTH[0].avain;
    sekaisin[a + '.nimi'] = TM_TT_SV[a + '.pelitilanne'];
    const sb = sandbox('sv', sekaisin);
    expect(sb._ttKonsepti(T.TM_TT_YOUTH[0]).nimi).not.toBe(TM_TT_SV[a + '.nimi']);
  });
});

describe('curriculum-resolvi · pelipaikat (§4.4)', () => {
  it('MV · T · KH resolvoituvat sv-nimiin, koodi säilyy enumina', () => {
    ['MV', 'T', 'KH', 'LP', 'KK', 'KY', 'LA'].forEach((k) => {
      expect(SV._ttPpNimi(k)).toBe(TM_TT_SV['pelipaikka.' + k + '.nimi']);
      expect(SV._ttPpNimi(k)).not.toBe(T.TM_TT_PELIPAIKAT[k].nimi);
    });
  });
  it('tuntematon pelipaikkakoodi → koodi itse (ei kaatumista)', () => {
    expect(SV._ttPpNimi('XX')).toBe('XX');
    expect(SV._ttPpNimi(null)).toBe('');
  });
});
