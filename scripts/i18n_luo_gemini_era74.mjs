#!/usr/bin/env node
/* Gemini-erä 74 (K3a: Anna pelaajan valita + Hylkää valinta uudella sivulla; 20.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö: 2 uutta avainta — kt_valikko_syy_kuvaus (lib.tm_kehitystyopoyta: harmaan valikkorivin lyhyt syy) ja hk_ohje_kytkin (lib.tm_kevyt_katselmus: Hylkää valinta -sheetin ohje kun "Näytä myös pelaajalle" -kytkin on käytössä).
   fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era74.mjs [--tiedosto=docs/i18n/sv_kaannoserae_74_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_74_gemini.json'));
const OSIOT = {
  'lib.tm_kehitystyopoyta': { lahde: 'lib/tm_kehitystyopoyta.js (FI-avain kt_valikko_syy_kuvaus)', FI: require('../lib/tm_kehitystyopoyta.js').FI, konteksti: 'HENKILÖKUNTA (valmentaja ja VP): pelaajan Tänään- ja Polku-näkymän ⋯-valikko. Sävy: lyhyt ja neutraali.', avaimet: ['kt_valikko_syy_kuvaus'] },
  'lib.tm_kevyt_katselmus': { lahde: 'lib/tm_kevyt_katselmus.js (FI-avain hk_ohje_kytkin)', FI: require('../lib/tm_kevyt_katselmus.js').FI, konteksti: 'HENKILÖKUNTA (valmentaja ja VP): "Hylkää valinta" -ikkuna (pelaaja on valinnut seuraavan reitin, valmentaja palauttaa valinnan pelaajalle). Sävy: lyhyt ja neutraali.', avaimet: ['hk_ohje_kytkin'] }
};
const H = {
  kt_valikko_syy_kuvaus: 'Lyhyt syy harmaan (ei valittavissa olevan) valikkorivin alla: toiminto "Anna pelaajan valita seuraava reitti" ei ole käytettävissä, koska pelaajan ydinvahvuuden kuvaus puuttuu. Ei pistettä. Toteava, lyhyt.',
  hk_ohje_kytkin: 'Ohjeteksti "Hylkää valinta" -ikkunan alussa. Kaksi lausetta. Lainausmerkeissä oleva "Näytä myös pelaajalle" on kytkimen nimi samassa ikkunassa (käännös: sama kuin avain nk_otsikko, älä keksi uutta). Perustelu = valmentajan kirjoittama syy sille, miksi pelaajan valinta palautetaan.'
};
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const osiot = {}; let yht = 0; const osioittain = {};
for (const [o, d] of Object.entries(OSIOT)) {
  const rivit = {}; for (const k of d.avaimet) { if (!(k in d.FI)) { console.error('puuttuu libistä: ' + o + ' ' + k); process.exit(1); } rivit[k] = { fi: d.FI[k], huom: H[k], sv: vanha(o, k) }; yht++; }
  osioittain[o] = d.avaimet.length; osiot[o] = { _konteksti: d.konteksti, _lahde: d.lahde, rivit };
}
const ulos = { _tiedosto: 'TalentMaster — sv-käännöserä 74 (K3a: Anna pelaajan valita + Hylkää valinta uudella sivulla — valikkorivin syy ja Hylkää-ikkunan ohje; 2 riviä; sv tyhjä → Gemini)', _pvm: '2026-10-20', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: yht, _rivit_osioittain: osioittain, osiot };
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + yht + ' riviä → ' + OUT.replace(ROOT + '/', ''));
