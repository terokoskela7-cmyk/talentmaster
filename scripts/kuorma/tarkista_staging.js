#!/usr/bin/env node
'use strict';
/* tarkista_staging.js — VAIN LUKU: vastaako stagingin synteettinen aineisto profiilia? (taysi-OOM-selvitys 20.11.2026; yleiskäyttöinen "onko staging puhdas profiilin mukaan" -tarkistus.) Tero ajaa (gcloud ADC):
 *   ! node scripts/kuorma/tarkista_staging.js --projekti=talentmaster-staging --profiili=savu_taysi [--aikaikkuna-h=24] [--otos=300] [--ei-functions]
 * Tulostaa (vain lukumäärät + tilat, ei nimiä/tunnisteita/id:itä):
 *   1. Auth: synteettiset tilit (@kuorma.test + uid kuorma_…) ja pelaajatilit (pel_kuorma_…) — montako, profiilin odotus, YLIMÄÄRÄISET ja PUUTTUVAT, sekä aikaikkunassa LUODUT (uudet vs olemassa).
 *   2. Tunnustiedosto (.briefit/staging_tunnukset.txt): muokkausaika + rivimäärä + muuttuiko aikaikkunassa (salasanoja ei lueta tulosteeseen).
 *   3. Firestore: dokumenttimäärä kokoelmaryhmittäin (count-aggregaatio, vain luku) vs profiilin odotus (A.laskeSeuroittain) + profiilin ulkopuoliset seurat.
 *   4. Otosvertailu: joka n:s generoitu dokumentti haetaan ja verrataan (vanha = ennen #1306:ta tai uusi versio kelpaa) — nappaa ylikirjoitetun sisällön, jota lukumäärät eivät näytä.
 *   5. Triggerit: onko 4 kertymä-/notif-triggeriä deployattuna stagingiin (firebase functions:list; kulu jos kirjoitetaan).
 * Exit 0 = staging vastaa profiilia; 1 = poikkeamia (tai LUKKO); 2 = virheellinen käyttö. LUKKO (lukko.js) kuten generaattorissa. EI kirjoita mitään. */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const L = require('./lukko.js');
const A = require('./aineisto.js');
const TP = require('./tki_paivitys.js');
const POISTA = require('./poista_triggerit.js');
const G = require('./generoi_aineisto.js');

const OLETUS_TUNNUKSET = path.join(__dirname, '..', '..', '.briefit', 'staging_tunnukset.txt');
const luku = (x) => Math.round(x).toLocaleString('fi-FI').replace(/\s/g, ' ');

function lueArgv(argv) {
  const o = { profiili: undefined, aikaikkunaH: 24, otos: 300, functions: true, siemen: '1', projekti: undefined, tunnukset: OLETUS_TUNNUKSET, tuntematon: [] };
  (argv || []).forEach((x) => {
    if (x.indexOf('--projekti=') === 0) o.projekti = x.slice(11); else if (x.indexOf('--profiili=') === 0) o.profiili = x.slice(11); else if (x.indexOf('--aikaikkuna-h=') === 0) o.aikaikkunaH = Number(x.slice(15));
    else if (x.indexOf('--otos=') === 0) o.otos = Number(x.slice(7)); else if (x === '--ei-functions') o.functions = false; else if (x.indexOf('--siemen=') === 0) o.siemen = x.slice(9); else if (x.indexOf('--tunnukset=') === 0) o.tunnukset = x.slice(12); else o.tuntematon.push(x);
  });
  return o;
}

/** Auth-tilit: kaikki synteettiset (kuorma_ + pel_kuorma_) → { henkilokunta:[{uid,luotu}], pelaajat:[{uid,luotu}] } (sivutettu listUsers, vain luku). */
async function lueTilit(auth) {
  const henk = [], pel = []; let token;
  do {
    const r = await auth.listUsers(1000, token);
    r.users.forEach((u) => {
      const luotu = u.metadata && u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : NaN;
      if (G.onSynteettinenPelaajaTili(u.uid)) pel.push({ uid: u.uid, luotu }); else if (G.onSynteettinenTili(u.email, u.uid)) henk.push({ uid: u.uid, luotu });
    });
    token = r.pageToken;
  } while (token);
  return { henk, pel };
}

