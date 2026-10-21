/* K1 · yksikkötestit (ei selainta): klipin lähetyslogiikka libissä (yksi paikka Masterille ja Kehitystyöpöytä-sivulle), Työkalut-deeplinkit, painikkeiden reititys, alueen valikkoteksti, erä 72.
   Selaintesti: tests/kt_k1_selain.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const M = require('../lib/tm_mediaviesti.js'), KS = require('../lib/tm_kt_sivu.js'), KK = require('../lib/tm_kt_klippi.js'), ALUE = require('../lib/tm_kt_alue.js');
const MASTER = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const SIVU = readFileSync(new URL('../TalentMaster_Kehitystyopoyta.html', import.meta.url), 'utf8');
const pura = (src, alku) => { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy: ' + alku); let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } throw new Error('sulkeva puuttuu'); };

describe('K1 · lähetyssheetin runko ja yhteinen lähetyslogiikka (lib/tm_mediaviesti.js)', () => {
  const S = { kohde: 'yksi', pid: 'p2', pelaajanNimi: 'Bertta Bergh', joukkueNimi: 'Demo U13', valitut: [], url: 'https://app.veo.co/x/?t=95', klippityyppi: 'onnistui', osa: '', osat: [{ k: 'a', teksti: 'Katse' }], kysymysAvain: null, kysymysOma: '', saate: '', rekisteri: 'rakentaja', suostumusPuuttuu: false, tallentaa: false, pelaajatLista: [{ id: 'p2', nimi: 'Bertta Bergh' }], tarjolla: { yksi: true } };
  const O = { esc: (s) => String(s).replace(/</g, '&lt;'), suljeFn: 'sulje', kohdeFn: 'k', urlFn: 'u', tyyppiFn: 't', osaFn: 'o', pohjaFn: 'p', kysymysFn: 'q', saateFn: 's', lahetaFn: 'l', modalId: '_mvModal' };
  it('Masterin modaali ENNALLAAN: sama sisältö kuin ennen (kehys + otsikko + ×); runko-tila antaa saman sisällön ILMAN kehystä ja otsikkoriviä', () => {
    const modaali = M.tmMvSheetHTML(S, O), runko = M.tmMvSheetHTML(S, { ...O, runko: true });
    expect(modaali.startsWith('<div id="_mvModal" role="dialog"')).toBe(true); expect(modaali).toContain('data-mv-otsikko'); expect(modaali).toContain('>×</button>');
    expect(runko.startsWith('<div data-mv-runko>')).toBe(true); expect(runko).not.toContain('data-mv-otsikko'); expect(runko).not.toContain('role="dialog"'); expect(runko).not.toContain('>×</button>');
    const sisus = runko.slice('<div data-mv-runko>'.length, -'</div>'.length); expect(sisus.length).toBeGreaterThan(1500);
    expect(modaali).toContain(sisus);   // kaikki lomakekentät täsmälleen samat
    for (const a of ['data-mv-url', 'data-mv-tyyppi="onnistui"', 'data-mv-pohja="0"', 'data-mv-oma', 'data-mv-saate', 'data-mv-laheta', 'data-mv-kohde="yksi"']) expect(runko).toContain(a);
  });
  it('tarjolla.vainYksi: vain "tämä pelaaja" -valinta (ei Valitut/Joukkue); ilman sitä Master näyttää kaikki kuten ennen', () => {
    const v = M.tmMvSheetHTML({ ...S, tarjolla: { yksi: true, vainYksi: true } }, { ...O, runko: true }), kaikki = M.tmMvSheetHTML(S, O);
    expect(v.match(/data-mv-kohde="/g)).toHaveLength(1); expect(kaikki.match(/data-mv-kohde="/g).length).toBeGreaterThanOrEqual(3);
  });
  it('tmMvSheetKysymys: oma kysymys > valittu pohja > tyhjä; joukkueklipin kiinteä kysymys', () => {
    const t = { t: (k) => (M.FI[k] != null ? M.FI[k] : k) };
    expect(M.tmMvSheetKysymys({ kohde: 'yksi', kysymysOma: '  Mitä näit? ', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1', klippityyppi: 'onnistui', rekisteri: 'rakentaja' }, t)).toEqual({ teksti: 'Mitä näit?', avain: null });
    const pohja = M.tmMvPohjat('prosessi', 'rakentaja')[1];
    expect(M.tmMvSheetKysymys({ kohde: 'yksi', klippityyppi: 'prosessi', rekisteri: 'rakentaja', kysymysAvain: pohja.avain }, t)).toEqual({ teksti: M.FI[pohja.avain], avain: pohja.avain });
    expect(M.tmMvSheetKysymys({ kohde: 'yksi', klippityyppi: 'prosessi', rekisteri: 'rakentaja' }, t)).toEqual({ teksti: '', avain: null });
    expect(M.tmMvSheetKysymys({ kohde: 'joukkue' }, t).avain).toBe('mv_joukkue_kysymys');
  });
  it('tmMvKirjoitaDokit: YKSI batch ≤ 400/erä, jokaiselle oma dokumentti, sama klippi_id; palauttaa id:t ja paikalliset kopiot (aika = nyt, nakyva_alkaen = Date)', async () => {
    const loki = []; let n = 0;
    const db = { batch: () => { const ops = []; return { set: (r, v) => ops.push({ path: r.path, v }), commit: async () => { loki.push(ops); } }; }, collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ path: 'seurat/s/viestit/id' + (++n), id: 'id' + n }) }) }) }) };
    const dokit = Array.from({ length: 401 }, (_, i) => ({ tyyppi: 'klippi', pelaajaId: 'p' + i, klippi_id: 'kl_1', nakyva_alkaen: new Date(Date.UTC(2026, 9, 20, 4, 0)) }));
    const r = await M.tmMvKirjoitaDokit({ db, sid: 's', dokit, FV: { serverTimestamp: () => 'TS' }, TS: { fromDate: (d) => ({ ts: d.getTime() }) }, nyt: new Date(0) });
    expect(loki.map((e) => e.length)).toEqual([400, 1]); expect(r).toHaveLength(401); expect(r[0].id).toBe('id1');
    expect(loki[0][0].v.aika).toBe('TS'); expect(loki[0][0].v.nakyva_alkaen).toEqual({ ts: Date.UTC(2026, 9, 20, 4, 0) });
    expect(r[0].dok.aika).toEqual(new Date(0)); expect(r[0].dok.nakyva_alkaen).toBeInstanceOf(Date); expect(r[0].dok.id).toBe('id1');
  });
  it('Master käyttää samoja libin funktioita (ei toista toteutusta): kysymys + kirjoitus', () => {
    expect(pura(MASTER, 'function _mvKysymysTeksti(S)')).toContain('tmMvSheetKysymys');
    expect(pura(MASTER, 'window._mvLaheta = async function ()')).toContain('tmMvKirjoitaDokit');
    expect(pura(MASTER, 'window._mvLaheta = async function ()')).not.toContain('b.set(col.doc()');
  });
});

describe('K1 · tmKtKlippiSheet (sheet-adapteri, ilman selainta)', () => {
  const elem = () => { const e = { innerHTML: '', children: [], parentNode: null, querySelector: () => null, contains: () => true }; return e; };
  const luo = (extra) => {
    const loki = { toast: [], kirj: [], lisaa: [], sheet: [] }; let runko = elem(); runko.parentNode = {};
    const env = Object.assign({ db: { batch: () => { const ops = []; return { set: (r, v) => ops.push({ path: r.path, v }), commit: async () => { loki.kirj.push(ops); } }; }, collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ path: 'seurat/s/viestit/x1', id: 'x1' }) }) }) }) }, sid: 's', uid: 'u1', rooli: 'valmentaja',
      doc: { createElement: () => ({ set innerHTML(v) { this._h = v; this.firstChild = { html: v }; }, get innerHTML() { return this._h; } }), body: { contains: () => true }, querySelector: () => null },
      t: (k) => k, esc: (s) => s, sheet: { avaa: (m) => { loki.sheet.push(m); return true; }, runko: () => runko, sulje: () => loki.sheet.push('sulje'), tallennettu: (id) => loki.sheet.push('tallennettu:' + id) },
      toast: (m) => loki.toast.push(m), nayta: () => {}, pelaaja: (pid) => (pid === 'p2' ? { id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', joukkue: 'Demo U13', jaksofokus: { konsepti_avain: 'y_h1' }, suostumusTila: 'annettu' } : null),
      nimi: () => 'Bertta Bergh', ika: () => 13, voi: (p) => p.id === 'p2', lahettajaNimi: () => 'Testi Valmentaja', verkossa: () => true, nyt: () => new Date(2026, 9, 19, 12, 0), FV: { serverTimestamp: () => 'TS' }, TS: { fromDate: (d) => d },
      lisaa: (pid, d) => loki.lisaa.push([pid, d]), fn: { url: 'u', tyyppi: 't', osa: 'o', pohja: 'p', kysymys: 'q', saate: 's', laheta: 'l', sulje: 'x', kohde: 'k' } }, extra || {});
    return { env, loki, sh: KK.tmKtKlippiSheet(env), runko: () => runko };
  };
  it('avaa: ei oikeutta / tuntematon pelaaja → false, ei sheetiä; oikeus → sheet (pitkä), runko piirretään tilasta', () => {
    const { sh, loki, runko } = luo();
    expect(sh.avaa('p9')).toBe(false); expect(loki.sheet).toEqual([]);
    expect(sh.avaa('p2')).toBe(true); expect(loki.sheet[0]).toMatchObject({ id: 'klippi_p2', tyyppi: 'pitka' }); expect(runko().innerHTML).toContain('data-mv-url');
  });
  it('laheta: tyhjä linkki → virhetoast, EI kirjoitusta; kelvollinen → YKSI batch, sheet tallennettu, paikallinen lisäys, toast "lähetetty"; klo 22 → ajastuksen aika toastissa', async () => {
    const a = luo(); a.sh.avaa('p2'); const r1 = await a.sh.laheta();
    expect(r1.ok).toBe(false); expect(a.loki.kirj).toEqual([]); expect(a.loki.toast[0]).toBe(M.FI.mv_virhe_linkki_tyhja);
    a.sh.url('https://youtu.be/abc'); a.sh.pohja(0); const r2 = await a.sh.laheta();
    expect(r2.ok).toBe(true); expect(a.loki.kirj).toHaveLength(1); expect(a.loki.kirj[0][0].v).toMatchObject({ tyyppi: 'klippi', pelaajaId: 'p2', fromNimi: 'Testi Valmentaja', fromRole: 'valmentaja', nakyvyys: 'pelaaja', aika: 'TS' });
    expect(a.loki.sheet).toContain('tallennettu:klippi_p2'); expect(a.loki.lisaa[0][0]).toBe('p2'); expect(a.loki.lisaa[0][1][0]).toMatchObject({ id: 'x1', tyyppi: 'klippi' }); expect(a.loki.toast[1]).toBe('Klippi lähetetty ✓');
    const y = luo({ nyt: () => new Date(2026, 9, 19, 22, 30) }); y.sh.avaa('p2'); y.sh.url('https://youtu.be/abc'); y.sh.pohja(0);
    expect((await y.sh.laheta()).ajastettu).toBe(true); expect(y.loki.toast.pop()).toMatch(/^Klippi lähetetty ✓ Näkyy pelaajalle 20\.10\. klo 7\.00\.$/);
    expect(y.loki.kirj[0][0].v.nakyva_alkaen).toEqual(new Date(2026, 9, 20, 7, 0));
  });
  it('laheta: ei verkkoa → ei kirjoitusta; kirjoitusvirhe → virhetoast, sheet jää auki (ei tallennettu), syöte säilyy ja uusi yritys onnistuu', async () => {
    const o = luo({ verkossa: () => false }); o.sh.avaa('p2'); o.sh.url('https://youtu.be/abc'); o.sh.pohja(0);
    expect((await o.sh.laheta()).syy).toBe('offline'); expect(o.loki.kirj).toEqual([]);
    let epaonnistu = true; const e = luo(); e.env.db.batch = () => { const ops = []; return { set: (r, v) => ops.push(v), commit: async () => { if (epaonnistu) throw Object.assign(new Error('x'), { code: 'permission-denied' }); e.loki.kirj.push(ops); } }; };
    const sh = KK.tmKtKlippiSheet(e.env); sh.avaa('p2'); sh.url('https://youtu.be/abc'); sh.pohja(0);
    expect((await sh.laheta()).ok).toBe(false); expect(e.loki.sheet.filter((x) => String(x).startsWith('tallennettu'))).toEqual([]); expect(e.loki.toast.pop()).toBe('Tallennus epäonnistui');
    epaonnistu = false; expect((await sh.laheta()).ok).toBe(true); expect(e.loki.kirj).toHaveLength(1);
  });
});

describe('K1 · Työkalut-deeplinkit, painikkeiden reititys, alueen valikkoteksti', () => {
  it('tmKtMasterLinkki/Parametrit: neljä työkalua + havainto sallittu, muu hylätään; Masterin funktionimet', () => {
    for (const [t, fn] of [['havainto', 'openDrill'], ['taktiikka', 'avaaKaaviopankki'], ['itsearvio', 'avaaHarjoitusarviointi'], ['kehittyminen', 'avaaValmentajaKehitys'], ['asetukset', 'avaaCoachProfiili']]) {
      expect(KS.tmKtMasterLinkki('koti', t)).toBe('TalentMaster_Master_v16.html?ws=koti&toiminto=' + t); expect(KS.tmKtMasterParametrit('?ws=koti&toiminto=' + t)).toEqual({ ws: 'koti', toiminto: t }); expect(KS.tmKtMasterToiminto(t)).toBe(fn);
    }
    expect(KS.tmKtMasterLinkki('koti', 'poista')).toBe('TalentMaster_Master_v16.html?ws=koti'); expect(KS.tmKtMasterToiminto('poista')).toBeNull(); expect(KS.tmKtMasterToiminto('constructor')).toBeNull(); expect(KS.tmKtMasterParametrit('?ws=koti&toiminto=poista').toiminto).toBeNull();
  });
  it('Master: ?toiminto=… avaa oikean työkalun (vm-ajo: setWs + openDrill / window-funktio), tuntematon ei avaa mitään', () => {
    const f = pura(MASTER, 'function _mKtSivuParametrit()');
    for (const [t, odotettu] of [['havainto', 'openDrill:adar'], ['taktiikka', 'avaaKaaviopankki'], ['itsearvio', 'avaaHarjoitusarviointi'], ['kehittyminen', 'avaaValmentajaKehitys'], ['asetukset', 'avaaCoachProfiili'], [null, '']]) {
      const loki = []; const win = { TM_KT_SIVU: KS, TM_VALMENTAJA_NAV: { tmNavReitti: (w) => ({ ws: w }) } };
      ['avaaKaaviopankki', 'avaaHarjoitusarviointi', 'avaaValmentajaKehitys', 'avaaCoachProfiili'].forEach((n) => { win[n] = () => loki.push(n); });
      const ctx = { window: win, location: { search: '?ws=koti' + (t ? '&toiminto=' + t : ''), pathname: '/x', hash: '' }, history: { replaceState() {} }, setWs: (w) => loki.push('setWs:' + w), openDrill: (a) => loki.push('openDrill:' + a) };
      vm.createContext(ctx); vm.runInContext(f + '\n_mKtSivuParametrit();', ctx);
      expect(loki.filter((x) => !/^setWs/.test(x)).join(',')).toBe(odotettu);
    }
  });
  it('sivun Työkalut-tynkät välittävät toiminnon Masterille; kuorma vie ws=kuorma; klippi/VEO eivät mene Masteriin', () => {
    expect(SIVU).toMatch(/\[\['avaaHarjoitusarviointi', 'itsearvio'\], \['avaaValmentajaKehitys', 'kehittyminen'\], \['avaaCoachProfiili', 'asetukset'\]\]/);   // K1b: Taktiikka ei enää hyppää Masteriin vaan avaa taulun modaalina (window.avaaKaaviopankki → _ktTauluAvaa)
    expect(SIVU).toContain('window.avaaKaaviopankki = function () { window._ktTauluAvaa(_S.pid); };'); expect(SIVU).toContain("avain === 'taulu') return window._ktTauluAvaa(pid)");
    const toimi = pura(SIVU, 'window._ktToimi = function (pid, avain)');
    expect(toimi).toContain("avain === 'klippi') return window._ktKlippiAvaa(pid)"); expect(toimi).toContain("tmKtMasterLinkki('kuorma')"); expect(toimi).not.toMatch(/'jatka' \|\| avain === 'avaa_polku' \|\| avain === 'kuorma'/);
    expect(SIVU).toContain('veo: function (pid) { return window._ktKlippiAvaa(pid); }');
  });
  it('tmKtToimiReitti: jokaiselle sivun painikeavaimelle reitti; Masteriin jäävät vain K4 (syvenna) + kuorma; tuntematon → master (varmuus)', () => {
    const master = Object.keys(KS.TOIMI_REITIT).filter((a) => KS.tmKtToimiReitti(a) === 'master').sort();
    expect(master).toEqual(['kirjaa_keskustelu', 'kuorma', 'syvenna']);   // K1d: kirjaa_keskustelu (VP:n Kirjaa kehityskeskustelu) kuorissa   // K3a + K3b (kausitavoite): anna_valita + hylkaa ovat sheet-reittejä
    for (const a of ['havainto', 'aloita', 'vahvista', 'muokkaa', 'sulje', 'aseta_alue', 'klippi', 'vahvista_sitoumus', 'anna_valita', 'hylkaa', 'kausitavoite']) expect(KS.tmKtToimiReitti(a)).toBe('sheet');
    for (const a of ['jatka', 'avaa_polku']) expect(KS.tmKtToimiReitti(a)).toBe('valilehti'); expect(KS.tmKtToimiReitti('tuntematon')).toBe('master'); expect(KS.tmKtToimiReitti('constructor')).toBe('master');
  });
  it('erä 72: ka_aseta_alue "Aseta alue" (sv Geminiltä) ja valikko käyttää ka_vaihda (olemassa) / ka_aseta_alue', () => {
    expect(ALUE.FI.ka_aseta_alue).toBe('Aseta alue'); expect(ALUE.FI.ka_vaihda).toBe('Vaihda aluetta');
    const G = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_72_gemini.json', import.meta.url), 'utf8'));
    expect(Object.keys(G.osiot['lib.tm_kt_alue'].rivit)).toEqual(['ka_aseta_alue']); expect(G.osiot['lib.tm_kt_alue'].rivit.ka_aseta_alue).toMatchObject({ fi: 'Aseta alue', sv: '' });   // Code ei kirjoita ruotsia
    expect(readFileSync(new URL('../lib/tm_kt_polku.js', import.meta.url), 'utf8')).toContain("onAlue ? 'ka_vaihda' : 'ka_aseta_alue'");
  });
});
