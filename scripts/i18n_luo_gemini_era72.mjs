#!/usr/bin/env node
/* Gemini-erä 72 (Kehitystyöpöytä K1: alueen valikkoteksti; 19.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_kt_alue, 1 uusi avain (ka_aseta_alue). fi luetaan suoraan libistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era72.mjs [--tiedosto=docs/i18n/sv_kaannoserae_72_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_72_gemini.json')), OSIO = 'lib.tm_kt_alue';
const FI_KAIKKI = require('../lib/tm_kt_alue.js').FI;
const AVAIMET = ['ka_aseta_alue'];
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot[OSIO] && nyk.osiot[OSIO].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const H = {
  ka_aseta_alue: 'Valikkokohta pelaajan Polku-näkymän jaksokortin ⋯-valikossa. Näkyy kun pelaajalle EI ole vielä merkitty ydinvahvuuden aluetta kentälle (kun alue on jo merkitty, valikossa lukee "Vaihda aluetta" = "Ändra område"). Napautus avaa kentän, josta valmentaja valitsee alueen. Lyhyt toimintolause, ei pistettä. Termistö: ydinvahvuus = kärnstyrka, alue = område, valmentaja = tränare.'
};
const rivit = {}; for (const k of AVAIMET) { if (!(k in FI_KAIKKI)) { console.error('puuttuu libistä: ' + k); process.exit(1); } rivit[k] = { fi: FI_KAIKKI[k], huom: H[k], sv: vanha(k) }; }
const ulos = { _tiedosto: 'TalentMaster — sv-käännöserä 72 (Kehitystyöpöytä K1: Polun ⋯-valikon "Aseta alue"; 1 rivi; sv tyhjä → Gemini)', _pvm: '2026-10-19', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: AVAIMET.length,
  osiot: { [OSIO]: { _konteksti: 'HENKILÖKUNTA (valmentaja ja VP): kehitystyöpöydän valikkokohta. Sävy: lyhyt ja neutraali.', _lahde: 'lib/tm_kt_alue.js (FI-avain ka_aseta_alue)', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + AVAIMET.length + ' riviä → ' + OUT.replace(ROOT + '/', ''));
