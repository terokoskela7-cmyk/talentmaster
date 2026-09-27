#!/usr/bin/env node
/**
 * H1 — migraatio: vanhat kausikohtaiset arviointidocit → arviointikerroiksi.
 *
 * Miksi: `arviointi/{kausiId}` piti vain KAUDEN VIIMEISINTÄ tilaa per kohde, ja uusin arvio
 * korvasi edellisen — myös toisen arvioijan. Vanhoista doceista saadaan silti talteen se mitä
 * niissä on: yksi kerta per arvioija, kontekstina 'kooste'.
 *
 * Periaatteet:
 *  - IDEMPOTENTTI: kerta-id on deterministinen (pvm + arvioija + konteksti), joten uusinta-ajo
 *    kirjoittaa saman docin uudelleen eikä monista historiaa.
 *  - DRY-RUN OLETUS: kirjoittaa vasta `--kirjoita`-lipulla.
 *  - Kausi johdetaan kohteen PVM:stä `tmKausi`:lla, EI doc-ID:stä: vanha "2026-27" on
 *    heinä–kesä-mallin mukainen, ja Suomessa kausi on kalenterivuosi.
 *  - `tilannekuva: null` — arviohetken ikää/PHV:tä ei voi tietää jälkikäteen, eikä sitä keksitä.
 *    UI näyttää näille "konteksti puuttuu".
 *  - Vanhoja docceja EI poisteta (read-only-arkisto).
 *
 * Käyttö:
 *   node scripts/migrate_arviointi_kerrat.js --seura=sjk            # dry-run, listaa
 *   node scripts/migrate_arviointi_kerrat.js --seura=sjk --kirjoita
 *   node scripts/migrate_arviointi_kerrat.js --kaikki --kirjoita
 */
'use strict';

const admin = require('firebase-admin');
const AH = require('../lib/tm_arviointi_historia.js');

const argv = process.argv.slice(2);
const lippu = (nimi) => argv.some((a) => a === '--' + nimi);
const arvo = (nimi) => {
  const o = argv.find((a) => a.indexOf('--' + nimi + '=') === 0);
  return o ? o.split('=').slice(1).join('=') : null;
};

const KIRJOITA = lippu('kirjoita');
const KAIKKI = lippu('kaikki');
const SEURA = arvo('seura');

if (!SEURA && !KAIKKI) {
  console.error('Anna --seura=<id> tai --kaikki. Oletus on dry-run; --kirjoita tallentaa.');
  process.exit(1);
}

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** Vanha kausidoc → kerrat (yksi per arvioija). Puhdas funktio, testattavissa. */
function docistaKerrat(kausiDoc, seuraId, pelaaja) {
  const d = kausiDoc.data() || {};
  const hav = d.havaittu || {};
  const perArvioija = {};
  Object.keys(hav).forEach((avain) => {
    const h = hav[avain];
    if (!h || h.arvo == null) return;
    const uid = h.arvioija_uid || 'tuntematon';
    const pvm = h.pvm || d.paivitetty || null;
    if (!perArvioija[uid]) perArvioija[uid] = { pvm: pvm, kohteet: {} };
    // arvioijan viimeisin pvm edustaa kertaa
    if (pvm && (!perArvioija[uid].pvm || String(pvm) > String(perArvioija[uid].pvm))) perArvioija[uid].pvm = pvm;
    perArvioija[uid].kohteet[avain] = { arvo: h.arvo, pvm: pvm || null };
  });
  return Object.keys(perArvioija).map((uid) => {
    const k = perArvioija[uid];
    const pvm = k.pvm || null;
    return {
      id: AH.tmAhKertaId(pvm || '1970-01-01', uid, 'kooste'),
      data: {
        kehys: d.kehys || 'palloliitto',
        kausi: pvm ? AH.tmKausi(pvm, 'kalenteri') : null,   // EI doc-ID:stä (vanha malli oli heinä–kesä)
        palloId: (pelaaja && (pelaaja.tunniste || pelaaja.palloID)) || null,
        seuraId_arviohetkella: seuraId,
        nakyvyys: 'seuralle',
        pvm: pvm,
        arvioija_uid: uid === 'tuntematon' ? null : uid,
        arvioija_nimi: null,
        arvioija_rooli: null,
        arvioija_org: 'seura',
        konteksti: { tyyppi: 'kooste', kuvaus: null, taso_ottelu_id: null, pelipaikka: null, minuutit: null, vastustajataso: null },
        tilannekuva: null,           // ei tiedossa jälkikäteen — ei keksitä
        kohteet: k.kohteet,
        potentiaali: null,
        lahde_migraatio: { kausidoc: kausiDoc.id, ajettu: new Date().toISOString() },
      },
    };
  });
}

async function seuranPelaajat(seuraId) {
  const s = await db.collection('seurat').doc(seuraId).collection('pelaajat').get();
  return s.docs;
}

async function aja() {
  const seurat = SEURA ? [SEURA] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  let docceja = 0, kertoja = 0, pelaajia = 0;
  for (const sid of seurat) {
    const pelaajat = await seuranPelaajat(sid);
    for (const pd of pelaajat) {
      const arv = await pd.ref.collection('arviointi').get();
      if (arv.empty) continue;
      pelaajia += 1;
      for (const kd of arv.docs) {
        docceja += 1;
        const kerrat = docistaKerrat(kd, sid, pd.data());
        for (const k of kerrat) {
          kertoja += 1;
          if (KIRJOITA) {
            await pd.ref.collection('arviointikerrat').doc(k.id).set(
              Object.assign({ luotu: admin.firestore.FieldValue.serverTimestamp(),
                paivitetty: admin.firestore.FieldValue.serverTimestamp() }, k.data),
              { merge: true });
          } else {
            console.log('  [dry] %s/%s → arviointikerrat/%s (%d kohdetta)',
              sid, pd.id, k.id, Object.keys(k.data.kohteet).length);
          }
        }
      }
    }
  }
  console.log('%s: %d seuraa · %d pelaajaa · %d kausidocia → %d kertaa',
    KIRJOITA ? 'KIRJOITETTU' : 'DRY-RUN', seurat.length, pelaajia, docceja, kertoja);
}

if (require.main === module) {
  aja().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { docistaKerrat };
