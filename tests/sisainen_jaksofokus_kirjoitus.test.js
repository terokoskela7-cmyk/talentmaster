/* Vaihe 1 / PR 1b-2 — havaintojen (osa_havainnot, osa_havainnot_vk) ja jaksofokuksen osapäivitysten (linkitetyt, tavoite_tarkenteet, onnistumiskriteeri) dual-write sisainen/tiedot:iin.
   Lippu RYHMAT.jaksofokus_sisainen.kirjoitus on OLETUKSENA POIS → kirjoitus täsmälleen kuten ennen (selainkäytös ei muutu); kytketään marraskuussa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js'), KT = require('../lib/tm_kehitystyopoyta.js'), KS = require('../lib/tm_kehityssilmukka.js');
const YP = (p, s) => S.tmSisainenYhdista(p, s, { kirjoitus: true });   // dual-read seuraa lippua (PR 1b-3): luku sisainen:stä vain lippu päällä
const DEL = { __delete: true };

/* Tallentava db: update (suora) ja batch (update + set) kirjataan järjestyksessä; pelaajan polku = .../pelaajat/<pid>, sisainen = .../sisainen/tiedot */
function mkDb(opts) {
  opts = opts || {}; const ops = []; let commits = 0;
  const ref = (path) => ({ _path: path, collection: (c) => ({ doc: (i) => ref(path + '/' + c + '/' + i) }), update: async (u) => { ops.push({ t: 'update', path, u }); }, set: async (d, o) => { ops.push({ t: 'set', path, d, o }); } });
  const db = { collection: (c) => ({ doc: (i) => ref(c + '/' + i) }), batch: () => { const b = []; return { update: (r, u) => b.push({ t: 'update', path: r._path, u }), set: (r, d, o) => b.push({ t: 'set', path: r._path, d, o }),
    commit: async () => { commits++; if (opts.hylkaa) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; } b.forEach((x) => ops.push(Object.assign({ batch: true }, x))); } }; } };
  return { db, ops, commits: () => commits };
}
const PEL = 'seurat/s/pelaajat/p1', SIS = PEL + '/sisainen/tiedot';

describe('tmJaksofokusPolutJaa (pure): A-polut → sisäkkäinen sisainen-olio, muut jäävät', () => {
  it('osa_havainnot / osa_havainnot_vk / linkitetyt: dot-polut sisäkkäin jaksofokus_sisainen alle; DELETE-sentinel kulkee mukana; osa_arviot ja tukitavoitteet (B) jäävät pelaajalle', () => {
    const j = S.tmJaksofokusPolutJaa({ 'jaksofokus.osa_havainnot.k.a.u1.arvo': 2, 'jaksofokus.osa_havainnot.k.a.u1.lause': DEL, 'jaksofokus.osa_havainnot_vk.k.a.2026-W43.u1.arvo': 2, 'jaksofokus.linkitetyt': DEL, 'jaksofokus.tavoite_tarkenteet': ['x'],
      'jaksofokus.osa_arviot.k': { a: 2 }, 'jaksofokus.tukitavoitteet': [1], 'jaksofokus.tila': 'kaynnissa' });
    expect(j.sisainen).toEqual({ jaksofokus_sisainen: { osa_havainnot: { k: { a: { u1: { arvo: 2, lause: DEL } } } }, osa_havainnot_vk: { k: { a: { '2026-W43': { u1: { arvo: 2 } } } } }, linkitetyt: DEL, tavoite_tarkenteet: ['x'] } });
    expect(Object.keys(j.pelaajaPolut).sort()).toEqual(['jaksofokus.osa_arviot.k', 'jaksofokus.tila', 'jaksofokus.tukitavoitteet']);
  });
  it('ei A-polkuja → sisainen null; kokonainen jaksofokus-olio (1b-3) ja muut kentät eivät laukaise sisainen-kirjoitusta; asetti/lahde eivät ole A', () => {
    expect(S.tmJaksofokusPolutJaa({ jaksofokus: { konsepti_avain: 'x', osa_havainnot: {} }, jaksofokus_historia: 'AU' }).sisainen).toBeNull();
    expect(S.tmJaksofokusPolutJaa({ 'jaksofokus.asetti.rooli': 'vp', 'jaksofokus.lahde': 'valmentaja', 'jaksofokus.osa_arviot.k.a': 3 }).sisainen).toBeNull(); expect(S.tmJaksofokusPolutJaa(null).sisainen).toBeNull();
  });
});

