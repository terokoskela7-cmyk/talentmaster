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

/** Sama poiminta toisesta lähteestä (VP/Master). */
function pura2(lahde, tunniste) {
  const alku = lahde.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let syvyys = 0;
  for (let j = lahde.indexOf('{', alku); j < lahde.length; j++) {
    if (lahde[j] === '{') syvyys++;
    else if (lahde[j] === '}') { syvyys--; if (!syvyys) return lahde.slice(alku, j + 1); }
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

  /* JÄRJESTYS ON TIETOINEN: puolustajan omassa päässä yleisimmät tilanteet ovat riisto, 1v1 ja
     menetys. Vastustajan laukaus oli ensimmäisenä, isoimmalla paikalla ja punaisena, mikä
     näyttäytyi kentällä siten että "omassa puolustuspäässä se ehdotti laukauksen blokkaamista".
     Kyse ei ollut suuntabugista vaan järjestyksestä. */
  it('OMALLA KOLMANNEKSELLA järjestys on Riisto · 1v1 · Menetys · Vastustaja laukoi', () => {
    const kaikki = {};
    PH.PH_KIRJATTAVAT.forEach((a2) => { kaikki[a2] = true; });
    expect(valikko({ len: 15, wid: 50 }, kaikki))
      .toEqual(['riisto', 'v1', 'menetys', 'vastustajan_laukaus']);
  });

  it('muualla kentällä järjestys säilyy ennallaan (laukaisu ensin)', () => {
    const kaikki = {};
    PH.PH_KIRJATTAVAT.forEach((a2) => { kaikki[a2] = true; });
    [{ len: 50, wid: 50 }, { len: 85, wid: 50 }].forEach((piste) => {
      expect(valikko(piste, kaikki)).toEqual(['laukaus', 'riisto', 'menetys', 'v1']);
    });
  });

  it('valikon teksti on "Vastustaja laukoi" (selkeämpi kuin "Vastustajan laukaus")', () => {
    const f = pura('function avaaNapautusvalikko(sp) {');
    expect(f).toContain("t: 'Vastustaja laukoi'");
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

  it('kaikki MERKINTÖJEN tyypit ovat libin tuntemia', () => {
    /* Dokumentin oma `tyyppi: 'kenttatarkkailu'` on eri asia kuin merkinnän tyyppi — se rajataan
       pois, koska se ei kuulu merkintöjen enumiin. */
    const tyypit = [...SIVU.matchAll(/tyyppi:\s*'([a-z_]+)'/g)]
      .map((m) => m[1]).filter((x) => x !== 'kenttatarkkailu');
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
      vastustaja: 'FC X', kalenteriId: null, alkoi: 1000, otteluAvain: '2026-09-28_1000',
    };
    const api = aja(
      ['function luonnosEtuliite() {', 'function luonnosAvain() {', 'function tallennaLuonnos() {',
        'function lataaLuonnos(avain) {', 'function poistaLuonnos() {'],
      'return { avain: luonnosAvain, tallenna: tallennaLuonnos, lataa: lataaLuonnos, poista: poistaLuonnos };',
      {
        S, K: { syotto: true }, PH, localStorage: ls, LUONNOS_ETULIITE: 'tm_ph_luonnos_',
        rastitListaksi: () => ['syotto'],
        asetaPohja: (pp) => { S.pelipaikka = pp; },
        q: () => ({ textContent: '' }),
        phT: (s) => s,
      },
    );
    return { api, S, store };
  }

  /* Avain erottelee seuran, pelaajan ja OTTELUN — ei puoliaikaa (§review 1). */
  it('avain erottelee seuran, pelaajan ja ottelun', () => {
    const { api } = luonnosApi();
    expect(api.avain()).toBe('tm_ph_luonnos_sjk_p1_2026-09-28_1000');
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

describe('(9) tallennus — oma kokoelma, kielletyt kentät, idempotenssi', () => {
  /* Tallennus menee OMAAN `kenttatarkkailut`-kokoelmaan, EI `havainnot`-kokoelmaan. Syy on
     tietosuoja: `havainnot`-lukusääntö sisältää onAnonymous()-ehdon (pelaajan PIN-istunto)
     eikä sitä ole rajattu omaan pelaajaan. */
  it('kirjoitus menee kenttatarkkailut-kokoelmaan, EI havainnot-kokoelmaan', () => {
    const f = pura('async function tallennaFirestoreen() {');
    expect(f).toContain("collection('kenttatarkkailut')");
    expect(f).not.toContain("collection('havainnot')");
    expect(SIVU_KOODI).not.toMatch(/collection\('havainnot'\)/);
  });

  it('payload EI sisällä kiellettyjä kenttiä (§5.6)', () => {
    const f = pura('function tarkkailuPayload() {');
    ['pisteet', 'narratiivi', 'teksti', 'oppimisnakokohta'].forEach((k) => {
      expect(f, 'kielletty kenttä ' + k).not.toMatch(new RegExp('\\b' + k + '\\s*:'));
    });
  });

  it('payload EI sisällä laskettuja arvoja — vain raakamerkinnät ja malli-id:t', () => {
    const f = pura('function tarkkailuPayload() {');
    expect(f).toContain('merkinnat: d.merkinnat');
    expect(f).toContain('malli:');
    ['xgSumma', 'uhka', 'yhteenveto', 'ketjut'].forEach((k) => {
      expect(f.toLowerCase(), 'laskettua arvoa ei tallenneta').not.toContain(k.toLowerCase());
    });
  });

  /* YKSI DOKUMENTTI PER OTTELU. Puoliaika EI saa olla osa id:tä: työkalu pitää molemmat
     puoliajat samassa istunnossa ja tallentaa kaikki merkinnät, joten puoliaikakohtainen id
     kahdentaisi 1. puoliajan ja ylikirjoittaisi luonnoksia. */
  it('dokumentti-id on ottelu + valmentaja, EI puoliaika', () => {
    const f = pura('function tarkkailuId() {');
    expect(f).toContain('S.otteluAvain');
    expect(f).toContain('S.uid');
    expect(f, 'puoliaika ei kuulu identiteettiin').not.toContain('S.puoliaika');
  });

  /* Rules (v3.20) vaatii id:n päättyvän RAAKAAN request.auth.uid:hen. Jos klientti muuntaisi
     uid:n (esim. siivoaisi merkkejä), luonti estyisi — ja virhe näkyisi vasta kentällä. */
  it('id päättyy muuntamattomaan uid:hen (Rules-lukko vertaa raakaan uid:hen)', () => {
    const f = pura('function tarkkailuId() {');
    expect(f, 'uid:tä ei saa siivota').not.toMatch(/S\.uid[^;]*replace\(/);
    const id = aja(['function tarkkailuId() {'], 'return tarkkailuId();',
      { S: { otteluAvain: '2026-09-28_1000', uid: 'AbC123xyz' } });
    expect(id).toBe('2026-09-28_1000_AbC123xyz');
    expect(id.endsWith('AbC123xyz'), 'Rules-regex .*_<uid> ei täsmäisi').toBe(true);
  });

  it('payload kantaa puoliajat JOHDETTUNA merkinnöistä', () => {
    const f = pura('function tarkkailuPayload() {');
    expect(f).toContain('puoliajat: puoliajatMerkinnoista(d.merkinnat)');
    expect(f, 'yksittäinen puoliaika kertoisi väärin').not.toMatch(/puoliaika:\s*S\.puoliaika/);
  });

  it('ottelun pvm on ALOITUSpäivä paikallisena, ei tallennushetki UTC:nä', () => {
    const f = pura('function tarkkailuPayload() {');
    expect(f).toContain('paikallinenPvm(S.alkoi)');
    expect(f).not.toContain('toISOString().slice(0, 10)');
  });

  it('luotu lähetetään VAIN luonnissa (A5 + Rules-vartija)', () => {
    const f = pura('async function tallennaFirestoreen() {');
    expect(f).toContain('if (!snap.exists) data.luotu = firebase.firestore.FieldValue.serverTimestamp();');
    /* Ehdoton serverTimestamp nollaisi alkuperäisen aikaleiman uudelleentallennuksessa. */
    expect(f).not.toMatch(/^\s*data\.luotu = firebase/m);
  });

  it('tuore token ennen kirjoitusta (§7.2)', () => {
    expect(pura('async function tallennaFirestoreen() {')).toContain('getIdToken(true)');
  });

  it('luonnos poistetaan VASTA onnistuneen kirjoituksen jälkeen', () => {
    const f = pura('async function tallennaFirestoreen() {');
    const iSet = f.indexOf('await ref.set(');
    const iPoisto = f.indexOf('poistaLuonnos()');
    expect(iSet).toBeGreaterThan(0);
    expect(iPoisto, 'poisto ennen kirjoitusta hävittäisi kirjaukset').toBeGreaterThan(iSet);
    /* Virhehaarassa luonnosta EI poisteta. */
    const catchOsa = f.slice(f.indexOf('} catch'));
    expect(catchOsa).not.toContain('poistaLuonnos()');
    expect(catchOsa).toContain('tallessa laitteella');
  });

  it('lähde merkitään (live vs. myöhemmin video)', () => {
    expect(pura('function tarkkailuPayload() {')).toContain("lahde: 'live'");
  });

  it('EI VACUOUS: sivu lukee Firestoresta myös pelaajan', () => {
    expect(SIVU_KOODI).toMatch(/\.doc\(S\.pelaajaId\)\.get\(\)/);
  });

  it('Tallenna tallentaa ensin laitteelle ja vasta sitten verkkoon', () => {
    expect(SIVU).toContain("phT('tallennettu laitteelle')");
    const f = pura("    q('btnTallenna').onclick = function () {");
    expect(f.indexOf('tallennaLuonnos()')).toBeLessThan(f.indexOf('tallennaFirestoreen()'));
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

/* ── 4 · LUKU-TILA ────────────────────────────────────────────────────── */

describe('(11) luku-tila (?tarkkailuId=)', () => {
  it('luku-tilassa eleitä ei kytketä eikä keskeneräistä kysytä', () => {
    const f = pura('  async function kaynnista() {');
    expect(f).toContain('if (!S.lukutila) alustaEleet();');
    expect(f).toContain('if (!S.lukutila && !S.otteluAvain) {');
  });

  it('luku-tilassa kirjaus- ja tallennusnapit piilotetaan', () => {
    const f = pura('async function kaynnista() {');
    expect(f).toContain("['btnKumoa', 'btnHetki', 'btnTallenna']");
    /* Tallennustila kulkee nyt yhden funktion kautta (yläpalkin piste + lehden teksti),
       joten vartija seuraa sitä eikä yhtä textContent-sijoitusta. */
    expect(f).toContain("asetaTallennustila('luku')");
    const s = pura('function asetaTallennustila(tila) {');
    expect(s, 'luku-tila ei kerro käyttäjälle että kyse on vain luvusta').toContain("luku: 'vain luku'");
  });

  it('luku-tila käyttää SAMAA läpikäyntiä (ei erillistä katselunäkymää)', () => {
    /* Erillinen katselupolku ajautuisi erilleen ja näyttäisi eri luvut kuin työkalu. */
    const f = pura('async function lataaTarkkailu(id) {');
    expect(f).toContain('S.merkinnat =');
    expect(f).toContain('S.lukutila = true;');
    expect(SIVU_KOODI).not.toMatch(/function\s+piirraLukutila/);
  });
});

/* ── 5 · YKSI SISÄÄNKÄYNTI ────────────────────────────────────────────── */

describe('(12) yksi sisäänkäynti — kaikki reitit jaetun funktion kautta (§7)', () => {
  const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
  const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
  const VALINTA = vaadi('../lib/tm_pelihavainto_valinta.js');

  it('molemmat sovellukset lataavat jaetun kirjaston', () => {
    expect(VP).toMatch(/<script src="lib\/tm_pelihavainto_valinta\.js/);
    expect(MASTER).toMatch(/<script src="lib\/tm_pelihavainto_valinta\.js/);
  });

  /* AJETTU todiste, ei grep: `if (false) tmPhAvaaValinta(...)` jättäisi merkkijonon paikalleen
     ja grep-vartija pysyisi vihreänä vaikka reitti ohittaisi valintaikkunan. */
  function ajaSisaankaynti(lahde, tunniste, kutsuNimi, lisa) {
    const kutsut = [];
    const avaukset = [];
    const store = Object.assign({
      console, Math, JSON, String, Number, Object, Array,
      tmPhAvaaValinta: (o) => { kutsut.push(o); return {}; },
      _seuraId: 'sjk',
      window: { open: (u) => avaukset.push(u) },
      document: { getElementById: () => null },
    }, lisa || {});
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    const fn = new Function('__ymp', 'with(__ymp){' + pura2(lahde, tunniste) + '\nreturn ' + kutsuNimi + ';}')(ymp);
    fn('p1', 'Testi Pelaaja');
    return { kutsut, avaukset };
  }

  it('VP:n sisäänkäynti KUTSUU jaettua funktiota eikä avaa työkalua suoraan', () => {
    const r = ajaSisaankaynti(
      VP,
      'window.avaaAdarKenttatyokalu = window.avaaAdarKenttatyokalu || function (pelaajaId, pelaajaNimi) {',
      'window.avaaAdarKenttatyokalu',
    );
    expect(r.kutsut.length, 'valintaikkunaa ei kutsuttu').toBe(1);
    expect(r.kutsut[0].pelaajaId).toBe('p1');
    expect(r.kutsut[0].seuraId).toBe('sjk');
    expect(r.avaukset, 'työkalu avattiin suoraan valintaikkunan ohi').toEqual([]);
  });

  it('Masterin sisäänkäynti KUTSUU jaettua funktiota', () => {
    const r = ajaSisaankaynti(
      MASTER,
      'function _avaaPikakorttiIframe(pid) {',
      '_avaaPikakorttiIframe',
      { _pelaajatData: [{ id: 'p1', etunimi: 'Testi', sukunimi: 'Pelaaja', joukkue: 'SJK P13' }],
        _avaaPikakorttiUpotettu: () => { throw new Error('upotettu avattiin valintaikkunan ohi'); } },
    );
    expect(r.kutsut.length, 'valintaikkunaa ei kutsuttu').toBe(1);
    expect(r.kutsut[0].pelaajaId).toBe('p1');
    expect(r.kutsut[0].joukkue).toBe('SJK P13');
  });

  it('Masterin valinta ohjaa ottelun omaan välilehteen ja yksittäisen upotukseen', () => {
    const avaukset = [];
    const upotetut = [];
    const r = ajaSisaankaynti(
      MASTER,
      'function _avaaPikakorttiIframe(pid) {',
      '_avaaPikakorttiIframe',
      { _pelaajatData: [{ id: 'p1' }],
        _avaaPikakorttiUpotettu: (pid) => upotetut.push(pid),
        tmPhAvaaValinta: (o) => { o.avaa('URL_OTTELU', 'ottelu'); o.avaa('URL_YKSI', 'yksi'); return {}; },
        window: { open: (u) => avaukset.push(u) } },
    );
    expect(avaukset, 'ottelu kuuluu omaan välilehteen').toEqual(['URL_OTTELU']);
    expect(upotetut, 'yksittäinen havainto upotetaan kuten ennen').toEqual(['p1']);
    expect(r.kutsut.length).toBe(0);   // stubattu tmPhAvaaValinta ei kirjaa kutsuja
  });

  it('pelaajakortin CTA ohjaa samaan sisäänkäyntiin (delegoitu, ei inline onclick)', () => {
    expect(VP).toContain('jsp-ph-cta');
    expect(VP).toContain("closest('.jsp-ph-cta')");
    expect(VP).toContain('avaaAdarKenttatyokalu(a.getAttribute');
  });

  it('VP:n datapolku käyttää samaa funktiota', () => {
    expect(VP).toContain("fn: 'avaaAdarKenttatyokalu()'");
  });

  /* Kopio kahdessa paikassa ajautuisi erilleen: käyttäjä näkisi eri vaihtoehdot riippuen
     siitä mistä hän tuli. Vartija vaatii, ettei valintaikkunaa rakenneta sovelluksissa. */
  it('valintaikkunaa EI rakenneta sovelluksissa (vain libissä)', () => {
    /* Kommentit riisutaan: sisäänkäynnin KUVAUS mainitsee vaihtoehtojen nimet, eikä vartija saa
       punertaa siitä että ratkaisu on dokumentoitu. */
    [VP, MASTER].forEach((src) => {
      const koodi = ilmanKommentteja(src);
      expect(koodi).not.toContain('data-ph-valinta');
      expect(koodi).not.toContain('Yksi havainto nyt');
      expect(koodi).not.toContain('Seuraan ottelua');
    });
  });

  it('EI VACUOUS: libissä vaihtoehdot ovat', () => {
    const lib = readFileSync(join(juuri, 'lib/tm_pelihavainto_valinta.js'), 'utf8');
    expect(lib).toContain('data-ph-valinta');
    expect(lib).toContain('Yksi havainto nyt');
    expect(lib).toContain('Seuraan ottelua');
  });

  it('kaksi vaihtoehtoa, oikeat kohteet ja pelaaja mukana', () => {
    const u = VALINTA.tmPhValintaUrlit({ seuraId: 'sjk', pelaajaId: 'p1' });
    expect(Object.keys(u).sort()).toEqual(['ottelu', 'yksi']);
    expect(u.yksi).toContain('TalentMaster_ADAR_Pikakortti.html');
    expect(u.ottelu).toContain('TalentMaster_Pelihavainto_Kentta.html');
    ['seuraId=sjk', 'pelaajaId=p1'].forEach((s) => {
      expect(u.yksi).toContain(s);
      expect(u.ottelu).toContain(s);
    });
  });

  it('ilman pelaajaa parametri jätetään pois (kenttätyökalu kysyy sen)', () => {
    const u = VALINTA.tmPhValintaUrlit({ seuraId: 'sjk' });
    expect(u.ottelu).not.toContain('pelaajaId=');
    expect(u.ottelu).toContain('seuraId=sjk');
  });

  it('joukkuekonteksti välitetään vain kenttätyökalulle', () => {
    const u = VALINTA.tmPhValintaUrlit({ seuraId: 'sjk', joukkue: 'SJK P13', joukkueId: 'sjk_p13' });
    expect(u.ottelu).toContain('joukkue=SJK%20P13');
    expect(u.ottelu).toContain('joukkueId=sjk_p13');
    expect(u.yksi).not.toContain('joukkue');
  });

  it('arvot enkoodataan (& tai välilyönti ei riko URLia)', () => {
    const u = VALINTA.tmPhValintaUrlit({ seuraId: 'a&b', pelaajaId: 'p 1', joukkue: 'SJK/P13' });
    expect(u.ottelu).toContain('seuraId=a%26b');
    expect(u.ottelu).toContain('pelaajaId=p%201');
    expect(u.ottelu).toContain('joukkue=SJK%2FP13');
  });
});

/* ── 6 · MASTERIN OTTELUTARKKAILUT ───────────────────────────────────── */

describe('(13) Masterin ottelutarkkailut', () => {
  const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');

  it('lista luetaan VASTA avattaessa (§26: ei alikokoelmakyselyä renderöinnissä)', () => {
    const f = pura2(MASTER, 'async function _mkAvaaTarkkailut() {');
    expect(f).toContain("collection('kenttatarkkailut')");
    /* Kutsu tulee käyttäjän klikistä, ei renderöintifunktiosta. */
    expect(MASTER).toContain('onclick="_mkAvaaTarkkailut()"');
    const renderit = MASTER.split('_mkAvaaTarkkailut(').length - 1;
    expect(renderit, 'vain määrittely, window-vienti ja yksi klikkikutsu').toBeLessThanOrEqual(4);
  });

  /* AJETTU todiste: `if (false) rivit.sort(...)` jättäisi merkkijonon paikalleen. Tyngältä
     tulee tarkoituksella väärässä järjestyksessä, ja tulos on luettava uusin ensin. */
  async function ajaTarkkailulista(docit) {
    let html = '';
    const el = { set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
    const store = {
      console, Math, JSON, String, Number, Object, Array, Promise,
      _activePelaaja: 'p1', _seuraId: 'sjk',
      masterT: (s) => s, _mEsc: (s) => String(s == null ? '' : s),
      document: { getElementById: () => el },
      /* Ketju kuten tuotannossa: collection→doc→collection→doc→collection→limit→get. */
      db: {
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                collection: () => ({
                  orderBy: (kentta, suunta) => {
                    store.jarjestys = kentta + ' ' + suunta;
                    return { limit: () => ({ get: async () => ({ docs: docit }) }) };
                  },
                }),
              }),
            }),
          }),
        }),
      },
    };
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    const fn = new Function('__ymp', 'with(__ymp){' + pura2(MASTER, 'async function _mkAvaaTarkkailut() {')
      + '\nreturn _mkAvaaTarkkailut;}')(ymp);
    await fn();
    return html;
  }

  it('lista järjestyy uusin ensin (näyttöjärjestys ottelupäivän mukaan)', async () => {
    const html = await ajaTarkkailulista([
      { id: 'vanha', data: () => ({ ottelu: { pvm: '2026-09-01', vastustaja: 'VANHA' }, puoliaika: 1, merkinnat: [1] }) },
      { id: 'uusi', data: () => ({ ottelu: { pvm: '2026-09-28', vastustaja: 'UUSI' }, puoliaika: 2, merkinnat: [1, 2] }) },
    ]);
    expect(html.indexOf('UUSI'), 'uusin ei ollut ensimmäisenä').toBeLessThan(html.indexOf('VANHA'));
  });

  /* Kaksi eri asiaa: orderBy VALITSEE mitkä 20 haetaan (pelkkä limit palauttaisi mielivaltaiset
     20 ja uusimmat voisivat jäädä pois), client-sort järjestää NÄYTÖN ottelupäivän mukaan. */
  it('haku järjestää palvelimella ennen limitiä', () => {
    const f = pura2(MASTER, 'async function _mkAvaaTarkkailut() {');
    expect(f).toMatch(/orderBy\('luotu', 'desc'\)[\s\S]{0,20}limit\(20\)/);
  });

  it('järjestys on yhden kentän mukaan (ei komposiitti-indeksiä)', () => {
    const f = pura2(MASTER, 'async function _mkAvaaTarkkailut() {');
    expect((f.match(/orderBy\(/g) || []).length, 'kaksi orderBy:ta vaatisi indeksin').toBe(1);
    expect(f).not.toContain('where(');
  });

  it('tyhjä lista kerrotaan eikä jäädä lataustilaan', async () => {
    const html = await ajaTarkkailulista([]);
    expect(html).toContain('Ei ottelutarkkailuja vielä.');
  });

  it('tyhjä ja virhetila kerrotaan, ei jätetä lataustilaan', () => {
    const f = pura2(MASTER, 'async function _mkAvaaTarkkailut() {');
    expect(f).toContain('Ei ottelutarkkailuja vielä.');
    expect(f).toContain('Tarkkailuja ei saatu haettua.');
  });
});

/* ── 7 · PELAAJA- JA HUOLTAJANÄKYMÄT EIVÄT LUE ───────────────────────── */

describe('(14) kenttatarkkailut eivät näy pelaajalle eikä huoltajalle', () => {
  it.each(['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'])(
    '%s ei lue kenttatarkkailut-kokoelmaa', (tiedosto) => {
      const src = readFileSync(join(juuri, tiedosto), 'utf8');
      expect(src, 'alaikäisen havainto ei kuulu pelaajan näkymään (§7.22)').not.toContain('kenttatarkkailut');
    });

  it('EI VACUOUS: ne lukevat havainnot-kokoelmaa (eli haku toimii)', () => {
    const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
    expect(src).toContain('havainnot');
  });
});

/* ── 8 · REVIEW-KORJAUKSET ────────────────────────────────────────────── */

describe('(15) yksi dokumentti per ottelu — ei puoliajan eikä päivän mukaan', () => {
  const apu = () => aja(
    ['function paikallinenPvm(ms) {', 'function otteluAvainNyt(alkoiMs, kalenteriId) {',
      'function puoliajatMerkinnoista(merkinnat) {'],
    'return { pvm: paikallinenPvm, avain: otteluAvainNyt, puoliajat: puoliajatMerkinnoista };',
    {},
  );

  /* Aikavyöhyke pakotetaan, koska CI ajaa UTC:ssä: siellä paikallinen ja UTC ovat sama päivä,
     eikä ero paljastuisi lainkaan. UTC+14:ssä aamupäivä on UTC:ssä vielä edellistä päivää —
     juuri se tilanne, jossa yön yli kestäneen verkkokatkon luonnos jäisi löytymättä. */
  it('päivämäärä on PAIKALLINEN eikä UTC (eilinen luonnos ei saa kadota)', () => {
    const vanhaTZ = process.env.TZ;
    try {
      process.env.TZ = 'Pacific/Kiritimati';        // UTC+14
      const { pvm } = apu();
      const d = new Date(2026, 8, 28, 10, 0);       // paikallinen 28.9., UTC 27.9.
      expect(d.toISOString().slice(0, 10), 'esiehto: vyöhyke-ero on olemassa').toBe('2026-09-27');
      expect(pvm(d.getTime()), 'UTC-pvm vie luonnoksen väärälle päivälle').toBe('2026-09-28');
    } finally {
      if (vanhaTZ === undefined) delete process.env.TZ; else process.env.TZ = vanhaTZ;
    }
  });

  it('otteluavain käyttää samaa paikallista päivää', () => {
    const vanhaTZ = process.env.TZ;
    try {
      process.env.TZ = 'Pacific/Kiritimati';
      const { avain } = apu();
      expect(avain(new Date(2026, 8, 28, 10, 0).getTime())).toBe('2026-09-28_1000');
    } finally {
      if (vanhaTZ === undefined) delete process.env.TZ; else process.env.TZ = vanhaTZ;
    }
  });

  it('kaksi ottelua samana päivänä saa ERI avaimen (turnaus)', () => {
    const { avain } = apu();
    const a1 = avain(new Date(2026, 8, 28, 10, 0).getTime());
    const a2 = avain(new Date(2026, 8, 28, 14, 30).getTime());
    expect(a1).not.toBe(a2);
    expect(a1).toContain('2026-09-28');
    expect(a2).toContain('2026-09-28');
  });

  it('kalenteritapahtuma voittaa kellonajan (sama ottelu, sama avain)', () => {
    const { avain } = apu();
    expect(avain(Date.now(), 'kal_123')).toBe('kal_123');
    expect(avain(Date.now(), 'kal/123 x')).toBe('kal_123_x');   // siivottu doc-id:ksi
  });

  it('puoliajat johdetaan merkinnöistä, molemmat mukana', () => {
    const { puoliajat } = apu();
    expect(puoliajat([{ puoliaika: 1 }, { puoliaika: 2 }, { puoliaika: 1 }])).toEqual([1, 2]);
    expect(puoliajat([{ puoliaika: 2 }])).toEqual([2]);
    expect(puoliajat([])).toEqual([]);
    expect(puoliajat(null)).toEqual([]);
  });

  it('luonnoksen avain EI sisällä puoliaikaa (sama ottelu = sama luonnos)', () => {
    const f = pura('function luonnosAvain() {');
    expect(f).toContain('S.otteluAvain');
    expect(f).not.toContain('S.puoliaika');
  });

  it('puoliajan vaihto tallentaa luonnoksen eikä vaihda dokumenttia', () => {
    const f = pura('    q(\'asetukset\').querySelectorAll(\'[data-puoliaika]\').forEach(function (b) {');
    expect(f).toContain('tallennaLuonnos()');
    expect(f, 'otteluAvain ei saa vaihtua puoliajan mukana').not.toContain('otteluAvain');
  });
});

describe('(16) keskeneräisen jatkaminen', () => {
  function ajaKesken(tallennetut) {
    const store = {};
    Object.keys(tallennetut || {}).forEach((k) => { store[k] = JSON.stringify(tallennetut[k]); });
    const ls = {
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i],
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    };
    return aja(
      ['function luonnosEtuliite() {', 'function keskeneraisetLuonnokset() {'],
      'return keskeneraisetLuonnokset();',
      { S: { seuraId: 'sjk', pelaajaId: 'p1' }, localStorage: ls, LUONNOS_ETULIITE: 'tm_ph_luonnos_' },
    );
  }

  it('löytää myös EILISEN luonnoksen (verkkokatko yön yli)', () => {
    const r = ajaKesken({
      'tm_ph_luonnos_sjk_p1_2026-09-27_1830': { merkinnat: [{ id: 1 }], alkoi: 1000 },
    });
    expect(r.length).toBe(1);
    expect(r[0].otteluAvain).toBe('2026-09-27_1830');
  });

  it('järjestää uusin ensin', () => {
    const r = ajaKesken({
      'tm_ph_luonnos_sjk_p1_2026-09-27_1830': { merkinnat: [{ id: 1 }], alkoi: 1000 },
      'tm_ph_luonnos_sjk_p1_2026-09-28_1000': { merkinnat: [{ id: 2 }], alkoi: 9000 },
    });
    expect(r.map((x) => x.otteluAvain)).toEqual(['2026-09-28_1000', '2026-09-27_1830']);
  });

  it('toisen pelaajan tai seuran luonnos ei vuoda', () => {
    const r = ajaKesken({
      'tm_ph_luonnos_sjk_p9_2026-09-28_1000': { merkinnat: [{ id: 1 }], alkoi: 1 },
      'tm_ph_luonnos_kpv_p1_2026-09-28_1000': { merkinnat: [{ id: 1 }], alkoi: 1 },
    });
    expect(r).toEqual([]);
  });

  it('tyhjä luonnos ei tarjoa jatkamista', () => {
    expect(ajaKesken({ 'tm_ph_luonnos_sjk_p1_2026-09-28_1000': { merkinnat: [], alkoi: 1 } })).toEqual([]);
  });

  it('rikkinäinen luonnos ei kaada hakua', () => {
    const store = { 'tm_ph_luonnos_sjk_p1_x': '{rikki' };
    const ls = {
      get length() { return 1; }, key: () => 'tm_ph_luonnos_sjk_p1_x',
      getItem: (k) => store[k],
    };
    const r = aja(
      ['function luonnosEtuliite() {', 'function keskeneraisetLuonnokset() {'],
      'return keskeneraisetLuonnokset();',
      { S: { seuraId: 'sjk', pelaajaId: 'p1' }, localStorage: ls, LUONNOS_ETULIITE: 'tm_ph_luonnos_' },
    );
    expect(r).toEqual([]);
  });

  it('uusi ottelu nollaa merkinnät ja luo uuden avaimen', () => {
    const f = pura('function aloitaUusiOttelu() {');
    expect(f).toContain('S.merkinnat = []');
    expect(f).toContain('S.otteluAvain = otteluAvainNyt(S.alkoi, S.kalenteriId)');
    expect(f).toContain('S.puoliaika = 1');
  });

  it('valinta näytetään vain kun keskeneräisiä on', () => {
    const f = pura('  async function kaynnista() {');
    expect(f).toContain('if (kesken.length) await naytaJatkaValinta(kesken);');
    expect(f).toContain('else aloitaUusiOttelu();');
  });
});

describe('(17) valintaikkunan teksti on oikeaa suomea', () => {
  const VALINTA = vaadi('../lib/tm_pelihavainto_valinta.js');

  /* "Mita olet tekemassa?" näkyi sisäänkäynnin ensimmäisenä näkymänä: vpT/masterT palauttaa
     tuntemattoman avaimen sellaisenaan, joten käyttäjä näki ä:ttömän tekstin. */
  it('otsikossa on ä (ei "Mita olet tekemassa?")', () => {
    expect(VALINTA.TM_PH_TEKSTIT.otsikko).toBe('Mitä olet tekemässä?');
  });

  it('otteluselitteessä on ä', () => {
    expect(VALINTA.TM_PH_TEKSTIT.otteluSelite).toContain('läpikäynti');
  });

  it('lib-lähteessä EI ole raakoja ä/ö-merkkejä (vartija voimassa)', () => {
    const src = readFileSync(join(juuri, 'lib/tm_pelihavainto_valinta.js'), 'utf8');
    const koodi = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(koodi, 'escapet, ei raakoja umlautteja').not.toMatch(/[äöÄÖ]/);
  });

  it('kaikki tekstit kulkevat käännösfunktion läpi (ei kovakoodattua näyttöä)', () => {
    const src = readFileSync(join(juuri, 'lib/tm_pelihavainto_valinta.js'), 'utf8');
    expect(src).toContain('t(TM_PH_TEKSTIT.otsikko)');
    /* Korttien tekstit menevät _tmPhKortti:n läpi, joka kääntää ne t():llä. */
    expect(src).toMatch(/_tmPhEsc\(t\(otsikko\)\)/);
    expect(src).toMatch(/_tmPhEsc\(t\(selite\)\)/);
    expect(src).toContain("_tmPhKortti('yksi', TM_PH_TEKSTIT.yksi");
    expect(src).toContain("_tmPhKortti('ottelu', TM_PH_TEKSTIT.ottelu");
  });
});

/* ── 12 · KOKONÄYTTÖ (2A-ulkoasu) ─────────────────────────────────────────
   Kenttä oli pieni vaakalaatikko asetusten alla myös pystypuhelimessa: "ei tuohon pieneen
   kenttään sormet pääse kunnolla ja merkinnät leviää". Nämä vartijat mittaavat sitä, että
   kenttä saa koko näytön kummassakin asennossa ja että vanhat merkinnät häipyvät. */
describe('(12) kenttä täyttää näytön, kumpikin asento on käyttötila', () => {
  it('kaksi vaihetta: aloitusruutu ja kenttätila ovat eri näkymät', () => {
    expect(SIVU).toContain('id="aloitus"');
    expect(SIVU).toContain('id="kenttatila"');
    const f = pura('function avaaKenttatila() {');
    expect(f, 'aloitusruutu jää näkyviin').toContain("q('aloitus').style.display = 'none'");
    expect(f, 'kenttätila ei avaudu').toContain("q('kenttatila').style.display = ''");
    expect(f, 'kenttä on aseteltava uudelleen kun laatikko saa koon').toContain('asettele()');
  });

  it('"Aloita" pyytää koko näytön (käyttäjän ele) ja avaa kenttätilan', () => {
    const f = pura('function alustaKenttatila() {');
    expect(f).toContain('kokoNaytto()');
    expect(f).toContain('avaaKenttatila()');
  });

  it('koko näyttö ja wakeLock ovat MUKAVUUKSIA — hylkäys ei kaada kirjaamista', () => {
    const fs = pura('function kokoNaytto() {');
    expect(fs, 'requestFullscreen ilman suojausta kaataisi iOS:ssä').toContain('try {');
    expect(fs).toContain('.catch(');
    const wl = pura('function pyydaWakeLock() {');
    expect(wl).toContain('try {');
    expect(wl).toContain('.catch(');
  });

  it('EI orientaatiolukkoa eikä "käännä puhelin" -vihjettä', () => {
    /* Molemmat asennot ovat täysiarvoisia käyttötiloja. Lukko tai vihje tekisi
       pystyasennosta toisen luokan tilan. */
    expect(SIVU_KOODI, 'orientaatio lukittu').not.toContain('orientation.lock');
    expect(SIVU_KOODI, 'orientaatio lukittu').not.toContain('lockOrientation');
    /* Kommentit riisuttuna: sivun oma perustelu KERTOO ettei vihjettä saa olla, joten raaka
       haku osuisi juuri siihen ja vartija punertaisi siitä että sääntö on kirjattu. */
    expect(SIVU_KOODI, 'pystyasentoa ei saa kehottaa kääntämään').not.toMatch(/käännä puhelin/i);
  });

  it('kierto tulee LIBISTÄ myös pystyssä — sivulla ei omaa flip-laskentaa', () => {
    const k = pura('function kaantoOpts() {');
    expect(k, 'pysty-parametri puuttuu → lib ei voi kääntää').toContain('pysty: PYSTY');
    /* Oma peilaus (100 - len / 100 - wid) olisi toinen totuus tallennetulle pisteelle. */
    expect(SIVU_KOODI).not.toMatch(/100\s*-\s*p\.len/);
    expect(SIVU_KOODI).not.toMatch(/100\s*-\s*p\.wid/);
  });

  /* AJETTU ASETTELU, ei tekstihaku: ensimmäinen versio näistä vartijoista tarkisti vain, että
     `setAttribute('viewBox'` esiintyy lähteessä — mutaatio, joka kovakoodasi viewBoxin takaisin
     530×350:een, meni siitä läpi. Nyt asettelu ajetaan valelaatikolla ja tulos mitataan. */
  function ajaAsettelu(bw, bh) {
    const svgTynka = { attrs: {}, style: {}, setAttribute(k, v) { this.attrs[k] = v; } };
    const api = aja(
      ['function asettele() {'],
      'return { asettele: asettele, tila: function () { return { PYSTY: PYSTY, W: W, H: H }; } };',
      {
        laatikko: { clientWidth: bw, clientHeight: bh },
        svg: svgTynka,
        PYSTY: false, W: 530, H: 350, PX: 12, PY: 12, IW: 506, IH: 326,
        klamppi: (v, a2, b2) => Math.max(a2, Math.min(b2, v)),
        Math,
      },
    );
    api.asettele();
    const vb = (svgTynka.attrs.viewBox || '').split(' ').map(Number);
    return { vb, svg: svgTynka, tila: api.tila() };
  }

  it('VAAKALAATIKKO: kenttä venyy laatikon mukaan sallituissa rajoissa', () => {
    const r = ajaAsettelu(800, 400);
    expect(r.tila.PYSTY, 'vaakalaatikko tulkittiin pystyksi').toBe(false);
    const suhde = r.vb[2] / r.vb[3];
    expect(suhde, 'viewBox ei seuraa laatikkoa').toBeGreaterThan(1.44);
    expect(suhde, 'kenttä venyi karikatyyriksi').toBeLessThan(2.06);
    expect(suhde).toBeCloseTo(2.0, 1);
  });

  it('PYSTYLAATIKKO: kenttä kääntyy pystyyn (ei jää vaakalaatikoksi)', () => {
    const r = ajaAsettelu(400, 820);
    expect(r.tila.PYSTY, 'pystylaatikkoa ei tunnistettu').toBe(true);
    const suhde = r.vb[2] / r.vb[3];
    expect(suhde, 'kenttä jäi vaakaan pystypuhelimessa').toBeLessThan(0.70);
    expect(suhde).toBeGreaterThan(0.50);
  });

  it('kenttä TÄYTTÄÄ laatikon (ei kolmannesta näytöstä)', () => {
    [[800, 400], [400, 820], [1000, 500]].forEach(([bw, bh]) => {
      const r = ajaAsettelu(bw, bh);
      const lev = parseFloat(r.svg.style.width), kork = parseFloat(r.svg.style.height);
      const tayttoaste = Math.max(lev / bw, kork / bh);
      expect(tayttoaste, 'kenttä jäi pieneksi laatikossa ' + bw + '×' + bh)
        .toBeGreaterThan(0.95);
      expect(lev, 'kenttä vuotaa laatikon yli').toBeLessThanOrEqual(bw);
      expect(kork, 'kenttä vuotaa laatikon yli').toBeLessThanOrEqual(bh);
    });
  });

  it('SUHDE seuraa laatikkoa ja rajautuu vasta ääripäissä', () => {
    /* Pelkkä täyttöaste ei riitä vartijaksi: kiinteä 350×600 täyttäisi laatikon leveyssuunnassa
       mutta kenttä olisi aina samanmuotoinen. Muodon on seurattava laatikkoa BANDIN sisällä. */
    const suhde = (bw, bh) => { const r = ajaAsettelu(bw, bh); return r.vb[2] / r.vb[3]; };
    /* Asettelu jättää laatikkoon 8 px sisäreunusta, joten vertailukohta on (bw−8)/(bh−8). */
    const laatikonSuhde = (bw, bh) => (bw - 8) / (bh - 8);
    expect(suhde(400, 700), 'pystysuhde ei seuraa laatikkoa').toBeCloseTo(laatikonSuhde(400, 700), 2);
    expect(suhde(400, 620), 'pystysuhde ei seuraa laatikkoa').toBeCloseTo(laatikonSuhde(400, 620), 2);
    expect(suhde(400, 700)).not.toBeCloseTo(suhde(400, 620), 3);
    /* ÄÄRIPÄÄT: liian kapea tai liian leveä laatikko rajataan, ettei kenttä vääristy. */
    expect(suhde(400, 1200), 'kapea laatikko ei rajautunut').toBeCloseTo(0.51, 2);
    expect(suhde(900, 300), 'leveä laatikko ei rajautunut').toBeCloseTo(2.05, 2);
    expect(suhde(800, 400)).toBeCloseTo(2.0, 1);
  });

  it('kiinteä viewBox ei jäänyt HTML:ään', () => {
    expect(SIVU).not.toContain('viewBox="0 0 530 350"');
  });

  it('turva-alueet huomioidaan (lovi ja kotipalkki eivät syö kenttää)', () => {
    expect(SIVU).toContain('env(safe-area-inset-top');
    expect(SIVU).toContain('padding:var(--sat) var(--sar) var(--sab) var(--sal)');
  });

  it('kääntö ei hukkaa merkintöjä eikä jätä valitsinta roikkumaan', () => {
    const f = pura('function alustaKenttatila() {');
    expect(f).toContain("window.addEventListener('resize'");
    expect(f).toContain("window.addEventListener('orientationchange'");
    const i = f.indexOf('var uudelleen = function ()');
    const kasittelija = f.slice(i, f.indexOf('};', i));
    expect(kasittelija, 'valitsin on suljettava ENNEN uudelleenasettelua').toContain('suljeValitsin(false)');
    expect(kasittelija, 'merkinnät on piirrettävä uudelleen kanonisesta datasta').toContain('piirra()');
    expect(kasittelija, 'merkintöjä ei saa tyhjentää käännössä').not.toContain('S.merkinnat =');
  });

  it('alapalkki: Hetki · Kumoa · Merkinnät (määrä), napit vähintään 58 px', () => {
    ['id="btnHetki"', 'id="btnKumoa"', 'id="btnLista"', 'id="merkintaLkm"'].forEach((k) => {
      expect(SIVU, 'alapalkista puuttuu: ' + k).toContain(k);
    });
    expect(SIVU).toMatch(/\.railbtn\{[^}]*min-height:58px/);
  });

  it('merkinnät ovat alalehtenä eivätkä vie tilaa kentältä', () => {
    expect(SIVU).toContain('class="sheet"');
    const avaa = pura('function avaaLehti() {');
    expect(avaa).toContain("classList.add('auki')");
    /* Tallenna siirtyi lehden alaosaan — kentällä ei ole tallennusnappia vieraana. */
    const i = SIVU.indexOf('class="sheet"');
    const lehti = SIVU.slice(i, SIVU.indexOf('</div>\n</div>', i));
    expect(lehti, 'Tallenna ei ole lehdessä').toContain('id="btnTallenna"');
  });

  it('suuntamerkki on kentän PÄÄLLÄ ja seuraa asentoa', () => {
    expect(SIVU).toContain('id="suuntamerkki"');
    const f = pura('function paivitaSuuntamerkki() {');
    expect(f, 'pystyssä nuolen on osoitettava ylös/alas').toContain("PYSTY ? (kaksi ? '↓' : '↑')");
    expect(f, 'vaakana nuolen on osoitettava sivulle').toContain("(kaksi ? '←' : '→')");
  });
});

describe('(13) vanhat merkinnät häipyvät kentältä', () => {
  it('kentällä näkyy enintään 3 tilannetta, loput vain listassa', () => {
    expect(SIVU).toContain('var NAKYVIA_JUURIA = 3;');
    const f = pura('function piirraMerkinnat() {');
    expect(f, 'häivytystä ei sovelleta').toContain('rk >= NAKYVIA_JUURIA');
    expect(f, 'ketjun on seurattava juurtaan (muuten ketju katkeaa kesken)').toContain('juuriMerkinnalle(');
  });

  it('EI VACUOUS: häivytys laskee juuret uusin ensin', () => {
    const f = pura('function piirraMerkinnat() {');
    expect(f).toContain('juuret.slice().reverse()');
  });

  it('merkinnässä on numero ja tyyppiväri', () => {
    const f = pura('function merkkiPallo(p, nro, vari, taytetty) {');
    expect(f).toContain('stroke: vari');
    expect(f).toContain('teksti.textContent');
  });
});

describe('(14) valitsin pysyy kentällä ja himmentää merkinnät', () => {
  it('napit rajataan laatikkoon napin puolikkaan marginaalilla', () => {
    const f = pura('function naytaValitsin(sp, items, ikkunaMs, aikakatkaisu) {');
    expect(f).toContain('var MX = 46, MY = 34;');
    expect(f).toContain('klamppi(pos.x + dx, MX');
    expect(f).toContain('klamppi(pos.y + dy, MY');
  });

  it('pystyssä neljä vaihtoehtoa asetellaan kahteen sarakkeeseen', () => {
    const f = pura('function naytaValitsin(sp, items, ikkunaMs, aikakatkaisu) {');
    expect(f).toContain('if (PYSTY && n > 3)');
  });

  it('merkinnät himmenevät valitsimen ajaksi ja himmennys puretaan', () => {
    expect(SIVU).toContain('.pitchbox.valitsee #pitch .ents{opacity:.25');
    expect(pura('function naytaValitsin(sp, items, ikkunaMs, aikakatkaisu) {'))
      .toContain("laatikko.classList.add('valitsee')");
    expect(pura('function suljeValitsin(peru) {'))
      .toContain("laatikko.classList.remove('valitsee')");
  });

  it('napit ovat umpinaiset (tokeniväri, ei läpinäkyvä)', () => {
    expect(SIVU).toMatch(/\.chooser \.cbtn\{[^}]*background:var\(--surface\)/);
  });
});

describe('(15) kosketuspiste osuu sormen kohdalle', () => {
  it('muunnos tehdään getScreenCTM().inverse():llä (skaalaus ja vieritys mukana)', () => {
    const f = pura('function svgPiste(ev) {');
    expect(f).toContain('getScreenCTM().inverse()');
  });

  it('napautuksen raja on RUUDUN pikseleissä, ei SVG-yksiköissä', () => {
    /* Sama sormen liike tarkoittaisi eri asiaa eri kokoisella kentällä. */
    expect(SIVU).toContain('var LIIKE_RAJA_PX = 10;');
    const f = pura('function alustaEleet() {');
    expect(f).toContain('ev.clientX - veto.ruutuAlku.x');
    expect(f).toContain('LIIKE_RAJA_PX');
  });
});
