# CODE — IDP: vahvistaja_rooli — resolvoi vahvistajan rooli (roolit mukaan vahvistamaan)

**Tyyppi:** Korjaus + pieni parannus, näyttö- + kirjoituskerros. **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — `_vpVahvistaSitoumus` (~rivi 4786) + rooliresolveri; näyttölabelin mappaus on jo olemassa (`_vpSitoumusHTML` ~rivi 4775).
**Tausta:** #207 (jakso-nollaus, Option A). Live-savu paljasti että `vahvistaja_rooli` jää **nulliksi**.

## Miksi

#207:ssä vahvistus kirjaa `vahvistaja_rooli`:n, ja näyttö mappaa sen: `'vp'` → "VP vahvisti", `'talenttivalmentaja'` → "talenttivalmentaja vahvisti", muu/null → "valmentaja vahvisti". **Live-savussa (Topias) `vahvistaja_rooli` kirjoittui nulliksi**, koska `_vpVahvistaSitoumus` lukee globaalin `_rooli`:n:

```
const _vahvRooli = (typeof _rooli !== 'undefined' && _rooli) ? _rooli : null;
```

`_rooli` on VP-sessiossa **`undefined`** (todennettu livenä: `typeof _rooli === 'undefined'`), joten rooli ei koskaan tallennu → label putoaa aina oletukseen "valmentaja vahvisti", eikä koskaan erottele VP:tä / talenttivalmentajaa. Roolidata on kuitenkin olemassa: `_valmentajat[]`-tietueissa on `rooli` (`valmentaja` / `talenttivalmentaja` / `vp` / `fysiikkavalmentaja` …), ja kirjautuneen käyttäjän `firebase.auth().currentUser.uid` on saatavilla. **Nostetaan roolit oikeasti mukaan vahvistamaan:** resolvoidaan vahvistavan käyttäjän rooli luotettavasti.

## Mitä tehdään

### 1. Rooliresolveri (`_vpVahvistajaRooli()`)
Lisää pieni best-effort-resolveri joka palauttaa vahvistavan käyttäjän roolin. **Prioriteettiketju** (ensimmäinen osuma voittaa):
1. **Token-claim:** jos `firebase.auth().currentUser` ID-tokenin custom-claimeissa on rooli (esim. `rooli` / `role` / `seuraRooli`), käytä sitä.
2. **`_valmentajat`-haku uid:llä:** etsi nykyinen käyttäjä `_valmentajat`-listasta auth-uid:n perusteella (kenttä joka kantaa uid:n — esim. `uid` / `authUid` / `valmentajaId`; käytä koodissa jo olevaa vastaavuutta) → palauta kyseisen valmentajan `rooli`.
3. **VP/johto-konteksti:** jos sessiolla on jo tiedossa VP/johto-rooli (olemassa oleva SA/VP-lippu tai seurahallinta-konteksti), palauta `'vp'`.
4. **Fallback:** `null` → näyttö pysyy nykyisessä oletuksessa "valmentaja vahvisti" (ei regressiota).

Käytä resolveria `_vpVahvistaSitoumus`:ssa `_rooli`-luvun tilalla:
```
const _vahvRooli = _vpVahvistajaRooli();   // token-claim → _valmentajat[uid].rooli → 'vp'-konteksti → null
```
Säilytä muu kirjoitus ennallaan: `vahvistettu_pvm`, `vahvistettu_jakso_alkoi`, `vahvistaja_rooli` `pelaaja_sitoumus`-olioon (**sama top-level-avain → ei Rules-muutosta**).

### 2. (Valinnainen, suositeltu) vahvistajan jäljitettävyys
Kirjaa myös **`vahvistaja_uid`** (`firebase.auth().currentUser.uid`) samaan `pelaaja_sitoumus`-olioon — kevyt audit "kuka vahvisti" (ei uutta taulua, ei Rules-muutosta, sama top-level-avain). Ei näytetä pelaajalle; VP-oversightia varten.

