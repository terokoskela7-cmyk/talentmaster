/* Vaihe 1 / PR 1b-3 — jakson elinkaari (aloitus · havainto · sulku) + loput A-kentät (tavoite_alue, valitavoite_idx, poikkeama, oma_jakso) → sisainen/tiedot.
   Lippu RYHMAT.jaksofokus_sisainen.kirjoitus on OLETUKSENA POIS (sama kuin 1b-2). Runtime-ajot käyttävät OIKEAA sivukoodia (Master + VP -funktiot vm-hiekkalaatikossa) muistinvaraisella Firestore-fakella,
   jossa update/set(merge|mergeFields)/batch/FieldValue.delete/arrayUnion toimivat oikeilla semantiikoilla. P7 (pelaajan Tänään) -snapshot: sama tulos täydellä ja A-osista siivotulla pelaajadokumentilla. */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js'), KS = require('../lib/tm_kehityssilmukka.js'), KT = require('../lib/tm_kehitystyopoyta.js'), TK = require('../lib/tm_tanaan_kentta.js');
const YP = (p, s) => S.tmSisainenYhdista(p, s, { kirjoitus: true });   // dual-read seuraa lippua (PR 1b-3): luku sisainen:stä vain lippu päällä
const VO = require('../lib/tm_viikon_osa.js'), KH = require('../lib/tm_kotiharjoitteet.js');
const LIPPU = S.RYHMAT.jaksofokus_sisainen;
afterEach(() => { LIPPU.kirjoitus = false; });

