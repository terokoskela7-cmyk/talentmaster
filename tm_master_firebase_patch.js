/**
 * TalentMaster™ — Master v7 Firebase Auth Patch
 * 
 * INTEGRAATIO-OHJEET:
 * 1. Lisää tämä script ENNEN muita Master v7 -skriptejä <head>-osioon
 * 2. Lisää Firebase SDK -importit (ks. alla)
 * 3. Lisää kirjautumislomake HTML:ään (ks. alla)
 * 4. Kutsu patchMasterV7() sivun latautuessa
 * 
 * Tiedosto: tm_master_firebase_patch.js
 * Versio: 1.0.0
 * Päivitetty: 2026-03-26
 */

// ============================================================
// FIREBASE CONFIG (sama kuin VP v17 ja Admin)
// ============================================================
const TM_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};

// ============================================================
// GLOBAALIT TILA-MUUTTUJAT
// ============================================================
window.TM = window.TM || {};
window.TM.auth = {
  user: null,           // Firebase user object
  kayttaja: null,       // Firestore kayttaja-dokumentti
  seura: null,          // Firestore seura-dokumentti
  seuraId: null,        // esim. "kpv"
  rooli: null,          // "valmentaja" | "vp" | "superadmin"
  joukkueet: [],        // valmentajan joukkueet: ["U13P", "U15T"]
  kirjautumistapa: null // "email" | "pin"
};

// ============================================================
// FIREBASE ALUSTUS
// ============================================================
function tmInitFirebase() {
  // Varmista ettei alusteta kahteen kertaan
  if (window._tmFirebaseApp) return window._tmFirebaseApp;
  
  try {
    if (firebase.apps && firebase.apps.length > 0) {
      window._tmFirebaseApp = firebase.apps[0];
    } else {
      window._tmFirebaseApp = firebase.initializeApp(TM_FIREBASE_CONFIG);
    }
    window._tmDb = firebase.firestore();
    window._tmAuthService = firebase.auth();
    console.log('[TM Patch] Firebase alustettu ✓');
    return window._tmFirebaseApp;
  } catch (e) {
    console.error('[TM Patch] Firebase alustus epäonnistui:', e);
    return null;
  }
}

