/**
 * Istuntoturva (Teron kaista): kaikki henkilökunnan sovellukset jakavat yhden Firebase Auth -istunnon (oletusappi, LOCAL). Väärää roolia näkevä sovellus ei saa kutsua automaattisesti signOut():ia
 * (katkaisee istunnon kaikissa välilehdissä; KPV-rosterituonti 7.10.: 12/125, sitten permission-denied). Väärä rooli → viesti + "Kirjaudu ulos" -nappi, jatkotoiminnot estetty.
 * Tuonnit (Seura.ajaExcelTuonti, Excel_Tuonti) pysähtyvät ensimmäiseen permission-denied/unauthenticated-virheeseen tai kun currentUser on null ja kertovat montako tuotiin.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { lataaSivu } from './helpers/sivu_ajuri.mjs';
const require = createRequire(import.meta.url);
const I = require('../lib/tm_istunto.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const SIVUT = { Seura: lue('TalentMaster_Seura.html'), Admin: lue('TalentMaster_Admin.html'), Master: lue('TalentMaster_Master_v16.html'), VP: lue('TalentMaster_VP_v25.html'), Valmennusapuri: lue('TalentMaster_Valmennusapuri.html'), Excel_Tuonti: lue('TalentMaster_Excel_Tuonti.html') };

describe('lib/tm_istunto.js', () => {
  it('tmIstuntoKoodi / tmOnIstuntoVirhe: permission-denied ja unauthenticated (myös etuliitteillä ja SDK-viestistä); muut virheet eivät pysäytä', () => {
    for (const e of [{ code: 'permission-denied' }, { code: 'firestore/permission-denied' }, { code: 'functions/permission-denied' }, { message: 'Missing or insufficient permissions.' }]) { expect(I.tmIstuntoKoodi(e)).toBe('permission-denied'); expect(I.tmOnIstuntoVirhe(e)).toBe(true); }
    for (const e of [{ code: 'unauthenticated' }, { code: 'functions/unauthenticated' }, { code: 'auth/unauthenticated' }]) { expect(I.tmIstuntoKoodi(e)).toBe('unauthenticated'); expect(I.tmOnIstuntoVirhe(e)).toBe(true); }
    for (const e of [{ code: 'unavailable' }, { code: 'not-found' }, new Error('x'), null, undefined]) expect(I.tmOnIstuntoVirhe(e)).toBe(false);
    expect(I.tmIstuntoKoodi({ code: 'unavailable' })).toBe('unavailable'); expect(I.tmIstuntoKoodi(null)).toBe('tuntematon');
  });
  it('tmVaaraRooliHTML: viesti + "Kirjaudu ulos" -nappi (ei automaattista toimintoa); escapataan', () => {
    const h = I.tmVaaraRooliHTML('Rooli: <b>x</b>', { ulosFn: 'kirjauduUlos()' }); expect(h).toContain('data-tm-kirjaudu-ulos'); expect(h).toContain('onclick="kirjauduUlos()"'); expect(h).toContain('Kirjaudu ulos'); expect(h).not.toContain('<b>x</b>'); expect(h).toContain('&lt;b&gt;');
    expect(I.tmVaaraRooliHTML('a', { ulosFn: '"><img src=x>' })).not.toContain('<img');
  });
  it('tmTuontiSeis: currentUser null → pysäytä; virhe permission-denied/unauthenticated → pysäytä; muu virhe / ei virhettä → jatka', () => {
    const a = { currentUser: { uid: 'u' } };
    expect(I.tmTuontiSeis(null, null)).toEqual({ syy: 'ei_kirjautunut' }); expect(I.tmTuontiSeis({ currentUser: null }, null)).toEqual({ syy: 'ei_kirjautunut' }); expect(I.tmTuontiSeis(a, null)).toBeNull();
    expect(I.tmTuontiSeis(a, { code: 'permission-denied' })).toEqual({ syy: 'permission-denied' }); expect(I.tmTuontiSeis(a, { code: 'unauthenticated' })).toEqual({ syy: 'unauthenticated' }); expect(I.tmTuontiSeis(a, { code: 'unavailable' })).toBeNull();
  });
  it('tmTuontiYhteenveto: montako tuotiin + syy + ohje; ilman pysäytystä pelkkä lukumäärä', () => {
    expect(I.tmTuontiYhteenveto(12, 125, { syy: 'permission-denied' })).toMatch(/^Tuonti pysäytetty: tuotiin 12 \/ 125 pelaajaa\. Syy: ei oikeutta \(permission-denied\)/); expect(I.tmTuontiYhteenveto(12, 125, { syy: 'ei_kirjautunut' })).toContain('istunto päättyi');
    expect(I.tmTuontiYhteenveto(5, 5, null)).toBe('Tuotiin 5 / 5 pelaajaa.');
  });
});

describe('Lähdetarkistukset: väärä rooli ei kutsu automaattisesti signOut():ia; skripti ladataan', () => {
  const lohko = (src, alku, pituus = 900) => { const i = src.indexOf(alku); expect(i, alku).toBeGreaterThan(-1); return src.slice(i, i + pituus); };
  it('Seura: väärä rooli ja "seuraa ei löydy" → naytaVaaraRooli (viesti + nappi), ei signOut():ia', () => {
    const a = lohko(SIVUT.Seura, 'if (!SALLITUT_ROOLIT.includes(rooli)) {', 900); expect(a.slice(0, a.indexOf('return;') + 7)).toContain('naytaVaaraRooli('); expect(a.slice(0, a.indexOf('return;') + 7)).not.toMatch(/\.signOut\(\)/);
    const b = lohko(SIVUT.Seura, "naytaVaaraRooli('kirjautumisVirhe', tmHT('Seuraa ei löydy.", 300); expect(b.slice(0, b.indexOf('return;') + 7)).not.toMatch(/\.signOut\(\)/);
  });
  it('Admin: kumpikin väärän roolin haara → viesti + nappi, ei signOut():ia', () => {
    const a = lohko(SIVUT.Admin, "insertAdjacentHTML('beforeend'", 400); expect(a.slice(0, a.indexOf('return;') + 7)).not.toMatch(/\.signOut\(\)/);
    const b = lohko(SIVUT.Admin, 'ISTUNTOTURVA: väärä rooli', 900); expect(b.slice(0, b.indexOf('return;') + 7)).not.toMatch(/\.signOut\(\)/); expect(b).toContain('tmVaaraRooliHTML');
  });
  it('Master: seuraId puuttuu → viesti + nappi, ei signOut():ia; VP: "Oikeutesi ovat muuttuneet" (kaksi paikkaa) → viesti + nappi, ei signOut():ia eikä reloadia; Valmennusapuri: unauthenticated → viesti + nappi', () => {
    const m = lohko(SIVUT.Master, 'if (!seuraIdToUse) {', 1200); expect(m.slice(0, m.indexOf('return;') + 7)).not.toMatch(/\.signOut\(\)/); expect(m).toContain('tmVaaraRooliHTML');
    const v = SIVUT.VP.split("Oikeutesi ovat muuttuneet. Kirjaudu uudelleen.").length - 1; expect(v).toBeGreaterThanOrEqual(2);
    for (const k of SIVUT.VP.matchAll(/tmVaaraRooliHTML\(vpT\('Oikeutesi ovat muuttuneet\. Kirjaudu uudelleen\.'\)/g)) { const j = SIVUT.VP.slice(k.index, k.index + 260); expect(j).not.toMatch(/\.signOut\(\)|location\.reload/); expect(j).toContain("ulosFn: 'kirjauduUlos()'"); }
    expect(SIVUT.VP).not.toMatch(/alert\(vpT\('Oikeutesi ovat muuttuneet/); expect(SIVUT.VP).not.toMatch(/signOut\(\); window\.location\.reload\(\)/);
    const va = SIVUT.Valmennusapuri.split('\n').filter((r) => /indexOf\('unauthenticated'\) >= 0\)/.test(r) && /naytaIstuntoVirhe|signOut/.test(r)); expect(va).toHaveLength(1); expect(va[0]).toContain('naytaIstuntoVirhe()'); expect(va[0]).not.toMatch(/\.signOut\(\)/);
  });
  it('kaikki jäljellä olevat signOut()-kutsut ovat käyttäjän omia uloskirjautumistoimintoja (funktio kirjauduUlos / logout / Ulos-nappi / sisäänkirjautumisen tilanvaihto)', () => {
    const sallitut = { Seura: [/function kirjauduUlos\(/], Admin: [/function kirjauduUlos\(/], Master: [/function logout\(/], VP: [/function kirjauduUlos\(/], Valmennusapuri: [/vaUlos'\)\.addEventListener/] };
    for (const [nimi, src] of Object.entries(SIVUT)) {
      if (!sallitut[nimi]) continue;
      for (const m of src.matchAll(/\.signOut\(\)/g)) { const ennen = src.slice(Math.max(0, m.index - 700), m.index); expect(sallitut[nimi].some((re) => re.test(ennen)), nimi + ' signOut kohdassa ' + m.index + ': ' + ennen.slice(-120).replace(/\n/g, ' ')).toBe(true); }
    }
  });
  it('skripti ladataan ja nappi "Kirjaudu ulos" kutsuu sivun omaa uloskirjautumista; eslint tuntee TM_ISTUNTO', () => {
    for (const nimi of ['Seura', 'Admin', 'Master', 'VP', 'Valmennusapuri', 'Excel_Tuonti']) expect(SIVUT[nimi], nimi).toMatch(/<script src="lib\/tm_istunto\.js\?v=1"><\/script>/);
    expect(lue('eslint.config.js')).toContain("TM_ISTUNTO: 'readonly'");
  });
});

/* ── Seura.ajaExcelTuonti: SIVUN oikea koodi vm:ssä ── */
function seuraYmp({ rivit = 5, tapahtuma = {}, kirjautunut = true, rooli = 'vp' } = {}) {
  const log = { set: [], virheTeksti: '', onniTeksti: '', progress: '' }; let user = kirjautunut ? { uid: 'u1' } : null;
  const el = (id) => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, querySelector: () => null, set textContent(v) { if (id === 'excelVirhe') log.virheTeksti = v; if (id === 'excelOnnistui') log.onniTeksti = v; if (id === 'excelProgressTeksti') log.progress = v; }, get textContent() { return id === 'excelVirhe' ? log.virheTeksti : ''; }, disabled: false });
  const els = {}; const getEl = (id) => (els[id] = els[id] || el(id));
  const tyhja = { empty: true, docs: [], size: 0 }; const kokoelma = (n) => ({ doc: () => kokoelma(n + 1), collection: () => kokoelma(n + 1), where: () => kokoelma(n), limit: () => kokoelma(n), get: async () => tyhja, set: async (d) => { log.set.push(d.etunimi); const i = log.set.length; if (tapahtuma[i]) tapahtuma[i](() => { user = null; }); }, id: 'id' + n });
  const auth = { get currentUser() { return user; } };
  const c = lataaSivu('TalentMaster_Seura.html', { auth, db: { collection: () => kokoelma(0) }, tila: { seuraId: 'kpv', seuraNimi: 'KPV', seuraKieli: 'fi', rooli: rooli, kayttaja: { uid: 'u1' } }, toast() {}, URL, setTimeout: (f) => { f(); return 0; }, firebase: { firestore: { FieldValue: { serverTimestamp: () => 'TS', arrayUnion: (...a) => a } } } });
  c._excelData = Array.from({ length: rivit }, (_, i) => ({ etunimi: 'P' + i, sukunimi: 'X', syntymaVuosi: 2013, joukkue: 'KPV U13', palloId: null, huoltajaEmail: 'a@b.fi' }));
  c.document = Object.assign({}, c.document, { getElementById: getEl, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, remove() {}, appendChild() {}, setAttribute() {}, set innerHTML(v) {} }), body: { appendChild() {}, style: {} } }); c.window.document = c.document;
  return { c, log, auth, asetaKayttaja: (u) => { user = u; } };
}
describe('Seura.ajaExcelTuonti: pysähtyy istuntovirheeseen ja kertoo montako tuotiin', () => {
  it('ilman virheitä kaikki rivit tuodaan (ei pysäytystä)', async () => { const e = seuraYmp(); await e.c.ajaExcelTuonti(false); expect(e.log.set).toHaveLength(5); expect(e.log.virheTeksti).toBe(''); });
  it('permission-denied riviltä 3: tuonti pysähtyy SIIHEN (ei satoja virheitä), "tuotiin 2 / 5" + syy', async () => {
    const e = seuraYmp({ rivit: 5 }); let n = 0; const orig = e.c.db; e.c.db = { collection: () => { const r = orig.collection(); return r; } };
    const set = []; e.c.db = { collection: () => { const mk = () => ({ doc: mk, collection: mk, where: mk, limit: mk, get: async () => ({ empty: true }), set: async (d) => { n++; if (n === 3) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }); set.push(d.etunimi); } }); return mk(); } };
    await e.c.ajaExcelTuonti(false); expect(set).toEqual(['P0', 'P1']); expect(n).toBe(3); expect(e.log.virheTeksti).toMatch(/^Tuonti pysäytetty: tuotiin 2 \/ 5 pelaajaa\. Syy: ei oikeutta \(permission-denied\)/);
  });
  it('currentUser muuttuu null:ksi kesken tuonnin (istunto vaihtui) → pysähtyy ennen seuraavaa riviä, ei yritä kirjoittaa', async () => {
    const e = seuraYmp({ rivit: 5 }); let n = 0;
    e.c.db = { collection: () => { const mk = () => ({ doc: mk, collection: mk, where: mk, limit: mk, get: async () => ({ empty: true }), set: async () => { n++; if (n === 2) e.asetaKayttaja(null); } }); return mk(); } };
    await e.c.ajaExcelTuonti(false); expect(n).toBe(2); expect(e.log.virheTeksti).toMatch(/tuotiin 2 \/ 5 pelaajaa\. Syy: istunto päättyi/);
  });
  it('unauthenticated-virhe pysäyttää; muu virhe (esim. unavailable) vain ohittaa rivin ja jatkaa', async () => {
    const e = seuraYmp({ rivit: 4 }); let n = 0;
    e.c.db = { collection: () => { const mk = () => ({ doc: mk, collection: mk, where: mk, limit: mk, get: async () => ({ empty: true }), set: async () => { n++; if (n === 2) throw Object.assign(new Error('x'), { code: 'unavailable' }); } }); return mk(); } };
    await e.c.ajaExcelTuonti(false); expect(n).toBe(4);   // rivi 2 epäonnistui, muut jatkuivat
    const f = seuraYmp({ rivit: 4 }); let m = 0;
    f.c.db = { collection: () => { const mk = () => ({ doc: mk, collection: mk, where: mk, limit: mk, get: async () => ({ empty: true }), set: async () => { m++; if (m === 2) throw Object.assign(new Error('x'), { code: 'unauthenticated' }); } }); return mk(); } };
    await f.c.ajaExcelTuonti(false); expect(m).toBe(2); expect(f.log.virheTeksti).toContain('unauthenticated');
  });
  it('JATKOTOIMINNOT ESTETTY: ei kirjautunutta käyttäjää tai ei hyväksyttyä roolia (väärän roolin tila) → ei yhtään kirjoitusta', async () => {
    const e = seuraYmp({ kirjautunut: false }); await e.c.ajaExcelTuonti(false); expect(e.log.set).toEqual([]); expect(e.log.virheTeksti).toContain('Tuonti pysäytetty: tuotiin 0 / 5');
    const f = seuraYmp({ rooli: '' }); await f.c.ajaExcelTuonti(false); expect(f.log.set).toEqual([]); expect(f.log.virheTeksti).toContain('tuotiin 0 / 5');
  });
});

