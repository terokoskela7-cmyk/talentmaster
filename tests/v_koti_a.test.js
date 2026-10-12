/* V-KOTI A — valmentajan Koti v2: malli (priorisointi, max 3, päättynyt-ilman-läsnäoloa, tyhjä viikko, nostojen kynnykset) + HTML-säännöt. */
const M = require('../lib/tm_valmentaja_koti.js'), N = require('../lib/tm_valmentaja_koti_nakyma.js');
const ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', pvm: d, alkaa: '17:30', _alkaaMs: ms(d, '17:30'), _paattyyMs: ms(d, '19:00'), joukkue: 'Demo U13', joukkueet: ['demo_u13'], nimi: 'Treeni' }, o || {});
const J_ = { id: 'demo_u13', nimi: 'Demo U13' }, NYT = ms('2026-10-14', '20:00');   // ke illalla
const PEL = ['Aatu Aalto', 'Beni Berg', 'Cai Carlsson', 'Eero Eskola', 'Fabian Fors', 'Gus Grön'].map((n, i) => ({ id: 'p' + i, nimi: n }));
const mal = (o) => M.tmKotiMalli(Object.assign({ nyt: NYT, joukkue: J_, tapahtumat: [], pelaajat: PEL }, o));

describe('joukkueen jakso (tmJoukkueenJakso → syke)', () => {
  const J = require('../lib/tm_joukkuejakso.js'), doc = { jaksofokus: { alku: '2026-10-05', kesto_vk: 4, osa_alueet: { tekninen_taktinen: { nimi: 'Pelaaminen' } } } };
  it('aktiivinen jakso: nimi, päättymispäivä, viikko n/N, päiviä jäljellä; ei vielä alkanut / umpeutunut / ei jaksoa → null', () => {
    expect(J.tmJoukkueenJakso(doc, ms('2026-10-20', '12:00'))).toEqual({ nimi: 'Pelaaminen', alku: '2026-10-05', paattyy: '2026-11-02', vk: 3, vkYht: 4, pvJaljella: 13 });
    expect(J.tmJoukkueenJakso(doc, ms('2026-10-01', '12:00'))).toBeNull(); expect(J.tmJoukkueenJakso(doc, ms('2026-11-05', '12:00'))).toBeNull(); expect(J.tmJoukkueenJakso({}, NYT)).toBeNull();
  });
  it('Koti: jakso päättyy ≤ 5 pv → tehtävä; syke näyttää viikon n/N + päättymispäivän', () => {
    const jk = J.tmJoukkueenJakso(doc, ms('2026-10-29', '12:00')), m = M.tmKotiMalli({ nyt: ms('2026-10-29', '12:00'), joukkue: J_, pelaajat: PEL, tapahtumat: [], jakso: { nimi: jk.nimi, loppu: jk.paattyy, vk: jk.vk, vkYht: jk.vkYht } });
    expect(m.tehtavat.map((t) => t.avain)).toContain('jakso'); expect(m.syke.jakso).toEqual({ vk: 4, yht: 4, paattyy: '2026-11-02' });
    expect(N.tmKotiHTML(m, { t: (x) => x, on: () => 'x()' })).toContain('Jakson viikko · päättyy 2.11.');
  });
});

