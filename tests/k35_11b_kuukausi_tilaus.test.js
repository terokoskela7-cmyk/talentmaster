/* K35-11b: kuukausinäkymä (lib) + "Lisää kalenteriini": nappi piiloon SA:lta / toisen seuran käyttäjältä, virheelle selkeä syy. */
const fs = require('fs'), path = require('path');
const KK = require('../lib/tm_kalenteri_kuukausi.js'), U = require('../lib/tm_kalenteri_tilaus_ui.js');
const MASTER = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const ms = (d, h) => Date.parse(d + 'T' + h + ':00+03:00');
const ev = (id, d, o) => Object.assign({ id, tyyppi: 'harjoitus', nimi: 'Treeni', pvm: d, alkaa: '17:30', paattyy: '19:00', _alkaaMs: ms(d, '17:30'), _paattyyMs: ms(d, '19:00'), joukkue: 'Demo U13' }, o || {});
const mal = (tap, vuosi, kk, o) => KK.tmKuukausiMalli(Object.assign({ tapahtumat: tap, vuosi, kk, tanaan: '2026-10-14' }, o || {}));
const C = { t: (x) => x, on: { tapahtuma: (id) => "calEventClick('" + id + "')", paiva: (p) => "_calKkPaiva('" + p + "')" } };

