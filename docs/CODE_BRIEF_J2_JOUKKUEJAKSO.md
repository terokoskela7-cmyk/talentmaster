# CODE BRIEF · J2 — Joukkuejakso Masteriin (valmentaja tai VP)

**Kaista: Tero** (`TalentMaster_Master_v16.html` + pieni `lib/`-laajennus samassa PR:ssä). PR-kuvauksen 1. rivi "Kaista: Tero".
**Design:** `docs/design/idp-v2/12_jaksologiikka.html` (kohta "Valmentaja asettaa joukkuejakson", D17, D21) ja `13_kehitystyopoyta_kentta.html` §3 (joukkuejakso-rivi). Raportoi PR:ssä, mitä kohtaa noudatat.
**Edellytys:** J1 (#837) mergetty.

## Sijainti
Master → **Kausi** (`data-view="season"`, "Kauden rytmi ja kehitys"): ylimmäksi kortti **"Joukkueen jakso"**. Valitun joukkueen dokumentti `_joukkueTunniste()`:llä kuten harjoitusprioriteetissa. VP käyttää samaa näkymää (VP-periaate). VP_v25:een tämä tulee vasta J5:ssä.
**Lippu:** näkyy vain, kun `seurat/{id}.liput.kentta === true` (D25, KPV ensin). Muille seuroille ei muutu mitään.

## Kortti
- **Tila ilman jaksoa:** "Joukkueella ei ole jaksoa" + nappi "Aloita joukkuejakso".
- **Lomake (modaali, sama tyyli kuin D-3 "Aloita jakso"):**
  1. **Tekn.-takt.** (pakollinen): valikko seuran teemoista; esivalintana `tmJoukkueenTeema` (#822) nykyiselle päivälle. Viimeisenä "Oma…" (vapaa teksti ≤ 120).
  2. **Fyysinen** (pakollinen): valikko kahdessa ryhmässä:
     - **Seuran ohjelmat:** `ohjelmat`, joissa `tila == 'hyvaksytty'`, ryhmiteltynä `teema_avain`in mukaan.
     - **Fyysiset teemat:** `TM_FYYSTEEMAT` (`lib/tm_fyysteemat.js`: fy_nopeus, fy_rajahtavyys, fy_kestavyys, fy_ketteryys, fy_liikehallinta).
     - Viimeisenä "Oma…" (vapaa teksti). Vapaa teksti vain tässä, jotta kypsyysvahti saa tunnetun avaimen.
  3. **Henkinen** ja **Sosiaalinen** (valinnaiset): yksi lause kumpikin, ≤ 120 merkkiä, KIELLETYT-tarkistus (aina myönteinen).
  4. **Kesto:** `tmJaksonKesto(joukkueen ikä)` oletuksena (D7). Alku = valittu päivä, loppu lasketaan, katselmusikkuna 2 vk loppupäivästä (D21).
- **Jakson aikana:** kortti näyttää neljä aluetta, viikon `n/N` ja katselmusikkunan. "Muokkaa" avaa saman lomakkeen.
- Ketjunimiä ei näytetä missään.

## Data (Rules v3.37 sallii jo, ei Rules-muutosta)
`joukkueet/{jid}.jaksofokus` + `jaksofokus_historia` samalla `tmAsetaJaksofokus`-polulla kuin nyt (ei uutta kirjoittajaa). Rules sallii valmentajalle vain nämä kaksi kenttää.
```
jaksofokus.osa_alueet = {
  tekninen_taktinen: { teema_avain|null, nimi, lahde:'seura'|'tm'|'oma' },
  fyysinen:          { avain: 'fy_*'|null, nimi, ohjelma_id?:string, lahde:'seura'|'tm'|'oma' },
  henkinen:          { kuvaus } | null,
  sosiaalinen:       { kuvaus } | null }
jaksofokus.alku, kesto_vk, katselmus_alku, katselmus_loppu  (YYYY-MM-DD, tmPaivaIso)
```
- Jos joukkuedokumenttia ei ole, valmentaja ei voi luoda sitä (v3.37). Näytä "Pyydä VP:tä luomaan joukkue" äläkä yritä kirjoittaa. Tarkista KPV U13:n dokumentin olemassaolo lukemalla, ja raportoi.
- Jos kirjoitus vaatii Rules-muutoksen, pysähdy ja raportoi. Älä muuta Rulesia tässä PR:ssä.

## Lib-laajennus (`lib/tm_tukitavoitteet.js`, samassa PR:ssä)
- `tmJoukkuejaksoOsaAlueet` hyväksyy yllä olevan rakenteen. Fyysisen `avain` validoidaan `TM_FYYSTEEMAT`-listaa vasten, tai sen on oltava `null`, kun `lahde:'oma'`. Vanha muoto `{alue, lahde}` luetaan edelleen.
- **Kypsyysvahti joukkuejakson oletusehdotukseen:** yksi kartta fy_* → `IDP_KYPSYYS_GATED` (fy_nopeus → speed, fy_kestavyys → endurance, fy_rajahtavyys → power) **samassa paikassa kuin vahti**, ei kopiota. PRE/LAH/PH/tuntematon pelaajalle joukkueen fy_nopeus/kestävyys/räjähtävyys → liikehallinta, kuten J1 jo tekee rakenteiselle avaimelle.
- Testit: uusi muoto, vanha muoto, tuntematon avain hylätään, kypsyysvahti fy_*-avaimilla.

## Testaus
- KPV U13: valmentajan tunnus JA VP:n tunnus (rasmus_broberg). Kirjoitukset vain KPV U13 -joukkueeseen.
- Koko testisarja (unit + functions + characterization) ja `?v=`-bumpit muuttuneille lib-latauksille.
- Mobiili 390 px: lomake ei vuoda vaakasuunnassa.

## Ei tässä
Pelaajan "Aloita jakso" -modaalin muutos (J3 / V1), joukkuekenttä-taktiikkataulu (V2), VP_v25, pelaaja-app, seuran oma arviointikehys (D31 avoin).