describe('Excel_Tuonti: tallennusfunktiot pysähtyvät istuntovirheeseen (lähdetaso)', () => {
  it('tallennaFirestoreen + tallennaPdfFirestoreen: tarkistus ennen jokaista erää ja catchissa; yhteenveto kertoo tuodut; "Yritä uudelleen" jää käyttöön', () => {
    const s = SIVUT.Excel_Tuonti;
    for (const nimi of ['async function tallennaFirestoreen() {', 'async function tallennaPdfFirestoreen() {']) {
      const i = s.indexOf(nimi); expect(i, nimi).toBeGreaterThan(-1); const f = s.slice(i, s.indexOf('\n}\n', i));
      expect((f.match(/TM_ISTUNTO\.tmTuontiSeis\(firebase\.auth\(\), null\)/g) || []).length, nimi + ' ennen erää').toBe(1);
      expect((f.match(/TM_ISTUNTO\.tmTuontiSeis\(firebase\.auth\(\), (e|err)\)/g) || []).length, nimi + ' catch').toBe(1);
      expect(f, nimi).toContain('TM_ISTUNTO.tmTuontiYhteenveto(');
    }
    const i = s.indexOf('async function tallennaFirestoreen() {'); expect(s.slice(i, s.indexOf('\n}\n', i))).toContain("nappi.innerHTML = '💾 Yritä uudelleen'");
  });
});
