/**
 * VARTIJA · Kehitys-tyopoyta vaihe 1-2: LUONNOS =/= VOIMASSA OLEVA TAVOITE + yksi viikkolaskuri.
 *
 * VIKA A - LUONNOS KORVASI VOIMASSA OLEVAN TAVOITTEEN MUISTISSA. Nelja sisaantuloa (Ehdota moottorista,
 * Havainnosta, Aseta fokus, Vapaa fokus) kirjoitti `p._idpTavoite = t` statuksella 'ehdotettu' suoraan
 * aktiivisen tavoitteen paalle, ja "Muokkaa" muokkasi aktiivista objektia ilman Peruuta-toimintoa.
 * Tallentamaton luonnos jai muistiin, ja MUUT nakymat (Kehityssuunnitelman rivit, status-nauha, PDC)
 * lukevat samaa `_idpTavoite`-kenttaa - luonnos nakyi niissa voimassa olevana tavoitteena.
 *
 * VIKA C - RIVIT JA NAUHA JAIVAT VANHAAN TILAAN. `_vpKausitavoiteReRender` renderoi vain editorin slotin,
 * joten samalla ruudulla nakyi kolme eri tilaa samasta tavoitteesta.
 *
 * VIKA D - KOLME ERI VIIKKOLASKENTAA. Nauha ja katselmusrivi kayttivat ceil-kaavaa (4 vk jaljella) ja
 * Kehityssuunnitelman rivi tmJfViikko:ta (Viikko 1/4 - 3 vk jaljella) SAMASTA jaksosta.
 *
 * KORJAUS: p._idpTavoite = aina viimeisin tallennettu voimassa oleva tavoite. Kaikki muokkaus menee
 * kenttaan p._idpLuonnos (+ _luonnosTyyppi 'muokkaus'|'vaihto'|'uusi'), Peruuta palauttaa ilman
 * kirjoitusta, vaihto vahvistetaan omassa ikkunassaan ja historian sailyttaa #617:n idpTavoitteetYhdista.
 * Viikot lasketaan yhdella funktiolla (TM_JAKSOFOKUS.tmJfViikko).
 *
 * METODI: funktiot puretaan LAHTEESTA ja ajetaan (ei greppia) - tuntemattomat apurit stubataan
 * Proxy-ymparistolla, jotta vartija mittaa tamän PR:n logiikkaa eika koko tiedoston riippuvuuksia.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const IDP = vaadi('../lib/tm_idp.js');
const JF = vaadi('../lib/tm_jaksofokus.js');
const I18N = vaadi('../lib/tm_vp_i18n.js');

const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');

const PAIVA = 86400000;
const NYT = new Date('2026-09-23T10:00:00.000Z').getTime();

/* ── Lahteesta purkaminen ──────────────────────────────────────────────────── */
function pura(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu lahteesta').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('sulkuja ei saatu tasmaamaan: ' + tunniste);
}

const TUNNISTEET = [
  'function _vpIdpKohde(p)',
  'function _vpAsetaLuonnos(p, t, tyyppi)',
  'function _vpTyhjennaLuonnos(p)',
  'window._vpPeruutaLuonnos = function (pid)',
  'window._vpEhdotaTavoite = function (pid)',
  'window._vpMuokkaaLuonnos = function (pid)',
  'window._vpTallennaTavoite = async function (pid, uusiStatus)',
  'window._vpVaihtoAvaa = function (pid)',
  'window._vpVaihtoValitse = function (avain)',
  'window._vpVaihtoVahvista = async function (pid)',
  'function _vpKausitavoiteHTML(p)',
  'function _vpKehStatusHTML(p)',
  'function _vpKehSuunnitelmaHTML(p, opts)',
  'function _vpViikkoKatselmusHTML(p, st)',
  'function _vpKausitavoiteReRender()',
];

