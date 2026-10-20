/* Sibbo 1.11. · klippien jakopolku päästä päähän RUOTSIKSI (Playwright + Chrome; chrome-tests-job). PYSYVÄ PORTTI: jos käyttäjälle näkyvä teksti putoaa
   suomeen sv-tilassa, testi on punainen. Kolme vaihetta oikeissa kuorissa mock-Firestorella (ei verkkoa, ei oikeaa dataa):
   (a) VALMENTAJA (Master_v16): Lisää klippi -sheet (vastaanottajat, tyyppi, kysymyspohjat, saate, linkin tunnistus), virhe-/onnistumistoastit,
       Inbox-rivit (kaikki tilat + Arkisto), ketju + kuittaus, joukkueklipin ryhmälista, Polun Klipit-kortti (+ tyhjä tila).
   (b) PELAAJA (Pelaaja_v7): Tänään-kortti U13–14 'valinta' ja U15+ 'lause': valinta, oma teksti, Lähetetään-tila, virheet, vastattu/luettu/kuittaus, muut klipit.
   (c) HUOLTAJA (Vanhempi_v2): Katsokaa yhdessä (U8–12): lapsen valinta + "Katsoimme yhdessä" + lähetys, virheet; U13+ keskustelu lukutilassa.
   Kerätään näkyvä teksti (tekstisolmut + title/aria-label/placeholder) ja toastit. Suomen tunnistus: (i) TARKKA — klippiketjun fi-tekstit (tm_mediaviesti.FI,
   tm_klippi_perhe.FI, kysymyspohjat, adapterien masterT/tm_lang-fi-tekstit) eivät saa esiintyä; (ii) HEURISTIIKKA — suomen sanat (lista + tools/i18n/sv_lapiajo_fi.mjs),
   suomalainen viikonpäivä päiväyksessä ("ma 19.10.") ja raa'at avaimet (mv_/kp_/pelaaja./vanhempi.). Geminiltä odottavat avaimet: SV_ODOTTAA (elävä lista).
   Negatiivitesti: sama polku fi-tilassa → tunnistin löytää suomen (ei tyhjä portti). */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu, NYT } from './helpers/kalenteri_sivu.mjs';
import { perheSivu } from './helpers/perhe_sivu.mjs';
import { onkoSuomea } from '../tools/i18n/sv_lapiajo_fi.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const MV = require('../lib/tm_mediaviesti.js'), KP = require('../lib/tm_klippi_perhe.js'), LIB = require('../lib/tm_lib_i18n.js'), LANG = require('../lib/tm_lang.js');

/* Klippipolun lib-avaimet, joille sv puuttuu (docs/i18n/sv_kaannoserae_36.json → Gemini; 15.10.2026 erät 51+52 vietiin). Elävä: sv saapui → poista rivi (testi alla kaatuu muuten). */
export const SV_ODOTTAA = [];   // A (18.10.2026): klippikortin painike + Uusi-merkki saapuivat erässä 68 ja vietiin (scripts/i18n_vie_sv_era68.cjs) · aiemmin erä 42: ryhmäklippi + oma videoklippi -varaus
/* Valmentajan pelaajanäkymän Masterin fi-tekstiavaimet (masterT), joille sv puuttuu Master-kartasta (docs/i18n/sv_kaannoserae_37.json → Gemini). Elävä: sv saapui → poista rivi. */
export const MASTER_SV_ODOTTAA = ['ei asetettu'];   // lib/tm_vastuuhenkilo.js t('ei asetettu') masterT:n kautta (IDP-kortin Vastuuhenkilö-rivi)
/* K1c (erä 78): lib-tekstit joiden sv odottaa Geminiä ja jotka näkyvät valmentajan pelaajanäkymässä; poista kun sv saapuu (LIB_SV_ODOTTAA: tests/i18n_sv_era_lib.test.js) */
const LIB_FI_ODOTTAA = require('./helpers/k1d_korvaukset.cjs').era80FiOdottaa();   // erä 78 vietiin 20.10.; K1d: erän 80 uudet lib-tekstit odottavat Geminiä
const MA_SV = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;

