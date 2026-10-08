import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const { laske, erittele } = createRequire(import.meta.url)('../scripts/huoltajat_vahvistamattomat.js');
describe('huoltajat_vahvistamattomat — vain lukumäärät', () => {
  it('seuroittain: huoltajia (uniikit), tili, ilman tiliä, vahvistamattomat ja niiden lapset; case-insensitive; sama huoltaja kahdella lapsella = 1 huoltaja, 2 lasta', () => {
    const r = laske([{ seura: 'kpv', email: 'A@x.fi' }, { seura: 'kpv', email: 'a@x.fi ' }, { seura: 'kpv', email: 'b@x.fi' }, { seura: 'kpv', email: 'c@x.fi' }, { seura: 'sjk', email: 'a@x.fi' }, { seura: 'sjk', email: '' }, { seura: 'sjk' }],
      [{ email: 'a@X.fi', vahvistettu: false }, { email: 'b@x.fi', vahvistettu: true }]);
    expect(r.kpv).toEqual({ pelaajia: 4, huoltajia: 3, tili: 2, ilmanTilia: 1, vahvistamattomia: 1, vahvistamattomienLapsia: 2 });
    expect(r.sjk).toEqual({ pelaajia: 1, huoltajia: 1, tili: 1, ilmanTilia: 0, vahvistamattomia: 1, vahvistamattomienLapsia: 1 });
  });
  it('tulosteessa ei nimiä/osoitteita: tulosobjekti sisältää vain lukuja', () => {
    const r = laske([{ seura: 'kpv', email: 'salainen@x.fi' }], [{ email: 'salainen@x.fi', vahvistettu: false }]);
    expect(JSON.stringify(r)).not.toContain('salainen'); Object.values(r.kpv).forEach((v) => expect(typeof v).toBe('number'));
  });
  it('vahvistamaton ≠ true: undefined/false/null → vahvistamaton', () => {
    expect(laske([{ seura: 's', email: 'a@x.fi' }], [{ email: 'a@x.fi' }]).s.vahvistamattomia).toBe(1);
  });
});

describe('erittele — vahvistamattomien kirjautumistapa, luontikuukausi, kirjautuminen (vain lukumäärät)', () => {
  const he = new Set(['a@x.fi', 'b@x.fi', 'c@x.fi', 'd@x.fi']);
  const kk = (y, m) => Date.UTC(y, m - 1, 5);
  it('laskee vain vahvistamattomat huoltajatilit; ryhmittelee tavan, kuukauden ja kirjautumisen', () => {
    const r = erittele([
      { email: 'A@x.fi', vahvistettu: false, providers: ['password'], luotu: kk(2026, 9), viimeisinKirjautuminen: null },
      { email: 'b@x.fi', vahvistettu: false, providers: ['password'], luotu: kk(2026, 10), viimeisinKirjautuminen: kk(2026, 10) },
      { email: 'c@x.fi', vahvistettu: false, providers: ['google.com', 'password'], luotu: kk(2026, 10), viimeisinKirjautuminen: null },
      { email: 'd@x.fi', vahvistettu: true, providers: ['password'], luotu: kk(2026, 9) },
      { email: 'henkilosto@x.fi', vahvistettu: false, providers: ['password'] },
      { email: 'e@x.fi', vahvistettu: false, providers: [] }], he);
    expect(r).toEqual({ yhteensa: 3, kirjautumistapa: { password: 2, 'google.com+password': 1 }, luontikuukausi: { '2026-09': 1, '2026-10': 2 }, kirjautunutKoskaan: { ei: 2, kylla: 1 } });
    expect(JSON.stringify(r)).not.toMatch(/@/);
  });
  it('ei tietoa: ei providereita → ei_yhtaan, ei luontiaikaa → tuntematon', () => {
    const r = erittele([{ email: 'a@x.fi', vahvistettu: false }], he);
    expect(r.kirjautumistapa).toEqual({ ei_yhtaan: 1 }); expect(r.luontikuukausi).toEqual({ tuntematon: 1 });
  });
});
