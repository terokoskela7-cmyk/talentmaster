# Pelaajan FIFA-kortti — elinkaari + 5D-mäppäys (spec)

> Scoping 2026-06-15. Päätökset: **data-aware OVR joka terävöityy** + **FUT-estetiikka TM-5D-datalla**.
> Korvaa nykyisen `naytaFcOverlay()`-feikkikortin (FLEI-luku + kovakoodatut SHO/DEF/PAS).
> Periaate: **jokainen numero on oikeaa TM-dataa; kortti täyttyy ja terävöityy mittausten myötä = elinkaari.**
> Liittyy: §5 (design-tokenit) · §7.22 (pelaajalle ei lasku/loss aversion) · §14 (5D) · §2 RAE · §28 PHV-ikkunat · §26 pikakentät · §30 OVR.

---

## 1. KORTIN OSA-ALUEET = 5D, oikeasta datasta (0–99)

| Stat | Lähde (pikakenttä §26) | Normalisointi 0–99 | Huom |
|---|---|---|---|
| **D1 Fyysinen** | `d1_taso` (1–5; lin10m/30m/cmj/mas/kasirata Eerikkilä-ka) | `(taso−1)/4×99` | **PHV-tietoinen (§28): pre-PHV heikko nopeus/voima NEUTRAALI, ei punainen.** PRE/LAH → painota neuraaliset (kasirata,5/10m) + lattia, kehystä "kasvaa kun keho kehittyy" |
| **D2 Tekninen** | `tki_viimeisin` (jo 0–99!) U8–13; muuten `d2_taso`/TSI | TKI suoraan; d2_taso `(t−1)/4×99` | TKI on valmis 0–99-indeksi → lähes suora |
| **D3 Psyykkinen** | `d3_viimeisin` (5 osadim Likert 1–5) | `(ka−1)/4×99` | D3-kysely-saveToPlayer vielä stub → useimmilla **lukittu/tulossa** |
| **D4 Peliäly** | `adar_viimeisin.yht` (0–12) | `yht/12×99` | §26: luotettava vasta ≥3 havaintoa → alle sen "varhainen/rakentuu" (matala varmuus) |
| **D5 Sosiaalinen** | — (ei mittaria vielä) | — | **lukittu/tulossa** (tuleva: valmentaja-/ADAR-reflektio) |

**Lukittu-tila:** mittaamaton ulottuvuus = neutraali "🔒 Tulossa", EI feikkinumero, EI punainen (§7.22).

---

## 2. ISO LUKU (OVR) — data-aware, terävöityy

```
mitatut_dim = ne joilla riittävä data (D4 vaatii ≥3 havaintoa luotettavaksi)
jos mitatut_dim < 3:  EI kokonaislukua → "Kortti rakentuu" -tila + mitatut osa-alueet näkyvät
jos mitatut_dim ≥ 3:  OVR = RAE_kerroin × Σ(Dn × paino_n) / Σ(paino_n läsnä)
```
- **Painot (§30):** D1 0.40 · D2 0.25 · D3 0.15 · D4 0.10 · D5 0.10. Puuttuvat dim → painot renormalisoidaan läsnä olevien yli.
- **RAE-korjaus (§2, OLETUS aina):** syntymäneljännes → kerroin Q1 0.92 · Q2 0.96 · Q3 1.02 · Q4 1.06. Laske `syntymaaika`/`syntymaVuosi`+kk:sta.
- §7.22: pelaajalle näytetään vain luku + kasvu; **ei laskua punaisena, ei vertailua muihin.**

---

## 3. ELINKAARI — "elää matkan varrella"

1. **Terävöityminen:** lukitut osa-alueet täyttyvät kun pelaaja mitataan → kortti kirkastuu. Tämä on ydinmekaniikka.
2. **Tasot (tier):** Starter → Sharp → Elite (vrt. Solo `Kortti_Demo`). Kynnys = mitattujen dim määrä +/tai OVR. Visuaalinen ylennys.
3. **Tilannekuvat (historia):** tallenna kortin tila ajan yli (`kortti_historia[]`, vrt. olemassa `flei_historia`/`streak_historia`) → "kortti kasvoi" -vertailu. `new Date().toISOString()` (ei serverTimestamp arrayssa, §7.6).
4. **Traits (erikoismerkit) olemassa olevista signaaleista:** 🥇 Tekniikkamestari (`tki_merkki`) · 💎 Piilohelmi (Hidden Gem §30) · ★ X-Factor (taso 5) · ⚡ Varhaiskehittäjä (`tekninen_varhaiskehitys` U8–12 mitali §28) · 🔥 Streak (`_haeStreak`).

