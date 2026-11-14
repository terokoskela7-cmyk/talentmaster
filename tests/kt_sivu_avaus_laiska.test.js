/* Kehitystyöpöydän avaus (lippu lista_yhteenveto): ei listaa seurat/{sid}/pelaajat-kokoelmaa eikä collectionGroup(sisainen):ia;
   luvut: 1 pelaaja + 1 lista_joukkue/joukkue + 1 sisainen (+ terveys). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const KS = require('../lib/tm_kt_sivu.js'), SI = require('../lib/tm_sisainen.js'), LY = require('../lib/tm_lista_yhteenveto.js'), LL = require('../lib/tm_lista_lataus.js');
const DOCS = [{ id: 'u13', nimi: 'U13' }, { id: 'u15', nimi: 'U15' }];
const PEL = { p1: { etunimi: 'Aatu', sukunimi: 'Aalto', joukkue: 'U13', joukkueet: ['u13'] }, p2: { etunimi: 'Bertta', sukunimi: 'Bergh', joukkue: 'U13', joukkueet: ['u13'] } };
const rivi = (id, e, s) => ({ id, e, s, jn: 'U13', jk: ['u13'] });
function fakeDb() {
  const log = [];
  const doc = (path) => ({
    get: async () => { log.push(path); const m = path.match(/^seurat\/s1\/pelaajat\/(\w+)$/); if (m) return { exists: !!PEL[m[1]], id: m[1], data: () => PEL[m[1]] };
      if (path === 'seurat/s1/lista_joukkue/u13') return { exists: true, data: () => ({ versio: LY.VERSIO, rivit: [rivi('p1', 'Aatu', 'Aalto'), rivi('p2', 'Bertta', 'Bergh')], laskettu: 1000 }) };
      return { exists: false, data: () => ({}) }; },
    collection: (n) => col(path + '/' + n),
  });
  const col = (path) => ({ doc: (id) => doc(path + '/' + id), get: async () => { log.push('LISTAUS ' + path); return { docs: [], forEach() {} }; }, where: () => col(path) });
  return { log, collection: (n) => col(n), collectionGroup: (n) => col('GROUP ' + n) };
}
describe('Kehitystyöpöytä · laiska avaus', () => {
  it('tmKtSivuLataaAvaus: valittu pelaaja täytenä + vaihtolista yhteenvedosta; ei pelaajat-kokoelman listausta', async () => {
    const db = fakeDb(), r = await KS.tmKtSivuLataaAvaus({ db, sid: 's1', rooli: 'vp', pid: 'p1', joukkueDocs: DOCS, listaLataus: LL });
    expect(r.ok).toBe(true); expect(r.pelaajat.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(r.pelaajat[0]._lista).toBeUndefined(); expect(r.pelaajat[1]._lista).toBe(true);
    expect(db.log.filter((x) => x.indexOf('LISTAUS') === 0)).toEqual([]);
    expect(db.log).toEqual(['seurat/s1/pelaajat/p1', 'seurat/s1/lista_joukkue/u13']);
  });
  it('valmentaja: vain omien joukkueiden yhteenveto; vieras joukkue → pelkkä pelaaja', async () => {
    const db = fakeDb(), r = await KS.tmKtSivuLataaAvaus({ db, sid: 's1', rooli: 'valmentaja', joukkueet: ['u15'], pid: 'p1', joukkueDocs: DOCS, listaLataus: LL });
    expect(r.ok).toBe(true); expect(r.pelaajat.map((p) => p.id)).toEqual(['p1']); expect(db.log).toEqual(['seurat/s1/pelaajat/p1']);
  });
  it('puuttuva yhteenveto → ok:false (kutsuja putoaa vanhaan polkuun)', async () => {
    const db = fakeDb(); PEL.p3 = { etunimi: 'C', sukunimi: 'C', joukkue: 'U15', joukkueet: ['u15'] };
    const r = await KS.tmKtSivuLataaAvaus({ db, sid: 's1', rooli: 'vp', pid: 'p3', joukkueDocs: DOCS, listaLataus: LL }); delete PEL.p3;
    expect(r.ok).toBe(false);
  });
  it('tmSisainenLataaJaYhdistaYksi: yksi dokumentti, ei collectionGroup-kyselyä', async () => {
    const db = fakeDb(), p = await SI.tmSisainenLataaJaYhdistaYksi(db, 's1', { id: 'p1' }, {});
    expect(p.id).toBe('p1'); expect(db.log).toEqual(['seurat/s1/pelaajat/p1/sisainen/tiedot']); expect(db.log.some((x) => /GROUP/.test(x))).toBe(false);
  });
  it('sivu: lippu päällä avaus kutsuu tmKtSivuLataaAvaus ja hydratoi vain valitun; vanha kokolataus vain varapolulla', () => {
    const h = fs.readFileSync('TalentMaster_Kehitystyopoyta.html', 'utf8');
    const a = h.indexOf('async function _kaynnista'), k = h.slice(a, h.indexOf('function _ktListalle'));
    expect(k).toMatch(/_listaLippu\(\)/); expect(k).toMatch(/tmKtSivuLataaAvaus/); expect(k.indexOf('tmKtSivuLataaAvaus')).toBeLessThan(k.indexOf('tmKtSivuLataaPelaajat('));
    expect(k).toMatch(/if \(!_laiska\) \{[\s\S]*tmKtSivuLataaPelaajat\([\s\S]*tmSisainenLataaJaYhdista\(/);
    expect(h).toMatch(/lib\/tm_lista_lataus\.js/); expect(h).toMatch(/tmSisainenLataaJaYhdistaYksi/);
  });
});
