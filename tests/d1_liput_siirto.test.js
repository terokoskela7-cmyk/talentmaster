/* D1 PR 2 (Rules v3.78): liput vain SA:lle + scripts/liput_siirra_julkisiin.js (vanha seura-dokin liput → liput/julkiset, tehokas arvo ei muutu). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const M = require('../scripts/liput_siirra_julkisiin.js'), L = require('../lib/tm_liput.js'), N = require('../lib/tm_audit_nimet.js');
const R = readFileSync(new URL('../tm_admin/firestore.rules', import.meta.url), 'utf8');

/* Vale-Firestore: seurat/{sid} + seurat/{sid}/liput/julkiset + audit; batch kerää ja toteuttaa kirjoitukset. */
function valeDb(seurat, julkiset) {
  const audit = [], J = JSON.parse(JSON.stringify(julkiset || {}));
  const jref = (sid) => ({ _j: sid, get: async () => ({ exists: !!J[sid], data: () => J[sid] }) });
  const sref = (sid) => ({ get: async () => ({ exists: !!seurat[sid], data: () => seurat[sid] }), collection: () => ({ doc: () => jref(sid) }) });
  return { audit, J,
    collection: (c) => c === 'audit' ? { doc: () => ({ _audit: true }) } : { doc: sref, get: async () => ({ forEach: (f) => Object.keys(seurat).forEach((id) => f({ id })) }) },
    batch: () => { const ops = []; return { set: (r, d, o) => ops.push([r, d, o]), commit: async () => ops.forEach(([r, d]) => { if (r._audit) audit.push(d); else J[r._j] = Object.assign({}, J[r._j], d); }) }; } };
}
const FV = { serverTimestamp: () => 'TS' }, hiljaa = () => {};

describe('suunnittele (puhdas)', () => {
  it('vain rekisterin liput ilman julkiset-booleania; arvo = tehokas (vain true = päällä); tuntemattomat listataan', () => {
    const p = M.suunnittele({ liput: { kentta: true, klippi_oma_video: 'true', valmentaja_v2: false, kehitystyopoyta_v2: true, outo: true } }, { kehitystyopoyta_v2: false });
    expect(p.siirrettavat).toEqual([{ avain: 'kentta', arvo: true, vanha_raaka: true }, { avain: 'klippi_oma_video', arvo: false, vanha_raaka: 'true' }, { avain: 'valmentaja_v2', arvo: false, vanha_raaka: false }]);
    expect(p.tuntemattomat).toEqual(['outo']);
    expect(M.suunnittele({}, null)).toEqual({ siirrettavat: [], tuntemattomat: [] }); expect(M.suunnittele({ liput: null }, null).siirrettavat).toEqual([]);
  });
  it('tehokas arvo ei muutu kenelläkään siirron jälkeen', () => {
    const seura = { liput: { kentta: true, klippi_oma_video: 'true', valmentaja_v2: false } }, jul = {};
    const ennen = L.LIPUT.map((l) => L.tmLippuTila(l.avain, jul, seura).arvo);
    M.suunnittele(seura, jul).siirrettavat.forEach((x) => { jul[x.avain] = x.arvo; });
    expect(L.LIPUT.map((l) => L.tmLippuTila(l.avain, jul, seura).arvo)).toEqual(ennen);
    expect(L.LIPUT.map((l) => L.tmLippuTila(l.avain, jul, {}).arvo)).toEqual(ennen);   // vanhan kentän voi myöhemmin poistaa ilman muutosta
  });
});

describe('aja', () => {
  const seurat = { kpv: { liput: { kentta: true, klippi_oma_video: true } }, sjk: { liput: { kentta: true } }, tyhja: {} };
  it('kuiva-ajo ei kirjoita mitään', async () => {
    const db = valeDb(seurat, { sjk: { kentta: false } }); const t = await M.aja({ db, FieldValue: FV, kirjoita: false, loki: hiljaa });
    expect(t).toMatchObject({ seuroja: 3, siirretty: 0, virheita: 0 }); expect(db.audit).toEqual([]); expect(db.J).toEqual({ sjk: { kentta: false } });
  });
  it('--kirjoita: julkiset + audit-rivi lipuittain; olemassa olevaa julkiset-arvoa ei kosketa; idempotentti', async () => {
    const db = valeDb(seurat, { sjk: { kentta: false } }); const t = await M.aja({ db, FieldValue: FV, kirjoita: true, loki: hiljaa });
    expect(t).toMatchObject({ siirretty: 1, lippuja: 2, virheita: 0 });
    expect(db.J).toEqual({ kpv: { kentta: true, klippi_oma_video: true }, sjk: { kentta: false } });
    expect(db.audit).toEqual(['kentta', 'klippi_oma_video'].map((lippu) => ({ toiminto: 'lippu_muutettu', severity: 'info', seuraId: 'kpv', lippu, vanha: true, uusi: true, lahde_vanha: 'vanha', tapa: 'migraatio', tekija_uid: M.TEKIJA, aikaleima: 'TS' })));
    const t2 = await M.aja({ db, FieldValue: FV, kirjoita: true, loki: hiljaa }); expect(t2).toMatchObject({ siirretty: 0, lippuja: 0 }); expect(db.audit).toHaveLength(2);
  });
  it('--seura rajaa yhteen seuraan; virheellinen --seura hylätään', async () => {
    const db = valeDb(seurat, {}); await M.aja({ db, FieldValue: FV, seura: 'sjk', kirjoita: true, loki: hiljaa }); expect(Object.keys(db.J)).toEqual(['sjk']);
    expect(M.lueArgit(['--seura', 'kpv', '--kirjoita'])).toEqual({ seura: 'kpv', kirjoita: true }); expect(M.lueArgit([])).toEqual({ seura: null, kirjoita: false });
    for (const a of [['--seura'], ['--seura', '--kirjoita'], ['--seura', 'a/b']]) expect(() => M.lueArgit(a)).toThrow(/Käyttö/);
  });
  it('audit-toiminnolla on nimi (Audit-loki)', () => { expect(N.NIMET.lippu_muutettu).toBe('Seuran lippu muutettu'); });
});

describe('Rules v3.78 (lähdetaso; emulaattoritesti tests/rules/firestore.rules.test.js)', () => {
  it('versio + changelog; liput/{id} kirjoitus vain SA; seura-dokin liput-kenttä pois johdolta', () => {
    expect(R).toMatch(/firestore\.rules v3\.(78|79)/); expect(R).toContain('Muutokset v3.77 → v3.78 (D1');
    expect(R).toMatch(/match \/liput\/\{lippuId\} \{\s*allow read:\s+if onLiputLuku\(seuraId\);\s*allow create, update, delete: if onSuperAdmin\(\);\s*\}/);
    expect(R).toContain("!('laskutus_sopimus' in request.resource.data) && !('liput' in request.resource.data)");
    expect(R).toContain("affectedKeys().hasAny(['laskutus_sopimus', 'liput'])");
  });
});
