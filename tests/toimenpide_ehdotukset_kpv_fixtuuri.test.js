/**
 * Projekti 03 / PR B2 — KPV:n kaltainen tuotantodata (raakatulokset + testipaivat, EI tallennettua hh_taso/tki_viimeisin-pikakenttää) koko palvelinputken läpi
 * (yhdistaLista-muotoiset rivit → luoEhdotukset), sekä lokirivin muoto. Selittää: mitkä kentät pitää olla, jotta signaali laukeaa.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const E = require('../functions/toimenpide_ehdotukset.js');
const NYT = Date.UTC(2026, 10, 9, 8, 0);
const JOUKKUEET = [{ id: 'kpv_u13', nimi: 'KPV U13' }, { id: 'kpv_u14', nimi: 'KPV U14' }];
function fakeDb() {
  const doks = new Map();
  const kok = { where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
    doc: (id) => ({ create: async (d) => { if (doks.has(id)) { const e = new Error('6 ALREADY_EXISTS'); e.code = 6; throw e; } doks.set(id, d); } }) };
  return { doks, db: { collection: () => ({ doc: () => ({ collection: () => kok }) }) }, FieldValue: { serverTimestamp: () => 'TS' } };
}
const bio = { phv_tila_koodi: 'POST', mittauspaiva: '2026-08-20' };
const hidas = (id) => ({ id, data: { joukkue: 'KPV U13', joukkueet: ['kpv_u13'], syntymaVuosi: 2013, sukupuoli: 'M', biologinenIka_viimeisin: bio,
  hh_viimeisin: { lin30m: 5.6, cmj: 18 }, testipaivat: { fyysinen_hh: '2026-10-01' } } });
describe('KPV-kaltainen data (raakatulokset, ei pikakenttiä)', () => {
  it('fyysinen kehityskohde laukeaa raakatuloksista + testipaivat + sukupuoli + POST-PHV, vaikka hh_taso puuttuu', async () => {
    const f = fakeDb(); const rivit = ['a', 'b', 'c', 'd', 'e', 'f'].map(hidas);
    const r = await E.luoEhdotukset(f, 'kpv', rivit, JOUKKUEET, '2026-W45', NYT);
    expect([...f.doks.values()].map((d) => d.signaali)).toContain('hh_taso_alhainen');
    expect(r.ehdokkaita).toBe(r.luotu + r.ohitettu);
  });
  it('ILMAN testipaivat.fyysinen_hh ja sukupuolta signaali EI laukea (päivä tuntematon / sukupuoli puuttuu → ei dataa) — dokumentoitu syy "ei ehdotuksia"', async () => {
    const f = fakeDb(); const rivit = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => { const x = hidas(id); delete x.data.testipaivat; delete x.data.sukupuoli; return x; });
    await E.luoEhdotukset(f, 'kpv', rivit, JOUKKUEET, '2026-W45', NYT);
    expect([...f.doks.values()].map((d) => d.signaali)).not.toContain('hh_taso_alhainen');
  });
  it('loki: kooste kirjoittaa [toimenpide-ehdotukset] -rivin, jossa vain sid/vk/luvut (ei pelaaja-/käyttäjätunnuksia)', () => {
    const s = readFileSync(new URL('../functions/seuran_kooste.js', import.meta.url), 'utf8');
    const m = s.match(/\[toimenpide-ehdotukset\] ' \+ JSON\.stringify\(\{([^}]*)\}\)/);
    expect(m).toBeTruthy();
    expect(m[1].split(',').map((x) => x.trim().split(':')[0].trim())).toEqual(['sid', 'vk', 'ehdokkaita', 'luotu', 'ohitettu', 'pelaajia']);
  });
});
