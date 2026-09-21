/**
 * i18n-MARKUP-ANSA — `vpT`/`masterT` käärii vain TEKSTIN, ei markkupia.
 *
 * JUURISYY (mitattu, ei arvattu): i18n-massakäärössä VP:hen kääriytyi kokonaisia
 * HTML-elementtejä käännösavaimiksi:
 *     vpT('<div style="…">Ei pelihavaintoja vielä — …</div>')
 * Silloin markup on SEKÄ avaimessa ETTÄ sv-arvossa. Kun tyyli, luokka tai leveys
 * muuttuu fi-puolella, avain ei enää täsmää sv-karttaan → ruotsinnos katoaa HILJAA
 * (miss → fi-fallback, ei virhettä). Noin puolet kartan markup-avaimista oli jo
 * orpoutunut juuri näin, ja shell-/leveysrefaktorit orpouttivat lisää joka kierroksella.
 *
 * Tämä portti on korjauksen pysyvyys: ilman sitä seuraava massakäärö tuo ansan takaisin.
 * Luokittelu on TÄSSÄ ITSENÄINEN (ei jaettu codemodin kanssa) — vartija ei saa nojata
 * samaan koodiin jota se vartioi.
 *
 * Codemod: scripts/i18n_markup_codemod.mjs (vaihe 1 = luokka A).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const lue = (p) => readFileSync(join(juuri, p), 'utf8');

/* ── Itsenäinen luokittelija ── */
const ATTR = /\b(title|placeholder|aria-label|alt)\s*=\s*(\\?["'])((?:(?!\2).)*)\2/;
const merkitseva = (s) => /[\p{L}\p{N}]/u.test(s);
const onMarkup = (k) => /<\/?[a-zA-Z][^>]*>/.test(k) || /^[^<]*>/.test(k) || /<[^>]*$/.test(k);
const midTag = (k) => (k.match(/</g) || []).length !== (k.match(/>/g) || []).length;

function palat(k) {
  const out = [];
  const re = /<[^>]*>/g;
  let i = 0, m;
  while ((m = re.exec(k))) {
    if (m.index > i) out.push({ t: 'teksti', v: k.slice(i, m.index) });
    out.push({ t: 'markup', v: m[0] });
    i = m.index + m[0].length;
  }
  if (i < k.length) out.push({ t: 'teksti', v: k.slice(i) });
  return out;
}
/** Luokka A = kokonainen elementti yhden tekstijakson ympärillä, ei käännettävää
    attribuuttia → puhtaasti purettavissa ilman käännösputkea. */
function luokkaA(k) {
  if (!onMarkup(k) || midTag(k)) return null;
  const ps = palat(k);
  for (const p of ps) {
    if (p.t !== 'markup') continue;
    const a = p.v.match(ATTR);
    if (a && merkitseva(a[3])) return null;
  }
  const o = ps.map((p, i) => [p, i]).filter(([p]) => p.t === 'teksti' && merkitseva(p.v));
  return o.length === 1 ? ps[o[0][1]].v : null;
}
function avaimet(teksti, fn) {
  const re = new RegExp(fn + "\\('((?:[^'\\\\]|\\\\.)*)'\\)", 'g');
  return [...teksti.matchAll(re)].map((m) => m[1]);
}

const VP = lue('TalentMaster_VP_v25.html');
const MASTER = lue('TalentMaster_Master_v16.html');
const vpAvaimet = [...new Set(avaimet(VP, 'vpT'))];
const maAvaimet = [...new Set(avaimet(MASTER, 'masterT'))];

/* ══ SALLITUT LUOKKA A -JÄÄNNÖKSET ══
   Codemod ESTI nämä tietoisesti: jokaisessa purettu tekstiavain törmäisi TOISEEN
   sanktioituun ruotsinnokseen, tai sv-arvon tagirakenne ei vastaa fi-avainta. Kumpi
   käännös jää voimaan, on KÄÄNTÄJÄN päätös — skripti ei saa valita puolesta, koska
   se vaihtaisi näkyvän ruotsin hiljaa. Lista on tunnistettu PURETULLA TEKSTILLÄ
   (luettava), ei 200 merkin markup-avaimella. */
const SALLITUT_A = [
  /* 'Individkoncept' (kartassa) vs 'Individuellt koncept' (markup-avaimessa) */
  'Yksilökonsepti',
  /* 'underlag för samtal, inte ett betyg' vs 'grund för samtal, ej betyg' */
  'peruste keskusteluun, ei arvosana (§37)',
  /* '— inte satt' vs '— ej satt' — kaksi markup-avainta, eri ruotsi */
  '— ei asetettu',
  /* sv-arvon tagirakenne ei vastaa fi-avainta (onclick-JS avaimen sisällä) */
  '▸ Rooli · pelipaikkafundamentit',
  /* 'Senaste anteckning' vs 'Sen. registrering' */
  'Viim. kirjaus',
  /* '⚙ Sätt säsongsmål' vs '⚙ Ange säsongsmål' */
  '⚙ Aseta kausitavoitteet',
  /* 'sen.' vs 'förs.' */
  'myöh.',
];

/* ══ VAIHE 2 -JÄÄNNÖS ══
   Luokat jotka EIVÄT ole mekaanisesti purettavissa: käännettävä teksti attribuutissa
   (title/placeholder), monta tekstijaksoa yhdessä avaimessa, tai avain katkeaa kesken
   tagia. Näiden purku vaatii lauseen uudelleenkoonnin ja siten käännösputken.
   Tarkka yhtäsuuruus: jono ei saa kasvaa, eikä kutistua ilman että luku päivitetään. */
const VAIHE2 = { attribuutti: 23, moniteksti: 67, midTag: 52 };

function luokittele(avaimet) {
  const ulos = { A: [], attribuutti: 0, moniteksti: 0, midTag: 0 };
  for (const k of avaimet.filter(onMarkup)) {
    if (midTag(k)) { ulos.midTag++; continue; }
    const ps = palat(k);
    const attr = ps.some((p) => p.t === 'markup' && (p.v.match(ATTR) || [])[3] && merkitseva(p.v.match(ATTR)[3]));
    if (attr) { ulos.attribuutti++; continue; }
    const teksti = luokkaA(k);
    if (teksti !== null) ulos.A.push(teksti);
    else ulos.moniteksti++;
  }
  return ulos;
}

describe('i18n · markup ei kuulu käännösavaimeen', () => {
  it('EI VACUOUS: skanneri löytää oikeasti markup-avaimia', () => {
    /* Jos regex ei osu mihinkään, kaikki alla olevat portit läpäisisivät aina. */
    const kaikki = [...vpAvaimet, ...maAvaimet].filter(onMarkup);
    expect(kaikki.length, 'markup-avaimia ei löydy → portti ei mittaa mitään').toBeGreaterThan(50);
    expect(vpAvaimet.length, 'vpT-avaimia ei löydy').toBeGreaterThan(1000);
  });

  it('LUOKKA A: vain kääntäjälle liputetut jäännökset (uusi kokonaiselementti punertaa)', () => {
    const vp = luokittele(vpAvaimet);
    const ma = luokittele(maAvaimet);
    expect(ma.A, 'Masteriin ilmestyi kokonaiselementti käännösavaimeksi').toEqual([]);
    expect([...new Set(vp.A)].sort(), 'uusi kokonaiselementti käännösavaimena — kääri vain teksti: '
      + "'<div …>' + vpT('teksti') + '</div>'").toEqual([...new Set(SALLITUT_A)].sort());
  });

  it('VAIHE 2 -jono ei kasva (attribuutti · moniteksti · mid-tag)', () => {
    const vp = luokittele(vpAvaimet);
    const ma = luokittele(maAvaimet);
    const yht = {
      attribuutti: vp.attribuutti + ma.attribuutti,
      moniteksti: vp.moniteksti + ma.moniteksti,
      midTag: vp.midTag + ma.midTag,
    };
    expect(yht, 'vaihe 2 -jono muuttui — päivitä luku samassa PR:ssä jossa jono muuttuu').toEqual(VAIHE2);
  });

  it('sv-KARTTA: yksikään ELÄVÄ luokka-A-kutsu ei osu markup-avaimeen', () => {
    /* Varsinainen regressioehto: kartassa on markup-avain JOTA LÄHDE KÄYTTÄÄ.
       Juuri se pari orpoutuu tyylimuutoksesta. Kartan käyttämättömät markup-jäänteet
       ovat eri asia (alla) — ne eivät voi orpoutua, koska mikään ei hae niitä. */
    for (const [polku, nimi, avaimet] of [
      ['lib/tm_vp_i18n.js', 'TM_VP_I18N', vpAvaimet],
      ['lib/tm_master_i18n.js', 'TM_MASTER_I18N', maAvaimet],
    ]) {
      const sv = vaadi(join(juuri, polku))[nimi].sv;
      const elava = new Set(avaimet);
      const rikkovat = Object.keys(sv)
        .filter((k) => elava.has(k) && luokkaA(k) !== null && SALLITUT_A.indexOf(luokkaA(k)) < 0);
      expect(rikkovat, polku + ': elävä kutsu hakee markup-avaimella → orpoutuu seuraavasta tyylimuutoksesta')
        .toEqual([]);
    }
  });

  it('KARTTOJEN markup-jäänne ei kasva (konservatiivinen orpo-sääntö)', () => {
    /* Codemod poistaa orvon vain jos avain EI esiinny lähteessä missään muodossa.
       Osa käännettävästä ei tule kutsuliteraalista (esim. `TM_TESTI_OHJEET` kierrätetään
       `vpT(ohje.teksti)`:n läpi), joten kapeampi sääntö poistaisi eläviä rivejä — se
       todettiin regressiona sv-kattavuusportissa. Jäänne on siksi tietoinen; lukitaan
       määrä, jottei se kasva takaisin. */
    const laske = (polku, nimi) => Object.keys(vaadi(join(juuri, polku))[nimi].sv)
      .filter((k) => luokkaA(k) !== null).length;
    expect({
      vp: laske('lib/tm_vp_i18n.js', 'TM_VP_I18N'),
      master: laske('lib/tm_master_i18n.js', 'TM_MASTER_I18N'),
    }, 'kartan markup-jäänne muuttui — päivitä luku samassa PR:ssä').toEqual({ vp: 12, master: 0 });
  });

  it('MUUT APIT pysyvät puhtaina (ansa ei leviä)', () => {
    /* Ansa syntyi VP:n massakäärössä; muissa apeissa sitä ei ole koskaan ollut. */
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Admin.html']) {
      const t = lue(f);
      const n = ['vpT', 'masterT', 'tmT'].flatMap((fn) => avaimet(t, fn)).filter(onMarkup);
      expect(n, f + ': markup käännösavaimessa').toEqual([]);
    }
  });

  it('CODEMOD on repossa ja kuiva-ajo on oletus (ei vahinkoajoa)', () => {
    const s = lue('scripts/i18n_markup_codemod.mjs');
    expect(s, 'codemod puuttuu → korjausta ei voi toistaa').toContain('luokkaA');
    expect(s, 'kirjoittaa ilman --apply-lippua').toContain("includes('--apply')");
  });
});
