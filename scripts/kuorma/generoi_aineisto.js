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
 * admins/ saa VAIN --sa-sahkoposti-tilin: ei-kuorma-osoite TAI sa.<nimi>@kuorma.test (esim. sa.tero@kuorma.test; stagingissa ei Google-kirjautumista). Generaattorin tilit (<rooli>.sNN@kuorma.test, kuorma_-uid) estetty; --siivoa-admins jättää sallitut SA:t aina.
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --kuiva-tarkistus          listaa admins/-dokumentit (uid + email), vain luku; exit 1 jos synteettinen löytyy
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --siivoa-admins [--aja]     poistaa VAIN synteettiset admins/-dokumentit (oletus kuiva-ajo)
 * PR 3b (pelaajan PalloID + PIN -kirjautuminen mittauksiin): --pin-pelaaja luo jokaiselle seuralle YHDEN kirjautumiskelpoisen pelaajan (ikä ≥ 10, suostumusTila 'annettu', normalisoitu palloId, PIN-hajautus `_pelaajaPin`);
 *   PIN (6 num., crypto.randomInt) vain tunnustiedostoon riville pelaaja.sNN@kuorma.test (+ PalloID 5. sarakkeeseen), ei tulosteeseen. --vain-pinit = vain tämä vaihe olemassa olevaa aineistoa vasten (ei regeneroi; päivittää vain 1 pelaajadokumentin/seura).
 *   --tyhjenna poistaa myös `_pelaajaPin/kuorma_…` -dokumentit ja pelaajien Auth-tilit (uid pel_kuorma_…).
 * 20.11.2026 (taysi-OOM stagingissa): kirjoitus ERISSÄ (flush/ERA_KOKO → muisti vakio, ei koko aineiston jonottamista) + VAHVISTUS ennen --aja-kirjoitusta (dokumenttimäärä + arvioitu kulu, kirjoita KYLLÄ).
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --profiili=savu_taysi --paivita-tki [--aja]       kirjoittaa VAIN tkiVaihtelun (#1306) muuttamat dokumentit (kuiva-ajo: lukee ne ja vertaa, ei kirjoita)
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --profiili=savu_taysi --siivoa-ylimaarat [--aja]  poistaa profiilin ulkopuoliset synteettiset seurat + Auth-tilit + PIN-hajautukset (palauttaa profiilin kokoon)
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
const TP = require('./tki_paivitys.js');

const SEURA_ETUVALI = 'kuorma_';
const OLETUS_TUNNUKSET = path.join(__dirname, '..', '..', '.briefit', 'staging_tunnukset.txt');

function lueArgv(argv) {
  const o = { aja: false, tyhjenna: false, paivitaTki: false, siivoaYlimaarat: false, profiiliAsetettu: false, profiili: 'savu', siemen: '1', projekti: undefined, tunnukset: OLETUS_TUNNUKSET, saSahkoposti: undefined, pinPelaaja: false, vainPinit: false, tuntematon: [] };
  (argv || []).forEach((a) => {
    if (a === '--aja') o.aja = true; else if (a === '--tyhjenna') o.tyhjenna = true; else if (a === '--kuiva') o.aja = false; else if (a === '--pin-pelaaja') o.pinPelaaja = true; else if (a === '--vain-pinit') { o.pinPelaaja = true; o.vainPinit = true; } else if (a === '--kuiva-tarkistus') o.kuivaTarkistus = true; else if (a === '--siivoa-admins') o.siivoaAdmins = true; else if (a === '--paivita-tki') o.paivitaTki = true; else if (a === '--siivoa-ylimaarat') o.siivoaYlimaarat = true;
    else if (a.indexOf('--projekti=') === 0) o.projekti = a.slice(11); else if (a.indexOf('--profiili=') === 0) { o.profiili = a.slice(11); o.profiiliAsetettu = true; }
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

const SYNT_EMAIL = new RegExp('@' + A.TILI_DOMAIN.replace(/\./g, '\\.') + '\\s*$', 'i');
/** SALLITTU staging-SA: sa.<nimi>@kuorma.test (esim. sa.tero@kuorma.test; stagingissa ei Google-kirjautumista). Generaattori EI luo tällaisia (sen osoitteet ovat <rooli>.sNN@kuorma.test), eikä uid saa olla generaattorin (kuorma_… / pel_kuorma_…). */
const SA_TILI_EMAIL = new RegExp('^sa\\.[a-z0-9_-]+@' + A.TILI_DOMAIN.replace(/\./g, '\\.') + '$', 'i');
function onGeneraattorinUid(uid) { return typeof uid === 'string' && (uid.indexOf(SEURA_ETUVALI) === 0 || uid.indexOf('pel_' + SEURA_ETUVALI) === 0); }
function onSallittuSaTili(email, uid) { return typeof email === 'string' && SA_TILI_EMAIL.test(email.trim()) && !onGeneraattorinUid(uid); }
/** admins/-vartija: synteettinen = generaattorin luoma tili (@kuorma.test-email TAI uid kuorma_… / pel_kuorma_…) PAITSI eksplisiittisesti sallittu SA-tili (sa.<nimi>@kuorma.test) — se säilyy aina. */
function onSynteettinenAdminTili(email, uid) { if (onSallittuSaTili(email, uid)) return false; return (typeof email === 'string' && SYNT_EMAIL.test(email)) || onGeneraattorinUid(uid); }

/** Vain luku: admins/-dokumentit → [{ uid, email, synteettinen }]. email dokumentista, muuten Authista; ei muita kenttiä. */
async function adminsTarkistus(db, auth) {
  const snap = await db.collection('admins').get(), ulos = [];
  for (const dok of snap.docs) {
    let email = dok.data && dok.data() && typeof dok.data().email === 'string' ? dok.data().email : '';
    if (!email && auth) { try { email = (await auth.getUser(dok.id)).email || ''; } catch (e) { /* ei Auth-tiliä */ } }
    ulos.push({ uid: dok.id, email, synteettinen: onSynteettinenAdminTili(email, dok.id) });
  }
  return ulos;
}

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

const ERA_KOKO = 5000;   // dokumenttia per flush: BulkWriterin jonossa on kerrallaan enintään tämä (20.11.2026: synkroninen for-silmukka jonotti ~1,85 M dokumenttia → OOM, eikä mitään lähtenyt verkkoon)

/** Vahvistuskysely: default = readline TTY:ssä; ei-interaktiivisessa ajossa EI vahvisteta (→ ei kirjoiteta). deps.kysy ohittaa (testit). Hyväksyy vain KYLLÄ (isot/pienet, ä/a). */
function lueRivi(kysymys) { const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout }); return new Promise((res) => rl.question(kysymys, (v) => { rl.close(); res(v); })); }
async function vahvista(d, kysymys) {
  const kysy = d.kysy || (process.stdin.isTTY ? lueRivi : null);
  if (!kysy) return false;
  const v = String((await kysy(kysymys)) || '').trim().toLowerCase();
  return v === 'kyllä' || v === 'kylla';
}
const usd = (x) => '$' + (x < 10 ? x.toFixed(2) : Math.round(x));
const luku = (x) => Math.round(x).toLocaleString('fi-FI').replace(/\s/g, ' ');

/** Seuran järjestysnumero (1-pohjainen) synteettisestä tunnisteesta: kuorma_seura_NN…, kuorma_sNN_…, pel_kuorma_seura_NN…, pel_kuorma_sNN_… ; muuten null. */
function seuraNro(id) { const m = /^(?:pel_)?kuorma_(?:seura_|s)(\d\d)/.exec(String(id)); return m ? parseInt(m[1], 10) : null; }

/** Profiilin ULKOPUOLISET synteettiset: seurat (id ≠ profiilin seurat), Auth-tilit (henkilökunta ≠ A.tilit(profiili); pelaajatilit seura-numero > profiilin seuramäärä), PIN-hajautukset (seura-numero > määrä). */
async function ylimaarat(yhteys, profiili) {
  const n = profiili.seurat.length, odotetut = new Set(profiili.seurat.map((_, si) => A.seuraId(si))), oikeatUid = new Set(A.tilit(profiili).map((t) => t.uid));
  const seurat = (await tyhjennettavat(yhteys.db)).filter((s) => !odotetut.has(s.id));
  const tilit = yhteys.auth ? (await poistettavatTilit(yhteys.auth)).filter((uid) => (onSynteettinenPelaajaTili(uid) ? (seuraNro(uid) || 0) > n : !oikeatUid.has(uid))) : [];
  const pinRefit = (await yhteys.db.collection('_pelaajaPin').listDocuments()).filter((r) => r.id.indexOf(SEURA_ETUVALI) === 0 && (seuraNro(r.id) || 0) > n);
  return { seurat, tilit, pinRefit };
}

/** TKI-vaihtelun päivitys (#1306): vain muuttuneet dokumentit. Lukee ne ja varmistaa, että Firestoressa on täsmälleen vanha (ennen #1306:ta generoitu) tai jo uusi versio — muuhun ei kirjoiteta. */
async function paivitaTki(a, profiili, yhteys, kuiva, kirjaa, virhe) {
  if (!profiili.tkiVaihtelu) { kirjaa('Profiililla ei ole tkiVaihtelua → ei muutettavaa.'); return 0; }
  const muuttuneet = TP.tkiMuuttuneet(A, profiili, a.siemen), kind = {};
  muuttuneet.forEach((d) => { const o = d.polku.split('/'), k = o.length % 2 === 0 ? o[o.length - 2] : o[o.length - 1]; kind[k] = (kind[k] || 0) + 1; });
  kirjaa('TKI-vaihtelu muuttaa ' + muuttuneet.length + ' dokumenttia (' + Object.keys(kind).sort().map((k) => k + ' ' + kind[k]).join(', ') + ') — koko aineistosta ' + luku(A.laske(profiili, a.siemen).yht) + ' dokumenttia ei kosketa.');
  if (!muuttuneet.length) return 0;
  const haettu = await TP.haeDokumentit(yhteys.db, muuttuneet.map((d) => d.polku)), kirjoitettavat = [];
  let jo = 0, puuttuu = 0, poikkeaa = 0;
  for (const d of muuttuneet) {
    const h = haettu.get(d.polku);
    if (!h || !h.exists) puuttuu++; else if (TP.sama(h.data, d.uusi)) jo++; else if (TP.sama(h.data, d.vanha)) kirjoitettavat.push(d); else poikkeaa++;
  }
  kirjaa('  stagingissa: päivitettävää ' + kirjoitettavat.length + ' · jo päivitetty ' + jo + ' · puuttuu ' + puuttuu + ' · poikkeaa sekä vanhasta että uudesta ' + poikkeaa);
  if (puuttuu || poikkeaa) { virhe('Staging ei vastaa odotettua (puuttuu/poikkeaa) — EI kirjoiteta. Tarkista tila ensin: scripts/kuorma/tarkista_staging.js.'); return 1; }
  if (!kirjoitettavat.length) { kirjaa('Kaikki jo ajan tasalla.'); return 0; }
  if (kuiva) { kirjaa('Kuiva-ajo valmis. Kirjoita ' + kirjoitettavat.length + ' dokumenttia lisäämällä --aja.'); return 0; }
  const bw = yhteys.bulkWriter(); let epaonnistui = 0;
  bw.onWriteError((e) => { if (e.failedAttempts < 5) return true; epaonnistui++; return false; });
  kirjoitettavat.forEach((d) => { bw.set(yhteys.db.doc(d.polku), d.uusi).catch(() => {}); });
  await bw.close();
  kirjaa('Kirjoitettu ' + (kirjoitettavat.length - epaonnistui) + ' dokumenttia, epäonnistui ' + epaonnistui + '.');
  return epaonnistui ? 1 : 0;
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
  if (a.kuivaTarkistus || a.siivoaAdmins) {   // admins/-tarkistus (vain luku) ja siivous (--siivoa-admins --aja): ei generointia
    if (a.tyhjenna || a.saSahkoposti !== undefined || a.pinPelaaja) { virhe('--kuiva-tarkistus / --siivoa-admins ei yhdisty muihin toimintoihin.'); return 2; }
    const y = await d.luoDb(lukko.projekti);
    if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
    const rivit = await adminsTarkistus(y.db, y.auth);
    kirjaa('admins/-dokumentteja: ' + rivit.length);
    rivit.forEach((r) => kirjaa('  uid=' + r.uid + '  email=' + (r.email || '(ei Auth-tiliä / ei emailia)') + (r.synteettinen ? '  ← SYNTEETTINEN (ei kuulu admins/-kokoelmaan)' : '')));
    const vaarat = rivit.filter((r) => r.synteettinen);
    kirjaa('Synteettisiä (@' + A.TILI_DOMAIN + ' / uid ' + SEURA_ETUVALI + '…) admins/-dokumentteja: ' + vaarat.length);
    if (a.kuivaTarkistus) return vaarat.length ? 1 : 0;
    if (!vaarat.length) { kirjaa('Ei siivottavaa.'); return 0; }
    if (kuiva) { kirjaa('Kuiva-ajo valmis. Poista ylläolevat ' + vaarat.length + ' admins/-dokumenttia lisäämällä --aja (muihin admins/-dokumentteihin ei kosketa).'); return 0; }
    for (const r of vaarat) await y.db.doc('admins/' + r.uid).delete();
    kirjaa('Poistettu admins/-dokumentteja: ' + vaarat.length + '. Kirjautuneet istunnot päivittyvät uudella tokenilla (kirjaudu ulos ja sisään).'); return 0;
  }
  if (a.saSahkoposti !== undefined) {   // SA-vaihe: vain admins/{uid} Teron Google-tilille (ei generointia)
    if (a.tyhjenna) { virhe('--sa-sahkoposti ei yhdisty --tyhjenna-valintaan.'); return 2; }
    if (SYNT_EMAIL.test(a.saSahkoposti) && !SA_TILI_EMAIL.test(a.saSahkoposti.trim())) { virhe('--sa-sahkoposti: kuorma-osoite kelpaa vain muodossa sa.<nimi>@' + A.TILI_DOMAIN + ' (generaattorin tilit eivät saa admins/-oikeutta); muuten käytä ei-kuorma-osoitetta.'); return 2; }
    const y = await d.luoDb(lukko.projekti);
    if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
    let u; try { u = await y.auth.getUserByEmail(a.saSahkoposti); } catch (e) { virhe('Tiliä ei löytynyt stagingin Authista. Kirjaudu stagingiin kerran Google-tilillä ja aja uudelleen.'); return 1; }
    if (onSynteettinenAdminTili(u.email, u.uid)) { virhe('Tili on synteettinen (kuorma-tunnus) — admins/-kirjoitus estetty.'); return 2; }
    if (kuiva) { kirjaa('  Tili löytyi stagingin Authista. Kirjoita admins/{uid} lisäämällä --aja.'); return 0; }
    await y.db.doc('admins/' + u.uid).set({ rooli: 'super_admin', superAdmin: true, luotu: new Date(), luoja: 'kuorma_generaattori', lahde: 'staging' }, { merge: true });
    kirjaa('admins-dokumentti kirjoitettu stagingiin (SA-oikeus).'); return 0;
  }
  if (a.paivitaTki || a.siivoaYlimaarat) {   // profiilin korjaustoiminnot: ei generointia, ei yhdisty muihin
    if ((a.paivitaTki && a.siivoaYlimaarat) || a.tyhjenna || a.saSahkoposti !== undefined || a.pinPelaaja) { virhe('--paivita-tki / --siivoa-ylimaarat ei yhdisty toisiinsa eikä muihin toimintoihin.'); return 2; }
    if (!a.profiiliAsetettu) { virhe('Anna --profiili= eksplisiittisesti (esim. --profiili=savu_taysi); oletusta ei käytetä.'); return 2; }
    const y = await d.luoDb(lukko.projekti);
    if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
    if (a.paivitaTki) return paivitaTki(a, profiili, y, kuiva, kirjaa, virhe);
    const u = await ylimaarat(y, profiili);
    kirjaa('  profiilin ulkopuolisia synteettisiä seuroja: ' + u.seurat.length);
    kirjaa('  profiilin ulkopuolisia Auth-tilejä: ' + u.tilit.length);
    kirjaa('  profiilin ulkopuolisia PIN-hajautuksia: ' + u.pinRefit.length);
    if (!u.seurat.length && !u.tilit.length && !u.pinRefit.length) { kirjaa('Ei siivottavaa — profiilin ulkopuolista ei löytynyt.'); return 0; }
    if (kuiva) { kirjaa('Kuiva-ajo valmis. Poista lisäämällä --aja (profiilin omiin seuroihin ei kosketa).'); return 0; }
    const bw2 = y.bulkWriter(); for (const s2 of u.seurat) await y.db.recursiveDelete(s2.ref, bw2);
    u.pinRefit.forEach((r) => bw2.delete(r).catch(() => {})); await bw2.close();
    for (let i = 0; i < u.tilit.length; i += 1000) await y.auth.deleteUsers(u.tilit.slice(i, i + 1000));
    kirjaa('Poistettu: seuroja ' + u.seurat.length + ', Auth-tilejä ' + u.tilit.length + ', PIN-hajautuksia ' + u.pinRefit.length + '.'); return 0;
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
  let ls = null;
  if (!a.tyhjenna) {
    ls = A.laskeSeuroittain(profiili, a.siemen); const m = ls.m;
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
  // VAHVISTUS ennen ensimmäistäkään kirjoitusta: profiilin koko + arvioitu kulu; stagingin nykyinen profiili varoituksena (taysi-OOM 20.11.2026: staging oli savu_taysi, ajettiin taysi)
  let nykyinen = null; try { const sn = await db.doc('seurat/' + A.seuraId(0)).get(); if (sn && sn.exists && sn.data()) nykyinen = sn.data().kuorma_profiili || null; } catch (e) { /* tila tuntematon */ }
  const kirjKulu = ls.m.yht * T.HINNAT.kirjoitus, trigKulu = T.arvioiTriggerit(ls).kulu.yht;
  kirjaa('VAHVISTUS: kirjoitetaan ' + luku(ls.m.yht) + ' dokumenttia (' + profiili.seurat.length + ' seuraa, ' + luku(ls.m.pelaajat || 0) + ' pelaajaa) projektiin ' + lukko.projekti + '. Arvioitu kulu ~' + usd(kirjKulu) + ' (kirjoitukset) + triggerit jos deployattu ~' + usd(trigKulu) + '.');
  if (nykyinen && nykyinen !== profiili.nimi) kirjaa('VAROITUS: stagingissa on nyt profiili ' + nykyinen + ' — ajat profiilin ' + profiili.nimi + ' (ylikirjoittaa päällekkäiset seurat).');
  if (!(await vahvista(d, 'Kirjoita KYLLÄ jatkaaksesi (muu keskeyttää): '))) { virhe('Keskeytetty — vahvistusta ei annettu (ei-interaktiivinen ajo ei vahvista). Mitään ei kirjoitettu.'); return 1; }
  const bw = yhteys.bulkWriter(); let kirjoitettu = 0, epaonnistui = 0;
  bw.onWriteError((e) => { if (e.failedAttempts < 5) return true; epaonnistui++; return false; });
  for (const doc of A.generoi(profiili, a.siemen)) {
    bw.set(db.doc(doc.polku), doc.data).catch(() => {});
    if (++kirjoitettu % ERA_KOKO === 0) await bw.flush();   // antaa tapahtumasilmukalle vuoron ja odottaa jonon tyhjenemisen → muisti vakio
    if (kirjoitettu % 25000 === 0) kirjaa('  kirjoitettu ' + kirjoitettu + ' dokumenttia …');
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
module.exports = { main, lueArgv, luoOikeaDb, ERA_KOKO, seuraNro, tyhjennettavat, luoTilit, luoPelaajaPinit, poistettavatTilit, onSynteettinenTili, onSynteettinenPelaajaTili };
