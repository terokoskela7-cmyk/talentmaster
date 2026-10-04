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
    TM_ADAR_NIMET: LIB.TM_ADAR_NIMET, TM_ADAR_PORTAAT: LIB.TM_ADAR_PORTAAT,
    tmAdarBand: LIB.tmAdarBand, tmAdarIkaPorras: LIB.tmAdarIkaPorras,
    tmAdarPorrasEhdotus: LIB.tmAdarPorrasEhdotus, tmAdarPikakentat: LIB.tmAdarPikakentat,
    _adarNakyvatPelaajat: (haku) => Object.keys(o.pelaajat || {})
      .filter((id) => !haku || ((o.pelaajat[id].nimi || '').toLowerCase().includes(String(haku).toLowerCase()))),
    _adarPoiminOhje: () => '',
    _luonnosTallenna: () => {},
    _showToast: (v) => toastit.push(v),
    _phTallenna: () => {},
    _phKumoa: () => {},
    window: { _pelaajaMap: o.pelaajat || {}, _tmSeuraId: 'sjk' },
  };
  store.window.window = store.window;
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
    expect(html(y)).toContain('valinnainen');
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
    expect(SIVU).toContain("const PH_VERBI = { a: 'havainnoi', d: 'ratkaisee', ac: 'toteuttaa'");
    expect(SIVU).toContain("const PH_PARTITIIVI = { d: 'päätöstä', ac: 'toteutusta', r: 'palautumista' };");
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
    expect(ok).toContain("odottaa ? 'Tallessa laitteella' : 'Tallennettu'");
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
    expect(SIVU).toContain('>Tallenna havainto<');
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
