# TalentMaster — Tilannekuva & roadmap · 2026-07-29

> **Konsolidoitu tilannekuva.** Korvaa hajanaiset `SESSION_TILANNE_2026-07-05.md` + osin
> `TILANNEKUVA_ROADMAP.md` (tekninen velka -osio yhä validi, ks. §7). Näkökulma: arkkitehti/reviewer
> (spec-and-verify). Luvut mitattu koodista. Lue tämä + `CLAUDE.md` uutta sessiota aloittaessa.

---

## 1. Iso kuva

Tuote on **pilotin käyttöönotto­vaiheessa**: rakennus + analyysimallit (5D, TKI, Eerikkilä, PHV, trendi)
ovat lukittuja, ja fokus on nyt **datankeruussa, adoptiossa ja käyttöliittymän selkeydessä**. Domain-/
engine-ydin on kypsä: **28 `lib/`-moduulia**, dual-export-malli, **33 vitest-sviittiä / ~880 testiä** +
175 Rules-emulaattoritestiä. Kuusi tuotanto-appia (VP_v25 ~14,8k riviä suurin).

Viimeisin iso työ (heinäkuu): **trendi-selkäranka + Kehityskaari**, **ristiinarvio/multi-rater**,
**VP-seurantanäkymä**, ja **koko UI-selkeys-paketti** — jälkimmäinen teki jokaisesta kortin luvusta
itsensä selittävän (mihin verrataan, mitä tarkoittaa).

**Työtapa (ennallaan):** jokainen vaihe = spec/mockup (`docs/`) → Tero committoi mainiin → Code toteuttaa
haaralle → **arkkitehti verifioi L1 (git diff) + L2 (vitest) + L3 (elävä, molemmat teemat)** → merge.
Brief-docit menevät mainiin **suoraan** (ei omaa PR:ää); vain Coden toteutus-PR:t käyvät review'n.

---

## 2. Juuri valmistunut (heinäkuu 2026, mainissa)

