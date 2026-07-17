# CODE — P6a: Viikko-välilehti — valmentajan kevyt viikkosyöttö + IDP-kytkös

**Tyyppi:** Toiminnallisuus (näyttö + kirjoitus), valmentajan näkymä. **Kohde:** `TalentMaster_VP_v25.html` — pelaajakortin **Viikko-välilehti `_jspTab4`** (nyt placeholder: "…tulossa (Vaihe D)").
**Design-totuus:** hyväksytty `idp_viikko_p6a.html`. Tiekartta **P6a** (vaiheistus: P6a valmentaja → P6b pelaaja-appi/pulssi → P6c vanhempi + terveys/). Ohje on itsenäinen.
**Iso kuva:** Viikko ei ole irrallinen syöttökalenteri vaan **IDP:n toteutuskerros** (kausitavoite → välitavoite → jaksofokus → **sessiot**). Jokainen sessio kertyy jaksofokuksen tavoitteelle ja koostuu IDP-katselmukseen. Ratkaisee "kalenteri on työläs" antamalla **kevyen esitäytetyn viikko-gridin**.

## Miksi

Viikko-välilehti on tyhjä placeholder. Käyttäjät kokevat kalenterin työlääksi (tapahtumat yksitellen). P6a antaa **valmentajalle** nopean tavan tallentaa viikon harjoitukset: koko viikko yhdellä ruudulla, **esitäytettynä jaksofokuksesta + joukkueen toistuvasta aikataulusta**, käyttäjä vain napauttaa säädöt. Sessiot tagataan jaksofokuksen tavoitteisiin (A/B/C) → tavoitejakautuma + kuorma koostuvat IDP-kortille automaattisesti. Talenttipelaajat ensin, mutta sama näkymä kaikille.

## Verifioitu datapohja (rakenna tälle — älä keksi uutta)

- **Päiväkirjaukset LITTEÄ:** `seurat/{sid}/pelaajat/{pid}/kirjaukset/{pvm}` — yksi doc/päivä, sisältää jo `rpe · fiilinki · kesto_min · konteksti · lahde`. **Säilytä litteänä.**
- **Kirjoitusoikeus on jo Rulesissa:** VP + talenttivalmentaja (oma seura) saavat kirjoittaa `kirjaukset`; valmentaja/talenttivalmentaja saa päivittää `kalenteri/{tapahtumaId}`; valmentaja/johto saa merkitä `lasnaolijat` kenelle tahansa. **→ P6a ei todennäköisesti tarvitse Rules-muutosta** (verifioi).
- **Läsnäolo:** `seurat/{sid}/kalenteri/{sessioId}/lasnaolijat/{pid}.tila` — laajenna enumia, älä keksi uutta polkua.
- **Joukkueen toistuva aikataulu:** kalenteritapahtumien `toistuvuus:{tyyppi,paiva,paattyy}` + `TM_KALENTERI.tmToistuvuusPaiva` → esitäytön lähde.
- **Jaksofokuksen tavoitteet (A/B/C):** P4b `jaksofokus.tavoite_tarkenteet` (pääfokus + linkitetyt, `konsepti_avain`) — sessio-tagit sidotaan näihin.
- **terveys/:** GDPR Art. 9 -alikokoelma (vahvistettu koodissa). Loukkaantumis-/sairaussyyt sinne, EI kirjauksiin.

## Mitä tehdään

### 1. Viikko-grid (`_jspTab4` — korvaa placeholder)
Renderöi nykyisen jaksofokuksen viikko 7 rivinä (Ma–Su). Kukin rivi: **Päivä · pvm** | **Fokus · kesto · tavoitetagi** | **RPE** | **Läsnä**.
- **Fokus:** napautettava siru; esitäytössä ehdotus jaksofokuksesta (haalea = vahvistamaton). Tavoitetagi **A/B/C** = jaksofokuksen tavoite (P4b `tavoite_tarkenteet`-avain), värikoodattu (A teal · B amber · C blue).
- **Kesto:** minuutteina (kalenteritapahtumasta → oletus lajin mukaan jos puuttuu). Tarvitaan sRPE:hen.
- **RPE:** pelaajan kirjaama (📱-merkki kun `lahde:'pelaaja'`) tai valmentajan arvio; emoji + arvo 1–10.
- **Läsnä:** napautettava tila-enum: `✓ paikalla · ½ osittain · – ei tietoa · 🌙 vahvistettu lepo · 🩹 poissa (terveyssyy)`. Kirjoittaa `lasnaolijat.tila`.

