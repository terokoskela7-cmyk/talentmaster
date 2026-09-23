/**
 * KEHITYSSUUNNITELMA-HAITARI — OTSIKKOHIERARKIA (Oura-malli v2). Vartija.
 *
 * Kenttäpalaute: "otsikot hukkuvat". Vanha rivi näytti KATEGORIAN isona serifinä ("Kausitavoite"),
 * ja varsinainen sisältö ("Syötön piilotus") oli 10,5 px monona joka katkesi ellipsiin — jaksofokuksen
 * nimi (konsepti_nimi) ei näkynyt riviltä lainkaan.
 *
 * Korjaus kääntää hierarkian: sisältö = iso serif (22 px / 400), kategoria = pieni sans-nimi,
 * tila = DM Sans 600 isot kirjaimet, ja VÄRI NÄKYY VAIN PISTEESSÄ. Väriratkaisu on saavutettavuusvalinta:
 * vaalealla teemalla amber on bg2:ta vasten 3,6:1 ja ink3 4,3:1 → alle AA-rajan (4,5) pienessä tekstissä,
 * kun ink on 10,5:1. Lisäksi #613:n päätösrivi pysyy ainoana isona teal-elementtinä (P3:n periaate).
 *
 * Portti RENDERÖI funktion lähteestä purettuna (tynkäriippuvuudet) — CSS-luokkien nimet eivät riitä:
 * hierarkia, tilarivin sisältö ja kompakti historia näkyvät vain syntyvästä HTML:stä.
 *
 * Brief: Claude outputs/CODE_BRIEF_PDC_OTSIKKOHIERARKIA_OURA.md · malli: PDC_OTSIKKOHIERARKIA_mockup.html
 * sv (4 avainta) sanktioitu: Claude outputs/OTSIKKOHIERARKIA_SANKTIOITU_SV.md
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
const _TAKS = vaadi('../lib/tm_arviointi_taksonomia.js');
const _TTSV = vaadi('../lib/tm_teknistaktiset_sv.js');
const _FYYS = vaadi('../lib/tm_fyysteemat.js');

const _DATANIMI_HELPERIT = ['function _vpKausiNaytto(k) {', 'function _vpFokusNimiNaytto(fokus) {',
  'function _vpKonseptiNimiNaytto(jf) {', 'function _vpTilaNaytto(tila) {', 'function _vpOtsikkoNaytto(s) {',
  'function _vpTaksLang() {', 'function _taksNimi(o) {', 'function _taksVal(o, kentta) {',
  'function _taksAvainNimi(avain) {', 'function _ttSvKartta() {', 'function _ttSvPaalla() {',
  'function _ttSv(avain, kentta) {'];

const _I18N = vaadi('../lib/tm_vp_i18n.js');
const SV = (_I18N.TM_VP_I18N || _I18N).sv;

const PV = 86400000;

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

/** CSS-säännön runko lähteestä (ensimmäinen osuma). */
function saanto(valitsin) {
  const i = VP.indexOf(valitsin + ' {');
  expect(i, 'CSS-sääntö puuttuu: ' + valitsin).toBeGreaterThan(-1);
  return VP.slice(i, VP.indexOf('}', i) + 1);
}

