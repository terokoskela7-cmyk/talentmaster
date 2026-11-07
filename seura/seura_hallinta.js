// ─────────────────────────────────────────────────────────────────
// NÄKYMÄ: HENKILÖSTÖ
// ─────────────────────────────────────────────────────────────────
async function renderHenkilosto(alue) {
  alue.innerHTML = `
    <div class="sivuOtsikko">
      <div class="sivuEyebrow">${tmHT('Henkilöstö')}</div>
      <div class="sivuH1">Käyttäjähallinta</div>
    </div>
    <div class="kortti">
      <div class="korttiHeader">
        <span class="korttiOtsikko">${tmHT('Seuran henkilöstö')}</span>
        <button class="lisaaNappi" onclick="avaaKayttajaModal()">${tmHT('+ Kutsu uusi käyttäjä')}</button>
      </div>
      <div id="henkilostoListaAlue" style="padding:20px;color:var(--ink3);font-size:13px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="spinner"></div> ${tmHT('Ladataan...')}
        </div>
      </div>
    </div>`;

  try {
    // source:'server' — lista päivittyy heti deaktivoinnin/aktivoinnin/roolinvaihdon jälkeen (ei välimuistia)
    const snap = await db
      .collection('seurat').doc(tila.seuraId)
      .collection('kayttajat')
      .get({ source: 'server' });

    const alueEl = document.getElementById('henkilostoListaAlue');
    if (!alueEl) return;

    if (snap.empty) {
      alueEl.innerHTML = `
        <div class="tyhjaAlue">
          <div class="tyhjaIkoni">🧑‍🏫</div>
          <div class="tyhjaOtsikko">${tmHT('Ei henkilöstöä')}</div>
          <div class="tyhjaTeksti">${tmHT('Kutsu valmentajia, testivastaavia tai muuta henkilöstöä.')}</div>
        </div>`;
      return;
    }

    const rooliNimet = {
      vp:tmHT('Valmennuspäällikkö'), seurasihteeri:'Seurasihteeri', urheilutoimenjohtaja:'UTJ',
      valmentaja:'Valmentaja', talenttivalmentaja:'Talent.val.',
      fysiikkavalmentaja:'Fysiikkaval.', testivastaava:'Testivastaava',
      fysioterapeutti:'Fysioterapeutti',
    };
    const rooliLuokat = {
      vp:'vp', seurasihteeri:'sihteeri', urheilutoimenjohtaja:'vp',
      valmentaja:'valmentaja',
    };

    const henkilot = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => ((a.aktiivinen === false) - (b.aktiivinen === false))
        || (a.sukunimi||a.email||'').localeCompare(b.sukunimi||b.email||''));
    // Deaktivoidut omaan osioonsa aktiivisten alle (1.10.2026) — eivät näy aktiivisten joukossa
    const deaktLkm = henkilot.filter(h => h.aktiivinen === false).length;
    const ekaDeakt = henkilot.findIndex(h => h.aktiivinen === false);

    alueEl.innerHTML = `
      <table>
        <thead><tr>
          <th>${tmHT('Nimi / Sähköposti')}</th><th>Rooli</th><th>${tmHT('Joukkue')}</th><th>Claims</th><th>${tmHT('Toiminnot')}</th>
        </tr></thead>
        <tbody>
          ${henkilot.map((h, hi) => `
            ${hi === ekaDeakt ? `<tr><td colspan="5" style="padding:14px 8px 6px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);">⛔ Deaktivoidut (${deaktLkm})</td></tr>` : ''}
            <tr${h.aktiivinen === false ? ' style="opacity:.55"' : ''}>
              <td>
                <div>${henkiloNimi(h)}</div>
                <div style="font-size:11px;color:var(--ink3);">${h.email || HENKILO_EI_EMAILIA}</div>
                ${h.puhelin ? ('<div style="font-size:11px;color:var(--ink3);">📞 ' + (h.suuntakoodi||'+358') + ' ' + h.puhelin + '</div>') : '<div style="font-size:11px;color:var(--amber);">' + tmHT('📞 ei puhelinta') + '</div>'}
              </td>
              <td><span class="badge ${rooliLuokat[h.rooli]||'muu'}">${rooliNimet[h.rooli]||h.rooli||'—'}</span></td>
              <td style="font-size:12px;color:var(--ink3);">${_escHtml(tmHenkiloJoukkueTeksti(h, '—'))}</td>
              <td>${h.aktiivinen === false
                ? '<span class="badge odottaa">⛔ Deaktivoitu</span>'
                : `<span class="badge ${h.claimsAsetettu?'ok':'odottaa'}">${h.claimsAsetettu?'✓ OK':'⏳'}</span>`}</td>
              <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button class="toimNappi sininen"
                    data-uid="${h.id}"
                    data-etunimi="${(h.etunimi||'').replace(/"/g,'&quot;')}"
                    data-sukunimi="${(h.sukunimi||'').replace(/"/g,'&quot;')}"
                    data-email="${(h.email||'').replace(/"/g,'&quot;')}"
                    data-suuntakoodi="${(h.suuntakoodi||'+358').replace(/"/g,'&quot;')}"
                    data-puhelin="${(h.puhelin||'').replace(/"/g,'&quot;')}"
                    data-rooli="${(h.rooli||'').replace(/"/g,'&quot;')}"
                    data-joukkueet="${JSON.stringify(h.joukkueet||[h.joukkue].filter(Boolean)).replace(/"/g,'&quot;')}"
                    onclick="avaaHenkiloMuokkausNapista(this)">
                    ${tmHT('Muokkaa')}
                  </button>
                  <button class="toimNappi"
                    data-uid="${h.id}"
                    data-email="${(h.email||'').replace(/"/g,'&quot;')}"
                    data-etunimi="${(h.etunimi||'').replace(/"/g,'&quot;')}"
                    data-suuntakoodi="${(h.suuntakoodi||'+358').replace(/"/g,'&quot;')}"
                    data-puhelin="${(h.puhelin||'').replace(/"/g,'&quot;')}"
                    onclick="lahetaSalasanaResetNapista(this)">
                    ${tmHT('Salasana')}
                  </button>
                  ${h.aktiivinen === false
                    ? `<button class="toimNappi" data-uid="${h.id}" data-email="${(h.email||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" onclick="aktivoiKayttajaNapista(this)">${tmHT('Aktivoi')}</button>`
                    : `<button class="toimNappi vaara" data-uid="${h.id}" data-email="${(h.email||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}" onclick="deaktivoiKayttajaNapista(this)">Deaktivoi</button>`}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    console.error('Henkilöstö:', e);
    const alueEl2 = document.getElementById('henkilostoListaAlue');
    if (alueEl2) alueEl2.innerHTML = `
      <div style="padding:20px;color:var(--red);font-size:13px;">
        ${tmHT('Henkilöstön lataus epäonnistui:')} ${e.message || tmHT('Tarkista yhteys ja kirjautuminen.')}
      </div>`;
  }
}

// ─────────────────────────────────────────────────────────────────
// NÄKYMÄ: BRÄNDI (white-label — logo + aksenttiväri)
// Kirjoittaa: seurat/{sid}/konfiguraatio/brandi
// HUOM: string concatenation (ei nested template literals — §7.1)
// ─────────────────────────────────────────────────────────────────
var _brandiLogoUrl = null;

