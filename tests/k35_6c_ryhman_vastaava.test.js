/* K35-6c (D196): ryhmän vastaava — lib (tmRyhmaSyote vastuu_uid, tmRyhmaVastaa, lomake-select) + kuorikytkennät (Master-oikeus, VP-lomake, kirjoitus). Rules: tests/rules (v3.61). */
const fs = require('fs'), path = require('path');
const R = require('../lib/tm_ryhmat.js');
const MASTER = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_Master_v16.html'), 'utf8'), VP = fs.readFileSync(path.join(__dirname, '..', 'TalentMaster_VP_v25.html'), 'utf8'), RULES = fs.readFileSync(path.join(__dirname, '..', 'tm_admin', 'firestore.rules'), 'utf8');
const base = { nimi: 'Maalivahdit', tyyppi: 'lista', pelaajat_id: ['p1'], valmentajat: ['u1', 'u2'] };

describe('tmRyhmaSyote: vastuu_uid', () => {
  it('vastaava mukaan dataan kun on ryhmän valmentaja; ulkopuolinen / tyhjä → pois (ei kirjoiteta, ei estetä tallennusta)', () => {
    expect(R.tmRyhmaSyote(Object.assign({ vastuu_uid: 'u2' }, base), { johto: true }).data.vastuu_uid).toBe('u2');
    expect('vastuu_uid' in R.tmRyhmaSyote(Object.assign({ vastuu_uid: 'ulkopuolinen' }, base), { johto: true }).data).toBe(false); expect('vastuu_uid' in R.tmRyhmaSyote(Object.assign({ vastuu_uid: '' }, base), { johto: true }).data).toBe(false); expect('vastuu_uid' in R.tmRyhmaSyote(base, { johto: true }).data).toBe(false);
    expect(R.tmRyhmaSyote(Object.assign({ vastuu_uid: 'u2', valmentajat: ['u1'] }, base, { valmentajat: ['u1'] }), { johto: true }).data.vastuu_uid).toBeUndefined();   // vastaava poistettu valmentajista → putoaa
  });
});
describe('tmRyhmaVastaa (peilaa Rules v3.61)', () => {
  const ryhmat = [{ id: 'g1', vastuu_uid: 'u1' }, { id: 'g2' }];
  it('vain ryhmätapahtuma jonka ryhmän vastuu_uid = uid; joukkuetapahtuma, toisen ryhmä, vastuuton ryhmä, puuttuva uid ei', () => {
    const ev = (kohde) => ({ kohde });
    expect(R.tmRyhmaVastaa(ev({ tyyppi: 'ryhma', ryhma_id: 'g1' }), ryhmat, 'u1')).toBe(true); expect(R.tmRyhmaVastaa(ev({ tyyppi: 'ryhma', ryhma_id: 'g1' }), ryhmat, 'u2')).toBe(false);
    expect(R.tmRyhmaVastaa(ev({ tyyppi: 'ryhma', ryhma_id: 'g2' }), ryhmat, 'u1')).toBe(false); expect(R.tmRyhmaVastaa(ev({ tyyppi: 'joukkue' }), ryhmat, 'u1')).toBe(false); expect(R.tmRyhmaVastaa({}, ryhmat, 'u1')).toBe(false); expect(R.tmRyhmaVastaa(ev({ tyyppi: 'ryhma', ryhma_id: 'g1' }), ryhmat, '')).toBe(false); expect(R.tmRyhmaVastaa(null, null, 'u1')).toBe(false);
  });
});
describe('lomake: Ryhmän vastaava -valinta', () => {
  const h = (S, o) => R.tmRyhmaLomakeHTML(S, Object.assign({ valmentajat: [{ id: 'u1', nimi: 'Aatu Aalto' }, { id: 'u2', nimi: 'Beni Berg' }], vastaavaFn: '_ryVastaava', nimiFn: 'a', kuvausFn: 'b', tyyppiFn: 'c', hakuFn: 'd', joukkueFn: 'e', valitseFn: 'f', lisaaNakyvatFn: 'g', tyhjennaFn: 'h', valmentajaFn: 'i', tallennaFn: 'j', peruutaFn: 'k' }, o || {}));
  it('näkyy kun valmentajia valittu: vaihtoehdot = valitut valmentajat nimillä + "Ei vastaavaa"; valittu vastaava selected; ohjeteksti', () => {
    const x = h({ tyyppi: 'lista', valmentajat: ['u1', 'u2'], vastuu_uid: 'u2', pelaajat_id: [] });
    expect(x).toContain('data-ry-vastaava'); expect(x).toContain('onchange="_ryVastaava(this.value)"'); expect(x).toContain('<option value="u2" selected>Beni Berg</option>'); expect(x).toContain('<option value="u1">Aatu Aalto</option>'); expect(x).toContain('— Ei vastaavaa —'); expect(x).toContain('ei tarvitse olla niiden luoja');
  });
  it('ei näy ilman valmentajia eikä ilman vastaavaFn:ää (vanhat adapterit ennallaan); ei hex-värejä; escapataan', () => {
    expect(h({ tyyppi: 'lista', valmentajat: [], pelaajat_id: [] })).not.toContain('data-ry-vastaava'); expect(h({ tyyppi: 'lista', valmentajat: ['u1'], pelaajat_id: [] }, { vastaavaFn: undefined })).not.toContain('data-ry-vastaava');
    expect(h({ tyyppi: 'lista', valmentajat: ['u1'], pelaajat_id: [] })).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(h({ tyyppi: 'lista', valmentajat: ['"><x'], pelaajat_id: [] })).not.toContain('"><x');
  });
});
describe('kuorikytkennät + Rules-vartija', () => {
  it('Master: _calSaaMuokataTapahtuma sallii ryhmän vastaavan (valmennusrooli + tmRyhmaVastaa) — Poista/Muokkaa-napit seuraavat', () => { expect(MASTER).toContain('window.TM_RYHMAT.tmRyhmaVastaa(t, window._mRyLista, _uid)'); expect(MASTER).toMatch(/_calValmentajaRooli\(\) && \(\(t && t\.luoja_uid && t\.luoja_uid === _uid\) \|\| window\.TM_RYHMAT\.tmRyhmaVastaa/); });
  it('VP: lomake saa vastaavaFn:n, tila kantaa vastuu_uid:n, valmentajan poisto nollaa vastaavan, täysi muokkaus ilman vastaavaa poistaa kentän (FieldValue.delete)', () => {
    expect(VP).toContain("vastaavaFn: '_ryVastaava'"); expect(VP).toContain('window._ryVastaava = function (uid)'); expect(VP).toContain("vastuu_uid: r.vastuu_uid || ''"); expect(VP).toContain('if (S.vastuu_uid === uid) S.vastuu_uid = \'\';'); expect(VP).toContain('data.valmentajat && !data.vastuu_uid ? { vastuu_uid: firebase.firestore.FieldValue.delete() }');
  });
  it('Rules v3.61: version, changelog, ryhmaKelpaa sallii vastuu_uid, ryhmanVastaavaTapahtumassa + update-haara kohde/luoja lukittuna (emulaattoritestit: tests/rules)', () => {
    expect(RULES).toMatch(/firestore\.rules v3\.(61|62|63|64|65|66|67)/); expect(RULES).toContain('Muutokset v3.60 → v3.61'); expect(RULES).toContain("'muokattu', 'vastuu_uid'])"); expect(RULES).toContain('function ryhmanVastaavaTapahtumassa(seuraId)'); expect(RULES).toContain("ryhmaDoc(seuraId, resource.data.kohde.ryhma_id).get('vastuu_uid', '') == request.auth.uid");
    expect(RULES).toContain("request.resource.data.kohde.get('ryhma_id', '') == resource.data.kohde.ryhma_id"); expect(RULES).toContain("request.resource.data.get('luoja_uid', '') == resource.data.get('luoja_uid', '')");
    expect(fs.readFileSync(path.join(__dirname, 'rules', 'firestore.rules.test.js'), 'utf8')).toContain("v3.61 · K35-6c (D196)");
  });
});
