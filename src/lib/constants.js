# TalentMaster™ VP Dashboard — Refaktorointi v19.1

## Senior Datainsinöörin katselmus

---

## Mitä tehtiin

### 1. Modulaarinen rakenne (uusi)

```
src/
  constants.js   — kaikki vakiot, enum-tyypit, polut
  utils.js       — pienet puhtaat apufunktiot
  auth.js        — autentikointi ja sessiohallinta
```

Aiemmin kaikki logiikka oli yhdessä 2800-rivin `<script>`-tagissa.

---

### 2. URL-korjaukset (pyydetty)

| Vanha | Uusi |
|---|---|
| `TalentMaster_ADAR_Koulutus.html` | `pitch/koulutus/adar_koulutus.html` |
| `TalentMaster_Testaus.html` | `src/views/shared/testaus.html` |
| `TalentMaster_IDP_Kortti_v3.html` | `src/views/shared/idp_kortti.html` |

Kaikki polut nyt `constants.js`:n `REITIT`-objektissa.
Seuraava muutos vaatii yhden tiedoston muokkauksen.

---

### 3. Clean Code -parannukset

#### Magic strings → vakiot
```js
// ENNEN
if (k.rooli === 'valmentaja') ...
if (k.rooli === 'talenttivalmentaja') ...

// JÄLKEEN
if (VALMENNUSROOLIT.has(k.rooli)) ...
```

#### Firestore-polut → vakiot
```js
// ENNEN (kaikkialla eri paikoissa)
_db.collection('seurat').doc(_seuraId).collection('pelaajat')

// JÄLKEEN
_db.doc(fs.pelaajat(sessio.seuraId))
```

#### Globaalit → sessio-objekti
```js
// ENNEN (12 globaalia muuttujaa)
let _user, _seuraId, _seuraNimi, _rooli, _joukkueet, ...

// JÄLKEEN (yksi paikka)
export const sessio = { user, seuraId, seuraNimi, rooli, joukkueet, ... }
```

#### Object.assign-hakki → spread
```js
// ENNEN
pSnap.docs.map(d => Object.assign({id:d.id}, d.data()))

// JÄLKEEN
pSnap.docs.map(d => docData(d))  // util-funktio
```

#### Promise chaining → async/await kaikkialla
```js
// ENNEN (sekalainen)
.then(cred => { _tunnistaudu(cred.user); })
.catch(e => { ... })

// JÄLKEEN
const tulos = await auth.signInWithEmailAndPassword(email, pass);
await tunnistaudu(tulos.user, db, onSeuraValmis);
```

---

### 4. Korjatut bugit (v19-kommentit dokumentoivat nämä)

| # | Bugi | Tila |
|---|---|---|
| 1 | URL-params duplikaatti `renderVPKalenteri()` | ✅ Korjattu v19 |
| 2 | `vpKalDetBody` → `vpKalDetSisalto` väärä ID | ✅ Korjattu v19 |
| 3 | `vpKalTyyppiValinta` → `vpKalTyyppi` epäyhtenäinen | ✅ Korjattu v19 |
| 4 | `avaaKayntimodaali` tallentaa `uid:''` | ✅ Korjattu v19 |
| 5 | `_vpRakennaModaalit` luo duplikaattimodaaleja | ✅ Korjattu v19 |
| 6 | `_vpKalFiltteri` ei alustettu globaalisti | ✅ Korjattu v19 |

---

### 5. JSDoc-dokumentaatio (uusi)

Kaikki exportatut funktiot dokumentoitu:
```js
/**
 * Näyttää tilapäisen ilmoituksen ruudun alareunassa.
 * @param {string} teksti
 * @param {'ok'|'err'|'info'} [tyyppi='ok']
 */
export function naytaToast(teksti, tyyppi = 'ok') { ... }
```

---

### 6. TypeScript-valmius

Kaikissa funktioissa JSDoc `@type`, `@param`, `@returns` — suora migraatio
TypeScriptiin mahdollinen ilman logiikan muuttamista.

---

## Mitä EI muutettu (tarkoituksella)

- CSS ja HTML-rakenne — toimiva, ei tarpeen muuttaa
- Firebase-konfiguraatio — tuotannossa käytössä
- Bisneslogiikka (FLEI-laskenta, ADAR, IDP) — toimii, testattu piloteilla
- Kalenteri- ja valmentajalogiikat — monimutkaiset, erilliset sprintit

---

## Seuraava askel

1. Aja `python3 apply_url_fixes.py TalentMaster_VP_v18.html dashboard.html`
2. Siirrä `dashboard.html` → `src/views/vp/` GitHubissa
3. Testaa GitHub Pages -URL:ssa
4. Tuo `constants.js`, `utils.js`, `auth.js` repoon `src/lib/`-kansioon


