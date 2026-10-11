/* K35-2 · Masterin kalenterin pikakorjaukset (docs/CODE_BRIEF_35_KALENTERI.md; mockup 35 §2–§3; D169, D147, D171, D181, D185, D186). */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { lataaSivu } from './helpers/sivu_ajuri.mjs';
const require = createRequire(import.meta.url);
const TY = require('../lib/tm_kalenteri_tyypit.js'), MA = require('../lib/tm_kalenteri_malli.js');
const MASTER = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{1F000}-\u{1F2FF}]/u;
const otsake = (() => { const a = MASTER.indexOf('id="calModeBar"'), b = MASTER.indexOf('class="cal-wknav"', a); return MASTER.slice(a, b); })();
const nappi = (cls) => [...otsake.matchAll(/<button class="(cal-add-btn[^"]*)"[^>]*>([^<]*)<\/button>/g)].map((m) => ({ cls: m[1], teksti: m[2] }));

describe('1 · otsakkeen napit (D169, D147)', () => {
  it('"Uusi tapahtuma" (täytetty, ainoa) ja "Luo testitapahtuma" (ääriviiva); ei emojeja, ei nuolta', () => {
    const n = nappi(); expect(n.map((x) => x.teksti)).toEqual(['Uusi tapahtuma', 'Luo testitapahtuma']);
    expect(n.filter((x) => !/\bq\b/.test(x.cls)).length).toBe(1); expect(n[0].cls).toBe('cal-add-btn'); expect(n[1].cls).toBe('cal-add-btn q');
    n.forEach((x) => { expect(x.teksti).not.toMatch(EMOJI); expect(x.teksti).not.toMatch(/→/); });
  });
  it('ei isoja kirjaimia eikä letter-spacingiä: .cal-add-btn-luokka ja nappien inline-tyylit; tekstit eivät ole kokonaan isoja', () => {
    const css = (MASTER.match(/\.cal-add-btn \{[^}]*\}/) || [''])[0]; expect(css).not.toMatch(/text-transform|letter-spacing/); expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(otsake).not.toMatch(/letter-spacing|text-transform/); nappi().forEach((x) => expect(x.teksti).not.toBe(x.teksti.toUpperCase()));
    expect(MASTER).not.toMatch(/\.cal-add-btn:hover \{[^}]*#/);
  });
});