/* Tuntematon nimi -> tyhja stub. Nain purettu koodi ajaa ilman koko tiedoston riippuvuuspuuta,
   mutta TAMAN PR:n funktiot ovat aitoja (mutaatio lahteessa punertaa).
   has() paastaa AIDOT globaalit lapi (JSON, Date, Number, isNaN…) — muuten syvakopio ja
   tallennuksen lukupolku hajoaisivat harneksen takia, ei koodin. */
function ymparisto(oikeat) {
  const store = Object.assign({}, oikeat);
  return new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : () => '')),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}

/* Minimaalinen document: modaalin HTML talteen ilman DOM-kirjastoa. */
function stubDoc(kerays) {
  return {
    getElementById: (id) => {
      if (kerays.el && Object.prototype.hasOwnProperty.call(kerays.el, id)) return kerays.el[id];
      return (kerays.kentat && Object.prototype.hasOwnProperty.call(kerays.kentat, id)
        ? { value: kerays.kentat[id], remove: () => {} } : null);
    },
    createElement: () => ({
      set innerHTML(v) { kerays.html.push(v); },
      get firstChild() { return { _stub: true }; },
    }),
    body: { appendChild: () => {} },
  };
}

function rakenna(lisa) {
  const kerays = { html: [], kentat: (lisa && lisa.kentat) || null, el: (lisa && lisa.el) || null, tallennukset: [], suljetut: [], renderit: 0 };
  const win = { TM_JAKSOFOKUS: JF };   // lahde lukee window.TM_JAKSOFOKUS:ia, ei bare-nimea
  const perus = {
    window: win,
    document: stubDoc(kerays),
    vpT: (lisa && lisa.vpT) || ((s) => s),
    _jsvEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
    TM_JAKSOFOKUS: JF,
    idpTavoitteetYhdista: IDP.idpTavoitteetYhdista,
    idpOnVoimassa: IDP.idpOnVoimassa,
    idpJumissa: () => false,
    idpKandidaatitJarjestetty: () => [1, 2],
    idpEhdotaTavoite: (lisa && lisa.idpEhdotaTavoite) || (() => ({
      luotu: '2026-09-23T09:30:00.000Z', status: 'ehdotettu', kuvaus: 'moottorin ehdotus',
      fokus: { nimi: 'Monipuolisuus', dim: 'D2' }, mittari: { yksikko: 'taso' }, arviot: [],
    })),
    _vpIdpOpts: () => ({}),
    _vpLoytaPelaaja: () => null,
    _vpFokusNimiNaytto: (f) => (f && (f.nimi || f.alue)) || '',
    _vpKonseptiNimiNaytto: (jf) => (jf && jf.konsepti_nimi) || '',
    _vpOtsikkoNaytto: (s) => s,
    _vpKausiNaytto: (k) => k,
    _vpTilaNaytto: (t) => t,
    _vpSuljeJakso: (pid) => { kerays.suljetut.push(pid); },
    toast: () => {},
    _fmtTestiArvo: (v) => v,
  };
  const ymp = ymparisto(Object.assign(perus, (lisa && lisa.ymp) || {}));
  const runko = TUNNISTEET.map(pura).join('\n');
  /* function-deklaraatiot elavat with-lohkon omassa skoopissa -> ne on palautettava eksplisiittisesti
     (muuten proxyn tyhja stub jaisi kayttoon ja vartija mittaisi itseaan). */
  const DEKL = ['_vpIdpKohde', '_vpAsetaLuonnos', '_vpTyhjennaLuonnos', '_vpKausitavoiteHTML',
    '_vpKehStatusHTML', '_vpKehSuunnitelmaHTML', '_vpViikkoKatselmusHTML', '_vpKausitavoiteReRender'];
  const paluu = 'return {' + DEKL.map((n) => n + ':' + n).join(',') + '};';
  // eslint-disable-next-line no-new-func
  const dekl = new Function('__ymp', 'with(__ymp){' + runko + '\n' + paluu + '}')(ymp);
  // window.*-funktiot myos bare-nimina: _vpVaihtoVahvista kutsuu _vpTallennaTavoite:a ilman window-etuliitetta.
  Object.keys(win).forEach((k) => { if (typeof win[k] === 'function') ymp[k] = win[k]; });
  Object.keys(dekl).forEach((k) => { ymp[k] = dekl[k]; });
  return {
    kohde: dekl._vpIdpKohde, asetaLuonnos: dekl._vpAsetaLuonnos, tyhjenna: dekl._vpTyhjennaLuonnos,
    peruuta: win._vpPeruutaLuonnos, ehdota: win._vpEhdotaTavoite, muokkaa: win._vpMuokkaaLuonnos,
    tallenna: win._vpTallennaTavoite, vaihtoAvaa: win._vpVaihtoAvaa, vaihtoValitse: win._vpVaihtoValitse,
    vaihtoVahvista: win._vpVaihtoVahvista, editori: dekl._vpKausitavoiteHTML, nauha: dekl._vpKehStatusHTML,
    rivit: dekl._vpKehSuunnitelmaHTML, katselmus: dekl._vpViikkoKatselmusHTML,
    reRender: dekl._vpKausitavoiteReRender, win: win, kerays: kerays,
  };
}

