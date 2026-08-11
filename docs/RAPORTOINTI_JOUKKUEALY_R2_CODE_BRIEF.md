# CODE BRIEF — R2-B · Joukkueäly · Seuran talenttiraportti + tuki

**Tyyppi:** uusi seuratason näkymä Raportointi-sivulle (aggregaatti olemassa olevasta per-pelaaja-datasta) + ulosraportti. **Ethos:** out-of-the-box + KISS (KISS_MANDAATTI.md). **Tausta:** Raportoinnin per-pelaaja-puoli hoidetaan kortilla (R2-A). Puuttuva puoli on **seuratason talenttitiedustelu** — keitä meillä on, missä on syvyyttä/aukkoja, onko valinnassa RAE-vinoumaa, keneen panostamme kv-polulla, ja **mitä seuran pitää tehdä**. Kansainvälinen konteksti: EPPP (pelaajapolku, monialainen performance-management), Kitman Labs (valmius/kuorma), RAE/bio-banding-tutkimus, FA four-corner ↔ 5D.

**Design-totuus:** `docs/JOUKKUEALY_SEURARAPORTTI_mockup.html` (9 moduulia; molemmat teemat; pseudonymisoitu roster; kortin design-kieli).

---

## PERIAATE (lue ensin — tämä rajaa skoopin)

