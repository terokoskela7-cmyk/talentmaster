/**
 * TalentMaster™ — C2 KOHINANPOISTO (summary ennen tiheyttä). Vartija.
 *
 * C2 ei poista tietoa: Mittauksen kolme päällekkäistä selitystä ja Viikon kuormatieteen kerros
 * taittuvat progressiivisen paljastuksen taakse. Peruskäyttäjä näkee tilan + tiivistyksen + luvut;
 * syvyys on yhden klikkauksen päässä.
 *
 * Todisteet ovat RENDERÖITYJÄ siellä missä se on mahdollista (lähdettä grepataan vain rakenteesta,
 * jota ei voi ajaa): renderöijät suoritetaan ja tuloksesta luetaan mikä on näkyvissä ja mikä piilossa.
 * Disclosure-toggle ajetaan DOM-tyngällä (repon konventio, ei jsdom-riippuvuutta).
 *
 * Brief: `Claude outputs/CODE_BRIEF_C2_KEVENNYS.md` · mockup: `Claude outputs/C2_KEVENNYS_MOCKUP.html`
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

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

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** Suorittaa annetut VP-funktiot oikeasti; puuttuvat globaalit palauttavat tyhjän. */
function aja(sigit, palautus, lisa) {
  const store = Object.assign({ _jsvEsc: esc, vpT: (s) => s }, lisa || {});
  const ymp = new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : () => '')),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const runko = sigit.map(pura).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('__ymp', 'with(__ymp){' + runko + '\nreturn (' + palautus + ');}')(ymp);
}

/** Näkyvä teksti: tagit pois. */
const nakyva = (h) => String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

/** Disclosuren rungon sisältö (hidden-lohko) ja sen ulkopuolinen osa erikseen. */
function jaaDisclosure(html) {
  const i = String(html).indexOf('class="c2-disc-body"');
  if (i < 0) return { ulko: String(html), sisa: '' };
  const alku = String(html).lastIndexOf('<div', i);
  return { ulko: String(html).slice(0, alku), sisa: String(html).slice(alku) };
}

const P_JALKI = {
  id: 'p1', phv_tila: 'AN', tki_merkki: 'kulta',
  sbl: null, sfl: null, ll: null, diag: null, dfl: null,
};

/* ══ (1) OLETUS SUPPEA ══════════════════════════════════════════════════════ */
describe('(1) oletustila on suppea — laajennettu sisältö ei ole ensirenderissä näkyvissä', () => {
  const disc = aja(['function _vpDiscHTML(id, kiinni, auki, sisalto) {'],
    "_vpDiscHTML('_testi', 'Avaa', 'Sulje', '<p>syvyys</p>')");

  it('EI VACUOUS: renderöijä tuottaa sekä kontrollin että rungon', () => {
    expect(disc).toContain('c2-disc');
    expect(disc).toContain('c2-disc-body');
    expect(disc).toContain('syvyys');
  });

  it('runko on hidden JA aria-hidden ensirenderissä', () => {
    expect(disc).toMatch(/class="c2-disc-body"[^>]*\shidden/);
    expect(disc).toMatch(/aria-hidden="true"/);
  });

  it('kontrolli kertoo olevansa kiinni (aria-expanded=false)', () => {
    expect(disc).toContain('aria-expanded="false"');
  });

  it('Mittaus: §28-linssi ja "Mitä testit kertovat" renderöityvät VAIN perustelulohkoon', () => {
    // tab-1:n kokoonpanossa linssi/synth esiintyvät vain _mitPerustelu-vakiossa
    const iPerustelu = VP.indexOf('const _mitPerustelu =');
    const iTab1 = VP.indexOf("hR += '<div id=\"_jspTab1\"");
    expect(iPerustelu).toBeGreaterThan(-1);
    expect(iPerustelu).toBeLessThan(iTab1);
    const tab1 = VP.slice(iTab1, VP.indexOf("hR += '<div id=\"_jspTab2\"", iTab1));
    expect(tab1).not.toContain('_vpMittausLinssiHTML(p, ika) :');
    expect(tab1).not.toContain('_vpMittausSynthHTML(p, ika, d1, d2, tsi) :');
    expect(tab1).toContain("_vpDiscHTML('_c2MitPerustelu'");
  });

  it('Viikko: kuormitussuhde + viikkosumma ovat disclosuren rungossa, eivät ulkopuolella', () => {
    const html = viikkoKuorma();
    const { ulko, sisa } = jaaDisclosure(html);
    expect(nakyva(sisa)).toContain('Kuormitussuhde');
    expect(nakyva(ulko)).not.toContain('Kuormitussuhde');
    expect(nakyva(sisa)).toContain('kuormitusyksikköä');
    expect(nakyva(ulko)).not.toContain('kuormitusyksikköä');
  });
});

