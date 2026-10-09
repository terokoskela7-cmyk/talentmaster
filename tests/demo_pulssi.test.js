/**
 * S2-demodata (docs/CODE_BRIEF_S2_DEMODATA.md): tm_admin/demo_pulssi.js + setup_demo_kehitys.js --vain=pulssi.
 * Varmistaa: (1) polkuvartija — vain seurat/demo-fc/**, aina demo:true; (2) kuiva-ajo ei kirjoita; (3) päivämäärät suhteessa nytMs:ään;
 * (4) KOKO ketju: kirjoitettavat dokumentit → palvelimen laskeSeura (mock-Firestore) → sama kooste kuin malli (w=0); (5) mockupin 23 jokainen tila syntyy
 * (Leikkijä + perhe, harraste, pieni joukkue, ● ▲ ■, kolme signaalia D73:n järjestyksessä, laskeva 3 vk, kaksi joukkuetta); (6) --kayttoonotto.
 * Merkkien/signaalien luokitus tässä on D45/D65/D70/D72/D73-rajojen PEILI (oma pieni apuri) — varsinainen lib/tm_seuran_pulssi.js tulee S2 PR 1:ssä.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = require('../tm_admin/demo_pulssi.js');
const H = require('../functions/helsinki_paiva.js');
const S = require('../functions/seuran_kooste.js');
const SETUP = require('../tm_admin/setup_demo_kehitys.js');

const NYT = Date.UTC(2026, 9, 14, 10, 0);   // ke 14.10.2026 → W42
const AJAT = {
  'ke keskipäivä': NYT,
  'ma 00:10 Helsinki (viikon alku)': H.viikonRajat(NYT).alkuMs + 10 * 60000,
  'su 22:00 Helsinki (su 21 jälkeen)': H.viikonRajat(NYT).su21Ms + 3600000,
  'ma 00:00 seuraavana vuonna': Date.UTC(2027, 0, 4, 0, 0),
};
const DAY = 86400000;

/* ── mock-Firestore (sama kuin functions/test/seuran_kooste.test.js) ── */
const FieldValue = { serverTimestamp: () => ({ __ts: 'palvelin' }) };
const FieldPath = { documentId: () => ({ __docId: true }) };
function luoDb(data) {
  const STORE = new Map(Object.entries(data));
  const lapset = (polku) => [...STORE.keys()].filter((k) => k.startsWith(polku + '/') && k.slice(polku.length + 1).indexOf('/') < 0);
  const docSnap = (polku) => ({ id: polku.split('/').pop(), exists: STORE.has(polku), data: () => STORE.get(polku), ref: docRef(polku) });
  function colRef(polku, suod) {
    const c = {
      doc: (id) => docRef(polku + '/' + id), where: (f, op, v) => colRef(polku, (suod || []).concat([[f, op, v]])), limit: () => c,
      get: async () => {
        let ids = lapset(polku);
        (suod || []).forEach(([f, op, v]) => { if (f && f.__docId) ids = ids.filter((k) => { const id = k.split('/').pop(); return op === '>=' ? id >= v : op === '<=' ? id <= v : true; }); });
        const docs = ids.map(docSnap); return { docs, empty: !docs.length, size: docs.length };
      },
    };
    return c;
  }
  function docRef(polku) { return { path: polku, id: polku.split('/').pop(), get: async () => docSnap(polku), collection: (n) => colRef(polku + '/' + n), set: async (d) => { STORE.set(polku, d); } }; }
  return { STORE, collection: (n) => colRef(n), getAll: async (...refs) => refs.map((r) => docSnap(r.path)), batch: () => { const ops = []; return { set: (ref, d) => { ops.push([ref.path, d]); }, commit: async () => { ops.forEach(([p, d]) => STORE.set(p, d)); } }; } };
}
/* Pohja = nykyinen setup_demo_kehitys.js:n data (JONO) + pulssi-dokumentit samalla tavalla kuin mergeFields-kirjoitus (POISTA poistaa kentän). */
function tietokanta(R) {
  const data = {};
  SETUP.JONO.forEach((x) => { data[x.polku] = JSON.parse(JSON.stringify(x.data)); });
  R.docs.forEach((x) => {
    const uusi = {}; Object.keys(x.data).forEach((k) => { if (!(x.data[k] && x.data[k].__poista)) uusi[k] = x.data[k]; });
    if (x.merge) { const vanha = Object.assign({}, data[x.polku] || {}); Object.keys(x.data).forEach((k) => { if (x.data[k] && x.data[k].__poista) delete vanha[k]; }); data[x.polku] = Object.assign(vanha, uusi); } else data[x.polku] = uusi;
  });
  return luoDb(data);
}
async function palvelinKooste(nytMs) {
  const R = D.rakenna({ nytMs }), db = tietokanta(R), rajat = H.viikonRajat(nytMs);
  await S.laskeSeura({ db, FieldValue, FieldPath, nyt: () => nytMs, loki: { log() {}, error() {} } }, 'demo-fc', { rajat, nytMs });
  return { R, db, doc: db.STORE.get('seurat/demo-fc/kooste/' + rajat.tunniste) };
}

