# TalentMaster — Skaalaussuunnitelma: tie 10 000 pelaajaan

_Arkkitehdin suunnitelma · heinäkuu 2026 · kirjoitettu myös ei-tekniselle lukijalle. Luvut mitattu koodista._

## 0. Tiivistelmä (lue tämä jos luet vain yhden kohdan)

**10 000 pelaajaa on Firebaselle pieni–keskikokoinen mittakaava. Et tarvitse uudelleen­rakennusta
etkä uutta infraa — nykyinen stack riittää teknisesti sinne asti.** Firestore skaalaa miljooniin;
10 000 pelaajadokumenttia alikokoelmineen on pieni tietokanta. CDN-hostattu appi ja Cloud Functions
skaalaavat automaattisesti.

Se mikä **oikeasti** ratkaisee matkalla 10k:hon ei ole "kestääkö palvelin", vaan kolme asiaa:
1. **Kustannus** — Firestorea laskutetaan *lukujen määrästä*. Tehottomat kyselyt kertaantuvat 10k:lla.
2. **Ylläpidettävyys** — 10k:ssa yksi bugi koskee 10 000 käyttäjää. Koodin velan (monoliitit,
   duplikaatio) korjaaminen on *skaalauksen edellytys*, ei vain siisteyttä.
3. **Operatiivinen kypsyys** — monitorointi, varmuuskopiot, GDPR 10 000 alaikäiselle, seurojen
   onboarding ilman käsityötä.

Suunnitelma on **inkrementaalinen kovettaminen**, ei iso kertahyppy. Se etenee vaiheittain niin
että kasvua ei tarvitse pysäyttää eikä ottaa suurta riskiä kerralla.

---

## 1. Kestääkö nykyinen stack 10 000 pelaajaa? — Kyllä

| Kerros | Skaalautuu 10k:hon? | Miksi |
|---|---|---|
| **Firestore (tietokanta)** | ✅ Kyllä, moninkertaisesti | Suunniteltu miljooniin dokumentteihin. 10k pelaajaa = pieni. 9 komposiitti-indeksiä jo määritelty. |
| **Hosting (appien jakelu)** | ✅ Kyllä | Staattinen HTML CDN:llä palvelee 10k käyttäjää triviaalisti. (Firebase Hosting > GitHub Pages — ks. vaihe 1.) |
| **Cloud Functions (taustalogiikka)** | ✅ Kyllä | Skaalaa automaattisesti kuorman mukaan. 7 funktiota deployattu. |
| **Auth + Rules (turva/eristys)** | ✅ Kyllä, mutta auditoitava | Seura-kohtainen eristys (`seuraId`) — mittakaavassa Rules-oikeellisuus on kriittinen. |
| **Monitorointi (Sentry)** | ✅ Perusta on | `tm_sentry.js` käytössä — laajennettava kattavuutta. |

**Johtopäätös:** infra ei ole pullonkaula. Pullonkaulat ovat **kustannus** ja **kehitysnopeus** —
ja molempiin on selkeä, hallittu polku.

---

## 2. Mikä oikeasti ratkaisee 10k:ssa (kolme pullonkaulaa)

### A. Kustannus — Firestore laskuttaa lukujen mukaan
Nyky-koodin kustannusajurit (mitattu):
- **16 reaaliaikaista listeneriä** apeissa (Pelaaja 5, Master 5, VP 2, Seura 2, Admin 2). Jokainen
  yhdistetty käyttäjä × listener = jatkuvia lukuja niin kauan kuin appi on auki. 10k:lla tämä on
  suurin yksittäinen kustannustekijä.
- **Rajaamattomat kokoelmaluvut** — pääapit eivät juuri paginoi (`.limit` puuttuu Pelaaja/VP/Master-
  päävirroista). Esim. **pelaajan kalenteri luetaan koko `kalenteri`-kokoelmana joka latauksella**
  (ei päivämäärä-/joukkuerajaus). Kausien karttuessa tämä kasvaa lineaarisesti × 10k pelaajaa.

**Toimenpiteet (ei rewrite, vaan optimointi):** minimoi turhat listenerit (kertaluku vs. live),
rajaa kyselyt (`where` + `limit` + päivämäärä/joukkue), välimuistitus, denormalisointi kuumille
poluille, ja **kustannusaudit + budjettihälytykset** ennen kasvua.

### B. Ylläpidettävyys = kehitysnopeus × virheiden säde
Pilottikoossa duplikaatio (tilannekuvan velka V1–V6: kortti/5D 4×, kalenteri copy-paste, IDP-
tallentimet) on siedettävä. **10k:ssa se ei ole:** yksi ajautunut tallennin = 10 000 käyttäjän
data pielessä, ja featuret hidastuvat kun sama muutos pitää tehdä moneen paikkaan. Siksi
**tilannekuvan modularisointi-roadmap on skaalauksen edellytys** — se tekee muutoksista
turvallisia ja nopeita kun panokset kasvavat.

