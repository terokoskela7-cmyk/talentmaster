/**
 * TalentMaster™ — Luokka C: peittovarjo · korkeuslinja · vyöhyke.
 *
 * Lähde (Tero, pilotti): PIIRRÄ-palkissa ei ollut vyöhykettä, korkeuslinjaa eikä peittovarjoa —
 * "Kaikki ei ole näkyvissä mitä on suunniteltu."
 *
 * Tilanne ennen: renderöijä PIIRSI kaikki kolme ja kanoninen kirjasto KÄYTTI niitä, mutta
 * validaattori ei tuntenut kenttiä → työkalut oli jätetty pois, koska ne olisivat tuottaneet
 * dataa jota mikään portti ei valvo. Aukko oli mitattava, ei teoreettinen: kentän ulkopuolinen
 * vyöhyke ja olemattomaan pelaajaan osoittava peittovarjo menivät MOLEMMAT läpi puhtaana.
 *
 *   A) PORTIT — juuri ne tapaukset jotka vuosivat läpi, hylätään nyt
 *   B) TAAKSEPÄIN — vanhat speksit + kaikki 20 kanonista pysyvät valideina
 *   C) EDITORI-LIB — puhtaat funktiot, klamppaus, viite-eheys
 *   D) KASKADI — pelaajan poisto vie varjon mukanaan (validaattorin portin pari)
 *   E) OSUMATESTI — järjestys: vyöhyke viimeisenä, muuten se söisi kaikki klikkaukset
 *   F) TYÖKALUT — kolme uutta jaetussa libissä → molemmat appit
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const V = require_(join(ROOT, 'lib', 'tm_kaavio_validate.js'));
const E = require_(join(ROOT, 'lib', 'tm_kaavio_editori.js'));
const { TM_KAAVIO_KANON } = require_(join(ROOT, 'lib', 'tm_kaavio_kanon_data.js'));
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const R = readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8');
// Skeemadokumentti siirrettiin docs/:iin: se on §3-sopimuksen governance-artefakti, ja
// "Claude outputs/" ei ole versionhallinnassa → siellä oleva dokumentti ei voi olla totuuslähde
// (sama syy kuin kanonin datalla erässä F).
const SKEEMA = readFileSync(join(ROOT, 'docs', 'tm_kaavio_spec_skeema.html'), 'utf8');

const spec = (lisa) => Object.assign({
  avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8',
  pelaajat: [{ id: 'P1', joukkue: 'oma', rooli: 'paine', x: 50, y: 60 },
             { id: 'V1', joukkue: 'vastustaja', rooli: 'syöttäjä', x: 50, y: 40 }]
}, lisa || {});
const E_ = (s) => V.validoiKaavio(s).E;

describe('A — portit: juuri ne tapaukset jotka vuosivat läpi', () => {
  it('vyöhyke kentän ULKOPUOLELLA hylätään (ennen: meni läpi)', () => {
    expect(E_(spec({ vyohyke: { x: 200, y: 200, w: 50, h: 50 } })).join(' ')).toMatch(/vyohyke/);
  });
  it('peittovarjon to = olematon pelaaja hylätään (ennen: meni läpi)', () => {
    expect(E_(spec({ peittovarjot: [{ id: 'pv1', from: 'P1', to: 'GHOST' }] })).join(' ')).toMatch(/to tuntematon/);
  });
  it('from tuntematon · from === to', () => {
    expect(E_(spec({ peittovarjot: [{ id: 'pv1', from: 'X', to: 'V1' }] })).join(' ')).toMatch(/from tuntematon/);
    expect(E_(spec({ peittovarjot: [{ id: 'pv1', from: 'P1', to: 'P1' }] })).join(' ')).toMatch(/from === to/);
  });
  it('vyöhykkeen w/h oltava > 0, eikä se saa valua reunan yli', () => {
    expect(E_(spec({ vyohyke: { x: 10, y: 10, w: 0, h: 10 } })).join(' ')).toMatch(/w\/h oltava > 0/);
    expect(E_(spec({ vyohyke: { x: 90, y: 10, w: 20, h: 10 } })).join(' ')).toMatch(/kentän ulkopuolelle/);
  });
  it('korkeuslinjan y rajoissa, id uniikki, id pakollinen', () => {
    expect(E_(spec({ korkeuslinjat: [{ id: 'kl1', y: 500 }] })).join(' ')).toMatch(/y rajan ulkona/);
    expect(E_(spec({ korkeuslinjat: [{ id: 'kl1', y: 40 }, { id: 'kl1', y: 60 }] })).join(' ')).toMatch(/duplikaatti korkeuslinja-id/);
    expect(E_(spec({ korkeuslinjat: [{ y: 40 }] })).join(' ')).toMatch(/ilman id/);
  });
  it('peittovarjon id uniikki ja pakollinen', () => {
    const kaksi = [{ id: 'pv1', from: 'P1', to: 'V1' }, { id: 'pv1', from: 'V1', to: 'P1' }];
    expect(E_(spec({ peittovarjot: kaksi })).join(' ')).toMatch(/duplikaatti peittovarjo-id/);
    expect(E_(spec({ peittovarjot: [{ from: 'P1', to: 'V1' }] })).join(' ')).toMatch(/ilman id/);
  });
  it('EI-VACUOUS: validit muodot menevät läpi (portti ei ylirajaa)', () => {
    expect(E_(spec({ vyohyke: { x: 30, y: 30, w: 20, h: 20 } }))).toEqual([]);
    expect(E_(spec({ korkeuslinjat: [{ id: 'kl1', y: 45 }] }))).toEqual([]);
    expect(E_(spec({ peittovarjot: [{ id: 'pv1', from: 'P1', to: 'V1' }] }))).toEqual([]);
  });
});

describe('B — taaksepäinyhteensopivuus', () => {
  it('vanha spec ilman näitä kenttiä pysyy validina', () => {
    expect(E_(spec())).toEqual([]);
  });
  it('KAIKKI 20 kanonista speksiä pysyvät valideina (ml. vyöhyke/varjot/linjat)', () => {
    const rikki = TM_KAAVIO_KANON.filter((s) => V.validoiKaavio(s).E.length);
    expect(rikki.map((s) => s.avain + ': ' + V.validoiKaavio(s).E.join('|'))).toEqual([]);
    expect(TM_KAAVIO_KANON.length).toBeGreaterThanOrEqual(20);
  });
  it('EI-VACUOUS: kanonisissa on oikeasti näitä kenttiä (muuten väite olisi tyhjä)', () => {
    const kpl = (k) => TM_KAAVIO_KANON.filter((s) => s[k]).length;
    expect(kpl('vyohyke')).toBeGreaterThan(0);
    expect(kpl('korkeuslinjat')).toBeGreaterThan(0);
    expect(kpl('peittovarjot')).toBeGreaterThan(0);
  });
});

describe('C — editori-lib: puhtaat funktiot', () => {
  it('peittovarjon oletukset: ensimmäinen oma peittää ensimmäisen vastustajan', () => {
    const r = E.kaavioLisaaPeittovarjo(spec());
    expect(r.spec.peittovarjot[0]).toMatchObject({ from: 'P1', to: 'V1' });
    expect(E_(r.spec)).toEqual([]);
  });
  it('yhdellä pelaajalla ei voi peittää', () => {
    const yksi = spec(); yksi.pelaajat = [yksi.pelaajat[0]];
    expect(E.kaavioLisaaPeittovarjo(yksi).virhe).toBeTruthy();
  });
  it('pään vaihto torjuu saman pelaajan molempiin päihin', () => {
    const r = E.kaavioLisaaPeittovarjo(spec());
    expect(E.kaavioAsetaPeittovarjoPaa(r.spec, r.id, 'to', 'P1').virhe).toMatch(/sama pelaaja/);
    // kolmas pelaaja → laillinen vaihto (V1 olisi jo toisessa päässä)
    const kolme = JSON.parse(JSON.stringify(r.spec));
    kolme.pelaajat.push({ id: 'P2', joukkue: 'oma', rooli: 'tuki', x: 30, y: 70 });
    const ok = E.kaavioAsetaPeittovarjoPaa(kolme, r.id, 'from', 'P2');
    expect(ok.virhe).toBeFalsy();
    expect(ok.spec.peittovarjot[0].from).toBe('P2');
  });
  it('PUHTAUS: alkuperäinen spec ei muutu', () => {
    const s = spec();
    const kopio = JSON.stringify(s);
    E.kaavioLisaaPeittovarjo(s); E.kaavioLisaaKorkeuslinja(s); E.kaavioAsetaVyohyke(s);
    expect(JSON.stringify(s)).toBe(kopio);
  });
  it('KLAMPPAUS: raahaus ei voi tuottaa speciä jonka tallennus hylkäisi', () => {
    let r = E.kaavioAsetaVyohyke(spec());
    r = E.kaavioAsetaVyohyke(r.spec, { x: 95, w: 40 });
    expect(r.spec.vyohyke.x + r.spec.vyohyke.w).toBeLessThanOrEqual(100);
    expect(E_(r.spec)).toEqual([]);
    r = E.kaavioAsetaVyohyke(r.spec, { y: -50, h: 999 });
    expect(E_(r.spec)).toEqual([]);
    const l = E.kaavioLisaaKorkeuslinja(spec(), 500);
    expect(l.spec.korkeuslinjat[0].y).toBeLessThanOrEqual(100);
    expect(E_(l.spec)).toEqual([]);
  });
  it('vyöhyke on TOGGLE: false poistaa, yksi per kaavio', () => {
    const paalle = E.kaavioAsetaVyohyke(spec());
    expect(paalle.spec.vyohyke).toBeTruthy();
    expect(E.kaavioAsetaVyohyke(paalle.spec, false).spec.vyohyke).toBeUndefined();
    expect(Array.isArray(paalle.spec.vyohyke)).toBe(false);   // objekti, ei taulukko (renderöijän muoto)
  });
  it('id:t ovat uniikkeja myös C-elementtien kesken', () => {
    let s = spec();
    for (let i = 0; i < 3; i++) s = E.kaavioLisaaKorkeuslinja(s).spec;
    for (let i = 0; i < 2; i++) s = E.kaavioLisaaPeittovarjo(s).spec;
    const idt = s.korkeuslinjat.map((x) => x.id).concat(s.peittovarjot.map((x) => x.id));
    expect(new Set(idt).size).toBe(idt.length);
    expect(E_(s)).toEqual([]);
  });
});

describe('D — kaskadi: viite-eheys säilyy poistoissa', () => {
  const pohja = () => E.kaavioLisaaPeittovarjo(spec({ korkeuslinjat: [{ id: 'kl1', y: 30 }], vyohyke: { x: 10, y: 10, w: 20, h: 20 } })).spec;
  it('pelaajan poisto vie varjon mukanaan → tallennus läpi, ei orpoa viitettä', () => {
    const s = pohja();
    expect(s.peittovarjot.length).toBe(1);
    const j = E.kaavioPoista(s, 'V1').spec;
    expect(j.peittovarjot).toBeUndefined();
    expect(E_(j)).toEqual([]);
  });
  it('EI-VACUOUS: ilman kaskadia validaattori hylkäisi', () => {
    const s = pohja();
    const orpo = JSON.parse(JSON.stringify(s));
    orpo.pelaajat = orpo.pelaajat.filter((p) => p.id !== 'V1');   // poisto ILMAN kaskadia
    expect(E_(orpo).join(' ')).toMatch(/to tuntematon/);
  });
  it('elementin oma poisto: varjo · linja · vyöhyke', () => {
    const s = pohja();
    expect(E.kaavioPoista(s, s.peittovarjot[0].id).spec.peittovarjot).toBeUndefined();
    expect(E.kaavioPoista(s, 'kl1').spec.korkeuslinjat).toBeUndefined();
    expect(E.kaavioPoista(s, 'vyohyke').spec.vyohyke).toBeUndefined();
  });
});

describe('E — osumatesti: järjestys ratkaisee', () => {
  const s = spec({ korkeuslinjat: [{ id: 'kl1', y: 20 }], peittovarjot: [{ id: 'pv1', from: 'P1', to: 'V1' }],
                   vyohyke: { x: 40, y: 45, w: 30, h: 20 } });
  it('kukin elementti löytyy omalta paikaltaan', () => {
    expect(E.kaavioOsuma(s, 50, 60, 5)).toMatchObject({ tyyppi: 'pelaaja', id: 'P1' });
    expect(E.kaavioOsuma(s, 20, 21, 5)).toMatchObject({ tyyppi: 'korkeuslinja', id: 'kl1' });
    // kaukana peittovarjon janasta (x=50), mutta vyöhykkeen sisällä
    expect(E.kaavioOsuma(s, 65, 50, 5)).toMatchObject({ tyyppi: 'vyohyke' });
    expect(E.kaavioOsuma(s, 50, 50, 5)).toMatchObject({ tyyppi: 'peittovarjo' });   // janalla varjo voittaa
    expect(E.kaavioOsuma(s, 90, 90, 5)).toBe(null);
  });
  it('VYÖHYKE VIIMEISENÄ: sen sisällä oleva pelaaja on yhä valittavissa', () => {
    const p = spec({ vyohyke: { x: 40, y: 50, w: 30, h: 30 } });
    p.pelaajat[0].x = 50; p.pelaajat[0].y = 60;                    // pelaaja vyöhykkeen sisällä
    expect(E.kaavioOsuma(p, 50, 60, 5)).toMatchObject({ tyyppi: 'pelaaja' });
  });
  it('vyöhykkeen KULMA erottuu rungosta (koon muutos vs. siirto)', () => {
    const z = spec({ vyohyke: { x: 40, y: 45, w: 30, h: 20 } });
    expect(E.kaavioOsuma(z, 70, 65, 5).kulma).toBe(true);
    expect(E.kaavioOsuma(z, 55, 50, 5).kulma).toBeUndefined();
  });
});

describe('F — työkalut jaetussa libissä → molemmat appit', () => {
  it('kolme uutta työkalua palkissa', () => {
    const i = UI.indexOf('var _KAAVIO_TYOKALUT = ['), j = UI.indexOf('];', i);
    const palkki = UI.slice(i, j);
    [['peittovarjo', 'Peittovarjo'], ['korkeuslinja', 'Korkeuslinja'], ['vyohyke', 'Vyöhyke']]
      .forEach(([k, lbl]) => { expect(palkki, k).toContain("k: '" + k + "'"); expect(palkki, lbl).toContain(lbl); });
  });
  it('vanhentunut "ei työkaluissa" -rajaus poistettu', () => {
    expect(UI).not.toMatch(/VYÖHYKE EI OLE TYÖKALUISSA/);
  });
  it('jokaisella työkalulla on ohjeteksti', () => {
    const ohje = UI.slice(UI.indexOf('function _kaavioTyokaluOhje'), UI.indexOf('}', UI.indexOf('function _kaavioTyokaluOhje')));
    ['peittovarjo', 'korkeuslinja', 'vyohyke'].forEach((k) => expect(ohje, k).toContain("t === '" + k + "'"));
  });
  it('renderöijään EI koskettu — muoto on lukittu sitä vasten', () => {
    ['s.vyohyke', 's.korkeuslinjat', 's.peittovarjot'].forEach((k) => expect(R).toContain(k));
  });
  it('skeemadokumentti on TRACKED ja samassa muodossa (yksi totuus)', () => {
    ['vyohyke', 'korkeuslinjat', 'peittovarjot'].forEach((k) => expect(SKEEMA, k).toContain(k));
    // Luokan C portit kirjattu dokumenttiin samoilla rajoilla kuin validaattorissa
    expect(SKEEMA).toMatch(/x\+w ≤ 100/);
    expect(SKEEMA).toMatch(/from ≠ to/);
    expect(SKEEMA).not.toContain('"vyohykkeet"');    // vanha taulukkomuoto poistettu
    expect(execSync('git ls-files docs/tm_kaavio_spec_skeema.html', { cwd: ROOT }).toString().trim())
      .toBe('docs/tm_kaavio_spec_skeema.html');
  });
  /* SKEEMADOKUMENTTI ON TARKISTETTU ARTEFAKTI, EI PROOSAA. Dokumentin §3-esimerkki ajetaan
     TUOTANNON validaattorin läpi: jos dokumentti ajautuu toteutuksesta, tämä punertuu. Ennen
     tätä esimerkki sisälsi prototyyppimuotoja (selitteet avainkarttana, nakokentat[]-taulukko),
     eikä mikään huomannut — validaattori ei edes osannut käsitellä sitä muotoa. */
  it('§3-esimerkki dokumentissa VALIDOITUU tuotannon validaattorilla', () => {
    const alku = SKEEMA.indexOf('<h2>Spec-JSON (per konsepti)</h2>');
    expect(alku).toBeGreaterThan(0);
    const pre = SKEEMA.slice(SKEEMA.indexOf('<pre>', alku) + 5, SKEEMA.indexOf('</pre>', alku));
    const json = pre.replace(/<span class="c">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '')
      .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    const spec = JSON.parse(json);
    expect(V.validoiKaavio(spec)).toEqual({ E: [], W: [] });
    // ja se demonstroi oikeasti luokan C + tuotannon selite-/näkökenttämuodon
    ['vyohyke', 'korkeuslinjat', 'peittovarjot'].forEach((k) => expect(spec[k], k).toBeTruthy());
    expect(Array.isArray(spec.selitteet)).toBe(true);
    expect(typeof spec.selitteet[0].t).toBe('object');
    expect(spec.pelaajat.some((p) => p.nakokentta && typeof p.nakokentta.half === 'number')).toBe(true);
  });
  it('dokumentissa ei enää prototyyppimuotoja', () => {
    expect(SKEEMA).not.toMatch(/nakokentat\[/);
    expect(SKEEMA).not.toMatch(/"selitteet"<\/span>: <span class="k">\{/);
    expect(SKEEMA).not.toMatch(/curriculum-avaimina/);
    expect(SKEEMA).not.toMatch(/nakokentta\.pelaaja/);
    expect(SKEEMA).not.toMatch(/Tiedossa oleva drift/);   // varoitus poistettu kun drift korjattu
  });

  it('peittovarjon kaksivaiheinen ele nollautuu työkalua vaihtaessa', () => {
    const vt = UI.slice(UI.indexOf('function _kaavioValitseTyokalu'), UI.indexOf('}', UI.indexOf('function _kaavioValitseTyokalu')));
    expect(vt).toContain('_kaavioTila.varjoAlku = null');
  });
});
