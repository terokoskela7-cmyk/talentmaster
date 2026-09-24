/**
 * sv-YHTENÄISTYS (Gemini 23.9.) + DATANIMIEN LOKALISOINTI + KAUSI-ETULIITE. Vartija.
 *
 * Neljä eri vikaluokkaa, jotka kaikki näkyivät sv-tilassa suomena tai väärällä termillä:
 *   A  "löpt ut" -linja → Geminin linja (Utgången / har gått ut / framskrida). Lisäksi
 *      lukumääräyhteys: "🟠 3 umpeutunut" → "umpeutunutta" (fi) / "utgångna" (sv).
 *   B  Kausi-arvo näytettiin etuliitteellä → "KAUSI SYKSY 2026" ja sv:ssä "SÄSONG SYKSY 2026"
 *      (tupla + kielet sekaisin). Nyt sana käännetään, vuosi ei, etuliite pois.
 *   C  Datanimet olivat sv-tilassa suomeksi ("Syötön piilotus", "SYÖTTÄMINEN"). Käännös tehdään
 *      RENDERISSÄ olemassa olevista sanktioiduista lähteistä (taksonomian nimi_sv · curriculum-sidecar
 *      TM_TT_SV · tm_fyysteemat nimi_sv). DATA PYSYY SUOMENA — sama malli kuin 'kulta' → 'guld'.
 *   D  Raa'at tila-enumit ('ehdotettu') näkyivät sellaisenaan.
 *   E  Curriculumin nimet ovat datassa isoilla (SYÖTTÄMINEN) → 22 px:n serif-otsikkona huutaa.
 *
 * INVARIANTTI: fi-render on ennallaan — käännöshaarat ajetaan vain kun kieli ≠ fi. Puuttuva käännös
 * → tallennettu fi-nimi (ei arvausta, ei tyhjää).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const vaadi = createRequire(import.meta.url);
const JF = vaadi('../lib/tm_jaksofokus.js');
const _I18N = vaadi('../lib/tm_vp_i18n.js');
const SV = (_I18N.TM_VP_I18N || _I18N).sv;
const _MI18N = vaadi('../lib/tm_master_i18n.js');
const MSV = (_MI18N.TM_MASTER_I18N || _MI18N).sv;
const TAKS = vaadi('../lib/tm_arviointi_taksonomia.js');
const TTSV = vaadi('../lib/tm_teknistaktiset_sv.js');
const FYYS = vaadi('../lib/tm_fyysteemat.js');

const PV = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

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

const HELPERIT = ['function _vpKausiNaytto(k) {', 'function _vpFokusNimiNaytto(fokus) {',
  'function _vpKonseptiNimiNaytto(jf) {', 'function _vpTilaNaytto(tila) {', 'function _vpOtsikkoNaytto(s) {',
  'function _vpTaksLang() {', 'function _taksNimi(o) {', 'function _taksVal(o, kentta) {',
  'function _taksAvainNimi(avain) {', 'function _ttSvKartta() {', 'function _ttSvPaalla() {',
  'function _ttSv(avain, kentta) {',
  /* PR B: kausitavoite-rivin alarivi ("Nyt X \u2192 tavoite Y \u00b7 arvioidaan pp.kk." + pelaajan omat sanat)
     on AITO lahteesta — tyhja tynka piilottaisi juuri sen sisallon jota nama portit mittaavat. */
  'function _vpKtArvoTeksti(arvo, yks) {', 'function _vpKtAlariviHTML(t, inline) {'];

