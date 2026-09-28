/* ADAR-PORTAAT (PR 2A) — peliäly lasketaan pelaajan PORTAAN mukaan, ei iän.
 *
 * Kriittisin vartija on TAAKSEPÄIN YHTEENSOPIVUUS: ilman `havainto_porras`-dataa käytöksen on
 * oltava bitti bitiltä sama kuin ennen. Siksi tämä tiedosto ajaa saman taulukon kahdesti —
 * kerran ilman porrasta ja kerran `porras = tmAdarIkaPorras(ika)`:lla — ja vaatii samat tulokset.
 *
 * Toinen vartijaryhmä koskee §7.22:ta: portaan nousu EI saa näkyä lapselle laskuna.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const L = vaadi('../lib/tm_pelialy_yksilo.js');
const KAARI = vaadi('../lib/tm_kehityskaari.js');

const hav = (pisteet, ms, lisa) => Object.assign({
  pisteet, luotu: ms, tekija_uid: 'u' + ms,
}, lisa || {});

describe('(1) portaat ja ikäsuositus', () => {
  it('neljä porrasta, kumulatiiviset', () => {
    expect(L.TM_ADAR_PORTAAT).toEqual({
      1: ['a'], 2: ['a', 'd'], 3: ['a', 'd', 'ac'], 4: ['a', 'd', 'ac', 'r'],
    });
  });

  it('ikä ehdottaa porrasta 1, 3 tai 4 — EI koskaan 2', () => {
    expect(L.tmAdarIkaPorras(10)).toBe(1);
    expect(L.tmAdarIkaPorras(12)).toBe(1);
    expect(L.tmAdarIkaPorras(13)).toBe(3);
    expect(L.tmAdarIkaPorras(15)).toBe(3);
    expect(L.tmAdarIkaPorras(16)).toBe(4);
    /* Porras 2 on valmentajan valinta: ikä ei voi hypätä siihen, koska ikäraja on 12/13. */
    [null, 5, 8, 10, 11, 12, 13, 14, 15, 16, 19, 30].forEach((i) => {
      expect(L.tmAdarIkaPorras(i), 'ikä ' + i).not.toBe(2);
    });
  });

  it('tuntematon ikä → 4 (turvaverkko, sama kuin vanha "kaikki")', () => {
    expect(L.tmAdarIkaPorras(null)).toBe(4);
    expect(L.tmAdarBand(null)).toEqual(['a', 'd', 'ac', 'r']);
  });
});

describe('(2) TAAKSEPÄIN YHTEENSOPIVUUS — porras ei muuta vanhaa käytöstä', () => {
  const IAT = [null, 6, 10, 11, 12, 13, 14, 15, 16, 17, 19, 25];
  const OSAT = { a: 3, d: 2, ac: 2, r: 1 };

  it('tmAdarBand: ikä yksin === ikä + ikäporras', () => {
    IAT.forEach((ika) => {
      expect(L.tmAdarBand(ika, L.tmAdarIkaPorras(ika)), 'ikä ' + ika).toEqual(L.tmAdarBand(ika));
    });
  });

  it('tmAdarYht: sama tulos molemmilla kutsutavoilla', () => {
    IAT.forEach((ika) => {
      expect(L.tmAdarYht(OSAT, ika, L.tmAdarIkaPorras(ika)), 'ikä ' + ika).toBe(L.tmAdarYht(OSAT, ika));
    });
  });

  it('tmAdarBonusOsat: sama tulos molemmilla kutsutavoilla', () => {
    IAT.forEach((ika) => {
      expect(L.tmAdarBonusOsat(OSAT, ika, L.tmAdarIkaPorras(ika)), 'ikä ' + ika)
        .toEqual(L.tmAdarBonusOsat(OSAT, ika));
    });
  });

  it('tmAdarKonsensus: sama tulos molemmilla kutsutavoilla', () => {
    const havainnot = [
      hav({ A: 3, D: 2, Act: 2, R: 1 }, 300),
      hav({ A: 2, D: 3, Act: 1, R: 2 }, 200, { tekija_uid: 'u2' }),
    ];
    IAT.forEach((ika) => {
      expect(L.tmAdarKonsensus(havainnot, ika, L.tmAdarIkaPorras(ika)), 'ikä ' + ika)
        .toEqual(L.tmAdarKonsensus(havainnot, ika));
    });
  });

  it('roskaporras putoaa ikälogiikkaan (ei kaadu eikä hiljaa tyhjennä)', () => {
    [0, 5, -1, 'x', NaN, {}].forEach((p) => {
      expect(L.tmAdarBand(13, p), 'porras ' + JSON.stringify(p)).toEqual(['a', 'd', 'ac']);
    });
  });
});

