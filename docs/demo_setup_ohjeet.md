# Demo FC — Firestore-asennusohjeet
# Tee nämä järjestyksessä Firebase Consolessa

## VAIHE 1: Luo VP-käyttäjä Firebase Authentication -konsolissa

1. Mene https://console.firebase.google.com → talentmaster-pilot → Authentication → Users
2. Klikkaa "Add user"
3. Email: vp.demo@talentmaster.fi
4. Password: TM_Demo_2026!
5. Kopioi luotu UID talteen — tarvitset sen seuraavassa vaiheessa

## VAIHE 2: Luo seura-dokumentti Firestoreen

1. Mene Firestore → Data → + Start collection
   - Collection ID: seurat
   - Document ID: demo-fc
2. Lisää kentät (kaikki String, paitsi erikseen mainitut):
   - id = "demo-fc"
   - nimi = "Demo FC"
   - laji = "jalkapallo"
   - paketti = "kehitystaso"
   - kaupunki = "Tampere"
   - maa = "FI"
   - aktiivinen = true (Boolean)
   - vp_email = "vp.demo@talentmaster.fi"
   - vp_uid = [KOPIOI VAIHE 1:N UID TÄHÄN]
   - max_pelaajia = 300 (Number)

3. Lisää tilastot-map (klikkaa "Add field" → valitse tyyppi "map"):
   - tilastot.pelaajia = 3 (Number)
   - tilastot.joukkueita = 1 (Number)
   - tilastot.kartoituksia = 3 (Number)

## VAIHE 3: Luo kolme pelaajaa

Navigoi: seurat → demo-fc → + Start collection → "pelaajat"

### Pelaaja 1: Aleksi Virtanen (X-Factor, Railgun)
Document ID: demo-p001
```
nimi = "Aleksi Virtanen"            (String)
sukupuoli = "poika"                 (String)
syntymavuosi = 2012                 (Number)
ika = 13                            (Number)
joukkue = "Demo U13"                (String)
positio = "KHK"                     (String)
PHV_vaihe = "pre-PHV"               (String)
RAE_kvartiili = "Q2"                (String)
FLEI_pct = 84                       (Number)
TSI = 0.22                          (Number)
ADAR_pisteet = 10                   (Number)
IDP_taso = "laajennettu"            (String)
X_Factor_signaali = true            (Boolean)
X_Factor_tyyppi = "Tekniikka-XF"    (String)
profiilityyppi = "Railgun"          (String)
profiili_mastery = "Sharp"          (String)
D1_fyysinen = 34                    (Number)
D2_tekninen = 21                    (Number)
D3_psykologinen = 13                (Number)
D4_kognitiivinen = 9                (Number)
D5_sosiaalinen = 8                  (Number)
D_yhteensa = 85                     (Number)
kotitehtava_streak = 12             (Number)
```
Map: flei_viimeisin
```
  pct = 84        (Number)
  taso = "hyvä"   (String)
  pvm = "2026-02-15"  (String)
  ikaluokka = "U15"   (String)
```
Map: ketjupisteet
```
  SBL = 2.7   (Number)
  SFL = 2.4   (Number)
  LL = 1.5    (Number)
  SL = 2.5    (Number)
  DFL = 2.3   (Number)
  FL = 2.1    (Number)
  heikoin = "LL"    (String)
  vahvin = "SBL"    (String)
```

### Pelaaja 2: Eeli Korhonen (PHV-huippu, prioriteetti)
Document ID: demo-p002
```
nimi = "Eeli Korhonen"              (String)
sukupuoli = "poika"                 (String)
syntymavuosi = 2012                 (Number)
ika = 13                            (Number)
joukkue = "Demo U13"                (String)
positio = "KP"                      (String)
PHV_vaihe = "PHV-huippu"            (String)
PHV_varoitus = true                 (Boolean)
PHV_kuormarajoitin = "max 60%"      (String)
RAE_kvartiili = "Q3"                (String)
FLEI_pct = 58                       (Number)
TSI = 0.48                          (Number)
ADAR_pisteet = 7                    (Number)
IDP_taso = "perus"                  (String)
X_Factor_signaali = false           (Boolean)
D1_fyysinen = 24                    (Number)
D2_tekninen = 16                    (Number)
D3_psykologinen = 11                (Number)
D4_kognitiivinen = 7                (Number)
D5_sosiaalinen = 7                  (Number)
D_yhteensa = 65                     (Number)
kotitehtava_streak = 3              (Number)
```
Map: flei_viimeisin
```
  pct = 58                  (Number)
  taso = "prioriteetti"     (String)
  pvm = "2026-02-15"        (String)
  ikaluokka = "U15"         (String)
```
Map: ketjupisteet
```
  SBL = 1.8   DFL = 1.2   heikoin = "DFL"
  SFL = 1.5   FL = 1.5    vahvin = "SBL"
  LL = 1.3
  SL = 1.6
```

### Pelaaja 3: Matias Leinonen (U12, Q4-pelaaja)
Document ID: demo-p003
```
nimi = "Matias Leinonen"            (String)
sukupuoli = "poika"                 (String)
syntymavuosi = 2013                 (Number)
ika = 12                            (Number)
joukkue = "Demo U13"                (String)
positio = "HYK"                     (String)
PHV_vaihe = "pre-PHV"               (String)
RAE_kvartiili = "Q4"                (String)
FLEI_pct = 71                       (Number)
TSI = 0.31                          (Number)
ADAR_pisteet = 8                    (Number)
IDP_taso = "perus"                  (String)
X_Factor_signaali = false           (Boolean)
D1_fyysinen = 28                    (Number)
D2_tekninen = 18                    (Number)
D3_psykologinen = 12                (Number)
D4_kognitiivinen = 8                (Number)
D5_sosiaalinen = 7                  (Number)
D_yhteensa = 73                     (Number)
kotitehtava_streak = 7              (Number)
```
Map: flei_viimeisin + ketjupisteet samoin kuin yllä (arvot JSON-tiedostossa)

## VAIHE 4: Firestore Security Rules — lisää demo-fc

Nykyiset rules EIVÄT välttämättä salli lukea demo-fc:tä ilman kirjautumista.
Lisää tämä rules-tiedostoon (tm_admin/firestore.rules):

```
// Demo-seura — sallitaan lukeminen ilman autentikointia (demo-käyttö)
match /seurat/demo-fc/{document=**} {
  allow read: if true;
}
```

VAIHTOEHTO (turvallisempi): Kirjaudu vp.demo@talentmaster.fi -tunnuksilla
normaalisti VP-dashboardiin — se toimii automaattisesti kun vp_uid täsmää.

## VAIHE 5: Lisää custom claim VP:lle

Firebase Consolessa ei voi lisätä custom claimeja suoraan — 
tarvitaan Cloud Function tai Admin SDK. 

HELPOIN TAPA: Käytä olemassa olevaa super-admin-tiliä (talentmasterid@gmail.com)
kirjautumiseen ja lisää demo-fc sen kautta näkyviin.

TAI: Lisää demo-fc:n VP-käyttäjälle custom claim GitHub Actionsin kautta.

## VAIHE 6: Testaa

VP-dashboard: vp.demo@talentmaster.fi / TM_Demo_2026!
→ Pitäisi näyttää Demo FC:n kartoitukset ja pelaajat

IDP-kortti suoraan: 
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_IDP_Kortti_v3.html?seuraId=demo-fc&pelaajaId=demo-p001
→ Aleksi Virtanen, FLEI 84%, Railgun Sharp, ketjupisteet

