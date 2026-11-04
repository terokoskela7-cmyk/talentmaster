/* B5 (BACKLOG_2_11.md, PM 29.10.): (1) VP Kodin otsikko näytti viikon 43 26.–28.10.2026, vaikka ISO-viikko on 44 (Master 44). Syy: otsikko luki viimeisimmän
   viikkokoosteen viikon (kooste lasketaan maanantaina edelliseltä viikolta → yhden jäljessä). Nyt otsikko = nykyinen ISO-viikko; koosteen ajankohta omalla rivillään.
   (2) Termi Aktion/Utförande = sv-muutos → PM:n palautuserä (CLAUDE.md §0: Code ei muuta ruotsia), ei tässä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KK = require('../lib/tm_vp_koti.js'), PU = require('../lib/tm_seuran_pulssi.js'), F = require('./helpers/vp_fixture.cjs');
const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const FN = { opas: 'op', aloitaJaksot: 'aj', kutsu: 'ku', testit: 'te', joukkue: 'jk', viesti: 'vi', tilanne: 'ti', kalenteri: 'ka', paivita: 'pa', demo: 'de', auki: 'au', tuo: 'tu', kuittaa: 'kt', valmentaja: 'va' };
const malli = (nyt, koosteVk) => {
  const d = F.lataa('kypsa', nyt), v = d.koosteet[d.koosteet.length - 1];
  if (koosteVk) v.vk = koosteVk;   // tuotannossa viimeisin kooste = edellinen viikko (CF ajaa maanantaina)
  const m = PU.tmPulssiRivit(d.koosteet, { nytMs: nyt, ensimmainenVk: d.ensin, jaksoVk: d.jaksoVk, katselmusPv: {} });
  return { m, env: { yhteensa: v.yhteensa, koosteJ: v.joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: d.kalenteri, viestit: [], nytMs: nyt, seuraNimi: 'Demo FC' } };
};
const PAIVAT = [Date.UTC(2026, 9, 26, 9, 0), Date.UTC(2026, 9, 27, 9, 0), Date.UTC(2026, 9, 28, 9, 0)];   // ma–ke 26.–28.10.2026 (ISO-viikko 44)

describe('B5 · VP Kodin viikkonumero = nykyinen ISO-viikko', () => {
  it('26.–28.10.2026, viimeisin kooste viikolta 43 → malli vkNyt 44, otsikko "viikko 44" (ei 43); koosteen viikko säilyy mallissa', () => {
    for (const nyt of PAIVAT) {
      const { m, env } = malli(nyt, '2026-W43'), rm = KK.tmKotiRytmiMalli(m, env), x = teksti(KK.tmKotiRytmiHTML(rm, { t: (s) => s, fn: FN }).main);
      expect(m.vkNum).toBe(43); expect(rm.vkNyt).toBe(44);
      expect(x).toContain('Demo FC · viikko 44'); expect(x).not.toContain('viikko 43');
    }
  });
  it('käynnistysvaihe käyttää samaa viikkoa', () => {
    const { m, env } = malli(PAIVAT[1], '2026-W43'), km = KK.tmKotiKaynnistysMalli(m, env);
    expect(km.vkNyt).toBe(44); expect(teksti(KK.tmKotiKaynnistysHTML(km, { t: (s) => s, fn: FN }).main)).toContain('viikko 44');
  });
  it('vuodenvaihde: to 31.12.2026 = ISO 2026-W53, ma 4.1.2027 = W01', () => {
    expect(malli(Date.UTC(2026, 11, 31, 9, 0)).m && KK.tmKotiKaynnistysMalli(malli(Date.UTC(2026, 11, 31, 9, 0)).m, malli(Date.UTC(2026, 11, 31, 9, 0)).env).vkNyt).toBe(53);
    expect(KK.tmKotiKaynnistysMalli(malli(Date.UTC(2027, 0, 4, 9, 0)).m, malli(Date.UTC(2027, 0, 4, 9, 0)).env).vkNyt).toBe(1);
  });
});

