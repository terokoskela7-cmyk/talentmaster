// ─────────────────────────────────────────────────────────────────
// EXCEL-POHJAN GENEROINTI — SheetJS
//
// Tämä funktio rakentaa Excel-tiedoston suoraan selaimessa.
// Se ei tarvitse palvelinta — SheetJS (XLSX-kirjasto) hoitaa kaiken.
//
// Prosessi:
//   1. Haetaan seuran joukkueet Firestoresta (reaaliaikaiset tiedot)
//   2. Rakennetaan Excel-rakenne: otsikot, tyylit, dropdown-validointi
//   3. Tarjotaan tiedosto lataukseen käyttäjän selaimessa
//
// Miksi selaimessa eikä palvelimella?
//   → Ei tarvita Cloud Function -päätettä
//   → Toimii Spark-planin rajoissa
//   → Nopea: alle sekunti 100 rivin pohjalle
// ─────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// MASSAKUTSU — lähettää rekisteröintikutsun usealle huoltajalle kerralla
// Pelaajadata tuodaan Excel-tiedostosta (PalloID, etunimi, sukunimi, hEmail, joukkue)
// Super Admin ja VP voivat käyttää tätä.
// ─────────────────────────────────────────────────────────────────────────────
function avaaMassakutsuModal() {
  var modal = document.getElementById('massakutsuModal');
  if (!modal) {
    var div = document.createElement('div');
    div.className = 'modalTausta auki';
    div.id = 'massakutsuModal';
    div.innerHTML = '<div class="modalKortti" style="max-width:640px;">'
      + '<button class="modalSuljeNappi" onclick="document.getElementById(\'massakutsuModal\').classList.remove(\'auki\')">' + tmHT('✕ Sulje') + '</button>'
      + '<div class="modalOtsikko" style="clear:both;">' + tmHT('📨 Massakutsu huoltajille') + '</div>'
      + '<div class="modalKuvaus">'
      +   (tmHT('Valitse joukkue tai koko seura. Järjestelmä lähettää jokaiselle huoltajalle') + ' ')
      +   'henkilökohtaisen rekisteröintilinkin sähköpostilla.'
      + '</div>'
      // Joukkuevalinta
      + '<div style="margin-bottom:16px;">'
      +   '<label style="font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:var(--ink3);display:block;margin-bottom:6px;">' + tmHT('Valitse kohderyhmä') + '</label>'
      +   '<select id="massakutsuJoukkueValinta" onchange="suodataMassakutsuJoukkue()"'
      +     ' style="width:100%;padding:10px 13px;border-radius:8px;border:1px solid var(--border);'
      +     'background:var(--bg3);color:var(--ink1);font-size:14px;">'
      +     '<option value="">' + tmHT('Ladataan...') + '</option>'
      +   '</select>'
      +   '<div id="massakutsuSuodatettuLkm" style="margin-top:6px;font-size:12px;color:var(--ink3);"></div>'
      + '</div>'
      // Info: suodatettu
      + '<div id="massakutsuInfoBoksi" style="display:none;background:rgba(42,93,176,.08);border:1px solid rgba(42,93,176,.2);border-radius:8px;padding:12px;margin-bottom:14px;font-size:12px;color:var(--ink2);line-height:1.5;">'
      + '</div>'
      // Esikatselu
      + '<div id="massakutsuEsikatselu" style="display:none;margin-bottom:14px;">'
      +   '<div style="font-size:12px;font-weight:600;color:var(--ink3);margin-bottom:8px;" id="massakutsuLkm"></div>'
      +   '<div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">'
      +     '<table style="width:100%">'
      +       '<thead><tr style="background:var(--bg3);">'
      +         '<th style="padding:8px;font-size:11px;text-align:left;">' + tmHT('Nimi') + '</th>'
      +         '<th style="padding:8px;font-size:11px;text-align:left;">' + tmHT('Joukkue') + '</th>'
      +         '<th style="padding:8px;font-size:11px;text-align:left;">' + tmHT('HuoltajaEmail') + '</th>'
      +         '<th style="padding:8px;font-size:11px;text-align:left;">' + tmHT('Tila') + '</th>'
      +         '<th style="padding:8px;font-size:11px;text-align:left;">Status</th>'
      +       '</tr></thead>'
      +       '<tbody id="massakutsuTbody"></tbody>'
      +     '</table>'
      +   '</div>'
      + '</div>'
      // Progress
      + '<div id="massakutsuProgress" style="display:none;margin-bottom:12px;">'
      +   '<div style="background:var(--bg3);border-radius:6px;height:6px;overflow:hidden;">'
      +     '<div id="massakutsuBar" style="height:100%;background:var(--teal);width:0%;transition:width .3s;"></div>'
      +   '</div>'
      +   '<div id="massakutsuStatus" style="font-size:12px;color:var(--ink3);margin-top:6px;text-align:center;"></div>'
      + '</div>'
      // Nappi
      + '<button id="massakutsuLahetaNappi" onclick="lahetaMassakutsu()"'
      +   ' style="width:100%;padding:13px;background:var(--teal);border:none;border-radius:10px;'
      +   'color:#000;font-size:15px;font-weight:700;cursor:pointer;" disabled>'
      +   tmHT('📨 Lähetä kutsut sähköpostilla')
      + '</button>'
      + '<div id="massakutsuVirhe" style="color:var(--red);font-size:13px;margin-top:8px;text-align:center;"></div>'
      + '</div>';
    document.body.appendChild(div);
    div.addEventListener('click', function(e) { if (e.target === div) div.classList.remove('auki'); });
  } else {
    modal.classList.add('auki');
  }
  // Hae pelaajat Firestoresta aina kun modaali avataan
  _lataaMassakutsuPelaajat();
}

let _massakutsuData = [];
let _massakutsuDataKaikki = [];

async function _lataaMassakutsuPelaajat() {
  var jkSelect = document.getElementById('massakutsuJoukkueValinta');
  var infoBoksi = document.getElementById('massakutsuInfoBoksi');
  var esiEl = document.getElementById('massakutsuEsikatselu');
  var lkmEl = document.getElementById('massakutsuSuodatettuLkm');
  if (jkSelect) jkSelect.innerHTML = '<option value="">' + tmHT('Ladataan...') + '</option>';
  if (esiEl) esiEl.style.display = 'none';
  if (lkmEl) lkmEl.textContent = '';

  if (!tila.seuraId) {
    if (jkSelect) jkSelect.innerHTML = '<option value="">' + tmHT('Ei seuraa valittuna') + '</option>';
    return;
  }

  try {
    var snap = await db.collection('seurat').doc(tila.seuraId).collection('pelaajat').get();
    var pelaajat = [];
    snap.forEach(function(doc) {
      var d = doc.data();
      pelaajat.push({
        pelaajaId:     doc.id,
        palloId:       d.tunniste || d.palloID || d.palloId || '',
        etunimi:       d.etunimi || '',
        sukunimi:      d.sukunimi || '',
        huoltajaEmail: d.huoltajaEmail || '',
        joukkue:       d.joukkue || '',
        suostumusTila: d.suostumusTila || '',
      });
    });

    // Luokittelu: uudet (pilotti/tyhjä) vs jo kutsutut (odottaa) vs suostumus annettu
    var eiEmailia = pelaajat.filter(function(p) { return !p.huoltajaEmail; }).length;
    var joAnnettu = pelaajat.filter(_suostumusAnnettu).length;
    var joKutsutut = pelaajat.filter(function(p) {
      return p.huoltajaEmail && p.suostumusTila === 'odottaa';
    });
    var uudetPelaajat = pelaajat.filter(function(p) {
      return p.huoltajaEmail && !_suostumusAnnettu(p) && !_suostumusPeruttu(p) && p.suostumusTila !== 'odottaa';   // B9: peruttu → ei massakutsua
    });

    // Oletuksena vain uudet (ei vielä kutsutut). Tallennetaan myös kutsutut erikseen.
    window._massakutsuJoKutsutut = joKutsutut;
    _massakutsuDataKaikki = uudetPelaajat.sort(function(a,b) {
      return (a.sukunimi || '').localeCompare(b.sukunimi || '');
    });
    _massakutsuData = _massakutsuDataKaikki.slice();

    // Joukkueet dropdowniin (kaikista lähetettävistä)
    var joukkueetMap = {};
    _massakutsuDataKaikki.forEach(function(p) {
      var j = p.joukkue || tmHT('(ei joukkuetta)');
      if (!joukkueetMap[j]) joukkueetMap[j] = 0;
      joukkueetMap[j]++;
    });
    var joukkueet = Object.keys(joukkueetMap).sort();

    if (jkSelect) {
      jkSelect.innerHTML = '<option value="">Koko seura (' + _massakutsuDataKaikki.length + ' uutta)</option>';
      joukkueet.forEach(function(j) {
        var opt = document.createElement('option');
        opt.value = j;
        opt.textContent = j + ' (' + joukkueetMap[j] + ')';
        jkSelect.appendChild(opt);
      });
      // Lisää "uudelleenlähetys"-vaihtoehto jos on jo kutsuttuja
      if (joKutsutut.length > 0) {
        var sep = document.createElement('option');
        sep.disabled = true;
        sep.textContent = '── Uudelleenlähetys ──';
        jkSelect.appendChild(sep);
        var reOpt = document.createElement('option');
        reOpt.value = '__jo_kutsutut__';
        reOpt.textContent = '🔄 Jo kutsutut — odottaa (' + joKutsutut.length + ')';
        jkSelect.appendChild(reOpt);
      }
    }

    // Infolaatikko
    if (infoBoksi) {
      var osat = [];
      osat.push((tmHT('Yhteensä') + ' ') + pelaajat.length + ' pelaajaa seurassa.');
      if (joAnnettu > 0) osat.push('✅ ' + joAnnettu + ' suostumus jo annettu (ei lähetetä).');
      if (joKutsutut.length > 0) osat.push('📨 ' + joKutsutut.length + ' kutsu jo lähetetty (valitse "Jo kutsutut" lähettääksesi uudelleen).');
      if (eiEmailia > 0) osat.push('⚠️ ' + eiEmailia + ' ilman huoltajan sähköpostia.');
      osat.push('<strong>📋 ' + uudetPelaajat.length + ' uutta pelaajaa valmiina lähetettäväksi.</strong>');
      infoBoksi.innerHTML = osat.join('<br>');
      infoBoksi.style.display = '';
    }

    _renderMassakutsuEsikatselu();

  } catch(err) {
    console.error('[Massakutsu] Firestore-virhe:', err);
    if (jkSelect) jkSelect.innerHTML = '<option value="">' + tmHT('Virhe:') + ' ' + err.message + '</option>';
  }
}