describe('(3) porras voittaa iän', () => {
  it('12-vuotias portaalla 2 saa [a,d]', () => {
    expect(L.tmAdarBand(12, 2)).toEqual(['a', 'd']);
    expect(L.tmAdarBand(12)).toEqual(['a']);          // vertailu: ilman porrasta ennallaan
  });

  it('16-vuotias portaalla 1 saa vain [a] (porras voi myös laskea)', () => {
    expect(L.tmAdarBand(16, 1)).toEqual(['a']);
  });

  it('yht lasketaan portaan dimeistä', () => {
    const osat = { a: 3, d: 1, ac: 3, r: 3 };
    expect(L.tmAdarYht(osat, 12, 2), '(3+1)/2').toBe(2);
    expect(L.tmAdarYht(osat, 12), 'vain a').toBe(3);
  });
});

describe('(4) peruttu havainto ei laske peliälyyn', () => {
  const havainnot = [
    hav({ A: 3 }, 300, { tila: 'peruttu' }),
    hav({ A: 1 }, 200, { tekija_uid: 'u2' }),
  ];

  it('tmAdarKonsensus ohittaa perutut', () => {
    const k = L.tmAdarKonsensus(havainnot, 12, 1);
    expect(k.arvioijia, 'peruttu arvioija ei laske').toBe(1);
    expect(k.dimKonsensus.a).toBe(1);
  });

  it('EI VACUOUS: ilman peruutusta molemmat lasketaan', () => {
    const k = L.tmAdarKonsensus([hav({ A: 3 }, 300), hav({ A: 1 }, 200, { tekija_uid: 'u2' })], 12, 1);
    expect(k.arvioijia).toBe(2);
    expect(k.dimKonsensus.a).toBe(2);
  });

  it('tmAdarPikakentat ohittaa perutut', () => {
    const pk = L.tmAdarPikakentat(havainnot, 12, 1);
    expect(pk.adar_havaintoja, 'peruttu ei kuulu lukumäärään').toBe(1);
  });
});

describe('(5) tmAdarPorrasEhdotus', () => {
  const a = (v, ms, lisa) => hav({ A: v }, ms, lisa);

  it('[3,3,2] → valmis, seuraava on päätös', () => {
    const e = L.tmAdarPorrasEhdotus([a(3, 300), a(3, 200), a(2, 100)], 1);
    expect(e.valmis).toBe(true);
    expect(e.hist).toEqual([3, 3, 2]);
    expect(e.seuraava).toBe('d');
  });

  it('[3,2,2] → ei valmis (ka 2,33 < 2,5)', () => {
    expect(L.tmAdarPorrasEhdotus([a(3, 300), a(2, 200), a(2, 100)], 1).valmis).toBe(false);
  });

  it('kaksi havaintoa ei riitä (yksi hyvä päivä ei nosta porrasta)', () => {
    const e = L.tmAdarPorrasEhdotus([a(3, 300), a(3, 200)], 1);
    expect(e.valmis).toBe(false);
    expect(e.hist).toEqual([3, 3]);
  });

  it('porras 4 ei ehdota enempää', () => {
    const nelja = [hav({ R: 3 }, 300), hav({ R: 3 }, 200), hav({ R: 3 }, 100)];
    expect(L.tmAdarPorrasEhdotus(nelja, 4).valmis).toBe(false);
  });

  it('perutut eivät laske historiaan', () => {
    const e = L.tmAdarPorrasEhdotus([a(3, 400, { tila: 'peruttu' }), a(3, 300), a(3, 200), a(2, 100)], 1);
    expect(e.hist).toEqual([3, 3, 2]);
  });

  it('historia on UUSIMMAT kolme, ei kolme ensimmäistä', () => {
    const e = L.tmAdarPorrasEhdotus([a(1, 100), a(3, 400), a(3, 300), a(3, 200)], 1);
    expect(e.hist).toEqual([3, 3, 3]);
    expect(e.valmis).toBe(true);
  });

  it('vain portaan UUSIN ulottuvuus ratkaisee', () => {
    /* Portaalla 2 uusin on d — a:n pisteet eivät kelpaa historiaan. */
    const e = L.tmAdarPorrasEhdotus([a(3, 300), a(3, 200), a(3, 100)], 2);
    expect(e.hist, 'a-pisteet eivät saa kelvata portaalla 2').toEqual([]);
    expect(e.valmis).toBe(false);
  });

  it('kaikki arvioijat lasketaan (ei vain oma)', () => {
    const e = L.tmAdarPorrasEhdotus(
      [a(3, 300, { tekija_uid: 'x' }), a(3, 200, { tekija_uid: 'y' }), a(2, 100, { tekija_uid: 'z' })], 1,
    );
    expect(e.valmis).toBe(true);
  });
});

