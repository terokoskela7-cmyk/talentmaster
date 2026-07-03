# IDP-kortti maailmanluokkaan — suunnittelu & benchmark

> Lähde: co-design + kv-benchmark 2026-07-03 (Claude + Tero). Konteksti: `VISIO_PELAAJAKEHITYKSEN_SELKARANKA.md §0` (Palloliiton talenttiohjelma) + kv-vertailukelpoisuus. Kohde: `TalentMaster_IDP_Kortti_v4.html`. **Laaturima kaikille IDP-vaiheille (V2–V6), ei yksittäinen tehtävä.** Työn alla — täydentyy iteroiden.

## 1. Tavoite
Tehdä IDP-kortista **kansainvälisesti korkealaatuinen** yksilöllinen kehityssuunnitelma, joka (a) kestää Palloliiton kansallisen ohjelman tarkastelun, (b) vertautuu maailman huippuakatemioiden IDP-käytäntöihin, (c) säilyttää TM:n omat erottautujat (kypsyys-first, faskiaketjut, DVI, TKI-normit). Ei kopio — **paras luokassaan** yhdistämällä kv-parhaat käytännöt + TM:n uniikki tiede.

## 2. Kansainvälinen benchmark (mitä huippu-IDP sisältää)
**FA 4-corner-malli** = kansainvälinen de facto -standardi: **Technical/Tactical · Physical · Psychological · Social** — kokonaisvaltainen pelaajan kehitys (EPPP-akatemiat). IDP-parhaat käytännöt (lähteet §7):
1. **Pelaajakeskeisyys + omistajuus:** pelaaja keskiössä, **pelaaja johtaa review-keskustelua**, arvioi oman edistymänsä ja asettaa omat tavoitteensa → sitoutuminen, motivaatio, vastuu.
2. **SMART-tavoitteet** (nuorille sovellettuna, prosessipainotus): specific · measurable · achievable · relevant · time-bound.
3. **Review-sykli / rytmi:** kk/kvartaali **kaksisuuntainen** yhteisarvio — ei kertaluontoinen; plan → execute → measure → adjust.
4. **Mittarit + monitorointi:** konkreettiset mittarit (syöttö-%, nopeus, tekniikka-aika), video, näyttöpohjaisuus.
5. **LTAD / kypsyystietoisuus (NSCA):** kasvun epälineaarisuus, yksilöllistäminen, varhainen motoriikka+voima, monilajisuus, terveys keskiössä.
6. **Psyykkinen + sosiaalinen ei unohdu:** ruokkivat teknis-taktista + lapsen kehitystä urheilun ulkopuolella; tavoitteiden saavuttaminen → itseluottamus + itsetuntemus.

## 3. TM:n nykytila vs benchmark (audit)
Kortti (4 paneelia: Tilanne · Ketjut · Kehitys · Harjoite) on jo kehittynyt.

### 3.1 TM:n uniikit erottautujat (EDELLÄ kansainvälistä keskitasoa — säilytä ja korosta)
- **Kypsyys-first** (PHV/bio-ikä, DVI-kehitysvauhti, RAE-korjaus, bio-banding, herkkyysikkunat §28). Useimmat IDP:t ovat *ikäpohjaisia*; TM on *kypsyyspohjainen* — aidosti edellä.
- **Faskiaketjut / Kehon valmius™** (Wilke 2016, diagonaaliketju) — omaperäinen, tieteellisesti perusteltu kuormituskapasiteetti-linssi.
- **DVI — kehitysvauhti** (muutosnopeus, ei vain taso) — harvinainen IDP:issä.
- **70/30-integraatioperiaate** (70 % vahvuudet, 30 % aukko; neurofysiologinen) — vahvuusperustainen, ei eristetty heikkousharjoittelu.
- **TKI/tekniikkakilpailu + Eerikkilä/MyE.Way-normit** — kansallinen viitedata.

### 3.2 Vahvuudet jotka jo täsmäävät benchmarkiin
- **Holistinen 4-corner:** havainnointi Tekninen/Fyysinen/Taktinen/Henkinen + 5D-profiili. ✅
- **Pelaajan ääni:** tavoitelause "Minun kauteni". ✅ (kevyt — ks. aukot)
- **Näyttöpohjaisuus:** testihistoria + normit + havaintoloki. ✅
- **Rajainvarianti:** "kenttäharjoitus on valmentajan" — TM diagnosoi/ohjaa/seuraa. ✅