/** Renderöi Kehityssuunnitelma AIDOILLA libeillä annetulla kielellä. */
function render(p, opts, kieli) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ymp = {
    _jsvEsc: esc,
    vpT: (t) => (kieli === 'sv' ? (SV[t] != null ? SV[t] : t) : t),
    tmNykyinenKieli: () => kieli || 'fi',
    TM_TT_SV: (TTSV.TM_TT_SV || TTSV),
    tmTaksonomiaByAvain: TAKS.tmTaksonomiaByAvain,
    tmMittaLahdeNimi: TAKS.tmMittaLahdeNimi || (() => ''),
    tmKategoriaNimi: TAKS.tmKategoriaNimi || (() => ''),
    window: { TM_JAKSOFOKUS: JF, _tmIBtn: () => '', TM_FYYSTEEMAT_LIB: FYYS },
    _vpKausitavoiteHTML: () => '<div>KT</div>',
    _vpTavoiteYhteenvetoHTML: () => '<div>YHTEENVETO</div>',
    _vpJfInlineHTML: () => '<div id="_jfInlineEditor">INLINE</div>',
    _vpTyopoytaJaksofokusHTML: () => '<div>RO</div>',
    _vpJfEvidenssiHTML: () => '',
    _vpKehityskaariHTML: () => '',
    _vpMesoKaariHTML: () => '',
  };
  const nimet = Object.keys(ymp);
  const koodi = HELPERIT.map(funktio).join('\n') + '\n'
    + funktio('function _vpKehSuunnitelmaHTML(p, opts) {') + '\nreturn _vpKehSuunnitelmaHTML(_p, _opts);';
  // eslint-disable-next-line no-new-func
  return new Function(...nimet, '_p', '_opts', koodi)(...nimet.map((k) => ymp[k]), p, opts);
}

