'use strict';
/**
 * K35-7a — kalenterin iCal-syöte (D190; docs/CODE_BRIEF_35_KALENTERI.md). Kaista: Tero.
 *   luoKalenteriTilaus({ seuraId, pelaajaId? })  callable (europe-west1, App Check)
 *     · pelaaja (pelaajatoken) tai huoltaja (email_verified + huoltajaEmail + suostumusTila 'annettu') → pelaajan syöte; OIKEUSTARKISTUS = sama kuin haePelaajanKalenteri (B4).
 *     · henkilökunta ilman pelaajaId:tä → oma syöte (tmNakyyKalenterissa: omat joukkueet + ryhmät + henkilökunnan tapahtumat; johto/talenttivalmentaja kaikki joukkueet).
 *     · Token 32 tavua satunnaista (base64url), tallennus kalenteri_tilaukset/{sha256(token)}; uusi tilaus MITÄTÖI saman tilaajan + saman kohteen vanhat. URL palautetaan KERRAN (https + webcal).
 *   kalenteriIcal  HTTPS (europe-west1): GET /<token>.ics → hash → tilaus; puuttuva/mitätöity → 404 ilman selitystä. Ikkuna −30 … +180 pv. Cache-Control max-age=900. viimeksi_haettu korkeintaan 1×/vrk.
 *     EI App Checkia (kalenterisovellukset eivät osaa): TOKEN ON AINOA SUOJA (256 bitin satunnaisluku; vuotanut token mitätöidään luomalla uusi tilaus). Kirjataan PR:ään.
 * Rajaus: lib/tm_kalenteri_pelaajalle.js (tmKuuluuPelaajalle + tmProjisoi sallittulista) ja lib/tm_ryhmat.js (tmNakyyKalenterissa) — EI uutta rajauslogiikkaa. Syötteeseen: tyypin nimi, joukkueen nimi, paikka, pelaajaviesti, ajat, tila, versio.
 * Ei henkilökunnan muistiinpanoja (alikokoelma), ei muiden pelaajien nimiä, ei kokoonpanoja.
 */
const crypto = require('crypto');
const { normalisoiDocId, helsinginPaiva } = require('./pelaajakirjautuminen');
const { huoltajaSyy } = require('./huoltaja_tunnistus');
const { tunnisteTyyppi } = require('./authz_paatos');
const K = require('./tm_kalenteri_pelaajalle');
const R = require('./tm_ryhmat');
const ICAL = require('./tm_ical');
const { pelaajaPoissa } = require('./seuran_kooste');   // sama "ei mukana" -määritelmä kuin rosterissa: poistettu | arkistoitu | aktiivinen === false

const PV = 86400000, IKKUNA_ALKU_PV = -30, IKKUNA_LOPPU_PV = 180;
const JOHTO = ['vp', 'urheilutoimenjohtaja', 'seurasihteeri'], HENKILOKUNTA = JOHTO.concat(['valmentaja', 'talenttivalmentaja', 'fysiikkavalmentaja', 'testivastaava']);
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
const hash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const emailHash = (e) => hash(String(e == null ? '' : e).toLowerCase().trim());   // huoltajan sähköposti tilaukseen VAIN tiivisteenä (ei selväkielistä)
const uusiToken = () => crypto.randomBytes(32).toString('base64url');
const ms = (v) => (v && typeof v.toDate === 'function' ? v.toDate().getTime() : (typeof v === 'number' ? v : (v ? Date.parse(v) : null)));

