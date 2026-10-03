/**
 * HOTFIX: ADAR avautui aina viimeksi avatun pelaajan (Topias) kortille, koska Master välitti `_activePelaaja`-muistin
 * iframelle myös yleisistä/joukkuetason sisäänkäynneistä. Nyt: pelaaja välitetään VAIN pelaajan omalta kortilta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASTER = readFileSync(resolve(__dirname, '../TalentMaster_Master_v16.html'), 'utf8');

function adarHaara() {
  const i = MASTER.indexOf("} else if (type === 'adar') {");
  expect(i, 'ADAR-haaraa ei löydy').toBeGreaterThan(-1);
  const j = MASTER.indexOf('return;', i);
  return MASTER.slice(i + "} else if (type === 'adar') {".length, j + 'return;'.length);
}
/** Ajaa OIKEAN haaran koodin; palauttaa mitä _avaaPikakorttiIframe sai. */
function ajaHaara(pidArg, activePelaaja) {
  const saatu = [];
  const ctx = vm.createContext({ _activePelaaja: activePelaaja, _avaaPikakorttiIframe: (p) => saatu.push(p), pid: pidArg });
  vm.runInContext('(function(){' + adarHaara() + '})()', ctx);
  return saatu;
}

describe('Master · ADAR-avaus (hotfix: ei oletuspelaajaa muistista)', () => {
  it('EI VACUOUS: haara kutsuu _avaaPikakorttiIframe-funktiota', () => {
    expect(ajaHaara('p9', 'teemu')).toHaveLength(1);
  });
  it('Master: aktiivinen pelaaja A, yleinen ADAR-avaus (ei pid) → pelaajaa EI välitetä (lista)', () => {
    expect(ajaHaara(undefined, 'topias')).toEqual(['']);
    expect(ajaHaara('', 'topias')).toEqual(['']);
  });
  it('avaus pelaajan kortilta (pid annettu) → välitetään täsmälleen se pelaaja, ei muistissa olevaa', () => {
    expect(ajaHaara('pB', 'pA')).toEqual(['pB']);
  });
  it('openDrill-allekirjoitus ottaa pid:n; ADAR-haara ei lue _activePelaaja-muistia', () => {
    expect(MASTER).toContain('function openDrill(type, pid) {');
    expect(adarHaara().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')).not.toContain('_activePelaaja');
  });
  it('joukkuetason sisäänkäynnit kutsuvat ilman pid:tä, pelaajakortit pid:n kanssa', () => {
    const kaikki = MASTER.match(/openDrill\(\\?'adar\\?'(,[^)]*)?\)/g) || [];
    const pidilla = kaikki.filter((x) => x.includes(','));
    const ilman = kaikki.filter((x) => !x.includes(','));
    expect(pidilla.length, 'pelaajakorttien kutsut (pid)').toBe(2);
    expect(ilman.length, 'yleiset sisäänkäynnit').toBeGreaterThanOrEqual(5);
  });
});
