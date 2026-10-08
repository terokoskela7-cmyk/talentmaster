/**
 * Seuran pulssi S1 — Excel_Tuonti admin-osion kaksi SA-nappia (📊 Päivitä seuran kooste · 📊 Takaisinlaske kooste (3 vk)). Sivun OIKEA koodi ajetaan vm:ssä stubattuna (callable, modaali, toast).
 * Sama malli kuin "⚥ Täydennä sukupuoli": kuiva-ajo (vain lukumäärät) → vahvistus → kirjoitus. Vain Super Admin; ei gcloud-skriptiä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';
const EX = readFileSync(new URL('../TalentMaster_Excel_Tuonti.html', import.meta.url), 'utf8');
function funktio(src, alku) { const i = src.indexOf(alku); if (i < 0) throw new Error('ei löydy ' + alku); let d = 0; for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(i, j + 1); } throw new Error('ei sulje ' + alku); }
const KOODI = ['function _koosteCallable(', 'function _koosteRaportti(', 'async function _adminPaivitaKooste(', 'async function _adminTakaisinlaskeKooste('].map((a) => funktio(EX, a)).join('\n');

function ymp(o) {
  o = o || {}; const kutsut = [], toastit = [], modaalit = []; const nappi = { disabled: false, textContent: '' };
  const sb = { console: { error() {}, log() {} }, superAdmin: o.sa !== false, seuraId: o.seuraId === undefined ? 'kpv' : o.seuraId, seuraNimi: 'KPV',
    document: { getElementById: () => nappi },
    toast: (m, t) => toastit.push([t, m]),
    _sukupuoliRaporttiModal: async (otsikko, teksti, kirjoitaNappi) => { modaalit.push({ otsikko, teksti, kirjoitaNappi }); return o.vahvista === true && !!kirjoitaNappi; },
    firebase: { app: () => ({ functions: (alue) => ({ httpsCallable: (nimi) => async (data) => { kutsut.push({ alue, nimi, data }); return { data: o.vastaus ? o.vastaus(data) : {} }; } }) }) } };
  vm.createContext(sb); vm.runInContext(KOODI, sb);
  return { sb, kutsut, toastit, modaalit };
}
const KUIVA = (d) => ({ takaisin: 3, kuiva: d.kuiva, viikot: [{ vk: '2026-W38', joukkueita: 3, joukkuejaksoja: 1, pelaajat: 40, jaksolla: 20, valinta_odottaa: 2, katselmus: 1, vastanneet: 5, vastausperusta: 12, katselmus_ajallaan: 0, katselmus_perusta: 0 }, { vk: '2026-W39', ohitettu: 'todellinen_olemassa' }, { vk: '2026-W40', joukkueita: 3, joukkuejaksoja: 1, pelaajat: 41, jaksolla: 22, valinta_odottaa: 1, katselmus: 2, vastanneet: 7, vastausperusta: 14, katselmus_ajallaan: 1, katselmus_perusta: 2 }] });

describe('Päivitä seuran kooste', () => {
  it('kutsuu paivitaSeuranKooste({seuraId}) europe-west1:ssa valitulle seuralle; toast kertoo viikon', async () => {
    const e = ymp({ vastaus: () => ({ vk: '2026-W41', joukkueita: 4, tuore: false }) }); await e.sb._adminPaivitaKooste();
    expect(e.kutsut).toEqual([{ alue: 'europe-west1', nimi: 'paivitaSeuranKooste', data: { seuraId: 'kpv' } }]); expect(e.toastit[0][0]).toBe('ok'); expect(e.toastit[0][1]).toContain('2026-W41');
  });
  it('tuore kooste (jäähy) kerrotaan; virhe näytetään näkyvästi (ei hiljaista)', async () => {
    const a = ymp({ vastaus: () => ({ vk: '2026-W41', tuore: true }) }); await a.sb._adminPaivitaKooste(); expect(a.toastit[0][1]).toMatch(/tuore/);
    const b = ymp({ vastaus: () => { throw Object.assign(new Error('ei oikeutta'), { code: 'permission-denied' }); } }); await b.sb._adminPaivitaKooste(); expect(b.toastit[0][0]).toBe('err'); expect(b.toastit[0][1]).toContain('permission-denied');
  });
  it('ei Super Admin / ei seuraa valittuna → ei kutsua', async () => {
    const a = ymp({ sa: false }); await a.sb._adminPaivitaKooste(); expect(a.kutsut).toEqual([]); expect(a.toastit[0][0]).toBe('err');
    const b = ymp({ seuraId: null }); await b.sb._adminPaivitaKooste(); expect(b.kutsut).toEqual([]);
  });
});

describe('Takaisinlaske kooste (3 vk)', () => {
  it('KUIVA-AJO ensin (kuiva:true, takaisin:3): modaali näyttää vain lukumäärät; Peruuta → ei kirjoitusta', async () => {
    const e = ymp({ vastaus: KUIVA, vahvista: false }); await e.sb._adminTakaisinlaskeKooste();
    expect(e.kutsut.length).toBe(1); expect(e.kutsut[0].data).toEqual({ seuraId: 'kpv', takaisin: 3, kuiva: true });
    expect(e.modaalit[0].otsikko).toContain('KUIVA-AJO'); expect(e.modaalit[0].kirjoitaNappi).toBe('Kirjoita (arvio: true)'); expect(e.modaalit[0].teksti).toContain('Ei vielä kirjoitettu'); expect(e.modaalit[0].teksti).toContain('2026-W38: joukkueita 3');
    expect(e.modaalit[0].teksti).toContain('ohitetaan (oikea kooste on jo olemassa'); expect(e.toastit.some((t) => /Peruttu/.test(t[1]))).toBe(true);
  });
  it('vahvistus → toinen kutsu kuiva:false; raportti-modaali; ei nimiä/ID:itä näytössä', async () => {
    const e = ymp({ vastaus: KUIVA, vahvista: true }); await e.sb._adminTakaisinlaskeKooste();
    expect(e.kutsut.map((k) => k.data)).toEqual([{ seuraId: 'kpv', takaisin: 3, kuiva: true }, { seuraId: 'kpv', takaisin: 3, kuiva: false }]);
    expect(e.modaalit.length).toBe(2); expect(e.modaalit[1].otsikko).toContain('RAPORTTI'); expect(e.modaalit[1].kirjoitaNappi).toBeNull(); expect(e.toastit.some((t) => t[0] === 'ok' && /takaisinlaskettu/.test(t[1]))).toBe(true);
  });
  it('kaikki viikot ohitettu (oikea kooste olemassa) → ei kirjoita-nappia', async () => {
    const e = ymp({ vastaus: () => ({ takaisin: 3, kuiva: true, viikot: [{ vk: '2026-W38', ohitettu: 'todellinen_olemassa' }] }), vahvista: true }); await e.sb._adminTakaisinlaskeKooste();
    expect(e.modaalit[0].kirjoitaNappi).toBeNull(); expect(e.kutsut.length).toBe(1);
  });
  it('vain Super Admin; virhe näytetään; nappi vapautuu', async () => {
    const a = ymp({ sa: false }); await a.sb._adminTakaisinlaskeKooste(); expect(a.kutsut).toEqual([]);
    const b = ymp({ vastaus: () => { throw new Error('boom'); } }); await b.sb._adminTakaisinlaskeKooste(); expect(b.toastit[0][0]).toBe('err');
  });
});

describe('lähdetaso', () => {
  it('napit vain SA-lohkossa (rinnakkain "Täydennä sukupuoli" -mallin kanssa); firebase-functions-compat ladataan; callable-nimi ja alue', () => {
    expect(EX).toContain("kbtn.id = 'sa-kooste-paivita'"); expect(EX).toContain("tbtn.id = 'sa-kooste-takaisin'"); expect(EX).toContain('📊 Päivitä seuran kooste'); expect(EX).toContain('📊 Takaisinlaske kooste (3 vk)');
    expect(EX.indexOf("tbtn.id = 'sa-kooste-takaisin'")).toBeGreaterThan(EX.indexOf("sbtn.id = 'sa-sukupuoli'")); expect(EX).toContain('firebase-functions-compat.js');
    expect(EX).toContain("httpsCallable('paivitaSeuranKooste')"); expect(EX).toContain("functions('europe-west1')");
  });
});
