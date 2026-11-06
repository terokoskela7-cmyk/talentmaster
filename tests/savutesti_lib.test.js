/* QG-3 · savutestin puhtaat osat (tools/savutesti/savutesti_lib.mjs): verkkoeston luokittelu, kirjoitusten luokittelu, sv-löydökset,
   konsolisuodatus, yhteenveto ja ohitus ilman secretejä. Ei selainta, ei verkkoa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { REITITA_RE, SECRETIT, secretitPuuttuvat, kanavaUrl, luokittelePyynto, luokitteleKirjoitus, vartijaLahde, svLoydot, poistaNimet, konsoliVirheet, ilmanQuerya, pyyntoRivi, epaonnistuneetPyynnot, liitaPyynnot, erotaListenKohina, onListenKohina, erotaCspKohina, onCspGoogleKehysKohina, virheRivit, arvioi, onnistui, yhteenvetoMarkdown, issueRunko, ESTO_VIESTI } from '../tools/savutesti/savutesti_lib.mjs';
import { aja } from '../tools/savutesti/savutesti.mjs';
import { createRequire } from 'module';
const { SALLITUT_NIMET } = createRequire(import.meta.url)('../scripts/savutesti_seura_luo.js');

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

describe('QG-3 · kirjoitukset (kerros 2a + 3): ⚠ vain nimetyt polut, kaikki muu kaataa (PM 5.11.)', () => {
  const T = SALLITUT.tunnetut_kirjoitukset, VP = 'TalentMaster_VP_v25.html', UID = 'vpUid123';
  const AUTO_ID = 'AbCdEfGhIjKlMnOpQrSt';
  const kirj = (o) => Object.assign({ op: 'update', polku: 'seurat/qg_savu/kayttajat/' + UID, kentat: ['viimeisinKirjautuminen'], arvot: {}, uid: UID }, o);
  const tp = (o) => kirj(Object.assign({ op: 'set', polku: 'seurat/qg_savu/toimenpiteet/' + AUTO_ID,
    kentat: ['tyyppi', 'signaali', 'joukkue', 'teksti', 'tila', 'vp_teksti', 'luotu', 'kuitattu_pvm', 'kuitattu_uid'],
    arvot: { tyyppi: 'automaattinen', signaali: 'suunta_lasku', joukkue: 'P13', teksti: 'x', tila: 'ehdotus', vp_teksti: null, kuitattu_pvm: null, kuitattu_uid: null } }, o));
  const tunnettu = (k, sivu) => luokitteleKirjoitus(k, sivu || VP, T).tunnettu;

  it('sallittulistalla on täsmälleen kaksi nimettyä kirjoitusta, kumpikin ankkuroitu, kentät lueteltu, VP-sivulle rajattu', () => {
    expect(T.map((k) => k.op + ' ' + k.polku)).toEqual(['update ^seurat/qg_savu/kayttajat/{oma_uid}$', 'set ^seurat/qg_savu/toimenpiteet/[A-Za-z0-9]{20}$']);
    for (const k of T) {
      expect(k.sivu).toBe(VP);
      expect(k.polku).toMatch(/^\^seurat\/qg_savu\/[a-z_]+\/[^/]+\$$/);
      expect(Array.isArray(k.kentat) && k.kentat.length > 0, k.polku).toBe(true);
      expect(k.op).toMatch(/^(set|update)$/);
    }
    expect(T[0].kentat).toEqual(['viimeisinKirjautuminen']);
    expect(T[1].arvot).toMatchObject({ tyyppi: 'automaattinen', tila: 'ehdotus' });
  });
  it('nimetyt avauskirjoitukset → tunnettu (⚠, estetään)', () => {
    expect(tunnettu(kirj())).toBe(true);
    expect(tunnettu(tp())).toBe(true);
  });
  it('viimeisinKirjautuminen: toisen käyttäjän dokki, puuttuva uid, lisäkenttä tai muu kenttä → kaataa', () => {
    expect(tunnettu(kirj({ polku: 'seurat/qg_savu/kayttajat/toinenUid' }))).toBe(false);
    expect(tunnettu(kirj({ uid: null }))).toBe(false);
    expect(tunnettu(kirj({ uid: '.*' , polku: 'seurat/qg_savu/kayttajat/.*' }))).toBe(false);
    expect(tunnettu(kirj({ kentat: ['viimeisinKirjautuminen', 'rooli'] }))).toBe(false);
    expect(tunnettu(kirj({ kentat: ['rooli'] }))).toBe(false);
    expect(tunnettu(kirj({ kentat: [] }))).toBe(false);
    expect(tunnettu(kirj({ kentat: undefined }))).toBe(false);
    expect(tunnettu(kirj({ op: 'set' }))).toBe(false);
    expect(tunnettu(kirj({ op: 'batch.update' }))).toBe(false);
    expect(tunnettu(kirj({ polku: 'seurat/qg_savu/kayttajat/' + UID + '/notifikaatiot/n1' }))).toBe(false);
  });
  it('toimenpide: muu tila/tyyppi, VP-teksti, kuittaus, puuttuva tai ylimääräinen kenttä, ei-auto-id, update/delete → kaataa', () => {
    const a = (x) => tp({ arvot: Object.assign({}, tp().arvot, x) });
    expect(tunnettu(a({ tila: 'kuitattu' }))).toBe(false);
    expect(tunnettu(a({ tyyppi: 'manuaalinen' }))).toBe(false);
    expect(tunnettu(a({ vp_teksti: 'oma teksti' }))).toBe(false);
    expect(tunnettu(a({ kuitattu_uid: UID }))).toBe(false);
    expect(tunnettu(tp({ kentat: tp().kentat.concat('pelaajaId') }))).toBe(false);
    expect(tunnettu(tp({ kentat: tp().kentat.filter((k) => k !== 'luotu') }))).toBe(false);
    expect(tunnettu(tp({ polku: 'seurat/qg_savu/toimenpiteet/oma' }))).toBe(false);
    expect(tunnettu(tp({ polku: 'seurat/qg_savu/toimenpiteet/' + AUTO_ID + '/x/y' }))).toBe(false);
    expect(tunnettu(tp({ op: 'update' }))).toBe(false);
    expect(tunnettu(tp({ op: 'delete', kentat: [] }))).toBe(false);
    expect(tunnettu(tp({ op: 'batch.set' }))).toBe(false);
  });
  it('toinen sivu, toinen seura tai muu kokoelma → kaataa', () => {
    expect(tunnettu(kirj(), 'TalentMaster_Kehitystyopoyta.html')).toBe(false);
    expect(tunnettu(tp(), 'TalentMaster_Pelaaja_v7.html')).toBe(false);
    expect(tunnettu(kirj({ polku: 'seurat/kpv/kayttajat/' + UID }))).toBe(false);
    expect(tunnettu(tp({ polku: 'seurat/kpv/toimenpiteet/' + AUTO_ID }))).toBe(false);
    expect(tunnettu(kirj({ op: 'set', polku: 'seurat/qg_savu/pelaajat/qp1', kentat: ['viimeisinKirjautuminen'] }))).toBe(false);
    expect(tunnettu(kirj({ op: 'add', polku: 'seurat/qg_savu/toimenpiteet/*' }))).toBe(false);
  });
  it('tuntemattoman syy kertoo op:n, polun ja kentät (yhteenvetoon)', () => {
    expect(luokitteleKirjoitus(kirj({ kentat: ['rooli'] }), VP, T).syy).toBe('tuntematon kirjoitus update seurat/qg_savu/kayttajat/' + UID + ' [rooli]');
  });
});

/* Vartija (kerros 2a) ajettuna valeympäristössä: kirjaa kentät, skalaariarvot ja kirjoittajan uid:n, hylkää jokaisen kirjoituksen. */
describe('QG-3 · sivun kirjoitusvartija kirjaa kentät, arvot ja uid:n', () => {
  function ymparisto(uid) {
    function DR(path, app) { this.path = path; this.firestore = { app }; }
    DR.prototype.set = () => Promise.resolve('MENI'); DR.prototype.update = () => Promise.resolve('MENI'); DR.prototype.delete = () => Promise.resolve('MENI');
    function CR(path, app) { this.path = path; this.firestore = { app }; } CR.prototype.add = () => Promise.resolve('MENI');
    function WB() {} WB.prototype.set = function () { return this; }; WB.prototype.commit = () => Promise.resolve('MENI');
    function TR() {} TR.prototype.set = function () { return this; };
    function FieldPath(n) { this._delegate = { _internalPath: { canonicalString: () => n } }; }
    const app = { name: '[DEFAULT]' }, firestore = () => ({}); Object.assign(firestore, { DocumentReference: DR, CollectionReference: CR, WriteBatch: WB, Transaction: TR, FieldPath });
    const w = { firebase: { firestore, auth: (a) => ({ currentUser: a === app && uid ? { uid } : null }) }, setInterval, clearInterval, setTimeout };
    w.window = w; vm.createContext(w); vm.runInContext(vartijaLahde(ESTO_VIESTI), w);
    return { w, app, DR, CR, WB, TR, FieldPath };
  }
  it('update(objekti) ja set(objekti): kentät lajiteltuina, skalaariarvot (merkkijono ≤ 80), uid; kirjoitus hylätään', async () => {
    const { w, app, DR } = ymparisto('vpUid123');
    const ts = { _methodName: 'serverTimestamp' };
    await expect(new DR('seurat/qg_savu/kayttajat/vpUid123', app).update({ viimeisinKirjautuminen: ts })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(new DR('seurat/qg_savu/toimenpiteet/AbCdEfGhIjKlMnOpQrSt', app).set({ tyyppi: 'automaattinen', tila: 'ehdotus', vp_teksti: null, teksti: 'x'.repeat(200), luotu: ts, n: 3 })).rejects.toThrow(ESTO_VIESTI);
    expect(w.__savuVartija).toBe(true);
    const [a, b] = w.__savuKirj;
    expect(a).toEqual({ op: 'update', polku: 'seurat/qg_savu/kayttajat/vpUid123', kentat: ['viimeisinKirjautuminen'], arvot: {}, uid: 'vpUid123' });
    expect(b.kentat).toEqual(['luotu', 'n', 'teksti', 'tila', 'tyyppi', 'vp_teksti']);
    expect(b.arvot).toEqual({ tyyppi: 'automaattinen', tila: 'ehdotus', vp_teksti: null, teksti: 'x'.repeat(80), n: 3 });
    // luokittelija: vartijan oma kirjaus viimeisinKirjautumisesta tunnistetaan, rooli-kenttä ei
    expect(luokitteleKirjoitus(a, 'TalentMaster_VP_v25.html', SALLITUT.tunnetut_kirjoitukset).tunnettu).toBe(true);
  });
  it('update(kenttä, arvo, …) ja FieldPath-muoto → kentät argumenteista; ei kirjautunutta → uid null → kaataa', async () => {
    const { w, app, DR, FieldPath } = ymparisto(null);
    await new DR('seurat/qg_savu/kayttajat/vpUid123', app).update('viimeisinKirjautuminen', 1, 'rooli', 'sa').catch(() => {});
    await new DR('seurat/qg_savu/kayttajat/vpUid123', app).update(new FieldPath('viimeisinKirjautuminen'), 1).catch(() => {});
    expect(w.__savuKirj[0]).toMatchObject({ kentat: ['rooli', 'viimeisinKirjautuminen'], uid: null });
    expect(w.__savuKirj[1].kentat).toEqual(['viimeisinKirjautuminen']);
    expect(luokitteleKirjoitus(w.__savuKirj[1], 'TalentMaster_VP_v25.html', SALLITUT.tunnetut_kirjoitukset).tunnettu).toBe(false);
  });
  it('add, batch ja transaktio kirjataan omilla op-nimillään (eivät koskaan täsmää nimettyihin) ja hylätään', async () => {
    const { w, app, DR, CR, WB, TR } = ymparisto('vpUid123');
    await expect(new CR('seurat/qg_savu/toimenpiteet', app).add({ tila: 'ehdotus' })).rejects.toThrow(ESTO_VIESTI);
    const b = new WB(); b.set(new DR('seurat/qg_savu/kayttajat/vpUid123', app), { viimeisinKirjautuminen: 1 });
    await expect(b.commit()).rejects.toThrow(ESTO_VIESTI);
    expect(() => new TR().set(new DR('x/y', app), {})).toThrow(ESTO_VIESTI);
    expect(w.__savuKirj.map((k) => k.op + ' ' + k.polku)).toEqual(['add seurat/qg_savu/toimenpiteet/*', 'batch.set seurat/qg_savu/kayttajat/vpUid123', 'tx.set x/y']);
    for (const k of w.__savuKirj) expect(luokitteleKirjoitus(k, 'TalentMaster_VP_v25.html', SALLITUT.tunnetut_kirjoitukset).tunnettu).toBe(false);
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
  it('seed-datan nimet (seed-skriptin SALLITUT_NIMET) eivät ole suomea: "Jo Strand" ohitetaan, nimen ympärillä oleva suomi jää kiinni', () => {
    expect(SALLITUT_NIMET.has('Jo') && SALLITUT_NIMET.has('Strand')).toBe(true);
    const o = { sallitut: { tekstit: [], alkavat: [] }, baseline: { tekstit: [] }, nimet: SALLITUT_NIMET };
    expect(svLoydot(['Jo Strand'], Object.assign({}, o, { nimet: undefined })).uudet).toEqual(['Jo Strand']);   // ilman nimiä väärä hälytys ("jo")
    const r = svLoydot(['Jo Strand', 'Strand, Jo', 'Iris Lund · VP', 'Jo Strand on jo tallentanut harjoituksen', 'Leo Berg tallenna muutokset'], o);
    expect(r.uudet).toEqual(['Jo Strand on jo tallentanut harjoituksen', 'Leo Berg tallenna muutokset']);
    expect(poistaNimet('Jo Strand on jo täällä', SALLITUT_NIMET).trim()).toBe('on jo täällä');
    expect(poistaNimet('Jonne Strandberg', SALLITUT_NIMET)).toBe('Jonne Strandberg');   // vain kokonaiset sanat
  });
  it('savutesti lukee nimet seed-skriptistä, ei omasta listasta', () => {
    const src = readFileSync(join(JUURI, 'tools/savutesti/savutesti.mjs'), 'utf8');
    expect(src).toMatch(/createRequire\(import\.meta\.url\)\('\.\.\/\.\.\/scripts\/savutesti_seura_luo\.js'\)\.SALLITUT_NIMET/);
    expect(src).toMatch(/nimet: SEED_NIMET/);
    expect(src).not.toMatch(/'Strand'/);
  });
});

describe('QG-3 · epäonnistuneet pyynnöt (metodi + status + URL ilman queryä)', () => {
  const L = FS + '/google.firestore.v1.Firestore/Listen/channel';
  const q = (rid) => L + '?VER=8&database=projects%2Fx&gsessionid=abc&SID=s1&RID=' + rid + '&AID=4&t=1';
  it('URL ilman queryä ja fragmenttia; rivi = status metodi URL', () => {
    expect(ilmanQuerya(q(1))).toBe(L);
    expect(ilmanQuerya('https://a.b/c#x')).toBe('https://a.b/c');
    expect(pyyntoRivi({ metodi: 'post', url: q(1), status: 400 })).toBe('400 POST ' + L);
    expect(pyyntoRivi({ metodi: 'GET', url: q('rpc'), status: 0, virhe: 'net::ERR_FAILED' })).toBe('ei vastausta (net::ERR_FAILED) GET ' + L);
  });
  it('konsolin "Failed to load resource" saa pyynnön; savutestin omat estot pois; tulokseen ei queryä', () => {
    const pyynnot = [{ metodi: 'POST', url: q(4450), status: 400, t: 1 }, { metodi: 'GET', url: q('rpc'), status: 404, t: 2 }, { metodi: 'POST', url: CF + 'paivitaSeuranKooste', status: 403 }];
    const viestit = konsoliVirheet([{ tyyppi: 'console', teksti: 'Failed to load resource: the server responded with a status of 400 ()', url: q(4450) },
      { tyyppi: 'console', teksti: 'Failed to load resource: the server responded with a status of 404 ()', url: q('rpc') },
      { tyyppi: 'console', teksti: 'Failed to load resource: 403', url: CF + 'paivitaSeuranKooste' }, { tyyppi: 'pageerror', teksti: 'TypeError: x' }], [], [CF + 'paivitaSeuranKooste']);
    const v = liitaPyynnot(viestit, pyynnot);
    expect(v.map((x) => x.pyynto && x.pyynto.status)).toEqual([400, 404, undefined]);
    expect(v[0].url).toBe(L); expect(v[0].pyynto).toEqual({ metodi: 'POST', url: L, status: 400 });
    expect(JSON.stringify(v)).not.toMatch(/gsessionid|SID=|RID=/);
    const e = epaonnistuneetPyynnot(pyynnot, [CF + 'paivitaSeuranKooste']);
    expect(e.map((x) => x.status + ' ' + x.url)).toEqual(['400 ' + L, '404 ' + L]);
  });
  it('yhteenveto näyttää pyynnöt, ei pelkkää "Failed to load resource"; toistuvat kootaan', () => {
    const virheet = liitaPyynnot([1, 2, 3].map((i) => ({ tyyppi: 'console', teksti: 'Failed to load resource: the server responded with a status of 400 ()', url: q(i) })).concat([{ tyyppi: 'pageerror', teksti: 'TypeError: x' }]),
      [1, 2, 3].map((i) => ({ metodi: 'POST', url: q(i), status: 400 })));
    expect(virheRivit(virheet)).toEqual(['400 POST ' + L + ' ×3', 'TypeError: x']);
    const n = { nimi: 'P7 Idag', kieli: 'sv', virheet, lohkot: { ok: true, puuttuu: [] }, sv: { uudet: [], tunnetut: [] }, vartija: true, kirjoitukset: { tuntemattomat: [], tunnetut: [], verkko: [] } };
    const md = yhteenvetoMarkdown({ nakymat: [n] });
    expect(md).toContain('400 POST ' + L + ' ×3');
    expect(md).not.toContain('Failed to load resource');
  });
  it('savutesti kuuntelee response- ja requestfailed-tapahtumia (status + metodi)', () => {
    const src = readFileSync(join(JUURI, 'tools/savutesti/savutesti.mjs'), 'utf8');
    expect(src).toMatch(/p\.on\('response'/); expect(src).toMatch(/r\.status\(\)/); expect(src).toMatch(/r\.request\(\)\.method\(\)/);
    expect(src).toMatch(/p\.on\('requestfailed'/);
    expect(src).toMatch(/liitaPyynnot\(/); expect(src).toMatch(/epaonnistuneetPyynnot\(/);
  });
});

describe('PM 6.11. · Listen-kanavan uusinta 400/404 sallittu vain valmistuneessa näkymässä', () => {
  const L = FS + '/google.firestore.v1.Firestore/Listen/channel';
  const q = (rid) => L + '?VER=8&gsessionid=abc&SID=s1&RID=' + rid;
  const fail = (url, status) => ({ tyyppi: 'console', teksti: 'Failed to load resource: the server responded with a status of ' + status + ' ()', url });
  const liita = (rivit) => liitaPyynnot(rivit.map(([u, s]) => fail(u, s)), rivit.map(([u, s]) => ({ metodi: 'POST', url: u, status: s })));
  const PERUS = { nimi: 'VP Koti', kieli: 'sv', lohkot: { ok: true, puuttuu: [] }, sv: { uudet: [], tunnetut: [] }, vartija: true, kirjoitukset: { tuntemattomat: [], tunnetut: [], verkko: [] } };
  it('vain firestore.googleapis.com/…/Listen/channel ja vain 400/404', () => {
    const v = liita([[q(1), 400], [q(2), 404], [q(3), 403], [q(4), 500], [FS + '/google.firestore.v1.Firestore/Write/channel?x=1', 400],
      [FS + '/v1/projects/p/databases/(default)/documents:runQuery', 404], ['https://evil.example/google.firestore.v1.Firestore/Listen/channel', 400], [CF + 'x', 404]]);
    expect(v.map(onListenKohina)).toEqual([true, true, false, false, false, false, false, false]);
    expect(onListenKohina(fail(q(9), 404))).toBe(true);                    // ilman liitettyä pyyntöä: status konsolitekstistä
    expect(onListenKohina({ tyyppi: 'pageerror', teksti: 'status of 400 Listen/channel' })).toBe(false);
    expect(onListenKohina({ tyyppi: 'console', teksti: 'Failed to load resource: net::ERR_FAILED', url: q(1), pyynto: { metodi: 'POST', url: L, status: 0 } })).toBe(false);
  });
  it('valmistunut näkymä: kohina ⚠ (ei kaada), muut 400/404 kaatavat edelleen', () => {
    const lk = erotaListenKohina(liita([[q(1), 400], [q(2), 404], [CF + 'x', 404]]), true);
    expect(lk.kohina.length).toBe(2); expect(lk.virheet.map((x) => x.pyynto.status + ' ' + x.pyynto.url)).toEqual(['404 ' + CF + 'x']);
    const vain = erotaListenKohina(liita([[q(1), 400], [q(2), 400]]), true);
    const n = Object.assign({}, PERUS, { virheet: vain.virheet, listenKohina: vain.kohina });
    expect(arvioi(n).virheet).toEqual({ tila: 'varoitus', tieto: 'Listen-kanavan uusinta sallittu: 400 POST ' + L + ' ×2' });
    expect(onnistui({ nakymat: [n] })).toBe(true);
    expect(yhteenvetoMarkdown({ nakymat: [n] })).toContain('⚠ **VP Koti (sv)** · Ei virheitä: Listen-kanavan uusinta sallittu');
    const muu = Object.assign({}, PERUS, { virheet: lk.virheet, listenKohina: lk.kohina });
    expect(arvioi(muu).virheet.tila).toBe('virhe'); expect(onnistui({ nakymat: [muu] })).toBe(false);
  });
  it('näkymä ei valmistunut: Listen 400/404 pysyy virheenä', () => {
    const lk = erotaListenKohina(liita([[q(1), 400]]), false);
    expect(lk.kohina).toEqual([]); expect(lk.virheet.length).toBe(1);
  });
  it('savutesti.mjs erottelee kohinan vain kun näkymä ei kaatunut', () => {
    const src = readFileSync(join(JUURI, 'tools/savutesti/savutesti.mjs'), 'utf8');
    expect(src).toMatch(/erotaListenKohina\(liitaPyynnot\(konsoliVirheet\([^\n]*\), !n\.kaatui\)/);
    expect(src).toMatch(/lk\.kohina\.length\) n\.listenKohina = lk\.kohina/);
  });
});

describe('PM 6.11. · App Checkin reCAPTCHA-kehys report-only-CSP:ssä sallittu ⚠:na', () => {
  const PERUS = { nimi: 'Seura', kieli: 'fi', lohkot: { ok: true, puuttuu: [] }, vartija: true, kirjoitukset: { tuntemattomat: [], tunnetut: [], verkko: [] } };
  const k = (teksti) => ({ tyyppi: 'console', teksti });
  const SALLITTU = "Framing 'https://www.google.com/' violates the following report-only Content Security Policy directive: \"frame-src 'self'\". The violation has been reported.";
  it('vaatii molemmat: "report-only Content Security Policy" ja "Framing \'https://www.google.com/\'"', () => {
    expect(onCspGoogleKehysKohina(k(SALLITTU))).toBe(true);
    expect(onCspGoogleKehysKohina(k(SALLITTU.replace(/'https:\/\/www\.google\.com\/'/, '‘https://www.google.com/’')))).toBe(true);   // kaarevat lainausmerkit
    // estävä CSP (ei report-only) kaataa
    expect(onCspGoogleKehysKohina(k("Framing 'https://www.google.com/' violates the following Content Security Policy directive: \"frame-src 'self'\". The request has been blocked."))).toBe(false);
    // report-only, mutta muu osoite tai muu direktiivi kaataa
    expect(onCspGoogleKehysKohina(k("Framing 'https://evil.example/' violates the following report-only Content Security Policy directive: \"frame-src 'self'\"."))).toBe(false);
    expect(onCspGoogleKehysKohina(k("Framing 'https://www.google.com.evil.example/' violates the following report-only Content Security Policy directive."))).toBe(false);
    expect(onCspGoogleKehysKohina(k("Loading the script 'https://www.google.com/recaptcha/enterprise.js' violates the following report-only Content Security Policy directive: \"script-src 'self'\"."))).toBe(false);
    expect(onCspGoogleKehysKohina(k('Refused to frame https://www.google.com/ because it violates the following Content Security Policy directive'))).toBe(false);
    expect(onCspGoogleKehysKohina(null)).toBe(false);
  });
  it('sallittu → ⚠ (ei kaada); muut CSP-viestit jäävät virheiksi', () => {
    const muu = k("Refused to connect to 'https://www.google.com/recaptcha/enterprise/clr' because it violates the following Content Security Policy directive: \"connect-src 'self'\".");
    const ck = erotaCspKohina([k(SALLITTU), k(SALLITTU), muu]);
    expect(ck.kohina.length).toBe(2); expect(ck.virheet).toEqual([muu]);
    const ok = Object.assign({}, PERUS, { virheet: [], cspKohina: [k(SALLITTU), k(SALLITTU)] });
    expect(arvioi(ok).virheet).toEqual({ tila: 'varoitus', tieto: 'report-only CSP (App Checkin reCAPTCHA-kehys www.google.com) sallittu ×2' });
    expect(onnistui({ nakymat: [ok] })).toBe(true);
    expect(yhteenvetoMarkdown({ nakymat: [ok] })).toContain('⚠ **Seura (fi)** · Ei virheitä: report-only CSP');
    expect(onnistui({ nakymat: [Object.assign({}, ok, { virheet: ck.virheet })] })).toBe(false);
  });
  it('Listen-kohina ja CSP-kohina näkyvät yhdessä ⚠-tiedossa', () => {
    const n = Object.assign({}, PERUS, { virheet: [], cspKohina: [k(SALLITTU)], listenKohina: [{ tyyppi: 'console', teksti: 'x', pyynto: { metodi: 'POST', url: FS + '/google.firestore.v1.Firestore/Listen/channel', status: 400 } }] });
    const a = arvioi(n).virheet; expect(a.tila).toBe('varoitus');
    expect(a.tieto).toContain('Listen-kanavan uusinta sallittu'); expect(a.tieto).toContain('report-only CSP');
  });
  it('savutesti.mjs erottelee CSP-kohinan Listen-erottelun jälkeen ja tallentaa sen näkymälle', () => {
    const src = readFileSync(join(JUURI, 'tools/savutesti/savutesti.mjs'), 'utf8');
    expect(src).toMatch(/const ck = erotaCspKohina\(lk\.virheet\)/);
    expect(src).toMatch(/n\.virheet = ck\.virheet/); expect(src).toMatch(/n\.cspKohina = ck\.kohina/);
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
  it('lippu pois → Kehitystyöpöytä-näkymät ohitetaan yhdellä syyllä: "–"-solut, ↷-löydös, ajo punainen VP Kodin lipusta (#1197)', () => {
    const vp = Object.assign({}, ok, { nimi: 'VP Koti', kieli: 'fi', sv: undefined, lippu: { ok: false, syy: 'kehitystyopoyta_v2 ei päällä (liput/julkiset false, _ktSivuLippu false) — Admin → Liput' } });
    const kt = { nimi: 'Kehitystyöpöytä Tänään', kieli: 'fi', sivu: 'TalentMaster_Kehitystyopoyta.html', ohitettu: 'kehitystyopoyta_v2 pois (ks. VP Koti)', virheet: [] };
    expect(Object.values(arvioi(kt)).map((x) => x.tila)).toEqual(['-', '-', '-', '-', '-']);
    expect(onnistui({ nakymat: [Object.assign({}, ok, { lippu: { ok: true } }), kt] })).toBe(true);   // ohitus ei yksin kaada
    expect(onnistui({ nakymat: [vp, kt] })).toBe(false);   // lippu ✗ kaataa
    const md = yhteenvetoMarkdown({ nakymat: [vp, kt] });
    expect(md).toContain('| Kehitystyöpöytä Tänään | fi | – | – | – | – | – |');
    expect(md).toContain('- ↷ **Kehitystyöpöytä Tänään (fi)** · ohitettu: kehitystyopoyta_v2 pois (ks. VP Koti)');
    expect(md.match(/Kehitystyöpöytä Tänään \(fi\)/g).length).toBe(1);   // ei seurannaisvirheitä
  });
  it('savutesti ohittaa Kehitystyöpöydän VAIN kun lippu luettiin pois-tilassa (ei kun lippua ei luettu)', () => {
    const src = readFileSync(join(JUURI, 'tools/savutesti/savutesti.mjs'), 'utf8');
    expect(src).toMatch(/else if \(!l\.julkiset \|\| l\.sivu !== true\) \{ lippuPois = true;/);
    expect(src).toMatch(/if \(!l\) koti\.lippu = \{ ok: false, syy: 'lippua ei luettu/);
    const i = src.indexOf('if (lippuPois)'), j = src.indexOf("if (!ohjasi) await p.goto");
    expect(i).toBeGreaterThan(0); expect(i).toBeLessThan(j);
    expect(src.slice(i, j)).toMatch(/for \(const k of KTP_NAKYMAT\) ulos\.push\(ohitettu\(NAKYMAT\[k\], kieli, .*\)\); return;/);
    expect(src).toMatch(/const KTP_NAKYMAT = \['ktTanaan', 'ktPolku', 'ktProfiili', 'ktRaportti'\]/);
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
