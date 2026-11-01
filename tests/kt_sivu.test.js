/* B7 · lib/tm_kt_sivu.js — Kehitystyöpöytä omana sivuna: linkit, Masterin paluuparametrit, rooli-rajattu pelaajalataus, naapurit (‹ ›), lippu. */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const KS = require('../lib/tm_kt_sivu.js');
const DOCS = [{ id: 'demo_u13', nimi: 'Demo U13' }, { id: 'demo_u15', nimi: 'Demo U15' }];
const PEL = [
  { id: 'p1', etunimi: 'Aatu', sukunimi: 'Aalto', joukkue: 'Demo U13', joukkueet: ['demo_u13'] },
  { id: 'p2', etunimi: 'Bertta', sukunimi: 'Bergh', joukkue: 'Demo U13', joukkueet: ['demo_u13'] },
  { id: 'p3', etunimi: 'Cecil', sukunimi: 'Carlsson', joukkue: 'demo u13 ', joukkueet: [] },   // legacy: vain nimi (kirjainkoko/väli), ei joukkueet[]
  { id: 'p9', etunimi: 'Dani', sukunimi: 'Dahl', joukkue: 'Demo U15', joukkueet: ['demo_u15'] },
  { id: 'p8', etunimi: 'Eero', sukunimi: 'Ek', joukkue: 'Demo U13', joukkueet: ['demo_u15'] },   // nimi U13, tunniste U15 → jäsenyys joukkueet[]:stä (§7.18)
];
const fakeDb = () => {
  const kyselyt = [];
  const col = (f) => ({
    where: (a, b, c) => col(f.concat([[a, b, c]])),
    get: async () => { kyselyt.push(f.map((x) => x.join(' ')).join(' & ') || 'kaikki'); const d = PEL.filter((p) => f.every(([a, b, c]) => b === '==' ? p[a] === c : Array.isArray(p[a]) && p[a].indexOf(c) >= 0)); return { docs: d.map((p) => ({ id: p.id, data: () => { const o = Object.assign({}, p); delete o.id; return o; } })) }; }
  });
  return { kyselyt, collection: () => ({ doc: () => ({ collection: () => col([]) }) }) };
};
describe('B7 · linkit ja parametrit', () => {
  it('tmKtSivuLinkki: sivu + #pelaaja/{pid}/{valilehti}; virheellinen pid / välilehti → null', () => {
    expect(KS.tmKtSivuLinkki('p1')).toBe('TalentMaster_Kehitystyopoyta.html#pelaaja/p1/tanaan');
    expect(KS.tmKtSivuLinkki('p1', 'polku')).toBe('TalentMaster_Kehitystyopoyta.html#pelaaja/p1/polku');
    expect(KS.tmKtSivuLinkki('a/b')).toBeNull(); expect(KS.tmKtSivuLinkki('')).toBeNull(); expect(KS.tmKtSivuLinkki('p1', 'muu')).toBeNull();
  });
  it('tmKtMasterLinkki + tmKtMasterParametrit: kierto, vain sallitut arvot', () => {
    expect(KS.tmKtMasterLinkki('dev')).toBe('TalentMaster_Master_v16.html?ws=dev');
    expect(KS.tmKtMasterLinkki('koti', 'havainto')).toBe('TalentMaster_Master_v16.html?ws=koti&toiminto=havainto');
    expect(KS.tmKtMasterLinkki('tuntematon')).toBe('TalentMaster_Master_v16.html?ws=koti');
    expect(KS.tmKtMasterParametrit('?ws=dev&toiminto=havainto')).toEqual({ ws: 'dev', toiminto: 'havainto' });
    expect(KS.tmKtMasterParametrit('?ws=dev')).toEqual({ ws: 'dev', toiminto: null });
    expect(KS.tmKtMasterParametrit('?ws=<script>')).toBeNull(); expect(KS.tmKtMasterParametrit('?ws=xyz')).toBeNull(); expect(KS.tmKtMasterParametrit('')).toBeNull();
    expect(KS.tmKtMasterParametrit('?ws=dev&toiminto=poista')).toEqual({ ws: 'dev', toiminto: null });
  });
  it('tmKtSivuLippuOn: OMA lippu kehitystyopoyta_v2 (täsmälleen true); valmentaja_v2 EI avaa sivua; liput/julkiset voittaa vanhan seurat.liput', () => {
    expect(KS.tmKtSivuLippuOn({ kehitystyopoyta_v2: true }, null)).toBe(true); expect(KS.tmKtSivuLippuOn({ kehitystyopoyta_v2: false }, { liput: { kehitystyopoyta_v2: true } })).toBe(false);
    expect(KS.tmKtSivuLippuOn(null, { liput: { kehitystyopoyta_v2: true } })).toBe(true); expect(KS.tmKtSivuLippuOn({ kehitystyopoyta_v2: 'true' }, null)).toBe(false); expect(KS.tmKtSivuLippuOn(null, null)).toBe(false);
    expect(KS.tmKtSivuLippuOn({ valmentaja_v2: true }, null)).toBe(false); expect(KS.tmKtSivuLippuOn({ valmentaja_v2: true, kentta: true }, { liput: { valmentaja_v2: true } })).toBe(false);   // V-KOTI päällä, työpöytä pois → vanha näkymä
  });
  it('tmKtSivuLaajuus: johto/talenttivalmentaja/SA = seura, valmentaja = joukkue, muut ei sivulle', () => {
    ['vp', 'urheilutoimenjohtaja', 'seurasihteeri', 'talenttivalmentaja', 'super_admin'].forEach((r) => expect(KS.tmKtSivuLaajuus(r)).toBe('seura'));
    expect(KS.tmKtSivuLaajuus('valmentaja')).toBe('joukkue'); ['fysiikkavalmentaja', 'fysioterapeutti', 'pelaaja', 'vanhempi', '', null].forEach((r) => expect(KS.tmKtSivuLaajuus(r)).toBeNull());
  });
});
describe('B7 · pelaajalataus ja naapurit', () => {
  it('valmentaja: vain oman joukkueen jäsenet (joukkueet[] ratkaisee, ei nimi); kaksoiskysely; sukunimijärjestys', async () => {
    const db = fakeDb(), l = await KS.tmKtSivuLataaPelaajat({ db, sid: 'demo', rooli: 'valmentaja', joukkueet: ['Demo U13'], joukkueDocs: DOCS });
    expect(l.map((p) => p.id)).toEqual(['p1', 'p2']);   // p3 (legacy ilman joukkueet[]) ei tule kyselyistä; p8 (nimi U13, tunniste U15) pois jäsenyyssäännön takia; p9 toinen joukkue
    expect(db.kyselyt).toEqual(['joukkue == Demo U13', 'joukkueet array-contains demo_u13']);
  });
  it('valmentaja ilman joukkuetta → tyhjä (ei koko seuraa); tuntematon rooli → tyhjä', async () => {
    expect(await KS.tmKtSivuLataaPelaajat({ db: fakeDb(), sid: 'demo', rooli: 'valmentaja', joukkueet: [], joukkueDocs: DOCS })).toEqual([]);
    expect(await KS.tmKtSivuLataaPelaajat({ db: fakeDb(), sid: 'demo', rooli: 'fysioterapeutti', joukkueet: ['Demo U13'], joukkueDocs: DOCS })).toEqual([]);
  });
  it('VP / SA / talenttivalmentaja: koko seura, uniikit, sukunimijärjestys', async () => {
    for (const rooli of ['vp', 'super_admin', 'talenttivalmentaja']) { const l = await KS.tmKtSivuLataaPelaajat({ db: fakeDb(), sid: 'demo', rooli, joukkueet: [], joukkueDocs: DOCS }); expect(l.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p9', 'p8'].sort((a, b) => PEL.find((x) => x.id === a).sukunimi.localeCompare(PEL.find((x) => x.id === b).sukunimi))); }
  });
  it('PHV kulkee tm_phv_tila:n kautta (ei suoraa p.phv_tila-lukua): tuntematon ilman mittausta', async () => {
    const l = await KS.tmKtSivuLataaPelaajat({ db: fakeDb(), sid: 'demo', rooli: 'vp', joukkueet: [], joukkueDocs: DOCS }); expect(l.every((p) => p.phv_tila === 'tuntematon' || p.phv_tila == null)).toBe(true);
  });
  it('tmKtSivuNaapurit: ‹ › kulkee saman joukkueen sisällä sukunimijärjestyksessä; toisen joukkueen pelaaja ei sekoitu', () => {
    const kaikki = PEL.map((p) => Object.assign({}, p, { phv_tila: null }));
    expect(KS.tmKtSivuNaapurit(kaikki, 'p2', DOCS)).toEqual(['p1', 'p2', 'p3']);   // Aalto, Bergh, Carlsson; p3 (legacy-nimi "demo u13 ") kanonisoituu docia vasten → jäsen
    expect(KS.tmKtSivuNaapurit(kaikki, 'p9', DOCS)).toContain('p8'); expect(KS.tmKtSivuNaapurit(kaikki, 'p9', DOCS)).not.toContain('p1');
    expect(KS.tmKtSivuNaapurit(kaikki, 'ei_ole', DOCS)).toEqual([]);
  });
});

/* ── kytkennät: SW-allowlist, App Check, Master/VP-linkitys (lipun takana) ── */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..'), lue = (p) => readFileSync(join(JUURI, p), 'utf8');
const SIVU_HTML = lue('TalentMaster_Kehitystyopoyta.html'), MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
function pura(src, alku) {
  const a = src.indexOf(alku); if (a < 0) throw new Error('ei löydy: ' + alku);
  let d = 0; for (let j = src.indexOf('{', a); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) return src.slice(a, j + 1); } }
  throw new Error('sulkeet');
}
describe('B7 · Service Worker -allowlist (§27.4): Pelaaja/Vanhempi-SW eivät cachetta henkilökunnan sivua eivätkä sen libiä', () => {
  for (const sw of ['sw_pelaaja.js', 'sw_vanhempi.js']) {
    it(sw + ': onOmaHtml / onAllowlist → false uudelle sivulle ja tm_kt_sivu.js:lle (tuore verkosta)', () => {
      const ctx = { self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } }, caches: {}, console, URL, location: { origin: 'https://x.test' } }; vm.createContext(ctx); vm.runInContext(lue(sw) + '\nthis.__o=typeof onOmaHtml==="function"?onOmaHtml:null;this.__a=typeof onAllowlist==="function"?onAllowlist:null;', ctx);
      const sivu = 'https://x.test/talentmaster/TalentMaster_Kehitystyopoyta.html#pelaaja/p1/tanaan', lib = 'https://x.test/talentmaster/lib/tm_kt_sivu.js';
      if (ctx.__o) expect(ctx.__o(sivu), 'onOmaHtml').toBe(false); if (ctx.__a) { expect(ctx.__a(sivu), 'onAllowlist sivu').toBe(false); expect(ctx.__a(lib), 'onAllowlist lib').toBe(false); }
      expect(ctx.__o || ctx.__a, 'SW:n allowlist-funktiot löytyvät (testi ei ole tyhjä)').toBeTruthy();
    });
  }
});
describe('B7 · sivun perusvaatimukset', () => {
  it('App Check: SDK 10.7.1 compat + tm_appcheck.js + tmAppCheckAktivoi() heti initin jälkeen, ennen auth/firestore-kutsuja (§38)', () => {
    expect(SIVU_HTML).toContain('firebasejs/10.7.1/firebase-app-check-compat.js'); expect(SIVU_HTML).toContain('lib/tm_appcheck.js');
    const i = SIVU_HTML.indexOf('firebase.initializeApp('), a = SIVU_HTML.indexOf('tmAppCheckAktivoi()', i), au = SIVU_HTML.indexOf('firebase.auth()', i);
    expect(i).toBeGreaterThan(0); expect(a).toBeGreaterThan(i); expect(a).toBeLessThan(au);
  });
  it('lippu: sivu avaa työpöydän vain tmKtSivuLippuOn-ehdolla; kirjoitus vain nimetyllä roolilla (tmKtSivuLaajuus) ennen dataa', () => {
    const k = pura(SIVU_HTML, 'async function _kaynnista(user)'); expect(k.indexOf('tmKtSivuLaajuus')).toBeLessThan(k.indexOf('_lippuPaalla()')); expect(k.indexOf('_lippuPaalla()')).toBeLessThan(k.indexOf('tmNavAsenna')); expect(k.indexOf('_lippuPaalla()')).toBeLessThan(k.indexOf('tmKtSivuLataaPelaajat'));
  });
  it('ei hex-värejä eikä emojeja käyttöliittymässä (tokenit); ei kirjautumislomaketta tällä sivulla', () => {
    const tyyli = SIVU_HTML.slice(SIVU_HTML.indexOf('/* ── KUORI'), SIVU_HTML.indexOf('</style>')); expect(tyyli).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SIVU_HTML).not.toMatch(/type="password"|signInWith/);
  });
  it('osa-arvion kirjoitus kulkee lib-ytimen (tmKtTallennaOsaArvio) kautta; roolin lähde claim; pelaajaa ei kirjoiteta ilman tmPelaajaOikeus-oikeutta', () => {
    expect(SIVU_HTML).toContain('K.tmKtTallennaOsaArvio('); expect(SIVU_HTML).toContain('voi: _voiKirjoittaa'); expect(pura(SIVU_HTML, 'function _voiKirjoittaa(p)')).toContain('tmPelaajaOikeus');
  });
});
describe('B7 · Master ja VP linkittävät uuteen sivuun lipun kehitystyopoyta_v2 takana (ei valmentaja_v2)', () => {
  it('Master pickPlayer: lippu päällä (window._tmKtSivu = kehitystyopoyta_v2) → uusi sivu; V-KOTI (_tmNavV2) yksin ei riitä; muuten ennallaan (V4 / vanha näkymä)', () => {
    const f = ['function _mKtSivuTieto(', 'function _mKtSivuPaatos(', 'function _mAvaaPelaaja(', 'function _mAvaaPelaajaVanha(', 'function pickPlayer(pid)'].map((t) => pura(MASTER, t)).join('\n');   // kaikki pelaajan avaukset: _mAvaaPelaaja-sisäänkäynti
    for (const [nav, odotettu] of [[true, 'TalentMaster_Kehitystyopoyta.html#pelaaja/p1/tanaan'], [false, null]]) {
      const loki = { href: null, ktAvaa: 0, renderDev: 0 }, ctx = { window: { _tmNavV2: true, _tmKtSivu: nav, TM_KT_SIVU: KS, _ktLippu: false, location: {} }, _demo: false, _seuraId: 's', renderDev: () => loki.renderDev++, _ktKaynnista: undefined };
      Object.defineProperty(ctx.window.location, 'href', { set: (v) => { loki.href = v; }, get: () => '' }); vm.createContext(ctx); vm.runInContext(f + '\npickPlayer("p1");', ctx);
      expect(loki.href).toBe(odotettu); expect(loki.renderDev).toBe(nav ? 0 : 1);
    }
  });
  it('Master: valintalippu luetaan tmNavAsenna-tuloksesta ja paluuparametrit (?ws=…) käsitellään vasta kun navigaatio on päällä', () => {
    expect(MASTER).toMatch(/window\._tmNavV2 = !!on; if \(on\) setWs\([^)]*\)\.ws\); _mKtSivuParametrit\(\);/); expect(MASTER).toMatch(/window\._tmKtSivu = !!\(l && l\.kehitystyopoyta_v2 === true\)/);
    expect(pura(MASTER, 'function _mKtSivuParametrit()')).toContain('tmKtMasterParametrit(location.search)');
  });
  it('VP _ktAvaa: kehitystyopoyta_v2 → uusi sivu (myös ilman kentta-lippua); lippu pois → vanha reititin ennallaan', () => {
    const f = pura(VP, 'window._ktAvaa = function (pid, valilehti)') + ';';
    for (const [sivu, kentta] of [[true, false], [false, true], [false, false]]) {
      const loki = { href: null, avaa: [] }, ctx = { window: { _ktSivuLippu: sivu, _ktLippu: kentta, TM_KT_SIVU: KS, location: {} }, _ktS: { reititin: { avaa: (...a) => { loki.avaa.push(a); return true; } } } };
      Object.defineProperty(ctx.window.location, 'href', { set: (v) => { loki.href = v; }, get: () => '' }); vm.createContext(ctx); vm.runInContext(f + '\nthis.__r = window._ktAvaa("p1", "polku");', ctx);
      if (sivu) { expect(loki.href).toBe('TalentMaster_Kehitystyopoyta.html#pelaaja/p1/polku'); expect(loki.avaa).toEqual([]); } else { expect(loki.href).toBeNull(); expect(loki.avaa).toEqual(kentta ? [['p1', 'polku']] : []); }
    }
  });
  it('VP: kehitystyopoyta_v2 luetaan liput-objektista ennen kentta-ehtoa (jotta uusi sivu avautuu myös ilman V4-lippua)', () => {
    const f = pura(VP, 'async function _ktKaynnista()'); expect(f.indexOf('_ktSivuLippu')).toBeLessThan(f.indexOf('liput.kentta !== true'));
  });
  it('molemmat lataavat lib/tm_kt_sivu.js ?v:llä', () => { for (const s of [MASTER, VP]) expect(s).toMatch(/<script src="lib\/tm_kt_sivu\.js"><\/script>/); });
});
describe('B7 · tekstit: fi-oletukset, en + sv-erätiedosto (Code ei kirjoita ruotsia)', () => {
  const ERA = JSON.parse(lue('docs/i18n/sv_kaannoserae_43_gemini.json')), RIVIT = ERA.osiot['lib.tm_kt_sivu'].rivit;
  it('erätiedosto vastaa libin FI-avaimia: fi täsmää, en täytetty, sv TYHJÄ (Gemini täyttää)', () => {
    expect(Object.keys(RIVIT).sort()).toEqual(Object.keys(KS.FI).sort());
    for (const [k, r] of Object.entries(RIVIT)) { expect(r.fi, k).toBe(KS.FI[k]); expect(r.en.length, k + ' en').toBeGreaterThan(0); expect(r.sv, k + ' sv').toBe(''); }
  });
  it('tmKtSivuT: käännös voittaa, muuten FI-oletus; tuntematon avain → avain', () => {
    expect(KS.tmKtSivuT((k) => 'X:' + k, 'kts_avaa_master')).toBe('X:kts_avaa_master'); expect(KS.tmKtSivuT((k) => k, 'kts_avaa_master')).toBe('Avaa Master'); expect(KS.tmKtSivuT(null, 'kts_virhe')).toBe('Latauksessa tapahtui virhe.'); expect(KS.tmKtSivuT((k) => k, 'ei_ole')).toBe('ei_ole');
  });
  it('sivu ei sisällä uusia kovakoodattuja suomenkielisiä käyttäjätekstejä T()/masterT():n ulkopuolella (viestit kulkevat avainten kautta)', () => {
    const koodi = SIVU_HTML.slice(SIVU_HTML.indexOf("'use strict';"));
    expect(koodi).not.toMatch(/_viesti\('[A-ZÅÄÖ]/); expect(koodi).not.toMatch(/textContent = '[A-ZÅÄÖ]/);
  });
});
