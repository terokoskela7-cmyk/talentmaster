/* Vaihe 1 / PR 1d — scripts/migroi_sisainen_d3.js: dry-run oletuksena, idempotentti, kopioi (ei poista), ei henkilötietoja tulosteessa. Ajetaan VAIN fake-Firestorella. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const M = require('../scripts/migroi_sisainen_d3.js'), S = require('../lib/tm_sisainen.js');
const SRC = readFileSync(new URL('../scripts/migroi_sisainen_d3.js', import.meta.url), 'utf8');

const D3 = { pisteet: { focus: { valmentaja: 3, avg: 3 } }, pvm: '2026-10-10', lahteet: ['valmentaja'] };
function data() {
  return { 'seurat/sjk': {}, 'seurat/kpv': {},
    'seurat/sjk/pelaajat/a': { etunimi: 'Aatu', d3_viimeisin: D3, d3_taso: 3, d3_pvm: '2026-10-10', d3_varmuus: 'valmentaja' },
    'seurat/sjk/pelaajat/b': { etunimi: 'Bertta' },
    'seurat/sjk/pelaajat/c': { etunimi: 'Cecil', d3_taso: 2 },
    'seurat/sjk/pelaajat/c/sisainen/tiedot': { d3_taso: 4, seuraId: 'sjk' },
    'seurat/kpv/pelaajat/d': { etunimi: 'Dani', d3_vp_pvm: '2026-10-11' } };
}
describe('suunnittele (pure)', () => {
  it('kentät vastaavat lib/tm_sisainen.js d3-ryhmää', () => { expect(M.KENTAT).toEqual(S.RYHMAT.d3.kentat); });
  it('ei D3-dataa / jo siirretty / kopioi (vain puuttuvat kentät; sisainen voittaa)', () => {
    expect(M.suunnittele({ nimi: 'x' }, null, 'sjk', 'T').luokka).toBe('ei_d3');
    expect(M.suunnittele({ d3_taso: 2 }, { d3_taso: 4, seuraId: 'sjk' }, 'sjk', 'T').luokka).toBe('jo_siirretty');
    const k = M.suunnittele({ d3_taso: 2, d3_pvm: '2026-10-10' }, { d3_taso: 4, seuraId: 'sjk' }, 'sjk', 'T'); expect(k.luokka).toBe('kopioi'); expect(k.kentat).toEqual(['d3_pvm']); expect(k.data).toEqual({ seuraId: 'sjk', paivitetty: 'T', d3_pvm: '2026-10-10' });
    expect(M.suunnittele({ d3_taso: 2 }, { d3_taso: 4 }, 'sjk', 'T').luokka).toBe('kopioi');   // seuraId puuttuu → lisätään
  });
});
describe('aja', () => {
  it('DRY-RUN (oletus): ei kirjoita mitään; laskee', async () => {
    const { db, D, loki } = fakeDb(data()); const ennen = JSON.stringify([...D.entries()]); const rivit = [];
    const y = await M.aja({ db, kirjoita: false, loki: (r) => rivit.push(r) });
    expect(y).toMatchObject({ seuraa: 2, pelaajia: 4, ei_d3: 1, kopioi: 2, jo_siirretty: 1, kirjoitettu: 0 }); expect(JSON.stringify([...D.entries()])).toBe(ennen); expect(loki.commits).toBe(0);
    expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Dani|\/a\b/);   // ei nimiä eikä id:itä
  });
  it('KIRJOITUS: kopioi sisainen/tiedot:iin + seuraId; vanhat kentät JÄÄVÄT; olemassa oleva sisainen-arvo ei ylikirjoitu; toinen ajo = 0 kirjoitusta (idempotentti)', async () => {
    const { db, D } = fakeDb(data());
    const y = await M.aja({ db, kirjoita: true, nytISO: '2026-10-22T10:00:00.000Z' }); expect(y.kirjoitettu).toBe(2);
    const a = D.get('seurat/sjk/pelaajat/a/sisainen/tiedot'); expect(a).toMatchObject({ seuraId: 'sjk', d3_taso: 3, d3_varmuus: 'valmentaja' }); expect(a.d3_viimeisin).toEqual(D3);
    expect(D.get('seurat/sjk/pelaajat/a').d3_viimeisin).toEqual(D3);   // kopio, ei poisto
    expect(D.get('seurat/sjk/pelaajat/c/sisainen/tiedot').d3_taso).toBe(4);   // sisainen voitti
    expect(D.get('seurat/kpv/pelaajat/d/sisainen/tiedot')).toMatchObject({ seuraId: 'kpv', d3_vp_pvm: '2026-10-11' }); expect(D.has('seurat/sjk/pelaajat/b/sisainen/tiedot')).toBe(false);
    const y2 = await M.aja({ db, kirjoita: true }); expect(y2).toMatchObject({ kopioi: 0, kirjoitettu: 0, jo_siirretty: 3 });
  });
  it('--seura rajaa', async () => { const { db } = fakeDb(data()); expect((await M.aja({ db, seura: 'kpv' })).pelaajia).toBe(1); });
});
describe('skriptin turvallisuus', () => {
  it('dry-run oletuksena; kirjoitus vain --kirjoita + vahvistus; ADC (ei palveluavainta); require ei käynnistä ajoa', () => {
    expect(SRC).toContain("argv.includes('--kirjoita')"); expect(SRC).toContain('Kirjoita KIRJOITA vahvistukseksi'); expect(SRC).toContain('credential.applicationDefault()'); expect(SRC).not.toMatch(/serviceAccount|\.json'\)|admin\.applicationDefault/);
    expect(SRC).toContain('require.main === module');
  });
  it('kirjoittaa vain sisainen/tiedot:iin (ei poistoa, ei pelaajadokumentin kirjoitusta)', () => { expect(SRC).not.toMatch(/\.delete\(|FieldValue|\.update\(/); expect((SRC.match(/b\.set\(/g) || []).length).toBe(1); });
});
