# Brief · ADAR-pikakortti, vaihe 1: tietosuoja

> Claude 28.9.2026 · Teron päätös: **kuva pois ja tietosuoja ensin**, muut korjaukset tämän jälkeen. Pohjana analyysi `ANALYYSI_ADAR_PIKAKORTTI_2026-09.md` (A1–A3). Luettu main: ADAR_Pikakortti, Pelaaja_v7 r.6014–6190, Vanhempi_v2 r.1690, `functions/index.js` aiProxy r.1728–, `storage.rules` r.34–45 ja `functions/gdpr_locator.js`.
>
> Tämä PR ei muuta ulkoasua. Uusi ulkoasu tulee vaiheissa 2–3 mockupin pohjalta. Tee siksi vain tietosuojan edellyttämät muutokset ja poista kuvatoiminto kokonaan.

## 1 · Kuvatoiminto pois (A2 + A3)

**Miksi:** "Lisää kuva havaintoon" tallentaa kuvan alaikäisestä Storageen ja lähettää sen aiProxyn kautta **OpenAI gpt-4o:lle (Yhdysvallat)**. Tälle siirrolle ei ole suostumusmekanismia, eikä se kulje EU-reitin kautta.

**Client (`TalentMaster_ADAR_Pikakortti.html`)**
- Poista "Lisää kuva havaintoon" -painike ja esikatselu kaikilta tasoilta.
- Poista funktiot `_kuvaValittu`, `_kuvaPoista`, `_kuvaNaytaPreview`, `_skaalaaKuva`, `_lataaKuvaStorageen` ja `_pyydaAINarratiivi` sekä AI-narratiivin UI-lohkot (`*-ai-lataa`, `*-ai-narr`).
- Poista kuvan luonnostallennus IndexedDB:hen (`_luonnosTallennaKuva`/`HaeKuva`/`PoistaKuva`). Poiston lisäksi **tyhjennä kyseinen object store** ensimmäisellä avauksella, koska laitteille voi olla jäänyt kuvia lapsista.
- `saveCard` ei enää kirjoita `media`-kenttää.
- Nosta `sw_adar.js`:n välimuistiversio. Muuten vanha, kuvallinen HTML voi palvella yhä välimuistista.

**Palvelin (`functions/index.js`)**
- `adar_vision_narratiivi` palauttaa heti vastauksen `410 { code: 'POISTETTU' }` ennen kuin kuvaa luetaan tai lähetetään eteenpäin. Tämä torjuu myös vanhat välimuistissa olevat clientit.
- Poista käyttäjän `ohje`-kentän käyttö kokonaan. Jos toiminto joskus palaa, ohje asetetaan palvelimella.
- ⚠ **Deploy Functions epäonnistuu yhä IAM-oikeuden takia.** Palvelinpuolen esto tulee voimaan vasta, kun Tero on lisännyt CI-palvelutilille roolin Service Account User. Siihen asti client-poisto ja Storage-esto (alla) riittävät uusille kirjoituksille.

**Storage (`storage.rules`)**
- `seurat/{sid}/havainnot/{hid}/{file=**}`:
  - `write`: vain SA (`delete` sallitaan SA:lle siivousta varten)
  - `read`: SA tai oman seuran johto (`vp`/`urheilutoimenjohtaja`), inventaariota varten
  - Deploy tapahtuu `deploy-rules`-workflow'lla (storage on mukana).

