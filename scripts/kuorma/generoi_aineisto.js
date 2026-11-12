#!/usr/bin/env node
'use strict';
/* generoi_aineisto.js — projekti 06 PR 2: synteettisen aineiston generaattori stagingiin (VAIHE0 §2, P10–P12). Tero ajaa (gcloud ADC):
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging                       KUIVA-AJO (oletus): laskee dokumenttimäärät, ei kirjoita mitään
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --aja                 kirjoittaa (profiili savu = 2 seuraa, 1 000 pelaajaa)
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --tyhjenna            kuiva-ajo: montako synteettistä seuraa poistettaisiin
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --tyhjenna --aja      poistaa (recursiveDelete)
 * 2b: profiili savu_taysi (savu + kalenteri, henkilökunta + Auth, toimenpiteet, 3 kautta) ja taysi (40 seuraa). Auth-tilit @kuorma.test (uid kuorma_…); salasanat VAIN tiedostoon
 *   --tunnukset=<polku> (oletus <repo>/.briefit/staging_tunnukset.txt, gitignorattu, 0600) — ei tulosteeseen. --tyhjenna poistaa myös nämä Auth-tilit (vain @kuorma.test + uid kuorma_).
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --sa-sahkoposti=<Teron Google-osoite> [--aja]   → admins/{uid} (uid stagingin Authista; kirjaudu stagingiin ensin kerran)
 * PR 3b (pelaajan PalloID + PIN -kirjautuminen mittauksiin): --pin-pelaaja luo jokaiselle seuralle YHDEN kirjautumiskelpoisen pelaajan (ikä ≥ 10, suostumusTila 'annettu', normalisoitu palloId, PIN-hajautus `_pelaajaPin`);
 *   PIN (6 num., crypto.randomInt) vain tunnustiedostoon riville pelaaja.sNN@kuorma.test (+ PalloID 5. sarakkeeseen), ei tulosteeseen. --vain-pinit = vain tämä vaihe olemassa olevaa aineistoa vasten (ei regeneroi; päivittää vain 1 pelaajadokumentin/seura).
 *   --tyhjenna poistaa myös `_pelaajaPin/kuorma_…` -dokumentit ja pelaajien Auth-tilit (uid pel_kuorma_…).
 * Valinnat: --profiili=savu (oletus) · --siemen=1 (oletus; sama siemen → sama aineisto, P10) · --projekti PAKOLLINEN (ei oletusta).
 * LUKKO (lukko.js): vain talentmaster-staging[-x] / demo-kuorma; --projekti + env + ADC:n quota-projekti kaikki samaa; muu kaatuu ENNEN Admin SDK:n alustusta.
 * TYHJENNYS koskee VAIN seuroja, joiden id alkaa `kuorma_` JA dokumentilla synteettinen === true (muuta ei kosketa, vaikka projekti olisi väärä).
 * Kirjoitus BulkWriterilla, ramp-up 500/s → 5 000/s (500/50/5-sääntö). Tuloste: vain lukumäärät — ei nimiä, tunnisteita eikä id:itä. */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const K = require(path.join(__dirname, '..', '..', 'functions', 'pelaajakirjautuminen.js'));   // hajautaPin = sama kuin kirjautumisfunktiossa
const L = require('./lukko.js');
const A = require('./aineisto.js');
const T = require('./trigger_arvio.js');

const SEURA_ETUVALI = 'kuorma_';
const OLETUS_TUNNUKSET = path.join(__dirname, '..', '..', '.briefit', 'staging_tunnukset.txt');

function lueArgv(argv) {
  const o = { aja: false, tyhjenna: false, profiili: 'savu', siemen: '1', projekti: undefined, tunnukset: OLETUS_TUNNUKSET, saSahkoposti: undefined, pinPelaaja: false, vainPinit: false, tuntematon: [] };
  (argv || []).forEach((a) => {
    if (a === '--aja') o.aja = true; else if (a === '--tyhjenna') o.tyhjenna = true; else if (a === '--kuiva') o.aja = false; else if (a === '--pin-pelaaja') o.pinPelaaja = true; else if (a === '--vain-pinit') { o.pinPelaaja = true; o.vainPinit = true; }
    else if (a.indexOf('--projekti=') === 0) o.projekti = a.slice(11); else if (a.indexOf('--profiili=') === 0) o.profiili = a.slice(11);
    else if (a.indexOf('--siemen=') === 0) o.siemen = a.slice(9); else if (a.indexOf('--tunnukset=') === 0) o.tunnukset = a.slice(12); else if (a.indexOf('--sa-sahkoposti=') === 0) o.saSahkoposti = a.slice(16); else o.tuntematon.push(a);
  });
  return o;
}

