# CODE BRIEF — E1 · Testit-hub tapahtumatason siivous (bulk mitätöi/palauta)

**Tyyppi:** uusi pinta + kirjoituspolku. **Kohde:** `TalentMaster_VP_v25.html` (Testit-hub `ws-testit`). **Kaksi pinottua PR:ää: E1a (näkymä+reititys) → E1b (bulk-kirjoitus).**

**Design-totuus:** `docs/E1_design_kartta.html` (artefakti `e1-testit-hub-siivous-kartta`). Molemmat teemat, design-tokenit.

**Lukittu skooppi (Teron linjaus):**
1. Bulk kattaa **koko tapahtuman kaikki testit** (yksittäistestin korjaus = pelaajakortti, E2).
2. **Vain pehmeä mitätöinti** (`mitatoidut`), peruttava. **Ei kovaa poistoa.**
3. Tapahtumanäkymä **joukkuerajattu**.

**Periaate:** hub tekee vain bulkin + reitittää korttiin. **Jokainen pelaaja ajetaan saman E2.2.1-suojatun `_vpMittausRebuildKirjoita`n läpi** — datahukkasuoja periytyy, ei uutta laskentaa.

**Rakentuu valmiin päälle (E2, livenä):** `_vpMittausRebuildKirjoita(p)` (suojattu), `_vpMittausRebuildMerkinnat`, `_vpMittausSuodataPoistetut`, `mitatoidut`-malli, `_vpVahvista`, `_vpVoiMuokata`, hub `_vpTestitViimeksi`/`ws-testit`, opener `_avaaPerPelaajaPikakatsaus` + `_jspVaihda(1)`.

---

## KOHDE / TAVOITETILA

Testit-hubin "Viimeksi kirjatut" -listan tapahtumarivi saa **Avaa siivoukseen →**. Se avaa **tapahtuman detaljinäkymän** (modaali): kyseisen testitapahtuman (`testauspvm` + `protokolla`/`lähde`) tehneet **valitun joukkueen** pelaajat + heidän arvonsa. Näkymästä voi **mitätöidä tai palauttaa koko tapahtuman** (kaikki pelaajat), mitätöidä yhden pelaajan osuuden, tai **avata pelaajakortin** yksittäiskorjaukseen (E2).

### Tapahtuman tunniste (datamalli)

Tapahtuma = `testauspvm` + `lähde/protokolla`. Pelaajan osallistuminen = hänen `testitulokset`-alikokoelmassaan on dokki jonka `testauspvm` (ja `lähde`/`protokolla`) täsmää. **Ei uutta kokoelmaa** — luetaan olemassa olevista per joukkueen pelaaja.

---

## VAIHE E1a — Tapahtuman detaljinäkymä + reititys (oma PR, TEE ENSIN, ei kirjoituksia)

### Työ
- **Siivouslistan lähde (KORJATTU — ks. design-kartta v2 §1):** **ÄLÄ** ota listaa hubin `_vpTestitViimeksi`/`testitapahtumat`-listasta. Syy: Pikakirjaus ei luo `testitapahtumat`-dokkia (puuttuisi), ja kenttätapahtumat (Testaus_v9) eivät kirjoita per-pelaaja `testitulokset`ia (rebuild ei näe → tyhjä siivous). Rakenna **"Siivoa mittauksia" -lista aggregoimalla joukkueen pelaajien `testitulokset`-dokeista** distinktit `(testauspvm, lähde)` → rivit ("lähde · N pelaajaa · pvm"). Näin lista = muokattava arkisto (Pikakirjaus + historia/Excel-tuonti) yhtenäisesti. Rivi → `_vpTapahtumaAvaa(pvm, lahde, joukkue)`.
- **Detaljimodaali** (brändätty, z-index kortin yläpuolelle kuten E2-modaalit ~300–500): otsikko = tapahtuman lähde + pvm + pelaajamäärä.
- **Pelaajien haku (joukkuerajattu):** valitun joukkueen pelaajat, kullekin `testitulokset`-dokki jonka `testauspvm===pvm` (+ lähde match). Kokoa lista: pelaaja → tapahtuman testiavaimet+arvot (nimet `tm_testikatalogi`). Näytä mitätöidyt himmennettyinä (jos jo `mitatoidut`). (Sama luku voi ruokkia myös listan aggregoinnin — yksi joukkueen testitulokset-luku.)
- **Rivikohtaiset toiminnot (E1a: näkyvät, kirjoitus E1b):** **Avaa kortti** → `_avaaPerPelaajaPikakatsaus(idx, joukkue)` + `_jspVaihda(1)` (Mittaus-välilehti, E2 = yksi määränpää). **Mitätöi/Palauta** renderöidään mutta ovat E1a:ssa no-op/disabled (kytketään E1b).
- **Tyhjä tila / lataus:** hillitty vihje + latausindikaattori (haku voi olla monta lukua).

