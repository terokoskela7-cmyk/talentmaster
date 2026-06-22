# Review-kadenssimoottori — spec (VP)

> Scoping 2026-06-18 (Tero). Benchmarkin (`VP_ARVIOINTI_JA_KADENSSI.md §4`) puolustettavin yksittäinen VP-ominaisuus, ja
> **rakennettavissa heti** (kadenssi on päivämääräpohjainen, ei vaadi monikausidataa). Kytkeytyy: MDT-raportti P0b · poikkeuskehys ·
> §12 Rules · §28 ikä · §30 longitudinaali · VP_BENCHMARK §7 (VP:n arviointi). Periaate: "näytä mitä on", data-tietoinen, §17/§5/§7.1.

---

## 1. TAVOITE

Akatemiassa pelaajan kehitystä **tarkastellaan kiinteällä kadenssilla** (EFL/PL Youth Development Rules): muodollinen
**MDR (monitieteinen review) 6 vk välein U12+, 12 vk välein U9–U11**, + **kvartaalipotentiaali ~3–4×/kausi**. Moottorin tehtävä:
**(1)** seuraa per pelaaja milloin review viimeksi tehtiin → milloin seuraava erääntyy, **(2)** liputa myöhässä/erääntymässä,
**(3)** roll-up per joukkue/seura (on-time-%), **(4)** syötä VP-prosessituloskorttiin. Tämä on samalla **VP:n arvioinnin prosessikerros**
(benchmark §1.B) ja **VP:n viikkotyön kattavuuden varmistus** (§2).

---

## 2. KADENSSISÄÄNNÖT

- **MDR:** ikä ≥ 12 → **42 pv** (6 vk) · ikä 9–11 → **84 pv** (12 vk). (Pilotti U10–U16 → molemmat kaistat.)
- **Kvartaalipotentiaali:** ~**90 pv** (erikseen MDR:stä; "potentiaali" ≠ "nykysuoritus").
- **Ikä:** kanoninen `normiIka(syntymaVuosi, pvm, joukkue)` / joukkuenimi-fallback (puuttuva DOB yleinen — §RAE).
- **Status per pelaaja (väri):**
  - 🟢 **ajan tasalla** — seuraava erääntyy > 7 pv päästä
  - 🟠 **erääntymässä** — ≤ 7 pv erääntymiseen
  - 🔴 **myöhässä** — erääntynyt (pv yli)
  - ⚪ **ei reviewia** — ei koskaan tehty (gate: vähintään 1 review pohjaksi)
- **Kynnykset `opts`-säädettävissä** (grassroots-todellisuus: pilotissa kadenssi voi alkaa löysempänä — vahvistetaan komento­vaiheessa).

---

## 3. DATA — KRIITTINEN UUSI PALANEN

**Nykytila:** MDT-raportti (P0b) on **lukutila + sessio-paikallinen muokkaus** — review-tapahtumaa EI tallenneta. Kadenssimoottori
vaatii, että **reviewin valmistuminen kirjautuu Firestoreen.** Tämä on moottorin perusta.

**Kirjoituspiste:** MDT-raportin "Merkitse review tehdyksi" -toiminto (johtaja/valmentaja-skinissä, päätös/muistiinpanon yhteydessä) →
```
seurat/{sid}/pelaajat/{pid}/reviewit/{pvm}   (oma dok per review)
  tyyppi: 'mdr'|'potentiaali', pvm (ISO), tekija_uid, tekija_rooli,
  paatos (VP:n muistiinpano), idp_paivitetty (bool), ikavaihe
```
**Pikakentät pelaajaan** (§26, ei alikokoelmakyselyjä renderöinnissä):
```
review_viimeisin_pvm, review_viimeisin_tyyppi,
review_potentiaali_pvm (erikseen),
idp_paivitetty_pvm (IDP-tuoreus)
```
**Rules (§12):** `reviewit/{pvm}` read: SA||onSeuranJäsen · create/update: SA||onOmanSeuranValmentaja||onJohtoRooli · delete: SA.
Pikakentät pelaaja-dokumentin write-säännön piirissä. (Erillinen Console-deploy.)

---

## 4. LASKENTA (puhdas, testattava — lib)

`laskeReviewKadenssi(p, nyt, opts)` → `{ status, erääntyyPvm, ylimääräPv, viimeisinPvm, tyyppi, ikakaista }`:
- ikäkaista `normiIka`:sta → 42/84 pv.
- `erääntyyPvm = review_viimeisin_pvm + kaistapv`; `ylimääräPv = nyt − erääntyyPvm`.
- status §2:n mukaan. Ei `review_viimeisin_pvm` → ⚪.
Roll-up (joukkue/seura): `on_time_% = (🟢+🟠)/(arvioitavat)`, `myöhässä_n`, `ei_reviewia_n`, `idp_tuoreus_%`.
**Vitest:** kaistaraja 11→12 v (84→42) · erääntynyt/erääntymässä/ajan tasalla · ei-reviewia · roll-up-%.

