/**
 * i18n-MARKUP-ANSA — `vpT`/`masterT` käärii vain TEKSTIN, ei markkupia.
 *
 * JUURISYY (mitattu): i18n-massakäärössä VP:hen kääriytyi kokonaisia HTML-elementtejä
 * ja tagifragmentteja käännösavaimiksi:
 *     vpT('<div style="…">Ei pelihavaintoja vielä — …</div>')  ·  vpT('">Ehdota:')
 * Silloin markup on SEKÄ avaimessa ETTÄ sv-arvossa. Kun tyyli, luokka tai leveys
 * muuttuu fi-puolella, avain ei enää täsmää sv-karttaan → ruotsinnos katoaa HILJAA
 * (miss → fi-fallback, ei virhettä). Noin puolet kartan markup-avaimista oli jo
 * orpoutunut näin, ja jokainen UI-refaktori orpoutti lisää.
 *
 * Purettu kolmessa erässä: #603 (luokka A) · #604 (sv-kytkentä) · osa 4 (fragmentit,
 * attribuutit, monitekstiset). Tämä portti on korjauksen pysyvyys.
 *
 * LUOKITTELIJA ON TÄSSÄ ITSENÄINEN (ei jaettu codemodin kanssa) — vartija ei saa
 * nojata samaan koodiin jota se vartioi.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

/* ── Palastelu ──────────────────────────────────────────────────────────────
   Markkupi tunnistetaan TAGIMÄISYYDESTÄ, ei pelkästä < / > -merkistä:
   vertailuoperaattori tekstissä ('< 40', '> 1.5 s', '(<3)') EI ole markkupia.

   Vaikein erottelu on avaimen ALKU, joka voi olla kolmea eri asiaa:
     '">Ehdota:'            → sulkeva lainaus + tagin loppu, sitten TEKSTI
     ';border-radius:2px">' → CSS-deklaraatio + tagin loppu, EI tekstiä
     'arvioitu">'           → TEKSTI, ja vasta sitten sulkeva fragmentti
   Siksi alkufragmentiksi kelpaa vain tyhjä, pelkkä lainausmerkki, attribuutti-
   sijoitus (`=`) tai CSS-deklaraatio (`;color:` / `margin-left:`). Muuten alku on
   tekstiä ja fragmentti haetaan lopusta. */
const TAG = /<[a-zA-Z/!][^>]*>/g;
const ALKUFRAG = /<[a-zA-Z/!][^>]*$/;              // katkennut tagin ALKU avaimen lopussa
const LOPPUQ = /"\s*\/?>$/;                        // '…">' avaimen lopussa
const ATTR = /\b(?:title|placeholder|aria-label|alt|label)\s*=\s*"([^"]*)"/;
const merkitseva = (s) => /[\p{L}\p{N}]/u.test(s);
/** Onko `etuliite` (ennen ensimmäistä >) tagin sisuskalua eikä näkyvää tekstiä? */
function tagimainen(etuliite) {
  if (etuliite === '' || etuliite === '"') return true;
  /* Koodin jatke: avain alkaa kesken onclick-attribuutin JS-lausetta, esim.
     `\',\'arviointi\')">✓ Aseta jaksofokukseksi`. Näkyvä teksti ei koskaan ala
     lainausmerkillä/pilkulla/sulkeella JA sisällä `>`:ää ennen itseään. */
  if (/^[\\'",)]/.test(etuliite)) return true;
  if (etuliite.includes('=')) return true;                       // attribuuttisijoitus
  return /^[;\s]*[a-zA-Z-]+\s*:/.test(etuliite);                 // CSS-deklaraatio
}

function palastele(k) {
  const ulos = [];
  let jaljella = k;

  /* 1) katkennut tagin LOPPU avaimen alussa */
  const lf = jaljella.match(/^([^<>]*)>/);
  if (lf && tagimainen(lf[1])) { ulos.push({ t: 'markup', v: lf[0] }); jaljella = jaljella.slice(lf[0].length); }

  /* 2) katkennut fragmentti avaimen LOPUSSA: tagin alku tai sulkeva '">' */
  let hanta = '';
  const af = jaljella.match(ALKUFRAG);
  if (af) { hanta = af[0]; jaljella = jaljella.slice(0, jaljella.length - hanta.length); }
  else if (!jaljella.includes('<')) {
    const lq = jaljella.match(LOPPUQ);
    if (lq) { hanta = lq[0]; jaljella = jaljella.slice(0, jaljella.length - hanta.length); }
  }

  /* 3) keskiosa: kokonaiset tagit ja niiden väliset tekstit */
  let i = 0, m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(jaljella))) {
    if (m.index > i) ulos.push({ t: 'teksti', v: jaljella.slice(i, m.index) });
    ulos.push({ t: 'markup', v: m[0] });
    i = m.index + m[0].length;
  }
  if (i < jaljella.length) ulos.push({ t: 'teksti', v: jaljella.slice(i) });
  if (hanta) ulos.push({ t: 'markup', v: hanta });

  /* 4) attribuuttitekstit markup-palojen sisältä omiksi teksti-paloiksi */
  const lop = [];
  for (const p of ulos) {
    if (p.t !== 'markup') { lop.push(p); continue; }
    let osa = p.v, a;
    while ((a = osa.match(ATTR)) && merkitseva(a[1])) {
      const alku = osa.indexOf(a[0]);
      lop.push({ t: 'markup', v: osa.slice(0, alku + a[0].indexOf('"') + 1) });
      lop.push({ t: 'teksti', v: a[1] });
      osa = osa.slice(alku + a[0].length - 1);
    }
    if (osa) lop.push({ t: 'markup', v: osa });
  }
  /* 5) yhdistä vierekkäiset markup-palat yhdeksi literaaliksi */
  const yhd = [];
  for (const p of lop) {
    if (p.v === '') continue;
    const e = yhd[yhd.length - 1];
    if (e && e.t === 'markup' && p.t === 'markup') { e.v += p.v; continue; }
    yhd.push({ t: p.t, v: p.v });
  }
  return yhd;
}

