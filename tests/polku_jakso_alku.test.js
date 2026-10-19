/* Polku: jaksokortti näyttää viikon ja päivämäärävälin myös kun jaksofokuksella on vain `alku` (YYYY-MM-DD, ei `alkoi`); tyhjät "(yli )"-sulkeet pois tukiosa-rivistä; ei tyhjää "· –" -väliä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AJ = require('../lib/tm_aloita_jakso.js'), PK = require('../lib/tm_kt_polku.js');
const NYT = new Date(2026, 9, 19, 12, 0, 0);
const teksti = (h) => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
const jakso = (jf) => ({ id: 'p1', jaksofokus: Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', kesto_vk: 6, domeeni: 'fyysinen' }, jf) });
const piirra = (p) => teksti(PK.tmKtPolkuHTML(p, { nyt: NYT, tanaan: '2026-10-19', tila: AJ.tmJaksoTila(p, { nyt: NYT }), t: (k) => k, kaanon: null }));
describe('Polku · jaksokortin viikko ja päivämäärät', () => {
  it('alku (ilman alkoi) → viikko 3/6 ja "5.10.–16.11."', () => {
    const p = jakso({ alku: '2026-10-05' }); expect(AJ.tmJaksoTila(p, { nyt: NYT }).rivitila.vk).toEqual({ n: 3, yht: 6 });
    const t = piirra(p); expect(t).toContain('viikko 3/6'); expect(t).toContain('5.10.–16.11.'); expect(t).not.toMatch(/Jakso nyt\s*·\s*–/i);
  });
  it('alkoi ennallaan (ISO-aikaleima)', () => {
    const p = jakso({ alkoi: '2026-10-05T09:00:00.000Z' }); expect(AJ.tmJaksoTila(p, { nyt: NYT }).rivitila.vk.n).toBe(3); expect(piirra(p)).toContain('5.10.–16.11.');
  });
  it('tyhjät sulkeet "(yli )" pois tukiosa-rivistä; täysi arvo säilyy', () => {
    expect(piirra(jakso({ alkoi: '2026-10-05', tukiosa: { alue: 'Lihaskestävyys (yli )', perustelu: 'x' } }))).toContain('tukiosa: Lihaskestävyys ·');
    expect(piirra(jakso({ alkoi: '2026-10-05', tukiosa: { alue: 'Lihaskestävyys (yli 20 min)', perustelu: 'x' } }))).toContain('Lihaskestävyys (yli 20 min)');
  });
});