describe('(6) tmAdarPikakentat — yksi laskenta kahden kopion tilalle', () => {
  const havainnot = [
    hav({ A: 3, D: 2, Act: 2, R: 1 }, 300, { konteksti: 'ottelu' }),
    hav({ A: 2, D: 3, Act: 1, R: 2 }, 200, { tekija_uid: 'u2', konteksti: 'harjoitus' }),
  ];

  it('tuottaa kaikki pikakentät', () => {
    const pk = L.tmAdarPikakentat(havainnot, 16, null);
    ['adar_viimeisin', 'adar_pvm', 'adar_havaintoja', 'adar_arvioijat', 'adar_arvioijia',
      'adar_yhtenevyys', 'adar_yhtenevyys_taso', 'adar_dim_konsensus', 'adar_vahvin',
      'adar_heikoin', 'adar_tilanne_jakauma', 'havainto_porras_ehdotus'].forEach((k) => {
      expect(pk, 'kenttä ' + k + ' puuttuu').toHaveProperty(k);
    });
  });

  /* PARITEETTI: samat luvut kuin Masterin vanha laskenta samalla syötteellä. */
  it('konsensusluvut vastaavat tmAdarKonsensus-laskentaa', () => {
    const pk = L.tmAdarPikakentat(havainnot, 16, null);
    const k = L.tmAdarKonsensus(havainnot, 16, null);
    expect(pk.adar_dim_konsensus).toEqual(k.dimKonsensus);
    expect(pk.adar_viimeisin.yht).toBe(k.yht);
    expect(pk.adar_arvioijia).toBe(k.arvioijia);
    expect(pk.adar_yhtenevyys_taso).toBe(k.yhtenevyysTaso);
    expect(pk.adar_vahvin).toBe(k.vahvin);
    expect(pk.adar_heikoin).toBe(k.heikoin);
  });

  it('EI kirjoita havainto_porras:ia — portaan päättää valmentaja, ei kaava', () => {
    expect(L.tmAdarPikakentat(havainnot, 16, 2)).not.toHaveProperty('havainto_porras');
  });

  it('adar_edellinen kaapataan vain ERI pvm:llä (§29 pvm-vahti)', () => {
    const uusi = L.tmAdarPikakentat(havainnot, 16, null, {
      edellinen: { a: 1, d: 1, ac: 1, r: 1, yht: 1, pvm: '2020-01-01T00:00:00.000Z' },
    });
    expect(uusi.adar_edellinen.yht).toBe(1);
    const sama = L.tmAdarPikakentat(havainnot, 16, null, {
      edellinen: { a: 1, yht: 1, pvm: uusi.adar_pvm },
    });
    expect(sama, 'uudelleenlaskenta ei saa clobata edellistä').not.toHaveProperty('adar_edellinen');
  });

  it('tyhjä syöte → null (ei kirjoitettavaa)', () => {
    expect(L.tmAdarPikakentat([], 16, null)).toBeNull();
    expect(L.tmAdarPikakentat(null, 16, null)).toBeNull();
    expect(L.tmAdarPikakentat([{ luotu: 1 }], 16, null), 'ilman pisteitä').toBeNull();
  });

  it('tilanne_jakauma lukee sekä uutta konteksti- että vanhaa tilanne-kenttää', () => {
    const pk = L.tmAdarPikakentat([
      hav({ A: 2 }, 300, { konteksti: 'ottelu' }),
      hav({ A: 2 }, 200, { tekija_uid: 'u2', tilanne: 'harjoitus' }),
    ], 16, null);
    expect(pk.adar_tilanne_jakauma).toEqual({ ottelu: 1, harjoitus: 1 });
  });

  it('porras ohjaa yht-laskentaa', () => {
    const yksi = L.tmAdarPikakentat(havainnot, 16, 1);
    const nelja = L.tmAdarPikakentat(havainnot, 16, 4);
    expect(yksi.adar_viimeisin.yht).not.toBe(nelja.adar_viimeisin.yht);
  });
});

