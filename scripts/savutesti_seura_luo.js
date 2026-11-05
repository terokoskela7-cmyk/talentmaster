#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════
   scripts/savutesti_seura_luo.js — QG-3 tuotannon savutesti, synteettinen seura `qg_savu` (.briefit/QG3_SAVUTESTI_VAIHE0.md S1, hyväksytty 5.11.2026).
   · Data = QG-1:n fixture (tools/i18n/sv_fixtuuri.mjs dokitLage): keksityt nimet, sähköpostit @example.test, ei PalloID:tä oikealle henkilölle.
     Repo ja Actions-lokit ovat julkisia → savutestin löydöksissä saa näkyä vain tätä dataa (H1).
   · Päivämäärät siirretään ajohetkeen KOKONAISINA VIIKKOINA (viikonpäivät säilyvät, jakso on käynnissä viikolla 1–2). Aja uudelleen ~4 viikon välein.
   · Kirjoittaa VAIN: seurat/qg_savu/** (koko puu poistetaan ja kirjoitetaan uudelleen = idempotentti) + _pelaajaPin/qg_savu_qp1 (PIN-hajautus kuten
     palvelin) + qp1:n lukituslaskurien nollaus + yksi Auth-käyttäjä (rooli vp, seuraId qg_savu). Ei admins/-dokkia, ei selväkielistä PIN:iä.
   · Ei kirjoita liput/julkiset: kehitystyopoyta_v2 laitetaan päälle Admin → Liput (audit-loki, D1 #1191).
   · Laskutus ja yhteenvedot: seura + joukkueet demo:true (functions/laskutus_kuukausi.js ja Adminin yhteenvedot ohittavat), ei laskutus_asetuksia.
   · Vartijat ennen kirjoitusta: olemassa oleva seurat/qg_savu ilman savutesti-merkkiä → keskeytys · PalloID jo toisella pelaajalla → keskeytys ·
     sähköposti kuuluu käyttäjälle, jolla on muu seura/rooli tai admins/-dokki → keskeytys.
   Tunnistus: gcloud ADC (gcloud auth application-default login), EI palvelutiliavainta. Auth-kutsut vaativat quota-projektin:
     gcloud auth application-default set-quota-project talentmaster-pilot
   Salaisuudet ympäristömuuttujista tai kysytään piilotettuna (ei tulosteta koskaan):
     TM_SAVU_EMAIL · TM_SAVU_SALASANA · TM_SAVU_PELAAJA_TUNNISTE · TM_SAVU_PELAAJA_PIN (samat arvot GitHub Secretsiin)
   Käyttö: node scripts/savutesti_seura_luo.js            → kuiva-ajo (lukee vain, tulostaa suunnitelman)
           node scripts/savutesti_seura_luo.js --kirjoita → kirjoittaa, kun vahvistat kirjoittamalla KIRJOITA (tai --kylla)
════════════════════════════════════════════════════════════════════════ */
'use strict';
const path = require('path');
const { pathToFileURL } = require('url');
const K = require('../functions/pelaajakirjautuminen.js');

const PROJECT_ID = 'talentmaster-pilot';
const SID = 'qg_savu', LAHDE_SID = 'qgfx';
const PELAAJA = 'qp1';                                      // kirjautuva pelaaja (jakso + sitoumus + kehityskaari)
const PIN_POLKU = '_pelaajaPin/' + SID + '_' + PELAAJA;
const PV = 86400000, VK = 7 * PV;
const HENKILO = { etunimi: 'Jo', sukunimi: 'Strand' };     // fixturen VP-nimi (sama kuin fxvp); ei suomea → ei osu sv-tunnistimeen
const EI_SIIRRETA = new Set(['syntymaaika', 'syntymaVuosi']);   // ikä ei saa elää ajon mukana

