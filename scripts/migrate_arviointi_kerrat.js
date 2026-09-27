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
 *   node scripts/migrate_arviointi_kerrat.js --kaikki --sisallyta-tuntemattomat
 *
 * ARVIOIJAN TUNNISTUS (H1b): kuiva-ajo paljasti UID:itä, jotka esiintyvät KAHDESSA seurassa —
 * ne ovat lähes varmasti super-admin- tai testitunnuksia, eikä niitä saa kirjata seuran
 * arvioiksi. Tunnistus: seurat/{sid}/kayttajat/{uid} → org 'seura' · palloliitto/kayttajat/{uid}
 * → org 'palloliitto' + nakyvyys 'sisainen' · kumpikaan ei löydy → kerta OHITETAAN (ellei
 * --sisallyta-tuntemattomat). Ohitukset ja tyhjiksi jäävät kausidokumentit tulostetaan, jotta
 * nähdään mitä jäi siirtämättä.
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
const SISALLYTA_TUNTEMATTOMAT = lippu('sisallyta-tuntemattomat');

let db = null;
function alusta() {
  if (!SEURA && !KAIKKI) {
    console.error('Anna --seura=<id> tai --kaikki. Oletus on dry-run; --kirjoita tallentaa.');
    process.exit(1);
  }
  if (!admin.apps.length) admin.initializeApp();
  db = admin.firestore();
}

/** Vanha kausidoc → kerrat (yksi per arvioija). Puhdas funktio, testattavissa. */
function docistaKerrat(kausiDoc, seuraId, pelaaja, arvioijat) {
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
    /* Tuntematon UID ei ole seuran arvio: se voi olla SA- tai testitunnus (kuiva-ajossa sama
       UID esiintyi kahdessa seurassa). Merkitään ohitettavaksi, ellei lippu salli mukaan. */
    const tunniste = (arvioijat && arvioijat[uid]) || null;
    const ohita = !tunniste && !SISALLYTA_TUNTEMATTOMAT;
    return {
      id: AH.tmAhKertaId(pvm || '1970-01-01', uid, 'kooste'),
      ohita: ohita,
      uid: uid,
      kohteita: Object.keys(k.kohteet).length,
      data: {
        kehys: d.kehys || 'palloliitto',
        kausi: pvm ? AH.tmKausi(pvm, 'kalenteri') : null,   // EI doc-ID:stä (vanha malli oli heinä–kesä)
        palloId: (pelaaja && (pelaaja.tunniste || pelaaja.palloID)) || null,
        seuraId_arviohetkella: seuraId,
        nakyvyys: (tunniste && tunniste.org === 'palloliitto') ? 'sisainen' : 'seuralle',
        pvm: pvm,
        arvioija_uid: uid === 'tuntematon' ? null : uid,
        arvioija_nimi: (tunniste && tunniste.nimi) || null,
        arvioija_rooli: (tunniste && tunniste.rooli) || null,
        arvioija_org: (tunniste && tunniste.org) || 'seura',
        konteksti: { tyyppi: 'kooste', kuvaus: null, taso_ottelu_id: null, pelipaikka: null, minuutit: null, vastustajataso: null },
        tilannekuva: null,           // ei tiedossa jälkikäteen — ei keksitä
        kohteet: k.kohteet,
        potentiaali: null,
        lahde_migraatio: { kausidoc: kausiDoc.id, ajettu: new Date().toISOString() },
      },
    };
  });
}

