# Tilanne-tason poikkeuskehys (VP) — spec

> Scoping 2026-06-18 (Tero). VP Tilanne-sivun "exception management" -kerros: missä kukin joukkue **poikkeaa
> odotuksesta** — ei keskiarvo vaan poikkeama. Hyödyntää §26 pikakenttiä + osaindeksejä (`laskeD1Osaindeksit`)
> + delta-kenttiä. Liittyy: §19 (VP), §28 (kehitysikkunat), §30 (KPI), §34 (TKI), renderSignaalit (tehtäväsignaalit).
> Periaate: **VP skannaa liput, ei lukuja.** Hiljaista kun joukkue odotetulla tasolla; lippu kun poikkeaa.

---

## 1. TAVOITE & BASELINE

**Odotus = Eerikkilä taso 3** (ikäluokan kansallinen keskitaso) — tavoite kaikilla akatemiapelaajilla, ja erityisesti
joukkueen parhailla / talenttipelaajilla. Ikäkorjattu, puolustettava, toimii myös yhdellä joukkueella.

**Kaksi linssiä samaan dataan:**
- **Koko ryhmä** — joukkueen ka per dimensio/osaindeksi vs taso 3.
- **Talenttiydin (top-5 / top-10 ka)** — joukkueen parhaat pelaajat (composite-tason mukaan, tai `talenttiOhjelma===true`)
  vs taso 3. Akatemiaodotus: ydin yltää taso 3+. Jos talenttiydin on alle normin → eri (kovempi) signaali kuin ryhmän ka.

**Cross-team (klubin omat joukkueet)** = VAIHE 2, aktivoidaan kun longitudinaali-/poikkileikkausdataa on riittävästi.
Ei rakenneta nyt (pieni N → kohinaa).

---

## 2. POIKKEAMATYYPIT (per joukkue)

1. **Alle normin (taso)** — dimension/osaindeksin ka < kynnys. `< 2.5` = vahva, `2.5–2.9` = lievä. Paikantaa *minkä*
   osa-alueen (osaindeksit: Kiihdytys/Maksiminopeus/Voima/Ketteryys/Aerobinen; tekniikka TKI/D2).
2. **Profiilipoikkeama (epätasapaino)** — yksi osa-alue ≥1.0 muita heikompi (esim. Nopeus 2.5 mutta Aerobinen 1.0).
   Osaindeksit mahdollistavat. Kertoo *kohdennetun* harjoitusteeman.
3. **Laskeva trendi** — `delta < −0.3` ≥2 pelaajalla (`hh_taso_edellinen` / `tki_edellinen`).
4. **Sisäinen hajonta** — merkittävä osa pelaajista tasolla ≤2 vaikka ka näyttää ok (jakautunut joukkue).
5. **Talenttiydin alle normin** — top-5/10 ka < taso 3 (talent-ID-huoli, kovempi kuin ryhmän ka).
6. **Kattavuusvaje** — kattavuus < kynnys → "ei voi arvioida" (datapuute, EI suorituspoikkeama; eri luokka).

---

## 3. PHV / §28 -KÄSITTELY (porrastettu osaominaisuus + ikäproxy)

Eerikkilä-normit ovat kronologisesti ikäkorjattuja, **eivät biologisesti** → myöhäiskehittyjä voi näyttää "alle normin"
pelkän kypsymisajoituksen takia. Ilman PHV-dataa emme erota aitoa puutetta normaalista myöhäiskehityksestä → porrasta:

| Osa-alue | Herkkyysikkuna (§28) | Käsittely |
|---|---|---|
| **Kiihdytys** (5/10m) | pre-PHV neuraalinen | Alle normin = **aito signaali jo nuorena.** Liputa normaalisti. |
| **Maksiminopeus** (30m) | post-PHV | pre-PHV alle normin = **"ikävaihe-odotettu"** caveat (info/amber, EI punainen, pois interventiolistasta). |
| **Aerobinen** (MAS) | post-PHV | sama caveat pre-PHV. |
| **Voima** (CMJ) | post-PHV (pre-PHV = koordinaatio) | sama caveat pre-PHV. |
| **Tekniikka** (D2/TKI) | pre-PHV taitoikkuna | heikko nuorena = **kriittisempi** (ikkuna sulkeutuu). Liputa normaalisti/korostetusti. |

**Pre-PHV-tunnistus:** ikäproxy — kohortti ≤13 v = pääosin pre-PHV → caveat post-PHV-ominaisuuksiin; ≥14–15 v =
toiminnallinen. **`phv_tila` ohittaa ikäproxyn aina** (PRE→caveat, POST→toiminnallinen). Ikä `normiIka`/joukkuenimi.

**Periaate: näytä aina, kehystä oikein** — ei piiloteta, ei väärää punaista hälytystä. Linjassa app:n "(ikäoletus)"-kehyksen kanssa.

---

## 4. VAKAVUUSJÄRJESTYS & SUODATUS

