#!/usr/bin/env node
/* sv-erä 64 (Kehitystyöpöytä B4a: Polku; 17.10.) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_64_palautus.json. Kaista: Tero.
   lib.tm_kt_polku (41 vietävää + 1 ohitettu: ktp_siirra_ydinvahvuutta korvattiin koodissa ka_vaihda-avaimella, jonka sv on jo olemassa; avain = ktp_*) → lib/tm_lib_i18n.js sv-kartan loppuun.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen; fi täsmätään lähetettyyn erään ja koodin lähteeseen (tm_adar_tekstit FI).
   Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era64.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_64_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_64_gemini.json', OSIO = 'lib.tm_kt_polku', OHITA = ['ktp_siirra_ydinvahvuutta'];

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot, TX = require(path.join(juuri, 'lib/tm_kt_polku.js'));
  if (!P[OSIO]) return { virheet: ['osio puuttuu palautuksesta: ' + OSIO], lisatty: 0, ohitettu, kirjoitettu: false };
  const pAvaimet = Object.keys(P[OSIO].rivit).filter((k) => OHITA.indexOf(k) < 0).sort();
  if (JSON.stringify(pAvaimet) !== JSON.stringify(Object.keys(G[OSIO].rivit).sort())) virheet.push('avaimet ≠ lähetetty erä (ohitettuja pois lukien)');
  for (const k of OHITA) if (k in TX.FI) virheet.push(k + ': ohitettu rivi on yhä koodissa');
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N'), uudet = [];
  for (const [k, r] of Object.entries(P[OSIO].rivit)) {
    if (OHITA.indexOf(k) >= 0) { ohitettu.push(k); continue; }
    const K1D = require('../tests/fixtures/k1d_lib_muutokset.json');   // K1d (20.10.2026): fi muuttui sanastopäätöksellä → erän (vanha) fi hyväksytään kun muutos on kirjattu
    if ((r.fi !== TX.FI[k] && !(K1D[k] && K1D[k].vanha === r.fi && K1D[k].uusi === TX.FI[k])) || r.fi !== (G[OSIO].rivit[k] || {}).fi) { virheet.push(k + ': fi ei vastaa lähetettyä erää/koodin lähdettä'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv || require('./i18n_era80_tuki.cjs').korvattu(k, ol[k])) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
    uudet.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 64 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era64.cjs) ── Kehitystyöpöytä B4a: Polku (Kausi, Jakso nyt, klipit)\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const u = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (u[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita && uudet.length) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && uudet.length) };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
