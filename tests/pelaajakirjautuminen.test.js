/**
 * Vaihe 0 / PR 1 — pelaajaKirjaudu (functions/pelaajakirjautuminen.js).
 * Puhtaat osat suoraan; käsittelijä AJETAAN tynkä-Firestorella (collectionGroup, get/set/delete)
 * ja tynkä-authilla (createCustomToken tallentaa uid + claimit).
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const K = require('../functions/pelaajakirjautuminen.js');

class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

function tynka(pelaajat, pinHashit, tynkaOpts) {
  const paivitykset = [];   // S1.1: seurat/{sid}/pelaajat/{pid}.update(...)
  // Suostumus ennen kirjautumista (1.10.2026): fixturet ovat suostumuksen antaneita, ellei data kerro muuta.
  pelaajat = pelaajat.map((p) => Object.assign({}, p, { data: Object.assign({ suostumusTila: 'annettu' }, p.data) }));
  const kokoelmat = { _kirjautumisyritykset: new Map(), _pelaajaPin: new Map(pinHashit || []) };
  const kirjoita = (kok, id, d, opts) => {
    if (opts && opts.merge) {
      const vanha = Object.assign({}, kokoelmat[kok].get(id) || {});
      Object.keys(d).forEach((k) => {
        const v = d[k];
        vanha[k] = (v && v.__inc != null) ? (vanha[k] || 0) + v.__inc : v;
      });
      kokoelmat[kok].set(id, vanha);
    } else kokoelmat[kok].set(id, d);
  };
  const docRef = (kok, id) => ({
    _kok: kok, _id: id,
    get: async () => ({ exists: kokoelmat[kok].has(id), data: () => kokoelmat[kok].get(id) }),
    set: async (d, opts) => { kirjoita(kok, id, d, opts); },
    delete: async () => { kokoelmat[kok].delete(id); },
  });
  /* Transaktio mallinnetaan SARJOITETTUNA (kuten Firestore: rinnakkaiset konfliktoivat ja ajetaan
     uudelleen → lopputulos on sarjallinen). Kirjoitukset puskuroidaan ja tehdään lopussa. */
  let lukko = Promise.resolve();
  const runTransaction = (fn) => {
    const ajo = lukko.then(async () => {
      const puskuri = [];
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, d, opts) => { puskuri.push([ref, d, opts]); },
      };
      const tulos = await fn(tx);
      puskuri.forEach(([ref, d, opts]) => kirjoita(ref._kok, ref._id, d, opts));
      return tulos;
    });
    lukko = ajo.catch(() => {});
    return ajo;
  };
  let cgKyselyt = 0;
  const db = {
    runTransaction,
    collection: (kok) => ({ doc: (id) => (kok === 'seurat'
      // Linkkireitti: seurat/{sid}/pelaajat/{pid}.get() — vain seurojen pelaajat (ei Solo-juurta).
      ? { collection: () => ({ doc: (pid) => ({ get: async () => {
          const p = pelaajat.find((x) => x.seuraId === id && x.pelaajaId === pid && (x.juuri || 'seurat') === 'seurat');
          return { exists: !!p, data: () => (p ? p.data : undefined) };
        }, update: async (d) => {
          if (tynkaOpts && tynkaOpts.updateHeittaa) throw new Error('mock update-virhe');
          paivitykset.push({ seuraId: id, pelaajaId: pid, d: Object.assign({}, d) });
          const p = pelaajat.find((x) => x.seuraId === id && x.pelaajaId === pid); if (p) Object.assign(p.data, d);
        } }) }) }
      : docRef(kok, id)) }),
    collectionGroup: () => ({
      where: (kentta, _op, arvo) => ({
        limit: () => ({
          get: async () => (cgKyselyt++, {
            docs: pelaajat.filter((p) => p.data[kentta] === arvo).map((p) => ({
              id: p.pelaajaId, data: () => p.data,
              ref: { parent: { parent: { id: p.seuraId, parent: { id: p.juuri || 'seurat' } } } },
            })),
          }),
        }),
      }),
    }),
  };
  const tokenit = [];
  const auth = { createCustomToken: async (uid, claims) => { tokenit.push({ uid, claims }); return 'TOKEN'; } };
  const audit = []; let nyt = 1_000_000;
  const FieldValue = { increment: (n) => ({ __inc: n }) };
  const f = K.luoKasittelija({ db, auth, HttpsError, FieldValue, audit: async (t, x) => audit.push([t, x]), nyt: () => nyt });
  return { f, tokenit, audit, kokoelmat, paivitykset, siirra: (ms) => { nyt += ms; }, cg: () => cgKyselyt };
}
const TOPIAS = { seuraId: 'kpv', pelaajaId: 'm93', data: { tunniste: '12345678', pin: '9278' } };
const ctx = { rawRequest: { ip: '1.2.3.4' } };
const virhe = async (p) => { try { await p; return null; } catch (e) { return e; } };

