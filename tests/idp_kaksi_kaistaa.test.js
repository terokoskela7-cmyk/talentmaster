/**
 * TalentMaster™ — IDP: KAKSI KAISTAA (pelissä näkyvä + fyysinen mitattu). Vartija.
 *
 * ⚠ EI TYNKÄÄ `_vpJfTilanneHTML`:lle eikä kaistafunktioille. Tämä on sama sääntö kuin #627:ssä:
 * tynkä piilottaisi juuri sen sisällön jota kaistajako koskee.
 *
 * Ydin: tavoitteet ryhmitellään sen mukaan MITEN ETENEMISEN TIETÄÄ. Fyysinen on ainoa mitattu
 * ulottuvuus → oma kaista, ei "opittu kun" -kenttää, ei tukitavoitteita. Jako on epistemologinen,
 * ei tärkeysjärjestys.
 *
 * Mockupit: `IDP_KAKSI_KAISTAA_MOCKUP.html` (mobiili) · `..._TYOPOYTA_MOCKUP.html` (työpöytä)
 * Tausta: `ANALYYSI_IDP_KORTTI_TAVOITTEIDEN_LOGIIKKA.md`
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const vaadi = createRequire(import.meta.url);
const JF = vaadi('../lib/tm_jaksofokus.js');
const I18N = vaadi('../lib/tm_vp_i18n.js');
const SV = (I18N.TM_VP_I18N || I18N).sv;

function pura(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('sulkuja ei saatu tasan: ' + tunniste);
}

const AIDOT = [
  'function _vpJfOsaJako(teksti) {',
  'function _vpJfKestoNyt(p) {',
  'function _vpJfAktItem(p) {',
  'function _vpJfOsatHTML(p, item) {',
  'function _vpJfHarjoituksessaHTML(p, item) {',
  'function _vpJfTavoitteetLukuHTML(p) {',
  'function _vpFyysMittarit(p) {',
  'function _vpFyysOhjelmassaHTML(p) {',
  'function _vpJfFyysKaistaHTML(p) {',
  'function _vpKaistaUlottuvuus(domeeni) {',
  'function _vpJfTuetHTML(p) {',
  'function _vpJfPelissaKaistaHTML(p) {',
  'function _vpJfTilanneHTML(p) {',
  'function _vpJfLinkitHTML(p) {',
];
const PALAUTA = ['_vpJfTilanneHTML', '_vpJfPelissaKaistaHTML', '_vpJfFyysKaistaHTML', '_vpJfTuetHTML',
  '_vpFyysMittarit', '_vpFyysOhjelmassaHTML', '_vpKaistaUlottuvuus', '_vpJfLinkitHTML',
  '_vpJfTavoitteetLukuHTML'];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function nakyva(h) {
  return String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

const TAITO = {
  avain: 'y_h2', koodi: 'Y-H2', nimi: 'Tempokuljetus', faasi: 'hyokkays',
  pelitilanne: 'Vastustaja lähestyy.',
  kpi: [
    { koodi: 'a', teksti: 'Sido pallon etäisyys: lähelle kun puolustaja on lähellä' },
    { koodi: 'b', teksti: 'Pidä pää ylhäällä: tieto ratkaisee reitin' },
    { koodi: 'c', teksti: 'Vaihda suuntaa ja rytmiä' },
  ],
};

/** Tukilista: peliäly + henkinen + (vanhassa datassa) fyysinen. */
const TUET = [
  { key: 'tuki0', rooli: 'tuki', idx: 0, domeeni: 'psyykkinen', konsepti_avain: 'pelin_lukeminen', konsepti_nimi: 'Pelin lukeminen' },
  { key: 'tuki1', rooli: 'tuki', idx: 1, domeeni: 'sosiaalinen', konsepti_avain: 'kommunikointi', konsepti_nimi: 'Kommunikointi' },
];
const PAA = { key: 'paa', rooli: 'paa', domeeni: 'teknis_taktinen', konsepti_avain: 'y_h2', konsepti_nimi: 'Tempokuljetus' };

