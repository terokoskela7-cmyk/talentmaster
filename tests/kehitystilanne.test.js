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
    expect(m.lohko1.laskuri).toMatchObject({ tayttynyt: expect.any(Number), raiteilla: 1, puuttuu: 1 });
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
  it('Seura.html: yksi @media(max-width:768px)-lohko; kausikuva vain demoseuralle; raportti avaa ikkunan ensin', () => {
    const SEURA = readFileSync(join(ROOT, 'TalentMaster_Seura.html'), 'utf8');
    expect(SEURA.match(/@media\(max-width:768px\)/g)).toHaveLength(1);
    expect(SEURA).toContain('const kausikuvaSallittu = K.data.seura.demo === true');
    const f = SEURA.slice(SEURA.indexOf('function ktVieRaportti('));
    expect(f.indexOf("window.open('', '_blank')")).toBeLessThan(f.indexOf('TM_KEHITYSTILANNE.raporttiHTML'));
  });
  it('Admin: demoseurat pois seurojen välisistä yhteenvedoista (Tilastot + Pilotin tila)', () => {
    const A = readFileSync(join(ROOT, 'TalentMaster_Admin.html'), 'utf8');
    expect(A.match(/\(tila\.seurat \|\| \[\]\)\.filter\(s => s\.demo !== true\)/g)).toHaveLength(2);
  });
});
