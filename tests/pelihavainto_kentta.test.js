/* PELIHAVAINTO · KENTTÄTYÖKALU (tuotantosivu) — PR A.
 *
 * Kolme vartijakerrosta:
 *   1. KÄYTETTÄVYYS (§0.1): napautusvalikossa enintään 4 vaihtoehtoa kaikilla rastiyhdistelmillä
 *      ja kolmanneksilla; oman kolmanneksen laukaus on vastustajan laukaus; pelkkä kuljetus ei
 *      avaa valintaa. Nämä ajetaan OIKEALLA funktiolla, ei sen kuvauksella.
 *   2. EI KOPIOITA (§0.2): sivulla ei saa olla omaa xT-taulukkoa, xG-kaavaa, boksirajoja eikä
 *      valintaikkunan lukua. Kopio ajautuisi erilleen libistä, eikä kalibrointi enää näkyisi.
 *   3. DATAMUOTO (§5.6) + luonnos + konseptit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const SIVU = readFileSync(join(juuri, 'TalentMaster_Pelihavainto_Kentta.html'), 'utf8');
const PH = vaadi('../lib/tm_pelihavainto.js');
const TT = vaadi('../lib/tm_teknistaktiset.js');

/* Kommentit pois ennen kieltovartijoita: sivun oma kommentti kertoo mitä EI saa olla, joten
   raaka haku osuisi siihen ja vartija punertaisi juuri siitä että sääntö on kirjattu. */
function ilmanKommentteja(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
const SIVU_KOODI = ilmanKommentteja(SIVU);

/** Poimii nimetyn funktion sivun lähteestä sulkeita laskien. */
function pura(tunniste) {
  const alku = SIVU.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let syvyys = 0;
  for (let j = SIVU.indexOf('{', alku); j < SIVU.length; j++) {
    if (SIVU[j] === '{') syvyys++;
    else if (SIVU[j] === '}') { syvyys--; if (!syvyys) return SIVU.slice(alku, j + 1); }
  }
  throw new Error('sulkeet eivät täsmää: ' + tunniste);
}

/** Ajaa sivun funktion ympäristössä, jossa PH on oikea lib. */
function aja(tunnisteet, palauta, lisa) {
  const store = Object.assign({
    PH, console, Math, JSON, String, Number, Object, Array, Date, isFinite, parseInt,
    window: {}, localStorage: null,
  }, lisa || {});
  store.window.window = store.window;
  const ymp = new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : undefined)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const runko = tunnisteet.map(pura).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('__ymp', 'with(__ymp){' + runko + '\n' + palauta + '}')(ymp);
}

/* ── 1 · KÄYTETTÄVYYS ─────────────────────────────────────────────────── */

