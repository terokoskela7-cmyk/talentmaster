/* Master: viestikuuntelijat käynnistyvät tasan kerran per seura+käyttäjä, vaikka _lataaPelaajat ajaa (lista-polku + vanha polku / päällekkäiset kutsut) kutsut kahdesti.
   Ajo vm-sandboxissa: funktiot poimitaan HTML:stä, _db on laskuri-tynkä. Vahvistettu mittarilla 25.11.: PERUTTU ×2 (tuplakäynnistys 17 ms välein). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), SRC = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
function poimi(alku) {   // funktio alkaen merkkijonosta → sulkeva } (aaltosulkeiden tasapaino; riittää näille funktioille)
  const i = SRC.indexOf(alku); if (i < 0) throw new Error('ei löydy: ' + alku);
  let d = 0, j = SRC.indexOf('{', i); for (let k = j; k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && --d === 0) return SRC.slice(i, k + 1); }
  throw new Error('ei sulkua');
}
function ymparisto() {
  const kuuntelijat = []; let uid = 'u1', sid = 's1';
  const q = { where() { return q; }, orderBy() { return q; }, limit() { return q; }, onSnapshot(ok, virhe) { const k = { ok, virhe, auki: true, polku: kuuntelijat.length }; kuuntelijat.push(k); return () => { k.auki = false; }; } };
  const db = { collection() { return { doc() { return { collection() { return q; } }; } }; } };
  const ctx = vm.createContext({ console: { warn() {} }, window: {}, renderInbox() {}, renderKoti() {}, _ws: 'x', _demo: false, firebase: { firestore: { Timestamp: {} } } });
  ctx._db = db;
  vm.runInContext('var _seuraId="s1",_uid="u1",_vpViestit=[]; let _vpViestitUnsub = null, _vpViestitAvain = null; let _mvUnsub = null, _mvAvain = null;\n' + poimi('function _kuunteleVpViestit()') + '\n' + poimi('function _mvKuuntele()'), ctx);
  return { ctx, kuuntelijat, aseta: (s, u) => vm.runInContext(`_seuraId=${JSON.stringify(s)};_uid=${JSON.stringify(u)}`, ctx), aja: (k) => vm.runInContext(k, ctx) };
}
describe('viestikuuntelijat: idempotentti käynnistys', () => {
  it('kaksi peräkkäistä käynnistystä (lista-polku + vanha polku) → tasan yksi kuuntelija kummastakin, ei unsubscribea', () => {
    const e = ymparisto();
    e.aja('_kuunteleVpViestit(); _mvKuuntele();'); e.aja('_kuunteleVpViestit(); _mvKuuntele();');
    expect(e.kuuntelijat).toHaveLength(2); expect(e.kuuntelijat.every((k) => k.auki)).toBe(true);
  });
  it('eri seura tai käyttäjä → vanha puretaan, uusi tilataan (SA:n seuranvaihto, uloskirjautuminen)', () => {
    const e = ymparisto(); e.aja('_kuunteleVpViestit(); _mvKuuntele();'); e.aseta('s2', 'u1'); e.aja('_kuunteleVpViestit(); _mvKuuntele();');
    expect(e.kuuntelijat).toHaveLength(4); expect(e.kuuntelijat.map((k) => k.auki)).toEqual([false, false, true, true]);
    e.aseta('s2', 'u9'); e.aja('_kuunteleVpViestit(); _mvKuuntele();'); expect(e.kuuntelijat.filter((k) => k.auki)).toHaveLength(2);
  });
  it('kuuntelijan virhe vapauttaa lukon → seuraava käynnistys tilaa uudelleen; nollaus (null) sallii uuden tilauksen', () => {
    const e = ymparisto(); e.aja('_kuunteleVpViestit(); _mvKuuntele();'); e.kuuntelijat[0].virhe({ message: 'x' }); e.kuuntelijat[1].virhe({ message: 'x' });
    e.aja('_kuunteleVpViestit(); _mvKuuntele();'); expect(e.kuuntelijat).toHaveLength(4);
    e.aja('_vpViestitUnsub = null; _mvUnsub = null;'); e.aja('_kuunteleVpViestit(); _mvKuuntele();'); expect(e.kuuntelijat).toHaveLength(6);   // 2519–2520: seuranvaihdon/uloskirjautumisen nollaus
  });
  it('demo tai puuttuva uid/seura → ei kuuntelijoita; viestilista päivittyy snapshotista (renderInbox)', () => {
    const e = ymparisto(); e.aseta('s1', null); e.aja('_kuunteleVpViestit(); _mvKuuntele();'); expect(e.kuuntelijat).toHaveLength(0);
    e.aseta('s1', 'u1'); e.aja('_kuunteleVpViestit(); _mvKuuntele();');
    let kutsuttu = 0; e.ctx.renderInbox = () => { kutsuttu++; };
    e.kuuntelijat[0].ok({ docs: [{ id: 'a', data: () => ({ teksti: 'hei', aika: { toDate: () => new Date() } }) }] });
    e.kuuntelijat[1].ok({ docs: [] });
    expect(kutsuttu).toBe(2); expect(e.aja('_vpViestit.length')).toBe(1);
  });
  it('lähdekoodi: molemmat kutsupaikat säilyvät, ja avainvartija on funktioissa (ei kutsupaikoissa)', () => {
    expect((SRC.match(/_kuunteleVpViestit\(\);/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(poimi('function _kuunteleVpViestit()')).toContain('_vpViestitAvain === _avain');
    expect(poimi('function _mvKuuntele()')).toContain('_mvAvain === _avain');
  });
});
