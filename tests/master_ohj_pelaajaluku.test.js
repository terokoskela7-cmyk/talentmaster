import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
const html = fs.readFileSync(path.resolve(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8');

function lataaLahde(ctx) {
  const m = html.match(/var _ohjPelaajaLupaus = null[\s\S]*?\nasync function _ohjLaskeN/);
  expect(m).toBeTruthy();
  const src = m[0].replace(/\nasync function _ohjLaskeN$/, '');
  // ctx-muuttujat samannimisinä kuin tuotannossa (_db, _seuraId, _joukkue, _pelaajatData)
  return new Function('_db', '_seuraId', 'ctx', 'Date', 'var _joukkue = ctx.joukkue; var _pelaajatData = ctx.pelaajatData; function _mListaOnRivi(p) { return !!(p && p._lista === true); }' + src + '; return _ohjPelaajaLahde;');
}
function db(luvut) {
  return { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => { luvut.n++; return { docs: [{ data: () => ({ id: 'x' }) }, { data: () => ({ id: 'y' }) }] }; } }) }) }) };
}

describe('Master: ohjelma-analytiikan pelaajaluku (B.6 #2)', () => {
  it('ei kutsu omaa pelaajat.get():iä _ohjLaskeN/_ohjLataaPelaajatCache-polussa', () => {
    const a = html.indexOf('async function _ohjLaskeN'), b = html.indexOf('var _OHJ_PHV_NIMI');
    const alue = html.slice(a, b).replace(/\/\/[^\n]*/g, '');
    expect((alue.match(/collection\('pelaajat'\)\.get\(\)/g) || []).length).toBe(0);
  });
  it('koko seura muistissa (ei joukkuerajausta) → 0 lukua', async () => {
    const luvut = { n: 0 }, data = [{ id: 'a' }];
    const f = lataaLahde()(db(luvut), 's1', { joukkue: '', pelaajatData: data }, Date);
    expect(await f(false)).toBe(data); expect(luvut.n).toBe(0);
  });
  it('joukkuerajaus → YKSI jaettu luku kahdelle kutsujalle; force lukee uudelleen', async () => {
    const luvut = { n: 0 };
    const f = lataaLahde()(db(luvut), 's1', { joukkue: 'P14', pelaajatData: [{ id: 'a' }] }, Date);
    await f(false); await f(false); expect(luvut.n).toBe(1);
    await f(true); expect(luvut.n).toBe(2);
  });
});
