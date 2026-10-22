/* K4a · todistekortit (lib/tm_todistekortit.js + tm_todistekortit_html.js, PURE): tulkintasäännöt (docs/22_TULKINTASAANNOT.md §Testit 1–5, 7), asteikot, ei normia, tekniikkanäyte, koonti, fokuskortti, PHV, itsearvioero, trendi, linkitykset, FI-avaimet, ei hex-värejä. */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { TOPIAS, SJK, VAHAN, VANHA } from './helpers/k4a_fixturet.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const N = require('../lib/tm_eerikkila_normit.js');
globalThis.tkLajiTaso = require('../docs/testit_indeksit.js').tkLajiTaso;   // selaimessa classic script (docs/testit_indeksit.js), Nodessa globaaliksi
globalThis.normiIka = N.normiIka;
const TC = require('../lib/tm_todistekortit.js'), TH = require('../lib/tm_todistekortit_html.js'), L = require('../lib/tm_naytto_lohkot.js');
const NYT = new Date('2026-10-19T12:00:00');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const malli = (p, extra) => { const isp = L.tmNayttoDevIkaSp(p); const c = Object.assign({ nyt: NYT, ika: isp.ika, sp: isp.sp, perTestTasot: N.perTestTasot, jaksoTila: 'ei_jaksoa', esc, pid: p.id }, extra || {}); return { m: TC.tmTodisteMalli(p, c), c }; };
const kortti = (m, avain) => m.kortitKaikki[avain];
const bio = (koodi, tahti, pvm) => ({ phv_tila_koodi: koodi, phv_ika: 13.4, maturity_offset: koodi === 'PRE' ? -1.5 : koodi === 'POST' ? 1.2 : 0, pvm: pvm || '2026-10-04', kasvutahti_cm_v: tahti == null ? null : tahti });
const KIELLETYT = /\bheikko\b|heikkou|ranking|vertail/i;   // henkilökunnallekin (22_TULKINTASAANNOT): heikko (pelaajasta), ranking, vertailu; "heikoin osa-alue" sallittu

describe('K4a §2 · asteikot ja pisteet (testin oma asteikko)', () => {
  const { m, c } = malli(TOPIAS);
  it('TK-testit asteikko 5, ADAR asteikko 3, D3 asteikko 5', () => {
    expect(kortti(m, 'tekninen').rivit.map((r) => r.max)).toEqual([5, 5, 5, 5]);
    const peli = kortti(m, 'peli').rivit; expect(peli.filter((r) => r.lahde === 'adar').every((r) => r.max === 3)).toBe(true); expect(peli.filter((r) => r.lahde === 'd3').every((r) => r.max === 5)).toBe(true);
  });
  it('H-H syöttö/pujottelu (ei TK-dataa) asteikko 3', () => {
    const p = Object.assign({}, TOPIAS, { tk_lajit_viimeisin: null, tki_viimeisin: null, hh_viimeisin: { syotto: 11.5, pujottelu: 12.1, lin30m: 4.9 } });
    const r = kortti(malli(p).m, 'tekninen'); expect(r.lahde).toBe('hh'); expect(r.rivit.every((x) => x.max === 3)).toBe(true);
  });
  it('pisteitä on yhtä monta kuin testin asteikko; puolikas taso = puolikas piste (ei pyöristetä alas)', () => {
    const h = TH.tmTodisteHTML(m, c).kortitHTML;
    expect((h.match(/<span class="tc-dots"[^>]*aria-label="taso 2,5\/3"><i class="d on"><\/i><i class="d on"><\/i><i class="d puoli"><\/i><\/span>/g) || []).length).toBeGreaterThanOrEqual(1);   // ADAR 2,5/3
    expect(h).toMatch(/aria-label="taso 5\/5"><i class="d on"><\/i><i class="d on"><\/i><i class="d on"><\/i><i class="d on"><\/i><i class="d on"><\/i><\/span>/);
    expect(h).toMatch(/aria-label="taso 2\/5"><i class="d on"><\/i><i class="d on"><\/i><i class="d"><\/i><i class="d"><\/i><i class="d"><\/i>/);
  });
  it('TK-lajitasot tulevat nykyisellä muunnoksella (docs/testit_indeksit.js tkLajiTaso): syöttö 44,1 s (13 v) = taso 2', () => {
    expect(kortti(m, 'tekninen').rivit.find((r) => r.id === 'syotto').taso).toBe(2);
  });
});

