# Onboarding "Aloita tästä" (slice 3) — spec

> Scoping 2026-06-17. Selkeys/mobiili-kaaren 3. siivu (slice 1 Master Koti · slice 2 VP · slice 3 onboarding).
> Liittyy: `docs/SELKEYS_IA_SPEC.md §4` · §6 (mobiili-invariantti) · §16/§19 (roolinäkymät) · §29 (suljettu silmukka).
> Periaate: strangler — kevyt overlay olemassa olevien funktioiden päälle, ei datamallimuutosta. Vain valmentaja + VP.

---

## 1. TAVOITE

**Aktivointi / time-to-first-value.** Ensikäynnillä rooli tekee **yhden merkityksellisen toimenpiteen**, joka (a) opettaa tuotteen ydinarvon ja (b) **synnyttää dataa** — tämä ratkaisee samalla cold-start-ongelman (pilottidata on harvaa, näkymät tyhjiä ilman ensimmäisiä havaintoja/viestejä).

- **Ei tyhjää dashboardia ensikäynnillä** — tyhjä Koti → opastettu polku.
- **Mitattava onnistuminen:** ensimmäinen havainto/viesti tehty ensi-istunnossa; onboarding-läpäisy-%.
- **Ei kuormita kokenutta:** näkyy vain kerran, ohitettavissa, palautettavissa "Ohje"-napista.

---

## 2. PERIAATE

- **Tasan 3 askelta.** Jokainen = 1 lause + 1 nappi joka vie **suoraan oikeaan toimintoon** (ei selitystä, vaan tekeminen). Edistymismerkki "1/3".
- **Skippable** ("Ohita") + **vain kerran** (localStorage-lippu per rooli+uid) + **palautettavissa** ("Ohje"/"Aloita tästä" -nappi).
- **Mobiili-ensin:** täysleveä sheet mobiilissa, keskitetty kortti desktopilla. Teema-CSS-muuttujat (vaalea+tumma). §6: ei uutta erillistä `@media(768)`-lohkoa jos vältettävissä (käytä olemassa olevaa).

---

## 3. PER-ROOLI POLUT (3 askelta)

**Valmentaja (Master):**
1. **Havainnoi 1 pelaaja** → ADAR-kenttätyökalu (`openDrill('adar')`)
2. **Katso hänen korttinsa** → pelaajan kehityskortti (Pelaajat / `renderDev`)
3. **Lähetä perheelle 1 viesti** → perheviesti (`sendReply`)
→ "Olet valmis. Koti näyttää jatkossa mitä sinun pitää tehdä."

**Valmennuspäällikkö (VP):**
1. **Katso joukkuepulssi** → `avaaJoukkueSyvanakyma`
2. **Avaa 1 pelaajan syvänäkymä** → per-pelaaja (`_jspModal`)
3. **Lähetä 1 mentorointiviesti valmentajalle** → `lahetaMentorointiViesti`
→ "Olet valmis. Koti kokoaa kriittiset signaalit toimenpiteiksi."

---

## 4. ASKELEEN KUITTAUS (suositus: hybridi)

- Nappi vie toimintoon; **askel merkitään tehdyksi kun toiminto onnistuu** (havainto tallentui / viesti lähti / syvänäkymä avattu). 
- Aina myös **"Ohita askel"** (ei pakkoa — sisarukset/datapuute/oma tahti).
- Yksinkertaisin fallback jos auto-detect on raskas: manuaalinen **"Seuraava"** kun käyttäjä palaa. Pilotissa kevyt riittää.

---

## 5. TEKNINEN (strangler, ei datamallimuutosta)

- Uusi kevyt **onboarding-overlay** Master + VP. Lukee `rooli` → näyttää oikean 3-askelisen polun.
- Napit kutsuvat **olemassa olevia funktioita** (openDrill/setWs/avaaJoukkueSyvanakyma/sendReply/lahetaMentorointiViesti) — ei uutta logiikkaa.
- Tila: `localStorage['tm_onb_<rooli>_<uid>'] = 'done'`. Ei Firestorea (pilotissa client-tila riittää; cross-device myöhemmin jos tarve).
- **Koti-tyhjätila kytketään:** kun Koti ei näytä signaaleja/dataa → "Aloita tästä" -CTA avaa saman polun (yhdistää onboardingin ja tyhjätilan).
- §6: ei riko mobiili-invarianttia; sheet käyttää olemassa olevia teema-/responsiivisuusrakenteita.

---

## 6. RAJAUS

- **Vain valmentaja + VP.** Pelaaja/Vanhempi: oma onboarding (Player_Home splash) on jo → ei tässä.
- Ei gamification-XP:tä, ei pakotettua läpikäyntiä (§7.22-henki: kannustava, ei painostava).

---

## 7. SEKVENSSI

1. **Valmentaja-onboarding** ensin (Master, jossa Koti + ADAR-launcher jo on).
2. **VP-onboarding** perään (sama kuvio).
3. Kytke molempien Koti-tyhjätilaan.

Verifiointi: `new Function` 0 virhettä · `npm test` vihreä · §6 yksi `@media(768)` säilyy · mobiilissa täysleveä sheet, napit vievät oikeaan toimintoon · localStorage-lippu estää toiston · "Ohita" toimii · version:bump (Master) / cache (VP) · push.