/** Renderöi _vpKehSuunnitelmaHTML tyngillä. kieli='sv' käyttää AITOA sv-karttaa (fi-vuodon havaitseminen). */
function render(p, opts, kieli) {
  const ymp = {
    _jsvEsc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    vpT: (t) => (kieli === 'sv' ? (SV[t] != null ? SV[t] : t) : t),
    window: { TM_JAKSOFOKUS: JF, _tmIBtn: () => '<span class="ib">i</span>', TM_FYYSTEEMAT_LIB: _FYYS },
    _vpKausitavoiteHTML: () => '<div>KT-BODY</div>',
    tmNykyinenKieli: () => kieli || 'fi',
    TM_TT_SV: (_TTSV.TM_TT_SV || _TTSV),
    tmTaksonomiaByAvain: _TAKS.tmTaksonomiaByAvain,
    tmMittaLahdeNimi: _TAKS.tmMittaLahdeNimi || (() => ''),
    tmKategoriaNimi: _TAKS.tmKategoriaNimi || (() => ''),
    _vpJfInlineHTML: () => '<div id="_jfInlineEditor">INLINE</div>',
    _vpTyopoytaJaksofokusHTML: () => '<div>RO-JF</div>',
    _vpJfEvidenssiHTML: () => '<div>EVID</div>',
    _vpKehityskaariHTML: () => '',
    _vpMesoKaariHTML: () => '',
  };
  const nimet = Object.keys(ymp);
  const koodi = _DATANIMI_HELPERIT.map(funktio).join('\n') + '\n'
    + funktio('function _vpKehSuunnitelmaHTML(p, opts) {') + '\nreturn _vpKehSuunnitelmaHTML(_p, _opts);';
  // eslint-disable-next-line no-new-func
  return new Function(...nimet, '_p', '_opts', koodi)(...nimet.map((k) => ymp[k]), p, opts);
}

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Aktiivinen kausitavoite + aktiivinen jaksofokus (alkoi 16 pv sitten, kesto 8 vk → Viikko 3/8). */
function pAktiivinen() {
  return {
    id: 'pid1',
    _idpTavoite: {
      status: 'aktiivinen', fokus: { nimi: 'Syötön piilotus' },
      aikaraami: { kausi: 'syksy 2026' }, arviot: [1, 2, 3],
    },
    jaksofokus: {
      konsepti_nimi: 'Syöttäminen', konsepti_avain: 'syotto', domeeni: 'teknis_taktinen',
      alkoi: iso(Date.now() - 16 * PV), kesto_vk: 8,
    },
    jaksofokus_historia: [1, 2, 3, 4, 5, 6],
  };
}

describe('(1) Sisältö on otsikko — hierarkia käännetty', () => {
  const h = render(pAktiivinen());

  it('.acc-content sisältää kausitavoitteen fokuksen JA jaksofokuksen konsepti_nimen', () => {
    expect(h).toMatch(/class="acc-content">Syötön piilotus</);
    // Uutta: jaksofokuksen nimi ei näkynyt riviltä ennen lainkaan.
    expect(h, 'konsepti_nimi ei ole rivin sisältönä').toMatch(/class="acc-content">Syöttäminen</);
  });

  it('tilarivillä "Viikko 3/8", metassa "5 vk jäljellä" (olemassa olevasta datasta)', () => {
    expect(h).toContain('Viikko 3/8');
    expect(h).toContain('5 vk jäljellä');
  });

  /* Kausi-arvo on JO 'syksy 2026' (lib/tm_idp.js:301) → 'Kausi '-etuliite tuottaisi "KAUSI SYKSY 2026"
     ja sv:ssä "SÄSONG SYKSY 2026" (tupla + kielet sekaisin). Arvo näytetään sellaisenaan. */
  it('kausi näytetään sellaisenaan, ilman "Kausi "-etuliitettä', () => {
    expect(h).toContain('syksy 2026');
    expect(h).not.toContain('Kausi syksy');
    expect(funktio('function _vpKehSuunnitelmaHTML(p, opts) {')).not.toContain("vpT('Kausi ')");
  });

  it('.acc-name tulee ennen .acc-content:ia (kategoria pieni, sisältö iso)', () => {
    expect(h.indexOf('acc-name')).toBeLessThan(h.indexOf('acc-content'));
  });

  it('"TASO 1/2/3" ei ole enää riveillä, murupolku säilyy', () => {
    expect(h).not.toMatch(/TASO [123]/);
    expect(h).toContain('idp-breadcrumb');
  });

  it('id:t ennallaan (6104/6109/8294 avaavat rivit id:n perusteella)', () => {
    ['_accKausitavoite', '_accJaksofokus', '_accKaari'].forEach((id) => expect(h).toContain('id="' + id + '"'));
  });
});