describe('pelaajakirjautuminen · puhtaat osat', () => {
  it('tunnuksen normalisointi: välilyönnit ja väliviivat pois, tyhjä/outo → null', () => {
    expect(K.normalisoiTunnus(' 1234 5678 ')).toBe('12345678');
    expect(K.normalisoiTunnus('1234-5678')).toBe('12345678');
    expect(K.normalisoiTunnus('se12ab')).toBe('SE12AB');
    expect(K.normalisoiTunnus('')).toBeNull();
    expect(K.normalisoiTunnus('12;drop')).toBeNull();
    expect(K.normalisoiPin('9278')).toBe('9278');
    expect(K.normalisoiPin('92a8')).toBeNull();
    expect(K.normalisoiPin('123')).toBeNull();
  });
  it('lukitus: 5 väärää → lukittu 15 min, jonka jälkeen auki ja laskuri nollautuu', () => {
    let t = null; const nyt = 0;
    for (let i = 0; i < 4; i++) { t = K.kirjaaVirhe(t, nyt); expect(K.onLukittu(t, nyt)).toBe(false); }
    t = K.kirjaaVirhe(t, nyt);
    expect(K.onLukittu(t, nyt)).toBe(true);
    expect(K.onLukittu(t, nyt + K.LUKITUS_MS - 1)).toBe(true);
    expect(K.onLukittu(t, nyt + K.LUKITUS_MS)).toBe(false);
    const jalkeen = K.kirjaaVirhe(t, nyt + K.LUKITUS_MS);
    expect(jalkeen.virheet).toBe(1);
  });
  it('IP-katto: 30 väärää ikkunassa → estetty, ikkunan jälkeen nollautuu', () => {
    let t = null;
    for (let i = 0; i < K.IP_KATTO; i++) t = K.kirjaaIpVirhe(t, 0);
    expect(K.ipYlittyy(t, 1)).toBe(true);
    expect(K.ipYlittyy(t, 15 * 60 * 1000 + 1)).toBe(false);
  });
  it('scrypt-hajautus: oikea PIN täsmää, väärä ei; suola vaihtuu', () => {
    const h1 = K.hajautaPin('9278'), h2 = K.hajautaPin('9278');
    expect(h1).not.toBe(h2);
    expect(K.tarkistaPin('9278', h1)).toBe(true);
    expect(K.tarkistaPin('9279', h1)).toBe(false);
    expect(K.tarkistaPin('9278', 'roskaa')).toBe(false);
  });
  it('claim on pelaajaSeuraId — EI seuraId (onOmaSeura ei saa aueta pelaajalle)', () => {
    const c = K.pelaajaClaims('kpv', 'm93');
    expect(c).toEqual({ rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'm93' });
    expect(Object.keys(c)).not.toContain('seuraId');
    expect(K.pelaajaUid('kpv', 'm93')).toBe('pel_kpv_m93');
  });
});