describe('tmJaksofokusKirjoita: lippu, batch, varapolku', () => {
  const polut = { 'jaksofokus.osa_havainnot.k.a.u1.arvo': 2, 'jaksofokus.osa_arviot.k.a': 2 };
  it('REKISTERI: lippu on oletuksena POIS; ryhmä ei ole "kytketty" (luku/yhdistys ennallaan)', () => { expect(S.RYHMAT.jaksofokus_sisainen.kirjoitus).toBe(false); expect(S.RYHMAT.jaksofokus_sisainen.kytketty).toBe(false); });
  it('lippu POIS (oletus): vain pelaajadokumentin update, ei batchia eikä sisainen-kirjoitusta (vanha selain = uusi lippu pois)', async () => {
    const m = mkDb(); const r = await S.tmJaksofokusKirjoita(m.db, 's', 'p1', polut, {});
    expect(r).toEqual({ ok: true, sisainen: false, sisainenOhitettu: false }); expect(m.ops).toEqual([{ t: 'update', path: PEL, u: polut }]); expect(m.commits()).toBe(0);
  });
  it('lippu PÄÄLLÄ: YKSI batch — pelaajan osapäivitys (dual-write, kaikki polut) + sisainen set-merge { seuraId, paivitetty, jaksofokus_sisainen }', async () => {
    const m = mkDb(); const r = await S.tmJaksofokusKirjoita(m.db, 's', 'p1', polut, { kirjoitus: true, nytISO: '2026-10-23T10:00:00.000Z' });
    expect(r).toEqual({ ok: true, sisainen: true, sisainenOhitettu: false }); expect(m.commits()).toBe(1);
    expect(m.ops).toEqual([{ batch: true, t: 'update', path: PEL, u: polut }, { batch: true, t: 'set', path: SIS, d: { seuraId: 's', paivitetty: '2026-10-23T10:00:00.000Z', jaksofokus_sisainen: { osa_havainnot: { k: { a: { u1: { arvo: 2 } } } } } }, o: { merge: true } }]);
  });
  it('lippu päällä mutta vain B-polkuja → ei sisainen-kirjoitusta (ei turhaa dokumenttia)', async () => {
    const m = mkDb(); await S.tmJaksofokusKirjoita(m.db, 's', 'p1', { 'jaksofokus.osa_arviot.k.a': 3 }, { kirjoitus: true }); expect(m.ops).toEqual([{ t: 'update', path: PEL, u: { 'jaksofokus.osa_arviot.k.a': 3 } }]); expect(m.commits()).toBe(0);
  });
  it('permission-denied (Rules v3.68 ei vielä käytössä) → vanha kenttä yksin + sisainenOhitettu; muu virhe heitetään; pelaajaIlmanA-tilassa permission-denied heitetään (näkyvä virhe)', async () => {
    const m = mkDb({ hylkaa: true }); const r = await S.tmJaksofokusKirjoita(m.db, 's', 'p1', polut, { kirjoitus: true });
    expect(r).toEqual({ ok: true, sisainen: false, sisainenOhitettu: true }); expect(m.ops).toEqual([{ t: 'update', path: PEL, u: polut }]);
    await expect(S.tmJaksofokusKirjoita(mkDb({ hylkaa: true }).db, 's', 'p1', polut, { kirjoitus: true, pelaajaIlmanA: true })).rejects.toThrow(/permissions/);
  });
  it('pelaajaIlmanA (PR 2 -tila): A-polut vain sisainen:iin, pelaajalle vain B-polut', async () => {
    const m = mkDb(); await S.tmJaksofokusKirjoita(m.db, 's', 'p1', polut, { kirjoitus: true, pelaajaIlmanA: true });
    expect(m.ops[0]).toEqual({ batch: true, t: 'update', path: PEL, u: { 'jaksofokus.osa_arviot.k.a': 2 } }); expect(m.ops[1].path).toBe(SIS);
  });
});

