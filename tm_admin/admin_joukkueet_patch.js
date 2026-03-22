<!-- ============================================================
     TALENTMASTER — SEURAN ADMIN + JOUKKUEHALLINTA PATCH
     Versio: 1.0  |  2026-03-22

     OHJEET LISÄÄMISEEN TalentMaster_Admin.html:ään:

     MUUTOS 1 — Lisää kirjautumislogiikkaan Seuran Admin -tunnistus.
     Etsi kohta jossa tarkistetaan onko käyttäjä Super Admin.
     Lisää sen rinnalle:

       // Seuran Admin -tunnistus
       _fbDb.collection('seurat').get().then(function(snap) {
         snap.forEach(function(doc) {
           var k = doc.ref.collection('kayttajat').doc(_fbUser.uid).get();
           k.then(function(kdoc) {
             if (kdoc.exists && kdoc.data().rooli === 'seuran_admin') {
               _seuranAdminSeuraId = doc.id;
               initAdmin('seuran_admin');
             }
           });
         });
       });

     MUUTOS 2 — Lisää "Joukkueet"-välilehti navigaatioon.

     MUUTOS 3 — Lisää alla oleva HTML + JavaScript Admin-tiedostoon.
     ============================================================ -->

<script>
// ============================================================
// SEURAN ADMIN -ROOLI JA JOUKKUEHALLINTA
// Lisätään TalentMaster_Admin.html:n </script>-tagin sisälle
// ============================================================

// Seuran Admin -istuntomuuttuja
// Asetetaan kun kirjautunut käyttäjä tunnistetaan Seuran Adminiksi
var _seuranAdminSeuraId = null;  // esim. "kpv"
var _seuranAdminRooli = null;    // "super_admin" | "seuran_admin"

// ── JOUKKUEHALLINTA — PÄÄFUNKTIO ─────────────────────────────────────────────

/**
 * Renderöi joukkueiden hallintanäkymän.
 * Hakee Firestoresta kaikki seuran joukkueet ja näyttää ne kortteina.
 * Tarjoaa lomakkeen uuden joukkueen luomiseen.
 */
function renderJoukkueet(seuraId) {
  var el = document.getElementById('tabJoukkueet');
  if (!el) return;

  var h = '';

  // Otsikko + lisäyspainike
  h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  h += '<div>';
  h += '<div style="font-family:\'Bebas Neue\';font-size:22px">Joukkueet</div>';
  h += '<div style="font-size:12px;color:var(--muted)">Luo joukkueet ennen pelaajien tuontia. '
     + 'Pelaaja kiinnittyy joukkueeseen joukkueId:n perusteella.</div>';
  h += '</div>';
  h += '<button onclick="avaaUusiJoukkueLomake(\'' + seuraId + '\')" '
     + 'style="background:var(--teal);color:var(--bg);border:none;border-radius:8px;'
     + 'padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">+ Uusi joukkue</button>';
  h += '</div>';

  // Uuden joukkueen lomake (piilotettu oletuksena)
  h += '<div id="uusiJoukkueLomake" style="display:none;background:var(--card);'
     + 'border:1px solid var(--teal);border-radius:12px;padding:16px;margin-bottom:16px">';
  h += '<div style="font-weight:600;font-size:14px;margin-bottom:12px">Luo uusi joukkue</div>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">';

  // Joukkueen nimi
  h += adminKenttä('Joukkueen nimi *', '<input id="jq_nimi" type="text" placeholder="esim. KPV U15" '
     + adminInputStyle() + '>');

  // Ikäluokka
  h += adminKenttä('Ikäluokka *',
    '<select id="jq_ikl" ' + adminInputStyle() + '>'
    + ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','U19','U20','Edustus']
      .map(function(v) { return '<option value="' + v + '">' + v + '</option>'; }).join('')
    + '</select>');

  // Sukupuoli
  h += adminKenttä('Sukupuoli',
    '<select id="jq_sp" ' + adminInputStyle() + '>'
    + '<option value="P">Pojat</option>'
    + '<option value="T">Tytöt</option>'
    + '<option value="seka">Sekajoukkue</option>'
    + '</select>');

  // Kausi
  h += adminKenttä('Kausi',
    '<select id="jq_kausi" ' + adminInputStyle() + '>'
    + ['2026','2027','2028'].map(function(v) {
        return '<option value="' + v + '">' + v + '</option>';
      }).join('')
    + '</select>');

  h += '</div>';

  // Painikkeet
  h += '<div style="display:flex;gap:8px">';
  h += '<button onclick="suljeUusiJoukkueLomake()" '
     + 'style="flex:1;background:var(--bg3);color:var(--muted);border:1px solid var(--border);'
     + 'border-radius:8px;padding:10px;cursor:pointer">Peruuta</button>';
  h += '<button onclick="tallennaJoukkue(\'' + seuraId + '\')" '
     + 'id="jqTallennaNappi" '
     + 'style="flex:2;background:var(--teal);color:var(--bg);border:none;'
     + 'border-radius:8px;padding:10px;font-weight:600;cursor:pointer">Luo joukkue</button>';
  h += '</div>';
  h += '</div>';

  // Joukkuelista
  h += '<div id="joukkueLista"><div style="color:var(--muted);padding:20px;text-align:center">'
     + 'Ladataan joukkueita...</div></div>';

  el.innerHTML = h;

  // Haetaan joukkueet Firestoresta
  lataaJoukkueet(seuraId);
}

