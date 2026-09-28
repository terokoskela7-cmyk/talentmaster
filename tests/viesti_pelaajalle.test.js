/* VIESTI PELAAJALLE + PELAAJAN JA PERHEEN HISTORIA + PERU (PR B)
 *
 * Kolme vikaa, jotka tämä PR korjaa:
 *   1. VP:n muistiinpanon ruudut "Näytä valmentajalle" / "Näytä pelaajalle" tallentuivat,
 *      mutta MIKÄÄN sovellus ei lukenut niitä — teksti ei koskaan mennyt perille.
 *   2. Pelaaja näki vain LUKEMATTOMAT: luettu viesti katosi kokonaan.
 *   3. Viestiä ei voinut perua kukaan paitsi SA, koska sääntö vertasi `tekija_uid`-kenttään,
 *      jota viesteillä ei ole (niillä on `valmentajaUid`).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const V = vaadi('../lib/tm_valmentajaviesti.js');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const PELAAJA = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const VANHEMPI = readFileSync(join(juuri, 'TalentMaster_Vanhempi_v2.html'), 'utf8');
const RULES = readFileSync(join(juuri, 'tm_admin', 'firestore.rules'), 'utf8');

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

/** Firestore-tynkä, joka nappaa kirjoitetun dokumentin. */
function teeDb(kirjatut) {
  return {
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({ collection: () => ({ add: (d) => { kirjatut.push(d); return Promise.resolve({ id: 'x' }); } }) }),
          add: (d) => { kirjatut.push(d); return Promise.resolve({ id: 'x' }); },
        }),
      }),
    }),
  };
}
const SENTINEL = { serverTimestamp: () => ({ __ts: true }) };

/* ── 1 · JAETTU KIRJOITUSPISTE ────────────────────────────────────────── */

describe('(1) tmLahetaValmentajaViesti — yksi kirjoituspiste', () => {
  it('EI VACUOUS: dokumentti syntyy ja kentät täyttyvät', async () => {
    const kirjatut = [];
    await V.tmLahetaValmentajaViesti(teeDb(kirjatut), {
      seuraId: 'kpv', pelaajaId: 'p1', teksti: 'Hyvä treeni', uid: 'u1',
      nimi: 'Tero Koskela', sentinel: SENTINEL,
    });
    expect(kirjatut).toHaveLength(1);
    expect(kirjatut[0]).toMatchObject({
      tyyppi: 'valmentaja_viesti', tila: 'valmis', nakyvyys: 'pelaaja',
      teksti: 'Hyvä treeni', valmentajaUid: 'u1', tekija_uid: 'u1',
      valmentajaNimi: 'Tero Koskela', tekija_nimi: 'Tero Koskela',
      pelaaja_lukenut: false,
    });
  });

  it('nakyvyys on AINA pelaaja — ilman sitä viesti katoaa lapselta', () => {
    const lib = readFileSync(join(juuri, 'lib', 'tm_valmentajaviesti.js'), 'utf8');
    expect(lib).toContain("nakyvyys: 'pelaaja'");
  });

  it('luotu on serverTimestamp (Rules vaatii timestampin luonnissa, A5)', async () => {
    const kirjatut = [];
    await V.tmLahetaValmentajaViesti(teeDb(kirjatut), {
      seuraId: 'kpv', pelaajaId: 'p1', teksti: 'x', uid: 'u1', sentinel: SENTINEL,
    });
    expect(kirjatut[0].luotu).toEqual({ __ts: true });
  });

  it('ilman sentinelia kirjoitusta EI tehdä (mieluummin virhe kuin hylätty kirjoitus)', async () => {
    const kirjatut = [];
    await expect(V.tmLahetaValmentajaViesti(teeDb(kirjatut), {
      seuraId: 'kpv', pelaajaId: 'p1', teksti: 'x', uid: 'u1',
    })).rejects.toThrow(/sentinel/);
    expect(kirjatut).toHaveLength(0);
  });

  it('tyhjä teksti ei kirjoita mitään', async () => {
    const kirjatut = [];
    await expect(V.tmLahetaValmentajaViesti(teeDb(kirjatut), {
      seuraId: 'kpv', pelaajaId: 'p1', teksti: '   ', uid: 'u1', sentinel: SENTINEL,
    })).rejects.toThrow();
    expect(kirjatut).toHaveLength(0);
  });

  it('SÄHKÖPOSTI ei päädy lähettäjän nimeksi (lapsi näkee sen)', async () => {
    const kirjatut = [];
    await V.tmLahetaValmentajaViesti(teeDb(kirjatut), {
      seuraId: 'kpv', pelaajaId: 'p1', teksti: 'x', uid: 'u1',
      nimi: 'talentmasterid@gmail.com', sentinel: SENTINEL,
    });
    expect(kirjatut[0].valmentajaNimi).toBe('Valmentaja');
    expect(kirjatut[0].tekija_nimi).toBe('Valmentaja');
  });

  it('KOLME KUTSUJAA, NOLLA KOPIOTA: kukaan ei rakenna dokumenttia itse', () => {
    [['Master', MASTER], ['VP', VP]].forEach(([nimi, s]) => {
      expect(ilmanKommentteja(s), nimi + ' rakentaa viestidokumentin itse')
        .not.toMatch(/tyyppi:\s*'valmentaja_viesti'/);
      expect(s, nimi + ' ei kutsu jaettua kirjoituspistettä').toContain('tmLahetaValmentajaViesti(');
    });
  });
});

