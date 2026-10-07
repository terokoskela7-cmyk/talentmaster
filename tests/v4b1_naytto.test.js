import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { renderPinfo, PINFO_PELAAJAT } from './helpers/master_pinfo.mjs';
import { renderVpKortti, VP_PELAAJAT } from './helpers/vp_kortti.mjs';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
/* AIKA JÄÄDYTETTY (CI vs paikallinen): snapshotit sisältävät suhteellisia aikoja ('N pv sitten', vk, ikä). Host-kello kiinteäksi + TZ Europe/Helsinki (helperit asettavat TZ:n ja antavat sivun koodille saman kiinteän kellon vm-kontekstissa).
   Baselinet on luotu VANHASTA koodista (ennen funktioiden erottamista, 63733c09) samalla kellolla ja TZ:llä → "merkki merkiltä sama" -todiste pätee. */
beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T12:00:00+03:00')); });
afterAll(() => { vi.useRealTimers(); });
const BASE = JSON.parse(readFileSync(join(juuri, 'tests/fixtures/v4b1_pinfo_baseline.json'), 'utf8'));
describe('V4b-1: lippu pois → vanha pelaajakortti täsmälleen ennallaan funktioiden erottamisen jälkeen (snapshot)', () => {
  for (const k of Object.keys(PINFO_PELAAJAT)) it('pelaaja "' + k + '": #pinfoCard.innerHTML === baseline (ennen erottamista)', () => { expect(renderPinfo(JSON.parse(JSON.stringify(PINFO_PELAAJAT[k])))).toBe(BASE[k]); });
});
const BASEVP = JSON.parse(readFileSync(join(juuri, 'tests/fixtures/v4b1_vp_kortti_baseline.json'), 'utf8'));
describe('V4b-1: lippu pois → VP:n vanha pelaajamodaali täsmälleen ennallaan funktioiden erottamisen jälkeen (snapshot)', () => {
  for (const k of Object.keys(VP_PELAAJAT)) it('pelaaja "' + k + '": modaalin HTML === baseline (ennen erottamista)', () => { expect(renderVpKortti(JSON.parse(JSON.stringify(VP_PELAAJAT[k])))).toBe(BASEVP[k]); });
});