describe('pelaajakirjautuminen · käsittelijä (ajettu tyngällä)', () => {
  it('oikea PalloID + PIN → token oikeilla claimeilla; vanha PIN siirretään hajautukseksi', async () => {
    const t = tynka([TOPIAS]);
    const r = await t.f({ liittoTunnus: '1234 5678', pin: '9278' }, ctx);
    expect(r).toEqual({ token: 'TOKEN', seuraId: 'kpv', pelaajaId: 'm93', palloId: '12345678' });
    expect(t.tokenit).toEqual([{ uid: 'pel_kpv_m93', claims: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'm93' } }]);
    const h = t.kokoelmat._pelaajaPin.get('kpv_m93');
    expect(h.hash).toMatch(/^scrypt\$/);
    expect(K.tarkistaPin('9278', h.hash)).toBe(true);
  });

  it('hajautus olemassa → käytetään sitä (vanha pin-kenttä ei enää ratkaise)', async () => {
    const t = tynka([{ ...TOPIAS, data: { tunniste: '12345678', pin: '0000' } }], [['kpv_m93', { hash: K.hajautaPin('9278') }]]);
    await expect(t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)).resolves.toMatchObject({ pelaajaId: 'm93' });
    expect((await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx))).code).toBe('unauthenticated');
  });

  it('väärä PIN ja tuntematon tunnus → SAMA virhe (ei kerro kumpi osa oli väärin)', async () => {
    const t = tynka([TOPIAS]);
    const a = await virhe(t.f({ liittoTunnus: '12345678', pin: '1111' }, ctx));
    const b = await virhe(t.f({ liittoTunnus: '99999999', pin: '9278' }, ctx));
    expect([a.code, a.message]).toEqual(['unauthenticated', K.VIRHE_TUNNISTUS]);
    expect([b.code, b.message]).toEqual(['unauthenticated', K.VIRHE_TUNNISTUS]);
    expect(t.tokenit).toEqual([]);
  });

  it('5 väärää → lukittu: oikeakaan PIN ei kelpaa 15 min, audit-hälytys; sen jälkeen onnistuu', async () => {
    const t = tynka([TOPIAS]);
    for (let i = 0; i < 5; i++) await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx));
    expect(t.audit.map((x) => x[0])).toContain('pelaaja_kirjautuminen_lukittu');
    const e = await virhe(t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx));
    expect([e.code, e.message]).toEqual(['resource-exhausted', K.VIRHE_LUKITTU]);
    t.siirra(K.LUKITUS_MS);
    await expect(t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)).resolves.toMatchObject({ pelaajaId: 'm93' });
  });

  it('lukitus on TUNNUSKOHTAINEN: toisen pelaajan kirjautuminen toimii', async () => {
    const t = tynka([TOPIAS, { seuraId: 'kpv', pelaajaId: 'p2', data: { tunniste: '22222222', pin: '1234' } }]);
    for (let i = 0; i < 5; i++) await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, { rawRequest: { ip: '9.9.9.' + i } }));
    await expect(t.f({ liittoTunnus: '22222222', pin: '1234' }, ctx)).resolves.toMatchObject({ pelaajaId: 'p2' });
  });

  it('sama PalloID kahdessa seurassa: PIN ratkaisee; jos PIN täsmää molempiin → hylätään + audit', async () => {
    const A = { seuraId: 'kpv', pelaajaId: 'a', data: { tunniste: '55555555', pin: '1111' } };
    const B = { seuraId: 'sjk', pelaajaId: 'b', data: { tunniste: '55555555', pin: '2222' } };
    const t = tynka([A, B]);
    await expect(t.f({ liittoTunnus: '55555555', pin: '2222' }, ctx)).resolves.toMatchObject({ seuraId: 'sjk', pelaajaId: 'b' });
    const t2 = tynka([A, { ...B, data: { tunniste: '55555555', pin: '1111' } }]);
    expect((await virhe(t2.f({ liittoTunnus: '55555555', pin: '1111' }, ctx))).code).toBe('unauthenticated');
    expect(t2.audit.map((x) => x[0])).toContain('pelaaja_kirjautuminen_moniselitteinen');
  });

  it('Solo-`pelaajat` (ei seurat-alla) ohitetaan', async () => {
    const t = tynka([{ seuraId: 'x', pelaajaId: 'solo', juuri: 'players', data: { tunniste: '77777777', pin: '1234' } }]);
    expect((await virhe(t.f({ liittoTunnus: '77777777', pin: '1234' }, ctx))).code).toBe('unauthenticated');
  });

  it('pelaaja ilman PIN:iä ei kirjaudu', async () => {
    const t = tynka([{ seuraId: 'kpv', pelaajaId: 'x', data: { tunniste: '88888888' } }]);
    expect((await virhe(t.f({ liittoTunnus: '88888888', pin: '0000' }, ctx))).code).toBe('unauthenticated');
  });
});

