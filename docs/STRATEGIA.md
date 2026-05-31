# TalentMaster™ — Strategia, RAE-tiede, sprintit, bisnesmalli

> Eriytetty CLAUDE.md:stä 2026-05-31. CLAUDE.md keskittyy teknisiin invariantteihin;
> tämä tiedosto sisältää strategian, RAE-tieteen, kansainvälistymisen, bisnesmallin,
> sprinttisuunnitelman ja avoimet tehtävät. Operatiivinen roadmap-historia: `docs/ROADMAP.md`.

---

## 1. BISNESMALLI

| Tuote | Asiakas | Hinta |
|---|---|---|
| Solo (B2C "Player™") | Pelaaja + perhe | 4–7 €/kk (Solo Stripe 4,99 €/kk) |
| Club | Seurat | 400 €/kausi + 2 €/pelaaja/kk |
| Network | Palloliitto, liitot, UEFA | B2G-lisenssi |
| Scout | Scoutit, agentit | Transaktio per pääsy |

**Kilpailijat:** Catapult, VALD, Smartabase, Kitman Labs, PlayMetrics, 360Player, Playbook365.
**Key advisor:** Marko Kauppinen — "Think Global, Act Local".

**FIFA-ikäpisteet:** 15 v scout window avautuu · 16 v EU/ETA-siirto (FIFA Art. 19) ·
18 v täysi omistajuus (pelaaja ottaa datan hallinnan).

---

## 2. RAE-KORJAUS — TIETEELLINEN PERUSTA (Morganti et al. 2025)

**RAE-korjatut pisteet ovat OLETUSARVO kaikkialla — ei vaihtoehto.** VP näkee RAE-korjatut
FLEI:t ja kehitysindeksit ensisijaisesti; valmentaja näkee RAE-korjatun ADAR-pisteen pelaajan
kortissa; raaka-arvo näytetään sekundäärisesti pienemmällä. **Periaate LUKITTU.**

| Löydös | Luku | Merkitys |
|---|---|---|
| OR BQ1 vs BQ4 UEFA U17 | **4.38** (95 % CI 3.52–5.46) | RAE-korjaus matemaattisesti välttämätön |
| Joukkueet heikolla RAE → bottom 4 | **OR 5.67** | Valmentajalla insentiivi syrjiä BQ4 — VP:n johtamiskysymys |
| BQ4 seniorille selviytyminen vs. U17 | **OR 2.80** (1.96–3.98) | Hidden Gem -logiikka = pitkän tähtäimen strategia |
| FIFA-pisteet korrelaatio RAE:hen | **r = .33** | Isompi kilpailu = pahempi RAE = kriittisempi korjata |

Kriittisin löydös: *"Raising awareness about RAEs does not contribute to their eradication."*
→ pelkkä tietoisuus ei riitä, systeminen korjaus oletusarvona on ainoa ratkaisu.