const sisallot = (h) => [...h.matchAll(/class="acc-content"[^>]*>([^<]*)/g)].map((m) => m[1].trim());
const tilarivit = (h) => [...h.matchAll(/class="acc-state"><span class="acc-dot[^"]*"><\/span><span class="w">([^<]*)<\/span>([^<]*)/g)]
  .map((m) => (m[1] + m[2]).trim());
const metat = (h) => [...h.matchAll(/class="acc-meta"[^>]*>([^<]*)/g)].map((m) => m[1].trim());

function pelaaja(yli) {
  return Object.assign({
    id: 'p1',
    _idpTavoite: {
      status: 'aktiivinen', fokus: { alue: 'hide_pass', nimi: 'Syötön piilotus' },
      aikaraami: { kausi: 'syksy 2026' }, arviot: [1, 2, 3],
    },
    jaksofokus: {
      konsepti_nimi: 'SYÖTTÄMINEN', konsepti_avain: 'y_h2', domeeni: 'teknis_taktinen',
      alkoi: iso(Date.now() - 9 * PV), kesto_vk: 4,
    },
    jaksofokus_historia: [1],
  }, yli || {});
}

describe('(1) sv-kartta — Geminin linja, ei omaa ruotsia', () => {
  const A = {
    'umpeutunut': 'utgången',
    'umpeutunutta': 'utgångna',
    '🟠 umpeutunut': '🟠 Utgången',
    'Jakso umpeutunut': 'Perioden utgången',
    '🟠 Jakso umpeutunut — ↻ sulje/vaihda jakso muokkaus-paneelista.': '🟠 Perioden har gått ut — ↻ stäng/byt period i redigeringspanelen.',
    /* PR B: avain nimettiin uudelleen KISS-termiksi ('Kausitavoite' → 'Kauden tavoite') ja sv tuli samasta
       sanktioidusta erästä (KEHITYS_V2_RAKENNE). Invariantti sama: arvo on Geminin, ei omaa ruotsia. */
    'Kauden tavoite ei ole edennyt': 'Säsongens mål har inte framskridit på',
  };
  const B = { 'Henkinen': 'Psykisk', 'syksy': 'höst', 'kevät': 'vår' };

  it.each(Object.entries(A))('A · %s', (avain, arvo) => expect(SV[avain]).toBe(arvo));
  it.each(Object.entries(B))('B · %s', (avain, arvo) => expect(SV[avain]).toBe(arvo));

  it('Master-kartta: "har gått ut"', () => {
    expect(MSV['🟠 Jakso umpeutunut · Sulje jakso → seuraava fokus'])
      .toBe('🟠 Perioden har gått ut · Stäng period → nästa fokus');
  });

  it('"löpt ut" = 0 kartoissa JA käännösmuisteissa', () => {
    ['lib/tm_vp_i18n.js', 'lib/tm_master_i18n.js',
      'docs/VP_SV_KAANNOSMUISTI.json', 'docs/MASTER_SV_KAANNOSMUISTI.json'].forEach((f) => {
      const s = readFileSync(join(juuri, f), 'utf8');
      expect(s, f + ' sisältää yhä "löpt ut"').not.toContain('löpt ut');
    });
  });

  it('"avancerat" = 0 VP-kartassa, mutta curriculumin "avancera" KOSKEMATTA', () => {
    expect(readFileSync(join(juuri, 'lib/tm_vp_i18n.js'), 'utf8')).not.toContain('avancerat');
    // taktinen eteneminen kentällä on oikein ruotsiksi 'avancera' — sitä ei siivota
    expect(readFileSync(join(juuri, 'lib/tm_teknistaktiset_sv.js'), 'utf8')).toContain('avancera');
  });
});

describe('(2) Lukumäärä — umpeutunut / umpeutunutta', () => {
  const rivi = VP.split('\n').find((l) => l.includes("k.jaksot.umpeutuneet ? '🟠 '"));

  it('yksikkö/monikko haarautuu lukumäärän mukaan', () => {
    expect(rivi, 'jaksot-KPI-riviä ei löydy').toBeTruthy();
    expect(rivi).toContain("k.jaksot.umpeutuneet === 1 ? vpT('umpeutunut') : vpT('umpeutunutta')");
  });

  it('yksikkökäyttö (Aloitus-kortti) pysyy vpT(\'umpeutunut\'):na', () => {
    /* PR B poisti Kehitys-välilehden status-nauhan; yksikkömuodon ainoa jäljellä oleva
       käyttöpaikka on Aloitus-välilehden jaksofokus-kortti. Invariantti on sama: raakaa
       fi-literaalia ei saa jäädä, koska sv erottaa yksikön ja monikon (utgången/utgångna). */
    expect(funktio('function _vpAloitusHTML(p) {')).toContain("vpT('umpeutunut')");
    expect(VP, 'poistettu nauha jäi lähteeseen').not.toContain('function _vpKehStatusHTML(p) {');
  });

  it('sv: 1 → utgången, 3 → utgångna', () => {
    expect(SV['umpeutunut']).toBe('utgången');
    expect(SV['umpeutunutta']).toBe('utgångna');
  });
});

describe('(3) Kausi — sana käännetään, vuosi ei, etuliite pois', () => {
  it('fi "syksy 2026" · sv "höst 2026", ei etuliitettä', () => {
    expect(tilarivit(render(pelaaja(), undefined, 'fi'))[0]).toContain('syksy 2026');
    expect(tilarivit(render(pelaaja(), undefined, 'sv'))[0]).toContain('höst 2026');
    [render(pelaaja(), undefined, 'fi'), render(pelaaja(), undefined, 'sv')].forEach((h) => {
      expect(tilarivit(h)[0]).not.toMatch(/Kausi /);
      expect(tilarivit(h)[0]).not.toMatch(/Säsong /i);
    });
  });

  it('kevät kääntyy (vår)', () => {
    const h = render(pelaaja({ _idpTavoite: { status: 'aktiivinen', fokus: { alue: 'hide_pass', nimi: 'x' }, aikaraami: { kausi: 'kevät 2027' } } }), undefined, 'sv');
    expect(tilarivit(h)[0]).toContain('vår 2027');
  });

  it('tuntematon muoto sellaisenaan (ei arvausta)', () => {
    const h = render(pelaaja({ _idpTavoite: { status: 'aktiivinen', fokus: { alue: 'hide_pass', nimi: 'x' }, aikaraami: { kausi: '2026' } } }), undefined, 'sv');
    expect(tilarivit(h)[0]).toContain('2026');
    expect(tilarivit(h)[0]).not.toMatch(/höst|vår/);
  });

  it('Aloitus-kortit käyttävät samaa apufunktiota (ei vpT(\'Kausi \'))', () => {
    const osumat = (VP.match(/hor\.push\(_vpKausiNaytto\(ar\.kausi\)\)/g) || []).length;
    expect(osumat, 'Aloitus-korttien kausirivit (2 kpl) eivät käytä _vpKausiNaytto:a').toBe(2);
    expect(VP, "vpT('Kausi ') on yhä käytössä").not.toContain("vpT('Kausi ')");
  });
});

describe('(4) Datanimet — sv olemassa olevasta sanktioidusta lähteestä', () => {
  it('taksonomia: hide_pass → "Dölja passningen" (sv), fi ennallaan', () => {
    expect(sisallot(render(pelaaja(), undefined, 'sv'))[0]).toBe('Dölja passningen');
    expect(sisallot(render(pelaaja(), undefined, 'fi'))[0]).toBe('Syötön piilotus');
  });

  it('curriculum-sidecar: y_h2 → "Passningsspel" (sv), fi ennallaan', () => {
    expect(sisallot(render(pelaaja(), undefined, 'sv'))[1]).toBe('Passningsspel');
    expect(sisallot(render(pelaaja(), undefined, 'fi'))[1]).toBe('Syöttäminen');
  });

  it('tuntematon avain → tallennettu fi-nimi (fallback, ei tyhjä)', () => {
    const h = render(pelaaja({
      _idpTavoite: { status: 'aktiivinen', fokus: { alue: 'ei_ole_taksonomiassa', nimi: 'Oma fokus' }, aikaraami: { kausi: 'syksy 2026' } },
      jaksofokus: { konsepti_nimi: 'Oma konsepti', konsepti_avain: 'ei_ole_sidecarissa', domeeni: 'teknis_taktinen', alkoi: iso(Date.now()), kesto_vk: 4 },
    }), undefined, 'sv');
    expect(sisallot(h)).toEqual(['Oma fokus', 'Oma konsepti']);
  });

  it('fyysinen domeeni käyttää tm_fyysteemat nimi_sv:tä', () => {
    const h = render(pelaaja({
      jaksofokus: { konsepti_nimi: 'Nopeus', konsepti_avain: 'fy_nopeus', domeeni: 'fyysinen', alkoi: iso(Date.now()), kesto_vk: 4 },
    }), undefined, 'sv');
    expect(sisallot(h)[1]).toBe('Snabbhet');
  });

  it('domeenin nimi kääntyy metassa (Teknisk-taktisk), ei fi-vuotoa', () => {
    expect(metat(render(pelaaja(), undefined, 'sv'))[0]).toContain('Teknisk-taktisk');
    expect(metat(render(pelaaja(), undefined, 'sv'))[0]).not.toContain('Teknis-taktinen');
  });
});

describe('(5) Tila-enum vpT:n läpi', () => {
  const tilalla = (status, kieli) => tilarivit(render(pelaaja({
    _idpTavoite: { status: status, fokus: { alue: 'hide_pass', nimi: 'x' }, aikaraami: { kausi: 'syksy 2026' } },
  }), undefined, kieli))[0];

  it('ehdotettu → Utkast (sv) — tallentamaton luonnos, ei "Föreslagen"', () => {
    // PR B (B6): enum-arvo 'ehdotettu' on käyttäjälle tallentamaton LUONNOS.
    expect(SV['Luonnos'], 'sanktioitu sv-avain puuttuu kartasta').toBe('Utkast');
    expect(tilalla('ehdotettu', 'sv')).toContain('Utkast');
    expect(tilalla('ehdotettu', 'sv'), 'vanha enum-termi jäi näkyviin').not.toContain('Föreslagen');
  });

  it('tuntematon arvo escapattuna sellaisenaan', () => {
    expect(tilalla('keskeytetty', 'fi')).toContain('keskeytetty');
  });

  it('XSS tila-arvona escapataan (sulkee #614:n viimeisen elossa olleen mutaation)', () => {
    const h = render(pelaaja({
      _idpTavoite: { status: '<img src=x onerror=alert(1)>', fokus: { alue: 'hide_pass', nimi: 'x' } },
    }), undefined, 'fi');
    expect(h).toContain('&lt;img');
    expect(h).not.toContain('<img src=x');
  });
});

describe('(7) _vpKausiNaytto — escape (XSS)', () => {
  /* Helper KORVASI _jsvEsc:n viidessä näyttökohdassa, eikä sen tulosta escapata enää erikseen
     → escape on nyt helperin vastuulla. Ilman tätä testiä `if (!m) return s;` jäi vihreäksi. */
  const XSS = '<img src=x onerror=alert(1)>';
  const naytto = new Function('_jsvEsc', 'vpT',
    'return ' + funktio('function _vpKausiNaytto(k) {'),
  )((s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), (t) => t);

  it('suoraan helperistä: tuntematon arvo escapataan', () => {
    const ulos = naytto(XSS);
    expect(ulos).toContain('&lt;img');
    expect(ulos).not.toContain('<img src=x');
  });

  it('näyttökohdasta (tilarivi): escapattu', () => {
    const h = render(pelaaja({
      _idpTavoite: { status: 'aktiivinen', fokus: { alue: 'hide_pass', nimi: 'x' }, aikaraami: { kausi: XSS } },
    }), undefined, 'fi');
    expect(h).toContain('&lt;img');
    expect(h, 'escapoimaton <img päätyi tilariville').not.toContain('<img src=x');
  });

  it('tunnistettu muoto ei voi sisältää markkupia (regex lukitsee vuoden)', () => {
    expect(naytto('syksy 2026')).toBe('syksy 2026');
    expect(naytto('syksy <b>2026</b>')).toContain('&lt;b&gt;');   // ei täsmää → escapataan
  });
});

describe('(8) PDC:n P2-signature + Aloitus-hero — RENDERÖITY arvo', () => {
  /* Nämä kaksi riviä ovat isojen funktioiden sisällä (_renderMDTProfiili · Aloitus-hero), joten
     koko funktiota ei renderöidä: rivin LAUSEKE evaluoidaan lähteestä aidoilla resolvereilla.
     Näin mutaatio (raaka jfNimi / fokus.nimi takaisin) punertaa — greppi ei sitä takaisi. */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function lauseke(hakusana, poimi, ymparisto) {
    const rivi = VP.split('\n').find((l) => l.includes(hakusana));
    expect(rivi, 'riviä ei löydy: ' + hakusana).toBeTruthy();
    const m = poimi.exec(rivi);
    expect(m, 'lausekkeen muoto muuttui — päivitä vartija').toBeTruthy();
    const perus = {
      _jsvEsc: esc,
      vpT: (t) => (ymparisto.kieli === 'sv' ? (SV[t] != null ? SV[t] : t) : t),
      tmNykyinenKieli: () => ymparisto.kieli,
      TM_TT_SV: (TTSV.TM_TT_SV || TTSV),
      tmTaksonomiaByAvain: TAKS.tmTaksonomiaByAvain,
      tmMittaLahdeNimi: () => '', tmKategoriaNimi: () => '',
      window: { TM_FYYSTEEMAT_LIB: FYYS },
    };
    const kaikki = Object.assign(perus, ymparisto.arvot || {});
    const nimet = Object.keys(kaikki);
    // eslint-disable-next-line no-new-func
    return new Function(...nimet, HELPERIT.map(funktio).join('\n') + '\nreturn (' + m[1] + ');')(
      ...nimet.map((k) => kaikki[k]),
    );
  }

  const JF = { konsepti_nimi: 'SYÖTTÄMINEN', konsepti_avain: 'y_h2', domeeni: 'teknis_taktinen' };

  /* Signature: _sigNimi-HAARA ja näyttölauseke puretaan MOLEMMAT lähteestä ja ajetaan yhdessä.
     Jos testi injektoisi _sigNimi:n itse, se ei näkisi haaraa — ja juuri haara petti (K4). */
  function signature(p, kieli) {
    const rivit = VP.split('\n');
    const i = rivit.findIndex((l) => l.includes('var _sigNimi = (p.jaksofokus && p.jaksofokus.konsepti_nimi)'));
    expect(i, '_sigNimi-haaraa ei löydy').toBeGreaterThan(-1);
    const haara = rivit.slice(i, i + 3).join('\n');
    const naytto = rivit.find((l) => l.includes("vpT('Nykyfokus')"));
    const m = /(_jsvEsc\(_vpOtsikkoNaytto\([^)]*\)\))/.exec(naytto);
    expect(m, 'näyttölausekkeen muoto muuttui').toBeTruthy();
    const ymp = {
      _jsvEsc: esc,
      vpT: (t) => (kieli === 'sv' ? (SV[t] != null ? SV[t] : t) : t),
      tmNykyinenKieli: () => kieli,
      TM_TT_SV: (TTSV.TM_TT_SV || TTSV),
      tmTaksonomiaByAvain: TAKS.tmTaksonomiaByAvain,
      tmMittaLahdeNimi: () => '', tmKategoriaNimi: () => '',
      window: { TM_FYYSTEEMAT_LIB: FYYS },
      p: p,
    };
    const nimet = Object.keys(ymp);
    // eslint-disable-next-line no-new-func
    return new Function(...nimet, HELPERIT.map(funktio).join('\n') + '\n' + haara + '\nreturn (' + m[1] + ');')(
      ...nimet.map((k) => ymp[k]),
    );
  }

  it('K1 · signature sv → "Passningsspel" (ei SYÖTTÄMINEN)', () => {
    expect(signature({ jaksofokus: JF }, 'sv')).toBe('Passningsspel');
  });

  it('K1 · signature fi → "Syöttäminen" (isot kirjaimet siistitty)', () => {
    expect(signature({ jaksofokus: JF }, 'fi')).toBe('Syöttäminen');
  });

  /* K4-regressio: pelaajalla on kausitavoitteen fokus mutta EI jaksofokusta (yleinen tila —
     P2:n päätösrivi näyttää silloin "Ei jaksofokusta"). jfNimi oli tosi mutta näytettävä nimi
     tyhjä → "Nykyfokus ." tyhjällä lihavoinnilla. */
  it('K4 · ei jaksofokusta, idp_fokus on → fallback, EI tyhjää lihavointia', () => {
    const p = { jaksofokus: null, idp_fokus: { nimi: 'Syötön piilotus', alue: 'hide_pass' } };
    expect(signature(p, 'fi')).toBe('Syötön piilotus');
    expect(signature(p, 'sv')).toBe('Dölja passningen');
    expect(signature(p, 'fi'), 'tyhjä nimi → "Nykyfokus ."').not.toBe('');
    expect(signature(p, 'sv')).not.toBe('');
  });

  it('K4 · kumpikaan puuttuu → tyhjä (rivi ei renderöidy, jfNimi on falsy)', () => {
    expect(signature({ jaksofokus: null, idp_fokus: null }, 'fi')).toBe('');
  });

  it('K3 · Aloitus-hero sv → "Dölja passningen"', () => {
    const ulos = lauseke('<h3 class="vpal-h3">', /(_jsvEsc\(_vpFokusNimiNaytto\(fokus\) \|\| '—'\))/,
      { kieli: 'sv', arvot: { fokus: { alue: 'hide_pass', nimi: 'Syötön piilotus' } } });
    expect(ulos).toBe('Dölja passningen');
  });

  it('K3 · Aloitus-hero fi → tallennettu nimi, tyhjä → —', () => {
    expect(lauseke('<h3 class="vpal-h3">', /(_jsvEsc\(_vpFokusNimiNaytto\(fokus\) \|\| '—'\))/,
      { kieli: 'fi', arvot: { fokus: { alue: 'hide_pass', nimi: 'Syötön piilotus' } } })).toBe('Syötön piilotus');
    expect(lauseke('<h3 class="vpal-h3">', /(_jsvEsc\(_vpFokusNimiNaytto\(fokus\) \|\| '—'\))/,
      { kieli: 'fi', arvot: { fokus: null } })).toBe('—');
  });
});

