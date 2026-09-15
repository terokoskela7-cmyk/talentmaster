/**
 * IDP_Kortti_v4 · libit lib/:stä suhteellisella polulla.
 *
 * JUURISYY JOTA TÄMÄ VARTIOI: hpp_rehab_protokollat.js + tm_ketju_matriisi.js siirrettiin juuresta
 * src/lib/:hen (8f2faf48 / 4a643338), mutta IDP_Kortin latausrivit jäivät osoittamaan VANHAAN
 * ABSOLUUTTISEEN Pages-juuripolkuun. Seuraus oli HILJAINEN: kortti lukee globaalia typeof-vartion
 * takaa (`window.HPP_REHAB_PROTOKOLLAT ? … : {}`), joten 404 ei näkynyt virheenä vaan tyhjänä
 * klinikkadatana. Verifioitu tuotannosta ennen korjausta: molemmat juuripolut = 404.
 *
 * Kaksi eri invarianttia, molemmat tarvitaan:
 *  (1) SIJAINTI — libit ovat lib/:ssä (tarjoiltava kansio molemmilla originilla; src/** on
 *      Firebase Hostingin ignoressa, joten src/lib ei olisi kannettava V3-cutoverissa).
 *  (2) SUHTEELLISUUS — resurssilatauksissa ei absoluuttista Pages-originia (#486:n periaate).
 *      Absoluuttinen URL "toimii" Pagesissa ja hajoaa vasta toisella originilla → juuri se
 *      luokka jota gate ei muuten näe ennen cutoveria.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const LIBIT = ['hpp_rehab_protokollat.js', 'tm_ketju_matriisi.js'];

describe('sijainti', () => {
  it.each(LIBIT)('%s on lib/:ssä', (n) => {
    expect(existsSync(join(juuri, 'lib', n)), 'puuttuu lib/:stä').toBe(true);
  });
  it.each(LIBIT)('%s ei ole enää src/lib/:ssä', (n) => {
    expect(existsSync(join(juuri, 'src', 'lib', n)), 'jäi src/lib/:hen → ei tarjoiltu Hostingissa').toBe(false);
  });
});

describe('IDP_Kortti_v4 · latauspolut', () => {
  const html = () => lue('TalentMaster_IDP_Kortti_v4.html');
  it.each(LIBIT)('lataa %s suhteellisesti lib/:stä', (n) => {
    expect(html()).toMatch(new RegExp('<script src="lib/' + n.replace(/\./g, '\\.') + '(\\?v=\\d+)?"'));
  });
  it('ei absoluuttista Pages-URL:ää näihin libeihin', () => {
    for (const n of LIBIT) expect(html()).not.toContain('github.io/talentmaster/' + n);
  });
});

/* Elävä = juuri + lib. archive/ on rajattu pois Pages-julkaisusta (#488) → sen vanhat
   absoluuttiset latausrivit eivät ole tarjoiltuja eivätkä siksi tämän portin piirissä. */
function elavat() {
  const ulos = readdirSync(juuri)
    .filter((n) => /\.(html|js)$/.test(n) && statSync(join(juuri, n)).isFile());
  return ulos.concat(readdirSync(join(juuri, 'lib')).filter((n) => n.endsWith('.js')).map((n) => 'lib/' + n));
}

describe('sweep · vanhat polut eivät saa palata', () => {
  it('yksikään elävä tiedosto ei viittaa src/lib- tai Pages-juuripolkuun', () => {
    const re = /src\/lib\/(hpp_rehab_protokollat|tm_ketju_matriisi)|github\.io\/talentmaster\/(hpp_rehab_protokollat|tm_ketju_matriisi)/g;
    const vuodot = [];
    for (const f of elavat()) for (const m of lue(f).matchAll(re)) vuodot.push(f + ': ' + m[0]);
    expect(vuodot).toEqual([]);
  });
  it('yksikään elävä HTML ei lataa SKRIPTIÄ tai TYYLIÄ absoluuttisesta Pages-originista', () => {
    // Yleisempi kuin nämä kaksi libiä: sama vika toistuisi muuten seuraavassa tiedostossa.
    // HUOM: koskee vain resurssilatauksia — navigointi-/jakolinkit ovat eri luokka (V3-asia).
    const re = /<(?:script|link)[^>]*(?:src|href)="https:\/\/terokoskela7-cmyk\.github\.io[^"]*"/g;
    const vuodot = [];
    for (const f of elavat().filter((x) => x.endsWith('.html'))) {
      for (const m of lue(f).matchAll(re)) vuodot.push(f + ': ' + m[0].slice(0, 90));
    }
    expect(vuodot).toEqual([]);
  });
});

/* Globaali on se mitä IDP_Kortti oikeasti lukee (getKliniikkaData → window.HPP_REHAB_PROTOKOLLAT).
   Ajetaan libit vm-sandboxissa selainkontekstissa — pelkkä tiedoston olemassaolo ei todista että
   globaali määrittyy (siirto olisi voinut katkaista sen). */
describe('globaalit määrittyvät selainkontekstissa (ajettu)', () => {
  function sandbox() {
    const sb = { console: { log() {}, warn() {}, error() {} } };
    sb.window = sb;
    vm.createContext(sb);
    for (const n of LIBIT) {
      const p = join(juuri, 'lib', n);
      if (!existsSync(p)) throw new Error('lib/' + n + ' puuttuu — siirto kesken?');
      vm.runInContext(readFileSync(p, 'utf8'), sb);
    }
    return sb;
  }

  it('window.HPP_REHAB_PROTOKOLLAT on olemassa ja ei-tyhjä (IDP_Kortin klinikkadata)', () => {
    const sb = sandbox();
    expect(typeof sb.window.HPP_REHAB_PROTOKOLLAT).toBe('object');
    expect(Object.keys(sb.window.HPP_REHAB_PROTOKOLLAT).length).toBeGreaterThan(0);
  });
  it('tm_ketju_matriisin globaalit määrittyvät (vaikka IDP_Kortti ei niitä vielä käytä)', () => {
    const sb = sandbox();
    expect(typeof sb.TM_KETJU_MATRIISI).toBe('object');
    expect(typeof sb.TM_TESTIN_KETJUT).toBe('function');
  });
  it('IDP_Kortin lukupolku tuottaa dataa (ei tyhjää objektia kuten 404-tilassa)', () => {
    const sb = sandbox();
    const getKliniikkaData = () => (sb.window && sb.window.HPP_REHAB_PROTOKOLLAT) ? sb.window.HPP_REHAB_PROTOKOLLAT : {};
    expect(Object.keys(getKliniikkaData()).length).toBeGreaterThan(5);
  });
});
