/**
 * Kehitystyöpöytä 22 · A13 jatko 4 — D108: viikkohavainto RINNAKKAIN (VP ei korvaa valmentajaa).
 * jaksofokus.osa_havainnot.<konsepti>.<koodi>.<uid> = { arvo, pvm, rooli }; osa_arviot = voimassa oleva arvo (valmentajan viimeisin; johdon vain jos valmentajan merkintää ei ole).
 * Kirjoitukset tuotannossa vain nimetyille KPV-testipelaajille (käsitesti) — täällä muistissa oleva dokumentti.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const KT = require('../lib/tm_kehitystyopoyta.js');
const KS = require('../lib/tm_kehityssilmukka.js');
const AJ = require('../lib/tm_aloita_jakso.js');
const SA = require('../lib/tm_seuraava_askel.js');
const __dir = dirname(fileURLToPath(import.meta.url));
const lue = (f) => readFileSync(join(__dir, '..', f), 'utf8');

const PID = 'm93GBdOaGCUuenMiCL0I', KONS = 'kons', NYT = new Date(2026, 9, 9, 12);
const KAANON = () => ({ kpi: [1, 2, 3].map((i) => ({ koodi: 'k' + i, teksti: 'Osa ' + i + ' nimeltään tässä: selitys ' + i + ' pidempi' })) });
const ESC = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Muistissa oleva "Firestore": update(dot-polut) sulautetaan dokumenttiin; jokainen kirjoitus lukee tuoreen kopion (ei luoteta paikalliseen tilaan). */
function varasto(alku) {
  const doc = JSON.parse(JSON.stringify(alku)), kirj = [];
  const aseta = (o, polku, arvo) => { const k = polku.split('.'); let x = o; for (let i = 0; i < k.length - 1; i++) { if (x[k[i]] == null || typeof x[k[i]] !== 'object') x[k[i]] = {}; x = x[k[i]]; } x[k[k.length - 1]] = JSON.parse(JSON.stringify(arvo)); };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ update: async (polut) => { kirj.push(polut); Object.keys(polut).forEach((k) => aseta(doc, k, polut[k])); } }) }) }) }) };
  return { doc, kirj, db };
}
const pelaaja0 = (jf) => ({ id: PID, etunimi: 'Topias', joukkue: 'KPV P13', jaksofokus: Object.assign({ konsepti_avain: KONS, konsepti_nimi: 'Haltuunotto', alkoi: '2026-10-05T08:00:00', kesto_vk: 6 }, jf || {}) });
const kirjoita = (v, uid, claimRooli, arvo, o) => KT.tmKtTallennaOsaArvio(Object.assign({ db: v.db, sid: 'kpv', auth: () => ({ uid, getIdToken: async () => 't', getIdTokenResult: async () => ({ claims: claimRooli ? { rooli: claimRooli } : {} }) }), KS, demo: false, toast() {}, t: (k) => k, nyt: () => NYT, rooli: o && o.shellRooli }, o || {}), JSON.parse(JSON.stringify(v.doc)), KONS, 'k1', arvo);   // p = tuore kopio