**UI-selkeys-paketti (PR #278–283):**
- #278 Kehityskaari desimaalit + tasainen-nuoli
- #279 Syväanalyysi taso-asteikot + §28 per-testi-taso näkyviin (🌱 harmaa)
- #280 desimaalit (max 2) + **§28 kasvumittaus-ohjaus** (näytä kehityskohteet + ohjaa mittaukseen)
- #281 **Mittaus-hybridi** (taso-sarake normivertailuun + syvempi tasoanalyysi)
- #282 **tekniikan kaksi tasoa** — Alue (TK-lajitaso 1–5, kaikki lajit) + Valtak (Eerikkilä 1–3, syöttö/pujottelu)
- #283 **Kehityskaari** — aggregaatit (Tekniikka yht. + TKI) omaan lohkoon + **TKI-divergenssin selitys** (§34 §3.2)

**Trendi (Vaihe 1–2, PR #257/#260/#277):** `hh_historia[]`/`tki_historia[]`-selkäranka + `lib/tm_kehityskaari.js`
(sparkline, suunta, kehitysnopeus, jaksofokus-sidos). Renderöi VP/Master/Pelaaja (§7.22 kannustava).

**Ristiinarvio / multi-rater (PR #269/#271/#273):** `lib/tm_pelialy_yksilo.js` konsensus-koostus
(per-arvioija-uusin, §4-ikäportitettu yht, yhtenevyys), riippumattomuus-suojaus (anti-anchoring),
talenttinosto-signaali. Permissiot: joukkuelukko + talenttivalmentajan koko seuran havainto-oikeus.

**VP-seurantanäkymä (PR #275):** valmentajaroster (VAI+ indeksi + hälytysliput) + IDP-aktivoinnit-feed +
VP-kuittaus (audit, ei hard-delete). `lib/tm_vp_seuranta.js`.

---

## 3. Päävaiheet ja tila

### 3.1 Teknis-taktinen valmennusketju (pääprojekti)
Ketju: arviointi → silta → jaksofokus → teema → harjoitus → läsnäolo → pelaaja näkee cue → jakson sulku → seuraava fokus.

| Vaihe | Sisältö | Tila |
|---|---|---|
| 4a | Valmentajan toimintakortti (konsepti→cue→harjoite) | ✅ LIVE |
| 4b | Pelaajan cue-kerros (`tmTtPelaaja`) | ✅ LIVE |
| 4c | VP jaksofokus-oversight (`tm_jaksofokus.js`) | ✅ LIVE |
| 4d | Kalenteri ohjausjärjestelmänä (`tm_treeniteema.js`) | ✅ LIVE |
| 5 | Arviointi→resepti-silta (`tm_arviointi_silta.js`) | ✅ LIVE |
| 6 | Silmukan sulku — geneerinen jaksosyklimoottori (`tm_jaksokooste.js`) | ✅ mainissa (varmista live-toiminta) |
| 7 | Fysiikkajakso — D1-fokus + mitattu delta (H-H) + §28 PHV-portti | 📋 suunniteltu, oma spec myöhemmin |

### 3.2 IDP-kortti
- ✅ 1a (jaksofokus + domeeni + archive-before-overwrite) · 1b (narratiivi-välilehti) · P0 (z-index).
- ⏳ **P1** (tee ensin): 5D-yhteenveto 3/5 → **5/5** (D4+D5 haaleana "—") · radar **normi-overlay
  PHV-korjattuna** (EI kalenteri-ikää; U8–15 kehityskaista, normi vain U16+) · kehitysvaihe bändinä.
- ⏳ **P2**: saatavuus-chip (2-kerroksinen, operatiivinen status vs kliininen `terveys/`) · pelipaikkafundamentit ·
  välitavoitteet-porras. Spec: `docs/CODE_OHJE_IDP_P2.md`.

### 3.3 Pilotti
Käyttöönotto: datankeruu + adoptio. Datakypsyys vaihtelee (§30): **SJK** H-H+d1/d2 (ei TKI/PHV) ·
**Sibbo** TKI (ei H-H/PHV) · **KPV** vain Topias-testipelaaja · **palloiirot/grifk** rosterit ilman mittausta.
Adoptio-ajuri nyt sisäänrakennettu: §28 kasvumittaus-ohjaus näkyy kaikille joilla ei ole PHV:tä.

---

## 4. Avoin tehtävälista (priorisoitu)

### 🟢 Nopeat / matalariskiset (jatkaa juuri tehtyä)
1. **Kortin FYS / PSY / SOS -rivit** samalla kehitysteksti-mallilla kuin TEK + ÄLY (FYS:llä H-H/"matka
   pronssiin" -logiikka valmiina). Yhtenäistää kortin — pieni, luonteva jatko selkeys-paketille.
2. **Version-bump kattamaan VP + Seura** (nyt vain 4/6 appia auto-stampataan → jäävät jälkeen).
3. Tapahtuman **joukkue-slugin kanonisointi** (`"KPV U13"` → `kpv_u13`) luonnissa.
4. **Savutesti-orpodokumentit** (`_rsvpsmoke_`) — poista superadminina.

### 🟡 Keskipitkä (feature)
5. **IDP-kortti P1** (radar normi-overlay PHV-korjattuna + 5D 5/5) — arvokas valmentajalle.
6. **IDP-kortti P2** (saatavuus-chip, pelipaikkafundamentit, välitavoitteet).
7. **Vaihe 7** (fysiikkajakso) — sama jaksosyklimoottori, D1-fokus + §28 PHV-portti.
8. **`CODE_TASK_DATA_TUOREUS`** — mittauspäivä + "📍 Päivitä mittaus" + kaikki pvm `pp.kk.vvvv`. Brief
   repossa; varmista onko toteutettu (§26 pari-invariantti `hh_pvm` liittyy tähän).
9. Ilmoitukset **c.4b (email) / c.4c (push)** — kalenteri-epicin jatko · **K5** kuorma/dropout · **K6** iCal.

### 🔴 Tekninen velka (korrektisuus > siisteys — ks. TILANNEKUVA_ROADMAP §4/§5)
10. **Versiointi kuntoon (V5/V7):** sama jaettu lib pyörii tuotannossa **eri versioina eri apeissa** →
    aito korrektisuusriski. Ratkaisu: synkkaus-skripti tai kevyt esbuild-bundleri (poistaa `?v=`-käsityön).
11. **Kalenteri-ytimen ekstraktio (V2):** `lib/tm_kalenteri.js` laajennus, kuluttaja-apit lataamaan sitä
    (nyt Pelaaja/Vanhempi + Master/VP duplikoivat lataus/RSVP/läsnäolo). Bugit ovat eläneet juuri täällä.
12. **Kortti/5D-ytimen ekstraktio (V1):** `_fcKorttiData`/`_laskeStage`/OVR yhteen testattuun moduuliin
    (nyt 4× duplikoitu, 0 käyttäytymistestiä). Tee kun kortti-featuret vakiintuneet — testit ensin.
13. **Ohut data-kerros (V3/V4):** repository hot-poluille (271 inline `db.collection`-kutsua hajallaan).
14. Backend-monoliittien pilkkominen (V8), auth-yhtenäistys (V11/V13).

### 👤 Ei-koodi (Tero hoitaa)
- **Miko Alho (SJK P15, PalloID 35006508):** `suostumusTila:"odottaa"` → PIN aktivoituu vasta suostumuksesta.
  Varmista äidin oikea email (vs s.jaana@gmail.com), korjaa `huoltajaEmail`, lähetä kutsu uudelleen. Alaikäisdata → ei automaattista suostumusta.

---

## 5. Suositeltu etenemisjärjestys

1. **Kortin FYS/PSY/SOS-rivit (#1)** — sulkee selkeys-kierroksen: koko 5D-kortti samalla kehitysteksti-mallilla.
2. **Versiointi kuntoon (#10)** — halpa, mutta poistaa aidon riskin (apit ajavat eri lib-versioita); kannattaa ennen isoja ekstraktioita.
3. **IDP-kortti P1 (#5)** — radar normi-overlay PHV-korjattuna, korkea arvo valmentajalle.
4. Sitten kalenteri-ydin (#11) tai Vaihe 7 (#7) tarpeen mukaan.

**Ohjaava periaate:** ekstraktoi puhdas ydin → testaa → migroi yksi app kerrallaan behavior-preserving →
verifioi. Sama kuri joka on tuottanut kypsän `lib/`-kerroksen.

---

## 6. Keskeiset invariantit (muistilista — täydet CLAUDE.md)
- **§7.22:** pelaajalle EI tasolukuja/normivertailua/TKI-laskua — kannustava kieli.
- **§28:** pre-PHV heikko fyysinen = neutraali, ei kehityskohde; kasvumittaus-ohjaus, ei piilotus.
- **§34 §3.2 KAKSI DELTAA:** abs-delta JA TKI-delta erikseen; TKI-lasku ei punaisena jos raaka parani.
- **§26:** pikakentät (ei alikokoelmakyselyjä renderissä); arvo+pvm-pari atomisesti.
- **§23/§26 protokolla:** syöttö/pujottelu H-H (Eerikkilä 1–3) vs TK (kilpailu 1–5) — sama rata, eri normi, ei sekoiteta.
- **Deploy:** `?v=`-bump kun jaettu lib muuttuu; Pages-lähde = GitHub Actions (ei branch).
- **Verifiointi:** Code on raportoinut "valmista" myös kun koodi puuttui haarasta → **verifioi AINA L1+L2+L3.**

---

## 7. Viittaukset
- **Tekninen velka -rekisteri (V1–V14) + dekompositiosuunnitelma:** `docs/TILANNEKUVA_ROADMAP.md` §4–§6 (yhä validi).
- **Domain/engine-invariantit:** `CLAUDE.md` (§14 metodologia · §23 TKI · §26 pikakentät · §28 kehitysikkunat · §34 TKI-analyysimalli).
- **Selkeys-paketin briefit:** `docs/CODE_OHJE_SELKEYS_1..4_*.md` + design-map artefakti `tm-pelaajakortti-selkeys`.
- **Teknis-taktinen ketju:** `docs/CODE_TASK_VAIHE6_SILMUKAN_SULKU.md`, `docs/ARVIOINTIKEHYS_VS_CURRICULUM.md`.
