/* Vaihe 1 / PR 1e-1 (viipale S4) — perusta: viisi ryhmää (adar_sisainen, arviointi, kypsyys_sisainen, talentti, terveys [oma dokumentti sisainen/terveys], signaali) + YKSI lippu RYHMAT.s4.kirjoitus, dual-read, jaetut arvot (signaali, porrasehdotus),
   kirjoitusapuri, migraatio, grep-portti (pelaaja/vanhempi), Rules v3.70-tekstit, CF-lippu ja tuoja-korjaus. Kirjoittajia EI vielä kytketä (1e-2 CF, 1e-3 selain): selainkäytös ei muutu.
   Rules-toiminta: tests/rules/sisainen.rules.test.js (v3.70). */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js'), CF = require('../functions/tm_sisainen.js'), LUKU = require('../functions/sisainen_luku.js'), M = require('../scripts/migroi_sisainen_s4.js');
const SRC = lue('scripts/migroi_sisainen_s4.js');
const LIPPU = S.RYHMAT.s4;
afterEach(() => { LIPPU.kirjoitus = false; CF.RYHMAT.s4.kirjoitus = false; });

const RYHMAT_S4 = ['adar_sisainen', 'arviointi', 'kypsyys_sisainen', 'talentti', 'terveys', 'signaali'];
const ADAR = ['adar_arvioijat', 'adar_arvioijia', 'adar_yhtenevyys', 'adar_yhtenevyys_taso', 'adar_dim_konsensus', 'adar_vahvin', 'adar_tilanne_jakauma', 'adar_vaihe_jakauma', 'adar_otos_jakauma', 'adar_ottelupohja', 'adar_luotettavuus', 'havainto_viimeisin_pvm'];
const ARV = ['arviointi_havaittu', 'arviointi_pvm', 'arviointi_kehys', 'arviointi_kooste', 'potentiaali_kooste', 'arviointi_kooste_pvm'];
const KYP = ['kasvutahti_cm_v', 'kasvutahti_vyohyke', 'maturity_offset', 'kehitysvaihe_kaista', 'kronologinen_ika', 'phv_raaka', 'phv_huom', 'phv_ongelma', 'phv_ilmoitettu_ph', 'phv_ei_mitattu', 'isa_pituus_cm', 'aiti_pituus_cm', 'vanhempi_pituus_pvm', 'vanhempi_pituus_puuttuu'];
const TT = ['talenttiOhjelma', 'talenttiTaso', 'talenttiAlku', 'talenttiAktivoi', 'talenttiPaattyi'], TERV = ['kaytettavyys', 'loukkaantuminen_tyyppi', 'loukkaantuminen_alue', 'loukkaantuminen_pvm', 'paluu_arvio'];
const B_JAA = ['adar_viimeisin', 'adar_edellinen', 'adar_heikoin', 'havainto_porras', 'phv_tila', 'phv_tila_koodi', 'phv_ika', 'biologinenIka_viimeisin'];
const PEL = 'seurat/s/pelaajat/p1', SIS = PEL + '/sisainen/tiedot';

