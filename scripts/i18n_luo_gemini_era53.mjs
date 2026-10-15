#!/usr/bin/env node
/* Gemini-erä 53 (Sibbo-valmius 1.11.2026; docs/i18n/SV_KATTAVUUS_SIBBO_2026-10-15.md). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = sv-kattavuusraportin (tools/i18n/sv_kattavuus.mjs) "puuttuu"-rivit, EI erien 51 ja 52 sisältöä eikä Geminiltä jo palautettuja rivejä:
     (1) fi-avaimet ilman sv:tä (reititinkartat, lib-FI-kartat, tm_lang) — osiot samalla rakenteella kuin erät 51/52;
     (2) kovakoodattu suomi ilman sv:tä, ei vielä reititetty (osiot "kovakoodatut.*"): sv-rivi odottaa reititystä — Tero päättää reitityksestä, ennen sitä rivit eivät näy koodissa.
   Idempotentti: jo täytetty sv (Geminin paluu) säilyy; rivit joita ei enää tarvita pudotetaan vain jos sv tyhjä.
   Ajo: node scripts/i18n_luo_gemini_era53.mjs [--tiedosto=docs/i18n/sv_kaannoserae_53_gemini.json] [--lapiajo=docs/i18n/sv_lapiajo_tulos.json] */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { laske } from '../tools/i18n/sv_kattavuus.mjs';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_53_gemini.json'));
