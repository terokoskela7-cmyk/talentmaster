#!/usr/bin/env node
/* Gemini-erä 67 (VP = tränarchef, Teron päätös 18.10.2026; docs/CODE_BRIEF_SV_TRANARCHEF.md). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = kaikki nykyiset sv-arvot, joissa on vanha termi (fotbollsutvecklare / FU). Inventaario scripts/i18n_tranarchef_inventaario.cjs (sama lähde kuin vienti ja vartija). Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era67.mjs [--tiedosto=docs/i18n/sv_kaannoserae_67_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_67_gemini.json'));
const I = require('./i18n_tranarchef_inventaario.cjs');
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const rivit = I.kerays(), osiot = {}, laskuri = {};
const KONTEKSTI = { 'lib.tm_vp_i18n': 'VP-näkymä (valmennuspäällikön työpöytä)', 'lib.tm_henkilosto_i18n': 'henkilöstönäkymät (Admin/Seura)', 'lib.tm_master_i18n': 'valmentajan Master-näkymä', 'lib.tm_i18n_common': 'yhteinen rooli- ja termikartta',
  'lib.tm_lib_i18n': 'jaetut lib-tekstit (avain = lib-avain)', 'lib.tm_lang': 'tm_lang (henkilosto.roolit.vp = roolin nimi valikoissa)', TalentMaster_Valmennusapuri: 'Valmennusapuri-sivun oma sv-sanakirja (fi vertailuna)' };
for (const r of rivit) {
  const o = osiot[r.osio] || (osiot[r.osio] = { _konteksti: 'VP:n (valmennuspäällikkö) termi sv-teksteissä: ' + KONTEKSTI[r.osio] + '. Korvaa vanha termi (Fotbollsutvecklare / FU) muodolla tränarchef; muu lause ennallaan.', _lahde: r.tiedosto, rivit: {} });
  const vanha = nyk && nyk.osiot && nyk.osiot[r.osio] && nyk.osiot[r.osio].rivit[r.avain];
  const lyhyt = /^FU$/.test(r.sv_nyt) || r.sv_nyt.length < 14;
  o.rivit[r.avain] = { fi: r.fi, sv_nyt: r.sv_nyt, sv: vanha && typeof vanha.sv === 'string' ? vanha.sv : '',
    huom: 'VP = tränarchef (taivutus lauseen mukaan: tränarchefen / tränarchefens / tränarchefer). Ei FU, ei fotbollsutvecklare. Muuta vain VP-termi, säilytä muu lause ja paikkamerkit.' + (lyhyt ? ' Lyhyt nimike/painiketeksti: jos tila ei riitä, lyhenne TC sallittu.' : '') };
  laskuri[r.osio] = (laskuri[r.osio] || 0) + 1;
}
const n = rivit.length;
if (n > 120) console.error('HUOM: ' + n + ' riviä > 120 — jaa kahteen erään');
const ulos = { _tiedosto: 'TalentMaster — sv-käännöserä 67 (VP = tränarchef; ' + n + ' riviä; sv tyhjä → Gemini)', _pvm: '2026-10-18',
  _ohje: 'Korvaa VP:n termi muodolla tränarchef (taivutus lauseen mukaan: tränarchefen / tränarchefens / tränarchefer). Muuta vain VP-termi, muu lause ennallaan. Säilytä paikkamerkit. Täytä vain "sv"-kentät; sv_nyt on nykyinen (vanha) käännös vertailuksi — älä muuta sitä. Termistö: docs/i18n/termisto.fi-sv.json, ohje: docs/i18n/GEMINI_OHJE_kooste.md.',
  _rivit_yhteensa: n, _rivit_osioittain: laskuri, osiot };
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + n + ' riviä → ' + OUT.replace(ROOT + '/', ''), JSON.stringify(laskuri));
