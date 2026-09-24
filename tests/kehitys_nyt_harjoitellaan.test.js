/**
 * TalentMaster™ — "NYT HARJOITELLAAN" -RIVIN TASO 2. Vartija.
 *
 * ⚠ EI TYNKÄÄ `_vpJfInlineHTML`:lle. Juuri se aukko päästi PR #626:ssa läpi kaiken mitä tämä PR
 * korjaa: vartija korvasi editorin merkkijonolla 'INLINE-EDITORI', joten sen sisällä elivät
 * rauhassa koodit (Y-H3, D2, §37), sisäiset sanat ja kaksi tallennuspainiketta. Tämä tiedosto
 * renderöi AIDON funktion aidoilla libeillä (tm_jaksofokus, taitokirjasto, _ttKys/_ttHarj).
 *
 * Mockup: `Claude outputs/KEHITYS_NYT_HARJOITELLAAN_MOCKUP.html` (kehykset 1, 3, 4)
 * sv: `GEMINI_ERA_NYT_HARJOITELLAAN_SV.json` (29 sanktioitua) + `..._SV_LISA.json` (8 odottaa)
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

/** Funktion runko lähteestä (sulkulaskenta). */
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

/* AIDOT funktiot. Taidon valinnan koko ketju on mukana (_vpTtKorttiHTML → _vpJfTaitoListaHTML),
   jotta kehyksen 3 tekstit ovat oikeasti valvonnassa. */
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
  'function _vpJfTaitoListaHTML(p, aktItems, valittu, ehdKons, ehd, nakyma) {',
  'function _vpTtNimiNaytto(item) {',
  'function _vpTtKorttiHTML(p) {',
  'function _vpJfToggleHTML(p) {',
  /* Fyysinen ja henkinen/sosiaalinen runko AIDOIKSI: ilman naita ryhma 7 ajoi termilukon
     tyngalla ('') eli ei mitannut muita osa-alueita lainkaan — juuri se aukko joka jatti
     'Cue', 'konsepti' ja D3/D5 elamaan naihin nakymiin. */
  'function _vpJfFyysHTML(p) {',
  'function _vpJfKehitysHTML(p, domeeni) {',
  'function _vpJfBodyHTML(p) {',
  'function _vpJfVaihtoHTML(p) {',
  'function _vpJfTallennaOnclick(p) {',
  'function _vpJfNapitHTML(p, onclick) {',
  'function _vpJfTavoitteetMuokkaaHTML(p) {',
  'function _vpJfLinkitHTML(p) {',
  'function _vpJfInlineSisaltoHTML(p) {',
  'function _vpJfInlineHTML(p) {',
  'window._vpJfTila = function (pid, tila) {',
  'function _vpJfInlineReRender(p) {',
  'window._vpJfOsaAvaa = function (pid, koodi) {',
  'window._vpJfHarjToggle = function (pid) {',
  'window._vpJfNaytaKaikki = function (pid, mita) {',
  'window._vpJfKestoAseta = function (pid, vk) {',
  'window._vpJfMittausLisaa = function (pid, key) {',
];
const PALAUTA = ['_vpJfInlineHTML', '_vpJfInlineSisaltoHTML', '_vpJfTilanneHTML', '_vpJfVaihtoHTML',
  '_vpJfTavoitteetMuokkaaHTML', '_vpJfOsatHTML', '_vpJfHarjoituksessaHTML', '_vpJfTavoitteetLukuHTML',
  '_vpJfAktItem', '_vpJfOsaJako', '_vpJfTallennaOnclick', '_vpTtKorttiHTML',
  '_vpJfPelissaKaistaHTML', '_vpJfFyysKaistaHTML', '_vpJfTuetHTML', '_vpFyysMittarit'];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Näkyvä teksti: tagit ja attribuutit pois. Termilukko koskee sitä mitä käyttäjä LUKEE. */
