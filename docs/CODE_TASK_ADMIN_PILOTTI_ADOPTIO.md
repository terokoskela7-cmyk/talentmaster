# Admin "Pilotin tila" — toimihenkilöiden adoptiomittarit (pilotin vaihe 2)

> **Miksi nyt:** tulossa **SJK- ja Sibbo-toimihenkilökoulutukset**. Tarvitaan **baseline ENNEN koulutuksia**, jotta
> koulutuksen vaikutus näkyy ennen/jälkeen-vertailuna. Jälkikäteen rakennettuna suurin osa arvosta on menetetty.
> **Kohde:** `TalentMaster_Admin.html` → **laajenna olemassa olevaa** `renderPilotinTila`-näkymää (§33, `docs/PILOTIN_TILA_SPEC.md`).
> **EI uutta sivua, EI uutta datamallia.** Reuse VP_v25:n Aktiivisuus-laskenta (10 virtaa) seuratasolle aggregoituna.
> Tämä on täsmälleen se mitä `PILOTIN_TILA_SPEC.md §5/§6` lykkäsi "vaihe 2:een" — ei päällekkäistä työtä (overlap-tarkistus §9).

---

## 0. ESIEHTO — KORJAA ENSIN: `viimeisinKirjautuminen` on LUKU ILMAN KIRJOITTAJAA (live-bugi)

**Verifioitu lähteestä (main, 20.9.2026):** `viimeisinKirjautuminen` esiintyy koodipohjassa **vain lukuna**:

| Paikka | Rooli |
|---|---|
| `TalentMaster_VP_v25.html:4625–4630` (`laskeVAI`, n4 Kontakti) | **lukee** |
| `archive/TalentMaster_VP_v22.html` | lukee (arkisto) |
| **kaikki muut tiedostot, ml. `functions/`** | **ei yhtään kirjoitusta** |

**Seuraus tuotannossa juuri nyt:**
- `n4 = 0` **jokaisella** valmentajalla → **VAI+ on systemaattisesti jopa 15 pistettä liian matala** (paino 0.15).
- `if (n4 < 10)` → **punainen hälytys "Ei kirjautunut 30pv" jokaisella valmentajakortilla**, myös aktiivisimmalla.
- Tämä on ensimmäinen asia jonka toimihenkilö näkee koulutuksessa. Korjaa ennen SJK/Sibboa.

**KORJAUS (tämän taskin osa 1, tehtävä ennen mittareita — adoptiomittari nojaa samaan kenttään):**

1. **Nimi on `viimeisinKirjautuminen` (camelCase).** ⚠ `PILOTIN_TILA_SPEC.md §5/§6` ehdottaa `viimeisin_kirjautuminen`
   (snake) — **älä käytä sitä**: VP_v25 on tuotannossa ja lukee camelCasea, joten snake jättäisi VAI+:n rikki.
   Päivitä spec-doc camelCaseen samalla.
