# CODE BRIEF · K3 — Pelaaja valitsee seuraavan reitin (D8) ja sitoutuu (P6)

**Kaista: Tero** (Pelaaja_v7, Master_v16, VP_v25 ja `lib/`). PR-kuvauksen ensimmäinen rivi on "Kaista: Tero".
**Takaraja:** KPV U13:n ensimmäinen jakso päättyy noin 17.11. K3:n pitää olla tuotannossa ennen 10.11., jotta silmukka ei katkea "Hyvä jakso" -korttiin.

**Design:**
- `10_pelaaja_v7_kentta_suunnitelma.html` K3 (runko)
- `09_pelaaja_kentta.html` (valintanäkymä)
- `12_jaksologiikka.html` (D19: ehdotukset portaittain, "miksi?")
- `07` D8 (pelaaja näkee vain vahvistetut, enintään kaksi) ja D14 = A (aktivointi valmentajan sovelluksessa)

Raportoi PR:ssä, mitä kohtaa noudatat.

**Lippu:** kaikki uusi vain, kun `TM_LIPUT.tmKenttaLippu` on päällä. Ilman lippua kaikki on ennallaan (snapshot-testi).

## Mitä on jo olemassa (älä tee uudelleen)

- `tm_jakso_malli.tmPelaajanVaihtoehdot(jf)` palauttaa vain silloin, kun `jf.tila === 'valittavana'`, ja vain vaihtoehdot, joilla on `vahvistettu:true` ja `konsepti_avain`. Enintään kaksi.
- Rules v3.37 sallii pelaajalle (`onPelaajaItse`) **vain** kentän `ydinvahvuus_valinta {vaihtoehto ≤ 60 merkkiä, valittu_pvm?}`. Pelaaja ei voi kirjoittaa `jaksofokus`-kenttää.
- V1 (`tm_aloita_jakso.tmJaksoNappi`): kun `tila === 'valittavana'` ja `ydinvahvuus_valinta` on olemassa, nappi on "Vahvista jakso". Vahvistus poistaa `tila`-kentän ja aloittaa jakson.
- `rMinaSitoumus()` ja `idp_sitoumus_pvm` ovat käytössä (kaksivaiheinen sitoumus).

**Ennen koodausta raportoi kaksi asiaa:**
- **(a)** Riittääkö Rules v3.37 sellaisenaan? Odotus on, että riittää. Jos ei, kerro syy.
- **(b)** Mistä vaihtoehtojen perustelu ja konseptin nimi luetaan (`tm_kaavio_konsepti` / `tm_konsepti_resolve`)?

## A · Henkilökunta tarjoaa valinnan

- Masterin ja VP:n sulkulomakkeeseen (K4:n "Lause pelaajalle" -kentän viereen) tulee valinnainen osio **"Anna pelaajan valita seuraava reitti"**:
  - 1–2 konseptia. Ehdotukset tulevat samasta lähteestä kuin V1:n ydinvahvuus- ja konseptiehdotukset, portaittain ja "miksi?"-tekstin kanssa (D19).
  - Jokaiseen vaihtoehtoon valmentaja kirjoittaa yhden lauseen pelaajalle, enintään 120 merkkiä, KIELLETYT-vartija ja K1:n lukutarkistus.
- **Kirjoitus**, samassa updatessa kuin sulku:
  ```
  jaksofokus = { tila: 'valittavana', vaihtoehdot: [{ konsepti_avain, nimi, perustelu, vahvistettu: true }] }
  ```
  - Vanha jakso siirtyy historiaan kuten nyt.
  - Kesto ja päivät asetetaan vasta vahvistuksessa.
- Jos osiota ei täytetä, käytös on ennallaan: jakso sulkeutuu, ja valmentaja aloittaa uuden itse.
- **"Valinta odottaa" -näkymä henkilökunnalle:**
  - Masterin pelaajalistaan ja J4:n "Pelaajien jaksot" -listaan rivitila "Valinta odottaa".
  - Kun pelaaja on valinnut, tila on "[nimi] valitsi A" ja nappi "Vahvista jakso". Vahvistus avaa V1-modaalin esitäytettynä.
  - Ilmoitus valmentajalle nykyistä kanavaa pitkin.

## B · Pelaaja valitsee

