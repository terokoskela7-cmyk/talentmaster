/**
 * V2 P0.4 PR 3 — diag_kalenteri_ilmoitukset.js (KUIVA, vain luku): laskenta + "ei kirjoitusta" -vahti.
 * Katkaisu: 2.10.2026 klo 23:45 +0300 (#723:n deploy).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'diag_kalenteri_ilmoitukset.js');
const D = require('../scripts/diag_kalenteri_ilmoitukset.js');
const KATKAISU = Date.parse('2026-10-02T23:45:00+03:00');
const ennen = KATKAISU - 3600000, jalkeen = KATKAISU + 3600000;
const r = (o) => Object.assign({ sid: 'kpv', pid: 'p1', id: 'n' + Math.random(), tyyppi: 'muutos', linkki: 'kalenteri:e1', teksti: 'Muutos: X', luotuMs: jalkeen, luettu: false }, o);

describe('tmIlmoituksenPolku', () => {
  it('pelaajan ilmoitus → { sid, pid, id }; henkilökunnan (kayttajat/…) ja muut polut pois', () => {
    expect(D.tmIlmoituksenPolku('seurat/kpv/pelaajat/p1/notifikaatiot/muutos_e1')).toEqual({ sid: 'kpv', pid: 'p1', id: 'muutos_e1' });
    expect(D.tmIlmoituksenPolku('seurat/kpv/kayttajat/u1/notifikaatiot/n1')).toBeNull();
    expect(D.tmIlmoituksenPolku('seurat/kpv/pelaajat/p1/kirjaukset/2026-10-01')).toBeNull();
    expect(D.tmIlmoituksenPolku('x/seurat/kpv/pelaajat/p1/notifikaatiot/n1')).toBeNull();            // ankkuri alussa
    expect(D.tmIlmoituksenPolku('seurat/kpv/pelaajat/p1/notifikaatiot/n1/syvempi/d')).toBeNull();   // ankkuri lopussa
    expect(D.tmIlmoituksenPolku(null)).toBeNull();
  });
});

describe('tmLaskeIlmoitusDiag', () => {
  it('ennen katkaisua luodut per tyyppi + lukemattomat; katkaisuhetki itse ei ole "ennen"', () => {
    const x = D.tmLaskeIlmoitusDiag([
      r({ tyyppi: 'muistutus', luotuMs: ennen, linkki: 'kalenteri:a' }), r({ tyyppi: 'muistutus', luotuMs: ennen, luettu: true, linkki: 'kalenteri:b' }),
      r({ tyyppi: 'muutos', luotuMs: ennen, linkki: 'kalenteri:c' }), r({ tyyppi: 'peruttu', luotuMs: ennen, linkki: 'kalenteri:d' }),
      r({ tyyppi: 'palaute', luotuMs: ennen, linkki: null }),
      r({ tyyppi: 'muistutus', luotuMs: jalkeen, linkki: 'kalenteri:e' }), r({ tyyppi: 'muistutus', luotuMs: KATKAISU, linkki: 'kalenteri:f' }),
    ], KATKAISU).perSeura.kpv;
    expect(x.ennenKatkaisua).toEqual({ muistutus: 2, muutos: 1, peruttu: 1, muu: 1 });
    expect(x.ennenKatkaisuaLukemattomia).toBe(4); expect(x.ilmoituksia).toBe(7); expect(x.lukemattomia).toBe(6);
  });
  it('muutosilmoitusten tuplat: sama pelaaja+tapahtuma+tyyppi >1 dokumenttia; ylimääräiset = Σ(n−1); eri pelaaja/tapahtuma ei ole tupla', () => {
    const x = D.tmLaskeIlmoitusDiag([
      r({ id: 'a1', linkki: 'kalenteri:e1' }), r({ id: 'a2', linkki: 'kalenteri:e1', teksti: 'Muutos: X → klo 19:00' }), r({ id: 'a3', linkki: 'kalenteri:e1', teksti: 'Muutos: X → klo 20:00' }),
      r({ id: 'b1', linkki: 'kalenteri:e2' }),                                   // yksittäinen
      r({ id: 'c1', pid: 'p2', linkki: 'kalenteri:e1' }),                        // toinen pelaaja, sama tapahtuma
      r({ id: 'd1', tyyppi: 'muistutus', linkki: 'kalenteri:e1' }),              // eri tyyppi
    ], KATKAISU).perSeura.kpv;
    expect(x.tuplaRyhmat).toEqual({ muistutus: 0, muutos: 1, peruttu: 0 });
    expect(x.tuplaYlimaaraisia).toEqual({ muistutus: 0, muutos: 2, peruttu: 0 });
    expect(x.esimerkit).toEqual([{ pid: 'p1', linkki: 'kalenteri:e1', tyyppi: 'muutos', n: 3, idt: ['a1', 'a2', 'a3'] }]);
  });
  it('täsmälleen sama teksti = varma tupla (erikseen); muistutus- ja peruttu-tuplat lasketaan omiin riveihinsä', () => {
    const x = D.tmLaskeIlmoitusDiag([
      r({ id: 'm1', teksti: 'Muutos: X' }), r({ id: 'm2', teksti: 'Muutos: X' }), r({ id: 'm3', teksti: 'Muutos: Y' }),
      r({ id: 'u1', tyyppi: 'muistutus', teksti: 'Huomenna: Z' }), r({ id: 'u2', tyyppi: 'muistutus', teksti: 'Huomenna: Z' }),
      r({ id: 'p1', tyyppi: 'peruttu', teksti: 'Peruttu: Q' }), r({ id: 'p2', tyyppi: 'peruttu', teksti: 'Peruttu: Q' }),
    ], KATKAISU).perSeura.kpv;
    expect(x.samaTekstiYlimaaraisia).toBe(3);   // m1/m2 (1) + u1/u2 (1) + p1/p2 (1)
    expect(x.tuplaYlimaaraisia).toEqual({ muistutus: 1, muutos: 2, peruttu: 1 });
  });
  it('per seura erikseen + yhteensä; seurat eivät sekoitu (sama pelaajaId/linkki eri seurassa ei ole tupla)', () => {
    const x = D.tmLaskeIlmoitusDiag([
      r({ sid: 'kpv', id: 'a' }), r({ sid: 'kpv', id: 'b' }), r({ sid: 'sibbo', id: 'c' }), r({ sid: 'sibbo', pid: 'p9', id: 'd', luotuMs: ennen }),
    ], KATKAISU);
    expect(Object.keys(x.perSeura).sort()).toEqual(['kpv', 'sibbo']);
    expect(x.perSeura.kpv.tuplaYlimaaraisia.muutos).toBe(1); expect(x.perSeura.sibbo.tuplaYlimaaraisia.muutos).toBe(0);
    expect(x.yhteensa.ilmoituksia).toBe(4); expect(x.yhteensa.tuplaYlimaaraisia.muutos).toBe(1); expect(x.yhteensa.ennenKatkaisua.muutos).toBe(1);
    expect(x.yhteensa.esimerkit).toBeUndefined();
  });
  it('tyhjä / rikkinäinen syöte ei kaada; tuntematon tyyppi → "muu"; ilman linkkiä ei ryhmitellä', () => {
    expect(D.tmLaskeIlmoitusDiag([], KATKAISU).yhteensa.ilmoituksia).toBe(0);
    expect(D.tmLaskeIlmoitusDiag(null, KATKAISU).perSeura).toEqual({});
    const x = D.tmLaskeIlmoitusDiag([null, {}, r({ tyyppi: 'muutos', linkki: null, id: 'x1' }), r({ tyyppi: 'muutos', linkki: null, id: 'x2' })], KATKAISU).perSeura.kpv;
    expect(x.tuplaYlimaaraisia.muutos).toBe(0);
  });
});

describe('tmRiviDokista — luotu: Timestamp | ISO | Date | puuttuu', () => {
  it('muuntaa ms:ksi', () => {
    const d = new Date('2026-10-01T10:00:00Z');
    expect(D.tmRiviDokista('s', 'p', 'i', { luotu: { toMillis: () => 123 } }).luotuMs).toBe(123);
    expect(D.tmRiviDokista('s', 'p', 'i', { luotu: d.toISOString() }).luotuMs).toBe(d.getTime());
    expect(D.tmRiviDokista('s', 'p', 'i', { luotu: d }).luotuMs).toBe(d.getTime());
    expect(D.tmRiviDokista('s', 'p', 'i', { luotu: 'ei pvm' }).luotuMs).toBeNull();
    expect(D.tmRiviDokista('s', 'p', 'i', {}).luotuMs).toBeNull();
  });
});

describe('VAIN LUKU -vahti (§0: oikeiden pelaajien dataan ei kirjoiteta)', () => {
  const src = readFileSync(SCRIPT, 'utf8').split('\n').filter((l) => !/^\s*(\/\*|\*|\/\/)/.test(l)).join('\n');
  it('ei kirjoitusmetodeja eikä --apply-polkua', () => {
    expect(src).not.toMatch(/\.(set|update|delete|add|create|batch|runTransaction|bulkWriter|recursiveDelete)\(/);
    expect(src).not.toMatch(/apply/i);
  });
  it('lukee vain collectionGroup(notifikaatiot).get(); ei palvelutilin avainta', () => {
    expect(src).toMatch(/collectionGroup\('notifikaatiot'\)\.get\(\)/);
    expect(src).not.toMatch(/serviceAccount|cert\(|applicationDefault\(\)\s*,\s*\{?\s*credential/i);
  });
  it('oletuskatkaisu = 2.10.2026 23:45 +0300 (#723-deploy)', () => { expect(D.KATKAISU_OLETUS).toBe('2026-10-02T23:45:00+03:00'); expect(Date.parse(D.KATKAISU_OLETUS)).toBe(Date.parse('2026-10-02T20:45:00Z')); });
});
