/**
 * TalentMaster™ — Taktiikkataulu valmentajan apissa (Master_v16), JAETTUNA UI-libinä.
 *
 * Valmentaja on kaavioiden ensisijainen piirtäjä, mutta työkalu oli vain VP:llä. Ratkaisu EI ole
 * kopio: molemmat apit lataavat saman lib/tm_kaavio_ui.js:n ja eroavat vain HOST-ADAPTERISSA.
 * Tämä sviitti vartioi juuri sitä rajapintaa — kopio ei ole kopio vain siksi että sanotaan niin.
 *
 *   A) YKSI LÄHDE — molemmat apit lataavat saman libin, kumpikaan ei sisällä sen koodia
 *   B) ADAPTERISOPIMUS — molemmat toteuttavat saman avainjoukon, Master oikeilla globaaleillaan
 *   C) DESIGN-TOKENIT — .tm-kaavio on määritelty, arvot identtiset VP/Pelaaja kanssa
 *   D) SISÄÄNKÄYNTI — sivupalkissa, ilman kovakoodattua roolivartijaa (portti on policy)
 *   E) AJO — Masterin adapteri ajetaan oikeasti libin kanssa: avaaKaaviopankki ei heitä
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const M = readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');

const LIBIT = ['tm_kaavio_render.js', 'tm_kaavio_policy.js', 'tm_kaavio_validate.js',
               'tm_kaavio_editori.js', 'tm_kaavio_konsepti.js', 'tm_kaavio_ui.js'];

describe('A — yksi lähde, ei kopiota', () => {
  for (const lib of LIBIT) {
    it(`Master lataa lib/${lib}`, () => expect(M).toMatch(new RegExp('src="lib/' + lib.replace('.', '\\.') + '\\?v=\\d+"')));
  }
  it('UI-lib ladataan VASTA host-adapterin jälkeen (adapteri luetaan latausaikana)', () => {
    const a = M.indexOf('window.TM_KAAVIO_HOST = {');
    const b = M.indexOf('src="lib/tm_kaavio_ui.js');
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
  });
  it('kumpikaan appi ei sisällä UI:n koodia inlinenä (kopiovartija)', () => {
    // Ankkurit libin sisältä: jos ne esiintyvät HTML:ssä, koodi on kopioitu takaisin.
    ['function avaaKaaviopankki(', 'function _kaavioAvaaEditori(', 'async function _kaavioTallenna(']
      .forEach((a) => {
        expect(UI, a).toContain(a);
        expect(M, a).not.toContain(a);
        expect(VP, a).not.toContain(a);
      });
  });
});

describe('B — adapterisopimus on sama molemmissa', () => {
  const adapteri = (src) => {
    const i = src.indexOf('window.TM_KAAVIO_HOST = {');
    expect(i).toBeGreaterThan(0);
    return src.slice(i, src.indexOf('\n};', i));
  };
  const avaimet = (lohko) => [...lohko.matchAll(/^\s{2}(?:get\s+)?([a-zA-Z]+)\s*[:(]/gm)].map((m) => m[1]).sort();
  it('molemmat toteuttavat saman avainjoukon', () => {
    expect(avaimet(adapteri(M))).toEqual(avaimet(adapteri(VP)));
  });
  it('lib kysyy VAIN näitä avaimia (sopimus ei ole vajaa)', () => {
    // sekä `var h = _kuiHost(); h.x` että suora `_kuiHost().x`
    const kysytyt = [...UI.matchAll(/(?:\bh|_kuiHost\(\))\.([a-zA-Z]+)\b/g)].map((m) => m[1]);
    expect([...new Set(kysytyt)].sort()).toEqual(avaimet(adapteri(M)));
  });
  it('Master lukee OMAT globaalinsa, ei VP:n', () => {
    const a = adapteri(M);
    expect(a).toContain('_db');            // VP: db
    expect(a).toContain('masterT');        // VP: vpT
    expect(a).toContain('_mSeuraId()');
    expect(a).not.toMatch(/_vpRooli|vpT\(/);
  });
  it('Masterin toast-sovitin pudottaa 2. argumentin (se on siellä UNDO-avain, ei tyyppi)', () => {
    expect(adapteri(M)).toMatch(/toast: function \(v\) \{[^}]*toast\(v, null\)/);
    expect(M).toMatch(/function toast\(msg, actionKey\)/);   // premissi: sopimus tosiaan eroaa
  });
});

describe('C — design-tokenit (muuten SVG on näkymätön)', () => {
  const lohko = (src) => {
    const i = src.indexOf('.tm-kaavio {');
    expect(i).toBeGreaterThan(0);
    return src.slice(i, src.indexOf('}', i));
  };
  const tokenit = (s) => Object.fromEntries([...s.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  it('renderöijän JOKAINEN token on määritelty Masterissa', () => {
    const kaytetyt = [...new Set([...readFileSync(join(ROOT, 'lib', 'tm_kaavio_render.js'), 'utf8')
      .matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]))];
    const m = tokenit(lohko(M));
    expect(kaytetyt.filter((t) => !(t in m))).toEqual([]);
  });
  it('arvot ovat IDENTTISET VP:n ja Pelaajan kanssa (sama kuva kolmessa apissa)', () => {
    expect(tokenit(lohko(M))).toEqual(tokenit(lohko(VP)));
    expect(tokenit(lohko(M))).toEqual(tokenit(lohko(PEL)));
  });
  it('light-teemalla oma override (muuten kaavio katoaa vaalealla pinnalla)', () => {
    expect(M).toContain(':root[data-theme="light"] .tm-kaavio {');
  });
  it('UI:n chrome-tokenit on aliasoitu Masterin omiin (--border/--surface/--ov-1)', () => {
    ['--border', '--surface', '--ov-1'].forEach((t) => expect(M, t).toContain(t + ':'));
  });
});

describe('D — sisäänkäynti sivupalkissa, portti policyssä', () => {
  const rivi = M.split('\n').find((l) => l.includes('onclick="avaaKaaviopankki()"'));
  it('sivupalkin kohta on olemassa ja käännettävissä', () => {
    expect(rivi).toBeTruthy();
    expect(M).toContain('data-i18n="Taktiikkataulu">Taktiikkataulu<');
  });
  it('EI kovakoodattua roolivartijaa sisäänkäynnissä', () => {
    expect(rivi).not.toMatch(/_rooli|_superAdmin|rooli ===/);
  });
});

describe('E — Masterin adapteri AJETAAN libin kanssa', () => {
  // Sama periaate kuin entry point -testissä: sandbox EI stubbaa tuntematonta nimeä.
  // Adapterin runko luetaan Masterin lähteestä — kopio testissä ei todistaisi mitään.
  const aja = ({ rooli, sa, joukkueet }) => {
    const ulos = { html: '', toastit: [] };
    const snap = (arr) => ({ forEach: (f) => arr.forEach((d) => f({ id: d.id, data: () => d })) });
    const _db = { collection: () => ({
      get: async () => snap([]),
      doc: () => ({ collection: () => ({ get: async () => snap([]) }) })
    }) };
    const sb = {
      console, Math, JSON, String, Number, Object, Array, Boolean, Promise, Date, RegExp, Error,
      setTimeout, clearTimeout, parseFloat, parseInt, isNaN,
      document: { getElementById: () => null, body: { insertAdjacentHTML: (_, h) => { ulos.html += h; } } },
      _db, _rooli: rooli || null, _uid: 'u1', _joukkue: '', _superAdmin: !!sa, _demo: false, _seuraId: 'seuraA',
      masterT: (fi) => fi,
      tmNykyinenKieli: () => 'fi',
      toast: (v) => ulos.toastit.push(v),
      _mSeuraId: () => 'seuraA'
    };
    sb.window = { _valmentajaData: { joukkueet: joukkueet || [] } };
    vm.createContext(sb);
    ['tm_teknistaktiset.js', 'tm_konsepti_resolve.js', ...LIBIT]
      .forEach((f) => vm.runInContext(readFileSync(join(ROOT, 'lib', f), 'utf8'), sb));
    const i = M.indexOf('window.TM_KAAVIO_HOST = {');
    vm.runInContext(M.slice(i, M.indexOf('\n};', i) + 3), sb);
    vm.runInContext('this.avaa = avaaKaaviopankki; this.ctx = _kaavioCtxNyt;', sb);
    return { sb, ulos };
  };

  it('ctx johtuu Masterin globaaleista', () => {
    const { sb } = aja({ rooli: 'valmentaja', joukkueet: ['u13'] });
    expect(sb.ctx()).toEqual({ rooli: 'valmentaja', uid: 'u1', seuraId: 'seuraA', joukkueet: ['u13'], superAdmin: false, anon: false });
  });
  it('ei heitä vaikka kirjautuminen olisi kesken (globaalit tyhjiä)', () => {
    const { sb } = aja({ rooli: undefined });
    expect(() => sb.ctx()).not.toThrow();
    expect(sb.ctx().rooli).toBe(null);
  });
  for (const [nimi, o] of [['valmentaja', { rooli: 'valmentaja' }], ['talenttivalmentaja', { rooli: 'talenttivalmentaja' }],
                           ['super_admin', { rooli: 'super_admin', sa: true }], ['ei roolia', { rooli: undefined }]]) {
    it(`avaaKaaviopankki renderöi roolilla: ${nimi}`, async () => {
      const { sb, ulos } = aja(o);
      await sb.avaa();
      expect(ulos.html).toContain('id="_kvModal"');
      expect(ulos.html).toContain('Taktiikkataulu');
    });
  }
  it('luontiportti seuraa policya myös Masterissa (valmentaja saa, rooliton ei)', async () => {
    const nappi = async (o) => { const { sb, ulos } = aja(o); await sb.avaa(); return ulos.html.includes('_kaavioUusiLomake()'); };
    expect(await nappi({ rooli: 'valmentaja' })).toBe(true);
    expect(await nappi({ rooli: undefined })).toBe(false);
  });
});