**ÄLÄ (E1a):** kirjoita mitään; lisää uutta kokoelmaa; koske E2-koodiin muuten kuin reitittämällä korttiin.

**Hyväksymiskriteeri:** tapahtuma avautuu hubista; joukkueen osallistujat + arvot oikein; "Avaa kortti" vie oikean pelaajan Mittaus-välilehdelle; molemmat teemat; ei yhtään kirjoitusta.

---

## VAIHE E1b — Bulk mitätöi / palauta (oma PR, per-pelaaja suojattu rebuild)

### Työ
- **Bulk mitätöi tapahtuma:** varmistus (`_vpVahvista`, näytä **pelaajamäärä**). Vahvistus → **per pelaaja** (eräajo, rinnakkaisuus rajattu esim. 4–6 yhtä aikaa):
  1. Merkitse pelaajan tapahtuma-dokin **kaikki testiavaimet** `mitatoidut`-mappiin (`{kuka:_uid, milloin:ISO}` per avain).
  2. Päivitä hänen paikallinen cachensa (jos ladattu) ja aja **`_vpMittausRebuildKirjoita(p)`** (E2.2.1-suojattu) → pikakentät + Kehityskaari.
  3. **Edistymispalkki** ("12/18"); kerää onnistuneet/epäonnistuneet.
- **Bulk palauta tapahtuma:** poista tapahtuma-avaimet `mitatoidut`-mapista per pelaaja → sama rebuild.
- **Per-pelaaja Mitätöi/Palauta** (yhden pelaajan koko tapahtuma): sama polku yhdelle.
- **Virheraportti:** jos osa epäonnistuu, näytä "N/‑M onnistui, X epäonnistui" — **ei hiljaista osittaista tulosta**; tarjoa uudelleenyritys epäonnistuneille.
- **Re-render** detaljinäkymä (mitätöidyt himmennetään) rebuildien jälkeen.

**ÄLÄ (E1b):** kovaa poistoa (vain `mitatoidut`); suoraa `FieldValue.delete`-pyyhkäisyä pikakenttiin (aina `_vpMittausRebuildKirjoita`n kautta → E2.2.1-suoja); primitiivin muutosta; skooppia joukkueen ulkopuolelle.

**Hyväksymiskriteeri (L3, elävä, sanktioidut testitietueet):**
1. Bulk-mitätöinti mitätöi tapahtuman **kaikilta joukkueen osallistujilta**; jokaisen pikakentät regressoivat; **H-H säilyy** jokaisella (E2.2.1 per pelaaja).
2. Edistymis- ja virheraportti näkyy; osittainen epäonnistuminen ei jää piiloon.
3. Bulk-palautus palauttaa tilat identtisiksi.
4. "Avaa kortti" + yksittäiskorjaus (E2) toimii rinnalla.
5. Data palautetaan ennalleen testin jälkeen.

---

## REUNAEHDOT (non-negotiable)

- **Vain pehmeä mitätöinti** (`mitatoidut`), peruttava. Ei kovaa poistoa.
- **Joukkuerajattu**; kirjoitus vain `_vpVoiMuokata()` (VP/johto/SA). Master-portin oman-joukkueen-kiristys yhteinen E2:n TODO.
- **Per-pelaaja E2.2.1-suojattu rebuild** — ei koskaan suoraa pikakenttä-pyyhintää.
- **GDPR:** `mitatoidut`-audit vain uid+aikaleima. Suojatut alaikäiset: live-testi vain sanktioituihin testitietueisiin, data ennalleen.
- **Skaalaus:** rinnakkaisuus rajattu; edistymis-/virheraportti; ei hiljaista truncationia (jos lista rajataan, `log`/UI kertoo).
- **Ei cache-bumppia** ellei jaettua libiä muuteta (oletus: vain VP_v25). Design-tokenit, molemmat teemat.

## DoD (kumpikin vaihe)
1. Renderöityy molemmissa teemoissa (screenshotit); E1b myös varmistus + edistymis/virheraportti.
2. Ei datahukkaa; per-pelaaja suojattu rebuild uudelleenkäytetty; ei uutta laskentaa.
3. Testattava logiikka puhtaana (tapahtuman osallistujien kokoaminen; bulk-mitätöinnin merkintärakennus) — yksikkötestit; koko suite vihreä; eslint puhdas.
4. Pieni, stackattu PR (E1a ennen E1b); kuvaus linkkaa design-karttaan + tähän briefiin.
5. **Verifioi live ennen seuraavaa vaihetta** (Claude ajaa sanktioiduilla testitietueilla).

## Sarjan tila
- E2.1–E2.3 ✓ · E2.2.1 (datahukkasuoja) ✓ · E2.3.1 (komposiittikorjaus) · avoin.
- **E1a** — tapahtuman detalji + reititys · *tee ensin.*
- **E1b** — bulk mitätöi/palauta (per-pelaaja suojattu rebuild) · E1a:n jälkeen.
