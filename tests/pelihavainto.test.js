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

  /* K7a: VIISI kaistaa mockupin rajoilla (25/40/60/75) — puolikaista on taktisessa puheessa oma
     paikkansa. K6: rajatapaukset lukitaan, jottei raja liiku huomaamatta. */
  it.each([
    [0, 'vasen_laita'], [24.9, 'vasen_laita'], [25, 'vasen_puolikaista'], [39.9, 'vasen_puolikaista'],
    [40, 'keskusta'], [59.9, 'keskusta'], [60, 'oikea_puolikaista'], [74.9, 'oikea_puolikaista'],
    [75, 'oikea_laita'], [100, 'oikea_laita'],
  ])('kaistaraja wid %s → %s', (wid, kaista) => {
    expect(PH.phVyohyke({ len: 50, wid }).kaista).toBe(kaista);
  });

  /* K6: naytto kaantaa leveysakselin seisomapaikan mukaan (mockupin flipY). Jos lahi/kauko kaantyy
     vaarin, merkinnat peilautuvat kentan vaaralle laidalle. */
  it('seisomapaikka kaantaa leveysakselin oikein (puoliaika 1)', () => {
    expect(PH.phNaytolle({ len: 50, wid: 10 }, { puoliaika: 1, seisoo: 'lahi' }).y).toBe(10);
    expect(PH.phNaytolle({ len: 50, wid: 10 }, { puoliaika: 1, seisoo: 'kauko' }).y).toBe(90);
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

  /* K6: harhasyotto menetetaan sinne MINNE se meni — vastustaja saa pallon loppupisteesta.
     Sama kuin mockupin xtOpp(e.to). Alkupisteesta laskettu riski olisi eri luku. */
  it('harhasyoton riski lasketaan LOPPUpisteesta, ei alkupisteesta', () => {
    const a = PH.phArvo(syotto({ len: 20, wid: 50 }, { len: 60, wid: 50 }, false), '11v11');
    const loppuRiski = PH.phArvo({ id: 'm', tyyppi: 'menetys', piste: { len: 60, wid: 50 } }, '11v11');
    const alkuRiski = PH.phArvo({ id: 'm', tyyppi: 'menetys', piste: { len: 20, wid: 50 } }, '11v11');
    expect(a.pisteet).toBe(loppuRiski.pisteet);
    expect(a.pisteet, 'EI VACUOUS: alku ja loppu antavat eri riskin').not.toBe(alkuRiski.pisteet);
  });

  /* K6: perilla === null tarkoittaa "ei kirjattu", ja se lasketaan PERILLE (§5.4.1: `!== false`).
     TIETOINEN VALINTA: kirjaamaton syotto ei saa nayttaa menetyksena. */
  it('perilla null lasketaan perille (tietoinen valinta)', () => {
    const a = PH.phArvo(syotto({ len: 50, wid: 50 }, { len: 80, wid: 50 }, null), '11v11');
    expect(a.laji).toBe('uhka');
    const y = PH.phYhteenveto({
      ottelu: { pelimuoto: '11v11' },
      merkinnat: [{ id: '1', tyyppi: 'syotto', alku: { len: 50, wid: 50 }, loppu: { len: 80, wid: 50 }, perilla: null }]
    });
    expect(y.luvut.syotot).toEqual({ perille: 1, yhteensa: 1 });
    expect(y.luvut.menetykset.n).toBe(0);
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

  /* K1: lib ja kenttatyokalu EIVAT saa erota tulos-enumista. Jos tallentaja kirjoittaisi 'ei' ja lib
     odottaa 'ei_ohittanut', havitty 1v1 katoaisi menetyksista ja riskista — se nakyisi vain yrityksissa. */
  it('K1 · tulos-enum on lukittu ja vietavissa (lib ja tallentaja samasta listasta)', () => {
    expect(PH.PH_KAKSINPELI_TULOS).toEqual({
      hyokkays: ['ohitti', 'rikottiin', 'ei_ohittanut'],
      puolustus: ['voitti', 'viivytti', 'ohitettiin']
    });
    expect(PH.PH_1V1_ONNISTUI).toEqual(['ohitti', 'rikottiin']);
  });

  it.each([
    ['hyokkays', 'ohitti', 'onnistui'],
    ['hyokkays', 'rikottiin', 'onnistui'],
    ['hyokkays', 'ei_ohittanut', 'havio'],
    ['puolustus', 'voitti', 'onnistui'],
    ['puolustus', 'viivytti', 'neutraali'],
    ['puolustus', 'ohitettiin', 'havio'],
  ])('K1 · %s/%s luokitellaan (%s)', (rooli, tulos, luokka) => {
    const piste = { len: 40, wid: 50 };
    const dok = { ottelu: { pelimuoto: '11v11' }, ikataso: 'u16', merkinnat: [{ id: '1', tyyppi: 'kaksinpeli', rooli, tulos, piste }] };
    const y = PH.phYhteenveto(dok);
    const arvo = PH.phArvo(dok.merkinnat[0], '11v11');
    if (rooli === 'hyokkays') {
      expect(y.luvut.ykkosetHyokkays.yritykset, 'tunnettu tulos puuttui yrityksista').toBe(1);
      expect(y.luvut.ykkosetHyokkays.onnistui).toBe(luokka === 'onnistui' ? 1 : 0);
      expect(y.luvut.menetykset.n).toBe(luokka === 'havio' ? 1 : 0);
      if (luokka === 'havio') expect(arvo.laji).toBe('menetysriski');
    } else {
      expect(y.luvut.ykkosetPuolustus.kaikki).toBe(1);
      expect(y.luvut.riistot.n).toBe(luokka === 'onnistui' ? 1 : 0);
      if (luokka === 'havio') expect(arvo.laji).toBe('tilanteen_vaara');
    }
  });

  it('K1 · tuntematon tulos (esim. mockupin vanha "ei") EI kelpaa yritykseksi', () => {
    const y = PH.phYhteenveto({
      ottelu: { pelimuoto: '11v11' }, ikataso: 'u16',
      merkinnat: [{ id: '1', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ei', piste: { len: 40, wid: 50 } }]
    });
    // Paatos: tuntematon arvo jaa POIS yrityksista — mieluummin puuttuu kuin vaaristaa suhdelukua.
    expect(y.luvut.ykkosetHyokkays).toEqual({ onnistui: 0, yritykset: 0 });
    expect(y.luvut.menetykset.n).toBe(0);
  });

  it('K7b · ohitetuksi tuleminen on tilanteen_vaara, ei menetysriski', () => {
    const piste = { len: 25, wid: 50 };
    const a = PH.phArvo({ id: 'x', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'ohitettiin', piste }, '11v11');
    const peili = PH.phArvo({ id: 'm', tyyppi: 'menetys', piste }, '11v11');
    expect(a.laji).toBe('tilanteen_vaara');
    expect(a.pisteet).toBe(peili.pisteet);
    expect(a.taso).toBe(peili.taso);
    // EI summaudu menetyksiin (pallo ei vaihtanut omistajaa)
    const y = PH.phYhteenveto({ ottelu: { pelimuoto: '11v11' }, merkinnat: [{ id: 'x', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'ohitettiin', piste }] });
    expect(y.luvut.menetykset.n).toBe(0);
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
    expect(y.merkintoja).toBe(3);
    expect(y.merkintojaKaikki).toBe(3);
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

  /* K8 · KETJU ON MONITASOINEN. Kenttatyokalu tuottaa riisto → kuljetus → syotto niin, etta SYOTON
     ketju osoittaa KULJETUKSEEN (askCarryEnd → waitFor(e.to, e.id, 'syotto')), ei riistoon. Tama testi
     oli aiemmin litteana (molemmat ketju:'r'), jollaista ketjua kenttatyokalu ei koskaan tuota — siksi
     se ei huomannut, etta lib luki vain suorat lapset ja pudotti syoton uhkasummasta. */
  it('K8 · siirtyman uhka kulkee koko ketjun lapi (riisto → kuljetus → syotto)', () => {
    const piste = { len: 25, wid: 50 };
    const kuljetus = { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: piste, loppu: { len: 45, wid: 50 }, lopputuote: 'syotto' };
    const syotto = { id: 's', tyyppi: 'syotto', ketju: 'k', alku: { len: 45, wid: 50 }, loppu: { len: 85, wid: 50 }, perilla: true };
    const y = PH.phYhteenveto(dok([{ id: 'r', tyyppi: 'riisto', piste, jatko: 'kuljetus' }, kuljetus, syotto]));
    const k = PH.phArvo(kuljetus, '11v11').pisteet, s = PH.phArvo(syotto, '11v11').pisteet;
    expect(s, 'EI VACUOUS: lastenlapsen uhka on selvasti suurempi kuin suoran lapsen').toBeGreaterThan(k);
    expect(y.luvut.siirtyma.uhka).toBeCloseTo(Math.round((k + s) * 10) / 10, 6);
    expect(y.luvut.luotuUhka.riistoista).toBeCloseTo(Math.round((k + s) * 10) / 10, 6);
  });

  it('K8 · "eteni heti" arvioidaan ENSIMMAISESTA teosta (suora lapsi), ei lastenlapsesta', () => {
    const piste = { len: 25, wid: 50 };
    // kuljetus alle kynnyksen (0,4), syotto selvasti yli — jos lastenlapsi arvioisi, eteniHeti olisi 1
    const kuljetus = { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: piste, loppu: { len: 45, wid: 50 }, lopputuote: 'syotto' };
    const syotto = { id: 's', tyyppi: 'syotto', ketju: 'k', alku: { len: 45, wid: 50 }, loppu: { len: 85, wid: 50 }, perilla: true };
    expect(PH.phArvo(kuljetus, '11v11').pisteet).toBeLessThan(0.5);
    expect(PH.phArvo(syotto, '11v11').pisteet).toBeGreaterThan(0.5);
    const y = PH.phYhteenveto(dok([{ id: 'r', tyyppi: 'riisto', piste, jatko: 'kuljetus' }, kuljetus, syotto]));
    expect(y.luvut.siirtyma.eteniHeti).toBe(0);
    expect(y.luvut.siirtyma.sailyi).toBe(1);
  });

  /* K8 · eka() saa katsoa VAIN suoraa lasta. `jatko` on korjattava kentta (§5.2), joten dokumentissa voi
     olla riisto jonka jatko on 'syotto' mutta ketju alkaa kuljetuksella — silloin suoraa syottoa EI ole ja
     kirjaus on KESKEN. Jos eka() ottaisi minka tahansa jalkelaisen, siirtyma arvioituisi lastenlapsen
     (ison etenevan syoton) perusteella ja nayttaisi onnistuneelta. */
  it('K8 · eka() ei arvioi lastenlapsesta (jatko syotto, ketjussa vain kuljetus + sen syotto)', () => {
    const piste = { len: 25, wid: 50 };
    const y = PH.phYhteenveto(dok([
      { id: 'r', tyyppi: 'riisto', piste, jatko: 'syotto' },
      { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: piste, loppu: { len: 45, wid: 50 }, lopputuote: 'syotto' },
      { id: 's', tyyppi: 'syotto', ketju: 'k', alku: { len: 45, wid: 50 }, loppu: { len: 85, wid: 50 }, perilla: true }
    ]));
    expect(y.luvut.siirtyma.kesken, 'lastenlapsi arvioi siirtyman').toBe(1);
    expect(y.luvut.siirtyma.sailyi).toBe(0);
    expect(y.luvut.siirtyma.eteniHeti).toBe(0);
    // uhkasumma kulkee silti koko ketjun lapi
    expect(y.luvut.siirtyma.uhka).toBeGreaterThan(9);
  });

  it('K8 · ketjun kuljetus paattyy menetykseen: menetetty 1 eika menetys tuplaannu', () => {
    const piste = { len: 25, wid: 50 };
    const y = PH.phYhteenveto(dok([
      { id: 'r', tyyppi: 'riisto', piste, jatko: 'kuljetus' },
      { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: piste, loppu: { len: 40, wid: 50 }, lopputuote: 'menetys' },
      { id: 'm', tyyppi: 'menetys', ketju: 'k', piste: { len: 40, wid: 50 } }
    ]));
    expect(y.luvut.siirtyma.menetetty).toBe(1);
    expect(y.luvut.siirtyma.menetysHeti).toBe(1);
    expect(y.luvut.siirtyma.sailyi).toBe(0);
  });

  it('K8 · 1v1 ohitti → kuljetus (ohitus) → syotto: yksi yritys, ei tuplausta syvemmalta', () => {
    const piste = { len: 60, wid: 50 };
    const y = PH.phYhteenveto(dok([
      { id: 'k1', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ohitti', piste },
      { id: 'd', tyyppi: 'kuljetus', ketju: 'k1', ohitus: true, alku: piste, loppu: { len: 72, wid: 50 }, lopputuote: 'syotto' },
      { id: 's', tyyppi: 'syotto', ketju: 'd', alku: { len: 72, wid: 50 }, loppu: { len: 88, wid: 50 }, perilla: true }
    ]));
    expect(y.luvut.ykkosetHyokkays).toEqual({ onnistui: 1, yritykset: 1 });
    expect(y.merkintoja, 'ketjun jasenet tuplasivat tilannelaskurin').toBe(1);
  });

  it('K8 · syklinen ketju ei jaa silmukkaan', () => {
    const piste = { len: 40, wid: 50 };
    const y = PH.phYhteenveto(dok([
      { id: 'a', tyyppi: 'kuljetus', ketju: 'b', alku: piste, loppu: { len: 55, wid: 50 } },
      { id: 'b', tyyppi: 'kuljetus', ketju: 'a', alku: piste, loppu: { len: 55, wid: 50 } }
    ]));
    expect(y.merkintoja).toBe(0);              // molemmilla on ketju → ei juuria
    expect(y.merkintojaKaikki).toBe(2);
    expect(y.luvut.luotuUhka.riistoista).toBe(0);
  });

  it('K8 · rikkinainen ketjuviittaus ei kaada', () => {
    const y = PH.phYhteenveto(dok([
      { id: 's', tyyppi: 'syotto', ketju: 'ei_ole', alku: { len: 40, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: true }
    ]));
    expect(y.luvut.syotot.perille).toBe(1);
    expect(y.luvut.luotuUhka.riistoista).toBe(0);
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

  /* K2: ketjuton jatko on KESKEN, ei menetys — valmentaja napautti mutta ei ehtinyt pyyhkaista. */
  it.each(['syotto', 'kuljetus'])('K2 · ketjuton jatko %s → kesken, ei menetys', (jatko) => {
    const y = PH.phYhteenveto(dok([{ id: 'r', tyyppi: 'riisto', piste: { len: 25, wid: 50 }, jatko }]));
    const s = y.luvut.siirtyma;
    expect(s.kesken).toBe(1);
    expect(s.menetetty).toBe(0);
    expect(s.menetysHeti).toBe(0);
    expect(s.sailytysosuus, 'keskenerainen kirjaus vaaristi sailytysosuutta').toBeNull();
  });

  /* K3: "ohitti matkalla" on saman 1v1-ohituksen jatke, ei uusi yritys. */
  it('K3 · ohitus matkalla EI tuplaa 1v1-ketjun ohitusta', () => {
    const piste = { len: 60, wid: 50 };
    const y = PH.phYhteenveto(dok([
      { id: 'k1', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ohitti', piste },
      { id: 'k1d', tyyppi: 'kuljetus', ketju: 'k1', ohitus: true, alku: piste, loppu: { len: 75, wid: 50 }, lopputuote: 'sailyi' }
    ]));
    expect(y.luvut.ykkosetHyokkays).toEqual({ onnistui: 1, yritykset: 1 });
  });

  it('K3 · ketjuton ohitus matkalla lasketaan edelleen omana yrityksena', () => {
    const y = PH.phYhteenveto(dok([
      { id: 'd', tyyppi: 'kuljetus', ohitus: true, alku: { len: 50, wid: 50 }, loppu: { len: 65, wid: 50 }, lopputuote: 'sailyi' }
    ]));
    expect(y.luvut.ykkosetHyokkays).toEqual({ onnistui: 1, yritykset: 1 });
  });

  /* K4: tilannelaskuri laskee JUURET. Ketjun jasenet eivat tuplaa sita, ja hetket (eiSijaintia)
     kuuluvat lukumaariin vaikka arvoa ei lasketa. */
  it('K4 · merkintoja = juuret (ketju ei tuplaa, eiSijaintia lasketaan)', () => {
    const piste = { len: 60, wid: 50 };
    const ketjussa = PH.phYhteenveto(dok([
      { id: 'k1', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ohitti', piste },
      { id: 'k1d', tyyppi: 'kuljetus', ketju: 'k1', alku: piste, loppu: { len: 75, wid: 50 }, lopputuote: 'sailyi' }
    ]));
    expect(ketjussa.merkintoja).toBe(1);
    expect(ketjussa.merkintojaKaikki).toBe(2);
    const hetket = PH.phYhteenveto(dok([
      { id: 'h1', tyyppi: 'hetki', t: 60, eiSijaintia: true },
      { id: 'h2', tyyppi: 'hetki', t: 120, eiSijaintia: true }
    ]));
    expect(hetket.merkintoja, 'hetket katosivat tilannelaskurista').toBe(2);
  });

  /* K5: xG-malli tulee DOKUMENTIN tasolta, ei merkinnalta, ja raportoidaan KAYTETTY id. */
  it('K5 · dokumentin xG-malli valitaan ja raportoidaan', () => {
    const laukaus = { id: 'l', tyyppi: 'laukaus', piste: { len: lenMetreista(11, 105), wid: 50 } };
    const oletus = PH.phYhteenveto(dok([laukaus]));
    expect(oletus.malli.xg).toBe('xg_geom_v0_esimerkki');
    expect(oletus.luvut.xg.laskettu).toBe(1);

    const tunnettu = PH.phYhteenveto(dok([laukaus], { malli: { xg: 'xg_geom_v0_esimerkki' } }));
    expect(tunnettu.malli.xg).toBe('xg_geom_v0_esimerkki');

    const tuntematon = PH.phYhteenveto(dok([laukaus], { malli: { xg: 'xg_geom_v1' } }));
    expect(tuntematon.malli.xg, 'kaytetty id ei nakynyt').toBe('xg_geom_v1');
    expect(tuntematon.luvut.xg.laskettu, 'tuntematon malli laski silti').toBe(0);
    expect(tuntematon.luvut.xg.summa).toBe(0);
    expect(tuntematon.luvut.xg.laukauksia).toBe(1);
  });

  it('K5 · merkinnalla EI ole omaa xG-mallia (malli tulee opts:sta)', () => {
    const LAHDE_LIB = readFileSync(join(juuri, 'lib/tm_pelihavainto.js'), 'utf8');
    expect(LAHDE_LIB, 'merkinnan malli-kentta on speksin ulkopuolinen reitti').not.toContain('m.malli');
    expect(LAHDE_LIB).toContain('opts.xgMalli');
  });

  /* K6: loput kolme lukitusta. */
  /* K6: sama tietoinen valinta myos SIIRTYMASSA — kirjaamaton (null) ketjun syotto on sailynyt,
     ei menetetty. Ilman tata lukitusta `!== false` voisi vaihtua `=== true`:ksi huomaamatta. */
  it('K6 · ketjun syotto perilla null sailyy siirtymassa (ei menetys)', () => {
    const piste = { len: 25, wid: 50 };
    const y = PH.phYhteenveto(dok([
      { id: 'r', tyyppi: 'riisto', piste, jatko: 'syotto' },
      { id: 'rs', tyyppi: 'syotto', ketju: 'r', alku: piste, loppu: { len: 60, wid: 50 }, perilla: null }
    ]));
    expect(y.luvut.siirtyma.sailyi).toBe(1);
    expect(y.luvut.siirtyma.menetetty).toBe(0);
    expect(y.luvut.siirtyma.kesken).toBe(0);
  });

  it('K6 · jatko rikottiin sailyy (ei menetys)', () => {
    const y = PH.phYhteenveto(dok([{ id: 'r', tyyppi: 'riisto', piste: { len: 25, wid: 50 }, jatko: 'rikottiin' }]));
    expect(y.luvut.siirtyma.sailyi).toBe(1);
    expect(y.luvut.siirtyma.menetetty).toBe(0);
  });

  it('K6 · reaktio "ei" (ei vastattu) ei ole nimittajassa', () => {
    const y = PH.phYhteenveto(dok([
      { id: '1', tyyppi: 'menetys', piste: { len: 40, wid: 50 }, reaktio: 'heti' },
      { id: '2', tyyppi: 'menetys', piste: { len: 40, wid: 50 }, reaktio: 'jai' },
      { id: '3', tyyppi: 'menetys', piste: { len: 40, wid: 50 }, reaktio: 'ei' }
    ]));
    expect(y.adar.menetyksenJalkeen).toEqual({ reagoiHeti: 1, yhteensa: 2 });
  });

  it('K6 · ketjun kuljetus lopputuotteella menetys = menetetty', () => {
    const piste = { len: 25, wid: 50 };
    const y = PH.phYhteenveto(dok([
      { id: 'r', tyyppi: 'riisto', piste, jatko: 'kuljetus' },
      { id: 'rk', tyyppi: 'kuljetus', ketju: 'r', alku: piste, loppu: { len: 40, wid: 50 }, lopputuote: 'menetys' }
    ]));
    expect(y.luvut.siirtyma.menetetty).toBe(1);
    expect(y.luvut.siirtyma.menetysHeti).toBe(1);
    expect(y.luvut.siirtyma.sailyi).toBe(0);
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
