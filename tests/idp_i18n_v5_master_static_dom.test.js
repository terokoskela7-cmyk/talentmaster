/**
 * i18n Vaihe 5 · Raita B (Master_v16) — STAATTINEN-DOM-vuotovartija (live-korjauserä juurisyy §5).
 *
 * Juurisyy: käännökset OVAT TM_MASTER_I18N.sv-kartassa, mutta staattinen body-chrome ei aina
 * kanna data-i18n:iä → renderöityy fi sv-tilassa. C1/dup/lint/suite/kielineutraali (render-lähdekoodi)
 * eivät nappaa tätä luokkaa. Tämä vartija skannaa STAATTISEN body-chrome-alueen (sDash → pääscript)
 * ja failaa jos yksikään näkyvä tekstisolmu on sv-avain (sv[text]!==text) ilman elementin data-i18n:iä.
 *
 * Rajaus: render-funktioiden JS-rakentama HTML (script-lohko, template-literaalit) = eri korjaustapa
 * (masterT-kääre) → sen kattaa render-kielineutraali-gate, EI tämä. Lykätty IDP/toimintakortti/
 * Pelaajaraportti/valmentaja-kehitys-klusteri elää render-JS:ssä → luonnostaan tämän ulkopuolella.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Msv = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const Csv = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');

const dec = (t) => t.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
function sv(t) {
  for (const K of [Msv, Csv]) for (const x of [t, dec(t)]) if (x in K && K[x] !== x) return K[x];
  return null;
}

describe('Master staattinen-DOM-vuotovartija (§5, live-korjauserä)', () => {
  it('body-chrome-alueella (sDash→script) 0 sv-avainta joka renderöityy fi:nä ilman data-i18n:iä', () => {
    const lines = HTML.split('\n');
    const start = lines.findIndex((l) => l.includes('id="sDash"'));
    const end = lines.findIndex((l, i) => i > start && /^\s*<script/.test(l));
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    // Dynaamisesti JS:llä asetettavat solmut (textContent masterT:llä ajossa) + demo-preview (§3) rajataan.
    const DYN = /id="tlSub"|id="sbRole"|id="hGreet"|id="palauteOtsikko"|id="replyTitle"|class="sb-role|<title>/;
    const DEMO = ['pelaajaa kirjannut', 'per pelaaja', 'joukkuekaverien', 'vs&nbsp;3 piha',
      'vk 17/36', 'Viikko 17', 'Kausi 25/26', '1 vs'];
    const leaks = [];
    for (let i = start; i < end; i++) {
      const line = lines[i];
      if (DYN.test(line) || DEMO.some((d) => line.includes(d))) continue;
      const re = />([^<>{}`]+)</g;
      let m;
      while ((m = re.exec(line))) {
        const t = m[1].trim();
        if (!sv(t)) continue;
        const op = line.lastIndexOf('<', m.index);
        if (line.slice(op, m.index).includes('data-i18n=')) continue; // elementillä on data-i18n
        leaks.push((i + 1) + ': ' + t.slice(0, 44));
      }
    }
    expect(leaks).toEqual([]);
  });
});
