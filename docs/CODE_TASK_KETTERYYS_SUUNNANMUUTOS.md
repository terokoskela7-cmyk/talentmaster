# Code-tehtävä: Eriytä D1-osaindeksi "Ketteryys" ja "Suunnanmuutos" (§30)

> Lähde: live-analyysi 2026-07-03 (Claude + Tero), PR #72:n jälkeen. Rajaus: `lib/tm_eerikkila_normit.js` `laskeD1Osaindeksit` + sen kuluttajat (VP_v25, Master_v16). §26 pikakentät, arviointilogiikka (eerikkilaTaso) ennallaan — vain osa-alueiden RYHMITTELY muuttuu.

## Tausta / oire
`laskeD1Osaindeksit` (lib:544) laskee osa-alueen `ketteryys` KAHDEN eri testin tason keskiarvona:
```js
ketteryys: ka([tasoT('kasirata'), tasoT('sm_juoksu')])   // kasirata (LL) + sm_juoksu (DIAG) litistetty yhteen
```
Kaksi eri ominaisuutta yhtenä lukuna → valmentaja ei näe kumpi on vahva/heikko. Lisäksi sama luku on nimetty **epäjohdonmukaisesti**: VP:3922 "Ketteryys", VP:4350/4412/4588 "Suunnanmuutos". **Mislabeling:** Sibbolla (vain kasirata, ei sm_juoksua) "Suunnanmuutos"-ominaisuus (`_jsvFeatureKat`) laskee arvon kasiratasta → kasirata esiintyy vääränä suunnanmuutoksena.

**Taksonomia (§14/§22):** Ketteryys = `kasirata` (LL-ketju, kahdeksikkorata) · Suunnanmuutos = `sm_juoksu` (DIAG, ilman palloa). (sm_pallo = D2/TSI, EI tähän.)

## Muutos

### 1. lib/tm_eerikkila_normit.js `laskeD1Osaindeksit` (~549)
```js
// ENNEN:  ketteryys: ka([tasoT('kasirata'), tasoT('sm_juoksu')]),
// JÄLKEEN:
ketteryys:     tasoT('kasirata'),        // LL — pelkkä kasirata
suunnanmuutos: tasoT('sm_juoksu'),       // DIAG — pelkkä sm_juoksu (uusi avain)
```
Muut avaimet (kiihdytys/maksinopeus/voima/aerobinen) ennallaan. **Vaikutus Sibboon:** ketteryys = kasirata (oikein, ennallaan); suunnanmuutos = null (ei sm-dataa → ei näytetä — rehellistä).

### 2. VP_v25 osaindeksiryhmät (~3922, `_JSV_OSAINDEKSI_RYHMAT`)
Lisää ryhmä `{ laatu:'suunnanmuutos', nimi:'Suunnanmuutos' }` `ketteryys`-ryhmän viereen. Iteraatio (3973) lukee `oi[G.laatu]` → toimii automaattisesti. **Huom:** `_JSV_FYYS_TESTIT` (3903) EI sisällä SM-testejä ("ei SM") → Suunnanmuutos-ryhmällä ei ole per-testi-rivejä tässä listassa. VP:ssä on jo erillinen **"Suunnanmuutos (D1→D2 silta)"** -osio (3982) joka näyttää sm_juoksu/sm_pallo-rivit → **älä tuplaa**: näytä Suunnanmuutos-osaindeksi ryhmätason palkkina (kuten muut osaindeksit), per-testi-rivit pysyvät 3982-osiossa. (Tai jätä Suunnanmuutos pois ryhmälistasta jos se on visuaalisesti päällekkäinen 3982:n kanssa — Coden harkinta, dokumentoi valinta.)

### 3. VP_v25 `_jsvFeatureKat` — "Suunnanmuutos"-ominaisuus (4406/4412/4551/4588/4617)
Tämä on **mislabeling-korjaus**. Nyt `oi.ketteryys` (kasirata+sm_juoksu) syötetään "Suunnanmuutos"-ominaisuuteen:
- 4406/4617: `if (oi && oi.ketteryys != null) ketteryys.push(oi.ketteryys)` → **`oi.suunnanmuutos`** (sm_juoksu).
- Nimeä sisäinen muuttuja `ketteryys` → `suunnanmuutos` (4406/4551/4588/4617; F.ketteryys → F.suunnanmuutos).
- 4588: `_omRivi('Suunnanmuutos', suunnanmuutos, 'suunnanmuutos (sm-juoksu)', ...)` (päivitä myös selite, poista "kasirata + sm-juoksu").
- 4661 kattavuus "Suunnanmuutos" → `tasoJakauma(suunnanmuutos, 3).n`.
- **Vaikutus:** Sibbo → Suunnanmuutos-kattavuus 0/N (rehellistä; kasirata ei enää teeskentele suunnanmuutosta). SJK (sm-data) → oikea suunnanmuutosarvo.

### 4. Master_v16 `_D1_OSAT` (~6360)
Lisää `['suunnanmuutos', 'Suunnanmuutos']` listaan (ketteryys pysyy, nyt kasirata-only). Iteraatio 6364 summaa `oi[k[0]]` → toimii automaattisesti.

### 5. VP_v25:7322 (`_renderMDTProfiili`/muu) — tarkista mitä `oi`-avaimia lukee
Jos lukee `oi.ketteryys` "Suunnanmuutos"-mielessä → sama korjaus kuin #3. Jos ei käytä ketteryyttä → ei muutosta.

### 6. lib ?v-nosto
`tm_eerikkila_normit.js?v=39` → `?v=40` KAIKISSA lataajissa (grep) → deployautuu heti. EI version.json.

## Testit
- **Vitest** (`tests/eerikkila_normit.test.js`): `laskeD1Osaindeksit` — ketteryys = pelkkä kasirata-taso (ei enää sm_juoksu-keskiarvo); suunnanmuutos = pelkkä sm_juoksu-taso; molemmat null kun testi puuttuu; Sibbo-tapaus (kasirata mutta ei sm_juoksu) → ketteryys=arvo, suunnanmuutos=null. Aja `npm test` + `npm run lint`.
- **Live-verify** (SA): Sibbo T12 → Ketteryys-osaindeksi näkyy (kasirata), Suunnanmuutos ei (ei dataa). SJK → sekä Ketteryys että Suunnanmuutos erillisinä, eri arvot kun testit eroavat.

## Guardrailit
- Arviointilogiikka (eerikkilaTaso/normiIka) ennallaan — vain osa-alueiden ryhmittely + nimet. §26 pikakentät. §5 tokenit. VP-facing → §7.22 ei koske. version.json EI bumpata (vain lib ?v). Feature branch → PR.
- `d1_taso`-kokonaistaso (`laskeD1Joustava`, eri funktio) EI muutu — tämä koskee vain osaindeksi-erittelyä.
