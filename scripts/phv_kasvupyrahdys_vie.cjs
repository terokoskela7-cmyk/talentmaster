#!/usr/bin/env node
/* Kasvupyrähdys-fysiikka: generoi lib/tm_kasvupyrahdys.js:n DATA-lohkon Teron hyväksymästä JSONista (docs/design/idp-v2/42_kasvupyrahdys_hyvaksynta.json).
   Ajo: node scripts/phv_kasvupyrahdys_vie.cjs            → kirjoittaa lohkon (idempotentti)
        node scripts/phv_kasvupyrahdys_vie.cjs --tarkista → poistuu 1:llä jos lib ei vastaa JSONia (testi käyttää samaa generointia) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), LIB = path.join(ROOT, 'lib/tm_kasvupyrahdys.js'), JSONF = path.join(ROOT, 'docs/design/idp-v2/42_kasvupyrahdys_hyvaksynta.json');
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029') + "'";
function lohko(d) {
  const nro = (i) => String(i + 1).padStart(2, '0');
  const taulu = d.taulu.map((t) => '    {' + ['id:' + q(t.id), 'nimi:' + q(t.nimi), 'e:' + q(t.e), 'n:' + q(t.n), 'j:' + q(t.j)].concat(t.hpp ? ['hpp:1'] : ['phv:' + q(t.phv)]).concat(t.pois ? ['pois:1'] : []).join(', ') + '}').join(',\n');
  const uudet = d.uudet.map((u, i) => '    {' + ['id:' + q(u.id), 'k:' + q(nro(i)), 'ika:[' + u.ika.map(q).join(',') + ']', 'valineet:' + (u.valineet ? q(u.valineet) : 'null'), 'kotiin:' + q(u.kotiin), 'e:' + q(u.e), 'n:' + q(u.n), 'j:' + q(u.j), 'korvaa:[' + u.korvaa.map(q).join(',') + ']'].join(', ') + '}').join(',\n');
  const fi = [];
  d.uudet.forEach((u, i) => { const k = 'kp_' + nro(i) + '_'; fi.push('    ' + k + 'nimi: ' + q(u.nimi), '    ' + k + 'vo: ' + q(u.vo), '    ' + k + 'po: ' + q(u.po), '    ' + k + 'kp: ' + q(u.kp)); });
  return '  /*DATA-ALKU*/\n  var TAULU = [   // ' + d.taulu.length + ' olemassa olevaa harjoitetta (id = lähdeaineiston tunniste, EI näytetä)\n' + taulu + '\n  ];\n  var UUDET = [   // ' + d.uudet.length + ' uutta harjoitetta; tekstit FI-avaimissa kp_NN_nimi|vo|po|kp\n' + uudet + '\n  ];\n  var FI = {\n' + fi.join(',\n') + '\n  };\n  /*DATA-LOPPU*/';
}
function uusiSisalto(src, d) {
  const a = src.indexOf('  /*DATA-ALKU*/'), b = src.indexOf('/*DATA-LOPPU*/'); if (a < 0 || b < 0) throw new Error('DATA-merkit puuttuvat');
  return src.slice(0, a) + lohko(d) + src.slice(b + '/*DATA-LOPPU*/'.length);
}
function aja(tarkista) {
  const d = JSON.parse(fs.readFileSync(JSONF, 'utf8')), src = fs.readFileSync(LIB, 'utf8'), ulos = uusiSisalto(src, d);
  if (tarkista) return ulos === src;
  if (ulos !== src) fs.writeFileSync(LIB, ulos); return true;
}
if (require.main === module) { const ok = aja(process.argv.includes('--tarkista')); if (!ok) { console.error('lib/tm_kasvupyrahdys.js ei vastaa JSONia — aja ilman --tarkista'); process.exit(1); } console.log('OK'); }
module.exports = { lohko, uusiSisalto, JSONF, LIB };
