/**
 * S2 PR 1 — lib/tm_seuran_pulssi.js (docs/CODE_BRIEF_S2_KOTI.md): pulssitaulukko, merkit, signaalit, datan ikä, käyttöönotto, kattavuus, mobiilikortit.
 * Fixtuurit ovat käsin rakennettuja kooste v4/v5 -dokumentteja (ei oikeaa dataa, ei pelaajanimiä).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const P = require('../lib/tm_seuran_pulssi.js');
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
  it('Käyttö = n_harjoite_7 (D119); Leikkijällä n_perhe_kuittaus_7 ("perhe mukana")', () => {
    const r = Object.fromEntries(m.rivit.map((x) => [x.nimi, x]));
    expect(r['P15 Demo'].kaytto).toMatchObject({ o: 14, n: 20, pros: 70, merkki: 'ok' });
    expect(r['P10 Demo'].kaytto).toMatchObject({ o: 9, n: 16 }); expect(r['P10 Demo'].leikkija).toBe(true);
    expect(P.tmPulssiHTML(m, { t: (x) => x })).toContain('perhe mukana');
  });
  it('Leikkijä: viikkokatsaus "ei Leikkijällä"; katselmus "—" (D71)', () => {
    const r = m.rivit[0]; expect(r.katsaus).toEqual({ ei: 'leikkija' }); const h = P.tmPulssiHTML(m, { t: (x) => x }); expect(h).toContain('ei Leikkijällä');
  });
  it('pieni joukkue < 5: lukumäärä 3/4, ei prosenttia eikä merkkiä (D116)', () => {
    const t12 = m.rivit.find((x) => x.nimi === 'T12 Demo'); expect(t12.pieni).toBe(true);
    expect(t12.jaksolla.merkki).toBe('n'); expect(t12.katsaus.merkki).toBe('n'); expect(t12.kaytto.merkki).toBe('n');
    const h = P.tmPulssiHTML(m, { t: (x) => x }); expect(h).toContain('<i>○</i>3/4'); expect(h).toContain('<i>○</i>2/4');
  });
  it('v4-kooste ilman v5-kenttiä → Käyttö "—" (ei nollaa), versioVanha', () => {
    const v4 = sarja(() => ({ a: J('P14 Demo', { n_harjoite_7: undefined, n_harjoite_30: undefined }) }));
    v4.forEach((d) => { delete d.joukkueet.a.n_harjoite_7; delete d.joukkueet.a.n_harjoite_30; delete d.yhteensa.n_harjoite_7; });
    const mm = P.tmPulssiRivit(v4, OPTS); expect(mm.rivit[0].kaytto).toEqual({ ei: 'ei_v5' }); expect(mm.versioVanha).toBe(true); expect(mm.seura.kaytto.pros).toBeNull();
  });
  it('ei "tulossa"-saraketta (D110); kuusi saraketta; trendi vain kahdessa sarakkeessa + seura-rivillä (D111)', () => {
    const h = P.tmPulssiHTML(m, { t: (x) => x });
    const otsikot = h.slice(h.indexOf('<thead>'), h.indexOf('</thead>'));
    expect(otsikot.toLowerCase()).not.toContain('tulossa'); expect(otsikot).not.toMatch(/Teema|Kuorma|Kypsyys/);   // sarakkeita ei ole; mockupin selite ("tulevat S4:ssä") on taulukon alla
    expect((h.match(/<th>/g) || []).length).toBe(6);
    const rivi = h.split('<tr>').find((x) => x.indexOf('P15 Demo') >= 0 && x.indexOf('class="nm"') >= 0);
    const solut = rivi.split('</td>'); expect(solut.map((c) => /class="trend/.test(c))).toEqual([false, false, false, true, false, true, false].slice(0, solut.length));
  });
  it('trendi: neljä pistettä; arvio-viikot himmennetty', () => {
    const k2 = sarja((i) => ({ a: J('P14 Demo', { n_vastanneet: 10 + i }) })); k2[1].arvio = true;
    const mm = P.tmPulssiRivit(k2, OPTS); expect(mm.rivit[0].trendi.katsaus).toEqual([50, 55, 60, 65]); expect(mm.rivit[0].trendi.arvio).toEqual([false, true, false, false]);
    expect(P.tmPulssiHTML(mm, { t: (x) => x })).toContain('class="ar"');
  });
  it('Koko seura: uniikit pelaajat koosteen yhteensa-kentästä, joukkueiden summa erikseen', () => {
    const k2 = sarja(() => ({ a: J('P14 Demo', { n_pelaajat: 20 }), b: J('P16 Demo', { n_pelaajat: 11 }) })); k2.forEach((d) => { d.yhteensa.n_pelaajat = 30; });
    const mm = P.tmPulssiRivit(k2, OPTS); expect(mm.seura.n).toBe(30); expect(mm.seura.joukkuePelaajaSumma).toBe(31);
    expect(P.tmPulssiHTML(mm, { t: (x) => x })).toContain('30 pelaajaa (uniikit)');
  });
  it('kattavuusportti (D125): seuratason prosentti vain kun ≥ 2/3 sopivista joukkueista on luku, muuten "x/y" + "joukkuetta mitattu"', () => {
    const k2 = sarja(() => ({ a: J('P13 Demo'), b: J('P14 Demo', { n_vastausperusta: 0, n_vastanneet: 0 }), c: J('P15 Demo', { n_vastausperusta: 0, n_vastanneet: 0 }) }));
    const mm = P.tmPulssiRivit(k2, OPTS); expect(mm.seura.katsaus.pros).toBeNull(); expect(mm.seura.katsaus.kattavuus).toEqual({ kat: 1, sov: 3 });
    expect(P.tmPulssiHTML(mm, { t: (x) => x })).toMatch(/<i>○<\/i>1\/3<\/span><span class="cs">joukkuetta mitattu<\/span>/);   // luku + alarivi, ei rivittyvää lausetta
    const ok = P.tmPulssiRivit(sarja(() => ({ a: J('P13 Demo'), b: J('P14 Demo'), c: J('P15 Demo', { n_vastausperusta: 0, n_vastanneet: 0 }) })), OPTS); expect(ok.seura.katsaus.pros).toBe(80);
  });
});

describe('datan ikä (D113) ja käyttöönotto (D69)', () => {
  const ks = (ikaPv) => sarja(() => ({ a: J('P14 Demo', { n_harjoite_7: 4 }) })).map((d, i, a) => (i === a.length - 1 ? Object.assign(d, { laskettu: { seconds: (NYT - ikaPv * DAY) / 1000 } }) : d));
  it('8 pv vielä tuore; 9 pv → vanha: merkit neutraaleiksi (luvut säilyvät), amber-nauha ja Päivitä nyt', () => {
    const tuore = P.tmPulssiRivit(ks(8), OPTS), vanha = P.tmPulssiRivit(ks(9), OPTS);
    expect(tuore.vanha).toBe(false); expect(tuore.rivit[0].kaytto.merkki).toBe('err');
    expect(vanha.vanha).toBe(true); expect(vanha.rivit[0].kaytto).toMatchObject({ merkki: 'n', pros: 20 });
    const h = P.tmPulssiHTML(vanha, { t: (x) => x, fn: { paivita: 'pv' } }); expect(h).toContain('Kooste vanhentunut'); expect(h).toContain('Luvut ovat 9 päivän takaa'); expect(h).toContain('onclick="pv()"');
  });
  it('otsikossa "vk 42 · laskettu <päivä aika>" (DM Mono)', () => { expect(P.tmPulssiHTML(P.tmPulssiRivit(ks(0.1), OPTS), { t: (x) => x })).toMatch(/vk 42 · laskettu [a-zäö]{2} \d{2}\.\d{2}/); });
  it('käyttöönotto: 4 ensimmäistä viikkoa kaikki ○ + nauha + suostumus eriteltynä; sen jälkeen värit', () => {
    const on = P.tmPulssiRivit(sarja(() => ({ a: J('P14 Demo', { n_harjoite_7: 4 }) })), { nytMs: NYT, ensimmainenVk: '2026-W40' });
    expect(on.onb).toMatchObject({ paalla: true, viikko: 3 });
    const r = on.rivit[0]; [r.jaksolla, r.katsaus, r.kaytto].forEach((c) => expect(c.merkki).toBe('n'));
    const h = P.tmPulssiHTML(on, { t: (x) => x, suostumus: { annettu: 91, eiKutsuttu: 20, odottaa: 31 }, suostumusKooste: 91, fn: { muistuta: 'mu' } });
    expect(h).toContain('Suostumus · käyttöönotto'); expect(h).toContain('91/20 perhettä on antanut suostumuksen.'); expect(h).toContain('20 kutsumatta · 31 odottaa vastausta.'); expect(h).toContain('Muistuta perheitä'); expect(h).toContain('Käyttöönotto viikko 3/4: ei värejä, vain luvut ja trendi.');
    expect(h).toMatch(/Värit alkavat vk 44\. Käyttöönoton alku on seuran ensimmäinen pulssiviikko\./);   // ensimmäinen kooste W40 + 4 vk
    const ohi = P.tmPulssiRivit(sarja(() => ({ a: J('P14 Demo', { n_harjoite_7: 4 }) })), { nytMs: NYT, ensimmainenVk: '2026-W30' });
    expect(ohi.onb.paalla).toBe(false); expect(ohi.rivit[0].kaytto.merkki).toBe('err'); expect(P.tmPulssiHTML(ohi, { t: (x) => x })).not.toContain('Suostumus · käyttöönotto');
  });
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
  it('järjestys 1 → 2 → 3 → 4, max 3 näkyy, loput "+N muuta signaalia"', () => {
    const m = P.tmPulssiRivit(ks, OPTS);
    expect(m.signaalit.map((s) => s.jarj + ':' + s.nimi)).toEqual(['1:P11 Demo', '2:P12 Demo', '3:P14 Demo']);
    expect(m.signaalejaLisaa).toBe(1); expect(m.signaalejaYht).toBe(4);
    const h = P.tmPulssiHTML(m, { t: (x) => x, fn: { tilanne: 'tl' } }); expect(h).toContain('+1 muuta signaalia'); expect(h).toContain('Kaikki signaalit ja poikkeamat → Tilanne');
    expect((h.match(/data-signaali=/g) || []).length).toBe(3);
  });
  it('katselmussignaali vain ammatille ja vasta kun ikkuna ≤ 10 pv; aikapaine = .w (amber)', () => {
    const ilmanPv = P.tmPulssiRivit(ks, OPTS);
    expect(ilmanPv.signaalit.some((s) => s.nimi === 'P13 Demo')).toBe(false);                                 // oto → ei signaalia
    expect(ilmanPv.signaalit.find((s) => s.tyyppi === 'katselmusikkuna').pv).toBeNull();                      // ikkunan päiviä ei tiedossa → auki = signaali
    const myohaan = P.tmPulssiRivit(ks, Object.assign({ katselmusPv: { b: 12 } }, OPTS));
    expect(myohaan.signaalit.some((s) => s.tyyppi === 'katselmusikkuna')).toBe(false);                        // 12 pv > 10
    const lahella = P.tmPulssiRivit(ks, Object.assign({ katselmusPv: { b: 9 } }, OPTS));
    expect(lahella.signaalit.find((s) => s.tyyppi === 'katselmusikkuna').pv).toBe(9);
    expect(P.tmPulssiHTML(lahella, { t: (x) => x })).toMatch(/class="kt-sig w" data-signaali="katselmusikkuna\|b"><span class="kt-eb">P12 Demo · katselmusikkuna 9 pv<\/span><div class="kt-sig-h">Katselmusikkuna sulkeutuu 9 päivän päästä/);
  });
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
  it('rauhallinen viikko (D114): ei signaaleja → "Ei toimenpiteitä tällä viikolla" + tarkistuslause', () => {
    const m = P.tmPulssiRivit(sarja(() => ({ a: J('P14 Demo'), b: J('P15 Demo') })), OPTS);
    const h = P.tmPulssiHTML(m, { t: (x) => x, seuraavaKatselmus: { nimi: 'P17', pv: 12 }, fn: { tilanne: 'tl' } }); expect(m.signaalit).toEqual([]);
    expect(h).toContain('Ei toimenpiteitä tällä viikolla'); expect(h).toContain('Tarkistettu 2 joukkuetta, 0 poikkeamaa.'); expect(h).toContain('Kooste laskettu'); expect(h).toContain('Seuraava katselmusikkuna: P17, 12 pv.'); expect(h).toContain('Tilanne · kausi →'); expect(h).toContain('Kaikki 2 joukkuetta jaksolla.'); expect(h).toContain('Jokaisella joukkueella on jakso ja luvut ovat tavoitteessa tai sen lähellä.'); 
  });
  it('tulkintalause (D109): "x/y joukkuetta jaksolla. N asiaa tälle viikolle."', () => {
    const h = P.tmPulssiHTML(P.tmPulssiRivit(ks, OPTS), { t: (x) => x }); expect(h).toContain('5/6 joukkuetta jaksolla.'); expect(h).toContain('4 asiaa tälle viikolle.');
  });
});

describe('mobiili (D74) ja rakenne', () => {
  const ks = sarja(() => ({ a: J('P11 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }), b: J('P14 Demo'), c: J('P15 Demo') }));
  const h = P.tmPulssiHTML(P.tmPulssiRivit(ks, OPTS), { t: (x) => x });
  it('taulukko + mobiilikortit samassa merkinnässä; tavoitteessa olevat yhden haitarin takana; CSS piilottaa taulukon kapealla (container query + media)', () => {
    expect(h).toContain('class="pt-wrap"'); expect(h).toContain('class="cards"'); expect(h).toContain('<details class="kt-ev acc">'); expect(h).toContain('2 joukkuetta');
    expect(P.CSS).toMatch(/@container tmp \(max-width:720px\)\{\.tmp \.pt-wrap\{display:none\}\.tmp \.cards\{display:grid\}/); expect(P.CSS).toMatch(/@media \(max-width:720px\)/);
    expect(P.CSS).toMatch(/container-type:inline-size;container-name:tmp/);
  });
  it('joukkueen nimi avaa tiiminäkymän (D121, ei uutta näkymää): onclick fn.joukkue', () => {
    const o = P.tmPulssiHTML(P.tmPulssiRivit(ks, OPTS), { t: (x) => x, fn: { joukkue: 'avaaJ' } }); expect(o).toContain('onclick="avaaJ(\'P14 Demo\')"');
  });
  it('rytmi, ei laatu (D117): taulukon alla yksi lause', () => { expect(h).toContain('Luvut kertovat silmukan rytmin, eivät sen laatua. Laadun arvioi katselmus.'); });
  it('tyhjä (ei koosteita) → rauhallinen odotustila, ei kaatumista', () => { expect(P.tmPulssiRivit([], OPTS)).toEqual({ tyhja: true }); expect(P.tmPulssiHTML({ tyhja: true }, { t: (x) => x })).toContain('Pulssi alkaa kertyä'); });
});

describe('tietosuoja ja kieli', () => {
  const ks = sarja(() => ({ a: J('P14 Demo', { n_katselmus: 2, profiili: 'ammatti' }), b: J('P15 Demo', { ikavaihe: 'leikkija', n_perhe_kuittaus_7: 3 }) }));
  const m = P.tmPulssiRivit(ks, OPTS), h = P.tmPulssiHTML(m, { t: (x) => x });
  it('ei pelaajanimiä, ID:itä eikä uid-kenttiä (D122, §7.22)', () => { expect(h).not.toMatch(/pelaajaId|uid|etunimi|sukunimi|"id":/i); expect(JSON.stringify(m)).not.toMatch(/pelaajaId|etunimi|sukunimi/); });
  it('KAIKKI näkyvä teksti kulkee t():n läpi (ei reitittämätöntä suomea)', () => {
    const t = (x) => '«' + x + '»', k = P.tmPulssiHTML(P.tmPulssiRivit(ks, OPTS), { t, suostumus: { annettu: 1, eiKutsuttu: 1, odottaa: 1 }, fn: { joukkue: 'a', paivita: 'p', tilanne: 'tl', muistuta: 'm' }, seuraava: '«x»' });
    const jaljella = strip(k).replace(/«[^»]*»/g, ' ').replace(/[\d\W_]+/g, ' ').split(' ').filter((w) => /[a-zäö]{4,}/i.test(w) && !/^(Demo|Xyz|ar|trend)$/.test(w));
    expect(jaljella).toEqual([]);
    const tul = P.tmPulssiTulossaHTML([{ nimi: 'Ottelu', alkaa: NYT + DAY }], NYT, { t });
    expect(strip(tul).replace(/«[^»]*»/g, '')).not.toMatch(/Tulossa|Ei tapahtumia/);
  });
  it('Tulossa 14 pv: vain otsikot ja päivät; Tänään: vain nykyinen päivä', () => {
    const ev = [{ nimi: 'A', alkaa: NYT + 2 * DAY }, { nimi: 'B', alkaa: NYT + 20 * DAY }, { nimi: 'C', alkaa: NYT + 3600000 }];
    const tulossa = P.tmPulssiTulossaHTML(ev, NYT, {}), tanaan = P.tmPulssiTulossaHTML(ev, NYT, { tanaan: true });
    expect(tulossa).toContain('>A<'); expect(tulossa).not.toContain('>B<'); expect(tanaan).toContain('>C<'); expect(tanaan).not.toContain('>A<');
    expect(P.tmPulssiTulossaHTML([], NYT, {})).toContain('Ei tapahtumia seuraavan 14 päivän aikana.');
  });
  it('seuraava tapahtuma', () => { expect(P.tmPulssiSeuraavaTapahtuma([{ nimi: 'B', alkaa: NYT + 5 * DAY }, { nimi: 'A', alkaa: NYT + DAY }, { nimi: 'X', alkaa: NYT - DAY }], NYT).nimi).toBe('A'); });
});

describe('jaetut mockup 22 -komponentit (Design: ei kolmatta korttiversiota)', () => {
  const KT = require('../lib/tm_kt_komponentit.js'), KP = require('../lib/tm_kehitystyopoyta.js');
  const ks = sarja(() => ({ a: J('P11 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }), b: J('P14 Demo') }));
  const h = P.tmPulssiHTML(P.tmPulssiRivit(ks, OPTS), { t: (x) => x });
  it('signaali, nappi, yläotsikko ja kortti käyttävät .kt-*-luokkia; Pulssin oma CSS ei määrittele niitä uudelleen', () => {
    ['kt-sig', 'kt-sig-h', 'kt-sig-why', 'kt-sig-second', 'kt-btn', 'kt-eb', 'kt-ev'].forEach((c) => expect(h + P.tmPulssiTulossaHTML([], NYT, {}), c).toContain(c));
    expect(h).not.toMatch(/class="(ev sig|eb|btn)[ "]/);
    ['kt-sig', 'kt-sig-h', 'kt-sig-why', 'kt-btn', 'kt-eb', 'kt-ev', 'kt-q3'].forEach((c) => expect(P.CSS, 'pulssin CSS ei saa määritellä komponenttia .' + c + ' uudelleen (vain .tmp-skoopattuja asettelusäätöjä)').not.toMatch(new RegExp('(^|[}\'+])\\.' + c + '[{ .:,]')));
  });
  it('YKSI paikka: Kehitystyöpöytä sisältää täsmälleen saman jaetun CSS:n; kopioita ei ole', () => {
    const kt = KP.tmKtCss(); expect(kt).toContain(KT.CSS);
    ['.kt-sig{', '.kt-sig-h{', '.kt-btn{', '.kt-eb{', '.kt-q3{'].forEach((r) => expect(kt.split(r).length - 1, r).toBe(1));
  });
  it('Design: vain olemassa olevat tokenit — ei hex-/rgb-värejä jaetussa eikä pulssin CSS:ssä', () => {
    [KT.CSS, P.CSS].forEach((c) => { expect(c).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(c).not.toMatch(/rgba?\(/); });
    const luvut = (KT.CSS + P.CSS).match(/var\(--[a-z0-9-]+/g).map((x) => x.slice(6)), sallitut = new Set(['teal', 'amber', 'red', 'ink', 'ink2', 'ink3', 'bg', 'bg3', 'border', 'ov-2', 'ov-4', 'ov-5', 'font-serif', 'font-mono', 'font-sans', 'kt-serif', 'amber-dim', 'on-accent']);
    expect([...new Set(luvut)].filter((x) => !sallitut.has(x))).toEqual([]);
  });
  it('mitat mockupista: yläotsikko DM Mono 11 px, otsikot Cormorant 24 px, taulukon teksti 13,5 px, otsikkosolut 11 px isoilla, kortti radius 6 · padding 12/14 · gap 8', () => {
    expect(KT.CSS).toMatch(/\.kt-eb\{font-family:var\(--font-mono\);font-size:11px;letter-spacing:\.16em;text-transform:uppercase/);
    expect(KT.CSS).toMatch(/\.kt-sig-h\{font-family:var\(--kt-serif\);font-size:24px/);
    expect(KT.CSS).toMatch(/\.kt-sig\{[^}]*border-radius:6px;padding:12px 14px;display:grid;gap:8px/); expect(KT.CSS).toMatch(/\.kt-ev\{[^}]*border-radius:6px[^}]*gap:8px;padding:12px 14px/);
    expect(P.CSS).toMatch(/table\.pt\{[^}]*font-size:13\.5px/); expect(P.CSS).toMatch(/table\.pt th\{[^}]*font-size:11px;letter-spacing:\.08em;text-transform:uppercase/);
    expect(P.CSS).toMatch(/\.pv\{[^}]*font-family:var\(--font-serif\);font-size:22px/);
  });
  it('muotomerkit: ● teal ▲ amber ■ red ○ harmaa, aina luvun kanssa', () => {
    expect(P.CSS).toMatch(/\.pv\.ok i\{color:var\(--teal\)\}.*\.pv\.w,\.tmp \.pv\.w i\{color:var\(--amber\)\}.*\.pv\.err,\.tmp \.pv\.err i\{color:var\(--red\)\}.*\.pv\.n i\{color:var\(--ink3\)\}/);
    const merkit = h.match(/<span class="pv (ok|w|err|n)[^"]*"[^>]*><i>(●|▲|■|○)<\/i>/g) || []; expect(merkit.length).toBeGreaterThan(5);
    merkit.forEach((m) => { const [, tila, glyph] = /pv (ok|w|err|n).*<i>(.)<\/i>/.exec(m); expect({ ok: '●', w: '▲', err: '■', n: '○' }[tila]).toBe(glyph); });
    expect(h).not.toMatch(/<i>[●▲■○]<\/i><\/span>/);   // glyph ei koskaan ilman lukua/tekstiä
  });
  it('kielletyt sanat eivät esiinny näkyvässä tekstissä: "heikko", "ase", pelaajanimet', () => {
    const teksti = strip(h).toLowerCase(); expect(teksti).not.toMatch(/heikko|\base\b|\bpelaajanimi/);
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
  it('HTML: napit vain kun fn.kuittaa annettu; onclick välittää avaimen ja tilan', () => {
    const m = P.tmPulssiRivit(sarja(() => ({ a: J('P11 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }) })), OPTS);
    expect(P.tmPulssiHTML(m, { t: (x) => x })).not.toContain('data-kuittaus');
    const h = P.tmPulssiHTML(m, { t: (x) => x, fn: { kuittaa: 'kuittaaFn' } });
    expect(h).toContain("onclick=\"kuittaaFn('ei_jaksoa|a','kuitattu')\">Kuittaa</button>"); expect(h).toContain("onclick=\"kuittaaFn('ei_jaksoa|a','siirretty')\">Ensi viikolla</button>");
  });
});

describe('korjaukset: katselmussolun toisto', () => {
  const ks = sarja(() => ({ a: J('P13 Demo', { n_katselmus: 0, n_katselmus_perusta: 0, jakso_paattynyt: true }) }));
  it('ikkuna auki -solussa teksti vain kerran: "ikkuna auki N pv" (tai "ikkuna auki" ilman päiviä)', () => {
    const m = P.tmPulssiRivit(ks, OPTS); m.rivit[0].katselmus = { ei: 'ikkuna_auki' };
    [6, null].forEach((pv) => {
      m.rivit[0].katselmusPv = pv;
      const solu = /<td>(?:(?!<\/td>).)*ikkuna auki(?:(?!<\/td>).)*<\/td>/.exec(P.tmPulssiHTML(m, { t: (x) => x }))[0];
      expect((solu.match(/ikkuna auki/g) || []).length, solu).toBe(1);
      expect(solu).toContain(pv == null ? '>ikkuna auki<' : 'ikkuna auki 6 pv');
    });
  });
});
