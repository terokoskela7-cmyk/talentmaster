/**
 * VP TEKEE VAIN HAVAINNOINNIN — ei valmentajan itsearviota tämän puolesta.
 *
 * MIKSI: Kalibraatio-välilehden koko idea on PEILI — valmentajan OMA itsearvio
 * (malli B, Masterista) vs VP:n HAVAINNOINTI samasta harjoituksesta. Jos VP voi
 * luoda myös itsearvion, peili vertaa VP:tä itseensä ja kalibraatioluku muuttuu
 * merkityksettömäksi. Master lukitsee valmentajan jo itsearvioon
 * (`tapaLukko: true`, Master_v16:7728); VP:ltä lukko puuttui.
 *
 * TOINEN, VAKAVAMPI: `arviointitapa` on ENUM, jota verrataan kaikkialla
 * merkkijonona `=== 'havainnointi'`. VP antoi sen `vpT()`-kääreen läpi, ja
 * `lib/tm_vp_i18n.js` KÄÄNTÄÄ sen ('havainnointi' → 'observation'). Ruotsiksi
 * tallentui siis `arviointitapa:'observation'`, joka ei täsmää mihinkään
 * vertailuun → kalibraation paritus hajoaa. Tämä ei ole latentti: käännös on
 * olemassa, ja sv on kolmen pilottiseuran kieli (grifk · vifk · sibbovargarna).
 *
 * Behavioraalinen testi ajaa libin AIDON renderöinnin vm-sandboxissa pienellä
 * DOM-tynkällä — ei jsdom-riippuvuutta yhden testin vuoksi, mutta ei myöskään
 * pelkkää lähdeskannausta: portti näkee mitä lomake oikeasti tuottaa.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (p) => readFileSync(join(juuri, p), 'utf8');
const LIB = lue('lib/tm_harjoitusarviointi.js');
const VP = lue('TalentMaster_VP_v25.html');

/** Ajaa TM_HARJOITUS.avaa(opts) sandboxissa ja palauttaa lomakkeen HTML:n. */
function renderoiLomake(opts) {
  const kirjoitettu = { haInner: '' };
  const solmu = (id) => ({
    id,
    style: { cssText: '' },
    set innerHTML(v) { kirjoitettu[id] = String(v); },
    get innerHTML() { return kirjoitettu[id] || ''; },
    remove() {}, appendChild() {},
  });
  const haInner = solmu('haInner');
  const document = {
    getElementById: (id) => (id === 'haInner' ? haInner : null),
    createElement: () => solmu('luotu'),
    body: { appendChild() {} },
    querySelectorAll: () => [],
  };
  const sandbox = { document, console, Date, Math, JSON, String, Number, Object, Array };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(LIB, sandbox, { filename: 'tm_harjoitusarviointi.js' });
  sandbox.TM_HARJOITUS.avaa(opts);
  return kirjoitettu.haInner;
}

/** VP:n avauskutsu lähteestä, sulkeita laskemalla. */
function vpAvausKutsu() {
  const i = VP.indexOf('window.vpAvaaHarjoitusarviointi');
  expect(i, 'vpAvaaHarjoitusarviointi puuttuu').toBeGreaterThan(-1);
  const j = VP.indexOf('TM_HARJOITUS.avaa({', i);
  expect(j, 'TM_HARJOITUS.avaa-kutsu puuttuu').toBeGreaterThan(i);
  let syvyys = 0, loppu = -1;
  for (let k = VP.indexOf('{', j); k < VP.length; k++) {
    if (VP[k] === '{') syvyys++;
    else if (VP[k] === '}') { syvyys--; if (syvyys === 0) { loppu = k + 1; break; } }
  }
  return VP.slice(j, loppu);
}

describe('VP · harjoitusarviointi lukittu havainnointiin', () => {
  it('EI VACUOUS: lomake renderöityy sandboxissa ja sisältää mallin B kriteerit', () => {
    const h = renderoiLomake({ malliLukko: 'valmennustaidot', konteksti: { arviointitapa: 'havainnointi' } });
    expect(h.length, 'lomake ei renderöitynyt').toBeGreaterThan(200);
  });

  it('BEHAVIORAALINEN: tapaLukko → Itsearvio/Havainnointi-toggle EI renderöidy', () => {
    const h = renderoiLomake({
      malliLukko: 'valmennustaidot', tapaLukko: true,
      konteksti: { arviointitapa: 'havainnointi' },
    });
    expect(h, 'toggle renderöityi tapaLukosta huolimatta').not.toContain('_haSetTapa(');
  });

  it('EI VACUOUS: ILMAN tapaLukkoa toggle renderöityy (portti mittaa oikeaa asiaa)', () => {
    /* Ilman tätä edellinen testi läpäisisi myös silloin kun lomake ei renderöi
       mitään tai kun togglen nimi on muuttunut. */
    const h = renderoiLomake({
      malliLukko: 'valmennustaidot',
      konteksti: { arviointitapa: 'havainnointi' },
    });
    expect(h, 'toggle puuttuu myös ilman lukkoa → portti ei mittaa mitään').toContain('_haSetTapa(');
  });

  it('mallissa A togglea ei ole lukosta riippumatta (vain B:llä arviointitapa)', () => {
    const h = renderoiLomake({ malliLukko: 'palloliitto', konteksti: {} });
    expect(h).not.toContain('_haSetTapa(');
  });

  it('VP:n avauskutsu antaa tapaLukko: true', () => {
    expect(vpAvausKutsu()).toMatch(/tapaLukko:\s*true/);
  });

  it('arviointitapa on RAAKA enum, ei vpT()-kääreen läpi', () => {
    /* vpT('havainnointi') → 'observation' ruotsiksi → enum-vertailut eivät täsmää. */
    const i = VP.indexOf('window.vpAvaaHarjoitusarviointi');
    const lohko = VP.slice(i, i + 4000);
    expect(lohko, 'arviointitapa puuttuu kontekstista').toMatch(/arviointitapa:\s*'havainnointi'/);
    expect(lohko, 'arviointitapa kulkee yhä käännöksen läpi').not.toMatch(/arviointitapa:\s*vpT\(/);
  });

  it('EI VACUOUS: käännös on oikeasti olemassa — bugi ei ollut teoreettinen', () => {
    /* Jos sv-riviä ei olisi, vpT palauttaisi avaimen ja kääre olisi vaaraton.
       Se on olemassa, joten raaka enum on välttämätön eikä tyyliseikka. */
    expect(lue('lib/tm_vp_i18n.js')).toMatch(/'havainnointi':\s*'observation'/);
  });

  it('Master pitää valmentajan itsearviossa (peilin toinen puoli ennallaan)', () => {
    const m = lue('TalentMaster_Master_v16.html');
    expect(m).toMatch(/tapaLukko:\s*true/);
    expect(m).toMatch(/arviointitapa:\s*'itsearvio'/);
  });
});
