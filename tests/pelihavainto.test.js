/**
 * VARTIJA · lib/tm_pelihavainto.js (Vaihe 1, CODE_TASK_PELIANALYTIIKKA_2026-09 §5.8).
 *
 * Lib on PUHDAS laskenta: kanoninen koordinaatisto, merkinnan arvo (uhka · puolustus · menetysriski · xG ·
 * juoksun potentiaali) ja §5.4:n yhteenveto AVAIMINA ja LUKUINA. Kayttoliittyma kaantaa avaimet, joten lib
 * ei saa sisaltaa nayttolauseita — se on tassa vartioitu erikseen.
 *
 * Kriittiset invariantit joita nama testit lukitsevat:
 *  · Tallennettu piste on AINA kanoninen { len, wid }. Naytto kaantyy puoliajan ja seisomapaikan mukaan,
 *    data ei koskaan. Kierto naytolle ja takaisin on haviota kaikissa neljassa yhdistelmassa.
 *  · xG:n maalin leveys tulee PELIMUOTOTAULUKOSTA. Pienkentan arvot ovat vahvistamatta → null, ei arvausta.
 *  · Tuntematon ika → 'u812' (tietoinen poikkeus tmAdarIkaTier-oletuksesta): lukuja ei nayteta vaaralle
 *    ikaryhmalle silloinkaan kun ikaa ei tiedeta.
 *  · "Eteni heti" mitataan UHKAPISTEINA (xtLuokka, raja 0,5), ei raa'alla xT-erotuksella.
 *  · Selvitys ei ole nimittajassa (oman boksin selvitys on usein oikea ratkaisu, §5.4.1).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const PH = vaadi('../lib/tm_pelihavainto.js');
const XT = vaadi('../lib/tm_xt.js');
const LAHDE = readFileSync(join(juuri, 'lib/tm_pelihavainto.js'), 'utf8');

/** xT-uhkapisteet kanonisessa pisteessa (sama polku kuin libilla, mutta suoraan xT:sta). */
function xtPisteissa(len, wid, pelimuoto) {
  const o = PH.phOptaksi({ len, wid });
  return XT.xtPisteet(XT.xtArvo(o.x, o.y, 'ylos', pelimuoto));
}
/** Kanoninen len, joka on m metrin paassa vastustajan maalista annetulla pelimuodolla. */
function lenMetreista(m, pituus) { return 100 * (1 - m / pituus); }

/* ── (1) Koordinaatit ─────────────────────────────────────────────────────────────────────── */
describe('(1) Kanoninen koordinaatisto', () => {
  it('kanoninen → Opta → kanoninen on haviota', () => {
    for (const p of [{ len: 0, wid: 0 }, { len: 70, wid: 30 }, { len: 100, wid: 100 }, { len: 12.5, wid: 87.5 }]) {
      const o = PH.phOptaksi(p);
      expect(PH.phKanoniseksi(o.x, o.y)).toEqual(p);
    }
  });

  it('Opta-muunnos on speksin mukainen: x = wid, y = 100 - len', () => {
    expect(PH.phOptaksi({ len: 80, wid: 25 })).toEqual({ x: 25, y: 20 });
  });

  it.each([
    [1, 'lahi'], [1, 'kauko'], [2, 'lahi'], [2, 'kauko'],
  ])('naytto ja takaisin: puoliaika %i, seisoo %s → sama kanoninen piste', (puoliaika, seisoo) => {
    const p = { len: 70, wid: 30 };
    const n = PH.phNaytolle(p, { puoliaika, seisoo });
    expect(PH.phNaytolta(n.x, n.y, { puoliaika, seisoo })).toEqual(p);
  });

  it('EI VACUOUS: kaikki nelja yhdistelmaa tuottavat eri nayttopisteen', () => {
    const p = { len: 70, wid: 30 };
    const setti = new Set([[1, 'lahi'], [1, 'kauko'], [2, 'lahi'], [2, 'kauko']]
      .map(([pa, s]) => JSON.stringify(PH.phNaytolle(p, { puoliaika: pa, seisoo: s }))));
    expect(setti.size).toBe(4);
  });

  it('hyokkayssuunta kaantyy 2. puoliajalla (pituusakseli peilautuu)', () => {
    const a = PH.phNaytolle({ len: 90, wid: 50 }, { puoliaika: 1, seisoo: 'lahi' });
    const b = PH.phNaytolle({ len: 90, wid: 50 }, { puoliaika: 2, seisoo: 'lahi' });
    expect(a.x).toBe(90);
    expect(b.x).toBe(10);
  });

  it('vyohyke palauttaa AVAIMIA, ei lauseita', () => {
    expect(PH.phVyohyke({ len: 90, wid: 80 })).toEqual({ kolmannes: 'hyokkays', kaista: 'oikea_laita' });
    expect(PH.phVyohyke({ len: 10, wid: 10 })).toEqual({ kolmannes: 'puolustus', kaista: 'vasen_laita' });
    expect(PH.phVyohyke({ len: 50, wid: 50 })).toEqual({ kolmannes: 'keski', kaista: 'keskusta' });
  });
});

