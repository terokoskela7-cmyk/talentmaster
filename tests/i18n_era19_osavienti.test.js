/* sv-erä 19 — osavienti (scripts/i18n_vie_sv_era19_osa.cjs; Sibbo 1.11.): 7 kirjastoriviä + 17 Masterin riviä palautuksesta koodin karttoihin.
 * (a) viedyt arvot = palautuksen arvot merkki merkiltä; (b) muut erän 19 rivit EIVÄT ole koodissa (paitsi erän 3 aiemmin viemät, sama sv);
 * (c) dedupe-invariantti (Master ∩ common = ∅) viedyille; (d) skripti idempotentti (uusintaajo ei lisää mitään) ja kuiva-ajo ei kirjoita.
 * Code ei kirjoita ruotsia (CLAUDE.md §0): testi vertaa koodin arvoja Geminin palautukseen, ei sisällä omaa ruotsia. */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, mkdirSync, cpSync, rmSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lueJ = (f) => JSON.parse(readFileSync(join(juuri, f), 'utf8'));
const OSA = require('../scripts/i18n_vie_sv_era19_osa.cjs');
const P = lueJ('docs/i18n/sv_kaannoserae_19_palautus.json'), E3 = lueJ('docs/i18n/sv_kaannoserae_3.json');
const L = require('../lib/tm_lang.js').TM_LANG.sv, LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const CM = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
/* osio → kohdekartta (s11 ja vp_toimenpide_hannat eivät kuulu tähän vientiin, eikä niiden karttoihin kosketa) */
const koodissa = (osio, a) => (osio === 'tm_lang' ? a.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L)
  : osio.indexOf('lib.') === 0 ? LIB[a] : osio === 'master_kartta' ? MA[a] : osio === 'vp_kartta' ? VP[a] : undefined);

describe('sv-erä 19 — osavienti (24 riviä)', () => {
  it('lista: 7 kirjastoriviä + 17 Masterin riviä, kaikki palautuksessa sv täytettynä', () => {
    expect(OSA.LIB_AVAIMET.length).toBe(7); expect(OSA.MASTER_AVAIMET.length).toBe(17);
    for (const [o, a] of OSA.LIB_AVAIMET) expect(P.osiot[o].rivit[a].sv, a).toBeTruthy();
    for (const fi of OSA.MASTER_AVAIMET) { expect(P.osiot.master_kartta.rivit[fi].fi).toBe(fi); expect(P.osiot.master_kartta.rivit[fi].sv, fi).toBeTruthy(); }
  });
  it('(a) koodin sv = palautuksen sv merkki merkiltä', () => {
    for (const [o, a] of OSA.LIB_AVAIMET) expect(LIB[a], a).toBe(P.osiot[o].rivit[a].sv);
    for (const fi of OSA.MASTER_AVAIMET) expect(MA[fi], fi).toBe(P.osiot.master_kartta.rivit[fi].sv);
  });
  it('(b) muut erän 19 rivit eivät ole koodissa — paitsi erän 3 jo viemät (sama sv)', () => {
    const osa = new Set(OSA.LIB_AVAIMET.map(([o, a]) => o + ' :: ' + a).concat(OSA.MASTER_AVAIMET.map((fi) => 'master_kartta :: ' + fi)));
    const muut = [];
    for (const [o, v] of Object.entries(P.osiot)) for (const [a, r] of Object.entries(v.rivit)) {
      if (osa.has(o + ' :: ' + a)) continue; const k = koodissa(o, a); if (k === undefined) continue;
      if (o === 'vp_kartta' && k === r.sv) continue;   // vietiin 15.10.2026 scripts/i18n_vie_sv_era53_19.cjs:llä (VP-rivit)
      const e3 = E3.osiot[o] && E3.osiot[o].rivit[a];
      if (!(e3 && e3.sv === k && r.sv === k)) muut.push(o + ' :: ' + a);
    }
    expect(muut).toEqual([]);
  });
  it('(c) dedupe-invariantti: viedyt Master-avaimet eivät ole yhteisessä glossaarissa', () => {
    expect(OSA.MASTER_AVAIMET.filter((fi) => fi in CM)).toEqual([]);
  });
  it('(d) uusintaajo on idempotentti (0 lisättyä, 24 ohitettua) eikä kirjoita', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'sv19osa-'));
    try {
      mkdirSync(join(tmp, 'lib')); mkdirSync(join(tmp, 'docs/i18n'), { recursive: true });
      for (const f of ['lib/tm_lib_i18n.js', 'lib/tm_master_i18n.js', 'lib/tm_i18n_common.js', 'docs/i18n/sv_kaannoserae_19_palautus.json']) cpSync(join(juuri, f), join(tmp, f));
      const ennen = readFileSync(join(tmp, 'lib/tm_master_i18n.js'), 'utf8') + readFileSync(join(tmp, 'lib/tm_lib_i18n.js'), 'utf8');
      const t = OSA.vie({ juuri: tmp, kirjoita: true });
      expect(t.virheet).toEqual([]); expect(t.lisatty).toEqual([]); expect(t.ohitettu.length).toBe(24); expect(t.kirjoitettu).toBe(false);
      expect(readFileSync(join(tmp, 'lib/tm_master_i18n.js'), 'utf8') + readFileSync(join(tmp, 'lib/tm_lib_i18n.js'), 'utf8')).toBe(ennen);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  });
});