function rakenna(lisa) {
  const o = lisa || {};
  const kutsut = [];
  const win = {
    TM_JAKSOFOKUS: JF,
    TM_FYYSTEEMAT_LIB: o.flib !== undefined ? o.flib : {
      TM_FYYSTEEMAT: [{ avain: 'nopeus', nimi: 'Nopeus' }],
      tmFyysPHVPortti: () => ({ neutraali: !!o.phvNeutraali }),
    },
    _vpJfOsaArviot: {}, _vpJfOsaAuki: {}, _vpJfHarjAuki: {}, _vpJfKaikki: {},
    _vpJfKestoValinta: {}, _vpJfFyysTeema: {}, _vpJfMittausAuki: {},
    _vpJfTarkenteet: o.tarkenteet || {},
    _vpJfLinkit: o.linkit || {},
    _vpJfLinkitDom: {},
    _vpArvPelaaja: o.p || null,
    _tmIBtn: () => '',
  };
  const store = {
    window: win,
    _jsvEsc: esc,
    vpT: (s) => (o.kieli === 'sv' ? (SV[s] != null ? SV[s] : s) : s),
    tmNykyinenKieli: () => o.kieli || 'fi',
    _vpTtPelaaja: () => o.p || null,
    _jfOhjausAlusta: () => o.p || null,
    _vpTtValinta: {},
    _vpTtNormPositio: (x) => x || null,
    _dimIkaSp: () => ({ ika: 13, sp: 'M' }),
    _ttItems: () => [TAITO],
    _ttKys: () => [],
    _ttHarj: () => [],
    _vpKonseptiNimiNaytto: (jf) => (jf && jf.konsepti_nimi) || '',
    _vpJfTavoiteLista: () => (o.tavoitteet != null ? o.tavoitteet : [PAA].concat(TUET)),
    _vpJfMittausOletus: () => 'arviointi',
    _vpJfNykyarvo: () => ({ arvo: 3, max: 5 }),
    _vpJfDomeeniKonseptit: () => [{ avain: 'x', nimi: 'X' }],
    _vpJfPaafokusRef: () => PAA,
    eerikkilaTaso: () => (o.taso !== undefined ? o.taso : 4),
    _fmtTestiArvo: (v) => v,
    onNeutraaliPrePHV: () => false,
    tmKehys: () => null,
    kutsut: kutsut,
  };
  Object.assign(store, o.ymp || {});
  const ymp = new Proxy(store, {
    has: (t2, k) => (k in t2) || !(k in globalThis),
    get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : () => '')),
    set: (t2, k, v) => { t2[k] = v; return true; },
  });
  const runko = AIDOT.map(pura).join('\n');
  const paluu = 'return {' + PALAUTA.map((n) => n + ':' + n).join(',') + ', _win: window};';
  // eslint-disable-next-line no-new-func
  const api = new Function('__ymp', 'with(__ymp){' + runko + '\n' + paluu + '}')(ymp);
  api.kutsut = kutsut;
  return api;
}

/** Teknis-taktinen jaksofokus + mitattu fysiikka (30 m + CMJ, MAS puuttuu). */
function pelaaja(yli) {
  return Object.assign({
    id: 'p1', joukkue: 'SJK P13', syntymaVuosi: 2013,
    jaksofokus: {
      konsepti_avain: 'y_h2', konsepti_nimi: 'Tempokuljetus', domeeni: 'teknis_taktinen',
      alkoi: '2026-09-01', kesto_vk: 4, osa_arviot: { y_h2: { a: 3, b: 2, c: 1 } },
    },
    hh_viimeisin: { lin30m: 4.9, cmj: 34 },
    hh_taso_edellinen: 3,
    idp_fokus: { nimi: 'Syötön piilotus' },
    jaksofokus_historia: [],
  }, yli || {});
}

