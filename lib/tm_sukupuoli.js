/* ════════════════════════════════════════════════════════════════════════
   tm_sukupuoli.js — sukupuolen normalisointi ja päättely (CLAUDE.md §7.12: Firestoressa "M"/"N", ei "poika"/"tyttö"; Excel käyttää P/T). PURE.
   · tmSukupuoliMN(raw)            → 'M' | 'N' | null   (P/M/poika/pojat/mies → M · T/N/tyttö/tytöt/nainen → N · muu/tyhjä → null, EI oletusta)
   · tmSukupuoliTuloksista(arvot)  → { sukupuoli:'M'|'N'|null, syy:'ok'|'ei_tuloksia'|'ristiriita', M:n, N:n }
       Päättely testituloksista (backfill): vain jos KAIKKI tunnistetut arvot ovat yhtä mieltä; ristiriita → null + syy (lista käsin). Tunnistamattomat arvot ohitetaan.
   Dual-export: module.exports || window.TM_SUKUPUOLI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var M = { p: 1, m: 1, poika: 1, pojat: 1, mies: 1, miehet: 1 }, N = { t: 1, n: 1, tytto: 1, tytot: 1, nainen: 1, naiset: 1 };
  function tmSukupuoliMN(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase().replace(/ö/g, 'o').replace(/ä/g, 'a');
    if (M[s] === 1) return 'M'; if (N[s] === 1) return 'N'; return null;
  }
  function tmSukupuoliTuloksista(arvot) {
    var m = 0, n = 0; (Array.isArray(arvot) ? arvot : []).forEach(function (a) { var x = tmSukupuoliMN(a); if (x === 'M') m++; else if (x === 'N') n++; });
    if (!m && !n) return { sukupuoli: null, syy: 'ei_tuloksia', M: 0, N: 0 };
    if (m && n) return { sukupuoli: null, syy: 'ristiriita', M: m, N: n };
    return { sukupuoli: m ? 'M' : 'N', syy: 'ok', M: m, N: n };
  }
  /* Backfill-suunnitelma (YKSI ydin: scripts/backfill_sukupuoli.js + Excel_Tuonnin SA-nappi "Täydennä sukupuoli testituloksista").
     tmSukupuoliSuunnitelma(pelaajat) — pelaajat: [{ id, nimi, sukupuoli (nykyinen), tulokset:[testitulosten sukupuoli-arvot] }]
       → { yht, jo (sukupuoli jo M/N → ei kosketa), kirjoita:[{id,nimi,sukupuoli,n}], ristiriidat:[{id,nimi,M,N}], eiTuloksia:[{id,nimi}] }
     Kirjoitetaan VAIN kirjoita-lista: vain puuttuville, vain kun kaikki tunnistetut tulokset yksimielisiä. */
  function tmSukupuoliSuunnitelma(pelaajat) {
    var ulos = { yht: 0, jo: 0, kirjoita: [], ristiriidat: [], eiTuloksia: [] };
    (Array.isArray(pelaajat) ? pelaajat : []).forEach(function (p) {
      ulos.yht++;
      var nyt = p && p.sukupuoli; if (nyt === 'M' || nyt === 'N') { ulos.jo++; return; }
      var nimi = (p && p.nimi) || (p && p.id) || '', x = tmSukupuoliTuloksista(p && p.tulokset);
      if (x.syy === 'ok') ulos.kirjoita.push({ id: p.id, nimi: nimi, sukupuoli: x.sukupuoli, n: x.M + x.N });
      else if (x.syy === 'ristiriita') ulos.ristiriidat.push({ id: p.id, nimi: nimi, M: x.M, N: x.N });
      else ulos.eiTuloksia.push({ id: p.id, nimi: nimi });
    });
    return ulos;
  }
  /* Raporttiteksti (kuiva-ajo / lopputulos). tulos (valinnainen, kirjoituksen jälkeen): { kirjoitettu, ohitettu, seis:{syy}|null } */
  function tmSukupuoliRaportti(s, tulos) {
    var r = [], m = s.kirjoita.filter(function (k) { return k.sukupuoli === 'M'; }).length, n = s.kirjoita.length - m;
    r.push('Pelaajia: ' + s.yht + ' · sukupuoli jo asetettu: ' + s.jo + ' · puuttuu: ' + (s.yht - s.jo));
    if (tulos) {
      r.push('KIRJOITETTU: ' + tulos.kirjoitettu + ' · OHITETTU (asetettu välillä): ' + tulos.ohitettu);
      if (tulos.seis) r.push('⚠ PYSÄHDYS: ' + tulos.seis.syy + ' — loput jäivät kirjoittamatta (kirjaudu uudelleen ja aja uudelleen; jo kirjoitetut ohitetaan).');
    } else r.push('Kirjoitettaisiin: ' + s.kirjoita.length + ' (M ' + m + ', N ' + n + ')');
    r.push('Ristiriita (M ja N sekaisin) — EI kirjoiteta, käsin: ' + s.ristiriidat.length); s.ristiriidat.forEach(function (x) { r.push('   · ' + x.nimi + ' (M:' + x.M + ' N:' + x.N + ')'); });
    r.push('Ei testituloksia / ei tunnistettavaa — EI kirjoiteta: ' + s.eiTuloksia.length); s.eiTuloksia.forEach(function (x) { r.push('   · ' + x.nimi); });
    return r.join('\n');
  }
  /* Kirjoitus erissä (selain). kirjoita = suunnitelma.kirjoita; io: { ASETETTU(id)→Promise<bool> (onko M/N jo asetettu: tarkistus juuri ennen kirjoitusta), ERA([{id,sukupuoli}])→Promise (yksi batch), SEIS(virhe|null)→{syy}|null (null = jatka) }.
     Pysähtyy ENSIMMÄISEEN istunto-/oikeusvirheeseen (#874-malli: SEIS tarkistaa currentUser + permission-denied/unauthenticated); muu virhe → heitetään. Palauttaa { kirjoitettu, ohitettu, seis }. */
  async function tmSukupuoliKirjoita(kirjoita, io, eraKoko) {
    var koko = eraKoko || 200, tulos = { kirjoitettu: 0, ohitettu: 0, seis: null }, lista = Array.isArray(kirjoita) ? kirjoita : [];
    for (var i = 0; i < lista.length; i += koko) {
      var s = io.SEIS(null); if (s) { tulos.seis = s; return tulos; }
      var era = [];
      for (var k = 0; k < Math.min(koko, lista.length - i); k++) { var p = lista[i + k]; if (await io.ASETETTU(p.id)) tulos.ohitettu++; else era.push({ id: p.id, sukupuoli: p.sukupuoli }); }
      if (!era.length) continue;
      try { await io.ERA(era); tulos.kirjoitettu += era.length; }
      catch (e) { var s2 = io.SEIS(e); if (s2) { tulos.seis = s2; return tulos; } throw e; }
    }
    return tulos;
  }
  var API = { tmSukupuoliKirjoita: tmSukupuoliKirjoita, tmSukupuoliMN: tmSukupuoliMN, tmSukupuoliTuloksista: tmSukupuoliTuloksista, tmSukupuoliSuunnitelma: tmSukupuoliSuunnitelma, tmSukupuoliRaportti: tmSukupuoliRaportti };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_SUKUPUOLI = API;
})(typeof window !== 'undefined' ? window : this);