describe('K4a §2 · ei normia ja tekniikkanäyte (seuran oma testistö)', () => {
  const { m, c } = malli(SJK);
  it('fyysinen näyttää seuran testit (10 m, 30 m, CMJ); ei kovakoodattuja KPV-testejä', () => {
    expect(kortti(m, 'fyysinen').rivit.map((r) => r.id)).toEqual(['lin30m', 'cmj', 'lin10m']);
    expect(kortti(m, 'fyysinen').rivit.every((r) => r.lahde === 'hh')).toBe(true);
  });
  it('pallorata − juoksurata: raakatulos ja "ei normia", ei tasoa; yksi testi = Tekniikkanäyte, ei osa-aluetasoa', () => {
    const t = kortti(m, 'tekninen'); expect(t.rivit).toHaveLength(1); const r = t.rivit[0];
    expect(r.id).toBe('sm_ero'); expect(r.taso).toBe(null); expect(r.eiNormia).toBe(true); expect(r.raaka).toBe('2,3 s');
    expect(t.nayte).toBe(true); expect(t.merkit.map((x) => x.teksti)).toContain('Tekniikkanäyte');
    expect(m.nauha.find((x) => x.avain === 'tekninen')).toMatchObject({ pct: null, arvo: 'ei tasoa' });
    const h = TH.tmTodisteHTML(m, c).kortitHTML; expect(h).toContain('ei normia'); expect(h).toContain('Tekniikkanäyte');
  });
  it('tekniikkanäyte ei päädy yhteenvedon vahvuudeksi eikä kehityskohteeksi', () => {
    const y = m.yhteenveto; expect([y.vahvuus, y.kehityskohde].filter(Boolean).every((x) => x.alue !== 'tekninen')).toBe(true);
  });
});

describe('K4a §2 · ≥ 3 tyhjää kortti → yksi "Mittauskierros puuttuu"', () => {
  it('Testi Pelaaja -tyyppi (4 mittausaluetta tyhjää): yksi koontikortti, Peli omana korttina, yhteenvedossa tyhjä-lause', () => {
    const { m } = malli(VAHAN); expect(m.koonti).toBeTruthy(); expect(m.koonti.puuttuvat.map((x) => x.avain)).toEqual(['kasvu', 'fyysinen', 'tekninen', 'keho']);
    expect(m.koonti.lauseN).toBe('Yksi mittauskierros täyttää neljä korttia kerralla.');
    expect(m.kortit.filter((k) => k.koonti)).toHaveLength(1); expect(m.kortit.map((k) => k.avain)).toEqual(['koonti', 'peli']);
    expect(m.tyhjaKaikki).toBe(true); expect(m.yhteenveto.tyhjaLause).toBe('Pelaajasta ei ole vielä mittauksia. Yksi pelihavainto on kirjattu.');
    expect(kortti(m, 'peli').vahan).toBe(true);   // 1 havainto → ei tulkintaa
  });
  it('SJK-tyyppi: kasvu + kehon valmius + peli tyhjiä (3) → koonti listaa vain kasvun ja kehon valmiuden', () => {
    const { m } = malli(SJK); expect(m.koonti.puuttuvat.map((x) => x.avain)).toEqual(['kasvu', 'keho']); expect(m.koonti.lauseN).toBe('Kasvu ja kypsyys ja kehon valmius puuttuvat.');
  });
  it('vain 2 tyhjää → ei koontia, omat kortit (Topias: kasvu tyhjä, yksi amber-kortti)', () => {
    const { m } = malli(TOPIAS); expect(m.koonti).toBe(null); expect(kortti(m, 'kasvu').tyhja).toBe(true); expect(m.kortit.some((k) => k.avain === 'kasvu')).toBe(true);
  });
});