function suodataMassakutsuJoukkue() {
  var valinta = document.getElementById('massakutsuJoukkueValinta');
  var joukkue = valinta ? valinta.value : '';
  if (joukkue === '__jo_kutsutut__') {
    // Uudelleenlähetys: näytä jo kutsutut pelaajat
    _massakutsuData = (window._massakutsuJoKutsutut || []).slice();
  } else if (joukkue) {
    _massakutsuData = _massakutsuDataKaikki.filter(function(r) { return r.joukkue === joukkue; });
  } else {
    _massakutsuData = _massakutsuDataKaikki.slice();
  }
  _renderMassakutsuEsikatselu();
  var lkmEl = document.getElementById('massakutsuSuodatettuLkm');
  if (lkmEl) {
    if (joukkue === '__jo_kutsutut__') {
      lkmEl.innerHTML = '<span style="color:var(--amber);">' + tmHT('⚠️ Uudelleenlähetys — nämä pelaajat ovat jo saaneet kutsun') + '</span>';
    } else if (joukkue) {
      lkmEl.textContent = _massakutsuData.length + '/' + _massakutsuDataKaikki.length + ' valittu';
    } else {
      lkmEl.textContent = '';
    }
  }
}

function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _renderMassakutsuEsikatselu() {
  var tbody = document.getElementById('massakutsuTbody');
  var lkm   = document.getElementById('massakutsuLkm');
  var esi   = document.getElementById('massakutsuEsikatselu');
  if (tbody) tbody.innerHTML = _massakutsuData.map(function(r) {
    var tilaVari = r.suostumusTila === 'odottaa' ? 'var(--amber)' : 'var(--ink3)';
    var tilaTeksti = r.suostumusTila || 'pilotti';
    return '<tr>'
      + '<td style="padding:7px 8px;font-size:12px;">' + _escHtml(r.etunimi) + ' ' + _escHtml(r.sukunimi) + '</td>'
      + '<td style="padding:7px 8px;font-size:12px;color:var(--ink3);">' + _escHtml(r.joukkue || '—') + '</td>'
      + '<td style="padding:7px 8px;font-size:12px;color:var(--teal);">' + _escHtml(r.huoltajaEmail) + '</td>'
      + '<td style="padding:7px 8px;font-size:11px;color:' + tilaVari + ';">' + _escHtml(tilaTeksti) + '</td>'
      + '<td style="padding:7px 8px;font-size:11px;color:var(--ink3);">' + tmHT('⏳ Odottaa') + '</td>'
      + '</tr>';
  }).join('');
  if (lkm) lkm.textContent = _massakutsuData.length + ' pelaajaa lähetysjonossa';
  if (esi) esi.style.display = _massakutsuData.length > 0 ? '' : 'none';
  var nappi = document.getElementById('massakutsuLahetaNappi');
  if (nappi) nappi.disabled = _massakutsuData.length === 0;
}

