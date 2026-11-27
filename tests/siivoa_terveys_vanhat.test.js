/* Vaihe 1 / PR 2a (terveys) — scripts/siivoa_terveys_vanhat.js: dry-run oletuksena; poistaa vanhan terveyskentän VAIN kun sama arvo on sisainen/terveys:ssä (oikea terveysSeuraId), myös 'aktiivinen';
   eroavat ja jäänteet jäävät; deploy-varmistus (merkki + ≥ 1 h) pakollinen kirjoitukselle; ei nimiä eikä arvoja tulosteessa (paitsi --selita). Ajetaan VAIN fake-Firestorella. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const Z = require('../scripts/siivoa_terveys_vanhat.js'), S = require('../lib/tm_sisainen.js'), M = require('../scripts/migroi_sisainen_s4.js');
const SRC = readFileSync(new URL('../scripts/siivoa_terveys_vanhat.js', import.meta.url), 'utf8');
const DELETE = { __poista: true };
const OK = { ok: true, syy: null, tiedostot: [] };

const LOUKK = { kaytettavyys: 'loukkaantunut', loukkaantuminen_tyyppi: 'nilkka', loukkaantuminen_alue: 'Nilkka', loukkaantuminen_pvm: '2026-10-20', paluu_arvio: '2026-11-15' };
function data() {
  return { 'seurat/sjk': {}, 'seurat/kpv': {},
    // a: kaikki vanhat + sama terveys-dokumentissa → kaikki poistetaan
    'seurat/sjk/pelaajat/a': Object.assign({ etunimi: 'Aatu' }, LOUKK), 'seurat/sjk/pelaajat/a/sisainen/terveys': Object.assign({ terveysSeuraId: 'sjk', paivitetty: 'T' }, LOUKK),
    // b: ei vanhoja terveyskenttiä → ei kosketa
    'seurat/sjk/pelaajat/b': { etunimi: 'Bertta' },
    // c: vanhat kentät, EI terveys-dokumenttia → ei poisteta
    'seurat/sjk/pelaajat/c': { etunimi: 'Cecil', kaytettavyys: 'tauko' },
    // d: eroaa (paluu_arvio eri) → eroava jää, samat poistetaan
    'seurat/sjk/pelaajat/d': { etunimi: 'Dani', kaytettavyys: 'kuntoutuksessa', paluu_arvio: '2026-11-01' }, 'seurat/sjk/pelaajat/d/sisainen/terveys': { terveysSeuraId: 'sjk', kaytettavyys: 'kuntoutuksessa', paluu_arvio: '2026-12-01' },
    // e: terveys-dokumentti väärällä terveysSeuraId:llä → ei poisteta
    'seurat/sjk/pelaajat/e': { etunimi: 'Eero', kaytettavyys: 'aktiivinen' }, 'seurat/sjk/pelaajat/e/sisainen/terveys': { terveysSeuraId: 'kpv', kaytettavyys: 'aktiivinen' },
    // f (kpv): 'aktiivinen' molemmissa (poistetaan, PM 2.11.) + vanhat loukkaantumistiedot vain pelaajadokumentissa = jäänne (jää) + loukk-kenttä (lasketaan)
    'seurat/kpv/pelaajat/f': { etunimi: 'Fanni', kaytettavyys: 'aktiivinen', loukkaantuminen_alue: 'Polvi', loukk: 2 }, 'seurat/kpv/pelaajat/f/sisainen/terveys': { terveysSeuraId: 'kpv', kaytettavyys: 'aktiivinen' } };
}
describe('suunnittele (pure)', () => {
  it('poistettavat kentät = sisainen-rekisterin terveysryhmä (yksi lähde; sama kuin migraatio); muokattu/loukk eivät ole listalla', () => {
    expect(Z.KENTAT).toEqual(S.RYHMAT.terveys.kentat); expect(Z.KENTAT.slice().sort()).toEqual(['kaytettavyys', 'loukkaantuminen_alue', 'loukkaantuminen_pvm', 'loukkaantuminen_tyyppi', 'paluu_arvio']);
    expect(Z.KENTAT).not.toContain('muokattu'); expect(Z.KENTAT).not.toContain('loukk');
  });
  it('luokat: ei_terveys · poista (myös aktiivinen) · terveys_puuttuu (ei dok / väärä tai puuttuva terveysSeuraId) · eroaa · jäänne · osittain', () => {
    expect(Z.suunnittele({ nimi: 'x' }, null, 's').luokka).toBe('ei_terveys');
    expect(Z.suunnittele({ kaytettavyys: 'aktiivinen' }, { kaytettavyys: 'aktiivinen', terveysSeuraId: 's' }, 's')).toMatchObject({ luokka: 'poista', poista: ['kaytettavyys'] });
    expect(Z.suunnittele({ kaytettavyys: 'tauko' }, null, 's')).toMatchObject({ luokka: 'jatetaan', jata: { terveys_puuttuu: ['kaytettavyys'] } });
    expect(Z.suunnittele({ kaytettavyys: 'tauko' }, { kaytettavyys: 'tauko' }, 's').jata.terveys_puuttuu).toEqual(['kaytettavyys']);
    expect(Z.suunnittele({ kaytettavyys: 'tauko' }, { kaytettavyys: 'tauko', seuraId: 's' }, 's').jata.terveys_puuttuu).toEqual(['kaytettavyys']);   // seuraId ≠ terveysSeuraId
    const e = Z.suunnittele({ kaytettavyys: 'tauko' }, { kaytettavyys: 'loukkaantunut', terveysSeuraId: 's' }, 's'); expect(e).toMatchObject({ luokka: 'jatetaan', jata: { eroaa: ['kaytettavyys'] } }); expect(e.eroavat).toEqual([{ kentta: 'kaytettavyys', vanha: 'tauko', uusi: 'loukkaantunut' }]);
    expect(Z.suunnittele({ kaytettavyys: 'aktiivinen', paluu_arvio: 'x' }, { kaytettavyys: 'aktiivinen', terveysSeuraId: 's' }, 's')).toMatchObject({ luokka: 'osittain', poista: ['kaytettavyys'], jata: { jaanne: ['paluu_arvio'] } });
    expect(Z.suunnittele({ loukk: 0 }, null, 's')).toMatchObject({ luokka: 'ei_terveys', loukk: true });
  });
});
describe('aja', () => {
  it('DRY-RUN (oletus): ei kirjoita; laskee oikein; ei nimiä, ei id:itä, ei terveysarvoja tulosteessa', async () => {
    const { db, D, loki } = fakeDb(data()); const ennen = JSON.stringify([...D.entries()]); const rivit = [];
    const y = await Z.aja({ db, loki: (r) => rivit.push(r) });
    expect(y).toMatchObject({ seuraa: 2, pelaajia: 6, ei_terveys: 1, poista: 1, osittain: 2, jatetaan: 2, kenttia_poistetaan: 7, jaa_terveys_puuttuu: 2, jaa_eroaa: 1, jaa_jaanne: 1, loukk: 1, kirjoitettu: 0 });
    expect(y.kentat).toEqual({ kaytettavyys: 3, loukkaantuminen_tyyppi: 1, loukkaantuminen_alue: 1, loukkaantuminen_pvm: 1, paluu_arvio: 1 });
    expect(JSON.stringify([...D.entries()])).toBe(ennen); expect(loki.commits).toBe(0);
    expect(rivit.join('\n')).not.toMatch(/Aatu|Bertta|Cecil|Dani|Eero|Fanni|\/a\b|\/c\b|nilkka|Nilkka|Polvi|2026-1/);
  });
  it('KIRJOITUS: poistaa vain samat kentät; eroava, jäänne, loukk ja muut kentät jäävät; terveys-dokumentti koskematon; toinen ajo = 0 (idempotentti)', async () => {
    const { db, D } = fakeDb(data());
    const y = await Z.aja({ db, kirjoita: true, DELETE, deploy: OK }); expect(y.kirjoitettu).toBe(3);   // a, d, f
    const a = D.get('seurat/sjk/pelaajat/a'); Z.KENTAT.forEach((k) => expect(a[k], k).toBeUndefined()); expect(a.etunimi).toBe('Aatu');
    expect(D.get('seurat/sjk/pelaajat/a/sisainen/terveys')).toMatchObject(LOUKK);
    ['b', 'c', 'e'].forEach((x) => expect(D.get('seurat/sjk/pelaajat/' + x), x).toEqual(data()['seurat/sjk/pelaajat/' + x]));
    expect(D.get('seurat/sjk/pelaajat/d')).toEqual({ etunimi: 'Dani', paluu_arvio: '2026-11-01' });
    expect(D.get('seurat/kpv/pelaajat/f')).toEqual({ etunimi: 'Fanni', loukkaantuminen_alue: 'Polvi', loukk: 2 });
    const y2 = await Z.aja({ db, kirjoita: true, DELETE, deploy: OK }); expect(y2).toMatchObject({ poista: 0, osittain: 0, kenttia_poistetaan: 0, kirjoitettu: 0, jatetaan: 4 });
  });
  it('kirjoitus vaatii deploy-varmistuksen ja DELETE-sentinelin; --seura rajaa', async () => {
    await expect(Z.aja({ db: fakeDb(data()).db, kirjoita: true, DELETE })).rejects.toThrow(/deploy-varmistus/);
    await expect(Z.aja({ db: fakeDb(data()).db, kirjoita: true, DELETE, deploy: { ok: false, syy: 'merkki puuttuu' } })).rejects.toThrow(/merkki puuttuu/);
    await expect(Z.aja({ db: fakeDb(data()).db, kirjoita: true, deploy: OK })).rejects.toThrow('DELETE-sentinel');
    expect((await Z.aja({ db: fakeDb(data()).db, seura: 'kpv' })).pelaajia).toBe(1);
  });
  it('--listaa-id: jäljelle jäävät polut + kenttien nimet, ei arvoja; --selita: eroavat arvoineen (vain kun pyydetään)', async () => {
    const rivit = []; await Z.aja({ db: fakeDb(data()).db, listaaId: true, loki: (r) => rivit.push(r) }); const t = rivit.join('\n');
    expect(t).toContain('sjk/c (terveys_puuttuu:kaytettavyys)'); expect(t).toContain('sjk/d (eroaa:paluu_arvio)'); expect(t).toContain('kpv/f (jaanne:loukkaantuminen_alue loukk)'); expect(t).not.toMatch(/Polvi|2026-1|Cecil/);
    const s = []; await Z.aja({ db: fakeDb(data()).db, selita: true, loki: (r) => s.push(r) }); expect(s.join('\n')).toContain('sjk/d paluu_arvio: vanha "2026-11-01" → sisainen "2026-12-01"'); expect(s.join('\n')).not.toMatch(/Polvi/);
  });
  it('migraation jälkeen siivous poistaa kaiken; siivouksen jälkeen migraatio ei löydä kopioitavaa', async () => {
    const { db, D } = fakeDb({ 'seurat/s': {}, 'seurat/s/pelaajat/p': Object.assign({ etunimi: 'X' }, LOUKK) });
    await M.aja({ db, kirjoita: true, nytISO: '2026-11-02T10:00:00.000Z' }); expect(D.get('seurat/s/pelaajat/p/sisainen/terveys')).toMatchObject(Object.assign({ terveysSeuraId: 's' }, LOUKK));
    expect(await Z.aja({ db, kirjoita: true, DELETE, deploy: OK })).toMatchObject({ poista: 1, kirjoitettu: 1 }); expect(D.get('seurat/s/pelaajat/p')).toEqual({ etunimi: 'X' });
    expect(await M.aja({ db, kirjoita: true })).toMatchObject({ terveys_kopioi: 0 });
  });
});
describe('deploy-varmistus', () => {
  const NYT = Date.parse('2026-11-03T12:00:00Z');
  const vastaus = (teksti, lm, status = 200) => ({ ok: status === 200, status, text: async () => teksti, headers: { get: (h) => (h === 'last-modified' ? lm : null) } });
  const fetchKaikki = (teksti, lm) => async () => vastaus(teksti, lm);
  it('molemmat tuotantotiedostot: merkki + Last-Modified ≥ 1 h → ok', async () => {
    const haetut = []; const r = await Z.tarkistaDeploy({ nyt: NYT, fetch: async (u) => { haetut.push(u); return vastaus('x TERVEYS_VAIN_SISAINEN x', 'Tue, 03 Nov 2026 10:30:00 GMT'); } });
    expect(r.ok).toBe(true); expect(haetut.map((u) => u.split('?')[0])).toEqual(['https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html', 'https://terokoskela7-cmyk.github.io/talentmaster/lib/tm_sisainen.js']);
  });
  it('merkki puuttuu / alle 1 h / ei Last-Modified / HTTP-virhe / verkkovirhe → ei ok', async () => {
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: fetchKaikki('vanha sivu', 'Tue, 03 Nov 2026 08:00:00 GMT') })).syy).toMatch(/merkki TERVEYS_VAIN_SISAINEN puuttuu/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: fetchKaikki('TERVEYS_VAIN_SISAINEN', 'Tue, 03 Nov 2026 11:30:00 GMT') })).syy).toMatch(/vasta 30 min/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: fetchKaikki('TERVEYS_VAIN_SISAINEN', null) })).syy).toMatch(/Last-Modified puuttuu/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: async () => vastaus('', null, 404) })).syy).toMatch(/HTTP 404/);
    expect((await Z.tarkistaDeploy({ nyt: NYT, fetch: async () => { throw new Error('offline'); } })).syy).toMatch(/offline/);
  });
  it('merkki on repossa molemmissa tarkistettavissa tiedostoissa (muuten varmistus ei koskaan läpäisisi)', () => {
    Z.TARKISTETTAVAT.forEach((f) => expect(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), f).toContain(Z.MERKKI));
  });
});
describe('skriptin turvallisuus', () => {
  it('dry-run oletuksena; --kirjoita + KIRJOITA-vahvistus; deploy-varmistus ennen kirjoitusta; ADC; require ei käynnistä ajoa; vain poisto-sentinel kirjoitetaan', () => {
    expect(SRC).toContain("argv.includes('--kirjoita')"); expect(SRC).toContain('Kirjoita KIRJOITA vahvistukseksi'); expect(SRC).toContain('credential.applicationDefault()'); expect(SRC).not.toMatch(/serviceAccount|\.json'\)/);
    expect(SRC).toContain('if (KIRJOITA && !deploy.ok)'); expect(SRC).toContain("if (KIRJOITA && SELITA) throw");
    expect(SRC).toContain('require.main === module'); expect((SRC.match(/b\.update\(/g) || []).length).toBe(1); expect(SRC).not.toMatch(/\.set\(/);
  });
});
