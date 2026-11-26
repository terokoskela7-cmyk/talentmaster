/* Kiireellinen laiska-normit-korjaus (26.11.2026) · SELAIN (Playwright + Chrome; chrome-tests-job). Masterin oikea sivu file://-osoitteesta (tests/helpers/kalenteri_sivu.mjs), Firebase muistissa.
   KYLMÄ avaus: boot-render (setWs('cal')) poistettu → yksikään laiska kirjasto ei ole ladattu (tmLaiska.valmis() = false, normit puuttuvat), ei Kausi-käyntiä.
   1) "Valmentajana kehittyminen" suoraan → arviomäärä > 0, trendi näkyy, CPD-kortti oikeilla tunneilla (ei nollia / "Ei vielä"-tekstiä).
   2) Itsearvion tallennus kylmältä sivulta → valmentajan pikakentät päivittyvät (valmennustaito_n kasvaa).
   3) Latauksen epäonnistuminen → ohjetoast (portti), ei näkymää, EI nollia eikä "Ei vielä"-tekstiä. */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sivu } from './helpers/kalenteri_sivu.mjs';
const require = createRequire(import.meta.url);
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), MASTER = readFileSync(join(JUURI, 'TalentMaster_Master_v16.html'), 'utf8');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const kaynnista = () => require('playwright-core').chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--allow-file-access-from-files', '--hide-scrollbars'] });

async function kylmaSivu(selain, opts) {
  const f = sivu(MASTER, JUURI, { kutsu: '', deploy: !!(opts && opts.deploy) }); writeFileSync(f, readFileSync(f, 'utf8').replace('setWs("cal");renderCal();', ''));   // ei boot-latausta
  const sk = await selain.newContext({ viewport: { width: 1000, height: 900 } }), p = await sk.newPage();
  if (opts && opts.katkaise) await p.route('**/' + opts.katkaise + '*', (r) => r.abort());
  await p.goto('file://' + f); await p.waitForSelector('#probe-out', { state: 'attached' }); await p.waitForTimeout(700);
  await p.evaluate(() => {
    Object.defineProperty(_auth, 'currentUser', { value: { uid: 'u1', getIdToken: async () => 't' }, configurable: true });
    const B = (n) => ({ malli: 'valmennustaidot', arviointitapa: 'itsearvio', valmentajaUid: 'u1', joukkue: 'Demo U13', pvm: '2026-10-' + n, vastaukset: { b1: 4, b2: 4, b3: 3, b4: 4, b5: 4, b6: 3, b7: 4 }, reflektio: { onnistui: 'x', toisin: 'y', kehityskohde: 'z' } });
    const A = { malli: 'palloliitto', arviointitapa: 'havainnointi', valmentajaUid: 'u1', joukkue: 'KPV U13', pvm: '2026-09-20', vastaukset: { a1: 3, a2: 3, a3: 3, a4: 3, a5: 3, a6: 3, a7: 3 } };
    window.__ARV = [Object.assign({ id: 'a1' }, A), Object.assign({ id: 'b1' }, B('01')), Object.assign({ id: 'b2' }, B('08'))];
    window.__REFL = [{ id: 'r1', pvm: '2026-10-10', cpd_minuutit: 90, onnistui: 'ok' }];
    window.__LOG = [];
    const solmu = (path) => ({
      collection: (c) => solmu(path + '/' + c), doc: (id) => solmu(path + '/' + id), where() { return this; }, limit() { return this; }, orderBy() { return this; },
      async get() { const lista = /harjoitusarvioinnit$/.test(path) ? window.__ARV : /reflektiot$/.test(path) ? window.__REFL : []; return { docs: lista.map((d) => ({ id: d.id, data: () => d })), exists: false, data: () => ({}) }; },
      async add(d) { window.__LOG.push(['add', path, d]); window.__ARV.push(Object.assign({ id: 'n' + window.__ARV.length }, d)); return { id: 'n' }; },
      async update(d) { window.__LOG.push(['update', path, d]); }
    });
    _db.collection = function (c) { return solmu(c); };
  });
  return { sk, p };
}
const teksti = (p, sel) => p.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel);
const COLD = () => [typeof omaKehitysKooste, typeof cpdKooste, typeof laskeValmentajaHarjoitusKooste, tmLaiska.valmis()];

