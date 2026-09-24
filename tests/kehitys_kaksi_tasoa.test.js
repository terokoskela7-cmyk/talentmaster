/**
 * TalentMaster™ — KEHITYS-VÄLILEHTI KAHTEEN TASOON (KISS, PR B). Vartija.
 *
 * Kysymys jonka välilehti vastaa viidessä sekunnissa: mikä on tavoite, miten menee, mitä seuraavaksi.
 * TASO 1 = pelkkä TILANNE (ei lomakkeita, ei moottoria, ei sisäisiä koodeja) · TASO 2 avataan riviltä,
 * yksi kerrallaan. Kaikki väitteet kohdistuvat RENDERÖITYYN HTML:ään siellä missä se on mahdollista —
 * lähdegreppaus kertoisi vain että merkkijono on tiedostossa, ei että käyttäjä näkee sen.
 *
 * Brief: Claude outputs/CODE_BRIEF_KEHITYS_PR_B_KAKSI_TASOA.md
 * sv: SV_KEHITYS_SANKTIOITU_KOOSTE.json (Gemini-erät B/C/T2–T5 + KAARI) — omaa ruotsia ei kirjoiteta.
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
const IDP = vaadi('../lib/tm_idp.js');
const TAKS = vaadi('../lib/tm_arviointi_taksonomia.js');
const TTSV = vaadi('../lib/tm_teknistaktiset_sv.js');
const FYYS = vaadi('../lib/tm_fyysteemat.js');
const I18N = vaadi('../lib/tm_vp_i18n.js');
const SV = (I18N.TM_VP_I18N || I18N).sv;

const PV = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

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

/* Aidot funktiot, tyhjät tyngät tuntemattomille. has() päästää OIKEAT globaalit läpi (JSON, Date,
   Object, Math…), muuten syväkopio ja nimikartat hajoaisivat harneksen takia, ei koodin. */
const AIDOT = [
  'function _vpDimNimi(dim) {',
  'function _vpTyyppiNaytto(ty) {',
  'function _vpTilaNaytto(tila) {',
  'function _vpKausiNaytto(k) {',
  'function _vpFokusNimiNaytto(fokus) {',
  'function _vpKonseptiNimiNaytto(jf) {',
  'function _vpOtsikkoNaytto(s) {',
  'function _vpTaksLang() {',
  'function _taksNimi(o) {',
  'function _taksVal(o, kentta) {',
  'function _taksAvainNimi(avain) {',
  'function _ttSvKartta() {',
  'function _ttSvPaalla() {',
  'function _ttSv(avain, kentta) {',
  'function _vpKtArvoTeksti(arvo, yks) {',
  'function _vpKtAlariviHTML(t, inline) {',
  'function _vpAskelNappi(avain) {',
  'function _vpKehSeuraavaAskelHTML(p) {',
  'function _vpKaksiPolkuaHTML(p, pid) {',
  'function _vpMoottoriKortitHTML(p, pid) {',
  'function _vpKausitavoiteHTML(p) {',
  'function _vpKehSuunnitelmaHTML(p, opts) {',
  'window._vpKehRiviToggle = function (paa) {',
  'window._vpKtRiviAvattu = function () {',
];
const PALAUTA = ['_vpDimNimi', '_vpTyyppiNaytto', '_vpKtAlariviHTML', '_vpAskelNappi',
  '_vpKehSeuraavaAskelHTML', '_vpMoottoriKortitHTML', '_vpKausitavoiteHTML', '_vpKehSuunnitelmaHTML'];

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/**
 * Rakenna ajokelpoinen ympäristö. kieli='sv' käyttää AITOA sv-karttaa (identiteetti-vpT ei
 * paljastaisi puuttuvaa käännöstä). paatos = window._pdcPaatos-tynkä.
 */