describe('(7) nimikanoni', () => {
  it('kaksi muotoa: valmentaja ja pelaaja — MOLEMMAT kokonaan', () => {
    expect(L.TM_ADAR_NIMET.valmentaja).toEqual({
      a: 'Havainnointi', d: 'Päätös', ac: 'Toteutus', r: 'Palautuminen',
    });
    /* Koko kartta, ei yksittäistä avainta: R:n nimi oli juuri se, joka oli väärin. */
    expect(L.TM_ADAR_NIMET.pelaaja).toEqual({
      a: 'Havainnointi', d: 'Päätöksenteko', ac: 'Toteutus', r: 'Palautuminen',
    });
  });

  it('R mittaa palautumista — nimi ei saa luvata pelin lukemista', () => {
    ['valmentaja', 'pelaaja'].forEach((m) => {
      expect(L.TM_ADAR_NIMET[m].r, m).toBe('Palautuminen');
    });
  });

  /* R mittaa VIRHEESTÄ PALAUTUMISTA. Pelaaja_v7 kutsui sitä "Pelin lukemiseksi" ja kuvasi sen
     "Luet pelin kulun etukäteen" — lapselle kerrottiin siis väärä asia hänen omasta arviostaan. */
  it('R ei ole enää "Pelin lukeminen" missään', () => {
    /* Kommentit riisutaan: muutoksen PERUSTELU mainitsee vanhan tekstin, eikä vartija saa
       punertaa siitä että syy on kirjattu. */
    const ilmanKommentteja = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Master_v16.html'].forEach((f) => {
      const src = ilmanKommentteja(readFileSync(join(juuri, f), 'utf8'));
      expect(src, f + ': R:n vanha nimi').not.toContain('Luet pelin kulun etukäteen');
      expect(src, f + ': R:n vanha otsikko').not.toContain("r: 'Pelin lukeminen'");
    });
  });

  it('Pelaaja_v7 kuvaa R:n palautumisena', () => {
    const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
    expect(src).toContain('Palaat peliin nopeasti virheen jälkeen');
  });

  it('Master ei käytä enää omia nimiä', () => {
    expect(masterCLohko()).toContain('TM_ADAR_NIMET');
    expect(masterCLohko(), 'vanha nimistö').not.toContain("masterT('Havaitse')");
  });

  it('kehityskaaren varapolku ei saa erkaantua kanonista', () => {
    const src = readFileSync(join(juuri, 'lib/tm_kehityskaari.js'), 'utf8');
    Object.keys(L.TM_ADAR_NIMET.valmentaja).forEach((k) => {
      expect(src, 'varapolun nimi ' + k).toContain("'" + L.TM_ADAR_NIMET.valmentaja[k] + "'");
    });
  });
});

/* Masterin §C-lohko alkaa kommentista ja päättyy _adarHtml-koostamiseen. Kiinteä merkkimäärä
   olisi hauras (lohko kasvoi juuri), joten rajataan tunnistettavaan loppuankkuriin. */
function masterCLohko() {
  const src = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
  const i = src.indexOf('§C ADAR-LOHKO');
  expect(i, '§C-lohkoa ei löydy').toBeGreaterThan(-1);
  const j = src.indexOf('const _gate', i);
  expect(j, 'lohkon loppuankkuria ei löydy').toBeGreaterThan(i);
  const loppu = src.indexOf('const _bar', j);
  expect(loppu, 'lohkon loppuankkuria ei löydy').toBeGreaterThan(j);
  return src.slice(i, loppu);
}