describe('K4a §2 · fokuskortti jakson aiheen mukaan', () => {
  it('Harhauttaminen (y_h4) → Tekninen on fokuskortti ja ensimmäinen; merkki "Jakson fokus · {aihe}"', () => {
    const { m } = malli(TOPIAS); expect(m.fokus).toBe('tekninen'); expect(m.kortit[0].avain).toBe('tekninen'); expect(m.kortit[0].fokus).toBe(true);
    expect(m.kortit[0].merkit[0].teksti).toBe('Jakson fokus · Harhauttaminen');
  });
  it('tmTodisteFokus: tekninen (y_h1–h5,h9) · peli (y_h0,h6–h8,y_p*) · fyysinen (ohjelma) · tuntematon/ei jaksoa → null', () => {
    expect(TC.tmTodisteFokus({ jaksofokus: { konsepti_avain: 'y_h2' } })).toBe('tekninen'); expect(TC.tmTodisteFokus({ jaksofokus: { konsepti_avain: 'y_p1' } })).toBe('peli');
    expect(TC.tmTodisteFokus({ jaksofokus: { konsepti_avain: 'y_h0' } })).toBe('peli'); expect(TC.tmTodisteFokus({ jaksofokus: { ohjelma: { tyyppi: 'nopeus' } } })).toBe('fyysinen');
    expect(TC.tmTodisteFokus({ jaksofokus: { konsepti_avain: 'ohjelma:nopeus' } })).toBe('fyysinen'); expect(TC.tmTodisteFokus({ jaksofokus: { konsepti_avain: 'x_tuntematon' } })).toBe(null); expect(TC.tmTodisteFokus({})).toBe(null);
  });
  it('ei jaksoa → ei fokuskorttia; kanoninen järjestys fyysinen · tekninen · peli · keho · kasvu', () => {
    const { m } = malli(Object.assign({}, TOPIAS, { jaksofokus: null })); expect(m.fokus).toBe(null); expect(m.kortit.map((k) => k.avain)).toEqual(['fyysinen', 'tekninen', 'peli', 'keho', 'kasvu']);
  });
  it('fokuskortti jonka alueella ei ole dataa → ei fokusta (tyhjä kortti ei nouse)', () => {
    const { m } = malli(Object.assign({}, SJK, { jaksofokus: { konsepti_avain: 'y_p2', konsepti_nimi: 'Vartiointi', alkoi: '2026-10-01', kesto_vk: 4 } })); expect(m.fokus).toBe(null);
  });
});

describe('K4a PHV-säännöt (§28 / §25) — tmPhvTila kerran', () => {
  const heikkoFyysinen = (koodi, tahti) => Object.assign({}, TOPIAS, { hh_viimeisin: { lin30m: 4.9, cmj: 30 }, hh_historia: [{ pvm: '2026-10-04', lin30m: 4.9, cmj: 30 }], tk_lajit_viimeisin: null, tki_viimeisin: null, adar_viimeisin: null, adar_havaintoja: 0, flei_viimeisin: null,
    biologinenIka_viimeisin: koodi ? bio(koodi, tahti) : null, phv_tila: koodi || undefined, jaksofokus: null });
  it('test 1 · PRE vs POST: fyysinen-lause vaihtuu; heikointa ei nimetä kehityskohteeksi PRE/LAH/tuntematon', () => {
    const pre = malli(heikkoFyysinen('PRE')).m, post = malli(heikkoFyysinen('POST')).m;
    expect(kortti(pre, 'fyysinen').lause).not.toContain('§'); expect(kortti(pre, 'fyysinen').selite).toContain('Ennen kasvumittausta heikointa fyysistä testiä ei nimetä kehityskohteeksi, koska ero voi johtua kasvuvaiheesta.');   // K4d: juoksu-ehto osuu tässä datassa → tulkinnan ⓘ on selitteen alussa   // perustelu ⓘ-selitteessä, ei lauseessa (K4a2)
    expect(kortti(post, 'fyysinen').selite || '').not.toContain('Ennen kasvumittausta'); expect(kortti(post, 'fyysinen').lause).not.toContain('§');
    expect(pre.yhteenveto.kehityskohde).toBe(null); expect(post.yhteenveto.kehityskohde).toBeTruthy(); expect(post.yhteenveto.kehityskohde.alue).toBe('fyysinen');
    ['LAH', null].forEach((k) => { const x = malli(heikkoFyysinen(k)).m; expect(x.yhteenveto.kehityskohde).toBe(null); expect(kortti(x, 'fyysinen').selite).toMatch(/Ennen kasvumittausta/); });
    expect(malli(heikkoFyysinen('AN')).m.yhteenveto.kehityskohde.alue).toBe('fyysinen');
  });
  it('test 2 · tuntematon: Kasvu-kortti ohjaa mittaamaan (ainoa toiminto), fyysinen ei ehdota jaksoa', () => {
    const { m } = malli(heikkoFyysinen(null)); const k = kortti(m, 'kasvu');
    expect(k.tyhja).toBe(true); expect(k.toiminto).toMatchObject({ avain: 'mittaus', arg: 'kasvumittaus', teksti: 'Suunnittele kasvumittaus' }); expect(m.phv).toBe('tuntematon');
    expect(kortti(m, 'fyysinen').lause).not.toContain('jakson kohteeksi'); expect(m.yhteenveto.puuttuu).toMatchObject({ nimi: 'Kasvumittaus' });
  });
  it('PH → kuormahuomio: fyysinen "Kasvupyrähdys käynnissä: tulokset vaihtelevat" (korvaa toisen virkkeen), kasvukortin toiminto = Tarkista jakson kuorma', () => {
    const { m } = malli(heikkoFyysinen('PH', 5.0)); expect(kortti(m, 'fyysinen').lause).toBe('Taso on ikäisekseen kehittyvä. Kasvupyrähdys käynnissä: tulokset vaihtelevat.'); expect(kortti(m, 'kasvu').toiminto.avain).toBe('kuorma');
    expect(m.yhteenveto.kehityskohde).toBe(null);
  });
  it('test 5 · kasvutahti ≥ 7,2 → Huomio ja kuormalause riippumatta PHV-tilasta; 6,5–7,1 kiihtyy ilman Huomiota', () => {
    ['PRE', 'LAH', 'PH', 'POST'].forEach((k) => { const c = kortti(malli(heikkoFyysinen(k, 7.4)).m, 'kasvu'); expect(c.huomio, k).toBe(true); expect(c.lause, k).toContain('loukkaantumisriski'); });
    const k = kortti(malli(heikkoFyysinen('POST', 6.8)).m, 'kasvu'); expect(k.huomio).toBe(false); expect(k.lause).toContain('Kasvu kiihtyy');
    expect(TH.tmTodisteHTML(malli(heikkoFyysinen('PRE', 7.4)).m, { esc, pid: 'x' }).kortitHTML).toContain('>Huomio<');
  });
  it('PHV luetaan tmPhvTila:sta: pelkkä p.phv_tila ilman mittausta ei riitä (tuntematon)', () => {
    expect(malli(Object.assign({}, TOPIAS, { phv_tila: 'POST' })).m.phv).toBe('tuntematon');
  });
});

