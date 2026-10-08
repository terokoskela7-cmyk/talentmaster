# CODE BRIEF · S1.1 — Käyttöaste: ovatko pelaajat ja perheet mukana (Admin + seura) · ennen 1.11.2026

**Kaista: Tero** (`functions/`, Rules, Admin, VP_v25). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Tausta (Tero 8.10.):** kun Sibbo ja KPV lähtevät käyntiin 1.11., Administa pitää nähdä, käyttävätkö pelaajat ja perheet sovellusta. Pilottiseurat haluavat seurata samaa itse.
**Nykytila:**
- Henkilökunnan kirjautuminen kirjataan (`viimeisinKirjautuminen`, `lib/tm_aktiivisuus.js`).
- Pelaajista ja huoltajista ei kirjata mitään. Adminin "Pilotin tila" näyttää kutsut, suostumukset, testauksen ja valmiuden, mutta ei käyttöä.

**PM:n lukutarkistus 8.10. (vain lukumäärät):**

| Seura | Pelaajia | Suostumus annettu | Kirjannut koskaan | Kirjannut 30 pv |
|---|---:|---:|---:|---:|
| SJK | 61 | 36 | 11 | 1 |
| Sibbo | 246 | 38 | 1 | 1 |

Lisäksi: viikkokatsauksia 0 ja kalenterivastauksia (lasnaolijat) 0 kummassakin seurassa. Lähtötaso on siis käytännössä nolla, ja mittari tarvitaan ennen 1.11., jotta käyttöönoton vaikutus näkyy.

## Periaatteet

- **Vain lukumääriä joukkueittain.** Ei pelaajakohtaista listaa (Teron päätös odottaa; oletus = vain lukumäärät). Ei nimiä, ID:itä eikä sisältöä koosteessa (sama vartija kuin S1).
- **Aktiivisuus = pelaajan tai huoltajan oma kirjoitus.** Ei sivulatauksia, ei seurantaa, ei kolmannen osapuolen analytiikkaa (§39).
- Laskenta palvelimella **samaan viikkokoosteeseen** (S1), ei uutta ajastusta. Selain lukee valmiin koosteen.

## 1. Kirjautumisaikaleima palvelimella

- **Pelaaja:** `pelaajaKirjaudu` kirjoittaa onnistuneen kirjautumisen jälkeen pelaajadokumenttiin `viimeisinKirjautuminen` (ISO, päivätarkkuus riittää). Samalla nimellä kuin henkilökunnalla (camelCase, ks. `tests/kirjautumisaikaleima.test.js`). Kirjoitus vain, jos päivä vaihtui (ei joka kirjautumisella).
- **Huoltaja:** selvitä ja raportoi, mistä huoltajan sessio alkaa (Vanhempi_v2, sähköpostikirjautuminen). Ehdota palvelinpuolen kirjoituspiste: esim. kevyt callable `kirjaaHuoltajaKaynti` (App Check, `onLapsenHuoltaja`-tarkistus palvelimella, kerran päivässä) → pelaajadokumenttiin `huoltajaViimeisinKaynti`. Toteuta, jos tämä on yksinkertainen. Muuten raportoi ja jätä S1.2:een.
- **Rules:** client ei saa kirjoittaa `viimeisinKirjautuminen`- eikä `huoltajaViimeisinKaynti`-kenttää pelaajadokumenttiin (myös henkilökunnan update: `!affectedKeys().hasAny([...])`). Testit.

## 2. Viikkokoosteeseen uudet lukumäärät (`tm_seuran_kooste.js`, versio 2)

Joukkueittain:

| Kenttä | Laskenta |
|---|---|
| `n_suostumus` | `suostumusTila == 'annettu'` |
| `n_kirjautunut_30` | pelaajan `viimeisinKirjautuminen` 30 pv sisällä |
| `n_huoltaja_30` | `huoltajaViimeisinKaynti` 30 pv sisällä (jos toteutettu) |
| `n_aktiivinen_7` / `n_aktiivinen_30` | pelaajalla tai huoltajalla **jokin oma kirjoitus** ikkunassa: `kirjaukset/{pvm}`, `viikkokatsaukset/{pvm}`, kalenterin `lasnaolijat` (pelaaja/huoltaja), `jakso_kuittaus`, `ydinvahvuus_valinta`, klippivastaus/kuittaus (R6.4), itsearvio. Luettele lopulliset lähteet PR:ssä. |

- Jaettu logiikka `lib/`-kopioina kuten S1 (sync + vartija).
- Lukumäärä per ajo: arvioi lukujen kasvu ja raportoi (S1:ssä 1 500–2 200). Jos lähteitä on paljon, käytä pelaajadokumentin kevyitä aikaleimoja, jos niitä on jo, tai rajaa ikkunaan (`documentId >= pvm`).
- Takaisinlaskenta (`arvio: true`) toimii myös näille.

## 3. Admin: "Pilotin tila" → Käyttöaste

- Uusi osio tai sarakkeet seuroittain: pelaajia · suostumus % · kirjautunut 30 pv · aktiivinen 7 pv / 30 pv · huoltaja 30 pv. **Neljän viikon trendi** koosteiden historiasta (nuoli + edellinen luku).
- Porautuminen seuraan → joukkueet riveinä (ikäjärjestys, ei lajittelua mittarin mukaan, D42).
- "📊 Päivitä kaikki" (SA) → `paivitaSeuranKooste` jokaiselle aktiiviselle seuralle (jäähy huomioiden).
- Pieni joukkue: alle 5 → lukumäärä (3/4), ei prosenttia (D45-sääntö 4).

## 4. Seura näkee omansa (VP_v25)

- Pieni kortti "Sovelluksen käyttö" VP_v25:n etusivulle (lipusta riippumatta): oman seuran samat luvut + trendi joukkueittain. Lukee `kooste`-dokumentin (Rules: johto ja SA jo v3.53).
- Kortti siirtyy S2:ssa Seuran pulssin riviksi. Kuoren kasvukatto: renderöinti `lib/`-moduuliin.
- Teksti henkilökunnalle, ei pelaajalle (§7.22: pelaaja ja huoltaja eivät näe lukuja).

## Testit

- Kooste v2 fixtuureilla: aktiivinen eri lähteistä, ikkunan rajat (7/30 pv, Helsingin päivä), pelaaja kahdessa joukkueessa (§7.18), ei-aktiivinen.
- Tietosuojavartija: ei nimiä, ID:itä eikä sisältöä.
- Rules: client ei kirjoita aikaleimakenttiä. Pelaaja ja huoltaja eivät lue koostetta.
- `pelaajaKirjaudu`: aikaleima kirjoitetaan vain onnistuneella kirjautumisella ja kerran päivässä.
- Koko sarja, myös `functions/`. Käsin: Admin ja VP KPV:llä + nimetyllä testipelaajalla kirjautuminen → seuraava "Päivitä nyt" näyttää +1.

## Aikataulu

- PR viimeistään **20.10.**, jotta deploy ja ensimmäiset koosteet ehtivät ennen 1.11.
- Koska S1:n ensimmäinen ajo on su 11.10., v2-kentät alkavat kertyä S1.1:n deployn jälkeen. Takaisinlaskenta antaa arviot taaksepäin niille lähteille, joilla on päivämäärä (kirjaukset, katsaukset).

## Ei tässä

- Pelaajakohtainen "kuka on aktiivinen" -näkymä (Teron päätös myöhemmin).
- Push-muistutukset ja nudge-viestit.
- Henkilökunnan aktiivisuus (on jo VAI+).