// ── JOUKKUELISTAN LATAUS ──────────────────────────────────────────────────────

function lataaJoukkueet(seuraId) {
  if (!_fbDb) return;

  _fbDb.collection('seurat').doc(seuraId)
    .collection('joukkueet')
    .orderBy('ikäluokka')
    .get()
    .then(function(snap) {
      var listaEl = document.getElementById('joukkueLista');
      if (!listaEl) return;

      if (snap.empty) {
        listaEl.innerHTML = '<div style="background:var(--card);border:1px dashed var(--border);'
          + 'border-radius:10px;padding:32px;text-align:center;color:var(--muted)">'
          + '<div style="font-size:32px;margin-bottom:8px">🏟️</div>'
          + '<div style="font-weight:600;margin-bottom:4px">Ei vielä joukkueita</div>'
          + '<div style="font-size:12px">Luo joukkueet ennen kuin tuot pelaajia. '
          + 'Pelaaja tarvitsee joukkueen johon kiinnittyä.</div>'
          + '</div>';
        return;
      }

      // Ryhmitellään ikäluokan mukaan
      var ryhmät = {};
      snap.forEach(function(doc) {
        var d = doc.data();
        d._id = doc.id;
        var ikl = d.ikäluokka || '?';
        if (!ryhmät[ikl]) ryhmät[ikl] = [];
        ryhmät[ikl].push(d);
      });

      var out = '<div style="display:grid;gap:8px">';
      Object.keys(ryhmät).sort().forEach(function(ikl) {
        out += '<div style="font-size:11px;font-weight:600;color:var(--muted);'
             + 'text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">'
             + ikl + ' — ' + ryhmät[ikl].length + ' joukkuetta</div>';

        ryhmät[ikl].forEach(function(j) {
          var spTeksti = j.sukupuoli === 'T' ? '♀' : j.sukupuoli === 'P' ? '♂' : '⚥';
          var pelLkm = j.pelaajaMaara || 0;
          var valLkm = (j.valmentajat || []).length;

          out += '<div style="background:var(--card);border:1px solid var(--border);'
               + 'border-radius:10px;padding:12px;display:flex;align-items:center;'
               + 'justify-content:space-between">';

          // Vasemmalla: nimi ja metatiedot
          out += '<div>';
          out += '<div style="font-weight:600;font-size:13px">' + j.nimi + '</div>';
          out += '<div style="font-size:11px;color:var(--muted);margin-top:3px">';
          out += spTeksti + ' · Kausi ' + (j.kausi || '—') + ' · ';
          out += '<span style="color:var(--teal)">' + pelLkm + ' pelaajaa</span> · ';
          out += valLkm + ' valmentajaa';
          out += '</div>';
          out += '</div>';

          // Oikealla: toimintopainikkeet
          out += '<div style="display:flex;gap:6px">';
          out += '<button onclick="muokkaaJoukkuetta(\'' + seuraId + '\',\'' + j._id + '\')" '
               + 'style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;'
               + 'color:var(--muted);padding:6px 10px;font-size:11px;cursor:pointer">✏️ Muokkaa</button>';
          out += '<button onclick="poistaJoukkue(\'' + seuraId + '\',\'' + j._id + '\',\'' + j.nimi + '\')" '
               + 'style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;'
               + 'color:var(--red);padding:6px 10px;font-size:11px;cursor:pointer">🗑</button>';
          out += '</div>';

          out += '</div>';
        });
      });
      out += '</div>';

      listaEl.innerHTML = out;
    })
    .catch(function(err) {
      document.getElementById('joukkueLista').innerHTML =
        '<div style="color:var(--red);padding:16px">Virhe ladattaessa: ' + err.message + '</div>';
    });
}