describe('(1) napautusvalikko — enintään neljä vaihtoehtoa', () => {
  const valikko = aja(
    ['function napautusvalikonAvaimet(piste, rastit) {'],
    'return napautusvalikonAvaimet;',
    { K: {}, PH },
  );

  const KOLMANNEKSET = [
    ['oma', { len: 15, wid: 50 }],
    ['keski', { len: 50, wid: 50 }],
    ['hyökkäys', { len: 85, wid: 50 }],
  ];
  const AVAIMET = PH.PH_KIRJATTAVAT;

  /* Kaikki 2^9 rastiyhdistelmää × 3 kolmannesta = 1536 ajoa. Tyhjentävä, koska valikon koko on
     käytettävyyssääntö eikä saa rikkoutua yhdelläkään yhdistelmällä. */
  it('yksikään rastiyhdistelmä ei tuota yli neljää vaihtoehtoa', () => {
    const ylitykset = [];
    for (let maski = 0; maski < (1 << AVAIMET.length); maski++) {
      const rastit = {};
      AVAIMET.forEach((a, i) => { if (maski & (1 << i)) rastit[a] = true; });
      KOLMANNEKSET.forEach(([nimi, piste]) => {
        const n = valikko(piste, rastit).length;
        if (n > 4) ylitykset.push(nimi + ' ' + JSON.stringify(Object.keys(rastit)) + ' → ' + n);
      });
    }
    expect(ylitykset.slice(0, 5), 'napautusvalikko ylitti 4 vaihtoehtoa').toEqual([]);
  });

  it('EI VACUOUS: täysillä rasteilla vaihtoehtoja on tasan neljä', () => {
    const kaikki = {};
    AVAIMET.forEach((a) => { kaikki[a] = true; });
    expect(valikko({ len: 50, wid: 50 }, kaikki).length).toBe(4);
    expect(valikko({ len: 15, wid: 50 }, kaikki).length).toBe(4);
  });

  it('omalla kolmanneksella laukaisu on VASTUSTAJAN laukaus', () => {
    const r = { laukaus: true, vastustajan_laukaus: true };
    expect(valikko({ len: 15, wid: 50 }, r)).toContain('vastustajan_laukaus');
    expect(valikko({ len: 15, wid: 50 }, r)).not.toContain('laukaus');
  });

  it('ilman vastustaja-rastia omalla kolmanneksella on oma laukaisu', () => {
    expect(valikko({ len: 15, wid: 50 }, { laukaus: true })).toContain('laukaus');
  });

  it('keski- ja hyökkäyskolmanneksella laukaisu on aina oma', () => {
    const r = { laukaus: true, vastustajan_laukaus: true };
    [{ len: 50, wid: 50 }, { len: 85, wid: 50 }].forEach((p) => {
      expect(valikko(p, r)).toContain('laukaus');
      expect(valikko(p, r)).not.toContain('vastustajan_laukaus');
    });
  });

  it('ilman rasteja valikko on tyhjä (ei avata tyhjää ympyrää)', () => {
    expect(valikko({ len: 50, wid: 50 }, {})).toEqual([]);
  });

  /* Tyhjä lista ei riitä: valitsinta EI saa avata lainkaan, muuten kentälle ilmestyy tyhjä
     ympyrä jonka saa kiinni vain ✕:stä. Ajettu todiste — naytaValitsin-kutsut lasketaan. */
  it('avaaNapautusvalikko ei avaa valitsinta tyhjällä valikolla', () => {
    const avaukset = [];
    const avaa = aja(
      ['function napautusvalikonAvaimet(piste, rastit) {', 'function avaaNapautusvalikko(sp) {'],
      'return avaaNapautusvalikko;',
      {
        K: {}, PH,
        kentalle: () => ({ len: 50, wid: 50 }),
        naytaValitsin: (sp, items) => avaukset.push(items.length),
        lisaa: () => ({}), kysyLaukaus: () => {}, kysyVastustajanLaukaus: () => {},
        kysyRiistonJatko: () => {}, kysy1v1: () => {},
      },
    );
    avaa({ x: 0, y: 0 });
    expect(avaukset, 'tyhjää valitsinta ei saa avata').toEqual([]);
  });

  it('EI VACUOUS: rastien kanssa valitsin avataan ja siinä on oikea määrä', () => {
    const avaukset = [];
    const avaa = aja(
      ['function napautusvalikonAvaimet(piste, rastit) {', 'function avaaNapautusvalikko(sp) {'],
      'return avaaNapautusvalikko;',
      {
        K: { laukaus: true, riisto: true, menetys: true, v1: true }, PH,
        kentalle: () => ({ len: 50, wid: 50 }),
        naytaValitsin: (sp, items) => avaukset.push(items.length),
        lisaa: () => ({}), kysyLaukaus: () => {}, kysyVastustajanLaukaus: () => {},
        kysyRiistonJatko: () => {}, kysy1v1: () => {},
      },
    );
    avaa({ x: 0, y: 0 });
    expect(avaukset).toEqual([4]);
  });
});

