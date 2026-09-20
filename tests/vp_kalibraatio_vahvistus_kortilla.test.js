/**
 * KALIBRAATIO — pari-vahvistus valmentajakortille (löydettävyysaukko).
 *
 * LÖYDÖS (ei laskentabugi): valmentaja teki itsearvion JA havainnoinnin, mutta
 * kortin Kalibraatio-osio näytti tyhjän. Syy: `harjoitusKalibraatioHistoria`
 * laskee VAIN vahvistettuja pareja (tietoinen — ihminen vahvistaa että
 * arvioinnit koskevat samaa harjoitusta), ja vahvistusnappi (`_hlPariBlokki`
 * → "Vahvista pari") renderöityi VAIN tapahtumanäkymässä. Kortti kertoi
 * "vahvista tapahtumanäkymässä" muttei tarjonnut toimintoa.
 *
 * Portti ajaa kortin AIDON `if (!r)`-haaran lähteestä pienillä tyngillä —
 * mittaa mitä osio oikeasti renderöi, ei merkkijonoja lähdekoodista.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const juuri = join(__dir, '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const VP = lue('TalentMaster_VP_v25.html');
const NORMIT = lue('lib/tm_eerikkila_normit.js');

const mk = (id, uid, jk, tapa, pvm, extra) => Object.assign({
  _id: id, valmentajaUid: uid, joukkue: jk, arviointitapa: tapa,
  malli: 'valmennustaidot', pvm: pvm,
  vastaukset: { b1: 3, b2: 3, b3: 3, b4: 3, b5: 3, b6: 3, b7: 3 },
}, extra || {});

/** Lohko lähteestä rivien väliltä (aloitusrivi → sulkeva rivi samalla sisennyksellä). */
function lohko(alkuTunniste, loppuTunniste) {
  const i = VP.indexOf(alkuTunniste);
  expect(i, alkuTunniste + ' puuttuu').toBeGreaterThan(-1);
  const j = VP.indexOf(loppuTunniste, i);
  expect(j, loppuTunniste + ' puuttuu').toBeGreaterThan(i);
  return VP.slice(i, j);
}

/**
 * Ajaa kortin Kalibraatio-osion `!r`-haaran (= ei vahvistettua paria) ja
 * palauttaa renderöidyn HTML:n.
 */
function renderoiKalibOsio(arvioinnit) {
  const apurit = lohko('function _hlKalibTyhjaViesti(arvioinnit) {', 'window._hlVahvistaPari');
  const haara = lohko('      if (!r) {', '      else {');

  const kalEl = { innerHTML: '' };
  const runko = `
    var vpT = function (x) { return x; };
    var _hlEsc = function (x) { return String(x == null ? '' : x); };
    var _HL_KRIT_B = {};
    var laskeHarjoitusKalibraatio = function () { return { per_kriteeri: {}, ka_abs_kuilu: 0 }; };
    var _hlTorjutut = {};
    ${apurit}
    var r = null;
    ${haara}
    return kalEl.innerHTML;
  `;
  // eslint-disable-next-line no-new-func
  return new Function('_hlArvioinnit', 'arvioinnit', 'kalEl', runko)(arvioinnit, arvioinnit, kalEl);
}

