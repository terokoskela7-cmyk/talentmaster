'use strict';
/**
 * Kalenteri-ilmoitukset (P7-c.4a, V2 P0.4 PR 2) — päätöslogiikka + idempotentti kirjoitus. Ei Firebase-importteja (admin injektoidaan).
 *
 * KIINTEÄ DOKUMENTTITUNNISTE: muistutus_<evId> · muutos_<evId> · peruttu_<evId> (yksi dokumentti / tapahtuma / tyyppi).
 *  · Ennen: col.where('dedupe').get() → col.add() = haku–lisäys-kilpatilanne + muutoksista uusi rivi joka kerta (tuplat).
 *  · muutos / peruttu: set(..., {merge:true}) → uusi muutos PÄIVITTÄÄ saman dokumentin tekstin, ajan (luotu) ja tapahtuma_alkaa:n
 *    ja asettaa luettu:false (+ tyhjentää luettu_pvm). Uutta riviä ei synny.
 *  · muistutus: create() — ajastettu ajo toistuu turvallisesti (toinen ajo ei tee mitään) EIKÄ nollaa jo luettua muistutusta
 *    (set-merge asettaisi luettu:false uudelleen). Poikkeaa muista tyypeistä tarkoituksella.
 * tapahtuma_alkaa (Timestamp, ADDITIIVINEN, §11): client renderöi päivän suhteellisena ("Tänään"/"Huomenna"); teksti säilyy ennallaan.
 * ilmoitus (objekti, ADDITIIVINEN, sv-läpiajo PR 2 / vaihtoehto A): { tyyppi: 'huomenna'|'peruttu'|'muutos', nimi, aika, paikka } — RAKENTEINEN sisältö, josta Pelaaja ja Vanhempi
 *   kokoavat tekstin omalla kielellään (lib/tm_kalenteri_ilmoitus.js tmIlmoitusRivi + t()). `teksti` kirjoitetaan edelleen (suomi) varakäyttöön: vanhat välimuistissa olevat
 *   clientit ja vanhat dokumentit näyttävät sen sellaisenaan. Rakenne sisältää vain nimen/ajan/paikan (GDPR, kuten teksti).
 * Vartija vertaa tapahtuman PÄÄTTYMISEEN (helsinki_paiva.tapahtumaPaattyy), ei alkuun. GDPR: teksti = nimi/aika/paikka.
 */
const { kelloHelsinki, onKellonaika, tapahtumaPaattyy } = require('./helsinki_paiva');

function notifDocId(tyyppi, evId) { return tyyppi + '_' + evId; }

function _klo(ev) {
  const a = ev && ev.alkaa && (typeof ev.alkaa.toDate === 'function' ? ev.alkaa.toDate() : ev.alkaa);
  return (a && onKellonaika(ev)) ? kelloHelsinki(a) : '';   // kellonajaton (koko päivä) → ei "klo 00:00"
}

// T5 · muistutus huomisen tapahtumasta → { tyyppi, teksti, alkaa }
function muistutusPaatos(ev) {
  const klo = _klo(ev);
  return {
    tyyppi: 'muistutus',
    teksti: 'Huomenna: ' + (ev.nimi || 'tapahtuma') + (klo ? ' klo ' + klo : '') + (ev.paikka ? ' · ' + ev.paikka : ''),
    ilmoitus: { tyyppi: 'huomenna', nimi: ev.nimi || '', aika: klo, paikka: ev.paikka || '' },
    alkaa: ev.alkaa || null,
  };
}

// T6 · muutos/peruutus → { tyyppi, teksti, alkaa } | null (ei ilmoitettavaa / tapahtuma jo päättynyt)
function muutosPaatos(before, after, nyt) {
  before = before || {}; after = after || {};
  const loppu = tapahtumaPaattyy(after);
  if (loppu && loppu.getTime() < (nyt || new Date()).getTime()) return null;   // päättynyt → ei ilmoiteta (koko päivän / kesken oleva ilmoitetaan)
  const peruttu = !before.poistettu && after.poistettu === true;
  const bMs = (before.alkaa && before.alkaa.toMillis) ? before.alkaa.toMillis() : null;
  const aMs = (after.alkaa && after.alkaa.toMillis) ? after.alkaa.toMillis() : null;
  const aikaMuuttui = !after.poistettu && bMs !== aMs;
  const paikkaMuuttui = !after.poistettu && (before.paikka || '') !== (after.paikka || '');
  if (!peruttu && !aikaMuuttui && !paikkaMuuttui) return null;   // vain muistiinpanot/kooste ym. → ei notifia
  if (peruttu) return { tyyppi: 'peruttu', teksti: 'Peruttu: ' + (after.nimi || 'tapahtuma'), ilmoitus: { tyyppi: 'peruttu', nimi: after.nimi || '', aika: '', paikka: '' }, alkaa: after.alkaa || null };
  const klo = _klo(after);
  return {
    tyyppi: 'muutos',
    teksti: 'Muutos: ' + (after.nimi || 'tapahtuma') + (aikaMuuttui && klo ? ' → klo ' + klo : '') + (paikkaMuuttui && after.paikka ? ' · ' + after.paikka : ''),
    ilmoitus: { tyyppi: 'muutos', nimi: after.nimi || '', aika: (aikaMuuttui && klo) ? klo : '', paikka: (paikkaMuuttui && after.paikka) ? after.paikka : '' },
    alkaa: after.alkaa || null,
  };
}

/**
 * Idempotentti kirjoitus kiinteällä dokumenttitunnisteella. col = notifikaatiot-kokoelma; fv = admin.firestore.FieldValue.
 * @returns {Promise<boolean>} true = kirjoitettu/päivitetty, false = muistutus oli jo olemassa
 */
async function kirjoitaNotif(col, paatos, evId, fv) {
  const id = notifDocId(paatos.tyyppi, evId);
  const ref = col.doc(id);
  const data = {
    tyyppi: paatos.tyyppi, teksti: String(paatos.teksti || '').slice(0, 200), linkki: 'kalenteri:' + evId,
    dedupe: id, tapahtuma_alkaa: paatos.alkaa || null, luotu: fv.serverTimestamp(), luettu: false,
  };
  if (paatos.ilmoitus) {   // rakenteinen sisältö (vaihtoehto A) — merkkijonot rajattu, vain nimi/aika/paikka
    const o = paatos.ilmoitus, rajaa = (s, n) => String(s == null ? '' : s).slice(0, n);
    data.ilmoitus = { tyyppi: rajaa(o.tyyppi, 12), nimi: rajaa(o.nimi, 120), aika: rajaa(o.aika, 8), paikka: rajaa(o.paikka, 120) };
  }
  if (paatos.tyyppi === 'muistutus') {
    try { await ref.create(data); return true; }
    catch (e) { if (e && (e.code === 6 || e.code === 'already-exists' || /ALREADY_EXISTS|already exists/i.test(String(e.message)))) return false; throw e; }
  }
  data.luettu_pvm = fv.delete();   // uusi muutos = lukematon uudelleen
  await ref.set(data, { merge: true });
  return true;
}

module.exports = { notifDocId, muistutusPaatos, muutosPaatos, kirjoitaNotif };
