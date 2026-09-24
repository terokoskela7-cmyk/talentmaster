/**
 * PDC P1 — read-only-siirtymä cockpittiin. RENDERÖINTI- JA JÄRJESTYSVARTIJA.
 *
 * Pelaajaraportti (PDC) on määritelty read-onlyksi: `_vpKehSuunnitelmaHTML(p, { editori: false })`
 * on tiedoston ainoa read-only-kutsu. Silti read-only-haarasta pääsi kolmeen muokkaustoimintoon:
 *
 *   L1  `✎ Muokkaa jaksofokus`  → `_jfOhjaa`        → `#_jfInlineEditor` puuttuu PDC:stä → MODAALI
 *   L2  `＋ Aseta jaksofokus`   → `_jfOhjaa`        → sama
 *   L3  `＋ Tee kauden tavoite` → `_vpEhdotaTavoite` → `_vpKausitavoiteReRender`-fallback kutsuu
 *                                                     `_vpKehSuunnitelmaHTML(p)` ILMAN optsia
 *                                                     → editori injektoituu read-only-raporttiin
 *
 * KAKSI ERI VIKALUOKKAA, JOTKA MOLEMMAT ON VARTIOITAVA:
 *   (a) KOHDE   — nappi osoitti editoriin/modaaliin eikä siirtymään.
 *   (b) SYNTAKSI — L2/L3 olivat lisäksi #605:n codemodin jäljiltä kaksoisescapattuja
 *       (`'\\\')` → attribuutiksi `f('ABC\')`), jolloin inline-handler ei PARSIUTUNUT lainkaan:
 *       nappi oli kuollut, ja L3:n injektio oli vain latentti — se olisi herännyt sillä hetkellä
 *       kun escapetus korjataan kohdetta vaihtamatta. Siksi portti vaatii MOLEMMAT:
 *       handlerin on parsiuduttava JA osoitettava siirtymään.
 *
 * MIKSI GREPPI EI RIITÄ: järjestys (palaveri → lista → avaus → välilehti) ja väärä-pelaaja-ansa
 * eivät näy tekstistä. Siksi helperi PURETAAN LÄHTEESTÄ ja AJETAAN tyngillä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const RIVIT = VP.split('\n');

/* ── Apurit: funktiorunko lähteestä (sulkulaskuri) ──────────────────────── */
function funktio(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('sulkuja ei saatu tasan: ' + tunniste);
}

/** Nappirivin renderöity onclick-attribuutti (aito lauseke lähteestä). */
function onclickAttr(hakusana) {
  const s = RIVIT.find((l) => l.includes(hakusana));
  expect(s, 'riviä ei löydy: ' + hakusana).toBeTruthy();
  const lauseke = s.trim()
    .replace(/^(h|s)\s*\+=\s*/, '').replace(/^[:+]\s*/, '')
    .replace(/;\s*$/, '').replace(/\)\s*$/, '');
  const ctx = { pid: 'ABC', vpT: (t) => t, esc: (v) => String(v) };
  // eslint-disable-next-line no-new-func
  const html = new Function(...Object.keys(ctx), 'return (' + lauseke + ');')(...Object.values(ctx));
  const m = String(html).match(/onclick="([^"]*)"/);
  expect(m, 'onclick-attribuuttia ei syntynyt: ' + hakusana).toBeTruthy();
  return m[1];
}

