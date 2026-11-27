/* lippu_aseta.js: projektilukko ennen Admin SDK:ta, kuiva-ajo ei kirjoita, --aja kirjoittaa julkiset + audit (callable-logiikka), vain synteettinen kuorma-seura, rekisterin lippu. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const LA = require('../scripts/kuorma/lippu_aseta.js');
const STG = 'talentmaster-staging';

function vale(seuraData, julkiset) {
  const kirj = [], audit = [], s = { exists: seuraData != null, data: () => seuraData }, j = { exists: julkiset != null, data: () => julkiset };
  const jref = { _t: 'j' }, sref = { get: async () => s, collection: () => ({ doc: () => jref }) };
  const db = {
    collection: (k) => (k === 'seurat' ? { doc: () => sref } : { doc: () => ({ _t: 'audit' }) }),
    runTransaction: async (f) => f({ get: async (r) => (r === sref ? s : j), set: (r, d) => { (r._t === 'audit' ? audit : kirj).push(d); } }),
  };
  sref.collection = () => ({ doc: () => Object.assign(jref, { get: async () => j }) });
  return { db, kirj, audit, FieldValue: { serverTimestamp: () => 'ts' }, projekti: STG };
}
const aja = async (argv, v, extra) => { const ul = [], er = []; let luotu = 0; const k = await LA.main(argv, Object.assign({ env: {}, adc: undefined, luoDb: async () => { luotu++; return v; }, kirjaa: (r) => ul.push(r), virhe: (r) => er.push(r) }, extra)); return { k, ul, er, luotu }; };
const perus = ['--projekti=' + STG, '--seura=1', '--lippu=lista_seura', '--arvo=paalle'];

describe('lippu_aseta', () => {
  it('seuraId: n ja kuorma_seura_nn → kuorma_seura_NN; muu hylätään', () => {
    expect(LA.seuraId('1')).toBe('kuorma_seura_01'); expect(LA.seuraId('kuorma_seura_02')).toBe('kuorma_seura_02');
    expect(LA.seuraId('kpv')).toBeNull(); expect(LA.seuraId('0')).toBeNull(); expect(LA.seuraId(undefined)).toBeNull();
  });
  it('tuotantoprojekti / puuttuva projekti: LUKKO ennen luoDb:tä', async () => {
    const v = vale({ synteettinen: true }, null);
    for (const p of [['--projekti=' + ['talentmaster', 'pilot'].join('-')], []]) {
      const r = await aja(p.concat(perus.slice(1)), v); expect(r.k).toBe(1); expect(r.er.join(' ')).toMatch(/LUKKO|Anna --projekti/); expect(r.luotu).toBe(0);
    }
  });
  it('virheellinen käyttö → 2: tuntematon lippu, väärä arvo, tuntematon valinta', async () => {
    const v = vale({ synteettinen: true }, null);
    expect((await aja(perus.map((x) => x.replace('lista_seura', 'ei_olemassa')), v)).k).toBe(2);
    expect((await aja(perus.map((x) => x.replace('paalle', 'kyllä')), v)).k).toBe(2);
    expect((await aja(perus.concat(['--token=x']), v)).k).toBe(2);
  });
  it('kuiva-ajo: ei kirjoita; --aja kirjoittaa julkiset.lista_seura=true + audit; toinen ajo "ei muutosta"', async () => {
    const v = vale({ synteettinen: true }, null), kuiva = await aja(perus, v);
    expect(kuiva.k).toBe(0); expect(kuiva.ul.join('\n')).toMatch(/KUIVA-AJO.*kuorma_seura_01.*lista_seura: pois \(oletus\) → päälle/); expect(v.kirj.length + v.audit.length).toBe(0);
    const kirj = await aja(perus.concat(['--aja']), v);
    expect(kirj.k).toBe(0); expect(v.kirj).toEqual([{ lista_seura: true }]);
    expect(v.audit[0]).toMatchObject({ toiminto: 'lippu_muutettu', seuraId: 'kuorma_seura_01', lippu: 'lista_seura', vanha: false, uusi: true, tekija_uid: 'skripti:kuorma_lippu_aseta' });
    const sama = await aja(perus.concat(['--aja']), vale({ synteettinen: true }, { lista_seura: true }));
    expect(sama.k).toBe(0); expect(sama.ul.join('\n')).toMatch(/Ei muutosta/);
  });
  it('ei-synteettinen tai puuttuva seura → 1, ei kirjoitusta', async () => {
    const v = vale({ nimi: 'oikea' }, null); const r = await aja(perus.concat(['--aja']), v);
    expect(r.k).toBe(1); expect(r.er.join(' ')).toMatch(/ei ole synteettinen/); expect(v.kirj.length).toBe(0);
    expect((await aja(perus, vale(null, null))).er.join(' ')).toMatch(/ei löydy/);
  });
});
