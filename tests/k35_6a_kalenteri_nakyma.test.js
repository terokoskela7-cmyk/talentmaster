/* K35-6a · lib/tm_kalenteri_nakyma.js (viikkonäkymä päiväsarakkeina, D182) + Masterin kytkentä: vartijat (ei tuntiruudukkoa, ei omaa päivälogiikkaa). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_kalenteri_nakyma.js'), TY = require('../lib/tm_kalenteri_tyypit.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const MASTER = lue('TalentMaster_Master_v16.html');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u, HEX = /#[0-9a-fA-F]{3,8}\b/;
const MA = '2026-10-19';
const ms = (pvm, hhmm) => Date.parse(pvm + 'T' + hhmm + ':00+03:00');
const t = (id, tyyppi, pvm, a, p, o) => Object.assign({ id, tyyppi, nimi: '', pvm, alkaa: a, paattyy: p, _alkaaMs: ms(pvm, a), _paattyyMs: ms(pvm, p), joukkue_nimi: 'Demo U13', paikka: '' }, o || {});
const C = { t: (x) => x, tanaan: '2026-10-21', tyyppiNimi: (a) => TY.tmKalTyyppi(a).nimi, on: { kortti: (id) => "calEventClick('" + id + "')", ehdotus: (i) => '_calTaytto.muokkaa(' + i + ')', lisaa: (p) => "_avaaUusiTapahtuma('" + p + "','17:00')" } };

describe('päivämäärät suomalaisessa muodossa', () => {
  it('tmKalPvmFi / tmKalPvmLyhyt', () => { expect(N.tmKalPvmFi('2026-10-14')).toBe('14.10.2026'); expect(N.tmKalPvmFi('2026-03-05')).toBe('5.3.2026'); expect(N.tmKalPvmLyhyt('2026-10-19')).toBe('ma 19.10.'); expect(N.tmKalPvmLyhyt('2026-10-25')).toBe('su 25.10.'); expect(N.tmKalPvmFi('')).toBe(''); });
  it('modaalin otsikon ISO-päivä korjattu: _avaaUusiTapahtuma käyttää tmKalPvmFi', () => { expect(MASTER).toContain('TM_KALENTERI_NAKYMA.tmKalPvmFi(pvm)'); expect(MASTER).not.toMatch(/color:var\(--ink3\)">' \+ pvm \+ \(klo/); });
});

describe('tmKalViikkoMalli', () => {
  const tap = [t('a', 'harjoitus', '2026-10-21', '17:30', '19:00', { paikka: 'Kenttä 2' }), t('b', 'ottelu', '2026-10-24', '12:00', '13:30', { vastustaja: 'HJK' }), t('c', 'harjoitus', '2026-10-21', '09:00', '10:00'), t('d', 'harjoitus', '2026-10-27', '17:30', '19:00'),
    { id: 'k', tyyppi: 'seuran_tauko', nimi: 'Syysloma', koko_paiva: true, pvm: '2026-10-17', alkaa: '00:00', paattyy: '23:59', _alkaaMs: Date.parse('2026-10-17T00:00:00+03:00'), _paattyyMs: Date.parse('2026-10-20T23:59:00+03:00') }, t('x', 'harjoitus', '2026-10-22', '17:30', '19:00', { poistettu: true })];
  const m = N.tmKalViikkoMalli({ tapahtumat: tap, maanantai: MA });
  it('7 päivää ma–su, otsikko "ma 19.10.", kortit aikajärjestyksessä, viikon ulkopuoliset ja poistetut pois', () => {
    expect(m.paivat.length).toBe(7); expect(m.paivat.map((d) => d.otsikko)).toEqual(['ma 19.10.', 'ti 20.10.', 'ke 21.10.', 'to 22.10.', 'pe 23.10.', 'la 24.10.', 'su 25.10.']);
    expect(m.paivat[2].kortit.map((k) => k.id)).toEqual(['c', 'a']); expect(m.paivat[5].kortit[0]).toMatchObject({ id: 'b', tyyppi: 'ottelu', vastustaja: 'HJK', alkaa: '12:00', paattyy: '13:30' }); expect(m.paivat.every((d) => !d.kortit.some((k) => k.id === 'd' || k.id === 'x'))).toBe(true);
  });
  it('koko päivän tapahtuma (monipäiväinen tauko) ylimmäksi niille päiville, joille osuu; tauko-merkintä', () => {
    expect(m.paivat[0].kokoPaiva.map((k) => k.id)).toEqual(['k']); expect(m.paivat[1].kokoPaiva.map((k) => k.id)).toEqual(['k']); expect(m.paivat[2].kokoPaiva).toEqual([]); expect(m.paivat[0].tauko).toBe('Syysloma'); expect(m.paivat[0].kortit).toEqual([]);
  });
  it('värit rekisteristä (var(--token)); ehdotuskortit katkoviivalla; päällekkäisyys: lukumäärä + toisen nimi, ei pelaajien nimiä', () => {
    const k = m.paivat[2].kortit[1]; expect(k.vari).toBe(TY.tmKalMerkkiTyyli('harj').vari); expect(k.vari).toMatch(/^var\(--/);
    const e = N.tmKalViikkoMalli({ tapahtumat: [t('r', 'harjoitus', '2026-10-20', '17:30', '19:00', { nimi: 'MV-harjoitus' })], maanantai: MA, ehdotukset: [{ pvm: '2026-10-20', alkaa: '17:30', paattyy: '18:45', paikka: '', tyyppi: 'harjoitus', md: -4, painotus: null }], paallekkaisyydet: [{ pvm: '2026-10-20', pelaajia: 3, toinen_tapahtuma_id: 'r' }] });
    const ek = e.paivat[1].kortit.find((x) => x.ehdotus); expect(ek.katkoviiva).toBe(true); expect(ek.idx).toBe(0); expect(ek.paallekkain).toEqual({ pelaajia: 3, toinen_id: 'r', toinen_nimi: 'MV-harjoitus' }); expect(e.ehdotuksia).toBe(1);
  });
  it('Masterin tapahtumamuoto (alkaa "HH:MM" + _alkaaMs) ja VP/Timestamp-muoto (vain _alkaaMs) toimivat', () => { const x = N.tmKalViikkoMalli({ tapahtumat: [{ id: 'v', tyyppi: 'harjoitus', _alkaaMs: ms('2026-10-22', '18:15'), _paattyyMs: ms('2026-10-22', '19:30') }], maanantai: MA }); expect(x.paivat[3].kortit[0]).toMatchObject({ alkaa: '18:15', paattyy: '19:30' }); });
});

describe('tmKalViikkoHTML', () => {
  const m = N.tmKalViikkoMalli({ tapahtumat: [t('a', 'harjoitus', '2026-10-21', '17:30', '19:00', { paikka: 'Kenttä 2' }), t('b', 'ottelu', '2026-10-24', '12:00', '13:30', { vastustaja: 'HJK' }), t('p', 'harjoitus', '2026-10-20', '17:30', '19:00', { nimi: 'MV-harjoitus' }),
    { id: 'k', tyyppi: 'seuran_tauko', nimi: 'Syysloma', koko_paiva: true, pvm: '2026-10-22', alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms('2026-10-22', '00:00'), _paattyyMs: ms('2026-10-22', '23:59') }],
    maanantai: MA, ehdotukset: [{ pvm: '2026-10-20', alkaa: '17:30', paattyy: '18:45', paikka: '', tyyppi: 'harjoitus', md: -4, painotus: 'toistoja' }], paallekkaisyydet: [{ pvm: '2026-10-20', pelaajia: 3, toinen_tapahtuma_id: 'p' }], ohitetut: [{ pvm: '2026-10-21', syy: 'ottelu' }, { pvm: '2026-10-22', syy: 'palautuminen' }, { pvm: '2026-10-23', syy: 'olemassa' }] });
  const h = N.tmKalViikkoHTML(m, C);
  it('7 päiväsaraketta, päivän otsikko + lisäysnappi, tänään korostettu, koko päivän rivi ylimpänä', () => {
    expect((h.match(/<section class="kv-paiva/g) || []).length).toBe(7); expect(h).toContain('kv-tanaan'); expect((h.match(/class="kv-lisaa"/g) || []).length).toBe(7); expect(h).toContain("onclick=\"_avaaUusiTapahtuma('2026-10-19','17:00')\"");
    const pv = h.split('<section class="kv-paiva'); expect(pv[4].indexOf('kv-koko')).toBeLessThan(pv[4].indexOf('kv-kortit')); expect(pv[4]).toContain('Syysloma');
  });
  it('ehdotus: katkoviiva (.kv-ehdotus) + "Ehdotus"; päällekkäisyys amber-kortissa ilman pelaajien nimiä; ohitetut hiljaisena rivinä (ei "olemassa")', () => {
    expect(h).toContain('kv-ehdotus'); expect(h).toContain('>Ehdotus<'); expect(h).toContain('kv-varoitus'); expect(h).toContain('3 pelaajaa myös: MV-harjoitus'); expect(h).toContain('toistoja');
    expect(h).toContain('Ohitettu: ke ottelu · to palautuminen'); expect(h).not.toContain('olemassa'); expect(h).toContain('_calTaytto.muokkaa(0)'); expect(h).toContain("calEventClick('a')");
  });
  it('ei hex-värejä, ei emojeja, ei inline-hexejä; värit vain var(--token); XSS-turvallinen', () => {
    expect(h).not.toMatch(HEX); expect(h).not.toMatch(EMOJI); expect(h).toContain('--kv:var(--teal)'); expect(N.CSS).not.toMatch(HEX); expect(N.CSS).not.toMatch(EMOJI);
    const x = N.tmKalViikkoHTML(N.tmKalViikkoMalli({ tapahtumat: [t('z', 'muu', '2026-10-21', '10:00', '11:00', { nimi: '<img src=x onerror=alert(1)>' })], maanantai: MA }), C); expect(x).not.toContain('<img'); expect(x).toContain('&lt;img');
  });
  it('mobiili ≤ 640 px: päivät riveinä (CSS-media); desktop 7 saraketta', () => { expect(N.CSS).toMatch(/\.kv-viikko\{display:grid;grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/); expect(N.CSS).toMatch(/@media \(max-width:640px\)\{\.kv-viikko\{grid-template-columns:minmax\(0,1fr\)\}/); });
});

describe('tmKalTaytaKorttiHTML (D184: yksi signaalikortti, yksi täytetty nappi)', () => {
  const on = { tayta: 'a()', monista: 'b()', yksittainen: 'c()', vahvista: 'd()', peru: 'e()', pelimuoto: (pm) => "f('" + pm + "')" }, K = (tila) => N.tmKalTaytaKorttiHTML(tila, Object.assign({}, C, { on }));
  const nappeja = (h) => (h.match(/class="kv-btn"/g) || []).length;
  it('tyhjä viikko: "Täytä viikko" ainoa täytetty nappi + linkit Monista ja Lisää yksittäinen', () => { const h = K({ tyyppi: 'tayta', pohjaNimi: '8v8 · 3–4 harjoitusta' }); expect(nappeja(h)).toBe(1); expect(h).toContain('>Täytä viikko<'); expect(h).toContain('Monista edellinen viikko'); expect(h).toContain('Lisää yksittäinen tapahtuma'); expect(h).toContain('8v8 · 3–4 harjoitusta'); expect(h).toContain('onclick="a()"'); });
  it('esikatselu: "Vahvista N harjoitusta" ainoa täytetty + Peru; monista-lähde tekstissä', () => { const h = K({ tyyppi: 'vahvista', n: 4, lahde: 'pohja' }); expect(nappeja(h)).toBe(1); expect(h).toContain('Vahvista 4 harjoitusta'); expect(h).toContain('>Peru<'); expect(K({ tyyppi: 'vahvista', n: 2, lahde: 'monista' })).toContain('Edellisen viikon harjoitukset'); });
  it('ei pohjaa: johto saa pelimuotopainikkeet (ääriviiva), muut ohjeen pyytää valmennuspäällikköä; ei täytettyä nappia', () => {
    const j = K({ tyyppi: 'pelimuoto', saaAsettaa: true }); expect(nappeja(j)).toBe(0); expect((j.match(/class="kv-btn q"/g) || []).length).toBe(4); expect(j).toContain("f('8v8')");
    const v = K({ tyyppi: 'pelimuoto', saaAsettaa: false }); expect(v).toContain('Pyydä valmennuspäällikköä asettamaan pelimuoto'); expect(v).not.toContain('kv-btn');
    expect(K({ tyyppi: 'ei_pohjaa' })).toContain('Joukkueelle ei löydy viikkopohjaa.');
  });
  it('ei hexejä eikä emojeja', () => { ['tayta', 'vahvista', 'pelimuoto', 'ei_pohjaa'].forEach((x) => { const h = K({ tyyppi: x, n: 3, saaAsettaa: true }); expect(h).not.toMatch(HEX); expect(h).not.toMatch(EMOJI); }); });
});

describe('Master: ei tuntiruudukkoa, ei omaa päivälogiikkaa; uusi näkymä kytketty', () => {
  it('tuntiruudukon koodi ja CSS pois', () => { ['cal-time-lbl', 'cal-cell', 'cal-day-hdr', 'cal-day-num', 'calSlotClick', 'tmKalTuntivali', 'tmKalTuntiRiville', 'dayIdxOf', 'tuntiEvts', 'class="cal-week"'].forEach((x) => expect(MASTER, x).not.toContain(x)); });
  it('viikkonäkymä lib/tm_kalenteri_nakyma.js:stä, Täytä viikko ohjain libistä; Masterissa ei omaa taukologiikkaa, ottelulaskentaa eikä pohjalaskentaa', () => {
    ['lib/tm_kalenteri_nakyma.js', 'lib/tm_kalenteri_taytto.js', 'lib/tm_viikkopohja.js'].forEach((x) => expect(MASTER).toContain(x)); expect(MASTER).toContain('TM_KALENTERI_NAKYMA.CSS'); expect(MASTER).toContain('_calTayttoOhjain().renderoi('); expect(MASTER).toContain('id="calTaytaKortti"');
    ['tmTaytaViikko', 'tmMonistaViikko', 'tmOnTauko', 'md_paallekkain', 'viikonpaiva_oletus'].forEach((x) => expect(MASTER, x).not.toContain(x));
  });
  it('Kuukausi ja Kausi ennallaan (setCalMode toast "tulossa")', () => { expect(MASTER).toContain("masterT(' — tulossa')"); });
});
