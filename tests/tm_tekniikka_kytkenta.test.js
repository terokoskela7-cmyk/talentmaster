/* Tekniikan määritelmä PR 2 — kytkentä (docs/TEKNIIKKA_MAARITELMA.md §2.4, §7): YKSI funktio (lib/tm_tekniikka.js) → huomio, ehdotus, Tilanne ja Kodin pulssi.
 * KOVA VAATIMUS: huomio ja ehdotus antavat samalle datalle saman joukkuemäärän (ja saman joukkuejoukon). Ehdotus ajetaan oikeasta VP_v25-lähteestä (TP_SIGNAALIT, vm),
 * huomio oikealla Tilanne-mallilla, pulssi oikealla Koti-mallilla. Datana fixturet + muunnelmat (kaikki heikoiksi, kaikki vanhoiksi, ei dataa, ryhmät). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = require('../lib/tm_tekniikka.js'), TT = require('../lib/tm_vp_tilanne.js'), KK = require('../lib/tm_vp_koti.js'), PU = require('../lib/tm_seuran_pulssi.js'), J = require('../lib/tm_joukkue.js');
const F = require('./helpers/vp_fixture.cjs'), { funktio } = require('./helpers/vp_koti_sandbox.cjs');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const NYT = Date.UTC(2026, 9, 10, 12), DAY = 86400000;

/* VP_v25:n TP_SIGNAALIT oikeasta lähteestä: sama koodi kuin selaimessa (tki_alhainen.tarkista(joukkueenNimi, pelaajat)) */
function lataaTP() {
  const alku = VP.indexOf('const TP_SIGNAALIT = ['), lines = VP.slice(alku).split('\n'), loppu = lines.findIndex((l) => l.trim() === '];');
  const lohko = lines.slice(0, loppu + 1).join('\n');
  const ctx = { Date, window: { TM_TEKNIIKKA: T }, console };
  vm.createContext(ctx);
  vm.runInContext(funktio(VP, '_pJNimet') + '\n' + funktio(VP, '_pOnJoukkueessa') + '\n' + lohko + '\nthis.TP = TP_SIGNAALIT;', ctx);
  ctx.Date = Date;   // tarkista käyttää Date.now() → pakotetaan testin kello alla
  return ctx.TP.find((x) => x.id === 'tki_alhainen');
}
function nimetPelaajille(d) {   // kuten VP_v25: _jNimet = tmPelaajanJoukkueet-id:t nimiksi
  const nimet = {}; d.joukkueDocs.forEach((j) => { nimet[j.id] = j.nimi; });
  return d.pelaajat.map((p) => Object.assign({}, p, { _jNimet: J.tmPelaajanJoukkueet(p, d.joukkueDocs).map((id) => nimet[id] || id) }));
}
/* Kaikki kolme lukua samasta datasta */
function luvut(d, nyt) {
  const pel = nimetPelaajille(d), TP = lataaTP();
  const realDateNow = Date.now; Date.now = () => nyt;
  try {
    const nimet = d.joukkueDocs.map((j) => j.nimi);
    const ehdotus = nimet.filter((n) => pel.some((p) => p._jNimet.indexOf(n) >= 0) && TP.tarkista(n, pel));
    const y = T.tmTekniikkaYhteenveto(d.pelaajat, d.joukkueDocs, nyt);
    const tekniikkaRivit = d.joukkueDocs.map((jd) => Object.assign({ nimi: jd.nimi }, T.tmJoukkueTekniikka(d.pelaajat, d.joukkueDocs, jd.id, nyt))).filter((r) => r.yht > 0);
    const syote = Object.assign({}, d.syote, { nytMs: nyt, tekniikka: tekniikkaRivit });
    const m = TT.tmTilanneMalli(syote);
    const huomio = []; m.huomiot.forEach((x) => { if (x.tyyppi === 'ryhma' && x.kind === 'tekniikka') x.joukkueet.forEach((j) => huomio.push(j.nimi)); else if (x.tyyppi === 'joukkue' && x.kinds.indexOf('tekniikka') >= 0) huomio.push(x.joukkue); });
    const rm = KK.tmKotiRytmiMalli(PU.tmPulssiRivit(d.koosteet, { nytMs: nyt, ensimmainenVk: d.ensin, katselmusPv: {}, jaksoVk: d.jaksoVk, kuittaukset: [] }), { yhteensa: (d.koosteet[d.koosteet.length - 1] || {}).yhteensa, koosteJ: (d.koosteet[d.koosteet.length - 1] || {}).joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: [], viestit: [], nytMs: nyt, tekniikka: y });
    const koti = rm.entries.find((e) => e.tyyppi === 'tekniikka');
    return { ehdotus: ehdotus.sort(), huomio: huomio.sort(), yhteenveto: y, tilanneM: m, kotiN: koti ? koti.n : 0, kotiEi: koti ? koti.eiData : (y.eiTekniikkadataa) };
  } finally { Date.now = realDateNow; }
}
const muunna = (d, f) => Object.assign({}, d, { pelaajat: d.pelaajat.map(f) });