1. **AGGREGAATTI, EI UUTTA PER-PELAAJA-DATAA.** Joukkueäly kokoaa olemassa olevat kentät: 5D-tasot, valmius (FLEI), talent-signaalit (X-Factor/Hidden Gem/siirtopäätös), PHV-vaihe + syntymäkvartaali (Q), potentiaali (#319 `scout_potentiaali*`), IDP-tila, DVI-edistymä, sitoumustila, harjoittelun laatu. **Uusi "laskenta" = vain aggregointi** (lukumäärät, keskiarvot, jakaumat) — ei uusia per-pelaaja-mittareita.
2. **REHELLISYYS aika-akselilla.** Pelaajapolku-historia ja kehityskäyrä vaativat **historiallista dataa** (kausi-snapshotteja). **Jos historiaa ei ole tallennettu → älä keksi sitä.** Näytä tyhjä tila ("kerätään · ensimmäinen kausi") ja aloita snapshotin keräys eteenpäin. Sama sääntö kuin DVI:ssä: empty ≠ 0.
3. **KISS:** jokainen moduuli yksinkertainen oletuksena, "▾ syvennä" halutessaan (drill pelaajalistaan). Ei yhdeksää raskasta lohkoa — yhdistä liittyvät (mockupissa polku + kehityskäyrä ovat yhdessä sektiossa).
4. **Read-only raporttipinta.** Toimenpide-napit ("Mentoroi", "Luo treeniteema", "Vahvista") **linkittävät olemassa oleviin toimintoihin** — ei uutta kirjoituspolkua Joukkueälyyn.
5. **Ikäluokka-suodatin** (Koko seura / U13 / U15 / T18) ohjaa moduuleita jotka ovat kohorttikohtaisia (pelipaikka-syvyys, RAE).

---

## MODUULIT (mockupin mukaan)

**A · Seurakooste (fokus)** — KPI-ruudut: pelaajia, valmius ka (+ "aseta kansallinen vertailu" jos normia ei ole), talenttia HOT:lle (X-Factor+Hidden Gem), review ajan tasalla % (cockpitista). Poikkeusväri jos kynnyksen alle. **+ editorial-kärki:** yksi tärkein oivallus lauseena (sääntöpohjainen tai `tm_ai`/why-lauseet — ks. moduuli I).

**B · Talenttijakauma** — joukkueen 5D-ka vs. kansallinen normi (tutka), valmiusjakauma-histogrammi, talenttiportaat (X-Factor/Hidden Gem/seuranta/kehityskohde -lukumäärät signaaleista).

**C · Pelipaikka-syvyys** — depth chart: pelaajat pelipaikoittain talenttitason mukaan; ohuet/aukko-paikat poikkeusvärillä. Vaatii pelipaikka-kentän pelaajadokista. Aukko = toimenpide.

**D · Suhteellinen ikä & kypsyys (RAE)** — syntymäkvartaali-jakauma (Q1–Q4, olemassa oleva RAE/kvartaali) + PHV-vaihe-jakauma (EN/AN/JÄ). Bio-banding-huomio. §28-korjaus jo pelaajatasolla → tässä seuratasolle. **Kansainvälinen erottaja.**

**E · Potentiaali-jakauma (Scouting · johto-only)** — `scout_potentiaali`-jakauma tähtitasoittain (#319, sama `SCOUT_POTENTIAALI`-mäppäys), nimetyt ehdokkaat, "ei arvioitu" -luku. **Johto-only** (`_vpSeurantaOnJohto()`), gold, **ei pelaaja-/vanhempi-appiin.**

**F · Kuormitus & käytettävyys** — *(data-riippuvainen)* squad-tason **tilalippu-aggregaatti**: käytettävissä/rajoitettu/poissa + kuormasignaali. **GDPR Art. 9:** vain tilalippu, EI kliinistä dataa; kliininen pysyy `terveys/`-kokoelmassa; ei vuoda pelaaja-/vanhempi-appiin. **Jos tilalippu-dataa ei ole → jätä moduuli pois** (älä keksi).

**G · Pelaajapolku & kehitys ajassa** — *(aika-akseli, data-riippuvainen)* läpivirtaussuppilo (kohorttikoot U13→U15→T18→edustus + progression/retention) ja seuran valmius/5D-kehityskäyrä yli kausien. **Vaatii kausi-snapshotteja** — jos ei ole, tyhjä tila + aloita keräys. EPPP-tason ydin.

**H · Kehitysmomentum & tuki seuralle** — toimenpide-rivit olemassa olevista signaaleista, tärkein ensin: mentorointikatveet (oversight), IDP-kattavuus %, heikoin kehityskohde joukkuetasolla → treeniteema, DVI-jumit, harjoittelun laatu vs. kansallinen, sitoumukset odottaa. **Jokainen rivi linkittää olemassa olevaan toimintoon.** "Tuki seuralle" -ydin.

**I · Ulosraportti** — Vie PDF (seurakooste) · Lähetä Head of Talentille · Scouting-liite (johto-only) · Palloliitto-koosto. **+ AI-koosto:** 3 lauseen automaattikoosto (`tm_ai.js`/why-lauseet), "tarkista ennen lähetystä".

---

## VAIHEISTUS (pieninä PR:inä)

- **J1 — staattiset aggregaatit (toimivat nykydatalla):** A (ilman kehityskäyrää) · B · C · D · E · H · I (ilman AI-koostetta). Nämä eivät vaadi historiaa eivätkä uutta datakenttää (paitsi pelipaikka jos puuttuu).
- **J2 — aika-akseli + älyt (data-riippuvaiset):** G (polku + kehityskäyrä, vaatii snapshot-keräyksen) · F (kuormitus/käytettävyys, jos tilalippu-data olemassa) · editorial-kärki + AI-koosto (`tm_ai`).

**Verify ensin (Code):** mitkä kentät ovat oikeasti olemassa (pelipaikka · syntymäkvartaali · PHV · availability-tilalippu · kausi-snapshotit). Kirjaa PR-kuvaukseen mitä löytyi ja mikä siirtyy J2:een puuttuvan datan takia — **älä täytä tyhjää keksityllä.**

---

## INVARIANTIT
1. **Aggregaatti olemassa olevista kentistä** — ei uusia per-pelaaja-mittareita, ei datamigraatiota. Uusi laskenta = vain lukumäärä/keskiarvo/jakauma.
2. **Aika-akseli näyttää vain todellista historiaa** — ei keksittyä trendiä; tyhjä tila jos snapshotteja ei ole (empty ≠ 0).
3. **Scouting (potentiaali) johto-only** (`_vpSeurantaOnJohto()`), gold, ei vuoda pelaaja-/vanhempi-appiin.
4. **GDPR Art. 9:** kuormitus/käytettävyys vain tilalippu-tasolla; kliininen `terveys/`-kokoelmassa erillään; ei vuoda.
5. **Read-only** — toimenpide-napit linkittävät olemassa oleviin toimintoihin; ei uutta kirjoituspolkua.
6. **Molemmat teemat · KISS · out-of-the-box** — sama design-kieli kuin kortti/mockup; simple by default, deepen on demand.
7. **Ikäluokka-suodatin** ohjaa kohorttikohtaisia moduuleita oikein.

## HYVÄKSYMISKRITEERI (kolmitasoinen)
- **L1 git-diff:** aggregaatit lukevat olemassa olevia kenttiä (ei uutta per-pelaaja-dataa); potentiaali johto-only + ei pelaaja-appiin; kuormitus vain tilalippu (ei kliinistä); aika-akseli tyhjä-tila-turvallinen; toimenpide-napit linkittävät olemassa oleviin funktioihin; ei kirjoituksia.
- **L2 testit:** aggregointifunktiot puhtaina (jakauma summautuu N:ään; talenttiportaat signaaleista; potentiaali-jakauma `SCOUT_POTENTIAALI`-mäppäyksellä; RAE-kvartaalit; tyhjä historia → tyhjä tila, ei kaadu); suite vihreä, eslint puhdas.
- **L3 live (sanktioitu · KPV, superadmin):** Joukkueäly renderöityy molemmilla teemoilla; ikäluokka-suodatin toimii; luvut täsmäävät pelaajalistaan; potentiaali-jakauma johto-only (ei näy pelaaja-appia avattaessa); kuormitus vain tilalippu; aika-akseli näyttää joko todellista dataa tai tyhjän tilan; toimenpide-napit avaavat oikeat toiminnot. **Ei kirjoituksia dataan.**

## DoD
1. J1-moduulit renderöityvät nykydatalla (screenshotit molemmat teemat); luvut täsmäävät.
2. J2-moduulit joko toimivat todellisella historia-/tilalippudatalla tai näyttävät rehellisen tyhjän tilan; PR-kuvaus kertoo kumpi.
3. Puhtaat yksikkötestit; suite vihreä; eslint puhdas.
4. Pienet PR:t (J1 ja J2 erikseen, mielellään moduuleittain); kuvaus linkkaa tähän briiffiin + `docs/JOUKKUEALY_SEURARAPORTTI_mockup.html`; kirjaa mitkä kentät löytyivät.
5. **Älä mergeä** ennen L1-diffiä + L3-liveä.

## SKOOPIN ULKOPUOLELLA
- **Per-pelaaja-kortti** (R2-A hoitaa).
- **Uudet mittarit/testit tai per-pelaaja-datakentät** (Joukkueäly on aggregaatti).
- **Kansallisen normin / pe(er)vertailun datalähde** (jos ei ole, näytä "aseta vertailu" -CTA; itse benchmark-data on erillinen päätös).
- **Keksitty historia/trendi** — aika-akseli vain todellisesta datasta.
- **Kirjoituspolku Joukkueälystä** (read-only; toimenpiteet linkittävät olemassa oleviin).