/** UID → { nimi, rooli, org } seuran kayttajista ja Palloliiton kayttajista. */
async function haeArvioijat(seuraId) {
  const out = {};
  try {
    const s = await db.collection('seurat').doc(seuraId).collection('kayttajat').get();
    s.docs.forEach((d) => {
      const v = d.data() || {};
      const nimi = v.nimi || [v.etunimi, v.sukunimi].filter(Boolean).join(' ') || null;
      out[d.id] = { nimi: nimi, rooli: v.rooli || null, org: 'seura' };
    });
  } catch (e) { /* ilman kayttajia kaikki ovat tuntemattomia → ohitetaan */ }
  try {
    const pl = await db.collection('palloliitto').doc('kayttajat').collection('kayttajat').get()
      .catch(() => db.collection('palloliitto/kayttajat').get());
    pl.docs.forEach((d) => {
      const v = d.data() || {};
      const nimi = v.nimi || [v.etunimi, v.sukunimi].filter(Boolean).join(' ') || null;
      out[d.id] = { nimi: nimi, rooli: v.rooli || 'palloliitto', org: 'palloliitto' };
    });
  } catch (e) { /* Palloliitto-kayttajia ei viela ole (H1b) */ }
  return out;
}

async function seuranPelaajat(seuraId) {
  const s = await db.collection('seurat').doc(seuraId).collection('pelaajat').get();
  return s.docs;
}

async function aja() {
  const seurat = SEURA ? [SEURA] : (await db.collection('seurat').get()).docs.map((d) => d.id);
  let docceja = 0, kertoja = 0, pelaajia = 0, ohitettuja = 0, tyhjia = 0;
  for (const sid of seurat) {
    const arvioijat = await haeArvioijat(sid);
    const pelaajat = await seuranPelaajat(sid);
    for (const pd of pelaajat) {
      const arv = await pd.ref.collection('arviointi').get();
      if (arv.empty) continue;
      pelaajia += 1;
      for (const kd of arv.docs) {
        docceja += 1;
        const kerrat = docistaKerrat(kd, sid, pd.data(), arvioijat);
        /* Tyhjäksi jäävä kausidokumentti tulostetaan kenttineen: näin näkyy, jääkö jotain
           siirtämättä (esim. rakenne jota docistaKerrat ei tunne). */
        if (!kerrat.length) {
          tyhjia += 1;
          console.log('  [tyhjä] %s/%s kausidoc %s → 0 kertaa · kentät: %s',
            sid, pd.id, kd.id, Object.keys(kd.data() || {}).join(', '));
          continue;
        }
        for (const k of kerrat) {
          if (k.ohita) {
            ohitettuja += 1;
            console.log('  [ohitettu: ei seuran eikä Palloliiton käyttäjä] %s/%s %s (%d kohdetta)',
              sid, pd.id, k.uid, k.kohteita);
            continue;
          }
          kertoja += 1;
          if (KIRJOITA) {
            /* `luotu` VAIN luonnissa: uudelleenajo ei saa nollata luontiaikaa (sama sääntö kuin
               sovelluksen kirjoituspolussa — Rules myös vaatii sen muuttumattomuuden). */
            const ref = pd.ref.collection('arviointikerrat').doc(k.id);
            const nyky = await ref.get();
            const data = Object.assign({ paivitetty: admin.firestore.FieldValue.serverTimestamp() }, k.data);
            if (!nyky.exists) data.luotu = admin.firestore.FieldValue.serverTimestamp();
            await ref.set(data, { merge: true });
          } else {
            console.log('  [dry] %s/%s → arviointikerrat/%s (%d kohdetta · %s)',
              sid, pd.id, k.id, k.kohteita, k.data.arvioija_nimi || k.data.arvioija_org);
          }
        }
      }
    }
  }
  console.log('%s: %d seuraa · %d pelaajaa · %d kausidocia → %d kertaa · %d ohitettu · %d tyhjää docia',
    KIRJOITA ? 'KIRJOITETTU' : 'DRY-RUN', seurat.length, pelaajia, docceja, kertoja, ohitettuja, tyhjia);
  if (ohitettuja && !SISALLYTA_TUNTEMATTOMAT) {
    console.log('  → ohitetut ovat UID:itä joita ei löydy seuran eikä Palloliiton käyttäjistä.');
    console.log('    Ota mukaan lipulla --sisallyta-tuntemattomat, jos ne ovat aitoja arvioita.');
  }
}

if (require.main === module) {
  alusta();
  aja().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { docistaKerrat, haeArvioijat };
