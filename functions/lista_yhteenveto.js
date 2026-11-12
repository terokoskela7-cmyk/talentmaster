'use strict';
/**
 * Listayhteenveto (Vaihe 0 B.4, docs/VAIHE0_APPCHECK_JA_LISTANAKYMAT.md) — seurat/{sid}/lista_joukkue/{jid}: joukkueen pelaajarivit yhdessä dokumentissa.
 * Puhdas rakenne on tm_lista_yhteenveto.js (jaettu lib/-kopio). Tämä moduuli hoitaa I/O:n Admin SDK:lla; client EI kirjoita (Rules v3.83).
 * Lähde: VAIN pelaajat/{pid}-dokumentit + joukkueet (ei sisainen/*, terveys/*, ei PIN:iä, ei huoltajan sähköpostia; vartija tmListaRikkomukset ennen kirjoitusta).
 * Päivitystavat:
 *   (a) yöajo — laskeKaikki (kaikki aktiiviset seurat, yksi seura kerrallaan, virhe ei kaada muita)
 *   (b) callable "Päivitä nyt" — paivitaKasittelija (30 s jäähy / seura)
 *   (c) debouncattu: pelaajadokumentin onWrite → merkitseKasittelija kirjoittaa pelaajakohtaisen merkin lista_likainen/{pid} VAIN jos listariviin vaikuttava kenttä muuttui (ei hot-dokumenttia → ei 1 kirjoitus/s -rajaa);
 *       minuutin ajastettu siivooja (siivoaKasittelija) rakentaa seuran uudelleen kun merkit ovat hiljenneet (HILJAISUUS_MS) tai vanhin merkki on odottanut ENIMMÄISODOTUS_MS → 500 kirjoituksen massatuonti = yksi uudelleenrakennus.
 */
const L = require('./tm_lista_yhteenveto');

const JOHTO_ROOLIT = ['vp', 'urheilutoimenjohtaja', 'seurasihteeri'];   // peilaa Rules onJohtoRooli
const PAIVITA_ROOLIT = ['superadmin', 'talenttivalmentaja', 'valmentaja'].concat(JOHTO_ROOLIT);
const JAAHY_MS = 30000, HILJAISUUS_MS = 30000, ENIMMAISODOTUS_MS = 300000, MERKKI_RAJA = 1000;

function _poissa(d) { return d.poistettu === true || d.arkistoitu === true || d.aktiivinen === false; }   // sama kuin seuran_kooste.pelaajaPoissa
function _erat(lista, n) { const e = []; for (let i = 0; i < lista.length; i += n) e.push(lista.slice(i, i + n)); return e; }

/** Rakentaa ja kirjoittaa seuran kaikki lista_joukkue-dokumentit; poistaa dokumentit joukkueille, joita ei enää ole. opts.kuiva → ei kirjoiteta. Palauttaa vain lukumääriä. */
async function laskeSeura(deps, sid, opts) {
  opts = opts || {}; const { db, FieldValue } = deps, nytMs = opts.nytMs != null ? opts.nytMs : Date.now();
  const seuraRef = db.collection('seurat').doc(sid);
  const [jSnap, pSnap] = await Promise.all([seuraRef.collection('joukkueet').get(), seuraRef.collection('pelaajat').get()]);
  const joukkueet = jSnap.docs.map((d) => ({ id: d.id, nimi: (d.data() || {}).nimi || '' }));
  const pelaajat = pSnap.docs.map((d) => ({ id: d.id, data: d.data() || {} })).filter((x) => !_poissa(x.data));
  const dokt = L.tmListaJoukkueDokumentit(pelaajat, joukkueet, nytMs);
  dokt.forEach((j) => { const r = L.tmListaRikkomukset(j.data); if (r.length) throw new Error('lista_joukkue ' + j.id + ' sisältää kiellettyä: ' + r.slice(0, 3).join('; ')); });
  const ulos = { sid, joukkueita: dokt.length, pelaajia: pelaajat.length, rivejaYht: dokt.reduce((s, j) => s + j.data.n, 0), tavuja: dokt.reduce((s, j) => s + JSON.stringify(j.data).length, 0) };
  if (opts.kuiva) return Object.assign(ulos, { kuiva: true });
  const vanhat = await seuraRef.collection('lista_joukkue').select().get(), nykyiset = new Set(dokt.map((j) => j.id));
  const poistettavat = vanhat.docs.filter((d) => !nykyiset.has(d.id));
  const laskettu = FieldValue.serverTimestamp();
  const toimet = dokt.map((j) => ({ ref: seuraRef.collection('lista_joukkue').doc(j.id), data: Object.assign({}, j.data, { laskettu }) })).concat(poistettavat.map((d) => ({ ref: d.ref, poista: true })));
  for (const era of _erat(toimet, 400)) { const b = db.batch(); era.forEach((t) => (t.poista ? b.delete(t.ref) : b.set(t.ref, t.data))); await b.commit(); }
  return Object.assign(ulos, { poistettu: poistettavat.length });
}