/* ── 2 · VP:N KIRJOITUSLOMAKE ─────────────────────────────────────────── */

describe('(2) VP: "Kirjoita" korvaa kuolleet ruudut', () => {
  const lomake = () => pura(VP, 'async function avaaPelaajaMuistiinpanoModal(');

  it('kuolleet ruudut on poistettu', () => {
    const f = lomake();
    expect(f, 'ruutu tallentui mutta mikään ei lukenut sitä').not.toContain('id="_pmpVal"');
    expect(f).not.toContain('id="_pmpPel"');
  });

  it('tilalla on kaksi selkeää kohdetta', () => {
    const f = lomake();
    expect(f).toContain('data-pmp-kohde="muisti"');
    expect(f).toContain('data-pmp-kohde="viesti"');
  });

  it('viestikohde kirjoittaa JAETULLA funktiolla, muistiinpano ennallaan', () => {
    const f = pura(VP, 'async function _tallennaPMP(pelaajaId, pelaajaNimi) {');
    expect(f).toContain("window._pmpKohde === 'viesti'");
    expect(f).toContain('tmLahetaValmentajaViesti(');
    expect(f).toContain('tallennaPelaajaMuistiinpano(');
  });

  it('uusiin muistiinpanoihin EI kirjoiteta kuolleita näkyvyyskenttiä', () => {
    const f = pura(VP, 'async function _tallennaPMP(pelaajaId, pelaajaNimi) {');
    expect(f).toContain('tallennaPelaajaMuistiinpano(pelaajaId, teksti, kategoria, false, false)');
  });

  it('vanhojen muistiinpanojen harhaanjohtava näkyvyysteksti on poistettu', () => {
    const f = lomake();
    expect(f, 'teksti lupasi jotain mitä ei tapahtunut').not.toContain("nakyvyys.push('pelaaja')");
    expect(f).toContain("vpT('oma muistiinpano')");
  });

  it('lähettäjän nimi luetaan kayttajat-dokumentista, ei sähköpostista', () => {
    const f = pura(VP, 'async function _vpOmaNimi() {');
    expect(f).toContain('tmViestiNimi(');
    expect(f).toContain("collection('kayttajat')");
  });
});

/* ── 3 · VALMENTAJAN SOVELLUS ─────────────────────────────────────────── */

describe('(3) valmentajan sovellus: viesti myös pelaajakortilta', () => {
  it('pelaajakortilla on Viesti-painike', () => {
    expect(MASTER).toContain('_avaaViestiPelaajalle(');
    expect(MASTER).toContain("masterT('✉ Viesti')");
  });

  it('lomake kutsuu samaa jaettua funktiota', () => {
    const f = pura(MASTER, 'window._avaaViestiPelaajalle = function (pelaajaId) {');
    expect(f).toContain('tmLahetaValmentajaViesti(');
    expect(f, 'tyhjä viesti ei saa lähteä').toContain('if (!teksti.trim())');
  });
});

/* ── 4 · PELAAJAN NÄKYMÄ ──────────────────────────────────────────────── */

