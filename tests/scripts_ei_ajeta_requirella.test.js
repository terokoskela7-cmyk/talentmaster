/**
 * Tuotantodataa käsittelevä skripti (scripts/*, käyttää firebase-admin) EI saa käynnistää ajoa pelkällä require()-kutsulla (vahinkoajo tuotantoa vasten; S1: kooste_takaisinlasku.js).
 * Jokainen tällainen skripti ladataan eristetyssä prosessissa, jossa firebase-admin on korvattu valvotulla stubilla (tests/fixtures/stub_firebase_admin.cjs):
 * minkä tahansa admin-kutsun (initializeApp, firestore, apps …) täytyy jäädä tekemättä. Sallittu: require heittää selkeän "aja suoraan" -virheen TAI lataus onnistuu ilman admin-kutsuja.
 * Lisäksi: suora ajo (`node scripts/X.js`) on yhä mahdollinen (require.main === module).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKRIPTIT = readdirSync(join(juuri, 'scripts')).filter((f) => /\.(js|cjs)$/.test(f)).filter((f) => /firebase-admin|\.\.\/functions\/seuran_kooste/.test(readFileSync(join(juuri, 'scripts', f), 'utf8')));

describe('tuotantoskriptit: require ei käynnistä ajoa', () => {
  it('löytyy tuotantoa käsitteleviä skriptejä (vartija ei ole tyhjä)', () => { expect(SKRIPTIT.length).toBeGreaterThan(15); expect(SKRIPTIT).toContain('kooste_takaisinlasku.js'); });
  for (const f of SKRIPTIT) {
    it('scripts/' + f + ': require() ei tee yhtään firebase-admin-kutsua', () => {
      const koodi = `let virhe=null;try{require(${JSON.stringify(join(juuri, 'scripts', f))})}catch(e){virhe=String(e&&e.message||e)}process.stdout.write(JSON.stringify({kutsut:global.__fbKutsut,virhe}))`;
      const r = spawnSync('node', ['-r', join(juuri, 'tests/fixtures/stub_firebase_admin.cjs'), '-e', koodi], { cwd: juuri, encoding: 'utf8', timeout: 20000, env: Object.assign({}, process.env, { TM_AJA: '' }) });
      const ulos = JSON.parse(r.stdout.slice(r.stdout.lastIndexOf('{"kutsut"')) || '{"kutsut":["?"],"virhe":"ei tulostetta: ' + String(r.stderr).slice(0, 120) + '"}');
      expect(ulos.kutsut, f + ' kutsui firebase-adminia requirella: ' + ulos.virhe).toEqual([]);
      if (ulos.virhe) expect(ulos.virhe).toMatch(/aja suoraan|TUOTANTO|node scripts\//i);   // jos heittää, virheen on oltava tarkoituksellinen
    }, 30000);
  }
  it('kooste_takaisinlasku.js: main() vain require.main === module', () => { expect(readFileSync(join(juuri, 'scripts/kooste_takaisinlasku.js'), 'utf8')).toMatch(/if \(require\.main === module\)\s*\{?\s*main\(\)/); });
});
