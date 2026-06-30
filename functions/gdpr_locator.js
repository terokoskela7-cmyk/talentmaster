// ─────────────────────────────────────────────────────────────────────────────
// GDPR-locator (#96) — JAETTU enumerointi: yksi totuus, kaksi kuluttajaa.
//   RTBF (poistaPelaajaGDPR) kuluttaa = poistaa · Export (viePelaajanDataGDPR) kuluttaa = lukee.
// Spec: docs/GDPR_TEKNIIKKA_SPEC.md §1–§2. Kartta = CLAUDE.md §11.
//
// Periaate (§0.5): pelaajan henkilödata on hajautettu (alikokoelmat + ristiviitteet + Storage + Auth).
// Locator PAKKO käydä KAIKKI sijainnit läpi — yksikin orpo = GDPR-rikkomus. Tukee MOLEMPIA avaimia:
//   pelaajaId = doc-ID = Firebase UID  JA  palloID/tunniste = kenttä (ratkaistaan pääDocista).
//
// EI Firestore-/admin-importteja → testattava Vitestissä mockatulla db:llä (kuten authz_paatos.js).
// Ristiviitteet enumeroidaan VANHEMPIA ITEROIMALLA (kalenteri/testitapahtumat/valmentajat) + per-pelaaja
// doc .get() — EI collectionGroup-documentId-kyselyä (se heittää, ks. ristiviiteIteroi).
// ─────────────────────────────────────────────────────────────────────────────

// Pelaajadokumentin alikokoelmat (recursiveDelete kattaa nämä RTBF:ssä; export lukee).
const ALIKOKOELMAT = ['havainnot', 'kirjaukset', 'testitulokset', 'biologinen_ika', 'pelidata', 'kehut'];

// Lue alikokoelman dokumentit → [{id, data, ref}]. Virhe → varoitus, ei kaada (best-effort enumerointi).
async function lueAlikokoelma(paaRef, nimi, varoitukset) {
  try {
    const snap = await paaRef.collection(nimi).get();
    return snap.docs.map((d) => ({ id: d.id, data: d.data(), ref: d.ref }));
  } catch (e) {
    varoitukset.push('alikokoelma:' + nimi + ':' + (e && e.message ? e.message : String(e)));
    return [];
  }
}

// Ristiviite-enumerointi VANHEMPIA ITEROIMALLA + per-pelaaja-doc .get() (LUOTETTAVA).
// MIKSI EI collectionGroup('x').where(FieldPath.documentId()=='<id>'): collectionGroupin documentId-suodatin
// vaatii TÄYDEN dokumenttipolun (parillinen segmenttimäärä) eikä paljasta doc-id:tä → heittää ajossa →
// ristiviitteet jäisivät löytymättä → RTBF orpouttaisi lasnaolijat + testitapahtuma-tulokset. (Live-todennettu.)
// Iterointi on seura-rajattu rakenteellisesti (vanhempi-collection on seuran alla) → ei vuoda toiseen seuraan.
async function ristiviiteIteroi(vanhemmatColRef, alaNimi, docId, varoitukset, tag) {
  if (!docId || !vanhemmatColRef) return [];
  let snap;
  try {
    snap = await vanhemmatColRef.get();
  } catch (e) {
    varoitukset.push(tag + ':vanhemmat:' + (e && e.message ? e.message : String(e)));
    return [];
  }
  const out = [];
  for (const parent of (snap.docs || [])) {
    try {
      const ref = parent.ref.collection(alaNimi).doc(docId);
      const ds  = await ref.get();
      if (ds && ds.exists) {
        out.push({ id: ds.id, data: ds.data(), ref, polku: (ref.path || (tag + '/' + docId)) });
      }
    } catch (e) {
      varoitukset.push(tag + ':' + (parent.id || '?') + ':' + (e && e.message ? e.message : String(e)));
    }
  }
  return out;
}

// Yksittäinen palloID-pohjainen doc (rekisteri/alumni/marketplace) — olemassaolo tarkistettuna.
async function ristiviiteDoc(ref, varoitukset, tunniste) {
  try {
    const snap = await ref.get();
    if (snap && snap.exists) return [{ id: snap.id, data: snap.data(), ref, polku: ref.path || tunniste }];
    return [];
  } catch (e) {
    varoitukset.push('doc:' + tunniste + ':' + (e && e.message ? e.message : String(e)));
    return [];
  }
}

