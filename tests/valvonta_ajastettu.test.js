/** Projekti 07 / PR 3: ajastettu valvonta (functions/valvonta.js): kuiva-ajo oletus, kirjoitus vain kirjaaAudit, päivittäin kevyt / viikko täysi, K3, PII, kytkentä index.js:ssä. Vale-db, ei tuotantoyhteyttä. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VA = require('../functions/valvonta.js');
const doc = (id, data, path) => ({ id, data: () => data, ref: { path: path || 'x/' + id } });
const snap = (docs) => ({ docs, size: docs.length });

/** seurat: { sid: { pelaajat:[…], toimenpiteet:[…] } }; edelliset = valvonta_ajo-rivit (uusin ensin); lisaykset = db.collection('audit').add -kutsut. */
function fakeDb(seurat, edelliset) {
  const lisaykset = [], muuKirjoitus = [];
  const db = {
    lisaykset, muuKirjoitus,
    collectionGroup: () => ({ get: async () => snap([]) }),
    collection: (n) => ({
      select: () => ({ get: async () => snap(Object.keys(seurat).map((id) => doc(id, {}))) }),
      doc: (sid) => ({ collection: (k) => ({ get: async () => snap(((seurat[sid] || {})[k] || []).map((d, i) => doc(d._id || k + i, d))) }) }),
      where: (a, b, c) => ({
        where: () => ({ orderBy: () => ({ get: async () => snap([]) }) }),   // E7: audit-estot
        orderBy: () => ({ limit: () => ({ get: async () => snap((c === 'valvonta_ajo' ? (edelliset || []) : []).map((d, i) => doc('a' + i, d))) }) })
      }),
      add: async (r) => { lisaykset.push({ kokoelma: n, rivi: r }); return { id: 'uusi' }; }
    }),
    set() { muuKirjoitus.push('set'); }, update() { muuKirjoitus.push('update'); }
  };
  return db;
}
const FV = { serverTimestamp: () => 'TS' };
const hiljainen = () => { const l = []; return { l, log: (m) => l.push(m), error: (m) => l.push('E:' + m) }; };
const tupla = [{ nimi: 'Matti Meikalainen', tunniste: '555', joukkue: 'u12' }, { nimi: 'Matti Meikalainen', tunniste: '555', joukkue: 'u12' }];

describe('valvonta ajastettu: kuiva-ajo', () => {
  it('onKuiva: kuiva ellei VALVONTA_KUIVA täsmälleen "0" (fail-safe: puuttuva = kuiva)', () => {
    expect(VA.onKuiva({})).toBe(true); expect(VA.onKuiva({ VALVONTA_KUIVA: '1' })).toBe(true); expect(VA.onKuiva({ VALVONTA_KUIVA: '' })).toBe(true); expect(VA.onKuiva({ VALVONTA_KUIVA: '0' })).toBe(false);
  });
  it('kuiva: ei kirjoitusta lainkaan (ei audit.add), vain loki; tulos sisältää raportin', async () => {
    const db = fakeDb({ s1: { pelaajat: tupla } }), loki = hiljainen();
    const r = await VA.aja({ db, FieldValue: FV, loki, env: { VALVONTA_KUIVA: '1' }, nytMs: 1e12 }, 'viikko');
    expect(r.kuiva).toBe(true); expect(r.kirjattu).toBe(false); expect(db.lisaykset).toEqual([]); expect(db.muuKirjoitus).toEqual([]);
    expect(loki.l.join('\n')).toMatch(/valvonta viikko KUIVA valmis/); expect(loki.l.join('\n')).toMatch(/ERROR E6 · s1 · pelaajat/);
  });
  it('ei env-muuttujaa → kuiva (oletus)', async () => {
    const db = fakeDb({ s1: { pelaajat: tupla } }); const r = await VA.aja({ db, FieldValue: FV, loki: hiljainen(), env: {} }, 'paivittain');
    expect(r.kuiva).toBe(true); expect(db.lisaykset).toEqual([]);
  });
});

