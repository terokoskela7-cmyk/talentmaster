# CODE_OHJE — Salasanan palautus: "Unohditko salasanan?" + WhatsApp-suositus

**Tyyppi:** näyttö + client-auth (EI uutta CF / skeemaa / Rules) · **Kohteet:** `TalentMaster_VP_v25.html`,
`TalentMaster_Master_v16.html`, `TalentMaster_Seura.html`, `TalentMaster_Admin.html`. **Base:** `main`. **Pieni PR.**

## Tausta
Salasanan reset on nyt vain VP/admin-käynnistettävä. Login-sivuilla ei ole self-service "Unohditko
salasanan?" -linkkiä (varmistettu: 0 kpl). Putki on jo olemassa: **`tm_auth.js` →
`TmAuth.lahetaSalasana(email, naytaToast)`** (kutsuu `sendPasswordResetEmail` + toast + virhekäsittely).

**Skanneri-ongelma (juurisyy, todennettu):** reset-linkki lähetetään sähköpostiin, ja organisaatio-osoitteiden
(esim. `…@sibbo-vargarna.fi`) turvaskannerit **avaavat linkin automaattisesti** ja kuluttavat kertakäyttökoodin
ennen käyttäjää → "expired/already used". **WhatsApp-jako kiertää tämän** (todennettu livenä: sama linkki toimi
WhatsAppilla). Siksi kaksi täydentävää osaa:

---

## Osa 1 — Login-sivun self-service "Unohditko salasanan?"

### 1.1 — Linkki neljään login-ruutuun
Lisää login-lomakkeen alle (kirjaudu-napin jälkeen) hienovarainen tekstilinkki **"Unohditko salasanan?"**
(teal, `font-size:12px` — design-lukko, molemmat teemat). Login-kenttien id:t:
- **VP_v25** (~1887): email `#lEmail` · salasana `#lPass`
- **Master_v16** (~1303): email `#lEmail` · salasana `#lPass`
- **Seura** (~447): email `#emailInput` · salasana `#salasanaInput`
- **Admin** (~214): email `#emailInput` · salasana `#salasanaInput`

### 1.2 — Klikkauslogiikka
1. Lue email-kenttä. Tyhjä → ohje "Syötä ensin sähköpostiosoite kenttään", ÄLÄ lähetä.
2. Kutsu **`TmAuth.lahetaSalasana(email, naytaToast)`** (tai app-oma `auth.sendPasswordResetEmail`, Seura
   käyttää jo tätä ~3728). **Älä duplikoi uutta reset-logiikkaa.**
3. Onnistuessa toast: **"Salasanalinkki lähetetty: <email> — avaa se heti."**

### 1.3 — Skanneri-vinkki
Onnistumis-toastin yhteyteen lyhyt ohje (ink3): *"Jos työsähköpostisi estää linkin ('expired/already used'),
pyydä valmennuspäällikköä jakamaan linkki WhatsAppilla."* (Login-sivu on kirjautumaton → ei pääse
puhelinnumeroon, joten WhatsApp-jako ei ole täällä mahdollista — vain tämä vinkki.)

---

## Osa 2 — VP-jakomodaali: suosittele WhatsAppia kun puhelin on tallennettu
**Kohteet:** `TalentMaster_Seura.html` (reset-jako-modal ~3760) + `TalentMaster_Admin.html` (vastaava jako).
**WhatsApp-jako on JO olemassa** — `_resetJaaWhatsapp` lähettää linkin suoraan numeroon (`wa.me/<numero>`,
`window._resetPuhelin` = suuntakoodi + puhelin). **Älä rakenna uutta jakoa** — lisää vain suositus.

### 2.1 — Suositusnudge kun puhelin on
Kun `window._resetPuhelin` on olemassa (henkilöllä tallennettu puhelin), reset-jako-modaalissa:
- **Nosta 💬 WhatsApp -nappi ensisijaiseksi** (teal-täyttö/korostus), 📧 sähköposti toissijaiseksi.
- Lisää vihje modaalin yläosaan: *"💡 Suositus: jaa WhatsAppilla. Työsähköposti voi estää kertakäyttölinkin
  (skanneri avaa sen ennen käyttäjää → 'expired/already used')."*
- Kun puhelin **puuttuu** → jako ennallaan (📧/📋 + yleinen `wa.me/?text=`), ei nudgea.

### 2.2 — Ei muuta logiikkaa
`lahetaResetLinkki`-CF, linkin generointi ja `wa.me`-jako ennallaan. Vain nappien painotus + vihjeteksti
muuttuvat, ja vain kun puhelin on tallennettu.

---

## Reunaehdot
- **Ei uutta CF / skeemaa / Rules.** Käytä olemassa olevaa `sendPasswordResetEmail`:iä (Osa 1) ja
  `_resetJaaWhatsapp`/`wa.me`-jakoa (Osa 2 vain painottaa sitä).
- **Ei Pelaaja/Vanhempi** — PIN-kirjautuminen, ei salasanaa. Vain henkilöstön 4 login-ruutua + jakomodaalit.
- **Design-lukko + molemmat teemat.** Osa 1 hienovarainen tekstilinkki; Osa 2 teal-korostus WhatsApp-napille.
- **Ei `?v=`-bumppia** jos `tm_auth.js` ei muutu (vain HTML-UI).

## Definition of Done
- **L1:** Osa 1 — "Unohditko salasanan?" -linkki 4 login-ruudussa, kutsuu olemassa olevaa reset-funktiota,
  tyhjä email → ohje, toast + skanneri-vinkki. Osa 2 — reset-jako-modaali suosittelee WhatsAppia + korostaa
  💬-napin kun `_resetPuhelin` on; ennallaan kun puhelin puuttuu. Ei uutta reset/jako-logiikkaa, ei CF/skeema/Rules.
- **L2:** kevyt (helperit ennallaan); tyhjä-email-tarkistus testattavissa jos eristetään. ~883+ vihreä.
- **L3 (elävä, molemmat teemat):**
  - Login: "Unohditko salasanan?" → tyhjä email ohje; email → toast "avaa se heti" + vinkki. (Testiosoite, ei alaikäistä/tuotantoa.)
  - VP-jako henkilölle jolla **on puhelin** → modaali suosittelee WhatsAppia, 💬 korostettu, `wa.me/<numero>` avautuu.
  - VP-jako henkilölle jolla **ei puhelinta** → ennallaan (📧/📋).
- Pieni PR. Molemmat teemat.
