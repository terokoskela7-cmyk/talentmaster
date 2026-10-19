#!/usr/bin/env node
/* Gemini-erä 71 (Klipin ajastettu-tila; 18.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_kevyt_katselmus, 2 uutta avainta (mv_rivi_ajastettu, mv_lahetetty_ajastettu_lisa). fi luetaan suoraan libistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era71.mjs [--tiedosto=docs/i18n/sv_kaannoserae_71_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_71_gemini.json')), OSIO = 'lib.tm_kevyt_katselmus';
const FI_KAIKKI = require('../lib/tm_kevyt_katselmus.js').FI;
const AVAIMET = ['kk_valm_lause', 'kk_lause_ohje_ei_lukuja'];
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot[OSIO] && nyk.osiot[OSIO].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const H = {
  kk_valm_lause: 'Otsikko "Sulje jakso" -ikkunan lausekentälle kun jakson sulkee valmentaja (VP:n vastaava on "VP:n lause"). Lause on valmentajan kirjoittama kuvaus jaksosta; näkyvyys pelaajalle valitaan erillisellä kytkimellä ("Näytä myös pelaajalle"). Lyhyt otsikko, versaaleilla näytettävä (CSS). Termistö: valmentaja = tränare.',
  kk_lause_ohje_ei_lukuja: 'Pieni selite lausekentän alla. Ei kerro näkyykö lause pelaajalle (se kerrotaan kytkimen selitteessä). Sääntö: lauseessa ei lukuja eikä vertailua muihin. Lyhyt lause, päättyy pisteeseen.'
};
const rivit = {}; for (const k of AVAIMET) { if (!(k in FI_KAIKKI)) { console.error('puuttuu libistä: ' + k); process.exit(1); } rivit[k] = { fi: FI_KAIKKI[k], huom: H[k], sv: vanha(k) }; }
const ulos = { _tiedosto: 'TalentMaster — sv-käännöserä 71 (Sulje jakso -ikkunan valmentajan lause: otsikko + selite, 2 riviä; sv tyhjä → Gemini)', _pvm: '2026-10-19', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: 2, _rivit_osioittain: { [OSIO]: 2 },
  osiot: { [OSIO]: { _konteksti: 'HENKILÖKUNTA (valmentaja ja VP): Sulje jakso -ikkunan lausekenttä. Sävy: lyhyt ja neutraali.', _lahde: 'lib/tm_kevyt_katselmus.js (FI-avaimet kk_valm_lause, kk_lause_ohje_ei_lukuja)', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu 2 riviä → ' + OUT.replace(ROOT + '/', ''));