/** Tyhjennettävät seurat: id-etuliite JA synteettinen === true. → [{ id, ref }] */
async function tyhjennettavat(db) {
  const snap = await db.collection('seurat').get();
  return snap.docs.filter((d) => d.id.indexOf(SEURA_ETUVALI) === 0 && d.data() && d.data().synteettinen === true).map((d) => ({ id: d.id, ref: d.ref }));
}


/** Synteettinen Auth-tili? VAIN näitä luodaan ja poistetaan: @kuorma.test + uid kuorma_-alkuinen. */
function onSynteettinenTili(email, uid) { return typeof email === 'string' && email.endsWith('@' + A.TILI_DOMAIN) && typeof uid === 'string' && uid.indexOf(SEURA_ETUVALI) === 0; }

/** Synteettinen pelaajan Auth-tili (custom token, ei sähköpostia): uid 'pel_' + seuraId (kuorma_…). */
function onSynteettinenPelaajaTili(uid) { return typeof uid === 'string' && uid.indexOf('pel_' + SEURA_ETUVALI) === 0; }

function lueTunnusRivit(tunnuksetPolku) {
  const rivit = new Map();
  try { fs.readFileSync(tunnuksetPolku, 'utf8').split('\n').forEach((l) => { const o = l.split('\t'); if (o.length >= 2 && o[0].indexOf('#') !== 0) rivit.set(o[0], l); }); } catch (e) { /* ei vielä tiedostoa */ }
  return rivit;
}
function kirjoitaTunnusRivit(tunnuksetPolku, rivit) {
  fs.mkdirSync(path.dirname(tunnuksetPolku), { recursive: true });
  fs.writeFileSync(tunnuksetPolku, '# staging-tunnukset (synteettiset) — email\tsalasana\trooli\tseura[\tpalloId] — ÄLÄ COMMITOI\n' + Array.from(rivit.values()).join('\n') + '\n', { mode: 0o600 });
  fs.chmodSync(tunnuksetPolku, 0o600);
}

function salasana() { return crypto.randomBytes(15).toString('base64url'); }

/** Luo puuttuvat tilit + claims {rooli, seuraId}. Salasanat vain tiedostoon (0600), olemassa olevan rivit säilyvät. → { luotu, olemassa, ilmanTunnusta }. */
async function luoTilit(auth, lista, tunnuksetPolku) {
  const rivit = lueTunnusRivit(tunnuksetPolku);
  let luotu = 0, olemassa = 0, ilmanTunnusta = 0;
  for (const h of lista) {
    if (!onSynteettinenTili(h.email, h.uid)) throw new Error('Ei-synteettinen tili generaattorin listassa — keskeytetty.');
    let on = true; try { await auth.getUser(h.uid); } catch (e) { if (e && e.code === 'auth/user-not-found') on = false; else throw e; }
    if (on) { olemassa++; if (!rivit.has(h.email)) ilmanTunnusta++; continue; }
    const pw = salasana();
    await auth.createUser({ uid: h.uid, email: h.email, password: pw, emailVerified: true, displayName: h.etunimi + ' ' + h.sukunimi });
    await auth.setCustomUserClaims(h.uid, { rooli: h.rooli, seuraId: h.seuraId });
    rivit.set(h.email, h.email + '\t' + pw + '\t' + h.rooli + '\t' + h.seuraId); luotu++;
  }
  if (luotu) kirjoitaTunnusRivit(tunnuksetPolku, rivit);
  return { luotu, olemassa, ilmanTunnusta };
}

/** PR 3b: kirjautumiskelpoinen pelaaja per seura. lista = A.pinPelaajat(). Rivi pelaaja.sNN@kuorma.test = PIN (olemassa oleva rivi säilyy → ei uutta PIN:iä).
 *  Vain olemassa oleva synteettinen pelaajadokumentti päivitetään (update, ei luo tynkää). → { luotu, olemassa, puuttuu }. PIN:iä ei kirjoiteta muualle kuin tunnustiedostoon + hajautukseen. */
