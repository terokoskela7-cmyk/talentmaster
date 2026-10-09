/**
 * Vartija: jakson ja signaalin päiväerot lasketaan PÄIVINÄ (paikallinen kalenteripäivä → Date.UTC(y,m-1,d)), ei ms-erotuksella (CLAUDE.md §7.11, §7.26).
 * Sama data antaa saman tuloksen kolmella vyöhykkeellä (UTC · Europe/Helsinki · America/Los_Angeles) — ajetaan lapsiprosesseina TZ-ympäristömuuttujalla.
 * Taustaa: tmTanaanSignaali antoi samalla datalla UTC:ssä pv 14 / neutraali ja Helsingissä pv 15 / amber → main punaiseksi CI:ssä (UTC).
 * nyt-hetket valittu keskipäivään UTC:ssä (LA 05:00, Helsinki 15:00 → sama kalenteripäivä kaikissa), joten tulos on vyöhykkeestä riippumaton.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const VYOHYKKEET = ['UTC', 'Europe/Helsinki', 'America/Los_Angeles'];

const KOODI = `
const AJ = require('./lib/tm_aloita_jakso.js'), TS = require('./lib/tm_tanaan_signaali.js'), IDP = require('./lib/tm_idp.js');
const out = {};
const NYT = Date.parse('2026-10-14T12:00:00Z'), t = (k) => k;
const sig = (rooli, alkoi, kesto) => { const p = { jaksofokus: { konsepti_avain: 'k', konsepti_nimi: 'K', alkoi, kesto_vk: kesto } }; const e = TS.tmTanaanSignaali(p, { nyt: NYT, rooli, profiili: 'oto', askel: null, tila: AJ.tmJaksoTila(p, { nyt: NYT }), nimi: 'T' }, { t }).ensisijainen; return { teksti: e.teksti, savy: e.savy, pv: e.pv }; };
out.signaaliVP_aikaleima = sig('vp', '2026-09-01T08:00:00', 4);            // Terolta: UTC 14/neutraali vs Helsinki 15/amber
out.signaaliVP_vainPaiva = sig('vp', '2026-09-01', 4);                     // 'YYYY-MM-DD' ei saa tulkita UTC-keskiyönä (LA: edellinen päivä)
out.signaaliValmentaja = sig('valmentaja', '2026-09-01T08:00:00', 4);
const tila = (alkoi, kesto, nyt) => { const r = AJ.tmJaksoTila({ jaksofokus: { konsepti_avain: 'k', alkoi, kesto_vk: kesto } }, { nyt: Date.parse(nyt) }); return { tila: r.tila, vk: r.rivitila.vk || null }; };
out.tila_viimeinenPaiva = tila('2026-09-16T08:00:00', 4, '2026-10-13T12:00:00Z');      // päivä 28 → käynnissä, vk 4/4
out.tila_paattymispaiva = tila('2026-09-16T08:00:00', 4, '2026-10-14T12:00:00Z');      // päivä 29 → päättynyt
out.tila_vainPaiva = tila('2026-09-16', 4, '2026-10-14T12:00:00Z');
out.tila_vk = [tila('2026-10-08T23:30:00', 6, '2026-10-14T12:00:00Z'), tila('2026-10-07T00:30:00', 6, '2026-10-14T12:00:00Z')];   // kellonajalla ei saa olla väliä
const base = { baseOpts: 1 };
out.arvio_pvm = (() => { try { const p = { arviointi_havaittu: { vision: 2 } }; const k = IDP.idpKohdeKandidaatti(p, 'vision', {}); return IDP.idpRakennaTavoite(p, k, { nyt: new Date('2026-03-01T12:00:00Z'), kestoVk: 6 }).aikaraami.arvio_pvm; } catch (e) { return 'ei-ajettavissa:' + e.message; } })();
out.havainto_pvm = (() => {   // D108: merkinnän pvm = paikallinen päivä (nyt keskipäivä UTC → sama päivä kaikissa vyöhykkeissä)
  const KT = require('./lib/tm_kehitystyopoyta.js'), KS = require('./lib/tm_kehityssilmukka.js'); const kirj = []; const p = { id: 'x', jaksofokus: { konsepti_avain: 'k', alkoi: '2026-10-05T08:00:00' } };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ update: async (u) => { kirj.push(u); } }) }) }) }) };
  KT.tmKtTallennaOsaArvio({ db, sid: 's', auth: () => ({ uid: 'u1', getIdToken: async () => 't' }), KS, demo: true, rooli: 'valmentaja', nyt: () => new Date('2026-10-14T12:00:00Z'), toast() {}, t: (k) => k }, p, 'k', 'a', 2);
  return p.jaksofokus.osa_havainnot.k.a.u1.pvm;
})();
console.log(JSON.stringify(out));
`;
const aja = (tz) => { const r = spawnSync('node', ['-e', KOODI], { cwd: juuri, encoding: 'utf8', env: Object.assign({}, process.env, { TZ: tz }) }); expect(r.status, tz + ': ' + r.stderr).toBe(0); return JSON.parse(r.stdout); };

describe('päiväerot päivinä ilman kellonaikaa — sama tulos kolmella aikavyöhykkeellä', () => {
  const tulokset = Object.fromEntries(VYOHYKKEET.map((z) => [z, aja(z)]));
  it('kaikki tulokset identtiset UTC · Europe/Helsinki · America/Los_Angeles', () => {
    for (const z of VYOHYKKEET.slice(1)) expect(tulokset[z], z + ' poikkeaa UTC:stä').toEqual(tulokset['UTC']);
  });
  it('arvot: signaali 15 pv (VP: amber, "katselmus myöhässä"; valmentaja ilman painetta); jakso päättyy päivänä 29; vk päivistä', () => {
    const t = tulokset['UTC'];
    expect(t.signaaliVP_aikaleima).toMatchObject({ pv: 15, savy: 'amber' }); expect(t.signaaliVP_aikaleima.teksti).toContain('myöhässä'); expect(t.signaaliVP_vainPaiva).toEqual(t.signaaliVP_aikaleima);
    expect(t.signaaliValmentaja.teksti).toContain('kun ehdit'); expect(t.signaaliValmentaja.teksti).not.toMatch(/\d+ pv|myöhässä/);
    expect(t.tila_viimeinenPaiva).toMatchObject({ tila: 'kaynnissa', vk: { n: 4, yht: 4 } }); expect(t.tila_paattymispaiva.tila).toBe('paattynyt'); expect(t.tila_vainPaiva.tila).toBe('paattynyt');
    expect(t.tila_vk[0].vk.n).toBe(1); expect(t.tila_vk[1].vk.n).toBe(2);   // 8.10. (6 pv) → vk 1; 7.10. (7 pv) → vk 2, kellonajasta riippumatta
    expect(t.arvio_pvm).toBe('2026-04-12'); expect(t.havainto_pvm).toBe('2026-10-14');   // D108: osa_havainnot.pvm paikallisena päivänä
  });
});
