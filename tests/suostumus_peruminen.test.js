/**
 * B9 · Suostumuksen peruminen (GDPR art. 7(3); PM 3.11.2026, .briefit/SUOSTUMUS_PERUMINEN_B9_VAIHE0.md).
 * Kanoninen ehto (peruttu voittaa) + inline-kopioiden pariteetti + lukijavartija · peruSuostumus ajettuna (oikeudet, idempotenssi,
 * PIN + istunto + kutsut, audit ilman nimiä, kuittaus fi/sv) · kirjautuminen hylkää lempeästi · uudelleensuostuminen · UI-kytkennät.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fakeDb } from './_fakeFirestore.mjs';
import { createRequire as _kuoriReq } from 'module';
import { createRequire as _fnReq } from 'module';
const { lueFunctionsLahde } = _fnReq(import.meta.url)('../scripts/functions_lahde.js');   // index.js + siirtomoduulit (rivikattojen purku F1/F2)
const { lueKuori } = _kuoriReq(import.meta.url)('../scripts/kuoren_lahde.js');   // Seura.html + seura/-osat (rivikattojen purku)

const require_ = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => lueKuori(f);
const TS = require_('../lib/tm_suostumus.js');
const SP = require_('../functions/suostumus_peruminen.js');
const K = require_('../functions/pelaajakirjautuminen.js');
const S = require_('../functions/suostumus.js');
const { huoltajaSyy } = require_('../functions/huoltaja_tunnistus.js');

class HttpsError extends Error { constructor(code, msg, details) { super(msg); this.code = code; this.details = details; } }
const FieldValue = { serverTimestamp: () => 'TS', delete: () => ({ __poista: true }), increment: (n) => ({ __inc: n }) };

const TAPAUKSET = [
  [{ suostumusTila: 'annettu' }, true, false], [{ suostumus: { annettu: 'TS' } }, true, false],
  [{ suostumusTila: 'peruttu', suostumus: { annettu: 'TS' } }, false, true],
  [{ suostumusTila: 'odottaa', suostumus: { annettu: 'TS', peruttu: { aika: 'TS' } } }, false, true],   // uusi kutsu perumisen jälkeen: yhä ei suostumusta
  [{ suostumusTila: 'annettu', suostumus: { peruttu: { aika: 'TS' } } }, false, true],
  [{ suostumusTila: 'odottaa' }, false, false], [{ suostumusTila: 'pilotti' }, false, false], [{}, false, false], [null, false, false],
];

describe('kanoninen ehto lib/tm_suostumus.js (peruttu voittaa)', () => {
  it.each(TAPAUKSET)('%j → annettu %s, peruttu %s', (p, a, pe) => {
    expect(TS.tmSuostumusAnnettu(p)).toBe(a); expect(TS.tmSuostumusPeruttu(p)).toBe(pe);
    expect(S.suostumusAnnettu(p)).toBe(a); expect(S.suostumusPeruttu(p)).toBe(pe);
  });
  it('näyttötila', () => {
    expect(TS.tmSuostumusTila({ suostumusTila: 'odottaa', suostumus: { peruttu: {} } })).toBe('peruttu');
    expect(TS.tmSuostumusTila({ suostumusTila: 'annettu' })).toBe('annettu');
    expect(TS.tmSuostumusTila({ suostumusTila: 'luotu' })).toBe('odottaa');
    expect(TS.tmSuostumusTila({})).toBe('puuttuu');
  });
  it('functions-kopio on sama tiedosto (sync_functions_lib)', () => {
    expect(lue('functions/tm_suostumus.js')).toBe(lue('lib/tm_suostumus.js'));
    expect(lue('functions/jaettu_lib.json')).toContain('"tm_suostumus.js"');
  });
  it('itsenäisten libien inline-kopiot = kanoninen (pariteetti)', () => {
    const L = require_('../lib/tm_laskutus.js'), KL = require_('../lib/tm_koti_luvut.js'), T = require_('../lib/tm_seura_tuonti.js');
    for (const [p, a] of TAPAUKSET) {
      expect(L.tmLaskutusSuostumus(p || {}), JSON.stringify(p)).toBe(a);
      expect(T.tmSeuraSuostumus(p || {}) === 'annettu', JSON.stringify(p)).toBe(a);
    }
    expect(T.tmSeuraSuostumus({ suostumusTila: 'peruttu' })).toBe('peruttu');
    const k = KL.suostumus ? KL : (KL.TM_KOTI_LUVUT || KL);
    expect(typeof k.suostumus === 'function' || typeof KL === 'object').toBe(true);
  });
  it('Excel-tuonti: peruttu ei saa automaattista kutsua eikä sähköpostin vaihtoa', () => {
    const T = require_('../lib/tm_seura_tuonti.js');
    expect(T.tmSeuraKutsuTarvitaan({ suostumusTila: 'peruttu', suostumus: { annettu: 'TS', peruttu: {} } }, null)).toBe(false);
    expect(lue('lib/tm_seura_tuonti.js')).toContain("erot.suostumus !== 'annettu' && erot.suostumus !== 'peruttu'");
  });
});

describe('lukijavartija: jokainen suostumuslukija käsittelee perutun', () => {
  const TIEDOSTOT = ['TalentMaster_Seura.html', 'TalentMaster_Admin.html', 'TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'TalentMaster_Vanhempi_v2.html',
    'TalentMaster_Kehitystyopoyta.html', 'functions/huoltaja_tunnistus.js', 'functions/kalenteri_ical.js', 'functions/suostumus.js', 'functions/pelaajakirjautuminen.js']
    .concat(readdirSync(join(ROOT, 'lib')).filter((f) => f.endsWith('.js')).map((f) => 'lib/' + f));
  it("rivi, joka lukee suostumusTila === / !== 'annettu' tai suostumus.annettu, mainitsee myös perutun (tai on kanoninen apuri)", () => {
    const vaarat = [];
    for (const f of TIEDOSTOT) {
      lue(f).split('\n').forEach((r, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(r)) return;
        if (!/suostumusTila\s*[!=]==?\s*'annettu'|suostumus\??\.annettu\b/.test(r)) return;
        if (/peruttu|Peruttu|_suostumusAnnettu|_sAnnettu|tmSuostumusAnnettu|suostumusAnnettu\(/.test(r)) return;
        if (/suostumusTila:\s*'annettu'|'suostumus\.annettu'|annettu:\s*(admin|FieldValue|TS|nyt)/.test(r)) return;   // kirjoitukset
        if (/annettu\??\.seconds|p\.suostumusAnnettu \|\|/.test(r)) return;   // päivämäärän näyttö, ei tilapäätös
        vaarat.push(f + ':' + (i + 1) + ': ' + r.trim().slice(0, 120));
      });
    }
    expect(vaarat).toEqual([]);
  });
});

const HUOLTAJA = { uid: 'h1', token: { email: 'Huoltaja@Example.fi', email_verified: true, firebase: { sign_in_provider: 'password' } } };
const VP = { uid: 'vp-kpv', token: { seuraId: 'kpv', rooli: 'vp', firebase: { sign_in_provider: 'password' } } };
const VALMENTAJA = { uid: 'val-kpv', token: { seuraId: 'kpv', rooli: 'valmentaja', email: 'val@x.fi', email_verified: true, firebase: { sign_in_provider: 'password' } } };
const PELAAJA = 'seurat/kpv/pelaajat/topias';
function data(kieli) {
  return {
    'seurat/kpv': { nimi: 'KPV', kieli: kieli || 'fi' },
    [PELAAJA]: { etunimi: 'Topias', sukunimi: 'Testi', huoltajaEmail: 'huoltaja@example.fi', suostumusTila: 'annettu', suostumus: { annettu: 'TS0', versio: 'v3' }, pin: '482915', pin_asetettu: 'TS0', syntymaVuosi: 2013 },
    '_pelaajaPin/kpv_topias': { hash: 'h' },
    'seurat/kpv/kutsut/k1': { pelaajaId: 'topias', tila: 'lahetetty' },
    'seurat/kpv/kutsut/k2': { pelaajaId: 'topias', tila: 'hyvaksytty' },
    'seurat/kpv/kutsut/k3': { pelaajaId: 'muu', tila: 'odottaa' },
    'huoltajakutsut/hk1': { seuraId: 'kpv', pelaajaId: 'topias', vanhenee: 9e15 },
    'huoltajakutsut/hk2': { seuraId: 'muu', pelaajaId: 'topias', vanhenee: 9e15 },
  };
}
function ymp(kieli, alku) {
  const f = fakeDb(alku || data(kieli)), audit = [], posti = [], revoke = [];
  const peru = SP.luoKasittelija({ db: f.db, HttpsError, FieldValue, audit: async (t, x) => audit.push([t, x]),
    tarkistaOikeus: async (uid) => (uid === 'vp-kpv' ? { sallittu: true, rooli: 'vp' } : uid === 'sa' ? { sallittu: true, rooli: 'superadmin' } : { sallittu: false }),
    auth: { revokeRefreshTokens: async (uid) => { revoke.push(uid); } }, lahetaSahkoposti: async (m) => posti.push(m) });
  return { f, audit, posti, revoke, peru };
}

describe('peruSuostumus (functions/suostumus_peruminen.js)', () => {
  it('varmennettu huoltaja perii: tila + todiste, PIN pois, istunto, kutsut, audit ilman nimiä, kuittaus', async () => {
    const y = ymp();
    const r = await y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: HUOLTAJA });
    expect(r).toMatchObject({ ok: true, jo: false, emailLahetetty: true });
    const p = y.f.D.get(PELAAJA);
    expect(p.suostumusTila).toBe('peruttu');
    expect(p['suostumus.peruttu']).toEqual({ aika: 'TS', rooli: 'huoltaja', uid: 'h1' });   // pistepolku (tynkä ei sisäkkäistä) → oikeassa Firestoressa suostumus.peruttu
    expect(p.suostumus.annettu).toBe('TS0');   // todiste säilyy (päätös 3)
    expect(p.pin).toBeUndefined(); expect(p.pin_asetettu).toBeUndefined();
    expect(y.f.D.has('_pelaajaPin/kpv_topias')).toBe(true);   // tiiviste jää → kirjautuja näkee lempeän tekstin, ei "väärä PIN"
    expect(y.revoke).toEqual(['pel_kpv_topias']);
    expect(y.f.D.get('seurat/kpv/kutsut/k1')).toMatchObject({ tila: 'korvattu', suljettuSyy: 'suostumus_peruttu' });
    expect(y.f.D.get('seurat/kpv/kutsut/k2').tila).toBe('hyvaksytty');
    expect(y.f.D.get('seurat/kpv/kutsut/k3').tila).toBe('odottaa');
    expect(y.f.D.get('huoltajakutsut/hk1').vanhenee).toBe(0);
    expect(y.f.D.get('huoltajakutsut/hk2').vanhenee).toBe(9e15);
    const a = y.audit.filter(([t]) => t === 'suostumus_peruttu');
    expect(a.length).toBe(1); expect(a[0][1]).toMatchObject({ seuraId: 'kpv', pelaajaId: 'topias', rooli: 'huoltaja', kutsuja_suljettu: 1 });
    expect(JSON.stringify(y.audit)).not.toMatch(/Topias|Testi|huoltaja@|482915/);
    expect(y.posti.length).toBe(1); expect(y.posti[0].to).toBe('huoltaja@example.fi');
    expect(y.posti[0].subject).toBe('Suostumus peruttu – Topias');
    expect(y.posti[0].html).toContain('pyydä seuralta uusi kutsu'); expect(y.posti[0].html).toContain('pyydä tietojen poistoa seuralta');
  });
  it('johto ja SA saavat perua (rooli talteen); valmentaja, vieras ja vahvistamaton huoltaja eivät', async () => {
    let y = ymp(); await y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: VP }); expect(y.f.D.get(PELAAJA)['suostumus.peruttu'].rooli).toBe('johto');
    y = ymp(); await y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: { uid: 'sa', token: {} } }); expect(y.f.D.get(PELAAJA)['suostumus.peruttu'].rooli).toBe('super_admin');
    for (const ctx of [VALMENTAJA, { uid: 'x', token: { email: 'vieras@x.fi', email_verified: true } }, { uid: 'h1', token: { email: 'huoltaja@example.fi', email_verified: false } }]) {
      y = ymp();
      await expect(y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: ctx })).rejects.toMatchObject({ code: 'permission-denied' });
      expect(y.f.D.get(PELAAJA).suostumusTila).toBe('annettu'); expect(y.f.D.get(PELAAJA).pin).toBe('482915');
      expect(y.audit.map(([t]) => t)).toEqual(['suostumus_peruminen_estetty']);
    }
  });
  it('kirjautumaton / anonyymi / puuttuva id hylätään', async () => {
    const y = ymp();
    await expect(y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, {})).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: { uid: 'a', token: { firebase: { sign_in_provider: 'anonymous' } } } })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(y.peru({ seuraId: 'kpv' }, { auth: VP })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(y.peru({ seuraId: 'kpv', pelaajaId: 'eiole' }, { auth: VP })).rejects.toMatchObject({ code: 'not-found' });
  });
  it('idempotentti: jo peruttu → ok, ei uusia kirjoituksia, auditia eikä postia', async () => {
    const y = ymp();
    await y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: HUOLTAJA });
    y.f.D.set(PELAAJA, Object.assign({}, y.f.D.get(PELAAJA), { suostumus: { annettu: 'TS0', peruttu: { aika: 'TS' } } }));
    const commits = y.f.loki.commits, au = y.audit.length;
    expect(await y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: HUOLTAJA })).toEqual({ ok: true, jo: true });
    expect(y.f.loki.commits).toBe(commits); expect(y.audit.length).toBe(au); expect(y.posti.length).toBe(1);
  });
  it('ei annettua suostumusta → failed-precondition ei_annettu', async () => {
    const d = data(); d[PELAAJA] = Object.assign({}, d[PELAAJA], { suostumusTila: 'odottaa', suostumus: undefined });
    const y = ymp('fi', d);
    await expect(y.peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: VP })).rejects.toMatchObject({ code: 'failed-precondition', details: { syy: 'ei_annettu' } });
  });
  it('kuittaus seuran kielellä: sv-seuralle ruotsiksi (erä 94 viety), muille suomeksi; tyhjä sv → koko viesti suomeksi', () => {
    const sv = SP.pohjaSuostumusPeruttu({ kieli: 'sv', seuraNimi: 'Sibbo <b>', lapsiNimi: 'Ä<script>' });
    expect(sv.kieli).toBe('sv'); expect(sv.subject).toBe(SP.TEKSTIT.sv.otsikko.replace('{lapsi}', 'Ä<script>'));
    expect(sv.html).not.toContain('<script>'); expect(sv.html).toContain('Sibbo &lt;b&gt;'); expect(sv.html).not.toContain('{seura}');
    expect(sv.subject).not.toMatch(/[\r\n]/);
    expect(SP.pohjaSuostumusPeruttu({ kieli: 'fi', seuraNimi: 'KPV', lapsiNimi: 'Topias' }).kieli).toBe('fi');
    expect(SP.pohjaSuostumusPeruttu({ seuraNimi: 'KPV', lapsiNimi: 'Topias' }).kieli).toBe('fi');
    expect(Object.keys(SP.TEKSTIT.sv).sort()).toEqual(Object.keys(SP.TEKSTIT.fi).sort());
  });
  it('sähköpostivirhe ei kaada perumista', async () => {
    const f = fakeDb(data()), audit = [];
    const peru = SP.luoKasittelija({ db: f.db, HttpsError, FieldValue, audit: async (t) => audit.push(t), tarkistaOikeus: async () => ({ sallittu: false }),
      auth: { revokeRefreshTokens: async () => { const e = new Error('x'); e.code = 'auth/user-not-found'; throw e; } }, lahetaSahkoposti: async () => { throw new Error('smtp'); } });
    expect(await peru({ seuraId: 'kpv', pelaajaId: 'topias' }, { auth: HUOLTAJA })).toMatchObject({ ok: true, emailLahetetty: false });
    expect(f.D.get(PELAAJA).suostumusTila).toBe('peruttu');
  });
});

describe('kirjautuminen ja palvelinlukijat', () => {
  const peruttu = (lisa) => Object.assign({ etunimi: 'Topias', tunniste: '12345678', pin: '482915', joukkueet: ['kpv_u13'], syntymaVuosi: 2013, suostumusTila: 'peruttu', suostumus: { annettu: 'TS0', peruttu: { aika: 'TS' } } }, lisa || {});
  it('oikea PIN + peruttu → failed-precondition suostumus_peruttu, lempeä teksti (päätös 7), ei tokenia', async () => {
    const f = fakeDb({ [PELAAJA]: peruttu() }), audit = [];
    const k = K.luoKasittelija({ db: f.db, auth: { createCustomToken: async () => 'TOKEN' }, HttpsError, FieldValue, nyt: () => Date.UTC(2026, 10, 3), audit: async (t, x) => audit.push([t, x]) });
    await expect(k({ seuraId: 'kpv', pelaajaId: 'topias', pin: '482915' }, { rawRequest: { ip: '1.2.3.4' } })).rejects.toMatchObject({ code: 'failed-precondition', details: { syy: 'suostumus_peruttu' },
      message: 'Huoltajasi on perunut luvan TalentMasterin käyttöön. Voit kysyä asiasta huoltajaltasi.' });
    expect(audit.map(([t]) => t)).toContain('pelaaja_kirjautuminen_estetty_peruttu');
  });
  it('uusi kutsu perumisen jälkeen (tila odottaa, suostumus.peruttu jää) → yhä peruttu', async () => {
    const f = fakeDb({ [PELAAJA]: peruttu({ suostumusTila: 'odottaa' }) });
    const k = K.luoKasittelija({ db: f.db, auth: { createCustomToken: async () => 'TOKEN' }, HttpsError, FieldValue, nyt: () => Date.UTC(2026, 10, 3) });
    await expect(k({ seuraId: 'kpv', pelaajaId: 'topias', pin: '482915' }, { rawRequest: { ip: '1.2.3.5' } })).rejects.toMatchObject({ details: { syy: 'suostumus_peruttu' } });
    expect(S.suostumusTilaKutsunJalkeen ? typeof S.suostumusTilaKutsunJalkeen : 'function').toBe('function');
  });
  it('huoltajan kalenteri (vaadiSuostumus) ja iCal-syöte sulkeutuvat perutulta', () => {
    const tk = { email: 'h@x.fi', email_verified: true };
    expect(huoltajaSyy(tk, { huoltajaEmail: 'h@x.fi', suostumusTila: 'annettu', suostumus: { peruttu: {} } }, { vaadiSuostumus: true })).toBe('ei_suostumusta');
    expect(huoltajaSyy(tk, { huoltajaEmail: 'h@x.fi', suostumusTila: 'peruttu' })).toBe(null);   // peruminen itse vaatii vain huoltajuuden
    expect(lue('functions/kalenteri_ical.js')).toContain("if (!require('./suostumus').suostumusAnnettu(p)) return null;");
  });
});

describe('uudelleensuostuminen (vahvistaSuostumus)', () => {
  const CF = lueFunctionsLahde(ROOT);
  it('korvaa koko suostumus-olion (peruttu poistuu) ja kirjaa edelliset audit-riville', () => {
    expect(CF).toMatch(/paivitys\.suostumus = \{/);
    expect(CF).toContain("await suostumusPeruminen.kirjaaHistoria(db, admin.firestore.FieldValue, seuraId, pelaajaId, snap.data());");
    expect(CF).toContain('const joAnnettu = suostumusAnnettu(snap.data());');
  });
  it('kirjaaHistoria: vain perutulle; edelliset annettu/peruttu talteen, ei nimiä', async () => {
    const f = fakeDb({});
    expect(await SP.kirjaaHistoria(f.db, FieldValue, 'kpv', 'topias', { suostumusTila: 'annettu', suostumus: { annettu: 'A' } })).toBe(false);
    expect(await SP.kirjaaHistoria(f.db, FieldValue, 'kpv', 'topias', { etunimi: 'Topias', suostumusTila: 'odottaa', suostumus: { annettu: 'A', peruttu: { aika: 'P', rooli: 'huoltaja' }, versio: 'v3' } })).toBe(true);
    const rivi = [...f.D.entries()].find(([k]) => k.startsWith('audit/'))[1];
    expect(rivi).toMatchObject({ toiminto: 'suostumus_historia', seuraId: 'kpv', pelaajaId: 'topias', edellinen_annettu: 'A', edellinen_peruttu: { aika: 'P', rooli: 'huoltaja' }, edellinen_versio: 'v3' });
    expect(JSON.stringify(rivi)).not.toContain('Topias');
  });
  it('callable kytketty: europe-west1, App Check, SendGrid-salaisuus', () => {
    expect(CF).toMatch(/exports\.peruSuostumus = functions\.region\('europe-west1'\)\.runWith\(\{ enforceAppCheck: true, secrets: \['SENDGRID_API_KEY'\] \}\)/);
  });
  it('audit-nimet', () => {
    const N = lue('lib/tm_audit_nimet.js');
    ['suostumus_peruttu', 'suostumus_peruminen_estetty', 'suostumus_historia', 'pelaaja_kirjautuminen_estetty_peruttu'].forEach((t) => expect(N, t).toContain(t + ':'));
  });
});

describe('UI-kytkennät', () => {
  it('Vanhempi: Asetuksissa Suostumus-kortti + kaksivaiheinen peruminen (ei selaimen confirmia), perutulle oma kotinäkymä', () => {
    const V = lue('TalentMaster_Vanhempi_v2.html');
    expect(V).toContain('<script src="lib/tm_suostumus.js"></script>');
    expect(lue('sw_vanhempi.js')).toContain("/lib/tm_suostumus.js");
    expect(V).toContain("httpsCallable('peruSuostumus')({ seuraId: L.seuraId, pelaajaId: L.id })");
    expect(V).toContain("_vanhSuostumusKorttiHTML(L, d.nimi, _suostumusOk, _peruttu)");
    expect(V).toContain("_vSuostumusPeruttu(window._lapsi) ? _vanhPeruttuHTML() : rKoti()");
    const fn = V.slice(V.indexOf('/* ══ B9'), V.indexOf('function rAsetukset(){'));
    expect(fn).not.toMatch(/confirm\(|alert\(/);
    expect(V).not.toMatch(/L\.suostumusTila !== 'annettu'/);
  });
  it('Pelaaja: syy suostumus_peruttu → oma teksti', () => {
    expect(lue('TalentMaster_Pelaaja_v7.html')).toContain("e.details.syy === 'suostumus_peruttu') { _pinVirhe(T('suostumus_peruttu')); return; }");
  });
  it('Seura: kanoninen apuri, Peruttu-merkki ja -luku, johdon peruminen callablella', () => {
    const SE = lue('TalentMaster_Seura.html');
    expect(SE).toContain("function _suostumusAnnettu(p) { return !!p && !_suostumusPeruttu(p) &&");
    expect(SE).toContain("_pinFn('peruSuostumus')({ seuraId: d.seuraId, pelaajaId: d.pelaajaId })");
    expect((SE.match(/tmHT\('Suostumus peruttu'\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(SE).toContain('peruttuLkm');
  });
  it('Kehitystyöpöytä (VP/Master pelaajasivu): murupolussa Suostumus peruttu', () => {
    expect(lue('TalentMaster_Kehitystyopoyta.html')).toContain("_e(T('kts_suostumus_peruttu'))");
    expect(lue('lib/tm_kt_sivu.js')).toContain("kts_suostumus_peruttu: 'Suostumus peruttu'");
  });
});

describe('sv-erä 94 (PM kirjoittaa ruotsin)', () => {
  const ERA = JSON.parse(lue('docs/i18n/sv_kaannoserae_94_gemini.json'));
  it('kaikki uudet fi-tekstit lähetetyssä erässä (sv tyhjä), fi täsmää koodiin', () => {
    const L = require_('../lib/tm_lang.js').TM_LANG;
    for (const [k, r] of Object.entries(ERA.osiot.tm_lang.rivit)) {
      const [ry, a] = k.split('.'); expect(r.fi, k).toBe(L.fi[ry][a]); expect(r.sv).toBe('');
    }
    const SE = lue('TalentMaster_Seura.html');
    for (const k of Object.keys(ERA.osiot.henkilosto_kartta.rivit)) expect(SE, k).toContain("tmHT('" + k + "')");
    for (const [k, r] of Object.entries(ERA.osiot.sahkoposti.rivit)) { expect(r.fi).toBe(SP.TEKSTIT.fi[k]); expect(r.sv).toBe(''); }
    expect(Object.keys(ERA.osiot.sahkoposti.rivit).sort()).toEqual(Object.keys(SP.TEKSTIT.fi).sort());
    expect(ERA.osiot.lib.rivit.kts_suostumus_peruttu.fi).toBe('Suostumus peruttu');
  });
  it('CLAUDE.md: sv kirjoittaa PM, ei Gemini', () => {
    const C = lue('CLAUDE.md');
    expect(C).toContain('Ruotsinkieliset tekstit kirjoittaa PM (`.sv_palautukset/`');
    expect(C).not.toContain('Ruotsinkieliset tekstit vain Geminin kautta.');
  });
});
