#!/usr/bin/env node
/* sv-erä 85 (K1e: pikkukorjaukset 21.10.2026) — lähetystiedosto PM:lle.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, PM kirjoittaa.
   Sisältö: (1) kaaviopankin "katselmus" → "hyväksyntä"/"kommentit" (lib/tm_i18n_common.js, avain = fi-teksti; vanhat avaimet + niiden sv poistettu, koska fi muuttui);
            (2) Profiilin yhteenvedon rivi "Testattu 4.10. · 2 vk" (lib/tm_todistekortit_fi.js; vanha sv tc_viimeisin_testi poistettu, koska fi muuttui).
   ADAR-koulutussivun (Palaudu → Reagoi) tekstit eivät kulje i18n:n kautta (staattinen HTML) → ei rivejä.
   Ajo: node scripts/i18n_luo_gemini_era85.mjs [--tiedosto=docs/i18n/sv_kaannoserae_85_gemini.json]  (idempotentti: täytetty sv säilyy) */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_85_gemini.json'));
const YHT_K = 'HENKILÖKUNTA (VP ja valmentaja): Taktiikkataulu (kaaviopankki; kaavioiden hyväksyntäprosessi). Avain = suomenkielinen teksti sellaisenaan. Sanastopäätös K1e (21.10.2026): kaaviopankissa ei käytetä sanaa "katselmus" — kaavion tarkistus ja hyväksyntä = "hyväksyntä" (VP hyväksyy seuran kaavion), kommentit = "kommentit". Aiemmat sv-rivit (granskning) on poistettu, koska fi-teksti muuttui; uusi sv ei saa sisältää sanaa granskning, jos termistö (docs/i18n/termisto.fi-sv.json) antaa muun. Termit: kaavio = diagram, luonnos = utkast, valmennuspäällikkö = tränarchef, seuran omat = föreningens egna.';
const YHT = {
  'Taktiikkataulu — teknis-taktiset kuvat ja hyväksyntä': 'Sivupalkin nimikkeen tooltip (VP ja Master). Aiempi fi: "Taktiikkataulu — teknis-taktiset kuvat, katselmus ja hyväksyntä". Säilytä ajatusviiva.',
  'Hyväksynnän kommentit': 'Kaavion kommenttilangan otsikko (pieni, isoilla kirjaimilla näytetty). Aiempi fi: "Katselmus". Kommenttilanka = VP:n ja valmentajan keskustelu kaavion hyväksynnästä.',
  'Perustelu näkyy valmentajalle kommenteissa. Kerro mitä pitää korjata.': 'Ohje kaavion hylkäysikkunassa. Aiempi fi: "Perustelu näkyy valmentajalle katselmuslangassa. Kerro mitä pitää korjata."',
  'Seuratason kaavion asettaa valmennuspäällikkö hyväksynnässä.': 'Ohje kaavion luontiikkunassa valmentajalle: seuratason kaavion kohdistuksen asettaa VP. Aiempi fi: "… katselmuksessa."',
  'muokkaus vie takaisin hyväksyttäväksi': 'Pieni tilaleima editorissa: hyväksytyn kaavion muokkaus palauttaa sen hyväksyttäväksi. Aiempi fi: "muokkaus vie takaisin katselmukseen". Pieni kirjain, ei pistettä; edessä erotin " · ".',
  'Teknis-taktiset kaaviot. Kanoniset ovat kaikille yhteisiä; seuran omat kulkevat hyväksynnän kautta.': 'Kaaviopankin selitysteksti listan yläpuolella. Kanoniset kaaviot = kaikille yhteiset valmiit kaaviot. Aiempi fi: "… seuran omat kulkevat katselmuksen kautta."',
  'Valitse mitä kaavio opettaa. Piirto avautuu seuraavaksi; kaavio tallentuu luonnoksena ja menee hyväksyttäväksi.': 'Uuden kaavion luontiikkunan ohje. Aiempi fi: "… ja menee katselmukseen."',
};
const TC_K = 'HENKILÖKUNTA (valmentaja ja VP): Profiili-välilehden yhteenveto (kehitystyöpöytä). Rivi näytetään yhteenvedon otsikon vieressä ja sen pitää mahtua 390 px leveälle puhelimelle. Esimerkki: "Testattu 4.10. · 2 vk" (päivämäärä + ikä). Lyhyt muoto, ei "sitten". Paikanvaraajat ({pvm}, {ika}, {n}) säilytetään täsmälleen. Vanha sv (tc_viimeisin_testi) poistettu, koska fi muuttui.';
const TC = {
  tc_viimeisin_testi: 'Yhteenvedon rivi: viimeisimmän mittauksen päivä ja ikä. Aiempi fi: "Viimeisin testi {pvm} · {ika}" (esim. "Viimeisin testi 4.10.2026 · 2 vk sitten"). {pvm} = lyhyt päivä "4.10." (yli 11 kk vanhalla mittauksella myös vuosi "4.10.2025"), {ika} = lyhyt ikä (alla). Säilytä erotin " · ".',
  tc_ika_lyh_pv: 'Lyhyt ikä päivinä, {ika}-paikkaan ("5 pv"). Ei sanaa "sitten".',
  tc_ika_lyh_vk: 'Lyhyt ikä viikkoina ("2 vk"). Ei sanaa "sitten".',
  tc_ika_lyh_kk: 'Lyhyt ikä kuukausina ("4 kk"). Ei sanaa "sitten".',
  tc_ika_lyh_tanaan: 'Lyhyt ikä: mittaus on tehty tänään. Yksi sana.',
};
const FI_TC = { tc_viimeisin_testi: 'Testattu {pvm} · {ika}', tc_ika_lyh_pv: '{n} pv', tc_ika_lyh_vk: '{n} vk', tc_ika_lyh_kk: '{n} kk', tc_ika_lyh_tanaan: 'tänään' };
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (o, k) => { const r = nyk && nyk.osiot && nyk.osiot[o] && nyk.osiot[o].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const yRivit = {}; for (const [fi, huom] of Object.entries(YHT)) yRivit[fi] = { fi, huom, sv: vanha('yhteiset_kartta', fi) };
const tRivit = {}; for (const [k, huom] of Object.entries(TC)) tRivit[k] = { fi: FI_TC[k], huom, sv: vanha('lib.tm_todistekortit', k) };
const ulos = { _otsikko: 'Käännöserä 85 (K1e pikkukorjaukset: kaaviopankin sanasto, Profiilin "Testattu"-rivi) — sv: PM kirjoittaa', osiot: {
  yhteiset_kartta: { _konteksti: YHT_K, _lahde: 'lib/tm_i18n_common.js (+ lib/tm_kaavio_ui.js, TalentMaster_Master_v16.html, TalentMaster_VP_v25.html)', rivit: yRivit },
  'lib.tm_todistekortit': { _konteksti: TC_K, _lahde: 'lib/tm_todistekortit_fi.js + lib/tm_todistekortit.js', rivit: tRivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 2) + '\n');
console.log(JSON.stringify({ tiedosto: OUT.replace(ROOT + '/', ''), rivit: Object.keys(yRivit).length + Object.keys(tRivit).length }));
