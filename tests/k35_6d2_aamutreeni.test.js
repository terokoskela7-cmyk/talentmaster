/* K35-6d (aamutreenit) · Aamutreeni = harjoituksen esiasetus: ei uutta tyyppiä; poimitut pelaajat; viikoittaiset sarjat; näkyvyys; läsnäolon roster; kuorma/jaksokooste poimituille. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const A = require('../lib/tm_aamutreeni.js'), TY = require('../lib/tm_kalenteri_tyypit.js'), K = require('../lib/tm_kalenteri_pelaajalle.js'), KY = require('../lib/tm_kalenteri_kyselyt.js'), R = require('../lib/tm_ryhmat.js'), N = require('../lib/tm_kalenteri_nakyma.js'), V = require('../lib/tm_viikkopohja.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8'), MASTER = lue('TalentMaster_Master_v16.html');
const ms = (pvm, h) => Date.parse(pvm + 'T' + h + ':00+03:00');
const JD = [{ id: 'demo_u13', nimi: 'Demo U13' }, { id: 'demo_u15', nimi: 'Demo U15' }];
const aamu = (o) => Object.assign({ id: 'am1', tyyppi: 'harjoitus', alalaji: 'aamutreeni', nimi: 'Aamutreeni', kohde: { tyyppi: 'pelaajat' }, pelaajat_id: ['p1', 'p2', 'p3'], joukkue: null, joukkue_nimi: null, joukkueet: [], pvm: '2026-10-21', alkaa: '07:00', paattyy: '08:30', _alkaaMs: ms('2026-10-21', '07:00'), _paattyyMs: ms('2026-10-21', '08:30'), nakyvyys: 'kaikki', luoja_uid: 'u1', poistettu: false }, o || {});

describe('1 · esiasetus (ei uutta tyyppiä)', () => {
  it('rekisteri ennallaan (14 tyyppiä, ei aamutreeni-tyyppiä); esiasetus 07:00–08:30, harjoitus + alalaji, viikoittain', () => {
    expect(TY.tmKalTyypit().length).toBe(14); expect(Object.keys(TY.TYYPIT)).not.toContain('aamutreeni'); expect(TY.tmKalTyyppiAvain('aamutreeni')).toBe('muu');
    expect(A.ESIASETUS).toEqual({ alkaa: '07:00', paattyy: '08:30', alalaji: 'aamutreeni', nimi: 'Aamutreeni', toisto: 'viikoittain' }); expect(A.tmAamuOsa()).toEqual({ tyyppi: 'harjoitus', alalaji: 'aamutreeni', nimi: 'Aamutreeni' }); expect(A.tmAamuOsa('Kärkikolmikko').nimi).toBe('Kärkikolmikko');
  });
  it('Kenelle: vain poimitut pelaajat (joukkue-valinta piilotetaan); vähintään 1 pelaaja ja 1 viikonpäivä', () => {
    expect(A.tmAamuKenelle()).toEqual({ sallitut: ['pelaajat'], tapa: 'pelaajat' }); expect(R.tmKenelleDoc({ tapa: 'pelaajat', pelaajat_id: [] }, {}).ok).toBe(false);
    expect(A.tmAamuValidoi({ pelaajat_id: [], paivat: [1] })).toEqual({ ok: false, syy: 'pelaajat' }); expect(A.tmAamuValidoi({ pelaajat_id: ['p1'], paivat: [] })).toEqual({ ok: false, syy: 'paivat' }); expect(A.tmAamuValidoi({ pelaajat_id: ['p1'], paivat: [1, 3, 5] })).toEqual({ ok: true });
    const d = R.tmKenelleDoc({ tapa: 'pelaajat', pelaajat_id: ['p1', 'p2'] }, {}); expect(d.osa).toMatchObject({ joukkue: null, joukkueet: [], pelaajat_id: ['p1', 'p2'], kohde: { tyyppi: 'pelaajat' }, nakyvyys: 'kaikki' });
  });
  it('sarjan luonti: jokaiselle valitulle viikonpäivälle ensimmäinen päivä ≥ aloituspäivä (ma/ke/pe)', () => {
    expect(A.tmAamuAlut('2026-10-19', [1, 3, 5])).toEqual(['2026-10-19', '2026-10-21', '2026-10-23']); expect(A.tmAamuAlut('2026-10-21', [1, 3, 5])).toEqual(['2026-10-23', '2026-10-26', '2026-10-21'].sort()); expect(A.tmAamuAlut('2026-10-23', [1])).toEqual(['2026-10-26']);
    expect(A.tmAamuAlut('2026-10-25', [7, 1])).toEqual(['2026-10-25', '2026-10-26']); expect(A.tmAamuAlut('2026-10-19', [3, 3, 9, 0])).toEqual(['2026-10-21']); expect(A.tmAamuAlut('huomenna', [1])).toEqual([]);
    const TK = require('../lib/tm_kalenteri.js'); const r = TK.tmKalenteriOccurrences('2026-10-21', 'viikoittain', '2026-11-11', 60); expect(r.pvmt).toEqual(['2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11']);   // viikoittainen sarja kuten muillakin harjoituksilla
  });
  it('lomake: viikonpäivävalinta, oletus = valitun päivän viikonpäivä; tmAamuLue lukee valitut', () => {
    const h = A.tmAamuHTML({ pvm: '2026-10-21' }); expect((h.match(/data-aamu-pv=/g) || []).length).toBe(7); expect(h).toMatch(/data-aamu-pv="3" checked/); expect((h.match(/ checked/g) || []).length).toBe(1);
    expect(A.tmAamuLue({ querySelectorAll: () => [{ checked: true, getAttribute: () => '1' }, { checked: false, getAttribute: () => '2' }, { checked: true, getAttribute: () => '5' }] })).toEqual([1, 5]); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
  it('Master: pikavalinta, esiasetus ja sarjat libistä (ei omaa viikonpäivälaskentaa); alalaji tallentuu', () => {
    expect(MASTER).toContain('lib/tm_aamutreeni.js'); expect(MASTER).toContain("aamuBtn.id = 'tapahtumatyyppiAamu'"); expect(MASTER).toContain('TM_AAMUTREENI.tmAamuAlut(pvmVal, _aamuPv)'); expect(MASTER).toContain('TM_AAMUTREENI.tmAamuOsa(nimi)'); expect(MASTER).toContain('TM_AAMUTREENI.tmAamuKenelle().sallitut'); expect(MASTER.split('\n').map((r) => r.replace(/\s\/\/.*$/, '')).join('\n')).not.toMatch(/'aamutreeni'/);   // alalaji-merkkijono vain libissä (kommentteja lukuun ottamatta)
  });
});

describe('2 · näkyvyys: poimittu pelaaja ja huoltaja näkevät, muut pelaajat eivät', () => {
  const pel = (id, joukkueet) => ({ id, joukkue: 'x', joukkueet: joukkueet || ['demo_u13'] });
  it('poimittu pelaaja ✓ (myös toisesta joukkueesta), saman joukkueen muu pelaaja ✗, toisen joukkueen pelaaja ✗ (sama sääntö kuin pelaajan kalenteri ja huoltajan haku)', () => {
    expect(K.tmKuuluuPelaajalle(aamu(), pel('p1'), JD)).toBe(true); expect(K.tmKuuluuPelaajalle(aamu(), pel('p2', ['demo_u15']), JD)).toBe(true); expect(K.tmKuuluuPelaajalle(aamu(), pel('p9'), JD)).toBe(false); expect(K.tmKuuluuPelaajalle(aamu(), pel('p8', ['demo_u15']), JD)).toBe(false);
    expect(K.tmValitse([aamu()], pel('p9'), JD, ms('2026-10-20', '12:00'))).toEqual([]); expect(K.tmValitse([aamu()], pel('p1'), JD, ms('2026-10-20', '12:00')).map((e) => e.id)).toEqual(['am1']);
    const v = K.tmProjisoi(aamu(), null); expect(v.pelaajat_id).toBeUndefined(); expect(JSON.stringify(v)).not.toContain('p2');   // projektio ei vuoda toisten pelaajien tunnisteita
  });
  it('valmentaja: joukkueen valmentaja näkee, jos poimittu pelaaja on hänen joukkueessaan; luoja ja johto näkevät; muun joukkueen valmentaja ei', () => {
    const ev = aamu(), ok = (c) => R.tmNakyyKalenterissa(ev, c);
    expect(ok({ uid: 'v2', omatPelaajat: ['p2', 'p7'] })).toBe(true); expect(ok({ uid: 'v3', omatPelaajat: ['p8'] })).toBe(false); expect(ok({ uid: 'v3', omatPelaajat: [] })).toBe(false); expect(ok({ uid: 'u1', omatPelaajat: [] })).toBe(true); expect(ok({ uid: 'vp', johto: true })).toBe(true);
  });
  it('Rules ennallaan: pelaajat-kohde ei vaadi Rules-muutosta (valmentaja luo luoja_uid == uid; pelaaja/huoltaja eivät lue suoraan)', () => { expect(lue('tm_admin/firestore.rules')).toMatch(/firestore\.rules v3\.(5[0-9]|60|61|62|63|64|65|66|67|68|69|70)/); expect(lue('tm_admin/firestore.rules')).not.toContain('aamutreeni'); });
});

describe('3 · kortti viikkonäkymässä', () => {
  const html = (ev, c) => N.tmKalViikkoHTML(N.tmKalViikkoMalli({ tapahtumat: [ev], maanantai: '2026-10-19', nyt: ms('2026-10-22', '12:00') }), Object.assign({ t: (x) => x, on: {} }, c));
  it('oma kortti: "Aamutreeni · 6 pel." ja merkki "Aamu"; tavallinen harjoitus ei', () => {
    const h = html(aamu({ pelaajat_id: ['1', '2', '3', '4', '5', '6'] })); expect(h).toContain('Aamutreeni · 6 pel.'); expect(h).toContain('kv-aamu">Aamu<'); expect(h).toContain('07:00–08:30');
    const t = html(aamu({ alalaji: undefined, nimi: '', joukkue: 'Demo U13' }), { tyyppiNimi: () => 'Harjoitus' }); expect(t).not.toContain('kv-aamu">'); expect(t).not.toContain('pel.');
  });
  it('päättynyt aamutreeni ilman koostetta → "Merkitse läsnäolot" (henkilökunnalle); koosteella ✓ n/m', () => {
    expect(html(aamu(), { henkilokunta: true })).toContain('Merkitse läsnäolot'); expect(html(aamu(), { henkilokunta: false })).not.toContain('Merkitse läsnäolot'); expect(html(aamu({ lasnaolo_kooste: { paikalla: 3, myohassa: 0, poissa: 0 } }), { henkilokunta: true })).toContain('✓ 3/3');
  });
});

describe('4 · läsnäolo: roster = poimitut (oletuksena kaikki paikalla, tallennus vahvistuksella)', () => {
  it('Master hakee rosterin pelaajat_id:stä (ei joukkueesta); esivalinta ja tallennus kuten #1017', () => {
    const a = MASTER.indexOf('async function _calHaeOsallistujat'), b = MASTER.indexOf('function _calLasnaoloPaint'), k = MASTER.slice(a, b); expect(k).toContain('Array.isArray(t.pelaajat_id) && t.pelaajat_id.length'); expect(k.indexOf('t.pelaajat_id')).toBeLessThan(k.indexOf("t.joukkue || (t.joukkueet"));
    expect(MASTER).toContain('tmLasnaoloEsivalinta(roster, existing, masterT)'); expect(MASTER).toContain("tallBtn.onclick = function() { _calTallennaLasnaolo(t, roster, state, tallBtn); };");
  });
});

describe('5 · kuorma ja jaksokooste: lasketaan poimituille pelaajille, ei koko joukkueelle', () => {
  it('ei joukkuetta → ei joukkueen harjoituksena: tmSeuraavaTapahtuma({joukkue}) ohittaa, ({pelaaja}) löytää poimitulle, ei muulle pelaajalle', () => {
    const nyt = ms('2026-10-20', '12:00'), tap = [aamu()];
    expect(KY.tmSeuraavaTapahtuma(tap, { joukkue: 'Demo U13', nyt })).toBeNull(); expect(KY.tmSeuraavaTapahtuma(tap, { pelaaja: { id: 'p1', joukkueet: ['demo_u13'] }, nyt })).toMatchObject({ id: 'am1' }); expect(KY.tmSeuraavaTapahtuma(tap, { pelaaja: { id: 'p9', joukkueet: ['demo_u13'] }, nyt })).toBeNull();
  });
  it('Täytä viikko / Monista: aamutreeni ei ole joukkueen harjoitus (ei "olemassa", ei historiaa, ei monistu koko joukkueelle)', () => {
    const pohja = V.tmPalloliitonPohjat(JSON.parse(lue('docs/data/spl_viikkopohjat_2023.json'))).find((p) => p.avain === 'spl_8v8_nuoruus');
    const a = (ev) => V.tmTaytaViikko({ pohja, maanantai: '2026-10-19', ottelut: ['2026-10-24'], tapahtumat: ev, historia: ev, joukkue: 'Demo U13' }); expect(a([aamu({ pvm: '2026-10-22', _alkaaMs: ms('2026-10-22', '07:00'), _paattyyMs: ms('2026-10-22', '08:30') })]).ehdotukset.map((e) => e.pvm.slice(8))).toEqual(a([]).ehdotukset.map((e) => e.pvm.slice(8)));
    expect(V.tmMonistaViikko({ tapahtumat: [aamu({ pvm: '2026-10-14', _alkaaMs: ms('2026-10-14', '07:00'), _paattyyMs: ms('2026-10-14', '08:30') })], maanantai: '2026-10-19', joukkue: 'Demo U13' }).ehdotukset).toEqual([]);
  });
  it('kuormakirjaus tulee läsnäolo-dokeista (poimitut pelaajat) — RPE myöhemmin (D197): ei RPE-kenttiä aamutreenin luonnissa', () => {
    expect(A.tmAamuOsa()).not.toHaveProperty('valmentaja_rpe'); expect(lue('lib/tm_aamutreeni.js')).not.toMatch(/rpe/i.source ? /valmentaja_rpe\s*[:=]/ : /x/);
  });
});
