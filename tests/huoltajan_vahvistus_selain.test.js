/* Huoltajan sähköpostin vahvistus — selainpuoli (Vanhempi_v2, Rekisterointi_Suostumus, Excel_Tuonti SA). Palvelinpuoli: functions/test/huoltajan_vahvistus.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const VA = lue('TalentMaster_Vanhempi_v2.html');
const K = require('../lib/tm_kalenteri_ilmoitus.js');
const LANG = require('../lib/tm_lang.js');
const pura = (src, alku) => { const i = src.indexOf(alku); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (d === 0) break; } } return src.slice(i, j + 1); };

function ymp({ vahvistettu, kutsu }) {
  const loki = { kutsut: [], toastit: [], reload: 0, token: 0, draw: 0 };
  const cu = { emailVerified: vahvistettu, reload: async () => { loki.reload++; }, getIdToken: async () => { loki.token++; } };
  const fbApp = { functions: () => ({ httpsCallable: (n) => async (d) => { loki.kutsut.push(n); if (kutsu instanceof Error) throw kutsu; return { data: kutsu }; } }) };
  const mem = {};
  const ctx = { console: { warn() {} }, Date, Object, String, Array, location: { search: '' }, URLSearchParams, t: LANG.t, _age: 'u16', _toast: (x) => loki.toastit.push(x), draw: () => { loki.draw++; },
    _db: {}, _auth: { currentUser: cu }, window: { _db: {}, _fbApp: fbApp, localStorage: { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } }, TM_KALENTERI_ILM: K, _lapsi: { id: 'p1', seuraId: 'kpv' }, _vanhKalenteri: null, _vanhKalLadattu: false } };
  vm.createContext(ctx);
  vm.runInContext(['async function _vanhLataaKalenteri(', 'async function _vanhLahetaVahvistus(', 'async function _vanhPaivitaVahvistus(', 'function _vanhKalYritaUudelleen(', 'function _vanhKalNappi(', 'function _vanhTapahtumatHTML('].map((a) => pura(VA, a)).join('\n')
    + '\nthis.lataa=_vanhLataaKalenteri; this.laheta=_vanhLahetaVahvistus; this.paivita=_vanhPaivitaVahvistus; this.html=_vanhTapahtumatHTML; function _vanhTapahtumaKortti(){return "";} function _vanhDemoKalenteri(){return [];}', ctx);
  return { ctx, loki };
}
const tulevaisuus = () => ({ tapahtumat: [{ id: 'a', nimi: 'Treeni', alkaa: new Date(Date.now() + 86400000).toISOString(), paattyy: new Date(Date.now() + 90000000).toISOString() }], laskettu: 'x' });

describe('Vanhempi_v2 — vahvistamaton sähköposti', () => {
  it('vahvistamaton: EI kalenterikutsua, tila vahvistamatta, ohje + napit (ei hiljaista tyhjää listaa)', async () => {
    const e = ymp({ vahvistettu: false, kutsu: tulevaisuus() });
    await e.ctx.lataa();
    expect(e.loki.kutsut).toEqual([]); expect(e.loki.reload).toBe(1); expect(e.ctx.window._vanhKalTila).toBe('vahvistamatta');
    const h = e.ctx.html();
    expect(h).toContain('Vahvista sähköpostisi, niin näet lapsen kalenterin'); expect(h).toContain('Lähetä linkki uudelleen'); expect(h).toContain('_vanhLahetaVahvistus()'); expect(h).toContain('_vanhPaivitaVahvistus()');
    expect(h).not.toContain('Ei merkittyjä tapahtumia');
  });
  it('osoite vahvistui toisessa välilehdessä (reload → true): token päivitetään ja kalenteri ladataan', async () => {
    const e = ymp({ vahvistettu: false, kutsu: tulevaisuus() });
    e.ctx._auth.currentUser.reload = async () => { e.ctx._auth.currentUser.emailVerified = true; e.loki.reload++; };
    await e.ctx.lataa();
    expect(e.loki.token).toBe(1); expect(e.loki.kutsut).toEqual(['haePelaajanKalenteri']); expect(e.ctx.window._vanhKalenteri.map((x) => x.id)).toEqual(['a']); expect(e.ctx.window._vanhKalTila).toBeNull();
  });
  it('vahvistettu: ennallaan (ei reloadia, kalenterikutsu)', async () => {
    const e = ymp({ vahvistettu: true, kutsu: tulevaisuus() }); await e.ctx.lataa();
    expect(e.loki.reload).toBe(0); expect(e.loki.kutsut).toEqual(['haePelaajanKalenteri']);
  });
  it('lataus epäonnistuu eikä muistia → tila virhe + "Yritä uudelleen" (ei hiljaista tyhjää)', async () => {
    const e = ymp({ vahvistettu: true, kutsu: new Error('x') }); await e.ctx.lataa();
    expect(e.ctx.window._vanhKalTila).toBe('virhe'); const h = e.ctx.html(); expect(h).toContain('Kalenteria ei saatu ladattua.'); expect(h).toContain('Yritä uudelleen'); expect(h).not.toContain('Ei merkittyjä tapahtumia');
  });
  it('"Lähetä linkki uudelleen": kutsuu lahetaVahvistuslinkkiItselle; tilat lähetetty / odota / virhe näytetään toastina', async () => {
    for (const [kutsu, odotettu] of [[{ tila: 'lahetetty' }, 'Linkki lähetetty sähköpostiisi.'], [{ tila: 'odota', sekuntia: 200 }, 'Linkki lähetettiin juuri — odota hetki ennen uutta pyyntöä.'], [new Error('x'), 'Linkin lähetys ei onnistunut. Yritä hetken kuluttua uudelleen.']]) {
      const e = ymp({ vahvistettu: false, kutsu }); await e.ctx.laheta();
      expect(e.loki.kutsut).toEqual(['lahetaVahvistuslinkkiItselle']); expect(e.loki.toastit).toEqual([odotettu]);
    }
  });
  it('"Olen vahvistanut — päivitä": ei vielä → toast; vahvistunut → kalenteri ladataan uudelleen', async () => {
    const e = ymp({ vahvistettu: false, kutsu: tulevaisuus() }); await e.ctx.paivita();
    expect(e.loki.toastit).toEqual(['Osoitetta ei ole vielä vahvistettu.']);
    e.ctx._auth.currentUser.reload = async () => { e.ctx._auth.currentUser.emailVerified = true; }; await e.ctx.paivita();
    expect(e.ctx.window._vanhKalenteri).toBeNull(); expect(e.ctx.window._vanhKalLadattu).toBe(false);
  });
  it('tekstit tm_lang-avaimia (fi + en), sv odotuslistalla — ei kovakoodattua suomea napeissa', () => {
    const fi = LANG.TM_LANG.fi.vanhempi, en = LANG.TM_LANG.en.vanhempi;
    for (const k of ['vahvista_sahkoposti', 'vahvista_sahkoposti_ohje', 'laheta_vahvistus_uudelleen', 'olen_vahvistanut', 'vahvistus_lahetetty', 'vahvistus_odota', 'vahvistus_ei_viela', 'vahvistus_ei_onnistunut', 'kalenteri_ei_latautunut', 'yrita_uudelleen']) { expect(fi[k], k).toBeTruthy(); expect(en[k], k).toBeTruthy(); expect(typeof LANG.TM_LANG.sv.vanhempi[k], k).toBe('string'); }   // sv saapui erässä 3 (vienti scripts/i18n_vie_sv_era3.cjs)
    expect(pura(VA, 'function _vanhTapahtumatHTML(')).not.toMatch(/'[^']*Vahvista[^']*'/);
  });
});

/* email_verified (a), PM 6.11.2026: koko sovelluksen portti ennen lapsen datan latausta (Rules v3.81 vaatii email_verified == true). */
function portti({ vahvistettu, vahvistuuReloadissa }) {
  const loki = { jarjestys: [], toastit: [], db: 0, kutsut: [] };
  const cu = { emailVerified: vahvistettu, reload: async () => { loki.jarjestys.push('reload'); if (vahvistuuReloadissa) cu.emailVerified = true; }, getIdToken: async (f) => { loki.jarjestys.push('token:' + f); } };
  const pb = { innerHTML: '' };
  const ctx = { console: { warn() {} }, Object, String, t: LANG.t, _sc: 'koti', _toast: (x) => loki.toastit.push(x),
    document: { getElementById: () => pb }, _auth: { currentUser: cu },
    _haeViimeisinKirjaus: async () => { loki.jarjestys.push('lataa'); }, rTabs: () => 'TABS', rKoti: () => 'KOTI', _vSuostumusPeruttu: () => false, _lapsiValitsinHTML: () => '',
    _vanhKalYritaUudelleen: () => { loki.jarjestys.push('kalenteri'); },
    window: { _fbApp: { functions: () => ({ httpsCallable: (n) => async () => { loki.kutsut.push(n); return { data: { tila: 'lahetetty' } }; } }) } } };
  ctx.window._db = new Proxy({}, { get: () => { loki.db++; return () => ({}); } });
  vm.createContext(ctx);
  vm.runInContext(['async function _vanhAvaaVahvistettuna(', 'async function _vanhPaivitaVahvistus(', 'function _vanhVahvistaPorttiHTML(', 'function _vanhKalNappi(', 'function draw(', 'function _vEsc(s) {'].map((a) => pura(VA, a)).join('\n')
    + '\nthis.avaa=_vanhAvaaVahvistettuna; this.paivita=_vanhPaivitaVahvistus; this.draw=draw;', ctx);
  return { ctx, loki, pb };
}

