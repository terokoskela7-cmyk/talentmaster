/* K35-12 (live-tarkistus KPV P13 12.10.): kertymän "kirjaamatta"-tila · Kodin Seuraava "n pelaajaa · m vahvistanut · k estynyt" · joukkue-kenttä id:nä (lomake, skripti, yksi apufunktio). */
const fs = require('fs'), path = require('path');
const HK = require('../lib/tm_harjoituskertyma.js'), HKN = require('../lib/tm_harjoituskertyma_nakyma.js'), M = require('../lib/tm_valmentaja_koti.js'), N = require('../lib/tm_valmentaja_koti_nakyma.js'), K = require('../lib/tm_kalenteri_kyselyt.js'), R = require('../lib/tm_ryhmat.js');
const S = require('../scripts/korjaa_kalenterin_joukkue.js');
const MASTER = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00'), NYT = ms('2026-10-12', '20:00'), t = (x) => x;
const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: 'Treeni', pvm: d, alkaa: '17:00', _alkaaMs: ms(d, '17:00'), _paattyyMs: ms(d, '18:30'), joukkue: 'KPV U13', joukkueet: ['kpv_u13'] }, o || {});
const DOCS = [{ id: 'kpv_u13', nimi: 'KPV U13' }, { id: 'kpv_u14', nimi: 'KPV U14' }];
const P = { id: 'p1', joukkue: 'KPV U13', joukkueet: ['kpv_u13'] };