/* ── D45/D65/D70/D72 -rajat: ● tavoite · ▲ ≥ 75 % tavoitteesta · ■ selvästi alle; oto: katselmus enintään ▲ ── */
const TAVOITE = { kilpa: { jakso: 90, vk: 70, kats: 90, kaytto: 50 }, harraste: { jakso: 90, vk: 50, kats: 90, kaytto: 30 } };
const pros = (o, n) => (n > 0 ? Math.round((o / n) * 100 * 10) / 10 : null);
function merkki(p, tavoite, ylaraja) {
  if (p == null) return '—';
  let m = p >= tavoite ? '●' : p >= 0.75 * tavoite ? '▲' : '■';
  if (ylaraja === 'oto' && m === '●') m = '▲';
  return m;
}
function rivi(m) {
  const T = TAVOITE[m.tyyppi], leik = m.ikavaihe === 'leikkija', pieni = m.n_pelaajat < 5;
  const kaytto = leik ? m.n_perhe_kuittaus_7 : m.n_harjoite_7;
  const p = { jakso: pros(m.n_jaksolla, m.n_pelaajat), vk: leik ? null : pros(m.n_vastanneet, m.n_vastausperusta), kats: pros(m.n_katselmus_ajallaan, m.n_katselmus_perusta), kaytto: pros(kaytto, m.n_pelaajat) };
  if (pieni) return { pieni: true, p, merkit: { jakso: '○', vk: '○', kats: '○', kaytto: '○' }, lkm: { jakso: m.n_jaksolla + '/' + m.n_pelaajat, kaytto: kaytto + '/' + m.n_pelaajat } };
  return { pieni: false, p, merkit: { jakso: merkki(p.jakso, T.jakso), vk: merkki(p.vk, T.vk), kats: merkki(p.kats, T.kats, m.profiili), kaytto: merkki(p.kaytto, T.kaytto) } };
}
/* D73: 1) ei jaksoa ≥ 2 vk → 2) katselmusikkuna auki, vain ammatti → 3) viikkokatsaus laskenut 3 vk → 4) käyttö < 25 % (käyttöönoton jälkeen). Max 3. */
function signaalit(viikot /* [w0 … w4] kooste-dokumentit, uusin ensin */) {
  const ut = [], nyt = viikot[0].joukkueet;
  Object.keys(nyt).forEach((jid) => { if (!viikot[0].joukkueet[jid].jakso && !viikot[1].joukkueet[jid].jakso) ut.push({ n: 1, jid }); });
  Object.keys(nyt).forEach((jid) => { const m = nyt[jid]; if (m.profiili === 'ammatti' && m.n_katselmus > 0) ut.push({ n: 2, jid }); });
  Object.keys(nyt).forEach((jid) => {
    const s = [0, 1, 2, 3].map((w) => { const m = viikot[w].joukkueet[jid]; return m.ikavaihe === 'leikkija' ? null : pros(m.n_vastanneet, m.n_vastausperusta); });
    if (s.every((x) => x != null) && s[0] < s[1] && s[1] < s[2] && s[2] < s[3]) ut.push({ n: 3, jid });
  });
  Object.keys(nyt).forEach((jid) => { const r = rivi(nyt[jid]); if (!r.pieni && r.p.kaytto != null && r.p.kaytto < 25) ut.push({ n: 4, jid }); });
  return ut.sort((a, b) => a.n - b.n);
}

