/**
 * Vaihe 0 / PR 2 · Masterin demo ilman anonyymiä kirjautumista.
 * Aiemmin loginDemo() kirjautui anonyymisti: (a) istunto korvasi saman selaimen jaetun oletusapin
 * istunnon, (b) demo yritti lukea oikean seuran (kpv) polkuja: konfiguraatio/harjoitusarviointi,
 * konfiguraatio/brandi, harjoitusarvioinnit (säännöt hylkäsivät, mutta demo ei saa yrittää).
 * Selaimessa todennettu: demo ilman käyttäjää → 0 Firestore-kutsua 19 näkymän kierroksella.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIVU = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const KOODI = SIVU.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
function pura(t) {
  const a = KOODI.indexOf(t); if (a < 0) throw new Error('ei löydy: ' + t);
  let d = 0; for (let j = KOODI.indexOf('{', a); j < KOODI.length; j++) {
    if (KOODI[j] === '{') d++; else if (KOODI[j] === '}') { d--; if (!d) return KOODI.slice(a, j + 1); }
  } throw new Error('sulkeet');
}

describe('Master · demo ilman anonyymiä', () => {
  it('loginDemo ei kirjaudu anonyymisti eikä sivulla ole signInAnonymously-kutsua', () => {
    expect(pura('async function loginDemo() {')).not.toContain('signInAnonymously');
    expect(KOODI).not.toContain('signInAnonymously');
  });
  it('loginDemo käynnistää demon ja lokalisoi (sama kuin entinen anonyymi auth-haara)', () => {
    const f = pura('async function loginDemo() {');
    expect(f).toContain('_demo = true;');
    expect(f).toContain('_kaynnistaDemoTila();');
    expect(f).toContain('masterLokalisoi()');
  });
  it('demo-vuotovartija säilyy: kirjautunut ei-anonyymi käyttäjä ei saa demoa', () => {
    expect(pura('function _kaynnistaDemoTila() {')).toContain('if (_cu && !_cu.isAnonymous)');
  });
  it('demossa saavutettavat oikean seuran luvut pysähtyvät kirjautumistarkistukseen ennen hakua', () => {
    ['window.avaaHarjoitusarviointi = async function () {', 'window.avaaValmentajaKehitys = async function () {'].forEach((t) => {
      const f = pura(t);
      const iTark = f.indexOf("if (!cu || !_seuraId)");
      expect(iTark, t).toBeGreaterThan(0);
      expect(f.indexOf('_db.collection('), t).toBeGreaterThan(iTark);
    });
  });
});
