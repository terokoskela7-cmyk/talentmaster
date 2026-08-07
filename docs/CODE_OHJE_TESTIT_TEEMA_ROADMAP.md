# CODE — Testit-teema: kokonaissuunnitelma + vaiheistus (aloita tästä)

**Tämä on Testit-teeman master-ohje** — Code saa täältä kaiken kontekstin ja vaiheiden järjestyksen.
**Design-totuus:** artefakti/design-kartta `tm-testit-hub-designmap` (nykytila-analyysi + hub + joustava testivalitsin + vaiheistus).
**Kohteet pääosin:** `TalentMaster_VP_v25.html`, `TalentMaster_Master_v16.html`, `TalentMaster_Testaus_v9.html`, `TalentMaster_Excel_Tuonti.html`.

## Tausta (SJK:n valmennuspäällikön palaute)
1. Ei löydä mistä testitulokset tallennetaan — toiminto on hitsattu kalenteriin (vaikea), eikä missään lue "tuo testitulokset tästä".
2. Yksittäisen tuloksen kirjaus yhdelle/usealle pelaajalle puuttuu (kevyt polku).
3. **Väärän tuloksen korjaus puuttuu** — jos näppäilee väärin, tulosta ei voi muokata valmiiksi-merkinnän jälkeen.
4. **Ei olla jäykkiä protokollista:** useimmat seurat soveltavat — valitsevat protokollasta sopivat testit tai yksittäisiä testejä. Testivalinnan on oltava joustava.

## Cross-cutting-periaatteet (koskevat KAIKKIA vaiheita)
- **Protokolla on lähtökohta, ei pakko.** Joustava testivalitsin (protokolla-esitäyttö → karsi/lisää, tai tyhjästä). Datamalli tukee jo (`aktiiviset_testit`).
- **Yksi koti, selkeät nimet.** "🧪 Testit" -työtila; sana "testitulokset" näkyy käyttäjälle.
- **Yksi pikakenttälaskennan lähde.** Kaikki kirjaus/tuonti/muokkaus laskee §26-pikakentät **samalla logiikalla** (Kenttätyökalu Vaihe 1:n `_v6TallennaPikakentat` / Vaihe 3:n jaettu `tmLaskePikakentat`). Ei kolmatta divergoivaa kopiota.
- **§26 pari-invariantti:** `*_viimeisin` + `*_pvm` aina yhdessä, samasta tuloksesta, atomisesti.
- **Roolit:** kirjaus + muokkaus = **vp · testivastaava · fysiikkavalmentaja · valmentaja** (valmentaja omiin pelaajiinsa; muut laajemmin). Nämä roolit saavat jo kirjoittaa testituloksia → **ei uutta Rules-tarvetta** (sama kirjoituspolku).
- **Kalenteri jää valinnaiseksi** — testitapahtuman voi ajastaa, mutta tulosten kirjaus ei vaadi kalenteritapahtumaa.
- **Design-lukko + molemmat teemat** (talentmaster-design-system). **§7.22:** nämä ovat VP/valmentaja-pintoja, ei pelaajalle kovia lukuja.

## Tila (2026-08-07)
- ✅ **Kenttätyökalu Vaihe 1** (`_v6TallennaPikakentat` Testaus_v9:ssä) — **valmis, mergetty, live-verifioitu** (Topias: kentältä kirjattu tulos näkyy VP:llä ilman recalcHH:ta; merge säilyttää muut testit; §26 pari-invariantti). Muokkaus/pikakirjaus **käyttää tätä samaa laskentaa uudelleen.**
- ⏳ **Vaihe 1b** (§29 delta-vangitseminen `hh_taso_edellinen`/`tki_edellinen` pvm-vahdilla myös kentältä) — pieni jatko, ei estä muuta.

---

## VAIHEET (kukin oma PR, verifioidaan livenä ennen seuraavaa)

### P0 — Hub-kuori + nav + rikki stubin korjaus ⭐ ALOITA TÄSTÄ
**Täysi ohje: `docs/CODE_OHJE_TESTIT_HUB_P0.md`.** Tiivistys: lisää VP:hen "🧪 Testit" -nav + `ws-testit`-hub kahdella
ryhmällä (**Kirjaa nyt**: Kirjaa kentällä · Pikakirjaus[tulossa] · **Tuo tiedostosta**: Excel-pohja · Historiatuonti ·
Palloliiton PDF) + "Viimeksi testattu" -lista (`_tapahtumat`); korjaa rikki `avaaUusiTestiModaali` → `setWs('testit')`.
Kortit reitittävät olemassa oleviin työkaluihin; **ei uutta kirjaus-/tuontilogiikkaa.** Pikakirjaus = selkeä "tulossa", ei stub.

### P1 — Tuo tiedostosta + joustava testivalitsin
- Kokoa "Tuo tiedostosta" -ryhmä: **Excel-pohja** (lataa→täytä→tuo yhtenä korttina, selkeä opaste), **Historiatuonti**
  (Excel Moodi B, aiempien vuosien tulokset), **Palloliiton PDF** — kaikki nykyisen `Excel_Tuonti.html`:n päälle
  (**säilyvät, eivät katoa**), yksi työkalu molemmille rooleille.
- **Joustava testivalitsin (jaettu komponentti):** protokolla-esitäyttö (H-H laaja/suppea, tekniikkakilpailu, harjoitettavuus, tyhjä)
  → testit ruksattavina, karsi/lisää vapaasti → Excel-pohja generoituu **valituille testeille**. Alustaherkille alusta kysytään vain
  kun ne mukana (§22). Sama valitsin palvelee myös P2:ta ja kenttäkirjausta.

