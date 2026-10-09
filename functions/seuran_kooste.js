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
const { suostumusAnnettu } = require('./suostumus');

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
const DAY = 86400000, IKKUNA_PV = 30;
const RSVP_ROOLIT = ['pelaaja', 'vanhempi'];   // kalenterin lasnaolijat-saatavuus: kirjoittaja (Rules RSVP-erotus: pelaaja/huoltaja kirjoittaa VAIN saatavuus + paivitetty + rooli)
const _pvmIso = (v) => { if (v == null || v === '') return null; if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return String(v); const t = new Date(_norm(v)).getTime(); return isNaN(t) ? null : K.pvmHelsinki(t); };
function _poissa(d) { return d.poistettu === true || d.arkistoitu === true || d.aktiivinen === false; }   // varovainen: kaikki yleiset "ei mukana" -liput

/** S1.1 — pelaajan/huoltajan OMAT kirjoitukset (päivämäärät) ikkunassa [arvio−29 pv, arvio]. Lähteet (kaikki palvelimella Admin SDK:lla, vain päivämäärät/lukumäärä, ei sisältöä):
 *  (1) pelaajat/{pid}/kirjaukset/{pvm} — pelaajan kirjaus + U12-huoltajan jakso_kuittaus (sama dokumentti) · (2) pelaajat/{pid}/viikkokatsaukset/{pvm}
 *  (3) kalenteri/{id}/lasnaolijat/{pid}: saatavuus (RSVP), rooli pelaaja|vanhempi, paivitetty ikkunassa · (4) viestit: tyyppi klippi_vastaus (pelaaja/huoltaja) ja klippi_kuittaus (huoltaja)
 *  Lisäksi pelaajadokumentin omat pikakentät (ydinvahvuus_valinta.valittu_pvm, idp_sitoumus_pvm, d3_pvm, streak_paivitetty) — jo ladattu, ei lisälukuja.
 *  Lukuarvio per ajo: 2 kyselyä/pelaaja (≤ 31 dokumenttia kukin, tyypillisesti 0–3) + kalenteritapahtumat ikkunassa × niiden lasnaolijat + klippiviestit. Tulos kirjoitetaan p.oma-listaan (mutaatio). */