if (!arg('tiedosto', null) && existsSync(join(ROOT, 'docs/i18n/sv_kaannoserae_53_palautus.json'))) { console.error('Erä 53 on lähetetty ja palautettu (docs/i18n/sv_kaannoserae_53_palautus.json) — lähetettyä erätiedostoa ei regeneroida. Seuraava erä: scripts/i18n_luo_gemini_era54.mjs.'); process.exit(3); }
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const lue = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const dec = (x) => String(x).replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&aring;/g, 'å').replace(/&mdash;/g, '—').replace(/&rarr;/g, '→').replace(/&rdquo;|&ldquo;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const tulos = laske(join(ROOT, arg('lapiajo', 'docs/i18n/sv_lapiajo_tulos.json')));
let nyk = null; try { nyk = lue(arg('tiedosto', 'docs/i18n/sv_kaannoserae_53_gemini.json')); } catch (e) { /* uusi */ }
const vanha = (osio, avain) => { const r = nyk && nyk.osiot && nyk.osiot[osio] && nyk.osiot[osio].rivit && nyk.osiot[osio].rivit[avain]; return r && typeof r.sv === 'string' ? r.sv : ''; };

/* Aiemmat erätiedostot: _konteksti / _lahde / en lib-riveille, jotka on lähetetty aiemmin mutta joiden sv ei ole koodissa eikä palautuksessa */
const AIEMMAT = {};
for (const n of [43, 45]) { try { AIEMMAT[n] = lue('docs/i18n/sv_kaannoserae_' + n + '_gemini.json'); } catch (e) { /* ei tiedostoa */ } }
const aiempiOsio = (osio) => { for (const [n, j] of Object.entries(AIEMMAT)) if (j.osiot && j.osiot[osio]) return { era: n, osio: j.osiot[osio] }; return null; };

const osiot = {};
const lisaa = (osio, konteksti, lahde, avain, rivi) => {
  if (!osiot[osio]) osiot[osio] = { _konteksti: konteksti, _lahde: lahde, rivit: {} };
  osiot[osio].rivit[avain] = Object.assign(rivi, { sv: vanha(osio, avain) });
};

/* (1) puuttuvat avaimet — dedupe lähteen ja avaimen mukaan yli näkymien */
const KARTTA_OSIO = { 'kartta.master': 'master_kartta', 'kartta.masterKt': 'master_kartta', 'kartta.vp': 'vp_kartta', 'kartta.henkilosto': 'henkilosto_kartta' };
const KONTEKSTI = {
  master_kartta: 'HENKILÖKUNTA (Master = valmentajan työpöytä): kalenterin tapahtuman siirto- ja lisäystoiminnot (Siirrä tapahtuma, päivän ja ajan tarkistus, "Lisää kalenteriini"), läsnäolon esivalinta ja ryhmätapahtuman valintavirheet. Avain = suomenkielinen teksti sellaisenaan (myös alku-/loppuvälilyönnit: osa lauseista jatkuu koodissa muuttujalla, esim. "Siirto epäonnistui: " + syy). Termistö: docs/i18n/termisto.fi-sv.json (lukittu). Säilytä {muuttujat}, välimerkit ja alku-/loppuvälilyönnit täsmälleen.',
};
const nahty = new Set();
for (const n of tulos.nakymat) for (const r of n.puuttuvat) {
  const id = r.lahde + '|' + r.avain; if (nahty.has(id)) continue; nahty.add(id);
  const muu = n.muuEra.find((x) => x.avain === r.avain);
  if (r.lahde.startsWith('lib.')) {
    const nimi = r.lahde.slice(4), osio = r.lahde, ai = aiempiOsio(osio), aiRivi = ai && ai.osio.rivit && ai.osio.rivit[r.avain];
    const rivi = { fi: r.fi }; if (aiRivi && aiRivi.en) rivi.en = aiRivi.en;
    if (muu) rivi.huom = 'Lähetetty jo erässä ' + muu.era + ' (sv tyhjä repossa, palautusta ei löydy docs/i18n:stä) — ohita jos palautus on jo Terolla.';
    lisaa(osio, (ai ? ai.osio._konteksti : 'Kirjasto lib/' + nimi + '.js (FI-avaimet).'), 'lib/' + nimi + '.js' + (ai ? ' (aiempi erä ' + ai.era + ')' : ''), r.avain, rivi);
  } else if (KARTTA_OSIO[r.lahde]) {
    const osio = KARTTA_OSIO[r.lahde];
    const rivi = { fi: r.fi }; if (muu) rivi.huom = 'Lähetetty jo erässä ' + muu.era + ' — ohita jos palautus on jo olemassa.';
    lisaa(osio, KONTEKSTI[osio] || 'Reititinkartan avain.', r.lahde, r.fi, rivi);
  } else if (r.lahde === 'tm_lang') {
    const L = require('../lib/tm_lang.js').TM_LANG, hae = (k, p) => p.split('.').reduce((o, x) => (o == null ? undefined : o[x]), L[k]);
    lisaa('tm_lang', 'Avain = pisteytetty polku lib/tm_lang.js:ssä. en-arvo on apuna.', 'lib/tm_lang.js', r.avain, { fi: r.fi, en: typeof hae('en', r.avain) === 'string' ? hae('en', r.avain) : '' });
  }
}

/* (2) kovakoodattu suomi ilman sv:tä — rivit odottavat reititystä; avain = fi-teksti sellaisenaan (kuten reititinkartoissa) */
const KOVA_KONTEKSTI = {
  harjoitusarviointi: 'HENKILÖKUNTA (valmentaja tai VP): harjoitusarviointilomake (lib/tm_harjoitusarviointi.js, sama lomake Masterissa ja VP:ssä). Kaksi mallia: A = harjoittelun laatu, B = valmennustaidot; arviointitapa itsearvio tai havainnointi. Lomakkeen kriteerit, kenttien otsikot, napit ja toastit. Kohde on 1.11. käyttöön tuleva ominaisuus; Sibbo-Vargarna. Termistö: docs/i18n/termisto.fi-sv.json (lukittu). Säilytä numerot, %-merkit ja välimerkit täsmälleen.',
  suostumus: 'HUOLTAJA (vanhempi) ja lapsi: rekisteröinti- ja suostumuslomake (TalentMaster_Rekisterointi_Suostumus.html) — vahvistuskuitti, virheilmoitukset ja kutsulinkin tilaviestit. GDPR-kriittinen teksti: pidä selkeänä, älä pehmennä äläkä lisää lupauksia; sv-versio vahvistetaan juristilla ennen käyttöä (docs/I18N_SUOSTUMUS_KAANNOKSET.md). Rivit joissa "katkelma": true ovat lauseen osia, jotka koodi liittää yhteen muuttujan ympärillä — käännä niin että ne toimivat yhdistettynä (ja kirjoita huom-kenttään, jos järjestys on ruotsissa väistämättä toinen).',
  ajonaikainen: 'Sv-läpiajossa (docs/i18n/sv_lapiajo_tulos.json) sv-tilassa suomeksi näkyviksi jääneet käyttöliittymätekstit, joille ei ole sv-riviä missään kartassa. Osa voi olla demo-dataa (D16, ei käännetä): jätä sv tyhjäksi ja kirjoita kysymys-kenttään, jos rivi näyttää datalta.',
};
const KOVA_ONLY = { harjoitusarviointi: 'lib/tm_harjoitusarviointi.js', suostumus: 'TalentMaster_Rekisterointi_Suostumus.html' };
for (const n of tulos.nakymat) {
  const osio = KOVA_ONLY[n.id] ? 'kovakoodatut.' + n.id : null;
  if (osio) for (const r of n.kovakoodattuStaattinen) {
    if (r.svOn) continue; const fi = dec(r.teksti); if (fi.length < 2) continue;
    const avain = fi, ed = osiot[osio] && osiot[osio].rivit[avain];
    if (ed) { ed.lahde.push(r.tiedosto + ':' + r.rivi); continue; }
    const rivi = { fi, lahde: [r.tiedosto + ':' + r.rivi], tila: 'EI REITITETTY — sv ei vielä käytössä koodissa' };
    if (!/^[A-ZÅÄÖ0-9"]/.test(fi)) rivi.katkelma = true;
    lisaa(osio, KOVA_KONTEKSTI[n.id], KOVA_ONLY[n.id], avain, rivi);
  }
}
{
  // ajonaikaiset UI-rivit joilla ei ole sv-riviä missään kartassa (varmuus: heuristiikka) — ei lainausmerkillä alkavia demokommentteja
  const nah = new Set(), osio = 'kovakoodatut.ajonaikainen';
  for (const n of tulos.nakymat) for (const r of n.ajonaikainen.ui) {
    if (r.svOn || r.varmuus === 'kartta' || /^["„“]/.test(r.teksti)) continue;
    if (nah.has(r.teksti)) { osiot[osio].rivit[r.teksti].lahde.push(r.lahde); continue; } nah.add(r.teksti);
    lisaa(osio, KOVA_KONTEKSTI.ajonaikainen, 'sv-läpiajo ' + tulos.lapiajoLuotu, r.teksti, { fi: r.teksti, lahde: [r.lahde], nakyma: r.nakyma, tila: 'EI REITITETTY — sv ei vielä käytössä koodissa' });
  }
}
for (const o of Object.values(osiot)) for (const r of Object.values(o.rivit)) if (Array.isArray(r.lahde)) r.lahde = [...new Set(r.lahde)];

/* (3) vientipohjan (Excel) tekstit — scripts/vientipohja_kieli.js; kuittaustuonti ja sv-pohja käyttävät samaa taulua. Sisäiset avaimet (id, video_url, OK · Muutettu · Poista) eivät ole mukana. */
{
  const VK = require('./vientipohja_kieli.js'), osio = 'vientipohja';
  for (const [id, fi] of Object.entries(VK.kaannettavat())) lisaa(osio, 'HENKILÖKUNTA / SEURA (esim. Sibbo-Vargarna): seuran harjoituspankin tarkistus-Excel (tyhjä vientipohja), jonka valmentajat tai VP täyttävät. Sarakeotsikot (ots_*), välilehtien nimet (val_*), listojen näkyvät arvot (lah_*, ei_konseptia) ja OHJE-välilehden teksti (ohje_*). Käännös tulee pohjaan, joten otsikot ja listan arvot ovat lyhyitä ja yksiselitteisiä; sarakkeen otsikko ja listan arvo on tunnistettava tuonnissa täsmälleen. Paikanvaraajat {seura} (seuran nimi, esim. "SJK"), {muu} (listan arvo "muu / en tiedä" käännettynä — käytä SAMAA käännöstä kuin lah_muu) ja {n} säilytetään täsmälleen. Termistö: docs/i18n/termisto.fi-sv.json (lukittu). Älä käännä: OK, Muutettu, Poista (kuittaus-arvot pysyvät sellaisinaan, ne luetaan koneellisesti — selitä ne OHJEessa omin sanoin mutta jätä arvot ennalleen), id, video_url, https://, SoccerTutor.', 'scripts/vientipohja_kieli.js', id, { fi });
}
const osiotJarj = Object.fromEntries(Object.entries(osiot).sort(([a], [b]) => (a.startsWith('kovakoodatut') - b.startsWith('kovakoodatut')) || a.localeCompare(b)));
const rivejaOsioittain = Object.fromEntries(Object.entries(osiotJarj).map(([k, o]) => [k, Object.keys(o.rivit).length]));
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 53 (Sibbo-valmius 1.11.2026: sv-kattavuusraportin puuttuvat rivit; EI erien 51/52 sisältöä; sv tyhjä → Gemini)',
  _pvm: (nyk && nyk._pvm) || new Date().toISOString().slice(0, 10),
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (en, huom, lahde, nakyma, tila, katkelma) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json. Osiot "kovakoodatut.*" ovat reitittämätöntä suomea: käännös varataan jo nyt, koodiin se viedään vasta kun reititys on päätetty.',
  _rivit_yhteensa: Object.values(rivejaOsioittain).reduce((a, b) => a + b, 0),
  _rivit_osioittain: rivejaOsioittain,
  osiot: osiotJarj,
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('kirjoitettu ' + OUT.replace(ROOT + '/', '') + ': ' + ulos._rivit_yhteensa + ' riviä · ' + JSON.stringify(rivejaOsioittain));