/** Viikon kuormalohko ajettuna: kaksi kuormallista päivää + yksi tyhjä. */
function viikkoKuorma(pLisa) {
  const days = [
    { iso: '2026-09-21', nimi: 'Ma', pvm: '21.9.' },
    { iso: '2026-09-22', nimi: 'Ti', pvm: '22.9.' },
    { iso: '2026-09-23', nimi: 'Ke', pvm: '23.9.' },
  ];
  const rows = {
    '2026-09-21': { iso: '2026-09-21', rpe: 6, kesto_min: 70, vahvistettu: true },
    '2026-09-22': { iso: '2026-09-22', rpe: 4, kesto_min: 60, vahvistettu: false },
    '2026-09-23': { iso: '2026-09-23' },
  };
  const st = { days, rows };
  const p = Object.assign({ id: 'p1', phv_tila: 'AN', _viikkoKrono4: 400 }, pLisa || {});
  return aja(['function _vpDiscHTML(id, kiinni, auki, sisalto) {', 'function _vpViikkoKuormaHTML(p, st) {'],
    '_vpViikkoKuormaHTML(__p, __st)',
    { __p: p, __st: st, _vpViikkoPaivaAU: (r) => ((r && r.rpe && r.kesto_min) ? r.rpe * r.kesto_min : 0) });
}

/* ══ (2) AINA NÄKYVISSÄ ═════════════════════════════════════════════════════ */
describe('(2) tila, tiivistys ja luvut pysyvät näkyvissä (ne eivät saa piiloutua)', () => {
  const kypsyys = aja(['function _vpPhvTila(koodi) {', 'function _vpPhvBadgeHTML(koodi, selite) {',
    'function _vpMittausKypsyysHTML(p) {'], '_vpMittausKypsyysHTML(__p)', { __p: P_JALKI });
  const tiivistys = aja(['function _vpMittausProfiili(p, d1, d2, tsi) {',
    'function _vpMittausTiivistysHTML(p, ika, d1, d2, tsi) {'],
  '_vpMittausTiivistysHTML(__p, 14, 2.5, 4, null)', { __p: P_JALKI });

  it('EI VACUOUS: molemmat kevyet lohkot tuottavat tekstiä', () => {
    expect(nakyva(kypsyys).replace(/\s/g, '').length).toBeGreaterThan(10);
    expect(nakyva(tiivistys).replace(/\s/g, '').length).toBeGreaterThan(20);
  });

  it('kypsyysrivi: badge + yksi seuraus (ei omaa disclosurea)', () => {
    expect(kypsyys).toContain('phv-badge');
    expect(nakyva(kypsyys)).toContain('Jälki-PHV');
    expect(kypsyys).not.toContain('c2-disc');
  });

  it('tiivistys: yksi lause, ei disclosurea', () => {
    expect(tiivistys).toContain('c2-tiivistys');
    expect(nakyva(tiivistys)).toContain('Tiivistys');
    expect(tiivistys).not.toContain('c2-disc');
  });

  /* Paikkaan nojaava vaite SEURAA mutaatiota (mittaruudut siirtyivat perusteluun ja indeksit
     siirtyivat mukana → vuoto). Siksi vaite kohdistuu kahteen RAJATTUUN lohkoon: perustelun
     MAARITTELYYN (const … ;) ja tab-1:n kokoonpanoon. */
  function lohko(alku, loppu) {
    const i = VP.indexOf(alku);
    expect(i, alku + ' puuttuu').toBeGreaterThan(-1);
    const j = VP.indexOf(loppu, i + alku.length);
    expect(j, loppu + ' puuttuu').toBeGreaterThan(i);
    return VP.slice(i, j);
  }

  it('Mittaus: perustelulohko sisältää VAIN kypsyysperustelun — ei mittaruutuja', () => {
    const maarittely = lohko('const _mitPerustelu =', ';\n');
    expect(maarittely).toContain('_vpMittausLinssiHTML(p, ika, true)');
    expect(maarittely).toContain('_vpMittausSynthHTML(p, ika, d1, d2, tsi)');
    expect(maarittely).not.toContain('mit-cols');
    expect(maarittely).not.toMatch(/\bf1\b/);
    expect(maarittely).not.toMatch(/\bf2\b/);
  });

  it('Mittaus: mittaruudut renderöityvät tab-1:een (eivät saa kadota disclosuren sisään)', () => {
    const tab1 = lohko("hR += '<div id=\"_jspTab1\"", "hR += '<div id=\"_jspTab2\"");
    expect(tab1).toContain('mit-cols');
    expect(tab1).toContain("_mSub(vpT('Fyysinen · mitattu')) + f1");
    expect(tab1).toContain("_mSub(vpT('Tekninen · mitattu')) + f2");
    // ruudut ennen perustelu-disclosurea (summary ennen tiheyttä)
    expect(tab1.indexOf('mit-cols')).toBeLessThan(tab1.indexOf("_vpDiscHTML('_c2MitPerustelu'"));
  });

  it('Viikko: kuormapalkit ja legenda ovat disclosuren ulkopuolella', () => {
    const { ulko, sisa } = jaaDisclosure(viikkoKuorma());
    expect(nakyva(ulko)).toContain('Päivittäinen kuormitus');
    expect(ulko).toContain('Ma');       // palkkirivin päivätunnukset
    expect(ulko).toContain('Ti');
    expect(nakyva(sisa)).not.toContain('Päivittäinen kuormitus');
  });

  it('Viikko: kasvupyrähdyksen kuormaehdotus (amber) pysyy näkyvissä — se on toimenpide, ei selitys', () => {
    const { ulko } = jaaDisclosure(viikkoKuorma({ phv_tila: 'PH' }));
    expect(nakyva(ulko)).toContain('Kuormaehdotus');
    expect(ulko).toContain('Kevennä esitäyttöä');
  });
});

