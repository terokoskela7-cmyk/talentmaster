# TalentMaster™ — Kokonaisanalyysi & suunta (2026-06-23)

> Arkkitehdin synteesi: mitä on rakennettu, mitä visiosta on jäänyt tekemättä, mihin suuntaan kehitetään.
> Lähteet: CLAUDE.md §1–34 · STRATEGIA.md (5/31) · tämän session docs (harjoitusarviointi, notifikaatiot, Secret Manager).
> Rehellinen, ei kehu. Tavoite: lukita seuraava suunta.

---

## 1. MISSÄ TUOTE ON NYT — kaksi pilaria

TalentMaster on kasvanut **kahdeksi tuotteeksi yhden alustan sisällä:**

**A. Pelaajakehitys (alkuperäinen ydin)** — 5D · FLEI (kehon valmius) · TKI/TSI · PHV (Mirwald) · RAE-korjaus · pelihavainto (ADAR/D4) · tekniikkakilpailu · Eerikkilä-normit · pikakentät · suljettu kehityssilmukka (testi→diagnoosi→resepti→seuranta, §29/30 vaihe 1–2). Appit: VP_v25, Master_v16, Pelaaja_v7, Vanhempi_v2, Testaus_v9, Excel_Tuonti, ADAR Pikakortti.

**B. Valmentajakehitys (UUSI pilari — rakennettu tässä sessiossa, ei ollut alkuperäisessä strategiassa)** — harjoitusarviointi (A Palloliitto-laatu = VP / B valmennustaidot = valmentaja) · Harjoittelun laatu -dashboard · kalibraatio (itsearvio vs havainnointi) · valmentajan reflektiopäiväkirja + ääni + Whisper-litterointi + CPD-todiste · "Valmentajana kehittyminen" -näkymä · roolimalli lukittu. Tämä on **kv-tasolla erottuva** (vrt. CoachLogic/CoachReflection) ja metodisesti vahva.

**Infra (vahva):** 277 vitest + Rules-testit + CI · Sentry-observability · **Secret Manager -migraatio (tämä sessio)** · indexes-as-code · notifikaatioputki (in-app T1/T2/T3 + sähköpostikooste N2) · mobiilipassi · review-kadenssimoottori · VP-tuloskortti (governance) · MDT-raportti · poikkeuskehys.

**Insinöörikuri ei ole riski.** Koodi on testattu, observoitu, nyt turvattu. Riskit ovat muualla (alla).

---

## 2. MITÄ VISIOSTA ON JÄÄNYT TEKEMÄTTÄ (teemoittain)

### 🔴 A. RAE-moat on UI:ssa pääosin rakentamatta — suurin strateginen aukko
STRATEGIA §2 sanoo: **"RAE-korjaus on OLETUSARVO kaikkialla"** ja se on **kv-erottautumistekijä** (OR 4.38, "Catapult mittaa, TalentMaster korjaa"). Mutta Sprint 2 -backlog on **yhä auki:** BQ-jakauma joukkuekorteissa (Q1>40 % amber, Q4>25 % teal) · "BQ4-pelaajat"-filtteri · Underdog-badge ADAR-korttiin + BQ-kvartiili-chip · Pelaaja_v7 BQ4-motivaatioviesti · RAE-jakauma HoT-raporttiin · RAE-bias-skenaariot Kalibraatiopajaan. `rae_kvartaali`-pikakenttä + `RAE_KERROIN` ovat libissä valmiina (§26) — **vain UI-pinta puuttuu.** Eli **lippulaiva-tieteellinen erottautuja ei näy käyttäjälle.** (Aktivoituu kun huoltajat rekisteröivät → syntymäaika täyttyy → §E adoptio-gate.)

### 🔴 B. Monikielisyys — ruotsi on NYT akuutti, ei tulevaisuus
Pilotissa on **ruotsinkielisiä seuroja LIVE** (GrIFK, VIFK, Sibbo-Vargarna). i18n EN/SE/DE on Sprint 3 -tavoite mutta tekemättä → jokainen vääränkielinen näkymä on kitkaa **nyt**. `tm_lang.js` on (144 käännöstä fi/sv/en) mutta ei kattava namespace-engine koko UI:hin. + FLEI→"Kehon valmius" -nimeämispassi (komento annettu, tekemättä).

### 🟡 C. Pelaajaytimen viimeistely (datagate)
- Khamis-Roche (%kypsyys, bio-banding) — LUKITTU, odottaa verifioituja kertoimia (§25).
- Tyttöjen PHV-kaava — ennen SJK-tyttöjen aktivointia.
- Suljettu silmukka vaihe 3 (kehitysikkunat) + vaihe 4 (reseptimalli) — osittain.
- Longitudinaali (§30) — **gate ≥2 mittausta**, realisoituu kausien myötä.
- Hidden Gem / X-Factor täysi porrastus (PHV-gated).

### 🟡 D. Pelaajaportti + Scout + Network (B2G)
Exportoitava pelaajaprofiili (`talentmasterid.com/pelaaja/{token}`, 15v+, FIFA-ikkunat) · marketplace/scout · Head of Talent -aggregaatti · Palloliiton Power BI -integraatio · ADAR™ erillistuotteena (§1 päätös 2026-06-15). Pääosin roadmap.

