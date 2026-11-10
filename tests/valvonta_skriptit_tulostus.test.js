/** Projekti 07 / PR 1: laajuus_vieraat_toimenpiteet.js ja diag_hiljaiset_rajat.js kutsuvat lib/tm_valvonta.js:ää, mutta TULOSTUS EI MUUTU.
 *  Golden-tiedostot (tests/fixtures/valvonta/*.golden.txt) on tuotettu ENNEN refaktorointia origin/mainin skripteillä samalla deterministisellä vale-Firestorella
 *  (fake_admin.cjs, -r hook korvaa firebase-adminin). Päiväys normalisoidaan (kalenteri_ikkuna riippuu ajopäivästä). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = join(ROOT, 'tests/fixtures/valvonta');
const norm = (t) => t.replace(/pvm ≥ \d{4}-\d{2}-\d{2}/g, 'pvm ≥ <alku>');
function aja(skripti, ...args) {
  const r = spawnSync('node', ['-r', join(FIX, 'fake_admin.cjs'), join(ROOT, 'scripts', skripti), ...args], { cwd: ROOT, encoding: 'utf8' });
  expect(r.status, r.stderr).toBe(0);
  return norm(r.stdout + r.stderr);
}
const golden = (f) => norm(readFileSync(join(FIX, f), 'utf8'));

describe('skriptien tulostus ennallaan (golden = ennen libiin siirtoa)', () => {
  it('laajuus_vieraat_toimenpiteet.js', () => { expect(aja('laajuus_vieraat_toimenpiteet.js')).toBe(golden('laajuus.golden.txt')); });
  it('diag_hiljaiset_rajat.js', () => { expect(aja('diag_hiljaiset_rajat.js')).toBe(golden('diag.golden.txt')); });
  it('diag_hiljaiset_rajat.js --pelaajat', () => { expect(aja('diag_hiljaiset_rajat.js', '--pelaajat')).toBe(golden('diag_pelaajat.golden.txt')); });
  it('golden ei ole vacuous: sisältää toisen seuran joukkueen, tuplaid:n ja YLITTYY/LÄHELLÄ-rivit', () => {
    expect(golden('laajuus.golden.txt')).toMatch(/joista toisen seuran joukkue [1-9]/);
    expect(golden('laajuus.golden.txt')).toMatch(/sama id usealla seuralla [1-9]/);
    expect(golden('diag.golden.txt')).toMatch(/YLITTYY/); expect(golden('diag.golden.txt')).toMatch(/LÄHELLÄ/);
  });
});
