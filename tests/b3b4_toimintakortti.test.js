/* B3/B4 toimintakortti "Miten valmennetaan" (raportti 40 §11 + §13, D248): lib/tm_kt_toimintakortti.js (yksikkö) + uusi sivu (selain). */
import { describe, it, expect } from 'vitest';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { kaynnista, selainKaynnista, CHROME, JUURI, PELAAJAT } from './helpers/kt_sivu.mjs';
const require = createRequire(import.meta.url);
const TK = require('../lib/tm_kt_toimintakortti.js'), TT = require('../lib/tm_teknistaktiset.js');
const KUVAT = join(JUURI, 'docs', 'ui-kuvat', 'b3b4-toimintakortti');
const tt = { kysymykset: TT.tmTtKysymykset, harjoitteet: TT.tmTtHarjoitteet, pelaaja: TT.tmTtPelaaja };
const P = (jf) => ({ id: 'p1', jaksofokus: Object.assign({ konsepti_avain: 'y_h1', konsepti_nimi: 'Haltuunotto' }, jf) });
const SEURA = { id: 'h1', nimi: 'Suuntapeli seuran mallilla', tila: 'hyvaksytty', lahde: 'seura', tyyppi: 'T', konsepti: 'y_h1', kesto: '20 min', paivitetty: '2026-10-01' };
describe('tmKtToimintakortti: valinta', () => {
  it('lähdejärjestys oletuksena seura → TalentMaster: hyväksytty seuran harjoite jonka konsepti = jakson konsepti; luonnos/muu konsepti/muu lähde ei kelpaa → TalentMaster-peliharjoite', () => {
    expect(TK.tmKtToimintakortti(P(), { pankki: [SEURA], tt }).harjoite).toMatchObject({ lahde: 'seura', id: 'h1', nimi: 'Suuntapeli seuran mallilla' });
    for (const huono of [{ tila: 'luonnos' }, { konsepti: 'y_h2' }, { lahde: 'tm' }, { nimi: '' }]) expect(TK.tmKtToimintakortti(P(), { pankki: [Object.assign({}, SEURA, huono)], tt }).harjoite.lahde).toBe('talentmaster');
    expect(TK.tmKtToimintakortti(P(), { pankki: [], tt }).harjoite.nimi).toBeTruthy();   // konseptipelin nimi
    expect(TK.tmKtToimintakortti(P({ konsepti_avain: 'Y-H1' }), { pankki: [Object.assign({}, SEURA, { konsepti: 'Y-H1' })], tt }).harjoite.lahde).toBe('seura');   // avainmuoto normalisoidaan
  });
  it('konfiguraatio/harjoitelahteet.jarjestys voi vaihtaa järjestyksen (TalentMaster ensin); tuntematon/puuttuva → oletus', () => {
    expect(TK.tmKtToimintakortti(P(), { pankki: [SEURA], lahteet: { jarjestys: ['talentmaster', 'seura'] }, tt }).harjoite.lahde).toBe('talentmaster');
    expect(TK.tmKtToimintakortti(P(), { pankki: [SEURA], lahteet: { jarjestys: [] }, tt }).harjoite.lahde).toBe('seura'); expect(TK.tmKtToimintakortti(P(), { pankki: [SEURA], lahteet: null, tt }).harjoite.lahde).toBe('seura');
  });
  it('harjoite jakson tasolla; Kysy pelaajalta = kaikki kolme kysymystä; video vain jos linkki (http/https) ja näkyy hostina; ei jaksoa → null', () => {
    const k = TK.tmKtToimintakortti(P(), { pankki: [Object.assign({}, SEURA, { video_url: 'https://www.youtube.com/watch?v=x' })], tt }); expect(k.kysymykset).toHaveLength(3); expect(k.video).toEqual({ url: 'https://www.youtube.com/watch?v=x', host: 'youtube.com' });
    expect(TK.tmKtToimintakortti(P(), { pankki: [SEURA], tt }).video).toBeNull(); expect(TK.tmKtToimintakortti(P(), { pankki: [Object.assign({}, SEURA, { video_url: 'javascript:alert(1)' })], tt }).video).toBeNull();
    expect(TK.tmKtToimintakortti({ id: 'x' }, { pankki: [SEURA], tt })).toBeNull(); expect(TK.tmKtToimintakortti(P({ konsepti_avain: undefined }), { tt })).toBeNull();
  });
  it('"+ Lisää video": vain VP / UTJ / SA ja vain seuran harjoitteelle; valmentaja ✗, talenttivalmentaja ✗, TalentMaster-peliharjoite ✗', () => {
    const v = (rooli, o) => TK.tmKtToimintakortti(P(), Object.assign({ pankki: [SEURA], tt, rooli }, o || {})).voiLisataVideon;
    expect(v('vp')).toBe(true); expect(v('urheilutoimenjohtaja')).toBe(true); expect(v('valmentaja', { superAdmin: true })).toBe(true); expect(v('super_admin')).toBe(true);
    ['valmentaja', 'talenttivalmentaja', 'seurasihteeri', 'fysiikkavalmentaja', 'testivastaava', undefined].forEach((r) => expect(v(r), String(r)).toBe(false));
    expect(TK.tmKtToimintakortti(P(), { pankki: [], tt, rooli: 'vp' }).voiLisataVideon).toBe(false);
  });
  it('Pelaajan silmin: VAIN TalentMaster-data (konseptipelin nimi + kysymykset); ei seuran harjoitetta, videota, fysiikkaa eikä lisää-nappia', () => {
    const k = TK.tmKtToimintakortti(P({ domeeni: 'fyysinen', ohjelma: { nimi: 'O', liikkeet: [{ liike: 'Kyykky' }] } }), { pankki: [Object.assign({}, SEURA, { video_url: 'https://youtu.be/x' })], tt, rooli: 'vp', silmin: true, phv: 'PH' });
    expect(k.silmin).toBe(true); expect(k.harjoite.lahde).toBe('talentmaster'); expect(k.video).toBeNull(); expect(k.fysiikka).toBeNull(); expect(k.voiLisataVideon).toBe(false); expect(k.kysymykset).toHaveLength(3);
    const h = TK.tmKtToimintakorttiHTML(k, { pid: 'p1', lisaaVideoFn: 'f' }); expect(h).toContain('data-kt-silmin'); expect(h).not.toMatch(/Seuran harjoite|data-kt-video|data-kt-lisaa-video|Fysiikkaharjoite/); expect(h).toContain('Kysy itseltäsi'); expect(h).toContain('Mitä harjoittelet');
  });
  it('fysiikkaharjoite: näkyy kun jakso on fyysinen (ohjelma) TAI pelaajalla on kasvupyrähdysmerkintä (PH) — ja vain jos sisältöä on; ei muulloin', () => {
    const oh = { nimi: 'Nopeus ja voima', liikkeet: [{ liike: 'Hyppyaskel', toistot: '3×6' }, { liike: 'Kyykky', toistot: '3×8', video_url: 'https://youtu.be/y' }] };
    expect(TK.tmKtFysiikkaNakyy({ domeeni: 'fyysinen' }, null)).toBe(true); expect(TK.tmKtFysiikkaNakyy({ ohjelma: {} }, null)).toBe(true); expect(TK.tmKtFysiikkaNakyy({ domeeni: 'teknis_taktinen' }, 'PH')).toBe(true); expect(TK.tmKtFysiikkaNakyy({ domeeni: 'teknis_taktinen' }, 'PRE')).toBe(false); expect(TK.tmKtFysiikkaNakyy({}, null)).toBe(false);
    const f = TK.tmKtToimintakortti(P({ domeeni: 'fyysinen', ohjelma: oh }), { tt }).fysiikka; expect(f.nimi).toBe('Nopeus ja voima'); expect(f.liikkeet.map((l) => l.liike)).toEqual(['Hyppyaskel', 'Kyykky']); expect(f.liikkeet[1].video_url).toBe('https://youtu.be/y');
    expect(TK.tmKtToimintakortti(P({ domeeni: 'teknis_taktinen', ohjelma: undefined }), { tt, phv: 'PRE' }).fysiikka).toBeNull();
    expect(TK.tmKtToimintakortti(P({ domeeni: 'teknis_taktinen' }), { tt, phv: 'PH' }).fysiikka).toBeNull();   // PH ilman sisältöä → ei tyhjää korttia
    expect(TK.tmKtToimintakortti(P({ domeeni: 'teknis_taktinen', tukitavoitteet: [{ alue: 'fyysinen', harjoitteet: [{ liike: 'Naruhypyt', toistot: '3×15s' }] }] }), { tt, phv: 'PH' }).fysiikka.liikkeet[0].liike).toBe('Naruhypyt');   // PH + jakson fysiikkasnapshot
  });
  it('video-URL: vainHttps hylkää http/javascript; host ilman www:tä; HTML escapetaan ja linkki avautuu turvallisesti', () => {
    expect(TK.tmKtVideoKelpaa('https://youtu.be/x', { vainHttps: true })).toBe(true); expect(TK.tmKtVideoKelpaa('http://youtu.be/x', { vainHttps: true })).toBe(false); expect(TK.tmKtVideoKelpaa('http://youtu.be/x')).toBe(true); expect(TK.tmKtVideoKelpaa('javascript:alert(1)')).toBe(false); expect(TK.tmKtVideoKelpaa('')).toBe(false);
    expect(TK.tmKtVideoHost('https://www.YouTube.com/watch?v=1')).toBe('youtube.com');
    const h = TK.tmKtToimintakorttiHTML(TK.tmKtToimintakortti(P(), { pankki: [Object.assign({}, SEURA, { nimi: '<b>x</b>', video_url: 'https://youtu.be/x?a=1&b=2' })], tt }), { pid: 'p1' }); expect(h).toContain('&lt;b&gt;x&lt;/b&gt;'); expect(h).toContain('Katso video · youtu.be'); expect(h).toContain('rel="noopener noreferrer"'); expect(h).toContain('&amp;b=2');
  });
});
describe.skipIf(!(process.env.TM_CHROME_TESTS !== '0' && CHROME))('toimintakortti uudella sivulla', () => {
  let selain; const avaa = async () => { selain = await selainKaynnista(); };
  const dok = (lisa) => Object.assign({ 'seurat/demo/harjoitepankki/h1': Object.assign({}, SEURA), 'seurat/demo/harjoitepankki/h2': Object.assign({}, SEURA, { id: undefined, nimi: 'Luonnos', tila: 'luonnos' }), 'seurat/demo/harjoitepankki/h3': Object.assign({}, SEURA, { nimi: 'Muu konsepti', konsepti: 'y_h2' }) }, lisa || {});
  const odota = (p) => p.waitForSelector('[data-kt-toimintakortti]', { timeout: 15000 });
  it('seuran hyväksytty konsepti-osuma ensin ("Seuran harjoite"), kolme kysymystä; ei videota ilman linkkiä; osarivit eivät näytä cuetä; ei vaakavieritystä 390/1024', async () => {
    await avaa(); try {
      for (const [w, h] of [[1280, 900], [1024, 900], [390, 844]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, dokit: dok() }); await odota(p);
        expect(await p.locator('[data-kt-tk-harjoite="seura"]').innerText()).toMatch(/Seuran harjoite[^]*Suuntapeli seuran mallilla/); expect(await p.locator('[data-kt-toimintakortti]').innerText()).not.toMatch(/Luonnos|Muu konsepti/);
        expect(await p.locator('[data-kt-tk-kysy] li').count()).toBe(3); expect(await p.locator('[data-kt-video]').count()).toBe(0); expect(await p.locator('[data-kt-lisaa-video]').count()).toBe(0);   // valmentaja ei lisää videota
        const kys = await p.locator('[data-kt-tk-kysy] li').first().innerText(); expect(await p.locator('[data-kt-osat]').innerText()).not.toContain(kys);   // cuet vain kortissa
        expect(await p.evaluate(() => { const d = document.documentElement; return d.scrollWidth - d.clientWidth; }), 'ei vaakavieritystä ' + w).toBeLessThanOrEqual(0); await sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('ei seuran osumaa → TalentMaster-peliharjoite ("Peliharjoite") + kysymykset; konfiguraatio/harjoitelahteet voi laittaa TalentMasterin ensin', async () => {
    await avaa(); try {
      const a = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(a.p); expect(await a.p.locator('[data-kt-tk-harjoite="talentmaster"]').innerText()).toMatch(/Peliharjoite/); expect(await a.p.locator('[data-kt-tk-kysy] li').count()).toBe(3); await a.sk.close();
      const b = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', dokit: dok({ 'seurat/demo/konfiguraatio/harjoitelahteet': { jarjestys: ['talentmaster', 'seura'] } }) }); await odota(b.p); await b.p.waitForTimeout(400);
      expect(await b.p.locator('[data-kt-tk-harjoite]').getAttribute('data-kt-tk-harjoite')).toBe('talentmaster'); await b.sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('video: "Katso video · youtube.com" vain kun linkki on; "+ Lisää video" vain VP/SA (valmentaja ei näe); lisäys: vain https, kirjoitus harjoitepankki/{id}.update({video_url, paivitetty}); sen jälkeen linkki näkyy', async () => {
    await avaa(); try {
      const v = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', dokit: dok({ 'seurat/demo/harjoitepankki/h1': Object.assign({}, SEURA, { video_url: 'https://www.youtube.com/watch?v=abc' }) }) }); await odota(v.p);
      expect(await v.p.locator('[data-kt-video]').innerText()).toBe('Katso video · youtube.com'); expect(await v.p.locator('[data-kt-video]').getAttribute('target')).toBe('_blank'); expect(await v.p.locator('[data-kt-lisaa-video]').count()).toBe(0); await v.sk.close();
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/tanaan', dokit: dok() }); await odota(p);
      await p.locator('[data-kt-lisaa-video]').click(); await p.waitForSelector('[data-kt-video-sheet]');
      await p.locator('#ktVideoUrl').fill('http://example.com/v'); await p.locator('[data-kt-video-tallenna]').click(); expect(await p.locator('[data-kt-video-virhe]').innerText()).toMatch(/https/); expect(await p.evaluate(() => window.__kirj.length)).toBe(0);   // http hylätään, ei kirjoitusta
      await p.locator('#ktVideoUrl').fill('https://www.youtube.com/watch?v=xyz'); await p.locator('[data-kt-video-tallenna]').click(); await p.waitForFunction(() => window.__kirj.length === 1, null, { timeout: 8000 });
      const k = await p.evaluate(() => window.__kirj[0]); expect(k.path).toBe('seurat/demo/harjoitepankki/h1'); expect(Object.keys(k.update).sort()).toEqual(['paivitetty', 'video_url']); expect(k.update.video_url).toBe('https://www.youtube.com/watch?v=xyz');
      await p.waitForSelector('[data-kt-video-sheet]', { state: 'detached' }); expect(await p.locator('[data-kt-video]').innerText()).toBe('Katso video · youtube.com'); expect(await p.locator('[data-kt-lisaa-video]').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('Pelaajan silmin: vain TalentMaster-data — ei seuran harjoitetta, videota, lisää-nappia; otsikko "Mitä harjoittelet", "Kysy itseltäsi"', async () => {
    await avaa(); try {
      const { sk, p } = await kaynnista(selain, { rooli: 'vp', hash: '#pelaaja/p2/tanaan', dokit: dok({ 'seurat/demo/harjoitepankki/h1': Object.assign({}, SEURA, { video_url: 'https://youtu.be/q' }) }) }); await odota(p);
      expect(await p.locator('[data-kt-tk-harjoite="seura"]').count()).toBe(1); await p.locator('[data-kt-silmin]').click(); await p.waitForSelector('[data-kt-toimintakortti][data-kt-silmin]');
      const t = await p.locator('[data-kt-toimintakortti]').innerText(); expect(t).toMatch(/Mitä harjoittelet/i); expect(t).toContain('Kysy itseltäsi'); expect(t).not.toMatch(/Seuran harjoite|Suuntapeli seuran|Katso video|Lisää video/);
      expect(await p.locator('[data-kt-tk-harjoite="talentmaster"]').count()).toBe(1); expect(await p.locator('[data-kt-video], [data-kt-lisaa-video]').count()).toBe(0); await sk.close();
    } finally { await selain.close(); }
  }, 60000);
  it('fysiikkaharjoite: fyysisessä jaksossa jakson ohjelman liikkeet; teknisessä jaksossa ei; (PH-polku: yksikkötestissä)', async () => {
    await avaa(); try {
      const pel = (jf, lisa) => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, lisa || {}, { jaksofokus: Object.assign({}, x.jaksofokus, jf) }) : x);
      const oh = { nimi: 'Nopeus ja voima', liikkeet: [{ liike: 'Hyppyaskel', toistot: '3×6' }] };
      const a = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: pel({ domeeni: 'fyysinen', ohjelma: oh }) }); await odota(a.p); expect(await a.p.locator('[data-kt-tk-fysiikka]').innerText()).toMatch(/Fysiikkaharjoite · Nopeus ja voima[^]*Hyppyaskel · 3×6/); await a.sk.close();
      const b = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan' }); await odota(b.p); expect(await b.p.locator('[data-kt-tk-fysiikka]').count()).toBe(0); await b.sk.close();
    } finally { await selain.close(); }
  }, 90000);
  /* Kasvupyrähdys-fysiikka (päätös B 4.10.2026): mittaamaton kasvuikäisten ikkunassa (p2 = U13) → varovainen + "Kasvuvaihe ei mitattu"; NYT/LAH → varovainen; mitattu ENNEN/JÄLKEEN → tavallinen. */
  const KP_OH = { nimi: 'Voima', liikkeet: [{ liike: 'Nordic Hamstring', toistot: '3×5' }, { liike: 'Naruhypyt + pohjeeksentrinen' }, { liike: 'Kyykky — hallittu', toistot: '3×8' }] };
  const KP_PEL = (lisa, oh) => PELAAJAT.map((x) => x.id === 'p2' ? Object.assign({}, x, lisa || {}, { jaksofokus: Object.assign({}, x.jaksofokus, { domeeni: 'fyysinen', ohjelma: oh || KP_OH }) }) : x);
  const KP_MITATTU = (koodi, offset) => ({ phv_tila: koodi, biologinenIka_viimeisin: { offset: offset, pvm: '2026-09-01' } });
  const KP_VAROVAINEN = (t) => { expect(t).not.toMatch(/Nordic Hamstring/); expect(t).not.toMatch(/Kyykky — hallittu/); expect(t).toMatch(/Kevennettynä: Naruhypyt 2×10s kevyesti\. Pohjeeksentrinen pois kasvuaikana\./); expect(t).not.toMatch(/jänne-luuliitos|Kasvupyrähdyksen aikana/); expect(t).toMatch(/Vaihtoehto kasvuaikana/); for (const n of ['Takareisisilta', 'Pohjepito', 'Kuminauhakyykky']) expect(t).toContain(n); expect(t).toContain('Kasvuaikana tämä korvaa Nordic-takareisiliikkeen.'); expect(t).toContain('Kasvuaikana tämä korvaa kyykyn ja askelkyykyn.'); expect(t).not.toMatch(/\b(SBL|SFL|EX_[A-Z_]+|D\.sbl\.\d)\b/); };
  const KP_TAVALLINEN = (t, nimet) => { for (const n of nimet) expect(t).toContain(n); expect(t).not.toMatch(/Kevennettynä|Vaihtoehto kasvuaikana|kasvuaikana|Kasvuvaihe ei mitattu/); };
  it('mittaamaton ikkunassa → varovainen versio + merkintä "Kasvuvaihe ei mitattu"; merkinnän painallus avaa pelaajan mittausnäkymän (Näyttö); lib ladattu selaimessa', async () => {
    await avaa(); try {
      const a = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: KP_PEL({}) }); await odota(a.p);
      expect(await a.p.evaluate(() => typeof window.TM_KASVUPYRAHDYS)).toBe('object');
      const t = await a.p.locator('[data-kt-tk-fysiikka]').innerText(); KP_VAROVAINEN(t); expect(t).toContain('Kasvuvaihe ei mitattu');
      await a.p.locator('[data-kt-kasvuvaihe-ei-mitattu]').click(); await a.p.waitForSelector('[data-kt-valilehti="naytto"][aria-selected="true"]');
      expect(await a.p.evaluate(() => location.hash)).toMatch(/#pelaaja\/p2\/naytto/); await a.sk.close();
    } finally { await selain.close(); }
  }, 90000);
  it('NYT ja LAH (mitattu) → varovainen versio ilman "ei mitattu" -merkintää', async () => {
    await avaa(); try {
      for (const lisa of [KP_MITATTU('PH', 0), KP_MITATTU('LAH', -0.7)]) {
        const a = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: KP_PEL(lisa) }); await odota(a.p);
        const t = await a.p.locator('[data-kt-tk-fysiikka]').innerText(); KP_VAROVAINEN(t); expect(t).not.toContain('Kasvuvaihe ei mitattu'); await a.sk.close();
      }
    } finally { await selain.close(); }
  }, 90000);
  it('ENNEN ja JÄLKEEN (mitattu) → tavallinen ohjelma: ei "Kevennettynä", ei "Vaihtoehto kasvuaikana", ei merkintää', async () => {
    await avaa(); try {
      const a = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: KP_PEL(KP_MITATTU('PRE', -1.6)) }); await odota(a.p);   // mitattu ENNEN-pelaaja näkee Nordic Hamstringin (Teron korjaus 14.10.: EX_NORDIC ENNEN = kyllä)
      KP_TAVALLINEN(await a.p.locator('[data-kt-tk-fysiikka]').innerText(), ['Nordic Hamstring', 'Naruhypyt + pohjeeksentrinen', 'Kyykky — hallittu']); await a.sk.close();
      for (const k of [KP_MITATTU('POST', 0.8), KP_MITATTU('AN', 1.6)]) {
        const b = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', pelaajat: KP_PEL(k) }); await odota(b.p);
        KP_TAVALLINEN(await b.p.locator('[data-kt-tk-fysiikka]').innerText(), ['Nordic Hamstring', 'Naruhypyt + pohjeeksentrinen', 'Kyykky — hallittu']); await b.sk.close();
      }
    } finally { await selain.close(); }
  }, 120000);
  it('TM_KUVAT=1 · kuvat 1280 + 390 (tumma): toimintakortti seuran harjoitteella + videolla, TalentMaster-peliharjoite, Pelaajan silmin', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [n, w, h] of [['1280', 1280, 900], ['390', 390, 844]]) {
        const tilat = [['seura-video', 'vp', dok({ 'seurat/demo/harjoitepankki/h1': Object.assign({}, SEURA, { video_url: 'https://www.youtube.com/watch?v=abc' }) }), false], ['seura-ei-videota-vp', 'vp', dok(), false], ['talentmaster', 'valmentaja', undefined, false], ['pelaajan-silmin', 'vp', dok(), true]];
        for (const [nimi, rooli, d, silmin] of tilat) {
          const { sk, p } = await kaynnista(selain, { rooli, hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, dokit: d }); await odota(p); if (silmin) { await p.locator('[data-kt-silmin]').click(); await p.waitForSelector('[data-kt-toimintakortti][data-kt-silmin]'); }
          await p.locator('[data-kt-toimintakortti]').scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await p.screenshot({ path: join(KUVAT, 'toimintakortti-' + nimi + '-' + n + '.png') }); await sk.close();
        }
      }
    } finally { await selain.close(); }
  }, 180000);
  it('TM_KUVAT=1 · kuvat 1280 + 390: fysiikkaosio — mittaamaton (merkintä), ENNEN, NYT ja JÄLKEEN', async () => {
    if (!process.env.TM_KUVAT) return; mkdirSync(KUVAT, { recursive: true }); await avaa(); try {
      for (const [n, w, h] of [['1280', 1280, 900], ['390', 390, 844]]) for (const [nimi, lisa] of [['mittaamaton', {}], ['ennen', KP_MITATTU('PRE', -1.6)], ['nyt', KP_MITATTU('PH', 0)], ['jalkeen', KP_MITATTU('POST', 0.8)]]) {
        const { sk, p } = await kaynnista(selain, { rooli: 'valmentaja', hash: '#pelaaja/p2/tanaan', leveys: w, korkeus: h, pelaajat: KP_PEL(lisa) }); await odota(p);
        await p.locator('[data-kt-tk-fysiikka]').scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await p.screenshot({ path: join(KUVAT, 'fysiikka-' + nimi + '-' + n + '.png') }); await sk.close();
      }
    } finally { await selain.close(); }
  }, 240000);
});
