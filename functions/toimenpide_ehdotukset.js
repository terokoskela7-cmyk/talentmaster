'use strict';
/**
 * Avauskirjoitukset palvelimelle, PR B (.briefit/projektit/03-avauskirjoitukset-palvelimelle/VAIHE0.md §2, PM 8.11.2026 P3/P4 + id-korjaus).
 * Automaattiset toimenpide-ehdotukset lasketaan viikkokoosteen yhteydessä (su 21, ma 06, paivitaSeuranKooste) eikä VP:n avauksessa.
 * Laskenta = jaettu lib tm_toimenpide_signaalit.js (VP:n entiset kuusi signaalia sanasta sanaan); dedup (D134) = tm_koti_luvut.ehdotusEste.
 *
 * DETERMINISTINEN ID: auto_{signaali}_{joukkueId}_{vvvv-Www}_{sha1(teksti)[:10]}
 *  · create() → rinnakkainen ajo / toinen callable saa ALREADY_EXISTS (koodi 6), joka ohitetaan → kilpatilanne ja tuplat poistuvat.
 *  · Viikko = KOOSTE-VIIKKO (rajat.tunniste): su 21 ja seuraava ma 06 laskevat saman viikon (ma 06 käyttää edellistä viikkoa), joten ne törmäävät samaan id:hen.
 *  · Kuitattu/hylätty ehdotus estää saman ehdotuksen vain kyseisen viikon ajan; seuraavana viikkona id on uusi → ehdotus palaa, jos signaali on yhä päällä.
 *    Avoin (tila=='ehdotus') ehdotus estää tuplan viikkojen yli (ehdotusEste, D134).
 * db / FieldValue injektoidaan (testattava). Kenttärakenne = VP:n entinen tallennaToimenpide, joten luku/kuittaus/hylkäys/muokkaus ja sv-käännös toimivat ennallaan.
 */
const crypto = require('crypto');
const SIG = require('./tm_toimenpide_signaalit');
const LU = require('./tm_koti_luvut');
const FYS = require('./tm_fyysinen');
const TEK = require('./tm_tekniikka');
const JK = require('./tm_joukkue');
const PHV = require('./tm_phv_tila');

const ALREADY_EXISTS = 6;
const sha10 = (s) => crypto.createHash('sha1').update(String(s), 'utf8').digest('hex').slice(0, 10);

/** Ehdotuksen dokumentti-id (puhdas). joukkueId ei saa sisältää '/'. */
function ehdotusId(signaali, joukkueId, viikko, teksti) {
  return 'auto_' + signaali + '_' + String(joukkueId).replace(/\//g, '_') + '_' + viikko + '_' + sha10(teksti);
}

/** VP:n lataaPelaajat-normalisointi + _vpJasenyydet (jäsenyys tmPelaajanJoukkueet:llä), jotta signaalit saavat samat kentät kuin VP:ssä. */
function valmistelePelaajat(pelaajaRivit, joukkueDokt) {
  const docs = joukkueDokt.length ? joukkueDokt : null, nimet = {};
  joukkueDokt.forEach((d) => { nimet[d.id] = d.nimi || d.id; });
  return pelaajaRivit.map((r) => {
    const data = r.data || {};
    const p = Object.assign({ id: r.id }, data, {
      flei_viimeisin: data.flei_viimeisin != null ? data.flei_viimeisin : (data.flei != null ? data.flei : null),
      tki_viimeisin: data.tki_viimeisin != null ? data.tki_viimeisin : null,
      tki_pvm: data.tki_pvm != null ? data.tki_pvm : null,
      tki_merkki: data.tki_merkki != null ? data.tki_merkki : null,
      hh_taso: data.hh_taso != null ? data.hh_taso : null,
      hh_viimeisin: data.hh_viimeisin != null ? data.hh_viimeisin : null,
      phv_tila: PHV.tmPhvKoodi(data), phv_ilmoitettu_ph: PHV.tmPhvIlmoitettuPH(data), phv_ei_mitattu: PHV.tmPhvEiMitattu(data),
      joukkue: _normJoukkue(data.joukkue || data.joukkueNimi || '—'),
    });
    const ids = JK.tmPelaajanJoukkueet(p, docs); p._jIds = ids; p._jNimet = ids.map((id) => nimet[id] || id);
    if (docs && ids.length) p.joukkue = p._jNimet[0];
    return p;
  });
}
function _normJoukkue(j) {   // VP normalisioiJoukkue
  if (!j) return j;
  return j.replace(/_/g, ' ').toUpperCase().replace(/([A-Z]{2,})\s([PTU])(\d+)/, (_, seura, sukupuoli, ika) => seura + ' ' + sukupuoli + ika);
}
const jasenNimet = (p) => ((p && p._jNimet && p._jNimet.length) ? p._jNimet : ((p && p.joukkue && p.joukkue !== '—') ? [p.joukkue] : []));

/**
 * Luo seuran ehdotukset. pelaajaRivit = [{id, data}] (yhdistetty sisäinen data), joukkueDokt = [{id, nimi}], viikko = kooste-viikon tunniste.
 * Palauttaa vain lukumäärät.
 */
async function luoEhdotukset(deps, sid, pelaajaRivit, joukkueDokt, viikko, nytMs) {
  const seuraRef = deps.db.collection('seurat').doc(sid), kokoelma = seuraRef.collection('toimenpiteet');
  const pelaajat = valmistelePelaajat(pelaajaRivit, joukkueDokt);
  const snap = await kokoelma.where('tila', '==', 'ehdotus').limit(50).get();
  const avoimet = (snap && snap.docs ? snap.docs : []).map((d) => Object.assign({ id: d.id }, d.data()));
  const este = LU.ehdotusEste(avoimet, nytMs);
  const ctx = { nytMs, onJoukkueessa: (p, j) => jasenNimet(p).indexOf(j) >= 0, jasenNimet, fysinen: FYS, tekniikka: TEK };
  const uudet = SIG.laskeEhdotukset(pelaajat, ctx, este, LU);
  const idPerNimi = {}; joukkueDokt.forEach((d) => { if (d.nimi && idPerNimi[d.nimi] == null) idPerNimi[d.nimi] = d.id; });
  let luotu = 0, ohitettu = 0;
  for (const r of uudet) {
    const jid = idPerNimi[r.joukkue] != null ? idPerNimi[r.joukkue] : 'x' + sha10(r.joukkue).slice(0, 8);   // joukkueeton/tuntematon: stabiili nimitiiviste
    try {
      await kokoelma.doc(ehdotusId(r.signaali, jid, viikko, r.teksti)).create({
        tyyppi: 'automaattinen', signaali: r.signaali, joukkue: r.joukkue, teksti: r.teksti, tila: 'ehdotus', vp_teksti: null,
        luotu: deps.FieldValue.serverTimestamp(), kuitattu_pvm: null, kuitattu_uid: null,
      });
      luotu++;
    } catch (e) {
      if (e && (e.code === ALREADY_EXISTS || /ALREADY_EXISTS|already exists/i.test(String(e.message || '')))) ohitettu++;
      else throw e;
    }
  }
  return { luotu, ohitettu, ehdokkaita: uudet.length };
}

module.exports = { luoEhdotukset, ehdotusId, valmistelePelaajat, jasenNimet };