describe('YKSI määritelmä: huomio = ehdotus = Kodin pulssi (sama joukkuejoukko ja -määrä)', () => {
  for (const tila of ['pilotti', 'kypsa', 'kuormitus']) {
    it(tila + ': huomio, ehdotus (VP_v25 TP_SIGNAALIT), Tilanne-yhteenveto ja Kodin pulssi antavat saman joukkuemäärän ja -joukon', () => {
      const d = F.lataa(tila, NYT), r = luvut(d, NYT);
      expect(r.yhteenveto.kehityskohde, tila).toBeGreaterThan(0);                       // ei triviaali: jotain löytyy
      expect(r.ehdotus.length, tila).toBe(r.yhteenveto.kehityskohde);
      expect(r.huomio.length, tila).toBe(r.yhteenveto.kehityskohde);
      expect(r.kotiN, tila).toBe(r.yhteenveto.kehityskohde);
      expect(r.huomio, tila).toEqual(r.ehdotus);                                       // sama joukkuejoukko
      expect(r.tilanneM.tekniikka.kehityskohde, tila).toBe(r.yhteenveto.kehityskohde);
      expect(r.tilanneM.tekniikka.eiTekniikkadataa, tila).toBe(r.yhteenveto.eiTekniikkadataa);
    });
  }
  it('fixturen ehdotukset (tki_alhainen) johdetaan samasta funktiosta', () => {
    for (const tila of ['pilotti', 'kypsa', 'kuormitus']) { const d = F.lataa(tila, NYT), e = d.syote.ehdotukset.find((x) => x.signaali === 'tki_alhainen'); expect(e ? e.joukkueet.length : 0, tila).toBe(d.tekniikka.kehityskohde); }
  });
  it('muunnelmat: kaikki heikoiksi · kaikki vanhoiksi · ei mitään · vain neutraaleja · puolet SM-pelaajista sukupuoli puuttuu', () => {
    const d0 = F.lataa('kypsa', NYT);
    const heikko = muunna(d0, (p) => (p.tki_viimeisin != null ? Object.assign({}, p, { tki_viimeisin: 5 }) : p.sm_pallo_viimeisin != null ? Object.assign({}, p, { sm_pallo_viimeisin: 99, sm_juoksu_viimeisin: 5 }) : p));
    const vanha = muunna(d0, (p) => Object.assign({}, p, p.tki_pvm ? { tki_pvm: '2023-01-01' } : {}, p.tsi_pvm ? { tsi_pvm: '2023-01-01' } : {}));
    const eiMitaan = muunna(d0, (p) => { const q = Object.assign({}, p); ['tki_viimeisin', 'tki_pvm', 'sm_pallo_viimeisin', 'sm_juoksu_viimeisin', 'tsi_viimeisin', 'tsi_pvm'].forEach((k) => delete q[k]); return q; });
    const neutraali = muunna(d0, (p) => (p.sm_pallo_viimeisin != null ? Object.assign({}, p, { sm_pallo_viimeisin: 99, sm_juoksu_viimeisin: 99 }) : p));
    const spPuuttuu = muunna(d0, (p) => { if (p.sm_pallo_viimeisin == null || p.id.length % 2) return p; const q = Object.assign({}, p, { joukkue: 'Blå' }); delete q.sukupuoli; return q; });
    for (const [nimi, d] of [['heikko', heikko], ['vanha', vanha], ['eiMitaan', eiMitaan], ['neutraali', neutraali], ['spPuuttuu', spPuuttuu]]) {
      const r = luvut(d, NYT);
      expect(r.ehdotus.length, nimi).toBe(r.yhteenveto.kehityskohde); expect(r.huomio.length, nimi).toBe(r.yhteenveto.kehityskohde); expect(r.kotiN, nimi).toBe(r.yhteenveto.kehityskohde); expect(r.huomio, nimi).toEqual(r.ehdotus);
    }
    expect(luvut(heikko, NYT).yhteenveto.kehityskohde).toBeGreaterThan(luvut(d0, NYT).yhteenveto.kehityskohde - 1);
    expect(luvut(vanha, NYT).yhteenveto.kehityskohde).toBe(0);                            // vanhat tulokset eivät luokita (15 kk)
    expect(luvut(vanha, NYT).yhteenveto.eiTekniikkadataa).toBeGreaterThan(0);
    expect(luvut(eiMitaan, NYT).yhteenveto).toMatchObject({ kehityskohde: 0, ok: 0 });
    expect(luvut(neutraali, NYT).huomio.length).toBeLessThan(luvut(d0, NYT).huomio.length + 1);
  });
  it('aika kuluu: sama data 14 vs 16 kuukautta myöhemmin (TKI vanhenee) — kaikki kolme laskevat yhdessä', () => {
    const d = F.lataa('kypsa', NYT);
    const a = luvut(d, NYT), b = luvut(d, NYT + 500 * DAY);
    expect(b.yhteenveto.kehityskohde).toBeLessThan(a.yhteenveto.kehityskohde); expect(b.ehdotus.length).toBe(b.yhteenveto.kehityskohde); expect(b.huomio.length).toBe(b.yhteenveto.kehityskohde); expect(b.kotiN).toBe(b.yhteenveto.kehityskohde);
  });
});