describe('K4a datan ikä (test 4 · §14) ja testihetken ikä (test 3)', () => {
  it('test 4 · > 6 kk vanha: kortin ainoa toiminto on "Päivitä mittaus", amber-teksti', () => {
    const { m } = malli(VANHA); ['fyysinen', 'tekninen', 'keho', 'kasvu'].forEach((a) => { const k = kortti(m, a); expect(k.toiminto.teksti, a).toBe('Päivitä mittaus'); expect(k.vainPaivita, a).toBe(true); expect(k.ikaMeta, a).toBe('mittaus yli 6 kk vanha'); });
  });
  it('3–6 kk: amber-merkintä, normaali toiminto säilyy; ≤ 3 kk: ei merkintää', () => {
    const p = Object.assign({}, TOPIAS, { hh_pvm: '2026-06-01', hh_historia: null }); const f = kortti(malli(p).m, 'fyysinen'); expect(f.ikaMeta).toBe('mittaus yli 3 kk vanha'); expect(f.toiminto.teksti).toBe('Näytä testihistoria');
    expect(kortti(malli(TOPIAS).m, 'fyysinen').ikaMeta).toBe('');
  });
  it('> 12 kk (D141): ei tasoa, vain raakatulos — ei nykytasoksi', () => {
    const p = Object.assign({}, TOPIAS, { hh_pvm: '2025-06-01', hh_historia: null }); const r = kortti(malli(p).m, 'fyysinen').rivit; expect(r.every((x) => x.taso === null)).toBe(true);
    expect(kortti(malli(p).m, 'fyysinen').ikaMeta).toBe('mitattu 2025 · päivitä');
  });
  it('test 3 · taso lasketaan testipäivän iästä: 2025-tulos 12-vuotiaana ei muutu, vaikka pelaaja täyttää 13', () => {
    const p = { syntymaVuosi: 2013, sukupuoli: 'M', joukkue: 'Demo U13', hh_pvm: '2025-10-01', hh_viimeisin: { lin30m: 5.0 } };
    expect(L.tmNayttoDevIkaSp(p).ika).toBe(12);   // ei 13 vaikka nyt on 2026
    const a = malli(p, { nyt: new Date('2025-11-01') }).m, b = malli(p, { nyt: new Date('2026-08-15') }).m;   // pelaaja täyttää 13 välissä, tulos < 12 kk vanha
    expect(kortti(a, 'fyysinen').rivit[0].taso).toBeGreaterThan(0); expect(kortti(a, 'fyysinen').rivit[0].taso).toBe(kortti(b, 'fyysinen').rivit[0].taso);
  });
});