describe('(2) pyyhkäisy — pelkkä kuljetus ei avaa valintaa', () => {
  /* Rastit vain KARSIVAT: jos syöttö on pois, siirron tyyppi on tiedossa eikä sitä kysytä. */
  const f = pura('function kysySiirronTyyppi(sp, alku, loppu) {');

  it('ilman syotto-rastia kirjataan suoraan kuljetus ilman valitsinta', () => {
    expect(f).toContain('if (!K.syotto) { var ek = lisaa({ tyyppi: \'kuljetus\'');
    const ennenValitsinta = f.slice(0, f.indexOf('naytaValitsin'));
    expect(ennenValitsinta, 'kuljetuspolku on ENNEN valitsinta').toContain('!K.syotto');
  });

  it('ilman kumpaakaan rastia ei kirjata mitään', () => {
    expect(f).toContain('if (!K.syotto && !K.kuljetus) return;');
  });

  it('kuljetus lisätään valintoihin vain rastin kanssa', () => {
    expect(f).toContain('if (K.kuljetus) items.push(');
  });
});

describe('(3) reaktiokysely seuraa rastia', () => {
  it('kysely avataan vain kun reaktio-rasti on päällä', () => {
    expect(pura('function lisaa(m) {')).toContain('if (vaatiiReaktion(m) && K.reaktio) kysyReaktio(m);');
  });

  it('jatkopyyhkäisyä ei pyydetä, jos lajin rasti on pois', () => {
    expect(pura('function odotaPyyhkaisya(piste, juuriId, laji) {')).toContain('if (!K[laji]) { piirra(); return; }');
  });
});

/* ── 2 · EI KOPIOITA ──────────────────────────────────────────────────── */