/* ══ (3) DISCLOSUREN SAAVUTETTAVUUS + KÄYTÖS ════════════════════════════════ */
describe('(3) kontrolli on oikea painike ja kertoo tilansa', () => {
  const disc = aja(['function _vpDiscHTML(id, kiinni, auki, sisalto) {'],
    "_vpDiscHTML('_t', 'Näytä tiedot', 'Piilota tiedot', '<p>x</p>')");

  it('oikea <button type="button"> (näppäimistö + ruudunlukija natiivisti)', () => {
    expect(disc).toMatch(/<button type="button" class="c2-disc"/);
  });

  it('aria-controls osoittaa runkoon', () => {
    const m = disc.match(/aria-controls="([^"]+)"/);
    expect(m).toBeTruthy();
    expect(disc).toContain('id="' + m[1] + '"');
  });

  /** DOM-tynkä (repon konventio): _vpDiscToggle ajetaan oikeasti. */
  function tynka() {
    const body = { attrs: { 'aria-hidden': 'true', hidden: '' },
      setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } };
    const lbl = { textContent: '＋ Näytä tiedot' };
    const chev = { textContent: '⌄' };
    const btn = { attrs: { 'aria-expanded': 'false', 'aria-controls': '_t', 'data-kiinni': 'Näytä tiedot', 'data-auki': 'Piilota tiedot' },
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      querySelector(sel) { return sel === '.c2-disc-lbl' ? lbl : (sel === '.c2-chev' ? chev : null); } };
    const doc = { getElementById: (id) => (id === '_t' ? body : null) };
    const win = {};
    aja(['window._vpDiscToggle = function (btn) {'], 'window._vpDiscToggle', { window: win, document: doc });
    return { btn, body, lbl, chev, toggle: win._vpDiscToggle };
  }

  it('klikkaus avaa: aria-expanded=true, hidden pois, nimi ja chevron vaihtuvat', () => {
    const d = tynka();
    d.toggle(d.btn);
    expect(d.btn.getAttribute('aria-expanded')).toBe('true');
    expect(d.body.getAttribute('hidden')).toBeNull();
    expect(d.body.getAttribute('aria-hidden')).toBe('false');
    expect(d.lbl.textContent).toContain('Piilota tiedot');
    expect(d.lbl.textContent.startsWith('−')).toBe(true);
    expect(d.chev.textContent).toBe('⌃');
  });

  it('toinen klikkaus sulkee takaisin (tila ei jää auki)', () => {
    const d = tynka();
    d.toggle(d.btn); d.toggle(d.btn);
    expect(d.btn.getAttribute('aria-expanded')).toBe('false');
    expect(d.body.getAttribute('hidden')).toBe('');
    expect(d.body.getAttribute('aria-hidden')).toBe('true');
    expect(d.lbl.textContent).toContain('Näytä tiedot');
    expect(d.chev.textContent).toBe('⌄');
  });
});

