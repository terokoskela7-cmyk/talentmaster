'use strict';
/**
 * Seuran pulssi S1 (docs/CODE_BRIEF_S1_SEURAN_PULSSI.md; design 17, D40–D45) — viikkokoosteen laskenta palvelimella.
 * Puhdas laskenta on tm_seuran_kooste.js (jaettu lib/-kopio; jakson tila = tmJaksoTila, SAMA funktio kuin kehitystyöpöydällä).
 * Tämä moduuli hoitaa vain I/O:n: lukee seuran joukkueet ja pelaajat Admin SDK:lla, hakee puuttuvat dokumentit (viikkokatsaus, reviewit), kirjoittaa
 * VAIN kooste- ja kooste_joukkue-dokumentit (set, idempotentti; ei mitään pelaaja- tai joukkuedokumenttiin). db / FieldValue / FieldPath injektoidaan (testattava).
 * Ei nimiä eikä pelaaja-ID:itä koosteessa (tmKoosteRikkomukset-vartija ennen kirjoitusta).
 */
const K = require('./tm_seuran_kooste');
const H = require('./helsinki_paiva');

const JOHTO_ROOLIT = ['vp', 'urheilutoimenjohtaja', 'seurasihteeri'];   // peilaa Rules onJohtoRooli
const ERA = 300;   // getAll / rinnakkaiset haut

function _norm(v) {   // Firestore Timestamp → ISO; rakenne säilyy (tmJaksoTila odottaa ISO-merkkijonoja, §7.6)
  if (v == null) return v;
  if (typeof v.toDate === 'function') { try { return v.toDate().toISOString(); } catch (e) { return null; } }
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(_norm);
  if (typeof v === 'object') { const o = {}; Object.keys(v).forEach((k) => { o[k] = _norm(v[k]); }); return o; }
  return v;
}
function _erat(lista, n) { const e = []; for (let i = 0; i < lista.length; i += n) e.push(lista.slice(i, i + n)); return e; }
function _poissa(d) { return d.poistettu === true || d.arkistoitu === true || d.aktiivinen === false; }   // varovainen: kaikki yleiset "ei mukana" -liput

/** Arviointihetki: ei myöhemmin kuin su klo 21 Helsingin aikaa (voimassa oleva jakso = käynnissä sunnuntaina klo 21), ei tulevaisuudessa. */
function arvioHetki(nytMs, rajat) { return Math.min(nytMs, rajat.su21Ms); }

async function laskeSeura(deps, sid, opts) {
  const { db, FieldValue, FieldPath } = deps; const rajat = opts.rajat, nytMs = opts.nytMs, arvioMs = arvioHetki(nytMs, rajat);
  const seuraRef = db.collection('seurat').doc(sid);
  const [jSnap, pSnap] = await Promise.all([seuraRef.collection('joukkueet').get(), seuraRef.collection('pelaajat').get()]);
  const joukkueet = jSnap.docs.map((d) => { const x = d.data() || {}; return { id: d.id, nimi: x.nimi || '', ikaryhma: x.ikaryhma || null, jaksofokus: _norm(x.jaksofokus) || null }; });
  const pelaajat = [];
  pSnap.docs.forEach((d) => {
    const x = d.data() || {}; if (_poissa(x)) return;
    pelaajat.push({ id: d.id, joukkue: x.joukkue || null, joukkueet: Array.isArray(x.joukkueet) ? x.joukkueet : [], syntymaVuosi: x.syntymaVuosi != null ? x.syntymaVuosi : null,
      jaksofokus: _norm(x.jaksofokus) || null, jaksofokus_historia: _norm(x.jaksofokus_historia) || [], ydinvahvuus: _norm(x.ydinvahvuus) || null, ydinvahvuus_valinta: _norm(x.ydinvahvuus_valinta) || null, idp_sitoumus_pvm: _norm(x.idp_sitoumus_pvm) || null });
  });
  const analyysi = K.tmKoosteAnalysoi({ joukkueet, pelaajat, aika: { alkuMs: rajat.alkuMs, loppuMs: rajat.loppuMs, arvioMs, nytMs, vuosi: H.helsinginVuosi(arvioMs) } });

  // viikkokatsaus: viikkokatsaukset/{sunnuntain pvm} per ehdokas (suora getAll, ei collection group → ei seura_id-kenttää, D43 kohta 4 poikkeama)
  const vastanneet = [];
  for (const era of _erat(analyysi.ehdokkaat, ERA)) {
    const refs = era.map((pid) => seuraRef.collection('pelaajat').doc(pid).collection('viikkokatsaukset').doc(rajat.sunnuntaiIso));
    const snaps = await db.getAll(...refs);
    snaps.forEach((s, i) => { if (s && s.exists) vastanneet.push(era[i]); });
  }
  // täysi katselmus ilman sulkemista: reviewit/{pvm} ikkunassa → ajallaan
  const katselmusLoytyi = [];
  for (const era of _erat(analyysi.katselmukset, 50)) {
    await Promise.all(era.map(async (k) => {
      const q = seuraRef.collection('pelaajat').doc(k.pid).collection('reviewit').where(FieldPath.documentId(), '>=', k.alkuPvm).where(FieldPath.documentId(), '<=', k.loppuPvm).limit(1);
      const r = await q.get(); if (r && !r.empty) katselmusLoytyi.push(k.i);
    }));
  }
  const doc = K.tmKoosteTulos(analyysi, { vastanneet, katselmusLoytyi }, { vk: rajat.tunniste, arvio: !!opts.arvio });
  const rikkomukset = K.tmKoosteRikkomukset(doc);
  if (rikkomukset.length) throw new Error('kooste sisältää kiellettyjä kenttiä: ' + rikkomukset.join(', '));
  const joukkueDokt = K.tmKoosteJoukkueDokumentit(doc);
  if (opts.kuiva) return { sid, vk: rajat.tunniste, kuiva: true, joukkueita: joukkueDokt.length, pelaajia: pelaajat.length, doc };   // ei kirjoiteta (takaisinlaskennan kuiva-ajo)

  if (opts.eiYlikirjoitaTodellista) {   // takaisinlaskenta: älä korvaa palvelimen oikeaa (ei-arvio) koostetta arviolla
    const vanha = await seuraRef.collection('kooste').doc(rajat.tunniste).get();
    if (vanha && vanha.exists && !(vanha.data() || {}).arvio) return { sid, vk: rajat.tunniste, ohitettu: 'todellinen_olemassa', joukkueita: joukkueDokt.length };
  }
  const laskettu = FieldValue.serverTimestamp();
  const kirjoitukset = [{ ref: seuraRef.collection('kooste').doc(rajat.tunniste), data: Object.assign({}, doc, { laskettu }) }]
    .concat(joukkueDokt.map((j) => ({ ref: seuraRef.collection('kooste_joukkue').doc(j.id), data: Object.assign({}, j.data, { laskettu }) })));
  for (const era of _erat(kirjoitukset, 400)) {
    const b = db.batch(); era.forEach((w) => b.set(w.ref, w.data)); await b.commit();
  }
  return { sid, vk: rajat.tunniste, joukkueita: joukkueDokt.length, pelaajia: pelaajat.length };
}

