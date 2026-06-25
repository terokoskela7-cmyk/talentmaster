# Solo Player™ — P0 tietomalli-spec

> Laadittu 2026-06-25. P0:n (perusta: tili + data + compliance) **kanoninen tietomalli**. Code rakentaa P0:n tästä.
> Päätökset: vanhempitili + lapsiprofiilit · litteä `players/{id}` + `parent_uid` (yhteensopiva ARKKITEHTUURI §11 -vision kanssa).
> Täydentää: SOLO_KAUPALLISTAMINEN_SUUNNITELMA.md (faasit), CLAUDE.md §8/§11.

---

## 0. Scope (P0)
Vain perusta: (A) vanhempitili-auth, (B) `players/`-datakerros + localStorage-migraatio, (D) GDPR-suostumus, entitlement-**stub** (P1-valmis), club-bridge-**kentät** (P2-valmis). EI maksuja (P1), EI arviointia/korttilogiikkaa (P2).

**Periaate:** Firestore = totuuslähde; localStorage = vain offline-cache (PWA). Vanhempi omistaa, lapsi käyttää.

---

## 1. Firestore-kokoelmat

### `parents/{uid}` — vanhemman tili (doc-id = Firebase Auth uid)
```javascript
{
  email, nimi,
  luotu, paivitetty,                          // serverTimestamp
  lapset: [playerId, ...],                    // denorm-lista (kysely players where parent_uid==uid on totuus)
  // entitlement-STUB (P1 täyttää; P0 oletus 'free')
  entitlement: { status: 'free', stripe_customer_id: null, current_period_end: null },
  // GDPR
  suostumus_versio: 'v1',
  hyvaksytyt_ehdot: { tos: true, privacy: true, pvm }   // käyttöehdot + tietosuojaseloste vanhemmalle
}
```

### `players/{playerId}` — Solo-pelaaja (LITTEÄ, ei seurahierarkiassa — ARKKITEHTUURI §11)
```javascript
{
  playerId,                                   // = doc-id (auto-id, EI Auth uid; lapsi ei kirjaudu itse P0:ssa)
  parent_uid,                                 // ← omistava vanhempi (Auth uid). KRIITTINEN kytkentä + Rules-avain
  playerCode: 'TMP-XXXXXX',                    // uniikki (6 merkkiä A–Z+0–9, uniikkius tarkistettu playerCodes-indeksistä), club-bridge-avain
  seuraId: null,                              // täyttyy kun seura liittyy (club-bridge, P2)

  // perustiedot (migraatio: tm_solo_profiili)
  nimi, synVuosi, synKuukausi,                // syntymäaika kahtena kenttänä (kuten nyt)
  // profiili
  pp, kokemus, treeni, ketju,                 // pelipaikka, kokemusvuodet, seuratreeni-frekvenssi, heikoin ketju
  // tekniikkakilpailu
  tkkVuosi, tkkYht, tkkMerkki,
  // fyysinen (valinnainen)
  fyysHyppy, fyysLoikka, fyysNaru, fyysSprintti,
  // kotimittarit (toistuu 3 kk välein)
  kotiPonn, kotiSeina, kotiDrip, kotiPvm,

  // kortti-tila (P2 laajentaa; P0 voi tallentaa nykyisen tason)
  kortti_taso: 'starter',                     // starter|sharp|elite

  luotu, paivitetty                           // serverTimestamp
}
```

### `players/{playerId}/tkk_historia/{vuosi}` (migraatio: tm_tkk_historia)
```javascript
{ vuosi, yht, merkki }
```
> Vaihtoehto: pitää `tkk_historia`-array pelaajadokumentissa (pieni data). Suositus: array dokumentissa (yksinkertaisempi, < 20 merkintää).

### `players/{playerId}/suostumukset/{tyyppi}` — GDPR (Art. 8, vanhempi antaa)
```javascript
{
  ok: true,
  tyyppi: 'perus' | 'benchmark',              // perus = datan käsittely (pakko) · benchmark = anonyymi vertailu (opt-in)
  antaja_uid,                                 // vanhemman Auth uid
  antaja_email,
  versio: 'v1',
  pvm                                          // serverTimestamp
}
```