/* Haitarirvin OTSIKKO (tila + nimi) ilman bodya: body on editori, joka saa nayttaa luonnoksen —
   rivin otsikon on sen sijaan kerrottava voimassa oleva tavoite. */
function riviOtsikko(html, id) {
  const i = html.indexOf('id="' + id + '"');
  expect(i, 'rivia ' + id + ' ei loytynyt').toBeGreaterThan(-1);
  const j = html.indexOf('<div class="acc-body">', i);
  return html.slice(i, j > i ? j : i + 1200);
}

/* Pelaaja + tallennettu kausidokki: tallennus ajetaan oikealla idpTavoitteetYhdista:lla. */
function pelaaja(lisa) {
  return Object.assign({
    id: 'p1', idp_tila: 'aktiivinen',
    _idpTavoite: {
      luotu: '2026-01-15T08:00:00.000Z', status: 'aktiivinen', kuvaus: 'A-kuvaus',
      fokus: { nimi: 'Syoton piilotus', dim: 'D2' }, mittari: { yksikko: 'taso' },
      arviot: [{ pvm: '1' }, { pvm: '2' }], aikaraami: { kausi: 'syksy 2026' },
    },
  }, lisa || {});
}

/* Tallennus-stub joka kayttaa OIKEAA yhdistajaa (#617) -> kausidokin taulukko on mitattavissa
   ilman Firestorea. Nain "historia sailyy" testataan samalla polulla jota tuotanto kayttaa. */
function tallentaja(dokki) {
  return async function (p) {
    dokki.tavoitteet = IDP.idpTavoitteetYhdista(dokki.tavoitteet, p._idpTavoite, { nyt: new Date(NYT) });
  };
}