/** Kaikki aktiiviset seurat; yhden seuran virhe ei kaada muita (loki → jatka). viikot: [rajat…]. */
async function laskeKaikki(deps, opts) {
  const loki = opts.loki || console; const tulokset = [], virheet = [];
  const seurat = await deps.db.collection('seurat').get();
  for (const s of seurat.docs) {
    if ((s.data() || {}).aktiivinen === false) continue;
    for (const rajat of opts.viikot) {
      try { tulokset.push(await laskeSeura(deps, s.id, { rajat, nytMs: opts.nytMs, arvio: opts.arvio, eiYlikirjoitaTodellista: opts.eiYlikirjoitaTodellista, kuiva: opts.kuiva })); }
      catch (e) { virheet.push({ sid: s.id, vk: rajat.tunniste, viesti: String(e && e.message || e) }); loki.error('[seuran kooste] seura ' + s.id + ' ' + rajat.tunniste + ': ' + (e && e.stack || e)); }
    }
  }
  return { tulokset, virheet };
}

/** Ajastetut: 'sunnuntai' → kuluva viikko; 'maanantai' → edellinen viikko (sunnuntain myöhäiset vastaukset mukaan). */
function ajastettuKasittelija(deps, tila) {
  return async () => {
    const nytMs = (deps.nyt ? deps.nyt() : Date.now());
    const kuluva = H.viikonRajat(nytMs);
    const rajat = tila === 'maanantai' ? H.viikonRajat(kuluva.alkuMs - 1) : kuluva;
    const r = await laskeKaikki(deps, { viikot: [rajat], nytMs, arvio: false });
    (deps.loki || console).log('[seuran kooste] ' + tila + ' ' + rajat.tunniste + ': ' + r.tulokset.length + ' seuraa ok, ' + r.virheet.length + ' virhettä');
    return null;
  };
}

/** Callable paivitaSeuranKooste({ seuraId }) — johto/SA oma seura. tarkistaOikeus (ei pelkkä context.auth). */
function paivitaKasittelija(deps) {
  const E = deps.HttpsError;
  return async (data, context) => {
    if (!context || !context.auth) throw new E('unauthenticated', 'Kirjaudu ensin.');
    const seuraId = data && typeof data.seuraId === 'string' ? data.seuraId.trim() : '';
    if (!seuraId) throw new E('invalid-argument', 'seuraId pakollinen.');
    const oikeus = await deps.tarkistaOikeus(context.auth.uid, seuraId, context.auth.token);
    if (!oikeus || !oikeus.sallittu || !(oikeus.rooli === 'superadmin' || JOHTO_ROOLIT.indexOf(oikeus.rooli) >= 0)) throw new E('permission-denied', 'Ei oikeutta seuran koosteeseen.');
    const seura = await deps.db.collection('seurat').doc(seuraId).get();
    if (!seura.exists) throw new E('not-found', 'Seuraa ei löydy.');
    const nytMs = (deps.nyt ? deps.nyt() : Date.now()), rajat = H.viikonRajat(nytMs);
    const vanha = await deps.db.collection('seurat').doc(seuraId).collection('kooste').doc(rajat.tunniste).get();
    const lask = vanha && vanha.exists ? vanha.data().laskettu : null, laskMs = lask && typeof lask.toMillis === 'function' ? lask.toMillis() : null;
    if (laskMs != null && nytMs - laskMs < 30000 && !(vanha.data() || {}).arvio) return { vk: rajat.tunniste, tuore: true };   // kaksoisklikkaus / spämmi: 30 s jäähy
    try { const r = await laskeSeura(deps, seuraId, { rajat, nytMs, arvio: false }); return { vk: r.vk, joukkueita: r.joukkueita, tuore: false }; }
    catch (e) { (deps.loki || console).error('[paivitaSeuranKooste] ' + seuraId + ': ' + (e && e.stack || e)); throw new E('internal', 'Koosteen laskenta epäonnistui.'); }
  };
}

module.exports = { laskeSeura, laskeKaikki, ajastettuKasittelija, paivitaKasittelija, arvioHetki, JOHTO_ROOLIT };
