/**
 * Admin audit-loki kuntoon (30.9.2026): haeAuditLoki suodattimet + sivutus, Adminin näkymä,
 * kirjoittajien vartijat. Haku ajetaan muistinvaraista Firestore-tynkää vasten (where / orderBy /
 * limit / startAfter kuten Firestore), CF-runko ja Adminin funktiot vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require_ = createRequire(import.meta.url);
const A = require_(join(ROOT, 'functions', 'auditloki.js'));
const NIMET = require_(join(ROOT, 'lib', 'tm_audit_nimet.js'));
const CF = readFileSync(join(ROOT, 'functions', 'index.js'), 'utf8');
const ADMIN = readFileSync(join(ROOT, 'TalentMaster_Admin.html'), 'utf8');

/* ── Firestore-tynkä: audit-kokoelma muistissa ── */
function tynkaDb(rivit) {
  const docs = rivit.map((r) => ({ id: r.id, data: () => Object.assign({}, r, { aikaleima: { toDate: () => new Date(r.t) } }), _r: r }));
  const loki = { haut: 0, luetut: 0 };
  function kysely(ehdot, raja, alku) {
    return {
      where: (k, op, v) => kysely(ehdot.concat([[k, op, v]]), raja, alku),
      orderBy: () => kysely(ehdot, raja, alku),
      limit: (n) => kysely(ehdot, n, alku),
      startAfter: (d) => kysely(ehdot, raja, d),
      get: async () => {
        loki.haut++;
        let x = docs.filter((d) => ehdot.every(([k, op, v]) => {
          const a = k === 'aikaleima' ? new Date(d._r.t) : d._r[k];
          if (op === '==') return a === v;
          if (op === 'in') return v.indexOf(a) >= 0;
          if (op === '>=') return a >= v;
          if (op === '<=') return a <= v;
          throw new Error(op);
        })).sort((p, q) => q._r.t.localeCompare(p._r.t) || q.id.localeCompare(p.id));
        if (alku) x = x.slice(x.findIndex((d) => d.id === alku.id) + 1);
        x = x.slice(0, raja || x.length);
        loki.luetut += x.length;
        return { docs: x };
      },
    };
  }
  const db = {
    collection: () => Object.assign(kysely([], null, null), {
      doc: (id) => ({ get: async () => { const d = docs.find((y) => y.id === id); return d ? Object.assign({ exists: true }, d) : { exists: false }; } }),
    }),
  };
  return { db, loki };
}
const pv = (n, h) => '2026-09-' + String(n).padStart(2, '0') + 'T' + String(h).padStart(2, '0') + ':00:00.000Z';
function aineisto() {
  const r = [];
  let i = 0;
  // 600 kirjautumisriviä peittää kaiken (kuten tuotannossa Vaihe 0:n jälkeen)
  for (let d = 20; d <= 30; d++) for (let h = 0; h < 24; h++) for (let k = 0; k < 2; k++) {
    if (r.length >= 520) break;
    r.push({ id: 'k' + (i++), t: pv(d, h), toiminto: 'pelaaja_kirjautuminen', severity: 'info', seuraId: d % 2 ? 'kpv' : 'sjk' });
  }
  r.push({ id: 'lukko1', t: pv(29, 10), toiminto: 'pelaaja_kirjautuminen_lukittu', severity: 'alert', seuraId: 'kpv' });
  r.push({ id: 'moni1', t: pv(29, 11), toiminto: 'pelaaja_kirjautuminen', severity: 'alert', seuraId: 'kpv' });   // alert-tason kirjautumisrivi ei piilotu
  r.push({ id: 'epa1', t: pv(28, 19), toiminto: 'suostumuslinkki_epaonnistui', severity: 'warn', seuraId: 'sibbovargarna' });
  r.push({ id: 'epa2', t: pv(29, 8), toiminto: 'suostumuslinkki_epaonnistui', severity: 'warn', seuraId: 'kpv' });
  r.push({ id: 'kutsu1', t: pv(21, 9), toiminto: 'rekisterikutsu_lahetetty', severity: 'info', seuraId: 'kpv' });
  r.push({ id: 'ristiriita1', t: pv(22, 9), toiminto: 'suostumus_estetty_email_ristiriita', severity: 'alert', seuraId: 'sjk' });
  return r;
}
const hae = (db, data) => A.haeAuditRivit(db, A.normalisoiSuodatin(data));