describe('rekisteri: S4-ryhmät ja yksi yhteinen lippu', () => {
  it('kuusi ryhmää (terveys omana dokumenttinaan), briiffin kentät; porrasehdotus jaettu (hist → havainto_porras_hist); vanhempien pituudet kypsyys_sisainen:ssä; B-kentät EIVÄT mukana', () => {
    expect(RYHMAT_S4.every((n) => S.RYHMAT[n].s4 === true && S.RYHMAT[n].erillinen === true && S.RYHMAT[n].kytketty === false)).toBe(true);
    expect(Object.keys(S.RYHMAT).filter((n) => S.RYHMAT[n].s4)).toEqual(expect.arrayContaining(RYHMAT_S4)); expect(Object.keys(S.RYHMAT).filter((n) => S.RYHMAT[n].s4).length).toBe(6); expect(Object.keys(S.RYHMAT).filter((n) => S.RYHMAT[n].dokumentti)).toEqual(['terveys']);
    expect(S.RYHMAT.adar_sisainen.kentat).toEqual(ADAR.concat(['havainto_porras_hist'])); expect(S.RYHMAT.arviointi.kentat).toEqual(ARV); expect(S.RYHMAT.kypsyys_sisainen.kentat).toEqual(KYP);
    expect(S.RYHMAT.talentti.kentat).toEqual(TT); expect(S.RYHMAT.terveys.kentat).toEqual(TERV); expect(S.RYHMAT.terveys.dokumentti).toBe('terveys'); expect(S.RYHMAT.terveys.seuraAvain).toBe('terveysSeuraId'); expect(S.RYHMAT.talentti_terveys).toBeUndefined(); expect(S.RYHMAT.signaali.kentat).toEqual(['signaali']); expect(S.RYHMAT.perhe).toBeUndefined(); expect(S.RYHMAT.staff_paatokset).toBeUndefined();
    const s4 = S.tmS4Kentat(); B_JAA.concat(['havainto_porras_ehdotus']).forEach((k) => expect(s4, k).not.toContain(k));
    const kaikki = Object.values(S.RYHMAT).flatMap((r) => r.kentat); expect(new Set(kaikki).size).toBe(kaikki.length);   // ei kenttää kahdessa ryhmässä
  });
  it('YKSI lippu RYHMAT.s4.kirjoitus, oletus PÄÄLLÄ (lipun käännön PR); viidellä ryhmällä ei omia lippuja; kolme kytkettävää lippua: jaksofokus_sisainen, henkilokunta, s4; tmSisainenKentat() ennallaan (vain d3)', () => {
    expect(lue('lib/tm_sisainen.js')).toMatch(/s4: \{ kytketty: false, kirjoitus: true,/); expect(S.tmS4Paalla({ s4Kirjoitus: false })).toBe(false); expect(S.tmS4Paalla({ s4Kirjoitus: true })).toBe(true);
    RYHMAT_S4.forEach((n) => expect(S.RYHMAT[n].kirjoitus, n).toBeUndefined());
    expect(Object.keys(S.RYHMAT).filter((n) => 'kirjoitus' in S.RYHMAT[n]).sort()).toEqual(['henkilokunta', 'jaksofokus_sisainen', 's4']);
    expect(Object.keys(S.RYHMAT).filter((n) => S.RYHMAT[n].kytketty)).toEqual(['d3']); expect(S.tmSisainenKentat()).toEqual(['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm']);
  });
});

describe('dual-read seuraa lippua', () => {
  const pelaaja = () => ({ id: 'p1', kasvutahti_cm_v: 5, talenttiTaso: 'perus', loukkaantuminen_tyyppi: 'nilkka', arviointi_kooste: { a: 1 }, adar_arvioijia: 1, signaali: 'xfactor', havainto_porras_ehdotus: { valmis: false, seuraava: null, hist: [3, 3, 2] }, adar_viimeisin: { yht: 2 }, phv_tila: 'PRE' });
  const sis = () => ({ kasvutahti_cm_v: 7, loukkaantuminen_tyyppi: 'TIEDOT-EI-LUETA', adar_arvioijia: 3, signaali: 'hidden-gem', havainto_porras_hist: [1, 1, 1], adar_viimeisin: { yht: 9 }, phv_tila: 'POST', seuraId: 's' });
  it('lippu POIS: vanha kenttä voittaa, B-kentät ja ehdotus ennallaan', () => {
    const y = S.tmSisainenYhdista(pelaaja(), sis()); expect(y.kasvutahti_cm_v).toBe(5); expect(y.loukkaantuminen_tyyppi).toBe('nilkka'); expect(y.signaali).toBe('xfactor'); expect(y.havainto_porras_ehdotus.hist).toEqual([3, 3, 2]);
  });
  it('lippu PÄÄLLÄ: sisainen voittaa S4-kentissä, puuttuva jää vanhasta; hist yhdistyy ehdotukseen; B-kentät (adar_viimeisin, phv_tila) EIVÄT yhdisty', () => {
    LIPPU.kirjoitus = true; const p = pelaaja(), ennen = JSON.stringify(p), y = S.tmSisainenYhdista(p, sis());
    expect(y.kasvutahti_cm_v).toBe(7); expect(y.loukkaantuminen_tyyppi).toBe('nilkka'); expect(y.adar_arvioijia).toBe(3); expect(y.signaali).toBe('hidden-gem'); expect(y.talenttiTaso).toBe('perus'); expect(y.arviointi_kooste).toEqual({ a: 1 });
    expect(y.havainto_porras_ehdotus).toEqual({ valmis: false, seuraava: null, hist: [1, 1, 1] }); expect(y.adar_viimeisin).toEqual({ yht: 2 }); expect(y.phv_tila).toBe('PRE'); expect(JSON.stringify(p)).toBe(ennen);
  });
  it('opts.s4Kirjoitus ohittaa rekisterin (CF-vakio / testit); jaa ei reititä S4-kenttiä (erillinen mergeFields-reitti)', () => {
    expect(S.tmSisainenYhdista(pelaaja(), sis(), { s4Kirjoitus: true }).kasvutahti_cm_v).toBe(7); LIPPU.kirjoitus = true; expect(S.tmSisainenYhdista(pelaaja(), sis(), { s4Kirjoitus: false }).kasvutahti_cm_v).toBe(5);
    expect(S.tmSisainenJaa({ kasvutahti_cm_v: 1, nimi: 'a' }, { seuraId: 's' }).sisainen).toBeNull();
  });
  it('TERVEYS: kentät luetaan VAIN sisainen/terveys-datasta (opts.terveys), ei tiedot:ista; lippu pois → vanha kenttä; terveys-dokumentti puuttuu (ei oikeutta) → vanha kenttä varalla', () => {
    const terv = { loukkaantuminen_tyyppi: 'polvi', kaytettavyys: 'rajoitettu', paluu_arvio: '2026-11-15', seuraId: 'EI', terveysSeuraId: 's' };
    expect(S.tmSisainenYhdista(pelaaja(), sis(), { terveys: terv }).loukkaantuminen_tyyppi).toBe('nilkka');   // lippu pois
    LIPPU.kirjoitus = true;
    const y = S.tmSisainenYhdista(pelaaja(), sis(), { terveys: terv }); expect(y.loukkaantuminen_tyyppi).toBe('polvi'); expect(y.kaytettavyys).toBe('rajoitettu'); expect(y.paluu_arvio).toBe('2026-11-15'); expect(y).not.toHaveProperty('terveysSeuraId');
    expect(S.tmSisainenYhdista(pelaaja(), sis()).loukkaantuminen_tyyppi).toBe('nilkka'); expect(S.tmSisainenYhdista(pelaaja(), sis(), { terveys: null }).loukkaantuminen_tyyppi).toBe('nilkka');
    const l = S.tmSisainenYhdistaLista([pelaaja(), { id: 'p2', loukkaantuminen_tyyppi: 'vanha' }], { p1: sis() }, { terveysMapa: { p1: terv } }); expect(l[0].loukkaantuminen_tyyppi).toBe('polvi'); expect(l[1].loukkaantuminen_tyyppi).toBe('vanha');   // p2: ei terveys-dokumenttia → vanha
  });
  it('hist ilman olemassa olevaa ehdotusta: ehdotus syntyy vain {hist}', () => { LIPPU.kirjoitus = true; const y = S.tmSisainenYhdista({ id: 'p' }, { havainto_porras_hist: [2] }); expect(y.havainto_porras_ehdotus).toEqual({ hist: [2] }); });
});

describe('jaetut arvot', () => {
  it('tmSignaaliJaa: talenttisignaalit → sisainen (pelaajalle null), phv ja muut jäävät pelaajalle', () => {
    ['xfactor', 'x-factor', 'hidden-gem', 'hidden', 'XFactor '.toLowerCase().trim()].forEach((a) => expect(S.tmSignaaliJaa(a), a).toEqual({ pelaaja: null, sisainen: a }));
    expect(S.tmSignaaliJaa('phv')).toEqual({ pelaaja: 'phv', sisainen: null }); expect(S.tmSignaaliJaa(null)).toEqual({ pelaaja: null, sisainen: null }); expect(S.tmSignaaliJaa(undefined)).toEqual({ pelaaja: null, sisainen: null });
  });
  it('tmPorrasEhdotusJaa: hist erilleen, pelaajalle { valmis, seuraava, hist_n }; ei mutatoi; ei-olio läpi', () => {
    const e = { valmis: true, seuraava: 'b', hist: [3, 3, 3] }, kopio = JSON.stringify(e), r = S.tmPorrasEhdotusJaa(e);
    expect(r).toEqual({ pelaaja: { valmis: true, seuraava: 'b', hist_n: 3 }, hist: [3, 3, 3] }); expect(JSON.stringify(e)).toBe(kopio); expect(r.pelaaja).not.toHaveProperty('hist');
    expect(S.tmPorrasEhdotusJaa({ valmis: false, seuraava: null, hist: [] }).pelaaja.hist_n).toBe(0); expect(S.tmPorrasEhdotusJaa(null)).toEqual({ pelaaja: null, hist: null });
  });
});

function mkDb(hylkaa) {
  const f = fakeDb({ [PEL]: { etunimi: 'X' } }), b0 = f.db.batch.bind(f.db);
  f.db.batch = () => { const b = b0(), sisaan = []; return { set: (r, d, o) => { sisaan.push(r._path); b.set(r, d, o); }, update: (r, d) => b.update(r, d), delete: b.delete,
    commit: async () => { if (hylkaa && sisaan.some((p) => /sisainen/.test(p))) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; } return b.commit(); } }; };
  return f;
}
describe('tmS4Osa / tmS4Kirjoita (sama apunelikko kuin henkilokunta, oma lippu)', () => {
  const upd = () => ({ kasvutahti_cm_v: 6, kehitysvaihe_kaista: 'circa', talenttiTaso: 'kärki', jaksofokus: { x: 1 }, vastuuhenkilo: { uid: 'u' }, phv_tila: 'PH' });
  it('osa: vain S4-kentät (ei henkilokunta-, ei B-kenttiä); lippu pois / ei kenttiä → null; henkilokunta-apuri ei poimi S4-kenttiä', () => {
    expect(S.tmS4Osa('s', upd(), {})).toBeNull();
    const o = S.tmS4Osa('s', upd(), { s4Kirjoitus: true, nytISO: 'T' }); expect(o.data).toEqual({ seuraId: 's', paivitetty: 'T', kasvutahti_cm_v: 6, kehitysvaihe_kaista: 'circa', talenttiTaso: 'kärki' }); expect(o.mergeFields).toEqual(['seuraId', 'paivitetty', 'kasvutahti_cm_v', 'kehitysvaihe_kaista', 'talenttiTaso']);
    expect(S.tmS4Osa('s', { jaksofokus: {}, phv_tila: 'PH' }, { s4Kirjoitus: true })).toBeNull();
    const h = S.tmHenkilokuntaOsa('s', upd(), { henkilokuntaKirjoitus: true }); expect(Object.keys(h.data).sort()).toEqual(['paivitetty', 'seuraId', 'vastuuhenkilo']);
  });
  it('lippu POIS: pelkkä pelaajan update; lippu PÄÄLLÄ: YKSI batch (pelaaja kuten ennen + sisainen mergeFields); permission-denied → varapolku ilman sisainen:iä; varapolku:false heittää', async () => {
    const f = mkDb(); expect(await S.tmS4Kirjoita(f.db, 's', 'p1', upd(), {})).toEqual({ ok: true, sisainen: false, sisainenOhitettu: false }); expect(f.loki.commits).toBe(0); expect(f.D.has(SIS)).toBe(false); expect(f.D.get(PEL).kasvutahti_cm_v).toBe(6);
    const g = mkDb(); expect(await S.tmS4Kirjoita(g.db, 's', 'p1', upd(), { s4Kirjoitus: true, nytISO: 'T' })).toEqual({ ok: true, sisainen: true, sisainenOhitettu: false }); expect(g.loki.commits).toBe(1);
    expect(g.D.get(SIS)).toEqual({ seuraId: 's', paivitetty: 'T', kasvutahti_cm_v: 6, kehitysvaihe_kaista: 'circa', talenttiTaso: 'kärki' }); expect(g.D.get(PEL).kasvutahti_cm_v).toBe(6); expect(g.D.get(PEL).phv_tila).toBe('PH');
    const h = mkDb(true), r = await S.tmS4Kirjoita(h.db, 's', 'p1', upd(), { s4Kirjoitus: true }); expect(r).toEqual({ ok: true, sisainen: false, sisainenOhitettu: true }); expect(h.D.get(PEL).kasvutahti_cm_v).toBe(6); expect(h.D.has(SIS)).toBe(false);
    await expect(S.tmS4Kirjoita(mkDb(true).db, 's', 'p1', upd(), { s4Kirjoitus: true, varapolku: false })).rejects.toThrow(/permissions/);
  });
  it('tmS4Varapolulla ja tmS4Lisaa: lippu pois → ei lisää / mukaan=false; päällä lisää sisainen-kirjoituksen annettuun batchiin', async () => {
    const f = mkDb(); const b = f.db.batch(); expect(S.tmS4Lisaa(b, f.db, 's', 'p1', upd(), {})).toBe(false); expect(S.tmS4Lisaa(b, f.db, 's', 'p1', upd(), { s4Kirjoitus: true })).toBe(true);
    let mukaan; await S.tmS4Varapolulla({}, async (m) => { mukaan = m; }); expect(mukaan).toBe(false); await S.tmS4Varapolulla({ s4Kirjoitus: true }, async (m) => { mukaan = m; }); expect(mukaan).toBe(true);
  });
});