### 2. Esitäyttö "✨ Täytä viikko"
Yksi nappi: täytä viikko **jaksofokuksesta + joukkueen toistuvasta aikataulusta** (`toistuvuus`). Ehdota fokus + tavoitetagi + oletuskesto per treenipäivä; lepopäivät merkitään. Käyttäjä vahvistaa/säätää. **Ehdotus, ei pakotus** — rivit jäävät "vahvistamaton" kunnes napautetaan.

### 3. Kirjoitusmalli (additiivinen, ei migraatiota)
- Kaksoissessiot: lisää **`sessiot:[]`-taulukko** `kirjaukset/{pvm}`-dokin sisään (EI nested-alikokoelmaa). Sessio: `{ fokus_nimi, konsepti_avain, tavoite_tag, kesto_min, rpe, konteksti, lahde }`. Yksi sessio/pv → voi kirjata myös suoraan päivätason kenttiin (backward-compat nykyisen `rpe/kesto_min` kanssa).
- **sRPE = rpe × kesto_min** (AU) — laske, älä tallenna erikseen (johdettu).
- **Audit (alaikäissuoja):** `createdBy` / `editedBy` (uid) + aikaleima jokaiseen kirjoitukseen. Muokkaus jää näkyviin (✏️).
- Kaikki `kirjaukset`-alikentät → coach-kirjoitusoikeus jo olemassa (top-level `kirjaukset` sallittu) → **ei Rules-muutosta** (verifioi affectedKeys).

### 4. Tavoitejakautuma (sessiot → IDP-kortti)
Kortti jaksofokuksen tavoitteista (A/B/C): montako sessiota kullekin tavoitteelle jakson aikana (esim. "8/12 sessiota"), edistymäpalkki + %, "N tällä viikolla". Aggregointi voi hyödyntää olemassa olevaa `_vpSulkuSessiot`/`kooste`-logiikkaa. Näytä seuraava IDP-katselmus + "koostuu automaattisesti".

### 5. Kuormajakauma + §28 (suuntaa-antava)
sRPE-palkit Ma–Su (suunniteltu = katkoviiva, toteutunut = täysi). Viikkokuorma AU + **ACWR suuntaa-antavana** (merkitse "ei absoluuttinen totuus"). §28: kasvutahti + kuormakatto-status. **PHV-kuormaehdotus:** jos kasvutahti > kynnys → **ehdota** keventämistä (napit "✓ Kevennä esitäyttöä" / "Pidä ennallaan") — **valmentaja päättää, ei automaattista rajoitusta.**

### 6. Pelaajan puoli = vain viittaus (ei P6a:ssa)
Näytä kompakti "→ Pelaajalle viikkopulssi (Pelaaja-appi, P6b)" -esikatselu; älä toteuta pulssia/reflektiota tässä (ne ovat `Pelaaja_v7` / P6b).