/* ── tunnistus ── */
const svLib = (k) => LIB.tmLibT(k, 'sv');
const KONSEPTI_FI = require('../lib/tm_teknistaktiset.js').tmTtItems({ ika: 13, joukkue: 'P13', syntymaVuosi: new Date(NYT).getFullYear() - 13 }).find((x) => x.avain === 'y_h2').nimi;   // tallennettu jaksofokus.konsepti_nimi on fi (data) → näyttö kääntää avaimella
const FI_TEKSTIT = (() => {   // avain → fi (vain ne, joiden sv ≠ fi; odottavat pois)
  const m = { 'data:jaksofokus.konsepti_nimi': KONSEPTI_FI };
  for (const [k, v] of Object.entries(Object.assign({}, MV.FI, KP.FI))) if (SV_ODOTTAA.indexOf(k) < 0 && svLib(k) !== v) m[k] = v;
  const lang = (p) => p.split('.').reduce((a, x) => a && a[x], LANG.TM_LANG.fi);
  for (const k of ['pelaaja.kirjaus_ei_tallentunut_kirjaudu_uu', 'pelaaja.ei_yhteytta_kirjaus', 'vanhempi.kirjaa_virhe_verkko']) m[k] = lang(k);
  for (const k of ['Tallennus epäonnistui', 'Peru', '＋ klippi', 'Toiminto peruttu']) m['master:' + k] = k;
  return m;
})();
const SANAT = ['valitse', 'tallenna', 'peruuta', 'lähetä', 'lähetetty', 'lähetetään', 'katso', 'katsokaa', 'katsoimme', 'vastaus', 'vastasit', 'vastausta', 'kysymys', 'joukkue', 'huoltaja', 'pelaaja', 'pelaajaa', 'seuraava', 'tänään', 'kuittaa', 'kuittaus', 'sulje', 'avaa', 'lisää', 'poista', 'virhe', 'yritä', 'uudelleen', 'jaettu', 'valmentaja', 'linkki', 'kuva', 'klippi', 'suljettu', 'odottaa', 'suostumus', 'tyyppi', 'saate', 'kohta'];
const SANA_RE = new RegExp('(^|[^\\p{L}])(' + SANAT.join('|') + ')($|[^\\p{L}])', 'iu');
const VIIKONPAIVA_RE = /(^|[^\p{L}])(su|ma|ti|ke|to|pe|la) \d{1,2}\.\d{1,2}\./u;
const AVAIN_RE = /\b(mv|kp)_[a-z0-9_]+\b|\b(pelaaja|vanhempi)\.[a-z0-9_]+\b/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ODOTTAA_RE = SV_ODOTTAA.map((k) => String(MV.FI[k] || KP.FI[k] || k)).concat(MASTER_SV_ODOTTAA).concat(LIB_FI_ODOTTAA).map((x) => new RegExp('(^|[^\\p{L}])' + esc(x).replace(/\\\{\w+\\\}/g, '.+?') + '($|[^\\p{L}])', 'gu'));   // {muuttuja} fi-mallissa = mikä tahansa teksti (esim. 'Oma videoklippi ({min}–{max} s)')   // Geminiltä odottavat: fi sallittu kunnes sv saapuu
const PALAT = Object.entries(FI_TEKSTIT).flatMap(([k, v]) => String(v).split(/\{\w+\}/).map((x) => x.trim()).filter((x) => (x.match(/\p{L}/gu) || []).length >= 4).map((x) => [k, new RegExp('(^|[^\\p{L}])' + esc(x) + '($|[^\\p{L}])', 'u')]));
export function suomiJaanteet(kerätyt, sallitut) {
  const ok = (t) => (sallitut || []).some((s) => t.indexOf(s) >= 0 && t.replace(s, '').replace(/[\s·—–:,.()„“"'0-9✓＋+@-]/g, '').length === 0);
  const ulos = [];
  for (const { vaihe, teksti } of kerätyt) {
    const t = ODOTTAA_RE.reduce((x, re) => x.replace(re, '$1$2'), teksti.replace(/^@[a-z-]+:/, ''));
    if (ok(t)) continue;
    const syyt = [];
    for (const [k, re] of PALAT) if (re.test(t)) syyt.push('fi-teksti ' + k);
    if (SANA_RE.test(t)) syyt.push('fi-sana ' + t.match(SANA_RE)[2]);
    if (VIIKONPAIVA_RE.test(t)) syyt.push('fi-viikonpäivä');
    if (AVAIN_RE.test(t)) syyt.push('raaka avain');
    if (!syyt.length && onkoSuomea(t).fi) syyt.push('heuristiikka');
    if (syyt.length) ulos.push(vaihe + ' :: ' + JSON.stringify(teksti) + ' ← ' + Array.from(new Set(syyt)).join(', '));
  }
  return Array.from(new Set(ulos));
}
/* Sivulla: kerää näkyvät tekstisolmut + title/aria-label/placeholder valitsimien alta (ei syöttökenttien arvoja = käyttäjän sisältöä) */
const KERAA = 'window.__keraa=function(sel){var out=[];document.querySelectorAll(sel).forEach(function(r){var w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode())){var s=n.nodeValue.replace(/\\s+/g," ").trim(),pe=n.parentElement;if(!s||!pe||pe.tagName==="TEXTAREA"||pe.tagName==="SCRIPT"||pe.tagName==="STYLE")continue;if(pe.closest("[hidden]")||getComputedStyle(pe).display==="none")continue;out.push(s)}[r].concat(Array.prototype.slice.call(r.querySelectorAll("*"))).forEach(function(e){["title","aria-label","placeholder"].forEach(function(a){var v=e.getAttribute&&e.getAttribute(a);if(v&&v.trim())out.push("@"+a+":"+v.trim())})})});return out};';

/* ── fixture (keksityt, kieliltään neutraalit nimet; käyttäjän sisältö emojeina) ── */
const PV = 86400000, H = 3600000;
const vuosi = new Date(NYT).getFullYear();
const pohjaFi = (ty, r, i) => MV.POHJAT[ty][r][i - 1];
const svValinta = (k) => svLib(k);   // lapsen valinta tallentuu vastaajan kielellä — otetaan Gemini-kartasta, ei kirjoiteta itse
const MASTER_PELAAJAT = [
  { id: 'p1', etunimi: 'Alva', sukunimi: 'Berg', syntymaVuosi: vuosi - 13, joukkue: 'Sibbo Demo', joukkueet: ['demo_sb'], suostumusTila: 'annettu' },
  { id: 'p2', etunimi: 'Elis', sukunimi: 'Lund', syntymaVuosi: vuosi - 10, joukkue: 'Sibbo Demo', joukkueet: ['demo_sb'], suostumusTila: 'annettu' },
  { id: 'p3', etunimi: 'Noel', sukunimi: 'Ek', syntymaVuosi: vuosi - 13, joukkue: 'Sibbo Demo', joukkueet: ['demo_sb'], suostumusTila: 'odottaa' },
  { id: 'p4', etunimi: 'Ines', sukunimi: 'Holm', syntymaVuosi: vuosi - 16, joukkue: 'Sibbo Demo', joukkueet: ['demo_sb'], suostumusTila: 'annettu' }
];
const NIMET = ['Alva Berg', 'Elis Lund', 'Noel Ek', 'Ines Holm', 'Alva', 'Elis', 'Noel', 'Ines', 'Berg', 'Lund', 'Ek', 'Holm', 'Sibbo Demo', 'Alex Coach', 'Maalivahdit', 'app.veo.co', 'example.org', 'kuvat.example.org', '👍'];
const klippi = (id, o) => Object.assign({ id, tyyppi: 'klippi', url: 'https://app.veo.co/matches/1/?t=75', domain: 'app.veo.co', mediatyyppi: 'video', kohta_s: 75, klippityyppi: 'onnistui', kysymys: pohjaFi('onnistui', 'rakentaja', 1), kysymys_avain: 'mv_pohja_onnistui_rakentaja_1', klippi_id: 'kl_' + id, vastaanottajaUid: 'u1', lahettajaUid: 'u1', fromRole: 'valmentaja', fromNimi: 'Alex Coach', tila: 'lahetetty', nakyvyys: 'pelaaja', luettu: false, saate: '👍', aika: NYT - H, nakyva_alkaen: NYT - H }, o);
const vastaus = (id, kid, o) => Object.assign({ id, tyyppi: 'klippi_vastaus', vastaus_viestille: kid, vastaanottajaUid: 'u1', nakyvyys: 'pelaaja', luettu: false, aika: NYT - H / 2 }, o);
const MASTER_DOKIT = [
  klippi('ka', { pelaajaId: 'p1', pelaajaNimi: 'Alva Berg' }),
  klippi('kb', { pelaajaId: 'p4', pelaajaNimi: 'Ines Holm', klippityyppi: 'prosessi', kysymys: pohjaFi('prosessi', 'showcase', 2), kysymys_avain: 'mv_pohja_prosessi_showcase_2', aika: NYT - 2 * H }), vastaus('vb', 'kb', { pelaajaId: 'p4', teksti: '👍' }),
  klippi('kc', { pelaajaId: 'p2', pelaajaNimi: 'Elis Lund', nakyvyys: 'huoltaja', klippityyppi: 'tulos', kysymys: pohjaFi('tulos', 'leikkija', 1), kysymys_avain: 'mv_pohja_tulos_leikkija_1', aika: NYT - 3 * H }),
  vastaus('vc', 'kc', { pelaajaId: 'p2', valinta: '__SV:kp_valinta_leikkija_1', fromRole: 'huoltaja' }), { id: 'vc2', tyyppi: 'klippi_kuittaus', kuittaus: true, vastaus_viestille: 'kc', pelaajaId: 'p2', vastaanottajaUid: 'u1', nakyvyys: 'pelaaja', aika: NYT - H / 2 },
  klippi('kd', { pelaajaId: 'p3', pelaajaNimi: 'Noel Ek', url: 'https://kuvat.example.org/a.jpg', domain: 'kuvat.example.org', mediatyyppi: 'kuva', kohta_s: null, aika: NYT - 4 * H }),
  klippi('ke', { pelaajaId: 'p1', pelaajaNimi: 'Alva Berg', tila: 'suljettu', kuittaus_lause: '👍', url: 'https://example.org/x', domain: 'example.org', mediatyyppi: 'linkki', kohta_s: null, aika: NYT - 2 * PV }), vastaus('ve', 'ke', { pelaajaId: 'p1', teksti: '👍', luettu: true, aika: NYT - 2 * PV + H }),
  klippi('kf1', { pelaajaId: 'p1', klippi_id: 'kl_f', joukkueklippi: true, kysymys: MV.FI.mv_joukkue_kysymys, kysymys_avain: 'mv_joukkue_kysymys', aika: NYT - 5 * H }),
  klippi('kf2', { pelaajaId: 'p4', klippi_id: 'kl_f', joukkueklippi: true, kysymys: MV.FI.mv_joukkue_kysymys, kysymys_avain: 'mv_joukkue_kysymys', aika: NYT - 5 * H }), vastaus('vf', 'kf2', { pelaajaId: 'p4', teksti: '👍' })
];
const ratkaise = (dokit) => JSON.parse(JSON.stringify(dokit).replace(/"__SV:([a-z_0-9]+)"/g, (_, k) => JSON.stringify(svValinta(k))));

const kaynnista = async () => { const { chromium } = require('playwright-core'); return chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] }); };
const odota = (p, ms) => p.waitForTimeout(ms || 60);

