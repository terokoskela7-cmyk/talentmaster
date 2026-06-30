// #96 — GDPR-locatorin koostamislogiikka (mockattu Firestore). Spec: docs/GDPR_TEKNIIKKA_SPEC.md §2/§5.
// Varmistaa: KAIKKI §11-sijainnit enumeroidaan, molemmat avaimet (pelaajaId UID + palloID), lukumäärät,
// ristiviitteet löytyvät VANHEMPIA ITEROIMALLA (ei collectionGroup-documentId-kyselyä joka heittää),
// seura-rajaus, audit-payload ilman henkilösisältöä.
import { describe, it, expect } from 'vitest';
const { keraaPelaajanManifesti, rakennaLukumaarat, rakennaAuditPayload, nollaLukumaarat } = require('../functions/gdpr_locator.js');

// ── Minimaalinen Firestore-mock (polkupohjainen, snapshot.ref tukee .collection().doc().get()) ──
function makeDb(spec) {
  spec.docs = spec.docs || {};
  spec.cols = spec.cols || {};
  function colRef(path) {
    return {
      doc(id) { return docRef(path + '/' + id); },
      async get() {
        const arr = spec.cols[path] || [];
        return { docs: arr.map((d) => snapFromRef(docRef(path + '/' + d.id), d.data)) };
      },
    };
  }
  function docRef(path) {
    const ref = {
      path,
      collection(name) { return colRef(path + '/' + name); },
      async get() { return snapFromRef(ref, spec.docs[path]); },
    };
    return ref;
  }
  function snapFromRef(ref, data) {
    return { id: ref.path.split('/').pop(), exists: data != null, data: () => data, ref };
  }
  return { collection(name) { return colRef(name); } };
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
      // Ristiviitteet OIKEALLA täydellä doc-polulla (regressio: documentId-collectionGroup heitti näille):
      [`seurat/${SID}/kalenteri/ev1/lasnaolijat/${PID}`]: { tila: 'paikalla' },
      [`seurat/${SID}/kalenteri/ev2/lasnaolijat/${PID}`]: { tila: 'poissa' },
      [`seurat/${SID}/testitapahtumat/tt1/tulokset/${PID}`]: { testit: { lin_30m: 5.1 } },
      [`seurat/${SID}/testitapahtumat/tt2/tulokset/${PALLO}`]: { testit: {} },   // palloID-avaimella
      [`seurat/${SID}/valmentajat/vUID/kontribuutio/${PALLO}`]: { pisteet: 3 },
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
      // Vanhemmat joita iteroidaan (ev3:lla EI tämän pelaajan läsnäoloa → ei pidä löytyä):
      [`seurat/${SID}/kalenteri`]: [{ id: 'ev1', data: {} }, { id: 'ev2', data: {} }, { id: 'ev3', data: {} }],
      [`seurat/${SID}/testitapahtumat`]: [{ id: 'tt1', data: {} }, { id: 'tt2', data: {} }],
      [`seurat/${SID}/valmentajat`]: [{ id: 'vUID', data: {} }],
      ...(extra.cols || {}),
    },
  };
}