/* ── (1) Luonnos ei korvaa voimassa olevaa ─────────────────────────────────── */
describe('(1) Luonnos ei korvaa voimassa olevaa tavoitetta', () => {
  it('Ehdota (moottori) kirjoittaa luonnokseen; _idpTavoite ja rivi pysyvat A:ssa', () => {
    const p = pelaaja();
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    expect(p._idpTavoite.luotu, 'voimassa oleva tavoite vaihtui').toBe('2026-01-15T08:00:00.000Z');
    expect(p._idpLuonnos, 'luonnosta ei syntynyt').toBeTruthy();
    expect(p._idpLuonnos.fokus.nimi).toBe('Monipuolisuus');
    expect(p._luonnosTyyppi).toBe('vaihto');
    // Rivin otsikko lukee VAIN voimassa olevaa tavoitetta (body = editori, se saa nayttaa luonnoksen).
    const ots = riviOtsikko(api.rivit(p), '_accKausitavoite');
    expect(ots).toContain('Syoton piilotus');
    expect(ots, 'luonnos vuoti Kehityssuunnitelman riville').not.toContain('Monipuolisuus');
  });

  it('kaikki nelja sisaantuloa kirjoittavat _idpLuonnos:iin, eivat _idpTavoite:en', () => {
    for (const nimi of ['_vpEhdotaTavoite', '_vpTeeIdpTavoiteHavainnosta', '_vpAsetaFokus', '_vpVapaaFokus']) {
      const src = pura('window.' + nimi + ' = function');
      expect(src, nimi + ' kirjoittaa yha suoraan voimassa olevaan tavoitteeseen')
        .not.toMatch(/p\._idpTavoite\s*=\s*t\b/);
      expect(src, nimi + ' ei aseta luonnosta').toContain('_vpAsetaLuonnos(p, t)');
    }
  });

  it('ilman voimassa olevaa tavoitetta luonnostyyppi on uusi (vanha polku ennallaan)', () => {
    const p = { id: 'p1' };
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    expect(p._luonnosTyyppi).toBe('uusi');
    expect(api.editori(p)).not.toContain('Luonnos · ei vielä käytössä');
  });
});

/* ── (2) Peruuta ───────────────────────────────────────────────────────────── */
describe('(2) Peruuta palauttaa voimassa olevan tavoitteen', () => {
  it('luonnos katoaa, _idpTavoite muuttumaton', () => {
    const p = pelaaja();
    const ennen = JSON.stringify(p._idpTavoite);
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    expect(p._idpLuonnos).toBeTruthy();
    api.peruuta('p1');
    expect(p._idpLuonnos, 'luonnos jai elamaan').toBeFalsy();
    expect(p._luonnosTyyppi).toBeFalsy();
    expect(JSON.stringify(p._idpTavoite)).toBe(ennen);
  });

  it('Peruuta-painike renderoityy aina kun luonnos on auki', () => {
    const p = pelaaja();
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    expect(api.editori(p), 'Peruuta nakyy ilman luonnosta').not.toContain('_vpPeruutaLuonnos');
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    expect(api.editori(p)).toContain('_vpPeruutaLuonnos(');
  });
});

/* ── (3) Muokkaus = kopio ──────────────────────────────────────────────────── */
describe('(3) Muokkaa tekee syvakopion ja tallentaa saman alkion', () => {
  it('alkuperainen ei muutu ennen tallennusta; tallennus pitaa luotu-tunnisteen ja pituuden', async () => {
    const p = pelaaja();
    const dokki = { tavoitteet: [p._idpTavoite] };
    const api = rakenna({
      ymp: { _vpIdpPelaaja: () => p, _vpTallennaIdpDok: tallentaja(dokki) },
      kentat: { _jspTavKuvaus: 'uusi kuvaus' },
    });
    api.win._vpArvPelaaja = p;

    api.muokkaa('p1');
    expect(p._luonnosTyyppi).toBe('muokkaus');
    expect(p._idpLuonnos, 'muokkaus osuu samaan objektiin (ei syvakopiota)').not.toBe(p._idpTavoite);
    p._idpLuonnos.kuvaus = 'valiaikainen';
    expect(p._idpTavoite.kuvaus, 'muokkaus vuoti voimassa olevaan').toBe('A-kuvaus');

    await api.tallenna('p1', null);
    expect(dokki.tavoitteet).toHaveLength(1);
    expect(dokki.tavoitteet[0].luotu).toBe('2026-01-15T08:00:00.000Z');
    expect(dokki.tavoitteet[0].kuvaus).toBe('uusi kuvaus');
    expect(dokki.tavoitteet[0].arviot, 'kehityskeskustelut katosivat').toHaveLength(2);
    expect(p._idpLuonnos, 'luonnos jai auki tallennuksen jalkeen').toBeFalsy();
    expect(p._idpTavoite.kuvaus).toBe('uusi kuvaus');
  });
});

