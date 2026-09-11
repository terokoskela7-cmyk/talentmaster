/**
 * i18n V5 · VP_v25 alaerä V8d — D1/D2-silta-paneelit → sv: RESOLVE-TODISTE (ajo, ei lähdeluku).
 *
 * V8c sulki arviointi-taulukon (taksonomia). Viimeinen fi-pinta Arviointi-välilehdellä olivat silta-paneelit:
 *   _vpSiltaPaneeliHTML (D2 · "🎯 Ehdota jaksofokus") · _vpSiltaPreviewHTML · _vpD1SiltaPaneeliHTML (D1 · fysiikkajakso).
 * Tämä testi ajaa paneelit vm-sandboxissa oikeilla libeillä (silta · teknistaktiset · fyysteemat · taksonomia · vp-i18n)
 * sv-tilassa ja varmistaa:
 *   1) kiinteä chrome sv (0 fi-chrome-literaalia renderöidyssä HTML:ssä),
 *   2) palloliitto_nimi tulee taksonomian nimi_sv:stä (V8c-koneisto), EI silta-libin fi-nimestä,
 *   3) mittauslähde-avaimet (mitta.avain/laji) sv ja LUKITUN GLOSSAARIN mukaiset (pujottelu→slalom, EI dribbling),
 *   4) fi-tila ennallaan (ei regressiota suomelle).
 * TIER 2 (dokumentoitu raja, EI flägätä): konsepti-/teemanimet, syy/peruste ja curriculum-sisältö tulevat
 * lib-datasta jolla ei ole sv:tä (tm_teknistaktiset · tm_fyysteemat · tm_arviointi_silta) → oma lib-sv-erä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const juuri = join(__dir, '..');
const T = require('../lib/tm_arviointi_taksonomia.js');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

const lue = (suht) => readFileSync(join(juuri, suht), 'utf8');
// HTML-lohko merkkien väliltä (sama tekniikka kuin V8c: ajetaan se koodi joka oikeasti shippaa)
function lohko(alkuMerkki, loppuMerkki) {
  const a = VP.indexOf(alkuMerkki), b = VP.indexOf(loppuMerkki);
  expect(a, 'merkki puuttuu: ' + alkuMerkki).toBeGreaterThan(-1);
  expect(b, 'merkki puuttuu: ' + loppuMerkki).toBeGreaterThan(a);
  return VP.slice(a, b);
}

const PELAAJA = {
  id: 'probe1', joukkue: 'SJK P12', syntymaVuosi: 2014, phv_tila: 'PRE', hh_pvm: '2026-04-12',
  hh_viimeisin: { lin10m: 2.05, lin30m: 4.9, cmj: 26, mas: 15.5, kasirata: 9.1 },
  tk_lajit_viimeisin: { pujottelu_s: 22.5, syotto_s: 30.1, ponnauttelu_s: 40.2, kuljetus_laukaus_s: 25 },
  arviointi_havaittu: { ball_control: 2, finishing: 2, short_passing: 3, link_up: 4, ball_protection: 3 }
};

function sandbox(kieli) {
  const sb = { console };
  sb.window = sb;
  vm.createContext(sb);
  ['lib/tm_lang.js', 'lib/tm_i18n_common.js', 'lib/tm_vp_i18n.js', 'lib/tm_arviointi_taksonomia.js',
    'lib/tm_arviointi_silta.js', 'lib/tm_teknistaktiset.js', 'lib/tm_fyysteemat.js'].forEach((f) => vm.runInContext(lue(f), sb));
  vm.runInContext('tmAsetaKieli(' + JSON.stringify(kieli) + ', false);', sb);
  // VP-kerroksen kielivalinta + silta-paneelit HTML:stä (shippaava koodi)
  vm.runInContext(lohko('// ─── [TAKS-I18N-ALKU]', '// ─── [TAKS-I18N-LOPPU]'), sb);
  vm.runInContext(lohko('function _vpSiltaKonsepti(avain) {', '// ══════════ VAIHE 7'), sb);
  vm.runInContext(lohko('function _vpFyysEhdotus(p, ohitaGuard) {', 'window._vpFyysFokusModal'), sb);
  // Riippuvuudet joita paneelit kutsuvat typeof-vartioituna (renderin ulkopuoliset laskimet)
  vm.runInContext(`
    function _jsvEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function _dimIkaSp(){ return { ika: 12, sp: 'P' }; }
    function tkLajiTaso(){ return 2; }
    function laskeD1Osaindeksit(){ return { kiihdytys: 2, maksinopeus: 3, ketteryys: 2, aerobinen: 4, voima: 3 }; }
    function onNeutraaliPrePHV(){ return true; }
  `, sb);
  return sb;
}

function render(sb) {
  return (sb._vpSiltaPaneeliHTML(PELAAJA) || '') + '' + (sb._vpD1SiltaPaneeliHTML(PELAAJA) || '');
}

// Kiinteä chrome jonka PITÄÄ olla käännetty (fi-muoto = vuoto). Tier 2 -lib-sisältö EI ole listalla.
const FI_CHROME = ['Ehdota jaksofokus', 'Yksilökonsepti', 'pre-PHV = tekninen ikkuna auki', 'Aseta jaksofokukseksi',
  'Muut ehdotukset (klik = aseta)', 'Ohjaava kysymys', 'Harjoite</div>', '· mitattu ',
  'FLEI-prioriteetti — fysiikkajakso', 'Heikoin D1 — fysiikkajakso', '>mittaus ',
  'pre-PHV: fyysinen kehitys rajallista', 'Aseta fysiikkajakso · 4 vk'];
// sv-arvot = tm_vp_i18n:n sanktioidut käännökset (Kim/VP_SV_KAANNOSMUISTI) — EI omaa sanastoa (V8d korjasi vain avaimet).
const SV_CHROME = ['Föreslå periodfokus', 'Individuellt koncept', 'Ange som periodfokus', 'Andra förslag (klicka = ange)',
  'Svagaste D1 — fysikperiod', '>mätning ', 'Ange fysikperiod · 4 v'];

describe('V8d · silta-paneelit sv (ajo vm-sandboxissa)', () => {
  it('molemmat paneelit renderöityvät (ei-vacuous: testi ei mittaa tyhjää)', () => {
    const sb = sandbox('sv');
    expect(sb._vpSiltaPaneeliHTML(PELAAJA).length).toBeGreaterThan(200);
    expect(sb._vpD1SiltaPaneeliHTML(PELAAJA).length).toBeGreaterThan(200);
  });
  it('sv: 0 kiinteää fi-chrome-literaalia', () => {
    const h = render(sandbox('sv'));
    expect(FI_CHROME.filter((t) => h.includes(t))).toEqual([]);
  });
  it('sv: odotettu sv-chrome näkyy (otsikot · napit · Muut ehdotukset · mittaus)', () => {
    const h = render(sandbox('sv'));
    expect(SV_CHROME.filter((t) => !h.includes(t))).toEqual([]);
  });
  it('sv: "Muut ehdotukset" -rivien palloliitto-nimi = taksonomian nimi_sv (ei silta-libin fi-nimi)', () => {
    const sb = sandbox('sv');
    const h = sb._vpSiltaPaneeliHTML(PELAAJA);
    const LIB = sb.TM_ARVIOINTI_SILTA;
    const ehd = sb._vpSiltaEhdotukset(PELAAJA).slice(1);
    expect(ehd.length, 'demo-pelaajalla pitää olla ≥2 ehdotusta').toBeGreaterThan(0);
    ehd.forEach((e) => {
      const sv = T.tmTaksonomiaByAvain(e.palloliitto_avain).nimi_sv;
      expect(h, e.palloliitto_avain).toContain(sv);
      expect(h, 'fi-nimi vuotaa: ' + e.palloliitto_avain).not.toContain('>' + LIB.SILTA_NIMET[e.palloliitto_avain] + ' ');
    });
  });
  it('fi: chrome ennallaan, sv-termejä ei vuoda (ei regressiota suomelle)', () => {
    const h = render(sandbox('fi'));
    expect(h).toContain('Ehdota jaksofokus');
    expect(h).toContain('Aseta fysiikkajakso · 4 vk');
    expect(SV_CHROME.filter((t) => h.includes(t))).toEqual([]);
  });
});

describe('V8d · mittauslähde-avaimet sv (attribuuttirivin "· kiihdytys")', () => {
  const KAIKKI = [...new Set(T.ARVIOINTI_TAKSONOMIA.filter((i) => i.mitta).map((i) => i.mitta.laji || i.mitta.avain))];
  it('jokaiselle renderissä esiintyvälle avaimelle on sv (≠ avain), fi palauttaa avaimen', () => {
    expect(KAIKKI.length).toBe(9);
    KAIKKI.forEach((k) => {
      expect(T.tmMittaLahdeNimi(k, 'sv'), k).not.toBe(k);
      expect(T.tmMittaLahdeNimi(k), k).toBe(k);          // fi-näyttö = avain sellaisenaan
      expect(T.tmMittaLahdeNimi(k, 'en'), k).toBe(k);    // en puuttuu → avain (ei tyhjää)
    });
    expect(T.tmMittaLahdeNimi('tuntematon_avain', 'sv')).toBe('tuntematon_avain');
  });
  it('sv konformi LUKITTUUN glossaariin (tm_i18n_common) — pujottelu→slalom, EI dribbling', () => {
    const C = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
    expect(T.tmMittaLahdeNimi('pujottelu', 'sv')).toBe(C['Pujottelu'].toLowerCase());        // slalom
    expect(T.tmMittaLahdeNimi('syotto', 'sv')).toBe(C['Syöttö'].toLowerCase());              // passning
    expect(T.tmMittaLahdeNimi('ponnauttelu', 'sv')).toBe(C['Ponnauttelu'].toLowerCase());    // jonglering
    expect(T.tmMittaLahdeNimi('kuljetus_laukaus', 'sv')).toBe(C['Kuljetus-laukaus'].toLowerCase());
  });
  it('VP-render reitittää lähdeviitteen _taksLahde():n kautta (ei raakaa mitta.avainta)', () => {
    expect(VP).toContain('_jsvEsc(_taksLahde(item.mitta))');
    expect(/_jsvEsc\(item\.mitta\.laji \|\| item\.mitta\.avain\)/.test(VP)).toBe(false);
  });
  it('_taksLahde ajossa: sv kääntää, fi palauttaa avaimen', () => {
    const sv = sandbox('sv'), fi = sandbox('fi');
    expect(sv._taksLahde({ tyyppi: 'd1osa', avain: 'kiihdytys' })).toBe('acceleration');
    expect(sv._taksLahde({ tyyppi: 'tklaji', laji: 'pujottelu' })).toBe('slalom');
    expect(fi._taksLahde({ tyyppi: 'd1osa', avain: 'kiihdytys' })).toBe('kiihdytys');
    expect(sv._taksLahde(null)).toBe('');
  });
});

// V8d-live-oppi: sv-dup-tarkistus on tehtävä DEKOODATUISTA avaimista (AST), ei lähdetekstistä — '\u00e4'-escapella
// kirjoitettu avain on sama runtime-avain kuin 'ä'-avain, mutta tekstiskanneri ei näe duplikaattia (viimeinen voittaa).
describe('V8d · sv-kartan eheys (dup-vartija, dekoodatut avaimet)', () => {
  it('TM_VP_I18N.sv: 0 duplikaattiavainta', () => {
    const acorn = require('acorn');
    const src = readFileSync(join(juuri, 'lib', 'tm_vp_i18n.js'), 'utf8');
    const ast = acorn.parse(src, { ecmaVersion: 'latest' });
    const pino = [ast];
    const dup = [];
    let kartat = 0;
    while (pino.length) {
      const n = pino.pop();
      if (!n || typeof n !== 'object') continue;
      if (Array.isArray(n)) { n.forEach((x) => pino.push(x)); continue; }
      if (n.type === 'Property' && n.value && n.value.type === 'ObjectExpression' &&
          ((n.key.name || n.key.value) === 'sv') && n.value.properties.length > 100) {
        kartat++;
        const nahty = new Set();
        n.value.properties.forEach((pr) => {
          const k = pr.key.type === 'Literal' ? pr.key.value : pr.key.name;
          if (nahty.has(k)) dup.push(String(k).slice(0, 70));
          nahty.add(k);
        });
      }
      for (const k in n) { if (k === 'loc') continue; const c = n[k]; if (c && typeof c === 'object') pino.push(c); }
    }
    expect(kartat, 'sv-karttaa ei löytynyt → testi olisi vacuous').toBe(1);
    expect(dup).toEqual([]);
  });
});