/* ══ (1) KAKSI KAISTAA ══════════════════════════════════════════════════════ */
describe('(1) Tilannenäkymässä on kaksi erillistä kaistaa', () => {
  const p = pelaaja();
  const h = rakenna({ p: p })._vpJfTilanneHTML(p);

  it('molemmat kaistat renderöityvät otsikkoineen', () => {
    expect(h).toContain('Pelissä näkyvä');
    expect(h).toContain('Fyysinen');
    expect(h).toContain('Mitä pelaaja tekee kentällä — havaitaan pelissä.');
    expect(h).toContain('Etenee testeistä, ei pelihavainnosta.');
  });

  it('kaistat ovat omia lohkojaan, pelissä näkyvä ensin', () => {
    const iPeli = h.indexOf('Pelissä näkyvä');
    const iFyys = h.indexOf('🏃');
    expect(iPeli).toBeGreaterThan(-1);
    expect(iFyys).toBeGreaterThan(iPeli);
    expect((h.match(/class="kai /g) || []).length + (h.match(/class="kai game"/g) || []).length)
      .toBeGreaterThanOrEqual(2);
  });

  it('kärki näkyy pelissä näkyvällä kaistalla tunnisteineen', () => {
    expect(h).toContain('Tempokuljetus');
    expect(h).toContain('kärki');
    expect(h).toContain('Teknis-taktinen');
  });
});

/* ══ (2) FYYSINEN EI OLE TUKITAVOITE ════════════════════════════════════════ */
describe('(2) Fyysinen ei ole tukitavoite (§28-portti sulkeutuu)', () => {
  it('tukivalitsin tarjoaa vain teknis_taktinen / psyykkinen / sosiaalinen', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfLinkitHTML(p);
    const i = h.indexOf('_vpJfLinkDom');
    expect(i, 'tukivalitsinta ei renderöity').toBeGreaterThan(-1);
    const valitsin = h.slice(i, h.indexOf('</select>', i));
    expect(valitsin).toContain('teknis_taktinen');
    expect(valitsin).toContain('psyykkinen');
    expect(valitsin).toContain('sosiaalinen');
    expect(valitsin, 'fyysinen on yhä tukivalitsimessa').not.toContain('fyysinen');
  });

  it('lähde suodattaa fyysisen domeenilistasta (ei libistä)', () => {
    const f = pura('function _vpJfLinkitHTML(p) {');
    expect(f).toContain("return d.avain !== 'fyysinen';");
    // TM_JF_DOMEENIT ei muutu: fyysinen KÄRKI on yhä kelvollinen
    expect(JF.TM_JF_DOMEENIT.some((d) => d.avain === 'fyysinen'), 'lib muutettiin turhaan').toBe(true);
  });

  it('kirjoituspolku estää fyysisen myös muualta kutsuttuna', () => {
    const f = pura('window._vpJfLisaaLinkki = function (pid) {');
    expect(f).toContain("if (dom === 'fyysinen') return;");
  });
});

/* ══ (3) FYYSINEN KAISTA ON MITATTU ═════════════════════════════════════════ */
describe('(3) Fyysinen kaista on mitattu, ei kirjoitettu', () => {
  const p = pelaaja();
  const h = rakenna({ p: p })._vpJfFyysKaistaHTML(p);

  it('näyttää 30 m / CMJ / MAS hh_viimeisin:stä', () => {
    expect(h).toContain('30 m');
    expect(h).toContain('CMJ');
    expect(h).toContain('MAS');
    expect(h).toContain('4.9');
    expect(h).toContain('34');
  });

  it('puuttuva mittaus → viiva + "ei mittausta"', () => {
    expect(h).toContain('ei mittausta');
    expect(h).toContain('—');
  });

  it('ei syöttökenttiä eikä "opittu kun"', () => {
    expect(h, 'mitatulle kaistalle vuoti lomakekenttä').not.toMatch(/<textarea|<input|<select/i);
    expect(h, 'mitattua ei kirjata pelihavaintona').not.toContain('Milloin taito on opittu?');
    expect(h).not.toContain('Kirjaa');
  });

  it('ensimmäinen mittaus → ei suuntaa (§29)', () => {
    const q = pelaaja({ hh_taso_edellinen: null });
    const eka = rakenna({ p: q })._vpJfFyysKaistaHTML(q);
    expect(eka).toContain('1. mittaus');
    expect(eka).toContain('Kehityssuunta näkyy toisesta mittauksesta alkaen.');
    // toisesta mittauksesta alkaen suunta näkyy
    expect(h).not.toContain('1. mittaus');
    expect(h).toMatch(/[↑↓→]/);
  });

  it('§28: kasvupyrähdys kesken → oma kehityskaista, ei ikäluokka', () => {
    const q = pelaaja();
    const phv = rakenna({ p: q, phvNeutraali: true })._vpJfFyysKaistaHTML(q);
    expect(phv).toContain('Kasvupyrähdys kesken');
    expect(h, 'huomautus näkyy vaikka portti ei ole päällä').not.toContain('Kasvupyrähdys kesken');
  });

  it('laskenta on jaettu Aloituksen mittaruutujen kanssa (ei uutta laskentaa)', () => {
    const stat = pura('function _vpStatTiivisteHTML(p) {');
    expect(stat).toContain('_vpFyysMittarit(p)');
    const m = rakenna({ p: p })._vpFyysMittarit(p);
    expect(m.map((x) => x.lbl)).toEqual(['30 m', 'CMJ', 'MAS']);
    expect(m[2].tyhja).toBe(true);
  });
});

/* ══ (4) P1 — "OHJELMASSA NYT" ══════════════════════════════════════════════ */
describe('(4) P1: korostus vain aktiiviselle fyysiselle jaksofokukselle', () => {
  it('fyysinen jaksofokus → "Ohjelmassa nyt: <fokus>"', () => {
    const p = pelaaja({ jaksofokus: { konsepti_avain: 'nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', kesto_vk: 4 } });
    const h = rakenna({ p: p })._vpJfFyysKaistaHTML(p);
    expect(h).toContain('Ohjelmassa nyt:');
    expect(h).toContain('Nopeus');
    expect(h).toContain('kehityksessä');
    expect(h, 'seurantarivi ja korostus yhtä aikaa').not.toContain('seurataan mittauksin');
  });

  it('teknis-taktinen jaksofokus → ei korostusta, vaan "seurataan mittauksin"', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfFyysKaistaHTML(p);
    expect(h, 'korostus näkyy vaikka jakso ei ole fyysinen').not.toContain('Ohjelmassa nyt:');
    expect(h).toContain('seurataan mittauksin');
  });

  it('sama korostus myös raportin mittaruuduissa (ei kahdennusta riville)', () => {
    const stat = pura('function _vpStatTiivisteHTML(p) {');
    expect(stat).toContain('_vpFyysOhjelmassaHTML(p)');
    const p = pelaaja();
    expect(rakenna({ p: p })._vpFyysOhjelmassaHTML(p)).toBe('');
    const q = pelaaja({ jaksofokus: { konsepti_nimi: 'Nopeus', domeeni: 'fyysinen' } });
    expect(rakenna({ p: q })._vpFyysOhjelmassaHTML(q)).toContain('Ohjelmassa nyt:');
  });
});

/* ══ (5) FYYSINEN JAKSOFOKUS ════════════════════════════════════════════════ */
describe('(5) Fyysinen jaksofokus: pelissä näkyvällä kaistalla ei kärkeä', () => {
  const p = pelaaja({ jaksofokus: { konsepti_avain: 'nopeus', konsepti_nimi: 'Nopeus', domeeni: 'fyysinen', kesto_vk: 4 } });
  const h = rakenna({ p: p })._vpJfPelissaKaistaHTML(p);

  it('sanoo suoraan ettei kärkeä ole', () => {
    expect(h).toContain('Ei teknis-taktista kärkeä tässä jaksossa.');
    expect(h, 'fyysinen fokus vuoti pelissä näkyvälle kaistalle').not.toContain('Nopeus');
  });

  it('tarjoaa tien teknis-taktiseen valintaan', () => {
    expect(h).toContain("_vpJfTila('p1','vaihto')");
    expect(h).toContain('＋ Aseta jaksofokus');
  });

  it('tuet näkyvät silti', () => {
    expect(h).toContain('Tukevat taidot');
    expect(h).toContain('Pelin lukeminen');
  });
});

/* ══ (6) MIGRAATIO ══════════════════════════════════════════════════════════ */
describe('(6) Vanha fyysinen tukilinkki', () => {
  const FYYS_TUKI = { key: 'tuki2', rooli: 'tuki', idx: 2, domeeni: 'fyysinen', konsepti_avain: 'nopeus', konsepti_nimi: 'Nopeus' };
  const p = pelaaja();
  const h = rakenna({ p: p, tavoitteet: [PAA].concat(TUET, [FYYS_TUKI]) })._vpJfTuetHTML(p);

  it('ei näy tukilistalla', () => {
    expect(h, 'fyysinen tuki näkyy yhä tukena').not.toContain('Nopeus');
  });

  it('näyttää huomautuksen — tieto ei katoa hiljaa', () => {
    expect(h).toContain('Aiempi fyysinen tavoite näkyy nyt mitatulla kaistalla.');
  });

  it('ilman vanhaa linkkiä ei huomautusta', () => {
    const puhdas = rakenna({ p: p })._vpJfTuetHTML(p);
    expect(puhdas).not.toContain('Aiempi fyysinen tavoite');
    expect(puhdas).toContain('Pelin lukeminen');
  });

  it('ei kaadu eikä kirjoita mitään', () => {
    const api = rakenna({ p: p, tavoitteet: [PAA].concat([FYYS_TUKI]) });
    expect(() => api._vpJfTilanneHTML(p)).not.toThrow();
    expect(api.kutsut, 'renderöinti kirjoitti jotain').toEqual([]);
  });
});

/* ══ (7) §7.22 — PELAAJALLE EI LUKUJA ═══════════════════════════════════════ */
describe('(7) §7.22: mittausluvut eivät ole pelaajan pinnassa', () => {
  it('pelissä näkyvä kaista ei näytä tasolukuja eikä mittausarvoja', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfPelissaKaistaHTML(p);
    expect(h, 'mittausarvo vuoti pelissä näkyvälle kaistalle').not.toContain('4.9');
    expect(h).not.toContain('30 m');
    expect(h).not.toContain('CMJ');
    expect(nakyva(h), 'tasoluku vuoti kaistalle').not.toMatch(/\btaso \d/);
  });

  it('näkyvyysrivi kertoo rajan', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfTilanneHTML(p);
    expect(h).toContain('👁 Pelaaja näkee taidot ja niiden osat. Mittausluvut jäävät valmentajalle.');
  });

  it('tuet ovat käyttäytymislauseita, eivät lukuja', () => {
    const p = pelaaja();
    const h = rakenna({ p: p, tarkenteet: { p1: { tuki0: { kriteeri: 'Nostaa katseen ennen vastaanottoa.' } } } })._vpJfTuetHTML(p);
    expect(h).toContain('Nostaa katseen ennen vastaanottoa.');
    expect(nakyva(h)).not.toMatch(/\d+\/5/);
  });
});