describe('#1 Harjoittelu-lohko: kooste jossa tapahtumia mutta kaikki ei_kirjattu', () => {
  const tapahtumat = ['06', '07', '08', '09', '10', '11'].map((p, i) => ev('e' + i, '2026-10-' + p)), kori = HK.tmViikkoKori({ tapahtumat, pelaaja: P, joukkueDocs: DOCS, nyt: NYT });
  const k = HK.tmKertymaKoreista({ [HK.tmKertymaVkAvain('2026-10-12')]: kori }, NYT);
  it('lähtötilanne: 6 tapahtumaa, kaikki ei_kirjattu (yht = 0)', () => { expect(kori.treeni.ei_kirjattu).toBe(6); expect(k.kausi.treeni.yht).toBe(0); });
  it('→ EI tyhjää tilaa: "6 harjoitusta · läsnäoloja ei kirjattu" + linkki "Kirjaa läsnäolot"', () => {
    const h = HKN.tmKertymaMasterHTML(k, { t, kirjaaLinkki: "calEventClick('e5')" });
    expect(h).toContain('6 harjoitusta · läsnäoloja ei kirjattu'); expect(h).toContain('Kirjaa läsnäolot'); expect(h).toContain("onclick=\"calEventClick('e5')\"");
    expect(h).not.toContain('Kertymä alkaa näkyä'); expect(h).not.toContain('hk-sarakkeet');
  });
  it('ilman linkkiä (ei kirjaamatonta tapahtumaa tiedossa) → teksti ilman nappia; yksikkömuoto "1 harjoitus"; ottelut erikseen', () => {
    const k1 = HK.tmKertymaKoreista({ [HK.tmKertymaVkAvain('2026-10-12')]: HK.tmViikkoKori({ tapahtumat: [ev('a', '2026-10-06'), ev('o', '2026-10-10', { tyyppi: 'ottelu' })], pelaaja: P, joukkueDocs: DOCS, nyt: NYT }) }, NYT);
    const h = HKN.tmKertymaMasterHTML(k1, { t }); expect(h).toContain('1 harjoitus · 1 ottelu · läsnäoloja ei kirjattu'); expect(h).not.toContain('Kirjaa läsnäolot');
  });
  it('tyhjä tila VAIN kun kaikki korit 0 (ei tapahtumia eikä omatoimisia); omatoimisia → normaali näkymä', () => {
    expect(HKN.tmKertymaMasterHTML(HK.tmKertymaKoreista({}, NYT), { t })).toContain('Kertymä alkaa näkyä');
    const om = HK.tmKertymaKoreista({ [HK.tmKertymaVkAvain('2026-10-12')]: HK.tmViikkoKori({ kirjaukset: [{ tehty: true, tyyppi: 'T', kesto_min: 30 }], nyt: NYT }) }, NYT); expect(HKN.tmKertymaMasterHTML(om, { t })).toContain('hk-sarakkeet');
  });
  it('osittain kirjattu → normaali sarakenäkymä (+ "n ei kirjattu" -rivi) kuten ennen', () => {
    const osa = HK.tmViikkoKori({ tapahtumat: tapahtumat.slice(0, 3), lasnaolot: { e0: { tila: 'paikalla' } }, pelaaja: P, joukkueDocs: DOCS, nyt: NYT }), h = HKN.tmKertymaMasterHTML(HK.tmKertymaKoreista({ [HK.tmKertymaVkAvain('2026-10-12')]: osa }, NYT), { t });
    expect(h).toContain('hk-sarakkeet'); expect(h).toContain('2 ei kirjattu');
  });
  it('tmKertymaKirjaamaton: viimeisin PÄÄTTYNYT ilman läsnäoloa; kirjattu, tuleva, peruttu, toisen joukkueen ja ei-ohjattu ohitetaan', () => {
    const l = [ev('vanha', '2026-10-06'), ev('uusin', '2026-10-11'), ev('kirjattu', '2026-10-12', { lasnaolo_kooste: { paikalla: 10 } }), ev('tuleva', '2026-10-14'), ev('peruttu', '2026-10-12', { tila: 'peruttu' }), ev('toinen', '2026-10-12', { joukkue: 'KPV U14', joukkueet: ['kpv_u14'] }), ev('palaveri', '2026-10-12', { tyyppi: 'jaksopalaveri' })];
    expect(HK.tmKertymaKirjaamaton(l, P, DOCS, NYT)).toBe('uusin'); expect(HK.tmKertymaKirjaamaton([], P, DOCS, NYT)).toBeNull();
  });
  it('Master: linkki rakennetaan kirjaamattomasta tapahtumasta (calEventClick)', () => { expect(MASTER).toContain('tmKertymaKirjaamaton(_kalenteriTapahtumat'); expect(fs.readFileSync(path.join(__dirname, '..', 'lib/tm_naytto_lohkot.js'), 'utf8')).toContain('kirjaaLinkki');   // K2: lataus siirretty libiin });
});

describe('#2 Kodin Seuraava: "16 pelaajaa · n vahvistanut · m estynyt"', () => {
  const PEL = Array.from({ length: 16 }, (_, i) => ({ id: 'p' + i, nimi: 'Pelaaja ' + i })), J = { id: 'kpv_u13', nimi: 'KPV U13' };
  const mal = (sa) => M.tmKotiMalli({ nyt: ms('2026-10-12', '12:00'), joukkue: J, pelaajat: PEL, tapahtumat: [ev('to', '2026-10-15')], saatavuus: sa });
  it('vahvistanut = saatavuus "tulossa"; ei vastanneita ei esitetä tulijoina', () => {
    const h = N.tmKotiHTML(mal({ to: { tulossa: ['p0'], estynyt: [] } }), { t, on: () => 'x()' }); expect(h).toContain('16 pelaajaa · 1 vahvistanut · 0 estynyt'); expect(h).not.toMatch(/\d+ tulossa/);
    expect(N.tmKotiHTML(mal({ to: { tulossa: [], estynyt: [] } }), { t, on: () => 'x()' })).toContain('16 pelaajaa · 0 vahvistanut · 0 estynyt');
  });
  it('estyneet nimillä; saatavuus ei vielä ladattu → ei lukuriviä (ei harhaanjohtavaa)', () => {
    expect(N.tmKotiHTML(mal({ to: { tulossa: ['p0', 'p1'], estynyt: [{ nimi: 'Pelaaja Kolme', syy: 'koe' }] } }), { t, on: () => 'x()' })).toContain('2 vahvistanut · 1 estynyt: Pelaaja K. (koe)');
    expect(N.tmKotiHTML(mal(null), { t, on: () => 'x()' })).not.toContain('vahvistanut');
  });
});

describe('#3c yksi joukkueapufunktio (id TAI nimi) — Koti, Seuraava, Kalenteri', () => {
  const J = { id: 'kpv_u13', nimi: 'KPV U13' };
  it('tmTapahtumaJoukkueelle: joukkue/joukkue_nimi/joukkueet[] id tai nimi, isot kirjaimet ja välilyönnit; väärä joukkue ei', () => {
    [{ joukkue: 'KPV U13' }, { joukkue: 'kpv_u13' }, { joukkueet: ['kpv_u13'] }, { joukkueet: ['KPV U13'] }, { joukkue_nimi: 'KPV U13' }, { joukkue: ' kpv u13 ' }].forEach((e) => expect(K.tmTapahtumaJoukkueelle(e, J), JSON.stringify(e)).toBe(true));
    [{ joukkue: 'KPV U14' }, { joukkueet: ['kpv_u14'] }, {}].forEach((e) => expect(K.tmTapahtumaJoukkueelle(e, J), JSON.stringify(e)).toBe(false));
    expect(K.tmTapahtumaJoukkueelle({ joukkue: 'KPV U13' }, 'KPV U13')).toBe(true); expect(K.tmTapahtumaJoukkueelle({ joukkue: 'x' }, null)).toBe(false);
  });
  it('Koti + Seuraava + viikko näkevät sekaisin tallennetut: nimi, id ja joukkueet[]-nimi', () => {
    const tap = [ev('a', '2026-10-13', { joukkue: 'KPV U13', joukkueet: [] }), ev('b', '2026-10-14', { joukkue: 'kpv_u13', joukkueet: [] }), ev('c', '2026-10-15', { joukkue: '', joukkueet: ['KPV U13'] }), ev('x', '2026-10-13', { joukkue: 'KPV U14', joukkueet: ['kpv_u14'] })];
    const m = M.tmKotiMalli({ nyt: ms('2026-10-12', '12:00'), joukkue: J, pelaajat: [], tapahtumat: tap });
    expect([].concat(...m.viikko.paivat.map((p) => p.tapahtumat.map((e) => e.id))).sort()).toEqual(['a', 'b', 'c']); expect(m.seuraava.id).toBe('a');
    expect(K.tmSeuraavaTapahtuma(tap, { joukkue: J, nyt: ms('2026-10-12', '12:00') }).id).toBe('a'); expect(K.tmSeuraavaTapahtuma(tap, { joukkue: 'KPV U13', nyt: ms('2026-10-12', '12:00') }).id).toBe('a');
  });
  it('kertymä: sekä id- että nimi-tallennetut tapahtumat osuvat pelaajalle (sama tmKuuluuPelaajalle)', () => {
    const k = HK.tmViikkoKori({ tapahtumat: [ev('a', '2026-10-06', { joukkue: 'KPV U13', joukkueet: [] }), ev('b', '2026-10-07', { joukkue: 'kpv_u13', joukkueet: [] }), ev('c', '2026-10-08', { joukkue: 'KPV U14', joukkueet: ['kpv_u14'] })], pelaaja: P, joukkueDocs: DOCS, nyt: NYT });
    expect(k.treeni.ei_kirjattu).toBe(2);
  });
  it('Master-suodattimet käyttävät samaa apufunktiota (ei omaa nimivertailua)', () => { expect(MASTER).not.toContain('t.joukkue === _joukkue || t.joukkue_nimi === _joukkue'); expect((MASTER.match(/tmTapahtumaJoukkueelle\(t, \{ id: _calJoukkueId\(\), nimi: _joukkue \}\)/g) || []).length).toBe(3); });
});

describe('#3a Uusi tapahtuma -lomake: harjoitus/ottelu tallentaa AINA joukkue = doc-id, ilman joukkuetta estetty', () => {
  const nimet = { kpv_u13: 'KPV U13' };
  it('joukkue-id annettu → joukkue = id, joukkue_nimi = nimi, joukkueet = [id]', () => {
    ['harjoitus', 'ottelu'].forEach((ty) => { const r = R.tmKenelleDoc({ tapa: 'joukkue', joukkue: 'kpv_u13', joukkueNimet: nimet }, { tyyppi: ty, aamu: false }); expect(r.ok).toBe(true); expect(r.osa).toMatchObject({ joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'] }); });
  });
  it('ilman joukkuetta: harjoitus ja ottelu estetty (syy joukkue + selkeä teksti)', () => {
    ['harjoitus', 'ottelu'].forEach((ty) => { const r = R.tmKenelleDoc({ tapa: 'joukkue', joukkue: '', joukkueNimet: {} }, { tyyppi: ty, aamu: false }); expect(r.ok).toBe(false); expect(r.syy).toBe('joukkue'); });
    expect(R.tmKenelleVirhe('joukkue', { t: (x) => x })).toMatch(/Valitse joukkue/);
  });
  it('poikkeukset: aamutreeni, ryhmä, poimitut pelaajat, henkilökunta ja muut tyypit ilman joukkuetta sallittu', () => {
    expect(R.tmKenelleDoc({ tapa: 'joukkue', joukkue: '' }, { tyyppi: 'harjoitus', aamu: true, oletusPelaajat: ['p1'] }).ok).toBe(true);
    expect(R.tmKenelleDoc({ tapa: 'ryhma', ryhma_id: 'g1' }, { tyyppi: 'harjoitus', ryhmat: [{ id: 'g1', nimi: 'MV' }], ryhmaIdt: ['p1'] }).ok).toBe(true);
    expect(R.tmKenelleDoc({ tapa: 'pelaajat', pelaajat_id: ['p1'] }, { tyyppi: 'harjoitus' }).ok).toBe(true); expect(R.tmKenelleDoc({ tapa: 'henkilokunta' }, { tyyppi: 'harjoitus' }).ok).toBe(true);
    expect(R.tmKenelleDoc({ tapa: 'joukkue', joukkue: '' }, { tyyppi: 'kokous' }).ok).toBe(true);
  });
  it('Master välittää joukkueen doc-id:n (ei nimeä) ja tyypin lomakkeelle', () => {
    expect(MASTER).toContain("(_jid || '')"); expect(MASTER).toContain('tyyppi: valittuTyyppi, aamu: !!_aamu'); expect(MASTER).not.toMatch(/_jn\[_joukkue\] = _joukkue; if \(_kv\.tapa/);
  });
});

describe('#3b scripts/korjaa_kalenterin_joukkue.js: nimi → id, joukkueettomia EI käsitellä', () => {
  it('laske: nimi→id, joukkue_nimi kanoniseksi, joukkueet[] id:ksi; jo oikea ennallaan; tunnistamaton raportoidaan; poistettu ohitetaan', () => {
    const r = S.laske([ev('a', '2026-10-06', { joukkue: 'KPV U13', joukkueet: [] }), ev('b', '2026-10-06', { joukkue: 'kpv_u13', joukkueet: ['kpv_u13'], joukkue_nimi: 'KPV U13' }), ev('d', '2026-10-06', { joukkue: '  kpv  u14 ', joukkueet: ['KPV U14'], joukkue_nimi: 'x' }), ev('e', '2026-10-06', { joukkue: 'Muu joukkue', joukkueet: [] }), ev('f', '2026-10-06', { joukkue: 'KPV U13', poistettu: true })], DOCS);
    expect(r.muutokset.map((m) => [m.id, m.data])).toEqual([['a', { joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'] }], ['d', { joukkue: 'kpv_u14', joukkue_nimi: 'KPV U14', joukkueet: ['kpv_u14'] }]]);
    expect(r.ennallaan).toBe(1); expect(r.tunnistamattomat).toEqual([{ id: 'e', arvo: 'Muu joukkue' }]);
  });
  it('joukkueettomat jäävät kokonaan käsittelemättä (ei muutosta, ei listausta, ei arvausta)', () => {
    const r = S.laske([ev('t1', '2026-10-06', { joukkue: '', joukkueet: [] }), ev('t2', '2026-10-07', { joukkue: null, joukkueet: undefined })], DOCS);
    expect(r.muutokset).toEqual([]); expect(r.tunnistamattomat).toEqual([]); expect(r.joukkueettomia).toBe(2);
  });
  it('aja: kuiva-ajo oletus EI kirjoita; --kirjoita kirjoittaa vain muutokset (update-erä); lueArgit vaatii --seura', async () => {
    const kirj = [], kok = (rows) => ({ get: async () => { const ds = rows.map((x) => ({ id: x.id, data: () => x })); return { forEach: (f) => ds.forEach(f) }; } });
    const db = { collection: () => ({ doc: () => ({ collection: (c) => (c === 'joukkueet' ? kok(DOCS) : Object.assign(kok([ev('a', '2026-10-06', { joukkue: 'KPV U13', joukkueet: [] }), ev('t', '2026-10-06', { joukkue: '', joukkueet: [] })]), { doc: (id) => ({ id }) }))}) }), batch: () => ({ update: (ref, d) => kirj.push([ref.id, d]), commit: async () => {} }) };
    const lokit = []; await S.aja({ db, seura: 'kpv', kirjoita: false, loki: (x) => lokit.push(x) }); expect(kirj).toEqual([]); expect(lokit.join('\n')).toMatch(/KUIVA-AJO[\s\S]*1 muutosta[\s\S]*1 joukkueetonta ohitettu/);
    await S.aja({ db, seura: 'kpv', kirjoita: true, loki: () => {} }); expect(kirj).toEqual([['a', { joukkue: 'kpv_u13', joukkue_nimi: 'KPV U13', joukkueet: ['kpv_u13'] }]]);
    expect(S.lueArgit(['--seura', 'kpv'])).toEqual({ seura: 'kpv', kirjoita: false }); expect(() => S.lueArgit([])).toThrow(/Käyttö/); expect(() => S.lueArgit(['--seura', '--kirjoita'])).toThrow();
  });
});

describe('#4 Kalenterin poisto ilman oikeutta: syy näkyviin, Poista piilossa etukäteen', () => {
  const syy = 'Vain tapahtuman luoja tai seuran johto voi poistaa tämän tapahtuman.';
  it('tmPoistoEste: luoja ✓, johto ✓, SA ✓; toisen luoma tai luojaton valmentajalle → syy', () => {
    expect(K.tmPoistoEste({ luoja_uid: 'u1' }, { uid: 'u1' })).toBeNull(); expect(K.tmPoistoEste({ luoja_uid: 'u2' }, { uid: 'u1', johto: true })).toBeNull(); expect(K.tmPoistoEste({ luoja_uid: 'u2' }, { uid: 'u1', sa: true })).toBeNull();
    expect(K.tmPoistoEste({ luoja_uid: 'u2' }, { uid: 'u1' })).toEqual({ syy }); expect(K.tmPoistoEste({}, { uid: 'u1' })).toEqual({ syy }); expect(K.tmPoistoEste({ luoja_uid: 'u1' }, { uid: '' })).toEqual({ syy }); expect(K.tmPoistoEste({ luoja_uid: 'u1' }, null)).toEqual({ syy });
  });
  it('Master: Poista-nappi vain kun oikeus (_calSaaMuokataTapahtuma); muuten syy-teksti; permission-denied → sama syy', () => {
    expect(MASTER).toMatch(/if \(_calSaaMuokataTapahtuma\(t\)\) \{\n    var poistaBtn[\s\S]*?\} else if \(!_demo && _seuraId\) \{ var _pe = window\.TM_KALENTERI_KYSELYT\.tmPoistoEste\(t, \{ uid: _uid, johto: _calJohtoRooli\(\), sa: _superAdmin \}\)/);
    expect(MASTER).toContain("e.code === 'permission-denied' ? masterT(window.TM_KALENTERI_KYSELYT.POISTO_SYY)");
  });
  it('peilaa Masterin vanhaa ehtoa: tmPoistoEste(null) ⇔ valmentajan omalla/johdolla poisto sallittu', () => {
    const vanha = (t, u, j, sa) => sa || j || (t.luoja_uid && t.luoja_uid === u); [[{ luoja_uid: 'a' }, 'a', false, false], [{ luoja_uid: 'a' }, 'b', false, false], [{ luoja_uid: 'a' }, 'b', true, false], [{}, 'b', false, true]].forEach(([t, u, j, sa]) => expect(K.tmPoistoEste(t, { uid: u, johto: j, sa }) === null).toBe(!!vanha(t, u, j, sa)));
  });
});
