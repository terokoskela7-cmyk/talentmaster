/**
 * J4 A — #823-liitoksen synkka: "Liitä jakson kotiharjoitteiksi" kun jaksolla on tukitavoitteet (V1). Fixture: KPV U13 Topias (m93GBdOaGCUuenMiCL0I).
 * Tukitavoitteet → valitun tavoitteen harjoitteet + yhteensopiva tukiosa (= ensimmäinen) YHDESSÄ updatessa; vanha jakso ilman tukitavoitteet-kenttää ennallaan.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const JM = require('../lib/tm_jakso_malli.js'), K = require('../lib/tm_kehityssilmukka.js'), TT = require('../lib/tm_tukitavoitteet.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..'), MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8'), VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const PID = 'm93GBdOaGCUuenMiCL0I';
const OHJ = (lisa) => Object.assign({ id: 'liike1', nimi: 'Liikehallinnan perusteet', tila: 'hyvaksytty', lahde: 'seura', versio: 2, liikkeet: [{ jarjestys: 1, liike: 'Kontrollipunnerrus', toistot: '3×10', kotiin_sopiva: true }, { jarjestys: 2, liike: 'Syvä kyykky', kotiin_sopiva: true }, { jarjestys: 3, liike: 'Salilla vain', kotiin_sopiva: false }] }, lisa || {});
const H = (id, lisa) => Object.assign({ id: id, nimi: 'Harjoite ' + id, lahde: 'seura' }, lisa || {});
const TV = (kuvaus, harjoitteet) => ({ alue: 'fyysinen', kuvaus: kuvaus, perustelu: 'Jotta ' + kuvaus.toLowerCase() + ' pysyy hallinnassa', lahde: { tyyppi: 'testi', viite: 'x', pvm: '2026-10-30' }, harjoitteet: harjoitteet || [] });
const JF = (lisa) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'Syöttö', alkoi: '2026-10-05T10:00:00.000Z', kesto_vk: 6, domeeni: 'teknis_taktinen' }, lisa || {});

describe('tmLiitaOhjelmaJaksoon (pure)', () => {
  it('yksi tukitavoite: harjoitteet liitetään siihen JA tukiosa = ensimmäinen tavoite yhdessä suunnitelmassa; kotiin sopivat liikkeet vain; sama id korvataan', () => {
    const p = { id: PID, jaksofokus: JF({ tukitavoitteet: [TV('Liikehallinta', [H('vanha')])] }) }, plan = TT.tmLiitaOhjelmaJaksoon(p, OHJ(), { seuraNimi: 'KPV' });
    expect(Object.keys(plan.polut).sort()).toEqual(['jaksofokus.tukiosa', 'jaksofokus.tukitavoitteet']);
    const t = plan.jaksofokus.tukitavoitteet[0]; expect(t.harjoitteet.map((h) => h.id)).toEqual(['vanha', 'liike1#1', 'liike1#2']); expect(t.harjoitteet[1]).toMatchObject({ lahde: 'seura', ohjelma_id: 'liike1', lahde_nimi: 'KPV' });
    expect(plan.jaksofokus.tukiosa).toEqual({ alue: 'Liikehallinta', perustelu: 'Jotta liikehallinta pysyy hallinnassa', harjoitteet: t.harjoitteet }); expect(JM.tmTukiosa(plan.jaksofokus.tukiosa)).toEqual(plan.jaksofokus.tukiosa);
    expect(plan.polut['jaksofokus.tukiosa']).toEqual(plan.jaksofokus.tukiosa); expect(plan.polut['jaksofokus.tukitavoitteet']).toEqual(plan.jaksofokus.tukitavoitteet);
    const toistuva = TT.tmLiitaOhjelmaJaksoon({ id: PID, jaksofokus: plan.jaksofokus }, OHJ(), {}); expect(toistuva.jaksofokus.tukitavoitteet[0].harjoitteet.map((h) => h.id)).toEqual(['vanha', 'liike1#1', 'liike1#2']);   // sama id ei kahdennu
  });
  it('kaksi tukitavoitetta: liitos valittuun (indeksi); toinen koskematon; tukiosa = ENSIMMÄINEN tavoite liitoksen jälkeen (myös kun liitetään toiseen)', () => {
    const p = { id: PID, jaksofokus: JF({ tukitavoitteet: [TV('Liikehallinta', [H('a')]), TV('Ketteryys', [H('b')])] }) };
    const eka = TT.tmLiitaOhjelmaJaksoon(p, OHJ(), { indeksi: 0 }).jaksofokus; expect(eka.tukitavoitteet[0].harjoitteet.map((h) => h.id)).toEqual(['a', 'liike1#1', 'liike1#2']); expect(eka.tukitavoitteet[1].harjoitteet.map((h) => h.id)).toEqual(['b']); expect(eka.tukiosa.alue).toBe('Liikehallinta'); expect(eka.tukiosa.harjoitteet).toEqual(eka.tukitavoitteet[0].harjoitteet);
    const toka = TT.tmLiitaOhjelmaJaksoon(p, OHJ(), { indeksi: 1 }).jaksofokus; expect(toka.tukitavoitteet[0].harjoitteet.map((h) => h.id)).toEqual(['a']); expect(toka.tukitavoitteet[1].harjoitteet.map((h) => h.id)).toEqual(['b', 'liike1#1', 'liike1#2']); expect(toka.tukiosa.alue).toBe('Liikehallinta'); expect(toka.tukiosa.harjoitteet.map((h) => h.id)).toEqual(['a']);
    expect(TT.tmLiitaOhjelmaJaksoon(p, OHJ(), {}).jaksofokus.tukitavoitteet[0].harjoitteet.length).toBe(3);   // oletus: ensimmäinen
  });
  it('virheellinen indeksi hylätään; ohjelma ilman kotiin sopivia / luonnos hylätään (ei kirjoitusta)', () => {
    const p = { id: PID, jaksofokus: JF({ tukitavoitteet: [TV('Liikehallinta')] }) };
    for (const i of [1, -1, 1.5, 'x']) expect(() => TT.tmLiitaOhjelmaJaksoon(p, OHJ(), { indeksi: i }), String(i)).toThrow(/tukitavoitetta .* ei ole/);
    expect(() => TT.tmLiitaOhjelmaJaksoon(p, OHJ({ liikkeet: [] }), {})).toThrow(/kotiin sopivia/); expect(() => TT.tmLiitaOhjelmaJaksoon(p, OHJ({ tila: 'luonnos' }), {})).toThrow(/hyväksytty/);
  });
  it('VANHA jakso (ei tukitavoitteet-kenttää tai tyhjä lista): käytös ennallaan — vain tukiosa.harjoitteet dot-polulla; ilman tukiosaa heittää kuten ennen', () => {
    const vanha = { id: PID, jaksofokus: JF({ tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaa pelata', harjoitteet: [H('v')] } }) };
    for (const jf of [vanha.jaksofokus, Object.assign({}, vanha.jaksofokus, { tukitavoitteet: [] })]) {
      const plan = TT.tmLiitaOhjelmaJaksoon({ id: PID, jaksofokus: jf }, OHJ(), { indeksi: 1 }); expect(Object.keys(plan.polut)).toEqual(['jaksofokus.tukiosa.harjoitteet']); expect(plan.polut['jaksofokus.tukiosa.harjoitteet'].map((h) => h.id)).toEqual(['v', 'liike1#1', 'liike1#2']); expect(plan.jaksofokus.tukitavoitteet === undefined || plan.jaksofokus.tukitavoitteet.length === 0).toBe(true);
    }
    expect(() => TT.tmLiitaOhjelmaJaksoon({ id: PID, jaksofokus: JF() }, OHJ(), {})).toThrow(/tukiosaa/); expect(() => TT.tmLiitaOhjelmaJaksoon({ id: PID }, OHJ(), {})).toThrow();
  });
  it('kohdevalitsin: vain kun tukitavoitteita ≥ 2; escapaa; ei hex-värejä', () => {
    const esc = (x) => String(x).replace(/</g, '&lt;');
    expect(TT.tmLiitoKohdeValintaHTML(JF({ tukitavoitteet: [TV('A')] }), {})).toBe(''); expect(TT.tmLiitoKohdeValintaHTML(JF(), {})).toBe(''); expect(TT.tmLiitoKohdeValintaHTML(null, {})).toBe('');
    const h = TT.tmLiitoKohdeValintaHTML(JF({ tukitavoitteet: [TV('Liikehallinta'), TV('<b>x</b>')] }), { esc, t: (s) => '«' + s + '»' });
    expect(h).toContain('id="_ohjTtKohde"'); expect(h).toContain('«Liitä tukitavoitteeseen»'); expect(h).toContain('value="0"'); expect(h).toContain('value="1"'); expect(h).toContain('1. Liikehallinta'); expect(h).not.toContain('<b>'); expect(h).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});

function pura(SRC, t) { const i = SRC.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && !--d) return SRC.slice(i, k + 1); } throw new Error('sulkeet'); }
function ymp(sov, { jaksofokus, valinta = null, kaada = false } = {}) {
  const log = { upd: [], toastit: [], renderit: 0 }, p = { id: PID, joukkue: 'KPV U13', jaksofokus };
  const master = sov === 'master', ohj = OHJ();
  const dok = { update: async (d) => { if (kaada) throw new Error('permission-denied'); log.upd.push(d); } };
  const document = { getElementById: (id) => (id === '_ohjTtKohde' && valinta != null ? { value: String(valinta) } : null) };
  const yht = { Promise, Object, Array, JSON, Number, document, console: { warn() {} }, toast: (t, k) => log.toastit.push([t, k]), firebase: { auth: () => ({ currentUser: {} }) } };
  let c;
  if (master) c = Object.assign(yht, { _pelaajatData: [p], _ttPelaaja: () => p, masterT: (x) => x, _demo: false, _seuraId: 'kpv', _mVerkkoEnnenSulkua: () => true, _mTuoreToken: async () => {}, _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => dok }) }) }) }, _renderPinfoFirestore: () => { log.renderit++; }, _ohjKirjasto: [ohj] });
  else { c = Object.assign(yht, { _vpTtPelaaja: () => p, vpT: (x) => x, _vpOhjKirjasto: [ohj], _vpJaksoReRender: () => { log.renderit++; } }); c._vpJfKirjoita = async (pid, upd, viesti, paivita) => { try { await dok.update(upd); paivita(); } catch (e) { c.toast('virhe', 'error'); } }; }
  c.window = c; Object.assign(c.window, { _mSeuraNimi: 'KPV', _vpSeuraNimi: 'KPV', TM_JAKSO_MALLI: JM, TM_KEHITYSSILMUKKA: K, TM_TUKITAVOITTEET: TT, _ohjKirjasto: [ohj], _vpOhjKirjasto: [ohj] }); vm.createContext(c);
  vm.runInContext(pura(master ? MA : VP, master ? 'window._ohjLiitaTukiosaan = async function' : 'window._vpOhjLiitaTukiosaan = async function') + ';', c);
  return { c, p, log, liita: () => (master ? c.window._ohjLiitaTukiosaan(PID, 'liike1') : c.window._vpOhjLiitaTukiosaan(PID, 'liike1')) };
}
describe.each([['master'], ['vp']])('%s · liitos adapterissa', (sov) => {
  it('1 tukitavoite: YKSI update (tukitavoitteet + tukiosa), paikallinen vasta onnistumisen jälkeen', async () => {
    const e = ymp(sov, { jaksofokus: JF({ tukitavoitteet: [TV('Liikehallinta', [H('vanha')])] }) }); await e.liita();
    expect(e.log.upd).toHaveLength(1); expect(Object.keys(e.log.upd[0]).sort()).toEqual(['jaksofokus.tukiosa', 'jaksofokus.tukitavoitteet']); expect(e.p.jaksofokus.tukitavoitteet[0].harjoitteet).toHaveLength(3); expect(e.p.jaksofokus.tukiosa.harjoitteet).toEqual(e.p.jaksofokus.tukitavoitteet[0].harjoitteet);
  });
  it('2 tukitavoitetta: kohdevalitsimen arvo ratkaisee mihin liitetään; tukiosa pysyy ensimmäisenä', async () => {
    const jf = () => JF({ tukitavoitteet: [TV('Liikehallinta', [H('a')]), TV('Ketteryys', [H('b')])] });
    const toka = ymp(sov, { jaksofokus: jf(), valinta: 1 }); await toka.liita(); expect(toka.log.upd).toHaveLength(1); expect(toka.p.jaksofokus.tukitavoitteet[1].harjoitteet.map((h) => h.id)).toEqual(['b', 'liike1#1', 'liike1#2']); expect(toka.p.jaksofokus.tukitavoitteet[0].harjoitteet.map((h) => h.id)).toEqual(['a']); expect(toka.p.jaksofokus.tukiosa.alue).toBe('Liikehallinta');
    const oletus = ymp(sov, { jaksofokus: jf() }); await oletus.liita(); expect(oletus.p.jaksofokus.tukitavoitteet[0].harjoitteet.length).toBe(3);
  });
  it('VANHA jakso: ennallaan (dot-polku jaksofokus.tukiosa.harjoitteet, ei tukitavoitteita)', async () => {
    const e = ymp(sov, { jaksofokus: JF({ tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaa pelata', harjoitteet: [H('v')] } }) }); await e.liita();
    expect(e.log.upd).toHaveLength(1); expect(Object.keys(e.log.upd[0])).toEqual(['jaksofokus.tukiosa.harjoitteet']); expect(e.p.jaksofokus.tukitavoitteet).toBeUndefined();
  });
  it('kirjoitus epäonnistuu → paikallinen tila ennallaan; ei jaksoa → ohje, ei kirjoitusta', async () => {
    const e = ymp(sov, { jaksofokus: JF({ tukitavoitteet: [TV('Liikehallinta')] }), kaada: true }); await e.liita(); expect(e.p.jaksofokus.tukitavoitteet[0].harjoitteet).toEqual([]); expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(true);
    const e2 = ymp(sov, { jaksofokus: undefined }); await e2.liita(); expect(e2.log.upd).toEqual([]); expect(e2.log.toastit.some(([, k]) => k === 'error')).toBe(true);
  });
});
describe('Master: kohdevalitsin ohjelmakirjaston modaalissa', () => {
  it('modaali rakentaa valitsimen vain ≥ 2 tukitavoitteelle (lähdetaso)', () => {
    expect(MA).toContain('tmLiitoKohdeValintaHTML(_pl.jaksofokus'); expect(MA).toContain("document.getElementById('_ohjTtKohde')"); expect(VP).toContain("document.getElementById('_ohjTtKohde')");
  });
});