describe('(4) Pelaaja: luettu ei katoa', () => {
  it('KAIKKI näytettävät rivit tallennetaan, ei vain lukemattomia', () => {
    /* Muuttujan nimen etsiminen EI riitä: mutaatio, joka lisäsi `pelaaja_lukenut === false`
       -ehdon talteenoton suodattimeen, säilytti nimen ja meni vartijasta läpi. Rajaus on
       mitattava itsestään: talteenotto EI saa katsoa lukutilaa, ja lukemattomat on
       johdettava talteenotetusta listasta. */
    const f = pura(PELAAJA, 'function _p6Tilaa(seuraId, pelaajaId, yritys) {');
    const talteen = f.slice(f.indexOf('var nakyvat ='), f.indexOf('var lukemattomat'));
    expect(talteen, 'talteenotto suodattaa lukutilan mukaan → luettu katoaisi taas')
      .not.toContain('pelaaja_lukenut');
    expect(f, 'lukemattomat on johdettava talteenotetusta listasta')
      .toContain('window._havKaikki.filter(function(x) { return x.pelaaja_lukenut === false; })');
  });

  it('KÄYTTÄYTYMINEN: luettu rivi renderöityy osioon "Aiemmat"', () => {
    /* Aito ajo: render lukee `window._havKaikki`:n ja jakaa rivit kahteen osioon. */
    const runko = [
      pura(PELAAJA, 'function _mEscP(s) {'),
      pura(PELAAJA, 'function _valmentajaltaRivit() {'),
      pura(PELAAJA, 'function rValmentajalta() {'),
    ].join('\n');
    const store = {
      window: {
        _havKaikki: [
          { _id: 'uusi', teksti: 'Uusi viesti', pelaaja_lukenut: false, tekija_nimi: 'Tero' },
          { _id: 'vanha', teksti: 'Vanha viesti', pelaaja_lukenut: true, tekija_nimi: 'Tero' },
        ],
        _p7Pelaaja: { seuraId: 's', pelaajaId: 'p' },
      },
      String, Object, Array,
    };
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    // eslint-disable-next-line no-new-func
    const html = new Function('__ymp', 'with(__ymp){' + runko + '\nreturn rValmentajalta();}')(ymp);
    expect(html, 'uusi viesti puuttuu').toContain('Uusi viesti');
    expect(html, 'LUETTU VIESTI KATOSI — juuri tämä oli vika').toContain('Vanha viesti');
    expect(html.indexOf('Uusi'), 'Uusi-osio ennen Aiemmat-osiota')
      .toBeLessThan(html.indexOf('Aiemmat'));
    expect(html, 'vain lukematon saa Luettu-napin')
      .toContain('vk-msg uusi');
  });

  it('luettu siirtyy osioon "Aiemmat" eikä katoa', () => {
    const f = pura(PELAAJA, 'function rValmentajalta() {');
    expect(f).toContain('Aiemmat');
    expect(f).toContain('Uusi');
    expect(f, 'luetut erotellaan lukemattomista').toContain('r.luettu');
  });

  it('§7.22: pelaajalle EI näytetä pisteitä', () => {
    const f = pura(PELAAJA, 'function rValmentajalta() {');
    expect(f, 'pistechipit kuuluvat valmentajan näkymään').not.toContain('tmHhHTML(');
    expect(f).not.toContain('pisteet');
  });

  it('XSS: pelaajalle renderöity teksti escapoidaan', () => {
    const f = pura(PELAAJA, 'function rValmentajalta() {');
    expect(f).toContain('_mEscP(r.teksti)');
    expect(f).toContain('_mEscP(r.tekija)');
    const esc = pura(PELAAJA, 'function _mEscP(s) {');
    expect(esc).toContain('&lt;');
  });

  it('merkki avaa Meistä-välilehden, ei vanhaa läpikuultavaa overlayta', () => {
    expect(PELAAJA).toContain('_avaaValmentajalta()');
    const f = pura(PELAAJA, 'function _avaaValmentajalta() {');
    expect(f).toContain("_tab = 'meista'");
  });

  it('luetuksi-merkintä ei poista riviä tilasta', () => {
    const f = pura(PELAAJA, 'async function _p6Luetuksi(havId, seuraId, pelaajaId) {');
    expect(f).toContain('x.pelaaja_lukenut = true');
    expect(f, 'rivi on säilytettävä, jotta se näkyy Aiemmat-osiossa').toContain('window._havKaikki');
  });

  it('SW-välimuistiversio nostettu (puhelinten haettava uusi sivu)', () => {
    const sw = readFileSync(join(juuri, 'sw_pelaaja.js'), 'utf8');
    expect(sw).toMatch(/const CACHE = 'tm-pelaaja-v(3[3-9]|[4-9]\d)'/);
  });
});

