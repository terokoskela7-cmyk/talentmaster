/**
 * R1 Ryhmät (D33): lib/tm_ryhmat.js (puhtaat funktiot) + VP_v25 adapteri (sivun oikea koodi vm:ssä) + lähdetarkistukset.
 * Rules-testit: tests/rules/firestore.rules.test.js (v3.49).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const R = require('../lib/tm_ryhmat.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const VP = lue('TalentMaster_VP_v25.html');

const PEL = [
  { id: 'a', joukkue: 'Sibbo-Vargarna P13', joukkueet: ['sibbo_p13'], talenttiOhjelma: true }, { id: 'b', joukkue: 'Sibbo-Vargarna P15', joukkueet: ['sibbo_p15'] },
  { id: 'c', joukkue: 'Sibbo-Vargarna P13', joukkueet: ['sibbo_p13'] }, { id: 'd', joukkue: 'Sibbo-Vargarna T15', talenttiOhjelma: true }
];
const RY = (o = {}) => Object.assign({ id: 'mv', nimi: 'Maalivahdit', tyyppi: 'lista', pelaajat_id: ['a', 'b'], valmentajat: ['mv-uid'], aktiivinen: true }, o);

describe('tmRyhmaSyote: validointi ENNEN kirjoitusta (sama muoto kuin Rules ryhmaKelpaa)', () => {
  const ok = { nimi: ' Maalivahdit ', tyyppi: 'lista', pelaajat_id: ['a', 'a', 'b'], valmentajat: ['x'], kuvaus: ' kuvaus ' };
  it('siistii nimen/kuvauksen, poistaa duplikaatit, luoja kuuluu valmentajiin ellei johto', () => {
    const x = R.tmRyhmaSyote(ok, { uid: 'luoja', johto: false }); expect(x.ok).toBe(true); expect(x.data).toEqual({ nimi: 'Maalivahdit', tyyppi: 'lista', pelaajat_id: ['a', 'b'], valmentajat: ['x', 'luoja'], aktiivinen: true, kuvaus: 'kuvaus' });
    expect(R.tmRyhmaSyote(ok, { uid: 'vp-uid', johto: true }).data.valmentajat).toEqual(['x']);   // johto ei pakotettu
    expect(R.tmRyhmaSyote(Object.assign({ _muokkaus: true }, ok), { uid: 'luoja', johto: false }).data.valmentajat).toEqual(['x']);   // muokkauksessa ei lisätä
  });
  it('hylkää: tyhjä/liian pitkä nimi, tuntematon tyyppi, tyhjä lista, >200 pelaajaa, >10 valmentajaa, kuvaus >200', () => {
    const v = (o, ctx) => R.tmRyhmaSyote(Object.assign({}, ok, o), ctx || { uid: 'u', johto: true });
    expect(v({ nimi: '  ' })).toEqual({ ok: false, syy: 'nimi' }); expect(v({ nimi: 'x'.repeat(61) }).syy).toBe('nimi'); expect(v({ tyyppi: 'muu' }).syy).toBe('tyyppi'); expect(v({ pelaajat_id: [] }).syy).toBe('pelaajat');
    expect(v({ pelaajat_id: Array.from({ length: 201 }, (_, i) => 'p' + i) }).syy).toBe('pelaajat'); expect(v({ valmentajat: Array.from({ length: 11 }, (_, i) => 'v' + i) }).syy).toBe('valmentajat'); expect(v({ kuvaus: 'x'.repeat(201) }).syy).toBe('kuvaus');
    expect(v({ valmentajat: Array.from({ length: 10 }, (_, i) => 'v' + i) }, { uid: 'u', johto: false }).syy).toBe('valmentajat');   // 10 + luoja = 11
    for (const s of ['nimi', 'pelaajat', 'valmentajat', 'kuvaus', 'tyyppi']) expect(R.tmRyhmaVirhe(s, {})).toMatch(/\S/);
  });
  it('sääntöryhmä (talenttiohjelma): pelaajat_id tyhjä, saanto-kenttä; lista-ryhmällä ei saanto-kenttää', () => {
    const x = R.tmRyhmaSyote({ nimi: 'Talentit', tyyppi: 'saanto', pelaajat_id: ['a'], valmentajat: [] }, { uid: 'vp', johto: true }); expect(x.data).toMatchObject({ tyyppi: 'saanto', pelaajat_id: [], saanto: { kentta: 'talenttiOhjelma', arvo: true } });
    expect('saanto' in R.tmRyhmaSyote(ok, { uid: 'u', johto: true }).data).toBe(false);
  });
});

describe('oikeudet (peilaa Rules v3.49)', () => {
  it('luonti: SA, johto, valmentaja, talenttivalmentaja, fysiikkavalmentaja; ei fysioterapeutti/pelaaja', () => {
    for (const rooli of ['vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja']) expect(R.tmRyhmaSaaLuoda({ rooli }), rooli).toBe(true); expect(R.tmRyhmaSaaLuoda({ sa: true })).toBe(true);
    for (const rooli of ['fysioterapeutti', 'pelaaja', 'testivastaava', undefined]) expect(R.tmRyhmaSaaLuoda({ rooli }), String(rooli)).toBe(false);
  });
  it('muokkaus: SA/johto aina; valmentaja VAIN ryhmän valmentajana', () => {
    expect(R.tmRyhmaSaaMuokata(RY(), { rooli: 'vp', uid: 'x' })).toBe(true); expect(R.tmRyhmaSaaMuokata(RY(), { sa: true })).toBe(true);
    expect(R.tmRyhmaSaaMuokata(RY(), { rooli: 'valmentaja', uid: 'mv-uid' })).toBe(true); expect(R.tmRyhmaSaaMuokata(RY(), { rooli: 'valmentaja', uid: 'muu' })).toBe(false); expect(R.tmRyhmaSaaMuokata(RY(), { rooli: 'talenttivalmentaja', uid: 'muu' })).toBe(false);
    expect(R.tmRyhmaSaaMuokata(null, { rooli: 'vp' })).toBe(false); expect(R.tmRyhmaSaaMuokata(RY(), { rooli: 'pelaaja', uid: 'mv-uid' })).toBe(false);
  });
});

describe('jäsenet ja kohdejoukko (kalenterin "Kenelle")', () => {
  it('lista-ryhmä: pelaajat eri joukkueista; sääntöryhmä: talenttiOhjelma; tuntematon id ohitetaan', () => {
    expect(R.tmRyhmaJasenet(RY(), PEL).map((p) => p.id)).toEqual(['a', 'b']); expect(R.tmRyhmaJasenet(RY({ pelaajat_id: ['a', 'ei-ole'] }), PEL).map((p) => p.id)).toEqual(['a']);
    expect(R.tmRyhmaJasenet(RY({ tyyppi: 'saanto', pelaajat_id: [] }), PEL).map((p) => p.id)).toEqual(['a', 'd']); expect(R.tmRyhmaJasenet(null, PEL)).toEqual([]);
  });
  it('tmKohdePelaajat: joukkue (nimi/slug normalisoituna), joukkueet[], ryhmä (lista + sääntö), poimitut pelaajat', () => {
    const ryhmat = [RY(), RY({ id: 'tal', tyyppi: 'saanto', pelaajat_id: [] })];
    expect(R.tmKohdePelaajat({ tyyppi: 'joukkue', joukkue: 'sibbo_p13' }, { pelaajat: PEL })).toEqual(['a', 'c']); expect(R.tmKohdePelaajat({ tyyppi: 'joukkue', joukkue: 'Sibbo-Vargarna P15' }, { pelaajat: PEL })).toEqual(['b']);
    expect(R.tmKohdePelaajat({ tyyppi: 'joukkueet', joukkueet: ['sibbo_p13', 'sibbo_p15'] }, { pelaajat: PEL })).toEqual(['a', 'b', 'c']);
    expect(R.tmKohdePelaajat({ tyyppi: 'ryhma', ryhma_id: 'mv' }, { pelaajat: PEL, ryhmat })).toEqual(['a', 'b']); expect(R.tmKohdePelaajat({ tyyppi: 'ryhma', ryhma_id: 'tal' }, { pelaajat: PEL, ryhmat })).toEqual(['a', 'd']);
    expect(R.tmKohdePelaajat({ tyyppi: 'ryhma', ryhma_id: 'ei' }, { pelaajat: PEL, ryhmat })).toEqual([]); expect(R.tmKohdePelaajat({ tyyppi: 'pelaajat', pelaajat_id: ['c', 'c', 'd'] }, { pelaajat: PEL })).toEqual(['c', 'd']); expect(R.tmKohdePelaajat({}, { pelaajat: PEL })).toEqual([]);
  });
});

describe('jäädytys: kokoonpano elävä kunnes läsnäolo kirjataan tai päivä menee ohi', () => {
  const nyt = new Date('2026-11-03T12:00:00'), ryhmat = [RY()];
  const ev = (o = {}) => Object.assign({ id: 'e1', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, pelaajat_id: ['a'], alkaa: new Date('2026-11-05T17:00:00') }, o);
  it('tuleva tapahtuma → ELÄVÄ (ryhmän nykyiset jäsenet), ei jäädytettävää', () => { const k = R.tmKokoonpano(ev(), { nyt, pelaajat: PEL, ryhmat }); expect(k).toEqual({ ids: ['a', 'b'], jaadytetty: false, jaadytettava: false }); });
  it('päivä on ohi → tallennettu snapshot (ei elävää, jäsenmuutos ei muuta historiaa) + jäädytettävä', () => {
    const k = R.tmKokoonpano(ev({ alkaa: new Date('2026-11-02T17:00:00') }), { nyt, pelaajat: PEL, ryhmat: [RY({ pelaajat_id: ['c'] })] }); expect(k).toEqual({ ids: ['a'], jaadytetty: false, jaadytettava: true });
    expect(R.tmKokoonpano(ev({ alkaa: new Date('2026-11-03T08:00:00') }), { nyt, pelaajat: PEL, ryhmat }).jaadytettava).toBe(false);   // sama päivä ei ole vielä "ohi"
  });
  it('jäädytetty → tapahtuman oma pelaajat_id, ei koskaan elävä; ilman snapshotia vanha tapahtuma → elävä kohteesta', () => {
    expect(R.tmKokoonpano(ev({ jaadytetty: '2026-11-05T18:00:00.000Z', pelaajat_id: ['c'] }), { nyt, pelaajat: PEL, ryhmat })).toEqual({ ids: ['c'], jaadytetty: true, jaadytettava: false });
    expect(R.tmKokoonpano(ev({ alkaa: new Date('2026-11-02T17:00:00'), pelaajat_id: [] }), { nyt, pelaajat: PEL, ryhmat }).ids).toEqual(['a', 'b']);
    expect(R.tmKokoonpano({ joukkue: 'x', pelaajat_id: ['q'], alkaa: new Date('2026-12-01T10:00:00') }, { nyt, pelaajat: PEL }).ids).toEqual(['q']);   // joukkuetapahtuma ennallaan
  });
  it('tmSynkkaaTapahtumat: vain tulevat, jäädyttämättömät, oman ryhmän, muuttuneet tapahtumat', () => {
    const r = RY({ pelaajat_id: ['a', 'b', 'c'] }), l = [ev({ id: 'tuleva' }), ev({ id: 'sama', pelaajat_id: ['c', 'b', 'a'] }), ev({ id: 'ohi', alkaa: new Date('2026-11-01T10:00:00') }), ev({ id: 'jaadytetty', jaadytetty: 'x' }), ev({ id: 'muuRyhma', kohde: { tyyppi: 'ryhma', ryhma_id: 'x' } }), ev({ id: 'poistettu', poistettu: true }), ev({ id: 'joukkue', kohde: { tyyppi: 'joukkue' } })];
    expect(R.tmSynkkaaTapahtumat(l, r, PEL, nyt)).toEqual([{ id: 'tuleva', pelaajat_id: ['a', 'b', 'c'] }]);
  });
});

describe('pelaajan oma kalenteri: ryhmätapahtuma näkyy (peilaa Pelaaja_v7/Vanhempi_v2-suodatinta)', () => {
  it('pelaajat_id sisältää pelaajan TAI joukkue täsmää (normalisoitu); muiden ryhmätapahtuma ei näy', () => {
    const e = { joukkue: null, joukkueet: [], pelaajat_id: ['a', 'b'], kohde: { tyyppi: 'ryhma' } };
    expect(R.tmTapahtumaKuuluuPelaajalle(e, PEL[0])).toBe(true); expect(R.tmTapahtumaKuuluuPelaajalle(e, PEL[2])).toBe(false); expect(R.tmTapahtumaKuuluuPelaajalle({ joukkue: 'sibbo_p13', joukkueet: ['sibbo_p13'] }, PEL[2])).toBe(true); expect(R.tmTapahtumaKuuluuPelaajalle(null, PEL[0])).toBe(false);
  });
  it('SAMA sääntö kuin sovelluksissa (vm: Pelaaja_v7 _p7EvKuuluu ja Vanhempi_v2 _vanhEvKuuluu antavat saman vastauksen kuin lib)', () => {
    const tapaukset = [[{ pelaajat_id: ['a'] }, PEL[0]], [{ pelaajat_id: ['a'] }, PEL[2]], [{ joukkue: 'sibbo_p13', joukkueet: ['sibbo_p13'] }, PEL[2]], [{ joukkue: 'sibbo_p15' }, PEL[2]], [{ joukkue: 'Sibbo-Vargarna P13' }, PEL[0]]];
    const funk = (src, nimi) => { const i = src.indexOf('function ' + nimi + '('); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); } } };
    const pel = lue('TalentMaster_Pelaaja_v7.html'), van = lue('TalentMaster_Vanhempi_v2.html');
    for (const [koodi, nimi, muuttuja] of [[pel, '_p7EvKuuluu', '_pelaaja'], [van, '_vanhEvKuuluu', null]]) {
      for (const [ev, p] of tapaukset) { const sb = { _pelaaja: p, window: { _lapsi: p }, _lapsi: p, String, Array }; vm.createContext(sb); vm.runInContext(funk(koodi, nimi) + '\nthis.__r=' + nimi + '(' + JSON.stringify(ev) + ');', sb); expect(!!sb.__r, nimi + ' ' + JSON.stringify(ev) + ' ' + p.id).toBe(R.tmTapahtumaKuuluuPelaajalle(ev, p)); }
    }
  });
});

describe('HTML', () => {
  it('lista: jäsenmäärä, valmentajat, muokkaa/arkistoi vain oikeuden omaavalle; arkistoidut perässä; tyhjä-tila; ei hex-värejä; escapointi', () => {
    const o = { jasenMaara: (r) => R.tmRyhmaJasenet(r, PEL).length, valmentajaNimet: () => 'Maija M.', saaMuokata: (r) => r.id === 'mv', voiLuoda: true, uusiFn: '_u', muokkaaFn: '_m', arkistoiFn: '_a', palautaFn: '_p' };
    const h = R.tmRyhmaListaHTML([RY({ nimi: '<b>MV</b>' }), RY({ id: 'x', nimi: 'Vanha', aktiivinen: false }), RY({ id: 'tal', nimi: 'Talentit', tyyppi: 'saanto', pelaajat_id: [] })], o);
    expect(h).toContain('data-ry-uusi'); expect(h).toContain("_m('mv')"); expect(h).toContain("_a('mv')"); expect(h).not.toContain("_m('tal')"); expect(h).toContain('2 jäsentä'); expect(h).toContain('Maija M.'); expect(h).not.toContain('<b>MV</b>'); expect(h).toContain('Arkistoitu'); expect(h.indexOf('Vanha')).toBeGreaterThan(h.indexOf('Talentit')); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(R.tmRyhmaListaHTML([], { uusiFn: '_u' })).toContain('Ei ryhmiä vielä'); expect(R.tmRyhmaListaHTML([], { voiLuoda: false })).not.toContain('data-ry-uusi');
  });
  it('lomake: nimi, tyyppi, haku + joukkuesuodatus, valitut checked, valmentajat; sääntöryhmällä ei pelaajavalitsinta', () => {
    const opts = { pelaajat: [{ id: 'a', nimi: 'Aatu', joukkue: 'P13' }, { id: 'b', nimi: 'Bo', joukkue: 'P15' }], joukkueet: ['P13', 'P15'], valmentajat: [{ id: 'v1', nimi: 'Maija', rooli: 'valmentaja' }], nimiFn: 'n', tyyppiFn: 't', kuvausFn: 'k', hakuFn: 'h', joukkueFn: 'j', valitseFn: 'v', lisaaNakyvatFn: 'l', tyhjennaFn: 'ty', valmentajaFn: 'vm', tallennaFn: 's', peruutaFn: 'p' };
    const h = R.tmRyhmaLomakeHTML({ nimi: 'MV', tyyppi: 'lista', pelaajat_id: ['a'], valmentajat: ['v1'], joukkue: 'P15' }, opts); expect(h).toContain('data-ry-pelaaja="b"'); expect(h).not.toContain('data-ry-pelaaja="a"'); expect(h).toContain('selected'); expect(h).toContain('data-ry-valmentaja="v1" checked');
    const h2 = R.tmRyhmaLomakeHTML({ nimi: 'MV', tyyppi: 'lista', pelaajat_id: ['a'], valmentajat: [], haku: 'aat' }, opts); expect(h2).toContain('data-ry-pelaaja="a" checked'); expect(h2).not.toContain('data-ry-pelaaja="b"'); expect(h2).toContain('1 valittu');
    const s = R.tmRyhmaLomakeHTML({ nimi: 'T', tyyppi: 'saanto', pelaajat_id: [], valmentajat: [] }, opts); expect(s).not.toContain('data-ry-pelaajalista'); expect(s).toContain('talenttiohjelman pelaajat');
  });
});

function ymp({ rooli = 'vp', uid = 'vp-uid', kaada = false, ryhmat = [], demo = false } = {}) {
  const log = { toast: [], kirj: [], haettu: 0, warn: [] }, els = {};
  const kirjoita = (op) => async (d) => { if (kaada) throw Object.assign(new Error('x'), { code: 'permission-denied' }); log.kirj.push([op, d]); return { id: 'uusi' }; };
  const docRef = (id) => ({ update: (d) => kirjoita('update:' + id)(d) });
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => { log.haettu++; return { docs: ryhmat.map((r) => ({ id: r.id, data: () => { const { id, ...x } = r; return x; } })) }; }, add: (d) => kirjoita('add')(d), doc: docRef }) }) }) };
  const sb = { window: { TM_RYHMAT: R, _vpRooli: rooli, _vpSA: false }, document: { getElementById: (id) => (id === 'ryhmatSisalto' ? (els.s = els.s || { innerHTML: '' }) : null), querySelector: () => null }, console: { warn: (...a) => log.warn.push(a) }, Object, Array, Set, Date, JSON, Math, Promise, String, Number,
    _uid: uid, _seuraId: 'sibbo', _isDemoMode: demo, db, firebase: { auth: () => ({ currentUser: { getIdToken: async () => 't' } }), firestore: { FieldValue: { serverTimestamp: () => 'TS' } } }, TM_VIRHEKOODI: require('../lib/tm_virhekoodi.js'), toast: (t, k) => log.toast.push([t, k]), vpT: (x) => x, _jsvEsc: (s) => String(s == null ? '' : s), confirm: () => true,
    _pelaajat: PEL, _valmentajat: [{ id: 'vp-uid', nimi: 'Vera VP', rooli: 'vp' }, { id: 'mv-uid', nimi: 'Mikko MV', rooli: 'valmentaja' }], _valmentajatKaikki: [{ id: 'mv-uid', nimi: 'Mikko MV' }], _tmHenkiloNimi: (p) => 'Pelaaja ' + p.id };
  vm.createContext(sb);
  const i = VP.indexOf('/* ═══ R1 — Seuran ryhmät'), j = VP.indexOf('function setWs(ws) {', i); vm.runInContext(VP.slice(i, j) + '\nthis.__ry=window;', sb);
  return { sb, log, els, w: sb.window };
}
describe('VP_v25 · Ryhmät-osio (vm)', () => {
  it('lataus lukee ryhmat KERRAN avattaessa; lista näkyy jäsenmäärineen; demo → ei lukua', async () => {
    const e = ymp({ ryhmat: [RY(), RY({ id: 'tal', nimi: 'Talentit', tyyppi: 'saanto', pelaajat_id: [] })] }); await e.sb._ryLataa(); expect(e.log.haettu).toBe(1); expect(e.els.s.innerHTML).toContain('Maalivahdit'); expect(e.els.s.innerHTML).toContain('2 jäsentä'); expect(e.els.s.innerHTML).toContain('Mikko MV');
    const d = ymp({ demo: true }); await d.sb._ryLataa(); expect(d.log.haettu).toBe(0);
  });
  it('UUSI → valinnat → TALLENNA: yksi add() (nimi, lista, pelaajat eri joukkueista, valmentajat) + luoja_uid + aikaleimat; lomake sulkeutuu vasta onnistuttua; lista ladataan uudelleen', async () => {
    const e = ymp(); await e.sb._ryLataa(); e.w._ryUusi(); e.w._ryNimi('Maalivahdit'); e.w._ryValitse('a'); e.w._ryValitse('b'); e.w._ryValmentaja('mv-uid');
    await e.w._ryTallenna(); expect(e.log.kirj).toHaveLength(1); const [op, d] = e.log.kirj[0]; expect(op).toBe('add'); expect(d).toMatchObject({ nimi: 'Maalivahdit', tyyppi: 'lista', pelaajat_id: ['a', 'b'], valmentajat: ['mv-uid'], aktiivinen: true, luoja_uid: 'vp-uid', luotu: 'TS', muokattu: 'TS' });
    expect(e.w._ryTila).toBeNull(); expect(e.log.toast.at(-1)).toEqual(['Ryhmä tallennettu ✓', 'ok']); expect(e.log.haettu).toBe(2);
  });
  it('valmentaja luo ryhmän → itse mukaan valmentajiin (Rules vaatii)', async () => {
    const e = ymp({ rooli: 'valmentaja', uid: 'mv-uid' }); await e.sb._ryLataa(); e.w._ryUusi(); e.w._ryNimi('MV'); e.w._ryValitse('a'); await e.w._ryTallenna(); expect(e.log.kirj[0][1].valmentajat).toEqual(['mv-uid']);
  });
  it('MUOKKAA: update() (ei add), luoja_uid/luotu eivät lähde mukaan; ei-ryhmän-valmentaja ei pääse muokkaamaan; arkistointi/palautus = aktiivinen-kenttä', async () => {
    const e = ymp({ rooli: 'valmentaja', uid: 'mv-uid', ryhmat: [RY(), RY({ id: 'toinen', nimi: 'Toinen', valmentajat: ['joku-muu'] })] }); await e.sb._ryLataa();
    e.w._ryMuokkaa('toinen'); expect(e.w._ryTila).toBeNull(); expect(e.log.toast.at(-1)[1]).toBe('error');
    e.w._ryMuokkaa('mv'); expect(e.w._ryTila.id).toBe('mv'); e.w._ryNimi('Maalivahdit U13–15'); await e.w._ryTallenna(); const [op, d] = e.log.kirj[0]; expect(op).toBe('update:mv'); expect(d).toMatchObject({ nimi: 'Maalivahdit U13–15', muokattu: 'TS' }); expect('luoja_uid' in d).toBe(false); expect('luotu' in d).toBe(false);
    await e.w._ryArkistoi('mv'); expect(e.log.kirj.at(-1)).toEqual(['update:mv', { aktiivinen: false, muokattu: 'TS' }]); await e.w._ryPalauta('mv'); expect(e.log.kirj.at(-1)[1].aktiivinen).toBe(true);
  });
  it('VALIDOINTI ENNEN KIRJOITUSTA: tyhjä nimi / ei pelaajia → toast, EI kirjoitusta, lomake auki', async () => {
    const e = ymp(); await e.sb._ryLataa(); e.w._ryUusi(); await e.w._ryTallenna(); expect(e.log.toast.at(-1)).toEqual(['Anna ryhmälle nimi (enintään 60 merkkiä).', 'error']); e.w._ryNimi('X'); await e.w._ryTallenna(); expect(e.log.toast.at(-1)[0]).toContain('vähintään yksi pelaaja'); expect(e.log.kirj).toEqual([]); expect(e.w._ryTila).not.toBeNull();
  });
  it('D53: permission-denied → toast + koodi + konsoli, lomake AUKI, syötetyt tiedot tallessa, uudelleenyritys mahdollinen', async () => {
    const e = ymp({ kaada: true }); await e.sb._ryLataa(); e.w._ryUusi(); e.w._ryNimi('MV'); e.w._ryValitse('a'); await e.w._ryTallenna();
    expect(e.log.toast.at(-1)).toEqual(['Tallennus epäonnistui (permission-denied)', 'error']); expect(e.log.warn.length).toBeGreaterThan(0); expect(e.w._ryTila).toMatchObject({ nimi: 'MV', pelaajat_id: ['a'] }); expect(e.w._ryTila.tallentaa).toBe(false);
  });
  it('pelaajavalitsin: haku + joukkuesuodatus + "Lisää näkyvät" (vain näkyvät), tyhjennä; sääntöryhmällä pelaajia ei tallenneta', async () => {
    const e = ymp(); await e.sb._ryLataa(); e.w._ryUusi(); e.w._ryJoukkue('Sibbo-Vargarna P13'); e.w._ryLisaaNakyvat(); expect(e.w._ryTila.pelaajat_id.sort()).toEqual(['a', 'c']); e.w._ryTyhjenna(); expect(e.w._ryTila.pelaajat_id).toEqual([]);
    e.w._ryJoukkue(''); e.w._ryHaku('pelaaja d'); e.w._ryLisaaNakyvat(); expect(e.w._ryTila.pelaajat_id).toEqual(['d']);
    e.w._ryNimi('Talentit'); e.w._ryTyyppi('saanto'); await e.w._ryTallenna(); expect(e.log.kirj[0][1]).toMatchObject({ tyyppi: 'saanto', pelaajat_id: [], saanto: { kentta: 'talenttiOhjelma', arvo: true } });
  });
});

describe('Lähdetarkistukset', () => {
  it('Ryhmät ei ole Kenttä-lipun takana; nav + näkymä + lataus vain avattaessa; lib ladataan', () => {
    const blokki = VP.slice(VP.indexOf('/* ═══ R1 — Seuran ryhmät'), VP.indexOf('function setWs(ws) {')); expect(blokki).not.toMatch(/_ktLippu|liput\.kentta|_vpLataaLiput/);
    expect(VP).toContain('data-ws="ryhmat" onclick="setWs(\'ryhmat\')"'); expect(VP).toContain('id="ws-ryhmat"'); expect(VP).toContain("if (ws === 'ryhmat') { window._ryTila = null; _ryRender(); _ryLataa(); }"); expect(VP).toContain('<script src="lib/tm_ryhmat.js?v=2"></script>');
  });
  it('Rules v3.49: ryhmat-säännöt + kalenterin ryhmätapahtumapoikkeus + versio', () => {
    const r = lue('tm_admin/firestore.rules'); expect(r).toMatch(/firestore.rules v3.(49|50|51|52|53|54|55)/); expect(r).toContain('match /ryhmat/{ryhmaId}'); expect(r).toContain('function ryhmaKelpaa()'); expect(r).toContain('ryhmanValmentajaTapahtumassa(seuraId)'); expect(r).toContain('Seuran pulssi (S1) siirtyy v3.50:een');
  });
  it('Geminin käännöslista: kaikki ry_*-avaimet + ruudun otsikot listassa (sv jää määrittelemättä)', () => {
    const d = lue('docs/R1_RYHMAT_SV_KAANNOKSET.md'); for (const k of Object.keys(R.FI)) expect(d, k).toContain('`' + k + '`'); expect(d).toContain('Ryhmät'); expect(d).toContain('Maalivahdit, talenttiryhmä ja muut ryhmät joukkueiden yli');
  });
});