async function keraaOma(deps, seuraRef, pelaajat, arvioMs) {
  const { FieldPath } = deps; const arvioPvm = K.pvmHelsinki(arvioMs), alkuPvm = K.pvmHelsinki(arvioMs - (IKKUNA_PV - 1) * DAY);
  const ikk = (pvm) => !!pvm && pvm >= alkuPvm && pvm <= arvioPvm;
  const kasittele = async (era, fn) => { for (const e of _erat(era, 25)) await Promise.all(e.map(fn)); };
  // (1)+(2) alikokoelmat: dokumentti-id = päivä → rajaus id-välillä, uusin riittää (kumpikin ikkuna ratkeaa uusimmasta ≤ arvio)
  await kasittele(pelaajat, async (p) => {
    const pRef = seuraRef.collection('pelaajat').doc(p.id);
    for (const nimi of ['kirjaukset', 'viikkokatsaukset']) {
      const snap = await pRef.collection(nimi).where(FieldPath.documentId(), '>=', alkuPvm).where(FieldPath.documentId(), '<=', arvioPvm).limit(IKKUNA_PV + 1).get();
      const idt = (snap && snap.docs ? snap.docs : []).map((d) => d.id).filter((id) => /^\d{4}-\d{2}-\d{2}$/.test(id) && ikk(id)).sort();
      if (idt.length) p.oma.push(idt[idt.length - 1]);
      if (nimi === 'viikkokatsaukset' && idt.length) p.toiminto.push(idt[idt.length - 1]);   // v4: viikkokatsaus vastattu
      if (nimi === 'kirjaukset') {   // v4: vain huoltajan jakso_kuittaus (ei itse kirjaus)
        const kuitt = (snap && snap.docs ? snap.docs : []).filter((d) => { const k = (d.data() || {}).jakso_kuittaus; return k && typeof k === 'object' && ikk(d.id); }).map((d) => d.id).sort();
        if (kuitt.length) { p.toiminto.push(kuitt[kuitt.length - 1]); p.perhe.push(kuitt[kuitt.length - 1]); }
      }
    }
  });
  const kohde = new Map(pelaajat.map((p) => [p.id, p]));
  const lisaa = (pid, pvm) => { const p = kohde.get(pid); if (p && ikk(pvm)) p.oma.push(pvm); };
  // (3) kalenteri: tapahtumat joiden päivä ≥ ikkunan alku (tulevat mukaan: RSVP voi olla tehty ennen tapahtumaa); paivitetty ratkaisee
  const evSnap = await seuraRef.collection('kalenteri').where('pvm', '>=', alkuPvm).limit(500).get();
  const tapahtumat = (evSnap && evSnap.docs ? evSnap.docs : []).filter((d) => { const v = (d.data() || {}).pvm; return typeof v === 'string' && v >= alkuPvm; });
  await kasittele(tapahtumat, async (ev) => {
    const ls = await seuraRef.collection('kalenteri').doc(ev.id).collection('lasnaolijat').get();
    (ls && ls.docs ? ls.docs : []).forEach((l) => { const x = l.data() || {}; if (x.saatavuus != null && RSVP_ROOLIT.indexOf(x.rooli) >= 0) lisaa(l.id, _pvmIso(x.paivitetty)); });
  });
  // (4) klippivastaukset ja -kuittaukset (R6.4): yksi yhtäsuuruuskysely/tyyppi (ei yhdistelmäindeksiä), suodatus koodissa
  for (const tyyppi of ['klippi_vastaus', 'klippi_kuittaus']) {
    const vs = await seuraRef.collection('viestit').where('tyyppi', '==', tyyppi).limit(2000).get();
    (vs && vs.docs ? vs.docs : []).forEach((d) => {
      const x = d.data() || {}; if (x.tyyppi !== tyyppi) return;
      const pvm = _pvmIso(x.aika || x.luotu); lisaa(x.pelaajaId, pvm);
      const p = kohde.get(x.pelaajaId); if (p && ikk(pvm)) { p.toiminto.push(pvm); if (tyyppi === 'klippi_kuittaus') p.perhe.push(pvm); }   // v4: klippivastaus/-kuittaus; kuittaus = perhe
    });
  }
}

/** S2 / kooste v4 — SILMUKAN TOIMINNOT (D65), erillinen lista p.toiminto (+ p.perhe = perheen kuittaukset, D71). Lähteet (päivämäärät, ei sisältöä; ikkuna [arvio−29 pv, arvio], uusin riittää koska ikkuna 7 pv ratkeaa uusimmasta ≤ arvio):
 *  viikkokatsaukset/{pvm} (kerätään keraaOma-silmukassa) · pelaajadokumentin ydinvahvuus_valinta.valittu_pvm · viestit klippi_vastaus + klippi_kuittaus (R6.4; kuittaus on huoltajan → myös p.perhe) ·
 *  kirjaukset/{pvm}.jakso_kuittaus (U12-huoltajan kuittaus; vain doc jolla kenttä on map → p.toiminto + p.perhe; itse kirjaus EI ole toiminto). EI läsnäoloa/RSVPtä, EI kirjautumista. */
const TOIMINTO_LAHTEET = ['viikkokatsaukset', 'ydinvahvuus_valinta', 'klippi_vastaus', 'klippi_kuittaus', 'kirjaukset.jakso_kuittaus'];

/** Arviointihetki: ei myöhemmin kuin su klo 21 Helsingin aikaa (voimassa oleva jakso = käynnissä sunnuntaina klo 21), ei tulevaisuudessa. */
function arvioHetki(nytMs, rajat) { return Math.min(nytMs, rajat.su21Ms); }

