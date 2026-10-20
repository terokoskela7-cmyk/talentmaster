/* ════════════════════════════════════════════════════════════════════════
   tm_kt_klippi.js — Kehitystyöpöytä K1 (CODE_BRIEF_K1_K2; inventaario #4 ja #7): KLIPIN LÄHETYS SHEETINÄ uudella sivulla (D100), ei paluuta Masteriin. Dual-export: module.exports || window.TM_KT_KLIPPI.
   Sama sisältö ja sama kirjoitus kuin Masterin mediakanavassa: lomake lib/tm_mediaviesti.js:stä (tmMvSheetHTML, opts.runko), dokumentit tmMvKlippiDokumentit (D56 linkki, D62 ajastus klo 21–7, fromNimi), kysymys tmMvSheetKysymys ja kirjoitus tmMvKirjoitaDokit — kaikki yhdessä paikassa libissä. Ei uusia kenttiä, ei Rules-muutosta (viestit-kokoelma, Rules v3.50).
   · tmKtKlippiSheet(env) → { avaa(pid), kohde(), url(v), tyyppi(t), osa(k), pohja(i), kysymys(v), saate(v), laheta(), sulje() }
       env: { db, sid, uid, rooli, doc, t, esc, sheet (lib/tm_sheet.js), toast(msg), nayta(), pelaaja(pid), nimi(p), ika(p), voi(p), lahettajaNimi() → string|Promise<string>, verkossa(), nyt(), FV, TS, osat(p) → [{k,...}], lisaa(pid, dokit) (paikallinen lisäys Polun listaan: "näkyy heti"), virheTeksti(teksti, e), fn: { kohde, url, tyyppi, osa, pohja, kysymys, saate, laheta, sulje } (globaalien nimet) }
   Luonnos: kirjoitettu säilyy sheetin sulkemisessa (tm_sheet) — tila S on pelaajakohtainen ja poistuu vasta onnistuneen lähetyksen jälkeen.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  var ID = 'klippi_';

  function tmKtKlippiSheet(env) {
    env = env || {}; var M = _req('TM_MEDIAVIESTI', './tm_mediaviesti.js'), tilat = {}, doc = env.doc || (root && root.document), fn = env.fn || {};
    function _mvT(k) { var v = env.t ? env.t(k) : k; return (v && v !== k) ? v : (M.FI[k] != null ? M.FI[k] : k); }
    function _opts() { return { esc: env.esc, t: _mvT, runko: true, kohdeFn: fn.kohde, urlFn: fn.url, tyyppiFn: fn.tyyppi, osaFn: fn.osa, pohjaFn: fn.pohja, kysymysFn: fn.kysymys, saateFn: fn.saate, lahetaFn: fn.laheta, suljeFn: fn.sulje, modalId: 'ktKlippi' }; }
    var auki = null;   // viimeksi avattu pelaaja: sheetin käsittelijät tulevat aina avoimesta sheetistä (yksi kerrallaan, D100)
    function _aktiivinen() { return auki ? tilat[auki] || null : null; }
    function _piirra(S) {
      var r = env.sheet.runko(ID + S.pid); if (!r) return;
      r.innerHTML = M.tmMvSheetHTML(S, _opts());
    }
    function _paivita(S) {   // rekisteri + suostumuslippu vastaanottajasta (kuten Master: _mvPaivitaTila)
      var p = env.pelaaja(S.pid), ika = p ? env.ika(p) : null, vanha = S.rekisteri; S.rekisteri = M.tmMvRekisteri(ika);
      if (S.kysymysAvain && vanha && vanha !== S.rekisteri) { var i = M.tmMvPohjat(S.klippityyppi, vanha).map(function (x) { return x.avain; }).indexOf(S.kysymysAvain); S.kysymysAvain = i >= 0 ? M.tmMvPohjat(S.klippityyppi, S.rekisteri)[i].avain : null; }
      S.suostumusPuuttuu = !!(p && p.suostumusTila !== 'annettu');
    }
    function avaa(pid) {
      var p = env.pelaaja(pid); if (!p || !M || !(env.voi ? env.voi(p) : true)) return false;
      var S = tilat[pid]; auki = pid;
      if (!S) {
        S = tilat[pid] = { kohde: 'yksi', pid: pid, pelaajanNimi: env.nimi(p), joukkueNimi: p.joukkue || '', valitut: [], url: '', klippityyppi: 'onnistui', osa: '', osat: env.osat ? env.osat(p) : [], kysymysAvain: null, kysymysOma: '', saate: '', rekisteri: 'rakentaja', suostumusPuuttuu: false, tallentaa: false, pelaajatLista: [], tarjolla: { yksi: true, vainYksi: true } };
        _paivita(S);
      }
      S.tallentaa = false;
      var c = doc.createElement('div'); c.innerHTML = M.tmMvSheetHTML(S, _opts());
      var ok = env.sheet.avaa({ id: ID + pid, tyyppi: 'pitka', otsikko: _mvT('mv_otsikko'), sisalto: c.firstChild, avaaja: doc.querySelector('[data-ts-avaaja="' + ID + pid + '"]') });
      if (ok) _piirra(S);   // luonnos säilyy sheetissä (DOM); tila S:stä piirretään aina tuoreeksi (pillien valinnat eivät ole input-tapahtumia)
      return ok;
    }
    function _tee(f) { return function (a) { var S = _aktiivinen(); if (!S) return; f(S, a); }; }
    var kohde = function () { /* vain tämä pelaaja: ei vaihtoehtoja */ };
    var url = _tee(function (S, v) { S.url = String(v || ''); var el = env.sheet.runko(ID + S.pid), t = el && el.querySelector('[data-mv-tunnistus]'); if (t && S.url) { var l = M.tmMvLinkki(S.url); t.textContent = M.tmMvTunnistus(S.url, { t: _mvT }).teksti; t.style.color = l && !l.ok ? 'var(--amber)' : 'var(--ink3)'; } else if (t) t.textContent = ''; });
    var tyyppi = _tee(function (S, ty) { S.klippityyppi = ty; S.kysymysAvain = null; _piirra(S); });
    var osa = _tee(function (S, k) { S.osa = k || ''; _piirra(S); });
    var pohja = _tee(function (S, i) { var p = M.tmMvPohjat(S.klippityyppi, S.rekisteri)[i]; if (!p) return; S.kysymysAvain = p.avain; S.kysymysOma = ''; _piirra(S); });
    var kysymys = _tee(function (S, v) { S.kysymysOma = String(v || ''); if (S.kysymysOma.trim()) S.kysymysAvain = null; });
    var saate = _tee(function (S, v) { S.saate = String(v || ''); });
    function sulje() { var S = _aktiivinen(); if (S) env.sheet.sulje(ID + S.pid); }
    function laheta() {
      var S = _aktiivinen(); if (!S || S.tallentaa) return Promise.resolve({ ok: false, syy: 'ei_sheetia' });
      var p = env.pelaaja(S.pid); if (!p || (env.voi && !env.voi(p))) return Promise.resolve({ ok: false, syy: 'oikeus' });
      var k = M.tmMvSheetKysymys(S, { t: _mvT }), nyt = env.nyt ? env.nyt() : new Date();
      return Promise.resolve(env.lahettajaNimi ? env.lahettajaNimi() : '').then(function (nimi) {
        var x = M.tmMvKlippiDokumentit({ url: S.url, klippityyppi: S.klippityyppi, kysymys: k.teksti, kysymys_avain: k.avain, saate: S.saate, osa: S.osa, joukkueklippi: false, lahde: 'linkki',
          vastaanottajat: [{ pelaajaId: p.id, pelaajaNimi: env.nimi(p), ika: env.ika(p), vastaanottajaUid: (p.vastuuhenkilo && p.vastuuhenkilo.uid) || env.uid }] }, { nyt: nyt, lahettajaUid: env.uid, lahettajaNimi: nimi || '', rooli: env.rooli || 'valmentaja' });
        if (!x.ok) { env.toast(M.tmMvVirhe(x.syy, { t: _mvT })); return { ok: false, syy: x.syy }; }   // validointi ENNEN kirjoitusta; sheet jää auki
        if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.')); return { ok: false, syy: 'offline' }; }
        S.tallentaa = true;
        return Promise.resolve(env.auth ? env.auth().getIdToken(true) : null).then(function () { return M.tmMvKirjoitaDokit({ db: env.db, sid: env.sid, dokit: x.dokit, FV: env.FV, TS: env.TS, nyt: nyt }); }).then(function (kirj) {
          var lisa = M.tmMvAjastusTeksti(x.dokit[0].nakyva_alkaen, { t: _mvT }, 'mv_lahetetty_ajastettu_lisa', nyt);   // klo 21–7: kerro milloin pelaaja näkee (D62-portti ennallaan)
          env.sheet.tallennettu(ID + S.pid); delete tilat[S.pid];
          if (env.lisaa) env.lisaa(S.pid, kirj.map(function (r) { return r.dok; }));
          env.toast(_mvT('mv_lahetetty') + (lisa ? ' ' + lisa : '')); if (env.nayta) env.nayta();
          return { ok: true, n: kirj.length, ajastettu: !!lisa };
        }, function (e) { S.tallentaa = false; if (typeof console !== 'undefined') console.warn('[klippi] lähetys:', e && e.message); var tx = env.t('Tallennus epäonnistui'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx); return { ok: false, syy: (e && e.code) || 'virhe' }; });   // D53: virhe näkyy; sheet auki, syötetty säilyy
      });
    }
    return { avaa: avaa, kohde: kohde, url: url, tyyppi: tyyppi, osa: osa, pohja: pohja, kysymys: kysymys, saate: saate, laheta: laheta, sulje: sulje };
  }

  var API = { tmKtKlippiSheet: tmKtKlippiSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_KLIPPI = API;
})(typeof window !== 'undefined' ? window : this);