### `playerCodes/{TMP-XXXX}` — club-bridge-indeksi (P2-valmis, luodaan jo P0:ssa)
```javascript
{ playerId, parent_uid, luotu }
```
> Miksi erillinen indeksi: seura etsii Solo-pelaajan PlayerCodella **ilman että `players/`-kokoelma on kysyttävissä** (tietoturva). P0 luo tämän tilin/pelaajan luonnissa; P2 käyttää sitä siltaan.

---

## 2. Auth-malli
- **Vanhempi** kirjautuu Firebase Authilla (email+salasana + Google Sign-In) → `parents/{uid}`.
- **Lapsi EI kirjaudu erikseen P0:ssa** — lapsiprofiili(t) ovat `players/`-dokkeja vanhemman alla (`parent_uid`). Lapsi käyttää appia vanhemman laitteella/tilillä.
- Monta lasta: `players where parent_uid == uid`. Vanhempi voi luoda useita lapsiprofiileja.
- Cross-device: vanhempi kirjautuu millä tahansa laitteella → lataa `players` Firestoresta.
- **Palautus = vanhemman sähköposti (lukittu päätös):** tilin/salasanan (ja tulevan lapsi-PINin) palautus AINA vanhemman sähköpostilla (Firebase `sendPasswordResetEmail`). Sähköposti on tilin ankkuri. → vanhemman sähköposti pakollinen + verifioitava.
- (Tuleva, ei P0: lapsen oma PIN-kirjautuminen tilin alle — PIN-palautus kulkee vanhemman sähköpostin kautta.)

---

## 3. localStorage → Firestore -migraatio (kerta, idempotentti)
Tilin luonnissa / ensimmäisellä kirjautumisella: jos `localStorage` sisältää Solo-dataa eikä `tm_migrated`-lippua → siirrä tiliin.

| localStorage | → Firestore |
|---|---|
| `tm_player_code` | `players/{id}.playerCode` + `playerCodes/{code}` |
| `tm_solo_profiili.{nimi,synVuosi,synKuukausi,pp,kokemus,treeni,ketju,tkkVuosi,tkkYht,tkkMerkki,fyys*,koti*}` | `players/{id}` vastaavat kentät |
| `tm_tkk_historia` | `players/{id}.tkk_historia[]` (tai alikokoelma) |

**Flow:** luo `players/{id}` (auto-id) `parent_uid`:lla → kopioi kentät → luo `playerCodes/{code}` → aseta `localStorage.tm_migrated = playerId`. **Idempotentti:** jos `tm_migrated` on jo, älä migroi uudelleen. Jos PlayerCode törmää (epätodennäköistä), generoi uusi + päivitä. **Älä poista localStoragea** (offline-cache jää).

---

## 4. Firestore Rules (P0)
```javascript
// Vanhemman tili
match /parents/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
// Solo-pelaaja — vain omistava vanhempi (P0). (Club-bridge-luku P2: + onOmaSeura kun seuraId täyttyy.)
match /players/{playerId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == resource.data.parent_uid;
  allow create:      if request.auth != null
                     && request.auth.uid == request.resource.data.parent_uid;
  match /{sub=**} {                            // tkk_historia, suostumukset
    allow read, write: if request.auth != null
                       && get(/databases/$(database)/documents/players/$(playerId)).data.parent_uid == request.auth.uid;
  }
}
// PlayerCode-indeksi — luo oma vanhempi; luku P2:ssa seuralle (laajennetaan myöhemmin)
match /playerCodes/{code} {
  allow create: if request.auth != null && request.auth.uid == request.resource.data.parent_uid;
  allow read:   if request.auth != null;       // P2 kaventaa seura-skooppiin tarvittaessa
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.parent_uid;
}
```
> **HUOM:** nämä ovat **eri Rules-tiedosto/osio kuin klubin** `seurat/`-puu. Lisätään samaan `tm_admin/firestore.rules`:iin omana lohkonaan → deployataan N4-CI:n kautta. Älä riko klubin Rulesia.

---

