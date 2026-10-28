/* K3b · lib/tm_idp_lomake.js (pure): D104-sääntö, kentät luonnokseen, ehdotus, kirjoitus (transaktio, vuodenvaihde A3), lataus, sheet-HTML. Vain keksityt nimet. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
require('../lib/tm_sisainen.js').RYHMAT.henkilokunta.kirjoitus = false;   // lipun käännön jälkeen: tämä testi koskee vanhaa (pelaajadokumentti-)polkua; sisainen-polku: tests/sisainen_henkilokunta*.test.js
const L = require('../lib/tm_idp_lomake.js'), I = require('../lib/tm_idp.js'), TAKS = require('../lib/tm_arviointi_taksonomia.js');
const NYT = new Date('2026-10-19T06:00:00.000Z');
const T = (o) => ({ status: 'ehdotettu', fokus: { alue: 'acceleration', dim: 'D1', nimi: 'Kiihdytys' }, mittari: { testId: 'sprint10', yksikko: 's', suunta: 'pienempi' }, lahto: { arvo: 2.1, pvm: '2026-06-05' }, tavoitearvo: 1.9, kuvaus: '', pelaajan_tavoite: '', luotu: '2026-10-01T10:00:00.000Z', arviot: [], ...(o || {}) });

describe('D104: lähtötaso vain jos mitattu', () => {
  it('mitattu (yksikkö + arvo + päivä) → lähtö ja tavoite lukuna; havaintomittari (taso) ja vapaa → ei lukua vaikka tallennettu lahto.arvo ja tavoitearvo (taso+1) on', () => {
    expect(L.tmIdpLahtoTaso(T())).toEqual({ mittari: 's', lahto: { arvo: 2.1, yks: 's', pvm: '2026-06-05' }, tavoite: { arvo: 1.9, yks: 's' } });
    expect(L.tmIdpLahtoTaso(T({ mittari: { yksikko: 'taso' }, lahto: { arvo: 2, pvm: '2026-06-05' }, tavoitearvo: 3 }))).toEqual({ mittari: 'taso', lahto: null, tavoite: null });
    expect(L.tmIdpLahtoTaso(T({ mittari: { yksikko: 'vapaa' }, lahto: { arvo: null, pvm: null }, tavoitearvo: null }))).toEqual({ mittari: 'vapaa', lahto: null, tavoite: null });
    expect(L.tmIdpLahtoTaso(T({ lahto: { arvo: null, pvm: null } }))).toMatchObject({ lahto: null, tavoite: null });   // mitattava mittari mutta ei mittausta
    expect(L.tmIdpLahtoTaso(T({ lahto: { arvo: 2.1, pvm: null } }))).toMatchObject({ lahto: null });   // ei päivää → ei "mitattu"
    expect(L.tmIdpLahtoTaso(null)).toBeNull();
  });
  it('sheet-HTML: taso-mittarilla ei yhtään lukua lähtötasosta/tavoitteesta eikä lukukenttää; mitatulla lähtö + tavoitearvo-kenttä; ei mitattua → "ei ole vielä mitattu"', () => {
    const c = { esc: (s) => String(s), t: (k) => k, src: { tmTeemat: TAKS.tmTeemat, tmTeemaKohteet: TAKS.tmTeemaKohteet, tmTaksonomiaByAvain: TAKS.tmTaksonomiaByAvain }, fn: { teema: 'a', fokus: 'b', vapaa: 'c' }, ehdotaFn: 'e', tallennaFn: 'f' };
    const h = (t) => L.tmIdpLomakeSheetHTML({ p: { id: 'p1' }, tavoite: t }, c);
    const taso = h(T({ mittari: { yksikko: 'taso' }, lahto: { arvo: 2, pvm: '2026-06-05' }, tavoitearvo: 3, fokus: { alue: 'balance', dim: 'D1', nimi: 'Tasapaino' } }));
    expect(taso).not.toMatch(/_mktTavArvo|Lähtötaso:|2026-06-05|5\.6\.|>3</); expect(taso).toContain('data-kv-lahto></div>');
    const mit = h(T()); expect(mit).toContain('_mktTavArvo'); expect(mit).toContain('value="1.9"'); expect(mit).toContain('Lähtötaso: 2.1 s (mitattu 5.6.).');
    expect(h(T({ lahto: { arvo: null, pvm: null } }))).toContain('Lähtötasoa ei ole vielä mitattu.');
    expect(h(null)).toContain('data-kv-ei-tavoitetta'); expect(h(null)).not.toContain('data-kv-tallenna'); expect(h(T())).toContain('Aktivoi tavoite'); expect(h(T({ status: 'aktiivinen' }))).toContain('>Tallenna<');
    expect(L.tmIdpLomakeSheetHTML({ lataa: true }, c)).toContain('data-kv-tila="lataa"'); expect(L.tmIdpLomakeSheetHTML({ virhe: true }, c)).toContain('data-kv-tila="virhe"');
    expect(L.tmIdpLomakeSheetHTML({ p: { id: 'p1' }, tavoite: T({ fokus: { nimi: '<img onerror=1>' } }) }, { ...c, esc: (s) => String(s).replace(/</g, '&lt;') })).not.toContain('<img');
  });
});
describe('kentät ja logiikka (sama kuin Master)', () => {
  it('tmIdpKaytaKentat: vain annetut kentät; aktivointi asettaa hyvaksytty + omistaja; null-kenttä ei yliaja', () => {
    const t = T({ pelaajan_tavoite: 'vanha', kuvaus: 'vanha kuvaus', tavoitearvo: 1.9 });
    L.tmIdpKaytaKentat(t, { aani: null, kuvaus: 'uusi', tavoitearvo: null }, null, NYT); expect(t).toMatchObject({ pelaajan_tavoite: 'vanha', kuvaus: 'uusi', tavoitearvo: 1.9, status: 'ehdotettu' }); expect(t.hyvaksytty).toBeUndefined();
    L.tmIdpKaytaKentat(t, { aani: 'oma', tavoitearvo: 1.7 }, 'aktiivinen', NYT); expect(t).toMatchObject({ pelaajan_tavoite: 'oma', tavoitearvo: 1.7, status: 'aktiivinen', hyvaksytty: NYT.toISOString(), omistaja: 'yhdessa' });
  });
  it('tmIdpLueKentat: puuttuva kenttä → null, tyhjä tavoitearvo → null, välilyönnit trimmataan', () => {
    const el = { _mktTavAani: { value: '  oma  ' }, _mktTavArvo: { value: '' } }; expect(L.tmIdpLueKentat({ getElementById: (i) => el[i] || null })).toEqual({ aani: 'oma', kuvaus: null, tavoitearvo: null });
    expect(L.tmIdpLueKentat({ getElementById: () => ({ value: '1.5' }) }).tavoitearvo).toBe(1.5);
  });
  it('tmIdpAsetaFokus / VapaaFokus / Ehdota rakentavat tavoitteen tm_idp-moottorilla (havaittu → taso-mittari; vapaa → yksikkö vapaa, ei tavoitearvoa)', () => {
    const c = { g: { tmTaksonomiaByAvain: TAKS.tmTaksonomiaByAvain }, ikaSp: () => ({ ika: 13, sp: 'M' }), nyt: () => NYT }, p = { id: 'p1', arviointi_havaittu: { balance: 1 } };
    const t = L.tmIdpAsetaFokus(p, 'balance', 'kuvaus', c); expect(t).toMatchObject({ status: 'ehdotettu', fokus: { alue: 'balance' }, mittari: { yksikko: 'taso' }, kuvaus: 'kuvaus' }); expect(L.tmIdpLahtoTaso(t).lahto).toBeNull();
    const v = L.tmIdpVapaaFokus(p, ' Oma ', '', 'D2', c); expect(v).toMatchObject({ fokus: { nimi: 'Oma', vapaa: true, dim: 'D2' }, mittari: { yksikko: 'vapaa' }, tavoitearvo: null }); expect(L.tmIdpVapaaFokus(p, '  ', '', null, c)).toBeNull();
    const e = L.tmIdpEhdota(p, {}, c); expect(e.tavoite.fokus.alue).toBe('balance'); expect(e.ehdotusIdx).toBe(0); expect(e.valitseFokus).toBe(true);   // yksi kandidaatti → korostetaan fokuksen valinta
    expect(L.tmIdpEhdota({ id: 'p9' }, {}, c)).toBeNull();
  });
  it('tmIdpOpts: sama opts kuin Masterin _mIdpOpts (ika/sp, ehdotusIdx, spTk P/T)', () => {
    const o = L.tmIdpOpts({ id: 'p1' }, 2, { ikaSp: () => ({ ika: 12, sp: 'N' }), nyt: () => NYT, g: { tmAdarHavaittu: () => null } }); expect(o).toMatchObject({ ika: 12, sp: 'N', spTk: 'T', ehdotusIdx: 2, nyt: NYT }); expect(typeof o.tmAdarHavaittu).toBe('function');
    expect(L.tmIdpOpts({ id: 'p1' }, 0, { ikaSp: () => ({ ika: 12, sp: 'M' }) }).spTk).toBe('P');
  });
});
/* Muistissa oleva Firestore: doc/collection/get/set/runTransaction */
function db(dokit) {
  const kirj = [], ref = (path) => ({ path, get: async () => ({ exists: dokit[path] !== undefined, data: () => JSON.parse(JSON.stringify(dokit[path])) }), set: async (v, o) => { kirj.push({ path, v: JSON.parse(JSON.stringify(v)), o }); dokit[path] = o && o.merge ? { ...(dokit[path] || {}), ...v } : v; }, collection: (c) => col(path + '/' + c) }), col = (path) => ({ doc: (id) => ref(path + '/' + id) });
  return { kirj, collection: (c) => col(c), runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, v, o) => r.set(v, o) }) };
}
const PK = 'seurat/demo/pelaajat/p1';
describe('lataus ja kirjoitus (idp_kausi, A3)', () => {
  it('lataa: luonnos ja voimassa oleva erikseen; ankkurit osoittavat omiin dokkeihinsa; ei dataa → null', async () => {
    const d = db({ [PK + '/idp_kausi/2026']: { tavoitteet: [T({ status: 'aktiivinen', luotu: 'A' }), T({ status: 'ehdotettu', luotu: 'B' })] } });
    const r = await L.tmIdpLataaKausi({ db: d, sid: 'demo', pid: 'p1', nyt: NYT }); expect(r.tavoite.luotu).toBe('B'); expect(r.voimassa.luotu).toBe('A'); expect(r.ankkurit).toMatchObject({ _idpVuosi: '2026', _idpVuosiLuotu: 'A', _idpLuonnosVuosi: '2026', _idpLuonnosLuotu: 'B' });
    expect((await L.tmIdpLataaKausi({ db: db({}), sid: 'demo', pid: 'p1', nyt: NYT })).tavoite).toBeNull();
    const ed = await L.tmIdpLataaKausi({ db: db({ [PK + '/idp_kausi/2025']: { tavoitteet: [T({ status: 'aktiivinen', luotu: 'E' })] } }), sid: 'demo', pid: 'p1', nyt: NYT }); expect(ed.tavoite.luotu).toBe('E'); expect(ed.ankkurit._idpVuosi).toBe('2025');
  });
  it('kirjoita: uusi tavoite lisätään historiaan (ei ylikirjoita), sama luotu korvaa vain sen alkion; pikakentät samassa; ankkuri seuraa kirjoitettua dokkia', async () => {
    const vanha = T({ status: 'aktiivinen', luotu: 'A', arviot: [{ pvm: 'x', arvo: 2 }] }), d = db({ [PK + '/idp_kausi/2026']: { tavoitteet: [vanha] } });
    const uusi = T({ status: 'aktiivinen', luotu: 'B' }), r = await L.tmIdpKirjoitaKausi({ db: d, sid: 'demo', pid: 'p1', t: uusi, ankkurit: { _idpVuosi: '2026', _idpVuosiLuotu: 'A' }, nyt: NYT });
    const arr = d.kirj.filter((k) => k.path === PK + '/idp_kausi/2026')[0].v.tavoitteet; expect(arr.map((x) => [x.luotu, x.status])).toEqual([['A', 'vaihdettu'], ['B', 'aktiivinen']]); expect(arr[0].arviot).toHaveLength(1);
    expect(d.kirj.filter((k) => k.path === PK)[0].v).toMatchObject({ idp_tila: 'aktiivinen', idp_fokus: { alue: 'acceleration' } }); expect(r.pk.idp_tila).toBe('aktiivinen'); expect(r.ankkurit).toMatchObject({ _idpVuosi: '2026', _idpVuosiLuotu: 'B' });
    const muok = { ...uusi, tavoitearvo: 1.7 }; await L.tmIdpKirjoitaKausi({ db: d, sid: 'demo', pid: 'p1', t: muok, ankkurit: r.ankkurit, nyt: NYT });
    const arr2 = d.kirj.filter((k) => k.path === PK + '/idp_kausi/2026').pop().v.tavoitteet; expect(arr2).toHaveLength(2); expect(arr2[1].tavoitearvo).toBe(1.7);
  });
  it('kirjoita: ehdotus ei vaihda voimassa olevaa; vuodenvaihde: vanha tavoite edellisessä dokissa merkitään vaihdetuksi omassa dokissaan', async () => {
    const d = db({ [PK + '/idp_kausi/2026']: { tavoitteet: [T({ status: 'aktiivinen', luotu: 'A' })] } });
    await L.tmIdpKirjoitaKausi({ db: d, sid: 'demo', pid: 'p1', t: T({ status: 'ehdotettu', luotu: 'C' }), ankkurit: {}, nyt: NYT }); expect(d.kirj.filter((k) => k.path.endsWith('/2026')).pop().v.tavoitteet.map((x) => x.status)).toEqual(['aktiivinen', 'ehdotettu']);
    const d2 = db({ [PK + '/idp_kausi/2025']: { tavoitteet: [T({ status: 'aktiivinen', luotu: 'E' })] } });
    await L.tmIdpKirjoitaKausi({ db: d2, sid: 'demo', pid: 'p1', t: T({ status: 'aktiivinen', luotu: 'N' }), ankkurit: { _idpVuosi: '2025', _idpVuosiLuotu: 'E' }, nyt: NYT });
    expect(d2.kirj.filter((k) => k.path.endsWith('/2026'))[0].v.tavoitteet.map((x) => x.luotu)).toEqual(['N']); expect(d2.kirj.filter((k) => k.path.endsWith('/2025'))[0].v.tavoitteet[0].status).toBe('vaihdettu');
  });
  it('kirjoita: virhe kirjoituksessa → hylätty promise (ei hiljaista onnistumista); ei tavoitetta → hylkäys', async () => {
    const d = db({}); d.runTransaction = async () => { throw new Error('permission-denied'); };
    await expect(L.tmIdpKirjoitaKausi({ db: d, sid: 'demo', pid: 'p1', t: T(), ankkurit: {}, nyt: NYT })).rejects.toThrow('permission-denied'); await expect(L.tmIdpKirjoitaKausi({ db: d, sid: 'demo', pid: 'p1', t: null })).rejects.toThrow();
  });
});
describe('rakenne', () => {
  it('lib ei koske Firebaseen suoraan (db injektoidaan), ei kovakoodattuja värejä; jokainen FI-avain on kidp_*; sheet-CSS vain tokeneilla', () => {
    const koodi = readFileSync(new URL('../lib/tm_idp_lomake.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//, ''); expect(koodi).not.toMatch(/firebase\.|firestore\(\)|fetch\(|https?:\/\//i);
    expect(Object.keys(L.FI).filter((k) => !/^kidp_/.test(k))).toEqual([]); expect(L.tmIdpLomakeCss()).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
  });
});