function nakyva(h) {
  return String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/* ── Taitokirjasto: fikstuurin taito 5 osalla + 2 harjoitetta + 4 kysymystä ──────────────────── */
const TAITO = {
  avain: 'y_h2', koodi: 'Y-H2', nimi: 'Tempokuljetus', ryhma: 'hyokkays', faasi: 'hyokkays',
  pelitilanne: 'Vastustaja lähestyy, tila aukeaa sivulle.',
  pelimuoto: ['5v5', '8v8'],
  kpi: [
    { koodi: 'a', teksti: 'Sido pallon etäisyys tilanteeseen: lähelle kun puolustaja on lähellä' },
    { koodi: 'b', teksti: 'Valitse syöttö tai kuljetus tilanteesta: tila kiinni → syötä' },
    { koodi: 'c', teksti: 'Pidä pää ylhäällä kuljettaessasi: tieto ratkaisee reitin' },
    { koodi: 'd', teksti: 'Vaihda suuntaa ja rytmiä: ennustettava kuljettaja on helppo riistettävä' },
    { koodi: 'e', teksti: 'Suojaa kuljetus kauemmalla jalalla' },
  ],
};
const TAITO_2 = { avain: 'y_h1', koodi: 'Y-H1', nimi: 'Syöttäminen', kpi: [{ koodi: 'a', teksti: 'Ajoitus' }] };
const TAITO_3 = { avain: 'y_h5', koodi: 'Y-H5', nimi: 'Vastaanotto ja ensimmäinen kosketus', kpi: [] };
const MUUT = [4, 5, 6, 7, 8].map((n) => ({ avain: 'y_x' + n, koodi: 'Y-X' + n, nimi: 'Muu taito ' + n, kpi: [] }));
const KAIKKI_TAIDOT = [TAITO, TAITO_2, TAITO_3].concat(MUUT);

const KYSYMYKSET = ['Milloin kannattaa kuljettaa ja milloin syöttää?', 'Ketä kuljetuksesi sitoo?',
  'Miksi pidit pallon lähellä?', 'Mitä näit ennen kosketusta?'];
const HARJOITTEET = [{ painopisteet: 'Porttikuljetuspeli: portista kuljetus 1 p.' },
  { painopisteet: 'Kaksi porttia, vapauttava syöttö 2 p.' }];

/** Ajokelpoinen ympäristö. kieli='sv' käyttää AITOA sv-karttaa (fi-vuodon havaitseminen). */
function rakenna(lisa) {
  const o = lisa || {};
  const kutsut = [];
  const win = {
    TM_JAKSOFOKUS: JF,
    _vpJfDomeeni: { p1: o.domeeni || 'teknis_taktinen' },
    _vpJfOsaArviot: o.osaArviot || {},
    _vpJfOsaAuki: o.osaAuki || {},
    _vpJfHarjAuki: o.harjAuki || {},
    _vpJfKaikki: o.kaikki || {},
    _vpJfKestoValinta: o.kestoValinta || {},
    _vpJfFyysTeema: {},
    _vpJfTarkenteet: o.tarkenteet || {},
    _vpJfLinkit: o.linkit || {},
    _vpJfMittausAuki: o.mittausAuki || {},
    _vpTtNakyma: { p1: o.nakyma || 'yksilo' },
    _vpArvPelaaja: o.p || null,
    _tmIBtn: () => '',
    /* Henkisen/sosiaalisen taitokirjasto tulee AIDOSTA libista (JF.tmJfKonseptit); fyysinen lukee
       oman teemalibinsa window:sta. Tynka piilottaisi juuri ne tekstit joita ryhmä 7 valvoo. */
    TM_FYYSTEEMAT_LIB: {
      TM_FYYSTEEMAT: [{ avain: 'nopeus', ikoni: '⚡', nimi: 'Nopeus' }],
      TM_OHJELMA_TEMPLAATIT: { perus: { nimi: 'Perusohjelma', kesto_vk: 4, kuvaus: 'x' } },
    },
  };
  const store = {
    window: win,
    _jsvEsc: esc,
    vpT: (s) => (o.kieli === 'sv' ? (SV[s] != null ? SV[s] : s) : s),
    tmNykyinenKieli: () => o.kieli || 'fi',
    _vpJfOsaArvioSet: (pid, avain, koodi, n) => { kutsut.push(['_vpJfOsaArvioSet', pid, avain, koodi, n]); },
    _vpTtVieTreeniin: (pid, avain) => { kutsut.push(['_vpTtVieTreeniin', pid, avain]); },
    _vpTtPelaaja: () => o.p || null,
    _jfOhjausAlusta: () => o.p || null,   // alustus on testattu muualla; tassa se vain palauttaa pelaajan
    _vpTtValinta: o.valinta || {},
    _vpTtNormPositio: (x) => x || null,
    _ttPpNimi: (k) => 'Keskikenttä (' + k + ')',
    _dimIkaSp: () => ({ ika: 13, sp: 'M' }),
    _ttItems: () => (o.items || KAIKKI_TAIDOT),
    _ttKys: () => (o.kys != null ? o.kys : KYSYMYKSET),
    _ttHarj: () => (o.harj != null ? o.harj : HARJOITTEET),
    _vpTtEhdotus: () => (o.ehd === null ? null : (o.ehd || { tyyppi: 'teknis_taktinen', konsepti_avain: 'y_h1', konsepti_nimi: 'Syöttäminen', alt_konsepti: 'y_h5' })),
    _vpKonseptiNimiNaytto: (jf) => (jf && jf.konsepti_nimi) || '',
    _vpJfTavoiteLista: () => (o.tavoitteet != null ? o.tavoitteet : [
      { key: 'paa', rooli: 'paa', domeeni: 'teknis_taktinen', konsepti_avain: 'y_h2', konsepti_nimi: 'Tempokuljetus' },
      { key: 'tuki0', rooli: 'tuki', idx: 0, domeeni: 'psyykkinen', konsepti_avain: 'pelin_lukeminen', konsepti_nimi: 'Pelin lukeminen' },
    ]),
    _vpJfMittausOletus: () => 'arviointi',
    _vpJfNykyarvo: () => ({ arvo: 3, max: 5 }),
    eerikkilaTaso: () => 4,
    _fmtTestiArvo: (v) => v,
    onNeutraaliPrePHV: () => false,
    tmKehys: () => null,
    tmTtItems: () => (o.items || KAIKKI_TAIDOT),
    tmTtVaihe: () => 'pelipaikka',
    TM_TT_PELIPAIKAT: { CM: {}, CB: {} },
    _vpFyysEhdotus: () => null,
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

/** Pelaaja: aktiivinen teknis-taktinen jakso, 5 osaa arvoilla 3,3,2,1 ja arvioimaton. */
function pelaaja(yli) {
  return Object.assign({
    id: 'p1', joukkue: 'SJK P13', syntymaVuosi: 2013,
    jaksofokus: {
      konsepti_avain: 'y_h2', konsepti_nimi: 'Tempokuljetus', konsepti_koodi: 'Y-H2',
      domeeni: 'teknis_taktinen', alkoi: '2026-09-01', kesto_vk: 4,
      osa_arviot: { y_h2: { a: 3, b: 3, c: 2, d: 1 } },   // e = arvioimaton
    },
    /* Kauden tavoite EI tue valittua taitoa (poikkeama): ehdotus on y_h1, valittu y_h2. */
    idp_fokus: { nimi: 'Syötön piilotus', alue: 'hide_pass', dim: 'D2' },
    jaksofokus_historia: [],
  }, yli || {});
}

/* ══ (1) TILANNE ON LUKUTILA ════════════════════════════════════════════════ */
describe('(1) Tilanne on lukutila', () => {
  const p = pelaaja();
  const h = rakenna({ p: p })._vpJfInlineHTML(p);

  it('ei select-, textarea- eikä input-elementtejä', () => {
    expect(h, 'lomakekenttä vuoti tilannenäkymään').not.toMatch(/<select/i);
    expect(h, 'lomakekenttä vuoti tilannenäkymään').not.toMatch(/<textarea/i);
    expect(h, 'lomakekenttä vuoti tilannenäkymään').not.toMatch(/<input/i);
  });

  it('tallennuspainikkeita 0 (osan valinta tallentaa heti)', () => {
    expect(h).not.toContain('jf-btn p');
    expect(h).not.toContain('Tallenna');
    expect(h).not.toContain('＋ Tallenna jaksofokus');
  });

  it('EI VACUOUS: tilanne renderöityi', () => {
    expect(h).toContain('_jfInlineEditor');
    /* Taidon osat elävät nyt "Pelissä näkyvä" -kaistan sisällä (kaksi kaistaa -malli). */
    expect(h).toContain('Pelissä näkyvä');
    expect(h).toContain('Taidon osat pelissä');
    expect(h).toContain('Tempokuljetus');
  });
});

/* ══ (2) TAIDON OSAT ════════════════════════════════════════════════════════ */
describe('(2) Taidon osat pelissä', () => {
  it('otsikossa 2/5 itsenäisesti', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfOsatHTML(p, TAITO);
    expect(h).toContain('2/5 itsenäisesti');
  });

  it('nimi ja selitys jaetaan kaksoispisteestä; ilman kaksoispistettä ei selitystä', () => {
    const api = rakenna({ p: pelaaja() });
    expect(api._vpJfOsaJako('Pidä pää ylhäällä: tieto ratkaisee')).toEqual({ nimi: 'Pidä pää ylhäällä', selitys: 'tieto ratkaisee' });
    expect(api._vpJfOsaJako('Suojaa kuljetus')).toEqual({ nimi: 'Suojaa kuljetus', selitys: '' });
    // selitys näkyy vain avatulla osalla, ja koodi ei koskaan
    const p = pelaaja();
    const auki = rakenna({ p: p, osaAuki: { p1: 'c' } })._vpJfOsatHTML(p, TAITO);
    expect(auki, 'avatun osan selitys puuttuu').toContain('tieto ratkaisee reitin');
    /* Selitys on VAIN avatulla osalla: rivillä se tekisi listasta tekstimassan, jota ei voi
       silmäillä. Suljetuilla osilla näkyy pelkkä nimi. */
    expect(auki, 'suljetun osan selitys näkyy rivillä').not.toContain('lähelle kun puolustaja on lähellä');
    const kiinni = rakenna({ p: p })._vpJfOsatHTML(p, TAITO);
    expect(kiinni, 'selitys näkyy vaikka yksikään osa ei ole auki').not.toContain('tieto ratkaisee reitin');
    expect(kiinni).toContain('Pidä pää ylhäällä kuljettaessasi');
    expect(nakyva(auki), 'sisäinen koodi näkyy käyttäjälle').not.toMatch(/(^| )[a-e]( |$)/);
  });

  it('"Seuraavaksi" osuu arvon 1 osaan', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfOsatHTML(p, TAITO);
    const i = h.indexOf('Seuraavaksi');
    expect(i, 'Seuraavaksi-merkki puuttuu').toBeGreaterThan(-1);
    // merkki on sen osan nimen yläpuolella jonka arvo on 1 (d = "Vaihda suuntaa ja rytmiä")
    expect(h.slice(i, i + 220)).toContain('Vaihda suuntaa ja rytmiä');
  });

  it('ei arvon 1 osaa → ei merkkiä', () => {
    const p = pelaaja();
    p.jaksofokus.osa_arviot.y_h2 = { a: 3, b: 3, c: 2 };
    expect(rakenna({ p: p })._vpJfOsatHTML(p, TAITO)).not.toContain('Seuraavaksi');
  });

  it('arvioimaton osa näyttää "arvioi"', () => {
    const p = pelaaja();
    expect(rakenna({ p: p })._vpJfOsatHTML(p, TAITO)).toContain('arvioi');
  });

  it('valinta kutsuu _vpJfOsaArvioSet oikeilla argumenteilla', () => {
    const p = pelaaja();
    const api = rakenna({ p: p, osaAuki: { p1: 'c' } });
    const h = api._vpJfOsatHTML(p, TAITO);
    expect(h).toContain("_vpJfOsaArvioSet('p1','y_h2','c',1)");
    expect(h).toContain("_vpJfOsaArvioSet('p1','y_h2','c',2)");
    expect(h).toContain("_vpJfOsaArvioSet('p1','y_h2','c',3)");
  });

  it('palkki: 3 = täysi, 2 = puolikas, 1 ja arvioimaton = tyhjä', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfOsatHTML(p, TAITO);
    const meter = h.slice(h.indexOf('jf-meter'), h.indexOf('</div>', h.indexOf('jf-meter')));
    expect((meter.match(/class="f"/g) || []).length, 'täysiä').toBe(2);
    expect((meter.match(/class="h"/g) || []).length, 'puolikkaita').toBe(1);
    expect((meter.match(/<i class=""/g) || []).length, 'tyhjiä').toBe(2);
  });

  it('osia ei ole → lohkoa ei näytetä (muut osa-alueet)', () => {
    const p = pelaaja();
    expect(rakenna({ p: p })._vpJfOsatHTML(p, TAITO_3)).toBe('');
    expect(rakenna({ p: p })._vpJfOsatHTML(p, null)).toBe('');
  });
});

