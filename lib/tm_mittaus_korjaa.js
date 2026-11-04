/* ════════════════════════════════════════════════════════════════════════
   tm_mittaus_korjaa.js — B3: yksittäisen mittauksen KORJAUS (E2.3 / E2.3.1) ja Poista/Palauta-rebuildin (E2.2 / E2.2.1) jaettu reitti.
   Siirretty sanatarkasti TalentMaster_VP_v25.html:stä, jotta Kehitystyöpöydän Profiili (Kaikki mittaukset -sheet) ja VP käyttävät SAMAA
   korjausikkunaa ja SAMAA kirjoituspolkua. Ei uutta kirjoituspolkua: lähdedokki testitulokset/{id} ylikirjoitetaan paikallaan (testit.<avain> +
   korjattu.<avain> {kuka, milloin}) ja pikakentät lasketaan uudelleen vain tmRakennaPikakentatArkistosta-primitiivillä (E2.2.1-poistosuoja).
   VP:n käytös on lukittu karakterisointitesteihin (tests/b3_vp_mittaus_*_karakterisointi.test.js). Dual-export: module.exports || window.TM_MITTAUS_KORJAA.
   · Puhtaat: katTesti · arvo · onkoKomposiitti · korjaaArvo · kuljetusRangaistukset · kuljetusNetto · komposiittiSyotteesta · protokollaId
              rebuildMerkinnat · kenttaDomain · suodataPoistetut · merkinnat · rivinKohde
   · dialogi(opts, env)                       → Promise<number | {raaka, rangaistukset, ennenaikaiset} | null>   env: { doc, t, esc, pvmFi }
   · rebuildKirjoita(env, p, docs)            → Promise<res | null>   env: { db, seuraId, firebase, rakenna }
   · korjaa(env, p, docs, dokkiId, avain)     → Promise<'korjattu' | 'peruttu' | 'ei' | 'virhe'>
        env lisäksi: { uid, K, voiMuokata(p), dialogi(opts), paivita(p), toast(viesti, tyyppi), t }
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var HOP = Object.prototype.hasOwnProperty;

  /* Katalogitesti stored-avaimesta. testitulokset-testit-avaimet ovat SEKAMUOTOA: import→'lin30m', Pikakirjaus→'lin_30m'.
     Suora osuma (Excel-id) TAI käänteinen lin_ → lin. Johdannaiset (mas_kmh, *_protokolla) → null (ohitetaan listalta). K = TM_TESTIKATALOGI. */
  function katTesti(avain, K) {
    if (!K) return null;
    var t = K.tmKatalogiTesti(avain);
    if (t) return t;
    var rev = { lin_5m: 'lin5m', lin_10m: 'lin10m', lin_30m: 'lin30m' };
    return rev[avain] ? K.tmKatalogiTesti(rev[avain]) : null;
  }
  function arvo(v) {
    if (v == null) return null;
    if (typeof v === 'object') v = (v.tulos != null ? v.tulos : (v.paras != null ? v.paras : (v.netto != null ? v.netto : null)));
    var n = parseFloat(v); return isNaN(n) ? null : n;
  }
  /* Komposiitti = objekti jolla raaka/rangaistukset/ennenaikaiset (esim. kuljetus_laukaus). */
  function onkoKomposiitti(v) {
    return v != null && typeof v === 'object' &&
      (HOP.call(v, 'raaka') ||
       HOP.call(v, 'rangaistukset') ||
       HOP.call(v, 'ennenaikaiset'));
  }
  /* Säilytä arvon muoto — objekti → päivitä tulos (tai paras); skalaari → korvaa; komposiitti → null (ei tallenneta). */
  function korjaaArvo(vanha, uusi) {
    if (onkoKomposiitti(vanha)) return null;
    if (vanha != null && typeof vanha === 'object') {
      var o = Object.assign({}, vanha);
      if (HOP.call(o, 'tulos')) o.tulos = uusi; else o.paras = uusi;
      return o;
    }
    return uusi;
  }
  /* E2.3.1 — kuljetus_laukaus-komposiitti. Rangaistuslista "5, 10, -2" → [5,10,-2] (tyhjät/NaN pois). Negatiiviset sallitaan. */
  function kuljetusRangaistukset(str) {
    return String(str == null ? '' : str).split(',').map(function (s) { return parseFloat(String(s).trim()); }).filter(function (n) { return !isNaN(n); });
  }
  /* Netto s — REPLIKA lib/tm_pikakentat.js _kuljetusLaukausTulos (⚠ PIDÄ SYNKASSA; primitiivi = totuuslähde).
     max(0, raaka + ennenaikaiset*10 − Σrangaistukset), 2 desimaalia. NaN raaka → null. */
  function kuljetusNetto(raaka, ennenaikaiset, rangaistukset) {
    var r = parseFloat(raaka); if (isNaN(r)) return null;
    var sum = (rangaistukset || []).reduce(function (a, x) { return a + (parseFloat(x) || 0); }, 0);
    var ennen = parseInt(ennenaikaiset) || 0;
    return Math.max(0, +(r + ennen * 10 - sum).toFixed(2));
  }
  /* Komposiittiobjekti dialogin syötteestä. Raaka pakollinen (NaN → null). Ennen/rang oletus 0/[]. */
  function komposiittiSyotteesta(raakaStr, ennenStr, rangStr) {
    var r = parseFloat(raakaStr); if (isNaN(r)) return null;
    var ennen = parseInt(ennenStr); if (isNaN(ennen) || ennen < 0) ennen = 0;
    return { raaka: r, rangaistukset: kuljetusRangaistukset(rangStr), ennenaikaiset: ennen };
  }

  /* Lin-splittien avainnormalisointi: tuonti-dokit tallentavat 'lin30m'/'lin10m'/'lin5m', mutta primitiivi/_HH_MAP odottaa Testaus_v9/Pikakirjaus-muotoa
     'lin_30m' jne. Ilman tätä tuontidokin 30 m katoaisi hh_viimeisin:istä rebuildissa (datahukka). EI katalogimuunnos — vain primitiivin raaka-avain. */
  var KEYNORM = { lin30m: 'lin_30m', lin10m: 'lin_10m', lin5m: 'lin_5m' };
  /* PR G: tallennettu testiavain → kanoninen katalogi-id (H-H vs TK tunnisteella, lib/tm_testikatalogi.js tmTestiProtokollaId). Lib puuttuu → avain. */
  function protokollaId(avain, testit, docProtokolla, K) {
    return (K && typeof K.tmTestiProtokollaId === 'function') ? K.tmTestiProtokollaId(avain, testit, docProtokolla) : avain;
  }
  /* Cache-dokit [{__id, data}] → primitiivin syöte [{pvm, tulokset}], mitätöidyt avaimet karsittuina. */
  function rebuildMerkinnat(cacheDocs, K) {
    return (cacheDocs || []).map(function (w) {
      var d = (w && w.data) || {}, testit = d.testit || {}, mit = d.mitatoidut || {};
      var tulokset = {};
      Object.keys(testit).forEach(function (k) {
        if (mit[k]) return;                                        // karsi mitätöity (mitatoidut avaimet = stored testit-avaimet)
        if (/_protokolla$/.test(k)) return;                        // merkintä, ei mittaus
        // PR G: H-H vs TK TUNNISTEELLA — vanha Excel-H-H-dokki ('pujottelu' + _protokolla:'hh' / hh_*-protokolla) EI saa
        // valua primitiivin TK-polulle (TKI/tk_lajit); se kuuluu hh_viimeisin.pujottelu:iin (pujottelu_hh).
        var id = protokollaId(k, testit, d.protokolla, K);
        if (id !== k && HOP.call(testit, id)) return;              // eksplisiittinen avain voittaa
        tulokset[KEYNORM[id] || id] = testit[k];                   // normalisoi lin-splitit primitiivin raaka-avaimeen
      });
      return { pvm: d.testauspvm || '', tulokset: tulokset };      // täysin mitätöity dokki → tulokset:{}
    });
  }
  /* E2.2.1 — DATAHUKKA-FIX: primitiivin `poistetut` sisältää kentät, jotka olivat pelaajadokissa muttei rebuild-tuloksessa. Rebuild näkee VAIN
     testitulokset-arkiston → muualta tulleet pikakentät päätyisivät FieldValue.delete():en. Älä poista kenttää, jonka DOMAIN (hh/tki) ei ole edustettuna
     raa'assa arkistossa (ml. mitätöidyt). Domain: hh_/d1_/d2_ → 'hh' · tki_/tk_ → 'tki' · muu → null (suojattu). */
  function kenttaDomain(f) {
    if (/^(hh_|d1_|d2_)/.test(f)) return 'hh';
    if (/^(tki_|tk_)/.test(f)) return 'tki';
    return null;
  }
  var HH_AVAIMET = { lin5m: 1, lin_5m: 1, lin10m: 1, lin_10m: 1, lin30m: 1, lin_30m: 1, hyppy_cj: 1, cmj: 1, mas: 1, kasirata: 1, sm_juoksu: 1, sm_pallo: 1, pujottelu_hh: 1, syotto_hh: 1 };
  var TK_AVAIMET = { ponnauttelu: 1, syotto: 1, pujottelu: 1, kuljetus_laukaus: 1, pituuspotku: 1 };
  function suodataPoistetut(poistetut, cacheDocs, K) {
    if (!poistetut || !poistetut.length) return poistetut || [];
    var hhEdustettu = false, tkiEdustettu = false;
    (cacheDocs || []).forEach(function (w) {
      var testit = (w && w.data && w.data.testit) || {};
      Object.keys(testit).forEach(function (k0) {
        var k = protokollaId(k0, testit, w && w.data && w.data.protokolla, K);   // PR G: H-H vs TK tunnisteella
        if (HH_AVAIMET[k]) hhEdustettu = true;
        if (TK_AVAIMET[k]) tkiEdustettu = true;
      });
    });
    return poistetut.filter(function (f) {
      var dom = kenttaDomain(f);
      if (dom === 'hh') return hhEdustettu;    // poista vain jos H-H edustettu (dokki olemassa, myös mitätöity)
      if (dom === 'tki') return tkiEdustettu;  // poista vain jos TKI edustettu
      return false;                            // kartoittamaton kenttä → suojataan (fail-safe)
    });
  }
  /* Mittausrivit cachetuista dokeista (yksi rivi per katalogitesti-avain): { dokkiId, pvm, avain (tallennettu), id (kanoninen katalogi-id), nimi, yksikko, kategoria, arvo, lahde, mitatoituMeta }. */
  function merkinnat(dwid, K) {
    var rows = [];
    (dwid || []).forEach(function (w) {
      var data = w.data || {}, testit = data.testit || {}, mit = data.mitatoidut || {};
      var lahde = data.lahde || data.protokolla || '';
      Object.keys(testit).forEach(function (avain) {
        // PR G: H-H vs TK tunnisteella (vanha Excel-H-H-dokki: 'pujottelu' + pujottelu_protokolla:'hh' → Pujottelu (H-H)).
        // avain (tallennettu) säilyy mitätöinti-/palautusavaimena; vain katalogihaku kanonisella id:llä.
        var kid = protokollaId(avain, testit, data.protokolla, K), kat = katTesti(kid, K); if (!kat) return;   // ei-katalogitesti / johdannainen → ohita
        var a = arvo(testit[avain]); if (a == null) return;
        rows.push({
          dokkiId: w.__id, pvm: data.testauspvm || '', avain: avain, id: kat.id || kid,
          nimi: kat.nimi, yksikko: kat.yksikko, kategoria: kat.kategoria,
          arvo: a, lahde: lahde, mitatoituMeta: mit[avain] || null
        });
      });
    });
    return rows;
  }
  /* Kehitystyöpöydän "Kaikki mittaukset" -rivi → korjattava testitulos. Rivin id on näkymän tunniste (tm_mittaukset.js), lahde 'hh' | 'tk' | 'sm';
     katalogi-id: H-H:n syöttö/pujottelu = *_hh, CMJ = hyppy_cj, muut sellaisenaan. Osuma = sama katalogi-id + sama testipäivä, ei mitätöity, TASAN yksi.
     Muuten null (ei Korjaa-linkkiä): kasvu, peli, kehon valmius ja SJ eivät ole testitulokset-arkistossa. */
  var NAKYMA_KATALOGI = { cmj: 'hyppy_cj' };
  function rivinKohde(rivi, rows) {
    if (!rivi || !rivi.viimeisin || !rivi.viimeisin.pvm || ['hh', 'tk', 'sm'].indexOf(rivi.lahde) < 0) return null;
    var kid = rivi.lahde === 'hh' && (rivi.id === 'syotto' || rivi.id === 'pujottelu') ? rivi.id + '_hh' : (NAKYMA_KATALOGI[rivi.id] || rivi.id);
    var pv = String(rivi.viimeisin.pvm).slice(0, 10);
    var osumat = (rows || []).filter(function (r) { return r.id === kid && !r.mitatoituMeta && String(r.pvm || '').slice(0, 10) === pv; });
    return osumat.length === 1 ? { dokkiId: osumat[0].dokkiId, avain: osumat[0].avain } : null;
  }

  /* Brändätty Korjaa-dialogi → Promise<number | {raaka,rangaistukset,ennenaikaiset} | null>. Skalaari: number-input.
     Komposiitti (opts.komposiitti = stored-objekti): raaka/ennenaikaiset/rangaistukset-kentät + livenä netto-esikatselu.
     env: { doc (document), t (kääntäjä fi-tekstistä), esc (HTML-escape), pvmFi (päivän näyttömuoto) }. Tekstit = VP:n vpT-avaimet (sv TM_VP_I18N / TM_MASTER_I18N). */
  function dialogi(opts, env) {
    opts = opts || {}; env = env || {};
    var document = env.doc || root.document, t = env.t || function (s) { return s; }, _esc = env.esc, pvmFiFn = env.pvmFi || function (x) { return x || '—'; };
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(17,17,16,.72);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)';
      var pvmFi = pvmFiFn(opts.pvm);
      var h = '<div style="background:var(--bg2);border:.5px solid var(--border);border-radius:8px;width:min(400px,94vw);padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.4)">';
      h += '<div style="font-family:var(--font-serif);font-size:21px;font-weight:400;color:var(--ink);margin-bottom:4px">' + t('Korjaa mittaus') + '</div>';
      h += '<div style="font-family:var(--font-m);font-size:11px;color:var(--ink3);margin-bottom:16px">' + _esc(opts.nimi || '') + (opts.yksikko ? ' · ' + _esc(opts.yksikko) : '') + ' ' + t('· testipäivä') + ' ' + _esc(pvmFi) + ' <span style="opacity:.7">🔒</span></div>';
      if (opts.komposiitti) {
        var k0 = opts.komposiitti || {};
        var _in = 'box-sizing:border-box;background:var(--bg3);border:.5px solid var(--border);border-radius:6px;color:var(--ink);padding:9px 11px;font-family:var(--font-serif);font-size:18px';
        var _lbl = 'display:block;font-size:12px;color:var(--ink2);margin:0 0 5px';
        h += '<div style="font-size:12px;line-height:1.45;color:var(--ink3);margin-bottom:12px">' + t('Koostettu tulos — korjaa osat. Netto lasketaan kaavalla max(0, raaka + ennenaikaiset·10 − Σrangaistukset).') + '</div>';
        h += '<div style="display:flex;gap:10px;margin-bottom:12px">'
          + '<label style="flex:1"><span style="' + _lbl + '">' + t('Raaka (s)') + '</span><input data-act="raaka" type="number" step="any" inputmode="decimal" value="' + _esc(k0.raaka != null ? k0.raaka : '') + '" style="width:100%;' + _in + '"></label>'
          + '<label style="flex:0 0 108px"><span style="' + _lbl + '">' + t('Ennenaikaiset') + '</span><input data-act="ennen" type="number" step="1" min="0" inputmode="numeric" value="' + _esc(k0.ennenaikaiset != null ? k0.ennenaikaiset : 0) + '" style="width:100%;' + _in + '"></label></div>';
        h += '<label style="display:block;margin-bottom:12px"><span style="' + _lbl + '">' + t('Rangaistukset (pilkuin eroteltu, esim. 5, 10)') + '</span><input data-act="rang" type="text" inputmode="decimal" value="' + _esc((k0.rangaistukset || []).join(', ')) + '" style="width:100%;' + _in + ';font-family:var(--font-m);font-size:15px"></label>';
        h += '<div style="font-family:var(--font-m);font-size:13px;color:var(--teal);margin-bottom:6px">' + t('Netto:') + ' <b data-act="netto">—</b> s</div>';
        h += '<div data-act="err" style="display:none;font-size:12px;color:var(--red);margin-bottom:10px">' + t('Raaka-aika on pakollinen (numero).') + '</div>';
        h += '<div style="display:flex;gap:10px;justify-content:flex-end"><button data-act="peru" style="font-family:\'DM Sans\',sans-serif;font-size:13px;padding:9px 16px;border-radius:6px;cursor:pointer;background:transparent;border:.5px solid var(--border);color:var(--ink2)">' + t('Peruuta') + '</button><button data-act="ok" style="font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;border-radius:6px;cursor:pointer;border:none;background:var(--teal);color:#fff">' + t('Tallenna korjaus') + '</button></div>';
      } else {
        h += '<label style="display:block;font-size:12px;color:var(--ink2);margin-bottom:6px">' + t('Korjattu arvo (') + _esc(opts.yksikko || '') + ')</label>';
        h += '<input data-act="arvo" type="number" step="any" inputmode="decimal" value="' + _esc(opts.arvo != null ? opts.arvo : '') + '" style="width:100%;box-sizing:border-box;background:var(--bg3);border:.5px solid var(--border);border-radius:6px;color:var(--ink);padding:10px 12px;font-family:var(--font-serif);font-size:20px;margin-bottom:18px">';
        h += '<div style="display:flex;gap:10px;justify-content:flex-end"><button data-act="peru" style="font-family:\'DM Sans\',sans-serif;font-size:13px;padding:9px 16px;border-radius:6px;cursor:pointer;background:transparent;border:.5px solid var(--border);color:var(--ink2)">' + t('Peruuta') + '</button><button data-act="ok" style="font-family:\'DM Sans\',sans-serif;font-size:13px;font-weight:600;padding:9px 18px;border-radius:6px;cursor:pointer;border:none;background:var(--teal);color:#fff">' + t('Tallenna korjaus') + '</button></div>';
      }
      h += '</div>';
      ov.innerHTML = h;
      var done = function (v) { if (ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown', onKey); resolve(v); };
      var inp = ov.querySelector('[data-act=arvo]');
      var raakaEl = ov.querySelector('[data-act=raaka]'), ennenEl = ov.querySelector('[data-act=ennen]'), rangEl = ov.querySelector('[data-act=rang]');
      var nettoEl = ov.querySelector('[data-act=netto]'), errEl = ov.querySelector('[data-act=err]');
      var paivitaNetto = function () {
        if (!nettoEl) return;
        var netto = kuljetusNetto(raakaEl.value, ennenEl.value, kuljetusRangaistukset(rangEl.value));
        nettoEl.textContent = (netto == null) ? '—' : netto;
      };
      var talleta = function () {
        if (opts.komposiitti) {
          var komp = komposiittiSyotteesta(raakaEl.value, ennenEl.value, rangEl.value);
          if (!komp) { if (errEl) errEl.style.display = 'block'; if (raakaEl) raakaEl.focus(); return; }   // raaka pakollinen
          return done(komp);
        }
        if (!inp) return done(null); var n = parseFloat(inp.value); done(isNaN(n) ? null : n);
      };
      var onKey = function (e) { if (e.key === 'Escape') done(null); else if (e.key === 'Enter') talleta(); };
      ov.addEventListener('click', function (e) { if (e.target === ov) done(null); });
      var b;
      if ((b = ov.querySelector('[data-act=peru]'))) b.addEventListener('click', function () { done(null); });
      if ((b = ov.querySelector('[data-act=ok]'))) b.addEventListener('click', talleta);
      if (opts.komposiitti) { [raakaEl, ennenEl, rangEl].forEach(function (el) { if (el) el.addEventListener('input', paivitaNetto); }); paivitaNetto(); }
      document.addEventListener('keydown', onKey);
      document.body.appendChild(ov);
      if (inp) { inp.focus(); inp.select(); } else if (raakaEl) { raakaEl.focus(); raakaEl.select(); }
    });
  }

  /* Jaettu rebuild + kirjoitus (Poista, Palauta, Korjaa). Kirjoittaa pelaajadokin pikakentät + poistot; päivittää in-memory p.
     env: { db, seuraId, firebase, rakenna (tmRakennaPikakentatArkistosta), K (TM_TESTIKATALOGI) }. docs = pelaajan testitulokset [{__id, data}]. */
  async function rebuildKirjoita(env, p, docs) {
    var rakenna = env.rakenna;
    if (typeof rakenna !== 'function') { console.warn('[mittaus] rebuild-primitiivi puuttuu'); return null; }
    var cu = env.firebase.auth().currentUser; if (cu) { try { await cu.getIdToken(true); } catch (e) {} }   // §2 sessio tuore
    var pelRef = env.db.collection('seurat').doc(env.seuraId).collection('pelaajat').doc(p.id);
    var merk = rebuildMerkinnat(docs, env.K);
    var res = rakenna(p, merk) || { upd: {}, poistetut: [] };
    res.poistetut = suodataPoistetut(res.poistetut, docs, env.K);   // E2.2.1 — älä poista rakentumattomia (muualta tulleita) pikakenttiä
    if (res.upd && Object.keys(res.upd).length) await pelRef.set(res.upd, { merge: true });             // pikakentät korvaten (hh_viimeisin = map)
    if (res.poistetut && res.poistetut.length) {
      var del = {}; res.poistetut.forEach(function (f) { del[f] = env.firebase.firestore.FieldValue.delete(); });
      await pelRef.update(del);                                                                          // merge ei poista → FieldValue.delete
    }
    if (res.upd) Object.assign(p, res.upd);                                                              // in-memory p → UI regressoi ilman uutta hakua
    if (res.poistetut) res.poistetut.forEach(function (f) { try { delete p[f]; } catch (e) {} });
    return res;
  }

  /* Korjaa: LÄHDEdokki paikallaan (INV1) → recompute vain jaetun (E2.2.1-suojatun) rebuildKirjoita:n kautta (INV2).
     Paluu: 'ei' (ei pelaajaa / oikeutta / dokkia) · 'peruttu' · 'korjattu' · 'virhe' (toast kerrottu). */
  async function korjaa(env, p, docs, dokkiId, avain) {
    var t = env.t || function (s) { return s; };
    if (!p || !dokkiId || !avain) return 'ei';
    if (!env.voiMuokata(p)) return 'ei';   // A4: pelaajakohtainen oikeus
    var w = (docs || []).find(function (x) { return x.__id === dokkiId; });
    if (!w) return 'ei';
    var vanha = (w.data.testit || {})[avain];
    var kat = katTesti(avain, env.K) || {};
    var onKomp = onkoKomposiitti(vanha);
    var uusi = await env.dialogi({ nimi: kat.nimi || avain, yksikko: kat.yksikko || '', arvo: arvo(vanha), pvm: w.data.testauspvm || '', komposiitti: onKomp ? vanha : null });
    if (uusi == null) return 'peruttu';
    var uusiArvo;
    if (onKomp) {
      // E2.3.1: dialogi palauttaa komposiittiobjektin — säilytä muut kentät, päivitä osat. Rebuild laskee netton (primitiivi).
      uusiArvo = Object.assign({}, vanha, { raaka: uusi.raaka, rangaistukset: uusi.rangaistukset, ennenaikaiset: uusi.ennenaikaiset });
    } else {
      uusiArvo = korjaaArvo(vanha, uusi);
      if (uusiArvo == null) return 'peruttu';                   // skalaari-suoja
    }
    try {
      var pelRef = env.db.collection('seurat').doc(env.seuraId).collection('pelaajat').doc(p.id);
      var cu = env.firebase.auth().currentUser; if (cu) { try { await cu.getIdToken(true); } catch (e) {} }
      var kentat = {};
      kentat['testit.' + avain] = uusiArvo;                     // INV1: ylikirjoita lähdedokki paikallaan (ei uutta dokkia)
      kentat['korjattu.' + avain] = { kuka: env.uid || null, milloin: new Date().toISOString() };   // audit (GDPR: vain uid+aikaleima)
      await pelRef.collection('testitulokset').doc(dokkiId).update(kentat);
      w.data.testit = w.data.testit || {}; w.data.testit[avain] = uusiArvo;                       // cache paikallisesti (ei toista hakua)
      w.data.korjattu = w.data.korjattu || {}; w.data.korjattu[avain] = kentat['korjattu.' + avain];
      await env.rebuildKirjoita(p);                             // INV2: recompute vain jaetun (E2.2.1-suojatun) kautta
      env.paivita(p);
      if (typeof env.toast === 'function') env.toast(t('Mittaus korjattu'), 'ok');
      return 'korjattu';
    } catch (e) { console.warn('[mittaus korjaa]', e && e.message); if (typeof env.toast === 'function') env.toast(t('Korjaus epäonnistui'), 'err'); return 'virhe'; }
  }

  var API = { KEYNORM: KEYNORM, HH_AVAIMET: HH_AVAIMET, TK_AVAIMET: TK_AVAIMET, katTesti: katTesti, arvo: arvo, onkoKomposiitti: onkoKomposiitti, korjaaArvo: korjaaArvo,
    kuljetusRangaistukset: kuljetusRangaistukset, kuljetusNetto: kuljetusNetto, komposiittiSyotteesta: komposiittiSyotteesta, protokollaId: protokollaId,
    rebuildMerkinnat: rebuildMerkinnat, kenttaDomain: kenttaDomain, suodataPoistetut: suodataPoistetut, merkinnat: merkinnat, rivinKohde: rivinKohde,
    dialogi: dialogi, rebuildKirjoita: rebuildKirjoita, korjaa: korjaa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_MITTAUS_KORJAA = API;
})(typeof window !== 'undefined' ? window : this);
