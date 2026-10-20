#!/usr/bin/env node
/* Gemini-erä 79 (K4a: Profiili-välilehti ja todistekortit, D102). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö: kaikki lib/tm_todistekortit.js:n FI-avaimet (tc_*) + lib/tm_kehitystyopoyta.js: kt_profiili (välilehden nimi). fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era79.mjs [--tiedosto=docs/i18n/sv_kaannoserae_79_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_79_gemini.json'));
const FI = require('../lib/tm_todistekortit.js').FI;
const KONTEKSTI = 'HENKILÖKUNTA (valmentaja ja VP): Kehitystyöpöytä, pelaajan Profiili-välilehti. Todistekortit kertovat yhdellä lauseella ja enintään kolmella testirivillä, mitä pelaajasta on mitattu tai havaittu (Fyysinen, Tekninen, Peli, Kehon valmius, Kasvu ja kypsyys). Luvut ovat sallittuja (henkilökunnalle), pelaajalle tai huoltajalle ei näytetä mitään tästä. Sävy: rauhallinen, arvioiva mutta ei tuomitseva; ei sanaa "heikko" pelaajasta ("heikoin osa-alue" on sallittu), ei vertailua toiseen pelaajaan. Termit: docs/i18n/termisto.fi-sv.json (ydinvahvuus, jakso, kehon valmius, PHV).';
const OHJEET = [   // [avain-alkuosa tai tarkka avain, huomautus]
  ['tc_t_', 'Testin tai mittarin nimi taulukkorivillä (lyhyt, ei pistettä). Pidä testien vakiintuneet lyhenteet (CMJ, MAS, SJ, H-H) ennallaan.'],
  ['tc_a_', 'Osa-alueen nimi kortin otsikkona ja tasonauhan rivinä (lyhyt, ei pistettä). "Kehon valmius" = FLEI-pohjainen liikehallinta (termistö).'],
  ['tc_phv_', 'PHV-tila (kasvupyrähdyksen vaihe) lyhyenä ilmauksena pienellä alkukirjaimella, esim. "ennen pyrähdystä". Käytetään rivin arvona ja lauseen sisällä.'],
  ['tc_l_', 'Tietolähteen nimi kortin alarivillä (lyhyt, ei pistettä).'],
  ['tc_x_', 'Toimintokehote (linkki/nappi), imperatiivi tai nimike, ei pistettä. Säilytä muuttujat täsmälleen.'],
  ['tc_m_', 'Pieni merkki (badge) kortin otsikkorivillä, lyhyt, ei pistettä. Säilytä muuttujat täsmälleen.'],
  ['tc_n_', 'Lukumäärä + yksikkö (esim. "{n} testiä"), säilytä {n} täsmälleen; yksikkö/monikko oikein.'],
  ['tc_ika_', 'Ajan kuluminen tai datan ikä (esim. "{n} pv sitten", "mittaus yli 3 kk vanha"). Säilytä muuttujat täsmälleen.'],
  ['tc_tr_', 'Trendin sana tai lyhyt lause (nousussa/ennallaan/laskussa, paranee/laskee). Säilytä muuttujat täsmälleen.'],
  ['tc_kayra_', 'Kehityskäyrän selite (ero ennen → nyt, vauhti kaudessa). Säilytä muuttujat täsmälleen; nuoli → säilyy.'],
  ['tc_d3_', 'D3-psykologisen profiilin ulottuvuuden nimi (lyhyt, ei pistettä); sama käännös kuin Masterin D3-näkymässä.'],
  ['tc_ketju_', 'Liikehallintaketjun nimi pienellä alkukirjaimella lauseen sisällä ("Heikoin ketju {ketju}"); sama käännös kuin ketjumatriisin nimet (takaketju, etuketju, sivuketju, diagonaaliketju, syväketju).'],
  ['tc_oma_', 'Lause pelaajan omasta arviosta verrattuna valmentajien arvioon. Ei lukuja. Säilytä muuttujat täsmälleen ({nimi}, {aihe}).'],
  ['tc_kasvu_', 'Tulkintalause Kasvu ja kypsyys -kortissa (PHV = kasvupyrähdys). §-viittaukset (§25, §28) säilytetään sellaisenaan. Säilytä muuttujat täsmälleen.'],
  ['tc_fy_', 'Tulkintalause Fyysinen-kortissa. §-viittaukset (§25, §28) säilytetään sellaisenaan. Säilytä muuttujat täsmälleen.'],
  ['tc_te_', 'Tulkintalause Tekninen-kortissa. §-viittaukset säilytetään sellaisenaan. Säilytä muuttujat täsmälleen.'],
  ['tc_pe_', 'Tulkintalause Peli-kortissa (ADAR-peliälyhavainnot: havainnointi, päätöksenteko, toteutus, reagointi). Säilytä muuttujat täsmälleen.'],
  ['tc_ke_', 'Tulkintalause Kehon valmius -kortissa (liikehallintaketjut). Säilytä muuttujat täsmälleen.'],
  ['tc_koonti_', 'Koontikortti "Mittauskierros puuttuu": kun useampi osa-alue on mittaamatta, ne kootaan yhteen. Säilytä muuttujat täsmälleen.'],
  ['tc_yht_', 'Yhteenveto-osio (Vahvuus, Kehityskohde, Puuttuu) ja tyhjän tilan lause. Säilytä muuttujat täsmälleen.']
];
const huom = (k) => { const o = OHJEET.find((x) => k === x[0] || k.indexOf(x[0]) === 0); const m = FI[k].match(/\{\w+\}/g); return (o ? o[1] : 'Käyttöliittymäteksti Profiili-välilehdellä. Säilytä muuttujat täsmälleen.') + (m && !/täsmälleen/.test(o ? o[1] : '') ? ' Muuttujat: ' + m.join(' ') : ''); };
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const rivit = {}; Object.keys(FI).forEach((k) => { rivit[k] = { fi: FI[k], huom: huom(k), sv: vanha('lib.tm_todistekortit', k) }; });
const KT = require('../lib/tm_kehitystyopoyta.js').FI, ktRivit = { kt_profiili: { fi: KT.kt_profiili, huom: 'Välilehden nimi pelaajan työpöydällä (Tänään · Polku · Profiili). Yksi sana, ei pistettä. Korvaa vanhan välilehden "Näyttö"; sisältö = pelaajan mittaukset ja todisteet.', sv: vanha('lib.tm_kehitystyopoyta', 'kt_profiili') } };
const maarat = { 'lib.tm_todistekortit': Object.keys(rivit).length, 'lib.tm_kehitystyopoyta': 1 }, yht = maarat['lib.tm_todistekortit'] + 1;
const ulos = {
  _tiedosto: 'TalentMaster — sv-käännöserä 79 (K4a: Profiili-välilehti ja todistekortit; ' + yht + ' riviä; sv tyhjä → Gemini)', _pvm: '2026-10-20',
  _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: yht, _rivit_osioittain: maarat,
  osiot: { 'lib.tm_todistekortit': { _konteksti: KONTEKSTI, _lahde: 'lib/tm_todistekortit.js (FI-avaimet tc_*)', rivit }, 'lib.tm_kehitystyopoyta': { _konteksti: 'HENKILÖKUNTA (valmentaja ja VP): pelaajan työpöydän välilehdet. Sävy: lyhyt ja neutraali.', _lahde: 'lib/tm_kehitystyopoyta.js (FI-avain kt_profiili)', rivit: ktRivit } }
};
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu ' + yht + ' riviä → ' + OUT.replace(ROOT + '/', ''));
