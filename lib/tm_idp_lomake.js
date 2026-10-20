/* ════════════════════════════════════════════════════════════════════════
   tm_idp_lomake.js — K3b (inventaario #8, erä 75): KAUSITAVOITTEEN LOMAKE yhdestä paikasta. Masterin IDP-kortin muokkausosa (fokusvalinta, tavoitearvo, "Tavoite pelissä", pelaajan omin sanoin)
   ja sen logiikka (Ehdota, Aseta fokus, Vapaa fokus, kentät luonnokseen) on tässä; Master kutsuu samoja funktioita (DOM ennallaan, testattu) ja uusi Kehitystyöpöytä-sivu avaa saman lomakkeen sheetinä (D100).
   Moottori on lib/tm_idp.js (idpEhdotaTavoite, idpKohdeKandidaatti, idpRakennaTavoite, idpTavoitteetYhdista …) — tässä EI toista tavoitelogiikkaa. Ei uusia Firestore-kenttiä; sama idp_kausi/{vuosi}.tavoitteet[] + pelaajan pikakentät kuin Masterissa.
   Dual-export: module.exports || window.TM_IDP_LOMAKE. Tekstit c.t(avain):n läpi (FI-oletukset FI; Master-kääre antaa masterT(FI[avain]) → Masterin nykyiset tekstit ja sv ennallaan).
   · tmIdpFokusValintaHTML(p, f, S, c)   → fokusvalintapaneeli (teema + kohde + vapaa fokus). S = { teema, valitseFokus }; c: { esc, t, src:{tmTeemat,tmTeemaKohteet,tmTaksonomiaByAvain,taksonomia}, fn:{teema,fokus,vapaa} (globaalien funktioiden nimet) }
   · tmIdpMuokkausKentatHTML(t, c)       → tavoitearvo (vain mitattavalle mittarille, D104: ei oletusarvoa lukuna) + "Tavoite pelissä"
   · tmIdpAaniMuokkausHTML(t, c)         → pelaajan omin sanoin -kenttä (muokkaus)
   · tmIdpOpts(p, idx, c)                → yksi opts-lähde moottorille (c.ikaSp(p) → {ika, sp}; funktiot globaaleista tai c.g)
   · tmIdpEhdota(p, tila, c)             → null | { tavoite, ehdotusIdx, kandN, valitseFokus }; tila = { tavoite, ehdotusIdx }
   · tmIdpAsetaFokus(p, avain, kuvaus, c) · tmIdpVapaaFokus(p, nimi, kuvaus, dim, c) → tavoite | null
   · tmIdpLueKentat(doc) → { aani, kuvaus, tavoitearvo } (null = kenttää ei ole) · tmIdpKaytaKentat(t, k, uusiStatus, nyt) → t (kentät + aktivointi: hyvaksytty, omistaja)
   · tmIdpLahtoTaso(t) → { lahto:{arvo,yks,pvm}|null, tavoite:{arvo,yks}|null, mittari } — D104: lähtötaso VAIN jos mitattu; oletus taso+1 ei koskaan lukuna
   · tmIdpLataaKausi(d) → Promise<{ tavoite, ankkurit }> (Masterin _mIdpLataa-valinta: kuluva vuosi, vuodenvaihteessa edellinen; luonnos ja voimassa oleva eriteltynä) · tmIdpKirjoitaKausi(d) → Promise<{ pk, vuosi, ankkurit }> (transaktio: luku → yhdistä → kirjoitus; A3 vuodenvaihde)
   · tmIdpLomakeSheetHTML(S, c) / tmIdpLomakeCss() / tmIdpLomakeSheet(env) → sheet uudelle sivulle { avaa(pid), valitseTeema, valitseKohde, vapaa, ehdota, tallenna(status), sulje }
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    kidp_vaihda_fokus: 'Vaihda fokus (valmentaja omistaa oman joukkueen tavoitteen)', kidp_palloliitto: '🔵 Palloliitto-arvio', kidp_havaittu_1_5: '(havaittu 1–5)', kidp_tm_mittaus: '🟢 TM-mittaus', kidp_testeista: '(testeistä)',
    kidp_vain_yksi: 'Vain yksi datapohjainen kohde — valitse fokus itse alta.', kidp_valitse_kohde: 'Valitse kohde…', kidp_vapaa_ph: '…tai kirjoita fokus vapaana', kidp_aseta_vapaa: 'Aseta vapaa',
    kidp_tavoitearvo: 'Tavoitearvo (', kidp_tavoite_pelissa: 'Tavoite pelissä (vapaa teksti)', kidp_tavoite_pelissa_ph: 'Mitä konkreettisesti tavoitellaan ottelussa…', kidp_pelaajan_aani: 'Pelaajan ääni (omistajuus)', kidp_aani_ph: 'Pelaajan oma tavoite omin sanoin…',
    kidp_ehdota: 'Ehdota datasta', kidp_ehdota_seuraava: 'Ehdota seuraava', kidp_ei_ehdotusta: 'Ei kelvollista kehityskohdetta ehdotukseen. Valitse fokus itse.', kidp_ei_tavoitetta: 'Kauden tavoitetta ei ole vielä. Ehdota datasta tai valitse fokus itse.',
    kidp_fokus: 'Fokus', kidp_tila_ehdotettu: 'Ehdotettu — ei vielä käytössä', kidp_tila_aktiivinen: 'Aktiivinen', kidp_mittari_taso: 'Mittari: valmentajan havainto, ei lukuarvoa', kidp_mittari_vapaa: 'Mittari: ei mittaria (vapaa fokus)', kidp_mittari_yks: 'Mittari: {yks}',
    kidp_henkilokunta: 'Mittari ja luvut ovat henkilökunnan tietoa.', kidp_aktivoi: 'Aktivoi tavoite', kidp_tallenna: 'Tallenna',
    kidp_aktivoitu: 'Kauden tavoite aktivoitu ✓', kidp_tallennettu: 'Kauden tavoite tallennettu ✓', kidp_virhe: 'Tavoitteen tallennus epäonnistui', kidp_valitse_ensin: 'Valitse ensin fokus.', kidp_kirjoita_nimi: 'Kirjoita fokuksen nimi.',
    kidp_lataa: 'Ladataan tavoitetta…', kidp_virhe_lataus: 'Tavoitetta ei saatu ladattua. Yritä uudelleen hetken päästä.', kidp_ei_oikeutta: 'Ei oikeutta muokata tämän pelaajan tavoitetta.'
  };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _polkuFi() { try { var P = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_kt_polku.js') : (root && root.TM_KT_POLKU); return (P && P.FI) || {}; } catch (e) { return {}; } }
  function _txt(c, k) { var v = (c && typeof c.t === 'function') ? c.t(k) : k; if (v && v !== k) return v; return FI[k] != null ? FI[k] : (_polkuFi()[k] != null ? _polkuFi()[k] : k); }
  function _fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function _pvm(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? (+m[3]) + '.' + (+m[2]) + '.' : String(iso || ''); }
  function _idp() { return (root && typeof root.idpEhdotaTavoite === 'function') ? root : require('./tm_idp.js'); }
  function _tax() { return (root && typeof root.tmTeemat === 'function') ? root : (typeof require === 'function' ? require('./tm_arviointi_taksonomia.js') : {}); }

  /* ── Renderöinti (sama merkintä kuin Masterin entiset _mIdpFokusValintaHTML + muokkauskentät; kutsuja antaa c.esc = oma _mEsc) ── */
  function tmIdpFokusValintaHTML(p, f, S, c) {
    c = c || {}; S = S || {}; var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, src = c.src || {}, fn = c.fn || {}, pid = esc(p.id);
    var tmTeemat = src.tmTeemat, tmTeemaKohteet = src.tmTeemaKohteet; if (typeof tmTeemat !== 'function' || typeof tmTeemaKohteet !== 'function') return '';
    var taks = src.taksonomia || null, teemat = tmTeemat(taks); if (!teemat.length) return '';
    var teema = S.teema;
    if (!teema && f && f.alue) { var it = (typeof src.tmTaksonomiaByAvain === 'function') ? src.tmTaksonomiaByAvain(f.alue) : null; if (it) teema = it.dim + '_' + it.kategoria; }
    if (!teema || !teemat.some(function (x) { return x.avain === teema; })) teema = teemat[0].avain;
    var kohteet = tmTeemaKohteet(teema, taks), hav = p.arviointi_havaittu || {};
    var h = '<div class="jsp-kt-fokval' + (S.valitseFokus ? ' korosta' : '') + '">';
    h += '<div class="jsp-kt-bt">' + t('kidp_vaihda_fokus') + '</div>';
    h += '<div style="font-size:9.5px;color:var(--ink3);margin:-2px 0 6px;line-height:1.5"><span style="color:var(--blue)">' + t('kidp_palloliitto') + '</span> ' + t('kidp_havaittu_1_5') + ' · <span style="color:var(--teal)">' + t('kidp_tm_mittaus') + '</span> ' + t('kidp_testeista') + '</div>';
    if (S.valitseFokus) h += '<div class="jsp-kt-vihje">' + t('kidp_vain_yksi') + '</div>';
    h += '<div class="jsp-kt-fokrow">';
    h += '<select class="jsp-arv-select" onclick="event.stopPropagation()" onchange="' + fn.teema + '(\'' + pid + '\',this.value)">'
      + teemat.map(function (x) { return '<option value="' + x.avain + '"' + (x.avain === teema ? ' selected' : '') + '>' + esc(x.nimi) + '</option>'; }).join('') + '</select>';
    h += '<select class="jsp-arv-select" onclick="event.stopPropagation()" onchange="if(this.value)' + fn.fokus + '(\'' + pid + '\',this.value)">'
      + '<option value="">' + t('kidp_valitse_kohde') + '</option>'
      + kohteet.map(function (i) {
          var merkki = i.mitattavissa ? '🟢' : ((hav[i.avain] != null) ? '🔵' : '○'), sel = (f && f.alue === i.avain) ? ' selected' : '';
          return '<option value="' + i.avain + '"' + sel + '>' + merkki + ' ' + esc(i.nimi_fi) + '</option>';
        }).join('') + '</select>';
    h += '</div>';
    h += '<div class="jsp-kt-fokrow" style="margin-top:6px">'
      + '<input id="_mktVapaaFokus" class="jsp-kt-vapaainp" placeholder="' + t('kidp_vapaa_ph') + '" onclick="event.stopPropagation()" value="' + esc((f && f.vapaa) ? (f.nimi || '') : '') + '">'
      + '<button class="jsp-kt-btn" onclick="event.stopPropagation();' + fn.vapaa + '(\'' + pid + '\')">' + t('kidp_aseta_vapaa') + '</button></div>';
    h += '</div>';
    return h;
  }
  function tmIdpMuokkausKentatHTML(t, c) {
    c = c || {}; var esc = c.esc || _esc, tx = function (k) { return _txt(c, k); }, mit = (t && t.mittari) || {}, yks = mit.yksikko || '', tv = t ? t.tavoitearvo : null, h = '';
    if (yks !== 'taso' && yks !== 'vapaa') {
      h += '<div class="jsp-kt-edit"><label>' + tx('kidp_tavoitearvo') + esc(yks) + ')</label><input id="_mktTavArvo" type="number" step="0.01" value="' + (tv != null ? tv : '') + '"></div>';
    }
    h += '<div class="jsp-kt-edit"><label>' + tx('kidp_tavoite_pelissa') + '</label>'
      + '<textarea id="_mktTavKuvaus" class="jsp-kt-aani" placeholder="' + tx('kidp_tavoite_pelissa_ph') + '" onclick="event.stopPropagation()">' + esc((t && t.kuvaus) || '') + '</textarea></div>';
    return h;
  }
  function tmIdpAaniMuokkausHTML(t, c) {
    c = c || {}; var esc = c.esc || _esc, tx = function (k) { return _txt(c, k); };
    return '<div class="jsp-kt-box" style="border-color:rgba(40,176,144,.3);margin-top:10px"><div class="jsp-kt-bt">' + tx('kidp_pelaajan_aani') + '</div>'
      + '<textarea id="_mktTavAani" class="jsp-kt-aani" placeholder="' + tx('kidp_aani_ph') + '" onclick="event.stopPropagation()">' + esc((t && t.pelaajan_tavoite) || '') + '</textarea></div>';
  }

  /* ── Logiikka (sama kuin Masterin entiset _mIdp*-funktiot; Master asettaa tuloksen omille kentilleen) ── */
  function tmIdpOpts(p, ehdotusIdx, c) {
    c = c || {}; var isp = (typeof c.ikaSp === 'function') ? c.ikaSp(p) : { ika: null, sp: 'M' }; isp = isp || { ika: null, sp: 'M' };
    var spMN = isp.sp || 'M', spPT = (spMN === 'N') ? 'T' : 'P';
    var g = function (n) { if (c.g && typeof c.g[n] === 'function') return c.g[n]; return (root && typeof root[n] === 'function') ? root[n] : undefined; };
    return {
      tmTaksonomiaByAvain: g('tmTaksonomiaByAvain'), tmAdarHavaittu: g('tmAdarHavaittu'),
      laskeD1Osaindeksit: g('laskeD1Osaindeksit'), eerikkilaNormiarvo: g('eerikkilaNormiarvo'),
      hhSeuraavaTaso: g('hhSeuraavaTaso'), tkSekuntibudjetti: g('tkSekuntibudjetti'),
      tkLajiViite: g('tkLajiViite'), tkLajiTaso: g('tkLajiTaso'),
      tklajiAvain: (typeof g('tmMitattuMappaus') === 'function') ? g('tmMitattuMappaus')().tklaji : null,
      ika: isp.ika, sp: spMN, spTk: spPT, nyt: (c.nyt ? c.nyt() : new Date()), ehdotusIdx: (ehdotusIdx || 0)
    };
  }
  function tmIdpEhdota(p, tila, c) {
    var I = _idp(); if (!p || typeof I.idpEhdotaTavoite !== 'function') return null; tila = tila || {};
    var n = (typeof I.idpKandidaatitJarjestetty === 'function') ? I.idpKandidaatitJarjestetty(p, tmIdpOpts(p, 0, c)).length : 1, idx = tila.ehdotusIdx || 0;
    if (tila.tavoite && n > 1) idx = (idx + 1) % n; else if (!tila.tavoite) idx = 0;
    var t = I.idpEhdotaTavoite(p, tmIdpOpts(p, idx, c)); if (!t) return null;
    return { tavoite: t, ehdotusIdx: idx, kandN: n, valitseFokus: n <= 1 };
  }
  function tmIdpAsetaFokus(p, avain, kuvaus, c) {
    var I = _idp(); if (!p || !avain || typeof I.idpKohdeKandidaatti !== 'function') return null;
    var opts = tmIdpOpts(p, 0, c), t = I.idpRakennaTavoite(p, I.idpKohdeKandidaatti(p, avain, opts), opts); if (!t) return null;
    if (kuvaus) t.kuvaus = kuvaus; return t;
  }
  function tmIdpVapaaFokus(p, nimi, kuvaus, dim, c) {
    var I = _idp(); nimi = String(nimi || '').trim(); if (!p || !nimi) return null;
    var opts = tmIdpOpts(p, 0, c), t = I.idpRakennaTavoite(p, { avain: 'vapaa', dim: dim || null, nimi: nimi, lahde: 'valmentaja', tyyppi: 'vapaa', vapaa: true, mittariTestId: null, mittariYks: 'vapaa', mittariSuunta: null }, opts); if (!t) return null;
    if (kuvaus) t.kuvaus = kuvaus; return t;
  }
  function tmIdpLueKentat(doc) {
    var v = function (id) { var el = doc && doc.getElementById ? doc.getElementById(id) : null; return el ? el.value : null; }, a = v('_mktTavAani'), k = v('_mktTavKuvaus'), tv = v('_mktTavArvo');
    return { aani: a == null ? null : a.trim(), kuvaus: k == null ? null : k.trim(), tavoitearvo: (tv != null && tv !== '' && !isNaN(tv)) ? Number(tv) : null };
  }
  function tmIdpKaytaKentat(t, k, uusiStatus, nyt) {
    if (!t) return t; k = k || {};
    if (k.aani != null) t.pelaajan_tavoite = k.aani;
    if (k.kuvaus != null) t.kuvaus = k.kuvaus;
    if (k.tavoitearvo != null) t.tavoitearvo = k.tavoitearvo;
    if (uusiStatus) t.status = uusiStatus;
    if (uusiStatus === 'aktiivinen') { t.hyvaksytty = (nyt || new Date()).toISOString(); t.omistaja = 'yhdessa'; }
    return t;
  }
  /* D104: lähtötaso näytetään vain jos se on MITATTU (yksikkö ≠ taso/vapaa, arvo ja päivä olemassa). Oletus taso+1 (tavoitearvo havaintomittarilla) ei koskaan näy lukuna. */
  function tmIdpLahtoTaso(t) {
    if (!t) return null; var mit = t.mittari || {}, yks = mit.yksikko || '', la = t.lahto || {}, mitattu = !!yks && yks !== 'taso' && yks !== 'vapaa' && la.arvo != null && !!la.pvm;
    return { mittari: yks === 'vapaa' ? 'vapaa' : (yks === 'taso' ? 'taso' : (yks || null)), lahto: mitattu ? { arvo: la.arvo, yks: yks, pvm: la.pvm } : null,
      tavoite: (mitattu && t.tavoitearvo != null && isFinite(Number(t.tavoitearvo))) ? { arvo: t.tavoitearvo, yks: yks } : null };
  }

  /* ── Lataus + kirjoitus (sama idp_kausi/{vuosi}-malli ja A3-vuodenvaihde kuin Masterin _mIdpLataa/_mIdpTallennaDok) ── */
  function _kausiCol(d) { return d.db.collection('seurat').doc(d.sid).collection('pelaajat').doc(d.pid).collection('idp_kausi'); }
  function tmIdpLataaKausi(d) {
    var I = _idp(), nyt = d.nyt || new Date(), vuosi = I.idpKausivuosi(nyt), ed = String(Number(vuosi) - 1), col = _kausiCol(d);
    return col.doc(vuosi).get().then(function (s) {
      var arr = s.exists ? (s.data() || {}).tavoitteet : null;
      var edP = !I.idpJaaVoimassaJaEhdotus(arr).tavoite ? col.doc(ed).get().then(function (se) { return (se.exists ? (se.data() || {}) : {}).tavoitteet || null; }, function () { return null; }) : Promise.resolve(null);
      return edP.then(function (edArr) {
        var val = I.idpValitseKahdestaVuodesta(arr, vuosi, edArr, ed), tavoite = null, ank = {};
        if (val.tavoite || val.luonnos || (arr && arr.length)) {
          tavoite = val.luonnos || val.tavoite || (arr && arr.length ? arr[arr.length - 1] : null);
          ank._idpVuosi = val.tavoiteVuosi || vuosi; ank._idpVuosiLuotu = val.tavoite && val.tavoite.luotu;
          if (val.luonnos) { ank._idpLuonnosVuosi = val.luonnosVuosi; ank._idpLuonnosLuotu = val.luonnos.luotu; }
        }
        return { tavoite: tavoite ? JSON.parse(JSON.stringify(tavoite)) : null, voimassa: val.tavoite || null, ankkurit: ank };
      });
    });
  }
  /* d: { db, sid, pid, t, ankkurit, nyt? }. FAIL-CLOSED: vanhentunut tm_idp.js → heitto ennen kirjoitusta. Pikakentät palautetaan; kutsuja asettaa ne muistiin VASTA onnistuneen kirjoituksen jälkeen. */
  function tmIdpKirjoitaKausi(d) {
    var I = _idp(), t = d.t; if (!t) return Promise.reject(new Error('tavoite_puuttuu'));
    if (typeof I.idpTavoitteetYhdista !== 'function' || typeof I.idpTallennusVuosi !== 'function' || typeof I.idpMerkitseVaihdetuksi !== 'function') return Promise.reject(new Error('tm_idp_vanhentunut'));
    var nyt = d.nyt || new Date(), ank = d.ankkurit || {}, pk = I.idpPikakentat(t), vuosi = I.idpTallennusVuosi(ank, t, nyt);
    var ref = d.db.collection('seurat').doc(d.sid).collection('pelaajat').doc(d.pid), kausiRef = ref.collection('idp_kausi').doc(vuosi);
    var toinenVuosi = (ank._idpVuosi && ank._idpVuosi !== vuosi && ank._idpVuosiLuotu && ank._idpVuosiLuotu !== t.luotu && I.idpOnVoimassa(t)) ? ank._idpVuosi : null, toinenRef = toinenVuosi ? ref.collection('idp_kausi').doc(toinenVuosi) : null;
    return d.db.runTransaction(function (tx) {
      return tx.get(kausiRef).then(function (s) {
        return (toinenRef ? tx.get(toinenRef) : Promise.resolve(null)).then(function (s2) {   // KAIKKI LUKEMISET ENNEN KIRJOITUKSIA
          var dd = s.exists ? (s.data() || {}) : {}, yhd = I.idpTavoitteetYhdista(Array.isArray(dd.tavoitteet) ? dd.tavoitteet : [], t), toinenYhd = null;
          if (s2 && s2.exists) { var d2 = s2.data() || {}; toinenYhd = I.idpMerkitseVaihdetuksi(Array.isArray(d2.tavoitteet) ? d2.tavoitteet : [], ank._idpVuosiLuotu, nyt); }
          tx.set(kausiRef, { tavoitteet: yhd, paivitetty: nyt.toISOString() }, { merge: true });
          if (toinenYhd) tx.set(toinenRef, { tavoitteet: toinenYhd, paivitetty: nyt.toISOString() }, { merge: true });
        });
      });
    }).then(function () {
      return ref.set({ idp_tila: pk.idp_tila, idp_edistyma: pk.idp_edistyma || null, idp_fokus: pk.idp_fokus || null, idp_viim_review: pk.idp_viim_review || null, idp_lahde: pk.idp_lahde || null }, { merge: true });
    }).then(function () {
      var uusi = {}; for (var k in ank) if (Object.prototype.hasOwnProperty.call(ank, k)) uusi[k] = ank[k];
      if (I.idpOnVoimassa(t)) { uusi._idpVuosi = vuosi; uusi._idpVuosiLuotu = t.luotu; } else { uusi._idpLuonnosVuosi = vuosi; uusi._idpLuonnosLuotu = t.luotu; }
      return { pk: pk, vuosi: vuosi, ankkurit: uusi };
    });
  }

  /* ── Sheet (uusi sivu) ── */
  function tmIdpLomakeCss() {
    return ['.kv-wrap{display:grid;gap:12px;font-size:var(--fs-body,14px);color:var(--ink)}.kv-wrap .jsp-kt-bt{font-size:var(--fs-meta,12.5px);color:var(--ink2);margin-bottom:4px}',
      '.kv-wrap .jsp-kt-fokval,.kv-wrap .jsp-kt-box{padding:10px 12px;border:1px solid var(--line2,var(--border));border-radius:10px;background:transparent}.kv-wrap .jsp-kt-fokval.korosta{border-color:var(--teal)}',
      '.kv-wrap .jsp-kt-fokrow{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.kv-wrap .jsp-arv-select,.kv-wrap .jsp-kt-vapaainp{flex:1 1 140px;min-height:44px;font:inherit;color:var(--ink);background:var(--bg2,var(--card));border:1px solid var(--line2,var(--border));border-radius:8px;padding:6px 10px}',
      '.kv-wrap .jsp-kt-fokval div[style*="font-size:9.5px"]{font-size:var(--fs-meta,12.5px)!important}',
      '.kv-wrap .jsp-kt-vihje{font-size:var(--fs-meta,12.5px);color:var(--teal);margin-top:4px}.kv-wrap .jsp-kt-edit{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.kv-wrap .jsp-kt-edit label{font-size:var(--fs-meta,12.5px);color:var(--ink2);flex:1 1 100%}',
      '.kv-wrap .jsp-kt-edit input{min-height:44px;width:120px;font:inherit;color:var(--ink);background:var(--bg2,var(--card));border:1px solid var(--line2,var(--border));border-radius:8px;padding:6px 10px}',
      '.kv-wrap .jsp-kt-aani{width:100%;min-height:64px;font:inherit;color:var(--ink);background:var(--bg2,var(--card));border:1px solid var(--line2,var(--border));border-radius:8px;padding:8px 10px;resize:vertical;box-sizing:border-box}',
      '.kv-wrap .jsp-kt-btn{min-height:44px;font:inherit;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;color:var(--ink);background:transparent;border:1px solid var(--line2,var(--border))}',
      '.kv-tila{display:flex;gap:6px 10px;flex-wrap:wrap;align-items:center}.kv-chip{border:1px solid var(--line2,var(--border));border-radius:999px;padding:2px 10px;font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kv-chip[data-kv-tila="aktiivinen"]{color:var(--teal);border-color:var(--teal)}',
      '.kv-rivi{color:var(--ink2)}.kv-varo{color:var(--amber);font-size:var(--fs-meta,12.5px)}.kv-toim{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.kv-toim .kt-btn{min-height:44px}.kv-virhe{color:var(--amber)}'].join('\n');
  }
  /* S = { lataa, virhe, tavoite|null, teema, valitseFokus, kandN, tallentaa, p } ; c: { esc, t, src, fn:{teema,fokus,vapaa}, ehdotaFn, tallennaFn, suljeFn } */
  function tmIdpLomakeSheetHTML(S, c) {
    S = S || {}; c = c || {}; var esc = c.esc || _esc, tx = function (k) { return esc(_txt(c, k)); }, t = S.tavoite, p = S.p || {};
    if (S.lataa) return '<div class="kv-wrap" data-kv-sheet data-kv-tila="lataa"><div class="kv-rivi">' + tx('kidp_lataa') + '</div></div>';
    if (S.virhe) return '<div class="kv-wrap" data-kv-sheet data-kv-tila="virhe"><div class="kv-virhe">' + tx('kidp_virhe_lataus') + '</div></div>';
    var h = '<div class="kv-wrap" data-kv-sheet data-kv-tila="valmis">';
    if (!t) h += '<div class="kv-rivi" data-kv-ei-tavoitetta>' + tx('kidp_ei_tavoitetta') + '</div>';
    else {
      var st = t.status || 'ehdotettu', f = t.fokus || {}, L = tmIdpLahtoTaso(t);
      h += '<div class="kv-tila"><span class="kv-chip" data-kv-tila="' + esc(st) + '">' + tx(st === 'ehdotettu' ? 'kidp_tila_ehdotettu' : 'kidp_tila_aktiivinen') + '</span>'
        + '<span class="kv-chip" data-kv-fokus>' + tx('kidp_fokus') + ': <b>' + esc(f.nimi || f.alue || '—') + '</b>' + (f.dim ? ' · ' + esc(f.dim) : '') + '</span></div>';
      h += '<div class="kv-rivi" data-kv-mittari>' + esc(L.mittari === 'taso' ? _txt(c, 'kidp_mittari_taso') : L.mittari === 'vapaa' ? _txt(c, 'kidp_mittari_vapaa') : _fmt(_txt(c, 'kidp_mittari_yks'), { yks: L.mittari || '' })) + '</div>';
      h += '<div class="kv-rivi" data-kv-lahto>' + (L.lahto ? esc(_fmt(_txt(c, 'ktp_lahto_mitattu'), { arvo: L.lahto.arvo, yks: L.lahto.yks, pvm: _pvm(L.lahto.pvm) })) : (L.mittari && L.mittari !== 'vapaa' && L.mittari !== 'taso' ? esc(_txt(c, 'ktp_lahto_ei')) : '')) + '</div>';
      if (t.perustelu && t.perustelu.kypsyysvaroitus) h += '<div class="kv-varo" data-kv-varoitus>⚠️ ' + esc(t.perustelu.kypsyysvaroitus) + '</div>';
    }
    h += tmIdpFokusValintaHTML(p, t ? t.fokus : null, { teema: S.teema, valitseFokus: S.valitseFokus }, c);
    if (t) {
      h += tmIdpMuokkausKentatHTML(t, c) + tmIdpAaniMuokkausHTML(t, c);
      h += '<div class="kv-rivi" data-kv-henkilokunta>' + tx('kidp_henkilokunta') + '</div>';
    }
    h += '<div class="kv-toim"><button type="button" class="jsp-kt-btn" data-kv-ehdota onclick="' + esc(c.ehdotaFn + '()') + '">' + tx(t && S.kandN > 1 ? 'kidp_ehdota_seuraava' : 'kidp_ehdota') + '</button>';
    if (t) h += '<button type="button" class="kt-btn" data-kv-tallenna onclick="' + esc(c.tallennaFn + '()') + '"' + (S.tallentaa ? ' aria-disabled="true" style="opacity:.55"' : '') + '>' + tx((t.status || 'ehdotettu') === 'ehdotettu' ? 'kidp_aktivoi' : 'kidp_tallenna') + '</button>';
    return h + '</div></div>';
  }
  /* env: { db, sid, uid, doc, t, esc, sheet, toast, nayta, pelaaja(pid), voi(p), ikaSp(p), src, nyt(), verkossa(), auth(), virheTeksti(t,e), paivita(pid, tavoite|null) (Polun Kausi-rivi) } */
  function tmIdpLomakeSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), tila = {}, ID = 'kausitavoite', id = function (pid) { return ID + '_' + pid; };
    var cc = function () { return { esc: env.esc, t: env.t, src: env.src, ikaSp: env.ikaSp, nyt: env.nyt, fn: { teema: '_ktKvTeema', fokus: '_ktKvKohde', vapaa: '_ktKvVapaa' }, ehdotaFn: '_ktKvEhdota', tallennaFn: '_ktKvTallenna' }; };
    function _aktiivinen() { var a = env.sheet.avoinna(); return a && a.indexOf(ID + '_') === 0 ? a.slice(ID.length + 1) : null; }
    function _piirra(pid) { var x = tila[pid]; if (!x) return; x.cont.innerHTML = tmIdpLomakeSheetHTML(x.S, cc()); if (root && root.Event && x.cont.dispatchEvent) x.cont.dispatchEvent(new root.Event('input', { bubbles: true })); }
    function avaa(pid) {
      var p = env.pelaaja(pid); if (!p || !env.voi(p)) return Promise.resolve(false);
      var otsikko = function (S) { return _txt(env, S && S.tavoite && S.tavoite.status === 'aktiivinen' ? 'ktp_muokkaa_kausitavoitetta' : 'ktp_aseta_kausitavoite'); };
      if (env.sheet.avoinna() === id(pid)) return Promise.resolve(true);
      if (tila[pid] && env.sheet.luonnos(id(pid))) { env.sheet.avaa({ id: id(pid), tyyppi: 'pitka', otsikko: otsikko(tila[pid].S) }); return Promise.resolve(true); }
      var cont = doc.createElement('div'), S = { p: p, lataa: true, virhe: false, tavoite: null, teema: null, valitseFokus: false, kandN: null, ehdotusIdx: 0, tallentaa: false, ankkurit: {} };
      tila[pid] = { S: S, cont: cont }; cont.innerHTML = tmIdpLomakeSheetHTML(S, cc());
      var auki = Promise.resolve(env.sheet.avaa({ id: id(pid), tyyppi: 'pitka', otsikko: _txt(env, 'ktp_aseta_kausitavoite'), sisalto: cont }));
      var lataus = (!env.sid || !env.db) ? Promise.resolve({ tavoite: null, ankkurit: {} }) : tmIdpLataaKausi({ db: env.db, sid: env.sid, pid: pid, nyt: env.nyt ? env.nyt() : new Date() });
      lataus.then(function (r) { S.lataa = false; S.tavoite = r.tavoite; S.ankkurit = r.ankkurit || {}; _piirra(pid); }, function (e) { if (typeof console !== 'undefined') console.warn('[kausitavoite] lataus:', e && e.message); S.lataa = false; S.virhe = true; _piirra(pid); });
      return auki.then(function () { return true; });
    }
    function _x() { var pid = _aktiivinen(), x = pid && tila[pid]; return x && !x.S.lataa && !x.S.virhe ? { pid: pid, x: x } : null; }
    function _kentat(o) { return tmIdpLueKentat({ getElementById: function (i) { return o.x.cont.querySelector('#' + i); } }); }
    function teema(avain) { var o = _x(); if (!o) return; if (o.x.S.tavoite) tmIdpKaytaKentat(o.x.S.tavoite, _kentat(o), null); o.x.S.teema = avain; _piirra(o.pid); }
    function kohde(avain) {
      var o = _x(); if (!o) return; var k = _kentat(o), t = tmIdpAsetaFokus(o.x.S.p, avain, k.kuvaus, cc()); if (!t) { env.toast(_txt(env, 'kidp_ei_ehdotusta'), 'error'); return; }
      tmIdpKaytaKentat(t, { aani: k.aani }, null); o.x.S.tavoite = t; o.x.S.valitseFokus = false; _piirra(o.pid);
    }
    function vapaa() {
      var o = _x(); if (!o) return; var k = _kentat(o), el = o.x.cont.querySelector('#_mktVapaaFokus'), nimi = el ? el.value.trim() : '';
      if (!nimi) { env.toast(_txt(env, 'kidp_kirjoita_nimi'), 'error'); return; }
      var t = tmIdpVapaaFokus(o.x.S.p, nimi, k.kuvaus, (o.x.S.tavoite && o.x.S.tavoite.fokus && o.x.S.tavoite.fokus.dim) || null, cc()); if (!t) return;
      tmIdpKaytaKentat(t, { aani: k.aani }, null); o.x.S.tavoite = t; o.x.S.valitseFokus = false; _piirra(o.pid);
    }
    function ehdota() {
      var o = _x(); if (!o) return; var S = o.x.S, k = _kentat(o), r = tmIdpEhdota(S.p, { tavoite: S.tavoite, ehdotusIdx: S.ehdotusIdx }, cc());
      if (!r) { env.toast(_txt(env, 'kidp_ei_ehdotusta'), 'error'); return; }
      tmIdpKaytaKentat(r.tavoite, { aani: k.aani }, null); S.tavoite = r.tavoite; S.ehdotusIdx = r.ehdotusIdx; S.kandN = r.kandN; S.valitseFokus = r.valitseFokus; _piirra(o.pid);
    }
    function sulje() { var pid = _aktiivinen(); if (pid) env.sheet.sulje(id(pid)); }
    function tallenna() {
      var o = _x(); if (!o || o.x.S.tallentaa) return Promise.resolve({ ok: false, syy: 'ei_lomaketta' });
      var S = o.x.S, p = S.p, pid = o.pid; if (!S.tavoite) { env.toast(_txt(env, 'kidp_valitse_ensin'), 'error'); return Promise.resolve({ ok: false, syy: 'ei_fokusta' }); }
      if (!env.voi(p)) { env.toast(_txt(env, 'kidp_ei_oikeutta'), 'error'); return Promise.resolve({ ok: false, syy: 'oikeus' }); }
      if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.'), 'error'); return Promise.resolve({ ok: false, syy: 'offline' }); }
      var nyt = env.nyt ? env.nyt() : new Date(), uusi = (S.tavoite.status || 'ehdotettu') === 'ehdotettu' ? 'aktiivinen' : null, kopio = JSON.parse(JSON.stringify(S.tavoite));
      tmIdpKaytaKentat(kopio, _kentat(o), uusi, nyt);
      var valmis = function (r) {
        var pk = r ? r.pk : _idp().idpPikakentat(kopio);
        p.idp_tila = pk.idp_tila; p.idp_edistyma = pk.idp_edistyma; p.idp_fokus = pk.idp_fokus; p.idp_viim_review = pk.idp_viim_review; p.idp_lahde = pk.idp_lahde;
        env.sheet.tallennettu(id(pid)); delete tila[pid]; if (typeof env.paivita === 'function') env.paivita(pid, kopio); if (typeof env.nayta === 'function') env.nayta();
        env.toast(_txt(env, uusi ? 'kidp_aktivoitu' : 'kidp_tallennettu'), 'ok'); return { ok: true, tavoite: kopio };
      };
      if (!env.sid || !env.db) return Promise.resolve(valmis(null));   // demo
      S.tallentaa = true;
      return Promise.resolve().then(function () { var cu = env.auth ? env.auth() : null; return cu ? cu.getIdToken(true) : null; })
        .then(function () { return tmIdpKirjoitaKausi({ db: env.db, sid: env.sid, pid: pid, t: kopio, ankkurit: S.ankkurit, nyt: nyt }); })
        .then(valmis)
        .catch(function (e) { S.tallentaa = false; if (typeof console !== 'undefined') console.warn('[kausitavoite]', e && e.message); var tx = _txt(env, 'kidp_virhe'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx, 'error'); _piirra(pid); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });
    }
    return { avaa: avaa, teema: teema, kohde: kohde, vapaa: vapaa, ehdota: ehdota, tallenna: tallenna, sulje: sulje };
  }
  var API = { FI: FI, tmIdpFokusValintaHTML: tmIdpFokusValintaHTML, tmIdpMuokkausKentatHTML: tmIdpMuokkausKentatHTML, tmIdpAaniMuokkausHTML: tmIdpAaniMuokkausHTML, tmIdpOpts: tmIdpOpts, tmIdpEhdota: tmIdpEhdota, tmIdpAsetaFokus: tmIdpAsetaFokus, tmIdpVapaaFokus: tmIdpVapaaFokus,
    tmIdpLueKentat: tmIdpLueKentat, tmIdpKaytaKentat: tmIdpKaytaKentat, tmIdpLahtoTaso: tmIdpLahtoTaso, tmIdpLataaKausi: tmIdpLataaKausi, tmIdpKirjoitaKausi: tmIdpKirjoitaKausi, tmIdpLomakeCss: tmIdpLomakeCss, tmIdpLomakeSheetHTML: tmIdpLomakeSheetHTML, tmIdpLomakeSheet: tmIdpLomakeSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_IDP_LOMAKE = API;
})(typeof window !== 'undefined' ? window : this);
