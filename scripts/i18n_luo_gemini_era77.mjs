#!/usr/bin/env node
/* Gemini-erä 77 (K1b-jatko: Tämän viikon fokus (Teron päätös 20.10.)). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö: 3 riviä. lib.tm_kt_havainto: kt_viikon_fokus + kt_viikon_fokus_asetettu · lib.tm_tanaan_kentta: k1_talla_viikolla (pelaajan Viikko-kortin merkki).
   fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era77.mjs [--tiedosto=docs/i18n/sv_kaannoserae_77_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_77_gemini.json'));
const OSIOT = {
  'lib.tm_kt_havainto': {
    lahde: 'lib/tm_kt_havainto.js (FI-avaimet kt_viikon_fokus, kt_viikon_fokus_asetettu)', konteksti: 'HENKILÖKUNTA (valmentaja ja VP): viikkohavainnon alasheetti. Valmentaja valitsee pelaajan viikon ydinasian ("Tämän viikon fokus"). Sävy: lyhyt ja neutraali.',
    tiedosto: '../lib/tm_kt_havainto.js',
    avaimet: {
      kt_viikon_fokus: 'Napin teksti alasheetissä: merkitsee valitun ydinasian tämän viikon fokukseksi (voimassa kunnes viikko vaihtuu tai valmentaja valitsee toisen). Toimintokehote, lyhyt, ei pistettä.',
      kt_viikon_fokus_asetettu: 'Vahvistusilmoitus (toast) kun valinta on tallennettu. Päättyy merkkiin ✓ (säilytä).'
    }
  },
  'lib.tm_tanaan_kentta': {
    lahde: 'lib/tm_tanaan_kentta.js (FI-avain k1_talla_viikolla)', konteksti: 'PELAAJA (U8–U19): Tänään/Viikko-kortin ydinasialista; pieni merkki sen ydinasian rivillä, jota harjoitellaan tällä viikolla. Sävy: rauhallinen, ei vertailua. Sama sana kuin sn_talla_viikolla.',
    tiedosto: '../lib/tm_tanaan_kentta.js',
    avaimet: { k1_talla_viikolla: 'Pieni merkki ydinasian rivin oikeassa reunassa ("tällä viikolla"), pienellä alkukirjaimella, ei pistettä. Vastaa sanastoavainta sn_talla_viikolla ("denna vecka").' }
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
  _tiedosto: 'TalentMaster — sv-käännöserä 77 (K1b: Teron tuotantotestin korjaukset — viikkohavainnon lauseen selite, Historian kesto päivinä, "Piirrä taululle"; ' + yht + ' riviä; sv tyhjä → Gemini)', _pvm: '2026-10-20',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: yht, _rivit_osioittain: maarat, osiot
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + yht + ' riviä → ' + OUT.replace(ROOT + '/', ''));
