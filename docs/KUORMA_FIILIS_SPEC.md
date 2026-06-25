# Kuorma & fiilis — sRPE-kalibraatio + joukkuefiilis (spec)

> Laadittu 2026-06-25. Valmentajan arvioima rasitus vs. pelaajien koettu RPE (sRPE-mismatch) +
> joukkueen fiilis. Staff-pinta (valmentaja/VP), EI lapselle (§7.22). Osa K5:tä (kuorma/dropout-erottautuja).
> Pohjadata verifioitu: Pelaaja `_tallennaKirjaus` kirjoittaa `rpe`/`fiilinki`/`paivitetty`/`kesto_min`/`joukkuetreeni`,
> Master `_lataaKirjaukset` lukee saman polun — kenttäsopimus ehjä.

---

## 0. Tieteellinen perusta
- **Foster sRPE:** session-load = RPE (1–10) × kesto (min) → arbitraariyksikkö (AU). Yksinkertainen, validoitu nuorille.
- **Coach–athlete RPE-mismatch (Wallace, Brink, Foster):** valmentaja arvioi harjoituksen intensiteetin systemaattisesti eri tavalla kuin urheilijat. **Toistuva iso kuilu (≥~1.5 RPE) = kuormanhallinnan/viestinnän signaali** — pelaajat kokevat kovemmaksi kuin valmentaja aikoi (alipalautuminen/loukkaantumisriski) tai kevyemmäksi (ärsyke jää vajaaksi).
- **ACWR (acute:chronic, V3):** 7 pv kuorma : 28 pv kuorma; >1.5 = varovaisuus. Vaatii riittävän datahistorian.
- **Fiilis (wellness):** päivittäinen mieliala 1–5 — yksinkertainen hyvinvointimittari; toistuva matala = huomion paikka.

---

## 1. Datalähteet (OLEMASSA, verifioitu)
**Pelaaja** `seurat/{sid}/pelaajat/{pid}/kirjaukset/{pvm}` (Pelaaja_v7 `_tallennaKirjaus`):
`tyyppi · rpe (1–10, vain joukkuetreeni) · fiilinki (1–5) · kesto_min · joukkuetreeni (bool) · pvm · paivitetty (serverTimestamp) · luotu (Timestamp pvm:stä) · lahde:'pelaaja'`.
**Master** `_lataaKirjaukset` lukee kaikkien `_pelaajatData`-pelaajien kirjaukset (viim. 14 pv, batch 20) → Inbox + Tänään/Pulssi/Kausi.

## 2. LISÄTTÄVÄ data — valmentajan session-RPE
- **`kalenteri/{tid}.valmentaja_rpe`** (1–10) + **`valmentaja_rpe_pvm`** (serverTimestamp). Valmentaja kirjaa **harjoituskohtaisesti** harjoituksen jälkeen — luonteva paikka **K2-läsnäolomerkinnän viereen** tapahtumanäkymässä ("Arvioi harjoituksen rasitus 1–10"). (Olemassa oleva `openDrill('rpe')` on demo — korvataan tällä oikealla, eventtiin kytketyllä.)
- **Kytkentä pelaaja↔harjoitus:** V1 = sama pvm + `joukkuetreeni==true` (matchaa event.alkaa-päivään). V2 = pelaajan kirjaus tallentaa `tapahtuma_id` (eksakti). Älä pakota eksaktia V1:ssä — pvm-match riittää pilottiin.

## 3. Pikakentät (§26) + laskenta
- **Laske dedikoidussa "Kuorma & fiilis" -näkymässä** kirjauksista (Master lataa ne jo; VP lataa drill-in avatessa). Tämä on **detail-näkymä**, ei 100-rivinen lista → alikokoelmaluku OK (kuten `_lataaKirjaukset` tekee).
- **Pelaaja-pikakentät (kevyt, valinnainen V2):** `fiilis_7pv {ka, kpl, viim_pvm}` · `rpe_7pv {ka, kpl}` päivittyy Pelaaja-cascadessa tai recalcissa — vain jos VP-pulssin **lista** tarvitsee niitä render-aikana (silloin ei alikokoelmakyselyä). V1 ei vaadi näitä.
- **sRPE-load:** `rpe × kesto_min` per kirjaus → viikkosumma/ka (V2 jaksotrendit).

## 4. Näkymät (vaiheistettu)