// ============================================================
// KIRJAUTUMINEN SÄHKÖPOSTILLA
// ============================================================
async function tmKirjauduSahkopostilla(email, salasana) {
  const db = window._tmDb;
  const auth = window._tmAuthService;
  
  try {
    tmNaytaLataus('Kirjaudutaan...');
    
    // 1. Firebase Auth
    const userCredential = await auth.signInWithEmailAndPassword(email, salasana);
    const user = userCredential.user;
    
    // 2. Hae käyttäjäprofiili Firestoresta
    // Ensin tarkista onko super-admin
    const adminDoc = await db.collection('admins').doc(user.uid).get();
    if (adminDoc.exists && adminDoc.data().superAdmin) {
      window.TM.auth.user = user;
      window.TM.auth.rooli = 'superadmin';
      window.TM.auth.kirjautumistapa = 'email';
      tmPiilotaKirjautumisLomake();
      tmNaytaViesti('✅ Super Admin kirjautunut');
      tmLataaSuperAdminNakyma();
      return;
    }

    // Hae käyttäjä seuran kauttajarekisteristä
    // Käydään läpi kaikki seurat (max 6 pilottia — ei iso operaatio)
    const seurat = ['fcl', 'kpv', 'palloiirot', 'yvies', 'sjk', 'grifk'];
    let loydettyKayttaja = null;
    let loydettySeuraId = null;
    let loydettySeura = null;

    for (const seuraId of seurat) {
      const kayttajaDoc = await db
        .collection('seurat').doc(seuraId)
        .collection('kayttajat').doc(user.uid)
        .get();
      
      if (kayttajaDoc.exists) {
        loydettyKayttaja = kayttajaDoc.data();
        loydettySeuraId = seuraId;
        
        // Hae myös seura-dokumentti
        const seuraDoc = await db.collection('seurat').doc(seuraId).get();
        if (seuraDoc.exists) {
          loydettySeura = seuraDoc.data();
        }
        break;
      }
    }

    // Fallback: tarkista VP-taso (vp_uid seuradokumentissa)
    if (!loydettyKayttaja) {
      for (const seuraId of seurat) {
        const seuraDoc = await db.collection('seurat').doc(seuraId).get();
        if (seuraDoc.exists && seuraDoc.data().vp_uid === user.uid) {
          loydettyKayttaja = { rooli: 'vp', nimi: email };
          loydettySeuraId = seuraId;
          loydettySeura = seuraDoc.data();
          break;
        }
      }
    }

    if (!loydettyKayttaja) {
      await auth.signOut();
      tmNaytaVirhe('Käyttäjää ei löydy järjestelmästä. Ota yhteyttä VP:hen.');
      return;
    }

    // 3. Tallenna tila
    window.TM.auth.user = user;
    window.TM.auth.kayttaja = loydettyKayttaja;
    window.TM.auth.seura = loydettySeura;
    window.TM.auth.seuraId = loydettySeuraId;
    window.TM.auth.rooli = loydettyKayttaja.rooli || 'valmentaja';
    window.TM.auth.joukkueet = loydettyKayttaja.joukkueet || [];
    window.TM.auth.kirjautumistapa = 'email';

    // 4. Synkronoi Master v7:n odottamat globaalit muuttujat
    tmSynkronoiGlobaalit(loydettySeuraId, loydettyKayttaja, loydettySeura);

    // 5. Jatka normaaliin Master v7 -näkymään
    tmPiilotaKirjautumisLomake();
    tmNaytaViesti(`✅ Kirjautunut: ${loydettyKayttaja.nimi || email}`);
    
    // Käynnistä Master v7:n oma init (jos se odottaa kirjautumista)
    if (typeof window.tmOnValmentajaKirjautunut === 'function') {
      window.tmOnValmentajaKirjautunut(window.TM.auth);
    } else {
      // Fallback: lataa pelaajat joukkueen mukaan
      await tmHaeJoukkuePelaajat();
    }

  } catch (error) {
    tmNaytaLataus(''); // piilota latausindikaattori
    console.error('[TM Patch] Kirjautumisvirhe:', error);
    
    const virhekoodit = {
      'auth/user-not-found': 'Sähköpostia ei löydy.',
      'auth/wrong-password': 'Väärä salasana.',
      'auth/invalid-email': 'Virheellinen sähköpostiosoite.',
      'auth/too-many-requests': 'Liian monta yritystä. Odota hetki.',
      'auth/network-request-failed': 'Verkkoyhteysongelma. Tarkista internet.',
      'auth/invalid-credential': 'Väärä sähköposti tai salasana.'
    };
    
    tmNaytaVirhe(virhekoodit[error.code] || `Kirjautuminen epäonnistui: ${error.message}`);
  }
}

// ============================================================
// ULOSKIRJAUTUMINEN
// ============================================================
async function tmKirjauduUlos() {
  try {
    if (window._tmAuthService) {
      await window._tmAuthService.signOut();
    }
    // Nollaa tila
    window.TM.auth = {
      user: null, kayttaja: null, seura: null, seuraId: null,
      rooli: null, joukkueet: [], kirjautumistapa: null
    };
    // Palauta kirjautumislomake
    tmNaytaKirjautumisLomake();
    // Tyhjennä sessio
    localStorage.removeItem('tm_valmentaja_session');
    console.log('[TM Patch] Kirjauduttu ulos');
  } catch (e) {
    console.error('[TM Patch] Uloskirjautumisvirhe:', e);
  }
}

// ============================================================
// GLOBAALIEN SYNKRONOINTI (Master v7 odottaa tiettyjä muuttujia)
// ============================================================
function tmSynkronoiGlobaalit(seuraId, kayttaja, seura) {
  // Master v7 käyttää näitä muuttujia PIN-kirjautumisesta
  // Täytetään ne Firebase-datalla jotta muut funktiot toimivat
  
  // Seuran nimi
  if (seura) {
    window.valittuSeura = seura.nimi || seuraId.toUpperCase();
    window.valittuSeuraId = seuraId;
  }
  
  // Valmentajan tiedot
  window.kirjautunutKayttaja = {
    uid: window.TM.auth.user?.uid,
    email: window.TM.auth.user?.email,
    nimi: kayttaja.nimi || kayttaja.email || '',
    rooli: kayttaja.rooli || 'valmentaja',
    seura: seuraId,
    joukkueet: kayttaja.joukkueet || [],
    kirjautumistapa: 'email'
  };

  // localStorage-yhteensopivuus (offline-tuki)
  localStorage.setItem('tm_valmentaja_session', JSON.stringify({
    ...window.kirjautunutKayttaja,
    timestamp: Date.now()
  }));

  console.log('[TM Patch] Globaalit synkronoitu:', window.kirjautunutKayttaja);
}