describe('kuukausimalli', () => {
  it('rivimäärä: 4 (helmi 2027 alkaa ma) · 5 (loka 2026) · 6 (elo 2026); maanantai ensin; täyttää edellisen/seuraavan kuun päivillä', () => {
    expect(mal([], 2027, 1).viikot).toHaveLength(4); expect(mal([], 2026, 9).viikot).toHaveLength(5); expect(mal([], 2026, 7).viikot).toHaveLength(6);
    const m = mal([], 2026, 9); expect(m.viikot[0].paivat[0].pvm).toBe('2026-09-28'); expect(m.viikot[0].paivat[0].kuussa).toBe(false); expect(m.viikot[0].paivat[3].pvm).toBe('2026-10-01'); expect(m.viikot[0].paivat[3].kuussa).toBe(true); expect(m.viikot.at(-1).paivat[6].pvm).toBe('2026-11-01');
    m.viikot.forEach((w) => expect(w.paivat).toHaveLength(7));
  });
  it('tapahtumat oikeille päiville samasta mallista kuin viikko; tanaan-merkki; yhteensä vain kuun sisällä', () => {
    const m = mal([ev('a', '2026-10-13'), ev('b', '2026-10-14', { tyyppi: 'ottelu', nimi: 'Ottelu' }), ev('x', '2026-09-30')], 2026, 9), pv = (iso) => m.viikot.flatMap((w) => w.paivat).find((d) => d.pvm === iso);
    expect(pv('2026-10-13').kortit.map((k) => k.id)).toEqual(['a']); expect(pv('2026-10-14').kortit[0]).toMatchObject({ id: 'b', nimi: 'Ottelu', alkaa: '17:30' }); expect(pv('2026-10-14').tanaan).toBe(true); expect(pv('2026-10-13').tanaan).toBe(false);
    expect(pv('2026-09-30').kortit.map((k) => k.id)).toEqual(['x']); expect(m.yhteensa).toBe(2);
  });
  it('päivässä enintään 3 korttia + "+n lisää"; poistetut ja peruttujen ohitus kuten viikossa (poistettu pois)', () => {
    const tap = ['a', 'b', 'c', 'd', 'e'].map((id) => ev(id, '2026-10-13')).concat([ev('p', '2026-10-13', { poistettu: true })]), d = mal(tap, 2026, 9).viikot[2].paivat[1];
    expect(d.pvm).toBe('2026-10-13'); expect(d.kortit).toHaveLength(3); expect(d.lisaa).toBe(2);
  });
  it('koko päivän tapahtuma (tauko) näkyy päivällä ja merkitään; väri tokenina', () => {
    const t = { id: 't1', tyyppi: 'seuran_tauko', nimi: 'Syysloma', koko_paiva: true, pvm: '2026-10-13', alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms('2026-10-13', '00:00'), _paattyyMs: ms('2026-10-13', '23:59'), joukkue: '' }, d = mal([t], 2026, 9).viikot[2].paivat[1];
    expect(d.kortit[0].nimi).toBe('Syysloma'); expect(String(d.kortit[0].vari)).toMatch(/^var\(--/);
  });
  it('tmKuukausiSiirto yli vuodenvaihteen; nimi', () => { expect(KK.tmKuukausiSiirto(2026, 11, 1)).toEqual({ vuosi: 2027, kk: 0 }); expect(KK.tmKuukausiSiirto(2026, 0, -1)).toEqual({ vuosi: 2025, kk: 11 }); expect(KK.tmKuukausiSiirto(2026, 9, 0)).toEqual({ vuosi: 2026, kk: 9 }); expect(KK.tmKuukausiNimi(9)).toBe('lokakuu'); });
});
describe('kuukausi-HTML', () => {
  it('7 otsikkoa, rivit, tapahtumapainike (id) + päivän klikkaus (pvm); tyhjä kuu → viesti; escapataan; ei hex-värejä/emojeja', () => {
    const h = KK.tmKuukausiHTML(mal([ev('a<b', '2026-10-13', { nimi: '<img src=x>' })], 2026, 9), C);
    expect((h.match(/km-vp/g) || []).length).toBe(7); expect((h.match(/class="km-rivi"/g) || []).length).toBe(5); expect(h).toContain('data-pvm="2026-10-13"'); expect(h).toContain("_calKkPaiva('2026-10-13')"); expect(h).toContain("calEventClick('a&lt;b')"); expect(h).not.toContain('<img'); expect(h).toContain('km-pv t');
    expect(KK.tmKuukausiHTML(mal([], 2026, 9), C)).toContain('Ei tapahtumia tässä kuussa.'); expect(h + KK.tmKuukausiCSS()).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(h).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});

describe('Lisää kalenteriini: este + selkeä virhesyy', () => {
  it('tmTilausEste: SA → sa; ei seuraa → ei_seuraa; claim ≠ seura → toinen_seura; oman seuran käyttäjä → null', () => {
    expect(U.tmTilausEste({ sa: true, seuraId: 'kpv' })).toEqual({ syy: 'sa' }); expect(U.tmTilausEste({ seuraId: '' })).toEqual({ syy: 'ei_seuraa' }); expect(U.tmTilausEste({ seuraId: 'kpv', claimSeuraId: 'sjk' })).toEqual({ syy: 'toinen_seura' });
    expect(U.tmTilausEste({ seuraId: 'kpv', claimSeuraId: 'kpv' })).toBeNull(); expect(U.tmTilausEste({ seuraId: 'kpv', claimSeuraId: null })).toBeNull(); expect(U.tmTilausEste(null)).toEqual({ syy: 'ei_seuraa' });
  });
  it('esto-modaali kertoo syyn (sa, toinen seura, ei seuraa) ja säilyttää sähköposti/suostumus-tekstit', () => {
    const h = (syy) => U.tmTilausModaaliHTML({ vaihe: 'esto', esto: { syy } }, { t: (x) => x });
    expect(h('sa')).toContain('Super Admin ei voi tilata seuran kalenteria'); expect(h('toinen_seura')).toContain('kuuluu toiselle seuralle'); expect(h('ei_seuraa')).toContain('ilman seuraa'); expect(h('sahkoposti')).toContain('ei ole vielä vahvistettu'); expect(h('suostumus')).toContain('suostumus on annettu');
    expect(h('sa')).not.toContain('data-tl="luo"');
  });
  it('virhekoodit → selkeä syy: permission-denied, unauthenticated, verkko, invalid-argument, muu', () => {
    const tp = U.tmTilausVirheTyyppi, hm = (v) => U.tmTilausModaaliHTML({ vaihe: 'virhe', virhe: v }, { t: (x) => x });
    expect(tp({ code: 'functions/permission-denied' })).toBe('oikeus'); expect(tp({ code: 'permission-denied' })).toBe('oikeus'); expect(tp({ code: 'functions/unauthenticated' })).toBe('kirjautuminen'); expect(tp({ code: 'functions/unavailable' })).toBe('verkko'); expect(tp({ code: 'functions/deadline-exceeded' })).toBe('verkko');
    expect(tp({ code: 'functions/invalid-argument' })).toBe('argumentti'); expect(tp({ code: 'functions/internal' })).toBe('yleinen'); expect(tp(new Error('x'))).toBe('yleinen'); expect(tp(null)).toBe('yleinen');
    expect(hm('oikeus')).toContain('ei ole oikeutta'); expect(hm('oikeus')).toContain('ei Super Admin'); expect(hm('kirjautuminen')).toContain('Kirjaudu uudelleen'); expect(hm('verkko')).toContain('verkkoyhteys'); expect(hm('argumentti')).toContain('Lataa sivu uudelleen'); expect(hm('yleinen')).toContain('Yritä hetken kuluttua');
  });
  it('Master: nappi piiloon tmTilausEste:llä (renderCal), claim talteen, modaali saa esto-funktion', () => {
    expect(MASTER).toContain('id="calTilausBtn"'); expect(MASTER).toContain("_tb.style.display = _calTilausEste() ? 'none' : ''"); expect(MASTER).toContain('window._tmClaimSeuraId = claims.seuraId || null;'); expect(MASTER).toContain('tmTilausAsenna({ esto: _calTilausEste,');
  });
});
describe('Master: kuukausinäkymä kytketty', () => {
  it('lib ladataan, "tulossa"-toast vain Kaudelle, calNav liikuttaa kuukautta, päivän klikkaus → viikko; kasvukatto', () => {
    expect(MASTER).toContain('lib/tm_kalenteri_kuukausi.js'); expect(MASTER).toContain("if (m === 'season') toast("); expect(MASTER).not.toMatch(/m==='month'\?masterT\('Kuukausi'\)/); expect(MASTER).toContain("if (_calMode === 'month') { const n = new Date(); _calKk ="); expect(MASTER).toContain('window._calKkPaiva = function (pvm)'); expect(MASTER).toContain('id="calMonth"');
    expect(MASTER.split('\n').length).toBeLessThanOrEqual(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/kuoret_kasvukatto.json'), 'utf8'))['TalentMaster_Master_v16.html'].katto);
  });
});
