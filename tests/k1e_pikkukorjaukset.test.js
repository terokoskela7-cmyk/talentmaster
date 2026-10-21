/* K1e (21.10.2026) · pikkukorjaukset: (1) kaaviopankin "katselmus" → hyväksyntä/kommentit · (2) ADAR-koulutus: R = Reagointi (ei Palaudu/palautuminen)
   · (3) Profiilin yhteenvedon rivi lyhyeksi "Testattu 4.10. · 2 vk" (ei katkea 390 px:ssä) · (4) sanastoportti laajempi (tests/k1d_sanasto.test.js) · erä 85 (vienti: tests/i18n_era85_vienti.test.js). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TOPIAS } from './helpers/k4a_fixturet.mjs';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const N = require('../lib/tm_eerikkila_normit.js');
globalThis.tkLajiTaso = require('../docs/testit_indeksit.js').tkLajiTaso; globalThis.normiIka = N.normiIka;
const TC = require('../lib/tm_todistekortit.js'), L = require('../lib/tm_naytto_lohkot.js'), FI = require('../lib/tm_todistekortit_fi.js');
const esc = (s) => String(s == null ? '' : s);
const viim = (p, nyt) => { const isp = L.tmNayttoDevIkaSp(p); return TC.tmTodisteMalli(p, { nyt: new Date(nyt), ika: isp.ika, sp: isp.sp, perTestTasot: N.perTestTasot, jaksoTila: 'ei_jaksoa', esc, pid: p.id }).yhteenveto.viimeisin; };
const ILMAN = Object.assign({}, TOPIAS, { hh_pvm: undefined, tki_pvm: undefined, adar_viimeisin: null, flei_pvm: undefined, flei_historia: [] });

describe('K1e 1 · kaaviopankki: ei "katselmus"-sanaa käyttäjälle', () => {
  const UI = lue('lib/tm_kaavio_ui.js'), COMMON = lue('lib/tm_i18n_common.js'), MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
  it('uudet D250-tekstit kaaviopankin UI:ssa; vanhat poissa UI:sta ja sv-kartasta', () => {
    for (const t of ['Hyväksynnän kommentit', 'Perustelu näkyy valmentajalle kommenteissa. Kerro mitä pitää korjata.', 'Seuratason kaavion asettaa valmennuspäällikkö hyväksynnässä.', 'muokkaus vie takaisin hyväksyttäväksi',
      'Teknis-taktiset kaaviot. Kanoniset ovat kaikille yhteisiä; seuran omat kulkevat hyväksynnän kautta.', 'Valitse mitä kaavio opettaa. Piirto avautuu seuraavaksi; kaavio tallentuu luonnoksena ja menee hyväksyttäväksi.']) expect(UI, t).toContain("_kuiT('" + t + "')");
    const nakyva = (s) => (s.match(/_kuiT\('[^']*'\)/g) || []).join('\n');
    expect(nakyva(UI)).not.toMatch(/katselm/i); expect(COMMON).not.toMatch(/katselm|[Gg]ranskning/);
    for (const H of [MASTER, VP]) { expect(H).toContain('title="Taktiikkataulu — teknis-taktiset kuvat ja hyväksyntä"'); expect(H).toContain('data-i18n-title="Taktiikkataulu — teknis-taktiset kuvat ja hyväksyntä"'); expect(H).not.toContain('kuvat, katselmus ja hyväksyntä'); }
  });
});

describe('K1e 2 · ADAR-koulutus: R = Reagointi', () => {
  const K = lue('TalentMaster_ADAR_Koulutus.html'), nakyva = K.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');   // näkyvä teksti
  it('mallin neljäs vaihe on Reagoi (kirjain R), ei Palaudu eikä palautuminen', () => {
    expect(nakyva.replace('Pelaajan fyysinen palautuminen rasituksesta ei kuulu ADARiin.', '')).not.toMatch(/Palaudu|palautumi|Palautumi/);   // vain rajaus-lause sallittu expect(nakyva).toContain('Reagoi'); expect(nakyva).toContain('Havaitse · Päätä · Toimi · Reagoi'); expect(nakyva).toContain('reagoi tilanteen jälkeen');
    expect(K).toMatch(/<span class="hero-vaihe-kirjain">R<\/span>\s*Reagoi/); expect(K).toContain('<div class="vaihe-kirjain">R</div>'); expect(K).not.toMatch(/<(?:span|div) class="(?:hero-)?vaihe-kirjain">J</);
  });
  it('fyysinen palautuminen rajattu ADARin ulkopuolelle ja harjoituksen oikea vastaus löytyy (JS-vertailu = näkyvä nimi)', () => {
    expect(K).toContain('Pelaajan fyysinen palautuminen rasituksesta ei kuulu ADARiin');
    expect(K).toContain("'Toimi' : 'Reagoi') >= 0"); expect((K.match(/tarkistaVastaus\(\d, 'J', this\)">🔄 Reagoi</g) || []).length).toBe(2);
  });
});

describe('K1e 3 · Profiili: "Testattu 4.10. · 2 vk" (lyhyt, ei katkea 390 px:ssä)', () => {
  const rivi = (iso) => viim(Object.assign({}, ILMAN, { hh_pvm: iso }), '2026-10-19T12:00:00');
  it('Topias: "Testattu 4.10. · 2 vk"', () => { expect(viim(TOPIAS, '2026-10-19T12:00:00')).toBe('Testattu 4.10. · 2 vk'); });
  it('ikämuodot: tänään · pv · vk · kk; ei sanaa "sitten"; ≤ 24 merkkiä (mahtuu 390 px:n riville)', () => {
    expect(rivi('2026-10-19')).toBe('Testattu 19.10. · tänään'); expect(rivi('2026-10-14')).toBe('Testattu 14.10. · 5 pv');
    expect(rivi('2026-09-21')).toBe('Testattu 21.9. · 4 vk'); expect(rivi('2026-06-19')).toBe('Testattu 19.6. · 4 kk');
    for (const d of ['2026-10-19', '2026-10-14', '2026-10-04', '2026-09-21', '2026-06-19']) { expect(rivi(d)).not.toMatch(/sitten|Viimeisin/); expect(rivi(d).length).toBeLessThanOrEqual(24); }
  });
  it('yli 11 kk vanha: vuosi mukaan (ei monitulkintaista "4.10.")', () => { expect(rivi('2025-09-01')).toBe('Testattu 1.9.2025 · 14 kk'); });
  it('fi-avaimet lyhyitä; vanha "Viimeisin testi" poistettu', () => {
    expect(FI.tc_viimeisin_testi).toBe('Testattu {pvm} · {ika}'); expect(FI.tc_ika_lyh_vk).toBe('{n} vk'); expect(JSON.stringify(FI)).not.toContain('Viimeisin testi');
  });
});
