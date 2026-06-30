// #96 — GDPR-locatorin koostamislogiikka (mockattu Firestore). Spec: docs/GDPR_TEKNIIKKA_SPEC.md §2/§5.
// Varmistaa: KAIKKI §11-sijainnit enumeroidaan, molemmat avaimet (pelaajaId UID + palloID), lukumäärät,
// seura-rajaus (ristiviitteet eivät vuoda toisesta seurasta), audit-payload ilman henkilösisältöä.
import { describe, it, expect } from 'vitest';
const { keraaPelaajanManifesti, rakennaLukumaarat, rakennaAuditPayload, nollaLukumaarat } = require('../functions/gdpr_locator.js');

const FieldPath = { documentId: () => '__name__' };

// ── Minimaalinen Firestore-mock (polkupohjainen) ────────────────────────────────
function makeSnap(id, data, path) {
  return { id, exists: data != null, data: () => data, ref: { path } };
}
function makeDb(spec) {
  spec.docs = spec.docs || {};
  spec.cols = spec.cols || {};
  spec.groups = spec.groups || {};
  function colRef(path) {
    return {
      doc(id) { return docRef(path + '/' + id); },
      async get() {
        const arr = spec.cols[path] || [];
        return { docs: arr.map((d) => makeSnap(d.id, d.data, path + '/' + d.id)) };
      },
    };
  }
  function docRef(path) {
    return {
      path,
      collection(name) { return colRef(path + '/' + name); },
      async get() { return makeSnap(path.split('/').pop(), spec.docs[path], path); },
    };
  }
  return {
    collection(name) { return colRef(name); },
    collectionGroup(name) {
      const q = {
        _val: null,
        where(_fp, _op, val) { q._val = val; return q; },
        async get() {
          const arr = spec.groups[name] || [];
          const filtered = q._val != null ? arr.filter((d) => d.id === q._val) : arr;
          return { docs: filtered.map((d) => makeSnap(d.id, d.data, d.path)) };
        },
      };
      return q;
    },
  };
}

const SID = 'sjk';
const PID = 'UID_abc';        // Firebase UID = doc-ID
const PALLO = '12345678';     // palloID/tunniste = kenttä

function taysiSpec(extra = {}) {
  const base = `seurat/${SID}/pelaajat/${PID}`;
  return {
    docs: {
      [base]: { etunimi: 'Topias', sukunimi: 'Koskela', tunniste: PALLO, huoltajaEmail: 'a@b.fi' },
      [`pelaajat/${PALLO}`]: { nimi: 'Topias', seuraId: null },                 // Solo litteä
      [`seurat/${SID}/rekisteri/${PALLO}`]: { viite: true },
      [`marketplace/${PALLO}`]: { scout_window: true },
      ...(extra.docs || {}),
    },
    cols: {
      [`${base}/havainnot`]: [
        { id: 'h1', data: { tyyppi: 'adar', media: [{ download_url: 'gs://x/m0.jpg' }] } },
        { id: 'h2', data: { tyyppi: 'adar', media: [] } },
      ],
      [`${base}/kirjaukset`]: [{ id: '2026-06-01', data: {} }, { id: '2026-06-02', data: {} }, { id: '2026-06-03', data: {} }],
      [`${base}/testitulokset`]: [{ id: 't1', data: {} }],
      [`${base}/biologinen_ika`]: [{ id: 'b1', data: {} }],
      [`${base}/pelidata`]: [],
      [`${base}/kehut`]: [{ id: 'k1', data: {} }],
      [`pelaajat/${PALLO}/kirjaukset`]: [{ id: 's1', data: {} }],
      ...(extra.cols || {}),
    },
    groups: {
      lasnaolijat: [
        { id: PID, data: { tila: 'paikalla' }, path: `seurat/${SID}/kalenteri/ev1/lasnaolijat/${PID}` },
        { id: PID, data: { tila: 'poissa' }, path: `seurat/${SID}/kalenteri/ev2/lasnaolijat/${PID}` },
        { id: PID, data: { tila: 'x' }, path: `seurat/TOINEN/kalenteri/ev9/lasnaolijat/${PID}` }, // TOINEN seura → pois
      ],
      tulokset: [
        { id: PID, data: {}, path: `seurat/${SID}/testitapahtumat/tt1/tulokset/${PID}` },
        { id: PALLO, data: {}, path: `seurat/${SID}/testitapahtumat/tt2/tulokset/${PALLO}` },
      ],
      kontribuutio: [
        { id: PALLO, data: {}, path: `seurat/${SID}/valmentajat/vUID/kontribuutio/${PALLO}` },
      ],
      pelaajat: [],
      palautteet: [],
      ...(extra.groups || {}),
    },
  };
}