describe('K4a pelaajan oma näkemys (itsearvioero) — yksi lause, ei lukuja', () => {
  const peli = (extra) => kortti(malli(Object.assign({}, TOPIAS, extra)).m, 'peli').oma;
  it('D3: pelaaja arvioi ≥ 1,5 yli valmentajan → "vahvemmaksi"; alle 1,5 → ei lausetta; pelaaja alle → "varovaisemmin"', () => {
    expect(peli({})).toMatch(/Topi arvioi ulottuvuuden «Tunteiden hallinta» vahvemmaksi kuin valmentajat\./);
    expect(peli({ d3_viimeisin: { pisteet: { focus: { valmentaja: 3, pelaaja: 4 } } } })).toBe(null);
    expect(peli({ d3_viimeisin: { pisteet: { focus: { valmentaja: 4, pelaaja: 2 } } } })).toMatch(/varovaisemmin kuin valmentajat/);
  });
  it('jakson itsearvio (arvio_itse vs arvio_valmentaja, ero ≥ 1): suunta arvoista (kalibraatio_ero on itseisarvo)', () => {
    const d3 = { d3_viimeisin: null };
    expect(peli(Object.assign({ jaksofokus_historia: [{ konsepti_nimi: 'Päätöksenteko', arvio_itse: 4, arvio_valmentaja: 2, kalibraatio_ero: 2 }] }, d3))).toMatch(/jakson aiheen «Päätöksenteko» vahvemmaksi/);
    expect(peli(Object.assign({ jaksofokus_historia: [{ konsepti_nimi: 'Päätöksenteko', arvio_itse: 2, arvio_valmentaja: 4, kalibraatio_ero: 2 }] }, d3))).toMatch(/varovaisemmin/);
    expect(peli(Object.assign({ jaksofokus_historia: [{ konsepti_nimi: 'X', arvio_itse: 3, arvio_valmentaja: 3.5 }] }, d3))).toBe(null);
  });
  it('lause ei sisällä lukuja eikä kiellettyjä sanoja', () => { const l = peli({}); expect(l).not.toMatch(/\d/); expect(l).not.toMatch(KIELLETYT); });
});

describe('K4a trendi: vain kun samasta lähteestä ≥ 2 pistettä', () => {
  it('30 m: kaksi pistettä → ↗ (aika laski); CMJ ennallaan; yksi piste → ei trendiä', () => {
    const f = kortti(malli(TOPIAS).m, 'fyysinen').rivit; expect(f.find((r) => r.id === 'lin30m').trendi).toBe('up'); expect(f.find((r) => r.id === 'cmj').trendi).toBe('flat');
    const y = kortti(malli(SJK).m, 'fyysinen').rivit; expect(y.every((r) => r.trendi === null)).toBe(true);   // ei historiaa
    expect(kortti(malli(TOPIAS).m, 'tekninen').rivit.every((r) => r.trendi === null)).toBe(true);   // ei tki_historiaa
  });
  it('ADAR: adar_edellinen → adar_viimeisin ±0,5 (Havainnointi 2 → 2,5 = ↗)', () => {
    const r = kortti(malli(TOPIAS).m, 'peli').rivit.find((x) => x.id === 'a'); expect(r.trendi).toBe('up');
  });
  it('kehon valmius ±5: 55 → 62 nousussa; 60 → 62 ennallaan', () => {
    const k = (h) => kortti(malli(Object.assign({}, TOPIAS, { flei_historia: h })).m, 'keho'); expect(k([{ flei: 55, pvm: '2026-06-01' }, { flei: 62, pvm: '2026-10-04' }]).trendi).toBe('up'); expect(k([{ flei: 60, pvm: '2026-06-01' }, { flei: 62, pvm: '2026-10-04' }]).trendi).toBe('flat');
  });
  it('kehityskäyrä: sparkline + ero + "Kehitysnopeutta ei arvioida" kun väli < 60 pv (§3)', () => {
    const k = kortti(malli(TOPIAS).m, 'fyysinen').kayra; expect(k.ero).toBe('3,17 → 3,08 s · 2 mittausta'); expect(k.vauhti).toBe('Kehitysnopeutta ei arvioida: mittausten väli alle 2 kk'); expect(k.siru).toContain('<svg');
    const p = Object.assign({}, TOPIAS, { hh_historia: [{ pvm: '2025-10-04', lin30m: 3.4 }, { pvm: '2026-10-04', lin30m: 3.08 }] }); expect(kortti(malli(p).m, 'fyysinen').kayra.vauhti).toMatch(/\/ kausi/);
  });
});

