# Kausi/aikajana-jatkot — spec (resepti · biografia-jana · D3/D5)

> Scoping 2026-06-17. Designerin koodikartoituksen pohjalta. Päätökset (Tero): resepti = molemmat moottorit · D3 = valmentaja + pelaaja (ka) · D5 = lykätään (4-akselinen).
> Liittyy: §14 (5D/FLEI) · §16 (Pelaaja-appi) · §21 (AI/resepti) · §28 (kehitysikkunat) · §29 (suljettu silmukka) · §30 (KPI master) · §A7 (harjoitelogiikka).
> Periaate: **käytä olemassa olevia moottoreita/rendereitä, älä keksi uutta.** Pikakentät (§26), ei alikokoelmakyselyjä renderöinnissä. §7.22 pelaajalle.

---

## A. BIOGRAFIA-MILESTONE-JANA (valmis heti, ei metodologiapäätöstä) — P0

`_renderNarrative` (Master ~5037) yhdistää jo: testitapahtumat + H-H/TKI-virstanpylväät (`erikoisNarr`, täysi pvm `_pvmFiM`) + `p.narrative[]`. Vuosisokeus oli vain demo-stringeissä — oikea data on päivätty.

**Lisättävät päivätyt lähteet** (kaikki datamallissa §11/§26, push samaan `{kk:_pvmFiM(date), txt, badge}`-muotoon, rivit ~5051–5070):
- `tekninen_varhaiskehitys.{merkki,ika,pvm}` → "🥇 Varhaistekniikka U{ika}" (§28, vahvin longitudinaalinen signaali)
- `talenttiAlku` → "Talenttiohjelma aloitettu" (+ `talenttiTaso`)
- `luotu` → "Liittyi TalentMasteriin"
- `adar_pvm` (kun `adar_havaintoja >= 1`) → "Ensimmäinen ADAR-havainto" / viimeisin
- PHV-huippu: `phv_tila === 'PH'` + `biologinenIka_viimeisin` → "Kasvupyrähdys (PHV)"

**+ Järjestä koko `kaikkiNarr` päivämäärän mukaan** ennen renderöintiä (nyt erikoisNarr lisätään lajittelematta). Ei uusia kenttiä, ei kyselyjä.

---

## B. RESEPTI-ASKEL — molemmat moottorit (§29 "mitä tehdä") — P1

Diagnoosi on jo (gap-vihjeet, kehityskohde). Nyt korvataan staattinen suositusteksti **oikealla harjoitteella moottorista.**

### B1. T-harjoite per pelaaja (kehityskortin detail)
- Lataa `harjoitelogiikka_v4.js?v=N` Masteriin (nyt vain Pelaaja_v7:ssä).
- `laskeTekninenKehityskohde(p)` → `valitsePaivanHarjoite(p, null, new Date())` → renderöi `{nimi, ohje, yt, cue}` kehityskortin/`_buildTKIDetail`/`_buildHHDetail` `detail-suositus`-lohkoon.
- §A7-varaukset: `valitsePaivanHarjoite(p, null, …)` käyttää sisäistä PANKKIa kun `pankki.T` puuttuu (OK). `generoiMiksiteksti(p, kohde, iv)` HEITTÄÄ jos kohde null → try/catch. Dead-code `generoimTehtavatV2`/`generoimViikoOhjelma` — älä käytä.

### B2. S-pre-harkka joukkueelle (uusi osio joukkuenäkymään)
- `lib/tm-prescription.js` `generoimPreHarkka(joukkue, {paiva})` → 4 blokkia (aktivointi·vahvuus70·kohdistettu30·pelillinen) FLEI-heikoimman ketjun mukaan + PHV-rajoitus (3+ PH → kevennys).
- Vaatii globaalit `TM.metodologia` (`tm-methodology.js`) + `TM.profile` (`tm-profile.js`) + `TM.microcycles` (`tm-microcycles.js`) → lataa ne Masteriin.
- Renderöi "Harjoitesuunnitelma"-osio (4 blokki-korttia) joukkuepulssin detail-näkymään tai Kehitys-välilehteen.
- Data-tietoinen: jos FLEI-dataa ei ole (pilotissa vähän), näytä tyhjätila "Pre-harkka vaatii FLEI-mittauksen" — ei kaadu.

