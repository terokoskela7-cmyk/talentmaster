# Vaihe 3c — Pelaajan aikajana + perhepeili (§7.22-turvallinen)

> Lähde: co-design 2026-07-05. Viimeistelee IDP-ytimen: 3a (tavoite) + 3b (VP-review + kehityskaari, livenä) → **3c antaa pelaajalle ja perheelle oman turvallisen näkymän samaan matkaan.** Kohde: `TalentMaster_Pelaaja_v7.html` (+ `TalentMaster_Vanhempi_v2.html`). Data = sama `arviot[]`/tavoite (3a/3b), EI uutta arviointia. §7.22 · §16 · §26 · §27.4. Mockup: `docs/mockups/vaihe3c_pelaaja_aikajana_mockup.html`.

## 1. Ydin
3b:n kehityskaari on **aikuisnäkymä** (luvut, DVI, kaksi deltaa, kriteerit). 3c näyttää pelaajalle **saman matkan omalla kielellä, positiivisesti** — pelaaja näkee *mihin menossa, miten on edistynyt, ja mitä nyt harjoittelee* — ilman numeroita, vertailua tai painetta. Perhe näkee saman + "miten tukea".

## 2. Pinta + data
- **Pelaaja_v7** (MINÄ/tavoite-osio): lukee aktiivisen tavoitteen `seurat/{sid}/pelaajat/{pid}/idp_kausi/{vuosi}.tavoitteet[]` (pelaaja lukee omansa, Rules v3.10) + pikakentät `idp_fokus`/`idp_edistyma` (§26). PIN-auth on jo.
- **Vanhempi_v2** (perhepeili): sama data, "miten tukea" -kerros.
- **Ei uutta kirjoitusta** — pelaaja/perhe on toistaiseksi **lukija** (self-arvion kirjoitus 3c-b myöhemmin, jos halutaan). 3b:ssä VP kirjaa pelaajan itsearvion palaverissa.

## 3. Pelaajan aikajana — mitä näytetään (§7.22 EHDOTON)
Positiivinen matka-aikajana samasta `arviot[]`-datasta:
- **Otsikko:** "Sinun tavoite 🎯" + fokus pelaajan kielellä (`fokus.nimi`) + **pelaajan oma ääni** (`pelaajan_tavoite`, omistajuus).
- **Matka (aikajana):** lähtö → jokainen review = **positiivinen virstanpylväs**. Mitattavalle: **abs-parannus vain kun positiivinen**, pelaajan kielellä ("syöttösi on jo napakampi kuin keväällä") — EI tavoitejäämää paineena, EI DVI-nuolia, EI numerodeltoja. Vapaalle: kvalitatiivinen ("opit lukemaan peliä paremmin").
- **Konseptin ymmärrys (jaettu ymmärrys, §0b teknistaktiset):** *mikä tämä on* + *miksi se auttaa pelissä* + **yksi cue-kysymys** (Kysymyspankki) → pelaaja ymmärtää ja omistaa.
- **Prosessikehu (Dweck) + autonomia (SDT):** "hienoa että jatkat", ei lopputulos­kehua.

**KIELLETTY pelaajalle (§7.22/§16):** tasoluku (1–5), arvosana, percentiili, vertailu muihin, punaiset/negatiiviset deltat, TKI-lasku, tavoitejäämä uhkana, XP/progressbar/loss aversion, kriteeri taso 1 ("ei näy"). Streak/edistymä aina positiivisesti (§16 neljä tilaa).

## 4. Perhepeili (Vanhempi_v2)
Sama aikajana + **"miten tukea"** -kerros (autonomiaa tukevat vinkit, Deci & Ryan): vahvuus ensin · prosessikehu · konkreettinen tukivinkki. **Ei tasolukuja/percentiilejä/vertailua/TKI-laskua vanhemmallekaan** — painostusmekanismi: lapsi ei ahdistu datasta vaan vanhemman paineesta (§16). "Kultainen sääntö: ei vertailua kavereihin."

## 5. Review-rytmimuistutus (kevyt, positiivinen)
Kun `idp_viim_review` + arvio_pvm ylittyy → lempeä muistutus ("aika katsoa yhdessä miten menee") pelaajalle/perheelle. **Ei painostava.** CF `lahetaMuistutukset`-pattern (olemassa), frekvenssikatto. Voi olla 3c:n viimeinen osa — ei pakollinen ensimmäiseen PR:ään.

## 6. Vaiheistus
- **3c-a:** Pelaaja_v7 aikajana (luku + §7.22-render). **Ensin.**
- **3c-b:** Vanhempi_v2 perhepeili + "miten tukea".
- **3c-c:** rytmimuistutus (nudge).

## 7. Invariantit + verifiointi
§7.22 (EHDOTON — ei numeroita/vertailua/negatiivista pelaajalle; §3 kielletty-lista) · §16 (positiivinen streak, ei loss aversion) · §26 (pikakentät + idp_kausi-luku, pelaaja lukee omansa) · §27.4 (SW cache-versio ylös: `tm-pelaaja-vN`/`tm-vanhempi-vN`) · lib `?v` jos muutos · **ei version.json-bumppia** · ei Rules-muutosta (pelaajan idp_kausi-luku jo v3.10). Vitest jos lib-logiikkaa (esim. `idpPelaajaKaari` = positiivinen esitys arvioista). Live: SJK-tavoite → Pelaaja-näkymä näyttää matkan positiivisesti (mitattava + vapaa), **ei yhtään numeroa/vertailua**; Vanhempi näkee saman + tukivinkin.