### 3.3 Aukot vs kansainvälinen huippu (→ toimenpiteet)
| Aukko | Nykytila | Maailmanluokka |
|---|---|---|
| **Strukturoitu SMART-tavoite** | vapaa tekstitavoite | tavoite = kohde + mittari + aikaraami + lähtö→tavoitearvo (mitattava, seurattava) |
| **Pelaaja johtaa review'ta** | tavoite muokattavissa | pelaaja arvioi edistymän + asettaa seuraavan tavoitteen (omistajuus) |
| **Review-sykli/rytmi** | havainnot + DVI | eksplisiittinen kk/kvartaali-yhteisarvio (valmentaja ↔ pelaaja ↔ vanhempi), muistutus |
| **Pelipaikkakohtaisuus** | 🔜 placeholder | position-vaatimusprofiili + pelidata-KPI (V5) täyttää |
| **Psyykkinen syvyys** | "Henkinen" corner | psyykkiset tavoitteet (itseluottamus, sinnikkyys, keskittyminen) + mittaus (D3-kalibraatio) |
| **Sosiaalinen (D5)** | ohut | joukkuerooli, johtajuus, valmennettavuus — kevyt kehys |
| **i18n / kv-vienti** | fi (sv/en osin) | täysi fi/sv/en (`tm_lang.js`) — kv-vertailukelpoisuus + Palloliitto/UEFA-vienti |
| **Vienti / raportti** | näyttö | tulostettava/jaettava IDP (PDF), §37-raporttilinkitys (V4) |
| **Standardointi** | pilotti | yhtenäinen tavoiterakenne + fokus-taksonomia kaikille seuroille (kansallinen) |

## 3.5 Sisäiset / kansalliset benchmarkit (repo) — ratkaisevat lisät
Repossa on jo kolme kv/kansallista referenssiä jotka ohjaavat suunnittelua:
- **Palloliiton pelihavainto** (`TalentMaster_Pelihavainto_Palloliitto.html`) — **puuttuva taktinen/pelillinen kerros + pitkä polku + kansallinen putki.** Sisältää: pelipaikkakohtaiset teknis-taktiset periaatteet (keskuspuolustaja: boksi-periaate, avaussyöttö, murtavat juoksut, tolpat/blokit…), **ikäkausivaatimus U13→U15→U17** ("nykytaso vs. mitä tulevaisuudessa vaaditaan — maajoukkuepolun kehityskaari"), pelipaikkakohtaiset **ottelu-KPI:t mitattuna** (avaussyöttö-tarkkuus tavoite 65 %/tulos 48 %), pelaajan itsearvio + DVI + TIPS-arvio + "päätös maajoukkuetason tarkkailuun", rehellinen havainto ("en nähnyt" = validi). → **Tämä on TM:n D4-peliäly/taktinen cornerin + position-KPI:n (V5) + pitkän polun + kansallisen putken (V6) valmis Palloliitto-malli. Kytke IDP:hen — älä keksi omaa taktista taksonomiaa, käytä Palloliiton.**
- **FC Nordsjælland** (`Vaihe1_Roolimatriisi.html`) — Right to Dream, holistinen malli, **3-tason palaverirytmi** (Management/Development/Planning, kk/2vk/kvartaali) → review-syklin rytmiperusta (§4). Dokumentoi: luotettavan data-infran rakentaminen kesti 3,5 v + 2 palkattua → **TM tarjoaa valmiina** (kilpailuetu).
- **Hammarby** (`archive/pitch/hammarby_*`, `tm_dna_opas.html`) — DNA paperille + jalkautus koko organisaatioon → oman kasvatuksen peliaika 0,89 %→20,6 % (2018→2025). Player Care -moduuli. → **IDP = DNA:n jalkautuksen väline**; pitkän polun idea "Hammarby-tyyliin" tulee tästä.

## 5.5 Pitkän tähtäimen kehityspolku (2–5 v) — kypsyysankkuroitu (uusi kerros)
Hammarby/akatemia-tyylinen **monivuotinen yksilöpolku**, mutta TM:n erottautujana **ankkuroitu biologiseen kypsyyteen (PHV), ei kalenteriin** → vaiheet siirtyvät yksilön kasvun mukaan. Neljä vaihetta konkreettisin askelin (mockup 2026-07-03):
1. **Nyt · Pre-PHV** — tekninen kultaikkuna (syöttö/kuljetus/1v1), koordinaatio, monipuolisuus. *Kausitavoite (§IDP_YDIN) elää tässä.*
2. **+1–2 v · PHV** — kuormanhallinta (PH-rajoitin §25), tekniikan ylläpito, pelikäsitys herää, pelipaikka tarkentuu.
3. **+2–4 v · Post-PHV** — voima+nopeus (herkkyysikkuna), **pelipaikkakohtainen teknis-taktinen (Palloliiton pelihavainto)**, pelidata/KPI (TASO, V5).
4. **+4–5 v · Showcase** — pelipaikan hallinta, ottelu-KPI + video, siirtymä/edustus- tai maajoukkuepolku.
**Kytkös:** ikäkausivaatimus (Palloliitto U13→U15→U17) määrittää kunkin vaiheen taktisen riman; TM:n PHV/DVI määrittää *milloin* yksilö on missäkin vaiheessa. Kausitavoite = askel tässä polussa, ei irrallinen.

