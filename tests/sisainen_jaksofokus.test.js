/* Vaihe 1 / PR 1b-1 (viipale S1) — jaksofokuksen sisäiset osat: lib/tm_sisainen.js (jako/yhdistys/historia-avain), migraatio scripts/migroi_sisainen_jaksofokus.js, grep-portti (pelaaja/vanhempi eivät viittaa A-polkuihin),
   asetti/lahde-tarkistus (vain rooli/pvm/lähdetyyppi → jäävät pelaajadokumenttiin). Kirjoittajia EI vielä kytketä (1b-2/1b-3): selainkäytös ei muutu. Rules: tests/rules/sisainen.rules.test.js (v3.68). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const S = require('../lib/tm_sisainen.js'), M = require('../scripts/migroi_sisainen_jaksofokus.js'), JK = require('../lib/tm_jaksokooste.js');
const YP = (p, s) => S.tmSisainenYhdista(p, s, { kirjoitus: true });   // dual-read seuraa lippua (PR 1b-3): luku sisainen:stä vain lippu päällä
const SRC = lue('scripts/migroi_sisainen_jaksofokus.js');

const eiNull = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null));
const B_KENTAT = ['konsepti_avain', 'konsepti_nimi', 'konsepti_koodi', 'domeeni', 'alkoi', 'kesto_vk', 'tila', 'vaihtoehdot', 'osat', 'tukiosa', 'tukitavoitteet', 'reitti', 'viikon_osa', 'hylatty', 'joukkuejakso_viite', 'ohjelma', 'cue', 'osa_arviot', 'asetti', 'lahde', 'katselmus_alku', 'katselmus_loppu', 'laji', 'alku', 'viikot', 'osa_alueet'];
const OSAH = { y_h1: { a: { 'u-1': { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja', lause: 'Hyvä ote' } } } };
const OSAH_VK = { y_h1: { a: { '2026-W41': { 'u-1': { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja', lause: 'Viikon lause' } } } } };
const JF = { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', domeeni: 'teknis_taktinen', alkoi: '2026-10-01T08:00:00.000Z', kesto_vk: 6, tila: 'kaynnissa', lahde: 'valmentaja', asetti: { rooli: 'vp', pvm: '2026-10-01' },
  osat: [{ koodi: 'a', teksti: 'x' }], tukiosa: { alue: 'kestävyys' }, osa_arviot: { y_h1: { a: 2 } }, osa_havainnot: OSAH, osa_havainnot_vk: OSAH_VK, tavoite_tarkenteet: ['t'], onnistumiskriteeri: 'k', linkitetyt: ['l'], tavoite_alue: 'a', valitavoite_idx: 1, poikkeama: { syy: 'x' }, oma_jakso: { x: 1 } };
const HIS = { domeeni: 'teknis_taktinen', konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto', alkoi: '2026-10-01T08:00:00.000Z', paattyi: '2026-11-12', tulos: 'ok', lause: 'Pelaajalle näkyvä lause', lause_lahde: 'valmentaja', arvio_ennen: 1, arvio_jalkeen: 3, arvio_itse: 2, arvio_valmentaja: 3, arvio_vp: null,
  arvioija_rooli: 'valmentaja', kalibraatio_ero: 1, delta_mitattu: { ennen: 1, jalkeen: 2, muutos: 1 }, havainnot_vk: OSAH_VK, d3_snapshot: { focus: { valmentaja: 3, pelaaja: 4 } }, sitoumus_snapshot: { q1: 4, vahvistaja_uid: 'u-9' }, reitti: { loppu: 'jatkuu' } };

describe('rekisteri ja kenttälistat', () => {
  it('JAKSOFOKUS_A = rekisterin jaksofokus_sisainen-ryhmä (ilman "jaksofokus."-etuliitettä); HISTORIA_A = brieffin 11 kenttää; ryhmät lukukytketty mutta EI kirjoituskytketty', () => {
    expect(S.RYHMAT.jaksofokus_sisainen.kentat.map((k) => k.replace(/^jaksofokus\./, '')).sort()).toEqual(S.JAKSOFOKUS_A.slice().sort());
    expect(S.JAKSOFOKUS_A.slice().sort()).toEqual(['onnistumiskriteeri', 'linkitetyt', 'oma_jakso', 'osa_havainnot', 'osa_havainnot_vk', 'poikkeama', 'tavoite_alue', 'tavoite_tarkenteet', 'valitavoite_idx'].sort());
    expect(S.HISTORIA_A.slice().sort()).toEqual(['havainnot_vk', 'arvio_ennen', 'arvio_jalkeen', 'arvio_itse', 'arvio_valmentaja', 'arvio_vp', 'arvioija_rooli', 'kalibraatio_ero', 'delta_mitattu', 'd3_snapshot', 'sitoumus_snapshot'].sort());
    ['jaksofokus_sisainen', 'historia_sisainen'].forEach((r) => { expect(S.RYHMAT[r].luku).toBe(true); expect(S.RYHMAT[r].kytketty).toBe(false); });
    expect(S.tmSisainenKentat()).toEqual(['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm']);   // kirjoitusjako ennallaan (D3 vain)
  });
  it('B/C-kentät EIVÄT ole A-listalla (pelaajan Tänään lukee ne); asetti ja lahde jäävät pelaajadokumenttiin (PM 23.10.)', () => {
    B_KENTAT.forEach((k) => expect(S.JAKSOFOKUS_A, k).not.toContain(k)); ['asetti', 'lahde'].forEach((k) => expect(S.JAKSOFOKUS_A).not.toContain(k));
    ['lause', 'lause_lahde', 'tulos', 'reitti', 'ohjelma', 'media', 'domeeni', 'konsepti_nimi', 'paattyi', 'suljettu'].forEach((k) => expect(S.HISTORIA_A, k).not.toContain(k));
  });
});

describe('asetti / lahde: vain rooli, pvm ja lähdetyyppi (ei uid/email) → jäävät pelaajadokumenttiin', () => {
  it('kaikkien jaksofokuksen kirjoittajien tuottama asetti on { rooli, pvm }; lahde on tyyppimerkkijono; syötteen uid/email ei kulkeudu jaksofokukseen', () => {
    const lahdeTekstit = lue('lib/tm_jakso_malli.js') + lue('lib/tm_joukkuejakso.js');
    const asetti = [...lahdeTekstit.matchAll(/asetti *[:=] *(\{[^}]*\})/g)].map((m) => m[1]); expect(asetti.length).toBeGreaterThanOrEqual(2);
    asetti.forEach((a) => { expect(a).toMatch(/^\{ *rooli: *[^,]+, *pvm: *[^}]+\}$/); expect(a).not.toMatch(/uid|mail/i); });
    const lahteet = [...lahdeTekstit.matchAll(/\blahde: *'([a-z_]+)'/g)].map((m) => m[1]); lahteet.forEach((l) => expect(['valmentaja', 'joukkuejakso', 'seura', 'tm', 'oma']).toContain(l));
    expect(lue('lib/tm_jaksokortti.js')).toMatch(/jf\.asetti\.rooli/);   // lukija käyttää vain roolia + pvm:ää
  });
});

describe('jako ja yhdistys (pure)', () => {
  it('tmJaksofokusJaa: jokainen A-alikenttä → sisainen, kaikki B/C jää julkiseksi; syöte ennallaan; tyhjät/puuttuvat → sisainen null', () => {
    const kopio = JSON.stringify(JF), r = S.tmJaksofokusJaa(JF); expect(JSON.stringify(JF)).toBe(kopio);
    expect(Object.keys(r.sisainen).sort()).toEqual(S.JAKSOFOKUS_A.slice().sort()); S.JAKSOFOKUS_A.forEach((k) => expect(r.julkinen[k], k).toBeUndefined());
    ['konsepti_avain', 'konsepti_nimi', 'domeeni', 'alkoi', 'kesto_vk', 'tila', 'osat', 'tukiosa', 'osa_arviot', 'asetti', 'lahde'].forEach((k) => expect(r.julkinen[k], k).toEqual(JF[k]));
    expect(S.tmJaksofokusJaa({ konsepti_avain: 'x', oma_jakso: null })).toEqual({ julkinen: { konsepti_avain: 'x' }, sisainen: null }); expect(S.tmJaksofokusJaa(null)).toEqual({ julkinen: null, sisainen: null });
  });
  it('tmJaksofokusYhdista: sisainen voittaa kentittäin, vanha varalla; ilman jaksofokusta ei luoda uutta; syötteet ennallaan', () => {
    const julk = { konsepti_avain: 'x', osa_havainnot: { vanha: 1 }, linkitetyt: ['v'] }, sis = { osa_havainnot: { uusi: 2 } }, a = JSON.stringify(julk), b = JSON.stringify(sis);
    expect(S.tmJaksofokusYhdista(julk, sis)).toEqual({ konsepti_avain: 'x', osa_havainnot: { uusi: 2 }, linkitetyt: ['v'] }); expect(JSON.stringify(julk)).toBe(a); expect(JSON.stringify(sis)).toBe(b);
    expect(S.tmJaksofokusYhdista(null, sis)).toBeNull(); expect(S.tmJaksofokusYhdista(julk, null)).toBe(julk);
  });
  it('KIERTO: jaa → (julkinen, sisainen) → yhdistä = alkuperäinen (vanha muoto täsmälleen)', () => {
    const r = S.tmJaksofokusJaa(JF); expect(S.tmJaksofokusYhdista(r.julkinen, r.sisainen)).toEqual(JF);
    const h = S.tmHistoriaJaa(HIS); expect(S.tmHistoriaYhdista([h.julkinen], { [h.avain]: h.sisainen })[0]).toEqual(eiNull(HIS));   // null-arvoiset A-kentät eivät siirry (null = puuttuva; lukijat käyttävät != null)
  });
  it('historia-avain: <alkoi>_<konsepti_avain> ("." → ","), null kun alkoi/konsepti_avain puuttuu; todellinen tmHistoriaEntry-rivi jaetaan: A-osa sisainen:iin, lause + B/C jää', () => {
    expect(S.tmHistoriaAvain({ alkoi: '2026-10-01T08:00:00.000Z', konsepti_avain: 'oma:nopeus' })).toBe('2026-10-01T08:00:00,000Z_oma:nopeus'); expect(S.tmHistoriaAvain({ alkoi: '2026-10-01', konsepti_avain: 'x' })).toBe('2026-10-01_x');
    expect(S.tmHistoriaAvain({ konsepti_avain: 'x' })).toBeNull(); expect(S.tmHistoriaAvain({ alkoi: '2026-10-01' })).toBeNull(); expect(S.tmHistoriaAvain(null)).toBeNull();
    const rivi = JK.tmHistoriaEntry({ konsepti_avain: 'y_h1', konsepti_nimi: 'H', alkoi: '2026-10-01T08:00:00.000Z', paattyi: '2026-11-12', arvio_ennen: 1, arvio_jalkeen: 3, arvio_itse: 2, arvio_valmentaja: 3, arvioija_rooli: 'valmentaja', kalibraatio_ero: 1, havainnot_vk: OSAH_VK, tulos: 'ok' });
    const j = S.tmHistoriaJaa(Object.assign({}, rivi, { lause: 'Pelaajalle' })); expect(j.avain).toBe('2026-10-01T08:00:00,000Z_y_h1');
    S.HISTORIA_A.forEach((k) => expect(j.julkinen[k], k).toBeUndefined()); expect(j.julkinen).toMatchObject({ lause: 'Pelaajalle', tulos: 'ok', paattyi: '2026-11-12', konsepti_nimi: 'H', domeeni: 'teknis_taktinen' });
    expect(j.sisainen).toMatchObject({ arvio_ennen: 1, arvio_jalkeen: 3, arvio_itse: 2, arvio_valmentaja: 3, arvioija_rooli: 'valmentaja', kalibraatio_ero: 1, havainnot_vk: OSAH_VK });
  });
  it('tmHistoriaYhdista: osumaton/avaimeton rivi ennallaan; sisainen voittaa; ei-taulukko ennallaan', () => {
    const r1 = Object.assign({}, HIS), r2 = { konsepti_avain: 'x' }, his = { [S.tmHistoriaAvain(HIS)]: { arvio_itse: 5 } };
    const ul = S.tmHistoriaYhdista([r1, r2], his); expect(ul[0].arvio_itse).toBe(5); expect(ul[0].arvio_valmentaja).toBe(3); expect(ul[1]).toBe(r2); expect(r1.arvio_itse).toBe(2); expect(S.tmHistoriaYhdista(null, his)).toBeNull(); expect(S.tmHistoriaYhdista([r1], null)).toEqual([r1]);
  });
  it('tmSisainenYhdista: jaksofokus + historia + D3 yhdistyvät samalla kertaa; puuttuva sisainen → pelaaja ennallaan (dual-read varalla); d3-yhdistys säilyy', () => {
    const p = { id: 'p', jaksofokus: S.tmJaksofokusJaa(JF).julkinen, jaksofokus_historia: [S.tmHistoriaJaa(HIS).julkinen], d3_itsearvio: { pisteet: { focus: 4 }, pvm: '2026-10-20' } };
    const sis = { seuraId: 's', jaksofokus_sisainen: S.tmJaksofokusJaa(JF).sisainen, historia_sisainen: { [S.tmHistoriaAvain(HIS)]: S.tmHistoriaJaa(HIS).sisainen }, d3_viimeisin: { pisteet: { focus: { valmentaja: 3 } }, lahteet: ['valmentaja'], pvm: '2026-10-12' } };
    const y = YP(p, sis); expect(y.jaksofokus).toEqual(JF); expect(y.jaksofokus_historia[0].arvio_itse).toBe(2); expect(y.jaksofokus_historia[0].lause).toBe('Pelaajalle näkyvä lause'); expect(y.d3_viimeisin.pisteet.focus).toMatchObject({ valmentaja: 3, pelaaja: 4 });
    expect(S.tmSisainenYhdista(JSON.parse(JSON.stringify(Object.assign({}, p, { jaksofokus: JF, jaksofokus_historia: [HIS] }))), null).jaksofokus).toEqual(JF);   // vanha muoto ilman sisainen:ia = ennallaan
    expect(p.jaksofokus.osa_havainnot).toBeUndefined();   // syöte ei muuttunut
  });
});

describe('migraatio scripts/migroi_sisainen_jaksofokus.js (fake-Firestore; tuotantoon ei kosketa)', () => {
  function data() {
    return { 'seurat/sjk': {}, 'seurat/kpv': {},
      'seurat/sjk/pelaajat/a': { etunimi: 'Aatu', jaksofokus: JF, jaksofokus_historia: [HIS, { konsepti_avain: 'x', alkoi: '2026-09-01', arvio_itse: 1, lause: 'l' }] },
      'seurat/sjk/pelaajat/b': { etunimi: 'Bertta', jaksofokus: { konsepti_avain: 'y', domeeni: 'fyysinen', asetti: { rooli: 'vp', pvm: '2026-10-01' }, lahde: 'valmentaja' } },   // vain B/C → ei kopioitavaa
      'seurat/sjk/pelaajat/c': { etunimi: 'Cecil' },
      'seurat/sjk/pelaajat/d': { etunimi: 'Dani', jaksofokus: { konsepti_avain: 'y', osa_havainnot: OSAH, oma_jakso: { x: 1 } } }, 'seurat/sjk/pelaajat/d/sisainen/tiedot': { seuraId: 'sjk', jaksofokus_sisainen: { osa_havainnot: { uusin: 9 } }, d3_taso: 3 },   // sisainen voittaa osa_havainnot; oma_jakso puuttuu → kopioidaan
      'seurat/sjk/pelaajat/e': { etunimi: 'Eero', jaksofokus_historia: [{ konsepti_avain: 'z', arvio_itse: 2 }] },   // rivi ilman alkoi:a → ei avainta
      'seurat/kpv/pelaajat/f': { etunimi: 'Fanni', jaksofokus: { konsepti_avain: 'k', tavoite_tarkenteet: ['t'] } } };
  }
  it('DRY-RUN (oletus): ei kirjoita mitään; laskee; ei nimiä eikä id:itä tulosteessa', async () => {
    const { db, D, loki } = fakeDb(data()); const ennen = JSON.stringify([...D.entries()]), rivit = [];
    const y = await M.aja({ db, kirjoita: false, loki: (r) => rivit.push(r) });
    expect(y).toMatchObject({ seuraa: 2, pelaajia: 6, ei_a: 2, kopioi: 3, jo_siirretty: 0, ilman_avainta: 1, kirjoitettu: 0, rivia_ilman_avainta: 1, eroaa: 0, vanhentunut: 0 }); expect(y.jaksofokus_kenttia).toBe(9 + 1 + 1 + 1);   // PR 1b-3: d:n osa_havainnot täydennetään syvästi (+1), ei enää 'eroaa' expect(y.historia_rivia).toBe(2);
    expect(JSON.stringify([...D.entries()])).toBe(ennen); expect(loki.commits).toBe(0); expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Dani|Eero|Fanni|\/a\b/);
  });
  it('KIRJOITUS: kopioi sisainen:iin (+ seuraId); vanhat kentät JÄÄVÄT; asetti/lahde ei kopioida; sisainen voittaa; toinen ajo = 0 (idempotentti)', async () => {
    const { db, D } = fakeDb(data()); const y = await M.aja({ db, kirjoita: true, nytISO: '2026-10-23T10:00:00.000Z' }); expect(y.kirjoitettu).toBe(3);
    const a = D.get('seurat/sjk/pelaajat/a/sisainen/tiedot'); expect(a.seuraId).toBe('sjk'); expect(a.paivitetty).toBe('2026-10-23T10:00:00.000Z'); expect(Object.keys(a.jaksofokus_sisainen).sort()).toEqual(S.JAKSOFOKUS_A.concat(['jakso_avain']).sort()); expect(a.jaksofokus_sisainen.jakso_avain).toBe(JF.alkoi + '_y_h1');   // PR 1b-3: leima nykyiselle jaksolle
    expect(a.jaksofokus_sisainen).not.toHaveProperty('asetti'); expect(a.jaksofokus_sisainen).not.toHaveProperty('lahde'); expect(Object.keys(a.historia_sisainen).sort()).toEqual(['2026-09-01_x', '2026-10-01T08:00:00,000Z_y_h1']);
    expect(a.historia_sisainen['2026-10-01T08:00:00,000Z_y_h1']).toMatchObject({ arvio_itse: 2, kalibraatio_ero: 1, d3_snapshot: HIS.d3_snapshot }); expect(a.historia_sisainen['2026-10-01T08:00:00,000Z_y_h1']).not.toHaveProperty('arvio_vp'); expect(a.historia_sisainen['2026-09-01_x']).toEqual({ arvio_itse: 1 });
    expect(D.get('seurat/sjk/pelaajat/a').jaksofokus).toEqual(JF); expect(D.get('seurat/sjk/pelaajat/a').jaksofokus_historia[0]).toEqual(HIS);   // kopio, ei poisto
    expect(D.has('seurat/sjk/pelaajat/b/sisainen/tiedot')).toBe(false); expect(D.has('seurat/sjk/pelaajat/c/sisainen/tiedot')).toBe(false); expect(D.has('seurat/sjk/pelaajat/e/sisainen/tiedot')).toBe(false);
    const d = D.get('seurat/sjk/pelaajat/d/sisainen/tiedot'); expect(d.jaksofokus_sisainen.osa_havainnot).toEqual(Object.assign({ uusin: 9 }, OSAH));   // PR 1b-3: syvä täydennys — sisainen:n lehti säilyy, puuttuvat (vanhemmat) lehdet kopioidaan expect(d.jaksofokus_sisainen.oma_jakso).toEqual({ x: 1 }); expect(d.d3_taso).toBe(3);   // sisainen voitti, d3 koskematon
    expect(D.get('seurat/kpv/pelaajat/f/sisainen/tiedot')).toMatchObject({ seuraId: 'kpv', jaksofokus_sisainen: { tavoite_tarkenteet: ['t'] } });
    const y2 = await M.aja({ db, kirjoita: true }); expect(y2).toMatchObject({ kopioi: 0, kirjoitettu: 0, ilman_avainta: 1 }); expect(y2.jo_siirretty).toBe(3);
  });
  it('MIGRAATION JÄLKEEN dual-read palauttaa täsmälleen vanhan muodon (sisainen yhdistettynä julkiseen = alkuperäinen pelaajadokumentti)', async () => {
    const { db, D } = fakeDb(data()); await M.aja({ db, kirjoita: true }); const p = D.get('seurat/sjk/pelaajat/a'), s = D.get('seurat/sjk/pelaajat/a/sisainen/tiedot');
    const julkinen = Object.assign({}, p, { jaksofokus: S.tmJaksofokusJaa(p.jaksofokus).julkinen, jaksofokus_historia: p.jaksofokus_historia.map((r) => S.tmHistoriaJaa(r).julkinen) });
    const y = YP(julkinen, s); expect(y.jaksofokus).toEqual(p.jaksofokus); expect(y.jaksofokus_historia[0]).toEqual(eiNull(HIS)); expect(y.jaksofokus_historia[1]).toEqual(p.jaksofokus_historia[1]);
  });
  it('--seura rajaa; skriptin turvallisuus: dry-run oletuksena, KIRJOITA-vahvistus, ADC, require ei käynnistä ajoa, vain yksi set (merge), ei poistoa/updatea', async () => {
    const { db } = fakeDb(data()); expect((await M.aja({ db, seura: 'kpv' })).pelaajia).toBe(1);
    expect(SRC).toContain("argv.includes('--kirjoita')"); expect(SRC).toContain('Kirjoita KIRJOITA vahvistukseksi'); expect(SRC).toContain('credential.applicationDefault()'); expect(SRC).not.toMatch(/serviceAccount|\.json'\)|admin\.applicationDefault/);
    expect(SRC).toContain('require.main === module'); expect(SRC).not.toMatch(/\.delete\(|FieldValue|\.update\(/); expect((SRC.match(/b\.set\(/g) || []).length).toBe(1);
  });
});

describe('GREP-PORTTI: pelaajan ja vanhemman sovellukset (+ niiden libit) eivät viittaa siirrettäviin jaksofokus-A-polkuihin', () => {
  const A = /osa_havainnot|tavoite_tarkenteet|onnistumiskriteeri|havainnot_vk|d3_snapshot|sitoumus_snapshot|arvio_ennen|arvio_jalkeen|arvio_itse|arvio_valmentaja|arvio_vp|arvioija_rooli|kalibraatio_ero|delta_mitattu|\blinkitetyt\b|valitavoite_idx|\boma_jakso\b|\btavoite_alue\b|\.poikkeama\b|jaksofokus_sisainen|historia_sisainen/;
  for (const sivu of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Rekisterointi_Suostumus.html']) {
    it(sivu + ' ja sen lib-skriptit', () => {
      const h = lue(sivu); expect(h).not.toMatch(A); expect(h).not.toMatch(/lib\/tm_sisainen\.js|TM_SISAINEN/);
      const libit = [...h.matchAll(/<script src="(lib\/[^"?]+)/g)].map((m) => m[1]).concat(['harjoitelogiikka_v4.js'].filter(() => sivu.includes('Pelaaja')));
      libit.forEach((l) => { try { expect(lue(l), l).not.toMatch(A); } catch (e) { if (e.code === 'ENOENT') return; throw e; } });
    });
  }
});