describe('2 · yksi tyyppirekisteri (D186, D171)', () => {
  it('Masterin tyyppilista ja värit rekisteristä: ei omaa tyyppilistaa, ei hex-värejä _calEvtTyylissä eikä selitteessä', () => {
    expect(MASTER).not.toMatch(/id:'harjoitus',\s+label:masterT/); expect(MASTER).toContain('tmKalTyypitRoolille('); expect(MASTER).toContain('tmKalSelite(');
    const ev = MASTER.slice(MASTER.indexOf('function _calEvtTyyli('), MASTER.indexOf('/* Selite rekisteristä')); expect(ev).not.toMatch(/#[0-9a-fA-F]{3,6}/); expect(ev).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    ['#2A5DB0', '#C0392B', '#7B68EE', '#7A8B99', '#3DA35D'].forEach((h) => expect(MASTER.slice(MASTER.indexOf('id="calModeBar"'), MASTER.indexOf('id="calModeBar"') + 4000)).not.toContain(h));
  });
  it('värit tokeneista merkin mukaan: harj → teal · ott → ink · test → teal · pal → ink3 katkoviiva · tauko → ink3 · muu → ink2', () => {
    const s = (m) => TY.tmKalMerkkiTyyli(m); expect([s('harj').vari, s('ott').vari, s('test').vari, s('pal').vari, s('tauko').vari, s('muu').vari]).toEqual(['var(--teal)', 'var(--ink)', 'var(--teal)', 'var(--ink3)', 'var(--ink3)', 'var(--ink2)']);
    expect(s('pal').katkoviiva).toBe(true); expect(s('harj').katkoviiva).toBe(false); TY.tmKalTyypit().forEach((t) => expect(s(t.merkki).vari).toMatch(/^var\(--(teal|ink|ink2|ink3)\)$/));
  });
  it('johto näkee kaikki 14 (pikavalinnat ensin); muut kaikki paitsi seuran_tauko (K35-6d: joukkueen_vapaa ja erikoisohjelma kaikille)', () => {
    const johto = TY.tmKalTyypitRoolille(true), muut = TY.tmKalTyypitRoolille(false);
    expect(johto.length).toBe(14); expect(muut.length).toBe(13); expect(muut.map((t) => t.avain)).not.toContain('seuran_tauko'); expect(johto.map((t) => t.avain)).toContain('seuran_tauko');
    expect(johto.slice(0, 5).map((t) => t.avain)).toEqual(TY.tmKalPikavalinnat().map((t) => t.avain)); johto.forEach((t) => { expect(t.nimiAvain).toBe('kal_tyyppi_' + t.avain); expect(t.nimi).toBeTruthy(); });
    expect(MASTER).toMatch(/tmKalTyypitRoolille\(!!_superAdmin \|\| _calJohtoRooli\(\), \{ tauko: false(, kokoPaiva: false)? \}\)/g);
  });
  it('selite rekisteristä: yksi rivi per merkki; tauko-rivi kaikille (joukkueen_vapaa), seuran_tauko vain johdolle', () => {
    expect(TY.tmKalSelite(false).map((x) => x.merkki)).toEqual(['harj', 'ott', 'test', 'pal', 'muu', 'tauko']); expect(TY.tmKalSelite(true).map((x) => x.merkki)).toEqual(['harj', 'ott', 'test', 'pal', 'muu', 'tauko']);
  });
  it('nimi = masterT(nimiAvain), fallback = rekisterin nimi', () => { expect(MASTER).toMatch(/function _calTyyppiNimi\(ty\) \{ var s = masterT\(ty\.nimiAvain\); return \(s && s !== ty\.nimiAvain\) \? s : ty\.nimi; \}/); });
});

describe('3 · tuntiruudukko ei pudota tapahtumia', () => {
  it('tmKalTuntivali: klo 09 ja 21 mukana; oletus 15–20; raja 6–22; rajan ulkopuoliset lähimmälle riville', () => {
    expect(MA.tmKalTuntivali([]).tunnit).toEqual([15, 16, 17, 18, 19, 20]); const v = MA.tmKalTuntivali([{ alkaa: '09:00' }, { alkaa: '21:30' }]); expect(v.alku).toBe(9); expect(v.loppu).toBe(21); expect(v.tunnit).toContain(9); expect(v.tunnit).toContain(21);
    const r = MA.tmKalTuntivali([{ alkaa: '04:00' }, { alkaa: '23:00' }]); expect([r.alku, r.loppu]).toEqual([6, 22]); expect(MA.tmKalTuntiRiville(4, r)).toBe(6); expect(MA.tmKalTuntiRiville(23, r)).toBe(22);
    expect(MA.tmKalTuntivali([{ alkaa: '16:00' }, { alkaa: '19:00' }]).tunnit).toEqual([15, 16, 17, 18, 19, 20]);
  });
  it('renderCal (oikea Master vm:ssä, K35-6a): tapahtumat klo 09 ja 21 näkyvät päiväsarakkeessa aikajärjestyksessä; selite rekisteristä', () => {
    const els = {}, el = (id) => els[id] || (els[id] = { innerHTML: '', textContent: '', style: {}, classList: { toggle() {} } });
    const ctx = lataaSivu('TalentMaster_Master_v16.html', { _demo: false, _joukkue: null, _superAdmin: false, _rooli: 'valmentaja', _testitapahtumat: [], _pelaajatData: [], masterT: (x) => x, _mEsc: (x) => String(x), toast() {},
      _kalenteriTapahtumat: [{ id: 'b', tyyppi: 'ottelu', pvm: '2026-10-07', alkaa: '21:00', paattyy: '22:00', vastustaja: 'HJK' }, { id: 'a', tyyppi: 'harjoitus', pvm: '2026-10-07', alkaa: '09:00', paattyy: '10:00', joukkue_nimi: '' }] });
    ctx.document = { getElementById: (id) => (['calWeek', 'calSelite', 'calWkLabel', 'calWkSub', 'calPlayers', 'calSelfPct'].includes(id) ? el(id) : null), querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }), body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {} };
    ctx.renderCal(); const h = els.calWeek.innerHTML; expect(h).toContain('09:00–10:00'); expect(h).toContain('21:00–22:00'); expect(h).toContain('Harjoitus'); expect(h).toContain('Ottelu · HJK'); expect(h.indexOf('09:00–10:00')).toBeLessThan(h.indexOf('21:00–22:00'));
    expect(h).toContain('--kv:var(--teal)'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(els.calSelite.innerHTML).toContain('Testitapahtuma'); expect(els.calSelite.innerHTML).not.toContain('Seuran tauko'); expect(h).not.toContain('cal-time-lbl');
  });
});