### C. Operatiivinen kypsyys
- **Monitorointi:** Sentry on — laajenna virhe- ja kustannusmittarointi (hälytys kun luvut/kulut
  piikkaavat).
- **Varmuuskopiot:** Firestore-export + Point-in-Time Recovery päälle (10k:n dataa ei saa menettää).
- **GDPR 10 000 alaikäisellä = vakava vastuu.** Hyvää jo: `terveys/`-eristys (Art. 9). Tarvitaan
  lisäksi: dataretentio-politiikka, automaattinen poisto-oikeus, DPA:t seurojen kanssa.
- **Seurojen onboarding:** self-serve (ei käsityötä per seura), muuten tuki ei skaalaa.

---

## 3. Vaiheistettu suunnitelma (milestonet)

### Vaihe 0 — Nyt: pilotti vakaaksi
8 + 2 pilottiseuraa toimivat. Vakauta, kerää palaute, korjaa. **Ei skaalaustyötä vielä** — todista
tuote ensin. (Tässä olemme.)

### Vaihe 1 — Perustan kovetus (ennen kasvua)
Halvat, korkean hyödyn askeleet jotka tekevät kasvusta turvallista:
1. **Firebase Hosting -siirto** — atomiset deployt, rollback, oikeat cache-headerit (poistaa
   `?v=`-käsityön ja versio-ajautuman), preview-kanavat verifiointiin.
2. **Bundleri/versiointi kuntoon** (esbuild/Vite) — yksi versio, ei ajautumaa.
3. **Hot-polkujen modularisointi + testikate** (kalenteri, kortti/5D) — roadmapin ydin.
4. **Kustannusaudit:** listenerit + rajaamattomat luvut → scoping/paginointi.
5. **Ops päälle:** budjettihälytykset, varmuuskopiot (PITR), Sentry-kattavuus.

### Vaihe 2 — Skaalausvalmius (kasvun kynnyksellä)
1. **Query-/kustannusoptimointi** kuumille poluille (kalenteri per pvm/joukkue, listener-minimointi).
2. **Rules-audit** tenant-eristykselle (seuraId) mittakaavassa.
3. **GDPR-at-scale:** retentio, poistoautomaatio, DPA-prosessi seuroille.
4. **Self-serve-seuraonboarding.**
5. **Kuormitustesti** — simuloi N seuraa × M pelaajaa ennen kuin ne ovat oikeita.

### Vaihe 3 — Kasvu kohti 10k
Seuroja mukaan asteittain. Seuraa mittareita (kustannus/pelaaja, latenssi, virheet), iteroi,
skaalaa tuki + onboarding. Kasvu on nyt "käännä hanaa", ei "rakenna uudestaan".

---

## 4. Mitä sinun (ei-teknisenä) on hyvä tietää ja päättää

- **Tämä on hallittavissa.** Ei tarvita omaa syväkokemustasi rakentamisesta — tarvitaan luotettava
  prosessi, ja se on jo pystyssä (spec-and-verify, testit, verifiointiportti).
- **Suurimmat riskit eivät ole "kestääkö se".** Ne ovat **(1) kustannusyllätykset** (Firestore-luvut
  karkaavat jos kyselyjä ei rajata) ja **(2) data-/GDPR-vastuu** 10 000 alaikäisestä. Molempiin on
  tässä selkeät toimet — ne pitää vain tehdä ajoissa, ei kasvun jälkeen.
- **Päätökset joita tarvitaan sinulta:** (a) Firebase Hosting -siirto (suositus: kyllä), (b)
  roadmapin priorisointi (kovetus ennen kasvua), (c) budjetti kustannus-/ops-työlle, (d) kuka
  omistaa GDPR-vastuun kun pelaajamäärä kasvaa.
- **Mitä EI kannata tehdä:** iso kertarewrite ("rakennetaan uusiksi"). Se heittäisi menemään
  testatun ytimen (24 lib-moduulia, 801 testiä, Eerikkilä/PHV/IDP/ADAR) ja hidastaisi kasvua
  kuukausilla ilman että ratkaisisi yhtäkään todellista skaalausongelmaa.

---

## 5. Miten tämä toteutetaan turvallisesti (rooli)

- **Sinä:** päätät tuotteen + hyväksyt tuotantoon menon. Et tarvitse teknistä syväosaamista.
- **Arkkitehti (minä):** pilkon tämän suunnitelman verifioitaviksi briiffeiksi, pidän sekvenssin,
  varmistan ettei ajauduta.
- **Koodari(t):** toteuttavat briiffit yksi rajattu pala kerrallaan.
- **Portti:** jokainen askel L1 (diff) + L2 (testit) + L3 (elävä) -verifioitu **ennen** tuotantoa,
  ja sinun mergelläsi.

Tämä on sama kuri joka on jo tuottanut kypsän, testatun ytimen — laajennettuna skaalaukseen.
**10k ei vaadi rohkeaa hyppyä. Se vaatii tämän suunnitelman tekemisen järjestyksessä.**