describe('(6) Isot kirjaimet — vain kokonaan isoilla kirjoitetut', () => {
  const sisalto2 = (nimi, kieli) => sisallot(render(pelaaja({
    jaksofokus: { konsepti_nimi: nimi, konsepti_avain: 'ei_sidecarissa', domeeni: 'teknis_taktinen', alkoi: iso(Date.now()), kesto_vk: 4 },
  }), undefined, kieli))[1];

  it('SYÖTTÄMINEN → Syöttäminen', () => expect(sisalto2('SYÖTTÄMINEN', 'fi')).toBe('Syöttäminen'));
  it('1v1-haasteet ennallaan (sekakirjaimet)', () => expect(sisalto2('1v1-haasteet', 'fi')).toBe('1v1-haasteet'));
  it('ADAR-lukeminen ennallaan (ei kokonaan isoilla)', () => expect(sisalto2('ADAR-lukeminen', 'fi')).toBe('ADAR-lukeminen'));
  it('sv-kartan PASSNINGSSPEL → Passningsspel', () => {
    expect(sisallot(render(pelaaja(), undefined, 'sv'))[1]).toBe('Passningsspel');
  });
  it('data ennallaan: muunnos on vain näyttöä', () => {
    const p = pelaaja();
    render(p, undefined, 'fi');
    expect(p.jaksofokus.konsepti_nimi, 'render mutatoi dataa').toBe('SYÖTTÄMINEN');
  });
});