describe('4 · luonti ja muokkaus (D185, D181)', () => {
  it('oletuspaikka = joukkueen viimeisin saman tyypin tapahtuma (alias huomioitu, muut tyypit/joukkueet ei)', () => {
    const e = [{ tyyppi: 'harjoitus', joukkue: 'P13', pvm: '2026-10-01', alkaa: '17:00', paikka: 'Kenttä 1' }, { tyyppi: 'treeni', joukkue_nimi: 'P13', pvm: '2026-10-08', alkaa: '17:00', paikka: ' Kenttä 2 ' }, { tyyppi: 'ottelu', joukkue: 'P13', pvm: '2026-10-09', paikka: 'Stadion' }, { tyyppi: 'harjoitus', joukkue: 'P12', pvm: '2026-10-10', paikka: 'Halli' }];
    expect(MA.tmKalOletusPaikka(e, 'P13', 'harjoitus')).toBe('Kenttä 2'); expect(MA.tmKalOletusPaikka(e, 'P13', 'ottelu')).toBe('Stadion'); expect(MA.tmKalOletusPaikka(e, 'P13', 'testitapahtuma')).toBe(''); expect(MA.tmKalOletusPaikka(e, 'P12', 'harjoitus')).toBe('Halli');
  });
  it('paikka tallentuu luonnissa: kenttä lomakkeella, oletus libistä, dokumentin paikka lomakkeen arvosta (ei kovakoodattua null)', () => {
    expect(MASTER).toContain("id = 'tapahtumaPaikka'"); expect(MASTER).toContain('tmKalOletusPaikka(_kalenteriTapahtumat'); expect(MASTER).toMatch(/paikka: \(paikkaInp\.value \|\| ''\)\.trim\(\)\.slice\(0, 120\) \|\| null,/); expect(MASTER).not.toMatch(/\n\s+paikka: null,\n\s+paikka_id: null,/);
  });
  it('päivän muokkaus: ero ja siirto libistä (sarjassa kaikki saman verran; kuukauden ja kesäajan yli)', () => {
    expect(MA.tmKalPaivaEro('2026-10-09', '2026-10-07')).toBe(2); expect(MA.tmKalPaivaEro('2026-10-05', '2026-10-07')).toBe(-2); expect(MA.tmKalSiirraPaiva('2026-10-30', 3)).toBe('2026-11-02'); expect(MA.tmKalSiirraPaiva('2026-03-27', 2)).toBe('2026-03-29'); expect(MA.tmKalSiirraPaiva('2026-10-25', -1)).toBe('2026-10-24');
    ['2026-10-07', '2026-10-14', '2026-10-21'].forEach((p) => expect(MA.tmKalSiirraPaiva(p, MA.tmKalPaivaEro('2026-10-09', '2026-10-07'))).toBe(MA.tmKalSiirraPaiva(p, 2)));
    expect(MASTER).toContain('KM.tmKalPaivaEro(pvmI.value, t.pvm)'); expect(MASTER).toContain('KM.tmKalSiirraPaiva(d._pvmISO, _siirtoPv)'); expect(MASTER).not.toMatch(/yhteiset\.tyyppi = /); expect(MASTER).toContain('Object.assign(yhteiset, KM.tmKalTyyppiMuutos(');
  });
  it('tuodun tapahtuman lähdekentät lukittuina (tmKalSaaMuokata); manuaalinen vapaa; oikeudet ennallaan (_calSaaMuokataTapahtuma)', () => {
    const tuotu = { lahde: 'myclub' }, oma = { lahde: 'manuaalinen' };
    expect(MA.tmKalLukitut(tuotu)).toEqual({ alkaa: true, paattyy: true, paikka: true, tila: true }); expect(MA.tmKalLukitut(oma)).toEqual({ alkaa: false, paattyy: false, paikka: false, tila: false });
    expect(MASTER).toContain('lk = KM.tmKalLukitut(t)'); expect(MASTER).toContain('function _calSaaMuokataTapahtuma(t) { return !_demo && !!_seuraId && (_superAdmin || _calJohtoRooli() || (_calValmentajaRooli() && t && t.luoja_uid && t.luoja_uid === _uid)); }');
  });
});