/* ── Muistinvarainen Firestore: oikeat semantiikat (dot-polku update, set merge / mergeFields, batch kaikki-tai-ei-mitään, delete + arrayUnion -sentinelit) ── */
const DEL = { __fv: 'delete' }, FV = { delete: () => DEL, arrayUnion: (...a) => ({ __fv: 'union', a }) };
const kopio = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const olio = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && !x.__fv;
function aseta(d, polku, arvo) {
  const k = polku.split('.'); let o = d;
  for (let i = 0; i < k.length - 1; i++) { if (!olio(o[k[i]])) o[k[i]] = {}; o = o[k[i]]; }
  const l = k[k.length - 1];
  if (arvo && arvo.__fv === 'delete') delete o[l];
  else if (arvo && arvo.__fv === 'union') { const vanha = Array.isArray(o[l]) ? o[l] : []; o[l] = vanha.concat(arvo.a.filter((r) => !vanha.some((v) => JSON.stringify(v) === JSON.stringify(r)))); }
  else o[l] = kopio(arvo);
}
function syvaYhdista(kohde, lahde) {
  Object.keys(lahde).forEach((k) => {
    const v = lahde[k];
    if (v && v.__fv) aseta(kohde, k, v);
    else if (olio(v)) { if (!olio(kohde[k])) kohde[k] = {}; syvaYhdista(kohde[k], v); }
    else kohde[k] = kopio(v);
  });
}
function haePolku(d, polku) { return polku.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d); }
function mkFs(opts) {
  opts = opts || {}; const docs = {}, loki = []; let commits = 0;
  const op = {
    update(path, u) { if (!docs[path]) throw new Error('NOT_FOUND ' + path); Object.keys(u).forEach((k) => aseta(docs[path], k, u[k])); },
    set(path, d, o) {
      if (!o) { docs[path] = {}; syvaYhdista(docs[path], d); return; }
      docs[path] = docs[path] || {};
      if (o.mergeFields) o.mergeFields.forEach((f) => { aseta(docs[path], f, haePolku(d, f)); });
      else if (o.merge) syvaYhdista(docs[path], d);
    }
  };
  const ref = (path) => ({ _path: path, id: path.split('/').pop(), collection: (c) => ({ doc: (i) => ref(path + '/' + c + '/' + i) }),
    update: async (u) => { loki.push({ t: 'update', path }); op.update(path, u); }, set: async (d, o) => { loki.push({ t: 'set', path, o }); op.set(path, d, o); } });
  const db = { collection: (c) => ({ doc: (i) => ref(c + '/' + i) }), batch: () => { const b = []; return { update: (r, u) => b.push(['update', r._path, u]), set: (r, d, o) => b.push(['set', r._path, d, o]),
    commit: async () => {
      commits++; if (opts.hylkaaSisainen && b.some((x) => /\/sisainen\//.test(x[1]))) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; }
      const varmuus = kopio(docs); try { b.forEach((x) => { loki.push({ t: x[0], path: x[1], batch: true, o: x[3] }); op[x[0]](x[1], x[2], x[3]); }); } catch (e) { Object.keys(docs).forEach((k) => delete docs[k]); Object.assign(docs, varmuus); throw e; }
    } }; } };
  return { db, docs, loki, commits: () => commits };
}
const SID = 's', PID = 'p1', PEL = `seurat/${SID}/pelaajat/${PID}`, SIS = PEL + '/sisainen/tiedot';
const ilmanNull = (x) => { const j = JSON.stringify(x, (k, v) => (v === null ? undefined : v)); return j === undefined ? undefined : JSON.parse(j); };   // null = "ei arvoa" (tmHistoriaJaa/_onArvo): ei A-kenttänä eikä julkisena
const julkinenPelaaja = (p) => {   // pelaajadokumentti PR 2 -tilassa: A-osat poissa (jaksofokus + historiarivit)
  const x = kopio(p); x.jaksofokus = x.jaksofokus ? S.tmJaksofokusJaa(x.jaksofokus).julkinen : x.jaksofokus;
  if (Array.isArray(x.jaksofokus_historia)) x.jaksofokus_historia = x.jaksofokus_historia.map((r) => S.tmHistoriaJaa(r).julkinen); return x;
};

/* ── Fixturet ── */
const ALKOI1 = '2026-10-05T08:00:00.000Z', NYT1 = '2026-10-05T08:00:00.000Z', NYT2 = '2026-11-16T09:00:00.000Z', NYT3 = '2026-11-20T09:00:00.000Z';
const JF1 = () => ({ konsepti_avain: 'y_h2', konsepti_nimi: 'Kuljettaminen', domeeni: 'teknis_taktinen', kesto_vk: 6, alkoi: ALKOI1, asetti: { rooli: 'vp', pvm: '2026-10-05' }, lahde: 'valmentaja',
  tavoite_alue: 'tekninen', valitavoite_idx: 0, poikkeama: true, oma_jakso: true, linkitetyt: ['a', 'b'], tavoite_tarkenteet: ['Ensikosketus'], onnistumiskriteeri: '3/5 onnistuu' });
const JF2 = () => ({ konsepti_avain: 'y_h5', konsepti_nimi: 'Syöttö', domeeni: 'teknis_taktinen', kesto_vk: 4, asetti: { rooli: 'valmentaja', pvm: '2026-11-16' }, lahde: 'valmentaja' });   // ei A-osia
const JF3 = () => Object.assign(JF2(), { konsepti_avain: 'y_h7', konsepti_nimi: 'Viimeistely', linkitetyt: ['z'] });
const pelaajaAlku = () => ({ id: PID, etunimi: 'Toppari', seuraId: SID, syntymaVuosi: 2013, jaksofokus: null, jaksofokus_historia: [] });

/* ── Sivukoodin lataus vm-hiekkalaatikkoon (OIKEAT funktiot sivuilta) ── */
function viipale(src, alku, loppu) { const a = src.indexOf(alku), b = src.indexOf(loppu, a); if (a < 0 || b < 0) throw new Error('viipaletta ei löytynyt: ' + alku); return src.slice(a, b); }
function ctxPohja(fs, lisa) {
  const ctx = Object.assign({ console, Promise, JSON, Object, Array, String, Date, Error, _seuraId: SID, _isDemoMode: false, db: fs.db, _db: fs.db, firebase: { firestore: { FieldValue: FV }, auth: () => ({ currentUser: null }) },
    _ktPaivita() {}, _vpAloitusReRender() {}, _vpKehAskelReRender() {}, toast() {}, vpT: (x) => x, TM_VIRHEKOODI: { tmVirheTeksti: (t) => t } }, lisa || {});
  ctx.window = ctx; ctx.TM_SISAINEN = S; ctx.TM_KEHITYSSILMUKKA = KS; return vm.createContext(ctx);
}
function masterAjuri(fs) {
  const src = lue('TalentMaster_Master_v16.html'), ctx = ctxPohja(fs, { _demo: false, _db: fs.db });
  vm.runInContext(viipale(src, 'async function _mKirjoitaJaksofokus(', 'window._ttVieTreeniin') + '\n' + viipale(src, 'async function _kvkKirjoita(', 'function _kvkOptsT'), ctx);
  return ctx;
}
function vpAjuri(fs) {
  const src = lue('TalentMaster_VP_v25.html'), ctx = ctxPohja(fs);
  vm.runInContext(viipale(src, 'async function _vpJfKirjoita(', '// Osapäivitys dot-poluilla') + '\n' + viipale(src, 'async function _kvkKirjoita(', 'function _kvkPaikka'), ctx);
  return ctx;
}
/* Vanha Master (ennen 1b-3): kirjoittaa vain pelaajadokumenttiin (update) — "lippu pois" -selain / välimuisti-Master */
async function vanhaMaster(fs, p, v) {
  const upd = { jaksofokus: v.jaksofokus }; if (v.historiaLisays.length) upd.jaksofokus_historia = FV.arrayUnion(...v.historiaLisays);
  await fs.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).update(upd); p.jaksofokus = v.jaksofokus; p.jaksofokus_historia = (p.jaksofokus_historia || []).concat(v.historiaLisays);
}

/* Elinkaari-skenaario sivun omilla funktioilla: aloitus → havainto → sulku (uusi jakso) → sulku (ei uutta) */
async function ajaElinkaari(ajuri, kirjoitaJakso, kirjoitaKatselmus, fs, vaihe) {
  const p = pelaajaAlku(); fs.docs[PEL] = kopio(p); const tilat = [];
  // 1) aloitus (JF1: kaikki A-kentät mukana)
  let v = KS.tmAsetaJaksofokus(p, JF1(), { nytISO: NYT1 }); await kirjoitaJakso(p, v); p.jaksofokus = v.jaksofokus; tilat.push(kopio(fs.docs));
  // 2) havainto (1b-2 osapäivitys samalla lipulla) — oikea KT-ydin
  const m = { db: fs.db, sid: SID, auth: () => ({ uid: 'u1', getIdToken: async () => 't', getIdTokenResult: async () => ({ claims: { rooli: 'valmentaja' } }) }), KS, rooli: 'valmentaja', uid: 'u1', nyt: () => new Date(2026, 9, 19), eiToastia: true, poista: KS.POISTA, kumoaFn() {} };
  await KT.tmKtTallennaOsaArvio(m, p, 'y_h2', 'a', 2, 'Hyvä ensikosketus'); tilat.push(kopio(fs.docs));
  // 3) sulku + uusi jakso (JF2: ei A-osia) — arvio_vp/kalibraatio_ero mukana → historiarivin A-osa
  let s = KS.tmSuljeJakso(p, { harjoituksia: 9, lasnaolo: 0.8, arvio_vp: 3, arvio_itse: 2, arvioija_rooli: 'vp', kalibraatio_ero: 1, uusi: JF2() }, { nytISO: NYT2, pvm: '2026-11-16' });
  await kirjoitaKatselmus(p, { jaksofokus: s.jaksofokus, historiaLisays: s.historiaLisays, pikakentat: s.pikakentat, reviewitPvm: '2026-11-16', reviewitData: { pvm: '2026-11-16', hylkays_sisainen: { teksti: 'x' } } });
  p.jaksofokus = s.jaksofokus; tilat.push(kopio(fs.docs));
  // 4) uusi jakso (JF3: yksi A-osa) ja sen sulku ilman uutta jaksoa (jaksofokus null)
  v = KS.tmAsetaJaksofokus(p, JF3(), { nytISO: NYT2 }); await kirjoitaJakso(p, v); p.jaksofokus = v.jaksofokus; tilat.push(kopio(fs.docs));
  s = KS.tmSuljeJakso(p, { harjoituksia: 3, arvio_valmentaja: 2, arvioija_rooli: 'valmentaja' }, { nytISO: NYT3, pvm: '2026-11-20' });
  await kirjoitaKatselmus(p, { jaksofokus: s.jaksofokus, historiaLisays: s.historiaLisays, pikakentat: s.pikakentat, reviewitPvm: '2026-11-20', reviewitData: null });
  p.jaksofokus = s.jaksofokus; tilat.push(kopio(fs.docs));
  return { p, tilat };
}
const masterKirjoitukset = (ctx) => ({
  jakso: (p, v) => vm.runInContext('_mKirjoitaJaksofokus', ctx)(p, v, PID),
  katselmus: (p, plan) => vm.runInContext('_kvkKirjoita', ctx)(p, plan, PID)
});
const vpKirjoitukset = (ctx) => ({
  jakso: (p, v) => vm.runInContext('_vpKirjoitaJaksofokus', ctx)(p, v, 'tallennettu'),
  katselmus: (p, plan) => vm.runInContext('_kvkKirjoita', ctx)(p, plan, 'tallennettu')
});

describe('jako ja rekisteri: kaikki 9 jaksofokuksen A-kenttää + leima; B/C jää julkiseksi', () => {
  it('tmJaksofokusElinkaariSisainen: jokainen A-kenttä (myös valitavoite_idx 0, poikkeama, oma_jakso, tavoite_alue) → jaksofokus_sisainen + jakso_avain; asetti/lahde/konsepti_* eivät', () => {
    const r = S.tmJaksofokusElinkaariSisainen(SID, { jaksofokus: JF1(), historiaLisays: [] }, { FV, nytISO: 'T' });
    expect(r.data.jaksofokus_sisainen).toEqual({ jakso_avain: ALKOI1 + '_y_h2', tavoite_alue: 'tekninen', valitavoite_idx: 0, poikkeama: true, oma_jakso: true, linkitetyt: ['a', 'b'], tavoite_tarkenteet: ['Ensikosketus'], onnistumiskriteeri: '3/5 onnistuu' });
    expect(r.data.seuraId).toBe(SID); expect(r.mergeFields).toEqual(['seuraId', 'paivitetty', 'jaksofokus_sisainen']);
    S.JAKSOFOKUS_A.forEach((k) => { if (JF1()[k] !== undefined) expect(r.data.jaksofokus_sisainen[k], k).toEqual(JF1()[k]); });
    ['asetti', 'lahde', 'konsepti_avain', 'domeeni', 'kesto_vk', 'alkoi'].forEach((k) => expect(r.data.jaksofokus_sisainen[k], k).toBeUndefined());
  });
  it('ei A-osia tai jaksofokus null → jaksofokus_sisainen poistetaan (FieldValue.delete) — edellisen jakson A-osat eivät jää voittamaan; ilman FV:tä heittää selkeän virheen', () => {
    expect(S.tmJaksofokusElinkaariSisainen(SID, { jaksofokus: JF2(), historiaLisays: [] }, { FV }).data.jaksofokus_sisainen).toBe(DEL);
    expect(S.tmJaksofokusElinkaariSisainen(SID, { jaksofokus: null, historiaLisays: [] }, { FV }).data.jaksofokus_sisainen).toBe(DEL);
    expect(() => S.tmJaksofokusElinkaariSisainen(SID, { jaksofokus: null, historiaLisays: [] }, {})).toThrow(/FieldValue/);
    expect(S.tmJaksofokusElinkaariSisainen(SID, { historiaLisays: [] }, { FV })).toBeNull();   // avain 'jaksofokus' puuttuu → ei elinkaarikirjoitus
  });
  it('historiarivit: A-osa → historia_sisainen.<avain> (mergeFields-polku riveittäin); rivi ilman A-osaa tai avainta ohitetaan; lause jää julkiseen riviin', () => {
    const rivit = [{ alkoi: ALKOI1, konsepti_avain: 'y_h2', lause: 'Hyvä jakso', arvio_vp: 3, kalibraatio_ero: 1, havainnot_vk: { a: 1 } }, { alkoi: ALKOI1, konsepti_avain: 'y_h9', lause: 'vain lause' }, { konsepti_avain: 'x', arvio_vp: 2 }];
    const r = S.tmJaksofokusElinkaariSisainen(SID, { jaksofokus: null, historiaLisays: rivit }, { FV }), avain = S.tmHistoriaAvain(rivit[0]);
    expect(r.data.historia_sisainen).toEqual({ [avain]: { arvio_vp: 3, kalibraatio_ero: 1, havainnot_vk: { a: 1 } } }); expect(r.mergeFields).toContain('historia_sisainen.' + avain); expect(r.mergeFields).toHaveLength(4);
    expect(S.tmHistoriaJaa(rivit[0]).julkinen).toEqual({ alkoi: ALKOI1, konsepti_avain: 'y_h2', lause: 'Hyvä jakso' });
  });
  it('lippu on koodissa edelleen POIS; tmJaksoAvain', () => { expect(LIPPU.kirjoitus).toBe(false); expect(S.tmJaksoAvain(JF1())).toBe(ALKOI1 + '_y_h2'); expect(S.tmJaksoAvain({ konsepti_avain: 'x' })).toBeNull(); expect(S.tmJaksoAvain(null)).toBeNull(); });
});

describe('tmJaksofokusElinkaariKirjoita: lippu, batch, varapolku, taydenna', () => {
  const v = () => ({ jaksofokus: JF1(), historiaLisays: [{ alkoi: ALKOI1, konsepti_avain: 'edellinen', arvio_vp: 2 }] }), upd = () => ({ jaksofokus: JF1(), jaksofokus_historia: FV.arrayUnion({ alkoi: ALKOI1, konsepti_avain: 'edellinen', arvio_vp: 2 }) });
  it('lippu POIS (oletus): vain pelaajan update (ei batchia, ei sisainen-dokumenttia); taydenna → batch mutta ilman sisainen:iä', async () => {
    const f = mkFs(); f.docs[PEL] = pelaajaAlku();
    expect(await S.tmJaksofokusElinkaariKirjoita(f.db, SID, PID, upd(), v(), { FV })).toEqual({ ok: true, sisainen: false, sisainenOhitettu: false }); expect(f.commits()).toBe(0); expect(f.docs[SIS]).toBeUndefined();
    const g = mkFs(); g.docs[PEL] = pelaajaAlku(); let kutsuttu = 0;
    await S.tmJaksofokusElinkaariKirjoita(g.db, SID, PID, upd(), v(), { FV, taydenna: (b) => { kutsuttu++; b.set(g.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).collection('reviewit').doc('2026-11-16'), { x: 1 }, { merge: true }); } });
    expect(g.commits()).toBe(1); expect(kutsuttu).toBe(1); expect(g.docs[PEL + '/reviewit/2026-11-16']).toEqual({ x: 1 }); expect(g.docs[SIS]).toBeUndefined();
  });
  it('lippu PÄÄLLÄ: YKSI batch — pelaaja (kaikki kuten ennen) + sisainen mergeFields + taydenna; sisainen-dokumentti saa A-osat ja historiarivin A-osan', async () => {
    LIPPU.kirjoitus = true; const f = mkFs(); f.docs[PEL] = pelaajaAlku(); let kutsuttu = 0;
    const r = await S.tmJaksofokusElinkaariKirjoita(f.db, SID, PID, upd(), v(), { FV, nytISO: 'T', taydenna: () => { kutsuttu++; } });
    expect(r).toEqual({ ok: true, sisainen: true, sisainenOhitettu: false }); expect(f.commits()).toBe(1); expect(kutsuttu).toBe(1);
    expect(f.docs[PEL].jaksofokus).toEqual(JF1()); expect(f.docs[SIS].jaksofokus_sisainen.linkitetyt).toEqual(['a', 'b']); expect(f.docs[SIS].historia_sisainen[S.tmHistoriaAvain(v().historiaLisays[0])]).toEqual({ arvio_vp: 2 });
  });
  it('KORVAUS: uusi jakso ilman A-osia poistaa edellisen jakson jaksofokus_sisainen-kentän; historia_sisainen-rivit säilyvät (lisäys, ei korvaus)', async () => {
    LIPPU.kirjoitus = true; const f = mkFs(); f.docs[PEL] = pelaajaAlku();
    await S.tmJaksofokusElinkaariKirjoita(f.db, SID, PID, upd(), v(), { FV });
    await S.tmJaksofokusElinkaariKirjoita(f.db, SID, PID, { jaksofokus: JF2() }, { jaksofokus: JF2(), historiaLisays: [] }, { FV });
    expect(f.docs[SIS].jaksofokus_sisainen).toBeUndefined(); expect(Object.keys(f.docs[SIS].historia_sisainen)).toHaveLength(1); expect(f.docs[SIS].seuraId).toBe(SID);
  });
  it('permission-denied (Rules v3.68 ei käytössä) → uusi batch ILMAN sisainen:iä (pelaaja + taydenna tallentuvat), sisainenOhitettu; muu virhe heitetään; varapolku:false heittää', async () => {
    LIPPU.kirjoitus = true; const f = mkFs({ hylkaaSisainen: true }); f.docs[PEL] = pelaajaAlku(); let n = 0;
    const r = await S.tmJaksofokusElinkaariKirjoita(f.db, SID, PID, upd(), v(), { FV, taydenna: (b) => { n++; b.set(f.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).collection('reviewit').doc('d'), { a: 1 }, { merge: true }); } });
    expect(r).toEqual({ ok: true, sisainen: false, sisainenOhitettu: true }); expect(f.docs[PEL].jaksofokus).toEqual(JF1()); expect(f.docs[SIS]).toBeUndefined(); expect(f.docs[PEL + '/reviewit/d']).toEqual({ a: 1 }); expect(n).toBe(2);
    await expect(S.tmJaksofokusElinkaariKirjoita(mkFs({ hylkaaSisainen: true }).db, SID, PID, upd(), v(), { FV, varapolku: false })).rejects.toThrow(/permissions/);
  });
});

