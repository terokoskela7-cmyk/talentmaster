/* Klipin ajastettu-tila: kun nakyva_alkaen on tulevaisuudessa (D62: lähetys klo 21–7), rivi kertoo milloin pelaaja näkee — ei "Odottaa vastausta". D62-portti ennallaan. Yksi lib-funktio: Polku + Masterin mediakanava + lähetysilmoitus. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const M = require('../lib/tm_mediaviesti.js'), P = require('../lib/tm_kt_polku.js');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pl = { p2: { nimi: 'Bertta Bergh', suostumusTila: 'annettu' } };
const laheta = (nyt) => M.tmMvKlippiDokumentit({ url: 'https://veo.co/x', klippityyppi: 'onnistui', kysymys: 'Mitä huomaat?', vastaanottajat: [{ pelaajaId: 'p2', pelaajaNimi: 'Bertta Bergh', ika: 13, vastaanottajaUid: 'u1' }] }, { nyt, lahettajaUid: 'u1', lahettajaNimi: 'Mika V.' }).dokit[0];
const doc = (nyt) => Object.assign({ id: 'k1', aika: nyt.getTime() }, laheta(nyt));
const T23_50 = new Date(2026, 9, 17, 23, 50), T12 = new Date(2026, 9, 17, 12, 0);

describe('ajastettu-tila', () => {
  it('lähetys 23.50 → nakyva_alkaen seuraavana päivänä 7.00 (D62 ennallaan) ja rivin tila "ajastettu"', () => {
    const k = doc(T23_50), a = k.nakyva_alkaen; expect(a.getDate()).toBe(18); expect(a.getHours()).toBe(7); expect(a.getMinutes()).toBe(0);
    const r = M.tmMvRivit([k], { pelaajat: pl, nyt: T23_50 })[0]; expect(r.tila).toBe('ajastettu'); expect(r.nakyvaMs).toBe(a.getTime());
    expect(M.tmMvAjastusTeksti(a, {}, 'mv_rivi_ajastettu', T23_50)).toBe('Ajastettu · näkyy pelaajalle 18.10. klo 7.00');
  });
  it('lähetys 12.00 → nakyva_alkaen = heti, normaali "odottaa" eikä ajastusta', () => {
    const k = doc(T12), r = M.tmMvRivit([k], { pelaajat: pl, nyt: T12 })[0]; expect(r.tila).toBe('odottaa'); expect(M.tmMvAjastus(k.nakyva_alkaen, T12)).toBeNull(); expect(M.tmMvAjastusTeksti(k.nakyva_alkaen, {}, 'mv_rivi_ajastettu', T12)).toBe('');
  });
  it('kello 7.00 jälkeen sama klippi on enää "odottaa"; vastaus/kuittaus/lupa/suljettu voittavat ajastuksen', () => {
    const k = doc(T23_50), jalkeen = new Date(2026, 9, 18, 7, 1);
    expect(M.tmMvRivit([k], { pelaajat: pl, nyt: jalkeen })[0].tila).toBe('odottaa');
    expect(M.tmMvTila(k, [], { suostumusTila: 'odottaa' }, T23_50)).toBe('odottaa_lupaa'); expect(M.tmMvTila(Object.assign({}, k, { tila: 'suljettu' }), [], pl.p2, T23_50)).toBe('suljettu');
    expect(M.tmMvTila(k, [{ tyyppi: 'klippi_vastaus', vastaus_viestille: 'k1' }], pl.p2, T23_50)).toBe('vastattu');
  });
  it('Masterin mediakanavan rivi (tmMvRiviHTML) näyttää ajastetun tilan; muut tilat ennallaan', () => {
    const r = M.tmMvRivit([doc(T23_50)], { pelaajat: pl, nyt: T23_50 })[0], h = M.tmMvRiviHTML(r, { esc, avaaFn: '_a' });
    expect(h).toContain('data-mv-tila="ajastettu"'); expect(h).toContain('Ajastettu · näkyy pelaajalle 18.10. klo 7.00'); expect(h).not.toContain('Odottaa vastausta');
    const n = M.tmMvRiviHTML(M.tmMvRivit([doc(T12)], { pelaajat: pl, nyt: T12 })[0], { esc, avaaFn: '_a' }); expect(n).toContain('Odottaa vastausta'); expect(n).not.toContain('Ajastettu');
  });
  it('joukkueklippi: kaikki ajastettuja → rivillä ajastus; yksi näkyvissä → ei', () => {
    const syote = (nyt) => M.tmMvKlippiDokumentit({ url: 'https://veo.co/x', klippityyppi: 'onnistui', kysymys: 'Mitä huomaat?', joukkueklippi: true, vastaanottajat: [{ pelaajaId: 'p2', ika: 13 }, { pelaajaId: 'p3', ika: 13 }] }, { nyt, lahettajaUid: 'u1' }).dokit.map((d, i) => Object.assign({ id: 'k' + i, aika: nyt.getTime() }, d));
    const pl2 = { p2: { suostumusTila: 'annettu' }, p3: { suostumusTila: 'annettu' } }, r = M.tmMvRivit(syote(T23_50), { pelaajat: pl2, nyt: T23_50 })[0];
    expect(r.tila).toBe('ajastettu'); expect(M.tmMvRiviHTML(r, { esc, avaaFn: '_a' })).toContain('Ajastettu · näkyy pelaajalle 18.10. klo 7.00');
    expect(M.tmMvRivit(syote(T12), { pelaajat: pl2, nyt: T12 })[0].tila).toBe('odottaa');
  });
  it('Polun klippirivi (uusi sivu) käyttää samaa funktiota: ajastettu → päivä + klo; muuten "lähetetty"', () => {
    const jf = { alkoi: '2026-10-03' }, c = (nyt) => ({ esc, t: (k) => k }), rivi = (nyt, k) => P.tmKtPolkuKlipit([k], jf, { pelaaja: { id: 'p2', nimi: 'Bertta', suostumusTila: 'annettu' }, nyt }).rivit[0];
    const k1 = Object.assign({ pelaajaId: 'p2' }, doc(T23_50)), r1 = rivi(T23_50, k1);
    expect(r1.tila).toBe('ajastettu'); const h1 = P.tmKtPolkuHTML({ id: 'p2', jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'X', alkoi: '2026-10-03', kesto_vk: 6 }, suostumusTila: 'annettu' }, { esc, t: (k) => k, nyt: T23_50, tila: { tila: 'kaynnissa' }, kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [k1] } });
    expect(h1).toContain('Ajastettu · näkyy pelaajalle 18.10. klo 7.00'); expect(h1).not.toContain('lähetetty');
    const k2 = Object.assign({ pelaajaId: 'p2' }, doc(T12)); const h2 = P.tmKtPolkuHTML({ id: 'p2', jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'X', alkoi: '2026-10-03', kesto_vk: 6 }, suostumusTila: 'annettu' }, { esc, t: (k) => k, nyt: T12, tila: { tila: 'kaynnissa' }, kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [k2] } });
    expect(h2).toContain('lähetetty'); expect(h2).not.toContain('Ajastettu');
  });
  it('lähetysilmoituksen lisä: 23.50 → "Näkyy pelaajalle 18.10. klo 7.00."; 12.00 → ei lisää', () => {
    expect(M.tmMvAjastusTeksti(laheta(T23_50).nakyva_alkaen, {}, 'mv_lahetetty_ajastettu_lisa', T23_50)).toBe('Näkyy pelaajalle 18.10. klo 7.00.'); expect(M.tmMvAjastusTeksti(laheta(T12).nakyva_alkaen, {}, 'mv_lahetetty_ajastettu_lisa', T12)).toBe('');
    const master = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8'); expect(master).toContain("'mv_lahetetty_ajastettu_lisa'");
  });
  it('D62-portti koskematon: tmMvNakyvaAlkaen ja pelaajan suodatus (kpKetjut) ennallaan', () => {
    const src = readFileSync(new URL('../lib/tm_mediaviesti.js', import.meta.url), 'utf8'); expect(src).toContain('if (h >= 21) { d.setDate(d.getDate() + 1); d.setHours(7, 0, 0, 0); return d; }');
    const KP = require('../lib/tm_klippi_perhe.js'); expect(KP.kpKetjut([doc(T23_50)], { nyt: T23_50, pelaajaId: 'p2' }).length).toBe(0); expect(KP.kpKetjut([doc(T23_50)], { nyt: new Date(2026, 9, 18, 7, 1), pelaajaId: 'p2' }).length).toBe(1);
  });
});