describe('pelaajaKirjaudu · kytkentä index.js:ään', () => {
  const fs = require('fs'); const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  it('App Check pakollinen, europe-west1', () => {
    const i = src.indexOf('exports.pelaajaKirjaudu = functions');
    const blok = src.slice(i, i + 400);
    expect(blok).toContain(".region('europe-west1')");
    expect(blok).toContain('enforceAppCheck: true');
  });
  it('kuittaaKaavioYmmarretty hylkää pelaajatokenilla eri pelaajan', () => {
    const i = src.indexOf('exports.kuittaaKaavioYmmarretty');
    const blok = src.slice(i, i + 1400);
    expect(blok).toContain('kuittausPaatos(context.auth, seuraId, pelaajaId)');   // PR 3: ajotesti tests/vaihe0_pr3_callablet.test.js
  });
});

describe('pelaajakirjautuminen · rinnakkaisuus ja ajoitus (review #675)', () => {
  it('20 RINNAKKAISTA väärää yritystä → ≥15 resource-exhausted, PIN tarkistetaan korkeintaan 5 kertaa', async () => {
    const t = tynka([TOPIAS]);
    const tulokset = await Promise.all(Array.from({ length: 20 }, (_, i) =>
      virhe(t.f({ liittoTunnus: '12345678', pin: String(1000 + i) }, { rawRequest: { ip: '10.0.0.' + i } }))));
    const lukittu = tulokset.filter((e) => e && e.code === 'resource-exhausted').length;
    const tarkistettu = t.cg() / 3;               // haeEhdokkaat = 3 kokoelmaryhmäkyselyä / tarkistus
    expect(lukittu).toBeGreaterThanOrEqual(15);
    expect(tarkistettu).toBeLessThanOrEqual(5);
    expect(t.tokenit).toEqual([]);
  });

  it('EI VACUOUS: sarjallinen 5 yritystä kulkee tarkistukseen asti (varaus ei estä liikaa)', async () => {
    const t = tynka([TOPIAS]);
    for (let i = 0; i < 5; i++) await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx));
    expect(t.cg() / 3).toBe(5);
  });

  it('onnistunut kirjautuminen nollaa tunnuksen laskurin ja palauttaa IP-varauksen', async () => {
    const t = tynka([TOPIAS]);
    await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx));
    await t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx);
    const avaimet = Array.from(t.kokoelmat._kirjautumisyritykset.keys());
    expect(avaimet.filter((k) => k.startsWith('t_'))).toEqual([]);
    const ip = t.kokoelmat._kirjautumisyritykset.get(avaimet.find((k) => k.startsWith('ip_')));
    expect(ip.virheet, '1 väärä jää, onnistunut palautetaan').toBe(1);
  });

  it('tuntematon tunnus ajaa näennäisen scryptin — sama määrä scrypt-laskentaa kuin tunnetulla väärällä PIN:llä', async () => {
    /* Deterministinen: lasketaan scryptSync-kutsut (ajastus olisi epävakaa kuormassa). */
    const crypto = require('crypto');
    const alkup = crypto.scryptSync;
    let n = 0;
    crypto.scryptSync = function () { n++; return alkup.apply(this, arguments); };
    try {
      const tuntematon = tynka([]);
      await virhe(tuntematon.f({ liittoTunnus: '99999999', pin: '1234' }, ctx));
      const nTuntematon = n; n = 0;
      const tunnettu = tynka([TOPIAS], [['kpv_m93', { hash: K.hajautaPin('9278') }]]);
      n = 0;
      await virhe(tunnettu.f({ liittoTunnus: '12345678', pin: '1111' }, ctx));
      const nTunnettu = n; n = 0;
      const selko = tynka([TOPIAS]);   // vain vanha selkoteksti-PIN → ei hajautusta → näennäinen ajetaan
      await virhe(selko.f({ liittoTunnus: '12345678', pin: '1111' }, ctx));
      expect(nTuntematon).toBe(1);
      expect(nTunnettu).toBe(1);
      expect(n).toBe(1);
    } finally { crypto.scryptSync = alkup; }
  });

  it('lähde: varaus transaktiossa ENNEN ehdokashakua ja PIN-tarkistusta', () => {
    const fs = require('fs'); const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'pelaajakirjautuminen.js'), 'utf8');
    const iTx = src.indexOf('await db.runTransaction(');
    expect(iTx).toBeGreaterThan(0);
    expect(src.indexOf('await malli.haeEhdokkaat(db, tunnus)')).toBeGreaterThan(iTx);
    expect(src).toContain('if (!scryptAjettu) tarkistaPin(pin, NAENNAINEN_HAJAUTUS)');
  });
});