describe('Vanhempi_v2 — vahvistusportti ennen lapsen dataa (email_verified a)', () => {
  it('vahvistamaton: EI lapsen latausta eikä Firestorea, portti näkyy ilman välilehtiä (otsikko, ohje, napit, kirjaudu ulos)', async () => {
    const e = portti({ vahvistettu: false });
    await e.ctx.avaa();
    expect(e.loki.jarjestys).toEqual(['reload']); expect(e.loki.db).toBe(0); expect(e.loki.kutsut).toEqual([]);
    expect(e.ctx.window._vanhVahvistamatta).toBe(true);
    for (const s of ['Vahvista sähköpostisi, niin näet lapsesi tiedot', 'Lähetimme osoitteeseesi vahvistuslinkin', 'Lähetä linkki uudelleen', 'Olen vahvistanut — päivitä', '_vanhLahetaVahvistus()', '_vanhPaivitaVahvistus()', '_kirjauduUlos()', 'Kirjaudu ulos']) expect(e.pb.innerHTML).toContain(s);
    expect(e.pb.innerHTML).not.toContain('TABS'); expect(e.pb.innerHTML).not.toContain('KOTI');
  });
  it('vahvistui toisessa välilehdessä (reload → true): token päivitetään ENNEN lapsen latausta', async () => {
    const e = portti({ vahvistettu: false, vahvistuuReloadissa: true }); await e.ctx.avaa();
    expect(e.loki.jarjestys).toEqual(['reload', 'token:true', 'lataa']); expect(e.ctx.window._vanhVahvistamatta).toBe(false);
  });
  it('vahvistettu: ennallaan (ei reloadia eikä tokenin pakotusta, lapsi ladataan, koti + välilehdet)', async () => {
    const e = portti({ vahvistettu: true }); await e.ctx.avaa();
    expect(e.loki.jarjestys).toEqual(['lataa']); expect(e.pb.innerHTML).toContain('KOTI'); expect(e.pb.innerHTML).toContain('TABS');
  });
  it('"Olen vahvistanut — päivitä" portissa: ei vielä → toast, portti pysyy; vahvistunut → token + lapsen lataus (ei pelkkä kalenteri)', async () => {
    const e = portti({ vahvistettu: false }); await e.ctx.avaa();
    await e.ctx.paivita();
    expect(e.loki.toastit).toEqual(['Osoitetta ei ole vielä vahvistettu.']); expect(e.ctx.window._vanhVahvistamatta).toBe(true); expect(e.loki.jarjestys).not.toContain('lataa');
    e.ctx._auth.currentUser.reload = async () => { e.ctx._auth.currentUser.emailVerified = true; };
    e.loki.jarjestys.length = 0; await e.ctx.paivita();
    expect(e.loki.jarjestys).toEqual(['token:true', 'lataa']); expect(e.ctx.window._vanhVahvistamatta).toBe(false);
  });
  it('kytkentä: kirjautuminen kulkee portin kautta, uloskirjautuminen nollaa tilan, "jo vahvistettu" avaa portin', () => {
    const auth = VA.slice(VA.indexOf('_auth.onAuthStateChanged(async (user) =>'), VA.indexOf('_auth.onAuthStateChanged(async (user) =>') + 1600);
    expect(auth).toContain('await _vanhAvaaVahvistettuna();'); expect(auth).not.toMatch(/await _haeViimeisinKirjaus\(\)/); expect(auth).toContain('window._vanhVahvistamatta = null;');
    expect(pura(VA, 'function _kirjauduUlos(')).toContain('window._vanhVahvistamatta = null;');
    expect(pura(VA, 'async function _vanhLahetaVahvistus(')).toContain("if (tila === 'jo_vahvistettu') { await _vanhPaivitaVahvistus(); return; }");
    expect((VA.match(/await _haeViimeisinKirjaus\(\)/g) || []).length).toBe(1);   // ainoa kutsu = portin sisällä
  });
  it('uusi avain fi + en, sv odotuslistalla (erä 97, PM kirjoittaa)', () => {
    expect(LANG.TM_LANG.fi.vanhempi.vahvista_sahkoposti_yleinen).toBe('Vahvista sähköpostisi, niin näet lapsesi tiedot');
    expect(LANG.TM_LANG.en.vanhempi.vahvista_sahkoposti_yleinen).toBe("Verify your email to see your child's information");
    expect(LANG.TM_LANG.sv.vanhempi.vahvista_sahkoposti_yleinen).toBeUndefined();
    expect(require('./tm_lang_sv_odotuslista.cjs')).toContain('vanhempi.vahvista_sahkoposti_yleinen');
    const era = JSON.parse(lue('docs/i18n/sv_kaannoserae_97_gemini.json'));
    expect(era.osiot.tm_lang.rivit['vanhempi.vahvista_sahkoposti_yleinen']).toMatchObject({ fi: 'Vahvista sähköpostisi, niin näet lapsesi tiedot', sv: '' });
  });
  it('haeLapsiHuoltajalle ei kirjoita sähköpostia lokiin (vain uid)', () => {
    const f = lue('functions/index.js'), i = f.indexOf('exports.haeLapsiHuoltajalle'), lohko = f.slice(i, f.indexOf('\n  });', i));
    expect(lohko).toContain("console.error('[haeLapsiHuoltajalle]', context.auth.uid, e.message);"); expect(lohko).not.toMatch(/console\.\w+\([^)]*\bemail\b/);
  });
});

describe('Luontipolku ja SA-työkalu', () => {
  it('Rekisterointi_Suostumus: ohje mainitsee 1 h voimassaolon ja "Unohdin salasanan" -polun (uutta linkkiä ei tarvitse pyytää seuralta)', () => {
    const r = lue('TalentMaster_Rekisterointi_Suostumus.html'); expect(r).toContain('Linkki on voimassa 1 tunnin.'); expect(r).toContain('Unohdin salasanan'); expect(r).toContain('TalentMaster_Vanhempi_v2.html');
  });
  it('Excel_Tuonti SA-nappi: kuiva-ajo ensin (kuiva:true), lähetys vasta vahvistuksen jälkeen (kuiva:false); vain Super Admin', () => {
    const f = pura(lue('TalentMaster_Excel_Tuonti.html'), 'async function _adminHuoltajienVahvistus(');
    expect(f).toContain('if (!superAdmin)'); expect(f.indexOf('kuiva: true')).toBeGreaterThan(0); expect(f.indexOf('kuiva: false')).toBeGreaterThan(f.indexOf('kuiva: true')); expect(f).toContain('_sukupuoliRaporttiModal(');
    expect(f).toContain("httpsCallable('lahetaHuoltajienVahvistuslinkit')");
  });
});
