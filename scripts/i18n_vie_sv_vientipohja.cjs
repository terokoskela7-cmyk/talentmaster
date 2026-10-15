#!/usr/bin/env node
/* Vientipohjan (Excel) sv-tekstien VIENTI Gemini-erästä 53 → scripts/vientipohja_sv.json (kielitaulu: scripts/vientipohja_kieli.js). Kaista: Tero.
   Code EI kirjoita ruotsia (CLAUDE.md §0): jokainen sv-arvo kopioidaan palautuksesta MERKKI MERKILTÄ; vienti kaatuu jos yksikin teksti puuttuu tai paikanvaraajat ({seura} {muu} {n}) eroavat.
   Lähde: docs/i18n/sv_kaannoserae_53_palautus.json, osio "vientipohja". Ajo: node scripts/i18n_vie_sv_vientipohja.cjs [--kuiva] [--tiedosto=polku]   Idempotentti. */
'use strict';
const fs = require('fs');
const path = require('path');
const VK = require('./vientipohja_kieli.js');
const ROOT = path.join(__dirname, '..');
const PAIKKA = /\{[A-Za-z0-9_]+\}/g;
const joukko = (s) => (String(s).match(PAIKKA) || []).sort().join('|');

function vie(opts) {
  opts = opts || {};
  const P = opts.palautus || JSON.parse(fs.readFileSync(path.join(ROOT, opts.tiedosto || 'docs/i18n/sv_kaannoserae_53_palautus.json'), 'utf8'));
  const rivit = (P.osiot && P.osiot.vientipohja && P.osiot.vientipohja.rivit) || {}, fi = VK.kaannettavat(), virheet = [], tekstit = {};
  for (const [id, f] of Object.entries(fi)) {
    const r = rivit[id];
    if (!r) { virheet.push(id + ': rivi puuttuu palautuksesta'); continue; }
    if (r.fi !== f) { virheet.push(id + ': fi ei vastaa kielitaulua'); continue; }
    if (typeof r.sv !== 'string' || !r.sv.trim()) { virheet.push(id + ': sv tyhjä'); continue; }
    if (joukko(f) !== joukko(r.sv)) { virheet.push(id + ': paikanvaraajat eroavat'); continue; }
    tekstit[id] = r.sv;
  }
  for (const id of Object.keys(rivit)) if (!(id in fi)) virheet.push(id + ': ylimääräinen rivi');
  const kohde = opts.kohde || VK.SV_TIEDOSTO;
  if (virheet.length) return { virheet, kirjoitettu: false, yhteensa: Object.keys(tekstit).length };
  const ulos = JSON.stringify({ _huom: 'GENEROITU scripts/i18n_vie_sv_vientipohja.cjs ← Gemini-erä 53 (osio vientipohja). ÄLÄ MUOKKAA KÄSIN (CLAUDE.md §0).', tekstit }, null, 1) + '\n';
  const nyk = fs.existsSync(kohde) ? fs.readFileSync(kohde, 'utf8') : '';
  if (opts.kirjoita && nyk !== ulos) fs.writeFileSync(kohde, ulos);
  return { virheet, kirjoitettu: !!(opts.kirjoita && nyk !== ulos), yhteensa: Object.keys(tekstit).length };
}
if (require.main === module) {
  const a = process.argv.find((x) => x.startsWith('--tiedosto=')), t = vie({ kirjoita: !process.argv.includes('--kuiva'), tiedosto: a ? a.slice(11) : undefined });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie };
