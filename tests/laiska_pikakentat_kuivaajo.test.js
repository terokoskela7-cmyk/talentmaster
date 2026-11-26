/* scripts/laiska_pikakentat_kuivaajo.js — puhdas suunnittelulogiikka (ei Firestorea): jäljessä olevat pikakentät tunnistetaan, ajantasaiset ja dokumentittomat eivät kuulu korjattaviin. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { suunnittele } = require('../scripts/laiska_pikakentat_kuivaajo.js'), { laskeValmentajaHarjoitusKooste } = require('../lib/tm_eerikkila_normit.js');
const B = (uid, pvm, luotuMs) => ({ valmentajaUid: uid, malli: 'valmennustaidot', pvm, luotuMs, vastaukset: { b1: 4, b2: 4, b3: 4, b4: 4, b5: 4, b6: 4, b7: 4 } });
const RAJA = Date.parse('2026-11-17T00:00:00+02:00');
describe('pikakenttien kuiva-ajo', () => {
  it('jäljessä oleva valmentaja löytyy; ajantasainen ja dokumentiton eivät korjattavia; mallijakauma ja uudet arvioijat lasketaan', () => {
    const arv = [B('u1', '2026-11-20', RAJA + 1), B('u1', '2026-10-01', RAJA - 1), B('u2', '2026-11-21', RAJA + 5), B('u3', '2026-09-01', RAJA - 9), { valmentajaUid: 'u1', malli: 'A' }];
    const ajantasa = laskeValmentajaHarjoitusKooste(arv.filter((a) => a.valmentajaUid === 'u2'));
    const s = suunnittele(arv, { u1: { valmennustaito_n: 1 }, u2: Object.assign({}, ajantasa) }, RAJA, laskeValmentajaHarjoitusKooste);
    expect(s.valmentajia).toBe(3); expect(s.uusiaArvioijia).toBe(2); expect(s.jalkessa).toBe(1); expect(s.ilmanDokumenttia).toBe(1);
    expect(s.mallit).toEqual({ valmennustaidot: 4, A: 1 });
    expect(s.korjattavat.length).toBe(1); expect(s.korjattavat[0].pika.valmennustaito_n).toBe(2);
  });
});