describe('Tilanne: tekniikka kehityskohteena -rivit ja "ei tekniikkadataa"', () => {
  const html = (d, nyt) => TT.tmTilanneHTML(TT.tmTilanneMalli(Object.assign({}, d.syote, { nytMs: nyt || NYT })), { t: (x) => x, fn: { testijakso: 'te', joukkue: 'jk', auki: 'au' } });
  const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  it('huomiorivi "Tekniikka kehityskohteena · N joukkuetta" + joukkueen syy; vanhaa "Tekniikka alle ikätason" -otsikkoa ei ole', () => {
    const x = teksti(html(F.lataa('kypsa', NYT)));
    expect(x).toMatch(/Tekniikka kehityskohteena · \d+ joukkuetta/); expect(x).toContain('alle ikätason'); expect(x).not.toContain('Tekniikka alle ikätason');
  });
  it('"Ei tekniikkadataa · N joukkuetta" näkyy (pilotti: 10 joukkuetta ilman dataa), ohjaa testijaksoon; ei piiloteta', () => {
    const d = F.lataa('pilotti', NYT), h = html(d), x = teksti(h);
    expect(x).toContain('Ei tekniikkadataa · ' + d.tekniikka.eiTekniikkadataa + ' joukkuetta'); expect(h).toContain('id="tilanneEiTekniikkaa"'); expect(h.slice(h.indexOf('id="tilanneEiTekniikkaa"'), h.indexOf('id="tilanneEiTekniikkaa"') + 1500)).toContain('onclick="te()"');
  });
  it('syy näkyy per joukkue (ryhmän avattu lista) ja otos pieni -merkintä; datan ikä (mitattu m/y · kk sitten)', () => {
    const x = teksti(html(F.lataa('kypsa', NYT)));
    expect(x).toMatch(/alle ikätason · mitattu \d+\/\d+/); expect(x).toMatch(/mitattu \d+ kk sitten|mitattu \d+\.\d+\./);
  });
  it('datan ikä on tekniikan OMA: tuore FLEI/H-H ei peitä vanhaa TKI:tä (vanhat tulokset eivät tee huomiota)', () => {
    const d = muunna(F.lataa('kypsa', NYT), (p) => Object.assign({}, p, p.tki_pvm ? { tki_pvm: '2023-01-01' } : {}, p.tsi_pvm ? { tsi_pvm: '2023-01-01' } : {}, { flei_pvm: '2026-10-09', hh_pvm: '2026-10-09' }));
    const tk = d.joukkueDocs.map((jd) => Object.assign({ nimi: jd.nimi }, T.tmJoukkueTekniikka(d.pelaajat, d.joukkueDocs, jd.id, NYT))).filter((r) => r.yht > 0);
    const m = TT.tmTilanneMalli(Object.assign({}, F.lataa('kypsa', NYT).syote, { tekniikka: tk }));
    expect(m.tekniikka.kehityskohde).toBe(0); expect(m.huomiot.some((x) => x.kind === 'tekniikka' || (x.kinds || []).indexOf('tekniikka') >= 0)).toBe(false);
  });
  it('syöte ilman tekniikka-kenttää (vanha rakenne): ei kaadu', () => {
    const d = F.lataa('kypsa', NYT); delete d.syote.tekniikka; expect(() => TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: (x) => x, fn: {} })).not.toThrow();
    expect(TT.tmTilanneMalli(d.syote).tekniikka).toBeNull();
  });
});

