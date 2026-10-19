/* PELIHAVAINNON PIKAKORTTI v2 (PR 2B)
 *
 * Kolme vartijakerrosta:
 *   1. KÄYTETTÄVYYS — kaksi napautusta minimissä, porras ohjaa ulottuvuudet, järjestys on
 *      "pisimpään havainnoimatta ensin". Nämä ajetaan OIKEILLA funktioilla lähteestä.
 *   2. EI KOPIOITA — konsensus, portaat ja ikäportitus tulevat libistä. Inline-kopio ajautuisi
 *      erilleen Masterista, ja sama pelaaja saisi kahdessa näkymässä eri luvun.
 *   3. TALLENNUS — yksi polku, ei omaa offline-jonoa; kumoaminen on merkintä, ei poisto.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { PT_WINDOW } from './helpers/pelitilanne_lib.mjs';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const SIVU = readFileSync(join(juuri, 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');
const LIB = vaadi('../lib/tm_pelialy_yksilo.js');

/* Kommentit pois ennen kieltovartijoita: sivun oma kommentti kertoo mitä EI saa olla, joten
   raaka haku osuisi siihen ja vartija punertaisi juuri siitä että sääntö on kirjattu. */
const ilmanKommentteja = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  .replace(/<!--[\s\S]*?-->/g, ' ');
const KOODI = ilmanKommentteja(SIVU);

/** Nimetty funktio lähteestä sulkeita laskien. */
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

/** Se <script>-lohko, jossa näkymälogiikka on. Ajetaan kokonaisena, ei palasina. */
function nakymaLohko() {
  const osat = SIVU.split('<script>');
  const o = osat.find((x) => x.includes('function _phRenderHavainto('));
  expect(o, 'näkymälohkoa ei löytynyt').toBeTruthy();
  return o.split('</script>')[0];
}

/** Minimaalinen DOM: vain se mitä renderöinti koskee (innerHTML + tapahtumasidonta). */
function teeDom() {
  const solmut = new Map();
  const tee = (id) => ({
    id, innerHTML: '', style: {}, value: '',
    querySelectorAll: () => [],
    setAttribute() {}, getAttribute: () => null,
  });
  return {
    solmut,
    document: {
      getElementById: (id) => {
        if (!solmut.has(id)) solmut.set(id, tee(id));
        return solmut.get(id);
      },
      addEventListener() {},
      createElement: tee,
      body: { appendChild() {} },
    },
  };
}

/**
 * Ajaa näkymälohkon sandboxissa. `pelaajat` = _pelaajaMap, `tila` = _phTila-ylikirjoitukset.
 * Palauttaa sandboxin, jonka kautta aidot funktiot ovat kutsuttavissa.
 */
function aja(opt) {
  const o = opt || {};
  const dom = teeDom();
  const toastit = [];
  const store = {
    document: dom.document, console, Date, Math, JSON, String, Number, Object, Array,
    Boolean, Promise, RegExp, Error, isNaN, setTimeout, clearTimeout, URLSearchParams,
    navigator: { onLine: o.online === false ? false : true },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    /* Lib on OIKEA — vartija ei saa mitata omaa kopiotaan. */
    TM_ADAR_TEKSTIT: vaadi('../lib/tm_adar_tekstit.js'), TM_ADAR_NIMET: LIB.TM_ADAR_NIMET, TM_ADAR_PORTAAT: LIB.TM_ADAR_PORTAAT,
    tmAdarBand: LIB.tmAdarBand, tmAdarIkaPorras: LIB.tmAdarIkaPorras,
    tmAdarPorrasEhdotus: LIB.tmAdarPorrasEhdotus, tmAdarPikakentat: LIB.tmAdarPikakentat,
    _adarNakyvatPelaajat: (haku) => Object.keys(o.pelaajat || {})
      .filter((id) => !haku || ((o.pelaajat[id].nimi || '').toLowerCase().includes(String(haku).toLowerCase()))),
    _adarPoiminOhje: () => '',
    _luonnosTallenna: () => {},
    _showToast: (v) => toastit.push(v),
    _phTallenna: () => {},
    _phKumoa: () => {},
    window: { ...PT_WINDOW, _pelaajaMap: o.pelaajat || {}, _tmSeuraId: 'sjk' },
  };
  store.window.window = store.window;
  store.tmHT = o.tmHT || store.tmHT || function (s) { return s; };
  const ymp = new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : undefined)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  // eslint-disable-next-line no-new-func
  const api = new Function('__ymp', 'with(__ymp){' + nakymaLohko()
    + '\nreturn { S: window._phTila, avaa: _phAvaaPelaaja, render: _phRender,'
    + ' jarjesta: _phJarjesta, viimeksi: _phViimeksi, dimit: _phDimit, ehdotus: _phEhdotus };}')(ymp);
  if (o.tila) Object.assign(api.S, o.tila);
  return { api, dom, toastit, store };
}

const vuosiIalle = (ika) => new Date().getFullYear() - ika;
const html = (y) => y.dom.document.getElementById('ph-app').innerHTML;

/* ── 1 · KAKSI NAPAUTUSTA ─────────────────────────────────────────────── */

describe('(1) kaksi napautusta minimissä', () => {
  const pelaajat = { p1: { nimi: 'Topias Koskela', syntymaVuosi: vuosiIalle(13), joukkueet: ['j1'] } };

  it('pelaaja valmiina → Tallenna on POIS käytöstä ennen ensimmäistä pistettä', () => {
    const y = aja({ pelaajat });
    y.api.avaa('p1');
    expect(html(y), 'tallennus pitää olla estetty ilman pistettä').toContain('id="ph-save" disabled');
  });

  it('YKSI piste riittää → Tallenna aukeaa (piste + Tallenna = 2 toimintoa)', () => {
    const y = aja({ pelaajat });
    y.api.avaa('p1');
    y.api.S.pisteet = { A: 2 };
    y.api.render();
    const h = html(y);
    expect(h, 'yksi piste ei riittänyt').toContain('id="ph-save"');
    expect(h, 'tallennus jäi estetyksi vaikka piste on annettu').not.toContain('id="ph-save" disabled');
  });

  it('EI PAKOLLISTA TEKSTIÄ: muistiinpano on merkitty valinnaiseksi', () => {
    const y = aja({ pelaajat });
    y.api.avaa('p1');
    const h = html(y);
    expect(h, 'viestikenttä on linkin takana').toContain('+ Viesti pelaajalle'); expect(h).not.toContain('<textarea');
    expect(h, 'viesti ei estä Tallennusta').not.toMatch(/ph-viesti[^>]*disabled/);
  });

  it('toinen napautus samaan pisteeseen tyhjentää valinnan', () => {
    const f = pura('function _phSidoHavainto(');
    expect(f).toContain('if (S.pisteet[k] === v) delete S.pisteet[k];');
  });
});

