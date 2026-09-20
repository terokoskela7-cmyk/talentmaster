/**
 * PELAAJAN ELÄMÄKERTA — KISS-kerrokset + kaksi avointa integraatiosaumaa.
 * SSOT: docs/idp_design/ELAMAKERTA_KISS_design_kartta_v1.html
 *
 * JUURISYY: elämäkerta pinosi kolme raskasta lohkoa, ja TIHEÄ KAAVIO oli
 * ensimmäisenä → valmentaja näki käyrät ennen tarinaa. KV-verrokeilta (Kitman,
 * Wyscout) puuttuu juuri inhimillinen tarina — se on erottava mahdollisuus,
 * joten sitä ei haudata kaavion alle.
 *
 * SAUMAT ovat LUKUABSTRAKTIOITA, eivät integraatioita. Portti lukitsee sen:
 * `_klippiLahde` ei saa viedä dataa ulos, `_otteluLahde` ei saa hakea Tasoa.
 * Alaikäisen klipin säilytys + suostumusvirta on Teron/juridiikan päätös.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const M = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');

function funktio(nimi) {
  const i = M.indexOf(nimi);
  expect(i, nimi + ' puuttuu Masterista').toBeGreaterThan(-1);
  let syv = 0, loppu = -1;
  for (let k = M.indexOf('{', i); k < M.length; k++) {
    if (M[k] === '{') syv++;
    else if (M[k] === '}') { syv--; if (syv === 0) { loppu = k + 1; break; } }
  }
  return M.slice(i, loppu);
}

/** Funktio ILMAN kommentteja. Väitteet kohdistuvat KOODIIN: dokumentaatio-
    kommentti joka mainitsee kielletyn sanan (esim. "ei suoraa p.ottelut-lukua")
    laukaisi muuten portin tyhjänä — todettu tätä testiä kirjoittaessa. */
