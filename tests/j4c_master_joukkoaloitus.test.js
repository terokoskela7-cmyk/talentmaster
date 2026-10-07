/**
 * J4 C — Master_v16 Kausi → Joukkueen jakso → "Pelaajien jaksot" (adapteri): lippu, lista (kaksoiskysely), rajattu rinnakkaisuus, Hyväksy / Avaa / Hyväksy kaikki (peräkkäin, ei batchia).
 * Fixture: KPV U13 (kpv_u13) · Topias (PHV LAH) + muut · roolit valmentaja JA VP. Funktiot puretaan lähteestä, ajo vm:ssä oikeilla libeillä.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const MA = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Master_v16.html'), 'utf8');
const L = { AJ: require('../lib/tm_aloita_jakso.js'), TT: require('../lib/tm_tukitavoitteet.js'), JM: require('../lib/tm_jakso_malli.js'), KS: require('../lib/tm_kehityssilmukka.js'), VH: require('../lib/tm_vastuuhenkilo.js'), VL: require('../lib/tm_valmennuslinja.js'),
  JJ: require('../lib/tm_joukkuejakso.js'), JA: require('../lib/tm_joukkoaloitus.js'), TAKS: require('../lib/tm_arviointi_taksonomia.js'), KOTI: require('../lib/tm_koti_oletus.js'), FY: require('../lib/tm_fyysteemat.js') };
const pvmIso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const NYT = new Date(), TANAAN = pvmIso(NYT), sitten = (n) => pvmIso(new Date(NYT.getTime() - n * 86400000));
const TOPIAS_ID = 'm93GBdOaGCUuenMiCL0I';
const ITEMS = [{ avain: 'y_h2', nimi: 'Saattaen vaihtaminen', koodi: 'Y-H2' }];
const ADAR = (pvm) => ({ tyyppi: 'adar_pikakortti', pvm, pisteet: { Act: 1 }, nakyvyys: false });
const YV = { kuvaus: 'Tempokuljetus', havaittu_pvm: '2026-10-01', rooli: 'vp' };
const PEL = (id, nimi, lisa) => Object.assign({ id, nimi, etunimi: nimi, joukkue: 'KPV U13', syntymaVuosi: 2013, ydinvahvuus: YV, hh_viimeisin: { lin30m: 5.8, lin10m: 1.9 }, hh_pvm: sitten(10), biologinenIka_viimeisin: { phv_tila_koodi: 'LAH' } }, lisa || {});
const ROSTERI = () => [PEL(TOPIAS_ID, 'Topias'), PEL('p_post', 'Pauli', { ydinvahvuus: null, ydinvahvuus_valinta: { vaihtoehto: 'Näkee pelin hyvin' }, biologinenIka_viimeisin: { phv_tila_koodi: 'POST' } }),
  PEL('p_kaynnissa', 'Kalle', { jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'X', alkoi: new Date().toISOString(), kesto_vk: 6 } }), PEL('p_eiyv', 'Eino', { ydinvahvuus: null }), PEL('p_vika', 'Viljami'),
  PEL('p_leikki', 'Lauri', { _ika: 10 }), PEL('p_toinen', 'Toivo', { joukkue: 'KPV U12', joukkueet: ['kpv_u12'] }), PEL('p_kaksois', 'Kaarlo', { joukkue: 'Muu nimi', joukkueet: ['kpv_u13'] })];

function fakeDb(S, log) {
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const node = (path, ehto) => ({
    get: async () => {
      log.luvut.push(path + (ehto ? '?' + ehto : ''));
      const hav = /pelaajat\/[^/]+\/havainnot$/.test(path);
      if (S.viive || hav) { log.kaynnissa = (log.kaynnissa || 0) + (hav ? 1 : 0); log.maksHav = Math.max(log.maksHav || 0, log.kaynnissa || 0); await new Promise((r) => setTimeout(r, S.viive ? 12 : 0)); if (hav) log.kaynnissa--; }
      if ((S.virhe || []).some((v) => path.indexOf(v) >= 0)) throw new Error('permission-denied');
      if (S.docs[path] !== undefined) return { exists: true, id: path.split('/').pop(), data: () => clone(S.docs[path]) };
      if (S.cols[path]) { const rivit = S.cols[path].filter((d) => !ehto || d[ehto.split('=')[0]] === ehto.split('=')[1]); return { size: rivit.length, docs: rivit.map((d, i) => ({ id: d.id || ('d' + i), data: () => clone(d) })) }; }
      return { exists: false, data: () => undefined, size: 0, docs: [] };
    },
    update: async (u) => { log.yritykset.push(path); if ((S.kaadaPid || []).some((v) => path.endsWith('/' + v))) throw Object.assign(new Error('permission-denied'), { code: 'permission-denied' }); log.upd.push({ polku: path, data: u }); },
    collection: (c) => node(path ? path + '/' + c : c), doc: (d) => node(path ? path + '/' + d : d), where: (f, op, v) => node(path, f + '=' + v),
  });
  return node('');
}
const OHJ = [{ id: 'liike1', nimi: 'Liikehallinnan perusteet', tila: 'hyvaksytty', teema_avain: 'fy_liikehallinta', liikkeet: [{ jarjestys: 1, liike: 'Kontrollipunnerrus', kotiin_sopiva: true }] }];
const OLETUS = (lisa) => Object.assign({ docs: {
  'seurat/kpv': { nimi: 'KPV', liput: { kentta: true } },
  'seurat/kpv/joukkueet/kpv_u13': { nimi: 'KPV U13', ikaryhma: 'U13', jaksofokus: { alku: TANAAN, kesto_vk: 7, osa_alueet: { tekninen_taktinen: { teema_avain: 't1', nimi: 'Syöttö', lahde: 'seura' }, fyysinen: { avain: 'fy_ketteryys', nimi: 'Ketteryys ja nopeus', lahde: 'tm' } } } } },
  cols: { 'seurat/kpv/harjoitepankki': [] }, virhe: [], kaadaPid: [] }, lisa || {});
const lopeta = (n) => new Promise((r) => setTimeout(r, n || 0));
function pura(t) { const i = MA.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = MA.indexOf('{', i); k < MA.length; k++) { if (MA[k] === '{') d++; else if (MA[k] === '}' && !--d) return MA.slice(i, k + 1); } throw new Error('sulkeet'); }

function rakenna({ rooli = 'valmentaja', sa = false, S = OLETUS(), pelaajat = ROSTERI(), vahvista = true, joukkue = 'KPV U13', verkko = true } = {}) {
  const log = { luvut: [], upd: [], yritykset: [], toastit: [], el: {}, modal: null, modalHtml: null, token: 0, vahvistukset: [], renderit: 0 };
  const db = fakeDb(S, log);
  const el = (id) => (log.el[id] = log.el[id] || { id, innerHTML: '', value: '', style: {} });
  const kortti = () => (log.el.seasonJoukkuejakso && log.el.seasonJoukkuejakso.innerHTML) || '', osio = () => (log.el.seasonPelaajienJaksot && log.el.seasonPelaajienJaksot.innerHTML) || '';
  const document = { getElementById: (id) => (id === 'seasonJoukkuejakso' || id === 'seasonPelaajienJaksot' ? el(id) : (id === '_mAloitaJaksoModal' ? (log.modal ? { remove() { log.modal = null; } } : null) : null)),
    createElement: () => ({ set innerHTML(h) { this._h = h; log.modalHtml = h; }, get firstChild() { return { _h: this._h }; } }), body: { appendChild: (x) => { log.modal = x._h; } } };
  const c = { Object, Array, String, Number, Promise, JSON, Math, Date, console: { warn() {} }, document, _db: db, _seuraId: 'kpv', _demo: false, _rooli: rooli, _superAdmin: sa, _joukkue: joukkue, _pelaajatData: pelaajat, _mIdpP: (id) => pelaajat.find((p) => p.id === id),
    masterT: (x) => x, _mEsc: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), tmPaivaIso: pvmIso, tmKehys: (k) => ({ avain: k, taksonomia: L.TAKS.ARVIOINTI_TAKSONOMIA, asteikko: L.TAKS.TM_ARVIOINTI_ASTEIKKO }),
    toast: (t, k) => log.toastit.push([t, k]), confirm: (t) => { log.vahvistukset.push(t); return vahvista; }, _mVerkkoEnnenSulkua: () => verkko, _mTuoreToken: async () => { log.token++; log.tokenEnnenKirjoitusta = log.tokenEnnenKirjoitusta === undefined ? log.upd.length + log.yritykset.length : log.tokenEnnenKirjoitusta; },
    firebase: { auth: () => ({ currentUser: {} }), firestore: { FieldValue: { arrayUnion: (...a) => ({ __arrayUnion: a }) } } }, _renderPinfoFirestore: () => { log.renderit++; }, _mIdpReRender: () => {}, _mLataaHenkilosto() {}, _tmHenkiloNimi: (p) => p.nimi,
    _devIkaSp: (p) => ({ ika: p._ika || 13, sp: 'P' }), _ttNormPositio: () => null, _mTtItems: () => ITEMS, _mTtEhdotus: () => ({ tyyppi: 'teknis_taktinen', konsepti_avain: 'y_h2' }), _ohjLataaKirjasto: async () => OHJ, _mLataaTeemat: async () => {},
    _mJaksoVaihto: (pp, jf) => L.KS.tmAsetaJaksofokus(pp, jf, { nytISO: NYT.toISOString() }) };
  c.window = c; Object.assign(c.window, { TM_LIPUT: require('../lib/tm_liput.js'), TM_JAKSO_MALLI: L.JM, TM_VASTUUHENKILO: L.VH, TM_ALOITA_JAKSO: L.AJ, TM_TUKITAVOITTEET: L.TT, TM_KOTI_OLETUS: L.KOTI, TM_JOUKKUEJAKSO: L.JJ, TM_JOUKKOALOITUS: L.JA, TM_VALMENNUSLINJA: L.VL, _mTeemat: L.VL.tmTeemaKerros({ jaksot: [] }, null), _ohjKirjasto: OHJ, _mSeuraNimi: 'KPV', _mHenkilosto: [], _mJjLiput: {} });
  vm.createContext(c);
  const nimet = ['function _joukkueTunniste(', 'async function _mJjLataaLiput(', 'function _mJjSaaMuokata(', 'function _mJjCtx(', 'async function _mJjRender(', 'function _mJjVoiLuoda(', 'async function _mAjHaeYhteinen(', 'async function _mAjHaeHavainnot(', 'async function _mAjHaeTuki(', 'function _mAjPelaajaPp(', 'function _mPelaajaNimiAj(',
    'window._mAloitaJaksoAvaa = async function', 'window._mAloitaJaksoSulje = function', 'async function _mAjKirjoitaJakso(', 'function _mJaPiirra(', 'async function _mJaLaske(', 'async function _mJaYksi(', 'window._mJaHyvaksy = async function', 'window._mJaAvaa = function', 'window._mJaKaikki = async function'];
  vm.runInContext(nimet.map(pura).join(';\n') + ';\nthis._mJjRender = _mJjRender;\nthis._mJaLaske = _mJaLaske;', c);
  const w = c.window; w._mJa = { rivit: [], tila: { edistyy: null, virheet: [] }, token: 0, ajossa: false };   // (alustus on pääskriptin ylätasolla)
  return { c, w, log, S, pelaajat, kortti, osio, rendaa: async () => { await c._mJjRender(); },   // _mJjRender() valmistuu vasta kun lista on piirretty — ei ajastimia eikä pollausta
    rivi: (pid) => new RegExp('data-pid="' + pid + '"[\\s\\S]*?(?=<div class="tm-ja-rivi"|</div></div>$|$)').exec(osio()), paivitykset: () => log.upd.map((u) => u.polku.split('/').pop()) };
}

describe.each([['valmentaja'], ['vp']])('KPV U13 · %s', (rooli) => {
  it('LIPPU: ilman liput.kentta === true ei korttia eikä pelaajalistaa eikä pelaajien lukuja; lipulla osio syntyy joukkuejakson alle', async () => {
    const S = OLETUS(); S.docs['seurat/kpv'] = { nimi: 'KPV' }; const e = rakenna({ rooli, S }); await e.c._mJjRender(); await lopeta(20); expect(e.kortti()).toBe(''); expect(e.osio()).toBe(''); expect(e.log.luvut).toEqual(['seurat/kpv', 'seurat/kpv/liput/julkiset']);
    const on = rakenna({ rooli }); await on.rendaa(); expect(on.kortti()).toContain('Joukkueen jakso'); expect(on.osio()).toContain('Pelaajien jaksot');
  });
  it('LIPPU-LUKU EI JUMITA: liput/julkiset-luku heittää TAI dokumenttia ei ole → fallback vanhaan seurat.liput.kentta, lista renderöityy (Topias mukana); kummassakin vanha lippu pois → ei osiota', async () => {
    const heittaa = OLETUS(); heittaa.virhe = (heittaa.virhe || []).concat(['seurat/kpv/liput/julkiset']); const h = rakenna({ rooli, S: heittaa }); await h.rendaa(); expect(h.osio()).toContain('Topias'); expect(h.osio()).not.toContain('Haetaan pelaajien jaksoehdotuksia'); expect(h.kortti()).toContain('Joukkueen jakso');
    const puuttuu = OLETUS(); expect(puuttuu.docs['seurat/kpv/liput/julkiset']).toBeUndefined(); const p = rakenna({ rooli, S: puuttuu }); await p.rendaa(); expect(p.osio()).toContain('Topias'); expect(p.osio()).not.toContain('Haetaan pelaajien jaksoehdotuksia');
    for (const virhe of [true, false]) { const S = OLETUS(); S.docs['seurat/kpv'] = { nimi: 'KPV' }; if (virhe) S.virhe = (S.virhe || []).concat(['seurat/kpv/liput/julkiset']); const e = rakenna({ rooli, S }); await e.rendaa(); expect(e.kortti(), 'virhe=' + virhe).toBe(''); expect(e.osio(), 'virhe=' + virhe).toBe(''); }
    const uusi = OLETUS(); uusi.docs['seurat/kpv'] = { nimi: 'KPV' }; uusi.docs['seurat/kpv/liput/julkiset'] = { kentta: true }; const u = rakenna({ rooli, S: uusi }); await u.rendaa(); expect(u.osio()).toContain('Topias');   // uusi dokumentti ilman vanhaa lippua
  });
  it('LIPPU-LUKU: synkroninen virhe (collection heittää) ja IKUISESTI roikkuva liput/julkiset-luku (4 s yläraja, väärä kello) eivät kaada eivätkä jumita — fallback vanhaan lippuun', async () => {
    const e = rakenna({ rooli }); const alku = e.c._db.collection; e.c._db.collection = (n) => { const r = alku(n); if (n !== 'seurat') return r; return { doc: (d) => { const x = r.doc(d); if (d !== 'kpv') return x; return Object.assign({}, x, { collection: (c) => { if (c === 'liput') throw new Error('sync-virhe'); return x.collection(c); } }); } }; };
    await e.rendaa(); expect(e.osio()).toContain('Topias');
    vi.useFakeTimers(); try {
      const r = rakenna({ rooli }); const kaikki = r.c._db.collection; r.c._db.collection = (n) => { const x = kaikki(n); if (n !== 'seurat') return x; return { doc: (d) => { const y = x.doc(d); if (d !== 'kpv') return y; return Object.assign({}, y, { collection: (c) => (c === 'liput' ? { doc: () => ({ get: () => new Promise(() => {}) }) } : y.collection(c)) }); } }; };
      const ajo = r.rendaa(); await vi.advanceTimersByTimeAsync(4001); await ajo; expect(r.osio()).toContain('Topias');
    } finally { vi.useRealTimers(); }
  });
  it('LISTA: joukkueen pelaajat (joukkue-nimi TAI joukkueet[]), toisen joukkueen ei; tilat: käynnissä / ei ydinvahvuutta / hyväksyttävissä / Leikkijä; nimen mukaan järjestettynä', async () => {
    const e = rakenna({ rooli }); await e.rendaa(); const h = e.osio();
    for (const nimi of ['Topias', 'Pauli', 'Kalle', 'Eino', 'Viljami', 'Lauri', 'Kaarlo']) expect(h, nimi).toContain(nimi); expect(h).not.toContain('Toivo');
    expect(e.rivi('p_kaynnissa')[0]).toContain('jakso käynnissä'); expect(e.rivi('p_eiyv')[0]).toContain('Ei ydinvahvuutta'); expect(e.rivi(TOPIAS_ID)[0]).toContain("_mJaHyvaksy('" + TOPIAS_ID + "')"); expect(e.rivi('p_leikki')[0]).toContain('Ei tukitavoitetta (ikävaihe)');
    expect(e.rivi('p_post')[0]).toContain('Näkee pelin hyvin'); expect(h.indexOf('Eino')).toBeLessThan(h.indexOf('Kalle')); expect(h).toContain('Hyväksy kaikki (5)');   // Topias, Pauli, Viljami, Lauri, Kaarlo
  });
  it('TOPIAS (PHV LAH): ehdotus kypsyyssuojattu liikehallinta — ei nopeus-, kiihdytys-, voima- eikä kestävyysehdotusta; POST-pelaajalla nopeus sellaisenaan; lyhyt + "miksi?" näkyvät, ei lähde-/testiarvoja pelaajalle (vain henkilökunnan lista)', async () => {
    const e = rakenna({ rooli }); await e.rendaa(); const t = e.rivi(TOPIAS_ID)[0];
    expect(t).toContain('Liikehallinta ja kehonhallinta'); expect(t).toContain('testistä, kasvu huomioiden'); expect(t).toMatch(/miksi\?/); expect(t).not.toMatch(/Kiihdytys|Nopeus|Räjähtävyys|Voima|Kestävyys/); expect(e.rivi('p_post')[0]).toContain('Nopeus');
    expect(e.log.upd).toEqual([]);   // ehdotuksia EI tallenneta luonnoksina
  });
  it('HAUT: joukkuedokumentti + yhteiset lähteet kerran; havainnot per pelaaja rajattuna ≤ 5 yhtä aikaa (viiveellä); yhden pelaajan havaintohaun virhe ei kaada listaa', async () => {
    const S = OLETUS(); S.viive = true; const e = rakenna({ rooli, S, pelaajat: Array.from({ length: 14 }, (_, i) => PEL('m' + i, 'Pelaaja' + String(i).padStart(2, '0'))) }); await e.rendaa(); await lopeta(120);
    expect(e.log.maksHav).toBeGreaterThan(1); expect(e.log.maksHav).toBeLessThanOrEqual(5); expect((e.osio().match(/class="tm-ja-rivi"/g) || []).length).toBe(14);
    expect(e.log.luvut.filter((x) => /harjoitepankki$/.test(x))).toHaveLength(1); expect(e.log.luvut.filter((x) => /konfiguraatio\/arviointi$/.test(x))).toHaveLength(1);   // yhteiset KERRAN
    const S2 = OLETUS(); S2.virhe = ['pelaajat/p_post/havainnot']; const e2 = rakenna({ rooli, S: S2 }); await e2.rendaa(); expect(e2.rivi('p_post')[0]).toContain("_mJaHyvaksy('p_post')"); expect(e2.osio()).toContain('Topias');   // lähde jäi pois, rivi säilyi
    const S3 = OLETUS(); S3.virhe = ['harjoitepankki', 'konfiguraatio']; const e3 = rakenna({ rooli, S: S3 }); await e3.rendaa(); expect(e3.osio()).toContain("_mJaHyvaksy('" + TOPIAS_ID + "')");
  });
  it('HYVÄKSY: YKSI update pelaajadokkiin täsmälleen kuten V1-modaalin oletustallennus (ydinvahvuus, ensimmäinen ehdotus, joukkuejakson päivät, joukkuejakso_viite); rivi muuttuu "jakso käynnissä"; ei toista kirjoitusta', async () => {
    const e = rakenna({ rooli }); await e.rendaa(); await e.w._mJaHyvaksy(TOPIAS_ID); await lopeta(10);
    expect(e.log.upd).toHaveLength(1); expect(e.log.upd[0].polku).toBe('seurat/kpv/pelaajat/' + TOPIAS_ID); expect(Object.keys(e.log.upd[0].data).sort()).toEqual(['jaksofokus', 'ydinvahvuus']);
    const jf = e.log.upd[0].data.jaksofokus; expect(jf.tukitavoitteet).toHaveLength(1); expect(jf.tukitavoitteet[0]).toMatchObject({ alue: 'fyysinen', kuvaus: 'Liikehallinta ja kehonhallinta', lahde: { tyyppi: 'testi' } }); expect(jf.tukiosa.alue).toBe('Liikehallinta ja kehonhallinta');
    expect(jf.joukkuejakso_viite).toEqual({ jid: 'kpv_u13', alku: TANAAN }); expect(jf.kesto_vk).toBe(7); expect(jf.lahde).toBe('valmentaja'); expect(L.JM.tmTarkistaJaksoData(jf)).toEqual([]); expect(e.log.upd[0].data.ydinvahvuus.kuvaus).toBe('Tempokuljetus');
    expect(e.pelaajat[0].jaksofokus.tukitavoitteet).toHaveLength(1); expect(e.rivi(TOPIAS_ID)[0]).toContain('jakso käynnissä'); expect(e.osio()).toContain('Hyväksy kaikki (4)'); expect(e.log.toastit.some(([t, k]) => /Jakso aloitettu/.test(t) && k === 'ok')).toBe(true);
    await e.w._mJaHyvaksy(TOPIAS_ID); expect(e.log.upd).toHaveLength(1);   // uudelleen ei kirjoita
  });
  it('HYVÄKSY epäonnistuu → paikallinen tila ennallaan, virhe-toast syyllä, rivi pysyy hyväksyttävänä; ei hyväksyttävä rivi (käynnissä / ei ydinvahvuutta) ei kirjoita', async () => {
    const e = rakenna({ rooli, S: OLETUS({ kaadaPid: ['p_vika'] }) }); await e.rendaa(); await e.w._mJaHyvaksy('p_vika'); await lopeta(10);
    expect(e.log.upd).toEqual([]); expect(e.pelaajat.find((p) => p.id === 'p_vika').jaksofokus).toBeUndefined(); expect(e.log.toastit.some(([t, k]) => k === 'error' && /ei oikeutta/.test(t))).toBe(true); expect(e.rivi('p_vika')[0]).toContain("_mJaHyvaksy('p_vika')");
    await e.w._mJaHyvaksy('p_kaynnissa'); await e.w._mJaHyvaksy('p_eiyv'); await e.w._mJaHyvaksy('ei_ole'); expect(e.log.yritykset.length).toBe(1);
  });
  it('AVAA: avaa V1-modaalin (tukitavoiteosio, esitäytetty); ei ydinvahvuutta → Avaa, ei Hyväksy', async () => {
    const e = rakenna({ rooli }); await e.rendaa(); expect(e.rivi('p_eiyv')[0]).toContain("_mJaAvaa('p_eiyv')"); expect(e.rivi('p_eiyv')[0]).not.toContain('_mJaHyvaksy');
    await e.w._mJaAvaa(TOPIAS_ID); expect(e.log.modal).toBeTruthy(); expect(e.log.modalHtml).toContain('data-aj-tuki'); expect(e.log.modalHtml).toContain('Liikehallinta ja kehonhallinta'); expect(e.log.modalHtml).toContain('value="' + TANAAN + '"');
  });
  it('HYVÄKSY KAIKKI: vahvistus, getIdToken ennen ensimmäistä kirjoitusta, PERÄKKÄIN (ei batchia), vain hyväksyttävät; yksi hylätty kirjoitus ei kaada muita; edistyminen + epäonnistuneet lopuksi', async () => {
    const e = rakenna({ rooli, S: OLETUS({ kaadaPid: ['p_vika'] }) }); await e.rendaa(); await e.w._mJaKaikki(); await lopeta(10);
    expect(e.log.vahvistukset).toHaveLength(1); expect(e.log.vahvistukset[0]).toContain('(5)'); expect(e.log.tokenEnnenKirjoitusta).toBe(0);
    expect(e.log.yritykset.map((p) => p.split('/').pop())).toEqual(['p_kaksois', 'p_leikki', 'p_post', TOPIAS_ID, 'p_vika']);   // PERÄKKÄIN listan järjestyksessä (nimen mukaan: Kaarlo, Lauri, Pauli, Topias, Viljami)
    expect(e.paivitykset().sort()).toEqual(['p_kaksois', 'p_leikki', 'p_post', TOPIAS_ID].sort()); expect(e.log.yritykset).toHaveLength(5);   // 5 yritystä, 4 onnistui; ei Kalle (käynnissä), ei Eino (ei ydinvahvuutta), ei Toivo (toinen joukkue)
    expect(e.osio()).toContain('Ei onnistunut (1):'); expect(e.osio()).toContain('Viljami — ei oikeutta'); expect(e.log.toastit.some(([t, k]) => /Jaksot aloitettu: 4\/5/.test(t) && k === 'error')).toBe(true);
    expect(e.rivi(TOPIAS_ID)[0]).toContain('jakso käynnissä'); expect(e.rivi('p_vika')[0]).toContain("_mJaHyvaksy('p_vika')"); expect(e.osio()).toContain('Hyväksy kaikki (1)');   // epäonnistunut jää hyväksyttäväksi
    // Leikkijä: kirjoitettiin vain päivät + ydinvahvuus (ei tukitavoitteita)
    const leikki = e.log.upd.find((u) => u.polku.endsWith('/p_leikki')).data.jaksofokus; expect(leikki.tukitavoitteet).toEqual([]); expect(leikki.kesto_vk).toBe(12);
  });
  it('HYVÄKSY KAIKKI: peruttu vahvistus → ei kirjoituksia; ei hyväksyttäviä → ei nappia; kaksoisklikkaus kesken ajon ei käynnistä toista ajoa; edistyminen näkyy kesken', async () => {
    const e = rakenna({ rooli, vahvista: false }); await e.rendaa(); await e.w._mJaKaikki(); expect(e.log.yritykset).toEqual([]); expect(e.log.token).toBe(0);
    const e2 = rakenna({ rooli, S: OLETUS({ viive: false }) }); await e2.rendaa(); const ensin = e2.w._mJaKaikki(); const toiseksi = e2.w._mJaKaikki(); await Promise.all([ensin, toiseksi]); await lopeta(10); expect(e2.log.yritykset).toHaveLength(5); expect(e2.log.vahvistukset).toHaveLength(1);
    const e3 = rakenna({ rooli, pelaajat: [PEL('a', 'Aatu', { jaksofokus: { konsepti_avain: 'y_h2', alkoi: new Date().toISOString(), kesto_vk: 6 } }), PEL('b', 'Bertta', { ydinvahvuus: null })] }); await e3.rendaa(); expect(e3.osio()).not.toContain('data-ja-kaikki');
  });
  it('OFFLINE: ei kirjoituksia; Hyväksy kaikki raportoi jokaisen syyllä "ei yhteyttä" ja rivit pysyvät hyväksyttävinä', async () => {
    const e = rakenna({ rooli, verkko: false }); await e.rendaa(); await e.w._mJaKaikki(); await lopeta(10);
    expect(e.log.yritykset).toEqual([]); expect(e.osio()).toContain('Ei onnistunut (5):'); expect(e.osio()).toContain('Topias — ei yhteyttä'); expect(e.osio()).toContain('Hyväksy kaikki (5)');
  });
  it('OIKEUDET: fysiikkavalmentaja (ei kirjoitusoikeutta joukkuejaksoon) ei näe osiota; tuleva/päättyvä joukkuejakso: umpeutunut → ei osiota; ei joukkuejaksoa → ei osiota', async () => {
    const f = rakenna({ rooli: 'fysiikkavalmentaja' }); await f.rendaa(); expect(f.osio()).toBe(''); expect(f.log.luvut.some((x) => /havainnot/.test(x))).toBe(false);
    const S = OLETUS(); S.docs['seurat/kpv/joukkueet/kpv_u13'].jaksofokus.alku = sitten(100); const u = rakenna({ rooli, S }); await u.c._mJjRender(); await lopeta(30); expect(u.kortti()).toContain('Päättynyt'); expect(u.osio()).toBe('');
    const S2 = OLETUS(); delete S2.docs['seurat/kpv/joukkueet/kpv_u13'].jaksofokus; const k = rakenna({ rooli, S: S2 }); await k.c._mJjRender(); await lopeta(30); expect(k.osio()).toBe('');
  });
});

describe('lähdetaso', () => {
  it('skripti ladataan ?v=1; kontti Kausi-näkymässä; kirjoitus vain _mAjKirjoitaJakso:n kautta (ei suoria update-kutsuja joukkoaloitus-lohkossa); ei hex-värejä', () => {
    expect(MA).toContain('<script src="lib/tm_joukkoaloitus.js?v=1"></script>'); expect(MA).toContain('id="seasonPelaajienJaksot"');
    const lohko = MA.slice(MA.indexOf('/* ═══ J4 C — JOUKKOALOITUS'), MA.indexOf('/* ═══ J2 — JOUKKUEJAKSO'));
    expect(lohko).not.toMatch(/\.update\(|\.set\(|\.add\(|\.delete\(|writeBatch|batch\(/); expect(lohko).toContain('_mAjKirjoitaJakso('); expect(lohko).toContain('PERÄKKÄIN'); expect(lohko).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(pura('async function _mAjKirjoitaJakso(')).toContain("collection('pelaajat').doc(p.id).update(");
  });
});