/* ══ (8) EI KAHDENNUSTA RAPORTISSA ══════════════════════════════════════════ */
describe('(8) Raportti: fyysinen on palkissa, ei rivillä', () => {
  it('raportin jaksofokus on read-only-yhteenveto, ei kaistoja', () => {
    const suun = pura('function _vpKehSuunnitelmaHTML(p, opts) {');
    expect(suun).toContain('_vpJfInlineHTML(p)');
    expect(suun).toContain('_vpTyopoytaJaksofokusHTML(p)');
    const ro = pura('function _vpTyopoytaJaksofokusHTML(p) {');
    expect(ro, 'kaista kahdentui raporttiin').not.toContain('_vpJfFyysKaistaHTML');
    expect(ro, 'mittaruudut kahdentuivat raporttiin').not.toContain('_vpFyysMittarit');
    expect(ro).not.toContain('kai-fyys');
  });

  it('kaistat elävät vain cockpitin tilannenäkymässä', () => {
    const tila = pura('function _vpJfTilanneHTML(p) {');
    expect(tila).toContain('_vpJfPelissaKaistaHTML(p)');
    expect(tila).toContain('_vpJfFyysKaistaHTML(p)');
    // _vpJfInlineHTML (ja siten tilannenäkymä) on cockpit-only
    expect(pura('function _vpKehSuunnitelmaHTML(p, opts) {')).toContain('const _inlineEditori = !opts || opts.editori !== false;');
  });
});