### Virstanpylväät (milestone-hetket — kortti reagoi)
| Hetki | Lähde (olemassa) | Korttitapahtuma |
|---|---|---|
| **Syntymäpäivä** | `_onkoSynttari`/`_synttariBanner`/`_synttariKonfetti` (toimii) | erikoiskehys + konfetti + "vuosi vanhempi" -kortti |
| Uusi TKI-mitali | `tki_merkki` muuttuu | trait-unlock-animaatio |
| PHV-vaihe vaihtuu | `phv_tila` | kehitysvaihe-merkki (positiivinen, ei uhka) |
| Uusi mittaus / dim avautuu | pikakentät | "osa-alue avattu" -kirkastus |
| Streak-ennätys | `_haeStreak` | 🔥-korostus |
| Kausiraja | `_laskeKausi` | kausikooste-kortti |

---

## 4. VISUAALI (designer-agentin brief)

- **Estetiikka:** FUT-tyylinen premium-kortti (flip front/back), mutta TM-design-tokeneilla (§5): tausta #111110, kortti #161614/#1C1C1A, aksentti teal #28B090, sekundääri sininen #2A5DB0, varoitus/elite-kulta amber #E0A040. Otsikot/luku **Cormorant Garamond**, body **DM Sans**.
- **Front:** iso OVR (tai "rakentuu"-tila) + pelipaikka + nimi + kuva/silhuetti + 5D-statsirivi (lukitut = 🔒).
- **Back:** "Miksi {OVR}?" + 5D-palkit + traits + kehitysvauhti (kasvu positiivisesti).
- **Tilat näytettävä mockupissa:** (a) "rakentuu" (<3 dim, esim. vain D2 mitattu — Topias-tyyppi), (b) "Elite" (täysi 5D), (c) syntymäpäivä-variantti.
- **§7.22:** ei XP/progressbar-painostusta, ei laskua punaisena, ei vertailua muihin. Kasvu ja vahvuus edellä.

---

## 5. AVOIMET / SEURAAVAT

1. Designer-agentti: huippumockup tämän speksin tiloista (a/b/c).
2. `rAdar()`-kytkentä → osaksi korttia/MINÄ-näkymää (nyt kuollut koodi).
3. D3-kysely `saveToPlayer()` → `d3_viimeisin` (avaa D3-statsin; ADAR-scopingin §3 -työ).
4. D5-mittari (myöhempi).
5. Toteutus Code-komennolla speksin + hyväksytyn visuaalin pohjalta (pikakentistä, ei alikokoelmakyselyjä §26).
6. **PHV-OVR-lattia:** PRE/LAH-tilassa D1 lasketaan OVR:ään raakana (paino .40) → late-developer putoaa epäreilusti (§28-vastainen). Korjaa lattia/neutralointi tai D1-painon pudotus ennen kuin seura saa ≥3 dim + PHV-datan. Ei live-vaikutusta nyt (0 pelaajaa ≥3 dim + phv).

---

## 6. v2-PÄIVITYKSET (2026-06-15 jatko)

**Kuva & avatar:** oletuksena **avatar (nimikirjaimet ympyrässä) / silhuetti / pelipaikkaikoni** + Suomenlippu — yksityisyysturvallinen, nolla kitkaa (vanhat kortit tekivät näin). **Oma valokuva valinnainen, huoltajan suostumuksen takana** (alaikäinen = henkilötieto, §33 B4) — ei koskaan pakollinen, vaatii moderoinnin. Pilottiin avatar; kuva myöhemmin.

**Jakomalli (käyttäjän linjaus):** jako sallittu **omalla luvalla luotetuille** — joukkuekaveri tai isovanhemmat — EI julkista/ulkoista broadcastia. Koskee sekä omaa korttia että keräilykortteja. Pelaaja hallitsee mitä jakaa (rParent-filosofia jo olemassa). Toteutus on latentti (ks. alla).

**Vanhojen korttien hyödynnettävät ideat (`Kortti_Demo.html` + `Kortit.html`):**
- **3-tasopaletit:** Starter (sininen) · Sharp (kulta) · Elite (platina) — frame-gradientti, hohto, body-bg per taso. → tier-elinkaari.
- **Animaatiot:** OVR pop-in · shimmer-pyyhkäisy · ikoni-float · **kipinät/burst tason noustessa** · reveal-flip (avaushetki). → virstanpylväs-hetket.
- **Avausmekaniikka:** "avaa kun taitosi kehittyvät" + 🔒 lukittu + kynnysarvot → motivaatio/elinkaari (§7.22-positiivinen, EI menetyskehys).
- **Keräily/idolitaso:** Huuhkajat/Helmarit/Veikkausliiga-kortit palkinto/inspiraatio (idoli-teema jo PIN-ruudussa).
- **Pelipaikkaikonit:** HYÖ/KHK/KK/PUO/MV.
- **⚠️ EI tuoda:** XP-palkki (§7.22 kieltää pelaajalle) · ulkoinen/julkinen jako (vain luotetut, ks. yllä).
- **Fontti:** designer-agentin valinta (Barlow Condensed urheilullinen vs Cormorant elegantti).

