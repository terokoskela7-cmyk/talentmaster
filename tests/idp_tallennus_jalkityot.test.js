/**
 * VARTIJA · IDP-tallennuksen jalkityot + vuodenvaihde (PR A).
 *
 * A1 - PIKAKENTAT ASETETTIIN ENNEN KIRJOITUSTA. `p.idp_tila` / `idp_edistyma` / `idp_fokus` /
 * `idp_viim_review` / `idp_dvi` (Masterissa lisaksi `idp_lahde`) kirjoitettiin muistiin heti, ennen
 * transaktiota. Koska tallennus nielaisee virheen (toast + console.warn), epaonnistunut kirjoitus jatti
 * pelaajalistan ja kehityskortin nayttamaan UUDEN tavoitteen tietoja vaikka Firestoressa oli yha vanha.
 *
 * A2 - PALAUTETTU LUONNOS OLI JO MUUTETTU. `_vpTallennaTavoite` asetti luonnokselle `status:'aktiivinen'`
 * ja `hyvaksytty` ENNEN kirjoitusta, ja epaonnistuessa palautti saman olion. VP olisi nahnyt
 * "hyvaksytyn" luonnoksen jota ei koskaan tallennettu.
 *
 * A3 - VUODENVAIHDE: VANHA TAVOITE JAI TOISEEN DOKKIIN AKTIIVISEKSI. Doc-id on kalenterivuosi. Tammikuussa
 * voimassa oleva A ladataan edellisen vuoden dokista (fallback), mutta uusi tavoite C kirjoitetaan kuluvan
 * vuoden dokkiin. `idpTavoitteetYhdista` merkitsee vaihdetuksi vain SAMAN dokin alkiot, joten A jai
 * 2026-dokkiin tilaan 'aktiivinen'. Nakyma oli oikein (2027 luetaan ensin) mutta historia vaarin.
 *
 * KORJAUS: pikakentat vasta onnistuneen kirjoituksen jalkeen · luonnos talteen syvakopiona ·
 * ladattu ehdotus tallentuu samaan dokkiin josta se luettiin (`_idpLuonnosVuosi`) · toisen vuoden dokin
 * vanha tavoite merkitaan vaihdetuksi SAMASSA transaktiossa (`idpMerkitseVaihdetuksi`, kaikki lukemiset
 * ennen kirjoituksia). Sama kokoelma ja samat roolit -> ei Rules-muutosta.
 *
 * METODI: tallennusfunktiot puretaan LAHTEESTA ja ajetaan ketjutettavalla stub-db:lla, joka kirjaa
 * jokaisen kirjoituksen vuosidokeittain. Aika ohjataan injektoidulla Date:lla, joten vuodenvaihde on
 * mitattavissa ilman jarjestelmakellon siirtoa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const IDP = vaadi('../lib/tm_idp.js');

const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const PELAAJA = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');

const TAMMI27 = new Date('2027-01-08T09:00:00.000Z').getTime();
const SYYS26 = new Date('2026-09-24T09:00:00.000Z').getTime();

function pura(src, tunniste) {
  const i = src.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu lahteesta').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') syv++;
    else if (src[k] === '}') { syv--; if (syv === 0) return src.slice(i, k + 1); }
  }
  throw new Error('sulut');
}

/* Injektoitava Date: new Date() = valittu hetki, new Date(x) toimii normaalisti. */
function fakeDate(nowMs) {
  const RD = Date;
  const F = function (a, b, c) {
    if (a === undefined) return new RD(nowMs);
    if (b === undefined) return new RD(a);
    return new RD(a, b, c);
  };
  F.now = () => nowMs;
  F.prototype = RD.prototype;
  return F;
}

function ymparisto(oikeat) {
  const store = Object.assign({}, oikeat);
  return new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : () => '')),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

/* Ketjutettava stub-db: db.collection('seurat').doc(sid).collection('pelaajat').doc(pid)
   -> ref.collection('idp_kausi').doc(vuosi). Kirjaa kaikki kirjoitukset vuosidokeittain. */