const onMarkupAvain = (k) => palastele(k).some((p) => p.t === 'markup');
/** Luettava tunniste: avaimen käännettävät tekstijaksot. */
const tunniste = (k) => JSON.stringify(palastele(k).filter((p) => p.t === 'teksti' && merkitseva(p.v)).map((p) => p.v));

function avaimet(teksti, fn) {
  const re = new RegExp(fn + "\\('((?:[^'\\\\]|\\\\.)*)'\\)", 'g');
  return [...teksti.matchAll(re)].map((m) => m[1].replace(/\\(['\\\\])/g, '$1'));
}

const VP = lue('TalentMaster_VP_v25.html');
const MASTER = lue('TalentMaster_Master_v16.html');
const vpAvaimet = [...new Set(avaimet(VP, 'vpT'))];
const maAvaimet = [...new Set(avaimet(MASTER, 'masterT'))];

/* ══ JÄÄNNÖS — 10 avainta joita codemod EI saanut purkaa ══
   Jokaisessa purku VAIHTAISI näkyvän ruotsin (kartassa on eri sanktioitu arvo kuin
   markup-avaimen sisällä) tai sv-arvon tagirakenne ei vastaa fi-avainta. Kumpi
   käännös jää voimaan, on KÄÄNTÄJÄN päätös — skripti ei valitse puolesta.
   Tunniste = avaimen käännettävät tekstijaksot (luettava), ei 200 merkin avain. */
const JAANNOS = {
  'TalentMaster_VP_v25.html': [
    /* 'Individkoncept' (kartassa) vs 'Individuellt koncept' (markup-avaimessa) */
    '["Yksilökonsepti"]',
    /* 'bedömd' vs 'bedömda' — yksikkö/monikko */
    '["arvioitu"]',
    /* 'underlag för samtal, inte ett betyg' vs 'grund för samtal, ej betyg' */
    '["peruste keskusteluun, ei arvosana (§37)"]',
    /* '— inte satt' vs '— ej satt' */
    '["— ei asetettu"]',
    /* rakenne-ero: onclick-JS avaimen sisällä, sv:n tagit eivät vastaa fi:tä */
    '["▸ Rooli · pelipaikkafundamentit"]',
    /* rakenne-ero, ei käännettävää tekstiä lainkaan */
    '[]',
    /* '⚙ Sätt säsongsmål' vs '⚙ Ange säsongsmål' */
    '["⚙ Aseta kausitavoitteet"]',
    /* 'sen.' vs 'förs.' */
    '["myöh."]',
  ],
  'TalentMaster_Master_v16.html': [
    /* kolmen kohdan lista, jossa 2. rivin sv eroaa kartan arvosta */
    '["1. Varmista että pelaajilla on PIN-koodi","2. Pyydä pelaajia kirjaamaan yksi harjoitus tänään","3. Reagoi heti kun kirjaus ilmestyy — se motivoi jatkamaan"]',
    /* rakenne-ero: <b>Arkisto</b> sijoittuu sv:ssä eri kohtaan */
    '["Kuitatut löytyvät ","Arkisto","-välilehdeltä"]',
  ],
};

describe('i18n · markup ei kuulu käännösavaimeen', () => {
  it('EI VACUOUS: luokittelija tunnistaa markkupin JA jättää vertailuoperaattorit tekstiksi', () => {
    /* Ilman ensimmäistä kaikki portit läpäisisivät tyhjinä; ilman toista jono ei
       voisi koskaan mennä nollaan, koska teksti laskettaisiin markkupiksi. */
    for (const k of ['<div class="x">y</div>', '">Ehdota:', 'arvioitu">', '<span title="Vihje">']) {
      expect(onMarkupAvain(k), 'markkupia ei tunnistettu: ' + k).toBe(true);
    }
    for (const k of ['< 40 → klinikkajatkumo (§14)', 'pelaajaa (pallo hidastaa > 1.5 s)', '— epävarma (<3)']) {
      expect(onMarkupAvain(k), 'vertailuoperaattori luettiin markkupiksi: ' + k).toBe(false);
    }
    expect(vpAvaimet.length, 'vpT-avaimia ei löydy → skanneri rikki').toBeGreaterThan(1000);
  });

  it('JÄÄNNÖS on tasan liputetut — uusi markup-avain punertaa heti', () => {
    for (const [tiedosto, avaimet_] of [['TalentMaster_VP_v25.html', vpAvaimet],
      ['TalentMaster_Master_v16.html', maAvaimet]]) {
      const jaljella = avaimet_.filter(onMarkupAvain).map(tunniste).sort();
      expect(jaljella, tiedosto + ': markup käännösavaimessa — kääri vain teksti: '
        + "'<div …>' + vpT('teksti') + '</div>'").toEqual(JAANNOS[tiedosto].slice().sort());
    }
  });

  it('sv-KARTTA: yksikään ELÄVÄ kutsu ei hae markup-avaimella (paitsi jäännös)', () => {
    /* Varsinainen regressioehto: kartassa on markup-avain JOTA LÄHDE KÄYTTÄÄ — juuri
       se pari orpoutuu seuraavasta tyylimuutoksesta. */
    for (const [polku, nimi, avaimet_, tiedosto] of [
      ['lib/tm_vp_i18n.js', 'TM_VP_I18N', vpAvaimet, 'TalentMaster_VP_v25.html'],
      ['lib/tm_master_i18n.js', 'TM_MASTER_I18N', maAvaimet, 'TalentMaster_Master_v16.html'],
    ]) {
      const sv = vaadi(join(juuri, polku))[nimi].sv;
      const elava = new Set(avaimet_);
      const rikkovat = Object.keys(sv)
        .filter((k) => elava.has(k) && onMarkupAvain(k) && JAANNOS[tiedosto].indexOf(tunniste(k)) < 0);
      expect(rikkovat.map((k) => k.slice(0, 70)), polku + ': elävä kutsu hakee markup-avaimella').toEqual([]);
    }
  });

  it('MUUT APIT pysyvät puhtaina (ansa ei leviä)', () => {
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Admin.html']) {
      const t = lue(f);
      const n = ['vpT', 'masterT', 'tmT'].flatMap((fn) => avaimet(t, fn)).filter(onMarkupAvain);
      expect(n, f + ': markup käännösavaimessa').toEqual([]);
    }
  });

  it('CODEMODIT ovat repossa ja kuiva-ajo on oletus (ei vahinkoajoa)', () => {
    for (const s of ['scripts/i18n_markup_codemod.mjs', 'scripts/i18n_markup_codemod_osa4.mjs']) {
      expect(lue(s), s + ': kirjoittaa ilman --apply-lippua').toContain("includes('--apply')");
    }
  });
});
