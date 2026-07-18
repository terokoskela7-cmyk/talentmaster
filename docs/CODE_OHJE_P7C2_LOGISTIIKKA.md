# CODE — P7-c.2: Kalenteritapahtuman logistiikka (saapumisaika · peliasu · kartta · kimppakyyti)

**Tyyppi:** Toiminnallisuus, näyttö + kirjoitus (VP/valmentaja täyttää, kuluttaja lukee). **Riippuvuus:** P7-c.1 (kuluttaja-lue-kytkentä) mergessä.
**Kohteet:** `TalentMaster_VP_v25.html` + `TalentMaster_Master_v16.html` (tapahtuman luonti/muokkaus) · `TalentMaster_Pelaaja_v7.html` + `TalentMaster_Vanhempi_v2.html` (näyttö — kuori jo c.1:ssä).
**Design-totuus:** `idp_consumer_kalenteri.html` (logistiikka-chipit ottelukortissa). Tiekartta **P7-c.2**.

## Miksi
Ottelut ovat vanhemman kalenterin tärkein hetki: **saapumisaika, peliasu, paikka/kartta, kimppakyyti** ovat juuri se mitä vanhempi kalenterilta odottaa (PlayMetrics/Teamworks-erottautuja). Nyt tapahtumadokissa on vain `paikka`. Lisätään kevyet logistiikkakentät.

## Mitä tehdään

### 1. Datamalli (additiivinen, kalenteri-dokkiin)
Lisää `kalenteri/{tapahtumaId}`-dokkiin **valinnainen** `logistiikka`-olio:
```
logistiikka: {
  saapumisaika: '12:15' | null,     // "ole paikalla klo"
  peliasu: 'kotipaita' | 'vieraspaita' | vapaa | null,
  kartta_url: string | null,        // Google Maps -linkki paikkaan (tai johdettu paikka_id:stä)
  kimppakyyti: true | false          // näytä kimppakyyti-kysely vanhemmille (c.4/erillinen koordinointi)
}
```
Sama top-level-avain (`logistiikka`) → **ei Rules-muutosta** (create/update jo sallittu valmentaja/johto; kenttä on jo-kirjoitettavan tapahtumadokin sisällä). Puuttuva = ei näytetä (pehmeä).

### 2. VP + valmentaja — luonti/muokkaus
Lisää logistiikkakentät tapahtuman luonti-/muokkausmodaaliin (`avaaUusiTapahtuma` VP · `_avaaUusiTapahtuma` Master) **ensisijaisesti tyypille `ottelu`** (valinnainen muillekin). Kevyt: saapumisaika-kellonaika + peliasu-valinta + kartta (auto paikasta jos mahdollista) + kimppakyyti-toggle. Ei pakollisia.

### 3. Kuluttaja — näyttö (kuori c.1:ssä)
Renderöi logistiikka **chipeinä** ottelukortin alle (design-totuus): 🕐 Saavu [aika] · 👕 [peliasu] · 📍 Kartta (linkki) · 🚗 Kimppakyyti (vanhemmalle). Näytä vain olemassa olevat kentät.

## Reunaehdot
- **Ei Rules-muutosta:** `logistiikka` on jo-kirjoitettavan `kalenteri`-dokin sisällä; kuluttaja-luku aukesi c.1:ssä.
- **GDPR:** ei terveys-/henkilötietoa logistiikkaan; kimppakyyti = opt-in-koordinointi, ei pakotettuja yhteystietoja tähän vaiheeseen.
- **Additiivinen:** puuttuva logistiikka = ei näytetä; vanhat tapahtumat toimivat.
- **Brändi + mobiili:** chipit mahtuvat kapealle; kartta avautuu ulkoiseen karttaan.
- **Topias = testi-OK.**

## EI tässä
- Kimppakyytien varsinainen koordinointi/matching (vanhemmat keskenään) — erillinen.
- Ilmoitus logistiikkamuutoksesta = **c.4**.

## DoD
1. `kalenteri`-dokkiin additiivinen `logistiikka`-olio; ei Rules-muutosta; puuttuva = pehmeä.
2. VP + valmentaja voivat asettaa saapumisajan/peliasun/kartan/kimppakyydin (ensisijaisesti ottelulle).
3. Pelaaja + vanhempi näkevät logistiikka-chipit ottelukortissa (vain olemassa olevat kentät).
4. Additiivinen, ei regressiota (vanhat tapahtumat + c.1-näkymä toimivat); mobiili; 0 konsolivirhettä.
5. **Verifioi live (Topias):** aseta ottelulle logistiikka VP:stä → näkyy pelaajan + vanhemman kortissa. Pieni PR; linkkaa design-totuus + P7-c.2.