**Tutkimusviitteet:** Morganti et al. 2025 (UEFA U17/EM 2024) · Brustio et al. 2024 ("underdog
hypothesis") · Vänttinen & KIHU 2015 (talent wastage Suomessa) · Mirwald 2002 (PHV).

**Puuttuvat RAE-toteutukset (sprint-jonossa):** BQ-jakauma joukkuekorteissa (Q1>40 % amber,
Q4>25 % teal) · "BQ4-pelaajat"-filtteri · RAE-bias-skenaariot Kalibraatiopajaan · ADAR-kortin
BQ-kvartiili-chip + "Underdog"-badge · Pelaaja_v7 motivaatioviesti BQ4:lle · RAE-jakauma HoT-raporttiin.

---

## 3. KANSAINVÄLISTYMINEN

**Järjestys: ensin suomi vakaaksi, sitten kansainvälinen.** Referenssi tarvitaan ("8 suomalaista
seuraa, 300+ pelaajaa"). Ostopäätös tapahtuu **tieteellisen validoinnin** kautta — KIHU-yhteistyö
on jo olemassa, seuraava askel on peer-reviewed artikkeli FLEI-metodologiasta
(Journal of Sports Sciences / Science & Football). Yksi artikkeli avaa enemmän ovia kuin 10 pilottiseuraa.

**RAE-korjaus = kv-erottautumistekijä.** Catapult/VALD/Smartabase mittaavat, TalentMaster korjaa.
OR 4.38 ja OR 2.80 ovat myyntiargumentit joita ei voi kiistää.

**PalloID = infrastruktuuri muille maille.** Suomi on ainoa maa jossa kehitysrekisteri + liittodata +
seurarekisteri linkittyvät yhdellä tunnisteella. FIFA Art. 19bis compliance = B2G-tuote liitoille.

### Toimenpiteet aikajanalla
- **Heti (uusi koodi):** CSS logical properties (`margin-inline-start` ei `margin-left`) → RTL-valmius ilmaiseksi.
- **Q3 2026:** i18n-engine (tm_lang.js namespace-pohjaiseksi) · token-pohjainen white-label (`data-theme="bundesliga"` Firestoresta) · 5D-painotusten kalibrointi per markkina.
- **Q4 2026+:** Saksan/Baltian/Ruotsin pilotti · RAG kun dataa riittää.

### Kuusi kriittistä puutetta kv-skaalaan
| Prio | Ominaisuus | Miksi | Sprint |
|---|---|---|---|
| 🔴 1 | Monikielisyys EN/SE/DE | Jokainen kv-demo kaatuu tähän | 3 |
| 🔴 2 | Exportoitava pelaajaportti | Skauttiyhteys vaatii | 4 |
| 🟡 3 | PHV+RAE-korjattu ranking VP:ssä | Akatemia-uskottavuus | 3 |
| 🟡 4 | Vanhempien sitoutumisindeksi | VEAT + eurooppalaiset akatemiat | 5 |
| 🟡 5 | UEFA-lisenssikytky valmentajaprofiilissa | DFB/FA-vaatimus | 5–6 |
| 🟢 6 | Liittotason aggregaatti (Network) | B2G, iso työ | 8–10 |

**Sukupuolten tasa-arvo (SJK-pilotti):** SJK ensimmäinen tyttöjoukkueilla. Eerikkilä-normit eriytetty.
Sukupuolikohtaiset kehitysindeksit + tyttöjen PHV-kaava puuttuvat (Sprint 4).

**Arkkitehtuurivelka:** `seurat/{id}/pelaajat/{pelaajaId}` sitoo datan seuraan. GDPR Art. 20 +
kv-skaalaus vaatii tulevaisuudessa `pelaajat/{palloID}` ylätasolle + seuraliitokset viitteillä.
**Ei tehdä nyt** — vaatii ison migraation — mutta kirjataan velaksi.

---

## 4. SPRINTTISUUNNITELMA (2026-05 → 2026-12)

> Sprintti = 2 viikkoa. Pilotti käynnissä, kaikki kehitys testattava pilottiseuroilla.

**Sprint 1 — POHJA (✅ pääosin valmis):** VP_v22 GitHubiin · Rules v2.7 deploy (✅) ·
Testausketju end-to-end Testaus_v9 (✅) · Excel_Tuonti Sprint 3.1 (✅).
Avoin: VP_v22-testaus KPV:llä · Valmentajat-kokoelma demo-data · Viestit-kokoelma mentorointi-loop.

**Sprint 2 — RAE-NÄKYVYYS:** BQ-jakauma joukkuekorteissa · "BQ4"-filtteri · RAE-bias-skenaariot
Kalibraatiopajaan · ADAR BQ-chip + Underdog · Pelaaja_v7 BQ4-motivaatioviesti · RAE-jakauma HoT-raporttiin.

**Sprint 3 — MONIKIELISYYS + PHV-RANKING:** tm_lang.js namespace-pohjaiseksi (fi/sv/en VP_v22) ·
kieliKartta vifk/grifk→sv auto · language toggle topbariin · PHV+RAE-korjattu FLEI-ranking ·
VP_v22 mobiili slide-in · GrIFK+VIFK ruotsinkielinen testaus.

**Sprint 4 — PELAAJAPORTTI + SUKUPUOLIDATA:** Exportoitava pelaajaportti ("Jaa profiili", PDF +
`talentmasterid.com/pelaaja/{token}` 15v+, Scout-tuote) · sukupuolikohtaiset kehitysindeksit ·
"Arvioi harjoitus" VP-työkalu (`havainnot/{id}` tyyppi:'vp_arvio') · Master_v16 ↔ VP_v22 kalenterisynkka.

**Sprint 5 — VANHEMMAT + UEFA-LISENSSI:** Vanhempien sitoutumisindeksi (kirjautunut viim. 30 pv,
signaali jos <40 %) · Vanhempi_v2 → Firebase (`where('huoltajaEmail','==',email)`) · valmentajaprofiili
UEFA-lisenssitaso (Grassroots C/B/A/Pro) · P3 vanhemman app · P5 fiilinki ikäfaasikohtaiseksi.

**Sprint 6 — AI-SIGNAALIMOOTTORI** (vaatii kirjausrakenne lukittu + 4 vk dataa): AI Behavioural
Science agent (Firestore trigger → CF → Anthropic → pelaajan Inbox; ikäkohtainen ääni) · VP:n
signaalimoottori (poikkeamat, ei kovakoodattuja) · Streak → Firestore · RAG-valmiuden testaus (200+ pelaajaa).

**Sprint 7 — LIITTOTASO + BENCHMARK:** Head of Talent -dashboard (aggregaatti pilottiseuroista,
RAE-jakauma kansallisesti) · Palloliiton Power BI -integraatio · Benchmark-tabi (Eerikkilä-normit,
oma seura vs. pilotti/kv) · UEFA Grassroots Charter -raporttipohja.

**Sprint 8–10 — KANSAINVÄLINEN PILOTTI (Q4 2026):** White-label `data-theme` Firestoresta ·
5D-painotukset per markkina · DE/ET/LV-käännökset · Network-tuote MVP (B2G-sopimuspohja) ·
Business Finland Tempo -hakemus (50–100 k€) · KIHU peer-reviewed artikkeli.

---

## 5. AVOIMET TEHTÄVÄT

### Kriittiset — pilottivalmius
- [ ] Vie GitHubiin: TalentMaster_Testaus_v9.html (paikallisesti valmis)
- [ ] Testaus_v9 pilottitesti — KPV/GrIFK → palautteen jälkeen v8 + Harjoitettavuus_v4 arkistoidaan
- [ ] P6-käynnistys: PIN-callback → `window._p7Pelaaja = {seuraId, pelaajaId}`
- [ ] Streak → Firestore (nyt localStoragessa, pakollinen ennen AI-moduuleja)
- [ ] Testaa VP_v22 KPV:llä — kirjaudu rasmus_broberg@icloud.com

### Tärkeät
- [ ] P3 Vanhemman app: "Eemeli" → `where('huoltajaEmail','==',email)`
- [ ] P4 Firestore Rules vanhemmalle: `resource.data.huoltajaEmail == request.auth.token.email`
- [ ] P5 Fiilinki ikäfaasikohtaiseksi: U13 → leikkija-kieli
- [ ] Suostumusprosessi vaihe 2: "Lähetä suostumuspyynnöt" -nappi Admin-sivulle
- [ ] SPF/DKIM — sähköpostit menevät roskapostiin
- [ ] Tyttöjen PHV-kaava ennen U14/15T-aktivointia (SJK)
- [ ] AI-narratiivi debug: `ai_narratiivi` tyhjä vaikka kuva tallentuu

### Seuraavat sprintit
- [ ] HH-testit Excel-kierto — testaa KPV:llä end-to-end
- [ ] IDP-aktivointilogiikka (P7): 3 reittiä (manuaalinen / X-Factor / KORI)
- [ ] Firestore kirjausrakenne lukitaan → AI agent -aktivointi
- [ ] RAG kun 500+ pelaajaa
- [ ] **Khamis-Roche -kertoimet** — `laskeKR()` integraatiovalmis mutta LUKITTU (`KR_KERTOIMET_PUUTTUU`).
  Tarvitaan verifioidut **Pediatrics 1995 erratum** -kertoimet (imperiaaliset, ikäkohtaiset 4–17.5 v).
  Kun toimitettu → täytä `KR_KERTOIMET` + `KR_VERIFIOITU=true`. Avointa verkkoa ei voitu verifioida
  (2026-05-25) — lähde: julkaisu tai Eerikkilä/MyEWay.

### VP_v22 Sprint 4 -backlog
1. `viimKirjausPvm`-aggregaattikenttä pelaajadokumenttiin (poistaa renderSignals S5:n N+1-kyselyn).
2. `idp_jono` 'ehdotettu' → 'odottaa' migraatio (Cloud Function `migrateIdpJonoTila`).
3. `renderTalentCards()` Tilanne-tabiin (Hidden Gem / X-Factor / Erityistuki -kortit).
4. Underdog-filtteri Pelaajat-tabiin (7. filter `BQ4 + FLEI ≥ 60`).
5. i18n-engine (I18N + t() + applyI18n, data-i18n-attribuutit koko UI:hin).
6. Filter-laskurit suodatinnappuloihin (chip-numero per kategoria).
- **Avoin:** Raportointi-näkymän "Lähetä HoT:lle" = vain `toast()` (ei oikeaa toteutusta).

---

## 6. VP-NÄKYMÄN VERSIOHISTORIA

| Versio | Tila | Keskeiset muutokset |
|---|---|---|
| VP_v19 | Arkisto | Vaalea teema, ei Firebase. Pelaajapolut-filtterit, Kausirakenne-tabi |
| VP_v20 | Arkisto | VP+TD yhdistetty rooli, Kalibraatiopaja, Benchmark |
| VP_v21 | Arkisto | Firebase live-data, tumma teema, React-pohjainen |
| **VP_v22** | **Tuotanto** (Sprint 3 valmis 2026-05-13) | Sivupalkki = Master_v16-pariteetti, mentorointi-loop, joukkuepulssi, dynaaminen renderSignals, RAE-BQ-jakauma + Underdog, IDP-jono Firestoressa. Tekninen tila: CLAUDE.md §19 |