/* ── KIRJAUTUMISEN HELPOTUS · linkkireitti { seuraId, pelaajaId, pin } ── */
describe('pelaajaKirjaudu · linkkireitti (seuraId + pelaajaId + PIN)', () => {
  const L = (pin, o) => Object.assign({ seuraId: 'kpv', pelaajaId: 'm93', pin }, o || {});
  it('oikea PIN → token SAMOILLA claimeilla kuin PalloID-reitillä + PalloID palautetaan laitteelle', async () => {
    const t = tynka([TOPIAS]);
    const r = await t.f(L('9278'), ctx);
    expect(r).toEqual({ token: 'TOKEN', seuraId: 'kpv', pelaajaId: 'm93', palloId: '12345678' });
    const t2 = tynka([TOPIAS]);
    await t2.f({ liittoTunnus: '12345678', pin: '9278' }, ctx);
    expect(t.tokenit).toEqual(t2.tokenit);
    expect(t.tokenit[0]).toEqual({ uid: 'pel_kpv_m93', claims: { rooli: 'pelaaja', pelaajaSeuraId: 'kpv', pelaajaId: 'm93' } });
    expect(t.kokoelmat._pelaajaPin.get('kpv_m93').hash).toMatch(/^scrypt\$/);   // sama hajautus + siirtymä
    expect(t.audit.at(-1)).toEqual(['pelaaja_kirjautuminen', { severity: 'info', seuraId: 'kpv', pelaajaId: 'm93', reitti: 'linkki' }]);
  });
  it('PalloID-reitti palauttaa myös PalloID:n (laite muistaa sen)', async () => {
    const r = await tynka([TOPIAS]).f({ liittoTunnus: '1234 5678', pin: '9278' }, ctx);
    expect(r.palloId).toBe('12345678');
  });
  it('väärä PIN ja tuntematon pelaajaId → SAMA virhe, scrypt ajetaan kummassakin', async () => {
    const crypto = require('crypto');
    const orig = crypto.scryptSync; let n = 0;
    crypto.scryptSync = function () { n++; return orig.apply(this, arguments); };
    try {
      const t = tynka([TOPIAS], [['kpv_m93', { hash: K.hajautaPin('9278') }]]);
      n = 0; const e1 = await t.f(L('1111'), ctx).catch((e) => e); const nVaara = n;
      n = 0; const e2 = await t.f(L('1111', { pelaajaId: 'eiole' }), ctx).catch((e) => e); const nTuntematon = n;
      expect([e1.code, e1.message]).toEqual(['unauthenticated', K.VIRHE_TUNNISTUS]);
      expect([e2.code, e2.message]).toEqual(['unauthenticated', K.VIRHE_TUNNISTUS]);
      expect(nVaara).toBe(1);
      expect(nTuntematon).toBe(1);
    } finally { crypto.scryptSync = orig; }
  });
  it('5 väärää → lukittu (oikeakaan PIN ei kelpaa), 15 min jälkeen onnistuu', async () => {
    const t = tynka([TOPIAS]);
    for (let i = 0; i < 5; i++) await t.f(L('0000'), ctx).catch(() => {});
    await expect(t.f(L('9278'), ctx)).rejects.toMatchObject({ code: 'resource-exhausted' });
    expect(t.audit.some(([n]) => n === 'pelaaja_kirjautuminen_lukittu')).toBe(true);
    t.siirra(K.LUKITUS_MS + 1);
    await expect(t.f(L('9278'), ctx)).resolves.toMatchObject({ token: 'TOKEN' });
  });
  it('20 RINNAKKAISTA väärää → ≥15 resource-exhausted', async () => {
    const t = tynka([TOPIAS]);
    const ctxt = Array.from({ length: 20 }, (_, i) => ({ rawRequest: { ip: '10.0.0.' + i } }));
    const tul = await Promise.all(ctxt.map((c) => t.f(L('0000'), c).then(() => 'ok', (e) => e.code)));
    expect(tul.filter((c) => c === 'resource-exhausted').length).toBeGreaterThanOrEqual(15);
    expect(tul).not.toContain('ok');
  });
  /* PR 4 · kohta 3: PELAAJAKOHTAINEN lukitus on yhteinen molemmille reiteille (ennen 5 + 5 yritystä). */
  it('PR 4: 3 väärää PalloID-reitillä + 3 väärää linkkireitillä samalle pelaajalle → 6. yritys lukittu (oikeakin PIN)', async () => {
    const t = tynka([TOPIAS]);
    for (let i = 0; i < 3; i++) await expect(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx)).rejects.toMatchObject({ code: 'unauthenticated' });
    for (let i = 0; i < 2; i++) await expect(t.f(L('0000'), ctx)).rejects.toMatchObject({ code: 'unauthenticated' });   // 5. väärä → p_ lukittuu
    await expect(t.f(L('9278'), ctx)).rejects.toMatchObject({ code: 'resource-exhausted' });   // 6. yritys (linkki) lukittu, oikeakin PIN
    await expect(t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)).rejects.toMatchObject({ code: 'resource-exhausted' });
    expect(t.audit.filter(([n, x]) => n === 'pelaaja_kirjautuminen_lukittu' && x.avain === 'pelaaja')).toHaveLength(1);
    t.siirra(K.LUKITUS_MS + 1);
    await expect(t.f(L('9278'), ctx)).resolves.toMatchObject({ token: 'TOKEN' });
  });
  it('pelaajalukitus EI koske toista pelaajaa; onnistuminen nollaa pelaajalaskurin', async () => {
    const TOINEN = { seuraId: 'kpv', pelaajaId: 'x2', data: { tunniste: '87654321', pin: '1111' } };
    const t = tynka([TOPIAS, TOINEN]);
    for (let i = 0; i < 5; i++) await t.f(L('0000'), ctx).catch(() => {});
    await expect(t.f(L('1111', { pelaajaId: 'x2' }), ctx)).resolves.toMatchObject({ token: 'TOKEN' });
    const t2 = tynka([TOPIAS]);
    for (let i = 0; i < 4; i++) await t2.f(L('0000'), ctx).catch(() => {});
    await t2.f(L('9278'), ctx);
    expect(t2.kokoelmat._kirjautumisyritykset.has(K.pelaajaLukitusAvain('kpv', 'm93'))).toBe(false);
    for (let i = 0; i < 4; i++) await t2.f({ liittoTunnus: '12345678', pin: '0000' }, ctx).catch(() => {});
    await expect(t2.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)).resolves.toMatchObject({ token: 'TOKEN' });
  });
  it('PR 4: 4- ja 6-numeroinen PIN kelpaavat, muut pituudet → invalid-argument', async () => {
    const KUUSI = { seuraId: 'kpv', pelaajaId: 'k6', data: { tunniste: '55555555' } };
    const t = tynka([KUUSI], [['kpv_k6', { hash: K.hajautaPin('482915') }]]);
    await expect(t.f({ liittoTunnus: '55555555', pin: '482915' }, ctx)).resolves.toMatchObject({ token: 'TOKEN' });
    await expect(tynka([TOPIAS]).f(L('9278'), ctx)).resolves.toMatchObject({ token: 'TOKEN' });
    for (const huono of ['123', '12345', '1234567']) {
      await expect(tynka([TOPIAS]).f(L(huono), ctx)).rejects.toMatchObject({ code: 'invalid-argument' });
    }
  });
  it('Solo-juuren `pelaajat` ja polkuinjektio eivät kelpaa', async () => {
    const solo = { seuraId: 'kpv', pelaajaId: 'x1', juuri: 'players', data: { pin: '1234' } };
    await expect(tynka([solo]).f(L('1234', { pelaajaId: 'x1' }), ctx)).rejects.toMatchObject({ code: 'unauthenticated' });
    for (const huono of ['a/b', '..', '__x__', '']) {
      await expect(tynka([TOPIAS]).f(L('9278', { pelaajaId: huono }), ctx)).rejects.toMatchObject({ code: 'invalid-argument' });
    }
  });
});



