/**
 * COD-TERMIN KATTAVUUSPORTTI — kaikki git-seuratut i18n-lähteet.
 *
 * MIKSI OMA PORTTI, EIKÄ LAAJENNUS: edellinen vartija skannasi vain `tm_vp_i18n.js`:n ja
 * `tm_master_i18n.js`:n, joten se hyväksyi vajaan sweepin vihreänä. Vanha termi jäi elämään
 * KOLMEEN muuhun tarjoiltavaan runtime-tiedostoon (`tm_arviointi_taksonomia.js`,
 * `tm_fyysteemat.js`, `harjoitelogiikka_v4.js`) ja KOLMEEN sanktioituun lähde-JSONiin —
 * jälkimmäinen olisi palauttanut vanhan termin seuraavassa regeneroinnissa.
 *
 * Portti johtaa kohdejoukon `git ls-files`istä, ei kovakoodatusta listasta (sama periaate kuin
 * lint-portissa): uusi i18n-lähde tulee vartioiduksi itsestään. Juuri kovakoodattu lista oli
 * edellisen vartijan vika.
 *
 * MORFOLOGIA. `byte` on NEUTRI (ett byte), `förändring` UTRUM (en förändring) → taivutusmuodot
 * eivät vastaa toisiaan, ja naiivi `s/riktningsbyte/riktningsförändring/` tuottaa vääriä muotoja:
 *   riktningsbyten     -> riktningsförändringar      (EI …ringn)
 *   riktningsbytet     -> riktningsförändringen      (EI …ringt)
 *   riktningsbyteindex -> riktningsförändringsindex  (sidos-s)
 * Siksi portti tarkistaa myös nämä virhemuodot erikseen.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Tämä tiedosto SISÄLTÄÄ kielletyt muodot tarkoituksella — se nimeää ne. */
const OHITA = new Set([basename(fileURLToPath(import.meta.url)), 'i18n_vp_lajinimet_ja_cod.test.js']);

const seuratut = execFileSync('git', ['ls-files'], { cwd: juuri, encoding: 'utf8' })
  .split('\n').filter(Boolean)
  /* RUNTIME + KÄÄNNÖSLÄHTEET, ei dokumentaatio. `.md` oli mukana ensimmäisessä versiossa ja se
     kaatoi CI:n: brief-dokumentti (docs/CODE_BRIEF_I18N_V5_VP_V7_RAPORTOINTI.md) SAA sisältää
     vanhan termin — se on historiallista proosaa, joka kuvaa mennyttä tilaa. Portin tehtävä on
     estää vanhan termin RENDERÖITYMINEN ja sen paluu käännöslähteestä, ei sensuroida briefejä. */
  .filter((p) => /\.(js|json|html)$/i.test(p))
  .filter((p) => !OHITA.has(basename(p)));

const VANHA = /riktningsbyte[a-zäöå]*|riktningsändring[a-zäöå]*/gi;
/* Naiivin korvauksen jäljet: roikkuva kirjain tai puuttuva sidos-s. */
const RIKKI = /riktningsförändring[nt](?![a-zäöå])|förändringindex/gi;

function lue(p) {
  try { return readFileSync(join(juuri, p), 'utf8'); } catch { return ''; }
}

describe('COD-termi · kattavuus kaikissa i18n-lähteissä', () => {
  it('EI VACUOUS: kohdejoukko on laaja ja sisältää tunnetut lähteet', () => {
    expect(seuratut.length).toBeGreaterThan(50);
    for (const p of ['lib/tm_vp_i18n.js', 'lib/tm_master_i18n.js', 'lib/tm_fyysteemat.js',
      'lib/tm_arviointi_taksonomia.js', 'harjoitelogiikka_v4.js',
      'docs/VP_SV_KAANNOSMUISTI.json', 'docs/LIB_SV_KAANNOSMUISTI.json',
      'docs/MASTER_SV_KAANNOSMUISTI.json']) {
      expect(seuratut, `${p} puuttuu kohdejoukosta`).toContain(p);
    }
  });

  it('yksikään lähde ei sisällä vanhaa COD-termiä', () => {
    const vuodot = [];
    for (const p of seuratut) {
      const osumat = lue(p).match(VANHA);
      if (osumat) vuodot.push(`${p}: ${[...new Set(osumat)].join(', ')}`);
    }
    expect(
      vuodot,
      'vanha COD-termi (kanoninen = Riktningsförändring):\n' + vuodot.join('\n'),
    ).toEqual([]);
  });

  it('naiivin korvauksen virhemuotoja ei ole (roikkuva kirjain / puuttuva sidos-s)', () => {
    const rikki = [];
    for (const p of seuratut) {
      const osumat = lue(p).match(RIKKI);
      if (osumat) rikki.push(`${p}: ${[...new Set(osumat)].join(', ')}`);
    }
    expect(rikki, 'virheellinen taivutusmuoto:\n' + rikki.join('\n')).toEqual([]);
  });

  it('kanoninen termi on oikeasti käytössä (portti ei valvo tyhjää)', () => {
    const kaytossa = seuratut.filter((p) => /riktningsförändring/i.test(lue(p)));
    expect(kaytossa.length, 'kanonista termiä ei löydy mistään').toBeGreaterThanOrEqual(5);
  });

  it('oikeat taivutusmuodot ovat tallessa (monikko · määrätty · sidos-s)', () => {
    const kaikki = seuratut.map(lue).join('\n');
    expect(kaikki, 'monikko').toMatch(/riktningsförändringar/i);
    expect(kaikki, 'määrätty muoto').toMatch(/riktningsförändringen/i);
    expect(kaikki, 'sidos-s yhdyssanassa').toMatch(/riktningsförändringsindex/i);
  });

  it('lähde-JSON ja generoitu kartta eivät eroa COD-avaimissa (regenerointi ei palauta vanhaa)', async () => {
    const { createRequire } = await import('module');
    const req = createRequire(import.meta.url);
    for (const [jsonP, libP, nimi] of [
      ['docs/VP_SV_KAANNOSMUISTI.json', '../lib/tm_vp_i18n.js', 'TM_VP_I18N'],
      ['docs/MASTER_SV_KAANNOSMUISTI.json', '../lib/tm_master_i18n.js', 'TM_MASTER_I18N'],
    ]) {
      const J = JSON.parse(lue(jsonP));
      const M = req(libP)[nimi].sv;
      /* Avainjoukko MOLEMMISTA puolista: jos vain JSON-arvoa katsottaisiin, JSONin muuttaminen
         pois COD-termistä pudottaisi avaimen joukosta ja ero jäisi huomaamatta. */
      const cod = [...new Set([...Object.keys(J), ...Object.keys(M)])]
        .filter((k) => /riktningsförändring/i.test(J[k] || '') || /riktningsförändring/i.test(M[k] || ''));
      expect(cod.length, `${jsonP}: ei COD-avaimia → portti tyhjä`).toBeGreaterThan(0);
      const eroja = cod.filter((k) => k in M && k in J && M[k] !== J[k]);
      expect(eroja, `${jsonP} ja ${libP} eroavat → regenerointi muuttaisi koodia`).toEqual([]);
    }
  });
});
