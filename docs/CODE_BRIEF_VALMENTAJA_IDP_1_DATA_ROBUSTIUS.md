# Valmentajan IDP · Briiffi 1/2 — Kalibraatio-datan robustius + rehellinen tyhjä tila · Code-brief

> **Konteksti (Joakim-testin juurisyy, verifioitu Firestoresta):** Joakimin itsearvio (joukkue **P10**) ja VP-havainnointi
> (joukkue **P12**) täsmäsivät kaikessa PAITSI joukkueessa → paritus ei ehdottunut → "Ei vahvistettuja pareja vielä".
> Joakim on rooliltaan **vp** (joukkue "—"), joten "mikä joukkue" on hänelle mielivaltainen. Lisäksi tyhjä tila ei kerro
> **mitä** puuttuu. Tämä briiffi tekee parituksesta robustin ja tyhjästä tilasta puhuvan. **EI muuta kalibraatiokaavaa.**
> **Malli:** reuse yli reimplementoinnin. **VP_v25 + lib/tm_eerikkila_normit.js. Ei `?v`-bumppia (workflow hoitaa).**

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** **Älä koske:** `laskeHarjoitusKalibraatio`-kaavaan · `laskeValmentajaHarjoitusKooste`:en · `tmValmennusKaari`:iin · `pari_vahvistettu`-kirjoitukseen (`_hlVahvistaPari`) — ihmisen vahvistus säilyy · pikakenttien laskentaan.
- **§37 kehittävä, ei rankaiseva:** kalibraatio = keskustelunavaus, ei arvosana. Aikuisen ammatillista dataa. **Molemmat teemat, 0 pinkkiä, teal-aksentti.**

## MUUTOS 1 — paritus valmentaja+aika-ensisijaiseksi (joukkue = pehmeä signaali)
`_hlEhdotaPari(a)` (VP_v25 ~15439) suodattaa nyt pois eri joukkueen ehdokkaat (**rivi ~15446 `lc(x.joukkue) !== lc(a.joukkue)`**). Tämä on liian kova ehto (VP-roolisella joukkue mielivaltainen).
- **Poista joukkue KOVASTA suodattimesta.** Säilytä kovat ehdot: sama `valmentajaUid`, `malli==='valmennustaidot'`, **vastakkainen** `arviointitapa`, `pari_vahvistettu!==true`, ei torjuttu, ±pv-ikkuna.
- **Aikaikkuna:** nosta ±2 pv → **±7 pv** (itsearvio + havainnointi eivät aina ole samana päivänä). **Ilmoita ENNEN** jos haluat pitää ±2.
- **Joukkue pehmeäksi signaaliksi:** järjestä ehdokkaat niin että (1) sama joukkue etusijalla, sitten (2) pienin päiväero. Jos paras ehdokas on **eri joukkue**, merkitse ehdokkaaseen lippu `_eriJoukkue:true`.
- **`_hlPariBlokki` (ehdota pari, ~15469):** kun ehdokkaalla `_eriJoukkue` → näytä hienovarainen huomio: *"Eri joukkue (Itsearvio: P10 · Havainnointi: P12) — sama harjoitus? Vahvista jos kyllä."* (amber-teksti, EI esto). "Vahvista pari" toimii ennallaan. → operaattori päättää, kuten sisarukset/jaettu-email-tapauksissa muualla.

