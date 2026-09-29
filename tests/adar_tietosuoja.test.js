/* ADAR-PIKAKORTTI · TIETOSUOJA (vaihe 1)
 *
 * Kaksi erillistä vikaa, kaksi vartijaryhmää:
 *
 *  1. KUVA. "Lisää kuva havaintoon" tallensi kuvan alaikäisestä Storageen ja lähetti sen
 *     aiProxyn kautta OpenAI gpt-4o:lle (Yhdysvallat). Siirrolle ei ollut suostumusmekanismia
 *     eikä EU-reittiä. Toiminto on poistettu kokonaan — client, palvelin ja Storage-polku.
 *
 *  2. NÄKYVYYS. Tallennus kirjoitti aina `nakyvyys:'pelaaja'`, ja Pelaaja_v7 näytti jokaisen
 *     valmiin havainnon narratiivin. Taso 1:n "Valmentajan muistiinpano" meni siis sellaisenaan
 *     8–12-vuotiaalle. Nyt näkyvyys on valmentajan nimenomainen valinta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const vaadi = createRequire(import.meta.url);
const ADAR = lue('TalentMaster_ADAR_Pikakortti.html');
const PELAAJA = lue('TalentMaster_Pelaaja_v7.html');

/* Kommentit riisutaan ennen kieltotarkistuksia: muutoksen PERUSTELU mainitsee kielletyt
   käsitteet, eikä vartija saa punertaa siitä että syy on kirjattu. */
const ilmanKommentteja = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const ADAR_KOODI = ilmanKommentteja(ADAR);

function pura(lahde, tunniste) {
  const i = lahde.indexOf(tunniste);
  if (i < 0) throw new Error('ei löydy: ' + tunniste);
  let syvyys = 0;
  for (let j = lahde.indexOf('{', i); j < lahde.length; j++) {
    if (lahde[j] === '{') syvyys++;
    else if (lahde[j] === '}') { syvyys--; if (!syvyys) return lahde.slice(i, j + 1); }
  }
  throw new Error('sulkeet eivät täsmää: ' + tunniste);
}

/* ── 1 · KUVA POIS ────────────────────────────────────────────────────── */

describe('(1) kuvatoiminto on poistettu clientistä', () => {
  it.each(['aiProxy', 'adar_vision', 'storage()', '.put('])(
    'pikakortin lähteessä ei ole %s', (kielletty) => {
      expect(ADAR_KOODI, 'kuvapolku ei saa jäädä edes kutsumattomana').not.toContain(kielletty);
    });

  it.each(['_kuvaValittu', '_kuvaPoista', '_kuvaNaytaPreview', '_skaalaaKuva',
    '_lataaKuvaStorageen', '_pyydaAINarratiivi'])('funktio %s on poistettu', (fn) => {
    expect(ADAR_KOODI).not.toContain(fn);
  });

  it('kuvan UI-elementit ovat poissa', () => {
    ['kuva-alue', 'kuva-nappi', 'Lisää kuva havaintoon', 'ai-narratiivi-tulos', 'AI analysoi']
      .forEach((s) => expect(ADAR, 'UI-jäänne: ' + s).not.toContain(s));
  });

  /* PR 2B: tallennusfunktio on `_phTallenna` (saveCard poistui tasovälilehtien mukana).
     Vartijan kohde on sama: havaintodokumenttiin ei kirjoiteta media-kenttää. */
  it('tallennus ei kirjoita media-kenttää', () => {
    const f = pura(ADAR, 'async function _phTallenna(');
    expect(ilmanKommentteja(f)).not.toMatch(/\bmedia\s*[:=]/);
  });

  it('kuvaluonnoksen kirjoitus ja luku on poistettu, tyhjennys jäi', () => {
    expect(ADAR_KOODI).not.toContain('_luonnosTallennaKuva');
    expect(ADAR_KOODI).not.toContain('_luonnosHaeKuva');
    /* Pelkkä poisto ei riitä: laitteille jääneet kuvat on tyhjennettävä. */
    expect(ADAR_KOODI).toContain('_luonnosTyhjennaKuvaStore');
    expect(pura(ADAR, 'function _luonnosTyhjennaKuvaStore(')).toContain('s.clear()');
  });

  it('service workerin välimuistiversio on nostettu (vanha HTML ei saa palvella)', () => {
    /* Väljä alaraja: versio saa nousta myöhemmissä PR:issä (2B nosti v3:een), mutta se ei saa
       palata kuvallista HTML:ää palvelleeseen v1:een. */
    const sw = lue('sw_adar.js');
    expect(sw).toMatch(/const CACHE = 'tm-adar-v([2-9]|\d\d+)'/);
    expect(sw).not.toContain("'tm-adar-v1'");
  });
});

