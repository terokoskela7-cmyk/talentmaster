/* K35-6f — pelaajan harjoituskertymä: lib (ohjattu/omatoiminen, vahvistamaton ≠ poissa, aamutreeni erikseen, 4 vk / kausi -rajat), näkymät (ei vertailua), Pulssi-lista. */
const H = require('../lib/tm_harjoituskertyma.js'), N = require('../lib/tm_harjoituskertyma_nakyma.js');
const ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', pvm: d, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(d, '17:30'), _paattyyMs: ms(d, '19:00'), joukkue: 'Demo U13', joukkueet: ['demo_u13'], poistettu: false }, o || {});
const NYT = ms('2026-10-19', '09:00');

describe('tmKertyma — ohjattu', () => {
  it('paikalla/myöhässä = läsnä; poissa-syyt erikseen (sairas/estynyt/muu), ei luvaton-luokkaa', () => {
    const t = [ev('a', '2026-10-13'), ev('b', '2026-10-14'), ev('c', '2026-10-15'), ev('d', '2026-10-16'), ev('e', '2026-10-17')];
    const la = { a: { tila: 'paikalla' }, b: { tila: 'myohassa' }, c: { tila: 'poissa', syy: 'sairas' }, d: { tila: 'poissa', saatavuus: 'estynyt' }, e: { tila: 'poissa' } };
    const k = H.tmKertyma({ tapahtumat: t, lasnaolot: la, kirjaukset: [], nyt: NYT }).vk4.treeni;
    expect([k.paik, k.myoh, k.lasna, k.yht]).toEqual([1, 1, 2, 5]); expect(k.poissa).toMatchObject({ sairas: 1, estynyt: 1, muu: 1, yht: 3 });
    expect(JSON.stringify(k)).not.toMatch(/luvaton/i);
  });
  it('vahvistamaton päättynyt = "ei kirjattu" (EI poissa, ei nimittäjässä); tuleva ei lasketa', () => {
    const t = [ev('a', '2026-10-13'), ev('b', '2026-10-14'), ev('tuleva', '2026-10-25')];
    const k = H.tmKertyma({ tapahtumat: t, lasnaolot: { a: { tila: 'paikalla' } }, kirjaukset: [], nyt: NYT }).vk4.treeni;
    expect(k.ei_kirjattu).toBe(1); expect(k.poissa.yht).toBe(0); expect(k.yht).toBe(1);
  });
  it('aamutreeni erillään joukkueharjoituksesta; ryhmätreeni ja ottelu omissaan; peruttu/poistettu pois', () => {
    const t = [ev('t', '2026-10-13'), ev('a', '2026-10-14', { alalaji: 'aamutreeni' }), ev('r', '2026-10-15', { kohde: { tyyppi: 'ryhma' } }), ev('o', '2026-10-17', { tyyppi: 'ottelu' }), ev('x', '2026-10-16', { tila: 'peruttu' }), ev('y', '2026-10-16', { poistettu: true })];
    const la = { t: { tila: 'paikalla' }, a: { tila: 'paikalla' }, r: { tila: 'myohassa' }, o: { tila: 'paikalla' }, x: { tila: 'paikalla' }, y: { tila: 'paikalla' } };
    const k = H.tmKertyma({ tapahtumat: t, lasnaolot: la, kirjaukset: [], nyt: NYT }).vk4;
    expect([k.treeni.lasna, k.aamu.lasna, k.ryhma.lasna, k.ottelu.lasna]).toEqual([1, 1, 1, 1]);
  });
  it('rosteri: pelaajaa ei lasketa tapahtumaan, joka ei kuulu hänelle (poimitut-aamutreeni)', () => {
    const am = ev('a', '2026-10-14', { alalaji: 'aamutreeni', kohde: { tyyppi: 'pelaajat' }, pelaajat_id: ['p2'], joukkue: null, joukkueet: [] });
    const r = (pid) => H.tmKertyma({ tapahtumat: [am], lasnaolot: {}, kirjaukset: [], nyt: NYT, pelaaja: { id: pid, joukkueet: ['demo_u13'] }, joukkueDocs: [{ id: 'demo_u13', nimi: 'Demo U13' }] }).vk4.aamu.yht + H.tmKertyma({ tapahtumat: [am], lasnaolot: {}, kirjaukset: [], nyt: NYT, pelaaja: { id: pid, joukkueet: ['demo_u13'] }, joukkueDocs: [] }).vk4.aamu.ei_kirjattu;
    expect(r('p2')).toBe(1); expect(r('p1')).toBe(0);
  });
});

