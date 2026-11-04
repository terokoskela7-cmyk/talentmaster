/* B3 — VP:n Korjaa mittaus -dialogin KARAKTERISOINTI (E2.3/E2.3.1). Tallennettu ennen dialogin siirtoa jaettuun libiin (lib/tm_mittaus_korjaa.js):
   peittokerroksen tyyli + markup skalaarille ja komposiitille (kuljetus_laukaus) sekä palautusarvot (Tallenna, Peruuta, Escape, Enter, taustaklikki, raaka puuttuu).
   DOM-tynkä (repon konventio, ei jsdom). Fixtuuri: tests/fixtures/b3_vp_dialogi.json (TM_B3_TALLENNA=1 → uudelleen). */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const VP = readFileSync(new URL('../TalentMaster_VP_v25.html', import.meta.url), 'utf8');
const FIX = new URL('./fixtures/b3_vp_dialogi.json', import.meta.url);
const lohko = () => { const i = VP.indexOf('var _vpMittausCache = {};'), j = VP.indexOf('// R2 (pala 1)', i); return VP.slice(i, j); };

function dom() {
  const kuuntelijat = { keydown: [] }, body = { lapset: [], appendChild(e) { this.lapset.push(e); e.parentNode = body; }, removeChild(e) { this.lapset = this.lapset.filter((x) => x !== e); e.parentNode = null; } };
  const elementti = () => {
    const el = { style: {}, parentNode: null, _html: '', _kuuntelijat: {}, _osat: {},
      set innerHTML(h) { el._html = h; el._osat = {}; (h.match(/data-act="(\w+)"/g) || []).forEach((m) => { const a = m.slice(10, -1); const v = (h.match(new RegExp('data-act="' + a + '"[^>]*value="([^"]*)"')) || [])[1]; el._osat[a] = { value: v != null ? v.replace(/&amp;/g, '&') : '', style: {}, textContent: '', _k: {}, addEventListener(t, f) { (this._k[t] = this._k[t] || []).push(f); }, focus() {}, select() {} }; }); },
      get innerHTML() { return el._html; },
      querySelector(s) { const a = (/data-act=(\w+)/.exec(s) || [])[1]; return el._osat[a] || null; },
      addEventListener(t, f) { (el._kuuntelijat[t] = el._kuuntelijat[t] || []).push(f); } };
    return el;
  };
  const document = { body, createElement: elementti, getElementById: () => null, addEventListener(t, f) { (kuuntelijat[t] = kuuntelijat[t] || []).push(f); }, removeEventListener(t, f) { kuuntelijat[t] = (kuuntelijat[t] || []).filter((x) => x !== f); } };
  return { document, kuuntelijat };
}
function avaa(opts) {
  const d = dom(), sb = { console, Object, JSON, Math, Date, Array, String, Number, parseFloat, parseInt, isNaN, Promise, RegExp, document: d.document, vpT: (s) => '⟨' + s + '⟩', _pvmFiVP: (x) => x.toISOString().slice(0, 10), TM_TESTIKATALOGI: require('../lib/tm_testikatalogi.js') };
  if (existsSync(new URL('../lib/tm_mittaus_korjaa.js', import.meta.url))) sb.TM_MITTAUS_KORJAA = require('../lib/tm_mittaus_korjaa.js');
  sb.window = sb; vm.createContext(sb); vm.runInContext(lohko(), sb);
  const lupaus = sb._vpMittausKorjaaDialog(opts), ov = d.document.body.lapset[0];
  return { lupaus, ov, d, osa: (a) => ov._osat[a] };
}
const SKAL = { nimi: 'Lineaarinopeus 30m', yksikko: 's', arvo: 4.82, pvm: '2026-09-10', komposiitti: null };
const KOMP = { nimi: 'Kuljetus-laukaus (netto s)', yksikko: 's', arvo: 15, pvm: '2026-09-20', komposiitti: { raaka: 20, rangaistukset: [5], ennenaikaiset: 0, netto: 15 } };
const klik = (el) => (el._k.click || []).forEach((f) => f({}));

