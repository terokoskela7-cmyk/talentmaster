# Harjoitusarviointi Vaihe 2 — "Harjoittelun laatu" -dashboard + yksittäisen tapahtuman palaute (spec)

> Scoping 2026-06-22 (Tero). Jatkaa `HARJOITUSARVIOINTI_SPEC.md` (Vaihe 1, live). Peilaa Palloliiton "Harjoitteluseuranta"
> Power BI -näkymää, laajennettuna TM:n kahteen malliin + palautekeskustelukerrokseen. Periaate: pikakentät rendissä missä voi,
> mutta **dashboard + tapahtumanäkymä = raporttinäkymä → alikokoelmakysely sallittu** (§26-poikkeus, ei hot-render). Carbon (§5),
> string concat (§7.1), yksi `@media 768px`/tiedosto (§17), data-tietoinen (§29). Kytkeytyy §19 (VP Raportit), §32 (viestiketju), VP-tuloskortti III.

---

## 1. SIJAINTI & NAVIGOINTI (päätös)

VP **"Raportit"** → uusi alanäkymä **"Harjoittelun laatu"** (Raportit-yläosan segmenttivalitsin, kuten MDT-raportti rinnalla).
Sisältö: malli-toggle (A/B) + suodattimet + dashboard + **viimeisimpien arviointien lista** → drill **yksittäisen tapahtuman näkymään**.
- **Vaihe 2.1 (tämä):** Malli A -dashboard + kansallinen benchmark + tapahtumalista + tapahtumanäkymä + palautekerros (jaettu/yksityinen) + Master: valmentaja näkee jaetun palautteen.
- **Vaihe 2.2:** Malli B -dashboard + kalibraatiohistoria (itsearvio vs havainnointi).
- **Vaihe 2.3:** Master coach-oma-dashboard (valmentaja näkee omat trendinsä).

## 2. DASHBOARD (malli A — Palloliitto-peili)

**KPI-kortit:** Havaintomäärä (n) · Keskiarvo (overall) · vs kansallinen (delta) · Viimeisin pvm. (metric-kortit, max 4.)
**Per-kriteeri palkit:** a1–a7, seuran ka palkkina + **kansallinen vertailuviiva** (benchmark-marker) + delta (vihreä ≥0 / punainen <0 / harmaa kun ei benchmarkia). a2/a6 = %-asteikko, muut 0–10.
**Trendi:** keskiarvo ajassa. **Bucket oletus = kuukausi**, vaihdettavissa viikko/kausi. Seuran viiva + kansallinen katkoviiva.
**Suodattimet:** joukkue · ikävaihe · aikaväli · valmentaja (· arviointitapa = malli B).
**Datagate:** 0 arviointia → "Ei vielä arviointeja"; pieni otos → "pilottiotos, n=X" (esim. n<10).

## 3. KANSALLINEN BENCHMARK (manuaalinen, per ikävaihe)

`seurat/{sid}/konfiguraatio/harjoitusarviointi` laajennetaan:
```
kansallinen_ka: { lapsuus: {a1:7.0,a2:58,a3:6.5,…,a7:null}, nuoruus: {…} }
kansallinen_paivitetty: ISO-pvm
```
- **"Aseta kansalliset vertailuarvot" -lomake** (SA/johto) — syöttää Palloliiton julkaisemat ka-arvot per ikävaihe, ~puolivuosittain. a7 (seuran oma) ei kansallista → null → palkki "—".
- Dashboard lukee oikean ikävaiheen benchmarkin suodattimen mukaan. **Cross-club-aggregaatti (TM:n oma kansallinen ka anonymisoidusti) = Vaihe 3** (ei tässä).

## 4. YKSITTÄISEN TAPAHTUMAN NÄKYMÄ + PALAUTEKERROS (#6)

Tapahtumalistasta (tai dashboardista) drill → koko tapahtuma: kriteeriarviot + vs kansallinen + täsmennykset + (malli B) reflektio. **Tarkoitus: VP/arvioija/mentori käy harjoituksen läpi valmentajan kanssa.**

**Palaute kahteen ERI alikokoelmaan** (Firestore-luku on dokumenttitasolla → kenttää ei voi piilottaa lukijalta → erilliset kokoelmat):
```
seurat/{sid}/harjoitusarvioinnit/{id}/palaute_jaettu/{pid}      // NÄKYY valmentajalle
  teksti, tekija_uid, tekija_rooli, pvm (ISO)
seurat/{sid}/harjoitusarvioinnit/{id}/palaute_yksityinen/{pid}  // EI näy valmentajalle
  teksti, tekija_uid, tekija_rooli, pvm (ISO)
```
**Päätös — mikä näkyy:**
- **Jaettu (näkyy valmentajalle):** kehittävä palaute, vahvuudet, sovitut kehityskohteet — yhteinen valmennuskeskustelu. **Oletus uudelle palautteelle = jaettu** (läpinäkyvyys).
- **Yksityinen (vain VP/mentori/arvioija):** arviointi-/kalibraatio-/henkilöstömuistiinpanot. Ei valmentajalle.

