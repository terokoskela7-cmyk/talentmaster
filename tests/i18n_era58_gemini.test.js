/* Gemini-erä 58 (peliäly-tasokorjaus 16.10.) — lähetyserä = koodi; vanhat sv-arvot poistettu; sv odottaa palautusta. Code ei kirjoita ruotsia (§0). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const E = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_58_gemini.json', import.meta.url), 'utf8'));
const A = require('../lib/tm_adar_rubriikki.js'), TX = require('../lib/tm_adar_tekstit.js'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const PAL = JSON.parse(readFileSync(new URL('../docs/i18n/sv_era2_palautetaan.json', import.meta.url), 'utf8')).rivit;
describe('sv-erä 58 — lähetyserä', () => {
  it('18 riviä (10 lib.rubriikit + 8 lib.tm_adar_tekstit), sv tyhjä, huom jokaisella; fi = koodi', () => {
    expect(E._rivit_yhteensa).toBe(18);
    for (const [o, os] of Object.entries(E.osiot)) for (const [k, r] of Object.entries(os.rivit)) { expect(r.sv, o + k).toBe(''); expect(r.huom.length, k).toBeGreaterThan(15); expect(r.fi, k).toBeTruthy(); }
    for (const [k, r] of Object.entries(E.osiot['lib.tm_adar_tekstit'].rivit)) expect(r.fi, k).toBe(TX.FI[k]);
    const rub = E.osiot['lib.rubriikit'].rivit; for (let t = 1; t <= 5; t++) { const x = A.TASOT[t]; expect(rub[x.nimi].fi).toBe(x.nimi); if (t < 5) expect(rub[x.nyt].fi).toBe(x.nyt); else expect(rub[x.nyt]).toBeUndefined(); }
    expect(rub['Seuraava taito'].fi).toBe('Seuraava taito');   // uusi avain (kortin otsikkorivi)
    for (const v of ['Luet pelitilanteita ja teet hyviä valintoja ⚙️', 'Teet hyviä ratkaisuja myös kovassa vauhdissa 🔄']) expect(rub[v], 'vanha nyt pois erästä').toBeUndefined();
  });
  it('muuttuneiden/korvattujen avainten vanhat sv-arvot on poistettu koodista (ei sekuntirajoja ruotsiksi)', () => {
    for (const x of PAL.filter((r) => /^lib\./.test(r.osio))) expect(SV[x.avain], x.avain).toBeUndefined();
    for (const k of Object.keys(E.osiot['lib.tm_adar_tekstit'].rivit)) expect(SV[k], k).toBeUndefined();
    expect(Object.values(SV).filter((v) => /\b(15|10–15|2) ?s(ek\w*)?\b/.test(String(v)) && /misstag|tvekar|Låser|Återhämtar|Beslutar|Snabb \(/.test(String(v)))).toEqual([]);
  });
  it('askel-tekstit ja tason 5 nyt ennallaan → vanha sv voimassa', () => {
    for (const t of [A.ASKEL.a, A.ASKEL.d, A.ASKEL.ac, A.ASKEL.r, A.YLLAPITO, A.TASOT[5].nyt]) expect(typeof SV[t], t).toBe('string');
  });
});