/* ══ (3) HARJOITUKSESSA ═════════════════════════════════════════════════════ */
describe('(3) Harjoituksessa', () => {
  it('tiivistelmä: monikko', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfHarjoituksessaHTML(p, TAITO);
    expect(h).toContain('2 harjoitetta');
    expect(h).toContain('4 kysymystä');
  });

  it('tiivistelmä: yksikkö', () => {
    const p = pelaaja();
    const h = rakenna({ p: p, harj: [HARJOITTEET[0]], kys: [KYSYMYKSET[0]] })._vpJfHarjoituksessaHTML(p, TAITO);
    expect(h).toContain('1 harjoite');
    expect(h).toContain('1 kysymys');
    expect(h).not.toContain('harjoitetta');
    expect(h).not.toContain('kysymystä');
  });

  it('kiinni oletuksena: sisältö ei ole DOM:ssa', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfHarjoituksessaHTML(p, TAITO);
    expect(h).not.toContain('Porttikuljetuspeli');
    expect(h).not.toContain('Kysy pelaajalta');
  });

  it('auki: enintään 1 harjoite ja 3 kysymystä + "Näytä kaikki (n)"', () => {
    const p = pelaaja();
    const h = rakenna({ p: p, harjAuki: { p1: true } })._vpJfHarjoituksessaHTML(p, TAITO);
    expect(h).toContain('Porttikuljetuspeli');
    expect(h, 'toinen harjoite näkyi ilman avausta').not.toContain('Kaksi porttia');
    expect(h).toContain('Näytä kaikki (2)');
    expect((h.match(/class="jf-q"/g) || []).length, 'kysymyksiä').toBe(3);
    expect(h).toContain('Näytä kaikki (4)');
    expect(h).toContain('Vastustaja lähestyy');   // pelitilanne
  });

  it('"Näytä kaikki" avaa loput', () => {
    const p = pelaaja();
    const h = rakenna({ p: p, harjAuki: { p1: true }, kaikki: { p1: { harj: true, kys: true } } })._vpJfHarjoituksessaHTML(p, TAITO);
    expect(h).toContain('Kaksi porttia');
    expect((h.match(/class="jf-q"/g) || []).length).toBe(4);
    expect(h).not.toContain('Näytä kaikki');
  });

  it('ei dataa → ei lohkoa', () => {
    const p = pelaaja();
    expect(rakenna({ p: p, harj: [], kys: [] })._vpJfHarjoituksessaHTML(p, TAITO)).toBe('');
  });
});