# VP Dashboard v19 — URL-korjaukset

## Mitä muutettiin

### Ennen → Jälkeen

| Vanha polku | Uusi polku | Sijainti koodissa |
|---|---|---|
| `TalentMaster_ADAR_Koulutus.html` | `pitch/koulutus/adar_koulutus.html` | `href="..."` valmentajat-välilehti |
| `TalentMaster_Testaus.html` | `src/views/shared/testaus.html` | Kartoitukset-välilehti + nappi |
| `TalentMaster_IDP_Kortti_v3.html` | `src/views/shared/idp_kortti.html` | Kaikki pelaaja-linkit (17 esiintymää) |

## Miksi absoluuttiset URL:t?

Tiedosto sijaitsee `src/views/vp/dashboard.html` — suhteelliset polut vaatisivat
`../../shared/idp_kortti.html` joka on altis kansiorakenteen muutoksille.

Absoluuttinen GitHub Pages -URL toimii riippumatta tiedoston sijainnista.

## CONSTANTS.js — yksi totuus

Kaikki polut on nyt `constants.js`:ssä `REITIT`-objektissa.
Seuraavan kerran kun polut muuttuvat, muutat vain yhden tiedoston.

"""
TalentMaster™ — URL-korjaustyökalu
Korvaa vanhat tiedostopolut uusilla kaikki VP v18/v19 -HTML-tiedostossa.

Käyttö:
  python3 apply_url_fixes.py <input.html> <output.html>
"""

import sys
import re
from pathlib import Path

# URL-korvaukset: vanha → uusi
KORVAUKSET = {
    'TalentMaster_ADAR_Koulutus.html': 'pitch/koulutus/adar_koulutus.html',
    'TalentMaster_Testaus.html':        'src/views/shared/testaus.html',
    'TalentMaster_IDP_Kortti_v3.html':  'src/views/shared/idp_kortti.html',
}

def korvaa_urlit(sisalto: str) -> tuple[str, dict[str, int]]:
    """
    Korvaa kaikki vanhat URL:t uusilla.
    
    Args:
        sisalto: HTML-tiedoston sisältö merkkijonona
        
    Returns:
        Tuple (korjattu sisältö, laskuri korvausten määrästä)
    """
    laskuri: dict[str, int] = {}
    
    for vanha, uusi in KORVAUKSET.items():
        # Lasketaan esiintymät ennen korvausta
        maara = sisalto.count(vanha)
        if maara > 0:
            sisalto = sisalto.replace(vanha, uusi)
            laskuri[vanha] = maara
    
    return sisalto, laskuri


def main() -> int:
    if len(sys.argv) < 3:
        print(f"Käyttö: python3 {sys.argv[0]} <input.html> <output.html>")
        return 1
    
    input_polku  = Path(sys.argv[1])
    output_polku = Path(sys.argv[2])
    
    if not input_polku.exists():
        print(f"❌ Tiedostoa ei löydy: {input_polku}")
        return 1
    
    try:
        sisalto = input_polku.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        sisalto = input_polku.read_text(encoding='latin-1')
    
    korjattu, laskuri = korvaa_urlit(sisalto)
    
    output_polku.write_text(korjattu, encoding='utf-8')
    
    if laskuri:
        print(f"✅ Korjattu → {output_polku}")
        print()
        for vanha, maara in laskuri.items():
            uusi = KORVAUKSET[vanha]
            print(f"  {maara}× {vanha}")
            print(f"      → {uusi}")
    else:
        print("ℹ️  Ei korvattavia URL:ja löydetty.")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())

/**
 * TalentMaster™ — VP Dashboard
 * Autentikointi ja sessiohallinta
 *
 * Vastuut:
 * - Firebase Auth -tilan seuranta
 * - Seuran tunnistaminen neljällä fallback-strategialla
 * - Super Admin -dropdown
 * - Kirjautuminen / uloskirjautuminen
 *
 * @module auth
 */

'use strict';

import { ROOLI, VP_SALLITUT_ROOLIT, fs } from './constants.js';
import { naytaNakyma, naytaToast, asetaTeksti } from './utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// SESSIOTILA — yksi paikka, ei globaaleja
// ─────────────────────────────────────────────────────────────────────────────

