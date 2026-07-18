# CODE — P7-c.3: Etukäteinen poissaolo (pelaaja/vanhempi ilmoittaa saatavuuden)

**Tyyppi:** Toiminnallisuus, kirjoitus. **⚠️ Vaatii Rules-muutoksen** (anon-kirjoitus omaan läsnäoloon). **Riippuvuus:** P7-c.1 mergessä.
**Kohteet:** `TalentMaster_Pelaaja_v7.html` + `TalentMaster_Vanhempi_v2.html` (ilmoitus + näyttö) · VP/valmentaja lukee jo `lasnaolijat`. **Design-totuus:** `idp_consumer_kalenteri.html` ("To testi — Tulossa / Estynyt").
**Tiekartta P7-c.3.**

## Miksi
Nyt läsnäolo on vain **päivä-tason** merkintä (valmentaja merkitsee jälkikäteen). Puuttuu: pelaaja/vanhempi ilmoittaa **etukäteen** onko tulossa (koulu, loma, sairaus, maajoukkuekutsu) → syöttää suunnittelun, rosterin ja P6a-kuorman. Teamworks "Sign-Ups" -mallin ydin.

## Verifioitu pohja
- Läsnäolo: `seurat/{sid}/kalenteri/{tapahtumaId}/lasnaolijat/{osallistujaId}` `{ tila, rooli, paivitetty }`. Tila-enum (arkkitehtuuri §3.2): `kutsuttu · vahvistettu · peruttu · ei_vastausta`.
- **⚠️ Rules-todellisuus (780–792):** `lasnaolijat` write sallii `(onOmaSeura(seuraId) && request.auth.uid == osallistujaId)` + valmentaja/johto. **Anonyymi PIN-käyttäjä ei pass `onOmaSeura`** → **ei nyt voi kirjoittaa omaa läsnäoloaan.** → **Rules-muutos tarvitaan.**

## Mitä tehdään

### 1. Rules-muutos (pakollinen, skoopattu)
Lisää `lasnaolijat` create/update: **anon-kirjoitus vain omaan läsnäoloon + vain `tila`-kenttä** (peilaa `kirjaukset`-anon-mallia; GDPR: ei syytä):
```
allow create, update: if … (nykyiset)
  || (onAnonymous()
      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['tila','paivitetty','rooli']));
```
- **Skooppaus-huomio:** anonyymillä ei ole uid==osallistujaId-vastaavuutta (PIN-token ei kanna pelaajaId:tä) → sama laaja anon-luottamusmalli kuin `kirjaukset`/`pelaajat`-anon-write. Rajaa **affectedKeys**illa vain `tila` (+ paivitetty/rooli) → anon ei voi muuttaa muuta. **Syy-kenttää EI sallita anonille** (GDPR).
- Delete + muut ennallaan.

### 2. Pelaaja + vanhempi — ilmoitus
Tulevalle tapahtumalle "Pääseekö [pelaaja]?" → kaksi valintaa: **✓ Tulossa** (`tila:'vahvistettu'`) / **✕ Estynyt** (`tila:'peruttu'`). Kirjoittaa `lasnaolijat/{pelaajaId}.tila`. Vanhemmalla nuoremman puolesta.
- **Syy (koulu/loma/sairaus):** **EI vapaana tekstinä läsnäolo-dataan** (GDPR). Jos halutaan kevyt ei-terveys-syy (koulu/loma), se voi olla **enum** erikseen — mutta **sairaus/loukkaantuminen → ei tähän**, vaan terveys-linjaan (myöhemmin, physio §4). v1: pelkkä tulossa/estynyt riittää.

### 3. VP/valmentaja — näkyy jo
Valmentaja lukee `lasnaolijat`n jo (kalenteri-läsnäolo + P6a) → etukäteinen "peruttu" näkyy rosterissa/kuormatulkinnassa automaattisesti. Ei muutosta VP-puolelle (paitsi halutessa "N ilmoittanut estyneensä" -pikatieto).

## Reunaehdot
- **Rules:** yksi muutos (anon `lasnaolijat` write, affectedKeys=tila). **Verifioi live** että PIN-käyttäjä voi merkitä oman läsnäolonsa eikä muuta aukene. Jos laajempi kirjoitus aukeaa → pysähdy.
- **GDPR Art. 9:** poissaolon **syy** (sairaus/loukkaantuminen) ei läsnäolo-dataan; vain tila. Sairaus-linja = terveys/ (erillinen).
- **Alaikäiset:** kirjoitus vain omaan läsnäoloon, tila-kenttä; **Topias = testi-OK.** Palauta testidata.
- **Demo:** `_isDemoUser`/`?demo=1` → ei Firestore-kirjoitusta, UI reagoi.

## EI tässä
- Terveys-syy / sairauspoissaolo (→ terveys/, physio-vaihe).
- Ilmoitus valmentajalle peruutuksesta = **c.4**.

## DoD
1. **Rules:** anon `lasnaolijat` create/update sallii vain `tila`(+paivitetty/rooli); ei syytä; muu ennallaan; verifioitu ettei laajene.
2. Pelaaja + vanhempi voivat merkitä tulevaan tapahtumaan **Tulossa/Estynyt** → `lasnaolijat.tila`.
3. Merkintä näkyy VP/valmentaja-läsnäolossa + P6a-tulkinnassa (lukee jo).
4. GDPR: ei syytä/terveysdataa läsnäoloon; demo-polku toimii; read-back oikein.
5. **Verifioi live (Topias PIN):** merkitse Estynyt tulevaan tapahtumaan → tallentuu `lasnaolijat.tila='peruttu'`, näkyy VP:llä; ei Rules-virheitä; palauta testidata. Pieni PR; linkkaa design-totuus + P7-c.3.
