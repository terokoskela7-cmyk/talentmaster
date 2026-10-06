/**
 * D-3 — jakson aloitus (valmentaja/VP, Master_v16): ydinvahvuus (pelaajan valinta vahvistettuna tai oma), tukiosa {alue, perustelu}, kesto ikävaiheen mukaan (D7), vastuuhenkilö.
 * Avaa #823:n "Liitä jakson kotiharjoitteiksi" (tukiosa syntyy tässä). EI katselmuksia, sulkua, joukkuejaksoa, automaattista ehdotusta. Fixture: KPV U13 -testipelaaja Topias.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const JM = require('../lib/tm_jakso_malli.js'), K = require('../lib/tm_kehityssilmukka.js'), VH = require('../lib/tm_vastuuhenkilo.js'), AJ = require('../lib/tm_aloita_jakso.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..'), MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
const PID = 'm93GBdOaGCUuenMiCL0I', PVM = '2026-10-07', NYT = '2026-10-07T08:00:00.000Z';
const SYOTE = (lisa) => Object.assign({ konsepti_avain: 'y_h2', konsepti_nimi: 'Saattaen vaihtaminen', ydinvahvuus_kuvaus: 'Näkee pelin hyvin', tukiosa_alue: 'kestävyys', tukiosa_perustelu: 'Jaksaminen tukee pelin lukemista loppuun asti' }, lisa || {});
const OPTS = (lisa) => Object.assign({ tanaan: PVM, rooli: 'vp', ika: 13, nytISO: NYT }, lisa || {});

describe('lib: tmJaksonKesto (D7) + tmAloitaJakso', () => {
  it('kesto ikävaiheen mukaan: ≤12 Kevyt 12 vk · 13–15 Perus 6–8 (oletus 6) · ≥16 Tiivis 6 · tuntematon → Perus', () => {
    expect(JM.tmJaksonKesto(8)).toMatchObject({ profiili: 'kevyt', oletus: 12, vaihtoehdot: [12] }); expect(JM.tmJaksonKesto(12).oletus).toBe(12);
    expect(JM.tmJaksonKesto(13)).toMatchObject({ profiili: 'perus', oletus: 6, min: 6, max: 8, vaihtoehdot: [6, 7, 8] }); expect(JM.tmJaksonKesto(15).vaihtoehdot).toEqual([6, 7, 8]);
    expect(JM.tmJaksonKesto(16)).toMatchObject({ profiili: 'tiivis', vaihtoehdot: [6] }); expect(JM.tmJaksonKesto(19).oletus).toBe(6); expect(JM.tmJaksonKesto(null).profiili).toBe('perus'); expect(JM.tmJaksonKesto(undefined).oletus).toBe(6);
  });
  it('aloitus: jaksofokus {taito, alkoi, kesto, lahde valmentaja, tukiosa {alue, perustelu, harjoitteet:[]}} + ydinvahvuus {kuvaus, havaittu_pvm tänään, rooli}; oletuskesto ikävaiheesta; domeeni oletuksena teknis_taktinen', () => {
    const r = JM.tmAloitaJakso({ syntymaVuosi: 2013 }, SYOTE(), OPTS());
    expect(r.jaksofokus).toEqual({ konsepti_avain: 'y_h2', konsepti_nimi: 'Saattaen vaihtaminen', konsepti_koodi: null, alkoi: NYT, kesto_vk: 6, lahde: 'valmentaja', asetti: { rooli: 'vp', pvm: PVM }, domeeni: 'teknis_taktinen', tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaminen tukee pelin lukemista loppuun asti', harjoitteet: [] } });
    expect(r.ydinvahvuus).toEqual({ kuvaus: 'Näkee pelin hyvin', havaittu_pvm: PVM, rooli: 'vp' });
    expect(JM.tmAloitaJakso({}, SYOTE(), OPTS({ ika: 10 })).jaksofokus.kesto_vk).toBe(12); expect(JM.tmAloitaJakso({}, SYOTE({ kesto_vk: '8' }), OPTS()).jaksofokus.kesto_vk).toBe(8);
  });
  it('virheet (selkeät): puuttuva taito/ydinvahvuus/alue/perustelu, kesto ikävaiheen rajojen ulkopuolella, GDPR-sanat (heikkous/rajoite/kriittinen) perustelussa/ydinvahvuudessa/alueessa, ei-henkilökunnan rooli, virheellinen päivä', () => {
    for (const [lisa, re] of [[{ konsepti_avain: '' }, /taito/], [{ ydinvahvuus_kuvaus: '' }, /ydinvahvuus\.kuvaus puuttuu/], [{ tukiosa_alue: '' }, /tukiosa\.alue puuttuu/], [{ tukiosa_perustelu: '  ' }, /tukiosa\.perustelu/],
      [{ kesto_vk: 5 }, /kesto 5 vk ei sovi/], [{ kesto_vk: 9 }, /kesto 9 vk/], [{ kesto_vk: 'x' }, /kesto x vk/], [{ tukiosa_perustelu: 'Tämä on heikkous' }, /kielletyn sanan/], [{ ydinvahvuus_kuvaus: 'kriittinen taito' }, /kielletyn sanan/], [{ tukiosa_alue: 'rajoite' }, /kielletyn sanan/]])
      expect(() => JM.tmAloitaJakso({}, SYOTE(lisa), OPTS()), JSON.stringify(lisa)).toThrow(re);
    expect(() => JM.tmAloitaJakso({}, SYOTE({ konsepti_avain: 'rajoite_x' }), OPTS())).toThrow(/kielletyn sanan\/avaimen/);   // taidon avain (ei vapaa teksti) kulkee jakso-vartijan läpi
    expect(() => JM.tmAloitaJakso({}, SYOTE(), OPTS({ rooli: 'pelaaja' }))).toThrow(/henkilökunnan rooli/); expect(() => JM.tmAloitaJakso({}, SYOTE(), OPTS({ tanaan: '07.10.2026' }))).toThrow(/päivämäärä/); expect(() => JM.tmAloitaJakso({}, SYOTE(), OPTS({ ika: 16 }), 0) && JM.tmAloitaJakso({}, SYOTE({ kesto_vk: 7 }), OPTS({ ika: 16 }))).toThrow(/kesto 7/);
  });
  it('kypsyyssuoja: POST-PHV + fyysinen ydinvahvuus → vihje harkitse_tekninen_tai_taktinen (§25); muuten null; kenttänimet neutraaleja (GDPR-vartija)', () => {
    expect(JM.tmAloitaJakso({}, SYOTE({ ydinvahvuus_kuvaus: 'Voima ja nopeus' }), OPTS({ deps: { varhainKypsynyt: () => true } })).vihje).toBe('harkitse_tekninen_tai_taktinen'); expect(JM.tmAloitaJakso({}, SYOTE(), OPTS()).vihje).toBeNull();
    const r = JM.tmAloitaJakso({}, SYOTE(), OPTS()); expect(JM.tmTarkistaJaksoData(r)).toEqual([]);
  });
  it('tulos kelpaa #823:n liitokseen: tmLiitaTukiosaan(tukiosa, ohjelman liikkeet) toimii heti aloituksen jälkeen', () => {
    const r = JM.tmAloitaJakso({}, SYOTE(), OPTS()), uudet = JM.tmOhjelmaTukiosaan({ id: 'o1', nimi: 'L2', tila: 'hyvaksytty', lahde: 'seura', liikkeet: [{ jarjestys: 1, liike: 'Narulla hyppely', kotiin_sopiva: true }] }, { seuraNimi: 'KPV' });
    expect(JM.tmLiitaTukiosaan(r.jaksofokus.tukiosa, uudet).map((x) => x.id)).toEqual(['o1#1']);
  });
});

function pura(t) { const i = MA.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = MA.indexOf('{', i); k < MA.length; k++) { if (MA[k] === '{') d++; else if (MA[k] === '}' && !--d) return MA.slice(i, k + 1); } throw new Error('sulkeet'); }
const ITEMS = [{ avain: 'y_h2', nimi: 'Saattaen vaihtaminen', koodi: 'Y-H2' }, { avain: 'y_h3', nimi: 'Toinen taito', koodi: null }];
function ymp({ pelaaja, kentat = {}, demo = false, kaada = false, rooli = 'valmentaja', sa = false } = {}) {
  const log = { upd: [], toastit: [], renderit: 0, modal: null, suljettu: 0 };
  const p = Object.assign({ id: PID, joukkue: 'KPV U13', syntymaVuosi: 2013 }, pelaaja || {});
  const elementit = {}; const dok = { update: async (d) => { if (kaada) throw new Error('permission-denied'); log.upd.push(d); } };
  const el = (id) => (id in kentat ? { value: kentat[id] } : null);
  const document = { getElementById: (id) => (id === '_mAloitaJaksoModal' ? (log.modal ? { remove() { log.modal = null; log.suljettu++; } } : null) : el(id)), createElement: () => ({ set innerHTML(h) { this._h = h; }, get firstChild() { return { _h: this._h }; } }), body: { appendChild: (x) => { log.modal = x._h; } } };
  const c = { _pelaajatData: [p], _mIdpP: () => p, _mTtItems: () => ITEMS, _mTtEhdotus: () => ({ tyyppi: 'teknis_taktinen', konsepti_avain: 'y_h2' }), _ttNormPositio: () => null, _devIkaSp: () => ({ ika: 13 }), _mEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    masterT: (x) => x, tmPaivaIso: () => PVM, toast: (t, k) => log.toastit.push([t, k]), console: { warn() {} }, _rooli: rooli, _superAdmin: sa, _demo: demo, _seuraId: 'kpv', _db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => dok }) }) }) }, _mVerkkoEnnenSulkua: () => true, _mTuoreToken: async () => {},
    firebase: { auth: () => ({ currentUser: {} }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } }, _renderPinfoFirestore: () => { log.renderit++; }, _mIdpReRender: () => { log.renderit++; }, _tmHenkiloNimi: () => 'Topias K.', _mLataaHenkilosto() {},
    _mJaksoVaihto: (pp, jf) => K.tmAsetaJaksofokus(pp, jf, { nytISO: NYT }), document, Object, Array, String, Number, Promise, JSON };
  c.window = c; c.window.TM_JAKSO_MALLI = JM; c.window.TM_VASTUUHENKILO = VH; c.window.TM_ALOITA_JAKSO = AJ; c.window._mHenkilosto = [{ id: 'u-valm', nimi: 'Veera Valmentaja', rooli: 'valmentaja' }, { id: 'u-vp', nimi: 'Vilma VP', rooli: 'vp' }]; vm.createContext(c);
  vm.runInContext([pura('function _mAloitaJaksoRivi('), pura('function _mAjPelaajaPp('), pura('function _mPelaajaNimiAj('), pura('window._mAloitaJaksoAvaa = async function'), pura('window._mAloitaJaksoSulje = function'), pura('window._mAloitaJaksoTallenna = async function')].join(';\n') + ';', c);
  return { c, p, log };
}
const KENTAT = (lisa) => Object.assign({ _ajTaito: 'y_h2', _ajYv: 'Näkee pelin hyvin', _ajAlue: 'kestävyys', _ajPer: 'Jaksaminen tukee pelin lukemista', _ajKesto: '6', _ajVh: '' }, lisa || {});

describe('Master: jakson aloitus (D-3)', () => {
  it('rivi: nappi vain muokkausoikeudella; "Vahvista jakso" kun pelaajan valinta odottaa (tila valittavana), muuten "Aloita jakso"', () => {
    const e = ymp(); expect(e.c._mAloitaJaksoRivi(e.p, true)).toContain('Aloita jakso'); expect(e.c._mAloitaJaksoRivi(e.p, false)).toBe('');
    const o = ymp({ pelaaja: { ydinvahvuus_valinta: { vaihtoehto: 'saattaen vaihtaminen' }, jaksofokus: { konsepti_avain: 'y_h2', tila: 'valittavana' } } }); expect(o.c._mAloitaJaksoRivi(o.p, true)).toContain('Vahvista jakso');
  });
  it('modaali: taidot, ydinvahvuus esitäytettynä pelaajan valinnasta, kesto ikävaiheen vaihtoehdot (13 v → 6/7/8), vastuuhenkilö-valitsin; ei hex-värejä', async () => {
    const e = ymp({ pelaaja: { ydinvahvuus_valinta: { vaihtoehto: 'saattaen vaihtaminen' } } }); await e.c.window._mAloitaJaksoAvaa(PID); const h = e.log.modal;
    expect(h).toContain('id="_ajTaito"'); expect(h).toContain('Saattaen vaihtaminen'); expect(h).toContain('Pelaaja valitsi ydinvahvuutensa'); expect(h).toMatch(/id="_ajYv"[^>]*>saattaen vaihtaminen</);
    expect(h).toMatch(/<option value="6" selected>6<\/option><option value="7">7<\/option><option value="8">8<\/option>/); expect(h).toContain('Veera Valmentaja · valmentaja'); expect(h).toContain('Vilma VP · vp'); expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/);
    const e2 = ymp({ pelaaja: { ydinvahvuus: { kuvaus: 'Oma kuvaus', havaittu_pvm: '2026-09-01', rooli: 'valmentaja' }, ydinvahvuus_valinta: { vaihtoehto: 'x' } } }); await e2.c.window._mAloitaJaksoAvaa(PID); expect(e2.log.modal).toMatch(/id="_ajYv"[^>]*>Oma kuvaus</);   // valmentajan oma voittaa esitäytössä
  });
  it('tallennus: YKSI update {jaksofokus (tukiosa + kesto + lahde valmentaja), ydinvahvuus} (+ vastuuhenkilö kun valittu); paikallinen vasta onnistumisen jälkeen; modaali sulkeutuu; toast ok', async () => {
    const e = ymp({ kentat: KENTAT({ _ajVh: 'u-valm|apuvalmentaja' }) }); await e.c.window._mAloitaJaksoAvaa(PID); await e.c.window._mAloitaJaksoTallenna(PID);
    expect(e.log.upd.length).toBe(1); const u = e.log.upd[0]; expect(Object.keys(u).sort()).toEqual(['jaksofokus', 'vastuuhenkilo', 'ydinvahvuus']);
    expect(u.jaksofokus).toMatchObject({ konsepti_avain: 'y_h2', konsepti_koodi: 'Y-H2', kesto_vk: 6, lahde: 'valmentaja', tukiosa: { alue: 'kestävyys', perustelu: 'Jaksaminen tukee pelin lukemista', harjoitteet: [] } });
    expect(u.ydinvahvuus).toEqual({ kuvaus: 'Näkee pelin hyvin', havaittu_pvm: PVM, rooli: 'valmentaja' }); expect(u.vastuuhenkilo).toEqual({ uid: 'u-valm', rooli: 'apuvalmentaja', asetettu_pvm: PVM });
    expect(e.p.jaksofokus.tukiosa.alue).toBe('kestävyys'); expect(e.p.ydinvahvuus.kuvaus).toBe('Näkee pelin hyvin'); expect(e.p.vastuuhenkilo.uid).toBe('u-valm'); expect(e.log.suljettu).toBe(1); expect(e.log.toastit.at(-1)[1]).toBe('ok');
  });
  it('ilman vastuuhenkilövalintaa vastuuhenkilöä ei kirjoiteta; SA saa roolin vp; edellinen eri jakso arkistoituu historiaan (arrayUnion)', async () => {
    const e = ymp({ sa: true, rooli: 'super_admin', kentat: KENTAT(), pelaaja: { jaksofokus: { konsepti_avain: 'y_h9', konsepti_nimi: 'Vanha', alkoi: '2026-08-01T10:00:00.000Z', kesto_vk: 6 } } }); await e.c.window._mAloitaJaksoTallenna(PID);
    const u = e.log.upd[0]; expect('vastuuhenkilo' in u).toBe(false); expect(u.ydinvahvuus.rooli).toBe('vp'); expect(u.jaksofokus_historia).toHaveProperty('__arrayUnion'); expect(u.jaksofokus_historia.__arrayUnion[0]).toMatchObject({ konsepti_avain: 'y_h9', sulkutapa: 'korvattu' });
  });
  it('pelaajan valinnan VAHVISTUS: sama taito + tila "valittavana" → uusi jakso on aktiivinen (tila-kenttä poistuu), alkoi säilyy; D-1 "valinta_odottaa" lakkaa', async () => {
    const e = ymp({ kentat: KENTAT(), pelaaja: { ydinvahvuus_valinta: { vaihtoehto: 'saattaen vaihtaminen' }, jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'Saattaen vaihtaminen', alkoi: '2026-10-05T10:00:00.000Z', kesto_vk: 6, tila: 'valittavana' } } });
    await e.c.window._mAloitaJaksoTallenna(PID); const jf = e.log.upd[0].jaksofokus; expect('tila' in jf).toBe(false); expect(jf.alkoi).toBe('2026-10-05T10:00:00.000Z'); expect(e.p.jaksofokus.tila).toBeUndefined();
    const SA = require('../lib/tm_seuraava_askel.js'); expect(SA.tmSeuraavaAskel(Object.assign({}, e.p, { review_viimeisin_pvm: PVM }), { nyt: Date.parse(NYT), deps: {} }).avain).not.toBe('valinta_odottaa');
  });
  it('VIRHEET eivät kirjoita: puuttuva perustelu / GDPR-sana / liian pitkä kesto → ohjeellinen virhe-toast, ei update, ei paikallista muutosta, modaali jää auki; kirjoitusvirhe → toast + ei paikallista muutosta; demo → ei kirjoitusta', async () => {
    for (const lisa of [{ _ajPer: '' }, { _ajPer: 'Tämä on heikkous' }, { _ajKesto: '12' }, { _ajYv: '' }, { _ajAlue: '' }]) {
      const e = ymp({ kentat: KENTAT(lisa) }); await e.c.window._mAloitaJaksoAvaa(PID); await e.c.window._mAloitaJaksoTallenna(PID);
      expect(e.log.upd, JSON.stringify(lisa)).toEqual([]); expect(e.p.jaksofokus).toBeUndefined(); expect(e.log.toastit.at(-1)[1]).toBe('error'); expect(e.log.toastit.at(-1)[0]).toMatch(/^Jaksoa ei voi aloittaa: /); expect(e.log.toastit.at(-1)[0]).not.toContain('tm_jakso_malli'); expect(e.log.modal).not.toBeNull();
    }
    const k = ymp({ kentat: KENTAT(), kaada: true }); await k.c.window._mAloitaJaksoAvaa(PID); await k.c.window._mAloitaJaksoTallenna(PID); expect(k.p.jaksofokus).toBeUndefined(); expect(k.p.ydinvahvuus).toBeUndefined(); expect(k.log.toastit.at(-1)[1]).toBe('error'); expect(k.log.modal).not.toBeNull();
    const d = ymp({ kentat: KENTAT(), demo: true }); await d.c.window._mAloitaJaksoTallenna(PID); expect(d.log.upd).toEqual([]); expect(d.p.jaksofokus.tukiosa.alue).toBe('kestävyys');
  });
  it('lähde: nappirivi IDP-kortissa teeman ja vastuuhenkilön välissä; tallennus käyttää tmAloitaJakso + _mJaksoVaihto (ei omaa päättelyä); ei kirjoitusta ohjelmat/harjoitepankki-kokoelmiin', () => {
    const k = pura('function _mIdpKorttiHTML('); expect(k.indexOf('_mAloitaJaksoRivi(p, editable)')).toBeGreaterThan(k.indexOf('_mTeemaRivi(p)')); expect(k.indexOf('_mAloitaJaksoRivi(p, editable)')).toBeLessThan(k.indexOf('_mVastuuhenkiloRivi(p, editable)'));
    const t = pura('window._mAloitaJaksoTallenna = async function'); expect(t).toContain('JM.tmAloitaJakso('); expect(t).toContain('_mJaksoVaihto('); expect(t).not.toMatch(/collection\('(ohjelmat|harjoitepankki)'\)/);
  });
});
