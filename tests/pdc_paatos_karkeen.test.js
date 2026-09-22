/**
 * PDC P2 — DECISION-FIRST -PÄÄTÖSRIVI. Vartija.
 *
 * Audit §2.3 (ANALYYSI_PLAYER_DEVELOPMENT_CARD_UX_AUDIT.md): read-only PDC avautuu dataan —
 * hero + signature + grid + strip + 5 rating-solua + 7 luku-välilehteä — ja vasta KAIKEN ALLA
 * review-status. Kehityspalaverissa VP:n pitäisi nähdä heti "mikä on tämän pelaajan päätös nyt".
 * §P2: yksi rivi heti signature-rivin alle; teal vain kun toimenpide tarvitaan, muuten hiljainen.
 *
 * Päätösfunktio on PUHDAS, joten portti AJAA sen (ei greppaa): prioriteettijärjestys ja hiljainen
 * tila eivät näy lähdetekstistä. Sijainti ja tyylilukot luetaan lähteestä.
 *
 * Brief: docs/CODE_BRIEF_PDC_P2_PAATOS_KARKEEN.md (§3.3 kirjaa kaksi tulkintaa joita audit ei ratkaise).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const vaadi = createRequire(import.meta.url);
const { laskeReviewKadenssi } = vaadi('../lib/tm_eerikkila_normit.js');
const { idpJumissa } = vaadi('../lib/tm_idp.js');

/** Funktiorunko lähteestä (sulkulaskuri). */
function funktio(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('sulkuja ei saatu tasan: ' + tunniste);
}

/** _rvcSitoumusOdottaa kopioituna lähteestä (sama logiikka kuin VP:ssä). */
const RUNKO_SITOUMUS = funktio('function _rvcSitoumusOdottaa(p) {');

/** Aja _pdcPaatos lähteestä puretulla rungolla, kanoniset libit oikeina. */
function paatos(p, nyt) {
  const runko = funktio('window._pdcPaatos = function (p, nyt) {');
  const ymparisto = {
    laskeReviewKadenssi: laskeReviewKadenssi,
    idpJumissa: idpJumissa,
    vpT: (t) => t,
    tmPvmFi: (iso) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
      return m ? m[3] + '.' + m[2] + '.' + m[1] : null;
    },
    window: {},
  };
  const nimet = Object.keys(ymparisto);
  const koodi = RUNKO_SITOUMUS + '\n'
    + runko.replace(/^window\./, 'var _fn = ') + '\n'
    + 'return _fn(_p, _nyt);';
  // eslint-disable-next-line no-new-func
  return new Function(...nimet, '_p', '_nyt', koodi)(...nimet.map((k) => ymparisto[k]), p, nyt);
}

const NYT = new Date('2026-09-22T12:00:00Z').getTime();
const PV = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Pelaaja jolla EI ole yhtään avointa toimenpidettä (perustapaus, jota muunnellaan). */
function puhdas(lisa) {
  return Object.assign({
    syntymaVuosi: 2013,
    joukkue: 'SJK P13',
    review_viimeisin_pvm: iso(NYT - 5 * PV),           // tuore review → ajantasalla
    jaksofokus: { konsepti_nimi: 'Saattaen vaihtaminen', konsepti_avain: 'x', alkoi: iso(NYT - 7 * PV), kesto_vk: 4 },
    _idpTavoite: { luotu: iso(NYT - 10 * PV), status: 'aktiivinen' },
    idp_sitoumus_pvm: null,
  }, lisa || {});
}

