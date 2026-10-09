/* Kehitystyöpöytä 22 · A1 (D97): sitoumus — YKSI sääntö lib/tm_sitoumus.js. Vanha sitoumus + uusi jakso ≠ "Mukana"/"odottaa"; vahvistus sidotaan nykyiseen jaksoon; Masterissa sama vahvistuspolku kuin VP:llä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const { tmSitoumus } = require('../lib/tm_sitoumus.js');
const { tmPolunTila } = require('../lib/tm_polun_tila.js');
const SA = require('../lib/tm_seuraava_askel.js');
const AJ = require('../lib/tm_aloita_jakso.js');
const TS = require('../lib/tm_tanaan_signaali.js');
const MASTER = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
const PV = 86400000, NYT = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const JF = (alkoiPv) => ({ konsepti_avain: 'y_h1', konsepti_nimi: 'Kuljetus', domeeni: 'teknis_taktinen', alkoi: iso(NYT - alkoiPv * PV), kesto_vk: 4 });
const kys = (T, a) => T.kysymykset.find((k) => k.avain === a);

describe('tmSitoumus — yksi sääntö', () => {
  it('sitoutunut = sitoumus ≥ jakson alku − 1 pv; vanha sitoumus + uusi jakso → EI sitoutunut', () => {
    const jf = JF(10);
    expect(tmSitoumus({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 8 * PV) }).sitoutunut).toBe(true);
    expect(tmSitoumus({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 10 * PV - PV / 2) }).sitoutunut).toBe(true);   // ± 1 pv
    expect(tmSitoumus({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 20 * PV) }).sitoutunut).toBe(false);          // edellisen jakson sitoumus
    expect(tmSitoumus({ jaksofokus: jf }).sitoutunut).toBe(false); expect(tmSitoumus({ idp_sitoumus_pvm: iso(NYT) }).sitoutunut).toBe(false); expect(tmSitoumus(null).sitoutunut).toBe(false);
  });
  it('vahvistettu = sitoutunut JA idp_sitoumus_vahv_jakso === jaksofokus.alkoi (vanha vahvistus ei kelpaa uudelle jaksolle)', () => {
    const jf = JF(10), sit = iso(NYT - 8 * PV);
    expect(tmSitoumus({ jaksofokus: jf, idp_sitoumus_pvm: sit, idp_sitoumus_vahv_jakso: jf.alkoi })).toMatchObject({ sitoutunut: true, vahvistettu: true, annettu_pvm: sit });
    expect(tmSitoumus({ jaksofokus: jf, idp_sitoumus_pvm: sit, idp_sitoumus_vahv_jakso: iso(NYT - 40 * PV) }).vahvistettu).toBe(false);
    expect(tmSitoumus({ jaksofokus: jf, idp_sitoumus_pvm: sit }).vahvistettu).toBe(false);
    expect(tmSitoumus({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 20 * PV), idp_sitoumus_vahv_jakso: jf.alkoi }).vahvistettu).toBe(false);   // ei sitoutunut → ei vahvistettua
  });
});

describe('käyttäjät noudattavat samaa sääntöä', () => {
  const vanha = (jf) => ({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 40 * PV), idp_sitoumus_vahv_jakso: iso(NYT - 41 * PV) });
  it('Polun tila "Onko mukana?": vanha sitoumus + uusi jakso → ei tietoa (EI "Mukana"); tuore ei vahvistettu → odottaa; vahvistettu → vahvistettu', () => {
    const jf = JF(5);
    expect(kys(tmPolunTila(vanha(jf), {}), 'onko_mukana')).toMatchObject({ tieto: false, vastaus: 'ei_tietoa' });
    expect(kys(tmPolunTila({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 3 * PV) }, {}), 'onko_mukana').vastaus).toBe('sitoumus_odottaa');
    expect(kys(tmPolunTila({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 3 * PV), idp_sitoumus_vahv_jakso: jf.alkoi }, {}), 'onko_mukana').vastaus).toBe('sitoumus_vahvistettu');
  });
  it('Seuraava askel: vanha sitoumus ei nosta porrasta "sitoumus"; tuore vahvistamaton nostaa', () => {
    const jf = JF(5);
    expect(SA.tmSeuraavaAskel(vanha(jf), { nyt: NYT }).avain).not.toBe('sitoumus');
    expect(SA.tmSeuraavaAskel({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 3 * PV) }, { nyt: NYT }).avain).toBe('sitoumus');
  });
  it('tmJaksoTila (tilasiru): vk 1 + sitoumus puuttuu → vahvistettu ("V1 vahvistettu, pelaajan sitoumus puuttuu"); tuore sitoumus → kaynnissa; vanha sitoumus → vahvistettu', () => {
    const jf = Object.assign(JF(2), { kesto_vk: 4 });
    expect(AJ.tmJaksoTila({ jaksofokus: jf }, { nyt: NYT }).tila).toBe('vahvistettu');
    expect(AJ.tmJaksoTila({ jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - PV) }, { nyt: NYT }).tila).toBe('kaynnissa');
    expect(AJ.tmJaksoTila(vanha(jf), { nyt: NYT }).tila).toBe('vahvistettu');
  });
  it('Tänään-signaali: askel "sitoumus" → nappi "Vahvista sitoumus" (vahvista_sitoumus), ei vain Avaa Polku', () => {
    const jf = JF(5), p = { jaksofokus: jf, idp_sitoumus_pvm: iso(NYT - 3 * PV) };
    const x = TS.tmTanaanSignaali(p, { nyt: new Date(), profiili: 'oto', askel: { avain: 'sitoumus', tila: 'toimenpide' }, tila: AJ.tmJaksoTila(p, { nyt: NYT }) }, { t: (k) => (TS.FI || {})[k] || k });
    expect(x.ensisijainen.nappi.avain).toBe('vahvista_sitoumus');
  });
  it('VP ja Master: ei enää omaa sitoumussääntöä (idp_sitoumus_vahv_jakso-vertailu pois kuoresta; kaikki lib/tm_sitoumus.js:stä); skripti ladataan ennen tm_aloita_jakso:a', () => {
    for (const [n, src] of [['VP', VP], ['Master', MASTER]]) {
      expect(src, n).not.toMatch(/idp_sitoumus_vahv_jakso \|\| null\) !==/);
      expect(src.indexOf('lib/tm_sitoumus.js'), n).toBeGreaterThan(0); expect(src.indexOf('lib/tm_sitoumus.js'), n).toBeLessThan(src.indexOf('lib/tm_aloita_jakso.js'));
    }
    expect(JSON.parse(lue('functions/jaettu_lib.json')).tiedostot).toContain('tm_sitoumus.js'); expect(lue('functions/tm_sitoumus.js')).toBe(lue('lib/tm_sitoumus.js'));
  });
});

describe('vahvistuspolku', () => {
  it('VP: _vpVahvistaSitoumus estää edellisen jakson sitoumuksen (toast "Sitoumus on edelliseltä jaksolta"), ei kirjoitusta', () => {
    const f = VP.slice(VP.indexOf('window._vpVahvistaSitoumus = async function'), VP.indexOf('// Kausitavoite-kortti (mockup'));
    expect(f).toMatch(/_vpJaksoVanhentunut\(p, p\._idpSitoumus\.jakso_alkoi\)/); expect(f.indexOf('Sitoumus on edelliseltä jaksolta')).toBeGreaterThan(0);
    expect(f.indexOf('Sitoumus on edelliseltä jaksolta')).toBeLessThan(f.indexOf('_vahvRooli'));
  });
  function masterAja(sitoumus, jakso) {
    const loki = { toast: [], set: [] }; const jfAlkoi = jakso;
    const doc = (polku) => ({ get: async () => ({ exists: polku.includes('idp_kausi') && !!sitoumus, data: () => ({ pelaaja_sitoumus: sitoumus }) }), set: async (d, o) => { loki.set.push([polku.join('/'), d, o]); }, collection: (c) => ({ doc: (id) => doc(polku.concat([c, id])) }) });
    const sb = { console: { warn() {} }, Date, String, Array, _demo: false, _seuraId: 'kpv', _rooli: 'valmentaja', masterT: (x) => x, toast: (m, t) => loki.toast.push([m, t]), _ktPaivita() { loki.paivita = true; }, _mTuoreToken: async () => {}, _kvkLahde: () => 'valmentaja',
      _ttPelaaja: () => ({ id: 'p1', jaksofokus: { alkoi: jfAlkoi } }), firebase: { auth: () => ({ currentUser: { uid: 'u1' } }) }, idpKausivuosi: () => '2026',
      _db: { collection: () => ({ doc: () => ({ collection: (c) => ({ doc: (id) => doc(['pelaajat', id]) }) }) }) }, window: {} };
    vm.createContext(sb);
    const a = MASTER.indexOf('window._ktVahvistaSitoumus = async function'), b = MASTER.indexOf('window._msSuljeJakso = async function');
    vm.runInContext(MASTER.slice(a, b), sb);
    return { loki, aja: () => sb.window._ktVahvistaSitoumus('p1') };
  }
  it('Master: samaan jaksoon kohdistuva sitoumus vahvistetaan (idp_kausi nested merge + pikakenttä idp_sitoumus_vahv_jakso)', async () => {
    const j = iso(NYT - 5 * PV), t = masterAja({ sitoumus_pvm: iso(NYT - 3 * PV), jakso_alkoi: j }, j); await t.aja();
    expect(t.loki.toast.at(-1)[0]).toBe('Sitoumus vahvistettu ✓'); expect(t.loki.set.length).toBe(2);
    const [kausi, pika] = t.loki.set; expect(kausi[0]).toContain('idp_kausi'); expect(kausi[1].pelaaja_sitoumus).toMatchObject({ vahvistettu_jakso_alkoi: j, vahvistaja_rooli: 'valmentaja' }); expect(kausi[2]).toEqual({ merge: true });
    expect(pika[1]).toEqual({ idp_sitoumus_vahv_jakso: j });
  });
  it('Master: edellisen jakson sitoumus → "Sitoumus on edelliseltä jaksolta", ei kirjoitusta; puuttuva sitoumus → ei kirjoitusta', async () => {
    const t = masterAja({ sitoumus_pvm: iso(NYT - 40 * PV), jakso_alkoi: iso(NYT - 45 * PV) }, iso(NYT - 5 * PV)); await t.aja();
    expect(t.loki.toast.at(-1)[0]).toBe('Sitoumus on edelliseltä jaksolta'); expect(t.loki.set).toEqual([]);
    const e = masterAja(null, iso(NYT - 5 * PV)); await e.aja(); expect(e.loki.toast.at(-1)[0]).toBe('Sitoumusta ei löytynyt'); expect(e.loki.set).toEqual([]);
  });
});