describe('Kodin pulssi: vain lukumäärä ja linkki Tilanteeseen (K9, D150)', () => {
  const koti = (d, tek) => {
    const m = PU.tmPulssiRivit(d.koosteet, { nytMs: NYT, ensimmainenVk: d.ensin, katselmusPv: {}, jaksoVk: d.jaksoVk, kuittaukset: [] }), viim = d.koosteet[d.koosteet.length - 1] || {};
    const rm = KK.tmKotiRytmiMalli(m, { yhteensa: viim.yhteensa, koosteJ: viim.joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: [], viestit: [], nytMs: NYT, tekniikka: tek });
    return { rm, h: KK.tmKotiRytmiHTML(rm, { t: (x) => x, esc: (x) => String(x), fn: { tilanne: 'ti', joukkue: 'jk' } }).main };
  };
  const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  it('rivi "Tekniikka kehityskohteena · N joukkuetta" + linkki Avaa Tilanne; EI joukkuetunnisteita (ei toisteta, D150); ei koskaan signaalikortti', () => {
    const d = F.lataa('kypsa', NYT), { rm, h } = koti(d, d.tekniikka), i = h.indexOf('data-signaali="tekniikka"'), rivi = h.slice(i, h.indexOf('</div>', i) + 6);
    expect(i).toBeGreaterThan(0); expect(teksti(rivi)).toContain('Tekniikka kehityskohteena · ' + d.tekniikka.kehityskohde + ' joukkuetta'); expect(rivi).toContain('onclick="ti()"'); expect(rivi).not.toContain('kk-tag'); expect(rivi).not.toContain('onclick="jk(');
    expect(rm.kortti === null || rm.kortti.tyyppi !== 'tekniikka').toBe(true);
  });
  it('vain "ei tekniikkadataa" (ei kehityskohteita) → rivi näkyy lukumäärällä; molemmat nollassa → ei riviä; ilman syötettä → Koti ennallaan', () => {
    const d = F.lataa('pilotti', NYT), a = koti(d, { kehityskohde: 0, eiTekniikkadataa: 7 });
    expect(teksti(a.h)).toContain('Ei tekniikkadataa · 7 joukkuetta');
    expect(koti(d, { kehityskohde: 0, eiTekniikkadataa: 0 }).h).not.toContain('data-signaali="tekniikka"');
    expect(koti(d, undefined).rm.entries.some((e) => e.tyyppi === 'tekniikka')).toBe(false); expect(koti(d, null).h).not.toContain('Tekniikka');
  });
});

