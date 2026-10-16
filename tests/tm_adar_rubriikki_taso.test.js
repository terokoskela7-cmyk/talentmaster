/* Peliäly-tasokorjaus 16.10. — ÄLY-tason kuvaus: yleiset tasot, seuraava askel heikoimmasta MITATUSTA ulottuvuudesta (ei tasosta); Pelaaja_v7 + VP käyttävät kanonista muunnosta. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const A = require('../lib/tm_adar_rubriikki.js'), Y = require('../lib/tm_pelialy_yksilo.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const havainto = (A_, D, Act, R, uid) => ({ uid: uid || 'v1', luotu: '2026-10-10T10:00:00Z', pisteet: { A: A_, D, Act, R } });
/* sama ketju kuin Pelaaja_v7: konsensus (porras) → yht + heikoin → tmAdarTaso5 → alyTaso(taso, heikoin, heikoimman pisteet) */
function kortti(h, ika, porras) {
  const k = Y.tmAdarKonsensus([h], ika, porras), ad = { a: k.dimKonsensus.a, d: k.dimKonsensus.d, ac: k.dimKonsensus.ac, r: k.dimKonsensus.r, yht: k.yht };
  const mit = [ad.a, ad.d, ad.ac, ad.r].filter((x) => typeof x === 'number');
  return A.alyTaso(Y.tmAdarTaso5(ad.yht), k.heikoin, mit.length ? Math.min.apply(null, mit) : undefined);
}
describe('TM_ADAR_RUBRIIKKI — tasot', () => {
  it('tasot 1–5: yleiset nimet (Alussa · Kehittyvä · Vakaa · Vahva · Erinomainen), ei ulottuvuuksien nimiä eikä "Toteutat"', () => {
    expect([1, 2, 3, 4, 5].map((t) => A.alyTaso(t).nimi)).toEqual(['Alussa', 'Kehittyvä', 'Vakaa', 'Vahva', 'Erinomainen']);
    for (let t = 1; t <= 5; t++) { const r = A.alyTaso(t); expect(r.nimi + r.nyt, t).not.toMatch(/Toteutat|Päätöksenteko|Toteutus|Palautuminen|Havainnointi|Duckworth/); }
    expect(A.alyTaso(1).nyt).toBe('Opettelet katsomaan, mitä pelissä tapahtuu 👀');
  });
  it('askel määräytyy heikoimmasta ulottuvuudesta (a/d/ac/r), ei tasosta; puuttuva → havainnoinnin askel', () => {
    for (const t of [1, 3, 4]) { for (const d of ['a', 'd', 'ac', 'r']) expect(A.alyTaso(t, d).askel, t + d).toBe(A.ASKEL[d]); expect(A.alyTaso(t).askel).toBe(A.ASKEL.a); expect(A.alyTaso(t, 'x').askel).toBe(A.ASKEL.a); }
    expect(A.ASKEL.r).toBe('Virhe ei jää päähän — palaa peliin heti ja tee seuraava ratkaisu.');
  });
  it('taso 5: ylläpitoteksti kun heikoinkin on 3 (tai pisteet puuttuvat); muuten heikoimman askel', () => {
    expect(A.alyTaso(5, 'd', 3).askel).toBe('Huipputasolla — pidä yllä ja monipuolista rooleissa.'); expect(A.alyTaso(5).askel).toBe(A.YLLAPITO);
    expect(A.alyTaso(5, 'd', 2).askel).toBe(A.ASKEL.d);
  });
  it('null kun taso puuttuu; ylitys rajataan 5:een; ei Duckworth-viittausta lähteessä', () => {
    expect(A.alyTaso(null)).toBeNull(); expect(A.alyTaso(0)).toBeNull(); expect(A.alyTaso(9).taso).toBe(5);
    expect(lue('lib/tm_adar_rubriikki.js')).not.toMatch(/Duckworth|15 s/);
  });
});
describe('Pelaajakortti — skenaariot', () => {
  it('U8–12 (porras 1), havainnointi 2: taso 3 "Vakaa", askel havainnoinnista, ei sanaa "Toteutat"', () => {
    const r = kortti(havainto(2, null, null, null), 10, 1);
    expect(r.taso).toBe(3); expect(r.nimi).toBe('Vakaa'); expect(r.askel).toBe(A.ASKEL.a); expect(JSON.stringify(r)).not.toMatch(/Toteutat/);
  });
  it('U16 (porras 4), heikoin = r (a=3,d=3,ac=3,r=1): askel palautumisesta', () => {
    const r = kortti(havainto(3, 3, 3, 1), 17, 4); expect(r.askel).toBe(A.ASKEL.r);
  });
  it('kaikki 1: taso 1 "Alussa"; kaikki 3: taso 5 "Erinomainen" + ylläpito', () => {
    const a = kortti(havainto(1, 1, 1, 1), 17, 4); expect(a.taso).toBe(1); expect(a.nimi).toBe('Alussa');
    const b = kortti(havainto(3, 3, 3, 3), 17, 4); expect(b.taso).toBe(5); expect(b.askel).toBe(A.YLLAPITO);
  });
});
describe('Kytkennät: Pelaaja_v7 + VP + Koulutus', () => {
  const P = lue('TalentMaster_Pelaaja_v7.html'), V = lue('TalentMaster_VP_v25.html'), K = lue('TalentMaster_ADAR_Koulutus.html');
  it('Pelaaja_v7: ÄLY val = tmAdarNorm99, taso = tmAdarTaso5, seuraava askel heikoimmasta (adarHeikoin); muiden ulottuvuuksien kaavat ennallaan', () => {
    expect(P).toMatch(/val:v, state: luot \? 'measured'/); expect(P).toMatch(/const v = tmAdarNorm99\(ad\.yht\)/); expect(P).toMatch(/return tmAdarTaso5\(ad\.yht\)/);
    expect(P).toMatch(/alyTaso\(t, d\.adarHeikoin, d\.adarHeikoinPisteet\)/); expect(P).toMatch(/adarHeikoin: p\.adar_heikoin/);
    expect(P).toMatch(/d\.key === 'FYS' && p\.d1_taso != null\) return Math\.max\(1, Math\.min\(5, Math\.round\(p\.d1_taso\)\)\)/);
    expect(P).toMatch(/d\.key === 'PSY' && p\.d3_taso != null\) return Math\.max\(1, Math\.min\(5, Math\.round\(p\.d3_taso\)\)\)/);
  });
  it('VP: _dimNorm5Adar = tmAdarNorm5 (lineaarinen 1–5)', () => { expect(V).toMatch(/function _dimNorm5Adar\(yht\) \{ return tmAdarNorm5\(yht\); \}/); });
  it('Koulutus: palautumisosiossa ei 15 s -sääntöä eikä kellotusta', () => {
    expect(K).not.toMatch(/15 sekunnin|Käytä kelloa|alle 15|15–30s|Yli 30s/);
    expect(K).toContain('Palasiko hän peliin heti virheen jälkeen?'); expect(K).toContain('Palaako peliin heti virheen jälkeen?'); expect(K).toContain('älä kellota.');
  });
});
