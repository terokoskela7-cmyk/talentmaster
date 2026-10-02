/**
 * Kehitystilanne v0 (lib/tm_kehitystilanne.js + Seura.html) — briefin hyväksymiskriteerit, jotka ovat testattavissa ilman selainta.
 * Data: tm_admin/setup_demo_kehitys.js (deterministinen, kiinteä päivä) → sama data kuin Demo FC:ssä tuotannossa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const KT = req('../lib/tm_kehitystilanne.js');
const DATA = req('./helpers/kehitystilanne_demodata.cjs')(ROOT);
const NYT = '2026-10-02';
const malli = (o) => KT.rakennaMalli(DATA, Object.assign({ nyt: NYT }, o || {}));

describe('Lohko 1: tilat ja Palloliiton vertailu', () => {
  const m = malli();
  const tila = (a) => m.lohko1.rivit.find((r) => r.avain === a);
  it('kaikki neljä tilaa: Täyttynyt, Raiteilla, Riskissä, Puuttuu', () => {
    expect(tila('C1_lisenssit').tila).toBe('tayttynyt');
    expect(tila('C3_havainnot').tila).toBe('raiteilla');
    expect(tila('C3_a1').tila).toBe('riskissa');
    expect(tila('J3_yhteistyoseurat').tila).toBe('puuttuu');
    expect(m.lohko1.laskuri).toMatchObject({ tayttynyt: expect.any(Number), raiteilla: 2, puuttuu: 1 });   // raiteilla: C3 + oma tavoite (edustukseen 2/3)
  });
  it('seuran tavoite Palloliiton tasoa matalampi → rivillä myös Palloliiton tila', () => {
    expect(tila('C3_havainnot')).toMatchObject({ lahde: 'seura', tavoite: 35, palloliitto: 250, plTila: 'riskissa' });
  });
  it('tyhjä asetus → Palloliiton taso tavoitteena', () => {
    expect(tila('C1_lisenssit')).toMatchObject({ lahde: 'palloliitto', tavoite: 130 });
  });
});

describe('sukupuolisuodatin, N < 5 ja tyhjät tilat', () => {
  it('suodatin muuttaa luvut', () => {
    const k = malli(), p = malli({ sukupuoli: 'M' }), t = malli({ sukupuoli: 'N' });
    expect(p.N + t.N).toBe(k.N);
    expect(p.lohko2.kehittyvat.N).not.toBe(t.lohko2.kehittyvat.N);
    expect(p.lohko3.map((r) => r.nimi)).toEqual(['P14 Demo']);
  });
  it('suodatin muuttaa jokaisen pelaajista lasketun luvun (pojat + tytöt = kaikki); seuratason C/J-luvut eivät ole sukupuolikohtaisia', () => {
    const k = malli(), p = malli({ sukupuoli: 'M' }), t = malli({ sukupuoli: 'N' });
    const NN = (m) => [m.lohko2.kehittyvat.N, m.lohko2.M1.N, m.lohko2.P3.kattavuus.N, m.lohko2.S2.N].concat(m.lohko2.testijakaumat.map((x) => x.osuus.N));
    NN(k).forEach((n, i) => { expect(NN(p)[i] + NN(t)[i]).toBe(n); expect(NN(p)[i]).toBeLessThan(n); });
    const ka = (m) => m.lohko1.rivit.filter((r) => /^[CJ]/.test(r.avain)).map((r) => JSON.stringify(r.toteuma.arvo));
    expect(ka(p)).toEqual(ka(k)); expect(ka(t)).toEqual(ka(k));
  });
  it('alle viiden ryhmä → "liian pieni ryhmä", ei prosenttia', () => {
    const m = malli({ sukupuoli: 'N', ikavaihe: 'lapsuus' });
    expect(m.N).toBe(4);
    expect(m.lohko2.kehittyvat).toMatchObject({ arvo: null, tila: 'liian_pieni' });
    expect(KT.renderNakyma(m, {})).toContain('Liian pieni ryhmä');
  });
  it('ei dataa → "Ei vielä dataa" kaikkialla, ei yhtään keksittyä lukua', () => {
    const m = KT.rakennaMalli({ seura: { nimi: 'Testiseura', palloliittoKori: 3 }, pelaajat: [], harjoitusarvioinnit: [], mentoroinnit: [], kalenteri: [], kausikuvat: [] }, { nyt: NYT });
    const h = KT.renderNakyma(m, {});
    expect(m.lohko2.kehittyvat.tila).toBe('ei_dataa');
    expect(h).toContain('Ei vielä dataa');
    expect(m.lohko1.rivit.find((r) => r.avain === 'C1_lisenssit').tila).toBe('puuttuu');
  });
  it('jokaisella luvulla N, päivämäärä (pp.kk.vvvv) ja tila', () => {
    const h = KT.renderNakyma(malli(), {});
    expect(h).toMatch(/N \d+ · \d{2}\.\d{2}\.\d{4} · (Mitattu|Alustava)/);
  });
});

describe('S1 X-tekijä', () => {
  it('signaali kirjattu (demo) → luku; ei kirjattu yhdellekään (oikeat seurat) → tyhjä tila', () => {
    expect(malli().lohko2.S1).toMatchObject({ n: 4, N: 6 });
    const ilman = Object.assign({}, DATA, { pelaajat: DATA.pelaajat.map((p) => { const q = Object.assign({}, p); delete q.signaali; return q; }) });
    const m = KT.rakennaMalli(ilman, { nyt: NYT });
    expect(m.lohko2.S1).toBeNull();
    expect(KT.renderNakyma(m, {})).toContain('X-tekijä-signaalia ei vielä kirjata järjestelmään');
  });
});

describe('D1–D5 ja muut lohkon 2 mittarit', () => {
  const m = malli();
  it('K1 kaikilla avaintesteillä ↑, → ja ↓; PH- ja yksi mittaus -reunatapaukset ei vertailukelpoisia', () => {
    m.lohko2.testijakaumat.filter((t) => t.rooli === 'avain').forEach((t) => {
      expect(t.osuus.jakauma.vahva_ylos).toBeGreaterThan(0); expect(t.osuus.jakauma.vaihtelu).toBeGreaterThan(0);
      expect(t.osuus.jakauma.vahva_alas).toBeGreaterThan(0); expect(t.osuus.jakauma.ei_vertailukelpoinen).toBeGreaterThan(0);
    });
    expect(m.lohko2.testijakaumat.find((t) => t.testi === 'lin30m').pitkia).toBeGreaterThan(0);
  });
  it('D2–D5 kaksi arviointikertaa → muutosjakauma', () => {
    m.lohko2.k3.forEach((d) => expect(d.N).toBe(38));
  });
  it('IDP: kattavuus, pysähtynyt tavoite, sitoumukset; K7 neljä liikettä; P1 tunnit; kausikuva 1 / 2', () => {
    expect(m.lohko2.P4.n).toBe(1);
    expect(m.lohko2.K7.map((k) => k.N)).toEqual([4, 4, 4, 4]);
    expect(Object.keys(m.lohko2.P1)).toEqual(expect.arrayContaining(['P14 Demo', 'T14 Demo']));
    expect(KT.renderNakyma(m, {})).toContain('Kausikuvia: 1 / 2');
  });
});

describe('raportti ja koodivartijat', () => {
  it('raportit (seura + Palloliitto) ilman pelaajanimiä', () => {
    const m = malli();
    const nimet = DATA.pelaajat.flatMap((p) => [p.etunimi, p.sukunimi]);
    for (const tyyppi of ['seura', 'palloliitto']) {
      const r = KT.raporttiHTML(m, tyyppi);
      nimet.forEach((n) => expect(r).not.toContain(n));
      expect(r).toContain(tyyppi === 'palloliitto' ? 'Palloliitto-raportti' : 'Seuran kehitysraportti');
    }
  });
  it('joukkueporautuminen näyttää pelaajarivit ja linkin pelaajakorttiin', () => {
    const h = KT.renderNakyma(malli(), { auki: { 'P14 Demo': true } });
    expect(h).toContain("naytaPelaajaTiedot('demo_p14_01')");
  });
  it('ei seuran nimiä eikä seuraId-literaaleja muutetuissa tiedostoissa (näkymäosuus)', () => {
    const SEURA = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');
    const osa = SEURA.slice(SEURA.indexOf('/* ═════════ KEHITYSTILANNE v0'), SEURA.indexOf('function renderJoukkueet() {'));
    const kielletty = /\b(EPS|Espoo|Espoon|Pallo-Iirot|palloiirot|sjk|kpv|grifk|sibbovargarna|yilves|vifk|demo-fc)\b/i;
    for (const t of [osa, readFileSync(join(ROOT, 'lib/tm_kehitystilanne.js'), 'utf8'), readFileSync(join(ROOT, 'lib/tm_kehikot.js'), 'utf8'), readFileSync(join(ROOT, 'lib/tm_mittarit.js'), 'utf8')]) {
      expect(t).not.toMatch(kielletty);
      expect(t).not.toMatch(/sid\s*===\s*['"]|seuraId\s*===\s*['"]/);
    }
  });
  it('Seura.html: yksi @media(max-width:768px)-lohko; kausikuva kerran per kausi (demorajaus purettu v3.35); raportti avaa ikkunan ensin', () => {
    const SEURA = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');
    expect(SEURA.match(/@media\(max-width:768px\)/g)).toHaveLength(1);
    expect(SEURA).toContain('const kausikuvaSallittu = !K.data.kausikuvat.some(');
    expect(SEURA).not.toMatch(/seura\.demo !== true\) \{ naytaToast\('Kausikuva/);
    const f = SEURA.slice(SEURA.indexOf('function ktVieRaportti('));
    expect(f.indexOf("window.open('', '_blank')")).toBeLessThan(f.indexOf('TM_KEHITYSTILANNE.raporttiHTML'));
  });
  it('Admin: demoseurat pois seurojen välisistä yhteenvedoista (Tilastot + Pilotin tila)', () => {
    const A = readFileSync(join(ROOT, 'TalentMaster_Admin.html'), 'utf8');
    expect(A.match(/\(tila\.seurat \|\| \[\]\)\.filter\(s => s\.demo !== true\)/g)).toHaveLength(2);
  });
});

describe('Ensinäkymä (KISS ja Oura-tyyli)', () => {
  const E = () => KT.ensinakymaMalli(malli());
  it('rengas: kaikki tavoitteet tiloittain, keskellä "X / N tavoitetta raiteilla" (raiteilla = täyttynyt + raiteilla)', () => {
    const e = E(), m = malli();
    const tilat = m.lohko1.rivit.filter((r) => ['tayttynyt', 'raiteilla', 'riskissa', 'puuttuu'].includes(r.tila));
    expect(e.rivit.length).toBe(tilat.length);
    expect(e.raiteilla).toBe(tilat.filter((r) => r.tila === 'tayttynyt' || r.tila === 'raiteilla').length);
    const h = KT.renderEnsinakyma(m, {});
    expect(h).toContain('tavoitetta raiteilla');
    expect((h.match(/stroke-dasharray/g) || []).length).toBe(e.rivit.length);
  });
  it('kolme tekijää; jokainen tavoite kuuluu täsmälleen yhteen; tekijän tila = heikoin tavoite', () => {
    const e = E(), J = ['tayttynyt', 'raiteilla', 'riskissa', 'puuttuu'];
    expect(e.tekijat.map((t) => t.nimi)).toEqual(['Pelaajat kehittyvät', 'Valmennuksen laatu', 'Seura ja rakenteet']);
    expect(e.tekijat.reduce((a, t) => a + t.rivit.length, 0)).toBe(e.rivit.length);
    e.tekijat.forEach((t) => {
      if (!t.rivit.length) return;
      const heikoin = t.rivit.map((r) => r.tila).sort((a, b) => J.indexOf(b) - J.indexOf(a))[0];
      expect(t.tila).toBe(heikoin === 'tayttynyt' ? 'raiteilla' : heikoin);
    });
  });
  it('Seuraavaksi lasketaan datasta: vanhentunut testikierros → kehote joukkueelle', () => {
    const d = JSON.parse(JSON.stringify(DATA));
    d.pelaajat.forEach((p) => { if (p.joukkue === 'P14 Demo') { p.hh_pvm = '2025-04-01'; (p.hh_historia || []).forEach((h) => { h.pvm = h.pvm > '2025-04-01' ? '2025-04-01' : h.pvm; }); } });
    const e = KT.ensinakymaMalli(KT.rakennaMalli(d, { nyt: NYT }));
    expect(e.seuraavaksi).toMatch(/^Kirjaa testikierros joukkueelle P14 Demo/);
    expect(E().seuraavaksi.length).toBeGreaterThan(10);
  });
  it('ei taulukoita ensinäkymässä; info-nappi; toiminnot alareunassa', () => {
    const h = KT.renderEnsinakyma(malli(), { saaKirjoittaa: true, kausikuvaSallittu: true });
    expect(h).not.toContain('<table');
    expect(h).toContain('Miten luvut lasketaan');
    ['Aseta tavoitteet', 'Kirjaa Kori 3 -tiedot', 'Tallenna kausikuva', 'Vie raportti'].forEach((t) => expect(h).toContain(t));
    expect(h.indexOf('Aseta tavoitteet')).toBeGreaterThan(h.indexOf('ke-tekijat'));
    expect(KT.renderEnsinakyma(malli(), { info: true })).toContain('Datan kattavuus');
  });
  it('tekijäkortti avaa sisällön: Pelaajat → fyysinen + K1b (kalenteri-ikä / kehitysvaihe) + joukkueet; Valmennus/Seura → omat + Palloliitto', () => {
    const p = KT.renderEnsinakyma(malli(), { avoin: 'pelaajat' });
    expect(p).toContain('Oliko muutos todellinen?'); expect(p).toContain('Kehittyykö vaadittua vauhtia?');
    expect(p).toContain('Kalenteri-ikä'); expect(p).toContain('Kehitysvaihe'); expect(p).toContain('P14 Demo');
    expect(KT.renderEnsinakyma(malli(), { avoin: 'pelaajat', k1bRef: 'bio' })).toContain('kehitysvaihe (biologinen ikä, arvio)');
    const v = KT.renderEnsinakyma(malli(), { avoin: 'valmennus' });
    expect(v).toContain('Omat tavoitteet ja Palloliiton taso'); expect(v).toContain('Harjoitushavainnot'); expect(v).toContain('Palloliitto 250');
    expect(KT.renderEnsinakyma(malli(), { avoin: 'seura' })).toContain('Rakenteet ja Kori 3 -vaatimukset');
  });
  it('prosentit suomalaisittain: ensinäkymässä kokonaisluku, yksityiskohdissa 1 desimaali pilkulla; aina "x %" sitovalla välilyönnillä', () => {
    const m = malli(), kv = m.lohko2.kehittyvat;
    expect(kv.arvo).not.toBeNull();
    const kok = Math.round(kv.arvo) + ' %';
    expect(KT.ensinakymaMalli(m).lause).toContain(kok + ' pelaajista kehittyy fyysisesti');
    expect(KT.renderEnsinakyma(m, {})).toContain(kok);
    const des = kv.arvo.toFixed(1).replace('.', ',') + ' %';
    expect(KT.renderNakyma(m, {})).toContain(des);
    [KT.renderEnsinakyma(m, {}), KT.renderEnsinakyma(m, { avoin: 'pelaajat', info: true }), KT.renderNakyma(m, {}), KT.raporttiHTML(m, 'seura')]
      .forEach((h) => { expect(h).not.toMatch(/\d %/); expect(h).not.toMatch(/\d\.\d %/); });
  });
  it('tyhjä seura: ei demo-fallbackia, ei kaatumista', () => {
    const tyhja = { seura: {}, joukkueet: [], pelaajat: [], bio: {}, kerrat: {}, idp: {}, kartoitus: {}, kirjaukset: {}, harjoitusarvioinnit: [], mentoroinnit: [], kalenteri: [], asetukset: null, seuratuki: null, kausikuvat: [] };
    const h = KT.renderEnsinakyma(KT.rakennaMalli(tyhja, { nyt: NYT }), { avoin: 'pelaajat' });
    expect(h).not.toMatch(/Demo|demo_/);
    expect(h).toContain('Ei vielä dataa');
  });
});

describe('Seuran omat vapaat tavoitteet (v0.1, demodata)', () => {
  const rivi = (m, id) => m.lohko1.rivit.find((r) => r.avain === 'oma_' + id);
  it('demodatan kolme tavoitetta: 2/3 edustukseen Raiteilla, kasvattajaraha Riskissä (kumottu kirjaus ei laske), peliminuutit Täyttynyt', () => {
    const m = malli();
    expect(rivi(m, 'demo_edustusnousut')).toMatchObject({ oma: true, tila: 'raiteilla', toteuma: { arvo: 2, N: 2 }, tavoite: 3, palloliitto: null, tekija: 'pelaajat' });
    expect(rivi(m, 'demo_kasvattajaraha')).toMatchObject({ tila: 'riskissa', toteuma: { arvo: 10500, N: 2 }, tekija: 'seura' });
    expect(rivi(m, 'demo_kasvattiminuutit')).toMatchObject({ tila: 'tayttynyt', toteuma: { arvo: 31 } });
  });
  it('mukana renkaassa ja oikean tekijän kortissa; sukupuolisuodatin ei muuta niitä', () => {
    const e = KT.ensinakymaMalli(malli());
    expect(e.rivit.filter((r) => r.oma).length).toBe(3);
    expect(e.tekijat.find((t) => t.id === 'pelaajat').rivit.filter((r) => r.oma).map((r) => r.omaId).sort()).toEqual(['demo_edustusnousut', 'demo_kasvattiminuutit']);
    expect(e.tekijat.find((t) => t.id === 'seura').rivit.some((r) => r.omaId === 'demo_kasvattajaraha')).toBe(true);
    expect(rivi(malli({ sukupuoli: 'N' }), 'demo_kasvattajaraha').toteuma).toEqual(rivi(malli(), 'demo_kasvattajaraha').toteuma);
  });
  it('näkymä: Palloliitto-sarakkeessa "oma tavoite", Kirjaa-nappi vain kirjoittajille, summa suomalaisittain', () => {
    const h = KT.renderEnsinakyma(malli(), { avoin: 'seura', saaKirjoittaa: true });
    expect(h).toContain('Kasvattajakorvaukset'); expect(h).toContain('Palloliitto: oma tavoite'); expect(h).toContain("ktAvaaKirjaus('demo_kasvattajaraha')");
    expect(h).toContain('10 500 €');
    expect(KT.renderEnsinakyma(malli(), { avoin: 'seura' })).not.toContain('ktAvaaKirjaus');
    expect(KT.renderEnsinakyma(malli(), { avoin: 'pelaajat', saaKirjoittaa: true })).toContain('Seuran omat tavoitteet');
    expect(KT.renderNakyma(malli(), {})).toContain('<span class="kt-meta">oma tavoite</span>');
  });
  it('raportit: seuran raportissa kirjaukset vain määrinä, ei pelaajanimiä; Palloliitto-raportissa ei omia tavoitteita', () => {
    const d = JSON.parse(JSON.stringify(DATA));
    const p = d.pelaajat[0];
    d.omatTavoitteet.find((t) => t.id === 'demo_edustusnousut').kirjaukset[0].pelaajaId = p.id;   // pelaajalinkki
    const m = KT.rakennaMalli(d, { nyt: NYT });
    const s = KT.raporttiHTML(m, 'seura'), pl = KT.raporttiHTML(m, 'palloliitto');
    expect(s).toContain('Omat kasvatit edustukseen'); expect(s).toContain('(2 kirjausta)');
    expect(s).not.toContain(p.etunimi + ' ' + p.sukunimi); expect(s).not.toContain(p.id);
    expect(pl).not.toContain('Omat kasvatit edustukseen'); expect(pl).not.toContain('Kasvattajakorvaukset');
  });
  it('arkistoitu tavoite ei näy; ei omia tavoitteita → ei omia rivejä eikä kaatumista', () => {
    const d = JSON.parse(JSON.stringify(DATA));
    d.omatTavoitteet.forEach((t) => { t.arkistoitu = true; });
    expect(KT.rakennaMalli(d, { nyt: NYT }).lohko1.rivit.some((r) => r.oma)).toBe(false);
    delete d.omatTavoitteet;
    expect(() => KT.renderEnsinakyma(KT.rakennaMalli(d, { nyt: NYT }), { avoin: 'seura' })).not.toThrow();
  });
  it('Seura.html: kehitysasetukset tallennetaan mergeFields-asetuksella (ei ylikirjoita muita kenttiä)', () => {
    const f = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');
    expect(f).toMatch(/collection\('kehitysasetukset'\)\.doc\(String\(K\.vuosi\)\)\.set\(doc, \{ mergeFields: Object\.keys\(doc\) \}\)/);
    expect(f).not.toMatch(/collection\('kehitysasetukset'\)\.doc\(String\(K\.vuosi\)\)\.set\(doc\);/);
  });
});
