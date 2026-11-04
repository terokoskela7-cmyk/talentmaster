/* Vaihe 1 PR 2a (terveys): Seura lukee käytettävyyden sisainen/terveys:stä (lista + muokkausikkuna), ei oletusta "aktiivinen", kirjoitus vain terveys-dokumenttiin.
   _seuraYhdista (PR 2c: + sisainen/tiedot) ajetaan vm-hiekkalaatikossa oikealla lib/tm_sisainen.js:llä (ei pelkkä lähdetekstin haku). */
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
function hiekka(terveysMapa, virhe, o) {
  o = o || {}; const toastit = [], kutsut = [];
  /* PR 2c: _seuraYhdista lataa sisainen/tiedot + (oikeutetulle roolille) terveyden yhdellä tmSisainenLataaSeura-kutsulla — stub palauttaa saman muodon kuin oikea lib */
  const T = Object.assign({}, S, { tmSisainenLataaSeura: async (db, sid, opts) => { kutsut.push({ sid, opts }); if (o.tiedotVirhe) return { mapa: {}, virhe: o.tiedotVirhe };
    return opts && opts.terveysLuku ? { mapa: o.tiedot || {}, virhe: null, terveysMapa: terveysMapa, terveysVirhe: virhe || null } : { mapa: o.tiedot || {}, virhe: null }; } });
  const ctx = { window: { TM_SISAINEN: o.eiLibia ? undefined : T }, db: {}, tila: { seuraId: 'sjk', rooli: o.rooli || 'vp' }, kaytettavyysNakyy: () => o.kaytettavyys !== false, tmHT: (t) => t, naytaToast: (t, l) => toastit.push([t, l]) };
  vm.createContext(ctx); vm.runInContext(funktio('_seuraYhdista') + ';this._seuraYhdista=_seuraYhdista;', ctx);
  return { aja: ctx._seuraYhdista, toastit, kutsut };
}

describe('Seura: _seuraYhdista (ajo)', () => {
  it('terveys-dokumentti voittaa ja on määräävä; ilman dokumenttia vanha kenttä varalla; muut kentät ennallaan; koko seuran haku VP:lle', async () => {
    const h = hiekka({ a: { terveysSeuraId: 'sjk', kaytettavyys: 'loukkaantunut', paluu_arvio: '2026-12-01' }, b: { terveysSeuraId: 'sjk', kaytettavyys: 'aktiivinen' } });
    const lista = [{ id: 'a', etunimi: 'A', kaytettavyys: 'aktiivinen' }, { id: 'b', kaytettavyys: 'aktiivinen', loukkaantuminen_alue: 'Polvi' }, { id: 'c', kaytettavyys: 'tauko' }];
    expect(await h.aja(lista)).toBeNull();
    expect(lista[0]).toMatchObject({ id: 'a', etunimi: 'A', kaytettavyys: 'loukkaantunut', paluu_arvio: '2026-12-01' });
    expect(lista[1]).not.toHaveProperty('loukkaantuminen_alue'); expect(lista[2].kaytettavyys).toBe('tauko');
    expect(h.kutsut).toHaveLength(1); expect(h.kutsut[0].opts.terveysLuku).toBe('seura'); expect(h.toastit).toEqual([]);
  });
  it('latausvirhe näytetään (ei nielaista) ja palautetaan, lista jää vanhoille kentille', async () => {
    const h = hiekka({}, 'permission-denied'); const lista = [{ id: 'a', kaytettavyys: 'tauko' }];
    expect(await h.aja(lista)).toBe('permission-denied');
    expect(h.toastit).toEqual([['Lataus epäonnistui: permission-denied', 'virhe']]); expect(lista[0].kaytettavyys).toBe('tauko');
  });
  it('PR 2c (R1) / 2d: sisainen/tiedot voittaa — talenttiTaso ja signaali sisäisestä kopiosta; talenttiOhjelma = C (PM päätös a) → pelaajadokumentin arvo, sisainen-kopio EI voita', async () => {
    const h = hiekka({}, null, { tiedot: { a: { seuraId: 'sjk', talenttiOhjelma: false, talenttiTaso: 'laajennettu', signaali: 'x_factor' } } });
    const lista = [{ id: 'a', etunimi: 'A', talenttiOhjelma: true }, { id: 'b', talenttiOhjelma: false }]; await h.aja(lista);
    expect(lista[0]).toMatchObject({ etunimi: 'A', talenttiOhjelma: true, talenttiTaso: 'laajennettu', signaali: 'x_factor' }); expect(lista[1].talenttiOhjelma).toBe(false);
  });
  it('rooli ilman käytettävyysnäkymää: tiedot yhdistetään, terveyttä ei pyydetä', async () => {
    const h = hiekka({ a: { kaytettavyys: 'loukkaantunut' } }, null, { kaytettavyys: false, rooli: 'seurasihteeri', tiedot: { a: { talenttiTaso: 'perus' } } });
    const lista = [{ id: 'a' }]; await h.aja(lista);
    expect(h.kutsut[0].opts).toEqual({}); expect(lista[0].talenttiTaso).toBe('perus'); expect(lista[0]).not.toHaveProperty('kaytettavyys');
  });
  it('tiedot-latausvirhe ja puuttuva lib → näkyvä virhe + palautus (kutsuja estää tallennuksen)', async () => {
    const h = hiekka({}, null, { tiedotVirhe: 'failed-precondition' }); expect(await h.aja([{ id: 'a' }])).toBe('failed-precondition'); expect(h.toastit[0][1]).toBe('virhe');
    const e = hiekka({}, null, { eiLibia: true }); expect(await e.aja([{ id: 'a' }])).toBe('TM_SISAINEN'); expect(e.toastit).toEqual([['Lataus epäonnistui: TM_SISAINEN', 'virhe']]);
    expect(await hiekka({}).aja([])).toBeNull();
  });
});
describe('Seura: kytkentä (lähdekoodi)', () => {
  it('lista yhdistää terveyden ennen tallennusta suodattimelle; muokkausikkuna ei lue raakaa pelaajadokumenttia ohi yhdistämisen', () => {
    const r = funktio('renderPelaajat'); expect(r.indexOf('await _seuraYhdista(pelaajat)')).toBeGreaterThan(0); expect(r.indexOf('await _seuraYhdista(pelaajat)')).toBeLessThan(r.indexOf('window._pelaajatKaikki = pelaajat'));
    const m = funktio('avaaKaytettavyysModal'); expect(m).toContain('await _seuraYhdista(l)'); expect(m).not.toMatch(/kaytettavyys \|\| 'aktiivinen'/); expect(m).toContain("${k ? '' : 'disabled'}");
  });
  it('tallennus: ei oletusta "aktiivinen", ei muokattu-kenttää, ei suoraa pelaajadokumentin updatea, merkki TERVEYS_VAIN_SISAINEN', () => {
    const t = funktio('tallennakKaytettavyys'); expect(t).not.toMatch(/\|\| 'aktiivinen'/); expect(t).not.toContain('muokattu'); expect(t).not.toMatch(/\.update\(data\)/); expect(t).toContain('tmTerveysKirjoita(db, tila.seuraId, pelaajaId, data, {})');
    expect(SEURA).toContain('const TERVEYS_VAIN_SISAINEN = true;');
  });
});
