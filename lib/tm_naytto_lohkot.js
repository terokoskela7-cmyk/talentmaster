/* ════════════════════════════════════════════════════════════════════════
   tm_naytto_lohkot.js — Kehitystyöpöytä K2 (brief K1/K2): Näytön mittauslohkot YHDESSÄ paikassa. Master (V4b-1 Näyttö + vanha pelaajakortti) ja Kehitystyopoyta.html renderöivät samalla koodilla.
   Siirretty Master_v16:sta SELLAISENAAN (ei uutta logiikkaa, ei uusia kenttiä): _mPinfoOsat → tmNayttoOsat, _ktNayttoHTML → tmNayttoLohkotHTML, _ktKasvuHTML → tmNayttoKasvuHTML,
   _mStatsHTML → tmNayttoStatsHTML, _mMitaOsattavaHTML → tmNayttoMitaOsattavaHTML, _mKertymaTayta → tmNayttoKertymaTayta, apurit _pvmFiM/_tkLajiNimi/_tkiMerkkiM/_deltaBadge/_devIkaSp/_mSelBtn.
   Master-paikalliset riippuvuudet tulevat kontekstina c (t = masterT, esc, testitapahtumat, superAdmin, uid, d3Dims, ttKortti …); libit (tmTasoCss, renderKehityskorttiHTML, tmKaariRenderFull …) globaaleina kuten ennen.
   · tmNayttoOsat(p, c)              → { nimi, ika, testPvm, testIka, stats, lisaHtml, _kehHtml, _sekHtml, _identHtml, _adarHtml, _ristiinHtml, _kehityskaariHtml, _reseptiHtml, _d3Html, _ttHtml }; c.vainNaytto → ei Reseptiä/TT-korttia (Polun asioita)
   · tmNayttoLohkotHTML(p, c)        → Näytön lohkot (Perustiedot · Kasvu ja kypsyys · Mittaukset · Pelihavainnot · Psyykkinen · Harjoittelu · Mitä pelaajan tulee osata); c.osat = valmiiksi lasketut osat
   · tmNayttoKehysHTML(lohkot, c)    → UUSI SIVU: [paikka todistekorteille (K4)] + "Näytä kaikki mittaukset" -avattava (oletus auki), sisällä lohkot
   · tmNayttoTilaHTML(tila, c)       → laiska lataus: 'lataa' | 'virhe' (näkyvä viesti lohkossa)
   Dual-export: module.exports || window.TM_NAYTTO_LOHKOT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    kn_kaikki: 'Näytä kaikki mittaukset', kn_lataa: 'Haetaan mittauksia…',
    kn_virhe: 'Mittauksia ei saatu haettua.', kn_virhe_ohje: 'Yritä uudelleen hetken päästä tai avaa pelaaja Masterissa.', kn_yrita: 'Yritä uudelleen'
  };
  var D3_DIMS = [
    { key: 'inner_drive', nimi: 'Sisäinen motivaatio', vQ: 'Harjoittelee omaehtoisesti, ei vain käskystä' },
    { key: 'coachability', nimi: 'Valmennettavuus', vQ: 'Ottaa palautteen vastaan ja soveltaa sitä' },
    { key: 'resilience', nimi: 'Sinnikkyys', vQ: 'Ei luovuta vastoinkäymisissä' },
    { key: 'focus', nimi: 'Keskittyminen', vQ: 'Pysyy tehtävässä koko harjoituksen' },
    { key: 'emotional_control', nimi: 'Tunteiden hallinta', vQ: 'Hallitsee turhautumisen pelitilanteissa' }
  ];
  function _t(c, k) { var v = c && typeof c.tt === 'function' ? c.tt(k) : k; return (v && v !== k) ? v : (FI[k] != null ? FI[k] : k); }

  /* ── apurit (ennen Master_v16: _pvmFiM, _tkLajiNimi, _tkiMerkkiM, _deltaBadge, _devIkaSp, _mSelBtn, _mStatsHTML) ── */
  function tmNayttoPvmFi(iso) {
    if (!iso) return '';
    var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (parseInt(m[3], 10) + '.' + parseInt(m[2], 10) + '.' + m[1]) : String(iso);
  }
  function tmNayttoTkLajiNimi(id, masterT) {
    var MAP = { ponnauttelu: 'Ponnauttelu', syotto: 'Syöttö', pujottelu: 'Pujottelu', kuljetus_laukaus: 'Kuljetus-laukaus', pituuspotku: 'Pituuspotku' };
    return masterT(MAP[id] || id);
  }
  function tmNayttoTkiMerkki(tki, merkkiKentta, masterT) {   // TKI-merkki: VAIN tallennettu tki_merkki (ei TKI-johdettua fallbackia)
    var m = merkkiKentta || null;
    if (m === 'kulta') return { emoji: '🥇', nimi: masterT('Kulta') };
    if (m === 'hopea') return { emoji: '🥈', nimi: masterT('Hopea') };
    if (m === 'pronssi') return { emoji: '🥉', nimi: masterT('Pronssi') };
    return null;
  }
  function tmNayttoDeltaBadge(nyt, edel, des) {
    if (edel == null || nyt == null) return '';
    var d = (+nyt) - (+edel);
    des = (des == null) ? 1 : des;
    var kynnys = (des === 0) ? 0.5 : 0.05;
    if (Math.abs(d) < kynnys) return ' <span style="color:var(--ink3);font-size:11px;font-weight:600">→</span>';
    var ylos = d > 0;
    return ' <span title="edellinen ' + edel + '" style="color:' + (ylos ? 'var(--teal)' : 'var(--red)')
      + ';font-size:11px;font-weight:600;margin-left:2px">' + (ylos ? '↑+' : '↓−') + Math.abs(d).toFixed(des) + '</span>';
  }
  function tmNayttoDevIkaSp(p) {
    var _pvm = p.hh_pvm || p.d1_pvm || p.tki_pvm || p.d2_pvm || null;   // §24/§26: norminhaun ika TESTIPÄIVÄSTÄ, ei Date.now()
    var ika = (typeof normiIka === 'function') ? normiIka(p.syntymaVuosi, _pvm, p.joukkue) : (p.syntymaVuosi ? (new Date().getFullYear() - p.syntymaVuosi) : null);
    var sp = (p.sukupuoli === 'P' || p.sukupuoli === 'M') ? 'M'
           : (p.sukupuoli === 'T' || p.sukupuoli === 'N') ? 'N' : null;
    var jm = String(p.joukkue || '').match(/\b([PTU])\s?(\d{1,2})\b/i);   // "SJK P15" → 15 / P
    if (ika == null && jm) ika = parseInt(jm[2], 10);
    if (sp == null && jm) sp = (jm[1].toUpperCase() === 'T') ? 'N' : 'M';
    if (sp == null) sp = 'M';
    return { ika: ika, sp: sp };
  }
  function tmNayttoSelBtn(k, masterT) {   // §IA ℹ️-infonappi: selite aina TM_SELITTEET:istä; klikkaus → window._mSelInfo (Master ja Kehitystyöpöytä: toast)
    var t = (typeof TM_SELITTEET !== 'undefined' && TM_SELITTEET[k]) ? masterT(TM_SELITTEET[k]) : null;
    return t ? ' <span onclick="event.stopPropagation();_mSelInfo(\'' + k + '\')" title="' + String(t).replace(/"/g, '&quot;') + '" style="cursor:help;color:var(--ink3);font-size:10px;opacity:.7">ⓘ</span>' : '';
  }
  function tmNayttoStatsHTML(stats, masterT) {
    return stats.map(function (s) { return `
      <div${s.title ? ` title="${s.title}"` : ''}${s.detalji ? ` class="pstat-klik" onclick="_avaaDetail('${s.detalji}')"` : ''}>
        <div class="pstat-lbl">${s.lbl}${s.detalji ? ' <span style="color:var(--teal)">→</span>' : ''}</div>
        <div class="pstat-val serif" style="color:${s.color}">${s.val}</div>
        <div class="pstat-delta mono" style="font-size:11px;color:var(--ink3)">${masterT(s.delta)}</div>
      </div>`; }).join('');
  }

  /* ── tmNayttoOsat: Master_v16 _mPinfoOsat sellaisenaan ── */
  function tmNayttoOsat(p, c) {
    c = c || {};
    var masterT = c.t, _mEsc = c.esc, _testitapahtumat = c.testitapahtumat, _superAdmin = c.superAdmin, _uid = c.uid, _D3_DIMS = c.d3Dims || D3_DIMS, _ttKorttiHTML = c.ttKortti;
    var _pvmFiM = tmNayttoPvmFi, _tkiMerkkiM = function (a, b) { return tmNayttoTkiMerkki(a, b, masterT); }, _tkLajiNimi = function (id) { return tmNayttoTkLajiNimi(id, masterT); },
      _deltaBadge = tmNayttoDeltaBadge, _devIkaSp = tmNayttoDevIkaSp, _mSelBtn = function (k) { return tmNayttoSelBtn(k, masterT); };
  const nimi = ((p.etunimi||'') + ' ' + (p.sukunimi||'')).trim();
  const flei = p.flei_viimeisin || 0;
  const fleiColor = tmTasoCss(flei > 0 ? flei : null, { asteikko: 'valmius' });

  // Hae pelaajan testejä _testitapahtumat:sta
  const suoritetut = (_testitapahtumat||[]).filter(t => t.tila === 'suljettu').length;

  // TKI — luetaan pikakentistä (ei alikokoelmakyselyä)
  const tki = (p.tki_viimeisin != null) ? p.tki_viimeisin : null;
  const tkiM = _tkiMerkkiM(tki, p.tki_merkki);
  const tkiColor = tmTasoCss(tki, { asteikko: 'tki' });
  const tkiPvm = p.tki_pvm ? _pvmFiM(p.tki_pvm) : null;

  // OSA 1 — prioriteettihierarkia: näytä mitä on, piilota mitä ei ole (ei "Ei mittauksia").
  const stats = [];
  // MITTARI 1: FLEI → H-H → piilota
  if (flei > 0) {
    stats.push({ lbl:masterT('Kehon valmius')+_mSelBtn('flei'), val: flei + '%',
      delta: flei>=65?masterT('Hyvä taso'):flei>=50?masterT('Kehittyvä'):masterT('Tarvitsee tukea'), color: fleiColor });
  } else if (p.hh_taso != null) {
    const hh = +p.hh_taso;
    stats.push({ lbl:'H-H'+_mSelBtn('hh_taso'), val: String(hh) + _deltaBadge(hh, p.hh_taso_edellinen, 1),
      delta: ({ ok: masterT('Vahva'), raja: masterT('Keskitaso'), kehitys: masterT('Kehittyvä'), tuntematon: masterT('Kehittyvä') })[tmTasoVari(hh, { asteikko: 'hh5' })],
      color: tmTasoCss(hh, { asteikko: 'hh5' }), detalji:'hh' });
  }
  // (D1/D2 + per-test-rivit → kanoninen renderKehityskorttiHTML alla, ei enää erillistä KPI-korttia)
  // MITTARI 2: TKI → TSI → piilota
  if (tki != null) {
    // KORJAUS 3: ilman mitalia (tki_merkki null) nosta kehityskohde valmentajalle deltaan.
    const tkiDelta = tkiM
      ? (tkiPvm ? masterT('Mitattu ') + tkiPvm : masterT('Tekniikkakilpailu'))
      : (p.tki_kehityskohde ? masterT('Kehitä: ') + _tkLajiNimi(p.tki_kehityskohde)
         : (tkiPvm ? masterT('Mitattu ') + tkiPvm : masterT('Tekniikkakilpailu')));
    stats.push({ lbl:'TKI'+_mSelBtn('tki'), val: tki + (tkiM ? ' ' + tkiM.emoji : '') + _deltaBadge(tki, p.tki_edellinen, 0), delta: tkiDelta, color: tkiColor, detalji:'tki' });
  } else if (p.tsi_viimeisin != null) {
    // KORJAUS 2: TSI selitetään — mitä luku tarkoittaa (pallon vaikutus nopeuteen).
    const tsi = +p.tsi_viimeisin;
    let tsiLbl, tsiTip, tsiColor;
    if (tsi <= 0) {
      tsiLbl = masterT('🔥 Pallo nopeuttaa'); tsiColor = 'var(--teal)';
      tsiTip = masterT('Pallo nopeuttaa pelaajaa ') + Math.abs(tsi) + masterT('s verrattuna pallottomaan nopeuteen.');
    } else if (tsi <= 0.5) {
      tsiLbl = masterT('✅ Tekninen vapaus'); tsiColor = 'var(--teal)';
      tsiTip = masterT('Pallo hidastaa vain ') + tsi + masterT('s — tekninen vapaus. Tavoite: alle 0.5s.');
    } else {
      tsiLbl = masterT('⚠️ Pallo hidastaa'); tsiColor = 'var(--amber)';
      tsiTip = masterT('Pallo hidastaa pelaajaa ') + tsi + masterT('s verrattuna pallottomaan nopeuteen. Tavoite: alle 0.5s.');
    }
    stats.push({ lbl:'TSI'+_mSelBtn('tsi'), val: (tsi <= 0 ? Math.abs(tsi) : tsi) + ' s', delta: tsiLbl, title: tsiTip, color: tsiColor, detalji:'tsi' });
  }
  // (Testikertoja/Streak → vaimea sekundääririvi alla, vain jos dataa — ei tyhjiä "—" KPI:itä ykkösriville.)

  const synt = p.syntymaVuosi ? p.syntymaVuosi : null;
  const ika  = synt ? (new Date().getFullYear() - synt) + 'v' : '—';
  // Testipäivä korttiotsikkoon (H-H ensisijaisesti, muuten TKI)
  const testPvm = p.hh_pvm ? _pvmFiM(p.hh_pvm) : (p.tki_pvm ? _pvmFiM(p.tki_pvm) : null);
  const _testPvmIso = p.hh_pvm || p.tki_pvm || null, testIka = (_testPvmIso && tmTasoVanhentunut(_testPvmIso)) ? tmMittausIkaTeksti(_testPvmIso, null, masterT) : null;   // D141: yli 12 kk → "mitattu 2023 · päivitä" (ei nykytasoksi)

  // Vahvuus / kehityskohde — pikakentistä (laji-id → luettava nimi)
  const vahvuus = p.tki_vahvuus ? _tkLajiNimi(p.tki_vahvuus) : null;
  const kehitys = p.tki_kehityskohde ? _tkLajiNimi(p.tki_kehityskohde) : null;
  let lisaHtml = '';
  if (vahvuus || kehitys) {
    lisaHtml = '<div style="grid-column:1/-1;margin-top:6px;font-size:12px;display:flex;gap:20px;flex-wrap:wrap">';
    if (vahvuus) lisaHtml += '<span style="color:var(--teal)">💪 ' + masterT('Vahvuus: ') + vahvuus + '</span>';
    if (kehitys) lisaHtml += '<span style="color:var(--amber)">🎯 ' + masterT('Kehityskohde: ') + kehitys + '</span>';
    lisaHtml += '</div>';
  }

  // §8 KEHITYSKORTTI — D1/D2-mittarikortit + per-test-rivit (Sibbon malli, gap-vihje + tasomerkki) + legenda.
  // Kanoninen renderKehityskorttiHTML (lib) — SAMA Master+VP, ei kopioita. Toimii ilman aggregaattia (Pallo-Iirot). Tyhjä → ei lohkoa.
  let _kehHtml = '';
  if (typeof renderKehityskorttiHTML === 'function') {
    const _is = _devIkaSp(p);
    const _k = renderKehityskorttiHTML(p, _is.ika, _is.sp);
    if (_k) _kehHtml = '<div style="grid-column:1/-1;margin-top:10px;padding-top:10px;border-top:.5px solid rgba(242,239,230,.1)">' + _k + '</div>';
  }
  // Vaimea sekundääririvi: testikertoja/streak vain jos dataa (ei tyhjiä "—" ykkösriville)
  const _sek = [];
  if (suoritetut) _sek.push(suoritetut + masterT(' testikertaa'));
  if (p.streak > 0) _sek.push(p.streak + masterT(' pv streak'));
  const _sekHtml = _sek.length ? '<div style="grid-column:1/-1;margin-top:8px;font-size:11px;color:var(--ink3)">' + _sek.join(' · ') + '</div>' : '';

  // ── §C IDENTITEETTINAUHA — PHV-chip + talenttibadge + varhaistekniikka-mitali (vain pikakentät §26, ei alikokoelmaa) ──
  const _identChips = [];
  if (tmPhvKoodi(p)) {
    const _pv = { PRE:'var(--ink3)', LAH:'var(--blue)', PH:'var(--amber)', POST:'var(--teal)', AN:'var(--teal)' }[tmPhvKoodi(p)] || 'var(--ink3)';
    const _ps = { PRE:masterT('ennen kasvupyrähdystä'), LAH:masterT('lähestyy kasvupyrähdystä'), PH:masterT('kasvupyrähdyksessä — kuormarajoitin (§25/§28)'), POST:masterT('kasvupyrähdyksen jälkeen'), AN:masterT('jälki-PHV') }[tmPhvKoodi(p)] || '';
    _identChips.push('<span title="' + _ps + '" style="font-size:10px;padding:2px 9px;border-radius:20px;border:.5px solid ' + _pv + ';color:' + _pv + '">' + (tmPhvKoodi(p) === 'PH' ? '⚠ ' : '') + 'PHV ' + tmPhvKoodi(p) + '</span>');
  } else if (p.phv_ilmoitettu_ph) {
    // PR C: lomakkeelta/tuonnista ilmoitettu PH ilman mittausta → henkilökunnalle näkyviin (kuormasuoja), ei vaihetta.
    _identChips.push('<span title="' + masterT('ilmoitettu, ei mitattu') + '" style="font-size:10px;padding:2px 9px;border-radius:20px;border:.5px dashed var(--amber);color:var(--amber)">⚠ PHV PH? · ' + masterT('ilmoitettu, ei mitattu') + '</span>');
  } else if (p.phv_ei_mitattu) {
    // Päätös B: mittaamaton kalenteri-ikäikkunassa → harjoitusehdotukset S2-katolla. Henkilökunnalle, ei lapselle.
    _identChips.push('<span title="' + masterT('kuorma varovainen ikäikkunassa') + '" style="font-size:10px;padding:2px 9px;border-radius:20px;border:.5px dashed var(--ink3);color:var(--ink3)">' + masterT('PHV ei mitattu') + '</span>');
  }
  if (p.talenttiTaso) {
    const _laaj = p.talenttiTaso === 'laajennettu';
    _identChips.push('<span style="font-size:10px;padding:2px 9px;border-radius:20px;background:' + (_laaj ? 'var(--teal)' : 'rgba(255,255,255,.05)') + ';color:' + (_laaj ? '#fff' : 'var(--ink2)') + '">' + (_laaj ? masterT('★ Laajennettu talentti') : masterT('Perustaso')) + '</span>');
  }
  const _tv = p.tekninen_varhaiskehitys;
  if (_tv && (_tv.merkki === 'kulta' || _tv.merkki === 'hopea')) {
    const _mv = _tv.merkki === 'kulta' ? '#D4AF37' : '#9AA0A6';
    _identChips.push('<span title="' + masterT('Tekniikkamitali') + '' + (_tv.ika != null ? ' ' + _tv.ika + 'v' : '') + masterT(' — varhaiskehitys vahvistettu (§28)') + '" style="font-size:10px;padding:2px 9px;border-radius:20px;border:.5px solid ' + _mv + ';color:' + _mv + '">' + (_tv.merkki === 'kulta' ? '🥇' : '🥈') + masterT(' Varhaistekniikka') + '</span>');
  }
  // §RAE-näkyvyys — syntymäkvartaali-chip (Q1 amber / Q4 teal / Q2–Q3 neutraali) + underdog (Q4 + taso≥3). Vain näkyvyys.
  if (typeof raeChip === 'function') {
    const _rc = raeChip(p);
    if (_rc.q) {
      const _qv = _rc.q === 'Q1' ? 'var(--amber)' : _rc.q === 'Q4' ? 'var(--teal)' : 'var(--ink3)';
      _identChips.push('<span style="font-size:10px;padding:2px 9px;border-radius:20px;border:.5px solid ' + _qv + ';color:' + _qv + '">' + _rc.q + masterT(' synt.') + (typeof _mSelBtn === 'function' ? _mSelBtn('rae') : '') + '</span>');
      if (_rc.underdog) _identChips.push('<span title="' + masterT('Q4 (ikäluokan nuorin) + taso ≥3 → poikkeuksellinen pitkän tähtäimen lupaus') + '" style="font-size:10px;padding:2px 9px;border-radius:20px;background:var(--teal);color:#fff">' + masterT('⭐ Underdog') + '</span>');
    }
  }
  const _identHtml = _identChips.length ? '<div style="grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin:-8px 0 6px">' + _identChips.join('') + '</div>' : '';

  // ── §C ADAR-LOHKO — peliäly valmentajalle (adar_viimeisin {a,d,ac,r}, gate ≥3 havaintoa, pikakentistä) ──
  let _adarHtml = '';
  const _av = p.adar_viimeisin;
  if (_av && (_av.a != null || _av.d != null || _av.ac != null || _av.r != null)) {
    // §4 Malli A (PR #266): jaa osat ikätason (band) ja ikätason yli menevään (bonus). yht laskee vain band-osista.
    const _ikaC = (typeof _devIkaSp === 'function') ? _devIkaSp(p).ika : null;
    /* PORRAS voittaa iän: ikä on vain ohje, ja valmentaja on voinut nostaa tai laskea porrasta. */
    const _porrasC = p.havainto_porras || null;
    const _band = (typeof tmAdarBand === 'function') ? tmAdarBand(_ikaC, _porrasC) : ['a', 'd', 'ac', 'r'];
    /* YKSI NIMIKANONI (lib). Master käytti omia nimiä "Havaitse/Päätä/Toimi/Arvioi", jolloin sama
       ulottuvuus esiintyi eri nimellä eri näkymissä. */
    const _KAN = (typeof TM_ADAR_NIMET !== 'undefined' && TM_ADAR_NIMET.valmentaja)
      || { a: 'Havainnointi', d: 'Päätöksenteko', ac: 'Toteutus', r: 'Reagointi' };
    const _NIMET = { a: masterT(_KAN.a), d: masterT(_KAN.d), ac: masterT(_KAN.ac), r: masterT(_KAN.r) };
    const _osatAll = ['a', 'd', 'ac', 'r'].filter(k => _av[k] != null).map(k => [k, _NIMET[k], _av[k]]);
    const _osat  = _osatAll.filter(o => _band.indexOf(o[0]) >= 0);   // lasketaan D4:ään
    const _bonus = _osatAll.filter(o => _band.indexOf(o[0]) < 0);    // ikätason yli — ei laske D4:ään
    const _gate = (p.adar_havaintoja || 0) >= 3;
    /* Merkki kertoo PORTAAN, ei osien määrää. Osien määrä oli harhaanjohtava: se nousi aina kun
       joku kirjasi ylimääräisen ulottuvuuden, vaikka pelaajan porras ei ollut muuttunut. */
    const _porrasNyt = _porrasC || ((typeof tmAdarIkaPorras === 'function') ? tmAdarIkaPorras(_ikaC) : 4);
    const _tasoMerkki = masterT('Porras') + ' ' + _porrasNyt + ' / 4';
    /* Uusin portaalle nostettu ulottuvuus merkitään — sen luku on vasta kehittymässä. Ehto on
       sama kuin Pelaaja_v7:ssä: merkki vaatii TALLENNETUN portaan (ikäsuositus koskee kaikkia,
       joten sillä merkittäisiin jokaisen 13+ -pelaajan Toteutus "uudeksi") eikä uusimmasta
       ulottuvuudesta saa olla vielä kolmea havaintoa. */
    const _ehdHistC = (p.havainto_porras_ehdotus && p.havainto_porras_ehdotus.hist) || [];
    const _uusinDim = (_porrasC && _porrasC > 1 && _ehdHistC.length < 3
      && typeof TM_ADAR_PORTAAT !== 'undefined' && TM_ADAR_PORTAAT[_porrasC])
      ? TM_ADAR_PORTAAT[_porrasC][_porrasC - 1] : null;
    const _bar = o => {
      const v = o[2], pct = Math.max(8, Math.min(100, v / 3 * 100));
      const col = tmTasoCss(v, { asteikko: 'eerikkila3' });
      const uusi = (o[0] === _uusinDim) ? ' <span style="color:var(--teal);font-size:8px">' + masterT('uusi') + '</span>' : '';
      return '<div style="flex:1;min-width:68px"><div style="font-size:9px;color:var(--ink3);margin-bottom:2px">' + o[1] + uusi + '</div>'
        + '<div style="height:5px;border-radius:3px;background:rgba(255,255,255,.05)"><div style="height:5px;border-radius:3px;width:' + pct + '%;background:' + col + '"></div></div>'
        + '<div style="font-size:10px;color:' + col + ';margin-top:1px;font-family:var(--font-m,monospace)">' + v + '/3</div></div>';
    };
    let _vah = null, _heik = null;
    _osat.forEach(o => { if (!_vah || o[2] > _vah[2]) _vah = o; if (!_heik || o[2] < _heik[2]) _heik = o; });
    const _bonusHtml = _bonus.length
      ? '<div style="font-size:10px;color:var(--amber);margin-top:7px">' + masterT('🌟 Ikätason yli: ') + _bonus.map(o => o[1] + ' <span style="font-family:var(--font-m,monospace)">' + o[2] + '/3</span>').join(' · ') + ' <span style="color:var(--ink3)">' + masterT('— ei laske D4:ään (§4)') + '</span></div>'
      : '';
    _adarHtml = '<div style="grid-column:1/-1;margin-top:10px;padding-top:10px;border-top:.5px solid rgba(242,239,230,.1)">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px;flex-wrap:wrap">'
      + '<span style="font-size:11px;letter-spacing:.04em;color:var(--ink2);text-transform:uppercase">' + masterT('Peliäly') + (_av.yht != null ? ' <span style="color:var(--teal);font-family:\'Cormorant Garamond\',serif;font-size:15px">' + _av.yht + '<span style="font-size:11px;color:var(--ink3)">/3</span></span>' : '') + ' <span style="font-size:9px;color:var(--ink3);border:.5px solid var(--border);border-radius:10px;padding:1px 7px;letter-spacing:.02em">' + _tasoMerkki + '</span></span>'
      + '<span style="font-size:10px;color:var(--ink3)">' + (p.adar_havaintoja || 0) + masterT(' havaintoa') + (_gate ? '' : masterT(' · ⚠ ≥3 luotettavuuteen')) + ' · <span style="color:var(--teal);cursor:pointer" onclick="openDrill(\'adar\',\'' + _mEsc(String(p.id || '')) + '\')">' + masterT('Peliälytyökalu →') + '</span></span></div>'
      + (_gate
          ? '<div style="display:flex;gap:10px;flex-wrap:wrap">' + _osat.map(_bar).join('') + '</div>'
            + (_vah && _heik && _vah !== _heik ? '<div style="font-size:10px;color:var(--ink3);margin-top:7px">' + masterT('💪 Vahvin: ') + '<span style="color:var(--teal)">' + _vah[1] + '</span> · 🎯 ' + masterT('Kehitä: ') + '<span style="color:var(--amber)">' + _heik[1] + '</span></div>' : '')
            + _bonusHtml
          : '<div style="font-size:11px;color:var(--ink3)">' + masterT('Peliälyarvio tarkentuu kun havaintoja on ≥3 (') + (p.adar_havaintoja || 0) + masterT('/3). Yksittäiset havainnot ovat peliälytyökalussa.') + '</div>')
      + '</div>';
  }

  // ── §C RISTIINARVIO (Vaihe B, multi-rater) — arvioijat + yhtenevyys + talenttinosto ─────────
  // Anti-anchoring: nykyinen arvioija näkee muiden PISTEET vasta kun on itse arvioinut kuluvan
  // kalenterikuukauden aikana (ei DOM-vuotoa — lukossa pisteitä ei renderöidä). SA ohittaa
  // (oversight). VAIN Master §C + VP — EI pelaajanäkymässä (§7.22).
  let _ristiinHtml = '';
  const _arvioijat = Array.isArray(p.adar_arvioijat) ? p.adar_arvioijat : [];
  if (_arvioijat.length) {
    const _ROOLIM = { valmentaja: masterT('Valmentaja'), talenttivalmentaja: masterT('Talenttiv.'), vp: masterT('VP'), urheilutoimenjohtaja: masterT('UTJ'), fysiikkavalmentaja: masterT('Fys.val.'), fysioterapeutti: masterT('Fysiot.') };
    const _DIMK = { a: 'H', d: 'P', ac: 'T', r: 'A' };   // Havaitse/Päätä/Toimi/Arvioi
    const _avoin = _superAdmin || (typeof tmAdarRistiinarvioAvoin === 'function'
      ? tmAdarRistiinarvioAvoin(_arvioijat, _uid, Date.now())
      : true);
    const _yhtTaso = p.adar_yhtenevyys_taso || null;
    const _yhtLbl = { korkea: masterT('🤝 Yhtenevyys korkea'), keskiverto: masterT('≈ Yhtenevyys keskiverto'), matala: masterT('⚠ Yhtenevyys hajoaa') }[_yhtTaso] || '';
    const _sig = (typeof tmAdarTalenttiSignaali === 'function')
      ? tmAdarTalenttiSignaali({ arvioijia: p.adar_arvioijia || _arvioijat.length, yhtenevyysTaso: _yhtTaso, yht: (p.adar_viimeisin ? p.adar_viimeisin.yht : null) })
      : false;
    let _rows;
    if (_avoin) {
      _rows = _arvioijat.map(a => {
        const dims = ['a', 'd', 'ac', 'r'].filter(k => a.pisteet && a.pisteet[k] != null)
          .map(k => _DIMK[k] + a.pisteet[k]).join(' ');
        const rlbl = _ROOLIM[a.rooli] || (a.rooli || masterT('Arvioija'));
        return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:2px 0">'
          + '<span style="color:var(--ink2)">' + _mEsc(a.nimi || masterT('Arvioija')) + ' <span style="color:var(--ink3);font-size:9px">' + _mEsc(rlbl) + '</span></span>'
          + '<span style="font-family:var(--font-m,monospace);color:var(--teal);white-space:nowrap">' + dims + '</span></div>';
      }).join('');
    } else {
      // LUKKO — pisteitä EI renderöidä DOMiin ennen omaa tallennusta (anti-anchoring datatasolla).
      _rows = '<div style="font-size:11px;color:var(--amber)">' + masterT('🔒 Arvioi ensin — näet muiden arviot oman tallennuksen jälkeen (') + _arvioijat.length + ' ' + masterT(_arvioijat.length === 1 ? 'arvioija' : 'arvioijaa') + masterT(' tässä kuussa).') + '</div>';
    }
    _ristiinHtml = '<div style="grid-column:1/-1;margin-top:8px;padding:9px 11px;background:rgba(42,93,176,.06);border:.5px solid rgba(42,93,176,.2);border-radius:8px">'
      + '<div style="font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:#2A5DB0;margin-bottom:5px">' + masterT('Ristiinarvio · ') + (p.adar_arvioijia || _arvioijat.length) + ' ' + masterT((p.adar_arvioijia || _arvioijat.length) === 1 ? 'arvioija' : 'arvioijaa') + '</div>'
      + _rows
      + (_avoin && _yhtLbl ? '<div style="font-size:10px;color:var(--ink3);margin-top:5px">' + _yhtLbl + '</div>' : '')
      + (_avoin && _sig ? '<div style="font-size:11px;color:var(--teal);margin-top:6px;font-weight:600">' + masterT('💎 Vahva ristiinarvio — peruste talenttinostolle · ') + '<span onclick="_ehdotaTalentti(\'' + _mEsc(p.id || '') + '\')" style="cursor:pointer;text-decoration:underline">' + masterT('Ehdota →') + '</span></div>' : '')
      + '</div>';
  }

  // ── Peliälyarvion LUOTETTAVUUS (Pelitilanne Vaihe 1) — vain valmentajalle; ei pelaajalle/huoltajalle (§7.22). Lib: tm_adar_pelitilanne.js, tekstit lib-kartasta (tmLibT).
  if (typeof window.tmAdarLuotettavuusHTML === 'function') _ristiinHtml += window.tmAdarLuotettavuusHTML(p, Date.now(), (typeof tmLibT === 'function' ? tmLibT : null), _mEsc);

  // ── Trendi Vaihe 2 — KEHITYSKAARI (mittaushistoria). Puhdas render p.hh_historia/tki_historia:sta.
  // Suunta pienempi_parempi:stä, ⚡ nopeus Δ/Δt, per-D taso RAAOISTA (laskeD1/D2Joustava per piste,
  // ikä mittaushetkellä → johdonmukainen kortin kanssa), jaksofokus-sidos, <2 pistettä → fallback. §28 pre-PHV.
  let _kehityskaariHtml = '';
  if (typeof tmKaariRenderFull === 'function'
      && ((p.hh_historia && p.hh_historia.length) || (p.tki_historia && p.tki_historia.length))) {
    const _ksIsp = _devIkaSp(p);
    const _ksTasoFn = (fn) => (pt) => {
      try {
        const ika = (typeof normiIka === 'function') ? normiIka(p.syntymaVuosi, pt.pvm, p.joukkue) : _ksIsp.ika;
        return fn(pt, ika, _ksIsp.sp);
      } catch (e) { return null; }
    };
    const _ksVv = (typeof tkVaadittuVuosivauhti === 'function' && _ksIsp.ika != null)   // §4.2 TKI-divergenssin "~X s/v"
      ? tkVaadittuVuosivauhti(_ksIsp.ika, (_ksIsp.sp === 'N' ? 'T' : 'P'), 'hopea') : null;
    const _ksCtx = {
      esc: _mEsc, phvTila: tmPhvKoodi(p), pvmFn: _pvmFiM, tkiVuosivauhti: _ksVv,
      tasoFns: {
        d1_taso: (typeof laskeD1Joustava === 'function') ? _ksTasoFn(laskeD1Joustava) : null,
        d2_taso: (typeof laskeD2Joustava === 'function') ? _ksTasoFn(laskeD2Joustava) : null
      }
    };
    _kehityskaariHtml = '<div style="grid-column:1/-1;margin-top:10px;padding-top:10px;border-top:.5px solid rgba(242,239,230,.1)">'
      + '<div style="font-size:11px;letter-spacing:.04em;color:var(--ink2);text-transform:uppercase;margin-bottom:4px">' + masterT('🗺 Kehityskaari ') + '<span style="color:var(--ink3);text-transform:none;letter-spacing:0">' + masterT('· mihin suuntaan') + '</span></div>'
      + tmKaariRenderFull(p, _ksCtx) + '</div>';
  }

  // ── §B1/B3 RESEPTI — "mitä tehdä" -ulostulo diagnoosista: T-harjoite moottorista (harjoitelogiikka_v4).
  // Näytä kun tekninen kehityskohde on dataa (TKI/TSI/H-H). null pankki → moottorin sisäinen PANKKI (§A7). try/catch.
  let _reseptiHtml = '';
  if (!c.vainNaytto && typeof valitsePaivanHarjoite === 'function' && typeof laskeTekninenKehityskohde === 'function') {
    try {
      const _kk = laskeTekninenKehityskohde(p);
      if (_kk && _kk.lahde !== 'oletus') {   // §B3: näytä kun diagnoosissa on dataa (ei pelkkä universaali oletus)
        const _iso = tmPaivaIso(new Date());
        const _t = valitsePaivanHarjoite(p, null, _iso);
        if (_t && _t.nimi) {
          const _lahdeLbl = ({ tki: 'TKI', tsi: 'TSI', hh: 'H-H' }[_kk.lahde] || '');
          _reseptiHtml = '<div style="grid-column:1/-1;margin-top:10px;padding:12px 14px;background:rgba(40,176,144,.06);border:.5px solid rgba(40,176,144,.2);border-radius:8px">'
            + '<div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--teal);margin-bottom:4px">' + masterT('⚽ Resepti — T-harjoite tänään') + (_lahdeLbl ? masterT(' · lähde ') + _lahdeLbl : '') + '</div>'
            + '<div style="font-size:14px;color:var(--ink);font-weight:500">' + _t.nimi + '</div>'
            + (_t.ohje ? '<div style="font-size:12px;color:var(--ink2);margin-top:3px;line-height:1.5">' + _t.ohje + '</div>' : '')
            + (_t.cue ? '<div style="font-size:11px;color:var(--ink3);margin-top:4px">💡 ' + _t.cue + '</div>' : '')
            + (_t.yt ? '<div style="font-size:11px;margin-top:5px"><a href="https://www.youtube.com/watch?v=' + encodeURIComponent(_t.yt) + '" target="_blank" rel="noopener noreferrer" style="color:var(--teal);text-decoration:none">' + masterT('📹 Katso harjoitevideo') + '</a></div>' : '')
            + '</div>';
        }
      }
    } catch (e) { console.warn('[resepti B1]', e.message); }
  }

    // §C D3 PSYKOLOGINEN -lohko: d3_taso + 5 ulottuvuutta (valmentaja/pelaaja) + Arvioi-nappi (pikakentät §26)
  let _d3Html = '';
  {
    const d3v = p.d3_viimeisin;
    const onD3 = d3v && d3v.pisteet && Object.keys(d3v.pisteet).length;
    const _d3rivi = d => {
      const pt = (onD3 && d3v.pisteet[d.key]) || {};
      const avg = pt.avg != null ? pt.avg : null;
      const col = tmTasoCss(avg, { asteikko: 'hh5' });
      const lahde = (pt.valmentaja != null && pt.pelaaja != null) ? ('V' + pt.valmentaja + '·P' + pt.pelaaja) : (pt.valmentaja != null) ? ('valm. ' + pt.valmentaja) : (pt.pelaaja != null) ? ('pelaaja ' + pt.pelaaja) : '';
      return '<div style="display:flex;align-items:center;gap:10px;padding:3px 0;font-size:12px"><span style="flex:1;color:var(--ink2)">' + d.nimi + '</span><span style="font-size:9px;color:var(--ink3)">' + lahde + '</span><span style="font-family:var(--font-m,monospace);color:' + col + ';min-width:24px;text-align:right">' + (avg != null ? avg : '—') + '</span></div>';
    };
    _d3Html = '<div style="grid-column:1/-1;margin-top:10px;padding-top:10px;border-top:.5px solid rgba(242,239,230,.1)">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px;flex-wrap:wrap">'
      + '<span style="font-size:11px;letter-spacing:.04em;color:var(--ink2);text-transform:uppercase">' + masterT('D3 Psykologinen') + (onD3 && p.d3_taso != null ? ' <span style="color:var(--teal);font-family:\'Cormorant Garamond\',serif;font-size:15px">' + p.d3_taso + '<span style="font-size:11px;color:var(--ink3)">/5</span></span>' : '') + (onD3 && p.d3_varmuus && typeof d3VarmuusChip === 'function' ? ' ' + d3VarmuusChip(p.d3_varmuus) : '') + (typeof _mSelBtn === 'function' ? _mSelBtn('d3') : '') + '</span>'
      + '<button onclick="_avaaD3Arvio(\'' + p.id + '\')" style="background:var(--teal);color:#fff;border:none;border-radius:6px;padding:4px 12px;font-size:11px;cursor:pointer">' + (onD3 ? masterT('Päivitä arvio') : masterT('Arvioi')) + '</button></div>'
      + (onD3 ? _D3_DIMS.map(_d3rivi).join('') : '<div style="font-size:11px;color:var(--ink3)">' + masterT('Psyykkinen profiili täydentyy kun arvioit pelaajan + pelaaja tekee itsearvion.') + '</div>')
      // §D3 kalibraatio (malli A): kolmen näkökulman vertailu näkyy kun VP on arvioinut. Kuilu → mentorointihenkinen vihje.
      + (onD3 && d3v.pisteet && Object.keys(d3v.pisteet).some(k => d3v.pisteet[k] && d3v.pisteet[k].vp != null) && typeof renderD3VertailuHTML === 'function'
          ? renderD3VertailuHTML(d3v.pisteet)
            + (typeof d3VpKuiluPelaajalla === 'function' && d3VpKuiluPelaajalla(d3v.pisteet)
                ? '<div style="font-size:10px;color:var(--amber);margin-top:4px">' + masterT('⚠ Arviosi eroaa VP:n näkemyksestä — hyvä keskustelunaihe kalibrointiin.') + '</div>' : '')
          : '')
      + '</div>';
  }
  // Vaihe 4a — teknis-taktinen toimintakortti (konsepti→cue→harjoite, lib tm_teknistaktiset.js). Best-effort.
  let _ttHtml = '';
  try { if (!c.vainNaytto && typeof _ttKorttiHTML === 'function') _ttHtml = _ttKorttiHTML(p); } catch (e) { console.warn('[tt4a]', e && e.message); }
  return { nimi, ika, testPvm, testIka, stats, lisaHtml, _kehHtml, _sekHtml, _identHtml, _adarHtml, _ristiinHtml, _kehityskaariHtml, _reseptiHtml, _d3Html, _ttHtml };
  }

  /* ── Kasvu ja kypsyys (13 §6): biologinen ikä / PHV-ikä / kasvutahti pikakentistä (§26) — vain henkilökunnalle, mittauspäivä aina luvun vieressä. Master _ktKasvuHTML sellaisenaan ── */
  function tmNayttoKasvuHTML(p, c) {
    var masterT = c.t, _mEsc = c.esc;
    var bio = p.biologinenIka_viimeisin || {}, rivit = [];
    if (bio.maturity_offset != null) rivit.push(masterT('maturity offset') + ' ' + String(bio.maturity_offset).replace('.', ','));
    if (bio.phv_ika != null) rivit.push(masterT('PHV-ikä (arvio)') + ' ' + String(bio.phv_ika).replace('.', ',') + ' v');
    var cmv = (p.kasvutahti_cm_v != null) ? p.kasvutahti_cm_v : bio.kasvutahti_cm_v;
    if (cmv != null) rivit.push(masterT('kasvu') + ' ' + String(cmv).replace('.', ',') + ' cm/v');
    if (!rivit.length) return '';
    return '<div style="grid-column:1/-1;font-size:12px;color:var(--ink2)">' + _mEsc(rivit.join(' · ')) + (bio.pvm ? ' <span style="color:var(--ink3)">· ' + _mEsc(masterT('mitattu ')) + _mEsc(tmNayttoPvmFi(bio.pvm)) + '</span>' : '') + '</div>';
  }

  /* ── Näytön lohkot (Master _ktNayttoHTML sellaisenaan). c.osat = valmiiksi laskettu tmNayttoOsat; c.joukkue = oletusjoukkue; c.voiNahda(p) = _prVoiNahda ── */
  function tmNayttoLohkotHTML(p, c) {
    var masterT = c.t, e = c.esc, o = c.osat || tmNayttoOsat(p, c), pid = e(p.id), nakyy = (typeof c.voiNahda === 'function' && c.voiNahda(p));
    var _ktOsio = function (otsikko) { return '<div class="kt-otsikko-pieni" style="grid-column:1/-1;margin-top:14px">' + e(masterT(otsikko)) + '</div>'; };
    var _ktKasvuHTML = function (pp) { return tmNayttoKasvuHTML(pp, c); };
    var _mStatsHTML = function (s) { return tmNayttoStatsHTML(s, masterT); };
    var _joukkue = c.joukkue;
  const perus = '<div style="grid-column:1/-1"><div class="pinfo-sub">' + e(o.ika + ' · ' + (p.pelipaikka || '—') + ' · ' + (p.joukkue || _joukkue || '—')) + (o.testPvm ? ' · <span style="color:var(--ink3)">' + (o.testIka ? e(o.testIka) : e(masterT('testattu ')) + e(o.testPvm)) + '</span>' : '') + '</div></div>' + o.lisaHtml;
  const raportti = nakyy ? '<div style="grid-column:1/-1;margin:0 0 10px"><button type="button" onclick="_avaaPelaajaraportti(\'' + pid + '\')" style="background:var(--surface);border:.5px solid var(--teal);color:var(--teal);border-radius:7px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer">' + e(masterT('📋 Pelaajaraportti + tavoitteet')) + '</button>' + ((typeof TM_SANASTO_INFO !== 'undefined' && TM_SANASTO_INFO.tmSanastoInfoHTML) ? TM_SANASTO_INFO.tmSanastoInfoHTML('pelaajaraportti', { esc: e, t: masterT, id: 'si-pelaajaraportti-' + pid }) : '') + '</div>' : '';
  return '<div class="pinfo-card" data-kt-nayttö>' + _ktOsio('Perustiedot') + perus + raportti
    + ((o._identHtml || _ktKasvuHTML(p)) ? _ktOsio('Kasvu ja kypsyys') + o._identHtml + _ktKasvuHTML(p) + '<div style="grid-column:1/-1;margin:6px 0"><button type="button" class="kt-nappi" data-kt-mittaa onclick="_msFyysSuunnitteleMittaus(\'' + pid + '\')">' + e(masterT('📏 Suunnittele mittaus → Testaus')) + '</button></div>' : '')
    + _ktOsio('Mittaukset') + _mStatsHTML(o.stats) + o._kehHtml + o._sekHtml + o._kehityskaariHtml
    + ((o._adarHtml || o._ristiinHtml) ? _ktOsio('Pelihavainnot') + o._adarHtml + o._ristiinHtml : '')
    + _ktOsio('Psyykkinen (D3)') + o._d3Html
    + '<div id="_mKertymaWrap" style="grid-column:1/-1;display:contents">' + _ktOsio('Harjoittelu') + '<div id="_mKertymaCard" style="grid-column:1/-1"></div></div>'
    + (nakyy ? _ktOsio('Mitä pelaajan tulee osata') + '<div id="_mMitaCard" class="mkt-scope" style="grid-column:1/-1"></div>' : '')
    + '<div style="grid-column:1/-1;margin-top:16px"><button type="button" class="kt-nappi" data-kt-vanha onclick="_ktVanhaNakyma(\'' + pid + '\')">' + e(masterT('Avaa pelaajan elämäkerta')) + '</button></div>'   // elämäkerran aikajana/narratiivi: vanha näkymä kunnes poisto-PR
    + '</div>';
  }

  /* ── Mitä pelaajan tulee osata (Master _mMitaOsattavaHTML sellaisenaan). c.ttItems/ttS/ttKys/ttHarj/ttNormPositio = konseptikerroksen apurit (tmNayttoTtApu) ── */
  function tmNayttoMitaOsattavaHTML(p, c) {
  if (!p || typeof tmTtItems !== 'function') return '';
  const masterT = c.t, _mEsc = c.esc, _devIkaSp = tmNayttoDevIkaSp, _ttNormPositio = tmNayttoNormPositio, _mTtItems = c.ttItems, _ttS = c.ttS, _mTtKysNayta = c.ttKys, _mTtHarjNayta = c.ttHarj;
  const _ika = (typeof _devIkaSp === 'function') ? _devIkaSp(p).ika : null;
  const posCode = p.tt_positio_aktiivinen || (typeof _ttNormPositio === 'function' ? _ttNormPositio(p.positio || p.pelipaikka) : null);
  const items = _mTtItems({ ika: _ika, joukkue: p.joukkue, positio: posCode, tt_positio_aktiivinen: posCode, syntymaVuosi: p.syntymaVuosi }).map(function (it) { return _ttS().konsepti(it); });   // näyttökopiot
  if (!items.length) return '';
  const esc = _mEsc;
  const aktiivinen = (p.jaksofokus && p.jaksofokus.konsepti_avain) || null;
  const katetut = {};
  (p.jaksofokus_historia || []).forEach(function (hh) { if (hh && hh.konsepti_avain) katetut[hh.konsepti_avain] = 1; });
  const rivi = function (it) {
    const kys = _mTtKysNayta(it.avain);
    const harj = _mTtHarjNayta(it.avain);
    const akt = (it.avain === aktiivinen), kat = !akt && katetut[it.avain];
    const tl = akt ? masterT('Aktiivinen') : kat ? masterT('Katettu') : masterT('Avoin');
    const tc = akt ? 'var(--teal)' : 'var(--ink3)';
    return '<div style="padding:6px 0;border-bottom:.5px solid var(--border)">'
      + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><span style="font-size:12px;font-weight:600;color:var(--ink2)">' + esc(it.koodi) + ' · ' + esc(it.nimi) + '</span>'
      + '<span style="font-size:9.5px;color:' + tc + (akt ? ';font-weight:700' : '') + ';white-space:nowrap">' + tl + '</span></div>'
      + (kys.length ? '<div style="font-size:11px;color:var(--ink3);margin-top:2px"><span style="color:var(--blue)">?</span> ' + esc(kys[0]) + '</div>' : '')
      + (harj.length ? '<div style="font-size:10.5px;color:var(--ink3);margin-top:1px">⚽ ' + esc(String(harj[0].painopisteet || harj[0].konseptipeli || '').slice(0, 60)) + '</div>' : '')
      + '</div>';
  };
  const hav = items.filter(function (it) { return it.avain === 'y_h0'; });
  const hyok = items.filter(function (it) { return it.faasi === 'hyokkays' && it.avain !== 'y_h0'; });
  const puol = items.filter(function (it) { return it.faasi === 'puolustus'; });
  const muu = items.filter(function (it) { return it.faasi !== 'hyokkays' && it.faasi !== 'puolustus' && it.avain !== 'y_h0'; });
  let h = '<details class="mkt-scope" style="margin-top:4px"><summary style="cursor:pointer;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3);padding:4px 0">' + masterT('📚 Mitä pelaajan tulee osata (') + items.length + ')</summary><div style="margin-top:6px">';
  if (hav.length) h += '<div style="font-size:10px;color:#c060a8;font-weight:700;text-transform:uppercase;margin:6px 0 2px">' + masterT('👁 Havainnointi (läpileikkaava)') + '</div>' + hav.map(rivi).join('');
  if (hyok.length) h += '<div style="font-size:10px;color:var(--teal);font-weight:700;text-transform:uppercase;margin:10px 0 2px">' + masterT('Hyökkäys') + '</div>' + hyok.map(rivi).join('');
  if (puol.length) h += '<div style="font-size:10px;color:var(--blue);font-weight:700;text-transform:uppercase;margin:10px 0 2px">' + masterT('Puolustus') + '</div>' + puol.map(rivi).join('');
  if (muu.length) h += '<div style="font-size:10px;color:var(--amber);font-weight:700;text-transform:uppercase;margin:10px 0 2px">' + masterT('Pelipaikka') + '</div>' + muu.map(rivi).join('');
  h += '</div></details>';
  return h;
  }

  /* Pelipaikka → TT-koodi (Master _ttNormPositio sellaisenaan) */
  function tmNayttoNormPositio(val) {
    if (!val || typeof TM_TT_PELIPAIKAT === 'undefined') return null;
    const s = String(val).trim(); if (!s) return null;
    const up = s.toUpperCase();
    if (TM_TT_PELIPAIKAT[up]) return up;   // jo koodi
    const low = s.toLowerCase();
    for (const k in TM_TT_PELIPAIKAT) {
      const nimi = (TM_TT_PELIPAIKAT[k].nimi || '').toLowerCase();
      if (nimi && (low === nimi || nimi.indexOf(low) === 0 || low.indexOf(nimi) === 0)) return k;
    }
    // yleisiä lyhyt-/aliasmuotoja
    const alias = { 'keskikenttä': 'KK', 'keskikentta': 'KK', 'keskari': 'KK', 'hyökkääjä': 'KH', 'hyokkaaja': 'KH', 'kärki': 'KH', 'laita': 'LA', 'laitahyökkääjä': 'LA', 'puolustaja': 'T', 'keskuspuolustaja': 'T', 'maalivahti': 'MV', 'veskari': 'MV' };
    return alias[low] || null;
  }

  /* Konseptikerroksen näyttöapurit (Master _mTtItems/_ttS/_mTtKys/_mTtKysNayta/_mTtHarjNayta sellaisenaan); sid = seuraId tai null (demo) */
  function tmNayttoTtApu(sid) {
    var items = function (pp) {
      var kaanon = (typeof tmTtItems === 'function') ? tmTtItems(pp) : [];
      return (typeof tmKonseptiListaa === 'function') ? tmKonseptiListaa(kaanon, sid) : kaanon;
    };
    var ttS = function () { try { return tmTtSv((typeof tmNykyinenKieli === 'function') ? tmNykyinenKieli() : 'fi'); } catch (e) { return tmTtSv('fi'); } };
    var kys = function (avain) {
      var k = (typeof tmKonseptiResolvoi === 'function') ? tmKonseptiResolvoi(avain, sid) : null;
      var raaka = (k && Array.isArray(k.kysymykset)) ? k.kysymykset : ((typeof tmTtKysymykset === 'function') ? tmTtKysymykset(avain) : []);
      return ttS().kys(avain, raaka);
    };
    var harj = function (avain) {
      var raaka = (typeof TM_TT_HARJOITTEET !== 'undefined') ? TM_TT_HARJOITTEET[String(avain || '').toUpperCase().replace(/_/g, '-')] : null;
      return ttS().harj(avain, (typeof tmTtHarjoitteet === 'function') ? tmTtHarjoitteet(avain) : [], raaka);
    };
    return { ttItems: items, ttS: ttS, ttKys: kys, ttHarj: harj };
  }

  /* Harjoittelu-lohko (K35-6f): kooste luetaan, ei lasketa. Master _mKertymaTayta sellaisenaan; c: { doc, db, sid, demo, t, kirjaamatonId(p, k) → id|null } */
  function tmNayttoKertymaTayta(p, c) {
    var el = c.doc.getElementById('_mKertymaCard'); if (!el) return Promise.resolve();
    var N = root.TM_HARJOITUSKERTYMA_NAKYMA, HK = root.TM_HARJOITUSKERTYMA;
    if (!c.doc.getElementById('hkCss')) { var st = c.doc.createElement('style'); st.id = 'hkCss'; st.textContent = N.tmKertymaCSS(); c.doc.head.appendChild(st); }
    if (c.demo || !c.sid) { el.innerHTML = N.tmKertymaMasterHTML(HK.tmKertyma({ tapahtumat: [], nyt: Date.now() }), { t: c.t }); return Promise.resolve(); }
    return HK.tmKertymaLueKooste(c.db, c.sid, p.id, Date.now()).then(function (k) {
      var e = c.doc.getElementById('_mKertymaCard'), w = c.doc.getElementById('_mKertymaWrap'); if (w && !k) w.style.display = 'none';
      if (e) { var _eid = k && typeof c.kirjaamatonId === 'function' ? c.kirjaamatonId(p, k) : null; e.innerHTML = k ? N.tmKertymaMasterHTML(k, { t: c.t, kirjaaLinkki: _eid ? "calEventClick('" + String(_eid).replace(/'/g, '') + "')" : null }) : ''; }   // puuttuva kooste → tyhjä tila (näytetään); vain lukuvirhe (null) → lohko ja otsikko piiloon
    });
  }

  /* ── UUSI SIVU: kehys. Todistekorttien paikka (K4, tyhjä) + "Näytä kaikki mittaukset" -avattava (oletus auki kunnes kortit tulevat) ── */
  function tmNayttoKehysHTML(lohkot, c) {
    var e = c.esc;
    return '<div class="kn-naytto" data-kn-naytto><div class="kn-kortit" data-kn-kortit></div>'
      + '<details class="kn-kaikki" data-kn-kaikki open><summary class="kn-yhteenveto">' + e(_t(c, 'kn_kaikki')) + '</summary><div class="kn-lohkot mkt-scope">' + lohkot + '</div></details></div>';
  }
  function tmNayttoTilaHTML(tila, c) {
    var e = c.esc;
    if (tila === 'virhe') return '<div class="kn-naytto" data-kn-naytto data-kn-tila="virhe" role="alert"><p class="kn-viesti"><b>' + e(_t(c, 'kn_virhe')) + '</b> ' + e(_t(c, 'kn_virhe_ohje')) + '</p>'
      + (c.yritaFn ? '<button type="button" class="kt-btn g" data-kn-yrita style="min-height:44px" onclick="' + e(c.yritaFn) + '()">' + e(_t(c, 'kn_yrita')) + '</button>' : '') + '</div>';
    return '<div class="kn-naytto" data-kn-naytto data-kn-tila="lataa" role="status"><p class="kn-viesti">' + e(_t(c, 'kn_lataa')) + '</p></div>';
  }
  function tmNayttoCss() {
    return '.kn-naytto{padding:4px 0 24px}.kn-viesti{font-size:14px;line-height:1.5;color:var(--ink2);margin:12px 0}.kn-yhteenveto{cursor:pointer;font-size:15px;font-weight:600;color:var(--text);padding:12px 0;min-height:44px;box-sizing:border-box}'
      + '.kn-naytto .pinfo-card{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px 14px}';
  }

  var API = { FI: FI, D3_DIMS: D3_DIMS, tmNayttoPvmFi: tmNayttoPvmFi, tmNayttoTkLajiNimi: tmNayttoTkLajiNimi, tmNayttoTkiMerkki: tmNayttoTkiMerkki, tmNayttoDeltaBadge: tmNayttoDeltaBadge, tmNayttoDevIkaSp: tmNayttoDevIkaSp,
    tmNayttoSelBtn: tmNayttoSelBtn, tmNayttoStatsHTML: tmNayttoStatsHTML, tmNayttoOsat: tmNayttoOsat, tmNayttoKasvuHTML: tmNayttoKasvuHTML, tmNayttoLohkotHTML: tmNayttoLohkotHTML,
    tmNayttoMitaOsattavaHTML: tmNayttoMitaOsattavaHTML, tmNayttoTtApu: tmNayttoTtApu, tmNayttoNormPositio: tmNayttoNormPositio, tmNayttoKertymaTayta: tmNayttoKertymaTayta, tmNayttoKehysHTML: tmNayttoKehysHTML, tmNayttoTilaHTML: tmNayttoTilaHTML, tmNayttoCss: tmNayttoCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_NAYTTO_LOHKOT = API;
})(typeof window !== 'undefined' ? window : this);
