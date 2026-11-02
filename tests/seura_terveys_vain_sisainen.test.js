/* Vaihe 1 PR 2a (terveys): Seura lukee käytettävyyden sisainen/terveys:stä (lista + muokkausikkuna), ei oletusta "aktiivinen", kirjoitus vain terveys-dokumenttiin.
   _seuraYhdistaTerveys ajetaan vm-hiekkalaatikossa oikealla lib/tm_sisainen.js:llä (ei pelkkä lähdetekstin haku). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_sisainen.js');
const SEURA = readFileSync(new URL('../TalentMaster_Seura.html', import.meta.url), 'utf8');

function funktio(nimi) {
  const a = SEURA.indexOf('async function ' + nimi + '('); expect(a, nimi).toBeGreaterThan(0);
  let i = SEURA.indexOf('{', a), d = 0; for (; i < SEURA.length; i++) { if (SEURA[i] === '{') d++; else if (SEURA[i] === '}' && --d === 0) break; }
  return SEURA.slice(a, i + 1);
}
function hiekka(terveysMapa, virhe) {
  const toastit = [], kutsut = [];
  const T = Object.assign({}, S, { tmSisainenLataaTerveys: async (db, sid, opts) => { kutsut.push({ sid, opts }); return { mapa: terveysMapa, virhe: virhe || null }; } });
  const ctx = { window: { TM_SISAINEN: T }, db: {}, tila: { seuraId: 'sjk', rooli: 'vp' }, kaytettavyysNakyy: () => true, tmHT: (t) => t, naytaToast: (t, l) => toastit.push([t, l]) };
  vm.createContext(ctx); vm.runInContext(funktio('_seuraYhdistaTerveys') + ';this._seuraYhdistaTerveys=_seuraYhdistaTerveys;', ctx);
  return { aja: ctx._seuraYhdistaTerveys, toastit, kutsut };
}

describe('Seura: _seuraYhdistaTerveys (ajo)', () => {
  it('terveys-dokumentti voittaa ja on määräävä; ilman dokumenttia vanha kenttä varalla; muut kentät ennallaan; koko seuran haku VP:lle', async () => {
    const h = hiekka({ a: { terveysSeuraId: 'sjk', kaytettavyys: 'loukkaantunut', paluu_arvio: '2026-12-01' }, b: { terveysSeuraId: 'sjk', kaytettavyys: 'aktiivinen' } });
    const lista = [{ id: 'a', etunimi: 'A', kaytettavyys: 'aktiivinen' }, { id: 'b', kaytettavyys: 'aktiivinen', loukkaantuminen_alue: 'Polvi' }, { id: 'c', kaytettavyys: 'tauko' }];
    await h.aja(lista);
    expect(lista[0]).toMatchObject({ id: 'a', etunimi: 'A', kaytettavyys: 'loukkaantunut', paluu_arvio: '2026-12-01' });
    expect(lista[1]).not.toHaveProperty('loukkaantuminen_alue'); expect(lista[2].kaytettavyys).toBe('tauko');
    expect(h.kutsut).toHaveLength(1); expect(h.kutsut[0].opts.terveysLuku).toBe('seura'); expect(h.toastit).toEqual([]);
  });
  it('latausvirhe näytetään (ei nielaista), lista jää vanhoille kentille', async () => {
    const h = hiekka({}, 'permission-denied'); const lista = [{ id: 'a', kaytettavyys: 'tauko' }]; await h.aja(lista);
    expect(h.toastit).toEqual([['Lataus epäonnistui: permission-denied', 'virhe']]); expect(lista[0].kaytettavyys).toBe('tauko');
  });
});
describe('Seura: kytkentä (lähdekoodi)', () => {
  it('lista yhdistää terveyden ennen tallennusta suodattimelle; muokkausikkuna ei lue raakaa pelaajadokumenttia ohi yhdistämisen', () => {
    const r = funktio('renderPelaajat'); expect(r.indexOf('await _seuraYhdistaTerveys(pelaajat)')).toBeGreaterThan(0); expect(r.indexOf('await _seuraYhdistaTerveys(pelaajat)')).toBeLessThan(r.indexOf('window._pelaajatKaikki = pelaajat'));
    const m = funktio('avaaKaytettavyysModal'); expect(m).toContain('await _seuraYhdistaTerveys(l)'); expect(m).not.toMatch(/kaytettavyys \|\| 'aktiivinen'/); expect(m).toContain("${k ? '' : 'disabled'}");
  });
  it('tallennus: ei oletusta "aktiivinen", ei muokattu-kenttää, ei suoraa pelaajadokumentin updatea, merkki TERVEYS_VAIN_SISAINEN', () => {
    const t = funktio('tallennakKaytettavyys'); expect(t).not.toMatch(/\|\| 'aktiivinen'/); expect(t).not.toContain('muokattu'); expect(t).not.toMatch(/\.update\(data\)/); expect(t).toContain('tmTerveysKirjoita(db, tila.seuraId, pelaajaId, data, {})');
    expect(SEURA).toContain('const TERVEYS_VAIN_SISAINEN = true;');
  });
});