2. **Kirjoituspiste:** jaettu apuri **`lib/tm_aktiivisuus.js`** (uusi, `lib/tm_reflektio.js`-kuvio):
   ```js
   tmMerkitseKirjautuminen(db, seuraId, uid)   // best-effort, .catch(()=>{})
   // → seurat/{seuraId}/kayttajat/{uid}.update({ viimeisinKirjautuminen: serverTimestamp() })
   ```
   **Jaettu apuri, EI copy-pastea per appi** — juuri kopiointi tuotti `lasnaolo_n`-aukon (#573/#575).
3. **Kutsupaikka:** `onAuthStateChanged`-success kaikissa **toimihenkilöapeissa** joilla on `seuraId`:
   `VP_v25` · `Master_v16` · `Seura.html` · `Testaus_v9` · `ADAR_Pikakortti` · `UTJ` · `SportDirector`.
   **Admin/SA ohitetaan** — SA:lla ei ole `seuraId`-claimia (§3), ei `kayttajat`-dokkia seuran alla.
4. **Vaimennus:** kirjoita **kerran per selainsessio** (`sessionStorage`-vahti), ei joka sivulatauksella.
   Mittarin tarkkuus on päivätasoa — 1 write/sessio riittää.
5. **Rules: EI MUUTOSTA.** Oman uid:n `kayttajat`-dokin update, `rooli`/`seuraId` ei muutu → sääntö 928 sallii
   (sama polku kuin `_tmLaskuri`).
6. **Ei migraatiota.** Kenttä täyttyy eteenpäin. **Tyhjä ≠ 0:** kunnes käyttäjä on kirjautunut kerran uuden
   koodin jälkeen, näytä **"—" / "ei dataa"**, EI "0 pv sitten" eikä punaista hälytystä. Sama `laskeVAI`:ssa:
   `viimeisinKirjautuminen == null` → **jätä n4 pois painotuksesta** (normalisoi painot), älä pisteytä nollaksi.
   *(Muuten koko baseline näyttäisi katastrofilta juuri koulutusviikolla.)*

---

## 1. Sijainti

`TalentMaster_Admin.html` → `renderPilotinTila(alue)` (~1394). Uusi osio **seurariviä kohti**, suppilon +
datakypsyyden **jälkeen**, blokkeri-rivin **edelle**. Read-only, SA-taso, cross-seura (`seurat.get()` on jo).

## 2. Data — mitä on JO ladattu vs. mikä maksaa

`renderPilotinTila` lataa jo per seura (rivit ~1403 ja ~1429):
- `pd` = **kaikki pelaajat** (`pelaajat.get()`)
- `valm` = **kaikki toimihenkilöt** (`kayttajat.get()`, suodatettu rooleihin
  `valmentaja|talenttivalmentaja|fysiikkavalmentaja|vp|urheilutoimenjohtaja`)
- molemmat cachetaan `_adminTkData[seura.id]`

**→ ILMAINEN (0 uutta kyselyä)** — laske näistä:

| Mittari | Lähde | Huom |
|---|---|---|
| Toimihenkilöitä yhteensä | `valm.length` | |
| Kirjautunut 30 pv | `valm[].viimeisinKirjautuminen` | §0 jälkeen; null → "ei dataa" |
| Läsnäolot · tavoitteet · palautteet · reflektiot (kausi) | `valm[].lasnaolo_n` / `tavoitteet_n` / `palautteet_n` / `reflektiot_n` | `_tmLaskuri`-laskurit, jo olemassa |
| Viimeisin aktiivisuus per henkilö | `valm[].lasnaolo_viim` / `reflektiot_viim` / `*_viim` | serverTimestamp |
| **Aktiivisia pelaajia 30 pv** | `pd[].streak_paivitetty` | **ainoa aito pelaaja-aktiivisuuden pikakenttä** (Pelaaja_v7 kirjoittaa, `pvm`-string) |

**→ MAKSAA (4 uutta kyselyä × seura ≈ 40 lukua)** — loput 6 virtaa ovat seuran alikokoelmissa,
per-valmentaja-suodatuksella kuten `laskeVAI` (VP_v25 ~4540):
`havainnot` (**suodata `tyyppi=='adar'`** — §D2a-invariantti, `valmentaja_viesti` EI ole pelihavainto) ·
`harjoitusarvioinnit` · `mentoroinnit` · `ohjelmat`.

**PÄÄTÖS: kaksivaiheinen lataus.** Renderöi ensin ilmainen taso (näkyy heti), sitten **nappi
"⟳ Lataa täysi aktiivisuus"** joka hakee 6 loppuvirtaa. Perustelu: SA avaa Pilotin tilan usein
suppilon takia, eikä 40 ylimääräistä lukua saa hidastaa sitä joka kerta.

## 3. Mitattavat — per seura

**A · Toimihenkilöadoptio** (otsikkoluku): `kirjautuneet 30pv / kaikki` **ja** `aktiiviset / kaikki`, jossa
**aktiivinen = ≥1 virta 30 pv** (ei pelkkä kirjautuminen). Nämä ovat **eri luku** — "kävi katsomassa" ≠ "käytti".
Näytä molemmat; adoptio-ongelma on juuri se että kirjautuneita on mutta aktiivisia ei.

**B · 10 virran kausiaggregaatti:** summaa `laskeVAI`:n `kausi`-objektin kentät seuratasolle. **Sama nimistö
kuin valmentajakortilla** (pelihavainnot · arvioitu · itsereflektio · mentoroitu · ohjelmat · perhepalaute ·
lasnaolo · tavoitteet · pelaajapalaute · reflektiopaivakirja) — yksi mittari kortilta Adminille.

**C · Pelaaja-aktiivisuus:** `aktiivisia / kaikki` = `pd`-pelaajat joilla `streak_paivitetty` ≤ 30 pv.
**Vain aggregaatti** (§5).

**D · Viikkotrendi:** kirjautumiset + arvioinnit per viikko, 8 vk. **VAIHE 2** — vaatii aikasarjan, ei
pistearvon (`viimeisinKirjautuminen` kertoo vain viimeisimmän). Älä rakenna v1:een; merkitse "tulossa".

## 4. Layout (KISS + brändi)

Kompakti adoption-kortti seurariviä kohti, **hälyttävät ensin** (matala adoptio ylimmäs), kuten VP:n
valmentajaroster. Yksi rivi per seura:

```
SJK Juniorit      Toimihenkilöt 4/11 aktiivisia · kirjautunut 7/11      Pelaajat 23/61
                  ▓▓▓░░░░░░░  36 %
                  havainnot 12 · arvioinnit 3 · läsnäolot 18 · mentoroinnit 1 · …
```

- Brändi-tokenit (`talentmaster-design-system`), **molemmat teemat**, mobiili. Amber = matala adoptio,
  teal = hyvä. **Ei uusia värejä** (§5 canonical).
- **Tyhjä tila = CTA**, ei "Ei dataa" (§19 VP-audit-oppi): "Ei vielä kirjautumisia — mittari alkaa kerätä
  kun toimihenkilöt kirjautuvat."

## 5. Yksityisyys / GDPR

- Adoptio = **lukumääriä ja aggregaatteja**, ei sisältöä (sama laskuri-kuvio: laskuri kertoo MÄÄRÄN, ei mitä
  kirjoitettiin). Reflektiopäiväkirjaa **ei lueta** — vain `reflektiot_n`.
- **Toimihenkilöiden nimet ok** (henkilöstö, työsuoritus). **Pelaaja-aktiivisuus VAIN aggregoituna** —
  ei per-pelaaja-PII adoptiomittarissa. Alaikäisten dataa (B4).
- ⚠ **`lasnaolijat`-kokoelmassa on kaksi eri asiaa:** `tila` = toimihenkilön toteutunut merkintä
  (→ **toimihenkilöaktiivisuus**) · `saatavuus` = pelaajan/vanhemman oma RSVP (§35 K2b) (→ **pelaaja**-aktiivisuus).
  **Älä summaa näitä yhteen** — adoptioluku näyttäisi uskottavalta ja olisi väärä. Vartija:
  `tests/vp_aktiivisuus_kaikki_virrat.test.js` (drift-allowlist).
  *v1: RSVP:tä EI lueta lainkaan* (alikokoelma per kalenteritapahtuma = liian kallis); pelaaja-aktiivisuus
  tulee `streak_paivitetty`-pikakentästä.

## 6. Baseline — ajoitus on tämän taskin arvo

1. **Deployaa §0 (kirjautumiskirjoitus) ensin** ja anna sen kerätä dataa muutama päivä.
2. **Aja baseline-lukema ENNEN ensimmäistä koulutusta** (vie PDF, `window.print()` on jo näkymässä).
3. Koulutuksen jälkeen sama näkymä → ennen/jälkeen.

## 7. Rajaukset (v1 EI sisällä)

Viikkotrendi (§3D) · RSVP-pohjainen pelaaja-aktiivisuus · per-henkilö-drilldown Adminissa (VP-kortti on jo
se työkalu) · GDPR-ops / laskutus / Sentry-dashboard (omat hankkeensa, `PILOTIN_TILA_SPEC §5`).

## 8. Testit / vartijat

- **Vitest:** aggregaattifunktio puhtaana (syöte = `valm[]`+`pd[]`-fixture → odotettu kooste); **null-turva**
  (`viimeisinKirjautuminen` puuttuu → "ei dataa", EI 0 eikä punainen); `streak_paivitetty`-ikkunan rajat.
- **Vartija — laajenna `tests/vp_aktiivisuus_kaikki_virrat.test.js`:** `lib/tm_aktiivisuus.js` on olemassa JA
  jokainen toimihenkilöappi kutsuu `tmMerkitseKirjautuminen`ia. **Kohdejoukko johdetaan datasta** (skannaa
  `TalentMaster_*.html`, allowlist-kuvio kuten läsnäolo-drift) → uusi toimihenkilöappi punertaa kunnes se on
  kytketty. *Tämä on sama unohdusluokka kuin `lasnaolo_n` — älä lukitse listaa pelkkään muistiin.*
- **Mutaatiotesti jokaiselle väitteelle** ennen PR:ää (poista kutsu → punainen).

## 9. Overlap-tarkistus — TEHTY (ei päällekkäistä työtä)

Käyty läpi `PILOTTI_RUNBOOK.md` · `AKATEMIA_PILOTTI_SJK.md` · `SIBBO_PILOTTISOPIMUS.md` · `PILOTIN_TILA_SPEC.md`:
**adoptiomittareita ei ole missään.** `PILOTIN_TILA_SPEC §5` sanoo suoraan *"Käyttö/login-aktiivisuus → vaatii
aktiviteetti-pikakentän (esim. `viimeisin_kirjautuminen`) jota ei vielä ole → vaihe 2"* ja `§6.3` listaa sen
seuraavaksi askeleeksi. **Tämä brief = se vaihe 2.** Päivitä `PILOTIN_TILA_SPEC.md §5/§6` valmistuttua
(camelCase-nimi + "toteutettu").