async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv), nyt = d.nyt ? d.nyt() : Date.now();
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl). Katso skriptin otsikko.'); return 2; }
  if (!a.profiili || !A.PROFIILIT[a.profiili]) { virhe('Anna --profiili= (' + Object.keys(A.PROFIILIT).join(', ') + ') — se profiili, jonka pitäisi olla stagingissa.'); return 2; }
  if (!(a.aikaikkunaH > 0) || !(a.otos > 0)) { virhe('--aikaikkuna-h ja --otos positiivisia lukuja.'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }   // ENNEN Admin SDK:ta
  const profiili = A.PROFIILIT[a.profiili], n = profiili.seurat.length, ikkunaAlku = nyt - a.aikaikkunaH * 3600 * 1000;
  kirjaa('TARKISTUS (vain luku) · projekti ' + lukko.projekti + ' · odotettu profiili ' + profiili.nimi + ' (' + n + ' seuraa) · aikaikkuna ' + a.aikaikkunaH + ' h');
  const y = await d.luoDb(lukko.projekti);
  if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
  let poikkeamia = 0;

  // 1. Auth
  if (y.auth) {
    const t = await lueTilit(y.auth), odotetut = new Set(A.tilit(profiili).map((x) => x.uid)), olemassa = new Set(t.henk.map((x) => x.uid));
    const yli = t.henk.filter((x) => !odotetut.has(x.uid)).length, puuttuu = [...odotetut].filter((u) => !olemassa.has(u)).length;
    const uudet = t.henk.concat(t.pel).filter((x) => x.luotu >= ikkunaAlku).length, ylPel = t.pel.filter((x) => (G.seuraNro(x.uid) || 0) > n).length;
    kirjaa('1. Auth: henkilökunnan synteettisiä tilejä ' + t.henk.length + ' (profiilin odotus ' + odotetut.size + ', ylimääräisiä ' + yli + ', puuttuu ' + puuttuu + ') · pelaajatilejä ' + t.pel.length + ' (profiilin ulkopuolisia ' + ylPel + ')');
    kirjaa('   luotu aikaikkunassa (' + a.aikaikkunaH + ' h): ' + uudet + (uudet ? '  ← UUSIA tilejä' : '  (ei uusia)'));
    if (yli || puuttuu || ylPel || uudet) poikkeamia++;
  } else kirjaa('1. Auth: ei yhteyttä Auth-palveluun — ohitettu.');

  // 2. Tunnustiedosto
  try {
    const st = fs.statSync(a.tunnukset), rivit = fs.readFileSync(a.tunnukset, 'utf8').split('\n').filter((r) => r.trim() && r.indexOf('#') !== 0).length;
    const muuttui = st.mtimeMs >= ikkunaAlku;
    kirjaa('2. Tunnustiedosto: muokattu ' + new Date(st.mtimeMs).toISOString() + ' · tunnusrivejä ' + rivit + (muuttui ? '  ← MUUTTUNUT aikaikkunassa' : '  (ei muutosta aikaikkunassa)'));
    if (muuttui) poikkeamia++;
  } catch (e) { kirjaa('2. Tunnustiedosto: ei luettavissa (' + (e && e.code ? e.code : 'virhe') + ').'); }

  // 3. Firestore-lukumäärät
  const odotus = A.laskeSeuroittain(profiili, a.siemen).m, avaimet = Object.keys(odotus).filter((k) => k !== 'yht').sort();
  kirjaa('3. Firestore (kokoelmaryhmä: todellinen / odotus):');
  let erot = 0;
  for (const k of avaimet) {
    const c = (await y.db.collectionGroup(k).count().get()).data().count, ero = c - odotus[k];
    if (ero) erot++;
    kirjaa('   ' + k.padEnd(16) + luku(c).padStart(11) + ' / ' + luku(odotus[k]).padStart(11) + (ero ? '   ← ' + (ero > 0 ? '+' : '') + luku(ero) : ''));
  }
  const odotetutSeurat = new Set(profiili.seurat.map((_, si) => A.seuraId(si))), seuratNyt = await y.db.collection('seurat').listDocuments();
  const ylSeurat = seuratNyt.filter((r) => r.id.indexOf('kuorma_') === 0 && !odotetutSeurat.has(r.id)).length, puuSeurat = [...odotetutSeurat].filter((id) => !seuratNyt.some((r) => r.id === id)).length;
  kirjaa('   profiilin ulkopuolisia synteettisiä seuroja ' + ylSeurat + ' · profiilin seuroja puuttuu ' + puuSeurat);
  if (erot || ylSeurat || puuSeurat) poikkeamia++;

  // 4. Otosvertailu
  const otos = TP.otos(A, profiili, a.siemen, a.otos), haettu = await TP.haeDokumentit(y.db, otos.map((x) => x.polku));
  let poikkeaa = 0, puuttuu = 0;
  for (const x of otos) { const h = haettu.get(x.polku); if (!h || !h.exists) puuttuu++; else if (!TP.sama(h.data, x.uusi) && !TP.sama(h.data, x.vanha)) poikkeaa++; }
  kirjaa('4. Otosvertailu: ' + otos.length + ' dokumenttia tasavälein koko virrasta → vastaa generoitua ' + (otos.length - poikkeaa - puuttuu) + ' · SISÄLTÖ POIKKEAA ' + poikkeaa + ' · puuttuu ' + puuttuu);
  if (poikkeaa || puuttuu) poikkeamia++;

  // 5. Triggerit
  if (a.functions) {
    const r = (d.suorita || ((c, ar) => spawnSync(c, ar, { encoding: 'utf8' })))('npx', ['firebase', 'functions:list', '--project', lukko.projekti]);
    if (!r || r.status !== 0) kirjaa('5. Triggerit: functions:list ei onnistunut — aja käsin: npx firebase functions:list --project ' + lukko.projekti);
    else {
      const teksti = String(r.stdout || ''), on = POISTA.TRIGGERIT.filter((t) => teksti.indexOf(t) >= 0);
      kirjaa('5. Triggerit deployattuna stagingiin: ' + on.length + '/' + POISTA.TRIGGERIT.length + (on.length ? ' (' + on.join(', ') + ') → massakirjoitus laukaisee ne = kulua' : ' → massakirjoitus ei laukaise triggereitä'));
    }
  }
  kirjaa(poikkeamia ? 'TULOS: ' + poikkeamia + ' poikkeamaa — staging EI vastaa profiilia ' + profiili.nimi + '.' : 'TULOS: staging vastaa profiilia ' + profiili.nimi + '.');
  return poikkeamia ? 1 : 0;
}

if (require.main === module) main(process.argv.slice(2), { luoDb: G.luoOikeaDb }).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + (e && e.code ? e.code : 'tuntematon')); process.exit(2); });
module.exports = { main, lueArgv, lueTilit };
