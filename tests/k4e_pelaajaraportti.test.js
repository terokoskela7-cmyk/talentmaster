/* K4e vaihe A · yhteinen Pelaajaraportti (lib/tm_pelaajaraportti.js) — PM_VASTAUS_K4E: hero · päätöslause · Kehityssuunnitelma · Tavoitteet · Psyykkinen (D3-lib) · kehityskeskustelun merkintä · Vie PDF.
   Ei radaria, kaarta, Scouting-linssiä eikä Ottelu-kaistaa. Unit (lib), Masterin/VP:n vanhat napit (oikeat funktiot vm:ssä: lippu päällä / pois / lukematta), sivun glue, Chrome (avaus, tavoitteet, PDF, print-CSS).
   Rules: tavoitteet-kirjoitus kattaa VP:n jo (onValmentajaRooli sisältää vp) → testit tests/rules/firestore.rules.test.js ("K4e: …"), Rules ei muutu. */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';
import { pura } from './helpers/master_pinfo.mjs';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const R = require('../lib/tm_pelaajaraportti.js'), KS = require('../lib/tm_kt_sivu.js'), D3 = require('../lib/tm_d3_kortti.js');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const odota = () => new Promise((r) => setTimeout(r, 0));
const P = { id: 'p1', etunimi: 'Aatu', sukunimi: 'Aalto', joukkue: 'Demo U13', pelipaikka: 'Keskikenttä', idp_tila: 'aktiivinen' };
const C = (extra) => Object.assign({ esc, pid: 'p1', nimi: 'Aatu Aalto', ika: 13, ikavaihe: 'Rakentaja', phv: 'PRE', chips: ['Q4 synt.'], testPvm: '2026-09-01', voiKirjoittaa: true, paatos: { teksti: 'Merkitse viikkohavainto', savy: 'teal' },
  kausi: { tila: 'ok', malli: { nimi: 'Ensikosketus', omin: 'haluan oppia', asetettu: '2026-08-15', kausi: 'syksy 2026', lahto: { arvo: 12.1, yks: 's', pvm: '2026-08-20' }, tavoite: { arvo: 11.5, yks: 's' } } },
  jakso: { nimi: 'Haltuunotto', domeeni: 'Teknis-taktinen', vk: 3, vkYht: 6 }, tavoitteet: { tila: 'ok', rivit: [{ id: 't1', teksti: 'Vasen jalka', tila: 'kaynnissa', tavoitepvm: '2026-11-01', valmentajaNimi: 'Vesa V', luotu: { seconds: 10 } }, { id: 't2', teksti: 'Peliäly', tila: 'saavutettu', luotu: { seconds: 20 } }] },
  review: { status: 'myohassa', ylimaaraPv: 5, viimeisinPvm: '2026-08-01' }, d3HTML: '<details class="tc-k tc-d3" data-tc-kortti="d3"><summary>Psyykkinen (D3)</summary></details>' }, extra || {});

