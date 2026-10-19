#!/usr/bin/env node
/* Gemini-erä 69 (palaute-näkyvyys vaihe 0a, 19.10.2026: merkkinäkymä pelaajalle ja huoltajalle). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = 4 uutta tm_lang-riviä (vanhempi.merkki_*), jotka ovat yhteiset Pelaaja_v7:lle ja Vanhempi_v2:lle. Merkkien nimet (kulta/hopea/pronssi) ovat jo avaimissa pelaaja.tk_merkki_*.
   Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era69.mjs [--tiedosto=docs/i18n/sv_kaannoserae_69_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_69_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const L = require('../lib/tm_lang.js').TM_LANG;
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (avain) => { const r = nyk && nyk.osiot && nyk.osiot.tm_lang && nyk.osiot.tm_lang.rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };

const HUOM = {
  merkki_kohti_pronssi: 'Pelaajan JA huoltajan tekniikkakortti: pelaajalla ei vielä merkkiä, seuraava tavoite on pronssimerkki. Lyhyt, kannustava, EI lukuja eikä etäisyyttä. "Kohti" = suuntaa, ei vaadi lopputulosta. Merkkien termistö samaksi kuin avaimissa pelaaja.tk_merkki_* (bronsmedalj).',
  merkki_kohti_hopea: 'Pelaajan JA huoltajan tekniikkakortti: pelaajalla on pronssimerkki, seuraava tavoite on hopeamerkki. Sama sävy ja termistö kuin merkki_kohti_pronssi (silvermedalj).',
  merkki_kohti_kulta: 'Pelaajan JA huoltajan tekniikkakortti: pelaajalla on hopeamerkki, seuraava tavoite on kultamerkki. Sama sävy ja termistö kuin merkki_kohti_pronssi (guldmedalj).',
  merkki_parempi: 'Tekniikkakortti, näytetään VAIN kun pelaajan oma tulos on parempi kuin hänen oma edellinen mittauksensa. Vertailu vain itseen, ei muihin. Lyhyt, myönteinen, ei lukuja.'
};
const avaimet = Object.keys(HUOM);
const puuttuu = avaimet.filter((k) => !L.fi.vanhempi[k] || !L.en.vanhempi[k]);
if (puuttuu.length) { console.error('avaimelta puuttuu fi/en', puuttuu); process.exit(1); }
const rivit = {};
for (const k of avaimet) rivit['vanhempi.' + k] = { fi: L.fi.vanhempi[k], en: L.en.vanhempi[k], huom: HUOM[k], sv: vanha('vanhempi.' + k) };
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 69 (palaute-näkyvyys 0a: merkkinäkymä "Kohti …" + "Parempi kuin viime kerralla"; sv tyhjä → Gemini)',
  _pvm: '2026-10-19',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (en, huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: avaimet.length,
  _rivit_osioittain: { tm_lang: avaimet.length },
  osiot: { tm_lang: {
    _konteksti: 'PELAAJA ja HUOLTAJA (nuori pelaaja, myös U13–14): tekniikkakortin merkkirivit. Avain = pisteytetty polku lib/tm_lang.js:ssä (vanhempi.merkki_*). Sävy: kannustava ja lyhyt. Ei lukuja, ei sekunteja, ei vertailua muihin.',
    _lahde: 'lib/tm_lang.js', rivit } },
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
_log('Kirjoitettu ' + avaimet.length + ' riviä → ' + OUT.replace(ROOT + '/', ''));