async function aja() {
  const u = {};
  let x = avaa(SKAL); u.skalaari = { tyyli: x.ov.style.cssText, html: x.ov.innerHTML };
  x.osa('arvo').value = '4.71'; klik(x.osa('ok')); u.skalaari_tallenna = await x.lupaus; u.skalaari_suljettu = x.d.document.body.lapset.length;
  x = avaa(SKAL); x.osa('arvo').value = 'abc'; klik(x.osa('ok')); u.skalaari_ei_numero = await x.lupaus;
  x = avaa(SKAL); klik(x.osa('peru')); u.skalaari_peru = await x.lupaus;
  x = avaa(SKAL); x.d.kuuntelijat.keydown.forEach((f) => f({ key: 'Escape' })); u.skalaari_esc = await x.lupaus; u.esc_kuuntelija_pois = x.d.kuuntelijat.keydown.length;
  x = avaa(SKAL); x.osa('arvo').value = '4.6'; x.d.kuuntelijat.keydown.forEach((f) => f({ key: 'Enter' })); u.skalaari_enter = await x.lupaus;
  x = avaa(SKAL); (x.ov._kuuntelijat.click || []).forEach((f) => f({ target: x.ov })); u.skalaari_tausta = await x.lupaus;
  x = avaa(KOMP); u.komposiitti = { tyyli: x.ov.style.cssText, html: x.ov.innerHTML, netto_alussa: x.osa('netto').textContent };
  x.osa('raaka').value = '19'; x.osa('ennen').value = '1'; x.osa('rang').value = '5, 10'; (x.osa('rang')._k.input || []).forEach((f) => f({})); u.komposiitti_netto = x.osa('netto').textContent;
  klik(x.osa('ok')); u.komposiitti_tallenna = await x.lupaus;
  x = avaa(KOMP); x.osa('raaka').value = ''; klik(x.osa('ok')); u.komposiitti_raaka_puuttuu_virhe = x.osa('err').style.display; u.komposiitti_raaka_puuttuu_auki = x.d.document.body.lapset.length; klik(x.osa('peru')); u.komposiitti_peru = await x.lupaus;
  return u;
}

describe('B3 · VP:n Korjaa mittaus -dialogi ennallaan (karakterisointi)', () => {
  it('markup, tyyli ja palautusarvot = tallennettu VP:n dialogi', async () => {
    const nyt = await aja();
    if (process.env.TM_B3_TALLENNA === '1' || !existsSync(FIX)) { writeFileSync(FIX, JSON.stringify(nyt, null, 1) + '\n'); if (process.env.TM_B3_TALLENNA !== '1') throw new Error('fixtuuri puuttui → luotiin; aja uudelleen'); }
    expect(nyt).toEqual(JSON.parse(readFileSync(FIX, 'utf8')));
  });
  it('fixtuuri on mielekäs: tekstit kulkevat kääntäjän läpi; Tallenna/Enter palauttaa luvun tai komposiitin, Peruuta/Esc/tausta null; raaka puuttuu → virhe, dialogi auki', () => {
    const f = JSON.parse(readFileSync(FIX, 'utf8'));
    expect(f.skalaari.html).toContain('⟨Korjaa mittaus⟩'); expect(f.skalaari.html).toContain('value="4.82"'); expect(f.komposiitti.html).toContain('⟨Rangaistukset (pilkuin eroteltu, esim. 5, 10)⟩');
    expect(f.skalaari_tallenna).toBe(4.71); expect(f.skalaari_suljettu).toBe(0); expect(f.skalaari_ei_numero).toBe(null); expect(f.skalaari_peru).toBe(null); expect(f.skalaari_esc).toBe(null); expect(f.esc_kuuntelija_pois).toBe(0); expect(f.skalaari_enter).toBe(4.6); expect(f.skalaari_tausta).toBe(null);
    expect(f.komposiitti_netto).toBe(14);   // max(0, 19 + 1·10 − (5+10)) expect(f.komposiitti_tallenna).toEqual({ raaka: 19, rangaistukset: [5, 10], ennenaikaiset: 1 });
    // Tekstigate (VP:n render-gate ei enää näe dialogia, joka on libissä): näkyvä teksti = kääntäjän läpi kulkenut ⟨…⟩ + data (nimi, yksikkö, päivä, luvut) — ei kovakoodattua suomea.
    for (const [h, o] of [[f.skalaari.html, SKAL], [f.komposiitti.html, KOMP]]) {
      const jaljella = h.replace(/<[^>]*>/g, ' ').replace(/⟨[^⟩]*⟩/g, ' ').split(o.nimi).join(' ').replace(/\b(s|ms|—)\b/g, ' ').replace(o.pvm, ' ');
      expect(jaljella, 'kovakoodattu teksti dialogissa').not.toMatch(/\p{L}{2,}/u);
    }
    expect(f.komposiitti_raaka_puuttuu_virhe).toBe('block'); expect(f.komposiitti_raaka_puuttuu_auki).toBe(1); expect(f.komposiitti_peru).toBe(null);
  });
});
