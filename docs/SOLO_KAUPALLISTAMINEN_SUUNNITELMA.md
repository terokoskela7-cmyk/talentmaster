# TalentMaster Player™ (Solo) — kaupallistamissuunnitelma

> Laadittu 2026-06-25. Solo B2C ("Player™") kaupalliseen kuntoon. Päätökset (lukittu): **PWA-first + Stripe ·
> vanhempitili + lapsiprofiilit (vanhempi maksaa + suostuu) · avoin Suomi-lanseeraus.**
> Täydentää: CLAUDE.md §8 (Solo-tiedostot), ARKKITEHTUuri.md §11, KORTTI_VISIO/KATALOGI (§36 = retentiomoottori).

---

## 0. Nykytila (kartoitus 2026-06-25)
**Solo = hiottu frontend-prototyyppi (~60 %), kaupallinen perusta puuttuu kokonaan.**
- ✅ Toimii: `Player_Home` (onboarding splash→nimi→synt→kortti), `Solo_Profiili` (profiili, tkk-tulokset, kotimittarit, edistymismittari), `Kortti_Demo` (FIFA-kortti). **Kaikki localStorage-only.**
- ❌ Puuttuu: **tili/auth** (ei Firebase Authia, ei cross-deviceä) · **backend-datakerros** (ei `players/`-kokoelmaa) · **maksut** (ei Stripeä/paywallia/entitlementtiä) · **GDPR/suostumus Solo-puolelle** (ei ikäporttia eikä vanhempaislupaa) · **PlayerCode-silta** (koodi generoituu+näkyy, ei backend-kytkentää) · **alkuarviointi** (`Solo_Arviointi` puuttuu) · **PWA** (ei SW/manifestia).
- **LocalStorage-avaimet:** `tm_player_code` · `tm_solo_profiili` · `tm_tkk_historia`.

**Johtopäätös:** frontend on hyvä pohja; "kaupalliseen kuntoon" = käytännössä **koko backend + tili + maksu + compliance** rakennetaan frontendin päälle.

---

## 1. Kaupallisen valmiuden pilarit (mitä "valmis" vaatii)
| # | Pilari | Sisältö |
|---|---|---|
| A | **Identiteetti & tili** | Firebase Auth **vanhempitili** (email + Google), **lapsiprofiilit** tilin alla, cross-device-synkka |
| B | **Datakerros** | localStorage → Firestore (`players/{playerId}` vanhemman alla), kertamigraatio laitedatasta tilin luonnissa, Rules, offline (PWA + Firestore offline) |
| C | **Maksut** | Stripe Checkout (tilaus 4,99 €/kk + ilmaiskokeilu), Customer Portal (peruutus/lasku), webhook-CF → entitlement-kenttä, paywall/free-vs-paid-gating |
| D | **Compliance (GDPR, alaikäiset B2C)** | vanhempaislupa (Art. 8; **FI ikäraja 13**), ikäportti, tietosuojaseloste + käyttöehdot, datan vienti + oikeus tulla unohdetuksi (RTBF — hyödynnä klubin CF-malli), retention, DPA:t (Stripe/Firebase), EU-kuluttajansuoja (14 pv peruutusoikeus digitilaukseen) |
| E | **Tuote / arvosilmukka** | `Solo_Arviointi` (alkuarviointi 3-kerrosta — puuttuu), **kortti-progressio + keräily (§36 = retentiomoottori, jo suunniteltu)**, kotimittarit-silmukka, tekniikkakilpailu-tuonti, Tänään-tehtävät (harjoitelogiikka §A7), behavioural-nudge (AI-agentti) |
| F | **Club-bridge** | PlayerCode `TMP-XXXX` → oikea backend-kytkentä: Solo jakaa seuralle → seuran testitulokset valuvat Solo-profiiliin + `seuraId` täyttyy (kaksisuuntainen arvo, B2B2C) |
| G | **PWA / infra** | manifest + service worker (asennettava, offline), suorituskyky, version/cache-kuri (kuten klubilla) |
| H | **Go-to-market** | suppilo (splash→signup→trial→paid), hinnoittelusivu, onboarding, tuki, konversio-analytiikka, web-jakelu (asennuskehote, ei app-store-löydettävyyttä → markkinointi vetää) |

