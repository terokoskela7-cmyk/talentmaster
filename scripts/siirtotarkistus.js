#!/usr/bin/env node
'use strict';
/**
 * siirtotarkistus.js — rivikattojen purku: todistaa, että PR vain SIIRTÄÄ koodia.
 *
 * Vertaa haaran muutosta perustaan (oletus origin/main): kaikista muutetuista tiedostoista poistetut rivit
 * ja lisätyt rivit monijoukkoina (rivin sisältö sellaisenaan, sisennys mukaan lukien). Puhtaassa siirrossa
 * jokainen poistettu rivi löytyy lisätyistä täsmälleen yhtä monta kertaa. Ylijäämä tulostetaan kummaltakin
 * puolelta, ja ylijäämärivit ovat ainoat, jotka katselmoijan pitää lukea (esim. uusi <script src>-tagi tai
 * functionsin ohut exports-kytkentä).
 *
 *   node scripts/siirtotarkistus.js [--perusta origin/main] [--salli N] [--json] [-- polku…]
 *
 * --salli N   → exit 0, jos ylijäämärivejä on yhteensä enintään N (muuten exit 1). Oletus 0.
 * polut       → rajaa vertailun näihin polkuihin (oletus: kaikki muutetut tiedostot paitsi tests/ ja docs/).
 * Tyhjiä rivejä ei lasketa ylijäämäksi.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const JUURI = path.join(__dirname, '..');

function jasennaDiff(diff) {
  const pois = new Map(), lisa = new Map();
  const lisaa = (m, r, f) => { const k = r; const e = m.get(k) || { n: 0, tiedostot: new Set() }; e.n++; e.tiedostot.add(f); m.set(k, e); };
  let tiedosto = null;
  for (const rivi of diff.split('\n')) {
    if (rivi.startsWith('+++ ')) { tiedosto = rivi.slice(4).replace(/^b\//, ''); continue; }
    if (rivi.startsWith('--- ')) { if (rivi !== '--- /dev/null') tiedosto = rivi.slice(4).replace(/^a\//, ''); continue; }
    if (rivi.startsWith('diff ') || rivi.startsWith('index ') || rivi.startsWith('@@')) continue;
    if (rivi.startsWith('+')) lisaa(lisa, rivi.slice(1), tiedosto);
    else if (rivi.startsWith('-')) lisaa(pois, rivi.slice(1), tiedosto);
  }
  return { pois, lisa };
}

/** Monijoukkojen erotus: { vainPoistettu: [{rivi, n, tiedostot}], vainLisatty: [...] } */
function vertaa(pois, lisa) {
  const ero = (a, b) => {
    const ulos = [];
    for (const [r, e] of a) {
      if (!r.trim()) continue;
      const n = e.n - ((b.get(r) || { n: 0 }).n);
      if (n > 0) ulos.push({ rivi: r, n, tiedostot: [...e.tiedostot] });
    }
    return ulos;
  };
  return { vainPoistettu: ero(pois, lisa), vainLisatty: ero(lisa, pois) };
}

function aja(argv) {
  const a = argv.slice(2);
  const arvo = (n, d) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : d; };
  const perusta = arvo('--perusta', 'origin/main');
  const salli = Number(arvo('--salli', '0'));
  const viiva = a.indexOf('--');
  const polut = viiva >= 0 ? a.slice(viiva + 1) : ['.', ':(exclude)tests', ':(exclude)docs'];
  const diff = execFileSync('git', ['diff', '--no-color', '--no-renames', '-U0', perusta + '...HEAD', '--', ...polut], { cwd: JUURI, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const { pois, lisa } = jasennaDiff(diff);
  const tulos = vertaa(pois, lisa);
  const summa = (l) => l.reduce((s, x) => s + x.n, 0);
  const yhteensa = (m) => [...m.values()].reduce((s, e) => s + e.n, 0);
  const raportti = { perusta, poistettu: yhteensa(pois), lisatty: yhteensa(lisa), siirretty: yhteensa(pois) - summa(tulos.vainPoistettu), ...tulos, ylijaama: summa(tulos.vainPoistettu) + summa(tulos.vainLisatty) };
  if (a.includes('--json')) { process.stdout.write(JSON.stringify(raportti, null, 2) + '\n'); }
  else {
    console.log('Siirtotarkistus vs ' + perusta + ': poistettu ' + raportti.poistettu + ', lisätty ' + raportti.lisatty + ', siirretty sellaisenaan ' + raportti.siirretty + ' riviä.');
    const tulosta = (otsikko, l) => { console.log(otsikko + ' (' + summa(l) + ')'); l.forEach((x) => console.log('  ' + (x.n > 1 ? x.n + '× ' : '') + '[' + x.tiedostot.join(', ') + '] ' + x.rivi.trim().slice(0, 160))); };
    tulosta('Vain poistettu', tulos.vainPoistettu);
    tulosta('Vain lisätty', tulos.vainLisatty);
    console.log(raportti.ylijaama <= salli ? 'OK: ylijäämä ' + raportti.ylijaama + ' ≤ ' + salli : 'HYLÄTTY: ylijäämä ' + raportti.ylijaama + ' > ' + salli);
  }
  return raportti.ylijaama <= salli ? 0 : 1;
}

if (require.main === module) process.exit(aja(process.argv));
module.exports = { jasennaDiff, vertaa };