**Vartijat (testit)**
- Pikakortin lähdekoodissa ei ole merkkijonoja `aiProxy`, `adar_vision`, `storage()` eikä `put(`.
- aiProxy palauttaa 410 tehtävälle `adar_vision_narratiivi` (yksikkötesti handlerille).
- Storage Rules: valmentajan kirjoitus polkuun havainnot/* hylätään.

## 2 · Jo tallennettu data (inventaario, päätös Terolle)

Tee `scripts/diag_adar_media.js`. Oletuksena se ajetaan kuivana, eikä se kirjoita tai poista mitään.

- **Firestore:** kaikki `havainnot`-dokumentit, joissa on `media[]` tai `ai_narratiivi`, laskettuna per seura. Tulosta vain id:t, ei sisältöä.
- **Storage:** kaikki objektit prefiksillä `seurat/*/havainnot/`, listattuna suoraan bucketista.
  - ⚠ Kuvat tallennettiin polkuun `havainnot/pre_<aikaleima>/…`, ei havainnon id:n alle. Siksi `gdpr_locator.js`:n prefiksihaku (`havainnot/{h.id}/`) ei löydä niitä. Myös orvot kuvat, joissa lataus onnistui mutta havainnon tallennus epäonnistui, löytyvät vain listaamalla.
- **`--poista`:** poistaa Storage-objektit ja kentät `media`, `ai_narratiivi`, `ai_malli`, `ai_analysoitu` ja `ai_luottamus`. Aja vasta, kun Tero on päättänyt poistosta.
- **`gdpr_locator.js`:** korjaa niin, että se lukee myös `media[].storage_url`-polut. Muuten GDPR-poistopyyntö jättää kuvat Storageen.

**Suositus Terolle:** poista kaikki (kuvat ja AI-tekstit). Kuville ei ole kerätty suostumusta, eikä toiminto enää ole käytössä. Tarkista OpenAI:n API-ehdoista, kuinka kauan palvelu säilyttää lähetettyjä pyyntöjä. En ole lakimies, joten jos seuroille pitää ilmoittaa asiasta, kysy se tietosuojavastaavalta.

## 3 · Näkyvyys: muistiinpano ei mene lapselle ilman valintaa (A1)

**Nykytila:**
- `saveCard` tallentaa aina `tila:'valmis', nakyvyys:'pelaaja'`.
- Pelaaja_v7 näyttää jokaisen `tila=='valmis'` -havainnon, jossa on narratiivi, eikä se lue `nakyvyys`-kenttää.
- Taso 1:n "Valmentajan muistiinpano" menee siis 8–12-vuotiaalle sellaisenaan.

**Uusi toiminta (sama kuin mockupissa):**
- Tallennukseen tulee yksi kytkin **"Näytä pelaajalle"**.
- Oletus: **pois** Taso 1:llä (U8–12) ja **päällä** Tasoilla 2–3. Ikä johdetaan pelaajasta.
- Kun kytkin on pois, kentän otsikko on "Muistiinpano · vain valmentajille". Kun se on päällä, otsikko on "Viesti pelaajalle", ja alla lukee "Pelaaja näkee tämän tekstin".
- Kytkimen tila ei jää muistiin havaintojen välillä. Jokainen havainto valitaan erikseen.
- Tallennus: `nakyvyys: 'pelaaja' | 'valmentajat'`.

Toast-tekstit:
- 'valmentajat' → "✓ Tallennettu · vain valmentajille"
- 'pelaaja' → "✓ Tallennettu · pelaaja näkee viestin"

**Pelaaja_v7:**
- Kysely on muotoa `.where('tila','==','valmis').where('nakyvyys','==','pelaaja')`. Kaksi yhtäsuuruusehtoa toimii ilman komposiitti-indeksiä, mutta varmista se.
- Client-suodatin pidetään varalla.

**Rules (`havainnot` read):** anonyymi pelaajaistunto saa lukea vain pelaajalle tarkoitetut havainnot. Kyselyn täytyy sisältää `nakyvyys`-ehto, koska Rules eivät toimi suodattimina.

```
allow read: if onSuperAdmin()
            || onOmaSeura(seuraId)
            || (onAnonymous() && resource.data.get('nakyvyys', '') == 'pelaaja')
            || (onLapsenHuoltaja(seuraId, pelaajaId) && resource.data.get('nakyvyys', '') == 'pelaaja');
```

Huoltajan haara rajataan samalla tavalla.

**Anonyymin update-oikeus (löytyi #648:n tarkistuksessa):** nykyinen `havainnot`-update sallii anonyymille pelaajaistunnolle *minkä tahansa* kentän muutoksen, vaikka tarve on vain lukukuittaus. Rajaa anonyymin haara:

```
|| (onAnonymous() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['pelaaja_lukenut'])
                  && resource.data.get('nakyvyys', '') == 'pelaaja')