describe('TERVEYS-dokumentti sisainen/terveys (PR #1137): kirjoitusapuri, rajaus tiedot:ista, joukkolataus', () => {
  const TERV_PATH = PEL + '/sisainen/terveys';
  const upd = () => ({ kaytettavyys: 'rajoitettu', loukkaantuminen_tyyppi: 'nilkka', loukkaantuminen_pvm: '2026-10-20', paluu_arvio: '2026-11-15', talenttiTaso: 'perus', kasvutahti_cm_v: 6 });
  it('tmS4Osa EI poimi terveyskenttiä (ne eivät päädy sisainen/tiedot:iin); tmTerveysOsa poimii VAIN ne, avain terveysSeuraId (ei seuraId)', () => {
    const t = S.tmS4Osa('s', upd(), { s4Kirjoitus: true, nytISO: 'T' }); expect(Object.keys(t.data).sort()).toEqual(['kasvutahti_cm_v', 'paivitetty', 'seuraId', 'talenttiTaso']); TERV.forEach((k) => expect(t.data, k).not.toHaveProperty(k));
    expect(S.tmS4TiedotKentat()).not.toEqual(expect.arrayContaining(['loukkaantuminen_tyyppi'])); expect(S.tmS4Kentat()).toEqual(expect.arrayContaining(TERV));
    expect(S.tmTerveysOsa('s', upd(), {})).toBeNull(); expect(S.tmTerveysOsa('s', { talenttiTaso: 'x' }, { s4Kirjoitus: true })).toBeNull();
    const o = S.tmTerveysOsa('s', upd(), { s4Kirjoitus: true, nytISO: 'T' }); expect(o.data).toEqual({ terveysSeuraId: 's', paivitetty: 'T', kaytettavyys: 'rajoitettu', loukkaantuminen_tyyppi: 'nilkka', loukkaantuminen_pvm: '2026-10-20', paluu_arvio: '2026-11-15' });
    expect(o.mergeFields).toEqual(['terveysSeuraId', 'paivitetty', 'kaytettavyys', 'loukkaantuminen_tyyppi', 'loukkaantuminen_pvm', 'paluu_arvio']); expect(o.data).not.toHaveProperty('seuraId'); expect(S.tmTerveysPolku('s', 'p1')).toBe(TERV_PATH);
  });
  it('tmTerveysKirjoita: lippu pois → vain pelaajan update; päällä → YKSI batch (pelaaja + sisainen/terveys); permission-denied → varapolku ilman terveys-dokumenttia; varapolku:false heittää', async () => {
    const f = mkDb(); expect(await S.tmTerveysKirjoita(f.db, 's', 'p1', upd(), {})).toEqual({ ok: true, sisainen: false, sisainenOhitettu: false }); expect(f.D.has(TERV_PATH)).toBe(false); expect(f.D.get(PEL).loukkaantuminen_tyyppi).toBe('nilkka');
    const g = mkDb(); expect(await S.tmTerveysKirjoita(g.db, 's', 'p1', upd(), { s4Kirjoitus: true, nytISO: 'T' })).toEqual({ ok: true, sisainen: true, sisainenOhitettu: false }); expect(g.loki.commits).toBe(1);
    expect(g.D.get(TERV_PATH)).toMatchObject({ terveysSeuraId: 's', paivitetty: 'T', kaytettavyys: 'rajoitettu', paluu_arvio: '2026-11-15' }); expect(g.D.get(TERV_PATH)).not.toHaveProperty('talenttiTaso'); expect(g.D.has(SIS)).toBe(false); expect(g.D.get(PEL).loukkaantuminen_tyyppi).toBe('nilkka');   // dual-write: vanha kenttä jää
    const h = mkDb(true), r = await S.tmTerveysKirjoita(h.db, 's', 'p1', upd(), { s4Kirjoitus: true }); expect(r).toEqual({ ok: true, sisainen: false, sisainenOhitettu: true }); expect(h.D.get(PEL).loukkaantuminen_tyyppi).toBe('nilkka'); expect(h.D.has(TERV_PATH)).toBe(false);
    await expect(S.tmTerveysKirjoita(mkDb(true).db, 's', 'p1', upd(), { s4Kirjoitus: true, varapolku: false })).rejects.toThrow(/permissions/);
  });
  it('tmTerveysLuvunTapa: koko seura (SA, vp, utj, fysioterapeutti, talenttivalmentaja), pelaajakohtaisesti (valmentaja), ei lainkaan (seurasihteeri, testivastaava, talenttivalmentaja, pelaaja, huoltaja, tuntematon)', () => {
    ['super_admin', 'vp', 'urheilutoimenjohtaja', 'fysioterapeutti', 'talenttivalmentaja'].forEach((r) => expect(S.tmTerveysLuvunTapa(r), r).toBe('seura')); expect(S.tmTerveysLuvunTapa('valmentaja')).toBe('pelaajat');
    ['seurasihteeri', 'testivastaava', 'fysiikkavalmentaja', 'pelaaja', 'vanhempi', '', undefined, null].forEach((r) => expect(S.tmTerveysLuvunTapa(r), String(r)).toBeNull());
  });
  /* joukkolataus: tiedot-kysely (where seuraId) ei osu terveys-dokumentteihin; terveys erillisellä kyselyllä (where terveysSeuraId) vain kun lippu päällä JA kutsuja pyytää */
  function cgDb(kaatuuTerveys) {
    const kyselyt = [], eDenied = () => { const e = new Error('denied'); e.code = 'permission-denied'; return e; };
    const ref = (pid) => ({ parent: { parent: { id: pid } } }), docs = (lista) => ({ forEach: (fn) => lista.forEach((d) => fn(d)) });
    const TIEDOT = [{ id: 'tiedot', ref: ref('p1'), data: () => ({ seuraId: 's', kasvutahti_cm_v: 7 }) }];
    const TERVS = [{ id: 'terveys', ref: ref('p1'), data: () => ({ terveysSeuraId: 's', loukkaantuminen_tyyppi: 'polvi' }) }];
    const yksi = { p1: { exists: true, data: () => ({ terveysSeuraId: 's', loukkaantuminen_tyyppi: 'polvi' }) }, p2: { exists: false } };
    const cg = (n) => ({ where: (kentta, op, arvo) => ({ get: async () => {
      kyselyt.push([n, kentta, arvo]);
      if (kentta !== 'terveysSeuraId') return docs(TIEDOT);
      if (kaatuuTerveys) throw eDenied();
      return docs(TERVS);
    } }) });
    const pelaajaDok = (pid) => ({ collection: () => ({ doc: (dok) => ({ get: async () => { kyselyt.push(['get', pid, dok]); if (pid === 'p3') throw eDenied(); return yksi[pid] || { exists: false }; } }) }) });
    const db = { collectionGroup: cg, collection: () => ({ doc: () => ({ collection: () => ({ doc: pelaajaDok }) }) }) };
    return { kyselyt, db };
  }
  it('lippu pois TAI terveysLuku puuttuu → vain tiedot-kysely (palautusmuoto { mapa, virhe } ennallaan); lippu päällä + terveysLuku "seura" → toinen kysely where terveysSeuraId', async () => {
    const a = cgDb(); const r0 = await S.tmSisainenLataaSeura(a.db, 's'); expect(r0).toEqual({ mapa: { p1: { seuraId: 's', kasvutahti_cm_v: 7 } }, virhe: null }); expect(a.kyselyt).toEqual([['sisainen', 'seuraId', 's']]);
    const b = cgDb(); await S.tmSisainenLataaSeura(b.db, 's', { terveysLuku: 'seura' }); expect(b.kyselyt).toEqual([['sisainen', 'seuraId', 's']]);   // lippu pois → ei terveys-kyselyä
    const c = cgDb(); const r = await S.tmSisainenLataaSeura(c.db, 's', { s4Kirjoitus: true, terveysLuku: 'seura' }); expect(c.kyselyt).toEqual([['sisainen', 'seuraId', 's'], ['sisainen', 'terveysSeuraId', 's']]); expect(r.terveysMapa).toEqual({ p1: { terveysSeuraId: 's', loukkaantuminen_tyyppi: 'polvi' } }); expect(r.terveysVirhe).toBeNull();
    expect(r.mapa.p1).not.toHaveProperty('loukkaantuminen_tyyppi');
  });
  it('valmentaja: terveysLuku = oman joukkueen pelaajien idt → pelaajakohtaiset get:it; yksittäinen virhe ei kaada muita (osittain tyhjä → vanha kenttä varalla)', async () => {
    const w = console.warn; console.warn = () => {};
    try {
      const d = cgDb(); const r = await S.tmSisainenLataaSeura(d.db, 's', { s4Kirjoitus: true, terveysLuku: ['p1', 'p2', 'p3'] });
      expect(r.terveysMapa).toEqual({ p1: { terveysSeuraId: 's', loukkaantuminen_tyyppi: 'polvi' } }); expect(r.terveysVirhe).toBe('permission-denied'); expect(d.kyselyt.filter((k) => k[0] === 'get').map((k) => k[1] + '/' + k[2])).toEqual(['p1/terveys', 'p2/terveys', 'p3/terveys']);
    } finally { console.warn = w; }
  });
  it('terveys-kyselyn virhe (esim. Rules/indeksi ei vielä) ei kaada: tiedot-tulos säilyy, terveysMapa tyhjä, virhekoodi mukana; lataa-ja-yhdistä: kenttä tulee terveys-dokumentista, virheessä vanhasta', async () => {
    const w = console.warn; console.warn = () => {};
    try {
      const k = cgDb(true), r = await S.tmSisainenLataaSeura(k.db, 's', { s4Kirjoitus: true, terveysLuku: 'seura' }); expect(r.mapa.p1.kasvutahti_cm_v).toBe(7); expect(r.terveysMapa).toEqual({}); expect(r.terveysVirhe).toBe('permission-denied');
      const lista = () => [{ id: 'p1', loukkaantuminen_tyyppi: 'nilkka', kasvutahti_cm_v: 5 }];
      const ok = await S.tmSisainenLataaJaYhdista(cgDb().db, 's', lista(), { s4Kirjoitus: true, terveysLuku: 'seura' }); expect(ok[0].loukkaantuminen_tyyppi).toBe('polvi'); expect(ok[0].kasvutahti_cm_v).toBe(7);
      const vika = await S.tmSisainenLataaJaYhdista(cgDb(true).db, 's', lista(), { s4Kirjoitus: true, terveysLuku: 'seura' }); expect(vika[0].loukkaantuminen_tyyppi).toBe('nilkka');
      const eiPyydetty = await S.tmSisainenLataaJaYhdista(cgDb().db, 's', lista(), { s4Kirjoitus: true }); expect(eiPyydetty[0].loukkaantuminen_tyyppi).toBe('nilkka');
    } finally { console.warn = w; }
  });
});

