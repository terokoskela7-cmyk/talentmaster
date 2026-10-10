/**
 * S2 PR 1 — lib/tm_seuran_pulssi.js (docs/CODE_BRIEF_S2_KOTI.md): pulssitaulukko, merkit, signaalit, datan ikä, käyttöönotto, kattavuus, mobiilikortit.
 * Fixtuurit ovat käsin rakennettuja kooste v4/v5 -dokumentteja (ei oikeaa dataa, ei pelaajanimiä).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const P = require('../lib/tm_seuran_pulssi.js');   // PR D: lib on pelkkä malli (HTML poistettu → lib/tm_vp_koti.js, testit vp_koti_rytmi.test.js)
const DAY = 86400000;
const NYT = Date.UTC(2026, 9, 14, 10, 0);   // ke 14.10.2026, W42

/* joukkue-mittarit: oletus = kaikki hyvin (kilpa/oto, Rakentaja, 20 pelaajaa) */
const J = (nimi, o) => Object.assign({ nimi, ikavaihe: 'rakentaja', tyyppi: 'kilpa', profiili: 'oto', jakso: true, jakso_nimi: 'Xyz', n_pelaajat: 20, n_jaksolla: 20, n_valinta_odottaa: 0, n_katselmus: 0,
  n_vastanneet: 16, n_vastausperusta: 20, n_katselmus_ajallaan: 0, n_katselmus_perusta: 0, n_suostumus: 18, n_kirjautunut_30: 10, n_huoltaja_30: 5, n_aktiivinen_7: 12, n_aktiivinen_30: 15,
  n_toiminto_7: 10, n_perhe_kuittaus_7: 0, n_harjoite_7: 14, n_harjoite_30: 16 }, o || {});
const KOOSTE = (vk, joukkueet, o) => Object.assign({ vk, versio: 5, yhteensa: { n_pelaajat: Object.keys(joukkueet).reduce((a, k) => a + joukkueet[k].n_pelaajat, 0), n_suostumus: 50, n_harjoite_7: 30, n_perhe_kuittaus_7: 0, n_toiminto_7: 20 }, joukkueet,
  laskettu: { seconds: (NYT - 2 * 3600000) / 1000 } }, o || {});
const VIIKOT = ['2026-W39', '2026-W40', '2026-W41', '2026-W42'];
const sarja = (fn) => VIIKOT.map((vk, i) => KOOSTE(vk, fn(i)));
const OPTS = { nytMs: NYT, ensimmainenVk: '2026-W20' };   // käyttöönotto ohi (22 vk), käytön tavoite 50 %
const strip = (h) => h.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

describe('merkit ● ▲ ■ ○ (D112) rajoilla', () => {
  it('täsmälleen tavoite = ok; 75 % tavoitteesta = w; alle = err; puuttuva = n', () => {
    expect(P.tmPulssiMerkki(70, 70)).toBe('ok'); expect(P.tmPulssiMerkki(69.9, 70)).toBe('w');
    expect(P.tmPulssiMerkki(52.5, 70)).toBe('w'); expect(P.tmPulssiMerkki(52.4, 70)).toBe('err');
    expect(P.tmPulssiMerkki(null, 70)).toBe('n'); expect(P.tmPulssiMerkki(40, null)).toBe('n');
  });
  it('oto: katselmus enintään ▲ (D72); ammatti saa ●', () => {
    expect(P.tmPulssiMerkki(100, 90, 'oto')).toBe('w'); expect(P.tmPulssiMerkki(100, 90, 'ammatti')).toBe('ok'); expect(P.tmPulssiMerkki(30, 90, 'oto')).toBe('err');
  });
  it('käytön portaat (D69): ei tavoitetta ensimmäisinä 4 viikkona, sitten kuukausittain 25 → 40 → 50 / harraste 15 → 25 → 30', () => {
    expect([0, 3].map((v) => P.tmPulssiKayttoTavoite('kilpa', v))).toEqual([null, null]);
    expect([4, 7, 8, 11, 12, 40].map((v) => P.tmPulssiKayttoTavoite('kilpa', v))).toEqual([25, 25, 40, 40, 50, 50]);
    expect([4, 8, 12].map((v) => P.tmPulssiKayttoTavoite('harraste', v))).toEqual([15, 25, 30]);
  });
  it('viikkoEro vuodenvaihteen yli', () => { expect(P.viikkoEro('2026-W50', '2027-W02')).toBe(5); expect(P.viikkoEro('2026-W42', '2026-W42')).toBe(0); expect(P.viikkoEro('x', '2026-W42')).toBeNull(); });
});