describe('polkuvartija ja kuiva-ajo', () => {
  it('jokainen dokumentti seurat/demo-fc/** ja demo:true; tarkistaPolut heittää muuten', () => {
    const R = D.rakenna({ nytMs: NYT });
    expect(R.docs.length).toBeGreaterThan(200);
    R.docs.forEach((x) => { expect(x.polku.startsWith('seurat/demo-fc/'), x.polku).toBe(true); expect(x.data.demo, x.polku).toBe(true); });
    expect(D.tarkistaPolut(R.docs)).toBe(true);
    expect(() => D.tarkistaPolut([{ polku: 'seurat/demo/pelaajat/x', data: { demo: true } }])).toThrow(/TURVA/);       // vanha demo-seura
    expect(() => D.tarkistaPolut([{ polku: 'seurat/kpv/pelaajat/x', data: { demo: true } }])).toThrow(/TURVA/);        // oikea seura
    expect(() => D.tarkistaPolut([{ polku: 'seurat/demo-fc/../kpv/x', data: { demo: true } }])).toThrow(/TURVA/);
    expect(() => D.tarkistaPolut([{ polku: 'seurat/demo-fc/pelaajat/x', data: { nimi: 'x' } }])).toThrow(/demo:true/);
  });
  it('kaikki pelaajat ovat Demo-nimisiä ja demo-fc:n omia (ei oikeita henkilöitä)', () => {
    D.rakenna({ nytMs: NYT }).docs.filter((x) => /\/pelaajat\/[^/]+$/.test(x.polku) && x.data.etunimi).forEach((x) => { expect(x.data.etunimi).toBe('Demo'); expect(x.data.lahde).toBe('demo'); });
  });
  it('oletus on kuiva-ajo: skripti ei yritä Firebasea eikä kirjoita (ei --kirjoita)', () => {
    const r = spawnSync(process.execPath, [join(juuri, 'tm_admin/setup_demo_kehitys.js'), '--vain=pulssi', '--nyt=2026-10-14T10:00:00Z'], { encoding: 'utf8', env: Object.assign({}, process.env, { GOOGLE_APPLICATION_CREDENTIALS: '/ei/ole/olemassa' }) });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('DRY-RUN'); expect(r.stdout).toContain('Mitään ei kirjoitettu'); expect(r.stdout).not.toContain('VALMIS:');
    expect(r.stdout).toContain('2026-W42');
  });
  it('pulssi-haara: ei Auth-kutsuja (ei createUser/setCustomUserClaims/updateUser) eikä kirjoitusta kuivassa haarassa', () => {
    const fs = require('fs'), src = fs.readFileSync(join(juuri, 'tm_admin/setup_demo_kehitys.js'), 'utf8');
    const pulssi = src.slice(src.indexOf('async function mainPulssi'), src.indexOf('async function main()'));
    expect(pulssi).not.toMatch(/auth\(\)|createUser|setCustomUserClaims|updateUser|TM_DEMO_PW/);
    expect(pulssi.indexOf("if (DRY) {")).toBeGreaterThan(-1);
    expect(pulssi.indexOf("require('firebase-admin')")).toBeGreaterThan(pulssi.indexOf('if (DRY) {'));   // admin ladataan vasta kuivan haaran jälkeen
    expect(pulssi).toContain('D.tarkistaPolut(R.docs)');
  });
});

