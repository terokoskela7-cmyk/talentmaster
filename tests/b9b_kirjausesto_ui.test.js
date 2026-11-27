/**
 * B9b (PM 3.11.2026, B9 päätös 4): Rules v3.80 hylkää uudet dokumentit perutun suostumuksen pelaajan alikokoelmiin.
 * Kirjauspolut eivät kirjoita perutulle eivätkä niele hylkäystä: ADAR (luonnos + pysyvä palkki + toast), Pikakirjaus (Master/VP:
 * ohitus + määrä toastiin), Testaus_v9 (PHV-historia + pelaajakentät ohitetaan, määrä toastiin). Teksti = B9:n käännetty avain
 * kts_suostumus_peruttu (ei uutta sv-lausetta). Ehto = lib/tm_suostumus.js tmSuostumusPeruttu.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import { createRequire } from 'module';
import { fakeDb } from './_fakeFirestore.mjs';

const req = createRequire(import.meta.url);
const TS = req('../lib/tm_suostumus.js');
const LIBI18N = req('../lib/tm_lib_i18n.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const ADAR = lue('TalentMaster_ADAR_Pikakortti.html'), MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html'), TESTAUS = lue('TalentMaster_Testaus_v9.html'), TT = lue('TalentMaster_Testituonti_Master.html');
function pura(src, tunniste) {
  const i = src.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const PERUTTU = { etunimi: 'Testi', suostumusTila: 'peruttu', suostumus: { annettu: { aika: 'x' }, peruttu: { aika: 'y' } } };
const UUSI_KUTSU = { etunimi: 'Testi', suostumusTila: 'odottaa', suostumus: { peruttu: { aika: 'y' } } };   // peruttu voittaa
const OK = { etunimi: 'Testi', suostumusTila: 'annettu' };

describe('lib/tm_suostumus.js ladataan ennen käyttöä', () => {
  it.each([['ADAR', ADAR, '_adarPeruttu('], ['Master', MASTER, 'lib/tm_pikakirjaus.js'], ['VP', VP, 'lib/tm_pikakirjaus.js'], ['Testaus', TESTAUS, '_v9Peruttu('], ['Testituonti', TT, 'window.TM_SUOSTUMUS.tmSuostumusPeruttu(']])('%s', (_n, src, kaytto) => {
    const i = src.indexOf('<script src="lib/tm_suostumus.js"></script>');
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(src.indexOf(kaytto));
  });
  it('teksti on B9:n käännetty avain (ei uutta sv-lausetta)', () => {
    expect(LIBI18N.tmLibT('kts_suostumus_peruttu', 'sv')).toBeTruthy();
    expect(lue('lib/tm_pikakirjaus.js')).toContain("tmLibT('kts_suostumus_peruttu')) || 'Suostumus peruttu'");
    expect(ADAR).toContain("tmLibT('kts_suostumus_peruttu')) || tmHT('Suostumus peruttu')");   // reititysportti: fi-varateksti tmHT:n kautta
  });
});

describe('ADAR', () => {
  function ctx(map, kieli) {
    const c = { window: { _pelaajaMap: map, TM_SUOSTUMUS: TS, _omatJoukkueet: ['u13'] }, tmHT: (s) => s, _adarNakeeKaikki: () => false,
      tmLibT: (k) => LIBI18N.tmLibT(k, kieli) };
    vm.createContext(c);
    vm.runInContext(pura(ADAR, 'function _adarPeruttu(') + '\n' + pura(ADAR, 'function _adarPeruttuTeksti(') + '\n' + pura(ADAR, 'function _adarEstonSyy('), c);
    return c;
  }
  it('_adarPeruttu + _adarEstonSyy: peruttu-syy ensin (fi + sv), muuten ennallaan', () => {
    const c = ctx({ p1: PERUTTU, p2: UUSI_KUTSU, p3: OK });
    expect(c._adarPeruttu('p1')).toBe(true); expect(c._adarPeruttu('p2')).toBe(true); expect(c._adarPeruttu('p3')).toBe(false); expect(c._adarPeruttu('x')).toBe(false);
    expect(c._adarEstonSyy('p1')).toBe('Suostumus peruttu');
    expect(c._adarEstonSyy('p3')).toBe('Voit havainnoida vain oman joukkueesi pelaajia');
    expect(c._adarEstonSyy()).toBe('Voit havainnoida vain oman joukkueesi pelaajia');
    expect(ctx({ p1: PERUTTU }, 'sv')._adarEstonSyy('p1')).toBe(LIBI18N.tmLibT('kts_suostumus_peruttu', 'sv'));
  });
  it('pelaajakartta kantaa suostumuskentät (peruttu tunnistuu kartasta)', () => {
    const f = pura(ADAR, 'async function _adarLataaPelaajat(');
    expect(f).toContain('suostumusTila: p.suostumusTila || null');
    expect(TS.tmSuostumusPeruttu({ suostumusTila: 'odottaa', suostumus: { peruttu: true } })).toBe(true);
  });
  it('_phTallenna: perutulle EI kirjoitusta — luonnos epaonnistui-tilaan + toast ENNEN kirjoitusta; catch välittää pelaajaId:n', () => {
    const f = pura(ADAR, 'async function _phTallenna(');
    const esto = f.indexOf('if (_adarPeruttu(pelaajaId))');
    expect(esto).toBeGreaterThan(-1);
    expect(esto).toBeLessThan(f.indexOf('_phKirjoitaHavaintoJaPikakentat('));
    expect(esto).toBeLessThan(f.indexOf(".collection('havainnot').doc()"));
    const lohko = f.slice(esto, f.indexOf('return;', esto));
    expect(lohko).toContain("_luonnosMerkitse(pelaajaId, 'epaonnistui', { virhe: _syyP }");
    expect(lohko).toContain("_showToast(");
    expect(f).toContain('_adarEstonSyy(pelaajaId)');
  });
});

describe('Pikakirjaus (lib, Master + VP)', () => {
  const PK = req('../lib/tm_pikakirjaus.js');
  afterEach(() => { delete globalThis.TM_SUOSTUMUS; });
  async function aja(pelaaja) {
    globalThis.TM_SUOSTUMUS = TS;
    const { db, D } = fakeDb({ 'seurat/kpv/pelaajat/p1': pelaaja });
    let virhe = null;
    try { await PK._tallennaPelaajanTulokset(db, 'kpv', 'p1', { pvm: '2026-11-05' }, { lin_30m: 5.1 }, '2026-11-05'); } catch (e) { virhe = e; }
    return { virhe, D };
  }
  it('peruttu → heittää PERUTTU_KOODI ennen batchia (testitulosta ei synny)', async () => {
    for (const p of [PERUTTU, UUSI_KUTSU]) {
      const { virhe, D } = await aja(p);
      expect(virhe && virhe.code).toBe(PK.PERUTTU_KOODI);
      expect([...D.keys()].some((k) => k.includes('testitulokset'))).toBe(false);
    }
  });
  it('ei peruttu → kirjoitus kuten ennen (ei vacuous)', async () => {
    const { virhe, D } = await aja(OK);
    expect(virhe).toBe(null);
    expect([...D.keys()].some((k) => k.includes('testitulokset'))).toBe(true);
  });
  it('_tallenna laskee perutut erikseen, näyttää ne toastissa ja jättää paneelin auki', () => {
    const src = lue('lib/tm_pikakirjaus.js'), f = pura(src, 'async function _tallenna(');
    expect(f).toContain('if (e && e.code === PERUTTU_KOODI) { peruttu++; continue; }');
    expect(f).toContain("(peruttu ? ' · ' + _peruttuTeksti() + ': ' + peruttu : '')");
    expect(f).toContain('if (ok > 0 && !fail && !peruttu) _sulje();');
  });
});

describe('Testaus_v9', () => {
  it('_v9Peruttu ajettuna', () => {
    const c = { window: { TM_SUOSTUMUS: TS } }; vm.createContext(c);
    vm.runInContext(pura(TESTAUS, 'function _v9Peruttu('), c);
    expect(c._v9Peruttu(PERUTTU)).toBe(true); expect(c._v9Peruttu(UUSI_KUTSU)).toBe(true); expect(c._v9Peruttu(OK)).toBe(false); expect(c._v9Peruttu(null)).toBe(false);
  });
  it('valmiiksi-merkintä: perutun pelaajakentät ohitetaan ennen kirjoitusta ja määrä näytetään', () => {
    const f = pura(TESTAUS, 'async function _v6TallennaPelaajienKentat(');
    expect(f.indexOf('if (_v9Peruttu(d)) { tila.peruttu++; continue; }')).toBeGreaterThan(-1);
    expect(f.indexOf('if (_v9Peruttu(d))')).toBeLessThan(f.indexOf('b.update(ref, upd)'));
    expect(TESTAUS).toContain("else if (_kt.peruttu) _toast('⚠ ' + _V9_PERUTTU_TEKSTI + ': ' + _kt.peruttu, 'err');");
  });
  it('valmiiksi-merkintä ajettuna (oikea _v9Peruttu + muistinvarainen Firestore): perutun dokumentti koskematon, toinen päivittyy', async () => {
    const { db, D } = fakeDb({ 'seurat/kpv/pelaajat/a': Object.assign({}, PERUTTU), 'seurat/kpv/pelaajat/b': Object.assign({}, OK) });
    const ctx = { _db: db, _seuraId: 'kpv', console: { warn() {} }, window: { TM_SUOSTUMUS: TS },
      _aktiivinenTapahtuma: { pelaajatData: [{ id: 'a' }, { id: 'b' }] },
      _v6EnnatyksetUpd: () => ({ hh_viimeisin: 3 }), _v6HistoriaUpd: () => ({}), _v6PikakentatUpd: () => ({}) };
    vm.createContext(ctx);
    vm.runInContext(pura(TESTAUS, 'function _v9Peruttu(') + '\n' + pura(TESTAUS, 'async function _v6TallennaPelaajienKentat(') + '\nthis.f = _v6TallennaPelaajienKentat;', ctx);
    expect(await ctx.f()).toEqual({ ok: 1, virhe: 0, ohitettu: 0, peruttu: 1 });
    expect(D.get('seurat/kpv/pelaajat/a').hh_viimeisin).toBeUndefined();
    expect(D.get('seurat/kpv/pelaajat/b').hh_viimeisin).toBe(3);
  });
  it('PHV: perutulle ei biologinen_ika-/sisainen-batchia', () => {
    const f = pura(TESTAUS, 'async function _kasvuTallennaPHV(');
    const i = f.indexOf("if (_v9Peruttu(d)) return 'peruttu';");
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(f.indexOf("collection('biologinen_ika').doc(ops.mittausPvmId)"));
  });
});

describe('Testaus_v9 · tulosrivi (PM 6.11.: testitapahtumat/{tid}/tulokset luontiesto)', () => {
  /* Rules hylkää uuden tulosrivin perutulle; laitteelle tallennettu tulos ei saa jäädä jonoon eikä hylkäys hiljaiseksi. */
  const aja = async (pelaaja) => {
    const toastit = [];
    const ref = (p) => ({ collection: (c) => ({ doc: (id) => ref(p.concat(c, id)) }),
      set: async () => { throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); },
      get: async () => ({ exists: !!pelaaja, data: () => pelaaja }) });
    const ctx = { _db: { collection: (c) => ({ doc: (id) => ref([c, id]) }) }, _seuraId: 'kpv', _tulokset: { a: { lin_30m: 5 } }, Date,
      _aktiivinenTapahtuma: { id: 't1', pelaajatData: [{ id: 'a', etunimi: 'Testi', sukunimi: 'Pelaaja' }] },
      firebase: { firestore: { FieldValue: { serverTimestamp: () => 'ts' } } }, console: { warn() {} }, window: { TM_SUOSTUMUS: TS },
      _V9_PERUTTU_TEKSTI: 'Suostumus peruttu', _toast: (m, t) => toastit.push([m, t]) };
    vm.createContext(ctx);
    vm.runInContext(pura(TESTAUS, 'function _v9Peruttu(') + '\n' + pura(TESTAUS, 'async function _kirjoitaFirestoreTulos(') + '\n' + pura(TESTAUS, 'async function _v9TulosPeruttu(') + '\nthis.f = _kirjoitaFirestoreTulos;', ctx);
    return { tulos: await ctx.f('a'), toastit };
  };
  it('peruttu → \'peruttu\' (tosi: kutsuja poistaa offline-avaimet) + toast syyllä', async () => {
    const r = await aja(Object.assign({}, PERUTTU));
    expect(r.tulos).toBe('peruttu');
    expect(r.toastit).toEqual([['Testi Pelaaja: Suostumus peruttu — tulosta ei tallennettu', 'err']]);
  });
  it('muu permission-denied (ei peruttu / pelaaja puuttuu) → false, jää jonoon kuten ennen', async () => {
    expect(await aja(Object.assign({}, OK))).toEqual({ tulos: false, toastit: [] });
    expect(await aja(null)).toEqual({ tulos: false, toastit: [] });
  });
  it('kutsujat poistavat offline-avaimet totuusarvolla (\'peruttu\' on tosi)', () => {
    expect(pura(TESTAUS, 'function _tallennaTulosKentta(')).toMatch(/_kirjoitaFirestoreTulos\(pelaajaId\)\.then\(ok => \{\s*if \(ok\) \{[^}]*localStorage\.removeItem\(lkey\)/);
  });
});

