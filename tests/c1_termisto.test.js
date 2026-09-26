/**
 * TalentMaster™ — C1 TERMISTÖSIIVOUS. Vartija.
 *
 * Termilukko kattaa KUUSI näkymää: Pelaajat-lista + cockpitin viisi välilehteä
 * (Aloitus/raportti · Mittaus · Arviointi · Kehitys · Viikko). Kattavuus luetaan NAKYMAT-listasta
 * alla — tämä kommentti ei ole lupaus vaan kuvaus siitä. (Aiemmin kommentti väitti Kehityksen
 * katetuksi vaikka NAKYMAT ei sisältänyt sitä, ja välilehden todistelohko jäi siksi siivoamatta.)
 * Lukko kohdistuu NÄKYVÄÄN
 * tekstiin — tagit ja attribuutit puretaan ennen vertailua, koska id:t, luokat ja
 * onclick-kohteet ovat koodia eivätkä käyttöliittymää.
 *
 * Lukko (3) näkee vain vpT-avaimet. Nimi joka tulee jaetusta libistä ei ole avain, joten
 * se vuoti lukon ohi — ryhmä (5) on siksi RENDERÖITY todiste, ei grep.
 *
 * Rajaus: C1 kattaa nämä kuusi näkymää. Samat termit esiintyvät muualla VP:ssä (joukkuepulssi,
 * syvänäkymä, tooltipit, valmentajanäkymä) — ne ovat oma työnsä, eikä tämä lukko väitä muuta.
 *
 * Brief: `Claude outputs/CODE_BRIEF_C1_TERMISTO.md` · inventaario: `INVENTAARIO_TERMISTO_KOHINA.md`
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const vaadi = createRequire(import.meta.url);
const I18N = vaadi('../lib/tm_vp_i18n.js');
const SV = (I18N.TM_VP_I18N || I18N).sv;

function pura(tunniste) {
  const i = VP.indexOf(tunniste);
  expect(i, tunniste + ' puuttuu VP:stä').toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) {
    if (VP[k] === '{') syv++;
    else if (VP[k] === '}') { syv--; if (syv === 0) return VP.slice(i, k + 1); }
  }
  throw new Error('sulkuja ei saatu tasan: ' + tunniste);
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
/** Näkyvä teksti: tagit ja attribuutit pois. */
function nakyva(h) {
  return String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

/** PHV-helperit ajossa (pura + suorita, ei tynkää). */
function phvApi(kieli) {
  const store = {
    vpT: (s) => (kieli === 'sv' ? (SV[s] != null ? SV[s] : s) : s),
    _jsvEsc: esc,
  };
  const ymp = new Proxy(store, {
    has: (t, k) => (k in t) || !(k in globalThis),
    get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : () => '')),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const runko = [
    'function _vpPhvTila(koodi) {',
    'function _vpPhvBadgeHTML(koodi, selite) {',
    'function _vpPhvPelaajalleHTML(koodi) {',
  ].map(pura).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('__ymp', 'with(__ymp){' + runko
    + '\nreturn {tila:_vpPhvTila, badge:_vpPhvBadgeHTML, pelaajalle:_vpPhvPelaajalleHTML};}')(ymp);
}

/* ══ (1) PHV-BADGE — VALMENTAJA ═════════════════════════════════════════════ */
describe('(1) PHV-badge korvaa paljaan koodin (valmentaja/admin)', () => {
  const api = phvApi();

  it('kolme koodiperhettä → badge + selite', () => {
    expect(api.tila('VA')).toMatchObject({ badge: 'Esi-PHV', selite: 'ennen kasvupyrähdystä', amber: false });
    expect(api.tila('PRE')).toMatchObject({ badge: 'Esi-PHV' });
    expect(api.tila('LAH')).toMatchObject({ badge: 'Esi-PHV' });
    expect(api.tila('PH')).toMatchObject({ badge: 'PHV-vaihe', selite: 'kasvupyrähdys käynnissä', amber: true });
    expect(api.tila('AN')).toMatchObject({ badge: 'Jälki-PHV', selite: 'kasvupyrähdys ohi', amber: false });
    expect(api.tila('POST')).toMatchObject({ badge: 'Jälki-PHV' });
  });

  it('tuntematon / puuttuva koodi → ei arvausta', () => {
    expect(api.tila(null)).toBeNull();
    expect(api.tila('XYZ')).toBeNull();
    expect(api.badge(null)).toContain('—');
  });

  it('badge ei näytä raakaa koodia', () => {
    ['VA', 'PRE', 'LAH', 'PH', 'POST', 'AN'].forEach((k) => {
      const h = api.badge(k);
      expect(nakyva(h), 'raaka koodi näkyy badgessa: ' + k).not.toMatch(new RegExp('(^| )' + k + '( |$)'));
    });
  });

  it('amber VAIN PH-tilassa (herkkä ikkuna)', () => {
    expect(api.badge('PH')).toContain('var(--amber)');
    ['VA', 'PRE', 'AN', 'POST'].forEach((k) => {
      expect(api.badge(k), k + ': amber vuoti neutraaliin tilaan').not.toContain('var(--amber)');
    });
  });

  it('selite voidaan jättää pois ahtaaseen soluun', () => {
    expect(api.badge('AN', false)).not.toContain('kasvupyrähdys ohi');
    expect(api.badge('AN', false)).toContain('Jälki-PHV');
    expect(api.badge('AN')).toContain('kasvupyrähdys ohi');
  });
});

/* ══ (2) PHV PELAAJALLE (§7.22) ═════════════════════════════════════════════ */
describe('(2) Pelaaja/vanhempi: vain kasvuvaihe sanana', () => {
  const api = phvApi();

  it('ei koodia eikä badgea', () => {
    ['VA', 'PH', 'AN'].forEach((k) => {
      const h = api.pelaajalle(k);
      expect(h, 'badge vuoti pelaajalle: ' + k).not.toContain('phv-badge');
      expect(h).not.toContain('Esi-PHV');
      expect(h).not.toContain('PHV-vaihe');
      expect(h).not.toContain('Jälki-PHV');
      expect(nakyva(h), 'raaka koodi vuoti pelaajalle: ' + k).not.toMatch(new RegExp('(^| )' + k + '( |$)'));
    });
  });

  it('kertoo kasvuvaiheen sanana', () => {
    expect(api.pelaajalle('PH')).toContain('Kasvuvaihe:');
    expect(api.pelaajalle('PH')).toContain('kasvupyrähdys käynnissä');
    expect(api.pelaajalle('AN')).toContain('kasvupyrähdys ohi');
  });

  it('ei mittaustietoa → ei riviä (ei arvausta)', () => {
    expect(api.pelaajalle(null)).toBe('');
  });
});

/* ══ (3) TERMILUKKO — KUUSI NÄKYMÄÄ ═════════════════════════════════════════ */
describe('(3) Termilukko: sisäiset koodit eivät näy kuudessa näkymässä', () => {
  /* Lukko luetaan LÄHTEEN vpT-avaimista näiden näkymien funktioissa: se on sama teksti jonka
     käyttäjä näkee, ja kattaa myös haarat joita yksi render ei osu. */
  /* Näkymä = sen render-funktio JA ne helperit jotka se piirtää. Pelkkä "päärunko" jätti aluksi
     katveeseen kolme kohtaa (raportin kaari-lohko, cockpitin koonti, Arvioinnin pelihavaintolohko),
     jotka mutaatiomatriisi paljasti — helperit kuuluvat näkymään yhtä lailla. */
  const NAKYMAT = {
    'Pelaajat-lista': ['function _tekninenSoluVP(p) {'],
    'Aloitus/raportti': ['function _vpIdpNarratiiviHTML(p) {', 'function _vpAloitusKaariHTML(p, ika) {',
      'function _vpAloitusJaksofokusHTML(p) {', 'function _vpAloitusSiruHTML(p) {'],
    'Mittaus': ['function _vpMittausLinssiHTML(p, ika, sisalla) {', 'function _vpMittausSynthHTML(p, ika, d1, d2, tsi) {',
      'function _vpMittausKypsyysHTML(p) {', 'function _vpMittausTiivistysHTML(p, ika, d1, d2, tsi) {',
      'function _vpKehonValmiusHTML(p) {', 'function _vpMittausNextStepHTML(p) {',
      'window._avaaPerPelaajaPikakatsaus = function(idx, joukkueNimi) {'],
    'Arviointi': ['function _vpArviointiHTML(p) {', 'function _vpArvAdarKoostumusHTML(p, ika) {'],
    'Kehitys': ['function _vpJfTilanneHTML(p) {', 'function _vpJfEvidenssiHTML(p) {'],
    'Viikko': ['function _vpViikkoHTML(p) {'],
  };

  const KIELLETYT = [
    ['kaari', /\bkaari|KAARI/],
    ['silta', /\bsilta\b|SILTA/i],
    ['TKI', /\bTKI\b/],
    ['TSI', /\bTSI\b/],
    ['ADAR', /\bADAR\b/],
    ['MORFOSYKLI', /morfosykl/i],
    ['sRPE', /sRPE|session-RPE/i],
    ['ACWR', /\bACWR\b/],
    ['KYPSYYSLINSSI', /kypsyyslinss/i],
    ['TM ANALYTICS', /TM ANALYTICS/],
    ['KONSEPTIN OSAT', /konseptin osat/i],
    ['paljas §', /§\s*\d/],
    /* 1A: ulottuvuuskoodi SAA olla nimen vieressä ("D2 Tekninen", "D4 peliäly") ja skaalana
       ("D1–D5", 4A). Sallitut muodot poistetaan ENSIN ja vasta jäännöksestä etsitään paljas koodi —
       sisäkkäiset lookaheadit olivat tässä hauraita (en-dash merkkiluokassa). */
    ['paljas D-koodi', (s) => /\bD[1-5]\b/.test(
      String(s).replace(/\bD[1-5]\s*[–—-]\s*D[1-5]\b/g, ' ')
        .replace(/\bD[1-5](\/D[1-5])?\s+[A-ZÅÄÖa-zåäö][\wåäöÅÄÖ-]*/g, ' ')
        /* 1A sallii tunnisteen nimen VIERESSÄ — myös nimi ensin ("Fyysinen · D1"), jonka jaettu
           lib (tm_jaksofokus dim) tuottaa. Paljas koodi ilman nimeä ("D2-taso") punertaa yhä. */
        .replace(/(?!D[1-5]\b)[A-ZÅÄÖ][\wåäöÅÄÖ-]*\s*·\s*D[1-5](\/D[1-5])?\b/g, ' '))],
    ['PHV-koodi', /(^|[^A-Za-zÅÄÖåäö])(AN|VA|PH)([^A-Za-zÅÄÖåäö-]|$)/],
  ];

  /** Näkymän vpT-avaimet (näkyvä teksti). */
  function avaimet(sigit) {
    const out = [];
    sigit.forEach((sig) => {
      const r = pura(sig);
      const re = /vpT\('((?:[^'\\]|\\.)*)'\)/g;
      let m;
      while ((m = re.exec(r))) out.push(m[1].replace(/\\'/g, "'"));
    });
    return out;
  }

  Object.keys(NAKYMAT).forEach((nimi) => {
    describe(nimi, () => {
      const teksti = avaimet(NAKYMAT[nimi]);

      it('EI VACUOUS: näkymästä löytyy käyttäjätekstiä', () => {
        expect(teksti.length, nimi + ': yhtään vpT-avainta ei löytynyt').toBeGreaterThan(2);
      });

      it.each(KIELLETYT)('%s ei esiinny', (_kuvaus, sääntö) => {
        const osuu = (s) => (typeof sääntö === 'function' ? sääntö(s) : sääntö.test(s));
        const osumat = teksti.filter(osuu);
        expect(osumat, nimi + ' — sisäinen termi näkyy: ' + osumat.join(' | ')).toEqual([]);
      });
    });
  });

  it('SALLITTU: ulottuvuustunniste nimen vieressä ei laukaise lukkoa (1A)', () => {
    const paljasS = KIELLETYT.find(([k]) => k === 'paljas D-koodi')[1];
    const paljas = { test: (s) => paljasS(s) };
    expect(paljas.test('D2 Tekninen'), 'lukko osui sallittuun "D2 Tekninen"').toBe(false);
    expect(paljas.test('D4 Peliäly · pelihavainnosta · 1–3')).toBe(false);
    expect(paljas.test('D4 peliäly ja pelipaikkaosaaminen'), 'nimi pienellä on yhä nimi').toBe(false);
    expect(paljas.test('Palloliitto-kehys · D1–D5 · 57 kohdetta'), 'skaala D1–D5 on sallittu (4A)').toBe(false);
    expect(paljas.test('🏃 Fyysinen · D1'), 'nimi ensin, tunniste perässä on sallittu (1A)').toBe(false);
    expect(paljas.test('⚽ Teknis-taktinen · D2/D4')).toBe(false);
    expect(paljas.test('D2-taso'), 'lukko ei osunut paljaaseen koodiin').toBe(true);
    expect(paljas.test('Kohdennus: D2/D4'), 'koodi ilman nimeä vieressä on yhä paljas').toBe(true);
    expect(paljas.test('D2 · D4'), 'koodi ei kelpaa toisen koodin "nimeksi"').toBe(true);
  });

  it('SALLITTU: Eerikkilä, Palloliitto, 5D ja PHV badge-labelissa jäävät', () => {
    const sallitut = ['Eerikkilä-taso · keskiarvo(30m · CMJ · MAS)', 'Palloliitto-kehys', '5D-profiili',
      'Esi-PHV', 'PHV-vaihe', 'Jälki-PHV', 'jakson fokus'];
    const kielletyt = KIELLETYT.filter(([k]) => k !== 'PHV-koodi');
    sallitut.forEach((s) => {
      kielletyt.forEach(([kuvaus, sääntö]) => {
        const osuu = (typeof sääntö === 'function') ? sääntö(s) : sääntö.test(s);
        expect(osuu, 'lukko osui sallittuun: ' + s + ' (' + kuvaus + ')').toBe(false);
      });
    });
  });
});

/* ══ (4) POISTETUT KOODIT EIVÄT OLE PALANNEET ═══════════════════════════════ */
describe('(4) Paljas koodi ei ole palannut renderöintiin', () => {
  it('Pelaajat-listan PHV-sarake käyttää badgea', () => {
    expect(VP).toContain('${_vpPhvBadgeHTML(p.phv_tila, false)}');
    expect(VP, 'paljas phv_tila jäi listaan').not.toContain("${p.phv_tila||'—'}");
  });

  it('dimpop-taulukon PHV-solu käyttää badgea', () => {
    expect(VP).toContain("+ '<td class=\"dimpop-pcol\" style=\"padding:7px 8px\">' + _vpPhvBadgeHTML(p.phv_tila, false) + '</td>'");
    expect(VP, 'paljas koodi jäi soluun').not.toContain("_jsvEsc(p.phv_tila || '—')");
  });

  it('orpo amber-muuttuja poistettu (amber elää badgessa)', () => {
    expect(VP).not.toContain("const phvColor = p.phv_tila === 'PH'");
  });
});

/* ══ (5) 5A — KONSEPTINIMEN i18n-REITITYS ═══════════════════════════════════ */
describe('(5) Konseptinimi kulkee i18n-resolverin kautta (kaikki neljä osa-aluetta)', () => {
  const f = pura('function _vpKonseptiNimiNaytto(jf) {');

  it('fyysinen ja teknis-taktinen ennallaan', () => {
    expect(f).toContain("jf.domeeni === 'fyysinen'");
    expect(f).toContain('_ttSv(avain,');
  });

  it('henkinen ja sosiaalinen reititetty (aiemmin suoraan datasta)', () => {
    expect(f).toContain("jf.domeeni === 'psyykkinen' || jf.domeeni === 'sosiaalinen'");
    expect(f).toContain('tmJfKonseptit(jf.domeeni)');
    expect(f).toContain("_taksVal(kl[j], 'nimi')");
  });

  it('fi-tilassa ei käännetä (ei turhaa lookupia)', () => {
    expect(f).toContain("_vpTaksLang() !== 'fi'");
  });

  it('tuntematon avain → tallennettu nimi (ei tyhjää)', () => {
    expect(f).toContain("return jf.konsepti_nimi || '';");
  });
});

/* ══ (5) SISÄINEN TUNNUS JAETUSTA LIBISTÄ ═══════════════════════════════════
   Termilukko (3) lukee vain vpT-avaimia, joten se EI näe nimeä joka tulee jaetusta
   libistä (tm_kehityskaari NIMI: tki → "TKI"). Sama vuoto oli kahdessa paikassa:
   Kehityksen todistelohko ja Aloituksen fokus-siru. Todiste on siksi RENDERÖITY,
   ei grep: funktiot ajetaan ja näkyvästä tekstistä etsitään paljas tunnus. */
describe('(5) jaetun libin sisäinen tunnus ei vuoda näkyviin', () => {
  const KAARI = vaadi('../lib/tm_kehityskaari.js');
  const K = KAARI.TM_KEHITYSKAARI || KAARI;

  it('LÄHTÖKOHTA: jaettu lib palauttaa yhä sisäisen tunnuksen (muut näkymät nojaavat siihen)', () => {
    expect(K.tmKaariNimi('tki'), 'jos lib muuttui, tämä ryhmä on päivitettävä').toBe('TKI');
  });

  /** Ajaa molemmat renderöijät samalla sarjalla; _vpKohdennettuSarja tyngätään libin nimellä. */
  function renderoi(key) {
    const sarja = [{ pvm: '2026-01-10', arvo: 120 }, { pvm: '2026-05-10', arvo: 110 }];
    const store = {
      window: { TM_KEHITYSKAARI: K },
      _jsvEsc: esc,
      vpT: (s) => s,
      _vpKohdennettuSarja: () => ({ mitattava: true, key, sarja, nimi: K.tmKaariNimi(key) }),
      _vpSulkuJaksovali: () => ({ alkoi: '2026-01-01', loppu: null }),
      onNeutraaliPrePHV: () => false,
    };
    const ymp = new Proxy(store, {
      has: (t, k) => (k in t) || !(k in globalThis),
      get: (t, k) => (k === Symbol.unscopables ? undefined : (k in t ? t[k] : () => '')),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    const runko = [
      'function _vpKaariNimiNaytto(avain, libNimi) {',
      'function _vpJfEvidenssiHTML(p) {',
      'function _vpAloitusSiruHTML(p) {',
    ].map(pura).join('\n');
    const p = { jaksofokus: { konsepti_nimi: 'Haltuunotto', domeeni: 'teknis_taktinen', alkoi: '2026-01-01' } };
    // eslint-disable-next-line no-new-func
    const api = new Function('__ymp', 'with(__ymp){' + runko
      + '\nreturn {ev:_vpJfEvidenssiHTML, siru:_vpAloitusSiruHTML};}')(ymp);
    return { ev: nakyva(api.ev(p)), siru: nakyva(api.siru(p)) };
  }

  const r = renderoi('tki');

  it('EI VACUOUS: molemmat renderöijät tuottavat tekstiä', () => {
    expect(r.ev.replace(/\s/g, '').length, 'todistelohko jäi tyhjäksi').toBeGreaterThan(20);
    expect(r.siru.replace(/\s/g, '').length, 'fokus-siru jäi tyhjäksi').toBeGreaterThan(3);
  });

  it('Kehityksen todistelohko ei näytä tunnusta "TKI"', () => {
    expect(r.ev).not.toMatch(/\bTKI\b/);
  });

  it('Aloituksen fokus-siru ei näytä tunnusta "TKI"', () => {
    expect(r.siru).not.toMatch(/\bTKI\b/);
  });

  it('tilalla on ihmisnimi, ei tyhjä', () => {
    expect(r.ev).toContain('Tekninen');
    expect(r.siru).toContain('Tekninen');
  });

  it('tuntematon avain → libin nimi säilyy (ei pudoteta tekstiä pois)', () => {
    const t = renderoi('cmj');
    expect(t.ev).toContain(K.tmKaariNimi('cmj'));
  });
});