describe('valvonta ajastettu: kirjoitus (VALVONTA_KUIVA=0)', () => {
  it('kirjaa täsmälleen yhden audit-rivin (toiminto valvonta_ajo, aikaleima, lähde); ei muita kirjoituksia; vain seura/koodi/kokoelma/lukumäärä', async () => {
    const db = fakeDb({ s1: { pelaajat: tupla } });
    const r = await VA.aja({ db, FieldValue: FV, loki: hiljainen(), env: { VALVONTA_KUIVA: '0' }, nytMs: 1e12 }, 'paivittain');
    expect(r.kirjattu).toBe(true); expect(db.lisaykset.length).toBe(1); expect(db.muuKirjoitus).toEqual([]);
    const { kokoelma, rivi } = db.lisaykset[0];
    expect(kokoelma).toBe('audit'); expect(rivi).toMatchObject({ toiminto: 'valvonta_ajo', severity: 'alert', tyyppi: 'paivittain', lahde: 'valvonta', aikaleima: 'TS' }); expect(rivi.virheita).toBeGreaterThanOrEqual(1);
    expect(rivi.rivit).toContainEqual({ s: 's1', k: 'E6', c: 'pelaajat', n: 2, e: 0, t: 'virhe' });
    ['Meikalainen', '555', 'u12'].forEach((x) => expect(JSON.stringify(rivi)).not.toContain(x));
  });
  it('päivittäin = kevyt (vain E1–E7), viikko = täysi (myös M1/K1 jne.)', async () => {
    const s = { s1: { pelaajat: tupla, toimenpiteet: [] } };
    const p = await VA.aja({ db: fakeDb(s), FieldValue: FV, loki: hiljainen(), env: {} }, 'paivittain'), v = await VA.aja({ db: fakeDb(s), FieldValue: FV, loki: hiljainen(), env: {} }, 'viikko');
    expect(p.raportti.rivit.every((r) => /^E[1-7]/.test(r.koodi))).toBe(true);
    expect(v.raportti.rivit.some((r) => /^M1/.test(r.koodi))).toBe(true);
    expect(VA.suodataTyypille([{ koodi: 'E6' }, { koodi: 'M1' }, { koodi: 'H1' }, { koodi: 'E1b' }], 'paivittain').map((t) => t.koodi)).toEqual(['E6', 'E1b']);
  });
  it('edellinen ajo luetaan: sama virhe → muutos "sama" (ei uusi); samaa tyyppiä vain', async () => {
    const ed = [{ toiminto: 'valvonta_ajo', tyyppi: 'viikko', rivit: [{ s: 's1', k: 'E6', c: 'pelaajat', n: 2 }] }, { tyyppi: 'paivittain', rivit: [] }];
    const r = await VA.aja({ db: fakeDb({ s1: { pelaajat: tupla } }, ed), FieldValue: FV, loki: hiljainen(), env: {} }, 'viikko');
    expect(r.raportti.rivit.find((x) => x.koodi === 'E6')).toMatchObject({ edellinen: 2, muutos: 'sama' });
  });
  it('demo-seurat ohitetaan (P10); lukuvirhe yhdessä seurassa ei kaada ajoa', async () => {
    const r = await VA.aja({ db: fakeDb({ demo: { pelaajat: tupla }, s1: { pelaajat: [] } }), FieldValue: FV, loki: hiljainen(), env: {} }, 'viikko');
    expect(r.raportti.rivit.some((x) => x.seura === 'demo')).toBe(false);
  });
  it('virhe ajossa: loki saa vain koodin; käsittelijä heittää eteenpäin', async () => {
    const loki = hiljainen(), db = { collection: () => { throw Object.assign(new Error('polku seurat/x Matti'), { code: 'unavailable' }); } };
    await expect(VA.ajastettuKasittelija({ db, FieldValue: FV, loki }, 'viikko')()).rejects.toThrow();
    expect(loki.l.join('\n')).toContain('koodi=unavailable'); expect(loki.l.join('\n')).not.toMatch(/Matti|seurat\/x/);
  });
});

describe('valvonta ajastettu: K3 (viikkokasvu)', () => {
  const nyt = { s1: { toimenpiteet: 200, seuranta_kuittaukset: 10 } };
  it('kasvu ≥ 50 ja > 2 × edellinen kasvu → varoitus; pieni kasvu ok; ei edellistä → ei rivejä', () => {
    expect(VA.k3Tulokset(nyt, { s1: { toimenpiteet: 100, seuranta_kuittaukset: 9 } }, { s1: { toimenpiteet: 90 } })).toEqual([{ seura: 's1', koodi: 'K3', kokoelma: 'toimenpiteet', lkm: 100, taso: 'varoitus' }]);
    expect(VA.k3Tulokset(nyt, { s1: { toimenpiteet: 100 } }, { s1: { toimenpiteet: 0 } })).toEqual([]);   // edellinen kasvu 100 → 100 ei > 2×100
    expect(VA.k3Tulokset(nyt, null, null)).toEqual([]);
  });
  it('viikkoajo kirjaa kasvu-luvut (seura → kokoelma → lukumäärä) ja tuottaa K3-rivin edellisistä viikkoajoista', async () => {
    const tp = Array.from({ length: 160 }, (_, i) => ({ _id: 't' + i, joukkue: 'u12' }));
    const ed = [{ tyyppi: 'viikko', rivit: [], kasvu: { s1: { toimenpiteet: 100 } } }, { tyyppi: 'viikko', rivit: [], kasvu: { s1: { toimenpiteet: 95 } } }];
    const db = fakeDb({ s1: { toimenpiteet: tp } }, ed);
    const r = await VA.aja({ db, FieldValue: FV, loki: hiljainen(), env: { VALVONTA_KUIVA: '0' } }, 'viikko');
    expect(db.lisaykset[0].rivi.kasvu.s1.toimenpiteet).toBe(160); expect(r.raportti.rivit).toContainEqual(expect.objectContaining({ koodi: 'K3', seura: 's1', kokoelma: 'toimenpiteet', taso: 'varoitus', lkm: 60 }));
  });
});

describe('valvonta ajastettu: rakenne', () => {
  const idx = readFileSync(join(ROOT, 'functions/index.js'), 'utf8'), src = readFileSync(join(ROOT, 'functions/valvonta.js'), 'utf8');
  it('index.js: kaksi ajastusta (päivittäin 05:30, viikko ma 05:00, Europe/Helsinki, europe-west1), kytkentä moduuliin', () => {
    expect(idx).toMatch(/exports\.valvontaPaivittain = functions\.region\('europe-west1'\).*schedule\('30 5 \* \* \*'\)\.timeZone\('Europe\/Helsinki'\).*ajastettuKasittelija\(.*'paivittain'\)/);
    expect(idx).toMatch(/exports\.valvontaViikko = functions\.region\('europe-west1'\).*schedule\('0 5 \* \* 1'\)\.timeZone\('Europe\/Helsinki'\).*ajastettuKasittelija\(.*'viikko'\)/);
  });
  it('vain yksi kirjoituskutsu (audit.add kirjaaAudit-funktiossa), ei Rules-/muuta kirjoitusta; ei sähköpostia tässä PR:ssä', () => {
    expect((src.match(/\.add\(/g) || []).length).toBe(1); expect(src).not.toMatch(/\.(set|update|delete|batch|runTransaction)\(|sendgrid|nodemailer/i);
    expect(src).toContain("collection('audit').add(");
  });
});