/* Molemmat muodot: repon inline-muoto JA deploy-muoto (pääskripti tiedostona + defer = staging/tuotanto). Deploy-muoto paljasti, että portit eivät asentuneet (lib/tm_laiska_kirjastot.js). */
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME)).each([['inline', false], ['deploy', true]])('Laiskat normit · kylmä avaus (selain, %s-muoto)', (_muoto, DEPLOY) => {
  it('kylmä → suoraan "Valmentajana kehittyminen": arviomäärä > 0, trendi näkyy, CPD oikeilla tunneilla', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await kylmaSivu(selain, { deploy: DEPLOY });
      expect(await p.evaluate(COLD)).toEqual(['undefined', 'undefined', 'undefined', false]);
      await p.evaluate(() => { window.avaaValmentajaKehitys(); });
      await p.waitForFunction(() => /arvioinut harjoittelua/.test((document.getElementById('mkSisalto') || {}).innerText || ''), null, { timeout: 15000 });
      const t = await teksti(p, '#mkSisalto');
      expect(t).toMatch(/arvioinut harjoittelua 3 kertaa/);
      expect(t).not.toContain('Ei vielä itsearvioita'); expect(t).not.toContain('Ei vielä harjoitusarviointeja');
      expect(t).toMatch(/Reflektiot 1\.5 h/);
      expect(await p.evaluate(() => document.querySelectorAll('#mkSisalto canvas').length)).toBeGreaterThan(0);   // B-trendikaavio piirtyi
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('kylmä → itsearvion tallennus: valmentajan pikakentät päivittyvät (valmennustaito_n kasvaa)', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await kylmaSivu(selain, { deploy: DEPLOY });
      expect(await p.evaluate(COLD)).toEqual(['undefined', 'undefined', 'undefined', false]);
      await p.evaluate(() => { window.avaaHarjoitusarviointi(); });
      await p.waitForSelector('#haModal', { timeout: 15000 });
      await p.evaluate(() => window._haTallenna());
      await p.waitForFunction(() => window.__LOG.some((l) => l[0] === 'update'), null, { timeout: 10000 });
      const pika = await p.evaluate(() => window.__LOG.filter((l) => l[0] === 'update').map((l) => ({ polku: l[1], d: l[2] }))[0]);
      expect(pika.polku).toMatch(/kayttajat\/u1$/);
      expect(pika.d.valmennustaito_n).toBe(3);   // 2 vanhaa B + juuri tallennettu
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('lataus epäonnistuu → ei nollia eikä "Ei vielä"-tekstiä: portti ei avaa näkymää, ohjetoast näkyy (uusi yritys: ks. l2_master_laiska_kirjastot_selain)', async () => {
    const selain = await kaynnista();
    try {
      const { sk, p } = await kylmaSivu(selain, { katkaise: 'lib/tm_kehityskaari.js', deploy: DEPLOY });
      await p.evaluate(() => { window.avaaValmentajaKehitys(); });
      await p.waitForSelector('.toast-item', { timeout: 15000 });
      expect(await p.evaluate(() => tmLaiska.valmis())).toBe(false);
      const sis = await p.evaluate(() => (document.getElementById('mkSisalto') || {}).innerText || '');
      expect(sis).not.toMatch(/kertaa/); expect(sis).not.toContain('Ei vielä');   // ei puolikasta näkymää
      expect(await p.evaluate(() => document.querySelector('.toast-item').innerText)).toContain('Tietojen lataus ei onnistunut');
      await sk.close();
    } finally { await selain.close(); }
  }, 120000);
});
