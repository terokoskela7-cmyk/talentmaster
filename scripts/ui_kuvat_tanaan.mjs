#!/usr/bin/env node
/* Kehitystyöpöytä · Tänään -kuvat (PR 3): Topias O´Koskela (KPV P13, ydinvahvuus.alue puuttuu → jaksokortti) + demopelaaja (alue → kenttä) × 390/1280 × tumma/vaalea → docs/ui-kuvat/<haara>/.
   Renderöi OIKEAN libin (tm_kehitystyopoyta + tm_kentta + tm_kt_komponentit + tm_tanaan_*) ja VP_v25:n oikeat teematokenit staattiseen sivuun (ei Firebasea, ei oikeaa dataa; nimet fixturea).
   Käyttö: node scripts/ui_kuvat_tanaan.mjs [--haara nimi] [--juuri hakemisto (repokopio "ennen"-kuviin: libit + VP tokenit sieltä)] */
import { chromium } from 'playwright-core';
import fs from 'fs'; import path from 'path'; import os from 'os'; import { execSync } from 'child_process'; import { createRequire } from 'module'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url), JUURI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const haara = (arg('haara') || (() => { try { return execSync('git rev-parse --abbrev-ref HEAD', { cwd: JUURI, encoding: 'utf8' }).trim(); } catch (e) { return 'paikallinen'; } })()).replace(/[^\w.-]+/g, '-');
const SJ = arg('juuri') ? path.resolve(arg('juuri')) : JUURI, UT = path.join(JUURI, 'docs', 'ui-kuvat', haara); fs.mkdirSync(UT, { recursive: true });
const lib = (f) => require(path.join(SJ, 'lib', f));
['tm_normisto', 'tm_tasovari', 'tm_testipaiva'].forEach((m) => { try { lib(m + '.js'); } catch (e) { /* ei kaikkia ennen-juuressa */ } });
const KT = lib('tm_kehitystyopoyta.js'), KENTTA = lib('tm_kentta.js');
const vp = fs.readFileSync(path.join(SJ, 'TalentMaster_VP_v25.html'), 'utf8');
const lohko = (re) => (vp.match(re) || [''])[0];
const TOKENIT = lohko(/:root \{ --fs-h1[^\n]*\n/) + lohko(/@media \(max-width: 720px\) \{ :root \{ --fs-h1: 32px; \} \}/) + lohko(/:root\[data-theme="dark"\] \{[^}]*\}/) + lohko(/:root\[data-theme="light"\] \{[^}]*\}/);
const POLKU = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/google-chrome', process.env.PW_CHROMIUM].filter(Boolean).find((x) => fs.existsSync(x));
const KONS = 'paine', NIMET = { vp1: 'Tero Koskela', valm1: 'Mika V.' };
const KAANON = () => ({ kpi: [['a1', 'Katse ennen vastaanottoa: tarkistaa tilan ennen pallon tuloa'], ['b1', 'Aukon luku: tunnistaa vapaan alueen'], ['c1', 'Ajoitus: liikkuu oikeaan aikaan'], ['d1', 'Ensikosketus: pallo etenee kosketuksella'], ['e1', 'Viimeistely: ratkaisee tilanteen rauhallisesti']].map((x) => ({ koodi: x[0], teksti: x[1] })) });
const jf = () => ({ konsepti_avain: KONS, konsepti_nimi: 'Pelaaminen paineessa', alkoi: '2026-10-05T00:00:00', kesto_vk: 6, reitti: { loppu: 'maali' }, osa_arviot: { [KONS]: { a1: 2, b1: 3, c1: 3 } },
  osa_havainnot: { [KONS]: { a1: { valm1: { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja' } }, b1: { vp1: { arvo: 3, pvm: '2026-10-09', rooli: 'vp' }, sa1: { arvo: 2, pvm: '2026-10-09', rooli: 'super_admin' } } } } });
const PEL = { topias: { id: 'm93GBdOaGCUuenMiCL0I', etunimi: 'Topias', sukunimi: 'O´Koskela', joukkue: 'KPV P13', jaksofokus: jf(), ydinvahvuus: { kuvaus: 'Laukaus kulmasta' }, idp_sitoumus_pvm: '2026-10-09', idp_sitoumus_vahvistettu_pvm: '2026-10-09' },
  demo: { id: 'demo1', etunimi: 'Demo', sukunimi: 'Pelaaja', joukkue: 'Demo P13', jaksofokus: jf(), ydinvahvuus: { kuvaus: 'Laukaus kulmasta', alue: { x: 28, y: 44, w: 44, h: 32 } }, jaksofokus_historia: [{ reitti: { loppu: 'kaveri' } }] } };
function sivu(p, teema) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const kenttaFn = (alue, pp, spec) => KENTTA.tmKentta(spec || { koko: 'puoli', ase: { alue, nimi: (pp.ydinvahvuus && pp.ydinvahvuus.kuvaus) || '', tila: 'ok' }, reitti: null, viikot: null, osat: [], historia: [], lempipaikka: null, vaihtoehdot: null }, { wrap: true, rooli: 'henkilokunta' });   // B1: spec = lib/tm_kentta_spec.js (ase + reitti + viikkomerkit + osat + historia)
  const tila = { tila: 'kaynnissa', ensisijainen: { avain: 'havainto', teksti: 'Merkitse havainto' }, valikko: [], rivitila: { teksti: 'Jakso käynnissä · vk 1/6', savy: 'ok' } };
  const tanaan = KT.tmKtTanaanKoko(p, tila, { esc, t: (k) => k, hk: KT.tmKtHk, toimiFn: '_ktToimi', osaFn: '_ktHavaintoAvaa', paneeli: true, voiKirjoittaa: true, rooli: 'vp', uid: 'vp1', nimet: (u) => NIMET[u] || '', kaanon: KAANON, tanaan: '2026-10-11', kenttaFn, kentta: KENTTA.tmKentta({ koko: 'puoli', ilmanAluetta: true, ase: null, reitti: null, viikot: null, osat: [], historia: [], lempipaikka: null, vaihtoehdot: null }, { wrap: true, rooli: 'henkilokunta' }), vk: { n: 0, vk: 1, sunnuntai: true, vastattuTanaan: false, rajattu: false }, sigCtx: { vkEiVastattu: true, askel: { avain: 'yllapito' }, tila }, pvmFn: (i) => i });
  const kehys = KT.tmKtKehysHTML({ pid: p.id, nimi: p.etunimi + ' ' + p.sukunimi, joukkue: p.joukkue, ikavaihe: 'Rakentaja', tila, valilehti: 'tanaan', tanaanHTML: tanaan, jarj: { n: 3, yht: 16 } }, { esc, t: (k) => k, toimiFn: '_ktToimi', valilehtiFn: '_ktValilehti', silminFn: '_ktSilmin', edellinenFn: '_e', seuraavaFn: '_s' });
  return '<!doctype html><html lang="fi" data-theme="' + teema + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + TOKENIT + ' :root{--font-sans:"DM Sans",system-ui,sans-serif;--font-serif:"Cormorant Garamond",Georgia,serif;--card:var(--bg3)} body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-sans)}' + lohko(/\.kt-shell \{ --chalk[^\n]*\n/) + lohko(/:root\[data-theme="light"\] \.kt-shell \{ --chalk[^\n]*\n/) + KT.tmKtCss() + (KENTTA.tmKenttaCss ? KENTTA.tmKenttaCss() : '') + '</style></head><body>' + kehys + '</body></html>';
}
const selain = await chromium.launch({ executablePath: POLKU, args: ['--no-sandbox', '--hide-scrollbars'] }), rivit = [];
for (const [k, p] of Object.entries(PEL)) for (const leveys of [390, 1280]) for (const teema of ['dark', 'light']) {
  const nimi = `tanaan_${k}_${leveys}_${teema}`, src = path.join(os.tmpdir(), nimi + '.html'); fs.writeFileSync(src, sivu(p, teema));
  const ctx = await selain.newContext({ viewport: { width: leveys, height: leveys < 600 ? 900 : 760 }, deviceScaleFactor: 1 }), pg = await ctx.newPage(); await pg.goto('file://' + src); await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.join(UT, nimi + '.png') }); rivit.push(nimi); await ctx.close();
}
await selain.close(); console.log(rivit.length + ' kuvaa → ' + UT); rivit.forEach((r) => console.log(' ', r));
