# CODE — P1: Aloitus — luettava pelaajakortti (additiivinen)

**Tyyppi:** UI-selkeytys + 2 additiivista pelaajakenttää. **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — pääosin `_vpIdpNarratiiviHTML(p)` (Aloitus-välilehti `_jspTab0`) + vasemman kiskon 5D-radar (`_tmRadar5D`).
**Design-totuus:** hyväksytty *"Aloitus — synteesi (pelaajakortti)"* -kartta + tiekartta **P1**. Ohje on itsenäinen.

## Periaate

Aloitus = **luettava yhteenveto** (10 s katsaus). Kaikki tässä on **additiivista** — ei poisteta editorien mekanismeja (se tehdään P4:ssä kun Kehitys-työpöytä on olemassa). Trendi = erillinen **P1b** (ei tässä).

## Mitä tehdään

### 1. Pelaajan ääni -otsikko (Kimin lämpö) — 2 additiivista kenttää
Aloitus-narratiivin (`_vpIdpNarratiiviHTML`) alkuun, heti identiteetti-headerin alle, ennen X-factoria:
- **"Miksi pelaan?"** — pelaajan oma lause (kursiivi-serif). Kenttä `p.miksi_pelaan` (vapaateksti).
- **"Minkälainen pelaaja haluan olla?"** — `p.pelaajatyyppi` (vapaateksti).
- Tyhjä kenttä → pehmeä vihje ("— ei asetettu"), ei laatikkoa väkisin. Molemmat asettaa VP/valmentaja (pelaajan oma kirjoitusoikeus = P5).

### 2. Alkuperäpisteet 5D-radariin (numeroiden luotettavuus)
Vasemman kiskon 5D-radar/ruudut (`_tmRadar5D`): pieni väripiste per ulottuvuus + legenda. **Staattinen lähdemappaus** (ei uutta dataa):
- D1 Fyysinen (`hh_taso`) → 🟢 **mitattu** (testit)
- D2 Tekninen (`d2_taso`) → 🟢 **mitattu** (TKI/TSI)
- D3 Psyykkinen (`d3_taso`) → 🟠 **itsearvio** (+ valmentaja/VP-kalibrointi)
- D4 Peliäly (`adar_viimeisin`) → 🔵 **pelihavainto** (ADAR)
- D5 Sosiaalinen (`d5_taso`) → 🔵 **havaittu** (valmentaja)

Legenda: `🟢 mitattu · 🔵 havaittu · 🟠 itsearvio`. Tyhjä ulottuvuus → ei pistettä (kuten "—"/tulossa nyt). *(Valinnainen: piste klikattavissa → `_jspVaihda(1)` Mittaus / `_jspVaihda(2)` Arviointi. Jos helppo, tee; muuten P1b.)*

### 3. Tavoitteet-yhteenveto Aloitukseen (suunta näkyviin)
Nyt kausitavoite renderöityy vain Kehitys-välilehdellä. Lisää **read-only-yhteenveto** Aloitus-narratiiviin (selkärangan "suunta"): kausitavoite + horisontit lyhyesti. **Uudelleenkäytä olemassa olevaa dataa** — lue sama lähde jota `_vpKausitavoiteHTML(p)` käyttää, mutta renderöi kevyt luettava versio (ei editointikontrolleja). Tyhjä → pehmeä "Aseta kausitavoite Kehityksessä".

### 4. Selkäranka-visuaali (yhdistävä lanka)
Sido narratiivin osiot (X-factor → tavoitteet → jaksofokus) näkyväksi selkärangaksi: ohut teal-hiusviiva + solmut vasemmassa reunassa (kuten synteesi-kartassa). Puhdas CSS/HTML `_vpIdpNarratiiviHTML`:ssä, ei uutta dataa. Additiivinen — jos jokin osio puuttuu, lanka jatkuu pehmeästi.

## EI tässä (seuraavat vaiheet)
- **Trendi** (radar edellinen-haamu + suuntanuolet) → **P1b** (vaatii 5D-snapshot-kentän).
- **Editorien karsinta / read-only-reititys** → **P4** (kun Kehitys-työpöytä olemassa).
- **Pelaajan oma kirjoitusoikeus** ("miksi pelaan" pelaaja-appista) → **P5** (Rules).

## Reunaehdot
- **Additiivinen:** olemassa oleva `_vpIdpNarratiiviHTML`-sisältö (X-factor, jaksofokus, tukiHTML) säilyy — kasvatetaan, ei korvata.
- **Rules:** `miksi_pelaan` + `pelaajatyyppi` ovat uusia top-level-pelaajakenttiä. VP/valmentaja kirjoittaa jo koko pelaajadokin (`onValmentajaRooli`/`onJohtoRooli`) → **kattaa uudet avaimet, ei Rules-muutosta P1:ssä.** (Anonyymi-pelaaja EI kirjoita näitä tässä — se on P5.)
- **Alaikäiset read-only** (Eino·Leo·Emil): näiden `miksi_pelaan`/`pelaajatyyppi` vain luetaan; **Topias = testi-OK** kirjoitukselle.
- **Cache:** ei lib-muutosta → ei `?v`-bumppia (pelkkä HTML).
- **Brändi:** DS-tokenit, molemmat teemat, Cormorant/DM Sans/DM Mono, hiusviivat, teal-aksentti. Pelaajan lause = kursiivi-serif (voice).
- **Nothing forced:** tyhjät kentät = pehmeät vihjeet, ei pakoteta.

## DoD
1. Aloitus näyttää pelaajan äänen (miksi/millainen) ylhäällä; tyhjä = pehmeä vihje.
2. 5D-radarissa alkuperäpisteet + legenda; oikea lähde per ulottuvuus (staattinen mappaus).
3. Tavoitteet-yhteenveto Aloituksessa (read-only), tyhjä = vihje.
4. Selkäranka-visuaali sitoo osiot; additiivinen.
5. Renderöityy molemmissa teemoissa (screenshot molemmista); ei konsolivirheitä.
6. Ei poistettu editorimekanismeja; ei Rules-muutosta; ei datamigraatiota.
7. Pieni PR; kuvaus linkkaa synteesi-karttaan + tiekartta P1. **Verifioi live ennen mergeä.**