describe('5–6 · kauden loppu ja soft-delete', () => {
  it('kauden loppu libistä (tmKalKaudenLoppu); vanha _calKaudenLoppuISO poissa; maaliskuu 30.6.', () => {
    expect(MASTER).not.toContain('_calKaudenLoppuISO'); expect(MASTER).toContain('TM_KALENTERI_MALLI.tmKalKaudenLoppu(new Date())');
    expect(MA.tmKalKaudenLoppu(new Date(2026, 2, 15))).toBe('2026-06-30'); expect(MA.tmKalKaudenLoppu(new Date(2026, 9, 11))).toBe('2027-02-28'); expect(MA.tmKalKaudenLoppu(new Date(2027, 9, 11))).toBe('2028-02-29'); expect(MA.tmKalKaudenLoppu(new Date(2026, 0, 10))).toBe('2026-02-28');
  });
  it('soft-delete: poistettu_pvm serverTimestamp (kuten VP); ei ISO-merkkijonoa; Rules ei rajaa kentän tyyppiä', () => {
    expect(MASTER).toMatch(/poistettu_pvm: firebase\.firestore\.FieldValue\.serverTimestamp\(\)/); expect(MASTER).not.toMatch(/poistettu_pvm: new Date\(\)\.toISOString\(\)/);
    const rules = readFileSync(new URL('../tm_admin/firestore.rules', import.meta.url), 'utf8'), blokki = rules.slice(rules.indexOf('match /kalenteri/{kalenteriId}'), rules.indexOf('match /harjoitusprioriteetti/')); expect(blokki).not.toMatch(/poistettu_pvm/);
  });
  it('malli ladataan Masterissa; kuori ei ylitä kasvukattoa', () => {
    expect(MASTER).toContain('lib/tm_kalenteri_malli.js'); const fx = JSON.parse(readFileSync(new URL('./fixtures/kuoret_kasvukatto.json', import.meta.url), 'utf8')), n = (MASTER.match(/\n/g) || []).length; expect(n).toBeLessThanOrEqual(fx['TalentMaster_Master_v16.html'].katto);
  });
});

