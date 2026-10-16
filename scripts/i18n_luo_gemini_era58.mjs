#!/usr/bin/env node
/* Gemini-erä 58 (peliäly-tasokorjaus 16.10.: kortin ÄLY-tasojen yleiset nimet/kuvaukset + pikakortin D/R-kuvaustekstit ilman sekuntirajoja). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = VAIN muuttuneet/uudet fi-tekstit (luetaan suoraan libeistä → erä = koodi): lib.rubriikit (TM_ADAR_RUBRIIKKI.TASOT nimi + nyt; tason 5 nyt ja kaikki askel-tekstit ENNALLAAN → vanhat sv-käännökset pätevät) ja lib.tm_adar_tekstit (adar_D_d1–d3, D_v1, D_v3, R_d1–d3).
   Koulutus-sivun (TalentMaster_ADAR_Koulutus.html) muuttuneet lauseet EIVÄT ole erässä: sivu on vain suomeksi (ei i18n-reittiä).
   Vanhat sv-arvot on poistettu tm_lib_i18n.js:stä (vanha sv kuvasi sekuntirajoja / väärää tasoa). Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era58.mjs [--tiedosto=docs/i18n/sv_kaannoserae_58_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_58_gemini.json'));
const R = require('../lib/tm_adar_rubriikki.js'), TX = require('../lib/tm_adar_tekstit.js');
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (osio, avain) => { const r = nyk && nyk.osiot && nyk.osiot[osio] && nyk.osiot[osio].rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };

const TASO_NIMI_HUOM = 'Tason nimi (1 = alin … 5 = ylin; kokonaiskuvaus, ei ulottuvuutta). Yksi sana. Lapselle (8–17 v) näytettävän tason otsikko.';
const rubriikit = {};
for (let t = 1; t <= 5; t++) {
  const x = R.TASOT[t];
  rubriikit[x.nimi] = { fi: x.nimi, huom: TASO_NIMI_HUOM + ' Taso ' + t + '. Termi "Vahva" (taso 4) = hyvä, vakaasti hallittu — ei fyysistä voimaa.', sv: vanha('lib.rubriikit', x.nimi) };
  if (t < 5) rubriikit[x.nyt] = { fi: x.nyt, huom: 'Tason ' + t + ' kuvaus lapsen kielellä ("Nyt: …"); kokonaiskuvaus, ei nimeä yksittäistä taitoa. Lämmin, kannustava, 2. persoona. Säilytä emoji.', sv: vanha('lib.rubriikit', x.nyt) };
}
const TX_HUOM = {
  adar_D_d1: 'MUUTTUNUT: sekuntiraja poistettu ("yli 2 s" → "pitkään"). Tasokuvaus 1 = kehitettävää. Älä lisää sekuntilukuja.',
  adar_D_d2: 'MUUTTUNUT: sekuntiraja poistettu ("1–2 sekunnissa" → "kohtuullisen nopeasti"). Tasokuvaus 2. Älä lisää sekuntilukuja.',
  adar_D_d3: 'MUUTTUNUT: sekuntiraja poistettu ("alle sekunnissa" → "nopeasti"). Tasokuvaus 3 = hallitsee. Älä lisää sekuntilukuja.',
  adar_D_v1: 'MUUTTUNUT: havaintovaihtoehto (valintanappi), lyhyt; "(< 1 s)" poistettu.',
  adar_D_v3: 'MUUTTUNUT: havaintovaihtoehto (valintanappi), yksi sana; "(> 2 s)" poistettu.',
  adar_R_d1: 'MUUTTUNUT: sekuntiraja poistettu ("jähmettyy yli 15 s" → jää virheeseen kiinni pitkäksi aikaa). Tasokuvaus 1. Palautuminen kuvataan suuruusluokkana, ei kellotettuna.',
  adar_R_d2: 'MUUTTUNUT: sekuntirajat poistettu ("10–15 sekunnissa"). Tasokuvaus 2. Palautuminen kuvataan suuruusluokkana, ei kellotettuna.',
  adar_R_d3: 'MUUTTUNUT: sekuntiraja poistettu ("alle 10 sekunnissa"). Tasokuvaus 3 = hallitsee. Palautuminen kuvataan suuruusluokkana, ei kellotettuna.',
};
const tekstit = {};
for (const k of Object.keys(TX_HUOM)) { if (!TX.FI[k]) { console.error('Avain puuttuu tm_adar_tekstit.FI:stä: ' + k); process.exit(1); } tekstit[k] = { fi: TX.FI[k], huom: TX_HUOM[k], sv: vanha('lib.tm_adar_tekstit', k) }; }
const n1 = Object.keys(rubriikit).length, n2 = Object.keys(tekstit).length;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 58 (peliäly-tasokorjaus: kortin ÄLY-tasot 1–5 + pikakortin D/R-kuvaustekstit ilman sekuntirajoja; vain muuttuneet/uudet rivit; sv tyhjä → Gemini)',
  _pvm: '2026-10-16',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: n1 + n2,
  _rivit_osioittain: { 'lib.rubriikit': n1, 'lib.tm_adar_tekstit': n2 },
  osiot: {
    'lib.rubriikit': { _konteksti: 'PELAAJA (lapsi lukee, 8–17 v): pelaajakortin ÄLY (peliäly) -rivin tason nimi ja "Nyt"-kuvaus. Avain = suomenkielinen teksti sellaisenaan (kirjasto tm_adar_rubriikki). Tasot 1–5 kuvaavat KOKONAISUUTTA (Alussa → Erinomainen), eivät yksittäistä taitoa. Lämmin, kannustava, ei vertailua muihin, ei menettämisen kieltä. Emojit säilytetään. Termistö lukittu.', _lahde: 'lib/tm_adar_rubriikki.js', rivit: rubriikit },
    'lib.tm_adar_tekstit': { _konteksti: 'HENKILÖKUNTA (valmentaja kentällä): ADAR-pikakortin D (Päätös) ja R (Palautuminen) -tasokuvaukset ja kaksi D-havaintovaihtoehtoa. Muutos: sekuntirajat poistettu — palautuminen ja päätösnopeus arvioidaan suuruusluokkana, ei kellottamalla. Älä lisää sekuntilukuja. Sävy: valmentajalle suunnattu, konkreettinen, ei arvottava. Termistö lukittu (lib_adar_nimet-osion käännökset).', _lahde: 'lib/tm_adar_tekstit.js', rivit: tekstit },
  },
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + (n1 + n2) + ' riviä → ' + OUT.replace(ROOT + '/', ''));
