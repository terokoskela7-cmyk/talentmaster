/* Vaihe 1 / PR 1b-2 → PR 2d — havaintojen (osa_havainnot, osa_havainnot_vk) ja jaksofokuksen osapäivitysten (linkitetyt, tavoite_tarkenteet, onnistumiskriteeri) A-polut VAIN sisainen/tiedot:iin.
   PR 2d: lippuriippuvuus poistettu (deps.kirjoitus ei vaikuta), ei dual-writea, ei permission-denied-varapolkua (virhe → kutsujalle). */
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
  it('REKISTERI: lippu on oletuksena PÄÄLLÄ (kytketty); ryhmä ei ole "kytketty" (luku/yhdistys ennallaan)', () => { expect(S.RYHMAT.jaksofokus_sisainen.kirjoitus).toBe(true); expect(S.RYHMAT.jaksofokus_sisainen.kytketty).toBe(false); });
  it('PR 2d: deps.kirjoitus=false EI enää ohita (lippuriippuvuus poistettu) — A-polut silti VAIN sisainen:iin', async () => {
    const m = mkDb(); const r = await S.tmJaksofokusKirjoita(m.db, 's', 'p1', polut, { kirjoitus: false });
    expect(r).toEqual({ ok: true, sisainen: true, sisainenOhitettu: false }); expect(m.commits()).toBe(1);
    expect(m.ops[0]).toEqual({ batch: true, t: 'update', path: PEL, u: { 'jaksofokus.osa_arviot.k.a': 2 } }); expect(m.ops[1].path).toBe(SIS);
  });
  it('YKSI batch — pelaajalle vain B-polut (ei A-polkuja) + sisainen set-merge { seuraId, paivitetty, jaksofokus_sisainen }', async () => {
    const m = mkDb(); const r = await S.tmJaksofokusKirjoita(m.db, 's', 'p1', polut, { nytISO: '2026-10-23T10:00:00.000Z' });
    expect(r).toEqual({ ok: true, sisainen: true, sisainenOhitettu: false }); expect(m.commits()).toBe(1);
    expect(m.ops).toEqual([{ batch: true, t: 'update', path: PEL, u: { 'jaksofokus.osa_arviot.k.a': 2 } }, { batch: true, t: 'set', path: SIS, d: { seuraId: 's', paivitetty: '2026-10-23T10:00:00.000Z', jaksofokus_sisainen: { osa_havainnot: { k: { a: { u1: { arvo: 2 } } } } } }, o: { merge: true } }]);
  });
  it('vain A-polkuja → pelaajadokumenttia ei kirjoiteta lainkaan (vain sisainen)', async () => {
    const m = mkDb(); await S.tmJaksofokusKirjoita(m.db, 's', 'p1', { 'jaksofokus.osa_havainnot.k.a.u1.arvo': 2 }, {});
    expect(m.ops.map((o) => o.path)).toEqual([SIS]);
  });
  it('lippu päällä mutta vain B-polkuja → ei sisainen-kirjoitusta (ei turhaa dokumenttia)', async () => {
    const m = mkDb(); await S.tmJaksofokusKirjoita(m.db, 's', 'p1', { 'jaksofokus.osa_arviot.k.a': 3 }, { kirjoitus: true }); expect(m.ops).toEqual([{ t: 'update', path: PEL, u: { 'jaksofokus.osa_arviot.k.a': 3 } }]); expect(m.commits()).toBe(0);
  });
  it('PR 2d fail-closed: permission-denied heitetään kutsujalle — EI uusintaa vanhaan kenttään (A-polut eivät päädy pelaajadokumenttiin)', async () => {
    const m = mkDb({ hylkaa: true }); await expect(S.tmJaksofokusKirjoita(m.db, 's', 'p1', polut, {})).rejects.toThrow(/permissions/);
    expect(m.ops).toEqual([]); expect(m.commits()).toBe(1);
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
  it('PR 2d: sisainenKirjoitus=false ei enää vaikuta — havainto menee silti sisainen:iin yhdessä batchissa', async () => {
    const a = mk(false); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2, 'Hyvä')).toBe(true);
    expect(a.m.commits()).toBe(1); expect(a.m.ops.some((o) => o.t === 'set' && o.path === SIS)).toBe(true);
  });
  it('havainto + viikkohavainto (+ lause) kirjoitetaan sisainen.jaksofokus_sisainen alle; osa_arviot EI mene sisainen:iin; pelaajadokumentti saa VAIN B-polut (osa_arviot), ei osa_havainnot*', async () => {
    const a = mk(true); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2, 'Hyvä')).toBe(true); expect(a.m.commits()).toBe(1);
    const set = a.m.ops.find((o) => o.t === 'set'), upd = a.m.ops.find((o) => o.t === 'update'); const js = set.d.jaksofokus_sisainen;
    expect(set.path).toBe(SIS); expect(set.d.seuraId).toBe('s'); expect(js.osa_havainnot.k.a.u1).toEqual({ arvo: 2, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Hyvä' });
    expect(js.osa_havainnot_vk.k.a['2026-W43'].u1).toEqual({ arvo: 2, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Hyvä' }); expect(js.osa_arviot).toBeUndefined();
    expect(upd.path).toBe(PEL); expect(upd.u['jaksofokus.osa_arviot.k']).toBeDefined(); expect(Object.keys(upd.u).some((k) => /osa_havainnot/.test(k))).toBe(false);
  });
  it('dual-read: kirjoitettu sisainen-olio yhdistettynä pelaajaan antaa saman kuin paikallinen tila (sisainen voittaa, vanha varalla)', async () => {
    const a = mk(true); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 3); const sis = a.m.ops.find((o) => o.t === 'set').d;
    const julkinen = JSON.parse(JSON.stringify(a.p)); delete julkinen.jaksofokus.osa_havainnot; delete julkinen.jaksofokus.osa_havainnot_vk;   // pelaajadokumentista A-osat siivottu (PR 2 -tila)
    const y = YP(julkinen, sis); expect(y.jaksofokus.osa_havainnot).toEqual(a.p.jaksofokus.osa_havainnot); expect(y.jaksofokus.osa_havainnot_vk).toEqual(a.p.jaksofokus.osa_havainnot_vk); expect(y.jaksofokus.osa_arviot).toEqual(a.p.jaksofokus.osa_arviot);
  });
  it('Kumoa kulkee samaa reittiä: palauttava osapäivitys (DELETE-sentinel) menee sisainen:iin', async () => {
    const a = mk(true); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2); await a.kumoa()();
    const sets = a.m.ops.filter((o) => o.t === 'set'); expect(sets).toHaveLength(2); expect(sets[1].d.jaksofokus_sisainen.osa_havainnot.k.a.u1).toBe(DEL); expect(sets[1].d.jaksofokus_sisainen.osa_havainnot_vk.k.a['2026-W43'].u1).toBe(DEL);
    expect(a.p.jaksofokus.osa_havainnot.k.a.u1).toBeUndefined();
  });
  it('PR 2d fail-closed: kirjoitus hylätään (Rules) → false (näkyvä virhe), mitään ei tallennu vanhaan kenttään', async () => {
    const a = mk(true, true); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'k', 'a', 2)).toBe(false); expect(a.m.ops).toEqual([]);
  });
});