describe('7 · korjaukset (katselmointi 11.10.)', () => {
  const M = (ev, uusi, johto = true) => MA.tmKalTyyppiMuutos(ev, uusi, johto);
  it('nimen muutos ei kirjoita tyyppiä: mentorointi, kokous, tuntematon "leiri" säilyvät raakoina', () => {
    expect(M({ tyyppi: 'mentorointi' }, 'mentorointitapaaminen')).toEqual({}); expect(M({ tyyppi: 'kokous' }, TY.tmKalTyyppiAvain('kokous'))).toEqual({}); expect(M({ tyyppi: 'leiri' }, TY.tmKalTyyppiAvain('leiri'))).toEqual({});
  });
  it('tyypin vaihto: harjoitus→valmentajapalaveri nakyvyys henkilokunta; palaveri→harjoitus kaikki; ryhmä/poimitut-kohde ei muutu', () => {
    expect(M({ tyyppi: 'harjoitus' }, 'valmentajapalaveri')).toEqual({ tyyppi: 'valmentajapalaveri', nakyvyys: 'henkilokunta' }); expect(M({ tyyppi: 'valmentajapalaveri' }, 'harjoitus')).toEqual({ tyyppi: 'harjoitus', nakyvyys: 'kaikki' });
    expect(M({ tyyppi: 'harjoitus', kohde: { tyyppi: 'ryhma' } }, 'valmentajapalaveri')).toEqual({ tyyppi: 'valmentajapalaveri' }); expect(M({ tyyppi: 'harjoitus', kohde: { tyyppi: 'pelaajat' } }, 'valmentajapalaveri')).toEqual({ tyyppi: 'valmentajapalaveri' });
    expect(M({ tyyppi: 'harjoitus' }, 'seuran_tauko')).toEqual({}); expect(M({ tyyppi: 'harjoitus' }, 'tuntematon_x')).toEqual({});
  });
  it('seuran_taukoa ei Masterin luontilistassa millään roolilla; selitteessä johdolle saa olla', () => {
    [true, false].forEach((j) => expect(TY.tmKalTyypitRoolille(j, { tauko: false }).map((t) => t.avain)).not.toContain('seuran_tauko')); expect(TY.tmKalTyypitRoolille(true).map((t) => t.avain)).toContain('seuran_tauko'); expect(TY.tmKalSelite(true).map((x) => x.merkki)).toContain('tauko');
    expect(MASTER).toContain("disabled = true; }   // tyyppi ei ole roolin listalla");
  });
  it('koko päivän tapahtumat ja tauot "Koko pvm" -riville; tuntiväli ohittaa ne; erottelu kanonisella avaimella', () => {
    const tauko = { tyyppi: 'seuran_tauko', koko_paiva: true, pvm: '2026-10-12', alkaa: '00:00', _alkaaMs: Date.UTC(2026, 9, 11, 21, 0), _paattyyMs: Date.UTC(2026, 9, 18, 20, 59) };
    expect(MA.tmKalKokoPaiva(tauko)).toBe(true); expect(MA.tmKalKokoPaiva({ tyyppi: 'mentorointi' })).toBe(true); expect(MA.tmKalKokoPaiva({ tyyppi: 'harjoitus' })).toBe(false); expect(MA.tmKalKokoPaiva({ tyyppi: 'leiri', koko_paiva: true })).toBe(true);
    expect(MA.tmKalTuntivali([tauko, { alkaa: '17:00' }]).tunnit).toEqual([15, 16, 17, 18, 19, 20]); expect(MA.tmKalTuntivali([{ tyyppi: 'seuran_tauko', alkaa: '00:00' }]).tunnit).toEqual([15, 16, 17, 18, 19, 20]);
    expect(['2026-10-11', '2026-10-12', '2026-10-18', '2026-10-19'].map((p) => MA.tmKalOsuuPaivalle(tauko, p))).toEqual([false, true, true, false]);
    expect(MASTER).not.toContain("t.tyyppi === 'mentorointi'"); expect(readFileSync(new URL('../lib/tm_kalenteri_nakyma.js', import.meta.url), 'utf8')).toContain('tmKalKokoPaiva');
  });
  afterEach(() => { vi.useRealTimers(); });
  it('renderCal: syysloma 12.–18.10. näkyy Koko pvm -rivillä jokaisella päivällä, ei tuntiruudukossa', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-05T12:00:00+03:00'));   // kello lukittu: testi ei riipu ajopäivästä (oli punainen 12.10. alkaen)
    const els = {}, el = (id) => els[id] || (els[id] = { innerHTML: '', textContent: '', style: {}, classList: { toggle() {} } });
    const ctx = lataaSivu('TalentMaster_Master_v16.html', { _demo: false, _joukkue: null, _superAdmin: false, _rooli: 'valmentaja', _testitapahtumat: [], _pelaajatData: [], _calWkOffset: Math.round((Date.UTC(2026, 9, 12) - (Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) - ((new Date().getDay() + 6) % 7) * 86400000)) / (7 * 86400000)),   // viikko 12.–18.10. riippumatta ajopäivästä
       masterT: (x) => x, _mEsc: (x) => String(x), toast() {},
      _kalenteriTapahtumat: [{ id: 'k', tyyppi: 'seuran_tauko', nimi: 'Syysloma', koko_paiva: true, pvm: '2026-10-12', alkaa: '00:00', paattyy: '23:59', _alkaaMs: Date.UTC(2026, 9, 11, 21, 0), _paattyyMs: Date.UTC(2026, 9, 18, 20, 59) }] });
    ctx.document = { getElementById: (id) => (['calWeek', 'calSelite', 'calWkLabel', 'calWkSub', 'calPlayers', 'calSelfPct'].includes(id) ? el(id) : null), querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }), body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {} };
    ctx.renderCal(); const h = els.calWeek.innerHTML; expect(h.split("calEventClick('k')").length - 1).toBe(7); expect(h).not.toContain('cal-time-lbl'); expect(h).not.toMatch(/>\d{1,2}:00</);
  });
  it('koko päivän tapahtuman päivän vaihto ei katoa hiljaa (siirtää alun, säilyttää keston)', () => { expect(MASTER).toContain('var _kokoPv = t.koko_paiva === true'); expect(MASTER).toContain('t._paattyyMs - t._alkaaMs'); });
});
