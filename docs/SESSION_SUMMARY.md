# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-04-04)

TalentMaster on jalkapallon talenttiarviointialusta — 7 pilottiseuraa, Firebase Blaze. Harjoitelogiikka v3 rakennettu ja testattu tässä sessiossa. Pelaaja v2 kehitteillä PIN-kirjautumisella.

---

## GitHub + tiedostot

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

| Tiedosto | Tila |
|---|---|
| `TalentMaster_VP_v18.html` | outputs-kansiossa, lataus PENDING |
| `TalentMaster_Seura.html` | Aktiivinen |
| `TalentMaster_Master_v7.html` | Aktiivinen (12 238 riviä) |
| `TalentMaster_IDP_Kortti_v3.html` | Toimii KPV:llä |
| `harjoitelogiikka_v3.js` | UUSI — outputs-kansiossa, lataus PENDING |
| `pin_lisays.html` | UUSI — outputs-kansiossa |
| `functions/index.js` | Aktiivinen |
| `tm_admin/firestore.rules` | Julkaistu Firebase-konsolissa |

## Firebase config
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
```

Super Admin: talentmasterid@gmail.com / UID: dqUzvJA61Wb9fgj5UiK0riSA4NI2

## PENDING
- VP v18 → GitHub
- harjoitelogiikka_v3.js → GitHub
- Cloud Scheduler API: https://console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=talentmaster-pilot

---

## Harjoitelogiikka v3 — tämän session tärkein rakenne

### 70/30-periaate (lähde: TalentMaster_Kayttajatutkimus.html — EI muuteta)
- 70% KOKONAISVALTAINEN: kaikki 5 liikeketjua joka harjoituksessa. Tekninen pääharjoite kiertää kahta heikointa viikottain.
- 30% KOHDENNETTU: aina pelaajan HEIKOIMPAAN ketjuun. EI profiiliin. EI vahvuuteen.
- Koskee ALKURUTIINIA (20–30 min). Kenttäharjoitus on valmentajan.

### Harjoitetyypit
| Tyyppi | Milloin | Kesto | Tarkoitus |
|---|---|---|---|
| T | Joka päivä — MYÖS LEPOPÄIVÄT | 15–30 min | Pallokosketus — kultaikkuna |
| D | Joka päivä — myös lepopäivät | 5–10 min | Liikkuvuus + hermoston ylläpito |
| S | Vapaa-/lepopäivä | 15–20 min | Pelaajan HEIKOIN ketju |
| P | 2–3×/vk harjoitusten välissä | 20–30 min | 6 vk nousujohteinen jakso |

### T-harjoitteen filosofia — KIRJATTU TÄSSÄ SESSIOSSA

**Perustava ero fysiikkaan:**
Fyysinen kapasiteetti = superkompensaatio → vaatii lepoa väliin.
Tekninen taito = hermostollinen automatisoituminen → EI vaadi lepoa. Tauko heikentää automaatioratoja.
→ Sama periaate joka tekee lepopäivästä järkevää fysiikalle tekee lepopäivästä vaarallista tekniikalle.

**Kultaikkuna 8–12v (Nevanlinna 2014):**
Taitavuustekijät (koordinaatio, tasapaino, rytmikyky, reaktiokyky) kehittyvät voimakkaimmillaan 7–12v.
Sama oppimistulos murrosiän jälkeen vaatii MONINKERTAISEN työmäärän.
→ 10-vuotias oppii ponnauttelu-automaation 3kk. 16-vuotias tarvitsee 12–18kk.

**Ajax/Benfica/La Masia — "daily touches":**
15–30 min palloa joka päivä > 3h kahdesti viikossa.
Benfican pelaajat saavat pallon kotiin joka kulkee mukana kaikkialle.
Côté 2007: vapaa ilo-orientoitunut peli alle 12v → parempi tekninen pohja kuin strukturoitu harjoittelu.
Ennustamattomat tilanteet rakentavat JOUSTAVIA hermoratoja.

**U8–U12: EI mittausta, EI tavoitetta, EI pakottamista.**
Ilo tuottaa toistoja. Pakottaminen tappaa ilon. Kultaikkunan arvo perustuu motivaatioon.
Vanhemmalle: "Älkää painostako — tehkää pallosta osa arkirutiinia niin kuin hampaidenpesusta."

**U15+ tekniikka vahvistuu eri tavalla:**
Ei enää automatisoidu samalla tavalla — INTEGROITUU peliin.
T muuttuu pelipaikkakohtaiseksi. LH: 1v1-siirtoja. KK: syöttötarkkuus. ST: viimeistely.
Toistologiikka säilyy mutta konteksti muuttuu: pallontuntu OIKEASSA tilanteessa.

**T-harjoite ei poistu koskaan. Se vain muuttaa muotoaan.**

### Muut periaatteet
- **Viikkokierto:** parillinen vk → heikoin, pariton → toiseksi heikoin
- **Ikäkohtainen kieli:** leikkija (U8–12) / rakentaja (U13–15) / showcase (U16+)
- **Everton Stage 1→5:** sama harjoite vaikeutuu kun Stage nousee (pisteet tai ikä)
- **PHV ohittaa Stagen:** circa-PHV pysyy Stage 2:ssa vaikka pisteet kasvaisivat
- **PHV:** kuorma 60%, eksentriset pois, DFL-harjoitteet normaali tai enemmän, kognitiiviset suositeltuja
- **Videolinkit:** yt-kenttä per harjoite. Firestore videoBank/{id} → valmentajan video menee ohi oletuksen

### Everton-lisäykset
- Laskeutuminen (ACL): SBL + SFL + LL-ketjuihin kytketty, PHV-gated
- YJ-loikat: LL + SBL, 6 vk progressio
- Karhukävely (dynaaminen core): DFL

### 6 viikon P-jakso (Nevanlinna 2014)
- Vk 1–2: Valmistava (60–70%)
- Vk 3–4: Kehittävä (75–85%)
- Vk 5–6: Huipentava (90–100%)

### Funktiot
```javascript
generoimTehtavat(pelaaja)        // T+D+S
generoimTehtavatV2(pelaaja)      // + P (U15+)
generoimViikoOhjelma(pelaaja)    // 7 päivän ohjelma
laskeKetjuProfiili(pelaaja)      // heikoin/vahvin/järjestys
_laskeStage(pelaaja)             // Stage 1-5
_ikatyyppi(ika)                  // leikkija/rakentaja/showcase
ytUrl(id) / ytThumbnail(id)      // YouTube apufunktiot
```

---

## PIN-kirjautuminen

```javascript
_haeKaikkiSeurat()     // Firestoresta, ei kovakoodattu lista → toimii uusille seuroille
pinTarkista()          // pelaajat.where('pin','==','1234')
_tarkistaPinSessio()   // sessio 30 päivää localStorage
kirjauduUlos()         // tyhjentää Firebase + PIN
```
URL-parametri `?seura=kpv` nopeuttaa hakua.

---

## Vuosiohjelma — automaattiset muutokset

1. `harjoitettavuus_pisteet` kasvaa → Stage nousee → harjoite vaikeutuu
2. Heikoin ketju vaihtuu → D ja S vaihtuvat automaattisesti
3. `phv_tila` muuttuu → kuormarajoitin aktivoituu/poistuu

Kehitysnopeus (realistinen/kausi): Lankku 20s→55s · T-drill −0.4s · 5-loikka +50cm · Ponnauttelu +10/min

---

## Kriittiset periaatteet (EI muuteta koskaan)

1. Super Admin dqUzvJA61Wb9fgj5UiK0riSA4NI2 — pääsy kaikkialle aina
2. S-harjoite = AINA heikoin ketju, ei profiiliin
3. T-harjoite = joka päivä, myös lepopäivät
4. PHV ohittaa Stagen
5. 70/30 koskee alkurutiinia — kenttäharjoitus on valmentajan
6. `super_admin` underscore canonical — `normalizeRooli()` hoitaa vanhat
7. Firestore Rules: `allow create` JA `allow update`

---

## Tehtävälista — sprinteittäin

### Sprint 1–2 (nyt)
1. Lataa VP v18 + harjoitelogiikka_v3 GitHubiin
2. Aktivoi Cloud Scheduler API
3. Integroi PIN + harjoitelogiikka v3 Pelaaja v1:een
4. Streak + XP Firestoreen (nyt localStoragessa)
5. Valmentajan päivän tehtävä → Firestore
6. videoBank Firestoreen — valmentaja lisää videolinkin harjoitteelle

### Sprint 3–5 (kun pelaajat kirjaavat)
7. Harjoitekirjauksen Firestore-rakenne — tee oikein heti, AI tarvitsee myöhemmin:
```
seurat/{seuraId}/pelaajat/{pelaajaId}/kirjaukset/{pvm}/
  tyyppi: 'T'|'D'|'S'|'P'
  tehty: true|false
  kesto_min: 15
  rpe: 1-10
  aika: 'ilta'|'aamu'|'paiva'
  fiilinki: 1-5
