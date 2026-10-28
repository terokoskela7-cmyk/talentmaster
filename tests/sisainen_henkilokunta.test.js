/* Vaihe 1 / PR 1c-1 (viipale S2) — henkilökunnan kenttäryhmä: rekisteri, lippu (pois), dual-read joka seuraa lippua, kirjoitusapuri (mergeFields), migraatio, grep-portti (pelaaja/vanhempi), Rules-tekstit.
   Kirjoittajia EI vielä kytketä (1c-2 CF, 1c-3 selain): selainkäytös ei muutu. Rules: tests/rules/sisainen.rules.test.js (v3.69). */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js'), M = require('../scripts/migroi_sisainen_henkilokunta.js');
const SRC = lue('scripts/migroi_sisainen_henkilokunta.js');
const LIPPU = S.RYHMAT.henkilokunta;
afterEach(() => { LIPPU.kirjoitus = false; });

const KENTAT = ['vastuuhenkilo', 'tukitarve', 'scout_potentiaali', 'scout_potentiaali_taso', 'scout_potentiaali_huomiot', 'scout_potentiaali_pvm', 'scout_potentiaali_arvioija', 'talentti_ehdotus',
  'review_viimeisin_pvm', 'review_viimeisin_tyyppi', 'review_tagit', 'idp_edistyma', 'idp_lahde', 'idp_viim_review', 'idp_dvi'];
const PEL = 'seurat/s/pelaajat/p1', SIS = PEL + '/sisainen/tiedot', DEL = { __poista: true };
const VH = (pvm, uid) => ({ uid: uid || 'u1', rooli: 'valmentaja', asetettu_pvm: pvm });
const pelaaja = () => ({ etunimi: 'X', vastuuhenkilo: VH('2026-10-01'), tukitarve: { alue: 'kestävyys', merkitty_pvm: '2026-10-02' }, scout_potentiaali: 4, scout_potentiaali_taso: 'korkea', scout_potentiaali_huomiot: 'h', scout_potentiaali_pvm: '2026-09-15', scout_potentiaali_arvioija: 'u2',
  talentti_ehdotus: { lahde: 'vp', pvm: '2026-09-01', ehdottaja_uid: 'u3', ehdottaja_rooli: 'vp' }, review_viimeisin_pvm: '2026-10-10', review_viimeisin_tyyppi: 'jakso', review_tagit: ['a'], idp_edistyma: 40, idp_lahde: 'vp', idp_viim_review: '2026-10-10', idp_dvi: { x: 1 } });

describe('rekisteri: S2-ryhmä', () => {
  it('henkilokunta = briiffin 15 kenttää; lippu PÄÄLLÄ (lipun käännön PR) ja kytkentä POIS oletuksena; D3 on edelleen ainoa kytketty ryhmä; tmSisainenKentat() ennallaan', () => {
    expect(LIPPU.kentat).toEqual(KENTAT); expect(LIPPU.kirjoitus).toBe(true); expect(LIPPU.kytketty).toBe(false); expect(LIPPU.erillinen).toBe(true);
    expect(Object.keys(S.RYHMAT).filter((n) => S.RYHMAT[n].kytketty)).toEqual(['d3']); expect(S.tmSisainenKentat()).toEqual(['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm']);
    expect(S.tmHenkilokuntaKentat()).toEqual(KENTAT);
  });
  it('signaali on S4-ryhmä (kytkemätön), tavoitteet = C (ei rekisterissä); kenttiä ei ole kahdessa ryhmässä; migraation yksiköt kattavat täsmälleen ryhmän', () => {
    expect(S.RYHMAT.signaali.kentat).toEqual(['signaali']); expect(S.RYHMAT.signaali.kytketty).toBe(false); expect(S.RYHMAT.staff_paatokset).toBeUndefined(); expect(S.RYHMAT.idp_sisainen).toBeUndefined(); expect(S.RYHMAT.review).toBeUndefined();
    const kaikki = Object.values(S.RYHMAT).flatMap((r) => r.kentat); expect(kaikki).not.toContain('tavoitteet'); expect(new Set(kaikki).size).toBe(kaikki.length);
    expect(M.YKSIKOT.flatMap((y) => y.kentat).sort()).toEqual(KENTAT.slice().sort());
  });
});