// Storage-prefiksit (per havainto, EI koko havainnot/-prefix → ei poista muiden pelaajien mediaa) + media-urlit.
function keraaMedia(havainnot, seuraId) {
  const prefiksit = [];
  const urlit = [];
  for (const h of havainnot) {
    // §15: ADAR-media tallennetaan polkuun seurat/{sid}/havainnot/{havaintoId}/media_*.jpg
    prefiksit.push('seurat/' + seuraId + '/havainnot/' + h.id + '/');
    const media = h.data && Array.isArray(h.data.media) ? h.data.media : [];
    for (const m of media) {
      const u = m && (m.download_url || m.storage_url);
      if (u) urlit.push(u);
    }
  }
  return { prefiksit, urlit };
}

// ─────────────────────────────────────────────────────────────────────────────
// kerääPelaajanManifesti — enumeroi KAIKKI pelaajan henkilödatan sijainnit (§11).
// db: Firestore · seuraId/pelaajaId pakollisia. (opts varattu tulevaan; ristiviitteet enumeroidaan
// vanhempia iteroimalla — ei collectionGroup-documentId-kyselyä, ks. ristiviiteIteroi.)
// Palauttaa { loytyi, palloID, paaDoc, alikokoelmat, ristiviitteet, solo, soloRef, media, storagePrefiksit,
//            authUid, lukumaarat, varoitukset }.
// ─────────────────────────────────────────────────────────────────────────────
async function keraaPelaajanManifesti(db, seuraId, pelaajaId, opts = {}) {
  if (!seuraId || !pelaajaId) throw new Error('seuraId ja pelaajaId pakollisia');
  void opts;   // collectionGroup-pohjainen FieldPath ei enää käytössä (iterointi korvasi)
  const varoitukset = [];

  const paaRef  = db.collection('seurat').doc(seuraId).collection('pelaajat').doc(pelaajaId);
  const paaSnap = await paaRef.get();
  if (!paaSnap || !paaSnap.exists) {
    // Idempotenssi: pääDoc poissa → ei voida ratkaista palloID:tä → ei orpo-enumerointia (no-op-pohja).
    return {
      loytyi: false, seuraId, pelaajaId, palloID: null,
      paaDoc: null, alikokoelmat: {}, ristiviitteet: {}, solo: null, soloRef: null,
      media: [], storagePrefiksit: [], authUid: pelaajaId,
      lukumaarat: nollaLukumaarat(), varoitukset,
    };
  }
  const paaData = paaSnap.data() || {};
  const palloID = paaData.tunniste != null ? String(paaData.tunniste)
    : (paaData.palloID != null ? String(paaData.palloID) : null);

  // 1) Pelaajadokumentin alikokoelmat
  const alikokoelmat = {};
  for (const nimi of ALIKOKOELMAT) {
    alikokoelmat[nimi] = await lueAlikokoelma(paaRef, nimi, varoitukset);
  }

  // 2) Ristiviitteet (EIVÄT katoa recursiveDeletellä — eri puu). Iterointi vanhempien yli (ks. ristiviiteIteroi).
  const seuraRef = db.collection('seurat').doc(seuraId);
  const ristiviitteet = {};
  // 2a) Läsnäolo: seurat/{sid}/kalenteri/{tid}/lasnaolijat/{pelaajaId} — iteroi tapahtumat (§35)
  ristiviitteet.lasnaolo = await ristiviiteIteroi(seuraRef.collection('kalenteri'), 'lasnaolijat', pelaajaId, varoitukset, 'lasnaolo');
  // 2b) Testitapahtuma-tulokset: seurat/{sid}/testitapahtumat/{tid}/tulokset/{pelaajaId TAI palloID} (§22)
  const ttRef = seuraRef.collection('testitapahtumat');
  const ttPid = await ristiviiteIteroi(ttRef, 'tulokset', pelaajaId, varoitukset, 'tulokset');
  const ttPallo = palloID && palloID !== pelaajaId
    ? await ristiviiteIteroi(ttRef, 'tulokset', palloID, varoitukset, 'tulokset') : [];
  ristiviitteet.testitapahtuma_tulokset = yhdistaUniikit(ttPid, ttPallo);
  // 2c) palloID-pohjaiset viitteet (jos palloID + olemassa)
  const palloViitteet = [];
  if (palloID) {
    palloViitteet.push(...await ristiviiteDoc(seuraRef.collection('rekisteri').doc(palloID), varoitukset, 'rekisteri/' + palloID));
    palloViitteet.push(...await ristiviiteDoc(seuraRef.collection('alumni').doc(palloID), varoitukset, 'alumni/' + palloID));
    // valmentajat/{uid}/kontribuutio/{palloID} — iteroi valmentajat (uid tuntematon)
    palloViitteet.push(...await ristiviiteIteroi(seuraRef.collection('valmentajat'), 'kontribuutio', palloID, varoitukset, 'kontribuutio'));
    // Globaali: marketplace/{palloID} (suora doc-get)
    palloViitteet.push(...await ristiviiteDoc(db.collection('marketplace').doc(palloID), varoitukset, 'marketplace/' + palloID));
    // HUOM: palloliitto/ohjelmat/.../{pelaajat|palautteet}/{palloID} — globaali rakenne (ohjelma-id:t tuntemattomia),
    // ei pilottidatassa. Enumerointia ei toteutettu (vaatii ohjelmaluettelon) → erillinen laajennus jos käytössä.
  }
  ristiviitteet.palloID_viitteet = palloViitteet;

  // 3) Solo (litteä pelaajat/{palloID} + alikokoelmat) — jos tunniste-match
  let solo = null;
  let soloRef = null;
  if (palloID) {
    try {
      const sRef = db.collection('pelaajat').doc(palloID);
      const sSnap = await sRef.get();
      if (sSnap && sSnap.exists) {
        soloRef = sRef;
        const soloAli = {};
        for (const nimi of ['kirjaukset', 'idp_kausi', 'ohjelmat', 'terveys']) {
          soloAli[nimi] = await lueAlikokoelma(sRef, nimi, varoitukset);
        }
        solo = { id: sSnap.id, data: sSnap.data(), ref: sRef, alikokoelmat: soloAli };
      }
    } catch (e) {
      varoitukset.push('solo:' + (e && e.message ? e.message : String(e)));
    }
  }

  // 4) Storage-media (per havainto) + Auth
  const { prefiksit, urlit } = keraaMedia(alikokoelmat.havainnot, seuraId);

  const manifesti = {
    loytyi: true, seuraId, pelaajaId, palloID,
    paaDoc: { id: paaSnap.id, data: paaData, ref: paaRef },
    alikokoelmat, ristiviitteet, solo, soloRef,
    media: urlit, storagePrefiksit: prefiksit, authUid: pelaajaId, varoitukset,
  };
  manifesti.lukumaarat = rakennaLukumaarat(manifesti);
  return manifesti;
}

