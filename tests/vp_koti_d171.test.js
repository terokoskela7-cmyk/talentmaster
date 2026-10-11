/* D171 (Tero 11.10.2026) · Koti: visuaalinen yhdistelmä, mockupit 32 + 33. Käynnistys: askeleet yhteen paneeliin, johtolause, testipäivälaskuri (kalenteri); oikea palsta; ikävaiheryhmittely;
   D169-typografia uusille elementeille. Rytmin korttitestit: tests/vp_koti_rytmi.test.js (D171-lohko). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KK = require('../lib/tm_vp_koti.js'), KJ = require('../lib/tm_vp_koti_joukkueet.js'), KP = require('../lib/tm_vp_koti_palsta.js'), PU = require('../lib/tm_seuran_pulssi.js'), F = require('./helpers/vp_fixture.cjs'), IV = require('../functions/tm_ikavaihe.js');
const NYT = Date.UTC(2026, 9, 12, 7, 0), DAY = 86400000, HR = 3600000, teksti = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const FN = { aloitaJaksot: 'aj', kutsu: 'ku', testit: 'te', joukkue: 'jk', viesti: 'vi', tilanne: 'ti', kalenteri: 'ka', paivita: 'pa', auki: 'au', opas: 'op' };
const mallit = (tila, muokkaa) => { const d = F.lataa(tila, NYT); if (muokkaa) muokkaa(d); const v = d.koosteet[d.koosteet.length - 1], m = PU.tmPulssiRivit(d.koosteet, { nytMs: NYT, ensimmainenVk: d.ensin, jaksoVk: d.jaksoVk, katselmusPv: {} });
  const env = { yhteensa: v.yhteensa, koosteJ: v.joukkueet, testit: d.tapahtumat, nimet: d.nimet, kalenteri: d.kalenteri, viestit: [], nytMs: NYT, seuraNimi: 'Demo FC' }; return { d, m, env, km: KK.tmKotiKaynnistysMalli(m, env), rm: KK.tmKotiRytmiMalli(m, env) }; };
const kaynn = (tila, muokkaa) => { const x = mallit(tila, muokkaa); return Object.assign(x, { r: KK.tmKotiKaynnistysHTML(x.km, { t: (s) => s, fn: FN }) }); };
const rytmi = (tila, muokkaa, o) => { const x = mallit(tila, muokkaa); return Object.assign(x, { r: KK.tmKotiRytmiHTML(x.rm, Object.assign({ t: (s) => s, fn: FN }, o || {})) }); };

describe('A · johtolause: "Yhdellä joukkueella 15:sta on jakso." / "N joukkueella M:stä on jakso." (taivutus yksi/monta)', () => {
  const lause = (a, b) => KK.johtolause((s) => s, a, b);
  it('lause: yksi → "Yhdellä joukkueella", monta → "N joukkueella"; nolla → "Yhdelläkään joukkueella … ei ole vielä jaksoa"', () => {
    expect(teksti(kaynn('pilotti').r.main)).toContain('Yhdellä joukkueella 15:stä on jakso.');
    expect(lause(1, 15)).toBe('Yhdellä joukkueella 15:stä on jakso.'); expect(lause(2, 15)).toBe('2 joukkueella 15:stä on jakso.'); expect(lause(8, 9)).toBe('8 joukkueella 9:stä on jakso.'); expect(lause(0, 20)).toBe('Yhdelläkään joukkueella 20:stä ei ole vielä jaksoa.');
  });
  it('elatiivin pääte viimeisen sanan mukaan: -stä (yhdestä, kymmenestä, viidestätoista, kahdestakymmenestä, sataviidestätoista), -sta vain sadasta ja tuhannesta + takavokaalinen viimeinen sana (kahdesta, kolmesta, kuudesta, kahdeksasta); taulukko 1–30, 100, 115, 1000', () => {
    const odotus = { 1: 'stä', 2: 'sta', 3: 'sta', 4: 'stä', 5: 'stä', 6: 'sta', 7: 'stä', 8: 'sta', 9: 'stä', 10: 'stä', 11: 'stä', 12: 'stä', 13: 'stä', 14: 'stä', 15: 'stä', 16: 'stä', 17: 'stä', 18: 'stä', 19: 'stä', 20: 'stä', 21: 'stä', 22: 'sta', 23: 'sta', 24: 'stä', 25: 'stä', 26: 'sta', 27: 'stä', 28: 'sta', 29: 'stä', 30: 'stä', 100: 'sta', 115: 'stä', 1000: 'sta' };
    Object.keys(odotus).forEach((n) => { expect(KK.elatiivi(+n), String(n)).toBe(odotus[n]); expect(lause(1, +n), String(n)).toContain(n + ':' + odotus[n] + ' on jakso'); });
    expect([200, 300, 2000].map(KK.elatiivi)).toEqual(['sta', 'sta', 'sta']); expect([40, 90, 120, 215].map(KK.elatiivi)).toEqual(['stä', 'stä', 'stä', 'stä']);
  });
  it('sama lause Rytmissä; ei vanhaa "Jakso on käynnissä a/b joukkueella" Kodissa', () => { expect(teksti(rytmi('kypsa').r.main)).toContain('8 joukkueella 9:stä on jakso.');; expect(teksti(kaynn('pilotti').r.main)).not.toContain('Jakso on käynnissä'); });
});

describe('Kodin otsikko: luku 1–10 sanana, yli 10 numerona (sv-avaimet kokonaisina lauseina)', () => {
  it('asiaaOtsikko: 0 → Rauhallinen viikko.; 1–10 sanalla; 11+ numerolla', () => {
    const t = (x) => x, odotus = ['Rauhallinen viikko.', 'Yksi asia tällä viikolla.', 'Kaksi asiaa tällä viikolla.', 'Kolme asiaa tällä viikolla.', 'Neljä asiaa tällä viikolla.', 'Viisi asiaa tällä viikolla.', 'Kuusi asiaa tällä viikolla.', 'Seitsemän asiaa tällä viikolla.', 'Kahdeksan asiaa tällä viikolla.', 'Yhdeksän asiaa tällä viikolla.', 'Kymmenen asiaa tällä viikolla.'];
    odotus.forEach((x, n) => expect(KK.asiaaOtsikko(t, n)).toBe(x)); expect(KK.asiaaOtsikko(t, 11)).toBe('11 asiaa tällä viikolla.'); expect(KK.asiaaOtsikko(t, 23)).toBe('23 asiaa tällä viikolla.');
  });
  it('renderöity otsikko (h1) käyttää sanaa; "Viisi asiaa tällä viikolla." kypsässä kun 5 asiaa', () => { const { rm, r } = rytmi('kypsa'); expect(rm.asioita).toBeGreaterThan(0); expect(teksti(r.main)).toContain(KK.asiaaOtsikko((x) => x, rm.asioita)); expect(teksti(r.main)).not.toMatch(/\b[2-9] asiaa tällä viikolla/); });
});

describe('Tekniikka / fyysinen kehityskohteena EIVÄT ole Kodissa (D118 · D163; näkyvät Tilanteessa)', () => {
  it('Tällä viikolla -lista ja otsikon asiamäärä ilman tekniikka-/fyysinen-rivejä, vaikka syöte antaa ne; Tilanne näyttää ne', () => {
    ['kypsa', 'kuormitus', 'pilotti'].forEach((tila) => { const d = F.lataa(tila, NYT), x = teksti(F.kotiHTML(d, {})); expect(x, tila).not.toMatch(/Tekniikka kehityskohteena|Fyysiset testit kehityskohteena|Ei tekniikkadataa/); });
    const a = mallit('kypsa'), env = Object.assign({}, a.env, { tekniikka: { kehityskohde: 5, eiTekniikkadataa: 2 }, fyysinen: { kehityskohde: 4 } }); const rm = KK.tmKotiRytmiMalli(a.m, env), rm0 = a.rm; expect(rm.asioita).toBe(rm0.asioita); expect(rm.entries.some((e) => e.tyyppi === 'tekniikka' || e.tyyppi === 'fyysinen')).toBe(false);
    const TT = require('../lib/tm_vp_tilanne.js'), d = F.lataa('kypsa', NYT); expect(teksti(TT.tmTilanneHTML(TT.tmTilanneMalli(d.syote), { t: (s) => s, fn: {} }))).toMatch(/Tekniikka kehityskohteena · \d+ joukkuetta/);
  });
});

describe('A · askeleet yhteen paneeliin, erottimilla; ensimmäinen keskeneräinen teal-sävytetty; numerot ympyröissä', () => {
  it('yksi .kk-steps-paneeli, kolme .kk-st-riviä (ei erillisiä .kt-ev-kortteja); numerot .kk-sn-ympyröissä', () => {
    const { r } = kaynn('pilotti'), h = r.main; expect((h.match(/class="kk-steps"/g) || []).length).toBe(1); expect((h.match(/class="kk-st[ "]/g) || []).length).toBe(3); expect(h).not.toMatch(/class="kt-ev kk-st/); expect((h.match(/class="kk-sn"/g) || []).length).toBe(3);
    const paneeli = h.slice(h.indexOf('class="kk-steps"')); expect(teksti(paneeli.slice(0, paneeli.indexOf('Tällä viikolla') > 0 ? paneeli.indexOf('Tällä viikolla') : 2000))).toMatch(/1 Jaksot[\s\S]*2 Perheet mukana[\s\S]*3 Testipäivät/);
  });
  it('korostus on ENSIMMÄISELLÄ KESKENERÄISELLÄ askeleella (ei aina ensimmäisellä): jaksot valmiina → askel 2 .eka; vain yksi .eka; sama askel saa ainoan täytetyn napin (D165)', () => {
    const a = kaynn('pilotti').r.main; expect((a.match(/class="kk-st eka"/g) || []).length).toBe(1); expect(a.indexOf('class="kk-st eka"')).toBeLessThan(a.indexOf('Perheet mukana'));
    const { km } = mallit('pilotti'); km.askeleet[0].valmis = true; km.askeleet[0].taytetty = false; km.askeleet[1].taytetty = true; const h = KK.tmKotiKaynnistysHTML(km, { t: (s) => s, fn: FN }).main;
    const rivit = [...h.matchAll(/class="(kk-st(?: [^"]*)?)"/g)].map((m) => m[1]); expect(rivit).toEqual(['kk-st ok', 'kk-st eka', 'kk-st']); expect((h.match(/class="kt-btn"/g) || []).length).toBe(1);
  });
  it('CSS: paneeli yhtenäinen reunus ja erottimet (border-top), .eka teal-sävytetty (color-mix teal), numeroympyrä 28 px', () => {
    expect(KK.CSS).toMatch(/\.kk-steps\{[^}]*border:1px solid var\(--border\)/); expect(KK.CSS).toMatch(/\.kk-st\{[^}]*border-top:1px solid var\(--border\)/); expect(KK.CSS).toMatch(/\.kk-st\.eka\{background:color-mix\(in srgb,var\(--teal\)/); expect(KK.CSS).toMatch(/\.kk-sn\{width:28px;height:28px;border-radius:50%/);
  });
  it('askeleen 2 lopusta poistettu "Tilanne viikolta N." (D150: kooste-aika näkyy ylhäällä); tuotannon sisältö säilyy: askeleen 1 teksti, "Odottaa jaksoa" 6 + "+N", perheitä mukana (D139)', () => {
    const t = teksti(kaynn('pilotti').r.main); expect(t).not.toContain('Tilanne viikolta'); expect(t).toContain('Aloita jakso joukkueen näkymässä. Jakso antaa joukkueelle teeman ja viikkotavoitteet.'); expect(t).not.toMatch(/vahvistaa/); expect(t).toContain('Odottaa jaksoa · 14'); expect(t).toMatch(/\+8/); expect(t).toContain('perheitä mukana');
  });
});

describe('A · Testipäivät-laskuri: kalenterin testi- ja kilpailutapahtumat lasketaan joukkueen varaamaksi testipäiväksi', () => {
  const KAL = (o) => Object.assign({ alkaa: NYT + 8 * DAY, poistettu: false }, o), kaikki = (d) => d.spec.joukkueet.map((j) => j.id);
  const askel = (d0, kal, muokkaa) => mallit('pilotti', (d) => { d.tapahtumat = []; d.kalenteri = kal(d); if (muokkaa) muokkaa(d); }).km.askeleet[2];
  it('KPV-tapaus: P13:lla tekniikkakisat 20.10. (tyyppi testitapahtuma) mutta ei suunniteltua testijaksoa → 1/15 (ei enää "0/15 · ei suunniteltu")', () => {
    const a = askel(null, (d) => [KAL({ nimi: 'Tekniikkakisat', tyyppi: 'testitapahtuma', joukkue: kaikki(d)[4], joukkueet: [kaikki(d)[4]], joukkue_nimi: 'P12 Pilotti' })]); expect([a.a, a.b]).toEqual([1, 15]);
    expect(KK.tmKotiKaynnistysHTML(mallit('pilotti', (d) => { d.tapahtumat = []; d.kalenteri = [KAL({ nimi: 'Tekniikkakisat', tyyppi: 'testitapahtuma', joukkue: kaikki(d)[4], joukkueet: [kaikki(d)[4]] })]; }).km, { t: (s) => s, fn: FN }).main).toContain('Testitapahtumia kalenterissa vk');
  });
  it('lasketaan: tyyppi testitapahtuma · testitapahtuma_id · nimi tyypille muu/turnaus/tyhjä (testi, kisa, kilpailu, tekniikkakisat, mittaus…)', () => {
    const joukkue = (d, i) => ({ joukkue: kaikki(d)[i], joukkueet: [kaikki(d)[i]] });
    const tapaukset = [{ tyyppi: 'testitapahtuma', nimi: 'Mitä tahansa' }, { tyyppi: 'ottelu', nimi: 'x', testitapahtuma_id: 't9' }, { tyyppi: 'muu', nimi: 'Tekniikkakisat' }, { tyyppi: 'muu', nimi: 'HH-testi' }, { tyyppi: 'turnaus', nimi: 'Syyskisat' }, { tyyppi: 'muu', nimi: 'Kilpailu' }, { nimi: 'Testipäivä' }, { tyyppi: 'muu', nimi: 'Mittaukset' }];
    tapaukset.forEach((x, i) => expect(askel(null, (d) => [KAL(Object.assign({}, x, joukkue(d, 1)))]).a, JSON.stringify(x)).toBe(1));
  });
  it('EI lasketa: ottelu, harjoitus, palaverit, poistettu tapahtuma, menneisyys (> 1 pv sitten), tapahtuma testijakson jälkeen, testin kaltainen nimi väärällä tyypillä (harjoitus "Testiharjoitus" ≠ testi)', () => {
    const j = (d, i) => ({ joukkue: kaikki(d)[i], joukkueet: [kaikki(d)[i]] });
    [{ tyyppi: 'ottelu', nimi: 'Ottelu' }, { tyyppi: 'harjoitus', nimi: 'Harjoitus' }, { tyyppi: 'harjoitus', nimi: 'Testiharjoitus' }, { tyyppi: 'jaksopalaveri', nimi: 'Jaksopalaveri' }, { tyyppi: 'valmentajapalaveri', nimi: 'Testikeskustelu' }, { tyyppi: 'testitapahtuma', nimi: 'Poistettu', poistettu: true }, { tyyppi: 'testitapahtuma', nimi: 'Menneisyys', alkaa: NYT - 3 * DAY }]
      .forEach((x) => expect(askel(null, (d) => [KAL(Object.assign({}, x, j(d, 1)))]).a, JSON.stringify(x)).toBe(0));
    const ylaraja = mallit('pilotti', (d) => { d.kalenteri = [KAL({ tyyppi: 'testitapahtuma', nimi: 'Liian myöhään', alkaa: NYT + 60 * DAY, joukkue: kaikki(d)[8], joukkueet: [kaikki(d)[8]] })]; }).km.askeleet[2]; expect(ylaraja.a).toBe(2);   // fixturen testijakso loppuu +31 pv → +60 pv jää ulkopuolelle; 2 = vain testitapahtumat
  });
  it('sama joukkue kahdesti ei kasvata lukua; testitapahtuma-kokoelma + kalenteri yhdessä: eri joukkueet summautuvat; 0 pelaajan joukkue ei lasketa', () => {
    const a = askel(null, (d) => [KAL({ tyyppi: 'testitapahtuma', nimi: 'A', joukkue: kaikki(d)[2], joukkueet: [kaikki(d)[2]] }), KAL({ tyyppi: 'muu', nimi: 'Testi', joukkue: kaikki(d)[2], joukkueet: [kaikki(d)[2]], alkaa: NYT + 9 * DAY })]); expect(a.a).toBe(1);
    const b = mallit('pilotti', (d) => { d.kalenteri = d.kalenteri.concat([KAL({ tyyppi: 'testitapahtuma', nimi: 'Kisat', joukkue: kaikki(d)[4], joukkueet: [kaikki(d)[4]] })]); }).km.askeleet[2]; expect(b.a).toBe(3);   // 2 (testitapahtumat) + 1 (kalenteri)
  });
  it('joukkue tunnistetaan myös nimellä (joukkue_nimi) ja joukkueet-taulukosta', () => {
    expect(askel(null, (d) => [KAL({ tyyppi: 'testitapahtuma', nimi: 'Kisat', joukkue_nimi: 'P12 Pilotti' })]).a).toBe(1); expect(askel(null, (d) => [KAL({ tyyppi: 'testitapahtuma', nimi: 'Kisat', joukkueet: [kaikki(d)[4], kaikki(d)[5]] })]).a).toBe(2);
  });
});

describe('C · oikea palsta (kummassakin vaiheessa)', () => {
  const palsta = (tila, muokkaa) => teksti(kaynn(tila, muokkaa).r.rail), kal = (d) => d.kalenteri, id = (d, i) => d.spec.joukkueet[i].id;
  it('Tänään: tapahtuma · joukkueen tunniste · jakson nimi + viikko, jos joukkueella on jakso ("P10 · harjoitus Pelaaminen vk 4/8")', () => {
    const r = rytmi('kypsa', (d) => { d.kalenteri = [{ nimi: '', tyyppi: 'harjoitus', alkaa: NYT + 2 * HR, joukkue: id(d, 0), joukkueet: [id(d, 0)], joukkue_nimi: 'P10 Demo' }]; }); const x = teksti(r.r.rail); expect(x).toMatch(/P10 · harjoitus Pelaaminen vk 4\/8/);
    const eiJaksoa = teksti(rytmi('kypsa', (d) => { d.kalenteri = [{ nimi: '', tyyppi: 'harjoitus', alkaa: NYT + 2 * HR, joukkue: id(d, 7), joukkueet: [id(d, 7)], joukkue_nimi: 'P15 Demo' }]; }).r.rail); expect(eiJaksoa).toMatch(/P15 · harjoitus/); expect(eiJaksoa).not.toMatch(/P15 · harjoitus \S+ vk/);
  });
  it('Tulossa 14 pv: harjoitukset ryhmitellään päivittäin (yksi rivi per päivä, "N harjoitusta" + tunnisteet); jokaisella tapahtumalla joukkuetunniste', () => {
    const x = teksti(rytmi('kypsa').r.rail); expect(x).toContain('ti 13.10. 3 harjoitusta P10 P12 P13'); expect(x).toMatch(/T12 · ottelu/); expect(x).toMatch(/pe 16\.10\. T14 · harjoitus/);
    const r = rytmi('kypsa').r.rail; expect((r.match(/3 harjoitusta/g) || []).length).toBe(1);
  });
  it('aina mukana (kun osuu 14 pv sisään): jaksopalaveri "N/M valmiina", testijakso "N/M varannut päivän", taukoviikot katkoviivalaatikkona', () => {
    const r = rytmi('kypsa').r.rail, x = teksti(r); expect(x).toMatch(/Jaksopalaveri \d+\/9 valmiina/); expect(x).toMatch(/Testijakso \d+\/9 varannut päivän/); expect(x).toContain('Syysloma · vk 42–43'); expect(r).toContain('class="kk-tauko"');
    expect(x).toMatch(/Jaksopalaveri 7\/9 valmiina/);   // 9 joukkuetta, 2 ilman valmiutta (P15 ilman jaksoa, P13 katselmus auki)
    const p = palsta('pilotti'); expect(p).toContain('Syysloma'); expect(p).not.toContain('Testijakso 2/15');   // pilotti: testijakso +24 pv → ei 14 päivän sisällä
  });
  it('ei näy kun ei osu 14 päivän sisään: jaksopalaveri +20 pv, testijakso +24 pv, tauko +40 pv', () => {
    const x = palsta('kypsa', (d) => { d.kalenteri = d.kalenteri.filter((e) => e.tyyppi !== 'jaksopalaveri').concat([{ nimi: 'Jaksopalaveri', tyyppi: 'jaksopalaveri', alkaa: NYT + 20 * DAY }]); d.tapahtumat = d.tapahtumat.map((e) => Object.assign({}, e, { pvm_alku: new Date(NYT + 24 * DAY).toISOString().slice(0, 10), pvm_loppu: new Date(NYT + 31 * DAY).toISOString().slice(0, 10) })); d.kalenteri = d.kalenteri.filter((e) => e.tyyppi !== 'seuran_tauko').concat([{ nimi: 'Joululoma', tyyppi: 'seuran_tauko', alkaa: NYT + 40 * DAY, paattyy: NYT + 47 * DAY }]); });
    expect(x).not.toMatch(/Jaksopalaveri/); expect(x).not.toContain('Testijakso'); expect(x).not.toContain('Joululoma');
  });
  it('taukoviikot: env.tauot ja kalenteritapahtuma tyyppiä seuran_tauko (+ vanhat tauko/loma); ei lupausta signaalien/tavoitteiden tauosta (ei toteutettu)', () => {
    const x = palsta('pilotti', (d) => { d.kalenteri = d.kalenteri.filter((e) => e.tyyppi !== 'seuran_tauko').concat([{ nimi: 'Talviloma', tyyppi: 'seuran_tauko', alkaa: NYT + 3 * DAY, paattyy: NYT + 9 * DAY }]); }); expect(x).toContain('Talviloma · vk 42–43'); expect(x).not.toMatch(/Talviloma[^.]*Tavoitteet ja signaalit tauolla/); expect(x).not.toMatch(/Tavoitteet ja signaalit tauolla/);
    const lista = rytmi('pilotti', (d) => { d.kalenteri = d.kalenteri.filter((e) => e.tyyppi !== 'seuran_tauko').concat([{ nimi: 'Talviloma', tyyppi: 'seuran_tauko', alkaa: NYT + 3 * DAY }]); }).r.rail; expect((teksti(lista).match(/Talviloma/g) || []).length).toBe(1);   // loma ei tule myös tapahtumariviksi
  });
  it('palsta on sama Käynnistyksessä ja Rytmissä (sama moduuli); kolme rivityyppiä ilman nappeja paitsi "Avaa kalenteri →"', () => { const a = kaynn('kypsa').r.rail, b = rytmi('kypsa').r.rail; expect(a).toBe(b); expect((b.match(/<button/g) || []).length).toBe(1); expect(teksti(b)).toContain('Avaa kalenteri →'); });
});

describe('B · ikävaiheryhmittely syntymävuodesta; ryhmät eivät ole joukkueita', () => {
  it('jokaisen fixture-joukkueen ryhmä = tmIkavaihe(pelaajien ikä = vuosi − syntymävuosi); otsikon vuosiväli 9–12 / 13–15 / 16–19', () => {
    ['kypsa', 'kuormitus'].forEach((tila) => { const d = F.lataa(tila, NYT), { rm } = mallit(tila); const ryhmaTunnisteelle = {}; rm.ryhmat.forEach((g) => g.kortit.concat(g.ilman).forEach((x) => { ryhmaTunnisteelle[x.nimi] = g.ikavaihe; }));
      d.spec.joukkueet.forEach((j) => { if (ryhmaTunnisteelle[j.nimi] === undefined) return; const pelaajatVuodet = d.pelaajat.filter((p) => (p.joukkueet || []).includes(j.id)).map((p) => p.syntymaVuosi); expect(pelaajatVuodet.length, j.nimi).toBeGreaterThan(0);
        const ika = new Date(NYT).getUTCFullYear() - pelaajatVuodet[0]; expect(IV.tmIkavaihe(ika), tila + ' ' + j.nimi).toBe(ryhmaTunnisteelle[j.nimi]); }); });
    const h = teksti(rytmi('kypsa').r.main); expect(h).toContain('9–12-vuotiaat'); expect(h).toContain('13–15-vuotiaat'); expect(h).toContain('16–19-vuotiaat');
  });
  it('ryhmittely: tmKotiIkaRyhmat — ikäjärjestys ryhmien sisällä, tuntematon ikävaihe omana ryhmänään viimeisenä, 0 pelaajan joukkueet pois', () => {
    const r = (nimi, iv, ika, n, jakso) => ({ jid: nimi, nimi, tunniste: nimi, ikavaihe: iv, ikaNum: ika, n, jakso: { voimassa: jakso }, katsaus: {}, kaytto: {}, leikkija: iv === 'leikkija' });
    const kaikki = [r('P10', 'leikkija', 10, 8, true), r('T9', 'leikkija', 9, 6, false), r('P14', 'rakentaja', 14, 12, true), r('X', null, null, 5, false), r('P12', 'leikkija', 12, 0, true)];
    const ryh = KJ.tmKotiIkaRyhmat(kaikki.filter((x) => x.jakso.voimassa && x.n > 0).map((x) => Object.assign({}, x, { vk: null })), kaikki.filter((x) => !x.jakso.voimassa).map((x) => ({ jid: x.jid, nimi: x.nimi, tunniste: x.nimi })), {}, kaikki);
    expect(ryh.map((g) => g.ikavaihe)).toEqual(['leikkija', 'rakentaja', null]); expect(ryh[0].kortit.map((k) => k.nimi)).toEqual(['P10']); expect(ryh[0].ilman.map((k) => k.nimi)).toEqual(['T9']); expect(ryh[0].joukkueita).toBe(2); expect(ryh[0].ika).toEqual({ a: 9, b: 12 });
  });
});

describe('D168 · kuormitus-fixture (40 joukkuetta, pitkät nimet): Rytmi, ruudukko ja jaksottomien kokoaminen', () => {
  it('20/40 jaksolla → Rytmi; ≥ 20 korttia ikävaiheryhmissä; jaksottomat koottu yhteen katkoviivakorttiin (> 2 per ikävaihe), tunnisteet D144:llä; pitkät nimet eivät rikko korttia (title + ellipsis)', () => {
    const { rm, r } = rytmi('kuormitus'); expect(KK.tmKotiVaihe(mallit('kuormitus').m)).toBe('rytmi'); const kortit = rm.ryhmat.reduce((a, g) => a + g.kortit.length, 0); expect(kortit).toBe(20); expect(rm.ryhmat.length).toBeGreaterThanOrEqual(2);
    expect(rm.ryhmat.filter((g) => g.ilmanYhteen).length).toBeGreaterThanOrEqual(2); expect((r.main.match(/class="kk-ilman"/g) || []).length).toBeGreaterThanOrEqual(2); expect(r.main).toContain('title="Pojkar 8 Östra Nylands Idrottsförening Blå"');
    r.main.split('class="kk-ilman"').slice(1).forEach((b) => { const x = b.slice(0, b.indexOf('Aloita jaksot')); expect((x.match(/class="kk-tag"/g) || []).length).toBeLessThanOrEqual(7); });
  });
});

describe('B · kortin korjaukset (#984): ruudukko auto-fill/minmax(220px), huomiokortin pelaajamäärä metariville, jakson nimi enintään 2 riville', () => {
  it('ruudukko repeat(auto-fill, minmax(220px, 1fr)); ei container-query-sarakkeita', () => { expect(KJ.CSS).toContain('.kk-jg{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}'); expect(KJ.CSS).not.toMatch(/@container[^}]*\.kk-jg\{grid-template-columns/); });
  it('huomiokortti: oikeassa yläkulmassa vain "▲ huomio"; pelaajamäärä metariville ("12 pel. · vk 6/6"), ei tunnisteen alle (.kk-sub pois); tavallisessa kortissa pelaajamäärä oikealla', () => {
    const h = rytmi('kypsa').r.main, kortti = (nimi) => { const i = h.indexOf('aria-label="' + nimi + '"'), re = /<div class="kk-jk[ "]|<div class="kk-ilman|<div class="kk-ika"|<div class="kk-sh"|<div class="kt-ev kk-kn"|<div class="kk-loppu"/g; let a = 0, e = h.length, m; while ((m = re.exec(h))) { if (m.index <= i) { if (m[0].startsWith('<div class="kk-jk')) a = m.index; } else { e = m.index; break; } } return h.slice(a, e); };
    const p13 = kortti('P13 Demo'), p10 = kortti('P10 Demo'); expect(h).not.toContain('kk-sub'); expect(p13).toContain('class="kk-mk w">▲ huomio'); expect(p13).not.toMatch(/class="kk-mk w">[^<]*pel\./); expect(teksti(p13)).toMatch(/12 pel\. · vk 6\/6/);
    expect(p10).toMatch(/class="kk-mk">8 pel\./); expect(teksti(p10)).not.toMatch(/8 pel\. · vk/);
  });
  it('jakson nimi: CSS rajaa enintään kahteen riviin (-webkit-line-clamp:2)', () => { expect(KJ.CSS).toMatch(/\.kk-jak b\{[^}]*-webkit-line-clamp:2/); });
});

describe('D169 · typografia uusille elementeille (koot --fs-*, DM Mono vain .kt-eb, luvut DM Sans 16/600, tunniste Cormorant 26, meta ink2)', () => {
  const sennut = (css) => { const o = []; css.split('\n').forEach((rivi) => { const re = /([^{}]+)\{([^{}]*)\}/g; let m; while ((m = re.exec(rivi))) o.push({ valitsin: m[1].trim(), maar: m[2] }); }); return o; };
  const UUSI = KJ.CSS + '\n' + KP.CSS, S = sennut(UUSI), hae = (v) => S.find((x) => x.valitsin.split(',').some((y) => y.trim() === v));
  it('jokainen font-size on var(--fs-*); ei hex-värejä; ei DM Mono -fonttia', () => { [...UUSI.matchAll(/font-size:([^;}]+)/g)].forEach((m) => expect(m[1]).toMatch(/^var\(--fs-(h1|h2|lead|body|meta|eb)(,\s*[\d.]+px)?\)$/)); expect(UUSI).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(UUSI).not.toMatch(/font-mono|DM Mono/); });
  it('kortin tunniste Cormorant --fs-h2; jakson nimi DM Sans 600 --fs-lead; luvut .kk-v DM Sans 600 tasalevyisinä; meta ink2, nimikkeet ink3', () => {
    expect(hae('.kk-jtn').maar).toMatch(/font-family:var\(--font-serif\)/); expect(hae('.kk-jtn').maar).toContain('font-size:var(--fs-h2'); expect(hae('.kk-jak b').maar).toContain('font-size:var(--fs-lead'); expect(hae('.kk-jak b').maar).toContain('font-weight:600');
    const v = S.concat(sennut(KK.CSS)).find((x) => x.valitsin === '.kk-v'); expect(v.maar).toContain('font-family:var(--font-sans)'); expect(v.maar).toContain('font-weight:600'); expect(v.maar).toContain('font-variant-numeric:tabular-nums'); expect(v.maar).toContain('font-size:var(--fs-lead');
    expect(hae('.kk-vkl').maar).toContain('color:var(--ink2)'); expect(S.concat(sennut(KK.CSS)).find((x) => x.valitsin === '.kk-nk').maar).toContain('color:var(--ink3)'); expect(hae('.kk-p').maar).toContain('color:var(--ink2)');
  });
  it('kuusi kokoa riittää: uudet elementit eivät käytä muita kokoja; mitään luettavaa ei alle 12,5 px (--fs-meta ≥ 12,5)', () => { expect(new Set([...UUSI.matchAll(/font-size:var\((--fs-[a-z0-9]+)/g)].map((m) => m[1]))).toEqual(new Set(['--fs-h2', '--fs-lead', '--fs-body', '--fs-meta'])); });
  it('DM Mono vain yläotsikoissa: ikävaiheotsikko ei käytä .kt-eb-luokkaa eikä DM Monoa (DM Sans 600/400)', () => { const h = rytmi('kypsa').r.main, ikah = h.match(/<div class="kk-ikah">[\s\S]*?<\/div>/)[0]; expect(ikah).not.toContain('kt-eb'); expect(hae('.kk-ikah').maar).not.toMatch(/font-family/); });
});
