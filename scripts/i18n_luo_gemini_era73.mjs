#!/usr/bin/env node
/* Gemini-erä 73 (K2: Näyttö uudella sivulla; 19.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_naytto_lohkot, 5 uutta avainta (kn_*): "Näytä kaikki mittaukset" -avattava, latausteksti ja virheviesti + Yritä uudelleen. fi luetaan suoraan libistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era73.mjs [--tiedosto=docs/i18n/sv_kaannoserae_73_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_73_gemini.json')), OSIO = 'lib.tm_naytto_lohkot';
const FI_KAIKKI = require('../lib/tm_naytto_lohkot.js').FI;
const AVAIMET = ['kn_kaikki', 'kn_lataa', 'kn_virhe', 'kn_virhe_ohje', 'kn_yrita'];
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot[OSIO] && nyk.osiot[OSIO].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const H = {
  kn_kaikki: 'Avattavan otsikko pelaajan Näyttö-välilehdellä (valmentajan työpöytä). Avattavan sisällä ovat kaikki pelaajan mittaukset ja arviot (kehon valmius, tekniikka, peliäly, psyykkinen). Toimintokehote, lyhyt, ei pistettä.',
  kn_lataa: 'Odotusteksti kun pelaajan mittauksia haetaan. Päättyy kolmeen pisteeseen (…).',
  kn_virhe: 'Lihavoitu virheotsikko kun mittausten haku epäonnistui. Heti perässä tulee ohjelause (kn_virhe_ohje) samalla rivillä. Päättyy pisteeseen.',
  kn_virhe_ohje: 'Ohjelause virheotsikon perässä: kehotus yrittää hetken päästä uudelleen tai avata pelaaja Masterissa (Master = valmentajan perusnäkymä, ei käännetä). Päättyy pisteeseen.',
  kn_yrita: 'Napin teksti virheen yhteydessä. Lyhyt, käsky ("Yritä uudelleen").'
};
const rivit = {}; for (const k of AVAIMET) { if (!(k in FI_KAIKKI)) { console.error('puuttuu libistä: ' + k); process.exit(1); } rivit[k] = { fi: FI_KAIKKI[k], huom: H[k], sv: vanha(k) }; }
const ulos = { _tiedosto: 'TalentMaster — sv-käännöserä 73 (K2: Näyttö uudella sivulla — "Näytä kaikki mittaukset", lataus- ja virheteksti; 5 riviä; sv tyhjä → Gemini)', _pvm: '2026-10-19', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: AVAIMET.length, _rivit_osioittain: { [OSIO]: AVAIMET.length },
  osiot: { [OSIO]: { _konteksti: 'HENKILÖKUNTA (valmentaja ja VP): pelaajan Näyttö-välilehti. Sävy: lyhyt ja neutraali.', _lahde: 'lib/tm_naytto_lohkot.js (FI-avaimet kn_*)', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + AVAIMET.length + ' riviä → ' + OUT.replace(ROOT + '/', ''));