async function lahetaMassakutsu() {
  if (!_massakutsuData.length) return;
  if (!tila.seuraId) {
    document.getElementById('massakutsuVirhe').textContent = tmHT('Seura ei ole valittuna.');
    return;
  }

  // #1 Vahvistus ennen lähetystä — estää vahinkoklikkauksella massalähetyksen
  var uudet = _massakutsuData.filter(function(p) { return p.suostumusTila !== 'odottaa'; }).length;
  var uudelleen = _massakutsuData.length - uudet;
  var vahvistusViesti = (tmHT('Lähetetään') + ' ') + _massakutsuData.length + ' kutsua sähköpostilla.';
  if (uudelleen > 0) {
    vahvistusViesti += '\n\n⚠️ ' + uudelleen + ' pelaajalle on jo lähetetty kutsu aiemmin (tila: odottaa). '
      + tmHT('He saavat kutsun UUDELLEEN.');
  }
  // Onboarding-integriteetti (warn-not-block, §A): sama huoltajaEmail usealla valitulla? (sisarukset vai ristiin?)
  var _emRyhmat = {};
  _massakutsuData.forEach(function(p) {
    var e = String(p.huoltajaEmail || '').toLowerCase().trim();
    if (e) { (_emRyhmat[e] = _emRyhmat[e] || []).push(((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim()); }
  });
  var _jaetut = Object.keys(_emRyhmat).filter(function(e) { return _emRyhmat[e].length > 1; });
  if (_jaetut.length) {
    vahvistusViesti += '\n\n🟡 Sama huoltajaEmail usealla pelaajalla (sisarukset vai ristiin? Tarkista):\n'
      + _jaetut.map(function(e) { return '• ' + e + ': ' + _emRyhmat[e].join(', '); }).join('\n');
  }
  vahvistusViesti += '\n\nJatketaanko?';
  if (!confirm(vahvistusViesti)) return;

  const nappi    = document.getElementById('massakutsuLahetaNappi');
  const progress = document.getElementById('massakutsuProgress');
  const bar      = document.getElementById('massakutsuBar');
  const status   = document.getElementById('massakutsuStatus');
  const tbody    = document.getElementById('massakutsuTbody');

  if (nappi)    { nappi.disabled = true; nappi.textContent = tmHT('Lähetetään...'); }
  if (progress) progress.style.display = '';

  const baseUrl = _rekBaseUrl();
  const seuraNimi = tila.seuraNimi || tila.seuraId;
  const lahetaFn = firebase.app().functions('europe-west1').httpsCallable('lahetaRekisteriKutsu');
  let onnistui = 0;
  let epaonnistui = 0;
  let sahkopostiOk = 0;
  let sahkopostiVirhe = 0;
  let ohitettuSuostumus = 0;   // §33 onboarding-integriteetti: jo 'annettu' → status säilytetään (ei nollata)

  for (let i = 0; i < _massakutsuData.length; i++) {
    const p = _massakutsuData[i];
    if (bar)    bar.style.width = Math.round((i + 1) / _massakutsuData.length * 100) + '%';
    if (status) status.textContent = (i + 1) + '/' + _massakutsuData.length + ' — ' + p.etunimi + ' ' + p.sukunimi;

    if (!p.huoltajaEmail) { epaonnistui++; continue; }

    try {
      // Rakennetaan henkilökohtainen rekisteröintilinkki
      const params = new URLSearchParams({
        seuraId:  tila.seuraId,
        seura:    seuraNimi,
      });
      if (p.pelaajaId)     params.set('pelaajaId', p.pelaajaId);
      if (p.palloId)       params.set('palloid',  p.palloId);
      if (p.etunimi)       params.set('etunimi',  p.etunimi);
      if (p.sukunimi)      params.set('sukunimi', p.sukunimi);
      if (p.joukkue)       params.set('joukkue',  p.joukkue);
      const linkki = baseUrl + '?' + params.toString();

      // Tallennetaan kutsu Firestoreen — luodaan ID etukäteen (kutsuId linkkiin)
      const kutsuRef = db.collection('seurat').doc(tila.seuraId)
        .collection('kutsut').doc();
      const kutsuId = kutsuRef.id;
      const linkkiKutsuId = linkki + '&kutsuId=' + kutsuId;

      await kutsuRef.set({
        tyyppi:        'massakutsu',
        hEmail:        p.huoltajaEmail,
        pelaajaNimi:   (p.etunimi + ' ' + p.sukunimi).trim(),
        pelaajaId:     p.pelaajaId || null,
        palloId:       p.palloId || null,
        joukkue:       p.joukkue || null,
        linkki:        linkkiKutsuId,
        tila:          'odottaa',
        luotu:         firebase.firestore.FieldValue.serverTimestamp(),
        lahettaja:     tila.kayttaja?.uid || 'tuntematon',
      });

      // Lähetetään sähköposti Cloud Functionin kautta
      var mailOk = false, estoRivi = '';
      try {
        await lahetaFn({
          hEmail:   p.huoltajaEmail,
          linkki:   linkkiKutsuId,
          seura:    seuraNimi,
          seuraId:  tila.seuraId,
          pelaajaId: p.pelaajaId || null,   // palvelin asettaa suostumusTila 'odottaa' tälle pelaajalle
          etunimi:  p.etunimi,
          sukunimi: p.sukunimi,
          joukkue:  p.joukkue,
        });
        mailOk = true;
        sahkopostiOk++;
        await kutsuRef.update({ tila: 'lahetetty', lahetetty: firebase.firestore.FieldValue.serverTimestamp() });
        // §33 onboarding-integriteetti — ÄLÄ alenna jo annettua suostumusta (todettu tuotannossa:
        // kutsu nollasi annetun). Warn-not-block: status säilytetään, operaattori näkee ohitetun yhteenvedosta.
        const _joAnnettu = _suostumusAnnettu(p);
        // Tila 'odottaa' asettuu palvelimella (lahetaRekisteriKutsu, Rules v3.33); jo annettua ei alenneta.
        if (_joAnnettu) ohitettuSuostumus++;
      } catch(mailErr) {
        console.warn('[Massakutsu] Sähköposti epäonnistui rivillä', i + 1, ':', mailErr.message);
        sahkopostiVirhe++; estoRivi = _laskutusEsto(mailErr);
      }

      // Päivitetään taulukon rivi (Status = 5. sarake, indeksi 4)
      if (tbody && tbody.rows[i]) {
        tbody.rows[i].cells[4].innerHTML = mailOk
          ? '<span style="color:var(--teal);">' + tmHT('✅ Lähetetty') + '</span>'
          : '<span style="color:#E0A040;">' + (estoRivi || tmHT('⚠️ Linkki luotu, sähköposti ei lähtenyt')) + '</span>';
      }
      onnistui++;

    } catch(err) {
      if (tbody && tbody.rows[i]) {
        tbody.rows[i].cells[4].innerHTML =
          '<span style="color:var(--red);">❌ ' + err.message + '</span>';
      }
      epaonnistui++;
    }

    // Viive: 200 ms per rivi (SendGrid + Firestore)
    await new Promise(function(r) { setTimeout(r, 200); });
  }

  var viestiOsat = [];
  if (sahkopostiOk > 0)    viestiOsat.push(sahkopostiOk + ' sähköpostia lähetetty');
  if (sahkopostiVirhe > 0) viestiOsat.push(sahkopostiVirhe + ' sähköpostia epäonnistui');
  if (epaonnistui > 0)     viestiOsat.push(epaonnistui + ' epäonnistui');
  if (ohitettuSuostumus > 0) viestiOsat.push(ohitettuSuostumus + ' oli jo antanut suostumuksen — status säilytetty');
  var yhteenveto = viestiOsat.join(' · ') || 'Valmis';

  if (status) status.textContent = (tmHT('Valmis!') + ' ') + yhteenveto;
  if (nappi)  { nappi.textContent = tmHT('✅ Valmis'); }

  naytaToast(
    'Massakutsu: ' + sahkopostiOk + '/' + _massakutsuData.length + ' lähetetty',
    epaonnistui === 0 && sahkopostiVirhe === 0 ? 'ok' : 'varoitus'
  );

  // Päivitetään KPI-luvut
  await lataaYhteenvetoKPIt();
}

/* i18n (1.10.2026): Seura-sivun tekstit tm_langista (seura.*), suomi varana jos avain/kirjasto puuttuu.
   (Vanha lataaExcelMalli poistettu: latasi staattisen pohjan GitHubista ilman Syntymävuosi-saraketta, ei kutsujia.) */
/* Teksti ANNETULLA kielellä vaihtamatta sivun kieltä (1.10.2026). Haku TM_LANG[kieli] → en → fi-varateksti;
   muuttujat {nimi} korvataan. Käyttö: perheille menevä sisältö seuran kielellä (tila.seuraKieli). */
function _tkKieli(avain, kieli, fi, muuttujat) {
  const L = (typeof window !== 'undefined' && window.TM_LANG) || null;
  const hae = (k) => avain.split('.').reduce((o, x) => (o && o[x] != null ? o[x] : undefined), L && L[k]);
  let v = L ? (hae(kieli || 'fi') ?? hae('en')) : undefined;
  if (typeof v !== 'string' || !v) v = fi;
  Object.keys(muuttujat || {}).forEach((k) => { v = v.replace(new RegExp('\\{' + k + '\\}', 'g'), muuttujat[k]); });
  return v;
}
/* Seurahallinnan käyttöliittymä on AINA suomeksi (päätös 1.10.2026) — myös ruotsinkielisillä seuroilla. */
function _tk(avain, fi, muuttujat) { return _tkKieli(avain, 'fi', fi, muuttujat); }
/* Syntymävuosi Excelistä: tasan 4 numeroa, 1990…kuluva vuosi → numero, muuten null (1.10.2026). */
function _tmSyntymaVuosi(v) {
  const s = String(v == null ? '' : v).trim();
  if (!/^\d{4}$/.test(s)) return null;
  const n = Number(s);
  return (n >= 1990 && n <= new Date().getFullYear()) ? n : null;
}
/* Ohjemodaalin tekstit: elementit, joilla data-tm-k="avain" → _tk(avain, nykyinen suomi). */
function _rekisteriOhjeKaanna() {
  document.querySelectorAll('#rekisteriOhjeModal [data-tm-k]').forEach((el) => {
    if (!el.dataset.tmFi) el.dataset.tmFi = el.textContent.trim();
    el.textContent = _tk(el.dataset.tmK, el.dataset.tmFi);
  });
}

function avaaRekisteriOhje() {
  // Avataan ohjemodal ennen latauksen käynnistymistä.
  // Tämä varmistaa että sihteeri tietää mitä tehdä ennen
  // kuin Excel-tiedosto on jo ladattu ja auki.
  _rekisteriOhjeKaanna();
  document.getElementById('rekisteriOhjeModal').classList.add('auki');
}


// Onboarding: lataa Excel-pohja JA avaa tuontimodaali suoraan sen jälkeen
async function lataaJaAvaaExcelTuonti() {
  // Ensin ladataan pohja
  await lataaRekisteriPohja();
  // Pieni viive jotta lataus ehtii käynnistyä
  await new Promise(r => setTimeout(r, 800));
  // Sitten avataan tuontimodaali suoraan ilman ohjemodaalia
  avaaExcelTuontiModal();
}

async function aloitaLataaminenOhjeesta() {
  // Suljetaan ohjemodal ja käynnistetään lataus
  suljeModal('rekisteriOhjeModal');
  await lataaRekisteriPohja();
}

async function lataaRekisteriPohja() {
  if (!tila.seuraId) { naytaToast(tmHT('Valitse ensin seura'), 'virhe'); return; }

  const nappi = document.querySelector('[onclick="lataaRekisteriPohja()"]');
  if (nappi) { nappi.disabled = true; nappi.textContent = tmHT('⏳ Haetaan joukkueet...'); }

  try {
    // Hae seuran joukkueet Firestoresta
    const joukkueetSnap = await db.collection('seurat').doc(tila.seuraId)
      .collection('joukkueet').orderBy('jarjestys').get()
      .catch(() => db.collection('seurat').doc(tila.seuraId).collection('joukkueet').get());

    // Kerää myös joukkueet pelaajadatasta (Excel-tuonnin kautta tulleet)
    const pelSnap = await db.collection('seurat').doc(tila.seuraId)
      .collection('pelaajat').get();
    const pelJoukkueet = new Set();
    pelSnap.docs.forEach(d => { if (d.data().joukkue) pelJoukkueet.add(d.data().joukkue); });

    // Yhdistä: kokoelman nimet + pelaajadatan nimet
    const joukkueetKokoelma = new Set(joukkueetSnap.docs.map(d => d.data().nimi || d.id));
    const kaikkiJoukkueet = [...new Set([...joukkueetKokoelma, ...pelJoukkueet])].sort();

    if (kaikkiJoukkueet.length === 0) {
      naytaToast(tmHT('Lisää joukkueet ensin Joukkueet-välilehdellä'), 'virhe');
      if (nappi) { nappi.disabled = false; nappi.textContent = '⬇ ' + _tk('seura.lataa_excel_pohja', 'Lataa Excel-pohja'); }
      return;
    }

    // Rakenna Excel SheetJS:llä
    if (typeof XLSX === 'undefined') {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const wb = XLSX.utils.book_new();

    // ── PELAAJAT-välilehti ──────────────────────────────────────
    // Syntymävuosi * pakollinen (1.10.2026): 4 numeroa; tuonti ei tuo riviä ilman sitä.
    const pelaajaOtsikot = ['Etunimi *', 'Sukunimi *', tmHT('Syntymävuosi *'), tmHT('Joukkue * (katso Asetukset-välilehti)'), tmHT('Huoltajan sähköposti *'), 'PalloID (vapaaehtoinen)', 'Talenttiohjelma', 'TalenttiTaso'];
    // Otsikko "OHJE SIHTEEREILLE" on otsikkorivillä (pelData[0]) → ei toistoa ohjeen ensimmäisenä rivinä.
    const ohje = [
      tmHT('1.  Täytä jokainen pelaaja omalle rivilleen.'),
      tmHT('2.  Joukkue: kopioi nimi Asetukset-välilehdeltä (seuran joukkueet valmiina).'),
      '3.  Syntymävuosi: neljä numeroa, esim. 2014. Pakollinen.',
      tmHT('4.  PalloID (vapaaehtoinen) — löytyy pelipassista tai Palloliiton rekisteristä.'),
      tmHT('5.  Talenttiohjelma: kirjoita "kyllä" jos pelaaja on talenttiryhmässä.'),
      tmHT('6.  TalenttiTaso: "perus" tai "laajennettu".'),
      tmHT('7.  Huoltajan s-posti: vanhempi saa tätä kautta suostumuspyynnön.'),
      tmHT('8.  Yksi sähköposti per solu. Toinen huoltaja lisätään myöhemmin sovelluksessa.'),
      tmHT('9.  Tallenna → lataa takaisin TalentMasteriin.'),
    ];

    // Rakenna data-array
    const pelData = [pelaajaOtsikot.concat(['', tmHT('📋  OHJE SIHTEEREILLE')])];
    for (let i = 0; i < 100; i++) {
      const rivi = new Array(pelaajaOtsikot.length).fill('');
      if (ohje[i]) rivi.push('', ohje[i]);
      pelData.push(rivi);
    }

    const wsPel = XLSX.utils.aoa_to_sheet(pelData);

    // Sarakeleveydet
    wsPel['!cols'] = [
      {wch: 16}, {wch: 18}, {wch: 14}, {wch: 22}, {wch: 32}, {wch: 14}, {wch: 18}, {wch: 16}, {wch: 4}, {wch: 50}
    ];

    // HUOMIO: SheetJS 0.18.5 (ilmainen) ei tue dataValidation-dropdowneja.
    // Toimiva ratkaisu: Asetukset-välilehdelle kirjoitetaan joukkueet selkeästi
    // ja sihteeri valitsee joukkueen sieltä copy-pastella.
    // DataValidation Pro-ominaisuus — lisätään Cloud Function -pohjaan Sprint 4-5.

    // Merkitään Joukkue-sarake keltaisella jotta sihteeri huomaa täyttää sen
    // (SheetJS tukee soluformaatteja)

    XLSX.utils.book_append_sheet(wb, wsPel, 'Pelaajat');

    // ── ASETUKSET-välilehti — joukkueet kirjoitettu valmiiksi ───
    const asData = [
      [tmHT('⚠ OHJE: Kopioi joukkuenimi alta Pelaajat-välilehden Joukkue-sarakkeeseen'), '', ''],
      [tmHT('Muokkaa joukkueita: Seurahallinta → Joukkueet-välilehti → lataa uusi pohja.')],
      [],
      [tmHT('✓ SEURAN JOUKKUEET (kopioi tarkasti):')],
      ...kaikkiJoukkueet.map((j, i) => [j, '', i === 0 ? tmHT('← kopioi tämä Joukkue-sarakkeeseen') : '']),
    ];
    const wsAs = XLSX.utils.aoa_to_sheet(asData);
    wsAs['!cols'] = [{wch: 35}, {wch: 4}, {wch: 40}];
    // Merkitään joukkuenimet lihavoituina SheetJS:n cell-muotoilulla
    kaikkiJoukkueet.forEach((_, i) => {
      const solunId = 'A' + (5 + i);
      if (wsAs[solunId]) wsAs[solunId].s = { font: { bold: true } };
    });
    XLSX.utils.book_append_sheet(wb, wsAs, 'Asetukset');

    // ── ESIMERKKI-välilehti ──────────────────────────────────────
    const esData = [
      pelaajaOtsikot,
      ['Matti', 'Meikäläinen', 2014, kaikkiJoukkueet[0] || '', 'huoltaja@example.com', '12345678', '', ''],
      ['Liisa', 'Liikuntanen', 2015, kaikkiJoukkueet[0] || '', 'liisa.h@example.com', '', 'kyllä', 'laajennettu'],
    ];
    const wsEs = XLSX.utils.aoa_to_sheet(esData);
    wsEs['!cols'] = [{wch: 16}, {wch: 18}, {wch: 14}, {wch: 22}, {wch: 32}, {wch: 14}, {wch: 18}, {wch: 16}];
    XLSX.utils.book_append_sheet(wb, wsEs, 'Esimerkki');

    // Lataa tiedosto
    const seuraNimi = (tila.seuraNimi || tila.seuraId).replace(/[^a-zA-Z0-9äöåÄÖÅ]/g, '_');
    const pvm = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `TalentMaster_${seuraNimi}_${pvm}.xlsx`);

    naytaToast('✅ ' + _tk('seura.excel_pohja_ladattu', 'Excel-pohja ladattu – {n} joukkuetta Asetukset-välilehdellä', { n: kaikkiJoukkueet.length }), 'ok');

  } catch(e) {
    naytaToast((tmHT('Lataus epäonnistui:') + ' ') + e.message, 'virhe');
    console.error('[lataaRekisteriPohja]', e);
  } finally {
    if (nappi) { nappi.disabled = false; nappi.textContent = '⬇ ' + _tk('seura.lataa_excel_pohja', 'Lataa Excel-pohja'); }
  }
}

// ─────────────────────────────────────────────────────────────────
// EXCEL-TUONTI (tm_import.js)
// Kutsutaan pelaajat-välilehden "Tuo Excel-rekisteri" -napista.
// ─────────────────────────────────────────────────────────────────
function avaaExcelTuonti() {
  if (typeof TMImport === 'undefined') {
    naytaToast('Excel-tuonti ei ole ladattu. Tarkista tm_import.js.', 'virhe');
    return;
  }
  const joukkueetMap = {};
  (tila.joukkueet || []).forEach(j => { joukkueetMap[j.id] = j.nimi; });
  TMImport.avaaValitsin(
    tila.seuraId,
    joukkueetMap,
    db,
    firebase.app().functions('europe-west1'),
    tila.kayttaja?.email || ''
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// YHDISTELMÄTOIMINTO: Tuo Excel + lähetä kutsut yhdellä toimenpiteellä
// Yhdistää TMImport-tuonnin ja massakutsu-lähetyksen yhdeksi poluksi
// ─────────────────────────────────────────────────────────────────────────────
function avaaTuoJaLahetaModal() {
  // Näytetään ensin ohjemodaali — siellä on ohjeet excelin täyttämiseen
  // Ohjemodaalista käyttäjä jatkaa lataamaan pohjan tai avaamaan tuontimodaalin
  const ohjeModal = document.getElementById('rekisteriOhjeModal');
  if (ohjeModal) {
    // Lisätään "Minulla on täytetty Excel" -nappi ohjemodaaliin jos ei vielä ole
    if (!document.getElementById('aloitaTuontiNappi')) {
      const btn = document.createElement('button');
      btn.id        = 'aloitaTuontiNappi';
      btn.className = 'nappi';
      btn.style.cssText = 'margin-top:10px;background:var(--teal);color:#000;';
      btn.textContent   = '📥 ' + _tk('seura.excel_tuo_nappi', 'Minulla on täytetty Excel → Tuo järjestelmään');
      btn.onclick = function() {
        suljeModal('rekisteriOhjeModal');
        avaaExcelTuontiModal();
      };
      const aloitaNappi = document.getElementById('aloitaLataaminenNappi');
      if (aloitaNappi?.parentNode) aloitaNappi.parentNode.appendChild(btn);
      else ohjeModal.querySelector('.modalKortti')?.appendChild(btn);
    }
    _rekisteriOhjeKaanna();
    ohjeModal.classList.add('auki');
  } else {
    // Ohjemodaalia ei löydy — avataan suoraan tuontimodaali
    avaaExcelTuontiModal();
  }
}

function _avaaTuoJaLahetaModal_vanha() {
  // Näytetään ENSIN ohjemodaali — sama kuin "Lataa rekisteripohja" -napissa.
  // Ohjemodaalissa on selitys mitä Excel sisältää ja miten se täytetään.
  // Sieltä käyttäjä jatkaa joko lataamaan pohjan tai tuomaan täytetyn Excelin.
  const ohjeModal = document.getElementById('rekisteriOhjeModal');
  if (ohjeModal) {
    // Muutetaan ohjemodaalin jatkonappi viemään tuontiin eikä pelkkään lataukseen
    const jatkoNappi = document.getElementById('aloitaLataaminenNappi');
    if (jatkoNappi) {
      jatkoNappi.textContent = tmHT('⬇ Lataa pohja ensin');
    }
    // Lisätään "Minulla on jo täytetty Excel" -nappi jos ei vielä ole
    let tuontiNappi = document.getElementById('aloitaTuontiNappi');
    if (!tuontiNappi) {
      tuontiNappi = document.createElement('button');
      tuontiNappi.id = 'aloitaTuontiNappi';
      tuontiNappi.className = 'nappi';
      tuontiNappi.style.cssText = 'margin-top:10px;background:var(--teal);';
      tuontiNappi.textContent = tmHT('📥 Minulla on täytetty Excel → Tuo ja lähetä kutsut');
      tuontiNappi.onclick = function() {
        suljeModal('rekisteriOhjeModal');
        // Avaa TMImport tai massakutsu-modal
        if (typeof TMImport !== 'undefined') {
          const joukkueetMap = {};
          (tila.joukkueet || []).forEach(j => { joukkueetMap[j.id] = j.nimi; });
          TMImport.avaaValitsin(
            tila.seuraId, joukkueetMap, db,
            firebase.app().functions('europe-west1'),
            tila.kayttaja?.email || ''
          );
        } else {
          avaaMassakutsuModal();
        }
      };
      // Lisätään nappi ohjemodaalin footer-alueelle
      const footer = ohjeModal.querySelector('.modalFooter') ||
                     ohjeModal.querySelector('[id="aloitaLataaminenNappi"]')?.parentNode;
      if (footer) footer.appendChild(tuontiNappi);
    }
    ohjeModal.classList.add('auki');
  } else {
    // Ohjemodaalia ei löydy — mennään suoraan tuontiin
    if (typeof TMImport !== 'undefined') {
      const joukkueetMap = {};
      (tila.joukkueet || []).forEach(j => { joukkueetMap[j.id] = j.nimi; });
      TMImport.avaaValitsin(
        tila.seuraId, joukkueetMap, db,
        firebase.app().functions('europe-west1'),
        tila.kayttaja?.email || ''
      );
    } else {
      avaaMassakutsuModal();
    }
  }
}



// ═══════════════════════════════════════════════════════════════════════════
// EXCEL-TUONTI — suora toteutus ilman TMImport-riippuvuutta
// Toimii sekä .xlsx että .csv tiedostoilla
// ═══════════════════════════════════════════════════════════════════════════

let _excelData = []; // Parsittu data muistissa

function avaaExcelTuontiModal() {
  // Nollataan tila
  _excelData = [];
  const esi   = document.getElementById('excelEsikatselu');
  const prog  = document.getElementById('excelProgress');
  const onni  = document.getElementById('excelOnnistui');
  const virhe = document.getElementById('excelVirhe');
  const tuoN  = document.getElementById('excelTuoNappi');
  const tuoLN = document.getElementById('excelTuoJaLahetaNappi');
  const fileI = document.getElementById('excelTuontiFile');

  if (esi)   esi.style.display   = 'none';
  if (prog)  prog.style.display  = 'none';
  if (onni)  onni.style.display  = 'none';
  if (virhe) virhe.textContent   = '';
  if (tuoN)  { tuoN.disabled = true;  tuoN.style.opacity  = '.5'; }
  if (tuoLN) { tuoLN.disabled = true; tuoLN.style.opacity = '.5'; }
  if (fileI) fileI.value = '';

  document.getElementById('excelTuontiModal').classList.add('auki');
}

/* Esikatselun rivin tila (21.10.2026): STATUS-sarakkeeseen vain lyhyt merkki (Uusi / Jo järjestelmässä / ⛔ Virhe / ⚠️ Huomio) + Päivitä-ruutu;
   selitykset (virhe, kutsun osoite, erot Excelistä) omalle täysleveälle alariville (_excelRiviSelitys). Palauttaa { status, vari, paivita, selitykset: [{ t, vari }] }. */
function _excelRiviStatus(p, i) {
  const T = TM_SEURA_TUONTI, fmt = (t, m) => tmHT(t).replace(/\{(\w+)\}/g, (_, k) => (m && m[k] != null ? m[k] : ''));
  const nimiOk = p.etunimi || p.sukunimi, emailOk = !!p.huoltajaEmail, sel = [];
  const NEUTR = 'var(--ink3)', PUN = 'var(--red)', OR = 'var(--amber)';
  let status, vari = 'var(--teal)';
  if (p._hylatty) { status = '⛔ ' + tmHT('Virhe'); vari = PUN; sel.push({ t: p._hylatty, vari: PUN }); }
  else if (!nimiOk) { status = tmHT('⚠️ Nimi puuttuu'); vari = OR; }
  else if (p._eiVuotta) { status = tmHT('⚠️ Huomio'); vari = OR; sel.push({ t: tmHT('⚠️ Syntymävuosi puuttuu – riviä ei tuoda'), vari: OR }); }
  else if (p._emailVirhe) { status = '⛔ ' + tmHT('Virhe'); vari = PUN; sel.push({ t: tmHT('Sähköposti virheellinen – kutsua ei lähetetä'), vari: PUN }); }
  else if (!p.joukkue) { status = tmHT('⚠️ Joukkue?'); vari = OR; }
  else if (p._joukkueOrpo) { status = tmHT('⚠️ Huomio'); vari = OR; sel.push({ t: tmHT('⚠️ Joukkue ei listassa'), vari: OR }); }   // #92 warn-not-block
  else if (!emailOk) { status = '⚠️ Email?'; vari = OR; }
  else if (p._olemassa) status = '↻ ' + tmHT('Jo järjestelmässä');
  else status = '✓ ' + tmHT('Uusi');
  if (p._emailUseita && !p._hylatty) {   // monen osoitteen solu: ensimmäinen käytössä → oranssi huomio (ei punainen virhe)
    sel.push({ t: tmHT('Yksi sähköposti per solu'), vari: OR });
    sel.push({ t: fmt('Kutsu lähtee: {osoite}. Muut huoltajat lisätään myöhemmin.', { osoite: p.huoltajaEmail || '—' }), vari: NEUTR });
  }
  let paivita = '';
  if (p._olemassa && p._ero && !p._hylatty && !p._eiVuotta) {
    const e = p._ero;
    if (e.joukkue.muuttuu) sel.push({ t: fmt('Joukkue: {vanha} → {uusi}', { vanha: e.joukkue.vanha || '—', uusi: e.joukkue.uusi }), vari: NEUTR });
    if (e.syntymavuosi.tila === 'puuttuu') sel.push({ t: fmt('Syntymävuosi puuttuu → {uusi}', { uusi: e.syntymavuosi.uusi }), vari: NEUTR });
    else if (e.syntymavuosi.tila === 'eri') sel.push({ t: fmt('Syntymävuosi: {vanha} (Excelissä {uusi})', { vanha: e.syntymavuosi.vanha, uusi: e.syntymavuosi.uusi }), vari: NEUTR });
    if (e.email.tila === 'puuttuu') sel.push({ t: tmHT('Sähköposti puuttuu → lisätään'), vari: NEUTR });
    else if (e.email.tila === 'eri') sel.push({ t: tmHT(e.suostumus === 'annettu' ? 'Sähköposti eri – ei vaihdeta (suostumus annettu)' : 'Sähköposti eri → päivitetään'), vari: NEUTR });
    sel.push({ t: tmHT({ annettu: 'Suostumus: annettu', odottaa: 'Suostumus: kutsu lähetetty', ei_kutsua: 'Suostumus: ei kutsua' }[e.suostumus]), vari: NEUTR });
    paivita = '<label style="display:flex;align-items:center;gap:6px;margin-top:4px;cursor:pointer;color:var(--ink2);white-space:nowrap;"><input type="checkbox" class="excelRivi" data-i="' + i + '" checked> ' + tmEsc(tmHT('Päivitä')) + '</label>';
  }
  return { status, vari, paivita, selitykset: sel };
}
/* Selitykset täysleveälle alariville: yksi asia per rivi, rivitys sallittu, ei leikkausta. Sticky-laatikon leveys = vierityskääreen näkyvä leveys (--excelKaare, asetetaan renderin jälkeen). */
function _excelRiviSelitys(st) {
  if (!st.selitykset.length) return '';
  return '<tr class="excelSelitys" style="border-bottom:1px solid var(--border);"><td colspan="6" style="padding:0 10px 8px;"><div style="position:sticky;left:0;box-sizing:border-box;width:var(--excelKaare,100%);max-width:100%;padding-right:20px;font-size:11px;line-height:1.45;white-space:normal;overflow-wrap:anywhere;">'
    + st.selitykset.map(x => '<div style="color:' + x.vari + ';margin-top:2px;">' + tmEsc(x.t) + '</div>').join('') + '</div></td></tr>';
}
function excelPaivitaKaikkiMuuta(v) { document.querySelectorAll('.excelRivi').forEach(c => { c.checked = !!v; }); }
function _excelPaivitaValittu(i) {   // rivikohtainen valinta; puuttuessa globaali
  const c = document.querySelector('.excelRivi[data-i="' + i + '"]'); if (c) return c.checked;
  const g = document.getElementById('excelPaivitaKaikki'); return g ? g.checked : true;
}
function kasitteleExcelTuonti(event) {
  const file = event.target.files[0];
  if (!file) return;

  const virheEl = document.getElementById('excelVirhe');
  if (virheEl) virheEl.textContent = '';

  const nappiTeksti = document.getElementById('valitseTiedostoNappi');
  if (nappiTeksti) nappiTeksti.textContent = '⏳ Luetaan tiedostoa...';

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      let rivit = [];
      const data = new Uint8Array(e.target.result);

      // Kaikki tuonti SheetJS:llä — tukee sekä .xlsx että .csv
      if (typeof XLSX === 'undefined') throw new Error(tmHT('Excel-lukija ei ole ladattu — päivitä sivu ja yritä uudelleen.'));
      const wb = XLSX.read(data, { type: 'array' });
      // Käytetään ensimmäistä välilehteä (Pelaajat)
      const ws = wb.Sheets[wb.SheetNames[0]];

      // Muutetaan sheet 2D-taulukoksi jotta voimme etsiä otsikkorivin
      const kaikki = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // Etsitään se rivi jossa on 'Etunimi' — pohja voi alkaa info-riveillä
      let otsikkoRiviIdx = -1;
      for (let i = 0; i < kaikki.length; i++) {
        const rivi = kaikki[i].map(v => String(v || '').toLowerCase());
        if (rivi.some(v => v.includes('etunimi'))) {
          otsikkoRiviIdx = i;
          break;
        }
      }
      if (otsikkoRiviIdx === -1) throw new Error(tmHT('Otsikkorivejä ei löydy. Varmista että tiedosto on TalentMaster-pohja ja Pelaajat-välilehti on auki.'));

      // Normalisoidaan otsikot: poistetaan *, välilyönnit, emojit
      const normOtsikot = kaikki[otsikkoRiviIdx].map(v =>
        String(v || '').toLowerCase()
          .replace(/\*/g, '')        // poistetaan tähdet
          .replace(/[^a-zäöå0-9]/g, '') // vain kirjaimet ja numerot
          .trim()
      );

      // Kenttähaku normalisoiduilla otsikoilla — käyttää startsWith jotta
      // "PalloID (vapaaehtoinen)" → "palloidvapaaehtoinen" löytyy haulla "palloid"
      const etsiSarake = (...hakusanat) => {
        for (const haku of hakusanat) {
          const norm = haku.toLowerCase().replace(/[^a-zäöå0-9]/g, '');
          // 1. Täsmäysosuma
          let idx = normOtsikot.indexOf(norm);
          if (idx !== -1) return idx;
          // 2. Alkuosuma — "palloidvapaaehtoinen" löytyy haulla "palloid"
          idx = normOtsikot.findIndex(o => o.startsWith(norm));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const iEtu    = etsiSarake('Etunimi', 'etunimi');
      const iSuku   = etsiSarake('Sukunimi', 'sukunimi');
      const iJouk   = etsiSarake('Joukkue', 'joukkue');
      const iEmail  = etsiSarake('Huoltajansähköposti', 'HuoltajaEmail', 'email', 'sähköposti');
      const iPalloId = etsiSarake('PalloID', 'palloid', 'palloID', 'palloId');
      const iTalentti = etsiSarake('Talenttiohjelma', 'talenttiohjelma', 'talentti');
      const iTaso     = etsiSarake('TalenttiTaso', 'talentitaso', 'taso');
      const iVuosi    = etsiSarake('Syntymävuosi', 'syntymavuosi');   // pakollinen (1.10.2026)
      const iSukup    = etsiSarake('Sukupuoli', 'sukupuoli');   // valinnainen: P/T tai M/N → "M"/"N" (§7.12); puuttuva/tunnistamaton → ei kenttää (ei oletusta)

      // Muutetaan datarivit objekteiksi
      rivit = kaikki.slice(otsikkoRiviIdx + 1)
        .filter(r => r.some(v => v !== '' && v !== null && v !== undefined))
        .map((r, idx) => {
          // #92 TUONTI-VARTIJA: kanonisoi joukkue-string seuran joukkuet-doceihin (estää pirstoutumisen
          // case/whitespace/NBSP-varianteista). Osuma → kanoninen nimi + id; ei osumaa → raw + orpolippu (warn).
          const _rawJ = iJouk >= 0 ? String(r[iJouk] || '').trim() : '';
          const _kanonJ = (_rawJ && typeof tmKanonisoiJoukkue === 'function') ? tmKanonisoiJoukkue(_rawJ, tila.joukkueet) : null;
          /* Sähköposti: yksi osoite per solu (21.10.2026). Useita ("a; b", "a, b", rivinvaihto) → ensimmäinen, esikatselu varoittaa; virheellinen → ei kutsua. */
          const _emRaaka = iEmail >= 0 ? String(r[iEmail] == null ? '' : r[iEmail]) : '';
          const _em = TM_SEURA_TUONTI.tmSeuraEmail(_emRaaka);
          return {
            etunimi:       TM_SEURA_TUONTI.tmSeuraNimi(iEtu  >= 0 ? r[iEtu]  : ''),   // trimmattu ("Pekko " → "Pekko")
            sukunimi:      TM_SEURA_TUONTI.tmSeuraNimi(iSuku >= 0 ? r[iSuku] : ''),
            joukkue:       _kanonJ ? _kanonJ.nimi : _rawJ,   // kanoninen nimi jos osuma (säilyvä muoto)
            _joukkueId:    _kanonJ ? _kanonJ.id : null,       // kanoninen id → joukkueet[] (§18)
            _joukkueOrpo:  !!(_rawJ && !_kanonJ),             // ei osumaa joukkuet-listaan → esikatselu varoittaa
            huoltajaEmail: _em.kelpaa ? _em.ensimmainen : '',
            _emailUseita:  _em.useita,
            _emailVirhe:   !!_emRaaka.trim() && !_em.kelpaa,
            _emailRaaka:   _emRaaka.trim(),
            palloId:       TM_SEURA_TUONTI.tmSeuraPalloId(iPalloId >= 0 ? r[iPalloId] : ''),   // aina merkkijono (Excel-solu voi olla numero)
            talentti:      iTalentti >= 0 ? String(r[iTalentti] || '').trim().toLowerCase() : '',
            talenttiTaso:  iTaso     >= 0 ? String(r[iTaso]    || '').trim().toLowerCase() : '',
            syntymaVuosi:  _tmSyntymaVuosi(iVuosi >= 0 ? r[iVuosi] : ''),
            sukupuoli:     iSukup >= 0 ? TM_SUKUPUOLI.tmSukupuoliMN(r[iSukup]) : null,
            _rivi: otsikkoRiviIdx + idx + 2,
          };
        })
        // Syntymävuosi puuttuu / virheellinen → keltainen varoitus, riviä EI tuoda (1.10.2026).
        .map(r => Object.assign(r, { _eiVuotta: r.syntymaVuosi == null }))
        // Paikkamerkkiosoite (esim. pohjan esimerkkirivi huoltaja@example.com) → rivi hylätään tuonnissa.
        .map(r => Object.assign(r, { _hylatty: (r.huoltajaEmail && tmOnPaikkamerkkiOsoite(r.huoltajaEmail)) ? PAIKKAMERKKI_SYY : null }));

      // _excelData on jo oikeassa muodossa
      _excelData = rivit.filter(r => r.etunimi || r.sukunimi);

      if (_excelData.length === 0) {
        throw new Error(tmHT('Tiedostosta ei löytynyt pelaajia. Tarkista että sarakeotsikoiden nimet täsmäävät pohjaan.'));
      }

      // Olemassa olevat pelaajat jo esikatselussa (PalloID → nimi + joukkue); lukuvirhe → välimuistissa oleva lista
      let _olemassaLista = [];
      try { const _os = await db.collection('seurat').doc(tila.seuraId).collection('pelaajat').get(); _olemassaLista = _os.docs.map(d => Object.assign({ id: d.id }, d.data())); }
      catch (_e) { _olemassaLista = window._pelaajatKaikki || []; }
      _excelData.forEach(p => {
        const ex = TM_SEURA_TUONTI.tmSeuraEtsiOlemassa(p, _olemassaLista);
        p._olemassa = ex ? ex.id : null; p._ero = ex ? TM_SEURA_TUONTI.tmSeuraErot(p, ex) : null;
      });

      // Näytetään esikatselu
      const tbody = document.getElementById('excelEsikatseluTbody');
      const lkm   = document.getElementById('excelLkm');
      const esi   = document.getElementById('excelEsikatselu');
      const tuoN  = document.getElementById('excelTuoNappi');
      const tuoLN = document.getElementById('excelTuoJaLahetaNappi');

      if (tbody) tbody.innerHTML = _excelData.map((p, i) => {
        const onTalentti = p.talentti === 'kyllä' || p.talentti === 'kylla' || p.talentti === 'yes' || p.talentti === 'k';
        const st = _excelRiviStatus(p, i);
        const emailPun = p._hylatty || p._emailVirhe;   // punainen vain virheellisestä osoitteesta
        return `<tr class="excelPelRivi" style="${st.selitykset.length ? '' : 'border-bottom:1px solid var(--border);'}">
          <td class="excT-nimi" style="padding:7px 10px;font-size:12px;font-weight:600;">${tmEsc(p.etunimi)} ${tmEsc(p.sukunimi)}</td>
          <td class="excT-joukkue" style="padding:7px 10px;font-size:12px;color:var(--ink3);">${tmEsc(p.joukkue || '—')}</td>
          <td class="excT-pallo" style="padding:7px 10px;font-size:11px;font-family:monospace;color:${p.palloId ? 'var(--ink2)' : 'var(--ink3)'};">${tmEsc(p.palloId || '—')}</td>
          <td class="excT-tal" style="padding:7px 10px;font-size:12px;">${onTalentti ? '<span style="color:var(--teal);font-weight:700;">⭐ ' + (p.talenttiTaso||'perus') + '</span>' : '<span style="color:var(--ink3);">—</span>'}</td>
          <td class="excT-email" style="padding:7px 10px;font-size:12px;color:${emailPun ? 'var(--red)' : 'var(--teal)'};">${tmEsc(p.huoltajaEmail || p._emailRaaka || '—')}</td>
          <td class="excT-status" style="padding:7px 10px;font-size:11px;color:${st.vari};white-space:nowrap;">${st.status}${st.paivita}</td>
        </tr>${_excelRiviSelitys(st)}`;
      }).join('');
      { const _k = document.getElementById('excelEsikatseluKaare'); if (_k && _k.style && _k.style.setProperty) _k.style.setProperty('--excelKaare', _k.clientWidth + 'px'); }
      { const _vr = document.getElementById('excelPaivitaRivi'), _on = _excelData.some(p => p._olemassa && !p._hylatty && !p._eiVuotta);
        if (_vr) { _vr.style.display = _on ? 'flex' : 'none'; const _sp = document.getElementById('excelPaivitaTeksti'); if (_sp) _sp.textContent = tmHT('Päivitä olemassa olevat pelaajat Excelin mukaan'); } const _g = document.getElementById('excelPaivitaKaikki'); if (_g) _g.checked = true; }

      const _hylLkm = _excelData.filter(p => p._hylatty).length;
      const _vuosiLkm = _excelData.filter(p => !p._hylatty && p._eiVuotta).length;
      const _olLkm = _excelData.filter(p => p._olemassa).length;
      if (lkm) lkm.textContent = _excelData.length + ' pelaajaa tunnistettu' + (_olLkm ? ' · ' + _olLkm + ' ' + tmHT('jo järjestelmässä') : '') + (_hylLkm ? ' · ' + _hylLkm + ' hylätään (esimerkkiosoite)' : '')
        + (_vuosiLkm ? ' · ' + _vuosiLkm + ' ilman syntymävuotta (ei tuoda)' : '');
      if (esi) esi.style.display = '';

      // Tarkista PalloID-duplikaatit Excel-tiedoston sisällä
      const palloIdLaskuri = {};
      _excelData.forEach(p => { if (p.palloId) palloIdLaskuri[p.palloId] = (palloIdLaskuri[p.palloId]||0) + 1; });
      const duplikaatit = Object.entries(palloIdLaskuri).filter(([id, lkm]) => lkm > 1);

      // Tarkista joukkuenimet — täsmäävätkö seuran joukkueisiin
      const tunnetutJoukkueet = new Set((tila.joukkueet||[]).map(j => j.nimi).filter(Boolean));
      const tuntemattomat = [...new Set(_excelData.map(p => p.joukkue).filter(j => j && !tunnetutJoukkueet.has(j)))];

      const virheEl = document.getElementById('excelVirhe');
      if (virheEl) virheEl.style.color = 'var(--amber)';

      if (duplikaatit.length > 0) {
        if (virheEl) virheEl.textContent = (tmHT('⚠️ Sama PalloID usealla pelaajalla:') + ' ') +
          duplikaatit.map(([id]) => id).join(', ') + ' — tarkista Excel ennen tuontia.';
        if (tuoN)  tuoN.disabled  = true;
        if (tuoLN) tuoLN.disabled = true;
      } else if (tuntemattomat.length > 0) {
        if (virheEl) virheEl.textContent = tmHT('⚠️ Tuntemattomia joukkueita: "{nimet}" — näitä ei ole järjestelmässä. Lataa uusi Excel-pohja tai tarkista nimet.').replace('{nimet}', tuntemattomat.join('", "'));
        if (tuoN)  { tuoN.disabled = false; tuoN.style.opacity = '1'; }
        if (tuoLN) { tuoLN.disabled = false; tuoLN.style.opacity = '1'; }
        // Varoitetaan mutta ei estetä — voi olla tarkoituksellista
      } else {
        if (virheEl) virheEl.textContent = '';
        if (tuoN)  { tuoN.disabled  = false; tuoN.style.opacity  = '1'; }
        if (tuoLN) { tuoLN.disabled = false; tuoLN.style.opacity = '1'; }
      }
      // Vanha pohja ilman Syntymävuosi-saraketta → kaikki rivit jäisivät tuomatta: kerro syy suoraan.
      if (iVuosi < 0 && virheEl) virheEl.textContent = tmHT('⚠️ Pohjasta puuttuu Syntymävuosi-sarake – lataa uusi Excel-pohja.');

      if (nappiTeksti) nappiTeksti.textContent = '📁 ' + file.name + ' (' + _excelData.length + ' pelaajaa)';

    } catch(err) {
      if (nappiTeksti) nappiTeksti.textContent = tmHT('📁 Valitse Excel- tai CSV-tiedosto');
      const virheEl = document.getElementById('excelVirhe');
      if (virheEl) virheEl.textContent = 'Virhe: ' + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
}

async function ajaExcelTuonti(lahetaKutsut = false) {
  if (!_excelData.length) { return; }
  if (!tila.seuraId) {
    document.getElementById('excelVirhe').textContent = tmHT('Seura ei ole valittuna.');
    return;
  }
  /* ISTUNTOTURVA: ei tuontia ilman kirjautunutta käyttäjää ja hyväksyttyä roolia (väärän roolin tila → jatkotoiminnot estetty). */
  { const _s0 = !tila.rooli ? { syy: 'ei_kirjautunut' } : TM_ISTUNTO.tmTuontiSeis(auth, null);
    if (_s0) { document.getElementById('excelVirhe').textContent = TM_ISTUNTO.tmTuontiYhteenveto(0, _excelData.length, _s0); return; } }

  const tuoN   = document.getElementById('excelTuoNappi');
  const tuoLN  = document.getElementById('excelTuoJaLahetaNappi');
  const prog   = document.getElementById('excelProgress');
  const bar    = document.getElementById('excelProgressBar');
  const teksti = document.getElementById('excelProgressTeksti');
  const onni   = document.getElementById('excelOnnistui');
  const virhe  = document.getElementById('excelVirhe');

  if (tuoN)  { tuoN.disabled  = true; tuoN.style.opacity  = '.5'; }
  if (tuoLN) { tuoLN.disabled = true; tuoLN.style.opacity = '.5'; }
  if (prog)  prog.style.display = '';
  if (virhe) virhe.textContent = '';

  const baseUrl = _rekBaseUrl();
  const seuraNimi = tila.seuraNimi || tila.seuraId;
  const nyt = firebase.firestore.FieldValue.serverTimestamp();

  let tuotu = 0, virheet = 0, paivitetty = 0, joukkueVaihtui = 0, ennallaan = 0, kutsut = 0, hylatty = 0, eiVuotta = 0;
  let seis = null;   // istuntovirhe → tuonti pysähtyy (ei satoja permission-denied-rivejä)
  const pelCol = db.collection('seurat').doc(tila.seuraId).collection('pelaajat');

  /* Kutsu yhdelle pelaajalle (uusi TAI olemassa oleva, jolta suostumus puuttuu): kutsudokumentti → lahetaRekisteriKutsu (pelaajaId mukana → palvelin merkitsee suostumusTilan 'odottaa', annettua ei alenneta)
     → kutsun tila 'lahetetty' / 'epaonnistui'. */
  async function lahetaKutsuRivi(pelaajaId, hEmail, p, joukkueNimi, rivinro) {
    const params = new URLSearchParams({
      seuraId:   tila.seuraId,
      pelaajaId: pelaajaId,   // ← estää duplikaatin suostumuslomakkeella
      seura:     seuraNimi,
      etunimi:   p.etunimi,
      sukunimi:  p.sukunimi,
      joukkue:   joukkueNimi || '',   // ei hEmailia linkkiin
      ...(p.palloId && { palloid: p.palloId }),
    });
    const linkki = baseUrl + '?' + params.toString();
    const kutsuRef = await db.collection('seurat').doc(tila.seuraId).collection('kutsut').add({
      tyyppi: 'excel_tuonti_kutsu', hEmail, pelaajaNimi: (p.etunimi + ' ' + p.sukunimi).trim(), pelaajaId, palloId: p.palloId || null, joukkue: joukkueNimi || null,
      linkki, tila: 'odottaa', luotu: nyt, lahettaja: tila.kayttaja?.uid || 'tuntematon',
    });
    try {
      await functions.httpsCallable('lahetaRekisteriKutsu')({ seuraId: tila.seuraId, pelaajaId, hEmail, linkki, seura: seuraNimi, etunimi: p.etunimi, sukunimi: p.sukunimi, joukkue: joukkueNimi || '' });
      await kutsuRef.update({ tila: 'lahetetty', lahetetty: nyt });
      return true;
    } catch (mailErr) {
      console.warn('[Excel] Sähköposti epäonnistui rivillä', rivinro, ':', mailErr.message);
      await kutsuRef.update({ tila: 'epaonnistui', virhe: String(mailErr.message || mailErr).slice(0, 300) }).catch(() => {});
      if (virhe) virhe.textContent = `Sähköposti epäonnistui (rivi ${rivinro}): ${_laskutusEsto(mailErr) || mailErr.message}`;
      return false;
    }
  }
  /* Olemassa oleva: PalloID (merkkijono; varalla numerona tallennettu) → nimi + joukkue. Tuoreena Firestoresta (suostumus voi olla muuttunut esikatselun jälkeen). */
  async function etsiOlemassa(p) {
    let sn;
    if (p.palloId) {
      sn = await pelCol.where('palloID', '==', p.palloId).limit(1).get();
      if (sn.empty && /^\d+$/.test(p.palloId)) sn = await pelCol.where('palloID', '==', Number(p.palloId)).limit(1).get();
    } else {
      sn = await pelCol.where('etunimi', '==', p.etunimi).where('sukunimi', '==', p.sukunimi).where('joukkue', '==', p.joukkue).limit(1).get();
    }
    return sn.empty ? null : Object.assign({ id: sn.docs[0].id }, sn.docs[0].data());
  }

  for (let i = 0; i < _excelData.length; i++) {
    { const _s = TM_ISTUNTO.tmTuontiSeis(auth, null); if (_s) { seis = _s; break; } }   // currentUser null (istunto vaihtui/päättyi) → pysähdy ennen riviä
    const p = _excelData[i];
    if (p._hylatty) { hylatty++; continue; }   // paikkamerkkiosoite — ei tuoda, ei kutsuta
    if (p._eiVuotta) { eiVuotta++; continue; }   // syntymävuosi puuttuu / virheellinen — ei tuoda
    const pct = Math.round((i + 1) / _excelData.length * 100);
    if (bar)    bar.style.width = pct + '%';
    if (teksti) teksti.textContent = (i + 1) + '/' + _excelData.length + ' — ' + p.etunimi + ' ' + p.sukunimi;

    try {
      // VAIHE 0: onko pelaaja jo järjestelmässä? → päivitys Excelin mukaan (ei enää hiljaista ohitusta)
      const ex = await etsiOlemassa(p);
      if (ex) {
        if (!_excelPaivitaValittu(i)) { ennallaan++; continue; }   // rivi pois päivityksestä → ei muutoksia eikä kutsua
        const paiv = TM_SEURA_TUONTI.tmSeuraPaivitys(p, ex, { paivita: true });
        const ref = pelCol.doc(ex.id);
        let emailNyt = String((ex.huoltaja && ex.huoltaja.email) || ex.huoltajaEmail || '').trim().toLowerCase();
        let muuttui = false;
        if (Object.keys(paiv.patch).length) { await ref.update(Object.assign({}, paiv.patch, { muokattu: nyt })); muuttui = true; }
        if (paiv.emailAsetus) {   // huoltajaEmail muuttuu VAIN palvelimella (Rules v3.33)
          try { await firebase.app().functions('europe-west1').httpsCallable('asetaHuoltajaEmail')({ seuraId: tila.seuraId, pelaajaId: ex.id, huoltajaEmail: paiv.emailAsetus }); emailNyt = paiv.emailAsetus; muuttui = true; paiv.emailPaivitetty = true; }
          catch (emErr) { paiv.emailPaivitetty = false; virheet++; console.warn('[Excel] huoltajan sähköposti ei päivittynyt rivillä', i + 2, ':', emErr.message); if (virhe) virhe.textContent = `Sähköpostin päivitys epäonnistui (rivi ${i+2}): ${emErr.message}`; }
        }
        if (muuttui) { paivitetty++; if (paiv.joukkueVaihtui) joukkueVaihtui++; } else ennallaan++;
        // VAIHE 2 (olemassa oleva): kutsu jos suostumus puuttuu (pilotti / ei kutsua; tai osoite vaihtui). Ei koskaan annetulle suostumukselle.
        if (lahetaKutsut && TM_SEURA_TUONTI.tmSeuraKutsuTarvitaan(ex, paiv) && TM_SEURA_TUONTI.tmSeuraEmail(emailNyt).kelpaa && !tmOnPaikkamerkkiOsoite(emailNyt)) {
          const mailOk = await lahetaKutsuRivi(ex.id, emailNyt, p, paiv.patch.joukkueNimi || ex.joukkueNimi || ex.joukkue || p.joukkue, i + 2);
          kutsut++;
          if (teksti) teksti.textContent = `${i+1}/${_excelData.length} — ${p.etunimi} ${p.sukunimi} ${mailOk ? tmHT('✉️ lähetetty') : tmHT('⚠️ sähköposti epäonnistui')}`;
        }
        continue;
      }

      // VAIHE 1: Luodaan dokumenttiviite ensin → ID välitetään kutsulinkkiin
      // Näin suostumuslomake kirjoittaa SAMAAN dokumenttiin eikä luo duplikaattia
      const pelaajaRef = pelCol.doc();
      const pelaajaId = pelaajaRef.id;

      await pelaajaRef.set(Object.assign(_tmPelaajanKieli(tila.seuraKieli), {
        etunimi:       p.etunimi || '',
        sukunimi:      p.sukunimi || '',
        syntymaVuosi:  p.syntymaVuosi,   // numerona (§7.11); tuonti ei aja riviä ilman sitä
        ...(p.sukupuoli ? { sukupuoli: p.sukupuoli } : {}),   // "M"/"N" (§7.12); puuttuva → ei kenttää (ei oletusta)
        joukkue:       p.joukkue || '',
        joukkueet:     p._joukkueId ? [p._joukkueId] : [],   // #92b: VAIN kanoninen id (§18) — ei nimi-jäänteitä; orpo → [] (joukkue-string riittää dual-kyselyyn)
        seuraId:       tila.seuraId,
        huoltajaEmail: p.huoltajaEmail ? String(p.huoltajaEmail).trim().toLowerCase() : null,   // yksi osoite (ensimmäinen)
        palloID:       p.palloId || null,   // aina merkkijono
        pelaajaId:     pelaajaId,
        // Talenttiohjelma — luetaan Excel-sarakkeesta
        talenttiOhjelma: p.talentti === 'kyllä' || p.talentti === 'kylla' || p.talentti === 'yes' || p.talentti === 'k',   // C (PM päätös a); taso/alku/aktivoija = A → VAIN sisainen/tiedot (alla, PR 2d K7)
        // 'pilotti' = tuotu ilman kutsua (testausta varten, kutsu lähetetään myöhemmin)
        // 'odottaa' = kutsu lähetetty, huoltajan suostumus puuttuu
        suostumusTila: lahetaKutsut ? 'odottaa' : 'pilotti',
        tila:          'pilotti',
        tuotu:         nyt,   // tuojan sähköpostia ei tallenneta pelaajadokumenttiin (tietoturva, vaihe 1)
        lahde:         'excel_tuonti',
      }));
      await _tmKirjaaTuoja(tila.seuraId, pelaajaId);   // PR 1e-1: tuojan uid → sisainen/tiedot
      /* PR 2d (K7): talenttiTaso/-Alku/-Aktivoi VAIN sisainen/tiedot:iin (ainoa kopio → virhe heitetään, rivi näkyy epäonnistuneena; ei hiljaista ohitusta). */
      { const _tal = p.talentti === 'kyllä' || p.talentti === 'kylla' || p.talentti === 'yes' || p.talentti === 'k';
        if (_tal) await window.TM_SISAINEN.tmS4Sisainen(db, tila.seuraId, pelaajaId, { talenttiTaso: p.talenttiTaso || 'perus', talenttiAlku: nyt, talenttiAktivoi: (tila.kayttaja?.uid || 'tuntematon') }, {}); }
      tuotu++;

      // VAIHE 2: Lähetetään kutsu jos pyydetty ja (kelvollinen, yksi) email löytyy
      if (lahetaKutsut && p.huoltajaEmail && TM_SEURA_TUONTI.tmSeuraEmail(p.huoltajaEmail).kelpaa) {
        const mailOk = await lahetaKutsuRivi(pelaajaId, p.huoltajaEmail, p, p.joukkue, i + 2);
        kutsut++;
        // Päivitetään progress-teksti kertomaan sähköpostin tila
        if (teksti) teksti.textContent =
          `${i+1}/${_excelData.length} — ${p.etunimi} ${p.sukunimi} ${mailOk ? tmHT('✉️ lähetetty') : tmHT('⚠️ sähköposti epäonnistui')}`;
      }

    } catch(err) {
      virheet++;
      console.warn('Rivi ' + (i + 2) + ' virhe:', err.message);
      if (virhe) virhe.textContent = `Rivi ${i+2} epäonnistui: ${err.message}`;
      { const _s = TM_ISTUNTO.tmTuontiSeis(auth, err); if (_s) { seis = _s; break; } }   // permission-denied / unauthenticated → pysähdy ensimmäiseen
    }

    // Pieni viive ettei Firestore ylikuormitu
    if (i < _excelData.length - 1) await new Promise(r => setTimeout(r, 80));
  }

  // Päivitetään progress-teksti lopuksi
  if (bar)    bar.style.width = seis ? bar.style.width : '100%';
  if (teksti) teksti.textContent = seis ? 'Pysäytetty' : tmHT('Valmis!');

  // Näytetään tulokset selkeästi
  const mailVirheitaOli = virheet > 0;
  /* Yhteenveto (21.10.2026): "X uutta · Y päivitetty (joukkue vaihtui: n) · Z ennallaan · kutsuja K" — ei enää pelkkää "ohitettu". */
  const yhteenveto = TM_SEURA_TUONTI.tmSeuraYhteenveto({ uusia: tuotu, paivitetty, joukkueVaihtui, ennallaan, kutsuja: kutsut }, tmHT);
  const msg = [
    yhteenveto,
    hylatty > 0  ? `${hylatty} ${hylatty === 1 ? 'rivi' : 'riviä'} hylätty – esimerkkiosoite, korvaa huoltajan oikealla sähköpostilla` : null,
    eiVuotta > 0 ? `${eiVuotta} ei tuotu (syntymävuosi puuttuu tai virheellinen)` : null,
    virheet > 0  ? `${virheet} riviä epäonnistui` : null,
  ].filter(Boolean).join(' · ');

  if (onni) {
    /* Mitään ei tuotu (1.10.2026): oranssi varoitus ILMAN ✅ — muuten "✅ 2 hylätty" näytti onnistumiselta. */
    const eiTuotu = tuotu === 0 && paivitetty === 0 && ennallaan === 0;   // uusia tai olemassa olevia ei käsitelty lainkaan
    onni.textContent = eiTuotu ? `⚠️ Mitään ei tuotu: ${msg || 'ei tuotavia rivejä'}` : `✅ ${msg}`;
    onni.style.color = eiTuotu ? 'var(--amber)' : 'var(--teal)';
    onni.style.background = eiTuotu ? 'rgba(224,160,64,.1)' : 'rgba(40,176,144,.1)';
    onni.style.borderColor = eiTuotu ? 'rgba(224,160,64,.35)' : 'rgba(40,176,144,.3)';
    onni.style.display = 'block';
    /* Suostumus ennen PIN:iä (1.10.2026): tuoduilla pelaajilla ei ole vielä suostumusta → PIN:iä ei luoda nyt
       (aiempi "Luo PIN-koodit tuoduille pelaajille" -kehote ei olisi luonut yhtään). PIN syntyy suostumuksen jälkeen. */
    if (tuotu > 0) {
      const ohje = document.createElement('div');
      ohje.style.cssText = 'margin-top:8px;font-size:12px;color:var(--ink2);';
      ohje.textContent = tmHT('PIN-koodit luodaan automaattisesti, kun huoltaja antaa suostumuksen.');
      onni.appendChild(ohje);
    }
  }
  if (seis && virhe) virhe.textContent = TM_ISTUNTO.tmTuontiYhteenveto(tuotu, _excelData.length, seis);   // montako ehdittiin tuoda + syy
  else if (virhe && virheet === 0) virhe.textContent = ''; // tyhjennä virheviesti jos kaikki ok

  naytaToast(
    (tuotu === 0 && paivitetty === 0 && ennallaan === 0)
      ? tmHT('Mitään ei tuotu') + (hylatty ? ` – ${hylatty} hylätty (esimerkkiosoite)` : '')
      : yhteenveto,
    (virheet === 0 && (tuotu > 0 || paivitetty > 0) && !seis) ? 'ok' : 'varoitus'
  );

  // Päivitetään pelaajalistaus
  setTimeout(() => renderPelaajat(document.getElementById('nakymaAlue')), 1000);
}


function toggleSivupalkki() {
  const sp = document.getElementById('sivupalkki');
  const ov = document.getElementById('sivupalkkiOverlay');
  const h1 = document.getElementById('ham1');
  const h3 = document.getElementById('ham3');
  const auki = sp && sp.classList.toggle('auki');
  if (ov) ov.classList.toggle('auki', auki);
  // Animoi hamburger → X
  if (h1) h1.style.transform = auki ? 'rotate(45deg) translate(5px,5px)' : '';
  if (h3) h3.style.transform = auki ? 'rotate(-45deg) translate(5px,-5px)' : '';
}

function suljeeSivupalkki() {
  const sp = document.getElementById('sivupalkki');
  const ov = document.getElementById('sivupalkkiOverlay');
  const h1 = document.getElementById('ham1');
  const h3 = document.getElementById('ham3');
  if (sp) sp.classList.remove('auki');
  if (ov) ov.classList.remove('auki');
  if (h1) h1.style.transform = '';
  if (h3) h3.style.transform = '';
}

async function kirjauduUlos() {
  if (tila._joukkueetKuuntelija) tila._joukkueetKuuntelija();
  await auth.signOut();
}

// Avaa toinen TM-näkymä uudessa välilehdessä, välittää seura-kontekstin
function avaaNaviNakyma(sivu) {
  const url = sivu + '?seura=' + (tila.seuraId || '') + '&tm_ref=seura';
  window.open(url, '_blank');
}
