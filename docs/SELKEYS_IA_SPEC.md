# Selkeys & mobiili — informaatioarkkitehtuuri (IA-spec)

> Scoping 2026-06-17. Käänne: rakentamisesta selkeyteen. Ongelma: liikaa sivuja, ei skaalaudu kännykässä, analytiikka ilman toimenpidepolkua, ei aloitusopastusta.
> Periaate-päätös (Tero): **yksi rooli → yksi mobiilietusivu → "mitä sinun pitää tehdä nyt" → toimenpide yhdellä napilla.** Analytiikka porautumisen takana.
> Toteutustapa: **strangler** — uusi mobiilikuori + etusivu käärii olemassa olevat render-funktiot (Kehitys/Pulssi/syvänäkymä jne.). EI monoliitin uudelleenkirjoitusta. Koskee: Master_v16 (valmentaja) + VP_v25 (valmennuspäällikkö).
> Liittyy: §6 (mobiili-invariantti, yksi @media/tiedosto), §19 (VP-työtilat), §29 (suljettu silmukka), §30 (signaalit), käytettävyysarvio 2026-06-17.

---

## 1. PERIAATTEET (molemmat roolit)

1. **Toimenpide-ensin.** Etusivu vastaa "mitä minun pitää tehdä", ei "tässä on dataa". Jokainen signaali/oivallus kantaa **CTA-napin**.
2. **Mobiili-ensin.** Alalaidan tab-bar (4 kohtaa). Täysleveät kortit, ei ahtaita modaaleja. Kosketuskohteet ≥44px. **§6: yksi `@media(max-width:768px)` per tiedosto.**
3. **Vähemmän sivuja.** 6–8 työtilaa → **4 tab-kohtaa**; loput porautumisen takana, ei ylätason naviin.
4. **Johda vastauksella, ei datalla.** Popup/näkymä aloittaa johtopäätöksellä ("Heikoin: syöttö, 6/14") + toimenpide; raakadata on alempana / auki klikattaessa.
5. **Tyhjätila opastaa.** Ei dataa → "tee tämä seuraavaksi", ei tyhjää ruutua.
6. **Aloitusopastus.** Ensimmäinen kirjautuminen → "Aloita tästä" 3 askelta, ei tyhjää dashboardia.

---

## 2. VALMENTAJA (Master_v16) — IA

### Tab-bar (4)
| Tab | Sisältö | Käärii (olemassa) |
|---|---|---|
| **Koti** | "Mitä sinun pitää tehdä" -toimenpidekortit + joukkueen tilanne -strippi | Inbox + Tänään + top-signaalit yhdistettynä |
| **Pelaajat** | Pelaajalista → kehityskortti (D1/D2 + per-test + resepti) | `renderDev` / `_renderPinfoFirestore` (jo olemassa) |
| **Havainnot** | ADAR-kenttätyökalu + havaintohistoria | ADAR_Pikakortti-launcher + havainnot |
| **Viestit** | VP-viestit + perheviestintä | Inbox-viestiosa + sendReply |

Porautumisen takana (ei naviin): Pulssi (→ Koti-strippi + drill), Kausi, Testit-työkalu (→ "Työkalut"-valikko).

### Koti — toimenpidekortit (data→toimenpide)
| Signaali | Kortti | CTA |
|---|---|---|
| N pelaajaa ilman ADAR-havaintoa (30 pv) | "3 pelaajaa ilman havaintoa" | **Havainnoi** → ADAR |
| VP-mentorointiviesti lukematta | "Viesti valmennuspäälliköltä" | **Avaa** |
| N pelaajaa passiivisena (ei kirjausta/vko) | "2 passiivista" | **Viestitä** → perhe |
| Heikoin kehityskohde joukkueessa | "Syöttö heikoin 6/14" | **Luo treeniteema** / katso resepti |
| FLEI<40 (kun dataa) | "Klinikkalähetys" | **Lähetä klinikkaan** |

---

## 3. VALMENNUSPÄÄLLIKKÖ (VP_v25) — IA

### Tab-bar (4)
| Tab | Sisältö | Käärii (olemassa) |
|---|---|---|
| **Koti** | Kriittiset signaalit **skannattavina toimenpidekortteina** + rekisteröinti/datasuppilo | Tilanne-työtila + renderSignals (tekstistä korteiksi) |
| **Joukkueet** | Joukkuepulssi → **kevennetty** syvänäkymä (vastaus ensin) | `avaaJoukkueSyvanakyma` (yksinkertaistettu) |
| **Valmentajat** | VAI+ + mentorointi | Valmentajat-työtila |
| **Raportit** | Kausi + **oikea HoT-raportti** (ei toast) | Raportointi-työtila (toteuta lähetys) |

### Korjattavat kipupisteet
- **Kriittiset signaalit:** kappaleteksti → kortti (ikoni + 1 rivi + severity-väri + CTA). Esim. "🔴 3 pelaajaa FLEI<40 → **Lähetä klinikkaan**".
- **Joukkuepulssin popup:** johda vastauksella (heikoin laji + n) + 1 toimenpide; 3 datatäyttä-välilehteä → porautuminen. Mobiilissa täysleveä, ei ahdas modaali.
- **Yhteenveto → toimenpide:** jokaiseen oivallukseen CTA — luo tapahtuma (`_jsvLuoTapahtuma` on jo) · viesti valmentajalle (mentorointi-loop on jo) · ehdota IDP.
- **"Lähetä HoT:lle":** korvaa toast oikealla raporttikoonnilla.