describe('dual-read seuraa samaa lippua kuin kirjoitus', () => {
  const sis = () => ({ vastuuhenkilo: VH('2026-10-05', 'ERI'), review_viimeisin_pvm: '2026-10-20', scout_potentiaali: 2, d3_taso: 4 });
  it('lippu POIS: luku = vanha kenttä, vaikka sisainen on olemassa ja eroaa; D3 yhdistyy silti (oma ryhmä); lista samoin', () => {
    const y = S.tmSisainenYhdista(pelaaja(), sis()); expect(y.vastuuhenkilo).toEqual(VH('2026-10-01')); expect(y.review_viimeisin_pvm).toBe('2026-10-10'); expect(y.scout_potentiaali).toBe(4); expect(y.d3_taso).toBe(4);
    expect(S.tmSisainenYhdistaLista([Object.assign({ id: 'p1' }, pelaaja())], { p1: sis() })[0].vastuuhenkilo.uid).toBe('u1');
  });
  it('lippu PÄÄLLÄ: sisainen voittaa kentittäin, puuttuva kenttä jää vanhasta; syöte ennallaan', () => {
    LIPPU.kirjoitus = true; const p = pelaaja(), ennen = JSON.stringify(p), y = S.tmSisainenYhdista(p, sis());
    expect(y.vastuuhenkilo.uid).toBe('ERI'); expect(y.review_viimeisin_pvm).toBe('2026-10-20'); expect(y.scout_potentiaali).toBe(2); expect(y.tukitarve).toEqual(p.tukitarve); expect(JSON.stringify(p)).toBe(ennen);
  });
  it('opts.henkilokuntaKirjoitus ohittaa rekisterin (CF-vakio / testit); tmSisainenJaa ei reititä henkilokunta-kenttiä (erillinen mergeFields-reitti)', () => {
    expect(S.tmSisainenYhdista(pelaaja(), sis(), { henkilokuntaKirjoitus: true }).vastuuhenkilo.uid).toBe('ERI'); LIPPU.kirjoitus = true; expect(S.tmSisainenYhdista(pelaaja(), sis(), { henkilokuntaKirjoitus: false }).vastuuhenkilo.uid).toBe('u1');
    const j = S.tmSisainenJaa({ vastuuhenkilo: VH('x'), nimi: 'a' }, { seuraId: 's', ryhmat: Object.assign({}, S.RYHMAT, { henkilokunta: Object.assign({}, LIPPU, { kytketty: true }) }) }); expect(j.sisainen).toBeNull();
  });
});

