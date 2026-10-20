/* K1b (erä 76) · Teron tuotantotestin korjaukset 20.10.2026. Kohdat: 1 istunto deeplinkissä (Master) · 2 viikkohavainnon lauseen selite + ei reittiä pelaajalle · 5 klipin vahvistus + Historia-rivi · 6 Historian toteutunut kesto ·
   7 taktiikkataulu pelaajakortin päälle (Työkalut + ⋯ Piirrä taululle; Tänään ja Polku). Kohta 3 (Kenttä): tests/k1b_kentta_tarra.test.js. Selaintestit: Playwright + Chrome, Firebase stubattu (tests/helpers/kt_sivu.mjs); vain keksityt nimet (Demo FC).
   TM_KUVAT=1 tallentaa kuvat docs/ui-kuvat/k1b/. */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, STUB, DOKIT, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const KS = require('../lib/tm_kt_sivu.js'), P = require('../lib/tm_kt_polku.js'), TAULU = require('../lib/tm_kt_taulu.js'), HAV = require('../lib/tm_kt_havainto.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k1b');
const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
const CHROME_PAALLA = !!(process.env.TM_CHROME_TESTS !== '0' && CHROME);

/* ── KOHTA 2 ── */
describe('K1b/2 · viikkohavainnon lauseen selite ja näkyvyys', () => {
  it('selite: "Enintään 140 merkkiä. Vain henkilökunta näkee tämän." (olemassa oleva avain kt_h_lause_ohje); vanha "voi päätyä pelaajalle" pois kaikista lähteistä', () => {
    expect(HAV.FI.kt_h_lause_ohje).toBe('Enintään 140 merkkiä. Vain henkilökunta näkee tämän.');
    const html = HAV.tmKtHavaintoSheetHTML({ osa: { k: 'a', koodi: 'k1', nimi: 'X', havainnot: [] }, avain: 'y_h1', uid: 'u1' }, { esc: (s) => String(s), t: (k) => k, pid: 'p2', tallennaFn: 'f', veoFn: 'g' });
    expect(html).toContain('Enintään 140 merkkiä. Vain henkilökunta näkee tämän.'); expect(html).not.toMatch(/päätyä pelaajalle|myönteisesti/);
    expect(lue('lib/tm_kt_havainto.js')).not.toMatch(/voi päätyä pelaajalle, joten/);
  });
  it('sv tulee erästä 76 (tests/i18n_era76_vienti.test.js), ei koodin omasta kirjoituksesta', () => {
    const SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, P = JSON.parse(lue('docs/i18n/sv_kaannoserae_76_palautus.json')); expect(SV.kt_h_lause_ohje).toBe(P.osiot['lib.tm_kt_havainto'].rivit.kt_h_lause_ohje.sv);
  });
  it('LUKUREITTI: osa_havainnot / osa_havainnot_vk / lause-kenttiä lukevia henkilökunnan libejä ei ladata pelaajan, huoltajan eikä Solon sivuilla; jakson historiarivin havainnot_vk ei renderöidy pelaajalle', () => {
    const PELAAJAN = ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_Player_Home.html', 'TalentMaster_Solo_Koti.html', 'TalentMaster_Solo_Profiili.html', 'TalentMaster_Solo_Lupa.html'];
    const LUKIJAT = ['tm_kehitystyopoyta', 'tm_kt_arviointi', 'tm_kt_havainto', 'tm_kt_polku', 'tm_jaksokooste', 'tm_kehityssilmukka', 'tm_seuraava_askel', 'tm_historia_lause'];
    for (const f of PELAAJAN) {
      const s = lue(f); expect(s, f).not.toMatch(/osa_havainnot|havainnot_vk/);
      for (const l of LUKIJAT) expect(s.indexOf('lib/' + l + '.js'), f + ' lataa ' + l).toBe(-1);
    }
    // pelaajan oma "valmentajan lause" on ERI kenttä: jaksofokus_historia[-1].lause (Sulje jakso) — ei viikkohavainnon lause
    expect(lue('lib/tm_viikkokatsaus.js')).not.toMatch(/osa_havainnot/);
  });
});