function stubDb(dokit, loki, opts) {
  opts = opts || {};
  const kausiRef = (vuosi) => ({ _vuosi: vuosi });
  const pelaajaRef = {
    collection: () => ({ doc: (v) => kausiRef(String(v)) }),
    set: async (data) => { if (opts.kaadaPikakentat) throw new Error('pikakentat kaatui'); loki.pikakentat.push(data); },
  };
  return {
    collection: () => ({ doc: () => ({ collection: () => ({ doc: () => pelaajaRef }) }) }),
    runTransaction: async (fn) => {
      if (opts.kaada) throw new Error('transaktio kaatui');
      const tx = {
        get: async (ref) => {
          loki.luetut.push(ref._vuosi);
          const d = dokit[ref._vuosi];
          return { exists: !!d, data: () => d || {} };
        },
        set: (ref, data) => {
          loki.kirjoitukset.push({ vuosi: ref._vuosi, tavoitteet: data.tavoitteet });
          dokit[ref._vuosi] = Object.assign({}, dokit[ref._vuosi], { tavoitteet: data.tavoitteet });
        },
      };
      return fn(tx);
    },
  };
}

function ajaTallennus(mikä, p, dokit, opts) {
  opts = opts || {};
  const loki = { kirjoitukset: [], luetut: [], pikakentat: [] };
  const onVP = mikä === 'vp';
  const nimi = onVP ? 'async function _vpTallennaIdpDok(p, viesti)' : 'async function _mIdpTallennaDok(p, viesti)';
  const src = pura(onVP ? VP : MASTER, nimi);
  const db = stubDb(dokit, loki, opts);
  const ymp = ymparisto(Object.assign({
    Date: fakeDate(opts.nyt || SYYS26),
    db: db, _db: db, _seuraId: 's1', _isDemoMode: false, _demo: false,
    firebase: { auth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) },
    idpPikakentat: IDP.idpPikakentat, idpTavoitteetYhdista: IDP.idpTavoitteetYhdista,
    idpTallennusVuosi: IDP.idpTallennusVuosi, idpMerkitseVaihdetuksi: IDP.idpMerkitseVaihdetuksi,
    idpOnVoimassa: IDP.idpOnVoimassa,
    toast: () => {}, vpT: (s) => s, masterT: (s) => s,
  }, opts.ymp || {}));
  // eslint-disable-next-line no-new-func
  const fn = new Function('__ymp', 'with(__ymp){' + src + '\nreturn ' + (onVP ? '_vpTallennaIdpDok' : '_mIdpTallennaDok') + ';}')(ymp);
  return { fn: fn, loki: loki, p: p };
}

const A = () => ({ luotu: 'A', status: 'aktiivinen', fokus: { nimi: 'Syoton piilotus', alue: 'a1' }, arviot: [{ pvm: '1' }] });
const B = () => ({ luotu: 'B', status: 'ehdotettu', fokus: { nimi: 'Monipuolisuus', alue: 'b1' }, arviot: [] });
const C = () => ({ luotu: 'C', status: 'aktiivinen', fokus: { nimi: 'Kolmas mies', alue: 'c1' }, arviot: [] });