describe('(2) palvelin torjuu vanhatkin clientit', () => {
  const CF = lue('functions/index.js');
  const lohko = pura(CF, "if (task === 'adar_vision_narratiivi') {");

  it('adar_vision_narratiivi vastaa 410 POISTETTU', () => {
    expect(lohko).toContain('410');
    expect(lohko).toContain("code: 'POISTETTU'");
  });

  it('vastaus annetaan ENNEN kuin kuvaa luetaan tai välitetään', () => {
    const koodi = ilmanKommentteja(lohko);
    ['body.kuva', 'base64', 'OPENAI_API_KEY', 'systemPrompt'].forEach((s) => {
      expect(koodi, 'kuvaa ei saa koskea: ' + s).not.toContain(s);
    });
  });

  it('käyttäjän ohje-kenttää ei enää käytetä', () => {
    expect(ilmanKommentteja(lohko)).not.toContain('body.ohje');
  });
});

describe('(3) Storage-polku on suljettu', () => {
  const SR = lue('storage.rules');
  const lohko = SR.slice(SR.indexOf('match /seurat/{sid}/havainnot/'),
    SR.indexOf('match /seurat/{sid}/brandi/'));

  it('kirjoitus vain SA:lle (valmentaja ei voi enää ladata kuvaa)', () => {
    expect(lohko).toContain('allow write:  if onSuperAdmin();');
    expect(lohko, 'valmentajaroolit eivät saa kirjoittaa').not.toContain("'valmentaja'");
  });

  it('luku SA:lle ja oman seuran johdolle (inventaariota varten)', () => {
    expect(lohko).toContain("rooli in ['vp', 'urheilutoimenjohtaja']");
  });

  it('poisto SA:lle (siivous)', () => {
    expect(lohko).toContain('allow delete: if onSuperAdmin();');
  });
});

describe('(4) GDPR-poisto löytää myös pre_-polkuiset kuvat', () => {
  const LOC = lue('functions/gdpr_locator.js');
  const IDX = lue('functions/index.js');

  it('media[]-urleista johdetaan objektipolku', () => {
    expect(LOC).toContain('function mediaPolku(');
    expect(LOC).toContain('storagePolut');
  });

  /* AJETTU todiste: pelkkä lähdehaku pysyisi vihreänä vaikka `polut` palautettaisiin tyhjänä.
     Fixtuurissa on molemmat urlimuodot ja `pre_`-polku, joka on juuri se, mitä per-havainto-
     prefiksi ei löydä. */
  it('gs:// ja download-url purkautuvat objektipoluiksi', async () => {
    const { keraaPelaajanManifesti } = await import('../functions/gdpr_locator.js')
      .then((m) => m.default || m);
    const SID = 'sjk', PID = 'p1';
    const base = 'seurat/' + SID + '/pelaajat/' + PID;
    const rivit = {
      [base + '/havainnot']: [
        { id: 'h1', data: { media: [{ storage_url: 'gs://bucket/seurat/sjk/havainnot/pre_1727/media_0.jpg' }] } },
        { id: 'h2', data: { media: [{ download_url: 'https://firebasestorage.googleapis.com/v0/b/b/o/seurat%2Fsjk%2Fhavainnot%2Fpre_9%2Fmedia_1.jpg?alt=media&token=x' }] } },
      ],
    };
    const tyhja = { docs: [], empty: true, size: 0 };
    const kokoelma = (polku) => ({
      get: async () => {
        const r = rivit[polku] || [];
        return { docs: r.map((x) => ({ id: x.id, data: () => x.data })), empty: !r.length, size: r.length };
      },
      where: () => ({ get: async () => tyhja, limit: () => ({ get: async () => tyhja }) }),
      limit: () => ({ get: async () => tyhja }),
      doc: () => ({ get: async () => ({ exists: false, data: () => ({}) }), collection: kokoelma }),
    });
    const db = {
      collection: function col(polku) {
        return Object.assign(kokoelma(polku), {
          doc: (id) => ({
            get: async () => ({ exists: id === PID, id, data: () => ({ etunimi: 'T', tunniste: '123' }) }),
            collection: (alikok) => col(polku + '/' + id + '/' + alikok),
          }),
        });
      },
    };
    const m = await keraaPelaajanManifesti(db, SID, PID);
    expect(m.storagePolut, 'gs:// ei purkautunut')
      .toContain('seurat/sjk/havainnot/pre_1727/media_0.jpg');
    expect(m.storagePolut, 'download-url ei purkautunut (url-enkoodaus)')
      .toContain('seurat/sjk/havainnot/pre_9/media_1.jpg');
  });

  it('poisto käyttää polkuja prefiksien LISÄKSI', () => {
    expect(IDX).toContain('manifesti.storagePolut');
    expect(IDX, 'pelkkä prefiksi ei löytänyt pre_-polkuja').toContain('bucket.file(polku).delete()');
  });
});

