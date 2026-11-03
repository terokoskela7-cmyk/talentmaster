/* Laskutus L1a — scripts/laskutus_alkutila.js (briiffi §6 + "2014 Blå"). Kuiva-ajo oletuksena, ei "kaikki aktiivisiksi", aktivointi ei muutu. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const S = require('../scripts/laskutus_alkutila.js');
const LISTA = JSON.parse(readFileSync('scripts/laskutus_alkutila_sibbo.json', 'utf8'));
const SIBBO = ['p8', 'p9', 'p10', 'p12', 'p13', 't10', 't12', '2014_bl', '2014_rod'].map((x) => ({ id: 'sibbovargarna_' + x, nimi: x.toUpperCase() }));

function mockDb(joukkueet, seura) {
  const kirj = [];
  const b = { set: (ref, d, o) => kirj.push({ op: 'set', p: ref.p, d, o }), update: (ref, d) => kirj.push({ op: 'update', p: ref.p, d }), commit: async () => { kirj.push({ op: 'commit' }); } };
  return { kirj, batch: () => b,
    collection: (c) => ({ doc: (id) => ({ p: c + '/' + id, get: async () => ({ exists: !!seura, data: () => seura }), collection: (c2) => ({ get: async () => ({ docs: joukkueet.map((j) => ({ id: j.id, data: () => j })) }), doc: (jid) => ({ p: c + '/' + id + '/' + c2 + '/' + jid }) }) }) }) };
}

describe('suunnitelma', () => {
  it('Sibbon lista: 5 aktiivista, muut passiivisia, 2014 Blå ohitus; ensimmäinen aktivointi 2026-11-01', () => {
    const p = S.suunnittele(LISTA, SIBBO, '2026-11-03');
    expect(p.virheet).toEqual([]); expect(p.yhteenveto).toMatchObject({ aktiivisia: 5, passiivisia: 4 });
    const m = Object.fromEntries(p.muutokset.map((x) => [x.id, x.u]));
    expect(m.sibbovargarna_2014_bl).toEqual({ laskutustila: 'aktiivinen', laskutustila_muutettu: { pvm: '2026-11-03', uid: S.UID }, laskutus_aktivoitu: { pvm: '2026-11-01', uid: S.UID }, laskutus_vastuuvalmentaja_ok: true });
    expect(m.sibbovargarna_p13).toEqual({ laskutustila: 'passiivinen', laskutustila_muutettu: { pvm: '2026-11-03', uid: S.UID } });
    expect(m.sibbovargarna_p10).not.toHaveProperty('laskutus_vastuuvalmentaja_ok');
    expect(LISTA.asetukset).toEqual({ laskutettava: true, sopimus_alkaen: '2026-11', laskentaperuste: 'suostumus' });
  });
  it('olemassa oleva laskutus_aktivoitu ei muutu; jo oikeassa tilassa → ennallaan; demo ohitetaan', () => {
    const j = SIBBO.map((x) => Object.assign({}, x)); j[2].laskutustila = 'aktiivinen'; j[2].laskutus_aktivoitu = { pvm: '2026-10-15' }; j.push({ id: 'demo_x', demo: true });
    const p = S.suunnittele(LISTA, j, '2026-11-03');
    expect(p.ennallaan.map((x) => x.id)).toContain('sibbovargarna_p10'); expect(p.muutokset.find((x) => x.id === 'sibbovargarna_p10')).toBeUndefined();
    expect(p.yhteenveto.ohitettu_demo).toBe(1); expect(p.muutokset.map((x) => x.id)).not.toContain('demo_x');
  });
  it('hylkää: tuntematon joukkue, puuttuva lista, puuttuva päivä, virheellinen asetus, ohitus passiiviselle', () => {
    expect(S.suunnittele(Object.assign({}, LISTA, { aktiiviset: ['ei_ole'] }), SIBBO, 'x').virheet.join()).toMatch(/tuntematon joukkue: ei_ole/);
    expect(S.suunnittele({ seuraId: 's', asetukset: {} }, SIBBO, 'x').virheet.join()).toMatch(/ei oletusta "kaikki aktiivisiksi"/);
    expect(S.suunnittele(Object.assign({}, LISTA, { aktivoitu: undefined }), SIBBO, 'x').virheet.join()).toMatch(/aktivointipäivä/);
    expect(S.suunnittele(Object.assign({}, LISTA, { asetukset: { laskutettava: true } }), SIBBO, 'x').virheet.join()).toMatch(/sopimus_alkaen/);
    expect(S.suunnittele(Object.assign({}, LISTA, { asetukset: Object.assign({}, LISTA.asetukset, { hinta: 1 }) }), SIBBO, 'x').virheet.join()).toMatch(/tuntematon asetus: hinta/);
    expect(S.suunnittele(Object.assign({}, LISTA, { vastuuvalmentaja_ok: ['sibbovargarna_p13'] }), SIBBO, 'x').virheet.join()).toMatch(/vain aktiiviselle/);
  });
});

describe('ajo', () => {
  const ajo = (o) => { const db = mockDb(SIBBO), loki = []; return S.aja(Object.assign({ db, lista: LISTA, loki: (x) => loki.push(x), tanaan: '2026-11-03' }, o)).then((r) => ({ r, db, loki })); };
  it('kuiva-ajo oletuksena: ei kirjoituksia', async () => { const { r, db, loki } = await ajo({}); expect(r.kirjoitettu).toBe(false); expect(db.kirj).toEqual([]); expect(loki.join('\n')).toContain('Kuiva-ajo'); });
  it('--kirjoita ilman KIRJOITA-vahvistusta → peruttu', async () => { const { r, db } = await ajo({ kirjoita: true, kysy: async () => 'kyllä' }); expect(r.kirjoitettu).toBe(false); expect(db.kirj).toEqual([]); });
  it('--kirjoita + KIRJOITA → yksi batch: asetukset merge + joukkueupdatet, ei käyttäjiä eikä pelaajia', async () => {
    const { r, db } = await ajo({ kirjoita: true, kysy: async () => 'KIRJOITA' });
    expect(r.kirjoitettu).toBe(true); expect(db.kirj[0]).toMatchObject({ op: 'set', p: 'laskutus_asetukset/sibbovargarna', o: { merge: true } });
    expect(db.kirj.filter((x) => x.op === 'update')).toHaveLength(SIBBO.length); expect(db.kirj.at(-1)).toEqual({ op: 'commit' });
    expect(db.kirj.every((x) => !x.p || /^laskutus_asetukset\/|^seurat\/sibbovargarna(\/joukkueet\/|$)/.test(x.p))).toBe(true);
  });
  it('L1c: peili seurat/{sid}.laskutus_sopimus samassa erässä (merge, vain tämä kenttä); kuiva-ajo näyttää muutoksen', async () => {
    const { db } = await ajo({ kirjoita: true, kylla: true });
    expect(db.kirj.filter((x) => x.p === 'seurat/sibbovargarna')).toEqual([{ op: 'set', p: 'seurat/sibbovargarna', d: { laskutus_sopimus: true }, o: { merge: true } }]);
    expect(db.kirj.filter((x) => x.op === 'commit')).toHaveLength(1);
    const k = await ajo({}); expect(k.loki.join('\n')).toContain('laskutus_sopimus: (puuttuu) → true'); expect(k.db.kirj).toEqual([]);
    const pilotti = S.suunnittele(Object.assign({}, LISTA, { asetukset: Object.assign({}, LISTA.asetukset, { laskutettava: false }) }), SIBBO, 'x');
    expect(pilotti.laskutus_sopimus).toBe(false);
  });
  it('virheellinen lista → heittää, ei kirjoituksia', async () => {
    const db = mockDb(SIBBO); await expect(S.aja({ db, lista: Object.assign({}, LISTA, { aktiiviset: ['x'] }), loki: () => {}, kirjoita: true, kylla: true, tanaan: 'x' })).rejects.toThrow(/mitään ei kirjoitettu/); expect(db.kirj).toEqual([]);
  });
  it('lähde: ADC, ei palvelutiliavainta', () => { const s = readFileSync('scripts/laskutus_alkutila.js', 'utf8'); expect(s).toContain('applicationDefault()'); expect(s).not.toMatch(/serviceAccount|\.json'\)\s*\)/); });
});