/* ── 5 · PERHE ────────────────────────────────────────────────────────── */

describe('(5) Perhe näkee samat tekstit kuin pelaaja', () => {
  it('kysely rajaa tila + nakyvyys (ei enää pelkkä tyyppi)', () => {
    const i = VANHEMPI.indexOf(".where('tila', '==', 'valmis')");
    expect(i, 'tila-rajaus puuttuu → perutut jäisivät näkyviin').toBeGreaterThan(-1);
    const ketju = VANHEMPI.slice(i, VANHEMPI.indexOf('.get()', i));
    expect(ketju, 'ilman nakyvyys-ehtoa Rules hylkää koko kyselyn')
      .toContain(".where('nakyvyys', '==', 'pelaaja')");
    expect(ketju, 'pelihavainnot eivät saa pudota pois').not.toContain("'valmentaja_viesti'");
  });

  it('järjestys tulee jaetusta kirjastosta', () => {
    expect(VANHEMPI).toContain('tmHhRivit(');
  });

  it('perhe EI merkitse lapsen viestiä luetuksi — merkintä on paikallinen', () => {
    const f = pura(VANHEMPI, 'function _vMerkitseNahdyksi(){');
    expect(f).toContain('localStorage.setItem');
    expect(ilmanKommentteja(VANHEMPI), 'anonyymi saa päivittää vain pelaaja_lukenut-kentän')
      .not.toContain('vanhempi_lukenut: true');
  });

  it('XSS: perheelle renderöity teksti escapoidaan', () => {
    const f = pura(VANHEMPI, 'function _valmentajaListaHtml(){');
    expect(f).toContain('_vEsc(_vViestiTeksti(v))');
    expect(f).toContain('_vEsc(v.tekija)');
  });
});

/* ── 6 · PERU ─────────────────────────────────────────────────────────── */

describe('(6) Peru — merkintä, ei poisto', () => {
  it('Rules: tekijäkenttä kattaa myös valmentajaUid', () => {
    /* Juurisyy: viestin kirjoittaja ei voinut perua omaa viestiään, koska sääntö vertasi
       vain `tekija_uid`-kenttään, jota viesteillä ei ole. */
    const f = pura(RULES, 'function onPerujaSallittu(seuraId) {');
    expect(f).toContain("resource.data.get('tekija_uid', '') == request.auth.uid");
    expect(f).toContain("resource.data.get('valmentajaUid', '') == request.auth.uid");
  });

  it('Rules: seuran johto saa perua oman seuran merkinnän', () => {
    const f = pura(RULES, 'function onPerujaSallittu(seuraId) {');
    expect(f).toContain('onOmaSeura(seuraId) && onJohtoRooli()');
  });

  it('Rules: peruttu pysyy lukittuna ja pisteitä ei saa muuttaa', () => {
    const f = pura(RULES, 'function peruminenKelpaa(seuraId) {');
    expect(f).toContain("affectedKeys().hasAny(['pisteet'])");
    expect(f).toContain("resource.data.get('tila', '') != 'peruttu' || onSuperAdmin()");
  });

  it('UI peilaa sääntöä: Peru näkyy vain tekijälle ja johdolle', () => {
    const f = pura(VP, 'function _vpSaaPerua(rivi) {');
    expect(f).toContain('rivi.tekijaUid === _uid');
    expect(f).toContain('VP_JOHTOROOLIT');
  });

  it('peruminen on merkintä, ei poisto', () => {
    const f = pura(VP, 'async function _vpHhPeru(havId) {');
    expect(f).toContain("tila: 'peruttu'");
    expect(f).toContain('peruttu_uid: _uid');
    expect(f, 'jälki on jäätävä historiaan').not.toMatch(/\.delete\s*\(/);
  });

  it('pikakentät lasketaan uudelleen (peruttu ei saa jäädä peliälyyn)', () => {
    expect(pura(VP, 'async function _vpHhPeru(havId) {')).toContain('_vpHhPaivitaPikakentat(');
    expect(pura(VP, 'async function _vpHhPaivitaPikakentat(pelaajaId) {')).toContain('tmAdarPikakentat(');
  });

  it('vahvistus kertoo mitä tapahtuu', () => {
    const f = pura(VP, 'function _vpHhVahvista(havId, nappi) {');
    expect(f).toContain('Teksti poistuu pelaajan ja perheen appista heti');
    expect(f).toContain('Se jää tähän historiaan merkinnällä Peruttu.');
  });
});
