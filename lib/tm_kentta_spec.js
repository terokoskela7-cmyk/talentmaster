/* ════════════════════════════════════════════════════════════════════════
   tm_kentta_spec.js — kehitystyöpöytä 22 · kierros B · B1 (D98, D107; brief 22 B1): Kenttä-komponentin (lib/tm_kentta.js) spec pelaajadokumentista. YKSI adapteri VP:lle, Masterille ja (myöhemmin) Pelaaja_v7:lle.
   PURE (ei Firebasea, ei DOM:ia). Dual-export: module.exports || window.TM_KENTTA_SPEC.

   DATAMALLI (Rules v3.64):
     pelaajat/{pid}.ydinvahvuus.alue            {x, y, w, h}  koordinaatisto 0–100 × 0–140 (tm_kentta.js), x+w ≤ 100, y+h ≤ 140, w,h ≥ 1; hienojako — karkeat (5v5/8v8/11v11) jaot ovat sen yhdistelmiä
     pelaajat/{pid}.ydinvahvuus.asetti_uid      asettajan auth.uid (Rules pakottaa = kirjautunut)    ·  .asetettu_pvm  'YYYY-MM-DD' (paikallinen päivä)
     pelaajat/{pid}.jaksofokus.reitti           {loppu: 'maali'|'kaveri'|'kausitavoite'}  kiinteät päätepisteet, ei vapaata piirtoa (tm_kentta.js LOPPU)
     pelaajat/{pid}.jaksofokus.osat[i].x/.y     valinnainen osan sijainti; oletus = alueen ympärillä tasavälein
     pelaajat/{pid}.jaksofokus.osa_arviot.<konsepti>.<koodi>  1|2|3 → osan tila (ei vielä · ohjatusti · itsenäisesti)
     pelaajat/{pid}.jaksofokus_historia[i].reitti.loppu     kirjoitetaan jakson sulkemisessa (vain tämä; vanhoissa merkinnöissä ei ole → ei piirretä)
     joukkueet/{jid}.pelimuodot                 ['11v11','8v8'] (lista, 1–3 alkiota ∈ {5v5, 8v8, 11v11}; ensimmäinen = oletus). Puuttuu → oletus iästä (≤ 9 v [5v5] · 10–12 v [8v8] · 13 v [11v11,8v8] · 14+ v [11v11])
   Kirjoittajat (Rules): SA · VP · UTJ · talenttivalmentaja · joukkueen valmentaja. Pelaaja ja huoltaja vain luku; pelaajan oma valinta (ydinvahvuus_valinta) ei kirjoita aluetta.

   · tmKenttaAlueKelpaa(a)                  → boolean (sama ehto kuin Rules: numerot, 0–100 × 0–140, w,h ≥ 1, ei yli kentän reunan)
   · tmKenttaAlue(p)                        → {x,y,w,h} | null (kelvollinen ydinvahvuus.alue)
   · tmAlueKirjoitus(alue, {uid, nyt})      → { ok, polut:{'ydinvahvuus.alue','ydinvahvuus.asetti_uid','ydinvahvuus.asetettu_pvm'}, virhe } (update-dot-polut; pyöristys 1 desimaaliin)
   · tmReittiKirjoitus(loppu)               → { 'jaksofokus.reitti': {loppu} } | null (tuntematon loppu → null)
   · tmPelimuodot(joukkueDoc, {ika})        → ['11v11', …] (asetus tai oletus iästä)
   · tmKenttaSpec(p, {rooli, tanaan, kaanon, koko}) → spec tmKentta:lle + { alueAsetettu, jakso }:
        alue → ase · jaksofokus.reitti → reitti · tmTanaanTila → viikot · osa_arviot → osat[].tila ('nyt' = viikon osa) · jaksofokus_historia → historia
        koko: 'puoli' (y < 84), 'koko' jos alue/osat ulottuvat puolikkaan yli. rooli 'henkilokunta' | 'pelaaja' | 'huoltaja' (pelaaja/huoltaja ilman aluetta: ilmanAluetta:true = pelkkä kenttä, kuten ennen).
   Ei arvata: ei aluetta → ei asetta; ei reittiä → ei reittiä eikä viikkomerkkejä; historia vain merkinnöistä joilla on reitti.loppu.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var LOPUT = ['maali', 'kaveri', 'kausitavoite'], PELIMUODOT = ['5v5', '8v8', '11v11'];
  var OSA_TILA = { 1: 'ei_viela', 2: 'ohjatusti', 3: 'itsenaisesti' };

  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _num(v) { return typeof v === 'number' && isFinite(v); }
  function _r1(v) { return Math.round(v * 10) / 10; }
  function _iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function tmKenttaAlueKelpaa(a) {
    if (!a || typeof a !== 'object') return false;
    var k = Object.keys(a); if (k.length !== 4 || ['x', 'y', 'w', 'h'].some(function (n) { return !_num(a[n]); })) return false;
    return a.x >= 0 && a.x <= 100 && a.y >= 0 && a.y <= 140 && a.w >= 1 && a.w <= 100 && a.h >= 1 && a.h <= 140 && a.x + a.w <= 100 && a.y + a.h <= 140;
  }
  function tmKenttaAlue(p) { var a = p && p.ydinvahvuus && p.ydinvahvuus.alue; return tmKenttaAlueKelpaa(a) ? { x: a.x, y: a.y, w: a.w, h: a.h } : null; }

  function tmAlueKirjoitus(alue, ctx) {
    ctx = ctx || {}; var a = alue && { x: _r1(Number(alue.x)), y: _r1(Number(alue.y)), w: _r1(Number(alue.w)), h: _r1(Number(alue.h)) };
    if (!ctx.uid) return { ok: false, polut: null, virhe: 'ei_asettajaa' };
    if (!tmKenttaAlueKelpaa(a)) return { ok: false, polut: null, virhe: 'alue_ei_kelpaa' };
    return { ok: true, virhe: null, polut: { 'ydinvahvuus.alue': a, 'ydinvahvuus.asetti_uid': ctx.uid, 'ydinvahvuus.asetettu_pvm': _iso(ctx.nyt instanceof Date ? ctx.nyt : new Date()) } };
  }
  function tmReittiKirjoitus(loppu) { return LOPUT.indexOf(loppu) >= 0 ? { 'jaksofokus.reitti': { loppu: loppu } } : null; }

  /* Joukkueen pelimuodot: asetus (kelvolliset, uniikit, järjestys säilyy) tai oletus iästä. ika: numero | joukkuedokin ika/ikaryhma/nimi ("U13", "P13", "Demo U13"). */
  function _ikaDokista(d) { var s = d && [d.ika, d.ikaryhma, d.nimi].filter(function (x) { return typeof x === 'string'; }).join(' '), m = s && /(?:^|[^A-Za-z0-9])[PTUptu]\s?(\d{1,2})(?![0-9])/.exec(s); return m ? parseInt(m[1], 10) : null; }
  function tmPelimuodot(joukkue, ctx) {
    var l = joukkue && Array.isArray(joukkue.pelimuodot) ? joukkue.pelimuodot.filter(function (x, i, a) { return PELIMUODOT.indexOf(x) >= 0 && a.indexOf(x) === i; }).slice(0, 3) : [];
    if (l.length) return l;
    var ika = ctx && _num(ctx.ika) ? ctx.ika : _ikaDokista(joukkue);
    if (ika == null) return ['11v11'];
    return ika <= 9 ? ['5v5'] : ika <= 12 ? ['8v8'] : ika === 13 ? ['11v11', '8v8'] : ['11v11'];
  }

  /* Osien oletussijainnit: rengas alueen ympärillä, pohjoinen sektori (reitti lähtee ylös) vapaana; kulmat 300° → 240° myötäpäivään (0° = itä, 90° = etelä). */
  function _sijainnit(n, a, H) {
    var cx = a.x + a.w / 2, cy = a.y + a.h / 2, rx = a.w / 2 + 9, ry = a.h / 2 + 7, ulos = [];
    for (var i = 0; i < n; i++) { var deg = (300 + 300 * (i + 0.5) / n) % 360, r = deg * Math.PI / 180; ulos.push([Math.min(66, Math.max(3, _r1(cx + rx * Math.cos(r) - 6))), Math.min(H - 8, Math.max(4, _r1(cy + ry * Math.sin(r))))]); }
    return ulos;
  }

  /* Ydinasiapisteet (osa-merkit) ALUEEN SISÄLLE tai REUNALLE järjestyksessä a → e (lukujärjestys: ylhäältä alas, vasemmalta oikealle): ei päällekkäin (väli ≥ PISTE_VALI), ei kentän viivojen päällä (väli viivoista ≥ r + marginaali), ei ydinvahvuuden nimilaatan alla.
     Deterministinen: ehdokasruudukko → viivavälin suodatus → kauimmaisen pisteen valinta → lukujärjestys. Ei tilaa → väljennetään viivaväliä ja laajennetaan alue-reunan ulkopuolelle (8 yks.). Koordinaatisto 0–100 × 0–140 (tm_kentta.js). */
  var PISTE_R = 3.3, PISTE_VALI = 8.4;
  function _etaisyysSuorakaide(x, y, rx, ry, rw, rh) { var dx = Math.max(rx - x, 0, x - (rx + rw)), dy = Math.max(ry - y, 0, y - (ry + rh)); if (dx > 0 || dy > 0) return Math.sqrt(dx * dx + dy * dy); return Math.min(x - rx, rx + rw - x, y - ry, ry + rh - y); }
  function _viivaEtaisyys(x, y) {   // pienin etäisyys kentän viivoihin (peilaa tm_kentta.js _viivat: keskiviiva, keskiympyrä, rangaistusalueet + maalialueet, kaaret, reunat)
    var d = [Math.abs(y - 70), Math.abs(Math.sqrt((x - 50) * (x - 50) + (y - 70) * (y - 70)) - 13), _etaisyysSuorakaide(x, y, 20, 0, 60, 23), _etaisyysSuorakaide(x, y, 35, 0, 30, 8), _etaisyysSuorakaide(x, y, 20, 117, 60, 23), _etaisyysSuorakaide(x, y, 35, 132, 30, 8), x, 100 - x, y, 140 - y];
    if (y >= 23) d.push(Math.abs(Math.sqrt((x - 50) * (x - 50) + (y - 23) * (y - 23)) - 13)); if (y <= 117) d.push(Math.abs(Math.sqrt((x - 50) * (x - 50) + (y - 117) * (y - 117)) - 13));
    return Math.min.apply(null, d.map(function (v) { return Math.abs(v); }));
  }
  function _pisteEhdokkaat(a, marg, selvyys, nimilaatta) {
    var x0 = a.x - marg, x1 = a.x + a.w + marg, y0 = a.y - marg, y1 = a.y + a.h + marg, laattaY = a.y + a.h - nimilaatta, ulos = [];
    for (var y = y0; y <= y1 + 0.001; y += 1.5) for (var x = x0; x <= x1 + 0.001; x += 1.5) {
      if (x < 4 || x > 96 || y < 4 || y > 136) continue; if (marg === 0 ? false : (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h)) continue;   // laajennuskierroksella vain alueen ulkopuoli (reunan viereen)
      if (y > laattaY && x >= a.x && x <= a.x + a.w && y <= a.y + a.h) continue;   // nimilaatan alue (alareuna)
      if (_viivaEtaisyys(x, y) < selvyys) continue; ulos.push([_r1(x), _r1(y)]);
    }
    return ulos;
  }
  function _valitse(c, n) {   // kauimmaisen pisteen valinta; kaikkien parien väli ≥ PISTE_VALI tai epäonnistuu (null)
    if (c.length < n) return null; var v = [c[0]], pienin = function (q) { return Math.min.apply(null, v.map(function (w) { return Math.sqrt((q[0] - w[0]) * (q[0] - w[0]) + (q[1] - w[1]) * (q[1] - w[1])); })); };
    c.sort(function (p, q) { return p[1] - q[1] || p[0] - q[0]; }); v = [c[0]];
    while (v.length < n) { var paras = null, pd = -1; c.forEach(function (q) { var d = pienin(q); if (d > pd) { pd = d; paras = q; } }); if (!paras || pd < PISTE_VALI) return null; v.push(paras); }
    return v;
  }
  function _pisteSijainnit(n, a) {
    if (!n) return []; var laatta = Math.min(15, a.h * 0.45), v = null, asetukset = [[0, 4.5], [0, 3.6], [0, 2.8], [8, 4.5], [8, 3.6], [8, 2.8]];
    for (var i = 0; i < asetukset.length && !v; i++) v = _valitse(_pisteEhdokkaat(a, asetukset[i][0], asetukset[i][1], laatta), n);
    if (!v) { v = []; for (var j = 0; j < n; j++) v.push([_r1(Math.min(96, Math.max(4, a.x + (a.w * (j + 0.5)) / n))), _r1(Math.max(4, a.y + 4))]); }   // viimeinen varakeino: rivi alueen yläreunaan
    v.sort(function (p, q) { return Math.abs(p[1] - q[1]) > 5 ? p[1] - q[1] : p[0] - q[0]; });   // a → e lukujärjestyksessä (rivit ylhäältä, rivin sisällä vasemmalta)
    return v;
  }
  function tmKenttaSpec(p, ctx) {
    ctx = ctx || {}; p = p || {}; var rooli = ctx.rooli === 'pelaaja' || ctx.rooli === 'huoltaja' ? ctx.rooli : 'henkilokunta';
    var jf = p.jaksofokus, alue = tmKenttaAlue(p), TK = _req('TM_TANAAN_KENTTA', './tm_tanaan_kentta.js');
    var tila = TK && ctx.tanaan ? TK.tmTanaanTila(p, { tanaan: ctx.tanaan }) : null, jakso = !!(tila && (tila.tila === 'jakso' || tila.tila === 'sunnuntai'));
    var nimi = (p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' && p.ydinvahvuus.kuvaus.trim()) || (p.ydinvahvuus_valinta && typeof p.ydinvahvuus_valinta.vaihtoehto === 'string' && p.ydinvahvuus_valinta.vaihtoehto.trim()) || '';
    var loppu = jakso && jf && jf.reitti && LOPUT.indexOf(jf.reitti.loppu) >= 0 ? jf.reitti.loppu : null;
    var reitti = alue && loppu ? { loppu: loppu, col: 'teal', faint: false } : null;
    var viikot = reitti && tila && tila.viikko ? { n: tila.viikko.k, tehty: Math.max(0, tila.viikko.n - 1), valmis: false } : null;
    var osat = [], oa = (jf && jf.konsepti_avain && jf.osa_arviot && jf.osa_arviot[jf.konsepti_avain]) || {};
    if (alue && jakso && TK) {
      var raaka = TK.tmTanaanOsat(jf, { kaanon: ctx.kaanon, max: 26 }), nyt = null;
      raaka.forEach(function (o) { if (nyt === null && OSA_TILA[oa[o.koodi]] !== 'itsenaisesti') nyt = o.k; });   // viikon osa = ensimmäinen, joka ei ole itsenäisesti (sama sääntö kuin tmKtViikonOsa)
      var ulottuu = alue.y + alue.h > 84, H = ulottuu ? 140 : 84, sij = ctx.pisteet === true ? _pisteSijainnit(raaka.length, alue) : _sijainnit(raaka.length, alue, H);
      osat = raaka.map(function (o, i) {
        var oma = jf && Array.isArray(jf.osat) ? jf.osat.filter(function (x) { return x && typeof x === 'object' && (x.teksti || x.kuvaus || x.nimi) === o.teksti; })[0] : null, x = oma && _num(oma.x) ? oma.x : sij[i][0], y = oma && _num(oma.y) ? oma.y : sij[i][1];   // osan oma sijainti haetaan tekstillä (tmTanaanOsat suodattaa kelvottomat → indeksi ei riitä)
        var r = { k: o.k, x: x, y: y, tila: o.k === nyt ? 'nyt' : (OSA_TILA[oa[o.koodi]] || undefined) }; if (ctx.pisteet === true) { r.koodi = o.koodi; r.teksti = o.teksti; r.arvioitu = !!OSA_TILA[oa[o.koodi]]; r.arvo = OSA_TILA[oa[o.koodi]] || null; }   // pisteet: koodi (havaintosheetin avain) + teksti (aria) + oma arviotila
        return r;
      });
    }
    var historia = (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).filter(function (h) { return h && h.reitti && LOPUT.indexOf(h.reitti.loppu) >= 0; }).slice(-3).reverse().map(function (h) { return { loppu: h.reitti.loppu }; });
    var yli = alue && (alue.y + alue.h > 84 || osat.some(function (o) { return o.y > 80; }));
    var spec = { koko: yli ? 'koko' : (ctx.koko === 'koko' ? 'koko' : 'puoli'), ase: alue ? { alue: alue, nimi: nimi, tila: 'ok' } : null, reitti: reitti, viikot: viikot, osat: osat, historia: alue ? historia : [], lempipaikka: null, vaihtoehdot: null, alueAsetettu: !!alue, jakso: jakso };
    if (!alue && rooli !== 'henkilokunta') spec.ilmanAluetta = true;   // pelaaja/huoltaja: pelkkä kenttä kuten ennen; henkilökunta saa jaksokortin + CTA:n (ei tyhjää kenttää)
    return spec;
  }

  var API = { _pisteSijainnit: _pisteSijainnit, _viivaEtaisyys: _viivaEtaisyys, PISTE_R: PISTE_R, PISTE_VALI: PISTE_VALI, LOPUT: LOPUT, PELIMUODOT: PELIMUODOT, tmKenttaAlueKelpaa: tmKenttaAlueKelpaa, tmKenttaAlue: tmKenttaAlue, tmAlueKirjoitus: tmAlueKirjoitus, tmReittiKirjoitus: tmReittiKirjoitus, tmPelimuodot: tmPelimuodot, tmKenttaSpec: tmKenttaSpec };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KENTTA_SPEC = API;
})(typeof window !== 'undefined' ? window : this);