/* ── V4b-1: Näyttö (mockup 18 §7, 13 §6) — sivun OIKEA koodi vm:ssä ── */
import { lataaSivu } from './helpers/sivu_ajuri.mjs';
const jarj = (h, ...osat) => osat.map((o) => h.indexOf(o)).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1]));
function masterSivu(extra) {
  return lataaSivu('TalentMaster_Master_v16.html', Object.assign({ masterT: (x) => x, _testitapahtumat: [{ tila: 'suljettu' }], _superAdmin: false, _uid: 'u1', _joukkue: 'KPV U13', _rooli: 'valmentaja', _seuraId: 'kpv', _demo: false,
    _prVoiNahda: () => true, _D3_DIMS: [{ key: 'inner_drive', nimi: 'Sisäinen draivi' }], tmPaivaIso: () => '2026-10-07', _mJaksoNapitHTML: () => '', _ktPaivita() {}, _msMesoKaariHTML: () => '<i data-meso></i>',
    _db: { collection: () => { throw new Error('luku!'); } } }, extra || {}));
}
describe('V4b-1 Master: Näyttö sisältää vanhan kortin lohkot (samat funktiot, ei kopioita) mockup 18 §7:n mukaan', () => {
  it('rikas pelaaja: jokainen vanhan kortin lohko (_mPinfoOsat) on Näytössä; osiot järjestyksessä Perustiedot › Kasvu ja kypsyys › Mittaukset › Pelihavainnot › Psyykkinen › Mitä pelaajan tulee osata', () => {
    const c = masterSivu(); const p = JSON.parse(JSON.stringify(PINFO_PELAAJAT.rikas)); const o = c._mPinfoOsat(p), h = c._ktNayttoHTML(p);
    for (const k of ['lisaHtml', '_kehHtml', '_sekHtml', '_identHtml', '_adarHtml', '_ristiinHtml', '_kehityskaariHtml', '_d3Html']) { expect(o[k], k).toBeTruthy(); expect(h, k).toContain(o[k]); }
    expect(h).toContain(c._mStatsHTML(o.stats)); expect(o.stats.length).toBeGreaterThan(1);
    expect(jarj(h, 'Perustiedot', 'Kasvu ja kypsyys', 'Mittaukset', 'Pelihavainnot', 'Psyykkinen (D3)', 'Mitä pelaajan tulee osata')).toBe(true);
    expect(h).toContain('Kehon valmius'); expect(h).toContain('Peliäly'); expect(h).toContain('Ristiinarvio'); expect(h).toContain('PHV'); expect(h).toContain('_avaaPelaajaraportti'); expect(h).toContain('id="_mMitaCard"');
  });
  it('Kasvu ja kypsyys: biologinen ikä / PHV-ikä / kasvutahti + mittauspäivä; "Suunnittele mittaus → Testaus" -CTA (kasvumittaus säilyy Näytössä)', () => {
    const c = masterSivu(), p = { id: 'k', etunimi: 'K', sukunimi: 'X', syntymaVuosi: 2013, joukkue: 'KPV U13', biologinenIka_viimeisin: { maturity_offset: -1.2, phv_ika: 13.8, pvm: '2026-10-04', kasvutahti_cm_v: 6.1 } };
    const h = c._ktNayttoHTML(p); expect(h).toContain('Kasvu ja kypsyys'); expect(h).toContain('maturity offset -1,2'); expect(h).toContain('PHV-ikä (arvio) 13,8 v'); expect(h).toContain('kasvu 6,1 cm/v'); expect(h).toContain('mitattu 4.10.2026'); expect(h).toContain("_msFyysSuunnitteleMittaus(\'k\')");
    expect(c._ktKasvuHTML({ id: 'z' })).toBe('');
  });
  it('tyhjä pelaaja: ei kaadu; tyhjiä osioita (Kasvu, Pelihavainnot) ei näytetä; Perustiedot, Mittaukset ja D3 näkyvät', () => {
    const c = masterSivu(), h = c._ktNayttoHTML(JSON.parse(JSON.stringify(PINFO_PELAAJAT.tyhja)));
    expect(h).toContain('Perustiedot'); expect(h).toContain('Mittaukset'); expect(h).not.toContain('Kasvu ja kypsyys'); expect(h).not.toContain('Pelihavainnot'); expect(h).toContain('Psyykkinen (D3)');
  });
  it('LATAUSJAKO: Näyttö ja Polku rakennetaan vasta kun välilehti avataan (ei laskentaa eikä lukuja ennen); Näytön rakennus ei lue Firestorea', () => {
    const c = masterSivu(); let osat = 0; const orig = c._mPinfoOsat; c._mPinfoOsat = function (p) { osat++; return orig(p); };
    const p = JSON.parse(JSON.stringify(PINFO_PELAAJAT.rikas)); c._pelaajatData = [p]; c.window._ktLippu = true;
    c._ktS.ladattu = { polku: false, naytto: false }; c._ktS.valilehti = 'tanaan'; c._ktS.pid = p.id; const kehys = c._ktKehys(p);
    expect(osat).toBe(0); expect(kehys).not.toContain('data-kt-nayttö'); expect(kehys).not.toContain('_mIdpCard'); expect(kehys).toMatch(/data-kt-sivu="naytto" data-ladattu="0" hidden/);
    c._ktS.ladattu.naytto = true; c._ktS.valilehti = 'naytto'; const auki = c._ktKehys(p); expect(auki).toContain('data-kt-nayttö'); expect(osat).toBe(1); expect(auki).toMatch(/data-kt-sivu="naytto" data-ladattu="1">/); expect(auki).not.toContain('id="_mIdpCard"');
  });
  it('Polku: IDP-kortin paikka + jaksohistoria (kehityskaari) + Resepti/teknis-taktinen toimintakortti vanhalta kortilta', () => {
    const c = masterSivu(), o0 = { _reseptiHtml: '<div data-resepti></div>', _ttHtml: '<div data-tt></div>' }; c._mPinfoOsat = () => o0;
    const h = c._ktPolkuHTML({ id: 'x' }); expect(h).toContain('id="_mIdpCard"'); expect(h).toContain('data-meso'); expect(h).toContain('data-resepti'); expect(h).toContain('data-tt'); expect(jarj(h, '_mIdpCard', 'data-meso', 'data-resepti')).toBe(true);
    c._mPinfoOsat = () => ({ _reseptiHtml: '', _ttHtml: '' }); expect(c._ktPolkuHTML({ id: 'x' })).not.toContain('pinfo-card');
  });
  it('vanha kortti ja Näyttö jakavat KPI-solut ja lohkot: _mStatsHTML on yksi funktio (vanha template kutsuu sitä)', () => {
    const lahde = readFileSync(join(juuri, 'TalentMaster_Master_v16.html'), 'utf8'); expect((lahde.match(/\$\{_mStatsHTML\(stats\)\}/g) || [])).toHaveLength(1); expect(lahde).toContain('_mStatsHTML(o.stats)');
    expect(lahde.slice(lahde.indexOf('function _ktNayttoHTML'), lahde.indexOf('function _ktPolkuHTML'))).not.toMatch(/localStorage|\.get\(\)|collection\(/);
  });
});

function vpSivu(extra) { return lataaSivu('TalentMaster_VP_v25.html', Object.assign({ _seuraId: '', _isDemoMode: true, _currentWs: 'x', _vpRooli: 'vp', _vpSA: false, db: { collection: () => { throw new Error('luku!'); } } }, extra || {})); }
describe('V4b-1 VP: Näyttö = vanhan modaalin lohkot (hL, Mittaus, Arviointi, Kasvu) samalla koodilla; sisältö löytyy sellaisenaan vanhasta modaalista', () => {
  for (const k of Object.keys(VP_PELAAJAT)) it('pelaaja "' + k + '": vainOsat-lohkot ovat täsmälleen vanhan modaalin (baseline) osia + Näyttö kokoaa ne ilman modaalia', () => {
    const c = vpSivu(); const p = JSON.parse(JSON.stringify(VP_PELAAJAT[k])); c._jsvPelaajat = [p]; c.window._jsvPelaajat = [p];
    const o = c._vpKorttiRakenna(p, p.joukkue, 0, 1, true);
    for (const n of ['hL', 'mittausHTML', 'arviointiHTML', 'kasvuHTML']) { expect(typeof o[n], n).toBe('string'); expect(o[n].length, n).toBeGreaterThan(20); expect(BASEVP[k], n).toContain(o[n]); }
    const h = c._ktNayttoHTML(p); for (const n of ['hL', 'mittausHTML', 'arviointiHTML', 'kasvuHTML']) expect(h, n).toContain(o[n]);
    expect(jarj(h, 'Perustiedot ja 5D-profiili', 'Kasvu ja kypsyys', 'Mittaukset', 'Pelihavainnot ja arviointi')).toBe(true);
    expect(h).toContain('id="_jspTab1"'); expect(h).toContain('id="_jspTab5"'); expect(h).toContain('id="_jspMittausLista"'); expect(h).toContain('id="_jspKypsyys"'); expect(h).not.toContain('_jspModal');
  });
  it('vainOsat ei kirjoita DOMiin eikä avaa modaalia; Näytön rakennus tekee vain Arviointi-osion omat lataukset; hydratointi tekee YHDEN testitulokset-luvun eikä lataa viikkoa', () => {
    let luvut = [], viikko = 0, append = 0; const polku = [];
    const mock = { collection: (c) => { polku.push(c); return mock; }, doc: (d) => { polku.push(d); return mock; }, get: () => { luvut.push(polku.join('/')); return { then: () => ({ catch: () => {} }) }; } };
    const c = vpSivu({ _isDemoMode: false, _seuraId: 'kpv', db: mock, _vpViikkoLataa: () => { viikko++; } }); c.document.body = { appendChild: () => { append++; }, style: {} };
    const p = JSON.parse(JSON.stringify(VP_PELAAJAT.rikas)); c._ktNayttoHTML(p); expect(append).toBe(0);
    expect(luvut.length).toBeGreaterThan(0); expect(luvut.every((l) => /konfiguraatio\/arviointi|arviointikerrat|valmennuslinja\/teemat/.test(l))).toBe(true);   // vain Arviointi-osion omat lataukset (vanhan Arviointi-välilehden luvut) — ei testituloksia, ei viikkoa
    luvut.length = 0; polku.length = 0; c._vpKorttiHydratoi({ querySelector: () => null }, p, 13, { viikko: false }); expect(luvut).toHaveLength(1); expect(luvut[0]).toMatch(/testitulokset$/); expect(viikko).toBe(0);
  });
  it('LATAUSJAKO VP: Näyttö rakennetaan vasta kun välilehti on avattu', () => {
    const c = vpSivu(); let n = 0; const orig = c._vpKorttiRakenna; c._vpKorttiRakenna = function () { n++; return orig.apply(this, arguments); };
    const p = JSON.parse(JSON.stringify(VP_PELAAJAT.minimi)); c._pelaajat = [p]; c._jsvPelaajat = [p]; c.window._jsvPelaajat = [p]; c._ktS.pid = p.id; c._ktS.valilehti = 'tanaan'; c._ktS.ladattu = { polku: false, naytto: false };
    const t = c._ktKehys(p); expect(n).toBe(0); expect(t).not.toContain('data-kt-nayttö'); c._ktS.ladattu.naytto = true; const a = c._ktKehys(p); expect(n).toBe(1); expect(a).toContain('data-kt-nayttö');
  });
});