/* ── 2 · NÄKYVYYS ─────────────────────────────────────────────────────── */

describe('(5) näkyvyys on valmentajan valinta, ei oletus', () => {
  /* PR 2B: tasot poistuivat, joten näkyvyys ei ole enää per tier vaan per havainto
     (`window._phTila.nakyvyys`). Vartijat AJAVAT yhä aidot funktiot lähteestä — merkkijonohaku
     kertoisi vain, että jokin logiikka on olemassa, ei että se valitsee oikein. */
  function ajaNak(syntymaVuosi) {
    const store = {
      Date, Number, String, Object, isNaN,
      window: {
        _pelaajaMap: { p1: { syntymaVuosi } },
        _phTila: { pelaajaId: 'p1', nakyvyys: null },
      },
      _phRender: () => {},
    };
    store.window.window = store.window;
    const ymp = new Proxy(store, {
      has: (t2, k) => (k in t2) || !(k in globalThis),
      get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)),
      set: (t2, k, v) => { t2[k] = v; return true; },
    });
    const runko = [
      pura(ADAR, 'function _phPelaaja('), pura(ADAR, 'function _phIka('),
      pura(ADAR, 'function _nakPelaajanIka('), pura(ADAR, 'function _nakOletus('),
      pura(ADAR, 'function _nakVaihda('), pura(ADAR, 'function _nakNollaa('),
      pura(ADAR, 'function _nakArvo('),
    ].join('\n');
    // eslint-disable-next-line no-new-func
    const api = new Function('__ymp', 'with(__ymp){' + runko
      + '\nreturn { nollaa: _nakNollaa, vaihda: _nakVaihda, arvo: _nakArvo, oletus: _nakOletus };}')(ymp);
    api.nollaa('p1');
    return api;
  }

  const vuosiIalle = (ika) => new Date().getFullYear() - ika;

  it('alle 13-vuotiaalla oletus on POIS — muistiinpano ei mene lapselle', () => {
    expect(ajaNak(vuosiIalle(10)).arvo()).toBe('valmentajat');
  });

  it('13+ oletus on PÄÄLLÄ', () => {
    expect(ajaNak(vuosiIalle(14)).arvo()).toBe('pelaaja');
  });

  it('IKÄ ratkaisee, EI porras (porras vaihtuu, oletus ei)', () => {
    /* Porras on arvioinnin laajuus, ikä on tietosuojaperuste. Jos oletus seuraisi porrasta,
       10-vuotias portaalla 3 saisi muistiinpanon näkyviin. */
    const f = pura(ADAR, 'function _nakOletus(');
    expect(f, 'oletus lukee ikää').toContain('_nakPelaajanIka(');
    expect(f, 'oletus ei saa lukea porrasta').not.toContain('porras');
    expect(ajaNak(vuosiIalle(10)).arvo()).toBe('valmentajat');
  });

  it('ikä tuntematon → FAIL-CLOSED (ei lapselle)', () => {
    expect(ajaNak(null).arvo()).toBe('valmentajat');
  });

  it('otsikko ja selite kertovat kummalle näkyy', () => {
    const f = pura(ADAR, 'function _phRenderHavainto(');
    expect(f).toContain("'Viesti pelaajalle'");
    expect(f).toContain("'Muistiinpano · vain valmentajille'");
    expect(f, 'selite ei kerro että pelaaja ei näe havaintoa lainkaan')
      .toContain('Pelaaja ei näe tätä havaintoa lainkaan');
    expect(f, 'otsikko ei riipu kytkimestä').toContain('on ?');
  });

  it('valinta EI jää muistiin: nollaus palauttaa oletukseen', () => {
    const api = ajaNak(vuosiIalle(10));
    api.vaihda();
    expect(api.arvo()).toBe('pelaaja');
    api.nollaa('p1');
    expect(api.arvo(), 'edellisen havainnon valinta vuoti seuraavaan').toBe('valmentajat');
  });

  it('tallennus lukee kytkimen, ei kovakoodaa arvoa', () => {
    const f = pura(ADAR, 'async function _phTallenna(');
    expect(f).toContain('nakyvyys: _nakArvo()');
    expect(ilmanKommentteja(f), 'kovakoodattu oletus').not.toMatch(/nakyvyys:\s*'pelaaja'/);
  });

  it('kytkin nollautuu pelaajan vaihtuessa (myös Seuraava pelaaja -ketjussa)', () => {
    /* Yksi polku pelaajan avaukseen → nollaus ei voi unohtua toisesta. */
    const f = pura(ADAR, 'function _phAvaaPelaaja(');
    expect(f).toContain('S.nakyvyys = _nakOletus(pid)');
    const ok = pura(ADAR, 'function _phRenderOk(');
    expect(ok, 'Seuraava pelaaja ei kulje _phAvaaPelaaja:n kautta').toContain('_phAvaaPelaaja(');
  });

  it('vahvistus kertoo kummalle tallennettiin', () => {
    /* Toastin tilalla on pysyvä merkintä Tallennettu-näkymässä: se ei katoa 3 sekunnissa. */
    const f = pura(ADAR, 'function _phRenderOk(');
    expect(f).toContain('Pelaaja näkee viestin');
    expect(f).toContain('Vain valmentajille');
    expect(f, 'merkintä ei riipu tallennetusta näkyvyydestä').toContain("nakyvyys === 'pelaaja'");
  });
});

