#!/usr/bin/env node
/**
 * tarkista_vanhat_kirjoittajat.js — VAIN LUKEVA tarkistus ennen Rules v3.82:n (projekti 03 PR D) mergeä: onko vanha client vielä kirjoittamassa?
 * Tero ajaa (ADC): `! node scripts/tarkista_vanhat_kirjoittajat.js`  (gcloud auth application-default login). Ei kirjoita mitään, tulostaa vain LUKUMÄÄRÄT seuroittain
 * (ei dokumenttien sisältöä, ei nimiä, ei uid:eitä). Merge vain, jos "YHTEENSÄ" on 0 kummassakin tarkistuksessa.
 *
 * 1) toimenpiteet: tyyppi == 'automaattinen', id EI ala 'auto_' (vanhan clientin auto-id) ja luotu > 2026-11-09T16:27:35Z (PR C:n Hosting-deploy).
 *    Palvelimen ehdotukset (id auto_…) eivät laske. Luotu = serverTimestamp / Timestamp / ISO.
 *
 * 2) viimeisinKirjautuminen — vanha client (selaimen serverTimestamp) vs. palvelimen yöajo (functions/kirjautumisaika.js).
 *    Yöajo kirjoittaa kentän arvoksi max(Auth lastRefreshTime, lastSignInTime) AJON HETKELLÄ, ja vain kun Helsingin päivä on uudempi kuin kentän nykyinen päivä.
 *    Siitä seuraa kaksi luotettavaa (yksipuolista) erottelua:
 *      (a) yöajon alun jälkeen: palvelin ei voi kirjoittaa arvoa, joka on myöhemmin kuin ajon alku (Auth-ajat ovat ≤ ajon hetki). Arvo > viimeisimmän yöajon alku
 *          (oletus: viimeisin 03:30 Europe/Helsinki ≤ nyt; ohitus --yoajo=ISO) on siis JOKU MUU kuin yöajo = vanha client (tai käsin kirjoitettu). → LASKEE TULOKSEEN.
 *      (b) Auth-aktiivisuutta uudempi: arvo > max(lastRefreshTime, lastSignInTime) + toleranssi. Palvelin kirjoittaa täsmälleen Auth-ajan, joka ei voi myöhemmin olla arvoa pienempi. → LASKEE TULOKSEEN.
 *    EI luotettavaa erottelua (siksi muita kriteerejä ei ole): vanhan clientin kirjoitus ENNEN viimeisintä yöajoa, jonka arvo on lähellä Auth-aikaa (avaus päivittää tokenin → lastRefreshTime ≈ kirjoitushetki),
 *    on arvona identtinen palvelimen kirjoituksen kanssa; ajo myös jättää päivän sisällä kirjoitetun arvon rauhaan. Siksi (a) toimii vain ikkunassa "viimeisin yöajo → nyt":
 *    aja tarkistus KE 11.11. YÖAJON (03:30) JÄLKEEN, mieluiten työpäivän iltapäivänä, jolloin vanhan clientin avaukset ovat ehtineet näkyä. Kohta 1 on ensisijainen ja kattaa koko ajan deployn jälkeen.
 *    Ei Auth-tiliä (poistettu) → (b) ohitetaan, (a) arvioidaan silti.
 *
 * Käyttö: node scripts/tarkista_vanhat_kirjoittajat.js [--projekti=talentmaster-pilot] [--yoajo=2026-11-11T01:30:00Z]
 */
'use strict';

const DEPLOY_ISO = '2026-11-09T16:27:35Z';   // PR C:n Hosting-deploy
const TOLERANSSI_MS = 60 * 1000;             // Auth-sekunnit vs Firestore-aikaleima
const PROJEKTI_OLETUS = 'talentmaster-pilot';

function aikaMs(v) {
  try {
    if (v == null) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
    const ms = new Date(v).getTime();
    return isNaN(ms) ? null : ms;
  } catch (e) { return null; }
}

