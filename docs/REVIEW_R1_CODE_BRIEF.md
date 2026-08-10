# CODE BRIEF — R1 · Arviointi-cockpit (Reviewit-uudistus)

**Tyyppi:** olemassa olevan näkymän uudistus, VP-pinta. **Kohde:** `TalentMaster_VP_v25.html` (`ws-reviewit` + `renderReviewit`). **Kaksi pinottua PR:ää: R1 (arviointi-cockpit) → R2 (raportointi-joukkueäly). TEE R1 ENSIN.**

**Design-totuus:** `docs/REVIEW_RAPORTOINTI_design_kartta.html` (mockup v4, roolitietoinen). Avaa se, katso "💡 design-perustelut" ja "👤 Valmentaja / VP" -toggle. Molemmat teemat, design-tokenit. Lue myös skillit `talentmaster-domain` + `talentmaster-design-system` ennen aloitusta.

**Periaate (ei-neuvoteltava): EI UUTTA LASKENTAA.** Cockpit lukee olemassa olevaa ja avaa olemassa olevat toiminnot. Se on **UI-kerros**, ei uusi moottori.

---

## KOHDE / TAVOITETILA

Nykyinen `ws-reviewit` on eräpäivälista (väripallo + pvm). Muuta se **arviointi-cockpitiksi**: priorisoitu työlista, jossa jokainen rivi kantaa substanssin ja avaa arvioinnin suoraan. Sama pinta, roolitietoinen rosteri.

### Rivi = kaksitasoinen (progressive disclosure)

**Perusrivi (aina näkyvissä, rauhallinen):** nimi · joukkue/ikävaihe · fokus-siru (`jaksofokus.domeeni` + konsepti) · DVI-trendi · **enintään 2 lippua vakavuusjärjestyksessä** (turvallisuus → elinkaari), loput "+N" · toimenpide-rivi · seuraava review.

**Auki (klik; VAIN YKSI RIVI AUKI KERRALLAAN):** edellinen review + tagit · **nelikulma-linssi nimettynä** (Fyysinen · Teknis-taktinen · Psyykkinen · Sosiaalinen) · silta-ehdotus · itsearvio vs VP (sama ulottuvuus).

### Datalähteet (kaikki olemassa — älä keksi uutta)

- **Fokus / nelikulma** = `jaksofokus.domeeni` (`fyysinen` · `teknis_taktinen` · `psyykkinen` · `sosiaalinen`) + `konsepti_nimi`.
- **DVI-trendi** = §29 `idpDviSuunta` (kaksi deltaa; up teal ↑ / flat harmaa → / **down amber ↓** — abs+ ei koskaan alas). **Tyhjä tila** kun mittauksia liian vähän: "DVI: kerätään (n/3)", ei harhaanjohtavaa trendiä.
- **Toimenpide** = `jaksofokus` cue/harjoite (yksi konkreettinen teko).
- **Hyvinvointilippu** = `flei_viimeisin` (Valmius) — käytä koodissa jo olevaa **`<40`-kynnystä** (🏥 Valmius N, punainen) + tarvittaessa `rpe` (kuormitus).
- **Itsearvio vs VP** = `d3` (pelaajan itsearvio = D3) vs VP-arvio **samasta ulottuvuudesta**; kolmisarakkeinen Pel/Val/VP on jo olemassa. Merkitse ulottuvuus näkyviin; kunnioita Pel-sarakkeen vanhenemismerkintää (`_vpJaksoVanhentunut`).
- **Sitoumus** = `pelaaja_sitoumus` (`sitoumus_pvm`, `vahvistettu_pvm`, `vahvistaja_rooli`, `vahvistaja_uid`, `vahvistettu_jakso_alkoi`).
- **Kadenssi/tila** = `laskeReviewKadenssi` (jo olemassa; ≥12 v 6 vk, 9–11 v 12 vk).

### Toiminnot (avaa olemassa olevat, älä kirjoita uusia laskentapolkuja)

- Perustoiminto vaihtuu tilan mukaan: **＋ Kirjaa review** → olemassa oleva `_vpKirjaaReview` (4-vaihe) · **✓ Vahvista sitoumus** → `_vpVahvistaSitoumus` · **Avaa kortti** → `_avaaPerPelaajaPikakatsaus` + `_jspVaihda(1)` · **Aloita review** (ei reviewia).
- **Opt-in "Valitse monta"** (bulk): valintatila paljastaa checkboxit; bulk hajoaa **per-pelaaja samaan suojattuun kirjoitukseen** (E1b-polku). Ei aina päällä olevia checkboxeja.

---

## ROOLITIETOISUUS (R1:n ydin — tämä on koodin nimetty TODO §9367)

Selitteen `idp_roolit` mukaisesti: **valmentaja omistaa oman joukkueensa pelaajien reviewit** (luo/muokkaa/aktivoi jaksofokus, käy kehityskeskustelut, ei odota VP:tä). **VP = vahvistaja + kalibroija, ei portti.**