// WCAG suhteellinen luminanssi -kontrastisuhde
function _brandiKontrasti(h1, h2) {
  function hexToRgb(h) {
    h = String(h || '').trim().replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return { r: r, g: g, b: b };
  }
  function lum(rgb) {
    function ch(v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    var r = ch(rgb.r), g = ch(rgb.g), b = ch(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  var l1 = lum(hexToRgb(h1));
  var l2 = lum(hexToRgb(h2));
  var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

async function renderBrandi(alue) {
  alue.innerHTML =
    '<div class="sivuOtsikko">' +
      '<div class="sivuEyebrow">' + tmHT('Asetukset') + '</div>' +
      '<div class="sivuH1">Brändi</div>' +
    '</div>' +
    '<div class="kortti"><div style="padding:20px;color:var(--ink3);font-size:13px;">' +
      '<div style="display:flex;align-items:center;gap:10px;"><div class="spinner"></div> ' + tmHT('Ladataan...') + '</div>' +
    '</div></div>';

  var b = {};
  try {
    var s = await db.collection('seurat').doc(tila.seuraId)
      .collection('konfiguraatio').doc('brandi').get();
    b = s.exists ? s.data() : {};
  } catch (e) {
    b = {};
  }

  _brandiLogoUrl = b.logo_url || null;
  var accent = b.accent_hex || '#28B090';
  var ink = b.accent_paalle_teksti_hex || '#FFFFFF';

  var html = '';
  html += '<div class="sivuOtsikko">';
  html += '<div class="sivuEyebrow">' + tmHT('Asetukset') + '</div>';
  html += '<div class="sivuH1">Brändi</div>';
  html += '</div>';

  // LOGO-kortti
  html += '<div class="kortti">';
  html += '<div class="korttiHeader"><span class="korttiOtsikko">' + tmHT('Seuran logo') + '</span></div>';
  html += '<div style="padding:20px;">';
  html += '<div id="brandiLogoPreview" style="margin-bottom:14px;">';
  if (_brandiLogoUrl) {
    html += '<img src="' + _brandiLogoUrl + '" alt="Seuran logo" style="max-height:80px;max-width:260px;border-radius:8px;background:var(--bg);padding:8px;border:1px solid var(--border);">';
  } else {
    html += '<div style="color:var(--ink3);font-size:13px;">' + tmHT('Ei logoa ladattuna.') + '</div>';
  }
  html += '</div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">';
  html += '<input type="file" id="brandiLogo" accept="image/*" style="color:var(--ink2);font-size:13px;">';
  html += '<button class="nappi teal" style="width:auto;margin-top:0;padding:9px 16px;" onclick="_brandiLataaLogo()">' + tmHT('Lataa logo') + '</button>';
  if (_brandiLogoUrl) {
    html += '<button class="nappi" style="width:auto;margin-top:0;padding:9px 16px;background:var(--bg);border:1px solid var(--bord2);color:var(--ink2);" onclick="_brandiPoistaLogo()">' + tmHT('Poista logo') + '</button>';
  }
  html += '</div>';
  html += '<div style="color:var(--ink3);font-size:11px;margin-top:8px;">' + tmHT('Max 5 MB. JPG, PNG, SVG tai WebP.') + '</div>';
  html += '</div></div>';

  // VÄRI-kortti
  html += '<div class="kortti">';
  html += '<div class="korttiHeader"><span class="korttiOtsikko">Aksenttiväri</span></div>';
  html += '<div style="padding:20px;">';

  // Aksentti
  html += '<div style="display:flex;flex-wrap:wrap;gap:18px;margin-bottom:16px;">';
  html += '<div>';
  html += '<div class="kenttaLabel" style="margin-bottom:6px;">Aksenttiväri</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<input type="color" id="brandiAccent" value="' + accent + '" oninput="_brandiSyncAccent();_brandiPaivitaEsikatselu()" style="width:48px;height:36px;border:none;background:none;cursor:pointer;">';
  html += '<input type="text" id="brandiAccentHex" value="' + accent + '" oninput="_brandiSyncAccentFromHex();_brandiPaivitaEsikatselu()" maxlength="7" style="width:90px;background:var(--bg);border:1px solid var(--bord2);color:var(--ink);border-radius:6px;padding:7px 9px;font-size:13px;font-family:monospace;">';
  html += '</div></div>';

  // Teksti aksentin päällä
  html += '<div>';
  html += '<div class="kenttaLabel" style="margin-bottom:6px;">Tekstin väri aksentin päällä</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<input type="color" id="brandiInk" value="' + ink + '" oninput="_brandiSyncInk();_brandiPaivitaEsikatselu()" style="width:48px;height:36px;border:none;background:none;cursor:pointer;">';
  html += '<input type="text" id="brandiInkHex" value="' + ink + '" oninput="_brandiSyncInkFromHex();_brandiPaivitaEsikatselu()" maxlength="7" style="width:90px;background:var(--bg);border:1px solid var(--bord2);color:var(--ink);border-radius:6px;padding:7px 9px;font-size:13px;font-family:monospace;">';
  html += '</div></div>';
  html += '</div>';

  // Live esikatselu
  html += '<div style="margin-top:8px;">';
  html += '<div class="kenttaLabel" style="margin-bottom:8px;">' + tmHT('Live-esikatselu') + '</div>';
  html += '<button id="brandiEsikatselu" style="border:none;border-radius:8px;padding:11px 18px;font-size:14px;font-weight:600;cursor:default;background:' + accent + ';color:' + ink + ';">' + tmHT('Tallenna arviointi') + '</button>';
  html += '<div id="brandiKontrasti" style="font-size:12px;color:var(--ink3);margin-top:8px;"></div>';
  html += '</div>';

  html += '<div style="margin-top:20px;">';
  html += '<button class="nappi teal" style="width:auto;margin-top:0;padding:10px 22px;" onclick="_brandi' + tmHT('Tallenna') + '()">Tallenna</button>';
  html += '</div>';

  html += '</div></div>';

  alue.innerHTML = html;
  _brandiPaivitaEsikatselu();
}

// Värivalitsin <-> hex-tekstikenttä synkronointi
window._brandiSyncAccent = function () {
  var c = document.getElementById('brandiAccent');
  var t = document.getElementById('brandiAccentHex');
  if (c && t) t.value = c.value.toUpperCase();
};
window._brandiSyncAccentFromHex = function () {
  var c = document.getElementById('brandiAccent');
  var t = document.getElementById('brandiAccentHex');
  if (c && t && /^#[0-9a-fA-F]{6}$/.test(t.value)) c.value = t.value;
};
window._brandiSyncInk = function () {
  var c = document.getElementById('brandiInk');
  var t = document.getElementById('brandiInkHex');
  if (c && t) t.value = c.value.toUpperCase();
};
window._brandiSyncInkFromHex = function () {
  var c = document.getElementById('brandiInk');
  var t = document.getElementById('brandiInkHex');
  if (c && t && /^#[0-9a-fA-F]{6}$/.test(t.value)) c.value = t.value;
};

window._brandiPaivitaEsikatselu = function () {
  var accentEl = document.getElementById('brandiAccent');
  var inkEl = document.getElementById('brandiInk');
  var btn = document.getElementById('brandiEsikatselu');
  var info = document.getElementById('brandiKontrasti');
  if (!accentEl || !inkEl) return;
  var accent = accentEl.value;
  var ink = inkEl.value;
  if (btn) {
    btn.style.background = accent;
    btn.style.color = ink;
  }
  if (info) {
    var teksti = _brandiKontrasti(accent, ink);
    var tausta = _brandiKontrasti(accent, '#161614');
    var ok = teksti >= 4.5 && tausta >= 3.0;
    info.innerHTML =
      '' + tmHT('Kontrasti teksti/aksentti:') + ' <strong style="color:' + (teksti >= 4.5 ? 'var(--teal)' : 'var(--amber)') + ';">' + teksti.toFixed(2) + ':1</strong> · ' +
      'aksentti/tausta: <strong style="color:' + (tausta >= 3.0 ? 'var(--teal)' : 'var(--amber)') + ';">' + tausta.toFixed(2) + ':1</strong>' +
      (ok ? '' : ' — alle saavutettavuusvaatimuksen (4.5:1 / 3.0:1)');
  }
};

window._brandiLataaLogo = async function () {
  var inp = document.getElementById('brandiLogo');
  var file = inp && inp.files && inp.files[0];
  if (!file) { naytaToast(tmHT('Valitse ensin kuvatiedosto.'), 'varoitus'); return; }
  if (!(file.type && file.type.indexOf('image/') === 0)) {
    naytaToast(tmHT('Tiedoston on oltava kuva.'), 'varoitus'); return;
  }
  if (!(file.size < 5 * 1024 * 1024)) {
    naytaToast(tmHT('Kuva on liian suuri (max 5 MB).'), 'varoitus'); return;
  }
  var ext = '';
  var dot = file.name.lastIndexOf('.');
  if (dot > -1) ext = file.name.substring(dot + 1).toLowerCase();
  if (['jpg', 'jpeg', 'png', 'svg', 'webp'].indexOf(ext) === -1) {
    var tmap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/webp': 'webp' };
    ext = tmap[file.type] || 'png';
  }
  try {
    var ref = firebase.storage().ref('seurat/' + tila.seuraId + '/brandi/logo.' + ext);
    await ref.put(file);
    var url = await ref.getDownloadURL();
    _brandiLogoUrl = url;
    var prev = document.getElementById('brandiLogoPreview');
    if (prev) {
      prev.innerHTML = '<img src="' + url + '" alt="Seuran logo" style="max-height:80px;max-width:260px;border-radius:8px;background:var(--bg);padding:8px;border:1px solid var(--border);">';
    }
    naytaToast(tmHT('Logo ladattu'), 'ok');
  } catch (e) {
    naytaToast((tmHT('Logon lataus epäonnistui:') + ' ') + (e && e.message ? e.message : e), 'virhe');
  }
};

window._brandiPoistaLogo = function () {
  _brandiLogoUrl = null;
  var prev = document.getElementById('brandiLogoPreview');
  if (prev) prev.innerHTML = '<div style="color:var(--ink3);font-size:13px;">' + tmHT('Ei logoa ladattuna.') + '</div>';
  naytaToast('Logo poistettu — muista tallentaa.', 'varoitus');
};

window._brandiTallenna = async function () {
  var accentEl = document.getElementById('brandiAccent');
  var inkEl = document.getElementById('brandiInk');
  var accent_hex = accentEl ? accentEl.value : '#28B090';
  var accent_paalle = inkEl ? inkEl.value : '#FFFFFF';
  var logoUrl = _brandiLogoUrl;

  // Kontrastivalidointi (pakollinen) — saavutettavuus
  if (_brandiKontrasti(accent_hex, accent_paalle) < 4.5 ||
      _brandiKontrasti(accent_hex, '#161614') < 3.0) {
    naytaToast(tmHT('Väri ei täytä saavutettavuusvaatimusta (kontrasti < 4.5:1) — käytetään oletusväriä.'), 'varoitus');
    accent_hex = '#28B090';
    accent_paalle = '#FFFFFF';
  }

  try {
    await db.collection('seurat').doc(tila.seuraId)
      .collection('konfiguraatio').doc('brandi')
      .set({
        logo_url: logoUrl || null,
        accent_hex: accent_hex,
        accent_paalle_teksti_hex: accent_paalle,
        paivitetty: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    naytaToast(tmHT('Brändi tallennettu'), 'ok');
    renderBrandi(document.getElementById('nakymaAlue'));
  } catch (e) {
    naytaToast((tmHT('Tallennus epäonnistui:') + ' ') + (e && e.message ? e.message : e), 'virhe');
  }
};

// ─────────────────────────────────────────────────────────────────
// NÄKYMÄ: SOPIMUKSET
// ─────────────────────────────────────────────────────────────────
function renderSopimukset() {
  setTimeout(lataaKoriJaTasoTiedot, 150);
  const tasot = [
    {
      id: 'perustaso', nimi: 'Perustaso', vari: '--blue',
      kuvaus: tmHT('Perusrekisteri, joukkuehallinta ja rekisteröintikutsut huoltajille.'),
      ominaisuudet: ['Pelaajahallinta', 'Joukkuehallinta', 'Rekisteröintikutsut', 'GDPR-suostumuslomake'],
    },
    {
      id: 'kehitystaso', nimi: 'Kehitystaso', vari: '--teal',
      kuvaus: tmHT('Kaikki Perustason ominaisuudet + harjoitettavuuskartoitus ja IDP-kortit.'),
      ominaisuudet: [tmHT('Kehon valmius -harjoitettavuuskartoitus'), 'IDP-kehityskortti v3', tmHT('Valmentajan kenttähavainnot'), 'PHV-seuranta'],
    },
    {
      id: 'huipputaso', nimi: 'Huipputaso', vari: '--amber',
      kuvaus: tmHT('Kaikki ominaisuudet — talenttitunnistus, biologinen ikä ja täysi 5D-viitekehys.'),
      ominaisuudet: ['Talenttitunnistus (HPP ELITE)', tmHT('Biologinen ikä (Mirwald 2002)'), 'Pelaajaprofiili (Railgun/Maestro/Shadowstep/Titan)', tmHT('Täysi 5D-arviointikehys')],
    },
  ];
  const tasoHTML = tasot.map(t => `
    <div id="taso-${t.id}" style="display:flex;gap:16px;padding:16px 20px;
      border-bottom:1px solid var(--border);align-items:flex-start;transition:background .2s;">
      <div id="taso-${t.id}-ind" style="width:10px;height:10px;border-radius:50%;
        background:var(--border);flex-shrink:0;margin-top:5px;transition:background .3s;"></div>
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:700;color:var(--ink);">${t.nimi}</span>
          <span id="taso-${t.id}-badge" style="display:none;font-size:10px;font-weight:700;
            padding:2px 8px;border-radius:4px;background:rgba(40,176,144,.15);color:var(--teal);
            text-transform:uppercase;letter-spacing:.5px;">${tmHT('Aktiivinen')}</span>
        </div>
        <div style="font-size:12px;color:var(--ink3);margin-bottom:8px;">${t.kuvaus}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${t.ominaisuudet.map(o => `<span style="font-size:11px;padding:2px 8px;border-radius:4px;
            background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--ink3);">${o}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');
  return `
    <div class="sivuOtsikko">
      <div class="sivuEyebrow">${tmHT('Sopimukset ja tasot')}</div>
      <div class="sivuH1">${tmHT('Seuran taso ja Palloliiton kori')}</div>
    </div>
    <div class="kortti" style="margin-bottom:20px;">
      <div class="korttiHeader">
        <div>
          <span class="korttiOtsikko">TalentMaster-taso</span>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">Määrittää mitä ominaisuuksia seuralla on käytettävissä</div>
        </div>
        <span id="tm-taso-badge" style="font-size:12px;color:var(--ink3);">${tmHT('Ladataan...')}</span>
      </div>
      ${tasoHTML}
    </div>
    <div class="kortti" style="margin-bottom:20px;">
      <div class="korttiHeader">
        <div>
          <span class="korttiOtsikko">Palloliiton kori</span>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${tmHT('Seuran ja Palloliiton välinen kehityssopimustaso — hallinnoidaan Palloliiton kanssa')}</div>
        </div>
        <span id="kori-badge" style="font-size:12px;color:var(--ink3);">${tmHT('Ladataan...')}</span>
      </div>
      <div style="padding:20px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
          ${['Kori 1','Kori 2','Kori 3'].map((k,i) => `
            <div id="kori-${i+1}-kortti" style="padding:16px;border-radius:8px;border:1px solid var(--border);
              background:var(--bg3);text-align:center;transition:all .25s;">
              <div style="font-size:24px;margin-bottom:6px;">${['🌱','📈','🏆'][i]}</div>
              <div style="font-size:13px;font-weight:700;color:var(--ink2);">${k}</div>
              <div style="font-size:11px;color:var(--ink3);margin-top:4px;">${['Perusvaihe','Kehitysvaihe','Huippuvaihe'][i]}</div>
            </div>`).join('')}
        </div>
        <div id="kori-kuvaus" style="margin-top:14px;padding:12px 16px;background:rgba(42,93,176,.06);
          border:1px solid rgba(42,93,176,.15);border-radius:8px;font-size:13px;color:var(--ink2);
          line-height:1.6;display:none;"></div>
      </div>
    </div>
    <div class="kortti">
      <div class="korttiHeader">
        <span class="korttiOtsikko">${tmHT('📋 Pelaajien suostumustilanne')}</span>
        <span id="sopimukset-lkm" style="font-size:12px;color:var(--ink3);">${tmHT('Ladataan...')}</span>
      </div>
      <div id="sopimukset-lista" style="padding:20px;color:var(--ink3);font-size:13px;">
        <div style="display:flex;align-items:center;gap:10px;"><div class="spinner"></div> ${tmHT('Ladataan...')}</div>
      </div>
    </div>
  `;
}

async function lataaKoriJaTasoTiedot() {
  if (!tila.seuraId) return;
  try {
    const seuraSnap = await db.collection('seurat').doc(tila.seuraId).get();
    const seuraData = seuraSnap.exists ? seuraSnap.data() : {};
    // TalentMaster-taso
    const tmTaso = seuraData.tmTaso || seuraData.paketti || 'perustaso';
    const tasoNimet = { perustaso:'Perustaso', kehitystaso:'Kehitystaso', huipputaso:'Huipputaso' };
    const tasoVarit = { perustaso:'--blue', kehitystaso:'--teal', huipputaso:'--amber' };
    const tmBadge = document.getElementById('tm-taso-badge');
    if (tmBadge) tmBadge.innerHTML = `<span style="font-size:11px;font-weight:700;padding:3px 10px;
      border-radius:4px;background:rgba(255,255,255,.06);color:var(${tasoVarit[tmTaso]||'--blue'});">
      ${tasoNimet[tmTaso]||tmTaso}</span>`;
    ['perustaso','kehitystaso','huipputaso'].forEach(t => {
      const ind = document.getElementById('taso-'+t+'-ind');
      const badge = document.getElementById('taso-'+t+'-badge');
      const rivi = document.getElementById('taso-'+t);
      if (t === tmTaso) {
        if (ind) ind.style.background = 'var('+tasoVarit[t]+')';
        if (badge) badge.style.display = 'inline-block';
        if (rivi) rivi.style.background = 'rgba(255,255,255,.02)';
      }
    });
    // Palloliiton kori
    const palloKori = seuraData.palloliittoKori || seuraData.kori || null;
    const koriNimet = {'1':'Kori 1','2':'Kori 2','3':'Kori 3'};
    const koriKuvaukset = {
      '1': tmHT('Seura on Palloliiton Korissa 1 (perusvaihe). TalentMaster Perustaso tukee tämän tason vaatimusten täyttämistä.'),
      '2': tmHT('Seura on Palloliiton Korissa 2 (kehitysvaihe). TalentMaster Kehitystaso tukee Korin 2 vaatimuksia IDP-korteilla ja harjoitettavuuskartoituksella.'),
      '3': tmHT('Seura on Palloliiton Korissa 3 (huippuvaihe). TalentMaster Huipputaso on suunniteltu Korin 3 vaatimuksia varten — talenttitunnistus, biologinen ikä ja täysi 5D-arviointi.'),
    };
    const koriBadge = document.getElementById('kori-badge');
    if (koriBadge) koriBadge.innerHTML = palloKori
      ? `<span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;
          background:rgba(42,93,176,.12);color:var(--blue);">${koriNimet[palloKori]||'Kori '+palloKori}</span>`
      : `<span style="font-size:11px;color:var(--ink3);">${tmHT('Ei asetettu')}</span>`;
    if (palloKori) {
      const kortti = document.getElementById('kori-'+palloKori+'-kortti');
      if (kortti) { kortti.style.background='rgba(42,93,176,.08)'; kortti.style.borderColor='rgba(42,93,176,.4)'; }
      const kuvaus = document.getElementById('kori-kuvaus');
      if (kuvaus) { kuvaus.textContent = koriKuvaukset[palloKori]||''; kuvaus.style.display='block'; }
    }
    // GDPR-suostumukset — luetaan pelaajat-kokoelmasta, EI kutsut-kokoelmasta
    const pelaajatSnap = await db.collection('seurat').doc(tila.seuraId).collection('pelaajat').get();
    const pelaajat = pelaajatSnap.docs.map(d => ({id:d.id,...d.data()}));
    const annettu  = pelaajat.filter(_suostumusAnnettu);
    const pilotti  = pelaajat.filter(p => p.suostumusTila==='pilotti');
    const odottaa  = pelaajat.filter(p =>
      (p.suostumusTila==='odottaa'||p.suostumusTila==='luotu')&&
      !_suostumusAnnettu(p) && !_suostumusPeruttu(p) &&
      p.suostumusTila!=='pilotti'
    );
    const lkm = document.getElementById('sopimukset-lkm');
    if (lkm) lkm.textContent = pelaajat.length+' pelaajaa';
    const lista = document.getElementById('sopimukset-lista');
    if (!lista) return;
    if (pelaajat.length === 0) {
      lista.innerHTML = `<div class="tyhjaAlue" style="min-height:20vh;">
        <div class="tyhjaIkoni">📋</div>
        <div class="tyhjaOtsikko">${tmHT('Ei pelaajia')}</div>
        <div class="tyhjaTeksti">${tmHT('Lähetä rekisteröintikutsuja jotta suostumusdata kertyy.')}</div>
      </div>`;
      return;
    }
    lista.innerHTML = `
      <div style="display:flex;gap:24px;margin-bottom:20px;flex-wrap:wrap;">
        <div style="text-align:center;">
          <div style="font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:300;color:var(--teal);">${annettu.length}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${tmHT('Suostumus annettu')}</div>
        </div>
        ${pilotti.length > 0 ? `
        <div style="text-align:center;">
          <div style="font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:300;color:var(--blue);">${pilotti.length}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${tmHT('Pilotti (ei kutsua)')}</div>
        </div>` : ''}
        <div style="text-align:center;">
          <div style="font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:300;color:var(--amber);">${odottaa.length}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${tmHT('Odottaa suostumusta')}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:var(--ink3);">${pelaajat.length}</div>
          <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${tmHT('Yhteensä')}</div>
        </div>
      </div>
      <table>
        <thead><tr><th>${tmHT('Pelaaja')}</th><th>${tmHT('Joukkue')}</th><th>${tmHT('Huoltajan sähköposti')}</th><th>Suostumustila</th></tr></thead>
        <tbody>
          ${pelaajat.sort((a,b)=>(a.sukunimi||'').localeCompare(b.sukunimi||'')).map(p => {
            const nimi = (p.etunimi||'')+' '+(p.sukunimi||'');
            const onAnnettu  = _suostumusAnnettu(p);
            const onPilotti  = !onAnnettu && p.suostumusTila==='pilotti';
            const badgeLuokka = _suostumusPeruttu(p) ? 'harmaa' : onAnnettu ? 'ok' : onPilotti ? 'pilotti' : 'odottaa';
            const badgeTeksti = _suostumusPeruttu(p) ? '⊘ ' + tmHT('Suostumus peruttu') : onAnnettu ? tmHT('✓ Annettu') : onPilotti ? '🔬 Pilotti' : tmHT('⏳ Odottaa');
            return `<tr>
              <td>${nimi.trim() || HENKILO_NIMETON}</td>
              <td style="color:var(--ink3);">${p.joukkue||'—'}</td>
              <td style="font-size:12px;color:var(--ink3);">${p.huoltajaEmail||'—'}</td>
              <td><span class="badge ${badgeLuokka}">${badgeTeksti}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch(e) { console.error('[Sopimukset]', e); }
}

// ─────────────────────────────────────────────────────────────────
// JOUKKUEEN LISÄYS
// ─────────────────────────────────────────────────────────────────
function avaaJoukkueModal() {
  ['jouk_nimi','jouk_ika','jouk_id','jouk_vuosi']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('joukkueVirhe').classList.remove('nakyvilla');
  document.getElementById('joukkueModalOtsikko').textContent = tmHT('Lisää joukkue');
  // Päivitä placeholder kirjautuneen seuran mukaan
  // Käytä tila.seuraNimi:ä dynaamiseen placeholderiin
  const _seuraNimi = tila.seuraNimi || tila.seuraId || 'Seura';
  const _seuraLyh  = (tila.seuraId || 'seura').toUpperCase();
  const lyhenne    = (tila.seuraId || 'seura').toLowerCase().replace(/[^a-z0-9]/g,'');
  const nimiEl = document.getElementById('jouk_nimi');
  const idEl   = document.getElementById('jouk_id');
  if (nimiEl) nimiEl.placeholder = 'esim. ' + _seuraLyh + ' T18';
  if (idEl)   idEl.placeholder   = 'esim. ' + lyhenne + '_t18';
  // Päivitä ohjeteksti
  const ohjeEl = idEl?.nextElementSibling;
  if (ohjeEl) ohjeEl.textContent = (tmHT('Pieni kirjain, ei välejä (esim.') + ' ') + lyhenne + '_t18)';
  document.getElementById('joukkueModal').classList.add('auki');
}

async function tallennaJoukkue() {
  const nimi  = document.getElementById('jouk_nimi').value.trim();
  const ika   = document.getElementById('jouk_ika').value.trim();
  const id    = document.getElementById('jouk_id').value.trim().toLowerCase();
  const vuosi = document.getElementById('jouk_vuosi').value.trim();

  if (!nimi || !ika || !id) {
    naytaModalVirhe('joukkueVirhe', tmHT('Nimi, ikäluokka ja ID ovat pakollisia.'));
    return;
  }

  const nappi = document.getElementById('tallennaJoukkueNappi');
  nappi.disabled    = true;
  nappi.textContent = 'Tallennetaan...';

  try {
    // Järjestysnumero ikäluokan perusteella (U10=10, U15=15 jne.)
    const jarjestys = parseInt(ika.replace(/\D/g, '')) || 99;

    await db.collection('seurat').doc(tila.seuraId)
      .collection('joukkueet').doc(id)
      .set({
        nimi, ikaryhma: ika, vuosi: vuosi || null,
        jarjestys, luotu: firebase.firestore.FieldValue.serverTimestamp(),
      });

    nappi.disabled    = false;
    nappi.textContent = tmHT('Tallenna joukkue');
    suljeModal('joukkueModal');
    naytaToast(`Joukkue ${nimi} lisätty!`, 'ok');
    // onSnapshot päivittää tila.joukkueet automaattisesti

  } catch (virhe) {
    nappi.disabled    = false;
    nappi.textContent = tmHT('Tallenna joukkue');
    naytaModalVirhe('joukkueVirhe', (tmHT('Tallennus epäonnistui:') + ' ') + virhe.message);
  }
}

// ─────────────────────────────────────────────────────────────────
// JOUKKUEEN NIMEN MUOKKAUS
// ─────────────────────────────────────────────────────────────────
function avaaJoukkueMuokkaus(joukkueId, joukkueNimi, ikaryhma, vuosi) {
  let modal = document.getElementById('joukkueMuokkausModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'joukkueMuokkausModal';
    modal.className = 'modalTausta';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modalSisalto" style="max-width:440px;">
      <div class="modalOtsikko">
        <span>${tmHT('✏️ Muokkaa joukkuetta')}</span>
        <button class="modalSuljeNappi" onclick="document.getElementById('joukkueMuokkausModal').classList.remove('auki')">✕</button>
      </div>

      <div style="padding:20px;">
        <div style="background:rgba(224,160,64,.08);border:1px solid rgba(224,160,64,.2);
          border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:12px;color:var(--amber);line-height:1.5;">
          ${tmHT('⚠️ Nimen muutos päivittää kaikki tähän joukkueeseen kuuluvat pelaajat automaattisesti.')}
        </div>

        <div class="kenttaRyhma" style="margin-bottom:12px;">
          <label class="kenttaLabel">${tmHT('Joukkueen nimi')}</label>
          <input id="jm_nimi" class="kenttaInput" value="${joukkueNimi}"
            placeholder="esim. SJK P16 Liiga"
            style="font-size:15px;font-weight:600;">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
          <div class="kenttaRyhma">
            <label class="kenttaLabel">${tmHT('Ikäryhmä')}</label>
            <input id="jm_ikaryhma" class="kenttaInput" value="${ikaryhma}" placeholder="esim. P16">
          </div>
          <div class="kenttaRyhma">
            <label class="kenttaLabel">${tmHT('Vuosi')}</label>
            <input id="jm_vuosi" class="kenttaInput" value="${vuosi}" placeholder="esim. 2025">
          </div>
        </div>

        <div id="jm_status" style="font-size:12px;color:var(--ink3);margin-bottom:12px;min-height:18px;"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="toimNappi"
            onclick="document.getElementById('joukkueMuokkausModal').classList.remove('auki')">
            ${tmHT('Peruuta')}
          </button>
          <button class="toimNappi sininen" style="font-weight:700;"
            onclick="tallennaJoukkueMuutos('${joukkueId}','${joukkueNimi}')">
            ${tmHT('💾 Tallenna ja päivitä pelaajat')}
          </button>
        </div>
      </div>
    </div>`;

  modal.classList.add('auki');
  setTimeout(() => document.getElementById('jm_nimi')?.focus(), 100);
}

async function tallennaJoukkueMuutos(joukkueId, vanhanimi) {
  const uusiNimi    = document.getElementById('jm_nimi')?.value.trim();
  const uusiIka     = document.getElementById('jm_ikaryhma')?.value.trim();
  const uusiVuosi   = document.getElementById('jm_vuosi')?.value.trim();
  const statusEl    = document.getElementById('jm_status');

  if (!uusiNimi) { if (statusEl) statusEl.textContent = tmHT('Nimi ei voi olla tyhjä.'); return; }
  if (uusiNimi === vanhanimi && uusiIka && uusiVuosi) {
    // Vain ikaryhma/vuosi muuttui — ei tarvita batch-päivitystä
  }

  try { if (tila.kayttaja) await tila.kayttaja.getIdToken(true); } catch(e) {}

  if (statusEl) statusEl.textContent = '🔄 Päivitetään...';

  const db = firebase.firestore();

  // 1. Päivitä joukkueet-kokoelman dokumentti
  await db.collection('seurat').doc(tila.seuraId)
    .collection('joukkueet').doc(joukkueId)
    .update({
      nimi:     uusiNimi,
      ...(uusiIka   && { ikaryhma: uusiIka }),
      ...(uusiVuosi && { vuosi: parseInt(uusiVuosi)||uusiVuosi }),
      muokattu: firebase.firestore.FieldValue.serverTimestamp()
    });

  // 2. Batch-päivitys pelaajille — vain jos nimi muuttui. §7.18: JÄSENYYS = joukkueet[] (tunniste); `joukkue` on näyttönimi.
  //    Jäsenet haetaan tunnisteella (array-contains joukkueId) JA legacy-pelaajat nimellä; tunnisteita EI kosketa (nimi ei ole tunniste → vanhaa "nimi → uusi nimi joukkueet[]:ssä" -korvausta ei enää tehdä).
  if (uusiNimi !== vanhanimi) {
    const col = db.collection('seurat').doc(tila.seuraId).collection('pelaajat');
    const [sId, sNimi] = await Promise.all([col.where('joukkueet', 'array-contains', joukkueId).get(), col.where('joukkue', '==', vanhanimi).get()]);
    const kaikki = new Map(); sId.docs.forEach(d => kaikki.set(d.id, d)); sNimi.docs.forEach(d => kaikki.set(d.id, d));
    const vanhaAvain = tmNormJoukkueAvain(vanhanimi), batch = db.batch(); let n = 0;
    kaikki.forEach(d => {
      const data = d.data(), ids = Array.isArray(data.joukkueet) ? data.joukkueet : [], jasen = ids.indexOf(joukkueId) >= 0, legacy = !ids.length;
      if (!jasen && !legacy) return;   // nimi täsmää, mutta pelaaja on tunnisteen mukaan muualla → ei kosketa (korjaus: Tarkista joukkuejäsenyydet, Excel_Tuonti)
      const paivitys = {};
      if (tmNormJoukkueAvain(data.joukkue) === vanhaAvain) { paivitys.joukkue = uusiNimi; paivitys.joukkueNimi = uusiNimi; }
      if (Array.isArray(data.joukkueetNimet)) paivitys.joukkueetNimet = data.joukkueetNimet.map(j => tmNormJoukkueAvain(j) === vanhaAvain ? uusiNimi : j);
      if (legacy) paivitys.joukkueet = [joukkueId];   // legacy-pelaaja ilman tunnistetta: nimi täsmäsi → tunniste kirjoitetaan
      if (Object.keys(paivitys).length) { batch.update(d.ref, paivitys); n++; }
    });
    if (n) {
      await batch.commit();
      if (statusEl) statusEl.textContent = '✓ Valmis — ' + n + ' pelaajaa päivitetty';
    } else {
      if (statusEl) statusEl.textContent = tmHT('✓ Valmis — ei pelaajia päivitettäväksi');
    }
  } else {
    if (statusEl) statusEl.textContent = tmHT('✓ Joukkueen tiedot tallennettu');
  }

  naytaToast(uusiNimi + ' — tallennettu ✓', 'ok');
  setTimeout(() => {
    document.getElementById('joukkueMuokkausModal')?.classList.remove('auki');
    // Päivitä tila.joukkueet paikallisesti
    const j = (tila.joukkueet||[]).find(j => j.id === joukkueId);
    if (j) { j.nimi = uusiNimi; if (uusiIka) j.ikaryhma = uusiIka; if (uusiVuosi) j.vuosi = uusiVuosi; }
    vaihdaNakyma('joukkueet');
  }, 1200);
}

async function poistaJoukkue(id, nimi) {
  if (!confirm(`Poistetaanko joukkue "${nimi}"? Tämä ei poista joukkueen pelaajia.`)) return;
  try {
    await db.collection('seurat').doc(tila.seuraId)
      .collection('joukkueet').doc(id).delete();
    naytaToast(`Joukkue ${nimi} poistettu.`, 'ok');
  } catch (e) {
    naytaToast((tmHT('Poisto epäonnistui:') + ' ') + e.message, 'virhe');
  }
}

async function lahetaSalasana(email) {
  if (!email) return;
  try {
    await auth.sendPasswordResetEmail(email);
    naytaToast(`Salasanalinkki lähetetty: ${email}`, 'ok');
  } catch (e) {
    naytaToast(tmHT('Lähetys epäonnistui.'), 'virhe');
  }
}

// ── Henkilöstön salasana-reset: generoi linkki (CF lahetaResetLinkki, SA/johto) + 3-nappi-jako ──
window._lahetaSalasanaReset = async function(uid, email, etunimi, suuntakoodi, puhelin) {
  if (!email) { naytaToast(tmHT('Sähköposti puuttuu'), 'virhe'); return; }
  naytaToast(tmHT('🔑 Generoidaan linkkiä...'), 'info');
  try {
    const fn = firebase.app().functions('europe-west1').httpsCallable('lahetaResetLinkki');
    const tulos = await fn({ email: email, seuraId: tila.seuraId });
    const linkki = (tulos.data && (tulos.data.passwordResetLink || tulos.data.resetLinkki)) || null;
    if (!linkki) throw new Error(tmHT('Linkki puuttuu'));
    window._resetLinkki = linkki;
    window._resetEmail = email;
    window._resetEtunimi = etunimi || '';
    // Tallennettu puhelin → suora wa.me/<numero> (muuten yleinen jako)
    const _pRaaka = String(puhelin || '').replace(/\D/g, '');
    const _maa = String(suuntakoodi || '+358').replace('+', '');
    window._resetPuhelin = _pRaaka ? (_maa + _pRaaka.replace(/^0+/, '')) : null;
    document.getElementById('reset-jako-nimi').textContent = etunimi || email;
    document.getElementById('reset-jako-email').textContent = email;
    // Osa 2: kun puhelin on tallennettu → suosittele WhatsAppia (skanneri estää kertakäyttölinkin). Korosta 💬,
    // himmennä 📧. Puhelin puuttuu → ennallaan (yleinen wa.me/?text=). Vain nappien painotus + vihje, ei uutta jakoa.
    (function () {
      var _nudge = document.getElementById('reset-jako-suositus');
      var _wa = document.getElementById('reset-btn-wa');
      var _em = document.getElementById('reset-btn-email');
      var _onPuh = !!window._resetPuhelin;
      if (_nudge) _nudge.style.display = _onPuh ? 'block' : 'none';
      if (_wa) {   // puhelin → WhatsApp ensisijaiseksi (teal-täyttö); muuten ennallaan (vihreä-himmeä)
        _wa.style.cssText = _onPuh
          ? 'background:var(--teal);border-color:var(--teal);color:#fff;font-weight:600'
          : 'background:rgba(37,211,102,.15);border-color:rgba(37,211,102,.4);color:#25d366;';
      }
      if (_em) { _em.classList.toggle('teal', !_onPuh); _em.style.opacity = _onPuh ? '.75' : ''; }   // sähköposti toissijaiseksi kun puhelin on
    })();
    document.getElementById('reset-jako-modal').classList.add('auki');
  } catch (e) {
    naytaToast((tmHT('Reset epäonnistui:') + ' ') + e.message, 'virhe');
  }
};
window._resetJaaSahkoposti = function() {
  if (!window._resetLinkki) return;
  const subject = encodeURIComponent('TalentMaster™ — aseta uusi salasana');
  const body = encodeURIComponent('Hei ' + (window._resetEtunimi || '') + '!\n\n' +
    'Aseta TalentMaster-salasanasi tästä linkistä:\n' + window._resetLinkki);
  window.open('mailto:' + (window._resetEmail || '') + '?subject=' + subject + '&body=' + body, '_blank');
};
window._resetJaaWhatsapp = function() {
  if (!window._resetLinkki) return;
  const teksti = encodeURIComponent('Hei ' + (window._resetEtunimi || '') +
    '! Aseta TalentMaster-salasanasi: ' + window._resetLinkki);
  const url = window._resetPuhelin
    ? 'https://wa.me/' + window._resetPuhelin + '?text=' + teksti
    : 'https://wa.me/?text=' + teksti;
  window.open(url, '_blank');
};
window._resetKopioi = function() {
  if (!window._resetLinkki) return;
  navigator.clipboard.writeText(window._resetLinkki)
    .then(function(){ naytaToast(tmHT('📋 Linkki kopioitu!'), 'ok'); })
    .catch(function(){ naytaToast(tmHT('Kopiointi epäonnistui — kopioi linkki manuaalisesti.'), 'virhe'); });
};

// Salasana-reset henkilöstörivin napista (data-attrs) → välitä puhelin suoraa WhatsApp-jakoa varten
function lahetaSalasanaResetNapista(btn) {
  window._lahetaSalasanaReset(
    btn.getAttribute('data-uid'),
    btn.getAttribute('data-email') || '',
    btn.getAttribute('data-etunimi') || '',
    btn.getAttribute('data-suuntakoodi') || '+358',
    btn.getAttribute('data-puhelin') || ''
  );
}

// ── Henkilön (toimihenkilön) tietojen muokkaus — puhelin ym. kayttajat-dokumenttiin ──
function avaaHenkiloMuokkausNapista(btn) {
  let joukkueet = [];
  try { joukkueet = JSON.parse(btn.getAttribute('data-joukkueet') || '[]'); } catch (e) { joukkueet = []; }
  avaaHenkiloMuokkaus(
    btn.getAttribute('data-uid'),
    btn.getAttribute('data-etunimi') || '',
    btn.getAttribute('data-sukunimi') || '',
    btn.getAttribute('data-email') || '',
    btn.getAttribute('data-suuntakoodi') || '+358',
    btn.getAttribute('data-puhelin') || '',
    btn.getAttribute('data-rooli') || '',
    joukkueet
  );
}
// Jaettu joukkue-checkbox-lista (tila.joukkueet), esivalinta nykyisistä id:istä. Käytetään Muokkaa-dialogissa.
function _renderJoukkueValinta(containerId, nykyisetIds) {
  const lista = document.getElementById(containerId);
  if (!lista) return;
  const valitut = Array.isArray(nykyisetIds) ? nykyisetIds : [];
  const joukkueet = tila.joukkueet || [];
  if (!joukkueet.length) { lista.innerHTML = '<div style="font-size:12px;color:var(--ink3);">' + tmHT('Ei joukkueita — luo joukkueita ensin.') + '</div>'; return; }
  lista.innerHTML = joukkueet.map(j => `
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:6px 4px;border-radius:6px;transition:background .15s;"
      onmouseover="this.style.background='rgba(42,93,176,.06)'" onmouseout="this.style.background='transparent'">
      <input type="checkbox" value="${j.id}" ${valitut.includes(j.id) ? 'checked' : ''}
        style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;flex-shrink:0;">
      <span style="font-size:13px;color:var(--ink2);">${j.nimi || j.id}</span>
    </label>`).join('');
}
// Jaettu: kerää valitut joukkueet checkbox-listasta → Firestore-kentät (uusi + legacy). YKSI tallennuslogiikka.
function _keraaJoukkueKentat(listaSelector) {
  const checkboxes = document.querySelectorAll(listaSelector + ' input[type=checkbox]');
  const valitutIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  const valitutNimet = valitutIds.map(id => { const j = (tila.joukkueet || []).find(x => x.id === id); return (j && j.nimi) || id; });
  return {
    joukkueet: valitutIds,
    joukkueetNimet: valitutNimet,
    joukkue: valitutNimet[0] || valitutIds[0] || null,   // legacy — valmentajan näkymä lukee tätä
    joukkueNimi: valitutNimet[0] || null                 // legacy
  };
}
function avaaHenkiloMuokkaus(uid, etunimi, sukunimi, email, suuntakoodi, puhelin, rooli, joukkueet) {
  let modal = document.getElementById('henkiloMuokkausModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'henkiloMuokkausModal';
    modal.className = 'modalTausta';
    document.body.appendChild(modal);
  }
  const esc = function(s){ return String(s || '').replace(/"/g, '&quot;'); };
  modal.innerHTML =
    '<div class="modalSisalto" style="max-width:440px;">' +
      '<div class="modalOtsikko"><span>' + tmHT('✏️ Muokkaa henkilön tietoja') + '</span>' +
        '<button class="modalSuljeNappi" onclick="document.getElementById(\'henkiloMuokkausModal\').classList.remove(\'auki\')">✕</button></div>' +
      '<div style="padding:20px;">' +
        '<input type="hidden" id="hm_uid" value="' + esc(uid) + '">' +
        '<div class="kenttaRyhma" style="margin-bottom:12px;">' +
          '<label class="kenttaLabel">' + tmHT('Sähköposti (ei muokattavissa)') + '</label>' +
          '<input class="kenttaInput" value="' + esc(email) + '" disabled style="opacity:.6;">' +
        '</div>' +
        '<div class="kenttaRyhma" style="margin-bottom:12px;">' +
          '<label class="kenttaLabel">Rooli</label>' +
          '<input type="hidden" id="hm_rooli_orig" value="' + esc(rooli) + '">' +
          '<select class="kenttaInput" id="muokkaus-rooli">' +
            (function(){ var sallitut=['vp','valmentaja','talenttivalmentaja','urheilutoimenjohtaja','seurasihteeri','testivastaava']; var nimet={vp:tmHT('Valmennuspäällikkö (VP)'),valmentaja:'Valmentaja',talenttivalmentaja:'Talenttivalmentaja',urheilutoimenjohtaja:'Urheilutoimenjohtaja',seurasihteeri:'Seurasihteeri',testivastaava:'Testivastaava',seura_admin:tmHT('Seuran admin')}; var lista=sallitut.slice(); if(rooli && lista.indexOf(rooli)<0) lista.unshift(rooli); /* nykyinen rooli (esim. seura_admin) mukaan → ei vahinkomuutosta */ return lista.map(function(r){ return '<option value="'+r+'"'+(r===rooli?' selected':'')+'>'+(nimet[r]||r)+'</option>'; }).join(''); })() +
          '</select>' +
          '<span style="font-size:11px;color:var(--ink3);">Roolinvaihto päivittää oikeudet (custom claims) ja vaatii käyttäjältä uudelleenkirjautumisen.</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
          '<div class="kenttaRyhma"><label class="kenttaLabel">' + tmHT('Etunimi') + '</label>' +
            '<input id="hm_etunimi" class="kenttaInput" value="' + esc(etunimi) + '"></div>' +
          '<div class="kenttaRyhma"><label class="kenttaLabel">' + tmHT('Sukunimi') + '</label>' +
            '<input id="hm_sukunimi" class="kenttaInput" value="' + esc(sukunimi) + '"></div>' +
        '</div>' +
        '<div class="kenttaRyhma" style="margin-bottom:8px;">' +
          '<label class="kenttaLabel">Puhelinnumero (WhatsApp)</label>' +
          '<div style="display:flex;gap:8px;">' +
            '<select class="kenttaInput" id="hm_suunta" style="max-width:90px;">' +
              '<option value="+358">🇫🇮 +358</option><option value="+46">🇸🇪 +46</option>' +
              '<option value="+47">🇳🇴 +47</option><option value="+45">🇩🇰 +45</option>' +
              '<option value="+372">🇪🇪 +372</option></select>' +
            '<input class="kenttaInput" type="tel" id="hm_puhelin" value="' + esc(puhelin) + '" placeholder="40 123 4567" style="flex:1;"></div>' +
          '<span style="font-size:11px;color:var(--ink3);">Mahdollistaa WhatsApp-jaon suoraan numeroon (kutsu + salasanalinkki).</span>' +
        '</div>' +
        '<div class="kenttaRyhma" style="margin-bottom:8px;">' +
          '<label class="kenttaLabel">' + tmHT('Joukkueet joita valmentaa') + '</label>' +
          '<div id="hm_joukkueet_lista" style="display:flex;flex-direction:column;gap:8px;background:var(--bg3);border:1px solid var(--bord2);border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;"></div>' +
          '<span style="font-size:11px;color:var(--ink3);">' + tmHT('Rastita kaikki joukkueet joita henkilö vetää. Tallentuu heti — ei vaadi uudelleenkirjautumista.') + '</span>' +
        '</div>' +
        '<div id="hm_status" style="font-size:12px;color:var(--ink3);margin:8px 0;min-height:16px;"></div>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button class="toimNappi" onclick="document.getElementById(\'henkiloMuokkausModal\').classList.remove(\'auki\')">' + tmHT('Peruuta') + '</button>' +
          '<button class="toimNappi sininen" style="font-weight:700;" onclick="tallennaHenkiloMuutos()">' + tmHT('💾 Tallenna') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  modal.classList.add('auki');
  const sel = document.getElementById('hm_suunta');
  if (sel) sel.value = suuntakoodi || '+358';
  _renderJoukkueValinta('hm_joukkueet_lista', joukkueet || []);   // esivalinta henkilön nykyisistä joukkueista
  setTimeout(function(){ const e = document.getElementById('hm_puhelin'); if (e) e.focus(); }, 100);
}
async function tallennaHenkiloMuutos() {
  const uid = document.getElementById('hm_uid') && document.getElementById('hm_uid').value;
  if (!uid) return;
  const etunimi     = (document.getElementById('hm_etunimi').value || '').trim();
  const sukunimi    = (document.getElementById('hm_sukunimi').value || '').trim();
  const suuntakoodi = document.getElementById('hm_suunta').value || '+358';
  const puhelin     = (document.getElementById('hm_puhelin').value || '').replace(/[^\d]/g, '');
  const status = document.getElementById('hm_status');
  if (status) status.textContent = 'Tallennetaan...';
  try {
    // Joukkueet + yhteystiedot samaan set-merge-kirjoitukseen (Rules sallii johdolle ei-rooli/seuraId-kentät).
    // Joukkuejäsenyys EI ole custom claimseissa → ei vaadi uudelleenkirjautumista (vain rooli vaatii, CF alla).
    const jk = _keraaJoukkueKentat('#hm_joukkueet_lista');
    await db.collection('seurat').doc(tila.seuraId).collection('kayttajat').doc(uid)
      .set({ etunimi: etunimi, sukunimi: sukunimi, suuntakoodi: suuntakoodi, puhelin: puhelin,
             joukkueet: jk.joukkueet, joukkueetNimet: jk.joukkueetNimet, joukkue: jk.joukkue, joukkueNimi: jk.joukkueNimi,
             muokattu: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    // OSA 2 — roolinvaihto AINA vaihdaKayttajanRooli-CF:n kautta (Firestore + claims + revoke).
    // Suora Firestore-kirjoitus EI päivitä Rules-oikeuksia (CLAUDE.md: roolinvaihto-invariantit).
    const uusiRooli = (document.getElementById('muokkaus-rooli') || {}).value;
    const origRooli = (document.getElementById('hm_rooli_orig') || {}).value;
    if (uusiRooli && uusiRooli !== origRooli) {
      const fn = firebase.app().functions('europe-west1').httpsCallable('vaihdaKayttajanRooli');
      const tulos = await fn({ uid: uid, seuraId: tila.seuraId, uusiRooli: uusiRooli });
      naytaToast((tulos.data && tulos.data.huomio) || ('Rooli vaihdettu: ' + uusiRooli), 'ok');
    } else {
      naytaToast(tmHT('Henkilön tiedot tallennettu'), 'ok');
    }
    document.getElementById('henkiloMuokkausModal').classList.remove('auki');
    renderHenkilosto(document.getElementById('nakymaAlue'));
  } catch (e) {
    if (status) status.textContent = 'Virhe: ' + e.message;
    naytaToast((tmHT('Tallennus epäonnistui:') + ' ') + e.message, 'virhe');
  }
}


/* P0 (1.10.2026): deaktivointi ja aktivointi VAIN palvelimella. Selaimen aktiivinen-kirjoitus ei estänyt
   kirjautumista (Rules lukevat claimeja) — callable estää Auth-tilin, tyhjentää claimit ja mitätöi tokenit. */
function deaktivoiKayttajaNapista(btn) { return deaktivoiKayttaja(btn.dataset.uid, btn.dataset.email || ''); }
function aktivoiKayttajaNapista(btn) { return aktivoiKayttaja(btn.dataset.uid, btn.dataset.email || ''); }
async function deaktivoiKayttaja(uid, email) {
  if (!confirm(`Deaktivoidaanko ${email || 'käyttäjä'}?\n\nKirjautuminen estetään heti ja oikeudet poistetaan. Auki oleva istunto menettää pääsyn viimeistään tunnin kuluessa. Tiedot säilyvät.`)) return;
  try {
    await firebase.app().functions('europe-west1').httpsCallable('deaktivioiKayttaja')({ kohdeUid: uid, seuraId: tila.seuraId });
    naytaToast(`${email || 'Käyttäjä'} deaktivoitu.`, 'ok');
    await renderHenkilosto(document.getElementById('nakymaAlue'));
  } catch (e) {
    naytaToast((tmHT('Deaktivointi epäonnistui:') + ' ') + e.message, 'virhe');
  }
}
async function aktivoiKayttaja(uid, email) {
  if (!confirm(`Aktivoidaanko ${email || 'käyttäjä'} uudelleen?\n\nKirjautuminen sallitaan ja oikeudet palautetaan nykyisen roolin mukaan.`)) return;
  try {
    await firebase.app().functions('europe-west1').httpsCallable('aktivoiKayttaja')({ kohdeUid: uid, seuraId: tila.seuraId });
    naytaToast(`${email || 'Käyttäjä'} aktivoitu.`, 'ok');
    await renderHenkilosto(document.getElementById('nakymaAlue'));
  } catch (e) {
    naytaToast((tmHT('Aktivointi epäonnistui:') + ' ') + e.message, 'virhe');
  }
}

// ─────────────────────────────────────────────────────────────────
// JOUKKUEEN VAIHTO HENKILÖLLE
// PERMISSION_MATRIX: VP ja super-admin voivat muokata käyttäjien tietoja
// ─────────────────────────────────────────────────────────────────
// Henkilön joukkuevalinta on yhdistetty "Muokkaa henkilön tietoja" -dialogiin (avaaHenkiloMuokkaus +
// _renderJoukkueValinta + _keraaJoukkueKentat + tallennaHenkiloMuutos). Erillinen avaaJoukkueMuutos/
// tallennaJoukkueMuutos()-pari + #joukkueMuutosModal poistettu → yksi jaettu tallennuslogiikka.
// (Sivuvaikutus: nimikonflikti team-rename tallennaJoukkueMuutos(joukkueId,vanhanimi):n kanssa poistui.)
// Joukkuejäsenyys EI ole custom claimseissa → suora Firestore-kirjoitus, ei uudelleenkirjautumista (vain rooli vaatii).