describe('(2) Brändilukko — ei boldia serifissä', () => {
  /* Testi skannaa KAIKKI .acc-*-säännöt, ei vain .acc-content:ia: kovakoodattu lista jätti
     .acc-name{font-family:serif;font-weight:500} -mutaation vihreäksi. Sääntö: jos säännössä on
     Cormorant tai --font-serif, font-weight on oltava < 500 (tai puuttua — oletus on 400). */
  function accSaannot() {
    const out = [];
    const re = /(\.acc-[A-Za-z0-9_.\- ]*?)\s*\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(VP))) out.push({ valitsin: m[1].trim(), runko: m[2] });
    return out;
  }

  it('EI VACUOUS: .acc-sääntöjä löytyy ja niistä ainakin yksi on serif', () => {
    const s = accSaannot();
    expect(s.length, 'CSS-sääntöjä ei löytynyt → testi olisi tyhjä').toBeGreaterThan(8);
    expect(s.some((x) => /Cormorant|--font-serif/.test(x.runko))).toBe(true);
  });

  it('JOKAINEN serif-.acc-sääntö: font-weight < 500 tai puuttuu', () => {
    const rikkovat = accSaannot()
      .filter((x) => /Cormorant|--font-serif/.test(x.runko))
      .map((x) => {
        const m = /font-weight:\s*(\d+)/.exec(x.runko);
        return m && Number(m[1]) >= 500 ? x.valitsin + ' → font-weight: ' + m[1] : null;
      })
      .filter(Boolean);
    expect(rikkovat, 'Cormorantissa ei saa olla boldia (§5):\n' + rikkovat.join('\n')).toEqual([]);
  });

  it('osion otsikon inline-tyyli: font-weight 300, ei ≥ 500', () => {
    const f = funktio('function _vpKehSuunnitelmaHTML(p, opts) {');
    const otsikko = /font-size:26px;font-weight:(\d+)/.exec(f);
    expect(otsikko, 'osion otsikko ei ole 26px + font-weight').toBeTruthy();
    expect(Number(otsikko[1])).toBe(300);
    expect(Number(otsikko[1])).toBeLessThan(500);
  });

  it('osion otsikko on isompi kuin rivien serif (26 px > 22 px)', () => {
    expect(saanto('.acc-content')).toContain('font-size: 22px');
  });
});

describe('(2b) Escape — sisältö on käyttäjän vapaata tekstiä', () => {
  /* fokus.nimi ja konsepti_nimi ovat vapaata tekstiä → ne PITÄÄ escapata.
     Ilman tätä testiä `sisalto: ktFokus || ''` (esc pois) jäi vihreäksi. */
  const XSS = '<img src=x onerror=alert(1)>';

  it('kausitavoitteen fokus escapataan', () => {
    const h = render({
      id: 'x1',
      _idpTavoite: { status: 'aktiivinen', fokus: { nimi: XSS }, aikaraami: { kausi: 'syksy 2026' } },
      jaksofokus: null,
    });
    expect(h).toContain('&lt;img');
    expect(h, 'escapoimaton <img päätyi renderiin').not.toContain('<img src=x');
  });

  it('jaksofokuksen konsepti_nimi escapataan', () => {
    const h = render({
      id: 'x2',
      _idpTavoite: null,
      jaksofokus: { konsepti_nimi: XSS, konsepti_avain: 'k', domeeni: 'teknis_taktinen', alkoi: iso(Date.now() - 7 * PV), kesto_vk: 4 },
    });
    expect(h).toContain('&lt;img');
    expect(h).not.toContain('<img src=x');
  });
});

describe('(3) Värin ekonomia — väri vain pisteessä', () => {
  it('.acc-state (ja .w) eivät käytä tealia/amberia', () => {
    const s = saanto('.acc-state') + saanto('.acc-state .w');
    expect(s).not.toContain('--teal');
    expect(s).not.toContain('--amber');
  });

  it('teal ja amber esiintyvät .acc-dot-säännöissä', () => {
    expect(saanto('.acc-dot')).toContain('--teal');
    expect(saanto('.acc-dot.amb')).toContain('--amber');
  });
});