### 🟡 E. Vanhemmat + integraatiot
Vanhempien sitoutumisindeksi · suostumusprosessi vaihe 2 · TASO→kalenteri+pelidata (osittain) · iCal · Catapult/Polar · Wyscout. Pääosin roadmap.

### 🟢 F. AI — nyt aiempaa toteutuskelpoisempi
Behavioural Science -agentti (Sprint 6, §21): Firestore-trigger → Anthropic → pelaajan näkymä. **Notifikaatioputki (T1/T2/T3) on juuri tämän esiaste** — sama arkkitehtuuri. aiProxy + secrets nyt vahvat. RAG kun 500+ pelaajaa. Tämä on **luonteva seuraava AI-askel** infran ollessa kunnossa.

### 🟢 G. Kaupallistaminen
Solo/B2C Player™ (Solo_Arviointi PENDING, Stripe, OrsaSport-pilotti) · ADAR™ standalone · Club white-label (3A) · cross-club-aggregaatti (3B).

### 🟠 H. Tekninen velka + compliance — kovat takarajat
- **CF-runtime Node 20 → 22:** Node 20 **decommission 2026-10-31** (deploy-varoitukset näkyivät toistuvasti). firebase-functions 4.9.0 → ≥5.1. **Kova takaraja — pakko ennen syksyä.**
- **GDPR (§33 B4):** retention · oikeus tulla unohdetuksi (nyt myös **Storage-äänireflektiot**!) · audit · field-level. **Nouseva riski:** alaikäisten data + kertyvä ääni/PII. Osittain: suostumusflow, Sentry-PII-skrubi, osa field-level-rulesista.
- **Arkkitehtuurivelka:** `seurat/{id}/pelaajat/{id}` sitoo datan seuraan → GDPR Art. 20 + kv vaatii `pelaajat/{palloID}` ylätason (iso migraatio, kirjattu velaksi, ei nyt).
- Frontend-monoliitit (6000+ riviä) → Vite-modulaarisuus (B1).

---

## 3. SITOVA PULLONKAULA & REHELLINEN HAVAINTO

**Pullonkaula ei ole koodi vaan adoptio + longitudinaalinen data.** Olemme rakentaneet **kaksi suurta "dataa edellä" -pilaria** (pelaaja + valmentaja), molemmat datagate. MOAT = data + verkostovaikutus → arvo lukkiutuu vasta käytössä.

**Rehellinen jännite:** tämä sessio pivotoi voimakkaasti **valmentajakehitys-pilariin** (erinomainen + kv-erottuva), mutta samalla **lippulaiva-tieteellinen erottautuja — RAE-näkyvyys — jäi yhä UI:ssa rakentamatta** (Sprint 2 auki 5/31:stä asti). Eli rakensimme uuden vahvan pilarin, mutta se *tiede joka myy koko tuotteen* (OR 4.38) ei vielä näy käyttäjälle.

---

## 4. SUOSITELTU SUUNTA (priorisoitu)

| Prio | Suunta | Peruste |
|---|---|---|
| **1** | **RAE-moatin näkyvyys** (Sprint 2 -backlog UI:hin) | Lippulaiva-erottautuja, tieteellinen, **buildattavissa nyt** (`rae_kvartaali` on) — tekee tieteen näkyväksi. Aktivoituu adoption myötä. |
| **2** | **Ruotsi-i18n + FLEI→"Kehon valmius"** | Ruotsinkieliset pilottiseurat LIVE — kitkaa nyt, ei tulevaisuudessa. |
| **3** | **CF Node 22 -nosto + GDPR-pass (ääni/alaikäiset)** | Kova takaraja (10/2026) + nouseva compliance-riski. De-risk. |
| **4** | **Adoptio + longitudinaali** (rekisteröinti/suostumus, käyttäjätesti, 2. mittaukset) | Todellinen pullonkaula; notifikaatiot + mobiili nyt tukevat tätä. |
| **5** | **Valmentajapilarin viimeistely** (3A white-label, 3B cross-club) | Halpa sulkeminen; brändi/verkostovaikutus. |
| **6** | **AI Behavioural -agentti** (Sprint 6) | Infra nyt kunnossa; notifikaatioputki on esiaste. |
| **7** | **Kaupallistaminen:** Solo Player™ · ADAR™ standalone · Scout/pelaajaportti | Erilliset tulovirrat, kun ydin validoitu. |

**Arkkitehdin tislaus:** Lyhyellä tähtäimellä **RAE-näkyvyys (1) + ruotsi (2)** tuottavat eniten — ne tekevät jo rakennetun tieteen *näkyväksi ja käytettäväksi oikeille käyttäjille*. **Node 22 (3)** on pakko ajoittaa ennen syksyä. **Adoptio (4)** on taustalla aina tärkein, mutta se on enemmän customer-success kuin koodi. Valmentajapilarin loppu (3A/3B), AI ja kaupallistaminen ovat arvokkaita mutta tulevat luontevasti näiden jälkeen.
