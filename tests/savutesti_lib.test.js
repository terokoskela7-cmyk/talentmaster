/* QG-3 · savutestin puhtaat osat (tools/savutesti/savutesti_lib.mjs): verkkoeston luokittelu, kirjoitusten luokittelu, sv-löydökset,
   konsolisuodatus, yhteenveto ja ohitus ilman secretejä. Ei selainta, ei verkkoa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { REITITA_RE, SECRETIT, secretitPuuttuvat, kanavaUrl, luokittelePyynto, luokitteleKirjoitus, svLoydot, konsoliVirheet, arvioi, onnistui, yhteenvetoMarkdown, issueRunko, ESTO_VIESTI } from '../tools/savutesti/savutesti_lib.mjs';
import { aja } from '../tools/savutesti/savutesti.mjs';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALLITUT = JSON.parse(readFileSync(join(JUURI, 'tools/savutesti/savutesti_sallitut.json'), 'utf8'));
const CALL = SALLITUT.callablet.map((c) => c.nimi);
const FS = 'https://firestore.googleapis.com';
const CF = 'https://europe-west1-talentmaster-pilot.cloudfunctions.net/';
const KAIKKI = Object.fromEntries(SECRETIT.map((k) => [k, 'x']));
const p = (url, method) => luokittelePyynto({ url, method: method || 'POST' }, CALL);

describe('QG-3 · verkkoesto (kerros 2)', () => {
  it('Firestoren kirjoitukset estetään: Write-kanava, REST commit/batchWrite, PATCH/DELETE', () => {
    expect(p(FS + '/google.firestore.v1.Firestore/Write/channel?VER=8&database=x').paatos).toBe('estetty');
    expect(p(FS + '/v1/projects/talentmaster-pilot/databases/(default)/documents:commit').paatos).toBe('estetty');
    expect(p(FS + '/v1/projects/talentmaster-pilot/databases/(default)/documents:batchWrite').paatos).toBe('estetty');
    expect(p(FS + '/v1/projects/talentmaster-pilot/databases/(default)/documents/seurat/qg_savu', 'PATCH').paatos).toBe('estetty');
    expect(p(FS + '/v1/projects/talentmaster-pilot/databases/(default)/documents/seurat/qg_savu', 'DELETE').paatos).toBe('estetty');
  });
  it('Firestoren luku sallitaan (Listen, runQuery, GET) eikä Listen-kanava edes kulje reitityksen läpi', () => {
    const listen = FS + '/google.firestore.v1.Firestore/Listen/channel?VER=8';
    expect(p(listen).paatos).toBe('sallittu');
    expect(p(FS + '/v1/projects/talentmaster-pilot/databases/(default)/documents:runQuery').paatos).toBe('sallittu');
    expect(p(FS + '/v1/projects/talentmaster-pilot/databases/(default)/documents/seurat/qg_savu', 'GET').paatos).toBe('sallittu');
    expect(REITITA_RE.test(listen)).toBe(false);
    expect(REITITA_RE.test(FS + '/google.firestore.v1.Firestore/Write/channel?VER=8')).toBe(true);
  });
  it('callablet: vain sallittulista menee läpi, kaikki muut estetään (myös tuntematon funktiohost)', () => {
    for (const n of ['pelaajaKirjaudu', 'haePelaajanKertyma', 'haePelaajanKalenteri', 'haeKalenteriTilausTila']) expect(p(CF + n).paatos, n).toBe('sallittu');
    for (const n of ['paivitaSeuranKooste', 'lahetaMuistutukset', 'korjaaJoukkueenTestipvm', 'kuittaaKaavioYmmarretty', 'asetaPelaajanPin', 'luoKayttaja']) expect(p(CF + n).paatos, n).toBe('estetty');
    expect(p('https://jokin-abc.a.run.app/x').paatos).toBe('estetty');
    expect(REITITA_RE.test(CF + 'paivitaSeuranKooste')).toBe(true);
  });
  it('Storage: luku sallittu, upload/poisto estetty', () => {
    expect(p('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media', 'GET').paatos).toBe('sallittu');
    expect(p('https://firebasestorage.googleapis.com/v0/b/x/o?name=a.jpg', 'POST').paatos).toBe('estetty');
    expect(p('https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg', 'DELETE').paatos).toBe('estetty');
    expect(p('https://storage.googleapis.com/upload/x', 'PUT').paatos).toBe('estetty');
  });
  it('Auth: kirjautuminen ja tokenin uusinta sallittu, tilimuutokset estetty', () => {
    expect(p('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=k').paatos).toBe('sallittu');
    expect(p('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=k').paatos).toBe('sallittu');
    expect(p('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=k').paatos).toBe('sallittu');
    expect(p('https://securetoken.googleapis.com/v1/token?key=k').paatos).toBe('sallittu');
    for (const t of ['accounts:update', 'accounts:delete', 'accounts:sendOobCode', 'accounts:signUp']) expect(p('https://identitytoolkit.googleapis.com/v1/' + t + '?key=k').paatos, t).toBe('estetty');
  });
  it('Sentry vaimennetaan (ei tuotannon virheisiin), muu liikenne sallitaan', () => {
    expect(p('https://o123.ingest.de.sentry.io/api/1/envelope/').paatos).toBe('vaimennettu');
    expect(p('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js', 'GET').paatos).toBe('sallittu');
    expect(p('https://talentmaster-pilot--savutesti-abc.web.app/lib/tm_lang.js', 'GET').paatos).toBe('sallittu');
    expect(p('ei-osoite').paatos).toBe('sallittu');
  });
  it('sallittulistan jokaisella callablella ja tunnetulla kirjoituksella on perustelu', () => {
    for (const c of SALLITUT.callablet) expect(c.perustelu, c.nimi).toMatch(/\S{10,}/);
    for (const k of SALLITUT.tunnetut_kirjoitukset) { expect(k.perustelu, k.polku).toMatch(/\S{10,}/); expect(k.polku).toMatch(/^\^seurat\/qg_savu\//); }
    for (const k of SALLITUT.konsoli) expect(k.perustelu, k.malli).toMatch(/\S{10,}/);
  });
});

describe('QG-3 · kirjoitukset (kerros 2a + 3)', () => {
  const T = SALLITUT.tunnetut_kirjoitukset;
  it('VP:n tunnetut avauskirjoitukset qg_savussa → tunnettu (estetään, ei kaada)', () => {
    expect(luokitteleKirjoitus({ op: 'update', polku: 'seurat/qg_savu/kayttajat/u1' }, 'TalentMaster_VP_v25.html', T).tunnettu).toBe(true);
    expect(luokitteleKirjoitus({ op: 'set', polku: 'seurat/qg_savu/toimenpiteet/abc' }, 'TalentMaster_VP_v25.html', T).tunnettu).toBe(true);
    expect(luokitteleKirjoitus({ op: 'batch.set', polku: 'seurat/qg_savu/toimenpiteet/abc' }, 'TalentMaster_VP_v25.html', T).tunnettu).toBe(true);
  });
  it('muu kirjoitus, toinen sivu, toinen seura tai poisto → tuntematon (kaataa)', () => {
    expect(luokitteleKirjoitus({ op: 'update', polku: 'seurat/qg_savu/kayttajat/u1' }, 'TalentMaster_Kehitystyopoyta.html', T).tunnettu).toBe(false);
    expect(luokitteleKirjoitus({ op: 'update', polku: 'seurat/kpv/kayttajat/u1' }, 'TalentMaster_VP_v25.html', T).tunnettu).toBe(false);
    expect(luokitteleKirjoitus({ op: 'delete', polku: 'seurat/qg_savu/toimenpiteet/abc' }, 'TalentMaster_VP_v25.html', T).tunnettu).toBe(false);
    expect(luokitteleKirjoitus({ op: 'set', polku: 'seurat/qg_savu/pelaajat/qp1' }, 'TalentMaster_VP_v25.html', T).tunnettu).toBe(false);
    expect(luokitteleKirjoitus({ op: 'update', polku: 'seurat/qg_savu/kayttajat/u1/notifikaatiot/n1' }, 'TalentMaster_VP_v25.html', T).tunnettu).toBe(false);
  });
});

describe('QG-3 · sv-löydökset ja konsoli', () => {
  it('suomi sv-ajossa: uusi → virhe, sv-baselinessa → tunnettu, sallittu ja ruotsi → ei löydöstä', () => {
    const r = svLoydot(['Tallenna muutokset', 'Spara ändringar', 'Hidden Gem', 'harjoitus 1', 'Tallenna muutokset'], { sallitut: { tekstit: ['hidden gem'], alkavat: [] }, baseline: { tekstit: ['harjoitus 1'] } });
    expect(r.uudet).toEqual(['Tallenna muutokset']);
    expect(r.tunnetut).toEqual(['harjoitus 1']);
  });
  it('konsoli: savutestin oma esto ja estettyjen osoitteiden latausvirheet eivät ole löydöksiä; sallittulista regexillä', () => {
    const v = [{ tyyppi: 'console', teksti: 'FirebaseError: ' + ESTO_VIESTI + ' (set x)' }, { tyyppi: 'console', teksti: 'Failed to load resource: 403', url: CF + 'paivitaSeuranKooste' },
      { tyyppi: 'pageerror', teksti: 'TypeError: x is undefined' }, { tyyppi: 'console', teksti: 'tunnettu varoitus 1', url: 'https://a/b.js' }];
    const j = konsoliVirheet(v, [{ malli: '^tunnettu varoitus', url: 'b\\.js$', perustelu: 'testi' }], [CF + 'paivitaSeuranKooste']);
    expect(j.map((x) => x.teksti)).toEqual(['TypeError: x is undefined']);
  });
});

describe('QG-3 · tulos, yhteenveto ja ohitus', () => {
  const ok = { nimi: 'VP Koti', kieli: 'sv', sivu: 'TalentMaster_VP_v25.html', virheet: [], lohkot: { ok: true, puuttuu: [] }, sv: { uudet: [], tunnetut: ['x'] }, lippu: { ok: true }, vartija: true, kirjoitukset: { tuntemattomat: [], tunnetut: ['set seurat/qg_savu/toimenpiteet/a'], verkko: [] } };
  it('varoitukset (tunnetut) eivät kaada, virhe kaataa', () => {
    expect(onnistui({ nakymat: [ok] })).toBe(true);
    const a = arvioi(ok); expect(a.kieli.tila).toBe('varoitus'); expect(a.kirjoitukset.tila).toBe('varoitus'); expect(a.lippu.tila).toBe('ok');
    expect(onnistui({ nakymat: [ok, Object.assign({}, ok, { kirjoitukset: { tuntemattomat: ['tuntematon kirjoitus set seurat/qg_savu/pelaajat/qp1'], tunnetut: [], verkko: [] } })] })).toBe(false);
    expect(onnistui({ nakymat: [Object.assign({}, ok, { vartija: false })] })).toBe(false);
    expect(onnistui({ nakymat: [Object.assign({}, ok, { kirjoitukset: { tuntemattomat: [], tunnetut: [], verkko: ['Firestore Write -kanava'] } })] })).toBe(false);
    expect(onnistui({ nakymat: [{ nimi: 'P7 Idag', kieli: 'fi', kaatui: 'pelaajan kirjautuminen epäonnistui', virheet: [] }] })).toBe(false);
    expect(onnistui({ nakymat: [] })).toBe(false);
    expect(onnistui({ ohitettu: 'secretit puuttuvat' })).toBe(false);
  });
  it('yhteenveto: taulukko näkymä × tarkistus + löydökset; fi-rivillä kieli- ja lipputarkistus "–"', () => {
    const fi = Object.assign({}, ok, { nimi: 'P7 Idag', kieli: 'fi', lippu: undefined, sv: undefined, virheet: [{ teksti: 'TypeError: a|b' }] });
    const md = yhteenvetoMarkdown({ url: 'https://talentmaster-pilot--savutesti-abc.web.app', kesto_s: 61, nakymat: [ok, fi] });
    expect(md).toContain('| Näkymä | Kieli | Ei virheitä | Lohkot | sv: ei suomea | Lippu → Kehitystyöpöytä | Ei kirjoituksia |');
    expect(md).toContain('| VP Koti | sv | ✓ | ✓ | ⚠ | ✓ | ⚠ |');
    expect(md).toContain('| P7 Idag | fi | ✗ | ✓ | – | – | ⚠ |');
    expect(md).toContain('TypeError: a\\|b');
    expect(issueRunko({ nakymat: [fi] }, 'https://github.com/x/actions/runs/1')).toMatch(/^Savutesti epäonnistui: https:\/\/github\.com\/x\/actions\/runs\/1/);
  });
  it('kanavan URL: vain talentmaster-pilot--savutesti-*.web.app (tunnukset eivät lähde liveen eikä vieraalle)', () => {
    expect(kanavaUrl('https://talentmaster-pilot--savutesti-k3j2h1.web.app/').ok).toBe(true);
    expect(kanavaUrl('https://talentmaster-pilot--savutesti-k3j2h1.web.app/').url).toBe('https://talentmaster-pilot--savutesti-k3j2h1.web.app');
    for (const u of ['', 'https://talentmaster-pilot.web.app', 'https://talentmasterid.com', 'https://terokoskela7-cmyk.github.io/talentmaster', 'http://talentmaster-pilot--savutesti-k3.web.app', 'https://talentmaster-pilot--savutesti-k3.web.app.evil.example', 'https://talentmaster-pilot--muu-k3.web.app']) expect(kanavaUrl(u).ok, u).toBe(false);
  });
  it('secretit puuttuvat → ohitettu (ei selainta, ei punaista)', async () => {
    expect(secretitPuuttuvat({})).toEqual(SECRETIT);
    expect(secretitPuuttuvat(Object.assign({}, KAIKKI, { TM_SAVU_PELAAJA_PIN: ' ' }))).toEqual(['TM_SAVU_PELAAJA_PIN']);
    const r = await aja({ TM_SAVU_URL: 'https://talentmaster-pilot--savutesti-abc.web.app' });
    expect(r.ohitettu).toMatch(/^secretit puuttuvat \(TM_SAVU_EMAIL/);
    expect(yhteenvetoMarkdown(r)).toContain('ohitettu: secretit puuttuvat');
    expect((await aja(KAIKKI)).ohitettu).toMatch(/kanavan URL puuttuu/);
    expect((await aja(Object.assign({ TM_SAVU_URL: 'https://talentmaster-pilot.web.app' }, KAIKKI))).ohitettu).toMatch(/ei ole savutesti-kanava/);
  });
});