function rakenna(lisa) {
  const o = lisa || {};
  const kutsut = [];
  const win = {
    TM_JAKSOFOKUS: JF,
    TM_FYYSTEEMAT_LIB: FYYS,
    _tmIBtn: () => '',
    _pdcPaatos: o.paatos || (() => null),
    _vpMuokkaaLuonnos: (pid) => { kutsut.push(['_vpMuokkaaLuonnos', pid]); },
  };
  const perus = {
    window: win,
    _jsvEsc: esc,
    vpT: (s) => (o.kieli === 'sv' ? (SV[s] != null ? SV[s] : s) : s),
    tmNykyinenKieli: () => o.kieli || 'fi',
    TM_TT_SV: (TTSV.TM_TT_SV || TTSV),
    tmTaksonomiaByAvain: TAKS.tmTaksonomiaByAvain,
    tmMittaLahdeNimi: TAKS.tmMittaLahdeNimi || (() => ''),
    tmKategoriaNimi: TAKS.tmKategoriaNimi || (() => ''),
    _pvmFiVP: (x) => String(x),
    _pvmLyhyt: (x) => String(x),
    _fmtTestiArvo: (v) => v,
    idpJumissa: () => false,
    idpEhdotaTavoite: o.idpEhdotaTavoite || null,
    _vpIdpOpts: () => ({}),
    _vpIdpPelaaja: () => o.p || null,
    _vpFokusValintaHTML: () => '<div>FOKUSVALINTA</div>',
    _vpValitavoitteetHTML: () => '',
    _vpSitoumusHTML: () => '',
    _vpTavoiteYhteenvetoHTML: () => '<div>YHTEENVETO</div>',
    _vpJfInlineHTML: () => '<div id="_jfInlineEditor">INLINE-EDITORI</div>',
    _vpTyopoytaJaksofokusHTML: () => '<div>RO-JAKSOFOKUS</div>',
    _vpJfEvidenssiHTML: () => '',
    _vpKehityskaariHTML: () => '',
    _vpMesoKaariHTML: () => '',
    IDP_TILA_LBL: {},
    kutsut: kutsut,
  };
  const store = Object.assign(perus, o.ymp || {});
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

/** Pelaaja, jolla on voimassa oleva kausitavoite + aktiivinen jakso (Viikko 1/4 · 3 vk jäljellä). */
function pelaaja(yli) {
  return Object.assign({
    id: 'p1',
    _idpTavoite: {
      luotu: '2026-08-01T10:00:00.000Z', status: 'aktiivinen', tyyppi: 'vahvuus',
      fokus: { nimi: 'Syötön piilotus', alue: 'hide_pass', dim: 'D4' },
      mittari: { yksikko: 'taso' }, lahto: { arvo: 4 }, tavoitearvo: 5,
      aikaraami: { kausi: 'syksy 2026', arvio_pvm: '2026-11-04' },
      arviot: [{ arvo: 4 }, { arvo: 4 }, { arvo: 4 }],
      pelaajan_tavoite: 'Haluan uskaltaa syöttää eteenpäin myös silloin kun vastustaja on lähellä.',
    },
    jaksofokus: {
      konsepti_nimi: 'Syöttäminen', konsepti_avain: 'y_h2', domeeni: 'teknis_taktinen',
      alkoi: iso(Date.now() - 3 * PV), kesto_vk: 4,
      osa_arviot: { y_h2: { a: 3, b: 1 } },
    },
    jaksofokus_historia: [1, 2, 3, 4, 5, 6, 7, 8],
  }, yli || {});
}

/** Rivin otsikko-osa (head) id:n perusteella — body on taso 2, jota taso 1 ei näytä.
 *  Rajaus alkaa rivin AVAAVASTA tagista, koska 'open'-luokka on id-attribuutin edessä. */
function riviOtsikko(h, id) {
  const i = h.indexOf('id="' + id + '"');
  expect(i, 'riviä ei löydy: ' + id).toBeGreaterThan(-1);
  const alku = h.lastIndexOf('<div class="acc-row', i);
  const b = h.indexOf('<div class="acc-body">', i);
  return h.slice(alku > -1 ? alku : i, b > -1 ? b : i + 2000);
}

/** Näkyvä teksti: tagit ja attribuutit pois. Termilukko koskee sitä mitä käyttäjä LUKEE —
 *  id:t, luokat ja onclick-kohteet ovat koodia (_accKaari, _vpKirjaaReview) eivät käyttöliittymää. */
function nakyva(h) {
  return String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/* ══ (1) TASO 1 ON PUHDAS ═══════════════════════════════════════════════════ */
describe('(1) Taso 1 = tilanne: ei lomakkeita eikä moottoria', () => {
  const p = pelaaja();
  const api = rakenna({ p: p });
  const h = api._vpKehSuunnitelmaHTML(p);

  it('oletusrenderissä ei textarea/select/input-elementtejä', () => {
    expect(h, 'lomakekenttä vuoti tasolle 1').not.toMatch(/<textarea/i);
    expect(h, 'lomakekenttä vuoti tasolle 1').not.toMatch(/<select/i);
    expect(h, 'lomakekenttä vuoti tasolle 1').not.toMatch(/<input/i);
  });

  it('moottorin kortteja ei ole', () => {
    expect(h).not.toContain('Moottorin ehdotus');
    expect(h).not.toContain('Tee tästä tavoite');
  });

  it('EI VACUOUS: rivit ja niiden tilat renderöityivät', () => {
    expect(h).toContain('id="_accKausitavoite"');
    expect(h).toContain('id="_accJaksofokus"');
    expect(h).toContain('id="_accKaari"');
    expect(h).toContain('Syötön piilotus');
  });

  it('kaikki kolme riviä ovat kiinni kun voimassa oleva tavoite on', () => {
    expect(h, 'rivi oli auki oletuksena').not.toContain('acc-row open');
  });
});

/* ══ (2) TYHJÄ TILA ═════════════════════════════════════════════════════════ */
describe('(2) Tyhjä tila: Kauden tavoite auki + ehdotukset näkyvissä', () => {
  const tyhja = { id: 'p9', _idpTavoite: null, jaksofokus: null, jaksofokus_historia: [] };
  const ehdotus = (nimi) => ({
    luotu: '2026-09-01T00:00:00.000Z', status: 'ehdotettu',
    fokus: { nimi: nimi, dim: 'D2' }, mittari: { yksikko: 'taso' }, lahto: { arvo: 2 }, tavoitearvo: 4,
    perustelu: { pelilause: 'Avaa peli eteenpäin.' },
  });
  const api = rakenna({
    p: tyhja,
    idpEhdotaTavoite: (_p, opts) => ehdotus(opts && opts.modus === 'vahvuus' ? 'Vahvuusehdotus' : 'Heikkousehdotus'),
  });
  const h = api._vpKehSuunnitelmaHTML(tyhja);

  it('Kauden tavoite -rivi on auki', () => {
    expect(riviOtsikko(h, '_accKausitavoite')).toContain('acc-row open');
  });

  it('rivin sisällä näkyvät ehdotukset suoraan (ei erillistä CTA-nappia)', () => {
    expect(h).toContain('Heikkousehdotus');
    expect(h).toContain('Vahvuusehdotus');
    expect(h).toContain('Kehitä heikkoutta');
    expect(h).toContain('Vahvista vahvuutta');
    expect(h, 'vanha ehdota-CTA jäi tyhjään tilaan').not.toContain('↻ Ehdota tavoite datasta');
  });

  it('tilarivi sanoo "Ei asetettu" eikä arvaa tilaa', () => {
    expect(riviOtsikko(h, '_accKausitavoite')).toContain('Ei asetettu');
  });
});

/* ══ (3) SEURAAVA ASKEL ═════════════════════════════════════════════════════ */
describe('(3) Seuraava askel cockpitissa', () => {
  const TOIMET = [
    ['review_myohassa', '_vpKirjaaReview', 'Avaa kehityskeskustelu →'],
    ['review_eraantymassa', '_vpKirjaaReview', 'Avaa kehityskeskustelu →'],
    ['ehdotus_odottaa', '_vpKehAvaaKausitavoite', 'Tarkista ehdotus'],
    ['idp_jumissa', '_vpKehAvaaVaihto', 'Vaihda tavoite…'],
    ['sitoumus', '_vpVahvistaSitoumus', 'Vahvista'],
    ['ei_jaksofokusta', '_vpKehAvaaJaksofokus', '＋ Aseta jaksofokus'],
  ];

  it.each(TOIMET)('%s → oikea teksti, painike ja kohdefunktio', (avain, fn, nappiTeksti) => {
    const p = pelaaja();
    const api = rakenna({
      p: p,
      paatos: () => ({ avain: avain, tila: 'toimenpide', teksti: 'PÄÄTÖSTEKSTI', korostus: 'KOROSTUS' }),
    });
    const h = api._vpKehSeuraavaAskelHTML(p);
    expect(h).toContain('Seuraava askel');
    expect(h).toContain('PÄÄTÖSTEKSTI');
    expect(h).toContain('KOROSTUS');
    expect(h, 'painikkeen teksti puuttuu').toContain(nappiTeksti);
    expect(h, 'painike ei osoita oikeaan funktioon').toContain(fn + "('p1')");
    expect(h).toContain('data-askel="' + avain + '"');
  });

  it('ehdotus_odottaa avaa rivin TÄSSÄ näkymässä — ei siirtymää cockpittiin', () => {
    const p = pelaaja();
    const api = rakenna({ p: p, paatos: () => ({ avain: 'ehdotus_odottaa', tila: 'toimenpide', teksti: 'x' }) });
    const h = api._vpKehSeuraavaAskelHTML(p);
    expect(h).toContain('_vpKehAvaaKausitavoite(');
    expect(h, 'käyttäjä on jo cockpitissa — siirtymä vie väärään paikkaan').not.toContain('_pdcSiirryCockpittiin');
  });

  it('hiljainen tila: ei toimi-luokkaa, ei tealia, rivi "Ajan tasalla"', () => {
    const p = pelaaja();
    const api = rakenna({ p: p, paatos: () => ({ avain: 'ei_xfactoria', tila: 'hiljainen', teksti: 'PDC-TEKSTI' }) });
    const h = api._vpKehSeuraavaAskelHTML(p);
    expect(h).toContain('Ajan tasalla');
    expect(h, 'hiljainen tila maalattiin toimenpiteeksi').not.toContain('toimi');
    expect(h, 'hiljaiseen tilaan vuoti teal').not.toMatch(/--teal|28B090/);
    expect(h, 'hiljaisessa tilassa ei ole painiketta').not.toContain('<button');
  });

  it('PDC:n hiljainen teksti on ennallaan (jaettu päätöslähde ei muuttunut)', () => {
    const paatos = pura('window._pdcPaatos = function (p, nyt) {');
    expect(paatos).toContain("vpT('X-Factor tunnistettu — vahvista suunta.')");
    expect(paatos).toContain("vpT('Ei avointa toimenpidettä — nimetkää kärkivahvuus.')");
  });

  it('laatikko on tason 1 kärjessä, rivien ENNEN', () => {
    const iAskel = VP.indexOf('_kehExtra += _vpKehSeuraavaAskelHTML(p);');
    const iRivit = VP.indexOf('_kehExtra += \'<div id="_jspKehSuunnitelma"');
    expect(iAskel).toBeGreaterThan(0);
    expect(iRivit).toBeGreaterThan(0);
    expect(iAskel).toBeLessThan(iRivit);
  });
});

/* ══ (4) YKSI RIVI AUKI KERRALLAAN ══════════════════════════════════════════ */
describe('(4) Yksi rivi kerrallaan cockpitissa, monta raportissa', () => {
  /** Minimi-DOM: rivi + sisarrivi samassa kontissa. */
  function dom(idt) {
    const rivit = idt.map((id) => ({
      id: id,
      _luokat: new Set(),
      classList: {
        add(k) { this._o._luokat.add(k); },
        remove(k) { this._o._luokat.delete(k); },
        contains(k) { return this._o._luokat.has(k); },
      },
    }));
    rivit.forEach((r) => { r.classList._o = r; });
    const kontti = {
      querySelectorAll: () => rivit.filter((r) => r._luokat.has('open')),
    };
    rivit.forEach((r) => { r.parentNode = kontti; });
    return { rivit: rivit, paa: (i) => ({ parentNode: rivit[i] }) };
  }

  it('cockpit: toisen rivin avaus sulkee ensimmäisen', () => {
    const p = pelaaja();
    const api = rakenna({ p: p });
    const d = dom(['_accKausitavoite', '_accJaksofokus']);
    api._win._vpKehRiviToggle(d.paa(0));
    expect(d.rivit[0]._luokat.has('open')).toBe(true);
    api._win._vpKehRiviToggle(d.paa(1));
    expect(d.rivit[1]._luokat.has('open'), 'toinen rivi ei auennut').toBe(true);
    expect(d.rivit[0]._luokat.has('open'), 'ensimmäinen rivi jäi auki').toBe(false);
  });

  it('raportti (_pdc-etuliite): kaksi riviä voi olla auki yhtä aikaa', () => {
    const p = pelaaja();
    const api = rakenna({ p: p });
    const d = dom(['_pdc_accKausitavoite', '_pdc_accJaksofokus']);
    api._win._vpKehRiviToggle(d.paa(0));
    api._win._vpKehRiviToggle(d.paa(1));
    expect(d.rivit[0]._luokat.has('open'), 'raportissa rivi suljettiin turhaan').toBe(true);
    expect(d.rivit[1]._luokat.has('open')).toBe(true);
  });

  it('Kauden tavoite -rivin avaus luo muokkausluonnoksen (taso 2 = lomake)', () => {
    const p = pelaaja();
    const api = rakenna({ p: p, ymp: { _vpArvPelaaja: p } });
    api._win._vpArvPelaaja = p;
    const d = dom(['_accKausitavoite']);
    api._win._vpKehRiviToggle(d.paa(0));
    expect(api.kutsut, 'luonnosta ei luotu rivin avauksessa').toEqual([['_vpMuokkaaLuonnos', 'p1']]);
  });

  it('jo auki oleva luonnos säilyy: avaus ei ylikirjoita kesken jäänyttä syöttöä', () => {
    const p = pelaaja({ _idpLuonnos: { luotu: 'x', status: 'aktiivinen' }, _luonnosTyyppi: 'muokkaus' });
    const api = rakenna({ p: p });
    api._win._vpArvPelaaja = p;
    const d = dom(['_accKausitavoite']);
    api._win._vpKehRiviToggle(d.paa(0));
    expect(api.kutsut, 'luonnos luotiin päälle vaikka sellainen oli auki').toEqual([]);
  });

  it('raportissa rivin avaus EI luo luonnosta (read-only)', () => {
    const p = pelaaja();
    const api = rakenna({ p: p });
    api._win._vpArvPelaaja = p;
    const d = dom(['_pdc_accKausitavoite']);
    api._win._vpKehRiviToggle(d.paa(0));
    expect(api.kutsut).toEqual([]);
  });
});

/* ══ (5) RIVIT KERTOVAT TILANTEEN ═══════════════════════════════════════════ */
describe('(5) Rivien tilat ja alarivit', () => {
  it('Kauden tavoite: "Käytössä" + "Nyt 4/5 → tavoite 5/5 · arvioidaan 4.11."', () => {
    const p = pelaaja();
    const api = rakenna({ p: p });
    const ots = riviOtsikko(api._vpKehSuunnitelmaHTML(p), '_accKausitavoite');
    expect(ots).toContain('Käytössä');
    expect(ots).toContain('syksy 2026');
    expect(ots).toContain('Nyt 4/5');
    expect(ots).toContain('tavoite 5/5');
    expect(ots).toContain('arvioidaan');
  });

  it('puuttuva arviointipäivä jää pois — ei roikkuvaa erotinta', () => {
    const p = pelaaja();
    delete p._idpTavoite.aikaraami.arvio_pvm;
    const api = rakenna({ p: p });
    const rivi = api._vpKtAlariviHTML(p._idpTavoite, true);
    expect(rivi).toContain('tavoite 5/5');
    expect(rivi).not.toContain('arvioidaan');
    expect(rivi, 'erotin jäi roikkumaan').not.toMatch(/·\s*(<|$)/);
  });

  it('pelaajan omat sanat: 2 riviin + "Näytä lisää"', () => {
    const p = pelaaja();
    const rivi = rakenna({ p: p })._vpKtAlariviHTML(p._idpTavoite, true);
    expect(rivi).toContain('Haluan uskaltaa syöttää');
    expect(rivi).toContain('Näytä lisää');
    expect(rivi, 'katkaisu ei rajaa kahteen riviin').toContain('kt-oma');
  });

  it('Nyt harjoitellaan: "Viikko 1/4 · 3 vk jäljellä" + osa-etenemä', () => {
    const p = pelaaja();
    const ots = riviOtsikko(rakenna({ p: p })._vpKehSuunnitelmaHTML(p), '_accJaksofokus');
    expect(ots).toContain('Viikko 1/4');
    expect(ots).toContain('3 vk jäljellä');
    expect(ots).toContain('1/2 osaa hallussa pelissä');
    expect(ots).toContain('Syöttäminen');
  });

  it('Aiemmat jaksot: monikko 8 jaksoa + 3 kehityskeskustelua', () => {
    const p = pelaaja();
    const ots = riviOtsikko(rakenna({ p: p })._vpKehSuunnitelmaHTML(p), '_accKaari');
    expect(ots).toContain('8 suljettua jaksoa');
    expect(ots).toContain('3 kehityskeskustelua');
  });

  it('Aiemmat jaksot: yksikkö 1 jakso + 1 kehityskeskustelu', () => {
    const p = pelaaja({ jaksofokus_historia: [1] });
    p._idpTavoite.arviot = [{ arvo: 4 }];
    const ots = riviOtsikko(rakenna({ p: p })._vpKehSuunnitelmaHTML(p), '_accKaari');
    expect(ots).toContain('1 suljettu jakso');
    expect(ots).toContain('1 kehityskeskustelu');
    expect(ots).not.toContain('suljettua jaksoa');
    expect(ots).not.toContain('kehityskeskustelua');
  });

  it('murupolku on eteneminen, ei kaari', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpKehSuunnitelmaHTML(p);
    const murupolku = h.slice(h.indexOf('idp-breadcrumb'), h.indexOf('idp-breadcrumb') + 200);
    expect(murupolku).toContain('📈 eteneminen');
    expect(murupolku, 'kaari-termi jäi murupolkuun').not.toMatch(/kaari/i);
  });
});

/* ══ (6) VAIHDA-POLKU ═══════════════════════════════════════════════════════ */
describe('(6) Vaihda tavoite… — polku rivin sisällä', () => {
  const ehdotus = {
    luotu: '2026-09-20T00:00:00.000Z', status: 'ehdotettu', tyyppi: 'vahvuus',
    fokus: { nimi: 'Kolmas mies', dim: 'D4' }, mittari: { yksikko: 'taso' }, lahto: { arvo: 3 }, tavoitearvo: 5,
  };

  it('vaihe 1: lippu → ehdotukset rivin sisällä (ei modaalia)', () => {
    const p = pelaaja({ _vpVaihtoPolku: true });
    const api = rakenna({ p: p, idpEhdotaTavoite: () => ehdotus });
    const h = api._vpKausitavoiteHTML(p);
    expect(h).toContain('Kehitä heikkoutta');
    expect(h).toContain('Vahvista vahvuutta');
    expect(h).toContain('Kolmas mies');
    expect(h).toContain('Peruuta');
    expect(h, 'vaihe 1 avasi modaalin').not.toContain('_vpVaihtoModal');
  });

  it('vaihe 2: vaihto-luonnos → "Luonnos · ei vielä käytössä" + pääpainike avaa vahvistuksen', () => {
    const p = pelaaja({ _idpLuonnos: ehdotus, _luonnosTyyppi: 'vaihto' });
    const h = rakenna({ p: p })._vpKausitavoiteHTML(p);
    expect(h).toContain('Luonnos · ei vielä käytössä');
    expect(h).toContain('Ota uusi tavoite käyttöön');
    expect(h).toContain('_vpVaihtoAvaa(');
    expect(h, 'vaihto tallentui suoraan ilman vahvistusta').not.toContain('_vpTallennaTavoite(');
  });

  it('vahvistusikkunan metarivi: tyyppi + ulottuvuus sanoina, EI D-koodia', () => {
    const avaa = pura('window._vpVaihtoAvaa = function (pid) {');
    expect(avaa).toContain('_vpTyyppiNaytto(uusi.tyyppi)');
    expect(avaa).toContain('_vpDimNimi(uusi.fokus && uusi.fokus.dim)');
    expect(avaa, 'raaka D-koodi jäi metariville').not.toContain("(uusi.fokus && uusi.fokus.dim) || ''");
  });

  it('nimikartta on aito: D4 → Peliäly, tuntematon → tyhjä (ei arvausta)', () => {
    const api = rakenna({ p: pelaaja() });
    expect(api._vpDimNimi('D4')).toBe('Peliäly');
    expect(api._vpDimNimi('D1')).toBe('Fyysinen');
    expect(api._vpDimNimi('D9')).toBe('');
    expect(api._vpDimNimi(null)).toBe('');
    expect(api._vpTyyppiNaytto('vahvuus')).toBe('Vahvista vahvuutta');
    expect(api._vpTyyppiNaytto('xx')).toBe('');
  });

  it('peruutus nollaa lipun JA luonnoksen (rivi palaa lähtötilaan)', () => {
    expect(pura('window._vpVaihtoPeru = function (pid) {')).toContain('p._vpVaihtoPolku = false');
    expect(pura('function _vpTyhjennaLuonnos(p) {'), 'lippu jäi päälle luonnoksen tyhjennyksessä')
      .toContain('p._vpVaihtoPolku = false');
  });
});

/* ══ (7) SISÄISET TERMIT POIS ═══════════════════════════════════════════════ */
describe('(7) Sisäiset termit eivät näy käyttäjälle (fi)', () => {
  /* Koko välilehden render, kaikki rivit auki: kausitavoite-lomake + jaksofokus + historia.
     Diagnostiikka ei kulje _vpKehSuunnitelmaHTML:n läpi, joten se tarkistetaan lähteestä erikseen. */
  const p = pelaaja({ _idpLuonnos: null });
  const api = rakenna({ p: p });
  const kaikki = nakyva(api._vpKehSuunnitelmaHTML(p) + api._vpKausitavoiteHTML(p)
    + api._vpKausitavoiteHTML(pelaaja({ _idpLuonnos: pelaaja()._idpTavoite, _luonnosTyyppi: 'muokkaus' })));

  const KIELLETYT = [
    ['§', /§/],
    ['IDP-ydin', /IDP-ydin/],
    ['moottori', /moottori/i],
    ['Y-H', /Y-H\d/],
    ['D-koodi', /\bD[1-5]\b/],
    ['meso', /\bmeso\b/i],
    ['70/30', /70\/30/],
    ['Kultaikkuna', /kultaikkuna/i],
    ['review', /review/i],
    ['katselmu', /katselmu/i],
    ['kaari', /kaari|kaaren|kaarta/i],
    ['PHV', /\bPHV\b/],
    ['oversight', /oversight/i],
    ['työpöytä', /työpöyt/i],
  ];

  it.each(KIELLETYT)('%s ei esiinny renderissä', (_nimi, re) => {
    const osuma = String(kaikki).match(re);
    expect(osuma, 'sisäinen termi näkyy käyttäjälle: ' + (osuma && osuma[0])).toBeNull();
  });

  it('EI VACUOUS: render on iso ja sisältää odotettua sisältöä', () => {
    expect(kaikki.length, 'näkyvä teksti kuivui kokoon → lukko ei mittaa mitään').toBeGreaterThan(400);
    expect(kaikki).toContain('Kauden tavoite');
    expect(kaikki).toContain('Nyt harjoitellaan');
    expect(kaikki).toContain('Aiemmat jaksot');
  });

  it('diagnostiikan otsikko on "Kehityssuunta" (kaari-termi pois myös sieltä)', () => {
    expect(VP).toContain("vpT('Kehityssuunta')");
    expect(VP).not.toContain('Kehityskaari · mihin suuntaan');
  });
});

/* ══ (8) SV — KÄÄNNÖSPORTTI ═════════════════════════════════════════════════ */
describe('(8) sv: uudet avaimet kääntyvät, fi ei vuoda', () => {
  const p = pelaaja();
  const sv = rakenna({ p: p, kieli: 'sv' })._vpKehSuunnitelmaHTML(p);

  it('riviotsikot ja tilat ovat ruotsiksi', () => {
    expect(sv).toContain(SV['Kauden tavoite']);
    expect(sv).toContain(SV['Nyt harjoitellaan']);
    expect(sv).toContain(SV['Aiemmat jaksot']);
    expect(sv).toContain(SV['Käytössä']);
    expect(sv).toContain(SV['kehityskeskustelua']);
    expect(sv).toContain(SV['suljettua jaksoa']);
  });

  it('suomenkielisiä riviotsikoita ei jää', () => {
    ['Kauden tavoite', 'Nyt harjoitellaan', 'Aiemmat jaksot', 'Käytössä', 'vk jäljellä',
      'osaa hallussa pelissä', 'kehityskeskustelua', 'suljettua jaksoa'].forEach((fi) => {
      expect(SV[fi], 'sanktioitu sv-rivi puuttuu: ' + fi).toBeTruthy();
      expect(sv, 'fi vuotaa sv-tilassa: ' + fi).not.toContain(fi);
    });
  });

  it('EI VACUOUS: sv-render ei ole tyhjä eikä identtinen fi:n kanssa', () => {
    const fi = rakenna({ p: p })._vpKehSuunnitelmaHTML(p);
    expect(sv.length).toBeGreaterThan(1000);
    expect(sv).not.toBe(fi);
  });
});

/* ══ (9) PDC (raportti) ═════════════════════════════════════════════════════ */
describe('(9) Pelaajaraportti: uudet otsikot, ei editoria, _pdc-id:t ennallaan', () => {
  const p = pelaaja();
  const h = rakenna({ p: p })._vpKehSuunnitelmaHTML(p, { editori: false });

  it('id:t saavat _pdc-etuliitteen (duplikaatti-id-korjaus ennallaan)', () => {
    expect(h).toContain('id="_pdc_accKausitavoite"');
    expect(h).toContain('id="_pdc_accJaksofokus"');
    expect(h).toContain('id="_pdc_accKaari"');
  });

  it('ei inline-editoria eikä cockpitin re-render-slottia', () => {
    expect(h).not.toContain('_jfInlineEditor');
    expect(h).not.toContain('id="_jspKausitavoite"');
  });

  it('otsikot ovat samat kuin cockpitissa', () => {
    expect(h).toContain('Kauden tavoite');
    expect(h).toContain('Nyt harjoitellaan');
    expect(h).toContain('Aiemmat jaksot');
  });
});

/* ══ (10) BRÄNDI ════════════════════════════════════════════════════════════ */
describe('(10) Teal vain Seuraava askelissa ja pääpainikkeessa · Cormorant ei bold', () => {
  it('tason 1 rivit eivät käytä tealia', () => {
    const p = pelaaja();
    const h = rakenna({ p: p })._vpKehSuunnitelmaHTML(p);
    expect(h, 'teal vuoti tason 1 riveille').not.toMatch(/--teal|28B090/);
  });

  it('Seuraava askel -laatikko on teal (ainoa aksentti kärjessä)', () => {
    const saanto = VP.slice(VP.indexOf('.jsp-keh-askel'), VP.indexOf('.jsp-keh-askel') + 600);
    expect(saanto).toMatch(/--teal/);
  });

  it('tavoitetyypin siru ja oppimisikkuna ovat neutraaleja (ei teal/amber/blue)', () => {
    const kt = pura('function _vpKausitavoiteHTML(p) {');
    expect(kt, 'tyyppisiru värittää yhä').not.toContain("heikkous: { c: 'var(--amber)'");
    expect(kt).toContain("const _tyc = { c: 'var(--ink2)', b: 'var(--border)' }");
    expect(kt).not.toContain("'<span class=\"chip\" style=\"color:var(--teal)\">' + vpT('Paras oppimisikkuna nyt')");
  });

  it('toissijaiset linkit ovat neutraaleja', () => {
    const css = VP.slice(VP.indexOf('.jsp-kt-toissij span {'), VP.indexOf('.jsp-kt-toissij span {') + 240);
    expect(css).toContain('var(--ink3)');
    expect(css).not.toMatch(/--teal/);
  });

  it('Cormorant Garamond ei koskaan bold (font-weight 600/700/bold)', () => {
    /* Serif-fontti ja lihavointi samassa saannossa = brandirikko. Tarkistus kohdistuu
       kaikkiin lahteen inline-tyyleihin, joissa serif ja font-weight esiintyvat yhdessa. */
    const rikkeet = [];
    const re = /style="([^"]*var\(--font-serif\)[^"]*)"/g;
    let m;
    while ((m = re.exec(VP))) {
      if (/font-weight:\s*(600|700|bold)/.test(m[1])) rikkeet.push(m[1].slice(0, 90));
    }
    expect(rikkeet, 'Cormorant lihavoituna: ' + rikkeet.join(' | ')).toEqual([]);
  });

  it('380 px: tilarivi ja linkkirivi rivittyvät (ei vaakavieritystä)', () => {
    const tila = VP.slice(VP.indexOf('.acc-state {'), VP.indexOf('.acc-state {') + 260);
    expect(tila, 'tilarivi ei rivity kapealla').toMatch(/flex-wrap:\s*wrap/);
    const linkit = VP.slice(VP.indexOf('.jsp-kt-toissij {'), VP.indexOf('.jsp-kt-toissij {') + 200);
    expect(linkit).toMatch(/flex-wrap:\s*wrap/);
  });
});
