# CODE BRIEF — E2 · Mittaus-välilehti: Korjaa · Poista · Palauta

**Tyyppi:** esityskerros + kirjoituspolku (pelaajakortin Mittaus-välilehti). **Kohteet:** `TalentMaster_VP_v25.html` (pääpinta), `lib/tm_pikakirjaus.js` (Korjaa-esitäyttö). **Kolme pinottua PR:ää — E2.1 → E2.2 → E2.3, tässä järjestyksessä, kukin oma PR ja verifioitu ennen seuraavaa.**

**Design-totuus:**
- `docs/E2_design_kartta.html` — visuaalinen totuus (repossa; sama kuin artefakti `e2-mittaus-design-kartta`). Brändilukko: carbon/bone/teal, Cormorant/DM Sans/DM Mono, terävät kulmat, hiusraja-borderit, tumma + vaalea.
- Tämä brief tiivistää kartan itsenäisesti — Code voi aloittaa avaamatta karttaa.

**Rakentuu valmiin perustan päälle:** `tmRakennaPikakentatArkistosta(pelaajaDoc, merkinnat, optDeps)` on **jo livenä** (`lib/tm_pikakentat.js`, P-EDIT.0, PR #292). Se palauttaa `{ upd, poistetut }`. E2 **ei kirjoita laskentaa uudelleen** — se vain (1) rakentaa `merkinnat`-listan, (2) kutsuu primitiiviä, (3) kirjoittaa tuloksen Firestoreen, (4) renderöi listan. Katso primitiivin sopimus: `docs/P-EDIT.0_CODE_BRIEF.md`.

**Periaate:** mitään ei pakoteta, asiantuntija päättää. Poisto ja korjaus ovat **aina peruttavissa** (pehmeä mitätöinti + Palauta). Varmistus ennen poistoa. Ei kovaa poistoa missään vaiheessa.

---

## KOHDE / TAVOITETILA

Pelaajakortin **Mittaus**-välilehdelle (sisältökontti `_jspTab1`, avaaja `_avaaPerPelaajaPikakatsaus` tiedostossa `TalentMaster_VP_v25.html`) tulee **muokattava mittauslista** nykyisen yhteenveto-osan (tasotiilet, "Fyysinen · mitattu") **alle**. Jokainen yksittäinen mittaustulos saa **Korjaa** ja **Poista**; mitätöidyt saa **Palauta**. Kaikki kolme ajavat saman rebuild-primitiivin ja kirjoittavat pikakentät + Kehityskaaren uudelleen. Yksi määränpää: korjaat ja poistat siellä missä pelaajaa jo katsot — ei erillistä editoria.

### Datamalli — lue tämä ensin (kartan "kaksi arkistoa" = yksi kokoelma)

Molemmat "arkistot" ovat **sama Firestore-alikokoelma** `seurat/{sid}/pelaajat/{pid}/testitulokset`:
- **Pikakirjaus-dokit:** id `{pvm}_pikakirjaus`, `lahde:'pikakirjaus'`, `protokolla:'pikakirjaus'` (`lib/tm_pikakirjaus.js`, §22 Moodi B, upsert).
- **Tapahtuma-/tuontidokit:** muut dokit samassa kokoelmassa (`protokolla`/`lahde` = tapahtuma tai import).

**Jokainen dokki = yksi testauspäivä** ja sisältää `testit`-objektin, jossa voi olla **monta testiavainta** (esim. `lin_30m`, `hyppy_cj`, …). Siksi:

> **Yksittäisen mittauksen poisto/korjaus on testi-AVAIMEN muokkausta dokin sisällä — ei koko dokin poistoa.** Rivi kartalla = pari **(dokin id, testiavain)**. "Poista Nopeus 30 m" ei saa pyyhkiä saman dokin CMJ:tä.

`merkinnat`-lista jonka primitiivi ottaa on `[{ pvm, tulokset, mitatoitu? }]`, jossa `tulokset` = dokin `testit`-objekti. **E2 on se "kutsuja joka normalisoi arkistot yhdeksi listaksi"**, josta P-EDIT.0-brief puhuu: E2 laajentaa dokit, **karsii mitätöidyt avaimet pois `tulokset`ista**, ja antaa listan primitiiville. Primitiiviä **ei muuteta**.

---

## LÄPILEIKKAAVAT PERIAATTEET (joka vaihe noudattaa)

1. **Uudelleenkäytä, älä toista.** Laskenta = `tmRakennaPikakentatArkistosta` (P-EDIT.0). Korjaa-lomake = olemassa oleva `TM_PIKAKIRJAUS.avaa`-ruudukko. Testien nimet/yksiköt = `lib/tm_testikatalogi.js`. Firestore-kirjoituskuvio = sama kuin `_vpPikakirjaus`/pikakirjaus-libissä (`pelRef.set(upd,{merge:true})` + `FieldValue.delete()` poistetuille). **Älä rakenna uutta editoria, älä kopioi §26-laskentaa.**
2. **Pehmeä, peruttava, auditoitu.** Poisto = merkintä lähteeseen, ei tuhoa. Jokainen mitätöinti/palautus/korjaus tallentaa **kuka + milloin** (+ vapaaehtoinen syy). Palauta on aina saatavilla mitätöidyille.
3. **Yksi määränpää, monta sisääntuloa.** Muokkaus tapahtuu kortilla. Testit-hubin bulk-siivouslista on **erillinen myöhempi vaihe (E1), ei tässä.**
4. **Selkeys ennen tiheyttä.** Nykyinen yhteenveto (tasotiilet) säilyy ennallaan ja pysyy ylhäällä; muokattava lista tulee sen alle. Mitätöidyt ovat oletuksena kutistetun "▾ Mitätöidyt (N)" -osan takana.
5. **Napit, ei seiniä.** Per rivi enintään: Korjaa + Poista (aktiiviset) tai Palauta (mitätöidyt). Ei muuta.

---

## E2.1 — Mittauslista (luku + renderöinti, display-pariteetti) · oma PR · **TEE ENSIN**

Näytä muokattava lista; **ei vielä mutaatioita** (napit renderöidään, mutta Korjaa/Poista/Palauta kytketään E2.2/E2.3:ssa — E2.1:ssä ne saavat olla no-op/"tulossa"-toast tai disabled, valitse siistein).

**Työ**
- **Merkinnät-rakentaja (uusi apufunktio, esim. `_vpMittausMerkinnat(pel)`):** lue jo haettu `testitulokset`-data (Mittaus-välilehti hakee sen jo asynkronisesti sparklineja varten — `db…doc(p.id).collection('testitulokset').get()`, VP_v25 ~rivi 9718; **käytä sama luku uudelleen**, älä lisää toista hakua). Laajenna jokainen dokki riveiksi: yksi rivi per `testit`-avain → `{ dokkiId, pvm: doc.testauspvm, avain, arvo, lahde: (doc.lahde||doc.protokolla), mitatoituMeta }`.
- **Ryhmittely & render:** ryhmittele pvm + lähde mukaan laskevaan järjestykseen (uusin ensin), lähde-lipuke "Pikakirjaus" / "Testitapahtuma". Rivillä: testin nimi (`tm_testikatalogi.js`), arvo + yksikkö, ja **Korjaa** + **Poista**. Renderöi nykyisen yhteenveto-osan **alle** samaan `_jspTab1`-konttiin (design §1).
- **Mitätöidyt-osa:** kutistettu "▾ Mitätöidyt (N)"; rivit himmennettynä + yliviivattu arvo + audit-teksti ("mitätöity {pvm} · {kuka} · {syy}") ja **Palauta**-nappi (E2.1: näkyy, kytketään E2.2:ssa).
- **Tyhjä tila:** jos ei mittauksia, hillitty vihje ("Ei kirjattuja mittauksia — lisää Pikakirjauksella").

**ÄLÄ:** kirjoita Firestoreen; muuta yhteenveto-osaa/tasotiiliä; koske Kehityskaareen; lisää toista `testitulokset`-hakua.

**Hyväksymiskriteeri:** Mittaus-välilehti näyttää jokaisen testituloksen omana rivinään oikein ryhmiteltynä (pvm + lähde), yksiköt ja nimet oikein `tm_testikatalogi.js`:stä; mitätöidyt omassa kutistetussa osassaan; molemmat teemat renderöityvät design-kartan mukaan; ei yhtään Firestore-kirjoitusta.

---

## E2.2 — Poista + Palauta (pehmeä mitätöinti → rebuild) · oma PR

Tässä on E2:n **riskisin logiikka** (kirjoituspolku) — eristetty omaan PR:äänsä.

**Työ**
- **Poista (design §2A):** varmistusdialogi ("Poistetaanko mittaus? … Voit palauttaa sen myöhemmin."). Vahvistus →
  1. **Merkitse lähteeseen mitätöidyksi per avain:** `pelRef.collection('testitulokset').doc(dokkiId).set({ mitatoidut: { <avain>: { kuka:_uid, milloin:<ISO>, syy:<valinn.> } } }, { merge:true })`. (Uusi `mitatoidut`-map dokissa; ei poista `testit`-avainta → palautus on triviaali.)
  2. **Rakenna merkinnät uudelleen** kaikista `testitulokset`-dokeista `_vpMittausMerkinnat`illa **karsien `mitatoidut`-avaimet pois** kunkin dokin `tulokset`ista (täysin tyhjentynyt dokki → `tulokset:{}`, joka ei kontribuoi mitään).
  3. **Kutsu** `tmRakennaPikakentatArkistosta(pel, merkinnat)` → `{ upd, poistetut }`.
  4. **Kirjoita pelaajadokkiin:** `pelRef.set(upd, { merge:true })`; ja jokaiselle `poistetut`-kentälle `pelRef.update({ <kenttä>: firebase.firestore.FieldValue.delete() })` (kuvio on jo VP_v25:ssä, ~rivi 6981). Näin poistettu arvo **regressoi edelliseen** tai **häviää** — ei haamuarvoa.
  5. **Re-render** lista + yhteenveto-tiilet samoista tuoreista arvoista; siirrä rivi Mitätöidyt-osaan.
- **Palauta (design §2C):** varmistus ("Palautetaanko mittaus?"). Vahvistus → poista avain `mitatoidut`-mapista (`pelRef…doc(dokkiId).update({ ['mitatoidut.'+avain]: FieldValue.delete() })`) → **sama rebuild + kirjoitus + re-render**. Sama primitiivi, ei erillistä logiikkaa.

**ÄLÄ:** kovaa poistoa (älä `delete()` `testit`-avainta tai koko dokkia); §26-laskennan kopiointia; primitiivin vartijalogiikan koskemista.

**Hyväksymiskriteeri (L3, elävä):** viimeisimmän mittauksen poisto → tasotiili + Kehityskaari regressoivat edelliseen; ainoan mittauksen poisto → kenttä tyhjenee (ei jää vanhaa arvoa); Palauta tuo arvon takaisin ja tilat palautuvat identtisiksi poistoa edeltävään; audit (kuka/milloin) tallentuu; toisen saman dokin testin arvo **ei muutu** kun yksi poistetaan.

---

## E2.3 — Korjaa (Pikakirjaus-ruudukko esitäytettynä) · oma PR

**Työ**
- **Korjaa (design §2B):** avaa **olemassa oleva** `TM_PIKAKIRJAUS.avaa`-ruudukko (`lib/tm_pikakirjaus.js`) **esitäytettynä** korjattavan rivin arvo(i)lla, **testipäivä lukittuna** kyseiseen mittaukseen ja skooppi rajattuna kyseiseen testiin (tai sen dokin testeihin). Lisää lomake-libiin **valinnainen esitäyttö/lukko-optio** (esim. `TM_PIKAKIRJAUS.avaa(ctx, { esitaytto, lukkoPvm, vainPelaaja:pid })`) — **ei uutta editoria**.
- **Tallenna korjaus:** kirjoita korjattu arvo **saman lähdedokin** `testit[<avain>]`iin (`pelRef…doc(dokkiId).set({ testit:{ <avain>: <uusiarvo> }, korjattu:{ <avain>:{kuka,milloin} } }, {merge:true})`). Pikakirjaus-lib upsertaa jo `testitulokset`iin — hyödynnä sama polku; älä luo rinnakkaista tallennuslogiikkaa.
- **Sama rebuild + kirjoitus + re-render** kuin E2.2 (jaettu apufunktio E2.2:sta): rakenna merkinnät → `tmRakennaPikakentatArkistosta` → `pelRef.set(upd,{merge}) + FieldValue.delete(poistetut)` → päivitä lista + tiilet + Kehityskaari.

**ÄLÄ:** rakenna uutta korjaus-UI:ta; muuta pikakirjauksen normaalia (uusi tulos) -polkua; jätä päivää auki (lukko on korjauksen ydin — muuten syntyy uusi rivi eikä korjaus).

**Hyväksymiskriteeri (L3, elävä):** Korjaa avaa Pikakirjaus-ruudukon oikeilla arvoilla ja lukitulla päivällä; tallennus **korvaa** arvon samalla rivillä (ei synny uutta riviä); tasotiili + Kehityskaari päivittyvät korjattuun arvoon; audit tallentuu.

---

## YHTEINEN VIRTA (kaikki kolme johtaa samaan)

```
Korjaa / Poista / Palauta
  → päivitä lähdedokki (testitulokset): testit-arvo | mitatoidut-map
  → _vpMittausMerkinnat(pel)  (karsi mitatoidut → yksi merkinnat-lista)
  → tmRakennaPikakentatArkistosta(pel, merkinnat) → { upd, poistetut }
  → pelRef.set(upd,{merge:true}) + poistetut.forEach(FieldValue.delete())
  → re-render: mittauslista + yhteenvetotiilet + Kehityskaari
```
`upd` kirjoitetaan korvaten (esim. `hh_viimeisin` on map); `poistetut` → `FieldValue.delete()` (ei haamuarvoja).

---

## REUNAEHDOT (non-negotiable)

- **Oikeudet:** muokkaus vain **VP + oman joukkueen valmentaja**. Muut roolit näkevät listan read-only (ei Korjaa/Poista/Palauta-nappeja).
- **Suojatut alaikäiset read-only:** kirjoitukset vain **sanktioituun testitietueeseen** (käytä olemassa olevaa testipelaajaa; älä kirjoita oikean alaikäisen tietueeseen). GDPR: `mitatoidut`/`korjattu`-audit sisältää vain `uid` + aikaleima + valinnainen lyhyt syy — **ei terveys- tai vapaatekstiä muualle**.
- **Ei kovaa poistoa:** vain pehmeä mitätöinti (`mitatoidut`-map). `testit`-avainta tai dokkia ei poisteta koskaan.
- **Cache-versio:** `lib/tm_pikakirjaus.js` muuttuu (E2.3) → **bumppaa `?v=N`** kaikissa lataavissa tiedostoissa (esim. `TalentMaster_VP_v25.html`, `TalentMaster_Master_v16.html`, `TalentMaster_Excel_Tuonti.html`). VP_v25:n muutokset ovat samassa tiedostossa (ei erillistä bumppia).
- **Deploy-konventio:** PR → CI deployaa mergessä. Auth-seinän takana → live-verifiointi mergen jälkeen välittömästi (fix-forward jos tarve), koska muutos on eristetty ja peruttava.
- **Brändi:** `docs/E2_design_kartta.html`-tokenit, molemmat teemat, ei kovakoodattuja värejä/fontteja. Tumma = operatiivinen oletus, vaalea renderöityy siististi.

## DoD (joka vaihe)

1. Renderöityy **molemmissa teemoissa** (screenshot molemmista).
2. Ei sisältö-/datahukkaa; olemassa olevat funktiot uudelleenkäytetään (`tmRakennaPikakentatArkistosta`, `TM_PIKAKIRJAUS.avaa`, `tm_testikatalogi.js`, olemassa oleva `testitulokset`-luku).
3. Testit vihreinä; uusi kutsuja-/merkinnät-logiikka testattu (`tm_pikakentat.test.js` pysyy vihreänä).
4. Pieni, stackattu PR; kuvaus linkkaa `docs/E2_CODE_BRIEF.md` + `docs/E2_design_kartta.html`.
5. **Verifioi live ennen seuraavaa vaihetta.**

---

## Sarjan tila

- **P-EDIT.0** — rebuild-primitiivi `tmRakennaPikakentatArkistosta` · **merged (PR #292, livenä).**
- **E2.1** — Mittauslista (luku/render) · *avoin — tee ensin.*
- **E2.2** — Poista + Palauta (rebuild-kirjoitus) · odottaa E2.1:tä.
- **E2.3** — Korjaa (Pikakirjaus-esitäyttö) · odottaa E2.2:ta.
- **E1** — Testit-hubin tapahtumatason bulk-siivous · myöhempi, erillinen brief.