/* PURE: toimenpide-dokumentti → vanhan clientin auto-id-ehdotus deployn jälkeen? */
function onVanhaEhdotus(id, d, deployMs) {
  if (!d || d.tyyppi !== 'automaattinen') return false;
  if (String(id).indexOf('auto_') === 0) return false;
  const l = aikaMs(d.luotu);
  return l != null && l > deployMs;
}

/* Yöajon Auth-aktiivisuus: max(lastRefreshTime, lastSignInTime) — sama kuin functions/kirjautumisaika.js authAktiivisuusMs. */
function authAktiivisuusMs(user) {
  const m = (user && user.metadata) || {};
  const a = aikaMs(m.lastRefreshTime), b = aikaMs(m.lastSignInTime);
  if (a == null && b == null) return null;
  return Math.max(a == null ? 0 : a, b == null ? 0 : b);
}

const _hkiF = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/* PURE: viimeisin kirjautumisaikaYo-ajon alku (03:30 Europe/Helsinki) ≤ nytMs. Talvi UTC+2 → 01:30Z, kesä UTC+3 → 00:30Z. */
function viimeisinYoajonAlku(nytMs) {
  const d0 = new Date(nytMs);
  let paras = null;
  for (let p = 0; p <= 2; p++) {
    for (const h of [0, 1]) {   // UTC-tunti 00:30Z tai 01:30Z
      const c = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate() - p, h, 30);
      if (c <= nytMs && _hkiF.format(new Date(c)) === '03:30' && (paras == null || c > paras)) paras = c;
    }
  }
  return paras;
}

/* PURE: viimeisinKirjautuminen-arvo → { ei_dataa, ei_authia, yoajonJalkeen, authiaUudempi, vanha }
 * RAJAUS (PM 9.11.2026): vain PR C:n deployn JÄLKEEN tehdyt kirjoitukset voivat olla "vanhan clientin" merkki — vanha client sai kirjoittaa ennen deployta.
 *   2a yoajonJalkeen  = arvo > max(yöajon alku, deploy-aika)   (aiemmin vain yöajon alku → deployta edeltävät kirjoitukset antoivat väärän "älä mergeä" -päätöksen)
 *   2b authiaUudempi  = arvo > Auth-aktiivisuus + toleranssi  JA arvo > deploy-aika   (sama peruste: deployta edeltävä ei lasketa)
 * deployMs oletus = DEPLOY_ISO. */
function luokitteleKirjautuminen(arvo, authMs, yoajoMs, toleranssi, deployMs) {
  const t = toleranssi == null ? TOLERANSSI_MS : toleranssi;
  const dMs = deployMs == null ? aikaMs(DEPLOY_ISO) : deployMs;
  const ms = aikaMs(arvo);
  const r = { ei_dataa: false, ei_authia: false, yoajonJalkeen: false, authiaUudempi: false, vanha: false };
  if (ms == null) { r.ei_dataa = true; return r; }
  const raja = yoajoMs == null ? dMs : Math.max(yoajoMs, dMs);
  if (ms > raja) r.yoajonJalkeen = true;
  if (authMs == null) r.ei_authia = true; else if (ms > authMs + t && ms > dMs) r.authiaUudempi = true;
  r.vanha = r.yoajonJalkeen || r.authiaUudempi;
  return r;
}

function lisaa(kartta, avain, n) { kartta[avain] = (kartta[avain] || 0) + (n == null ? 1 : n); }