**Latentit ominaisuudet (rakennettu, ei käytössä — aktivoitavissa):**
- **Haasteet** (`rHaaste`, scene 'haaste'): UI valmis (Viikon teema · Kaverit 1v1 · Omat + vertaishaasteet + sosiaalinen todiste), sisäänkäynnit elävät — **demodatalla, ei kytketty oikeaan Firestore-vertaisdataan.**
- **Vapaa treeni** (`rVapaa`): kytketty, sis. kaveritägäys.
- **Jako:** filosofia + "jaa linkki vanhemmalle (tulossa)" — **toteutus puuttuu.** Tämä + kortin jako luotetuille = sama tuleva työ.
- Kuollut renderöijä `rAdar()`/`rAikajana()` (§ pohjustus) — kytkettävä.

**v2-designer-brief:** yhdistä uusi 5D-kortti + vanhojen tier-paletit (Starter/Sharp/Elite) + shimmer/kipinät/pop-in + avatar+lippu + lukittu→avautuu-mekaniikka. Tilat: rakentuu / Elite / synttäri + takapuoli. Fontti designerin valinta. Ei XP-palkkia.

---

## 7. LAPSI- JA NUORISONÄKÖKULMA — kehitysvaihesäännöt (KOVA, ÄLÄ OHITA)

> Lähde: käyttäjä (Palloliiton kansallisen ohjelman johtaja), 2026-06-15. Nämä ovat invariantteja, ei tyylivalintoja.

**1. PELIPAIKKAA EI LUKITA ENNEN U14:ää.** U13 ja nuoremmat pelaavat 8v8 pienellä kentällä; pedagoginen tavoite on **monipuolisuus** — eri pelipaikkojen kokeilu kehittää laajemmin. **Liian aikainen pelipaikan lukitseminen hidastaa kehitystä.**
- Kortti U13 ja nuoremmat: **ei kiinteää pelipaikkaa** → "Monipuolinen" / kaikki pelipaikat / ei position-merkkiä. (Pelipaikkaikonit HYÖsystem § ovat valinnaisia vasta U14+.)
- Kortti U14+: pelipaikka voi näkyä (siirtymä 11v11:een).
- Ikäportti `syntymaVuosi`/joukkueen ikäluokasta.

**2. KORTIN SIELU = TASAPAINO, EI KILPAILUN POISTO.** Urheilu ON kilpailua. Terve kasvu tarvitsee **kilpailua + sisäistä motivaatiota + oikea-aikaista palautetta + tukea + unelmia** — yhdessä.
- Pelaajalle: matka/kasvu + tuki näkyvät (Dweck prosessikehu, SDT) — JA kilpailu/aspiraatio on tervetullutta: tasot, traitit, haasteet, **idolit & unelmat** (Bellingham-teema, keräilykortit = "unelma-moottori"), omat tavoitteet.
- **Oikea-aikainen palaute:** kortti/ADAR/tekniikka päivittyy mittauksista nopeasti (ei viiveellä).
- Raja: ei paremmuusjärjestystä/leaderboardia eikä menetyskehystä (§7.22) — mutta aspiraatio ("haluan Eliteen", oma idoli, unelmapelipaikka) on moottori, ei kielletty.

**3. D3 (Psyykkinen) + D5 (Sosiaalinen) = SEURAVETOINEN AVAUS.** Nämä ovat vaikeimmat mitata ja **aukeavat VAIN jos seura ottaa instrumentit käyttöön** (D3-kysely, sosiaalinen arviointi).
- Lukko-kehys: **"Seurasi ei ole vielä avannut tätä osa-aluetta"** — EI lapsen puute/vaje. Klubi-gated, ei pelaaja-deficiency.
- Eli D3/D5 saavat olla lukossa pitkäänkin — kunhan syy kehystetään oikein (seuran valinta, ei lapsen epäonnistuminen).

**4. PHV lapsen kielellä (§28, täydentää §1 D1):** pre-PHV matala fysiikka → kortilla positiivinen kehitysviesti ("kehosi kasvaa vielä — voima ja nopeus tulevat myöhemmin"), ei matala punainen luku. Myöhään kehittyvä (usein lahjakas tekninen) ei saa lannistua.

**5. Lisäperiaatteet:** lapsen oma ääni/autonomia (oma tavoite/fokus, valinnat) · värikoodaus ei vain värillä (värisokeat) · statsi-labelit lapsen sanoin (Nopeus/Tekniikka, ei "D1") · "Miksi {OVR}?" keskeisenä (opettaa + luottamus) · aikuiselle (vanhempi/isovanhempi) jaettava versio korostaa tukea/kasvua, ei arvosanaa (vähentää painetta, §16).