/* ── (4) Vaihto kulkee hotfixin yhdistajan kautta ──────────────────────────── */
describe('(4) Vahvistettu vaihto sailyttaa vanhan tavoitteen historiassa', () => {
  it('taulukossa on [A vaihdettu, B aktiivinen] ja A:n arviot sailyvat', async () => {
    const p = pelaaja();
    const dokki = { tavoitteet: [p._idpTavoite] };
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p, _vpTallennaIdpDok: tallentaja(dokki) } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    expect(p._luonnosTyyppi).toBe('vaihto');
    await api.vaihtoVahvista('p1');
    expect(dokki.tavoitteet).toHaveLength(2);
    expect(dokki.tavoitteet[0].status).toBe('vaihdettu');
    expect(dokki.tavoitteet[0].arviot, 'vanhan kehityskeskustelut katosivat').toHaveLength(2);
    expect(dokki.tavoitteet[1].status).toBe('aktiivinen');
    expect(dokki.tavoitteet[1].fokus.nimi).toBe('Monipuolisuus');
    expect(p._idpTavoite.fokus.nimi, 'uusi tavoite ei noussut voimassa olevaksi').toBe('Monipuolisuus');
    expect(p._idpLuonnos, 'luonnos jai auki vaihdon jalkeen').toBeFalsy();
  });
});

/* ── (5) Peruuta ei kirjoita mitaan ────────────────────────────────────────── */
describe('(5) Peruuta ei kirjoita Firestoreen', () => {
  it('tallennus-spy saa 0 kutsua', () => {
    const p = pelaaja();
    const kutsut = [];
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p, _vpTallennaIdpDok: async () => { kutsut.push(1); } } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    api.peruuta('p1');
    expect(kutsut).toHaveLength(0);
  });
});

/* ── (6) Vahvistusikkuna ───────────────────────────────────────────────────── */
describe('(6) Vaihto vahvistetaan omassa ikkunassaan', () => {
  it('vaihto-luonnoksella paapainike avaa vahvistuksen, ei tallenna suoraan', () => {
    const p = pelaaja();
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    const h = api.editori(p);
    expect(h).toContain('_vpVaihtoAvaa(');
    expect(h, 'vaihto tallentui yha suoraan aktiiviseksi').not.toContain("_vpTallennaTavoite('p1','aktiivinen')");
    expect(h).toContain('Ota uusi tavoite käyttöön');
    expect(h, 'luonnosmerkinta puuttuu — VP ei nae etta tavoite ei ole viela kaytossa')
      .toContain('Luonnos · ei vielä käytössä');
  });

  it('jaksofokuksen kanssa kaksi nimettya valintaa, oletus Jatka jakso loppuun', () => {
    const p = pelaaja({ jaksofokus: { konsepti_nimi: 'Kolmas mies', konsepti_avain: 'kolmas', alkoi: new Date(NYT - 3 * PAIVA).toISOString(), kesto_vk: 4 } });
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    api.vaihtoAvaa('p1');
    const m = api.kerays.html.join('');
    expect(m).toContain('Vahvista vaihto');
    expect(m).toContain('Nykyinen tavoite');
    expect(m).toContain('Uusi tavoite');
    expect(m).toContain('Jatka jakso loppuun');
    expect(m).toContain('Päätä jakso nyt');
    expect(m).toContain('Vanha tavoite säilyy historiassa — mitään ei poisteta.');
    expect(api.win._vpVaihtoJakso, 'oletusvalinta ei ole jatka').toBe('jatka');
    // N tulee tmJfViikko:sta: alkoi 3 pv sitten, kesto 4 -> 3 vk jaljella
    expect(m).toContain('jatkuu vielä 3 vk.');
  });

  it('ilman jaksofokusta valintoja ei ole', () => {
    const p = pelaaja();
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    api.vaihtoAvaa('p1');
    const m = api.kerays.html.join('');
    expect(m).toContain('Vahvista vaihto');
    expect(m).not.toContain('Jatka jakso loppuun');
    expect(m).not.toContain('Päätä jakso nyt');
  });
});

