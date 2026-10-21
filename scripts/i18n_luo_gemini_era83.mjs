#!/usr/bin/env node
/* sv-erä 83 (Seura-tuonnin esikatselun STATUS-merkit; CODE_BRIEF_SEURA_TUONTI_OLEMASSA kohta 6, 21.10.2026) — lähetystiedosto PM:lle.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, PM kirjoittaa. Avain = suomenkielinen teksti sellaisenaan (tmHT-reititin: lib/tm_henkilosto_i18n.js, osio henkilosto_kartta).
   Mukana vain rivit, joita ei vielä ole henkilöstökartassa eikä yhteisessä kartassa (tm_henkilosto_i18n.js / tm_i18n_common.js). Idempotentti: täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era83.mjs [--tiedosto=docs/i18n/sv_kaannoserae_83_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_83_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const HS = (require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N || require('../lib/tm_henkilosto_i18n.js')).sv, CS = (require('../lib/tm_i18n_common.js').TM_I18N_COMMON || require('../lib/tm_i18n_common.js')).sv;
const KONTEKSTI = 'HENKILÖKUNTA: Seurahallinta (VP/sihteeri/UTJ). Avain = suomenkielinen teksti sellaisenaan. Paikanvaraajat ({n}, {osoite}, {vanha}, {uusi}) säilytetään täsmälleen. Excel-tuonnin esikatselu ja yhteenveto: rivin tila "Uusi" / "Jo järjestelmässä" + mikä eroaa Excelistä; pelaajakortin kutsuikkuna ja kutsuhistoria. Termit: huoltaja = vårdnadshavare, suostumus = samtycke, kutsu = inbjudan, kehityssuunnitelma = utvecklingsplan (sama kuin termisto.fi-sv). Sävy: selkeä, arkinen.';
const RIVIT = {
  'Virhe': 'Esikatselun STATUS-sarakkeen lyhyt merkki (koodissa eteen "⛔ "): rivillä on virhe, jonka syy kerrotaan rivin alla. Yksi sana.',
  '⚠️ Huomio': 'Esikatselun STATUS-sarakkeen lyhyt merkki: rivillä on huomautus (ei estä tuontia tai rivi ohitetaan), syy kerrotaan rivin alla. Säilytä ⚠️ ja välilyönti. Yksi sana.',
};
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot.henkilosto_kartta && nyk.osiot.henkilosto_kartta.rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const rivit = {};
for (const [fi, huom] of Object.entries(RIVIT)) { if (fi in HS || fi in CS) continue; rivit[fi] = { fi, huom, sv: vanha(fi) }; }
const ulos = { _otsikko: 'Käännöserä 83 (Seura-tuonnin esikatselun STATUS-merkit: Virhe, Huomio) — sv: PM kirjoittaa', osiot: { henkilosto_kartta: { _konteksti: KONTEKSTI, _lahde: 'TalentMaster_Seura.html (tmHT) + lib/tm_seura_tuonti.js', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 2) + '\n');
console.log(JSON.stringify({ tiedosto: OUT.replace(ROOT + '/', ''), rivit: Object.keys(rivit).length }));