describe('auditloki · suodattimet', () => {
  it('oletus: kirjautumisrivit (info) piilossa → muut rivit löytyvät heti, uusin ensin', async () => {
    const { db } = tynkaDb(aineisto());
    const r = await hae(db, {});
    expect(r.rivit.map((x) => x.id)).toEqual(['moni1', 'lukko1', 'epa2', 'epa1', 'ristiriita1', 'kutsu1']);
    expect(r.seuraava).toBe(null);
  });
  it('piilotaKirjautumiset:false näyttää myös info-kirjautumiset', async () => {
    const { db } = tynkaDb(aineisto());
    const r = await hae(db, { piilotaKirjautumiset: false, limit: 10 });
    expect(r.rivit.some((x) => x.toiminto === 'pelaaja_kirjautuminen' && x.severity === 'info')).toBe(true);
  });
  it('toiminto (Firestore-kysely) + lista (in)', async () => {
    const { db } = tynkaDb(aineisto());
    expect((await hae(db, { toiminto: 'suostumuslinkki_epaonnistui' })).rivit.map((x) => x.id)).toEqual(['epa2', 'epa1']);
    expect((await hae(db, { toiminto: ['suostumuslinkki_epaonnistui', 'rekisterikutsu_lahetetty'] })).rivit.map((x) => x.id)).toEqual(['epa2', 'epa1', 'kutsu1']);
  });
  it('seura, taso (alert / warn+) ja aikaväli', async () => {
    const { db } = tynkaDb(aineisto());
    expect((await hae(db, { seuraId: 'sjk' })).rivit.map((x) => x.id)).toEqual(['ristiriita1']);
    expect((await hae(db, { severity: 'alert' })).rivit.map((x) => x.id)).toEqual(['moni1', 'lukko1', 'ristiriita1']);
    expect((await hae(db, { severity: 'warn+' })).rivit.map((x) => x.id)).toEqual(['moni1', 'lukko1', 'epa2', 'epa1', 'ristiriita1']);
    expect((await hae(db, { alku: '2026-09-28', loppu: '2026-09-28' })).rivit.map((x) => x.id)).toEqual(['epa1']);
  });
  it('tuntemattomat arvot ohitetaan, limit rajataan 1–500', () => {
    const s = A.normalisoiSuodatin({ severity: 'kaikki', alku: 'eilen', limit: 99999 });
    expect([s.severity, s.alku, s.limit, s.piilotaKirjautumiset]).toEqual([null, null, 500, true]);
    expect(A.normalisoiSuodatin({ toiminto: Array.from({ length: 15 }, (_, i) => 't' + i) }).toiminnot).toHaveLength(10);
  });
});

describe('auditloki · sivutus kursorilla', () => {
  it('sivut jatkavat oikein: ei puuttuvia, ei tuplia (kirjautumiset näkyvissä, limit 100)', async () => {
    const aine = aineisto();
    const { db } = tynkaDb(aine);
    const nahty = [];
    let jalkeen = null, sivuja = 0;
    do {
      const r = await hae(db, { piilotaKirjautumiset: false, limit: 100, jalkeen });
      nahty.push(...r.rivit.map((x) => x.id));
      jalkeen = r.seuraava; sivuja++;
    } while (jalkeen && sivuja < 20);
    expect(new Set(nahty).size).toBe(nahty.length);
    expect(nahty.length).toBe(aine.length);
    expect(sivuja).toBe(6);
  });
  it('kursori on viimeisin SKANNATTU rivi: suodatin ei hukkaa rivejä sivujen välissä', async () => {
    const { db } = tynkaDb(aineisto());
    const s1 = await hae(db, { severity: 'warn+', limit: 2 });
    expect(s1.rivit.map((x) => x.id)).toEqual(['moni1', 'lukko1']);
    const s2 = await hae(db, { severity: 'warn+', limit: 2, jalkeen: s1.seuraava });
    expect(s2.rivit.map((x) => x.id)).toEqual(['epa2', 'epa1']);
    const s3 = await hae(db, { severity: 'warn+', limit: 2, jalkeen: s2.seuraava });
    expect(s3.rivit.map((x) => x.id)).toEqual(['ristiriita1']);
    expect(s3.seuraava).toBe(null);
  });
  it('skannauskatto: harva suodatin palauttaa kursorin, jotta haku voi jatkua', async () => {
    const paljon = Array.from({ length: A.SKANNAUSKATTO + 50 }, (_, i) => ({ id: 'x' + String(i).padStart(5, '0'), t: new Date(Date.UTC(2026, 8, 30) - i * 60000).toISOString(), toiminto: 'pelaaja_kirjautuminen', severity: 'info' }));
    paljon.push({ id: 'vanha', t: '2026-01-01T00:00:00.000Z', toiminto: 'kayttaja_luotu', severity: 'info' });
    const { db } = tynkaDb(paljon);
    const r1 = await hae(db, {});
    expect(r1.rivit).toEqual([]);
    expect(r1.skannattu).toBe(A.SKANNAUSKATTO);
    expect(r1.seuraava).toBeTruthy();
    const r2 = await hae(db, { jalkeen: r1.seuraava });
    expect(r2.rivit.map((x) => x.id)).toEqual(['vanha']);
  });
});

