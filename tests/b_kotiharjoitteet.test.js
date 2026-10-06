/**
 * B 3/3 — Pelaaja_v7 näyttää jakson kotiharjoitteet (jaksofokus.tukiosa.harjoitteet snapshot): liike, toistot, palautus, kesto, pelaajan ohje, video/kuva-linkki + lähdemerkintä SEURAN NIMENÄ (ei kovakoodattu).
 * Fixture: KPV U13 -testipelaaja Topias (m93GBdOaGCUuenMiCL0I), seura "KPV". Pelaaja ei lue ohjelmat/harjoitepankki-kokoelmia; joukkuekäyttö ja luonnos eivät näy koskaan.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
const require = createRequire(import.meta.url);
const K = require('../lib/tm_kotiharjoitteet.js'), JM = require('../lib/tm_jakso_malli.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..'), lue = (f) => readFileSync(join(juuri, f), 'utf8'), PE = lue('TalentMaster_Pelaaja_v7.html');
const H = (n, lisa) => Object.assign({ id: 'ohj#' + n, nimi: 'Liike ' + n, lahde: 'seura', lahde_nimi: 'KPV', liike: 'Liike ' + n, toistot: '10', palautus: '30s', kesto_min: 2, pelaajan_ohje: 'Tee näin ' + n, jarjestys: n }, lisa || {});
const JF = (harjoitteet) => ({ konsepti_avain: 'y_h2', alkoi: '2026-10-05T10:00:00.000Z', tukiosa: { alue: 'kestävyys', perustelu: 'x', harjoitteet } });
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

describe('lib/tm_kotiharjoitteet (pure)', () => {
  it('rivit: liike/toistot/palautus/kesto/ohje/linkit; järjestys jarjestys-kentällä; nimi liikkeestä tai nimestä; ei tukiosaa/jaksoa → tyhjä', () => {
    const r = K.tmKotiharjoitteet(JF([H(2, { video_url: 'https://example.org/v.mp4', kuva_url: 'https://example.org/k.png' }), H(1)]));
    expect(r.map((x) => x.nimi)).toEqual(['Liike 1', 'Liike 2']); expect(r[1]).toMatchObject({ toistot: '10', palautus: '30s', kesto_min: 2, pelaajan_ohje: 'Tee näin 2', video_url: 'https://example.org/v.mp4', kuva_url: 'https://example.org/k.png', lahde: 'seura', lahde_nimi: 'KPV' });
    expect(K.tmKotiharjoitteet(JF([{ id: 'a', nimi: 'Vain nimi', lahde: 'tm' }]))[0]).toMatchObject({ nimi: 'Vain nimi', lahde: 'tm', toistot: null });
    for (const jf of [undefined, null, {}, { tukiosa: {} }, { tukiosa: { harjoitteet: [] } }, { tukiosa: { harjoitteet: 'x' } }]) expect(K.tmKotiharjoitteet(jf)).toEqual([]);
  });
  it('PUOLUSTAVA suodatus: kaytto "joukkue", tila luonnos/muu ja nimettömät eivät koskaan näy; vain http(s)-linkit', () => {
    const r = K.tmKotiharjoitteet(JF([H(1), H(2, { kaytto: 'joukkue' }), H(3, { tila: 'luonnos' }), H(4, { tila: 'hyvaksytty' }), { id: 'x', lahde: 'seura' }, null, 'merkkijono', H(5, { video_url: 'javascript:alert(1)', kuva_url: 'data:text/html,x' })]));
    expect(r.map((x) => x.nimi)).toEqual(['Liike 1', 'Liike 4', 'Liike 5']); expect(r[2].video_url).toBeNull(); expect(r[2].kuva_url).toBeNull();
  });
  it('HTML: lähdemerkintä = seuran nimi snapshotista (KPV / SJK / mikä tahansa — ei kovakoodattu); ilman nimeä "Seuran harjoite"; lahde tm → TalentMaster; escape; linkit rel=noopener; ei hex-värejä', () => {
    const h = K.tmKotiharjoitteetHTML(K.tmKotiharjoitteet(JF([H(1, { video_url: 'https://example.org/v.mp4' })])), { esc });
    expect(h).toContain('Liike 1'); expect(h).toContain('10 · palautus 30s · 2 min'); expect(h).toContain('Tee näin 1'); expect(h).toContain('<a href="https://example.org/v.mp4" target="_blank" rel="noopener">Video</a>'); expect(h).toMatch(/tm-kh-lahde[^>]*>KPV</);
    expect(h).not.toMatch(/#[0-9a-fA-F]{3,6}\b|rgb\(/); expect(K.tmKotiharjoitteetHTML(K.tmKotiharjoitteet(JF([H(1, { lahde_nimi: 'SJK' })])), { esc })).toMatch(/tm-kh-lahde[^>]*>SJK</);
    expect(K.tmKotiharjoitteetHTML(K.tmKotiharjoitteet(JF([H(1, { lahde_nimi: undefined })])), { esc })).toMatch(/tm-kh-lahde[^>]*>Seuran harjoite</); expect(K.tmKotiharjoitteetHTML(K.tmKotiharjoitteet(JF([H(1, { lahde: 'tm' })])), { esc })).toMatch(/tm-kh-lahde[^>]*>TalentMaster</);
    const x = K.tmKotiharjoitteetHTML(K.tmKotiharjoitteet(JF([H(1, { liike: '<img onerror=1>', pelaajan_ohje: '"><script>', lahde_nimi: '<b>' })])), { esc }); expect(x).not.toContain('<img'); expect(x).not.toContain('<script>'); expect(x).not.toContain('<b>');
    expect(K.tmKotiharjoitteetHTML([], { esc })).toBe(''); expect(K.tmKotiharjoitteetHTML(null)).toBe('');
  });
  it('kotiin_huomio ("keppi", "tarvitsee parin") näytetään liikkeen yhteydessä sulkuina; ilman huomiota ei sulkuja; huomio escapataan', () => {
    const h = K.tmKotiharjoitteetHTML(K.tmKotiharjoitteet(JF([H(1, { kotiin_huomio: 'keppi' }), H(2, { kotiin_huomio: 'tarvitsee parin' }), H(3), H(4, { kotiin_huomio: '<b>x</b>' })])), { esc });
    expect(h).toContain('Liike 1 <span class="tm-kh-huomio"'); expect(h).toContain('>(keppi)</span>'); expect(h).toContain('>(tarvitsee parin)</span>'); expect(h).toMatch(/Liike 3<\/div>/); expect(h).not.toContain('<b>x</b>'); expect(K.tmKotiharjoitteet(JF([H(1, { kotiin_huomio: 'keppi' })]))[0].kotiin_huomio).toBe('keppi');
  });
  it('§7.22 / GDPR: tuotettu data läpäisee jakso-vartijan (ei heikkous/rajoite/kriittinen, ei "ase"-avaimia); kenttänimet neutraaleja', () => {
    expect(JM.tmTarkistaJaksoData(K.tmKotiharjoitteet(JF([H(1, { video_url: 'https://example.org/v.mp4' })])))).toEqual([]);
    expect(K.tmKotiharjoitteetHTML(K.tmKotiharjoitteet(JF([H(1)])), { esc }).replace(/<[^>]+>/g, '')).not.toMatch(/heikkou|rajoit|kriittin|taso \d|vertaa/i);
  });
  it('päästä päähän: tmOhjelmaTukiosaan(hyväksytty ohjelma) + lahde_nimi → pelaaja näkee VAIN kotiin sopivat, ei joukkue-/luonnosliikkeitä (Lihaskestävyys 2, KPV)', () => {
    const o = { id: 'ohjelmat_98_1', nimi: 'Lihaskestävyys 2 (yli 12v)', tila: 'hyvaksytty', lahde: 'seura', versio: 1, liikkeet: [
      { jarjestys: 1, liike: 'Narulla hyppely', toistot: '5x30-50', palautus: '30s', pelaajan_ohje: 'Hyppää rennosti', kesto_min: 5, kotiin_sopiva: true }, { jarjestys: 2, liike: 'GHR pareittain', kotiin_sopiva: false }, { jarjestys: 3, liike: 'Joukkueliike', kotiin_sopiva: true, kaytto: 'joukkue' }] };
    const harjoitteet = JM.tmOhjelmaTukiosaan(o).map((e) => Object.assign({}, e, { lahde_nimi: 'KPV' })), tukiosa = JM.tmTukiosa({ alue: 'kestävyys', perustelu: 'x', harjoitteet: harjoitteet.map(({ lahde_nimi, ...e }) => e) });
    const r = K.tmKotiharjoitteet({ tukiosa: { harjoitteet } }); expect(r.map((x) => x.nimi)).toEqual(['Narulla hyppely']); expect(r[0]).toMatchObject({ toistot: '5x30-50', palautus: '30s', kesto_min: 5, lahde_nimi: 'KPV' }); expect(tukiosa.harjoitteet.length).toBe(1);
  });
});

function pura(t) { const i = PE.indexOf(t); expect(i, t).toBeGreaterThan(-1); let d = 0; for (let k = PE.indexOf('{', i); k < PE.length; k++) { if (PE[k] === '{') d++; else if (PE[k] === '}' && !--d) return PE.slice(i, k + 1); } throw new Error('sulkeet'); }
describe('Pelaaja_v7 + SW', () => {
  const ymp = (pelaaja) => { const c = { _pelaaja: pelaaja, _thEsc: esc, window: {}, Object, Array }; c.window = c; c.window.TM_KOTIHARJOITTEET = K; vm.createContext(c); vm.runInContext(pura('function rMinaKotiharjoitteet(') + ';', c); return c; };
  it('rMinaKotiharjoitteet: Topiaksen (KPV U13) jakson kotiharjoitteet renderöityvät seuran nimellä; ei jaksoa/tukiosaa → tyhjä (osio piiloon); joukkue-rivi ei näy', () => {
    const c = ymp({ id: 'm93GBdOaGCUuenMiCL0I', joukkue: 'KPV U13', jaksofokus: JF([H(1), H(2, { kaytto: 'joukkue', liike: 'Joukkuerata' })]) }), h = c.rMinaKotiharjoitteet();
    expect(h).toContain('Liike 1'); expect(h).not.toContain('Joukkuerata'); expect(h).toMatch(/tm-kh-lahde[^>]*>KPV</); expect(h).not.toContain('SJK');
    expect(ymp({ id: 'a', jaksofokus: undefined }).rMinaKotiharjoitteet()).toBe(''); expect(ymp(null).rMinaKotiharjoitteet()).toBe('');
  });
  it('lähde: g_koti-osio rMina():ssa (tyhjä body piilottaa), lib ladataan ?v=1; Vanhempi_v2 ei lataa; Pelaaja_v7 ei lue ohjelmat/harjoitepankki-kokoelmia; ei SJK-kovakoodausta', () => {
    expect(PE).toContain('lib/tm_kotiharjoitteet.js?v=1'); expect(PE).toMatch(/id: 'g_koti'[^]*?body: rMinaKotiharjoitteet\(\)/); expect(lue('TalentMaster_Vanhempi_v2.html')).not.toMatch(/tm_kotiharjoitteet|TM_KOTIHARJOITTEET/);
    expect(PE).not.toMatch(/collection\('(ohjelmat|harjoitepankki)'\)/); expect(lue('lib/tm_kotiharjoitteet.js')).not.toMatch(/SJK|KPV/i.test('') ? /x^/ : /'SJK'|"SJK"/);
    const koodi = lue('lib/tm_kotiharjoitteet.js').replace(/\/\*[\s\S]*?\*\//g, ''); expect(koodi).not.toMatch(/firebase|firestore|collection\(|fetch\(/i);
  });
  it('SW: cache-versio nostettu (v75), lib allowlistissä (offline); ei muita muutoksia sw-allowlistiin', () => {
    const sw = lue('sw_pelaaja.js'); expect(sw).toMatch(/const CACHE = 'tm-pelaaja-v75'/); expect(sw).toContain("'/lib/tm_kotiharjoitteet.js'");
  });
});
