/**
 * TalentMaster™ — PIIRROKSET VAIHE 1 · portti (lib/tm_piirros.js).
 *
 * Fasciallinjat (D1) + pelipaikkakartta (D4) inline-SVG:nä. Lukitsee:
 *   A) 5 ketjua, avaimet = §14 FLEI-ketjut · rakenne mockupin mukainen
 *   B) BRÄNDI — ei hexiä/rgb:tä libissä eikä komponentti-CSS:ssä (vain tokenit), terävät kulmat
 *   C) i18n — JOKAINEN näkyvä teksti kulkee t():n läpi (render-gate ei näe SVG-tekstiä)
 *   D) ei ulkoisia origineja eikä Firebase-SDK:ta (→ offline/PWA, ei App Check/CSP-kytkentää)
 *   E) pelipaikkakartta 1° + 2° · normalisointi · validointi (ei-tyhjyys)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const TT = require_(join(ROOT, 'lib', 'tm_teknistaktiset.js'));
globalThis.TM_TT_PELIPAIKAT = TT.TM_TT_PELIPAIKAT;
const P = require_(join(ROOT, 'lib', 'tm_piirros.js'));
const LIB = readFileSync(join(ROOT, 'lib', 'tm_piirros.js'), 'utf8');
const APIT = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Pelaaja_v7.html']
  .map((f) => [f, readFileSync(join(ROOT, f), 'utf8')]);

// §14 FLEI — viisi ketjua. Avaimet ovat enumeja (pelaajadokumentin kentät sbl/sfl/ll/diag/dfl).
const FLEI_AVAIMET = ['sbl', 'sfl', 'll', 'diag', 'dfl'];

describe('A — viisi fasciakuvaa, avaimet = FLEI-ketjut', () => {
  it('avaimet täsmäävät §14 FLEI-ketjuihin (ei enempää, ei vähempää)', () => {
    expect(P.tmFasciaAvaimet()).toEqual(FLEI_AVAIMET);
  });
  it('jokainen ketju renderöityy: silhuetti + ketjupolku + solmut', () => {
    for (const a of FLEI_AVAIMET) {
      const svg = P.tmFasciaKuva(a, { labelit: false });
      expect(svg, a).toContain('<svg');
      expect(svg, a).toContain('viewBox="0 0 120 280"');
      expect(svg, a).toContain('tmp-figure');                       // hairline-vartalo
      expect(svg, a).toMatch(/tmp-chain|tmp-chain-deep/);           // ketju
      expect(svg, a).toMatch(/class="tmp-node(-h)?"/);              // solmupisteet (kiinnityskohdat)
      expect((svg.match(/class="tmp-node(-h)?"/g) || []).length, a).toBeGreaterThanOrEqual(3);
      expect(svg, a).toContain('role="img"');
      expect(svg, a).toContain('aria-label=');
    }
  });
  it('kuvateksti sisältää nimen, näkymälapun ja lihasryhmät — MUTTA EI lyhennettä (V1.2)', () => {
    const h = P.tmFasciaKuva('sbl');
    expect(h).toContain('tmp-nimi');
    expect(h).toContain('tmp-view');
    expect(h).toContain('tmp-mus');
    // Myersin lyhenne (SBL/SFL/…) on ammattitermi → oletuksena piilossa ei-ammattilaispinnoilla
    expect(h).not.toContain('tmp-koodi');
    expect(h).not.toContain('>SBL<');
  });
  it('koodi:true näyttää lyhenteen (asiantuntijapinta voi pyytää sen erikseen)', () => {
    const h = P.tmFasciaKuva('sbl', { koodi: true });
    expect(h).toContain('tmp-koodi');
    expect(h).toContain('>SBL<');
  });
  it('taka-näkymä saa selkärankaviivan, etunäkymä ei', () => {
    expect(P.tmFasciaKuva('sbl', { labelit: false })).toContain('tmp-figure-faint');
    expect(P.tmFasciaKuva('sfl', { labelit: false })).not.toContain('tmp-figure-faint');
  });
  it('tuntematon avain → tyhjä (graceful, ei kaadu)', () => {
    expect(P.tmFasciaKuva('ei_ole')).toBe('');
    expect(P.tmFasciaKuva(null)).toBe('');
  });
});

describe('B — brändi: tokenit, ei kovakoodattua väriä, terävät kulmat', () => {
  it('libissä EI yhtään hexiä eikä rgb():tä', () => {
    expect(LIB.match(/#[0-9a-fA-F]{3,8}\b/g) || []).toEqual([]);
    expect(LIB.match(/\brgba?\(/g) || []).toEqual([]);
  });
  it('SVG ei sisällä inline-tyylivärejä — värit tulevat luokista', () => {
    const kaikki = FLEI_AVAIMET.map((a) => P.tmFasciaKuva(a)).join('') + P.tmPelipaikkaKartta('KY', 'KK');
    expect(kaikki).not.toMatch(/style="[^"]*(?:fill|stroke)\s*:/);
    expect(kaikki.match(/#[0-9a-fA-F]{3,8}\b/g) || []).toEqual([]);
  });
  for (const [nimi, src] of APIT) {
    it(`${nimi}: piirros-CSS käyttää VAIN tokeneita (ei hexiä/rgb:tä)`, () => {
      const lo = src.indexOf('/* ── PIIRROKSET VAIHE 1');
      expect(lo, nimi).toBeGreaterThan(0);
      const hi = src.indexOf('@media (max-width: 420px) { .tmp-fascia', lo);
      expect(hi, nimi).toBeGreaterThan(lo);
      const css = src.slice(lo, hi);
      expect(css.match(/#[0-9a-fA-F]{3,8}\b/g) || [], nimi).toEqual([]);
      expect(css.match(/\brgba?\(/g) || [], nimi).toEqual([]);
      // terävät kulmat: ainoa sallittu pyöristys on selitteen pallo (border-radius:50%)
      const radiukset = (css.match(/border-radius:\s*[^;]+/g) || []).map((x) => x.replace(/\s+/g, ''));
      for (const r of radiukset) expect(['border-radius:50%', 'border-radius:0'], nimi + ' ' + r).toContain(r);
      // vain brändifontit (tokenien kautta) — jokainen font-family alkaa var(:lla
      const fontit = (css.match(/font-family:[^;]+/g) || []).map((x) => x.replace('font-family:', '').trim());
      for (const f of fontit) expect(f.startsWith('var('), nimi + ' ' + f).toBe(true);
    });
  }
});

describe('C — i18n: jokainen näkyvä teksti kulkee t():n läpi', () => {
  const merkkaa = (s) => '⟦' + s + '⟧';
  // Näkyvä teksti = >…< tekstisolmut + aria-label. Kaikkien on oltava merkattuja PAITSI
  // enum-koodit (SBL/LL/MV/KY…) ja sija-merkinnät (1°/2°), jotka eivät ole käännettäviä.
  const ENUM = /^(?:[A-ZÅÄÖ0-9-]{1,5}|1°|2°)$/;
  const tekstit = (svg) => {
    const out = [];
    for (const m of svg.matchAll(/>([^<>]+)</g)) { const t = m[1].trim(); if (t) out.push(t); }
    for (const m of svg.matchAll(/aria-label="([^"]+)"/g)) out.push(m[1].trim());
    return out;
  };
  it('fasciakuvien tekstit ovat t():n takana (raaka-fi-skanni)', () => {
    for (const a of FLEI_AVAIMET) {
      const svg = P.tmFasciaKuva(a, { t: merkkaa });
      const raakaa = tekstit(svg).filter((x) => !x.includes('⟦') && !ENUM.test(x));
      expect(raakaa, a).toEqual([]);
    }
  });
  it('pelipaikkakartan ja selitteen tekstit ovat t():n takana', () => {
    const svg = P.tmPelipaikkaKartta('KY', 'KK', { t: merkkaa }) + P.tmPelipaikkaSelite({ t: merkkaa });
    const raakaa = tekstit(svg).filter((x) => !x.includes('⟦') && !ENUM.test(x));
    expect(raakaa).toEqual([]);
  });
  it('EI-TYHJYYS: ilman t():tä tekstit ovat kanonista suomea (skanni nappaisi ne)', () => {
    const svg = P.tmFasciaKuva('sbl', { t: merkkaa });
    expect(svg).toContain('⟦Vauhtiketju⟧');
    expect(P.tmFasciaKuva('sbl')).toContain('Vauhtiketju');   // ilman t → kanoninen fi
  });
  it('VP välittää vpT:n ja Master masterT:n piirroskomponenteille', () => {
    const vp = APIT[0][1], ma = APIT[1][1];
    expect(vp).toContain('tmFasciaKuva(k[2], { t: vpT, labelit: false })');
    expect(vp).toContain('tmPelipaikkaKartta(posCode, posCode2, { t: vpT })');
    expect(ma).toContain('tmPelipaikkaKartta(_posCode, _posCode2, { t: masterT })');
  });
});

describe('D — ei ulkoisia origineja eikä SDK:ta (offline/PWA, ei App Check -kytkentää)', () => {
  it('lib ei viittaa verkkoon eikä Firebaseen', () => {
    // Skannataan KOODI ilman kommentteja — tiedoston otsikko puhuu Firebasesta ("EI Firebase-SDK:ta"),
    // eikä se ole viittaus vaan rajauksen dokumentointi.
    const koodi = LIB.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(koodi).not.toMatch(/https?:\/\//);
    expect(koodi).not.toMatch(/\bfirebase\b|\bfirestore\b/i);
    expect(koodi).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|import\s*\(/);
    expect(koodi).not.toMatch(/<img|xlink:href|<image/);   // ei ulkoisia kuvia — kaikki piirretään
  });
  it('generoitu SVG ei sisällä ulkoisia viittauksia', () => {
    const kaikki = FLEI_AVAIMET.map((a) => P.tmFasciaKuva(a)).join('') + P.tmPelipaikkaKartta('KY', 'KK');
    expect(kaikki).not.toMatch(/https?:\/\/|<image|xlink:href|url\(/);
  });
  it('apit lataavat libin paikallisesti (suhteellinen polku)', () => {
    for (const [nimi, src] of APIT) {
      expect(src, nimi).toContain('<script src="lib/tm_piirros.js?v=');
    }
  });
});

describe('E — pelipaikkakartta 1° + 2°, normalisointi ja validointi', () => {
  it('kartta piirtää kentän ja kaikki TM_TT_PELIPAIKAT-koodit', () => {
    const svg = P.tmPelipaikkaKartta(null, null);
    for (const k of Object.keys(TT.TM_TT_PELIPAIKAT)) expect(svg, k).toContain('>' + k + '<');
    expect(svg).toContain('tmp-pitch');
  });
  it('1° = täytetty piste + 1°-merkintä; 2° = katkoviiva + 2°-merkintä', () => {
    const svg = P.tmPelipaikkaKartta('KY', 'KK');
    expect(svg).toContain('tmp-pos-dot tmp-p1');
    expect(svg).toContain('tmp-pos-dot tmp-p2');
    expect(svg).toContain('>1°<');
    expect(svg).toContain('>2°<');
    expect((svg.match(/tmp-p1/g) || []).length).toBe(1);   // vain YKSI 1°-korostus
    expect((svg.match(/tmp-p2/g) || []).length).toBe(1);
  });
  it('1°-pisteen koodilabel EI ole teal tealin päällä (oma tmp-on1-luokka, bg-kontrasti)', () => {
    const svg = P.tmPelipaikkaKartta('KY', 'KK');
    expect(svg).toContain('tmp-pos-lbl tmp-on1');     // 1° = täytetty piste
    expect(svg).toContain('tmp-pos-lbl tmp-on');      // 2° = katkoviiva
    for (const [nimi, src] of APIT) {
      expect(src, nimi).toContain('.tmp-pos-lbl.tmp-on1 { fill: var(--bg);');
    }
  });
  it('sija-numero käyttää ink-väriä + taustahaloa (erottuu pisteen JA kentän päällä)', () => {
    for (const [nimi, src] of APIT) {
      const css = src.slice(src.indexOf('.tmp-pos-rank'), src.indexOf('.tmp-pos-rank') + 260);
      expect(css, nimi).toContain('fill: var(--ink)');
      expect(css, nimi).toContain('paint-order: stroke');
      expect(css, nimi).toContain('stroke: var(--bg)');
    }
  });
  it('2° == 1° → vain 1° korostuu (validointi kartassa)', () => {
    const svg = P.tmPelipaikkaKartta('KY', 'KY');
    expect((svg.match(/tmp-p1/g) || []).length).toBe(1);
    expect(svg).not.toContain('tmp-p2');
    expect(svg).not.toContain('>2°<');
  });
  it('normalisointi: koodi tai suomalaisnimi → kanoninen koodi', () => {
    expect(P.tmPositioNormalisoi('ky')).toBe('KY');
    expect(P.tmPositioNormalisoi('Kymppi')).toBe('KY');
    expect(P.tmPositioNormalisoi('keskushyökkääjä')).toBe('KH');
    expect(P.tmPositioNormalisoi('  MV ')).toBe('MV');
    expect(P.tmPositioNormalisoi('sentteri')).toBeNull();
    expect(P.tmPositioNormalisoi('')).toBeNull();
    expect(P.tmPositioNormalisoi(null)).toBeNull();
  });
  it('validointi: 2° ≠ 1°; tyhjä 2° sallittu; 2° ilman 1° estetty', () => {
    expect(P.tmPositioValidoi('KY', 'KK').ok).toBe(true);
    expect(P.tmPositioValidoi('KY', null).ok).toBe(true);
    expect(P.tmPositioValidoi('KY', '').ok).toBe(true);
    expect(P.tmPositioValidoi('KY', 'KY').ok).toBe(false);
    expect(P.tmPositioValidoi('KY', 'Kymppi').ok).toBe(false);   // normalisoinnin jälkeen sama
    expect(P.tmPositioValidoi(null, 'KK').ok).toBe(false);
    expect(P.tmPositioValidoi('KY', 'sentteri').ok).toBe(false); // tuntematon
  });
  it('EI-TYHJYYS: validointi todella estää — syy on kanoninen suomi (käännösavain)', () => {
    const v = P.tmPositioValidoi('KY', 'KY');
    expect(v.syy).toBe('Toissijainen ei voi olla sama kuin ensisijainen');
    const sv = require_(join(ROOT, 'lib', 'tm_vp_i18n.js')).TM_VP_I18N.sv;
    for (const syy of ['Toissijainen ei voi olla sama kuin ensisijainen', 'Aseta ensisijainen pelipaikka ensin', 'Tuntematon pelipaikka']) {
      expect(typeof sv[syy], syy).toBe('string');
    }
  });
  it('kirjoituspolku: molemmat apit normalisoivat + validoivat ennen tallennusta', () => {
    const vp = APIT[0][1], ma = APIT[1][1];
    for (const [nimi, src] of [['VP', vp], ['Master', ma]]) {
      expect(src, nimi).toContain('tmPositioNormalisoi(code)');
      expect(src, nimi).toContain('tmPositioValidoi(');
      expect(src, nimi).toContain('tt_positio_toissijainen');
    }
    expect(ma).toContain("set({ tt_positio_toissijainen: norm }, { merge: true })");
    expect(vp).toContain("_vpTtKirjoita(pid, { tt_positio_toissijainen: norm }");
    // demo ei kirjoita
    expect(ma).toContain("if (_demo || !_seuraId || typeof _db === 'undefined' || !_db)");
  });
  it('rules: tt_positio_toissijainen on samassa field-level-allowlistissa kuin 1°', () => {
    const rules = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
    expect(rules).toContain("'jaksofokus', 'tt_positio_aktiivinen', 'tt_positio_toissijainen', 'jaksofokus_historia'");
    // fysioterapeutin allowlist EI saa sisältää sitä
    const fysio = rules.slice(rules.indexOf("rooli == 'fysioterapeutti'"), rules.indexOf("rooli == 'fysioterapeutti'") + 260);
    expect(fysio).not.toContain('tt_positio_toissijainen');
  });
});