/* ══ (9) TERMILUKKO ═════════════════════════════════════════════════════════ */
describe('(9) Sisäiset termit eivät näy käyttäjälle (fi)', () => {
  function kaikki() {
    const osat = [];
    const p = pelaaja();
    osat.push(rakenna({ p: p })._vpJfTilanneHTML(p));
    osat.push(rakenna({ p: p, phvNeutraali: true })._vpJfFyysKaistaHTML(p));
    const q = pelaaja({ jaksofokus: { konsepti_nimi: 'Nopeus', domeeni: 'fyysinen' } });
    osat.push(rakenna({ p: q })._vpJfTilanneHTML(q));
    const r = pelaaja({ hh_viimeisin: {}, hh_taso_edellinen: null });
    osat.push(rakenna({ p: r })._vpJfTilanneHTML(r));
    return nakyva(osat.join(' '));
  }
  const teksti = kaikki();

  const KIELLETYT = [
    ['taitokoodi', /\b[A-Z]-[A-Z]{1,2}\d/],
    ['D-koodi', /\bD[1-5]\b/],
    ['§', /§/],
    ['curriculum', /curriculum/i],
    ['cue', /\bcue\b/i],
    ['konsept', /konsept/i],
    ['fundament', /fundament/i],
    ['pääfokus', /pääfokus/i],
    ['domeeni', /domeeni/i],
    ['ei näy', /\bei näy\b/],
  ];

  it.each(KIELLETYT)('%s ei esiinny', (_nimi, re) => {
    const osuma = teksti.match(re);
    expect(osuma, 'sisäinen termi näkyy käyttäjälle: ' + (osuma && osuma[0])).toBeNull();
  });

  it('EI VACUOUS: render kattaa molemmat kaistat ja kaikki tilat', () => {
    expect(teksti.length).toBeGreaterThan(900);
    expect(teksti).toContain('Pelissä näkyvä');
    expect(teksti).toContain('Ohjelmassa nyt:');
    expect(teksti).toContain('ei mittausta');
    expect(teksti).toContain('Kasvupyrähdys kesken');
  });
});

