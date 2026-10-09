/* Gemini-erä 2 viety koodiin (scripts/i18n_vie_sv_era2.cjs): jokainen erän sv-arvo on kartassa MERKKI MERKILTÄ samana kuin erässä (Code ei muuta ruotsia, CLAUDE.md §0).
 * Rivit, jotka eivät sopineet koodiin, ovat docs/i18n/sv_era2_palautetaan.json:ssa (fi-fallback jää) eikä niitä vaadita kartassa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ERA = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_2.json'), 'utf8'));
const PAL = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_era2_palautetaan.json'), 'utf8')).rivit;
const palautettu = (osio, avain) => PAL.some((r) => r.osio === osio && r.avain === avain);
const L = require('../lib/tm_lang.js').TM_LANG.sv;
const LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const HE = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const CO = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const polku = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const rivit = (osio) => Object.entries(ERA.osiot[osio].rivit);

describe('Gemini-erä 2 — vienti', () => {
  it('erä: 1331 Geminin käsittelemää riviä kaikilla sv; muut rivit ovat UUSIA, sv vielä tyhjä (odotuslistat: tm_lang-odotuslista, master/vp/lib-uudet) — niille ei vaadita karttaa', () => {
    const kaikki = Object.entries(ERA.osiot).flatMap(([o, os]) => Object.entries(os.rivit).map(([a, r]) => [o, a, r]));
    const tyhjat = kaikki.filter(([, , r]) => !r.sv);
    expect(kaikki.length - tyhjat.length).toBe(1331);
    // erän 2 tyhjät tm_lang-rivit täyttyivät erässä 3 (vietiin scripts/i18n_vie_sv_era3.cjs) → ne + mahdollinen odotuslista
    const ERA3 = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'docs/i18n/sv_kaannoserae_3.json'), 'utf8')).osiot.tm_lang.rivit;
    const ODOTTAA = require('./tm_lang_sv_odotuslista.cjs').concat(Object.keys(ERA3).filter((p) => ERA3[p].sv)).map((p) => 'tm_lang::' + p);
    const tmLangTyhjat = tyhjat.filter(([o]) => o === 'tm_lang').map(([o, a]) => o + '::' + a).sort();
    expect(tmLangTyhjat).toEqual(ODOTTAA.slice().sort());
  });
  it('tm_lang', () => { for (const [p, r] of rivit('tm_lang')) if (r.sv && !palautettu('tm_lang', p)) expect(polku(L, p), p).toBe(r.sv); });
  it('lib-osiot → TM_LIB_I18N.sv', () => {
    for (const o of ['lib_adar_nimet', 'lib.rubriikit', 'lib.tm_kentta', 'lib.tm_adar_tekstit', 'lib.tm_pelihavainto_valinta', 'lib.tm_havaintohistoria', 'lib.tm_tanaan_signaali'])
      for (const [a, r] of rivit(o)) if (r.sv && !palautettu(o, a)) expect(LIB[a], o + ' ' + a).toBe(r.sv);
  });
  it('vp_kartta / master_kartta / henkilosto_kartta', () => {
    for (const [o, M] of [['vp_kartta', VP], ['master_kartta', MA], ['henkilosto_kartta', HE]]) for (const [a, r] of rivit(o)) if (r.sv && !palautettu(o, a)) expect(M[a], o + ' ' + a).toBe(r.sv);
  });
  it('jäännökset: Förening-rivit, kausifokus, VP×Master yhtenäistetty', () => {
    const kartta = { vp: VP, master: MA, common: CO };
    for (const [a, r] of rivit('jaannos.seura_forening')) { if (palautettu('jaannos.seura_forening', a)) continue; expect(r.kohde === 'tm_lang' ? polku(L, r.polku) : kartta[r.kohde][r.fi], a).toBe(r.sv); }
    for (const [a, r] of rivit('jaannos.kausifokus')) if (!palautettu('jaannos.kausifokus', a)) expect(kartta[r.kohde][r.fi], a).toBe(r.sv);
    for (const [fi, r] of rivit('jaannos.vp_master')) if (!palautettu('jaannos.vp_master', fi)) { expect(VP[fi], fi).toBe(r.sv); expect(MA[fi], fi).toBe(r.sv); }
  });
  it('uusi seura-sana: tm_lang/vp/master/common eivät sisällä enää "klubb" (paitsi palautetut)', () => {
    const jaljella = [];
    const kavele = (o, pre) => { for (const k of Object.keys(o)) { const x = o[k], p = pre ? pre + '.' + k : k; if (x && typeof x === 'object') kavele(x, p); else if (/klubb/i.test(String(x)) && !palautettu('jaannos.seura_forening', 'tm_lang:' + p)) jaljella.push('tm_lang:' + p); } };
    kavele(L, '');
    for (const [n, M] of [['vp', VP], ['master', MA], ['common', CO]]) for (const k of Object.keys(M)) if (/klubb/i.test(M[k]) && !palautettu('jaannos.seura_forening', n + ':' + k)) jaljella.push(n + ':' + k);
    expect(jaljella).toEqual([]);
  });
  it('termistö: erän uudet termit tilalla sovittu', () => {
    const T = require('../docs/i18n/termisto.fi-sv.json'); const t = Array.isArray(T.termit) ? T.termit : Object.values(T.termit);
    for (const fi of ['Havainnointi', 'Päätös / Päätöksenteko', 'Toteutus', 'Palautuminen', 'Pelihavainto', 'Otteluhavainnointi', 'Ottelutarkkailu']) {
      const e = t.find((x) => x.fi === fi); expect(e, fi).toBeTruthy(); expect(e.tila).toBe('sovittu'); expect(e.kaannokset.sv).toBe(ERA.termisto.kaannettava[fi].sv);
    }
  });
  it('paikkamerkit säilyvät fi → sv jokaisella viedyllä rivillä', () => {
    const j = (s) => ((s.match(/\{[A-Za-z0-9_]+\}/g)) || []).sort().join('|');
    const rikki = Object.entries(ERA.osiot).flatMap(([o, os]) => Object.entries(os.rivit).filter(([a, r]) => r.sv && !palautettu(o, a) && j(r.fi) !== j(r.sv)).map(([a]) => o + ' ' + a));
    expect(rikki).toEqual([]);
  });
});