### P2 — Pikakirjaus (1–N pelaajaa, tapahtumaton)
- Kevyt lomake: valitse **testi(t)** (joustava valitsin) + **yksi tai useampi pelaaja** → syötä kullekin arvo → tallenna kerralla.
- Kirjoittaa **tapahtumattomaan** `testitulokset/{pvm}_{protokolla}`-polkuun (kuten Excel Moodi B) + **laskee pikakentät heti**
  (Vaihe 1:n logiikka). **Upsert samalla pvm:llä** → saman päivän uudelleensyöttö = korjaus (ei duplikaattia).
- Sijainti: valmentajan **Master_v16** + VP:n hub. Offline-ensin kuten kenttänäkymä. **Riippuvuus:** Vaihe 1 (valmis).

### P3 — Master-pariteetti + roster-Excelin erotus
- Master "07 Testit" saa saman hub-etusivun (Kirjaa nyt / Tuo tiedostosta). Seuran "📥 Tuo Excel" (pelaajaroster) →
  nimeä **"Tuo pelaajat / roster"**, ettei sekoitu testitulos-tuontiin.

---

## P-EDIT — Testituloksen MUOKKAUS (kestävä ratkaisu) 🆕
> Uusi vaatimus (SJK): väärän tuloksen korjaus. Rakennetaan **oikein**, ei "kirjoita päälle". Voidaan tehdä P1/P2:n
> rinnalla (nojaa Vaihe 1:n pikakenttälaskentaan, joka on jo valmis). **Roolit: vp · testivastaava · fysiikkavalmentaja ·
> valmentaja** (valmentaja omiin pelaajiinsa).

Kaksi toisiaan täydentävää polkua:

### E1 — Avaa tapahtuma uudelleen muokattavaksi (koko testipäivän korjaus)
- Valmiiseen (`tila:'valmis'`) testitapahtumaan **"↩ Avaa uudelleen muokattavaksi"** (yllä olevat roolit) → `tila:'avoin'`
  + audit-kentät (`avattu_uudelleen_uid`, `avattu_uudelleen_pvm`). Kenttänäkymä muokattavaksi (nyk. `_v5SyotaYritys` toimii avoimena).
- Korjaa arvo(t) → **"Merkitse valmiiksi"** → **Vaihe 1:n `_v6TallennaPikakentat` ajaa automaattisesti** → pikakentät korjautuvat.
- Reunaehto: käytä olemassa olevaa kenttänäkymää + valmiiksi-merkintää — **ei uutta syöttöUI:ta.** Vain tila-siirtymä + audit.

### E2 — Per-pelaaja yhden tuloksen muokkaus (yksi väärä luku)
- Pelaajan **testihistoriasta** (Testit-hub per pelaaja / pelaajakortti) rivin kohdalla **"✎ Muokkaa"** → korjaa arvo(t)
  → tallenna: päivittää testitulos-dokin (`testitapahtumat/.../tulokset/{pid}` TAI `testitulokset/{pvm}_{protokolla}`),
  **korjaa historiarivin paikallaan** (ei lisää uutta `hh_historia`/`tki_historia`-riviä), + **laskee pikakentät uudelleen**
  (jaettu Vaihe 1:n kanssa). Audit: `muokkaaja_uid`, `muokattu_pvm`, `alkuperainen_arvo`.

### ⚠ KRIITTINEN oikeellisuusvartija (molemmat polut) — tämä tekee ratkaisusta kestävän
1. **Laske pikakentät uudelleen VAIN jos muokataan viimeisintä tulosta.** Vertaa muokatun tuloksen pvm:ää pikakentän
   `*_pvm`:ään: jos `muokattu_pvm >= hh_pvm/tki_pvm/…` → laske pikakentät uudelleen; jos muokataan **vanhempaa** tulosta →
   **älä ylikirjoita uudempaa pikakenttää** (päivitä vain testitulos-doc + historiarivi). Muuten vanha korjaus pyyhkisi tuoreen tilan.
2. **Ei tupladeltaa (§29).** Muokkaus on korjaus, EI uusi testi → **älä vangitse `*_edellinen`-deltaa** muokkauksesta. Recompute
   laskee arvot uudelleen datasta; delta-vangitseminen tapahtuu vain aidosta uudesta testistä (Vaihe 1b).
3. **Merge-turva:** pikakenttien uudelleenlaskenta lukee koko pelaajan viimeisimmän patteriston (kuten recalcHH), ei pelkkää
   muokattua kenttää → `hh_viimeisin` pysyy täytenä.

---

## Vaiheistus-yhteenveto (riippuvuudet)
```
Vaihe 1 (pikakentät) ✅ ──┬─→ P2 Pikakirjaus         (nojaa laskentaan)
                          └─→ P-EDIT Muokkaus (E1+E2) (nojaa laskentaan)
P0 hub-kuori ⭐ ─→ P1 Tuo+valitsin ─→ P3 Master-pariteetti
Vaihe 1b (delta) ⏳ = erillinen pieni jatko
```
Suositeltu järjestys Codelle: **P0 → P1 → (P-EDIT rinnalla) → P2 → P3.** P0 poistaa suurimman löydettävyysongelman pienimmällä työllä.

## Yhteiset reunaehdot
- Ei uutta laskentaa (kanoniset libit + Vaihe 1:n logiikka). Ei uutta skeemaa. **Ei uutta Rules-tarvetta** (roolit saavat jo kirjoittaa).
- §26 pari-invariantti · yksi pikakenttälaskennan lähde · joustava testivalinta · audit muokkauksessa (§33).
- Design-lukko + molemmat teemat · §7.22 (VP/valmentaja-pinnat). Ei käsin-versiobumppia (§33 + CI-vartija).
- **Kukin vaihe oma pieni PR, verifioidaan livenä ennen seuraavaa. Raportoi ennen mergeä.**