describe('rivimalli', () => {
  const ks = sarja(() => ({ p15: J('P15 Demo'), p10: J('P10 Demo', { ikavaihe: 'leikkija', n_perhe_kuittaus_7: 9, n_harjoite_7: 1, n_pelaajat: 16, n_jaksolla: 16 }), t12: J('T12 Demo', { n_pelaajat: 4, n_jaksolla: 3, n_vastanneet: 2, n_vastausperusta: 3, n_harjoite_7: 2 }), p13: J('P13 Demo') }));
  const m = P.tmPulssiRivit(ks, OPTS);
  it('joukkueet IKÄJÄRJESTYKSESSÄ (D42), ei mittarin mukaan', () => { expect(m.rivit.map((r) => r.nimi)).toEqual(['P10 Demo', 'T12 Demo', 'P13 Demo', 'P15 Demo']); });
  it('Käyttö = n_harjoite_7 (D119); Leikkijällä n_perhe_kuittaus_7; Leikkijä: ei viikkokatsausta (D71)', () => {
    const r = Object.fromEntries(m.rivit.map((x) => [x.nimi, x])); expect(r['P15 Demo'].kaytto).toMatchObject({ o: 14, n: 20, pros: 70, merkki: 'ok' }); expect(r['P10 Demo'].kaytto).toMatchObject({ o: 9, n: 16 }); expect(r['P10 Demo'].leikkija).toBe(true); expect(r['P10 Demo'].katsaus).toEqual({ ei: 'leikkija' });
  });
  it('pieni joukkue < 5: lukumäärä, ei merkkiä (D116)', () => { const t12 = m.rivit.find((x) => x.nimi === 'T12 Demo'); expect(t12.pieni).toBe(true); expect(t12.jaksolla.merkki).toBe('n'); expect(t12.katsaus.merkki).toBe('n'); expect(t12.kaytto.merkki).toBe('n'); });
  it('signaalilista: kaikki näkyvät (signaalitLista) — signaalit = niistä 3 ensimmäistä; kuitattu ei listalla', () => {
    const ks2 = sarja((i) => ({ a: J('P11 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }), b: J('P12 Demo', { profiili: 'ammatti', n_katselmus: 3 }), d: J('P14 Demo', { n_vastanneet: [16, 14, 12, 10][i] }), e: J('P15 Demo', { n_harjoite_7: 2 }) })), mm = P.tmPulssiRivit(ks2, OPTS);
    expect(mm.signaalitLista.map((s) => s.tyyppi)).toEqual(['ei_jaksoa', 'katselmusikkuna', 'katsaus_laskee', 'kaytto_matala']); expect(mm.signaalit).toHaveLength(3); expect(mm.signaalejaYht).toBe(4);
    const piilo = P.tmPulssiRivit(ks2, Object.assign({ kuittaukset: [{ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: 'kuitattu', ehto: 'ei_jaksoa', kuitattu_pvm: NYT - DAY }] }, OPTS)); expect(piilo.signaalitLista.map((s) => s.tyyppi)).not.toContain('ei_jaksoa');
  });
  it('v4-kooste ilman v5-kenttiä → Käyttö "—" (ei nollaa), versioVanha', () => {
    const v4 = sarja(() => ({ a: J('P14 Demo', { n_harjoite_7: undefined, n_harjoite_30: undefined }) }));
    v4.forEach((d) => { delete d.joukkueet.a.n_harjoite_7; delete d.joukkueet.a.n_harjoite_30; delete d.yhteensa.n_harjoite_7; });
    const mm = P.tmPulssiRivit(v4, OPTS); expect(mm.rivit[0].kaytto).toEqual({ ei: 'ei_v5' }); expect(mm.versioVanha).toBe(true); expect(mm.seura.kaytto.pros).toBeNull();
  });
});

describe('datan ikä (D113) ja käyttöönotto (D69)', () => {
  const ks = (ikaPv) => sarja(() => ({ a: J('P14 Demo', { n_harjoite_7: 4 }) })).map((d, i, a) => (i === a.length - 1 ? Object.assign(d, { laskettu: { seconds: (NYT - ikaPv * DAY) / 1000 } }) : d));
  it('8 pv vielä tuore; 9 pv → vanha: merkit neutraaleiksi (luvut säilyvät)', () => {
    const tuore = P.tmPulssiRivit(ks(8), OPTS), vanha = P.tmPulssiRivit(ks(9), OPTS);
    expect(tuore.vanha).toBe(false); expect(vanha.vanha).toBe(true); expect(vanha.merkitPaalla).toBe(false); expect(vanha.rivit[0].kaytto.pros).toBe(20); expect(vanha.rivit[0].kaytto.merkki).toBe('n'); expect(tuore.rivit[0].kaytto.merkki).toBe('err');
  });
  it('käyttöönotto: 4 ensimmäistä viikkoa kaikki ○ (ei tavoitetta); sen jälkeen värit', () => {
    const alku = P.tmPulssiRivit(ks(0.1), { nytMs: NYT, ensimmainenVk: '2026-W40' }), loppu = P.tmPulssiRivit(ks(0.1), OPTS);
    expect(alku.onb.paalla).toBe(true); expect(alku.onb.viikko).toBe(3); expect(alku.rivit[0].kaytto.merkki).toBe('n'); expect(alku.merkitPaalla).toBe(false); expect(loppu.onb.paalla).toBe(false); expect(loppu.merkitPaalla).toBe(true);
  });
  it('ei näytetä prosenttia kun nimittäjä puuttuu (D125): tmProsenttiTeksti', () => { expect(P.tmProsenttiTeksti(0, 0)).toBe('—'); expect(P.tmProsenttiTeksti(3, 4)).toBe('3/4'); });
});

describe('Tarvitsee huomiota (D73, D115)', () => {
  const ks = sarja((i) => ({
    a: J('P11 Demo', { jakso: false, jakso_nimi: undefined, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }),                   // 1. ei jaksoa 4 vk
    b: J('P12 Demo', { profiili: 'ammatti', n_katselmus: 3 }),                                                                        // 2. katselmusikkuna, ammatti
    c: J('P13 Demo', { profiili: 'oto', n_katselmus: 3 }),                                                                            // oto → EI signaalia
    d: J('P14 Demo', { n_vastanneet: [16, 14, 12, 10][i] }),                                                                          // 3. laskeva 3 vk
    e: J('P15 Demo', { n_harjoite_7: 2 }),                                                                                            // 4. käyttö 10 %
    f: J('P16 Demo', { n_vastanneet: [10, 12, 14, 16][i] }),                                                                          // nouseva → ei
  }));
  it('käyttösignaali (< 25 %) vasta käyttöönoton jälkeen; EI "valinta odottaa" (D68)', () => {
    const k2 = sarja(() => ({ e: J('P15 Demo', { n_harjoite_7: 2, n_valinta_odottaa: 9 }) }));
    expect(P.tmPulssiRivit(k2, { nytMs: NYT, ensimmainenVk: '2026-W40' }).signaalit).toEqual([]);
    expect(P.tmPulssiRivit(k2, OPTS).signaalit.map((s) => s.tyyppi)).toEqual(['kaytto_matala']);
  });
  it('hitaat asiat (D118) eivät ole viikkosignaaleja: matala jaksolla-% tai nolla-katselmus ei nosta signaalia', () => {
    const k2 = sarja(() => ({ a: J('P14 Demo', { n_jaksolla: 5, n_katselmus_perusta: 4, n_katselmus_ajallaan: 0 }) })); expect(P.tmPulssiRivit(k2, OPTS).signaalit).toEqual([]);
  });
  it('piilossa-lista (PR 2: kuitattu/siirretty) poistaa signaalin näkyvistä ja laskurista', () => {
    const m = P.tmPulssiRivit(ks, Object.assign({ piilossa: { 'ei_jaksoa|a': true } }, OPTS)); expect(m.signaalejaYht).toBe(3); expect(m.signaalit.map((s) => s.tyyppi)).toEqual(['katselmusikkuna', 'katsaus_laskee', 'kaytto_matala']);
  });
});

describe('tietosuoja', () => {
  const ks = sarja(() => ({ a: J('P14 Demo', { n_katselmus: 2, profiili: 'ammatti' }), b: J('P15 Demo', { ikavaihe: 'leikkija', n_perhe_kuittaus_7: 3 }) })), m = P.tmPulssiRivit(ks, OPTS);
  it('malli ei sisällä pelaajanimiä, ID:itä eikä uid-kenttiä (D122, §7.22)', () => { expect(JSON.stringify(m)).not.toMatch(/pelaajaId|etunimi|sukunimi|"uid"/); });
  it('seuraava tapahtuma', () => { expect(P.tmPulssiSeuraavaTapahtuma([{ nimi: 'B', alkaa: NYT + 5 * DAY }, { nimi: 'A', alkaa: NYT + DAY }, { nimi: 'X', alkaa: NYT - DAY }], NYT).nimi).toBe('A'); });
  it('HTML on poistettu mallimoduulista (PR D): näkymät ovat lib/tm_vp_koti.js:ssä', () => { expect(P.tmPulssiHTML).toBeUndefined(); expect(P.tmPulssiTulossaHTML).toBeUndefined(); expect(P.CSS).toBeUndefined(); });
});

describe('jaetut mockup 22 -komponentit (Design: ei kolmatta korttiversiota)', () => {
  const KT = require('../lib/tm_kt_komponentit.js'), KP = require('../lib/tm_kehitystyopoyta.js');
  it('YKSI paikka: Kehitystyöpöytä sisältää täsmälleen saman jaetun CSS:n; kopioita ei ole', () => {
    const kt = KP.tmKtCss(); expect(kt).toContain(KT.CSS);
    ['.kt-sig{', '.kt-sig-h{', '.kt-btn{', '.kt-eb{', '.kt-q3{'].forEach((r) => expect(kt.split(r).length - 1, r).toBe(1));
  });
  it('Design: vain olemassa olevat tokenit — ei hex-/rgb-värejä jaetussa eikä pulssin CSS:ssä', () => {
    [KT.CSS].forEach((c) => { expect(c).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(c).not.toMatch(/rgba?\(/); });
    const luvut = (KT.CSS).match(/var\(--[a-z0-9-]+/g).map((x) => x.slice(6)), sallitut = new Set(['teal', 'amber', 'red', 'ink', 'ink2', 'ink3', 'bg', 'bg3', 'border', 'ov-2', 'ov-4', 'ov-5', 'teal-brd', 'n', 'font-serif', 'font-mono', 'font-sans', 'kt-serif', 'amber-dim', 'on-accent', 'fs-h1', 'fs-h2', 'fs-lead', 'fs-body', 'fs-meta', 'fs-eb']);
    expect([...new Set(luvut)].filter((x) => !sallitut.has(x))).toEqual([]);
  });
});

describe('kuittaus (PR 2, D124): ehto, piilotus, dokumentti', () => {
  const NYT_MS = NYT, tuore = NYT_MS - 3 * DAY, vanha = NYT_MS - 30 * DAY;
  const sig = (tyyppi, jid, o) => Object.assign({ tyyppi, jid, avain: tyyppi + '|' + jid, ehto: P.tmPulssiEhto({ tyyppi, auki: (o || {}).auki }) }, o || {});
  it('dokumentin kentät (brief): tyyppi pulssi, signaali, joukkue, tila, palaa_vk, ehto', () => {
    expect(P.tmPulssiKuittausDoc(sig('ei_jaksoa', 'a'), 'kuitattu', '2026-W42')).toEqual({ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: 'kuitattu', palaa_vk: null, ehto: 'ei_jaksoa', kuitattu_vk: '2026-W42' });
    expect(P.tmPulssiKuittausDoc(sig('ei_jaksoa', 'a'), 'siirretty', '2026-W42')).toMatchObject({ tila: 'siirretty', palaa_vk: '2026-W43' });
    expect(P.tmPulssiKuittausDoc(sig('ei_jaksoa', 'a'), 'jotain', '2026-W42').tila).toBe('kuitattu');
    expect(P.tmPulssiKuittausId(sig('ei_jaksoa', 'p15_demo'))).toBe('pulssi_ei_jaksoa_p15_demo');
  });
  it('siirretty palaa täsmälleen palaa_vk:lla (ei aiemmin, ei myöhemmin piilossa)', () => {
    const k = [{ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: 'siirretty', palaa_vk: '2026-W43' }], s = [sig('ei_jaksoa', 'a')];
    expect(P.tmPulssiPiilossa(k, s, '2026-W42', NYT_MS)).toEqual({ 'ei_jaksoa|a': true });
    expect(P.tmPulssiPiilossa(k, s, '2026-W43', NYT_MS)).toEqual({});
    expect(P.tmPulssiPiilossa(k, s, '2026-W44', NYT_MS)).toEqual({});
    expect(P.tmPulssiPiilossa([{ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: 'siirretty', palaa_vk: '2027-W01' }], s, '2026-W53', NYT_MS)).toEqual({ 'ei_jaksoa|a': true });
  });
  it('kuitattu: tuore (≤ 14 pv) piilottaa aina; vanhempi vain saman ehdon → ehdon muuttuessa signaali palaa (ehdotusEste-periaate)', () => {
    const kui = (pvm, ehto) => [{ tyyppi: 'pulssi', signaali: 'katselmusikkuna', joukkue: 'a', tila: 'kuitattu', ehto, kuitattu_pvm: pvm }], s = (auki) => [sig('katselmusikkuna', 'a', { auki })];
    expect(P.tmPulssiPiilossa(kui(tuore, 'auki:3'), s(5), '2026-W42', NYT_MS)).toEqual({ 'katselmusikkuna|a': true });   // tuore, ehto muuttui → silti piilossa
    expect(P.tmPulssiPiilossa(kui(vanha, 'auki:3'), s(3), '2026-W42', NYT_MS)).toEqual({ 'katselmusikkuna|a': true });    // vanha, sama ehto
    expect(P.tmPulssiPiilossa(kui(vanha, 'auki:3'), s(5), '2026-W42', NYT_MS)).toEqual({});                               // vanha, ehto muuttui → palaa
    expect(P.tmPulssiPiilossa(kui({ seconds: tuore / 1000 }, 'x'), s(1), '2026-W42', NYT_MS)).toEqual({ 'katselmusikkuna|a': true });   // Firestore Timestamp
  });
  it('toisen joukkueen / toisen tyypin kuittaus ei piilota; tuntematon tyyppi ja roskadata ei kaada', () => {
    const k = [{ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'b', tila: 'kuitattu', ehto: 'ei_jaksoa', kuitattu_pvm: tuore }, { tyyppi: 'ehdotus' }, null, { tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: '?' }];
    expect(P.tmPulssiPiilossa(k, [sig('ei_jaksoa', 'a')], '2026-W42', NYT_MS)).toEqual({}); expect(P.tmPulssiPiilossa(undefined, [], '2026-W42', NYT_MS)).toEqual({});
  });
  it('malli: kuitattu signaali ei näy eikä lasketa; seuraava signaali nousee tilalle (max 3)', () => {
    const ks = sarja((i) => ({ a: J('P11 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }), b: J('P12 Demo', { profiili: 'ammatti', n_katselmus: 3 }), d: J('P14 Demo', { n_vastanneet: [16, 14, 12, 10][i] }), e: J('P15 Demo', { n_harjoite_7: 2 }) }));
    const ennen = P.tmPulssiRivit(ks, OPTS), jalkeen = P.tmPulssiRivit(ks, Object.assign({ kuittaukset: [{ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: 'kuitattu', ehto: 'ei_jaksoa', kuitattu_pvm: NYT - DAY }] }, OPTS));
    expect(ennen.signaalejaYht).toBe(4); expect(jalkeen.signaalejaYht).toBe(3); expect(jalkeen.signaalejaLisaa).toBe(0); expect(jalkeen.signaalit.map((x) => x.tyyppi)).toEqual(['katselmusikkuna', 'katsaus_laskee', 'kaytto_matala']);
  });
});

describe('korjaukset: katselmussolun toisto', () => {
  const ks = sarja(() => ({ a: J('P13 Demo', { n_katselmus: 0, n_katselmus_perusta: 0, jakso_paattynyt: true }) }));
  it('katselmus ilman perustaa: ei = jakso_kesken/ei_jaksoa (ei 0 %)', () => { const m = P.tmPulssiRivit(ks, OPTS); expect(m.rivit[0].katselmus.n).toBeUndefined(); expect(['jakso_kesken', 'ei_jaksoa', 'ikkuna_auki']).toContain(m.rivit[0].katselmus.ei); });
});
