#!/usr/bin/env node
'use strict';
/**
 * Huoltajakutsu — OIKEAN Firebase-salasanalinkin voimassaolon (1 h) todennus: luo linkin Admin SDK:lla ja tarkistaa sen toimivuuden kuluvan ajan funktiona (0 · 30 · 59 · 61 · 65 min).
 * TERO AJAA (tuotantoprojekti, ADC): node scripts/testaa_linkin_voimassaolo.js --email=<nimetyn KPV-testipelaajan huoltajan sähköposti>   (kestää ~66 min; pidä terminaali auki)
 *   Lisäliput: --nopea (tarkistukset 0·1·2 min — vain skriptin toiminnan kokeiluun, EI todista rajaa).
 * TURVAT: (1) email pitää olla pelaajan huoltajaEmail, ja pelaajan on oltava NIMETTY testipelaaja (CLAUDE.md §10: Topias O´Koskela, Toppari Testi, Testi Pelaaja, Testi Test, Tero Testaaja) — muuten keskeytetään.
 *   (2) Linkki EI KULUTU: tarkistus on `accounts:resetPassword` ilman uutta salasanaa (sama kuin verifyPasswordResetCode / checkActionCode); salasanaa ei muuteta eikä linkkiä lähetetä sähköpostiin.
 *   (3) Tulosteessa ei osoitteita, ei nimiä, ei linkkiä/koodia — vain minuutit ja tila.
 * Tulos: rivi per tarkistus: OK (koodi voimassa) | VANHENTUNUT (EXPIRED_OOB_CODE) | INVALID (INVALID_OOB_CODE). Odotus: 0/30/59 OK, 61/65 VANHENTUNUT.
 */
const NIMETYT = ['topias o´koskela', "topias o'koskela", 'toppari testi', 'testi pelaaja', 'testi test', 'tero testaaja'];
const API_KEY = 'AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo';   // julkinen web-avain (sama kuin sovelluksissa)

/* Puhtaat apurit (testattu tests/testaa_linkin_voimassaolo.test.js) */
function oobKoodi(url) { const m = /[?&]oobCode=([^&#]+)/.exec(String(url || '')); return m ? decodeURIComponent(m[1]) : null; }
function tulkitse(status, body) {   // Identity Toolkit -vastaus → OK | VANHENTUNUT | INVALID | VIRHE
  if (status === 200 && body && !body.error) return 'OK';
  const msg = String(body && body.error && body.error.message || '');
  if (/EXPIRED_OOB_CODE/.test(msg)) return 'VANHENTUNUT';
  if (/INVALID_OOB_CODE/.test(msg)) return 'INVALID';
  return 'VIRHE';
}
function onNimetty(etunimi, sukunimi) { return NIMETYT.indexOf((String(etunimi || '') + ' ' + String(sukunimi || '')).trim().toLowerCase()) >= 0; }

async function tarkista(koodi, fetchF) {
  const r = await (fetchF || fetch)('https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=' + API_KEY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ oobCode: koodi }) });
  let body = null; try { body = await r.json(); } catch (e) { body = null; }
  return tulkitse(r.status, body);
}

async function main() {
  const admin = require('firebase-admin');
  const email = ((process.argv.find((a) => a.startsWith('--email=')) || '').slice(8) || '').toLowerCase().trim();
  const nopea = process.argv.includes('--nopea');
  if (!email) { console.error('Anna --email=<nimetyn testipelaajan huoltajan sähköposti>'); process.exit(2); }
  if (!admin.apps.length) admin.initializeApp({ projectId: 'talentmaster-pilot' });
  const sn = await admin.firestore().collectionGroup('pelaajat').where('huoltajaEmail', '==', email).get();
  const lapset = []; sn.forEach((d) => lapset.push(d.data() || {}));
  if (!lapset.length || !lapset.every((p) => onNimetty(p.etunimi, p.sukunimi))) { console.error('KESKEYTETTY: osoite ei ole (pelkästään) nimetyn testipelaajan huoltajaEmail. Ei luotu linkkiä.'); process.exit(3); }
  console.log('Testipelaaja(t) tunnistettu (' + lapset.length + ' kpl, nimetty). Luodaan salasanalinkki…');
  const linkki = await admin.auth().generatePasswordResetLink(email, { url: 'https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Vanhempi_v2.html', handleCodeInApp: false });
  const koodi = oobKoodi(linkki); if (!koodi) { console.error('oobCode puuttuu linkistä'); process.exit(4); }
  const alku = Date.now(), minuutit = nopea ? [0, 1, 2] : [0, 30, 59, 61, 65];
  console.log('Luotu ' + new Date(alku).toISOString() + '. Tarkistukset (min): ' + minuutit.join(', ') + (nopea ? '  [NOPEA — ei todista rajaa]' : ''));
  for (const m of minuutit) {
    const odota = alku + m * 60000 - Date.now(); if (odota > 0) await new Promise((r) => setTimeout(r, odota));
    const tila = await tarkista(koodi);
    console.log(String(m).padStart(3) + ' min (todellinen ' + ((Date.now() - alku) / 60000).toFixed(1) + ' min): ' + tila);
  }
  console.log('Valmis. Odotus: 0/30/59 OK · 61/65 VANHENTUNUT.');
}
if (require.main === module) main().catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
module.exports = { oobKoodi, tulkitse, onNimetty, tarkista, NIMETYT };