/* Rajattu + projisoitu syöte: pelaaja/huoltaja (tilaus.pelaajaId) tai henkilökunta (tilaus.uid). Palauttaa { nimi, kieli, tapahtumat } tai null (404). */
async function rakennaSyote(deps, tilaus, nytMs) {
  const { db, Timestamp } = deps, seura = db.collection('seurat').doc(tilaus.seuraId);
  const sSnap = await seura.get().catch(() => null), s = sSnap && sSnap.exists ? (sSnap.data() || {}) : {};
  const alku = Timestamp.fromDate(new Date(nytMs + IKKUNA_ALKU_PV * PV)), loppu = Timestamp.fromDate(new Date(nytMs + IKKUNA_LOPPU_PV * PV));
  // K35-10: 2. kysely monipäiväisille (tauko/vapaa/erikoisohjelma: koko_paiva) jotka alkoivat ennen ikkunaa mutta jatkuvat sen sisään; yhdistys id:llä. Virhe (indeksi puuttuu) ei kaada syötettä.
  const [jSnap, eSnap, pitkat] = await Promise.all([seura.collection('joukkueet').get(), seura.collection('kalenteri').where('alkaa', '>=', alku).where('alkaa', '<=', loppu).get(),
    seura.collection('kalenteri').where('koko_paiva', '==', true).where('paattyy', '>=', alku).get().catch(() => null)]);
  const joukkueDocs = []; jSnap.forEach((d) => joukkueDocs.push({ id: d.id, nimi: (d.data() || {}).nimi }));
  const evs = [], nahty = {}; [eSnap, pitkat].forEach((q) => { if (q) q.forEach((d) => { if (!nahty[d.id]) { nahty[d.id] = 1; evs.push(Object.assign({ id: d.id }, d.data())); } }); });
  let valitut;
  if (tilaus.pelaajaId) {
    const pSnap = await seura.collection('pelaajat').doc(tilaus.pelaajaId).get();
    if (!pSnap || !pSnap.exists) return null;
    const p = pSnap.data() || {};
    if (pelaajaPoissa(p)) return null;   // pelaaja poistettu / arkistoitu / ei aktiivinen → syöte sulkeutuu
    if (tilaus.rooli === 'huoltaja') {
      if (p.suostumusTila !== 'annettu') return null;   // suostumus peruttu → syöte sulkeutuu
      if (!tilaus.huoltajaEmailHash || typeof p.huoltajaEmail !== 'string' || emailHash(p.huoltajaEmail) !== tilaus.huoltajaEmailHash) return null;   // huoltajan sähköposti vaihtunut → entinen huoltaja menettää syötteen
    }
    const pelaaja = Object.assign({ id: tilaus.pelaajaId }, p);
    valitut = evs.filter((ev) => K.tmKuuluuPelaajalle(ev, pelaaja, joukkueDocs));
  } else {
    const kSnap = await seura.collection('kayttajat').doc(tilaus.uid).get();
    if (!kSnap || !kSnap.exists) return null;
    const k = kSnap.data() || {};
    if (k.aktiivinen === false || HENKILOKUNTA.indexOf(k.rooli) < 0) return null;
    const johto = JOHTO.indexOf(k.rooli) >= 0, kaikki = johto || k.rooli === 'talenttivalmentaja', omat = Array.isArray(k.joukkueet) ? k.joukkueet.map(String) : [];
    let ryhmaIdt = [];
    try { const rs = await seura.collection('ryhmat').get(); rs.forEach((d) => { const r = d.data() || {}; if (r.aktiivinen !== false && ((Array.isArray(r.valmentajat) && r.valmentajat.indexOf(tilaus.uid) >= 0) || r.vastuu_uid === tilaus.uid)) ryhmaIdt.push(d.id); }); } catch (e) { ryhmaIdt = []; }
    let omatPelaajat = [];   // poimittujen pelaajien tapahtumat (esim. aamutreeni): valmentaja näkee, jos poimittu pelaaja kuuluu hänen joukkueeseensa (§7.18 tmPelaajanJoukkueet)
    if (!kaikki && evs.some((ev) => ev.kohde && ev.kohde.tyyppi === 'pelaajat')) {
      // K35-10: luetaan VAIN ikkunan poimittujen pelaajien dokit (uniikit pelaajat_id:t, getAll ≤ 100/erä) — ei koko pelaajakokoelmaa; lukumäärä ei riipu seuran koosta
      const J = require('./tm_joukkue'), idt = []; evs.forEach((ev) => { if (ev.kohde && ev.kohde.tyyppi === 'pelaajat' && Array.isArray(ev.pelaajat_id)) ev.pelaajat_id.forEach((x) => { x = String(x); if (x && idt.indexOf(x) < 0) idt.push(x); }); });
      const ref = (id) => seura.collection('pelaajat').doc(id);
      for (let i = 0; i < idt.length; i += 100) {
        const era = idt.slice(i, i + 100), docs = typeof db.getAll === 'function' ? await db.getAll(...era.map(ref)) : await Promise.all(era.map((id) => ref(id).get()));
        docs.forEach((d) => { if (!d || !d.exists) return; const ids = J.tmPelaajanJoukkueet(Object.assign({ id: d.id }, d.data() || {}), joukkueDocs); if (ids.some((x) => omat.indexOf(String(x)) >= 0)) omatPelaajat.push(d.id); });
      }
    }
    const ctx = { uid: tilaus.uid, johto, ryhmaIdt, omatPelaajat, omatJoukkueet: kaikki ? joukkueDocs.map((j) => j.id) : omat };   // D242: joukkueen valmennuspalaveri (kohde henkilokunta + joukkue) vain sen joukkueen valmentajille, johdolle ja luojalle — jaettu tmNakyyKalenterissa
    valitut = evs.filter((ev) => {
      if (ev.poistettu === true || !R.tmNakyyKalenterissa(ev, ctx)) return false;
      if (kaikki || (ev.kohde && ev.kohde.tyyppi === 'ryhma') || (ev.kohde && ev.kohde.tyyppi === 'henkilokunta')) return true;
      const avaimet = [ev.joukkue].concat(Array.isArray(ev.joukkueet) ? ev.joukkueet : []).filter((x) => x != null && x !== '');
      if (!avaimet.length) return true;   // seuran yhteinen tapahtuma
      return avaimet.some((x) => { const id = K.tmTunnisteDocIdksi(x, joukkueDocs); return id && omat.indexOf(id) >= 0; });
    });
  }
  valitut.sort((a, b) => (ms(a.alkaa) || 0) - (ms(b.alkaa) || 0));
  const tapahtumat = valitut.map((ev) => {
    const o = K.tmProjisoi(ev, null);   // sallittulista: nimi, tyyppi, paikka, pelaajaviesti, koko_paiva, ajat — ei luoja/muistiinpanoja/pelaajia
    if (ev.tila) o.tila = ev.tila; if (typeof ev.versio === 'number') o.versio = ev.versio;
    const pv = ms(ev.paivitetty); if (pv != null) o.paivitetty = new Date(pv).toISOString();
    if (ev.joukkue_nimi) o.joukkue_nimi = ev.joukkue_nimi;
    return o;
  });
  const kieli = ['fi', 'sv', 'en'].indexOf(s.kieli) >= 0 ? s.kieli : 'fi';
  return { nimi: (s.nimi ? s.nimi + ' · ' : '') + 'Kalenteri', kieli, tapahtumat };
}

