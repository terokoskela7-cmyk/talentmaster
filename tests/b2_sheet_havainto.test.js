/* Kehitystyöpöytä 22 · B2 — lib/tm_sheet.js (D100) + lib/tm_kt_havainto.js (yksi napautus, lause, Kumoa) + tmKtTallennaOsaArvio:n Kumoa/lause. Sheetin käyttäytyminen selaimessa: tests/kt_sivu_selain.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SH = require('../lib/tm_sheet.js'), HV = require('../lib/tm_kt_havainto.js'), KT = require('../lib/tm_kehitystyopoyta.js'), KS = require('../lib/tm_kehityssilmukka.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const OSA = { k: 'a', koodi: 'k1', nimi: 'Katse ylös', havainnot: [{ uid: 'u1', arvo: 2, pvm: '2026-10-01', rooli: 'valmentaja', lause: 'Hyvä' }] };
describe('tm_sheet', () => {
  it('kehys: lyhyt/pitkä luokka, dialog-rooli + aria-modal, ‹ Sulje, luonnosmerkki ja Hylkää vain kun luonnos', () => {
    const l = SH.tmSheetKehysHTML({ id: 'x', tyyppi: 'lyhyt', otsikko: 'Otsikko' }), p = SH.tmSheetKehysHTML({ id: 'y', tyyppi: 'pitka', otsikko: 'O', luonnos: true });
    expect(l).toContain('ts-lyhyt'); expect(l).toContain('role="dialog" aria-modal="true"'); expect(l).toContain('‹ Sulje'); expect(l).not.toContain('data-ts-luonnos'); expect(l).not.toContain('data-ts-hylkaa');
    expect(p).toContain('ts-pitka'); expect(p).toContain('Luonnos säilytetty'); expect(p).toContain('Hylkää luonnos'); expect(SH.tmSheetKehysHTML({ id: '<x>', otsikko: '<b>' })).not.toContain('<b>');
  });
  it('CSS: vain tokenit (ei hex/rgb), yksi @media 720, 390 pitkä = koko ruutu, työpöytä pitkä ≤ 680 / lyhyt ≤ 540', () => {
    const c = SH.tmSheetCss(); expect(c).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/); expect((c.match(/@media/g) || []).length).toBe(2); expect(c).toMatch(/max-width:720px\)\{\.ts-pitka \.ts-paneeli\{max-height:none;height:100%/); expect(c).toContain('max-width:540px'); expect(c).toContain('max-width:680px');
  });
  it('hallinta ilman DOMia ei kaadu (doc puuttuu → false)', () => { const h = SH.tmSheetHallinta({}); expect(h.avaa({ id: 'x' })).toBe(false); expect(h.luonnokset()).toEqual([]); expect(h.avoinna()).toBeNull(); });
});
describe('tm_kt_havainto', () => {
  it('lause: tyhjä ok, ≤ 140 ok, 141 ✗, KIELLETYT-sanat ✗ (voi päätyä pelaajalle §7.22)', () => {
    expect(HV.tmKtLauseKelpaa('').ok).toBe(true); expect(HV.tmKtLauseKelpaa('x'.repeat(140)).ok).toBe(true); expect(HV.tmKtLauseKelpaa('x'.repeat(141))).toMatchObject({ ok: false, syy: 'pitka' });
    for (const s of ['Tämä on heikkous', 'rajoite', 'kriittinen kohta']) expect(HV.tmKtLauseKelpaa(s), s).toMatchObject({ ok: false, syy: 'kielletty' }); expect(HV.tmKtLauseKelpaa('Katsoi hyvin ylös').ok).toBe(true);
  });
  it('inline: kolme nappia (yksi napautus tallentaa) + "+ Lause tai klippi"; oma aiempi valinta korostettu; avaaja-id pid+koodi; puuttuva funktio → virhe (ei hiljaa rikkinäistä onclickiä)', () => {
    const h = HV.tmKtHavaintoInlineHTML({ osa: OSA, avain: 'kons', uid: 'u1' }, { pid: 'p1', tallennaFn: '_t', lisaFn: '_l' });
    expect(h.match(/data-kt-havainto-arvo="\d"/g)).toHaveLength(3); expect(h).toContain('onclick="_t(&quot;p1&quot;,&quot;kons&quot;,&quot;k1&quot;,2)"'); expect(h).toContain('data-ts-avaaja="havainto_p1_k1"'); expect(h).toContain('Yksi napautus tallentaa');
    expect(h).toMatch(/class="kt-btn" data-kt-havainto-arvo="2"/); expect(h).toMatch(/class="kt-btn q" data-kt-havainto-arvo="1"/);
    expect(() => HV.tmKtHavaintoInlineHTML({ osa: OSA, avain: 'kons' }, { pid: 'p1', tallennaFn: '_t' })).toThrow(/onclick-argumentti/); expect(HV.tmKtHavaintoInlineHTML({ osa: null }, {})).toBe('');
  });
  it('alasheetin runko: radio-valinta (oma aiempi valittuna), lause ≤ 140 (maxlength), VEO vain kun veoFn; arvot escapataan; lukija', () => {
    const h = HV.tmKtHavaintoSheetHTML({ osa: Object.assign({}, OSA, { nimi: '<i>' }), avain: 'kons', uid: 'u1' }, { pid: 'p1', tallennaFn: '_t', veoFn: '_v' });
    expect(h).toContain('name="ktHavArvo" value="2" checked'); expect(h).toContain('maxlength="140"'); expect(h).toContain('data-kt-havainto-veo'); expect(h).not.toContain('<i>'); expect(h).toContain('>Hyvä</textarea>');
    expect(HV.tmKtHavaintoSheetHTML({ osa: OSA, avain: 'k', uid: 'zz' }, { pid: 'p1', tallennaFn: '_t' })).not.toContain('data-kt-havainto-veo');
    expect(HV.tmKtHavaintoLukuSheetista((n) => ({ ktHavArvo: '3', ktHavLause: '  hyvä  ' }[n]))).toEqual({ arvo: 3, lause: 'hyvä' }); expect(HV.tmKtHavaintoLukuSheetista(() => '')).toEqual({ arvo: null, lause: '' });
  });
  it('lib ei sisällä hex/rgb-värejä', () => { expect(lue('lib/tm_kt_havainto.js') + lue('lib/tm_sheet.js')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/); });
});
describe('tmKtTallennaOsaArvio: lause + Kumoa', () => {
  const mk = (jf, rooli, uid) => {
    const kirj = [], vk = []; let kumoa = null, naytetty = 0, ilm = [];
    const _s = (u) => { const o = {}, v = {}; Object.keys(u).forEach((k) => { (/osa_havainnot_vk/.test(k) ? v : o)[k] = u[k]; }); return [o, v]; };   // B2c: viikkohistoria-polut erillään (vanhat odotukset koskevat nykytilaa)

    const p = { id: 'p1', jaksofokus: JSON.parse(JSON.stringify(jf)) };
    const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ update: async (u) => { const [o, v] = _s(u); kirj.push(o); vk.push(v); } }) }) }) }) };
    const cu = { uid, getIdToken: async () => 't', getIdTokenResult: async () => ({ claims: { rooli } }) };
    const d = { db, sid: 's', auth: () => cu, KS, rooli, uid, nyt: () => new Date(2026, 9, 19), eiToastia: true, poista: 'DEL', kumoaFn: (f) => { kumoa = f; }, toast: (m) => ilm.push(m), nayta: () => { naytetty++; }, t: (k) => k };
    return { p, d, kirj, vk, kumoa: () => kumoa, naytetty: () => naytetty, ilm };
  };
  const JF = { konsepti_avain: 'kons', alkoi: '2026-10-05T08:00:00', kesto_vk: 6, osa_havainnot: {}, osa_arviot: {} };
  it('lause tallentuu omaan riviin (trimmattuna); ilman lausetta ei lause-kenttää; eiToastia → ei oma toast', async () => {
    const a = mk(JF, 'valmentaja', 'u1'); expect(await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2, '  Hyvä  ')).toBe(true);
    const P = 'jaksofokus.osa_havainnot.kons.k1.u1.'; expect(a.kirj[0][P + 'arvo']).toBe(2); expect(a.kirj[0][P + 'pvm']).toBe('2026-10-19'); expect(a.kirj[0][P + 'rooli']).toBe('valmentaja'); expect(a.kirj[0][P + 'lause']).toBe('Hyvä'); expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1).toEqual({ arvo: 2, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Hyvä' }); expect(a.ilm).toEqual([]);
    const b = mk(JF, 'valmentaja', 'u1'); await KT.tmKtTallennaOsaArvio(b.d, b.p, 'kons', 'k1', 3); expect(Object.keys(b.kirj[0]).filter((k) => /\.lause$/.test(k))).toEqual([]); expect(b.p.jaksofokus.osa_havainnot.kons.k1.u1.lause).toBeUndefined();
  });
  it('Kumoa: ei aiempaa → oma rivi + voimassa oleva arvo poistetaan; paikallinen tila palaa; kirjoitus vain oikeaan polkuun', async () => {
    const a = mk(JF, 'valmentaja', 'u1'); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2); expect(a.p.jaksofokus.osa_arviot.kons.k1).toBe(2);
    expect(await a.kumoa()()).toBe(true); expect(a.kirj[1]).toEqual({ 'jaksofokus.osa_havainnot.kons.k1.u1': 'DEL', 'jaksofokus.osa_arviot.kons': 'DEL' });
    expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1).toBeUndefined(); expect(a.p.jaksofokus.osa_arviot.kons).toBeUndefined();
  });
  it('Kumoa: aiempi oma rivi + aiempi arvokartta palautetaan täsmälleen', async () => {
    const jf = Object.assign({}, JF, { osa_havainnot: { kons: { k1: { u1: { arvo: 1, pvm: '2026-10-01', rooli: 'valmentaja' } } } }, osa_arviot: { kons: { k1: 1, k2: 3 } } });
    const a = mk(jf, 'valmentaja', 'u1'); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 3, 'Uusi'); expect(a.p.jaksofokus.osa_arviot.kons).toEqual({ k1: 3, k2: 3 });
    await a.kumoa()(); expect(a.kirj[1]).toEqual({ 'jaksofokus.osa_havainnot.kons.k1.u1.arvo': 1, 'jaksofokus.osa_havainnot.kons.k1.u1.pvm': '2026-10-01', 'jaksofokus.osa_havainnot.kons.k1.u1.rooli': 'valmentaja', 'jaksofokus.osa_havainnot.kons.k1.u1.lause': 'DEL', 'jaksofokus.osa_arviot.kons': { k1: 1, k2: 3 } }); expect(a.p.jaksofokus.osa_arviot.kons).toEqual({ k1: 1, k2: 3 }); expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1.lause).toBeUndefined();
  });
  it('VP ei korvaa valmentajan arviota — eikä Kumoa kirjoita sitä: vain VP:n oma rivi poistetaan', async () => {
    const jf = Object.assign({}, JF, { osa_havainnot: { kons: { k1: { valm: { arvo: 2, pvm: '2026-09-20', rooli: 'valmentaja' } } } }, osa_arviot: { kons: { k1: 2 } } });
    const a = mk(jf, 'vp', 'vp1'); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 3); expect(Object.keys(a.kirj[0]).every((k) => k.indexOf('jaksofokus.osa_havainnot.kons.k1.vp1.') === 0)).toBe(true); expect(Object.keys(a.kirj[0]).some((k) => /osa_arviot/.test(k))).toBe(false); await a.kumoa()(); expect(a.kirj[1]).toEqual({ 'jaksofokus.osa_havainnot.kons.k1.vp1': 'DEL' }); expect(a.p.jaksofokus.osa_arviot.kons.k1).toBe(2);
  });
  it('B2b · NAPAUTUS EI PYYHI LAUSETTA: aiempi lause säilyy; kirjoitus sisältää vain arvo, pvm, rooli; Kumoa palauttaa vain arvon (pvm, rooli) eikä koske lauseeseen', async () => {
    const jf = Object.assign({}, JF, { osa_havainnot: { kons: { k1: { u1: { arvo: 1, pvm: '2026-10-01', rooli: 'valmentaja', lause: 'Katsoi hyvin ylös' } } } }, osa_arviot: { kons: { k1: 1 } } });
    const a = mk(jf, 'valmentaja', 'u1'); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 3);
    expect(Object.keys(a.kirj[0]).sort()).toEqual(['jaksofokus.osa_arviot.kons', 'jaksofokus.osa_havainnot.kons.k1.u1.arvo', 'jaksofokus.osa_havainnot.kons.k1.u1.pvm', 'jaksofokus.osa_havainnot.kons.k1.u1.rooli']);   // ei .lause, ei koko rivin korvausta
    expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1).toEqual({ arvo: 3, pvm: '2026-10-19', rooli: 'valmentaja', lause: 'Katsoi hyvin ylös' });
    await a.kumoa()(); expect(Object.keys(a.kirj[1]).some((k) => /\.lause$/.test(k))).toBe(false); expect(a.kirj[1]['jaksofokus.osa_havainnot.kons.k1.u1.arvo']).toBe(1);
    expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1).toEqual({ arvo: 1, pvm: '2026-10-01', rooli: 'valmentaja', lause: 'Katsoi hyvin ylös' });
  });
  it('B2b · lauseen kanssa tallennus + Kumoa palauttaa myös lauseen (aiempi lause takaisin / pois)', async () => {
    const jf = Object.assign({}, JF, { osa_havainnot: { kons: { k1: { u1: { arvo: 1, pvm: '2026-10-01', rooli: 'valmentaja', lause: 'Vanha' } } } }, osa_arviot: { kons: { k1: 1 } } });
    const a = mk(jf, 'valmentaja', 'u1'); await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2, 'Uusi'); expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1.lause).toBe('Uusi');
    await a.kumoa()(); expect(a.kirj[1]['jaksofokus.osa_havainnot.kons.k1.u1.lause']).toBe('Vanha'); expect(a.p.jaksofokus.osa_havainnot.kons.k1.u1.lause).toBe('Vanha');
    const b = mk(JF, 'valmentaja', 'u1'); await KT.tmKtTallennaOsaArvio(b.d, b.p, 'kons', 'k1', 2, 'Vain uusi'); await b.kumoa()(); expect(b.kirj[1]).toEqual({ 'jaksofokus.osa_havainnot.kons.k1.u1': 'DEL', 'jaksofokus.osa_arviot.kons': 'DEL' });
  });
  it('ilman kumoaFn-kutsujaa (Master/VP vanha näkymä) käytös ennallaan: oma toast "Osa-arvio tallennettu ✓"; sisäkkäinen konsepti-avain (piste) ei tarjoa Kumoa:a', async () => {
    const a = mk(JF, 'valmentaja', 'u1'); delete a.d.kumoaFn; delete a.d.eiToastia; a.d.viesti = 'Tallennettu'; await KT.tmKtTallennaOsaArvio(a.d, a.p, 'kons', 'k1', 2); expect(a.ilm).toEqual(['Tallennettu ✓']); expect(a.kumoa()).toBeNull();
    const b = mk(Object.assign({}, JF, { konsepti_avain: 'a.b' }), 'valmentaja', 'u1'); await KT.tmKtTallennaOsaArvio(b.d, b.p, 'a.b', 'k1', 2); expect(b.kumoa()).toBeNull();
  });
});
describe('Tänään inline-tila vs. vanha paneeli', () => {
  const tila = { tila: 'kaynnissa', ensisijainen: { avain: 'havainto', teksti: 'x' }, valikko: [], rivitila: { teksti: '' } };
  const p = { id: 'p1', etunimi: 'A', joukkue: 'J', jaksofokus: { konsepti_avain: 'kons', konsepti_nimi: 'H', alkoi: '2026-10-01T08:00:00', kesto_vk: 6, osa_arviot: {} } };
  const kaanon = () => ({ kpi: [{ koodi: 'k1', teksti: 'Katse ylös: nimi tässä selitys pidempi' }, { koodi: 'k2', teksti: 'Toinen: nimi tässä selitys pidempi' }] });
  const ctx = (o) => Object.assign({ esc: (s) => String(s), t: (k) => k, hk: KT.tmKtHk, toimiFn: '_toimi', osaFn: '_osa', tallennaFn: '_tall', lisaFn: '_lisaa', veoFn: '_veo', peruFn: '_peru', paneeli: true, voiKirjoittaa: true, rooli: 'valmentaja', uid: 'u1', nimet: () => '', kaanon, tanaan: '2026-10-19', sigCtx: { nyt: new Date(2026, 9, 19), askel: { avain: 'havainto', tila: 'toimenpide', peruste: { paivia: 18 } }, profiili: 'oto', nimi: 'A' } }, o || {});
  it('inline:true + signaali "havainto" → napit suoraan kortissa, "Merkitse havainto" -nappi piilossa; ilman inline-lippua vanha käytös (nappi, paneeli vasta avattaessa)', () => {
    const i = KT.tmKtTanaanKoko(p, tila, ctx({ inline: true })); expect(i).toContain('data-kt-havainto-inline'); expect(i).not.toContain('data-kt-signaali-nappi="havainto"'); expect(i.match(/data-kt-havainto-arvo=/g)).toHaveLength(3);
    const v = KT.tmKtTanaanKoko(p, tila, ctx({})); expect(v).not.toContain('data-kt-havainto-inline'); expect(v).toContain('data-kt-signaali-nappi="havainto"');
  });
  it('inline vain kirjoittajalle: voiKirjoittaa=false → ei nappeja', () => { const h = KT.tmKtTanaanKoko(p, tila, ctx({ inline: true, voiKirjoittaa: false })); expect(h).not.toContain('data-kt-havainto-inline'); expect(h).not.toContain('data-kt-havainto-arvo'); });
});

describe('B2b · toastin ajastin: pysähtyy hiiren/fokuksen ajaksi (a11y)', () => {
  const H = require('../lib/tm_kt_havainto.js');
  function mk() {
    const kuuntelijat = {}, el = { addEventListener: (n, f) => { kuuntelijat[n] = f; } };
    const ajat = []; let nro = 0; const ajastus = { set: (f, ms) => { const id = ++nro; ajat.push({ id, f, ms, elossa: true }); return id; }, clear: (id) => { ajat.find((a) => a.id === id).elossa = false; } };
    let valmis = 0; const a = H.tmKtToastAjastin(el, 5000, () => { valmis++; }, ajastus);
    return { kuuntelijat, ajat, a, valmis: () => valmis, laukaise: () => { const t = ajat.filter((x) => x.elossa).pop(); if (t) { t.elossa = false; t.f(); } } };
  }
  it('ilman vuorovaikutusta toast sulkeutuu 5 s jälkeen', () => { const m = mk(); expect(m.ajat[0].ms).toBe(5000); m.laukaise(); expect(m.valmis()).toBe(1); });
  it('hiiri toastin päällä pysäyttää ajastimen; poistuminen käynnistää täyden 5 s uudelleen', () => {
    const m = mk(); m.kuuntelijat.mouseenter(); expect(m.ajat.filter((x) => x.elossa).length).toBe(0); m.laukaise(); expect(m.valmis()).toBe(0);
    m.kuuntelijat.mouseleave(); const uusi = m.ajat.filter((x) => x.elossa); expect(uusi.length).toBe(1); expect(uusi[0].ms).toBe(5000); m.laukaise(); expect(m.valmis()).toBe(1);
  });
  it('fokus Kumoa-napissa pysäyttää; fokuksen poistuessa jatkuu; hiiri+fokus yhdessä: jatkuu vasta kun kumpikaan ei ole päällä', () => {
    const m = mk(); m.kuuntelijat.focusin(); expect(m.ajat.filter((x) => x.elossa).length).toBe(0);
    m.kuuntelijat.mouseenter(); m.kuuntelijat.focusout(); expect(m.ajat.filter((x) => x.elossa).length).toBe(0); m.kuuntelijat.mouseleave(); expect(m.ajat.filter((x) => x.elossa).length).toBe(1);
  });
  it('peru() lopettaa lopullisesti (ei sulkua jälkeenpäin)', () => { const m = mk(); m.a.peru(); m.kuuntelijat.mouseleave(); expect(m.ajat.filter((x) => x.elossa).length).toBe(0); expect(m.valmis()).toBe(0); });
});

describe('B2c · merkintälista ja "arviot eroavat" (v2): havaintonapin sanat + tekijän rooli; tila-sanasto vain tila-sarakkeessa', () => {
  const O = { havainnot: [{ uid: 'u1', arvo: 1, pvm: '2026-10-14', rooli: 'valmentaja' }, { uid: 'u2', arvo: 3, pvm: '2026-10-09', rooli: 'vp' }, { uid: 'u3', arvo: 2, pvm: '2026-10-08', rooli: 'super_admin' }] };
  const pvm = (x) => x.slice(8) + '.' + x.slice(5, 7) + '.';
  it('v2: "ei vielä · valmentaja 14.10.", "itsenäisesti · VP 9.10.", "ohjatusti · SA 8.10." — rooli joka merkinnässä (myös ylläpito); eroavat-lista samat sanat', () => {
    const m = KT.tmKtOsaMeta(O, { v2: true, pvmFn: pvm });
    expect(m.meta).toBe('ei vielä · valmentaja 14.10.'); expect(m.kaikki).toEqual(['ei vielä · valmentaja 14.10.', 'itsenäisesti · VP 9.10.', 'ohjatusti · SA 8.10.']); expect(m.eroavat).toBe(true);
    m.kaikki.forEach((x) => { expect(x).not.toMatch(/myöhemmin|osaa jo|tällä viikolla/); });
  });
  it('D248-sanaston kautta (uusi sivu): merkinnät pysyvät napin sanoina, vaikka kt_st_*-avaimet kartoittuvat tila-sanastoon (osaa jo / tällä viikolla / myöhemmin) — ne näkyvät vain tila-sarakkeessa', () => {
    const SN = require('../lib/tm_sanasto.js'), t = SN.tmSanastoT((k) => k, { kieli: () => 'fi', fi: Object.assign({}, KT.FI) });
    const html = KT.tmKtOsatHTML({ osat: [{ k: 'a', koodi: 'a', nimi: 'Osa A', tila: 'itsenaisesti', havainnot: O.havainnot }, { k: 'b', koodi: 'b', nimi: 'Osa B', tila: 'ei_viela', havainnot: [O.havainnot[0]] }] }, { v2: true, t, pvmFn: pvm });
    const teksti = html.replace(/<[^>]+>/g, ''); expect(teksti).toContain('ei vielä · valmentaja 14.10.'); expect(teksti).toContain('itsenäisesti · VP 9.10.');
    expect(html).toMatch(/kt-osa-st">✓ osaa jo</); expect(html).toMatch(/kt-osa-st">myöhemmin</);   // tila-sarake: D248-tila-sanasto
    expect(html.replace(/kt-osa-st">[^<]*</g, '')).not.toMatch(/myöhemmin|osaa jo/);   // ei muualla
  });
  it('vanhat näkymät (ilman v2) ennallaan: tila-sanat ja SA ilman roolia', () => {
    const m = KT.tmKtOsaMeta(O, { pvmFn: pvm }); expect(m.meta).toBe('ei vielä · valmentaja 14.10.'); expect(m.kaikki[2]).toBe('ohjatusti · 8.10.');
  });
});