async function aja(argv) {
  const arg = (nimi) => { const a = argv.find((x) => x.indexOf('--' + nimi + '=') === 0); return a ? a.slice(nimi.length + 3) : null; };
  const projekti = arg('projekti') || PROJEKTI_OLETUS;
  const yoajoMs = arg('yoajo') ? aikaMs(arg('yoajo')) : viimeisinYoajonAlku(Date.now());
  const deployMs = aikaMs(DEPLOY_ISO);
  const admin = require('firebase-admin');
  admin.initializeApp({ projectId: projekti });   // ADC (gcloud auth application-default login); ei SA-avainta
  const db = admin.firestore(), auth = admin.auth();

  const tpVanha = {}, yoajonJalkeen = {}, authiaUudempi = {}, vanhaYht = {}, eiAuthia = {};
  const seurat = await db.collection('seurat').select().get();
  for (const s of seurat.docs) {
    const sid = s.id;
    const tp = await db.collection('seurat').doc(sid).collection('toimenpiteet').where('tyyppi', '==', 'automaattinen').get();
    tp.docs.forEach((d) => { if (onVanhaEhdotus(d.id, d.data(), deployMs)) lisaa(tpVanha, sid); });

    const ky = await db.collection('seurat').doc(sid).collection('kayttajat').select('viimeisinKirjautuminen').get();
    const rivit = ky.docs.filter((d) => d.get('viimeisinKirjautuminen') != null);
    for (let i = 0; i < rivit.length; i += 100) {
      const osa = rivit.slice(i, i + 100);
      const tulos = await auth.getUsers(osa.map((d) => ({ uid: d.id })));
      const am = {};
      tulos.users.forEach((u) => { am[u.uid] = authAktiivisuusMs(u); });
      osa.forEach((d) => {
        const r = luokitteleKirjautuminen(d.get('viimeisinKirjautuminen'), am[d.id] == null ? null : am[d.id], yoajoMs, null, deployMs);
        if (r.ei_authia) lisaa(eiAuthia, sid);
        if (r.yoajonJalkeen) lisaa(yoajonJalkeen, sid);
        if (r.authiaUudempi) lisaa(authiaUudempi, sid);
        if (r.vanha) lisaa(vanhaYht, sid);
      });
    }
  }
  const summa = (k) => Object.keys(k).reduce((a, x) => a + k[x], 0);
  const tulosta = (otsikko, k) => { console.log(otsikko); const ks = Object.keys(k).sort(); if (!ks.length) console.log('  (ei yhtään)'); ks.forEach((x) => console.log('  ' + x + ': ' + k[x])); console.log('  YHTEENSÄ: ' + summa(k)); };
  console.log('Projekti ' + projekti + ' · seuroja ' + seurat.size + ' · deploy ' + DEPLOY_ISO + ' · yöajon alku ' + new Date(yoajoMs).toISOString() + ' · vain lukumäärät');
  tulosta('1) toimenpiteet: tyyppi=automaattinen, id ei auto_, luotu > deploy', tpVanha);
  tulosta('2a) viimeisinKirjautuminen > max(yöajon alku, deploy) (palvelin ei voi kirjoittaa)', yoajonJalkeen);
  tulosta('2b) viimeisinKirjautuminen > Auth-aktiivisuus + ' + (TOLERANSSI_MS / 1000) + ' s ja > deploy', authiaUudempi);
  tulosta('2) yhteensä (a TAI b), kukin dokumentti kerran', vanhaYht);
  if (summa(eiAuthia)) tulosta('huom: ei Auth-tiliä (2b ohitettu näille)', eiAuthia);
  const tulos = summa(tpVanha) + summa(vanhaYht);
  console.log('\nPÄÄTÖS: ' + (tulos === 0 ? '0 — ei merkkejä vanhasta kirjoittajasta (1 ja 2). Muista ikkuna: 2 kattaa vain ajan viimeisimmästä yöajosta nyt.' : tulos + ' — älä mergeä Rules v3.82:ta.'));
  process.exitCode = tulos === 0 ? 0 : 1;
}

module.exports = { aikaMs, onVanhaEhdotus, authAktiivisuusMs, viimeisinYoajonAlku, luokitteleKirjautuminen, DEPLOY_ISO, TOLERANSSI_MS };
if (require.main === module) aja(process.argv.slice(2)).catch((e) => { console.error('Virhe:', e.message); process.exit(2); });