describe('(6) Pelaaja_v7 näyttää vain pelaajalle merkityt', () => {
  it('kysely rajaa nakyvyys-kentällä (Rules ei suodata)', () => {
    expect(PELAAJA).toContain(".where('nakyvyys', '==', 'pelaaja')");
  });

  it('client-suodatin vaatii nimenomaisen arvon — puuttuva EI kelpaa', () => {
    const f = pura(PELAAJA, 'function _p6NakyyPelaajalle(');
    expect(f).toContain("d.nakyvyys !== 'pelaaja'");
  });

  it('EI VACUOUS: tekstiehto säilyy (tyhjiä pistehavaintoja ei näytetä)', () => {
    const f = pura(PELAAJA, 'function _p6NakyyPelaajalle(');
    expect(f).toContain('d.narratiivi');
  });
});

describe('(7) valmentaja näkee listassa kummalle havainto meni', () => {
  it('Masterin havaintolista merkitsee "vain valmentajille"', () => {
    /* Lista siirtyi jaettuun kirjastoon (lib/tm_havaintohistoria.js), joten näkyvyysmerkintä
       tulee sieltä. Vartijan MERKITYS on sama: valmentajan on nähtävä yhdellä silmäyksellä,
       menikö teksti lapselle. Nyt se ajetaan, ei haeta merkkijonona. */
    const HH = vaadi('../lib/tm_havaintohistoria.js');
    const rivit = HH.tmHhRivit([
      { id: 'a', teksti: 'x', nakyvyys: 'valmentajat', luotu: '2026-09-28' },
      { id: 'b', teksti: 'y', nakyvyys: 'pelaaja', luotu: '2026-09-27' },
    ]);
    const html = HH.tmHhHTML(rivit, {});
    expect(html).toContain('Vain valmentajille');
    expect(html).toContain('Pelaaja näkee');
    const M = lue('TalentMaster_Master_v16.html');
    expect(M, 'Master ei käytä jaettua listaa').toContain('tmHhHTML(');
  });
});


/* ── 8 · VALMENTAJAN VIESTIT PERHEELLE ───────────────────────
   Näkyvyysrajaus koskee KOKO `havainnot`-kokoelmaa, ei vain ADAR-havaintoja. Sama polku
   kuljettaa valmentajan viestit perheelle (Master `sendReply` + `inboxReact`), ja ne luetaan
   kahdesta paikasta: Pelaaja_v7 (anonyymi PIN) ja Vanhempi_v2 (anonyymi, r.1443).

   Ilman kenttää kirjoitettu viesti katoaisi pelaajalta, ja ilman kyselyehtoa Rules hylkäisi
   huoltajan KOKO kyselyn — Viestit-välilehti tyhjenisi myös vanhoista viesteistä. Kirjoitus-
   ja lukupuoli on siis vartioitava parina. */
