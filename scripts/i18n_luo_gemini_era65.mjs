#!/usr/bin/env node
/* Gemini-erä 65 (Kehitystyöpöytä 22 · B4b: Polku — Tämä viikko (luku), Pelaajan ääni, Historia; 17.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_kt_polku, VAIN B4b:n uudet avaimet (erän 64 avaimet jäävät sen erään). fi luetaan suoraan libistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era65.mjs [--tiedosto=docs/i18n/sv_kaannoserae_65_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_65_gemini.json'));
const OSIO = 'lib.tm_kt_polku';
const ERA64 = Object.keys(JSON.parse(readFileSync(join(ROOT, 'docs/i18n/sv_kaannoserae_64_gemini.json'), 'utf8')).osiot[OSIO].rivit);
const FI_KAIKKI = require('../lib/tm_kt_polku.js').FI;
const FI = Object.fromEntries(Object.entries(FI_KAIKKI).filter(([k]) => !ERA64.includes(k)));
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot[OSIO] && nyk.osiot[OSIO].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const VIITE = ' Termistö: jakso = period, havainto = observation, klippi = klipp, pelaaja = spelare, huoltaja = vårdnadshavare, kausi = säsong, osat = delar.';
const H = {
  ktp_viikko_ots: 'Jana-otsikko (yläotsikko, isot kirjaimet): kuluva viikko, esim. "Tämä viikko · 19.10.–25.10. · luku". Koodi liittää perään päivämäärät ja sanan "luku" (= vain luettava näkymä).',
  ktp_viikko_luku: 'Jana-otsikon pääte pienellä: näkymä on vain luettava (ei muokattavissa), esim. "luku" = "läsning" / "visning".',
  ktp_pv_ma: 'Viikonpäivän lyhenne, maanantai (2 kirjainta, iso alkukirjain).', ktp_pv_ti: 'Viikonpäivän lyhenne, tiistai.', ktp_pv_ke: 'Viikonpäivän lyhenne, keskiviikko.', ktp_pv_to: 'Viikonpäivän lyhenne, torstai.',
  ktp_pv_pe: 'Viikonpäivän lyhenne, perjantai.', ktp_pv_la: 'Viikonpäivän lyhenne, lauantai.', ktp_pv_su: 'Viikonpäivän lyhenne, sunnuntai.',
  ktp_ev_harjoitus: 'Kalenteritapahtuman tyyppi viikkonäkymän solussa: joukkueen harjoitus. Yksi sana.', ktp_ev_ottelu: 'Kalenteritapahtuman tyyppi viikkonäkymän solussa: ottelu. Yksi sana.',
  ktp_vk_katsaus: 'Sunnuntain solu: pelaajan viikkokatsaus (lyhyt kysely, johon pelaaja vastaa sunnuntaisin).', ktp_vk_vastattu: 'Viikkokatsauksen tila (pienellä): pelaaja on vastannut.', ktp_vk_odottaa: 'Viikkokatsauksen tila (pienellä): pelaaja ei ole vielä vastannut, vastaa sunnuntaina.',
  ktp_vk_ei_tapahtumia: 'Tällä viikolla ei ole pelaajan joukkueen harjoituksia tai otteluita kalenterissa. Yksi lause, loppupiste.',
  ktp_vk_lahde: 'Pieni selite viikkonäkymän alla: harjoitukset ja ottelu tulevat joukkueen kalenterista; viikkokatsaus tehdään sunnuntaina. Ei lausemerkkiä loppuun (pieni teksti).',
  ktp_virhe_viikko: 'Virheilmoitus: viikon kalenteritapahtumia ei voitu ladata. Yksi lause, loppupiste.',
  ktp_aani: 'Jana-otsikko (yläotsikko, isot kirjaimet): "Pelaajan ääni" = pelaajan omia kirjoittamia tekstejä (klippivastaukset, viikkokatsauksen lause, kausitavoite omin sanoin), sanatarkasti lainattuina.' + VIITE,
  ktp_a_kausi: 'Lähde-nimike pelaajan tekstille: pelaajan kauden tavoite hänen omin sanoin kirjoittamanaan.', ktp_a_klippi: 'Lähde-nimike pelaajan tekstille: pelaajan vastaus valmentajan lähettämään klippiin.',
  ktp_a_vk: 'Lähde-nimike pelaajan tekstille: pelaajan viikkokatsauksen lause.',
  ktp_a_uusinta: 'Pieni yhteenvetorivi Pelaajan äänen alla, esim. "3 uusinta · 5 tekstiä yhteensä". Säilytä {n} ja {yht}.', ktp_a_omaa: 'Pieni yhteenvetorivi Pelaajan äänen alla, esim. "2 pelaajan omaa tekstiä". Säilytä {n}.',
  ktp_historia: 'Jana-otsikko (yläotsikko, isot kirjaimet): suljetut (päättyneet) jaksot uusimmasta alkaen. Yksi sana.',
  ktp_h_tyhja: 'Historia on tyhjä, koska yhtään jaksoa ei ole vielä suljettu. Yksi lause, loppupiste.',
  ktp_h_osaa: 'Jakson trendi, esim. "2/3 osaa itsenäisesti" (nuoli ↗ lisätään koodissa edelle). Säilytä {a} ja {b}; "osaa" = pelaaja osaa jakson osat (a/b) ilman ohjausta.' + VIITE,
  ktp_h_vaihdettu: 'Jakson tila (pienellä): jakso vaihdettiin toiseen kesken tai lopussa. Yksi sana.', ktp_h_vk: 'Jakson kesto lyhyesti, esim. "6 vk". Säilytä {n}.',
  ktp_h_lause_valm: 'Jakson katselmuksen lauseen lähde (pienellä, tulee lainauksen perään viivalla): valmentajan kirjoittama lause pelaajalle.', ktp_h_lause_vp: 'Jakson katselmuksen lauseen lähde (pienellä): VP:n (valmennuspäällikön) kirjoittama lause pelaajalle.',
  ktp_h_klipit: 'Avautuva otsikko historian jaksolla, esim. "Klipit (3)". Säilytä {n}.'
};
const puuttuu = Object.keys(FI).filter((k) => !(k in H)), ylim = Object.keys(H).filter((k) => !(k in FI));
if (puuttuu.length || ylim.length) { console.error('huom-avaimet eivät täsmää libiin: puuttuu ' + puuttuu + ' · ylimääräiset ' + ylim); process.exit(1); }
const rivit = {}; for (const k of Object.keys(FI)) rivit[k] = { fi: FI[k], huom: H[k], sv: vanha(k) };
const n = Object.keys(rivit).length;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 65 (Kehitystyöpöytä 22 · B4b: Polku — Tämä viikko (luku), Pelaajan ääni, Historia; sv tyhjä → Gemini)',
  _pvm: '2026-10-17',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: n,
  _rivit_osioittain: { [OSIO]: n },
  osiot: { [OSIO]: { _konteksti: 'HENKILÖKUNTA (valmentaja ja VP, työpöytä + puhelin): pelaajan Polku-välilehti Kehitystyöpöydällä, jana jatkuu: Tämä viikko (viikon harjoitukset ja ottelu kalenterista, sunnuntaina viikkokatsaus) → Pelaajan ääni (pelaajan omat tekstit lainauksina) → Historia (suljetut jaksot, trendi, jakson klipit). Avain = lib-avain (ktp_*). Sävy: valmentajalle suunnattu, konkreettinen, lyhyt ja neutraali. Paikkamerkit {…} säilytetään. Termistö lukittu (docs/i18n/termisto.fi-sv.json).', _lahde: 'lib/tm_kt_polku.js (FI, vain B4b:n uudet avaimet)', rivit } }
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + n + ' riviä → ' + OUT.replace(ROOT + '/', ''));