/* ══ (4) LEGENDA ════════════════════════════════════════════════════════════ */
describe('(4) legenda kertoo mitä palkki on, ei koodimuotoa', () => {
  it('legenda: "Päivittäinen kuormitus (harjoitukset ja pelit)"', () => {
    expect(nakyva(viikkoKuorma())).toContain('Päivittäinen kuormitus (harjoitukset ja pelit)');
  });
  it('minimimuoto "palkki = kuormitus" ei esiinny enää missään VP:ssä', () => {
    expect(VP).not.toContain('palkki = kuormitus');
  });
});

/* ══ (5) TERMILUKKO — C1 pätee myös piilotettuun sisältöön ══════════════════ */
describe('(5) piilotetussakaan sisällössä ei sisäisiä koodeja (C1 pätee)', () => {
  const KIELLETYT = [['paljas §', /§\s*\d/], ['ACWR', /\bACWR\b/], ['AU', /\bAU\b/], ['sRPE', /sRPE|Session-RPE/i]];
  const kuorma = viikkoKuorma();
  const lahteet = aja(['function _vpViikkoSrcKortti(nimi, selite, foot) {', 'function _vpViikkoLahteetHTML() {'],
    '_vpViikkoLahteetHTML()');

  it('EI VACUOUS: molemmat lohkot tuottavat tekstiä', () => {
    expect(nakyva(kuorma).replace(/\s/g, '').length).toBeGreaterThan(40);
    expect(nakyva(lahteet).replace(/\s/g, '').length).toBeGreaterThan(40);
  });

  it.each(KIELLETYT)('kuormalohko (myös disclosuren runko): %s ei esiinny', (_k, s) => {
    expect(nakyva(kuorma)).not.toMatch(s);
  });

  it.each(KIELLETYT)('viikon lähdekortit: %s ei esiinny', (_k, s) => {
    expect(nakyva(lahteet)).not.toMatch(s);
  });
});

/* ══ (6) PALKIT ↔ RUUDUKKO ══════════════════════════════════════════════════ */
describe('(6) kuormapalkki ja päiväruudukko lukevat saman päivän samasta lähteestä', () => {
  const nauha = pura('function _vpViikkoNauhaHTML(p, st) {');
  const kuorma = pura('function _vpViikkoKuormaHTML(p, st) {');

  it('molemmat johtavat päivän kuorman samasta funktiosta (_vpViikkoPaivaAU) samoista st.rows-riveistä', () => {
    expect(nauha).toContain('_vpViikkoPaivaAU(row)');
    expect(nauha).toContain('st.rows[day.iso]');
    expect(kuorma).toContain('_vpViikkoPaivaAU(r)');
    expect(kuorma).toContain('st.rows[d.iso]');
  });

  it('kuormallinen päivä saa ruudukossa aina merkinnän (ei tyhjää "napauta"-solua)', () => {
    // nauhan otsikkohaara: kesto/rpe olemassa → "Harjoitus" (tai tallennettu fokus_nimi)
    expect(nauha).toContain("else if (row.kesto_min != null || row.rpe != null) { title = esc(row.fokus_nimi || 'Harjoitus'); }");
  });

  it('erillistä viikko-fixtuuria ei ole: rivit tulevat yhdestä statesta', () => {
    const init = pura('function _vpViikkoInit(p) {');
    expect(init).toContain('rows: {}');
    expect(pura('function _vpViikkoState(p) {')).toContain('_vpViikkoInit(p)');
  });
});