async function laskeSeura(deps, sid, opts) {
  const { db, FieldValue, FieldPath } = deps; const rajat = opts.rajat, nytMs = opts.nytMs, arvioMs = arvioHetki(nytMs, rajat);
  const seuraRef = db.collection('seurat').doc(sid);
  const [jSnap, pSnap] = await Promise.all([seuraRef.collection('joukkueet').get(), seuraRef.collection('pelaajat').get()]);
  const joukkueet = jSnap.docs.map((d) => { const x = d.data() || {}; return { id: d.id, nimi: x.nimi || '', ikaryhma: x.ikaryhma || null, jaksofokus: _norm(x.jaksofokus) || null, tyyppi: x.tyyppi || null, valmentajaprofiili: x.valmentajaprofiili || null }; });   // v4: joukkueen asetukset (D70, D50)
  const pelaajat = [];
  pSnap.docs.forEach((d) => {
    const x = d.data() || {}; if (_poissa(x)) return;
    pelaajat.push({ id: d.id, joukkue: x.joukkue || null, joukkueet: Array.isArray(x.joukkueet) ? x.joukkueet : [], syntymaVuosi: x.syntymaVuosi != null ? x.syntymaVuosi : null,
      jaksofokus: _norm(x.jaksofokus) || null, jaksofokus_historia: _norm(x.jaksofokus_historia) || [], ydinvahvuus: _norm(x.ydinvahvuus) || null, ydinvahvuus_valinta: _norm(x.ydinvahvuus_valinta) || null, idp_sitoumus_pvm: _norm(x.idp_sitoumus_pvm) || null,
      // S1.1 Käyttöaste (versio 2): vain päivämääriä ja totuusarvo — ei sisältöä
      suostumus: suostumusAnnettu(x), viimeisinKirjautuminen: _pvmIso(x.viimeisinKirjautuminen), huoltajaViimeisinKaynti: _pvmIso(x.huoltajaViimeisinKaynti),
      oma: [x.idp_sitoumus_pvm, x.d3_pvm, x.streak_paivitetty, x.ydinvahvuus_valinta && x.ydinvahvuus_valinta.valittu_pvm].map(_pvmIso).filter(Boolean),
      // v4 (S2): silmukan toiminnot ja perheen kuittaukset — täydentyvät keraaOma:ssa
      toiminto: [x.ydinvahvuus_valinta && x.ydinvahvuus_valinta.valittu_pvm].map(_pvmIso).filter(Boolean), perhe: [] });
  });
  await keraaOma(deps, seuraRef, pelaajat, arvioMs);
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

  if (opts.eiYlikirjoitaTodellista) {   // takaisinlaskenta: älä korvaa palvelimen oikeaa (ei-arvio) koostetta arviolla
    const vanha = await seuraRef.collection('kooste').doc(rajat.tunniste).get();
    if (vanha && vanha.exists && !(vanha.data() || {}).arvio) return { sid, vk: rajat.tunniste, ohitettu: 'todellinen_olemassa', joukkueita: joukkueDokt.length };
  }
  if (opts.kuiva) return { sid, vk: rajat.tunniste, kuiva: true, joukkueita: joukkueDokt.length, pelaajia: pelaajat.length, doc };   // ei kirjoiteta (takaisinlaskennan kuiva-ajo)
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


/** Yhteenveto lukumääristä (ei nimiä/ID:itä) — takaisinlaskennan kuiva-ajon näyttöön. */
function yhteenveto(doc) {
  const y = { joukkueita: 0, joukkuejaksoja: 0, pelaajat: 0, jaksolla: 0, valinta_odottaa: 0, katselmus: 0, vastanneet: 0, vastausperusta: 0, katselmus_ajallaan: 0, katselmus_perusta: 0, suostumus: 0, kirjautunut_30: 0, huoltaja_30: 0, aktiivinen_7: 0, aktiivinen_30: 0, toiminto_7: 0, perhe_kuittaus_7: 0 };
  Object.keys((doc && doc.joukkueet) || {}).forEach((jid) => { const j = doc.joukkueet[jid]; y.joukkueita++; if (j.jakso) y.joukkuejaksoja++; y.pelaajat += j.n_pelaajat; y.jaksolla += j.n_jaksolla; y.valinta_odottaa += j.n_valinta_odottaa; y.katselmus += j.n_katselmus; y.vastanneet += j.n_vastanneet; y.vastausperusta += j.n_vastausperusta; y.katselmus_ajallaan += j.n_katselmus_ajallaan; y.katselmus_perusta += j.n_katselmus_perusta; y.suostumus += j.n_suostumus || 0; y.kirjautunut_30 += j.n_kirjautunut_30 || 0; y.huoltaja_30 += j.n_huoltaja_30 || 0; y.aktiivinen_7 += j.n_aktiivinen_7 || 0; y.aktiivinen_30 += j.n_aktiivinen_30 || 0; y.toiminto_7 += j.n_toiminto_7 || 0; y.perhe_kuittaus_7 += j.n_perhe_kuittaus_7 || 0; });
  return y;
}

/** Takaisinlaskenta (vain SA): edelliset N (1–8) ISO-viikkoa NYKYTILASTA, arvio:true, EI korvaa oikeaa koostetta. Oletus on KUIVA-AJO (kuiva ≠ false → ei kirjoiteta). Palauttaa vain lukumääriä. */
async function takaisinlaskenta(deps, E, oikeus, seuraId, data, nytMs, kuluva) {
  if (oikeus.rooli !== 'superadmin') throw new E('permission-denied', 'Takaisinlaskenta vain Super Adminille.');
  const n = Number(data.takaisin);
  if (!Number.isInteger(n) || n < 1 || n > 8) throw new E('invalid-argument', 'takaisin: kokonaisluku 1–8.');
  const kuiva = data.kuiva !== false;
  const viikot = []; for (let i = n; i >= 1; i--) viikot.push(H.viikonRajat(kuluva.alkuMs - i * 7 * 86400000 + 12 * 3600000));   // vanhin ensin
  const ulos = [];
  try {
    for (const rajat of viikot) {
      const r = await laskeSeura(deps, seuraId, { rajat, nytMs, arvio: true, eiYlikirjoitaTodellista: true, kuiva });
      ulos.push(Object.assign({ vk: rajat.tunniste }, r.ohitettu ? { ohitettu: r.ohitettu } : yhteenveto(r.doc)));
    }
  } catch (e) { (deps.loki || console).error('[paivitaSeuranKooste takaisin] ' + seuraId + ': ' + (e && e.stack || e)); throw new E('internal', 'Takaisinlaskenta epäonnistui.'); }
  return { takaisin: n, kuiva, viikot: ulos };
}

/** Callable paivitaSeuranKooste({ seuraId[, takaisin: 1–8, kuiva] }) — johto/SA oma seura. tarkistaOikeus (ei pelkkä context.auth). */
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
    if (data.takaisin != null) return takaisinlaskenta(deps, E, oikeus, seuraId, data, nytMs, rajat);   // Excel_Tuonti (SA): takaisinlaskenta napista, ei gcloud-skriptiä
    const vanha = await deps.db.collection('seurat').doc(seuraId).collection('kooste').doc(rajat.tunniste).get();
    const lask = vanha && vanha.exists ? vanha.data().laskettu : null, laskMs = lask && typeof lask.toMillis === 'function' ? lask.toMillis() : null;
    if (laskMs != null && nytMs - laskMs < 30000 && !(vanha.data() || {}).arvio) return { vk: rajat.tunniste, tuore: true };   // kaksoisklikkaus / spämmi: 30 s jäähy
    try { const r = await laskeSeura(deps, seuraId, { rajat, nytMs, arvio: false }); return { vk: r.vk, joukkueita: r.joukkueita, tuore: false }; }
    catch (e) { (deps.loki || console).error('[paivitaSeuranKooste] ' + seuraId + ': ' + (e && e.stack || e)); throw new E('internal', 'Koosteen laskenta epäonnistui.'); }
  };
}

module.exports = { TOIMINTO_LAHTEET, laskeSeura, laskeKaikki, ajastettuKasittelija, paivitaKasittelija, arvioHetki, JOHTO_ROOLIT };