## 5. GDPR — vanhempaislupa (Art. 8)
- **Ikäportti:** lapsen `synVuosi` → ikä. **FI: alle 13v → vanhempaislupa pakollinen.** Koska tili-malli on vanhempitili, **vanhempi antaa luvan aina** (lapsi ei voi luoda tiliä itse) → Art. 8 täyttyy rakenteellisesti, mutta lupa pitää **kirjata eksplisiittisesti + versioida**.
- **Suostumustyypit:** `perus` (datan käsittely — pakko ennen profiilin tallennusta) · `benchmark` (anonyymi vertailudata — opt-in, oletus pois).
- **Onboarding-pakko:** vanhempi hyväksyy käyttöehdot + tietosuojaselosteen (`parents.hyvaksytyt_ehdot`) ja antaa `perus`-suostumuksen lapselle ENNEN kuin `players/`-dokki tallennetaan.
- **RTBF + export:** Cloud Function (klubin malli §33 B4): poista vanhempi + kaikki lapset (`players` where parent_uid + alikokoelmat + playerCodes + Auth-tili) / vie kaikki data. Versioitu suostumus + retention-politiikka (DPO-katselmus ennen GA:ta).

---

## 6. Entitlement-stub (P1-valmis, P0 ei käytä)
`parents/{uid}.entitlement.status` oletus `'free'`. P0 ei gateta mitään maksulla. P1 (Stripe-webhook-CF) päivittää statuksen `trialing|active|canceled` + `current_period_end`. Paywall lukee tätä. **Määritellään kenttä nyt**, ettei P1 vaadi skeemamigraatiota.

---

## 7. Invariantit
- **`parent_uid` on jokaisen `players/`-dokin pakollinen avain** — Rules + omistajuus nojaa siihen. Migraatio + luonti asettaa aina.
- **Firestore = totuus, localStorage = cache.** Migraation jälkeen luku Firestoresta; localStorage vain offline.
- **Litteä `players/{id}`** (EI `parents/{uid}/players/`) — yhteensopiva ARKKITEHTUURI §11 + club-bridgen kanssa (seura linkittyy `seuraId`:llä, ei vanhempihierarkian läpi).
- **Suostumus EI KOSKAAN oletuksena annettu** (sama invariantti kuin klubilla §33) — `perus` pakko ennen tallennusta, `benchmark` opt-in.
- **Solo-Rules eri lohko kuin klubin `seurat/`** — älä sekoita; deploy N4-CI.
- **PlayerCode uniikki** + `playerCodes/`-indeksi pidetään synkassa `players.playerCode`:n kanssa.

## 8. Avoimet päätökset (eivät estä P0-toteutusta)
- `tkk_historia`: array dokumentissa vs alikokoelma (suositus: array).
- Lapsen oma PIN-kirjautuminen tilin alle (tuleva, ei P0).
- ✅ **PlayerCode LUKITTU:** `TMP-` + **6 merkkiä (A–Z + 0–9, pl. sekoittuvat 0/O, 1/I/L)**, uniikkius tarkistettu `playerCodes`-indeksistä luonnissa (törmäys → generoi uusi). Skaalautuu avoimeen lanseeraukseen.
- ✅ **Palautus LUKITTU:** vanhemman sähköposti (Firebase reset). Sähköposti pakollinen + verifioitava tilin luonnissa.
- Domain/reitti: `player.talentmasterid.com` vs reitti.

---

## 9. Onboarding-polut — A (vanhempi pystyttää) + B (lapsi lataa, vanhempi hyväksyy) [LUKITTU]

Avoin kuluttajalanseeraus → lapset lataavat itse. **Kaksi sisääntuloa, sama lopputila** (vanhempi omistaa + on antanut luvan).

### Polku A — vanhempi pystyttää suoraan (perhe yhdessä)
Splash → vanhempitili → lapsiprofiili → suostumus → Starter-kortti. (= mockup, §3-flow.) Vanhempi laitteen ääressä.

