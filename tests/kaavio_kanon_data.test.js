/**
 * TalentMaster™ — Erä F: kanonisen kaaviokirjaston DATALÄHDE + ingest.
 *
 * Kanoninen /kaaviot/{avain} oli TYHJÄ (Tero: "Kokoelmaan ei vielä viety mitään… Siellä tulisi
 * olla sisältöä mallina"), joten valmentaja avasi taktiikkataulun ilman yhtään mallia.
 *
 * ⚠ MITTAKAAVA: lib/tm_teknistaktiset.js = 109 KONSEPTIA (cue/KPI/dim) ilman piirrosgeometriaa.
 * Piirrettyjä speksejä on 20. Loput ovat PIIRTÄMISTEHTÄVÄ, eivät tämän datalähteen puute — tämä
 * testi lukitsee sen mitä on, eikä väitä kattavuutta jota ei ole.
 *
 *   A) DATALÄHDE on tracked ja ehjä (Claude outputs/ ei ole versionhallinnassa → ei totuuslähde)
 *   B) §6 — jokainen spec läpäisee SAMAN validaattorin kuin editori
 *   C) §32 — kanonin selitteet ovat kuratoitua master-sisältöä → kolmikielisiä
 *   D) KANON ≠ REVIEW — ei statusta, ei hyväksyntää
 *   E) INGEST — validointi ennen kirjoitusta, idempotentti upsert
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __dir = dirname(fileURLToPath(import.meta.url));
const require_ = createRequire(import.meta.url);
const ROOT = join(__dir, '..');
const { TM_KAAVIO_KANON } = require_(join(ROOT, 'lib', 'tm_kaavio_kanon_data.js'));
const V = require_(join(ROOT, 'lib', 'tm_kaavio_validate.js'));
const TT = require_(join(ROOT, 'lib', 'tm_teknistaktiset.js'));
const SKRIPTI = readFileSync(join(ROOT, 'scripts', 'ingest_kaaviot_kanon.js'), 'utf8');
const UI = readFileSync(join(ROOT, 'lib', 'tm_kaavio_ui.js'), 'utf8');

const KAANON_AVAIMET = (() => {
  const m = {};
  [].concat(TT.TM_TT_YOUTH || [], TT.TM_TT_JOUKKUE || []).forEach((k) => { m[k.avain] = k; });
  Object.values(TT.TM_TT_FUNDAMENTIT || {}).forEach((a) => a.forEach((k) => { m[k.avain] = k; }));
  return m;
})();

describe('A — datalähde on tracked ja ehjä', () => {
  it('data asuu VERSIONHALLITUSSA tiedostossa, ei "Claude outputs"-kansiossa', () => {
    const polku = 'lib/tm_kaavio_kanon_data.js';
    expect(existsSync(join(ROOT, polku))).toBe(true);
    // git tuntee sen → se voi olla totuuslähde. Claude outputs/ ei ole gitissä.
    const tracked = execSync('git ls-files ' + polku, { cwd: ROOT }).toString().trim();
    expect(tracked).toBe(polku);
    const outputs = execSync('git ls-files "Claude outputs/"', { cwd: ROOT }).toString().trim();
    expect(outputs, 'Claude outputs/ ei ole versionhallinnassa — ei kelpaa lähteeksi').toBe('');
  });
  it('speksejä on ja avaimet ovat uniikkeja (doc-id = avain → duplikaatti ylikirjoittaisi)', () => {
    expect(TM_KAAVIO_KANON.length).toBeGreaterThanOrEqual(20);
    const avaimet = TM_KAAVIO_KANON.map((s) => s.avain);
    expect(avaimet.filter((a, i) => avaimet.indexOf(a) !== i)).toEqual([]);
    expect(avaimet.filter((a) => !a)).toEqual([]);
  });
  it('jokainen avain on OIKEA curriculum-avain (ei keksitty)', () => {
    const tuntemattomat = TM_KAAVIO_KANON.filter((s) => !KAANON_AVAIMET[s.avain]).map((s) => s.avain);
    expect(tuntemattomat).toEqual([]);
  });
  it('REHELLISYYS: tämä EI kata 109 konseptia — loput ovat piirtämistehtävä', () => {
    const konsepteja = Object.keys(KAANON_AVAIMET).length;
    expect(konsepteja).toBeGreaterThan(100);
    expect(TM_KAAVIO_KANON.length).toBeLessThan(konsepteja);   // odotus pysyy oikeana
  });
});

describe('B — §6: jokainen spec läpäisee validaattorin', () => {
  for (const spec of TM_KAAVIO_KANON) {
    it(`${spec.avain} on validi`, () => {
      const r = V.validoiKaavio(spec);
      expect(r.E, spec.avain + ': ' + r.E.join(' · ')).toEqual([]);
    });
  }
  it('EI-VACUOUS: rikottu spec EI läpäisisi — portti mittaa jotain', () => {
    const rikki = Object.assign({}, TM_KAAVIO_KANON[0], { pelaajat: [] });
    expect(V.validoiKaavio(rikki).E.length).toBeGreaterThan(0);
  });
  it('renderöitävyys: jokaisella on pelaajia ja kelvollinen pelimuoto', () => {
    TM_KAAVIO_KANON.forEach((s) => {
      expect((s.pelaajat || []).length, s.avain).toBeGreaterThan(0);
      expect(['5v5', '8v8', '11v11'], s.avain).toContain(s.pelimuoto);
    });
  });
});

describe('C — §32: kanonin selitteet ovat kolmikielisiä', () => {
  it('jokaisen selitteen t-kartassa on fi, sv JA en', () => {
    const vajaat = [];
    TM_KAAVIO_KANON.forEach((s) => (s.selitteet || []).forEach((se) => {
      const kielet = Object.keys((se && se.t) || {});
      ['fi', 'sv', 'en'].forEach((k) => {
        if (typeof (se.t || {})[k] !== 'string' || !se.t[k].trim()) vajaat.push(s.avain + '/' + (se.id || '?') + ' puuttuu ' + k);
      });
      expect(kielet.length, s.avain).toBeGreaterThanOrEqual(3);
    }));
    expect(vajaat).toEqual([]);
  });
  it('kanon on ERI asia kuin valmentajan vapaateksti-selite (#530)', () => {
    // Validaattori vaatii ≥1 kielen (vapaateksti); kanon tekee kolme. Molemmat ovat tosia
    // yhtä aikaa — tämä väite estää että kanon-vaatimus valuisi validaattoriin.
    const yksikielinen = { avain: 'y_h0', suunta: 'ylos', pelimuoto: '8v8',
      pelaajat: [{ id: 'P1', joukkue: 'oma', rooli: 'tuki', x: 50, y: 50 }],
      selitteet: [{ id: 's1', x: 10, y: 10, t: { fi: 'vain suomeksi' } }] };
    expect(V.validoiKaavio(yksikielinen).E).toEqual([]);
  });
});

describe('D — kanon ei ole review-silmukassa', () => {
  it('datalähteessä ei ole review-objekteja eikä statuksia', () => {
    TM_KAAVIO_KANON.forEach((s) => {
      expect(s.review, s.avain).toBeUndefined();
      expect(s.status, s.avain).toBeUndefined();
    });
  });
  it('ingest kirjoittaa { spec, kanoninen:true } — ei reviewiä', () => {
    expect(SKRIPTI).toMatch(/kentat\(\{ spec: spec, kanoninen: true \}\)/);
    expect(SKRIPTI).not.toMatch(/review:/);
  });
  it('pankki merkitsee kanoniset ja antaa seuran overriden voittaa (ennallaan)', () => {
    const fn = UI.slice(UI.indexOf('async function avaaKaaviopankki'), UI.indexOf('function _kaavioLaskuriTeksti'));
    expect(fn).toContain("collection('kaaviot')");
    expect(fn).toMatch(/kanoninen: true/);
    expect(fn).toMatch(/omatAvaimet\[d\.id\]/);          // seuran override voittaa
  });
});

describe('E — ingest: validointi ennen kirjoitusta, idempotentti', () => {
  it('doc-id = spec.avain → uudelleenajo päivittää saman dokumentin', () => {
    expect(SKRIPTI).toMatch(/BASE \+ '\/kaaviot\/' \+ encodeURIComponent\(spec\.avain\)/);
    expect(SKRIPTI).toContain("api('PATCH'");            // upsert, ei add()
  });
  it('YKSIKIN validointivirhe estää KAIKEN kirjoituksen (ei puolittaista kirjastoa)', () => {
    const i = SKRIPTI.indexOf('if (virheet.length)');
    const j = SKRIPTI.indexOf("api('PATCH'");
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);                        // esto ENNEN kirjoitusta
    expect(SKRIPTI.slice(i, SKRIPTI.indexOf('}', i) + 200)).toMatch(/process\.exit\(1\)/);
  });
  it('validointi käyttää SAMAA funktiota kuin editori', () => {
    expect(SKRIPTI).toContain('V.validoiKaavio(spec)');
    expect(SKRIPTI).toMatch(/tm_kaavio_validate\.js/);
  });
  it('DRY-RUN on oletus — kirjoitus vaatii --apply', () => {
    expect(SKRIPTI).toMatch(/const DRY_RUN = !process\.argv\.includes\('--apply'\)/);
  });
});