/* ── Puhtaat apurit ── */
const ISO_PVM = /^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const ISO_VK = /^(\d{4})-W(\d{2})$/;
function siirraPvm(s, ms) {
  const m = ISO_PVM.exec(s); if (!m) return null;
  if (!m[2]) return new Date(Date.parse(m[1] + 'T12:00:00Z') + ms).toISOString().slice(0, 10);
  return new Date(Date.parse(s) + ms).toISOString();
}
function isoVkMaanantai(vuosi, vk) { const t = new Date(Date.UTC(vuosi, 0, 4)), pv = (t.getUTCDay() + 6) % 7; return Date.UTC(vuosi, 0, 4 - pv + (vk - 1) * 7); }
function isoVkAvain(ms) {
  const d = new Date(ms), to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);   // viikon torstai
  const vuosi = new Date(to).getUTCFullYear();
  return vuosi + '-W' + String(1 + Math.round((to - isoVkMaanantai(vuosi, 1) - 3 * PV) / VK)).padStart(2, '0');
}
function siirraVk(s, ms) { const m = ISO_VK.exec(s); return m ? isoVkAvain(isoVkMaanantai(+m[1], +m[2]) + ms) : null; }
const onEpoch = (v) => typeof v === 'number' && v > 1.6e12 && v < 2.2e12;
const vaihdaSid = (s) => (s === LAHDE_SID ? SID : s.indexOf(LAHDE_SID + '_') === 0 ? SID + s.slice(LAHDE_SID.length) : s);

/* Arvo: seura-id vaihdetaan, päivämäärät/aikaleimat/ISO-viikot siirretään. { __ts } jää merkiksi (kirjoittaja tekee Timestampin). */
function muunna(v, ms, avain) {
  if (Array.isArray(v)) return v.map((x) => muunna(x, ms));
  if (v && typeof v === 'object') {
    if (typeof v.__ts === 'string') return EI_SIIRRETA.has(avain) ? { __ts: v.__ts } : { __ts: new Date(Date.parse(v.__ts) + ms).toISOString() };
    const o = {}; for (const k of Object.keys(v)) o[vaihdaSid(k)] = muunna(v[k], ms, k); return o;   // myös avaimet (kooste.joukkueet[joukkueId])
  }
  if (typeof v === 'string') { const s = vaihdaSid(v); if (EI_SIIRRETA.has(avain)) return s; return siirraPvm(s, ms) || siirraVk(s, ms) || s; }
  if (onEpoch(v) && !EI_SIIRRETA.has(avain)) return v + ms;
  return v;
}
function muunnaPolku(p, ms, kausi) {
  const o = p.split('/').map((seg) => siirraVk(vaihdaSid(seg), ms) || (ISO_PVM.test(seg) ? siirraPvm(seg, ms) : vaihdaSid(seg)));
  const i = o.indexOf('idp_kausi'); if (i >= 0 && o[i + 1]) o[i + 1] = String(kausi);   // kausi = siirretyn "nyt"-hetken vuosi
  return o.join('/');
}

/* Siirto: kokonaiset viikot, alaspäin → fixturen "nyt" ≤ todellinen nyt (ei tulevaisuuteen kirjattuja kirjauksia). */
function viikkosiirto(fxNyt, nyt) { return Math.max(0, Math.floor((nyt - fxNyt) / VK)) * VK; }

