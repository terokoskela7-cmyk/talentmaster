/**
 * VP sv · (A) raaka lajiavain ei vuoda näyttöön · (B) COD-termi on yksi ja sama kaikkialla.
 *
 * (A) JUURISYY: `_vpTkLajiRaaka(id)` on `TK_LAJI_NIMET[id] || id` — puuttuva nimi putoaa RAAKAAN
 * AVAIMEEN, jolloin UI näytti "sm_pallo heikoin kehityskohde". Taulukossa oli vain viisi TK-lajia,
 * mutta kehityskohde voi olla myös sm_pallo · sm_juoksu · kuljetus. Vika ei ollut käännöksessä
 * vaan siinä että nimeä ei ollut olemassa millään kielellä.
 *
 * Portti johtaa kohdejoukon KOLMESTA lähteestä joista kehityskohde voi tulla, ei kovakoodatusta
 * listasta: uusi laji missä tahansa niistä tulee vartioiduksi itsestään.
 *
 * (B) COD-TERMI. Kartassa oli kolme eri ruotsinnosta samalle käsitteelle (Riktningsbyte ·
 * Riktningsändring · Riktningsförändring). Tero päätti kanoniseksi `Riktningsförändring`.
 * Yksi morfologiapoikkeus: yhdyssanassa tarvitaan sidos-s (`riktningsförändringsindex`), jota
 * mekaaninen korvaus ei tuota — siksi se on oma väitteensä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const VP_I18N = readFileSync(join(juuri, 'lib/tm_vp_i18n.js'), 'utf8');
const MASTER_I18N = readFileSync(join(juuri, 'lib/tm_master_i18n.js'), 'utf8');

const C = require('../lib/tm_i18n_common.js');
global.TM_I18N_COMMON = C.TM_I18N_COMMON;
global.tmI18nResolve = C.tmI18nResolve;
const { vpT } = require('../lib/tm_vp_i18n.js');
const kielella = (k, fn) => {
  const vanha = global.tmNykyinenKieli;
  global.tmNykyinenKieli = () => k;
  try { return fn(); } finally { global.tmNykyinenKieli = vanha; }
};

/** Poimii objektiliteraalin avaimet lähteestä (esim. `const X = { a:'…', b:'…' }`). */
function objAvaimet(nimi) {
  const m = VP.match(new RegExp('const ' + nimi + '\\s*=\\s*\\{([\\s\\S]*?)\\n?\\s*\\};?', 'm'))
        || VP.match(new RegExp('const ' + nimi + '\\s*=\\s*\\{([^}]*)\\}'));
  expect(m, `${nimi} ei löytynyt lähteestä`).not.toBeNull();
  return [...m[1].matchAll(/(\w+)\s*:/g)].map((x) => x[1]);
}