describe('dual-read: leima suojaa vanhan asiakkaan jaksonvaihdolta', () => {
  it('sisainen on toiselta jaksolta (jakso_avain ≠ nykyinen jakso) → sisainen-osat ohitetaan; sama jakso / ei leimaa (migraatio, 1b-2) → sisainen voittaa kuten ennen', () => {
    const jfUusi = { konsepti_avain: 'y_h5', alkoi: '2026-11-16T09:00:00.000Z', osa_havainnot: { x: { a: { u: { arvo: 3 } } } } }, sis = { jaksofokus_sisainen: { jakso_avain: ALKOI1 + '_y_h2', osa_havainnot: { y_h2: { a: { u: { arvo: 1 } } } }, linkitetyt: ['vanha'] } };
    const y = YP({ jaksofokus: jfUusi }, sis); expect(y.jaksofokus).toEqual(jfUusi);
    const sama = YP({ jaksofokus: { konsepti_avain: 'y_h2', alkoi: ALKOI1 } }, sis); expect(sama.jaksofokus.linkitetyt).toEqual(['vanha']); expect(sama.jaksofokus.jakso_avain).toBeUndefined();
    const ilmanLeimaa = YP({ jaksofokus: jfUusi }, { jaksofokus_sisainen: { linkitetyt: ['m'] } }); expect(ilmanLeimaa.jaksofokus.linkitetyt).toEqual(['m']);
  });
});