describe('seuraava', () => {
  it('lähin ei-päättynyt omalle joukkueelle; toisen joukkueen, peruttu ja poistettu ohitetaan; käynnissä oleva lasketaan', () => {
    const m = mal({ tapahtumat: [ev('vanha', '2026-10-14'), ev('toinen', '2026-10-15', { joukkue: 'X', joukkueet: ['x'] }), ev('peruttu', '2026-10-15', { tila: 'peruttu' }), ev('pois', '2026-10-15', { poistettu: true }), ev('b', '2026-10-16', { paikka: 'Kenttä 2' })] });
    expect(m.seuraava).toMatchObject({ id: 'b', paikka: 'Kenttä 2', aika: '17:30' }); expect(m.seuraava.napit.map((n) => n.teksti)).toEqual(['Avaa', 'Viesti joukkueelle']);
    expect(mal({ nyt: ms('2026-10-16', '18:00'), tapahtumat: [ev('b', '2026-10-16')] }).seuraava.id).toBe('b');
  });
  it('tulossa/estynyt-luvut ja estyneiden nimet (lyhennetty) + syy jos annettu', () => {
    const m = mal({ tapahtumat: [ev('b', '2026-10-16')], saatavuus: { b: { tulossa: ['p0', 'p1'], estynyt: [{ nimi: 'Beni Berg', syy: 'koe' }, { nimi: 'Gus Grön' }] } } });
    expect(m.seuraava).toMatchObject({ tulossa: 2, estynyt: 2 }); expect(m.seuraava.estyneet).toEqual([{ nimi: 'Beni B.', syy: 'koe' }, { nimi: 'Gus G.', syy: '' }]);
  });
  it('ei tapahtumia → seuraava null', () => { expect(mal().seuraava).toBeNull(); });
});

