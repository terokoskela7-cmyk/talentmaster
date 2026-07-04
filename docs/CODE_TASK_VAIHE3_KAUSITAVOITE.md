# Vaihe 3 — Kausitavoite (IDP-ydin): toteutusspec

> Lähde: co-design 2026-07-03. Rakentuu Vaihe 2:n (ominaisuusarviointi, nyt livenä) päälle. **Datamalli + review-objekti = `IDP_YDIN_SPEC.md` (kanoninen, älä toista) — tämä spec lisää: PINNAN, EHDOTUSMOOTTORIN, ROOLIT/FLOW, VAIHEISTUKSEN.** Mockup: `docs/mockups/vaihe3_kausitavoite_mockup.html`. §7.22 · §26 · §32 · §37 · §5 · §28.

## 1. Ydin (yhdellä lauseella)
Vaihe 2 tuotti täyden 5D/4-corner-profiilin (mitattu + havaittu + pelihavainto). Vaihe 3 nostaa **heikoimman ominaisuuden strukturoiduksi, pelaajan omistamaksi kausitavoitteeksi** ja seuraa sitä **kaksisuuntaisella review-syklillä** (kehityskaari). Tämä on IDP:n ydin — se jonka Head of Talent näki.

## 2. Pinta (missä elää)
- **Ensisijainen: VP_v25 `_avaaPerPelaajaPikakatsaus` (per-pelaaja `_jspModal`)** — uusi **"Kausitavoite"-osio arviointi-osion jälkeen** (heikoin johdetaan samasta arviointidatasta → luonteva jatkumo). Aikuisnäkymä = täydet luvut.
- **Valmentaja: Master_v16 Pelaajaraportti (§37)** — sama tavoite read/write valmentajan omiin pelaajiin (Vaihe 4:n kanssa yhteinen paneeli); VP näkee read-only + kommentoi (§37-rooli).
- **Pelaaja/perhe: 3c (myöhempi)** — §7.22-turvallinen peili Pelaaja_v7:ään (prosessikehu, pelaajan ääni + itsearvio, EI vertailua/percentiiliä/punaisia deltoja). Ei tässä vaiheessa.

## 3. Ehdotusmoottori (3a) — heikoin arvioinnista
Lukee **Vaihe 2:n pikakentistä** (§26, ei uutta kyselyä) ja ehdottaa `tavoite`-luonnoksen (`status:'ehdotettu'`, `lahde:'moottori'`):
1. **Prioriteetti heikoimmalle** (sama "näytä mitä on" -logiikka):
   - Mitattu kehityskohde: `tki_kehityskohde` (laji-id) / heikoin `d1`/`d2`-osaindeksi TAI matalin Eerikkilä-taso.
   - Havaittu ≤2 (`arviointi_havaittu[avain].arvo`, sis. pelihavainto-johdettu) — Palloliitto-taksonomian kohde.
   - **Kypsyysvahti (§28):** pre-PHV heikko 30m/MAS/CMJ EI kelpaa fokukseksi (biologisesti odotettu) → ohita, valitse seuraava. Tekniikka/taito pre-PHV = etusijalla (kultaikkuna auki).
2. **Täyttää tavoite-objektin** (`IDP_YDIN_SPEC §2`): `fokus` + `mittari` + `lahto` (viimeisin mittaus/arvio + pvm) + `tavoitearvo` (johdettu normigapista/`tkSekuntibudjetti`/kultaikkuna — Achievable, ei epärealistinen) + `perustelu` (kultaikkuna/normigap + lähde) + `ankkuri_7030` (vahvin dim arvioinnista).
3. **Pelaajan ääni tyhjä** → täytetään hyväksynnässä (`pelaajan_tavoite`).
Ehdotus on **luonnos** — ihminen hyväksyy ennen `aktiivinen`-tilaa. Ei automaatti-aktivointia.

## 4. Roolit + flow (§32)
```
VP/valmentaja: "Ehdota tavoite" → moottori luo luonnoksen → muokkaa (fokus/tavoitearvo/perustelu)
   → pelaaja lisää oman äänen (pelaajan_tavoite) → hyväksyntä → status:'aktiivinen'
Review-sykli (arvio_pvm koittaa → muistutus 3c):
   1. Pelaaja arvioi edistymän ENSIN (pelaajan_arvio 1–5 + note)   ← pelaaja johtaa
   2. Testi uusitaan → mitattu arvo → DVI-suunta (kehitysvauhti §29)
   3. Valmentaja vastaa (valmentajan_kommentti)                    ← kaksisuuntainen
   → arviot[] kasvaa (kehityskaari) → saavutettu | jatkuu (uusi tavoitearvo)
```
Kirjoituspolut olemassa olevilla patterneilla: tavoite/arvio Firestoreen (§6), valmentaja↔pelaaja-viestit `havainnot tyyppi:'valmentaja_viesti'` (§32) tarvittaessa. **Ei uutta viesti-infraa.**

