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
const AJO = Date.parse('2026-11-17T03:30:00Z');   // kirjoitusjakso
const FV = { serverTimestamp: () => 'TS' };
const hiljainen = () => { const l = []; return { l, log: (m) => l.push(m), error: (m) => l.push('E:' + m) }; };
const tupla = [{ nimi: 'Matti Meikalainen', tunniste: '555', joukkue: 'u12' }, { nimi: 'Matti Meikalainen', tunniste: '555', joukkue: 'u12' }];

describe('valvonta ajastettu: kuiva-ajo', () => {
  // Helsingin 17.11.2026 00:00 (EET, UTC+2) = 2026-11-16T22:00:00Z: UTC-päivä on vielä 16.11., Helsingin päivä jo 17.11.
  const RAJA = Date.parse('2026-11-16T22:00:00Z');
  it('alkupäivä on koodivakio 2026-11-17 (Helsingin päivä)', () => { expect(VA.VALVONTA_KIRJOITUS_ALKAA).toBe('2026-11-17'); });
  it('rajan molemmat puolet: 16.11. (myös 23:59 Helsingin aikaa) kuiva, 17.11. 00:00 ja sen jälkeen kirjoittaa', () => {
    expect(VA.onKuiva(Date.parse('2026-11-16T09:00:00Z'))).toBe(true);
    expect(VA.onKuiva(RAJA - 1)).toBe(true); expect(VA.helsinginPaiva(RAJA - 1)).toBe('2026-11-16');
    expect(VA.onKuiva(RAJA)).toBe(false); expect(VA.helsinginPaiva(RAJA)).toBe('2026-11-17');
    expect(VA.onKuiva(Date.parse('2026-11-17T03:30:00Z'))).toBe(false); expect(VA.onKuiva(Date.parse('2027-03-01T00:00:00Z'))).toBe(false);
  });
  it('kesäaika: 2027-06-01 kirjoittaa; ei riipu ympäristömuuttujasta', () => { process.env.VALVONTA_KUIVA = '1'; expect(VA.onKuiva(Date.parse('2027-06-01T03:00:00Z'))).toBe(false); delete process.env.VALVONTA_KUIVA; });
  it('kuiva: ei kirjoitusta lainkaan (ei audit.add), vain loki; tulos sisältää raportin', async () => {
    const db = fakeDb({ s1: { pelaajat: tupla } }), loki = hiljainen();
    const r = await VA.aja({ db, FieldValue: FV, loki, nytMs: Date.parse('2026-11-16T09:00:00Z') }, 'viikko');
    expect(r.kuiva).toBe(true); expect(r.kirjattu).toBe(false); expect(db.lisaykset).toEqual([]); expect(db.muuKirjoitus).toEqual([]);
    expect(loki.l.join('\n')).toMatch(/valvonta viikko KUIVA valmis/); expect(loki.l.join('\n')).toMatch(/ERROR E6 · s1 · pelaajat/);
  });
  it('16.11. ajo (päivittäin) on kuiva ja 17.11. ajo kirjoittaa täsmälleen yhden rivin — sama data', async () => {
    const k = fakeDb({ s1: { pelaajat: tupla } }), v = fakeDb({ s1: { pelaajat: tupla } });
    const r1 = await VA.aja({ db: k, FieldValue: FV, loki: hiljainen(), nytMs: Date.parse('2026-11-16T21:59:00Z') }, 'paivittain');
    const r2 = await VA.aja({ db: v, FieldValue: FV, loki: hiljainen(), nytMs: Date.parse('2026-11-16T22:00:00Z') }, 'paivittain');
    expect(r1.kuiva).toBe(true); expect(k.lisaykset).toEqual([]); expect(r2.kuiva).toBe(false); expect(v.lisaykset.length).toBe(1);
  });
});

describe('valvonta ajastettu: kirjoitus (alkupäivästä 17.11.2026)', () => {
  it('kirjaa täsmälleen yhden audit-rivin (toiminto valvonta_ajo, aikaleima, lähde); ei muita kirjoituksia; vain seura/koodi/kokoelma/lukumäärä', async () => {
    const db = fakeDb({ s1: { pelaajat: tupla } });
    const r = await VA.aja({ db, FieldValue: FV, loki: hiljainen(), nytMs: AJO }, 'paivittain');
    expect(r.kirjattu).toBe(true); expect(db.lisaykset.length).toBe(1); expect(db.muuKirjoitus).toEqual([]);
    const { kokoelma, rivi } = db.lisaykset[0];
    expect(kokoelma).toBe('audit'); expect(rivi).toMatchObject({ toiminto: 'valvonta_ajo', severity: 'alert', tyyppi: 'paivittain', lahde: 'valvonta', aikaleima: 'TS' }); expect(rivi.virheita).toBeGreaterThanOrEqual(1);
    expect(rivi.rivit).toContainEqual({ s: 's1', k: 'E6', c: 'pelaajat', n: 2, e: 0, t: 'virhe' });
    ['Meikalainen', '555', 'u12'].forEach((x) => expect(JSON.stringify(rivi)).not.toContain(x));
  });
  it('päivittäin = kevyt (vain E1–E7), viikko = täysi (myös M1/K1 jne.)', async () => {
    const s = { s1: { pelaajat: tupla, toimenpiteet: [] } };
    const p = await VA.aja({ db: fakeDb(s), FieldValue: FV, loki: hiljainen(), nytMs: AJO }, 'paivittain'), v = await VA.aja({ db: fakeDb(s), FieldValue: FV, loki: hiljainen(), nytMs: AJO }, 'viikko');
    expect(p.raportti.rivit.every((r) => /^E[1-7]/.test(r.koodi))).toBe(true);
    expect(v.raportti.rivit.some((r) => /^M1/.test(r.koodi))).toBe(true);
    expect(VA.suodataTyypille([{ koodi: 'E6' }, { koodi: 'M1' }, { koodi: 'H1' }, { koodi: 'E1b' }], 'paivittain').map((t) => t.koodi)).toEqual(['E6', 'E1b']);
  });
  it('edellinen ajo luetaan: sama virhe → muutos "sama" (ei uusi); samaa tyyppiä vain', async () => {
    const ed = [{ toiminto: 'valvonta_ajo', tyyppi: 'viikko', rivit: [{ s: 's1', k: 'E6', c: 'pelaajat', n: 2 }] }, { tyyppi: 'paivittain', rivit: [] }];
    const r = await VA.aja({ db: fakeDb({ s1: { pelaajat: tupla } }, ed), FieldValue: FV, loki: hiljainen(), nytMs: AJO }, 'viikko');
    expect(r.raportti.rivit.find((x) => x.koodi === 'E6')).toMatchObject({ edellinen: 2, muutos: 'sama' });
  });
  it('demo-seurat ohitetaan (P10); lukuvirhe yhdessä seurassa ei kaada ajoa', async () => {
    const r = await VA.aja({ db: fakeDb({ demo: { pelaajat: tupla }, s1: { pelaajat: [] } }), FieldValue: FV, loki: hiljainen(), nytMs: AJO }, 'viikko');
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
    const r = await VA.aja({ db, FieldValue: FV, loki: hiljainen(), nytMs: AJO }, 'viikko');
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
