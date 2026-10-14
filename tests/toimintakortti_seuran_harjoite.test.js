/* Toimintakortti: seuran hyväksytty harjoite samalla konseptilla näytetään ENNEN TalentMasterin harjoitetta (doc 40 §11/§13, lähdejärjestys); SoccerTutor: vain nimi ja kuva; video vain https; kuittaamaton (ei konseptia) ei näy. Yksikkö + selain + demokuvat (TM_KUVAT=1). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { deflateSync } from 'zlib';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, JUURI } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const TK = require('../lib/tm_kt_toimintakortti.js'), TT = require('../lib/tm_teknistaktiset.js'), { crc32 } = require('../scripts/xlsx_kirjoita.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'konsepti-vientipohja');
const tt = { kysymykset: TT.tmTtKysymykset, harjoitteet: TT.tmTtHarjoitteet, pelaaja: TT.tmTtPelaaja };
const P = () => ({ id: 'p1', jaksofokus: { konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto' } });

/* Keksitty demokuva (ei seuran aineistoa): vihreä kenttä, valkoiset viivat — PNG data-URI, jotta selaintesti ei tarvitse verkkoa eikä Storagea. */
function demoKuva() {
  const W = 320, H = 180, rivit = []; for (let y = 0; y < H; y++) { const r = Buffer.alloc(1 + W * 3); for (let x = 0; x < W; x++) { const viiva = x === 10 || x === W - 11 || y === 10 || y === H - 11 || x === W / 2 || (Math.abs(Math.hypot(x - W / 2, y - H / 2) - 30) < 1.2); r[1 + x * 3] = viiva ? 240 : 38; r[2 + x * 3] = viiva ? 240 : 120; r[3 + x * 3] = viiva ? 240 : 78; } rivit.push(r); }
  const chunk = (t, d) => { const b = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc32(b)); const l = Buffer.alloc(4); l.writeUInt32BE(d.length); return Buffer.concat([l, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rivit))), chunk('IEND', Buffer.alloc(0))]).toString('base64');
}
const KUVA = demoKuva();
const OMA = { id: 'h1', nimi: 'Oma haltuunottoharjoite', tila: 'hyvaksytty', lahde: 'seura', tyyppi: 'T', konsepti: 'y_h1', lahde_tyyppi: 'oma', kesto: '20 min', video_url: 'https://www.youtube.com/watch?v=abc', kuva_url: KUVA, paivitetty: '2026-10-01' };
const ST = { id: 'h2', nimi: 'Kolmannen osapuolen kortti', tila: 'hyvaksytty', lahde: 'seura', tyyppi: 'T', konsepti: 'y_h1', lahde_tyyppi: 'soccertutor', kolmas_osapuoli: true, kesto: '15 min', video_url: 'https://v.example/x', tavoite: 'EI SAA NÄKYÄ', kuva_url: KUVA, paivitetty: '2026-10-02' };

describe('seuran harjoite ennen TalentMasteria (yksikkö)', () => {
  const h = (pankki, lisa) => TK.tmKtToimintakortti(P(), Object.assign({ pankki, tt }, lisa || {})).harjoite;
  it('hyväksytty seuran harjoite samalla konseptilla → "seura" ennen TalentMasterin peliharjoitetta; ilman osumaa TalentMaster; lähdejärjestys-asetus voi kääntää', () => {
    expect(h([OMA])).toMatchObject({ lahde: 'seura', nimi: 'Oma haltuunottoharjoite' }); expect(h([]).lahde).toBe('talentmaster'); expect(h([OMA], { lahteet: { jarjestys: ['talentmaster', 'seura'] } }).lahde).toBe('talentmaster');
  });
  it('KUITTAAMATON ei näy: rivi ilman konseptia (tuonti ei kirjoita konseptia ennen OK/Muutettu), eri konsepti, luonnos tai arkistoitu → TalentMaster', () => {
    for (const huono of [{ konsepti: null }, { konsepti: undefined }, { konsepti: 'y_h2' }, { tila: 'luonnos' }, { arkistoitu: true }]) expect(h([Object.assign({}, OMA, huono)]).lahde, JSON.stringify(huono)).toBe('talentmaster');
  });
  it('Lähde: oma / SPL / muu / tyhjä (= muu / en tiedä) näytetään kuten oma harjoite (kesto, https-video)', () => {
    for (const lt of ['oma', 'spl', 'muu', undefined]) expect(h([Object.assign({}, OMA, { lahde_tyyppi: lt })]), String(lt)).toMatchObject({ lahde: 'seura', kesto: '20 min', video_url: 'https://www.youtube.com/watch?v=abc', soccertutor: false });
  });
  it('SoccerTutor: vain nimi ja kuva — ei kestoa, ei videota, ei "+ Lisää video" -nappia; tekstikenttiä ei kuljeteta; kolmas_osapuoli-lippu riittää ilman lahde_tyyppia', () => {
    const k = TK.tmKtToimintakortti(P(), { pankki: [ST], tt, rooli: 'vp' }); expect(k.harjoite).toEqual({ lahde: 'seura', id: 'h2', nimi: 'Kolmannen osapuolen kortti', kesto: null, pelimuoto: null, video_url: null, kuva: KUVA, soccertutor: true });
    expect(k.video).toBeNull(); expect(k.voiLisataVideon).toBe(false); expect(JSON.stringify(k)).not.toContain('EI SAA NÄKYÄ');
    expect(h([Object.assign({}, ST, { lahde_tyyppi: undefined })]).soccertutor).toBe(true);
  });
  it('video vain https: http-linkki ei näy "Katso video" -linkkinä; https näkyy ("Katso video · youtube.com")', () => {
    expect(TK.tmKtToimintakortti(P(), { pankki: [Object.assign({}, OMA, { video_url: 'http://x.fi/v' })], tt }).video).toBeNull(); expect(TK.tmKtToimintakortti(P(), { pankki: [OMA], tt }).video).toEqual({ url: 'https://www.youtube.com/watch?v=abc', host: 'youtube.com' });
    const html = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti(P(), { pankki: [OMA], tt }), { pid: 'p1' }); expect(html).toContain('Katso video · youtube.com'); expect(TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti(P(), { pankki: [Object.assign({}, OMA, { video_url: null })], tt }), { pid: 'p1' })).not.toContain('Katso video');
  });
  it('kuva: https / PNG-data-URI näkyy; Storage-polku vain sivun ratkaisijan (kuvaUrl) kautta; muu (http, javascript:) ei koskaan', () => {
    const kuvaJa = (kuva_url, lisa) => TK.tmKtToimintakortti(P(), Object.assign({ pankki: [Object.assign({}, OMA, { kuva_url })], tt }, lisa || {})).harjoite.kuva;
    expect(kuvaJa('https://x.fi/k.jpg')).toBe('https://x.fi/k.jpg'); expect(kuvaJa(KUVA)).toBe(KUVA); expect(kuvaJa('http://x.fi/k.jpg')).toBeNull(); expect(kuvaJa('javascript:alert(1)')).toBeNull(); expect(kuvaJa('data:image/svg+xml;base64,AAAA')).toBeNull();
    expect(kuvaJa('seurat/kpv/harjoitepankki/kpvh_01.jpg')).toBeNull(); expect(kuvaJa('seurat/kpv/harjoitepankki/kpvh_01.jpg', { kuvaUrl: (p) => 'https://storage.example/' + p })).toBe('https://storage.example/seurat/kpv/harjoitepankki/kpvh_01.jpg'); expect(kuvaJa('seurat/kpv/harjoitepankki/kpvh_01.jpg', { kuvaUrl: () => 'http://huono' })).toBeNull();
    const html = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti(P(), { pankki: [ST], tt }), { pid: 'p1' }); expect(html).toContain('data-kt-kuva'); expect(html).toContain('alt="Kolmannen osapuolen kortti"'); expect(html).not.toMatch(/EI SAA NÄKYÄ|Katso video|min</);
  });
  it('HTML-järjestys: seuran harjoite on kortissa ennen kysymyksiä; TalentMasterin peliharjoitetta ei näytetä samalla kortilla kun seuran osuma on', () => {
    const html = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti(P(), { pankki: [OMA], tt }), { pid: 'p1' }); expect(html).toContain('data-kt-tk-harjoite="seura"'); expect(html).not.toContain('data-kt-tk-harjoite="talentmaster"'); expect(html.indexOf('data-kt-tk-harjoite')).toBeLessThan(html.indexOf('data-kt-tk-kysy'));
  });
});

describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('toimintakortti: seuran harjoite demossa (selain)', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  const odota = (p) => p.waitForSelector('[data-kt-toimintakortti]', { timeout: 15000 });
  const dok = (rivit) => { const d = {}; rivit.forEach((r) => { d['seurat/demo/harjoitepankki/' + r.id] = r; }); return d; };
  it('oma harjoite (konsepti + https-video + kuva) ennen TalentMasteria; kuittaamaton rivi ei näy; SoccerTutor: vain nimi ja kuva', async () => {
    await avaa(); try {
      const a = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', dokit: dok([OMA, Object.assign({}, ST, { id: 'h3', konsepti: null, nimi: 'Kuittaamaton rivi' })]) }); await odota(a.p);
      const t = await a.p.locator('[data-kt-toimintakortti]').innerText(); expect(await a.p.locator('[data-kt-tk-harjoite]').getAttribute('data-kt-tk-harjoite')).toBe('seura'); expect(t).toContain('Oma haltuunottoharjoite'); expect(t).toContain('Katso video · youtube.com'); expect(t).not.toMatch(/Kuittaamaton rivi|Peliharjoite/);
      expect(await a.p.locator('[data-kt-kuva]').count()).toBe(1); expect(await a.p.locator('[data-kt-kuva]').evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true); await a.sk.close();
      const b = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', dokit: dok([ST]) }); await odota(b.p); const u = await b.p.locator('[data-kt-tk-harjoite="seura"]').innerText();
      expect(u).toContain('Kolmannen osapuolen kortti'); expect(u).not.toMatch(/15 min|Katso video|EI SAA NÄKYÄ/); expect(await b.p.locator('[data-kt-tk-harjoite="seura"] [data-kt-kuva]').count()).toBe(1); await b.sk.close();
      const c = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', dokit: dok([Object.assign({}, OMA, { konsepti: null })]) }); await odota(c.p); expect(await c.p.locator('[data-kt-tk-harjoite]').getAttribute('data-kt-tk-harjoite')).toBe('talentmaster'); await c.sk.close();
    } finally { await selain.close(); }
  }, 120000);
  it('TM_KUVAT=1 · demokuvat 1280 + 390: oma harjoite (video + kuva), SoccerTutor (vain nimi ja kuva), kuittaamaton → TalentMaster', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      const tilat = [['oma-video-kuva', dok([OMA])], ['soccertutor-nimi-kuva', dok([ST])], ['kuittaamaton-talentmaster', dok([Object.assign({}, OMA, { konsepti: null })])]];
      for (const [n, w, h] of [['1280', 1280, 900], ['390', 390, 844]]) for (const [nimi, d] of tilat) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, dokit: d }); await odota(p); await p.waitForTimeout(400);
        await p.locator('[data-kt-toimintakortti]').scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await p.screenshot({ path: join(KUVAT, 'toimintakortti-' + nimi + '-' + n + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 180000);
});
