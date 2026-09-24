/**
 * PDC — 4. read-only-vuoto + duplikaatti-id:t. Vartija.
 *
 * LIVELÖYDÖS (Topias, 22.9., tuotanto — ei #614:n regressio; id:t olivat samat jo ennen sitä):
 *
 * 1) DUPLIKAATTI-ID:T. PDC (`ws-raportointi`) jää DOM:iin `.ws-view{display:none}` -tilaan, joten kun
 *    cockpit (`#_jspModal`) avataan sen päälle, samat id:t ovat DOM:ssa KAHDESTI — ja PDC:n kopio on
 *    ensin. `getElementById` palauttaa ensimmäisen osuman, joten cockpitin oma re-render osui PDC:hen:
 *      · `_vpKausitavoiteReRender` (~6108) päivitti PDC:n `_jspKausitavoite`-slotin → cockpitin
 *        kausitavoite jäi vanhaksi, ja else-haara rakensi PDC:n kontin uudelleen EDITORIOLETUKSELLA
 *        (eli raporttiin ilmestyi inline-editori),
 *      · `_accKausitavoite.classList.add('open')` (~6119) avasi PDC:n rivin (mitattu livenä),
 *      · `_jfOhjaa` (~8368) sama riski.
 *    Pahin tapaus: jos PDC:ssä on ERI pelaaja kuin cockpitissa, cockpitin re-render kirjoittaa toisen
 *    pelaajan tiedot PDC:hen.
 *
 * 2) PDC EI OLLUT READ-ONLY (4. vuoto). Kausitavoitteen body oli editoitava `_vpKausitavoiteHTML`:
 *    ＋ Kirjaa review · ✓ Saavutettu · ↗ Jatkuu · Muokkaa — ja Muokkaa-polku lukee GLOBAALIA
 *    `_vpArvPelaaja`-muuttujaa eikä `pid`:iä, joten se voi osua väärään pelaajaan.
 *
 * KORJAUS: raportin rivi-id:t saavat etuliitteen `_pdc`, ja raportin kausitavoite-body on read-only
 * yhteenveto + YKSI siirtymälinkki cockpittiin. Työpöydän id:t pysyvät ennallaan, jotta 6108/6114/6119/8368
 * osuvat oikein ilman muutoksia.
 *
 * DOM-tynkä, ei jsdom-riippuvuutta (repon konventio) — getElementById mallintaa selaimen käytöksen:
 * ensimmäinen osuma dokumenttijärjestyksessä voittaa.
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
  'function _ttSv(avain, kentta) {',
  /* PR B: kausitavoite-rivin alarivi ("Nyt X \u2192 tavoite Y \u00b7 arvioidaan pp.kk." + pelaajan omat sanat)
     on AITO lahteesta — tyhja tynka piilottaisi juuri sen sisallon jota nama portit mittaavat. */
  'function _vpKtArvoTeksti(arvo, yks) {', 'function _vpKtAlariviHTML(t, inline) {'];


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

/* Kausitavoitteen EDITORI korvataan tyngällä joka päästää läpi juuri ne kirjoittavat toiminnot
   joita raportissa ei saa olla. Näin read-only-väite mittaa kohdetta, ei sattumaa. */
const KT_EDITORI_TYNKA = '<button onclick="_vpKirjaaReview(\'x\')">＋ Kirjaa review</button>'
  + '<button onclick="_vpElinkaari(\'x\',\'saavutettu\')">✓ Saavutettu</button>'
  + '<button onclick="_vpJatkuuAvaa(\'x\')">↗ Jatkuu</button>'
  + '<button onclick="_vpTallennaTavoite(\'x\')">💾</button>'
  + '<button onclick="window._vpArvPelaaja._idpMuokkaus=true;_vpKausitavoiteReRender()">✎ Muokkaa</button>'
  + '<input type="text"><textarea></textarea><select></select>';

