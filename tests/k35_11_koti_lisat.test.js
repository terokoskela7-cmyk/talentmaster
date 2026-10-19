/* K35-11 lisäykset 3–7 (live-tarkistus 12.10. KPV P13): Seuraava = viikon lista + sama joukkueehto · profiilikortti pois Kodista · nostot max 1/syy-tyyppi · Harjoittelu-tyhjä tila · backfill-liput · Lisää kalenteriini -napit. */
const fs = require('fs'), path = require('path');
const M = require('../lib/tm_valmentaja_koti.js'), N = require('../lib/tm_valmentaja_koti_nakyma.js'), HK = require('../lib/tm_harjoituskertyma.js'), HKN = require('../lib/tm_harjoituskertyma_nakyma.js');
const ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00'), NYT = ms('2026-10-12', '12:00');   // ma 12.10.
const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: 'Harjoitus — Nopeus', pvm: d, alkaa: '17:00', _alkaaMs: ms(d, '17:00'), _paattyyMs: ms(d, '18:30') }, o || {});
const PEL = ['Aatu Aalto', 'Beni Berg', 'Cai Carlsson', 'Eero Eskola', 'Fabian Fors', 'Gus Grön'].map((n, i) => ({ id: 'p' + i, nimi: n }));

describe('#3 Seuraava ja Tämä viikko käyttävät samaa listaa ja joukkueehtoa', () => {
  const J = { id: 'kpv_p13', nimi: 'P13' };
  const variantit = {
    'joukkue = nimi, ei joukkueet[] (KPV P13)': { joukkue: 'P13' },
    'joukkueet[] = id': { joukkue: 'P13', joukkueet: ['kpv_p13'] },
    'joukkue = id': { joukkue: 'kpv_p13' },
    'ei joukkuekenttää': {},
  };
  Object.keys(variantit).forEach((nimi) => it(nimi + ': To 15 + Pe 16 klo 17 → Seuraava = To 15, viikon kortit samat', () => {
    const m = M.tmKotiMalli({ nyt: NYT, joukkue: J, pelaajat: PEL, tapahtumat: [ev('to', '2026-10-15', variantit[nimi]), ev('pe', '2026-10-16', variantit[nimi])] });
    expect(m.seuraava).toMatchObject({ id: 'to', aika: '17:00' });
    const viikonIdt = [].concat(...m.viikko.paivat.map((p) => p.tapahtumat.map((e) => e.id))); expect(viikonIdt).toEqual(['to', 'pe']);
    expect(N.tmKotiHTML(m, { t: (x) => x, on: () => 'x()' })).not.toContain('Ei tulevia tapahtumia');
  }));
  it('kaikki viikolla näkyvä kuuluu myös seuraavan hakuun: toisen joukkueen tapahtuma ei näy kummassakaan', () => {
    const m = M.tmKotiMalli({ nyt: NYT, joukkue: J, pelaajat: PEL, tapahtumat: [ev('x', '2026-10-13', { joukkue: 'P12', joukkueet: ['kpv_p12'] }), ev('to', '2026-10-15', { joukkue: 'P13' })] });
    expect(m.seuraava.id).toBe('to'); expect([].concat(...m.viikko.paivat.map((p) => p.tapahtumat.map((e) => e.id)))).toEqual(['to']);
  });
});

describe('#5 pelaajanostot: max 1 per syy-tyyppi ennen toistoa', () => {
  const lasn = (l, y) => ({ treeni: { lasna: l, yht: y } });
  it('kolme läsnäolonostoa + omatoimi + havainto → yksi kustakin, ei kolmea samaa syytä', () => {
    const m = M.tmKotiMalli({ nyt: ms('2026-10-14', '20:00'), joukkue: { id: 'j', nimi: 'J' }, pelaajat: PEL, tapahtumat: [], havainnot: { p0: '2026-10-10', p1: '2026-10-10', p2: '2026-10-10', p3: '2026-10-10', p4: '2026-10-10' },
      lasnaolot: { p0: lasn(1, 8), p1: lasn(1, 8), p2: lasn(1, 8), p3: lasn(8, 8), p4: lasn(8, 8), p5: lasn(8, 8) },
      kirjaukset: [{ pelaajaId: 'p4', pvm: '2026-10-13', tyyppi: 'omatoimi', tehty: true }, { pelaajaId: 'p5', pvm: '2026-10-13', tyyppi: 'omatoimi', tehty: true }] });
    const amber = m.nostot.filter((n) => !n.myonteinen), kohdat = amber.map((n) => n.kohta);
    expect(new Set(kohdat).size).toBe(kohdat.length);   // ei toistoa kun muitakin syitä on
    expect(kohdat.sort()).toEqual(['havainnot', 'lasnaolo', 'omatoimi']);
  });
  it('vain yhtä syytä → toistetaan (täyttää kolme paikkaa), ei tyhjennetä', () => {
    const m = M.tmKotiMalli({ nyt: NYT, joukkue: { id: 'j', nimi: 'J' }, pelaajat: PEL, tapahtumat: [], havainnot: {} });
    expect(m.nostot.filter((n) => n.kohta === 'havainnot').length).toBe(3);
  });
  it('otsikko "Pelaajat, joihin kannattaa tarttua"', () => {
    const m = M.tmKotiMalli({ nyt: NYT, joukkue: { id: 'j', nimi: 'J' }, pelaajat: PEL, tapahtumat: [], havainnot: {} });
    expect(N.tmKotiHTML(m, { t: (x) => x, on: () => 'x()' })).toContain('Pelaajat, joihin kannattaa tarttua');
  });
});

