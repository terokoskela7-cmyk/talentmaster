/* ════════════════════════════════════════════════════════════════════════
   tm_kt_polku.js — Kehitystyöpöytä 22 · B4a: Polku-välilehti uudella sivulla (docs/design/idp-v2/22_kehitystyopoyta_kayttettavyys.html osio 2; brief .briefit/CODE_BRIEF_22_B4_POLKU.md).
   Jana: Kausi → Jakso nyt (osat, klipit, toiminnot). B4b lisää Tämä viikko · Pelaajan ääni · Historia. PURE (db injektoidaan lataajille); ei uusia Firestore-kenttiä.
   · tmKtPolkuLataaKausi(d)            → Promise<tavoite|null>: idp_kausi/{vuosi}-dokit (kuluva + edellinen vuodenvaihteessa), VOIMASSA oleva tavoite (lib/tm_idp.js); d: { db, sid, pid, nyt? }
   · tmKtPolkuKausi(tavoite)           → { nimi, omin, asetettu, kausi, lahto:{arvo,yks,pvm}|null, tavoite:{arvo,yks}|null } | null — lähtötaso VAIN jos mitattu (D104): yksikkö ≠ taso/vapaa, arvo ja päivä olemassa; oletus taso+1 ei koskaan lukuna
   · tmKtPolkuKlipit(dokit, jf, ctx)   → { rivit:[…uusin ensin], n } — vain tämän jakson klipit (klippi.aika ≥ jaksofokus.alkoi) ketjuineen (vastaus, kuittaus); rivit lib/tm_mediaviesti.js:n tmMvRivit-tilasta (YKSI klippisääntö)
   · tmKtPolkuTila(p, tila, osat, klipit) → 'ei_jaksoa' | 'normaali' | 'vahan' | 'katselmus'
   · tmKtPolkuHTML(p, ctx)             → koko jana. ctx: { esc, t, tila (tmJaksoTila), tanaan (ISO), kaanon, voiKirjoittaa, alueMahdollinen, kausi:{tila,tavoite}, klipit:{tila,dokit}, osaFn, toimiFn, uudelleenFn, nimet?, osatHTML? }
   · tmKtPolkuCss()                    → tyylit (vain tokenit)
   Jakson osat piirretään SAMALLA komponentilla kuin Tänään (tmKtOsatHTML, lib/tm_kehitystyopoyta.js) — ei toista osarenderöintiä. Konseptin nimi esiintyy vain Jakso nyt -otsikossa.
   Dual-export: module.exports || window.TM_KT_POLKU.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    ktp_kausi: 'Kausi', ktp_kausi_ei: 'Kauden tavoitetta ei ole asetettu.', ktp_aseta_kausitavoite: 'Aseta kauden tavoite', ktp_muokkaa_kausitavoitetta: 'Muokkaa kauden tavoitetta', ktp_asetettu: 'asetettu {pvm}',
    ktp_omin_sanoin: 'Pelaajan omin sanoin: ”{teksti}”', ktp_tavoite_arvo: 'Tavoite: {arvo} {yks}.', ktp_lahto_mitattu: 'Lähtötaso: {arvo} {yks} (mitattu {pvm}).', ktp_lahto_ei: 'Lähtötasoa ei ole vielä mitattu.',
    ktp_jakso_nyt: 'Jakso nyt', ktp_viikko: 'viikko {n}/{k}', ktp_paattynyt: 'päättynyt · suljettava', ktp_tuki: 'tukiosa: {alue}', ktp_arviointi: 'arviointi {pvm}',
    ktp_klipit: 'Klipit', ktp_ei_klippeja: 'Ei klippejä tällä jaksolla.', ktp_nayta_kaikki: 'Näytä kaikki ({n})', ktp_avaa_klippi: 'Avaa klippi', ktp_vastaus: 'Pelaaja', ktp_kuittaus: 'Kuittaus',
    ktp_k_odottaa: 'lähetetty', ktp_k_vastattu: 'pelaaja vastasi', ktp_k_perhe: 'huoltaja kuittasi', ktp_k_lupa: 'odottaa lupaa', ktp_k_suljettu: 'ketju suljettu',
    ktp_lisaa_klippi: 'Lisää klippi', ktp_merkitse_havainto: 'Merkitse viikkohavainto', ktp_muokkaa_jaksoa: 'Muokkaa jaksoa', ktp_sulje_jakso: 'Sulje jakso', ktp_valikko: 'Lisää toimintoja',
    ktp_ei_jaksoa: 'Ei jaksoa käynnissä', ktp_ei_jaksoa_ohje: 'Aloita jakso, niin osat, viikkohavainnot ja klipit tulevat tähän.', ktp_aloita_jakso: 'Aloita jakso', ktp_aseta_ydinvahvuus: 'Aseta ydinvahvuus kentälle', ktp_vahvista_jakso: 'Vahvista jakso', ktp_valinta_odottaa: 'Pelaaja valitsee seuraavaa reittiä.',
    ktp_vahan_ohje: 'Merkitse ensimmäinen viikkohavainto, niin osille tulee tila.', ktp_lataa: 'Ladataan…', ktp_virhe_kausi: 'Kauden tavoitetta ei voitu ladata.', ktp_virhe_klipit: 'Klippejä ei voitu ladata.', ktp_yrita_uudelleen: 'Yritä uudelleen'
  };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _alueFi() { var A = _req('TM_KT_ALUE', './tm_kt_alue.js'); return (A && A.FI) || {}; }
  function _txt(c, k) { var v = (c && typeof c.t === 'function') ? c.t(k) : k; return (v && v !== k) ? v : (FI[k] != null ? FI[k] : (_alueFi()[k] != null ? _alueFi()[k] : k)); }
  function _fmt(str, o) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _ms(t) { return t == null ? NaN : (t.toDate ? t.toDate().getTime() : (t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : new Date(t).getTime()))); }
  function _paiva(ms) { var d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function _pvm(x) {   // ISO-päivä | ISO-aikaleima | ms | Timestamp → d.m. (paikallinen päivä, §7.26)
    if (x == null || x === '') return '';
    var s = String(x), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return (+m[3]) + '.' + (+m[2]) + '.';
    var ms = _ms(x); if (!isFinite(ms)) return ''; var d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1) + '.';
  }

  /* ── KAUSI ── */
  function _idp() {   // tm_idp.js: Node → moduuli; selain → top-level-globaalit (ei TM_IDP-oliota)
    try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_idp.js'); } catch (e) { /* selain */ }
    return root && typeof root.idpKausivuosi === 'function' ? { idpKausivuosi: root.idpKausivuosi, idpJaaVoimassaJaEhdotus: root.idpJaaVoimassaJaEhdotus, idpValitseKausidokista: root.idpValitseKausidokista } : null;
  }
  /* Voimassa oleva kausitavoite: sama valinta kuin Masterissa (_mIdpLataa): kuluva vuosi, vuodenvaihteessa edellinen. db.collection('seurat')… .collection('idp_kausi'). */
  function tmKtPolkuLataaKausi(d) {
    d = d || {}; var I = _idp(); if (!d.db || !d.sid || !d.pid || !I) return Promise.resolve(null);
    var vuosi = (typeof I.idpKausivuosi === 'function') ? I.idpKausivuosi(d.nyt || new Date()) : String((d.nyt || new Date()).getFullYear()), ed = String(Number(vuosi) - 1);
    var col = d.db.collection('seurat').doc(d.sid).collection('pelaajat').doc(d.pid).collection('idp_kausi');
    var lue = function (id) { return col.doc(id).get().then(function (s) { return s && s.exists ? ((s.data() || {}).tavoitteet || null) : null; }); };
    return lue(vuosi).then(function (nyt) {
      if (I.idpJaaVoimassaJaEhdotus(nyt).tavoite) return I.idpJaaVoimassaJaEhdotus(nyt).tavoite;
      return lue(ed).catch(function () { return null; }).then(function (edArr) { var v = I.idpValitseKausidokista(nyt, vuosi, edArr, ed); return v ? v.tavoite : null; });
    });
  }
  var EI_LUKU = { taso: 1, vapaa: 1 };
  function tmKtPolkuKausi(tav) {
    if (!tav || typeof tav !== 'object' || tav.status === 'vaihdettu' || tav.status === 'hylatty' || tav.status === 'ehdotettu') return null;
    var f = tav.fokus || {}, mit = tav.mittari || {}, yks = mit.yksikko || '', la = tav.lahto || {};
    var mitattu = !EI_LUKU[yks] && yks !== '' && la.arvo != null && isFinite(Number(la.arvo)) && !!la.pvm;   // D104: lähtötaso vain mitattuna; havaittu taso ja oletus taso+1 eivät ole mittaus
    var nimi = typeof f.nimi === 'string' && f.nimi.trim() ? f.nimi.trim() : '';
    if (!nimi && !(typeof tav.pelaajan_tavoite === 'string' && tav.pelaajan_tavoite.trim())) return null;
    return { nimi: nimi, omin: typeof tav.pelaajan_tavoite === 'string' ? tav.pelaajan_tavoite.trim() : '', asetettu: tav.luotu || null, kausi: (tav.aikaraami && tav.aikaraami.kausi) || '',
      lahto: mitattu ? { arvo: la.arvo, yks: yks, pvm: la.pvm } : null, tavoite: (mitattu && tav.tavoitearvo != null && isFinite(Number(tav.tavoitearvo))) ? { arvo: tav.tavoitearvo, yks: yks } : null };
  }

  /* ── KLIPIT (jakson sisällä) ── */
  /* dokit = viestit-dokumentit (klippi · klippi_vastaus · klippi_kuittaus), jf = jaksofokus, ctx: { pelaaja:{id,nimi?,suostumusTila?}, nyt? }.
     Rajaus: klipin oma aika ≥ jaksofokus.alkoi (ei ylärajaa: jakso nyt jatkuu sulkemiseen asti); aika puuttuu (serverTimestamp kesken) = nyt. Vastaukset ja kuittaukset seuraavat klippiään. */
  function tmKtPolkuKlipit(dokit, jf, ctx) {
    ctx = ctx || {}; var M = _req('TM_MEDIAVIESTI', './tm_mediaviesti.js'), l = Array.isArray(dokit) ? dokit : [];
    var alku = jf && jf.alkoi ? _ms(String(jf.alkoi).length <= 10 ? jf.alkoi + 'T00:00:00' : jf.alkoi) : NaN, nyt = ctx.nyt != null ? _ms(ctx.nyt) : Date.now();
    if (!M || !jf || !isFinite(alku)) return { rivit: [], n: 0 };
    var klipit = l.filter(function (d) { return d && d.tyyppi === 'klippi' && (isFinite(_ms(d.aika)) ? _ms(d.aika) : nyt) >= alku; }), id = {};
    klipit.forEach(function (k) { id[k.id] = k; });
    var vast = l.filter(function (d) { return d && (d.tyyppi === 'klippi_vastaus' || d.tyyppi === 'klippi_kuittaus') && id[d.vastaus_viestille]; });
    var pl = {}; if (ctx.pelaaja && ctx.pelaaja.id) pl[ctx.pelaaja.id] = { nimi: ctx.pelaaja.nimi || '', suostumusTila: ctx.pelaaja.suostumusTila };
    var rivit = M.tmMvRivit(klipit.concat(vast), { pelaajat: pl }).map(function (r) { var k = id[r.klippiDocId] || {}; return Object.assign({}, r, { url: typeof k.url === 'string' && /^https:\/\//i.test(k.url) ? k.url : '', domain: k.domain || r.domain || '', tekija: k.fromNimi || '', aikaMs: isFinite(_ms(k.aika)) ? _ms(k.aika) : nyt }); });
    rivit.sort(function (a, b) { return b.aikaMs - a.aikaMs; });
    return { rivit: rivit, n: rivit.length };
  }
  /* Tila: 'ei_jaksoa' (aloittamaton/valinta kesken) · 'katselmus' (päättynyt, suljettava) · 'vahan' (käynnissä, ei yhtään havaintoa eikä klippiä) · 'normaali'. */
  function tmKtPolkuTila(p, tila, osat, klipit) {
    var t = tila && tila.tila; if (t === 'paattynyt') return 'katselmus';
    if (t !== 'kaynnissa' && t !== 'vahvistettu') return 'ei_jaksoa';
    var havaintoja = (osat || []).some(function (o) { return o && o.tila; }), klippeja = !!(klipit && klipit.n);
    return havaintoja || klippeja ? 'normaali' : 'vahan';
  }

  /* ── HTML ── */
  function _jakso(jf) { var a = jf && jf.alkoi ? String(jf.alkoi).slice(0, 10) : '', m = /^\d{4}-\d{2}-\d{2}$/.test(a); return m ? a : null; }
  function _loppuIso(jf) {
    var K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'); return K && typeof K.tmKtKatselmusIso === 'function' ? K.tmKtKatselmusIso(jf) : null;
  }
  function _label(s) { var x = String(s == null ? '' : s).trim().replace(/_/g, '-').toLowerCase(); return /^[a-zäöå -]+$/.test(x) ? x : ''; }
  function _virhe(c, kuvaus) { var esc = c.esc || _esc; return '<div class="kt-pk-virhe" role="alert" data-kt-polku-virhe>' + esc(_txt(c, kuvaus)) + (c.uudelleenFn ? ' <button type="button" class="kt-linkki" data-kt-polku-uudelleen onclick="' + esc(c.uudelleenFn + '()') + '">' + esc(_txt(c, 'ktp_yrita_uudelleen')) + '</button>' : '') + '</div>'; }
  function _rivi(cls, kirjain, otsikko, sisalto, aria) { return '<div class="kt-jr' + (cls ? ' ' + cls : '') + '"><div class="kt-jd" aria-hidden="true">' + kirjain + '</div><div class="kt-jb"><span class="kt-eb">' + otsikko + '</span>' + sisalto + '</div></div>'; }
  function _nappi(c, fn, pid, avain, teksti, attr, cls) { var esc = c.esc || _esc; return c.toimiFn ? '<button type="button" class="' + (cls || 'kt-linkki') + '" ' + (attr || '') + ' onclick="' + esc(c.toimiFn + '(' + JSON.stringify(pid) + ',' + JSON.stringify(avain) + ')') + '">' + esc(teksti) + '</button>' : ''; }

  function _kausiHTML(p, c, tila) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, k = c.kausi || {}, pid = p.id, ots = esc(t('ktp_kausi'));
    if (k.tila === 'lataa') return _rivi('done', 'K', ots, '<div class="kt-ev" data-kt-kausi="lataa"><div class="kt-ev-lause">' + esc(t('ktp_lataa')) + '</div></div>');
    if (k.tila === 'virhe') return _rivi('done', 'K', ots, '<div class="kt-ev" data-kt-kausi="virhe">' + _virhe(c, 'ktp_virhe_kausi') + '</div>');
    var K = tmKtPolkuKausi(k.tavoite), ots2 = ots + (K && K.kausi ? ' · ' + esc(K.kausi) : '');
    var muokkaa = c.voiKirjoittaa ? _nappi(c, null, pid, 'kausitavoite', t(K ? 'ktp_muokkaa_kausitavoitetta' : 'ktp_aseta_kausitavoite'), 'data-kt-kausitavoite') : '';
    if (!K) return _rivi('done', 'K', ots, '<div class="kt-ev" data-kt-kausi="ei"><div class="kt-ev-lause">' + esc(t('ktp_kausi_ei')) + '</div>' + (muokkaa ? '<div class="kt-ev-act">' + muokkaa + '</div>' : '') + '</div>');
    var lause = [];
    if (K.omin) lause.push(esc(_fmt(t('ktp_omin_sanoin'), { teksti: K.omin })));
    if (K.tavoite) lause.push(esc(_fmt(t('ktp_tavoite_arvo'), { arvo: K.tavoite.arvo, yks: K.tavoite.yks })));
    lause.push(K.lahto ? esc(_fmt(t('ktp_lahto_mitattu'), { arvo: K.lahto.arvo, yks: K.lahto.yks, pvm: _pvm(K.lahto.pvm) })) : esc(t('ktp_lahto_ei')));
    return _rivi('done', 'K', ots2, '<div class="kt-ev" data-kt-kausi="ok"><div class="kt-ev-t"><span class="kt-ev-h">' + esc(K.nimi || K.omin) + '</span>' + (K.asetettu ? '<span class="kt-ev-age">' + esc(_fmt(t('ktp_asetettu'), { pvm: _pvm(K.asetettu) })) + '</span>' : '') + '</div><div class="kt-ev-lause">' + lause.join(' ') + '</div>' + (muokkaa ? '<div class="kt-ev-act">' + muokkaa + '</div>' : '') + '</div>');
  }

  function _klippiRivi(r, c) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, M = _req('TM_MEDIAVIESTI', './tm_mediaviesti.js');
    var tilaAvain = { odottaa: 'ktp_k_odottaa', vastattu: 'ktp_k_vastattu', perhe_kuittasi: 'ktp_k_perhe', odottaa_lupaa: 'ktp_k_lupa', suljettu: 'ktp_k_suljettu' }[r.tila] || 'ktp_k_odottaa';
    var kysymys = M && typeof M.tmMvKysymysTeksti === 'function' ? M.tmMvKysymysTeksti(r, { t: c.t }) : (r.kysymys || '');
    var meta = [r.tekija, _pvm(r.aikaMs), t(tilaAvain)].filter(Boolean).join(' · '), ketju = '';
    if (r.vastaus && (r.vastaus.valinta || r.vastaus.teksti)) ketju += '<span class="kt-kl-ketju" data-kt-klippi-vastaus>' + esc(t('ktp_vastaus') + ': ' + [r.vastaus.valinta, r.vastaus.teksti].filter(Boolean).join(' — ')) + '</span>';
    if (r.kuittaus_lause) ketju += '<span class="kt-kl-ketju" data-kt-klippi-kuittaus>' + esc(t('ktp_kuittaus') + ': ' + r.kuittaus_lause) + '</span>';
    return '<div class="kt-kl" data-kt-klippi="' + esc(r.klippiDocId || r.avain) + '" data-kt-klippi-tila="' + esc(r.tila) + '"><span class="kt-kl-v" aria-hidden="true">▶</span><span class="kt-kl-t"><b>”' + esc(kysymys) + '”</b><small>' + esc(meta) + '</small>' + ketju + '</span>'
      + (r.url ? '<a class="kt-linkki kt-kl-linkki" data-kt-klippi-linkki href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('ktp_avaa_klippi')) + '</a>' : '') + '</div>';
  }
  function _klipitHTML(p, c, kl) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, k = c.klipit || {};
    if (k.tila === 'lataa') return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="lataa"><div class="kt-meta">' + esc(t('ktp_lataa')) + '</div></div>';
    if (k.tila === 'virhe') return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="virhe">' + _virhe(c, 'ktp_virhe_klipit') + '</div>';
    if (!kl.n) return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="tyhja"><div class="kt-meta">' + esc(t('ktp_ei_klippeja')) + '</div></div>';
    var nakyvat = kl.rivit.slice(0, 5), loput = kl.rivit.slice(5);
    return '<div class="kt-pk-klipit" role="group" aria-label="' + esc(t('ktp_klipit')) + '" data-kt-klipit="ok" data-kt-klipit-n="' + kl.n + '">' + nakyvat.map(function (r) { return _klippiRivi(r, c); }).join('')
      + (loput.length ? '<details class="kt-kl-kaikki" data-kt-klipit-kaikki><summary>' + esc(_fmt(t('ktp_nayta_kaikki'), { n: kl.n })) + '</summary>' + loput.map(function (r) { return _klippiRivi(r, c); }).join('') + '</details>' : '') + '</div>';
  }

  function _jaksoHTML(p, c, tila, tilaNimi, osat, kl) {
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, pid = p.id, jf = p.jaksofokus || {}, ots = esc(t('ktp_jakso_nyt')), tt = tila && tila.tila;
    if (tilaNimi === 'ei_jaksoa') {
      var ase = !!(p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' && p.ydinvahvuus.kuvaus.trim()), nappi = '';
      if (c.voiKirjoittaa) {
        if (tt === 'valinta_tehty') nappi = _nappi(c, null, pid, 'vahvista', t('ktp_vahvista_jakso'), 'data-kt-jakso-nappi="vahvista"', 'kt-btn');
        else if (tt === 'valittavana') nappi = '';
        else if (ase || !c.alueMahdollinen) nappi = _nappi(c, null, pid, 'aloita', t('ktp_aloita_jakso'), 'data-kt-jakso-nappi="aloita"', 'kt-btn');
        else nappi = _nappi(c, null, pid, 'aseta_alue', t('ktp_aseta_ydinvahvuus'), 'data-kt-aseta-alue', 'kt-btn');
      }
      return _rivi('now', '·', ots, '<div class="kt-sig n" data-kt-jakso="ei_jaksoa"><div class="kt-sig-h">' + esc(t('ktp_ei_jaksoa')) + '</div><div class="kt-sig-why">' + esc(t(tt === 'valittavana' ? 'ktp_valinta_odottaa' : 'ktp_ei_jaksoa_ohje')) + '</div>' + (nappi ? '<div>' + nappi + '</div>' : '') + '</div>');
    }
    var K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'), alku = _jakso(jf), loppu = _loppuIso(jf);
    var viikko = (tila && tila.rivitila && tila.rivitila.vk) ? tila.rivitila.vk : null;
    var ots2 = ots + (alku && loppu ? ' · ' + esc(_pvm(alku) + '–' + _pvm(loppu)) : '');
    var age = tilaNimi === 'katselmus' ? t('ktp_paattynyt') : (viikko ? _fmt(t('ktp_viikko'), { n: viikko.n, k: viikko.yht }) : '');
    var tukiAlue = jf.tukiosa && typeof jf.tukiosa.alue === 'string' ? jf.tukiosa.alue.trim() : '';
    var lause = [_label(jf.domeeni), tukiAlue ? _fmt(t('ktp_tuki'), { alue: tukiAlue }) : '', loppu ? _fmt(t('ktp_arviointi'), { pvm: _pvm(loppu) }) : ''].filter(Boolean).join(' · ');
    var osatHTML = K ? K.tmKtOsatHTML({ osat: osat, viikonOsa: tilaNimi === 'katselmus' ? null : K.tmKtViikonOsa(osat), jaksoNimi: '' }, { esc: esc, t: c.t, osaFn: c.voiKirjoittaa ? c.osaFn : null, pid: pid, nimet: c.nimet, v2: true }) : '';
    var toiminnot = '';
    if (c.voiKirjoittaa && c.toimiFn) {
      var primary = tilaNimi === 'katselmus' ? _nappi(c, null, pid, 'sulje', t('ktp_sulje_jakso'), 'data-kt-jakso-nappi="sulje"', 'kt-btn') : _nappi(c, null, pid, 'havainto', t('ktp_merkitse_havainto'), 'data-kt-jakso-nappi="havainto"');
      var valikko = [['klippi', 'ktp_lisaa_klippi', 'data-kt-lisaa-klippi'], ['muokkaa', 'ktp_muokkaa_jaksoa', 'data-kt-jakso-muokkaa']];
      if (c.alueMahdollinen) valikko.push(['aseta_alue', 'ka_vaihda', 'data-kt-aseta-alue'])   /* 'Vaihda aluetta': olemassa oleva tm_kt_alue-avain (sv jo olemassa) */;
      if (tilaNimi !== 'katselmus') valikko.push(['sulje', 'ktp_sulje_jakso', 'data-kt-jakso-sulje']);
      var menu = '<details class="kt-valikko kt-pk-valikko"><summary class="kt-nappi kt-nappi-kuva" aria-label="' + esc(t('ktp_valikko')) + '">⋯</summary><div class="kt-valikko-lista" role="menu">' + valikko.map(function (v) { return '<button type="button" role="menuitem" ' + v[2] + ' onclick="' + esc(c.toimiFn + '(' + JSON.stringify(pid) + ',' + JSON.stringify(v[0]) + ')') + '">' + esc(t(v[1])) + '</button>'; }).join('') + '</div></details>';
      toiminnot = '<div class="kt-ev-act">' + primary + menu + '</div>';
    }
    return _rivi('now' + (tilaNimi === 'katselmus' ? ' w' : ''), viikko ? viikko.n + '/' + viikko.yht : '·', ots2,
      '<div class="kt-ev" data-kt-jakso="' + esc(tilaNimi) + '"><div class="kt-ev-t"><span class="kt-ev-h" data-kt-jakso-nimi>' + esc(jf.konsepti_nimi || '') + '</span>' + (age ? '<span class="kt-ev-age">' + esc(age) + '</span>' : '') + '</div>'
      + (lause ? '<div class="kt-ev-lause">' + esc(lause) + '</div>' : '') + osatHTML + (tilaNimi === 'vahan' ? '<div class="kt-meta" data-kt-vahan-ohje>' + esc(t('ktp_vahan_ohje')) + '</div>' : '')
      + _klipitHTML(p, c, kl) + toiminnot + '</div>');
  }

  /* p = pelaaja (D248-näyttökopio: jaksofokus.konsepti_nimi sanastosta), ctx kuten otsikossa. Koko jana = YKSI .kt-polku-juuri. */
  function tmKtPolkuHTML(p, c) {
    c = c || {}; p = p || {}; var K = _req('TM_KEHITYSTYOPOYTA', './tm_kehitystyopoyta.js'), jf = p.jaksofokus || null;
    var tila = c.tila || null, kaynnissa = tila && (tila.tila === 'kaynnissa' || tila.tila === 'vahvistettu' || tila.tila === 'paattynyt');
    var osat = kaynnissa && K ? K.tmKtOsat(jf, { kaanon: c.kaanon }) : [];
    var kl = kaynnissa ? tmKtPolkuKlipit((c.klipit && c.klipit.dokit) || [], jf, { pelaaja: { id: p.id, nimi: c.nimi, suostumusTila: p.suostumusTila }, nyt: c.nyt }) : { rivit: [], n: 0 };
    var tilaNimi = tmKtPolkuTila(p, tila, osat, c.klipit && c.klipit.tila === 'ok' ? kl : null);
    return '<div class="kt-pk" data-kt-polku data-kt-polku-tila="' + (c.esc || _esc)(tilaNimi) + '"><div class="kt-jana">' + _kausiHTML(p, c, tila) + _jaksoHTML(p, c, tila, tilaNimi, osat, kl) + '</div></div>';
  }

  function tmKtPolkuCss() {
    return [
      '.kt-pk{max-width:860px}.kt-jana{position:relative;display:grid;gap:18px;padding-left:44px}',
      '.kt-jana::before{content:"";position:absolute;left:15px;top:14px;bottom:14px;width:1px;background:var(--border)}',
      '.kt-jr{position:relative;display:grid;gap:6px;min-width:0}.kt-jb{display:grid;gap:6px;min-width:0}',
      '.kt-jd{position:absolute;left:-44px;top:0;width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:var(--bg);color:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:var(--fs-meta,12.5px)}',
      '.kt-jr.done .kt-jd{border-color:var(--teal);color:var(--teal)}.kt-jr.now .kt-jd{border-color:var(--teal);color:var(--teal)}.kt-jr.now.w .kt-jd{border-color:var(--amber);color:var(--amber)}',
      '.kt-pk .kt-ev .kt-osat{margin-top:2px}.kt-pk-klipit{display:grid;gap:6px;margin-top:2px}.kt-pk-virhe{font-size:var(--fs-body,14px);color:var(--amber)}',
      '.kt-kl{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--border);border-radius:4px;padding:8px 10px;background:var(--bg)}',
      '.kt-kl-v{width:28px;height:28px;border-radius:4px;background:var(--bg2,var(--card));color:var(--teal);display:flex;align-items:center;justify-content:center;font-size:var(--fs-meta,12.5px)}',
      '.kt-kl-t{display:grid;gap:1px;min-width:0;font-size:var(--fs-body,14px)}.kt-kl-t small{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kt-kl-ketju{font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.kt-kl-kaikki{display:grid;gap:6px}.kt-kl-kaikki summary{cursor:pointer;font-size:var(--fs-body,14px);font-weight:600;color:var(--teal);margin-bottom:6px}',
      '.kt-pk .kt-ev-act{position:relative}.kt-pk-valikko{margin-left:auto}',
      '@media (max-width:720px){.kt-jana{padding-left:36px}.kt-jana::before{left:11px}.kt-jd{left:-36px;width:24px;height:24px;font-size:var(--fs-eb,11px)}.kt-kl{grid-template-columns:auto minmax(0,1fr)}.kt-kl-linkki{grid-column:2;justify-self:start}}'
    ].join('\n');
  }

  var API = { FI: FI, tmKtPolkuLataaKausi: tmKtPolkuLataaKausi, tmKtPolkuKausi: tmKtPolkuKausi, tmKtPolkuKlipit: tmKtPolkuKlipit, tmKtPolkuTila: tmKtPolkuTila, tmKtPolkuHTML: tmKtPolkuHTML, tmKtPolkuCss: tmKtPolkuCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KT_POLKU = API;
})(typeof window !== 'undefined' ? window : this);