describe('tmKertyma — omatoiminen ja rajat', () => {
  it('kirjaukset: tehty≠false, ei lepo; minuutit vain jos on', () => {
    const k = H.tmKertyma({ tapahtumat: [], kirjaukset: [{ pvm: '2026-10-14', tyyppi: 'T', tehty: true, kesto_min: 20 }, { pvm: '2026-10-15', tyyppi: 'jalkapallo', tehty: true }, { pvm: '2026-10-16', tyyppi: 'lepo' }, { pvm: '2026-10-17', tyyppi: 'T', tehty: false }], nyt: NYT }).vk4.omatoimi;
    expect(k).toEqual({ n: 2, min: 20 });
  });
  it('4 vk -ikkuna: viikko 4 vk sitten mukana, 5 vk sitten ei; kausi alkaa 1.8. (aiempi kausi ei kerry)', () => {
    const t = [ev('uusi', '2026-09-30'), ev('vanha', '2026-09-20'), ev('edkausi', '2026-06-10')];
    const la = { uusi: { tila: 'paikalla' }, vanha: { tila: 'paikalla' }, edkausi: { tila: 'paikalla' } };
    const k = H.tmKertyma({ tapahtumat: t, lasnaolot: la, kirjaukset: [], nyt: NYT });
    expect(k.vk4.treeni.lasna).toBe(1); expect(k.kausi.treeni.lasna).toBe(2); expect(k.kausiAvain).toBe('2026-27');
  });
  it('viikot: 12 viikkoa vanhimmasta uusimpaan, ohjattu+omatoimi per viikko; srpe-paikka varattu', () => {
    const k = H.tmKertyma({ tapahtumat: [ev('a', '2026-10-13')], lasnaolot: { a: { tila: 'paikalla' } }, kirjaukset: [{ pvm: '2026-10-14', tyyppi: 'T', tehty: true }], nyt: NYT });
    expect(k.viikot).toHaveLength(12); expect(k.viikot[11]).toMatchObject({ vk: '2026-W43' }); expect(k.viikot[10]).toMatchObject({ vk: '2026-W42', ohjattu: 1, omatoimi: 1, srpe: null });
  });
  it('kausi/viikko-avaimet ja viikon rajat (ISO)', () => {
    expect(H.tmKertymaKausiAvain('2026-07-31')).toBe('2025-26'); expect(H.tmKertymaKausiAvain('2026-08-01')).toBe('2026-27');
    expect(H.tmKertymaVkRajat('2026-10-14')).toEqual({ avain: '2026-W42', ma: '2026-10-12', su: '2026-10-18' }); expect(H.tmKertymaVkAvain('2027-01-03')).toBe('2026-W53');
  });
  it('korit tallennettuna → sama tulos kuin suoralaskenta (palvelimen kooste = lib)', () => {
    const a = { tapahtumat: [ev('a', '2026-10-13'), ev('b', '2026-10-15')], lasnaolot: { a: { tila: 'paikalla' }, b: { tila: 'poissa', syy: 'flunssa' } }, kirjaukset: [{ pvm: '2026-10-14', tyyppi: 'S', tehty: true, kesto_min: 15 }], nyt: NYT };
    expect(H.tmKertymaKoreista(JSON.parse(JSON.stringify(H.tmKertymaKorit(a))), NYT)).toEqual(H.tmKertyma(a));
  });
});

describe('Pulssi ja näkymät', () => {
  it('tmKertymaJoukkue: joukkueen % ja alle 70 % -indeksit', () => {
    const v = (l, p) => ({ treeni: { paik: l, myoh: 0, poissa: { yht: p } }, aamu: { paik: 0, myoh: 0, poissa: { yht: 0 } }, ryhma: { paik: 0, myoh: 0, poissa: { yht: 0 } } });
    expect(H.tmKertymaJoukkue([v(8, 2), v(5, 5), null, v(0, 0)])).toEqual({ pelaajia: 2, ohjattuPros: 65, alle70: [1] });
  });
  it('Master-lohko: "14/16 · 5/6 · 3 · 9" -rivit + pino-palkki; kevyt kortti lapselle; ei vertailua/hex/emoji', () => {
    const t = [], la = {}; for (let i = 0; i < 6; i++) { t.push(ev('t' + i, '2026-10-' + String(5 + i).padStart(2, '0'))); la['t' + i] = { tila: i < 5 ? 'paikalla' : 'poissa', syy: 'sairas' }; }
    const k = H.tmKertyma({ tapahtumat: t, lasnaolot: la, kirjaukset: [{ pvm: '2026-10-14', tyyppi: 'T', tehty: true }], nyt: NYT });
    const m = N.tmKertymaMasterHTML(k, {}), v = N.tmKertymaKevytHTML(k, { vanhempi: true }), p = N.tmKertymaKevytHTML(k, {});
    expect(m).toContain('Joukkueharjoitukset</span><b>5/6</b>'); expect(m).toContain('Omatoimiset</span><b>1</b>'); expect(m).toContain('hk-palkit'); expect(m).toContain('Poissa ilmoitettu: 1 sairas');
    expect(v).toContain('Tällä kaudella lapsella: 5 treeniä · 1 omatoimista'); expect(p).toContain('Tällä kaudella: 5 treeniä');
    [m, v, p, N.tmKertymaCSS()].forEach((h) => { expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(h).not.toMatch(/keskiarvo|muihin|vertaa|luvaton|%\s*alle/i); });
  });
  it('Pulssi-rivi: nimet vain valmentajalle', () => {
    const j = { pelaajia: 3, ohjattuPros: 78, alle70: [1] };
    expect(N.tmKertymaPulssiHTML(j, { valmentaja: true, nimet: () => 'Aatu A.' })).toContain('Aatu A.'); expect(N.tmKertymaPulssiHTML(j, {})).not.toContain('Aatu'); expect(N.tmKertymaPulssiHTML(j, {})).toContain('78 %');
  });
});
