#!/usr/bin/env node
/* Gemini-erä 61 (Peliäly: pelitilanne havaintoon, Vaihe 1; 16.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_adar_tekstit: (1) Pikakortin pelitilanne-chipit (pelin vaihe · paine · montako tilannetta), jotka näkyvät myös ok-näkymän yhteenvetorivillä,
   (2) peliälykortin luotettavuus (Master + VP, vain valmentajalle): taso, syyt, jakaumarivin osat ({n}-paikkamerkki) ja huomautus.
   fi luetaan suoraan libistä (erä = koodi). Avain = lib-avain (adar_pt_*, adar_luot_*, adar_jak_*), kuten erässä 58. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era61.mjs [--tiedosto=docs/i18n/sv_kaannoserae_61_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_61_gemini.json'));
const TX = require('../lib/tm_adar_tekstit.js');
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (osio, avain) => { const r = nyk && nyk.osiot && nyk.osiot[osio] && nyk.osiot[osio].rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };

const PT = ' Pikakortin (valmentajan kenttätyökalu, kapea puhelinnäyttö) painike (chip); valinta tallentuu havaintoon ja näkyy tallennuksen jälkeen yhteenvetorivillä muodossa "Ottelu · Siirtymä puolustukseen · Kova paine · 3–5 tilannetta" (osat erotetaan " · "). Lyhyt, valmentajan kenttäkieltä.';
const JAK = ' Peliälykortin (valmentaja/VP) rivin osa muodossa "Ottelu 4 · Pienpeli 2 · Harjoitus 6 | Siirtymät 5 · Hyökkäys 3 · Puolustus 2": nimi + lukumäärä. SÄILYTÄ paikkamerkki {n} täsmälleen ja sen paikka nimen jälkeen (lukumäärä sijoitetaan siihen koodissa).';
const HUOM = {
  adar_pt_otsikko_vaihe: 'UUSI. Rivin otsikko (pieni, versaali tyyli). Kysytään: missä pelin vaiheessa havainto tehtiin (hyökkäys, puolustus, siirtymät, erikoistilanne). Lyhyt substantiivi-ilmaus.',
  adar_pt_otsikko_paine: 'UUSI. Rivin otsikko: kuinka paineessa pelaaja oli (vastustajan painostus). Yksi sana. Paine = vastustajan aiheuttama painostus pelitilanteessa (ei henkinen paine).',
  adar_pt_otsikko_otos: 'UUSI. Rivin otsikko: montako pelitilannetta havainto perustuu (1–2, 3–5, 6+). Lyhyt kysymys/otsikko.',
  adar_pt_vaihe_hyokkays: 'UUSI.' + PT + ' Pelin vaihe: oma joukkue hyökkää / rakentaa peliä.',
  adar_pt_vaihe_puolustus: 'UUSI.' + PT + ' Pelin vaihe: oma joukkue puolustaa.',
  adar_pt_vaihe_siirtyma_hyok: 'UUSI.' + PT + ' Pelin vaihe: siirtymä HYÖKKÄYKSEEN eli pallonvoiton jälkeinen hetki (puolustuksesta hyökkäykseen). Erota ero edelliseen: kohde on hyökkäys.',
  adar_pt_vaihe_siirtyma_puol: 'UUSI.' + PT + ' Pelin vaihe: siirtymä PUOLUSTUKSEEN eli pallonmenetyksen jälkeinen hetki (hyökkäyksestä puolustukseen). Kohde on puolustus. Sama rakenne kuin edellinen vaihe (yhteinen kaava, vain suunta vaihtuu).',
  adar_pt_vaihe_erikois: 'UUSI.' + PT + ' Pelin vaihe: erikoistilanne (kulmapotku, vapaapotku, aloitus, heitto yms. pysäytetty peli).',
  adar_pt_paine_matala: 'UUSI.' + PT + ' Vastustajan paine on matala (pelaajalla on aikaa ja tilaa). Säilytä sana "paine" (tai vastaava) mukana, koska valinta näkyy yhteenvetorivillä ilman otsikkoa.',
  adar_pt_paine_kohtalainen: 'UUSI.' + PT + ' Vastustajan paine on kohtalainen. Säilytä sana "paine" (tai vastaava) mukana.',
  adar_pt_paine_kova: 'UUSI.' + PT + ' Vastustajan paine on kova (vähän aikaa ja tilaa). Säilytä sana "paine" (tai vastaava) mukana.',
  adar_pt_otos_1_2: 'UUSI.' + PT + ' Havainto perustuu 1–2 pelitilanteeseen. Säilytä numerot ja ajatusviiva "1–2".',
  adar_pt_otos_3_5: 'UUSI.' + PT + ' Havainto perustuu 3–5 pelitilanteeseen. Säilytä numerot ja ajatusviiva "3–5".',
  adar_pt_otos_6plus: 'UUSI.' + PT + ' Havainto perustuu 6 tai useampaan pelitilanteeseen. Säilytä "6+".',
  adar_luot_perustuu: 'UUSI. Pieni etuliite jakaumarivin edessä peliälykortilla: "<tämä>: Ottelu 4 · Pienpeli 2 · Harjoitus 6 | …". Kertoo, mihin peliälyarvio perustuu.',
  adar_luot_taso_vahva: 'UUSI. Peliälykortin (valmentaja/VP) luotettavuusmerkki, lihavoitu rivi. Arvio on luotettava: monta arvioijaa, myös ottelu-/pienpelihavaintoja. EI arvosana valmentajalle eikä pelaajalle.',
  adar_luot_taso_kohtalainen: 'UUSI. Peliälykortin luotettavuusmerkki: kohtalainen. Sama kaava kuin vahva ja ohut (vain taso vaihtuu).',
  adar_luot_taso_ohut: 'UUSI. Peliälykortin luotettavuusmerkki: ohut = arvio perustuu vielä vähään. Sama kaava kuin muut tasot. Sävy neutraali, ei syyttävä.',
  adar_luot_syy_yksi_arvioija: 'UUSI. Luotettavuuden syy (luettelorivi): arviossa on vain yksi arvioija. Lyhyt, neutraali toteamus.',
  adar_luot_syy_vain_harjoitus: 'UUSI. Luotettavuuden syy: kaikki havainnot on tehty harjoituksissa, ei ottelu- tai pienpelihavaintoja. Kehittävä sävy, ei moite.',
  adar_luot_syy_pieni_otos: 'UUSI. Luotettavuuden syy: useimmat havainnot perustuvat vain yhteen tai kahteen pelitilanteeseen (tai määrää ei ole kirjattu).',
  adar_luot_syy_vanha: 'UUSI. Luotettavuuden syy: uusin havainto on tehty jo aikaa sitten (yli noin kolme kuukautta). Älä mainitse tarkkaa päivämäärää.',
  adar_luot_syy_hajonta: 'UUSI. Luotettavuuden syy: eri arvioijien pisteet poikkeavat toisistaan selvästi. Neutraali, ei syyttävä.',
  adar_luot_huomio: 'UUSI. Lisähuomautus näytetään kun taso on "ohut". Tärkeä sävy: "ohut" EI ole valmentajan arvosana vaan kertoo, että arvio tarvitsee lisää havaintoja. Kehittävä, kannustava.',
  adar_jak_ottelu: 'UUSI.' + JAK + ' Konteksti: ottelu.',
  adar_jak_pienpeli: 'UUSI.' + JAK + ' Konteksti: pienpeli.',
  adar_jak_harjoitus: 'UUSI.' + JAK + ' Konteksti: harjoitus.',
  adar_jak_siirtymat: 'UUSI.' + JAK + ' Pelin vaihe: siirtymät (sekä hyökkäykseen että puolustukseen yhteensä), monikko.',
  adar_jak_hyokkays: 'UUSI.' + JAK + ' Pelin vaihe: hyökkäys.',
  adar_jak_puolustus: 'UUSI.' + JAK + ' Pelin vaihe: puolustus.',
  adar_jak_erikois: 'UUSI.' + JAK + ' Pelin vaihe: erikoistilanteet, monikko.'
};
const rivit = {};
for (const k of Object.keys(HUOM)) { if (!TX.FI[k]) { console.error('Avain puuttuu tm_adar_tekstit.FI:stä: ' + k); process.exit(1); } rivit[k] = { fi: TX.FI[k], huom: HUOM[k], sv: vanha('lib.tm_adar_tekstit', k) }; }
const puuttuu = Object.keys(TX.FI).filter((k) => /^adar_(pt|luot|jak)_/.test(k) && !HUOM[k]);
if (puuttuu.length) { console.error('FI-avain ilman huomautusta erässä: ' + puuttuu.join(', ')); process.exit(1); }
const n = Object.keys(rivit).length;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 61 (Peliäly: pelitilanne havaintoon, Vaihe 1: Pikakortin vaihe/paine/otos-chipit + peliälykortin luotettavuus ja jakaumat; sv tyhjä → Gemini)',
  _pvm: '2026-10-16',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: n,
  _rivit_osioittain: { 'lib.tm_adar_tekstit': n },
  osiot: {
    'lib.tm_adar_tekstit': { _konteksti: 'HENKILÖKUNTA (valmentaja kentällä + VP): (1) ADAR-pikakortin (Pelihavainto) pelitilanne-painikkeet: pelin vaihe, paine, montako tilannetta; (2) peliälykortin (Master/VP) luotettavuusmerkki, syyt ja "mihin arvio perustuu" -jakaumarivin osat. Avain = lib-avain (adar_pt_*, adar_luot_*, adar_jak_*). Sävy: valmentajalle suunnattu, konkreettinen, kehittävä ja neutraali — ei syyttävä eikä arvosteleva (luotettavuus "ohut" kertoo vain että arvio tarvitsee lisää havaintoja). Kapea puhelinnäyttö: lyhyet ilmaukset. Paikkamerkki {n} säilytetään. Termistö lukittu (docs/i18n/termisto.fi-sv.json): pelaaja, havainto, ottelu, pienpeli, harjoitus; pelivaiheiden termit (hyökkäys, puolustus, siirtymä, erikoistilanne) tarkistetaan termistöstä ja jalkapallon ruotsin kielestä.', _lahde: 'lib/tm_adar_tekstit.js (FI) · TalentMaster_ADAR_Pikakortti.html · Master/VP peliälykortti', rivit }
  },
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + n + ' riviä → ' + OUT.replace(ROOT + '/', ''));