- **Omistajuussääntö:** valmentaja omistaa pelaajan jos pelaajan `joukkue`/`joukkueet[]` osuu joukkueeseen, jonka `valmentajat`/`valmentajaUid` sisältää hänen uid:nsa (case-insensitive, kuten §29 joukkuesuodatus).
- **Kirjoitusportti:** laajenna `_vpVoiMuokata()` päästämään **oman joukkueen valmentaja** läpi omien pelaajiensa osalta. VP/johto/SA säilyy (kaikki joukkueet). Portin on oltava **pelaajakohtainen** (oma joukkue), ei globaali.
- **Näkymä:** Valmentaja → vain omat joukkueensa (rosteri rajattu). VP → kaikki joukkueet + oversight + "＋ N muusta joukkueesta".
- **Jaksofokus** = valmentajan päivittäistä työtä (ei odota VP-hyväksyntää). **Kausitavoite** = sovitaan yhdessä (jaettu). 
- **Sitoumus (päätös: molemmat + yliajo):** valmentaja vahvistaa oman joukkueensa; VP voi yliajaa. **Sama kenttä** — `vahvistaja_rooli` tallentaa kumpi (`valmentaja`/`vp`), sidottuna `jaksofokus.alkoi`-jaksoon. Ei uutta taulua.

> **HUOM (turvallisuus):** tämä muuttaa kirjoitusoikeutta. Jos Firestore-säännöt rajaavat kirjoituksen roolilla, oman-joukkueen-valmentaja-oikeus on varmistettava myös säännöissä — älä jätä porttia pelkäksi client-tarkistukseksi. Kirjaa PR-kuvaukseen mitä sääntöpuoli vaatii (tai vahvista ettei muutosta tarvita).

---

## INVARIANTIT (non-negotiable)

1. **Ei uutta laskentaa.** DVI = §29, nelikulma = domeeni, toimenpide = cue/harjoite, valmius = FLEI, kuormitus = RPE, itsearvio = D3. Ei kopioitua logiikkaa.
2. **Yksi laskentapolku.** Kirjaus/vahvistus ajaa olemassa olevat funktiot (`_vpKirjaaReview`, `_vpVahvistaSitoumus`, `_vpMittausRebuildKirjoita` bulkissa). Bulk = per-pelaaja E1b-suojattu rebuild.
3. **Pehmeä + peruttava · GDPR-audit vain uid + aikaleima · ei kovaa poistoa.**
4. **WCAG AA:** chip-tekstit vähintään `--ink2` (ei `--ink3` läpinäkyvällä). Molemmat teemat renderöityvät.
5. **Rauhallinen rivi:** enintään 2 lippua perusrivillä, yksi rivi auki kerrallaan.
6. **Ei cache-bumppia** ellei jaettua libiä muuteta (oletus: vain VP_v25 + testit).

## DATAKONTRAHTI (määrittele nämä täsmällisesti PR:ssä)

- DVI:n min-pistemäärä trendille + §29-viittaus (tyhjä tila alle sen).
- Saman-ulottuvuuden Pel/VP-valintasääntö + Pel-sarakkeen vanhenemismerkintä.
- Review-tagien **kuratoitu sanasto** (nelikulma + yleiset teemat) + `review_tagit[]`-kenttä (aggregoitava; ei vapaita tageja).
- Omistajuuspredikaatti (pelaaja↔valmentaja) puhtaana, testattavana funktiona.
- (Ei R1:ssä, mutta kirjaa: umpeutuneen jakson auto-sulku + notifikaatio pelaajalle kytkeytyy myöhempään "Julkaise jakso" -tapahtumaan.)

---

## HYVÄKSYMISKRITEERI (kolmitasoinen)

**L1 git-diff:** invariantit pitävät; ei uutta laskentaa; ei skoopin ylitystä (raportointi = R2); kirjoitusportti pelaajakohtainen (ei globaali); chip-kontrasti AA.

**L2 testit (puhdas logiikka):** omistajuuspredikaatti (oma vs vieras joukkue) · DVI-tyhjä tila (< min-pisteet → "kerätään") · saman-ulottuvuuden itsearvio/VP-erotus · tagirakenteen muoto. Koko suite vihreä, eslint puhdas.

**L3 live (Claude ajaa, sanktioidut testitietueet, molemmat teemat):**
1. **Valmentaja-rooli:** näkee vain omat joukkueensa; voi kirjata reviewin + asettaa jaksofokuksen odottamatta VP:tä; voi vahvistaa oman joukkueensa sitoumuksen.
2. **VP-rooli:** näkee kaikki joukkueet + oversight; voi yliajaa vahvistuksen (`vahvistaja_rooli` päivittyy `vp`:ksi).
3. **Vieras joukkue:** valmentaja EI voi kirjoittaa toisen joukkueen pelaajaan (portti pitää).
4. Rivi rauhallinen (≤2 lippua); yksi auki kerrallaan; nelikulma nimettynä; DVI down = amber; tyhjä tila näkyy.
5. Data palautetaan ennalleen testin jälkeen.

## DoD
1. Renderöityy molemmissa teemoissa (screenshotit).
2. Ei datahukkaa; bulk per-pelaaja E1b-suojattu; ei uutta laskentaa.
3. Testattava logiikka puhtaana (yllä); suite vihreä; eslint puhdas.
4. Pieni, stackattu PR (R1 ennen R2); kuvaus linkkaa design-karttaan + tähän briiffiin + kirjaa Firestore-sääntöjen tila.
5. **Verifioi live ennen R2:ta.**

## SKOOPIN ULKOPUOLELLA (R1)
Raportointi-joukkueäly (= R2) · reaktiivisuus / "Julkaise jakso" -tapahtuma · vanhemman review-silmukka. Näitä ei kosketa R1:ssä.
