/**
 * TalentMaster™ — §7.22 · KORTTI-välilehti + TILASTOT-rivi.
 *
 * #515 poisti ketjujen raaka-arvot, #516 laadullisti Testit-heron. Sama `flei_viimeisin` vuoti
 * yhä KAHDESTA muusta paikasta: KORTTI-kortin iso luku ("DRI 87") ja TILASTOT-rivi ("62 / 100").
 * Pistekorjaus jätti sisarukset, koska kynnys oli KOPIOITU renderin lokaaliin constiin.
 *
 * Tämä sviitti vartioi kolmea asiaa:
 *   A) YKSI kynnys — `_valmiusTila` on moduulitason funktio, ei renderin lokaali → neljättä
 *      sisarusta ei voi syntyä kopioimalla (rakenteellinen korjaus, ei pistekorjaus)
 *   B) IKÄPORTTI — luku vain Showcasessa (§58), ja portti on SAMA `naytaOvr` jota sisarfunktiot
 *      käyttävät (ei rinnakkaista ikälogiikkaa)
 *   C) RENDER — rKortti AJETAAN kolmella ikävaiheella ja tulos skannataan: Leikkijä/Rakentaja
 *      eivät saa sisältää yhtään näkyvää lukua kortissa eivätkä "/100"-muotoa
 *
 * (C) on se joka olisi napannut alkuperäisen bugin: lähdeskannaus yksin ei kerro mitä
 * renderöityy MILLEKIN ikävaiheelle.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const RIVIT = PEL.split('\n');

// ── Lähteestä ankkuroitu funktion runko (rivinumerot ajautuvat, nimet eivät) ──
function runko(nimi) {
  const a = RIVIT.findIndex((l) => new RegExp('^function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) return null;
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  return null;
}

// ── Renderöi rKortti oikealla lähdekoodilla, stubattu ympäristö ──
// Proxy-globaali: tuntematon nimi → stub (funktio JA objekti) → render ei kaadu puuttuvaan
// apuriin, mutta AIDOT funktiot (_fcKorttiData, _valmiusTila, _laskeStage) ajetaan lähteestä.
function renderoi(pelaaja, kieli, porttiAuki) {
  // porttiAuki = mutaatio (E): simuloi regressio jossa yhteinen OVR-portti avautuisi taas.
  const portti = porttiAuki ? runko('_fcNaytaOvr').replace('return false;', 'return !!(F && F.ikavyohyke === \'showcase\' && !F.rakentuu && F.ovr != null);') : runko('_fcNaytaOvr');
  const src = [runko('_tMittari'), runko('_tKortti'), runko('_valmiusTila'), runko('_laskeStage'),
               runko('_fcKorttiData'), runko('_fcRengasSVG'), portti, runko('rKortti')];
  src.forEach((x, i) => { if (!x) throw new Error('funktion runkoa ei löytynyt, index ' + i); });

  const LANG = require_lang();
  const base = {
    console, Math, Date, JSON, String, Number, Object, Array, RegExp, Boolean,
    _pelaaja: pelaaja, _streak: 4,
    t: (polku) => polku.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), LANG[kieli]) || polku,
    hdr: (x) => '<header>' + x + '</header>',
    _onkoSynttari: () => false, _haeStreak: () => 4,
    localStorage: { getItem: () => null, setItem() {} },
    window: {}
  };
  const stub = new Proxy(function () {}, {
    apply() { return ''; },
    get(t2, k) { if (k === Symbol.toPrimitive) return () => ''; if (k === 'length') return 0; return stub; },
    has() { return true; }
  });
  const sandbox = new Proxy(base, {
    has() { return true; },
    get(t2, k) { if (k === Symbol.unscopables) return undefined; if (k in t2) return t2[k]; if (k === 'window') return sandbox; return stub; },
    set(t2, k, v) { t2[k] = v; return true; }
  });
  base.window = sandbox;
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src.join('\n'), ctx, { timeout: 5000 });
  return vm.runInContext('rKortti()', ctx, { timeout: 5000 });
}
function require_lang() {
  const g = globalThis;
  const vanha = g.window;
  g.window = g.window || {};
  const L = require_mod();
  g.window = vanha;
  return L;
}
let _langCache = null;
function require_mod() {
  if (_langCache) return _langCache;
  const shim = { window: {}, console, localStorage: { getItem: () => null, setItem() {} }, document: { documentElement: {} } };
  vm.createContext(shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_lang.js'), 'utf8'), shim);
  _langCache = shim.window.TM_LANG || shim.TM_LANG;
  return _langCache;
}

// Kolme ikävaihetta samasta pohjasta: vain syntymävuosi + mittausten määrä vaihtuu.
const VUOSI = new Date().getFullYear();
const pelaaja = (ika, extra) => Object.assign({
  etunimi: 'Testi', sukunimi: 'Pelaaja', pelipaikka: 'KK', joukkueId: 'kpv_u13',
  syntymaVuosi: VUOSI - ika, flei_viimeisin: 62,
  d1_taso: 3.4, d2_taso: 3.2, tki_viimeisin: 72, d3_viimeisin: { pisteet: { a: 3.5 } },
  adar_viimeisin: { yht: 2.4 }, adar_havaintoja: 5
}, extra || {});

describe('A — yksi kynnys, yksi lähde', () => {
  it('_valmiusTila on MODUULITASON funktio, ei renderin lokaali const', () => {
    expect(PEL).toMatch(/^function _valmiusTila\(flei\) \{/m);
    // lokaalia kopiota ei saa jäädä jäljelle
    expect(PEL).not.toMatch(/const _valmiusTila\s*=/);
  });
  it('kynnykset 70/40 esiintyvät TÄSMÄLLEEN KERRAN (ei kopioitu sisarfunktioihin)', () => {
    const fn = runko('_valmiusTila');
    expect(fn).toContain('flei >= 70');
    expect(fn).toContain('flei >= 40');
    const koodi = PEL.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
    expect((koodi.match(/flei >= 70/g) || []).length).toBe(1);
    expect((koodi.match(/flei >= 40/g) || []).length).toBe(1);
  });
  it('kaikki kolme näyttöpaikkaa kutsuvat _valmiusTila():a', () => {
    expect(runko('rTestit')).toContain('_valmiusTila(');
    expect(runko('rKortti')).toContain('_valmiusTila(');
    // TILASTOT-rivi on rKortin sisällä ja käyttää samaa `tila`-objektia
    expect(runko('rKortti')).toMatch(/kehon_valmius'\),\s*v:\s*tila\.sana/);
  });
});

// PÄÄTÖS 4.10.2026 (Tero/projektinjohto): lapselle EI OVR-/tasolukua missään ikävaiheessa (myös showcase) — CLAUDE.md §0
// voittaa KORTTI_VISIO/TASOMALLI Osa B:n. Portti on nyt YKSI funktio _fcNaytaOvr (aina false), jota kaikki kolme käyttävät.
describe('B — yksi OVR-portti kaikille näyttöpaikoille, aina kiinni', () => {
  it('rKortti käyttää _fcKorttiData + yhteistä _fcNaytaOvr-porttia', () => {
    const fn = runko('rKortti');
    expect(fn).toContain('_fcKorttiData(p)');
    expect(fn).toContain('_fcNaytaOvr(F)');
    expect(runko('_fcNaytaOvr')).toMatch(/return false;/);
  });
  it('kaikki kolme näyttöpaikkaa käyttävät samaa porttia; vanhaa ikäportin lauseketta ei ole (ei rinnakkaista logiikkaa)', () => {
    expect((PEL.match(/= _fcNaytaOvr\(F\)/g) || []).length).toBe(3);   // rKortti · rMinaHero · naytaFcOverlay
    expect(PEL).not.toMatch(/ikavyohyke === 'showcase' && !\w*\.?rakentuu/);
  });
  it('keksityt fallback-luvut 87/88 ovat poissa kortista', () => {
    // Kommentit pois: ne SELITTÄVÄT poistetut arvot ja osuisivat muuten omaan väitteeseensä.
    const fn = runko('rKortti').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(fn).not.toMatch(/\|\|\s*87/);              // keksitty fallback-luku
    expect(fn).not.toMatch(/DRI\s*88/);                 // keksitty "seuraava taso" -luku
    expect(fn).not.toContain('+1 tästä viikosta');     // katteeton aikalupaus
    expect(fn).not.toContain('★ ELITE');               // kovakoodattu tier (nyt F.tierNimi)
  });
});

describe('C — RENDER: mitä kukin ikävaihe oikeasti näkee', () => {
  const ILMAN_TAGEJA = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  for (const [vaihe, ika] of [['leikkija', 11], ['rakentaja', 14], ['showcase', 17]]) {
    it(`${vaihe} (U${ika}): 0 näkyvää mittarilukua kortissa, ei "/100"`, () => {
      // joukkueId jätetään pois: 'KPV_U13' sisältää numeron joka on JOUKKUEEN NIMI, ei mittari.
      // Sekoittaisi numerosweepin; joukkuenimen renderöityminen todistetaan erikseen alla.
      const teksti = ILMAN_TAGEJA(renderoi(pelaaja(ika, { joukkueId: null }), 'fi'));
      expect(teksti).not.toMatch(/\d+\s*\/\s*100/);         // TILASTOT-rivin vanha muoto
      expect(teksti).not.toMatch(/DRI\s*\d/);
      expect(teksti).not.toContain('OVR');
      expect(teksti).not.toContain('OVERALL');
      expect(teksti).not.toContain('ELITE');
      expect(teksti).toContain('Kehittyy');                  // flei 62 → laadullinen tila
      // ainoa sallittu numero on streak-päivät ("4 pv") — yhtään mittarilukua ei saa olla
      const luvut = teksti.match(/\d+/g) || [];
      expect(luvut).toEqual(['4']);
    });

    it(`${vaihe} (U${ika}): identiteetti säilyy — nimi, pelipaikka ja joukkue renderöityvät`, () => {
      const teksti = ILMAN_TAGEJA(renderoi(pelaaja(ika), 'fi'));
      expect(teksti).toContain('Testi P.');
      expect(teksti).toContain('KK');
      expect(teksti).toContain('KPV_U13');
    });
  }

  it('showcase ilman mittauksia (rakentuu) EI saa lukua — portti on kaksiosainen', () => {
    const vain1 = { syntymaVuosi: VUOSI - 17, etunimi: 'Testi', sukunimi: 'P', flei_viimeisin: 62, tki_viimeisin: 72 };
    const teksti = ILMAN_TAGEJA(renderoi(vain1, 'fi'));
    expect(teksti).not.toContain('OVR');
    expect(teksti).toContain('Kehittyy');
  });

  it('ei dataa → neutraali "Ei mitattu vielä", ei punaista huoltoa eikä nollaa', () => {
    const teksti = ILMAN_TAGEJA(renderoi(pelaaja(14, { flei_viimeisin: 0 }), 'fi'));
    expect(teksti).toContain('Ei mitattu vielä');
    expect(teksti).not.toContain('Tarvitsee huoltoa');
    expect(teksti).not.toMatch(/\b0\s*\/\s*100/);
  });

  it('sv: kortti renderöityy ruotsiksi eikä jätä fi-jäänteitä', () => {
    const teksti = ILMAN_TAGEJA(renderoi(pelaaja(14), 'sv'));
    expect(teksti).toContain('Utvecklas');          // valmiustila_kehittyy sv
    expect(teksti).toContain('STATISTIK');
    expect(teksti).toContain('Kroppslig beredskap');
    expect(teksti).not.toContain('Kehittyy');
    expect(teksti).not.toContain('TILASTOT');
  });
});

describe('D — VP/Master säilyttävät luvut (regressio)', () => {
  it('VP näyttää yhä kehon valmius -luvun henkilökunnalle', () => {
    expect(VP).toMatch(/flei_viimeisin/);
    expect(VP).toMatch(/\/100|\/ 100|flei[^\n]*toFixed|Math\.round\(\s*\w*flei/i);
  });
  it('§7.22-korjaus koskee VAIN pelaajapintaa — VP:ssä ei ole _valmiusTila-porttia', () => {
    expect(VP).not.toContain('function _valmiusTila');
  });
});

describe('E — EI VACUOUS: gate punertaa aidosta vuodosta', () => {
  it('luvun injektointi Rakentaja-korttiin havaitaan render-skannauksella', () => {
    // simuloi regressio: sama muoto joka oli mainissa ennen tätä erää
    const vuotava = '<div>DRI 87</div><div>Kehon valmius 62 / 100</div>';
    const teksti = vuotava.replace(/<[^>]*>/g, ' ');
    expect(teksti).toMatch(/\d+\s*\/\s*100/);
    expect(teksti).toMatch(/DRI\s*\d/);
  });
  it('jos yhteinen portti avautuisi (regressio), showcase-render näyttäisi OVR-luvun → C-sweep punertaisi', () => {
    const vuoto = renderoi(pelaaja(17), 'fi', true).replace(/<[^>]*>/g, ' ');
    expect(vuoto).toContain('OVR');
    expect((vuoto.match(/\d+/g) || []).length).toBeGreaterThan(1);
    expect(renderoi(pelaaja(17), 'fi').replace(/<[^>]*>/g, ' ')).not.toContain('OVR');
  });
});
