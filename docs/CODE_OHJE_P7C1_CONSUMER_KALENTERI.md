# CODE — P7-c.1: Pelaaja + vanhempi näkevät seuran kalenterin (lue-kytkentä, perusta)

**Tyyppi:** Toiminnallisuus, näyttö (read). **Kaksi appia:** `TalentMaster_Pelaaja_v7.html` + `TalentMaster_Vanhempi_v2.html`. **⚠️ Vaatii Rules-muutoksen** (anon-luku kalenteriin) → PR → N4-CI.
**Design-totuus:** hyväksytty `idp_consumer_kalenteri.html`. Tiekartta **P7-consumer.1** (perusta; jatko: c.2 logistiikka · c.3 etukäteinen poissaolo · c.4 ilmoitukset). Ohje on itsenäinen.
**Iso kuva:** kuluttaja-appien kuori on jo rakennettu (itsekirjaus + narratiivinen tarina), mutta **kumpikaan ei lue seuran `kalenteri`-kokoelmaa** (verifioitu: 0 osumaa molemmissa). Pelaaja/vanhempi näkee vain pelaajan OMAA aktiivisuutta, ei seuran ajastettuja tapahtumia. P7-c.1 lisää **lue-kytkennän** → tulevat ottelut/testit/joukkuetreenit näkyviin.

## Miksi

Nuorisoseuran kalenterin käytetyin pinta (vanhemmat + pelaajat elävät aikataulusta) puuttuu appeista. Data on jo olemassa (`seurat/{sid}/kalenteri`), näkymien kuori on rakennettu — tarvitaan vain lue-kytkentä + Rules-avaus PIN-käyttäjälle. Perusta jolle logistiikka/poissaolo/ilmoitukset (c.2–c.4) rakentuvat.

## Verifioitu pohja (rakenna tälle)

- **Kalenteri-lähde:** `seurat/{sid}/kalenteri/{tapahtumaId}` — kentät `nimi · tyyppi · alkaa · paattyy · joukkue · joukkueet[] · pelaajat_id[] · paikka · toistuvuus · poistettu`. Tyyppi-ikonit/värit: doc §6.2 (harjoitus harmaa ⚽ · ottelu sininen 🏟️ · testitapahtuma teal 🧪 · kasvumittaus 📏 · palaverit amber · muu ○).
- **Pelaaja_v7:** lukee jo `kirjaukset`ia (`_tmKirjaa`/OMA TREENI); TÄNÄÄN-näkymä on olemassa. **0 `kalenteri`-lukua** → lisää.
- **Vanhempi_v2:** `rViikko()` + `_viikkoKirjaukset`-tarina olemassa; **0 `kalenteri`-lukua** → lisää.
- **⚠️ Rules-todellisuus:** `match /kalenteri/{id} { allow read: if onSuperAdmin() || onOmaSeura(seuraId); }` — **ei `onAnonymous()`**. `onOmaSeura` = `token.seuraId == seuraId` (claim), jota anonyymillä PIN-käyttäjällä **ei ole** → **PIN-pelaaja/vanhempi ei nyt pääse lukemaan kalenteria.** Malli jota peilata: `pelaajat/{pid}` read sisältää jo `|| onAnonymous()`.

## Mitä tehdään

### 1. Rules-muutos (pakollinen, minimaalinen)
Lisää **anon-luku** kalenteriin + sen läsnäolijoihin, peilaten `pelaajat`-dokin anon-read-mallia (sama luottamusmalli kuin pelaajan muut PIN-luvut):
```
match /kalenteri/{kalenteriId} {
  allow read: if onSuperAdmin() || onOmaSeura(seuraId) || onAnonymous();   // + PIN-pelaaja/vanhempi
  // create/update/delete ENNALLAAN (vain valmentaja/johto)
  match /lasnaolijat/{osallistujaId} {
    allow read: if onSuperAdmin() || onOmaSeura(seuraId) || onAnonymous();   // oma läsnäolo (write vasta c.3)
    // write ENNALLAAN
  }
}
```
- **Skooppaus-huomio (tietoinen):** bare `onAnonymous()` antaa anonyymille luvun **minkä tahansa seuran** kalenteriin (anonyymillä ei ole seuraId:tä Rules-skooppaukseen) — **sama malli kuin `pelaajat`-dokin anon-read jo on.** Roster-/joukkuesuodatus tehdään **appissa** (query), ei Rulesissa. Jos halutaan tiukempi Rules-skooppaus, se on erillinen iso muutos (vaatii seura-/joukkueclaimin PIN-tokeniin) — **ei tässä.**
- **Ei muuta Rules-muutosta:** create/update/delete + kirjoitukset ennallaan.