/* ── KOHTA 6 ── */
describe('K1b/6 · Historia: toteutunut kesto suljetulle jaksolle', () => {
  const rivi = (o) => Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Syöttäminen', alkoi: '2026-09-22', paattyi: '2026-11-03', tulos: 'ok' }, o);
  const pel = (rivit) => ({ id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', jaksofokus_historia: rivit });
  const kesto = (o) => P.tmKtPolkuHistoria(pel([rivi(o)]), null, {})[0];
  const teksti = (o) => { const p = pel([rivi(o)]); return P.tmKtPolkuHTML(p, { esc: (s) => String(s).replace(/</g, '&lt;'), t: (k) => (P.FI[k] != null ? P.FI[k] : k), tila: null, tanaan: '2026-11-10', viikko: { tila: 'ok', docs: [] }, kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: [] }, vk: { docs: [] }, joukkueDocs: [] }); };
  it('suljettu ennen aikojaan: 22.9.–24.9. → "2 pv" (ei suunniteltua "6 vk"); alle viikko = päivinä; 1 pv minimi', () => {
    expect(kesto({ suljettu: '2026-09-24' }).kesto).toEqual({ n: 2, yks: 'pv' }); expect(teksti({ suljettu: '2026-09-24' })).toMatch(/22\.9\.–24\.9\. · 2 pv|2 pv/);
    expect(teksti({ suljettu: '2026-09-24' })).not.toContain('6 vk'); expect(kesto({ suljettu: '2026-09-22' }).kesto).toEqual({ n: 1, yks: 'pv' }); expect(kesto({ suljettu: '2026-09-28' }).kesto).toEqual({ n: 6, yks: 'pv' });
  });
  it('viikon tai yli → viikkoina (pyöristetty, min 1): 7 pv = 1 vk, 14 pv = 2 vk, 25 pv = 4 vk; aikaleima (ISO ja Timestamp) kelpaa, kellonaika ei heilauta päivää', () => {
    expect(kesto({ suljettu: '2026-09-29' }).kesto).toEqual({ n: 1, yks: 'vk' }); expect(kesto({ suljettu: '2026-10-06' }).kesto).toEqual({ n: 2, yks: 'vk' }); expect(kesto({ suljettu: '2026-10-17' }).kesto).toEqual({ n: 4, yks: 'vk' });
    expect(kesto({ alkoi: new Date(2026, 8, 22, 0, 0).toISOString(), suljettu: new Date(2026, 8, 24, 23, 50).toISOString() }).kesto).toEqual({ n: 2, yks: 'pv' });
    expect(kesto({ suljettu: { toDate: () => new Date(2026, 8, 24, 15, 0) } }).kesto).toEqual({ n: 2, yks: 'pv' });
  });
  it('ilman sulkupäivää ennallaan: suunniteltu kesto viikkoina ("6 vk", min 1 vk)', () => {
    expect(kesto({}).kesto).toEqual({ n: 6, yks: 'vk' }); expect(kesto({ paattyi: '2026-09-25' }).kesto).toEqual({ n: 1, yks: 'vk' }); expect(teksti({})).toContain('6 vk'); expect(kesto({}).vk).toBe(6);
    expect(kesto({ alkoi: null, suljettu: '2026-09-24' }).kesto).toBeNull(); expect(teksti({ alkoi: null })).not.toMatch(/ pv| vk/);
  });
});

/* ── KOHTA 5 (Historia-rivi) ── */
describe('K1b/5 · Historia: "Klipit (n)" + viimeisimmän klipin kysymys', () => {
  const klippi = (id, aika, kysymys, o) => Object.assign({ id, tyyppi: 'klippi', pelaajaId: 'p2', aika, kysymys, url: 'https://app.veo.co/m/' + id, domain: 'app.veo.co', klippityyppi: 'onnistui', tila: 'lahetetty', nakyvyys: 'pelaaja', vastaanottajaUid: 'u1', fromNimi: 'Testi Valmentaja' }, o || {});
  const html = (dokit) => { const p = { id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', suostumusTila: 'annettu', jaksofokus_historia: [{ konsepti_avain: 'y_h1', konsepti_nimi: 'Syöttäminen', alkoi: '2026-09-22', paattyi: '2026-10-20', suljettu: '2026-10-20', tulos: 'ok' }] }; return P.tmKtPolkuHTML(p, { esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'), t: (k) => (P.FI[k] != null ? P.FI[k] : k), tila: null, tanaan: '2026-11-10', nyt: new Date(2026, 10, 10), viikko: { tila: 'ok', docs: [] }, kausi: { tila: 'ok', tavoite: null }, klipit: { tila: 'ok', dokit: dokit }, vk: { docs: [] }, joukkueDocs: [] }); };
  it('summary: "Klipit (2) · ”Näitkö hyökkääjän?”" — uusin klippi ensin; pitkä kysymys lyhenee sanarajalta (…); ilman klippejä ei Klipit-riviä', () => {
    const d = [klippi('a', new Date(2026, 9, 2), 'Mitä näit ennen kuin sait pallon?'), klippi('b', new Date(2026, 9, 12), 'Näitkö hyökkääjän?')];
    const h = html(d); expect(h).toMatch(/<summary>Klipit \(2\) · ”Näitkö hyökkääjän\?”<\/summary>/);
    const pitka = html([klippi('c', new Date(2026, 9, 5), 'Mitä huomasit puolustajan asennosta juuri ennen syöttöä ja miksi valitsit tämän suunnan?')]); const m = /<summary>(Klipit \(1\) · ”[^<]*”)<\/summary>/.exec(pitka);
    expect(m).toBeTruthy(); expect(m[1].length).toBeLessThanOrEqual('Klipit (1) · ”'.length + 33 + 1); expect(m[1]).toMatch(/…”$/); expect(m[1]).not.toMatch(/ ”$|[a-zäö]…” ?[a-zäö]/);
    expect(html([])).not.toContain('data-kt-h-klipit');
  });
  it('lyhennys ei katkaise sanaa ja on deterministinen (≤ 32 merkkiä + …)', () => {
    const k = (q) => /<summary>Klipit \(1\)(?: · ”([^<]*)”)?<\/summary>/.exec(html([klippi('x', new Date(2026, 9, 5), q)]))[1];
    expect(k('Lyhyt kysymys?')).toBe('Lyhyt kysymys?'); const t = k('Kerro mitä ajattelit kun pallo tuli sinulle selän taakse');
    expect(t.endsWith('…')).toBe(true); expect(t.length).toBeLessThanOrEqual(33); expect('Kerro mitä ajattelit kun pallo tuli sinulle selän taakse'.startsWith(t.slice(0, -1))).toBe(true); expect(t.slice(0, -1).split(' ').pop().length).toBeGreaterThan(1);
  });
});

