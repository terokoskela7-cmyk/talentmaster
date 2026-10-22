#!/usr/bin/env node
/* Gemini-erä 88 (K4d: Fyysinen-kortin profiilitulkinta CMJ × sprintti × kasirata; CODE_BRIEF_K4D, 22.10.2026) — lähetystiedosto PM:lle.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää. fi luetaan suoraan libeistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era88.mjs [--tiedosto=docs/i18n/sv_kaannoserae_88_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_88_gemini.json'));
const _log = console.log; console.log = (...a) => { if (!String(a[0]).startsWith('[TM Lang]') && !String(a[0]).startsWith('[tm-')) _log(...a); };
const HENK = 'HENKILÖKUNTA (valmentaja ja VP): ';
const OSIOT = {
  'lib.tm_todistekortit': {
    lahde: 'lib/tm_todistekortit_fi.js (uudet avaimet tc_fy_tulk_*)', tiedosto: '../lib/tm_todistekortit_fi.js',
    konteksti: HENK + 'Kehitystyöpöytä, Profiili-välilehti, Fyysinen-kortti. Kortin toinen virke on ohje siitä, MITÄ pelaajan kanssa harjoitellaan, kun hyppytaso (CMJ), sprinttitaso (30 m) ja ketteryystaso (kasirata) on verrattu samanikäisiin. Kortissa ei näytetä lukuja. Virkkeet muodostavat kaksiosaisen ohjeen: ensin havainto, sitten "Painota …" -kehote (valmentajalle). Termit: voimantuotto, kiihdytys, juoksutekniikka, jarrutus, suunnanmuutos; harjoittelu = träning; käytä samoja sv-termejä kuin erässä 81 (Profiilin selkokieli) ja kehityssuunnitelman sanastossa. Sävy: selkeä, ammattimainen, ei painostava.',
    avaimet: {
      tc_fy_tulk_voima: 'Fyysinen-kortin ohje (CMJ ja sprintti molemmat matalalla, taso 1–2): kaksi lausetta, jälkimmäinen kehote "Painota …".',
      tc_fy_tulk_juoksu: 'Fyysinen-kortin ohje (hyppytaso selvästi korkeampi kuin sprinttitaso): kaksi lausetta, jälkimmäinen kehote "Painota …".',
      tc_fy_tulk_suunnanmuutos: 'Fyysinen-kortin ohje (sprinttitaso selvästi korkeampi kuin ketteryystaso/kasirata): kaksi lausetta, jälkimmäinen kehote "Painota …".',
      tc_fy_tulk_selite: 'Pienen ⓘ-selitteen teksti ohjeen vieressä: miksi ohje näytetään. "Samanikäisiin verrattuna" = suhteessa saman ikäisiin pelaajiin (ikä- ja sukupuolinormitetut tasot).'
    }
  }
};
/* VP:n ⓘ-ohjeen CMJ-vinkki (TM_TESTI_OHJEET.cmj.vinkki, TalentMaster_VP_v25.html): fi muuttui (K4d) → vanha sv (sv_nyt) on viitteeksi, KORVATTAVA. Avain = fi sellaisenaan (vpT-reititin). */
const VP_VANHA = 'Matala CMJ + matala nopeus → voimaharjoittelu. Korkea CMJ + matala nopeus → juoksutekniikka / nopeusharjoittelu.';
const VP_UUSI = (readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8').match(/cmj: \{ otsikko: 'Räjähtävyys · CMJ'[^\n]*?vinkki: '([^']*)'/) || [])[1];
if (!VP_UUSI) { console.error('VP:n CMJ-vinkkiä ei löydy'); process.exit(1); }
const VP_SV_NYT = (require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv || {})[VP_VANHA] || '';
const lueFI = (tiedosto) => require(tiedosto).FI || require(tiedosto);
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const osiot = {}; let yht = 0;
for (const [o, d] of Object.entries(OSIOT)) {
  const FI = lueFI(d.tiedosto), rivit = {};
  for (const [k, huom] of Object.entries(d.avaimet)) {
    if (!(k in FI)) { console.error('puuttuu libistä: ' + o + ' ' + k); process.exit(1); }
    rivit[k] = { fi: FI[k], huom, sv: vanha(o, k) }; yht++;
  }
  const puuttuu = Object.keys(FI).filter((k) => /^tc_fy_tulk_/.test(k) && !(k in d.avaimet)); if (puuttuu.length) { console.error('selite puuttuu: ' + puuttuu.join(', ')); process.exit(1); }
  osiot[o] = { _konteksti: d.konteksti, _lahde: d.lahde, rivit };
}
{
  const vanhaVp = nyk && nyk.osiot && nyk.osiot.vp_kartta && nyk.osiot.vp_kartta.rivit[VP_UUSI]; const sv = vanhaVp && typeof vanhaVp.sv === 'string' ? vanhaVp.sv : '';
  osiot.vp_kartta = { _konteksti: HENK + 'VP-dashboard (TalentMaster_VP_v25.html), testitulkinnan ⓘ-ohje (CMJ-kortti, "vinkki"). Avain = suomenkielinen teksti sellaisenaan. Sama sanoma kuin Profiilin Fyysinen-kortin tulkinta (tc_fy_tulk_*): hyppy- ja sprinttitaso verrattuna samanikäisiin → mitä harjoitellaan. Käytä samoja sv-termejä kuin tc_fy_tulk_*-riveillä.', _lahde: 'TalentMaster_VP_v25.html (TM_TESTI_OHJEET.cmj.vinkki)',
    rivit: { [VP_UUSI]: { fi: VP_UUSI, huom: 'Suomenkielinen lähdeteksti muuttui (K4d 22.10.2026). Aiempi fi: "' + VP_VANHA + '". Nykyinen sv (sv_nyt) vastaa vanhaa sääntöä ja KORVATAAN. Nuoli → säilytetään.', sv_nyt: VP_SV_NYT, sv }, } };
  yht++;
}
writeFileSync(OUT, JSON.stringify({ _tiedosto: 'TalentMaster — sv-käännöserä 88 (K4d: Fyysinen-kortin profiilitulkinta; ' + yht + ' riviä; sv tyhjä → PM kirjoittaa)', _pvm: '2026-10-22', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Code ei kirjoita ruotsia (§0).', osiot }, null, 2) + '\n');
console.log(JSON.stringify({ tiedosto: OUT.replace(ROOT + '/', ''), rivit: yht }));
