/* B11 (7.11.2026): scripts/i18n_luo_gemini_era.cjs ei saa ylikirjoittaa palautettua erää (#1210:ssä ajo pudotti erän 2 1374 → 149 riviä ja tyhjensi täytetyt sv:t).
 * Skripti kieltäytyy (exit ≠ 0, tiedosto ennallaan), jos erällä on palautus tai jos täytetty sv katoaisi. Code ei kirjoita ruotsia: testi ei luo sv-sisältöä. */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKRIPTI = 'scripts/i18n_luo_gemini_era.cjs';
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const aja = (root, ...args) => spawnSync(process.execPath, [join(root, SKRIPTI), ...args], { cwd: root, encoding: 'utf8' });
const tmp = mkdtempSync(join(tmpdir(), 'b11-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

// väliaikainen juuri: vain skripti + kohde-erä (+ palautus). Palautustarkistus ajetaan ennen kuin skripti lukee muita repon tiedostoja.
const kopioJuuri = (nimi, palautus) => {
  const r = join(tmp, nimi); mkdirSync(join(r, 'scripts'), { recursive: true }); mkdirSync(join(r, 'docs/i18n'), { recursive: true });
  copyFileSync(join(juuri, SKRIPTI), join(r, SKRIPTI));
  copyFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_2.json'), join(r, 'docs/i18n/sv_kaannoserae_2.json'));
  if (palautus) writeFileSync(join(r, 'docs/i18n', palautus), '{}\n');
  return r;
};

describe('B11 — i18n_luo_gemini_era.cjs ei ylikirjoita palautettua erää', () => {
  it.each([['sv_era2_palautetaan.json'], ['sv_kaannoserae_2_palautus.json']])('erä + palautus %s → exit ≠ 0, tiedosto ennallaan (sha)', (palautus) => {
    const r = kopioJuuri('juuri_' + palautus, palautus), kohde = join(r, 'docs/i18n/sv_kaannoserae_2.json');
    const ennen = sha(kohde);
    const p = aja(r);
    expect(p.status).not.toBe(0);
    expect(p.stderr).toContain('erällä on palautus');
    expect(p.stderr).toContain('sv_kaannoserae_N_gemini.json');
    expect(sha(kohde)).toBe(ennen);
  });

  it('repon erä 2 on palautettu: oletusajo kieltäytyy eikä muuta tiedostoa', () => {
    const kohde = join(juuri, 'docs/i18n/sv_kaannoserae_2.json'), ennen = sha(kohde);
    expect(existsSync(join(juuri, 'docs/i18n/sv_era2_palautetaan.json'))).toBe(true);
    const p = aja(juuri);
    expect(p.status).not.toBe(0);
    expect(sha(kohde)).toBe(ennen);
  });

  it('ei palautusta, mutta täytetyt sv:t katoaisivat → exit ≠ 0, tiedosto ennallaan', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9999.json');
    copyFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_2.json'), kohde);
    const ennen = sha(kohde);
    const p = aja(juuri, '--tiedosto=' + kohde);
    expect(p.status).not.toBe(0);
    expect(p.stderr).toMatch(/\d+ täytettyä sv-kenttää katoaisi/);
    expect(sha(kohde)).toBe(ennen);
  });

  it('uusi erä ilman palautusta kirjoitetaan (sv tyhjiä), ja uudelleenajo onnistuu', () => {
    const kohde = join(tmp, 'sv_kaannoserae_9998_gemini.json');
    expect(aja(juuri, '--tiedosto=' + kohde).status).toBe(0);
    const era = JSON.parse(readFileSync(kohde, 'utf8'));
    const svt = []; const kay = (o) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (k === 'sv' && typeof o[k] === 'string') svt.push(o[k]); else kay(o[k]); } };
    kay(era.osiot);
    expect(svt.length).toBeGreaterThan(0);
    expect(svt.filter((s) => s !== '')).toEqual([]);
    expect(aja(juuri, '--tiedosto=' + kohde).status).toBe(0);
  });
});