describe('viikko', () => {
  it('ma–su, MD-merkinnät ottelusta, tänään korostettu, aamutreeni "· N", tyhjä viikko → tyhja', () => {
    const m = mal({ tapahtumat: [ev('t', '2026-10-15'), ev('am', '2026-10-13', { alalaji: 'aamutreeni', pelaajat_id: ['a', 'b', 'c'] }), ev('o', '2026-10-17', { tyyppi: 'ottelu', nimi: 'Ottelu' })] });
    expect(m.viikko.maanantai).toBe('2026-10-12'); expect(m.viikko.paivat).toHaveLength(7); expect(m.viikko.paivat.filter((p) => p.tanaan).map((p) => p.pvm)).toEqual(['2026-10-14']);
    expect(m.viikko.paivat.map((p) => p.md)).toEqual([null, null, 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1']); expect(m.viikko.paivat[1].tapahtumat[0].nimi).toBe('Aamutreeni · 3'); expect(m.viikko.tyhja).toBe(false);
    expect(mal().viikko.tyhja).toBe(true);
  });
});

describe('tehtävät', () => {
  const tanaanPaattynyt = ev('a', '2026-10-14', { nimi: 'Treeni' });
  it('tänään päättynyt harjoitus ilman läsnäolokoostetta → tehtävälistan kärki (ei korvaa seuraava-korttia)', () => {
    const m = mal({ tapahtumat: [tanaanPaattynyt, ev('b', '2026-10-16')], havainnot: {} });
    expect(m.tehtavat[0]).toMatchObject({ avain: 'lasnaolot', nappi: { toiminto: 'lasnaolo', arg: 'a' } }); expect(m.seuraava.id).toBe('b');
    expect(mal({ tapahtumat: [Object.assign({}, tanaanPaattynyt, { lasnaolo_kooste: { paikalla: 12, poissa: 1 } })], havainnot: {} }).tehtavat.map((t) => t.avain)).not.toContain('lasnaolot');
  });
  it('max 3 ja prioriteetti: läsnäolot > jakso ≤ 5 pv > havainnot (nimet ≤ 4) > vastaamaton huoltajaviesti > klippi', () => {
    const m = mal({ tapahtumat: [tanaanPaattynyt], havainnot: {}, jakso: { nimi: 'J3', loppu: '2026-10-17', koosteTehty: false }, viestit: [{ id: 'v1', kuka: 'Äiti', luettu: true, huoltaja: true, vastattu: false, aika: NYT - 30 * 3600000 }], klipit: [{ id: 'k1', jaettu: false }] });
    expect(m.tehtavat.map((t) => t.avain)).toEqual(['lasnaolot', 'jakso', 'havainnot']); expect(m.tehtavat.every((t) => t.nappi && t.nappi.toiminto)).toBe(true);
    const h = mal({ havainnot: {} }).tehtavat.find((t) => t.avain === 'havainnot'); expect(h.teksti).toContain('+2'); expect(h.teksti.split(',').length).toBe(4);
  });
  it('FLEI < 40 = turvasignaali, AINA ylin; D3-itsearvio odottaa havaintojen jälkeen; järjestys FLEI > läsnäolot > jakso > havainnot > D3 > viesti > klippi; 3 näkyvissä + loput lisaTehtavat', () => {
    const pel = PEL.map((p, i) => Object.assign({}, p, { flei: i === 1 ? 35 : 70, d3Odottaa: i === 2 }));
    const m = mal({ pelaajat: pel, tapahtumat: [tanaanPaattynyt], havainnot: {}, jakso: { nimi: 'J', loppu: '2026-10-17' }, viestit: [{ id: 'v1', kuka: 'Äiti', huoltaja: true, vastattu: false, aika: NYT - 30 * 3600000 }], klipit: [{ id: 'k', jaettu: false }] });
    expect(m.tehtavat.map((t) => t.avain)).toEqual(['flei', 'lasnaolot', 'jakso']); expect(m.lisaTehtavat.map((t) => t.avain)).toEqual(['havainnot', 'd3', 'viesti', 'klippi']);
    expect(m.tehtavat[0]).toMatchObject({ turva: true, nappi: { teksti: 'Lähetä klinikkaan', arg: 'p1' } }); expect(m.tehtavat[0].teksti).toContain('Beni B.'); expect(m.lisaTehtavat[1].nappi).toMatchObject({ toiminto: 'd3', arg: 'p2' });
    const h = N.tmKotiHTML(m, { t: (x) => x, on: (n) => 'k(' + n.toiminto + ')' }); expect(h).toContain('Näytä kaikki (7)'); expect(h).toContain('vk-teht turva'); expect((h.match(/vk-lisaa/g) || []).length).toBeGreaterThan(0);
    expect(mal({ pelaajat: PEL.map((p) => Object.assign({}, p, { flei: 40 })) }).tehtavat.some((t) => t.avain === 'flei')).toBe(false);   // raja: < 40
  });
  it('jakso > 5 pv tai kooste tehty → ei tehtävää; viesti alle 24 h tai vastattu → ei; klippi jaettu → ei', () => {
    const m = mal({ havainnot: { p0: '2026-10-10', p1: '2026-10-10', p2: '2026-10-10', p3: '2026-10-10', p4: '2026-10-10', p5: '2026-10-10' }, jakso: { loppu: '2026-10-25' }, viestit: [{ id: 'v', huoltaja: true, vastattu: false, aika: NYT - 3600000 }, { id: 'w', huoltaja: true, vastattu: true, aika: NYT - 99 * 3600000 }], klipit: [{ id: 'k', jaettu: true }] });
    expect(m.tehtavat).toEqual([]);
  });
});

describe('nostot', () => {
  it('kynnykset: havainto ≥ 30 pv, läsnä < 50 % 4 vk (vain jos 6f-data), ei omatoimisia 3 vk; ilman lähdettä sääntö ohitetaan', () => {
    const vk4 = (l, y) => ({ treeni: { lasna: l, yht: y }, aamu: { lasna: 0, yht: 0 }, ryhma: { lasna: 0, yht: 0 } });
    const m = mal({ havainnot: { p0: '2026-10-10', p1: '2026-08-01', p2: '2026-10-10', p3: '2026-10-10', p4: '2026-10-10', p5: '2026-10-10' }, lasnaolot: { p2: vk4(1, 4), p3: vk4(3, 4) }, kirjaukset: [{ pelaajaId: 'p0', pvm: '2026-10-13', tyyppi: 'T' }] });
    const syyt = Object.fromEntries(m.nostot.filter((n) => !n.myonteinen).map((n) => [n.pid, n.syy])); expect(syyt.p2).toMatch(/Läsnä alle puolessa/); expect(m.nostot.filter((n) => /^Läsnä/.test(n.syy)).map((n) => n.pid)).toEqual(['p2']);   // p3 (3/4) ei läsnäolonostoa
    expect(mal({ havainnot: {} }).nostot.every((n) => !/Läsnä/.test(n.syy))).toBe(true);   // ei 6f-dataa → läsnäolosääntö ohi
    expect(mal({ kirjaukset: [] }).nostot.some((n) => /omatoimisia 3/.test(n.syy))).toBe(true); expect(mal({}).nostot.some((n) => /omatoimisia 3/.test(n.syy))).toBe(false);   // ei kirjauslähdettä → ohi
  });
  it('myönteinen nosto: eniten omatoimisia tällä viikolla (≥2) → teal "kehu?"; muut amber; max 4; ei punaista', () => {
    const k = [{ pelaajaId: 'p1', pvm: '2026-10-12', tyyppi: 'T' }, { pelaajaId: 'p1', pvm: '2026-10-13', tyyppi: 'S' }, { pelaajaId: 'p1', pvm: '2026-10-14', tyyppi: 'T' }, { pelaajaId: 'p2', pvm: '2026-10-13', tyyppi: 'T' }];
    const m = mal({ kirjaukset: k, havainnot: {} }); const pos = m.nostot.filter((n) => n.myonteinen); expect(pos).toHaveLength(1); expect(pos[0]).toMatchObject({ pid: 'p1', savy: 'teal' }); expect(m.nostot.length).toBeLessThanOrEqual(4);
    m.nostot.filter((n) => !n.myonteinen).forEach((n) => expect(n.savy).toBe('amber')); expect(JSON.stringify(m.nostot)).not.toMatch(/red|punain/i);
  });
});

describe('syke, viestit, tyhjä, HTML', () => {
  it('syke: omatoimi aktiivisia/vko; läsnäolo-% vain datasta; viestit vain lukemattomat max 3 (uusin ensin)', () => {
    const m = mal({ kirjaukset: [{ pelaajaId: 'p0', pvm: '2026-10-13', tyyppi: 'T' }, { pelaajaId: 'p1', pvm: '2026-10-13', tyyppi: 'T' }], viestit: [1, 2, 3, 4].map((i) => ({ id: 'm' + i, luettu: false, aika: i })).concat([{ id: 'l', luettu: true, aika: 99 }]) });
    expect(m.syke).toMatchObject({ omatoimiAktiivisia: 2, pelaajia: 6, lasnaolo4vk: null }); expect(m.viestit.map((v) => v.id)).toEqual(['m4', 'm3', 'm2']);
  });
  it('uusi valmentaja (ei pelaajia, ei tapahtumia) → tyhja "uusi" → Aloita tästä -polku, ei tyhjiä kortteja', () => {
    const m = M.tmKotiMalli({ nyt: NYT, joukkue: J_, tapahtumat: [], pelaajat: [] }); expect(m.tyhja).toBe('uusi');
    const h = N.tmKotiHTML(m, { t: (x) => x, on: () => 'x()' }); expect(h).toContain('Aloita tästä'); expect(h).not.toContain('Syke');
  });
  it('HTML: kortit + napit; ei hex/emoji; ei punaista; nostoissa amber/teal-luokat', () => {
    const m = mal({ tapahtumat: [tanaan(), ev('b', '2026-10-16')], havainnot: {}, kirjaukset: [] }), h = N.tmKotiHTML(m, { t: (x) => x, on: (n) => 'k(' + n.toiminto + ')' });
    ['Seuraava', 'Tehtävät', 'Tämä viikko', 'Pelaajat, joihin kannattaa tarttua', 'Syke', 'Avaa Pulssi'].forEach((s) => expect(h).toContain(s)); expect(h).toContain('k(lasnaolo)');
    [h, N.tmKotiCSS()].forEach((x) => { expect(x).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(x).not.toMatch(/var\(--red/); expect(x).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u); });
  });
  function tanaan() { return ev('a', '2026-10-14'); }
});
