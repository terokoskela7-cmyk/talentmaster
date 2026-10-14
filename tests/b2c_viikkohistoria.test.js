/* B2c · viikkohavaintojen historia (selvitys 41, Teron muutos 13.10.): jaksofokus.osa_havainnot_vk.<konsepti>.<koodi>.<vvvv-Www>.<uid> = {arvo, pvm, rooli, lause?}
   — viikon merkintä tallentuu kerran ja sen päälle kirjoitetaan saman viikon aikana; viikkonumero jaetusta lib/tm_viikko.js:stä (D140); Kumoa palauttaa myös historian; jakson sulussa historia kopioituu historiariville. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js'), KS = require('../lib/tm_kehityssilmukka.js'), JK = require('../lib/tm_jaksokooste.js');
const JF = { konsepti_avain: 'kons', konsepti_nimi: 'Kons', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, osa_havainnot: {}, osa_arviot: {} };
function mk(jf, uid, pvm) {
  const kirj = []; let kumoa = null; const p = { id: 'p1', jaksofokus: JSON.parse(JSON.stringify(jf)) };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ update: async (u) => { kirj.push(u); } }) }) }) }) };
  const d = { db, sid: 's', auth: () => ({ uid, getIdToken: async () => 't', getIdTokenResult: async () => ({ claims: { rooli: 'valmentaja' } }) }), KS, rooli: 'valmentaja', uid, nyt: () => pvm, eiToastia: true, poista: 'DEL', kumoaFn: (f) => { kumoa = f; }, nayta: () => {}, t: (k) => k };
  return { p, d, kirj, kumoa: () => kumoa };
}
const vkAvaimet = (u) => Object.keys(u).filter((k) => /osa_havainnot_vk/.test(k)).sort();
describe('B2c · viikkohistoria: kirjoitus', () => {
  it('napautus kirjoittaa viikkoavaimen alle {arvo, pvm, rooli} (ei lausetta); viikkonumero = ISO-viikko (ma 19.10.2026 = 2026-W43)', async () => {
    const a = mk(JF, 'u1', new Date(2026, 9, 19)); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2)).toBe(true);
    expect(vkAvaimet(a.kirj[0])).toEqual(['jaksofokus.osa_havainnot_vk.kons.k1.2026-W43.u1.arvo', 'jaksofokus.osa_havainnot_vk.kons.k1.2026-W43.u1.pvm', 'jaksofokus.osa_havainnot_vk.kons.k1.2026-W43.u1.rooli']);
    expect(a.p.jaksofokus.osa_havainnot_vk.kons.k1['2026-W43'].u1).toEqual({ arvo: 2, pvm: '2026-10-19', rooli: 'valmentaja' });
  });
  it('sama viikko korvaa saman viikon rivin (ei uutta riviä); toinen viikko lisää oman rivinsä ja aiempi viikko säilyy; nykytila osa_havainnot = viimeisin', async () => {
    const a = mk(JF, 'u1', new Date(2026, 9, 19)); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 1);
    a.d.nyt = () => new Date(2026, 9, 21); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2);   // sama viikko (ke)
    a.d.nyt = () => new Date(2026, 9, 26); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 3);   // seuraava viikko (ma)
    const vk = a.p.jaksofokus.osa_havainnot_vk.kons.k1; expect(Object.keys(vk).sort()).toEqual(['2026-W43', '2026-W44']);
    expect(vk['2026-W43'].u1).toMatchObject({ arvo: 2, pvm: '2026-10-21' }); expect(vk['2026-W44'].u1).toMatchObject({ arvo: 3, pvm: '2026-10-26' }); expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1.arvo).toBe(3);
  });
  it('lause: kirjoitetaan viikkoriville vain kun se annettiin; uuden viikon rivi ei peri edellisen viikon lausetta; saman viikon napautus ei pyyhi lausetta', async () => {
    const a = mk(JF, 'u1', new Date(2026, 9, 19)); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2, 'Katsoi ylös');
    a.d.nyt = () => new Date(2026, 9, 21); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 3);   // sama viikko, ei lausetta → lause säilyy
    expect(a.p.jaksofokus.osa_havainnot_vk.kons.k1['2026-W43'].u1).toEqual({ arvo: 3, pvm: '2026-10-21', rooli: 'valmentaja', lause: 'Katsoi ylös' });
    expect(vkAvaimet(a.kirj[1]).some((k) => /\.lause$/.test(k))).toBe(false);
    a.d.nyt = () => new Date(2026, 9, 26); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 1);
    expect(a.p.jaksofokus.osa_havainnot_vk.kons.k1['2026-W44'].u1.lause).toBeUndefined();
  });
  it('Kumoa palauttaa myös historian: ei aiempaa viikon riviä → rivi poistetaan; aiempi saman viikon rivi → vain kirjoitetut kentät palaavat; muut viikot koskematta', async () => {
    const a = mk(JF, 'u1', new Date(2026, 9, 19)); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2); await a.kumoa()();
    expect(a.kirj[1]['jaksofokus.osa_havainnot_vk.kons.k1.2026-W43.u1']).toBe('DEL'); expect(a.p.jaksofokus.osa_havainnot_vk.kons.k1['2026-W43']).toBeUndefined();
    const b = mk(Object.assign({}, JF, { osa_havainnot_vk: { kons: { k1: { '2026-W42': { u1: { arvo: 3, pvm: '2026-10-14', rooli: 'valmentaja' } }, '2026-W43': { u1: { arvo: 1, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Vanha' } } } } } }), 'u1', new Date(2026, 9, 21));
    await KT.tmKtTallennaOsaArvio(b.d, b.p, 'kons', 'k1', 3); await b.kumoa()();
    expect(vkAvaimet(b.kirj[1])).toEqual(['jaksofokus.osa_havainnot_vk.kons.k1.2026-W43.u1.arvo', 'jaksofokus.osa_havainnot_vk.kons.k1.2026-W43.u1.pvm', 'jaksofokus.osa_havainnot_vk.kons.k1.2026-W43.u1.rooli']);
    expect(b.p.jaksofokus.osa_havainnot_vk.kons.k1['2026-W43'].u1).toEqual({ arvo: 1, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Vanha' }); expect(b.p.jaksofokus.osa_havainnot_vk.kons.k1['2026-W42'].u1.arvo).toBe(3);
  });
  it('vuodenvaihde: ISO-viikko tulee tm_viikko.js:stä (28.12.2026 → 2026-W53; 4.1.2027 → 2027-W01)', async () => {
    const a = mk(JF, 'u1', new Date(2026, 11, 28)); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2); a.d.nyt = () => new Date(2027, 0, 4); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2);
    expect(Object.keys(a.p.jaksofokus.osa_havainnot_vk.kons.k1).sort()).toEqual(['2026-W53', '2027-W01']);
  });
});
describe('B2c · viikkohistoria kopioituu jakson historiariville', () => {
  const jf = Object.assign({}, JF, { osa_havainnot_vk: { kons: { k1: { '2026-W42': { u1: { arvo: 1, pvm: '2026-10-14', rooli: 'valmentaja' } }, '2026-W43': { u1: { arvo: 3, pvm: '2026-10-21', rooli: 'valmentaja' } } } } } });
  it('Sulje jakso (tmSuljeJakso): historiariville havainnot_vk (koko viikkosarja); uusi jakso ei peri sitä', () => {
    const r = KS.tmSuljeJakso({ id: 'p1', jaksofokus: jf }, { harjoituksia: 5 }, { nytISO: '2026-11-16T10:00:00.000Z' });
    expect(r.historiaLisays[0].havainnot_vk).toEqual(jf.osa_havainnot_vk); expect(r.jaksofokus).toBeNull();
  });
  it('jakson vaihto (korvattu): arkistoriville sama; jakso ilman viikkohavaintoja → rivillä EI havainnot_vk-kenttää (vanhat rivit ennallaan)', () => {
    const v = JK.tmJaksonVaihto(jf, { konsepti_avain: 'toinen', alkoi: '2026-11-16T10:00:00.000Z' }, '2026-11-16T10:00:00.000Z'); expect(v.arkisto.havainnot_vk).toEqual(jf.osa_havainnot_vk);
    const t = KS.tmSuljeJakso({ id: 'p1', jaksofokus: JF }, { harjoituksia: 5 }, { nytISO: '2026-11-16T10:00:00.000Z' }); expect('havainnot_vk' in t.historiaLisays[0]).toBe(false);
  });
});