## 4. Maailmanluokan laatupilarit (suunnitteluperiaatteet — lukitse nämä)
1. **Kokonaisvaltainen (4-corner + 5D):** tekninen · fyysinen · psyykkinen · sosiaalinen — mikään corner ei jää tyhjäksi ilman "tulossa"-polkua.
2. **Kypsyys ennen kronologiaa:** jokainen tavoite ja tulkinta PHV-/RAE-kontekstissa (§28) — TM:n kärki, korosta.
3. **Pelaaja omistaa:** pelaaja kirjoittaa tavoitteen, arvioi edistymän, johtaa review'ta (SDT-autonomia, Dweck-prosessi).
4. **Mitattava + seurattava:** tavoite = kohde + mittari + aikaraami; DVI seuraa vauhtia; review-sykli sulkee silmukan.
5. **Vahvuusperustainen (70/30):** rakennetaan vahvuuksien varaan, aukko integroituna — ei nöyryyttävä heikkouslista.
6. **Valmentaja omistaa kentän:** TM ohjaa suunnan + kielen + seurannan, ei korvaa valmentajaa (rajainvarianti).
7. **Näyttö + uskottavuus:** normit (Eerikkilä/MyE.Way/TKI), tieteelliset perusteet näkyvissä (Wilke, Mirwald, NSCA, FA 4-corner) — kansallinen/kv-uskottavuus.
8. **Kansainvälinen muoto:** fi/sv/en, tulostettava/vietävä, standardoitu rakenne — vertailukelpoinen ja koostettava (Palloliitto/UEFA).
9. **Turvallinen kehys (§7.22 lapselle/perheelle):** ei vertailua muihin, ei uhkakieltä; prosessikehu + autonomia. Aikuispuolella (VP) luvut sallittu.

## 5. Kortin tavoiterakenne (maailmanluokka)
Säilytä 4 paneelia, syvennä:
- **① Tilanne:** TalentID + 5D + PHV/bio-ikä + DVI + signaalit (Hidden Gem/RAE/underdog) — ✅ pidä, lisää kypsyys-kontekstilause jokaiseen tulkintaan.
- **② Kehon valmius (ketjut):** faskiaketjut + kuormituskapasiteetti — ✅ uniikki, pidä.
- **③ Kehitys (IDP-ydin):** 4-corner-havainnot + **strukturoitu tavoite** (kohde+mittari+aikaraami, pelaajan omistama) + **review-sykli** (edistymä + seuraava tavoite, kk/kvartaali) + testihistoria + DVI + 70/30 + pelipaikkakohtainen (V5).
- **④ Harjoite:** pelipaikka-valinta + alkurutiini + "miksi" — ✅; V5 tuo pelipaikkakohtaiset vaatimukset + pelidata.

## 6. Aukot → vaiheet (kytkös selkärankaan)
- **V2 (ehdotusmoottori):** strukturoitu SMART-tavoite datasta (heikoin osa + normigap + kultaikkuna + 70/30) → esitäyttää tavoitelauseen.
- **V3 (elinkaari):** review-sykli + rytmi + edistymän arviointi (pelaaja johtaa) + DVI-seuranta.
- **V4 (raportti):** tulostettava/jaettava IDP + §37-raporttilinkitys.
- **V5 (pelipaikka+pelidata):** position-vaatimusprofiili + KPI täyttää pelipaikkakohtaisen placeholderin.
- **V6 (kansallinen):** standardoitu rakenne + Palloliitto-koonti + i18n täydennys (fi/sv/en).
- **Läpileikkaava:** i18n (`tm_lang.js`), psyykkinen/sosiaalinen syvyys, tieteelliset perusteet näkyviin.

## 7. Invariantit + lähteet
**Invariantit:** metodologia ennallaan (Eerikkilä/MyE.Way/TKI/PHV) · §7.22 (lapsi/perhe) · valmentaja omistaa kentän · GDPR §33 B4 (alaikäiset, kansallinen koonti) · §26 pikakentät.

**Kv-benchmark-lähteet:**
- [FA Four Corner Model / EPPP — Premier League](https://www.premierleague.com/en/news/2920464)
- [Designing elite football programmes (SEL + career) — Soccer & Society (T&F)](https://www.tandfonline.com/doi/full/10.1080/14660970.2022.2149505)
- [IDPs in youth soccer — FlickTec](https://flicktec.io/blog/individual-development-plans-idps-in-youth-soccer-unlocking-every-players-potential)
- [Individual Learning Plans Q&A — Player Development Project](https://playerdevelopmentproject.com/qa-individual-learning-plans/)
- [Establishing a player-centred environment — Women's Soccer Coaching](https://www.womenssoccercoaching.com/coaching-advice/establishing-a-player-centred-environment)
- [Training management of elite adolescent soccer player throughout maturation — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8708071/)
- [Survey of elite youth academy structures worldwide — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9727309/)
