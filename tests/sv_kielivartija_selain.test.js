/* QG-1 · kielivartijan hyväksyntä (PM 29.10.2026): kun viikon 44 aukko palautetaan kovakoodattuna, vartija kaatuu.
   Kopioidaan sivut + lib väliaikaiseen puuhun, muutetaan YKSI kohta ja ajetaan sv-läpiajo fixture-seuralla (--juuri, --kaada).
   Kontrolli: muuttamaton kopio menee läpi samoilla askelilla → kaatuminen johtuu muutoksesta, ei ympäristöstä. */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, cpSync, readdirSync, statSync, readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));

function kopio() {
  const d = mkdtempSync(join(tmpdir(), 'qg1-'));
  for (const f of readdirSync(JUURI)) { const p = join(JUURI, f); if (statSync(p).isFile()) cpSync(p, join(d, f)); }
  cpSync(join(JUURI, 'lib'), join(d, 'lib'), { recursive: true });
  mkdirSync(join(d, 'docs')); for (const f of readdirSync(join(JUURI, 'docs'))) if (f.endsWith('.js')) cpSync(join(JUURI, 'docs', f), join(d, 'docs', f));
  return d;
}
function muuta(d, tiedosto, vanha, uusi) {
  const p = join(d, tiedosto), s = readFileSync(p, 'utf8');
  expect(s.split(vanha).length - 1).toBe(1);   // muutoskohta on yksiselitteinen (jos lähde muuttuu, testi kertoo sen)
  writeFileSync(p, s.replace(vanha, uusi));
}
function aja(d, askeleet) {
  const r = spawnSync(process.execPath, [join(JUURI, 'tools/i18n/sv_lapiajo.mjs'), '--juuri=' + d, '--sovellus=fx_pelaaja', ...askeleet.map((a) => '--askel=' + a), '--tarkista', '--kaada', '--ulos=' + join(d, 'tulos.json')],
    { encoding: 'utf8', env: Object.assign({}, process.env, { TM_CHROME_PATH: CHROME }), timeout: 240000 });
  return { koodi: r.status, ulos: (r.stdout || '') + (r.stderr || '') };
}

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('QG-1 · kielivartija kaatuu viikon 44 aukkoon', () => {
  const puut = [];
  const uusi = () => { const d = kopio(); puut.push(d); return d; };
  afterAll(() => { for (const d of puut) rmSync(d, { recursive: true, force: true }); });

  it('kontrolli: muuttamaton puu → P7 Idag + Jag sv-tilassa ilman uutta ui-suomea (exit 0)', () => {
    const r = aja(uusi(), ['idag', 'jag']);
    expect(r.ulos).toContain('UUSIA suomenkielisiä tekstejä baselinen ulkopuolella: 0');
    expect(r.koodi).toBe(0);
  }, 300000);

  it('"Kehityit! 🎉" kovakoodattuna kehityskaareen (lib/tm_kehityskaari.js) → CI kaatuu', () => {
    const d = uusi();
    muuta(d, 'lib/tm_kehityskaari.js', "_esc(_kkaT(ctx, 'kka_kehityit'), ctx.esc)", "_esc('Kehityit! 🎉', ctx.esc)");
    const r = aja(d, ['jag']);
    expect(r.koodi).toBe(1);
    expect(r.ulos).toMatch(/✗ ui +\[fx_pelaaja\/jag\] Kehityit! 🎉/);
    expect(r.ulos).toContain('KAATUU');
  }, 300000);

  it('muuttujallinen "Tällä kaudella: {n} omatoimista" kovakoodattuna kertymään (lib/tm_harjoituskertyma_nakyma.js) → CI kaatuu', () => {
    const d = uusi();
    muuta(d, 'lib/tm_harjoituskertyma_nakyma.js', "if (s.omatoimi.n) osat.push(s.omatoimi.n + ' ' + t('omatoimista'));", "if (s.omatoimi.n) osat.push('Tällä kaudella: ' + s.omatoimi.n + ' omatoimista');");
    const r = aja(d, ['idag']);   // kertymäkortti näkyy Idag-näkymässä (Kenttä: aikataulun yhteydessä)
    expect(r.koodi).toBe(1);
    expect(r.ulos).toMatch(/✗ ui +\[fx_pelaaja\/idag\] .*Tällä kaudella: \d+ omatoimista/);
  }, 300000);
});