streak_historia: []
joukkuetreenit: []
```

### Sprint 6–8 (kun dataa 2–4 viikkoa)
8. AI Behavioural Science -agentti
   - Arkkitehtuuri: Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä
   - Puhuu VAIN oikeaan aikaan:
     * Streak katkeamassa → proaktiivinen ilta-muistutus
     * 3pv putki → positiivinen vahvistus
     * Fiilinki matala 2pv → kysyy miten menee
     * Uusi viikko / kuukausi → fresh start -viesti
     * PHV-huippu → erityinen viesti (kehitä peliälyä nyt)
   - Käyttäytymistieteen periaatteet:
     * Habit loop (Duhigg 2012): cue → routine → reward
     * Implementation intention (Gollwitzer 1999): "milloin ja missä?"
     * Loss aversion (Kahneman): streak-freeze toimii jo tällä
     * Social proof (Cialdini): "3 muuta KPV:n pelaajaa teki eilen"
     * Temptation bundling (Milkman 2021): yhdistä harjoite mukavaan
     * If-then planning: "jos sää huono → seinäsyöttö sisällä"
     * Fresh start effect (Milkman 2014): uusi viikko = paras aika aloittaa
   - Ikäkohtainen ääni:
     * leikkija: "Hei! Muistitko ottaa pallon mukaan tänään? 🎮"
     * rakentaja: "Kolmas päivä putkeen. Illalla vielä pieni pallokosketus?"
     * showcase: "Streak 12pv. Walker 2017: ilta-T konsolidoituu unessa paremmin."
   - Vaatii min 2–4vk dataa ennen aktivointia