## MUUTOS 2 — rehellinen tyhjä tila (kertoo mitä puuttuu)
`_cmLataaArvioinnit` (~12059) näyttää nyt vain: *"Ei vahvistettuja pareja vielä — vahvista itsearvio↔havainnointi tapahtumanäkymässä."* (~12079). Korvaa **täsmällisellä** tilalla, joka lasketaan valmentajan B-arvioinneista (jo ladattu `arvioinnit`-listaan):
- Laske: `nItse` = itsearvioita, `nHav` = havainnointeja, `nVahv` = vahvistettuja pareja (`harjoitusKalibraatioHistoria`).
- Viestit (prioriteetti):
  - `nVahv>0` → nykyinen kuilu-render (ennallaan).
  - `nItse>0 && nHav>0 && nVahv===0` → **"Löytyi X itsearviota + Y havainnointia, mutta paria ei ole vahvistettu"** + jos löytyy `_hlEhdotaPari`-ehdokas (myös eri joukkue) → **"Yhdistä pari →"** -linkki tapahtumanäkymään. Jos ehdokkaat eroavat vain joukkueelta → mainitse se ("eri joukkue").
  - `nItse>0 && nHav===0` → **"Odottaa VP-havainnointia"** (valmentaja on tehnyt itsearvion; VP havainnoi samalla lomakkeella tapa=havainnointi).
  - `nHav>0 && nItse===0` → **"Odottaa valmentajan itsearviota"** (VP on havainnoinut; valmentaja tekee itsearvion Masterissa / tapa=itsearvio).
  - `nItse===0 && nHav===0` → **"Ei valmennustaito-arviointeja vielä"** (nykyinen honest-empty).
- **Sama logiikka VP:n kalibraatio-cockpittiin** (`renderKalibHl`/malli B -näkymä ~15261+, jos se näyttää samaa "ei pareja"-tekstiä) — pieni jaettu helper esim. `_kalibTilaViesti(arvioinnit, uid)` → {koodi, teksti}. **Ilmoita ENNEN** jos jaat helperin (suositus: kyllä, yksi totuus).

## MUUTOS 3 — kaksi kalibraatiota selkeästi erilleen (coach-kortti)
Kalibraatio-välilehti (`_cmTab(4)`) sisältää jo kaksi eri asiaa samassa: `cmKalibHarj` (harjoitusarviointi itsearvio↔havainnointi) + `cmAdarCpd` (K5b peliäly-kalibraatio, pelaaja-ADAR). Ne ovat koodissa erillään mutta **visuaalisesti sekaisin** → juuri tämä sai Teron odottamaan väärää kalibraatiota.
- Anna kummallekin **selkeä oma otsikko + 1 rivi selitystä mistä data tulee:**
  - **"Valmennustaito-kalibraatio · itsearvio ↔ VP-havainnointi"** (harjoitusarviointi-lomake, Malli B).
  - **"Peliäly-kalibraatio · pelaaja-ADAR vs VP"** (kenttähavainnot pelaajista).
- Järjestys + hiusviivaerotin väliin. **Vain otsikot/selitteet/järjestys — ei datalogiikkaa.**

## INVARIANTIT + DoD
- **Paritus toimii VP-roolisella + eri joukkueella** (Joakim): itsearvio + havainnointi ehdottuvat pariksi, eri joukkue → huomio ei esto. Sama joukkue etusijalla.
- **Tyhjä tila kertoo mitä puuttuu** (odottaa havainnointia / odottaa itsearviota / vahvista pari / ei arviointeja).
- **Kaksi kalibraatiota erillisin otsikoin.** `pari_vahvistettu`-vahvistus säilyy ihmisen päätöksenä. Kaava/pikakentät ennallaan.
- **Kehittävä kehys, ei arvosana. Molemmat teemat, 0 pinkkiä.**
- **LIVE ennen valmista (Sibbo, VP-appi):**
  - Joakim (itsearvio P10 + havainnointi P12) → coach-kortti näyttää **"Löytyi 1 itsearvio + 1 havainnointi (eri joukkue) — yhdistä?"** → vahvistus → **kuilu 0.86** näkyviin per kriteeri.
  - Valmentaja jolla vain itsearvio → "Odottaa VP-havainnointia". Vain havainnointi → "Odottaa valmentajan itsearviota".
  - Kalibraatio-välilehti: kaksi erillistä otsikkoa. Vitest + eslint vihreä.

## EI TÄSSÄ (Briiffi 2)
- **Valmentajan IDP-kortti** (Oura-tyylinen kehitysnäkymä: tila-rengas + kontribuuttorit + jaksofokus). Erillinen render-briiffi.