describe.each([['Master', masterAjuri, masterKirjoitukset], ['VP', vpAjuri, vpKirjoitukset]])('RUNTIME %s: oikea sivukoodi — aloitus · havainto · sulku', (nimi, ajuri, kirj) => {
  it('lippu POIS: ei sisainen-dokumenttia lainkaan; pelaajadokumentti identtinen vanhan Masterin (update) tuottaman kanssa', async () => {
    const f = mkFs(), c = ajuri(f), k = kirj(c); const tulos = await ajaElinkaari(c, k.jakso, k.katselmus, f, 'pois');
    expect(Object.keys(f.docs).some((x) => /sisainen/.test(x))).toBe(false); expect(tulos.p.jaksofokus_historia).toHaveLength(3);
    const vanha = mkFs(); await ajaElinkaari(null, (p, v) => vanhaMaster(vanha, p, v), async (p, plan) => {
      const upd = { jaksofokus: plan.jaksofokus }; if (plan.historiaLisays.length) upd.jaksofokus_historia = FV.arrayUnion(...plan.historiaLisays); upd.ydinvahvuus_valinta = undefined; delete upd.ydinvahvuus_valinta; Object.assign(upd, plan.pikakentat);
      await vanha.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).update(upd); p.jaksofokus = plan.jaksofokus; p.jaksofokus_historia = (p.jaksofokus_historia || []).concat(plan.historiaLisays); if (plan.reviewitData) await vanha.db.collection('seurat').doc(SID).collection('pelaajat').doc(PID).collection('reviewit').doc(plan.reviewitPvm).set(plan.reviewitData, { merge: true });
    }, vanha, 'vanha');
    expect(f.docs[PEL]).toEqual(vanha.docs[PEL]); expect(f.docs[PEL + '/reviewit/2026-11-16']).toEqual(vanha.docs[PEL + '/reviewit/2026-11-16']);
  });
  it('lippu PÄÄLLÄ: pelaajadokumentti ennallaan (dual-write) + sisainen/tiedot elää jakson mukana; yhdistetty luku = täysi pelaajadokumentti joka vaiheessa (myös A-siivotulla pelaajadokumentilla)', async () => {
    LIPPU.kirjoitus = true; const f = mkFs(), c = ajuri(f), k = kirj(c); const { tilat } = await ajaElinkaari(c, k.jakso, k.katselmus, f, 'paalla');
    // 1) aloitus: kaikki A-kentät sisainen:ssä
    expect(tilat[0][SIS].jaksofokus_sisainen).toEqual({ jakso_avain: ALKOI1 + '_y_h2', tavoite_alue: 'tekninen', valitavoite_idx: 0, poikkeama: true, oma_jakso: true, linkitetyt: ['a', 'b'], tavoite_tarkenteet: ['Ensikosketus'], onnistumiskriteeri: '3/5 onnistuu' });
    // 2) havainto: osa_havainnot sisainen:ssä, aloituksen kentät säilyvät, leima ennallaan
    const h = tilat[1][SIS].jaksofokus_sisainen; expect(h.osa_havainnot.y_h2.a.u1).toMatchObject({ arvo: 2, lause: 'Hyvä ensikosketus' }); expect(h.linkitetyt).toEqual(['a', 'b']); expect(h.jakso_avain).toBe(ALKOI1 + '_y_h2'); expect(Object.keys(h.osa_havainnot_vk).length).toBe(1);
    // 3) sulku + uusi (ei A-osia): edellisen jakson A-osat POIS, historiarivin A-osa mukana, lause/B jää julkiseen riviin
    expect(tilat[2][SIS].jaksofokus_sisainen).toBeUndefined(); const hs = Object.values(tilat[2][SIS].historia_sisainen); expect(hs).toHaveLength(1); expect(hs[0]).toMatchObject({ arvio_vp: 3, arvio_itse: 2, arvioija_rooli: 'vp', kalibraatio_ero: 1 }); expect(hs[0].havainnot_vk).toBeDefined();
    expect(tilat[2][PEL + '/reviewit/2026-11-16'].hylkays_sisainen).toEqual({ teksti: 'x' });   // reviewit samassa batchissa
    // 4) uusi jakso yhdellä A-osalla → leima uudelle jaksolle; sulku ilman uutta → kenttä pois, historia_sisainen kasvaa
    expect(tilat[3][SIS].jaksofokus_sisainen).toMatchObject({ linkitetyt: ['z'], jakso_avain: expect.stringMatching(/_y_h7$/) }); expect(tilat[4][SIS].jaksofokus_sisainen).toBeUndefined(); expect(Object.keys(tilat[4][SIS].historia_sisainen)).toHaveLength(2);
    // yhdistetty luku = täysi dokumentti (myös kun pelaajadokumentin A-osat on siivottu, PR 2)
    tilat.forEach((t, i) => { const pel = t[PEL], sis = t[SIS]; const y = YP(julkinenPelaaja(pel), sis); expect(ilmanNull(y.jaksofokus), `${nimi} vaihe ${i + 1} jaksofokus`).toEqual(ilmanNull(pel.jaksofokus)); expect(ilmanNull(y.jaksofokus_historia), `${nimi} vaihe ${i + 1} historia`).toEqual(ilmanNull(pel.jaksofokus_historia)); });
  });
  it('lippu päällä mutta Rules ei vielä (permission-denied): koko elinkaari toimii vanhaan kenttään, ei sisainen-dokumenttia, ei virhettä käyttäjälle', async () => {
    LIPPU.kirjoitus = true; const f = mkFs({ hylkaaSisainen: true }), c = ajuri(f), k = kirj(c); const { p } = await ajaElinkaari(c, k.jakso, k.katselmus, f, 'rules');
    expect(f.docs[SIS]).toBeUndefined(); expect(f.docs[PEL].jaksofokus_historia).toHaveLength(3); expect(f.docs[PEL].jaksofokus).toBeNull(); expect(p.jaksofokus).toBeNull();
  });
});