### 2. Pelaaja_v7 — "Seuran aikataulu" (TÄNÄÄN-näkymä)
- Lue `seurat/{_seuraId}/kalenteri`, suodata: **pelaajan joukkue** (`joukkue == _pelaaja.joukkue` TAI `pelaajat_id` sisältää pelaajan) **JA** `poistettu != true` **JA** `alkaa >= nyt` (tulevat) — järjestä ajan mukaan, näytä esim. 5 seuraavaa.
- Renderöi tapahtumakortti design-totuuden mukaan: tyyppi-ikoni + nimi + `alkaa`-aika + paikka. Käytä olemassa olevaa brändi-ilmettä (serif-otsikko, mono-meta, teal/sininen).
- **Säilytä:** OMA TREENI + kirjaukset-näkymät ennallaan. Aikataulu on lisäosio, ei korvaa.
- Tyhjä tila (ei tulevia): pehmeä "Ei merkittyjä tapahtumia — valmentaja lisää ne kalenteriin."

### 3. Vanhempi_v2 — "Tulevat tapahtumat"
- Sama lue + suodatus **lapsen joukkueeseen**; lisää Koti/Viikko-näkymään "Tulevat tapahtumat" -osio (narratiivisen tarinan **alle**, tarina säilyy ennallaan).
- Ikäadaptoitu (U19 harvempi/kepeämpi). **Ei numeroita/talentti-leimoja** (nykyinen periaate).

### 4. Read-only tässä vaiheessa
Ei logistiikkakenttiä (c.2), ei poissaolokirjoitusta (c.3), ei ilmoituksia (c.4). Vain lue + esitys.

## Reunaehdot
- **Rules:** yksi muutos (anon-read kalenteri + lasnaolijat). **Verifioi live** että PIN-pelaaja/vanhempi saa luvun eikä muu rikkoudu. Jos laajempi kirjoitus vahingossa aukeaa → pysähdy.
- **GDPR:** kalenteritapahtumissa ei ole terveysdataa (harjoitussisältöä); pidä näin — älä tuo terveys-/vammatietoa kalenteriin. (Poissaolon syy tulee c.3:ssa, GDPR-turvallisesti.)
- **Suodatus appissa:** näytä vain oma joukkue/roster — älä näytä koko seuran kaikkia tapahtumia (vaikka Rules sallii anon-luvun laajasti). Tietosuoja + relevanssi.
- **Alaikäiset:** read-only kaikille tässä vaiheessa; ei kirjoitusriskiä. **Topias = testi-OK.**
- **Demo-polku:** `_isDemoUser`/`?demo=1` → näytä demo-tapahtumat (kuten muut demo-tilat), ei Firestore-lukua.
- **Brändi:** kuluttaja-appien oma ilme (serif display, teal, dark); tyyppi-ikonit/värit doc §6.2:n mukaan; molemmat teemat jos appi tukee.
- **Ei cache-bumppia** ellei jaettua libiä muuteta.

## EI tässä
- **Logistiikka** (saapumisaika/peliasu/kartta/kimppakyyti) = **c.2** (uudet tapahtumakentät, VP/valmentaja täyttää).
- **Etukäteinen poissaolo** (kirjoita `lasnaolijat.tila`) = **c.3** (kirjoituspolku + Rules-tarkistus PIN-uid vs osallistujaId + GDPR-syy).
- **Ilmoitukset/muistutukset** (push/email/peruutus) = **c.4** (toimituskanava-infra).
- **Talenttien päällekkäisyys · maajoukkuekutsut · vuosikello** = myöhemmät.

## DoD
1. **Rules:** `kalenteri` (+ `lasnaolijat`) read sallii `onAnonymous()`; create/update/delete + kirjoitukset ennallaan; muu ei rikkoudu.
2. **Pelaaja_v7:** TÄNÄÄN-näkymä näyttää **tulevat seuran tapahtumat** (oma joukkue/roster, ei-poistetut, ajan mukaan) tyyppi-ikonein + aika + paikka; OMA TREENI + kirjaukset ennallaan; tyhjä tila pehmeä.
3. **Vanhempi_v2:** "Tulevat tapahtumat" -osio lapsen joukkueesta; narratiivinen tarina + viikkonäkymä ennallaan; ei numeroita/leimoja.
4. Suodatus appissa oikein (vain oma joukkue/roster); demo-polku toimii; read-only (ei kirjoituksia).
5. **Verifioi live (Topias PIN + vanhempi):** PIN-käyttäjä näkee KPV U13:n tulevat tapahtumat; ei Rules-virheitä; olemassa olevat näkymät toimivat; 0 konsolivirhettä. **Verifioi ennen mergeä.**
6. Keskikokoinen PR (voi jakaa: Rules · Pelaaja · Vanhempi); kuvaus linkkaa `idp_consumer_kalenteri.html` + tiekartta P7-c.1.