### B3. Junktiokartta
Yksi "mitä tehdä" -ulostulo diagnoosista: TKI/tekninen kehityskohde → T-harjoite (B1); FLEI-heikoin ketju → S-pre-harkka (B2). Näytä se kumpi dataa on; molemmat jos molempia.

---

## C. D3 PSYYKKINEN — valmentaja + pelaaja (ka) — P1, oma pass

Nyt: `d3_viimeisin` luetaan vain Pelaajan FIFA-kortissa, `d3_taso` VP-radarissa — **kumpaakaan ei kirjoiteta** (keräyslomaketta ei ole).

### C1. Kysely (5 ulottuvuutta, Likert 1–5, suomeksi)
| Avain | Ulottuvuus | Likert-kysymys (valmentaja / pelaaja) |
|---|---|---|
| `inner_drive` | Sisäinen motivaatio | "Harjoittelee omaehtoisesti, ei vain käskystä" / "Haluan kehittyä myös omalla ajalla" |
| `coachability` | Valmennettavuus | "Ottaa palautteen vastaan ja soveltaa sitä" / "Kuuntelen ohjeita ja kokeilen niitä" |
| `resilience` | Sinnikkyys | "Ei luovuta vastoinkäymisissä" / "Jatkan vaikka epäonnistun" |
| `focus` | Keskittyminen | "Pysyy tehtävässä koko harjoituksen" / "Pysyn mukana koko treenin" |
| `emotional_control` | Tunteiden hallinta | "Hallitsee turhautumisen pelitilanteissa" / "Pysyn rauhallisena kun ärsyttää" |

### C2. Kaksi täyttäjää → keskiarvo
- **Valmentaja:** Master, `openDrill('d3')`-modaali (ADAR-patternin mukaan), per pelaaja.
- **Pelaaja:** Pelaaja_v7, itsearvio (lapsen kieli, kannustava — EI "taso"-kehystä, §7.22; itsereflektio ei ole suorituksen taso).
- **Tallennus** `seurat/{sid}/pelaajat/{pid}`:
  ```
  d3_viimeisin: { pisteet: { inner_drive:{valmentaja:N, pelaaja:N, avg:M}, … }, pvm: ISO, lahteet:['valmentaja','pelaaja'] }
  d3_taso: <avg-arvojen keskiarvo, 1–5>
  ```
  `{avg}`-rakenne on jo Pelaaja_v7:n lukijan odottama. `avg` = saatavilla olevien täyttäjien ka (toinen voi puuttua).
- **Security Rules:** valmentajaroolit kirjoittavat d3-kentät; pelaaja (anon PIN, oma doc) kirjoittaa oman itsearvionsa. Lisää Rules-blokki + writer-vartija.

### C3. Näyttö
- Master: "D3 Psykologinen" -lohko `_renderPinfoFirestore`:iin (d3_taso + 5 ulottuvuutta + "Arvioi"-nappi). 5D-radar (`_tmRadar5D` — ladattava VP:stä libiin) D3 täyttyy.
- Pelaaja FIFA-kortti: PSY-ruutu täyttyy kun d3_viimeisin on (lukija jo olemassa).

---

## D. D5 SOSIAALINEN — LYKÄTÄÄN

Ei kenttää, ei mittaria, ei määritelmää (§30). 5D-radar näyttää sen jo "tulossa"-tilassa → ei koodimuutosta. **Sosiaalinen mittari vaatii oman metodologiamäärittelyn** (mitä mitataan: joukkuerooli? vuorovaikutus? osallistuminen?) jonka Tero tekee rauhassa. Radar pysyy 4-akselisena kunnes määritelty.

---

## SEKVENSSI

1. **A (biografia-jana)** — pieni, yksi funktio, heti. 
2. **B (resepti, molemmat)** — moottorit valmiit, lataa + kytke detailiin + joukkueosioon.
3. **C (D3)** — oma pass: kysely + 2 täyttäjää + Rules + radar. Suurin.
4. **D5** — lykätty (metodologia).

Verifiointi kussakin: `npm test`, `new Function` 0 virhettä, datatietoinen tyhjätila, §7.22 pelaajalle, version:bump, push.