describe('haeAuditLoki (CF-runko ajettuna)', () => {
  class HttpsError extends Error { constructor(c, m) { super(m); this.code = c; } }
  function aja(adminData) {
    const i = CF.indexOf('exports.haeAuditLoki = functions');
    const runko = CF.slice(i, CF.indexOf('\n  });', i) + 6);
    const { db: auditDb } = tynkaDb(aineisto());
    const db = { collection: (k) => (k === 'admins'
      ? { doc: () => ({ get: async () => ({ exists: !!adminData, data: () => adminData }) }) }
      : auditDb.collection(k)) };
    const ketju = { region() { return ketju; }, https: { onCall: (f) => f, HttpsError } };
    const ctx = { functions: ketju, exports: {}, db, auditloki: A };
    vm.createContext(ctx);
    vm.runInContext(runko, ctx);
    return ctx.exports.haeAuditLoki;
  }
  it('ei-SA → permission-denied; kirjautumaton → unauthenticated', async () => {
    await expect(aja(null)({}, { auth: { uid: 'vp' } })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(aja({ rooli: 'vp' })({}, { auth: { uid: 'vp' } })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(aja(null)({}, {})).rejects.toMatchObject({ code: 'unauthenticated' });
  });
  it('SA → rivit + kursori + skannattu', async () => {
    const r = await aja({ superAdmin: true })({ toiminto: 'suostumuslinkki_epaonnistui' }, { auth: { uid: 'sa' } });
    expect(r.ok).toBe(true);
    expect(r.rivit.map((x) => x.id)).toEqual(['epa2', 'epa1']);
    expect(r).toHaveProperty('seuraava', null);
  });
  it('composite-indeksi (toiminto ASC, aikaleima DESC) on firestore.indexes.json:ssa', () => {
    const ix = JSON.parse(readFileSync(join(ROOT, 'firestore.indexes.json'), 'utf8')).indexes;
    expect(ix.some((x) => x.collectionGroup === 'audit' && JSON.stringify(x.fields) === JSON.stringify([
      { fieldPath: 'toiminto', order: 'ASCENDING' }, { fieldPath: 'aikaleima', order: 'DESCENDING' }]))).toBe(true);
  });
});

/* ── Kirjoittajien vartijat ── */
function kirjoittajienToiminnot() {
  const lahteet = readdirSync(join(ROOT, 'functions')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(ROOT, 'functions', f), 'utf8'))
    .concat(readdirSync(join(ROOT, 'scripts')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(ROOT, 'scripts', f), 'utf8')));
  const t = new Set();
  for (const s of lahteet) {
    for (const m of s.matchAll(/collection\('audit'\)\.add\(([\s\S]{0,400}?)\)\s*[.;]/g)) {
      const tt = /toiminto:\s*'([a-z_]+)'/.exec(m[1]); if (tt) t.add(tt[1]);
    }
    for (const m of s.matchAll(/rakennaAuditPayload\(\{\s*tyyppi:\s*'([a-z_]+)'/g)) t.add(m[1]);
    for (const m of s.matchAll(/auditEtuliite:\s*'([a-z_]+)'/g)) ['', '_lukittu', '_moniselitteinen'].forEach((x) => t.add(m[1] + x));
    // apufunktiokutsut: audit('pin_asetettu', …) (pelaajapin.js ym.)
    for (const m of s.matchAll(/\baudit\(\s*'([a-z_]+)'/g)) t.add(m[1]);
    // monirivinen tai Object.assign-muoto: kaikki toiminto: '…' -literaalit audit-kirjoituksen läheltä
    for (const m of s.matchAll(/collection\('audit'\)\.(?:add|doc)\(([\s\S]{0,900}?)\)\s*[.;]/g)) {
      for (const tt of m[1].matchAll(/toiminto:\s*'([a-z_]+)'/g)) t.add(tt[1]);
    }
  }
  return [...t].sort();
}
describe('vartijat: audit-kirjoittajat', () => {
  it('jokaiselle kirjoitettavalle toiminnolle on selkokielinen nimi (lib/tm_audit_nimet.js)', () => {
    const t = kirjoittajienToiminnot();
    expect(t.length).toBeGreaterThanOrEqual(20);
    expect(t.filter((x) => !NIMET.NIMET[x]), 'puuttuvat nimet').toEqual([]);
  });
  it('vartija löytää mainiin tulleet toiminnot (apufunktio- ja monirivikirjoittajat), ei vain index.js:n .add({toiminto})', () => {
    const t = kirjoittajienToiminnot();
    ['pin_asetettu', 'pinit_luotu', 'suostumus_estetty_pelaaja_ristiriita', 'suostumus_estetty_email_ristiriita',
      'pelaaja_kirjautuminen_lukittu', 'gdpr_rtbf', 'lupapyynto_tulos_siirto'].forEach((x) => expect(t).toContain(x));
  });
  it('selkokieliset nimet (Teron linjaus 1.10.2026)', () => {
    expect(NIMET.NIMET.pin_asetettu).toBe('PIN asetettu');
    expect(NIMET.NIMET.pinit_luotu).toBe('PIN-koodit luotu (massa)');
    expect(NIMET.NIMET.suostumus_estetty_pelaaja_ristiriita).toBe('⚠ Suostumus estetty: lomake koskee eri pelaajaa');
    expect(NIMET.MERKINNAT.lomake_poikkeama).toBe('⚠ Suostumuslomakkeessa poikkeama');
  });
  it('lomake_poikkeama: suostumus_annettu-rivi saa poikkeamanimen; ilman poikkeamaa tavallinen nimi', () => {
    expect(NIMET.rivinNimi({ toiminto: 'suostumus_annettu', severity: 'warn', lomake_poikkeama: ['etunimi'] })).toBe('⚠ Suostumuslomakkeessa poikkeama (etunimi)');
    expect(NIMET.rivinNimi({ toiminto: 'suostumus_annettu', severity: 'info', lomake_poikkeama: [] })).toBe('Suostumus annettu');
    expect(NIMET.rivinNimi({ toiminto: 'tuntematon_x' })).toBe('tuntematon_x');
  });
  it('poikkeamarivi on warn → näkyy "Varoitukset ja hälytykset" -tasolla (CF asettaa severityn poikkeamasta)', () => {
    expect(CF).toMatch(/toiminto: 'suostumus_annettu', severity: kohde\.poikkeama\.length \? 'warn' : 'info'/);
    expect(A.riviKelpaa({ toiminto: 'suostumus_annettu', severity: 'warn' }, A.normalisoiSuodatin({ taso: 'warn+' }))).toBe(true);
  });
  it('jokainen functions/index.js:n audit-kirjoitus asettaa aikaleiman ja severityn', () => {
    const puuttuu = [];
    for (const m of CF.matchAll(/collection\('audit'\)\.add\(/g)) {
      const blokki = CF.slice(m.index, m.index + 700);
      const loppu = blokki.search(/\}\)\)?\s*\.catch|\}\);|\)\);/);
      const b = blokki.slice(0, loppu > 0 ? loppu + 3 : 700);
      const rivi = CF.slice(0, m.index).split('\n').length;
      if (!/aikaleima/.test(b)) puuttuu.push(rivi + ':aikaleima');
      // severity suoraan, rakennaAuditPayloadin kautta, tai kirjautumisytimen tiedot-argumentissa (aina severity)
      if (!/severity|rakennaAuditPayload|toiminto, aikaleima/.test(b)) puuttuu.push(rivi + ':severity');
    }
    expect(puuttuu).toEqual([]);
  });
  it('kirjautumisydin antaa aina severityn audit-tiedoissa', () => {
    const K = readFileSync(join(ROOT, 'functions', 'pelaajakirjautuminen.js'), 'utf8');
    const kutsut = [...K.matchAll(/await audit\(([^;]+)\);/g)].map((m) => m[1]);
    expect(kutsut.length).toBeGreaterThanOrEqual(3);
    expect(kutsut.filter((k) => !/severity/.test(k))).toEqual([]);
  });
});

