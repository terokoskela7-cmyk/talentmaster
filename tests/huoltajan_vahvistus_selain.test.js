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
    const fi = LANG.TM_LANG.fi.vanhempi, en = LANG.TM_LANG.en.vanhempi, odotus = require('./tm_lang_sv_odotuslista.cjs');
    for (const k of ['vahvista_sahkoposti', 'vahvista_sahkoposti_ohje', 'laheta_vahvistus_uudelleen', 'olen_vahvistanut', 'vahvistus_lahetetty', 'vahvistus_odota', 'vahvistus_ei_viela', 'vahvistus_ei_onnistunut', 'kalenteri_ei_latautunut', 'yrita_uudelleen']) { expect(fi[k], k).toBeTruthy(); expect(en[k], k).toBeTruthy(); expect(odotus).toContain('vanhempi.' + k); }
    expect(pura(VA, 'function _vanhTapahtumatHTML(')).not.toMatch(/'[^']*Vahvista[^']*'/);
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
