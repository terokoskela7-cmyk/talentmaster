#!/usr/bin/env node
/* sv-erä 67 (VP = tränarchef; 18.10.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_67_palautus.json (vertailu: _gemini.json). Kaista: Tero. Brief: docs/CODE_BRIEF_SV_TRANARCHEF.md.
   KORVAA olemassa olevan sv-arvon (89 riviä: tm_vp_i18n, tm_henkilosto_i18n, tm_master_i18n, tm_i18n_common, tm_lib_i18n, tm_lang, Valmennusapuri) Geminin palautuksella.
   Code EI kirjoita eikä muokkaa ruotsia (§0): arvot kopioidaan palautuksesta MERKKI MERKILTÄ. Tarkistukset ennen kirjoitusta: avaimet = lähetetty erä; fi täsmää; paikkamerkit; sv_nyt = koodin nykyinen arvo;
   uudessa sv:ssä EI sanaa FU eikä fotbollsutvecklare, ja siinä on tränarchef (tai lyhyissä nimikkeissä TC). Vienti VERIFIOIDAAN lataamalla kartat uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Ajo: node scripts/i18n_vie_sv_era67.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const I = require('./i18n_tranarchef_inventaario.cjs');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_67_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_67_gemini.json';
const NIMET = { 'lib/tm_vp_i18n.js': 'TM_VP_I18N', 'lib/tm_henkilosto_i18n.js': 'TM_HENKILOSTO_I18N', 'lib/tm_master_i18n.js': 'TM_MASTER_I18N', 'lib/tm_i18n_common.js': 'TM_I18N_COMMON', 'lib/tm_lib_i18n.js': 'TM_LIB_I18N' };
const UUSI = /tränarchef/i, LYHYT_OK = /^(TC|tränarchef)\b/i;

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot, rivit = I.kerays(juuri), nyt = {};
  rivit.forEach((r) => { nyt[r.osio + '|' + r.avain] = r; });
  const tiedostot = {}; I.KARTAT.forEach(([osio, tied]) => { tiedostot[tied] = { osio, src: lue(tied).split('\n'), muutokset: [] }; });
  const kaikkiAvaimet = []; let lisatty = 0;
  for (const [osio, o] of Object.entries(P)) {
    const g = (G[osio] || {}).rivit || {}, kartta = I.KARTAT.find((k) => k[0] === osio); if (!kartta) { virheet.push('tuntematon osio: ' + osio); continue; }
    for (const [avain, r] of Object.entries(o.rivit)) {
      kaikkiAvaimet.push(osio + '|' + avain); const gr = g[avain]; if (!gr) { virheet.push(osio + ' ' + avain + ': ei lähetetyssä erässä'); continue; }
      if (r.fi !== gr.fi) { virheet.push(avain + ': fi ≠ lähetetty'); continue; }
      const syy = sopii(r.fi || '', r.sv); if (syy) { virheet.push(avain + ': ' + syy); continue; }
      if (I.osuu(r.sv)) { virheet.push(avain + ': sv sisältää yhä FU / fotbollsutvecklare'); continue; }
      if (!UUSI.test(r.sv) && !LYHYT_OK.test(r.sv)) { virheet.push(avain + ': sv ei sisällä sanaa tränarchef (eikä TC)'); continue; }
      const n = nyt[osio + '|' + avain];
      if (!n) { ohitettu.push(avain); continue; }   // jo viety (idempotentti)
      if (n.sv_nyt !== gr.sv_nyt) { virheet.push(avain + ': koodin sv ≠ lähetetyn erän sv_nyt'); continue; }
      tiedostot[kartta[1]].muutokset.push({ avain, vanha: n.sv_nyt, uusi: r.sv, rivi: n.rivi, tyyppi: kartta[2] });
    }
  }
  const lahetetyt = []; for (const [osio, o] of Object.entries(G)) for (const a of Object.keys(o.rivit)) lahetetyt.push(osio + '|' + a);
  if (JSON.stringify(lahetetyt.sort()) !== JSON.stringify(kaikkiAvaimet.slice().sort())) virheet.push('palautuksen avaimet ≠ lähetetty erä (' + kaikkiAvaimet.length + ' vs ' + lahetetyt.length + ')');
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const uudet = {};
  for (const [tied, t] of Object.entries(tiedostot)) {
    const L = t.src.slice();
    for (const m of t.muutokset) {
      const i = m.rivi - 1, l = L[i], std = I.STD.exec(l);
      if (m.tyyppi === 'fi' || m.tyyppi === 'lib') {
        if (!std || I.pura(std[2]) !== m.avain || I.pura(std[3]) !== m.vanha) { virheet.push(m.avain + ': rivi ' + m.rivi + ' ei vastaa'); continue; }
        let komm = std[5] || ''; if (komm && I.osuu(komm)) komm = '   // kanoni (Teron päätös 18.10.2026): tränarchef';
        L[i] = std[1] + q(m.avain) + ': ' + q(m.uusi) + std[4] + komm;
      } else {   // lang / html: literaali rivillä, tasan yksi esiintymä
        const lit = q(m.vanha); if (l.split(lit).length !== 2) { virheet.push(m.avain + ': literaali ei yksiselitteinen rivillä ' + m.rivi); continue; }
        L[i] = l.replace(lit, () => q(m.uusi));
      }
      uudet[tied] = true; lisatty++;
    }
    t.uusi = L.join('\n');
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  for (const [tied, nimi] of Object.entries(NIMET)) {   // verifiointi: kartta latautuu ja uudet arvot ovat paikallaan
    const sv = lataaSv(tiedostot[tied].uusi, nimi);
    for (const m of tiedostot[tied].muutokset) if (sv[m.avain] !== m.uusi) virheet.push('verifiointi ' + tied + ' ' + m.avain);
  }
  for (const [tied, t] of Object.entries(tiedostot)) if (t.muutokset.length) for (const m of t.muutokset) if (!t.uusi.includes(q(m.uusi))) virheet.push('verifiointi ' + tied + ' ' + m.avain + ' (literaali)');
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita) for (const [tied, t] of Object.entries(tiedostot)) if (t.muutokset.length) fs.writeFileSync(path.join(juuri, tied), t.uusi);
  return { virheet, lisatty, ohitettu, kirjoitettu: !!(opts.kirjoita && lisatty) };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