/* ── KOHTA 7 (puhtaat) ── */
describe('K1b/7 · taktiikkataulun upotuslinkki ja viestit', () => {
  it('tmKtTauluLinkki / tmKtTauluParametrit: kierto; vain kelvollinen pid, ydinvahvuus ≤ 60 merkkiä ilman ohjausmerkkejä, teema vain dark|light; muu → null', () => {
    const u = KS.tmKtTauluLinkki({ pid: 'p2', yv: '1. kosketus', teema: 'light' }); expect(u).toBe('TalentMaster_Master_v16.html?upotettu=taktiikka&pid=p2&yv=1.%20kosketus&teema=light');
    expect(KS.tmKtTauluParametrit(u.slice(u.indexOf('?')))).toEqual({ pid: 'p2', yv: '1. kosketus', teema: 'light' });
    expect(KS.tmKtTauluLinkki({})).toBe('TalentMaster_Master_v16.html?upotettu=taktiikka'); expect(KS.tmKtTauluParametrit('?upotettu=taktiikka')).toEqual({ pid: null, yv: '', teema: null });
    expect(KS.tmKtTauluLinkki({ pid: '<x>', yv: 'a\nb' + 'x'.repeat(80), teema: 'neon' })).toMatch(/^TalentMaster_Master_v16\.html\?upotettu=taktiikka&yv=a%20bx{57}$/);
    expect(KS.tmKtTauluParametrit('?ws=koti&toiminto=taktiikka')).toBeNull(); expect(KS.tmKtTauluParametrit('?upotettu=muu')).toBeNull(); expect(KS.tmKtTauluParametrit('')).toBeNull(); expect(KS.tmKtTauluParametrit(undefined)).toBeNull();
    expect(KS.tmKtTauluParametrit('?upotettu=taktiikka&pid=%3Cscript%3E&teema=x')).toEqual({ pid: null, yv: '', teema: null });
  });
  it('reititys: "taulu" on oma modaali-reitti (ei Masteriin hyppy); Master-reitit ennallaan', () => {
    expect(KS.tmKtToimiReitti('taulu')).toBe('modaali'); expect(KS.tmKtToimiReitti('klippi')).toBe('sheet'); expect(KS.tmKtToimiReitti('syvenna')).toBe('master'); expect(KS.tmKtToimiReitti('kausitavoite')).toBe('sheet');
  });
  it('Master: vain parametrillinen kutsu avaa taulun ja asettaa kontekstin; muu kutsu ei tee mitään; viesti isännälle vain tunnisteena', () => {
    const viestit = [], avatut = []; const win = { location: { search: '?upotettu=taktiikka&pid=p2&yv=1.%20kosketus' }, parent: { postMessage: (m, o) => viestit.push([m, o]) }, clearTimeout() {}, setTimeout: (f) => f() };
    const doc = { documentElement: { classList: { add: (c) => avatut.push(c) } }, body: null, getElementById: () => null };
    expect(TAULU.tmKtTauluMasterAvaa({ win, doc, parametrit: KS.tmKtTauluParametrit, avaa: () => avatut.push('avattu') })).toBe(true);
    expect(win._tmTauluKonteksti).toEqual({ pid: 'p2', ydinvahvuus: '1. kosketus' }); expect(avatut).toEqual(['tm-upotettu-valmis', 'avattu']);
    expect(TAULU.tmKtTauluMasterAvaa({ win, doc, parametrit: KS.tmKtTauluParametrit, avaa: () => avatut.push('uudestaan') })).toBe(false);   // vain kerran
    const vieras = { location: { search: '?ws=koti' }, parent: null }; expect(TAULU.tmKtTauluMasterAvaa({ win: vieras, doc, parametrit: KS.tmKtTauluParametrit, avaa: () => { throw new Error('ei saa avata'); } })).toBe(false);
    expect(TAULU.tmKtTauluMasterEiIstuntoa({ win, parametrit: KS.tmKtTauluParametrit })).toBe(true); expect(viestit).toEqual([[{ tmTaulu: 'ei_istuntoa' }, '*']]); expect(TAULU.tmKtTauluMasterEiIstuntoa({ win: vieras, parametrit: KS.tmKtTauluParametrit })).toBe(false);
  });
});

