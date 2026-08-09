# CODE BRIEF — E2.3.1 · Korjaa komposiittitestille (kuljetus_laukaus)

**Tyyppi:** esityskerros + kirjoituspolku (E2.3:n jatko). **Kohde:** `TalentMaster_VP_v25.html`. **Oma PR.**

**Design-totuus:** `docs/E2_design_kartta.html` §2B (Korjaa) + E2.3-dialogin komposiittihaara (nyt read-only). Tämä brief laajentaa sen editoivaksi.

**Periaate:** komposiittitestin korjaus on sama polku kuin skalaarilla — vain syöttö on koostettu. **Samat kaksi invarianttia kuin E2.3:ssa** (kirjoita lähdedokkiin paikallaan; recompute vain suojatun `_vpMittausRebuildKirjoita`n kautta).

---

## KOHDE / TAVOITETILA

E2.3 jätti komposiittitestit (kuljetus_laukaus) **read-only + "korjaa Pikakirjauksella" -vihjeeksi**. E2.3.1 tekee niistä korjattavia: dialogi näyttää koostetun tuloksen osat (**raaka**, **ennenaikaiset**, **rangaistukset[]**) esitäytettynä, laskee **netto-esikatselun** livenä, ja tallennus kirjoittaa **komposiittiobjektin** lähdedokkiin. Rebuild laskee netton kanonisesti (primitiivi).

### Komposiitin muoto ja netto (vahvistettu koodista)

Stored-arvo: `{ raaka:Number, rangaistukset:[Number], ennenaikaiset:Number }`.
Netto (primitiivin `_kuljetusLaukausTulos`, `lib/tm_pikakentat.js`): `max(0, raaka + ennenaikaiset*10 − Σ rangaistukset)` (2 desimaalia). **Älä muuta primitiiviä** — replikoi sama kaava VAIN dialogin esikatseluun; rebuild on totuuslähde.

---

## VAIHE E2.3.1 — työ (oma PR)

### 1. Dialogin komposiittihaara → editoiva (korvaa read-only)

`_vpMittausKorjaaDialog`n komposiittihaara:
- Kentät esitäytettynä stored-komposiitista: **Raaka** (number, step any), **Ennenaikaiset** (int ≥0), **Rangaistukset** (pilkuin eroteltu numerolista, esim. `5, 10` — tai +/- -lista; pilkkulista riittää MVP:hen, parsi `String→[Number]` tyhjät pois).
- **Netto-esikatselu** päivittyy livenä (input-tapahtumat): `netto = max(0, raaka + ennenaikaiset*10 − Σrangaistukset)`, 2 desimaalia. Näytä "Netto: X s".
- Lukittu testipäivä (🔒), nimi/yksikkö kuten skalaarilla. Peruuta + Tallenna korjaus. Molemmat teemat.
- **Resolvoi koko komposiittiobjekti** `{raaka, rangaistukset, ennenaikaiset}` (ei skalaaria). Peruutus/virheellinen → null.

### 2. Tallennus — komposiittiobjekti lähdedokkiin

`_vpMittausKorjaa`ssa (tai jaetussa tallennuksessa): kun `_vpMittausOnkoKomposiitti(vanha)`, käytä dialogin palauttamaa **komposiittiobjektia** suoraan (älä aja `_vpMittausKorjaaArvo`n skalaari-logiikkaa):
```js
// komposiitti: säilytä muut mahdolliset kentät, päivitä osat
var uusiArvo = Object.assign({}, vanha, { raaka: k.raaka, rangaistukset: k.rangaistukset, ennenaikaiset: k.ennenaikaiset });
kentat['testit.' + avain] = uusiArvo;                    // INV1: lähdedokki paikallaan
kentat['korjattu.' + avain] = { kuka:_uid||null, milloin:new Date().toISOString() };
await pelRef.collection('testitulokset').doc(dokkiId).update(kentat);
// cache paikallisesti + await _vpMittausRebuildKirjoita(p) (INV2) + _vpMittausPaivitaNakyma(p)
```
`_vpMittausKorjaaArvo` päivitä: komposiitti **ei enää palauta null** silloin kun dialogi antaa komposiittiobjektin — tai (siistimpi) jätä `_vpMittausKorjaaArvo` skalaareille ja hoida komposiitti erikseen `_vpMittausKorjaa`ssa (dialogin resolvoiman objektin perusteella). Valitse selkein; älä riko skalaaripolkua.

### 3. Validointi

Raaka pakollinen (NaN → ei tallennusta, hillitty vihje). Ennenaikaiset/rangaistukset oletus 0/[] jos tyhjä. Negatiiviset rangaistukset ok (parsitaan), mutta netto ei mene alle 0 (max-suoja kaavassa).

**ÄLÄ:** muuta primitiiviä eikä netto-kaavaa siellä; luo uutta dokkia; ohita `_vpMittausRebuildKirjoita`; koske skalaarikorjauksen polkuun.

**Hyväksymiskriteeri (L3, elävä, Topias / sanktioitu testitietue):**
1. kuljetus_laukaus-rivin Korjaa avaa **editoivan** dialogin osat esitäytettynä + netto-esikatselu oikein.
2. Osien muutos → netto-esikatselu päivittyy kaavan mukaan.
3. Tallennus kirjoittaa **komposiittiobjektin** lähdedokkiin paikallaan (ei uutta dokkia, ei kaksoisriviä); `korjattu`-audit.
4. Rebuildin laskema netto (tk_kokonaistulos / tk_lajit) vastaa dialogin esikatselua; **H-H säilyy** (INV2).
5. Data palautetaan ennalleen.

---

## REUNAEHDOT & DoD

- Ei lib-muutosta → ei cache-bumppia. Oikeus `_vpVoiMuokata()`. Live vain sanktioituun testitietueeseen, palauta data. Design-tokenit, molemmat teemat.
- **DoD:** yksikkötesti netto-kaavalle (vastaa `_kuljetusLaukausTulos`ia: raaka + ennenaikaiset*10 − Σrangaistukset, max 0) + komposiitin rakennus dialogin syötteestä (puhtaana funktiona); koko suite vihreä; eslint puhdas; pieni PR; kuvaus linkkaa tähän briefiin. **Claude verifioi live.**

## Sarjan tila
- E2.1 ✓ · E2.2 ✓ · E2.2.1 ✓ · E2.3 ✓ (skalaarikorjaus, live-verifioitu).
- **E2.3.1** — komposiittikorjaus · *tämä.*
- **E1** — Testit-hubin tapahtumatason bulk-siivous · erillinen (design-kartta ensin).