## 5. Kehityskaari (3b) — review-timeline
`tavoite.arviot[]` → visuaalinen timeline (mockup): per arvio piste = mitattu arvo (viiva lähtö→tavoite-vyöhykkeellä) + pelaajan itsearvio (1–5 emoji/piste) + valmentajan kommentti-merkki + DVI-nuoli. Näyttää **kehittyykö** (ei vain nykytaso). §29 kaksi deltaa: abs-parannus + normivauhti erikseen; §7.22 pelaajalle vain abs-parannus positiivisena (3c).

## 6. Firestore + pikakentät (§26 / IDP_YDIN §6)
- `seurat/{sid}/pelaajat/{pid}/idp_kausi/{vuosi}` → `tavoitteet: [tavoite-objekti]` (arviot upotettu).
- **Pikakentät pelaajadokkiin:** `idp_tila` (status) · `idp_edistyma` ("X %" tai "n/N") · `idp_fokus` ({alue, dim, nimi}) → Vaihe 1 -lista + kortti lukevat ilman alikokoelmakyselyä.
- **Rules:** uusi alikokoelma `idp_kausi` vaatii oman `match`-blokin (§15) — johto+valmentaja kirjoittaa omiin, pelaaja lukee/self-arvioi omansa. **Rules-muutos → PR → N4-CI deployaa** (kuten arviointi v3.9). Lisää `idp_kausi`-blokki `arviointi`-blokin viereen.
- **Ei serverTimestampia arrayssa** (§7.6) → `arviot[]`/`tavoitteet[]` pvm = `new Date().toISOString()`.

## 7. Vaiheistus
- **3a — Tavoite (luonti + hyväksyntä + pikakentät):** ehdotusmoottori + tavoite-kortti VP-modaaliin + Firestore-kirjoitus + pikakentät + `idp_kausi` Rules-blokki. Ei review-sykliä vielä.
- **3b — Review-sykli + kehityskaari:** arviot[]-lisäys (pelaaja-arvio → mittaus-DVI → valmentaja-kommentti), timeline-UI, saavutettu/jatkuu-elinkaari.
- **3c — Pelaaja-/perhe-peili + muistutukset:** §7.22-turvallinen näkymä Pelaaja_v7/Vanhempi_v2 + review-rytmimuistutus (`lahetaMuistutukset`-pattern). Erillinen.

## 7b. PELAAMINEN-LINKITYS (EHDOTON invariantti — Teron linjaus)
**Kehittyminen ja tavoitteet linkittyvät AINA pelaamiseen** — tavoite ei ole irrallinen testinumero vaan pelillinen sovellus.
- **Teknis-taktiset kohteet nousevat fokukseksi** kun ne on arvioitu: moottori kerää `arviointi_havaittu ≤2` KAIKISTA dimensioista (vahvistettu `idpKeraaKandidaatit`) — D2 tekninen havaittu + D4 peliäly (päätöksenteko, sijoittuminen, näkemys, link-up, peli paineessa) + pelihavainto-johdettu. Nämä ovat luonnostaan pelikontekstisia.
- **Fokus + perustelu kehystetään pelilliseksi:** fokus-nimi = pelisovellus ("Syöttö paineessa", ei "syöttötesti"); perustelu sisältää **"pelillinen sovellus" -rivin** (miten kohde näkyy ottelussa/harjoituspelissä). Mitattu testi = näyttö, mutta tavoite kuvataan pelin kautta.
- **70/30-ankkuri = pelillinen integrointi** ("integroi syöttö nopeuteen liikkeessä"), ei eristetty tekninen toisto.
- **Silta myöhempiin vaiheisiin:** teknis-taktinen kehitys syvenee **Vaihe 4:ssä** (Palloliitto teknis-taktinen corner + harjoitecue) ja tavoitteen toteutuma näkyy **Vaihe 6:ssa** (pelipaikkakohtaiset pelihavainto-/ottelu-KPI:t). 3a valmistelee: fokus/mittari/perustelu ovat pelilähtöisiä jo nyt.

## 8. Invariantit
Metodologia ennallaan (mittari = normitettu testi/arvio) · §28 kypsyysvahti fokusvalinnassa · §7.22 (aikuisnäkymä luvut; pelaaja-peili prosessikehu, ei vertailua) · valmentaja omistaa kentän · §26 pikakentät (ei alikokoelmakyselyä listassa/kortissa) · §32 olemassa olevat viestipolut · standardoitu kenttärakenne (kansallinen koonti V6, ei seurakohtaisia poikkeamia) · GDPR §33 B4 · §5 tokenit. Testit: ehdotusmoottori (heikoin-valinta + §28-kypsyysvahti + tavoitearvo-johto) · pikakenttä-kirjoitus · Rules `idp_kausi`. `npm test` + lint.