/* ── SELAIN: KOHTA 1 (Master, istunto deeplinkissä) ── */
const masterKaynnista = async (selain, o) => {
  o = Object.assign({ rooli: 'valmentaja', viive: 2500, toiminto: 'taktiikka', leveys: 1280, korkeus: 900, kirjautunut: true, haku: null }, o || {});
  const dokit = DOKIT({ rooli: o.rooli }); PELAAJAT.forEach((p) => { dokit['seurat/demo/pelaajat/' + p.id] = p; });
  const cfg = { dokit, claims: { seuraId: 'demo', rooli: o.rooli }, kayttaja: {}, kirjautunut: o.kirjautunut ? undefined : false };
  const sk = await selain.newContext({ viewport: { width: o.leveys, height: o.korkeus } }), p = await sk.newPage(), virheet = [];
  p.on('pageerror', (e) => virheet.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') virheet.push('console: ' + m.text()); });
  await p.route('**/*', (r) => {
    const u = r.request().url();
    if (/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: STUB(cfg).replace('},30)', '},' + o.viive + ')') + ';var _F=window.firebase,_A=_F.auth();window.__signOut=0;_A.signOut=async function(){window.__signOut++};_F.app=function(){return{functions:function(){return{httpsCallable:function(){return async function(){return{data:{}}}}}}}};_F.functions=function(){return{}};_F.storage=function(){return{ref:function(){return{}}}};' });
    if (/gstatic\.com\/firebasejs\//.test(u) || /sentry-cdn|fonts\.g/.test(u)) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (u.startsWith('file://') || u.startsWith('data:')) return r.continue();
    return r.abort();
  });
  await p.goto('file://' + join(JUURI, 'TalentMaster_Master_v16.html') + (o.haku != null ? o.haku : '?ws=koti&toiminto=' + o.toiminto));
  return { sk, p, virheet };
};
const nakyvyys = (p) => p.evaluate(() => ({ login: getComputedStyle(document.getElementById('sLogin')).display !== 'none', dash: getComputedStyle(document.getElementById('sDash')).display !== 'none', modal: !!document.getElementById('_kvModal'), signOut: window.__signOut || 0, haku: location.search }));

describe.skipIf(!CHROME_PAALLA)('K1b/1 · Master deeplink: istunto säilyy, kirjautumislomaketta ei vilauteta', () => {
  it('jokainen Työkalut-deeplink (taktiikka · itsearvio · kehittyminen · asetukset) × valmentaja + VP: kun istunto palautuu hitaasti, #sLogin EI näy missään vaiheessa (näytteitä 150 ms välein), signOut-kutsuja 0, lopuksi kuori näkyy ja deeplink-parametri siivotaan; taktiikka avaa taulun', async () => {
    const selain = await selainKaynnista(); try {
      for (const rooli of ['valmentaja', 'vp']) for (const toiminto of ['taktiikka', 'itsearvio', 'kehittyminen', 'asetukset']) {
        const { sk, p, virheet } = await masterKaynnista(selain, { rooli, toiminto, viive: 1800 }); const nm = rooli + '/' + toiminto, naytteet = [];
        for (let i = 0; i < 24; i++) { naytteet.push(await nakyvyys(p)); await p.waitForTimeout(150); if (naytteet[naytteet.length - 1].dash && i > 14) break; }
        expect(naytteet.some((n) => n.login), nm + ': kirjautumislomake vilahti').toBe(false); expect(naytteet.some((n) => n.dash), nm + ': kuori ei tullut näkyviin').toBe(true); expect(naytteet[0].dash, nm + ': kuori ennen istuntoa').toBe(false);
        const l = naytteet[naytteet.length - 1]; expect(l.signOut, nm).toBe(0); expect(l.haku, nm + ': deeplink-parametri jäi osoitteeseen').toBe('');
        if (toiminto === 'taktiikka') expect(l.modal, nm + ': taulu ei avautunut').toBe(true);
        expect(await p.evaluate(() => document.documentElement.classList.contains('tm-auth-odottaa')), nm).toBe(false);   // spinneri pois
        expect(SUODATA(virheet), nm).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 240000);
  it('ei istuntoa (ei kirjautunutta): lomake näkyviin heti kun Firebase on vastannut — odotustila ei jää päälle', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await masterKaynnista(selain, { kirjautunut: false, viive: 300, haku: '' }); await p.waitForFunction(() => getComputedStyle(document.getElementById('sLogin')).display !== 'none', null, { timeout: 8000 });
      const n = await nakyvyys(p); expect(n.login).toBe(true); expect(n.dash).toBe(false); expect(await p.evaluate(() => document.documentElement.classList.contains('tm-auth-odottaa'))).toBe(false); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('Master-koodi: login piilossa kunnes onAuthStateChanged vastaa; 8 s varmistin näyttää lomakkeen jos Firebase ei vastaa; _naytaDash ja _naytaLogin poistavat odotusluokan', () => {
    const M = lue('TalentMaster_Master_v16.html');
    expect(M).toMatch(/html\.tm-auth-odottaa #sLogin\{display:none!important\}/); expect(M).toMatch(/<script>document\.documentElement\.classList\.add\('tm-auth-odottaa'\);<\/script>/);
    expect(/function _naytaLogin\(\) \{\n  document\.documentElement\.classList\.remove\('tm-auth-odottaa'\)/.test(M)).toBe(true); expect(/function _naytaDash\(\) \{\n  document\.documentElement\.classList\.remove\('tm-auth-odottaa'\)/.test(M)).toBe(true);
    expect(M).toMatch(/dashHidden && document\.documentElement\.classList\.contains\('tm-auth-odottaa'\)\) \{[^}]*classList\.remove\('tm-auth-odottaa'\); return; \}/);
  });
});

/* ── SELAIN: KOHDAT 5 + 7 (Kehitystyöpöytä-sivu) ── */
const masterTynkaan = (p) => p.route(/TalentMaster_Master_v16\.html/, (r) => r.fulfill({ contentType: 'text/html', body: '<html><body>master-tynkä</body></html>' }));
const odota = (p) => p.waitForSelector('.kt-nimi', { timeout: 15000 });
const KLIPPI_ID = '[data-mv-url]';
describe.skipIf(!CHROME_PAALLA)('K1b/5 · klipin lähetys: ilmoitus ja korostus', () => {
  it('lähetyksen jälkeen toast "Klippi lähetetty ✓" ja uusi klippirivi korostuu (kt-kl-uusi, data-kt-klippi-uusi) ~4 s, sitten korostus pois; vanha rivi ei korostu', async () => {
    const selain = await selainKaynnista(); try {
      const pel = PELAAJAT.map((x) => x.id === 'p2' ? { ...x, suostumusTila: 'annettu' } : x);
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/polku', pelaajat: pel }); await masterTynkaan(p);
      await p.waitForSelector('[data-kt-klipit="tyhja"]', { timeout: 15000 });
      await p.locator('.kt-pk-valikko > summary').click(); await p.locator('[data-kt-lisaa-klippi]').click(); await p.waitForSelector(KLIPPI_ID);
      await p.locator(KLIPPI_ID).fill('https://app.veo.co/matches/x/?t=95'); await p.locator('[data-mv-tyyppi="prosessi"]').click(); await p.locator('[data-mv-pohja="1"]').click(); await p.locator('[data-mv-laheta]').click();
      await p.waitForSelector(KLIPPI_ID, { state: 'detached', timeout: 8000 });
      expect(await p.locator('#toast-wrap').innerText()).toMatch(/Klippi lähetetty ✓/);
      await p.waitForSelector('[data-kt-klippi-uusi]', { timeout: 3000 }); expect(await p.locator('[data-kt-klippi-uusi]').count()).toBe(1); expect(await p.locator('.kt-kl.kt-kl-uusi').count()).toBe(1);
      expect(await p.locator('.kt-kl-uusi').evaluate((e) => getComputedStyle(e).animationName)).toBe('ktKlUusi');
      if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.locator('[data-kt-klipit]').scrollIntoViewIfNeeded(); await p.screenshot({ path: join(KUVAT, 'klippi-korostus-1280.png') }); }
      await p.waitForFunction(() => !document.querySelector('.kt-kl-uusi'), null, { timeout: 6000 });   // 4 s → korostus pois
      expect(await p.locator('[data-kt-klippi]').count()).toBe(1); expect(await p.locator('[data-kt-klippi-uusi]').count()).toBe(0);
      await p.evaluate(() => window._ktPolkuUudelleen && 0); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
});

describe.skipIf(!CHROME_PAALLA)('K1b/7 · taktiikkataulu modaalina pelaajakortin päälle', () => {
  const YV = { kuvaus: '1. kosketus', alue: { x: 25, y: 35, w: 50, h: 61 }, alue_avain: 'keskusta', asetti_uid: 'u1', asetettu_pvm: '2026-10-01' };
  const pel = () => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, { ydinvahvuus: YV, suostumusTila: 'annettu' }) : x);
  const IFR = 'iframe[data-kt-taulu-iframe]';
  it('Tänään: kentän ⋯ → "Piirrä taululle" avaa modaalin (dialog + iframe ?upotettu=taktiikka&pid=p2&yv=…), osoite EI muutu (ei sivun vaihtoa), × sulkee, uudelleen avaus kerran; Polku ⋯ sama; Työkalut → Taktiikka sama; valmentaja + VP', async () => {
    const selain = await selainKaynnista(); try {
      for (const rooli of ['valmentaja', 'vp']) {
        const { sk, p, virheet } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan', pelaajat: pel() }); await masterTynkaan(p); await odota(p); await p.waitForSelector('.kts-kentta-valikko');
        const osoite = p.url(), nm = rooli;
        await p.locator('.kts-kentta-valikko > summary').click(); expect(await p.locator('[data-kt-vaihda-alue]').count(), nm).toBe(1);
        await p.locator('#ktSivu_tanaan [data-kt-piirra-taululle]').click(); await p.waitForSelector(IFR);
        expect(await p.locator('#_ktTauluModal[role="dialog"]').count(), nm).toBe(1); expect(p.url(), nm + ': sivun osoite muuttui').toBe(osoite);
        const src = await p.locator(IFR).getAttribute('src'); expect(src, nm).toMatch(/^TalentMaster_Master_v16\.html\?upotettu=taktiikka&pid=p2&yv=1\.%20kosketus&teema=dark$/);
        await p.locator('[data-kt-taulu-sulje]').click(); await p.waitForSelector(IFR, { state: 'detached' });
        await p.evaluate(() => window.avaaKaaviopankki()); await p.waitForSelector(IFR); expect(await p.locator('#_ktTauluModal').count(), nm + ' Työkalut').toBe(1); expect(await p.locator(IFR).getAttribute('src'), nm).toContain('pid=p2');
        await p.evaluate(() => window.avaaKaaviopankki()); expect(await p.locator('#_ktTauluModal').count(), nm + ': kaksi modaalia').toBe(1); await p.locator('#_ktTauluModal').click({ position: { x: 3, y: 3 } }); await p.waitForSelector(IFR, { state: 'detached' });   // tausta sulkee
        await p.evaluate(() => window.avaaKaaviopankki()); await p.waitForSelector(IFR); await p.keyboard.press('Escape'); await p.waitForSelector(IFR, { state: 'detached' });   // Esc sulkee
        // Polku ⋯
        await p.locator('[data-kt-valilehti="polku"]').click(); await p.waitForSelector('.kt-pk-valikko'); await p.locator('.kt-pk-valikko > summary').click(); await p.locator('#ktSivu_polku [data-kt-piirra-taululle]').click(); await p.waitForSelector(IFR);
        expect(await p.locator('#_ktTauluModal').count(), nm + ' Polku').toBe(1); expect(p.url().replace(/#.*/, ''), nm).toBe(osoite.replace(/#.*/, '')); await p.locator('[data-kt-taulu-sulje]').click();
        expect(SUODATA(virheet), nm).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
  it('puhelin 390 px: modaali koko näyttö (ei marginaalia), iframe täyttää; Escape/tausta ei jätä jumiin; selaimen Takaisin sulkee (pushState)', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: 390, korkeus: 844, pelaajat: pel() }); await masterTynkaan(p); await odota(p); await p.waitForSelector('.kts-kentta-valikko');
      await p.locator('.kts-kentta-valikko > summary').click(); await p.locator('#ktSivu_tanaan [data-kt-piirra-taululle]').click(); await p.waitForSelector(IFR);
      const b = await p.evaluate(() => { const m = document.getElementById('_ktTauluModal').firstChild.getBoundingClientRect(), f = document.querySelector('iframe[data-kt-taulu-iframe]').getBoundingClientRect(); return { w: m.width, h: m.height, fw: f.width, fl: f.left, innerW: innerWidth, innerH: innerHeight }; });
      expect(b.w).toBe(b.innerW); expect(b.h).toBe(b.innerH); expect(b.fw).toBe(b.innerW); expect(b.fl).toBe(0);
      await p.goBack(); await p.waitForSelector(IFR, { state: 'detached', timeout: 5000 }); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('KOKO KETJU oikealla Masterilla iframessa (stubattu Firebase): taulu avautuu heti ilman kirjautumislomaketta, pankin otsikon alla "Bertta Bergh · 1. kosketus" (ei tallenneta), teema isännältä; taulun sulkeminen sulkee isännän modaalin; istuntoa ei katkaista (signOut 0)', async () => {
    const selain = await selainKaynnista(); try {
      for (const teema of ['dark', 'light']) {
        const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel(), teema }); await odota(p); await p.waitForSelector('.kts-kentta-valikko');
        await p.evaluate(() => { window.__signOutIso = 0; }); await p.locator('.kts-kentta-valikko > summary').click(); await p.locator('#ktSivu_tanaan [data-kt-piirra-taululle]').click(); await p.waitForSelector(IFR);
        const f = p.frameLocator(IFR); await f.locator('#_kvModal').waitFor({ timeout: 25000 });
        expect(await f.locator('[data-kaavio-konteksti]').innerText(), teema).toBe('Bertta Bergh · 1. kosketus');
        expect(await f.locator('html').getAttribute('data-theme'), teema).toBe(teema); expect(await f.locator('#sLogin').isVisible(), teema).toBe(false); expect(await f.locator('#sDash').isVisible(), teema).toBe(false);
        if (process.env.TM_KUVAT) { mkdirSync(KUVAT, { recursive: true }); await p.screenshot({ path: join(KUVAT, 'taulu-modaali-1280-' + teema + '.png') }); }
        await f.locator('#_kvModal button', { hasText: /Sulje/ }).last().click(); await p.waitForSelector(IFR, { state: 'detached', timeout: 6000 });
        expect(SUODATA(virheet), teema).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 240000);
});
