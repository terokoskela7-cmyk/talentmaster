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

  /* PYSTYASENTO (kenttä koko näytölle): puhelin pystyssä → kenttä pystyssä, hyökkäys ylöspäin.
     Kierto on LIBISSÄ, joten haviottomuus on testattava myös pystyssä: jos meno- ja paluumatka
     eroaisivat, tallennettu piste kulkisi eri kohtaan kuin mihin valmentaja napautti. */
  it.each([
    [1, 'lahi'], [1, 'kauko'], [2, 'lahi'], [2, 'kauko'],
  ])('PYSTY naytto ja takaisin: puoliaika %i, seisoo %s → sama kanoninen piste', (puoliaika, seisoo) => {
    const p = { len: 70, wid: 30 };
    const o = { puoliaika, seisoo, pysty: true };
    const n = PH.phNaytolle(p, o);
    const takaisin = PH.phNaytolta(n.x, n.y, o);
    expect(takaisin.len).toBeCloseTo(p.len, 2);
    expect(takaisin.wid).toBeCloseTo(p.wid, 2);
  });

  it('PYSTY: hyökkäyssuunta on YLÖSPÄIN 1. puoliajalla', () => {
    /* Napautus kentän yläreunan keskelle → len≈100 (vastustajan pääty), alareunaan → len≈0.
       Tämä on se asia joka menisi väärin, jos kierto tehtaisiin sivulla eri suuntaan. */
    const o = { puoliaika: 1, seisoo: 'lahi', pysty: true };
    expect(PH.phNaytolta(50, 0, o).len).toBeCloseTo(100, 6);
    expect(PH.phNaytolta(50, 100, o).len).toBeCloseTo(0, 6);
  });

  it('PYSTY: 2. puoliajalla suunta kääntyy alaspäin', () => {
    const o = { puoliaika: 2, seisoo: 'lahi', pysty: true };
    expect(PH.phNaytolta(50, 0, o).len).toBeCloseTo(0, 6);
    expect(PH.phNaytolta(50, 100, o).len).toBeCloseTo(100, 6);
  });

  it('PYSTY on eri näyttöpiste kuin vaaka (kierto todella tapahtuu)', () => {
    const p = { len: 70, wid: 30 };
    const vaaka = PH.phNaytolle(p, { puoliaika: 1, seisoo: 'lahi' });
    const pysty = PH.phNaytolle(p, { puoliaika: 1, seisoo: 'lahi', pysty: true });
    expect(JSON.stringify(pysty)).not.toBe(JSON.stringify(vaaka));
    /* Kaava: x = fy, y = 100 − fx. */
    expect(pysty.x).toBeCloseTo(vaaka.y, 6);
    expect(pysty.y).toBeCloseTo(100 - vaaka.x, 6);
  });

  it('pysty:false käyttäytyy kuin ennen (taaksepäin yhteensopiva)', () => {
    const p = { len: 70, wid: 30 };
    const ilman = PH.phNaytolle(p, { puoliaika: 1, seisoo: 'lahi' });
    const nimen = PH.phNaytolle(p, { puoliaika: 1, seisoo: 'lahi', pysty: false });
    expect(nimen).toEqual(ilman);
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

  /* PIENKENTTIEN MAALIT VAHVISTETTU (Tero 28.9.2026): 8v8 = 5 m, 5v5 = 3 m. Aiemmin nama
     olivat null, jolloin phXg palautti null — ja koska aloitusruudun oletus on 8v8, xG
     puuttui kaytannossa AINA junioreilta. */
  it('PIENKENTTA: maalin leveys on vahvistettu', () => {
    expect(PH.phMaalinLeveys('11v11')).toBe(7.32);
    expect(PH.phMaalinLeveys('8v8')).toBe(5);
    expect(PH.phMaalinLeveys('5v5')).toBe(3);
  });

  it('PIENKENTTA: xG on luku 0–1, ei null', () => {
    ['8v8', '5v5'].forEach((pm) => {
      const x = PH.phXg({ len: 80, wid: 50 }, pm);
      expect(x, pm + ': xG puuttuu').toBeTruthy();
      expect(x.todennakoisyys).toBeGreaterThan(0);
      expect(x.todennakoisyys).toBeLessThan(1);
    });
  });

  it('PIENKENTTA: xG kasvaa kun laukaus on lahempana maalia', () => {
    ['8v8', '5v5'].forEach((pm) => {
      const kaukaa = PH.phXg({ len: 70, wid: 50 }, pm).todennakoisyys;
      const lahelta = PH.phXg({ len: 92, wid: 50 }, pm).todennakoisyys;
      expect(lahelta, pm + ': lahempaa ei ole todennakoisempi').toBeGreaterThan(kaukaa);
    });
  });

  it('KAPEAMPI MAALI → pienempi kulma samasta pisteesta', () => {
    /* 5v5:n maali on 3 m ja 8v8:n 5 m. Sama piste antaa kapeammalla maalilla pienemman
       kulman — muuten maalin leveys ei vaikuttaisi malliin lainkaan. */
    const piste = { len: 85, wid: 50 };
    expect(PH.phXg(piste, '5v5').kulma_rad)
      .toBeLessThan(PH.phXg(piste, '8v8').kulma_rad);
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
    expect(y.luvut.syotot).toMatchObject({ perille: 1, yhteensa: 1 });
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
    expect(y.luvut.syotot).toMatchObject({ perille: 1, yhteensa: 2 });
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
    /* Pienkentta LASKEE nyt xG:n (maalin leveys vahvistettu 28.9.2026). */
    const pieni = PH.phYhteenveto(dok([laukaus], { ottelu: { pelimuoto: '5v5' } }));
    expect(pieni.luvut.xg.laukauksia).toBe(1);
    expect(pieni.luvut.xg.laskettu).toBe(1);
    expect(pieni.luvut.xg.summa).toBeGreaterThan(0);
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

/* ══════════════════════════════════════════════════════════════════════════════════════════
   v6 — BOKSI · TULOT · KETJUT · VASTAPRÄSSI · VASTUSTAJAN LAUKAUS · POHJAT · KIRJATTAVAT
   Brief: Claude outputs/CODE_BRIEF_PELIHAVAINTO_V6.md §2.8
══════════════════════════════════════════════════════════════════════════════════════════ */

/** Dokumenttikuori: pelimuoto + merkinnät (+ valinnaiset kirjattavat). */
const dokV6 = (merkinnat, lisa) => Object.assign(
  { ottelu: { pelimuoto: '11v11' }, ikataso: 'u1315', merkinnat }, lisa || {});

describe('(v6-1) phBoksi — versioitu kuten xG', () => {
  it('juuri sisällä → true', () => {
    expect(PH.phBoksi({ len: 84, wid: 50 }, '11v11')).toBe(true);
    expect(PH.phBoksi({ len: 100, wid: 21 }, '11v11')).toBe(true);
    expect(PH.phBoksi({ len: 90, wid: 79 }, '11v11')).toBe(true);
  });

  it('juuri ulkona (liian kaukana maalista) → false', () => {
    expect(PH.phBoksi({ len: 83.9, wid: 50 }, '11v11')).toBe(false);
  });

  it('väärä kaista → false', () => {
    expect(PH.phBoksi({ len: 90, wid: 20.9 }, '11v11')).toBe(false);
    expect(PH.phBoksi({ len: 90, wid: 79.1 }, '11v11')).toBe(false);
  });

  it('8v8 ja 5v5 → null (rajoja ei ole, ei arvata)', () => {
    expect(PH.phBoksi({ len: 95, wid: 50 }, '8v8')).toBeNull();
    expect(PH.phBoksi({ len: 95, wid: 50 }, '5v5')).toBeNull();
  });

  it('tuntematon malli-id → oletusmalli (ei kaadu)', () => {
    expect(PH.phBoksi({ len: 95, wid: 50 }, '11v11', 'ei_ole_mallia')).toBe(true);
  });

  it('ilman sijaintia → null', () => {
    expect(PH.phBoksi(null, '11v11')).toBeNull();
    expect(PH.phBoksi({ len: null, wid: 50 }, '11v11')).toBeNull();
  });

  it('käytetty boksimalli merkitään yhteenvetoon (ei vaadi migraatiota)', () => {
    expect(PH.phYhteenveto(dokV6([])).malli.boksi).toBe(PH.PH_BOKSI_OLETUS);
  });
});

describe('(v6-2) Tulot hyökkäyskolmannekselle ja boksiin', () => {
  const syotto = (alku, loppu, perilla, id) => ({ id: id || 's', tyyppi: 'syotto', alku, loppu, perilla, t: 1 });
  const kuljetus = (alku, loppu, lopputuote, id) => ({ id: id || 'k', tyyppi: 'kuljetus', alku, loppu, lopputuote, t: 2 });

  it('keski → hyökkäys lasketaan; hyökkäys → hyökkäys ei', () => {
    const y = PH.phYhteenveto(dokV6([
      syotto({ len: 50, wid: 50 }, { len: 75, wid: 50 }, true, 'a'),
      syotto({ len: 70, wid: 50 }, { len: 80, wid: 50 }, true, 'b'),
    ]));
    expect(y.luvut.tulot.hyokkayskolmannes.syotot).toBe(1);
  });

  it('syöttö perilla:null ei lasku (tulon pitää olla varma)', () => {
    const y = PH.phYhteenveto(dokV6([syotto({ len: 50, wid: 50 }, { len: 75, wid: 50 }, null, 'a')]));
    expect(y.luvut.tulot.hyokkayskolmannes.syotot).toBe(0);
  });

  it('kuljetus, joka päättyi menetykseen, ei lasku', () => {
    const y = PH.phYhteenveto(dokV6([kuljetus({ len: 50, wid: 50 }, { len: 75, wid: 50 }, 'menetys', 'k')]));
    expect(y.luvut.tulot.hyokkayskolmannes.kuljetukset).toBe(0);
  });

  it('syöttö ja kuljetus menevät kumpikin OMAAN kenttäänsä', () => {
    const y = PH.phYhteenveto(dokV6([
      syotto({ len: 50, wid: 50 }, { len: 75, wid: 50 }, true, 'a'),
      Object.assign(kuljetus({ len: 50, wid: 40 }, { len: 80, wid: 40 }, 'avoin', 'k'), { ketju: 'a' }),
    ]));
    expect(y.luvut.tulot.hyokkayskolmannes).toMatchObject({ syotot: 1, kuljetukset: 1, yhteensa: 2 });
  });

  it('boksitulo lasketaan erikseen', () => {
    const y = PH.phYhteenveto(dokV6([syotto({ len: 70, wid: 50 }, { len: 90, wid: 50 }, true, 'a')]));
    expect(y.luvut.tulot.boksi).toMatchObject({ syotot: 1, yhteensa: 1 });
    // Alku oli jo hyokkayskolmanneksella (len 70), joten kolmannestuloa EI synny:
    // boksitulo lasketaan omana asianaan, ei kolmannestulon johdannaisena.
    expect(y.luvut.tulot.hyokkayskolmannes.syotot).toBe(0);
  });

  it('boksi on null pelimuodolle jolle rajoja ei ole', () => {
    const y = PH.phYhteenveto(dokV6([], { ottelu: { pelimuoto: '8v8' } }));
    expect(y.luvut.tulot.boksi).toBeNull();
  });

  it('eiSijaintia ohitetaan', () => {
    const y = PH.phYhteenveto(dokV6([{ id: 'x', tyyppi: 'syotto', eiSijaintia: true, perilla: true }]));
    expect(y.luvut.tulot.hyokkayskolmannes.yhteensa).toBe(0);
  });
});

describe('(v6-3) phKetjut — ketjut luettavina', () => {
  it('riisto → kuljetus → syöttö = yksi ketju aikajärjestyksessä, uhka kerran', () => {
    const k = PH.phKetjut(dokV6([
      { id: 'r', tyyppi: 'riisto', piste: { len: 40, wid: 50 }, t: 1 },
      { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: { len: 40, wid: 50 }, loppu: { len: 60, wid: 50 }, t: 2 },
      { id: 's', tyyppi: 'syotto', ketju: 'k', alku: { len: 60, wid: 50 }, loppu: { len: 80, wid: 50 }, perilla: true, t: 3 },
    ]));
    expect(k.length).toBe(1);
    expect(k[0].juuriId).toBe('r');
    expect(k[0].jasenet).toEqual(['r', 'k', 's']);
    expect(k[0].uhka).toBeGreaterThan(0);
  });

  it('juuri ilman jatkoa ei tule listalle', () => {
    expect(PH.phKetjut(dokV6([{ id: 'r', tyyppi: 'riisto', piste: { len: 40, wid: 50 }, t: 1 }])).length).toBe(0);
  });

  it('kehämäinen tai rikkinäinen viittaus ei kaada', () => {
    expect(() => PH.phKetjut(dokV6([
      { id: 'a', tyyppi: 'kuljetus', ketju: 'b', alku: { len: 40, wid: 50 }, loppu: { len: 50, wid: 50 }, t: 1 },
      { id: 'b', tyyppi: 'kuljetus', ketju: 'a', alku: { len: 50, wid: 50 }, loppu: { len: 60, wid: 50 }, t: 2 },
      { id: 'c', tyyppi: 'kuljetus', ketju: 'ei_ole', alku: { len: 40, wid: 50 }, loppu: { len: 45, wid: 50 }, t: 3 },
    ]))).not.toThrow();
  });

  it('perille menemätön syöttö ei kasvata ketjun uhkaa', () => {
    const pohja = { id: 'r', tyyppi: 'riisto', piste: { len: 40, wid: 50 }, t: 1 };
    const kuljetus = { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: { len: 40, wid: 50 }, loppu: { len: 60, wid: 50 }, t: 2 };
    const perille = PH.phKetjut(dokV6([pohja, kuljetus,
      { id: 's', tyyppi: 'syotto', ketju: 'k', alku: { len: 60, wid: 50 }, loppu: { len: 85, wid: 50 }, perilla: true, t: 3 }]));
    const ei = PH.phKetjut(dokV6([pohja, kuljetus,
      { id: 's', tyyppi: 'syotto', ketju: 'k', alku: { len: 60, wid: 50 }, loppu: { len: 85, wid: 50 }, perilla: false, t: 3 }]));
    const vainKuljetus = PH.phKetjut(dokV6([pohja, kuljetus]));
    expect(perille[0].uhka).toBeGreaterThan(vainKuljetus[0].uhka);
    expect(ei[0].uhka).toBe(vainKuljetus[0].uhka);
  });

  it('menetetty-lippu kertoo, päättyikö ketju menetykseen', () => {
    const k = PH.phKetjut(dokV6([
      { id: 'r', tyyppi: 'riisto', piste: { len: 40, wid: 50 }, t: 1 },
      { id: 's', tyyppi: 'syotto', ketju: 'r', alku: { len: 40, wid: 50 }, loppu: { len: 60, wid: 50 }, perilla: false, t: 2 },
    ]));
    expect(k[0].menetetty).toBe(true);
  });
});

describe('(v6-4) phKetjuNimi — AVAIMIA, ei suomenkielistä tekstiä', () => {
  it('keskitys vain boksiin menneestä syötöstä', () => {
    const boksiin = { tyyppi: 'syotto', perilla: true, alku: { len: 70, wid: 20 }, loppu: { len: 90, wid: 50 } };
    const ei = { tyyppi: 'syotto', perilla: true, alku: { len: 50, wid: 20 }, loppu: { len: 70, wid: 50 } };
    expect(PH.phKetjuNimi(boksiin, '11v11')).toBe('keskitys');
    expect(PH.phKetjuNimi(ei, '11v11')).toBe('syotto');
  });

  it('boksin sisältä boksiin EI ole keskitys', () => {
    expect(PH.phKetjuNimi({ tyyppi: 'syotto', perilla: true, alku: { len: 88, wid: 40 }, loppu: { len: 92, wid: 55 } }, '11v11'))
      .toBe('syotto');
  });

  it('perille menemätön syöttö → syotto_ei', () => {
    expect(PH.phKetjuNimi({ tyyppi: 'syotto', perilla: false }, '11v11')).toBe('syotto_ei');
  });

  it('kuljetus ja ohitus erotetaan', () => {
    expect(PH.phKetjuNimi({ tyyppi: 'kuljetus' }, '11v11')).toBe('kuljetus');
    expect(PH.phKetjuNimi({ tyyppi: 'kuljetus', ohitus: true }, '11v11')).toBe('ohitus');
  });

  it('voitettu hyökkäys-1v1 → voitto_1v1, voitettu puolustus-1v1 → riisto', () => {
    expect(PH.phKetjuNimi({ tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ohitti' }, '11v11')).toBe('voitto_1v1');
    expect(PH.phKetjuNimi({ tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'voitti' }, '11v11')).toBe('riisto');
  });

  it('avaimet ovat koneluettavia, eivät lauseita', () => {
    const sallitut = ['syotto', 'keskitys', 'syotto_ei', 'kuljetus', 'ohitus', 'voitto_1v1', 'laukaus', 'riisto', 'menetys'];
    [{ tyyppi: 'laukaus' }, { tyyppi: 'riisto' }, { tyyppi: 'menetys' }].forEach((m) => {
      expect(sallitut).toContain(PH.phKetjuNimi(m, '11v11'));
    });
  });
});

describe('(v6-5) Vastaprässiriisto (5 s, StatsBomb-yhteensopiva raja)', () => {
  const menetys = (t) => ({ id: 'm' + t, tyyppi: 'menetys', piste: { len: 50, wid: 50 }, t });
  const riisto = (t) => ({ id: 'r' + t, tyyppi: 'riisto', piste: { len: 50, wid: 50 }, t });

  it('riisto 5 s menetyksen jälkeen lasketaan', () => {
    expect(PH.phYhteenveto(dokV6([menetys(10), riisto(15)])).luvut.vastaprassi.riistot).toBe(1);
  });

  it('riisto 6 s jälkeen EI lasketa', () => {
    expect(PH.phYhteenveto(dokV6([menetys(10), riisto(16)])).luvut.vastaprassi.riistot).toBe(0);
  });

  it('riisto ENNEN menetystä ei lasku', () => {
    expect(PH.phYhteenveto(dokV6([menetys(20), riisto(15)])).luvut.vastaprassi.riistot).toBe(0);
  });

  it('voitettu puolustus-1v1 lasketaan riistoksi', () => {
    const y = PH.phYhteenveto(dokV6([
      menetys(10),
      { id: 'd', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'voitti', piste: { len: 50, wid: 50 }, t: 13 },
    ]));
    expect(y.luvut.vastaprassi.riistot).toBe(1);
  });

  /* Luokittelut ovat erillisia: havitty hyokkays-1v1 on MENETYS, ei riisto — se ei siis voi
     laueta omasta menetyksestaan. Vartija tarkistaa molemmat puolet samalla merkinnalla. */
  it('hävitty hyökkäys-1v1 on menetys, ei riisto — ei laukaise itseään', () => {
    const y = PH.phYhteenveto(dokV6([
      { id: 'x', tyyppi: 'kaksinpeli', rooli: 'hyokkays', tulos: 'ei_ohittanut', piste: { len: 50, wid: 50 }, t: 10 },
    ]));
    expect(y.luvut.vastaprassi.menetykset).toBe(1);
    expect(y.luvut.vastaprassi.riistot).toBe(0);
  });
});

describe('(v6-6) laukaus_vastaan — oma laji, peilattu xG', () => {
  const vastaan = (piste, lisa) => Object.assign({ id: 'v', tyyppi: 'laukaus_vastaan', piste, t: 5 }, lisa || {});

  it('xG lasketaan PEILATUSTA pisteestä: rangaistuspiste = sama arvo kuin omalla laukauksella', () => {
    const oma = PH.phArvo({ tyyppi: 'laukaus', piste: { len: 88.5, wid: 50 } }, '11v11');
    const vast = PH.phArvo(vastaan({ len: 11.5, wid: 50 }), '11v11');
    expect(vast.laji).toBe('xg_vastaan');
    expect(vast.pisteet).toBeCloseTo(oma.pisteet, 6);
  });

  it('vastustajan laukaus on omalla kolmanneksella (len < 33,3)', () => {
    expect(PH.phVyohyke({ len: 11.5, wid: 50 }).kolmannes).toBe('puolustus');
  });

  it('EI muuta omaa xG:tä, menetyksiä eikä riistoja', () => {
    const ilman = PH.phYhteenveto(dokV6([{ id: 'l', tyyppi: 'laukaus', piste: { len: 88, wid: 50 }, t: 1 }]));
    const kanssa = PH.phYhteenveto(dokV6([
      { id: 'l', tyyppi: 'laukaus', piste: { len: 88, wid: 50 }, t: 1 },
      vastaan({ len: 12, wid: 50 }, { tulos: 'torjuttu' }),
    ]));
    expect(kanssa.luvut.xg).toEqual(ilman.luvut.xg);
    expect(kanssa.luvut.menetykset).toEqual(ilman.luvut.menetykset);
    expect(kanssa.luvut.riistot).toEqual(ilman.luvut.riistot);
  });

  it('yhteenveto erittelee tulokset', () => {
    const y = PH.phYhteenveto(dokV6([
      vastaan({ len: 12, wid: 50 }, { id: 'a', tulos: 'torjuttu' }),
      vastaan({ len: 15, wid: 45 }, { id: 'b', tulos: 'maali' }),
      vastaan({ len: 20, wid: 55 }, { id: 'c', tulos: 'ohi' }),
    ]));
    expect(y.luvut.vastustaja).toMatchObject({ laukauksia: 3, torjuttu: 1, maali: 1, ohi: 1 });
    expect(y.luvut.vastustaja.xgSumma).toBeGreaterThan(0);
  });

  it('pelaajanBlokit vain kun itse === true JA tulos blokattu', () => {
    const y = PH.phYhteenveto(dokV6([
      vastaan({ len: 12, wid: 50 }, { id: 'a', tulos: 'blokattu', itse: true }),
      vastaan({ len: 13, wid: 50 }, { id: 'b', tulos: 'blokattu', itse: false }),
      vastaan({ len: 14, wid: 50 }, { id: 'c', tulos: 'torjuttu', itse: true }),
    ]));
    expect(y.luvut.vastustaja.blokattu).toBe(2);
    expect(y.luvut.vastustaja.pelaajanBlokit.n).toBe(1);
    expect(y.luvut.vastustaja.pelaajanBlokit.estettyXg).toBeGreaterThan(0);
  });

  it('merkintä on juuri → se lasketaan tilannelaskuriin', () => {
    expect(PH.phYhteenveto(dokV6([vastaan({ len: 12, wid: 50 })])).merkintoja).toBe(1);
  });
});

describe('(v6-7) Pohjat — pelipaikka on VALINNAINEN', () => {
  it('null, tyhjä ja tuntematon → yleinen pohja', () => {
    const yleinen = PH.PH_POHJAT.yleinen;
    [null, '', 'XX', undefined].forEach((x) => expect(PH.phPohja(x)).toEqual(yleinen));
  });

  it('jokainen TM_TT_PELIPAIKAT-koodi löytyy pohjista (uusi pelipaikka punertaa tämän)', () => {
    const TT = vaadi('../lib/tm_teknistaktiset.js');
    const koodit = Object.keys(TT.TM_TT_PELIPAIKAT || {});
    expect(koodit.length).toBeGreaterThan(3);
    const puuttuu = koodit.filter((k) => !PH.PH_POHJAT[k]);
    expect(puuttuu, 'pelipaikalle ei ole pohjaa').toEqual([]);
  });

  it('palautettu lista on KOPIO (vakio ei muutu)', () => {
    const a = PH.phPohja('LA');
    a.push('rikki');
    expect(PH.phPohja('LA')).not.toContain('rikki');
    expect(PH.PH_POHJAT.LA).not.toContain('rikki');
  });

  it('kaikki pohjien avaimet ovat kirjattavien joukossa', () => {
    Object.keys(PH.PH_POHJAT).forEach((pp) => {
      PH.PH_POHJAT[pp].forEach((k) => expect(PH.PH_KIRJATTAVAT).toContain(k));
    });
  });

  /* Mockup on itsenainen prototyyppi eika lataa libia, joten sen on pakko toistaa luku.
     Vartija ei siis vaita etta tyokalu LUKEE libin arvon — se vaatii, etta luku on yhdessa
     paikassa (mockupissa tasan yksi maarittely) ja etta se on SAMA kuin libissa. Mockupin
     kuusi kovakoodattua 4000:ta oli juuri se ongelma, jonka tama estaa palaamasta. */
  it('mockupin valintaikkuna on yksi vakio ja sama kuin libin', () => {
    const src = readFileSync(join(juuri, 'docs/prototyypit/pelihavainto_kenttatyokalu_v6.html'), 'utf8');
    const maarittelyt = src.match(/PH_VALINTA_IKKUNA_MS\s*=\s*(\d+)/g) || [];
    expect(maarittelyt.length, 'valintaikkuna maaritellaan mockupissa tasan kerran').toBe(1);
    expect(Number(maarittelyt[0].match(/(\d+)/)[1])).toBe(PH.PH_VALINTA_IKKUNA_MS);
    expect(PH.PH_VALINTA_IKKUNA_MS).toBe(6000);
  });
});

describe('(v6-8) Kirjattavat — rastittamaton ei ole nolla', () => {
  const merkinnat = [
    { id: 'l', tyyppi: 'laukaus', piste: { len: 88, wid: 50 }, t: 1 },
    { id: 'd', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'voitti', piste: { len: 40, wid: 50 }, t: 2 },
  ];

  it('rastittamaton lähde → null, EI 0', () => {
    const y = PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: ['syotto'] }));
    expect(y.luvut.xg).toBeNull();
    expect(y.luvut.ykkosetHyokkays).toBeNull();
    expect(y.luvut.ykkosetPuolustus).toBeNull();
    expect(y.luvut.vastustaja).toBeNull();
  });

  it('rastitettu lähde → luku (myös nolla, jos ei merkintöjä)', () => {
    const y = PH.phYhteenveto(dokV6([], { kirjattavat: ['laukaus'] }));
    expect(y.luvut.xg).toMatchObject({ laukauksia: 0 });
  });

  it('kirjattu-kartta kertoo mitä oli rastitettuna', () => {
    const y = PH.phYhteenveto(dokV6([], { kirjattavat: ['syotto', 'laukaus'] }));
    expect(y.kirjattu.syotto).toBe(true);
    expect(y.kirjattu.kuljetus).toBe(false);
  });

  it('dokumentti ILMAN kenttää antaa saman tuloksen kuin ennen (taaksepäin)', () => {
    const y = PH.phYhteenveto(dokV6(merkinnat));
    expect(y.luvut.xg).not.toBeNull();
    expect(y.luvut.ykkosetPuolustus).not.toBeNull();
    expect(y.luvut.vastustaja).toBeNull();      // ei kenttää eikä merkintöjä
  });

  it('ilman kenttää mutta laukaus_vastaan-merkinnöillä vastustaja lasketaan', () => {
    const y = PH.phYhteenveto(dokV6([{ id: 'v', tyyppi: 'laukaus_vastaan', piste: { len: 12, wid: 50 }, tulos: 'ohi', t: 1 }]));
    expect(y.luvut.vastustaja).not.toBeNull();
    expect(y.luvut.vastustaja.laukauksia).toBe(1);
  });

  it('vastaprässi vaatii sekä riisto- että menetys-rastin', () => {
    expect(PH.phYhteenveto(dokV6([], { kirjattavat: ['riisto'] })).luvut.vastaprassi).toBeNull();
    expect(PH.phYhteenveto(dokV6([], { kirjattavat: ['riisto', 'menetys'] })).luvut.vastaprassi).not.toBeNull();
  });

  it('ADAR-rivit noudattavat samoja rasteja', () => {
    const y = PH.phYhteenveto(dokV6([], { kirjattavat: ['syotto'] }));
    expect(y.adar.ennenPalloa.juoksut).toBeNull();
    expect(y.adar.menetyksenJalkeen).toBeNull();
  });

  it('tulot: vain rastitettu puoli lasketaan', () => {
    const m = [
      { id: 'a', tyyppi: 'syotto', alku: { len: 50, wid: 50 }, loppu: { len: 75, wid: 50 }, perilla: true, t: 1 },
      { id: 'k', tyyppi: 'kuljetus', alku: { len: 50, wid: 40 }, loppu: { len: 80, wid: 40 }, lopputuote: 'avoin', t: 2 },
    ];
    const y = PH.phYhteenveto(dokV6(m, { kirjattavat: ['syotto'] }));
    expect(y.luvut.tulot.hyokkayskolmannes.syotot).toBe(1);
    expect(y.luvut.tulot.hyokkayskolmannes.kuljetukset).toBeNull();
  });
});

describe('(v6-9) phKetjuNimi — kaksinpelin jokainen haara omalla avaimellaan', () => {
  const kp = (rooli, tulos) => ({ id: 'x', tyyppi: 'kaksinpeli', rooli, tulos, piste: { len: 50, wid: 50 } });

  /* Laaja "muu kaksinpeli = menetys" nimesi kolme tilannetta vaarin. Kirjasto sanoo itse
     phArvo:ssa, ettei ohitetuksi tuleminen ole menetys — pallo ei vaihtanut omistajaa. */
  it('puolustuksen viivytti ja ohitettiin EIVÄT ole menetys', () => {
    expect(PH.phKetjuNimi(kp('puolustus', 'viivytti'), '11v11')).toBe('viivytti');
    expect(PH.phKetjuNimi(kp('puolustus', 'ohitettiin'), '11v11')).toBe('ohitettiin');
  });

  it('tuntematon tulos on neutraali kaksinpeli, ei menetys', () => {
    expect(PH.phKetjuNimi(kp('hyokkays', null), '11v11')).toBe('kaksinpeli');
    expect(PH.phKetjuNimi(kp('puolustus', null), '11v11')).toBe('kaksinpeli');
    expect(PH.phKetjuNimi(kp('hyokkays', 'jotain_muuta'), '11v11')).toBe('kaksinpeli');
    expect(PH.phKetjuNimi(kp(null, 'voitti'), '11v11')).toBe('kaksinpeli');
  });

  it('vain hävitty hyökkäys-1v1 on menetys', () => {
    expect(PH.phKetjuNimi(kp('hyokkays', 'ei_ohittanut'), '11v11')).toBe('menetys');
  });

  it('voitot saavat omat avaimensa', () => {
    expect(PH.phKetjuNimi(kp('hyokkays', 'ohitti'), '11v11')).toBe('voitto_1v1');
    expect(PH.phKetjuNimi(kp('hyokkays', 'rikottiin'), '11v11')).toBe('voitto_1v1');
    expect(PH.phKetjuNimi(kp('puolustus', 'voitti'), '11v11')).toBe('riisto');
  });

  it('jokainen PH_KAKSINPELI_TULOS-arvo saa avaimen, eikä sama avain kata kahta eri lopputulosta', () => {
    const nimet = {};
    ['hyokkays', 'puolustus'].forEach((rooli) => {
      PH.PH_KAKSINPELI_TULOS[rooli].forEach((tulos) => {
        const nimi = PH.phKetjuNimi(kp(rooli, tulos), '11v11');
        expect(nimi, rooli + '/' + tulos).toBeTruthy();
        expect(nimi, rooli + '/' + tulos + ' ei saa olla neutraali').not.toBe('kaksinpeli');
        nimet[nimi] = (nimet[nimi] || 0) + 1;
      });
    });
    // 'voitto_1v1' kattaa ohitti+rikottiin (molemmat onnistumisia); muut ovat 1:1.
    Object.keys(nimet).forEach((n) => {
      if (n !== 'voitto_1v1') expect(nimet[n], n + ' kattaa kaksi eri lopputulosta').toBe(1);
    });
  });
});

describe('(v6-10) Rastittamaton ei ole nolla — myös koostelukujen ja ADAR-rivien osalta', () => {
  const merkinnat = [
    { id: 's', tyyppi: 'syotto', alku: { len: 40, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: true, skannasi: true, t: 1 },
    { id: 'k', tyyppi: 'kuljetus', alku: { len: 40, wid: 40 }, loppu: { len: 60, wid: 40 }, lopputuote: 'avoin', t: 2 },
    { id: 'r', tyyppi: 'riisto', piste: { len: 40, wid: 50 }, t: 3 },
    { id: 'd', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'voitti', piste: { len: 40, wid: 50 }, t: 4 },
    { id: 'j', tyyppi: 'juoksu', alku: { len: 40, wid: 60 }, loppu: { len: 70, wid: 60 }, t: 5 },
    { id: 'm', tyyppi: 'menetys', piste: { len: 60, wid: 50 }, reaktio: 'heti', t: 6 },
    { id: 'l', tyyppi: 'laukaus', piste: { len: 88, wid: 50 }, t: 7 },
  ];

  it('ilman yhtäkään rastia JOKAINEN luku ja ADAR-rivi on null', () => {
    const y = PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: [] }));
    Object.keys(y.luvut).forEach((avain) => {
      if (avain === 'tulot') {
        expect(y.luvut.tulot.hyokkayskolmannes, 'tulot.hyokkayskolmannes').toBeNull();
        expect(y.luvut.tulot.boksi, 'tulot.boksi').toBeNull();
        return;
      }
      expect(y.luvut[avain], 'luvut.' + avain).toBeNull();
    });
    expect(y.adar.ennenPalloa.juoksut).toBeNull();
    expect(y.adar.ennenPalloa.skannasi).toBeNull();
    expect(y.adar.pallonKanssa.ykkosetHyokkays).toBeNull();
    expect(y.adar.pallonKanssa.syotot).toBeNull();
    expect(y.adar.pallonKanssa.kuljetukset).toBeNull();
    expect(y.adar.puolustaminen.ykkosetPuolustus).toBeNull();
    expect(y.adar.puolustaminen.riistot).toBeNull();
    expect(y.adar.riistonJalkeen).toBeNull();
    expect(y.adar.menetyksenJalkeen).toBeNull();
  });

  /* Juurisyy jota tama vartioi: luvut- ja adar-lohko gatettiin erikseen, jolloin luvut.syotot oli
     null mutta adar.pallonKanssa.syotot samasta datasta {0,0}. Kaksi kuluttajaa, kaksi totuutta. */
  it('luvut ja ADAR kertovat samasta asiasta saman — rastilla ja ilman', () => {
    [[], ['syotto'], ['syotto', 'kuljetus', 'v1', 'riisto'], PH.PH_KIRJATTAVAT].forEach((rastit) => {
      const y = PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: rastit }));
      const nimi = 'rastit=' + JSON.stringify(rastit);
      expect(y.adar.pallonKanssa.syotot, nimi).toEqual(y.luvut.syotot);
      expect(y.adar.pallonKanssa.kuljetukset, nimi).toEqual(y.luvut.kuljetukset);
      expect(y.adar.pallonKanssa.ykkosetHyokkays, nimi).toEqual(y.luvut.ykkosetHyokkays);
      expect(y.adar.puolustaminen.ykkosetPuolustus, nimi).toEqual(y.luvut.ykkosetPuolustus);
      expect(y.adar.riistonJalkeen, nimi).toEqual(y.luvut.siirtyma);
      const riistojaLuvuissa = y.luvut.riistot === null ? null : y.luvut.riistot.n;
      expect(y.adar.puolustaminen.riistot, nimi).toEqual(riistojaLuvuissa);
    });
  });

  it('luotu uhka ja skannaus vaativat pallollisen rastin — kumpi tahansa riittää', () => {
    expect(PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: ['riisto'] })).luvut.luotuUhka).toBeNull();
    expect(PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: ['riisto'] })).adar.ennenPalloa.skannasi).toBeNull();
    ['syotto', 'kuljetus'].forEach((rasti) => {
      const y = PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: [rasti] }));
      expect(y.luvut.luotuUhka, rasti).not.toBeNull();
      expect(y.adar.ennenPalloa.skannasi, rasti).not.toBeNull();
    });
  });

  it('siirtymä ja riistonJälkeen vaativat riisto-rastin', () => {
    const ilman = PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: ['syotto'] }));
    expect(ilman.luvut.siirtyma).toBeNull();
    expect(ilman.adar.riistonJalkeen).toBeNull();
    const kanssa = PH.phYhteenveto(dokV6(merkinnat, { kirjattavat: ['riisto'] }));
    expect(kanssa.luvut.siirtyma).not.toBeNull();
  });

  it('ilman kirjattavat-kenttää kaikki koosteluvut ovat ennallaan (taaksepäin)', () => {
    const y = PH.phYhteenveto(dokV6(merkinnat));
    ['luotuUhka', 'siirtyma', 'syotot', 'kuljetukset', 'riistot'].forEach((a) => {
      expect(y.luvut[a], 'luvut.' + a).not.toBeNull();
    });
    expect(y.adar.ennenPalloa.skannasi).not.toBeNull();
    expect(y.adar.riistonJalkeen).not.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   P0 · UHKAPISTEIDEN MITTAKAAVA — phMuotoileUhka on AINOA nayttomuoto
   Juurisyy: sivu kertoi valmiit uhkapisteet uudelleen (x100 / x10) → Riisto +190,0 (oikea +1,9).
══════════════════════════════════════════════════════════════════════════════════════════ */
describe('(P0-1) phMuotoileUhka — yksi desimaali, pilkku, etumerkki', () => {
  it('positiivinen "+1,9", negatiivinen "−0,4" (U+2212), nolla "±0,0"', () => {
    expect(PH.phMuotoileUhka(1.9)).toBe('+1,9');
    expect(PH.phMuotoileUhka(-0.4)).toBe('−0,4');
    expect(PH.phMuotoileUhka(-0.4), 'oikea miinusmerkki, ei yhdysmerkki').not.toContain('-');
    expect(PH.phMuotoileUhka(0)).toBe('±0,0');
  });

  it('desimaalipilkku, ei pistettä; pyöristys yhteen desimaaliin', () => {
    expect(PH.phMuotoileUhka(0.6)).toBe('+0,6');
    expect(PH.phMuotoileUhka(12.34)).toBe('+12,3');
    expect(PH.phMuotoileUhka(0.6)).not.toContain('.');
  });

  it('nollaksi pyöristyvä pieni arvo on "±0,0" (ei "−0,0")', () => {
    expect(PH.phMuotoileUhka(-0.04)).toBe('±0,0');
    expect(PH.phMuotoileUhka(0.04)).toBe('±0,0');
  });

  it('ei arvoa → null (sivu näyttää viivan)', () => {
    expect(PH.phMuotoileUhka(null)).toBeNull();
    expect(PH.phMuotoileUhka(undefined)).toBeNull();
    expect(PH.phMuotoileUhka(NaN)).toBeNull();
  });

  it('mittakaavavahti: |arvo| > 30 → console.warn; normaali arvo ei varoita', () => {
    const alkup = console.warn;
    const kutsut = [];
    console.warn = (...a) => kutsut.push(a.join(' '));
    try {
      PH.phMuotoileUhka(1.9);
      expect(kutsut).toHaveLength(0);
      PH.phMuotoileUhka(190);
      expect(kutsut).toHaveLength(1);
      PH.phMuotoileUhka(-31);
      expect(kutsut).toHaveLength(2);
    } finally { console.warn = alkup; }
  });
});

describe('(P0-2) Arvot fixtuurilla oikeassa mittakaavassa (XT_KAYTTOONOTTO §2)', () => {
  const syotto = (alku, loppu) => ({ id: 's', tyyppi: 'syotto', alku, loppu, perilla: true });

  /* XT_KAYTTOONOTTO §2 ei kirjaa rivin koordinaatteja: LP laidalla (wid 10), keskialueen
     etureunasta hyökkäyskolmannekseen (len 55 → 75). */
  it('LP-H3 syöttö laidalta hyökkäyskolmannekseen ≈ +1,2 (±0,2)', () => {
    const a = PH.phArvo(syotto({ len: 55, wid: 10 }, { len: 75, wid: 10 }), '11v11');
    expect(a.laji).toBe('uhka');
    expect(Math.abs(a.pisteet - 1.2)).toBeLessThanOrEqual(0.2);
    expect(PH.phMuotoileUhka(a.pisteet)).toMatch(/^\+1,[0-4]$/);
  });

  it('keskialue → hyökkäyskolmannes: 0,1–10 uhkapistettä', () => {
    const a = PH.phArvo(syotto({ len: 50, wid: 50 }, { len: 72, wid: 50 }), '11v11');
    expect(a.pisteet).toBeGreaterThanOrEqual(0.1);
    expect(a.pisteet).toBeLessThanOrEqual(10);
  });

  it('riisto keskialueella: puolustusarvo < 5', () => {
    const a = PH.phArvo({ id: 'r', tyyppi: 'riisto', piste: { len: 50, wid: 50 } }, '11v11');
    expect(a.laji).toBe('puolustus');
    expect(a.pisteet).toBeGreaterThan(0);
    expect(a.pisteet).toBeLessThan(5);
  });

  it('koko ottelun fixtuuri: jokainen merkinnän, ketjun ja yhteenvedon uhka-arvo |x| < 30', () => {
    const merkinnat = [
      { id: 'r', tyyppi: 'riisto', piste: { len: 45, wid: 50 }, t: 1 },
      { id: 'k', tyyppi: 'kuljetus', ketju: 'r', alku: { len: 45, wid: 50 }, loppu: { len: 65, wid: 45 }, t: 2 },
      { id: 's', tyyppi: 'syotto', ketju: 'k', alku: { len: 65, wid: 45 }, loppu: { len: 88, wid: 50 }, perilla: true, t: 3 },
      { id: 's2', tyyppi: 'syotto', alku: { len: 55, wid: 10 }, loppu: { len: 75, wid: 10 }, perilla: true, t: 4 },
      { id: 's3', tyyppi: 'syotto', alku: { len: 30, wid: 50 }, loppu: { len: 60, wid: 50 }, perilla: false, t: 5 },
      { id: 'k2', tyyppi: 'kuljetus', alku: { len: 80, wid: 90 }, loppu: { len: 97, wid: 70 }, t: 6 },
      { id: 'm', tyyppi: 'menetys', piste: { len: 35, wid: 50 }, t: 7 },
      { id: 'd', tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'voitti', piste: { len: 20, wid: 50 }, t: 8 },
      { id: 'j', tyyppi: 'juoksu', alku: { len: 60, wid: 60 }, loppu: { len: 85, wid: 55 }, t: 9 },
      { id: 'l', tyyppi: 'laukaus', piste: { len: 90, wid: 50 }, t: 10 },
    ];
    const dok = dokV6(merkinnat, { kirjattavat: ['syotto', 'kuljetus', 'riisto', 'menetys', 'v1', 'juoksu', 'laukaus'] });
    const arvot = [];
    merkinnat.forEach((m) => {
      const a = PH.phArvo(m, '11v11');
      if (a && a.yksikko === 'uhkapisteet') arvot.push(['merkintä ' + m.id, a.pisteet]);
    });
    PH.phKetjut(dok).forEach((k) => arvot.push(['ketju ' + k.juuriId, k.uhka]));
    const y = PH.phYhteenveto(dok);
    arvot.push(['luotu uhka', y.luvut.luotuUhka.pisteet]);
    expect(arvot.length, 'EI VACUOUS: fixtuuri tuottaa arvoja').toBeGreaterThanOrEqual(8);
    arvot.forEach(([nimi, v]) => expect(Math.abs(v), nimi + ' = ' + v).toBeLessThan(PH.PH_UHKA_MITTAKAAVA_MAX));
  });
});

/* Vanha tallennusmuoto: Firestoreen tallentuu vain raakakoordinaatit + malli-id, EI laskettuja
   arvoja (§5.6). Siksi ennen P0:aa tallennetut tarkkailut kulkevat samaan laskentaan eivätkä
   tarvitse migraatiota. Dokumentti on SYNTEETTINEN, rakenteeltaan sama kuin tuotannon
   kenttatarkkailu (juuri- ja merkintäkentät), ei kenenkään pelaajan dataa. */
describe('(P0-3) Vanhan tallennusmuodon dokumentti → arvot oikeassa mittakaavassa', () => {
  const vanha = {
    tyyppi: 'kenttatarkkailu', lahde: 'live', tila: 'valmis',
    seuraId: 'testiseura', pelaajaId: 'testipelaaja', valmentajaUid: 'testivalmentaja', palloId: null,
    ikataso: 'u1315', pelipaikka: null, jaksofokus: null, suunta: 'oikealle',
    ottelu: { pelimuoto: '11v11', vastustaja: 'Synteettinen FC' },
    malli: { xt: 'singh_12x8_v1', xg: 'xg_geom_v0_esimerkki', boksi: 'boksi_v0_esimerkki' },
    kirjattavat: ['syotto', 'kuljetus', 'v1', 'laukaus', 'riisto', 'menetys', 'juoksu', 'reaktio', 'laukaus_vastaan'],
    puoliajat: [1, 2],
    merkinnat: [
      { id: 'a1', tyyppi: 'syotto', alku: { len: 48, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: true, puoliaika: 1, t: 34 },
      { id: 'a2', tyyppi: 'riisto', piste: { len: 52, wid: 65 }, jatko: 'kuljetus', puoliaika: 1, t: 54 },
      { id: 'a3', tyyppi: 'kuljetus', ketju: 'a2', alku: { len: 52, wid: 65 }, loppu: { len: 72, wid: 80 }, lopputuote: 'syotto', puoliaika: 1, t: 60 },
      { id: 'a4', tyyppi: 'syotto', ketju: 'a3', alku: { len: 72, wid: 80 }, loppu: { len: 90, wid: 50 }, perilla: true, puoliaika: 1, t: 64 },
      { id: 'a5', tyyppi: 'laukaus', piste: { len: 89, wid: 50 }, puoliaika: 1, t: 107 },
      { id: 'a6', tyyppi: 'laukaus_vastaan', piste: { len: 20, wid: 45 }, puoliaika: 2, t: 182 },
      { id: 'a7', tyyppi: 'menetys', piste: { len: 40, wid: 30 }, konsepti: 'Y-H1', puoliaika: 2, t: 240 },
    ],
  };

  it('dokumentissa EI ole tallennettuja pisteitä (lasketaan aina uudelleen)', () => {
    expect(JSON.stringify(vanha)).not.toMatch(/"pisteet"|"uhka"|"arvo"/);
  });

  it('merkinnät, ketju ja yhteenveto: realistinen väli, |x| < 30', () => {
    const opts = { xgMalli: vanha.malli.xg };
    const arvot = vanha.merkinnat.map((m) => [m.id, PH.phArvo(m, vanha.ottelu.pelimuoto, opts)]);
    const uhkat = arvot.filter(([, a]) => a && a.yksikko === 'uhkapisteet');
    expect(uhkat.length, 'EI VACUOUS').toBeGreaterThanOrEqual(5);
    uhkat.forEach(([id, a]) => expect(Math.abs(a.pisteet), id + ' ' + a.laji + ' = ' + a.pisteet).toBeLessThan(PH.PH_UHKA_MITTAKAAVA_MAX));

    const syotto = arvot.find(([id]) => id === 'a1')[1];
    expect(syotto.pisteet, 'keskialue → hyökkäyskolmannes').toBeGreaterThanOrEqual(0.1);
    expect(syotto.pisteet).toBeLessThanOrEqual(10);
    const riisto = arvot.find(([id]) => id === 'a2')[1];
    expect(riisto.laji).toBe('puolustus');
    expect(riisto.pisteet).toBeLessThan(5);

    const xgt = arvot.filter(([, a]) => a && a.yksikko === 'todennakoisyys');
    expect(xgt.map(([, a]) => a.laji).sort(), 'oma laukaus + vastustajan laukaus').toEqual(['xg', 'xg_vastaan']);
    xgt.forEach(([id, a]) => {
      expect(a.pisteet, id + ' xG').toBeGreaterThan(0);
      expect(a.pisteet, id + ' xG').toBeLessThan(1);
    });

    const ketjut = PH.phKetjut(vanha);
    expect(ketjut.length).toBe(1);
    expect(Math.abs(ketjut[0].uhka)).toBeLessThan(PH.PH_UHKA_MITTAKAAVA_MAX);

    const y = PH.phYhteenveto(vanha);
    expect(y.luvut.luotuUhka.pisteet).toBeGreaterThan(0);
    expect(Math.abs(y.luvut.luotuUhka.pisteet)).toBeLessThan(PH.PH_UHKA_MITTAKAAVA_MAX);
    expect(PH.phMuotoileUhka(y.luvut.luotuUhka.pisteet)).toMatch(/^\+\d{1,2},\d$/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   TILASTONÄKYMÄ (29.9.2026): avainsyöttö · murtava · etenevä + phKarttaPisteet
══════════════════════════════════════════════════════════════════════════════════════════ */
describe('(T-1) syötöt: avain · murtava · etenevät', () => {
  const s = (id, alku, loppu, lisa) => Object.assign({ id, tyyppi: 'syotto', alku, loppu, perilla: true, t: id }, lisa || {});

  it('avain ja murtava lasketaan perille menneistä; harhasyötön merkintä ei laske', () => {
    const y = PH.phYhteenveto(dokV6([
      s(1, { len: 45, wid: 50 }, { len: 80, wid: 50 }, { avain: true }),
      s(2, { len: 45, wid: 50 }, { len: 70, wid: 30 }, { murtava: true }),
      s(3, { len: 45, wid: 50 }, { len: 70, wid: 50 }, { perilla: false, avain: true, murtava: true }),
    ], { kirjattavat: ['syotto'] }));
    expect(y.luvut.syotot).toMatchObject({ perille: 2, yhteensa: 3, avain: 1, murtava: 1 });
  });

  it('syöttöjä ei kirjattu → koko luku null (ei nollia)', () => {
    const y = PH.phYhteenveto(dokV6([s(1, { len: 45, wid: 50 }, { len: 80, wid: 50 }, { avain: true })], { kirjattavat: ['laukaus'] }));
    expect(y.luvut.syotot).toBeNull();
  });

  it('vanha dokumentti ilman avain/murtava-kenttiä → 0, etenevät lasketaan silti', () => {
    const y = PH.phYhteenveto(dokV6([s(1, { len: 40, wid: 50 }, { len: 75, wid: 50 })], { kirjattavat: ['syotto'] }));
    expect(y.luvut.syotot).toMatchObject({ avain: 0, murtava: 0, etenevat: 1 });
  });

  it('harhasyöttö ei ole etenevä', () => {
    expect(PH.phOnEteneva(s(1, { len: 40, wid: 50 }, { len: 80, wid: 50 }, { perilla: false }), '11v11')).toBe(false);
  });

  it('raja molemmin puolin (11v11): 24 % ei laske, 26 % laskee', () => {
    expect(PH.PH_ETENEVA_OSUUS).toBe(0.25);
    expect(PH.phOnEteneva(s(1, { len: 40, wid: 50 }, { len: 54.4, wid: 50 }), '11v11'), '24 %').toBe(false);
    expect(PH.phOnEteneva(s(1, { len: 40, wid: 50 }, { len: 55.6, wid: 50 }), '11v11'), '26 %').toBe(true);
  });

  it('raja molemmin puolin (8v8, metrimitoilla): 24 % ei laske, 26 % laskee', () => {
    expect(PH.phOnEteneva(s(1, { len: 50, wid: 50 }, { len: 62, wid: 50 }), '8v8'), '24 %').toBe(false);
    expect(PH.phOnEteneva(s(1, { len: 50, wid: 50 }, { len: 63, wid: 50 }), '8v8'), '26 %').toBe(true);
  });

  it('8v8: METRIT, ei kanoniset yksiköt — laidalta keskelle ei ole etenevä, vaikka 0–100-luvuilla olisi', () => {
    /* Kanonisilla yksiköillä lyhenemä olisi 30 %, metreillä (40 × 60 m) 19 %. Leveys on
       pienkentällä kapeampi suhteessa pituuteen, joten sivuttaissiirto ei ole etenemistä. */
    expect(PH.phOnEteneva(s(1, { len: 50, wid: 5 }, { len: 53, wid: 50 }), '8v8')).toBe(false);
  });

  it('oman pään pikkusyöttö ei laske (loppu.len < 40), vaikka lyhenemä ylittäisi rajan', () => {
    expect(PH.PH_ETENEVA_MIN_LEN).toBe(40);
    expect(PH.phOnEteneva(s(1, { len: 5, wid: 50 }, { len: 39, wid: 50 }), '11v11')).toBe(false);
    expect(PH.phOnEteneva(s(1, { len: 5, wid: 50 }, { len: 41, wid: 50 }), '11v11'), 'EI VACUOUS').toBe(true);
  });
});

describe('(T-2) phKarttaPisteet — kerrokset kanonisissa koordinaateissa', () => {
  const M = [
    { id: 1, tyyppi: 'laukaus', piste: { len: 88, wid: 50 }, tulos: null, t: 1 },
    { id: 2, tyyppi: 'laukaus_vastaan', piste: { len: 12, wid: 50 }, tulos: 'maali', t: 2 },
    { id: 3, tyyppi: 'syotto', alku: { len: 40, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: true, avain: true, t: 3 },
    { id: 4, tyyppi: 'syotto', alku: { len: 40, wid: 50 }, loppu: { len: 60, wid: 20 }, perilla: false, t: 4 },
    { id: 5, tyyppi: 'menetys', piste: { len: 45, wid: 40 }, t: 5 },
    { id: 6, tyyppi: 'riisto', piste: { len: 30, wid: 60 }, t: 6 },
    { id: 7, tyyppi: 'kaksinpeli', rooli: 'puolustus', tulos: 'ohitettiin', piste: { len: 25, wid: 50 }, t: 7 },
    { id: 8, tyyppi: 'hetki', eiSijaintia: true, t: 8 },
  ];
  const KAIKKI = ['syotto', 'kuljetus', 'v1', 'laukaus', 'riisto', 'menetys', 'vastustajan_laukaus'];

  it('laukaus ilman tulosta on mukana (tulos: null) ja saa xG:n', () => {
    const k = PH.phKarttaPisteet(dokV6(M, { kirjattavat: KAIKKI }));
    expect(k.laukaukset).toHaveLength(1);
    expect(k.laukaukset[0].tulos).toBeNull();
    expect(k.laukaukset[0].xg).toBeGreaterThan(0);
    expect(k.vastaan[0]).toMatchObject({ len: 12, wid: 50, tulos: 'maali' });
    expect(k.vastaan[0].xg).toBeGreaterThan(0);
  });

  it('syötöt: avain/murtava/perillä totuusarvoina; menetykset sis. harhasyötön loppupisteen', () => {
    const k = PH.phKarttaPisteet(dokV6(M, { kirjattavat: KAIKKI }));
    expect(k.syotot).toEqual([
      { alku: { len: 40, wid: 50 }, loppu: { len: 70, wid: 50 }, perilla: true, avain: true, murtava: false },
      { alku: { len: 40, wid: 50 }, loppu: { len: 60, wid: 20 }, perilla: false, avain: false, murtava: false },
    ]);
    expect(k.menetykset.map((p) => [p.len, p.wid])).toEqual([[60, 20], [45, 40]]);
    expect(k.menetykset.every((p) => ['matala', 'kohonnut', 'korkea'].indexOf(p.taso) >= 0)).toBe(true);
    expect(k.riistot).toEqual([{ len: 30, wid: 60 }]);
    expect(k.ohitettiin).toEqual([{ len: 25, wid: 50 }]);
  });

  it('kirjaamaton lähde → kerros null (ei tyhjä lista)', () => {
    const k = PH.phKarttaPisteet(dokV6(M, { kirjattavat: ['syotto'] }));
    expect(k.syotot).not.toBeNull();
    ['laukaukset', 'vastaan', 'menetykset', 'riistot', 'ohitettiin'].forEach((kerros) => {
      expect(k[kerros], kerros).toBeNull();
    });
  });

  it('kirjattu mutta ei merkintöjä → tyhjä lista (eri asia kuin null)', () => {
    const k = PH.phKarttaPisteet(dokV6([], { kirjattavat: ['laukaus'] }));
    expect(k.laukaukset).toEqual([]);
  });
});