/* ── (2) Ikatasot ─────────────────────────────────────────────────────────────────────────── */
describe('(2) Ikatasot ja lukujen nakyvyys', () => {
  it('tuntematon ika → u812 (tietoinen poikkeus)', () => {
    expect(PH.phIkataso(null)).toBe('u812');
    expect(PH.phIkataso(undefined)).toBe('u812');
  });

  it('ika → taso tmAdarIkaTier-taulukon mukaan', () => {
    expect(PH.phIkataso(9)).toBe('u812');
    expect(PH.phIkataso(12)).toBe('u812');
    expect(PH.phIkataso(13)).toBe('u1315');
    expect(PH.phIkataso(15)).toBe('u1315');
    expect(PH.phIkataso(16)).toBe('u16');
    expect(PH.phIkataso(18)).toBe('u16');
  });

  it('U8-12 ei nae lukuja, muut nakevat', () => {
    expect(PH.phNaytaLuvut('u812')).toBe(false);
    expect(PH.phNaytaLuvut('u1315')).toBe(true);
    expect(PH.phNaytaLuvut('u16')).toBe(true);
  });
});

/* ── (3) xG ───────────────────────────────────────────────────────────────────────────────── */
describe('(3) Maaliodotusarvo', () => {
  const PILKKU = { len: lenMetreista(11, 105), wid: 50 };

  it('11v11 rangaistuspiste ~ 0,43 esimerkkikertoimilla', () => {
    const r = PH.phXg(PILKKU, '11v11');
    expect(r.todennakoisyys).toBeCloseTo(0.43, 2);
    expect(r.etaisyys_m).toBeCloseTo(11, 6);
    expect(r.malli).toBe('xg_geom_v0_esimerkki');
  });

  it('oletusmalli on xg_geom_v0_esimerkki, eika xg_geom_v1:ta ole ennen kalibrointia', () => {
    expect(PH.PH_XG_OLETUS).toBe('xg_geom_v0_esimerkki');
    expect(Object.keys(PH.PH_XG_MALLIT)).toEqual(['xg_geom_v0_esimerkki']);
    expect(PH.PH_XG_MALLIT.xg_geom_v1).toBeUndefined();
  });

  it('tuntematon malli-id → null (ei kaadu)', () => {
    expect(PH.phXg(PILKKU, '11v11', 'xg_geom_v1')).toBeNull();
    expect(PH.phXg(PILKKU, '11v11', 'ei_ole_olemassa')).toBeNull();
  });

  it('monotoninen: lahempana > kauempana ja keskelta > sivusta', () => {
    const lahella = PH.phXg({ len: lenMetreista(8, 105), wid: 50 }, '11v11').todennakoisyys;
    const kaukana = PH.phXg({ len: lenMetreista(25, 105), wid: 50 }, '11v11').todennakoisyys;
    expect(lahella).toBeGreaterThan(kaukana);
    const keskelta = PH.phXg({ len: lenMetreista(12, 105), wid: 50 }, '11v11').todennakoisyys;
    const sivusta = PH.phXg({ len: lenMetreista(12, 105), wid: 12 }, '11v11').todennakoisyys;
    expect(keskelta).toBeGreaterThan(sivusta);
  });

  it('PIENKENTTA: maalin leveys vahvistamatta → null (ei arvausta)', () => {
    expect(PH.phMaalinLeveys('11v11')).toBe(7.32);
    expect(PH.phMaalinLeveys('8v8')).toBeNull();
    expect(PH.phMaalinLeveys('5v5')).toBeNull();
    expect(PH.phXg({ len: 80, wid: 50 }, '5v5')).toBeNull();
    expect(PH.phXg({ len: 80, wid: 50 }, '8v8')).toBeNull();
  });

  it('3v3 → null (xT/xG ei kaytossa)', () => {
    expect(PH.phXg({ len: 80, wid: 50 }, '3v3')).toBeNull();
  });
});