describe('GDPR-locator — kerääPelaajanManifesti', () => {
  it('enumeroi kaikki §11-sijainnit ja laskee lukumäärät (avain: tunniste)', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID);
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
    expect(c.lasnaolo).toBe(2);                  // ev1+ev2 (ev3 ei tätä pelaajaa)
    expect(c.testitapahtuma_tulokset).toBe(2);   // tt1 (pid) + tt2 (palloID)
    expect(c.palloID_viitteet).toBe(3);          // rekisteri + kontribuutio + marketplace
    expect(c.solo).toBe(1);
    expect(c.media_tiedostoja).toBe(1);
    expect(c.auth).toBe(1);
    expect(m.varoitukset).toEqual([]);           // ei heittoja (documentId-bugi korjattu)
  });

  it('REGRESSIO: ristiviitteet löytyvät vanhempia iteroimalla, OIKEILLA refeillä (ei collectionGroup-heitto)', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID);
    // Läsnäolo — täydet doc-polut, vain tämän pelaajan, vain olemassa olevat tapahtumat
    const lasnaPolut = m.ristiviitteet.lasnaolo.map((x) => x.ref.path).sort();
    expect(lasnaPolut).toEqual([
      `seurat/${SID}/kalenteri/ev1/lasnaolijat/${PID}`,
      `seurat/${SID}/kalenteri/ev2/lasnaolijat/${PID}`,
    ]);
    // Testitapahtuma-tulokset — pid- JA palloID-avaimella
    const ttPolut = m.ristiviitteet.testitapahtuma_tulokset.map((x) => x.ref.path).sort();
    expect(ttPolut).toEqual([
      `seurat/${SID}/testitapahtumat/tt1/tulokset/${PID}`,
      `seurat/${SID}/testitapahtumat/tt2/tulokset/${PALLO}`,
    ]);
    // RTBF poistaisi TÄSMÄLLEEN nämä ristiviite-refit (sama logiikka kuin poistaPelaajaGDPR)
    const rtbfRistiRefit = []
      .concat(m.ristiviitteet.lasnaolo, m.ristiviitteet.testitapahtuma_tulokset, m.ristiviitteet.palloID_viitteet)
      .map((x) => x.ref.path).sort();
    expect(rtbfRistiRefit).toEqual([
      `marketplace/${PALLO}`,
      `seurat/${SID}/kalenteri/ev1/lasnaolijat/${PID}`,
      `seurat/${SID}/kalenteri/ev2/lasnaolijat/${PID}`,
      `seurat/${SID}/rekisteri/${PALLO}`,
      `seurat/${SID}/testitapahtumat/tt1/tulokset/${PID}`,
      `seurat/${SID}/testitapahtumat/tt2/tulokset/${PALLO}`,
      `seurat/${SID}/valmentajat/vUID/kontribuutio/${PALLO}`,
    ].sort());
  });

  it('ristiviite-iterointi ei kaadu eikä keksi dataa kun mitään ei löydy', async () => {
    // Pelaaja olemassa, mutta EI ristiviitteitä (tyhjät vanhemmat-listat)
    const spec = taysiSpec();
    spec.cols[`seurat/${SID}/kalenteri`] = [];
    spec.cols[`seurat/${SID}/testitapahtumat`] = [];
    spec.cols[`seurat/${SID}/valmentajat`] = [];
    const db = makeDb(spec);
    const m = await keraaPelaajanManifesti(db, SID, PID);
    expect(m.lukumaarat.lasnaolo).toBe(0);
    expect(m.lukumaarat.testitapahtuma_tulokset).toBe(0);
    // rekisteri + marketplace (suorat doc-getit) säilyvät — kontribuutio 0
    expect(m.lukumaarat.palloID_viitteet).toBe(2);
    expect(m.varoitukset).toEqual([]);
  });

  it('Storage-prefiksit ovat per havainto (ei koko havainnot/-prefix → ei poista muiden mediaa)', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID);
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
    const m = await keraaPelaajanManifesti(db, SID, PID);
    expect(m.palloID).toBe(PALLO);
  });

  it('idempotenssi: pääDoc poissa → loytyi:false, kaikki lukumäärät 0', async () => {
    const db = makeDb({ docs: {}, cols: {} });
    const m = await keraaPelaajanManifesti(db, SID, 'EI_OLE');
    expect(m.loytyi).toBe(false);
    expect(m.lukumaarat).toEqual(nollaLukumaarat());
    expect(m.palloID).toBe(null);
  });

  it('Solo puuttuu → solo:0, ei kaadu', async () => {
    const spec = taysiSpec();
    delete spec.docs[`pelaajat/${PALLO}`];
    delete spec.cols[`pelaajat/${PALLO}/kirjaukset`];
    const db = makeDb(spec);
    const m = await keraaPelaajanManifesti(db, SID, PID);
    expect(m.solo).toBe(null);
    expect(m.lukumaarat.solo).toBe(0);
  });

  it('heittää jos seuraId/pelaajaId puuttuu', async () => {
    const db = makeDb(taysiSpec());
    await expect(keraaPelaajanManifesti(db, SID, null)).rejects.toThrow();
  });
});

describe('GDPR-locator — audit-payload (EI henkilösisältöä)', () => {
  it('rakennaLukumaarat on stabiili nolla-manifestille', () => {
    expect(rakennaLukumaarat(null)).toEqual(nollaLukumaarat());
    expect(rakennaLukumaarat({ loytyi: false })).toEqual(nollaLukumaarat());
  });

  it('audit-payload sisältää vain turvalliset kentät — ei nimeä/emailia/sisältöä', async () => {
    const db = makeDb(taysiSpec());
    const m = await keraaPelaajanManifesti(db, SID, PID);
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