describe('CF-lippu = selaimen lippu (s4 mukana)', () => {
  it('functions/tm_sisainen.js on tavu tavulta lib; liputPaalla huomioi s4:n; oletus päällä', () => {
    expect(lue('functions/tm_sisainen.js')).toBe(lue('lib/tm_sisainen.js')); expect(lue('functions/tm_sisainen.js')).toMatch(/s4: \{ kytketty: false, kirjoitus: true,/); CF.RYHMAT.s4.kirjoitus = false; const _m = ['jaksofokus_sisainen', 'henkilokunta'], _v = _m.map((n) => CF.RYHMAT[n].kirjoitus); _m.forEach((n) => { CF.RYHMAT[n].kirjoitus = false; });   // muut liput pois → eristää s4:n expect(LUKU.liputPaalla()).toBe(false);
    CF.RYHMAT.s4.kirjoitus = true; expect(LUKU.liputPaalla()).toBe(true); CF.RYHMAT.s4.kirjoitus = false; expect(LUKU.liputPaalla()).toBe(false); _m.forEach((n, i) => { CF.RYHMAT[n].kirjoitus = _v[i]; });
    expect(LUKU.liputPaalla({ s4: { kirjoitus: true } })).toBe(true); expect(lue('functions/sisainen_luku.js').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/\bkirjoitus\s*[:=]\s*(true|false)|process\.env/);
  });
});

describe('migraatio scripts/migroi_sisainen_s4.js (fake-Firestore; tuotantoon ei kosketa)', () => {
  const data = () => ({ 'seurat/a': {}, 'seurat/b': {},
    'seurat/a/pelaajat/p1': { etunimi: 'Aatu', kasvutahti_cm_v: 6, isa_pituus_cm: 180, loukkaantuminen_tyyppi: 'nilkka', arviointi_pvm: '2026-10-01', arviointi_kooste_pvm: '2026-10-02', arviointi_kooste: { a: 1 }, signaali: 'xfactor',
      havainto_porras_ehdotus: { valmis: false, seuraava: null, hist: [3, 2] }, adar_viimeisin: { yht: 2 }, phv_tila: 'PRE' },   // ei sisainen:ia → kopioi (B-kentät ja ehdotus-muoto eivät)
    'seurat/a/pelaajat/p2': { etunimi: 'Bertta', signaali: 'phv', adar_viimeisin: { yht: 2 }, phv_tila: 'PH', havainto_porras_ehdotus: { valmis: false, seuraava: null, hist: [] } },   // vain B / phv → ei S4:ää
    'seurat/a/pelaajat/p3': { etunimi: 'Cecil', kasvutahti_cm_v: 4 }, 'seurat/a/pelaajat/p3/sisainen/tiedot': { seuraId: 'a', kasvutahti_cm_v: 4 },   // jo siirretty
    'seurat/a/pelaajat/p4': { etunimi: 'Dani', arviointi_kooste_pvm: '2026-11-05', arviointi_kooste: { a: 9 }, kasvutahti_cm_v: 8, talenttiTaso: 'perus' },
    'seurat/a/pelaajat/p4/sisainen/tiedot': { seuraId: 'a', arviointi_kooste_pvm: '2026-10-10', arviointi_kooste: { a: 1 }, kasvutahti_cm_v: 5, d3_taso: 3 },   // arviointi vanhentunut → korvataan; kasvutahti: sisainen voittaa; talenttiTaso täydentyy
    'seurat/b/pelaajat/p5': { etunimi: 'Eero', loukkaantuminen_pvm: '2026-09-01' } });
  it('suunnittele: signaali jaetaan (phv ei kopioidu), hist → havainto_porras_hist, B-kentät ja ehdotus jäävät; tyhjä hist ei kopioidu', () => {
    const p = M.suunnittele(data()['seurat/a/pelaajat/p1'], null, 'a', 'T'); expect(Object.keys(p.kentat).sort()).toEqual(['arviointi_kooste', 'arviointi_kooste_pvm', 'arviointi_pvm', 'havainto_porras_hist', 'isa_pituus_cm', 'kasvutahti_cm_v', 'signaali'].sort());
    expect(p.terveys.luokka).toBe('kopioi'); expect(p.terveys.kentat).toEqual({ loukkaantuminen_tyyppi: 'nilkka' }); expect(p.terveys.data).toEqual({ terveysSeuraId: 'a', paivitetty: 'T', loukkaantuminen_tyyppi: 'nilkka' }); expect(p.terveys.mergeFields).toEqual(['terveysSeuraId', 'paivitetty', 'loukkaantuminen_tyyppi']);
    expect(p.kentat.havainto_porras_hist).toEqual([3, 2]); expect(p.kentat.signaali).toBe('xfactor'); B_JAA.concat(['havainto_porras_ehdotus']).forEach((k) => expect(p.kentat, k).not.toHaveProperty(k));
    expect(M.suunnittele(data()['seurat/a/pelaajat/p2'], null, 'a', 'T').luokka).toBe('ei_a');
  });
  it('DRY-RUN (oletus): ei kirjoita; luvut seuroittain; ei nimiä, id:itä eikä terveystietoa tulosteessa', async () => {
    const { db, D, loki } = fakeDb(data()), ennen = JSON.stringify([...D.entries()]), rivit = [];
    const y = await M.aja({ db, kirjoita: false, loki: (r) => rivit.push(r) }); expect(y).toMatchObject({ seuraa: 2, pelaajia: 5, ei_a: 2, jo_siirretty: 1, kopioi: 2, kirjoitettu: 0, vanhentunut: 1, eroaa: 1, terveys_kopioi: 2, terveys_kenttia: 2 });   // p5: vain terveyskenttä → tiedot-luokka ei_a, terveys kopioi
    expect(JSON.stringify([...D.entries()])).toBe(ennen); expect(loki.commits).toBe(0); expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Dani|Eero|p[1-5]\b|nilkka|xfactor/);
  });
  it('KIRJOITUS: sisainen voittaa, vanhentunut korvataan, täydennys, d3 koskematon, vanhat kentät JÄÄVÄT; toinen ajo = 0', async () => {
    const { db, D } = fakeDb(data()); const y = await M.aja({ db, kirjoita: true, nytISO: 'T' }); expect(y.kirjoitettu).toBe(4);   // tiedot: p1, p4 · terveys: p1, p5
    const p1 = D.get('seurat/a/pelaajat/p1/sisainen/tiedot'); expect(p1).toMatchObject({ seuraId: 'a', paivitetty: 'T', signaali: 'xfactor', havainto_porras_hist: [3, 2], isa_pituus_cm: 180, kasvutahti_cm_v: 6 }); expect(p1).not.toHaveProperty('adar_viimeisin'); expect(p1).not.toHaveProperty('phv_tila');
    expect(p1).not.toHaveProperty('loukkaantuminen_tyyppi');   // GDPR art. 9: terveys EI tiedot:iin
    expect(D.get('seurat/a/pelaajat/p1/sisainen/terveys')).toEqual({ terveysSeuraId: 'a', paivitetty: 'T', loukkaantuminen_tyyppi: 'nilkka' }); expect(D.get('seurat/b/pelaajat/p5/sisainen/terveys')).toEqual({ terveysSeuraId: 'b', paivitetty: 'T', loukkaantuminen_pvm: '2026-09-01' }); expect(D.has('seurat/b/pelaajat/p5/sisainen/tiedot')).toBe(false);
    expect(D.get('seurat/a/pelaajat/p1').loukkaantuminen_tyyppi).toBe('nilkka');   // vanha kenttä jää (PR 2 siivoaa)
    const p4 = D.get('seurat/a/pelaajat/p4/sisainen/tiedot'); expect(p4.arviointi_kooste).toEqual({ a: 9 }); expect(p4.arviointi_kooste_pvm).toBe('2026-11-05'); expect(p4.kasvutahti_cm_v).toBe(5); expect(p4.talenttiTaso).toBe('perus'); expect(p4.d3_taso).toBe(3);
    expect(D.get('seurat/a/pelaajat/p1').signaali).toBe('xfactor'); expect(D.get('seurat/a/pelaajat/p1').havainto_porras_ehdotus.hist).toEqual([3, 2]); expect(D.has('seurat/a/pelaajat/p2/sisainen/tiedot')).toBe(false);
    const y2 = await M.aja({ db, kirjoita: true }); expect(y2).toMatchObject({ kopioi: 0, kirjoitettu: 0 });
  });
  it('MIGRAATION JÄLKEEN dual-read (lippu päällä) palauttaa staffille saman kuin ennen: signaali + ehdotus.hist', async () => {
    const { db, D } = fakeDb(data()); await M.aja({ db, kirjoita: true }); const p = D.get('seurat/a/pelaajat/p1'), s = D.get('seurat/a/pelaajat/p1/sisainen/tiedot');
    const julkinen = { valmis: false, seuraava: null }; const pel = Object.assign({}, p, { signaali: undefined, havainto_porras_ehdotus: julkinen }); const y = S.tmSisainenYhdista(pel, s, { s4Kirjoitus: true });
    expect(y.signaali).toBe('xfactor'); expect(y.havainto_porras_ehdotus).toEqual({ valmis: false, seuraava: null, hist: [3, 2] }); expect(y.kasvutahti_cm_v).toBe(6);
  });
  it('skriptin turvallisuus: dry-run oletuksena, KIRJOITA-vahvistus, ADC, require ei käynnistä ajoa, vain yksi set (mergeFields), ei poistoa/updatea', () => {
    expect(SRC).toContain("argv.includes('--kirjoita')"); expect(SRC).toContain('Kirjoita KIRJOITA vahvistukseksi'); expect(SRC).toContain('credential.applicationDefault()'); expect(SRC).not.toMatch(/serviceAccount|\.json'\)|admin\.applicationDefault/);
    expect(SRC).toContain('require.main === module'); expect(SRC).not.toMatch(/\.delete\(|FieldValue|\.update\(/); expect((SRC.match(/b\.set\(/g) || []).length).toBe(1);
  });
});

describe('GREP-PORTTI: pelaajan ja vanhemman sivut eivät lue siirrettäviä S4-kenttiä pelaajadokumentista', () => {
  const k = S.tmS4Kentat().filter((x) => x !== 'signaali' && x !== 'havainto_porras_hist');
  const A = new RegExp('\\b(' + k.join('|') + ')\\b');
  /* Jaetut libit jotka sisältävät S4-kenttänimiä, mutta joita pelaaja-appi ei käytä S4-kenttien lukuun (tarkistettu 24.10.): tm_phv_tila.js (`bio.maturity_offset` = biologinenIka_viimeisin-alaolio, B), tm_tukitavoitteet.js / tm_idp.js (henkilökunnan
     ehdotinlogiikka; Pelaaja_v7 ei kutsu sen kandidaattifunktioita), tm_eerikkila_normit.js (henkilökunnan KPI-funktiot), tm_pelialy_yksilo.js (pikakenttien LASKENTA/kirjoitusapuri; lukijat ovat staff). Rekisterointi_Suostumus: vanhempi LÄHETTÄÄ pituudet CF:lle, ei lue. */
  const SALLITTU = ['lib/tm_phv_tila.js', 'lib/tm_tukitavoitteet.js', 'lib/tm_idp.js', 'lib/tm_eerikkila_normit.js', 'lib/tm_pelialy_yksilo.js'];
  const puhdas = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('Pelaaja_v7 ja Vanhempi_v2 (HTML) eivät viittaa S4-kenttiin; sallituissa libeissä ei muita S4-viittauksia kuin yllä', () => {
    for (const sivu of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) {
      const h = lue(sivu); expect(puhdas(h), sivu).not.toMatch(A);
      [...h.matchAll(/<script src="(lib\/[^"?]+)/g)].map((m) => m[1]).filter((l) => !SALLITTU.includes(l)).forEach((l) => { try { expect(puhdas(lue(l)), sivu + ' → ' + l).not.toMatch(A); } catch (e) { if (e.code === 'ENOENT') return; throw e; } });
    }
  });
  it('Pelaaja_v7 lukee signaalin vain PH-merkkinä ("phv") ja porrasehdotuksesta vain hist-määrän (hist_n-siirtymä 1e-3:ssa)', () => {
    const h = lue('TalentMaster_Pelaaja_v7.html'); expect(h).toMatch(/_pelaaja\?\.signaali/); expect(h).toContain("'phv'"); expect(h).toContain('_ehdE.hist_n');   // 1e-3a: hist_n ensin, hist.length varalla
  });
});

describe('Rules v3.70 (tekstitarkistus; toiminta: tests/rules/sisainen.rules.test.js)', () => {
  const R = lue('tm_admin/firestore.rules');
  it('versio 3.70 + changelog; testivastaava vain kasvumittauksen kypsyys-avaimet; johto vain tuojaUid; kutsut create + update', () => {
    expect(R).toMatch(/firestore\.rules v3\.7\d/); expect(R).toContain('Muutokset v3.69 → v3.70');   // PR 1f-1: versio nousi v3.71:een (changelog säilyy)
    expect((R.match(/sisainenTestivastaavaKelpaa\(seuraId, /g) || []).length).toBe(3); expect((R.match(/sisainenTuojaKelpaa\(seuraId, /g) || []).length).toBe(3);   // määritys + create + update
    const f = R.match(/function sisainenTestivastaavaKelpaa[\s\S]*?\n    }/)[0]; ['kasvutahti_cm_v', 'kasvutahti_vyohyke', 'maturity_offset', 'kehitysvaihe_kaista', 'kronologinen_ika', 'phv_raaka', 'phv_huom', 'phv_ongelma', 'seuraId', 'paivitetty'].forEach((a) => expect(f, a).toContain("'" + a + "'"));
    ADAR.concat(ARV, TT, ['isa_pituus_cm', 'aiti_pituus_cm', 'signaali', 'phv_ilmoitettu_ph']).forEach((a) => expect(f, a).not.toContain("'" + a + "'")); expect(f).toContain('onTestivastaava(seuraId)');
    expect(R).toMatch(/function sisainenTuojaKelpaa[\s\S]{0,200}onOmaSeura\(seuraId\) && onJohtoRooli\(\) && avaimet\.hasOnly\(\['tuojaUid', 'seuraId', 'paivitetty'\]\)/);
  });
  it('TERVEYS: Rulesin terveys-avainlistat (kirjoittaja hasOnly + sisainenEiTerveysta) = rekisterin terveys-ryhmä; lukijat vain SA/vp/utj/fysio/valmentaja; seurasihteeri/testivastaava eivät; indeksi terveysSeuraId', () => {
    const avaimet = (nimi) => [...R.match(new RegExp('function ' + nimi + '[\\s\\S]*?\\n    }'))[0].matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);
    const kirj = avaimet('sisainenTerveysKirjoittaja').filter((a) => a !== 'terveysSeuraId' && a !== 'paivitetty' && a !== 'fysioterapeutti'), ei = avaimet('sisainenEiTerveysta');
    expect(kirj.slice().sort()).toEqual(S.RYHMAT.terveys.kentat.slice().sort()); expect(ei.slice().sort()).toEqual(S.RYHMAT.terveys.kentat.slice().sort());
    expect(S.RYHMAT.terveys.seuraAvain).toBe('terveysSeuraId'); expect(R).toContain("request.auth.token.rooli in ['vp', 'urheilutoimenjohtaja', 'fysioterapeutti', 'talenttivalmentaja']");
    const lukija = R.match(/function sisainenTerveysLukija[\s\S]*?\n    }/)[0]; expect(lukija).not.toMatch(/seurasihteeri|testivastaava|onJohtoRooli|onOmanSeuranValmentaja|fysiikkavalmentaja/); expect(R.match(/function sisainenTerveysKirjoittaja[\s\S]*?\n    }/)[0]).toContain("request.auth.token.rooli == 'fysioterapeutti'");
    expect(R).toMatch(/allow read:\s+if \(dokId != 'terveys' && \(onSuperAdmin\(\)/); expect(R).toContain("(dokId == 'terveys' && sisainenTerveysLukija(seuraId, pelaajaId))");
    expect((R.match(/sisainenEiTerveysta\(/g) || []).length).toBe(3);   // määritys + tiedot create + tiedot update
    const cg = R.match(/match \/\{path=\*\*\}\/sisainen\/\{dokId\}[\s\S]*?\n    }/)[0]; expect(cg).toContain("resource.data.get('terveysSeuraId', '')"); expect(cg).not.toMatch(/dokId\s*[!=]=/);   // list-kyselyssä dokId ei ole rajattu → ehdot kentistä
    const idx = JSON.parse(lue('firestore.indexes.json')).fieldOverrides.find((o) => o.collectionGroup === 'sisainen' && o.fieldPath === 'terveysSeuraId'); expect(idx).toBeDefined(); expect(idx.indexes.some((i) => i.queryScope === 'COLLECTION_GROUP' && i.order === 'ASCENDING')).toBe(true);
    expect(R).toContain('TERVEYS-DOKUMENTTI (PM 25.10., PR #1137)');
  });
  it('testivastaavan kypsyys-avaimet ovat rekisterin kypsyys_sisainen-kenttiä (Rules ja lib eivät erkane)', () => {
    const f = R.match(/function sisainenTestivastaavaKelpaa[\s\S]*?\n    }/)[0], avaimet = [...f.matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]).filter((a) => a !== 'seuraId' && a !== 'paivitetty');
    avaimet.forEach((a) => expect(S.RYHMAT.kypsyys_sisainen.kentat, a).toContain(a));
  });
});

describe('TUOJA-KORJAUS (ei lippua): tuojan sähköposti pois pelaajadokumentista, henkilökunnan tunnisteet pois pelaajan/huoltajan lukemista alikokoelmista', () => {
  const ilmanKommentteja = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\/\/ .*$/gm, '');
  it('Seura: ei tuoja-sähköpostia pelaajadokumenttiin; tuojaUid sisainen/tiedot:iin molemmissa luontipaikoissa (lisäys + Excel-tuonti), ei lippua, virhe ei kaada luontia', () => {
    const h = lue('TalentMaster_Seura.html'), k = ilmanKommentteja(h);
    expect(k).not.toMatch(/\btuoja\s*:/); expect((h.match(/await _tmKirjaaTuoja\(tila\.seuraId, pelaajaId\)/g) || []).length).toBe(2); expect(h).toMatch(/async function _tmKirjaaTuoja[\s\S]{0,700}collection\('sisainen'\)\.doc\('tiedot'\)[\s\S]{0,300}tuojaUid[\s\S]{0,300}catch \(e\) \{ console\.warn/);
    expect(h).not.toMatch(/tuojaUid:\s*tila\.kayttaja\.email|tuojaEmail/);
  });
  it('testitulokset / biologinen_ika / testitapahtumat-tulokset: uusiin kirjoituksiin ei tuojaUid/tallensiUid/kirjaaja/mittaaja-sähköpostia (pelaaja ja huoltaja lukevat)', () => {
    for (const f of ['TalentMaster_Excel_Tuonti.html', 'TalentMaster_Testituonti_Master.html', 'TalentMaster_Harjoitettavuus_Lomake_v4.html', 'TalentMaster_Testaus_v9.html', 'lib/tm_pikakirjaus.js']) {
      const k = ilmanKommentteja(lue(f)); expect(k, f).not.toMatch(/\btuojaUid\b|\btallensiUid\b|\bkirjaaja\s*:/); expect(k, f).not.toMatch(/mittaaja\s*:\s*_kayttaja/);
    }
    expect(S.tmS4Kentat()).not.toContain('tuojaUid');
  });
  it('lib/tm_pikakirjaus.js: payload ilman tuojaUid:ia; tm_bioika.js välittää mittaajan vain jos kutsuja antaa (T9 ei enää anna)', () => {
    const P = require('../lib/tm_pikakirjaus.js'); expect(P).toBeDefined(); expect(lue('lib/tm_bioika.js')).toContain('mittaaja:      syote.mittaaja || null');
  });
});