describe('(8) valmentajan viesti perheelle säilyy näkyvänä', () => {
  const MASTER = lue('TalentMaster_Master_v16.html');
  const VANHEMPI = lue('TalentMaster_Vanhempi_v2.html');
  const MASTER_KOODI = ilmanKommentteja(MASTER);

  /* Kirjoituspuoli: JOKAINEN valmentaja_viesti-kirjoitus saa kentän. Laskenta lähteestä
     (ei kovakoodattua kahta kohtaa), jotta uusi kirjoituspiste ei livahda vartijan ohi. */
  it('valmentaja_viesti kirjoitetaan VAIN jaetun funktion kautta', () => {
    /* Kirjoituspisteitä on kolme (Masterin sendReply ja inboxReact, VP:n pelaajakortti).
       Kolme kopiota ajautuisi erilleen — juuri siksi `nakyvyys` puuttui aikanaan. Vartija
       ei siis enää tarkista kenttaa per kirjoituspiste, vaan sitä ettei kirjoituspisteitä
       ole kuin yksi: itse kirjasto. */
    const VP2 = lue('TalentMaster_VP_v25.html');
    [['Master', MASTER_KOODI], ['VP', ilmanKommentteja(VP2)]].forEach(([nimi, koodi]) => {
      expect(koodi, nimi + ' rakentaa viestidokumentin itse')
        .not.toMatch(/tyyppi:\s*'valmentaja_viesti'/);
      expect(koodi, nimi + ' ei kutsu jaettua kirjoituspistettä')
        .toContain('tmLahetaValmentajaViesti(');
    });
  });

  it('jaettu funktio asettaa nakyvyyden ja timestampin', () => {
    /* Tämä on se paikka, jossa invariantit elävät. */
    const lib = lue('lib/tm_valmentajaviesti.js');
    expect(lib).toContain("nakyvyys: 'pelaaja'");
    expect(lib).toContain('o.sentinel.serverTimestamp()');
    expect(lib, 'ilman sentinelia Rules hylkäisi luonnin (A5)').toContain('serverTimestamp-sentinel puuttuu');
  });

  it('lähettäjän nimi ei voi olla sähköposti (lapsi näkee sen)', () => {
    const V = vaadi('../lib/tm_valmentajaviesti.js');
    expect(V.tmViestiNimi(['talentmasterid@gmail.com'])).toBe('Valmentaja');
    expect(V.tmViestiNimi(['Tero Koskela'])).toBe('Tero Koskela');
    expect(V.tmViestiNimi([''])).toBe('Valmentaja');
  });

  /* Lukupuoli: vanhemman kysely. Tämä on se kohta joka hajosi katselmoinnissa. */
  it('Vanhempi_v2 kysyy nakyvyys-ehdolla (muuten koko kysely hylätään)', () => {
    expect(VANHEMPI).toContain(".where('nakyvyys', '==', 'pelaaja')");
  });

  it('Vanhempi_v2:n nakyvyys-ehto on SAMASSA kyselyssä kuin tila-ehto', () => {
    /* Kysely laajeni: perhe näkee myös pelaajalle jaetut PELIHAVAINNOT, joten rajaus on
       `tila` + `nakyvyys` eikä enää `tyyppi`. `tila=='valmis'` pudottaa perutut pois. */
    const i = VANHEMPI.indexOf(".where('tila', '==', 'valmis')");
    expect(i, 'tila-rajausta ei löydy').toBeGreaterThan(-1);
    /* Ehtojen on oltava samassa ketjussa ennen .get():iä — erillinen where muualla ei auta. */
    const ketju = VANHEMPI.slice(i, VANHEMPI.indexOf('.get()', i));
    expect(ketju).toContain(".where('nakyvyys', '==', 'pelaaja')");
  });

  /* Vaihe 0 / PR 2: Vanhempi_v2:n ehdoton anonyymi istunto poistettiin (huoltaja kirjautuu
     sähköpostilla, nimetty appi 'tm-vanhempi'). nakyvyys-rajaus koskee yhä huoltajan kyselyä
     (onLapsenHuoltaja), joten ylempi vartija on edelleen tarpeen. */
  it('Vanhempi_v2 EI enää kirjaudu anonyymisti (PR 2)', () => {
    const koodi = VANHEMPI.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    expect(koodi).not.toContain('signInAnonymously');
  });
});