describe('K4e A · raportin sisältö (lib)', () => {
  const h = R.tmRaporttiHTML(P, C());
  it('osiot järjestyksessä: hero · päätös · Kehityssuunnitelma · Tavoitteet · Psyykkinen · Kehityskeskustelu', () => {
    const jarj = ['pr-hero', 'data-pr-paatos', 'data-pr-sek="kehityssuunnitelma"', 'data-pr-sek="tavoitteet"', 'data-pr-sek="psyykkinen"', 'data-pr-sek="kehityskeskustelu"'].map((x) => h.indexOf(x)); expect(jarj.every((i) => i > 0)).toBe(true); expect([...jarj].sort((a, b) => a - b)).toEqual(jarj);
  });
  it('hero: nimi, ikävaihe, pelipaikka · joukkue · ikä · PHV, viimeisin testi, chipit; päätöslause teal-toimenpiteenä', () => {
    expect(h).toContain('Aatu Aalto'); expect(h).toContain('Pelaajaraportti · Rakentaja'); expect(h).toMatch(/Keskikenttä · Demo U13 · 13 v · PHV PRE · testattu 1\.9\.2026/); expect(h).toContain('Q4 synt.'); expect(h).toMatch(/pr-paatos toimi[^>]*><p>Merkitse viikkohavainto/);
    expect(R.tmRaporttiHTML(P, C({ paatos: null }))).toContain('Ei avointa toimenpidettä juuri nyt.');
  });
  it('Kehityssuunnitelma (pääosio): kausitavoite, omin sanoin, lähtö/tavoite mitattuna, IDP-tila, jakso nyt viikko n/k; tilat lataa / virhe / ei tavoitetta', () => {
    expect(h).toContain('Ensikosketus'); expect(h).toContain('haluan oppia'); expect(h).toContain('Lähtötaso: 12.1 s (mitattu 20.8.2026).'); expect(h).toContain('Tavoite: 11.5 s.'); expect(h).toContain('Aktiivinen'); expect(h).toContain('Haltuunotto'); expect(h).toContain('viikko 3/6');
    expect(R.tmRaporttiHTML(P, C({ kausi: { tila: 'lataa' } }))).toContain('Ladataan…'); expect(R.tmRaporttiHTML(P, C({ kausi: { tila: 'virhe' } }))).toMatch(/role="alert">Kauden tavoitetta ei voitu ladata/);
    expect(R.tmRaporttiHTML(P, C({ kausi: { tila: 'ok', malli: null }, jakso: null }))).toContain('Kauden tavoitetta ei ole asetettu.');
  });
  it('Tavoitteet: uusin ensin, tila-badge, valmentaja + tavoitepvm; lisäyslomake ja tilavalinta VAIN kirjoitusoikeudella (print: no-print)', () => {
    expect(h.indexOf('Peliäly')).toBeLessThan(h.indexOf('Vasen jalka')); expect(h).toMatch(/pr-badge saavutettu">Saavutettu/); expect(h).toContain('Tavoite 1.11.2026 · Vesa V');
    expect(h).toContain('id="prTavoiteTeksti"'); expect(h).toContain('maxlength="300"'); expect(h).toContain('_prTallennaTavoite(&quot;p1&quot;)'); expect((h.match(/class="pr-sel no-print"/g) || []).length).toBe(2);
    const lukija = R.tmRaporttiHTML(P, C({ voiKirjoittaa: false })); expect(lukija).not.toContain('prTavoiteTeksti'); expect(lukija).not.toContain('pr-sel'); expect(lukija).not.toContain('_prKirjaaKeskustelu'); expect(lukija).toContain('Vasen jalka');
    expect(R.tmRaporttiHTML(P, C({ tavoitteet: { tila: 'ok', rivit: [] } }))).toContain('Ei tavoitteita vielä.'); expect(R.tmRaporttiHTML(P, C({ tavoitteet: { tila: 'virhe', rivit: [] } }))).toContain('Tavoitteiden lataus epäonnistui.');
  });
  it('Psyykkinen = sama D3-kortti (lib/tm_d3_kortti.js) upotettuna; kehityskeskustelu: tila + "Kirjaa kehityskeskustelu" (vain kirjoitusoikeus)', () => {
    expect(h).toContain('data-tc-kortti="d3"'); expect(h).toContain('Yhteenveto myöhässä · 5 pv yli · viim. 1.8.2026'); expect(h).toContain('data-kt-kirjaa-keskustelu'); expect(h).toContain('_prKirjaaKeskustelu(&quot;p1&quot;)');
    const oikea = D3.tmD3KorttiHTML(D3.tmD3KorttiMalli({ id: 'p1', etunimi: 'Aatu' }, {}), { esc, pid: 'p1', voiKirjoittaa: true }); expect(R.tmRaporttiHTML(P, C({ d3HTML: oikea }))).toContain('Ei vielä D3-arviota.');
  });
  it('Vie PDF + Sulje; print-CSS piilottaa muun sivun ja no-print-osat; ei hex-värejä', () => {
    expect(h).toContain('data-pr-pdf'); expect(h).toContain('_prTulosta()'); const css = R.tmRaporttiCss(); expect(css).toMatch(/@media print\{body>\*:not\(\.pr-kuori\)\{display:none!important\}/); expect(css).toContain('.no-print{display:none!important}'); expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(lue('lib/tm_pelaajaraportti.js')).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
  it('RAJAUS (PM): ei radaria, kaarta, Scouting-linssiä eikä Ottelu-kaistaa', () => {
    expect(h).not.toMatch(/radar|kaari|Kehityskaari|Scouting|Ottelu|potentiaali/i); expect(lue('lib/tm_pelaajaraportti.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')).not.toMatch(/_tmRadar5D|_vpKehityskaariHTML|_vpPotentiaaliHTML|scouting/i);   // koodi, ei otsikkokommentti
  });
  it('XSS: pelaajan nimi, tavoiteteksti ja kausitavoite escapataan; lib ei kirjoita Firestoreen eikä lataa sitä (§7.22: vain henkilökunnan sivu)', () => {
    const x = R.tmRaporttiHTML(Object.assign({}, P, { joukkue: '<i>' }), C({ nimi: '<script>x</script>', tavoitteet: { tila: 'ok', rivit: [{ id: 'a"b', teksti: '<b>y</b>', tila: 'kaynnissa' }] } })); expect(x).not.toContain('<script>'); expect(x).not.toContain('<b>y</b>'); expect(x).not.toContain('<i>');
    expect(lue('lib/tm_pelaajaraportti.js')).not.toMatch(/\.collection\(|\.set\(|\.add\(|\.update\(|firebase/); ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'TalentMaster_ADAR_Pikakortti.html'].forEach((f) => expect(lue(f), f).not.toContain('tm_pelaajaraportti'));
  });
  it('tmRaporttiTavoiteRivit: uusin ensin, syöte ennallaan; avaimet fi — ktp_*-avaimia kierrätetään (ei kopioita)', () => {
    const syote = [{ id: 'a', luotu: { seconds: 1 } }, { id: 'b', luotu: { seconds: 3 } }, { id: 'c' }], kopio = JSON.stringify(syote); expect(R.tmRaporttiTavoiteRivit(syote).map((r) => r.id)).toEqual(['b', 'a', 'c']); expect(JSON.stringify(syote)).toBe(kopio);
    ['ktp_kausi', 'ktp_jakso_nyt', 'ktp_viikko', 'ktp_kirjaa_keskustelu'].forEach((k) => { expect(R.FI[k], k).toBeUndefined(); expect(require('../lib/tm_kt_polku.js').FI[k], k).toBeTruthy(); });
  });
  it('linkit: tmKtRaporttiLinkki (Profiili + ?avaa=raportti) ja tmKtAvaaParametri', () => {
    expect(KS.tmKtRaporttiLinkki('p2')).toBe('TalentMaster_Kehitystyopoyta.html?avaa=raportti#pelaaja/p2/profiili'); expect(KS.tmKtRaporttiLinkki('../x')).toBeNull(); expect(KS.tmKtAvaaParametri('?avaa=raportti')).toBe('raportti'); expect(KS.tmKtAvaaParametri('?x=1&avaa=raportti')).toBe('raportti'); expect(KS.tmKtAvaaParametri('?avaa=muu')).toBeNull(); expect(KS.tmKtAvaaParametri('')).toBeNull();
  });
});

describe('K4e A · Masterin ja VP:n vanhat raporttinapit (lippu päällä → yhteinen raportti; pois → vanha ennallaan)', () => {
  const MA = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
  function master(o) {
    const kutsut = []; const ctx = { console: { warn() {} }, Promise, _demo: !!o.demo, _seuraId: 'sjk', TM_KT_SIVU: KS, location: { href: '' }, _mJjLataaLiput: () => Promise.resolve({ kehitystyopoyta_v2: o.luettu === true }),
      toast: (m) => kutsut.push(['toast', m]), masterT: (x) => x, _pelaajatData: [], _prVoiNahda: () => true, document: { getElementById: () => null } };
    ctx.window = ctx; ctx._tmKtSivu = o.lippu; vm.createContext(ctx);
    vm.runInContext(['function _mKtSivuTieto(', 'function _mKtSivuPaatos('].map((t) => pura(MA, t)).join('\n') + '\n' + pura(MA, 'window._avaaPelaajaraportti = function') + ';\nthis._f = window._avaaPelaajaraportti;', ctx); ctx._kutsut = kutsut; return ctx;
  }
  it('Master: lippu päällä → #pelaaja/{pid}/profiili?avaa=raportti, vanhaan raporttiin ei mennä', () => { const c = master({ lippu: true }); c._f('p9'); expect(c.location.href).toBe('TalentMaster_Kehitystyopoyta.html?avaa=raportti#pelaaja/p9/profiili'); expect(c._kutsut).toEqual([]); });
  it('Master: lippu pois / _demo → vanha raportti ennallaan (tuntematon pelaaja → vanha "Pelaajaa ei löydy" -toast)', () => {
    const a = master({ lippu: false }); a._f('p9'); expect(a.location.href).toBe(''); expect(a._kutsut).toEqual([['toast', 'Pelaajaa ei löydy']]);
    const b = master({ lippu: true, demo: true }); b._f('p9'); expect(b.location.href).toBe(''); expect(b._kutsut).toEqual([['toast', 'Pelaajaa ei löydy']]);
  });
  it('Master: lippu lukematta → odottaa lupauksen: päällä → raportti sivulla, pois → vanha', async () => {
    const a = master({ lippu: undefined, luettu: true }); a._f('p9'); expect(a.location.href).toBe(''); await odota(); await odota(); await odota(); expect(a.location.href).toMatch(/\?avaa=raportti#pelaaja\/p9\/profiili$/);
    const b = master({ lippu: undefined, luettu: false }); b._f('p9'); await odota(); await odota(); await odota(); expect(b.location.href).toBe(''); expect(b._kutsut).toEqual([['toast', 'Pelaajaa ei löydy']]);
  });
  it('Master: pinfo-napin HTML ennallaan (v4b1-snapshot): _avaaPelaajaraportti(…)-onclick säilyy, ohjaus on funktion sisällä', () => { expect(MA).toContain(`<button onclick="_avaaPelaajaraportti(\\'' + p.id`); });
  function vp(o) {
    const k = []; const ctx = { console: { warn() {} }, Promise, _isDemoMode: !!o.demo, _seuraId: 'sjk', TM_KT_SIVU: KS, location: { href: '' }, _ktSivuLippu: o.lippu, _mdtPid: null, _mdtPalaveri: true, _mdtVanhEdit: true, _vpLataaLiput: () => Promise.resolve({ kehitystyopoyta_v2: o.luettu === true }),
      _mdtLataaTavoitteet: (p) => k.push(['tav', p]), _renderMDTProfiili: () => k.push(['vanha-raportti']) };
    ctx.window = ctx; vm.createContext(ctx); vm.runInContext(pura(VP, 'window._mdtValitse = function') + ';\nthis._f = window._mdtValitse;', ctx); ctx._k = k; return ctx;
  }
  it('VP: lippu päällä → yhteinen raportti; pois / demo → vanha raportti (_renderMDTProfiili) ennallaan; lukematta → odottaa', async () => {
    const on = vp({ lippu: true }); on._f('p9'); expect(on.location.href).toMatch(/\?avaa=raportti#pelaaja\/p9\/profiili$/); expect(on._k).toEqual([]);
    const off = vp({ lippu: false }); off._f('p9'); expect(off.location.href).toBe(''); expect(off._k).toEqual([['tav', 'p9'], ['vanha-raportti']]); expect(off._mdtPid).toBe('p9');
    const demo = vp({ lippu: true, demo: true }); demo._f('p9'); expect(demo._k).toEqual([['tav', 'p9'], ['vanha-raportti']]);
    const tyhja = vp({ lippu: true }); tyhja._f(''); expect(tyhja.location.href).toBe(''); expect(tyhja._k).toEqual([['vanha-raportti']]);   // valinnan tyhjennys ei ohjaa
    const luk = vp({ lippu: undefined, luettu: true }); luk._f('p9'); expect(luk.location.href).toBe(''); await odota(); await odota(); await odota(); expect(luk.location.href).toMatch(/#pelaaja\/p9\/profiili$/); expect(luk._k).toEqual([]);
    const luk2 = vp({ lippu: undefined, luettu: false }); luk2._f('p9'); await odota(); await odota(); await odota(); expect(luk2._k).toEqual([['tav', 'p9'], ['vanha-raportti']]);
  });
});

describe('K4e A · sivun glue (lähdevartijat)', () => {
  const S = lue('TalentMaster_Kehitystyopoyta.html');
  it('_avaaPelaajaraportti ei ole enää silta Masteriin; sivu määrittelee sen itse; URL-parametri avaa raportin ja siivotaan', () => {
    expect(S).not.toMatch(/\['_avaaPelaajaraportti'/); expect(S).toContain('window._avaaPelaajaraportti = function (pid) {'); expect(S).toContain('tmKtAvaaParametri(window.location.search)'); expect(S).toContain("history.replaceState(null, '', window.location.pathname + window.location.hash)");
  });
  it('TAVOITTEET: tallennuspolku ja muoto ENNALLAAN (tavoitteet/{id} + tavoite_aktiivinen_kpl), A5 serverTimestamp, tuore token, näkyvä virhe', () => {
    const t = pura(S, 'window._prTallennaTavoite = async function'); expect(t).toContain(".collection('pelaajat').doc(pid).collection('tavoitteet')"); expect(t).toContain('getIdToken(true)'); expect(t).toContain('serverTimestamp()');
    ['teksti: teksti', 'tavoitepvm:', "tila: 'kaynnissa'", 'valmentajaUid:', 'valmentajaNimi:', 'luotu:'].forEach((k) => expect(t, k).toContain(k)); expect(t).toContain('_voiKirjoittaa(p)'); expect(t).toContain("toast(TT('pr_tav_tallennus_virhe'))");
    const a = pura(S, 'async function _prPaivitaAktiiviset'); expect(a).toContain('tavoite_aktiivinen_kpl: n'); expect(a).toContain("=== 'kaynnissa'"); expect(pura(S, 'window._prVaihdaTila = async function')).toContain('.update({ tila: tila })');
    const MA = lue('TalentMaster_Master_v16.html'); expect(pura(MA, 'window._prTallennaTavoite = async function')).toContain(".collection('tavoitteet').add({");   // Masterin vanha polku: sama kokoelma
  });
  it('kehityskeskustelu = olemassa oleva sheet (_ktKesAvaa); päätöslause = Tänään-signaali (tmTanaanSignaali); D3-päivitys piirtää raportin uudelleen', () => {
    expect(S).toContain('window._prKirjaaKeskustelu = function (pid) { window._prSulje(); return window._ktKesAvaa(pid); };'); expect(pura(S, 'function _prCtx')).toContain('tmTanaanSignaali'); expect(pura(S, 'window._tallennaD3 = async function')).toContain('if (_pr.pid === pid) _prPiirra();');
  });
  it('lib-versiot: tm_pelaajaraportti.js ladataan, kt_sivu ?v=10 (Master + VP + sivu)', () => {
    expect(S).toMatch(/lib\/tm_pelaajaraportti\.js\?v=\d+/); ['TalentMaster_Kehitystyopoyta.html', 'TalentMaster_Master_v16.html', 'TalentMaster_VP_v25.html'].forEach((f) => expect(lue(f), f).toContain('lib/tm_kt_sivu.js?v=10'));
  });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('K4e A · Chrome: raportti Kehitystyöpöydällä (lippu päällä)', () => {
  const D3P = Object.assign({}, PELAAJAT[1], { d3_viimeisin: { pisteet: { resilience: { pelaaja: 2, valmentaja: 4, vp: 4 } }, pvm: '2026-10-12', lahteet: ['valmentaja', 'pelaaja'] }, idp_tila: 'aktiivinen' });
  const PEL = PELAAJAT.map((p) => (p.id === 'p2' ? D3P : p));
  const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'k4e-raportti');
  const SUODATA = (v) => v.filter((e) => !/sentry|integrity|Failed to load resource|net::ERR/i.test(e));
  const avaa = (selain, o) => kaynnista(selain, Object.assign({ rooli: 'valmentaja', hash: '#pelaaja/p2/profiili', pelaajat: PEL }, o || {}));
  it('Profiilin "Pelaajaraportti"-painike avaa raportin sivulla (ei siltaa Masteriin): osiot, D3-kortti, tavoitteen lisäys kirjoittaa vanhaan polkuun + pikakenttä, tilan vaihto, Vie PDF, Sulje', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await avaa(selain); await p.waitForSelector('[data-tc-raportti]', { timeout: 15000 }); await p.evaluate(() => { window.__pdf = 0; window.print = () => { window.__pdf++; }; });
      await p.locator('[data-tc-raportti]').click(); await p.waitForSelector('#prKuori [data-pelaajaraportti]', { timeout: 8000 }); expect(p.url()).toContain('TalentMaster_Kehitystyopoyta.html#pelaaja/p2/profiili');
      for (const s of ['kehityssuunnitelma', 'tavoitteet', 'psyykkinen', 'kehityskeskustelu']) expect(await p.locator('#prKuori [data-pr-sek="' + s + '"]').count(), s).toBe(1);
      expect(await p.locator('#prKuori .pr-nimi').innerText()).toBe('Bertta Bergh'); expect(await p.locator('#prKuori [data-pr-paatos]').count()).toBe(1); expect(await p.locator('#prKuori [data-tc-kortti="d3"] [data-d3-rivi="resilience"] .tc-d3-varo').innerText()).toBe('⚠');
      await p.waitForSelector('#prTavoitteet .pr-lause', { timeout: 8000 }); expect(await p.locator('#prTavoitteet').innerText()).toContain('Ei tavoitteita vielä.');
      await p.locator('#prTavoiteTeksti').fill('Vasen jalka pelitilanteessa'); await p.locator('#prTavoitePvm').fill('2026-11-15'); await p.locator('#prTavoiteBtn').click(); await p.waitForSelector('[data-pr-tavoite]', { timeout: 8000 });
      const kirj = await p.evaluate(() => window.__kirj), lisays = kirj.find((x) => x.add); expect(lisays.path).toMatch(/^seurat\/demo\/pelaajat\/p2\/tavoitteet\/auto\d+$/);
      expect(lisays.add).toMatchObject({ teksti: 'Vasen jalka pelitilanteessa', tavoitepvm: '2026-11-15', tila: 'kaynnissa', valmentajaUid: 'u1', luotu: 'TS' }); expect(Object.keys(lisays.add).sort()).toEqual(['luotu', 'tavoitepvm', 'teksti', 'tila', 'valmentajaNimi', 'valmentajaUid']);
      const pika = kirj.find((x) => x.path === 'seurat/demo/pelaajat/p2' && x.set && x.set.tavoite_aktiivinen_kpl != null); expect(pika.set).toEqual({ tavoite_aktiivinen_kpl: 1 });
      expect(await p.locator('[data-pr-tavoite] .pr-badge').innerText()).toBe('Käynnissä'); await p.locator('[data-pr-tavoite] select').selectOption('saavutettu'); await p.waitForFunction(() => document.querySelector('[data-pr-tavoite] .pr-badge').textContent === 'Saavutettu', null, { timeout: 8000 });
      const kirj2 = await p.evaluate(() => window.__kirj); expect(kirj2.some((x) => x.update && x.update.tila === 'saavutettu')).toBe(true); expect(kirj2.filter((x) => x.set && x.set.tavoite_aktiivinen_kpl === 0).length).toBe(1);   // pikakenttä päivittyy (0 käynnissä)
      await p.locator('[data-pr-pdf]').click(); expect(await p.evaluate(() => window.__pdf)).toBe(1);
      await p.locator('[data-pr-sulje]').click(); expect(await p.locator('#prKuori').count()).toBe(0); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('?avaa=raportti#pelaaja/p2/profiili avaa raportin suoraan ja siivoaa parametrin; print-CSS: vain raportti näkyy, no-print-osat piiloon; Escape sulkee', async () => {
    const selain = await selainKaynnista(); try {
      const { sk, p, virheet } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/profiili', pelaajat: PEL }); await p.waitForSelector('[data-tc-raportti]', { timeout: 15000 });
      const sk2 = await selain.newContext({ viewport: { width: 1280, height: 900 } }); await sk2.close();
      await p.goto(p.url().replace('#', '?avaa=raportti#')); await p.waitForSelector('#prKuori [data-pelaajaraportti]', { timeout: 15000 }); expect(p.url()).not.toContain('avaa=raportti');
      await p.emulateMedia({ media: 'print' }); expect(await p.locator('#prKuori').isVisible()).toBe(true); expect(await p.locator('#ktJuuri').isVisible()).toBe(false); expect(await p.locator('[data-pr-pdf]').isVisible()).toBe(false); expect(await p.locator('#prTavoiteTeksti').isVisible()).toBe(false); expect(await p.locator('.pr-nimi').isVisible()).toBe(true);
      await p.emulateMedia({ media: 'screen' }); await p.keyboard.press('Escape'); expect(await p.locator('#prKuori').count()).toBe(0); expect(SUODATA(virheet)).toEqual([]); await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('VP-rooli ja valmentaja: molemmat näkevät raportin ja voivat lisätä tavoitteen; "Kirjaa kehityskeskustelu" sulkee raportin ja avaa olemassa olevan sheetin; 390 px ei vaakavieritystä', async () => {
    const selain = await selainKaynnista(); try {
      for (const rooli of ['vp', 'valmentaja']) {
        const { sk, p, virheet } = await avaa(selain, { rooli, leveys: 390 }); await p.waitForSelector('[data-tc-raportti]', { timeout: 15000 }); await p.locator('[data-tc-raportti]').click(); await p.waitForSelector('#prTavoiteTeksti', { timeout: 8000 });
        expect(await p.evaluate(() => { const k = document.getElementById('prKuori'); return k.scrollWidth <= k.clientWidth; })).toBe(true);
        await p.locator('#prTavoiteTeksti').fill('Rooli ' + rooli); await p.locator('#prTavoiteBtn').click(); await p.waitForSelector('[data-pr-tavoite]', { timeout: 8000 });
        await p.locator('[data-kt-kirjaa-keskustelu]').click(); await p.waitForSelector('#prKuori', { state: 'detached', timeout: 5000 }); expect(SUODATA(virheet)).toEqual([]); await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
  it('KUVAT 1280 vaalea + 390 tumma (TM_KUVAT=1)', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); const selain = await selainKaynnista(); try {
      for (const [leveys, teema] of [[1280, 'light'], [390, 'dark']]) {
        const { sk, p } = await avaa(selain, { leveys, teema, korkeus: 1000 }); await p.waitForSelector('[data-tc-raportti]', { timeout: 15000 }); await p.locator('[data-tc-raportti]').click(); await p.waitForSelector('#prTavoitteet .pr-lause', { timeout: 8000 }); await p.waitForTimeout(600);
        await p.locator('#prTavoiteTeksti').fill('Vasen jalka pelitilanteessa'); await p.locator('#prTavoiteBtn').click(); await p.waitForSelector('[data-pr-tavoite]'); await p.waitForTimeout(400);
        await p.locator('#prKuori').evaluate((k) => { k.scrollTop = 0; }); await p.screenshot({ path: join(KUVAT, 'raportti-' + leveys + '-' + (teema === 'light' ? 'vaalea' : 'tumma') + '.png'), fullPage: false });
        await p.locator('#prKuori').evaluate((k) => { k.scrollTop = k.scrollHeight; }); await p.waitForTimeout(200); await p.screenshot({ path: join(KUVAT, 'raportti-' + leveys + '-' + (teema === 'light' ? 'vaalea' : 'tumma') + '-ala.png'), fullPage: false });
        await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
});
