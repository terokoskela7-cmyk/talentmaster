/* PM 12.11.2026: xlsx (SheetJS) ei lataudu sivun avauksessa (Seura, Master) vaan vasta Excel-tuonnissa/-viennissä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';
const lue = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const LOADER = lue('lib/tm_xlsx_laiska.js'), CDN = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function ymp(kayttaytyminen) {
  const lisatty = [], w = { Promise };
  w.document = { head: { appendChild(el) { lisatty.push(el.src); el.parentNode = { removeChild() {} }; setTimeout(() => { if (kayttaytyminen(lisatty.length) === 'ok') { w.XLSX = { versio: 1 }; el.onload(); } else el.onerror(); }, 1); } }, createElement: () => ({}) };
  w.window = w; vm.createContext(w); vm.runInContext(LOADER, w); return { w, lisatty };
}

describe('tmXlsxLataa', () => {
  it('lataa CDN-skriptin kerran; rinnakkaiset kutsut jakavat lupauksen; valmis XLSX → ei uutta latausta', async () => {
    const { w, lisatty } = ymp(() => 'ok');
    const [a, b] = await Promise.all([w.tmXlsxLataa(), w.tmXlsxLataa()]); expect(a).toBe(b); expect(lisatty).toEqual([CDN]);
    await w.tmXlsxLataa(); expect(lisatty.length).toBe(1);
  });
  it('epäonnistunut lataus heittää ja nollaa lupauksen → seuraava yritys hakee uudelleen', async () => {
    const { w, lisatty } = ymp((n) => (n === 1 ? 'virhe' : 'ok'));
    await expect(w.tmXlsxLataa()).rejects.toThrow('xlsx-lataus'); expect(await w.tmXlsxLataa()).toEqual({ versio: 1 }); expect(lisatty.length).toBe(2);
  });
});

describe('Seura + Master: xlsx ei staattisena <script>-tagina', () => {
  ['TalentMaster_Seura.html', 'TalentMaster_Master_v16.html'].forEach((f) => it(f + ': ei CDN-tagia, laiska lataaja mukana', () => {
    const h = lue(f); expect(h).not.toMatch(/<script[^>]*xlsx\.full\.min\.js/); expect(h).toContain('<script src="lib/tm_xlsx_laiska.js"></script>');
  }));
  it('kutsupaikat odottavat latauksen ENNEN XLSX-käyttöä (Master-vienti, Seura-pohja, Seura-lukeminen)', () => {
    const m = lue('TalentMaster_Master_v16.html'), a = m.indexOf('async function _generoiExcel'); expect(m.indexOf('await window.tmXlsxLataa()', a)).toBeGreaterThan(a); expect(m.indexOf('await window.tmXlsxLataa()', a)).toBeLessThan(m.indexOf('XLSX.utils.book_new()', a));
    const t = lue('seura/seura_tuonti.js'); const kaikki = [...t.matchAll(/await window\.tmXlsxLataa\(\)/g)].length; expect(kaikki).toBe(2);
    expect(t.indexOf('await window.tmXlsxLataa()')).toBeLessThan(t.indexOf('XLSX.utils.book_new()')); expect(t.lastIndexOf('await window.tmXlsxLataa()')).toBeLessThan(t.indexOf('XLSX.read('));
    expect(t).not.toContain("typeof XLSX === 'undefined'");
  });
});