describe('GDPR-locator — kerääPelaajanManifesti', () => {
  it('enumeroi kaikki §11-sijainnit ja laskee lukumäärät (avain: tunniste)', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID, { FieldPath });
    expect(m.loytyi).toBe(true);
    expect(m.palloID).toBe(PALLO);
    const c = m.lukumaarat;
    expect(c.pelaaja).toBe(1);
    expect(c.havainnot).toBe(2);
    expect(c.kirjaukset).toBe(3);
    expect(c.testitulokset).toBe(1);
    expect(c.biologinen_ika).toBe(1);
    expect(c.pelidata).toBe(0);
    expect(c.kehut).toBe(1);
    expect(c.lasnaolo).toBe(2);                  // TOINEN-seuran läsnäolo rajattu pois
    expect(c.testitapahtuma_tulokset).toBe(2);   // PID + PALLO
    expect(c.palloID_viitteet).toBe(3);          // rekisteri + kontribuutio + marketplace
    expect(c.solo).toBe(1);
    expect(c.media_tiedostoja).toBe(1);
    expect(c.auth).toBe(1);
  });

  it('rajaa ristiviitteet omaan seuraan (ei vuoda toisesta seurasta)', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID, { FieldPath });
    const polut = m.ristiviitteet.lasnaolo.map((x) => x.ref.path);
    expect(polut.every((p) => p.startsWith(`seurat/${SID}/`))).toBe(true);
    expect(polut.some((p) => p.includes('TOINEN'))).toBe(false);
  });

  it('Storage-prefiksit ovat per havainto (ei koko havainnot/-prefix → ei poista muiden mediaa)', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID, { FieldPath });
    expect(m.storagePrefiksit).toEqual([
      `seurat/${SID}/havainnot/h1/`,
      `seurat/${SID}/havainnot/h2/`,
    ]);
    expect(m.authUid).toBe(PID);
  });

  it('ratkaisee palloID:n myös palloID-kentästä (tunniste puuttuu)', async () => {
    const spec = taysiSpec();
    spec.docs[`seurat/${SID}/pelaajat/${PID}`] = { etunimi: 'X', palloID: PALLO };
    const db = makeDb(spec);
    const m = await keraaPelaajanManifesti(db, SID, PID, { FieldPath });
    expect(m.palloID).toBe(PALLO);
  });

  it('idempotenssi: pääDoc poissa → loytyi:false, kaikki lukumäärät 0', async () => {
    const db = makeDb({ docs: {}, cols: {}, groups: {} });
    const m = await keraaPelaajanManifesti(db, SID, 'EI_OLE', { FieldPath });
    expect(m.loytyi).toBe(false);
    expect(m.lukumaarat).toEqual(nollaLukumaarat());
    expect(m.palloID).toBe(null);
  });

  it('Solo puuttuu → solo:0, ei kaadu', async () => {
    const spec = taysiSpec();
    delete spec.docs[`pelaajat/${PALLO}`];
    delete spec.cols[`pelaajat/${PALLO}/kirjaukset`];
    const db = makeDb(spec);
    const m = await keraaPelaajanManifesti(db, SID, PID, { FieldPath });
    expect(m.solo).toBe(null);
    expect(m.lukumaarat.solo).toBe(0);
  });

  it('heittää jos seuraId/pelaajaId puuttuu', async () => {
    const db = makeDb(taysiSpec());
    await expect(keraaPelaajanManifesti(db, SID, null, { FieldPath })).rejects.toThrow();
  });
});

describe('GDPR-locator — audit-payload (EI henkilösisältöä)', () => {
  it('rakennaLukumaarat on stabiili nolla-manifestille', () => {
    expect(rakennaLukumaarat(null)).toEqual(nollaLukumaarat());
    expect(rakennaLukumaarat({ loytyi: false })).toEqual(nollaLukumaarat());
  });

  it('audit-payload sisältää vain turvalliset kentät — ei nimeä/emailia/sisältöä', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID, { FieldPath });
    const payload = rakennaAuditPayload({
      tyyppi: 'gdpr_rtbf', severity: 'alert', seuraId: SID, pelaajaId: PID,
      requesterUid: 'vpUID', rooli: 'vp', lukumaarat: m.lukumaarat, varoitukset: m.varoitukset,
    });
    // Sallitut avaimet (whitelist) — mikään muu ei saa esiintyä.
    expect(Object.keys(payload).sort()).toEqual([
      'lukumaarat', 'pelaajaId', 'seuraId', 'severity', 'tekija_rooli', 'tekija_uid', 'toiminto', 'tyyppi', 'varoituksia',
    ].sort());
    // Serialisoituna ei saa esiintyä henkilösisältöä.
    const serial = JSON.stringify(payload);
    for (const kielletty of ['Topias', 'Koskela', 'a@b.fi', 'huoltaja', 'etunimi', 'sukunimi']) {
      expect(serial.includes(kielletty)).toBe(false);
    }
    expect(payload.pelaajaId).toBe(PID);          // tunniste OK (ei henkilösisältöä)
    expect(payload.lukumaarat.havainnot).toBe(2); // lukumäärät mukana
    expect(payload.severity).toBe('alert');
  });
});