/* PURE suunnitelma: dokit = sv_fixtuuri.dokitLage(), fxNyt = sv_fixtuuri.NYT. → { dokit: [{polku, data}], siirtoVk, kausi, virheet } */
function suunnittele(dokit, { fxNyt, nyt, tunniste }) {
  const virheet = [];
  const t = K.normalisoiTunnus(tunniste);
  if (!t) virheet.push('TM_SAVU_PELAAJA_TUNNISTE puuttuu tai ei ole muotoa A–Z0–9');
  const ms = viikkosiirto(fxNyt, nyt), kausi = new Date(fxNyt + ms).getUTCFullYear();
  const ulos = [];
  for (const [p, d] of Object.entries(dokit)) {
    if (/\/liput\//.test(p)) continue;                                        // lippu Administa (audit), ei seedistä
    if (/\/kayttajat\/fxvp$/.test(p)) continue;                               // VP = oikea Auth-käyttäjä (aja())
    const polku = muunnaPolku(p, ms, kausi), data = muunna(d, ms);
    if (polku === 'seurat/' + SID) { delete data.liput; Object.assign(data, { demo: true, savutesti: true, aktiivinen: true }); }
    if (/^seurat\/qg_savu\/joukkueet\/[^/]+$/.test(polku)) data.demo = true;
    if (polku === 'seurat/' + SID + '/pelaajat/' + PELAAJA && t) data.tunniste = t;
    ulos.push({ polku, data });
  }
  ulos.sort((a, b) => a.polku.split('/').length - b.polku.split('/').length || (a.polku < b.polku ? -1 : 1));
  return { dokit: ulos, siirtoVk: ms / VK, kausi, tunniste: t, virheet };
}

/* PURE synteettisyysvartija (ajetaan ennen jokaista kirjoitusta ja testeissä): vain qg_savu-polut, vain @example.test-osoitteet, ei PIN:iä, ei admins/. */
const SALLITUT_NIMET = new Set(['Alex', 'Berg', 'Kim', 'Lund', 'Robin', 'Ek', 'Noa', 'Dahl', 'Sam', 'Holm', 'Ola', 'Eli', 'Iris', 'Leo', 'Mio', 'Ada', 'Lind', 'Sund', 'Strom', 'Jo', 'Strand']);
function tarkistaSynteettisyys(dokit) {
  const v = [];
  const kavele = (x, polku, avain) => {
    if (Array.isArray(x)) return x.forEach((y) => kavele(y, polku, avain));
    if (x && typeof x === 'object') return Object.keys(x).forEach((k) => kavele(x[k], polku, k));
    if (typeof x !== 'string') return;
    for (const m of x.match(/[^\s"'<>(),;]+@[^\s"'<>(),;]+/g) || []) if (!/@example\.test$/i.test(m)) v.push(polku + ': sähköposti ei ole @example.test (' + avain + ')');
    if ((avain === 'etunimi' || avain === 'sukunimi') && !SALLITUT_NIMET.has(x)) v.push(polku + ': nimi ei ole synteettisellä listalla (' + avain + ')');
  };
  for (const { polku, data } of dokit) {
    if (!(polku === 'seurat/' + SID || polku.indexOf('seurat/' + SID + '/') === 0)) v.push('polku seuran ulkopuolella: ' + polku);
    if (/(^|\/)admins\//.test(polku)) v.push('admins-polku: ' + polku);
    if (data && (data.pin != null || data.palloID != null || data.palloId != null)) v.push(polku + ': pin/palloID-kenttä');
    if (data && data.seuraId != null && data.seuraId !== SID) v.push(polku + ': seuraId ' + data.seuraId);
    kavele(data, polku);
  }
  return v;
}

function onkoEmailKelpo(e) { return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function salasanaVirhe(s) { return typeof s === 'string' && s.length >= 16 ? null : 'TM_SAVU_SALASANA: vähintään 16 merkkiä'; }

/* ── Kirjoitus ── */
function elvyta(v, Timestamp) {
  if (Array.isArray(v)) return v.map((x) => elvyta(x, Timestamp));
  if (v && typeof v === 'object') { if (typeof v.__ts === 'string') return Timestamp.fromMillis(Date.parse(v.__ts)); const o = {}; for (const k of Object.keys(v)) o[k] = elvyta(v[k], Timestamp); return o; }
  return v;
}

async function aja({ admin, db, auth, dokit, fxNyt, nyt, salaiset, kirjoita, kylla, kysy, loki = console.log }) {
  const s = salaiset || {};
  const p = suunnittele(dokit, { fxNyt, nyt, tunniste: s.tunniste });
  if (!onkoEmailKelpo(s.email)) p.virheet.push('TM_SAVU_EMAIL puuttuu tai ei ole sähköpostiosoite');
  const sv = salasanaVirhe(s.salasana); if (sv) p.virheet.push(sv);
  const pin = K.normalisoiPin(s.pin); if (!pin || pin.length !== 6) p.virheet.push('TM_SAVU_PELAAJA_PIN: tasan 6 numeroa');
  p.virheet.push(...tarkistaSynteettisyys(p.dokit));
  if (p.virheet.length) { p.virheet.forEach((x) => loki('VIRHE: ' + x)); throw new Error('Suunnitelma hylätty (' + p.virheet.length + ' virhettä) — mitään ei kirjoitettu'); }

  const sRef = db.collection('seurat').doc(SID), sSnap = await sRef.get();
  if (sSnap.exists && (sSnap.data() || {}).savutesti !== true) throw new Error('seurat/' + SID + ' on olemassa ilman savutesti-merkkiä — ei kosketa (tarkista Consolesta)');
  const tSnap = await db.collectionGroup('pelaajat').where('tunniste', '==', p.tunniste).limit(5).get();
  const vieraat = tSnap.docs.filter((d) => d.ref.path !== 'seurat/' + SID + '/pelaajat/' + PELAAJA);
  if (vieraat.length) throw new Error('PalloID on jo ' + vieraat.length + ' muulla pelaajalla — valitse toinen TM_SAVU_PELAAJA_TUNNISTE');
  let kayttaja = null;
  try { kayttaja = await auth.getUserByEmail(s.email); } catch (e) { if (!e || e.code !== 'auth/user-not-found') throw e; }
  if (kayttaja) {
    const c = kayttaja.customClaims || {};
    if ((c.seuraId && c.seuraId !== SID) || (c.rooli && c.rooli !== 'vp') || c.super_admin || c.pelaajaSeuraId) throw new Error('Sähköposti kuuluu käyttäjälle, jolla on muu seura tai rooli — valitse oma savutestiosoite');
    if ((await db.collection('admins').doc(kayttaja.uid).get()).exists) throw new Error('Sähköposti kuuluu SA:lle (admins/) — valitse oma savutestiosoite');
  }

  const laskut = {}; p.dokit.forEach(({ polku }) => { const k = polku.split('/').filter((_, i) => i % 2 === 0).slice(1).join('/') || 'seura'; laskut[k] = (laskut[k] || 0) + 1; });
  loki('Seura ' + SID + ': ' + p.dokit.length + ' dokumenttia, päivämäärät siirretty ' + p.siirtoVk + ' viikkoa, kausi ' + p.kausi + '.');
  Object.keys(laskut).sort().forEach((k) => loki('  ' + k + ': ' + laskut[k]));
  loki('  ' + (sSnap.exists ? 'vanha seurat/' + SID + ' -puu poistetaan ja kirjoitetaan uudelleen' : 'seurat/' + SID + ' luodaan'));
  loki('  ' + PIN_POLKU + ': PIN-hajautus (scrypt, kuten palvelin) + lukituslaskurien nollaus');
  loki('  Auth: ' + (kayttaja ? 'olemassa oleva käyttäjä päivitetään' : 'uusi käyttäjä luodaan') + ' · claims { seuraId: ' + SID + ', rooli: vp } · kayttajat/{uid} (sähköposti-ilmoitukset pois)');
  loki('  Ei kirjoiteta: liput/julkiset (Admin → Liput), admins/, laskutus_asetukset.');
  if (!kirjoita) { loki('Kuiva-ajo: ei kirjoitettu. Kirjoita lipulla --kirjoita.'); return Object.assign(p, { kirjoitettu: false }); }
  if (!kylla) { const v = await kysy('Kirjoitetaanko? Vahvista kirjoittamalla KIRJOITA: '); if (String(v).trim() !== 'KIRJOITA') { loki('Peruttu: ei kirjoitettu.'); return Object.assign(p, { kirjoitettu: false }); } }

  const { Timestamp, FieldValue } = admin.firestore;
  if (sSnap.exists) await db.recursiveDelete(sRef);
  for (let i = 0; i < p.dokit.length; i += 400) {
    const b = db.batch();
    p.dokit.slice(i, i + 400).forEach(({ polku, data }) => b.set(db.doc(polku), elvyta(data, Timestamp)));
    await b.commit();
  }
  const pelaaja = p.dokit.find((d) => d.polku === 'seurat/' + SID + '/pelaajat/' + PELAAJA).data;
  const b = db.batch();
  b.set(db.doc(PIN_POLKU), { hash: K.hajautaPin(pin), luotu: FieldValue.serverTimestamp(), lahde: 'savutesti_seura_luo' });
  [K.linkkiLukitusAvain(SID, PELAAJA), K.pelaajaLukitusAvain(SID, PELAAJA), K.palloIdLukitusAvain(p.tunniste)].forEach((a) => b.delete(db.collection('_kirjautumisyritykset').doc(a)));
  await b.commit();
  if (!pelaaja.tunniste) throw new Error('pelaajan tunniste puuttuu');

  const uid = kayttaja ? kayttaja.uid : (await auth.createUser({ email: s.email, password: s.salasana, emailVerified: true, displayName: HENKILO.etunimi + ' ' + HENKILO.sukunimi })).uid;
  if (kayttaja) await auth.updateUser(uid, { password: s.salasana, disabled: false, emailVerified: true });
  await auth.setCustomUserClaims(uid, { seuraId: SID, rooli: 'vp' });
  await sRef.collection('kayttajat').doc(uid).set({ rooli: 'vp', etunimi: HENKILO.etunimi, sukunimi: HENKILO.sukunimi, email: s.email.toLowerCase(), seuraId: SID, aktiivinen: true, savutesti: true,
    notif_asetukset: { email: { enabled: false } }, luotu: FieldValue.serverTimestamp() });
  loki('✓ Kirjoitettu: ' + p.dokit.length + ' dokumenttia + PIN-hajautus + Auth-käyttäjä. Seuraavaksi Admin → Liput → ' + SID + ' → kehitystyopoyta_v2 päälle.');
  return Object.assign(p, { kirjoitettu: true, uid });
}

/* Piilotettu kysely (salasana, PIN): syöte ei kaiu näytölle. */
function kysySalainen(q) {
  return new Promise((r) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = function (x) { if (x.indexOf(q) === 0) process.stdout.write(x); };
    rl.question(q, (v) => { rl.close(); process.stdout.write('\n'); r(v); });
  });
}
function kysy(q) { return new Promise((r) => { const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, (v) => { rl.close(); r(v); }); }); }

async function lataaFixtuuri() {
  const fx = await import(pathToFileURL(path.join(__dirname, '..', 'tools/i18n/sv_fixtuuri.mjs')).href);
  return { dokit: fx.dokitLage(), fxNyt: fx.NYT };
}

async function main() {
  const argv = process.argv.slice(2), e = process.env;
  const salaiset = {
    email: e.TM_SAVU_EMAIL || (await kysy('TM_SAVU_EMAIL: ')).trim(),
    salasana: e.TM_SAVU_SALASANA || await kysySalainen('TM_SAVU_SALASANA (ei näy): '),
    tunniste: e.TM_SAVU_PELAAJA_TUNNISTE || (await kysy('TM_SAVU_PELAAJA_TUNNISTE: ')).trim(),
    pin: e.TM_SAVU_PELAAJA_PIN || (await kysySalainen('TM_SAVU_PELAAJA_PIN (ei näy): ')).trim(),
  };
  const { dokit, fxNyt } = await lataaFixtuuri();
  const admin = require('firebase-admin'); if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  await aja({ admin, db: admin.firestore(), auth: admin.auth(), dokit, fxNyt, nyt: Date.now(), salaiset, kirjoita: argv.includes('--kirjoita'), kylla: argv.includes('--kylla'), kysy });
}
module.exports = { suunnittele, tarkistaSynteettisyys, aja, viikkosiirto, siirraPvm, siirraVk, isoVkAvain, isoVkMaanantai, lataaFixtuuri, SID, PELAAJA, PIN_POLKU, SALLITUT_NIMET };
if (require.main === module) main().catch((err) => { console.error('VIRHE:', err.message); process.exit(1); });