### Data→toimenpide (VP)
| Signaali | CTA |
|---|---|
| Valmentaja ei kirjaa/havainnoi | **Lähetä mentorointiviesti** |
| Joukkueen heikoin ketju/laji | **Luo treeniteema-tapahtuma** |
| Hidden Gem / X-Factor | **Ehdota IDP / talenttiohjelma** |
| Konversio <70 % (rekisteröinti) | **Muistuta odottavia** (nudge on jo) |
| Taso-≥3-osuus / kehitysvauhti (≥2 mittausta) | **Raportoi HoT:lle** |

---

## 4. ONBOARDING — "Aloita tästä" (per rooli, 3 askelta)

- **Valmentaja:** 1) Havainnoi 1 pelaaja (ADAR) → 2) Katso hänen korttinsa → 3) Lähetä perheelle 1 viesti. → "Olet valmis."
- **VP:** 1) Katso joukkuepulssi → 2) Avaa 1 pelaajan syvänäkymä → 3) Lähetä 1 mentorointiviesti valmentajalle.
- Näytä vain ensimmäisellä kerralla (localStorage-lippu + ohitettavissa). Ei tyhjää dashboardia ensikäynnillä.

---

## 5. TEKNINEN TOTEUTUSTAPA (strangler, matala riski)

- **Uusi mobiilikuori + Koti-etusivu** rakennetaan; olemassa olevat render-funktiot (`renderDev`, `_renderPinfoFirestore`, `avaaJoukkueSyvanakyma`, renderSignals) jäävät **porautumiskohteiksi** — ei poisteta logiikkaa.
- Tab-bar = CSS-pohjainen näkymänvaihto (kuten nykyinen nav, mutta 4 kohtaa + alalaita mobiilissa).
- **§6-invariantti ehdoton:** yksi `@media(max-width:768px)` per tiedosto; `display:none` ei tapa transformia; slide-in.
- Toimenpidekortit lukevat **pikakentät (§26)** — ei uusia kyselyjä. CTA:t kytkevät olemassa oleviin funktioihin (ADAR-launcher, sendReply, _jsvLuoTapahtuma, lahetaMuistutukset).
- Data-tietoinen: kortti näkyy vain kun signaali on dataa; muuten onboarding-/tyhjätila-opaste.

---

## 6. SEKVENSSI

1. **Valmentajan mobiilikuori + Koti-etusivu** (terävin kipu "ei toimi kännykällä") — pystysiivu, opitaan.
2. **VP Koti + signaalit→kortit + pulssi-popup kevennys + yhteenveto→CTA + HoT-raportti.**
3. **Onboarding-polku** molemmille.
4. **Mobiili-responsiivisuus-sweep** porautumisnäkymiin (Pelaajat/Kehitys/syvänäkymä).

Kukin: §6-mobiili-invariantti, pikakentät, `new Function` 0 virhettä, version:bump, push. Ei poisteta olemassa olevaa analytiikkaa — vain järjestetään toimenpide-ensin + mobiili.

---

## 7. KANSAINVÄLINEN STANDARDI -TUTKA

**IA-uudistus = kansainvälinen perustaso (table stakes), ei erottautuja.** Toimenpide-ensin + mobiili-ensin + tab-bar + progressiivinen porautuminen *ovat* nykystandardi (360Player/Playbook365/PlayMetrics jo täällä). Tämä **nostaa standardiin** (olimme jäljessä: monoliitti, ei mobiilia) — akatemia *harkitsee* työkalua vasta tämän jälkeen.

**Todellinen kv-erottautuja = metodologia, jo edellä:** RAE-korjaus (OR 4.38, "Catapult mittaa, me korjaamme"), FLEI, PHV/kehitysikkunat, per-test-normit, suljettu silmukka. **Selkeysuudistuksen arvo = tekee erottautujasta käytettävän** — haudattu moottori on arvoton.

**Muut standardiulottuvuudet (tutkalla, suurin osa roadmapissa — älä anna hidastaa selkeystyötä nyt, mutta kv-pilottiin mennessä):**
- **i18n** EN/SE/DE — Sprint 3 (jokainen kv-demo kaatuu tähän).
- **Normien lokalisointi** (§5, vaikein) — normilähde per maa; joustava `normiIka`+per-test on pohja, lähde puuttuu.
- **Saavutettavuus (WCAG)** — B2G/UEFA voi vaatia; ≥44px kosketus, kontrasti, ruudunlukija (IA-spec ottaa osan).
- **GDPR alaikäisten datalle** (§33 B4) — EU-kynnyskysymys + kilpailuetu.
- **Datan vienti / yhteentoimivuus** — pelaajaportti (Sprint 4), API (Sprint 7).

Periaate: vie IA standardiin nyt (avaa adoption + näkyvyyden erottautujalle), pidä metodologia moottina, hoida muut ulottuvuudet kv-pilottiin mennessä.
