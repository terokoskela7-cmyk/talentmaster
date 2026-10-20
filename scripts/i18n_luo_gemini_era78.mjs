#!/usr/bin/env node
/* Gemini-erä 78 (K1c: Teron tuotantotesti 20.10. ilta — viikon fokus näkyväksi, ilmoitusten ryhmittely ja Kuittaa kaikki). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö: 7 riviä. lib.tm_kehitystyopoyta: kt_fokus_merkki + kt_talla_viikolla_rivi · lib.tm_tanaan_kentta: k1_taman_viikon_fokus + k1_talla_harjoittelet · lib.tm_ilmoitus_lista: ilm_kertaa + ilm_kuittaa_kaikki.
   + lib.tm_kt_taulu: kt_taulu_tallentamatta (upotetun taktiikkataulun sulkemisen vahvistus). Yhteensä 7 riviä.
   fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era78.mjs [--tiedosto=docs/i18n/sv_kaannoserae_78_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_78_gemini.json'));
const OSIOT = {
  'lib.tm_kehitystyopoyta': {
    lahde: 'lib/tm_kehitystyopoyta.js (FI-avaimet kt_fokus_merkki, kt_talla_viikolla_rivi)', konteksti: 'HENKILÖKUNTA (valmentaja ja VP): Kehitystyöpöytä, Tänään-välilehti, Ydinasiat-lista. Viikon fokukseksi valittu ydinasia saa näkyvän merkin ja Ydinasiat-otsikon alle tulee yksi rivi. Sävy: lyhyt ja neutraali. Sama käsite kuin kt_viikon_fokus ("Tämän viikon fokus", erä 77).',
    tiedosto: '../lib/tm_kehitystyopoyta.js',
    avaimet: {
      kt_fokus_merkki: 'Badge viikon fokukseksi valitun ydinasian rivillä: "Tämän viikon fokus". Pidä sama käännös kuin avaimella kt_viikon_fokus (erä 77). Ei pistettä.',
      kt_talla_viikolla_rivi: 'Yksi rivi Ydinasiat-otsikon alla: "Tällä viikolla: {nimi}". {nimi} = viikon fokuksena oleva ydinasia (säilytä muuttuja täsmälleen).'
    }
  },
  'lib.tm_tanaan_kentta': {
    lahde: 'lib/tm_tanaan_kentta.js (FI-avaimet k1_taman_viikon_fokus, k1_talla_harjoittelet)', konteksti: 'PELAAJA (U8–U19): Viikko-kortti. Ylimpänä lyhyt rivi siitä, mitä pelaaja harjoittelee tällä viikolla, ja fokuksena olevan ydinasian rivillä merkki. Sävy: rauhallinen, ei lukuja, ei vertailua; lapsen kieli. Sama käsite kuin k1_talla_viikolla (erä 77).',
    tiedosto: '../lib/tm_tanaan_kentta.js',
    avaimet: {
      k1_taman_viikon_fokus: 'Merkki ydinasian rivin oikeassa reunassa: "Tämän viikon fokus". Ei pistettä.',
      k1_talla_harjoittelet: 'Viikko-kortin ylin rivi: "Tällä viikolla harjoittelet: {nimi}". {nimi} = ydinasian teksti (säilytä muuttuja täsmälleen). Puhuttelu sinuttelu, kuten muu pelaajan teksti.'
    }
  },
  'lib.tm_kt_taulu': {
    lahde: 'lib/tm_kt_taulu.js (FI-avain kt_taulu_tallentamatta)', konteksti: 'HENKILÖKUNTA (valmentaja ja VP): taktiikkataulu avautuu koko näytön tilaan pelaajakortin päältä. Kun taulun sulkee (× tai Esc) ja piirrokseen on tallentamattomia muutoksia, selaimen vahvistusikkuna kysyy tämän. "Taulu" = taktiikkataulu (Master: "Taktiikkataulu").',
    tiedosto: '../lib/tm_kt_taulu.js',
    avaimet: { kt_taulu_tallentamatta: 'Vahvistuskysymys (OK / Peruuta): tallentamattomat muutokset menetetään, haluatko sulkea taulun? Kaksi virkettä: toteamus + kysymys.' }
  },
  'lib.tm_ilmoitus_lista': {
    lahde: 'lib/tm_ilmoitus_lista.js (FI-avaimet ilm_kertaa, ilm_kuittaa_kaikki)', konteksti: 'PELAAJA ja HUOLTAJA: Ilmoitukset-lista. Saman nimiset perutut tapahtumat yhdistetään yhdeksi riveiksi ("Peruttu: Harjoitukset · 3 kertaa ▸") ja kun rivejä on vähintään kolme, otsikon viereen tulee "Kuittaa kaikki". Sävy: rauhallinen, ei hälyttävä.',
    tiedosto: '../lib/tm_ilmoitus_lista.js',
    avaimet: {
      ilm_kertaa: 'Ryhmärivin loppuosa "{n} kertaa" ("Peruttu: Harjoitukset · 3 kertaa"). {n} = lukumäärä (säilytä muuttuja täsmälleen). Ei pistettä.',
      ilm_kuittaa_kaikki: 'Pieni tekstinappi ilmoitusotsikon vieressä: kuittaa kaikki näkyvät ilmoitukset kerralla. Toimintokehote, ei pistettä.'
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
  _tiedosto: 'TalentMaster — sv-käännöserä 78 (K1c: Teron tuotantotestin korjaukset 20.10. ilta — viikon fokus näkyväksi, ilmoitusten ryhmittely + Kuittaa kaikki; ' + yht + ' riviä; sv tyhjä → Gemini)', _pvm: '2026-10-20',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: yht, _rivit_osioittain: maarat, osiot
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + yht + ' riviä → ' + OUT.replace(ROOT + '/', ''));