**Master (valmentaja):** näkee **vain `palaute_jaettu`** omiin arviointeihinsa (itsearvio + häntä koskeva havainnointi) — "Saatu palaute" -lista harjoitusarviointi-alueella (kuuntelija/luku, ei uusi viestityyppi; sama henki kuin §32 VP→valmentaja). Yksityistä ei haeta Masterissa lainkaan.

## 5. RULES (§12, Console-deploy)

```
match /seurat/{sid}/harjoitusarvioinnit/{id}/palaute_jaettu/{pid} {
  allow read:   if onSuperAdmin() || onOmaSeura(sid);           // valmentaja (oma seura) + johto + SA
  allow create, update: if onSuperAdmin() || onJohtoRooli() || request.auth.uid == resource.data.tekija_uid;
  allow delete: if onSuperAdmin();
}
match /seurat/{sid}/harjoitusarvioinnit/{id}/palaute_yksityinen/{pid} {
  allow read:   if onSuperAdmin() || (onOmaSeura(sid) && onJohtoRooli());   // EI valmentajalle
  allow create, update: if onSuperAdmin() || onJohtoRooli();
  allow delete: if onSuperAdmin();
}
```
- **Kriittinen:** valmentaja EI saa lukea `palaute_yksietyinen`:ta → `onJohtoRooli`-gate luvussa. Master ei myöskään kysele sitä.
- Rules eivät periydy alikokoelmiin (§12) → omat blokit. Erillinen Console-deploy.

## 6. LIB (puhtaat funktiot — `lib/tm_eerikkila_normit.js` TAI `lib/tm_harjoitusarviointi.js`; bump lataajat)

- `koostaHarjoitusarvioinnit(arvioinnit, opts)` → `{ n, ka, per_kriteeri:{a1:{ka,delta}…}, viimeisin_pvm }` (opts: joukkue/ikavaihe/valmentaja/aikavali/malli; benchmark erikseen).
- `harjoitusTrendi(arvioinnit, {bucket:'kuukausi'|'viikko'|'kausi'})` → aikasarja [{label, ka, n}].
- `harjoitusBenchmarkDelta(per_kriteeri, kansallinen_ka)` → delta + suunta per kriteeri (null-turva a7).
- (kalibraatiohistoria → Vaihe 2.2.)
- **Vitest:** kooste (suodattimet + %-erottelu) · trendi-bucket (kk-rajat) · benchmark-delta (null a7) · tyhjä otos.

## 7. KAAVIOT

**Chart.js** (CDN `cdnjs`), ladataan **vain dashboard-näkymässä** (lazy `<script>`-injektio, ei globaalisti). Per-kriteeri palkit voi tehdä inline-CSS/SVG:llä (kevyt) tai Chart.js horizontal bar; trendi = Chart.js line. Canvas ei lue CSS-muuttujia → hex-värit (teal/amber TM-tokeneista). VP ei ole PWA-cachetettu → ei SW-allowlist-huolta.

## 8. DATA & SUORITUSKYKY

Dashboard/lista/tapahtumanäkymä kyselee `seurat/{sid}/harjoitusarvioinnit` (raporttinäkymä → §26-poikkeus). Suodatus `where('joukkue'..)`/`where('pvm'..)` + client-aggregointi. Tarvittaessa komposiitti-indeksi `firestore.indexes.json`:iin (joukkue+pvm / malli+pvm). Palaute haetaan tapahtumanäkymässä alikokoelmista (`palaute_jaettu` aina; `palaute_yksityinen` vain johto/SA).

## 9. VAIHEISTUS (2.1 toteutusjärjestys)

1. Lib (kooste/trendi/benchmark-delta) + vitest.
2. Konfiguraatio-laajennus + "Aseta kansalliset vertailuarvot" -lomake.
3. VP Raportit → "Harjoittelun laatu" -alanäkymä: malli A -dashboard (KPI + kriteeripalkit + trendi) + suodattimet.
4. Tapahtumalista + yksittäisen tapahtuman näkymä + palautekerros (jaettu/yksityinen) + Rules.
5. Master: valmentaja näkee jaetun palautteen.
6. (2.2: malli B -dashboard + kalibraatiohistoria · 2.3: Master coach-oma-dashboard.)