/* ── (7) Paata jakso nyt ───────────────────────────────────────────────────── */
describe('(7) Jaksovalinta ohjaa sulkemisen olemassa olevaan _vpSuljeJakso:on', () => {
  const jfP = () => pelaaja({ jaksofokus: { konsepti_nimi: 'Kolmas mies', konsepti_avain: 'kolmas', alkoi: new Date(NYT - 3 * PAIVA).toISOString(), kesto_vk: 4 } });

  it('Paata jakso nyt kutsuu _vpSuljeJakso:a', async () => {
    const p = jfP();
    const suljetut = [];
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p, _vpTallennaIdpDok: async () => {}, _vpSuljeJakso: (pid) => suljetut.push(pid) } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    api.win._vpVaihtoJakso = 'paata';
    await api.vaihtoVahvista('p1');
    expect(suljetut).toEqual(['p1']);
  });

  it('Jatka jakso loppuun EI kutsu _vpSuljeJakso:a', async () => {
    const p = jfP();
    const suljetut = [];
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p, _vpTallennaIdpDok: async () => {}, _vpSuljeJakso: (pid) => suljetut.push(pid) } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    api.win._vpVaihtoJakso = 'jatka';
    await api.vaihtoVahvista('p1');
    expect(suljetut).toHaveLength(0);
  });
});

/* ── (8) Rivit ja nauha kertovat totuuden ──────────────────────────────────── */
describe('(8) Rivit ja status-nauha lukevat voimassa olevaa tavoitetta', () => {
  it('luonnoksen aikana rivi ja nauha nayttavat A:n tilan ja nimen', () => {
    const p = pelaaja();
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    const ots = riviOtsikko(api.rivit(p), '_accKausitavoite');
    const nauha = api.nauha(p);
    expect(ots).toContain('Syoton piilotus');
    expect(ots, 'luonnos vuoti riville').not.toContain('Monipuolisuus');
    expect(ots).toContain('Aktiivinen');
    expect(nauha, 'nauha nayttaa luonnoksen tilan').toContain('hyväksytty');
    expect(nauha).not.toContain('ehdotettu');
    // editori sen sijaan nayttaa luonnoksen
    expect(api.editori(p)).toContain('Monipuolisuus');
  });

  it('re-render rakentaa rivikontin JA nauhan uudelleen kun voimassa oleva tavoite vaihtuu', async () => {
    const p = pelaaja();
    const dokki = { tavoitteet: [p._idpTavoite] };
    const el = {
      _jspKehSuunnitelma: { innerHTML: '', querySelectorAll: () => [] },
      _jspKehStatus: { innerHTML: '' },
      _jspKausitavoite: { innerHTML: '' },
      _accKausitavoite: { classList: { add: () => {} } },
    };
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p, _vpTallennaIdpDok: tallentaja(dokki) }, el: el });
    api.win._vpArvPelaaja = p;
    api.reRender();                                   // 1. renderi kiinnittaa tunnuksen
    el._jspKehSuunnitelma.innerHTML = 'VANHA';
    el._jspKehStatus.innerHTML = 'VANHA';

    api.ehdota('p1');
    api.reRender();
    expect(el._jspKehSuunnitelma.innerHTML, 'luonnos rakensi rivikontin turhaan uudelleen (kesken jaanyt syotto katoaisi)')
      .toBe('VANHA');

    await api.tallenna('p1', 'aktiivinen');           // kutsuu re-renderia itse
    expect(el._jspKehSuunnitelma.innerHTML, 'rivikontti jai vanhaan tilaan hyvaksynnan jalkeen').not.toBe('VANHA');
    expect(el._jspKehSuunnitelma.innerHTML).toContain('Monipuolisuus');
    expect(el._jspKehStatus.innerHTML, 'status-nauha jai vanhaan tilaan').not.toBe('VANHA');
  });

  it('_vpKausitavoiteReRender paivittaa myos rivit ja nauhan, ei pelkkaa slottia', () => {
    const src = pura('function _vpKausitavoiteReRender()');
    expect(src).toContain("getElementById('_jspKehSuunnitelma')");
    expect(src).toContain("getElementById('_jspKehStatus')");
    expect(src).toContain('_vpKehSuunnitelmaHTML(p)');
    expect(src).toContain('_vpKehStatusHTML(p)');
    // ankkurit ovat olemassa cockpitin rakenteessa
    expect(VP).toContain('id="_jspKehSuunnitelma"');
    expect(VP).toContain('id="_jspKehStatus"');
  });

  it('cockpitin avaus nollaa tallentamattoman luonnoksen', () => {
    const src = pura('window._avaaPerPelaajaPikakatsaus = function(idx, joukkueNimi)');
    expect(src).toContain('_vpTyhjennaLuonnos(p)');
    expect(src).toContain('!p._luonnosTallennettu');
  });
});