function render(p, opts, kieli) {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const vpT = (t) => t;
  /* Yhteenveto näyttää myös kausi-arvon (_vpKausiNaytto), joten helperit käännetään mukaan. */
  const yhteenveto = new Function('_jsvEsc', 'vpT', 'tmNykyinenKieli',
    _DATANIMI_HELPERIT.map(funktio).join('\n') + '\nreturn ' + funktio('function _vpTavoiteYhteenvetoHTML(p, opts) {')
  )(esc, vpT, () => kieli || 'fi');
  const ymp = {
    _jsvEsc: esc,
    vpT: vpT,
    window: { TM_JAKSOFOKUS: JF, _tmIBtn: () => '', TM_FYYSTEEMAT_LIB: _FYYS },
    _vpKausitavoiteHTML: () => KT_EDITORI_TYNKA,
    _vpTavoiteYhteenvetoHTML: yhteenveto,
    tmNykyinenKieli: () => kieli || 'fi',
    TM_TT_SV: (_TTSV.TM_TT_SV || _TTSV),
    tmTaksonomiaByAvain: _TAKS.tmTaksonomiaByAvain,
    tmMittaLahdeNimi: _TAKS.tmMittaLahdeNimi || (() => ''),
    tmKategoriaNimi: _TAKS.tmKategoriaNimi || (() => ''),
    _vpJfInlineHTML: () => '<div id="_jfInlineEditor">INLINE</div>',
    _vpTyopoytaJaksofokusHTML: () => '<div>RO-JF</div>',
    _vpJfEvidenssiHTML: () => '',
    _vpKehityskaariHTML: () => '',
    _vpMesoKaariHTML: () => '',
  };
  const nimet = Object.keys(ymp);
  const koodi = _DATANIMI_HELPERIT.map(funktio).join('\n') + '\n'
    + funktio('function _vpKehSuunnitelmaHTML(p, opts) {') + '\nreturn _vpKehSuunnitelmaHTML(_p, _opts);';
  // eslint-disable-next-line no-new-func
  return new Function(...nimet, '_p', '_opts', koodi)(...nimet.map((k) => ymp[k]), p, opts);
}

function pelaaja(id) {
  return {
    id: id || 'pid1',
    _idpTavoite: {
      status: 'aktiivinen', fokus: { nimi: 'Syötön piilotus' },
      aikaraami: { kausi: 'syksy 2026', kesto_vk: 12 }, arviot: [1, 2],
    },
    jaksofokus: {
      konsepti_nimi: 'Syöttäminen', konsepti_avain: 'syotto', domeeni: 'teknis_taktinen',
      alkoi: iso(Date.now() - 16 * PV), kesto_vk: 8,
    },
    jaksofokus_historia: [1, 2],
  };
}

const idt = (html) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);

describe('(1) Uniikit id:t — PDC ja cockpit samassa dokumentissa', () => {
  const pdc = render(pelaaja(), { editori: false });
  const desk = render(pelaaja(), undefined);

  it('EI VACUOUS: molemmat pinnat tuottavat id:itä', () => {
    expect(idt(pdc).length).toBeGreaterThan(2);
    expect(idt(desk).length).toBeGreaterThan(2);
  });

  it('yhdistetyssä dokumentissa ei yhtään duplikaatti-id:tä', () => {
    const kaikki = idt(pdc + desk);
    const dup = [...new Set(kaikki.filter((x, i) => kaikki.indexOf(x) !== i))];
    expect(dup, 'duplikaatti-id:t: ' + dup.join(', ')).toEqual([]);
  });

  it('raportin id:t ovat etuliitteellisiä, työpöydän ennallaan', () => {
    ['_pdc_accKausitavoite', '_pdc_accJaksofokus', '_pdc_accKaari'].forEach((i) => expect(pdc).toContain('id="' + i + '"'));
    ['_accKausitavoite', '_accJaksofokus', '_accKaari'].forEach((i) => {
      expect(desk).toContain('id="' + i + '"');
      expect(pdc, 'raportti käyttää yhä työpöydän id:tä ' + i).not.toContain('id="' + i + '"');
    });
  });
});

