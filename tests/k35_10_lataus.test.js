/* K35-10 — rajattu kalenterilataus: ikkuna, laajennus (vain puuttuva väli), dedup, monipäiväinen tauko ikkunan reunalla (2. kysely). */
const L = require('../lib/tm_kalenteri_lataus.js');
const NYT = Date.parse('2026-10-14T12:00:00+03:00'), VK = 7 * 864e5;
describe('ikkuna', () => {
  it('oletus −8 vk … +26 vk nykyviikosta (viikkorajoilla)', () => {
    const w = L.tmLatausIkkuna({ nyt: NYT });
    expect(Math.round((Date.parse('2026-10-12T00:00:00+03:00') - w.alku) / VK)).toBe(8); expect(Math.round((w.loppu - Date.parse('2026-10-12T00:00:00+03:00')) / VK)).toBe(27);
    expect(w.alku).toBeLessThan(NYT - 8 * VK + 1); expect(w.loppu).toBeGreaterThan(NYT + 26 * VK);
  });
  it('viikon selaus ikkunan sisällä ei laajenna; ulkopuolella (taakse/eteen) laajenee kattamaan viikon + marginaali; ladattua ei kavenneta', () => {
    const w = L.tmLatausIkkuna({ nyt: NYT });
    expect(L.tmLatausIkkuna({ nyt: NYT, valittuViikko: '2026-12-01', ladattu: w })).toEqual(w);
    const e = L.tmLatausIkkuna({ nyt: NYT, valittuViikko: '2027-06-01', ladattu: w }); expect(e.alku).toBe(w.alku); expect(e.loppu).toBeGreaterThan(Date.parse('2027-06-14T00:00:00+03:00'));
    const t = L.tmLatausIkkuna({ nyt: NYT, valittuViikko: '2026-05-01', ladattu: e }); expect(t.alku).toBeLessThan(Date.parse('2026-05-01')); expect(t.loppu).toBe(e.loppu);
  });
});
describe('puuttuva väli', () => {
  const w = L.tmLatausIkkuna({ nyt: NYT });
  it('ei mitään kun tarve on ladatun sisällä; ensimmäinen lataus = koko ikkuna; laajennus hakee VAIN uuden osan', () => {
    expect(L.tmLatausPuuttuva(w, w)).toEqual([]); expect(L.tmLatausPuuttuva(null, w)).toEqual([w]);
    const e = L.tmLatausIkkuna({ nyt: NYT, valittuViikko: '2027-06-01', ladattu: w }), p = L.tmLatausPuuttuva(w, e);
    expect(p).toHaveLength(1); expect(p[0].alku).toBe(w.loppu + 1); expect(p[0].loppu).toBe(e.loppu);
    const t = L.tmLatausIkkuna({ nyt: NYT, valittuViikko: '2026-04-01', ladattu: w }), q = L.tmLatausPuuttuva(w, t); expect(q).toHaveLength(1); expect(q[0].loppu).toBe(w.alku - 1);
    const kaksi = L.tmLatausPuuttuva({ alku: 100, loppu: 200 }, { alku: 50, loppu: 300 }); expect(kaksi).toEqual([{ alku: 50, loppu: 99 }, { alku: 201, loppu: 300 }]);
  });
});
describe('yhdistys ja suodatus', () => {
  it('dedup id:llä (uudet voittavat), järjestys alkaa-ajan mukaan; poistetut pois muistissa', () => {
    const m = L.tmYhdistaTapahtumat([{ id: 'a', _alkaaMs: 2, v: 1 }, { id: 'b', _alkaaMs: 1 }], [{ id: 'a', _alkaaMs: 2, v: 2 }, { id: 'c', _alkaaMs: 3 }]);
    expect(m.map((x) => x.id)).toEqual(['b', 'a', 'c']); expect(m[1].v).toBe(2);
    expect(L.tmLatausSuodata([{ id: 1, poistettu: true }, { id: 2, poistettu: false }, { id: 3 }]).map((x) => x.id)).toEqual([2, 3]);
  });
});
describe('monipäiväinen tauko ikkunan reunalla', () => {
  const ts = { fromMillis: (m) => ({ _ms: m }) };
  const tauko = { id: 'tauko', koko_paiva: true, alkaa: { _ms: Date.parse('2026-08-10T00:00:00Z') }, paattyy: { _ms: Date.parse('2026-12-31T00:00:00Z') }, tyyppi: 'seuran_tauko' };
  const tavallinen = { id: 'ma', alkaa: { _ms: Date.parse('2026-10-14T15:00:00Z') }, paattyy: { _ms: Date.parse('2026-10-14T16:00:00Z') } };
  const vanha = { id: 'vanha', alkaa: { _ms: Date.parse('2026-01-14T15:00:00Z') }, paattyy: { _ms: Date.parse('2026-01-14T16:00:00Z') } };
  function db(kysely) {
    return { collection: () => ({ doc: () => ({ collection: () => { const mk = (ehdot) => { const q = { where: (f, op, v) => mk(ehdot.concat([[f, op, v]])), get: async () => { kysely.push(ehdot.slice()); const docs = [tauko, tavallinen, vanha].filter((e) => ehdot.every(([f, op, v]) => { const x = f === 'koko_paiva' ? e.koko_paiva : e[f] && e[f]._ms; const y = v && v._ms != null ? v._ms : v; if (op === '==') return x === y; if (op === '>=') return x >= y; if (op === '<=') return x <= y; return true; })); return { docs: docs.map((e) => ({ id: e.id, data: () => e })) }; } }; return q; }; return mk([]); } }) }) };
  }
  it('tauko joka alkoi 2 kk ennen ikkunaa löytyy 2. kyselyllä; vanha tavallinen tapahtuma ei; dedup yhdistää; kyselyt: 1) alkaa-väli 2) koko_paiva + paattyy ≥ alku', async () => {
    const kys = [], w = L.tmLatausIkkuna({ nyt: Date.parse('2026-10-14T12:00:00+03:00') }), docs = await L.tmLataaIkkuna(db(kys), 'demo', [w], ts);
    expect(docs.map((d) => d.id).sort()).toEqual(['ma', 'tauko']); expect(kys).toHaveLength(2);
    expect(kys[0].map((e) => e[0] + e[1])).toEqual(['alkaa>=', 'alkaa<=']); expect(kys[1].map((e) => e[0] + e[1])).toEqual(['koko_paiva==', 'paattyy>=']);
  });
  it('tauko jonka alku on JO ikkunan sisällä ei kahdennu (id-dedup)', async () => {
    const t2 = Object.assign({}, tauko, { alkaa: { _ms: Date.parse('2026-10-20T00:00:00Z') } }), kys = [];
    const d = { collection: () => ({ doc: () => ({ collection: () => { const e = []; const q = { where: (f, o, v) => { e.push([f, o, v]); return q; }, get: async () => ({ docs: [{ id: 'tauko', data: () => t2 }] }) }; return q; } }) }) };
    expect((await L.tmLataaIkkuna(d, 'demo', [L.tmLatausIkkuna({ nyt: NYT })], ts))).toHaveLength(1);
  });
  it('2. kyselyn virhe (indeksi puuttuu) ei kaada latausta — 1. kyselyn tulos säilyy', async () => {
    let n = 0; const d = { collection: () => ({ doc: () => ({ collection: () => { const q = { where: () => q, get: () => (++n === 2 ? Promise.reject(new Error('index')) : Promise.resolve({ docs: [{ id: 'ma', data: () => tavallinen }] })) }; return q; } }) }) };
    expect((await L.tmLataaIkkuna(d, 'demo', [L.tmLatausIkkuna({ nyt: NYT })], ts)).map((x) => x.id)).toEqual(['ma']);
  });
});

describe('kauden alku (kalibraatio)', () => {
  it('tmKausiAlkuMs: 1.8. Helsingin ajassa; loka → saman vuoden elokuu, kesäkuu → edellisen vuoden elokuu', () => {
    const pv = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms + 12 * 3600000));
    expect(pv(L.tmKausiAlkuMs(Date.parse('2026-10-19T09:00:00+03:00')))).toBe('2026-08-01'); expect(pv(L.tmKausiAlkuMs(Date.parse('2026-06-10T09:00:00+03:00')))).toBe('2025-08-01'); expect(pv(L.tmKausiAlkuMs(Date.parse('2026-08-01T00:30:00+03:00')))).toBe('2026-08-01');
  });
});