/** Nimitaulukko id -> fi-näyttönimi. */
function tkLajiNimet() {
  const m = VP.match(/const TK_LAJI_NIMET = \{([\s\S]*?)\};/);
  expect(m).not.toBeNull();
  const ulos = {};
  for (const x of m[1].matchAll(/(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'/g)) ulos[x[1]] = x[2].replace(/\\'/g, "'");
  return ulos;
}

describe('A · raaka lajiavain ei saa vuotaa näyttöön', () => {
  const NIMET = tkLajiNimet();

  it('EI VACUOUS: nimitaulukko ja lähdejoukot löytyvät', () => {
    expect(Object.keys(NIMET).length).toBeGreaterThanOrEqual(8);
    expect(objAvaimet('_JSV_LAJI_KONSEPTI').length).toBeGreaterThan(3);
    expect(objAvaimet('_VP_HH_FOKUS_NIMI').length).toBeGreaterThan(3);
  });

  it('jokainen kehityskohde-avain on nimitaulukossa (muuten raaka id vuotaa UI:hin)', () => {
    // Kehityskohde voi tulla TKI-puolelta (_JSV_LAJI_KONSEPTI) tai H-H-puolelta (_VP_HH_FOKUS_NIMI).
    // Jälkimmäisellä on oma nimensä, joten se ei tarvitse TK_LAJI_NIMETiä — mutta TKI-puoli tarvitsee.
    const puuttuu = objAvaimet('_JSV_LAJI_KONSEPTI').filter((id) => !(id in NIMET));
    expect(puuttuu, `raaka avain päätyisi näyttöön: ${puuttuu.join(', ')}`).toEqual([]);
  });

  it('jokainen nimi resolvoituu ruotsiksi (ei jää suomeksi sv-tilassa)', () => {
    const fi = kielella('sv', () => Object.values(NIMET).filter((n) => vpT(n) === n));
    expect(fi, 'nimi ilman sv-käännöstä').toEqual([]);
  });

  it('sm_pallo ja sm_juoksu jakavat saman perustermin, erottuvat tarkenteella', () => {
    kielella('sv', () => {
      expect(vpT(NIMET.sm_juoksu)).toBe('Riktningsförändring');
      expect(vpT(NIMET.sm_pallo)).toBe('Riktningsförändring (boll)');
    });
  });

  it('joukkuesignaalin "yleisin kehityskohde" on reititetty', () => {
    expect(VP).toContain("vpT('yleisin kehityskohde')");
    expect(VP, 'reitittämätön literaali jäi').not.toContain(" = yleisin kehityskohde (");
    kielella('sv', () => expect(vpT('yleisin kehityskohde')).toBe('vanligaste utvecklingsområde'));
  });
});

describe('B · COD-termi standardoitu (Riktningsförändring)', () => {
  it('vanhoja termejä ei ole jäljellä kummassakaan kartassa', () => {
    for (const [nimi, sisalto] of [['VP', VP_I18N], ['Master', MASTER_I18N]]) {
      const osumat = sisalto.match(/riktningsbyte[a-zäöå]*|riktningsändring[a-zäöå]*/gi) || [];
      expect(osumat, `${nimi}: vanha COD-termi`).toEqual([]);
    }
  });

  it('EI VACUOUS: kanoninen termi on oikeasti käytössä', () => {
    expect((VP_I18N.match(/riktningsförändring/gi) || []).length).toBeGreaterThan(15);
    expect((MASTER_I18N.match(/riktningsförändring/gi) || []).length).toBeGreaterThan(0);
  });

  it('yhdyssanoissa on sidos-s (mekaaninen korvaus ei tuota sitä)', () => {
    for (const [nimi, sisalto] of [['VP', VP_I18N], ['Master', MASTER_I18N]]) {
      expect(sisalto.toLowerCase(), `${nimi}: sidos-s puuttuu`).not.toContain('förändringindex');
    }
    expect(VP_I18N).toContain('riktningsförändringsindex');
  });
});

describe('B2 · glossaaripoikkeamat siivottu', () => {
  it('Nopeus → Hastighet: snabbhets- ei esiinny VP-kartassa', () => {
    expect(VP_I18N).not.toContain('snabbhets');
  });

  it('kasvupyrähdys on yhtenäisesti tillväxtspurten', () => {
    const ilmanEtuliitetta = (VP_I18N.match(/(?<!till)växtspurten/g) || []);
    expect(ilmanEtuliitetta, 'sama käsite kahdessa muodossa').toEqual([]);
    expect((VP_I18N.match(/tillväxtspurten/g) || []).length).toBeGreaterThan(5);
  });

  it('kartat ladataan versioidulla URLilla (uudet avaimet stale-klienteille)', () => {
    expect(VP.match(/lib\/tm_vp_i18n\.js\?v=(\d+)/)[1]).toBeDefined();
    expect(Number(VP.match(/lib\/tm_vp_i18n\.js\?v=(\d+)/)[1])).toBeGreaterThanOrEqual(79);
  });
});