describe('RUNTIME vanha Master lippu pois + uusi sivu lippu päällä samalle pelaajalle (sekakäyttö cutoverissa)', () => {
  it('uusi sivu kirjoittaa jakson (sisainen + leima); vanha Master vaihtaa jakson vain pelaajadokumenttiin → dual-read ohittaa vanhentuneen sisainen:in; uusi sivu korjaa seuraavalla kirjoituksella', async () => {
    LIPPU.kirjoitus = true; const f = mkFs(), c = masterAjuri(f), k = masterKirjoitukset(c), p = pelaajaAlku(); f.docs[PEL] = kopio(p);
    let v = KS.tmAsetaJaksofokus(p, JF1(), { nytISO: NYT1 }); await k.jakso(p, v); p.jaksofokus = v.jaksofokus;
    // vanha Master (välimuisti): sulkee jakson ja aloittaa uuden JF3:n (linkitetyt: ['z']) — vain pelaajadokumenttiin
    const s = KS.tmSuljeJakso(p, { harjoituksia: 2, arvioija_rooli: 'valmentaja', arvio_valmentaja: 2, uusi: JF3() }, { nytISO: NYT2, pvm: '2026-11-16' }); await vanhaMaster(f, p, { jaksofokus: s.jaksofokus, historiaLisays: s.historiaLisays });
    expect(f.docs[SIS].jaksofokus_sisainen.linkitetyt).toEqual(['a', 'b']);   // vanhentunut
    const y = YP(f.docs[PEL], f.docs[SIS]); expect(y.jaksofokus.linkitetyt).toEqual(['z']); expect(y.jaksofokus.tavoite_alue).toBeUndefined();   // edellisen jakson A-osat EIVÄT vuoda uuteen jaksoon
    const julk = YP(julkinenPelaaja(f.docs[PEL]), f.docs[SIS]); expect(julk.jaksofokus.linkitetyt).toBeUndefined();   // PR 2 -tilassa vanhentunut sisainen vain piilotetaan (ei näytetä väärää)
    // uusi sivu kirjoittaa seuraavan elinkaaritapahtuman → sisainen korjautuu
    const s2 = KS.tmSuljeJakso(Object.assign({}, p, { jaksofokus: s.jaksofokus }), { harjoituksia: 1, arvioija_rooli: 'vp', arvio_vp: 3 }, { nytISO: NYT3, pvm: '2026-11-20' }); await k.katselmus(p, { jaksofokus: s2.jaksofokus, historiaLisays: s2.historiaLisays, pikakentat: s2.pikakentat, reviewitPvm: '2026-11-20', reviewitData: null });
    expect(f.docs[SIS].jaksofokus_sisainen).toBeUndefined();
  });
  it('lippu pois -sivu (uusi koodi) ja vanha Master tuottavat saman pelaajadokumentin; lippu on päällä vain muistissa (testi nollaa sen)', async () => {
    const a = mkFs(), b = mkFs(), pa = pelaajaAlku(), pb = pelaajaAlku(); a.docs[PEL] = kopio(pa); b.docs[PEL] = kopio(pb);
    const k = masterKirjoitukset(masterAjuri(a)), v1 = KS.tmAsetaJaksofokus(pa, JF1(), { nytISO: NYT1 }), v2 = KS.tmAsetaJaksofokus(pb, JF1(), { nytISO: NYT1 });
    await k.jakso(pa, v1); await vanhaMaster(b, pb, v2); expect(a.docs[PEL]).toEqual(b.docs[PEL]); expect(LIPPU.kirjoitus).toBe(false);
  });
});