async function luoPelaajaPinit(db, lista, tunnuksetPolku, nyt) {
  const rivit = lueTunnusRivit(tunnuksetPolku);
  let luotu = 0, olemassa = 0, puuttuu = 0;
  for (const h of lista) {
    if (h.sid.indexOf(SEURA_ETUVALI) !== 0) throw new Error('Ei-synteettinen seura PIN-listassa — keskeytetty.');
    const avain = 'pelaaja.s' + String(h.si + 1).padStart(2, '0') + '@' + A.TILI_DOMAIN;
    if (rivit.has(avain)) { olemassa++; continue; }
    const ref = db.doc('seurat/' + h.sid + '/pelaajat/' + h.pid), snap = await ref.get();
    if (!snap.exists || !snap.data() || snap.data().synteettinen !== true) { puuttuu++; continue; }
    const pin = String(crypto.randomInt(100000, 1000000));
    const era = db.batch();
    era.set(db.doc('_pelaajaPin/' + h.sid + '_' + h.pid), { hash: K.hajautaPin(pin), luotu: nyt == null ? Date.now() : nyt, lahde: 'kuorma_generaattori' });
    era.update(ref, { palloId: h.palloId, suostumusTila: 'annettu' });
    await era.commit();
    rivit.set(avain, avain + '\t' + pin + '\tpelaaja\t' + h.sid + '\t' + h.palloId); luotu++;
  }
  if (luotu) kirjoitaTunnusRivit(tunnuksetPolku, rivit);
  return { luotu, olemassa, puuttuu };
}

/** Poistettavat synteettiset Auth-tilit (sivutettu listUsers; suodatin onSynteettinenTili). */
async function poistettavatTilit(auth) {
  const ulos = []; let token;
  do { const r = await auth.listUsers(1000, token); r.users.forEach((u) => { if (onSynteettinenTili(u.email, u.uid) || onSynteettinenPelaajaTili(u.uid)) ulos.push(u.uid); }); token = r.pageToken; } while (token);
  return ulos;
}