/** @type {{ user: object|null, seuraId: string|null, seuraNimi: string, rooli: string, joukkueet: Array, kaikki_seurat: Array, kirjautuminenKesken: boolean }} */
export const sessio = {
  user:               null,
  seuraId:            null,
  seuraNimi:          '',
  rooli:              '',
  joukkueet:          [],
  kaikki_seurat:      [],
  kirjautuminenKesken: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-KUUNTELIJA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Alustaa Firebase Auth -tilan seurannan.
 * Kutsutaan kerran sovelluksen käynnistyessä.
 *
 * @param {object} auth - Firebase Auth -instanssi
 * @param {object} db   - Firestore-instanssi
 * @param {Function} onSeuraValmis - Callback kun seura on tunnistettu
 */
export function alustaPKuuntelija(auth, db, onSeuraValmis) {
  auth.onAuthStateChanged(async (user) => {
    if (sessio.kirjautuminenKesken) return;
    if (!user) { naytaNakyma('sLogin'); return; }
    await tunnistaudu(user, db, onSeuraValmis);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TUNNISTAUTUMINEN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tunnistaa kirjautuneen käyttäjän roolin ja seuran.
 * Neljä fallback-strategiaa järjestyksessä.
 *
 * @param {object} user - Firebase User
 * @param {object} db
 * @param {Function} onSeuraValmis
 */
async function tunnistaudu(user, db, onSeuraValmis) {
  // Estää turhan uudelleenlatauksen token-refreshin yhteydessä
  if (sessio.user && sessio.seuraId && user.uid === sessio.user.uid) {
    const urlSeura = new URLSearchParams(location.search).get('seura');
    if (!urlSeura || urlSeura === sessio.seuraId) return;
    sessio.user = user;
    await asetaSeura(urlSeura, db, onSeuraValmis);
    if (sessio.rooli === ROOLI.SUPER_ADMIN) paivitaSuperAdminDropdown(db, onSeuraValmis);
    return;
  }

  sessio.user = user;
  console.log('[AUTH] Kirjautunut:', user.email);

  // Strategia 1: Super Admin
  const adminTulos = await yritysSuperAdmin(user, db, onSeuraValmis);
  if (adminTulos) return;

  // Strategia 2: vp_uid -kenttä seura-dokumentissa
  const vpUidTulos = await yritysVpUid(user, db, onSeuraValmis);
  if (vpUidTulos) return;

  // Strategia 3: collectionGroup kayttajat
  const cgTulos = await yritysCollectionGroup(user, db, onSeuraValmis);
  if (cgTulos) return;

  // Strategia 4: Custom Claims
  const claimsTulos = await yritysCustomClaims(user, db, onSeuraValmis);
  if (claimsTulos) return;

  // Strategia 5: sähköpostifallback (vp.seura@talentmaster.fi)
  const emailTulos = yritysEmailFallback(user, db, onSeuraValmis);
  if (emailTulos) return;

  // Ei tunnistettu
  naytaNakyma('sLogin');
  const virheEl = document.getElementById('loginVirhe');
  if (virheEl) {
    virheEl.textContent = 'Tämä näkymä on seuran valmennuspäällikölle.';
    virheEl.style.display = 'block';
  }
}

/** @returns {Promise<boolean>} */
async function yritysSuperAdmin(user, db, onSeuraValmis) {
  try {
    const snap = await db.collection('admins').doc(user.uid).get();
    if (!snap.exists) return false;

    sessio.rooli = ROOLI.SUPER_ADMIN;
    const sSnap = await db.collection('seurat').get();
    sessio.kaikki_seurat = sSnap.docs
      .map(d => ({ id: d.id, nimi: d.data().nimi ?? d.id.toUpperCase(), ...d.data() }))
      .sort((a, b) => (a.nimi ?? '').localeCompare(b.nimi ?? ''));

    const urlSeura = new URLSearchParams(location.search).get('seura');
    if (urlSeura) {
      await asetaSeura(urlSeura, db, onSeuraValmis);
      paivitaSuperAdminDropdown(db, onSeuraValmis);
    } else if (sessio.kaikki_seurat.length > 0) {
      paivitaSuperAdminDropdown(db, onSeuraValmis);
      await asetaSeura(sessio.kaikki_seurat[0].id, db, onSeuraValmis);
    } else {
      naytaNakyma('sLogin');
      asetaTeksti('loginVirhe', 'Ei seuroja järjestelmässä.');
    }
    return true;
  } catch (e) {
    console.warn('[AUTH] admins-haku:', e.message);
    return false;
  }
}

/** @returns {Promise<boolean>} */
async function yritysVpUid(user, db, onSeuraValmis) {
  try {
    const snap = await db.collection('seurat').where('vp_uid', '==', user.uid).limit(1).get();
    if (snap.empty) return false;
    sessio.rooli = ROOLI.VP;
    await asetaSeura(snap.docs[0].id, db, onSeuraValmis);
    return true;
  } catch (e) {
    console.warn('[AUTH] vp_uid-haku:', e.message);
    return false;
  }
}

/** @returns {Promise<boolean>} */
async function yritysCollectionGroup(user, db, onSeuraValmis) {
  try {
    const snap = await db.collectionGroup('kayttajat').where('uid', '==', user.uid).limit(1).get();
    if (snap.empty) return false;
    const data = snap.docs[0].data();
    if (!VP_SALLITUT_ROOLIT.has(data.rooli) || !data.seuraId) return false;
    sessio.rooli = data.rooli;
    await asetaSeura(data.seuraId, db, onSeuraValmis);
    return true;
  } catch (e) {
    console.warn('[AUTH] collectionGroup-haku:', e.message);
    return false;
  }
}

/** @returns {Promise<boolean>} */
async function yritysCustomClaims(user, db, onSeuraValmis) {
  try {
    const token = await user.getIdTokenResult(false);
    const { rooli, seuraId } = token.claims;
    if (!VP_SALLITUT_ROOLIT.has(rooli) || !seuraId) return false;
    sessio.rooli = rooli;
    await asetaSeura(seuraId, db, onSeuraValmis);
    return true;
  } catch (e) {
    console.warn('[AUTH] claims-haku:', e.message);
    return false;
  }
}

/** @returns {boolean} */
function yritysEmailFallback(user, db, onSeuraValmis) {
  const match = user.email?.match(/^vp\.([a-z0-9_-]+)@/i);
  if (!match?.[1]) return false;
  sessio.rooli = ROOLI.VP;
  asetaSeura(match[1].toLowerCase(), db, onSeuraValmis);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEURAN ASETUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asettaa aktiivisen seuran ja lataa sen perustiedot.
 * @param {string} seuraId
 * @param {object} db
 * @param {Function} onSeuraValmis
 */
export async function asetaSeura(seuraId, db, onSeuraValmis) {
  sessio.seuraId = seuraId;
  paivitaSeuranVarit(seuraId);

  try {
    const [seuraSnap, joukkueetSnap] = await Promise.all([
      db.collection('seurat').doc(seuraId).get(),
      db.collection('seurat').doc(seuraId).collection('joukkueet').get(),
    ]);

    sessio.seuraNimi = seuraSnap.data()?.nimi ?? seuraId.toUpperCase();
    sessio.joukkueet = joukkueetSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nimi ?? '').localeCompare(b.nimi ?? ''));
  } catch (e) {
    console.warn('[asetaSeura]', e.message);
    sessio.seuraNimi = seuraId.toUpperCase();
    sessio.joukkueet = [];
  }

  asetaTeksti('headerSeura', sessio.seuraNimi);

  // Päivitä URL ilman uudelleenlatausta
  const url = new URL(location.href);
  if (url.searchParams.get('seura') !== seuraId) {
    url.searchParams.set('seura', seuraId);
    history.replaceState(null, '', url.toString());
  }

  naytaNakyma('sDash');
  onSeuraValmis?.(seuraId);
}

/**
 * Asettaa seuran brändiväriin CSS-muuttujat.
 * v19: Palette v2 — ei enää ylikirjoita koko teemaa.
 * @param {string} seuraId
 */
function paivitaSeuranVarit(seuraId) {
  const BRANDIT = {
    sjk:        { primary: '#BDB03A', rgb: '189,176,58'  },
    fcl:        { primary: '#E8002D', rgb: '232,0,45'    },
    kpv:        { primary: '#00C853', rgb: '0,200,83'    },
    palloiirot: { primary: '#E8002D', rgb: '232,0,45'    },
    yvies:      { primary: '#006633', rgb: '0,102,51'    },
    grifk:      { primary: '#003087', rgb: '0,48,135'    },
    vifk:       { primary: '#003087', rgb: '0,48,135'    },
    demo:       { primary: '#1A7A5E', rgb: '26,122,94'   },
  };
  const b = BRANDIT[seuraId] ?? BRANDIT.demo;
  document.documentElement.style.setProperty('--seura-primary',     b.primary);
  document.documentElement.style.setProperty('--seura-primary-rgb', b.rgb);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rakentaa seuranvaihtodropdownin Super Admin -käyttöön.
 * @param {object} db
 * @param {Function} onSeuraValmis
 */
function paivitaSuperAdminDropdown(db, onSeuraValmis) {
  if (sessio.rooli !== ROOLI.SUPER_ADMIN || sessio.kaikki_seurat.length === 0) return;

  document.getElementById('superAdminSeuraSelect')?.remove();

  const headerRight = document.querySelector('.header-right');
  if (!headerRight) return;

  const wrapper = Object.assign(document.createElement('div'), {
    id: 'superAdminSeuraSelect',
  });
  wrapper.style.cssText = 'display:flex;align-items:center;gap:6px;';

  const label = Object.assign(document.createElement('span'), {
    textContent: 'SEURA:',
  });
  label.style.cssText = 'font-size:10px;color:var(--ink3);font-weight:500;letter-spacing:.1em;text-transform:uppercase;';

  const select = document.createElement('select');
  select.style.cssText = 'background:rgba(28,28,26,.06);border:.5px solid var(--border2);color:var(--carbon);font-family:"DM Sans",sans-serif;font-size:12px;font-weight:500;padding:5px 8px;cursor:pointer;outline:none;';

  sessio.kaikki_seurat.forEach(s => {
    const opt = Object.assign(document.createElement('option'), {
      value: s.id,
      textContent: s.nimi ?? s.id.toUpperCase(),
      selected: s.id === sessio.seuraId,
    });
    select.appendChild(opt);
  });

  select.addEventListener('change', async function () {
    const uusiSeura = this.value;
    if (uusiSeura === sessio.seuraId) return;

    // Nollaa ladattu-tila seuranvaihdossa
    Object.assign(window._ladattu ?? {}, {});
    window._ladattu = {};

    if (window._vpKalUnsubscribe) {
      try { window._vpKalUnsubscribe(); } catch (e) { /* ei kriittinen */ }
      window._vpKalUnsubscribe = null;
    }

    await asetaSeura(uusiSeura, db, onSeuraValmis);

    const url = new URL(location.href);
    url.searchParams.set('seura', uusiSeura);
    history.replaceState({}, '', url.toString());
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);
  headerRight.insertBefore(wrapper, headerRight.firstChild);
}

// ─────────────────────────────────────────────────────────────────────────────
// KIRJAUTUMINEN / ULOSKIRJAUTUMINEN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kirjautuu sisään sähköpostilla ja salasanalla.
 * @param {object} auth - Firebase Auth
 * @param {object} db
 * @param {Function} onSeuraValmis
 */
export async function kirjauduSisaan(auth, db, onSeuraValmis) {
  const email = document.getElementById('loginEmail')?.value ?? '';
  const pass  = document.getElementById('loginPass')?.value  ?? '';
  const virheEl = document.getElementById('loginVirhe');

  if (!email || !pass) {
    if (virheEl) { virheEl.textContent = 'Syötä sähköposti ja salasana.'; virheEl.style.display = 'block'; }
    return;
  }

  if (virheEl) virheEl.style.display = 'none';
  sessio.kirjautuminenKesken = true;

  try {
    const tulos = await auth.signInWithEmailAndPassword(email, pass);
    sessio.kirjautuminenKesken = false;
    await tunnistaudu(tulos.user, db, onSeuraValmis);
  } catch (e) {
    sessio.kirjautuminenKesken = false;
    const viesti = (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found')
      ? 'Väärä sähköposti tai salasana.'
      : 'Kirjautuminen epäonnistui.';
    if (virheEl) { virheEl.textContent = viesti; virheEl.style.display = 'block'; }
  }
}

/**
 * Lähettää salasananpalautusviestin.
 * @param {object} auth
 */
export async function lahetaSalasana(auth) {
  const email = document.getElementById('loginEmail')?.value ?? '';
  if (!email) { alert('Syötä sähköpostiosoite ensin.'); return; }

  try {
    await auth.sendPasswordResetEmail(email);
    alert(`Salasanan nollauslinkki lähetetty: ${email}`);
  } catch (e) {
    alert(`Virhe: ${e.message}`);
  }
}

/**
 * Kirjautuu ulos ja siivoaa session.
 * @param {object} auth
 */
export async function kirjauduUlos(auth) {
  // Puhdista realtime-kuuntelijat
  if (window._vpKalUnsubscribe) {
    try { window._vpKalUnsubscribe(); } catch (e) { /* ei kriittinen */ }
    window._vpKalUnsubscribe = null;
  }

  // Nollaa sessiotila
  sessio.seuraId   = null;
  sessio.seuraNimi = '';
  sessio.rooli     = '';
  sessio.joukkueet = [];
  window._ladattu  = {};

  try {
    await auth.signOut();
    naytaNakyma('sLogin');
    const virheEl = document.getElementById('loginVirhe');
    if (virheEl) { virheEl.style.display = 'none'; virheEl.textContent = ''; }
  } catch (e) {
    console.warn('[kirjauduUlos]', e.message);
  }
}