/* ── A1 ────────────────────────────────────────────────────────────────────── */
describe('(A1) Pikakentat asetetaan vasta onnistuneen kirjoituksen jalkeen', () => {
  for (const app of ['vp', 'master']) {
    const kentta = app === 'vp' ? '_idpTavoite' : '_mIdpTavoite';

    it(app + ': epaonnistunut tallennus EI muuta idp_tila/idp_fokus-pikakenttia', async () => {
      const p = { id: 'p1', idp_tila: 'aktiivinen', idp_fokus: { nimi: 'VANHA', alue: 'vanha' } };
      p[kentta] = C();
      const aja = ajaTallennus(app, p, {}, { kaada: true });
      const ok = await aja.fn(p, 'Tavoite tallennettu');
      expect(ok).toBe(false);
      expect(p.idp_tila, 'pikakentta paivittyi vaikka kirjoitus epaonnistui').toBe('aktiivinen');
      expect(p.idp_fokus.nimi, 'lista nayttaisi uuden tavoitteen fokusta').toBe('VANHA');
      expect(aja.loki.pikakentat, 'pikakenttadokkia ei olisi pitanyt kirjoittaa').toHaveLength(0);
    });

    it(app + ': onnistunut tallennus paivittaa pikakentat', async () => {
      const p = { id: 'p1', idp_tila: 'aktiivinen', idp_fokus: { nimi: 'VANHA', alue: 'vanha' } };
      p[kentta] = C();
      const aja = ajaTallennus(app, p, {}, {});
      const ok = await aja.fn(p, 'Tavoite tallennettu');
      expect(ok).toBe(true);
      expect(p.idp_fokus.nimi).toBe('Kolmas mies');
      expect(aja.loki.pikakentat).toHaveLength(1);
    });
  }

  it('VP: idp_dvi kulkee samassa jalkityossa (ei erillisena ennen kirjoitusta)', async () => {
    const p = { id: 'p1', idp_dvi: { suunta: 'flat', n: 0 }, _idpTavoite: Object.assign(C(), { arviot: [{ dvi_suunta: 'up' }] }) };
    const kaatui = ajaTallennus('vp', p, {}, { kaada: true });
    await kaatui.fn(p, 'x');
    expect(p.idp_dvi.n, 'idp_dvi paivittyi vaikka kirjoitus epaonnistui').toBe(0);
    const ok = ajaTallennus('vp', p, {}, {});
    await ok.fn(p, 'x');
    expect(p.idp_dvi).toEqual({ suunta: 'up', n: 1 });
  });
});

/* ── A2 ────────────────────────────────────────────────────────────────────── */
describe('(A2) Epaonnistuessa palautetaan ALKUPERAINEN luonnos', () => {
  it('luonnoksen status pysyy ehdotettuna eika hyvaksytty-kenttaa synny', async () => {
    const p = { id: 'p1', _idpTavoite: A(), _idpLuonnos: B(), _luonnosTyyppi: 'vaihto', _luonnosTallennettu: true };
    const src = pura(VP, 'window._vpTallennaTavoite = async function (pid, uusiStatus)');
    const ymp = ymparisto({
      window: { _vpArvPelaaja: p },
      document: { getElementById: () => null },
      _vpLoytaPelaaja: () => p,
      _vpTyhjennaLuonnos: (pp) => { pp._idpLuonnos = null; pp._luonnosTyyppi = null; pp._luonnosTallennettu = false; },
      _vpKausitavoiteReRender: () => {},
      _vpTallennaIdpDok: async () => false,
    });
    // eslint-disable-next-line no-new-func
    new Function('__ymp', 'with(__ymp){' + src + '\n}')(ymp);
    const ok = await ymp.window._vpTallennaTavoite('p1', 'aktiivinen');
    expect(ok).toBe(false);
    expect(p._idpTavoite.luotu, 'uusi tavoite jai voimassa olevaksi').toBe('A');
    expect(p._idpLuonnos, 'luonnos katosi').toBeTruthy();
    expect(p._idpLuonnos.status, 'palautettu luonnos oli jo hyvaksytty-tilassa').toBe('ehdotettu');
    expect(p._idpLuonnos.hyvaksytty, 'palautettuun luonnokseen jai hyvaksytty-leima').toBeUndefined();
    expect(p._luonnosTyyppi).toBe('vaihto');
    expect(p._luonnosTallennettu).toBe(true);
  });
});

