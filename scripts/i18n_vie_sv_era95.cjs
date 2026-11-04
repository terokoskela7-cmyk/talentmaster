#!/usr/bin/env node
/* sv-erä 95 (B3 Kehitystyöpöydän Profiili → Kaikki mittaukset → Korjaa, #1187; PM vahvisti VP:n nykyiset sv-tekstit 4.11.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_95_palautus.json. Kaista: Tero.
   master_kartta (13, avain = fi-teksti, Kehitystyöpöydän masterT) → lib/tm_master_i18n.js sv-kartan VIIMEISEN rivin perään (tiedosto rivikatossa 1748: ei uusia rivejä, kuten erä 94).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen; fi täsmätään lähetettyyn erään ja siihen, että teksti on
   koodissa (lib/tm_mittaus_korjaa.js t('…') tai TalentMaster_Kehitystyopoyta.html masterT('…')). Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era95.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_95_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_95_gemini.json', F = 'lib/tm_master_i18n.js';
const ANKKURI = "    '{n} vs. syksy': '{n} jämfört med hösten',";   // sv-kartan viimeinen rivi (ennen '  },\n  en:')

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], lisaa = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot || {}, G = JSON.parse(lue(LAHETYS)).osiot || {};
  const koodi = lue('lib/tm_mittaus_korjaa.js') + '\n' + lue('TalentMaster_Kehitystyopoyta.html');
  for (const o of Object.keys(P)) if (o !== 'master_kartta') virheet.push('tuntematon osio: ' + o);
  const rivit = (P.master_kartta || {}).rivit || {}, lah = (G.master_kartta || {}).rivit || {};
  if (Object.keys(rivit).sort().join('\n') !== Object.keys(lah).sort().join('\n')) virheet.push('palautuksen rivit ≠ lähetetty erä');
  let src = lue(F); const SV = lataaSv(src, 'TM_MASTER_I18N');
  for (const [k, r] of Object.entries(rivit)) {
    if (r.fi !== k || (lah[k] && lah[k].fi !== r.fi)) { virheet.push(k + ': fi ≠ lähetetty'); continue; }
    if (koodi.indexOf("t(" + q(k) + ")") < 0 && koodi.indexOf("masterT(" + q(k) + ")") < 0) { virheet.push(k + ': fi-tekstiä ei löydy koodista'); continue; }
    const s = sopii(r.fi, r.sv); if (s) { virheet.push(k + ': ' + s); continue; }
    if (SV[k] === r.sv) { ohitettu.push(k); continue; }
    if (SV[k] !== undefined) { virheet.push(k + ': kartassa on jo eri sv'); continue; }
    lisaa.push([k, r.sv]);
  }
  if (lisaa.length) {
    const n = src.split(ANKKURI).length - 1; if (n !== 1) virheet.push('ankkuririvi löytyi ' + n + ' kertaa (pitää olla 1)');
    else src = src.replace(ANKKURI, () => ANKKURI + ' ' + lisaa.map(([x, y]) => q(x) + ': ' + q(y) + ',').join(' ') + '   // erä 95 (B3 Korjaa mittaus, PM 4.11.2026)');
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (lisaa.length) { const V = lataaSv(src, 'TM_MASTER_I18N'); for (const [k, sv] of lisaa) if (V[k] !== sv) virheet.push('verifiointi ' + k); }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita && lisaa.length) fs.writeFileSync(path.join(juuri, F), src);
  return { virheet, lisatty: lisaa.length, ohitettu, kirjoitettu: !!(opts.kirjoita && lisaa.length) };
}
module.exports = { vie, PALAUTUS, LAHETYS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
