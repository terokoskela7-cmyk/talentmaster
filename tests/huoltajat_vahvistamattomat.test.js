import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const { laske } = createRequire(import.meta.url)('../scripts/huoltajat_vahvistamattomat.js');
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
