# CODE_OHJE — Selkeys 2/3: Mittaus-normivertailu hybridiksi (taso + syvempi analyysi)

**Tyyppi:** näyttö · **Kohde:** `TalentMaster_VP_v25.html` (Mittaus-välilehden normivertailu ~9222–9244).
**Base:** `main`. **Pieni PR.** **Design-referenssi:** artefakti `tm-pelaajakortti-selkeys` (osa 02).
**Riippuvuus:** mieluiten briiffi 1 mergettynä (sama normivertailu-lohko), ei pakollinen.

## Periaate (Teron päätös: hybridimalli)
IDP-kortin Mittaus-välilehti näyttää **sekä normivertailun** (arvo vs normi + "olet edellä / kehityskohde")
**että tason 1–5** — sama luku minkä valmentajan kortti näyttää. VP näkee saman tason molemmissa näkymissä.

## Työ

### 2.1 — Taso-sarake normivertailu-tauluun
Normivertailu-taulu (~9244) on nyt: **Testi · Arvo · Normi · Tulkinta**. Lisää **Taso**-sarake ennen Tulkintaa:
**Testi · Arvo · Normi · Taso (N/5) · Tulkinta**.
- Taso lasketaan jo lohkossa (`taso`-muuttuja rivillä ~9236, `tasoOf`/`tasoEk`). Renderöi se värillisenä
  merkkinä (sama väri­logiikka kuin valmentajan kortissa: 5-port 4–5 teal / 3 amber / 1–2 red; fyysinen /5).
- Pre-PHV (neutraali) → taso **ink3-harmaa + 🌱** (yhtenäinen #279/kehityskortin kanssa, ei punaista).
- Otsikko: säilytä "Normivertailu (Eerikkilä, taso-3 = ikäluokan keskitaso)" + `ⓘ`.

### 2.2 — "Syvempi tasoanalyysi" -laajennus (hybridi)
Normivertailun alle **taittuva (▾) "Syvempi tasoanalyysi"** -osio joka näyttää olemassa olevat osaindeksit
kun data riittää: **EI** (kimmoisuus, vaatii SJ) · **FVP** (5 m/30 m) · **Profiili**. Nämä lasketaan jo
VP:ssä (~9246 jälkeen, "Sub-indeksit §30") — **nosta ne tähän laajennukseen** (älä laske uudelleen).
Jos data ei riitä → "vaatii SJ / 5m" kuten nyt. Ei uutta laskentaa.

## Reunaehdot
- **Ei laskentamuutosta, ei skeemaa.** Taso ja osaindeksit luetaan olemassa olevasta laskennasta.
- **§28 säilyy:** pre-PHV-taso harmaa + 🌱, ei punaista, ei kehityskohde-leimaa kovana (briiffi 1 hoitaa sävyn).
- **§7.22:** ei kosketa Pelaaja_v7:ään.
- **Design-lukko + molemmat teemat** (taulukko: DM Mono luvuille, hiusviivarivit, teal-aksentti).

## Definition of Done
- **L1:** normivertailu-taulussa Taso-sarake (N/5, värillinen, pre-PHV harmaa+🌱); "Syvempi tasoanalyysi"
  -laajennus näyttää EI/FVP/Profiili olemassa olevasta laskennasta.
- **L2 (vitest):** taso-sarakkeen arvo vastaa kortin taso-laskentaa (johdonmukainen); osaindeksien poiminta.
  ~870+ vihreä.
- **L3 (elävä, molemmat teemat):** Mittaus-välilehti näyttää per testi arvon, normin, **tason (N/5)** ja
  tulkinnan; sama taso kuin valmentajan kortissa; syvempi analyysi avautuu; pre-PHV harmaa + 🌱.
- Pieni PR. Lataa VP uudelleen deployn jälkeen.