describe('S1.1 · pelaajaKirjaudu kirjoittaa viimeisinKirjautuminen palvelimella', () => {
  const PV = (ms) => K.helsinginPaiva(ms);
  const uusi = (data, opts) => tynka([{ seuraId: 'kpv', pelaajaId: 'm93', data: Object.assign({ tunniste: '12345678', pin: '9278' }, data || {}) }], undefined, opts);
  it('onnistunut kirjautuminen kirjoittaa Helsingin päivän (YYYY-MM-DD) pelaajadokumenttiin — vain tämä kenttä', async () => {
    const t = uusi(); const v = await t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx);
    expect(v.token).toBe('TOKEN');
    expect(t.paivitykset).toEqual([{ seuraId: 'kpv', pelaajaId: 'm93', d: { viimeisinKirjautuminen: PV(1_000_000) } }]);
    expect(t.paivitykset[0].d.viimeisinKirjautuminen).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('linkkireitti ({seuraId, pelaajaId, pin}) kirjoittaa myös', async () => {
    const t = uusi(); await t.f({ seuraId: 'kpv', pelaajaId: 'm93', pin: '9278' }, ctx);
    expect(t.paivitykset.length).toBe(1);
  });
  it('vain kerran päivässä: sama päivä → ei toista kirjoitusta; seuraava päivä → kirjoitetaan', async () => {
    const t = uusi({ viimeisinKirjautuminen: PV(1_000_000) });
    await t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx); expect(t.paivitykset).toEqual([]);                        // jo tänään
    const t2 = uusi({ viimeisinKirjautuminen: '2026-01-01' });
    await t2.f({ liittoTunnus: '12345678', pin: '9278' }, ctx); expect(t2.paivitykset.length).toBe(1);                  // vanha päivä
  });
  it('EI kirjoitusta ilman onnistunutta kirjautumista: väärä PIN, lukittu, puuttuva suostumus', async () => {
    const t = uusi(); await virhe(t.f({ liittoTunnus: '12345678', pin: '0000' }, ctx)); expect(t.paivitykset).toEqual([]);
    const e = uusi({ suostumusTila: 'odottaa' }); const err = await virhe(e.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)); expect(err && err.code).toBe('failed-precondition'); expect(e.paivitykset).toEqual([]);
    const l = uusi(); for (let i = 0; i < 5; i++) await virhe(l.f({ liittoTunnus: '12345678', pin: '1111' }, ctx));
    await virhe(l.f({ liittoTunnus: '12345678', pin: '9278' }, ctx)); expect(l.paivitykset).toEqual([]);
  });
  it('kirjoitusvirhe ei kaada kirjautumista (best-effort)', async () => {
    const t = uusi(undefined, { updateHeittaa: true }); const v = await t.f({ liittoTunnus: '12345678', pin: '9278' }, ctx);
    expect(v.token).toBe('TOKEN'); expect(t.paivitykset).toEqual([]);
  });
  it('kirjaaKirjautuminen: Solo-lapsi (ei pelaaja-claimia) ohitetaan; päivä on Helsingin (UTC-yö → seuraava päivä)', async () => {
    let kutsuja = 0; const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ update: async () => { kutsuja++; } }) }) }) }) };
    expect(await K.kirjaaKirjautuminen(db, { claims: K.soloClaims('x') }, Date.now())).toBe(false); expect(kutsuja).toBe(0);
    expect(K.helsinginPaiva(Date.UTC(2026, 9, 11, 22, 30))).toBe('2026-10-12');   // 22:30Z = 01:30 Helsinki (EEST)
  });
});
