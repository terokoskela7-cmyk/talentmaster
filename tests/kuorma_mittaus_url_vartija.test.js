/* mittaa_sivut.js · lopullisen URL:n vartija (uudelleenohjaus = virhe) + mittauskohteen URL (#pelaaja/<id>/tanaan). Yksikkö + oikea Chrome paikallista palvelinta vasten (ei stagingia). */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { createServer } from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const S = require('../scripts/kuorma/mittaa_sivut.js');
const { instrumentointi } = require('../scripts/kuorma/mittaus_instrumentointi.js');
const CHROME = [process.env.TM_CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));

describe('tarkistaLopullinenUrl', () => {
  const B = 'https://talentmaster-staging--k.web.app/';
  it('oikea tiedosto (kysely/hash ei haittaa) → null; väärä tiedosto → virhe, joka nimeää molemmat', () => {
    expect(S.tarkistaLopullinenUrl('TalentMaster_Kehitystyopoyta.html', B + 'TalentMaster_Kehitystyopoyta.html#pelaaja/p1/tanaan')).toBeNull();
    expect(S.tarkistaLopullinenUrl('TalentMaster_Master_v16.html', B + 'TalentMaster_Master_v16.html?ws=dev&x=1')).toBeNull();
    const v = S.tarkistaLopullinenUrl('TalentMaster_Kehitystyopoyta.html', B + 'TalentMaster_Master_v16.html?ws=dev&token=SALAINEN');
    expect(v).toMatch(/^uudelleenohjaus/); expect(v).toContain('TalentMaster_Kehitystyopoyta.html'); expect(v).toContain('TalentMaster_Master_v16.html'); expect(v).not.toContain('SALAINEN');
  });
  it('jäsentymätön URL (about:blank, chrome-error) → virhe, ei läpi', () => {
    expect(S.tarkistaLopullinenUrl('a.html', 'about:blank')).toMatch(/^uudelleenohjaus/); expect(S.tarkistaLopullinenUrl('a.html', 'ei-url')).toMatch(/^uudelleenohjaus/);
  });
  it('naytaUrl: kyselyosa pois, hash mukana', () => { expect(S.naytaUrl('https://x.web.app/a.html?token=1#pelaaja/p1/tanaan')).toBe('https://x.web.app/a.html#pelaaja/p1/tanaan'); });
  it('kehitys-sivu vaatii pelaajahaun (ei avaudu ilman #pelaaja-hashia)', () => { expect(S.SIVUT.kehitys.pelaajaHaku).toBe(true); expect(S.SIVUT.master.pelaajaHaku).toBeUndefined(); });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('mittaaAvaus · uudelleenohjausvartija (selain)', () => {
  it('sivu ohjaa toiseen tiedostoon → virhe "uudelleenohjaus" + lopullinen_url; oikea sivu → ei virhettä, lopullinen_url hashilla', async () => {
    const palvelin = createServer((rq, rs) => {
      rs.setHeader('content-type', 'text/html');
      if (rq.url.startsWith('/kehitys.html') && !rq.url.includes('#')) rs.end('<!doctype html><title>k</title><h1>Kehitys</h1><script>if(!location.hash)location.replace("/master.html?ws=dev")</script>');
      else rs.end('<!doctype html><title>x</title><h1>Sivu</h1>');
    });
    await new Promise((r) => palvelin.listen(0, '127.0.0.1', r)); const B = 'http://127.0.0.1:' + palvelin.address().port;
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    try {
      const avaa = async (url, tiedosto) => { const ctx = await selain.newContext(), page = await ctx.newPage(); await ctx.addInitScript(instrumentointi, { token: 'T' }); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); const r = await S.mittaaAvaus(page, cdp, url, { ikkuna: 300, aikaraja: 8000, odotettuTiedosto: tiedosto }); await ctx.close(); return r; };
      const vaara = await avaa(B + '/kehitys.html', 'kehitys.html');   // ei hashia → ohjautuu master.html:ään
      expect(vaara.virhe).toMatch(/^uudelleenohjaus/); expect(vaara.lopullinen_url).toBe(B + '/master.html');
      const oikea = await avaa(B + '/kehitys.html#pelaaja/p1/tanaan', 'kehitys.html');
      expect(oikea.virhe).toBeNull(); expect(oikea.lopullinen_url).toBe(B + '/kehitys.html#pelaaja/p1/tanaan');
    } finally { await selain.close(); palvelin.close(); }
  }, 60000);
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('haePelaajaKohde (selain, vale-Firestore)', () => {
  const sivu = (data) => `<!doctype html><script>
    var D = ${JSON.stringify(data)};
    function doc(p) { return { get: async function () { var x = D[p]; return { exists: !!x, data: function () { return x; }, id: p.split('/').pop() }; }, collection: function (c) { return col(p + '/' + c); } }; }
    function col(p) { return { doc: function (id) { return doc(p + '/' + id); }, where: function () { return { limit: function () { return { get: async function () { var l = D[p + '?pelaajat'] || []; return { docs: l.map(function (id) { return { id: id }; }) }; } }; } }; } }; }
    window.firebase = { auth: function () { return { currentUser: { uid: 'u1', getIdTokenResult: async function () { return { claims: { seuraId: 's01' } }; } } }; }, firestore: function () { return { collection: col }; } };
  </script>`;
  const aja = async (data) => {
    const { chromium } = require('playwright-core'), selain = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
    try { const page = await (await selain.newContext()).newPage(); await page.setContent(sivu(data)); return await S.haePelaajaKohde(page); } finally { await selain.close(); }
  };
  it('lista_joukkue-koosteen ensimmäinen rivi; varalla pelaajat-kysely; virheet nimetään (ei hiljaa tyhjää)', async () => {
    const kayttaja = { 'seurat/s01/kayttajat/u1': { joukkueet: ['j7', 'j8'] } };
    expect(await aja(Object.assign({}, kayttaja, { 'seurat/s01/lista_joukkue/j7': { rivit: [{ id: 'pA' }, { id: 'pB' }] } }))).toEqual({ seuraId: 's01', pelaajaId: 'pA' });
    expect(await aja(Object.assign({}, kayttaja, { 'seurat/s01/pelaajat?pelaajat': ['pZ'] }))).toEqual({ seuraId: 's01', pelaajaId: 'pZ' });
    expect((await aja(Object.assign({}, kayttaja))).virhe).toMatch(/ei löydy pelaajaa/);
    expect((await aja({ 'seurat/s01/kayttajat/u1': { joukkueet: [] } })).virhe).toMatch(/ei joukkuetta/);
  }, 60000);
});
