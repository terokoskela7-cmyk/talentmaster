/**
 * TalentMaster™ — kaavion luonti-UI (puuttuva sisäänkäynti).
 *
 * Koko kaavioputki oli tuotannossa, mutta pankissa ei ollut tapaa LUODA kaaviota: editori
 * avautui vain olemassa olevalle dokumentille ja tallennus oli pelkkä update(). Tyhjässä
 * seurassa ensimmäistä kaaviota ei voinut tehdä lainkaan.
 *
 *   A) LUONTIPORTTI — kaavioVoiLuoda peilaa rulesin create-ehtoa (roolimatriisi ajetaan)
 *   B) STARTER — luotu spec läpäisee §6-validaattorin HETI (ei avaudu virhetilassa)
 *   C) CREATE-HAARA — kirjoittaa luonnos/versio 0/luonut/luotu; ei aja tilasiirtokoneistoa
 *   D) MUOKKAUS ENNALLAAN — update-haara + versiolukko + §6-portti koskematta
 *   E) UUDELLEENKÄYTTÖ — luonti ei duplikoi editoria eikä validointia
 *
 * (B) on se joka estää huonon ensivaikutelman: tyhjä spec olisi validi vasta piirtämisen
 * jälkeen, joten käyttäjä näkisi "ei kelpaa" ennen kuin on tehnyt mitään.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const RULES = readFileSync(join(ROOT, 'tm_admin', 'firestore.rules'), 'utf8');
const P = require_(join(ROOT, 'lib', 'tm_kaavio_policy.js'));
const V = require_(join(ROOT, 'lib', 'tm_kaavio_validate.js'));
const RIVIT = VP.split('\n');

const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) return null;
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  return null;
};

describe('A — luontiportti peilaa rulesin create-ehtoa', () => {
  it('roolilista on identtinen rulesin onValmentajaRooli():n kanssa', () => {
    const m = RULES.match(/function onValmentajaRooli\(\)[\s\S]*?rooli in \[([\s\S]*?)\]/);
    expect(m).toBeTruthy();
    const rulesRoolit = m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    const lapi = rulesRoolit.filter((r) => P.kaavioVoiLuoda({ rooli: r, seuraId: 'A', uid: 'u' }));
    expect(lapi.sort()).toEqual([...rulesRoolit].sort());
  });
  it('ei-valmennusroolit ja seuraton konteksti eivät saa luoda', () => {
    ['seurasihteeri', 'testivastaava', 'pelaaja', 'fysioterapeutti'].forEach((r) => {
      expect(P.kaavioVoiLuoda({ rooli: r, seuraId: 'A', uid: 'u' }), r).toBe(false);
    });
    expect(P.kaavioVoiLuoda({ rooli: 'valmentaja', seuraId: null })).toBe(false);
    expect(P.kaavioVoiLuoda({ anon: true })).toBe(false);
    expect(P.kaavioVoiLuoda({})).toBe(false);
  });
  it('super_admin ohittaa (kuten rulesin onSuperAdmin() ||)', () => {
    expect(P.kaavioVoiLuoda({ superAdmin: true })).toBe(true);
  });
  it('portti on TARKOITUKSELLA löysempi kuin kaavioVoiKirjoittaa (uudella ei ole joukkuetta)', () => {
    const ctx = { rooli: 'valmentaja', seuraId: 'A', uid: 'u', joukkueet: ['u13'] };
    const seuratasoinen = { seuraId: 'A', review: { status: 'luonnos', nakyvyys: 'seura', joukkueId: null } };
    expect(P.kaavioVoiLuoda(ctx)).toBe(true);
    expect(P.kaavioVoiKirjoittaa(seuratasoinen, ctx)).toBe(false);   // ero on todellinen, ei teoreettinen
  });
  it('nappi renderöidään vain portin läpäisseille — molemmissa sijainneissa', () => {
    const fn = runko('avaaKaaviopankki');
    expect((fn.match(/kaavioVoiLuoda\(ctx\)/g) || []).length).toBe(2);   // otsikkorivi + tyhjä tila
    expect(fn).toContain('_kaavioUusiNappiHTML()');
  });
  it('lomake ja luonti tarkistavat portin myös itse (nappi ei ole ainoa vartija)', () => {
    expect(runko('_kaavioUusiLomake')).toMatch(/kaavioVoiLuoda\(ctx\)/);
    expect(runko('_kaavioLuoJaMuokkaa')).toMatch(/kaavioVoiLuoda\(ctx\)/);
  });
});

describe('B — starter-spec on VALIDI heti (ei avaudu virhetilassa)', () => {
  // Rakennetaan starter samasta lähteestä kuin tuotanto: poimitaan objektiliteraali funktiosta.
  // Ajetaan TUOTANNON lauseke sellaisenaan (ei kopiota) — vain ympäröivät muuttujat sidotaan.
  // Näin testi rikkoutuu jos starteria muutetaan, eikä kulje rinnakkaisen totuuden varassa.
  const starterilla = (pelimuoto) => {
    const fn = runko('_kaavioLuoJaMuokkaa');
    const i = fn.indexOf('  var _k = ');
    const j = fn.indexOf('\n  };', i);
    expect(i, 'starter-lauseketta ei löytynyt').toBeGreaterThan(0);
    // Starter resolvoi nyt konseptin DOMEENIN (hyökkäys vs puolustus) → lauseke tarvitsee myös
    // konseptihaun. Tämä sviitti testaa hyökkäyshaaran; domeenihaarat ovat kaavio_tyokalut-sviitissä.
    const sb = {
      avain: 'y_h0', pm: { value: pelimuoto || '8v8' }, kp: { value: '' },
      tmKonseptiResolvoi: () => ({ avain: 'y_h0', dim: 'hyokkays' }),
      _ttSeuraId: () => 's1'
    };
    vm.createContext(sb);
    vm.runInContext(fn.slice(i, j + 4) + '\nthis.ulos = starter;', sb);
    return sb.ulos;
  };
  const starter = starterilla('8v8');
  it('läpäisee §6-validaattorin ilman virheitä', () => {
    expect(V.validoiKaavio(starter).E).toEqual([]);
  });
  it('sisältää pakolliset kentät ja ≥1 pelaajan', () => {
    ['avain', 'suunta', 'pelimuoto'].forEach((k) => expect(starter[k], k).toBeTruthy());
    expect(starter.pelaajat.length).toBeGreaterThanOrEqual(1);
  });
  it('EI-VACUOUS: tyhjä starter EI läpäisisi — portti mittaa jotain', () => {
    expect(V.validoiKaavio(Object.assign({}, starter, { pelaajat: [] })).E.length).toBeGreaterThan(0);
  });
  it('pelaajamäärä mahtuu pienimpään pelimuotoon (5v5)', () => {
    expect(V.validoiKaavio(starterilla('5v5')).E).toEqual([]);
  });
  it('korkeintaan yksi pallollinen', () => {
    expect(starter.pelaajat.filter((x) => x.pallo).length).toBeLessThanOrEqual(1);
  });
  it('kpi lisätään vain jos valittu — tyhjä ei päädy speciin (validaattori hylkäisi)', () => {
    const fn = runko('_kaavioLuoJaMuokkaa');
    expect(fn).toMatch(/if \(kp && kp\.value\) starter\.kpi = kp\.value;/);
    expect(V.validoiKaavio(Object.assign({}, starter, { kpi: '' })).E).toEqual([]);
  });
});

describe('C — create-haara kirjoittaa rulesin vaatiman muodon', () => {
  const fn = runko('_kaavioTallenna');
  it('haaroittuu uuden ja olemassa olevan välillä', () => {
    expect(fn).toMatch(/if \(m\._uusi \|\| !m\.id\)/);
  });
  it('add() kirjoittaa status=luonnos ja versio=0 (create-portin ehdot)', () => {
    const create = fn.slice(fn.indexOf('if (m._uusi'), fn.indexOf('// ── MUOKKAUS'));
    expect(create).toMatch(/status: 'luonnos'/);
    expect(create).toMatch(/versio: 0/);
    expect(create).toMatch(/luonut: luoja/);
    expect(create).toMatch(/luotu: firebase\.firestore\.FieldValue\.serverTimestamp\(\)/);
  });
  it('EI aja tilasiirtokoneistoa luonnissa (se päättelisi tilan olemattomasta vanhasta)', () => {
    const create = fn.slice(fn.indexOf('if (m._uusi'), fn.indexOf('// ── MUOKKAUS'));
    expect(create).not.toContain('kaavioTilaMuokkauksenJalkeen');
    expect(create).not.toContain('kaavioSeuraavaVersio');
  });
  it('luonnin jälkeen id otetaan talteen → seuraava Tallenna on update, ei toinen dokumentti', () => {
    expect(fn).toMatch(/m\.id = ref\.id; m\._uusi = false;/);
  });
  it('kirjoittaa seuratasolle, ei kanoniin', () => {
    expect(fn).toMatch(/collection\('seurat'\)\.doc\(m\.seuraId \|\| _seuraId\)\.collection\('kaaviot'\)/);
    const create = fn.slice(fn.indexOf('if (m._uusi'), fn.indexOf('// ── MUOKKAUS'));
    expect(create).not.toMatch(/collection\('kaaviot'\)\s*$|db\.collection\('kaaviot'\)/);
  });
  it('§6-validointi on YHTEINEN — se ajetaan ennen haarautumista', () => {
    const ennenHaaraa = fn.slice(0, fn.indexOf('if (m._uusi'));
    expect(ennenHaaraa).toContain('validoiKaavio(m.spec');
    expect(ennenHaaraa).toMatch(/if \(tulos\.E\.length\)[\s\S]*return;/);
  });
});

describe('D — muokkauspolku ennallaan (ei regressiota)', () => {
  const fn = runko('_kaavioTallenna');
  const update = fn.slice(fn.indexOf('// ── MUOKKAUS'));
  it('update säilyttää tilasiirron ja versiolukon', () => {
    expect(update).toContain('kaavioTilaMuokkauksenJalkeen(m, ctx)');
    expect(update).toMatch(/'review\.versio': kaavioSeuraavaVersio\(m\)/);
  });
  it('update ei kirjoita luonut/luotu-kenttiä (ne kuuluvat vain luontiin)', () => {
    expect(update).not.toMatch(/luonut|luotu:/);
  });
  it('review-toiminnot (ehdota/hyvaksy) koskematta', () => {
    const t = runko('_kaavioToiminto');
    expect(t).toBeTruthy();
    expect(t).not.toContain('_uusi');
  });
});

describe('E — uudelleenkäyttö: ei kopioitua editoria eikä validointia', () => {
  it('luonti avaa SAMAN editorin kuin Muokkaa', () => {
    expect(runko('_kaavioLuoJaMuokkaa')).toContain('_kaavioAvaaEditori(_kaavioTila.muokkaus)');
    expect((VP.match(/function _kaavioAvaaEditori\(/g) || []).length).toBe(1);
  });
  it('validoiKaavio-kutsuja on VP:ssä edelleen tasan yksi (ei rinnakkaista porttia)', () => {
    expect((VP.match(/validoiKaavio\(/g) || []).length).toBe(1);
  });
  it('KPI-lista johdetaan konseptista, ei kovakoodata a–d:ksi', () => {
    const fn = runko('_kaavioUusiKpiPaivita');
    expect(fn).toContain('ots.kpiKoodit');
    expect(fn).not.toMatch(/\['a', ?'b', ?'c', ?'d'\]/);
  });
  it('konseptilista kulkee seurakerroksen läpi (otsikko resolvoituu, erä C)', () => {
    expect(runko('_kaavioUusiKonseptit')).toContain('_ttSeuraLista(');
  });
  it('kaikki uudet näyttötekstit ovat vpT():n läpi ja sv-kartassa', () => {
    const sv = readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8');
    ['Uusi kaavio', 'Konsepti', 'Pelimuoto', 'Näkyvyys', 'Luo ja muokkaa', 'Kaavio luotu luonnoksena'].forEach((k) => {
      expect(VP, k).toContain("vpT('" + k + "')");
      expect(sv, k).toContain("'" + k + "':");
    });
  });
});
