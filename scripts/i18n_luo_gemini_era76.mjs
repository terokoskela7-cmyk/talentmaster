#!/usr/bin/env node
/* Gemini-erä 76 (K1b: Teron tuotantotestin korjaukset 20.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö: 3 riviä. lib.tm_kt_havainto: kt_h_lause_ohje (fi MUUTETTU: lause ei näy pelaajalle — vanha sv-rivi poistettu koodista) · lib.tm_kt_polku: ktp_h_pv ("{n} pv", Historian toteutunut kesto) ja ktp_piirra_taululle (⋯-valikon kohta).
   fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era76.mjs [--tiedosto=docs/i18n/sv_kaannoserae_76_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_76_gemini.json'));
const OSIOT = {
  'lib.tm_kt_havainto': {
    lahde: 'lib/tm_kt_havainto.js (FI-avain kt_h_lause_ohje)', konteksti: 'HENKILÖKUNTA (valmentaja ja VP): viikkohavainnon alasheetti, lausekenttä. Lause on henkilökunnan sisäinen eikä näy pelaajalle eikä huoltajalle. Sävy: lyhyt ja neutraali.',
    tiedosto: '../lib/tm_kt_havainto.js',
    avaimet: { kt_h_lause_ohje: 'Ohjerivi lausekentän alla. FI-teksti MUUTTUI (vanha: "…Lause voi päätyä pelaajalle, joten kirjoita myönteisesti."): nyt kaksi lausetta — merkkiraja ja se, että vain henkilökunta näkee tekstin (pelaaja ja huoltaja eivät). Päättyy pisteeseen.' }
  },
  'lib.tm_kt_polku': {
    lahde: 'lib/tm_kt_polku.js (FI-avaimet ktp_h_pv, ktp_piirra_taululle)', konteksti: 'HENKILÖKUNTA (valmentaja ja VP): pelaajan Polku-välilehti. Sävy: lyhyt ja neutraali.',
    tiedosto: '../lib/tm_kt_polku.js',
    avaimet: {
      ktp_h_pv: 'Historia-rivin kesto päivinä, kun jakso on suljettu alle viikon jälkeen ({n} = päivien määrä, esim. "3 pv"). Pidä {n}-paikkamerkki ja lyhenne lyhyenä; vastaa avainta ktp_h_vk ("{n} vk").',
      ktp_piirra_taululle: 'Valikkokohdan teksti (⋯-valikko): avaa taktiikkataulun, jolle valmentaja piirtää (taulu = taktiikkataulu, "Taktiikkataulu" Masterissa). Toimintokehote, lyhyt, ei pistettä.'
    }
  }
};
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const osiot = {}, maarat = {}; let yht = 0;
for (const [o, d] of Object.entries(OSIOT)) {
  const FI = require(d.tiedosto).FI, rivit = {};
  for (const [k, huom] of Object.entries(d.avaimet)) { if (!(k in FI)) { console.error('puuttuu libistä: ' + k); process.exit(1); } rivit[k] = { fi: FI[k], huom: huom, sv: vanha(o, k) }; yht++; }
  maarat[o] = Object.keys(rivit).length; osiot[o] = { _konteksti: d.konteksti, _lahde: d.lahde, rivit };
}
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 76 (K1b: Teron tuotantotestin korjaukset — viikkohavainnon lauseen selite, Historian kesto päivinä, "Piirrä taululle"; ' + yht + ' riviä; sv tyhjä → Gemini)', _pvm: '2026-10-20',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: yht, _rivit_osioittain: maarat, osiot
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + yht + ' riviä → ' + OUT.replace(ROOT + '/', ''));
