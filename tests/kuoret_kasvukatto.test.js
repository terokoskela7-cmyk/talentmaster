/**
 * Rakenne R0 — kuorten kasvukatto (docs/CODE_BRIEF_RAKENNE_R0_KASVUKATTO.md; Kaista: auto). Uusi toiminnallisuus → lib/, kuoreen vain kytkentä.
 * Katot: tests/fixtures/kuoret_kasvukatto.json (rivit + 2 %, Rules + 5 %). Räikkä alaspäin: node scripts/kuoret_kasvukatto.js --kirjoita (ei koskaan nosta).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../scripts/kuoret_kasvukatto.js');
const FIX = JSON.parse(JSON.stringify(K.lueFixture()));
const MITTAUS = () => Object.fromEntries(K.KUORET.map((k) => [k, K.rivit(k)]));

describe('kuorten kasvukatto', () => {
  it('KAIKKI kuoret ovat katon alla (mainissa läpi)', () => { const y = K.ylitykset(FIX, MITTAUS()); expect(y, K.ylitysViesti(y)).toEqual([]); });
  it('fixturessa on katto + perustelu jokaiselle kuorelle (VP, Master, Seura, Pelaaja, Admin, Excel_Tuonti, Vanhempi, functions/index.js, firestore.rules)', () => {
    expect(K.KUORET).toEqual(['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Seura.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Admin.html', 'TalentMaster_Excel_Tuonti.html', 'TalentMaster_Vanhempi_v2.html', 'functions/index.js', 'tm_admin/firestore.rules']);
    for (const k of K.KUORET) { expect(typeof FIX[k].katto, k).toBe('number'); expect(FIX[k].katto % 100, k).toBe(0); expect(FIX[k].perustelu, k).toMatch(/\S/); expect(typeof FIX[k].rivit, k).toBe('number'); }
  });
  it('katto = rivit + 2 % (Rules + 5 %) ylöspäin satoihin — alkukatot noudattavat sääntöä', () => {
    expect(K.laskeKatto('TalentMaster_VP_v25.html', 23323)).toBe(23800); expect(K.laskeKatto('x.html', 1000)).toBe(1100); expect(K.laskeKatto('x.html', 1960)).toBe(2000); expect(K.laskeKatto('tm_admin/firestore.rules', 2135)).toBe(2300); expect(K.pelivara('tm_admin/firestore.rules')).toBe(0.05);
  });
  it('KEINOTEKOINEN YLITYS failaa selkeällä viestillä: montako riviä yli + ohje lib/-siirrosta + fixturen perustelu', () => {
    const m = MITTAUS(), vp = 'TalentMaster_VP_v25.html'; m[vp] = FIX[vp].katto + 37; const y = K.ylitykset(FIX, m); expect(y).toEqual([{ kuori: vp, rivit: m[vp], katto: FIX[vp].katto, yli: 37 }]);
    const v = K.ylitysViesti(y); expect(v).toContain(vp + ' ylittää kasvukaton 37 rivillä'); expect(v).toContain('Siirrä logiikka lib/-moduuliin'); expect(v).toContain('muuta tests/fixtures/kuoret_kasvukatto.json'); expect(v).toContain('kirjoita perustelu (Teron kaista)');
    const tasan = MITTAUS(); tasan[vp] = FIX[vp].katto; expect(K.ylitykset(FIX, tasan)).toEqual([]);   // tasan katossa ok
    const ilman = JSON.parse(JSON.stringify(FIX)); delete ilman['functions/index.js']; expect(K.ylitykset(ilman, MITTAUS())[0]).toMatchObject({ kuori: 'functions/index.js', katto: null });
  });
  it('RÄIKKÄ: pienentynyt kuori → katto lasketaan alas (uusi koko + pelivara); kasvanut tai samana pysynyt → katto EI nouse eikä muutu; puuttuva luodaan', () => {
    const m = MITTAUS(), vp = 'TalentMaster_VP_v25.html', ma = 'TalentMaster_Master_v16.html';
    m[vp] = 20000; m[ma] = FIX[ma].katto + 500;   // VP pienenee 1.12.-poiston tapaan, Master "kasvaa" yli katon
    const r = K.ratkaise(FIX, m); expect(r.fixture[vp].katto).toBe(20400); expect(r.fixture[vp].rivit).toBe(20000); expect(r.fixture[vp].perustelu).toContain('Räikkä alaspäin'); expect(r.fixture[ma].katto).toBe(FIX[ma].katto);   // EI nosteta
    expect(r.muutokset.map((x) => x[0])).toEqual([vp]);
    const sama = K.ratkaise(FIX, MITTAUS()); expect(sama.muutokset).toEqual([]); expect(sama.fixture).toEqual(FIX);
    const kapea = JSON.parse(JSON.stringify(FIX)); delete kapea['TalentMaster_Admin.html']; const luotu = K.ratkaise(kapea, MITTAUS()); expect(luotu.fixture['TalentMaster_Admin.html'].katto).toBe(FIX['TalentMaster_Admin.html'].katto); expect(luotu.fixture['TalentMaster_Admin.html'].perustelu).toContain('Alkukatto');
    const hiukanPienempi = MITTAUS(); hiukanPienempi[vp] = FIX[vp].rivit - 1; expect(K.ratkaise(FIX, hiukanPienempi).muutokset).toEqual([]);   // pyöristys satoihin: pieni lasku ei laske kattoa
  });
  it('mittari: taulukko tulostaa kuori · rivit · katto · vapaa · muutos edelliseen', () => {
    const t = K.tulosta(K.taulukko(FIX)); expect(t.split('\n')[0]).toMatch(/kuori\s+rivit\s+katto\s+vapaa\s+muutos/); expect(t.split('\n')).toHaveLength(K.KUORET.length + 1); expect(t).toContain('TalentMaster_VP_v25.html');
    const rivi = K.taulukko(FIX).find((r) => r.kuori === 'TalentMaster_VP_v25.html'); expect(rivi.muutos).toBe(rivi.rivit - FIX['TalentMaster_VP_v25.html'].rivit);
  });
});