describe('P7: pelaajan Tänään-kortti näyttää saman kuin ennen (snapshot) — täysi pelaajadokumentti vs A-osista siivottu', () => {
  const TANAAN = '2026-10-12';   // maanantai, jakson viikko 2
  const H1 = { id: 'h1', nimi: 'Seinäsyöttö', kesto_min: 10, tila: 'hyvaksytty', kaytto: 'koti', lahde: 'seura', lahde_nimi: 'Keksitty FC', pelaajan_ohje: 'Syötä seinään.' };
  const TT1 = { alue: 'fy_ketteryys', kuvaus: 'Kehonhallinta', perustelu: 'Tukee ydinvahvuutta: kehonhallinta.', lahde: { tyyppi: 'testi', viite: 'lin30m', pvm: '2026-10-01' }, harjoitteet: [H1] };
  const taysi = () => ({ id: PID, etunimi: 'Toppari', seuraId: SID, syntymaVuosi: 2013, ydinvahvuus: { kuvaus: 'Tempokuljetus' },
    jaksofokus: Object.assign(JF1(), { alkoi: new Date(2026, 9, 5).toISOString(), osat: [{ k: 'a', koodi: null, teksti: 'Ensikosketus' }, { k: 'b', koodi: null, teksti: 'Katse ylös' }], tukitavoitteet: [TT1],
      osa_havainnot: { y_h2: { a: { u1: { arvo: 2, lause: 'SISÄINEN LAUSE', rooli: 'valmentaja', pvm: '2026-10-10' } } } }, osa_havainnot_vk: { y_h2: { a: { '2026-W41': { u1: { arvo: 2, lause: 'SISÄINEN VK' } } } } }, osa_arviot: { y_h2: { a: 2 } } }),
    jaksofokus_historia: [{ alkoi: '2026-08-03T08:00:00.000Z', konsepti_avain: 'y_h1', konsepti_nimi: 'Vastaanotto', paattyi: '2026-09-14', lause: 'Hyvä jakso', arvio_vp: 3, arvio_itse: 2, kalibraatio_ero: 1, havainnot_vk: { a: 1 } }] });
  const piirra = (p) => {   // pelaajan Tänään-kortin lähteet (rA1Kentta): tila, osat, viikon osa, kenttä, kotiharjoitteet + historia-rivit sellaisinaan
    const o = { esc: (s) => String(s), t: (k) => k }, x = TK.tmTanaanTila(p, { tanaan: TANAAN }); x.osat = TK.tmTanaanOsat(p.jaksofokus, { kaanon: null });
    x.viikonOsa = VO.tmViikonOsaPelaajalle(p.jaksofokus, TK.tmTanaanOsat(p.jaksofokus, { kaanon: null, max: 26 }), TANAAN);
    return JSON.stringify({ x, html: TK.tmTanaanKenttaHTML(x, Object.assign({ kentta: () => '' }, o)), kenttaSpec: TK.tmKenttaPelaajalle(p, { tanaan: TANAAN }), koti: KH.tmKotiharjoitteetHTML(KH.tmKotiharjoitteet(p.jaksofokus), { esc: o.esc }),
      jakso: { nimi: p.jaksofokus.konsepti_nimi, avain: p.jaksofokus.konsepti_avain }, historia: (p.jaksofokus_historia || []).map((r) => ({ a: r.alkoi, k: r.konsepti_avain, n: r.konsepti_nimi, l: r.lause })) });
  };
  it('Tänään-kortin renderöinti on identtinen täydellä pelaajadokumentilla ja A-osista siivotulla (PR 2 -tila); sisäiset lauseet/arviot eivät vuoda; snapshot (hash) lukittu', () => {
    const t = piirra(taysi()), j = piirra(julkinenPelaaja(taysi()));
    expect(j).toBe(t);
    expect(t).not.toContain('SISÄINEN');   // sisäiset havaintolauseet eivät renderöidy pelaajalle (ei ennen eikä jälkeen); historiarivin lause on B ja jää
    expect(JSON.parse(t).x.tila).toBe('jakso'); expect(JSON.parse(t).x.viikko).toEqual({ n: 2, k: 6 }); expect(JSON.parse(t).x.osat.length).toBeGreaterThan(0);
    expect(createHash('sha256').update(t).digest('hex')).toBe(SNAPSHOT_HASH);
  });
  it('julkinen pelaajadokumentti ei sisällä yhtään A-kenttää (P7-lukijan polut: jaksofokus + historia)', () => {
    const j = julkinenPelaaja(taysi()); S.JAKSOFOKUS_A.forEach((k) => expect(j.jaksofokus[k], k).toBeUndefined()); j.jaksofokus_historia.forEach((r) => S.HISTORIA_A.forEach((k) => expect(r[k], k).toBeUndefined()));
    expect(j.jaksofokus.konsepti_nimi).toBe('Kuljettaminen'); expect(j.jaksofokus.tukitavoitteet).toBeDefined(); expect(j.jaksofokus.asetti).toEqual({ rooli: 'vp', pvm: '2026-10-05' });
  });
});
const SNAPSHOT_HASH = '83713add46d61b3c7292cf0fcc1ae086cf40bbe406f1b118c3580017b6ffb1ed';   // Tänään-kortin renderöinnin sormenjälki; muutos = pelaajan näkymä muuttui (tarkista tarkoituksellisuus)