describe('K4a yhteenveto (Vahvuus · Kehityskohde · Puuttuu) samoista riveistä kuin kortit', () => {
  const { m } = malli(TOPIAS);
  it('Topias: vahvuus Kuljetus ja laukaus (tekninen 5/5), kehityskohde Syöttö (tekninen 2/5), puuttuu Kasvumittaus', () => {
    expect(m.yhteenveto.vahvuus).toMatchObject({ nimi: 'Kuljetus ja laukaus', meta: 'Tekninen · taso 5/5 · 4.10.' }); expect(m.yhteenveto.kehityskohde).toMatchObject({ nimi: 'Syöttö', meta: 'Tekninen · taso 2/5 · 4.10.' });
    expect(m.yhteenveto.puuttuu.nimi).toBe('Kasvumittaus'); expect(m.yhteenveto.viimeisin).toBe('Testattu 4.10. · 2 vk');
  });
  it('vahvuus vaatii vähintään tason 3/5 (60 %): vain matalia tasoja → "ei vielä"', () => {
    const { m: x } = malli(Object.assign({}, SJK, { sm_juoksu_viimeisin: null, sm_pallo_viimeisin: null })); expect(x.yhteenveto.vahvuus).toBe(null);
  });
  it('tasonauha: viisi riviä oikeassa järjestyksessä; mittaamaton = tyhjä + "ei mitattu"; palkki = taso oman asteikon maksimista', () => {
    expect(m.nauha.map((r) => r.avain)).toEqual(['kasvu', 'fyysinen', 'tekninen', 'peli', 'keho']);
    expect(m.nauha[0]).toMatchObject({ pct: null, arvo: 'ei mitattu' }); expect(m.nauha[1]).toMatchObject({ pct: 90, arvo: '4,5 / 5', kattavuus: '2 testiä' }); expect(m.nauha[2]).toMatchObject({ pct: 80, arvo: '4 / 5', kattavuus: '4 testiä' });
    expect(m.nauha[3].kattavuus).toBe('7 havaintoa'); expect(m.nauha[4]).toMatchObject({ pct: 62, arvo: '62 %' });
  });
  it('ei radaria: HTML ei sisällä tutka/radar-elementtiä', () => { expect(JSON.stringify(TH.tmTodisteHTML(m, { esc, pid: 'x' }))).not.toMatch(/radar|tutka/i); });
});

describe('K4a linkitykset (jokainen kohde olemassa; ei tallenna mitään)', () => {
  it('kehityskohde Syöttö, ei jaksoa → "Syöttö seuraavan jakson aiheeksi" → Aloita jakso -sheet, aihe y_h2 esivalittuna', () => {
    const { m } = malli(TOPIAS, { jaksoTila: 'ei_jaksoa' }); expect(kortti(m, 'tekninen').toiminto).toMatchObject({ avain: 'jakso_aiheeksi', teksti: 'Syöttö seuraavan jakson aiheeksi', arg: 'y_h2' });
  });
  it('jakso käynnissä → "Kehityskohde: Syöttö" vie Polkuun, ei tallennusta', () => {
    ['kaynnissa', 'vahvistettu', 'paattynyt'].forEach((t) => { const { m } = malli(TOPIAS, { jaksoTila: t }); expect(kortti(m, 'tekninen').toiminto, t).toMatchObject({ avain: 'polku', teksti: 'Kehityskohde: Syöttö' }); });
  });
  it('kehityskohde ilman yksiselitteistä konseptia (pujottelu) → "Aloita jakso" ilman aiheen nimeämistä', () => {
    const p = Object.assign({}, TOPIAS, { tk_lajit_viimeisin: { kuljetus_laukaus_s: 13.5, pujottelu_s: 40, ponnauttelu_s: 31.8, syotto_s: 30 } }); const x = malli(p).m;
    expect(x.yhteenveto.kehityskohde.nimi).toBe('Pujottelu'); expect(kortti(x, 'tekninen').toiminto).toMatchObject({ avain: 'jakso_aiheeksi', teksti: 'Aloita jakso', arg: null });
  });
  it('Peli: "Ota päätöksenteko puheeksi" → Tänään; tyhjä Peli → Merkitse pelihavainto; Fyysinen → Näytä testihistoria; Kehon valmius → Päivitä mittaus', () => {
    const { m } = malli(TOPIAS); expect(kortti(m, 'peli').toiminto).toMatchObject({ avain: 'puheeksi' }); expect(kortti(m, 'peli').toiminto.teksti).toMatch(/^Ota .+ puheeksi · kysymykset pelaajalle$/);
    expect(kortti(m, 'fyysinen').toiminto).toMatchObject({ avain: 'testihistoria' }); expect(kortti(m, 'keho').toiminto).toMatchObject({ avain: 'mittaus', teksti: 'Päivitä mittaus' });
    expect(kortti(malli(SJK).m, 'peli').toiminto).toMatchObject({ avain: 'havainto', teksti: 'Merkitse pelihavainto' });
  });
  it('jokainen toiminto-avain on sivun _ktTcToimi-käsittelijän tunnistama', () => {
    const sivu = lue('TalentMaster_Kehitystyopoyta.html'), avaimet = new Set();
    [TOPIAS, SJK, VAHAN, VANHA].forEach((p) => ['ei_jaksoa', 'kaynnissa'].forEach((t) => { const { m } = malli(p, { jaksoTila: t }); m.kortit.forEach((k) => { if (k.toiminto) avaimet.add(k.toiminto.avain); }); if (m.yhteenveto.puuttuu) avaimet.add(m.yhteenveto.puuttuu.toiminto.avain); }));
    expect([...avaimet].length).toBeGreaterThan(4); [...avaimet].forEach((a) => expect(sivu, a).toContain("avain === '" + a + "'"));
  });
});

