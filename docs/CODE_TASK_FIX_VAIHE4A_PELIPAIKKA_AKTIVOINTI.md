# Korjaus — Vaihe 4a: pelipaikkakonseptien aktivointi (vaihe-fallback + positio-CTA)

> Lähde: live-verify 2026-07-05 (Miko Alho, SJK P15). Toimintakortin dropdown näyttää vain youth-konseptit (Y-*) vaikka pelaaja on U15. Juurisyy varmistettu: (1) `tmTtVaihe` palauttaa "yhteispeli" koska `syntymaVuosi` puuttuu (ei joukkuenimi-fallbackia), (2) `positio` null → ei fundamentteja. Logiikka toimii oikein kun ikä + positio ovat (`tmTtItems` palauttaa T-P1… oikein). Kohde: `lib/tm_teknistaktiset.js` (`tmTtVaihe`) + `Master_v16` (toimintakortti). §0a · §26 · §28.

## 1. Korjaus A — `tmTtVaihe` joukkuenimi-fallback (lib)
Kun `syntymaVuosi` puuttuu, johdа ikä **joukkuenimestä** (kuten `normiIka` §26): "SJK P15" → 15 → pelipaikkavaihe. Muuten kaikki pilottipelaajat (ilman syntymaVuotta) jäävät "yhteispeli"-vaiheeseen eikä pelipaikkapuoli aktivoidu koskaan.
- `tmTtVaihe(p)`: ikälähde = `p.syntymaVuosi` → jos puuttuu, `year(nyt) − vuosi(joukkuenimestä)` tai suoraan joukkuenimen ikäluokkanumero (P15→15, T14→14). Sama regex kuin `normiIka`/`_dimIkaSp`. **Bio-ikä (PHV) pidetään erillään** — vaihe-gating käyttää ikäluokkaa, ei desimaali-ikää.
- Vaihe-rajat (§0a): ≤9 perus · 10–14 yhteispeli · U14–15 silta · **≥15 pelipaikka**. Varmista P15/T15 → pelipaikka.
- Vitest: `tmTtVaihe({joukkue:'SJK P15'})` → 'pelipaikka' (ilman syntymaVuotta); `{joukkue:'SJK P13'}` → 'yhteispeli'.

## 2. Korjaus B — toimintakortin aktivointi-UX (Master_v16)
Kun `tmTtVaihe(p)==='pelipaikka'`:
- **Jos `positio` asetettu:** dropdown sisältää **pelipaikkafundamentit** (`tmTtItems` palauttaa jo T-*). Ryhmittele: "Youth (kertaus)" + "Pelipaikka: {nimi}" — youth-konseptit jatkuvat kertauksena (§ silta: "pelipaikka = konteksti, ei uusi sisältö").
- **Jos `positio` null:** näytä **CTA "Aseta pelipaikka aktivoidaksesi pelipaikkakonseptit"** → avaa positio-valinta (olemassa oleva `positio`/`positio_2`-kenttä, 2d — Seura.html-modaali / VP; tai pikavalinta kortissa). Tämä on **Silta-siirtymän aktivointi** (U14→U15 erikoistuminen).
- Vaihe-merkki kortissa: näytä oikea vaihe (`tmTtVaihe`) — nyt "Pelipaikkavaihe" vaikka logiikka palautti "yhteispeli" (epäjohdonmukaisuus korjaantuu A:lla).

## 3. Vastaus "milloin aktivoidaan" (dokumentoi)
Pelipaikkakonseptit aktivoituvat kun: **(1) pelaaja on pelipaikkavaiheessa (U15+, ikäluokasta) JA (2) `positio` asetettu.** Positio asetetaan Silta-siirtymässä (valmentaja/VP, U14→U15). Youth-konseptit jatkuvat kertauksena pelipaikan kontekstissa (eivät katoa).

## 4. Invariantit + verifiointi
§0a (vaihe-gating) · §26 (joukkuenimi-fallback kuten normiIka; pikakentät) · §28 (bio-ikä erillään) · §5 · §7.22 (aikuisnäkymä) · ei version.json-bumppia · lib `?v` nostetaan. Vitest: tmTtVaihe joukkuenimi-fallback (P15→pelipaikka, P13→yhteispeli, syntymaVuosi voittaa). Live: aseta SJK P15 -pelaajalle positio → toimintakortin dropdown näyttää T-* fundamentit + youth kertauksena; ilman positiota → "Aseta pelipaikka" -CTA. `npm test` + lint.