/* Yhteinen oikeustarkistus (luonti ja peruutus): sama kuin haePelaajanKalenteri (B4). Palauttaa { seuraId, rooli, pelaajaId, kayttajaUid, uid, kohde, huoltajaEmailHash? } tai heittää. */
async function tunnista(deps, data, context) {
  const { db, HttpsError } = deps, torju = () => new HttpsError('permission-denied', 'Ei oikeutta kalenteriin.');
  if (!context || !context.auth) throw new HttpsError('unauthenticated', 'Kirjautuminen vaaditaan.');
  const seuraId = normalisoiDocId(data && data.seuraId), pelaajaIdSyote = data && data.pelaajaId != null && data.pelaajaId !== '' ? normalisoiDocId(data.pelaajaId) : null;
  if (!seuraId || (data && data.pelaajaId != null && data.pelaajaId !== '' && !pelaajaIdSyote)) throw new HttpsError('invalid-argument', 'seuraId (ja pelaajaId) virheellinen.');
  const tyyppi = tunnisteTyyppi(context.auth), token = context.auth.token || {}, seura = db.collection('seurat').doc(seuraId), uid = context.auth.uid || token.uid || null;
  let rooli, pelaajaId = null, kayttajaUid = null, huoltajaEmailHash = null;
  if (tyyppi === 'pelaaja') {   // pelaajatoken: vain oma pelaaja (pelaajaId voi puuttua → oma)
    pelaajaId = pelaajaIdSyote || token.pelaajaId;
    if (token.pelaajaSeuraId !== seuraId || token.pelaajaId !== pelaajaId) throw torju();
    const pSnap = await seura.collection('pelaajat').doc(pelaajaId).get(); if (!pSnap || !pSnap.exists || pelaajaPoissa(pSnap.data() || {})) throw torju();
    rooli = 'pelaaja';
  } else if (tyyppi === 'kayttaja' && pelaajaIdSyote) {   // huoltaja: sama tarkistus kuin haePelaajanKalenteri (B4); henkilökunta hylätään (ei huoltajaEmail-täsmäystä)
    const pSnap = await seura.collection('pelaajat').doc(pelaajaIdSyote).get(); if (!pSnap || !pSnap.exists) throw torju();
    const p = pSnap.data() || {}; if (huoltajaSyy(token, p, { vaadiSuostumus: true }) || pelaajaPoissa(p)) throw torju();
    rooli = 'huoltaja'; pelaajaId = pelaajaIdSyote; huoltajaEmailHash = emailHash(p.huoltajaEmail);
  } else if (tyyppi === 'kayttaja') {   // henkilökunta: oma syöte
    if (!uid || token.seuraId !== seuraId) throw torju();
    const kSnap = await seura.collection('kayttajat').doc(uid).get(), k = kSnap && kSnap.exists ? (kSnap.data() || {}) : null;
    if (!k || k.aktiivinen === false || HENKILOKUNTA.indexOf(k.rooli) < 0) throw torju();
    rooli = 'henkilokunta'; kayttajaUid = uid;
  } else throw torju();
  return { seuraId, rooli, pelaajaId, kayttajaUid, uid, kohde: pelaajaId ? 'p:' + pelaajaId : 'u:' + kayttajaUid, huoltajaEmailHash };
}
const aktiiviset = (kokoelma, x) => kokoelma.where('seuraId', '==', x.seuraId).where('tilaajaUid', '==', x.uid).where('kohde', '==', x.kohde).where('mitatoity', '==', false).get();