- **Tänään:** kun jakso on `'valittavana'`, K4:n "Hyvä jakso" -kortti saa napin "Valitse seuraava reitti", joka avaa valintaruudun `_sc='valinta'`.
- **Valintaruutu (09):**
  - otsikko
  - kenttä ilman reittejä (alueita ei vielä ole, ks. K1-linjaus)
  - 1–2 korttia, joissa on konseptin nimi ja valmentajan lause
  - "+ Oma ehdotus": vapaa teksti, enintään 60 merkkiä, KIELLETYT-vartija. Rules sallii sen jo `vaihtoehto`-kentässä.
  - nappi "Valitsen tämän"
- **Kirjoitus:** vain `ydinvahvuus_valinta = { vaihtoehto: konsepti_avain | oma teksti, valittu_pvm }`.
  - Jos valinta on oma ehdotus, henkilökunnalle näkyy teksti ja merkintä "oma ehdotus".
- **Valinnan jälkeen:** Tänään näyttää kortin "Valintasi on valmentajalla". Jakso ei ala ennen kuin valmentaja vahvistaa (D14).
- **Sitoumus (P6):** kun valmentaja on vahvistanut ja uusi jakso alkaa, `rMinaSitoumus()` näyttää jakson osat ja napin "Sitoudun". Nykyinen kaksivaiheinen malli ja `idp_sitoumus_pvm` pysyvät.
  - Uusi on vain se, että sitoumus näkyy myös Tänään-sivulla jakson ensimmäisellä viikolla, kunnes pelaaja on sitoutunut.
- **Leikkijä (U8–12):** ei valintaruutua (K5).
- **§7.22:** ei lukuja, tasoja eikä vertailua.
  - Ei menetyksen pelkoa: ei "valitse ennen kuin…", ei määräaikaa.
  - Jos pelaaja ei valitse, valmentaja voi aloittaa jakson itse kuten ennenkin.

## Kieli ja ulkoasu

- Henkilökunta sanoo ydinvahvuus, pelaaja sanoo vahvuus ja reitti.
- Uudet tekstit `tm_lang`- ja `masterT`-avaimiksi (fi). Ruotsinkieliset avaimet jätetään määrittelemättä ja listataan PR:ään Geminin listalle.
- Pelaajan puolella vain T1- ja Kenttä-tokenit. Archivo vain näyttöteksteihin.
- `?v`-bumpit ja `node scripts/lib_versiot.js --kirjoita`.
- Jos SW-strategia muuttuu, nostetaan myös SW-cache.

## Testit

- Puhtaat funktiot:
  - tarjousolio (1–2 vaihtoehtoa, lauseen vartija)
  - pelaajan valintaolio (konsepti / oma ehdotus, vartija)
  - Tänään-tilat (valittavana ilman valintaa / valinta tehty / uusi jakso alkanut)
  - henkilökunnan rivitila
- Rules-emulaattori:
  - pelaaja kirjoittaa vain `ydinvahvuus_valinta` (✓)
  - pelaaja ei kirjoita `jaksofokus`-kenttää (✗)
  - toisen seuran henkilökunta ei kirjoita (✗)
  - valmentaja kirjoittaa tarjouksen oman joukkueensa pelaajalle (✓)
- Snapshot: lippu pois → näkymät ennallaan.
- Käsin, KPV U13, lippu päällä, vain testipelaajat:
  - sulku ja tarjous Masterissa
  - valinta pelaajana
  - "Valinta odottaa" → vahvistus
  - sitoumus
  - VP:nä sama
  - mobiili 390 px
- Koko sarja viimeisen main-mergen jälkeen.

## Ei tässä

- Reittien piirtäminen kentälle ja vahvuuden alue (vaatii `ase.alue`-mallin)
- Minä-kenttä ja jaksolista (K2)
- Leikkijä ja huoltaja (K5)
- muistutukset

## Toteutuspäätökset (Tero, 7.10.)

- Rules ei muutu (v3.37 riittää). Ilmoitus valmentajalle vain jos nykyiset säännöt sallivat; muuten pois ja riittää rivitila.
- Nimi tallennetaan `vaihtoehdot[].nimi`-kenttään tallennushetkellä (`tmKonseptiResolvoi` / `tmSiltaEhdota`); `syy`-teksti vain henkilökunnan "miksi?":ssä, ei koskaan pelaajalle.
- Ehdotukset: `tm_seuraava_askel.tmJaksoEhdotukset` — ei uutta ehdotuslogiikkaa.
- Ennätysmerkin korjaus (v3.45) erillisenä PR:nä K3:n jälkeen; ryhmät → v3.46.