describe('PDC P2 · päätösfunktio — prioriteetti ja tila', () => {
  it('EI VACUOUS: perustapaus on hiljainen, ei toimenpide', () => {
    const d = paatos(puhdas(), NYT);
    expect(d).toBeTruthy();
    expect(d.tila).toBe('hiljainen');
  });

  it('1. review myöhässä voittaa kaiken muun', () => {
    const d = paatos(puhdas({
      review_viimeisin_pvm: iso(NYT - 400 * PV),                 // reilusti yli kaistan
      jaksofokus: null,                                          // myös #4 täyttyy
      _idpTavoite: { luotu: iso(NYT - 200 * PV), status: 'aktiivinen' },   // myös #2 täyttyy
      idp_sitoumus_pvm: iso(NYT - 3 * PV),                       // myös #3 täyttyy
    }), NYT);
    expect(d.avain).toBe('review_myohassa');
    expect(d.tila).toBe('toimenpide');
  });

  it('2. kausitavoite jumissa 8 vk (kun review kunnossa)', () => {
    const d = paatos(puhdas({
      _idpTavoite: { luotu: iso(NYT - 200 * PV), status: 'aktiivinen' },
      idp_sitoumus_pvm: iso(NYT - 3 * PV),     // #3 täyttyy myös → #2 voittaa
    }), NYT);
    expect(d.avain).toBe('idp_jumissa');
    expect(d.tila).toBe('toimenpide');
  });

  it('3. sitoumus odottaa vahvistusta (kun review + tavoite kunnossa)', () => {
    const d = paatos(puhdas({
      idp_sitoumus_pvm: iso(NYT - 3 * PV),
      idp_sitoumus_vahv_jakso: null,           // eri kuin jaksofokus.alkoi → odottaa
    }), NYT);
    expect(d.avain).toBe('sitoumus');
    expect(d.tila).toBe('toimenpide');
  });

  it('3b. vahvistettu sitoumus EI laukaise toimenpidettä', () => {
    const alkoi = iso(NYT - 7 * PV);
    const d = paatos(puhdas({
      idp_sitoumus_pvm: iso(NYT - 3 * PV),
      idp_sitoumus_vahv_jakso: alkoi,          // vahvistettu tälle jaksolle
      jaksofokus: { konsepti_nimi: 'x', konsepti_avain: 'x', alkoi: alkoi, kesto_vk: 4 },
    }), NYT);
    expect(d.tila).toBe('hiljainen');
  });

  it('4. ei jaksofokusta', () => {
    const d = paatos(puhdas({ jaksofokus: null }), NYT);
    expect(d.avain).toBe('ei_jaksofokusta');
    expect(d.tila).toBe('toimenpide');
  });

  it('5. review erääntymässä (pehmeä takaraja, pp.kk.vvvv)', () => {
    // ikä 13 → kaista 42 pv, erääntymässä kun ≤14 pv jäljellä
    const d = paatos(puhdas({ review_viimeisin_pvm: iso(NYT - 35 * PV) }), NYT);
    expect(d.avain).toBe('review_eraantymassa');
    expect(d.tila).toBe('toimenpide');
    expect(d.korostus, 'pvm ei ole pp.kk.vvvv-muodossa').toMatch(/^\d{2}\.\d{2}\.\d{4}/);
  });

  it('hiljainen tila erottaa X-Factorin ja nimeämättömän kärkivahvuuden', () => {
    const ilman = paatos(puhdas(), NYT);
    const xf = paatos(puhdas({ signaali: 'xfactor' }), NYT);
    expect(ilman.avain).toBe('ei_xfactoria');
    expect(xf.avain).toBe('xfactor');
    expect(xf.tila).toBe('hiljainen');           // harvinainen signaali ei saa varata tealia (brief §3.3)
    expect(ilman.teksti).not.toBe(xf.teksti);
  });

  it('DETERMINISTINEN: nyt injektoidaan, ei Date.now()-riippuvuutta', () => {
    const p = puhdas({ review_viimeisin_pvm: iso(NYT - 35 * PV) });
    expect(paatos(p, NYT).avain).toBe(paatos(p, NYT).avain);
    // sama pelaaja 60 pv myöhemmin → review on jo myöhässä
    expect(paatos(p, NYT + 60 * PV).avain).toBe('review_myohassa');
  });

  it('null-pelaaja → null (ei kaadu)', () => {
    expect(paatos(null, NYT)).toBeNull();
  });
});

describe('PDC P2 · sijainti ja lukot lähteessä', () => {
  it('päätösrivi renderöityy signature-rivin JÄLKEEN (molemmissa linsseissä)', () => {
    const f = funktio('function _renderMDTProfiili() {');
    const sig = f.lastIndexOf("class=\"pdc-sig\"");
    const paat = f.indexOf('_pdcPaatosHTML(p)');
    expect(sig, 'signature-riviä ei löydy').toBeGreaterThan(-1);
    expect(paat, 'päätösriviä ei renderöidä').toBeGreaterThan(-1);
    expect(paat, 'päätösrivi ei ole signature-rivin jälkeen').toBeGreaterThan(sig);
    // if/else-lohkon ULKOPUOLELLA → näkyy myös scouting-linssissä
    const scoutSig = f.indexOf('Scouting-näkymä');
    expect(paat).toBeGreaterThan(scoutSig);
  });

  it('§5-lukko: päätösrivin tyylissä teal, EI amberia/punaista', () => {
    const tyyli = VP.slice(VP.indexOf('.pdc-paatos{'), VP.indexOf('.pdc-paatos.hiljainen') + 200);
    expect(tyyli).toContain('var(--teal)');
    expect(tyyli).not.toContain('--amber');
    expect(tyyli).not.toContain('--red');
  });

  it('§26-lukko: päätösfunktio ei tee kyselyjä', () => {
    const runko = funktio('window._pdcPaatos = function (p, nyt) {');
    expect(runko).not.toContain('.collection(');
    expect(runko).not.toContain('.get(');
    expect(runko).not.toContain('await');
  });

  it('kanoniset lähteet, ei omaa laskentaa', () => {
    const runko = funktio('window._pdcPaatos = function (p, nyt) {');
    expect(runko).toContain('laskeReviewKadenssi(');
    expect(runko).toContain('idpJumissa(');
    expect(runko).toContain('_rvcSitoumusOdottaa(');
  });

  it('TERMILUKKO: käyttäjästringeissä "katselmus", EI "Review" (docs/SEURANTA_KATSELMUS_CODE_BRIEF.md)', () => {
    const runko = funktio('window._pdcPaatos = function (p, nyt) {');
    // Funktion nimi laskeReviewKadenssi on koodia, ei käyttäjätekstiä → rajaus vpT()-stringeihin.
    const vpTStringit = (runko.match(/vpT\('([^']*)'\)/g) || []).join(' | ');
    expect(vpTStringit, 'P2:n käyttäjästringissä on yhä "Review"').not.toMatch(/Review/i);
    expect(vpTStringit).toContain('Katselmus on');
    expect(vpTStringit).toContain('Katselmus erääntyy');
  });
});
