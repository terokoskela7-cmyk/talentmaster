/** scripts/diag_hiljaiset_rajat.js (projekti 06): rekisteri on täydellinen suhteessa koodiin, skripti on vain lukeva ja tulostaa vain lukumääriä. */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const require = createRequire(import.meta.url);
const M = require('../scripts/diag_hiljaiset_rajat.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = readFileSync(join(ROOT, 'scripts/diag_hiljaiset_rajat.js'), 'utf8');
const LIMIT = /\.limit\((?!1\))[^)]*\)/g;   // limit(1) = olemassaolo-/avainhaku, ei rekisterissä

function elavatTiedostot() {
  const ulos = [];
  const lue = (hak, ehto) => { const p = join(ROOT, hak); if (!existsSync(p)) return; readdirSync(p).forEach((f) => { if (ehto(f)) ulos.push((hak ? hak + '/' : '') + f); }); };
  lue('', (f) => /^[^.].*\.(html|js)$/.test(f) && f !== 'eslint.config.js' && !/^vitest|^playwright/.test(f));
  lue('lib', (f) => /\.js$/.test(f)); lue('functions', (f) => /\.js$/.test(f)); lue('seura', (f) => /\.js$/.test(f)); lue('src/lib', (f) => /\.js$/.test(f));
  return ulos;
}

describe('rekisteri vs. koodi', () => {
  it('jokaisen elävän tiedoston limit(N≠1)-määrä = rekisterin n; ei rekisteröimättömiä tiedostoja', () => {
    const rekisteri = Object.fromEntries(M.REKISTERI.map((t) => [t.tiedosto, t.n]));
    const virheet = [];
    elavatTiedostot().forEach((f) => {
      const n = (readFileSync(join(ROOT, f), 'utf8').match(LIMIT) || []).length;
      const odotettu = rekisteri[f] || 0;
      if (n !== odotettu) virheet.push(f + ': koodissa ' + n + ', rekisterissä ' + odotettu);
    });
    Object.keys(rekisteri).forEach((f) => { if (!existsSync(join(ROOT, f))) virheet.push(f + ': rekisterissä, mutta tiedostoa ei ole'); });
    expect(virheet, 'Päivitä REKISTERI scripts/diag_hiljaiset_rajat.js:ssä (luokitus LEIKKAA/UUSIMMAT/RAJATTU/HAKU):\n' + virheet.join('\n')).toEqual([]);
  });
  it('n = kohtien määrä; luokat sallituista; LEIKKAA-kohdalla mittaa-avain', () => {
    M.REKISTERI.forEach((t) => {
      expect(t.kohdat.length, t.tiedosto).toBe(t.n);
      t.kohdat.forEach((k) => {
        expect(['LEIKKAA', 'UUSIMMAT', 'RAJATTU', 'HAKU']).toContain(k.luokka);
        if (k.luokka === 'LEIKKAA') expect(typeof k.mittaa, t.tiedosto + ' ' + k.haku).toBe('string');
      });
    });
  });
  it('jokaiselle LEIKKAA-mittarille on laskenta skriptissä (mittaa-avaimen aihe esiintyy mittausosassa)', () => {
    const avaimet = ['kalenteri', 'viestit', 'reflektiot', 'mentoroinnit', 'havainnot', 'harjoitusarvioinnit', 'ohjelmat', 'toimenpiteet', 'testitapahtumat', 'pelaajat', 'kirjaukset'];
    M.REKISTERI.forEach((t) => t.kohdat.filter((k) => k.luokka === 'LEIKKAA').forEach((k) => {
      const a = avaimet.find((x) => k.mittaa.indexOf(x) === 0);
      expect(a, k.mittaa).toBeTruthy();
      expect(SRC.indexOf("collection('" + a + "')"), k.mittaa).toBeGreaterThan(SRC.indexOf('async function ajaMain'));
    }));
  });
});

describe('puhtaat ytimet', () => {
  it('tila: OK < 70 %, LÄHELLÄ 70–99 %, YLITTYY ≥ 100 %; ei-numeerinen raja → null', () => {
    expect(M.tila(349, 500)).toBe('OK'); expect(M.tila(350, 500)).toBe('LÄHELLÄ'); expect(M.tila(499, 500)).toBe('LÄHELLÄ');
    expect(M.tila(500, 500)).toBe('YLITTYY'); expect(M.tila(0, 500)).toBe('OK'); expect(M.tila(5, 'ERA')).toBe(null);
  });
  it('ryhmaYhteenveto: suurin ryhmä, rajan ylittävät ja lähellä olevat', () => {
    expect(M.ryhmaYhteenveto({ a: 120, b: 80, c: 10 }, 100)).toEqual({ ryhmia: 3, suurin: 120, ylittaa: 1, lahella: 1 });
    expect(M.ryhmaYhteenveto({}, 100)).toEqual({ ryhmia: 0, suurin: 0, ylittaa: 0, lahella: 0 });
  });
  it('ikkunanAlku = 29 pv taaksepäin (kuten seuran_kooste IKKUNA_PV 30)', () => { expect(M.ikkunanAlku(Date.parse('2026-11-10T12:00:00Z'))).toBe('2026-10-12'); });
});

describe('rakenne: vain lukeva, ADC, ajovartija, vain lukumäärät', () => {
  it('ei kirjoituskutsuja', () => { expect(SRC).not.toMatch(/\.(set|update|delete|add|commit|create)\s*\(/); expect(SRC).not.toMatch(/FieldValue|writeBatch|\.batch\(/); });
  it('ADC ilman SA-avainta; require.main-vartija', () => {
    expect(SRC).not.toMatch(/credential\.cert|serviceAccount/);
    expect(SRC).toContain('admin.initializeApp({ projectId: projekti })');
    expect(SRC).toContain('if (require.main === module)');
  });
  it('tulostus ei sisällä dokumenttien sisältöä eikä tunnisteita (uid, nimi, sähköposti)', () => {
    const logit = SRC.split('\n').filter((l) => /console\.(log|error)/.test(l)).join('\n');
    expect(logit).not.toMatch(/\.data\(\)|\.email|etunimi|sukunimi|d\.id|k\.id|p\.id/);
  });
});