describe('#6 Harjoittelu-lohko: tyhjä tila näkyy, piilotus vain lukuvirheessä', () => {
  it('kooste puuttuu (ei kirjauksia) → tyhjän tilan teksti, ei sarakkeita', () => {
    const h = HKN.tmKertymaMasterHTML(HK.tmKertymaKoreista({}, NYT), { t: (x) => x });
    expect(h).toContain('Kertymä alkaa näkyä, kun läsnäoloja tai omatoimisia kirjataan'); expect(h).not.toContain('hk-sarakkeet');
  });
  it('kirjauksia → normaali näkymä; lukuvirhe (null) → tyhjä merkkijono (kutsuja piilottaa)', () => {
    const k = HK.tmKertymaKoreista({ [HK.tmKertymaVkAvain('2026-10-12')]: { omatoimi: { n: 2, min: 60 } } }, NYT);
    expect(HKN.tmKertymaMasterHTML(k, { t: (x) => x })).toContain('hk-sarakkeet'); expect(HKN.tmKertymaMasterHTML(null, { t: (x) => x })).toBe('');
  });
  it('Master: piilotus vain kun lukuvirhe (!k), ei kun kooste on tyhjä', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib/tm_naytto_lohkot.js'), 'utf8'), rivi = src.slice(src.indexOf('tmKertymaLueKooste(c.db, c.sid, p.id'));   // K2: Harjoittelu-lohkon lataus siirrettiin libiin
    expect(rivi).toMatch(/if \(w && !k\) w\.style\.display = 'none'/);
  });
});

describe('#6 taydenna_harjoituskertyma.js: --seura <id> kaikille, --kaikki-seurat erillinen lippu', () => {
  const S = require('../scripts/taydenna_harjoituskertyma.js');
  it('mikä tahansa seuran id kelpaa; kuiva-ajo oletus', () => {
    expect(S.lueArgit(['--seura', 'kpv'])).toEqual({ seura: 'kpv', kaikki: false, kirjoita: false });
    expect(S.lueArgit(['--seura', 'kpv', '--kirjoita'])).toMatchObject({ kirjoita: true });
  });
  it('--kaikki-seurat vain omalla lipulla; ei yhdisty --seura:an; ilman lippuja → käyttöohje; tyhjä/lippu-id hylätään', () => {
    expect(S.lueArgit(['--kaikki-seurat'])).toEqual({ seura: null, kaikki: true, kirjoita: false });
    expect(() => S.lueArgit(['--seura', 'kpv', '--kaikki-seurat'])).toThrow(/eivät yhdisty/); expect(() => S.lueArgit([])).toThrow(/Käyttö/);
    expect(() => S.lueArgit(['--seura'])).toThrow(); expect(() => S.lueArgit(['--seura', '--kirjoita'])).toThrow();
  });
});

describe('#4 profiilikortti pois Kodista', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8');
  it('renderCoachSelfCard piilottaa kortin kun _ws === koti; setWs piirtää sen uudelleen vaihdettaessa', () => {
    expect(src).toMatch(/function renderCoachSelfCard\(\) \{[\s\S]{0,300}_ws === 'koti'\) \{ el\.style\.display = 'none'; return; \}/);
    expect(src).toMatch(/_ws = ws;[\s\S]{0,900}try \{ renderCoachSelfCard\(\); \} catch \(e\) \{\}/);
  });
});

describe('#7 Lisää kalenteriini: Apple · Outlook · Google', () => {
  const U = require('../lib/tm_kalenteri_tilaus_ui.js');
  it('URL:t oikeassa muodossa (https-url koodattuna; Google saa webcal-osoitteen)', () => {
    const u = U.tmTilausUrlit({ url: 'https://h.test/k/abc.ics', webcal: 'webcal://h.test/k/abc.ics' });
    expect(u).toEqual({ apple: 'webcal://h.test/k/abc.ics', outlook: 'https://outlook.office.com/calendar/0/addfromweb?url=https%3A%2F%2Fh.test%2Fk%2Fabc.ics&name=TalentMaster',
      outlook_live: 'https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fh.test%2Fk%2Fabc.ics&name=TalentMaster', google: 'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fh.test%2Fk%2Fabc.ics' });
  });
});