/** deps: { luoDb(projekti) → { db, bulkWriter() , projektiVarmistus } , kirjaa(rivi), env, adc }. Palauttaa exit-koodin 0/1/2. */
async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv);
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl). Katso skriptin otsikko.'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }   // ENNEN mitään Admin SDK -kutsua
  const profiili = A.PROFIILIT[a.profiili];
  if (!profiili) { virhe('Tuntematon profiili. Saatavilla: ' + Object.keys(A.PROFIILIT).join(', ')); return 2; }
  const moodi = a.tyhjenna ? 'TYHJENNYS' : 'GENEROINTI', kuiva = !a.aja;
  kirjaa(moodi + (kuiva ? ' (KUIVA-AJO, ei kirjoita)' : ' (KIRJOITTAA)') + ' · projekti ' + lukko.projekti + ' · profiili ' + profiili.nimi + ' · siemen ' + a.siemen);
  if (a.saSahkoposti !== undefined) {   // SA-vaihe: vain admins/{uid} Teron Google-tilille (ei generointia)
    if (a.tyhjenna) { virhe('--sa-sahkoposti ei yhdisty --tyhjenna-valintaan.'); return 2; }
    const y = await d.luoDb(lukko.projekti);
    if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
    let u; try { u = await y.auth.getUserByEmail(a.saSahkoposti); } catch (e) { virhe('Tiliä ei löytynyt stagingin Authista. Kirjaudu stagingiin kerran Google-tilillä ja aja uudelleen.'); return 1; }
    if (kuiva) { kirjaa('  Tili löytyi stagingin Authista. Kirjoita admins/{uid} lisäämällä --aja.'); return 0; }
    await y.db.doc('admins/' + u.uid).set({ rooli: 'super_admin', superAdmin: true, luotu: new Date(), luoja: 'kuorma_generaattori', lahde: 'staging' }, { merge: true });
    kirjaa('admins-dokumentti kirjoitettu stagingiin (SA-oikeus).'); return 0;
  }
  if (a.vainPinit) {
    if (a.tyhjenna) { virhe('--vain-pinit ei yhdisty --tyhjenna-valintaan.'); return 2; }
    const lista = A.pinPelaajat(profiili);
    kirjaa('  ' + 'pin-pelaajat'.padEnd(18) + String(lista.length).padStart(9));
    if (kuiva) { kirjaa('Kuiva-ajo valmis. Kirjoita lisäämällä --aja.'); return 0; }
    const y = await d.luoDb(lukko.projekti);
    if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
    const t = await luoPelaajaPinit(y.db, lista, a.tunnukset);
    kirjaa('PIN-pelaajat: luotu ' + t.luotu + ', jo olemassa ' + t.olemassa + (t.puuttuu ? ', pelaajaa EI löytynyt ' + t.puuttuu + ' (generoi aineisto ensin)' : '') + '. PIN:t: tunnustiedosto (ei tulosteessa).');
    return t.puuttuu ? 1 : 0;
  }
  if (!a.tyhjenna) {
    const ls = A.laskeSeuroittain(profiili, a.siemen), m = ls.m;
    Object.keys(m).forEach((k) => kirjaa('  ' + k.padEnd(18) + String(m[k]).padStart(9)));
    T.muotoile(T.arvioiTriggerit(ls)).forEach((r) => kirjaa(r));   // kulu näkyy ennen --aja:ta
    if (profiili.henkilokuntaa) kirjaa('  ' + 'auth-tilit'.padEnd(18) + String(A.tilit(profiili).length).padStart(9));
    if (a.pinPelaaja) kirjaa('  ' + 'pin-pelaajat'.padEnd(18) + String(A.pinPelaajat(profiili).length).padStart(9));
    if (kuiva) { kirjaa('Kuiva-ajo valmis. Kirjoita lisäämällä --aja.'); return 0; }
  }
  const yhteys = await d.luoDb(lukko.projekti);
  if (yhteys.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
  const db = yhteys.db;
  if (a.tyhjenna) {
    const lista = await tyhjennettavat(db);
    const tilit = yhteys.auth ? await poistettavatTilit(yhteys.auth) : [];
    kirjaa('  poistettavia synteettisiä seuroja: ' + lista.length);
    const pelaajaTilit = tilit.filter(onSynteettinenPelaajaTili).length;
    kirjaa('  poistettavia synteettisiä Auth-tilejä (@' + A.TILI_DOMAIN + '): ' + (tilit.length - pelaajaTilit));
    kirjaa('  poistettavia pelaajien Auth-tilejä (pel_' + SEURA_ETUVALI + '…): ' + pelaajaTilit);
    const pinRefit = (await db.collection('_pelaajaPin').listDocuments()).filter((r) => r.id.indexOf(SEURA_ETUVALI) === 0);
    kirjaa('  poistettavia PIN-hajautuksia (_pelaajaPin/' + SEURA_ETUVALI + '…): ' + pinRefit.length);
    if (kuiva) { kirjaa('Kuiva-ajo valmis. Poista lisäämällä --aja.'); return 0; }
    const bw = yhteys.bulkWriter(); for (const s of lista) await db.recursiveDelete(s.ref, bw);
    pinRefit.forEach((r) => bw.delete(r).catch(() => {})); await bw.close();
    for (let i = 0; i < tilit.length; i += 1000) await yhteys.auth.deleteUsers(tilit.slice(i, i + 1000));
    kirjaa('Poistettu synteettisiä seuroja: ' + lista.length + ', Auth-tilejä: ' + tilit.length); return 0;
  }
  const bw = yhteys.bulkWriter(); let kirjoitettu = 0, epaonnistui = 0;
  bw.onWriteError((e) => { if (e.failedAttempts < 5) return true; epaonnistui++; return false; });
  for (const doc of A.generoi(profiili, a.siemen)) {
    bw.set(db.doc(doc.polku), doc.data).catch(() => {});
    if (++kirjoitettu % 25000 === 0) kirjaa('  jonossa ' + kirjoitettu + ' dokumenttia …');
  }
  await bw.close();
  kirjaa('Kirjoitettu ' + (kirjoitettu - epaonnistui) + ' dokumenttia, epäonnistui ' + epaonnistui + '.');
  if (profiili.henkilokuntaa && yhteys.auth) {
    const t = await luoTilit(yhteys.auth, A.tilit(profiili), a.tunnukset);
    kirjaa('Auth-tilit: luotu ' + t.luotu + ', jo olemassa ' + t.olemassa + (t.ilmanTunnusta ? ', ILMAN tunnusta tiedostossa ' + t.ilmanTunnusta + ' (poista --tyhjenna + aja uudelleen)' : '') + '. Salasanat: tunnustiedosto (ei tulosteessa).');
  }
  let pinPuuttuu = 0;
  if (a.pinPelaaja) {
    const t = await luoPelaajaPinit(db, A.pinPelaajat(profiili), a.tunnukset); pinPuuttuu = t.puuttuu;
    kirjaa('PIN-pelaajat: luotu ' + t.luotu + ', jo olemassa ' + t.olemassa + (t.puuttuu ? ', pelaajaa EI löytynyt ' + t.puuttuu : '') + '. PIN:t: tunnustiedosto (ei tulosteessa).');
  }
  return epaonnistui || pinPuuttuu ? 1 : 0;
}

/** Oikea Admin SDK. Alustetaan vasta lukon jälkeen; projektiId annetaan eksplisiittisesti. */
function luoOikeaDb(projekti) {
  const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: projekti });
  const db = admin.firestore();
  return { db, auth: admin.auth(), projekti: admin.app().options.projectId, bulkWriter: () => db.bulkWriter({ throttling: { initialOpsPerSecond: 500, maxOpsPerSecond: 5000 } }) };
}

if (require.main === module) main(process.argv.slice(2), { luoDb: luoOikeaDb }).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + (e && e.code ? e.code : 'tuntematon')); process.exit(2); });
module.exports = { main, lueArgv, tyhjennettavat, luoTilit, luoPelaajaPinit, poistettavatTilit, onSynteettinenTili, onSynteettinenPelaajaTili };