async function laskeKaikki(deps, opts) {
  opts = opts || {}; const loki = deps.loki || console, tulokset = [], virheet = [];
  const seurat = await deps.db.collection('seurat').get();
  for (const s of seurat.docs) {
    if ((s.data() || {}).aktiivinen === false) continue;
    if (opts.vainSeura && opts.vainSeura !== s.id) continue;
    try { tulokset.push(await laskeSeura(deps, s.id, { nytMs: opts.nytMs, kuiva: opts.kuiva })); }
    catch (e) { virheet.push({ sid: s.id, viesti: String(e && e.message || e) }); loki.error('[lista_yhteenveto] seura ' + s.id + ': ' + (e && e.stack || e)); }
  }
  return { tulokset, virheet };
}

function ajastettuKasittelija(deps) {
  return async () => {
    const nytMs = deps.nyt ? deps.nyt() : Date.now(), r = await laskeKaikki(deps, { nytMs });
    (deps.loki || console).log('[lista_yhteenveto] yöajo: ' + r.tulokset.length + ' seuraa ok, ' + r.virheet.length + ' virhettä');
    return null;
  };
}

/** Callable paivitaListaYhteenveto({ seuraId }) — oman seuran johto / talenttivalmentaja / valmentaja / SA. tarkistaOikeus (ei pelkkä context.auth). 30 s jäähy: tuore lista palautetaan sellaisenaan. */
function paivitaKasittelija(deps) {
  const E = deps.HttpsError;
  return async (data, context) => {
    if (!context || !context.auth) throw new E('unauthenticated', 'Kirjaudu ensin.');
    const seuraId = data && typeof data.seuraId === 'string' ? data.seuraId.trim() : '';
    if (!seuraId) throw new E('invalid-argument', 'seuraId pakollinen.');
    const oikeus = await deps.tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
    if (!oikeus || !oikeus.sallittu || PAIVITA_ROOLIT.indexOf(oikeus.rooli) < 0) throw new E('permission-denied', 'Ei oikeutta seuran listayhteenvetoon.');
    const seura = await deps.db.collection('seurat').doc(seuraId).get();
    if (!seura.exists) throw new E('not-found', 'Seuraa ei löydy.');
    const nytMs = deps.nyt ? deps.nyt() : Date.now();
    const uusin = await deps.db.collection('seurat').doc(seuraId).collection('lista_joukkue').orderBy('laskettu', 'desc').limit(1).get();
    const l = uusin && uusin.docs && uusin.docs[0] ? (uusin.docs[0].data() || {}).laskettu : null, lMs = l && typeof l.toMillis === 'function' ? l.toMillis() : null;
    if (lMs != null && nytMs - lMs < JAAHY_MS) return { tuore: true };
    try { const r = await laskeSeura(deps, seuraId, { nytMs }); return { tuore: false, joukkueita: r.joukkueita, pelaajia: r.pelaajia }; }
    catch (e) { (deps.loki || console).error('[paivitaListaYhteenveto] ' + seuraId + ': ' + (e && e.stack || e)); throw new E('internal', 'Listayhteenvedon laskenta epäonnistui.'); }
  };
}

/** Rivi ilman ajasta riippuvia ryhmiä: vertailuun (muuttuiko jokin listalla näkyvä kenttä?). Joukkuejäsenyys-kentät mukana (rivi.jk puuttuu → käytetään raakakenttiä). */
function _vertailuRivi(id, data) {
  if (!data || _poissa(data)) return null;
  const r = L.tmListaRivi(id, data, null);
  r._jk = [data.joukkueet, data.joukkue, data.joukkueNimi, data.joukkueetNimet];
  return JSON.stringify(r);
}

