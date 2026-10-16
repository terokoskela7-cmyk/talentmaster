/* Peliäly-tasokorjaus 16.10. — ÄLY-tason kuvaus: yleiset tasot, seuraava askel heikoimmasta MITATUSTA ulottuvuudesta (ei tasosta); Pelaaja_v7 + VP käyttävät kanonista muunnosta. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const A = require('../lib/tm_adar_rubriikki.js'), Y = require('../lib/tm_pelialy_yksilo.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const havainto = (A_, D, Act, R, uid) => ({ uid: uid || 'v1', luotu: '2026-10-10T10:00:00Z', pisteet: { A: A_, D, Act, R } });
const hav3 = (a, d, ac, r, pvm) => ({ uid: 'v1', luotu: pvm, pisteet: { A: a, D: d, Act: ac, R: r } });
/* sama ketju kuin Pelaaja_v7: konsensus (porras) → yht + heikoin (vain portaan ulottuvuuksista) → tmAdarTaso5 → alyTaso(taso, ctx). ctx.porras = p.havainto_porras; ehdotus = tmAdarPorrasEhdotus */
function kortti(havainnot, ika, porras, valittuPorras) {
  const hs = Array.isArray(havainnot) ? havainnot : [havainnot];
  const k = Y.tmAdarKonsensus(hs, ika, porras), ad = { a: k.dimKonsensus.a, d: k.dimKonsensus.d, ac: k.dimKonsensus.ac, r: k.dimKonsensus.r, yht: k.yht };
  const heik = (k.heikoin && ad[k.heikoin] != null) ? ad[k.heikoin] : undefined;   // KORJAUS: heikoin portaan joukosta, ei kaikista (bonusulottuvuudet pois)
  return A.alyTaso(Y.tmAdarTaso5(ad.yht), { porras: valittuPorras, ika, heikoin: k.heikoin, heikoinPisteet: heik, ehdotus: Y.tmAdarPorrasEhdotus(hs, porras || Y.tmAdarIkaPorras(ika)) });
}
const KOLME = [hav3(3, 1, 1, 1, '2026-10-10T10:00:00Z'), hav3(3, 1, 1, 1, '2026-10-09T10:00:00Z'), hav3(3, 1, 1, 1, '2026-10-08T10:00:00Z')];   // uid sama → konsensus ottaa uusimman; ehdotus lukee kaikki 3
const KOLME_ERI = ['a', 'b', 'c'].map((u, i) => ({ uid: u, luotu: '2026-10-0' + (i + 7) + 'T10:00:00Z', pisteet: { A: 3, D: 1, Act: 1, R: 1 } }));
describe('TM_ADAR_RUBRIIKKI — tasot', () => {
  it('tasot 1–5: yleiset nimet (Alussa · Kehittyvä · Vakaa · Vahva · Erinomainen), ei ulottuvuuksien nimiä', () => {
    expect([1, 2, 3, 4, 5].map((t) => A.alyTaso(t).nimi)).toEqual(['Alussa', 'Kehittyvä', 'Vakaa', 'Vahva', 'Erinomainen']);
    for (let t = 1; t <= 5; t++) { const r = A.alyTaso(t); expect(r.nimi + r.nyt, t).not.toMatch(/Toteutat|Päätöksenteko|Toteutus|Palautuminen|Havainnointi|Duckworth/); }
    expect(A.alyTaso(1).nyt).toBe('Opettelet katsomaan, mitä pelissä tapahtuu 👀');
  });
  it('tasot 3 ja 4 neutraalit: "Luet peliä hyvin" — ei "valin" eikä "ratkais" (ei väitä päätöksestä/toteutuksesta)', () => {
    expect(A.alyTaso(3).nyt).toBe('Luet peliä hyvin ⚙️'); expect(A.alyTaso(4).nyt).toBe('Luet peliä hyvin myös kovassa vauhdissa 🔄');
    for (const t of [3, 4]) expect(A.alyTaso(t).nyt, t).not.toMatch(/valin|ratkais/i);
  });
  it('null kun taso puuttuu; ylitys rajataan 5:een; ei Duckworth-viittausta / ikärajoja ulottuvuuden määrittäjänä', () => {
    expect(A.alyTaso(null)).toBeNull(); expect(A.alyTaso(0)).toBeNull(); expect(A.alyTaso(9).taso).toBe(5);
    expect(lue('lib/tm_adar_rubriikki.js')).not.toMatch(/Duckworth|15 s/);
  });
});
describe('alyTaso — seuraava askel osaamistavoitteesta (ei iästä)', () => {
  it('1) porras 1, a=3, ehdotus valmis (seuraava d) → ASKEL.d, seuraava_taito', () => {
    const r = A.alyTaso(5, { porras: 1, heikoin: 'a', heikoinPisteet: 3, ehdotus: { valmis: true, seuraava: 'd' } });
    expect(r.askel).toBe(A.ASKEL.d); expect(r.askelTyyppi).toBe('seuraava_taito'); expect(r.askelDim).toBe('d');
  });
  it('2) porras 1, a=2, ehdotus ei valmis → ASKEL.a, harjoittele', () => {
    const r = A.alyTaso(3, { porras: 1, heikoin: 'a', heikoinPisteet: 2, ehdotus: { valmis: false, seuraava: null, hist: [2] } }); expect(r.askel).toBe(A.ASKEL.a); expect(r.askelTyyppi).toBe('harjoittele');
  });
  it('3) porras 1, a=3, ehdotus ei valmis (alle 3 havaintoa) → ASKEL.d, seuraava_taito (kohta c)', () => {
    const r = A.alyTaso(5, { porras: 1, heikoin: 'a', heikoinPisteet: 3, ehdotus: { valmis: false, seuraava: null, hist: [3] } }); expect(r.askel).toBe(A.ASKEL.d); expect(r.askelTyyppi).toBe('seuraava_taito');
  });
  it('4) 10-vuotias portaalla 3, heikoin ac=2 → ASKEL.ac (ikä ei vaikuta)', () => {
    const h = hav3(3, 3, 2, null, '2026-10-10T10:00:00Z'); const r = kortti(h, 10, 3, 3); expect(r.askelDim).toBe('ac'); expect(r.askel).toBe(A.ASKEL.ac); expect(r.askelTyyppi).toBe('harjoittele');
  });
  it('5) 16-vuotias portaalla 1, a=2 → ASKEL.a (ikä ei vaikuta)', () => {
    const r = kortti(havainto(2, null, null, null), 16, 1, 1); expect(r.askel).toBe(A.ASKEL.a); expect(r.askelDim).toBe('a');
  });
  it('6) porras 4, kaikki 3 → YLLAPITO, yllapito', () => {
    const r = kortti(havainto(3, 3, 3, 3), 17, 4, 4); expect(r.askel).toBe(A.YLLAPITO); expect(r.askelTyyppi).toBe('yllapito'); expect(r.askelDim).toBeNull();
  });
  it('7) porras 1, a=3, r=1 bonuksena → r ei vaikuta (askel ei ole ASKEL.a eikä ASKEL.r; seuraava taito d)', () => {
    const r = kortti(havainto(3, null, null, 1), 17, 1, 1); expect(r.askelDim).toBe('d'); expect(r.askel).not.toBe(A.ASKEL.r); expect(r.askel).not.toBe(A.ASKEL.a);
    // sama ilman portaan rajausta (vanha virhe): minimi kaikista = 1 → väärä askel
    const k = Y.tmAdarKonsensus([havainto(3, null, null, 1)], 17, 1); expect(k.heikoin).toBe('a');
  });
  it('8) porras puuttuu, ikä 11 → oletusporras 1; ikä tuntematon → 4', () => {
    expect(A.alyTaso(3, { ika: 11, heikoin: 'a', heikoinPisteet: 3 }).askelDim).toBe('d');          // porras 1 → seuraava taito d
    expect(A.alyTaso(3, { ika: null, heikoin: 'a', heikoinPisteet: 3 }).askelTyyppi).toBe('yllapito');   // porras 4, kaikki 3
    expect(A.alyTaso(3, { heikoin: 'a', heikoinPisteet: 3 }).askelTyyppi).toBe('yllapito');
    expect(A.alyTaso(3, { ika: 14, heikoin: 'a', heikoinPisteet: 3 }).askelDim).toBe('r');          // ikä 14 → porras 3 → seuraava r
  });
  it('reunatapaus: ei heikointa eikä pisteitä (vanha dokumentti), taso 2, porras 1 → harjoittele / ASKEL.a (ei seuraavaa taitoa)', () => {
    const r = A.alyTaso(2, { porras: 1 }); expect(r.askelTyyppi).toBe('harjoittele'); expect(r.askelDim).toBe('a'); expect(r.askel).toBe(A.ASKEL.a);
    expect(A.alyTaso(4, { porras: 2, heikoin: null, heikoinPisteet: null }).askelTyyppi).toBe('harjoittele');
    // taso 5 + pisteet tuntemattomat = kuin pisteet olisivat 3 (taso 5 = yht ≥ 2,75): porras < 4 → seuraava taito; porras 4 → ylläpito (ei koskaan portaalla 1–3)
    const t5a = A.alyTaso(5, { porras: 2 }); expect(t5a.askelTyyppi).toBe('seuraava_taito'); expect(t5a.askelDim).toBe('ac');
    const t5b = A.alyTaso(5, { porras: 4 }); expect(t5b.askelTyyppi).toBe('yllapito'); expect(t5b.askel).toBe(A.YLLAPITO);
    for (const p of [1, 2, 3]) expect(A.alyTaso(5, { porras: p }).askelTyyppi, 'porras ' + p).not.toBe('yllapito');
    expect(A.alyTaso(3, { porras: 1, heikoin: 'a', heikoinPisteet: 3 }).askelTyyppi).toBe('seuraava_taito');   // c vain kun pisteet tiedetään (3)
  });
  it('heikoin puuttuu ja ehdotus ei valmis → havainnoinnin askel (kun pisteet <3)', () => { expect(A.alyTaso(2, { porras: 2, heikoinPisteet: 2 }).askel).toBe(A.ASKEL.a); });
  it('ketju: kolme havaintoa a≥2,5 portaalla 1 → ehdotus valmis → seuraava taito d', () => {
    const r = kortti(KOLME_ERI, 10, 1, 1); expect(r.askelTyyppi).toBe('seuraava_taito'); expect(r.askelDim).toBe('d');
  });
  it('lähteessä ei ikärajaa ulottuvuuden määrittäjänä ("U8–12 vain a")', () => {
    for (const f of ['lib/tm_adar_rubriikki.js', 'TalentMaster_Pelaaja_v7.html']) expect(lue(f), f).not.toMatch(/U8–12 vain a|U8–12:lla yht|U8–U12\)\s+— arvioidaan vain Assess/);
  });
});
describe('Pelaajakortti — skenaariot', () => {
  it('porras 1, havainnointi 2: taso 3 "Vakaa", ei sanaa "Toteutat"; kaikki 1 → "Alussa"', () => {
    const r = kortti(havainto(2, null, null, null), 10, 1, 1); expect(r.taso).toBe(3); expect(r.nimi).toBe('Vakaa'); expect(JSON.stringify(r)).not.toMatch(/Toteutat/);
    const a = kortti(havainto(1, 1, 1, 1), 17, 4, 4); expect(a.taso).toBe(1); expect(a.nimi).toBe('Alussa');
  });
  it('porras 4, heikoin = r (a=3,d=3,ac=3,r=1): askel palautumisesta', () => { expect(kortti(havainto(3, 3, 3, 1), 17, 4, 4).askel).toBe(A.ASKEL.r); });
});
describe('Kytkennät: Pelaaja_v7 + VP + Koulutus', () => {
  const P = lue('TalentMaster_Pelaaja_v7.html'), V = lue('TalentMaster_VP_v25.html'), K = lue('TalentMaster_ADAR_Koulutus.html');
  it('Pelaaja_v7: ÄLY val = tmAdarNorm99, taso = tmAdarTaso5, seuraava askel heikoimmasta (adarHeikoin); muiden ulottuvuuksien kaavat ennallaan', () => {
    expect(P).toMatch(/val:v, state: luot \? 'measured'/); expect(P).toMatch(/const v = tmAdarNorm99\(ad\.yht\)/); expect(P).toMatch(/return tmAdarTaso5\(ad\.yht\)/);
    expect(P).toMatch(/alyTaso\(t, d\.adarCtx\)/); expect(P).toMatch(/const _heik = \(p\.adar_heikoin && ad\[p\.adar_heikoin\] != null\) \? ad\[p\.adar_heikoin\] : undefined/);
    expect(P).toMatch(/porras: p\.havainto_porras \|\| null[^}]*ehdotus: p\.havainto_porras_ehdotus/); expect(P).not.toMatch(/Math\.min\.apply\(null, _adP\)/);   // heikoin portaan joukosta, ei kaikista (bonus pois)
    expect(P).toMatch(/_p7K1T\('Seuraava taito'\)/);
    expect(P).toMatch(/d\.key === 'FYS' && p\.d1_taso != null\) return Math\.max\(1, Math\.min\(5, Math\.round\(p\.d1_taso\)\)\)/);
    expect(P).toMatch(/d\.key === 'PSY' && p\.d3_taso != null\) return Math\.max\(1, Math\.min\(5, Math\.round\(p\.d3_taso\)\)\)/);
  });
  it('VP: _dimNorm5Adar = tmAdarNorm5 (lineaarinen 1–5)', () => { expect(V).toMatch(/function _dimNorm5Adar\(yht\) \{ return tmAdarNorm5\(yht\); \}/); });
  it('Koulutus: palautumisosiossa ei 15 s -sääntöä eikä kellotusta', () => {
    expect(K).not.toMatch(/15 sekunnin|Käytä kelloa|alle 15|15–30s|Yli 30s/);
    expect(K).toContain('Palasiko hän peliin heti virheen jälkeen?'); expect(K).toContain('Palaako peliin heti virheen jälkeen?'); expect(K).toContain('älä kellota.');
  });
});