/* ── A3 ────────────────────────────────────────────────────────────────────── */
describe('(A3) Vuodenvaihde — vanha tavoite merkitaan vaihdetuksi myos toisessa dokissa', () => {
  for (const app of ['vp', 'master']) {
    const kentta = app === 'vp' ? '_idpTavoite' : '_mIdpTavoite';

    it(app + ': tammikuussa uusi C -> 2027 [C aktiivinen] ja 2026 [A vaihdettu]', async () => {
      const dokit = { 2026: { tavoitteet: [A()] } };
      const p = { id: 'p1', _idpVuosi: '2026', _idpVuosiLuotu: 'A' };
      p[kentta] = C();
      const aja = ajaTallennus(app, p, dokit, { nyt: TAMMI27 });
      const ok = await aja.fn(p, 'Tavoite aktivoitu');
      expect(ok).toBe(true);
      const vuodet = aja.loki.kirjoitukset.map((k) => k.vuosi).sort();
      expect(vuodet, 'toisen vuoden dokkia ei kirjoitettu').toEqual(['2026', '2027']);
      expect(dokit['2027'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['C:aktiivinen']);
      expect(dokit['2026'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['A:vaihdettu']);
      expect(dokit['2026'].tavoitteet[0].vaihdettu_pvm).toBeTruthy();
      expect(dokit['2026'].tavoitteet[0].arviot, 'vanhan kehityskeskustelut katosivat').toHaveLength(1);
    });

    it(app + ': syyskuussa sama dokki -> vain yksi kirjoitus', async () => {
      const dokit = { 2026: { tavoitteet: [A()] } };
      const p = { id: 'p1', _idpVuosi: '2026', _idpVuosiLuotu: 'A' };
      p[kentta] = C();
      const aja = ajaTallennus(app, p, dokit, { nyt: SYYS26 });
      await aja.fn(p, 'Tavoite aktivoitu');
      expect(aja.loki.kirjoitukset).toHaveLength(1);
      expect(aja.loki.kirjoitukset[0].vuosi).toBe('2026');
      expect(aja.loki.luetut, 'turha toisen dokin luku').toEqual(['2026']);
      // sama-dokki-haara hoitaa merkinnan (idpTavoitteetYhdista)
      expect(dokit['2026'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['A:vaihdettu', 'C:aktiivinen']);
    });
  }

  it('VP: tammikuussa hyvaksytty LADATTU ehdotus tallentuu omaan dokkiinsa (2026), 2027 ennallaan', async () => {
    const dokit = { 2026: { tavoitteet: [A(), B()] } };
    const hyvB = Object.assign(B(), { status: 'aktiivinen', hyvaksytty: '2027-01-08T09:00:00.000Z' });
    const p = {
      id: 'p1', _idpTavoite: hyvB,
      _idpVuosi: '2026', _idpVuosiLuotu: 'A',
      _idpLuonnosVuosi: '2026', _idpLuonnosLuotu: 'B',
    };
    const aja = ajaTallennus('vp', p, dokit, { nyt: TAMMI27 });
    await aja.fn(p, 'Tavoite aktivoitu');
    expect(aja.loki.kirjoitukset.map((k) => k.vuosi), 'ehdotus kirjoitettiin vaaraan vuosidokkiin').toEqual(['2026']);
    expect(dokit['2026'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['A:vaihdettu', 'B:aktiivinen']);
    expect(dokit['2027'], '2027-dokkiin kirjoitettiin turhaan').toBeUndefined();
  });

  /* PR #619 — ANKKURI SIIRTYY VAIN VOIMASSA OLEVALLE. Jos ehdotuksen tallennus siirtaisi tavoite-ankkurin,
     saman istunnon hyvaksynta ei enaa loytaisi vanhaa tavoitetta toisesta dokista, ja se jaisi pysyvasti
     tilaan 'aktiivinen' ilman etta VP nakee sita. */
  it('Master, SAMA ISTUNTO: C tallennetaan ehdotuksena ja hyvaksytaan -> 2026 [A vaihdettu]', async () => {
    const dokit = { 2026: { tavoitteet: [A()] } };
    const ehdC = Object.assign(C(), { status: 'ehdotettu' });
    const p = { id: 'p1', _mIdpTavoite: ehdC, _idpVuosi: '2026', _idpVuosiLuotu: 'A' };

    // 1) valmentaja tallentaa ehdotuksen -> 2027-dokki, A:han ei kosketa
    const vaihe1 = ajaTallennus('master', p, dokit, { nyt: TAMMI27 });
    expect(await vaihe1.fn(p, 'Tavoite tallennettu')).toBe(true);
    expect(dokit['2026'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['A:aktiivinen']);
    expect(p._idpVuosi, 'ehdotus vei tavoite-ankkurin').toBe('2026');
    expect(p._idpVuosiLuotu).toBe('A');
    expect(p._idpLuonnosVuosi).toBe('2027');
    expect(p._idpLuonnosLuotu).toBe('C');

    // 2) sama istunto: hyvaksynta -> C aktiiviseksi 2027:aan ja A vaihdetuksi 2026:een
    ehdC.status = 'aktiivinen';
    const vaihe2 = ajaTallennus('master', p, dokit, { nyt: TAMMI27 });
    expect(await vaihe2.fn(p, 'Tavoite aktivoitu')).toBe(true);
    expect(dokit['2026'].tavoitteet.map((x) => x.luotu + ':' + x.status), 'vanha jai aktiiviseksi toiseen dokkiin')
      .toEqual(['A:vaihdettu']);
    expect(dokit['2027'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['C:aktiivinen']);
    expect(p._idpVuosi, 'hyvaksynnan jalkeen ankkuri seuraa uutta tavoitetta').toBe('2027');
    expect(p._idpVuosiLuotu).toBe('C');
  });

  it('VP: ladatun tammikuun ehdotuksen hyvaksynta -> 2027 [C aktiivinen], 2026 [A vaihdettu]', async () => {
    const dokit = { 2026: { tavoitteet: [A()] }, 2027: { tavoitteet: [Object.assign(C(), { status: 'ehdotettu' })] } };
    // lataus antaisi taman tilan: tavoite A/2026, luonnos C/2027 (ks. idp_historia_sailyy)
    const p = {
      id: 'p1', _idpTavoite: C(),
      _idpVuosi: '2026', _idpVuosiLuotu: 'A',
      _idpLuonnosVuosi: '2027', _idpLuonnosLuotu: 'C',
    };
    const aja = ajaTallennus('vp', p, dokit, { nyt: TAMMI27 });
    expect(await aja.fn(p, 'Tavoite aktivoitu')).toBe(true);
    expect(aja.loki.kirjoitukset.map((k) => k.vuosi).sort()).toEqual(['2026', '2027']);
    expect(dokit['2027'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['C:aktiivinen']);
    expect(dokit['2026'].tavoitteet.map((x) => x.luotu + ':' + x.status)).toEqual(['A:vaihdettu']);
  });

  it('ehdotuksen tallennus ei siirra tavoite-ankkuria (VP)', async () => {
    const dokit = { 2026: { tavoitteet: [A()] } };
    const p = { id: 'p1', _idpTavoite: Object.assign(C(), { status: 'ehdotettu' }), _idpVuosi: '2026', _idpVuosiLuotu: 'A' };
    const aja = ajaTallennus('vp', p, dokit, { nyt: TAMMI27 });
    await aja.fn(p, 'Tavoite tallennettu');
    expect(p._idpVuosi).toBe('2026');
    expect(p._idpVuosiLuotu).toBe('A');
    expect(p._idpLuonnosVuosi).toBe('2027');
    expect(p._idpLuonnosLuotu).toBe('C');
  });

  it('VP: toisen dokin luku tapahtuu ENNEN kirjoituksia (Firestore-transaktion saanto)', async () => {
    const dokit = { 2026: { tavoitteet: [A()] }, 2027: { tavoitteet: [] } };
    const jarjestys = [];
    const loki = { kirjoitukset: [], luetut: [], pikakentat: [] };
    const db = {
      collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({
        collection: () => ({ doc: (v) => ({ _vuosi: String(v) }) }),
        set: async () => { loki.pikakentat.push(1); },
      }) }) }) }),
      runTransaction: async (fn) => fn({
        get: async (ref) => { jarjestys.push('get:' + ref._vuosi); return { exists: !!dokit[ref._vuosi], data: () => dokit[ref._vuosi] || {} }; },
        set: (ref) => { jarjestys.push('set:' + ref._vuosi); },
      }),
    };
    const src = pura(VP, 'async function _vpTallennaIdpDok(p, viesti)');
    const ymp = ymparisto({
      Date: fakeDate(TAMMI27), db: db, _seuraId: 's1', _isDemoMode: false,
      firebase: { auth: () => ({ currentUser: { getIdToken: async () => 't' } }) },
      idpPikakentat: IDP.idpPikakentat, idpTavoitteetYhdista: IDP.idpTavoitteetYhdista,
      idpTallennusVuosi: IDP.idpTallennusVuosi, idpMerkitseVaihdetuksi: IDP.idpMerkitseVaihdetuksi,
      idpOnVoimassa: IDP.idpOnVoimassa, toast: () => {}, vpT: (s) => s,
    });
    // eslint-disable-next-line no-new-func
    const fn = new Function('__ymp', 'with(__ymp){' + src + '\nreturn _vpTallennaIdpDok;}')(ymp);
    await fn({ id: 'p1', _idpTavoite: C(), _idpVuosi: '2026', _idpVuosiLuotu: 'A' }, 'x');
    const ekaSet = jarjestys.findIndex((x) => x.indexOf('set:') === 0);
    const viimGet = jarjestys.map((x) => x.indexOf('get:') === 0).lastIndexOf(true);
    expect(jarjestys.filter((x) => x.indexOf('get:') === 0)).toHaveLength(2);
    expect(viimGet, 'luku tapahtui kirjoituksen jalkeen — transaktio hylkaisi sen').toBeLessThan(ekaSet);
  });

  it('VP: lataus tallettaa ladatun ehdotuksen lahdevuoden', () => {
    const src = pura(VP, 'async function _vpLataaTavoite(p)');
    expect(src).toContain('_idpLuonnosVuosi');
    expect(src).toContain('_idpLuonnosLuotu');
  });

  it('idpTallennusVuosi: ladattu ehdotus menee omaan dokkiinsa, uusi tavoite kuluvaan', () => {
    const p = { _idpVuosi: '2026', _idpVuosiLuotu: 'A', _idpLuonnosVuosi: '2026', _idpLuonnosLuotu: 'B' };
    expect(IDP.idpTallennusVuosi(p, { luotu: 'B' }, new Date(TAMMI27))).toBe('2026');
    expect(IDP.idpTallennusVuosi(p, { luotu: 'C' }, new Date(TAMMI27))).toBe('2027');
    expect(IDP.idpTallennusVuosi({ _idpVuosi: '2026', _idpVuosiLuotu: 'A' }, { luotu: 'A' }, new Date(TAMMI27))).toBe('2026');
  });

  it('idpMerkitseVaihdetuksi: puhdas, idempotentti, null kun ei merkittavaa', () => {
    const arr = [A(), { luotu: 'X', status: 'hylatty' }];
    const r = IDP.idpMerkitseVaihdetuksi(arr, 'A', new Date(TAMMI27));
    expect(r[0].status).toBe('vaihdettu');
    expect(r[0].vaihdettu_pvm).toBe(new Date(TAMMI27).toISOString());
    expect(r[0].arviot, 'kehityskeskustelut katosivat').toHaveLength(1);
    expect(arr[0].status, 'syotetta mutatoitiin').toBe('aktiivinen');
    expect(r).not.toBe(arr);
    expect(IDP.idpMerkitseVaihdetuksi(r, 'A', new Date()), 'jo vaihdettu -> turha kirjoitus').toBeNull();
    expect(IDP.idpMerkitseVaihdetuksi(arr, 'EI_OLE', new Date())).toBeNull();
    expect(IDP.idpMerkitseVaihdetuksi(arr, null, new Date())).toBeNull();
  });

  it('kirjastoversiot nostettu (VP 9 · Master 9 · Pelaaja 5)', () => {
    const v = (src) => Number((src.match(/lib\/tm_idp\.js\?v=(\d+)/) || [])[1] || 0);
    expect(v(VP)).toBeGreaterThanOrEqual(9);
    expect(v(MASTER)).toBeGreaterThanOrEqual(9);
    expect(v(PELAAJA)).toBeGreaterThanOrEqual(5);
  });
});
