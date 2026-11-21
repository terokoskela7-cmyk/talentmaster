/* PR E · Päivän harjoite -rivi Polku-välilehdellä (selain, Playwright + Chrome; Firebase stubattu tests/helpers/kt_sivu.mjs): "Omatoiminen tällä viikolla: <viikon osa> · <harjoite>" + lähde AINA.
   Lähdejärjestys (Tero 20.11.2026): (1) seuran kotiharjoite (hyväksytty, kaytto koti), joka vastaa jakson konseptia / viikon osaa; (2) muuten testidata (TalentMaster). Moottori ladataan laiskasti vasta Polku-välilehdellä. */
import { describe, it, expect } from 'vitest';
import { kaynnista, selainKaynnista, CHROME } from './helpers/kt_sivu.mjs';
const PANKKI = (rivit) => rivit.reduce((o, r, i) => { o['seurat/demo/harjoitepankki/h' + i] = Object.assign({ lahde: 'seura', tyyppi: 'T', tila: 'hyvaksytty', kaytto: 'koti', konsepti: 'y_h1', ika_min: 8, ika_max: 19, ohje: 'Kotona seinää vasten.', kesto_min: 10 }, r); return o; }, {});
const rivi = (p) => p.waitForSelector('[data-kt-omatoiminen]', { timeout: 20000 });
const tekstit = (p) => p.evaluate(() => ({ r: document.querySelector('[data-kt-omatoiminen] .kt-omat-r').textContent.trim(), l: document.querySelector('[data-kt-omat-lahde-teksti]').textContent.trim(), lahde: document.querySelector('[data-kt-omatoiminen]').getAttribute('data-kt-omat-lahde') }));
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('PR E · Polku: Omatoiminen tällä viikolla', () => {
  let selain; const avaa = async (o) => { selain = selain || await selainKaynnista(); return kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/polku' }, o)); };
  it('ei seuran riviä → testidata: rivi + "Lähde: TalentMaster"; moottori ladattu laiskasti (ei ReferenceErroria)', async () => {
    try {
      const { p, virheet } = await avaa(); await rivi(p); const t = await tekstit(p);
      expect(t.r).toMatch(/^Omatoiminen tällä viikolla: .+/); expect(t.l).toBe('Lähde: TalentMaster'); expect(t.lahde).toBe('tm'); expect(virheet.filter((v) => !/favicon|net::|sentry/i.test(v))).toEqual([]);
    } finally { await selain.close(); selain = null; }
  }, 90000);
  it('seuran hyväksytty koti-harjoite konseptille → sama rivillä, lähde seuran nimi; luonnos ja joukkue-käyttöinen eivät', async () => {
    try {
      const { p } = await avaa({ dokit: PANKKI([{ nimi: 'Luonnosliike', tila: 'luonnos' }, { nimi: 'Joukkueliike', kaytto: 'joukkue' }, { nimi: 'Seinäpeli' }]) }); await rivi(p);
      await p.waitForFunction(() => /Seinäpeli/.test((document.querySelector('[data-kt-omatoiminen]') || {}).textContent || ''), null, { timeout: 20000 });
      const t = await tekstit(p); expect(t.r).toMatch(/^Omatoiminen tällä viikolla: .+ · Seinäpeli$/); expect(t.l).toBe('Lähde: Demo FC'); expect(t.lahde).toBe('seura');
      expect(await p.evaluate(() => document.querySelector('[data-kt-omatoiminen]').textContent)).not.toMatch(/Luonnosliike|Joukkueliike/);   // vain rivin sisältö (henkilökunnan muut näkymät saavat näyttää pankin)
    } finally { await selain.close(); selain = null; }
  }, 90000);
  it('osatasolla: viikon osan (a) rivi voittaa konseptitason rivin; muun osan (e) rivi ei', async () => {
    try {
      const { p } = await avaa({ dokit: PANKKI([{ nimi: 'Konseptiliike' }, { nimi: 'Osa-A-liike', konsepti_osa: 'a' }, { nimi: 'Osa-E-liike', konsepti_osa: 'e' }]) });
      await p.waitForFunction(() => /Osa-A-liike/.test((document.querySelector('[data-kt-omatoiminen]') || {}).textContent || ''), null, { timeout: 25000 });
      expect((await tekstit(p)).r).toMatch(/Osa-A-liike$/);
    } finally { await selain.close(); selain = null; }
  }, 90000);
  it('ei jaksoa → riviä ei ole (ei virhettä)', async () => {
    try { const { p, virheet } = await avaa({ hash: '#pelaaja/p1/polku' }); await p.waitForSelector('[data-kt-jakso="ei_jaksoa"]', { timeout: 15000 }); await p.waitForTimeout(800); expect(await p.locator('[data-kt-omatoiminen]').count()).toBe(0); expect(virheet.filter((v) => !/favicon|net::|sentry/i.test(v))).toEqual([]); }
    finally { await selain.close(); selain = null; }
  }, 60000);
});
