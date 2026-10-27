/* Vaihe 1 / PR 1a — lib/tm_sisainen.js: sisainen/tiedot -perusta (rekisteri, dual-read, dual-write, joukkolataus). */
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_sisainen.js');

describe('rekisteri', () => {
  it('vain d3-ryhmä on kytketty; muut ryhmät määritelty mutta eivät vaikuta (inventaario 22.10.)', () => {
    expect(Object.keys(S.RYHMAT).filter((n) => S.RYHMAT[n].kytketty)).toEqual(['d3']);
    expect(S.tmSisainenKentat()).toEqual(['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm']);
    ['jaksofokus_sisainen', 'historia_sisainen', 'henkilokunta', 's4', 'signaali', 'arviointi', 'adar_sisainen', 'kypsyys_sisainen', 'talentti', 'terveys', 'tuonti_meta'].forEach((r) => expect(S.RYHMAT[r], r).toBeDefined());
  });
  it('PM:n päätökset: signaali = A; korjattu/korjaus = C (ei rekisterissä); havainto_porras_ehdotus kuuluu adar_sisainen-ryhmään (viipale 1e)', () => {
    const kaikki = Object.values(S.RYHMAT).flatMap((r) => r.kentat);
    expect(kaikki).toContain('signaali'); expect(kaikki).not.toContain('korjattu'); expect(kaikki).not.toContain('korjaus'); expect(S.RYHMAT.adar_sisainen.kentat).toContain('havainto_porras_hist'); expect(S.RYHMAT.adar_sisainen.kentat).not.toContain('havainto_porras_ehdotus');
    expect(S.RYHMAT.adar_sisainen.kytketty).toBe(false);
  });
  it('polku', () => { expect(S.tmSisainenPolku('sjk', 'p1')).toBe('seurat/sjk/pelaajat/p1/sisainen/tiedot'); });
});

describe('dual-read: tmSisainenYhdista', () => {
  it('sisainen voittaa kentittäin; vanha pelaajakenttä varalla; syötteet ennallaan', () => {
    const p = { id: 'p1', nimi: 'X', d3_taso: 2, d3_pvm: '2026-01-01', d3_varmuus: 'valmentaja' }, s = { d3_taso: 4, d3_viimeisin: { pisteet: { focus: { valmentaja: 4 } } }, seuraId: 'sjk' };
    const k = JSON.stringify([p, s]), m = S.tmSisainenYhdista(p, s);
    expect(JSON.stringify([p, s])).toBe(k);
    expect(m.d3_taso).toBe(4); expect(m.d3_pvm).toBe('2026-01-01'); expect(m.d3_viimeisin.pisteet.focus.valmentaja).toBe(4); expect(m.nimi).toBe('X'); expect(m.seuraId).toBeUndefined();
  });
  it('VARAPOLKU (vanha Master / ei sisainen-dokumenttia): sama kuin pelaajadokumentti', () => {
    const p = { id: 'p1', d3_viimeisin: { pisteet: { focus: { valmentaja: 3, avg: 3 } } }, d3_taso: 3 };
    expect(S.tmSisainenYhdista(p, null)).toEqual(p); expect(S.tmSisainenYhdista(p, undefined)).toEqual(p); expect(S.tmSisainenYhdista(p, {})).toEqual(p);
  });
  it('ei-kytketyt ryhmät eivät yhdisty (tuoja sisainen:ssä ei nouse pelaajaolioon vielä)', () => {
    expect(S.tmSisainenYhdista({ id: 'p' }, { tuoja: 'x@y.fi' })).toEqual({ id: 'p' });   // tuoja_meta ei kytketty
    expect(S.tmSisainenYhdista({ id: 'p' }, { vastuuhenkilo: { uid: 'u' } }, { henkilokuntaKirjoitus: false })).toEqual({ id: 'p' });   // henkilokunta: lippu pois (peruutus) → ei yhdisty
  });
  it('pelaajan d3_itsearvio yhdistyy pisteet[dim].pelaaja:ksi; muut D3-osat sisainen:stä', () => {
    const m = S.tmSisainenYhdista({ id: 'p', d3_itsearvio: { pisteet: { focus: 5 }, pvm: '2026-10-20' } }, { d3_viimeisin: { pisteet: { focus: { valmentaja: 3 } }, lahteet: ['valmentaja'] } });
    expect(m.d3_viimeisin.pisteet.focus).toEqual({ valmentaja: 3, pelaaja: 5, avg: 4 }); expect(m.d3_varmuus).toBe('trianguloitu');
  });
  it('tmSisainenYhdistaLista: id:llä; puuttuva mapa → ennallaan', () => {
    const l = S.tmSisainenYhdistaLista([{ id: 'a', d3_taso: 1 }, { id: 'b', d3_taso: 2 }], { a: { d3_taso: 5 } });
    expect(l.map((x) => x.d3_taso)).toEqual([5, 2]); expect(S.tmSisainenYhdistaLista(null, null)).toEqual([]);
  });
});