describe('(4) Umpeutunut-tila', () => {
  const h = render({
    id: 'p2',
    _idpTavoite: null,
    jaksofokus: {
      konsepti_nimi: 'Pelin avaaminen', konsepti_avain: 'avaus', domeeni: 'teknis_taktinen',
      alkoi: iso(Date.now() - 200 * PV), kesto_vk: 8,
    },
  });

  it('amber-piste + "Umpeutunut" + kesto, EI on-tilaa eikä Viikko-tekstiä', () => {
    expect(h).toContain('acc-dot amb');
    expect(h).toContain('Umpeutunut');
    expect(h).toContain('8 vk');
    expect(h, 'umpeutuneella ei saa olla Viikko n/k').not.toContain('Viikko');
    // jaksofokus-rivillä ei on-pistettä (class="acc-dot" ilman lisäluokkaa)
    const jfRivi = h.slice(h.indexOf('_accJaksofokus'), h.indexOf('_accKaari'));
    expect(jfRivi).not.toMatch(/class="acc-dot"/);
  });
});

describe('(4b) Ristiriitainen tila — fokus ilman statusta', () => {
  /* Legacy p.idp_fokus ilman idp_tila:a näytti "○ EI ASETETTU" ja heti alla fokuksen nimen.
     Tilaa ei tiedetä → tilarivi jätetään pois, ei arvata. */
  const h = render({ id: 'p9', _idpTavoite: null, idp_fokus: { nimi: 'Pelin avaaminen' }, jaksofokus: null });

  it('sisältö näkyy mutta tilariviä EI ole', () => {
    expect(h).toMatch(/class="acc-content">Pelin avaaminen</);
    const ktRivi = h.slice(h.indexOf('_accKausitavoite'), h.indexOf('_accJaksofokus'));
    expect(ktRivi, 'ristiriitainen "Ei asetettu" + fokus').not.toContain('Ei asetettu');
    expect(ktRivi).not.toContain('acc-state');
  });
});