/* ── (a) valmentaja: Master ── */
async function masterPolku(selain, kieli) {
  const kerätyt = [], k = async (p, vaihe, sel) => { for (const t of await p.evaluate((s) => window.__keraa(s), sel)) kerätyt.push({ vaihe, teksti: t }); };
  const sk = await selain.newContext({ viewport: { width: 1280, height: 900 } }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  const alku = KERAA + 'firebase.auth=function(){return{currentUser:{uid:"u1",displayName:"Alex Coach",getIdToken:async function(){return"x"}}}};'
    + 'window.__toastit=[];var __t0=toast;toast=function(m,a){window.__toastit.push(String(m));__t0(m,a)};'
    + '_joukkue="Sibbo Demo";_pelaajatData=' + JSON.stringify(MASTER_PELAAJAT) + ';window._mvDokit=' + JSON.stringify(ratkaise(MASTER_DOKIT)) + ';'
    + (kieli === 'sv' ? 'masterVaihdaKieli("sv");' : 'masterVaihdaKieli("fi");') + 'setWs("inbox");renderInbox();';
  await p.goto('file://' + sivu(lue('TalentMaster_Master_v16.html'), JUURI, { rooli: 'valmentaja', pohjat: false, kutsu: alku })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
  expect(await p.locator('#probe-out').textContent()).toBe('ok');
  const toastit = async (vaihe) => { for (const t of await p.evaluate(() => window.__toastit.splice(0))) kerätyt.push({ vaihe: vaihe + ' [toast]', teksti: t }); await k(p, vaihe + ' [toast-wrap]', '#toast-wrap'); };
  // Inbox: rivit kaikissa tiloissa + ＋ klippi -nappi; Arkisto (suljettu)
  await k(p, 'Inbox-rivit', '#inboxList [data-viesti-tyyppi="klippi"], #mvKlippiNappi');
  expect(await p.locator('#inboxList [data-viesti-tyyppi="klippi"]').count()).toBe(5);
  await p.evaluate(() => setInboxFilter('seen')); await k(p, 'Inbox-Arkisto', '#inboxList [data-viesti-tyyppi="klippi"]'); await p.evaluate(() => setInboxFilter('unseen'));
  // Ketju: odottaa → kuittaus (virhe: liian pitkä; ok) · perhe kuittasi · joukkueklipin ryhmälista
  await p.evaluate(() => _mvAvaaKetju('kl_ka')); await k(p, 'Ketju (odottaa)', '#_mvKetju');
  await p.evaluate(() => { _mvKuittausLause('x'.repeat(130)); return _mvKuittaa(); }); await toastit('Kuittaus liian pitkä');
  await p.evaluate(() => { _mvKuittausLause('👍'); return _mvKuittaa(); }); await odota(p); await toastit('Kuittaus ok');
  await p.evaluate(() => _mvAvaaKetju('kl_kc')); await k(p, 'Ketju (perhe kuittasi)', '#_mvKetju'); await p.evaluate(() => _mvKetjuSulje());
  await p.evaluate(() => _mvAvaaKetju('kl_kb')); await k(p, 'Ketju (vastattu)', '#_mvKetju'); await p.evaluate(() => _mvKetjuSulje());
  await p.evaluate(() => _mvAvaaKetju('kl_f')); await k(p, 'Joukkueklippi (ryhmälista)', '#_mvKetju'); await p.evaluate(() => _mvKetjuSulje());
  // Lisää klippi -sheet: yksi → linkin tunnistus (virhe, video, kuva, linkki) → tyyppi → pohja → valitut (+ ilman suostumusta) → koko joukkue
  await p.evaluate(() => _mvAvaa('p1')); await k(p, 'Sheet (yksi)', '#_mvModal');
  for (const [u, n] of [['http://x.example.org', 'ei https'], ['https://app.veo.co/m/1?t=75', 'video'], ['https://kuvat.example.org/a.jpg', 'kuva'], ['https://example.org/sivu', 'linkki']]) { await p.locator('#_mvModal [data-mv-url]').fill(u); await k(p, 'Sheet tunnistus (' + n + ')', '#_mvModal [data-mv-tunnistus]'); }
  for (const ty of ['prosessi', 'tulos', 'onnistui']) { await p.locator('#_mvModal [data-mv-tyyppi="' + ty + '"]').click(); await k(p, 'Sheet tyyppi ' + ty, '#_mvModal'); }
  await p.locator('#_mvModal [data-mv-pohja="1"]').click(); await k(p, 'Sheet pohja valittu', '#_mvModal');
  await p.locator('#_mvModal [data-mv-kohde="valitut"]').click(); await p.locator('#_mvModal [data-mv-pelaaja="p3"]').check(); await k(p, 'Sheet valitut + ei suostumusta', '#_mvModal');
  await p.locator('#_mvModal [data-mv-kohde="joukkue"]').click(); await k(p, 'Sheet koko joukkue', '#_mvModal');
  await p.evaluate(() => _mvSulje());
  // Klippi RYHMÄLLE + oma videoklippi -varaus (Sibbo 1.11.): ryhmävalinta, "n pelaajaa, joista m odottaa lupaa", lähetys, ryhmärivi ("Maalivahdit · 1/3 vastannut") + purku pelaajakohtaisiksi; lisäpalveluvaihtoehto kolmessa tilassa
  const RYHMA_DATA = { ryhmat: [{ id: 'mv', nimi: 'Maalivahdit', tyyppi: 'lista', pelaajat_id: ['p1', 'p2', 'p3'], valmentajat: ['u1'], aktiivinen: true }], lippu: false, pelaajat: MASTER_PELAAJAT };
  const avaaRyhma = async (d, rooli) => { await p.evaluate(() => _mvAvaa('p1')); await odota(p, 150); await p.evaluate(([d, rooli]) => { const S = window._mvTila, c = _mvKrCtx(); if (rooli) c.rooli = rooli; window.TM_KLIPPI_RYHMA.tmKrAsetaSheet(S, d, c); _mvRender(); }, [d, rooli]); };
  await avaaRyhma(RYHMA_DATA); await k(p, 'Sheet (ryhmä tarjolla, oma video lukittu valmentajalle)', '#_mvModal');
  expect(await p.locator('#_mvModal [data-mv-oma-nappi]').isDisabled()).toBe(true); expect(await p.locator('#_mvModal [data-mv-oma-tarjous]').count()).toBe(0);
  await p.locator('#_mvModal [data-mv-kohde="ryhma"]').click(); await k(p, 'Sheet ryhmä (ei valittu)', '#_mvModal');
  await p.locator('#_mvModal [data-mv-ryhma-valinta]').selectOption('mv'); await k(p, 'Sheet ryhmä valittu (yhteenveto)', '#_mvModal');
  expect((await p.locator('#_mvModal [data-mv-ryhma-yhteenveto]').textContent()).replace(/\D+/g, ' ').trim()).toBe('3 1');   // 3 pelaajaa, joista 1 odottaa lupaa
  await p.evaluate(() => { Object.assign(window._mvTila, { url: 'https://app.veo.co/m/1', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1' }); _mvPaivitaTila(window._mvTila); return _mvLaheta(); }); await odota(p); await toastit('Ryhmälähetys ok');
  await p.evaluate(() => { _mvAvaa('p1'); }); await odota(p, 150); await p.evaluate((d) => { const S = window._mvTila; window.TM_KLIPPI_RYHMA.tmKrAsetaSheet(S, d, _mvKrCtx()); S.kohde = 'ryhma'; Object.assign(S, { url: 'https://app.veo.co/m/1', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1' }); return _mvLaheta(); }, RYHMA_DATA); await odota(p); await toastit('Ryhmälähetys: ryhmä valitsematta'); await p.evaluate(() => _mvSulje());
  await avaaRyhma(Object.assign({}, RYHMA_DATA, { ryhmat: [] }), 'vp'); await k(p, 'Sheet (ei ryhmiä; oma video: johto näkee lisämaksutekstin + tarjouslinkin)', '#_mvModal');
  expect(await p.locator('#_mvModal [data-mv-oma-tarjous]').count()).toBe(1); expect(await p.locator('#_mvModal [data-mv-oma-tarjous]').getAttribute('href')).toMatch(/^mailto:[^?]+\?subject=/); await p.evaluate(() => _mvSulje());
  await avaaRyhma(Object.assign({}, RYHMA_DATA, { lippu: true })); await k(p, 'Sheet (oma video: lippu päällä → Tulossa)', '#_mvModal'); expect(await p.locator('#_mvModal [data-mv-oma-tila]').getAttribute('data-mv-oma-tila')).toBe('tulossa'); await p.evaluate(() => _mvSulje());
  await p.evaluate((q) => { const M = window.TM_MEDIAVIESTI, x = M.tmMvKlippiDokumentit({ url: 'https://app.veo.co/m/1', klippityyppi: 'onnistui', kysymys: q, kysymys_avain: 'mv_pohja_onnistui_rakentaja_1', kohde: { tyyppi: 'ryhma', ryhma_id: 'mv', nimi: 'Maalivahdit' }, vastaanottajat: ['p1', 'p2', 'p3'].map((id) => ({ pelaajaId: id, ika: 12, vastaanottajaUid: 'u1' })) }, { nyt: new Date(), lahettajaUid: 'u1', klippi_id: 'kl_ryhma' });
    x.dokit.forEach((d, i) => window._mvDokit.push(Object.assign({ id: 'ry' + i, aika: Date.now() }, d))); window._mvDokit.push({ id: 'ryv', tyyppi: 'klippi_vastaus', vastaus_viestille: 'ry0', pelaajaId: 'p1', vastaanottajaUid: 'u1', valinta: '👍', aika: Date.now() }); renderInbox(); }, pohjaFi('onnistui', 'rakentaja', 1));
  await k(p, 'Inbox ryhmärivi', '#inboxList [data-viesti-tyyppi="klippi"]'); expect(await p.locator('#inboxList [data-mv-rivi="kl_ryhma"]').textContent()).toContain('Maalivahdit · 1/3'); await p.evaluate(() => _mvAvaaKetju('kl_ryhma')); await k(p, 'Ryhmäklipin pelaajakohtainen purku', '#_mvKetju'); await p.evaluate(() => _mvKetjuSulje());
  // Lähetysvirheet (validointi ennen kirjoitusta) + onnistumiset + kirjoitusvirhe
  const laheta = (S) => p.evaluate((S) => { _mvAvaa('p1'); Object.assign(window._mvTila, S); _mvPaivitaTila(window._mvTila); return _mvLaheta(); }, S);
  await laheta({ url: '' }); await toastit('Lähetys: linkki tyhjä');
  await laheta({ url: 'http://example.org' }); await toastit('Lähetys: ei https');
  await laheta({ url: 'https://example.org/' + 'a'.repeat(520) }); await toastit('Lähetys: linkki pitkä');
  await laheta({ url: 'https://app.veo.co/m/1' }); await toastit('Lähetys: ei kysymystä');
  await laheta({ url: 'https://app.veo.co/m/1', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1', saate: 'x'.repeat(130) }); await toastit('Lähetys: saate pitkä');
  await laheta({ url: 'https://app.veo.co/m/1', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1', kohde: 'valitut', valitut: [] }); await toastit('Lähetys: ei vastaanottajia');
  await laheta({ url: 'https://app.veo.co/m/1', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1' }); await odota(p); await toastit('Lähetys ok (1)');
  await laheta({ url: 'https://app.veo.co/m/1', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1', kohde: 'valitut', valitut: ['p1', 'p4'] }); await odota(p); await toastit('Lähetys ok (n)');
  await p.evaluate(() => { const b0 = _db.batch; _db.batch = function () { return { set: function () {}, commit: async function () { throw Object.assign(new Error('x'), { code: 'permission-denied' }); } }; }; window.__b0 = b0; });
  await laheta({ url: 'https://app.veo.co/m/1', kysymysAvain: 'mv_pohja_onnistui_rakentaja_1' }); await odota(p); await toastit('Lähetys: kirjoitusvirhe'); await k(p, 'Sheet virheen jälkeen', '#_mvModal');
  await p.evaluate(() => { _db.batch = window.__b0; _mvSulje(); });
  // Polku: Klipit-kortti (rivit + Lisää klippi) ja tyhjä tila
  await p.evaluate((d) => { const el = document.createElement('div'); el.id = 'mvKlipit'; document.body.appendChild(el); _demo = true; window._mvPolku = { p1: d.filter((x) => x.pelaajaId === 'p1' || x.vastaus_viestille === 'ke'), p3: [] }; return _mvLataaKlipit(_pelaajatData[0]); }, ratkaise(MASTER_DOKIT));
  await k(p, 'Polku Klipit-kortti', '#mvKlipit');
  await p.evaluate(() => _mvLataaKlipit(_pelaajatData[2])); await k(p, 'Polku Klipit tyhjä', '#mvKlipit'); await p.evaluate(() => { _demo = false; });
  await sk.close();
  return { kerätyt, virheet: virheet.filter((e) => !/Firebase|firebase|permission|Sentry|appCheck|recaptcha|^Uncaught \(in promise\) cancelled$/i.test(e)) };   // 'cancelled' = selaimen keskeyttämä taustapyyntö (ei repon koodista; sama suodatin kuin v_koti_b)
}

/* ── (a2) valmentajan PELAAJANÄKYMÄ klippikortin ympäriltä (Master_v16 #ktNakyma): Tänään (signaali, kysymyskortit, jaksokortti/Kenttä) ja Polku
   (Klipit-kortti, IDP-kortti, kehityskaari, resepti) eri jaksotiloissa. Ladataan oikealla polulla (_ktNayta), Kenttä-lippu päällä. ── */
const PV_ISO = (ms) => new Date(ms).toISOString();
const NAKYMA_PELAAJAT = [
  Object.assign({}, MASTER_PELAAJAT[0], { jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: KONSEPTI_FI, alkoi: PV_ISO(NYT - 9 * PV), kesto_vk: 6, domeeni: 'teknis_taktinen' } }),   // jakso käynnissä · vk 2/6
  Object.assign({}, MASTER_PELAAJAT[1], { jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: KONSEPTI_FI, alkoi: PV_ISO(NYT - 2 * PV), kesto_vk: 6, domeeni: 'teknis_taktinen' } }),   // vk 1, sitoumus odottaa
  Object.assign({}, MASTER_PELAAJAT[2]),                                                                                                                     // ei jaksoa
  Object.assign({}, MASTER_PELAAJAT[3], { jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: KONSEPTI_FI, alkoi: PV_ISO(NYT - 50 * PV), kesto_vk: 6, domeeni: 'teknis_taktinen' } })   // päättynyt → suljettava
];
async function pelaajanakymaPolku(selain, kieli) {
  const kerätyt = [], k = async (p, vaihe, sel) => { for (const t of await p.evaluate((s) => window.__keraa(s), sel)) kerätyt.push({ vaihe, teksti: t }); };
  const sk = await selain.newContext({ viewport: { width: 1280, height: 900 } }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  const alku = KERAA + 'firebase.auth=function(){return{currentUser:{uid:"u1",displayName:"Alex Coach",getIdToken:async function(){return"x"}}}};'
    + '_joukkue="Sibbo Demo";_pelaajatData=' + JSON.stringify(NAKYMA_PELAAJAT) + ';window._mvPolku={p1:' + JSON.stringify(ratkaise(MASTER_DOKIT).filter((x) => x.pelaajaId === 'p1' || x.vastaus_viestille === 'ke')) + '};'
    + 'masterVaihdaKieli("' + kieli + '");window._ktLippu=true;';
  await p.goto('file://' + sivu(lue('TalentMaster_Master_v16.html'), JUURI, { rooli: 'valmentaja', pohjat: false, kutsu: alku })); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
  expect(await p.locator('#probe-out').textContent()).toBe('ok');
  for (const pid of ['p1', 'p2', 'p3', 'p4']) {
    for (const v of ['tanaan', 'polku']) {
      await p.evaluate(([pid, v]) => { _demo = true; _ktS.pid = pid; _ktS.valilehti = v; _ktS.ladattu = { polku: v === 'polku', naytto: false }; _ktNayta(); }, [pid, v]); await odota(p, 120);
      expect(await p.locator('#ktNakyma').count(), pid + ' ' + v).toBe(1);
      if (v === 'polku') expect(await p.locator('#ktNakyma #mvKlipit').count()).toBe(1);
      await k(p, 'Pelaajanäkymä ' + pid + ' ' + v, '#ktNakyma');
    }
  }
  await p.evaluate(() => { _demo = false; }); await sk.close();
  return { kerätyt, virheet: virheet.filter((e) => !/Firebase|firebase|permission|Sentry|appCheck|recaptcha|^Uncaught \(in promise\) cancelled$/i.test(e)) };
}

/* ── (b)/(c) perhe: mock-Firestore ja kerääjä ── */
const MOCKDB = 'window.__kirj=[];window.__virhe=null;window.__q=function(docs){return{where:function(){return window.__q(docs)},get:async function(){return{docs:docs.map(function(d){return{id:d.id,data:function(){return d}}})}}}};'
  + 'window.__col=function(p){return Object.assign(window.__q(window.__DOCS),{doc:function(id){return{id:id||"auto",collection:function(c){return window.__col(p+"/"+id+"/"+c)}}}})};'
  + 'window.__mockDb={collection:function(c){return window.__col(c)},batch:function(){var ops=[];return{set:function(r,d){ops.push(d)},commit:async function(){if(window.__virhe)throw window.__virhe;ops.forEach(function(d){window.__kirj.push(d)})}}}};'
  + 'window.__toastit=[];';
const HOST = 'var __h=document.createElement("div");__h.id="__host";__h.style.cssText="position:fixed;inset:0;z-index:99999;overflow:auto;background:var(--bg,#111);padding:8px";document.body.appendChild(__h);';

async function pelaajaPolku(selain, kieli, ika) {
  const kerätyt = [], k = async (p, vaihe) => { for (const t of await p.evaluate(() => window.__keraa('#__host'))) kerätyt.push({ vaihe: 'U' + ika + ' ' + vaihe, teksti: t }); };
  const T0 = Date.now(), dokit = [
    klippi('k1', { pelaajaId: 'p1', aika: T0 - H, nakyva_alkaen: T0 - H }),
    klippi('k2', { pelaajaId: 'p1', klippityyppi: 'tulos', kysymys: pohjaFi('tulos', 'rakentaja', 2), kysymys_avain: 'mv_pohja_tulos_rakentaja_2', tila: 'suljettu', kuittaus_lause: '👍', url: 'https://kuvat.example.org/a.jpg', domain: 'kuvat.example.org', mediatyyppi: 'kuva', kohta_s: null, aika: T0 - 2 * PV, nakyva_alkaen: T0 - 2 * PV }),
    vastaus('v2', 'k2', { pelaajaId: 'p1', teksti: '👍', luettu: true, aika: T0 - 2 * PV + H }),
    klippi('k3', { pelaajaId: 'p1', klippityyppi: 'prosessi', kysymys: pohjaFi('prosessi', 'rakentaja', 1), kysymys_avain: 'mv_pohja_prosessi_rakentaja_1', aika: T0 - 3 * H, nakyva_alkaen: T0 - 3 * H }),
    vastaus('v3', 'k3', { pelaajaId: 'p1', teksti: '👍', aika: T0 - 2 * H })
  ];
  const sk = await selain.newContext({ viewport: { width: 390, height: 844 } }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  const kutsu = KERAA + MOCKDB + 'window.__DOCS=' + JSON.stringify(dokit) + ';tmAsetaKieli("' + kieli + '",false);_isDemoUser=false;_pelaaja={id:"p1",etunimi:"Alva",sukunimi:"Berg",syntymaVuosi:' + (new Date().getFullYear() - ika) + ',seuraId:"sibbo"};window._seuraId="sibbo";'
    + 'window._db=window.__mockDb;window._auth={currentUser:{uid:"pu1",getIdToken:async function(){return"x"}}};var __n0=_naytaKirjausVirhe;_naytaKirjausVirhe=function(m){window.__toastit.push(String(m));__n0(m)};'
    + 'window._p7Kp={ladattu:0,ketjut:null,valittu:null,valinta:"",teksti:"",tallentaa:false};' + HOST + '__h.innerHTML=_p7KpHTML("yla")+_p7KpHTML("ala");return _p7KpLataa(true);';
  await p.goto('file://' + perheSivu(lue('TalentMaster_Pelaaja_v7.html'), JUURI, kutsu)); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
  expect(await p.locator('#probe-out').textContent()).toBe('ok');
  const toastit = async (vaihe) => { for (const t of await p.evaluate(() => window.__toastit.splice(0))) kerätyt.push({ vaihe: 'U' + ika + ' ' + vaihe + ' [toast]', teksti: t }); };
  expect(await p.locator('#__host [data-kp-kortti]').count()).toBe(1);
  await k(p, 'Tänään-kortti (avoin)');
  if (ika <= 14) { await p.locator('#__host [data-kp-valinta]').first().click(); await k(p, 'valinta tehty'); await p.locator('#__host [data-kp-teksti]').fill('👍'); await k(p, 'oma teksti'); }
  else { await p.locator('#__host [data-kp-teksti]').fill('👍'); await k(p, 'lause kirjoitettu'); }
  await p.evaluate(() => { window._p7Kp.tallentaa = true; _p7KpPiirra(); }); await k(p, 'Lähetetään-tila'); await p.evaluate(() => { window._p7Kp.tallentaa = false; _p7KpPiirra(); });
  const laheta = (S, virhe) => p.evaluate(([S, virhe]) => { Object.assign(window._p7Kp, S); window.__virhe = virhe; return _p7KpLaheta(); }, [S, virhe]);
  await laheta({ valinta: '', teksti: '' }, null); await toastit('virhe: tyhjä');
  await laheta({ valinta: '', teksti: 'x'.repeat(201) }, null); await toastit('virhe: liian pitkä');
  if (ika <= 14) { await laheta({ valinta: 'ei_ole', teksti: '' }, null); await toastit('virhe: valinta'); }
  await laheta({ valinta: '', teksti: '👍' }, { code: 'permission-denied' }); await toastit('virhe: istunto'); await k(p, 'virheen jälkeen');
  await laheta({ valinta: '', teksti: '👍' }, { code: 'unavailable' }); await toastit('virhe: ei yhteyttä');
  await laheta({ valinta: '', teksti: '👍' }, null); await toastit('lähetys ok'); await k(p, 'vastattu');
  for (const id of ['k2', 'k3']) { await p.evaluate((id) => _p7KpAvaa(id), id); await k(p, 'ketju ' + id); }
  await sk.close();
  return { kerätyt, virheet: virheet.filter((e) => !/Firebase|firebase|Sentry|appCheck|recaptcha/i.test(e)) };
}

async function huoltajaPolku(selain, kieli) {
  const kerätyt = [], k = async (p, vaihe) => { for (const t of await p.evaluate(() => window.__keraa('#__host'))) kerätyt.push({ vaihe, teksti: t }); };
  const T0 = Date.now(), dokit = [
    klippi('h1', { pelaajaId: 'p2', nakyvyys: 'huoltaja', klippityyppi: 'onnistui', kysymys: pohjaFi('onnistui', 'leikkija', 1), kysymys_avain: 'mv_pohja_onnistui_leikkija_1', aika: T0 - H, nakyva_alkaen: T0 - H }),
    klippi('h2', { pelaajaId: 'p2', nakyvyys: 'pelaaja', klippityyppi: 'prosessi', kysymys: pohjaFi('prosessi', 'rakentaja', 2), kysymys_avain: 'mv_pohja_prosessi_rakentaja_2', aika: T0 - 3 * H, nakyva_alkaen: T0 - 3 * H }),
    klippi('h3', { pelaajaId: 'p2', nakyvyys: 'pelaaja', klippityyppi: 'tulos', kysymys: pohjaFi('tulos', 'rakentaja', 1), kysymys_avain: 'mv_pohja_tulos_rakentaja_1', tila: 'suljettu', kuittaus_lause: '👍', aika: T0 - 2 * PV, nakyva_alkaen: T0 - 2 * PV }),
    vastaus('hv3', 'h3', { pelaajaId: 'p2', teksti: '👍', luettu: true, aika: T0 - 2 * PV + H })
  ];
  const sk = await selain.newContext({ viewport: { width: 390, height: 844 } }), p = await sk.newPage(); const virheet = []; p.on('pageerror', (e) => virheet.push(e.message));
  const kutsu = KERAA + MOCKDB + 'window.__DOCS=' + JSON.stringify(dokit) + ';tmAsetaKieli("' + kieli + '",false);window._lapsi={id:"p2",seuraId:"sibbo",etunimi:"Elis"};_db=window.__mockDb;_auth={currentUser:{uid:"hu1",getIdToken:async function(){return"x"}}};'
    + 'var __t0=_toast;_toast=function(m){window.__toastit.push(String(m));__t0(m)};window._vKp={ladattu:0,lapsi:null,ketjut:null,valittu:null,valinta:"",kuittaa:false,tallentaa:false};' + HOST + '__h.innerHTML=_vKpHTML();return _vKpLataa(true);';
  await p.goto('file://' + perheSivu(lue('TalentMaster_Vanhempi_v2.html'), JUURI, kutsu)); await p.waitForSelector('#probe-out', { state: 'attached', timeout: 20000 });
  expect(await p.locator('#probe-out').textContent()).toBe('ok');
  const toastit = async (vaihe) => { for (const t of await p.evaluate(() => window.__toastit.splice(0))) kerätyt.push({ vaihe: vaihe + ' [toast]', teksti: t }); };
  expect(await p.locator('#__host [data-kp-kortti]').count()).toBe(1);
  await k(p, 'Katsokaa yhdessä (avoin)');
  await p.locator('#__host [data-kp-valinta]').first().click(); await p.locator('#__host [data-kp-kuittaa] input').check(); await k(p, 'valinta + Katsoimme yhdessä');
  await p.evaluate(() => { window._vKp.tallentaa = true; _vKpPiirra(); }); await k(p, 'Lähetetään-tila'); await p.evaluate(() => { window._vKp.tallentaa = false; _vKpPiirra(); });
  const laheta = (S, virhe) => p.evaluate(([S, virhe]) => { Object.assign(window._vKp, S); window.__virhe = virhe; return _vKpLaheta(); }, [S, virhe]);
  await laheta({ valinta: '' }, null); await toastit('virhe: tyhjä');
  await laheta({ valinta: 'ei_ole' }, null); await toastit('virhe: valinta');
  await laheta({ valinta: 'kp_valinta_leikkija_2', kuittaa: true }, { code: 'permission-denied' }); await toastit('virhe: kirjoitus');
  await laheta({ valinta: 'kp_valinta_leikkija_2', kuittaa: true }, null); await toastit('lähetys ok'); await k(p, 'vastattu + kuitattu');
  for (const id of ['h2', 'h3']) { await p.evaluate((id) => _vKpAvaa(id), id); await k(p, 'keskustelu lukutilassa ' + id); }
  await sk.close();
  return { kerätyt, virheet: virheet.filter((e) => !/Firebase|firebase|Sentry|appCheck|recaptcha/i.test(e)) };
}

describe('Sibbo · klippipolun sv-portti (tunnistin)', () => {
  it('SV_ODOTTAA on elävä: jokainen rivi on klippilibin FI-avain, jolla EI vielä ole sv:tä (sv saapui → poista rivi)', () => {
    for (const a of SV_ODOTTAA) { expect(a in MV.FI || a in KP.FI, a).toBe(true); expect(svLib(a), a + ' sai sv:n → poista SV_ODOTTAA-listalta').toBeUndefined(); }
  });
  it('MASTER_SV_ODOTTAA on elävä: jokainen rivi on erässä 37 (master_kartta, sv tyhjä) eikä Master-kartassa ole sille sv:tä (sv saapui → vie ja poista rivi)', () => {
    const E37 = JSON.parse(lue('docs/i18n/sv_kaannoserae_37.json')).osiot.master_kartta.rivit;
    for (const fi of MASTER_SV_ODOTTAA) { expect(E37[fi] && E37[fi].fi, fi).toBe(fi); expect(MA_SV[fi], fi + ' sai sv:n Master-karttaan → poista MASTER_SV_ODOTTAA-listalta').toBeUndefined(); expect(E37[fi].sv, fi + ': sv saapui erään 37 → vie karttaan').toBe(''); }
  });
  it('lib: viikonpäivä kielen mukaan (fi ennallaan, sv Intl), pohjakysymys katsojan kielellä (oma kysymys = tallennettu teksti), mediatyyppi avaimen kautta', () => {
    const d = new Date(2026, 9, 19);
    expect(MV.tmMvViikonpaiva(d, 'fi')).toBe('ma'); expect(MV.tmMvViikonpaiva(d, 'sv')).toBe(d.toLocaleDateString('sv-SE', { weekday: 'short' }).replace('.', '')); expect(MV.tmMvViikonpaiva(d, 'sv')).not.toBe('ma');
    const a = 'mv_pohja_onnistui_rakentaja_1', sv = (k) => svLib(k) || k;
    expect(MV.tmMvKysymysTeksti({ kysymys: 'oma 👍', kysymys_avain: null }, { t: sv })).toBe('oma 👍');
    expect(MV.tmMvKysymysTeksti({ kysymys: MV.FI[a], kysymys_avain: a }, { t: sv })).toBe(svLib(a));
    expect(MV.tmMvKysymysTeksti({ kysymys: svLib(a), kysymys_avain: a }, { t: (k) => k })).toBe(MV.FI[a]);   // fi-katsoja (Node: kieli fi) → fi-pohja
    expect(MV.tmMvKysymysTeksti({ kysymys: 'x', kysymys_avain: 'mv_otsikko' }, { t: sv })).toBe('x');   // vain pohja-avaimet
    expect(MV.tmMvTunnistus('https://kuvat.example.org/a.jpg', { t: (k) => (k === 'mv_media_kuva' ? '⟨K⟩' : k) }).teksti).toBe('kuvat.example.org · ⟨K⟩');
    expect(MV.tmMvTunnistus('https://app.veo.co/m/1?t=12').teksti).toBe('app.veo.co · video · kohta 0:12');   // fi ennallaan
    expect(KP.kpKetjut([{ id: 'k', tyyppi: 'klippi', pelaajaId: 'p', kysymys: 'x', kysymys_avain: a, url: 'https://a.example.org' }], { pelaajaId: 'p' })[0].kysymys_avain).toBe(a);
    expect(MV.tmMvRivit([{ id: 'k', tyyppi: 'klippi', pelaajaId: 'p', kysymys: 'x', kysymys_avain: a }])[0].kysymys_avain).toBe(a);
  });
  it('tunnistin löytää suomen ja päästää ruotsin/nimet läpi', () => {
    const r = suomiJaanteet([{ vaihe: 'x', teksti: MV.FI.mv_lahetetty }, { vaihe: 'x', teksti: 'ma 19.10. 12.00' }, { vaihe: 'x', teksti: 'kp_otsikko' }, { vaihe: 'x', teksti: 'Valitse vastaus' }, { vaihe: 'x', teksti: svLib('mv_lahetetty') }, { vaihe: 'x', teksti: 'Alva Berg' }], NIMET);
    expect(r).toHaveLength(4);
  });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('Sibbo · klippipolku sv päästä päähän (selain)', () => {
  const raportti = (nimi, r, kaikki) => { if (process.env.TM_KLIPPI_SV_RAPORTTI === '1') console.log('\n== ' + nimi + ' (' + r.length + ')\n' + r.join('\n') + (kaikki ? '\n-- kerätyt (uniikit):\n' + Array.from(new Set(kaikki.map((x) => x.vaihe.replace(/ \(.*$/, '') + ' | ' + x.teksti))).join('\n') : '')); };
  it('(a) VALMENTAJA jakaa — Master: sheet, virheet/toastit, Inbox-rivit, ketju, kuittaus, Polku-kortti: ei suomea sv-tilassa', async () => {
    const selain = await kaynnista(); try {
      const sv = await masterPolku(selain, 'sv'); const r = suomiJaanteet(sv.kerätyt, NIMET); raportti('Master sv', r, sv.kerätyt);
      expect(sv.kerätyt.length).toBeGreaterThan(80); expect(sv.virheet).toEqual([]); expect(r).toEqual([]);
      const fi = await masterPolku(selain, 'fi'); expect(suomiJaanteet(fi.kerätyt, NIMET).length, 'negatiivitesti: fi-tilassa tunnistin löytää suomen').toBeGreaterThan(20);
    } finally { await selain.close(); }
  }, 240000);
  it('(a2) VALMENTAJAN PELAAJANÄKYMÄ klippikortin ympäriltä — Master #ktNakyma Tänään + Polku (4 jaksotilaa): ei suomea sv-tilassa', async () => {
    const selain = await kaynnista(); try {
      const sv = await pelaajanakymaPolku(selain, 'sv'); const r = suomiJaanteet(sv.kerätyt, NIMET.concat(['Aseta ydinvahvuus kentälle → Polku']));   // erä 44 (B1): kt_aseta_alue odottaa sv:tä (jaksokortin CTA) — poista lisäys kun sv saapuu
       raportti('Pelaajanäkymä sv', r, sv.kerätyt);
      expect(sv.kerätyt.length).toBeGreaterThan(60); expect(sv.virheet).toEqual([]); expect(r).toEqual([]);
      const fi = await pelaajanakymaPolku(selain, 'fi'); expect(suomiJaanteet(fi.kerätyt, NIMET).length, 'negatiivitesti: fi-tilassa tunnistin löytää suomen').toBeGreaterThan(20);
    } finally { await selain.close(); }
  }, 240000);
  for (const ika of [13, 16]) {
    it('(b) PELAAJA avaa/vastaa — Pelaaja_v7 Tänään-kortti U' + ika + ' (' + (ika <= 14 ? 'valinta' : 'lause') + '): ei suomea sv-tilassa', async () => {
      const selain = await kaynnista(); try {
        const sv = await pelaajaPolku(selain, 'sv', ika); const r = suomiJaanteet(sv.kerätyt, NIMET); raportti('Pelaaja U' + ika + ' sv', r, sv.kerätyt);
        expect(sv.kerätyt.length).toBeGreaterThan(30); expect(sv.virheet).toEqual([]); expect(r).toEqual([]);
        const fi = await pelaajaPolku(selain, 'fi', ika); expect(suomiJaanteet(fi.kerätyt, NIMET).length, 'negatiivitesti').toBeGreaterThan(10);
      } finally { await selain.close(); }
    }, 180000);
  }
  it('(c) HUOLTAJA kuittaa — Vanhempi_v2 Katsokaa yhdessä + keskustelu: ei suomea sv-tilassa', async () => {
    const selain = await kaynnista(); try {
      const sv = await huoltajaPolku(selain, 'sv'); const r = suomiJaanteet(sv.kerätyt, NIMET); raportti('Vanhempi sv', r, sv.kerätyt);
      expect(sv.kerätyt.length).toBeGreaterThan(30); expect(sv.virheet).toEqual([]); expect(r).toEqual([]);
      const fi = await huoltajaPolku(selain, 'fi'); expect(suomiJaanteet(fi.kerätyt, NIMET).length, 'negatiivitesti').toBeGreaterThan(10);
    } finally { await selain.close(); }
  }, 180000);
});
