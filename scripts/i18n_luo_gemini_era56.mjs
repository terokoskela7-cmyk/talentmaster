#!/usr/bin/env node
/* Gemini-erä 56 (Sibbo-viimeistely 16.10.: tietosuojaikkunan muuttuneet ja uudet avaimet). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = tietosuojaikkunan MUUTTUNUT rivi (rek_ts_sijainti_teksti) + 2 uutta (rek_ts_sailytysaika_90pv, rek_ts_koko_otsikko). EI toista erien 53 ja 54 rivejä; erän 55 vanha sijaintirivi korvautuu tällä.
   Idempotentti: jo täytetty sv säilyy. Ajo: node scripts/i18n_luo_gemini_era56.mjs [--tiedosto=docs/i18n/sv_kaannoserae_56_gemini.json] */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_56_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const L = require('../lib/tm_lang.js').TM_LANG;
const lue = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (avain) => { const r = nyk && nyk.osiot && nyk.osiot.tm_lang && nyk.osiot.tm_lang.rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const aiemmat = new Set(); for (const f of ['sv_kaannoserae_53_gemini.json', 'sv_kaannoserae_54_gemini.json']) for (const o of Object.values(lue('docs/i18n/' + f).osiot)) for (const k of Object.keys(o.rivit)) aiemmat.add(k);

const HUOM = {
  rek_ts_sijainti_teksti: 'MUUTTUNUT rivi (erässä 55 vanha sisältö "Google Firebase (EU-alue). Tietoja ei siirretä EU:n ulkopuolelle." — se oli virheellinen eikä sitä saa käyttää): tietosuojaselosteen ikkunan rivi, arvo seuraa riviä rek_ts_sijainti_otsikko ("Tietojen sijainti:", lihavoitu). Uusi teksti kertoo tallennuspaikat ja käsittelyn EU:n ulkopuolella (SendGrid, USA). Säilytä tuotenimet ja lyhenteet täsmälleen: Google Cloud, europe-west1, AWS, SendGrid, EU, EU–US Data Privacy Framework (pidä pitkä ajatusviiva EU–US). "vakiosopimuslausekkeet" = EU:n Standard Contractual Clauses (SCC; käytä virallista termiä). "Tukholma" = Stockholm. Juridinen teksti (GDPR): pidä tarkkana, älä pehmennä äläkä lisää lupauksia.',
  rek_ts_sailytysaika_90pv: 'UUSI. Lause liitetään koodissa heti rek_ts_sailytysaika_teksti-rivin ("Asiakassuhteen päättymiseen + 2 vuotta.") perään samaan kappaleeseen: kokonaisuus lukee "Säilytysaika: Asiakassuhteen päättymiseen + 2 vuotta. Suostumuksen peruutuksen jälkeen tiedot poistetaan 90 päivän kuluessa." Säilytä luku 90. Juridinen teksti: pidä tarkkana.',
  rek_ts_koko_otsikko: 'UUSI. Tietosuojaselosteen ikkunan viimeisen rivin otsikko (lihavoitu, kaksoispiste mukana); sähköpostiosoite tietosuoja@talentmasterid.com lisätään koodissa perään. Koko tietosuojaseloste = täydellinen tietosuojaseloste (ikkunassa on vain tiivistelmä).',
};
const avaimet = Object.keys(HUOM);
const puuttuuHuom = avaimet.filter((k) => !L.fi.suostumus[k] || !L.en.suostumus[k]), ylimaaraiset = [];
if (puuttuuHuom.length || ylimaaraiset.length) { console.error('avaimelta puuttuu fi/en', { puuttuuHuom, ylimaaraiset }); process.exit(1); }
const toistot = avaimet.filter((k) => aiemmat.has('suostumus.' + k)); if (toistot.length) { console.error('Rivi jo erässä 53/54:', toistot); process.exit(1); }
const rivit = {};
for (const k of avaimet) rivit['suostumus.' + k] = { fi: L.fi.suostumus[k], en: L.en.suostumus[k], huom: HUOM[k], sv: vanha('suostumus.' + k) };
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 56 (Sibbo 1.11. suostumuslomake vaihe 1: staattinen markup; EI erien 53/54 rivejä; sv tyhjä → Gemini)',
  _pvm: '2026-10-16',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (en, huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.',
  _rivit_yhteensa: avaimet.length,
  _rivit_osioittain: { tm_lang: avaimet.length },
  osiot: { tm_lang: {
    _konteksti: 'HUOLTAJA (vanhempi): suostumuslomakkeen tietosuojaselosteen ikkuna (TalentMaster_Rekisterointi_Suostumus.html). Avain = pisteytetty polku lib/tm_lang.js:ssä (suostumus.rek_ts_*). Rivit täydentävät erän 55 ikkunan muita rivejä (otsikko "DATASKYDDSBESKRIVNING", "Tietojen sijainti:" = "Uppgifternas placering:", "Säilytysaika:" = "Lagringsperiod:", Palloliitto = "Bollförbundet"; katso docs/i18n/sv_kaannoserae_55_palautus.json) — käytä samoja termejä. Lomake on GDPR-polussa: pidä selkeänä ja tarkkana, älä pehmennä äläkä lisää lupauksia. Termistö: docs/i18n/termisto.fi-sv.json (lukittu). Säilytä välimerkit, tuotenimet ja lyhenteet täsmälleen.',
    _lahde: 'lib/tm_lang.js', rivit } },
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
_log('Kirjoitettu ' + avaimet.length + ' riviä → ' + OUT.replace(ROOT + '/', ''));
