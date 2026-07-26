# CODE_OHJE — 🌱-pelaajan taso/tulos näkyviin valmentajalle (VP)

**Tyyppi:** näyttökorjaus (politiikan laajennus) · **Kohde:** `TalentMaster_VP_v25.html` · base `main`.

## Miksi

Päätös (Tero): kun pelaajalla on 🌱-merkki (pre-PHV / kypsyysvarmentamaton, §28), **tulos/taso
näytetään silti valmentajalle** — 🌱 jää *kontekstimerkiksi* ("huomioidaan"), ei piilota lukua.
Valmentajan tulee tietää pelaajan taso/tulos, vaikka PHV-mittausta ei ole tehty.

**Tämä on jo tehty radariin** (Tero 2026-07-05, `_tmRadar5D`, ~rivi 8880):
> `// Luku näkyy aina; harmaa = kypsyysvarmentamaton. Additiivinen.`
> `_valTxt = _epv ? (has ? (d.arvo + ' 🌱') : …) : …; _valFill = _epv ? 'var(--ink3)' : 'var(--teal)';`

Radar näyttää siis tason aina + himmennettynä (ink3) + pieni 🌱. **Sama kuvio laajennetaan niihin
valmentajan pintoihin joissa luku vielä piiloutuu 🌱:n taakse tai näkyy "—".**

## Työ — VP:n pinnat joissa luku vielä piilotetaan grow/pre-PHV:llä

Sovella `_tmRadar5D`:n jo hyväksyttyä kuviota (**luku aina näkyviin; ink3-harmaa + 🌱 = kypsyyskonteksti**)
seuraaviin. Käytä olemassa olevia apureita: `d1_taso` (pikakenttä), `kypsyysTila(phv_tila, taso, gated, preOverride)`
ja `onNeutraaliPrePHV(p)` (samat kuin radar). Älä laske uudelleen — käytä `d1_taso`-lukua.

### A. Pelaajan detaljin 5D-ruudut (Aloitus-paneeli, vasen)
Nyt D1-ruutu näyttää **🌱** (leaf) tason sijaan grow-tilassa (esim. Aleksi Rajala: D1 [🌱]).
→ Näytä **taso** aina (esim. `1`), ink3-harmaana + pieni 🌱, kun kypsyys epävarma/pre-PHV.
Tila-erottelu säilyy: `tulossa` (ei mittausta) ja `seura-avaa` ennallaan — muutos koskee VAIN
mitatun grow-tason näyttöä (luku 🌱:n sijaan).

### B. Tilanne-listan (roster) D1-sarake
Nyt tuoduilla P2014-pelaajilla D1-sarake näyttää **"—"**, vaikka `d1_taso` on olemassa (grow-piilotus).
→ Näytä `d1_taso`-luku ink3-harmaana + 🌱-vihjeellä, kuten muutkin ulottuvuudet. "—" jää vain
aidosti mittaamattomille (d1_taso == null).

> Etsi molemmat renderöintikohdat (VP:n detaljiruudut + roster-rivin fyysinen-solu) ja tee niistä
> yhtenäiset radarin kanssa. Jos löytyy muita valmentajan pintoja jotka piilottavat grow-tason
> 🌱/—:n taakse (esim. dimensio-popover), korjaa samalla kuviolla.

## Reunaehdot

- **VAIN valmentajan näkymä (`TalentMaster_VP_v25.html`).** Pelaajan näkymä (`TalentMaster_Pelaaja_v7.html`)
  pysyy **muuttumattomana** — §7.22: pelaajalle EI näytetä tasolukuja. 🌱 säilyy pelaajalle kannustavana
  merkkinä ilman numeroa. **Älä koske Pelaaja_v7:ään.**
- **§28 säilyy sisällössä:** grow-tason himmennys (ink3) + 🌱 = "kypsyys huomioitu, ei rankaise" — luku
  ei muutu punaiseksi/kehityskohteeksi grow-tilassa. Kyse on vain siitä että **luku näkyy**.
- **Ei laskentamuutosta, ei skeemaa, ei Rules-muutosta.** Käytä `d1_taso`-pikakenttää sellaisenaan.
- **Design-lukko:** olemassa olevat luokat/tokenit; ink3 = harmaa, teal = varmennettu. Molemmat teemat.
- **Ei `?v=`-bumppia** (ei lib-muutosta, jos muutos on vain VP-HTML:ssä).

## Definition of Done

- L1: git-diff näyttää vain VP:n detaljiruutu- + roster-solu-muutokset (+ mahdollinen dimensio-popover);
  ei Pelaaja_v7-muutosta, ei laskentaa.
- L2: testit vihreät.
- L3 (elävä, Sibbo P12 **Aleksi Rajala**, grow/🌱-pelaaja):
  - Detaljin D1-ruutu näyttää tason (esim. `1`) ink3-harmaana + 🌱, EI pelkkää 🌱:aa.
  - Tilanne-listalla Aleksin D1-sarake näyttää `d1_taso`-luvun (ei "—").
  - Radar näyttää edelleen luvun + 🌱 (ennallaan).
  - Pelaajan oma näkymä (Pelaaja_v7) EI näytä tasolukua (§7.22 ehjä).
  - Screenshot molemmista teemoista.
- Pieni PR, verifioitu elävänä.
