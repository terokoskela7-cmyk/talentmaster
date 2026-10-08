/* Huoltajakutsu-sivu (TalentMaster_Huoltajakutsu.html): fragmentti-token, kutsu callablelle, tilat, uusi linkki -nappi. Palvelinpuoli: functions/test/huoltajakutsu.test.js. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const LANG = require('../lib/tm_lang.js');
const SRC = readFileSync(new URL('../TalentMaster_Huoltajakutsu.html', import.meta.url), 'utf8');
const SKRIPTI = SRC.match(/<script>\n\(function \(\) \{([\s\S]*?)\}\)\(\);\n<\/script>/)[1];
const TOKEN = 'A'.repeat(43);

function aja(hash, vastaukset) {
  const kutsut = [], loki = { replace: [] };
  const el = { innerHTML: '' }; const teksti = { textContent: '' };
  const uusiNappi = { disabled: false, onclick: null };
  const app = { functions: () => ({ httpsCallable: (n) => async (d) => { kutsut.push([n, d]); const v = vastaukset[n]; if (v instanceof Error) throw v; return { data: v }; } }) };
  const ctx = { firebase: { apps: [], initializeApp: () => app }, tmAppCheckAktivoi: () => { kutsut.push(['appcheck']); }, t: LANG.t, tmKieliInitSeura: (k) => { loki.kieli = k; },
    location: { hash, replace: (u) => loki.replace.push(u) }, console, String, RegExp,
    document: { getElementById: (id) => (id === 'sisalto' ? el : id === 'teksti' ? teksti : id === 'uusi' ? (/id="uusi"/.test(el.innerHTML) ? uusiNappi : null) : null) } };
  vm.createContext(ctx);
  const valmis = vm.runInContext('(async function(){' + SKRIPTI + '\n})()', ctx);
  return { ctx, el, teksti, kutsut, loki, uusiNappi, valmis, odota: () => new Promise((r) => setTimeout(r, 20)) };
}
describe('Huoltajakutsu-sivu', () => {
  it('App Check aktivoidaan ENNEN ensimmäistä backend-kutsua; token luetaan fragmentista (#k=), kutsutaan avaaHuoltajakutsu; ok → ohjaus tuoreeseen linkkiin (vain https)', async () => {
    const s = aja('#k=' + TOKEN, { avaaHuoltajakutsu: { tila: 'ok', linkki: 'https://talentmaster-pilot.firebaseapp.com/__/auth/action?x=1', kieli: 'sv' } }); await s.odota();
    expect(s.kutsut[0]).toEqual(['appcheck']); expect(s.kutsut[1]).toEqual(['avaaHuoltajakutsu', { token: TOKEN }]); expect(s.loki.replace).toEqual(['https://talentmaster-pilot.firebaseapp.com/__/auth/action?x=1']); expect(s.loki.kieli).toBe('sv');
    const v = aja('#k=' + TOKEN, { avaaHuoltajakutsu: { tila: 'ok', linkki: 'javascript:alert(1)' } }); await v.odota(); expect(v.loki.replace).toEqual([]);
  });
  it('vanhentunut → "Lähetä uusi linkki"; napin painallus kutsuu pyydaUusiHuoltajakutsu ja näyttää maskatun osoitteen + 7 pv', async () => {
    const s = aja('#k=' + TOKEN, { avaaHuoltajakutsu: { tila: 'vanhentunut' }, pyydaUusiHuoltajakutsu: { tila: 'lahetetty', osoite: 'a***@x.fi' } }); await s.odota();
    expect(s.el.innerHTML).toContain('Linkki on vanhentunut'); expect(s.el.innerHTML).toContain('Lähetä uusi linkki'); expect(s.loki.replace).toEqual([]);
    await s.uusiNappi.onclick(); await s.odota();
    expect(s.kutsut.some((k) => k[0] === 'pyydaUusiHuoltajakutsu' && k[1].token === TOKEN)).toBe(true); expect(s.el.innerHTML).toContain('a***@x.fi'); expect(s.el.innerHTML).toContain('7 päivää');
  });
  it('raja / odota / käytetty / ei löydy / virhe: oikeat viestit; käytetty ohjaa kirjautumaan; ei löydy ei tarjoa lähetystä; sivu ei tulosta tokenia', async () => {
    const tila = async (v) => { const s = aja('#k=' + TOKEN, { avaaHuoltajakutsu: v }); await s.odota(); return s; };
    expect((await tila({ tila: 'raja' })).el.innerHTML).toContain('useita kertoja'); expect((await tila({ tila: 'raja' })).el.innerHTML).not.toContain('id="uusi"');
    const k = await tila({ tila: 'kaytetty' }); expect(k.el.innerHTML).toContain('Tunnus on jo käytössä'); expect(k.el.innerHTML).toContain('TalentMaster_Vanhempi_v2.html');
    const e = await tila({ tila: 'ei_loydy' }); expect(e.el.innerHTML).toContain('Linkki ei kelpaa'); expect(e.el.innerHTML).not.toContain('id="uusi"');
    expect((await tila(new Error('x'))).el.innerHTML).toContain('Jokin meni pieleen');
    const o = aja('#k=' + TOKEN, { avaaHuoltajakutsu: { tila: 'vanhentunut' }, pyydaUusiHuoltajakutsu: { tila: 'odota' } }); await o.odota(); await o.uusiNappi.onclick(); await o.odota(); expect(o.el.innerHTML).toContain('juuri');
    for (const s of [k, e, o]) expect(s.el.innerHTML).not.toContain(TOKEN);
  });
  it('ei tokenia tai virheellinen fragmentti → ei backend-kutsua, "Linkki ei kelpaa"', async () => {
    for (const h of ['', '#', '#k=lyhyt', '#x=' + TOKEN, '?k=' + TOKEN]) { const s = aja(h, {}); await s.odota(); expect(s.kutsut.filter((k) => k[0] !== 'appcheck')).toEqual([]); expect(s.el.innerHTML).toContain('Linkki ei kelpaa'); }
  });
  it('sivun rakenne: referrer pois, noindex, SDK 10.7.1 + App Check, ei Firestorea/Authia, tm_lang-avaimet fi+en ja sv odotuslistalla', () => {
    expect(SRC).toContain('name="referrer" content="no-referrer"'); expect(SRC).toContain('noindex'); expect(SRC).toContain('firebasejs/10.7.1/firebase-app-check-compat.js'); expect(SRC).not.toMatch(/firebase-(firestore|auth)-compat/);
    const odotus = require('./tm_lang_sv_odotuslista.cjs'), fi = LANG.TM_LANG.fi.huoltajakutsu, en = LANG.TM_LANG.en.huoltajakutsu;
    for (const k of Object.keys(fi)) { expect(en[k], k).toBeTruthy(); expect(odotus, k).toContain('huoltajakutsu.' + k); }
  });
});
