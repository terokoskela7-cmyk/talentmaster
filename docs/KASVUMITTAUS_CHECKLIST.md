# Kasvumittaus-ohje testaajalle — SJK Juniorit
## Testaus_v9 kasvumittaus-protokolla · Päivitetty 2026-06-15

> **Tavoite:** PHV-data 61 pelaajalle (0/61 tällä hetkellä). Mittausaika ~3–4 min/pelaaja.
> Biologinen ikä lukitsee kuormarajoittimen, Hidden Gem -vahvistuksen ja täyden H-H-tulkinnan.
> Suostumus `biologinen_ika`-datalle on jo annettu suurimmalla osalla.

---

## Tarvitset kentälle

- [ ] Puhelin tai tabletti jossa on SJK-kirjautuminen Testaus_v9:ään
- [ ] Mittanauha tai seisomapituusmittari (2× per pelaaja)
- [ ] Vaaka (2× per pelaaja)
- [ ] Penkki tai tuoli istumapituudelle (1× per pelaaja)
- [ ] Lista joukkueesta (Testaus_v9 hakee automaattisesti)

---

## Mittaukset per pelaaja (järjestyksessä)

### 1. Pituus — 2 kertaa, kirjaa molemmat
- Seisoo suorassa, kantapäät seinässä, katse suoraan eteenpäin
- Mittaa pään päältä lattiaan (cm, 1 des tarkkuus)
- Kirjaa yritys 1 ja yritys 2 → Testaus_v9 laskee **keskiarvon automaattisesti**

### 2. Paino — 2 kertaa, kirjaa molemmat
- Kevyet vaatteet, ei kenkiä
- Kirjaa yritys 1 ja yritys 2 → **keskiarvo automaattisesti**

### 3. Istumapituus — 1 kerta (tärkein mittaus!)
- Pelaaja istuu penkillä/tuolilla selkä suorana, jalat roikkuvat vapaasti
- Mittaa istuinluusta pään päälle (cm, 1 des tarkkuus)
- **Kriittinen:** tämä kenttä tekee PHV-laskennasta tarkan

---

## Testaus_v9:ssä

1. Avaa **Testaus_v9** → valitse joukkue → **"+ Uusi tapahtuma"**
2. Protokolla: valitse **"Kasvumittaus"**
3. Valitse pelaajat (kaikki tai osa, jos aika rajallinen)
4. Siirry **Kenttänäkymään** → pelaaja kerrallaan
5. Syötä pituus (2× yritystä), paino (2× yritystä), istumapituus (1×)
6. Vihreä välähdys = tallennettu → seuraava pelaaja
7. Lopuksi: **"Merkitse valmiiksi"** → data synkronoituu Firestoreen

> **Offline-tuki:** voit mitata ilman nettiä, data synkronoidaan automaattisesti kun yhteys palaa.

---

## PHV-tilakodit — mitä saat tuloksena

| Koodi | Merkitys | Huomio valmentajalle |
|---|---|---|
| `PRE` | Ennen kasvupyrähdystä | Normaali, tekniikka-ikkuna auki |
| `LAH` | Lähestyy pyrähdystä | Seuraa kuormaa |
| `PH` | **Kasvupyrähdyksessä ⚠️** | Voimaharjoittelu max 80% · hyppyvolyymi −20% |
| `POST` | Jälkeen | Voima-ikkuna avautuu |
| `AN` | Jälki-PHV | Täysi harjoittelu OK |

VP-dashboard näyttää PHV-tilan joukkuekorteissa heti kun data on tallennettu.

---

## Järjestys jos aika loppuu

Priorisoi:
1. **PH-tila-epäilyt ensin** — jos tiedät kenellä kasvupyrähdys käynnissä (nopea pituuskasvu), mittaa heidät ensin
2. Sitten vanhimmat (U15→U13) koska PHV-tulkinta on kriittisin siirtymäiässä
3. Nuorimpien (U10–U12) PHV on `PRE` lähes varmasti — voit mitata myöhemmin

---

## Mitä EI tarvita

- Ei tarvita vanhempien pituuksia vielä (Khamis-Roche -kaava on lukossa, tulossa myöhemmin)
- Ei tarvita syntymäaikaa erikseen — Testaus_v9 hakee sen automaattisesti Firestoresta
- Ei tarvita erillistä Excel-tuontia — data menee suoraan Firestoreen

---

## Kysyttävää?

Ota yhteyttä: terokoskela7@gmail.com
