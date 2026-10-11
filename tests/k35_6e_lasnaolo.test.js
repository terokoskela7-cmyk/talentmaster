/* K35-6e · läsnäolokooste viikkonäkymän korttiin (regressio #1009), "Merkitse läsnäolot" -muistutus, läsnäolo oletuksena "kaikki paikalla" (esivalinta), modaalien tekstikentät (#1005). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lasnaolo.js'), N = require('../lib/tm_kalenteri_nakyma.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8'), MASTER = lue('TalentMaster_Master_v16.html');
const MA = '2026-10-12', NYT = Date.parse('2026-10-16T12:00:00+03:00');
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const t = (id, tyyppi, pvm, a, p, o) => Object.assign({ id, tyyppi, nimi: '', pvm, alkaa: a, paattyy: p, _alkaaMs: ms(pvm, a), _paattyyMs: ms(pvm, p), joukkue_nimi: 'Demo U13', joukkue: 'Demo U13', paikka: '' }, o || {});
const kortti = (ev, nyt) => N.tmKalViikkoMalli({ tapahtumat: [ev], maanantai: MA, nyt: nyt === undefined ? NYT : nyt }).paivat.flatMap((d) => d.kortit)[0];
const C = (o) => Object.assign({ t: (x) => x, on: { kortti: (id) => "calEventClick('" + id + "')" } }, o);
const html = (ev, c, nyt) => N.tmKalViikkoHTML(N.tmKalViikkoMalli({ tapahtumat: [ev], maanantai: MA, nyt: nyt === undefined ? NYT : nyt }), C(c));

describe('1 · läsnäolokooste kortissa', () => {
  it('kooste näkyy kuten vanha chip: "✓ paikalla / (paikalla+myöhässä+poissa)"', () => {
    const ev = t('a', 'harjoitus', '2026-10-13', '17:30', '19:00', { lasnaolo_kooste: { paikalla: 12, myohassa: 2, poissa: 2, merkitsematta: 0 } });
    expect(kortti(ev).kooste).toEqual({ paikalla: 12, yht: 16 }); expect(html(ev)).toContain('<div class="kv-meta kv-kooste">✓ 12/16</div>'); expect(html(ev, { henkilokunta: true })).not.toContain('Merkitse läsnäolot');
  });
  it('kooste näkyy myös ilman henkilökunta-lippua (ei riipu roolista); tyhjä kooste (0) ei ole kooste', () => {
    const ev = t('a', 'harjoitus', '2026-10-13', '17:30', '19:00', { lasnaolo_kooste: { paikalla: 5, myohassa: 0, poissa: 0 } }); expect(html(ev, { henkilokunta: false })).toContain('✓ 5/5');
    const nolla = t('b', 'harjoitus', '2026-10-13', '17:30', '19:00', { lasnaolo_kooste: { paikalla: 0, myohassa: 0, poissa: 0, merkitsematta: 16 } }); expect(kortti(nolla).kooste).toBeNull(); expect(kortti(nolla).merkitsematta).toBe(true);
  });
});

describe('2 · "Merkitse läsnäolot" -muistutus', () => {
  const ilman = (o, ty) => t('m', ty || 'harjoitus', '2026-10-13', '17:30', '19:00', o);
  it('päättynyt harjoitus tai ottelu ilman koostetta → hiljainen rivi (vain henkilökunnan näkymässä); ei nappia; kortin napautus avaa tapahtuman', () => {
    ['harjoitus', 'ottelu'].forEach((ty) => { expect(kortti(ilman({}, ty)).merkitsematta).toBe(true); const h = html(ilman({}, ty), { henkilokunta: true }); expect(h).toContain('<div class="kv-meta kv-muistutus">Merkitse läsnäolot</div>'); expect(h).not.toMatch(/<button[^>]*>[^<]*läsnäol/i); expect(h).toContain("onclick=\"calEventClick('m')\""); });
    expect(html(ilman({}), { henkilokunta: false })).not.toContain('Merkitse läsnäolot'); expect(html(ilman({}), {})).not.toContain('Merkitse läsnäolot');   // pelaajan/muu näkymä: ei
    expect(N.CSS).not.toMatch(/kv-muistutus\{[^}]*(amber|red)/); expect(N.CSS).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);   // ei amber, ei hex
  });
  it('ryhmätapahtuma (ei joukkuetta) → muistutus; tapahtuma ilman joukkuetta ja ryhmää → ei', () => {
    expect(kortti(ilman({ joukkue: '', joukkue_nimi: '', kohde: { tyyppi: 'ryhma', ryhma_id: 'g1' } })).merkitsematta).toBe(true); expect(kortti(ilman({ joukkue: '', joukkue_nimi: '' })).merkitsematta).toBeFalsy();
  });
  it('tuleva, käynnissä oleva, peruttu, koko päivä (vapaa/tauko/erikoisohjelma), ehdotus ja muut tyypit → ei muistutusta', () => {
    expect(kortti(t('f', 'harjoitus', '2026-10-17', '17:30', '19:00')).merkitsematta).toBeFalsy();   // tuleva
    expect(kortti(t('k', 'harjoitus', '2026-10-16', '11:00', '13:00')).merkitsematta).toBeFalsy();   // käynnissä (loppu > nyt)
    expect(kortti(ilman({ tila: 'peruttu' })).merkitsematta).toBeFalsy(); expect(kortti(ilman({ tila: 'peruutettu' })).merkitsematta).toBeFalsy();
    ['joukkueen_vapaa', 'seuran_tauko', 'erikoisohjelma'].forEach((ty) => { const m = N.tmKalViikkoMalli({ tapahtumat: [t('v', ty, '2026-10-13', '00:00', '23:59', { koko_paiva: true })], maanantai: MA, nyt: NYT }); expect(m.paivat.flatMap((d) => d.kokoPaiva.concat(d.kortit)).some((k) => k.merkitsematta)).toBe(false); });
    ['valmentajapalaveri', 'muu', 'testitapahtuma'].forEach((ty) => expect(kortti(ilman({}, ty)).merkitsematta).toBeFalsy());
    const e = N.tmKalViikkoMalli({ tapahtumat: [], maanantai: MA, nyt: NYT, ehdotukset: [{ pvm: '2026-10-13', alkaa: '17:30', paattyy: '18:30', tyyppi: 'harjoitus' }] }); expect(e.paivat[1].kortit[0].merkitsematta).toBeFalsy();
  });
  it('ilman nyt-arvoa ei muistutuksia; päättymisaika puuttuu → alkuaika ratkaisee', () => { expect(kortti(ilman({}), null).merkitsematta).toBeFalsy(); expect(N.tmKalViikkoMalli({ tapahtumat: [ilman({})], maanantai: MA }).paivat.flatMap((d) => d.kortit)[0].merkitsematta).toBeFalsy(); const ei = t('e', 'harjoitus', '2026-10-13', '17:30', '19:00'); delete ei._paattyyMs; expect(kortti(ei).merkitsematta).toBe(true); });
  it('Master antaa nyt ja henkilökunta-lipun näkymälle; kooste ei katoa renderöinnissä (oikea renderCal vm:ssä)', () => {
    expect(MASTER).toContain('nyt: Date.now(), henkilokunta: _saaMerkitaLasnaolo()');
  });
});

describe('3 · läsnäolo oletuksena "kaikki paikalla" (tmLasnaoloEsivalinta)', () => {
  const roster = ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id, nimi: 'Demo ' + id }));
  it('merkitsemätön tapahtuma → kaikki paikalla esivalittuna; ylärivi "4/4 paikalla"', () => {
    const e = L.tmLasnaoloEsivalinta(roster, {}); expect(e.esivalittu).toBe(true); expect(Object.values(e.state).every((x) => x.tila === 'paikalla')).toBe(true); expect(L.tmLasnaoloYhteenveto(e.state)).toMatchObject({ paikalla: 4, n: 4, teksti: '4/4 paikalla' });   // identiteettikäännös: avain = fi-teksti
    expect(L.tmLasnaoloEsivalinta(roster, { p1: { saatavuus: 'tulossa' } }).state.p1).toMatchObject({ tila: 'paikalla', saatavuus: 'tulossa' });
  });
  it('olemassa oleva merkintä säilyy: merkityt ennallaan, merkitsemättömät jäävät tyhjiksi (ei esivalintaa)', () => {
    const e = L.tmLasnaoloEsivalinta(roster, { p1: { tila: 'paikalla' }, p2: { tila: 'poissa', syy: 'sairas' }, p3: { tila: 'myohassa' } });
    expect(e.esivalittu).toBe(false); expect(e.state.p1.tila).toBe('paikalla'); expect(e.state.p2).toMatchObject({ tila: 'poissa', syy: 'sairas' }); expect(e.state.p3.tila).toBe('myohassa'); expect(e.state.p4.tila).toBeNull(); expect(L.tmLasnaoloYhteenveto(e.state)).toMatchObject({ paikalla: 1, myohassa: 1, poissa: 1, merkitsematta: 1, n: 4 });
    expect(L.tmLasnaoloEsivalinta(roster, { p9: { tila: 'paikalla' } }).esivalittu).toBe(false);   // merkintä pelaajalta, joka ei ole rosterissa → tapahtuma on jo merkitty
  });
  it('tyhjä roster ei esivalitse; epäkelpo tila ei laske merkinnäksi; kooste samassa muodossa kuin lasnaolo_kooste', () => {
    expect(L.tmLasnaoloEsivalinta([], {}).esivalittu).toBe(false); expect(L.tmLasnaoloEsivalinta(roster, { p1: { tila: 'x' } }).esivalittu).toBe(true);
    expect(L.tmLasnaoloKooste({ a: { tila: 'paikalla' }, b: { tila: 'poissa' }, c: { tila: null } })).toEqual({ paikalla: 1, myohassa: 0, poissa: 1, merkitsematta: 1 });
  });
  it('EI automaattista tallennusta: lib ei kirjoita mitään; Master tallentaa vain Tallenna läsnäolo -napista (_calTallennaLasnaolo kutsutaan vain tallBtn.onclickistä)', () => {
    expect(lue('lib/tm_lasnaolo.js')).not.toMatch(/firebase|firestore|\.set\(|\.update\(|batch/);
    expect((MASTER.match(/_calTallennaLasnaolo\(/g) || []).length).toBe(2);   // määrittely + tallBtn.onclick
    expect(MASTER).toContain("tallBtn.onclick = function() { _calTallennaLasnaolo(t, roster, state, tallBtn); };"); expect(MASTER).toContain('TM_LASNAOLO.tmLasnaoloEsivalinta(roster, existing, masterT)'); expect(MASTER).toContain('TM_LASNAOLO.tmLasnaoloYhteenveto(state, masterT)');
    const a = MASTER.indexOf('async function _calRenderLasnaolo'), b = MASTER.indexOf('async function _calTallennaLasnaolo'); expect(MASTER.slice(a, b)).not.toMatch(/\.set\(|batch\.|\.commit\(/);   // läsnäolonäkymän avaus ei kirjoita
  });
});

describe('3b · RSVP "estynyt" → esivalinta poissa, syy "ilmoitti estyneeksi" (D189)', () => {
  const roster = ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id, nimi: 'Demo ' + id })), TT = (x) => x;
  it('merkitsemätön tapahtuma: estynyt → poissa + syy; muut paikalla; pelkkä tulossa → paikalla; pelaaja ilman ilmoitusta → paikalla', () => {
    const e = L.tmLasnaoloEsivalinta(roster, { p2: { saatavuus: 'estynyt' }, p3: { saatavuus: 'tulossa' } }, TT);
    expect(e.esivalittu).toBe(true); expect(e.state.p2).toMatchObject({ tila: 'poissa', syy: 'ilmoitti estyneeksi', saatavuus: 'estynyt' }); expect(e.state.p1.tila).toBe('paikalla'); expect(e.state.p3.tila).toBe('paikalla'); expect(e.state.p4.tila).toBe('paikalla');
    expect(L.tmLasnaoloYhteenveto(e.state, TT).teksti).toBe('3/4 paikalla · 1 poissa');
  });
  it('syy tulee käännösfunktion kautta (ei kovakoodattua suomea); jo merkityllä tapahtumalla estynyt ei muuta mitään', () => {
    const e = L.tmLasnaoloEsivalinta(roster, { p2: { saatavuus: 'estynyt' } }, (x) => '[' + x + ']'); expect(e.state.p2.syy).toBe('[ilmoitti estyneeksi]'); expect(L.tmLasnaoloYhteenveto(e.state, (x) => '[' + x + ']').teksti).toBe('3/4 [paikalla] · 1 [poissa]');
    const m = L.tmLasnaoloEsivalinta(roster, { p1: { tila: 'paikalla' }, p2: { saatavuus: 'estynyt' } }, TT); expect(m.esivalittu).toBe(false); expect(m.state.p2.tila).toBeNull(); expect(m.state.p2.syy).toBe('');
  });
  it('lib ei sisällä kovakoodattuja käyttäjälle näkyviä suomenkielisiä tekstejä muuten kuin t()-avaimina', () => {
    const src = lue('lib/tm_lasnaolo.js').split('\n').filter((r) => !/^\s*(\/\*|\*|·|\/\/)/.test(r) && !/^\s{3,}[·A-ZÄÖ]/.test(r)).join('\n'); const kirjaimet = [...src.matchAll(/'([^']*[äö][^']*)'/g)].map((m) => m[1]); kirjaimet.forEach((k) => expect(src).toMatch(new RegExp("T\\('" + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'\\)")));
  });
  it('Master välittää masterT:n libille (ei omaa tekstinkoostetta)', () => { expect(MASTER).toContain('tmLasnaoloEsivalinta(roster, existing, masterT)'); expect(MASTER).toContain('tmLasnaoloYhteenveto(state, masterT).teksti'); });
});

describe('4 · modaalien tekstikentät (#1005)', () => {
  it('CSS: .cal-modal-runko > * { flex-shrink: 0 } ja textarea min-height 72px', () => {
    expect(MASTER).toMatch(/\.cal-modal-runko > \* \{ flex-shrink: 0; \}/); expect(MASTER).toMatch(/\.cal-modal-runko textarea \{ min-height: 72px; \}/);
  });
});