---

## 5. UI (VP) — kaksi pintaa

**A. "Review-kadenssi" -näkymä** (uusi VP-osio TAI Raportit-välilehden ylälohko):
- **Roll-up per joukkue:** on-time-% + myöhässä-n + ei-reviewia-n (väri). Systeeminen kuva.
- **Pelaajalista (myöhässä ensin):** nimi · joukkue · status-piste · "viimeisin / erääntyy" · → **drill avaa MDT-raportin** (review tehdään siellä).
- **Suodattimet (skaalautuvuus — SJK 61, Sibbo 223):** *status* (oletus **"Vaatii huomiota" = myöhässä + erääntymässä** → lyhyt lista; lisäksi Ajan tasalla / Ei reviewia / Kaikki) + *joukkue* (rajaa yhteen). Klubiyhteenveto + joukkue-roll-up pysyvät ylhäällä, suodatin koskee vain pelaajalistaa.
- Tyhjä/aloitus: "Ei reviewejä vielä — aloita ensimmäinen MDT-review."

**B. MDT-raportti (P0b) saa kirjoituspisteen:** "✓ Merkitse review tehdyksi" (johtaja/valmentaja-skini) → kirjoittaa review-tapahtuman + pikakentät → status päivittyy. (VP-muokattu päätösteksti tallentuu `paatos`-kenttään → ei enää pelkkä sessio-paikallinen.)

**C. (Vaihe 2) VP-prosessituloskortti** — super-admin/liitto-tasolle (objektiivisuus, ei VP:n omaan näkymään): MDR on-time-% · IDP-tuoreus-% · kattavuus-% · (myöhemmin) kalibraatiovarianssi · CPD/lisenssi · RAE-reiluus. Output-KPI:t monikausi-trendinä datan karttuessa.

---

## 6. VAIHEISTUS

1. **Vaihe 1 (rakennettavissa heti):** review-kirjoituspiste (MDT "Merkitse tehdyksi" → Firestore) + `laskeReviewKadenssi` (lib) + Review-kadenssi-näkymä (roll-up + pelaajalista + drill) + Rules. **Tämä tuo kadenssin + kattavuuden eläväksi.**
2. **Vaihe 2:** VP-prosessituloskortti (super-admin-taso) + IDP-tuoreusseuranta + kvartaalipotentiaalin erottelu.
3. **Vaihe 3:** VP:n viikkodashboard (kattavuus "kuka näkemättä tällä syklillä") + output-KPI:t monikausi-trendinä (§30-gate).

---

## 7. PÄÄTÖKSET VAHVISTETTAVAKSI (huomenna ennen komentoa)

1. **Kadenssikaistat:** otetaanko EFL-standardi (42/84 pv) suoraan, vai **löysempi pilottikadenssi** aluksi (esim. 8/16 vk) kun datankeruu vasta alkaa? (`opts`-säädettävä joka tapauksessa.)
2. **Review-tallennuksen sijainti:** alikokoelma `reviewit/{pvm}` + pikakentät (suositus) vs. pelkkä pikakenttä + `review_historia[]`-array.
3. **Kuka saa merkitä reviewin:** VP + valmentaja (suositus) vai vain VP/johto?
4. **"Review" = MDT-raportin vahvistus** (suositus, kytkee P0b:hen) vai kevyempi erillinen kuittaus?
5. **Sijainti (suositus):** **oma "Reviewit"-VP-nav** (hallintapinta: roll-up + statuslista + drill MDT:hen) **+ lippu Tilanteeseen** ("N myöhässä reviewistä", needs-attention). Vaihtoehto: Raportit-välilehden ylälohko.

## 8. HUOMISEN SEKVENSSI

1. Vahvista §7 päätökset (kadenssikaistat · tallennuspaikka · kuka merkitsee · review=MDT-vahvistus · sijainti).
2. **Visuaalinen mockup** (roll-up per joukkue + statuslista myöhässä-ensin + "✓ Merkitse review tehdyksi") → sign-off (kuten MDT-mockup).
3. Vaihe 1 -komento Codelle (kirjoituspiste + `laskeReviewKadenssi` + näkymä + Rules) → live-verify.

> **Status:** suunnitelma valmis, visuaalinen suunnittelu + §7-päätökset huomenna ennen komentoa.
