/* ════════════════════════════════════════════════════════════════════════
   tm_kayttoaste.js — S1.1 Käyttöaste: pelaajien ja perheiden käyttö LUKUMÄÄRINÄ (Admin "Pilotin tila" + VP_v25 "Sovelluksen käyttö"). PURE: ei Firebasea, ei DOM:ia, ei kelloa.
   Syöte = seurat/{sid}/kooste/{vvvv-Www} -dokumentit (versio ≥ 2, lib/tm_seuran_kooste.js), vanhin → uusin. Vain lukumääriä joukkueittain: ei nimiä (pelaajan), ID:itä eikä sisältöä.

   SÄÄNNÖT (docs/CODE_BRIEF_S1_1_KAYTTOASTE.md):
   · Joukkueet IKÄJÄRJESTYKSESSÄ (nuorin ensin), EI lajittelua mittarin mukaan (D42: ei paremmuusjärjestystä joukkueiden välille).
   · Pieni joukkue (alle 5 pelaajaa): lukumäärä "3/4", ei prosenttia (D45-sääntö 4). Seuran kokonaisrivi näytetään prosenttina, kun ≥ 5 pelaajaa.
   · Trendi = edellinen viikko (nuoli + edellinen luku) + enintään neljän viimeisimmän viikon sarja (title). Suunta lasketaan osoittajan muutoksesta; EI värikoodausta hyvä/huono (ei vertailua).
   · Henkilökunnan pinta (§7.22): pelaaja ja huoltaja eivät näe näitä lukuja. Rules: kooste-luku johto/SA, kooste_joukkue + oman joukkueen valmentaja.
   Renderöinti täällä (ei kuoreen): Admin ja VP kutsuvat tmKayttoasteHTML:ää. Vain CSS-muuttujat (ei hex-värejä).
   Dual-export: module.exports || window.TM_KAYTTOASTE.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var PIENI_JOUKKUE = 5;
  var MITTARIT = [
    { k: 'n_suostumus', lbl: 'Suostumus' },
    { k: 'n_kirjautunut_30', lbl: 'Kirjautunut 30 pv' },
    { k: 'n_aktiivinen_7', lbl: 'Aktiivinen 7 pv' },
    { k: 'n_aktiivinen_30', lbl: 'Aktiivinen 30 pv' },
    { k: 'n_huoltaja_30', lbl: 'Huoltaja 30 pv' }
  ];
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _KO() { return _req('TM_SEURAN_KOOSTE', './tm_seuran_kooste.js'); }
  function _JJ() { return _req('TM_JOUKKUEJAKSO', './tm_joukkuejakso.js'); }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ISO 8601 -viikon tunniste 'vvvv-Www' Helsingin päivästä (= palvelimen kooste-dokumentin id, functions/helsinki_paiva.js viikonRajat.tunniste). Vuodenvaihde: 28.12.2026 → '2026-W53', 4.1.2027 → '2027-W01'. */
  function tmIsoViikko(ms) {
    var p = _KO().pvmHelsinki(ms).split('-').map(Number);
    return _req('TM_VIIKKO', './tm_viikko.js').tmIsoViikkoYMD(p[0], p[1], p[2]).tunniste;   // YKSI ISO 8601 -kaava (lib/tm_viikko.js)
  }
  /* YKSI jaettu lukufunktio (Admin + VP): seuran 4 viimeisintä koostetta vanhin→uusin. EI laskevaa __name__-järjestystä (vaatisi yksittäiskenttäindeksin → "The query requires an index", S1.1-bugi):
     nouseva rajaus where(documentId() >= tunniste 5 viikkoa sitten) — ei indeksiä — ja 4 viimeistä otetaan selaimessa. Tunniste järjestyy aakkosjärjestyksessä oikein myös vuodenvaihteessa (W52/W53 → W01).
     Vartija: tests/ei_laskevaa_name_jarjestysta.test.js. nytMs vain testeille. Palauttaa Promise<kooste-data[]>. */
  function tmKayttoasteLueKoosteet(db, FieldPath, seuraId, nytMs) {
    var alku = tmIsoViikko((nytMs != null ? nytMs : Date.now()) - 5 * 7 * 86400000);
    return db.collection('seurat').doc(seuraId).collection('kooste').where(FieldPath.documentId(), '>=', alku).get().then(function (snap) {
      return snap.docs.map(function (x) { return { id: x.id, data: x.data() }; }).sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }).slice(-4).map(function (x) { return x.data; });
    });
  }

  function _arvo(osoittaja, nimittaja) {   // teksti: pieni joukkue → "3/4", muuten prosentti
    if (!nimittaja) return '—';
    return nimittaja < PIENI_JOUKKUE ? osoittaja + '/' + nimittaja : Math.round(osoittaja * 100 / nimittaja) + ' %';
  }
  function _onV2(doc) { return !!doc && Object.keys(doc.joukkueet || {}).some(function (jid) { var j = doc.joukkueet[jid]; return j && typeof j.n_suostumus === 'number'; }); }

  /* Yksi taso (seura = jid puuttuu, tai yksi joukkue). koosteet vanhin→uusin; vain versio 2 -dokumentit lasketaan. Palauttaa null jos uusin dokumentti ei ole versio 2. */
  function tmKayttoasteLaske(koosteet, jid) {
    var lista = (Array.isArray(koosteet) ? koosteet : []).filter(Boolean);
    if (!lista.length || !_onV2(lista[lista.length - 1])) return null;
    var KO = _KO();
    var nyt = lista[lista.length - 1], pelaajia = 0;
    if (jid == null && nyt.yhteensa && typeof nyt.yhteensa.n_pelaajat === 'number') pelaajia = nyt.yhteensa.n_pelaajat;   // v3: uniikit pelaajat
    else Object.keys(nyt.joukkueet || {}).forEach(function (id) { if (jid != null && id !== jid) return; pelaajia += (nyt.joukkueet[id] || {}).n_pelaajat || 0; });
    var solut = MITTARIT.map(function (m) {
      var t = KO.tmKoosteTrendi(lista, m.k, jid), n = t.nyt;
      var sarja = lista.slice(-4).map(function (d) { var x = KO.tmKoosteTrendi([d], m.k, jid).nyt; return x ? x.osoittaja : null; });
      return { k: m.k, lbl: m.lbl, osoittaja: n ? n.osoittaja : 0, nimittaja: n ? n.nimittaja : 0, teksti: n ? _arvo(n.osoittaja, n.nimittaja) : '—',
        suunta: t.suunta, edellinen: t.edellinen ? t.edellinen.osoittaja : null, edellinenTeksti: t.edellinen ? _arvo(t.edellinen.osoittaja, t.edellinen.nimittaja) : null, sarja: sarja };
    });
    return { vk: nyt.vk, pelaajia: pelaajia, pieni: pelaajia < PIENI_JOUKKUE, solut: solut };
  }

  /* Joukkueet ikäjärjestyksessä (nuorin ensin; sama ikä → nimi). EI mittarijärjestystä. */
  function tmKayttoasteJoukkueet(koosteet) {
    var lista = (Array.isArray(koosteet) ? koosteet : []).filter(Boolean); if (!lista.length) return [];
    var nyt = lista[lista.length - 1], JJ = _JJ();
    return Object.keys(nyt.joukkueet || {}).map(function (jid) {
      var j = nyt.joukkueet[jid] || {}, ika = JJ && JJ.tmJoukkueenIka ? JJ.tmJoukkueenIka({ nimi: j.nimi }) : null;
      return { jid: jid, nimi: j.nimi || jid, ika: typeof ika === 'number' && !isNaN(ika) ? ika : 999, laske: tmKayttoasteLaske(lista, jid) };
    }).filter(function (x) { return x.laske; }).sort(function (a, b) { return a.ika - b.ika || String(a.nimi).localeCompare(String(b.nimi), 'fi'); });
  }

  function _nuoli(s) { return s === 'ylos' ? '▲' : s === 'alas' ? '▼' : s === 'sama' ? '=' : ''; }
  function _soluHTML(c, t, esc) {
    var trendi = c.edellinenTeksti != null ? ' <span style="color:var(--ink3);font-size:10.5px" title="' + esc(t('Neljän viikon sarja')) + ': ' + esc(c.sarja.map(function (x) { return x == null ? '—' : x; }).join(' → ')) + '">' + _nuoli(c.suunta) + ' ' + esc(t('ed.')) + ' ' + esc(c.edellinenTeksti) + '</span>' : '';
    return '<td style="padding:6px 10px;text-align:right;white-space:nowrap">' + esc(c.teksti) + trendi + '</td>';
  }
  function _riviHTML(nimi, laske, t, esc, vahva) {
    return '<tr' + (vahva ? ' style="font-weight:600"' : '') + '><td style="padding:6px 10px;text-align:left">' + esc(nimi) + '</td>'
      + '<td style="padding:6px 10px;text-align:right;color:var(--ink3)">' + laske.pelaajia + '</td>' + laske.solut.map(function (c) { return _soluHTML(c, t, esc); }).join('') + '</tr>';
  }

  /* HTML: seurariville "Sovelluksen käyttö" -taulukko. opts: { esc, t, nimi (seuran nimi), joukkueet:true|false (oletus true), tyhjaTeksti }.
     Vain lukumääriä; ei nimiä (joukkueen nimi on sallittu, pelaajan ei). */
  function tmKayttoasteHTML(koosteet, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = typeof opts.t === 'function' ? opts.t : function (x) { return x; };
    var seura = tmKayttoasteLaske(koosteet);
    if (!seura) return '<div style="font-size:12px;color:var(--ink3);padding:6px 0" data-kayttoaste="tyhja">' + esc(t(opts.tyhjaTeksti || 'Käyttöaste alkaa kertyä seuraavasta viikkokoosteesta.')) + '</div>';
    var otsikko = '<tr style="color:var(--ink3);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em"><th style="padding:6px 10px;text-align:left;font-weight:600">&nbsp;</th><th style="padding:6px 10px;text-align:right;font-weight:600">' + esc(t('Pelaajia')) + '</th>'
      + MITTARIT.map(function (m) { return '<th style="padding:6px 10px;text-align:right;font-weight:600">' + esc(t(m.lbl)) + '</th>'; }).join('') + '</tr>';
    var rivit = _riviHTML(opts.nimi || t('Koko seura'), seura, t, esc, true);
    var jouk = opts.joukkueet === false ? [] : tmKayttoasteJoukkueet(koosteet);
    jouk.forEach(function (j) { rivit += _riviHTML(j.nimi, j.laske, t, esc, false); });
    return '<div data-kayttoaste="taulu" style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:12.5px;color:var(--ink)"><thead>' + otsikko + '</thead><tbody>' + rivit + '</tbody></table></div>'
      + '<div style="font-size:10.5px;color:var(--ink3);margin-top:6px">' + esc(t('Viikko')) + ' ' + esc(seura.vk) + ' · ' + esc(t('Alle 5 pelaajan joukkueista näytetään lukumäärä, ei prosenttia.')) + '</div>';
  }

  /* Usean seuran näkymä (Admin): jokainen seura <details>-lohkona — yhteenvetorivi (pelaajia · suostumus · aktiivinen 7/30 pv) auki-klikattuna joukkueet riveinä.
     seurat: [{ id, nimi, koosteet:[vanhin→uusin], virhe? }]. Seurojen järjestys = annettu (ei mittarijärjestystä). */
  function tmKayttoasteSeuratHTML(seurat, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = typeof opts.t === 'function' ? opts.t : function (x) { return x; };
    return (Array.isArray(seurat) ? seurat : []).map(function (s) {
      var l = s.virhe ? null : tmKayttoasteLaske(s.koosteet);
      var nimi = esc(s.nimi || s.id);
      if (s.virhe) return '<div style="padding:10px 0;font-size:12.5px"><b>' + nimi + '</b> <span style="color:var(--red)">' + esc(s.virhe) + '</span></div>';
      if (!l) return '<div style="padding:10px 0;font-size:12.5px"><b>' + nimi + '</b> <span style="color:var(--ink3)">' + esc(t('Käyttöaste alkaa kertyä seuraavasta viikkokoosteesta.')) + '</span></div>';
      var c = function (k) { return l.solut.filter(function (x) { return x.k === k; })[0]; };
      var yhteenveto = ['n_suostumus', 'n_aktiivinen_7', 'n_aktiivinen_30'].map(function (k) { var x = c(k); return esc(t(x.lbl)) + ' ' + esc(x.teksti) + (x.edellinenTeksti != null ? ' ' + _nuoli(x.suunta) : ''); }).join(' · ');
      return '<details data-kayttoaste-seura="' + esc(s.id) + '" style="border-top:.5px solid var(--border);padding:10px 0"><summary style="cursor:pointer;font-size:13px"><b>' + nimi + '</b> <span style="color:var(--ink3)">· ' + l.pelaajia + ' ' + esc(t('pelaajaa')) + ' · ' + yhteenveto + '</span></summary>'
        + '<div style="margin-top:8px">' + tmKayttoasteHTML(s.koosteet, { esc: esc, t: t, nimi: s.nimi || s.id }) + '</div></details>';
    }).join('');
  }

  /* Adminin "Pilotin tila" -osio kokonaan libissä (kuoren kasvukatto): kehys-HTML + lataus + "Päivitä kaikki". deps: { db, document, FieldPath, kutsu(data) → Promise (paivitaSeuranKooste), seurat() → tila.seurat, esc }.
     Luku: kooste-dokumentit (SA lukee), 4 viimeisintä viikkoa seuraa kohden (trendi); demo- ja arkistoidut seurat pois; yhden seuran lukuvirhe ei kaada muita. Päivitys: seura kerrallaan (palvelimen 30 s jäähy → 'tuore'). */
  function tmKayttoasteKehysHTML() {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:18px">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px"><div><span style="font-weight:600;font-size:14px">📈 Käyttöaste</span> <span style="font-size:11px;color:var(--ink3)">pelaajat ja perheet · lukumäärät viikkokoosteesta</span></div>'
      + '<button id="kayttoastePaivitaBtn" onclick="kayttoastePaivitaKaikki()" style="font-size:12px;padding:7px 13px;border:.5px solid var(--teal);background:rgba(40,176,144,.1);color:var(--teal);border-radius:6px;cursor:pointer">📊 Päivitä kaikki</button></div>'
      + '<div id="kayttoasteAlue" style="font-size:12.5px;color:var(--ink3)">Ladataan käyttöastetta…</div></div>';
  }
  function tmKayttoasteAdmin(d) {
    var esc = d.esc || _esc;
    var seurat = function () { return (d.seurat() || []).filter(function (s) { return s.demo !== true && s.aktiivinen !== false && s.tila !== 'arkistoitu'; }); };
    var alue = function () { return d.document.getElementById('kayttoasteAlue'); };
    async function lataa() {
      var el = alue(); if (!el) return; var lista = [];
      for (var s of seurat()) {
        try {
          lista.push({ id: s.id, nimi: s.nimi || s.id, koosteet: await tmKayttoasteLueKoosteet(d.db, d.FieldPath, s.id) });
        } catch (e) { lista.push({ id: s.id, nimi: s.nimi || s.id, virhe: 'Luku epäonnistui: ' + (e && e.message) }); }
      }
      el = alue(); if (!el) return;   // näkymä vaihtui latauksen aikana
      el.innerHTML = lista.length ? tmKayttoasteSeuratHTML(lista, { esc: esc }) : 'Ei seuroja.';
    }
    async function paivitaKaikki() {
      var btn = d.document.getElementById('kayttoastePaivitaBtn'), el = alue(), lista = seurat(), ok = 0, tuore = 0, virheita = 0;
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Päivitetään…'; }
      try {
        for (var s of lista) {
          if (el) el.innerHTML = 'Päivitetään koostetta: ' + esc(s.nimi || s.id) + ' (' + (ok + tuore + virheita + 1) + '/' + lista.length + ')…';
          try { var r = await d.kutsu({ seuraId: s.id }); if (r && r.data && r.data.tuore) tuore++; else ok++; } catch (e) { virheita++; }
        }
      } finally { if (btn) { btn.disabled = false; btn.textContent = '📊 Päivitä kaikki'; } }
      await lataa();
      var v = ok + ' päivitetty' + (tuore ? ', ' + tuore + ' tuore (alle 30 s)' : '') + (virheita ? ', ' + virheita + ' virhettä' : ''), el2 = alue();
      if (el2) el2.insertAdjacentHTML('beforeend', '<div style="font-size:11px;color:' + (virheita ? 'var(--red)' : 'var(--ink3)') + ';margin-top:8px">' + esc(v) + '</div>');
      return { ok: ok, tuore: tuore, virheita: virheita };
    }
    return { lataa: lataa, paivitaKaikki: paivitaKaikki };
  }

  var API = { PIENI_JOUKKUE: PIENI_JOUKKUE, MITTARIT: MITTARIT, tmKayttoasteLaske: tmKayttoasteLaske, tmKayttoasteJoukkueet: tmKayttoasteJoukkueet, tmKayttoasteHTML: tmKayttoasteHTML, tmKayttoasteSeuratHTML: tmKayttoasteSeuratHTML, tmKayttoasteKehysHTML: tmKayttoasteKehysHTML, tmIsoViikko: tmIsoViikko, tmKayttoasteLueKoosteet: tmKayttoasteLueKoosteet, tmKayttoasteAdmin: tmKayttoasteAdmin };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KAYTTOASTE = API;
})(typeof window !== 'undefined' ? window : this);
