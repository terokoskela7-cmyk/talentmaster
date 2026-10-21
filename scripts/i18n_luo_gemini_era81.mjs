#!/usr/bin/env node
/* sv-erä 81 (K4a2: Profiilin selkokieli, Kehon valmius -kortti) — lähetystiedosto. Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, PM kirjoittaa (Teron päätös 21.10.2026).
   Rivit: (a) UUDET lib/tm_todistekortit_fi.js:n avaimet, (b) MUUTTUNEET fi-rivit joiden vanha sv poistettiin libistä (sv_nyt = vanha käännös viitteeksi; KORVATTAVA).
   fi luetaan suoraan libistä; muuttuneiden/uusien lista: tests/fixtures/k4a2_fi_muutokset.json. Idempotentti: jo täytetty sv säilyy.
   ⚠ tc_alue_*-taulukon sanat Tero vahvistaa ennen sv-erää: jos sanat muuttuvat, muutos tehdään VAIN lib/tm_todistekortit_fi.js:ään ja tämä tiedosto ajetaan uudelleen (fi päivittyy, täytetty sv jää → tarkista).
   Ajo: node scripts/i18n_luo_gemini_era81.mjs [--tiedosto=docs/i18n/sv_kaannoserae_81_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_81_gemini.json'));
const FI = require('../lib/tm_todistekortit_fi.js'), TUKI = require('./i18n_era81_tuki.cjs');
const VANHA79 = JSON.parse(readFileSync(join(ROOT, 'docs/i18n/sv_kaannoserae_79_palautus.json'), 'utf8')).osiot['lib.tm_todistekortit'].rivit;
const HENK = 'HENKILÖKUNTA (valmentaja ja VP): Profiili-välilehden todistekortit (kehitystyöpöytä). Sävy: selkeä, arkinen, ei ammattisanastoa. Lyhyet lauseet. ';
const KONTEKSTI = HENK + 'Periaate (Tero 21.10.2026): valmentaja ei tiedä mitä "ketju", "DIAG", "SBL" tai "§28" tarkoittavat → kortti kertoo pelaajan kehon valmiuden ja yhden selkokielisen asian, ei termejä, lyhenteitä eikä pykäliä. "Kehon valmius" = pelaajan liikehallinnan ja kehon kantokyvyn mittaus (valmentajan lomake "Kehon valmius -mittaus"). Käytä samaa sv-termiä kuin erän 79 tc_a_keho / tc_ke_taso_*-riveissä.';
const ALUE = 'Kehon alue, jonka pelaajan mittaustulos on heikoin (pieni kirjain, ei pistettä). Käytetään lauseessa "Eniten tukea tarvitsee {alue}." ';
const MISSA = 'Missä tämän alueen heikkous näkyy (pieni kirjain, ei pistettä, paikkaa/tilannetta kuvaava sivulause). Käytetään rivillä "Näkyy {missa}." ';
const HUOM = {
  tc_alue_sbl: ALUE + 'Sisäinen koodi SBL (ei näy käyttäjälle).', tc_alue_sfl: ALUE + 'Sisäinen koodi SFL (ei näy käyttäjälle).', tc_alue_ll: ALUE + 'Sisäinen koodi LL (ei näy käyttäjälle).', tc_alue_diag: ALUE + 'Sisäinen koodi DIAG (ei näy käyttäjälle).', tc_alue_dfl: ALUE + 'Sisäinen koodi DFL (ei näy käyttäjälle).',
  tc_alue_sbl_missa: MISSA + 'Sisäinen koodi SBL (ei näy käyttäjälle).', tc_alue_sfl_missa: MISSA + 'Sisäinen koodi SFL (ei näy käyttäjälle).', tc_alue_ll_missa: MISSA + 'Sisäinen koodi LL (ei näy käyttäjälle).', tc_alue_diag_missa: MISSA + 'Sisäinen koodi DIAG (ei näy käyttäjälle).', tc_alue_dfl_missa: MISSA + 'Sisäinen koodi DFL (ei näy käyttäjälle).',
  tc_ke_tuki: 'Kortin toinen virke. {alue} = yksi tc_alue_*-riveistä (säilytä {alue} täsmälleen; sijamuoto: "tarvitsee" + partitiivi/nominatiivi — sovita ruotsiksi niin että kaikki viisi aluetta toimivat lauseessa).', tc_ke_nakyy: 'Pieni rivi kortin alla. {missa} = yksi tc_alue_*_missa-riveistä, säilytä {missa}.',
  tc_ke_matala: 'Kehon valmius alle 40 %: ohjaus fysioterapeutille. Kaksi lausetta kaksoispisteellä. Korvaa vanhan "Alle 40: ohjaus fysioterapeutille."', tc_ke_tyhja: 'Tyhjä tila: kehon valmiutta ei ole mitattu (aiemmin "Liikehallintaketjuja ei ole mitattu"). Lomake vie 10 minuuttia.',
  tc_lahde_rivi_ei_pvm: 'Lähderivi kun mittauspäivää ei tiedetä. {lahde} = lähteen nimi, säilytä. Rakenne: lähde + piste + "Päivä puuttuu" (ilman erotinta ·).', tc_l_flei: 'Lähteen nimi: valmentajan käyttämä lomake "Kehon valmius -mittaus" (aiemmin "Liikehallinta").',
  tc_fy_selite: 'ⓘ-selitteen teksti Fyysinen-kortilla (yksi lause): miksi heikointa fyysistä testiä ei nimetä kehityskohteeksi ennen kasvumittausta.', tc_selite_aria: 'ⓘ-napin saavutettavuusnimi (aria-label), kysymys.',
  tc_fy_taso: 'Kortin 1. virke. {taso} = sana (erinomainen/hyvä/kohtalainen/kehittyvä/alkuvaiheessa, ks. tc_ts_*). Aiemmin lopussa "testihetkellä".', tc_fy_vahvin_heikoin: 'Kortin 2. virke. {vahvin} ja {heikoin} = testien nimiä, säilytä. Aiemmin kaksoispisteillä: "Vahvin: X, heikoin: Y."', tc_fy_ph: 'Kasvupyrähdyksen aikana (korvaa 2. virkkeen). PHV = kasvupyrähdys; ei lyhennettä.', tc_fy_tyhja: 'Tyhjä tila. Lyhennelistaus (30 m, CMJ, MAS) vaihtui sanoiksi: juoksu, hyppy, kestävyys.',
  tc_te_taso: 'Kortin 1. virke, kuten tc_fy_taso.', tc_te_vahvin_heikoin: 'Kortin 2. virke, kuten tc_fy_vahvin_heikoin.', tc_te_ph: 'Kasvupyrähdyksen aikana (korvaa 2. virkkeen); pykäläviite poistettu.',
  tc_kasvu_pre_ohje: 'Kasvu-kortin ohje. Pykäläviite (§28) poistettu; "CMJ, MAS" → "hyppy, kestävyysjuoksu".', tc_kasvu_ph_ohje: 'Kasvu-kortin ohje. Pykäläviite (§25) poistettu.', tc_kasvu_nopea: 'Kasvu-kortin huomio. {x} = cm/v, säilytä. Pykäläviite (§25) poistettu.', tc_kasvu_phv_ika: 'Kasvu-kortti. {ika} = ikä vuosina, säilytä. "PHV-ikä" → "kasvupyrähdyksen ikä".',
  tc_t_mas: 'Testin nimi: aerobinen nopeus (lyhenne MAS säilyy suluissa).', tc_t_d3: 'Rivin nimi (aiemmin "Valmennettavuus (D3)"): valmentajan psyykkinen arvio pelaajasta.', tc_t_phv: 'Rivin nimi (aiemmin "PHV-tila").', tc_t_phv_ika: 'Rivin nimi (aiemmin "PHV-ikä (arvio)").',
  tc_l_hh: 'Lähteen nimi (aiemmin "H-H"): "Taitotestit (H-H)". H-H säilyy suluissa.', tc_l_d3: 'Lähteen nimi (aiemmin "D3"): valmentajan psyykkinen arvio.'
};
const avaimet = TUKI.era81Odottaa(); const puuttuu = avaimet.filter((k) => !(k in FI) || !(k in HUOM));
if (puuttuu.length) { console.error('puuttuu libistä tai huomautuksesta: ' + puuttuu.join(', ')); process.exit(1); }
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanhaSv = (k) => { const r = nyk && nyk.osiot && nyk.osiot['lib.tm_todistekortit'] && nyk.osiot['lib.tm_todistekortit'].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const rivit = {};
for (const k of avaimet) { const r = { fi: FI[k], huom: HUOM[k] }; if (VANHA79[k]) r.sv_nyt = VANHA79[k].sv; r.sv = vanhaSv(k); rivit[k] = r; }
const ulos = { _otsikko: 'Käännöserä 81 (K4a2: Profiilin selkokieli) — sv: PM kirjoittaa', osiot: { 'lib.tm_todistekortit': { _konteksti: KONTEKSTI, _lahde: 'lib/tm_todistekortit_fi.js (uudet ja muuttuneet tc_*-avaimet; sv_nyt = erän 79 vanha käännös, KORVATTAVA)', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 2) + '\n');
console.log(JSON.stringify({ tiedosto: OUT.replace(ROOT + '/', ''), rivit: avaimet.length, uusia: avaimet.filter((k) => !rivit[k].sv_nyt).length, korvattavia: avaimet.filter((k) => rivit[k].sv_nyt).length }));
