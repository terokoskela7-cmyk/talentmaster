/* ════════════════════════════════════════════════════════════════════════
   tm_vp_seuranta.js — Vaihe C: VP-seurantanäkymän KOONTI-/KUITTAUSLOGIIKKA (PURE).
   Ei laske uutta aktiivisuusmittaria — nojaa VP_v25:n olemassa olevaan VAI+-indeksiin
   (laskeVAI → v._vai {vai, halytykset[]}) ja hälytyslogiikkaan. Tämä lib vain KOOSTAA:
   roster-lajittelu (hälyttävät ensin), aktiivisten hälytysten suodatus kuittauksilla,
   IDP-aktivointien poiminta pelaajien pikakentistä. PURE (EI Firestore/DOM/Date.now).
   Dual-export: module.exports || window. §34.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // Tila-dot VAI+-indeksistä (sama kynnys kuin valmentajakortti: ≥70 🟢 · ≥50 🟡 · <50 ⚫; null → ei dataa).
  function tmSeurantaTilaDot(vai) {
    if (vai == null) return { dot: '⚫', vari: '#6B7280', tila: 'ei dataa' };
    if (vai >= 70) return { dot: '🟢', vari: '#28B090', tila: 'aktiivinen' };
    if (vai >= 50) return { dot: '🟡', vari: '#E0A040', tila: 'seuraa' };
    return { dot: '🔴', vari: '#C94040', tila: 'hälyttää' };
  }

  // Kuittauksen kanoninen avain (doc-id + audit-täsmäys): valmentaja + hälytystyyppi.
  function tmSeurantaKuittausAvain(valmentajaUid, tyyppi) {
    var slug = String(tyyppi == null ? '' : tyyppi).toLowerCase()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return String(valmentajaUid || '') + '__' + slug;
  }

  // Hälytyksen vakavuuspisteet lajitteluun (red > amber > muu).
  function _halScore(halytykset) {
    var red = 0, amber = 0;
    (halytykset || []).forEach(function (h) {
      if (h && h.taso === 'red') red++;
      else if (h && h.taso === 'amber') amber++;
    });
    return { red: red, amber: amber, yht: red * 2 + amber };
  }

  // Roster-lajittelu: HÄLYTTÄVÄT ENSIN. Järjestys: eniten red-hälytyksiä → eniten hälytyksiä →
  // matalin VAI (null = matalin) → nimi. Palauttaa UUDEN taulukon (ei mutatoi).
  function tmSeurantaRosterSort(valmentajat) {
    var arr = (valmentajat || []).slice();
    arr.sort(function (a, b) {
      var va = (a && a._vai) || {}, vb = (b && b._vai) || {};
      var sa = _halScore(va.halytykset), sb = _halScore(vb.halytykset);
      if (sb.red !== sa.red) return sb.red - sa.red;
      if (sb.yht !== sa.yht) return sb.yht - sa.yht;
      var va2 = (va.vai == null) ? -1 : va.vai;   // null → alimmaksi (hälyttävin)
      var vb2 = (vb.vai == null) ? -1 : vb.vai;
      if (va2 !== vb2) return va2 - vb2;
      return String(a && a.nimi || '').localeCompare(String(b && b.nimi || ''));
    });
    return arr;
  }

  // Aktiiviset hälytykset: litistä valmentajien _vai.halytykset → suodata KUITATUT pois.
  // kuittaukset: [{ valmentaja_uid, tyyppi }] (tai valmis avainlista). Palauttaa red-ensin-järjestyksessä:
  //   [{ valmentaja_uid, valmentaja_nimi, joukkue, tyyppi, taso, avain }]
  function tmSeurantaAktiivisetHalytykset(valmentajat, kuittaukset) {
    var kuitatut = {};
    (kuittaukset || []).forEach(function (k) {
      if (!k) return;
      var avain = k.avain || tmSeurantaKuittausAvain(k.valmentaja_uid, k.tyyppi);
      kuitatut[avain] = true;
    });
    var ulos = [];
    (valmentajat || []).forEach(function (v) {
      var vd = (v && v._vai) || {};
      (vd.halytykset || []).forEach(function (h) {
        if (!h) return;
        var avain = tmSeurantaKuittausAvain(v.id, h.teksti);
        if (kuitatut[avain]) return;                 // kuitattu → pois aktiivilistalta (jää audittiin)
        ulos.push({
          valmentaja_uid: v.id, valmentaja_nimi: v.nimi || '?', joukkue: v.joukkue || '',
          tyyppi: h.teksti, taso: h.taso || 'amber', avain: avain
        });
      });
    });
    ulos.sort(function (a, b) {
      if (a.taso !== b.taso) return a.taso === 'red' ? -1 : 1;   // red ensin
      return String(a.valmentaja_nimi).localeCompare(String(b.valmentaja_nimi));
    });
    return ulos;
  }

  // Onko tietty hälytys kuitattu?
  function tmSeurantaOnKuitattu(kuittaukset, valmentajaUid, tyyppi) {
    var avain = tmSeurantaKuittausAvain(valmentajaUid, tyyppi);
    return (kuittaukset || []).some(function (k) {
      return k && ((k.avain || tmSeurantaKuittausAvain(k.valmentaja_uid, k.tyyppi)) === avain);
    });
  }

  function _ms(x) {
    if (x == null) return 0;
    if (typeof x === 'number') return x;
    if (typeof x === 'string') { var t = Date.parse(x); return isNaN(t) ? 0 : t; }
    if (typeof x.toMillis === 'function') return x.toMillis();
    if (x.seconds != null) return x.seconds * 1000;
    if (x instanceof Date) return x.getTime();
    return 0;
  }
  function _fokusTeksti(f) {
    if (!f) return null;
    if (typeof f === 'string') return f;
    return f.nimi || f.alue || f.konsepti_nimi || null;
  }

  // IDP-aktivoinnit-feed pelaajien PIKAKENTISTÄ (§26 — ei alikokoelmakyselyä). Poimii pelaajat joilla
  // idp_sitoumus_pvm (tai idp_aktivoitu_pvm) on viimeisen `ikkunaVrk` vrk sisällä nowMs:stä. Tuoreimmat
  // (≤ uusiVrk) saavat uusi:true. Palauttaa uusin-ensin:
  //   [{ pelaajaId, nimi, joukkue, fokus, tila, pvm(ISO), ms, uusi }]
  function tmSeurantaIdpFeed(pelaajat, nowMs, ikkunaVrk, uusiVrk) {
    ikkunaVrk = ikkunaVrk || 14;
    uusiVrk = uusiVrk || 3;
    var raja = nowMs - ikkunaVrk * 86400000;
    var uusiRaja = nowMs - uusiVrk * 86400000;
    var ulos = [];
    (pelaajat || []).forEach(function (p) {
      if (!p) return;
      var pvmRaw = p.idp_sitoumus_pvm || p.idp_aktivoitu_pvm || null;
      var ms = _ms(pvmRaw);
      if (!ms || ms < raja || ms > nowMs) return;     // ei pvm:ää / ikkunan ulkopuolella / tulevaisuus → ohita
      var nimi = ((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim() || p.nimi || p.id;
      var joukkue = p.joukkue || (Array.isArray(p.joukkueet) ? p.joukkueet[0] : '') || '';
      ulos.push({
        pelaajaId: p.id, nimi: nimi, joukkue: joukkue,
        fokus: _fokusTeksti(p.idp_fokus), tila: p.idp_tila || null,
        pvm: new Date(ms).toISOString(), ms: ms, uusi: ms >= uusiRaja
      });
    });
    ulos.sort(function (a, b) { return b.ms - a.ms; });
    return ulos;
  }

  var API = {
    tmSeurantaTilaDot: tmSeurantaTilaDot,
    tmSeurantaKuittausAvain: tmSeurantaKuittausAvain,
    tmSeurantaRosterSort: tmSeurantaRosterSort,
    tmSeurantaAktiivisetHalytykset: tmSeurantaAktiivisetHalytykset,
    tmSeurantaOnKuitattu: tmSeurantaOnKuitattu,
    tmSeurantaIdpFeed: tmSeurantaIdpFeed
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_VP_SEURANTA = API;
  if (typeof window !== 'undefined') {
    root.tmSeurantaTilaDot = tmSeurantaTilaDot;
    root.tmSeurantaKuittausAvain = tmSeurantaKuittausAvain;
    root.tmSeurantaRosterSort = tmSeurantaRosterSort;
    root.tmSeurantaAktiivisetHalytykset = tmSeurantaAktiivisetHalytykset;
    root.tmSeurantaOnKuitattu = tmSeurantaOnKuitattu;
    root.tmSeurantaIdpFeed = tmSeurantaIdpFeed;
  }
})(typeof window !== 'undefined' ? window : this);
