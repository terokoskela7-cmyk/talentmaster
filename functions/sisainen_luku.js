'use strict';
/* Vaihe 1 / PR 1c-2 — CF:ien dual-read: pelaajadokumentin A-kentät (henkilokunta: review_viimeisin_*, vastuuhenkilo …; jaksofokus-osat) yhdistetään sisainen/tiedot:iin SAMALLA logiikalla kuin selaimessa
   (functions/tm_sisainen.js = tavu tavulta lib/tm_sisainen.js, functions/jaettu_lib.json). Admin SDK ohittaa Rulesin → luku onnistuu ilman oikeuksia.
   LIPPU: ei omaa vakiota — luetaan SAMASTA lähteestä kuin selain (RYHMAT.henkilokunta.kirjoitus / RYHMAT.jaksofokus_sisainen.kirjoitus jaetussa kopiossa). Kopio on pakotetusti identtinen libin kanssa
   (tests/functions_jaettu_lib.test.js), joten CF ja selain eivät voi erota; lipun kytkentä = lib-muutos + sama Functions-deploy. Lippu(jen) ollessa pois: EI lisälukuja, data palautetaan sellaisenaan.
   Virhe sisainen-luvussa EI kaada ajoa: tmSisainenLataaSeura palauttaa tyhjän mapin → vanhat kentät (console.warn). */
const S = require('./tm_sisainen.js');

function liputPaalla(ryhmat) {
  const r = ryhmat || S.RYHMAT;
  return !!((r.henkilokunta && r.henkilokunta.kirjoitus) || (r.jaksofokus_sisainen && r.jaksofokus_sisainen.kirjoitus));
}
/* rivit: [{ id, data }] → sama muoto, data yhdistettynä. YKSI collectionGroup-kysely per seura (indeksi sisainen.seuraId).
   opts.aina = true: ohita lippu — D3-ryhmä (d3_pvm, d3_taso …) EI ole lipun takana (PR 1d/2a: kirjoitetaan vain sisainen:iin), joten D3:a lukevat CF:t (seuran_kooste) yhdistävät aina. */
async function yhdistaLista(db, sid, rivit, opts) {
  const o = opts || {};
  if (!o.aina && !liputPaalla(o.ryhmat)) return rivit;
  const r = await S.tmSisainenLataaSeura(db, sid);
  return rivit.map((x) => ({ id: x.id, data: S.tmSisainenYhdista(x.data, r.mapa[x.id], o.ryhmat ? { ryhmat: o.ryhmat } : undefined) }));
}
/* Yksi pelaaja: data (pelaajadokumentti) → yhdistetty. */
async function yhdistaYksi(db, sid, pid, data, opts) {
  const o = opts || {};
  if (!liputPaalla(o.ryhmat)) return data;
  let sis = null;
  try {
    const snap = await db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection(S.ALIKOKOELMA).doc(S.DOKUMENTTI).get();
    sis = snap && snap.exists ? snap.data() : null;
  } catch (e) { console.warn('[sisainen_luku] sisainen/tiedot-luku epäonnistui — käytetään vanhoja kenttiä:', e && (e.code || e.message)); }
  return S.tmSisainenYhdista(data, sis, o.ryhmat ? { ryhmat: o.ryhmat } : undefined);
}
module.exports = { liputPaalla, yhdistaLista, yhdistaYksi };