/** Aja _pdcSiirryCockpittiin tyngillä; palauta kutsujärjestys + havainnot. */
function aja(opts) {
  const o = Object.assign({ pid: 'p2', palaveri: false, jsvEnnen: null, pelaajat: null, tab: 3 }, opts);
  const loki = [];
  const pelaajat = o.pelaajat || [
    { id: 'p1', joukkue: 'SJK P15' },
    { id: 'p2', joukkue: 'SJK P14' },
    { id: 'p3', joukkue: 'SJK P13' },
  ];
  const win = { _jsvPelaajat: o.jsvEnnen };
  let ajastin = null;
  const ymparisto = {
    _pelaajat: pelaajat,
    _mdtPalaveri: o.palaveri,
    _mdtPalaveritila: () => { loki.push({ t: 'palaveri_kiinni' }); },
    _avaaPerPelaajaPikakatsaus: (idx, joukkue) => {
      // Avaaja lukee _jsvPelaajat:ia — tallenna mitä se NÄKEE kutsuhetkellä.
      const nahty = (win._jsvPelaajat || [])[((idx % (win._jsvPelaajat || []).length) + (win._jsvPelaajat || []).length) % ((win._jsvPelaajat || []).length || 1)];
      loki.push({ t: 'avaa', idx, joukkue, avattuId: nahty && nahty.id, listaPituus: (win._jsvPelaajat || []).length });
    },
    _jspVaihda: (n) => { loki.push({ t: 'valilehti', n }); },
    toast: (viesti) => { loki.push({ t: 'toast', viesti }); },
    vpT: (t) => t,
    window: win,
    setTimeout: (fn) => { ajastin = fn; loki.push({ t: 'ajastettu' }); },
  };
  // Proxy jotta `window._jsvPelaajat = lista` kirjautuu järjestykseen.
  const winProxy = new Proxy(win, {
    set(kohde, avain, arvo) {
      if (avain === '_jsvPelaajat') loki.push({ t: 'lista_asetettu', pituus: (arvo || []).length });
      kohde[avain] = arvo; return true;
    },
  });
  ymparisto.window = winProxy;
  const runko = funktio('window._pdcSiirryCockpittiin = function (pid, tab) {');
  const nimet = Object.keys(ymparisto);
  // eslint-disable-next-line no-new-func
  new Function(...nimet, runko.replace(/^window\./, 'var _fn = ') + '\n_fn(' + JSON.stringify(o.pid) + ',' + o.tab + ');')(
    ...nimet.map((k) => ymparisto[k]),
  );
  return { loki, tick: () => { if (ajastin) ajastin(); }, win };
}

const JARJESTYS = (loki) => loki.map((x) => x.t);