```

Rules-testi: anonyymi voi merkitä luetuksi, mutta ei voi muuttaa `pisteet`-, `narratiivi`-, `tila`- eikä `nakyvyys`-kenttää. Vanhempi_v2 lukee vain `tyyppi=='valmentaja_viesti'`. Tarkista, että nämä viestit tallennetaan `nakyvyys:'pelaaja'`, tai lisää kenttä niiden tallennukseen samassa PR:ssä.

**Migraatio (ennen Rules-deployta):** `scripts/migroi_havainto_nakyvyys.js` (kuiva ajo oletuksena, `--kirjoita`):
- Havainnoille, joilta `nakyvyys` puuttuu, asetetaan `'pelaaja'`. Nämä on jo näytetty, joten käytös ei muutu.
- Muut arvot (esim. pikakirjauksen `'vp'`) pysyvät ennallaan. Pelaaja ei näe niitä nytkään, koska niiden tila on `'luonnos'`.
- Järjestys: 1) migraatio kuivana ja oikeana → 2) PR merge → 3) Rules deploy. Muuten pelaajien vanhat havainnot katoavat näkyvistä hetkeksi.

**Masterin ja VP:n listat:** havainnon rivillä näkyy pieni merkintä "vain valmentajille", kun `nakyvyys=='valmentajat'`.

**Rules-testit:**
- Anonyymi lukee `'pelaaja'` → sallittu.
- Anonyymi lukee `'valmentajat'` tai kentän puuttuessa → estetty.
- Huoltaja: samat tapaukset.
- Valmentaja lukee kaikki.

## 4 · Rajaus

- Älä muuta ADAR-ulkoasua, pisteytystä tai tasoja. Ne tehdään vaiheissa 2–3.
- `onAnonymous()`-luku ei ole vieläkään rajattu omaan pelaajaan. Se on laajempi, erillinen korjaus, joka kirjataan avoimeksi, eikä sitä tehdä tässä.
- Äänitranskriptio (`voice_transcribe` → Whisper) käyttää samaa OpenAI-avainta. Kirjaa se avoimeksi tietosuojakohdaksi (EU-reitti), mutta älä muuta sitä tässä PR:ssä.

## 5 · Hyväksyntä

- Kuvapainiketta ei ole missään. Vanha välimuistiversio saa palvelimelta 410-vastauksen (IAM-korjauksen jälkeen).
- Diagnoosi on ajettu kuivana ja luvut raportoitu Terolle. Poisto odottaa päätöstä.
- Testi seuratunnuksella ja Topiaksella:
  - Taso 1 -muistiinpano ei näy Pelaaja_v7:ssä.
  - Kun kytkin on päällä, viesti näkyy.
  - Vanhat havainnot näkyvät kuten ennen.

## Liite · kuvatoiminnon suunnitelma (jos se halutaan takaisin)

Kuvaa ei palauteta sellaisenaan. Ensin määritellään, mihin sitä tarvitaan:

1. **Jos tarkoitus on näyttää tilanne kentällä:** korvataan kuva kenttätyökalun kaltaisella napautuksella kenttäpohjaan (sijainti, suunta). Henkilötietoa ei synny, ja tieto on analysoitavissa.
2. **Jos kuva on välttämätön** (esim. videoklipin kohta), edellytykset ovat:
   - huoltajan suostumus pelaajakohtaisesti (`suostumukset.kuvat` + aikaleima + kuka kirjasi) ja tarkistus ennen latausta
   - tallennus EU:ssa polkuun `…/pelaajat/{pid}/havainnot/{havaintoId}/`, jotta GDPR-poisto löytää kuvan
   - näkyvyys vain valmentajille
   - säilytysaika (esim. 12 kk) ja automaattinen poisto
3. **AI-analyysi kuvista:** vain EU-reitin kautta (Bedrock EU) ja vain, jos suostumus kattaa sen. Tulos on aina luonnos, jonka valmentaja hyväksyy, eikä sitä koskaan näytetä suoraan pelaajalle.

Suositus: vaihtoehto 1. Se on myös nopeampi kentällä kuin kuvan ottaminen.
