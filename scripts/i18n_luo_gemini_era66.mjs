#!/usr/bin/env node
/* Gemini-erä 66 (Klipin ajastettu-tila; 18.10.). Code EI kirjoita ruotsia (CLAUDE.md §0): sv jää tyhjäksi, Gemini täyttää.
   Sisältö = lib.tm_mediaviesti, 2 uutta avainta (mv_rivi_ajastettu, mv_lahetetty_ajastettu_lisa). fi luetaan suoraan libistä. Idempotentti: jo täytetty sv säilyy.
   Ajo: node scripts/i18n_luo_gemini_era66.mjs [--tiedosto=docs/i18n/sv_kaannoserae_66_gemini.json] */
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const OUT = join(ROOT, arg('tiedosto', 'docs/i18n/sv_kaannoserae_66_gemini.json')), OSIO = 'lib.tm_mediaviesti';
const FI_KAIKKI = require('../lib/tm_mediaviesti.js').FI;
const AVAIMET = ['mv_rivi_ajastettu', 'mv_lahetetty_ajastettu_lisa'];
let nyk = null; try { nyk = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) { /* uusi */ }
const vanha = (k) => { const r = nyk && nyk.osiot && nyk.osiot[OSIO] && nyk.osiot[OSIO].rivit[k]; return r && typeof r.sv === 'string' ? r.sv : ''; };
const H = {
  mv_rivi_ajastettu: 'Klipin tila valmentajan klippilistassa (Masterin mediakanava ja pelaajan Polku): klippi on lähetetty yöllä (klo 21–7), joten pelaaja näkee sen vasta aamulla klo 7. Esim. "Ajastettu · näkyy pelaajalle 18.10. klo 7.00". Säilytä {pvm} (esim. 18.10.) ja {aika} (esim. 7.00). Termistö: klippi = klipp, pelaaja = spelare.',
  mv_lahetetty_ajastettu_lisa: 'Lisälause lähetysilmoituksen ("Klippi lähetetty ✓") perään, kun klippi lähetettiin klo 21–7: pelaaja näkee sen vasta aamulla. Esim. "Näkyy pelaajalle 18.10. klo 7.00." Säilytä {pvm}, {aika} ja loppupiste.'
};
const rivit = {}; for (const k of AVAIMET) { if (!(k in FI_KAIKKI)) { console.error('puuttuu libistä: ' + k); process.exit(1); } rivit[k] = { fi: FI_KAIKKI[k], huom: H[k], sv: vanha(k) }; }
const ulos = { _tiedosto: 'TalentMaster — sv-käännöserä 66 (klipin ajastettu-tila, 2 riviä; sv tyhjä → Gemini)', _pvm: '2026-10-18', _ohje: 'Täytä vain "sv"-kentät. Muut kentät (huom) ovat apuna — älä käännä äläkä muuta. Ohje ja termistö: docs/i18n/GEMINI_OHJE_kooste.md + docs/i18n/termisto.fi-sv.json.', _rivit_yhteensa: 2, _rivit_osioittain: { [OSIO]: 2 },
  osiot: { [OSIO]: { _konteksti: 'HENKILÖKUNTA (valmentaja ja VP): klipin tila ja lähetysilmoitus, kun klippi on ajastettu näkymään pelaajalle vasta aamulla klo 7. Sävy: lyhyt ja neutraali. Paikkamerkit {…} säilytetään.', _lahde: 'lib/tm_mediaviesti.js (FI-avaimet mv_rivi_ajastettu, mv_lahetetty_ajastettu_lisa)', rivit } } };
writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n'); console.log('Kirjoitettu 2 riviä → ' + OUT.replace(ROOT + '/', ''));
