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
// TAKTIIKKATAULUN UI ON NYT JAETUSSA LIBISSÄ (lib/tm_kaavio_ui.js) — sama koodi ajaa VP:ssä ja
// valmentajan apissa. Siksi UI:ta koskevat väitteet luetaan LIBISTÄ; `VP` jää niihin väitteisiin
// jotka koskevat nimenomaan VP:n omaa kytkentää (script-tagit, host-adapteri, sivupalkki).
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');
const RIVIT = UI.split('\n');

const runko = (nimi) => {
  const a = RIVIT.findIndex((l) => new RegExp('^(?:async\\s+)?function ' + nimi + '\\s*\\(').test(l));
  if (a < 0) throw new Error('funktiota ei löytynyt: ' + nimi);
  for (let i = a + 1; i < RIVIT.length; i++) if (RIVIT[i] === '}') return RIVIT.slice(a, i + 1).join('\n');
  throw new Error('sulkua ei löytynyt: ' + nimi);
};

const LIBIT = [
  'tm_i18n_common.js', 'tm_vp_i18n.js', 'tm_teknistaktiset.js', 'tm_teknistaktiset_sv.js',
  'tm_konsepti_resolve.js', 'tm_kaavio_konsepti.js', 'tm_kaavio_policy.js',
  'tm_kaavio_editori.js', 'tm_kaavio_validate.js', 'tm_kaavio_render.js', 'tm_kaavio_ui.js'
];

/* Minimaalinen DOM + Firestore. EI Proxy-fallbackia: deklaroimaton nimi → ReferenceError.
   UI-lib ajetaan KOKONAISENA — ei funktio viipaleina lähdetiedostosta. Se on sekä rehellisempi
   (selain lataa saman tiedoston) että kestävämpi: viipalointi rikkoutui joka kerta kun koodi
   liikkui. Host-adapteri on tässä sama sopimus jonka VP_v25 asettaa. */
function sivu({ rooli, sa, kaaviot }) {
  const ulos = { html: '', toastit: [] };
  const snap = (arr) => ({ forEach: (f) => arr.forEach((d) => f({ id: d.id, data: () => d })) });
  const db = {
    collection: (nimi) => ({
      get: async () => snap(nimi === 'kaaviot' ? [] : []),
      doc: () => ({ collection: () => ({ get: async () => snap(kaaviot || []) }) })
    })
  };
  const sb = {
    console, Math, JSON, String, Number, Object, Array, Boolean, Promise, Date, RegExp, Error,
    setTimeout, clearTimeout, parseFloat, parseInt, isNaN,
    document: {
      getElementById: () => null,
      body: { insertAdjacentHTML: (_, h) => { ulos.html += h; } }
    }
  };
  sb.window = {};
  vm.createContext(sb);
  LIBIT.forEach((f) => vm.runInContext(readFileSync(join(ROOT, 'lib', f), 'utf8'), sb));

  sb.window.TM_KAAVIO_HOST = {
    db,
    t: (fi) => (typeof sb.window.vpT === 'function' ? sb.window.vpT(fi) : fi),
    lang: () => 'fi',
    toast: (v) => ulos.toastit.push(v),
    ctx: () => ({
      rooli: rooli || null, uid: 'u1', seuraId: 'seuraA',
      joukkueet: [], superAdmin: !!sa || rooli === 'super_admin', anon: false
    })
  };
  vm.runInContext('this.avaa = avaaKaaviopankki; this.ctx = _kaavioCtxNyt;', sb);
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
  // Rooli ei enää tule libistä vaan HOST-ADAPTERISTA (lib on jaettu kahden apin kesken, eikä se
  // saa tuntea VP:n globaaleja). Väite jakautuu siksi kahtia: lib ei viittaa mihinkään rooli-
  // globaaliin, ja VP:n adapteri lukee oikeaa nimeä (window._vpRooli).
  it('lib ei lue rooli-globaalia suoraan — se tulee host-adapterista', () => {
    const fn = runko('_kaavioCtxNyt');
    expect(fn).toContain('_kuiCtx()');
    expect(fn).not.toMatch(/(^|[^.\w])_rooli\b/m);
    const koodi = UI.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(koodi).not.toMatch(/window\._vpRooli/);
  });
  it('VP:n host-adapteri lukee window._vpRooli:a, ei bare-_rooli:a', () => {
    const i = VP.indexOf('window.TM_KAAVIO_HOST = {');
    expect(i).toBeGreaterThan(-1);
    const adapteri = VP.slice(i, VP.indexOf('\n  };', i));
    expect(adapteri).toContain('window._vpRooli');
    expect(adapteri).not.toMatch(/(^|[^.\w])_rooli\b/m);
  });
  it('_rooli-globaalia ei ole deklaroitu missään → bare-viittaus olisi aina bugi', () => {
    expect(UI + VP).not.toMatch(/^\s*(var|let|const)\s+_rooli\b/m);
    expect(UI + VP).not.toMatch(/window\._rooli\s*=/);
  });
  it('kaaviolohkossa ei bare-_rooli-viittauksia', () => {
    const i = UI.indexOf('function _kaavioCtxNyt'), j = UI.indexOf('window.avaaKaaviopankki =');
    const lohko = UI.slice(i, j).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(lohko).not.toMatch(/(^|[^.\w])_rooli\b/m);
  });
});

describe('D — nimi on Taktiikkataulu', () => {
  it('sivupalkki ja modaali näyttävät Taktiikkataulun', () => {
    expect(VP).toContain('data-i18n="Taktiikkataulu">Taktiikkataulu<');   // sivupalkki (VP)
    expect(UI).toContain("_kuiT('Taktiikkataulu')");                       // modaalin otsikko (jaettu lib)
  });
  it('näkyvää "Kaaviopankki"-tekstiä ei ole jäljellä (sisäiset tunnisteet saavat jäädä)', () => {
    const naytto = [...VP.matchAll(/>([^<>{}$]*Kaaviopankki[^<>{}$]*)</g)].map((m) => m[1]);
    expect(naytto).toEqual([]);
    expect(VP).not.toMatch(/vpT\('Kaaviopankki'\)/);
    expect(UI).not.toMatch(/_kuiT\('Kaaviopankki'\)/);
    expect(UI).toContain('function avaaKaaviopankki(');   // sisäinen nimi ennallaan
  });
  it('sv: Taktiktavla', async () => {
    const sv = readFileSync(join(ROOT, 'lib', 'tm_vp_i18n.js'), 'utf8');
    expect(sv).toContain("'Taktiikkataulu': 'Taktiktavla',");
    expect(sv).toMatch(/'Taktiikkataulu — teknis-taktiset kuvat, katselmus ja hyväksyntä':/);
  });
});