describe('(4) laskenta tulee VAIN libistä', () => {
  const SKRIPTIT = SIVU.split('<script').slice(1).map((s) => s.slice(s.indexOf('>') + 1));
  const koodi = SKRIPTIT.join('\n');

  it('ei omaa xT-ruudukkoa', () => {
    /* xT-solut ovat 0,00x–0,25 -desimaaleja; taulukko paljastuisi tiheänä desimaalirivistönä. */
    expect(koodi).not.toMatch(/0\.0063830/);
    expect(koodi).not.toMatch(/\[\s*0\.\d{6}\s*,\s*0\.\d{6}\s*,/);
  });

  it('ei omaa xG-kaavaa (kertoimet ovat libissä)', () => {
    expect(koodi).not.toContain('7.32');
    expect(koodi).not.toMatch(/1\.6\s*\*\s*a/);
    expect(koodi).not.toMatch(/Math\.exp\(-\(/);
  });

  it('ei omia boksirajoja', () => {
    expect(koodi).not.toMatch(/len\s*>=\s*84/);
    expect(koodi).not.toMatch(/wid\s*<=\s*79/);
  });

  it('ei omaa kolmannesrajaa (phVyohyke ratkaisee)', () => {
    expect(koodi).not.toMatch(/66\.7/);
    expect(koodi).not.toMatch(/33\.3/);
  });

  it('valintaikkunan luku tulee libistä, ei kovakoodattuna', () => {
    expect(koodi).not.toMatch(/\b6000\b/);
    expect(koodi).not.toMatch(/\b4000\b/);
    expect(koodi).toContain('PH.PH_VALINTA_IKKUNA_MS');
  });

  it('näytön kääntö tulee libistä (phNaytolle/phNaytolta), ei omaa peilausta', () => {
    expect(koodi).toContain('PH.phNaytolle(');
    expect(koodi).toContain('PH.phNaytolta(');
    expect(koodi).not.toMatch(/function\s+flipX/);
    expect(koodi).not.toMatch(/100\s*-\s*p\.len/);   // oma peilaus
  });

  it('arvot, ketjut ja yhteenveto tulevat libin funktioista', () => {
    ['PH.phArvo(', 'PH.phYhteenveto(', 'PH.phKetjut(', 'PH.phKetjuNimi(', 'PH.phVyohyke(',
      'PH.phPohja(', 'PH.phIkataso(', 'PH.phNaytaLuvut(', 'PH.PH_KIRJATTAVAT'].forEach((s) => {
      expect(koodi, s + ' puuttuu → laskenta ei tule libistä').toContain(s);
    });
  });

  it('lib ladataan script-tagilla', () => {
    expect(SIVU).toMatch(/<script src="lib\/tm_pelihavainto\.js/);
    expect(SIVU).toMatch(/<script src="lib\/tm_xt\.js/);
  });
});

/* ── 3 · DATAMUOTO, LUONNOS, KONSEPTIT ────────────────────────────────── */

describe('(5) datamuoto on sama kuin tallennettava (§5.6)', () => {
  const koodi = SIVU;

  it('käytetään tyyppi/alku/loppu/piste, EI mockupin type/from/to/at', () => {
    ['tyyppi:', 'alku:', 'loppu:', 'piste:'].forEach((s) => expect(koodi).toContain(s));
    expect(koodi).not.toMatch(/\{\s*type:\s*'/);
    expect(koodi).not.toMatch(/\bfrom:\s*from\b/);
    expect(koodi).not.toMatch(/\bto:\s*to\b/);
    expect(koodi).not.toMatch(/\bat:\s*at\b/);
  });

  it('skannasi ja vastustajan_laukaus ovat kanonisilla nimillä', () => {
    expect(koodi).toContain("'skannasi'");
    expect(koodi).toContain('vastustajan_laukaus');
    expect(koodi).not.toMatch(/\bvlauk\b/);
    expect(koodi).not.toMatch(/'skan'/);
    /* Rastiavaimet ovat libin PH_KIRJATTAVAT, eivät sivun omia nimiä. */
    PH.PH_KIRJATTAVAT.forEach((a2) => expect(koodi, 'rastiavain ' + a2).toContain(a2));
  });

  it('dokumentti ei sisällä laskettuja arvoja', () => {
    const f = pura('function dokumentti() {');
    ['xg', 'uhka', 'pisteet', 'yhteenveto'].forEach((s) => {
      expect(f.toLowerCase(), 'laskettua arvoa ei tallenneta (§5.6)').not.toContain(s);
    });
    expect(f).toContain('merkinnat: S.merkinnat');
    expect(f).toContain('kirjattavat: rastitListaksi()');
  });

  it('kaikki merkintätyypit ovat libin tuntemia', () => {
    const tyypit = [...SIVU.matchAll(/tyyppi:\s*'([a-z_]+)'/g)].map((m) => m[1]);
    const SALLITUT = ['syotto', 'kuljetus', 'etenee', 'juoksu', 'riisto', 'laukaus', 'menetys',
      'kaksinpeli', 'hetki', 'laukaus_vastaan'];
    expect(tyypit.length).toBeGreaterThan(5);
    expect([...new Set(tyypit)].filter((t) => SALLITUT.indexOf(t) < 0)).toEqual([]);
  });
});

describe('(6) luonnos — offline-first', () => {
  function luonnosApi(muisti) {
    const store = {};
    const ls = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => {
        if (muisti === 'kaatuu') throw new Error('QuotaExceeded');
        store[k] = v;
      },
      removeItem: (k) => { delete store[k]; },
    };
    const S = {
      seuraId: 'sjk', pelaajaId: 'p1', merkinnat: [{ id: 1, tyyppi: 'laukaus', piste: { len: 88, wid: 50 }, t: 12 }],
      seq: 1, puoliaika: 1, seisoo: 'lahi', pelimuoto: '11v11', pelipaikka: 'LA',
      vastustaja: 'FC X', kalenteriId: null, alkoi: 1000,
    };
    const api = aja(
      ['function luonnosAvain() {', 'function tallennaLuonnos() {', 'function lataaLuonnos() {', 'function poistaLuonnos() {'],
      'return { avain: luonnosAvain, tallenna: tallennaLuonnos, lataa: lataaLuonnos, poista: poistaLuonnos };',
      {
        S, K: { syotto: true }, PH, localStorage: ls,
        rastitListaksi: () => ['syotto'],
        asetaPohja: (pp) => { S.pelipaikka = pp; },
        q: () => ({ textContent: '' }),
        phT: (s) => s,
      },
    );
    return { api, S, store };
  }

  it('avain erottelee seuran, pelaajan, päivän ja puoliajan', () => {
    const { api } = luonnosApi();
    expect(api.avain()).toMatch(/^tm_ph_luonnos_sjk_p1_\d{4}-\d{2}-\d{2}_1$/);
  });

  it('tallennus ja palautus säilyttävät merkinnät ja rastit', () => {
    const { api, S, store } = luonnosApi();
    api.tallenna();
    expect(Object.keys(store).length).toBe(1);
    S.merkinnat = [];
    S.seq = 0;
    expect(api.lataa()).toBe(true);
    expect(S.merkinnat.length).toBe(1);
    expect(S.merkinnat[0].tyyppi).toBe('laukaus');
    expect(S.vastustaja).toBe('FC X');
  });

  it('poisto tyhjentää luonnoksen', () => {
    const { api, store } = luonnosApi();
    api.tallenna();
    api.poista();
    expect(Object.keys(store).length).toBe(0);
  });

  /* Luonnos on koko offline-lupaus: jos sitä ei kirjoiteta JOKAISEN merkinnän jälkeen, kentällä
     kaatunut selain vie kirjaukset mukanaan. Ajettu todiste, ei grep. */
  it('jokainen merkintä tallentaa luonnoksen', () => {
    const kutsut = [];
    const lisaa = aja(
      ['function lisaa(m) {'],
      'return lisaa;',
      {
        S: { seq: 0, merkinnat: [], viimeisinId: null, alkoi: Date.now(), puoliaika: 1 },
        K: {}, PH,
        kelloSekunnit: () => 5,
        varise: () => {}, piirra: () => {}, naytaKumoa: () => {},
        tallennaLuonnos: () => kutsut.push(1),
        vaatiiReaktion: () => false, kysyReaktio: () => {},
      },
    );
    lisaa({ tyyppi: 'menetys', piste: { len: 20, wid: 50 } });
    lisaa({ tyyppi: 'laukaus', piste: { len: 88, wid: 50 } });
    expect(kutsut.length, 'luonnos on tallennettava joka merkinnästä').toBe(2);
  });

  it('localStorage-virhe EI kaada kirjaamista', () => {
    const { api } = luonnosApi('kaatuu');
    expect(() => api.tallenna()).not.toThrow();
  });

  it('tyhjä tai rikkinäinen luonnos palauttaa false eikä kaadu', () => {
    const { api, store } = luonnosApi();
    expect(api.lataa()).toBe(false);
    store[api.avain()] = '{rikki';
    expect(() => api.lataa()).not.toThrow();
    expect(api.lataa()).toBe(false);
  });
});

describe('(7) konseptit — kanoniset avaimet ja pelipaikkaehto', () => {
  function ryhmat(pelipaikka, jaksofokus) {
    return aja(
      ['function konseptiRyhmat() {'],
      'return konseptiRyhmat();',
      {
        S: { seuraId: 'sjk', pelipaikka: pelipaikka, jaksofokus: jaksofokus || null },
        PH, phT: (s) => s,
        window: { TM_TT_API: TT },
        tmKonseptiListaa: (items) => items || [],
        tmKonseptiResolvoi: (a) => (a ? { avain: a, nimi: 'X', koodi: 'K' } : null),
        tmKonseptiOnPiilotettu: () => false,
      },
    );
  }

  it('ilman pelipaikkaa EI näytetä pelipaikan fundamentteja', () => {
    const g = ryhmat('');
    const avaimet = g.flatMap((r) => r[1].map((c) => c.avain));
    const fundamentit = Object.keys(TT.TM_TT_FUNDAMENTIT).flatMap((pp) => TT.TM_TT_FUNDAMENTIT[pp].map((c) => c.avain));
    expect(avaimet.filter((a) => fundamentit.indexOf(a) >= 0), 'pelipaikka on valinnainen').toEqual([]);
  });

  it('EI VACUOUS: pelipaikan kanssa fundamentit tulevat mukaan', () => {
    const pp = Object.keys(TT.TM_TT_FUNDAMENTIT)[0];
    const avaimet = ryhmat(pp).flatMap((r) => r[1].map((c) => c.avain));
    const omat = TT.TM_TT_FUNDAMENTIT[pp].map((c) => c.avain);
    expect(avaimet.some((a) => omat.indexOf(a) >= 0)).toBe(true);
  });

  it('yksilökonseptit ja joukkueen siirtymät näkyvät aina', () => {
    const avaimet = ryhmat('').flatMap((r) => r[1].map((c) => c.avain));
    expect(avaimet).toContain(TT.TM_TT_YOUTH[0].avain);
    expect(avaimet).toContain(TT.TM_TT_JOUKKUE[0].avain);
  });

  it('jaksofokus on ENSIMMÄISENÄ eikä toistu alempana', () => {
    const jf = TT.TM_TT_YOUTH[0].avain;
    const g = ryhmat('', jf);
    expect(g[0][1][0].avain).toBe(jf);
    const muut = g.slice(1).flatMap((r) => r[1].map((c) => c.avain));
    expect(muut.filter((a) => a === jf), 'jaksofokus toistui').toEqual([]);
  });

  it('valikon arvo on KANONINEN avain, ei näyttönimi', () => {
    const f = pura('function piirra() {');
    expect(f).toContain('op.value = c.avain;');
  });

  it('konseptit kulkevat resolvoinnin kautta (seuran nimet ja piilotukset)', () => {
    expect(SIVU).toContain('tmKonseptiListaa(');
    expect(SIVU).toContain('tmKonseptiResolvoi(');
    expect(SIVU).toMatch(/<script src="lib\/tm_konsepti_resolve\.js/);
  });
});

describe('(8) §7.22 · U8–12 ei näe lukuja', () => {
  it('arvo korvautuu pisteellä kun phNaytaLuvut on false', () => {
    const f = pura('function tiedot(m) {');
    expect(f).toContain("if (!naytaLuvut()) { o.arvo = '·'");
    expect(pura('function naytaLuvut() {')).toContain('PH.phNaytaLuvut(S.ikataso)');
  });

  it('yhteenveto piilotetaan kokonaan U8–12-tasolla', () => {
    expect(pura('function piirraYhteenveto() {')).toContain('if (!naytaLuvut()) {');
  });
});

describe('(9) tässä PR:ssä ei kirjoiteta Firestoreen', () => {
  /* Rajaus on FIRESTORE-kirjoitus, ei mikä tahansa .set — Map.set on eri asia. Siksi vartija
     osuu Firestore-ketjuihin ja aikaleimaan, ei nimen loppuosaan. */
  it('sivu ei kirjoita pelihavaintoa Firestoreen (tallennus on PR B)', () => {
    expect(SIVU_KOODI, 'doc().set').not.toMatch(/\.doc\([^)]*\)[\s\S]{0,40}?\.set\(/);
    expect(SIVU_KOODI, 'collection().add').not.toMatch(/\.collection\([^)]*\)[\s\S]{0,40}?\.add\(/);
    expect(SIVU_KOODI, 'update').not.toMatch(/\.update\(/);
    expect(SIVU_KOODI, 'runTransaction').not.toMatch(/runTransaction/);
    expect(SIVU_KOODI, 'serverTimestamp').not.toMatch(/serverTimestamp/);
  });

  it('EI VACUOUS: sivu kuitenkin LUKEE Firestoresta (pelaaja ja seura)', () => {
    expect(SIVU_KOODI).toMatch(/\.doc\(S\.pelaajaId\)\.get\(\)/);
  });

  it('Tallenna-nappi tallentaa laitteelle ja sanoo sen', () => {
    expect(SIVU).toContain("phT('tallennettu laitteelle')");
  });

  /* §18: jäsenyys on KAHDESSA kentässä ja yhden kentän kysely jättäisi puolet pelaajista pois.
     Ajettu todiste tyngällä: molemmat kyselyt on tehtävä ja tulokset yhdistettävä doc-ID:llä. */
  function ajaHaku(joukkueNimi, joukkueId) {
    const kyselyt = [];
    const doc = (id, data) => ({ id, data: () => data });
    const col = {
      where(kentta, op, arvo) {
        kyselyt.push(kentta + ' ' + op + ' ' + arvo);
        const osumat = kentta === 'joukkue'
          ? [doc('a', { sukunimi: 'A', joukkue: arvo }), doc('yhteinen', { sukunimi: 'Y' })]
          : [doc('b', { sukunimi: 'B' }), doc('yhteinen', { sukunimi: 'Y' })];
        return { get: async () => ({ docs: osumat }) };
      },
      limit() { kyselyt.push('limit'); return { get: async () => ({ docs: [] }) }; },
    };
    const hae = aja(
      ['async function haeJoukkueenPelaajat(joukkueNimi, joukkueId) {'],
      'return haeJoukkueenPelaajat;',
      {
        S: { seuraId: 'sjk' }, Promise, Map,
        _db: { collection: () => ({ doc: () => ({ collection: () => col }) }) },
      },
    );
    return hae(joukkueNimi, joukkueId).then((r) => ({ kyselyt, tulos: r }));
  }

  it('pelaajahaku tekee MOLEMMAT §18-kyselyt', async () => {
    const { kyselyt } = await ajaHaku('SJK P13', 'sjk_p13');
    expect(kyselyt).toContain('joukkue == SJK P13');
    expect(kyselyt).toContain('joukkueet array-contains sjk_p13');
    expect(kyselyt.length, 'molemmat kyselyt, ei enempää').toBe(2);
  });

  it('tulokset yhdistetään doc-ID:llä — sama pelaaja ei tule kahdesti', async () => {
    const { tulos } = await ajaHaku('SJK P13', 'sjk_p13');
    const idt = tulos.map((p) => p.id).sort();
    expect(idt).toEqual(['a', 'b', 'yhteinen']);
  });

  it('kummankin kentän pelaaja löytyy (yhden kyselyn haku pudottaisi toisen)', async () => {
    const { tulos } = await ajaHaku('SJK P13', 'sjk_p13');
    expect(tulos.some((p) => p.id === 'a'), 'nimikentän pelaaja puuttuu').toBe(true);
    expect(tulos.some((p) => p.id === 'b'), 'joukkueet[]-pelaaja puuttuu').toBe(true);
  });

  it('ilman joukkuetietoa haetaan seuran pelaajat rajatusti', async () => {
    const { kyselyt } = await ajaHaku(null, null);
    expect(kyselyt).toEqual(['limit']);
  });
});

describe('(10) konventiot', () => {
  it('yksi @media(max-width:768px) -lohko (§6)', () => {
    /* Lasketaan vain aidot at-säännöt (perässä lohkon avaus) — kommentissa oleva maininta ei ole
       lohko eikä kumoa mitään. */
    const n = (ilmanKommentteja(SIVU).match(/@media\s*\(max-width:\s*768px\)\s*\{/g) || []).length;
    expect(n, 'kaksi lohkoa kumoaisi toisensa').toBe(1);
  });

  it('App Check aktivoidaan heti initin jälkeen (§38)', () => {
    const i = SIVU.indexOf('firebase.initializeApp');
    const a = SIVU.indexOf('tmAppCheckAktivoi()');
    const ensiKutsu = Math.min(
      ...[SIVU.indexOf('_db.collection'), SIVU.indexOf('_auth.onAuthStateChanged')].filter((x) => x > 0),
    );
    expect(i).toBeGreaterThan(0);
    expect(a, 'aktivointi ennen initiä').toBeGreaterThan(i);
    expect(a, 'aktivointi ENNEN ensimmäistä backend-kutsua').toBeLessThan(ensiKutsu);
  });

  it('kielletyt design-arvot eivät esiinny (§5)', () => {
    expect(SIVU_KOODI).not.toMatch(/#3EC9A7|#4A7ED9|#06090F/i);
    expect(SIVU_KOODI).not.toContain('Playfair Display');
    expect(SIVU_KOODI).toContain('#28B090');
    expect(SIVU_KOODI).toContain('Cormorant Garamond');
  });

  it('näyttötekstit kulkevat phT:n kautta', () => {
    expect(SIVU).toContain('function phT(fi)');
    expect(SIVU).toContain('tmI18nResolve(fi, null)');
  });

  it('SA:lle seuravalitsin on pakollinen (§3: automaattihaku antaisi satunnaisen seuran)', () => {
    const f = pura('async function alusta() {');
    expect(f).toContain('if (!S.seuraId) { await naytaSeuraValitsin(); return; }');
  });
});