describe('(2) PDC on read-only', () => {
  const pdc = render(pelaaja(), { editori: false });
  const KIELLETYT = ['_vpKirjaaReview', '_vpElinkaari', '_vpJatkuuAvaa', '_vpTallennaTavoite',
    '_idpMuokkaus', '_jspKausitavoite', '<input', '<textarea', '<select'];

  it.each(KIELLETYT)('raportissa ei ole %s', (kielletty) => {
    expect(pdc).not.toContain(kielletty);
  });

  it('raportissa on siirtymä cockpittiin', () => {
    expect(pdc).toContain('_pdcSiirryCockpittiin(');
  });

  it('vain YKSI ohje: siirtymälinkki, ei "Muokkaa Kehitys-välilehdellä."', () => {
    expect(pdc).not.toContain('Muokkaa Kehitys-välilehdellä.');
    /* Label = SANKTIOITU avain (sv: "→ Utveckla planen · Utvecklingsarbetsytan"), jota Aloitus-kortti
       käyttää jo samaan siirtymään. Briefin ehdottamalle "→ Muokkaa kausitavoitetta" ei ole sv-riviä,
       ja resolvi-portti vaatii sellaisen jokaiselle vpT-avaimelle — omaa ruotsia ei kirjoiteta. */
    expect(pdc).toContain('→ Kehitä suunnitelmaa · Kehitys-työpöytä');
  });

  it('read-only-yhteenveto renderöityy (ei tyhjä body)', () => {
    expect(pdc).toContain('Suunta');
    expect(pdc).toContain('Syötön piilotus');
  });
});

describe('(3) Työpöytä ennallaan', () => {
  const desk = render(pelaaja(), undefined);

  it('editoitava body + _jspKausitavoite-slotti säilyvät', () => {
    expect(desk).toContain('id="_jspKausitavoite"');
    expect(desk).toContain('_vpKirjaaReview');
  });

  it('kutsupaikat 6108/6114/6119/8368 osoittavat ETULIITTEETTÖMIIN id:hin', () => {
    const rr = funktio('function _vpKausitavoiteReRender() {');
    expect(rr).toContain("getElementById('_jspKausitavoite')");
    expect(rr).toContain("getElementById('_accKausitavoite')");
    expect(VP).toContain("getElementById('_accJaksofokus')");
    // …eikä yksikään niistä hae raportin etuliitteellistä id:tä
    expect(VP).not.toContain("getElementById('_pdc_acc");
  });
});

describe('(4) Integraatio — getElementById osuu cockpitiin, ei raporttiin', () => {
  /* Mallintaa livetilanteen: PDC on DOM:ssa ENSIN (ws-raportointi jää display:none-tilaan),
     cockpit sen jälkeen. Selain palauttaa ensimmäisen osuman — ennen korjausta se oli PDC. */
  function dokumentti(...palat) {
    const html = palat.join('');
    return {
      getElementById(id) {
        const i = html.indexOf('id="' + id + '"');
        if (i < 0) return null;
        // mistä palasta osuma tuli?
        let raja = 0;
        for (let n = 0; n < palat.length; n++) {
          if (i < raja + palat[n].length) return { id: id, lahde: n };
          raja += palat[n].length;
        }
        return null;
      },
    };
  }

  const pdc = render(pelaaja('pdc-pelaaja'), { editori: false });
  const cockpit = render(pelaaja('cockpit-pelaaja'), undefined);
  const doc = dokumentti(pdc, cockpit);   // 0 = PDC, 1 = cockpit

  it('_jspKausitavoite löytyy VAIN cockpitista', () => {
    const el = doc.getElementById('_jspKausitavoite');
    expect(el, 'slottia ei löydy lainkaan').toBeTruthy();
    expect(el.lahde, 're-render osuisi raporttiin').toBe(1);
  });

  it('_accKausitavoite (rivin avaus) löytyy VAIN cockpitista', () => {
    expect(doc.getElementById('_accKausitavoite').lahde).toBe(1);
  });

  it('_accJaksofokus (_jfOhjaa) löytyy VAIN cockpitista', () => {
    expect(doc.getElementById('_accJaksofokus').lahde).toBe(1);
  });

  it('raportin omat rivit löytyvät yhä omilla id:llään', () => {
    expect(doc.getElementById('_pdc_accKausitavoite').lahde).toBe(0);
  });
});
