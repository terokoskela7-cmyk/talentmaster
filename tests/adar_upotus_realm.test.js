/* PIKAKORTTI UPOTETTUNA · REALM-INVARIANTTI
 *
 * LIVE-BUGI (2026-09-28): valmentajan sovelluksesta avattu pikakortti kaatui tallennuksessa:
 *   FirebaseError: Function DocumentReference.set() called with invalid data.
 *   Data must be an object, but it was: a custom Object object
 *
 * JUURISYY: Master injektoi iframelle OMAN Firestore-instanssinsa (`w._tmDB = _db`). Pikakortti
 * rakentaa havaintodokumentin iframen realmissa, mutta kirjoitti sen isäikkunan instanssilla.
 * Firestore-SDK tarkistaa, että data on "plain object" vertaamalla prototyyppiä OMAN ikkunansa
 * `Object.prototype`:een — iframen objektilla se on eri olio, joten kirjoitus hylätään. Sama
 * koskee `FieldValue`-sentinellejä.
 *
 * Tämä kaatoi JOKAISEN upotetun kirjoituksen (havainto, pikakentät, kumoaminen) siitä asti kun
 * injektio lisättiin (64f01b5, 12.7.2026) — eli myös ennen pikakortin uudelleenkirjoitusta.
 *
 * Testi on AITO REALMITESTI: `vm.createContext` antaa oman `Object.prototype`:n, joten
 * prototyyppivertailu käyttäytyy kuten iframen ja isäikkunan välillä. Tynkä-Firestore tekee
 * täsmälleen saman tarkistuksen kuin SDK, ja erillinen testi todistaa tyngän reagoivan —
 * muuten vartija voisi mennä läpi ilman että mitään mitataan.
 */