/* ── (4) Merkinnan arvo ───────────────────────────────────────────────────────────────────── */
describe('(4) Merkinnan arvo', () => {
  const syotto = (alku, loppu, perilla) => ({ id: 's1', tyyppi: 'syotto', alku, loppu, perilla });

  it('syotto perille = xt(loppu) - xt(alku) uhkapisteina', () => {
    const alku = { len: 50, wid: 50 }, loppu = { len: 85, wid: 50 };
    const a = PH.phArvo(syotto(alku, loppu, true), '11v11');
    expect(a.laji).toBe('uhka');
    expect(a.yksikko).toBe('uhkapisteet');
    expect(a.pisteet).toBeCloseTo(xtPisteissa(85, 50, '11v11') - xtPisteissa(50, 50, '11v11'), 6);
  });

  it('syotto EI perille ei ole uhkaa vaan menetysriski', () => {
    const a = PH.phArvo(syotto({ len: 50, wid: 50 }, { len: 85, wid: 50 }, false), '11v11');
    expect(a.laji).toBe('menetysriski');
  });

  it('puolustusarvo = menetysriskin peililuku samassa pisteessa', () => {
    const piste = { len: 30, wid: 45 };
    const o = PH.phOptaksi(piste);
    const peili = XT.xtMenetysriski(o.x, o.y, 'ylos', '11v11');
    const riisto = PH.phArvo({ id: 'r', tyyppi: 'riisto', piste }, '11v11');
    expect(riisto.laji).toBe('puolustus');
    expect(riisto.pisteet).toBe(peili.pisteet);
    expect(riisto.taso).toBe(peili.taso);
    // voitettu puolustus-1v1 arvotetaan samoin
    const ykkonen = PH.phArvo({ id: 'k', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'voitti', piste }, '11v11');
    expect(ykkonen.pisteet).toBe(peili.pisteet);
  });

  it('puolustusarvo on POSITIIVINEN (etumerkki ei kaanny)', () => {
    const a = PH.phArvo({ id: 'r', tyyppi: 'riisto', piste: { len: 20, wid: 50 } }, '11v11');
    expect(a.pisteet).toBeGreaterThan(0);
  });

  it('menetysriskin tasot: rajat 2 ja 5 uhkapistetta', () => {
    const taso = (len) => PH.phArvo({ id: 'm', tyyppi: 'menetys', piste: { len, wid: 50 } }, '11v11');
    const korkea = taso(15), kohonnut = taso(25), matala = taso(60);
    expect(korkea.pisteet).toBeGreaterThanOrEqual(XT.XT_RISKI_KORKEA);
    expect(korkea.taso).toBe('korkea');
    expect(kohonnut.pisteet).toBeGreaterThanOrEqual(XT.XT_RISKI_KOHONNUT);
    expect(kohonnut.pisteet).toBeLessThan(XT.XT_RISKI_KORKEA);
    expect(kohonnut.taso).toBe('kohonnut');
    expect(matala.pisteet).toBeLessThan(XT.XT_RISKI_KOHONNUT);
    expect(matala.taso).toBe('matala');
  });

  it('havitty hyokkays-1v1 on menetysriski, voitettu ei tuota arvoa', () => {
    const piste = { len: 40, wid: 50 };
    expect(PH.phArvo({ id: 'a', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ei_ohittanut', piste }, '11v11').laji)
      .toBe('menetysriski');
    expect(PH.phArvo({ id: 'b', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ohitti', piste }, '11v11')).toBeNull();
  });

  it('juoksu on potentiaalia, ei luotua uhkaa', () => {
    const a = PH.phArvo({ id: 'j', tyyppi: 'juoksu', alku: { len: 40, wid: 50 }, loppu: { len: 80, wid: 50 } }, '11v11');
    expect(a.laji).toBe('potentiaali');
    expect(a.pisteet).toBeGreaterThan(0);
  });

  it('eiSijaintia → EI arvoa (hetki-merkinta ei saa saada lukua)', () => {
    const m = { id: 'h', tyyppi: 'menetys', piste: { len: 20, wid: 50 }, eiSijaintia: true };
    expect(PH.phArvo(m, '11v11')).toBeNull();
    expect(PH.phArvo({ id: 'h2', tyyppi: 'hetki', t: 120 }, '11v11')).toBeNull();
  });

  it('3v3 → null kaikille merkinnoille', () => {
    expect(PH.phArvo({ id: 's', tyyppi: 'syotto', alku: { len: 40, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: true }, '3v3')).toBeNull();
  });

  it('PIENKENTTA: 8v8-piste samalla metrietaisyydella maalista = 11v11-arvo', () => {
    for (const m of [10, 20, 30]) {
      expect(xtPisteissa(lenMetreista(m, 60), 50, '8v8')).toBe(xtPisteissa(lenMetreista(m, 105), 50, '11v11'));
    }
  });
});

/* ── (5) Yhteenveto ───────────────────────────────────────────────────────────────────────── */
describe('(5) Yhteenveto ja siirtyma (§5.4 / §5.4.1)', () => {
  const dok = (merkinnat, lisa) => Object.assign({
    ottelu: { pelimuoto: '11v11' }, ikataso: 'u1315', merkinnat
  }, lisa || {});

  it('luvut ja ADAR-rivit ovat avaimia ja lukuja, ei lauseita', () => {
    const y = PH.phYhteenveto(dok([
      { id: '1', tyyppi: 'syotto', alku: { len: 40, wid: 50 }, loppu: { len: 75, wid: 50 }, perilla: true, skannasi: true },
      { id: '2', tyyppi: 'syotto', alku: { len: 60, wid: 50 }, loppu: { len: 80, wid: 50 }, perilla: false },
      { id: '3', tyyppi: 'kuljetus', alku: { len: 50, wid: 40 }, loppu: { len: 65, wid: 45 }, lopputuote: 'syotto', ohitus: true },
    ]));
    expect(y.luvut.syotot).toEqual({ perille: 1, yhteensa: 2 });
    expect(y.luvut.kuljetukset.n).toBe(1);
    expect(y.luvut.kuljetukset.lopputuotteet).toEqual({ syotto: 1 });
    expect(y.luvut.menetykset.n).toBe(1);
    expect(y.adar.ennenPalloa.skannasi).toEqual({ kylla: 1, yhteensa: 1 });
    expect(y.naytaLuvut).toBe(true);
  });

  it('1v1 hyokkays: ohitti + rikottiin + kuljetuksen ohitus matkalla', () => {
    const y = PH.phYhteenveto(dok([
      { id: '1', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ohitti', piste: { len: 60, wid: 50 } },
      { id: '2', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'rikottiin', piste: { len: 60, wid: 50 } },
      { id: '3', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ei_ohittanut', piste: { len: 60, wid: 50 } },
      { id: '4', tyyppi: 'kuljetus', alku: { len: 50, wid: 50 }, loppu: { len: 60, wid: 50 }, ohitus: true, lopputuote: 'sailyi' },
    ]));
    expect(y.luvut.ykkosetHyokkays).toEqual({ onnistui: 3, yritykset: 4 });
  });

  it('riistot: n = riistot + voitetut puolustus-1v1, puolustusarvo summautuu', () => {
    const piste = { len: 25, wid: 50 };
    const yksi = PH.phArvo({ id: 'x', tyyppi: 'riisto', piste }, '11v11').pisteet;
    const y = PH.phYhteenveto(dok([
      { id: '1', tyyppi: 'riisto', piste },
      { id: '2', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'voitti', piste },
      { id: '3', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'ohitettiin', piste },
    ]));
    expect(y.luvut.riistot.n).toBe(2);
    expect(y.luvut.riistot.puolustusarvo).toBeCloseTo(2 * yksi, 6);
    expect(y.luvut.ykkosetPuolustus).toEqual({ voitti: 1, kaikki: 2, viivytti: 0, ohitettiin: 1 });
  });

  it('siirtyma: sailyi / menetetty / eteni heti, ja SELVITYS ei ole nimittajassa', () => {
    const piste = { len: 25, wid: 50 };
    const y = PH.phYhteenveto(dok([
      // 1) riisto → syotto perille ja eteneva → sailyi + eteni heti
      { id: 'r1', tyyppi: 'riisto', piste, jatko: 'syotto' },
      { id: 'r1s', tyyppi: 'syotto', ketju: 'r1', alku: piste, loppu: { len: 80, wid: 50 }, perilla: true },
      // 2) riisto → syotto ei perille → menetys heti
      { id: 'r2', tyyppi: 'riisto', piste, jatko: 'syotto' },
      { id: 'r2s', tyyppi: 'syotto', ketju: 'r2', alku: piste, loppu: { len: 70, wid: 50 }, perilla: false },
      // 3) riisto → selvitys → ei nimittajaan
      { id: 'r3', tyyppi: 'riisto', piste, jatko: 'selvitys' },
      // 4) riisto → sailyi
      { id: 'r4', tyyppi: 'riisto', piste, jatko: 'sailyi' },
      // 5) riisto ilman jatkoa (aikaraja) → ei lasketa
      { id: 'r5', tyyppi: 'riisto', piste, jatko: null },
    ]));
    const s = y.luvut.siirtyma;
    expect(s.sailyi).toBe(2);
    expect(s.menetetty).toBe(1);
    expect(s.menetysHeti).toBe(1);
    expect(s.selvitys).toBe(1);
    expect(s.eteniHeti).toBe(1);
    expect(s.sailytysosuus).toBeCloseTo(2 / 3, 6);   // selvitys EI nimittajassa
  });

  it('"eteni heti" mitataan UHKAPISTEINA (xtLuokka, raja 0,5) eika raa\'alla xT-erotuksella', () => {
    const piste = { len: 25, wid: 50 };
    // Pieni siirto: raaka ΔxT on positiivinen mutta uhkapisteina alle 0,5 → EI "eteni heti".
    const pieni = [
      { id: 'a', tyyppi: 'riisto', piste, jatko: 'syotto' },
      { id: 'as', tyyppi: 'syotto', ketju: 'a', alku: piste, loppu: { len: 35, wid: 50 }, perilla: true },
    ];
    const delta = PH.phArvo(pieni[1], '11v11').pisteet;
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(0.5);
    expect(PH.phYhteenveto(dok(pieni)).luvut.siirtyma.eteniHeti).toBe(0);
  });

  it('siirtyman uhka laskee jokaisen ketjun jasenen KERRAN', () => {
    const piste = { len: 25, wid: 50 };
    const kuljetus = { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: piste, loppu: { len: 45, wid: 50 }, lopputuote: 'syotto' };
    const syotto = { id: 's', tyyppi: 'syotto', ketju: 'r', alku: { len: 45, wid: 50 }, loppu: { len: 80, wid: 50 }, perilla: true };
    const y = PH.phYhteenveto(dok([{ id: 'r', tyyppi: 'riisto', piste, jatko: 'kuljetus' }, kuljetus, syotto]));
    const odotettu = PH.phArvo(kuljetus, '11v11').pisteet + PH.phArvo(syotto, '11v11').pisteet;
    expect(y.luvut.siirtyma.uhka).toBeCloseTo(Math.round(odotettu * 10) / 10, 6);
  });

  it('luotu uhka: vain syotot perille ja kuljetukset; riistoista alkaneet eritellaan', () => {
    const piste = { len: 25, wid: 50 };
    const syotto = { id: 's', tyyppi: 'syotto', ketju: 'r', alku: piste, loppu: { len: 80, wid: 50 }, perilla: true };
    const vapaa = { id: 'v', tyyppi: 'syotto', alku: { len: 50, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: true };
    const juoksu = { id: 'j', tyyppi: 'juoksu', alku: { len: 40, wid: 50 }, loppu: { len: 90, wid: 50 } };
    const y = PH.phYhteenveto(dok([{ id: 'r', tyyppi: 'riisto', piste, jatko: 'syotto' }, syotto, vapaa, juoksu]));
    const a = PH.phArvo(syotto, '11v11').pisteet, b = PH.phArvo(vapaa, '11v11').pisteet;
    expect(y.luvut.luotuUhka.pisteet).toBeCloseTo(Math.round((a + b) * 10) / 10, 6);
    expect(y.luvut.luotuUhka.riistoista).toBeCloseTo(Math.round(a * 10) / 10, 6);
    expect(y.adar.ennenPalloa.juoksut).toBe(1);
  });

  it('xG summautuu laukauksista, pienkentalla laukaus ei tuota lukua', () => {
    const laukaus = { id: 'l', tyyppi: 'laukaus', piste: { len: lenMetreista(11, 105), wid: 50 }, tulos: 'torjuttu' };
    const y = PH.phYhteenveto(dok([laukaus]));
    expect(y.luvut.xg.laukauksia).toBe(1);
    expect(y.luvut.xg.summa).toBeCloseTo(0.43, 2);
    const pieni = PH.phYhteenveto(dok([laukaus], { ottelu: { pelimuoto: '5v5' } }));
    expect(pieni.luvut.xg.laukauksia).toBe(1);
    expect(pieni.luvut.xg.laskettu).toBe(0);
    expect(pieni.luvut.xg.summa).toBe(0);
  });

  it('menetykset: menetys + harhasyotto + havitty hyokkays-1v1, korkea riski eriteltyna', () => {
    const y = PH.phYhteenveto(dok([
      { id: '1', tyyppi: 'menetys', piste: { len: 15, wid: 50 } },                       // korkea
      { id: '2', tyyppi: 'syotto', alku: { len: 60, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: false },  // matala
      { id: '3', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ei_ohittanut', piste: { len: 80, wid: 50 } },
    ]));
    expect(y.luvut.menetykset.n).toBe(3);
    expect(y.luvut.menetykset.korkeallaRiskilla).toBe(1);
  });

  it('U8-12: luvut lasketaan mutta naytaLuvut on false (kayttoliittyma piilottaa)', () => {
    const y = PH.phYhteenveto(dok([{ id: '1', tyyppi: 'riisto', piste: { len: 30, wid: 50 } }], { ikataso: 'u812' }));
    expect(y.naytaLuvut).toBe(false);
    expect(y.luvut.riistot.n).toBe(1);
  });

  it('tyhja dokumentti ei kaada', () => {
    const y = PH.phYhteenveto({});
    expect(y.merkintoja).toBe(0);
    expect(y.luvut.siirtyma.sailytysosuus).toBeNull();
  });
});

/* ── (6) Lib on puhdas ────────────────────────────────────────────────────────────────────── */
describe('(6) Lib ei sisalla nayttotekstia eika DOMia', () => {
  /** Poistaa kommentit ja palauttaa merkkijonoliteraalit. */
  function literaalit(src) {
    const ilmanKommentteja = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const out = [];
    const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;
    let m;
    while ((m = re.exec(ilmanKommentteja))) out.push(m[1] != null ? m[1] : m[2]);
    return out;
  }

  it('ei a/o-umlautteja merkkijonoliteraaleissa (kommentit sallittuja)', () => {
    const osumat = literaalit(LAHDE).filter((s) => /[äöÄÖ]/.test(s));
    expect(osumat, 'nayttoteksti kuuluu kayttoliittymaan, ei libiin').toEqual([]);
  });

  it('EI VACUOUS: literaalien poimija loytaa oikeasti literaaleja', () => {
    expect(literaalit(LAHDE)).toContain('uhkapisteet');
    expect(literaalit("var a = 'käännös';").filter((s) => /[äö]/.test(s))).toHaveLength(1);
  });

  it('ei DOMia eika Firestorea', () => {
    for (const kielletty of ['document.', 'querySelector', 'innerHTML', 'firebase', '.collection(', 'localStorage']) {
      expect(LAHDE, 'lib ei saa koskea ' + kielletty).not.toContain(kielletty);
    }
  });

  it('kayttaa tm_xt.js:aa eika kopioi ruudukkoa', () => {
    expect(LAHDE).toContain("require('./tm_xt.js')");
    expect(LAHDE, 'xT-ruudukko kopioitiin').not.toContain('XT_RUUDUKKO');
  });

  it('dual export: module.exports + window', () => {
    expect(LAHDE).toContain('module.exports = TM_PELIHAVAINTO');
    expect(LAHDE).toContain('window.TM_PELIHAVAINTO = TM_PELIHAVAINTO');
  });
});
