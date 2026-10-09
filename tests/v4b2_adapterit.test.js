/**
 * V4b-2 · adapterit (Master_v16 + VP_v25) — SIVUN OIKEA koodi vm:ssä, Firestore-kutsut tallennetaan:
 * kevyt katselmus = YKSI batch (pelaajadokki + reviewit/{pvm}.kevyt merge, ei review_viimeisin_*, ei tyyppiä); D53: virhe → toast + koodi, ruutu auki; Hylkää valinta = yksi update;
 * Syvennä kirjoittaa kolme vastausta samassa batchissa; Tänään-lukujen määrä numerona (0 arkisin, 1 sunnuntaisin; profiili kerran/joukkue taustalla).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
const L = { K: require('../lib/tm_kevyt_katselmus.js'), RV: require('../lib/tm_reitin_valinta.js'), K4: require('../lib/tm_viikkokatsaus.js'), SL: require('../lib/tm_kehityssilmukka.js'), J: require('../lib/tm_jaksokooste.js'), TS: require('../lib/tm_tanaan_signaali.js'), AJ: require('../lib/tm_aloita_jakso.js'), TK: require('../lib/tm_tanaan_kentta.js'), VK: require('../lib/tm_virhekoodi.js') };
function pala(src, alku, loppu) { const i = src.indexOf(alku), j = src.indexOf(loppu, i + 1); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku + ' → ' + loppu); return src.slice(i, j); }
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0, k = src.indexOf('{', i); for (let j = k; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) { let e = j + 1; if (src[e] === ';') e++; return src.slice(i, e); } } } throw new Error('ei päättynyt ' + alku); }
const ALKOI = '2026-09-21T08:00:00.000Z', PVM = '2026-11-10';
const JF = (o = {}) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Kuljetus', domeeni: 'teknis_taktinen', alkoi: ALKOI, kesto_vk: 6 }, o);
const TARJOUS = () => ({ tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h1', nimi: 'Kuljetus', perustelu: 'Hyvä.', vahvistettu: true }, { konsepti_avain: 'y_h2', nimi: 'Syöttö', perustelu: 'Toinen.', vahvistettu: true }] });
const KORTIT = () => [{ avain: 'y_h3', nimi: 'Pelinluku', syy: 'heikoin', valittu: false, lause: '' }, { avain: 'y_h5', nimi: 'Syöttö', syy: null, valittu: false, lause: '' }];

/* sov: 'Master' | 'VP'. Palauttaa { sb, p, log, kirj } */
function ymp(sov, { pelaaja = {}, kaada = false, tanaan = PVM, profiili = null, rooli = 'valmentaja', demo = false } = {}) {
  const master = sov === 'Master', src = master ? MASTER : VP;
  const p = Object.assign({ id: 'p1', etunimi: 'Topias', sukunimi: 'K', joukkue: 'KPV U13', jaksofokus: JF() }, pelaaja);
  const log = { toast: [], warn: [], poistetut: [], lisatyt: [], lukuja: { vk: 0, profiili: 0, muu: 0 }, renderit: 0 }, kirj = { batch: [], update: [] };
  const FV = { arrayUnion: (...a) => ({ __arrayUnion: a }), delete: () => ({ __delete: true }) };
  const ref = (polku) => ({ polku, collection: (c) => ref(polku + '/' + c), doc: (d) => ref(polku + '/' + d),
    get: async () => { if (/viikkokatsaukset\/\d/.test(polku)) { log.lukuja.vk++; return { exists: false }; } if (/joukkueet\/[a-z0-9_]+$/.test(polku)) { log.lukuja.profiili++; return { exists: !!profiili, data: () => ({ valmentajaprofiili: profiili }) }; } log.lukuja.muu++; return { exists: false, data: () => ({}) }; },
    update: async (d) => { if (kaada) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); kirj.update.push({ polku, d }); }, set: async (d, o) => { kirj.update.push({ polku, set: d, o }); } });
  const db = { collection: (c) => ref(c), batch: () => { const ops = []; return { update: (r, d) => ops.push(['update', r.polku, d]), set: (r, d, o) => ops.push(['set', r.polku, d, o]), commit: async () => { if (kaada) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); kirj.batch.push(ops); } }; } };
  const els = {}; const doc = { getElementById: (id) => els[id] || null, querySelector: () => null, createElement: () => ({ set innerHTML(v) { this.firstChild = { id: (/id="([^"]+)"/.exec(v) || [])[1], html: v, remove() { delete els[this.id]; log.poistetut.push(this.id); } }; } }), body: { appendChild: (n) => { els[n.id] = n; log.lisatyt.push(n.id); } } };
  const win = { TM_KEVYT_KATSELMUS: L.K, TM_REITIN_VALINTA: L.RV, TM_VIIKKOKATSAUS: L.K4, TM_KEHITYSSILMUKKA: L.SL, TM_JAKSOKOOSTE: L.J, TM_TANAAN_SIGNAALI: L.TS, TM_ALOITA_JAKSO: L.AJ, TM_TANAAN_KENTTA: L.TK, TM_SEURAAVA_ASKEL: require('../lib/tm_seuraava_askel.js'), _vpRooli: rooli, _vpSA: false };
  const sb = { window: win, document: doc, console: { warn: (...a) => log.warn.push(a) }, Object, Array, Date, JSON, Math, Promise, String, Number, TM_VIRHEKOODI: L.VK,
    _seuraId: 'kpv', _demo: demo, _isDemoMode: demo, _rooli: rooli, _superAdmin: false, _db: db, db, firebase: { auth: () => ({ currentUser: { uid: 'u1', getIdToken: async () => 't' } }), firestore: { FieldValue: FV } },
    toast: (t, k) => log.toast.push([t, k]), masterT: (x) => x, vpT: (x) => x, _mEsc: (s) => String(s == null ? '' : s), _jsvEsc: (s) => String(s == null ? '' : s), tmPaivaIso: (d) => (d && d.__tanaan) || tanaan,
    _ttPelaaja: () => p, _vpTtPelaaja: () => p, _pelaajatData: [p], _pelaajat: [p], _tmHenkiloNimi: (x) => x.etunimi + ' ' + x.sukunimi, _devIkaSp: () => ({ ika: 13 }), _dimIkaSp: () => ({ ika: 13 }),
    _msJaksovali: () => ({ alkoi: '2026-09-21', loppu: '2026-11-02' }), _msSessiot: () => [{ id: 's1', treeniteema: { avain: 'y_h1' }, pvm: '2026-10-01', pelaajat_id: [] }, { id: 's2', treeniteema: { avain: 'y_h1' }, pvm: '2026-10-08', pelaajat_id: [] }],
    _vpSulkuJaksovali: () => ({ alkoi: '2026-09-21', loppu: '2026-11-02' }), _vpSulkuSessiot: () => [{ id: 's1', treeniteema: { avain: 'y_h1' }, pvm: '2026-10-01', pelaajat_id: [] }, { id: 's2', treeniteema: { avain: 'y_h1' }, pvm: '2026-10-08', pelaajat_id: [] }],
    _msSiltaKonsepti: () => null, _msK3Ehdotukset: () => KORTIT(), _vpK3Ehdotukset: () => KORTIT(), _mVerkkoEnnenSulkua: () => true, _mTuoreToken: async () => {}, _ktPaivita: () => { log.renderit++; }, _renderPinfoFirestore() {}, _vpAloitusReRender() {}, _msRender() {}, _vpSulkuRender() {},
    _ktOpts: () => ({}), _jaksofokusFlag: true, _msSuljeJakso: async () => {}, _vpSuljeJakso: async () => {}, _vpArvPelaaja: null };
  sb.window.tmKonseptiKaanon = undefined;
  vm.createContext(sb);
  const koodi = master ? [pala(src, '/* ═══ V4b-2 — kevyt katselmus', '/* ═══ R6.4 Mediaviesti'), funktio(src, 'async function _mKirjoitaJaksofokus(')].join('\n')
    : [pala(src, '/* ═══ V4b-2 — kevyt katselmus', '/* ═══ R6.4 Mediaviesti')].join('\n');
  vm.runInContext(koodi + '\nthis._kvkTila=()=>window._kvkTila;this._kvkHk=()=>window._kvkHk;this._ktSignaaliHTML=_ktSignaaliHTML;this._kvkProfiili=_kvkProfiili;', sb);
  return { sb, p, log, kirj, win, els };
}
const lopeta = () => new Promise((r) => setTimeout(r, 0));
const vastaa = (w, lause = 'Laukaus vauhdista näkyi jo peleissä.') => { w._kvkVastaus('nakyi', 'ohjatusti'); w._kvkVastaus('treeni', 'usein'); w._kvkVastaus('mukana', 'hyvin'); w._kvkLause(lause); };

for (const sov of ['Master', 'VP']) {
  const hk = sov === 'Master' ? 'ms' : 'vp';
  describe(sov + ' · V4b-2 kevyt katselmus (vm)', () => {
    it('avaus: ruutu piirtyy (3 kysymystä, lause, K3-osio), profiili oletuksena oto; väärä jakso → toast ei ruutua', async () => {
      const e = ymp(sov); e.win._kvkAvaa('p1', false); await lopeta(); expect(e.log.lisatyt).toContain('_kvkModal'); const h = e.els._kvkModal.html; expect(h).toContain('Näkyikö ydinvahvuus pelissä?'); expect(h).toContain('data-k3-osio'); expect(e.sb._kvkTila().profiili).toBe('oto'); expect(e.sb._kvkTila().k3.paalla).toBe(false);
      e.win._kvkAvaa('p1', true); expect(e.sb._kvkTila().k3.paalla).toBe(true);   // "Anna pelaajan valita" → sama ruutu, tarjous auki
      const ei = ymp(sov, { pelaaja: { jaksofokus: null } }); ei.win._kvkAvaa('p1', false); await lopeta(); expect(ei.log.lisatyt).not.toContain('_kvkModal'); expect(ei.log.toast.some(([, k]) => k === 'error')).toBe(true);
    });
    it('TALLENNUS = YKSI batch: pelaajadokin update (jaksofokus null + historiarivi lause/lause_lahde) + reviewit/{pvm} set merge (kevyt + kevyt_tallennettu); EI review_viimeisin_*, EI tyyppiä; ruutu sulkeutuu vasta onnistuttua', async () => {
      const e = ymp(sov, { rooli: sov === 'VP' ? 'vp' : 'valmentaja' }); e.win._kvkAvaa('p1', false); await lopeta(); vastaa(e.win);
      await e.win._kvkTallenna(); expect(e.kirj.batch).toHaveLength(1); const ops = e.kirj.batch[0]; expect(ops).toHaveLength(2);
      const [u, s] = ops; expect(u[0]).toBe('update'); expect(u[1]).toBe('seurat/kpv/pelaajat/p1'); expect(u[2].jaksofokus).toBeNull(); const rivi = u[2].jaksofokus_historia.__arrayUnion[0];
      expect(rivi).toMatchObject({ konsepti_avain: 'y_h1', sulkutapa: 'suljettu', lause: 'Laukaus vauhdista näkyi jo peleissä.', lause_lahde: sov === 'VP' ? 'vp' : 'valmentaja', harjoituksia: 2 });
      expect(s[0]).toBe('set'); expect(s[1]).toBe('seurat/kpv/pelaajat/p1/reviewit/' + PVM); expect(s[3]).toEqual({ merge: true }); expect(s[2].kevyt).toEqual({ nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' }); expect(Object.keys(s[2]).sort()).toEqual(['kevyt', 'kevyt_tallennettu']);
      expect(JSON.stringify(ops)).not.toMatch(/review_viimeisin|"tyyppi"/); expect(JSON.stringify(rivi)).not.toMatch(/ohjatusti|"usein"|hyvin/);   // vastaukset vain reviewit-dokumenttiin
      expect(e.log.poistetut).toContain('_kvkModal'); expect(e.sb._kvkTila()).toBeNull(); expect(e.p.jaksofokus).toBeNull(); expect(e.p.jaksofokus_historia).toHaveLength(1); expect(e.log.toast.some(([, k]) => k === 'ok')).toBe(true);
    });
    it('K3-tarjous samassa batchissa: jaksofokus {valittavana, vaihtoehdot} + ydinvahvuus_valinta FieldValue.delete()', async () => {
      const e = ymp(sov, { pelaaja: { ydinvahvuus_valinta: { vaihtoehto: 'vanha' } } }); e.win._kvkAvaa('p1', true); await lopeta(); vastaa(e.win); e.win._kvkK3Valitse(0); e.win._kvkK3Lause(0, 'Kun osaat molemmilla, puolustaja ei tiedä.');
      await e.win._kvkTallenna(); expect(e.kirj.batch).toHaveLength(1); const u = e.kirj.batch[0][0][2]; expect(u.jaksofokus).toEqual({ tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h3', nimi: 'Pelinluku', perustelu: 'Kun osaat molemmilla, puolustaja ei tiedä.', vahvistettu: true }] });
      expect(u.ydinvahvuus_valinta).toEqual({ __delete: true }); expect(e.p.ydinvahvuus_valinta).toBeUndefined();
    });
    it('D53: permission-denied → toast + koodi + konsoli, ruutu AUKI, lause tallessa, p.jaksofokus ennallaan, ei batchia kirjattu', async () => {
      const e = ymp(sov, { kaada: true }); e.win._kvkAvaa('p1', false); await lopeta(); vastaa(e.win); const ennen = JSON.stringify(e.p.jaksofokus);
      await e.win._kvkTallenna(); expect(e.log.toast).toEqual([['Tallennus epäonnistui (permission-denied)', 'error']]); expect(e.log.warn.length).toBeGreaterThan(0); expect(e.els._kvkModal).toBeDefined(); expect(e.sb._kvkTila()).not.toBeNull(); expect(e.sb._kvkTila().lause).toBe('Laukaus vauhdista näkyi jo peleissä.');
      expect(JSON.stringify(e.p.jaksofokus)).toBe(ennen); expect(e.p.jaksofokus_historia).toBeUndefined(); expect(e.kirj.batch).toEqual([]);
      e.sb._kvkTila().tallentaa = false; await e.win._kvkTallenna(); expect(e.log.toast).toHaveLength(2);   // uudelleenyritys mahdollinen
    });
    it('VALIDOINTI ENNEN KIRJOITUSTA: puuttuva vastaus / kielletty lause → toast, EI batchia, ruutu auki', async () => {
      const e = ymp(sov); e.win._kvkAvaa('p1', false); await lopeta(); e.win._kvkVastaus('nakyi', 'ohjatusti'); await e.win._kvkTallenna(); expect(e.log.toast.at(-1)).toEqual(['Vastaa kaikkiin kolmeen kysymykseen.', 'error']);
      e.win._kvkVastaus('treeni', 'usein'); e.win._kvkVastaus('mukana', 'hyvin'); e.win._kvkLause('Heikkous: laukaus'); await e.win._kvkTallenna(); expect(e.log.toast.at(-1)[1]).toBe('error'); expect(e.kirj.batch).toEqual([]); expect(e.sb._kvkTila()).not.toBeNull();
    });
    it('PROFIILI: ammatti → tyhjä lause estää ("Kirjoita lause pelaajalle"); oto → sallittu; profiili luetaan joukkuedokumentista (VP: olemassa olevasta joukkuelistasta)', async () => {
      const e = ymp(sov, { profiili: 'ammatti' }); e.win._kvkProfiilit.kpv_u13 = 'ammatti'; e.win._kvkAvaa('p1', false); await lopeta(); expect(e.sb._kvkTila().profiili).toBe('ammatti'); vastaa(e.win, ''); await e.win._kvkTallenna(); expect(e.log.toast.at(-1)).toEqual(['Kirjoita lause pelaajalle.', 'error']); expect(e.kirj.batch).toEqual([]);
      const o = ymp(sov); o.win._kvkAvaa('p1', false); await lopeta(); vastaa(o.win, ''); await o.win._kvkTallenna(); expect(o.kirj.batch).toHaveLength(1); expect('lause' in o.kirj.batch[0][0][2].jaksofokus_historia.__arrayUnion[0]).toBe(false);
    });
    it('demo: ei Firestore-kirjoitusta, lokaali tila päivittyy', async () => {
      const e = ymp(sov, { demo: true }); e.win._kvkAvaa('p1', false); await lopeta(); vastaa(e.win); await e.win._kvkTallenna(); expect(e.kirj.batch).toEqual([]); expect(e.p.jaksofokus).toBeNull(); expect(e.p.jaksofokus_historia).toHaveLength(1);
    });
    it('sulku-nappi ja ×: _kvkSulje poistaa ruudun eikä kirjoita mitään', async () => {
      const e = ymp(sov); e.win._kvkAvaa('p1', false); await lopeta(); e.win._kvkSulje(); expect(e.sb._kvkTila()).toBeNull(); expect(e.log.poistetut).toContain('_kvkModal'); expect(e.kirj.batch).toEqual([]);
    });
  });

  describe(sov + ' · V4b-2 Hylkää valinta (vm)', () => {
    const VALINTA = () => ({ jaksofokus: TARJOUS(), ydinvahvuus_valinta: { vaihtoehto: 'y_h2', valittu_pvm: '2026-11-09' } });
    it('avaus esitäyttää nykyiset vaihtoehdot; tallennus = YKSI update: jaksofokus (+hylatty) + ydinvahvuus_valinta delete, EI historiariviä, EI reviewit-kirjoitusta', async () => {
      const e = ymp(sov, { pelaaja: VALINTA() }); e.win._kvkHylkaaAvaa('p1'); await lopeta(); expect(e.log.lisatyt).toContain('_hkModal'); expect(e.sb._kvkHk().k3.kortit.slice(0, 2).map((k) => [k.avain, k.valittu])).toEqual([['y_h1', true], ['y_h2', true]]);
      e.win._kvkHkLause('Valitse reitti, jonka haluat harjoitella itse.'); e.win._kvkHkK3Valitse(1);   // y_h2 pois
      await e.win._kvkHkTallenna(); const upd = sov === 'Master' ? e.kirj.update : e.kirj.batch.flat().filter((o) => o[0] === 'update').map((o) => ({ polku: o[1], d: o[2] }));
      expect(upd).toHaveLength(1); expect(upd[0].polku).toBe('seurat/kpv/pelaajat/p1'); const d = upd[0].d;
      expect(d.jaksofokus).toEqual({ tila: 'valittavana', vaihtoehdot: [{ konsepti_avain: 'y_h1', nimi: 'Kuljetus', perustelu: 'Hyvä.', vahvistettu: true }], hylatty: { pvm: PVM, perustelu: 'Valitse reitti, jonka haluat harjoitella itse.', valinta: 'y_h2' } });
      expect(d.ydinvahvuus_valinta).toEqual({ __delete: true }); expect('jaksofokus_historia' in d).toBe(false); expect(JSON.stringify(e.kirj)).not.toContain('reviewit');
      expect(e.p.ydinvahvuus_valinta).toBeUndefined(); expect(e.p.jaksofokus.hylatty.perustelu).toContain('Valitse reitti'); expect(e.sb._kvkHk()).toBeNull(); expect(e.log.poistetut).toContain('_hkModal');
    });
    it('ei hylättävää (pelaaja ei ole valinnut / jakso käynnissä) → toast, ei ruutua; virheellinen perustelu → toast, ei kirjoitusta; kirjoitusvirhe → toast + koodi, ruutu auki', async () => {
      const ei = ymp(sov, { pelaaja: { jaksofokus: TARJOUS() } }); ei.win._kvkHylkaaAvaa('p1'); expect(ei.log.lisatyt).not.toContain('_hkModal'); expect(ei.log.toast.at(-1)[1]).toBe('error');
      const e = ymp(sov, { pelaaja: VALINTA() }); e.win._kvkHylkaaAvaa('p1'); await lopeta(); await e.win._kvkHkTallenna(); expect(e.log.toast.at(-1)).toEqual(['Kirjoita perustelu pelaajalle.', 'error']); e.win._kvkHkLause('Tämä on hylätty'); await e.win._kvkHkTallenna(); expect(e.log.toast.at(-1)[1]).toBe('error'); expect(e.kirj.update.concat(e.kirj.batch)).toEqual([]);
      const k = ymp(sov, { pelaaja: VALINTA(), kaada: true }); k.win._kvkHylkaaAvaa('p1'); await lopeta(); k.win._kvkHkLause('Valitse reitti, jonka haluat harjoitella itse.'); await k.win._kvkHkTallenna();
      expect(k.log.toast).toEqual([['Tallennus epäonnistui (permission-denied)', 'error']]); expect(k.els._hkModal).toBeDefined(); expect(k.sb._kvkHk()).not.toBeNull(); expect(k.p.ydinvahvuus_valinta).toBeDefined(); expect(k.p.jaksofokus.hylatty).toBeUndefined();
    });
  });

  describe(sov + ' · V4b-2 Tänään-signaali: lukujen määrä numerona', () => {
    const PELAAJA = () => ({ jaksofokus: JF({ alkoi: '2026-11-09T08:00:00.000Z', kesto_vk: 6 }) });
    const tila = (p) => L.AJ.tmJaksoTila(p, { nyt: new Date('2026-11-22T10:00:00.000Z') });
    it('arkisin 0 viikkokatsaus-lukua; sunnuntaisin enintään 1 (välimuisti: toistuvat piirrot eivät lue uudelleen); profiili luetaan kerran per joukkue taustalla (VP: 0)', async () => {
      const ark = ymp(sov, { pelaaja: PELAAJA(), tanaan: '2026-11-18' }); for (let i = 0; i < 3; i++) ark.sb._ktSignaaliHTML(ark.p, tila(ark.p)); await lopeta();
      expect(ark.log.lukuja.vk).toBe(0); expect(ark.log.lukuja.profiili).toBe(sov === 'Master' ? 1 : 0); expect(ark.log.lukuja.muu).toBe(0);
      const sun = ymp(sov, { pelaaja: PELAAJA(), tanaan: '2026-11-22' }); const h1 = sun.sb._ktSignaaliHTML(sun.p, tila(sun.p)); for (let i = 0; i < 3; i++) sun.sb._ktSignaaliHTML(sun.p, tila(sun.p)); await lopeta();
      expect(sun.log.lukuja.vk).toBe(1); expect(sun.log.lukuja.profiili).toBe(sov === 'Master' ? 1 : 0); expect(sun.log.lukuja.muu).toBe(0); expect(h1).not.toContain('Viikkokatsaus ei vastattu');   // luku kesken → ei väitetä "ei vastattu"
      const h2 = sun.sb._ktSignaaliHTML(sun.p, tila(sun.p)); expect(h2).toContain('data-kt-signaali');   // vastaus tuli (doc ei ole) → rivi ilmestyy kun luku valmis
      expect(sun.log.renderit).toBeGreaterThan(0);   // luvun valmistuttua näkymä piirretään uudelleen
    });
    it('luku epäonnistuu → ei väitetä "ei vastattu" (rivi 5 pois), ei silmukkaa', async () => {
      const e = ymp(sov, { pelaaja: PELAAJA(), tanaan: '2026-11-22' }); e.sb.db = e.sb._db = { collection: () => { throw new Error('verkko'); } }; e.sb._ktSignaaliHTML(e.p, tila(e.p)); await lopeta(); const h = e.sb._ktSignaaliHTML(e.p, tila(e.p)); expect(h).not.toContain('Viikkokatsaus ei vastattu');
    });
  });
}

describe('Syvennä: täysi sulkulomake kirjoittaa kolme vastausta samassa batchissa (Master + VP)', () => {
  for (const sov of ['Master', 'VP']) {
    it(sov + ': _msTallenna/_vpSulkuTallenna + S.kevytEsi → batch (pelaajadokki + reviewit.kevyt), ei yksittäistä update()-kirjoitusta', async () => {
      const master = sov === 'Master', e = ymp(sov);
      const tallenna = funktio(master ? MASTER : VP, master ? 'window._msTallenna = async function' : 'window._vpSulkuTallenna = async function');
      vm.runInContext(tallenna + '\nthis.__t=' + (master ? 'window._msTallenna' : 'window._vpSulkuTallenna') + ';', e.sb);
      Object.assign(e.sb, { _vpJfMergeLisakentat: (x) => x, _vpSiltaKonsepti: () => null, _vpJfKanonNimi: (a) => a, _kvkLahde: e.sb.window._kvkAvaa ? (() => 'valmentaja') : () => 'valmentaja' });
      const S = { pid: 'p1', p: e.p, jf: e.p.jaksofokus, alkoi: '2026-09-21', loppu: '2026-11-02', harjoituksia: 2, lasnaolo: { paikalla: 1, yhteensa: 2, tiedossa: 2 }, arvioItse: 4, arvioAikuis: 3, tulos: 'parani', k4: false, lause: '', k3: null, kevytEsi: { nakyi: 'ohjatusti', treeni: 'usein', mukana: 'hyvin' } };
      if (master) e.win._msSulkuTila = S; else e.win._vpSulkuTila = S;
      e.sb.window.TM_FYYSTEEMAT_LIB = undefined; await e.sb.__t('');
      expect(e.kirj.update).toEqual([]); expect(e.kirj.batch).toHaveLength(1); const ops = e.kirj.batch[0]; expect(ops.map((o) => o[0])).toEqual(['update', 'set']); expect(ops[1][1]).toBe('seurat/kpv/pelaajat/p1/reviewit/' + PVM); expect(Object.keys(ops[1][2]).sort()).toEqual(['kevyt', 'kevyt_tallennettu']); expect(JSON.stringify(ops)).not.toMatch(/review_viimeisin|"tyyppi"/);
      expect(ops[0][2].jaksofokus_historia.__arrayUnion[0]).toMatchObject({ sulkutapa: 'suljettu', arvio_itse: 4, tulos: 'parani' });
    });
  }
});

describe('Lähdetarkistukset: reititys, ei päällekkäisiä globaaleja, lib-skriptit', () => {
  it('_ktToimi: sulje/anna_valita → kevyt katselmus; hylkaa → Hylkää valinta; syvenna → täysi sulkulomake (Master + VP)', () => {
    for (const [src, sulku] of [[MASTER, '_msSuljeJakso'], [VP, '_vpSuljeJakso']]) { const f = funktio(src, 'window._ktToimi = function'); expect(f).toContain("avain === 'sulje') return window._kvkAvaa(pid, false)"); expect(f).toContain("avain === 'anna_valita') return window._kvkAvaa(pid, true)"); expect(f).toContain("avain === 'hylkaa') return window._kvkHylkaaAvaa(pid)"); expect(f).toContain("avain === 'syvenna') return window." + sulku + '(pid)'); }
  });
  it('uudet globaalit eivät törmää (VP:n konseptikirjasto käyttää _kk*-nimiä): _kvk*-etuliite; ei kahta samannimistä', () => {
    for (const [nimi, src] of [['Master', MASTER], ['VP', VP]]) { const lohko = pala(src, '/* ═══ V4b-2 — kevyt katselmus', nimi === 'Master' ? '/* ═══ R6.4 Mediaviesti' : '/* ═══ R6.4 Mediaviesti'); const nimet = [...lohko.matchAll(/(?:window\.|function |const |async function )(_kvk\w+|_ktSignaaliHTML|_ktVk\w*)/g)].map((m) => m[1]); expect(nimet.length).toBeGreaterThan(15); expect(lohko).not.toMatch(/\b_kk[A-Z]/);
      const kaikki = [...src.matchAll(/window\.(_kvk\w+)\s*=\s*(?:async )?function/g)].map((m) => m[1]); expect(new Set(kaikki).size, nimi).toBe(kaikki.length); }
  });
  it('kirjoitus: kevyt = batch.update + batch.set(reviewit, merge); ei review_viimeisin_* eikä tyyppi-kenttää V4b-2-lohkoissa; pelaajalle ei kirjoiteta vastauksia', () => {
    for (const [nimi, src] of [['Master', MASTER], ['VP', VP]]) { const lohko = pala(src, '/* ═══ V4b-2 — kevyt katselmus', nimi === 'Master' ? '/* ═══ R6.4 Mediaviesti' : '/* ═══ R6.4 Mediaviesti'); const koodi = lohko.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ''); expect(koodi, nimi).toMatch(/batch\.set\(ref\.collection\('reviewit'\)\.doc\(plan\.reviewitPvm\), plan\.reviewitData, \{ merge: true \}\)/); expect(koodi, nimi).not.toMatch(/review_viimeisin|tyyppi\s*:/); }
  });
  it('skriptit ladataan (v1) ennen käyttöä sekä Masterissa että VP:ssä; eslint ei tarvitse uusia globaaleja', () => {
    for (const src of [MASTER, VP]) { for (const l of ['tm_tanaan_signaali.js?v=3', 'tm_kevyt_katselmus.js?v=2']) expect(src).toContain('<script src="lib/' + l + '"></script>'); expect(src.indexOf('lib/tm_kevyt_katselmus.js')).toBeGreaterThan(src.indexOf('lib/tm_reitin_valinta.js')); expect(src.indexOf('lib/tm_kevyt_katselmus.js')).toBeGreaterThan(src.indexOf('lib/tm_viikkokatsaus.js')); }
    expect(readFileSync(new URL('../TalentMaster_Pelaaja_v7.html', import.meta.url), 'utf8')).not.toContain('tm_kevyt_katselmus');   // pelaajasovellus ei lataa henkilökunnan libiä
  });
});
