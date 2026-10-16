#!/usr/bin/env node
/* Gemini-erä 59 (Pikakortti design-korjaukset + pelaajakortin unelma-rivin kielivuodot, 16.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö: (1) henkilosto_kartta: Pikakortin harjoitusvinkin otsikko + avauslinkki (uudet avaimet "Harjoitusvinkki:" / "Harjoitusvinkki ▾"; vanha "Seuraava askel:" poistettu käytöstä)
            (2) lib.pelaajakortti_unelma: pelaajakortin unelma-rivi ("Kuin <hahmo> — <teema>"): IDOLIT-nimet (Viimeistelijä, Velho, Arkkitehti) + NIMIKKO_VIIKOT-teemat (8) — lib/tm-microcycles.js; avain = fi-teksti (Pelaaja_v7 _p7K1T → tmLibT).
            Hahmonimet Maestro, Shadowstep, Railgun, Titan ennallaan (ei rivejä). Pelipaikkojen sv on jo tm_lang-avaimissa (POS-kartta) → ei rivejä.
   Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era59.mjs [--tiedosto=docs/i18n/sv_kaannoserae_59_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_59_gemini.json'));
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (osio, avain) => { const r = nyk && nyk.osiot && nyk.osiot[osio] && nyk.osiot[osio].rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const rivi = (osio, fi, huom) => ({ fi, huom, sv: vanha(osio, fi) });

const H = {
  'Harjoitusvinkki:': 'UUSI. Pikakortin (valmentajan kenttätyökalu) rivin otsikko ulottuvuuskuvauksen alla: lihavoitu, kaksoispiste mukana; perässä vinkki harjoituksen suunnitteluun. Vastaa aiempaa otsikkoa "Seuraava askel:" (Nästa steg:), joka on nyt varattu pelaajan omalle tavoitteelle — älä käytä "Nästa steg" tässä.',
  'Harjoitusvinkki ▾': 'UUSI. Avauslinkki (painike) ulottuvuuskuvauksen alla; avattaessa vinkki tulee näkyviin ja linkin teksti vaihtuu "Piilota ▴" (Dölj ▴). Säilytä nuoli ▾ ja kirjoitusasu: sama tyyli kuin "Mitä näit? ▾" (Vad såg du? ▾). Lyhyt.'
};
const U = {
  'Viimeistelijä': 'Hahmo (viikon idoli) pelaajakortin unelma-rivillä: maalinteon arkkityyppi ("finisher"), EI oikea henkilö. Isolla alkukirjaimella, yksi sana, ei artikkelia; sävy kuin muut hahmonimet (Maestro, Shadowstep, Railgun, Titan — ennallaan).',
  'Velho': 'Hahmo (viikon idoli) pelaajakortin unelma-rivillä: taitava pallonkäsittelijä ("wizard"), EI oikea henkilö. Isolla alkukirjaimella, yksi sana; hahmonimi, ei yleiskielen sana.',
  'Arkkitehti': 'Hahmo (viikon idoli) pelaajakortin unelma-rivillä: pelin rakentaja, syöttöjen suunnittelija ("architect"), EI oikea henkilö. Isolla alkukirjaimella, yksi sana; hahmonimi.',
  'Vastaanotto': 'Viikon teema (jalkapallotaito): pallon vastaanotto, first touch. Rivillä "Kuin <hahmo> — <teema>".',
  'Dribbeli': 'Viikon teema: kuljetus/harhautus, dribbling. Jalkapallotermi.',
  '1v1 suora': 'Viikon teema: yksi vastaan yksi suoraan eteenpäin (nopeus avoimessa tilassa). Säilytä "1v1".',
  '1v1 ahtaassa tilassa': 'Viikon teema: yksi vastaan yksi ahtaassa tilassa (tiukassa paineessa). Säilytä "1v1".',
  'Liike ilman palloa': 'Viikon teema: liikkuminen ilman palloa (juoksut, vapaaksi pääsy, off-the-ball).',
  'Syöttö': 'Viikon teema: syöttäminen (passing).',
  'Maalinteko': 'Viikon teema: maalinteko, viimeistely (finishing).',
  'Oma valinta': 'Viikon 8 vaihtoehto, kun pelaaja valitsee teeman itse: näkyy sekä hahmon nimenä että teemana ("Oma valinta — Oma valinta"). Lyhyt, neutraali.'
};
const rH = {}, rU = {};
for (const [k, h] of Object.entries(H)) rH[k] = rivi('henkilosto_kartta', k, h);
for (const [k, h] of Object.entries(U)) rU[k] = rivi('lib.pelaajakortti_unelma', k, h);
const n1 = Object.keys(rH).length, n2 = Object.keys(rU).length;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 59 (Pikakortti design-korjaukset: harjoitusvinkin otsikko + linkki; pelaajakortin unelma-rivin hahmonimet ja viikon teemat; sv tyhjä → Gemini)',
  _pvm: '2026-10-16',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: n1 + n2,
  _rivit_osioittain: { henkilosto_kartta: n1, 'lib.pelaajakortti_unelma': n2 },
  osiot: {
    henkilosto_kartta: { _konteksti: 'HENKILÖKUNTA (valmentaja kentällä): ADAR-pikakortin (Pelihavainto) harjoitusvinkki — vinkki harjoituksen suunnitteluun, joka näytetään ulottuvuuden pistekuvauksen alla. Avain = suomenkielinen teksti sellaisenaan. Sävy: valmentajalle suunnattu, konkreettinen, lyhyt (puhelimen kapea näyttö). Termistö lukittu (docs/i18n/termisto.fi-sv.json).', _lahde: 'TalentMaster_ADAR_Pikakortti.html (tmHT)', rivit: rH },
    'lib.pelaajakortti_unelma': { _konteksti: 'PELAAJA (lapsi lukee, 8–17 v): pelaajakortin "Unelma"-rivi muotoa "Kuin <hahmo> — <teema>" (esim. "Kuin Viimeistelijä — Maalinteko"). Hahmo = viikon arkkityyppi-idoli (EI oikea henkilö), teema = viikon harjoitusteema (jalkapallotaito). Hahmonimet Maestro, Shadowstep, Railgun ja Titan ovat tuotenimen kaltaisia ja jäävät ennalleen (ei riviä). Avain = suomenkielinen teksti sellaisenaan (lib/tm-microcycles.js → Pelaaja_v7 _p7K1T → tmLibT). Lämmin, kannustava; ei vertailua muihin. Termistö lukittu.', _lahde: 'lib/tm-microcycles.js (IDOLIT, NIMIKKO_VIIKOT)', rivit: rU }
  }
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('Kirjoitettu ' + (n1 + n2) + ' riviä → ' + OUT.replace(ROOT + '/', ''));
