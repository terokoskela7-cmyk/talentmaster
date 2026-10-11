/* K35-4 · scripts/lataa_viikkopohjat.js — kuiva-ajo ei kirjoita, seuran pohjat säilyvät, vain 'demo', pelimuotoa ei ylikirjoiteta (mock-Firestore). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../scripts/lataa_viikkopohjat.js'), V = require('../lib/tm_viikkopohja.js');
const JSONI = JSON.parse(readFileSync(new URL('../docs/data/spl_viikkopohjat_2023.json', import.meta.url), 'utf8'));
const NYT = new Date('2026-10-11T12:00:00Z');

function mockDb({ viikkopohjat, joukkueet }) {
  const kirjoitukset = [];
  const snap = (obj) => { const rows = Object.keys(obj || {}).map((id) => ({ id, data: () => obj[id] })); return { forEach: (f) => rows.forEach(f) }; };
  const db = { kirjoitukset, collection: (c) => ({ doc: (sid) => ({ collection: (c2) => c2 === 'joukkueet' ? { get: async () => snap(joukkueet), doc: (jid) => ({ update: async (d) => { kirjoitukset.push(['update', c + '/' + sid + '/joukkueet/' + jid, d]); } }) } : ({ doc: (did) => ({ get: async () => ({ exists: !!viikkopohjat, data: () => viikkopohjat }), set: async (d, o) => { kirjoitukset.push(['set', c + '/' + sid + '/' + c2 + '/' + did, d, o]); } }) }) }) }) };
  return db;
}
const J = () => ({ demo_u13: {}, demo_u15: {}, demo_u17: {} });
const aja = (db, o) => S.aja(Object.assign({ db, seura: 'demo', json: JSONI, nyt: NYT, loki: () => {} }, o));

describe('K35-4 lataa_viikkopohjat', () => {
  it('kuiva-ajo (oletus) ei kirjoita mitään, mutta suunnittelee 6 pohjaa ja 3 pelimuotoa', async () => {
    const db = mockDb({ viikkopohjat: null, joukkueet: J() }), p = await aja(db, {}); expect(db.kirjoitukset).toEqual([]); expect(p.doc.pohjat.length).toBe(6); expect(p.pelimuodot).toEqual([{ id: 'demo_u13', pelimuoto: '8v8' }, { id: 'demo_u15', pelimuoto: '11v11' }, { id: 'demo_u17', pelimuoto: '11v11' }]);
  });
  it('--kirjoita: viikkopohjat-dokki { pohjat, paivitetty, lahde } + pelimuodot joukkueille; ei muuta polkua kuin seurat/demo/', async () => {
    const db = mockDb({ viikkopohjat: null, joukkueet: J() }); await aja(db, { kirjoita: true });
    const set = db.kirjoitukset.find((k) => k[0] === 'set'); expect(set[1]).toBe('seurat/demo/valmennuslinja/viikkopohjat'); expect(set[2].lahde).toBe('palloliitto_2023'); expect(set[2].paivitetty).toBe(NYT); expect(set[2].pohjat.map((x) => x.avain)).toEqual(V.tmPalloliitonPohjat(JSONI).map((x) => x.avain)); expect(JSON.stringify(set[2])).not.toContain('undefined');
    expect(db.kirjoitukset.filter((k) => k[0] === 'update').map((k) => [k[1], k[2]])).toEqual([['seurat/demo/joukkueet/demo_u13', { pelimuoto: '8v8' }], ['seurat/demo/joukkueet/demo_u15', { pelimuoto: '11v11' }], ['seurat/demo/joukkueet/demo_u17', { pelimuoto: '11v11' }]]);
    db.kirjoitukset.forEach((k) => expect(k[1].startsWith('seurat/demo/')).toBe(true));
  });
  it('seuran omat pohjat (lahde:seura) säilyvät; Palloliiton pohjat jäävät ilman --korvaa, korvautuvat --korvaa:lla', async () => {
    const oma = { avain: 'seura_8v8', nimi: 'Oma', pelimuoto: '8v8', ikavaihe: 'lapsuus', lahde: 'seura', paivat: [{ md: -2, viikonpaiva_oletus: 4, kesto_min: 60, pelimuoto: '8v8' }], peli: { maara: 1, teksti: '' } }, vanhaPl = Object.assign({}, V.tmPalloliitonPohjat(JSONI)[1], { nimi: 'MUOKATTU' });
    const nyk = { pohjat: [oma, vanhaPl] };
    let db = mockDb({ viikkopohjat: nyk, joukkueet: J() }); let p = await aja(db, { kirjoita: true }); let avaimet = p.doc.pohjat.map((x) => x.avain);
    expect(avaimet[0]).toBe('seura_8v8'); expect(p.doc.pohjat.length).toBe(6 + 1); expect(p.doc.pohjat.find((x) => x.avain === vanhaPl.avain).nimi).toBe('MUOKATTU'); expect(p.sailytetty).toEqual([vanhaPl.avain]); expect(p.lisatty.length).toBe(5);
    db = mockDb({ viikkopohjat: nyk, joukkueet: J() }); p = await aja(db, { kirjoita: true, korvaa: true }); expect(p.doc.pohjat[0]).toEqual(oma); expect(p.doc.pohjat.length).toBe(7); expect(p.doc.pohjat.find((x) => x.avain === vanhaPl.avain).nimi).not.toBe('MUOKATTU'); expect(p.sailytetty).toEqual([]);
  });
  it('--seura kpv (tai mikä tahansa muu kuin demo) keskeytyy eikä koske tietokantaan', async () => {
    for (const s of ['kpv', 'sibbovargarna', 'sjk', 'Demo', '']) { const db = mockDb({ viikkopohjat: null, joukkueet: J() }); await expect(aja(db, { seura: s, kirjoita: true })).rejects.toThrow(/ei sallittu/); expect(db.kirjoitukset).toEqual([]); }
    expect(() => S.tarkistaSeura('demo')).not.toThrow();
  });
  it('olemassa olevaa pelimuotoa ei ylikirjoiteta; puuttuvaa joukkuetta ei luoda', async () => {
    const db = mockDb({ viikkopohjat: null, joukkueet: { demo_u13: { pelimuoto: '5v5' }, demo_u15: {}, demo_u17: { pelimuoto: '' } } }); const p = await aja(db, { kirjoita: true });
    expect(p.pelimuodot.map((x) => x.id)).toEqual(['demo_u15', 'demo_u17']); expect(p.ohitetut).toEqual([{ id: 'demo_u13', syy: 'pelimuoto jo asetettu (5v5)' }]); expect(db.kirjoitukset.filter((k) => k[0] === 'update').map((k) => k[1])).toEqual(['seurat/demo/joukkueet/demo_u15', 'seurat/demo/joukkueet/demo_u17']);
    const p2 = S.suunnittele({ nykyinen: null, joukkueet: [{ id: 'demo_u13' }], json: JSONI, nyt: NYT }); expect(p2.ohitetut.map((x) => x.id)).toEqual(['demo_u15', 'demo_u17']); expect(p2.pelimuodot).toEqual([{ id: 'demo_u13', pelimuoto: '8v8' }]);
  });
  it('rikkinäinen pohja-JSON keskeyttää ennen kirjoitusta; pelimuodot ovat sallittuja arvoja (D173); Rulesia ei muuteta', async () => {
    const huono = JSON.parse(JSON.stringify(JSONI)); huono.pohjat[0].pelimuoto = '9v9'; const db = mockDb({ viikkopohjat: null, joukkueet: J() }); await expect(aja(db, { json: huono, kirjoita: true })).rejects.toThrow(/eivät kelpaa/); expect(db.kirjoitukset).toEqual([]);
    Object.values(S.DEMO_PELIMUODOT).forEach((m) => expect(V.PELIMUODOT).toContain(m));
  });
});