### Polku B — lapsi aloittaa, vanhempi hyväksyy etänä ("lapsi omalla puhelimella")
1. Lapsi asentaa PWA:n → **neutraali ikäportti** (kysy syntymäaika, EI "oletko yli 13").
2. Alle 13 → **"Pyydä vanhemmalta lupa"**: lapsi syöttää oma etunimi + synt + **vanhemman sähköposti**.
3. Luo `lupapyynnot/{requestId}` + lähetä vanhemmalle **vahvistuslinkki sähköpostiin** (CF, klubin `vahvistaSuostumus`-malli). Lapsi jää **rajattuun tilaan** ("Odotetaan vanhemman lupaa", näkee esittelyn/demo­kortin, **ei tallenneta dataa**).
4. Vanhempi avaa linkin (mikä tahansa laite) → luo/kirjaa parent-tili → näkee lapsen tiedot + **antaa suostumuksen** (GDPR Art. 8) → [P1: maksaa]. **Maksu (kortti) = vahva vanhemman varmennus** (GDPR "kohtuulliset toimet"; pelkkä rasti EI riitä).
5. Hyväksyntä luo `players/{playerId}` (parent_uid) + generoi **child_pin** (4 num) → päivittää `lupapyynnot.status='hyvaksytty'` + `playerId` + `child_pin`.
6. Lapsen laite (pitää `requestId`:tä localStoragessa) kuuntelee (`onSnapshot`) → hyväksytty → näyttää PINin → **lapsi kirjautuu PINillä** (anonymous auth + PIN-haku, **klubin pelaaja-malli §16**) → käyttää profiilia. PIN-palautus vanhemman sähköpostilla.

### Tietomalli — `lupapyynnot/{requestId}` (consent request, Polku B)
```javascript
{
  child_etunimi, synVuosi, synKuukausi,
  parent_email,                               // lowercased
  status: 'odottaa' | 'hyvaksytty' | 'hylatty',
  token,                                       // magic-link-tunniste (vanhemman linkki)
  playerId: null,                              // täyttyy hyväksynnässä
  child_pin: null,                             // täyttyy hyväksynnässä (lapsen laite lukee)
  luotu, vanhenee                              // esim. 7 pv
}
```

### Auth — lapsen pääsy omaan profiiliinsa (klubin §16-malli)
- **Vanhempi:** parent_uid == auth.uid (Rules §4).
- **Lapsi omalla laitteellaan:** **child_pin → anonymous auth + PIN-haku** (kuten klubin pelaaja). `players/{id}.child_pin`-kenttä; Rules sallii anonyymin luvun/kirjoituksen vain PIN-täsmäykseen omaan dokkiin. Vanhempi näkee/hallinnoi PINin; palautus sähköpostilla.
- *Tämä on P0:n työläin osa (anonymous-auth + PIN-Rules Solo-puolelle) — sama kuvio kuin klubilla, mutta uusi `players/`-kontekstiin.*

### Rules-lisäys (Polku B)
```javascript
match /lupapyynnot/{requestId} {
  allow create: if true;                       // kuka tahansa (rate-limit CF:ssä); ei henkilötietoa joka paljastaa muuta
  allow read:   if true;                        // lapsen laite pollaa omaa requestId:tä (token tiedossa vain hakijalla)
  allow update, delete: if false;               // vain CF (Admin SDK) hyväksynnässä
}
// players: lisää lapsen PIN-pääsy parent_uid-ehdon rinnalle (anonymous + child_pin-täsmäys)
```
> Rajoite: `lupapyynnot` luettavissa requestId:llä — pidä requestId arvaamattomana (UUID). Hyväksyntä-kirjoitus VAIN Cloud Functionilla (Admin SDK), ei clientistä. Sähköpostin lähetys + hyväksyntä = sama CF-pattern kuin klubin `vahvistaSuostumus`.

### Invariantit (Polku B)
- **Rajattu tila ennen lupaa:** lapsen dataa EI tallenneta `players/`:iin ennen vanhemman hyväksyntää (vain `lupapyynnot` jossa minimitiedot). Profiili syntyy vasta hyväksynnässä.
- **Hyväksyntä vain CF:ssä** (Admin SDK) — client ei voi itse merkitä lupaa annetuksi (sama kuin klubin suostumus-integriteetti §33).
- **Sähköposti = ankkuri + varmennus**, maksu (P1) = vahvistava varmennus.
- §7.22 säilyy: lapselle ei vertailua/numeropainetta missään vaiheessa.