describe('Testituonti_Master (tulosrivin doc-ID = PalloID → Rules ei näe pelaajaa)', () => {
  const aja = async (pelaaja) => {
    const { db, D } = fakeDb({ 'seurat/kpv/pelaajat/a': Object.assign({ tunniste: '12345678' }, pelaaja) });
    const ctx = { firebase: { firestore: { FieldValue: { serverTimestamp: () => 'ts', delete: () => ({ __poista: true }), arrayUnion: (...x) => x } } }, Date,
      TM_TESTIPAIVA: req('../lib/tm_testipaiva.js'), window: { TM_SUOSTUMUS: TS }, console };
    vm.createContext(ctx);
    vm.runInContext(pura(TT, 'function ttLibTulokset(') + '\n' + pura(TT, 'async function ttTallennaPelaaja(') + '\nthis.f = ttTallennaPelaaja;', ctx);
    const tulos = await ctx.f(db, 'kpv', { id: 'tt1', pvm: '2026-10-03' }, { tunniste: '12345678', testauspvm: '2026-10-03' }, { testit: { kyykky: 3 } }, null);
    return { tulos, rivi: D.get('seurat/kpv/testitapahtumat/tt1/tulokset/12345678') };
  };
  it('peruttu → \'peruttu\', ei tulosriviä', async () => {
    expect(await aja(PERUTTU)).toEqual({ tulos: 'peruttu', rivi: undefined });
    expect((await aja(UUSI_KUTSU)).tulos).toBe('peruttu');
  });
  it('ei peruttu → tallentuu kuten ennen (ei vacuous)', async () => {
    const r = await aja(OK); expect(r.tulos).toBe('ok'); expect(r.rivi.testit).toEqual({ kyykky: 3 });
  });
  it('tarkistus ennen batchia; perutut lasketaan ja näytetään toastissa', () => {
    const f = pura(TT, 'async function ttTallennaPelaaja(');
    expect(f.indexOf("return 'peruttu'")).toBeLessThan(f.indexOf('db.batch()'));
    const t = pura(TT, 'async function tallennaFirestoreen(');
    expect(t).toContain("if (tulos === 'peruttu') { perutut.push(p); continue; }");
    expect(t).toContain('Suostumus peruttu: ${perutut.length} (ei tallennettu)');
  });
});
