/* Vaihe 1 / PR 1c-3 (S2) — selaimen kirjoittajat: vastuuhenkilö, tukitarve, scout, talentti_ehdotus, review_*, idp_* → sisainen/tiedot (lippu RYHMAT.henkilokunta.kirjoitus POIS oletuksena).
   Runtime-ajot: OIKEA sivukoodi (Master + VP) vm-hiekkalaatikossa + muistinvarainen Firestore (update/set merge|mergeFields/batch/transaktio/FieldValue.delete). Lippu pois = täsmälleen vanhat kirjoitukset;
   päällä = dual-write (pelaajadokumentti ennallaan) + sisainen; Rules ei vielä (permission-denied) = vanha kenttä. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js'), KS = require('../lib/tm_kehityssilmukka.js'), VH = require('../lib/tm_vastuuhenkilo.js'), JM = require('../lib/tm_jakso_malli.js');
const LIPPU = S.RYHMAT.henkilokunta;
afterEach(() => { LIPPU.kirjoitus = false; S.RYHMAT.jaksofokus_sisainen.kirjoitus = false; });

const DEL = { __fv: 'delete' }, FV = { delete: () => DEL, arrayUnion: (...a) => ({ __fv: 'union', a }), serverTimestamp: () => ({ __ts: 1 }) };
const kopio = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const olio = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && !x.__fv;
function aseta(d, polku, arvo) {
  const k = polku.split('.'); let o = d; for (let i = 0; i < k.length - 1; i++) { if (!olio(o[k[i]])) o[k[i]] = {}; o = o[k[i]]; }
  const l = k[k.length - 1];
  if (arvo && arvo.__fv === 'delete') delete o[l]; else if (arvo && arvo.__fv === 'union') { const v = Array.isArray(o[l]) ? o[l] : []; o[l] = v.concat(arvo.a); } else o[l] = kopio(arvo);
}
function yhdista(kohde, lahde) { Object.keys(lahde).forEach((k) => { const v = lahde[k]; if (v && v.__fv) aseta(kohde, k, v); else if (olio(v)) { if (!olio(kohde[k])) kohde[k] = {}; yhdista(kohde[k], v); } else kohde[k] = kopio(v); }); }
function mkFs(opts) {
  opts = opts || {}; const docs = {}, loki = [];
  const op = { update(p, u) { if (!docs[p]) throw new Error('NOT_FOUND ' + p); Object.keys(u).forEach((k) => aseta(docs[p], k, u[k])); },
    set(p, d, o) { if (!o) { docs[p] = {}; yhdista(docs[p], d); return; } docs[p] = docs[p] || {}; if (o.mergeFields) o.mergeFields.forEach((f) => aseta(docs[p], f, f.split('.').reduce((x, k) => (x == null ? undefined : x[k]), d))); else if (o.merge) yhdista(docs[p], d); } };
  const hylkaa = (ops) => { if (opts.hylkaaSisainen && ops.some((x) => /\/sisainen\//.test(x[1]))) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; } };
  const kaikkiTaiEi = (ops) => { hylkaa(ops); const varm = kopio(docs); try { ops.forEach((x) => { loki.push(x[0] + ' ' + x[1]); op[x[0]](x[1], x[2], x[3]); }); } catch (e) { Object.keys(docs).forEach((k) => delete docs[k]); Object.assign(docs, varm); throw e; } };
  const ref = (path) => ({ _path: path, id: path.split('/').pop(), collection: (c) => ({ doc: (i) => ref(path + '/' + c + '/' + i) }), get: async () => ({ exists: !!docs[path], data: () => docs[path] }),
    update: async (u) => { kaikkiTaiEi([['update', path, u]]); }, set: async (d, o) => { kaikkiTaiEi([['set', path, d, o]]); } });
  const db = { collection: (c) => ({ doc: (i) => ref(c + '/' + i) }),
    batch: () => { const b = []; return { update: (r, u) => b.push(['update', r._path, u]), set: (r, d, o) => b.push(['set', r._path, d, o]), commit: async () => kaikkiTaiEi(b) }; },
    runTransaction: async (fn) => { const b = []; await fn({ get: async (r) => ({ exists: !!docs[r._path], data: () => docs[r._path] }), set: (r, d, o) => b.push(['set', r._path, d, o]) }); kaikkiTaiEi(b); } };
  return { db, docs, loki };
}
const SID = 's', PID = 'p1', PEL = `seurat/${SID}/pelaajat/${PID}`, SIS = PEL + '/sisainen/tiedot';
const alku = () => ({ etunimi: 'X', joukkue: 'KPV U13', vastuuhenkilo: { uid: 'vanha', rooli: 'vp', asetettu_pvm: '2026-01-01' }, idp_fokus: { a: 1, b: 2 } });

function viipale(src, a, b) { const i = src.indexOf(a), j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('viipaletta ei löytynyt: ' + a); return src.slice(i, j); }
function ctx(fs, lisa) {
  const c = Object.assign({ console, Promise, JSON, Object, Array, String, Date, Error, _seuraId: SID, _isDemoMode: false, _demo: false, db: fs.db, _db: fs.db, _uid: 'u1', _rooli: 'valmentaja', masterT: (x) => x, vpT: (x) => x,
    firebase: { firestore: { FieldValue: FV }, auth: () => ({ currentUser: null }) }, toast() {}, _mTuoreToken: async () => {}, _mIdpReRender() {}, _vpKausitavoiteReRender() {}, _ktPaivita() {}, _vpAloitusReRender() {},
    tmPaivaIso: () => '2026-11-02', TM_VIRHEKOODI: { tmVirheTeksti: (t) => t } }, lisa || {});
  c.window = c; c.TM_SISAINEN = S; c.TM_KEHITYSSILMUKKA = KS; c.TM_VASTUUHENKILO = VH; c.TM_JAKSO_MALLI = JM; return vm.createContext(c);
}
const ilmanNull = (x) => { const j = JSON.stringify(x, (k, v) => (v === null ? undefined : v)); return j === undefined ? undefined : JSON.parse(j); };
const sisaa = (fs) => Object.keys(fs.docs).some((k) => /sisainen/.test(k));

describe('lib: tmHenkilokuntaKirjoita (pelaajaSet, tyhjä upd, taydenna), Lisaa + Varapolulla, elinkaarihelperi + henkilokunta', () => {
  it('pelaajaSet: pelaaja set-merge (syvä yhdistys säilyy, ei update-korvausta); lippu pois ei sisainen:iä; päällä sisainen mergeFields + delete', async () => {
    const f = mkFs(); f.docs[PEL] = alku();
    await S.tmHenkilokuntaKirjoita(f.db, SID, PID, { idp_fokus: { c: 3 }, idp_edistyma: 40 }, { pelaajaSet: true, henkilokuntaKirjoitus: false }); expect(f.docs[PEL].idp_fokus).toEqual({ a: 1, b: 2, c: 3 }); expect(sisaa(f)).toBe(false);
    await S.tmHenkilokuntaKirjoita(f.db, SID, PID, { idp_edistyma: 50, vastuuhenkilo: DEL }, { pelaajaSet: true, henkilokuntaKirjoitus: true }); expect(f.docs[SIS].idp_edistyma).toBe(50); expect(f.docs[SIS].idp_fokus).toBeUndefined(); expect(f.docs[PEL].vastuuhenkilo).toBeUndefined(); expect(f.docs[SIS].vastuuhenkilo).toBeUndefined();
  });
  it('tyhjä upd + taydenna: pelaajaa ei kirjoiteta (vain taydenna), ei virhettä', async () => {
    const f = mkFs(); f.docs[PEL] = alku(); let n = 0;
    await S.tmHenkilokuntaKirjoita(f.db, SID, PID, {}, { pelaajaSet: true, henkilokuntaKirjoitus: true, taydenna: (b) => { n++; b.set(f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).collection('reviewit').doc('d'), { a: 1 }, { merge: true }); } });
    expect(n).toBe(1); expect(f.docs[PEL + '/reviewit/d']).toEqual({ a: 1 }); expect(sisaa(f)).toBe(false); expect(f.docs[PEL]).toEqual(alku());
  });
  it('Lisaa + Varapolulla: transaktio — lippu päällä sisainen mukana; permission-denied → uusi yritys ilman sisainen:iä; lippu pois ei uudelleenyritystä', async () => {
    const yrita = (f, deps, pelaajaKirjoitus) => S.tmHenkilokuntaVarapolulla(deps, async (mukaan) => f.db.runTransaction(async (tx) => { tx.set(f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID), pelaajaKirjoitus, { merge: true }); if (mukaan) S.tmHenkilokuntaLisaa(tx, f.db, SID, PID, pelaajaKirjoitus, deps); }));
    const a = mkFs(); a.docs[PEL] = alku(); await yrita(a, { henkilokuntaKirjoitus: true }, { scout_potentiaali: 4, scout_potentiaali_pvm: '2026-11-02' }); expect(a.docs[SIS]).toMatchObject({ scout_potentiaali: 4, scout_potentiaali_pvm: '2026-11-02', seuraId: SID }); expect(a.docs[PEL].scout_potentiaali).toBe(4);
    const b = mkFs({ hylkaaSisainen: true }); b.docs[PEL] = alku(); const w = console.warn; console.warn = () => {}; try { await yrita(b, { henkilokuntaKirjoitus: true }, { scout_potentiaali: 3 }); } finally { console.warn = w; } expect(b.docs[PEL].scout_potentiaali).toBe(3); expect(b.docs[SIS]).toBeUndefined();
    const c = mkFs(); c.docs[PEL] = alku(); await yrita(c, {}, { scout_potentiaali: 2 }); expect(sisaa(c)).toBe(false); expect(c.docs[PEL].scout_potentiaali).toBe(2);
  });
  it('elinkaarihelperi: upd:n henkilokunta-kentät (review_viimeisin_*, vastuuhenkilo) menevät samaan sisainen-kirjoitukseen — myös kun jaksofokus-lippu on POIS; molemmat liput päällä yhdistyvät yhdeksi set:iksi', async () => {
    const upd = { jaksofokus: { konsepti_avain: 'k', alkoi: '2026-11-01T00:00:00.000Z', linkitetyt: ['a'] }, review_viimeisin_pvm: '2026-11-02', review_viimeisin_tyyppi: 'jakso' };
    const f = mkFs(); f.docs[PEL] = alku(); await S.tmJaksofokusElinkaariKirjoita(f.db, SID, PID, upd, { jaksofokus: upd.jaksofokus, historiaLisays: [] }, { FV, henkilokuntaKirjoitus: true });
    expect(f.docs[SIS]).toMatchObject({ review_viimeisin_pvm: '2026-11-02', review_viimeisin_tyyppi: 'jakso' }); expect(f.docs[SIS].jaksofokus_sisainen).toBeUndefined();
    const g = mkFs(); g.docs[PEL] = alku(); await S.tmJaksofokusElinkaariKirjoita(g.db, SID, PID, upd, { jaksofokus: upd.jaksofokus, historiaLisays: [] }, { FV, henkilokuntaKirjoitus: true, kirjoitus: true });
    expect(g.docs[SIS].jaksofokus_sisainen.linkitetyt).toEqual(['a']); expect(g.docs[SIS].review_viimeisin_pvm).toBe('2026-11-02'); expect(g.loki.filter((x) => /sisainen/.test(x))).toHaveLength(1);
    const h = mkFs(); h.docs[PEL] = alku(); await S.tmJaksofokusElinkaariKirjoita(h.db, SID, PID, upd, { jaksofokus: upd.jaksofokus, historiaLisays: [] }, { FV }); expect(sisaa(h)).toBe(false);
  });
});

describe('RUNTIME VP: _vpKirjoitaReview (review_viimeisin_*, review_tagit, tukitarve) ', () => {
  const lataa = (fs) => { const c = ctx(fs); vm.runInContext(viipale(lue('TalentMaster_VP_v25.html'), 'async function _vpKirjoitaReview(', '// Kirjaa MDT-review'), c); return c; };
  const kirjaa = (c, lisa) => vm.runInContext('_vpKirjoitaReview', c)(PID, '2026-11-02', { tyyppi: 'kehityskeskustelu', tekija_uid: 'u1', tekija_rooli: 'vp', idp_paivitetty: false }, alku(), lisa);
  it('lippu POIS: reviewit + pelaajan pikakentät samassa batchissa kuten ennen; ei sisainen-dokumenttia', async () => {
    const f = mkFs(); f.docs[PEL] = alku(); const plan = await kirjaa(lataa(f), { tukitarve: { alue: 'kestävyys', merkitty_pvm: '2026-11-02' } });
    expect(f.docs[PEL + '/reviewit/2026-11-02']).toBeDefined(); expect(f.docs[PEL].review_viimeisin_pvm).toBe('2026-11-02'); expect(f.docs[PEL].tukitarve.alue).toBe('kestävyys'); expect(sisaa(f)).toBe(false); expect(plan.pikakentat.review_viimeisin_tyyppi).toBe('kehityskeskustelu');
  });
  it('lippu PÄÄLLÄ: pelaajadokumentti ennallaan + sisainen saa review_* ja tukitarve; tukitarve POISTA → delete molemmissa; yhdistetty luku = pelaajadokumentti', async () => {
    LIPPU.kirjoitus = true; const f = mkFs(); f.docs[PEL] = alku(); const c = lataa(f);
    await kirjaa(c, { tukitarve: { alue: 'kestävyys', merkitty_pvm: '2026-11-02' } }); expect(f.docs[SIS]).toMatchObject({ seuraId: SID, review_viimeisin_pvm: '2026-11-02', review_viimeisin_tyyppi: 'kehityskeskustelu', tukitarve: { alue: 'kestävyys' } });
    expect(f.docs[PEL + '/reviewit/2026-11-02']).toBeDefined(); const y = S.tmSisainenYhdista(f.docs[PEL], f.docs[SIS]); expect(ilmanNull(y)).toEqual(ilmanNull(f.docs[PEL]));
    await kirjaa(c, { tukitarve: JM.POISTA }); expect(f.docs[PEL].tukitarve).toBeUndefined(); expect(f.docs[SIS].tukitarve).toBeUndefined();
  });
  it('Rules v3.69 ei vielä käytössä (permission-denied): review + pikakentät tallentuvat vanhaan kenttään, ei virhettä, ei sisainen:iä', async () => {
    LIPPU.kirjoitus = true; const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = alku(); const w = console.warn; console.warn = () => {};
    try { await kirjaa(lataa(f), {}); } finally { console.warn = w; } expect(f.docs[PEL].review_viimeisin_pvm).toBe('2026-11-02'); expect(f.docs[PEL + '/reviewit/2026-11-02']).toBeDefined(); expect(f.docs[SIS]).toBeUndefined();
  });
});

describe('RUNTIME Master: vastuuhenkilö, talentti_ehdotus; VP: vastuuhenkilö', () => {
  const masterLataa = (fs) => { const c = ctx(fs, { _mIdpP: () => fs.p }); const src = lue('TalentMaster_Master_v16.html');
    vm.runInContext(viipale(src, 'window._mAsetaVastuuhenkilo = async function', 'function _mIdpKorttiHTML') + '\n' + viipale(src, 'window._ehdotaTalentti = async function', '// backfillAdarPikakentat'), c); return c; };
  const vpLataa = (fs) => { const c = ctx(fs, { _vpIdpPelaaja: () => fs.p }); const src = lue('TalentMaster_VP_v25.html'); vm.runInContext(viipale(src, 'window._vpAsetaVastuuhenkilo = async function', 'function _vpKausitavoiteHTML'), c); return c; };
  for (const [nimi, lataa, aseta] of [['Master', masterLataa, '_mAsetaVastuuhenkilo'], ['VP', vpLataa, '_vpAsetaVastuuhenkilo']]) {
    it(nimi + ' vastuuhenkilö: lippu pois = vain pelaaja; päällä = pelaaja + sisainen; poisto → delete molemmissa', async () => {
      const f = mkFs(); f.docs[PEL] = alku(); f.p = Object.assign({ id: PID }, alku()); const c = lataa(f);
      await vm.runInContext(aseta, c)(PID, 'u9|valmentaja'); expect(f.docs[PEL].vastuuhenkilo.uid).toBe('u9'); expect(sisaa(f)).toBe(false);
      LIPPU.kirjoitus = true; f.p = Object.assign({ id: PID }, f.docs[PEL]); await vm.runInContext(aseta, c)(PID, 'u8|vp'); expect(f.docs[PEL].vastuuhenkilo.uid).toBe('u8'); expect(f.docs[SIS].vastuuhenkilo).toEqual(f.docs[PEL].vastuuhenkilo);
      f.p = Object.assign({ id: PID }, f.docs[PEL]); await vm.runInContext(aseta, c)(PID, ''); expect(f.docs[PEL].vastuuhenkilo).toBeUndefined(); expect(f.docs[SIS].vastuuhenkilo).toBeUndefined();
    });
  }
  it('Master vastuuhenkilö: permission-denied → vanha kenttä (ei virhetoastia)', async () => {
    LIPPU.kirjoitus = true; const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = alku(); f.p = Object.assign({ id: PID }, alku()); const toastit = []; const c = masterLataa(f); c.toast = (t, k) => toastit.push(k);
    const w = console.warn; console.warn = () => {}; try { await vm.runInContext('_mAsetaVastuuhenkilo', c)(PID, 'u9|valmentaja'); } finally { console.warn = w; }
    expect(f.docs[PEL].vastuuhenkilo.uid).toBe('u9'); expect(f.docs[SIS]).toBeUndefined(); expect(toastit).not.toContain('error');
  });
  it('Master talentti_ehdotus: lippu pois set-merge pelaajaan; päällä myös sisainen', async () => {
    const f = mkFs(); f.docs[PEL] = alku(); const c = masterLataa(f); await vm.runInContext('window._ehdotaTalentti', c)(PID); expect(f.docs[PEL].talentti_ehdotus.lahde).toBe('ristiinarvio'); expect(sisaa(f)).toBe(false);
    LIPPU.kirjoitus = true; await vm.runInContext('window._ehdotaTalentti', c)(PID); expect(f.docs[SIS].talentti_ehdotus).toEqual(f.docs[PEL].talentti_ehdotus);
  });
});

describe('RUNTIME Master: jakson aloitus (1b-3:ssa suora update) + sulku — nyt helperin kautta; jaksofokus- ja henkilokunta-liput yhdessä', () => {
  it('Master _mAloitaJakso…: lähdekoodi kutsuu tmJaksofokusElinkaariKirjoita:a (ei suoraa update(tmAloitaJaksoKirjoitus)); sulku: review_viimeisin_* sisainen:iin kun henkilokunta-lippu päällä', async () => {
    const src = lue('TalentMaster_Master_v16.html'); expect(src).toMatch(/_ajUpd = AJ\.tmAloitaJaksoKirjoitus[\s\S]{0,700}tmJaksofokusElinkaariKirjoita\(_db, _seuraId, p\.id, _ajUpd,/); expect(src).not.toMatch(/\.update\(AJ\.tmAloitaJaksoKirjoitus/);
    const f = mkFs(); f.docs[PEL] = alku(); const c = ctx(f); vm.runInContext(viipale(src, 'async function _mKirjoitaJaksofokus(', 'window._ttVieTreeniin') + '\n' + viipale(src, 'async function _kvkKirjoita(', 'function _kvkOptsT'), c);
    LIPPU.kirjoitus = true; S.RYHMAT.jaksofokus_sisainen.kirjoitus = true; const p = Object.assign({ id: PID }, alku(), { jaksofokus: { konsepti_avain: 'k', konsepti_nimi: 'K', alkoi: '2026-10-05T08:00:00.000Z', kesto_vk: 6, linkitetyt: ['a'] } });
    const s = KS.tmSuljeJakso(p, { harjoituksia: 3, arvio_vp: 3, arvioija_rooli: 'vp' }, { nytISO: '2026-11-02T09:00:00.000Z', pvm: '2026-11-02' });
    await vm.runInContext('_kvkKirjoita', c)(p, { jaksofokus: s.jaksofokus, historiaLisays: s.historiaLisays, pikakentat: s.pikakentat, reviewitPvm: '2026-11-02', reviewitData: { pvm: '2026-11-02' } }, PID);
    expect(f.docs[SIS]).toMatchObject({ review_viimeisin_pvm: '2026-11-02', review_viimeisin_tyyppi: 'jakso' }); expect(f.docs[PEL].review_viimeisin_pvm).toBe('2026-11-02'); expect(f.docs[PEL + '/reviewit/2026-11-02']).toBeDefined();
    expect(Object.values(f.docs[SIS].historia_sisainen || {})[0]).toMatchObject({ arvio_vp: 3 }); expect(f.loki.filter((x) => /sisainen/.test(x))).toHaveLength(1);   // molemmat liput päällä → YKSI set sisainen:iin (henkilokunta + historia_sisainen)
  });
});

describe('kytkentä ja versiot', () => {
  it('jokainen kirjoituspaikka kulkee tm_sisainen.js:n kautta (lippu pois = vanha polku); versiot ylös; Pelaaja/Vanhempi eivät lataa lib:iä', () => {
    const m = lue('TalentMaster_Master_v16.html'), v = lue('TalentMaster_VP_v25.html');
    expect((m.match(/tmHenkilokuntaKirjoita\(_db, _seuraId,/g) || []).length).toBe(4);   // vastuuhenkilö · IDP · talentti_ehdotus · K1f-katselmus
    expect((v.match(/window\.TM_SISAINEN \? window\.TM_SISAINEN\.tmHenkilokuntaKirjoita\(db, _seuraId, /g) || []).length).toBe(4);   // vastuuhenkilö · IDP · scout (poisto + ei-AH-haara); inline: testit poimivat funktiot irti sivusta
    expect(v).toMatch(/if \(window\.TM_SISAINEN\) await window\.TM_SISAINEN\.tmHenkilokuntaKirjoita\(db, _seuraId, pid, pk, \{ pelaajaSet: true, taydenna: _rv \}\)/);   // review
    expect(v).toMatch(/tmHenkilokuntaVarapolulla\(\{\}, _kirjP\)/); expect(v).toMatch(/tmHenkilokuntaLisaa\(tx, db, _seuraId, p\.id, pika, \{\}\)/);
    expect(lue('lib/tm_idp_lomake.js')).toMatch(/tmHenkilokuntaKirjoita\(d\.db, d\.sid, d\.pid, upd, \{ pelaajaSet: true \}\)/); expect(lue('lib/tm_kt_keskustelu_sheet.js')).toMatch(/tmHenkilokuntaKirjoita\(env\.db, env\.sid, p\.id, plan\.pikakentat,/);
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html']) expect(lue(f), f).toMatch(/lib\/tm_sisainen\.js\?v=(?:1[1-9]|[2-9]\d)\b/);
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(lue(f)).not.toMatch(/<script[^>]+src="lib\/(tm_sisainen|tm_idp_lomake|tm_kt_keskustelu_sheet)\.js/));
    expect(lue('functions/tm_sisainen.js')).toBe(lue('lib/tm_sisainen.js')); expect(LIPPU.kirjoitus).toBe(false);
  });
});
