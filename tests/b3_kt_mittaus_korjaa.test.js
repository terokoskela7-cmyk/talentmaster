/* B3 · Kehitystyöpöydän Korjaa = VP:n E2.3-polku (lib/tm_mittaus_korjaa.js). Node-osuus:
   (1) rivinKohde: näkymärivi → TASAN yksi testitulos (sama katalogitesti + päivä), H-H:n syöttö/pujottelu = *_hh, CMJ = hyppy_cj, mitätöity / SM / kasvu / moniselitteinen → ei linkkiä;
   (2) sivut lataavat samat rebuild-riippuvuudet: Kehitystyöpöydän ja VP:n skriptijoukoilla tmRakennaPikakentatArkistosta antaa SAMAN tuloksen (ml. hh_historia / tki_historia);
   (3) sivun liima: sama lib, kirjoitusoikeus _voiKirjoittaa, ei omaa kirjoituspolkua (ei testitulokset-set/add Korjaa-lohkossa). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const MK = require('../lib/tm_mittaus_korjaa.js'), K = require('../lib/tm_testikatalogi.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const KT = lue('TalentMaster_Kehitystyopoyta.html'), VP = lue('TalentMaster_VP_v25.html');

const DOCS = [
  { __id: '2026-10-04_hh', data: { testauspvm: '2026-10-04', protokolla: 'hh', testit: { lin30m: 3.08, hyppy_cj: 34, pujottelu_hh: 12.3 } } },
  { __id: '2026-04-12_hh', data: { testauspvm: '2026-04-12', protokolla: 'hh', testit: { lin_30m: 3.17, hyppy_cj: 33 }, mitatoidut: { hyppy_cj: { kuka: 'u', milloin: 'x' } } } },
  { __id: '2026-10-04_tk', data: { testauspvm: '2026-10-04', protokolla: 'tk', testit: { pujottelu: 23.9, syotto: 44.1, kuljetus_laukaus: { raaka: 18.5, rangaistukset: [5], ennenaikaiset: 0, netto: 13.5 } } } },
  { __id: '2026-10-04_tk2', data: { testauspvm: '2026-10-04', protokolla: 'tk', testit: { ponnauttelu: 30 } } },
  { __id: '2026-10-04_tk3', data: { testauspvm: '2026-10-04', protokolla: 'tk', testit: { ponnauttelu: 31.8 } } }];
const ROWS = MK.merkinnat(DOCS, K);
const kohde = (id, lahde, pvm) => MK.rivinKohde({ id, lahde, viimeisin: { pvm } }, ROWS);

describe('B3 · rivinKohde: Kaikki mittaukset -rivi → korjattava testitulos', () => {
  it('fyysinen: lin30m (sekamuotoinen avain säilyy), cmj = hyppy_cj; vain viimeisin päivä', () => {
    expect(kohde('lin30m', 'hh', '2026-10-04')).toEqual({ dokkiId: '2026-10-04_hh', avain: 'lin30m' });
    expect(kohde('lin30m', 'hh', '2026-04-12')).toEqual({ dokkiId: '2026-04-12_hh', avain: 'lin_30m' });
    expect(kohde('cmj', 'hh', '2026-10-04')).toEqual({ dokkiId: '2026-10-04_hh', avain: 'hyppy_cj' });
    expect(kohde('cmj', 'hh', '2026-04-12')).toBe(null);   // mitätöity → ei korjausta (palautus kuuluu VP:n listalle)
    expect(kohde('lin30m', 'hh', '2026-10-05')).toBe(null);
  });
  it('tekninen: H-H-pujottelu → pujottelu_hh; TK-pujottelu ja komposiitti omasta dokista; kaksi samaa päivää → ei linkkiä', () => {
    expect(kohde('pujottelu', 'hh', '2026-10-04')).toEqual({ dokkiId: '2026-10-04_hh', avain: 'pujottelu_hh' });
    expect(kohde('pujottelu', 'tk', '2026-10-04')).toEqual({ dokkiId: '2026-10-04_tk', avain: 'pujottelu' });
    expect(kohde('kuljetus_laukaus', 'tk', '2026-10-04')).toEqual({ dokkiId: '2026-10-04_tk', avain: 'kuljetus_laukaus' });
    expect(kohde('ponnauttelu', 'tk', '2026-10-04')).toBe(null);   // moniselitteinen
    expect(kohde('syotto', 'hh', '2026-10-04')).toBe(null);        // H-H-syöttöä ei mitattu
  });
  it('SM (päivä arvio), kasvu, peli ja päivätön rivi → ei linkkiä', () => {
    expect(kohde('sm_juoksu', 'sm', '2026-10-04')).toBe(null); expect(kohde('pituus', 'kasvu', '2026-10-04')).toBe(null);
    expect(MK.rivinKohde({ id: 'lin30m', lahde: 'hh', viimeisin: { pvm: null } }, ROWS)).toBe(null); expect(MK.rivinKohde(null, ROWS)).toBe(null);
  });
});

/* Sivun skriptijoukko vm:ään (latausjärjestyksessä) → tmRakennaPikakentatArkistosta. */
function rebuild(html, tiedostot) {
  const srcs = [...html.matchAll(/<script src="((?:lib|docs)\/[a-z_0-9]+\.js)/g)].map((m) => m[1]).filter((f) => tiedostot.indexOf(f) >= 0);
  const sb = { console: { log() {}, warn() {}, error() {} } }; sb.window = sb; sb.globalThis = sb; vm.createContext(sb);
  srcs.forEach((f) => vm.runInContext(lue(f), sb, { filename: f }));
  return { srcs, f: sb.tmRakennaPikakentatArkistosta };
}
const REB = ['lib/tm_eerikkila_normit.js', 'lib/tm_phv_tila.js', 'lib/tm_historia.js', 'lib/tm_tki_core.js', 'docs/testit_indeksit.js', 'lib/tm_testipaiva.js', 'lib/tm_pikakentat.js'];
describe('B3 · Kehitystyöpöytä lataa samat rebuild-riippuvuudet kuin VP', () => {
  it('sama tulos (pikakentät + historiat + poistettavat) molempien sivujen skripteillä', () => {
    const kt = rebuild(KT, REB), vp = rebuild(VP, REB);
    expect(kt.srcs).toEqual(expect.arrayContaining(['lib/tm_eerikkila_normit.js', 'lib/tm_historia.js', 'lib/tm_pikakentat.js']));
    expect(typeof kt.f).toBe('function');
    const p = { id: 'x', syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', hh_viimeisin: { lin30m: 9 }, hh_pvm: '2025-01-01', vanha_kentta: 1 };
    const merk = MK.rebuildMerkinnat(DOCS, K), a = kt.f(Object.assign({}, p), merk), b = vp.f(Object.assign({}, p), merk);
    expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
    expect(a.upd.hh_viimeisin.lin30m).toBe(3.08); expect(Array.isArray(a.upd.hh_historia)).toBe(true); expect(Array.isArray(a.upd.tki_historia)).toBe(true);
  });
});

describe('B3 · Kehitystyöpöydän liima: sama kirjoituspolku, sama oikeussääntö', () => {
  const i = KT.indexOf('/* B3 · Korjaa mittaus'), j = KT.indexOf('window._ktMkAvaa = function', i), lohko = KT.slice(i, KT.indexOf('\n', j));
  it('lohko käyttää jaettua libiä (korjaa + dialogi + rebuildKirjoita) ja _voiKirjoittaa; ei omia kirjoituksia testituloksiin', () => {
    expect(i).toBeGreaterThan(0);
    for (const x of ['MK.korjaa(', 'MK.dialogi(', 'MK.rebuildKirjoita(', 'voiMuokata: _voiKirjoittaa', '_voiKirjoittaa(p)', "rakenna: window.tmRakennaPikakentatArkistosta"]) expect(lohko, x).toContain(x);
    expect(lohko).not.toMatch(/\.(set|add|update)\(/);   // ainoa kirjoitus = libin E2.3/E2.2
    expect(KT).toContain('<script src="lib/tm_mittaus_korjaa.js"></script>'); expect(VP).toContain('<script src="lib/tm_mittaus_korjaa.js"></script>');
  });
});
