'use strict';
/* VP = tränarchef (Teron päätös 18.10.2026; docs/i18n/termisto.fi-sv.json, GEMINI_OHJE_kooste.md): inventaario sv-arvoista, joissa on vanha termi (fotbollsutvecklare / sana FU, FU:s, FU:n, FU-).
   Käyttö: erän 67 generaattori (scripts/i18n_luo_gemini_era67.mjs), vienti (scripts/i18n_vie_sv_era67.cjs) ja vartija (tests/sv_tranarchef_vartija.test.js). Vain luku. */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const VANHA = /fotbollsutvecklar|(?<![A-Za-zÅÄÖåäö])FU(?![A-Za-zÅÄÖåäö])/i;
const VANHA_VAIN_FU = /(?<![A-Za-zÅÄÖåäö])FU(?![A-Za-zÅÄÖåäö])/;   // FU isoilla (CSS-animaatio "fu" ei osu)
const osuu = (s) => /fotbollsutvecklar/i.test(s) || VANHA_VAIN_FU.test(s);
const KARTAT = [   // [osio, tiedosto, tyyppi]: 'fi' = 'fi-teksti': 'sv' · 'lib' = 'lib-avain': 'sv' (fi libin FI-kartasta) · 'lang' = tm_lang sv-puu · 'html' = tiedoston oma sv-sanakirja (literaali)
  ['lib.tm_vp_i18n', 'lib/tm_vp_i18n.js', 'fi'], ['lib.tm_henkilosto_i18n', 'lib/tm_henkilosto_i18n.js', 'fi'], ['lib.tm_master_i18n', 'lib/tm_master_i18n.js', 'fi'], ['lib.tm_i18n_common', 'lib/tm_i18n_common.js', 'fi'],
  ['lib.tm_lib_i18n', 'lib/tm_lib_i18n.js', 'lib'], ['lib.tm_lang', 'lib/tm_lang.js', 'lang'], ['TalentMaster_Valmennusapuri', 'TalentMaster_Valmennusapuri.html', 'html'] ];
const STD = /^(\s*)'((?:[^'\\]|\\.)*)':\s*'((?:[^'\\]|\\.)*)'(,?)(\s*\/\/.*)?$/;
const pura = (lit) => Function('"use strict"; return \'' + lit + '\'')();
function libFi(juuri) {   // lib-avain → fi (kaikkien lib/*.js FI-karttojen avain: 'teksti')
  const ulos = {}; for (const f of fs.readdirSync(path.join(juuri, 'lib')).filter((x) => /\.js$/.test(x) && !/i18n/.test(x))) {
    let m; try { m = require(path.join(juuri, 'lib', f)); } catch (e) { continue; } if (m && m.FI && typeof m.FI === 'object') for (const [k, v] of Object.entries(m.FI)) if (typeof v === 'string' && !(k in ulos)) ulos[k] = v; }
  return ulos;
}
const HTML_FI = { 'tervetuloTekstiHp': 'Kysy kuormasta, kasvupyrähdyksestä, liikkeen laadusta tai siitä, miten fyysinen teema viedään peliin. Kerro ikäryhmä, kuka kysyy (esim. valmentaja tai valmennuspäällikkö) ja onko seuralla testi- tai kasvumittausdataa. HP-johtaja vastaa yhdellä muutoksella ja havaintomerkillä.',
  'esimerkitHp.3': 'Valmennuspäällikkö. U12:ssa pelaajat eivät irtaudu vartijasta. Pitäisikö koko U11–U13 ottaa sama teema?', 'kukaLista.2': 'Valmennuspäällikkö' };
/** → [{ osio, tiedosto, avain, fi, sv_nyt, rivi }] */
function kerays(juuri) {
  juuri = juuri || ROOT; const rivit = [], lf = libFi(juuri);
  for (const [osio, tied, tyyppi] of KARTAT) {
    const L = fs.readFileSync(path.join(juuri, tied), 'utf8').split('\n');
    L.forEach((l, i) => {
      if (!osuu(l.replace(/\/\/.*$/, (c) => (STD.test(l) ? '' : c)))) return;
      const m = STD.exec(l); let avain, fi, sv;
      if (m) { avain = pura(m[2]); sv = pura(m[3]); fi = tyyppi === 'lib' ? lf[avain] : avain; if (!osuu(sv)) return; }
      else if (tyyppi === 'lang') { const mm = /^\s*vp:\s+'((?:[^'\\]|\\.)*)'/.exec(l); if (!mm || !osuu(mm[1])) return; avain = 'henkilosto.roolit.vp'; sv = pura(mm[1]); fi = 'Valmennuspäällikkö'; }
      else if (tyyppi === 'html') {
        const lit = /'((?:[^'\\]|\\.)*(?:otbollsutvecklar)(?:[^'\\]|\\.)*)'/.exec(l); if (!lit) return; sv = pura(lit[1]);
        avain = /tervetuloTekstiHp/.test(l) ? 'tervetuloTekstiHp' : /^\s*'/.test(l) ? 'esimerkitHp.3' : 'kukaLista.2'; fi = HTML_FI[avain];
        if (avain === 'kukaLista.2') sv = 'Fotbollsutvecklare';
      } else return;
      rivit.push({ osio, tiedosto: tied, avain, fi, sv_nyt: sv, rivi: i + 1 });
    });
  }
  return rivit;
}
module.exports = { kerays, osuu, KARTAT, STD, pura, VANHA, ROOT };
