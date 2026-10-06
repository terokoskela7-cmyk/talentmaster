'use strict';
/**
 * D-2 — ydinvahvuus-valinnan ilmoitus henkilökunnalle (PURE; ei Firestorea). Kutsuu index.js:n `notifValintaOdottaa`.
 *
 * Tilanne: pelaaja on valinnut ydinvahvuutensa (pelaajadokin `ydinvahvuus_valinta`, Rules v3.37) ja jakso odottaa vahvistusta
 * (`jaksofokus.tila === 'valittavana'`, D-1). Funktio kirjoittaa `seurat/{id}/viestit/{viestiId}` -dokumentit — EI sähköpostia, EI pushia.
 *
 * Vastaanottajat (Tero 6.10.2026):
 *   · ensisijaisesti pelaajan VASTUUHENKILÖ (`vastuuhenkilo.uid`; vain jos hän on seuran aktiivinen käyttäjä tai seuran vp_uid);
 *   · jos vastuuhenkilöä ei ole (tai hän ei kelpaa) → pelaajan joukkueen valmentajat (kayttajat.joukkueet ∩ pelaaja.joukkueet) + talenttivalmentajat;
 *   · VP ja UTJ AINA (kayttajat.rooli vp / urheilutoimenjohtaja + seura.vp_uid).
 * Tunniste: valinta_{pelaajaId}_{jaksoavain}_{uid} — yksi dokumentti per vastaanottaja; uusi valinta PÄIVITTÄÄ saman (luettu:false, set-merge).
 * Yhteiset kentät (R6.4:n klippiviestit samaan rakenteeseen): tyyppi, pelaajaId, jakso, osa, luettu (+ vastaanottajaUid/lahettajaUid/fromRole/fromNimi/aika
 * jotka Masterin viestikuuntelija jo lukee). Kentänimet neutraaleja (GDPR): ei heikkous/rajoite/kriittinen/ase.
 * RAJAUS: funktio ei kirjoita pelaajadokumenttiin eikä jaksofokukseen (testi: functions/test/valinta_viesti_handler.test.js).
 */

const TYYPPI = 'valinta';
const LAHETTAJA = 'jarjestelma';
const VAIHTOEHTO_MAX = 60;   // sama raja kuin Rulesissa (ydinvahvuus_valinta.vaihtoehto)

function _str(x) { return typeof x === 'string' ? x : ''; }
function _aktiivinen(k) { return !!k && k.aktiivinen !== false; }

/** Turvallinen dokumentti-ID-osa (ei "/" eikä muita erikoismerkkejä). */
function idOsa(s) { return _str(String(s == null ? '' : s)).replace(/[^A-Za-z0-9_-]/g, '_'); }
function viestiId(pelaajaId, jaksoavain, uid) { return 'valinta_' + idOsa(pelaajaId) + '_' + idOsa(jaksoavain) + '_' + idOsa(uid); }

/**
 * Laukaiseeko tämä pelaajadokin muutos ilmoituksen? → null | { jaksoavain, vaihtoehto, valittu_pvm }.
 * Ehto: ydinvahvuus_valinta on uusi tai muuttunut ja jakso odottaa vahvistusta (tila 'valittavana').
 */
function valintaPaatos(before, after) {
  before = before || {}; after = after || {};
  const v = after.ydinvahvuus_valinta;
  if (!v || typeof v !== 'object' || typeof v.vaihtoehto !== 'string' || !v.vaihtoehto) return null;
  const jf = after.jaksofokus;
  if (!jf || jf.tila !== 'valittavana') return null;
  const vanha = before.ydinvahvuus_valinta;
  if (vanha && vanha.vaihtoehto === v.vaihtoehto && vanha.valittu_pvm === v.valittu_pvm) return null;   // ei muutosta valinnassa → ei uutta viestiä
  const jaksoavain = _str(jf.konsepti_avain) || _str(jf.konsepti_nimi) || 'jakso';
  return { jaksoavain: jaksoavain, vaihtoehto: v.vaihtoehto.slice(0, VAIHTOEHTO_MAX), valittu_pvm: _str(v.valittu_pvm) || null };
}