// ── JOUKKUEEN LUOMINEN ────────────────────────────────────────────────────────

function avaaUusiJoukkueLomake(seuraId) {
  document.getElementById('uusiJoukkueLomake').style.display = 'block';
  document.getElementById('jq_nimi').focus();
}

function suljeUusiJoukkueLomake() {
  document.getElementById('uusiJoukkueLomake').style.display = 'none';
  // Nollataan lomake
  ['jq_nimi'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function tallennaJoukkue(seuraId) {
  var nimi    = (document.getElementById('jq_nimi').value || '').trim();
  var ikl     = document.getElementById('jq_ikl').value;
  var sp      = document.getElementById('jq_sp').value;
  var kausi   = document.getElementById('jq_kausi').value;

  if (!nimi) {
    alert('Syötä joukkueen nimi.');
    document.getElementById('jq_nimi').focus();
    return;
  }

  var nappi = document.getElementById('jqTallennaNappi');
  if (nappi) { nappi.disabled = true; nappi.textContent = 'Luodaan...'; }

  // Generoidaan joukkueId automaattisesti nimestä:
  // "KPV U15" → "kpv_u15", "FC Lahti T12" → "fc_lahti_t12"
  var joukkueId = nimi.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_äöå]/g, '')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/å/g, 'a');

  var doc = {
    nimi:          nimi,
    ikäluokka:     ikl,
    sukupuoli:     sp,
    kausi:         kausi,
    valmentajat:   [],
    pelaajaMaara:  0,
    aktiivinen:    true,
    luotu:         firebase.firestore.FieldValue.serverTimestamp(),
    luonutUid:     (_fbUser && _fbUser.uid) || 'admin'
  };

  // Tarkistetaan ensin ettei sama joukkueId ole jo olemassa
  var ref = _fbDb.collection('seurat').doc(seuraId)
                 .collection('joukkueet').doc(joukkueId);

  ref.get().then(function(snap) {
    if (snap.exists) {
      // Jos ID on jo käytössä, lisätään kausi loppuun
      joukkueId = joukkueId + '_' + kausi;
      ref = _fbDb.collection('seurat').doc(seuraId)
                 .collection('joukkueet').doc(joukkueId);
    }
    return ref.set(doc);
  })
  .then(function() {
    console.log('[ADMIN] Joukkue luotu:', joukkueId);
    suljeUusiJoukkueLomake();
    lataaJoukkueet(seuraId);
    adminNaytaToast('✅ Joukkue "' + nimi + '" luotu!');
  })
  .catch(function(err) {
    console.error('[ADMIN] Joukkueen luonti epäonnistui:', err);
    alert('Virhe: ' + err.message);
  })
  .finally(function() {
    if (nappi) { nappi.disabled = false; nappi.textContent = 'Luo joukkue'; }
  });
}