## Reunaehdot
- **GDPR Art. 9 (ehdoton):** loukkaantumis-/sairaus**syyt** → `terveys/`-alikokoelma; viikko-gridissä/kirjauksissa **vain paljas 🩹-lippu** + linkki Terveys-välilehteen. Ei diagnoosi-/syytekstiä `kirjaukset`- tai `lasnaolijat`-dataan. Läsnäolon TILA (poissa) on ok; SYY ei.
- **"Mikään ei ole pakotettua":** kuorma/PHV/esitäyttö = ehdotuksia; ihminen vahvistaa. Ei auto-kuormakattoa, ei pakotettuja kenttiä (puuttuva = pehmeä vihje).
- **Rules:** todennäköisesti **ei muutosta** (coach-kirjoitus kirjaukset/kalenteri/lasnaolijat jo sallittu; uudet kentät ovat nested sallittujen top-level-avainten alla). **Jos jokin write kaatuu Rulesiin, pysähdy ja raportoi — älä laajenna Rulesia ilman erillistä hyväksyntää.** P6c (vanhempi kirjoittaa) + terveys/-kirjoitus ovat erikseen.
- **Additiivinen / ei migraatiota:** `kirjaukset/{pvm}` säilyy litteänä; `sessiot:[]` + audit-kentät additiivisia. Vanha data (pelkkä `rpe/fiilinki`) toimii sellaisenaan.
- **Alaikäiset read-only** (Eino·Leo·Emil): P6a kirjoittaa valmennuspuolen kautta valtuutetusti; **Topias = testi-OK** (kirjoitus). Palauta testidata jälkeen.
- **Brändi:** design-totuus `idp_viikko_p6a.html` — yhtenäinen ramppi (eyebrow 10px · serif 20px · mono-meta · roolisävyt · laatikot), molemmat teemat, emoji semanttisina ikoneina. Sama ilme kuin Aloitus/Kehitys.
- **Mobiili §6:** grid mahtuu kapealla (sarakkeet tiivistyvät).
- **Cache-bump:** vain jos `lib/tm_kalenteri.js`-muutos; muuten vain `TalentMaster_VP_v25.html`.

## EI tässä
- **Pelaaja-appi:** viikkopulssi + mikroreflektio + oma viikkosyöttö = **P6b** (`Pelaaja_v7`).
- **Vanhempi-puolesta-kirjoitus + terveys/-integraatio + PHV-automaattinen ilmoitus = P6c** (Rules-työ).
- **konteksti-tagien** (HPP/koulu/oma) täysi käyttö kokonaiskuormaan = myöhempi (kenttä varataan, ei pakollinen).

## DoD
1. Viikko-välilehti (`_jspTab4`) näyttää nykyisen jaksofokuksen viikon 7-rivisenä gridinä (fokus+tavoitetagi · kesto · RPE · läsnä); ei enää placeholder.
2. **Esitäyttö** täyttää viikon jaksofokuksesta + joukkueen `toistuvuus`-aikataulusta ehdotuksina; käyttäjä vahvistaa/säätää.
3. Kirjoitus additiivinen `kirjaukset/{pvm}` (litteä + `sessiot:[]`) + `lasnaolijat.tila`; sRPE = rpe×kesto laskettuna; audit createdBy/editedBy + aikaleima. **Ei migraatiota, ei Rules-muutosta** (verifioitu; jos ei → pysähdy).
4. **Tavoitejakautuma** ryhmittää sessiot jaksofokuksen A/B/C-tavoitteisiin (P4b `tavoite_tarkenteet`-avaimet) + edistymä-%; linkki IDP-katselmukseen.
5. Kuormajakauma sRPE:llä (suunniteltu vs toteutunut) + ACWR suuntaa-antavana + §28 kuormaehdotus **valmentajan päätettäväksi** (ei auto-pakotus).
6. **GDPR:** terveyssyyt eivät esiinny `kirjaukset`/`lasnaolijat`-datassa; gridissä vain 🩹-lippu + linkki Terveys-välilehteen.
7. Pelaajan viikkopulssi vain kompaktina viittauksena (ei toteutettu — P6b).
8. Molemmat teemat + mobiili; 0 konsolivirhettä. **Verifioi live (Topias, sanktioitu):** esitäyttö → säädä RPE/läsnä → kirjoitus tallentuu `kirjaukset`/`lasnaolijat`iin oikein; tavoitejakautuma + kuorma päivittyvät; ei terveysdataa lokissa. Palauta Topias-testidata. **Verifioi ennen mergeä.**
9. Keskikokoinen–iso PR (voi jakaa loogisiin osiin: grid+esitäyttö · kirjoitus+audit · tavoitejakautuma · kuorma); kuvaus linkkaa `idp_viikko_p6a.html` + tiekartta P6a.
