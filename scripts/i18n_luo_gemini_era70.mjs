#!/usr/bin/env node
/* Gemini-erä 70 (palaute-näkyvyys 0b, 19.10.2026: yhtenäinen kytkin "Näytä myös pelaajalle"). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_nakyvyys_kytkin, 3 riviä (nk_otsikko, nk_ohje_pois, nk_ohje_paalla). fi luetaan suoraan libistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era70.mjs [--tiedosto=docs/i18n/sv_kaannoserae_70_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_70_gemini.json')), OSIO = 'lib.tm_nakyvyys_kytkin';
const FI_KAIKKI = require('../lib/tm_nakyvyys_kytkin.js').FI;
const AVAIMET = ['nk_otsikko', 'nk_ohje_pois', 'nk_ohje_paalla'];
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot[OSIO] && nyk.osiot[OSIO].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const H = {
  nk_otsikko: 'Kytkimen nimi kaikkialla missä valmentaja tai VP kirjoittaa palautetta pelaajasta (jakson katselmuslause, pikakortin havainto, TKI-palaute). Oletus on pois. Lyhyt, toimintoa kuvaava otsikko; "pelaajalle" = pelaajalle ja hänen huoltajalleen näkyväksi.',
  nk_ohje_pois: 'Pieni selite kytkimen alla kun kytkin on POIS: palaute on sisäinen. "Henkilökunta" = valmentajat ja VP. Päättyy pisteeseen.',
  nk_ohje_paalla: 'Pieni selite kytkimen alla kun kytkin on PÄÄLLÄ: sama palaute näkyy pelaajalle ja huoltajalle. Päättyy pisteeseen.'
};
const rivit = {}; for (const k of AVAIMET) { if (!(k in FI_KAIKKI)) { console.error('puuttuu libistä: ' + k); process.exit(1); } rivit[k] = { fi: FI_KAIKKI[k], huom: H[k], sv: vanha(k) }; }
const ulos = { _tiedosto: 'TalentMaster — sv-käännöserä 70 (palaute-näkyvyys 0b: kytkin "Näytä myös pelaajalle", 3 riviä; sv tyhjä → Gemini)', _pvm: '2026-10-19', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: AVAIMET.length, _rivit_osioittain: { [OSIO]: AVAIMET.length },
  osiot: { [OSIO]: { _konteksti: 'HENKILÖKUNTA (valmentaja, VP): kytkin joka päättää näkyykö kirjoitettu palaute myös pelaajalle ja huoltajalle. Sävy: lyhyt, neutraali, selkeä.', _lahde: 'lib/tm_nakyvyys_kytkin.js (FI-avaimet nk_*)', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + AVAIMET.length + ' riviä → ' + OUT.replace(ROOT + '/', ''));
