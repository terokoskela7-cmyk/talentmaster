/**
 * RAPORTOINTI — Oura × KISS -kartan kolme kerrosta + integraatiosauma.
 *
 * SSOT: "Claude outputs/RAPORTOINTI_KISS_design_kartta_v1.html".
 *   1) Oura-synteesi (sanallinen tila, rengas = DATAN KATTAVUUS, ei arvosana)
 *   2) KISS-päätöskortit (mihin VP tarttuu) — sama johdettu data kuin Kodin
 *      kriittiset signaalit, ei uutta laskentaa
 *   3) Syvennys, ROMAHDETTU
 *
 * Portti ajaa jaetun kirjaston AIDOT renderöijät ja tarkistaa VP:n kytkennät.
 * Periaatelukot (teal-only · honest-empty · §26 ei uutta kyselyä · sauma) ovat
 * niitä jotka rapautuvat hiljaa, joten ne on vartioitu erikseen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const juuri = join(__dir, '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const VP = lue('TalentMaster_VP_v25.html');
const LIB = lue('lib/tm_infografiikka.js');
const require = createRequire(import.meta.url);
const TM_INFO = require('../lib/tm_infografiikka.js');

/** Funktion runko VP:n lähteestä sulkeita laskemalla. */
function funktio(nimi) {
  const i = VP.indexOf(nimi);
  expect(i, nimi + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return VP.slice(i, loppu);
}

describe('Raportointi · Oura × KISS -infografiikka', () => {
  it('EI VACUOUS: kirjasto renderöi kaikki kartan komponentit', () => {
    expect(TM_INFO.synteesiRengas('Vahva', 0.8)).toContain('<svg');
    expect(TM_INFO.paatoskortti({ ik: '🎯', teksti: 'testi' })).toContain('testi');
    expect(TM_INFO.bulletRivi({ label: 'x', arvo: 64, viite: 55 })).toContain('64');
    expect(TM_INFO.raeJakauma({ Q1: 4, Q2: 3, Q3: 2, Q4: 1 })).toContain('Q4');
    expect(TM_INFO.kalibraatioPari(3.9, 3.2)).toContain('🪞');
  });

  it('RENGAS = datan kattavuus, EI arvosana (kaari skaalautuu kattavuudella)', () => {
    /* Kartan ydin: "5/7 yllä" -tulostaulu poistettiin tietoisesti — se on
       ranking. Renkaan on kerrottava kuinka paljon dataa on, ei kuinka hyvä
       seura on. */
    const tyhja = TM_INFO.synteesiRengas('Kerää', 0);
    const tayssi = TM_INFO.synteesiRengas('Vahva', 1);
    expect(tyhja).toContain('kattavuus');
    expect(tyhja, 'kattavuus 0 % ei näy').toContain('0%');
    expect(tayssi, 'kattavuus 100 % ei näy').toContain('100%');
    expect(tyhja).not.toBe(tayssi);
  });

  it('TEAL-ONLY: viitetason alle = himmennetty teal, EI amber/punainen', () => {
    const alle = TM_INFO.bulletRivi({ label: 'x', arvo: 40, viite: 70 });
    expect(alle, 'kehityskohde värjättiin amberiksi').not.toContain('--amber');
    expect(alle, 'kehityskohde värjättiin punaiseksi').not.toContain('--red');
    expect(alle, 'himmennettyä tealia ei käytetty').toContain('rgba(40,176,144,.42)');
    const yli = TM_INFO.bulletRivi({ label: 'x', arvo: 80, viite: 70 });
    expect(yli, 'viitteen yli ei saa täyttä tealia').toContain('var(--teal)');
  });

  it('ERO AINA LUKUNA (palkin pituus ei saa olla ainoa tieto)', () => {
    expect(TM_INFO.bulletRivi({ label: 'x', arvo: 64, viite: 55, yksikko: '%' })).toContain('+9');
    expect(TM_INFO.bulletRivi({ label: 'x', arvo: 48, viite: 55, yksikko: '%' })).toContain('-7');
  });

  it('HONEST-EMPTY: puuttuva arvo → "kertyy kun", EI nollapalkkia', () => {
    const h = TM_INFO.bulletRivi({ label: 'Valmius', arvo: null, viite: 68 });
    expect(h, 'nollapalkki näyttäisi mitatulta tulokselta').not.toContain('width:0%');
    expect(h).toContain('kertyy');
    expect(TM_INFO.raeJakauma({}), 'tyhjä RAE keksi jakauman').toContain('kertyvät');
    expect(TM_INFO.kalibraatioPari(null, 3), 'vajaa pari renderöi kuilun').toContain('kertyy');
  });

  it('VÄRI EI YKSIN: päätöskortissa aina ikoni + teksti', () => {
    const h = TM_INFO.paatoskortti({ ik: '⚖️', sev: 'amber', teksti: 'kuilu', alanimi: 'selite' });
    expect(h).toContain('⚖️');
    expect(h).toContain('kuilu');
    expect(h).toContain('selite');
  });

  it('KERROS 3 on ROMAHDETTU oletuksena (details ilman open)', () => {
    const f = funktio('function _rapRenderInfografiikka(');
    expect(f, 'syvennystä ei ole').toContain('<details');
    expect(f, 'syvennys on auki oletuksena — kartta vaatii romahdetun').not.toMatch(/<details[^>]*\sopen/);
  });

  it('§26: Raportoinnin render EI tee Firestore-kyselyä', () => {
    const f = funktio('function _rapRenderInfografiikka(') + funktio('function _rapSynteesi(')
      + funktio('function _rapKattavuus(') + funktio('function _rapRaeJakauma(');
    ['.get()', '.onSnapshot(', 'db.collection('].forEach((kielletty) => {
      expect(f, 'render-polku tekee kyselyn: ' + kielletty).not.toContain(kielletty);
    });
  });

  it('UUDELLEENKÄYTTÖ: päätöskortit käyttävät Kodin signaalilogiikkaa', () => {
    /* Kaksi rinnakkaista signaalilaskentaa ajautuisi erilleen — sama vikaluokka
       kuin lasnaolo_n. Yksi laskenta, kaksi pintaa. */
    expect(VP, 'jaettua signaalifunktiota ei ole').toContain('function _vpSignaaliKortit(');
    expect(funktio('function _rapRenderInfografiikka('), 'Raportointi laskee signaalit itse')
      .toContain('_vpSignaaliKortit()');
    expect(funktio('function renderKotiVP('), 'Koti ei käytä jaettua laskentaa')
      .toContain('_vpSignaaliKortit()');
  });

  it('KIRJASTO on puhdas: ei dataa, ei kyselyitä, ei moottoreita', () => {
    ['db.collection(', '.onSnapshot(', 'firebase.', 'laskeMirwald', 'Khamis', 'tmValmennusKaari']
      .forEach((k) => expect(LIB, 'kirjasto sisältää ' + k).not.toContain(k));
  });

  it('INTEGRAATIOSAUMA: valmius kulkee _valmiusLahde:n kautta', () => {
    /* Tuleva GPS/HR/Taso kytkeytyy vaihtamalla vain sauman sisus. Jos
       render-koodi lukee `flei_viimeisin`:iä suoraan, sauma on ohitettu. */
    expect(VP, 'saumaa ei ole').toContain('function _valmiusLahde(');
    const f = funktio('function _rapRenderInfografiikka(') + funktio('function _rapKattavuus(')
      + funktio('function _vpSignaaliKortit(') + funktio('function renderRaportointi(');
    expect(f, 'sauma ohitettu — suora flei_viimeisin render-/signaalikoodissa')
      .not.toContain('flei_viimeisin');
    expect(f, 'sauma ei ole käytössä').toContain('_valmiusLahde(');
  });

  it('SAUMA on yksi totuus: vain _valmiusLahde lukee kentän suoraan', () => {
    const sauma = funktio('function _valmiusLahde(');
    expect(sauma, 'sauma ei lue pikakenttää').toContain('flei_viimeisin');
    expect(sauma, 'vanha objektimuoto ei kelpaa').toContain('.pct');
  });
});
