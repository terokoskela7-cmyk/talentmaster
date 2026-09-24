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

  it('3. kauden tavoite jumissa 8 vk (kun review + ehdotus kunnossa)', () => {
    const d = paatos(puhdas({
      _idpTavoite: { luotu: iso(NYT - 200 * PV), status: 'aktiivinen' },
      idp_sitoumus_pvm: iso(NYT - 3 * PV),     // #3 täyttyy myös → #2 voittaa
    }), NYT);
    expect(d.avain).toBe('idp_jumissa');
    expect(d.tila).toBe('toimenpide');
  });

  it('4. sitoumus odottaa vahvistusta (kun review + tavoite kunnossa)', () => {
    const d = paatos(puhdas({
      idp_sitoumus_pvm: iso(NYT - 3 * PV),
      idp_sitoumus_vahv_jakso: null,           // eri kuin jaksofokus.alkoi → odottaa
    }), NYT);
    expect(d.avain).toBe('sitoumus');
    expect(d.tila).toBe('toimenpide');
  });

  it('4b. vahvistettu sitoumus EI laukaise toimenpidettä', () => {
    const alkoi = iso(NYT - 7 * PV);
    const d = paatos(puhdas({
      idp_sitoumus_pvm: iso(NYT - 3 * PV),
      idp_sitoumus_vahv_jakso: alkoi,          // vahvistettu tälle jaksolle
      jaksofokus: { konsepti_nimi: 'x', konsepti_avain: 'x', alkoi: alkoi, kesto_vk: 4 },
    }), NYT);
    expect(d.tila).toBe('hiljainen');
  });

  it('5. jaksolle ei ole valittu harjoiteltavaa taitoa', () => {
    const d = paatos(puhdas({ jaksofokus: null }), NYT);
    expect(d.avain).toBe('ei_jaksofokusta');
    expect(d.tila).toBe('toimenpide');
  });

  it('6. review erääntymässä (pehmeä takaraja, pp.kk.vvvv)', () => {
    // ikä 13 → kaista 42 pv, erääntymässä kun ≤14 pv jäljellä
    const d = paatos(puhdas({ review_viimeisin_pvm: iso(NYT - 35 * PV) }), NYT);
    expect(d.avain).toBe('review_eraantymassa');
    expect(d.tila).toBe('toimenpide');
    expect(d.korostus, 'pvm ei ole pp.kk.vvvv-muodossa').toMatch(/^\d{2}\.\d{2}\.\d{4}/);
  });

  /* PR B · A — VALMENTAJAN EHDOTUS ODOTTAA TARKISTUSTA. #619 erotti tallennetun ehdotuksen
     luonnokseksi (_idpLuonnos), joten se ei enää näy voimassa olevana tavoitteena — mutta ilman tätä
     tilaa se ei näkyisi palaverissa LAINKAAN. */
  const EHDOTUS = { luotu: '2026-09-20', status: 'ehdotettu', fokus: { nimi: 'Monipuolisuus' } };

  it('2. tallennettu ehdotus odottaa → toimenpide + painikeavain', () => {
    const d = paatos(puhdas({ _idpLuonnos: EHDOTUS, _luonnosTallennettu: true }), NYT);
    expect(d.avain).toBe('ehdotus_odottaa');
    expect(d.tila).toBe('toimenpide');
    expect(d.teksti).toBe('Valmentaja ehdotti uutta kauden tavoitetta —');
    expect(d.korostus).toBe('tarkista ja ota käyttöön.');
    expect(d.nappi, 'painikeavain puuttuu → laatikossa ei ole toimintaa').toBe('tarkista_ehdotus');
  });

  it('2b. ehdotus voittaa jumissa-tilan (tarkistus ON se "päivitä tai vaihda")', () => {
    const d = paatos(puhdas({
      _idpTavoite: { luotu: iso(NYT - 200 * PV), status: 'aktiivinen' },   // #3 täyttyy
      _idpLuonnos: EHDOTUS, _luonnosTallennettu: true,
    }), NYT);
    expect(d.avain).toBe('ehdotus_odottaa');
  });

  it('2c. review myöhässä voittaa ehdotuksen (kova takaraja pysyy kärjessä)', () => {
    const d = paatos(puhdas({
      review_viimeisin_pvm: iso(NYT - 400 * PV),
      _idpLuonnos: EHDOTUS, _luonnosTallennettu: true,
    }), NYT);
    expect(d.avain).toBe('review_myohassa');
  });

  it('2d. TALLENTAMATON luonnos ei ole toimenpide (VP:n oma kesken jäänyt muokkaus)', () => {
    const d = paatos(puhdas({ _idpLuonnos: EHDOTUS, _luonnosTallennettu: false }), NYT);
    expect(d.avain, 'oma muokkaus näkyi valmentajan ehdotuksena').not.toBe('ehdotus_odottaa');
    expect(d.tila).toBe('hiljainen');
  });

  it('2e. jo hyväksytty luonnos ei ole toimenpide', () => {
    const d = paatos(puhdas({
      _idpLuonnos: { luotu: '2026-09-20', status: 'aktiivinen' }, _luonnosTallennettu: true,
    }), NYT);
    expect(d.avain).not.toBe('ehdotus_odottaa');
  });

  it('B · jumissa-teksti on "Kauden tavoite", ei vanhaa "Kausitavoite"', () => {
    const d = paatos(puhdas({ _idpTavoite: { luotu: iso(NYT - 200 * PV), status: 'aktiivinen' } }), NYT);
    expect(d.teksti).toBe('Kauden tavoite ei ole edennyt');
    expect(d.korostus, '8 vk -kynnyslogiikka ei muutu').toBe('8 viikkoon — päivitä tai vaihda.');
  });

  it('C · tyhjä jakso on YKSI lause, ei fragmenttiparia', () => {
    const d = paatos(puhdas({ jaksofokus: null }), NYT);
    expect(d.teksti).toBe('Jaksolle ei ole valittu harjoiteltavaa taitoa.');
    expect(d.korostus, 'fragmenttipari jäi käyttöön').toBeNull();
    expect(d.teksti, 'sisäinen termi "jaksofokus" jäi rivitekstiin').not.toContain('jaksofokus');
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

  /* PR B — PAINIKE: renderöijä päättää painikkeen semanttisesta avaimesta (funktio pysyy puhtaana).
     Raportti on read-only (#615), joten toiminto on YKSI siirtymä cockpittiin — ei editoria. */
  function renderoi(d, pid) {
    const runko = funktio('function _pdcPaatosHTML(p, nyt) {');
    const ymparisto = { window: { _pdcPaatos: () => d }, _jsvEsc: (s) => String(s == null ? '' : s), vpT: (s) => s };
    const nimet = Object.keys(ymparisto);
    // eslint-disable-next-line no-new-func
    return new Function(...nimet, '_p', runko + '\nreturn _pdcPaatosHTML(_p, 0);')(
      ...nimet.map((k) => ymparisto[k]), { id: pid || 'p1' });
  }

  it('painike renderöityy VAIN kun päätös nimeää sen', () => {
    const kanssa = renderoi({ avain: 'ehdotus_odottaa', tila: 'toimenpide', teksti: 'x', korostus: null, nappi: 'tarkista_ehdotus' });
    expect(kanssa).toContain('Tarkista ehdotus');
    expect(kanssa, 'painike ei johda tarkistuspolkuun').toContain("_pdcSiirryCockpittiin('p1',3)");
    const ilman = renderoi({ avain: 'idp_jumissa', tila: 'toimenpide', teksti: 'x', korostus: null });
    expect(ilman, 'painike vuoti muihin tiloihin').not.toContain('<button');
  });

  it('READ-ONLY: painike ei kutsu editoria eikä globaalia _vpArvPelaaja:aa', () => {
    const h = renderoi({ avain: 'ehdotus_odottaa', tila: 'toimenpide', teksti: 'x', korostus: null, nappi: 'tarkista_ehdotus' });
    expect(h).not.toContain('_vpArvPelaaja');
    expect(h).not.toContain('_vpVaihtoAvaa');
    expect(h).not.toContain('_vpTallennaTavoite');
  });

  it('VANHAT TEKSTIT poistettu lähteestä ja sv-kartasta', () => {
    const I18N = readFileSync(join(juuri, 'lib/tm_vp_i18n.js'), 'utf8');
    for (const vanha of ['Kausitavoite ei ole edennyt', 'Ei jaksofokusta —', 'aseta se kehitystyöpöydässä.']) {
      expect(VP, 'vanha teksti jäi VP:hen: ' + vanha).not.toContain("vpT('" + vanha + "')");
      expect(I18N, 'vanha avain jäi sv-karttaan: ' + vanha).not.toContain("'" + vanha + "':");
    }
  });

  it('sv: viisi uutta avainta ovat sanktioidusta erästä', () => {
    const SV = vaadi('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
    expect(SV['Valmentaja ehdotti uutta kauden tavoitetta —']).toBe('Tränaren föreslog ett nytt säsongsmål —');
    expect(SV['tarkista ja ota käyttöön.']).toBe('granska och aktivera det.');
    expect(SV['Tarkista ehdotus']).toBe('Granska förslag');
    expect(SV['Kauden tavoite ei ole edennyt']).toBe('Säsongens mål har inte framskridit på');
    expect(SV['Jaksolle ei ole valittu harjoiteltavaa taitoa.']).toBe('Ingen färdighet att träna har valts för perioden.');
  });

  it('sv-tilassa laatikko ei vuoda suomea', () => {
    const SV = vaadi('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
    const kaanna = (s) => (SV[s] != null ? SV[s] : s);
    for (const [fi, sv] of [
      ['Valmentaja ehdotti uutta kauden tavoitetta —', 'Tränaren föreslog ett nytt säsongsmål —'],
      ['Kauden tavoite ei ole edennyt', 'Säsongens mål har inte framskridit på'],
      ['Jaksolle ei ole valittu harjoiteltavaa taitoa.', 'Ingen färdighet att träna har valts för perioden.'],
      ['Tarkista ehdotus', 'Granska förslag'],
    ]) {
      expect(kaanna(fi)).toBe(sv);
      expect(kaanna(fi)).not.toBe(fi);
    }
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

  it('TERMILUKKO: käyttäjästringeissä "kehityskeskustelu", EI "Review" eikä "Katselmus"', () => {
    /* PR B (B6) vei termin loppuun asti: "Katselmus" oli yhä sisäistä kieltä — käyttäjä pitää
       kehityskeskustelun. Lukko on sama, sallittu muoto vain vaihtui. _pdcPaatos on jaettu
       PDC:n ja cockpitin Seuraava askel -laatikon kanssa, joten teksti vaihtuu molemmissa. */
    const runko = funktio('window._pdcPaatos = function (p, nyt) {');
    // Funktion nimi laskeReviewKadenssi on koodia, ei käyttäjätekstiä → rajaus vpT()-stringeihin.
    const vpTStringit = (runko.match(/vpT\('([^']*)'\)/g) || []).join(' | ');
    expect(vpTStringit, 'P2:n käyttäjästringissä on yhä "Review"').not.toMatch(/Review/i);
    expect(vpTStringit, 'P2:n käyttäjästringissä on yhä "Katselmus"').not.toMatch(/katselmu/i);
    expect(vpTStringit).toContain('Kehityskeskustelu on');
    expect(vpTStringit).toContain('Kehityskeskustelu viimeistään');
  });
});