describe('Kalibraatio · vahvistus valmentajakortilla', () => {
  it('EI VACUOUS: osio renderöityy ja kertoo tyhjän tilan syyn', () => {
    const a = [mk('a', 'j', 'P10', 'itsearvio', '2026-03-01')];
    const h = renderoiKalibOsio(a);
    expect(h.length, 'osio ei renderöitynyt').toBeGreaterThan(20);
    expect(h, 'tyhjä tila ei kerro mitä puuttuu').toContain('havainnointia');
  });

  it('ODOTTAVA PARI näkyy kortilla TOIMINTONA, ei vain tekstinä', () => {
    /* Juuri tämä puuttui: nappi oli olemassa mutta toisessa näkymässä. */
    const a = [
      mk('a', 'j', 'P10', 'itsearvio', '2026-03-01'),
      mk('b', 'j', 'P10', 'havainnointi', '2026-03-02'),
    ];
    const h = renderoiKalibOsio(a);
    expect(h, '"Vahvista pari" -nappi puuttuu kortilta').toContain('Vahvista pari');
    expect(h, 'nappi ei kutsu olemassa olevaa vahvistusta').toContain('_hlVahvistaPari(');
    expect(h, 'ohjaa yhä toiseen näkymään').not.toContain('vahvista tapahtumanäkymässä');
  });

  it('EI VALHEELLISTA TOIMINTOA: ilman ehdokasparia ei "Vahvista pari" -nappia', () => {
    /* Eri valmentaja → ei paria. Osio saa kertoa tilanteen, muttei tarjota
       nappia jota ei voi painaa mielekkäästi. */
    const a = [
      mk('a', 'j', 'P10', 'itsearvio', '2026-03-01'),
      mk('b', 'liisa', 'P10', 'havainnointi', '2026-03-02'),
    ];
    const h = renderoiKalibOsio(a);
    expect(h, 'nappi tarjottiin vaikka paria ei ole').not.toContain('Vahvista pari');
    /* Eikä myöskään tyhjää "Kalibraatiopari"-lohkoa: ilman ehdokasta se olisi
       pelkkää kohinaa jokaiselle parittomalle itsearviolle. */
    expect(h, 'tyhjä pariblokki renderöityi ilman ehdokasta').not.toContain('Kalibraatiopari');
  });

  it('YLI ±2 pv → ei nappia (parituksen ikkuna säilyy)', () => {
    const a = [
      mk('a', 'j', 'P10', 'itsearvio', '2026-03-01'),
      mk('b', 'j', 'P10', 'havainnointi', '2026-03-20'),
    ];
    const h = renderoiKalibOsio(a);
    expect(h, 'ikkunan ulkopuolinen pari tarjottiin').not.toContain('Vahvista pari');
    expect(h, 'tyhjä pariblokki renderöityi ikkunan ulkopuolella').not.toContain('Kalibraatiopari');
  });

  it('JO VAHVISTETTU ei enää odota — nappia ei tarjota uudelleen', () => {
    const a = [
      mk('a', 'j', 'P10', 'itsearvio', '2026-03-01', { pari_vahvistettu: true, pari_id: 'p1' }),
      mk('b', 'j', 'P10', 'havainnointi', '2026-03-02', { pari_vahvistettu: true, pari_id: 'p1' }),
    ];
    expect(renderoiKalibOsio(a), 'vahvistettu pari tarjottiin uudelleen').not.toContain('Vahvista pari');
  });

  it('LASKENTAA EI LÖYSÄTTY: vain vahvistetut parit lasketaan', () => {
    /* Tämä on tietoinen design — ihminen vahvistaa että arvioinnit koskevat
       samaa harjoitusta. Löydettävyyskorjaus EI saa muuttaa sitä. */
    const i = NORMIT.indexOf('function harjoitusKalibraatioHistoria(');
    expect(i, 'harjoitusKalibraatioHistoria puuttuu').toBeGreaterThan(-1);
    const runko = NORMIT.slice(i, i + 700);
    expect(runko, 'vahvistusfiltteri löystyi — vahvistamattomat parit laskeutuisivat mukaan')
      .toContain('a.pari_vahvistettu !== true');
  });

  it('EI OMAA VAHVISTUSLOGIIKKAA: kortti käyttää jaettua _hlPariBlokki:a', () => {
    const haara = lohko('      if (!r) {', '      else {');
    expect(haara, 'kortti ei käytä jaettua pariblokkia').toContain('_hlPariBlokki(');
    expect(haara, 'kortti rakentaa oman napin').not.toContain('Vahvista pari');
    expect(haara, 'rehellinen tyhjä katosi').toContain('_hlKalibTyhjaViesti(');
  });
});