// ── JOUKKUEEN POISTAMINEN ─────────────────────────────────────────────────────

function poistaJoukkue(seuraId, joukkueId, nimi) {
  // Tarkistetaan ensin onko joukkueessa pelaajia
  _fbDb.collection('seurat').doc(seuraId)
       .collection('pelaajat')
       .where('joukkueId', '==', joukkueId)
       .limit(1)
       .get()
       .then(function(snap) {
         if (!snap.empty) {
           alert('Joukkuetta "' + nimi + '" ei voi poistaa koska siihen on kiinnitetty pelaajia. '
               + 'Siirrä tai poista pelaajat ensin.');
           return;
         }

         if (!confirm('Poistetaanko joukkue "' + nimi + '"? Tätä ei voi perua.')) return;

         _fbDb.collection('seurat').doc(seuraId)
              .collection('joukkueet').doc(joukkueId)
              .delete()
              .then(function() {
                lataaJoukkueet(seuraId);
                adminNaytaToast('🗑 Joukkue "' + nimi + '" poistettu.');
              });
       });
}

// ── JOUKKUEEN MUOKKAAMINEN ────────────────────────────────────────────────────

function muokkaaJoukkuetta(seuraId, joukkueId) {
  _fbDb.collection('seurat').doc(seuraId)
       .collection('joukkueet').doc(joukkueId)
       .get()
       .then(function(snap) {
         if (!snap.exists) return;
         var d = snap.data();

         var uusiNimi = prompt('Joukkueen nimi:', d.nimi);
         if (!uusiNimi || !uusiNimi.trim()) return;

         _fbDb.collection('seurat').doc(seuraId)
              .collection('joukkueet').doc(joukkueId)
              .update({
                nimi: uusiNimi.trim(),
                muokattu: firebase.firestore.FieldValue.serverTimestamp()
              })
              .then(function() {
                lataaJoukkueet(seuraId);
                adminNaytaToast('✅ Joukkue päivitetty.');
              });
       });
}

// ── SEURAN ADMIN -KÄYTTÄJÄN LUOMINEN ─────────────────────────────────────────

/**
 * Luo Seuran Admin -käyttäjäroolin Firestoreen.
 * Kutsutaan kun Super Admin haluaa antaa jollekin hallinnollisen roolin.
 * Firebase Auth -tunnus luodaan erikseen (Firebase Console tai Admin SDK).
 */
function luoSeuranAdmin(seuraId, uid, email, nimi) {
  if (!_fbDb) return Promise.reject('Ei Firebase-yhteyttä');

  var doc = {
    uid:        uid,
    email:      email,
    nimi:       nimi || email,
    rooli:      'seuran_admin',
    seuraId:    seuraId,
    luotu:      firebase.firestore.FieldValue.serverTimestamp(),
    aktiivinen: true
  };

  return _fbDb.collection('seurat').doc(seuraId)
              .collection('kayttajat').doc(uid)
              .set(doc, { merge: true });
}

// ── APUFUNKTIOT ───────────────────────────────────────────────────────────────

function adminInputStyle() {
  return 'style="width:100%;background:var(--bg);border:1px solid var(--border);'
       + 'border-radius:8px;color:var(--text);padding:10px 12px;font-size:13px;'
       + 'font-family:\'DM Sans\'"';
}

function adminKenttä(label, kenttä) {
  return '<div>'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:500">'
    + label + '</div>' + kenttä + '</div>';
}

function adminNaytaToast(viesti) {
  var toast = document.createElement('div');
  toast.textContent = viesti;
  toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);'
    + 'background:var(--bg2);border:1px solid var(--teal);border-radius:10px;'
    + 'padding:12px 20px;font-size:13px;color:var(--teal);z-index:9999;'
    + 'white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.5)';
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}
</script>
