/* Vaihe 1 PR 2c — henkilökunnan lukijat (INVENTAARIO_VAIHE1_PR2.md R1–R6).
   Master _pikakorttiLataaPelaaja (R4) AJETAAN vm:ssä oikealla lib/tm_sisainen.js:llä ja tm_phv_tila.js:llä;
   Seuran kytkennät (R2 muokkausikkuna + oliTalentti, R3 Kehitystilanne + kausikuva) tarkistetaan funktiorungoista.
   Testipelaaja: KPV U13 m93GBdOaGCUuenMiCL0I. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { createRequire as _kuoriReq } from 'module';
const { lueKuori } = _kuoriReq(import.meta.url)('../scripts/kuoren_lahde.js');   // Seura.html + seura/-osat (rivikattojen purku)
const require = createRequire(import.meta.url);
const S = require('../lib/tm_sisainen.js');
const PHV = require('../lib/tm_phv_tila.js');
const lue = (f) => lueKuori(f);
const MASTER = lue('TalentMaster_Master_v16.html'), SEURA = lue('TalentMaster_Seura.html');
function runko(src, alku) {
  const a = src.indexOf(alku); expect(a, alku).toBeGreaterThan(-1);
  let i = src.indexOf('{', a), d = 0; for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}' && --d === 0) break; }
  return src.slice(a, i + 1);
}
const PID = 'm93GBdOaGCUuenMiCL0I';

function master({ raaka, sisainen, sisVirhe = false, lista, eiLibia = false }) {
  const toastit = [], piirretty = [];
  const P = { get: async () => ({ exists: !!raaka, id: PID, data: () => raaka }),
    collection: (c) => ({ doc: (id) => ({ get: async () => { expect([c, id]).toEqual(['sisainen', 'tiedot']); if (sisVirhe) throw Object.assign(new Error('pd'), { code: 'permission-denied' }); return { exists: !!sisainen, data: () => sisainen }; } }) }) };
  const ctx = { window: { TM_SISAINEN: eiLibia ? undefined : S }, console: { warn() {} }, document: { getElementById: () => null }, masterT: (t) => t,
    toast: (m, k) => toastit.push([m, k]), _renderPinfoFirestore: (p) => piirretty.push(p), _seuraId: 'kpv', _pelaajatData: lista,
    _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => P }) }) }) },
    tmPhvKoodi: PHV.tmPhvKoodi, tmPhvIlmoitettuPH: PHV.tmPhvIlmoitettuPH, tmPhvEiMitattu: PHV.tmPhvEiMitattu };
  vm.createContext(ctx);
  vm.runInContext(runko(MASTER, 'function _mSisainenVirhe(') + '\n' + runko(MASTER, 'async function _pikakorttiLataaPelaaja(') + '\nthis.f = _pikakorttiLataaPelaaja;', ctx);
  return { aja: () => ctx.f(PID), ctx, toastit, piirretty };
}

describe('R4 Master _pikakorttiLataaPelaaja (ajo)', () => {
  it('sisainen/tiedot yhdistetään, PHV normalisoidaan, terveys säilyy listan arvona, oikea pelaaja piirretään', async () => {
    const lista = [{ id: 'muu', etunimi: 'Muu' }, { id: PID, etunimi: 'Topias', kaytettavyys: 'loukkaantunut', adar_arvioijia: 1 }];
    const m = master({ lista, raaka: { etunimi: 'Topias', phv_tila: 'AN', kaytettavyys: 'aktiivinen', adar_arvioijia: 1 }, sisainen: { seuraId: 'kpv', adar_arvioijia: 3, talenttiTaso: 'perus', talenttiOhjelma: true } });   // PR 2d: talenttiOhjelma = C (pelaajadokumentti voittaa), talenttiTaso = A
    await m.aja();
    const p = m.ctx._pelaajatData[1];
    expect(p).toMatchObject({ etunimi: 'Topias', adar_arvioijia: 3, talenttiTaso: 'perus', kaytettavyys: 'loukkaantunut' }); expect(p.talenttiOhjelma).toBeUndefined();
    expect(p.phv_tila).toBe(PHV.tmPhvKoodi({ phv_tila: 'AN' })); expect(p.phv_tila).not.toBe('AN');
    expect(m.piirretty).toHaveLength(1); expect(m.piirretty[0].id).toBe(PID); expect(m.toastit).toEqual([]);
  });
  it('pelaaja ei listassa → ei piirretä mitään (ennen: listan 1. pelaaja)', async () => {
    const m = master({ lista: [{ id: 'muu' }], raaka: { etunimi: 'Topias' }, sisainen: null });
    await m.aja(); expect(m.piirretty).toEqual([]); expect(m.ctx._pelaajatData).toEqual([{ id: 'muu' }]);
  });
  it('sisainen-lukuvirhe → näkyvä virhe, listan yhdistetty arvo säilyy (raaka ei korvaa)', async () => {
    const lista = [{ id: PID, adar_arvioijia: 3 }];
    const m = master({ lista, raaka: { adar_arvioijia: 1 }, sisVirhe: true });
    await m.aja(); expect(m.toastit).toEqual([['Lataus epäonnistui: permission-denied', 'error']]); expect(m.ctx._pelaajatData[0].adar_arvioijia).toBe(3); expect(m.piirretty).toEqual([]);
  });
  it('lib puuttuu → näkyvä virhe', async () => {
    const m = master({ lista: [{ id: PID }], raaka: { etunimi: 'T' }, eiLibia: true });
    await m.aja(); expect(m.toastit).toEqual([['Lataus epäonnistui: TM_SISAINEN', 'error']]);
  });
  it('alkulataus: puuttuva lib tai latausvirhe näkyy (onVirhe), ei hiljaista ohitusta', () => {
    expect(MASTER).toContain("if (!_demo) { if (!window.TM_SISAINEN) _mSisainenVirhe('TM_SISAINEN'); else _pelaajatData = await");
  });
});

describe('lib tmSisainenLataaJaYhdista: opts.onVirhe', () => {
  const db = (fail) => ({ collectionGroup: () => ({ where: () => ({ get: async () => { if (fail) throw Object.assign(new Error('x'), { code: 'unavailable' }); return { forEach() {} }; } }) }) });
  it('virhe → onVirhe(koodi), lista palautetaan; onnistuessa ei kutsuta', async () => {
    const v = []; const l = await S.tmSisainenLataaJaYhdista(db(true), 'kpv', [{ id: PID, a: 1 }], { onVirhe: (x) => v.push(x) });
    expect(v).toHaveLength(1); expect(typeof v[0]).toBe('string'); expect(l).toEqual([{ id: PID, a: 1 }]);
    const v2 = []; await S.tmSisainenLataaJaYhdista(db(false), 'kpv', [{ id: PID }], { onVirhe: (x) => v2.push(x) }); expect(v2).toEqual([]);
    expect(await S.tmSisainenLataaJaYhdista(db(true), 'kpv', [{ id: PID }])).toEqual([{ id: PID }]);   // ilman onVirhe ei kaadu
  });
});

describe('R2 Seura muokkausikkuna + oliTalentti', () => {
  const ikkuna = runko(SEURA, 'async function avaaMuokkaaPelaajaModal(');
  const tallennus = SEURA.slice(SEURA.indexOf("const onTalentti = document.getElementById('mp_talentti')"), SEURA.indexOf('const synt = tmSyntymaPaivitys(syntymaaika_str'));
  it('ikkuna yhdistää sisainen/tiedot ennen talenttiOhjelma-arvon lukua; latausvirhe → ikkuna ei aukea', () => {
    const y = ikkuna.indexOf('if (await _seuraYhdista(l)) return; p = l[0];');
    expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(ikkuna.indexOf('const onTalentti = !!p.talenttiOhjelma'));
  });
  it('valintaruutu kantaa data-oli-talentti → talenttiAlku vain ensiaktivoinnissa, talenttiPaattyi vain kun ohjelma päättyy', () => {
    expect(ikkuna).toContain(`\${onTalentti ? 'checked data-oli-talentti="1"' : ''}`);
    expect(tallennus).toContain('oliTalentti = !!document.getElementById(\'mp_talentti\')?.dataset.oliTalentti');
    expect(tallennus).toContain('if (onTalentti && !oliTalentti) {');
    expect(tallennus).toContain('...(!onTalentti && oliTalentti && { talenttiPaattyi:');
  });
});

describe('R3 Seura Kehitystilanne + kausikuva', () => {
  it('_ktLataa yhdistää pelaajat sisainen/tiedot-kopioon ennen laskentaa; virhe → puuttuva lähde "sisainen"', () => {
    const k = runko(SEURA, 'async function _ktLataa(');
    const y = k.indexOf("if (await _seuraYhdista(data.pelaajat)) puuttuu.push('sisainen'); const pel = data.pelaajat;");
    expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(k.indexOf('data._puuttuu = Array.from(new Set(puuttuu))'));
  });
  it('kausikuvaa ei tallenneta, jos sisainen puuttui (pysyvä kuva ei saa jäädä väärillä talenttitiedoilla)', () => {
    const t = runko(SEURA, 'async function ktTallennaKausikuva(');
    expect(t).toContain("if ((K.data._puuttuu || []).indexOf('sisainen') >= 0) { naytaToast(");
    const ctx = { window: { _kt: { data: { _puuttuu: ['sisainen'] } } }, naytaToast: (m, l) => ctx.t.push([m, l]), tmHT: (x) => x, t: [], db: { collection() { throw new Error('ei kirjoitusta'); } } };
    vm.createContext(ctx); vm.runInContext(t + '\nthis.f = ktTallennaKausikuva;', ctx);
    return ctx.f().then(() => { expect(ctx.t).toEqual([['Tallennus epäonnistui: sisainen', 'virhe']]); });
  });
});