/* ══ (4) JAKSON TAVOITTEET (lukutila) ═══════════════════════════════════════ */
/* Tuet renderöi nyt _vpJfTuetHTML "Pelissä näkyvä" -kaistan sisällä: sama data ja sama
   lukutilasääntö (ei kenttiä), mutta ulottuvuustunnisteella ja ilman fyysistä (joka on omalla
   mitatulla kaistallaan). _vpJfTavoitteetLukuHTML näyttää enää vain asetetut mittarit. */
describe('(4) Jakson tavoitteet lukutilassa', () => {
  it('opittu kun -teksti näkyy tekstinä, ei kenttänä', () => {
    const p = pelaaja();
    const h = rakenna({ p: p, tarkenteet: { p1: { tuki0: { kriteeri: 'Nostaa katseen ennen vastaanottoa.' } } } })._vpJfTuetHTML(p);
    expect(h).toContain('Nostaa katseen ennen vastaanottoa.');
    expect(h, 'lukutilassa ei saa olla kenttää').not.toMatch(/<textarea|<input/i);
  });

  it('tyhjä → "Milloin taito on opittu?" + Kirjaa', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfTuetHTML(p);
    expect(h).toContain('Milloin taito on opittu?');
    expect(h).toContain('Kirjaa');
    expect(h).toContain("_vpJfTila('p1','tavoitteet')");
  });

  it('tuki näyttää ulottuvuustunnisteen (ei roolisanaa)', () => {
    /* Kaistamallissa rooli näkyy sijainnista: kärki on kaistan kärjessä, tuet "Tukevat taidot"
       -otsikon alla. Tunniste kertoo sen sijaan ULOTTUVUUDEN, jota lukija ei muuten tiedä. */
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfTuetHTML(p);
    expect(h).toContain('Tukevat taidot');
    expect(h).toContain('Henkinen');
    expect(h).toContain('Pelin lukeminen');
  });

  it('mittari näkyy vain asetettuna', () => {
    const p = pelaaja();
    expect(rakenna({ p: p })._vpJfTavoitteetLukuHTML(p)).not.toContain('Mittari:');
    const h = rakenna({ p: p, tarkenteet: { p1: { tuki0: { mittaus_tyyppi: 'arviointi', tavoite_taso: 5 } } } })._vpJfTavoitteetLukuHTML(p);
    expect(h).toContain('Mittari:');
    expect(h).toContain('3/5 → 5/5');
  });

  it('ei tavoitteita → ei lohkoa', () => {
    const p = pelaaja();
    expect(rakenna({ p: p, tavoitteet: [] })._vpJfTuetHTML(p)).toBe('');
    expect(rakenna({ p: p, tavoitteet: [] })._vpJfTavoitteetLukuHTML(p)).toBe('');
  });
});