// ============================================================
// PELAAJADATA FIRESTORESTA (korvaa / täydentää tm_data.js:ää)
// ============================================================
async function tmHaeJoukkuePelaajat(joukkueFilter) {
  const db = window._tmDb;
  const auth = window.TM.auth;
  
  if (!db || !auth.seuraId) {
    console.warn('[TM Patch] Ei tietokantayhteyttä tai seuraa');
    return [];
  }

  try {
    // Päätä joukkuesuodatin
    const joukkueet = joukkueFilter 
      ? [joukkueFilter]
      : (auth.joukkueet.length > 0 ? auth.joukkueet : null);

    let pelaajat = [];
    const seuraRef = db.collection('seurat').doc(auth.seuraId);

    if (joukkueet && joukkueet.length > 0) {
      // Hae per joukkue (valmentajan omat joukkueet)
      for (const joukkue of joukkueet) {
        const snap = await seuraRef
          .collection('pelaajat')
          .where('joukkue', '==', joukkue)
          .where('aktiivinen', '==', true)
          .get();
        snap.forEach(doc => pelaajat.push({ id: doc.id, ...doc.data() }));
      }
    } else if (auth.rooli === 'vp' || auth.rooli === 'superadmin') {
      // VP ja super-admin näkevät kaikki
      const snap = await seuraRef.collection('pelaajat')
        .where('aktiivinen', '==', true).get();
      snap.forEach(doc => pelaajat.push({ id: doc.id, ...doc.data() }));
    }

    // Tallenna globaaliin tilaan jotta Master v7:n funktiot löytävät datan
    window.TM.pelaajat = pelaajat;
    
    // Laukaise Master v7:n päivitystapahtuma jos se tukee sitä
    document.dispatchEvent(new CustomEvent('tm:pelaajatLadattu', { 
      detail: { pelaajat, seuraId: auth.seuraId } 
    }));

    console.log(`[TM Patch] Ladattu ${pelaajat.length} pelaajaa Firestoresta`);
    return pelaajat;
    
  } catch (e) {
    console.error('[TM Patch] Pelaajahaku epäonnistui:', e);
    return [];
  }
}

