/**
 * TalentMaster™ — Taktiikkataulun SISÄÄNKÄYNTI ajetaan oikeasti (entry point -regressio).
 *
 * TAUSTA — MIKSI TÄMÄ TESTI ON OLEMASSA:
 * `_kaavioCtxNyt` luki deklaroimatonta `_rooli`-globaalia → ReferenceError joka kutsulla.
 * avaaKaaviopankki() kutsuu sitä ENSIMMÄISENÄ, joten koko taktiikkataulu oli tuotannossa rikki
 * siitä asti kun se shipattiin. Yksikkötestit vihersivät, koska ne ajoivat puhtaita libejä ja
 * sääntöjä — ja koska render-testien sandbox antoi tuntemattomalle nimelle `undefined`
 * (Proxy-autostub) sen sijaan että olisi heittänyt. Sama mekanismi joka teki harnesseista
 * ajettavia, piilotti tämän vian.
 *
 * SIKSI TÄMÄ SANDBOX EI STUBBAA TUNTEMATTOMIA NIMIÄ. Siinä on VAIN ne globaalit jotka oikealla
 * sivulla on. Jos koodi viittaa nimeen jota ei ole, testi heittää — kuten selain.
 *
 *   A) SISÄÄNKÄYNTI — avaaKaaviopankki ajetaan läpi neljällä roolilla, ei heitä
 *   B) LUONTIPORTTI — nappi näkyy oikeilla rooleilla renderöidyssä HTML:ssä
 *   C) VARTIJA — kaaviokoodissa ei bare-globaaleja joita ei ole deklaroitu
 *   D) NIMI — Taktiikkataulu fi/sv, ei näkyvää "Kaaviopankki"-tekstiä
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const RIVIT = VP.split('\n');

const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('funktiota ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulkua ei löytynyt: ' + nimi);
};
const rivi = (alku) => {
  const l = RIVIT.find((x) => x.startsWith(alku));
  if (!l) throw new Error('riviä ei löytynyt: ' + alku);
  return l;
};

/* Minimaalinen DOM + Firestore. EI Proxy-fallbackia: deklaroimaton nimi → ReferenceError. */
function sivu({ rooli, sa, kaaviot }) {
  const shim = { window: {}, console };
  vm.createContext(shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_i18n_common.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_teknistaktiset_sv.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_konsepti_resolve.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_kaavio_konsepti.js'), 'utf8'), shim);
  vm.runInContext(readFileSync(join(ROOT, 'lib', 'tm_kaavio_policy.js'), 'utf8'), shim);

  const ulos = { html: '', toastit: [] };
  const snap = (arr) => ({ forEach: (f) => arr.forEach((d) => f({ id: d.id, data: () => d })) });
  const db = {
    collection: (nimi) => ({
      get: async () => snap(nimi === 'kaaviot' ? [] : []),
      doc: () => ({ collection: () => ({ get: async () => snap(kaaviot || []) }) })
    })
  };
  const sb = {
    console, Math, JSON, String, Number, Object, Array, Boolean, Promise, Date, RegExp,
    _seuraId: 'seuraA', _uid: 'u1', _isDemoMode: false, db,
    toast: (t) => ulos.toastit.push(t),
    document: {
      getElementById: () => null,
      body: { insertAdjacentHTML: (_, h) => { ulos.html += h; } }
    },
    _vpTaksLang: () => 'fi',
    _ttSeuraId: () => 'seuraA',
    _kaavioPiirraEsikatselu: () => {},
    _tmIBtn: () => ''
  };
  sb.window = { _vpRooli: rooli || undefined, _vpSA: !!sa, _omatJoukkueet: [], db };
  ['TM_TT_YOUTH', 'TM_TT_JOUKKUE', 'TM_TT_FUNDAMENTIT', 'TM_TT_SV'].forEach((k) => { sb[k] = shim[k]; });
  Object.keys(shim).filter((k) => /^(tmKonsepti|kaavio|TM_K_)/.test(k)).forEach((k) => { sb[k] = shim[k]; });
  sb.vpT = shim.window.vpT;
  vm.createContext(sb);

  const src = [
    rivi('var _kaavioTila = {'),
    rivi('var _KAAVIO_PELIMUODOT'),
    rivi('function _jsvEsc('),
    rivi('function _ttKopio('),
    rivi('function _ttSvKartta('),
    rivi('function _ttSvPaalla('),
    rivi('var _TT_TEKSTIKENTAT ='),
    runko('_ttSv'), runko('_ttResolvoi'), runko('_ttKonsepti'),
    runko('_kaavioCtxNyt'), runko('_kaavioLang'),
    runko('_kaavioKonsepti'), runko('_kaavioOtsikko'),
    runko('_kaavioTilaLbl'), runko('_kaavioNakyvyysLbl'),
    runko('_kaavioNappiHTML'), runko('_kaavioKorttiHTML'),
    runko('_kaavioUusiNappiHTML'),
    runko('avaaKaaviopankki')
  ].join('\n');
  vm.runInContext(src + '\nthis.avaa = avaaKaaviopankki; this.ctx = _kaavioCtxNyt;', sb);
  return { sb, ulos };
}
const avaaJaLue = async (opts) => {
  const { sb, ulos } = sivu(opts);
  await sb.avaa();
  return ulos.html;
};
const KAAVIO = { id: 'k1', spec: { avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8', pelaajat: [{ id: 'P1', joukkue: 'oma', rooli: 'tuki', x: 50, y: 50 }] },
                 review: { status: 'hyvaksytty', nakyvyys: 'seura', versio: 1 } };

describe('A — sisäänkäynti ajetaan läpi, ei heitä', () => {
  it('EI-VACUOUS: sandbox EI stubbaa tuntematonta nimeä (muuten koko testi olisi tyhjä)', () => {
    // vm-kontekstilla on oma realm → instanceof ei kanna rajan yli; tunnistetaan nimestä.
    const sb = {}; vm.createContext(sb);
    let virhe = null;
    try { vm.runInContext('_eiOleOlemassa || null', sb); } catch (e) { virhe = e; }
    expect(virhe && virhe.name).toBe('ReferenceError');
  });
  it('_kaavioCtxNyt EI heitä vaikka _vpRooli olisi määrittelemättä', () => {
    const { sb } = sivu({ rooli: undefined });
    expect(() => sb.ctx()).not.toThrow();
    expect(sb.ctx().rooli).toBe(null);
  });
  for (const [nimi, opts] of [
    ['super_admin', { rooli: 'super_admin', sa: true }],
    ['vp', { rooli: 'vp' }],
    ['valmentaja', { rooli: 'valmentaja' }],
    ['seurasihteeri', { rooli: 'seurasihteeri' }],
    ['ei roolia', { rooli: undefined }]
  ]) {
    it(`avaaKaaviopankki renderöi modaalin roolilla: ${nimi}`, async () => {
      const html = await avaaJaLue(opts);
      expect(html).toContain('id="_kvModal"');
      expect(html).toContain('Taktiikkataulu');
    });
  }
  it('renderöi myös kun kaavioita ON (korttipolku ei heitä)', async () => {
    const html = await avaaJaLue({ rooli: 'vp', kaaviot: [KAAVIO] });
    expect(html).toContain('_kvEsik0');
    expect(html).toContain('HAVAINNOINTI');       // otsikko resolvoituu (erä C)
  });
  it('tyhjä tila renderöityy eikä kaadu', async () => {
    const html = await avaaJaLue({ rooli: 'vp' });
    expect(html).toContain('Ei kaavioita vielä.');
  });
});

describe('B — luontiportti oikealla roolilla renderöidyssä HTML:ssä', () => {
  const nappi = (h) => h.includes('_kaavioUusiLomake()');
  it('super_admin näkee "Uusi kaavio"', async () => expect(nappi(await avaaJaLue({ rooli: 'super_admin', sa: true }))).toBe(true));
  it('vp näkee', async () => expect(nappi(await avaaJaLue({ rooli: 'vp' }))).toBe(true));
  it('valmentaja näkee', async () => expect(nappi(await avaaJaLue({ rooli: 'valmentaja' }))).toBe(true));
  it('seurasihteeri EI näe', async () => expect(nappi(await avaaJaLue({ rooli: 'seurasihteeri' }))).toBe(false));
  it('rooliton EI näe', async () => expect(nappi(await avaaJaLue({ rooli: undefined }))).toBe(false));
  // Nappi on KAHDESSA sijainnissa (otsikkorivi + tyhjä tila). Pelkkä "esiintyy jossain"
  // -väite ei erota niitä: toisen poisto jäisi huomaamatta. Siksi molemmat todistetaan
  // erikseen tilanteessa jossa vain se voi renderöityä.
  it('nappi näkyy OTSIKKORIVILLÄ kun kaavioita on (tyhjä tila ei renderöidy)', async () => {
    const html = await avaaJaLue({ rooli: 'valmentaja', kaaviot: [KAAVIO] });
    expect(html).not.toContain('Ei kaavioita vielä.');
    expect(nappi(html)).toBe(true);
    const i = html.indexOf('kaaviota</div>');          // otsikkorivin laskuri
    expect(html.slice(Math.max(0, i - 200), i + 300)).toContain('_kaavioUusiLomake()');
  });
  it('nappi näkyy MYÖS tyhjässä tilassa (siellä sitä eniten tarvitaan)', async () => {
    const html = await avaaJaLue({ rooli: 'valmentaja' });
    const i = html.indexOf('Ei kaavioita vielä.');
    expect(html.slice(i, i + 400)).toContain('_kaavioUusiLomake()');
  });
});

describe('C — vartija: ei deklaroimattomia bare-globaaleja kaaviokoodissa', () => {
  it('_kaavioCtxNyt lukee window._vpRooli:a, ei bare-_rooli:a', () => {
    const fn = runko('_kaavioCtxNyt');
    expect(fn).toContain('window._vpRooli');
    expect(fn).not.toMatch(/(^|[^.\w])_rooli\b/m);
  });
  it('_rooli-globaalia ei ole deklaroitu missään → bare-viittaus olisi aina bugi', () => {
    expect(VP).not.toMatch(/^\s*(var|let|const)\s+_rooli\b/m);
    expect(VP).not.toMatch(/window\._rooli\s*=/);
  });
  it('kaaviolohkossa ei bare-_rooli-viittauksia', () => {
    const i = VP.indexOf('function _kaavioCtxNyt'), j = VP.indexOf('window.avaaKaaviopankki =');
    const lohko = VP.slice(i, j).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(lohko).not.toMatch(/(^|[^.\w])_rooli\b/m);
  });
});

describe('D — nimi on Taktiikkataulu', () => {
  it('sivupalkki ja modaali näyttävät Taktiikkataulun', () => {
    expect(VP).toContain('data-i18n="Taktiikkataulu">Taktiikkataulu<');
    expect(VP).toContain("vpT('Taktiikkataulu')");
  });
  it('näkyvää "Kaaviopankki"-tekstiä ei ole jäljellä (sisäiset tunnisteet saavat jäädä)', () => {
    const naytto = [...VP.matchAll(/>([^<>{}$]*Kaaviopankki[^<>{}$]*)</g)].map((m) => m[1]);
    expect(naytto).toEqual([]);
    expect(VP).not.toMatch(/vpT\('Kaaviopankki'\)/);
    expect(VP).toContain('function avaaKaaviopankki(');   // sisäinen nimi ennallaan
  });
  it('sv: Taktiktavla', async () => {
    const sv = readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8');
    expect(sv).toContain("'Taktiikkataulu': 'Taktiktavla',");
    expect(sv).toMatch(/'Taktiikkataulu — teknis-taktiset kuvat, katselmus ja hyväksyntä':/);
  });
});