function mkDb(hylkaa) {
  const f = fakeDb({ [PEL]: { etunimi: 'X' } }), b0 = f.db.batch.bind(f.db);
  f.db.batch = () => { const b = b0(), sisaan = []; return { set: (r, d, o) => { sisaan.push(r._path); b.set(r, d, o); }, update: (r, d) => b.update(r, d), delete: b.delete,
    commit: async () => { if (hylkaa && sisaan.some((p) => /sisainen/.test(p))) { const e = new Error('Missing or insufficient permissions'); e.code = 'permission-denied'; throw e; } return b.commit(); } }; };
  return f;
}
describe('tmHenkilokuntaOsa / tmHenkilokuntaKirjoita', () => {
  const upd = () => ({ vastuuhenkilo: VH('2026-11-02', 'u9'), review_viimeisin_pvm: '2026-11-02', review_viimeisin_tyyppi: 'jakso', jaksofokus: { x: 1 }, ydinvahvuus_valinta: DEL });
  it('osa: vain henkilokunta-kentät, mergeFields korvaa kentän, seuraId + paivitetty mukana; lippu pois / ei kenttiä / ei oliota → null', () => {
    expect(S.tmHenkilokuntaOsa('s', upd(), {})).toBeNull();
    const o = S.tmHenkilokuntaOsa('s', upd(), { henkilokuntaKirjoitus: true, nytISO: 'T' }); expect(o.data).toEqual({ seuraId: 's', paivitetty: 'T', vastuuhenkilo: VH('2026-11-02', 'u9'), review_viimeisin_pvm: '2026-11-02', review_viimeisin_tyyppi: 'jakso' });
    expect(o.mergeFields).toEqual(['seuraId', 'paivitetty', 'vastuuhenkilo', 'review_viimeisin_pvm', 'review_viimeisin_tyyppi']);
    expect(S.tmHenkilokuntaOsa('s', { jaksofokus: {} }, { henkilokuntaKirjoitus: true })).toBeNull(); expect(S.tmHenkilokuntaOsa('s', null, { henkilokuntaKirjoitus: true })).toBeNull();
  });
  it('lippu POIS: pelkkä pelaajan update (ei batchia, ei sisainen-dokumenttia); taydenna → batch ilman sisainen:iä', async () => {
    const f = mkDb(); expect(await S.tmHenkilokuntaKirjoita(f.db, 's', 'p1', upd(), {})).toEqual({ ok: true, sisainen: false, sisainenOhitettu: false }); expect(f.loki.commits).toBe(0); expect(f.D.has(SIS)).toBe(false); expect(f.D.get(PEL).vastuuhenkilo.uid).toBe('u9');
    const g = mkDb(); await S.tmHenkilokuntaKirjoita(g.db, 's', 'p1', upd(), { taydenna: (b) => b.set(g.db.collection('seurat').doc('s').collection('pelaajat').doc('p1').collection('reviewit').doc('d'), { a: 1 }, { merge: true }) }); expect(g.loki.commits).toBe(1); expect(g.D.has(SIS)).toBe(false); expect(g.D.get(PEL + '/reviewit/d')).toEqual({ a: 1 });
  });
  it('lippu PÄÄLLÄ: YKSI batch — pelaaja kuten ennen (dual-write) + sisainen mergeFields; kenttä KORVATAAN (ei syvää yhdistystä); delete-sentinel välittyy', async () => {
    const f = mkDb(); f.D.set(SIS, { seuraId: 's', vastuuhenkilo: { uid: 'vanha', rooli: 'vp', asetettu_pvm: '2026-01-01', ylimaarainen: true }, d3_taso: 3 });
    expect(await S.tmHenkilokuntaKirjoita(f.db, 's', 'p1', upd(), { henkilokuntaKirjoitus: true, nytISO: 'T' })).toEqual({ ok: true, sisainen: true, sisainenOhitettu: false }); expect(f.loki.commits).toBe(1);
    expect(f.D.get(PEL).vastuuhenkilo).toEqual(VH('2026-11-02', 'u9')); expect(f.D.get(PEL).jaksofokus).toEqual({ x: 1 });
    expect(f.D.get(SIS).vastuuhenkilo).toEqual(VH('2026-11-02', 'u9')); expect(f.D.get(SIS).d3_taso).toBe(3); expect(f.D.get(SIS).review_viimeisin_tyyppi).toBe('jakso'); expect(f.D.get(SIS).jaksofokus).toBeUndefined();
    await S.tmHenkilokuntaKirjoita(f.db, 's', 'p1', { vastuuhenkilo: DEL }, { henkilokuntaKirjoitus: true }); expect(f.D.get(SIS).vastuuhenkilo).toBeUndefined(); expect(f.D.get(SIS).review_viimeisin_pvm).toBe('2026-11-02');
  });
  it('permission-denied (Rules v3.69 ei vielä käytössä) → uusi batch ILMAN sisainen:iä (pelaaja + taydenna tallentuvat), sisainenOhitettu; varapolku:false heittää', async () => {
    const f = mkDb(true), r = await S.tmHenkilokuntaKirjoita(f.db, 's', 'p1', upd(), { henkilokuntaKirjoitus: true, taydenna: (b) => b.set(f.db.collection('seurat').doc('s').collection('pelaajat').doc('p1').collection('reviewit').doc('d'), { a: 1 }, { merge: true }) });
    expect(r).toEqual({ ok: true, sisainen: false, sisainenOhitettu: true }); expect(f.D.get(PEL).vastuuhenkilo.uid).toBe('u9'); expect(f.D.has(SIS)).toBe(false); expect(f.D.get(PEL + '/reviewit/d')).toEqual({ a: 1 });
    await expect(S.tmHenkilokuntaKirjoita(mkDb(true).db, 's', 'p1', upd(), { henkilokuntaKirjoitus: true, varapolku: false })).rejects.toThrow(/permissions/);
  });
});