- 🔴 **punainen** — talenttiydin alle normin · vahva alle normin (toiminnallinen osa-alue) · laskeva trendi.
- 🟠 **amber** — lievä alle normin · profiilipoikkeama · sisäinen hajonta · ikävaihe-odotettu fyysinen.
- ⓘ **info** — kattavuusvaje.
- Normaalit joukkueet (ei poikkeamaa) → **ei riviä** (hiljainen). Tyhjä tila: "Ei poikkeamia — kaikki odotetulla tasolla."

---

## 5. UI (roll-up + pulssikortti-liput)

**A) Roll-up "Joukkueiden poikkeamat"** — uusi osio Tilanteeseen (joukkuepulssin yhteyteen). Priorisoitu lista
(vakavuus↓): per rivi `joukkue · poikkeama (osa-alue + arvo) · ehdotettu teema · [ikävaihe-odotettu jos] → drill syvänäkymään`.
Esim: "U15 · Aerobinen alle normin (1.0) → aerobinen blokki", "T13 · Tekniikkahajonta (4 pel. ≤2) → tekniikkateema".
Drill-through `avaaJoukkueSyvanakyma(joukkue)`. Tyhjä: hiljainen vihreä tila.

**B) Pulssikortti-lippu** — `renderTeamPulse`-korttiin yksi poikkeamalippu (pahin) D1/D2-otsikon viereen/alle:
väri-chip + lyhyt teksti (esim. "⚠ Aerobinen alle normin" / "↘ Tekniikka laskussa" / "◑ hajonta"). Normaali kortti = ei lippua.

**Blendatut otsikkoluvut** (hero "D1 Fyysinen", seuratason `renderKehitysKortti`) **säilyvät lajitteluavaimina** —
poikkeuskehys on niiden päälle tuleva exception-kerros, ei korvaa.

---

## 6. DATA & RAJAT

- Lukee jo ladattua `_pelaajat`-dataa + pikakenttiä (§26): `hh_taso`, `d1_taso`, `tki_viimeisin`, `tki_merkki`,
  `hh_viimeisin` (osaindeksit `laskeD1Osaindeksit`), `hh_taso_edellinen`, `tki_edellinen`, `phv_tila`, `talenttiOhjelma`,
  `flei_viimeisin`. **EI uusia Firestore-kyselyjä.**
- Osaindeksit kanonisesta `laskeD1Osaindeksit(hh_viimeisin, ika, sp)`:stä (lib `?v=16`). Ikä/sp `normiIka`/joukkuenimi.
- Ei päällekkäisyyttä `renderSignaalit`-moottorin kanssa: se = tehtäväsignaalit (kattavuus, IDP, suostumus, lähellä
  pronssia); poikkeuskehys = suoritusprofiilin poikkeamat (osa-alue, trendi, hajonta, talenttiydin). Kattavuusvaje voi
  esiintyä molemmissa — poikkeuskehyksessä vain "ei voi arvioida" -kontekstina, ei tuplattuna toimenpiteenä.

---

## 7. KYNNYKSET (ensimmäinen veto, säädettävissä)

- Alle normin: ka `< 2.5` vahva · `2.5–2.9` lievä (taso 3 = normi).
- Profiilipoikkeama: heikoin osa-alue ≥ `1.0` alle ryhmän osa-alueiden ka.
- Laskeva trendi: `delta < −0.3` ≥2 pelaajalla.
- Sisäinen hajonta: ≥ `33 %` pelaajista tasolla ≤2 JA ryhmän ka ≥ 2.5.
- Talenttiydin: top-5 (tai top-10 jos n≥15) ka `< 3.0`.
- Kattavuusvaje: testattuja `< 50 %` joukkueesta.
- Pre-PHV ikäproxy: kohortti-ikä `≤ 13`.

---

## 8. VERIFIOINTI

- new Function 0 virhettä · npm test vihreä (uudet poikkeama-yksikkötestit: kynnykset, PHV-caveat, talenttiydin) · §17 @media=1.
- RUNTIME + LIVE (?cb=, SA): SJK (H-H+TKI) → roll-up + liput; pre-PHV-kohortti (esim. nuori joukkue) → fyysinen
  "ikävaihe-odotettu" eikä punainen; Sibbo (TKI-only) → tekniikkapoikkeamat näkyvät, fyysiset eivät hälytä; tyhjä tila
  kun ei poikkeamia. Carbon (§5) + string concat (§7.1).

---

## 9. SEKVENSSI

1. **Tämä spec + sign-off.**
2. Lib: poikkeama-laskenta (puhdas funktio, testattava) — `laskeJoukkuePoikkeamat(pelaajat, ika, sp, opts)` → lista
   `{tyyppi, osaAlue, vakavuus, arvo, teema, ikavaiheOdotettu}`.
3. VP UI: roll-up-osio + pulssikortti-liput (`renderTeamPulse`).
4. Verify (RUNTIME + LIVE).
5. (VAIHE 2) cross-team-vertailu kun dataa riittää.