describe('päivämäärät suhteessa ajohetkeen', () => {
  Object.keys(AJAT).forEach((nimi) => {
    it('kirjaukset ≤ 7 pv, viikkokatsaus = viikon sunnuntai, kooste-viikot peräkkäin: ' + nimi, () => {
      const nyt = AJAT[nimi], R = D.rakenna({ nytMs: nyt }), T = R.T, r0 = H.viikonRajat(nyt);
      const kirj = R.docs.filter((x) => /\/kirjaukset\/\d{4}/.test(x.polku)), vk = R.docs.filter((x) => /\/viikkokatsaukset\//.test(x.polku));
      expect(kirj.length).toBeGreaterThan(40); expect(vk.length).toBeGreaterThan(20);
      kirj.forEach((x) => { const pvm = x.polku.split('/').pop(), ero = (Date.parse(T) - Date.parse(pvm)) / DAY; expect(ero, x.polku).toBeGreaterThanOrEqual(0); expect(ero, x.polku).toBeLessThanOrEqual(6); });
      vk.forEach((x) => expect(x.polku.split('/').pop()).toBe(r0.sunnuntaiIso));
      expect(R.kuluva.r.tunniste).toBe(r0.tunniste);
      const viikot = R.docs.filter((x) => /\/kooste\/\d{4}-W/.test(x.polku)).map((x) => x.polku.split('/').pop()).sort();
      expect(viikot).toEqual([1, 2, 3, 4, 14].map((w) => H.viikonRajat(r0.alkuMs - w * 7 * DAY + 12 * 3600000).tunniste).sort());
    });
  });
});

describe('koko ketju: dokumentit → palvelimen laskeSeura → sama kooste kuin malli', () => {
  const KENTAT = ['jakso', 'tyyppi', 'profiili', 'ikavaihe', 'n_pelaajat', 'n_jaksolla', 'n_katselmus', 'n_vastanneet', 'n_vastausperusta', 'n_katselmus_ajallaan', 'n_katselmus_perusta',
    'n_suostumus', 'n_toiminto_7', 'n_perhe_kuittaus_7', 'n_harjoite_7', 'n_harjoite_30'];   // n_aktiivinen_*: pohja-Demo FC:llä on lisäksi vanhaa itsearviointi-/d3-dataa → ei vertailussa
  Object.keys(AJAT).forEach((nimi) => {
    it('kuluva viikko täsmää: ' + nimi, async () => {
      const { doc } = await palvelinKooste(AJAT[nimi]);
      const malli = D.koosteViikolta(AJAT[nimi], 0).doc;
      expect(doc.versio).toBe(5); expect(doc.vk).toBe(malli.vk);
      Object.keys(malli.joukkueet).forEach((jid) => KENTAT.forEach((k) => expect(doc.joukkueet[jid][k], jid + '.' + k).toEqual(malli.joukkueet[jid][k])));
      ['n_pelaajat', 'n_suostumus', 'n_toiminto_7', 'n_perhe_kuittaus_7', 'n_harjoite_7', 'n_harjoite_30'].forEach((k) => expect(doc.yhteensa[k], 'yhteensa.' + k).toBe(malli.yhteensa[k]));
    });
  });
  it('palvelin ei kiellä tulosta (tmKoosteRikkomukset) ja kirjoittaa vain kooste + kooste_joukkue', async () => {
    const { db } = await palvelinKooste(NYT);
    expect(db.STORE.has('seurat/demo-fc/kooste/2026-W42')).toBe(true);
    expect(db.STORE.has('seurat/demo-fc/kooste_joukkue/p14_demo_2026-W42')).toBe(true);
  });
});

describe('mockupin 23 tilat syntyvät datasta', () => {
  let viikot, nyt, rivit;
  const lataa = async () => {
    if (viikot) return;
    const { doc } = await palvelinKooste(NYT);
    viikot = [doc].concat([1, 2, 3, 4].map((w) => D.koosteViikolta(NYT, w).doc));
    nyt = doc.joukkueet; rivit = {}; Object.keys(nyt).forEach((jid) => { rivit[jid] = rivi(nyt[jid]); });
  };
  it('yhdeksän joukkuetta, Kenttä-lippu päällä', async () => {
    await lataa();
    expect(Object.keys(nyt).length).toBe(9);
    expect(D.rakenna({ nytMs: NYT }).docs.find((x) => x.polku.endsWith('/liput/julkiset')).data).toMatchObject({ kentta: true, demo: true });
  });
  it('Leikkijä, jolla perhe mukana (käyttö = perheen kuittaukset) ja harrastejoukkue', async () => {
    await lataa();
    expect(nyt.p10_demo).toMatchObject({ ikavaihe: 'leikkija', tyyppi: 'kilpa' }); expect(nyt.p10_demo.n_perhe_kuittaus_7).toBeGreaterThan(0);
    expect(nyt.p11_demo).toMatchObject({ ikavaihe: 'leikkija', tyyppi: 'harraste' });
    expect(nyt.p16_demo.tyyppi).toBe('harraste'); expect(rivit.p10_demo.p.vk).toBeNull();   // viikkokatsaus ei Leikkijällä
    ['p13_demo', 'p14_demo', 'p15_demo', 't14_demo'].forEach((j) => expect(nyt[j].n_perhe_kuittaus_7, j).toBe(0));
  });
  it('pieni joukkue (< 5): T12 näytetään lukumääränä, ei merkkiä', async () => {
    await lataa();
    expect(nyt.t12_demo.n_pelaajat).toBe(4); expect(rivit.t12_demo.pieni).toBe(true); expect(rivit.t12_demo.lkm).toEqual({ jakso: '3/4', kaytto: '2/4' });
  });
  it('merkit ● ▲ ■ kaikki esiintyvät; nimetyt rivit', async () => {
    await lataa();
    const kaikki = new Set(); Object.values(rivit).forEach((r) => Object.values(r.merkit).forEach((m) => kaikki.add(m)));
    ['●', '▲', '■', '○', '—'].forEach((m) => expect(kaikki.has(m), m).toBe(true));
    expect(Object.values(rivit.p12_demo.merkit)).toEqual(['●', '—', '●', '●']);                        // kaikki tavoitteessa (ammatti: katselmus ●)
    expect(rivit.p11_demo.merkit.jakso).toBe('▲'); expect(rivit.p16_demo.merkit.kaytto).toBe('▲');    // 7/8 = 88 % · 3/11 = 27 % (harraste ≥ 30)
    expect(rivit.p14_demo.merkit.vk).toBe('■'); expect(rivit.t14_demo.merkit.kats).toBe('■');          // 7/18 = 39 % · 2/6 = 33 %
    expect(rivit.p10_demo.merkit.kats).toBe('▲');                                                       // oto: ei koskaan ●
  });
  it('kolme signaalia D73:n järjestyksessä, ei neljättä', async () => {
    await lataa();
    expect(signaalit(viikot)).toEqual([{ n: 1, jid: 'p15_demo' }, { n: 2, jid: 'p13_demo' }, { n: 3, jid: 'p14_demo' }]);
  });
  it('laskeva trendi kolmelta viikolta P14:lle; muilla ei', async () => {
    await lataa();
    const sarja = (jid) => [3, 2, 1, 0].map((w) => viikot[w].joukkueet[jid]).map((m) => pros(m.n_vastanneet, m.n_vastausperusta));
    expect(sarja('p14_demo')).toEqual([83.3, 66.7, 50, 38.9]);
    Object.keys(nyt).filter((j) => j !== 'p14_demo').forEach((j) => { const s = sarja(j); expect(s.every((x) => x != null) && s[0] > s[1] && s[1] > s[2] && s[2] > s[3], j).toBe(false); });
  });
  it('ei jaksoa vähintään 2 viikkoa vain P15:llä (jakso false kuluvalla ja edellisellä)', async () => {
    await lataa();
    const ilman = Object.keys(nyt).filter((j) => !viikot[0].joukkueet[j].jakso && !viikot[1].joukkueet[j].jakso);
    expect(ilman).toEqual(['p15_demo']); expect(nyt.p15_demo.n_jaksolla).toBe(0);
  });
  it('katselmusikkuna auki: vain P13 (ammatti) — n_katselmus > 0', async () => {
    await lataa();
    expect(Object.keys(nyt).filter((j) => nyt[j].n_katselmus > 0)).toEqual(['p13_demo']); expect(nyt.p13_demo.profiili).toBe('ammatti');
  });
  it('yksi pelaaja kahdessa joukkueessa: seuran uniikit pelaajat < joukkueiden summa (§7.18)', async () => {
    await lataa();
    const summa = Object.values(nyt).reduce((a, m) => a + m.n_pelaajat, 0);
    expect(summa - viikot[0].yhteensa.n_pelaajat).toBe(1); expect(viikot[0].yhteensa.n_ilman_joukkuetta).toBe(0);
    const p = D.rakenna({ nytMs: NYT }).docs.find((x) => x.polku.endsWith('/pelaajat/' + D.KAKSI_JOUKKUETTA.pelaaja));
    expect(p.data.joukkueet).toEqual(['p14_demo', 'p16_demo']); expect(p.data.joukkueetNimet).toEqual(['P14 Demo', 'P16 Demo']);   // kaikki neljä kenttää (§7.18)
  });
  it('käyttöönottonauha: suostumus alle 90 %; historiaviikot versio 5, demo:true, ei arvio:true, laskettu su 21', async () => {
    await lataa();
    expect(viikot[0].yhteensa.n_suostumus / viikot[0].yhteensa.n_pelaajat).toBeLessThan(0.9);
    const R = D.rakenna({ nytMs: NYT });
    const kooste = R.docs.filter((x) => /\/kooste\/\d/.test(x.polku)), kj = R.docs.filter((x) => /\/kooste_joukkue\//.test(x.polku));
    expect(kooste.length).toBe(5); expect(kj.length).toBe(36);   // W-1…W-4 + käyttöönoton alun "ensimmäinen kooste" (W-14)
    kooste.concat(kj).forEach((x) => { expect(x.data.versio).toBe(5); expect(x.data.demo).toBe(true); expect('arvio' in x.data).toBe(false); expect(x.merge).toBe(false); expect(x.data.laskettu.__ts).toMatch(/^\d{4}-/); });
    expect(Object.keys(kooste[0].data.joukkueet).length).toBe(9);
    const ensin = kooste.map((x) => x.polku.split('/').pop()).sort()[0]; expect(ensin).toBe(H.viikonRajat(H.viikonRajat(NYT).alkuMs - 14 * 7 * DAY + 12 * 3600000).tunniste);
  });
  it('tietosuoja: koosteessa ei pelaajan nimeä eikä ID:tä (tmKoosteRikkomukset)', async () => {
    await lataa();
    const K = require('../lib/tm_seuran_kooste.js');
    viikot.forEach((d) => expect(K.tmKoosteRikkomukset(d)).toEqual([]));
  });
});

describe('--kayttoonotto', () => {
  it('kirjoittaa vain kaksi edellistä viikkoa ja pyytää poistamaan vanhemmat demo-koostedokumentit', () => {
    const R = D.rakenna({ nytMs: NYT, kayttoonotto: true }), vk = R.docs.filter((x) => /\/kooste\/\d/.test(x.polku)).map((x) => x.polku.split('/').pop()).sort();
    expect(vk).toEqual(['2026-W40', '2026-W41']); expect(R.poistaVanhemmatKuin).toBe('2026-W40'); expect(R.kayttoonotto).toBe(true);
    expect(D.rakenna({ nytMs: NYT }).poistaVanhemmatKuin).toBeNull();
  });
  it('kuiva-ajo näyttää tilan', () => {
    const r = spawnSync(process.execPath, [join(juuri, 'tm_admin/setup_demo_kehitys.js'), '--vain=pulssi', '--kayttoonotto', '--nyt=2026-10-14T10:00:00Z'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0); expect(r.stdout).toContain('KÄYTTÖÖNOTTOTILA');
  });
});

describe('toistettavuus', () => {
  it('sama nytMs → täsmälleen sama data (ei satunnaisuutta)', () => {
    const a = JSON.stringify(D.rakenna({ nytMs: NYT }).docs), b = JSON.stringify(D.rakenna({ nytMs: NYT }).docs);
    expect(a).toBe(b);
  });
  it('myöhempi ajo siirtää kaikki päivät mukanaan (viikon yli): kirjausten päivät kuuluvat uuteen ikkunaan', () => {
    const R = D.rakenna({ nytMs: NYT + 21 * DAY });
    expect(R.kuluva.r.tunniste).toBe('2026-W45');
    R.docs.filter((x) => /\/kirjaukset\/\d/.test(x.polku)).forEach((x) => { const pvm = x.polku.split('/').pop(); expect(pvm >= '2026-10-29' && pvm <= '2026-11-04', pvm).toBe(true); });
  });
});