/* ── (9) Yksi viikkolaskuri ────────────────────────────────────────────────── */
describe('(9) Sama jakso antaa saman viikkoluvun kaikissa kolmessa paikassa', () => {
  const jf = () => ({ konsepti_nimi: 'Kolmas mies', konsepti_avain: 'kolmas', alkoi: new Date(NYT - 3 * PAIVA).toISOString(), kesto_vk: 4 });

  it('nauha, rivi ja katselmusrivi: 3 vk jaljella (ei ceil-kaavan 4)', () => {
    const p = pelaaja({ jaksofokus: jf() });
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    const nauha = api.nauha(p);
    expect(nauha, 'nauha kayttaa yha ceil-kaavaa').toContain('3 vk jäljellä');
    expect(nauha).not.toContain('4 vk jäljellä');
    const rivit = api.rivit(p);
    expect(rivit).toContain('Viikko 1/4');
    expect(rivit).toContain('3 vk jäljellä');
    const kats = api.katselmus(p, { jf: jf() });
    expect(kats, 'katselmusrivi kayttaa yha ceil-kaavaa').toContain('~3 vk');
    expect(kats).not.toContain('~4 vk');
  });

  it('ilman alkoi-arvoa nayttaa keston kuten ennen', () => {
    const p = pelaaja({ jaksofokus: { konsepti_nimi: 'Kolmas mies', kesto_vk: 6 } });
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p } });
    expect(api.nauha(p)).toContain('kesto 6 vk');
    expect(api.katselmus(p, { jf: { konsepti_nimi: 'Kolmas mies', kesto_vk: 6 } })).toContain('~6 vk');
  });

  it('VP:ssa ei ole muita vk-jaljella-laskentoja', () => {
    // sallitut: viikkovakio, kulunut-progress, jakson loppupvm, review-vali
    const rivit = VP.split('\n');
    const osumat = [];
    rivit.forEach((r, i) => {
      if (r.indexOf('7 * 86400000') < 0) return;
      if (/vk jäljellä|jaljella|jäljellä/.test(r)) osumat.push(i + 1);
    });
    expect(osumat, 'ceil-pohjainen vk-jaljella jai jaljelle').toEqual([]);
  });
});

