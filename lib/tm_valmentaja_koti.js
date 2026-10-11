/* ════════════════════════════════════════════════════════════════════════
   tm_valmentaja_koti.js — V-KOTI PR A · valmentajan Koti v2 = "mitä teen nyt" (D245). PURE malli, dual-export (Node + selain). HTML: lib/tm_valmentaja_koti_nakyma.js.
   tmKotiMalli({ tapahtumat, nyt, joukkue:{id,nimi}, pelaajat:[{id,nimi}], havainnot:{pid:'YYYY-MM-DD'}|null, kirjaukset:[{pelaajaId,pvm,tyyppi,tehty}], lasnaolot:{pid:vk4}|null (6f-kooste),
                  jakso:{nimi,alku,loppu,koosteTehty,vk,vkYht}|null, viestit:[{id,kuka,teksti,luettu,vastattu,huoltaja,aika}], saatavuus:{evId:{tulossa:n|[],estynyt:[{pid?,nimi,syy?}]}}, klipit:[{id,jaettu}]|null, kertyma:{viikot}|null, uusi:bool })
     → { seuraava, viikko, tehtavat(≤3), nostot(2–4), syke, viestit(≤3), tyhja }
   Lähde ei ole saatavilla (null/puuttuu) → kyseinen sääntö ohitetaan ilman virhettä (esim. lasnaolot ennen 6f-dataa). Kaikki päivät Helsingin ajassa (Master antaa tapahtumille pvm + _alkaaMs/_paattyyMs).
   Tehtäväprioriteetti (D245-täydennys): FLEI < 40 (turvasignaali, aina ylin) > läsnäolot vahvistamatta > jakso päättyy ≤ 5 pv (kooste) > havainnot puuttuu ≥ 30 pv (nimet ≤ 4) > D3-itsearvio odottaa > vastaamaton huoltajaviesti > 24 h > klippi jakamatta. Näkyvissä 3 (tehtavat) + lisaTehtavat ("Näytä kaikki (n)"). Yksi nappi/tehtävä: { teksti, toiminto, arg }. Pelaajalla: flei (0–100), d3Odottaa (bool). Jakso: lib/tm_joukkuejakso.js tmJoukkueenJakso → { nimi, alku, loppu←paattyy, vk, vkYht }.
   Nostot: ei havaintoa ≥ 30 pv · läsnä < 50 % 4 vk · ei omatoimisia ≥ 3 vk + 1 myönteinen (eniten omatoimisia tällä viikolla → "kehu?"). Sävy: huomio = amber, myönteinen = teal; EI punaista, ei vertailua pelaajien välillä muuten kuin "eniten omatoimisia".
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  var DAY = 86400000;
  function _u(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function _iso(u) { var d = new Date(u), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  function _paiva(ms) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); } catch (e) { return _iso(ms + 3 * 3600000); } }
  function _ms(x) { if (x == null || x === '') return null; if (typeof x === 'number') return x; if (typeof x.toDate === 'function') return x.toDate().getTime(); var t = Date.parse(x); return isNaN(t) ? null : t; }
  function _alku(e) { return e._alkaaMs != null ? e._alkaaMs : _ms(e.alkaa); }
  function _loppu(e) { var l = e._paattyyMs != null ? e._paattyyMs : _ms(e.paattyy); return l != null ? l : _alku(e); }
  function _hhmm(e) { if (typeof e.alkaa === 'string' && /^\d{1,2}:\d{2}/.test(e.alkaa)) return e.alkaa.slice(0, 5); var a = _alku(e); if (a == null) return ''; try { return new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(a)); } catch (x) { return ''; } }
  function _pvm(e) { return e.pvm || (_alku(e) != null ? _paiva(_alku(e)) : null); }

  function _kat(e) {   // treeni | aamu | ryhma | ottelu | null — sama jaottelu kuin 6f:n tmKertymaKategoria, mutta ei riipu siitä (PR A toimii ilman 6f:ää)
    var TY = _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'), a = TY.tmKalTyyppiAvain ? TY.tmKalTyyppiAvain(e.tyyppi) : e.tyyppi;
    if (a === 'ottelu') return 'ottelu'; if (a !== 'harjoitus') return null; return e.alalaji === 'aamutreeni' ? 'aamu' : (e.kohde && e.kohde.tyyppi === 'ryhma' ? 'ryhma' : 'treeni');
  }
  function _lasnaPros(a) {   // joukkueen ohjattu läsnäolo-% 4 vk pelaajien vk4-summista (6f-kooste); ei dataa → null
    var l = 0, y = 0, n = 0; (a.pelaajat || []).forEach(function (p) { var v = a.lasnaolot && a.lasnaolot[p.id]; if (!v) return; var pl = 0, py = 0; ['treeni', 'aamu', 'ryhma'].forEach(function (c) { var x = v[c]; if (x) { pl += x.lasna != null ? x.lasna : (x.paik || 0) + (x.myoh || 0); py += x.yht != null ? x.yht : 0; } }); if (py) { n++; l += pl; y += py; } });
    return y ? Math.round(100 * l / y) : null;
  }
  function _omalle(e, j) { if (!j) return true; if (e.joukkueet && e.joukkueet.length && j.id) return e.joukkueet.indexOf(j.id) >= 0; return !e.joukkue || e.joukkue === j.nimi || e.joukkue === j.id; }
  function _aktiivinen(e) { return e && e.poistettu !== true && e.tila !== 'peruttu' && e.tila !== 'peruutettu'; }
  function _nimiLyhyt(n) { var p = String(n || '').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[p.length - 1].charAt(0) + '.' : p[0] || ''; }

  function _seuraava(evs, a) {
    var K = _lib('./tm_kalenteri_kyselyt.js', 'TM_KALENTERI_KYSELYT'), r = K.tmSeuraavaTapahtuma ? K.tmSeuraavaTapahtuma(evs, { joukkue: a.joukkue && (a.joukkue.id || a.joukkue.nimi), nyt: a.nyt }) : null;
    if (!r) return null; var e = evs.filter(function (x) { return x.id === r.id; })[0] || {}, sa = (a.saatavuus || {})[r.id] || {}, est = sa.estynyt || [];
    var tulossa = Array.isArray(sa.tulossa) ? sa.tulossa.length : (sa.tulossa || 0);
    return { id: r.id, nimi: r.nimi || e.nimi || '', tyyppi: r.tyyppi, kat: _kat(e), pvm: _pvm(e), aika: _hhmm(e), paikka: r.paikka || e.paikka || '', md: e._md || null, teema: e.teema || e.painotus || null,
      tulossa: tulossa, estynyt: est.length, estyneet: est.map(function (x) { return { nimi: _nimiLyhyt(x.nimi), syy: x.syy || '' }; }),
      napit: [{ teksti: 'Avaa', toiminto: 'avaa', arg: r.id }, { teksti: 'Viesti joukkueelle', toiminto: 'viesti', arg: r.id }] };
  }

  function _viikko(evs, a) {
    var tanaan = _paiva(a.nyt), t = _u(tanaan), wd = (new Date(t).getUTCDay() + 6) % 7, ma = t - wd * DAY, paivat = [], ottelut = [], i;
    evs.forEach(function (e) { if (_kat(e) === 'ottelu' && _pvm(e)) ottelut.push(_u(_pvm(e))); });
    for (i = 0; i < 7; i++) {
      var d = ma + i * DAY, iso = _iso(d), md = null;
      ottelut.forEach(function (o) { var x = Math.round((d - o) / DAY); if (x === 0) md = 'MD'; else if (x === 1 && md == null) md = 'MD+1'; else if (x < 0 && x >= -3 && (md == null || md === 'MD+1' || (md.indexOf('-') > 0 && +md.slice(2) < x))) md = 'MD' + x; });
      var te = evs.filter(function (e) { return _pvm(e) === iso; }).sort(function (x, y) { return (_alku(x) || 0) - (_alku(y) || 0); }).map(function (e) {
        var k = _kat(e), n = e.nimi || (k === 'ottelu' ? 'Ottelu' : 'Harjoitus'); if (k === 'aamu') n = 'Aamutreeni' + (e.pelaajat_id && e.pelaajat_id.length ? ' · ' + e.pelaajat_id.length : '');
        return { id: e.id, aika: _hhmm(e), nimi: n, kat: k };
      });
      paivat.push({ pvm: iso, vpaiva: i, tanaan: iso === tanaan, md: md, tapahtumat: te });
    }
    return { maanantai: _iso(ma), paivat: paivat, tyhja: !paivat.some(function (p) { return p.tapahtumat.length; }) };
  }

  /* Jakson sulkukooste (pelaajan jaksofokus_historia, tmSuljeJakso: sulkutapa 'suljettu', suljettu/paattyi ≥ jakson alku) → { tehty, yht } joukkueen aktiivisista pelaajista. historia puuttuu kaikilta → ei lähdettä (null). */
  function _jaksoKooste(a) {
    var j = a.jakso, pel = a.pelaajat || []; if (!j || !j.alku || !pel.length || !pel.some(function (p) { return Array.isArray(p.historia); })) return null;
    var tehty = pel.filter(function (p) { return (p.historia || []).some(function (r) { var pv = String(r && (r.suljettu || r.paattyi) || '').slice(0, 10); return r && r.sulkutapa === 'suljettu' && pv >= String(j.alku).slice(0, 10); }); }).length;
    return { tehty: tehty, yht: pel.length };
  }
  function _pvmLyhyt(iso) { return (+String(iso).slice(8, 10)) + '.' + (+String(iso).slice(5, 7)) + '.'; }
  /* Jakso-tehtävä: päättyy ≤ 5 pv TAI päättynyt ≤ 7 pv sitten, ja kooste ei valmis (tehty < yht). Valmis (n/n) tai päättynyt > 7 pv → pois. Lähde puuttuu → näytetään ilman lukuja (kuten ennen). */
  function _jaksoTehtava(a, tanaan) {
    var j = a.jakso; if (!j || !j.loppu) return null; var pv = Math.round((_u(j.loppu) - _u(tanaan)) / DAY), paattynyt = j.paattynyt != null ? !!j.paattynyt : pv <= 0;
    if (paattynyt ? -pv > 7 : pv > 5) return null;
    var k = _jaksoKooste(a); if (k && k.tehty >= k.yht) return null;
    return { avain: 'jakso', teksti: 'Jakson kooste tehty', tarkenne: k ? k.tehty + '/' + k.yht : '', paattyy: _pvmLyhyt(j.loppu), paattynyt: paattynyt, nappi: { teksti: 'Avaa jakso', toiminto: 'jakso', arg: j.nimi || '' } };
  }
  function _nimet(lista, n) { return lista.slice(0, n).map(function (p) { return _nimiLyhyt(p.nimi); }).join(', ') + (lista.length > n ? ' +' + (lista.length - n) : ''); }
  function _tehtavat(evs, a, viestit) {   // KAIKKI tehtävät prioriteettijärjestyksessä (näkymä näyttää 3 + "Näytä kaikki (n)")
    var out = [], tanaan = _paiva(a.nyt), pel = a.pelaajat || [];
    var flei = pel.filter(function (p) { return p.flei != null && p.flei < 40; });   // turvasignaali: kehon valmius < 40 → klinikkalähetys, AINA ylin
    if (flei.length) out.push({ avain: 'flei', turva: true, teksti: 'Kehon valmius alle 40 (klinikkalähetys): ' + _nimet(flei, 3), nappi: { teksti: 'Lähetä klinikkaan', toiminto: 'pelaaja', arg: flei[0].id } });
    var avoin = evs.filter(function (e) { var k = _kat(e); return (k === 'treeni' || k === 'ottelu') && _loppu(e) != null && _loppu(e) <= a.nyt && _pvm(e) === tanaan && !(e.lasnaolo_kooste && (e.lasnaolo_kooste.paikalla || e.lasnaolo_kooste.myohassa || e.lasnaolo_kooste.poissa)); });
    if (avoin.length) { var e0 = avoin[avoin.length - 1]; out.push({ avain: 'lasnaolot', teksti: 'Vahvista läsnäolot: ' + (e0.nimi || (_kat(e0) === 'ottelu' ? 'Ottelu' : 'Harjoitus')), nappi: { teksti: 'Vahvista', toiminto: 'lasnaolo', arg: e0.id } }); }
    var jt = _jaksoTehtava(a, tanaan); if (jt) out.push(jt);
    var hv = _ilmanHavaintoa(a, 30); if (a.havainnot && hv.length) out.push({ avain: 'havainnot', teksti: 'Ei havaintoa 30 pv: ' + _nimet(hv, 4), nappi: { teksti: 'Uusi havainto', toiminto: 'havainto', arg: hv[0].id } });
    var d3 = pel.filter(function (p) { return p.d3Odottaa; }); if (d3.length) out.push({ avain: 'd3', teksti: 'D3-itsearvio odottaa: ' + _nimet(d3, 2), nappi: { teksti: 'Arvioi', toiminto: 'd3', arg: d3[0].id } });
    var vm = viestit.filter(function (m) { return m.huoltaja && !m.vastattu && m.aika != null && a.nyt - m.aika > DAY; })[0]; if (vm) out.push({ avain: 'viesti', teksti: 'Vastaamatta yli vuorokauden: ' + (vm.kuka || 'huoltaja'), nappi: { teksti: 'Vastaa', toiminto: 'viesti_vastaa', arg: vm.id } });
    var kl = (a.klipit || []).filter(function (k) { return !k.jaettu; })[0]; if (kl) out.push({ avain: 'klippi', teksti: 'Klippi odottaa jakamista', nappi: { teksti: 'Jaa klippi', toiminto: 'klippi', arg: kl.id } });
    return out;
  }
  function _ilmanHavaintoa(a, pv) { var h = a.havainnot || {}, raja = _u(_paiva(a.nyt)) - pv * DAY; return (a.pelaajat || []).filter(function (p) { var d = h[p.id]; return !d || _u(d) <= raja; }); }

  function _omatoimiVk(a, p0, p1) { var m = {}; (a.kirjaukset || []).forEach(function (k) { if (!k || k.tehty === false || k.tyyppi === 'lepo') return; var u = _u(k.pvm); if (u != null && u >= p0 && u <= p1) m[k.pelaajaId] = (m[k.pelaajaId] || 0) + 1; }); return m; }
  function _nostot(a) {
    var out = [], pel = a.pelaajat || [], t = _u(_paiva(a.nyt)), wd = (new Date(t).getUTCDay() + 6) % 7, ma = t - wd * DAY, nimi = {}; pel.forEach(function (p) { nimi[p.id] = p.nimi; });
    var has = a.havainnot ? _ilmanHavaintoa(a, 30) : [], kayt = {};
    if (a.lasnaolot) pel.forEach(function (p) { var v = a.lasnaolot[p.id]; if (!v) return; var l = 0, y = 0; ['treeni', 'aamu', 'ryhma'].forEach(function (c) { if (v[c]) { l += (v[c].lasna != null ? v[c].lasna : (v[c].paik || 0) + (v[c].myoh || 0)); y += (v[c].yht != null ? v[c].yht : 0); } }); if (y >= 3 && l / y < 0.5) out.push({ pid: p.id, nimi: p.nimi, syy: 'Läsnä alle puolessa treeneistä (4 vk)', savy: 'amber', toiminto: 'pelaaja', arg: p.id, kohta: 'lasnaolo' }); });
    var omaVk3 = _omatoimiVk(a, t - 21 * DAY - wd * DAY, t); pel.forEach(function (p) { kayt[p.id] = omaVk3[p.id] || 0; });
    if (a.kirjaukset) pel.forEach(function (p) { if (!kayt[p.id] && !out.some(function (x) { return x.pid === p.id; })) out.push({ pid: p.id, nimi: p.nimi, syy: 'Ei omatoimisia 3 viikkoon', savy: 'amber', toiminto: 'pelaaja', arg: p.id, kohta: 'omatoimi' }); });
    has.forEach(function (p) { if (!out.some(function (x) { return x.pid === p.id; })) out.push({ pid: p.id, nimi: p.nimi, syy: 'Ei havaintoa 30 pv', savy: 'amber', toiminto: 'pelaaja', arg: p.id, kohta: 'havainnot' }); });
    out = out.slice(0, 3);
    var vk = _omatoimiVk(a, ma, ma + 6 * DAY), top = null; Object.keys(vk).forEach(function (pid) { if (nimi[pid] && (!top || vk[pid] > vk[top])) top = pid; });
    if (top && vk[top] >= 2) out.push({ pid: top, nimi: nimi[top], syy: 'Eniten omatoimisia tällä viikolla — kehu?', savy: 'teal', toiminto: 'pelaaja', arg: top, kohta: 'kehu', myonteinen: true });
    return out.length >= 2 || (out.length === 1 && out[0].myonteinen) ? out.slice(0, 4) : (out.length ? out : []);
  }

  function _syke(a, vkPaivat) {
    var pel = a.pelaajat || [], t = _u(_paiva(a.nyt)), wd = (new Date(t).getUTCDay() + 6) % 7, ma = t - wd * DAY, lasn = a.lasnaolot ? _lasnaPros(a) : null;
    var vk = _omatoimiVk(a, ma, ma + 6 * DAY), akt = Object.keys(vk).filter(function (k) { return pel.some(function (p) { return p.id === k; }); }).length;
    return { lasnaolo4vk: lasn, omatoimiAktiivisia: akt, pelaajia: pel.length, jakso: a.jakso && a.jakso.vk ? { vk: a.jakso.vk, yht: a.jakso.vkYht, paattyy: a.jakso.loppu || null } : null, viikot: (a.kertyma && a.kertyma.viikot) || [] };
  }

  function tmKotiMalli(a) {
    a = a || {}; a.nyt = a.nyt != null ? a.nyt : Date.now();
    var evs = (a.tapahtumat || []).filter(function (e) { return _aktiivinen(e) && _omalle(e, a.joukkue); }), viestit = (a.viestit || []).slice();
    var lukemattomat = viestit.filter(function (m) { return !m.luettu; }).sort(function (x, y) { return (y.aika || 0) - (x.aika || 0); }).slice(0, 3);
    var tehtKaikki = _tehtavat(evs, a, viestit);
    var m = { seuraava: _seuraava(evs, a), viikko: _viikko(evs, a), tehtavat: tehtKaikki.slice(0, 3), lisaTehtavat: tehtKaikki.slice(3), nostot: _nostot(a), syke: _syke(a), viestit: lukemattomat, tyhja: null };
    if (a.uusi || (!m.seuraava && m.viikko.tyhja && !(a.pelaajat || []).length)) m.tyhja = 'uusi';
    return m;
  }
  var API = { tmKotiMalli: tmKotiMalli, tmKotiNimiLyhyt: _nimiLyhyt };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_VALMENTAJA_KOTI = API;
})(typeof window !== 'undefined' ? window : null);