function koodi(nimi) {
  return funktio(nimi)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/** Dev-työtilan HTML-lohko (elämäkerta). */
function devHtml() {
  const a = M.indexOf('id="playerPicker"');
  const b = M.indexOf('<!-- ══ TYÖTILA: KAUSI ══ -->', a);
  expect(a, 'dev-työtilaa ei löytynyt').toBeGreaterThan(-1);
  return M.slice(a, b > 0 ? b : a + 8000);
}

describe('Elämäkerta · KISS-kerrokset ja saumat', () => {
  it('EI VACUOUS: molemmat saumat ja kerrosrenderöijät ovat olemassa', () => {
    expect(M).toContain('function _klippiLahde(');
    expect(M).toContain('function _otteluLahde(');
    expect(M).toContain('function _renderPinfo(');
    expect(M).toContain('function _renderPinfoTilastot(');
  });

  it('KERROS 2: narratiivi on ULKONA taitoksesta (tarina ennen käyriä)', () => {
    const h = devHtml();
    const iNarr = h.indexOf('id="narrativeList"');
    const iDet = h.indexOf('<details class="dev-historia"');
    expect(iNarr, 'narratiivilista puuttuu').toBeGreaterThan(-1);
    expect(iDet, 'syvennystä ei ole').toBeGreaterThan(-1);
    expect(iNarr, 'narratiivi on yhä haudattu taitoksen sisään').toBeLessThan(iDet);
  });

  it('KERROS 3 on ROMAHDETTU ja sisältää tiheän aikajanan + tilastot', () => {
    const h = devHtml();
    expect(h, 'syvennys on auki oletuksena').not.toMatch(/<details class="dev-historia"[^>]*\sopen/);
    const det = h.slice(h.indexOf('<details class="dev-historia"'));
    expect(det, 'aikajana ei ole syvennyksessä').toContain('id="tlWrap"');
    expect(det, 'tilastot eivät ole syvennyksessä').toContain('id="pinfoTilastot"');
  });

  it('KERROS 1: synteesi ei näytä viittä tilastoa eikä terveyslukuja (§4)', () => {
    const f = koodi('function _renderPinfo(');
    expect(funktio('function _renderPinfo('), 'suuntaa ei näytetä').toContain("masterT('Suunta')");
    /* ARKA DATA VAIN LIPPUNA: ei pituutta/painoa/%PAH:ia pinnalle. */
    ['pituus', 'paino', 'pah', 'istumapituus'].forEach((k) => {
      expect(f.toLowerCase(), 'terveysluku pinnalla: ' + k).not.toContain(k);
    });
  });

  it('LASKU EI OLE PUNAINEN (keskustelunavaus, ei virhe)', () => {
    const f = koodi('function _renderPinfo(');
    expect(f, 'laskusuunta värjättiin punaiseksi').not.toContain('--red');
  });

  it('SAUMA A: todiste kulkee _klippiLahde:n kautta on-demand-listassa', () => {
    const lista = funktio('async function _hkRenderLista(');
    expect(lista, 'lista lukee todisteen sauman ohi').toContain('_klippiLahde(hav)');
  });

  it('SAUMA A on LUKUABSTRAKTIO: ei ulkoista vientiä eikä tallennusta', () => {
    /* Alaikäisen klipin säilytys + suostumus on Teron/juridiikan päätös.
       Sauma kertoo ONKO todiste, ei siirrä dataa ulos sovelluksesta. */
    const f = koodi('function _klippiLahde(');
    ['sharepoint', 'graph.microsoft', 'teams', 'upload', 'fetch(', 'storage()', '.put(']
      .forEach((k) => expect(f.toLowerCase(), 'sauma vie dataa ulos: ' + k).not.toContain(k));
    expect(f, 'sauma ei tunnista taktiikkataulua').toContain('kaavio');   // koodissa: tyyppi: 'kaavio'
    expect(f, 'sauma ei tunnista videokenttää').toContain('video');
  });

  it('SAUMA B: ottelulukemat _otteluLahde:n kautta, ei suoraa p.ottelut:ia', () => {
    const f = koodi('function _renderPinfoTilastot(');
    expect(funktio('function _renderPinfoTilastot('), 'sauma ei ole käytössä').toContain('_otteluLahde(p)');
    expect(f, 'sauma ohitettu — suora p.ottelut').not.toMatch(/p\.ottelut/);
    expect(f, 'sauma ohitettu — suora p.loukk').not.toMatch(/p\.loukk/);
  });

  it('SAUMA B on LUKUABSTRAKTIO: ei Taso-hakua', () => {
    const f = koodi('function _otteluLahde(');
    ['taso', 'fetch(', 'httpsCallable', 'db.collection']
      .forEach((k) => expect(f.toLowerCase(), 'sauma hakee dataa: ' + k).not.toContain(k));
  });

  it('§26: elämäkerran render-polku ei tee Firestore-kyselyä', () => {
    const f = funktio('function _renderPinfo(') + funktio('function _renderPinfoTilastot(')
      + funktio('function _klippiLahde(') + funktio('function _otteluLahde(');
    ['.get()', '.onSnapshot(', '_db.collection('].forEach((k) => {
      expect(f, 'render-polku tekee kyselyn: ' + k).not.toContain(k);
    });
  });

  it('I18N: ei uusia avaimia — kaikki koostettu olemassa olevista (Sibbo)', () => {
    /* Ruotsia ei arvata. Jokaisella synteesin masterT-avaimella on oltava
       sv-rivi jo valmiina. */
    const f = funktio('function _renderPinfo(');
    const avaimet = [...f.matchAll(/masterT\('([^']+)'\)/g)].map((m) => m[1]);
    expect(avaimet.length, 'ei käännettyjä merkkijonoja → portti ei mittaa mitään').toBeGreaterThan(2);
    const I18N = readFileSync(join(__dir, '..', 'lib/tm_master_i18n.js'), 'utf8')
      + readFileSync(join(__dir, '..', 'lib/tm_i18n_common.js'), 'utf8');
    avaimet.forEach((k) => {
      expect(I18N.indexOf("'" + k + "':"), 'avaimelle ei ole sv-riviä: ' + k).toBeGreaterThan(-1);
    });
  });
});
