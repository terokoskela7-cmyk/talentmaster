/* ════════════════════════════════════════════════════════════════════════
   tm_joukkuejasenyys_tarkistus.js — "Tarkista joukkuejäsenyydet" (Excel_Tuonti, vain Super Admin; §7.18, Tero 8.10.2026).
   Kuiva-ajo seuroittain: lukumäärät ristiriitatyypeittäin, EI nimiä. Yksiselitteiset korjaukset ja EPÄSELVÄT erikseen (pelkät joukkuetunnisteet + lukumäärät).
   Korjaus = NIMEN mukainen joukkue (joukkueet[] = [nimen joukkue], kaikki neljä kenttää yhdessä). Esim. Sibbo: joukkue = "2014 Blå", joukkueet[] = [p12] → joukkueet[] = [sibbovargarna_2014_bl].
   Epäselvä (esim. Blå-pelaaja jolla P11-tunniste ja ikäluokka ei täsmää): oletus = vain nimen joukkue, mutta kirjoitetaan VASTA erillisellä vahvistuksella (Joakim vahvistaa).
   Tilaton: korjaus lukee seuran tuoreeltaan (ei nojaa kuiva-ajon välimuistiin) ja kirjoittaa vain ne pelaajat, jotka ovat yhä samassa tilassa.
   Logiikka lib/tm_joukkue.js (tmJasenyysDiagnoosi/tmJasenyysRaportti). deps: { db }. Dual-export: module.exports || window.TM_JASENYYS_TARKISTUS.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _J() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_joukkue.js'); } catch (e) { /* ei */ } return root; }
  var NIMET = { ehja: 'ehjä', tyhja: 'ei joukkuetta lainkaan', id_puuttuu: 'tunniste puuttuu (nimi tunnettu)', nimi_idn_paikalla: 'nimi tunnisteen paikalla', vanha_id: 'nimi ja tunniste eri joukkueita', nimi_puuttuu: 'nimi puuttuu (tunniste tunnettu)', nimi_tuntematon: 'nimi ei vastaa joukkuetta (tunniste ok)', orpo: 'orpo (nimi ei vastaa mitään joukkuetta)', kuollut_id: 'tunniste ei vastaa joukkuetta' };

  async function _lueSeura(db, sid) {
    var ref = db.collection('seurat').doc(sid), vastaus = await Promise.all([ref.collection('pelaajat').get(), ref.collection('joukkueet').get()]);
    return { pelaajat: vastaus[0].docs.map(function (d) { return Object.assign({ _ref: d.ref, id: d.id }, d.data()); }).filter(function (p) { return p.poistettu !== true && p.arkistoitu !== true && p.aktiivinen !== false; }),
      joukkueet: vastaus[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }) };
  }
  /* Kuiva-ajo: [{ id, nimi, raportti }] (raportti = tmJasenyysRaportti; sisältää pelaajaobjekteja → ÄLÄ tulosta sellaisenaan, käytä tmJasenyysTeksti). */
  async function tmJasenyysTarkista(deps, seuraIdt, viiteVuosi) {
    var J = _J(), db = deps.db, seurat = seuraIdt;
    if (!seurat) { var sn = await db.collection('seurat').get(); seurat = sn.docs.filter(function (d) { var x = d.data() || {}; return x.demo !== true && x.aktiivinen !== false; }).map(function (d) { return { id: d.id, nimi: (d.data() || {}).nimi || d.id }; }); }
    var ulos = [];
    for (var i = 0; i < seurat.length; i++) {
      var s = typeof seurat[i] === 'string' ? { id: seurat[i], nimi: seurat[i] } : seurat[i];
      try { var d = await _lueSeura(db, s.id); ulos.push({ id: s.id, nimi: s.nimi || s.id, joukkueet: d.joukkueet, raportti: J.tmJasenyysRaportti(d.pelaajat, d.joukkueet, viiteVuosi) }); }
      catch (e) { ulos.push({ id: s.id, nimi: s.nimi || s.id, virhe: String(e && e.message || e) }); }
    }
    return ulos;
  }
  /* Raporttiteksti: seuroittain lukumäärät + epäselvät yhdistelminä. EI pelaajien nimiä eikä tunnisteita. */
  function tmJasenyysTeksti(tulokset) {
    var r = ['Joukkuejäsenyydet — KUIVA-AJO (vain lukumääriä, ei nimiä). Korjaus = nimen mukainen joukkue.', ''];
    (tulokset || []).forEach(function (t) {
      if (t.virhe) { r.push(t.nimi + ': luku epäonnistui — ' + t.virhe, ''); return; }
      var p = t.raportti, nimiId = {}; (t.joukkueet || []).forEach(function (j) { nimiId[j.id] = j.nimi || j.id; });
      var ristiriitoja = Object.keys(p.tyypit).filter(function (k) { return k !== 'ehja'; }).reduce(function (s, k) { return s + p.tyypit[k]; }, 0);
      r.push(t.nimi + ' — ' + p.pelaajia + ' pelaajaa · ehjiä ' + (p.tyypit.ehja || 0) + ' · ristiriitoja ' + ristiriitoja + (ristiriitoja ? ' (yksiselitteisiä ' + p.yksiselitteisia + ', epäselviä ' + p.epaselvat.reduce(function (s, e) { return s + e.lkm; }, 0) + ', ei korjattavissa ' + (ristiriitoja - p.yksiselitteisia - p.epaselvat.reduce(function (s, e) { return s + e.lkm; }, 0)) + ')' : ''));
      Object.keys(p.tyypit).filter(function (k) { return k !== 'ehja'; }).forEach(function (k) { r.push('   · ' + (NIMET[k] || k) + ': ' + p.tyypit[k]); });
      p.epaselvat.forEach(function (e) { r.push('   ⚠ epäselvä: nyt [' + (e.nyt.map(function (i) { return nimiId[i] || i; }).join(', ') || '—') + '] → ehdotus [' + e.ehdotus.map(function (i) { return nimiId[i] || i; }).join(', ') + '] · ' + e.lkm + ' pelaajaa (oletus: vain nimen joukkue; vahvista erikseen)'); });
      r.push('');
    });
    return r.join('\n');
  }
  /* Korjaus: lue tuoreeltaan, diagnosoi uudelleen, kirjoita (batch ≤ 400). epaselvat=true → kirjoita myös epäselvät (nimen joukkue). Palauttaa { kirjoitettu, virhe, ohitettu }. */
  async function tmJasenyysKorjaa(deps, seuraId, opts) {
    opts = opts || {}; var J = _J(), db = deps.db, d = await _lueSeura(db, seuraId), r = J.tmJasenyysRaportti(d.pelaajat, d.joukkueet, opts.viiteVuosi), rivit = [];
    r.korjattavat.forEach(function (x) { rivit.push(x); });
    if (opts.epaselvat) r.epaselvat.forEach(function (e) { e.pelaajat.forEach(function (x) { rivit.push({ pelaaja: x.pelaaja, ehdotus: x.ehdotus }); }); });
    var kirj = 0, virhe = 0;
    for (var i = 0; i < rivit.length; i += 400) {
      var era = rivit.slice(i, i + 400), batch = db.batch();
      era.forEach(function (x) { var e = x.ehdotus; batch.update(x.pelaaja._ref, { joukkueet: e.joukkueet, joukkueetNimet: e.joukkueetNimet, joukkue: e.joukkue, joukkueNimi: e.joukkueNimi }); });
      try { await batch.commit(); kirj += era.length; } catch (err) { virhe += era.length; }
    }
    return { kirjoitettu: kirj, virhe: virhe, epaselvia: opts.epaselvat ? 0 : r.epaselvat.reduce(function (s, e) { return s + e.lkm; }, 0) };
  }

  var API = { tmJasenyysTarkista: tmJasenyysTarkista, tmJasenyysTeksti: tmJasenyysTeksti, tmJasenyysKorjaa: tmJasenyysKorjaa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_JASENYYS_TARKISTUS = API;
})(typeof window !== 'undefined' ? window : this);