/* ── (10) Lataus, kaannokset ja hotfix-ehto ────────────────────────────────── */
describe('(10) Tallennettu ehdotus latautuu luonnokseksi + sanktioidut kaannokset', () => {
  it('[A aktiivinen, B ehdotettu] -> tavoite A, luonnos B', () => {
    const r = IDP.idpJaaVoimassaJaEhdotus([
      { luotu: 'A', status: 'aktiivinen' }, { luotu: 'B', status: 'ehdotettu' },
    ]);
    expect(r.tavoite.luotu).toBe('A');
    expect(r.luonnos.luotu).toBe('B');
  });

  it('pelkka ehdotus -> ei voimassa olevaa, luonnos B', () => {
    const r = IDP.idpJaaVoimassaJaEhdotus([{ luotu: 'B', status: 'ehdotettu' }]);
    expect(r.tavoite).toBeNull();
    expect(r.luonnos.luotu).toBe('B');
  });

  it('VP:n lataaja kayttaa jaettua helperia ja merkitsee ladatun luonnoksen tallennetuksi', () => {
    const src = pura('async function _vpLataaTavoite(p)');
    expect(src).toContain('idpJaaVoimassaJaEhdotus(');
    expect(src).toContain('_luonnosTallennettu = true');
    expect(src, 'lataaja asettaa ehdotuksen yha voimassa olevaksi tavoitteeksi')
      .not.toMatch(/tgt\._idpTavoite = val \? val\.tavoite : arr\[arr\.length - 1\];/);
  });

  it('idpTavoitteetYhdista: [A aktiivinen] + uusi hylatty -> A pysyy aktiivisena', () => {
    const lista = IDP.idpTavoitteetYhdista(
      [{ luotu: 'A', status: 'aktiivinen', arviot: [] }],
      { luotu: 'B', status: 'hylatty', arviot: [] }, { nyt: new Date(NYT) },
    );
    expect(lista[0].status).toBe('aktiivinen');
  });

  it('kaikki uudet fi-avaimet loytyvat sanktioidusta sv-kartasta', () => {
    const sv = (I18N.TM_VP_I18N && I18N.TM_VP_I18N.sv) || (typeof TM_VP_I18N !== 'undefined' ? TM_VP_I18N.sv : null);
    expect(sv, 'sv-kartta puuttuu').toBeTruthy();
    const avaimet = [
      'Luonnos · ei vielä käytössä', 'Ota uusi tavoite käyttöön', 'Vahvista vaihto',
      'Nykyinen tavoite', 'Uusi tavoite', 'Nykyinen jakso',
      'on tehty vanhan tavoitteen pohjalta. Mitä sille tehdään?', 'Jatka jakso loppuun',
      'jatkuu vielä', 'vk. Uusi tavoite ohjaa seuraavaa jaksoa.', 'Päätä jakso nyt',
      'siirtyy Aiempiin jaksoihin. Valitset heti uuden jakson.',
      'Vanha tavoite säilyy historiassa — mitään ei poisteta.',
    ];
    for (const a of avaimet) expect(sv[a], 'sv puuttuu avaimelta ' + a).toBeTruthy();
  });

  it('sv-tilassa vahvistusikkuna ei vuoda suomea', () => {
    const sv = I18N.TM_VP_I18N.sv;
    const p = pelaaja({ jaksofokus: { konsepti_nimi: 'Kolmas mies', alkoi: new Date(NYT - 3 * PAIVA).toISOString(), kesto_vk: 4 } });
    const api = rakenna({ ymp: { _vpIdpPelaaja: () => p }, vpT: (s) => (sv[s] != null ? sv[s] : s) });
    api.win._vpArvPelaaja = p;
    api.ehdota('p1');
    api.vaihtoAvaa('p1');
    const m = api.kerays.html.join('');
    expect(m).toContain('Bekräfta byte');
    expect(m).toContain('Slutför perioden');
    expect(m).toContain('Avsluta perioden nu');
    expect(m).not.toContain('Jatka jakso loppuun');
    expect(m).not.toContain('Ota uusi tavoite käyttöön');
  });

  it('kirjastoversiot nostettu (vanha valimuisti ei palauta luonnoslogiikkaa)', () => {
    const v = (src) => Number((src.match(/lib\/tm_idp\.js\?v=(\d+)/) || [])[1] || 0);
    expect(v(VP)).toBeGreaterThanOrEqual(8);
    expect(v(readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8'))).toBeGreaterThanOrEqual(8);
    expect(v(readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8'))).toBeGreaterThanOrEqual(4);
  });
});