### V1 — harjoituskohtainen kalibraatio + joukkuefiilis (Master, oma joukkue) — mockup tehty
- **Kuormakalibraatio per harjoitus:** valmentajan `valmentaja_rpe` vs. pelaajien koetun RPE:n ka (samalta pvm:ltä, `joukkuetreeni`-kirjaukset). Kuilu + tulkinta + väri (≥1.5 punainen · 0.8–1.5 amber · <0.8 vihreä). Kattavuus "X/N kirjasi RPE:n".
- **Edelliset harjoitukset:** 3–5 viimeistä riviä (pvm · arvio · koettu · kuilu-badge).
- **Joukkuefiilis:** ka /5 + trendi vs edellinen viikko + per-pelaaja (nimi · fiilis-emoji · RPE · kirjausmäärä), matala fiilis korostettu. Kattavuus.
- **Signaalit:** kuilu ≥1.5 toistuu → kuorma-lippu; pelaajan fiilis ≤2 kahtena päivänä → wellness-lippu (lempeä, valmentajalle).

### V2 — viikkokooste + jaksotrendit
- **Viikkotaso:** valmentajan RPE-ka, pelaajien RPE-ka, kuilu, fiilis-ka, kattavuus per viikko.
- **Jaksotrendit:** sparkline viikkokuormasta (pelaajien sRPE = `rpe×kesto`, ka/summa) + fiilis-trendi + kuilu-trendi yli kauden. Tunnista nouseva kuorma + laskeva fiilis (yhdistelmä = varhainen dropout/ylikuormitussignaali).
- **Kausi/jakso:** kauden jaksot (`_laskeKausi`) → jaksokohtainen kuorma + fiilis -profiili.

### V3 — VP-integraatio + ACWR + skaalaus
- **VP joukkuepulssiin** "Kuorma/fiilis"-osa tai drill-in: mitkä joukkueet punaisella kuilulla / matalalla fiiliksellä. Pikakentät (§26) jos render-aikainen lista.
- **ACWR** (7:28 pv) kun datahistoria riittää → >1.5 varovaisuus.
- Denormalisoidut joukkue-koosteet (`seurat/{sid}/joukkue_kooste/{joukkue}`) skaalaa varten (scheduled/write-time).

## 5. Rules (v3.6, deployaa N4-CI:n kautta)
Lisää kalenteri-eventin **valmentaja field-level update** -ehtoon `valmentaja_rpe` + `valmentaja_rpe_pvm`:
```javascript
allow update: if onOmaSeura(seuraId) && onValmentajaRooli()
  && request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['muistiinpanot','lasnaolo_kooste','valmentaja_rpe','valmentaja_rpe_pvm','paivitetty','muokkaaja_uid']);
```
Johto/omistaja (luoja_uid==uid) saa jo täyden updaten → ei muutosta heille. **Deploy: muokkaa `tm_admin/firestore.rules` → PR → N4-CI deployaa automaattisesti** (ei enää Console-käsityötä).

## 6. Invariantit
- **§7.22:** kuorma + fiilis ovat **vain valmentaja/VP-pinnalla**, ei koskaan lapselle. Positiivinen kehys (ei valvonta/syyllistäminen). Pelaajalle oma kirjaus näkyy normaalisti, mutta ei joukkuevertailua.
- **§26:** detail-näkymä laskee kirjauksista; render-aikainen lista (VP-pulssi) vaatii pikakentät.
- **RPE vain joukkuetreeni-kirjauksissa** — vertaa vain niihin (ei omatoimi-RPE:tä valmentajan session-arvioon).
- **Foster sRPE = RPE × min.** Kuilu = `pelaajien_rpe_ka − valmentaja_rpe`.
- Valmentajan session-RPE **harjoituskohtainen**, kytketty kalenteritapahtumaan (ei irrallinen).

---

## 7. V1 Code-komento (tiivistys — täysi teksti chatissa)
1. Kalenteri-tapahtumanäkymään (K2-läsnäolon viereen) "Arvioi harjoituksen rasitus 1–10" → `kalenteri/{tid}.valmentaja_rpe`.
2. Master "Kuorma & fiilis" -näkymä: per-harjoitus kalibraatio (valmentaja_rpe vs pelaajien rpe-ka samalta pvm:ltä) + edelliset + joukkuefiilis + signaalit. Laske `_kirjauksista` (jo ladattu).
3. Rules v3.6 (yllä) → PR → N4-CI.
4. `npm test` + `version:bump`. V2/V3 omina vaiheina.
