#!/usr/bin/env node
/* QG-1 · sv-baselinen vartija (CI, pull_request): baseline saa vain pienentyä. Jos PR lisää rivejä tools/i18n/sv_lapiajo_baseline.json:iin,
   PR-kuvauksessa pitää olla merkintä [baseline] (PM:n hyväksymä kertalisäys + sv-erä odottaa). Poistot ovat aina sallittuja.
   Ajo:  PR_RUNKO="<PR-kuvaus>" node tools/i18n/sv_baseline_vartija.mjs --perusta=origin/main
   Exit 1 = lisäyksiä ilman merkintää. Puhdas tarkistus: tarkistaBaseline(vanha, uusi, runko). */
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export const MERKINTA = /\[baseline\]/i;
export function tarkistaBaseline(vanha, uusi, runko) {
  const v = new Set((vanha && vanha.tekstit) || []), u = new Set((uusi && uusi.tekstit) || []);
  const lisatyt = [...u].filter((t) => !v.has(t)), poistetut = [...v].filter((t) => !u.has(t));
  return { ok: !lisatyt.length || MERKINTA.test(String(runko || '')), lisatyt, poistetut, merkinta: MERKINTA.test(String(runko || '')) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), POLKU = 'tools/i18n/sv_lapiajo_baseline.json';
  const a = process.argv.find((x) => x.startsWith('--perusta=')); const perusta = a ? a.slice(10) : 'origin/main';
  let vanha = { tekstit: [] };
  try { vanha = JSON.parse(execFileSync('git', ['show', perusta + ':' + POLKU], { cwd: JUURI, encoding: 'utf8' })); } catch (e) { console.log('sv-baseline: perustassa ei baselinea (' + perusta + ') → kaikki rivit ovat lisäyksiä'); }
  const uusi = JSON.parse(readFileSync(join(JUURI, POLKU), 'utf8'));
  const r = tarkistaBaseline(vanha, uusi, process.env.PR_RUNKO);
  console.log(`sv-baseline: ${vanha.tekstit.length} → ${uusi.tekstit.length} · lisätty ${r.lisatyt.length} · poistettu ${r.poistetut.length} · [baseline]-merkintä: ${r.merkinta ? 'on' : 'ei'}`);
  r.lisatyt.slice(0, 80).forEach((t) => console.log('  + ' + t));
  if (!r.ok) { console.log('KAATUU: baselineen lisättiin rivejä ilman [baseline]-merkintää PR-kuvauksessa. Baseline saa vain pienentyä — korjaa teksti tai pyydä PM:ltä kertalisäys.'); process.exit(1); }
}