const MUU_RYHMA = { d3: { kytketty: true, vainSisainen: true, kentat: ['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm'] }, testi: { kytketty: true, kentat: ['a_kentta'] } };   // tuleva A-ryhmä ilman vainSisainen-lippua = dual-write
describe('kirjoitusjako: tmSisainenJaa (PR 2a: D3 VAIN sisainen:iin)', () => {
  it('D3 ei mene pelaajadokumenttiin (ei dual-writea); muut kentät vain pelaajalle; sisainen saa seuraId + paivitetty', () => {
    const j = S.tmSisainenJaa({ d3_viimeisin: { a: 1 }, d3_taso: 3, d3_pvm: 'x', d3_varmuus: 'v', d3_vp_pvm: 'y', nimi: 'X' }, { seuraId: 'sjk', nytISO: '2026-10-22T10:00:00.000Z' });
    expect(j.pelaaja).toEqual({ nimi: 'X' });
    expect(j.sisainen).toEqual({ d3_viimeisin: { a: 1 }, d3_taso: 3, d3_pvm: 'x', d3_varmuus: 'v', d3_vp_pvm: 'y', seuraId: 'sjk', paivitetty: '2026-10-22T10:00:00.000Z' });
    expect(S.tmSisainenVainSisaiset().sort()).toEqual(['d3_pvm', 'd3_taso', 'd3_varmuus', 'd3_viimeisin', 'd3_vp_pvm']);
  });
  it('tuleva A-ryhmä ilman vainSisainen-lippua kirjoitetaan yhä MOLEMPIIN (siirtymä); D3 samassa payloadissa vain sisainen:iin', () => {
    const j = S.tmSisainenJaa({ a_kentta: 1, d3_taso: 3 }, { seuraId: 's', nytISO: 't', ryhmat: MUU_RYHMA });
    expect(j.pelaaja).toEqual({ a_kentta: 1 }); expect(j.sisainen).toEqual({ a_kentta: 1, d3_taso: 3, seuraId: 's', paivitetty: 't' });
  });
  it('ei A-kenttiä → sisainen null; PR 2 -tila (pelaajaIlmanA): A ei pelaajalle', () => {
    expect(S.tmSisainenJaa({ nimi: 'X' }, { seuraId: 's' })).toEqual({ pelaaja: { nimi: 'X' }, sisainen: null });
    expect(S.tmSisainenJaa({ d3_taso: 3, nimi: 'X' }, { seuraId: 's', pelaajaIlmanA: true }).pelaaja).toEqual({ nimi: 'X' });
  });
});

/* Minimaalinen db-tynkä */
function db(opts) {
  opts = opts || {}; const ops = [];
  const ref = (path) => ({ _path: path, set: (d, o) => { ops.push(['set', path, d, o]); return opts.yksinVirhe ? Promise.reject(opts.yksinVirhe) : (opts.sisainenSetVirhe && /\/sisainen\/tiedot$/.test(path)) ? Promise.reject(opts.sisainenSetVirhe) : Promise.resolve(); }, collection: (c) => ({ doc: (id) => ref(path + '/' + c + '/' + id) }) });
  return { ops, collection: (c) => ({ doc: (id) => ({ collection: (c2) => ({ doc: (id2) => ref(c + '/' + id + '/' + c2 + '/' + id2) }) }) }),
    batch: () => { const b = []; return { set: (r, d, o) => b.push(['set', r._path, d, o]), commit: () => { if (opts.batchVirhe) return Promise.reject(opts.batchVirhe); b.forEach((x) => ops.push(x)); ops.push(['commit']); return Promise.resolve(); } }; } };
}
describe('tmSisainenKirjoita', () => {
  it('PR 2a: D3-payload → YKSI set sisainen/tiedot:iin; pelaajadokumenttiin EI kirjoiteta (ei batchia, ei tyhjää kirjoitusta)', async () => {
    const d = db(); const r = await S.tmSisainenKirjoita(d, 'sjk', 'p1', { d3_viimeisin: { x: 1 }, d3_taso: 2, d3_pvm: '2026-10-23', d3_varmuus: 'valmentaja' });
    expect(r.ok).toBe(true); expect(r.sisainenOhitettu).toBe(false);
    expect(d.ops.map((o) => o[1])).toEqual(['seurat/sjk/pelaajat/p1/sisainen/tiedot']); expect(d.ops[0][3]).toEqual({ merge: true });
    expect(d.ops[0][2]).toMatchObject({ d3_viimeisin: { x: 1 }, d3_taso: 2, seuraId: 'sjk' }); expect(d.ops.filter((o) => o[0] === 'commit')).toHaveLength(0);
  });
  it('sekapayload (D3 + muu kenttä) → YKSI batch: pelaajadokumentti vain muulle kentälle + sisainen/tiedot D3:lle', async () => {
    const d = db(); await S.tmSisainenKirjoita(d, 'sjk', 'p1', { d3_taso: 2, nimi: 'X' });
    expect(d.ops.filter((o) => o[0] === 'set').map((o) => o[1])).toEqual(['seurat/sjk/pelaajat/p1', 'seurat/sjk/pelaajat/p1/sisainen/tiedot']); expect(d.ops[0][2]).toEqual({ nimi: 'X' }); expect(d.ops.filter((o) => o[0] === 'commit')).toHaveLength(1);
  });
  it('PR 2a: permission-denied EI enää pudota D3:a vanhaan kenttään — virhe heitetään (näkyvä virhe), vanhaan kenttään ei kirjoiteta, ei hiljaista varapolkua', async () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = db({ sisainenSetVirhe: Object.assign(new Error('denied'), { code: 'permission-denied' }) });
    await expect(S.tmSisainenKirjoita(d, 'sjk', 'p1', { d3_taso: 2 })).rejects.toThrow('denied'); expect(d.ops.map((o) => o[1])).toEqual(['seurat/sjk/pelaajat/p1/sisainen/tiedot']);
    const d2 = db({ batchVirhe: Object.assign(new Error('denied'), { code: 'permission-denied' }) }); await expect(S.tmSisainenKirjoita(d2, 'sjk', 'p1', { d3_taso: 2, nimi: 'X' })).rejects.toThrow('denied'); expect(d2.ops).toEqual([]);
    expect(w).not.toHaveBeenCalled(); w.mockRestore();
  });
  it('varapolku säilyy vain tuleville dual-write-ryhmille (ei vainSisainen): permission-denied → vain vanha kenttä + console.warn', async () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = db({ batchVirhe: Object.assign(new Error('denied'), { code: 'permission-denied' }) }); const r = await S.tmSisainenKirjoita(d, 'sjk', 'p1', { a_kentta: 2 }, { ryhmat: MUU_RYHMA });
    expect(r).toMatchObject({ ok: true, sisainenOhitettu: true }); expect(d.ops.map((o) => o[1])).toEqual(['seurat/sjk/pelaajat/p1']); expect(w).toHaveBeenCalled(); w.mockRestore();
  });
  it('muu virhe heitetään eteenpäin; ilman A-kenttiä vain pelaajadokumentti', async () => {
    await expect(S.tmSisainenKirjoita(db({ batchVirhe: new Error('verkko') }), 's', 'p', { d3_taso: 1, nimi: 'X' })).rejects.toThrow('verkko');
    await expect(S.tmSisainenKirjoita(db({ sisainenSetVirhe: new Error('verkko') }), 's', 'p', { d3_taso: 1 })).rejects.toThrow('verkko');
    const d = db(); await S.tmSisainenKirjoita(d, 's', 'p', { nimi: 'X' }); expect(d.ops.map((o) => o[1])).toEqual(['seurat/s/pelaajat/p']);
  });
});