### 3. Näyttö (jo olemassa — varmista mappaus)
`_vpSitoumusHTML` mappaa jo: `'vp'` → "VP vahvisti", `'talenttivalmentaja'` → "talenttivalmentaja vahvisti", muu → "valmentaja vahvisti". **Ei muutosta tarvita** ellei halua lisätä `'fysiikkavalmentaja'`-tms. tapausta (silloin ne putoavat oletukseen "valmentaja vahvisti", mikä on ok). Pelaaja-apin vastaava teksti (`_p7…`) käyttää yleistä "valmentaja vahvisti" -muotoa — **säilytä** (pelaajalle ei tarvitse roolieroa); rooli on VP-puolen tieto.

## Reunaehdot
- **Ei Rules-muutosta / ei migraatiota / ei cache-bumppia:** `vahvistaja_rooli` (+ valinnainen `vahvistaja_uid`) ovat `pelaaja_sitoumus`-olion sisällä = jo sallittu top-level-avain (VP/valmentaja-kirjoitus, #207). Vanhat vahvistukset ilman roolia näyttävät edelleen oletuksen — ei taustaskriptiä.
- **Best-effort, ei blokkia:** jos rooli ei resolvoidu (null), vahvistus toimii ennallaan (label = "valmentaja vahvisti"). Resolveri **ei saa heittää** eikä estää vahvistusta.
- **Ei omistajuus-gating tässä:** tämä PR **kirjaa** vahvistajan roolin; se EI rajaa kuka saa vahvistaa (omistava valmentaja vs VP -gating on erillinen mahdollinen jatko, brief §Omistajuusmalli #207). Jos gating halutaan, se on oma tikettinsä.
- **PIN-pelaaja ei kosketa:** rooliresolveri ajetaan vain VP/valmentaja-vahvistuspolussa; pelaajan kirjoituspolku ennallaan (vahvistettu_pvm-suoja pysyy — #207-turvallisuus säilyy).
- **Demo-polku:** `_isDemoMode`/ei-seuraId → toimii kuten ennen (resolveri palauttaa parhaan arvauksen tai null; ei kaadu).
- **Alaikäiset read-only** (Eino·Leo·Emil): vahvistus on valmennuspuolen kirjoitus, ei kosketa pelaajan omia kenttiä. **Topias = testi-OK.**

## EI tässä
- Omistajuus-gating (kuka saa vahvistaa) — erillinen.
- Uusi rooli-datamalli / käyttäjä-rooli-hallinta — käytä olemassa olevaa (`_valmentajat.rooli` + claimit).
- Pelaaja-apin roolieroteltu teksti — pelaajalle riittää "valmentaja vahvisti".

## DoD
1. `_vpVahvistajaRooli()` resolvoi vahvistavan käyttäjän roolin prioriteettiketjulla (claim → `_valmentajat[uid].rooli` → VP-konteksti → null). Ei heitä; null-fallback toimii.
2. `_vpVahvistaSitoumus` kirjaa `vahvistaja_rooli`:n resolverista (ei enää `_rooli`-globaalista) — ja (valinnainen) `vahvistaja_uid`:n. Kirjoitus `pelaaja_sitoumus`-olioon, **ei Rules-muutosta**.
3. Näyttö erottelee oikein: VP-käyttäjä vahvistaa → "VP vahvisti"; talenttivalmentaja → "talenttivalmentaja vahvisti"; joukkueen valmentaja → "valmentaja vahvisti"; resolvoimaton → "valmentaja vahvisti".
4. #207-turvallisuus säilyy: PIN-pelaaja ei voi asettaa `vahvistettu_pvm`:ää; vahvistus-voimassa-predikaatti (`_vpVahvistusNyky`/`_p7VahvistusNyky`) ennallaan.
5. Ei Rules/migraatio/cache-bumppia; ei regressiota (jakso-nollaus + sitoumus-elinkaari toimivat kuten #207:ssä).
6. **Verifioi live (Topias):** vahvista sitoumus VP-sessiossa → `vahvistaja_rooli` **ei ole null** vaan resolvoitu rooli (esim. `'vp'`), ja label vastaa. Testaa vähintään VP-roolilla; jos mahdollista, myös valmentaja/talenttivalmentaja. 0 konsolivirhettä. **Verifioi ennen mergeä.** (Muista palauttaa Topias "odottaa"-tilaan testin jälkeen jos tarpeen.)
7. Pieni PR; kuvaus linkkaa tähän ohjeeseen + #207.