## 10b. VAIHE 2.2 — Malli B -dashboard + kalibraatiohistoria (päätökset lukittu 2026-06-22)

**Malli B -dashboard:** sama rakenne kuin A, `b1–b7` (1–5). **Ei Palloliiton kansallista benchmarkia** → vertailuviiva = **seuran oma tavoitetaso** `konfiguraatio/harjoitusarviointi.seura_tavoite_b {b1..b7}` (valinnainen; tyhjä → ei viivaa). Suodatin arviointitapa (itsearvio/havainnointi) aktivoituu B:ssä.

**Kalibraatiohistoria (ydin):** itsearvio − havainnointi -kuilu per kriteeri samasta harjoituksesta.
- **Paritus = auto-ehdotus + ihmisen vahvistus** (EI hiljaista automaattiparitusta):
  1. Ankkuri = havainnointi. Tallennuksessa etsi saman `valmentajaUid` + `joukkue` itsearvio `pvm ± 2 pv` → ehdota paria.
  2. VP vahvistaa tapahtumanäkymässä ("Vahvista pari" / "Ei sama harjoitus") → tallenna jaettu `pari_id` (sama molemmissa dokeissa) + `pari_vahvistettu:true`.
  3. **Kalibraatio lasketaan VAIN `pari_vahvistettu`-pareista.**
  4. Manuaalinen linkitys reunatapauksiin (valitsin saman valmentajan lähiarvioinneista).
- **Näkyvyys:** VP näkee aina (kalibraationäkymä, kuilu/kriteeri + keskikuilu + trendi). **Valmentaja näkee oman kuilunsa myönteisesti kehystettynä** (Master) — ei "yliarvioit", vaan "havainnoija näki tämän hieman eri tavalla — hyvä keskustelunaihe". §7.22-henki: kehitys, ei tuomio.
- **Lib:** `harjoitusKalibraatioHistoria(arvioinnit)` → per valmentaja: vahvistetut parit, kuilu/kriteeri (itsearvio − havainnointi), keskikuilu, trendi (kaventuminen = parempi itsetuntemus). Kytkeytyy `laskeValmentajaKalibraatio` (B6) + VP-tuloskortti III. Vitest: paritus (vain vahvistettu), kuilun etumerkki, pariton jää pois.
- **Sijainti:** sama "Harjoittelun laatu" -alanäkymä, B-toggle + kalibraatio-osio.

**Sisäänkäyntimalli (lukittu 2026-06-22):** havainnoinnin **ensisijainen reitti = coach-kortti / coach-paneeli** (VP valitsee valmentajan jonka harjoitusta menee katsomaan → "Arvioi harjoitus" esitäyttää valmentaja+joukkue+havainnointi; jo toiminnassa Fix 1). Työkalut→Arvioi harjoitus = toissijainen pikareitti. **Coach-paneeli = arviointikeskus:** välilehdet Harjoituslaatu + Kalibraatio lukevat valmentajan pikakentät (`harjoituslaatu_ka`/`valmennustaito_ka`/kalibraatio) + arviointihistoria (lista, drill tapahtumanäkymään) + "+ Arvioi harjoitus" -nappi. **Liitetään 2.2:een** (luonteva koti malli B:lle + kalibraatiolle).

**Roadmap:** 2.3 = Master coach-oma-dashboard (omat trendit + saatu palaute koottuna) · Vaihe 3 = white-label (logo/väri) + cross-club-aggregaatti (TM:n oma kansallinen ka anonymisoidusti).

## 10c. PARITUS — Rules/data-huomio

`pari_id` + `pari_vahvistettu` ovat kenttiä `harjoitusarvioinnit`-dokissa (jo olemassa olevan write-säännön piirissä, §1 Vaihe 1). Ei uutta alikokoelmaa. Auto-ehdotus = client-kysely (`where valmentajaUid + joukkue + pvm-ikkuna`); ei uutta indeksiä jos single-field + client-suodatus.

## 11. VERIFIOINTI

new Function 0 virhettä · `npm test` vihreä (uudet lib-fn) · §17 grep=1/tiedosto · Carbon §5 · string concat ·
RUNTIME + LIVE (?cb=, SA): Raportit → Harjoittelun laatu · KPI + kriteeripalkit + benchmark-viiva + trendi · suodattimet · benchmark-syöttö · tapahtumalista → tapahtumanäkymä · jaettu+yksityinen palaute tallentuu eri alikokoelmiin · **valmentaja näkee VAIN jaetun (Master), ei yksityistä** (Rules + Master-kysely) · datagate tyhjälle/pienelle otokselle.
**Rules-deploy Consolesta** ennen ei-SA-käyttöä.