import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADAR = readFileSync(join(juuri, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');

const ilmanKommentteja = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  .replace(/<!--[\s\S]*?-->/g, ' ');

function pura(lahde, tunniste) {
  const alku = lahde.indexOf(tunniste);
  if (alku < 0) throw new Error('ei löydy: ' + tunniste);
  let syvyys = 0;
  for (let j = lahde.indexOf('{', alku); j < lahde.length; j++) {
    if (lahde[j] === '{') syvyys++;
    else if (lahde[j] === '}') { syvyys--; if (!syvyys) return lahde.slice(alku, j + 1); }
  }
  throw new Error('sulkeet eivät täsmää: ' + tunniste);
}

/**
 * Firestore-tynkä, joka tekee SDK:n "plain object" -tarkistuksen annettua realmia vasten.
 * `oma` = sen realmin Object.prototype, jolle tämä instanssi kuuluu.
 */
function teeDb(oma, kirjatut, nimi) {
  const tarkista = (data) => {
    if (data === null || typeof data !== 'object' || Object.getPrototypeOf(data) !== oma) {
      const e = new Error('Function DocumentReference.set() called with invalid data. '
        + 'Data must be an object, but it was: a custom Object object');
      e.nimi = nimi;
      throw e;
    }
  };
  const doc = () => ({
    _nimi: nimi, id: 'h1',
    set: (data) => { tarkista(data); kirjatut.push({ db: nimi, data }); return Promise.resolve(); },
    update: (data) => { tarkista(data); kirjatut.push({ db: nimi, data, update: true }); return Promise.resolve(); },
    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
    onSnapshot: () => () => {},
    collection: () => ({ doc, get: () => Promise.resolve({ docs: [] }) }),
  });
  /* §26: havainto + pikakentät kirjoitetaan batchina → batch.set tekee saman realm-tarkistuksen kuin SDK. */
  const batch = () => {
    const ops = [];
    return {
      set: (ref, data) => { tarkista(data); ops.push({ db: nimi, data }); },
      update: (ref, data) => { tarkista(data); ops.push({ db: nimi, data, update: true }); },
      commit: () => { ops.forEach((o) => kirjatut.push(o)); return Promise.resolve(); },
    };
  };
  return { collection: () => ({ doc, get: () => Promise.resolve({ docs: [] }) }), batch };
}

/** Rakentaa lapsirealmin (= iframe) ja ajaa siellä pikakortin tallennuspolun. */
function ajaLapsiRealmissa() {
  const kirjatut = [];
  const ctx = vm.createContext({});
  /* Lapsirealmin oma Object.prototype — eri olio kuin tämän testin. */
  const lapsiProto = vm.runInContext('Object.prototype', ctx);
  expect(lapsiProto, 'vm ei antanut omaa realmia').not.toBe(Object.prototype);

  const lapsiDb = teeDb(lapsiProto, kirjatut, 'oma');
  const isaDb = teeDb(Object.prototype, kirjatut, 'isa');

  Object.assign(ctx, {
    console, Date, Promise, Object, Array, String, Number, JSON, setTimeout,
    navigator: { onLine: true },
    _PH_DB: lapsiDb,
    _PH_AUTH: { currentUser: { uid: 'u1', displayName: 'Valle Valmentaja' } },
    window: {
      _tmDB: isaDb,                       // Masterin injektio — EI saa päätyä käyttöön
      _tmAuth: { currentUser: { uid: 'u1' } },
      _tmSeuraId: 'kpv', _tmRooli: 'valmentaja',
      _pelaajaMap: { p1: { nimi: 'Topias', tunniste: '12345678', syntymaVuosi: 2013 } },
      _phTila: {
        pelaajaId: 'p1', porras: 1, porrasTallennettu: null, porrasNostettu: false,
        konteksti: 'harjoitus', pisteet: { A: 2 }, havaitut: {}, teksti: '', nakyvyys: false,
        tehdyt: {}, naytto: 'havainto', viimeisin: null, odottaa: false,
      },
      firebase: { firestore: { FieldValue: { serverTimestamp: () => ({ __sentinel: true }) } } },
      parent: null,
    },
    /* Riippuvuudet tyngiksi — mitataan TALLENNUSPOLKUA, ei niitä. */
    tmPaivaIso: createRequire(import.meta.url)('../lib/tm_pvm.js').tmPaivaIso,   // oikea lib (ADAR lataa sen)
    _phDimit: () => ['A'],
    _phIka: () => 13,
    _nakArvo: () => 'valmentajat',
    _adarTekijaNimi: (u) => (u && u.displayName) || 'Valmentaja',
    _adarEstonSyy: () => 'syy',
    _showToast: () => {},
    _phRender: () => {},
    _luonnosTyhjenna: () => {},
    _phSeuraaKirjoitusta: () => {},
    _phPaivitaPikakentat: () => {},
    tmAdarBand: () => ['a'],
  });
  ctx.window.window = ctx.window;
  ctx.self = ctx;

  vm.runInContext(pura(ADAR, 'function _phPelaajaRef(') + '\n'
    + pura(ADAR, 'async function _phKirjoitaHavaintoJaPikakentat(') + '\n'
    + pura(ADAR, 'async function _phTallenna(') + '\n'
    // _phTallenna ei awaitaa kirjoitusta (UI etenee) → odotetaan että batch ehtii commitoitua
    + 'globalThis.__aja = async () => { await _phTallenna(); await new Promise((r) => setTimeout(r, 0)); };', ctx);

  return { ctx, kirjatut, lapsiProto, isaDb };
}

describe('pikakortti upotettuna · realm-invariantti', () => {
  it('EI VACUOUS: tynkä hylkää toisen realmin objektin kuten SDK', () => {
    const kirjatut = [];
    const ctx = vm.createContext({});
    const lapsiProto = vm.runInContext('Object.prototype', ctx);
    const isaDb = teeDb(Object.prototype, kirjatut, 'isa');
    const lapsenObjekti = vm.runInContext('({ a: 1 })', ctx);

    expect(Object.getPrototypeOf(lapsenObjekti), 'realmit eivät eronneet').toBe(lapsiProto);
    expect(() => isaDb.collection('x').doc().set(lapsenObjekti))
      .toThrow(/custom Object object/);
    /* Saman realmin objekti menee läpi → tynkä ei hylkää kaikkea. */
    expect(() => isaDb.collection('x').doc().set({ a: 1 })).not.toThrow();
  });

  it('TALLENNUS kirjoittaa OMALLA instanssilla, ei isäikkunan injektoimalla', async () => {
    const y = ajaLapsiRealmissa();
    await y.ctx.__aja();
    expect(y.kirjatut.length, 'mitään ei kirjoitettu').toBeGreaterThan(0);
    y.kirjatut.forEach((k) => {
      expect(k.db, 'kirjoitus meni isäikkunan instanssille → SDK hylkäisi sen').toBe('oma');
    });
  });

  it('havaintodokumentti on lapsirealmin objekti (juuri se jonka isä hylkäisi)', async () => {
    const y = ajaLapsiRealmissa();
    await y.ctx.__aja();
    const hav = y.kirjatut[0].data;
    expect(Object.getPrototypeOf(hav)).toBe(y.lapsiProto);
    expect(() => y.isaDb.collection('x').doc().set(hav),
      'juuri tämä objekti kaatoi tuotannon isäikkunan instanssilla').toThrow(/custom Object object/);
  });
});

describe('vartijat: instanssilähde ja injektio', () => {
  it('pikakortti EI lue window._tmDB / window._tmAuth -arvoja', () => {
    const koodi = ilmanKommentteja(ADAR);
    expect(koodi, 'injektoitu Firestore-instanssi palasi käyttöön').not.toContain('window._tmDB');
    expect(koodi, 'injektoitu Auth-instanssi palasi käyttöön').not.toContain('window._tmAuth');
  });

  it('pikakortti luo omat instanssit ja käyttää niitä', () => {
    expect(ADAR).toContain('_PH_DB   = firebase.firestore();');
    expect(ADAR).toContain('_PH_AUTH = firebase.auth();');
    const t = pura(ADAR, 'async function _phTallenna(');
    expect(t).toContain('_PH_DB');
    expect(t).toContain('_PH_AUTH');
  });

  it('Master EI injektoi Firestorea eikä Authia iframeen', () => {
    const f = pura(MASTER, 'function _avaaPikakorttiUpotettu(');
    const koodi = ilmanKommentteja(f);
    expect(koodi, 'Firestore-injektio palasi').not.toMatch(/w\._tmDB\s*=/);
    expect(koodi, 'Auth-injektio palasi').not.toMatch(/w\._tmAuth\s*=/);
  });

  it('muu konteksti-injektio säilyy (seura, pelaaja, rooli, upotus)', () => {
    const f = pura(MASTER, 'function _avaaPikakorttiUpotettu(');
    ['w._tmSeuraId', 'w._tmPelaajaId', 'w._tmRooli', 'w._tmEmbedded'].forEach((k) => {
      expect(f, 'kontekstin osa katosi: ' + k).toContain(k);
    });
    expect(f, 'sulkuviesti on osa sopimusta').toContain('tm:adar:saved');
  });
});

describe('vartija: tekijän nimi ei ole sähköposti', () => {
  it('sähköpostia ei käytetä missään haarassa', () => {
    const f = pura(ADAR, 'function _adarTekijaNimi(');
    expect(f, 'sähköposti päätyisi lapsen kortille').not.toContain('.email');
    expect(f, '@-merkin sisältävä arvo on hylättävä (displayName voi olla sähköposti)')
      .toContain("indexOf('@')");
    expect(f).toContain("'Valmentaja'");
  });

  it('tallennus käyttää helperiä eikä lue user.emailia', () => {
    const t = pura(ADAR, 'async function _phTallenna(');
    expect(t).toContain('tekija_nimi: _adarTekijaNimi(user)');
    expect(ilmanKommentteja(t), 'sähköposti palasi tallennuspolkuun').not.toContain('user.email');
  });

  it('järjestys: displayName → kayttajat-dokumentin nimi → Valmentaja', () => {
    const lahde = pura(ADAR, 'function _adarTekijaNimi(');
    const ctx = vm.createContext({ window: {} });
    vm.runInContext(lahde + '\nglobalThis.__n = _adarTekijaNimi;', ctx);

    ctx.window._tmKayttajaNimi = 'Kalle Kayttaja';
    expect(ctx.__n({ displayName: 'Valle Valmentaja', email: 'x@y.fi' })).toBe('Valle Valmentaja');
    expect(ctx.__n({ email: 'x@y.fi' })).toBe('Kalle Kayttaja');
    /* displayName joka on sähköposti → hylätään, ei käytetä. */
    expect(ctx.__n({ displayName: 'talentmasterid@gmail.com' })).toBe('Kalle Kayttaja');
    ctx.window._tmKayttajaNimi = null;
    expect(ctx.__n({ displayName: 'talentmasterid@gmail.com', email: 'x@y.fi' })).toBe('Valmentaja');
    expect(ctx.__n(null)).toBe('Valmentaja');
  });

  /* KÄYTTÄYTYMISTESTI, ei tekstihaku: aiempi versio etsi varhaista returnia merkkijonokuviolla,
     ja muuttujan uudelleennimeäminen kiersi vartijan (mutaatio R9 vuoti). Tämä ajaa funktion. */
  async function ajaLataus(rooli, dokumentti) {
    const ctx = vm.createContext({
      console, Promise, Object, Array, String,
      window: { _tmRooli: rooli },
      _PH_DB: {
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({ get: async () => ({ exists: !!dokumentti, data: () => dokumentti || {} }) }),
            }),
          }),
        }),
      },
    });
    ctx.window.window = ctx.window;
    vm.runInContext(
      "var ADAR_JOUKKUERAJAUS_OHITTAVAT = ['super_admin','superadmin','vp','urheilutoimenjohtaja','talenttivalmentaja'];\n"
      + pura(ADAR, 'function _adarNakeeKaikki(') + '\n'
      + pura(ADAR, 'async function _adarLataaOmatJoukkueet(') + '\n'
      + 'globalThis.__lataa = _adarLataaOmatJoukkueet;', ctx);
    await ctx.__lataa('kpv', 'u1');
    return ctx.window;
  }

  it('nimi luetaan kayttajat-dokumentista MYÖS joukkuerajauksen ohittavalle roolille', async () => {
    /* Aiemmin funktio palasi heti VP:llä/talenttivalmentajalla, jolloin nimeä ei koskaan luettu
       ja kortille jäi sähköposti. */
    const w = await ajaLataus('vp', { etunimi: 'Tero', sukunimi: 'Koskela', joukkueet: ['j1'] });
    expect(w._tmKayttajaNimi, 'nimi jäi lukematta ohittavalta roolilta').toBe('Tero Koskela');
    expect(w._omatJoukkueet, 'ohittava rooli ei tarvitse joukkuelistaa').toBeNull();
  });

  it('rajattu rooli saa sekä nimen että joukkuelistan', async () => {
    const w = await ajaLataus('valmentaja', { etunimi: 'Valle', sukunimi: 'Valmentaja', joukkueet: ['j1', 'j2'] });
    expect(w._tmKayttajaNimi).toBe('Valle Valmentaja');
    expect(w._omatJoukkueet).toEqual(['j1', 'j2']);
  });

  it('FAIL-CLOSED säilyy: rajattu rooli ilman dokumenttia saa tyhjän listan', async () => {
    const w = await ajaLataus('valmentaja', null);
    expect(w._omatJoukkueet).toEqual([]);
    expect(w._tmKayttajaNimi).toBeNull();
  });
});