describe('(10) Master lukee portaan ja näyttää sen', () => {
  it('porras luetaan pelaajadokumentista', () => {
    const lohko = masterCLohko();
    /* Tarkka sijoitus, ei pelkkä osamerkkijono: `p.havainto_porras_ehdotus` sisältää saman
       alun, joten löyhä haku pysyisi vihreänä vaikka porras jäisi lukematta. */
    expect(lohko, 'ilman tätä Master jää ikälogiikkaan')
      .toContain('const _porrasC = p.havainto_porras || null;');
    expect(lohko).toContain('tmAdarBand(_ikaC, _porrasC)');
  });

  it('merkki kertoo PORTAAN, ei osien määrää', () => {
    const lohko = masterCLohko();
    expect(lohko).toMatch(/_tasoMerkki\s*=\s*masterT\('Porras'\)/);
    /* Osien määrä nousi aina kun joku kirjasi ylimääräisen ulottuvuuden. */
    expect(lohko, 'osien määrä merkkinä').not.toContain('_osatAll.length >= 4');
  });

  it('uusin porrasulottuvuus johdetaan TALLENNETUSTA portaasta', () => {
    expect(masterCLohko()).toContain('TM_ADAR_PORTAAT[_porrasC][_porrasC - 1]');
  });

  it('pikakentät lasketaan libissä, ei Masterissa', () => {
    const src = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
    const i = src.indexOf('async function paivitaAdarPikakentat(');
    const lohko = src.slice(i, i + 3000);
    expect(lohko).toContain('tmAdarPikakentat(havainnot, _ikaAdar, _porrasP');
    expect(lohko, 'porras luetaan pelaajadokumentista').toContain('_pdAdar.havainto_porras');
  });
});

describe('(8) kehityskaari käyttää libin bandia, ei omaa kopiota', () => {
  it('kopio poistettu — band tulee libistä (selain: globaali, Node: require)', () => {
    const src = readFileSync(join(juuri, 'lib/tm_kehityskaari.js'), 'utf8');
    const i = src.indexOf('function _kaariBandFn(');
    expect(i, 'band-resolvointia ei ole').toBeGreaterThan(-1);
    const lohko = src.slice(i, i + 400);
    expect(lohko).toContain("typeof tmAdarBand === 'function'");
    expect(lohko, 'Node-haara puuttuisi → varapolku ohittaisi portaan hiljaa')
      .toContain('_KAARI_PELIALY');
  });

  /* AJETTU todiste: jos resolvointi ei toimi, porras ohittuu ja tämä punertaa. */
  it('porras vaikuttaa kaaren dimensioihin myös Nodessa', () => {
    expect(Object.keys(KAARI.tmKaariAdarDimensiot({ a: 2, d: 2, ac: 2, r: 2 }, null, 12, 2)))
      .toEqual(['a', 'd']);
  });

  it('dimensiot ja blokki ottavat portaan', () => {
    const av = { a: 2, d: 2, ac: 2, r: 2 };
    expect(Object.keys(KAARI.tmKaariAdarDimensiot(av, null, 12))).toEqual(['a']);
    expect(Object.keys(KAARI.tmKaariAdarDimensiot(av, null, 12, 2)), 'porras voittaa iän')
      .toEqual(['a', 'd']);
  });
});