describe('migraatio scripts/migroi_sisainen_henkilokunta.js (fake-Firestore; tuotantoon ei kosketa)', () => {
  function data() {
    return { 'seurat/a': {}, 'seurat/b': {},
      'seurat/a/pelaajat/p1': Object.assign({ etunimi: 'Aatu' }, pelaaja()),                                       // ei sisainen:ia → kopioi kaikki 15
      'seurat/a/pelaajat/p2': { etunimi: 'Bertta', jaksofokus: { x: 1 } },                                          // ei henkilökunta-kenttiä
      'seurat/a/pelaajat/p3': Object.assign({ etunimi: 'Cecil' }, pelaaja()), 'seurat/a/pelaajat/p3/sisainen/tiedot': Object.assign({ seuraId: 'a' }, pelaaja()),   // jo siirretty
      'seurat/a/pelaajat/p4': { etunimi: 'Dani', vastuuhenkilo: VH('2026-10-01', 'vanha'), tukitarve: { alue: 'a', merkitty_pvm: '2026-10-02', lisa: 'x' }, review_viimeisin_pvm: '2026-11-05', review_viimeisin_tyyppi: 'jakso' },
      'seurat/a/pelaajat/p4/sisainen/tiedot': { seuraId: 'a', vastuuhenkilo: VH('2026-10-01', 'sisainen'), tukitarve: { alue: 'a', merkitty_pvm: '2026-10-02' }, review_viimeisin_pvm: '2026-10-10', review_viimeisin_tyyppi: 'kehityskeskustelu', d3_taso: 3 },   // vh: ristiriita (sisainen voittaa); tukitarve: lehti täydentyy; review: VANHENTUNUT
      'seurat/b/pelaajat/p5': { etunimi: 'Eero', idp_edistyma: 10 } };                                                // pvm-ton yksikkö → kopioi
  }
  it('DRY-RUN (oletus): ei kirjoita; luvut seuroittain; ei nimiä eikä id:itä tulosteessa', async () => {
    const { db, D, loki } = fakeDb(data()), ennen = JSON.stringify([...D.entries()]), rivit = [];
    const y = await M.aja({ db, kirjoita: false, loki: (r) => rivit.push(r) });
    expect(y).toMatchObject({ seuraa: 2, pelaajia: 5, ei_a: 1, jo_siirretty: 1, kopioi: 3, eroaa: 1, vanhentunut: 1, kirjoitettu: 0 }); expect(y.kenttia).toBe(15 + 1 + 2 + 1);   // p1 15 · p4: tukitarve (täydennetty) + review pvm/tyyppi (korvaus) · p5 1
    expect(JSON.stringify([...D.entries()])).toBe(ennen); expect(loki.commits).toBe(0); expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Dani|Eero|p[1-5]\b/);
  });
  it('KIRJOITUS: sisainen voittaa ristiriidassa, lehdet täydentyvät, vanhentunut korvataan, d3 koskematon, vanhat kentät JÄÄVÄT; toinen ajo = 0', async () => {
    const { db, D } = fakeDb(data()); const y = await M.aja({ db, kirjoita: true, nytISO: 'T' }); expect(y.kirjoitettu).toBe(3);
    const p1 = D.get('seurat/a/pelaajat/p1/sisainen/tiedot'); KENTAT.forEach((k) => expect(p1[k], k).toEqual(pelaaja()[k])); expect(p1).toMatchObject({ seuraId: 'a', paivitetty: 'T' });
    const p4 = D.get('seurat/a/pelaajat/p4/sisainen/tiedot'); expect(p4.vastuuhenkilo.uid).toBe('sisainen'); expect(p4.tukitarve).toEqual({ alue: 'a', merkitty_pvm: '2026-10-02', lisa: 'x' }); expect(p4.review_viimeisin_pvm).toBe('2026-11-05'); expect(p4.review_viimeisin_tyyppi).toBe('jakso'); expect(p4.d3_taso).toBe(3);
    expect(D.get('seurat/a/pelaajat/p4').vastuuhenkilo.uid).toBe('vanha'); expect(D.get('seurat/a/pelaajat/p1').vastuuhenkilo).toEqual(VH('2026-10-01')); expect(D.has('seurat/a/pelaajat/p2/sisainen/tiedot')).toBe(false); expect(D.get('seurat/b/pelaajat/p5/sisainen/tiedot').idp_edistyma).toBe(10);
    const y2 = await M.aja({ db, kirjoita: true }); expect(y2).toMatchObject({ kopioi: 0, kirjoitettu: 0, vanhentunut: 0 }); expect(y2.jo_siirretty).toBe(4);
  });
  it('MIGRAATION JÄLKEEN dual-read (lippu päällä) palauttaa saman kuin pelaajadokumentti; null-arvot ohitetaan; --seura rajaa', async () => {
    const { db, D } = fakeDb(data()); await M.aja({ db, kirjoita: true }); const p = D.get('seurat/a/pelaajat/p1'), s = D.get('seurat/a/pelaajat/p1/sisainen/tiedot');
    const julkinen = Object.assign({}, p); KENTAT.forEach((k) => { delete julkinen[k]; }); const y = S.tmSisainenYhdista(julkinen, s, { henkilokuntaKirjoitus: true }); KENTAT.forEach((k) => expect(y[k], k).toEqual(p[k]));
    expect(M.suunnittele({ vastuuhenkilo: null, idp_edistyma: null }, null, 'a', 'T').luokka).toBe('ei_a'); expect((await M.aja({ db: fakeDb(data()).db, seura: 'b' })).pelaajia).toBe(1);
  });
  it('NULL-LEHTI kartassa (tuotanto kpv: idp_lahde.pvm = null molemmissa) → jo siirretty, ei ikuista "kopioi: 1"; oikea puuttuva lehti täydentyy edelleen', async () => {
    const IL = (pvm) => ({ tyyppi: 'jakso', pvm });
    expect(M.suunnittele({ idp_edistyma: 40, idp_lahde: IL(null) }, { idp_edistyma: 40, idp_lahde: IL(null) }, 'a', 'T').luokka).toBe('jo_siirretty');
    expect(M.suunnittele({ idp_edistyma: 40, idp_lahde: IL(null) }, { idp_edistyma: 40, idp_lahde: { tyyppi: 'jakso' } }, 'a', 'T').luokka).toBe('jo_siirretty');   // null ei täydennä puuttuvaa
    const t = M.suunnittele({ idp_edistyma: 40, idp_lahde: IL('2026-10-01') }, { idp_edistyma: 40, idp_lahde: IL(null) }, 'a', 'T'); expect(t.luokka).toBe('kopioi'); expect(t.kentat.idp_lahde).toEqual(IL('2026-10-01'));
    const { db } = fakeDb({ 'seurat/k': {}, 'seurat/k/pelaajat/q1': { idp_edistyma: 40, idp_lahde: IL(null) }, 'seurat/k/pelaajat/q1/sisainen/tiedot': { seuraId: 'k', idp_edistyma: 40, idp_lahde: IL(null) } });
    const y = await M.aja({ db, kirjoita: true }); expect(y).toMatchObject({ kopioi: 0, kenttia: 0, kirjoitettu: 0, jo_siirretty: 1 });
  });
  it('--selita (lukeva): tulostaa seuran, kenttä-/lehtipolun ja arvotyypin — ei arvoja, ei pelaaja-id:itä, id-näköiset map-avaimet peitetty; ei kirjoita', async () => {
    const { db, loki } = fakeDb({ 'seurat/k': {}, 'seurat/k/pelaajat/q1': { tukitarve: { alue: 'SALAINEN', merkitty_pvm: '2026-10-02', abcDEF1234567890xyz: 'x' } }, 'seurat/k/pelaajat/q1/sisainen/tiedot': { tukitarve: { alue: 'SALAINEN' } } }), rivit = [];
    await M.aja({ db, selita: true, loki: (r) => rivit.push(r) }); const s = rivit.join('\n');
    expect(s).toMatch(/\[k\] SELITYS tukitarve\.merkitty_pvm · lehti puuttuu sisainen:sta · tyyppi pelaajadokumentissa: string · sisainen: puuttuu/); expect(s).toMatch(/tukitarve\.<id>/);
    expect(s).not.toMatch(/SALAINEN|2026-10-02|q1|abcDEF/); expect(loki.commits).toBe(0);
    expect([null, {}, [], { toDate: () => 0 }, new (class FieldValueX {})(), 'x', 1].map(M.tyyppi)).toEqual(['null', 'tyhjä map', 'tyhjä taulukko', 'Timestamp', 'kenttäoperaatio(FieldValueX)', 'string', 'number']);
  });
  it('skriptin turvallisuus: dry-run oletuksena, KIRJOITA-vahvistus, ADC, require ei käynnistä ajoa, vain yksi set (mergeFields), ei poistoa/updatea', () => {
    expect(SRC).toContain("argv.includes('--kirjoita')"); expect(SRC).toContain('Kirjoita KIRJOITA vahvistukseksi'); expect(SRC).toContain('credential.applicationDefault()'); expect(SRC).not.toMatch(/serviceAccount|\.json'\)|admin\.applicationDefault/);
    expect(SRC).toContain('require.main === module'); expect(SRC).not.toMatch(/\.delete\(|FieldValue|\.update\(/); expect((SRC.match(/b\.set\(/g) || []).length).toBe(1);
  });
});

describe('GREP-PORTTI: pelaajan ja vanhemman sovellukset (+ libit) eivät viittaa siirrettäviin henkilökunta-kenttiin', () => {
  const A = /\bvastuuhenkilo\b|\btukitarve\b|scout_potentiaali|talentti_ehdotus|review_viimeisin|review_tagit|idp_edistyma|idp_lahde|idp_viim_review|idp_dvi/;
  /* lib/tm_eerikkila_normit.js on jaettu: sisältää henkilökunnan KPI-funktioita (laskeReviewKadenssi, laskeJoukkueReviewKooste); lib/tm_idp.js sisältää staffin pikakenttärakentimen idpPikakentat — ne saavat pelaajaolion parametrina eivätkä lue dokumenttia; pelaaja-appi ei kutsu niitä (tarkistettu erikseen alla). */
  it('Pelaaja_v7 ei kutsu tm_eerikkila_normit.js:n henkilökunta-KPI-funktioita', () => { const h = lue('TalentMaster_Pelaaja_v7.html'); ['laskeReviewKadenssi', 'laskeJoukkueReviewKooste', 'mdr_kattavuus_pct', 'idpPikakentat', 'idpEdistymaNayta'].forEach((f) => expect(h, f).not.toContain(f)); });
  for (const sivu of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Rekisterointi_Suostumus.html']) {
    it(sivu + ' ja sen lib-skriptit', () => {
      const h = lue(sivu); expect(h).not.toMatch(A);
      const libit = [...h.matchAll(/<script src="(lib\/[^"?]+)/g)].map((m) => m[1]).filter((l) => !['lib/tm_eerikkila_normit.js', 'lib/tm_idp.js'].includes(l)).concat(['harjoitelogiikka_v4.js'].filter(() => sivu.includes('Pelaaja')));
      libit.forEach((l) => { try { expect(lue(l).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), l).not.toMatch(A); } catch (e) { if (e.code === 'ENOENT') return; throw e; } });
    });
  }
});

describe('Rules v3.69 (tekstitarkistus; toiminta: tests/rules/sisainen.rules.test.js)', () => {
  const R = lue('tm_admin/firestore.rules');
  it('versio 3.69 + changelog; sisainen-blokin create/update kutsuvat scout- ja vastuuhenkilö-ehtoja; scout-ehto = SA | johto; vastuuhenkilö kuten pelaajadokumentissa', () => {
    expect(R).toMatch(/firestore.rules v3.(69|70|71)/); expect(R).toContain('Muutokset v3.68 → v3.69');
    expect((R.match(/sisainenScoutKelpaa\(seuraId, /g) || []).length).toBe(3); expect((R.match(/sisainenVastuuKelpaa\(seuraId, pelaajaId, /g) || []).length).toBe(3);   // määritys + create + update
    expect(R).toMatch(/function sisainenScoutKelpaa[\s\S]{0,400}onSuperAdmin\(\) \|\| \(onOmaSeura\(seuraId\) && onJohtoRooli\(\)\)/); expect(R).toMatch(/function sisainenVastuuKelpaa[\s\S]{0,400}vastuuhenkiloAsettaja\(seuraId, pelaajaId\)[\s\S]{0,200}vastuuhenkiloMuotoKelpaa/);
  });
});