// ============================================================
// KIRJAUKSEN TALLENNUS FIRESTOREEN (plus localStorage)
// ============================================================
async function tmTallennaPlusMerkinta(kirjausData) {
  const db = window._tmDb;
  const auth = window.TM.auth;

  // 1. LocalStorage ensin (offline-tuki — sama kuin ennen)
  try {
    const key = `kirjaukset_${auth.seuraId || 'demo'}`;
    const vanhat = JSON.parse(localStorage.getItem(key) || '[]');
    const uusiKirjaus = {
      ...kirjausData,
      id: `local_${Date.now()}`,
      timestamp: Date.now(),
      tekija_uid: auth.user?.uid || 'pin',
      tekija_nimi: auth.kayttaja?.nimi || window.kirjautunutKayttaja?.nimi || 'Valmentaja',
      kirjautumistapa: auth.kirjautumistapa || 'pin',
      synkronoitu: false
    };
    vanhat.push(uusiKirjaus);
    localStorage.setItem(key, JSON.stringify(vanhat));
  } catch (e) {
    console.warn('[TM Patch] localStorage-tallennus epäonnistui:', e);
  }

  // 2. Firebase (jos kirjautunut sähköpostilla)
  if (!db || !auth.seuraId || auth.kirjautumistapa !== 'email') {
    return true; // localStorage riittää PIN-käytössä
  }

  try {
    const kirjausRef = db
      .collection('seurat').doc(auth.seuraId)
      .collection('kirjaukset');

    const firestoreData = {
      ...kirjausData,
      tekija_uid: auth.user.uid,
      tekija_nimi: auth.kayttaja?.nimi || auth.user.email,
      tekija_rooli: auth.rooli,
      seuraId: auth.seuraId,
      luotu: firebase.firestore.FieldValue.serverTimestamp(),
      paivitetty: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await kirjausRef.add(firestoreData);
    
    // Merkitse localStorage-kirjaus synkronoiduksi
    tmMerkitseSynkronoiduksi(auth.seuraId, docRef.id);
    
    console.log(`[TM Patch] Kirjaus tallennettu Firestoreen: ${docRef.id}`);
    return docRef.id;
    
  } catch (e) {
    console.error('[TM Patch] Firestore-tallennus epäonnistui:', e);
    // localStorage-versio on jo tallennettu — ei hätää
    return false;
  }
}

function tmMerkitseSynkronoiduksi(seuraId, firestoreId) {
  try {
    const key = `kirjaukset_${seuraId}`;
    const kirjaukset = JSON.parse(localStorage.getItem(key) || '[]');
    // Merkitään viimeisin synkronoiduksi
    if (kirjaukset.length > 0) {
      kirjaukset[kirjaukset.length - 1].synkronoitu = true;
      kirjaukset[kirjaukset.length - 1].firestoreId = firestoreId;
      localStorage.setItem(key, JSON.stringify(kirjaukset));
    }
  } catch (e) {}
}

// ============================================================
// onAuthStateChanged — SESSIOPERSISTENSSI
// ============================================================
function tmKuunteleAuthTilaa() {
  if (!window._tmAuthService) return;
  
  let _kirjautuminenKesken = false; // Estetään silmukat
  
  window._tmAuthService.onAuthStateChanged(async (user) => {
    if (_kirjautuminenKesken) return;
    
    if (user) {
      // Käyttäjä on kirjautunut (esim. sivun päivitys)
      if (window.TM.auth.user?.uid === user.uid) return; // Jo asetettu
      
      _kirjautuminenKesken = true;
      console.log('[TM Patch] Auth tila: kirjautunut', user.email);
      
      // Palauta sessio
      try {
        const sessio = localStorage.getItem('tm_valmentaja_session');
        if (sessio) {
          const data = JSON.parse(sessio);
          // Tarkista ettei sessio ole liian vanha (8h)
          if (Date.now() - data.timestamp < 8 * 60 * 60 * 1000) {
            window.TM.auth.user = user;
            window.TM.auth.kirjautumistapa = 'email';
            window.kirjautunutKayttaja = data;
            tmPiilotaKirjautumisLomake();
            console.log('[TM Patch] Sessio palautettu cachesta');
            _kirjautuminenKesken = false;
            return;
          }
        }
        // Ei cachea — hae Firestoresta uudelleen
        // (uudelleenkirjautuminen tapahtuu automaattisesti)
        await tmKirjauduSahkopostilla(user.email, null);
      } catch(e) {
        console.warn('[TM Patch] Sessiorestaurointi epäonnistui:', e);
      }
      _kirjautuminenKesken = false;
      
    } else {
      // Ei kirjautunut — näytä lomake (PIN tai sähköposti)
      console.log('[TM Patch] Auth tila: ei kirjautunut');
      // Älä pakota kirjautumislomaketta jos PIN-tila jo aktiivinen
      if (window.TM.auth.kirjautumistapa !== 'pin') {
        // tmNaytaKirjautumisLomake(); // Kommentoi pois jos PIN hoitaa tämän
      }
    }
  });
}

// ============================================================
// UI-APUFUNKTIOT
// ============================================================
function tmNaytaLataus(teksti) {
  const el = document.getElementById('tm-kirjautuminen-lataus');
  if (el) {
    el.textContent = teksti;
    el.style.display = teksti ? 'block' : 'none';
  }
}

function tmNaytaVirhe(teksti) {
  const el = document.getElementById('tm-kirjautuminen-virhe');
  if (el) {
    el.textContent = teksti;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
  }
}

function tmNaytaViesti(teksti) {
  const el = document.getElementById('tm-kirjautuminen-viesti');
  if (el) {
    el.textContent = teksti;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }
}

function tmPiilotaKirjautumisLomake() {
  const el = document.getElementById('tm-firebase-kirjautuminen');
  if (el) el.style.display = 'none';
}

function tmNaytaKirjautumisLomake() {
  const el = document.getElementById('tm-firebase-kirjautuminen');
  if (el) el.style.display = 'flex';
}

function tmLataaSuperAdminNakyma() {
  // Super-admin voi valita seuran
  console.log('[TM Patch] Super-admin näkymä (TODO: seuravalitsin)');
  tmNaytaViesti('Super Admin — kaikki seurat käytettävissä');
}

// ============================================================
// LOMAKE-HTML (injektoidaan body:n alkuun)
// ============================================================
function tmInjektioiKirjautumisLomake() {
  if (document.getElementById('tm-firebase-kirjautuminen')) return;
  
  const lomake = document.createElement('div');
  lomake.id = 'tm-firebase-kirjautuminen';
  lomake.style.cssText = `
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.95);
    z-index: 99999;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', sans-serif;
  `;
  
  lomake.innerHTML = `
    <div style="
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px;
      width: 380px;
      max-width: 90vw;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    ">
      <!-- Logo / otsikko -->
      <div style="text-align:center; margin-bottom:32px;">
        <div style="font-size:28px; font-weight:800; color:#38bdf8; letter-spacing:-0.5px;">
          TalentMaster™
        </div>
        <div style="font-size:13px; color:#64748b; margin-top:4px;">Valmentajan kirjautuminen</div>
      </div>

      <!-- Viestit -->
      <div id="tm-kirjautuminen-virhe" style="
        display:none; background:#7f1d1d; color:#fca5a5;
        border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:16px;
      "></div>
      <div id="tm-kirjautuminen-viesti" style="
        display:none; background:#14532d; color:#86efac;
        border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:16px;
      "></div>
      <div id="tm-kirjautuminen-lataus" style="
        display:none; color:#94a3b8; font-size:13px; text-align:center; margin-bottom:16px;
      "></div>

      <!-- Sähköposti -->
      <div style="margin-bottom:16px;">
        <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
          Sähköposti
        </label>
        <input 
          type="email" 
          id="tm-email-input"
          placeholder="valmentaja@seura.fi"
          style="
            width:100%; padding:11px 14px; background:#0f172a;
            border:1px solid #334155; border-radius:8px; color:#f1f5f9;
            font-size:14px; outline:none; box-sizing:border-box;
          "
          onkeydown="if(event.key==='Enter') document.getElementById('tm-salasana-input').focus()"
        />
      </div>

      <!-- Salasana -->
      <div style="margin-bottom:24px;">
        <label style="display:block; color:#94a3b8; font-size:12px; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
          Salasana
        </label>
        <div style="position:relative;">
          <input 
            type="password" 
            id="tm-salasana-input"
            placeholder="••••••••"
            style="
              width:100%; padding:11px 14px; background:#0f172a;
              border:1px solid #334155; border-radius:8px; color:#f1f5f9;
              font-size:14px; outline:none; box-sizing:border-box;
            "
            onkeydown="if(event.key==='Enter') tmKirjauduLomakkeelta()"
          />
        </div>
      </div>

      <!-- Kirjaudu-nappi -->
      <button 
        onclick="tmKirjauduLomakkeelta()"
        style="
          width:100%; padding:13px; background:linear-gradient(135deg, #0ea5e9, #2563eb);
          color:white; border:none; border-radius:10px; font-size:15px;
          font-weight:700; cursor:pointer; letter-spacing:0.3px;
          transition: opacity 0.15s;
        "
        onmouseover="this.style.opacity='0.9'"
        onmouseout="this.style.opacity='1'"
      >
        Kirjaudu sisään
      </button>

      <!-- Erottaja -->
      <div style="text-align:center; color:#334155; margin:20px 0; font-size:13px;">
        — tai —
      </div>

      <!-- PIN-vaihtoehto -->
      <button 
        onclick="tmSiirrySiPINKirjautumiseen()"
        style="
          width:100%; padding:11px; background:transparent;
          color:#64748b; border:1px solid #334155; border-radius:10px;
          font-size:13px; cursor:pointer; transition: color 0.15s, border-color 0.15s;
        "
        onmouseover="this.style.color='#94a3b8'; this.style.borderColor='#475569'"
        onmouseout="this.style.color='#64748b'; this.style.borderColor='#334155'"
      >
        🔢 Käytä PIN-koodia
      </button>

      <!-- Versiotiedot -->
      <div style="text-align:center; color:#1e293b; font-size:10px; margin-top:24px; color:#334155;">
        TalentMaster™ Master v7 · Firebase Auth
      </div>
    </div>
  `;
  
  document.body.insertBefore(lomake, document.body.firstChild);
}

// ============================================================
// LOMAKKEEN SUBMIT-HANDLER
// ============================================================
function tmKirjauduLomakkeelta() {
  const email = document.getElementById('tm-email-input')?.value?.trim();
  const salasana = document.getElementById('tm-salasana-input')?.value;
  
  if (!email) {
    tmNaytaVirhe('Syötä sähköpostiosoite.');
    return;
  }
  if (!salasana) {
    tmNaytaVirhe('Syötä salasana.');
    return;
  }
  
  tmKirjauduSahkopostilla(email, salasana);
}

// ============================================================
// PIN → Sähköposti -vaihto
// ============================================================
function tmSiirrySiPINKirjautumiseen() {
  tmPiilotaKirjautumisLomake();
  // Aktivoi Master v7:n oma PIN-dialogi
  // (löytyy tyypillisesti id="pin-overlay" tai vastaava)
  const pinOverlay = document.getElementById('pin-overlay') 
    || document.getElementById('pinOverlay')
    || document.getElementById('loginOverlay');
  if (pinOverlay) {
    pinOverlay.style.display = 'flex';
  } else {
    console.warn('[TM Patch] PIN-overlay ei löydy — tarkista id');
  }
}

// ============================================================
// ULOSKIRJAUTUMISNAPPI (inektoidaan yläpalkkiin)
// ============================================================
function tmLisaaUloskirjautumisNappi() {
  // Etsitään topbar jonne nappi lisätään
  const topbar = document.querySelector('.top-bar')
    || document.querySelector('#topbar')
    || document.querySelector('header');
    
  if (!topbar || document.getElementById('tm-logout-btn')) return;
  
  const nappi = document.createElement('button');
  nappi.id = 'tm-logout-btn';
  nappi.innerHTML = '⏏ Kirjaudu ulos';
  nappi.style.cssText = `
    background: transparent;
    border: 1px solid rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.7);
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    margin-left: 12px;
  `;
  nappi.onclick = () => {
    if (confirm('Kirjaudutaanko ulos?')) tmKirjauduUlos();
  };
  topbar.appendChild(nappi);
}

// ============================================================
// PÄÄFUNKTIO — kutsutaan sivun latautuessa
// ============================================================
function patchMasterV7() {
  console.log('[TM Patch] Alustetaan Firebase Auth patch...');
  
  // 1. Alusta Firebase
  tmInitFirebase();
  
  // 2. Injektoi kirjautumislomake
  tmInjektioiKirjautumisLomake();
  
  // 3. Kuuntele auth-tilaa (sessiopersistenssi)
  tmKuunteleAuthTilaa();
  
  // 4. Tarkista onko jo PIN-kirjautunut (yhteensopivuus)
  tmTarkistaPINSessio();
  
  console.log('[TM Patch] Valmis ✓');
}

// ============================================================
// PIN-SESSIO YHTEENSOPIVUUS
// ============================================================
function tmTarkistaPINSessio() {
  // Jos Master v7 on jo asettanut PIN-session, älä näytä Firebase-lomaketta
  const pinAktiivinen = localStorage.getItem('tm_valmentaja_pin_aktiivinen')
    || sessionStorage.getItem('valmentaja_kirjautunut')
    || window.valmentajaKirjautunut; // Master v7:n oma globaali
    
  if (pinAktiivinen) {
    window.TM.auth.kirjautumistapa = 'pin';
    console.log('[TM Patch] PIN-sessio havaittu — Firebase-lomake pysyy piilossa');
    tmLisaaUloskirjautumisNappi(); // Lisää silti logout-nappi
  }
  // Muuten lomake pysyy piilotettu — Master v7:n PIN-overlay hoitaa kirjautumisen
}

// ============================================================
// GLOBAALIT EXPORT — Master v7 voi kutsua näitä suoraan
// ============================================================
window.tmKirjauduSahkopostilla = tmKirjauduSahkopostilla;
window.tmKirjauduUlos = tmKirjauduUlos;
window.tmHaeJoukkuePelaajat = tmHaeJoukkuePelaajat;
window.tmTallennaPlusMerkinta = tmTallennaPlusMerkinta;
window.tmNaytaFirebaseKirjautuminen = tmNaytaKirjautumisLomake;
window.patchMasterV7 = patchMasterV7;

console.log('[TM Patch] tm_master_firebase_patch.js ladattu ✓');