/* ── 2 · PORRAS ───────────────────────────────────────────────────────── */

describe('(2) porras ohjaa ulottuvuudet, ikä on vain ehdotus', () => {
  it('puuttuva havainto_porras → ikäsuositus (≤12 → 1)', () => {
    const y = aja({ pelaajat: { p1: { nimi: 'Otto', syntymaVuosi: vuosiIalle(11) } } });
    y.api.avaa('p1');
    expect(y.api.S.porras).toBe(1);
    expect(y.api.dimit(y.api.S.porras)).toEqual(['A']);
  });

  it('puuttuva havainto_porras → ikäsuositus (13–15 → 3)', () => {
    const y = aja({ pelaajat: { p1: { nimi: 'Topias', syntymaVuosi: vuosiIalle(13) } } });
    y.api.avaa('p1');
    expect(y.api.S.porras).toBe(3);
    expect(y.api.dimit(3)).toEqual(['A', 'D', 'Act']);
  });

  it('TALLENNETTU porras voittaa iän (12-vuotias portaalla 2)', () => {
    const y = aja({ pelaajat: { p1: { nimi: 'Onni', syntymaVuosi: vuosiIalle(12), havainto_porras: 2 } } });
    y.api.avaa('p1');
    expect(y.api.S.porras).toBe(2);
    expect(y.api.dimit(2)).toEqual(['A', 'D']);
  });

  it('ikä tuntematon → porras 4 (turvaverkko, sama kuin lib)', () => {
    const y = aja({ pelaajat: { p1: { nimi: 'Tuntematon', syntymaVuosi: null } } });
    y.api.avaa('p1');
    expect(y.api.S.porras).toBe(4);
  });

  it('porras kirjoitetaan pelaajalle VAIN kun se muuttuu', () => {
    const f = pura('async function _phTallenna(');
    expect(f).toContain('var porrasTallennetaan = S.porrasNostettu || S.porrasTallennettu !== S.porras;');
    expect(f, 'pikakentät on laskettava UUDELLA portaalla (muuten uusi taito näkyy vakiintuneena)')
      .toContain('_phKirjoitaHavaintoJaPikakentat(ref, data, seuraId, pelaajaId, S.porras, porrasTallennetaan, _lahetetty)');
    const k = pura('async function _phKirjoitaHavaintoJaPikakentat(');
    expect(k, 'porras kirjoitetaan vain kun kirjoitaPorras').toContain('if (kentat && kirjoitaPorras) kentat.havainto_porras = porras;');
  });

  it('"Ei vielä" EI kirjoita mitään — se vain piilottaa kortin', () => {
    const f = pura('function _phSidoHavainto(');
    const rivi = f.split('\n').find((r) => r.includes("ph-eivielä"));
    expect(rivi).toBeTruthy();
    const kasittelija = f.slice(f.indexOf('ph-eivielä'));
    const eka = kasittelija.slice(0, kasittelija.indexOf('\n', kasittelija.indexOf('onclick')) + 1);
    expect(eka, '"Ei vielä" kirjoittaa Firestoreen').not.toContain('set(');
    expect(eka).toContain('ehdotusOhitettu = true');
  });

  it('portaan laskeminen pudottaa ulkopuolelle jäävät pisteet', () => {
    const f = pura('function _phSidoHavainto(');
    expect(f, 'tallentaisi ulottuvuuden jota ei arvioida')
      .toContain('Object.keys(S.pisteet).forEach(function (k) { if (salli.indexOf(k) < 0) delete S.pisteet[k]; });');
  });

  it('EHDOTUS tulee pikakentästä eikä omasta laskennasta (§26)', () => {
    const f = pura('function _phEhdotus(');
    expect(f).toContain('p.havainto_porras_ehdotus');
    expect(f, 'ehdotusta ei saa laskea renderöinnissä alikokoelmasta').not.toContain('collection(');
  });

  it('ehdotus näkyy vain pelaajan OMALLA portaalla', () => {
    const p = { nimi: 'Eemil', syntymaVuosi: vuosiIalle(12), havainto_porras: 1,
      havainto_porras_ehdotus: { valmis: true, hist: [3, 3, 2], seuraava: 'd' } };
    const y = aja({ pelaajat: { p1: p } });
    y.api.avaa('p1');
    expect(y.api.ehdotus(), 'ehdotus ei näy omalla portaalla').toBeTruthy();
    y.api.S.porras = 3;                      // valmentaja siirtyi muualle → ehdotus ei kuulu tähän
    expect(y.api.ehdotus()).toBeNull();
  });

  it('ehdotuskortin verbi ja partitiivi ovat vakioita, ei johdettuja', () => {
    /* sv-läpiajo PR 4: vakiot siirtyivät libiin (lib/tm_adar_tekstit.js FI) — sisältö ennallaan, kielireititys avainten kautta */
    const T = vaadi('../lib/tm_adar_tekstit.js').FI;
    expect([T.adar_verbi_a, T.adar_verbi_d, T.adar_verbi_ac]).toEqual(['havainnoi', 'ratkaisee', 'toteuttaa']);
    expect([T.adar_partitiivi_d, T.adar_partitiivi_ac, T.adar_partitiivi_r]).toEqual(['päätöstä', 'toteutusta', 'palautumista']);
  });
});

/* ── 3 · JÄRJESTYS ────────────────────────────────────────────────────── */

