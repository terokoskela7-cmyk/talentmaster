/**
 * S2 PR 1 — VP_v25 kytkentä (docs/CODE_BRIEF_S2_KOTI.md): Kenttä-lippu (D67) valitsee Kodin; lippu pois → Koti täsmälleen ennallaan (snapshot origin/mainista, tests/fixtures/vp_koti_klassinen.html).
 * Oikeat funktiot ajetaan vm-sandboxissa lähteestä (tests/helpers/vp_koti_sandbox.cjs), ei merkkijonoväitteinä pelkästään.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VP = readFileSync(join(juuri, 'TalentMaster_VP_v25.html'), 'utf8');
const SNAP = readFileSync(join(juuri, 'tests/fixtures/vp_koti_klassinen.html'), 'utf8');
const { luoYmparisto } = require('./helpers/vp_koti_sandbox.cjs');

const J = (nimi, o) => Object.assign({ nimi, ikavaihe: 'rakentaja', tyyppi: 'kilpa', profiili: 'oto', jakso: true, n_pelaajat: 20, n_jaksolla: 20, n_katselmus: 0, n_vastanneet: 16, n_vastausperusta: 20,
  n_katselmus_ajallaan: 0, n_katselmus_perusta: 0, n_suostumus: 18, n_perhe_kuittaus_7: 0, n_harjoite_7: 14, n_harjoite_30: 16 }, o || {});
const VK = ['2026-W39', '2026-W40', '2026-W41', '2026-W42'];
const KS = VK.map((vk, i) => ({ vk, versio: 5, laskettu: { seconds: Date.now() / 1000 - 3600 }, yhteensa: { n_pelaajat: 40, n_suostumus: 30, n_harjoite_7: 20 },
  joukkueet: { a: J('P15 Demo', { jakso: false, n_jaksolla: 0, n_vastanneet: 0, n_vastausperusta: 0 }), b: J('P14 Demo', { n_vastanneet: [16, 14, 12, 10][i] }) } }));

describe('Kenttä-lippu valitsee Kodin (D67)', () => {
  [['lippua ei ole (undefined)', undefined], ['kentta: false', { kentta: false }], ['kentta: "true" (merkkijono ei avaa)', { kentta: 'true' }], ['tyhjä lippudokumentti', {}]].forEach(([nimi, liput]) => {
    it('ilman lippua Koti on täsmälleen ennallaan: ' + nimi, async () => {
      const y = luoYmparisto(VP, { liput, koosteet: KS });
      await y.renderoi();
      expect(y.html).toBe(SNAP);
    });
  });
  it('lippu päällä mutta lib puuttuu → Koti ennallaan (ei kaadu)', async () => {
    const y = luoYmparisto(VP, { liput: { kentta: true }, koosteet: KS, eiPulssia: true }); await y.renderoi(); expect(y.html).toBe(SNAP);
  });
  it('lippu päällä: Koti = Seuran pulssi (D122): aloitusopas · tulkintalause · Tarvitsee huomiota · Joukkueiden viikko · Tulossa 14 pv', async () => {
    const y = luoYmparisto(VP, { liput: { kentta: true }, koosteet: KS, ensimmainenVk: '2026-W20', kalenteri: [{ nimi: 'Ottelu X', alkaa: Date.now() + 2 * 86400000 }] });
    y.ctx.renderKotiVP(); expect(y.html).toContain('Ladataan pulssia…');   // ensin latausrivi, vanha Koti ei välähdä
    await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
    const h = y.html;
    expect(h).toContain('id="vpAloitaKortti"'); expect(h).toContain('class="tmp"'); expect(h).toContain('joukkuetta jaksolla.'); expect(h).toContain('Tarvitsee huomiota'); expect(h).toContain('Joukkueet ikäjärjestyksessä');
    expect(h).toContain('Tulossa 14 päivää'); expect(h).toContain('Ottelu X'); expect(h).toContain('Tänään');
    const jarj = ['id="vpAloitaKortti"', 'class="lead"', 'Tarvitsee huomiota', 'class="pt-wrap"', 'Tulossa 14 päivää'].map((x) => h.indexOf(x)); expect(jarj.every((x, i) => x >= 0 && (i === 0 || x > jarj[i - 1]))).toBe(true);
  });
  it('poistuneet Kodin kortit eivät ole pulssi-Kodissa: Kriittiset signaalit, suppilo, RAE, Sovelluksen käyttö', async () => {
    const y = luoYmparisto(VP, { liput: { kentta: true }, koosteet: KS, ensimmainenVk: '2026-W20' }); await y.renderoi();
    ['Kriittiset signaalit', 'vpkoti-strippi', '<RAE', 'vpKayttoasteKortti', 'Kaikki signaalit yksityiskohtaisesti'].forEach((x) => expect(y.html, x).not.toContain(x));
  });
  it('kooste-luku epäonnistuu (esim. valmentajalla ei lukuoikeutta) → Koti ennallaan ja virhe muistetaan (ei silmukkaa)', async () => {
    const y = luoYmparisto(VP, { liput: { kentta: true }, lukuVirhe: true }); await y.renderoi();
    expect(y.html).toBe(SNAP); expect(y.ctx._vpPulssiVirhe).toEqual({ 'demo-fc': true });
  });
  it('yksi toimenpidelaskuri: pulssi-Kodin signaalimäärä päivittää sivupalkin merkin ja Tilanteen otsikon (sama luku)', async () => {
    const y = luoYmparisto(VP, { liput: { kentta: true }, koosteet: KS, ensimmainenVk: '2026-W20' });
    y.els['sb-tilanne-badge'] = { textContent: '', style: {} }; y.els['greeting-status'] = { textContent: '1 vaatii toimenpidettä' }; y.els['signaalit-meta'] = { textContent: 'Ei kriittisiä' };
    await y.renderoi();
    const n = y.ctx._vpPulssi.malli.signaalejaYht; expect(n).toBe(2);   // P15 ei jaksoa 4 vk + P14 katsaus laskenut
    expect(y.els['sb-tilanne-badge'].textContent).toBe(2); expect(y.els['greeting-status'].textContent).toBe('2 vaatii toimenpidettä'); expect(y.els['signaalit-meta'].textContent).toBe('2 vaatii toimenpidettä');
  });
  it('lippu päällä, ei koosteita → odotustila (ei virhettä)', async () => {
    const y = luoYmparisto(VP, { liput: { kentta: true }, koosteet: [] }); await y.renderoi(); expect(y.html).toContain('Pulssi alkaa kertyä');
  });
  it('katselmusikkunan päivät pelaajadatasta: jakso päättynyt + 14 pv, joukkueen pienin', async () => {
    const nyt = Date.now(), pv = (n) => new Date(nyt + n * 86400000).toISOString();
    const y = luoYmparisto(VP, { liput: { kentta: true }, pelaajat: [
      { joukkueet: ['b'], jaksofokus: { konsepti_avain: 'k', alkoi: pv(-34), kesto_vk: 4 } },     // päättyi 6 pv sitten → ikkuna 8 pv
      { joukkueet: ['b'], jaksofokus: { konsepti_avain: 'k', alkoi: pv(-30), kesto_vk: 4 } },     // päättyi 2 pv sitten → ikkuna 12 pv
      { joukkueet: ['b'], jaksofokus: { konsepti_avain: 'k', alkoi: pv(-5), kesto_vk: 8 } }] });   // käynnissä → ei
    expect(y.ctx._vpKatselmusPv()).toEqual({ b: 8 });
  });
});

describe('jaksoviikko ja seuraava katselmusikkuna (mockup 23)', () => {
  it('"vk 3/6": joukkuedokumentin jaksofokus.alku + kesto_vk; päättynyt/tuleva jakso ei', () => {
    const nyt = Date.now(), pv = (n) => new Date(nyt + n * 86400000).toISOString().slice(0, 10);
    const y = luoYmparisto(VP, { liput: { kentta: true }, joukkueDocs: [{ id: 'a', jaksofokus: { alku: pv(-15), kesto_vk: 6 } }, { id: 'b', jaksofokus: { alku: pv(-60), kesto_vk: 6 } }, { id: 'c', jaksofokus: { alku: pv(3), kesto_vk: 6 } }, { id: 'd' }] });
    expect(y.ctx._vpJaksoVk()).toEqual({ a: { vk: 3, N: 6 } });
  });
  it('seuraava katselmusikkuna: lähin tuleva jakson päättyminen, joukkueen nimellä', () => {
    const nyt = Date.now(), pv = (n) => new Date(nyt + n * 86400000).toISOString();
    const y = luoYmparisto(VP, { liput: { kentta: true }, joukkueNimet: { a: 'P17 Demo', b: 'P12 Demo' }, pelaajat: [{ joukkueet: ['a'], jaksofokus: { konsepti_avain: 'k', alkoi: pv(-18), kesto_vk: 4 } }, { joukkueet: ['b'], jaksofokus: { konsepti_avain: 'k', alkoi: pv(-5), kesto_vk: 8 } }] });
    expect(y.ctx._vpSeuraavaKatselmus()).toEqual({ nimi: 'P17 Demo', pv: 10 });
  });
});

describe('kytkentä lähteessä', () => {
  it('lib ladataan ennen käyttöä; Kenttä-lippu esiladataan sisäänkirjautuessa; ei kovakoodattuja värejä lisätty', () => {
    expect(VP).toContain('<script src="lib/tm_seuran_pulssi.js?v=1"></script>');
    expect(VP.indexOf('tm_seuran_pulssi.js')).toBeLessThan(VP.indexOf('function renderKotiVP('));
    expect(VP).toMatch(/lataaSeurantaKuittaukset\(\), _vpLataaLiput\(\)\.catch\(function \(\) \{ return \{\}; \}\)\]\)/);
  });
  it('Tilanne: "04 Joukkueiden pulssi" → "Mittaustilanne" (D120); RAE ja Sovelluksen käyttö siirtyvät Tilanteeseen vain lippuseuroille', () => {
    expect(VP).toContain('data-i18n-html="Mittaustilanne">Mittaus<em>tilanne</em>'); expect(VP).not.toContain('data-i18n-html="Joukkueiden pulssi"');
    expect(VP).toContain('function _vpTilanneSiirrot('); expect(VP).toMatch(/lp && lp\.kentta === true\) _vpTilanneSiirrot\(sisalto\)/);
    expect(VP).toContain("vpT('Syntymäkvartaalit')");
  });
  it('kuori pysyy kasvukatossa (R0): kytkentä, ei logiikkaa — rivit < katto', () => {
    const katot = JSON.parse(readFileSync(join(juuri, 'tests/fixtures/kuoret_kasvukatto.json'), 'utf8'));
    expect(VP.split('\n').length).toBeLessThanOrEqual(katot['TalentMaster_VP_v25.html'].katto);
  });
});

describe('PR 2 · Kuittaa / Ensi viikolla (D124)', () => {
  const KS2 = KS;   // P15 ei jaksoa 4 vk (ei_jaksoa|a) + P14 katsaus laskenut (katsaus_laskee|b)
  const alusta = async (extra) => { const y = luoYmparisto(VP, Object.assign({ liput: { kentta: true }, koosteet: KS2, ensimmainenVk: '2026-W20' }, extra || {})); y.els['sb-tilanne-badge'] = { textContent: '', style: {} }; await y.renderoi(); return y; };
  it('jokaisella signaalikortilla yksi täytetty nappi + katkoviivarivillä Kuittaa ja Ensi viikolla', async () => {
    const y = await alusta(); const kortit = y.html.split(/<div class="kt-sig(?: w| n)?" data-signaali=/).slice(1).map((k) => k.split('<div class="sigmore"')[0]);   // yksi pala per signaalikortti (kt-sig-h/-why eivät aloita korttia)
    expect(kortit.length).toBe(2);
    kortit.forEach((k) => { expect((k.match(/class="kt-btn"/g) || []).length).toBe(1); expect(k).toContain('data-kuittaus="kuitattu"'); expect(k).toContain('data-kuittaus="siirretty"'); expect(k).toMatch(/class="kt-sig-second">.*>Kuittaa<\/button><button[^>]*>Ensi viikolla<\/button><\/div>/); });
  });
  it('Kuittaa kirjoittaa oikeat kentät oikeaan polkuun (getIdToken(true) ensin), signaali piiloon, laskuri päivittyy heti', async () => {
    const y = await alusta(); expect(y.ctx._vpPulssi.malli.signaalejaYht).toBe(2);
    await y.ctx._vpPulssiKuittaa('ei_jaksoa|a', 'kuitattu');
    expect(y.o.tokenit).toEqual([true]);
    expect(y.o.kirjoitukset).toHaveLength(1);
    const k = y.o.kirjoitukset[0]; expect(k.polku).toBe('seurat/demo-fc/toimenpiteet/pulssi_ei_jaksoa_a');
    expect(k.data).toMatchObject({ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: 'kuitattu', palaa_vk: null, ehto: 'ei_jaksoa', kuitattu_vk: '2026-W42', kuitattu_pvm: '__palvelinaika', kuitattu_uid: 'vp-uid', luotu: '__palvelinaika' });
    expect(y.html).not.toContain('data-signaali="ei_jaksoa|a"'); expect(y.html).toContain('data-signaali="katsaus_laskee|b"');
    expect(y.ctx._vpPulssi.malli.signaalejaYht).toBe(1); expect(y.els['sb-tilanne-badge'].textContent).toBe(1);   // sama laskuri kolmessa paikassa
    expect(y.o.toastit.pop()).toEqual(['Kuitattu', 'ok']);
  });
  it('Ensi viikolla: tila siirretty + palaa_vk = seuraava viikko (vuodenvaihde: W53 → W01)', async () => {
    const y = await alusta(); await y.ctx._vpPulssiKuittaa('katsaus_laskee|b', 'siirretty');
    expect(y.o.kirjoitukset[0].data).toMatchObject({ tila: 'siirretty', palaa_vk: '2026-W43', signaali: 'katsaus_laskee', joukkue: 'b', kuitattu_vk: '2026-W42' });
    expect(y.html).not.toContain('data-signaali="katsaus_laskee|b"'); expect(y.ctx._vpPulssi.malli.signaalejaYht).toBe(1);
    expect(require('../lib/tm_seuran_pulssi.js').viikkoLisaa('2026-W53', 1)).toBe('2027-W01');
  });
  it('kirjoitus epäonnistuu → toast toimintaohjeella (ei hiljaista epäonnistumista), signaali EI katoa', async () => {
    const y = await alusta({ kirjoitusVirhe: true }); await y.ctx._vpPulssiKuittaa('ei_jaksoa|a', 'kuitattu');
    expect(y.o.toastit.pop()).toEqual(['Kuittaus ei tallentunut — tarkista yhteys ja yritä uudelleen. (ei oikeutta)', 'virhe']);
    expect(y.html).toContain('data-signaali="ei_jaksoa|a"'); expect(y.ctx._vpPulssi.malli.signaalejaYht).toBe(2);
  });
  it('olemassa olevat kuittaukset luetaan latauksessa: siirretty piilossa kunnes palaa_vk, kuitattu piilossa', async () => {
    const y = await alusta({ kuittaukset: [{ tyyppi: 'pulssi', signaali: 'ei_jaksoa', joukkue: 'a', tila: 'siirretty', palaa_vk: '2026-W43' }, { tyyppi: 'pulssi', signaali: 'katsaus_laskee', joukkue: 'b', tila: 'kuitattu', ehto: 'katsaus_laskee', kuitattu_pvm: Date.now() - 20 * 86400000 }] });
    expect(y.html).not.toContain('data-signaali='); expect(y.ctx._vpPulssi.malli.signaalejaYht).toBe(0); expect(y.html).toContain('Ei toimenpiteitä tällä viikolla');
  });
  it('lähteessä: kirjoitus vain olemassa olevaan toimenpiteet-kokoelmaan, ei functions/Rules-muutosta', () => {
    expect(VP).toContain("collection('toimenpiteet').doc(T.tmPulssiKuittausId(s)).set("); expect(VP).not.toMatch(/collection\('asiat'\)/);
  });
});