function yhdistaUniikit(a, b) {
  const seen = new Set();
  const out = [];
  for (const x of [...a, ...b]) {
    const k = (x.ref && x.ref.path) || x.polku || x.id;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function nollaLukumaarat() {
  return {
    pelaaja: 0, havainnot: 0, kirjaukset: 0, testitulokset: 0, biologinen_ika: 0, pelidata: 0, kehut: 0,
    lasnaolo: 0, testitapahtuma_tulokset: 0, palloID_viitteet: 0, solo: 0, media_tiedostoja: 0, auth: 0,
  };
}

// Lukumäärät dryRun-esikatselua + audittia varten (§3.2). EI henkilösisältöä.
function rakennaLukumaarat(m) {
  if (!m || !m.loytyi) return nollaLukumaarat();
  const a = m.alikokoelmat || {};
  const r = m.ristiviitteet || {};
  const pituus = (x) => (Array.isArray(x) ? x.length : 0);
  return {
    pelaaja: 1,
    havainnot: pituus(a.havainnot),
    kirjaukset: pituus(a.kirjaukset),
    testitulokset: pituus(a.testitulokset),
    biologinen_ika: pituus(a.biologinen_ika),
    pelidata: pituus(a.pelidata),
    kehut: pituus(a.kehut),
    lasnaolo: pituus(r.lasnaolo),
    testitapahtuma_tulokset: pituus(r.testitapahtuma_tulokset),
    palloID_viitteet: pituus(r.palloID_viitteet),
    solo: m.solo ? 1 : 0,
    media_tiedostoja: pituus(m.media),
    auth: 1, // anonyymi PIN-tili uid==pelaajaId (try/catch poistossa jos ei ole)
  };
}

// Audit-payload (§0.4) — kuka/milloin/mihin/montako, EI henkilösisältöä. Pura testattavaksi.
// aikaleima lisätään CF:ssä (serverTimestamp). Tämä rakentaa loput — ei nimiä/emaileja/sisältöä.
function rakennaAuditPayload({ tyyppi, severity, seuraId, pelaajaId, requesterUid, rooli, lukumaarat, varoitukset }) {
  return {
    tyyppi: String(tyyppi),
    toiminto: String(tyyppi),
    severity: String(severity),
    seuraId: seuraId != null ? String(seuraId) : null,
    pelaajaId: pelaajaId != null ? String(pelaajaId) : null,   // tunniste, EI nimi (ei henkilösisältöä)
    tekija_uid: requesterUid != null ? String(requesterUid) : null,
    tekija_rooli: rooli != null ? String(rooli) : null,
    lukumaarat: lukumaarat || nollaLukumaarat(),
    varoituksia: Array.isArray(varoitukset) ? varoitukset.length : 0,
  };
}

module.exports = {
  ALIKOKOELMAT,
  keraaPelaajanManifesti,
  rakennaLukumaarat,
  rakennaAuditPayload,
  nollaLukumaarat,
};
