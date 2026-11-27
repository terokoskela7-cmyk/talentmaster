/* Vaihe 1 / PR 2d — kirjoittajat fail-closed, A-kentät VAIN sisainen/tiedot:iin, biologinenIka_viimeisin B-muotoon (INVENTAARIO_VAIHE1_PR2.md §3/§6).
   1) grep-portti: mikään tuotantokoodi ei kirjoita A-avainta pelaajadokumenttiin samalla rivillä eikä käytä raakaa varapolkua (lib puuttuu → raaka set/update).
   2) lib: kirjoitusapurit (tmS4Kirjoita / tmHenkilokuntaKirjoita / tmSisainenKirjoita / elinkaari) jättävät pelaajadokumenttiin vain B/C-avaimet.
   3) vm-ajot ilman vanhoja kenttiä: PHV-lukijat B-muotoisella biologinenIka_viimeisin:lla, P7:n porrasehdotus hist_n:llä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
import { fakeDb } from './_fakeFirestore.mjs';
import { createRequire as _kuoriReq } from 'module';
import { createRequire as _fnReq } from 'module';
const { lueFunctionsLahde } = _fnReq(import.meta.url)('../scripts/functions_lahde.js');   // index.js + siirtomoduulit (rivikattojen purku F1/F2)
const { lueKuori } = _kuoriReq(import.meta.url)('../scripts/kuoren_lahde.js');   // Seura.html + seura/-osat (rivikattojen purku)
const require = createRequire(import.meta.url);
const lue = (f) => lueKuori(f);
const S = require('../lib/tm_sisainen.js');
const A = S.tmSisainenAKentat();

const SOVELLUKSET = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Seura.html', 'TalentMaster_ADAR_Pikakortti.html', 'TalentMaster_Testaus_v9.html',
  'TalentMaster_Kehitystyopoyta.html', 'TalentMaster_Pelaaja_v7.html', 'TalentMaster_Excel_Tuonti.html', 'TalentMaster_Testituonti_Master.html'];
const LIBIT = ['lib/tm_idp_lomake.js', 'lib/tm_kehitystyopoyta.js', 'lib/tm_kt_arviointi.js', 'lib/tm_kt_hylkaa.js', 'lib/tm_kt_jakso.js', 'lib/tm_kt_keskustelu_sheet.js'];
const ilmanKommentteja = (src) => src.split('\n').filter((r) => !/^\s*(\/\/|\*|\/\*)/.test(r));

describe('grep-portti: ei A-avainta pelaajadokumenttiin, ei raakaa varapolkua', () => {
  it('A-avainlista kattaa ryhmät; jaetut arvot (signaali, biologinenIka_viimeisin) eivät ole siinä; talenttiOhjelma = C', () => {
    ['talenttiTaso', 'adar_vahvin', 'maturity_offset', 'kehitysvaihe_kaista', 'vastuuhenkilo', 'review_viimeisin_pvm', 'havainto_viimeisin_pvm', 'd3_taso', 'kaytettavyys', 'idp_edistyma'].forEach((k) => expect(A, k).toContain(k));
    ['signaali', 'biologinenIka_viimeisin', 'talenttiOhjelma', 'phv_tila', 'etunimi'].forEach((k) => expect(A, k).not.toContain(k));
  });
  it('sovellukset: .set(/.update( pelaajaviitteeseen ei sisällä A-avainta samalla rivillä', () => {
    const re = new RegExp('\\.(set|update)\\(\\s*\\w*[Rr]ef\\w*\\s*,?\\s*\\{[^}]*\\b(' + A.join('|') + ')\\s*:');
    const re2 = new RegExp('(pRef|pelaajaRef|baseRef|ref)\\.(set|update)\\(\\s*\\{[^}]*\\b(' + A.join('|') + ')\\s*:');
    SOVELLUKSET.forEach((f) => ilmanKommentteja(lue(f)).forEach((r) => { expect(re.test(r) || re2.test(r), f + ': ' + r.trim().slice(0, 160)).toBe(false); }));
  });
  it('ei `window.TM_SISAINEN && typeof … Kirjoita` → else raaka kirjoitus -varapolkuja (fail-closed)', () => {
    SOVELLUKSET.concat(LIBIT).forEach((f) => {
      const src = lue(f);
      expect(src, f).not.toMatch(/if \(window\.TM_SISAINEN && typeof window\.TM_SISAINEN\.tm\w+Kirjoita === 'function'\)/);
      expect(src, f).not.toMatch(/TM_SISAINEN\s*\?\s*[^:]+:\s*(db|_db)\.collection/);
      expect(src, f).not.toMatch(/tm(S4|Henkilokunta|Terveys)Varapolulla\([^)]*\)\s*;?\s*else\s+await\s+\w+\(false\)/);   // (tmIdpPelaajaVarapolulla = pelaajan oma IDP-dokumentti, ei A-kenttiä → ei 2d:n piirissä)
    });
    LIBIT.forEach((f) => expect(lue(f), f).toMatch(/TM_SISAINEN_PUUTTUU/));
  });
  it('K-kohdat: ADAR (K4/K5), Seura (K7), Testaus (K6), CF (K8/K9), demo (K10)', () => {
    const adar = lue('TalentMaster_ADAR_Pikakortti.html');
    expect(adar).not.toMatch(/batch\.set\(pRef, \{ havainto_viimeisin_pvm/); expect(adar).toMatch(/tmS4Lisaa\(batch, _PH_DB, seuraId, pelaajaId, \{ havainto_viimeisin_pvm: havPvm \}/);
    expect(adar).not.toMatch(/pRef\.set\(_s4\w*\.upd/); expect(adar).not.toMatch(/_phS4Sisainen/);
    const seura = lue('TalentMaster_Seura.html');
    expect(seura).not.toMatch(/talenttiTaso:\s+\(p\.talentti/); expect(seura).not.toMatch(/else await db\.collection\('seurat'\)\.doc\(tila\.seuraId\)\s*\n\s*\.collection\('pelaajat'\)\.doc\(pelaajaId\)\s*\n\s*\.update\(paivitys\)/);
    const t9 = lue('TalentMaster_Testaus_v9.html');
    expect(t9).toMatch(/b\.update\(baseRef, S4\.tmS4Riisu\(upd\)\)/); expect(t9).not.toMatch(/kirjoita\(false\)/);
    const cf = lueFunctionsLahde();
    expect(cf).toMatch(/kirjBatch\.update\(pelRef, tmSisainen\.tmSisainenRiisu\(paivitys\)\)/);
    const demo = lue('tm_admin/setup_demo_kehitys.js');
    expect(demo).toMatch(/kirjoita\(P, SIS\.tmSisainenRiisu\(pelaaja\)\)/); expect(demo).not.toMatch(/tallensiUid|tuojaUid/);
  });
});

const PEL = 'seurat/s/pelaajat/p1', SIS = PEL + '/sisainen/tiedot';
const BIO = { phv_tila: 'Lähellä', phv_tila_koodi: 'LAH', phv_ika: 13.1, ika_mittaushetkella: 12.6, mittauspaiva: '2026-10-01', maturity_offset: -0.5, kehitysvaihe_kaista: 'circa',
  kasvutahti_cm_v: 8, kasvutahti_vyohyke: 'nopea', mittaukset: { pituus: 150, paino: 40, istumapituus: 78, sukupuoli: 'P' } };
const pelaajanAvaimet = (D) => Object.keys(D.get(PEL) || {});

describe('lib: kirjoitusapurit eivät vie A-avaimia pelaajadokumenttiin', () => {
  it('tmS4Kirjoita: koko S4-payload → pelaajalle vain B/C + B-muodot; sisainen saa A:t, koko biologinenIka_viimeisin ja havainto_porras_hist', async () => {
    const { db, D } = fakeDb({ [PEL]: { etunimi: 'Topias' } });
    const v = S.tmAdarS4Valmista({ adar_vahvin: 'a', adar_arvioijat: [], adar_viimeisin: { a: 2 }, havainto_viimeisin_pvm: '2026-11-01', havainto_porras_ehdotus: { valmis: true, hist: [1, 2, 3] } });
    await S.tmS4Kirjoita(db, 's', 'p1', Object.assign({}, v.upd, { biologinenIka_viimeisin: BIO, phv_tila: 'LAH', kehitysvaihe_kaista: 'circa', talenttiOhjelma: true, talenttiTaso: 'perus', signaali: 'xfactor' }), { pelaajaSet: true, lisa: v.lisa });
    pelaajanAvaimet(D).forEach((k) => expect(A, k).not.toContain(k));
    const p = D.get(PEL), s = D.get(SIS);
    expect(p.biologinenIka_viimeisin).toEqual({ phv_tila: 'Lähellä', phv_tila_koodi: 'LAH', phv_ika: 13.1, ika_mittaushetkella: 12.6, mittauspaiva: '2026-10-01' });
    expect(p.havainto_porras_ehdotus).toEqual({ valmis: true, hist_n: 3 }); expect(p.signaali).toBe(null); expect(p.talenttiOhjelma).toBe(true); expect(p.adar_viimeisin).toEqual({ a: 2 });
    expect(s.biologinenIka_viimeisin.maturity_offset).toBe(-0.5); expect(s.havainto_porras_hist).toEqual([1, 2, 3]); expect(s.talenttiTaso).toBe('perus'); expect(s.signaali).toBe('xfactor'); expect(s.adar_vahvin).toBe('a');
    const y = S.tmSisainenYhdista(p, s);   // henkilökunnan dual-read palauttaa täyden muodon
    expect(y.biologinenIka_viimeisin.kasvutahti_vyohyke).toBe('nopea'); expect(y.havainto_porras_ehdotus.hist).toEqual([1, 2, 3]); expect(y.signaali).toBe('xfactor');
  });
  it('tmHenkilokuntaKirjoita / tmSisainenKirjoita / tmJaksofokusElinkaariKirjoita: pelaajadokumentissa ei A-avaimia', async () => {
    const { db, D } = fakeDb({ [PEL]: { etunimi: 'Topias' } });
    await S.tmHenkilokuntaKirjoita(db, 's', 'p1', { vastuuhenkilo: { uid: 'u', rooli: 'vp' }, review_viimeisin_pvm: '2026-11-01', idp_tila: 'aktiivinen', idp_edistyma: 40 }, { pelaajaSet: true });
    await S.tmSisainenKirjoita(db, 's', 'p1', { d3_taso: 3, d3_pvm: '2026-11-01' });
    await S.tmJaksofokusElinkaariKirjoita(db, 's', 'p1', { jaksofokus: { konsepti_avain: 'y', tila: 'aktiivinen', osa_havainnot: { a: 1 } }, vastuuhenkilo: { uid: 'u' } }, { historiaLisays: [] }, { FV: { arrayUnion: (...a) => a, delete: () => ({ __poista: true }) } });
    pelaajanAvaimet(D).forEach((k) => expect(A, k).not.toContain(k));
    expect(D.get(PEL).jaksofokus.osa_havainnot).toBeUndefined(); expect(D.get(PEL).idp_tila).toBe('aktiivinen');
    expect(D.get(SIS).vastuuhenkilo.uid).toBe('u'); expect(D.get(SIS).d3_taso).toBe(3); expect(D.get(SIS).idp_edistyma).toBe(40);
  });
  it('tmSisainenRiisu (CF vahvistaSuostumus / demo): kaikki A-ryhmät pois, jaetut B-muotoon', () => {
    const u = S.tmSisainenRiisu({ etunimi: 'A', isa_pituus_cm: 180, vanhempi_pituus_pvm: 'x', biologinenIka_viimeisin: BIO, signaali: 'phv', kaytettavyys: 'rajattu', d3_taso: 2 });
    expect(u).toEqual({ etunimi: 'A', signaali: 'phv', biologinenIka_viimeisin: { phv_tila: 'Lähellä', phv_tila_koodi: 'LAH', phv_ika: 13.1, ika_mittaushetkella: 12.6, mittauspaiva: '2026-10-01' } });
  });
  it('fail-closed: kirjoitusvirhe heitetään (ei uusintaa ilman sisainen:ia); tmS4Sisainen heittää oletuksena', async () => {
    const { db } = fakeDb({});
    await expect(S.tmS4Kirjoita(db, 's', 'p1', { adar_vahvin: 'a', etunimi: 'x' }, {})).rejects.toThrow();   // update puuttuvaan dokumenttiin → NOT_FOUND
    const huono = { collection: () => { throw new Error('perm'); } };
    await expect(S.tmS4Sisainen(huono, 's', 'p1', { talenttiTaso: 'perus' }, {})).rejects.toThrow('perm');
    await expect(S.tmS4Sisainen(huono, 's', 'p1', { talenttiTaso: 'perus' }, { hiljainen: true })).resolves.toMatchObject({ ok: false });
  });
});

describe('vm-ajot ilman vanhoja kenttiä (pelaajan näkymä)', () => {
  it('tm_phv_tila: B-muotoinen biologinenIka_viimeisin riittää PHV-tilaan ja varhain kypsyneen vihjeeseen (phv_ika)', () => {
    const ctx = { window: {}, console }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(lue('lib/tm_phv_tila.js'), ctx);
    const P = ctx.window.TM_PHV_TILA || ctx.TM_PHV_TILA || require('../lib/tm_phv_tila.js');
    const b = S.tmBioIkaJaa(BIO).pelaaja, doc = { sukupuoli: 'M', phv_tila: 'LAH', biologinenIka_viimeisin: b };
    expect(Object.keys(b)).not.toContain('maturity_offset'); expect(P.tmPhvKoodi(doc)).toBe('LAH');
    expect(P.tmVarhainKypsynyt(Object.assign({}, doc, { biologinenIka_viimeisin: Object.assign({}, b, { phv_ika: 12.5 }) }))).toBe(true);
  });
  it('Pelaaja_v7: porrasehdotuksen määrä luetaan hist_n:stä (ei hist-taulukkoa pelaajadokumentissa)', () => {
    const src = lue('TalentMaster_Pelaaja_v7.html'), rivi = src.split('\n').find((r) => r.includes('const _ehdE = '));
    expect(rivi).toBeTruthy();
    const koodi = rivi.split(';')[0].replace(/^\s*const /, 'var ') + '; tulos = _ehdN;';
    const ctx = { _pelaaja: { havainto_porras_ehdotus: S.tmPorrasEhdotusJaa({ valmis: false, hist: [2, 3] }).pelaaja }, tulos: null }; vm.createContext(ctx); vm.runInContext(koodi, ctx);
    expect(ctx.tulos).toBe(2);
  });
});

describe('A-kentän poisto ei palaa dual-readissa (siivoamaton vanha arvo pelaajadokumentissa)', () => {
  it('FieldValue.delete A-kenttään → poisto myös pelaajadokumenttiin; muut A-arvot eivät', async () => {
    const { db, D } = fakeDb({ [PEL]: { etunimi: 'T', vastuuhenkilo: { uid: 'vanha' }, tukitarve: { a: 1 } } });
    await S.tmHenkilokuntaKirjoita(db, 's', 'p1', { vastuuhenkilo: { __poista: true }, tukitarve: { b: 2 } }, { pelaajaSet: true });
    expect(D.get(PEL).vastuuhenkilo).toBeUndefined(); expect(D.get(PEL).tukitarve).toEqual({ a: 1 });   // uusi arvo ei pelaajalle
    const y = S.tmSisainenYhdista(D.get(PEL), D.get(SIS)); expect(y.vastuuhenkilo).toBeUndefined(); expect(y.tukitarve).toEqual({ b: 2 });
    const adm = require('firebase-admin/firestore').FieldValue, cmp = require('firebase/compat/app').default; require('firebase/compat/firestore');
    expect(Object.keys(S.tmHenkilokuntaRiisu({ vastuuhenkilo: adm.delete() }))).toEqual(['vastuuhenkilo']);
    expect(Object.keys(S.tmHenkilokuntaRiisu({ vastuuhenkilo: cmp.firestore.FieldValue.delete() }))).toEqual(['vastuuhenkilo']);
    expect(Object.keys(S.tmHenkilokuntaRiisu({ vastuuhenkilo: adm.serverTimestamp() }))).toEqual([]);
  });
});

describe('jaksofokuksen A-polun poisto ei palaa dual-readissa', () => {
  it('jaksofokus.linkitetyt: delete → sisainen JA pelaajadokumentti; asetus vain sisainen', async () => {
    const { db, D } = fakeDb({ [PEL]: { etunimi: 'T', jaksofokus: { konsepti_avain: 'y', linkitetyt: ['vanha'] } } });
    const j = S.tmJaksofokusPolutJaa({ 'jaksofokus.linkitetyt': { __poista: true }, 'jaksofokus.osa_havainnot.a': 2, 'jaksofokus.tila': 'aktiivinen' });
    expect(Object.keys(j.pelaajaPolut).sort()).toEqual(['jaksofokus.linkitetyt', 'jaksofokus.tila']);
    const ops = []; const ref = (p) => ({ _p: p, collection: (c) => ({ doc: (d) => ref(p + '/' + c + '/' + d) }) });
    const rdb = { collection: (c) => ({ doc: (d) => ref(c + '/' + d) }), batch: () => ({ update: (r, d) => ops.push(['update', r._p, d]), set: (r, d, o) => ops.push(['set', r._p, d, o]), commit: async () => {} }) };
    await S.tmJaksofokusKirjoita(rdb, 's', 'p1', { 'jaksofokus.linkitetyt': { __poista: true }, 'jaksofokus.osa_havainnot.a': 2 }, {});
    const pu = ops.find((o) => o[1] === PEL); expect(pu[0]).toBe('update'); expect(pu[2]).toEqual({ 'jaksofokus.linkitetyt': { __poista: true } });   // poisto pelaajalle, osa_havainnot ei
    expect(ops.some((o) => o[1] === SIS)).toBe(true);
    void db; void D;
  });
});
