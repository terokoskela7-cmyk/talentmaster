/* ════════════════════════════════════════════════════════════════════════
   tm_valmentajaviesti.js — YKSI kirjoituspiste valmentajan viestille perheelle.

   MIKSI JAETTU: sama dokumentti syntyy nyt kolmesta paikasta (Masterin `sendReply` ja
   `inboxReact` sekä VP:n pelaajakortti). Kolme kopiota ajautuisi erilleen, ja juuri se
   on tämän alueen historia: `nakyvyys` puuttui aluksi kokonaan, jolloin viestit katosivat
   pelaajalta ja huoltajan koko kysely hylättiin.

   ⚠ KAKSI INVARIANTTIA, jotka tämä funktio pitää voimassa:
     1. `nakyvyys:'pelaaja'` — viesti perheelle on nimenomaan perheelle tarkoitettu.
        Ilman kenttää Rules v3.22 piilottaa sen pelaajalta ja huoltajalta.
     2. `luotu` on serverTimestamp — Rules (A5) vaatii timestampin luonnissa.
   Lisäksi lähettäjän nimi EI saa olla sähköposti: lapsi näkee sen kortissaan.

   Dual-export: module.exports (Vitest) || window (selain).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* Nimi, jonka lapsi näkee. Sähköposti hylätään myös silloin kun se tulee
     `displayName`-kentästä — osa tunnuksista on luotu sähköpostilla. */
  function tmViestiNimi(ehdokkaat) {
    var lista = Array.isArray(ehdokkaat) ? ehdokkaat : [ehdokkaat];
    for (var i = 0; i < lista.length; i++) {
      var s = (lista[i] == null) ? '' : String(lista[i]).trim();
      if (s && s.indexOf('@') < 0) return s;
    }
    return 'Valmentaja';
  }

  /**
   * Kirjoittaa valmentajan viestin perheelle.
   * @param db      Firestore-instanssi (KUTSUJAN OMA — ks. realm-invariantti, PR #660)
   * @param o       { seuraId, pelaajaId, teksti, uid, nimi, sentinel }
   *                `sentinel` = firebase.firestore.FieldValue (annetaan, jotta lib pysyy puhtaana)
   * @returns Promise dokumenttiviitteestä
   */
  function tmLahetaValmentajaViesti(db, o) {
    o = o || {};
    var teksti = String(o.teksti == null ? '' : o.teksti).trim();
    if (!db || !o.seuraId || !o.pelaajaId || !teksti) {
      return Promise.reject(new Error('tmLahetaValmentajaViesti: puuttuva seuraId, pelaajaId tai teksti'));
    }
    if (!o.sentinel || typeof o.sentinel.serverTimestamp !== 'function') {
      return Promise.reject(new Error('tmLahetaValmentajaViesti: serverTimestamp-sentinel puuttuu'));
    }
    var nimi = tmViestiNimi([o.nimi]);
    var data = {
      tyyppi: 'valmentaja_viesti',
      tila: 'valmis',
      /* v3.22: ilman tätä viesti katoaa pelaajalta ja huoltajan kysely hylätään. */
      nakyvyys: 'pelaaja',
      teksti: teksti,
      valmentajaUid: o.uid || null,
      valmentajaNimi: nimi,
      /* Tekijäkentät myös uudessa muodossa: perumisen sääntö (v3.23) ja historian
         normalisointi lukevat `tekija_uid`/`tekija_nimi`. Vanhat kentät jäävät, jottei
         yksikään olemassa oleva lukija hajoa. */
      tekija_uid: o.uid || null,
      tekija_nimi: nimi,
      pelaajaId: o.pelaajaId,
      seuraId: o.seuraId,
      luotu: o.sentinel.serverTimestamp(),   // A5: Rules vaatii timestampin luonnissa
      pelaaja_lukenut: false,
      vanhempi_lukenut: false
    };
    return db.collection('seurat').doc(o.seuraId)
      .collection('pelaajat').doc(o.pelaajaId)
      .collection('havainnot').add(data);
  }

  /* ── LÄHETYKSEN LOPPUTULOS (Vaihe 0 / T2) ────────────────────────────────────────────
     "Viesti lähetetty" näytetään VASTA kun tallennus on valmis. Aiemmin toast tuli heti ja
     virhe meni vain konsoliin — valmentaja luuli viestin menneen perille. Master ei käytä
     Firestoren offline-välimuistia, joten add() voi jäädä roikkumaan ilman verkkoa: siksi
     aikaraja, jonka jälkeen näytetään sama virhe kuin verkkokatkossa. Tekstiä ei hävitetä. */
  var TM_VIESTI_AIKARAJA_MS = 15000;

  function tmViestiAikarajalla(lupaus, ms) {
    var raja = (typeof ms === 'number' && ms > 0) ? ms : TM_VIESTI_AIKARAJA_MS;
    return new Promise(function (ok, virhe) {
      var valmis = false;
      var ajastin = setTimeout(function () {
        if (valmis) return;
        valmis = true;
        var e = new Error('tmViesti: aikaraja ylittyi (' + raja + ' ms)');
        e.code = 'deadline-exceeded';
        virhe(e);
      }, raja);
      Promise.resolve(lupaus).then(function (v) {
        if (valmis) return;
        valmis = true; clearTimeout(ajastin); ok(v);
      }, function (e) {
        if (valmis) return;
        valmis = true; clearTimeout(ajastin); virhe(e);
      });
    });
  }

  /* Virhe → näyttötekstin AVAIN (suomeksi; sivu kääntää masterT/vpT:llä). */
  function tmViestiVirheAvain(e) {
    var koodi = String((e && e.code) || '').replace(/^firestore\//, '');
    if (koodi === 'permission-denied') return 'Ei oikeutta lähettää tälle pelaajalle';
    if (koodi === 'unavailable' || koodi === 'deadline-exceeded' || koodi === 'network-request-failed'
      || (typeof navigator !== 'undefined' && navigator && navigator.onLine === false)) {
      return 'Ei yhteyttä, yritä uudelleen';
    }
    return 'Viestin lähetys ei onnistunut';
  }

  var API = {
    tmLahetaValmentajaViesti: tmLahetaValmentajaViesti,
    tmViestiAikarajalla: tmViestiAikarajalla,
    tmViestiVirheAvain: tmViestiVirheAvain,
    TM_VIESTI_AIKARAJA_MS: TM_VIESTI_AIKARAJA_MS,
    tmViestiNimi: tmViestiNimi
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else {
    root.TM_VALMENTAJAVIESTI = API;
    for (var k in API) { if (Object.prototype.hasOwnProperty.call(API, k)) { try { root[k] = API[k]; } catch (e) { /* readonly */ } } }
  }
})(typeof window !== 'undefined' ? window : this);