describe('(3) pisimpään havainnoimatta ensin', () => {
  const pvm = (d) => new Date(Date.now() - d * 86400000).toISOString();

  it('null ensin, sitten vanhin → uusin, tänään havainnoitu viimeisenä', () => {
    const pelaajat = {
      tuore: { nimi: 'Tuore', adar_pvm: pvm(0) },
      vanha: { nimi: 'Vanha', adar_pvm: pvm(30) },
      keski: { nimi: 'Keski', adar_pvm: pvm(7) },
      eiKoskaan: { nimi: 'Ei koskaan', adar_pvm: null },
    };
    const y = aja({ pelaajat });
    expect(y.api.jarjesta(['tuore', 'vanha', 'keski', 'eiKoskaan']))
      .toEqual(['eiKoskaan', 'vanha', 'keski', 'tuore']);
  });

  it('metateksti: "ei havaintoja" / "eilen" / "N pv sitten" / "✓ tänään"', () => {
    const y = aja({ pelaajat: {
      a: { nimi: 'A', adar_pvm: null }, b: { nimi: 'B', adar_pvm: pvm(1) },
      c: { nimi: 'C', adar_pvm: pvm(9) }, d: { nimi: 'D', adar_pvm: pvm(0) },
    } });
    expect(y.api.viimeksi('a').teksti).toBe('ei havaintoja');
    expect(y.api.viimeksi('b').teksti).toBe('eilen');
    expect(y.api.viimeksi('c').teksti).toBe('9 pv sitten');
    expect(y.api.viimeksi('d').teksti).toBe('✓ tänään');
  });

  it('tässä istunnossa havainnoitu siirtyy viimeiseksi', () => {
    const y = aja({ pelaajat: { a: { nimi: 'A', adar_pvm: null }, b: { nimi: 'B', adar_pvm: pvm(30) } } });
    y.api.S.tehdyt.a = true;
    expect(y.api.jarjesta(['a', 'b'])).toEqual(['b', 'a']);
  });

  it('järjestys luetaan pikakentästä, ei alikokoelmasta (§26)', () => {
    const f = pura('function _phJarjestysAvain(');
    expect(f).toContain('adar_pvm');
    expect(f).not.toContain('collection(');
  });
});

/* ── 4 · TALLENNUS JA OFFLINE ─────────────────────────────────────────── */

