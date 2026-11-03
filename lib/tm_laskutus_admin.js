/* ════════════════════════════════════════════════════════════════════════
   tm_laskutus_admin.js — Admin "Laskutus" -näkymä (Laskutus L1a, briiffi §4). VAIN SA (Rules v3.72).
   · "Tilanne nyt": lukee seuran joukkueet, pelaajat, käyttäjät ja laskutus_asetukset → tmLaskutusLaske (EI tallennu).
   · "Tallennetut": laskutus/{kk}/seurat/* (snapshotit; L1b:n ajastettu funktio luo ne, client ei kirjoita).
   · Tilanvaihto aktiivinen ↔ passiivinen joukkueittain: laskutustila + laskutustila_muutettu {pvm, uid, aika};
     ENSIMMÄINEN aktivointi asettaa laskutus_aktivoitu {pvm, uid, aika} — ei muutu sen jälkeen (PM 2.11. päätös 5).
   · CSV-lataus näkyvästä kuukaudesta.
   · SA-varapolku (L1b): "Luo snapshot" → callable laskutusKuukausiVarapolku (päättynyt kuukausi, myohassa: true, ei korvaa).
   Kaikki logiikka täällä (kuoren kasvukatto); Admin kytkee vain env:n. Merkkijonot +-liitoksella (§7.1).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _L() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_laskutus.js'); } catch (e) { /* ei */ } return root && root.TM_LASKUTUS; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function _eur(snt) { return (Number(snt || 0) / 100).toFixed(2).replace('.', ',') + ' €'; }
  /* Helsingin päivä 'YYYY-MM-DD' — yksi toteutus tm_laskutus.js:ssä (sama myös palvelimella) */
  function tmLaskutusPaiva(d) { return _L().tmLaskutusPaiva(d); }

  /* Tilanvaihdon kirjoitus (puhdas). joukkue = nykyinen dokumentti. aika = serverTimestamp-arvo tai null. */
  function tmLaskutusTilanvaihto(joukkue, uusi, uid, pvm, aika) {
    if (uusi !== 'aktiivinen' && uusi !== 'passiivinen') throw new Error('tuntematon laskutustila: ' + uusi);
    if (!uid) throw new Error('uid puuttuu');
    var j = joukkue || {}, merk = { pvm: pvm, uid: uid }; if (aika != null) merk.aika = aika;
    var upd = { laskutustila: uusi, laskutustila_muutettu: merk };
    if (uusi === 'aktiivinen' && !j.laskutus_aktivoitu) upd.laskutus_aktivoitu = Object.assign({}, merk);
    return upd;
  }

  /* Seuran syöte laskentaan. Virheellinen asetus → { virhe }, ei laskua. */
  function tmLaskutusLataaSeura(db, sid) {
    var S = db.collection('seurat').doc(sid), A = db.collection('laskutus_asetukset');
    return Promise.all([A.doc('oletus').get(), A.doc(sid).get(), S.collection('joukkueet').get(), S.collection('pelaajat').get(), S.collection('kayttajat').get()]).then(function (r) {
      var lista = function (snap) { return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); };
      var as = _L().tmLaskutusAsetukset(r[0].exists ? r[0].data() : null, r[1].exists ? r[1].data() : null);
      return { asetukset: as, seuraAsetettu: r[1].exists, joukkueet: lista(r[2]), pelaajat: lista(r[3]), kayttajat: lista(r[4]) };
    });
  }

  var KORTTI = 'background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:12px';
  var NAPPI = 'font-size:12px;padding:6px 12px;border:.5px solid var(--ink3);background:none;color:var(--ink2);border-radius:6px;cursor:pointer';
  var TH = 'text-align:left;font-size:11px;font-weight:600;color:var(--ink3);padding:6px 8px;border-bottom:1px solid var(--border);white-space:nowrap';
  var TD = 'font-size:13px;padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap';
  var VAROITUS = 'font-size:12px;background:rgba(224,160,64,.12);border-radius:8px;padding:8px 11px;margin-top:8px';

  /* Yhden seuran tulos → HTML. opts: { seuraNimi, muokattava, nimet: {pid: nimi}, virhe } */
  function tmLaskutusTulosHTML(t, opts) {
    var o = opts || {}, nimi = _esc(o.seuraNimi || t.seuraId);
    var h = '<div style="' + KORTTI + '"><div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:10px">'
      + '<div><span style="font-weight:600;font-size:15px">' + nimi + '</span> <span style="font-size:12px;color:var(--ink3)">' + _esc(t.kk)
      + (t.laskutettava ? ' · sopimus alkaen ' + _esc(t.sopimus_alkaen) : ' · ei laskuteta (ei sopimusta tai ennen sopimuksen alkua)') + ' · peruste ' + _esc(t.hinnat.laskentaperuste)
      + (t.hinnat.lista_alkaen_kk_aktivoinnista ? ' (lista kk ' + (t.hinnat.lista_alkaen_kk_aktivoinnista + 1) + ' alkaen)' : '') + '</span></div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:26px;font-weight:400">' + _eur(t.yhteensa_snt) + '</div></div>'
      + '<div style="font-size:12px;color:var(--ink2);margin-bottom:10px">Seuralisenssi ' + _eur(t.seuralisenssi_snt) + ' + pelaajamaksut ' + _eur(t.pelaajamaksut_snt) + ' = ' + _eur(t.yhteensa_snt) + ' (alv ' + t.alv_prosentti + ' %)'
      + ' · hinta ' + _eur(t.hinnat.hinta_pelaaja_snt) + '/pelaaja, katto ' + _eur(t.hinnat.joukkuekatto_snt) + '/joukkue</div>';
    h += '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%"><thead><tr>'
      + ['Joukkue', 'Tila', 'Vastuuvalmentaja', 'Peruste', 'Maksulliset', 'Alle 10 v (0 €)', 'Ilman suostumusta', 'Ikä puuttuu', 'Katto', 'Summa', ''].map(function (x) { return '<th style="' + TH + '">' + x + '</th>'; }).join('') + '</tr></thead><tbody>';
    t.joukkueet.forEach(function (r) {
      var akt = r.laskutustila === 'aktiivinen', vari = akt ? 'var(--teal)' : 'var(--ink3)';
      var nappi = o.muokattava ? '<button style="' + NAPPI + '" onclick="laskutusVaihdaTila(\'' + _esc(t.seuraId) + '\',\'' + _esc(r.id) + '\',\'' + (akt ? 'passiivinen' : 'aktiivinen') + '\')">' + (akt ? 'Passivoi' : 'Aktivoi') + '</button>' : '';
      h += '<tr' + (akt ? '' : ' style="opacity:.6"') + '><td style="' + TD + '">' + _esc(r.nimi) + (r.laskutus_aktivoitu ? ' <span style="font-size:11px;color:var(--ink3)">akt. ' + _esc(r.laskutus_aktivoitu) + '</span>' : '') + '</td>'
        + '<td style="' + TD + ';color:' + vari + '">' + r.laskutustila + '</td>'
        + '<td style="' + TD + (akt && !r.vastuuvalmentaja ? ';color:var(--amber)' : '') + '">' + (r.vastuuvalmentaja_sa ? 'SA:n vahvistama' : r.vastuuvalmentaja ? 'kyllä (' + r.valmentajia + ')' : 'ei') + '</td>'
        + '<td style="' + TD + '">' + (r.peruste ? _esc(r.peruste) + (r.kk_aktivoinnista ? ' · kk ' + r.kk_aktivoinnista : '') : '—') + '</td>'
        + '<td style="' + TD + '">' + (akt ? r.maksulliset : '—') + '</td><td style="' + TD + '">' + r.alle_ika + '</td><td style="' + TD + '">' + r.ilman_suostumusta + '</td>'
        + '<td style="' + TD + (r.ika_puuttuu ? ';color:var(--amber)' : '') + '">' + r.ika_puuttuu + '</td><td style="' + TD + '">' + (r.katto_kaytossa ? 'kyllä' : 'ei') + '</td>'
        + '<td style="' + TD + ';font-weight:600">' + _eur(r.summa_snt) + '</td><td style="' + TD + '">' + nappi + '</td></tr>';
    });
    h += '</tbody></table></div>';
    var jnimi = {}; t.joukkueet.forEach(function (r) { jnimi[r.id] = r.nimi; });
    var v = t.varoitukset || {};
    if ((v.ilman_valmentajaa || []).length) h += '<div style="' + VAROITUS + '">🟠 <b>Aktiivinen joukkue ilman valmentajaa (0 €, ratkaise):</b> ' + v.ilman_valmentajaa.map(function (id) { return _esc(jnimi[id] || id); }).join(', ') + '</div>';
    if ((v.aktivointi_puuttuu || []).length) h += '<div style="' + VAROITUS + '">🟠 <b>Aktivointipäivä puuttuu (välimalli laskee suostumuksella):</b> ' + v.aktivointi_puuttuu.map(function (id) { return _esc(jnimi[id] || id); }).join(', ') + '</div>';
    var ip = (t.pelaajat && t.pelaajat.ika_puuttuu_idt) || [];
    if (ip.length) h += '<div style="' + VAROITUS + '">🟠 <b>Syntymävuosi puuttuu (' + ip.length + ', laskutetaan; korjaa):</b> ' + ip.map(function (id) { return _esc((o.nimet && o.nimet[id]) || id); }).join(', ') + '</div>';
    if (t.pelaajat) h += '<div style="font-size:11px;color:var(--ink3);margin-top:8px">Pelaajia ' + t.pelaajat.yhteensa + ' · laskussa ' + t.pelaajat.laskussa + ' · ei aktiivista joukkuetta ' + t.pelaajat.ilman_aktiivista_joukkuetta + ' · poissa (arkistoitu/demo/ei aktiivinen) ' + t.pelaajat.poissa + '</div>';
    return h + '</div>';
  }

  /* Näkymä. env: { db, FieldValue, kutsu(nimi): callable, alue(): Element, seurat(): [{id,nimi}], uid(): string, tuoreToken(): Promise, toast(teksti, tyyppi), vahvista(teksti): bool, lataaTiedosto(nimi, sisalto) } */
  function tmLaskutusAdmin(env) {
    var L = _L(), tila = root && root.__tmLaskutusTila || { kk: L.tmLaskutusKk(new Date()), sid: '', tulokset: [], tapa: 'nyt' };
    if (root) root.__tmLaskutusTila = tila;
    function nimiSeura(sid) { var s = (env.seurat() || []).find(function (x) { return x.id === sid; }); return (s && s.nimi) || sid; }
    function sisalto(html) { var el = env.alue().querySelector('#laskutusSisalto'); if (el) el.innerHTML = html; }
    function kehys() {
      var seurat = (env.seurat() || []).slice().sort(function (a, b) { return String(a.nimi || a.id).localeCompare(String(b.nimi || b.id), 'fi'); });
      var k = 'font-size:12px;padding:5px 8px;background:var(--bg2);color:var(--text);border:.5px solid var(--ink3);border-radius:6px';
      env.alue().innerHTML = '<div class="sivuOtsikko"><div class="sivuEyebrow">Hallinto</div><div class="sivuH1">Laskutus</div></div>'
        + '<div style="margin:12px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
        + '<select id="laskutusSeura" style="' + k + '"><option value="">Valitse seura</option>' + seurat.map(function (s) { return '<option value="' + _esc(s.id) + '"' + (s.id === tila.sid ? ' selected' : '') + '>' + _esc(s.nimi || s.id) + '</option>'; }).join('') + '</select>'
        + '<button style="' + NAPPI + '" onclick="laskutusTilanneNyt()">Tilanne nyt</button>'
        + '<input id="laskutusKk" type="month" value="' + _esc(tila.kk) + '" style="' + k + '">'
        + '<button style="' + NAPPI + '" onclick="laskutusTallennetut()">Tallennetut</button>'
        + '<button style="' + NAPPI + '" onclick="laskutusCsv()">⬇ CSV</button>'
        + '<button style="' + NAPPI + '" onclick="laskutusVarapolku()" title="Vain jos kuun 1. päivän ajastettu ajo epäonnistui">Luo snapshot (varapolku)</button></div>'
        + '<div style="font-size:11px;color:var(--ink3);margin-bottom:12px">"Tilanne nyt" laskee valitun seuran valitulle kuukaudelle nykytilasta eikä tallennu. "Tallennetut" näyttää kuukauden snapshotit (luodaan ajastetusti kuun 1. päivänä klo 6). Jos ajastettu ajo epäonnistui, "Luo snapshot" luo päättyneen kuukauden snapshotit nykytilasta (merkitään myöhässä).</div>'
        + '<div id="laskutusSisalto"></div>';
    }
    function lueValinnat() { var a = env.alue(), s = a.querySelector('#laskutusSeura'), k = a.querySelector('#laskutusKk'); if (s) tila.sid = s.value; if (k && k.value) tila.kk = k.value; }
    function tilanneNyt() {
      lueValinnat(); if (!tila.sid) { env.toast('Valitse seura', 'virhe'); return Promise.resolve(); }
      if (L.tmLaskutusKkIndeksi(tila.kk) === null) { env.toast('Valitse kuukausi', 'virhe'); return Promise.resolve(); }
      sisalto('<div style="color:var(--ink3);padding:12px">Lasketaan…</div>');
      var sid = tila.sid, kk = tila.kk;
      return tmLaskutusLataaSeura(env.db, sid).then(function (d) {
        if (!d.asetukset.ok) { tila.tulokset = []; sisalto('<div style="' + VAROITUS + '">Laskutusasetukset ovat virheelliset: ' + _esc(d.asetukset.virhe) + '</div>'); return; }
        var t = L.tmLaskutusLaske({ kk: kk, seuraId: sid, asetukset: d.asetukset.asetukset, joukkueet: d.joukkueet, pelaajat: d.pelaajat, kayttajat: d.kayttajat });
        var nimet = {}; d.pelaajat.forEach(function (p) { nimet[p.id] = ((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim() || p.id; });
        tila.tulokset = [t]; tila.tapa = 'nyt'; tila.docs = {}; d.joukkueet.forEach(function (j) { tila.docs[j.id] = j; });
        sisalto('<div style="font-size:12px;color:var(--amber);margin-bottom:8px">Esikatselu — ei tallennettu.' + (d.seuraAsetettu ? '' : ' Seuralla ei ole laskutusasetuksia (= ei sopimusta).') + '</div>' + tmLaskutusTulosHTML(t, { seuraNimi: nimiSeura(sid), muokattava: true, nimet: nimet }));
      }).catch(function (e) { sisalto('<div style="color:var(--red);padding:12px">Lataus epäonnistui: ' + _esc(e && e.message) + '</div>'); });
    }
    function tallennetut() {
      lueValinnat(); if (L.tmLaskutusKkIndeksi(tila.kk) === null) { env.toast('Valitse kuukausi', 'virhe'); return Promise.resolve(); }
      var kk = tila.kk; sisalto('<div style="color:var(--ink3);padding:12px">Ladataan…</div>');
      return env.db.collection('laskutus').doc(kk).collection('seurat').get().then(function (snap) {
        tila.tulokset = snap.docs.map(function (d) { return Object.assign({ seuraId: d.id }, d.data()); }).filter(function (t) { return Array.isArray(t.joukkueet) && t.hinnat; });
        tila.tapa = 'tallennettu';
        if (!tila.tulokset.length) { sisalto('<div style="color:var(--ink3);padding:12px">Kuukaudelle ' + _esc(kk) + ' ei ole tallennettuja laskuja.</div>'); return; }
        var yht = tila.tulokset.reduce(function (s, t) { return s + (t.yhteensa_snt || 0); }, 0);
        sisalto('<div style="font-size:13px;margin-bottom:10px">' + tila.tulokset.length + ' seuraa · yhteensä <b>' + _eur(yht) + '</b></div>' + tila.tulokset.map(function (t) { return tmLaskutusTulosHTML(t, { seuraNimi: nimiSeura(t.seuraId), muokattava: false }); }).join(''));
      }).catch(function (e) { sisalto('<div style="color:var(--red);padding:12px">Lataus epäonnistui: ' + _esc(e && e.message) + '</div>'); });
    }
    function vaihdaTila(sid, jid, uusi) {
      var j = (tila.docs || {})[jid] || {}, nimi = j.nimi || jid;
      var teksti = uusi === 'aktiivinen' ? 'Aktivoi ' + nimi + ' laskutukseen?' + (j.laskutus_aktivoitu ? '' : ' Tämä on joukkueen ensimmäinen aktivointi (päivä tallentuu pysyvästi).') : 'Passivoi ' + nimi + '? Joukkue ei näy laskussa.';
      if (!env.vahvista(teksti)) return Promise.resolve(false);
      var upd = tmLaskutusTilanvaihto(j, uusi, env.uid(), tmLaskutusPaiva(new Date()), env.FieldValue.serverTimestamp());
      return Promise.resolve(env.tuoreToken()).then(function () { return env.db.collection('seurat').doc(sid).collection('joukkueet').doc(jid).update(upd); })
        .then(function () { env.toast('✓ ' + nimi + ': ' + uusi, 'ok'); return tilanneNyt(); }).then(function () { return true; })
        .catch(function (e) { env.toast('Tilan vaihto epäonnistui: ' + (e && e.message), 'virhe'); return false; });
    }
    /* SA-varapolku (L1b): callable laskutusKuukausiVarapolku valitulle kuukaudelle — vain jos ajastettu ajo epäonnistui. Ei korvaa olemassa olevia snapshoteja. */
    function varapolku() {
      lueValinnat(); var kk = tila.kk;
      if (L.tmLaskutusKkIndeksi(kk) === null) { env.toast('Valitse kuukausi', 'virhe'); return Promise.resolve(null); }
      if (L.tmLaskutusKkIndeksi(kk) >= L.tmLaskutusKkIndeksi(L.tmLaskutusKk(new Date()))) { env.toast('Kuukausi ' + kk + ' ei ole vielä päättynyt', 'virhe'); return Promise.resolve(null); }
      if (!env.vahvista('Luo kuukauden ' + kk + ' snapshot kaikille seuroille nykytilasta (varapolku, merkitään myöhässä)? Olemassa olevia ei korvata.')) return Promise.resolve(null);
      return Promise.resolve(env.tuoreToken()).then(function () { return env.kutsu('laskutusKuukausiVarapolku')({ kk: kk }); }).then(function (res) {
        var r = (res && res.data) || {}, virheet = r.virheet || [], onJo = r.on_jo || [];
        env.toast('✓ ' + kk + ': luotu ' + (r.luotu || 0) + (onJo.length ? ', oli jo ' + onJo.length : '') + (virheet.length ? ', virheitä ' + virheet.length + ' (' + virheet.map(function (v) { return v.sid; }).join(', ') + ')' : '') + ' · ' + _eur(r.yhteensa_snt), virheet.length ? 'virhe' : 'ok');
        return tallennetut().then(function () { return r; });
      }).catch(function (e) { env.toast('Varapolku epäonnistui: ' + (e && e.message), 'virhe'); return null; });
    }
    function csv() {
      if (!tila.tulokset.length) { env.toast('Ei ladattavaa — hae ensin tilanne tai tallennetut', 'virhe'); return; }
      var nimet = {}; (env.seurat() || []).forEach(function (s) { nimet[s.id] = s.nimi || s.id; });
      env.lataaTiedosto('laskutus_' + tila.kk + (tila.tapa === 'nyt' ? '_esikatselu_' + tila.tulokset[0].seuraId : '') + '.csv', '﻿' + L.tmLaskutusCsv(tila.tulokset, nimet));
    }
    return { render: function () { kehys(); }, tilanneNyt: tilanneNyt, tallennetut: tallennetut, vaihdaTila: vaihdaTila, varapolku: varapolku, csv: csv };
  }

  var API = { tmLaskutusAdmin: tmLaskutusAdmin, tmLaskutusTilanvaihto: tmLaskutusTilanvaihto, tmLaskutusLataaSeura: tmLaskutusLataaSeura, tmLaskutusTulosHTML: tmLaskutusTulosHTML, tmLaskutusPaiva: tmLaskutusPaiva };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_LASKUTUS_ADMIN = API;
})(typeof window !== 'undefined' ? window : this);