describe('kytkentä ja versiot', () => {
  it('Master, VP ja KT-libit kulkevat tmJaksofokusElinkaariKirjoita:n kautta; tm_sisainen.js?v=5 ennen tm_kehitystyopoyta.js:ää; Pelaaja/Vanhempi eivät lataa lib:iä', () => {
    expect(lue('TalentMaster_Master_v16.html')).toMatch(/window\.TM_SISAINEN\.tmJaksofokusElinkaariKirjoita\(_db, _seuraId, pid \|\| p\.id, upd,/);
    expect(lue('TalentMaster_VP_v25.html')).toMatch(/TM_SISAINEN\.tmJaksofokusElinkaariKirjoita\(db, _seuraId, pid, upd,/); expect(lue('TalentMaster_VP_v25.html')).toMatch(/S\.tmJaksofokusElinkaariKirjoita\(db, _seuraId, p\.id, upd,/);
    ['tm_kt_arviointi', 'tm_kt_hylkaa', 'tm_kt_jakso'].forEach((f) => expect(lue('lib/' + f + '.js'), f).toMatch(/tmJaksofokusElinkaariKirjoita/));
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Kehitystyopoyta.html']) expect(lue(f), f).toContain('lib/tm_sisainen.js?v=6');
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => expect(lue(f)).not.toMatch(/<script[^>]+src="lib\/(tm_sisainen|tm_kehitystyopoyta)\.js/));
  });
});

/* ── Migraation uudelleenajo kytkennän jälkeen (PR 1b-3): syvä täydennys + vanhentuneen jaksofokus_sisainen korvaus ── */
describe('migraatio uudelleen lipun kytkennän jälkeen: osittaiset kartat täydentyvät, vanhentunut sisainen korvataan', () => {
  const M = require('../scripts/migroi_sisainen_jaksofokus.js');
  const mkDb = async () => (await import('./_fakeFirestore.mjs')).fakeDb;
  const J2 = (lisa) => Object.assign({ alkoi: '2026-11-16T09:00:00.000Z' }, lisa), OSAH = (u) => ({ y_h2: { a: u } }), LEHTI = (v) => ({ arvo: v, rooli: 'valmentaja', pvm: '2026-10-09' });
  const tila = () => ({
    'seurat/s': {},
    // a) osittainen: dual-write loi sisainen:iin vain uuden lehden (u2); vanhempi u1 on vain pelaajadokumentissa; ei leimaa (1b-2 -osapäivitys)
    'seurat/s/pelaajat/a': { jaksofokus: Object.assign(JF1(), { osa_havainnot: OSAH({ u1: LEHTI(1), u2: LEHTI(3) }) }) },
    'seurat/s/pelaajat/a/sisainen/tiedot': { seuraId: 's', jaksofokus_sisainen: { osa_havainnot: OSAH({ u2: LEHTI(3) }) } },
    // b) vanhentunut: vanha Master vaihtoi jakson (J2: linkitetyt z) vain pelaajadokumenttiin; sisainen on J1:n leimalla ja J1:n A-osilla
    'seurat/s/pelaajat/b': { jaksofokus: J2(JF3()) },
    'seurat/s/pelaajat/b/sisainen/tiedot': { seuraId: 's', jaksofokus_sisainen: { jakso_avain: ALKOI1 + '_y_h2', linkitetyt: ['a', 'b'], osa_havainnot: OSAH({ u9: LEHTI(2) }), tavoite_alue: 'tekninen' }, historia_sisainen: { vanha_rivi: { arvio_vp: 2 } } }
  });
  it('osittainen osa_havainnot täydentyy lehti kerrallaan (sisainen voittaa ristiriidassa), eikä dual-read enää piilota vanhempia lehtiä; toinen ajo = 0', async () => {
    const fakeDb = await mkDb(); const { db, D } = fakeDb(tila());
    const ennen = YP(julkinenPelaaja(D.get('seurat/s/pelaajat/a')), D.get('seurat/s/pelaajat/a/sisainen/tiedot')); expect(ennen.jaksofokus.osa_havainnot.y_h2.a.u1).toBeUndefined();   // ongelma ilman täydennystä
    const dry = await M.aja({ db, kirjoita: false }); expect(dry).toMatchObject({ kopioi: 2, vanhentunut: 1, kirjoitettu: 0 });
    await M.aja({ db, kirjoita: true, nytISO: 'T' });
    const s = D.get('seurat/s/pelaajat/a/sisainen/tiedot'); expect(s.jaksofokus_sisainen.osa_havainnot.y_h2.a).toEqual({ u1: LEHTI(1), u2: LEHTI(3) }); expect(s.jaksofokus_sisainen.jakso_avain).toBe(ALKOI1 + '_y_h2');
    const jalkeen = YP(julkinenPelaaja(D.get('seurat/s/pelaajat/a')), s); expect(jalkeen.jaksofokus).toEqual(D.get('seurat/s/pelaajat/a').jaksofokus);
    expect(await M.aja({ db, kirjoita: true })).toMatchObject({ kopioi: 0, kirjoitettu: 0 });
  });
  it('VANHENTUNUT sisainen (eri jakso): jaksofokus_sisainen KORVATAAN nykyisen jakson A-osilla + uusi leima (ei J1:n jäänteitä); historia_sisainen koskematon; toinen ajo = 0', async () => {
    const fakeDb = await mkDb(); const { db, D } = fakeDb(tila()); await M.aja({ db, kirjoita: true, nytISO: 'T' });
    const s = D.get('seurat/s/pelaajat/b/sisainen/tiedot'); expect(s.jaksofokus_sisainen).toEqual({ jakso_avain: S.tmJaksoAvain(J2(JF3())), linkitetyt: ['z'] }); expect(s.historia_sisainen).toEqual({ vanha_rivi: { arvio_vp: 2 } }); expect(s.seuraId).toBe('s');
    expect(YP(julkinenPelaaja(D.get('seurat/s/pelaajat/b')), s).jaksofokus.linkitetyt).toEqual(['z']);
    expect(await M.aja({ db, kirjoita: true })).toMatchObject({ kopioi: 0, vanhentunut: 0 });
  });
  it('vanhentunut mutta nykyisellä jaksolla ei A-osia: ei kirjoitusta (skripti ei poista kenttiä); raportoidaan vanhentunut:1 → PR 2 -siivous hoitaa', async () => {
    const fakeDb = await mkDb(); const t = tila(); t['seurat/s/pelaajat/b'] = { jaksofokus: J2(JF2()) }; const { db } = fakeDb(t);
    expect(await M.aja({ db, kirjoita: false })).toMatchObject({ vanhentunut: 1, kopioi: 1, ei_a: 1 });   // vain a kopioituu; b jää (raportoidaan)
  });
});

describe('dual-read seuraa samaa lippua kuin kirjoitus (peruutus palauttaa luvun ja kirjoituksen yhdessä)', () => {
  const pel = () => ({ jaksofokus: Object.assign(JF1(), { linkitetyt: ['vanha'], osa_havainnot: { k: { a: { u1: { arvo: 1 } } } } }), jaksofokus_historia: [{ alkoi: ALKOI1, konsepti_avain: 'y_h2', arvio_vp: 1, lause: 'l' }] });
  const sis = () => ({ jaksofokus_sisainen: { linkitetyt: ['ERI'], osa_havainnot: { k: { a: { u1: { arvo: 3 } } } } }, historia_sisainen: { [S.tmHistoriaAvain({ alkoi: ALKOI1, konsepti_avain: 'y_h2' })]: { arvio_vp: 3 } } });
  it('lippu POIS: luku = vanha kenttä, vaikka sisainen on olemassa ja eroaa (jaksofokus + historia)', () => {
    expect(LIPPU.kirjoitus).toBe(false); const y = S.tmSisainenYhdista(pel(), sis());
    expect(y.jaksofokus).toEqual(pel().jaksofokus); expect(y.jaksofokus_historia).toEqual(pel().jaksofokus_historia);
    const lista = S.tmSisainenYhdistaLista([Object.assign({ id: 'p1' }, pel())], { p1: sis() }); expect(lista[0].jaksofokus.linkitetyt).toEqual(['vanha']);
  });
  it('lippu PÄÄLLÄ: sisainen voittaa kuten ennen; D3 (oma ryhmä) yhdistyy lipusta riippumatta', () => {
    LIPPU.kirjoitus = true; const y = S.tmSisainenYhdista(pel(), sis()); expect(y.jaksofokus.linkitetyt).toEqual(['ERI']); expect(y.jaksofokus.osa_havainnot.k.a.u1.arvo).toBe(3); expect(y.jaksofokus_historia[0].arvio_vp).toBe(3);
    LIPPU.kirjoitus = false; const d = S.tmSisainenYhdista({}, { d3_taso: 4 }); expect(d.d3_taso).toBe(4);
  });
});