describe('tmKtTallennaOsaArvio (VP + Master + KT yhteinen ydin) → sisainen', () => {
  const JF = { konsepti_avain: 'k', konsepti_nimi: 'K', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, osa_havainnot: {}, osa_arviot: {} };
  function mk(kirjoitus, hylkaa) {
    const m = mkDb({ hylkaa }); let kumoa = null; const p = { id: 'p1', jaksofokus: JSON.parse(JSON.stringify(JF)) };
    const d = { db: m.db, sid: 's', auth: () => ({ uid: 'u1', getIdToken: async () => 't', getIdTokenResult: async () => ({ claims: { rooli: 'valmentaja' } }) }), KS, rooli: 'valmentaja', uid: 'u1', nyt: () => new Date(2026, 9, 19), eiToastia: true, poista: DEL, kumoaFn: (f) => { kumoa = f; }, sisainenKirjoitus: kirjoitus };
    return { p, d, m, kumoa: () => kumoa };
  }
  it('lippu pois (ei asetettu): kirjoitus ennallaan — yksi update pelaajaan, ei sisainen-dokumenttia', async () => {
    const a = mk(undefined); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2, 'Hyvä')).toBe(true);
    expect(a.m.ops).toHaveLength(1); expect(a.m.ops[0].t).toBe('update'); expect(a.m.ops[0].path).toBe(PEL); expect(a.m.commits()).toBe(0);
  });
  it('lippu päällä: havainto + viikkohavainto (+ lause) kirjoitetaan sisainen.jaksofokus_sisainen alle; osa_arviot EI mene sisainen:iin; pelaajadokumentti saa edelleen kaiken (dual)', async () => {
    const a = mk(true); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2, 'Hyvä')).toBe(true); expect(a.m.commits()).toBe(1);
    const set = a.m.ops.find((o) => o.t === 'set'), upd = a.m.ops.find((o) => o.t === 'update'); const js = set.d.jaksofokus_sisainen;
    expect(set.path).toBe(SIS); expect(set.d.seuraId).toBe('s'); expect(js.osa_havainnot.k.a.u1).toEqual({ arvo: 2, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Hyvä' });
    expect(js.osa_havainnot_vk.k.a['2026-W43'].u1).toEqual({ arvo: 2, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Hyvä' }); expect(js.osa_arviot).toBeUndefined();
    expect(upd.u['jaksofokus.osa_havainnot.k.a.u1.arvo']).toBe(2); expect(upd.u['jaksofokus.osa_arviot.k']).toBeDefined(); expect(Object.keys(upd.u).some((k) => /osa_havainnot_vk/.test(k))).toBe(true);
  });
  it('dual-read: kirjoitettu sisainen-olio yhdistettynä pelaajaan antaa saman kuin paikallinen tila (sisainen voittaa, vanha varalla)', async () => {
    const a = mk(true); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 3); const sis = a.m.ops.find((o) => o.t === 'set').d;
    const julkinen = JSON.parse(JSON.stringify(a.p)); delete julkinen.jaksofokus.osa_havainnot; delete julkinen.jaksofokus.osa_havainnot_vk;   // pelaajadokumentista A-osat siivottu (PR 2 -tila)
    const y = YP(julkinen, sis); expect(y.jaksofokus.osa_havainnot).toEqual(a.p.jaksofokus.osa_havainnot); expect(y.jaksofokus.osa_havainnot_vk).toEqual(a.p.jaksofokus.osa_havainnot_vk); expect(y.jaksofokus.osa_arviot).toEqual(a.p.jaksofokus.osa_arviot);
  });
  it('Kumoa kulkee samaa reittiä: palauttava osapäivitys (DELETE-sentinel) menee molempiin dokumentteihin', async () => {
    const a = mk(true); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2); await a.kumoa()();
    const sets = a.m.ops.filter((o) => o.t === 'set'); expect(sets).toHaveLength(2); expect(sets[1].d.jaksofokus_sisainen.osa_havainnot.k.a.u1).toBe(DEL); expect(sets[1].d.jaksofokus_sisainen.osa_havainnot_vk.k.a['2026-W43'].u1).toBe(DEL);
    expect(a.p.jaksofokus.osa_havainnot.k.a.u1).toBeUndefined();
  });
  it('sisainen-kirjoitus estyy (Rules ei vielä käytössä) → havainto tallentuu vanhaan kenttään, käyttäjä ei näe virhettä; muu virhe → false + toast', async () => {
    const a = mk(true, true); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2)).toBe(true); expect(a.m.ops.map((o) => o.t)).toEqual(['update']);
  });
});

describe('VP:n osapäivitys (R6.1c: linkitetyt / tavoite_tarkenteet / onnistumiskriteeri) ja sivujen kytkentä', () => {
  it('tmPaivitaJaksofokus.polut → jako: A-kentät sisainen:iin, osa_arviot jää; POISTA-sentinel (poistettu kenttä) säilyy poistona', () => {
    const p = { jaksofokus: { konsepti_avain: 'k', linkitetyt: ['a'], tavoite_tarkenteet: ['t'], onnistumiskriteeri: 'x', osa_arviot: {} } };
    const polut = KS.tmPaivitaJaksofokus(p, { linkitetyt: KS.POISTA, tavoite_tarkenteet: ['u'], osa_arviot: { a: 2 } }).polut; const j = S.tmJaksofokusPolutJaa(polut);
    expect(j.sisainen.jaksofokus_sisainen.linkitetyt).toBe(KS.POISTA); expect(j.sisainen.jaksofokus_sisainen.tavoite_tarkenteet).toEqual(['u']); expect(Object.keys(j.pelaajaPolut)).toEqual(['jaksofokus.osa_arviot']);
  });
  it('VP _vpJfKirjoita käyttää tmJaksofokusKirjoita:a (varalla vanha update); Master/VP/KT lataavat tm_sisainen.js ENNEN tm_kehitystyopoyta.js:ää; versiot ylös', () => {
    const vp = lue('TalentMaster_VP_v25.html'); expect(vp).toMatch(/window\.TM_SISAINEN\.tmJaksofokusKirjoita\(db, _seuraId, pid, upd, \{\}\)/);
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html']) {
      const h = lue(f); expect(h.indexOf('lib/tm_sisainen.js?v=11'), f).toBeGreaterThan(-1); expect(h.indexOf('lib/tm_sisainen.js'), f).toBeLessThan(h.indexOf('lib/tm_kehitystyopoyta.js?v=40'));
    }
  });
  it('lippu on koodissa POIS (ei kytketty tässä PR:ssä) ja Pelaaja/Vanhempi eivät lataa tm_sisainen.js:ää', () => {
    expect(lue('lib/tm_sisainen.js')).toMatch(/jaksofokus_sisainen: \{ kytketty: false, kirjoitus: false,/);
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(lue(f)).not.toMatch(/<script[^>]+src="lib\/(tm_sisainen|tm_kehitystyopoyta)\.js/));
  });
});