/** Pelaajadokumentin onWrite → merkitse likaiseksi, jos listariviin vaikuttava kenttä muuttui (tai pelaaja luotiin/poistui/arkistoitui). Merkki on pelaajakohtainen dokumentti → ei kirjoituskuumaa pistettä. */
function merkitseKasittelija(deps) {
  return async (change, context) => {
    const sid = context.params.sid, pid = context.params.pid;
    const ennen = change.before && change.before.exists ? change.before.data() : null, jalkeen = change.after && change.after.exists ? change.after.data() : null;
    if (!ennen && !jalkeen) return null;
    if (_vertailuRivi(pid, ennen) === _vertailuRivi(pid, jalkeen)) return null;
    await deps.db.collection('seurat').doc(sid).collection('lista_likainen').doc(pid).set({ t: deps.FieldValue.serverTimestamp() });
    return null;
  };
}

/** Minuutin ajastus: lukee merkit (collection group), ryhmittelee seuroittain ja rakentaa seuran uudelleen, kun merkit ovat hiljenneet tai vanhin odottanut liian kauan. Poistaa vain ne merkit, jotka rakennus näki (ehto updateTime → uudempi merkki säilyy). */
function siivoaKasittelija(deps) {
  return async () => {
    const loki = deps.loki || console, nytMs = deps.nyt ? deps.nyt() : Date.now();
    const snap = await deps.db.collectionGroup('lista_likainen').limit(MERKKI_RAJA).get();
    const seuraan = new Map();
    snap.docs.forEach((d) => { const sid = d.ref.parent.parent.id, t = (d.data() || {}).t, ms = t && typeof t.toMillis === 'function' ? t.toMillis() : nytMs; const x = seuraan.get(sid) || { docs: [], uusin: 0, vanhin: Infinity }; x.docs.push(d); x.uusin = Math.max(x.uusin, ms); x.vanhin = Math.min(x.vanhin, ms); seuraan.set(sid, x); });
    let rakennettu = 0, odottaa = 0, virheita = 0;
    for (const [sid, x] of seuraan) {
      if (nytMs - x.uusin < HILJAISUUS_MS && nytMs - x.vanhin < ENIMMAISODOTUS_MS) { odottaa++; continue; }
      try {
        await laskeSeura(deps, sid, { nytMs });
        for (const era of _erat(x.docs, 50)) await Promise.all(era.map((d) => d.ref.delete({ lastUpdateTime: d.updateTime }).catch(() => null)));   // uudempi merkki (muuttunut updateTime) säilyy
        rakennettu++;
      } catch (e) { virheita++; loki.error('[lista_yhteenveto] siivooja seura ' + sid + ': ' + (e && e.stack || e)); }
    }
    if (rakennettu || virheita) loki.log('[lista_yhteenveto] siivooja: ' + rakennettu + ' rakennettu, ' + odottaa + ' odottaa, ' + virheita + ' virhettä');
    return null;
  };
}

/** Funktiokytkentä (pidetään index.js:n kuori pienenä, tests/kuoret_kasvukatto): palauttaa exports-oliot. */
function luoFunktiot(functions, deps) {
  const r = functions.region('europe-west1');
  return {
    laskeListaYhteenvedot: r.runWith({ timeoutSeconds: 540, memory: '512MB' }).pubsub.schedule('30 3 * * *').timeZone('Europe/Helsinki').onRun(ajastettuKasittelija(deps)),
    paivitaListaYhteenveto: r.runWith({ enforceAppCheck: true, timeoutSeconds: 120, memory: '512MB' }).https.onCall(paivitaKasittelija(deps)),
    merkitseListaLikaiseksi: r.runWith({ timeoutSeconds: 30, memory: '256MB' }).firestore.document('seurat/{sid}/pelaajat/{pid}').onWrite(merkitseKasittelija(deps)),
    siivoaListaLikaiset: r.runWith({ timeoutSeconds: 300, memory: '512MB' }).pubsub.schedule('every 1 minutes').timeZone('Europe/Helsinki').onRun(siivoaKasittelija(deps))
  };
}

module.exports = { luoFunktiot, laskeSeura, laskeKaikki, ajastettuKasittelija, paivitaKasittelija, merkitseKasittelija, siivoaKasittelija, PAIVITA_ROOLIT, JAAHY_MS, HILJAISUUS_MS, ENIMMAISODOTUS_MS };
