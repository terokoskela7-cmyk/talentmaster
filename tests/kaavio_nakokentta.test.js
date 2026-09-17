/**
 * TalentMaster™ — näkökenttä pelaajakohtaiseksi + peliasennot + katve (§3-laajennus).
 *
 * Ennen: `spec.cone` oli GLOBAALI ja sidottu siihen pelaajaan jonka rooli sattui olemaan
 * 'vastaanottaja'. Muiden pelaajien peliasento laskettiin aina palloa kohti → pelaajaa ei voinut
 * kääntää, eikä kukaan muu voinut saada näkökenttää. Katvealuetta ei ollut lainkaan.
 *
 *   A) SKEEMA — suunta + nakokentta{half,r,katve} ovat VALINNAISIA → vanhat speksit pysyvät valideina
 *   B) MIGRAATIO — idempotentti, ja renderöi IDENTTISESTI vanhan kanssa (tämä on koko ehto)
 *   C) SETTERIT — suunta, näkökenttä (koko), pallo; klamppaus vastaa validaattorin rajoja
 *   D) RENDER — facing-sääntö, per-pelaaja kartio, katve; legacy-polku säilyy
 *   E) EDITORI — työkalut kytketty, migraatio ajetaan avattaessa
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
// TAKTIIKKATAULUN UI ON NYT JAETUSSA LIBISSÄ (lib/tm_kaavio_ui.js) — sama koodi ajaa VP:ssä ja
// valmentajan apissa. Siksi UI:ta koskevat väitteet luetaan LIBISTÄ; `VP` jää niihin väitteisiin
// jotka koskevat nimenomaan VP:n omaa kytkentää (script-tagit, host-adapteri, sivupalkki).
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const RENDER = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
const E = require_(join(ROOT, 'lib', 'tm_kaavio_editori.js'));
const V = require_(join(ROOT, 'lib', 'tm_kaavio_validate.js'));

const VANHA = () => ({
  avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8', cone: { r: 42, half: 58 },
  pelaajat: [
    { id: 'O1', joukkue: 'oma', rooli: 'vastaanottaja', x: 50, y: 44, avoin: -58 },
    { id: 'O2', joukkue: 'oma', rooli: 'tuki', x: 30, y: 70, pallo: true }
  ]
});

describe('A — skeemalaajennus ei riko mitään', () => {
  it('vanha {cone, avoin} -dokumentti on YHÄ validi (ei pakkomigraatiota)', () => {
    expect(V.validoiKaavio(VANHA()).E).toEqual([]);
  });
  it('purettu kytkös: cone ilman vastaanottajaa EI ole enää virhe', () => {
    const s = VANHA(); s.pelaajat[0].rooli = 'tuki';
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('kaksi vastaanottajaa + cone EI ole enää virhe (kartio ei ole rooli)', () => {
    const s = VANHA(); s.pelaajat[1].rooli = 'vastaanottaja';
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('per-pelaaja nakokentta validoidaan: half 1..180, r > 0, katve boolean', () => {
    const tee = (nk) => { const s = VANHA(); delete s.cone; s.pelaajat[0].nakokentta = nk; return V.validoiKaavio(s).E; };
    expect(tee({ half: 58, r: 42 })).toEqual([]);
    expect(tee({ half: 58, r: 42, katve: true })).toEqual([]);
    expect(tee({ half: 0, r: 42 }).join(' ')).toMatch(/half rajan ulkona/);
    expect(tee({ half: 200, r: 42 }).join(' ')).toMatch(/half rajan ulkona/);
    expect(tee({ half: 58, r: -1 }).join(' ')).toMatch(/r rajan ulkona/);
    expect(tee({ half: 58 }).join(' ')).toMatch(/r rajan ulkona/);
    expect(tee({ half: 58, r: 42, katve: 'kylla' }).join(' ')).toMatch(/katve ei ole boolean/);
    expect(tee('iso').join(' ')).toMatch(/nakokentta ei ole objekti/);
  });
  it('suunta validoidaan numeroksi; puuttuva on ok', () => {
    const s = VANHA(); delete s.cone; s.pelaajat[0].suunta = 'ylos';
    expect(V.validoiKaavio(s).E.join(' ')).toMatch(/suunta ei ole numero/);
    const t = VANHA(); delete t.cone; t.pelaajat[0].suunta = -40;
    expect(V.validoiKaavio(t).E).toEqual([]);
  });
  it('pallo ≤ 1 ennallaan', () => {
    const s = VANHA(); s.pelaajat[0].pallo = true;
    expect(V.validoiKaavio(s).E.join(' ')).toMatch(/useampi pallollinen/);
  });
});

describe('B — migraatio', () => {
  it('cone → omistajan nakokentta; avoin periytyy suunnaksi; cone poistuu', () => {
    const { spec, muuttui } = E.kaavioNormalisoiNakokentta(VANHA());
    expect(muuttui).toBe(true);
    expect(spec.cone).toBeUndefined();
    expect(spec.pelaajat[0].nakokentta).toEqual({ half: 58, r: 42 });
    expect(spec.pelaajat[0].suunta).toBe(-58);
  });
  it('IDEMPOTENTTI: toinen ajo ei muuta mitään', () => {
    const a = E.kaavioNormalisoiNakokentta(VANHA()).spec;
    const b = E.kaavioNormalisoiNakokentta(a);
    expect(b.muuttui).toBe(false);
    expect(JSON.stringify(b.spec)).toBe(JSON.stringify(a));
  });
  it('ei cone → ei muutosta (uudet dokumentit koskemattomia)', () => {
    const s = VANHA(); delete s.cone;
    expect(E.kaavioNormalisoiNakokentta(s).muuttui).toBe(false);
  });
  it('ei vastaanottajaa → cone vain poistuu, ei keksitä omistajaa', () => {
    const s = VANHA(); s.pelaajat[0].rooli = 'tuki';
    const r = E.kaavioNormalisoiNakokentta(s).spec;
    expect(r.cone).toBeUndefined();
    expect(r.pelaajat.some((p) => p.nakokentta)).toBe(false);
  });
  it('omistajan oma nakokentta voittaa vanhan conen (ei ylikirjoiteta)', () => {
    const s = VANHA(); s.pelaajat[0].nakokentta = { half: 20, r: 10 };
    expect(E.kaavioNormalisoiNakokentta(s).spec.pelaajat[0].nakokentta).toEqual({ half: 20, r: 10 });
  });
  it('migroitu spec on validi', () => {
    expect(V.validoiKaavio(E.kaavioNormalisoiNakokentta(VANHA()).spec).E).toEqual([]);
  });
});

describe('C — setterit', () => {
  const M = () => E.kaavioNormalisoiNakokentta(VANHA()).spec;
  it('suunta normalisoidaan välille -180..180', () => {
    expect(E.kaavioAsetaSuunta(M(), 'O1', 450).spec.pelaajat[0].suunta).toBe(90);
    expect(E.kaavioAsetaSuunta(M(), 'O1', -270).spec.pelaajat[0].suunta).toBe(90);
    expect(E.kaavioAsetaSuunta(M(), 'O1', 'x').virhe).toBe('ei_numero');
    expect(E.kaavioAsetaSuunta(M(), 'EI', 10).virhe).toBe('tuntematon_id');
  });
  it('näkökentän koko klampataan validaattorin rajoihin (editori ei tuota hylättävää)', () => {
    const s1 = E.kaavioAsetaNakokentta(M(), 'O1', { half: 500, r: -5 }).spec;
    expect(V.validoiKaavio(s1).E).toEqual([]);
    expect(s1.pelaajat[0].nakokentta.half).toBe(180);
    expect(s1.pelaajat[0].nakokentta.r).toBeGreaterThan(0);
  });
  it('näkökenttä kenelle tahansa pelaajalle, ei vain vastaanottajalle', () => {
    const s = E.kaavioAsetaNakokentta(M(), 'O2', { half: 30, r: 20 }).spec;
    expect(s.pelaajat[1].nakokentta).toEqual({ half: 30, r: 20 });
    expect(s.pelaajat[1].suunta).toBe(-90);           // oletussuunta asetetaan
    expect(V.validoiKaavio(s).E).toEqual([]);
  });
  it('näkökenttä pois: false poistaa kentän', () => {
    expect(E.kaavioAsetaNakokentta(M(), 'O1', false).spec.pelaajat[0].nakokentta).toBeUndefined();
  });
  it('katve säilyy kun kokoa säädetään (ei nollaannu vahingossa)', () => {
    let s = E.kaavioAsetaNakokentta(M(), 'O1', { katve: true }).spec;
    s = E.kaavioAsetaNakokentta(s, 'O1', { r: 30 }).spec;
    expect(s.pelaajat[0].nakokentta.katve).toBe(true);
  });
  it('pallo on eksklusiivinen ja togglaa', () => {
    let s = E.kaavioAsetaPallo(M(), 'O1').spec;
    expect(s.pelaajat.filter((p) => p.pallo).length).toBe(1);
    expect(s.pelaajat[0].pallo).toBe(true);
    s = E.kaavioAsetaPallo(s, 'O1').spec;
    expect(s.pelaajat.filter((p) => p.pallo).length).toBe(0);
    expect(V.validoiKaavio(E.kaavioAsetaPallo(M(), 'O2').spec).E).toEqual([]);
  });
});

describe('D — renderöijä', () => {
  it('facing-sääntö: suunta → avoin → osoita palloon', () => {
    const f = RENDER.slice(RENDER.indexOf('function facing('), RENDER.indexOf('function nakokenttaOf('));
    expect(f).toMatch(/typeof p\.suunta==="number"/);
    expect(f).toMatch(/typeof p\.avoin==="number"/);
    expect(f).toMatch(/degTo\(p\.x,p\.y,f\.x,f\.y\)/);
  });
  it('peliasento käyttää facingia KAIKILLE (ei enää kovakoodattua palloa kohti)', () => {
    // Määrittelyrivi (function orientArc(...)) ei ole kutsu → suodatetaan pois.
    const orient = (RENDER.match(/(?<!function )orientArc\(g,x,y,[^)]*\)/g) || [])
      .filter((o) => !/deg,color/.test(o));
    expect(orient.length).toBeGreaterThanOrEqual(3);
    orient.forEach((o) => expect(o, o).toContain('facing(p,s)'));
    expect(RENDER).not.toMatch(/orientArc\([^)]*degTo\(x,y,fx,fy\)/);
  });
  it('kartio piirretään per pelaaja, ei globaalista conesta', () => {
    expect(RENDER).toMatch(/s\.pelaajat\.forEach\(p=>\{const nk=nakokenttaOf\(p,s\)/);
    expect(RENDER).not.toMatch(/if\(s\.cone&&rc\)/);
  });
  it('LEGACY: globaali cone piirtyy yhä vastaanottajalle (migroimaton dokumentti näkyy oikein)', () => {
    const f = RENDER.slice(RENDER.indexOf('function nakokenttaOf('), RENDER.indexOf('function drawSpec('));
    expect(f).toMatch(/s\.cone&&p\.rooli==="vastaanottaja"/);
  });
  it('katve piirretään suunnan TAAKSE ja kartion ALLE', () => {
    const i = RENDER.indexOf('if(nk.katve)'), j = RENDER.indexOf('sector(px,py,dir,nk.half,cr)');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(j);                          // katve ensin → jää alle
    expect(RENDER.slice(i, i + 220)).toMatch(/dir\+180/);
    expect(RENDER.slice(i, i + 220)).toMatch(/180-nk\.half/);
  });
  it('§32: katve/kartio ovat geometriaa — renderiin ei lisätty tekstiä', () => {
    const i = RENDER.indexOf('s.pelaajat.forEach(p=>{const nk='), j = RENDER.indexOf('const focus=focusOf(s)');
    expect(RENDER.slice(i, j)).not.toContain('textContent');
  });
});

describe('E — editorin kytkentä', () => {
  const runko = (nimi) => {
    const rivit = UI.split('\n');
    const a = rivit.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
    for (let i = a + 1; i < rivit.length; i++) if (rivit[i] === '}') return rivit.slice(a, i + 1).join('\n');
    return '';
  };
  it('migraatio ajetaan editoria avattaessa', () => {
    expect(runko('_kaavioAvaaEditori')).toContain('kaavioNormalisoiNakokentta(_kaavioTila.muokkaus.spec)');
  });
  it('kaikki neljä pyyntöä ovat työkaluina', () => {
    const i = UI.indexOf('var _KAAVIO_TYOKALUT = ['), j = UI.indexOf('];', i);
    const kt = UI.slice(i, j);
    ['pallo', 'suunta', 'nakokentta'].forEach((k) => expect(kt, k).toContain("k: '" + k + "'"));
  });
  it('vanha globaali cone-toggle on poistettu editorista', () => {
    expect(UI).not.toContain('_kaavioConeToggle');
    expect(UI).not.toMatch(/kaavioAsetaCone\(/);
  });
  it('näkökentän veto asettaa suunnan JA syvyyden, lyhyt veto togglaa', () => {
    const pu = runko('_kaavioPointerUp');
    expect(pu).toContain('kaavioAsetaSuunta(m.spec, pid, aste)');
    expect(pu).toMatch(/if \(t === 'nakokentta'\)[\s\S]*kaavioAsetaNakokentta\(m\.spec, pid, \{ r:/);
    expect(pu).toMatch(/if \(pit < 3\)/);
  });
  // MUUTTUNUT: valinta on nyt PYSYVÄ ({kind,id}) eikä nollaudu työkalua vaihtaessa — se on
  // näkyvä tila jota ominaisuuspaneeli seuraa. Säädin lukee valinnan jaetun apurin kautta.
  it('säädin kohdistuu VALITTUUN pelaajaan; valinta säilyy työkalua vaihtaessa', () => {
    expect(runko('_kaavioNakokenttaSaadinHTML')).toContain('_kaavioValittuPelaaja()');
    expect(runko('_kaavioValitseTyokalu')).not.toContain('_kaavioTila.valittu = null');
  });
  it('jokaiselle uudelle työkalulle on ohjeteksti (moodi ei saa olla näkymätön)', () => {
    const o = runko('_kaavioTyokaluOhje');
    ['pallo', 'suunta', 'nakokentta'].forEach((k) => expect(o, k).toContain("t === '" + k + "'"));
  });
  it('uudet tekstit ovat sv-kartassa', () => {
    const sv = readFileSync(join(ROOT, 'lib', 'tm_i18n_common.js'), 'utf8')
      + readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8');   // C1: avain on TASAN toisessa
    ['Pallo', 'Peliasento', 'Katve', 'leveys', 'syvyys', 'Klikkaa pelaajaa'].forEach((k) =>
      expect(sv, k).toContain("'" + k + "':"));
  });
});