/* ══ (10) SV + BRÄNDI ═══════════════════════════════════════════════════════ */
describe('(10) sv-käännösportti ja brändi', () => {
  it('kaistojen uudet avaimet ovat Gemini-erässä (ei keksittyä ruotsia)', () => {
    /* Merge odottaa sanktiointia: uusilla avaimilla EI saa olla sv:tä ennen erän paluuta.
       Portti (idp_i18n_v5_vp_render_dom) valvoo listaa; tässä varmistetaan ettei niitä ole
       keksitty karttaan tämän PR:n mukana. */
    ['Pelissä näkyvä', 'Ohjelmassa nyt:', 'Tukevat taidot', 'ei mittausta', '1. mittaus', 'kärki']
      .forEach((fi) => {
        expect(typeof SV[fi], 'sv keksitty sanktioimatta: ' + fi).not.toBe('string');
      });
  });

  it('jo sanktioidut avaimet kääntyvät sv-renderissä', () => {
    const p = pelaaja();
    const sv = rakenna({ p: p, kieli: 'sv' })._vpJfTilanneHTML(p);
    expect(SV['Fyysinen']).toBe('Fysisk');
    expect(sv).toContain('Fysisk');
    expect(sv).toContain('Färdighetens delar i match');
    expect(sv, 'sanktioitu fi jäi kääntymättä').not.toContain('Taidon osat pelissä');
  });

  it('kaistoilla ei tealia eikä amberia', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfTilanneHTML(p);
    expect(h, 'teal vuoti kaistoille').not.toMatch(/--teal|28B090/);
    expect(h, 'amber vuoti kaistoille').not.toMatch(/--amber|E0A040/);
  });

  it('kaistan reuna ja mittaruudut ovat neutraaleja CSS:ssä', () => {
    const i = VP.indexOf('.kai.game {');
    expect(i, 'kaistan CSS puuttuu').toBeGreaterThan(-1);
    expect(VP.slice(i, i + 120)).toContain('var(--ink3)');
    const t = VP.indexOf('.kai-tile .t {');
    expect(VP.slice(t, t + 200)).not.toMatch(/--teal|--amber/);
  });

  it('Cormorant ei koskaan bold', () => {
    const rikkeet = [];
    const re = /style="([^"]*var\(--font-serif\)[^"]*)"/g;
    let m;
    while ((m = re.exec(VP))) { if (/font-weight:\s*(600|700|bold)/.test(m[1])) rikkeet.push(m[1].slice(0, 80)); }
    expect(rikkeet, 'Cormorant lihavoituna: ' + rikkeet.join(' | ')).toEqual([]);
  });
});