---

## 2. Arkkitehtuuriperiaate — hyödynnä klubi-infra, ÄLÄ rakenna uudestaan
Solo = **uusi frontend + vanhempitili + `players/`-kokoelma + Stripe**, EI uutta domain-logiikkaa. Jaa klubin kanssa:
- **Firebase-projekti** (sama `talentmaster-pilot`), **Auth**, **Cloud Functions** (europe-west1) + **Secret Manager**, **Sentry** (§33), turvaverkko (CI/testit/backup/rules-deploy N1–N4).
- **Domain-libit:** `docs/testit_indeksit.js` (tekniikka-/TKI-indeksit), `tm_bioika.js` (bio-ikä), **kortti-logiikka §36** (keräily/progressio), harjoitegeneraattori §A7.
- **RTBF/export-CF-malli** (klubin GDPR-työ) → Solo-versio samasta pohjasta.
> Tämä pitää Solon kevyenä yhdelle kehittäjälle ja varmistaa että metodologia on identtinen klubin kanssa (sama tiede, sama kortti).

---

## 3. Faasi-roadmap (riippuvuus- + riskijärjestys)

### P0 — Perusta: tili + data + compliance (EI vielä maksuja)
*Tavoite: oikeat tilit, cross-device, lainmukainen data — ilmaiseksi. Tämä on pakko ennen kaikkea muuta.*
- **A — Vanhempitili:** Firebase Auth (email + Google). Tietomalli: `parents/{uid}` → `children/{childId}` (tai `players/{playerId}` jossa `parent_uid`). Lapsiprofiilit tilin alla.
- **B — Datakerros + migraatio:** `players/{playerId}` Firestore (vanhemman alla) + Rules (vain oma vanhempi lukee/kirjoittaa). **Kertamigraatio:** tilin luonnissa siirrä olemassa oleva localStorage-data (`tm_solo_profiili`/`tm_tkk_historia`) tiliin — ettei laitekäyttäjä menetä dataa.
- **D — GDPR (gate launchille):** ikäportti + vanhempaislupa (Art. 8, FI 13v), tietosuojaseloste + käyttöehdot, RTBF + export -CF (klubin malli). **DPO/juridiikka-katselmus ENNEN julkaisua** (sama portti kuin klubin B4).
- **G — PWA-kuori:** manifest + service worker (asennettava, offline) — halpa, tee aikaisin.
- *Lopputulos: oikeat tilit + lainmukainen data, ilmainen.*

### P1 — Maksut + paywall
*Tavoite: tulovirta.*
- **C — Stripe:** Checkout (tilaus 4,99 €/kk + ilmaiskokeilu esim. 14 pv), Customer Portal (peruutus/maksutavat/laskut), **webhook-CF** → `entitlement` (active/trialing/canceled) vanhemman tiliin. Stripe hoitaa PCI:n; vanhempi on ostaja (alaikäinen ei tee sopimusta).
- **Free vs paid -määrittely:** mikä on ilmaista (esim. profiili + 1 kortti-taso + kotimittarit), mikä maksullista (täysi kortti-progressio + arviointi + Tänään-tehtävät + club-bridge?). Validoi maksuhalukkuus.
- EU-kuluttajansuoja: 14 pv peruutusoikeus digitilaukseen (käsittely + ehto).
- *Lopputulos: maksava tuote.*

