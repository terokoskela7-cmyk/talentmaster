/* B3 · VP:n Korjaa mittaus -dialogi oikeassa selaimessa jaetun libin (lib/tm_mittaus_korjaa.js) jälkeen: VP_v25 lataa libin, kääreet ovat olemassa ja dialogi piirtyy VP-tokeneilla
   molemmissa teemoissa (kentät eivät läpinäkyviä, otsikko Cormorant), Tallenna palauttaa luvun ja Esc nullin. Kirjoituspolku on karakterisoitu vm:ssä (b3_vp_mittaus_korjaa_karakterisointi).
   Ajetaan vain chrome-tests-jobissa (tests/helpers/chrome_ajo.mjs). Sivu OS:n tmp-hakemistoon + <base href> repoon (kuten vp_koti_pulssi_selain). */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CHROME_KAYTOSSA, kaynnistaSelain, avaaSivu } from './helpers/chrome_ajo.mjs';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|firebase|appCheck|Failed to load resource|net::ERR/i.test(e));
const MITTAA = async (teema) => {
  document.documentElement.setAttribute('data-theme', teema);
  const tulos = { lib: typeof window.TM_MITTAUS_KORJAA, kaare: typeof window._vpMittausKorjaa, dialogi: typeof _vpMittausKorjaaDialog };
  const lupaus = _vpMittausKorjaaDialog({ nimi: 'Lineaarinopeus 30m', yksikko: 's', arvo: 4.82, pvm: '2026-09-10', komposiitti: null });
  const ov = document.body.lastElementChild, paneeli = ov.firstElementChild, cs = (el) => getComputedStyle(el), inp = ov.querySelector('[data-act=arvo]');
  Object.assign(tulos, { z: ov.style.zIndex, paneeliBg: cs(paneeli).backgroundColor, juuriBg2: cs(document.documentElement).getPropertyValue('--bg2').trim(), kenttaBg: cs(inp).backgroundColor,
    otsikko: paneeli.firstElementChild.textContent, otsikkoFontti: cs(paneeli.firstElementChild).fontFamily, arvo: inp.value, fokus: document.activeElement === inp });
  inp.value = '4.71'; ov.querySelector('[data-act=ok]').click(); tulos.tallenna = await lupaus; tulos.suljettu = !document.body.contains(ov);
  const l2 = _vpMittausKorjaaDialog({ nimi: 'Kuljetus-laukaus (netto s)', yksikko: 's', arvo: 15, pvm: '2026-09-20', komposiitti: { raaka: 20, rangaistukset: [5], ennenaikaiset: 0, netto: 15 } });
  const ov2 = document.body.lastElementChild; tulos.netto = ov2.querySelector('[data-act=netto]').textContent; tulos.kentat = ov2.querySelectorAll('input').length;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); tulos.esc = await l2;
  return tulos;
};
describe.skipIf(!CHROME_KAYTOSSA)('B3 · VP:n Korjaa mittaus -dialogi jaetusta libistä (selain)', () => {
  let selain, hak, sivu;
  beforeAll(async () => {
    hak = mkdtempSync(join(tmpdir(), 'tm-b3-vp-')); sivu = join(hak, 'vp.html');
    const h = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8'), j = h.indexOf('<head>') + 6;
    writeFileSync(sivu, h.slice(0, j) + '<base href="file://' + juuri + '/">' + h.slice(j));
    selain = await kaynnistaSelain();
  }, 60000);
  afterAll(async () => { if (selain) await selain.close(); if (hak) rmSync(hak, { recursive: true, force: true }); }, 30000);
  for (const teema of ['dark', 'light']) {
    it(teema + ': lib ladattu, dialogi VP-tokeneilla (paneeli = --bg2, kenttä ei läpinäkyvä, Cormorant), Tallenna → luku, Esc → null', async () => {
      const s = await avaaSivu(selain, { tiedosto: sivu }, { viewport: { width: 1280, height: 900 }, odota: () => typeof window._vpMittausKorjaaDialog === 'function' && !!window.TM_MITTAUS_KORJAA, aikaraja: 30000 });
      try {
        const t = await s.p.evaluate(MITTAA, teema);
        expect(t.lib).toBe('object'); expect(t.kaare).toBe('function'); expect(t.dialogi).toBe('function'); expect(t.z).toBe('500');
        expect(t.otsikko).toBe('Korjaa mittaus'); expect(t.otsikkoFontti).toContain('Cormorant');
        expect(t.kenttaBg).not.toBe('rgba(0, 0, 0, 0)'); expect(t.paneeliBg).not.toBe('rgba(0, 0, 0, 0)');
        expect(t.arvo).toBe('4.82'); expect(t.fokus).toBe(true); expect(t.tallenna).toBe(4.71); expect(t.suljettu).toBe(true);
        expect(t.netto).toBe('15'); expect(t.kentat).toBe(3); expect(t.esc).toBe(null);
        expect(SUODATA(s.virheet)).toEqual([]);
      } finally { await s.sulje(); }
    }, 60000);
  }
});
