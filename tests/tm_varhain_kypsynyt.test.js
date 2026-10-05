/**
 * tmVarhainKypsynyt(p) — lib/tm_phv_tila.js. Ehto: biologinen ikä − kalenteri-ikä ≥ +1,0 v (biologinenIka_viimeisin); tuntematon PHV → false.
 * Raja VÄLIAIKAINEN (Palloliiton linjaus tarkentaa) ja yhdessä vakiossa PHV_VARHAIN_KYPSYNYT. Ei VP:n _talenttiHuomio-tasoeroa (suoritus ≠ kypsyys).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = require('../lib/tm_phv_tila.js');
const B = require('../lib/tm_bioika.js');
const KESKI = P.PHV_VARHAIN_KYPSYNYT.keski_phv_ika;
const doc = (sp, phvIka, koodi) => ({ sukupuoli: sp, biologinenIka_viimeisin: { phv_tila_koodi: koodi || 'PH', phv_ika: phvIka, mittaukset: { sukupuoli: sp }, mittauspaiva: '2026-09-01' } });

describe('tmVarhainKypsynyt — raja +1,0 v (väliaikainen) yhdessä vakiossa', () => {
  it('vakio: raja_v 1,0, keski-PHV-ikä poika 13,8 / tyttö 11,8, tila "valiaikainen"; ei kovakoodattua rajaa funktiossa', () => {
    expect(P.PHV_VARHAIN_KYPSYNYT).toEqual({ raja_v: 1.0, keski_phv_ika: { P: 13.8, T: 11.8 }, tila: 'valiaikainen' });
    const src = readFileSync(join(juuri, 'lib/tm_phv_tila.js'), 'utf8');
    const fn = /function tmVarhainKypsynyt\(doc\) \{[\s\S]*?\n  \}\n/.exec(src)[0];
    expect(fn).not.toMatch(/\b1\.0\b|13\.8|11\.8/); expect(fn).toContain('PHV_VARHAIN_KYPSYNYT.raja_v');
    expect(src).toMatch(/tarkennetaan Palloliiton linjauksen mukaan/); expect(src).not.toMatch(/_talenttiHuomio/);
  });
  it('raja: poika — PHV ≥ 1,0 v ennen keskimääräistä (≤ 12,8) → true (täsmälleen rajalla true); 12,9 → false', () => {
    expect(P.tmVarhainKypsynyt(doc('P', 12.8))).toBe(true); expect(P.tmVarhainKypsynyt(doc('P', 12.0))).toBe(true);
    expect(P.tmVarhainKypsynyt(doc('P', 12.9))).toBe(false); expect(P.tmVarhainKypsynyt(doc('P', 13.8))).toBe(false); expect(P.tmVarhainKypsynyt(doc('P', 15))).toBe(false);
  });
  it('tyttö: oma keski-PHV-ikä (≤ 10,8 → true; 10,9 → false); sukupuoli M/N ja mittauksen sukupuoli tunnistetaan', () => {
    expect(P.tmVarhainKypsynyt(doc('T', 10.8))).toBe(true); expect(P.tmVarhainKypsynyt(doc('T', 10.9))).toBe(false);
    expect(P.tmVarhainKypsynyt(doc('N', 10.5))).toBe(true); expect(P.tmVarhainKypsynyt(doc('M', 12.5))).toBe(true);
    const d = doc('P', 12.5); delete d.sukupuoli; expect(P.tmVarhainKypsynyt(d), 'mittauksen sukupuoli riittää').toBe(true);
    expect(P.tmVarhainKypsynyt(doc('T', 12.5)), 'tytön 12,5 ei ole varhain (raja 10,8)').toBe(false);
  });
  it('fallback: ei phv_ika:a → ika_mittaushetkella − maturity_offset; ei kumpaakaan → false', () => {
    const f = (ika, off) => ({ sukupuoli: 'P', biologinenIka_viimeisin: { phv_tila_koodi: 'PH', ika_mittaushetkella: ika, maturity_offset: off } });
    expect(P.tmVarhainKypsynyt(f(12.5, 0.2))).toBe(true);    // phv_ika 12,3
    expect(P.tmVarhainKypsynyt(f(14.5, 0.2))).toBe(false);   // phv_ika 14,3
    expect(P.tmVarhainKypsynyt({ sukupuoli: 'P', biologinenIka_viimeisin: { phv_tila_koodi: 'PH' } })).toBe(false);
  });
  it('TUNTEMATON PHV → false: ei dokumenttia, ei mittausta, pelkkä lomakkeen/tuonnin phv_tila (ei mittaus), tyhjä biologinenIka_viimeisin, null/undefined', () => {
    [null, undefined, {}, { sukupuoli: 'P' }, { sukupuoli: 'P', phv_tila: 'POST' }, { sukupuoli: 'P', phv_tila: 'PH', phv_ika: 12 }, { sukupuoli: 'P', biologinenIka_viimeisin: {} }, { sukupuoli: 'P', biologinenIka_viimeisin: { phv_ika: 12 } }].forEach((d) => expect(P.tmVarhainKypsynyt(d), JSON.stringify(d)).toBe(false));
    expect(P.tmVarhainKypsynyt(doc(null, 12))).toBe(false);   // sukupuoli puuttuu → ei arvausta
  });
  it('epäluvut ja väärät tyypit eivät kaada eivätkä anna true (NaN, Infinity, merkkijono)', () => {
    [NaN, Infinity, -Infinity, '12.0', null, undefined].forEach((v) => expect(P.tmVarhainKypsynyt(doc('P', v)), String(v)).toBe(false));
  });
  it('KANONINEN KETJU: tm_bioika laskee mittausdokin → tmVarhainKypsynyt; varhain kypsyvä poika (s. 2014, 172 cm / 64 kg) → true; hitaasti kypsyvä (s. 2014, 150 cm) → false', () => {
    const luo = (sp, syn, pit, pai, ist) => ({ sukupuoli: sp, biologinenIka_viimeisin: B.laskeBioIkaDokumentti({ sukupuoli: sp, syntymapvm: syn, mittauspaiva: '2026-09-01', pituus: pit, paino: pai, istumapituus: ist }) });
    expect(P.tmVarhainKypsynyt(luo('P', '2014-03-01', 172, 64, 90))).toBe(true);
    expect(P.tmVarhainKypsynyt(luo('P', '2014-03-01', 150, 42, 76))).toBe(false);
  });
  it('lib/ ja functions/ identtiset; globaali root.tmVarhainKypsynyt (selain)', () => {
    expect(readFileSync(join(juuri, 'functions/tm_phv_tila.js'), 'utf8')).toBe(readFileSync(join(juuri, 'lib/tm_phv_tila.js'), 'utf8'));
    expect(readFileSync(join(juuri, 'lib/tm_phv_tila.js'), 'utf8')).toContain('root.tmVarhainKypsynyt = tmVarhainKypsynyt');
  });
});
