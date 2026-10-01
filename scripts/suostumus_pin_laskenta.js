#!/usr/bin/env node
/**
 * Suostumus + PIN -laskenta (read-only, 1.10.2026) — pohja Teron päätökselle QR-suostumuskortista.
 * EI kirjoita mitään. Tulostaa vain seuraId:t, joukkueiden nimet ja lukumäärät — EI pelaajien nimiä,
 * sähköposteja, PIN-koodeja eikä uid:itä.
 *
 * Seuroittain ja joukkueittain:
 *   pelaajat · suostumus annettu · suostumus puuttuu · puuttuu MUTTA PIN olemassa · näistä kirjautunut 30 pv
 *
 * MÄÄRITELMÄT (samat kuin palvelimella):
 *   Suostumus annettu = suostumusTila === 'annettu' TAI suostumus.annettu asetettu
 *     (functions/index.js vahvistaSuostumus: `joAnnettu`). vahvistaSuostumus kirjoittaa molemmat
 *     + suostumusAnnettu-aikaleiman + suostumukset[].
 *   PIN olemassa = pelaajadokumentin pin (4 tai 6 numeroa) TAI _pelaajaPin/{seuraId}_{pelaajaId} (hajautus, PR 4).
 *   Pelaajan kirjautuminen = Auth-käyttäjä pel_{seuraId}_{pelaajaId} (pelaajaKirjaudu → custom token):
 *     max(lastSignInTime, lastRefreshTime). HUOM: custom token -kirjautuminen otettiin käyttöön Vaihe 0 / PR 1:ssä
 *     (syyskuu 2026); sitä vanhemmat anonyymit kirjautumiset eivät näy tässä.
 *   Joukkue = pelaajan pääjoukkue (joukkue || joukkueNimi || joukkueetNimet[0]) → pelaaja lasketaan kerran.
 *
 * Lisäksi raportti SUOSTUMUKSEN TALLENNUSMUODOISTA: montako pelaajaa kullakin kenttäyhdistelmällä
 * (suostumusTila-arvo × suostumus.annettu × suostumusAnnettu × suostumukset[]) → näkyy, onko vanhoja muotoja.
 *
 * AJO (gcloud ADC, Teron tili):  node scripts/suostumus_pin_laskenta.js
 */
const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'talentmaster-pilot' });

const PAIVA_MS = 864e5;
const RAJA_MS = Date.now() - 30 * PAIVA_MS;
const annettu = (p) => p.suostumusTila === 'annettu' || !!(p.suostumus && p.suostumus.annettu);
const pinKentassa = (p) => p.pin != null && /^(\d{4}|\d{6})$/.test(String(p.pin));
const paajoukkue = (p) => String(p.joukkue || p.joukkueNimi || (Array.isArray(p.joukkueetNimet) && p.joukkueetNimet[0]) || '').trim() || '(ei joukkuetta)';

async function pelaajienKirjautumiset() {
  const m = new Map();   // 'seuraId_pelaajaId' → viimeisin aktiivisuus (ms)
  let sivu;
  do {
    const r = await admin.auth().listUsers(1000, sivu);
    for (const u of r.users) {
      if (!u.uid.startsWith('pel_')) continue;
      const t = Math.max(Date.parse(u.metadata.lastSignInTime || '') || 0, Date.parse(u.metadata.lastRefreshTime || '') || 0);
      m.set(u.uid.slice(4), t);   // pel_{seuraId}_{pelaajaId} → {seuraId}_{pelaajaId}
    }
    sivu = r.pageToken;
  } while (sivu);
  return m;
}

(async () => {
  const db = admin.firestore();
  const [pelSnap, pinSnap, kirjautumiset] = await Promise.all([
    db.collectionGroup('pelaajat').get(),
    db.collection('_pelaajaPin').get(),
    pelaajienKirjautumiset(),
  ]);
  const hajautetut = new Set(pinSnap.docs.map((d) => d.id));

  const seurat = {};      // seuraId → joukkue → laskurit
  const muodot = {};      // tallennusmuoto → kpl
  for (const d of pelSnap.docs) {
    const s = d.ref.parent.parent;
    if (!s || !s.parent || s.parent.id !== 'seurat') continue;   // vain seurat/{sid}/pelaajat
    const p = d.data() || {};
    const avain = s.id + '_' + d.id;
    const j = paajoukkue(p);
    const L = ((seurat[s.id] = seurat[s.id] || {})[j] = seurat[s.id][j] || { yht: 0, annettu: 0, puuttuu: 0, puuttuuPin: 0, puuttuuPinKirj30: 0 });
    L.yht++;
    if (annettu(p)) L.annettu++;
    else {
      L.puuttuu++;
      if (pinKentassa(p) || hajautetut.has(avain)) {
        L.puuttuuPin++;
        if ((kirjautumiset.get(avain) || 0) >= RAJA_MS) L.puuttuuPinKirj30++;
      }
    }
    const muoto = 'suostumusTila=' + (p.suostumusTila === undefined ? '(puuttuu)' : JSON.stringify(p.suostumusTila))
      + ' · suostumus.annettu=' + (p.suostumus && p.suostumus.annettu ? 'on' : 'ei')
      + ' · suostumusAnnettu=' + (p.suostumusAnnettu ? 'on' : 'ei')
      + ' · suostumukset[]=' + (Array.isArray(p.suostumukset) ? (p.suostumukset.length ? 'on' : 'tyhjä') : 'ei');
    muodot[muoto] = (muodot[muoto] || 0) + 1;
  }

  const sar = (x, n) => String(x).padStart(n);
  console.log('Suostumus + PIN seuroittain ja joukkueittain (kirjautuminen = viimeiset 30 pv)\n');
  console.log('seura / joukkue'.padEnd(40) + sar('pelaajat', 9) + sar('annettu', 9) + sar('puuttuu', 9) + sar('puuttuu+PIN', 13) + sar('…kirj. 30pv', 13));
  const yht = { yht: 0, annettu: 0, puuttuu: 0, puuttuuPin: 0, puuttuuPinKirj30: 0 };
  const rivi = (nimi, L) => console.log(nimi.slice(0, 39).padEnd(40) + sar(L.yht, 9) + sar(L.annettu, 9) + sar(L.puuttuu, 9) + sar(L.puuttuuPin, 13) + sar(L.puuttuuPinKirj30, 13));
  for (const sid of Object.keys(seurat).sort()) {
    const S = { yht: 0, annettu: 0, puuttuu: 0, puuttuuPin: 0, puuttuuPinKirj30: 0 };
    for (const L of Object.values(seurat[sid])) for (const k of Object.keys(S)) S[k] += L[k];
    rivi(sid, S);
    for (const j of Object.keys(seurat[sid]).sort()) rivi('  ' + j, seurat[sid][j]);
    for (const k of Object.keys(yht)) yht[k] += S[k];
  }
  rivi('YHTEENSÄ', yht);

  console.log('\nSuostumuksen tallennusmuodot (kpl):');
  Object.entries(muodot).sort((a, b) => b[1] - a[1]).forEach(([m, n]) => console.log(sar(n, 6) + '  ' + m));
  console.log('\nPelaajien Auth-tunnuksia (pel_*) yhteensä: ' + kirjautumiset.size);
  process.exit(0);
})().catch((e) => { console.error('Virhe:', e.message); process.exit(1); });