describe('(4) tallennus: yksi polku, ei omaa offline-jonoa', () => {
  const f = () => pura('async function _phTallenna(');

  it('kirjoitusta EI awaitata — UI etenee myös verkotta', () => {
    // §26: havainto + pikakentät batchina — kutsua EI awaitata (catch hoitaa virheen), kuten ennen ref.set(data).catch
    expect(f(), 'awaitattu kirjoitus jumittaisi kentällä ilman verkkoa')
      .toContain('_phKirjoitaHavaintoJaPikakentat(ref, data, seuraId, pelaajaId, S.porras, porrasTallennetaan, _lahetetty);');
    expect(f()).not.toMatch(/await (ref\.set\(|_phKirjoitaHavaintoJaPikakentat\()/);
  });

  it('tila luetaan hasPendingWrites:sta, ei arvailla navigator.onLinesta', () => {
    const s = pura('function _phSeuraaKirjoitusta(');
    expect(s).toContain('includeMetadataChanges: true');
    expect(s).toContain('metadata.hasPendingWrites');
  });

  it('OFFLINE: getIdToken(true) ohitetaan (se heittäisi)', () => {
    /* Kommentit pois, jotta mitataan RAKENNETTA eikä perustelua: `getIdToken` on oltava
       onLine-vartijan sisällä, ei sen vieressä. */
    const koodi = ilmanKommentteja(f());
    const i = koodi.indexOf('getIdToken');
    expect(i, 'getIdToken puuttuu kokonaan').toBeGreaterThan(-1);
    const vartija = koodi.lastIndexOf('navigator.onLine === false', i);
    expect(vartija, 'token haetaan myös offline-tilassa').toBeGreaterThan(-1);
    const valissa = koodi.slice(vartija, i);
    expect(valissa, 'onLine-vartija ei ole saman lohkon alussa').not.toContain('}');
  });

  it('odottava kirjoitus näkyy "Tallessa laitteella"', () => {
    const ok = pura('function _phRenderOk(');
    expect(ok).toContain("odottaa ? tmHT('Tallessa laitteella') : tmHT('Tallennettu')");
    expect(ok).toContain('Havainto lähtee automaattisesti, kun yhteys palaa');
  });

  it('EI OMAA JONOA: vanha _idbLisaa on poistettu, tyhjennys jäi kertaluontoisena', () => {
    expect(KOODI, 'oma offline-jono palasi').not.toContain('_idbLisaa');
    expect(KOODI, 'jonon kertatyhjennys puuttuu').toContain('_synkronoiOfflineJono');
    expect(SIVU, 'kertatyhjennykselle ei ole poistopäivää').toContain('POISTA 2026-11');
  });

  it('DOKUMENTTI sisältää uudet kentät (porras, ulottuvuudet, havaitut, konteksti)', () => {
    const t = f();
    expect(t).toContain("tyyppi: 'adar_pikakortti'");
    expect(t).toContain('porras: S.porras');
    expect(t).toContain('ulottuvuudet:');
    expect(t).toContain('havaitut: havaitut');
    expect(t).toContain('konteksti: S.konteksti');
    expect(t, '"Mitä näit?" -valinnat eivät tallentuneet aiemmin lainkaan')
      .toContain("havaitut.push(k + ':' + t)");
  });

  it('adar_taso on poistettu (Masterin näyttö lukee porrasta)', () => {
    expect(ilmanKommentteja(f())).not.toContain('adar_taso');
  });

  it('permission-denied kertoo SYYN, ei "katso konsoli"', () => {
    expect(f()).toContain('_adarEstonSyy()');
    expect(f()).toContain('_showToast(');
  });
});

/* ── 5 · KUMOA ────────────────────────────────────────────────────────── */

describe('(5) kumoaminen on merkintä, ei poisto', () => {
  const f = () => pura('async function _phKumoa(');

  it('kirjoittaa tila:peruttu eikä poista havaintoa', () => {
    expect(f()).toContain("tila: 'peruttu'");
    expect(f()).toContain('peruttu_uid: uid');
    /* HUOM: `FieldValue.delete()` (kentän poisto portaan palautuksessa) on eri asia kuin
       dokumentin poisto. Vartija kohdistuu nimenomaan DOKUMENTIN poistoon. */
    expect(f(), 'havainto poistettiin — jälki historiasta katosi').not.toMatch(/\bref\.delete\s*\(/);
    expect(f(), 'havainto poistettiin — jälki historiasta katosi').not.toMatch(/doc\([^)]*\)\.delete\s*\(/);
  });

  it('palauttaa lomakkeen samoilla arvoilla + bannerin', () => {
    const t = f();
    expect(t).toContain('S.pisteet = Object.assign({}, v.pisteet);');
    expect(t).toContain('S.teksti = v.teksti');
    expect(t).toContain("S.nakyvyys = (v.nakyvyys === 'pelaaja');");
    expect(t).toContain('S.peruttu = true;');
    const h = pura('function _phRenderHavainto(');
    expect(h).toContain('Edellinen havainto peruttu.');
  });

  it('PORTAAN NOSTO perutaan myös (muuten pelaaja jää nostetulle portaalle)', () => {
    const t = f();
    expect(t).toContain('if (v.porrasKirjoitettu)');
    expect(t, 'ilman kenttäpoistoa porras jäisi vaikka sitä ei koskaan ollut')
      .toContain('FieldValue.delete()');
    expect(t).toContain('havainto_porras:');
  });

  it('pikakentät lasketaan uudelleen (peruttu ei saa jäädä lukuun)', () => {
    expect(f()).toContain('_phPaivitaPikakentat(');
  });

  it('Kumoa näkyy 10 minuuttia', () => {
    expect(SIVU).toContain('const PH_KUMOA_MS = 10 * 60 * 1000;');
    expect(pura('function _phKumoaNakyy(')).toContain('(Date.now() - v.ms) < PH_KUMOA_MS');
  });
});

/* ── 6 · EI KOPIOITA ──────────────────────────────────────────────────── */

describe('(6) laskenta tulee libistä — ei inline-kopioita', () => {
  it('pikakentät lasketaan libin funktiolla', () => {
    const f = pura('async function _phPaivitaPikakentat(');
    expect(f).toContain('tmAdarPikakentat(havainnot, ika, porras');
  });

  it('EI inline-konsensusta (Master ja pikakortti eivät saa ajautua erilleen)', () => {
    /* Kielto kohdistuu TUNNISTEESEEN, ei yhteen kirjoitusasuun: `adar_yhtenevyys_taso:`
       (objektiavain) ja `kentat.adar_yhtenevyys_taso =` (sijoitus) ovat sama vika. Aiempi
       versio tarkisti vain kaksoispistemuodon, ja mutaatio livahti läpi. Libin laskemat
       kentät eivät saa esiintyä tässä tiedostossa nimeltä lainkaan. */
    ['adar_yhtenevyys_taso', 'adar_dim_konsensus', 'adar_arvioijat', 'adar_yhtenevyys',
      '_adarSet', 'dimKonsensus'].forEach((k) => {
      expect(KOODI, 'inline-konsensus palasi: ' + k).not.toContain(k);
    });
  });

  it('EI omaa ikäportitusta — porras ja bändi tulevat libistä', () => {
    const f = pura('function _phDimit(');
    expect(f).toContain('tmAdarBand(');
    const ip = pura('function _phIkaPorras(');
    expect(ip).toContain('tmAdarIkaPorras(');
    /* Oma ikähaarukka olisi toinen totuus. Sallittu vain _phIkavaihe-otsikossa (ei laskentaa). */
    const lohko = nakymaLohko();
    const laskenta = lohko.slice(0, lohko.indexOf('function _phIkavaihe('))
      + lohko.slice(lohko.indexOf('function _phIkaPorras('));
    expect(ilmanKommentteja(laskenta)).not.toMatch(/ika\s*<=\s*12/);
  });

  it('NIMET tulevat yhdestä kanonista (TM_ADAR_NIMET)', () => {
    expect(SIVU).toContain('TM_ADAR_NIMET.valmentaja');
    /* Vanhat englanninkieliset nimet eivät saa palata. */
    ['ASSESS', 'DECIDE', 'RE-ASSESS', 'Havaitse', 'Päätä'].forEach((k) => {
      expect(KOODI, 'vanha nimi palasi: ' + k).not.toContain(k);
    });
  });

  it('PH_KENTTA vastaa libin sisäistä kenttäkarttaa', () => {
    /* Lib ei vie karttaa ulos, joten kopio on väistämätön — mutta se ei saa ajautua erilleen. */
    const libLahde = readFileSync(join(juuri, 'lib', 'tm_pelialy_yksilo.js'), 'utf8');
    const libRivi = libLahde.match(/var ADAR_KENTTA_MAP = (\{[^}]*\})/);
    expect(libRivi, 'libin kenttäkarttaa ei löytynyt').toBeTruthy();
    const sivuRivi = SIVU.match(/const PH_KENTTA = (\{[^}]*\})/);
    expect(sivuRivi, 'pikakortin kenttäkarttaa ei löytynyt').toBeTruthy();
    const norm = (s) => s.replace(/\s|'/g, '');
    expect(norm(sivuRivi[1]), 'kenttäkartat erosivat').toBe(norm(libRivi[1]));
  });
});

/* ── 7 · POISTUNEET RAKENTEET ─────────────────────────────────────────── */

describe('(7) vanha rakenne on poissa', () => {
  it.each([
    ['tasovälilehdet', 'setLevel('],
    ['pikatila', '_togglePika'],
    ['pikatilan tila', '_pikaState'],
    ['KPI-rivit', 'KPI_ROWS'],
    ['pelivaihe', 'togglePhase'],
    ['pelipaikkatavoitteet', 'ppTargets'],
    ['yhteispisteet', 'maxScores'],
  ])('%s on poistettu', (_n, tunniste) => {
    expect(KOODI).not.toContain(tunniste);
  });

  it('"Yhteispisteet /12" ei esiinny käyttäjälle', () => {
    expect(SIVU).not.toContain('/12');
  });

  it('sana "Firestore" ei näy käyttäjälle', () => {
    /* Tallennusnapin teksti oli aiemmin "Tallenna havainto → Firestoreen". */
    const napit = [...SIVU.matchAll(/>([^<>{]*Firestore[^<>{]*)</g)].map((m) => m[1]);
    expect(napit, 'Firestore näkyy käyttöliittymässä').toEqual([]);
    expect(SIVU).toContain("tmHT('Tallenna havainto')");
  });
});

/* ── 8 · DESIGN ───────────────────────────────────────────────────────── */

describe('(8) tokenit molempiin teemoihin', () => {
  it('hex-arvot vain :root- ja teemalohkoissa', () => {
    const css = SIVU.slice(SIVU.indexOf('<style>'), SIVU.indexOf('</style>'));
    /* Poistetaan tokenilohkot; muualle jäävä hex olisi kovakoodattu väri. */
    const ilmanTokeneita = css
      .replace(/:root\s*\{[\s\S]*?\}/g, ' ')
      .replace(/:root:not\(\[data-theme="light"\]\)\s*\{[\s\S]*?\}/g, ' ')
      .replace(/:root\[data-theme="dark"\]\s*\{[\s\S]*?\}/g, ' ');
    const hexit = ilmanTokeneita.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    expect(hexit, 'kovakoodattu väri CSS:ssä: ' + hexit.join(', ')).toEqual([]);
  });

  it('molemmat teemat määritellään (myös järjestelmän tumma)', () => {
    expect(SIVU).toContain('@media (prefers-color-scheme:dark)');
    expect(SIVU).toContain(':root:not([data-theme="light"])');
    expect(SIVU).toContain(':root[data-theme="dark"]');
  });

  it('yksi mobiililohko per tiedosto (§6)', () => {
    const lohkot = (SIVU.match(/@media\s*\(max-width:\s*768px\)/g) || []).length;
    expect(lohkot, 'kaksi @media(max-width:768px)-lohkoa kumoaa toisensa').toBeLessThanOrEqual(1);
  });
});

/* ── 9 · SOPIMUKSET ISÄNTÄÄN ──────────────────────────────────────────── */

describe('(9) Masterin ja linkkien sopimukset säilyvät', () => {
  it('URL-parametrit seuraId / pelaajaId / embedded', () => {
    const f = pura('function _phKaynnista(');
    expect(f).toContain("params.get('seuraId')");
    expect(f).toContain("params.get('pelaajaId')");
    expect(f).toContain("params.get('embedded') === '1'");
  });

  it('upotettuna ei omaa yläpalkkia (Masterilla on oma otsikko)', () => {
    const f = pura('function _phKaynnista(');
    expect(f).toContain("getElementById('tm-topbar')");
    expect(f).toContain("tb.style.display = 'none'");
  });

  it('Masterin injektoima _tmPelaajaId kelpaa URL-parametrin rinnalla', () => {
    /* Master asettaa sen vasta iframen `onload`:issa, joten URL-parametri ei aina riitä yksin. */
    const f = pura('window._phAvaaAloitusPelaaja = function () {');
    expect(f).toContain('window._tmPelaajaId');
    expect(f, 'pelaaja avataan vain jos hän on näkyvissä (roolisuodatus)')
      .toContain('(window._pelaajaMap || {})[pid]');
  });

  it('tallennuksesta ilmoitetaan isäntäikkunalle', () => {
    expect(pura('async function _phTallenna(')).toMatch(/postMessage\(viesti, '\*'\)[\s\S]*tm:adar:saved/);
  });

  it('App Check aktivoidaan heti initin jälkeen (§38)', () => {
    const i = SIVU.indexOf('firebase.initializeApp(cfg)');
    const a = SIVU.indexOf('tmAppCheckAktivoi()');
    const db = SIVU.indexOf('_PH_DB   = firebase.firestore()');
    expect(a, 'App Check puuttuu').toBeGreaterThan(-1);
    expect(a, 'App Check ennen initiä').toBeGreaterThan(i);
    expect(a, 'App Check ei liity jälkikäteen jo luotuun palveluinstanssiin').toBeLessThan(db);
  });

  it('LOCAL-persistenssi ja offline-välimuisti säilyvät', () => {
    expect(SIVU).toMatch(/setPersistence\(\s*window\.firebase\.auth\.Auth\.Persistence\.LOCAL\s*\)/);
    expect(SIVU).toContain('enablePersistence');
  });
});

/* ── Design-korjaukset 16.10. (CODE_BRIEF_PIKAKORTTI_DESIGN) ─────────────────────────────── */
describe('(design) Pikakortti — otsikko, desimaalit, koodit, vinkki, tokenit', () => {
  const pelaajat = { p1: { nimi: 'Topias Koskela', syntymaVuosi: vuosiIalle(10), joukkueet: ['j1'], havainto_porras: 1,
    havainto_porras_ehdotus: { valmis: true, hist: [2.5, 3, 2.5], seuraava: 'd' } } };
  const avaa = (tila) => { const y = aja({ pelaajat }); y.api.avaa('p1'); Object.assign(y.api.S, tila || {}); y.api.render(); return y; };

  it('yläotsikko = pelkkä "Pelihavainto" (porras ratkaisee, ei ikävaihetta); _phIkavaihe ja tmAdarIkavaihe säilyvät', () => {
    const h = html(avaa());
    expect(h, 'sisällön yläotsikko poistettu (toistaa yläpalkkia)').not.toMatch(/<div class="eyebrow">Pelihavainto<\/div>/); expect(h).not.toMatch(/Pelihavainto · |Rakentaja|Leikkijä|Showcase/);
    expect(h, 'pelaajarivi: yksi rivi, Vaihda-linkki').toMatch(/<div class="ph-pl[^"]*">.*id="ph-vaihda"[^>]*>Vaihda<\/button><\/div>/);
    expect(SIVU).toContain('function _phIkavaihe('); expect(vaadi('../lib/tm_adar_tekstit.js').tmAdarIkavaihe).toBeTypeOf('function');
  });
  it('nostoehdotuksen desimaalit pilkulla ("2,5"), ei pistettä', () => {
    const h = html(avaa());
    expect(h).toContain('2,5 · 3 · 2,5'); expect(h).not.toMatch(/2\.5/);
    expect(SIVU).toMatch(/function _phLuku\(v\) \{ return String\(v\)\.replace\('\.', ','\); \}/);
  });
  it('.dim-k ei renderöidy ulottuvuuden otsikkoon; alapalkin yhteenvedossa AC (ei Ac); PH_KENTTA-avain Act ennallaan', () => {
    const y = avaa({ porras: 3, pisteet: { A: 2, D: 3, Act: 1 } }); const h = html(y);
    expect(h).not.toContain('class="dim-k"'); expect(h).toContain('class="dn"');
    expect(h, 'alapalkin yhteenveto poistettu (rivit näyttävät valinnat)').not.toContain('class="sum"'); expect(h).not.toMatch(/A 2 · D 3/);
    expect(h.match(/data-sc="Act" data-v="1" aria-pressed="true"/), 'valittu piste painettuna').toBeTruthy();
    expect(SIVU).toMatch(/PH_KENTTA\s*=\s*\{[^}]*Act/);
  });
  it('palauteruutu: kuvaus + taso näkyvät heti painetulle ulottuvuudelle; harjoitusvinkki piilossa oletuksena, linkki avaa ja sulkee; vinkki säilyy pistettä vaihtaessa', () => {
    const y = avaa({ porras: 2, pisteet: { A: 2, D: 3 }, fb: 'A' }); let h = html(y);
    expect(h).toContain('id="ph-fb"'); expect(h).toContain('aria-live="polite"'); expect(h).toContain('Havainnointi · 2 Kehittyvä'); expect(h).toContain('class="fb-d"');
    expect(h).not.toContain('class="fb-tip"'); expect(h).not.toContain('Harjoitusvinkki:');
    expect((h.match(/data-vinkki="/g) || []).length, 'yksi yhteinen ruutu').toBe(1); expect(h).toContain('Harjoitusvinkki ▾');
    y.api.S.vinkki.A = true; y.api.render(); h = html(y);
    expect((h.match(/class="fb-tip"/g) || []).length).toBe(1); expect(h).toContain('<b>Harjoitusvinkki:</b>'); expect(h).toContain('Piilota ▴'); expect(h).not.toContain('Seuraava askel:');
    y.api.S.pisteet.A = 3; y.api.render(); h = html(y);   // piste vaihtuu → vinkin tila säilyy, taso päivittyy
    expect((h.match(/class="fb-tip"/g) || []).length).toBe(1); expect(h).toContain('Havainnointi · 3 Hallitsee');
    y.api.S.vinkki.A = false; y.api.render(); expect(html(y)).not.toContain('class="fb-tip"');
  });
  it('palauteruutu: "Mitä näit?" -valinnat näkyvät heti ilman avausta; nimen napautus näyttää kysymyksen; ennen painallusta himmeä kysymys', () => {
    const y = avaa({ porras: 2 }); let h = html(y);
    expect(h, 'ennen painallusta: ensimmäisen pisteyttämättömän kysymys himmeänä').toMatch(/class="fb-q dim">Havainnointi: Katsooko ylös/); expect(h).not.toContain('data-chip=');
    y.api.S.pisteet = { A: 2 }; y.api.S.fb = 'A'; y.api.render(); h = html(y);
    expect(h).toContain('Mitä näit?'); expect((h.match(/data-chip="A"/g) || []).length).toBe(4); expect(h).not.toContain('Mitä näit? ▾');
    y.api.S.fb = 'D'; y.api.S.fbKys = true; y.api.render(); h = html(y);
    expect(h, 'nimen napautus: kysymys näkyviin').toMatch(/class="fb-q[^"]*">Päätös: Kuinka nopeasti/);
    y.api.S.pisteet.D = 3; y.api.S.fbKys = true; y.api.render(); h = html(y);
    expect(h, 'pisteytetylle: kysymys + kuvaus').toContain('class="fb-q">Kuinka nopeasti'); expect(h).toContain('Päätös · 3 Hallitsee');
  });
  it('vinkin tila nollautuu pelaajaa vaihtaessa (kuten S.auki) eikä kuulu luonnokseen', () => {
    expect(SIVU).toMatch(/S\.pisteet = \{\}; S\.havaitut = \{\}; S\.vinkki = \{\};/);
    const luonnos = SIVU.slice(SIVU.indexOf('function _luonnosKeraa'), SIVU.indexOf('function _luonnosKeraa') + 900);
    expect(luonnos).not.toMatch(/vinkki/);
  });
  it('Tallenna-painike käyttää --acc-fill / --acc-fill-ink; tokenit kaikissa kolmessa teemalohkossa; kontrasti ≥ 4,5:1', () => {
    expect(SIVU).toMatch(/\.save\{[^}]*background:var\(--acc-fill\);color:var\(--acc-fill-ink\)/);
    expect(SIVU).not.toMatch(/\.save\{[^}]*background:var\(--acc\)/);
    expect((SIVU.match(/--acc-fill:#1A7A5E; --acc-fill-ink:#FBFAF6;/g) || []).length).toBe(3);   // vaalea + tumma (media) + tumma (data-theme)
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const kontrasti = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    expect(kontrasti('#1A7A5E', '#FBFAF6')).toBeGreaterThanOrEqual(4.5);
    expect(SIVU).toMatch(/\.pbar i\.on\{background:var\(--acc\)\}/);   // pienet korostukset jäävät --acc:lle
  });
  it('"Seuraava askel:" ei enää Pikakortissa eikä henkilöstökartassa (termi varattu pelaajan tavoitteelle)', () => {
    expect(KOODI).not.toContain("tmHT('Seuraava askel:')"); expect(vaadi('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv['Seuraava askel:']).toBeUndefined();
  });
});

/* ── sv-tilan viimeiset tekstit (erä 60): KAIKKI näkyvä teksti kulkee tmHT:n / lib-avainten kautta ──────────────────────────────
   tmHT-stub kääri jokaisen reititetyn tekstin «…»-merkkeihin; näkymän HTML:stä poistetaan kääritty teksti, lib-tekstit (tmAdarT, reititetty polkuavaimilla),
   nimet, numerot ja välimerkit. Mitä jää, on kovakoodattua tekstiä (sv-tilassa suomea). */
describe('(sv) Pikakortti — ei reitittämätöntä näkyvää tekstiä missään näkymässä', () => {
  const TX = vaadi('../lib/tm_adar_tekstit.js'), NIMI = LIB.TM_ADAR_NIMET;
  const pelaajat = { p1: { nimi: 'Topias Koskela', syntymaVuosi: vuosiIalle(10), joukkueet: ['j1'], havainto_porras: 1, adar_pvm: new Date(Date.now() - 86400000).toISOString(),
      havainto_porras_ehdotus: { valmis: true, hist: [2.5, 3, 2.5], seuraava: 'd' } },
    p4: { nimi: 'Sara Virtanen', syntymaVuosi: vuosiIalle(17), joukkueet: ['j1'], havainto_porras: 4, adar_pvm: new Date(Date.now() - 5 * 86400000).toISOString(), havainto_porras_ehdotus: { valmis: false, hist: [3, 3, 3], seuraava: null } } };
  const sallitut = new Set([...Object.values(TX.FI), ...Object.values(NIMI.valmentaja), ...Object.values(NIMI.pelaaja), 'Topias Koskela', 'Sara Virtanen', 'Topias', 'Sara', 'Koskela', 'Virtanen', 'TalentMaster™', 'Hyvä havainto', ...Object.values(vaadi('../lib/tm_nakyvyys_kytkin.js').FI)]);   // 0b: kytkimen lib-tekstit (nk_*, sv erä 70)
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const SALLITUT_RE = new RegExp([...sallitut].filter((x) => x.length > 2).sort((a, b) => b.length - a.length).map(esc).join('|'), 'gi');   // lib-reititetyt tekstit/nimet voivat esiintyä yhdistelmärivillä ("Sara · havainnointi 2, päätös 3")
  const jaanteet = (h) => {
    let t = h.replace(/«[^»]*»/g, ' ').replace(/<[^>]*>/g, '\u0001').replace(/&amp;|&quot;|&lt;|&gt;/g, ' ');
    t = t.replace(SALLITUT_RE, ' ').replace(/\b(A|D|AC|R) \d/g, ' ');   // alapalkin ulottuvuuskoodit (A 2 · D 3 · AC 1 · R 2): lyhenteet, ei käännettävää
    return t.split('\u0001').map((x) => x.trim()).filter((x) => x && /[A-Za-zÄÖäö]{2,}/.test(x));
  };
  const nayt = (tila, id) => { const y = aja({ pelaajat, tmHT: (k) => '«' + k + '»' }); y.api.avaa(id || 'p4'); Object.assign(y.api.S, tila); y.api.render(); return html(y); };
  const NAKYMAT = {
    'valitse': () => { const y = aja({ pelaajat, tmHT: (k) => '«' + k + '»' }); y.api.S.naytto = 'valitse'; y.api.S.pelaajaId = null; y.api.render(); return html(y); },
    'havainto p1 + ehdotus + valittuja': () => nayt({ pisteet: { A: 3 }, havaitut: { A: ['x', 'y'] }, vinkki: { A: true } }, 'p1'),
    'havainto p4 kaikki auki': () => nayt({ pisteet: { A: 2, D: 3, Act: 1, R: 2 }, vinkki: { A: true, R: true }, auki: { D: true }, nakyvyys: true }),
    'porrasarkki': () => nayt({ sheet: true, porrasTallennettu: 4 }),
    'virhe + peruttu': () => nayt({ virhe: 'x', peruttu: true, pisteet: { A: 2 } }),
    'ok tallennettu': () => nayt({ naytto: 'ok', odottaa: false, tehdyt: { p4: true }, viimeisin: { pelaajaId: 'p4', pisteet: { A: 2, D: 3 }, nakyvyys: 'pelaaja', porras: 2, porrasNostettu: true, ms: Date.now(), kumottu: false } }),
    'ok odottaa (offline)': () => nayt({ naytto: 'ok', odottaa: true, tehdyt: { p4: true }, viimeisin: { pelaajaId: 'p4', pisteet: { A: 2 }, nakyvyys: 'valmentajat', porras: 4, porrasNostettu: false, ms: Date.now(), kumottu: false } }),
    'ok kaikki tehty': () => nayt({ naytto: 'ok', odottaa: false, tehdyt: { p1: true, p4: true }, viimeisin: { pelaajaId: 'p4', pisteet: { A: 2 }, nakyvyys: 'valmentajat', porras: 4, porrasNostettu: false, ms: Date.now() - 700000, kumottu: false } }),
  };
  for (const [nimi, f] of Object.entries(NAKYMAT)) it('"' + nimi + '": jäännös-suomea ei ole', () => { expect(jaanteet(f()), nimi).toEqual([]); });
  it('uudet parametrisoidut avaimet (laskuri, porras, seuraava) ovat tmHT:ssä parametrilla, ei merkkijonojen yhdistelyä', () => {
    for (const k of ['Porras {n} / 4', 'Porras {n} · {lista}', 'Seuraavana: {nimi} · {aika}', '{nimi} tallennettu', 'porras {n}', '{nimi}: havaintoa ei tallennettu', '{nimi} tallessa laitteella · lähtee, kun yhteys palaa']) expect(SIVU, k).toContain("tmHT('" + k + "')");
    expect(KOODI).not.toMatch(/' valittu'|'Seuraavana: '|">Porras '|push\('ikäsuositus'\)|push\('nykyinen'\)|teksti: 'eilen'|aria-label="Konteksti"|: 'Valmis'|'Tallessa laitteella' :|\? 'Tallessa/);
  });
  it('sv: kaikilla näillä avaimilla on sv-rivi (tai odottaa erää 60)', () => {
    const E60 = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_60_gemini.json'), 'utf8')).osiot.henkilosto_kartta.rivit, SV = vaadi('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
    for (const k of Object.keys(E60).filter((x) => x !== '{n} valittu')) expect(SIVU, k).toContain("tmHT('" + k + "')");   // '{n} valittu' jäi käyttämättä (yhden näytön asettelu), avain säilyy
    for (const k of ['Tallennettu', 'Valmis']) { const C = vaadi('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv; expect(typeof (SV[k] || C[k]), k).toBe('string'); }
  });
});

/* ── PELITILANNE (Vaihe 1) — chip-rivit portaittain, säilyvyys, ok-yhteenveto ─────────────────────── */
describe('(pelitilanne) Pikakortti — chip-rivit', () => {
  const pelaajat = { p1: { nimi: 'Topias Koskela', syntymaVuosi: vuosiIalle(13), joukkueet: ['j1'], havainto_porras: 1 }, p2: { nimi: 'Eero Esimerkki', syntymaVuosi: vuosiIalle(13), joukkueet: ['j1'], havainto_porras: 3 } };
  const rivit = (h) => ['otos', 'vaihe', 'paine'].filter((k) => h.includes('data-pt="' + k + '"'));
  it('porras ratkaisee: 1 → vain otos · 2 → otos + vaihe · 3 ja 4 → kaikki kolme', () => {
    const y = aja({ pelaajat }); y.api.avaa('p1'); y.api.S.ptAuki = true; y.api.render();
    expect(rivit(html(y)), 'porras 1').toEqual(['otos']);
    [[2, ['otos', 'vaihe']], [3, ['otos', 'vaihe', 'paine']], [4, ['otos', 'vaihe', 'paine']]].forEach(([porras, odotus]) => {
      y.api.S.porras = porras; y.api.render();
      expect(rivit(html(y)), 'porras ' + porras).toEqual(odotus);
    });
  });
  it('rivi on heti konteksti-rivin (Missä) alla, ennen portaan riviä; ei pakollisuutta (Tallenna ei riipu valinnoista)', () => {
    const y = aja({ pelaajat }); y.api.avaa('p1'); y.api.S.ptAuki = true; y.api.S.porras = 3; y.api.S.pisteet = { A: 2 }; y.api.render();
    const h = html(y);
    expect(h.indexOf('data-kx="ottelu"')).toBeLessThan(h.indexOf('data-pt="otos"'));
    expect(h.indexOf('data-pt="paine"')).toBeLessThan(h.indexOf('id="ph-porras"'));
    expect(h, 'tallennus ei saa riippua pelitilanteesta').not.toContain('id="ph-save" disabled');
    expect(h, 'ei punaista huomautusta pelitilanteesta').not.toMatch(/pelitilanne[^<]*puuttuu/i);
  });
  it('valinnat näkyvät painettuina (aria-pressed) ja vaihe-lista näyttää molemmat valinnat', () => {
    const y = aja({ pelaajat }); y.api.avaa('p2'); y.api.S.ptAuki = true;
    Object.assign(y.api.S.pelitilanne, { vaihe: ['hyokkays', 'erikois'], paine: 'kova', otos: '3_5' }); y.api.render();
    const h = html(y);
    ['otos" data-v="3_5', 'vaihe" data-v="hyokkays', 'vaihe" data-v="erikois', 'paine" data-v="kova'].forEach((x) => expect(h, x).toMatch(new RegExp('data-pt="' + x + '" aria-pressed="true"')));
    expect(h).toMatch(/data-pt="paine" data-v="matala" aria-pressed="false"/);
  });
  it('VALINTA SÄILYY seuraavalle pelaajalle samassa istunnossa (kuten konteksti); pisteet nollautuvat', () => {
    const y = aja({ pelaajat }); y.api.avaa('p1');
    Object.assign(y.api.S.pelitilanne, { vaihe: ['puolustus'], paine: 'kohtalainen', otos: '6plus' }); y.api.S.pisteet = { A: 3 };
    y.api.avaa('p2');
    expect(y.api.S.pelitilanne, 'pelitilanne hukkui pelaajan vaihdossa').toEqual({ vaihe: ['puolustus'], paine: 'kohtalainen', otos: '6plus' });
    expect(y.api.S.pisteet).toEqual({});
    y.api.S.ptAuki = true; y.api.render();
    expect(rivit(html(y))).toEqual(['otos', 'vaihe', 'paine']);
  });
  it('KIINNI OLETUKSENA: ei chip-rivejä, yksi Pelitilanne ▾ -rivi; valinnat tiiviinä tekstinä; auki/kiinni säilyy pelaajalta toiselle mutta ei luonnokseen', () => {
    const y = aja({ pelaajat }); y.api.avaa('p2');
    expect(y.api.S.ptAuki).toBe(false);
    let h = html(y);
    expect(rivit(h), 'chip-rivit näkyvät vaikka rivi on kiinni').toEqual([]);
    expect(h).toContain('id="ph-pt-kansi" aria-expanded="false"');
    expect(h).toMatch(/id="ph-pt-kansi"[^>]*><span class="pt-l">Pelitilanne <span aria-hidden="true">▾<\/span><\/span><\/button>/);
    Object.assign(y.api.S.pelitilanne, { vaihe: ['puolustus'], paine: 'kova', otos: '3_5' }); y.api.render();
    expect(html(y), 'suljettu rivi näyttää valinnat').toContain('<span class="pt-r">3–5 · Puolustus · Kova paine</span>');
    expect(rivit(html(y))).toEqual([]);
    y.api.S.ptAuki = true; y.api.render();
    expect(rivit(html(y))).toEqual(['otos', 'vaihe', 'paine']);
    y.api.avaa('p1');
    expect(y.api.S.ptAuki, 'auki-tila säilyy pelaajalta toiselle').toBe(true);
    expect(pura('function _luonnosKeraa(')).not.toContain('ptAuki');
  });

  it('sv: chip-tekstit tulevat lib-kartasta (tmLibT), ei kovakoodattua suomea', () => {
    const koodi = ilmanKommentteja(SIVU);
    const f = koodi.slice(koodi.indexOf('function _phPelitilanneHtml('), koodi.indexOf('/* ── PELAAJAN AVAUS'));
    expect(f).toContain("_phT('adar_pt_otsikko_'");
    expect(f).toContain("_phT('adar_pt_' + kentta + '_' + a)");
    expect(f, 'suomenkielisiä kovakoodattuja tekstejä').not.toMatch(/Hyökkäys|Puolustus|Kova paine|tilannetta/);
  });
  it('ok-näkymä: yhteenvetorivi "Ottelu · Siirtymä puolustukseen · Kova paine · 3–5 tilannetta"; ei pelitilannetta → ei riviä', () => {
    const y = aja({ pelaajat }); y.api.avaa('p1');
    Object.assign(y.api.S, { naytto: 'ok', odottaa: false, viimeisin: { pisteet: { A: 2 }, nakyvyys: 'valmentajat', konteksti: 'ottelu', pelitilanne: { vaihe: ['siirtyma_puol'], paine: 'kova', otos: '3_5' } } });
    y.api.render();
    expect(html(y)).toContain('Ottelu · Siirtymä puolustukseen · Kova paine · 3–5 tilannetta');
    y.api.S.viimeisin.pelitilanne = null; y.api.render();
    expect(html(y)).not.toContain('tilannetta');
  });
  it('kumoa palauttaa pelitilanteen lomakkeelle (lähdevartija) ja luonnos kerää sen', () => {
    const kumoa = pura('async function _phKumoa(') || '';
    expect(kumoa).toContain('S.pelitilanne = _phPelitilanneTila(v.pelitilanne)');
    expect(pura('function _luonnosKeraa(')).toContain('pelitilanne: S.pelitilanne');
  });
});