### P2 — Arvosilmukka + retentio (tuote joka pitää)
*Tavoite: sticky tuote, matala churn, B2B2C-silta.*
- **E — `Solo_Arviointi`** (alkuarviointi 3-kerrosta — puuttuva onboarding-arvo): antaa lähtötason + ensimmäisen kortin merkityksen.
- **Kortti-progressio + keräily (§36):** matkamerkit/ennätykset/legendat = **retentiomoottori** (jo suunniteltu klubipuolelle → tuo Soloon). Tämä on se mikä saa lapsen palaamaan.
- **Kotimittarit-silmukka + tekniikkakilpailu-tuonti + Tänään-tehtävät** (harjoitelogiikka §A7) Soloon.
- **Behavioural-nudge** (AI-agentti, Sprint 6 -malli): streak/paluu, §7.22-turvallinen.
- **F — Club-bridge oikeaksi:** PlayerCode → backend-kytkentä (Solo jakaa seuralle → tulokset valuvat + `seuraId`). Kaksisuuntainen arvo + kasvukanava (seurat tuovat Solo-käyttäjiä ja päinvastoin).
- *Lopputulos: pitää käyttäjät, B2B2C-vipuvarsi.*

### P3 — Skaalaus + GTM (avoin lanseeraus)
*Tavoite: avoin FI-markkina.*
- **H — Suppilo + hinnoittelusivu + onboarding-optimointi.**
- **Konversio-/retentio-analytiikka** (mikä konvertoi, churn-kohdat) — §7.22-turvallinen.
- **Tuki + skaalaus** (Firestore-kustannus, suorituskyky, asennuskehote).
- **Soft-launch-portti (suositus):** vaikka päätit avoimen lanseerauksen, tee se **vaiheittain** — suljettu beta / jonotuslista → GA. Pienentää yhden kehittäjän riskiä + antaa korjata ennen massaa.

---

## 4. Kriittiset riskit
1. **GDPR alaikäiset B2C = suurin riski.** Avoin lanseeraus = täysi compliance ennen julkaisua: vanhempaislupa (Art. 8, FI 13v), tietosuojaseloste, RTBF/retention, DPA:t. **Ei-neuvoteltava: DPO/juridiikka-katselmus ennen GA:ta.** (Sama portti kuin klubin B4 — nyt vain B2C-mittakaavassa.)
2. **Maksut + alaikäiset:** vanhempi ostaja (päätetty) → puhdas. Stripe = PCI. Peruutus (Customer Portal) + EU 14 pv -peruutusoikeus.
3. **localStorage → tili -migraatio:** olemassa olevat laitekäyttäjät eivät saa menettää dataa tilin luonnissa. Kertaluonteinen, idempotentti.
4. **Yhden kehittäjän kaistanleveys + avoin lanseeraus = laajin scope.** Mitigaatio: P0→P3 vaiheittain + soft-launch-portti P3:ssa (älä avaa massalle ennen kuin arvosilmukka + compliance todistettu).
5. **Free vs paid -arvo:** 4,99 €/kk vaatii vakuuttavan arvon (kortti-progressio + arviointi + Tänään + club-bridge). Validoi P1:ssä ennen P3-markkinointia.
6. **Ei app-store-löydettävyyttä (PWA):** välttää IAP/kids-policyn, mutta markkinoinnin pakko vetää asennukset (suora linkki + asennuskehote + seura-kanava).

---

## 5. Suositeltu aloitus (P0 ensimmäinen siivu)
1. **Vanhempitili-auth + `players/`-datakerros + localStorage-migraatio** — perusta jonka päälle kaikki muu rakentuu. (A+B)
2. **GDPR-suostumusflow rinnalla** (D) — koska compliance on launch-portti, sitä ei voi jättää loppuun.
3. **PWA-kuori** (G) — halpa, aikaisin.
4. Vasta tilien jälkeen **Stripe** (P1).

> Työnkulku: jokainen siivu haara → PR → vihreät testit → merge (branch protection). Rules-muutokset → N4-auto-deploy. Funktiot manuaalisesti (`firebase deploy --only functions`) kunnes backlog #50.

---

## 6. Avoimet päätökset (myöhempiä, ei estä P0:aa)
- Free vs paid -rajan tarkka sisältö (P1).
- Ilmaiskokeilun pituus (7/14 pv).
- Tietomalli: `parents/{uid}/children/{id}` vs litteä `players/{id}` + `parent_uid` (suositus: jälkimmäinen, yhteensopiva olemassa olevan `players/`-vision kanssa ARKKITEHTUURI §11).
- Domain: oma `player.talentmasterid.com` vai reitti.