describe('K4a tekstit ja koodin laatu', () => {
  const kaikki = [TOPIAS, SJK, VAHAN, VANHA].flatMap((p) => ['ei_jaksoa', 'kaynnissa'].map((t) => malli(p, { jaksoTila: t })));
  it('test 7 · KIELLETYT-portti: yhdessäkään tulkintalauseessa tai FI-tekstissä ei kiellettyjä sanoja', () => {
    Object.entries(TC.FI).forEach(([k, v]) => expect(v, k).not.toMatch(KIELLETYT));
    kaikki.forEach(({ m }) => { m.kortit.forEach((k) => { expect(k.lause || k.lauseN || '').not.toMatch(KIELLETYT); }); expect(m.yhteenveto.tyhjaLause || '').not.toMatch(KIELLETYT); });
  });
  it('kaikki koodin tc_-avaimet löytyvät FI-kartasta (staattiset ja dynaamiset)', () => {
    const lahde = lue('lib/tm_todistekortit.js') + lue('lib/tm_todistekortit_html.js'), staat = new Set(lahde.match(/'tc_[a-z0-9_]+'/g).map((x) => x.slice(1, -1)));
    staat.forEach((k) => { if (!/_$/.test(k)) expect(TC.FI[k], k).toBeTypeOf('string'); });
    ['kasvu', 'fyysinen', 'tekninen', 'peli', 'keho'].forEach((a) => expect(TC.FI['tc_a_' + a], a).toBeTypeOf('string'));
    ['lin5m', 'lin10m', 'lin30m', 'cmj', 'sj', 'mas', 'kasirata', 'sm_juoksu', 'sm_pallo', 'sm_ero', 'syotto', 'pujottelu', 'ponnauttelu', 'kuljetus_laukaus', 'a', 'd', 'ac', 'r', 'd3', 'keho', 'phv', 'phv_ika', 'kasvutahti'].forEach((t) => expect(TC.FI['tc_t_' + t], t).toBeTypeOf('string'));
    ['PRE', 'LAH', 'PH', 'POST', 'AN', 'tuntematon'].forEach((t) => expect(TC.FI['tc_phv_' + t], t).toBeTypeOf('string')); ['pre', 'lah', 'ph', 'post'].forEach((t) => { expect(TC.FI['tc_kasvu_' + t]).toBeTypeOf('string'); expect(TC.FI['tc_kasvu_' + t + '_ohje']).toBeTypeOf('string'); });
    ['up', 'flat', 'down'].forEach((t) => { expect(TC.FI['tc_tr_label_' + t]).toBeTypeOf('string'); });
    ['tk', 'hh', 'sm', 'adar', 'd3', 'flei', 'kasvu', 'fysiikka'].forEach((t) => expect(TC.FI['tc_l_' + t], t).toBeTypeOf('string'));
  });
  it('FI-tekstit ovat lauseita avaimista: muuttujat {…} täyttyvät (ei jäänyt {paikkamerkkejä} näkyviin)', () => {
    kaikki.forEach(({ m, c }) => { const h = TH.tmTodisteHTML(m, c); const kaikkiHtml = h.yhteenvetoHTML + h.nauhaHTML + h.kortitHTML; expect(kaikkiHtml).not.toMatch(/\{[a-z_]+\}/); expect(kaikkiHtml).not.toContain('undefined'); expect(kaikkiHtml).not.toContain('NaN'); });
  });
  it('lib: ei hex-värejä eikä rgba():ta, ei px-kokoisia font-size:ja (D169: --fs-* ja sivun tokenit); DM Mono vain .tc-eb', () => {
    ['lib/tm_todistekortit.js', 'lib/tm_todistekortit_fi.js', 'lib/tm_todistekortit_html.js'].map(lue).forEach((s) => { expect(s).not.toMatch(/#[0-9a-fA-F]{3,8}\b/); expect(s).not.toMatch(/rgba?\(/); });
    const css = TH.tmTodisteCss(); [...css.matchAll(/font-size:([^;}]+)/g)].forEach((x) => expect(x[1]).toMatch(/^(var\(--fs-(h1|h2|lead|body|meta|eb)\)|calc\(var\(--fs-lead\) \* 1\.3\))$/));
    const mono = [...css.matchAll(/([^{}]+)\{([^{}]*font-family:var\(--font-mono\)[^{}]*)\}/g)].map((x) => x[1].trim()); mono.forEach((v) => expect(v).toMatch(/^(\.kn-naytto\{container-type:inline-size\})?\.?tc-eb|^\.tc-eb$/));
  });
  it('lib ≤ ~500 riviä (kolmen kerroksen malli)', () => { ['lib/tm_todistekortit.js', 'lib/tm_todistekortit_fi.js', 'lib/tm_todistekortit_html.js'].forEach((f) => expect(lue(f).split('\n').length - 1, f).toBeLessThanOrEqual(520)); });
  it('XSS: HTML-erikoismerkit pelaajan nimessä eivät pääse läpi; aihe «{aihe}» escapataan', () => {
    const p = Object.assign({}, TOPIAS, { etunimi: '<img src=x onerror=alert(1)>', jaksofokus: Object.assign({}, TOPIAS.jaksofokus, { konsepti_nimi: '<b>Harhautus</b>' }) });
    const { m, c } = malli(p); const h = TH.tmTodisteHTML(m, c); const kaikkiHtml = h.yhteenvetoHTML + h.nauhaHTML + h.kortitHTML; expect(kaikkiHtml).not.toContain('<img'); expect(kaikkiHtml).not.toContain('<b>Harhautus'); expect(kaikkiHtml).toContain('&lt;b&gt;Harhautus');
  });
  it('lukumäärä oletusnäkymässä (Topias, rikas fixture) ≤ 30', () => { expect(malli(TOPIAS).m.luvut).toBeLessThanOrEqual(30); expect(malli(TOPIAS).m.luvut).toBeGreaterThan(5); });
  it('ADAR R = Reaction = "Reagointi" (ei "Palautuminen"): FI-teksteissä ja koodissa ei palautumista', () => {
    expect(TC.FI.tc_t_r).toBe('Reagointi'); expect(TC.FI.tc_t_d).toBe('Päätöksenteko');
    Object.entries(TC.FI).forEach(([k, v]) => expect(v, k).not.toMatch(/palautumi/i));
    ['lib/tm_todistekortit.js', 'lib/tm_todistekortit_fi.js', 'lib/tm_todistekortit_html.js', 'scripts/i18n_luo_gemini_era79.mjs'].forEach((f) => expect(lue(f), f).not.toMatch(/palautumi/i));
  });
  it('käännös: c.t voittaa FI-oletuksen; puuttuva käännös → FI', () => {
    const c = { nyt: NYT, ika: 13, sp: 'M', perTestTasot: N.perTestTasot, esc, pid: 'x', t: (k) => (k === 'tc_vahvuus' ? 'Styrka' : k) }; const m = TC.tmTodisteMalli(TOPIAS, c); const h = TH.tmTodisteHTML(m, c);
    expect(h.yhteenvetoHTML).toContain('Styrka'); expect(h.yhteenvetoHTML).toContain('Kehityskohde');
  });
});