/* ══ (5) TILASIIRTYMÄT ══════════════════════════════════════════════════════ */
describe('(5) Tilasiirtymät', () => {
  it('alalinkit asettavat vaihto / tavoitteet', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpJfTilanneHTML(p);
    expect(h).toContain("_vpJfTila('p1','vaihto')");
    expect(h).toContain("_vpJfTila('p1','tavoitteet')");
    expect(h).toContain("_vpSuljeJakso('p1')");
  });

  it('tila ohjaa sisällön', () => {
    const p = pelaaja();
    const api = rakenna({ p: p });
    expect(api._vpJfInlineSisaltoHTML(p)).toContain('Pelissä näkyvä');
    p._jfTila = 'vaihto';
    expect(api._vpJfInlineSisaltoHTML(p)).toContain('Osa-alue');
    p._jfTila = 'tavoitteet';
    expect(api._vpJfInlineSisaltoHTML(p)).toContain('Milloin taito on opittu?');
  });

  it('Peruuta palauttaa tilanteeseen (tila → null)', () => {
    const p = pelaaja({ _jfTila: 'vaihto' });
    const h = rakenna({ p: p })._vpJfVaihtoHTML(p);
    expect(h).toContain("_vpJfTila('p1',null)");
    const setter = pura('window._vpJfTila = function (pid, tila) {');
    expect(setter).toContain('p._jfTila = tila || null;');
  });

  it('onnistunut Tallenna nollaa tilan', () => {
    expect(pura('window._vpTtVieTreeniin = async function (pid, avain) {')).toContain('p._jfTila = null;');
    expect(pura('window._vpJfAsetaKehitysFokus = async function (pid, domeeni, avain) {')).toContain('p._jfTila = null;');
    expect(pura('window._vpJfTavoitteetTallenna = async function (pid) {')).toContain('p._jfTila = null;');
  });

  it('cockpitin avaus nollaa tilan', () => {
    expect(VP).toContain("p._jfTila = null;   // rivi avautuu aina tilanteeseen");
  });

  it('_jfOhjaa → vaihtotila', () => {
    const T = pura('window._jfOhjaa = function (pid, esiValinta, lahde, domeeni) {');
    expect(T).toContain("p._jfTila = 'vaihto';");
    expect(T).toContain('_vpJfInlineReRender(p)');
  });

  it('tyhjä jaksofokus → vaihtonäkymä suoraan', () => {
    const p = pelaaja({ jaksofokus: null });
    const h = rakenna({ p: p })._vpJfInlineSisaltoHTML(p);
    expect(h).toContain('Osa-alue');
    expect(h, 'tyhjässä tilassa ei ole mitä tilannetta näyttää').not.toContain('Taidon osat pelissä');
    // tyhjässä tilassa ei ole vanhaa jaksoa → ei siirtymähuomautusta
    expect(h).not.toContain('Nykyinen jakso siirtyy');
  });
});