describe('PDC P1 · (1) EI MODAALIA PDC:llä — kaikki kolme vuotoa tukittu', () => {
  const NAPIT = [
    ['L1 read-only-yhteenveto', "vpT('→ Kehitä jaksofokusta') + '</button></div>'"],
    ['L3 kauden tavoite (tyhjä)', "vpT('＋ Tee kauden tavoite')"],
    /* PR B toi saman tekstin toiseen paikkaan (Seuraava askel -laatikon painike, _vpAskelNappi),
       joten hakusana on tarkennettu tähän kutsupaikkaan — muuten haku osuisi switch-haaraan,
       josta ei synny onclick-attribuuttia lainkaan. */
    ['L2 jaksofokus (tyhjä)', "_pdcSiirryCockpittiin(\\'' + pid + '\\',3)\">' + vpT('＋ Aseta jaksofokus')"],
  ];

  it.each(NAPIT)('%s: handler PARSIUTUU ja osoittaa siirtymään (ei _jfOhjaa/_vpEhdotaTavoite)', (_nimi, hak) => {
    const a = onclickAttr(hak);
    // (b) syntaksiluokka — kaksoisescape teki napista kuolleen (#605)
    expect(() => new Function(a), 'inline-handler ei parsiudu: ' + a).not.toThrow();
    // (a) kohdeluokka
    expect(a).toContain('_pdcSiirryCockpittiin(');
    expect(a).not.toMatch(/_jfOhjaa\(/);
    expect(a).not.toMatch(/_vpEhdotaTavoite\(/);
    expect(a, 'stopPropagation puuttuu → haitari togglaa siirtymän alla').toContain('event.stopPropagation()');
  });

  it('L3:n re-render-injektio on kuollut polku: read-only-haara ei enää kutsu _vpEhdotaTavoite:a', () => {
    const T = funktio('function _vpKehSuunnitelmaHTML(p, opts) {');
    expect(T).not.toContain('_vpEhdotaTavoite(');
    expect(T).not.toContain('_jfOhjaa(');
    // EI VACUOUS: moodilippu + editori-haara ennallaan (työpöytä ei regressoinut)
    expect(T).toContain('const _inlineEditori = !opts || opts.editori !== false;');
    expect(T).toContain('_vpJfInlineHTML(p)');
    expect(T).toContain('_vpTyopoytaJaksofokusHTML(p)');
  });

  it('PDC kutsuu yhä read-only-tilassa (lippu ei kadonnut)', () => {
    expect(VP).toContain('_vpKehSuunnitelmaHTML(p, { editori: false })');
  });
});

describe('PDC P1 · (2) OIKEA PELAAJA', () => {
  it('avaa pyydetyn pelaajan vaikka _jsvPelaajat olisi eri lista ERI JÄRJESTYKSESSÄ', () => {
    // Ansa: avaaja indeksoi _jsvPelaajat:ia ja kiertää indeksin modulolla → ilman
    // listan asetusta idx 1 osoittaisi tässä pelaajaan 'p2' VÄÄRÄSSÄ listassa.
    const { loki } = aja({
      pid: 'p3',
      jsvEnnen: [{ id: 'zz', joukkue: 'muu' }, { id: 'yy', joukkue: 'muu' }],
    });
    const avaa = loki.find((x) => x.t === 'avaa');
    expect(avaa, 'avaajaa ei kutsuttu').toBeTruthy();
    expect(avaa.avattuId, 'avautui väärä pelaaja').toBe('p3');
    expect(avaa.joukkue).toBe('SJK P13');
  });

  it('suodatettu/lyhyempi _jsvPelaajat ei sekoita indeksiä', () => {
    const { loki } = aja({ pid: 'p1', jsvEnnen: [{ id: 'vain_yksi', joukkue: 'x' }] });
    expect(loki.find((x) => x.t === 'avaa').avattuId).toBe('p1');
  });

  it('tuntematon pid → EI avausta lainkaan (ei hiljaista modulokiertoa), toast tilalle', () => {
    const { loki } = aja({ pid: 'ei_ole' });
    expect(JARJESTYS(loki)).not.toContain('avaa');
    expect(JARJESTYS(loki)).not.toContain('valilehti');
    expect(loki.some((x) => x.t === 'toast')).toBe(true);
  });
});

describe('PDC P1 · (3) JÄRJESTYS', () => {
  it('palaveri kiinni → lista → avaus → (tick) → välilehti', () => {
    const { loki, tick } = aja({ pid: 'p2', palaveri: true });
    expect(JARJESTYS(loki)).toEqual(['palaveri_kiinni', 'lista_asetettu', 'avaa', 'ajastettu']);
    tick();
    expect(JARJESTYS(loki)).toEqual(['palaveri_kiinni', 'lista_asetettu', 'avaa', 'ajastettu', 'valilehti']);
  });

  it('lista asetetaan ENNEN avaajaa (muuten avaaja lukee vanhan listan)', () => {
    const { loki } = aja({ pid: 'p2' });
    expect(JARJESTYS(loki).indexOf('lista_asetettu')).toBeLessThan(JARJESTYS(loki).indexOf('avaa'));
  });

  it('välilehti EI vaihdu synkronisesti (mount ensin) ja on 3 = Kehitys', () => {
    const { loki, tick } = aja({ pid: 'p2' });
    expect(JARJESTYS(loki), '_jspVaihda kutsuttiin ennen mounttia').not.toContain('valilehti');
    tick();
    expect(loki.find((x) => x.t === 'valilehti').n).toBe(3);
  });
});

describe('PDC P1 · (4) PALAVERI SULKEUTUU', () => {
  it('palaveritilassa palaveri suljetaan kerran, ENNEN avausta', () => {
    const { loki } = aja({ pid: 'p2', palaveri: true });
    expect(loki.filter((x) => x.t === 'palaveri_kiinni')).toHaveLength(1);
    expect(JARJESTYS(loki).indexOf('palaveri_kiinni')).toBeLessThan(JARJESTYS(loki).indexOf('avaa'));
  });

  it('kiinni-tilassa palaveritilaa EI kosketa (toggle AVAISI sen)', () => {
    const { loki } = aja({ pid: 'p2', palaveri: false });
    expect(JARJESTYS(loki)).not.toContain('palaveri_kiinni');
  });

  it('Z-LUKKO: palaveri (500) on työpöydän (320) yllä → sulku on pakollinen, ei kosmetiikkaa', () => {
    const palaveri = /\.mdt-palaveri\s*\{[^}]*z-index:\s*(\d+)/.exec(VP);
    const tyopoyta = /id="_jspModal"[^>]*z-index:(\d+)/.exec(VP);
    expect(palaveri, '.mdt-palaveri z-index ei löydy').toBeTruthy();
    expect(tyopoyta, '#_jspModal z-index ei löydy').toBeTruthy();
    expect(
      Number(palaveri[1]),
      'työpöytä nousi palaverin yli → P1:n oletus muuttui (ks. haarauma B2)',
    ).toBeGreaterThan(Number(tyopoyta[1]));
  });
});

describe('PDC P1 · (5) YKSI POLKU', () => {
  it('_reviewCockpitAvaa delegoi jaettuun siirtymään (ei omaa idx-resolvointia)', () => {
    const T = funktio('window._reviewCockpitAvaa = function (pid, tab) {');
    expect(T).toContain('_pdcSiirryCockpittiin(');
    expect(T, 'oma findIndex jäi → sama väärä-pelaaja-ansa').not.toContain('findIndex');
  });

  it('siirtymäfunktioita on täsmälleen yksi määritelmä', () => {
    const n = (VP.match(/window\._pdcSiirryCockpittiin\s*=/g) || []).length;
    expect(n).toBe(1);
  });
});
