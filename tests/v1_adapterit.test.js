/**
 * V1 — Master_v16 + VP_v25 adapterit: lippu liput.kentta, rinnakkaiset konteksti-haut (yhden lähteen virhe ei kaada modaalia), tukitavoiteosio, YKSI update.
 * Fixture: KPV U13 Topias (m93GBdOaGCUuenMiCL0I, PHV LAH, heikko 30 m) · roolit valmentaja JA VP · molemmat sovellukset. Funktiot puretaan lähteestä, ajo vm:ssä oikeilla libeillä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const MA = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8'), VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const L = { AJ: require('../lib/tm_aloita_jakso.js'), TT: require('../lib/tm_tukitavoitteet.js'), JM: require('../lib/tm_jakso_malli.js'), KS: require('../lib/tm_kehityssilmukka.js'), VH: require('../lib/tm_vastuuhenkilo.js'), TAKS: require('../lib/tm_arviointi_taksonomia.js'), KOTI: require('../lib/tm_koti_oletus.js') };
const SNAP = require('./fixtures/aloita_jakso/vanha_lomake.json');
const PID = 'm93GBdOaGCUuenMiCL0I';
const pvmIso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const NYT = new Date(), TANAAN = pvmIso(NYT), paivaaSitten = (n) => pvmIso(new Date(NYT.getTime() - n * 86400000));
const ITEMS = [{ avain: 'y_h2', nimi: 'Saattaen vaihtaminen', koodi: 'Y-H2' }, { avain: 'y_h3', nimi: 'Toinen taito', koodi: null }];
const ADAR = (pvm, pisteet) => ({ tyyppi: 'adar_pikakortti', pvm, pisteet, havaitut: [], nakyvyys: false });
const OHJELMAT = [{ id: 'liike1', nimi: 'Liikehallinnan perusteet', tila: 'hyvaksytty', teema_avain: 'fy_liikehallinta', liikkeet: [{ jarjestys: 1, liike: 'Kontrollipunnerrus', toistot: '3×10', kotiin_sopiva: true }] },
  { id: 'rj1', nimi: 'Räjähtävä voima', tila: 'hyvaksytty', teema_avain: 'fy_rajahtavyys', liikkeet: [{ jarjestys: 1, liike: 'Hyppy', kotiin_sopiva: true }] }];
const PANKKI = [{ id: 'koti1', nimi: 'Seinäsyöttö kotona', tila: 'hyvaksytty', kaytto: 'koti', kotiin_sopiva: true, kehityskohde: null, ohje: 'Syötä seinään', kesto_min: 10 }];

// ── generinen Firestore-tynkä: polku → dokumentti / kokoelma; virheet polun mukaan; kirjaa luvut ja kirjoitukset ──
function fakeDb(S, log) {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const node = (path, ehto) => ({
    get: async () => {
      log.luvut.push(path + (ehto ? '?' + ehto : ''));
      if (S.viive) { log.kaynnissa = (log.kaynnissa || 0) + 1; log.maksimi = Math.max(log.maksimi || 0, log.kaynnissa); await new Promise((r) => setTimeout(r, 15)); log.kaynnissa--; }
      if ((S.virhe || []).indexOf(path) >= 0) throw new Error('permission-denied');
      if (S.docs[path] !== undefined) return { exists: true, id: path.split('/').pop(), data: () => clone(S.docs[path]) };
      if (S.cols[path]) { const rivit = S.cols[path].filter((d) => !ehto || d[ehto.split('=')[0]] === ehto.split('=')[1]); return { size: rivit.length, docs: rivit.map((d, i) => ({ id: d.id || ('d' + i), data: () => clone(d) })) }; }
      return { exists: false, data: () => undefined, size: 0, docs: [] };
    },
    update: async (u) => { if (S.kaada) throw new Error('permission-denied'); log.upd.push({ polku: path, data: u }); },
    collection: (c) => node(path ? path + '/' + c : c), doc: (d) => node(path ? path + '/' + d : d), where: (f, op, v) => node(path, f + '=' + v),
  });
  return node('');
}
const OLETUS = (lisa) => {
  const S = { docs: {
    'seurat/kpv': { nimi: 'KPV', liput: { kentta: true } },
    'seurat/kpv/joukkueet/kpv_u13': { nimi: 'KPV U13', ikaryhma: 'U13', jaksofokus: { alku: TANAAN, kesto_vk: 7, osa_alueet: { tekninen_taktinen: { teema_avain: 't1', nimi: 'Syöttötaito ja -peli', lahde: 'seura' }, fyysinen: { avain: 'fy_ketteryys', nimi: 'Ketteryys ja nopeus', lahde: 'tm' } } } },
    'seurat/kpv/konfiguraatio/arviointi': { kehys: 'palloliitto' } }, cols: {
    ['seurat/kpv/pelaajat/' + PID + '/havainnot']: [ADAR(paivaaSitten(20), { Act: 1 }), ADAR(paivaaSitten(7), { Act: 1 })], 'seurat/kpv/harjoitepankki': PANKKI }, virhe: [], kaada: false };
  return Object.assign(S, lisa || {});
};
const TOPIAS = (lisa) => Object.assign({ id: PID, joukkue: 'KPV U13', syntymaVuosi: 2013, ydinvahvuus_valinta: { vaihtoehto: 'Tempokuljetus' }, hh_viimeisin: { lin30m: 5.8, lin10m: 1.9 }, hh_pvm: paivaaSitten(10), biologinenIka_viimeisin: { phv_tila_koodi: 'LAH' } }, lisa || {});
const KENTAT = (lisa) => Object.assign({ _ajTaito: 'y_h2', _ajYv: 'Tempokuljetus', _ajKesto: '7', _ajVh: '', _ajAlku: TANAAN }, lisa || {});
const lopeta = () => new Promise((r) => setTimeout(r, 0));

function pura(src, t) { const i = src.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && !--d) return src.slice(i, k + 1); } throw new Error('sulkeet'); }
const kehys = (k) => ({ avain: k, nimi: k, asteikko: L.TAKS.TM_ARVIOINTI_ASTEIKKO, taksonomia: L.TAKS.ARVIOINTI_TAKSONOMIA });

function rakenna(sovellus, { pelaaja, kentat = {}, rooli = 'valmentaja', sa = false, S = OLETUS(), verkko = true, ika = 13 } = {}) {
  const master = sovellus === 'master', SRC = master ? MA : VP;
  const log = { upd: [], luvut: [], toastit: [], modal: null, modalHtml: null, renderit: 0, el: kentat };
  const p = TOPIAS(pelaaja);
  const db = fakeDb(S, log);
  const elementti = (id) => (id in kentat ? { value: kentat[id], type: /^_ajTt[VH]_/.test(id) ? 'checkbox' : 'text', checked: kentat[id] === '1' } : null);
  const modalId = master ? '_mAloitaJaksoModal' : '_vpAloitaJaksoModal';
  const document = { getElementById: (id) => (id === modalId ? (log.modal ? { remove() { log.modal = null; } } : null) : elementti(id)), createElement: () => ({ set innerHTML(h) { this._h = h; log.modalHtml = h; }, get firstChild() { return { _h: this._h }; } }), body: { appendChild: (x) => { log.modal = x._h; } } };
  const yht = { Object, Array, String, Number, Promise, JSON, Math, Date, console: { warn() {} }, document, toast: (t, k) => log.toastit.push([t, k]), tmPaivaIso: pvmIso, tmKehys: kehys,
    firebase: { auth: () => ({ currentUser: {} }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } }, _tmHenkiloNimi: () => 'Topias K.' };
  let c;
  if (master) {
    c = Object.assign(yht, { _pelaajatData: [p], _mIdpP: () => p, _mTtItems: () => ITEMS, _mTtEhdotus: () => ({ tyyppi: 'teknis_taktinen', konsepti_avain: 'y_h2' }), _ttNormPositio: () => null, _devIkaSp: () => ({ ika: ika, sp: 'P' }), _mEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      masterT: (x) => x, _rooli: rooli, _superAdmin: sa, _demo: false, _seuraId: 'kpv', _db: db, _mVerkkoEnnenSulkua: () => verkko, _mTuoreToken: async () => {}, _renderPinfoFirestore: () => { log.renderit++; }, _mIdpReRender: () => { log.renderit++; }, _mLataaHenkilosto() {},
      _mJaksoVaihto: (pp, jf) => L.KS.tmAsetaJaksofokus(pp, jf, { nytISO: NYT.toISOString() }), _ohjLataaKirjasto: async () => OHJELMAT, _mSeuraNimi: 'KPV' });
  } else {
    c = Object.assign(yht, { _vpTtPelaaja: () => p, _dimIkaSp: () => ({ ika: ika, sp: 'P' }), _vpTtNormPositio: () => null, _vpTtEhdotus: () => ({ tyyppi: 'teknis_taktinen', konsepti_avain: 'y_h2' }), _ttItems: () => ITEMS, _jsvEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
      vpT: (x) => x, _valmentajat: [{ id: 'u1', nimi: 'Ville', rooli: 'valmentaja' }], _seuraId: 'kpv', _isDemoMode: false, db: db, _vpJfMergeLisakentat() {}, _vpJfKanonNimi: () => 'Saattaen vaihtaminen', _vpOhjLataaKirjasto: async () => OHJELMAT, _vpAloitusReRender() { log.renderit++; }, _vpJaksoReRender() { log.renderit++; }, _vpKehAskelReRender() { log.renderit++; } });
    c._vpJaksoVaihto = (pp, jf) => L.KS.tmAsetaJaksofokus(pp, jf, { nytISO: NYT.toISOString(), tulos: 'vaihdettu' });
    c._vpJfKirjoita = async (pid, upd, viesti, paivita) => { try { await db.collection('seurat').doc('kpv').collection('pelaajat').doc(pid).update(upd); paivita && paivita(); c.toast(viesti, 'ok'); } catch (e) { c.toast('virhe', 'error'); } };
  }
  c.window = c; Object.assign(c.window, { TM_JAKSO_MALLI: L.JM, TM_VASTUUHENKILO: L.VH, TM_ALOITA_JAKSO: L.AJ, TM_TUKITAVOITTEET: L.TT, TM_KOTI_OLETUS: L.KOTI, _mHenkilosto: [], _vpSA: sa, _vpRooli: rooli }); vm.createContext(c);
  const nimet = master
    ? ['function _mAloitaJaksoRivi(', 'function _mAjPelaajaPp(', 'function _mPelaajaNimiAj(', 'async function _mJjLataaLiput(', 'async function _mAjHaeTuki(', 'window._mAloitaJaksoAvaa = async function', 'window._mAloitaJaksoSulje = function', 'window._mAloitaJaksoTallenna = async function']
    : ['async function _vpLataaLiput(', 'async function _vpAjHaeTuki(', 'window._vpAloitaJaksoAvaa = async function', 'window._vpAloitaJaksoSulje = function', 'window._vpAloitaJaksoTallenna = async function'];
  vm.runInContext('window._mJjLiput = {}; window._vpLiput = {};\n' + nimet.map((n) => pura(SRC, n)).join(';\n') + ';', c);
  const w = c.window;
  return { c, p, log, S, avaa: () => (master ? w._mAloitaJaksoAvaa(PID) : w._vpAloitaJaksoAvaa(PID)), tallenna: () => (master ? w._mAloitaJaksoTallenna(PID) : w._vpAloitaJaksoTallenna(PID)), muuttuneet: () => log.upd };
}

describe.each([['master', 'Master_v16'], ['vp', 'VP_v25']])('%s · jakson aloitus', (sov, nimi) => {
  describe.each([['valmentaja', 'valmentaja'], ['vp', 'vp']])('KPV U13 · %s', (_n, rooli) => {
    it('ILMAN LIPPUA: vanha lomake täsmälleen ennallaan (snapshot), ei konteksti-hakuja (vain seura-dokumentin lippu), tallennus vanhalla polulla (tukiosa alue + perustelu)', async () => {
      const S = OLETUS(); S.docs['seurat/kpv'] = { nimi: 'KPV' };   // liput puuttuu (KPV tänään)
      const e = rakenna(sov, { rooli, S, kentat: KENTAT({ _ajAlue: 'kestävyys', _ajPer: 'Jaksaminen tukee pelin lukemista', _ajKesto: '6' }) }); await e.avaa();
      expect(e.log.luvut).toEqual(['seurat/kpv']); expect(e.log.modalHtml).not.toContain('data-aj-tuki'); expect(e.log.modalHtml).not.toContain('_ajAlku'); expect(e.log.modalHtml).toContain('id="_ajAlue"'); expect(e.log.modalHtml).toContain('id="_ajPer"');
      const x = e.c.window[sov === 'master' ? '_mAjX' : '_vpAjX']; expect(x.tuki).toBeUndefined();
      await e.tallenna(); await lopeta(); expect(e.log.upd).toHaveLength(1); const jf = e.log.upd[0].data.jaksofokus; expect(jf.tukiosa).toMatchObject({ alue: 'kestävyys', perustelu: 'Jaksaminen tukee pelin lukemista' }); expect(jf.tukitavoitteet).toBeUndefined(); expect(jf.joukkuejakso_viite).toBeUndefined();
    });
    it('LIPPU false / puuttuu / ei tosi → vanha lomake (liput.kentta pitää olla täsmälleen true)', async () => {
      for (const liput of [{ kentta: false }, { kentta: 'true' }, {}, null]) { const S = OLETUS(); S.docs['seurat/kpv'] = { nimi: 'KPV', liput }; const e = rakenna(sov, { rooli, S }); await e.avaa(); expect(e.log.modalHtml, JSON.stringify(liput)).not.toContain('data-aj-tuki'); expect(e.log.luvut).toEqual(['seurat/kpv']); }
    });
    it('LIPULLA: haut rinnakkain (joukkuejakso, havainnot, arviointikehys-konfiguraatio, prosessiprofiili, harjoitepankki, ohjelmat); Topias LAH: EI nopeusehdotusta testistä → liikehallinta; oletuspäivät joukkuejaksosta', async () => {
      const e = rakenna(sov, { rooli }); await e.avaa();
      for (const polku of ['seurat/kpv/joukkueet/kpv_u13', 'seurat/kpv/pelaajat/' + PID + '/havainnot?tyyppi=adar_pikakortti', 'seurat/kpv/konfiguraatio/arviointi', 'seurat/kpv/konfiguraatio/prosessiprofiili', 'seurat/kpv/harjoitepankki']) expect(e.log.luvut, polku).toContain(polku);
      expect(e.log.luvut.some((x) => /arviointikehys/.test(x))).toBe(false);   // EI arviointikehys/seura-dokumenttia (D31 avoin)
      const x = e.c.window[sov === 'master' ? '_mAjX' : '_vpAjX'], k = x.tuki.kortit;
      expect(x.tuki.maksimi).toBe(1); expect(k[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', valittu: true, kypsyyssuojattu: true }); expect(k.some((c) => ['speed', 'acceleration', 'power', 'endurance'].indexOf(c.asia) >= 0)).toBe(false);
      expect(k[0].harjoitteet.map((h) => h.id)).toEqual(['ohj:liike1']);   // räjähtävä ohjelma ei LAH-pelaajalle
      expect(x.tuki).toMatchObject({ alku: TANAAN, alkuLahde: 'joukkuejakso', kesto: 7, viite: { jid: 'kpv_u13', alku: TANAAN } }); expect(x.kesto.valittu).toBe(7);
      expect(e.log.modalHtml).toContain('data-aj-tuki'); expect(e.log.modalHtml).toContain('Muut vaihtoehdot ('); expect(e.log.modalHtml).toContain('Kirjoita oma'); expect(e.log.modalHtml).toContain('id="_ajAlku"');
    });
    it('HAUT RINNAKKAIN: viiveellä (15 ms/luku) viisi Firestore-lukua on käynnissä yhtä aikaa; kokonaisaika ≈ yksi luku, ei viisi peräkkäin', async () => {
      const S = OLETUS(); S.viive = true; const e = rakenna(sov, { rooli, S }); const t0 = Date.now(); await e.avaa(); const kesto = Date.now() - t0;
      expect(e.log.maksimi).toBeGreaterThanOrEqual(5); expect(e.log.modalHtml).toContain('data-aj-tuki'); expect(kesto).toBeLessThan(15 * 5 + 15);
    });
    it('TALLENNUS: YKSI update pelaajadokkiin — jaksofokus (tukitavoitteet + yhteensopiva tukiosa + joukkuejakso_viite + kotiharjoitteet snapshot) + ydinvahvuus; paikallinen tila vasta onnistumisen jälkeen; modaali sulkeutuu', async () => {
      const e = rakenna(sov, { rooli, kentat: KENTAT({ _ajTtV_0: '1', _ajTtP_0: 'Jotta kuljetuksesi vie maalille asti, kehosi pysyy hallinnassa', _ajTtH_0_0: '1' }) }); await e.avaa(); expect(e.log.modal).toBeTruthy(); await e.tallenna(); await lopeta();
      expect(e.log.upd).toHaveLength(1); expect(e.log.upd[0].polku).toBe('seurat/kpv/pelaajat/' + PID); expect(Object.keys(e.log.upd[0].data).sort()).toEqual(['jaksofokus', 'ydinvahvuus']);
      const jf = e.log.upd[0].data.jaksofokus;
      expect(jf.tukitavoitteet).toHaveLength(1); expect(jf.tukitavoitteet[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', perustelu: 'Jotta kuljetuksesi vie maalille asti, kehosi pysyy hallinnassa', lahde: { tyyppi: 'testi' } });
      expect(jf.tukitavoitteet[0].harjoitteet).toHaveLength(1); expect(jf.tukitavoitteet[0].harjoitteet[0]).toMatchObject({ nimi: 'Kontrollipunnerrus', lahde: 'seura', ohjelma_id: 'liike1' });
      expect(jf.tukiosa).toMatchObject({ alue: 'Liikehallinta ja kehonhallinta', perustelu: 'Jotta kuljetuksesi vie maalille asti, kehosi pysyy hallinnassa' }); expect(jf.tukiosa.harjoitteet).toEqual(jf.tukitavoitteet[0].harjoitteet); expect(L.JM.tmTukiosa(jf.tukiosa)).toEqual(jf.tukiosa);
      expect(jf.joukkuejakso_viite).toEqual({ jid: 'kpv_u13', alku: TANAAN }); expect(jf.kesto_vk).toBe(7); expect(jf.lahde).toBe('valmentaja'); expect(L.JM.tmTarkistaJaksoData(jf)).toEqual([]); expect(e.log.upd[0].data.ydinvahvuus.kuvaus).toBe('Tempokuljetus');
      expect(e.p.jaksofokus.tukitavoitteet).toHaveLength(1); expect(e.log.modal).toBeFalsy(); expect(e.log.toastit.some(([, k]) => k === 'ok')).toBe(true);
    });
    it('"Kirjoita oma" + KIELLETYT: oma tukitavoite menee läpi myönteisenä; kielletty sana → ei kirjoitusta, virhe-toast, lomake jää auki', async () => {
      const oma = (per) => rakenna(sov, { rooli, kentat: KENTAT({ _ajTtV_oma: '1', _ajTtOA: 'henkinen', _ajTtOK: 'Seuraava suoritus virheen jälkeen', _ajTtP_oma: per }) });
      const ok = oma('Jotta pysyt mukana pelissä myös virheen jälkeen'); await ok.avaa(); await ok.tallenna(); await lopeta(); expect(ok.log.upd[0].data.jaksofokus.tukitavoitteet[0]).toMatchObject({ alue: 'henkinen', lahde: { tyyppi: 'suunnitelma', viite: null, pvm: TANAAN } });
      const huono = oma('Tämä on heikkous'); await huono.avaa(); await huono.tallenna(); await lopeta(); expect(huono.log.upd).toEqual([]); expect(huono.log.modal).toBeTruthy(); expect(huono.log.toastit.some(([t, k]) => k === 'error' && /Jaksoa ei voi aloittaa/.test(t) && /kielletyn sanan/.test(t))).toBe(true);
    });
    it('KIRJOITUS EPÄONNISTUU → paikallinen tila EI muutu (ei valheellista onnistumista)', async () => {
      const S = OLETUS(); S.kaada = true; const e = rakenna(sov, { rooli, S, kentat: KENTAT({ _ajTtV_0: '1', _ajTtP_0: 'Kehonhallinta pitää liikkeen sujuvana' }) }); await e.avaa(); await e.tallenna(); await lopeta();
      expect(e.log.upd).toEqual([]); expect(e.p.jaksofokus).toBeUndefined(); expect(e.log.toastit.some(([, k]) => k === 'error')).toBe(true);
    });
    it('YKSI LÄHDE EPÄONNISTUU (tai kaikki) → modaali aukeaa silti, lähde jää pois; lippu luettu mutta konteksti tyhjä → "Kirjoita oma" toimii', async () => {
      const polut = ['seurat/kpv/joukkueet/kpv_u13', 'seurat/kpv/pelaajat/' + PID + '/havainnot', 'seurat/kpv/konfiguraatio/arviointi', 'seurat/kpv/konfiguraatio/prosessiprofiili', 'seurat/kpv/harjoitepankki'];
      for (const rikki of polut) { const S = OLETUS(); S.virhe = [rikki]; const e = rakenna(sov, { rooli, S }); await e.avaa(); expect(e.log.modalHtml, rikki).toContain('data-aj-tuki'); expect(e.log.modal).toBeTruthy(); }
      const S = OLETUS(); S.virhe = polut; const e = rakenna(sov, { rooli, S, kentat: KENTAT({ _ajTtV_oma: '1', _ajTtOA: 'tekninen_taktinen', _ajTtOK: 'Pallon suojaaminen', _ajTtP_oma: 'Jotta pallo pysyy sinulla paineessa' }) });
      await e.avaa(); expect(e.log.modalHtml).toContain('data-aj-tuki'); expect(e.log.modalHtml).toContain('Kirjoita oma'); await e.tallenna(); await lopeta(); expect(e.log.upd).toHaveLength(1); expect(e.log.upd[0].data.jaksofokus.joukkuejakso_viite).toBeUndefined();
      // ohjelmat-lähde (kirjasto) kaatuu → ohjelmia ei, ei kaadu
      const e2 = rakenna(sov, { rooli }); e2.c._ohjLataaKirjasto = async () => { throw new Error('boom'); }; e2.c._vpOhjLataaKirjasto = async () => { throw new Error('boom'); }; await e2.avaa(); expect(e2.log.modalHtml).toContain('data-aj-tuki');
    });
    it('IKÄVAIHE: Leikkijä (10 v) → tukiosio piilossa, jakso aloitettavissa ilman tukitavoitetta; Showcase (16 v) → enintään 2', async () => {
      const l = rakenna(sov, { rooli, ika: 10, kentat: KENTAT({ _ajKesto: '12' }) }); await l.avaa(); expect(l.log.modalHtml).not.toContain('data-aj-tuki'); expect(l.log.modalHtml).not.toContain('id="_ajAlue"'); await l.tallenna(); await lopeta();
      expect(l.log.upd).toHaveLength(1); expect(l.log.upd[0].data.jaksofokus.tukitavoitteet).toEqual([]); expect(l.log.upd[0].data.jaksofokus.tukiosa).toBeNull();
      const kentat = KENTAT({ _ajKesto: '6', _ajTtV_0: '1', _ajTtP_0: 'Kehonhallinta pitää liikkeen sujuvana', _ajTtV_oma: '1', _ajTtOA: 'henkinen', _ajTtOK: 'Seuraava suoritus', _ajTtP_oma: 'Jotta pysyt mukana pelissä' });
      const s = rakenna(sov, { rooli, ika: 16, kentat }); await s.avaa(); await s.tallenna(); await lopeta(); expect(s.log.upd[0].data.jaksofokus.tukitavoitteet).toHaveLength(2);
      const r = rakenna(sov, { rooli, ika: 13, kentat }); await r.avaa(); await r.tallenna(); await lopeta(); expect(r.log.upd).toEqual([]); expect(r.log.toastit.some(([t, k]) => k === 'error' && /enintään 1/.test(t))).toBe(true);
    });
    it('OLETUSPÄIVÄT: joukkuejakson päivät oletuksena, valmentaja voi poiketa (alkoi muuttuu, viite säilyy); ei aktiivista joukkuejaksoa → tänään', async () => {
      const S = OLETUS(); S.docs['seurat/kpv/joukkueet/kpv_u13'].jaksofokus.alku = pvmIso(new Date(NYT.getTime() + 7 * 86400000)); const alku = S.docs['seurat/kpv/joukkueet/kpv_u13'].jaksofokus.alku;
      const e = rakenna(sov, { rooli, S, kentat: KENTAT({ _ajAlku: alku, _ajTtV_0: '1', _ajTtP_0: 'Kehonhallinta pitää liikkeen sujuvana' }) }); await e.avaa(); expect(e.log.modalHtml).toContain('value="' + alku + '"'); expect(e.log.modalHtml).toContain('Joukkuejakson päivät — voit poiketa.');
      await e.tallenna(); await lopeta(); expect(pvmIso(new Date(e.log.upd[0].data.jaksofokus.alkoi))).toBe(alku); expect(e.log.upd[0].data.jaksofokus.joukkuejakso_viite.alku).toBe(alku);
      const poik = rakenna(sov, { rooli, S, kentat: KENTAT({ _ajAlku: TANAAN, _ajTtV_0: '1', _ajTtP_0: 'Kehonhallinta pitää liikkeen sujuvana' }) }); await poik.avaa(); await poik.tallenna(); await lopeta(); expect(poik.log.upd[0].data.jaksofokus.joukkuejakso_viite.alku).toBe(alku);
      const S2 = OLETUS(); S2.docs['seurat/kpv/joukkueet/kpv_u13'].jaksofokus.alku = paivaaSitten(100); const e2 = rakenna(sov, { rooli, S: S2 }); await e2.avaa(); expect(e2.c.window[sov === 'master' ? '_mAjX' : '_vpAjX'].tuki).toMatchObject({ alku: TANAAN, alkuLahde: 'tanaan', viite: null });
    });
    it('POST-pelaaja (ei kypsyysrajausta): testistä johdettu nopeus/kiihdytys tarjotaan sellaisenaan — vartija koskee vain PRE/LAH/PH/tuntematon', async () => {
      const e = rakenna(sov, { rooli, pelaaja: { biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } } }); await e.avaa(); const k = e.c.window[sov === 'master' ? '_mAjX' : '_vpAjX'].tuki.kortit;
      expect(k[0]).toMatchObject({ alue: 'fyysinen', asia: 'speed', kuvaus: 'Nopeus', lahde: { tyyppi: 'testi' } }); expect(k.some((c) => c.kypsyyssuojattu)).toBe(false);   // heikoin ensin: 30 m (taso 1) → nopeus
    });
  });
});

describe('sovellusten lähdetaso', () => {
  it('molemmat lataavat uudet libit ja nostetut ?v-versiot; lippu luetaan seura-dokumentista; arviointikehys vain tmKehys():llä (ei arviointikehys/seura)', () => {
    for (const [nimi, SRC] of [['Master', MA], ['VP', VP]]) {
      expect(SRC, nimi).toContain('<script src="lib/tm_aloita_jakso.js?v=2"></script>'); expect(SRC, nimi).toContain('<script src="lib/tm_koti_oletus.js?v=1"></script>'); expect(SRC, nimi).toContain('<script src="lib/tm_tukitavoitteet.js?v=2"></script>'); expect(SRC, nimi).toContain('<script src="lib/tm_jakso_malli.js?v=2"></script>'); expect(SRC, nimi).toContain('<script src="lib/tm_idp.js?v=12"></script>');
      expect(SRC, nimi).toContain('tmKehys(avain || \'palloliitto\')'); expect(SRC, nimi).toContain('Promise.all(['); expect(SRC, nimi).toMatch(/liput\.kentta === true/);
      expect(SRC, nimi).not.toMatch(/collection\('arviointikehys'\)/);
    }
  });
  it('uusi markup ei sisällä hex-värejä eikä ketjunimiä (lib + adapterit)', () => {
    const lib = readFileSync(join(juuri, 'lib', 'tm_aloita_jakso.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); expect(lib).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); expect(lib).not.toMatch(/\b(SBL|SFL|DIAG|DFL)\b/);
  });
});
