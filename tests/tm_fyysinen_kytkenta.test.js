/* Fyysisen heikkouden määritelmä PR 3 — kytkentä (docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md): YKSI funktio (lib/tm_fyysinen.js) → huomio, ehdotus (hh_taso_alhainen), Tilanne ja Kodin pulssi.
 * KOVA VAATIMUS (kuten tm_tekniikka_kytkenta): huomio "Fyysiset testit kehityskohteena" ja ehdotus "Yksilöllinen ohjelma" antavat samalle datalle saman joukkuemäärän ja -joukon.
 * Ehdotus ajetaan oikeasta VP_v25-lähteestä (TP_SIGNAALIT, vm), huomio oikealla Tilanne-mallilla, pulssi oikealla Koti-mallilla. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const FY = require('../lib/tm_fyysinen.js'), TT = require('../lib/tm_vp_tilanne.js'), KK = require('../lib/tm_vp_koti.js'), PU = require('../lib/tm_seuran_pulssi.js'), J = require('../lib/tm_joukkue.js');
const F = require('./helpers/vp_fixture.cjs'), { funktio } = require('./helpers/vp_koti_sandbox.cjs');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8'), MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const NYT = Date.UTC(2026, 9, 10, 12), DAY = 86400000;

function lataaTP() {
  const alku = VP.indexOf('const TP_SIGNAALIT = ['), lines = VP.slice(alku).split('\n'), loppu = lines.findIndex((l) => l.trim() === '];');
  const ctx = { Date, window: { TM_FYSINEN: FY }, console };
  vm.createContext(ctx);
  vm.runInContext(funktio(VP, '_pJNimet') + '\n' + funktio(VP, '_pOnJoukkueessa') + '\n' + lines.slice(0, loppu + 1).join('\n') + '\nthis.TP = TP_SIGNAALIT;', ctx);
  ctx.Date = Date;
  return ctx.TP.find((x) => x.id === 'hh_taso_alhainen');
}
function nimetPelaajille(d) {
  const nimet = {}; d.joukkueDocs.forEach((j) => { nimet[j.id] = j.nimi; });
  return d.pelaajat.map((p) => Object.assign({}, p, { _jNimet: J.tmPelaajanJoukkueet(p, d.joukkueDocs).map((id) => nimet[id] || id) }));
}
function luvut(d, nyt) {
  const pel = nimetPelaajille(d), TP = lataaTP();
  const realDateNow = Date.now; Date.now = () => nyt;
  try {
    const nimet = d.joukkueDocs.map((j) => j.nimi);
    const ehdotus = nimet.filter((n) => pel.some((p) => p._jNimet.indexOf(n) >= 0) && TP.tarkista(n, pel));
    const y = FY.tmFyysinenYhteenveto(d.pelaajat, d.joukkueDocs, nyt);
    const rivit = d.joukkueDocs.map((jd) => Object.assign({ nimi: jd.nimi }, FY.tmJoukkueFyysinen(d.pelaajat, d.joukkueDocs, jd.id, nyt))).filter((r) => r.yht > 0);
    const m = TT.tmTilanneMalli(Object.assign({}, d.syote, { nytMs: nyt, fyysinen: rivit, fyysinenYht: { kypsyysMittaamatta: y.kypsyysMittaamatta, neutraaleja: y.neutraaleja } }));
    const huomio = []; m.huomiot.forEach((x) => { if (x.tyyppi === 'ryhma' && x.kind === 'fyysinen') x.joukkueet.forEach((j) => huomio.push(j.nimi)); else if (x.tyyppi === 'joukkue' && x.kinds.indexOf('fyysinen') >= 0) huomio.push(x.joukkue); });
    const rm = KK.tmKotiRytmiMalli(PU.tmPulssiRivit(d.koosteet, { nytMs: nyt, ensimmainenVk: d.ensin, katselmusPv: {}, jaksoVk: d.jaksoVk, kuittaukset: [] }), { yhteensa: (d.koosteet[d.koosteet.length - 1] || {}).yhteensa, koosteJ: (d.koosteet[d.koosteet.length - 1] || {}).joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: [], viestit: [], nytMs: nyt, fyysinen: y });
    const koti = rm.entries.find((e) => e.tyyppi === 'fyysinen');
    return { ehdotus: ehdotus.sort(), huomio: huomio.sort(), yhteenveto: y, tilanneM: m, kotiN: koti ? koti.n : 0 };
  } finally { Date.now = realDateNow; }
}
const muunna = (d, f) => Object.assign({}, d, { pelaajat: d.pelaajat.map(f) });

describe('YKSI määritelmä: huomio = ehdotus = Kodin pulssi (sama joukkuejoukko ja -määrä)', () => {
  for (const tila of ['pilotti', 'kypsa', 'kuormitus']) {
    it(tila + ': huomio, ehdotus (VP_v25 TP_SIGNAALIT), Tilanne-yhteenveto ja Kodin pulssi antavat saman joukkuemäärän ja -joukon', () => {
      const d = F.lataa(tila, NYT), r = luvut(d, NYT);
      expect(r.yhteenveto.kehityskohde, tila).toBeGreaterThan(0);
      expect(r.ehdotus.length, tila).toBe(r.yhteenveto.kehityskohde);
      expect(r.huomio.length, tila).toBe(r.yhteenveto.kehityskohde);
      expect(r.kotiN, tila).toBe(r.yhteenveto.kehityskohde);
      expect(r.huomio, tila).toEqual(r.ehdotus);
      expect(r.tilanneM.fyysinen.kehityskohde, tila).toBe(r.yhteenveto.kehityskohde);
    });
  }
  it('muunnelmat: kaikki heikoiksi · kaikki vanhoiksi · ei mitään · kaikki kypsyys tuntematon — luvut pysyvät yhtenä', () => {
    const d0 = F.lataa('kypsa', NYT);
    const heikko = muunna(d0, (p) => (p.hh_viimeisin ? Object.assign({}, p, { biologinenIka_viimeisin: { phv_tila_koodi: 'POST' }, hh_viimeisin: Object.assign({}, p.hh_viimeisin, { kasirata: 99, lin30m: 9.9, cmj: 5 }) }) : p));
    const vanha = muunna(d0, (p) => Object.assign({}, p, p.hh_pvm ? { hh_pvm: '2023-01-01', testipaivat: { fyysinen_hh: '2023-01-01' } } : {}));
    const eiMitaan = muunna(d0, (p) => { const q = Object.assign({}, p); ['hh_viimeisin', 'hh_pvm', 'testipaivat'].forEach((k) => delete q[k]); return q; });
    const tuntematon = muunna(d0, (p) => { const q = Object.assign({}, p); delete q.biologinenIka_viimeisin; return q; });
    for (const [nimi, d] of [['heikko', heikko], ['vanha', vanha], ['eiMitaan', eiMitaan], ['tuntematon', tuntematon]]) {
      const r = luvut(d, NYT);
      expect(r.ehdotus.length, nimi).toBe(r.yhteenveto.kehityskohde); expect(r.huomio.length, nimi).toBe(r.yhteenveto.kehityskohde); expect(r.kotiN, nimi).toBe(r.yhteenveto.kehityskohde); expect(r.huomio, nimi).toEqual(r.ehdotus);
    }
    expect(luvut(vanha, NYT).yhteenveto.kehityskohde).toBe(0);                               // yli 15 kk vanha patteristo ei luokita
    expect(luvut(eiMitaan, NYT).yhteenveto.kehityskohde).toBe(0);
    expect(luvut(tuntematon, NYT).yhteenveto.kypsyysMittaamatta).toBeGreaterThanOrEqual(luvut(d0, NYT).yhteenveto.kypsyysMittaamatta);
  });
  it('aika kuluu: 500 pv myöhemmin patteristo vanhenee (15 kk) — kaikki kolme laskevat yhdessä', () => {
    const d = F.lataa('kypsa', NYT), a = luvut(d, NYT), b = luvut(d, NYT + 500 * DAY);
    expect(b.yhteenveto.kehityskohde).toBeLessThan(a.yhteenveto.kehityskohde); expect(b.ehdotus.length).toBe(b.yhteenveto.kehityskohde); expect(b.huomio.length).toBe(b.yhteenveto.kehityskohde); expect(b.kotiN).toBe(b.yhteenveto.kehityskohde);
  });
  it('fixturen ehdotukset (hh_taso_alhainen) johdetaan samasta funktiosta', () => {
    for (const tila of ['pilotti', 'kypsa', 'kuormitus']) { const d = F.lataa(tila, NYT), e = d.syote.ehdotukset.find((x) => x.signaali === 'hh_taso_alhainen'); expect(e ? e.joukkueet.length : 0, tila).toBe(d.fyysinen.kehityskohde); }
  });
});

describe('Tilanne: huomio, "Ei fyysistä dataa" ja "Kypsyys mittaamatta" (aina näkyvillä)', () => {
  const html = (d, nyt) => TT.tmTilanneHTML(TT.tmTilanneMalli(Object.assign({}, d.syote, { nytMs: nyt || NYT })), { t: (x) => x, fn: { testijakso: 'te', joukkue: 'jk', auki: 'au' } });
  const teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  it('huomiorivi "Fyysiset testit kehityskohteena"; Kärkipelaajat-huomiota ja "alle ikätason" -fysiikkaotsikkoa ei ole', () => {
    const x = teksti(html(F.lataa('kypsa', NYT)));
    expect(x).toMatch(/Fyysiset testit kehityskohteena · \d+ joukkuetta/); expect(x).not.toMatch(/Kärkipelaaj|Talenttiydin|kärkipelaajien taso/);
  });
  it('"Kypsyys mittaamatta · N pelaajaa" + lause + kortin linkki testijaksoon; ei .tt-ilmankortti (display:none ≥ 760 px) eikä piilota-CSS:ää', () => {
    const d = F.lataa('pilotti', NYT), h = html(d), x = teksti(h);
    expect(x).toContain('Kypsyys mittaamatta · ' + d.fyysinen.kypsyysMittaamatta + ' pelaajaa'); expect(x).toContain('Fyysisiä tuloksia ei tulkita ennen kypsyyden mittaamista.');
    const i = h.indexOf('id="tilanneKypsyysMittaamatta"'), kortti = h.slice(h.indexOf('id="tilanneMittausaukot"'), h.indexOf('id="tilanneEhdotukset"')); expect(i).toBeGreaterThan(0); expect(kortti).toContain('onclick="te()"'); expect(h.slice(i - 60, i + 200)).not.toContain('tt-ilmankortti');
    expect(h).not.toMatch(/\.tt-aukot\{[^}]*display:none/);
  });
  it('"Ei fyysistä dataa · N joukkuetta" näkyy (pilotti), ohjaa testijaksoon', () => {
    const d = F.lataa('pilotti', NYT), h = html(d); expect(teksti(h)).toContain('Ei fyysistä dataa · ' + d.fyysinen.eiFyysistaDataa + ' joukkuetta'); expect(h).toContain('id="tilanneEiFyysista"');
  });
  it('syöte ilman fyysinen-kenttää (vanha rakenne): ei kaadu, ei riviä', () => {
    const d = F.lataa('kypsa', NYT); delete d.syote.fyysinen; delete d.syote.fyysinenYht;
    expect(() => TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: (x) => x, fn: {} })).not.toThrow(); expect(TT.tmTilanneMalli(d.syote).fyysinen).toBeNull();
  });
});

describe('VP_v25 ja Master on kytketty libiin (lähdevartijat)', () => {
  it('VP: huomion, ehdotuksen, poikkeamalistan ja joukkuekortin status käyttävät tmFyysinenJoukkueLuokka:a; Kärkipelaajat poissa; vanha alle_normin suodatetaan', () => {
    expect(VP).toContain('<script src="lib/tm_fyysinen.js?v='); expect(VP.indexOf('lib/tm_joukkuesaanto.js')).toBeLessThan(VP.indexOf('lib/tm_tekniikka.js')); expect(VP.indexOf('lib/tm_fyysinen.js')).toBeLessThan(VP.indexOf('lib/tm_vp_tilanne.js'));
    expect((VP.match(/tmFyysinenJoukkueLuokka\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(VP).not.toContain("Talenttiydin alle normin"); expect(VP).not.toContain('talent-ID-huoli');
    const tp = VP.slice(VP.indexOf("id: 'hh_taso_alhainen'"), VP.indexOf("id: 'suunta_lasku'")); expect(tp).not.toMatch(/hh_taso\b(?!_alhainen)|< ?2\.5|Eerikkilä/);
  });
  it('Master: D2 komposiittiin ei Eerikkilän tekniikkatestejä (d2KomposiittiTaso), D1/D2-kortti käyttää tm_fyysinen/tm_tekniikka-luokitusta', () => {
    expect(MA).toContain('lib/tm_fyysinen.js?v='); expect(MA).toContain('lib/tm_tekniikka.js?v='); expect(MA).toContain('tmFyysinenJoukkueLuokka(P'); expect(MA).toContain('tmTekniikkaJoukkueLuokka(P');
    expect((MA.match(/d2KomposiittiTaso\(/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(MA).not.toMatch(/const d2j = \(typeof laskeD2Joustava/);
  });
});