describe('tmSisainenLataaSeura — YKSI collectionGroup-kysely', () => {
  function cg(docs, virhe) {
    const kutsut = []; return { kutsut, collectionGroup: (n) => ({ where: (k, op, v) => { kutsut.push([n, k, op, v]); return { get: () => virhe ? Promise.reject(virhe) : Promise.resolve({ forEach: (f) => docs.forEach(f) }) }; } }) };
  }
  it('where seuraId == sid; mapa pelaajan id:llä (vain doc-id tiedot)', async () => {
    const d = cg([{ id: 'tiedot', ref: { parent: { parent: { id: 'p1' } } }, data: () => ({ d3_taso: 4 }) }, { id: 'muu', ref: { parent: { parent: { id: 'p2' } } }, data: () => ({}) }]);
    const r = await S.tmSisainenLataaSeura(d, 'sjk'); expect(d.kutsut).toEqual([['sisainen', 'seuraId', '==', 'sjk']]); expect(r).toEqual({ mapa: { p1: { d3_taso: 4 } }, virhe: null });
  });
  it('virhe (Rules/indeksi ei vielä) → tyhjä mapa + virhekoodi + console.warn; lataa-ja-yhdistä palauttaa listan ennallaan', async () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = cg([], { code: 'permission-denied' }); const r = await S.tmSisainenLataaSeura(d, 's'); expect(r).toEqual({ mapa: {}, virhe: 'permission-denied' });
    expect(await S.tmSisainenLataaJaYhdista(d, 's', [{ id: 'p', d3_taso: 1 }])).toEqual([{ id: 'p', d3_taso: 1 }]); expect(w).toHaveBeenCalled(); w.mockRestore();
  });
  it('db ilman collectionGroup-tukea (vanha SDK/testitynkä) ei kaada latausta: tyhjä mapa + virhe + varapolku', async () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await S.tmSisainenLataaSeura({}, 's'); expect(r.mapa).toEqual({}); expect(r.virhe).toBeTruthy(); expect(await S.tmSisainenLataaJaYhdista({}, 's', [{ id: 'p', d3_taso: 1 }])).toEqual([{ id: 'p', d3_taso: 1 }]); w.mockRestore();
  });
  it('lataa-ja-yhdistä: sisainen voittaa listassa', async () => {
    const d = cg([{ id: 'tiedot', ref: { parent: { parent: { id: 'p' } } }, data: () => ({ d3_taso: 5 }) }]);
    expect((await S.tmSisainenLataaJaYhdista(d, 's', [{ id: 'p', d3_taso: 1 }]))[0].d3_taso).toBe(5);
  });
});