describe('VP:n osapäivitys (R6.1c: linkitetyt / tavoite_tarkenteet / onnistumiskriteeri) ja sivujen kytkentä', () => {
  it('tmPaivitaJaksofokus.polut → jako: A-kentät sisainen:iin, osa_arviot jää; POISTA-sentinel (poistettu kenttä) säilyy poistona', () => {
    const p = { jaksofokus: { konsepti_avain: 'k', linkitetyt: ['a'], tavoite_tarkenteet: ['t'], onnistumiskriteeri: 'x', osa_arviot: {} } };
    const polut = KS.tmPaivitaJaksofokus(p, { linkitetyt: KS.POISTA, tavoite_tarkenteet: ['u'], osa_arviot: { a: 2 } }).polut; const j = S.tmJaksofokusPolutJaa(polut);
    expect(j.sisainen.jaksofokus_sisainen.linkitetyt).toBe(KS.POISTA); expect(j.sisainen.jaksofokus_sisainen.tavoite_tarkenteet).toEqual(['u']); expect(Object.keys(j.pelaajaPolut).sort()).toEqual(['jaksofokus.linkitetyt', 'jaksofokus.osa_arviot']);   // PR 2d: A-polun POISTO myös pelaajalle (siivoamaton vanha arvo ei palaa dual-readissa)
    expect(j.pelaajaPolut['jaksofokus.linkitetyt']).toBe(KS.POISTA);
  });
  it('VP _vpJfKirjoita käyttää tmJaksofokusKirjoita:a (PR 2d: ei raakaa varapolkua); Master/VP/KT lataavat tm_sisainen.js ENNEN tm_kehitystyopoyta.js:ää; versiot ylös', () => {
    const vp = lue('TalentMaster_VP_v25.html'); expect(vp).toMatch(/window\.TM_SISAINEN\.tmJaksofokusKirjoita\(db, _seura, pid, upd, \{\}\)/); expect(vp).toContain('const _seura = _pelaajatSeura;');   // kilpatilanne: seura = pelaajan latauskerran seura, ei kirjoitushetken _seuraId
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html']) {
      const h = lue(f); expect(h, f).toMatch(/lib\/tm_sisainen\.js/); expect(h.indexOf('lib/tm_sisainen.js'), f).toBeLessThan(h.indexOf('lib/tm_kehitystyopoyta.js'));
    }
  });
  it('lippu on koodissa PÄÄLLÄ (lipun käännön PR) ja Pelaaja/Vanhempi eivät lataa tm_sisainen.js:ää', () => {
    expect(lue('lib/tm_sisainen.js')).toMatch(/jaksofokus_sisainen: \{ kytketty: false, kirjoitus: true,/);
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(lue(f)).not.toMatch(/<script[^>]+src="lib\/(tm_sisainen|tm_kehitystyopoyta)\.js/));
  });
});
