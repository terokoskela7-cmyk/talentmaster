/* Vaihe 1 / PR 2a — scripts/siivoa_d3_vanhat.js: dry-run oletuksena; poistaa vanhat D3-kentät VAIN kun sama tieto on sisainen/tiedot:issa; ei sisainen:ia → ei poisteta (listataan); d3_itsearvio jää;
   idempotentti; ei henkilötietoja tulosteessa. Ajetaan VAIN fake-Firestorella (tuotantoon ei kosketa). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const Z = require('../scripts/siivoa_d3_vanhat.js'), S = require('../lib/tm_sisainen.js'), M = require('../scripts/migroi_sisainen_d3.js');
const SRC = readFileSync(new URL('../scripts/siivoa_d3_vanhat.js', import.meta.url), 'utf8');
const DELETE = { __poista: true };

const D3V = { pisteet: { focus: { valmentaja: 3, pelaaja: 4, avg: 3.5 }, resilience: { valmentaja: 2, vp: 4, avg: 2 } }, pvm: '2026-10-10', lahteet: ['valmentaja', 'pelaaja'] };
const KAIKKI = { d3_viimeisin: D3V, d3_taso: 3, d3_pvm: '2026-10-10', d3_varmuus: 'trianguloitu', d3_vp_pvm: '2026-10-11' };
function data() {
  return { 'seurat/sjk': {}, 'seurat/kpv': {},
    // a: kaikki vanhat kentät + sama sisainen:ssä → kaikki poistetaan; pelaajan oma osa (.pelaaja) siirtyy d3_itsearvio:ksi (ei d3_itsearvio:ta)
    'seurat/sjk/pelaajat/a': Object.assign({ etunimi: 'Aatu' }, KAIKKI), 'seurat/sjk/pelaajat/a/sisainen/tiedot': Object.assign({ seuraId: 'sjk' }, KAIKKI),
    // b: ei vanhaa D3:a (vain d3_itsearvio) → ei kosketa
    'seurat/sjk/pelaajat/b': { etunimi: 'Bertta', d3_itsearvio: { pisteet: { focus: 2 }, pvm: '2026-10-01' } },
    // c: vanhat kentät, EI sisainen-dokumenttia → ei poisteta
    'seurat/sjk/pelaajat/c': { etunimi: 'Cecil', d3_taso: 2, d3_viimeisin: D3V },
    // d: sisainen on, mutta eroaa (vanha kenttä uudempi/eri) → ei poisteta eroavaa; sama kenttä poistetaan (osittain)
    'seurat/sjk/pelaajat/d': { etunimi: 'Dani', d3_taso: 2, d3_pvm: '2026-10-05', d3_itsearvio: { pisteet: { focus: 5 }, pvm: '2026-10-02' } }, 'seurat/sjk/pelaajat/d/sisainen/tiedot': { seuraId: 'sjk', d3_taso: 4, d3_pvm: '2026-10-05' },
    // e: sisainen ilman seuraId:tä → ei turvallinen poistaa
    'seurat/sjk/pelaajat/e': { etunimi: 'Eero', d3_taso: 3 }, 'seurat/sjk/pelaajat/e/sisainen/tiedot': { d3_taso: 3 },
    // f (kpv): vain d3_vp_pvm, sama sisainen:ssä + d3_itsearvio jo olemassa → poistetaan, itsearvio ennallaan
    'seurat/kpv/pelaajat/f': { etunimi: 'Fanni', d3_vp_pvm: '2026-10-11', d3_itsearvio: { pisteet: { focus: 1 }, pvm: '2026-09-30' } }, 'seurat/kpv/pelaajat/f/sisainen/tiedot': { seuraId: 'kpv', d3_vp_pvm: '2026-10-11' } };
}
describe('suunnittele (pure)', () => {
  it('poistettavat kentät = sisainen-rekisterin d3-ryhmä (yksi lähde; sama kuin migraatio); d3_itsearvio ei ole listalla', () => {
    expect(Z.KENTAT).toEqual(S.RYHMAT.d3.kentat); expect(Z.KENTAT).toEqual(M.KENTAT); expect(Z.KENTAT).not.toContain('d3_itsearvio'); expect(Z.KENTAT.sort()).toEqual(['d3_pvm', 'd3_taso', 'd3_varmuus', 'd3_viimeisin', 'd3_vp_pvm']);
  });
  it('ei vanhoja kenttiä → ei_d3; sama sisainen:ssä → poista; ei sisainen:ia / ei seuraId / kenttä puuttuu sieltä → sisainen_puuttuu; eri arvo → eroaa; osittain', () => {
    expect(Z.suunnittele({ d3_itsearvio: { pisteet: {}, pvm: 'x' }, nimi: 'x' }, null, 'sjk').luokka).toBe('ei_d3');
    expect(Z.suunnittele({ d3_taso: 3 }, { d3_taso: 3, seuraId: 'sjk' }, 'sjk')).toMatchObject({ luokka: 'poista', poista: ['d3_taso'] });
    expect(Z.suunnittele({ d3_taso: 3 }, null, 'sjk')).toMatchObject({ luokka: 'jatetaan', poista: [], jata: { sisainen_puuttuu: ['d3_taso'], eroaa: [] } });
    expect(Z.suunnittele({ d3_taso: 3 }, { d3_taso: 3 }, 'sjk').luokka).toBe('jatetaan');   // seuraId puuttuu
    expect(Z.suunnittele({ d3_taso: 3 }, { d3_pvm: 'x', seuraId: 'sjk' }, 'sjk').jata.sisainen_puuttuu).toEqual(['d3_taso']);
    expect(Z.suunnittele({ d3_taso: 3 }, { d3_taso: 4, seuraId: 'sjk' }, 'sjk')).toMatchObject({ luokka: 'jatetaan', jata: { eroaa: ['d3_taso'] } });
    expect(Z.suunnittele({ d3_taso: 3, d3_pvm: 'a' }, { d3_taso: 4, d3_pvm: 'a', seuraId: 'sjk' }, 'sjk')).toMatchObject({ luokka: 'osittain', poista: ['d3_pvm'] });
  });
  it('syvä vertailu ei välitä avainjärjestyksestä (d3_viimeisin eri avainjärjestyksellä = sama)', () => {
    const a = { pisteet: { focus: { valmentaja: 3, avg: 3 } }, pvm: 'p', lahteet: ['valmentaja'] }, b = { lahteet: ['valmentaja'], pvm: 'p', pisteet: { focus: { avg: 3, valmentaja: 3 } } };
    expect(Z.suunnittele({ d3_viimeisin: a }, { d3_viimeisin: b, seuraId: 's' }, 's').poista).toEqual(['d3_viimeisin']);
  });
  it('itsearvio talteen: poistettavan d3_viimeisin:n pelaaja-osat → d3_itsearvio (vain jos sitä ei ole); ei .pelaaja-osia → ei itsearviota', () => {
    const a = Z.suunnittele(KAIKKI, KAIKKI && Object.assign({ seuraId: 'sjk' }, KAIKKI), 'sjk'); expect(a.itsearvio).toEqual({ pisteet: { focus: 4 }, pvm: '2026-10-10', jakso_alkoi: null });
    expect(Z.suunnittele(Object.assign({}, KAIKKI, { d3_itsearvio: { pisteet: { focus: 1 }, pvm: '2026-09-01' } }), Object.assign({ seuraId: 'sjk' }, KAIKKI), 'sjk').itsearvio).toBeNull();
    const v = { pisteet: { focus: { valmentaja: 3, avg: 3 } }, pvm: '2026-10-10' }; expect(Z.suunnittele({ d3_viimeisin: v }, { d3_viimeisin: v, seuraId: 's' }, 's').itsearvio).toBeNull();
  });
});
describe('aja', () => {
  it('DRY-RUN (oletus): ei kirjoita mitään; laskee oikein; ei nimiä eikä id:itä tulosteessa', async () => {
    const { db, D, loki } = fakeDb(data()); const ennen = JSON.stringify([...D.entries()]); const rivit = [];
    const y = await Z.aja({ db, kirjoita: false, loki: (r) => rivit.push(r) });
    expect(y).toMatchObject({ seuraa: 2, pelaajia: 6, ei_d3: 1, poista: 2, osittain: 1, jatetaan: 2, kenttia_poistetaan: 7, jaa_sisainen_puuttuu: 3, jaa_eroaa: 1, itsearvio_siirretaan: 1, kirjoitettu: 0 });
    expect(y.kentat).toEqual({ d3_viimeisin: 1, d3_taso: 1, d3_pvm: 2, d3_varmuus: 1, d3_vp_pvm: 2 });
    expect(JSON.stringify([...D.entries()])).toBe(ennen); expect(loki.commits).toBe(0); expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Dani|Eero|Fanni|\/a\b|\/c\b/);
  });
  it('KIRJOITUS: poistaa vain turvalliset kentät; d3_itsearvio jää (ja syntyy a:lle pelaajan vanhasta osasta); muut kentät ennallaan; toinen ajo = 0 (idempotentti)', async () => {
    const { db, D } = fakeDb(data());
    const y = await Z.aja({ db, kirjoita: true, DELETE }); expect(y.kirjoitettu).toBe(3);   // a, d, f
    const a = D.get('seurat/sjk/pelaajat/a'); ['d3_viimeisin', 'd3_taso', 'd3_pvm', 'd3_varmuus', 'd3_vp_pvm'].forEach((k) => expect(a[k], k).toBeUndefined()); expect(a.etunimi).toBe('Aatu'); expect(a.d3_itsearvio).toEqual({ pisteet: { focus: 4 }, pvm: '2026-10-10', jakso_alkoi: null });
    expect(D.get('seurat/sjk/pelaajat/a/sisainen/tiedot')).toMatchObject(KAIKKI);   // sisainen koskematon
    expect(D.get('seurat/sjk/pelaajat/b')).toEqual(data()['seurat/sjk/pelaajat/b']);   // ei vanhaa D3:a → ei kosketa
    expect(D.get('seurat/sjk/pelaajat/c')).toEqual(data()['seurat/sjk/pelaajat/c']);   // ei sisainen:ia → ei poisteta
    expect(D.get('seurat/sjk/pelaajat/e')).toEqual(data()['seurat/sjk/pelaajat/e']);   // sisainen ilman seuraId:tä → ei poisteta
    const d = D.get('seurat/sjk/pelaajat/d'); expect(d.d3_taso).toBe(2); expect(d.d3_pvm).toBeUndefined(); expect(d.d3_itsearvio).toEqual({ pisteet: { focus: 5 }, pvm: '2026-10-02' });   // eroava jäi, sama poistui, itsearvio ennallaan
    const f = D.get('seurat/kpv/pelaajat/f'); expect(f.d3_vp_pvm).toBeUndefined(); expect(f.d3_itsearvio).toEqual({ pisteet: { focus: 1 }, pvm: '2026-09-30' });
    const y2 = await Z.aja({ db, kirjoita: true, DELETE }); expect(y2).toMatchObject({ poista: 0, osittain: 0, kenttia_poistetaan: 0, kirjoitettu: 0 }); expect(y2.jatetaan).toBe(3);   // c, d (eroaa), e jäävät listalle
  });
  it('ei sisainen:ia → EI poisteta mitään (kaikki seuran pelaajat ilman sisainen-dokumentteja)', async () => {
    const { db, D } = fakeDb({ 'seurat/x': {}, 'seurat/x/pelaajat/p1': { d3_taso: 3, d3_viimeisin: D3V }, 'seurat/x/pelaajat/p2': { d3_varmuus: 'itsearvio' } });
    const ennen = JSON.stringify([...D.entries()]); const y = await Z.aja({ db, kirjoita: true, DELETE }); expect(y).toMatchObject({ poista: 0, kirjoitettu: 0, jatetaan: 2, jaa_sisainen_puuttuu: 3 }); expect(JSON.stringify([...D.entries()])).toBe(ennen);
  });
  it('--listaa-id tulostaa vain jäljelle jäävien dokumenttipolut (ei nimiä); ilman lippua ei id:itä; --seura rajaa; kirjoitus ilman DELETE-sentinelia kaatuu', async () => {
    const { db } = fakeDb(data()), rivit = []; await Z.aja({ db, listaaId: true, loki: (r) => rivit.push(r) }); const t = rivit.join('\n'); expect(t).toContain('sjk/c (sisainen_puuttuu:'); expect(t).toContain('sjk/d (eroaa:d3_taso)'); expect(t).not.toMatch(/Cecil|Dani/);
    expect((await Z.aja({ db: fakeDb(data()).db, seura: 'kpv' })).pelaajia).toBe(1); await expect(Z.aja({ db: fakeDb(data()).db, kirjoita: true })).rejects.toThrow('DELETE-sentinel');
  });
  it('rinnakkaisuus migraation kanssa: migraation jälkeinen tila (sama sisainen) → siivous poistaa kaiken; siivouksen jälkeen migraatio ei löydä kopioitavaa vanhoista kentistä', async () => {
    const { db, D } = fakeDb({ 'seurat/s': {}, 'seurat/s/pelaajat/p': Object.assign({}, KAIKKI) });
    await M.aja({ db, kirjoita: true, nytISO: '2026-10-22T10:00:00.000Z' }); const z = await Z.aja({ db, kirjoita: true, DELETE }); expect(z).toMatchObject({ poista: 1, kirjoitettu: 1 });
    expect(D.get('seurat/s/pelaajat/p').d3_viimeisin).toBeUndefined(); const m2 = await M.aja({ db, kirjoita: true }); expect(m2).toMatchObject({ kopioi: 0, kirjoitettu: 0, ei_d3: 1 });
  });
});
describe('skriptin turvallisuus', () => {
  it('dry-run oletuksena; kirjoitus vain --kirjoita + KIRJOITA-vahvistus; ADC (ei palveluavainta); require ei käynnistä ajoa; vain poisto-sentinel + d3_itsearvio kirjoitetaan', () => {
    expect(SRC).toContain("argv.includes('--kirjoita')"); expect(SRC).toContain('Kirjoita KIRJOITA vahvistukseksi'); expect(SRC).toContain('credential.applicationDefault()'); expect(SRC).not.toMatch(/serviceAccount|\.json'\)|admin\.applicationDefault/);
    expect(SRC).toContain('require.main === module'); expect((SRC.match(/b\.update\(/g) || []).length).toBe(1); expect(SRC).not.toMatch(/\.delete\(\)\s*;|\.set\(/);   // FieldValue.delete() vain mainissa sentinelina; ei set-kirjoituksia
  });
  it('ei kirjoita sisainen-dokumenttiin eikä muihin pelaajakenttiin: päivitys sisältää vain d3-kentät + d3_itsearvio', async () => {
    const { db, D } = fakeDb(data()); const ennen = JSON.parse(JSON.stringify([...D.entries()].filter(([k]) => /sisainen/.test(k)))); await Z.aja({ db, kirjoita: true, DELETE });
    expect(JSON.parse(JSON.stringify([...D.entries()].filter(([k]) => /sisainen/.test(k))))).toEqual(ennen);
    const a = D.get('seurat/sjk/pelaajat/a'); expect(Object.keys(a).sort()).toEqual(['d3_itsearvio', 'etunimi']);
  });
});