/* ── Admin-näkymä ── */
function ajaAdmin() {
  const i = ADMIN.indexOf('const _audit = {');
  const j = ADMIN.indexOf('async function renderAudit(alue) {');
  const k = ADMIN.indexOf('function _auditEsc(s) {');
  const koodi = ADMIN.slice(i, j) + ADMIN.slice(k, ADMIN.indexOf('\n}\n', k) + 2);
  const ctx = { window: { TM_AUDIT_NIMET: NIMET }, document: { getElementById: () => null }, Blob, URL, setTimeout };
  vm.createContext(ctx);
  vm.runInContext(koodi + '\nthis._audit = _audit; this.par = _auditParametrit; this.csv = _auditCsv; this.nimi = _auditNimi;', ctx);
  return ctx;
}
describe('Admin · Audit-loki-näkymä', () => {
  it('parametrit: oletus piilottaa kirjautumiset; pikanapin lista lähtee taulukkona; kursori jatkossa', () => {
    const c = ajaAdmin();
    expect(c.par(false)).toEqual({ limit: 100, piilotaKirjautumiset: true });
    Object.assign(c._audit, { toiminto: 'suostumuslinkki_epaonnistui|muu_epaonnistui', seuraId: 'kpv', taso: 'warn+', alku: '2026-09-01', kirjautumiset: true, seuraava: 'abc' });
    expect(c.par(true)).toEqual({ limit: 100, piilotaKirjautumiset: false, toiminto: ['suostumuslinkki_epaonnistui', 'muu_epaonnistui'],
      seuraId: 'kpv', severity: 'warn+', alku: '2026-09-01', jalkeen: 'abc' });
  });
  it('CSV: otsikko, selkokielinen nimi, lainausmerkit ja ;-erotin', () => {
    const c = ajaAdmin();
    const csv = c.csv([{ id: 'a1', aikaleima: '2026-09-28T19:53:14.000Z', toiminto: 'suostumuslinkki_epaonnistui', severity: 'warn', seuraId: 'kpv', pelaajaId: 'p1', hEmail: 'x;y@z.fi' }]);
    const r = csv.replace(/^﻿/, '').trim().split('\n');
    expect(r[0]).toBe('aika;toiminto;nimi;severity;seuraId;kohde;tekija;id');
    expect(r[1]).toBe('2026-09-28T19:53:14.000Z;suostumuslinkki_epaonnistui;⚠ Tunnusten lähetys epäonnistui;warn;kpv;"p1 · x;y@z.fi";—;a1');
  });
  it('CSV-injektio: = + - @ sarkain ja rivinvaihto alussa → etuliite \' (kaava ei suoritu Excelissä)', () => {
    const c = ajaAdmin();
    const rivi = (antaja) => c.csv([{ id: 'x', toiminto: 'suostumus_annettu', antaja }]).replace(/^\ufeff/, '').trim().split('\n').slice(1).join('\n');
    expect(rivi('=HYPERLINK("http://paha","klikkaa")')).toContain(`;"'=HYPERLINK(""http://paha"",""klikkaa"")";`);
    expect(rivi('+SUM(1,2)')).toContain(";'+SUM(1,2);");
    expect(rivi('-2+3')).toContain(";'-2+3;");
    expect(rivi('@cmd')).toContain(";'@cmd;");
    expect(rivi('\tTAB')).toContain(";'\tTAB;");
    expect(rivi('\n=1')).toContain(`;"'\n=1";`);
    expect(rivi('Matti Meikäläinen')).toContain(';Matti Meikäläinen;');   // tavallinen arvo ennallaan
  });
  it('CSV-napin vieressä henkilötietohuomautus; sähköpostit säilyvät (ei peittämistä)', () => {
    expect(ADMIN).toContain('Sisältää henkilötietoja, säilytä turvallisesti ja poista, kun et enää tarvitse');
    const c = ajaAdmin();
    expect(c.csv([{ id: 'x', toiminto: 'suostumuslinkki_epaonnistui', hEmail: 'huoltaja@x.fi' }])).toContain('huoltaja@x.fi');
  });
  it('tuntematon toiminto näytetään teknisellä nimellä; nimikirjasto ladataan sivulle', () => {
    expect(ajaAdmin().nimi('outo_toiminto')).toBe('outo_toiminto');
    expect(ADMIN).toContain('<script src="lib/tm_audit_nimet.js?v=2"></script>');
    expect(ADMIN).toContain("_auditPika('epaonnistuneet')");
    expect(ADMIN).toContain("_auditPika('halytykset')");
    expect(ADMIN).not.toContain('limit: 200');
  });
});