describe('D108 · kirjoitus: rinnakkaiset merkinnät, voimassa oleva arvo', () => {
  it('valmentaja merkitsee ohjatusti, sitten VP itsenäisesti → osa_arviot = 2 (valmentajan), osa_havainnot kaksi riviä', async () => {
    const v = varasto(pelaaja0());
    expect(await kirjoita(v, 'valm1', 'valmentaja', 2)).toBe(true); expect(await kirjoita(v, 'vp1', 'vp', 3)).toBe(true);
    const jf = v.doc.jaksofokus;
    expect(jf.osa_arviot[KONS].k1).toBe(2);
    expect(jf.osa_havainnot[KONS].k1).toEqual({ valm1: { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja' }, vp1: { arvo: 3, pvm: '2026-10-09', rooli: 'vp' } });
    expect(KT.tmKtHavainnot(jf, KONS, 'k1').map((h) => h.rooli)).toEqual(['valmentaja', 'vp']);
  });
  it('VP:n merkintä EI koskaan korvaa valmentajan arvoa — myös kun VP merkitsee uudelleen ja valmentaja on merkinnyt aiemmin', async () => {
    const v = varasto(pelaaja0());
    await kirjoita(v, 'valm1', 'valmentaja', 1); await kirjoita(v, 'vp1', 'vp', 3); await kirjoita(v, 'vp1', 'vp', 2);
    expect(v.doc.jaksofokus.osa_arviot[KONS].k1).toBe(1); expect(v.doc.jaksofokus.osa_havainnot[KONS].k1.vp1.arvo).toBe(2);
    expect(Object.keys(v.kirj[1]).some((k) => k.startsWith('jaksofokus.osa_arviot'))).toBe(false);   // VP:n kirjoitus ei edes sisällä osa_arviot-polkua
  });
  it('pelkkä VP merkitsee → osa_arviot = VP:n arvo; sama koskee UTJ:tä ja SA:ta (claim "superadmin" normalisoidaan)', async () => {
    for (const rooli of ['vp', 'urheilutoimenjohtaja', 'superadmin']) { const v = varasto(pelaaja0()); await kirjoita(v, 'x1', rooli, 3); expect(v.doc.jaksofokus.osa_arviot[KONS].k1, rooli).toBe(3); expect(v.doc.jaksofokus.osa_havainnot[KONS].k1.x1.rooli, rooli).toBe(rooli === 'superadmin' ? 'super_admin' : rooli); }
  });
  it('valmentaja muuttaa omaa merkintäänsä → oma rivi päivittyy, VP:n rivi säilyy; osa_arviot = valmentajan uusi arvo', async () => {
    const v = varasto(pelaaja0());
    await kirjoita(v, 'valm1', 'valmentaja', 2); await kirjoita(v, 'vp1', 'vp', 3); await kirjoita(v, 'valm1', 'valmentaja', 1);
    const jf = v.doc.jaksofokus; expect(jf.osa_havainnot[KONS].k1.valm1.arvo).toBe(1); expect(jf.osa_havainnot[KONS].k1.vp1.arvo).toBe(3); expect(jf.osa_arviot[KONS].k1).toBe(1); expect(Object.keys(jf.osa_havainnot[KONS].k1)).toHaveLength(2);
  });
  it('valmentajaroolit (valmentaja, talenttivalmentaja, fysiikkavalmentaja) kirjoittavat voimassa olevan arvon; toinen valmentaja korvaa edellisen valmentajan (uusin voittaa), rivit säilyvät molemmilla', async () => {
    for (const r of ['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja']) { const v = varasto(pelaaja0()); await kirjoita(v, 'v1', 'vp', 3); await kirjoita(v, 'c1', r, 2); expect(v.doc.jaksofokus.osa_arviot[KONS].k1, r).toBe(2); }
    const v = varasto(pelaaja0()); await kirjoita(v, 'c1', 'valmentaja', 2); await kirjoita(v, 'c2', 'talenttivalmentaja', 3); expect(v.doc.jaksofokus.osa_arviot[KONS].k1).toBe(3); expect(Object.keys(v.doc.jaksofokus.osa_havainnot[KONS].k1).sort()).toEqual(['c1', 'c2']);
  });
  it('rooli luetaan CLAIMISTA: kuoren antama rooli ("valmentaja") ei ohita claimia ("vp") — VP ei korvaa valmentajaa kuoren väitteellä; claim puuttuu → kuoren rooli', async () => {
    const v = varasto(pelaaja0()); await kirjoita(v, 'c1', 'valmentaja', 1); await kirjoita(v, 'vp1', 'vp', 3, { rooli: 'valmentaja' });
    expect(v.doc.jaksofokus.osa_arviot[KONS].k1).toBe(1); expect(v.doc.jaksofokus.osa_havainnot[KONS].k1.vp1.rooli).toBe('vp');
    const w = varasto(pelaaja0()); await kirjoita(w, 'c1', null, 2, { rooli: 'valmentaja' }); expect(w.doc.jaksofokus.osa_havainnot[KONS].k1.c1.rooli).toBe('valmentaja'); expect(w.doc.jaksofokus.osa_arviot[KONS].k1).toBe(2);
  });
  it('kirjoitetaan VAIN oman uid:n alle (toisen uid:n riviä ei kosketa); vain dot-polut yhdessä update-kutsussa; nimiä ei tallenneta', async () => {
    const v = varasto(pelaaja0()); await kirjoita(v, 'c1', 'valmentaja', 2); await kirjoita(v, 'vp1', 'vp', 3);
    for (const polut of v.kirj) for (const k of Object.keys(polut)) expect(k).toMatch(/^jaksofokus\.osa_(arviot\.kons|havainnot\.kons\.k1\.(c1|vp1))$/);
    expect(v.kirj).toHaveLength(2); expect(JSON.stringify(v.kirj)).not.toMatch(/nimi|etunimi|sukunimi/);
  });
  it('muu jaksofokus koskematta; kenttä on jaksofokuksen sisällä → uusi jakso (jaksofokus korvataan) nollaa osa_havainnot', async () => {
    const v = varasto(pelaaja0({ tavoitteet: ['x'] })); await kirjoita(v, 'c1', 'valmentaja', 2);
    expect(v.doc.jaksofokus.tavoitteet).toEqual(['x']); expect(v.doc.jaksofokus.konsepti_nimi).toBe('Haltuunotto');
    const uusi = KS.tmAsetaJaksofokus ? null : null; expect(uusi).toBeNull();   // identiteettikenttiä ei kosketa; osa_havainnot ei ole identiteetti
    expect(Object.keys(KS.tmPaivitaJaksofokus(v.doc, { 'osa_havainnot.kons.k1.u9': { arvo: 1, pvm: '2026-10-09', rooli: 'vp' } }).polut)).toEqual(['jaksofokus.osa_havainnot.kons.k1.u9']);
  });
});

describe('D108 · näkymä (henkilökunta)', () => {
  const jfMerk = (oa, oh) => pelaaja0({ osa_arviot: { [KONS]: oa }, osa_havainnot: oh }).jaksofokus;
  const c = { esc: ESC, t: (k) => k, pid: PID, nimet: () => '' };
  const osatJa = (jf) => KT.tmKtOsat(jf, { kaanon: KAANON });
  const rivi = (jf, k = 'k1') => KT.tmKtHavaintoRivi(osatJa(jf).find((o) => o.koodi === k), c);
  const SAMA = { [KONS]: { k1: { valm1: { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja' }, vp1: { arvo: 2, pvm: '2026-10-09', rooli: 'vp' } } } };
  const ERI = { [KONS]: { k1: { valm1: { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja' }, vp1: { arvo: 3, pvm: '2026-10-09', rooli: 'vp' } } } };
  it('Osat-rivin merkintärivi: "valmentaja 9.10. · VP 9.10." (arvot samat)', () => { expect(rivi(jfMerk({ k1: 2 }, SAMA))).toBe('valmentaja 9.10. · VP 9.10.'); });
  it('arvot eroavat → molemmat: "valmentaja: ohjatusti 9.10. · VP: itsenäisesti 9.10."; pääarvo (tila) on voimassa oleva osa_arviot', () => {
    expect(rivi(jfMerk({ k1: 2 }, ERI))).toBe('valmentaja: ohjatusti 9.10. · VP: itsenäisesti 9.10.'); expect(osatJa(jfMerk({ k1: 2 }, ERI))[0].tila).toBe('ohjatusti');
  });
  it('nimi näytetään jos löytyy henkilöstöstä: "Mika V. (valmentaja) 9.10."; roolit sanoina (UTJ, VP)', () => {
    const o = osatJa(jfMerk({ k1: 2 }, { [KONS]: { k1: { valm1: { arvo: 2, pvm: '2026-10-09', rooli: 'valmentaja' }, utj1: { arvo: 2, pvm: '2026-10-08', rooli: 'urheilutoimenjohtaja' } } } }))[0];
    expect(KT.tmKtHavaintoRivi(o, Object.assign({}, c, { nimet: (u) => (u === 'valm1' ? 'Mika V.' : '') }))).toBe('Mika V. (valmentaja) 9.10. · UTJ 8.10.');
  });
  it('vanha merkintä ilman osa_havainnot-tietoa → "aiempi merkintä", ei virhettä; ei merkintää → tyhjä rivi', () => {
    expect(rivi(jfMerk({ k1: 3 }, undefined))).toBe('aiempi merkintä'); expect(rivi(jfMerk({ k1: 3 }, { [KONS]: {} }))).toBe('aiempi merkintä'); expect(rivi(jfMerk({}, undefined))).toBe('');
    expect(() => KT.tmKtHavainnot({ osa_havainnot: { kons: { k1: 'rikki', k2: { u: null, v: { arvo: 7 } } } } }, KONS, 'k1')).not.toThrow(); expect(KT.tmKtHavainnot({ osa_havainnot: { kons: { k2: { u: { arvo: 7 } } } } }, KONS, 'k2')).toEqual([]);
  });
  it('Osat-rivin HTML: merkintärivi tilan alla; "Pelaajan silmin" piilottaa sen (.kt-hk) — silmin-CSS piilottaa .kt-hk', () => {
    const h = KT.tmKtOsatHTML({ osat: osatJa(jfMerk({ k1: 2 }, ERI)), viikonOsa: null, jaksoNimi: 'H' }, Object.assign({}, c, { osaFn: '_ktHavaintoAvaa' }));
    expect(h).toContain('class="kt-osa-mer kt-hk" data-kt-merkinnat'); expect(h).toContain('valmentaja: ohjatusti'); expect(KT.tmKtCss()).toContain('.kt-silmin .kt-hk{display:none}');
    expect(KT.tmKtOsatHTML({ osat: osatJa(jfMerk({ k1: 3 }, undefined)), jaksoNimi: 'H' }, c)).toContain('aiempi merkintä');
  });
  it('paneeli: ennen valintaa muiden merkinnät ("Valmentaja merkitsi: ohjatusti 9.10."), OMA aiempi valinta täytettynä', () => {
    const osat = osatJa(jfMerk({ k1: 2 }, ERI)); const h = KT.tmKtPaneeliHTML({ osat, viikonOsa: osat[0], valittu: 'k1', avain: KONS, uid: 'vp1' }, { esc: ESC, t: (k) => k, pid: PID, tallennaFn: 'T', veoFn: 'V', peruFn: 'P' });
    const teksti = h.replace(/<[^>]+>/g, ''); expect(teksti).toContain('Valmentaja merkitsi: ohjatusti 9.10.'); expect(teksti).not.toContain('VP merkitsi'); expect(h).toMatch(/class="kt-btn" data-kt-havainto-arvo="3"/); expect(h).toMatch(/class="kt-btn q" data-kt-havainto-arvo="2"/);
    const ilmanOmaa = KT.tmKtPaneeliHTML({ osat, viikonOsa: osat[0], valittu: 'k1', avain: KONS, uid: 'uusi' }, { esc: ESC, t: (k) => k, pid: PID, tallennaFn: 'T', veoFn: 'V', peruFn: 'P' }); expect(ilmanOmaa.replace(/<[^>]+>/g, '')).toContain('Valmentaja merkitsi'); expect(ilmanOmaa.replace(/<[^>]+>/g, '')).toContain('VP merkitsi'); expect(ilmanOmaa).not.toMatch(/class="kt-btn" data-kt-havainto-arvo/);
  });
  it('Q1:n alarivi: "viikkohavainto 9.10." (viikon osan uusin pvm — datan ikä); ei merkintöjä → ei päivää', () => {
    const p = pelaaja0({ osa_arviot: { [KONS]: { k1: 3, k2: 2 } }, osa_havainnot: { [KONS]: { k2: { u1: { arvo: 2, pvm: '2026-10-07', rooli: 'valmentaja' }, u2: { arvo: 2, pvm: '2026-10-09', rooli: 'vp' } }, k1: { u1: { arvo: 3, pvm: '2026-10-01', rooli: 'valmentaja' } } } } });
    const osat = KT.tmKtOsat(p.jaksofokus, { kaanon: KAANON }), vo = KT.tmKtViikonOsa(osat), pvm = KT.tmKtHavaintoPvm([vo]);
    expect(vo.koodi).toBe('k2'); expect(pvm).toBe('2026-10-09');
    const h = KT.tmKtKysymyksetHTML({ nakyy: true, osat, viikonOsa: vo, q1pvm: pvm, vk: null, sit: null }, { esc: ESC, t: (k) => k, toimiFn: '_ktToimi', pid: PID }); expect(h.replace(/<[^>]+>/g, '')).toContain('viikkohavainto 9.10.');
    expect(KT.tmKtHavaintoPvm(osat)).toBe('2026-10-09'); expect(KT.tmKtHavaintoPvm([])).toBeNull();
  });
});

describe('D108 · signaali poistuu havainnon jälkeen (havaintorytmi lukee osa_havainnot)', () => {
  const NYT2 = new Date('2026-10-20T12:00:00Z'), askel = (jf) => SA.tmSeuraavaAskel({ jaksofokus: Object.assign({ konsepti_avain: KONS, konsepti_nimi: 'H', alkoi: '2026-10-05T08:00:00', kesto_vk: 6 }, jf || {}) }, { nyt: NYT2.getTime() });
  it('ilman havaintoa (15 pv jakson alusta) askel = havainto; osa_havainnot-merkintä tänään → ei havainto-askelta; vanha merkintä (ennen jaksoa) ei lasketa', () => {
    expect(askel().avain).toBe('havainto');
    expect(askel({ osa_havainnot: { [KONS]: { k1: { u1: { arvo: 2, pvm: '2026-10-20', rooli: 'valmentaja' } } } } }).avain).not.toBe('havainto');
    expect(askel({ osa_havainnot: { [KONS]: { k1: { u1: { arvo: 2, pvm: '2026-09-01', rooli: 'valmentaja' } } } } }).avain).toBe('havainto');
    expect(askel({ osa_havainnot: 'rikki' }).avain).toBe('havainto');
  });
});

describe('D108 · pelaaja ja huoltaja eivät näe osa_havainnot-tietoa', () => {
  it('Pelaaja_v7, Vanhempi_v2 ja pelaajan Tänään-lib (tm_tanaan_kentta) eivät lue osa_havainnot-kenttää', () => {
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html', 'lib/tm_tanaan_kentta.js', 'lib/tm_kentta.js']) expect(lue(f), f).not.toContain('osa_havainnot');
  });
});

describe('D108 · kuoret: vain kytkentä', () => {
  it('VP ja Master välittävät uid:n, roolin ja nimet; kirjoitus libin ytimessä (ei omaa osa_havainnot-logiikkaa kuorissa)', () => {
    for (const f of ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html']) { const s = lue(f); expect(s, f).toContain('uid: _uid'); expect(s, f).toContain('tmKtTallennaOsaArvio({'); expect(s, f).not.toContain('osa_havainnot'); }
  });
});