/* ══ (6) VAIHTONÄKYMÄ ═══════════════════════════════════════════════════════ */
describe('(6) Vaihda harjoiteltava taito', () => {
  const p = () => pelaaja({ _jfTila: 'vaihto' });

  it('taito on LISTA, ei select', () => {
    const pl = p();
    const h = rakenna({ p: pl, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(pl);
    /* Rakenne pinnataan tagitasolla: pelkka luokkanimen greppaus lapaisi mutaation
       <div class="jf-opts"> → <select class="jf-opts"> (luokka sailyi, elementti vaihtui). */
    expect(h).toContain('<div class="jf-opts">');
    expect(h).toContain('<button type="button" class="jf-opt');
    const iOpts = h.indexOf('<div class="jf-opts">');
    const taitoOsa = h.slice(h.lastIndexOf('jf-fld', iOpts), h.indexOf('</div>', h.indexOf('jf-opt-more') > -1 ? h.indexOf('jf-opt-more') : iOpts));
    expect(taitoOsa, 'taidon valinta on yhä select').not.toMatch(/<select/i);
  });

  it('ehdotettu ryhmä ensin, sitten muut', () => {
    const pl = p();
    const h = rakenna({ p: pl, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(pl);
    const iEhd = h.indexOf('Tukee kauden tavoitetta');
    const iMuut = h.indexOf('Muut perustaidot');
    expect(iEhd).toBeGreaterThan(-1);
    expect(iMuut).toBeGreaterThan(-1);
    expect(iEhd, 'ehdotettu ryhmä ei ole ensin').toBeLessThan(iMuut);
    expect(h).toContain('Syötön piilotus');           // tavoitteen nimi ryhmäotsikossa
    expect(h.slice(iEhd, iMuut)).toContain('Syöttäminen');   // ehdotus
    expect(h.slice(iEhd, iMuut)).toContain('Vastaanotto');   // alt_konsepti
  });

  it('muita näytetään 5 + "Näytä kaikki (n)"', () => {
    const pl = p();
    const h = rakenna({ p: pl, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(pl);
    expect(h).toMatch(/Näytä kaikki \(\d+\)/);
    expect(h).toContain('Muu taito 4');
    expect(h, 'katkaisu ei rajaa listaa').not.toContain('Muu taito 8');
  });

  it('poikkeamahuomautus näkyy ei-ehdotetulle', () => {
    const pl = p();
    const h = rakenna({ p: pl, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(pl);
    expect(h).toContain('ei ole kauden tavoitteen taito.');
    expect(h).toContain('Valinta tallentuu, ja se näkyy jakson historiassa.');
    expect(h, 'huomautus on amber-varoitus').not.toMatch(/--amber|E0A040/);
  });

  it('poikkeamahuomautus EI näy ehdotetulle', () => {
    const pl = p();
    const h = rakenna({ p: pl, valinta: { p1: 'y_h1' } })._vpJfVaihtoHTML(pl);
    expect(h).not.toContain('ei ole kauden tavoitteen taito.');
  });

  it('yksi teal-painike', () => {
    const pl = p();
    const h = rakenna({ p: pl, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(pl);
    expect((h.match(/jf-btn p"/g) || []).length, 'pääpainikkeita').toBe(1);
    expect(h).toContain('Tallenna');
    expect(h).toContain('Peruuta');
  });

  it('kesto luetaan painikkeista tallennukseen', () => {
    const pl = p();
    const api = rakenna({ p: pl, valinta: { p1: 'y_h2' }, kestoValinta: { p1: 8 } });
    const h = api._vpJfVaihtoHTML(pl);
    expect(h).toContain("_vpJfKestoAseta('p1',8)");
    expect(h).toMatch(/class="on"[^>]*onclick="[^"]*_vpJfKestoAseta\('p1',8\)/);
    expect(api._vpJfTallennaOnclick(pl)).toBe("_vpTtVieTreeniin('p1','y_h2')");
    // writer lukee saman valinnan (ei #_vpTtKesto-selectiä)
    const w = pura('window._vpTtVieTreeniin = async function (pid, avain) {');
    expect(w).toContain('_vpJfKestoNyt(p)');
    expect(w).not.toContain("getElementById('_vpTtKesto'");
  });

  it('vanha jakso → siirtymähuomautus ennen painikkeita', () => {
    const pl = p();
    const h = rakenna({ p: pl, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(pl);
    const iNote = h.indexOf('Nykyinen jakso siirtyy Aiempiin jaksoihin.');
    expect(iNote).toBeGreaterThan(-1);
    expect(iNote).toBeLessThan(h.indexOf('jf-btns'));
  });
});

/* ══ (7) TERMILUKKO (fi) ════════════════════════════════════════════════════ */
describe('(7) Sisäiset termit eivät näy käyttäjälle (fi)', () => {
  /* Koko taso 2: tilanne + vaihtonäkymä kaikilla neljällä osa-alueella ja kummallakin
     Perustaito/Pelipaikan taito -näkymällä + tavoitteiden muokkaus. */
  function kaikkiRenderit() {
    const osat = [];
    const pl = pelaaja();
    osat.push(rakenna({ p: pl, osaAuki: { p1: 'c' }, harjAuki: { p1: true } })._vpJfTilanneHTML(pl));
    ['teknis_taktinen', 'fyysinen', 'psyykkinen', 'sosiaalinen'].forEach((dom) => {
      ['yksilo', 'pelipaikka'].forEach((nak) => {
        const q = pelaaja({ _jfTila: 'vaihto' });
        osat.push(rakenna({ p: q, domeeni: dom, nakyma: nak, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(q));
      });
    });
    const t2 = pelaaja({ _jfTila: 'tavoitteet' });
    osat.push(rakenna({ p: t2, mittausAuki: { p1: { paa: true } } })._vpJfTavoitteetMuokkaaHTML(t2));
    return nakyva(osat.join(' '));
  }
  const teksti = kaikkiRenderit();

  const KIELLETYT = [
    ['taitokoodi', /\b[A-Z]-[A-Z]{1,2}\d/],
    ['D-koodi', /\bD[1-5]\b/],
    ['§', /§/],
    ['curriculum', /curriculum/i],
    ['cue', /\bcue\b/i],
    ['konsept', /konsept/i],
    ['fundament', /fundament/i],
    ['pääfokus', /pääfokus/i],
    ['ei näy', /\bei näy\b/],
    ['Asiantuntijan valinta', /Asiantuntijan valinta/],
    ['(max', /\(max/],
  ];

  it.each(KIELLETYT)('%s ei esiinny', (_nimi, re) => {
    const osuma = teksti.match(re);
    expect(osuma, 'sisäinen termi näkyy käyttäjälle: ' + (osuma && osuma[0])).toBeNull();
  });

  it('EI VACUOUS: render on iso ja sisältää odotettua sisältöä', () => {
    expect(teksti.length).toBeGreaterThan(1500);
    expect(teksti).toContain('Pelissä näkyvä');
    expect(teksti).toContain('Taidon osat pelissä');
    expect(teksti).toContain('Osa-alue');
    expect(teksti).toContain('Milloin taito on opittu?');
  });

  it('EI VACUOUS: jokainen neljä osa-aluetta renderöi omaa sisältöään', () => {
    /* Ilman tätä väitettä termilukko voisi olla vihreä siksi, että runko palautti tyhjän:
       juuri niin kävi ennen kuin _vpJfFyysHTML ja _vpJfKehitysHTML otettiin aidoiksi. */
    const odota = {
      teknis_taktinen: 'Taito',
      fyysinen: 'Nopeus',
      psyykkinen: 'Harjoiteltava taito',
      sosiaalinen: 'Harjoiteltava taito',
    };
    Object.keys(odota).forEach((dom) => {
      const q = pelaaja({ _jfTila: 'vaihto' });
      const h = rakenna({ p: q, domeeni: dom, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(q);
      expect(h.length, dom + ': runko renderöi tyhjää').toBeGreaterThan(400);
      expect(h, dom + ': odotettu sisältö puuttuu').toContain(odota[dom]);
    });
  });
});

/* ══ (8) SV — KÄÄNNÖSPORTTI ═════════════════════════════════════════════════ */
describe('(8) sv: uudet avaimet kääntyvät', () => {
  const p = pelaaja();
  const sv = rakenna({ p: p, kieli: 'sv', osaAuki: { p1: 'c' }, harjAuki: { p1: true } })._vpJfTilanneHTML(p);

  it('LBL-sanat ovat ruotsiksi (vanha raaka fi-taulukko korjattu)', () => {
    expect(SV['itsenäisesti']).toBe('självständigt');
    expect(SV['ohjatusti']).toBe('med vägledning');
    expect(SV['ei vielä']).toBe('inte ännu');
    expect(sv).toContain('självständigt');
    expect(sv).toContain('med vägledning');
    expect(sv, 'osat eivät renderöityneet kaistan sisällä').toContain('Färdighetens delar i match');
  });

  it('uudet riviotsikot ja linkit ruotsiksi', () => {
    ['Harjoituksessa', 'Jakson tavoitteet', 'pääasia', 'tukee', 'Milloin taito on opittu?',
      'Vaihda harjoiteltava taito…', 'Muokkaa jakson tavoitteita', 'Päätä jakso', 'Seuraavaksi',
      '👁 Pelaaja näkee taidon ja sen osat.'].forEach((fi) => {
      expect(SV[fi], 'sanktioitu sv-rivi puuttuu: ' + fi).toBeTruthy();
      expect(sv, 'fi vuotaa sv-tilassa: ' + fi).not.toContain(fi);
    });
  });

  it('EI VACUOUS: sv-render ei ole identtinen fi:n kanssa', () => {
    const fi = rakenna({ p: p, osaAuki: { p1: 'c' }, harjAuki: { p1: true } })._vpJfTilanneHTML(p);
    expect(sv).not.toBe(fi);
    expect(sv.length).toBeGreaterThan(800);
  });
});

/* ══ (9) BRÄNDI ═════════════════════════════════════════════════════════════ */
describe('(9) Teal vain Tallenna-painikkeessa · ei amberia · kosketusalueet', () => {
  it('tilannenäkymässä ei tealia eikä amberia', () => {
    const p = pelaaja();
    const h = rakenna({ p: p, osaAuki: { p1: 'c' }, harjAuki: { p1: true } })._vpJfTilanneHTML(p);
    expect(h, 'teal vuoti tilannenäkymään').not.toMatch(/--teal|28B090/);
    expect(h, 'amber vuoti tilannenäkymään').not.toMatch(/--amber|E0A040/);
  });

  it('vaihtonäkymässä teal vain pääpainikkeessa', () => {
    const p = pelaaja({ _jfTila: 'vaihto' });
    const h = rakenna({ p: p, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(p);
    const tealit = (h.match(/--teal|28B090/g) || []).length;
    expect(tealit, 'teal esiintyy muualla kuin pääpainikkeen luokassa').toBe(0);
    expect(h).toContain('jf-btn p');   // teal tulee CSS-luokasta, ei inline-tyylistä
    expect(h, 'amber vuoti vaihtonäkymään').not.toMatch(/--amber|E0A040/);
  });

  it('pisterata ja pisteet käyttävät neutraaleja --fill-tokeneita', () => {
    const css = VP.slice(VP.indexOf('.jf-meter i {'), VP.indexOf('.jf-meter i {') + 300);
    expect(css).toContain('--fill-none');
    expect(VP).toContain('.jf-meter i.f { background: var(--fill-full); }');
    expect(VP).toContain('.jf-pips i.f { background: var(--fill-full); border-color: var(--fill-full); }');
  });

  it('kosketusalueet >= 44 px (osarivi, valitsin, listarivi, painike)', () => {
    [' .jf-part-r ', '.jf-seg button ', '.jf-opt ', '.jf-btn ', '.jf-fold '].forEach((sel) => {
      const i = VP.indexOf(sel.trim() + ' {');
      expect(i, 'CSS-sääntö puuttuu: ' + sel).toBeGreaterThan(-1);
      expect(VP.slice(i, i + 400), sel + ' ilman 44 px kosketusaluetta').toMatch(/min-height: 44px/);
    });
  });

  it('Cormorant ei koskaan bold', () => {
    const rikkeet = [];
    const re = /style="([^"]*var\(--font-serif\)[^"]*)"/g;
    let m;
    while ((m = re.exec(VP))) { if (/font-weight:\s*(600|700|bold)/.test(m[1])) rikkeet.push(m[1].slice(0, 80)); }
    expect(rikkeet, 'Cormorant lihavoituna: ' + rikkeet.join(' | ')).toEqual([]);
  });
});

/* ══ (10) VANHA EDITORI EI VUODA ════════════════════════════════════════════ */
describe('(10) Vanha editori ei vuoda', () => {
  it('"＋ Tallenna jaksofokus" ei näy tilannenäkymässä', () => {
    const p = pelaaja();
    expect(rakenna({ p: p })._vpJfTilanneHTML(p)).not.toContain('Tallenna jaksofokus');
  });

  it('#_vpTtKesto-select ei ole DOM:ssa', () => {
    const p = pelaaja({ _jfTila: 'vaihto' });
    const h = rakenna({ p: p, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(p);
    expect(h).not.toContain('_vpTtKesto');
    expect(VP, 'kesto-select jäi lähteeseen').not.toContain("id=\"_vpTtKesto'");
  });

  it('🪜-polkurivi puuttuu', () => {
    expect(VP).not.toContain('🪜');
  });

  it('poistettu renderöijä ei ole palannut', () => {
    expect(VP, 'kuollut funktio jäi lähteeseen').not.toContain('function _vpTtOsaArviotHTML(');
    // korvaaja on olemassa ja se ohjaa sanat vpT():n läpi
    const uusi = pura('function _vpJfOsatHTML(p, item) {');
    expect(uusi).toContain("vpT('itsenäisesti')");
    expect(uusi).toContain("vpT('ohjatusti')");
    expect(uusi).toContain("vpT('ei vielä')");
    expect(uusi, 'raaka fi-taulukko palasi').not.toMatch(/\{ 3: 'itsenäisesti'/);
  });

  it('kaksi tallennuspainiketta ei enää synny samaan näkymään (kaikki osa-alueet)', () => {
    ['teknis_taktinen', 'fyysinen', 'psyykkinen', 'sosiaalinen'].forEach((dom) => {
      const p = pelaaja({ _jfTila: 'vaihto' });
      const h = rakenna({ p: p, domeeni: dom, valinta: { p1: 'y_h2' } })._vpJfVaihtoHTML(p);
      expect((h.match(/jf-btn p"/g) || []).length, dom + ': pääpainikkeita ei ole täsmälleen yksi').toBe(1);
      expect(h, dom + ': rungon oma tallennuspainike jäi').not.toContain('jsp-kt-btn primary');
      expect(h, dom + ': vanha painiketeksti jäi').not.toContain('Tallenna jaksofokus');
    });
  });
});