/**
 * Vastaanottajat. kayttajat: [{uid, rooli, joukkueet, aktiivinen}] (uid = dokumentin id), seura: {vp_uid}. → [{uid, syy}] (uniikit, vakaa järjestys).
 * syy: 'vastuuhenkilo' | 'joukkue' | 'talentti' | 'johto'.
 */
function vastaanottajat(pelaaja, kayttajat, seura) {
  pelaaja = pelaaja || {}; seura = seura || {};
  const lista = (Array.isArray(kayttajat) ? kayttajat : []).filter(function (k) { return k && k.uid && _aktiivinen(k); });
  const vpUid = _str(seura.vp_uid);
  const ulos = []; const nahty = {};
  const lisaa = function (uid, syy) { if (uid && !nahty[uid]) { nahty[uid] = 1; ulos.push({ uid: uid, syy: syy }); } };

  const vh = pelaaja.vastuuhenkilo && typeof pelaaja.vastuuhenkilo === 'object' ? _str(pelaaja.vastuuhenkilo.uid) : '';
  const vhKelpaa = !!vh && (vh === vpUid || lista.some(function (k) { return k.uid === vh; }));
  if (vhKelpaa) {
    lisaa(vh, 'vastuuhenkilo');
  } else {
    const jk = Array.isArray(pelaaja.joukkueet) ? pelaaja.joukkueet : [];
    lista.forEach(function (k) {
      if (k.rooli === 'valmentaja' && Array.isArray(k.joukkueet) && k.joukkueet.some(function (j) { return jk.indexOf(j) >= 0; })) lisaa(k.uid, 'joukkue');
    });
    lista.forEach(function (k) { if (k.rooli === 'talenttivalmentaja') lisaa(k.uid, 'talentti'); });
  }
  // VP ja UTJ AINA (myös kun vastuuhenkilö on asetettu)
  if (vpUid) lisaa(vpUid, 'johto');
  lista.forEach(function (k) { if (k.rooli === 'vp' || k.rooli === 'urheilutoimenjohtaja') lisaa(k.uid, 'johto'); });
  return ulos;
}

function pelaajanNimi(p) { return [_str(p && p.etunimi), _str(p && p.sukunimi)].filter(Boolean).join(' ') || _str(p && p.nimi); }

/** Viestidokumentit (ilman `aika`-aikaleimaa — sen lisää kutsuja serverTimestampina). → [{ id, data }] */
function rakennaViestit(pelaajaId, pelaaja, paatos, vastaanottajaLista, kayttajat) {
  const nimet = {}; (Array.isArray(kayttajat) ? kayttajat : []).forEach(function (k) { if (k && k.uid) nimet[k.uid] = _str(k.nimi) || _str(k.etunimi); });
  const vh = pelaaja && pelaaja.vastuuhenkilo && pelaaja.vastuuhenkilo.uid ? pelaaja.vastuuhenkilo : null;
  const nimi = pelaajanNimi(pelaaja);
  return vastaanottajaLista.map(function (r) {
    const data = {
      tyyppi: TYYPPI, pelaajaId: pelaajaId, jakso: paatos.jaksoavain, osa: null, luettu: false, nakyvyys: 'henkilokunta',
      vastaanottajaUid: r.uid, lahettajaUid: LAHETTAJA, fromRole: LAHETTAJA, fromNimi: 'TalentMaster',
      pelaajaNimi: nimi, vaihtoehto: paatos.vaihtoehto, syy: r.syy,
      vastuuhenkilo_uid: vh ? vh.uid : null, vastuuhenkilo_nimi: vh ? (nimet[vh.uid] || null) : null,
      teksti: (nimi ? nimi + ' ' : '') + 'valitsi ydinvahvuutensa, vahvista jakso.',   // fi-varateksti; Master piirtää kentistä masterT:llä
    };
    return { id: viestiId(pelaajaId, paatos.jaksoavain, r.uid), data: data };
  });
}

module.exports = { TYYPPI, LAHETTAJA, idOsa, viestiId, valintaPaatos, vastaanottajat, rakennaViestit, pelaajanNimi };
