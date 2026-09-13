/**
 * i18n V5 · VP ILMOITUSKANAVAT (toast · alert · confirm · prompt) — committoitu portti.
 *
 * MIKSI OMA PORTTI EIKÄ RANGES-LAAJENNUS: ilmoitukset ovat hajallaan riveillä 2739–16366, eivät yhdellä
 * render-alueella. Kanavapohjainen portti on itsestään ylläpitävä — se pyydystää MYÖS tulevat uudet
 * toastit ilman että RANGES-listaa pitää muistaa laajentaa.
 *
 * KAKSI VÄITETTÄ:
 *  (1) KATTAVUUS — yhdenkään ilmoituskutsun ensimmäisessä argumentissa ei ole raakaa (vpT-käärimätöntä)
 *      suomenkielistä merkkijonoliteraalia. "routed" on PER-OCCURRENCE (AST-solmun sijainti vpT-argin
 *      range-alueella), ei string-jäsenyys — kerran muualla käännetty teksti ei kelpaa täällä raakana.
 *  (2) RESOLVI — jokainen käärityistä avaimista tuottaa ajossa aidosti sv:n. Pelkkä kääre ei riitä:
 *      strip-variantti (`vpT(' teksti ')` kun kartassa on `'teksti'`) näyttää portille reititetyltä
 *      mutta palauttaa AJOSSA fi:n. Tämä väite on se, joka pitää kartan ja lähteen synkassa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const acorn = require('acorn');
const juuri = join(__dir, '..');
const HTML = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

const KANAVAT = new Set(['toast', 'alert', 'confirm', 'prompt']);
// Ilmoituskanavan arg[0] on AINA näyttöä → kandidaatti on mikä tahansa ≥3-kirjaiminen sana. Kapea
// fi-sanalista EI riitä: se ohitti ' onnistui' ja 'Korjataan joukkueen "'. Allowlist = tuotetermit,
// koodit, enumit ja pelkkä välimerkki/numero.
const SALLI = /^(?:\s|[·—–\-/:()%.,+?"'!→✓⚠×0-9]|&amp;|&nbsp;|H-H|IDP|RPE|ACWR|PHV|OVR|TKI|TSI|VP|FU|D[1-5]|E1b|E2\.3|Firestore|demo|scout_potentiaali\*?|ok|err)+$/;
const SANA = /[A-Za-zÅÄÖåäö]{3,}/;
const onNaytto = (v) => SANA.test(v) && !SALLI.test(v);

function scriptLohkot(html) {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push({ src: m[1], off: m.index + m[0].indexOf(m[1]) });
  return out;
}
const riviNro = (html, off) => html.slice(0, off).split('\n').length;

// Palauttaa { raa'at:[{kanava,rivi,teksti}], routed:[teksti] } annetusta lähteestä.
function skannaa(html) {
  const raa = [], routed = [];
  for (const L of scriptLohkot(html)) {
    let ast;
    try { ast = acorn.parse(L.src, { ecmaVersion: 2022, ranges: true }); } catch { continue; }
    const vptR = [];
    (function w(n) {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'CallExpression' && n.callee && n.callee.type === 'Identifier' && /^vpT/.test(n.callee.name)) {
        n.arguments.forEach((a) => vptR.push([a.start, a.end]));
      }
      for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object' && v.type) w(v); }
    })(ast);
    const inVpt = (s, e) => vptR.some(([a, b]) => s >= a && e <= b);

    (function w(n) {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'CallExpression' && n.callee) {
        const nimi = n.callee.type === 'Identifier' ? n.callee.name
          : (n.callee.type === 'MemberExpression' && n.callee.property ? n.callee.property.name : null);
        if (KANAVAT.has(nimi) && n.arguments.length) {
          (function kerää(x) {
            if (!x || typeof x !== 'object') return;
            if (x.type === 'Literal' && typeof x.value === 'string') {
              if (!onNaytto(x.value)) return;
              if (inVpt(x.start, x.end)) routed.push(x.value);
              else raa.push({ kanava: nimi, rivi: riviNro(html, L.off + x.start), teksti: x.value });
            } else if (x.type === 'TemplateLiteral') {
              x.quasis.forEach((q) => {
                const v = q.value.cooked || '';
                if (onNaytto(v) && !inVpt(q.start, q.end)) raa.push({ kanava: nimi, rivi: riviNro(html, L.off + q.start), teksti: v });
              });
              x.expressions.forEach(kerää);
            } else if (x.type === 'BinaryExpression') { kerää(x.left); kerää(x.right); }
            else if (x.type === 'ConditionalExpression') { kerää(x.consequent); kerää(x.alternate); }
            else if (x.type === 'LogicalExpression') { kerää(x.left); kerää(x.right); }
            // Laskeudutaan MYÖS vpT-kutsuun: sen literaalit ovat inVpt → kirjautuvat routed-listaan.
            // Ilman tätä routed jää tyhjäksi eikä resolvi-väitteellä ole mitään tarkistettavaa.
            else if (x.type === 'CallExpression') x.arguments.forEach(kerää);
          })(n.arguments[0]);
        }
      }
      for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object' && v.type) w(v); }
    })(ast);
  }
  return { raa, routed };
}

function svSandbox() {
  const sb = { console: { log() {}, warn() {}, error() {} } };
  sb.window = sb;
  vm.createContext(sb);
  ['lib/tm_lang.js', 'lib/tm_i18n_common.js', 'lib/tm_vp_i18n.js']
    .forEach((f) => vm.runInContext(readFileSync(join(juuri, f), 'utf8'), sb));
  vm.runInContext("tmAsetaKieli('sv', false);", sb);
  return sb;
}

const TULOS = skannaa(HTML);

describe('ilmoituskanavat · kattavuus', () => {
  it('0 raakaa fi-literaalia toast/alert/confirm/prompt -argumentissa', () => {
    const lista = TULOS.raa.map((r) => `${r.kanava} @${r.rivi} ${JSON.stringify(r.teksti)}`);
    expect(lista).toEqual([]);
  });
  it('kanava on oikeasti katettu (ei-vacuous: reititettyjä löytyy runsaasti)', () => {
    expect(TULOS.routed.length).toBeGreaterThan(60);
  });
});

describe('ilmoituskanavat · resolvi (kääre ei yksin riitä)', () => {
  it('jokainen kääritty avain palauttaa AJOSSA sv:n, ei fi:tä', () => {
    const sb = svSandbox();
    const ei = [...new Set(TULOS.routed)].filter((t) => sb.vpT(t) === t);
    expect(ei).toEqual([]);
  });
  it('fi-tilassa sama teksti palautuu muuttumattomana (ei regressiota suomelle)', () => {
    const sb = svSandbox();
    vm.runInContext("tmAsetaKieli('fi', false);", sb);
    [...new Set(TULOS.routed)].slice(0, 30).forEach((t) => expect(sb.vpT(t)).toBe(t));
  });
});

describe('ilmoituskanavat · EI VACUOUS (mutaatiotodistus)', () => {
  const kääri = (koodi) => '<script>\n' + koodi + '\n</script>';
  it('raaka toast → portti punaiseksi', () => {
    const r = skannaa(kääri("toast('Tallennus epäonnistui', 'err');"));
    expect(r.raa.length).toBe(1);
  });
  it('raaka alert JA confirm → portti punaiseksi (kanava ei ole vain toast)', () => {
    expect(skannaa(kääri("alert('Oikeutesi ovat muuttuneet.');")).raa.length).toBe(1);
    expect(skannaa(kääri("confirm('Poistetaanko kaikki mittaukset?');")).raa.length).toBe(1);
  });
  it('raaka konkatenaatio-suffiksi ja ternaarihaara napataan (ei vain koko-literaalia)', () => {
    expect(skannaa(kääri("toast(n + ' sessiota poistettu', 'ok');")).raa.length).toBe(1);
    expect(skannaa(kääri("toast(x ? 'Ei mitätöitävää' : 'Ei palautettavaa', 'ok');")).raa.length).toBe(2);
  });
  it('vpT-kääritty EI flagaannu, mutta VIEREINEN raaka pala flagaantuu (per-occurrence)', () => {
    const r = skannaa(kääri("toast(vpT('Tallennus epäonnistui') + ' — ' + 'yritä uudelleen', 'err');"));
    expect(r.raa.map((x) => x.teksti)).toEqual(['yritä uudelleen']);
  });
  it('koodi/enum/tuotetermi EI flagaannu (ei vääriä positiivisia)', () => {
    expect(skannaa(kääri("toast(x, 'ok'); toast('H-H', 'ok'); toast('IDP', 'ok'); toast('· 5 %', 'ok');")).raa).toEqual([]);
  });
});