describe('(5) Tyhjä tila säilyy', () => {
  const h = render({ id: 'p3', _idpTavoite: null, jaksofokus: null });

  it('ei .acc-content:ia, tila "Ei asetettu", rivi auki, CTA siirtymään', () => {
    expect(h).not.toContain('acc-content');
    expect((h.match(/Ei asetettu/g) || []).length).toBe(2);
    expect(h).toMatch(/acc-row open/);
    expect(h).toContain('_pdcSiirryCockpittiin');
  });

  it('"Ei asetettu" -tilarivillä ei kausi-lisää', () => {
    expect(h).not.toMatch(/Ei asetettu<\/span> ·/);
  });

  /* Tyhjä jaksofokus aukeaa MYÖS PDC:ssä (editori:false) — muuten CTA jää piiloon, vaikka
     kausitavoitteen tyhjä rivi aukeaa. Täysi jaksofokus pysyy PDC:ssä kiinni. */
  it('tyhjä jaksofokus on auki myös PDC:ssä, täysi ei', () => {
    const ro = render({ id: 'p10', _idpTavoite: null, jaksofokus: null }, { editori: false });
    expect(ro).toMatch(/acc-row open" id="_pdc_accJaksofokus"/);   // raportin id:t etuliitteellisiä
    expect(ro.slice(ro.indexOf('_accJaksofokus'), ro.indexOf('_accKaari'))).toContain('_pdcSiirryCockpittiin');

    const roTaysi = render(pAktiivinen(), { editori: false });
    expect(roTaysi, 'täysi jaksofokus ei saa aueta raportissa').not.toMatch(/acc-row open" id="_pdc_accJaksofokus"/);
  });

  it('saavutettu kausitavoite → acc-dot off (ei on-pistettä)', () => {
    const h2 = render({
      id: 'p11',
      _idpTavoite: { status: 'saavutettu', fokus: { nimi: 'Syötön piilotus' }, aikaraami: { kausi: 'kevät 2026' } },
      jaksofokus: null,
    });
    const ktRivi = h2.slice(h2.indexOf('_accKausitavoite'), h2.indexOf('_accJaksofokus'));
    expect(ktRivi).toContain('acc-dot off');
    expect(ktRivi).toContain('Saavutettu');
    expect(ktRivi).not.toMatch(/class="acc-dot"/);
  });
});

describe('(6) Termilukko — katselmus, ei "review"', () => {
  it('täysi historia → "3 katselmusta"; renderöidyssä HTML:ssä ei /review/i', () => {
    const h = render(pAktiivinen());
    expect(h).toContain('3 katselmusta');
    expect(h).not.toMatch(/review/i);
  });

  it('yksi katselmus → yksikkömuoto', () => {
    const p = pAktiivinen();
    p._idpTavoite.arviot = [1];
    expect(render(p)).toContain('1 katselmus');
  });

  it('tyhjä historia → "ei vielä historiaa" + uusi katselmoidaan-teksti bodyssa, ei /review/i', () => {
    const h = render({ id: 'p4', _idpTavoite: null, jaksofokus: null });
    expect(h).toContain('ei vielä historiaa');
    expect(h).toContain('Historia täyttyy kun tavoitteita katselmoidaan ja jaksoja suljetaan.');
    expect(h).not.toMatch(/review/i);
  });
});

describe('(6b) sv-render — domeenin nimi kääntyy (fi-vuoto)', () => {
  /* jfDom.nimi tulee libistä SUOMEKSI. Ilman vpT():tä sv-tilassa näkyi "⚽ Teknis-taktinen".
     Identiteetti-vpT ei paljasta tätä → tämä testi käyttää AITOA sv-karttaa.
     Sanktioidut avaimet olivat jo kartassa; uusia ei lisätty. */
  it('sv: "Teknisk-taktisk", ei fi-muotoa', () => {
    const sv = render(pAktiivinen(), undefined, 'sv');
    expect(SV['Teknis-taktinen'], 'sanktioitu sv-avain puuttuu kartasta').toBe('Teknisk-taktisk');
    expect(sv).toContain('Teknisk-taktisk');
    expect(sv, 'domeenin nimi vuotaa suomeksi sv-tilassa').not.toContain('Teknis-taktinen');
  });

  it('sv: tilarivi ja historia kääntyvät (sanktioidut avaimet)', () => {
    const sv = render(pAktiivinen(), undefined, 'sv');
    expect(sv).toContain(SV['Aktiivinen']);
    expect(sv).toContain(SV['katselmusta']);      // granskningar
    expect(sv).not.toMatch(/review/i);
  });

  it('sv: umpeutunut → Utgången (ei fi-muotoa)', () => {
    const sv = render({
      id: 'sv2', _idpTavoite: null,
      jaksofokus: { konsepti_nimi: 'Pelin avaaminen', konsepti_avain: 'a', domeeni: 'teknis_taktinen', alkoi: iso(Date.now() - 200 * PV), kesto_vk: 8 },
    }, undefined, 'sv');
    expect(sv).toContain('Utgången');
    expect(sv).not.toContain('Umpeutunut');
  });
});

describe('(7) tmJfViikko — yksikkötestit', () => {
  const jf = (alkoiMs, kesto) => ({ konsepti_avain: 'x', alkoi: iso(alkoiMs), kesto_vk: kesto });

  it('päivä 0 → 1/k', () => {
    const r = JF.tmJfViikko(jf(Date.now(), 8));
    expect(r.n).toBe(1); expect(r.k).toBe(8); expect(r.jaljella).toBe(7);
  });

  it('päivä 7 → 2/k', () => {
    expect(JF.tmJfViikko(jf(Date.now() - 7 * PV, 8)).n).toBe(2);
  });

  it('yli keston → k/k ja jaljella 0', () => {
    const r = JF.tmJfViikko(jf(Date.now() - 200 * PV, 8));
    expect(r.n).toBe(8); expect(r.jaljella).toBe(0);
  });

  it('ei alkoi:ta → null (ei arvausta)', () => {
    expect(JF.tmJfViikko({ konsepti_avain: 'x', kesto_vk: 8 })).toBeNull();
  });

  /* Falsy alkoi (0 = epoch) on OMA haara: undefined nappaisi myös isNaN-vartija, mutta 0 on
     kelvollinen Date → ilman !jf.alkoi -vartijaa palautuisi 1/8 "tietona" vuodelta 1970.
     Sama sääntö kuin tmJfUmpeutunut: ei tietoa → ei arvausta. (Mutaatiotodiste: vartijan poisto punertaa tämän.) */
  it('falsy alkoi (0) → null, ei epoch-arvausta', () => {
    expect(JF.tmJfViikko({ konsepti_avain: 'x', alkoi: 0, kesto_vk: 8 })).toBeNull();
    expect(JF.tmJfViikko({ konsepti_avain: 'x', alkoi: '', kesto_vk: 8 })).toBeNull();
  });

  it('virheellinen päivämäärä → null', () => {
    expect(JF.tmJfViikko({ konsepti_avain: 'x', alkoi: 'ei-pvm', kesto_vk: 8 })).toBeNull();
  });

  it('kesto puuttuu → oletus 4', () => {
    expect(JF.tmJfViikko({ konsepti_avain: 'x', alkoi: iso(Date.now()) }).k).toBe(4);
  });
});

describe('(8) PDC read-only', () => {
  const ro = render(pAktiivinen(), { editori: false });

  it('sama otsikkorakenne ilman inline-editoria', () => {
    expect(ro).toContain('acc-name');
    expect(ro).toMatch(/class="acc-content">Syöttäminen</);
    expect(ro, 'raporttiin ei kuulu inline-editoria').not.toContain('_jfInlineEditor');
  });

  it('id:t ovat uniikkeja', () => {
    /* Raportin id:t ovat etuliitteellisiä (_pdc), jotta ne eivät törmää cockpitin id:hin
       kun molemmat ovat DOM:ssa. Ks. tests/pdc_readonly_id_uniikit.test.js. */
    ['_pdc_accKausitavoite', '_pdc_accJaksofokus', '_pdc_accKaari'].forEach((id) => {
      expect((ro.match(new RegExp('id="' + id + '"', 'g')) || []).length).toBe(1);
    });
  });
});

describe('(9) Invariantit joita aiemmat testit vartioivat', () => {
  it('_accKaari on "Jaksohistoria" (ei "Kehityskaari") ja kompakti', () => {
    const f = funktio('function _vpKehSuunnitelmaHTML(p, opts) {');
    expect(f).toContain("_accKaari'");   // id-etuliite (idp) vain raportissa
    expect(f).toContain("nimi: vpT('Jaksohistoria')");
    expect(f).toContain('kompakti: true');
    expect(f).not.toContain("'Kehityskaari'");
  });

  /* RENDERÖITY todiste: kompakti-luokan poisto lähteestä jäi pelkällä 'kompakti: true' -greppauksella
     huomaamatta, koska row() olisi voinut jättää luokan pois. */
  it('_accKaari-rivillä on luokka compact renderissä', () => {
    const h = render(pAktiivinen());
    expect(h).toMatch(/acc-row compact" id="_accKaari"/);
  });

  it('_accJaksofokus: body = jfBody + jfEvid, avoin kattaa _inlineEditori:n', () => {
    const f = funktio('function _vpKehSuunnitelmaHTML(p, opts) {');
    expect(f).toContain('body: jfBody + jfEvid');
    // Invariantti säilyy laajennettuna: tyhjä rivi aukeaa myös raportissa (|| !jfNimi).
    expect(f).toMatch(/avoin: _inlineEditori(\s*\|\|\s*!jfNimi)?,/);
    expect(f).toContain('const _inlineEditori = !opts || opts.editori !== false;');
  });

  it('käyttämättömät CSS-luokat poistettu (acc-main/eyebrow/title/sum/chip)', () => {
    ['.acc-main', '.acc-eyebrow', '.acc-title', '.acc-sum', '.acc-chip'].forEach((k) => {
      expect(VP, k + ' on yhä CSS:ssä').not.toContain(k + ' {');
    });
  });
});
