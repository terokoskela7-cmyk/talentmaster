/* K35-6b · siirto vetämällä / "Siirrä…" (lib/tm_kalenteri_siirto.js + korttien HTML + Masterin kytkentä). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../lib/tm_kalenteri_siirto.js'), N = require('../lib/tm_kalenteri_nakyma.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8'), MASTER = lue('TalentMaster_Master_v16.html');
const ev = (o) => Object.assign({ id: 'a', tyyppi: 'harjoitus', pvm: '2026-10-21', alkaa: '17:30', paattyy: '19:00', joukkue: 'Demo U13', joukkue_nimi: 'Demo U13', lahde: 'manuaalinen' }, o || {});
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');

describe('tmSiirtoSuunnitelma / tmSiirtoDoc', () => {
  it('uusi päivä: alkuperäinen kellonaika ja kesto säilyvät; päiväero laskettu', () => {
    const p = S.tmSiirtoSuunnitelma(ev(), { pvm: '2026-10-23', alkaa: '17:30' }); expect(p).toEqual({ ok: true, pvm: '2026-10-23', alkaa: '17:30', paattyy: '19:00', paivaEro: 2, muuttui: true });
    expect(S.tmSiirtoSuunnitelma(ev(), { pvm: '2026-10-19', alkaa: '17:30' }).paivaEro).toBe(-2);
  });
  it('aika muuttuu → päättymisaika siirtyy (kesto säilyy); keskiyön yli → 23:59; sama päivä ja aika → muuttui false; ei päättymisaikaa → null', () => {
    expect(S.tmSiirtoSuunnitelma(ev(), { pvm: '2026-10-21', alkaa: '18:00' })).toMatchObject({ alkaa: '18:00', paattyy: '19:30', paivaEro: 0, muuttui: true }); expect(S.tmSiirtoSuunnitelma(ev(), { pvm: '2026-10-21', alkaa: '23:00' }).paattyy).toBe('23:59');
    expect(S.tmSiirtoSuunnitelma(ev(), { pvm: '2026-10-21', alkaa: '17:30' }).muuttui).toBe(false); expect(S.tmSiirtoSuunnitelma(ev({ paattyy: '' }), { pvm: '2026-10-22', alkaa: '17:30' }).paattyy).toBeNull();
  });
  it('virheet: huono päivä, huono aika, tuodun tapahtuman aika lukittu', () => {
    expect(S.tmSiirtoSuunnitelma(ev(), { pvm: 'huomenna', alkaa: '17:30' })).toEqual({ ok: false, syy: 'pvm' }); expect(S.tmSiirtoSuunnitelma(ev(), { pvm: '2026-10-22', alkaa: '' })).toEqual({ ok: false, syy: 'aika' }); expect(S.tmSiirtoSuunnitelma(ev({ lahde: 'myclub' }), { pvm: '2026-10-22', alkaa: '17:30' })).toEqual({ ok: false, syy: 'lukittu' });
  });
  it('tmSiirtoDoc: sarjassa jokaiselle dokille sama päiväsiirto (kuukauden ja kesäajan yli)', () => {
    const p = S.tmSiirtoSuunnitelma(ev(), { pvm: '2026-10-23', alkaa: '18:00' }); expect(S.tmSiirtoDoc({ pvm: '2026-10-28' }, p)).toEqual({ alkaa: '2026-10-30T18:00', paattyy: '2026-10-30T19:30' }); expect(S.tmSiirtoDoc({ pvm: '2026-10-29' }, p).alkaa).toBe('2026-10-31T18:00'); expect(S.tmSiirtoDoc({ pvm: '2026-11-05' }, p).alkaa).toBe('2026-11-07T18:00');
    expect(S.tmSiirtoDoc({ pvm: '2026-10-25' }, S.tmSiirtoSuunnitelma(ev({ pvm: '2026-10-24' }), { pvm: '2026-10-26', alkaa: '17:30' })).alkaa).toBe('2026-10-27T17:30');
    expect(S.tmSiirtoDoc({ pvm: '2026-10-21' }, S.tmSiirtoSuunnitelma(ev({ paattyy: '' }), { pvm: '2026-10-22', alkaa: '17:30' })).paattyy).toBeNull();
  });
  it('tmSiirtoVoi: ei ehdotusta, ei koko päivää, ei lukittua, aika pakollinen', () => { expect(S.tmSiirtoVoi({ alkaa: '17:30' })).toBe(true); expect(S.tmSiirtoVoi({ alkaa: '17:30', ehdotus: true })).toBe(false); expect(S.tmSiirtoVoi({ alkaa: '17:30', lukittu: true })).toBe(false); expect(S.tmSiirtoVoi({ alkaa: '' })).toBe(false); expect(S.tmSiirtoVoi({ alkaa: '17:30', koko_paiva: true })).toBe(false); });
  it('lomake-HTML: päivä, alkaa, päättyy, Peruuta/Siirrä; modaalirakenne; ei hexejä/emojeja', () => {
    const h = S.tmSiirtoLomakeHTML({ pvm: '2026-10-22', alkaa: '17:30', paattyy: '19:00', nimi: 'Harjoitus' }); ['id="siirtoPvm" value="2026-10-22"', 'id="siirtoAlkaa" value="17:30"', 'id="siirtoPaattyy">19:00', 'id="siirtoTallenna"', 'id="siirtoPeru"', 'cal-modal-yla', 'cal-modal-runko', 'cal-modal-ala'].forEach((x) => expect(h).toContain(x)); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});

describe('korttien HTML: vedettävyys', () => {
  const malli = (o) => N.tmKalViikkoMalli({ tapahtumat: [ev(o)], maanantai: '2026-10-19' });
  const C = (o) => Object.assign({ t: (x) => x, siirrettava: () => true, on: { kortti: (id) => 'k(' + id + ')', veda: (id) => "v(event,'" + id + "')", pudota: (p) => "d(event,'" + p + "')", siirra: (id) => "s('" + id + "')" } }, o);
  it('muokattava kortti: draggable + ondragstart + "Siirrä…"-painike; jokainen päivä on pudotuskohde', () => {
    const h = N.tmKalViikkoHTML(malli(), C()); expect(h).toContain('draggable="true" ondragstart="v(event,\'a\')"'); expect(h).toContain('class="kv-siirra"'); expect(h).toContain('>Siirrä…<'); expect((h.match(/ondrop="d\(event,/g) || []).length).toBe(7); expect(h).toContain("ondrop=\"d(event,'2026-10-20')\"");
  });
  it('ei vedettävissä: tuotu (lukittu) tapahtuma, ilman oikeutta (siirrettava false), koko päivä, ehdotus', () => {
    expect(N.tmKalViikkoHTML(malli({ lahde: 'myclub' }), C())).not.toContain('draggable'); expect(N.tmKalViikkoHTML(malli(), C({ siirrettava: () => false }))).not.toContain('draggable'); expect(N.tmKalViikkoHTML(malli(), C({ siirrettava: () => false }))).not.toContain('kv-siirra"');
    expect(N.tmKalViikkoHTML(N.tmKalViikkoMalli({ tapahtumat: [], maanantai: '2026-10-19', ehdotukset: [{ pvm: '2026-10-21', alkaa: '17:30', paattyy: '19:00', tyyppi: 'harjoitus' }] }), C())).not.toContain('draggable');
    expect(N.tmKalViikkoHTML(N.tmKalViikkoMalli({ tapahtumat: [ev({ tyyppi: 'joukkueen_vapaa', koko_paiva: true, alkaa: '00:00', paattyy: '23:59', _alkaaMs: ms('2026-10-21', '00:00'), _paattyyMs: ms('2026-10-22', '23:59') })], maanantai: '2026-10-19' }), C())).not.toContain('draggable');
    expect(N.tmKalViikkoHTML(malli(), { t: (x) => x, on: {} })).not.toContain('draggable');   // ilman käsittelijöitä (esim. VP:n näkymä) ei vetoa
  });
  it('mobiili: Siirrä…-painike näkyy ≤ 640 px / kosketuslaitteella, piilossa työpöydällä; ei hexejä', () => { expect(N.CSS).toMatch(/\.kv-siirra\{display:none/); expect(N.CSS).toMatch(/@media \(max-width:640px\),\(pointer:coarse\)\{\.kv-siirra\{display:inline-block\}\}/); expect(N.CSS).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); });
});

describe('Master: kytkentä', () => {
  it('lib ladataan; pudotus/avaus ohjaa libiin; kirjoitus vain Siirrä-napista (batch, merge), sarjassa skooppidialogi; ei omaa päivälaskentaa', () => {
    expect(MASTER).toContain('lib/tm_kalenteri_siirto.js'); expect(MASTER).toContain('window._calSiirto = {'); expect(MASTER).toContain('S.tmSiirtoSuunnitelma('); expect(MASTER).toContain('S.tmSiirtoDoc('); expect(MASTER).toContain('_calSkooppiDialog(t, masterT(\'Siirrä tapahtuma\')');
    const a = MASTER.indexOf('window._calSiirto = {'), b = MASTER.indexOf('function _calTayttoOhjain()'), k = MASTER.slice(a, b); expect((k.match(/batch\.commit\(\)/g) || []).length).toBe(1); expect(k).not.toMatch(/setDate\(|getDate\(|86400000/);
    expect(k.indexOf('batch.commit')).toBeGreaterThan(k.indexOf("$('#siirtoTallenna').onclick"));   // commit vain Siirrä-napin käsittelijässä (ei pudotuksessa)
  });
});