function luoTilausKasittelija(deps) {
  const { db, Timestamp } = deps, nytF = deps.nyt || (() => Date.now()), perusUrl = deps.perusUrl || 'https://europe-west1-talentmaster-pilot.cloudfunctions.net/kalenteriIcal/';
  return async function luoKalenteriTilaus(data, context) {
    const x = await tunnista(deps, data, context), kokoelma = db.collection('kalenteri_tilaukset');
    const vanhat = await aktiiviset(kokoelma, x);   // uusi tilaus mitätöi saman tilaajan + saman kohteen vanhat
    const uusi = uusiToken(), nyt = nytF(), batch = db.batch();
    vanhat.forEach((d) => batch.update(kokoelma.doc(d.id), { mitatoity: true, mitatoity_pvm: Timestamp.fromMillis(nyt) }));
    batch.set(kokoelma.doc(hash(uusi)), { seuraId: x.seuraId, pelaajaId: x.pelaajaId, uid: x.kayttajaUid, tilaajaUid: x.uid, kohde: x.kohde, rooli: x.rooli, huoltajaEmailHash: x.huoltajaEmailHash, luotu: Timestamp.fromMillis(nyt), mitatoity: false, viimeksi_haettu: null });
    await batch.commit();
    const url = perusUrl + uusi + '.ics';
    return { url, webcal: url.replace(/^https?:/, 'webcal:'), mitatoitu: vanhat.size != null ? vanhat.size : 0 };
  };
}

/* peruKalenteriTilaus({ seuraId, pelaajaId? }): mitätöi tilaajan aktiivisen tilauksen ILMAN uutta ("Poista linkki"). Sama oikeustarkistus kuin luonnissa. Palauttaa { mitatoitu: n }. */
function luoPeruutusKasittelija(deps) {
  const { db, Timestamp } = deps, nytF = deps.nyt || (() => Date.now());
  return async function peruKalenteriTilaus(data, context) {
    const x = await tunnista(deps, data, context), kokoelma = db.collection('kalenteri_tilaukset'), vanhat = await aktiiviset(kokoelma, x), nyt = nytF(), batch = db.batch();
    vanhat.forEach((d) => batch.update(kokoelma.doc(d.id), { mitatoity: true, mitatoity_pvm: Timestamp.fromMillis(nyt) }));
    if (vanhat.size) await batch.commit();
    return { mitatoitu: vanhat.size != null ? vanhat.size : 0 };
  };
}

function luoSyoteKasittelija(deps) {
  const { db, Timestamp } = deps, nytF = deps.nyt || (() => Date.now());
  const ei = (res) => { res.set('Cache-Control', 'no-store'); res.status(404).send('Not found'); };   // sama vastaus kaikille virheille: ei selitystä
  return async function kalenteriIcal(req, res) {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return ei(res);
      const m = /([A-Za-z0-9_-]{43})\.ics$/.exec(String(req.path || req.url || '').split('?')[0]);
      if (!m || !TOKEN_RE.test(m[1])) return ei(res);
      const ref = db.collection('kalenteri_tilaukset').doc(hash(m[1])), snap = await ref.get();
      if (!snap || !snap.exists) return ei(res);
      const t = snap.data() || {}; if (t.mitatoity !== false) return ei(res);
      const nyt = nytF(), syote = await rakennaSyote({ db, Timestamp }, t, nyt);
      if (!syote) return ei(res);
      const vm = ms(t.viimeksi_haettu);
      if (vm == null || helsinginPaiva(vm) !== helsinginPaiva(nyt)) { try { await ref.update({ viimeksi_haettu: Timestamp.fromMillis(nyt) }); } catch (e) { /* ei kriittinen */ } }   // korkeintaan kerran vuorokaudessa
      res.set('Content-Type', 'text/calendar; charset=utf-8'); res.set('Cache-Control', 'max-age=900'); res.set('Content-Disposition', 'inline; filename="kalenteri.ics"');
      res.status(200).send(ICAL.tmIcal(syote.tapahtumat, { nimi: syote.nimi, kieli: syote.kieli, nyt }));
    } catch (e) { ei(res); }
  };
}

module.exports = { luoTilausKasittelija, luoPeruutusKasittelija, emailHash, luoSyoteKasittelija, rakennaSyote, hash, uusiToken, IKKUNA_ALKU_PV, IKKUNA_LOPPU_PV, HENKILOKUNTA, JOHTO };
