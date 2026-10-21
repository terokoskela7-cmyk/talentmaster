/* ════════════════════════════════════════════════════════════════════════
   tm_seura_tuonti.js — Seura-sivun tuonnin ja rekisteröintikutsun PURE-säännöt (CODE_BRIEF_SEURA_TUONTI_OLEMASSA, 21.10.2026). Ei DOMia, ei Firestorea.
   Dual-export: module.exports || window.TM_SEURA_TUONTI.
   · tmSeuraNimi / tmSeuraPalloId         → trimmattu nimi · PalloID AINA merkkijonona (Excel-solu voi olla numero)
   · tmSeuraEmail(raaka)                   → { osoitteet, ensimmainen, useita, kelpaa, syy } (erottimet ; , välilyönti rivinvaihto; yksi @, piste domainissa)
   · tmSeuraEtsiOlemassa(rivi, pelaajat)   → olemassa oleva pelaaja | null (PalloID → nimi + joukkue)
   · tmSeuraSuostumus(p)                   → 'annettu' | 'odottaa' | 'ei_kutsua'  ·  tmSeuraPuuttuuVuosi(p) → syntymävuosi puuttuu (tarkistusnäkymän suodatin)
   · tmSeuraErot(rivi, p)                  → mitä Excelissä eroaa (joukkue, syntymävuosi, sähköposti, suostumus)
   · tmSeuraPaivitys(rivi, p, valinnat)    → { patch, emailAsetus, joukkueVaihtui, ... } mitä "Päivitä olemassa olevat" kirjoittaa
   · tmSeuraKutsuTarvitaan(p, paiv)        → lähetetäänkö kutsu olemassa olevalle (ei koskaan annetulle suostumukselle)
   · tmSeuraYhteenveto(luvut, t)           → "X uutta · Y päivitetty (joukkue vaihtui: n) · Z ennallaan · kutsuja K"
   · tmSeuraModalJoukkueId → pelaajakortin kutsuikkunan joukkuevalinta (id, ei nimi)
   · tmSeuraKutsuTilaTeksti(tila)          → kutsuhistorian selkokielinen tila
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  function _J() { return _g('__tmJ', './tm_joukkue.js') || root; }   // tmKanonisoiJoukkue / tmJoukkueJasenyysIdlla / tmNormJoukkueAvain

  function tmSeuraNimi(x) { return String(x == null ? '' : x).replace(/\s+/g, ' ').trim(); }
  function tmSeuraPalloId(x) { return x == null ? '' : String(x).trim(); }
  function _norm(x) { return tmSeuraNimi(x).toLowerCase(); }

  /* ── Sähköposti ── */
  function _kelvollinen(e) {
    if (!e || e.length > 254 || /\s/.test(e)) return false;
    if ((e.match(/@/g) || []).length !== 1) return false;
    var p = e.split('@'), loc = p[0], dom = p[1];
    if (!loc || !dom || dom.charAt(0) === '.' || dom.charAt(dom.length - 1) === '.' || dom.indexOf('..') >= 0 || dom.indexOf('.') < 0) return false;
    return !/[<>",;]/.test(e);
  }
  function tmSeuraEmail(raaka) {
    var osat = String(raaka == null ? '' : raaka).split(/[;,\s]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    var o = { osoitteet: osat, ensimmainen: osat.length ? osat[0] : '', useita: osat.length > 1, kelpaa: false, syy: null };
    if (!osat.length) { o.syy = 'tyhja'; return o; }
    o.kelpaa = _kelvollinen(o.ensimmainen); if (!o.kelpaa) o.syy = 'virheellinen';
    return o;
  }

  /* ── Olemassa oleva pelaaja ── */
  function _pPalloId(p) { return tmSeuraPalloId(p && (p.palloID != null ? p.palloID : (p.tunniste != null ? p.tunniste : p.palloId))); }
  function _onJoukkueessa(p, rivi) {
    var ids = Array.isArray(p.joukkueet) ? p.joukkueet : [];
    if (rivi._joukkueId && ids.indexOf(rivi._joukkueId) >= 0) return true;
    var a = _norm(rivi.joukkue); return !!a && (_norm(p.joukkue) === a || _norm(p.joukkueNimi) === a);
  }
  function tmSeuraEtsiOlemassa(rivi, pelaajat) {
    var lista = Array.isArray(pelaajat) ? pelaajat : [], pid = tmSeuraPalloId(rivi && rivi.palloId), i;
    if (pid) { for (i = 0; i < lista.length; i++) if (_pPalloId(lista[i]) === pid) return lista[i]; return null; }   // PalloID ratkaisee; ilman sitä nimi + joukkue
    var e = _norm(rivi && rivi.etunimi), s = _norm(rivi && rivi.sukunimi); if (!e || !s) return null;
    for (i = 0; i < lista.length; i++) if (_norm(lista[i].etunimi) === e && _norm(lista[i].sukunimi) === s && _onJoukkueessa(lista[i], rivi)) return lista[i];
    return null;
  }
  function tmSeuraPuuttuuVuosi(p) { var v = p && p.syntymaVuosi; return v == null || v === '' || isNaN(Number(v)); }
  function tmSeuraSuostumus(p) {
    if (!p) return 'ei_kutsua';
    if (p.suostumusTila === 'annettu' || (p.suostumus && p.suostumus.annettu)) return 'annettu';
    return p.suostumusTila === 'odottaa' ? 'odottaa' : 'ei_kutsua';   // pilotti / puuttuu = kutsua ei ole lähetetty
  }
  function _pEmail(p) { return String((p && ((p.huoltaja && p.huoltaja.email) || p.huoltajaEmail)) || '').trim().toLowerCase(); }
  function _vuosiTila(rivi, p) {
    var uusi = rivi.syntymaVuosi == null ? null : Number(rivi.syntymaVuosi), vanha = p.syntymaVuosi == null || p.syntymaVuosi === '' ? null : Number(p.syntymaVuosi);
    return { vanha: vanha, uusi: uusi, tila: vanha == null ? (uusi == null ? 'puuttuu_molemmista' : 'puuttuu') : (uusi == null || uusi === vanha ? 'sama' : 'eri') };
  }
  function _emailTila(rivi, p) {
    var e = tmSeuraEmail(rivi.huoltajaEmail), vanha = _pEmail(p);
    var tila = !e.ensimmainen ? 'ei_excelissa' : !e.kelpaa ? 'virheellinen' : !vanha ? 'puuttuu' : (vanha === e.ensimmainen ? 'sama' : 'eri');
    return { vanha: vanha, uusi: e.kelpaa ? e.ensimmainen : '', tila: tila };
  }
  function tmSeuraErot(rivi, p) {
    var ids = Array.isArray(p.joukkueet) ? p.joukkueet : [];
    var jMuuttuu = !!rivi._joukkueId && !(ids.length === 1 && ids[0] === rivi._joukkueId);
    return { joukkue: { vanha: p.joukkueNimi || p.joukkue || '', uusi: rivi.joukkue || '', muuttuu: jMuuttuu }, syntymavuosi: _vuosiTila(rivi, p), email: _emailTila(rivi, p), suostumus: tmSeuraSuostumus(p) };
  }

  /* ── Päivitys ── */
  function tmSeuraPaivitys(rivi, p, valinnat) {
    var v = Object.assign({ paivita: true }, valinnat || {}), erot = tmSeuraErot(rivi, p), ulos = { patch: {}, emailAsetus: null, joukkueVaihtui: false, vuosiAsetettu: false, emailPaivitetty: false, emailEiVaihdettu: false, erot: erot };
    if (v.paivita === false) return Object.assign(ulos, { muutoksia: false });
    if (erot.joukkue.muuttuu) {   // jäsenyys KORVATAAN kanonisella id:llä (joukkue, joukkueNimi, joukkueet[], joukkueetNimet[]); orpo joukkue (ei id:tä) → ei kosketa
      var J = _J().tmJoukkueJasenyysIdlla ? _J().tmJoukkueJasenyysIdlla(rivi._joukkueId, rivi.joukkue) : { joukkue: rivi.joukkue, joukkueNimi: rivi.joukkue, joukkueet: [rivi._joukkueId], joukkueetNimet: [rivi.joukkue] };
      ulos.patch.joukkue = J.joukkue; ulos.patch.joukkueNimi = J.joukkueNimi; ulos.patch.joukkueet = J.joukkueet; ulos.patch.joukkueetNimet = J.joukkueetNimet; ulos.joukkueVaihtui = true;
    }
    if (erot.syntymavuosi.tila === 'puuttuu') { ulos.patch.syntymaVuosi = erot.syntymavuosi.uusi; ulos.vuosiAsetettu = true; }   // vain puuttuva; eri vuotta ei vaihdeta hiljaa
    var em = erot.email;
    if (em.tila === 'puuttuu') { ulos.emailAsetus = em.uusi; ulos.emailPaivitetty = true; }
    else if (em.tila === 'eri') { if (erot.suostumus !== 'annettu') { ulos.emailAsetus = em.uusi; ulos.emailPaivitetty = true; } else ulos.emailEiVaihdettu = true; }   // annettu suostumus = huoltaja tunnistettu
    ulos.muutoksia = Object.keys(ulos.patch).length > 0 || ulos.emailAsetus != null;
    return ulos;
  }
  /* Kutsu lähtee olemassa olevalle, jolta suostumus puuttuu: tila pilotti / ei kutsua; tai kutsu on jo lähtenyt mutta osoite vaihtui nyt (väärä osoite). Ei koskaan annetulle. */
  function tmSeuraKutsuTarvitaan(p, paiv) {
    var s = tmSeuraSuostumus(p); if (s === 'annettu') return false;
    return s === 'ei_kutsua' || !!(paiv && paiv.emailPaivitetty);
  }

  /* ── Yhteenveto ── (t = tmHT; lauseet suomeksi, {n} täytetään tässä) */
  function tmSeuraYhteenveto(l, t) {
    t = typeof t === 'function' ? t : function (s) { return s; };
    var n = function (fi, x) { return t(fi).split('{n}').join(String(x)); };
    var osat = [];
    osat.push(n('{n} uutta', l.uusia || 0));
    osat.push(n('{n} päivitetty', l.paivitetty || 0) + ((l.paivitetty || 0) ? ' (' + n('joukkue vaihtui: {n}', l.joukkueVaihtui || 0) + ')' : ''));
    osat.push(n('{n} ennallaan', l.ennallaan || 0));
    osat.push(n('kutsuja {n}', l.kutsuja || 0));
    if (l.hylatty) osat.push(n('{n} hylätty', l.hylatty));
    if (l.eiVuotta) osat.push(n('{n} ei tuotu (syntymävuosi puuttuu tai virheellinen)', l.eiVuotta));
    if (l.virheita) osat.push(n('{n} riviä epäonnistui', l.virheita));
    return osat.join(' · ');
  }

  /* ── Pelaajakortin kutsuikkuna ── */
  function tmSeuraModalJoukkueId(p, joukkueNimi, joukkueet) {
    var lista = Array.isArray(joukkueet) ? joukkueet : [], onId = function (id) { return !!id && lista.some(function (j) { return j && j.id === id; }); };
    var ids = p && Array.isArray(p.joukkueet) ? p.joukkueet : [];
    for (var i = 0; i < ids.length; i++) if (onId(ids[i])) return ids[i];
    var nimi = joukkueNimi || (p && (p.joukkueNimi || p.joukkue)) || '';
    if (onId(nimi)) return nimi;
    var K = _J().tmKanonisoiJoukkue ? _J().tmKanonisoiJoukkue(nimi, lista) : null;
    return K && K.id ? K.id : '';
  }
  function tmSeuraKutsuTilaTeksti(tila) {
    return { hyvaksytty: '✓ Hyväksytty', odottaa: '⏳ Odottaa', lahetetty: '✉️ Lähetetty', epaonnistui: '⚠️ Lähetys epäonnistui' }[tila] || (tila || '—');
  }

  var API = { tmSeuraNimi: tmSeuraNimi, tmSeuraPalloId: tmSeuraPalloId, tmSeuraEmail: tmSeuraEmail, tmSeuraEtsiOlemassa: tmSeuraEtsiOlemassa, tmSeuraSuostumus: tmSeuraSuostumus, tmSeuraPuuttuuVuosi: tmSeuraPuuttuuVuosi, tmSeuraErot: tmSeuraErot,
    tmSeuraPaivitys: tmSeuraPaivitys, tmSeuraKutsuTarvitaan: tmSeuraKutsuTarvitaan, tmSeuraYhteenveto: tmSeuraYhteenveto, tmSeuraModalJoukkueId: tmSeuraModalJoukkueId, tmSeuraKutsuTilaTeksti: tmSeuraKutsuTilaTeksti };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_SEURA_TUONTI = API;
})(typeof window !== 'undefined' ? window : this);
