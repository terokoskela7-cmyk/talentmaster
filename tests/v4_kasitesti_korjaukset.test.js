/**
 * V4 käsitesti 7.10. (Master, admin, KPV P13 Topias): 1) Kenttä piirtyi mustana (tmKenttaCss ei injektoitu) 2) Tänään ei näyttänyt signaalia + 13 §1:n kolmea kysymystä
 * 3) "sitoumus odottaa" otsikossa mutta signaali "ylläpito" 4) Kehitys-välilehden pelaajapillerit → V4. D52: mobiilissa signaali + nappi ennen kenttää.
 * Ajetaan SIVUN OIKEA koodi (Master + VP) oikeilla libeillä vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
const L = { KT: require('../lib/tm_kehitystyopoyta.js'), TS: require('../lib/tm_tanaan_signaali.js'), PT: require('../lib/tm_polun_tila.js'), AJ: require('../lib/tm_aloita_jakso.js'), SA: require('../lib/tm_seuraava_askel.js'), K: require('../lib/tm_kentta.js'), TK: require('../lib/tm_tanaan_kentta.js'), RV: require('../lib/tm_reitin_valinta.js'), HR: require('../lib/tm_hash_reititin.js'), K4: require('../lib/tm_viikkokatsaus.js'), KK: require('../lib/tm_kevyt_katselmus.js') };
function pala(src, alku, loppu) { const i = src.indexOf(alku), j = src.indexOf(loppu, i + 1); if (i < 0 || j < 0) throw new Error('ei löydy: ' + alku); return src.slice(i, j); }
const JF = (o = {}) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Kuljetus-laukaus', domeeni: 'teknis_taktinen', alkoi: new Date(Date.now() - 2 * 86400000).toISOString(), kesto_vk: 6 }, o);

function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) return src.slice(i, j + 1); } } throw new Error('ei päättynyt'); }

function ymp(sov) {
  const master = sov === 'Master', src = master ? MASTER : VP, dom = { tyylit: {}, lisatty: [] };
  const sb = { console: { warn() {} }, Object, Array, Date, JSON, Math, Promise, String, Number, setTimeout, _demo: false, _isDemoMode: false, _seuraId: 'kpv', masterT: (x) => x, vpT: (x) => x, _mEsc: (s) => String(s == null ? '' : s), _jsvEsc: (s) => String(s == null ? '' : s),
    tmPaivaIso: () => '2026-10-07', tmPvmFi: (i) => i, _devIkaSp: () => ({ ika: 13 }), _dimIkaSp: () => ({ ika: 13 }), _db: { collection: () => { throw new Error('luku!'); } }, db: { collection: () => { throw new Error('luku!'); } }, _ktOpts: () => ({ toimiFn: '_ktToimi' }), _ktS: { overflow: null },
    document: { getElementById: (id) => dom.tyylit[id] || null, createElement: () => ({ set textContent(v) { this._t = v; }, get textContent() { return this._t; }, set innerHTML(v) { this.firstChild = { html: v }; } }), head: { appendChild: (n) => { dom.tyylit[n.id] = n; dom.lisatty.push(n.id); } }, body: { appendChild: (n) => { dom.nakyma = n.html; }, style: {} } },
    window: { TM_KEHITYSTYOPOYTA: L.KT, TM_TANAAN_SIGNAALI: L.TS, TM_POLUN_TILA: L.PT, TM_SEURAAVA_ASKEL: L.SA, TM_ALOITA_JAKSO: L.AJ, TM_VIIKKOKATSAUS: L.K4, TM_TANAAN_KENTTA: L.TK, TM_KEVYT_KATSELMUS: L.KK, tmKentta: L.K.tmKentta, tmKenttaCss: L.K.tmKenttaCss, _vpRooli: 'vp', _vpSA: false } };
  vm.createContext(sb);
  const lohko = pala(src, '/* ═══ V4b-2 — kevyt katselmus', master ? '/* ═══ R6.4 Mediaviesti' : '/* ═══ R6.4 Mediaviesti');
  vm.runInContext(lohko + '\n' + funktio(src, 'function _ktTanaanHTML(p, tila)') + '\n' + funktio(src, 'function _ktAsetaHTML(html)') + '\nthis.__t=_ktTanaanHTML;this.__a=_ktAsetaHTML;', sb);
  return { sb, dom, tanaan: (p) => sb.__t(p, L.AJ.tmJaksoTila(p, { nyt: new Date() })) };
}

for (const sov of ['Master', 'VP']) {
  describe(sov + ' · käsitesti: Tänään-välilehti', () => {
    it('1 · Kenttä-komponentin tyylit injektoidaan kerran (muuten SVG piirtyy mustana); .kt-osa-nimikolari poistettu', () => {
      const e = ymp(sov); e.sb.__a('<div id="ktNakyma"></div>'); e.sb.__a('<div id="ktNakyma"></div>');
      expect(e.dom.lisatty.filter((i) => i === 'ktKenttaTyylit')).toHaveLength(1); const css = e.dom.tyylit.ktKenttaTyylit.textContent; expect(css).toContain('.kt-svg{'); expect(css).toContain('.kt-line{fill:none;stroke:var(--chalk)');
      const ktCss = L.KT.tmKtCss(); expect(ktCss).not.toMatch(/(^|[,}\s])\.kt-osa\{/m); expect(ktCss).toContain('.kt-osarivi{');   // Kenttä: .kt-osa on absolute-tagi → Tänäänin osalista ei saa käyttää samaa luokkaa
      expect(css).toContain('.kt-osa{position:absolute');
    });
    it('2 · Tänään: signaali + nappi ENNEN kenttää (D52 mobiili: grid-areas sig → kentta → muut), kolme kysymystä lukuina kun jakso on aktiivinen', () => {
      const e = ymp(sov), p = { id: 'p1', etunimi: 'Topias', joukkue: 'KPV P13', jaksofokus: JF({ osa_arviot: { y_h1: { a: 3, b: 1, c: 2 } } }), idp_sitoumus_pvm: new Date().toISOString() }, h = e.tanaan(p);
      expect(h).toContain('data-kt-signaali='); expect(h.indexOf('kt-t-sig')).toBeLessThan(h.indexOf('kt-t-kentta')); expect(h.indexOf('data-kt-signaali')).toBeLessThan(h.indexOf('class="kt"'));
      expect(h).toContain('data-kt-kysymykset'); for (const t of ['Näkyykö ydinvahvuus pelissä?', 'Treenataanko?', 'Onko mukana?']) expect(h).toContain(t); expect(h).toContain('1/3 osaa itsenäisesti'); expect(h).toMatch(/Sitoumus vahvistettu|Sitoumus tehty/);
      const css = L.KT.tmKtCss(); expect(css).toContain('grid-template-areas:"sig" "kentta" "muut"'); expect(css).toContain('grid-template-areas:"kentta sig" "kentta muut"');
    });
    it('2b · kysymykset EIVÄT näy kun jakso ei ole aktiivinen (ei jaksoa / valittavana); "Ei vielä tietoa" kun dataa ei ole', () => {
      const e = ymp(sov); expect(e.tanaan({ id: 'a', etunimi: 'A' })).not.toContain('data-kt-kysymykset'); expect(e.tanaan({ id: 'b', etunimi: 'B', jaksofokus: { tila: 'valittavana', vaihtoehdot: [] } })).not.toContain('data-kt-kysymykset');
      const h = e.tanaan({ id: 'c', etunimi: 'C', jaksofokus: JF({ alkoi: new Date(Date.now() - 14 * 86400000).toISOString() }) }); expect(h).toContain('data-kt-kysymykset'); expect(h).toContain('Ei vielä tietoa');
    });
    it('3 · "Sitoumus odottaa" (otsikkorivin tila vahvistettu) näkyy SIGNAALINA — ei "ylläpito" (D48: 4b, valinta odottaa pelaajaa -rivin jälkeen)', () => {
      const e = ymp(sov), p = { id: 'p1', etunimi: 'Topias', jaksofokus: JF() }, tila = L.AJ.tmJaksoTila(p, { nyt: new Date() }); expect(tila.tila).toBe('vahvistettu'); expect(tila.rivitila.teksti).toContain('sitoumus odottaa');
      const h = e.tanaan(p); expect(h).toContain('data-kt-signaali="sitoumus_odottaa"'); expect(h).toContain('Sitoumus odottaa pelaajaa'); expect(h).not.toContain('data-kt-signaali="yllapito"'); expect(h).toContain('Sitoumus odottaa');   // kysymys 3: "Sitoumus odottaa"
    });
  });
}

describe('D48 + sitoumus: järjestys ja yksittäistapaukset', () => {
  const NYT = new Date('2026-10-01T10:00:00.000Z'), JFX = (o = {}) => JF(Object.assign({ alkoi: '2026-09-30T08:00:00.000Z' }, o)), S = (p, ctx = {}) => L.TS.tmTanaanSignaali(p, Object.assign({ nyt: NYT, profiili: 'oto', askel: null }, ctx));
  it('vahvistettu (sitoumus puuttuu) → sitoumus_odottaa; suljettava ja valinta tehty voittavat sen; viikkokatsaus + havainto tulevat sen jälkeen', () => {
    const p = { id: 'p', etunimi: 'T', jaksofokus: JFX() }; expect(S(p, { askel: { avain: 'yllapito' } }).ensisijainen.avain).toBe('sitoumus_odottaa'); expect(S(p, { askel: { avain: 'yllapito' } }).ensisijainen.nappi).toBeNull();
    expect(S(p, { askel: { avain: 'havainto' }, vkEiVastattu: true }).ensisijainen.avain).toBe('sitoumus_odottaa'); expect(S(p, { askel: { avain: 'havainto' }, vkEiVastattu: true }).toinen.avain).toBe('vk_ei_vastattu');
    expect(S(p, { askel: { avain: 'kuorma_tarkista' } }).ensisijainen.avain).toBe('kuorma');
    const sitoutunut = Object.assign({}, p, { idp_sitoumus_pvm: '2026-09-30T12:00:00.000Z' }); expect(S(sitoutunut, { askel: { avain: 'yllapito' } }).ensisijainen.avain).toBe('yllapito');
  });
});

describe('4 · Kehitys-välilehden pelaajapillerit → V4 (pickPlayer)', () => {
  const pp = funktio(MASTER, 'function pickPlayer(pid)');
  function aja({ lippu, luettu, kaynnistaaLipun }) {
    const log = { v4: [], renderDev: [] }, sb = { renderDev: (p) => log.renderDev.push(p), _demo: false, _seuraId: 'kpv', window: { _ktLippu: lippu, _ktLippuLuettu: luettu, _ktAvaa: (pid) => { log.v4.push(pid); return true; } } };
    sb._ktKaynnista = () => Promise.resolve().then(() => { if (kaynnistaaLipun) { sb.window._ktLippu = true; sb.window._ktLippuLuettu = true; } else sb.window._ktLippuLuettu = true; });
    vm.createContext(sb); vm.runInContext(pp + '\nthis.__p=pickPlayer;', sb); return { sb, log };
  }
  it('lippu päällä → V4 heti (#pelaaja/{pid}/tanaan), vanha renderDev EI', () => { const e = aja({ lippu: true, luettu: true }); e.sb.__p('p1'); expect(e.log.v4).toEqual(['p1']); expect(e.log.renderDev).toEqual([]); });
  it('lippua ei ole vielä luettu (käynnistys kesken) → odottaa käynnistyksen ja avaa V4 — EI vanhaa näkymää', async () => { const e = aja({ lippu: false, luettu: false, kaynnistaaLipun: true }); e.sb.__p('p2'); await new Promise((r) => setTimeout(r, 5)); expect(e.log.v4).toEqual(['p2']); expect(e.log.renderDev).toEqual([]); });
  it('lippu pois (luettu, ei päällä) → vanha näkymä kuten ennen', async () => { const e = aja({ lippu: false, luettu: true }); e.sb.__p('p3'); expect(e.log.renderDev).toEqual(['p3']); expect(e.log.v4).toEqual([]); const e2 = aja({ lippu: false, luettu: false, kaynnistaaLipun: false }); e2.sb.__p('p4'); await new Promise((r) => setTimeout(r, 5)); expect(e2.log.renderDev).toEqual(['p4']); });
  it('_ktKaynnista palauttaa saman lupauksen kaikille odottajille ja merkitsee lipun luetuksi', () => { expect(MASTER).toContain('function _ktKaynnista() { if (_ktS.kaynnistyy && _ktS.lupaus) return _ktS.lupaus;'); expect(MASTER).toContain('window._ktLippuLuettu = true; if (liput.kentta !== true) return;'); });
});

describe('Jakso ei koskaan jää ilman signaalia (käsitesti: askel "sitoumus" aiheutti tyhjän Tänään-signaalin)', () => {
  const NYT = new Date('2026-10-01T10:00:00.000Z'), P = (o = {}) => ({ id: 'p', etunimi: 'T', idp_sitoumus_pvm: '2026-09-30T12:00:00.000Z', jaksofokus: JF({ alkoi: '2026-09-25T08:00:00.000Z' }), ...o });
  const S = (p, askel, extra = {}) => L.TS.tmTanaanSignaali(p, { nyt: NYT, profiili: 'oto', askel, ...extra });
  it.each(['sitoumus', 'ehdotus_odottaa', 'idp_jumissa', 'valitavoite_valmis'])('askel %s → signaali "askel_muu" (nappi Avaa Polku), ei tyhjää', (a) => { const x = S(P(), { avain: a }); expect(x.ensisijainen.avain).toBe('askel_muu'); expect(x.ensisijainen.askel).toBe(a); expect(x.ensisijainen.teksti).not.toMatch(/^ts_/); expect(x.ensisijainen.nappi.avain).toBe('avaa_polku'); });
  it('review_eraantymassa: ammatti nostaa, oto ei (ei aikaikkunaa) — oto putoaa ylläpitoon', () => { expect(S(P(), { avain: 'review_eraantymassa' }, { profiili: 'ammatti' }).ensisijainen.avain).toBe('askel_muu'); expect(S(P(), { avain: 'review_eraantymassa' }).ensisijainen.avain).toBe('yllapito'); });
  it('INVARIANTTI: jokaisella käynnissä olevalla jaksolla on aina ensisijainen signaali — kaikilla askelilla ja profiileilla', () => {
    const askeleet = [null, 'kuorma_tarkista', 'review_myohassa', 'review_eraantymassa', 'valinta_odottaa', 'ehdotus_odottaa', 'sitoumus', 'jakso_umpeutunut', 'ei_jaksofokusta', 'idp_jumissa', 'valitavoite_valmis', 'havainto', 'yllapito', 'tuntematon_uusi'];
    for (const a of askeleet) for (const pr of ['oto', 'ammatti']) for (const sit of [true, false]) { const p = P(sit ? {} : { idp_sitoumus_pvm: undefined }); expect(S(p, a ? { avain: a } : null, { profiili: pr }).ensisijainen, a + '/' + pr + '/' + sit).not.toBeNull(); }
  });
});
