/* K4a2 · Profiilin selkokieli (CODE_BRIEF_K4A2): Kehon valmius -kortti ilman termejä (ketju/DIAG/§), lähdepäivä historiasta, Peli-luku yksi laskenta, lauseet ≤ 2 virkettä.
   Topias-tapaus: flei_ketjut isoilla avaimilla (SBL…DFL), arvot 0–100, ei flei_pvm, historia pvm:llä. Ruotsi: erä 81 odottaa PM:ää (LIB_SV_ODOTTAA) → sv-testi ehdollinen. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { TOPIAS, SJK, VANHA } from './helpers/k4a_fixturet.mjs';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_eerikkila_normit.js');
globalThis.tkLajiTaso = require('../docs/testit_indeksit.js').tkLajiTaso;
globalThis.normiIka = N.normiIka;
const TC = require('../lib/tm_todistekortit.js'), TH = require('../lib/tm_todistekortit_html.js'), L = require('../lib/tm_naytto_lohkot.js'), ADAR = require('../lib/tm_pelialy_yksilo.js');
const SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const NYT = new Date('2026-10-19T12:00:00');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const malli = (p, extra) => { const isp = L.tmNayttoDevIkaSp(p); const c = Object.assign({ nyt: NYT, ika: isp.ika, sp: isp.sp, perTestTasot: N.perTestTasot, jaksoTila: 'ei_jaksoa', esc, pid: p.id }, extra || {}); return { m: TC.tmTodisteMalli(p, c), c }; };
const kortti = (m, a) => m.kortitKaikki[a];
const teksti = (p, extra) => { const { m, c } = malli(p, extra), h = TH.tmTodisteHTML(m, c); return (h.yhteenvetoHTML + h.nauhaHTML + h.kortitHTML).replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/\s+/g, ' '); };
const virkkeet = (s) => String(s).split(/(?<=[.!?])\s+/).filter(Boolean);

const KETJUT_TASAINEN = { SBL: 62, SFL: 60, LL: 64, DIAG: 61, DFL: 63 };
const topias = (ketjut, extra) => Object.assign({}, TOPIAS, { flei_viimeisin: 62, flei_pvm: undefined, flei_ketjut: ketjut, flei_historia: [{ flei: 55, pvm: '2026-06-01' }, { flei: 62, pvm: '2026-10-04' }] }, extra || {});
const TOPIAS_DIAG = topias({ SBL: 66, SFL: 64, LL: 60, DIAG: 33, DFL: 62 });

describe('K4a2 · Kehon valmius selkokielellä (Topias-tapaus)', () => {
  const t = teksti(TOPIAS_DIAG);
  it('renderöidyssä tekstissä ei tc_-avaimia, "ketju", ketjukoodeja, "§" eikä yli 100 %:n lukua', () => {
    expect(t).not.toMatch(/tc_/); expect(t).not.toMatch(/ketju/i); expect(t).not.toMatch(/\b(DIAG|SBL|SFL|DFL|LL)\b/); expect(t).not.toContain('§');
    [...t.matchAll(/(\d+(?:,\d+)?)\s*%/g)].forEach((x) => expect(parseFloat(x[1].replace(',', '.')), x[0]).toBeLessThanOrEqual(100));
    expect(t).not.toMatch(/\bD3\b/); expect(t).not.toContain('Liikehallinta');
  });
  it('lause: "Kehon valmius kehittyy. Eniten tukea tarvitsee vartalon kierto." + pieni rivi "Näkyy potkussa ja suunnanmuutoksissa."; ainoa luku 62 %', () => {
    const k = kortti(malli(TOPIAS_DIAG).m, 'keho');
    expect(k.lause).toBe('Kehon valmius kehittyy. Eniten tukea tarvitsee vartalon kierto.'); expect(k.apu).toBe('Näkyy potkussa ja suunnanmuutoksissa.');
    expect(k.rivit).toHaveLength(1); expect(k.rivit[0].raaka).toBe('62 %'); expect(k.lause + k.apu).not.toMatch(/\d/);
  });
  it('päivä löytyy flei_historiasta (ei flei_pvm): lähderivi "Kehon valmius -mittaus · 4.10.2026", ei "Päivä puuttuu", datan ikä normaali', () => {
    const k = kortti(malli(TOPIAS_DIAG).m, 'keho'); expect(k.lahdeTeksti).toBe('Kehon valmius -mittaus · 4.10.2026'); expect(k.ika.luokka).toBe('normaali'); expect(t).not.toContain('Päivä puuttuu');
  });
  it('Kasvu-kortin asia ei toistu kehon valmiudessa: "Kuormaa ei voi tulkita…" poissa', () => { expect(t).not.toContain('Kuormaa ei voi tulkita'); });
});

describe('K4a2 · heikoin alue vain jos ≥ 10 %-yksikköä muita alempi', () => {
  it('tasainen profiili (kaikki ±5) → ei "Eniten tukea" -virkettä eikä "Näkyy"-riviä', () => {
    const k = kortti(malli(topias(KETJUT_TASAINEN)).m, 'keho'); expect(k.lause).toBe('Kehon valmius kehittyy.'); expect(k.apu).toBe(null); expect(teksti(topias(KETJUT_TASAINEN))).not.toContain('Eniten tukea');
  });
  it('raja: ero 9 → ei mainintaa, ero 10 → maininta', () => {
    expect(kortti(malli(topias({ SBL: 60, SFL: 60, LL: 51, DIAG: 61, DFL: 60 })).m, 'keho').lause).not.toContain('Eniten tukea');
    expect(kortti(malli(topias({ SBL: 60, SFL: 60, LL: 50, DIAG: 61, DFL: 60 })).m, 'keho').lause).toContain('Eniten tukea tarvitsee kehon sivut.');
  });
  it('ei ketjudataa lainkaan → vain taso-virke', () => { expect(kortti(malli(topias(undefined)).m, 'keho').lause).toBe('Kehon valmius kehittyy.'); });
  it('kaikki 5 aluetta: oikea {alue} ja {missa} (isot avaimet, pienet avaimet)', () => {
    const odotus = { SBL: ['kehon takaosa', 'kiihdytyksissä ja hypyissä'], SFL: ['kehon etuosa', 'juoksuaskeleessa ja ryhdissä'], LL: ['kehon sivut', 'sivuttaisliikkeissä ja tasapainossa'], DIAG: ['vartalon kierto', 'potkussa ja suunnanmuutoksissa'], DFL: ['keskivartalon tuki', 'kehonhallinnassa ja kaksinkamppailuissa'] };
    Object.entries(odotus).forEach(([avain, [alue, missa]]) => {
      [avain, avain.toLowerCase()].forEach((a) => {
        const ket = { SBL: 70, SFL: 70, LL: 70, DIAG: 70, DFL: 70 }; delete ket[avain]; ket[a] = 40; const k = kortti(malli(topias(ket)).m, 'keho');
        expect(k.lause, a).toBe('Kehon valmius kehittyy. Eniten tukea tarvitsee ' + alue + '.'); expect(k.apu, a).toBe('Näkyy ' + missa + '.');
      });
    });
  });
  it('vanhat SL/FL-kentät → DIAG (laskeKetjuProfiili): SL 30 + FL 34 ≈ DIAG 32 → vartalon kierto', () => {
    expect(kortti(malli(topias({ SBL: 66, SFL: 64, LL: 60, SL: 30, FL: 34, DFL: 62 })).m, 'keho').lause).toContain('vartalon kierto');
  });
  it('alle 40 %: "Valmius on matala: ohjaa pelaaja fysioterapeutille." (korvaa "Alle 40: ohjaus…"), Huomio-merkki, alue pienellä rivillä', () => {
    const k = kortti(malli(topias({ SBL: 40, SFL: 36, LL: 38, DIAG: 15, DFL: 35 }, { flei_viimeisin: 35 })).m, 'keho');
    expect(k.lause).toBe('Kehon valmius tarvitsee tukea. Valmius on matala: ohjaa pelaaja fysioterapeutille.'); expect(k.huomio).toBe(true); expect(k.apu).toBe('Eniten tukea tarvitsee vartalon kierto. Näkyy potkussa ja suunnanmuutoksissa.'); expect(k.lause).not.toContain('Alle 40');
  });
});

describe('K4a2 · lähderivin päivä puuttuu', () => {
  const ILMAN = Object.assign({}, TOPIAS, { flei_viimeisin: 62, flei_pvm: undefined, flei_historia: undefined, flei_ketjut: KETJUT_TASAINEN });
  it('ei päivää → ei erotinta "·", teksti "Päivä puuttuu"; vanhenemismerkki ei "normaali": sama kuin yli 6 kk (ainoa toiminto Päivitä mittaus)', () => {
    const k = kortti(malli(ILMAN).m, 'keho'); expect(k.lahdeTeksti).toBe('Kehon valmius -mittaus. Päivä puuttuu'); expect(k.lahdeTeksti).not.toContain('·');
    expect(k.ika.luokka).toBe('vanha'); expect(k.vainPaivita).toBe(true); expect(k.toiminto).toMatchObject({ avain: 'mittaus', arg: 'keho', teksti: 'Päivitä mittaus' }); expect(k.ikaMeta).toBe('');
  });
  it('flei_viimeisin.pvm (objekti) ja flei_pvm toimivat edelleen; uusin historiarivi voittaa vanhemman', () => {
    expect(kortti(malli(Object.assign({}, ILMAN, { flei_viimeisin: { pct: 62, pvm: '2026-09-01' } })).m, 'keho').lahdeTeksti).toBe('Kehon valmius -mittaus · 1.9.2026');
    expect(kortti(malli(Object.assign({}, ILMAN, { flei_pvm: '2026-10-04' })).m, 'keho').lahdeTeksti).toBe('Kehon valmius -mittaus · 4.10.2026');
    expect(kortti(malli(Object.assign({}, ILMAN, { flei_historia: [{ flei: 60, pvm: '2026-10-04' }, { flei: 50, pvm: '2026-03-01' }] })).m, 'keho').lahdeTeksti).toBe('Kehon valmius -mittaus · 4.10.2026');
  });
  it('yhteenvedon "Viimeisin testi" huomioi historiasta löytyneen päivän', () => {
    const m = malli(Object.assign({}, TOPIAS, { hh_pvm: undefined, tki_pvm: undefined, adar_viimeisin: null, flei_pvm: undefined, flei_historia: [{ flei: 62, pvm: '2026-10-10' }] })).m; expect(m.yhteenveto.viimeisin).toContain('10.10.2026');
  });
});

describe('K4a2 · Peli-luku: yksi laskenta tasonauhassa ja kortilla', () => {
  it('nauhan Peli-arvo = kortin ADAR-rivien keskiarvo = Masterin yht (tmAdarYht); kortilla kaikki ikätason ulottuvuudet', () => {
    const { m, c } = malli(TOPIAS), k = kortti(m, 'peli'), adar = k.rivit.filter((r) => r.lahde === 'adar');
    expect(adar.map((r) => r.id)).toEqual(['a', 'd', 'ac']);   // 13-v: A · D · Act (ei vain paras + heikoin)
    const keski = adar.reduce((s, r) => s + r.taso, 0) / adar.length, nauha = m.nauha.find((r) => r.avain === 'peli');
    expect(nauha.arvo).toBe(String(Math.round(keski * 10) / 10).replace('.', ',') + ' / 3');
    expect(ADAR.tmAdarYht({ a: 2.5, d: 2, ac: 2, r: 2 }, c.ika, null)).toBe(2.2); expect(nauha.arvo).toBe('2,2 / 3'); expect(k.yht).toBe(2.2); expect(nauha.pct).toBe(73);
  });
  it('16-vuotias (4 ulottuvuutta): kaikki neljä riviä + psyykkinen arvio, ei "+ N testiä" -riviä', () => {
    const p = Object.assign({}, TOPIAS, { syntymaVuosi: 2010 }), { m, c } = malli(p), k = kortti(m, 'peli'); expect(k.rivit.filter((r) => r.lahde === 'adar')).toHaveLength(4);
    const h = TH.tmTodisteHTML(m, c); expect(h.kortitHTML).not.toContain('kaikissa mittauksissa');
    const adar = k.rivit.filter((r) => r.lahde === 'adar'), keski = adar.reduce((s, r) => s + r.taso, 0) / 4; expect(m.nauha.find((r) => r.avain === 'peli').arvo).toBe(String(Math.round(keski * 10) / 10).replace('.', ',') + ' / 3');
  });
});

describe('K4a2 · lauseet lyhyiksi, ei pykäliä (D102)', () => {
  const kaikki = [TOPIAS_DIAG, SJK, VANHA, topias(KETJUT_TASAINEN), Object.assign({}, TOPIAS, { biologinenIka_viimeisin: { phv_tila_koodi: 'PH', phv_ika: 13.4, maturity_offset: 0, pvm: '2026-10-04', kasvutahti_cm_v: 7.5 } }), Object.assign({}, TOPIAS, { biologinenIka_viimeisin: { phv_tila_koodi: 'POST', phv_ika: 12.4, maturity_offset: 1, pvm: '2026-10-04', kasvutahti_cm_v: 4 } })];
  it('Fyysinen, Tekninen, Peli ja Kehon valmius: lause enintään 2 virkettä; ei § missään näkyvässä tekstissä', () => {
    kaikki.forEach((p) => { const { m } = malli(p); ['fyysinen', 'tekninen', 'peli', 'keho'].forEach((a) => { const k = kortti(m, a); if (!k.tyhja) expect(virkkeet(k.lause).length, a + ': ' + k.lause).toBeLessThanOrEqual(2); }); expect(teksti(p)).not.toContain('§'); });
  });
  it('Fyysinen: "Taso on ikäisekseen {taso}. Vahvin {vahvin}, heikoin {heikoin}." — ei PHV-riviä lauseessa, trendi ei lauseessa', () => {
    const k = kortti(malli(TOPIAS_DIAG).m, 'fyysinen'); expect(k.lause).toMatch(/^Taso on ikäisekseen [a-zäö]+\. Vahvin .+, heikoin .+\.$/); expect(k.lause).not.toMatch(/PHV|edellisestä|Nousussa|Laskussa/);
  });
  it('Fyysinen PRE/tuntematon: perustelu vain ⓘ-selitteessä (HTML), lauseessa ei', () => {
    const { m, c } = malli(TOPIAS_DIAG), h = TH.tmTodisteHTML(m, c); expect(h.kortitHTML).toContain('data-tc-selite'); expect(h.kortitHTML).toContain('Ennen kasvumittausta heikointa fyysistä testiä ei nimetä kehityskohteeksi, koska ero voi johtua kasvuvaiheesta.');
    expect(kortti(m, 'fyysinen').lause).not.toContain('kasvumittausta');
  });
  it('Fyysinen PH: toinen virke = "Kasvupyrähdys käynnissä: tulokset vaihtelevat."; tekninen PH vastaavasti ilman pykälää', () => {
    const { m } = malli(kaikki[4]); expect(kortti(m, 'fyysinen').lause).toMatch(/\. Kasvupyrähdys käynnissä: tulokset vaihtelevat\.$/); expect(kortti(m, 'tekninen').lause).toMatch(/Kasvupyrähdyksessä tekniikka voi notkahtaa tilapäisesti\.$/);
  });
  it('lyhenteet selitettyinä: D3 → Valmennettavuus (lähde Psyykkinen arvio), H-H → H-H-testit, PHV → kasvupyrähdys, MAS → Aerobinen nopeus (MAS)', () => {
    expect(TC.FI.tc_t_d3).toBe('Valmennettavuus'); expect(TC.FI.tc_l_d3).toBe('Psyykkinen arvio'); expect(TC.FI.tc_l_hh).toBe('H-H-testit');   // PM 21.10.: H-H ei ole taitotesti; D3-rivi on valmennettavuus expect(TC.FI.tc_t_mas).toBe('Aerobinen nopeus (MAS)');
    Object.entries(TC.FI).forEach(([k, v]) => { expect(v, k).not.toContain('§'); expect(v, k).not.toMatch(/PHV/); expect(v, k).not.toMatch(/\bD3\b/); });
  });
  it('Kasvu-kortti: ohjeissa ei pykäliä', () => { const t = teksti(Object.assign({}, TOPIAS, { biologinenIka_viimeisin: { phv_tila_koodi: 'PRE', phv_ika: 14, maturity_offset: -1.5, pvm: '2026-10-04', kasvutahti_cm_v: 7.5 } })); expect(t).not.toContain('§'); expect(t).toContain('Heikointa fyysistä testiä (30 m, hyppy, kestävyysjuoksu) ei nimetä kehityskohteeksi.'); });
});

describe('K4a2 · tekstit yhdessä paikassa ja sv-reitti', () => {
  const ALUEET = ['sbl', 'sfl', 'll', 'diag', 'dfl'];
  it('alueiden sanat vain lib/tm_todistekortit_fi.js:ssä (tc_alue_*), logiikassa ei kovakoodattuja alue-sanoja', () => {
    ALUEET.forEach((a) => { expect(TC.FI['tc_alue_' + a], a).toBeTypeOf('string'); expect(TC.FI['tc_alue_' + a + '_missa'], a).toBeTypeOf('string'); });
    const fs = require('fs'), logiikka = fs.readFileSync(new URL('../lib/tm_todistekortit.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../lib/tm_todistekortit_html.js', import.meta.url), 'utf8');
    ['kehon takaosa', 'vartalon kierto', 'keskivartalon tuki', 'kiihdytyksissä'].forEach((s) => expect(logiikka).not.toContain(s));
  });
  it('poistetut avaimet pois FI-kartasta: tc_ketju_*, tc_t_ketju, tc_ke_ketju, tc_ke_phv_puuttuu, tc_ke_klinikka (+ käyttämättömät trendiavaimet)', () => {
    ['tc_ketju_sbl', 'tc_ketju_sfl', 'tc_ketju_ll', 'tc_ketju_diag', 'tc_ketju_dfl', 'tc_t_ketju', 'tc_ke_ketju', 'tc_ke_phv_puuttuu', 'tc_ke_klinikka', 'tc_fy_pre', 'tc_fy_post', 'tc_tr_fy_up', 'tc_ke_trendi_up'].forEach((k) => expect(TC.FI[k], k).toBeUndefined());
  });
  // Erän 81 sv saapuu PM:ltä; siihen asti sv-tila putoaa suomeen (LIB_SV_ODOTTAA). Kun sv on viety, tämä varmistaa että kaikki 5 aluetta renderöityvät ruotsiksi.
  it.skipIf(!SV.tc_alue_sbl)('sv-tila (erä 81 viety): kaikki 5 aluetta ruotsiksi, ei suomea eikä raakoja avaimia', () => {
    const c = { t: (k) => SV[k] };
    ['SBL', 'SFL', 'LL', 'DIAG', 'DFL'].forEach((a) => { const ket = { SBL: 70, SFL: 70, LL: 70, DIAG: 70, DFL: 70 }; ket[a] = 40; const t = teksti(topias(ket), c); expect(t).toContain(SV['tc_alue_' + a.toLowerCase()]); expect(t).toContain(SV['tc_alue_' + a.toLowerCase() + '_missa']); expect(t).not.toMatch(/tc_|Eniten tukea|Kehon valmius/); });
  });
});
