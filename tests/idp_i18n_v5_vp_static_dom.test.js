/**
 * i18n Vaihe 5 · Raita B (VP_v25) — STAATTINEN-DOM-vuotovartija (neljäs vartija · V5-vaihe0A).
 *
 * V4-live paljasti: kalenterin staattinen työkalupalkki (kovakoodattu fi ILMAN data-i18n) vuoti — mikään kolmesta
 * render-vartijasta ei nähnyt sitä (ne skannaavat JS-renderiä, ei staattista bodyä). Master:illa tämä on;
 * VP:llä ei ollut. Portattu Master `idp_i18n_v5_master_static_dom` → VP.
 *
 * Skannaa KOKO staattisen bodyn [2063–2677] (Teron päätös: koko-body, ei per-erä — staattinen shell on yksi
 * yhtenäinen lohko; per-erä jättäisi ~39 vuotoa vartioimatta). Failaa jos näkyvä staattinen fi-tekstisolmu
 * (`>text<`) TAI `title=`/`placeholder=` on sv-avain (sv[text]!==text) ILMAN elementin data-i18n(-html/-title/-ph):iä.
 *
 * Allowlist: DYN (JS-täytetyt placeholderit) · tuotetermit (Talent/Master-brändi · Hidden Gem · X-Factor · Underdog) ·
 *   lyhenteet/indeksit (VP/IDP/PHV/HoT/EPPP/RAE/KORI/5D/FI/EN) · Excel-pohjan protokollanimet (Tekniikkakilpailu/
 *   HH-testi laaja|suppea/Harjoitettavuus U12|U15|U19) — // EIF-pending (Teron päätös: fi toistaiseksi) ·
 *   tyhjät dynaamiset <span id=…></span>.
 * Rajaus: JS-renderin rakentama HTML = render-gate (idp_i18n_v5_vp_render_dom), EI tämä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Vsv = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const Csv = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

const BODY_LO = 2063, BODY_HI = 2677; // staattinen body [<body> … pääscriptiä edeltävä]
const dec = (t) => t.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
function sv(t) {
  for (const K of [Vsv, Csv]) for (const x of [t, dec(t)]) if (x in K && K[x] !== x) return K[x];
  return null;
}
// DYN = JS-täytetyt placeholderit (greeting-*/kpi-*-d/loaderit) — renderöityvät ajossa, ei staattista fi:tä
const DYN = /Hyvää päivää|Ladataan|ladataan|Viikko —|Kausi —|viimeisin testi|testitapahtumaa|id="greeting-|id="kpi-/;
const PROD = /Talent|Master|Hidden Gem|X-Factor|Underdog/;
const EIF = /Tekniikkakilpailu|HH-testi (laaja|suppea)|Harjoitettavuus U(12|15|19)/; // EIF-pending
const ABBR_ONLY = /^(?:FI|EN|VP|IDP|PHV|HoT|EPPP|RAE|KORI|5D|[\s·—–\-/:()%.,+↑↓→▸≥≤0-9]|&amp;|&nbsp;)+$/;

function scanStaticLeaks(lines) {
  const leaks = [];
  for (let i = BODY_LO - 1; i < BODY_HI; i++) {
    const line = lines[i];
    if (!line || DYN.test(line)) continue;
    // >text<
    let m;
    const re = />([^<>{}`]+)</g;
    while ((m = re.exec(line))) {
      const t = m[1].trim();
      if (!t || !sv(t) || PROD.test(t) || EIF.test(t) || ABBR_ONLY.test(t)) continue;
      const op = Math.max(0, line.lastIndexOf('<', m.index));
      // data-i18n leaf-tagissa TAI data-i18n-html esi-elementissä samalla rivillä (esim. <h2 data-i18n-html>…<em>x</em>)
      if (line.slice(op, m.index).includes('data-i18n') || line.slice(0, m.index).includes('data-i18n-html')) continue;
      leaks.push(`${i + 1} >  ${t.slice(0, 48)}`);
    }
    // title= / placeholder=
    let a;
    const ra = /(?:title|placeholder)="([^"]*)"/g;
    while ((a = ra.exec(line))) {
      const t = a[1].trim();
      if (!t || !sv(t) || PROD.test(t) || EIF.test(t) || ABBR_ONLY.test(t)) continue;
      const op = Math.max(0, line.lastIndexOf('<', a.index));
      let tagEnd = line.indexOf('>', a.index); if (tagEnd < 0) tagEnd = line.length;
      if (line.slice(op, tagEnd).includes('data-i18n-')) continue; // data-i18n-title/-ph koko tagissa (attr voi olla title=:n jälkeen)
      leaks.push(`${i + 1} @  ${t.slice(0, 48)}`);
    }
  }
  return leaks;
}

describe('VP_v25 staattinen-DOM-vuotovartija (V5-vaihe0A, koko-body)', () => {
  it('staattisessa bodyssä [2063–2677] 0 sv-avainta joka renderöityy fi:nä ilman data-i18n:iä', () => {
    const leaks = scanStaticLeaks(HTML.split('\n'));
    if (leaks.length) {
      throw new Error(
        `Staattisessa bodyssä ${leaks.length} fi-tekstisolmua ilman data-i18n:iä (renderöityy fi sv-tilassa):\n` +
          leaks.join('\n')
      );
    }
    expect(leaks).toEqual([]);
  });

  it('EI vacuous: nappaa data-i18n:ttömän staattisen sv-avaimen', () => {
    // Synteettinen: sv-avain 'Peruuta' (resolvoituu) ilman data-i18n:iä body-alueella
    const fake = HTML.split('\n');
    fake[BODY_LO] = '  <button>Peruuta</button>'; // sv('Peruuta')!==null, ei data-i18n
    expect(scanStaticLeaks(fake).some((l) => l.includes('Peruuta'))).toBe(true);
  });
});