describe('(9) §7.22 — portaan nousu ei näy lapselle laskuna', () => {
  const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
  /* Sulkeita laskien: `indexOf('\n}')` osui ensimmäiseen sisäkkäiseen sulkuun, jolloin lohko
     katkesi kesken ja vartijat lukivat vain funktion alkua. */
  const lohko = (() => {
    const i2 = src.indexOf('function rAdar() {');
    let syvyys = 0;
    for (let j = src.indexOf('{', i2); j < src.length; j++) {
      if (src[j] === '{') syvyys++;
      else if (src[j] === '}') {
        syvyys--;
        if (!syvyys) {
          /* KOMMENTIT POIS. Tämä on viides kerta tässä työssä, kun kieltovartija osui koodin
             sijaan sitä KUVAAVAAN kommenttiin ja pysyi vihreänä vaikka toteutus katosi.
             Kommentit riisutaan siksi aina ennen sisältötarkistuksia. */
          return src.slice(i2, j + 1)
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
        }
      }
    }
    throw new Error('rAdar-lohko ei pääty');
  })();

  /* Laskentaporras on porras−1 VAIN kun uusin on aidosti harjoittelussa; muuten koko porras
     (ja ilman tallennettua porrasta koko ikäbändi, kuten ennen). */
  it('laskentaporras kytkeytyy _uusiNakyy-ehtoon, ei porrasta suoraan', () => {
    expect(lohko).toContain('const osat = _lasketaan.map');
    expect(lohko).toContain('_laskentaPorras = _uusiNakyy ? Math.max(1, _porras - 1) : _porras');
  });

  it('"uusi taito" vaatii TALLENNETUN portaan ja alle kolme havaintoa', () => {
    expect(lohko).toContain('_porrasTallennettu && _porrasTallennettu > 1');
    expect(lohko).toContain('_ehdHist.length < 3');
    /* Pelkkä _porras sisältää ikäsuosituksen → koskisi jokaista 13+ -pelaajaa. */
    const i5 = lohko.indexOf('const _uusiNakyy');
    const rivi5 = lohko.slice(i5, lohko.indexOf(';', i5));
    expect(rivi5, 'ikäsuositus ei ole portaan nosto').not.toMatch(/_porras &&/);
  });

  /* yht on kaistan lähde: jos se lasketaan koko portaasta, kaista putoaa portaan noustessa. */
  it('yht lasketaan SAMASTA portaasta kuin osat', () => {
    const i3 = lohko.indexOf('const _yht');
    const rivi = lohko.slice(i3, lohko.indexOf(';', i3));
    expect(rivi).toContain('_laskentaPorras');
    /* Eri porras kaistalle ja riveille kertoisi kaksi eri asiaa samasta pelaajasta. */
    expect(rivi, 'koko porras kaistan lähteenä').not.toMatch(/tmAdarYht\(av, _ika, _porras\)/);
  });

  it('uusin ulottuvuus näytetään ILMAN lukua', () => {
    expect(lohko, 'uusi taito on kerrottava, muuten se katoaa kokonaan').toContain('Uusi taito');
    expect(lohko).toContain('harjoittelussa');
    expect(lohko).toContain('_uusiNakyy');
    /* Rivillä ei saa olla arvoa: se on harjoittelussa, ei arvosteltavana. */
    const i4 = lohko.indexOf('Uusi taito');
    const rivi = lohko.slice(lohko.lastIndexOf('\n', i4), lohko.indexOf('\n', i4));
    expect(rivi, 'uuden taidon rivillä ei saa olla lukua').not.toMatch(/_cap\(|\.val/);
  });

  it('tasomerkki kertoo portaan, ei osien määrää', () => {
    expect(lohko).toContain("'Porras '");
    expect(lohko, 'osien määrä nousi ylimääräisestä kirjauksesta').not.toContain('_kaikkiN >= 4');
  });

  /* Konkreettinen todiste: portaalle 2 nousseen 12-vuotiaan kaista lasketaan yhä a:sta,
     vaikka d olisi vasta 1. */
  it('luku ei laske kun porras nousee', () => {
    const av = { a: 3, d: 1 };
    const ennen = L.tmAdarYht(av, 12, 1);
    const jalkeen = L.tmAdarYht(av, 12, Math.max(1, 2 - 1));
    expect(jalkeen, 'vakiintuneiden luku säilyy').toBe(ennen);
    expect(L.tmAdarYht(av, 12, 2), 'valmentajan luku sen sijaan laskee').toBeLessThan(ennen);
  });
});

/* == (11) AJETTU PELAAJANAKYMA ============================================
   Aiempi §7.22-vartija vertasi LIB-funktioita, ei nakymaa — ja siksi se ei nahnyt, etta
   ikasuositus valui "uudeksi taidoksi" jokaiselle 13+ -pelaajalle, jolla ei ole porrasta
   tallennettuna. Tama ryhma ajaa rAdar():n oikeasti ja vertaa tulosta. */
describe('(11) rAdar ajettuna — ilman porrasta mikään ei muutu', () => {
  const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');

  function ajaRAdar(pelaaja) {
    const i = src.indexOf('function rAdar() {');
    let syvyys = 0, runko = '';
    for (let j = src.indexOf('{', i); j < src.length; j++) {
      if (src[j] === '{') syvyys++;
      else if (src[j] === '}') { syvyys--; if (!syvyys) { runko = src.slice(i, j + 1); break; } }
    }
    const store = {
      _pelaaja: pelaaja, console, Math, Number, String, Object, Array, Date, isNaN,
      tmAdarBand: L.tmAdarBand, tmAdarYht: L.tmAdarYht, tmAdarBonusOsat: L.tmAdarBonusOsat,
      tmAdarIkaPorras: L.tmAdarIkaPorras,
      TM_ADAR_PORTAAT: L.TM_ADAR_PORTAAT, TM_ADAR_NIMET: L.TM_ADAR_NIMET,
    };
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    return new Function('__ymp', 'with(__ymp){' + runko + '\nreturn rAdar();}')(ymp);
  }

  const AV = { a: 3, d: 2, ac: 2, r: 1 };
  const N = L.TM_ADAR_NIMET.pelaaja;

  /* Ratkaiseva regressiovartija: nykyisilla pelaajilla EI ole havainto_porras-kenttaa. */
  it.each([[12, ['a']], [14, ['a', 'd', 'ac']], [17, ['a', 'd', 'ac', 'r']]])(
    'ikä %i ilman porrasta: samat ulottuvuudet kuin ennen PR:ää', (ika, odotetut) => {
      const h = ajaRAdar({ ika, adar_viimeisin: AV });
      L.ADAR_JARJ.forEach((dk) => {
        const pitaaNakya = odotetut.indexOf(dk) >= 0;
        const palkkirivi = h.indexOf('>' + N[dk] + '<') >= 0 || h.indexOf('askel: ' + N[dk] + '<') >= 0;
        expect(palkkirivi, 'ikä ' + ika + ' dim ' + dk).toBe(pitaaNakya);
      });
    });

  it.each([12, 14, 17])('ikä %i ilman porrasta: EI "Uusi taito" -riviä', (ika) => {
    expect(ajaRAdar({ ika, adar_viimeisin: AV }), 'ikäsuositus ei ole portaan nosto')
      .not.toContain('Uusi taito');
  });

  it('ilman porrasta kaista lasketaan koko ikäbändistä', () => {
    const h = ajaRAdar({ ika: 14, adar_viimeisin: AV });
    /* (3+2+2)/3 = 2,3 -> "Kehittyva"; jos Ac pudotettaisiin, (3+2)/2 = 2,5 -> "Vahva". */
    expect(h).toContain('Kehittyvä pelinäkemys');
  });

  it('EI VACUOUS: tallennettu porras näkyy merkissä', () => {
    expect(ajaRAdar({ ika: 14, adar_viimeisin: AV, havainto_porras: 2 })).toContain('Porras 2');
  });

  it('porras 2, hist=[2] → uusin ulottuvuus näkyy ILMAN lukua', () => {
    const h = ajaRAdar({
      ika: 12, adar_viimeisin: { a: 3, d: 1 },
      havainto_porras: 2, havainto_porras_ehdotus: { hist: [2], valmis: false },
    });
    expect(h).toContain('Uusi taito');
    expect(h).toContain(N.d);
    /* Jos d olisi palkkirivina, kaista putoaisi: (3+1)/2 = 2 -> "Kehittyva". */
    expect(h, 'kaista ei saa pudota portaan noususta').toContain('Vahva pelinäkemys');
  });

  it('porras 2, hist=[2,3,2] → uusin on vakiintunut ja näkyy lukuineen', () => {
    const h = ajaRAdar({
      ika: 12, adar_viimeisin: { a: 3, d: 1 },
      havainto_porras: 2, havainto_porras_ehdotus: { hist: [2, 3, 2], valmis: false },
    });
    expect(h, 'kolmen havainnon jälkeen taito ei ole enää uusi').not.toContain('Uusi taito');
    expect(h, 'nyt d lasketaan mukaan → kaista putoaa').toContain('Kehittyvä pelinäkemys');
  });

  it('porras 1 ei koskaan tuota "uutta taitoa" (ei edellistä porrasta)', () => {
    const h = ajaRAdar({
      ika: 12, adar_viimeisin: { a: 3 },
      havainto_porras: 1, havainto_porras_ehdotus: { hist: [], valmis: false },
    });
    expect(h).not.toContain('Uusi taito');
  });
});

describe('(12) Master merkitsee "uusi" samalla ehdolla', () => {
  it('merkki vaatii TALLENNETUN portaan ja alle kolme havaintoa', () => {
    const lohko = masterCLohko();
    expect(lohko).toContain('_porrasC && _porrasC > 1 && _ehdHistC.length < 3');
  });

  it('merkki ei nojaa ikäsuositukseen (_porrasNyt)', () => {
    const lohko = masterCLohko();
    const i = lohko.indexOf('const _uusinDim');
    const rivi = lohko.slice(i, lohko.indexOf(';', i));
    expect(rivi, 'ikäsuositus merkitsisi jokaisen 13+ -pelaajan Toteutuksen uudeksi')
      .not.toContain('_porrasNyt');
  });
});