describe('VP_v25 on kytketty libiin (lähdevartijat)', () => {
  const tpLohko = VP.slice(VP.indexOf('const TP_SIGNAALIT = ['), VP.indexOf('async function lataaAvoimetToimenpiteet'));
  const tki = tpLohko.slice(tpLohko.indexOf("{ id: 'tki_alhainen'"), tpLohko.indexOf("{ id: 'tki_lahella_merkkia'"));
  it('tki_alhainen: tunniste säilyy + kommentti että kattaa koko ketjun; käyttää tmTekniikkaJoukkueLuokka; ei omaa mittaria eikä rajaa (TKI < 40)', () => {
    expect(tpLohko).toContain("id: 'tki_alhainen'"); expect(tpLohko).toMatch(/TUNNISTE `tki_alhainen` SÄILYY[\s\S]{0,200}KOKO tekniikkaketjun TKI → SM-tasot/);
    expect(tki).toContain('tmTekniikkaJoukkueLuokka'); expect(tki).not.toMatch(/tki_viimeisin|< ?40|d2_taso/);
  });
  it('huomion, poikkeamalistan ja joukkuekortin status käyttävät samaa libiä; vanha D2-tekniikka suodatetaan pois', () => {
    expect(VP).toContain('<script src="lib/tm_tekniikka.js?v='); expect(VP.indexOf('lib/tm_tekniikka.js')).toBeLessThan(VP.indexOf('lib/tm_vp_tilanne.js'));
    expect((VP.match(/tmTekniikkaJoukkueLuokka\(/g) || []).length).toBeGreaterThanOrEqual(3);                      // TP-ehdotus + poikkeamalista + joukkuekortin status
    expect((VP.match(/w\.osaAlue !== 'tekniikka'|x\.osaAlue === 'tekniikka'\) return/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(VP).toContain('tmTekniikkaYhteenveto(');                                                                  // Kodin pulssi
    const tilanne = readFileSync(join(juuri, 'lib/tm_vp_tilanne.js'), 'utf8'); expect(tilanne).toContain('tmJoukkueTekniikka('); expect(tilanne).not.toMatch(/Tekniikka alle ikätason/);
  });
  it('Tilanteen ehdotuksen teksti: tunniste tki_alhainen, uusi perustelu, vanhaa "alle pronssitason" ei ole', () => {
    const t = readFileSync(join(juuri, 'lib/tm_vp_tilanne.js'), 'utf8'); expect(t).toMatch(/tki_alhainen: \['Tekniikkaharjoittelua', 'Tekniikka on kehityskohteena\.'\]/); expect(t).not.toContain('alle pronssitason');
    expect(VP).not.toContain('alle pronssitason (TKI < 40)');
  });
  it('sv-avaimet: uusi erä 15 on tyhjä (ei kirjoitettua ruotsia) ja kattaa uudet vpT-avaimet', () => {
    const E15 = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_15.json'), 'utf8'));
    const rivit = Object.values(E15.osiot).flatMap((o) => Object.values(o.rivit)); expect(rivit.length).toBe(E15._rivit_yhteensa); expect(rivit.filter((r) => r.sv !== '')).toEqual([]);
    expect(Object.keys(E15.osiot.vp_kartta.rivit)).toContain('Tekniikka kehityskohteena');
  });
});
