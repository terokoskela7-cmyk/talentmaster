# Code-tehtävä: VP syvänäkymä — korjauspaketti (live-verify-havainnot 2026-07-01)

> Kooste kaikista tämän VP-kierroksen live-tarkistuksessa löytyneistä havainnoista. Neljä korjausta, prioriteettijärjestyksessä. Kukin voi olla oma PR tai niputettuna — **P0 (päivämäärä-integriteetti) erikseen**, koska se on datakorjaus; P1–P2 (VP_v25 UI) voi niputtaa yhteen.
> Kaikki live-verifioitu oikealla SJK-datalla (Claude, selain + Firestore-luku).

---

## P0 — `hh_pvm`-päivämäärä vanhentunut (datakorjaus + juurisyy)

**Havainto:** pelaajakortin "viimeisin mittaus" -päivämäärä on väärä. **Skoopin tarkistus 2026-07-02: 45/59 SJK:n H-H-datallista pelaajaa väärällä `hh_pvm`:llä** (~76 % — systeeminen, ei reunatapaus). Kortit näyttävät maalis-/huhtikuuta (24.3./27.3./1.4.), todelliset testit kesäkuussa (2.6./5.6./7.6.). Esim. Runo Ebah: kortti `hh_pvm = 2026-04-01`, ainoa testitulos `2026-06-02_hh_suppea`.
**⚠️ GO-LIVE-BLOKKERI:** korjattava ennen SJK:n valmentajakoulutusta (elokuu) — väärä "viimeisin testi" -pvm syö luottamusta työkaluun adoptiohetkellä.
**Tarkennus (ei kosmetiikkaa, mutta ei myöskään väärää dataa):** `hh_viimeisin`-**arvot** (lin10m 1.72, lin30m 4.19, mas 14.9, cmj 41.1, sm_juoksu 7.62, sm_pallo 8.67) ovat **identtiset** 2.6.2026-testituloksen kanssa → **data on oikein ja tuore, vain `hh_pvm`-päivämääräkenttä jäi 1.4.2026:een.** Kesäkuun tuonti päivitti arvot mutta ei päivämäärää näille pelaajille (ne joilla 2 testiä / 9.6-tuonti ovat oikein).
**Miksi korjattava (ei pelkkä label):**
- `hh_pvm` ohjaa **§29 kehitysvauhdin vangitsemista** (pvm-vahti `vanhaPvm !== uusiPvm`) → väärä pvm voi rikkoa "edellisen" tallennuksen / tuottaa nolladeltan.
- "Vanhin testi X pv sitten" -signaalit (§17/§18) näyttävät väärää ikää.
- Liittyy tunnettuun SJK-päivämääräongelmaan (CLAUDE.md §26 IKAKONVENTIO / §6: "korjaa testipäivä ✎-napilla ensin").

### P0a — Kertaluontoinen backfill (data) — ✅ TEHTY KÄSIN 2026-07-02
**Claude ajoi backfillin selaimesta (SA):** 46 pelaajaa korjattu (SJK 45 + Pallo-Iirot 1), `hh_pvm` = viimeisin H-H-testitulos-pvm. Verifioitu: 0 ristiriitaa jää. **Code EI tarvitse ajaa tätä uudelleen** — mutta rakenna silti `korjaaHhPvm(seuraId, dryRun)` pysyväksi työkaluksi tulevia driftejä + uusia seuroja varten (idempotentti, dry-run oletus). Alla oleva logiikka = referenssi.

**Alkuperäinen logiikka (referenssi + pysyvä funktio):**
Uusi konsoli-/admin-funktio `korjaaHhPvm(seuraId, dryRun=true)` (tai lisää olemassa olevaan recalc-perheeseen, esim. Excel_Tuonti.html:n admin-työkaluihin `recalcHH`:n viereen):
- Per pelaaja jolla `hh_viimeisin` != null: lue `testitulokset`-alikokoelma, ota **viimeisin `testauspvm`** (max, doc-ID-prefiksi `{pvm}_` fallback). Jos `hh_pvm !== viimeisin_testauspvm` → **aseta `hh_pvm = viimeisin_testauspvm`** (merge). ÄLÄ koske `hh_viimeisin`-arvoihin.
- **Edge case:** jos pelaajalla useita testituloksia ja `hh_viimeisin` vastaa vanhempaa (harvinaista) — turvallisin on kohdistaa `hh_pvm` siihen `testitulokset`-dokkiin jonka arvot täsmäävät `hh_viimeisin`:iin; jos ei match, käytä viimeisintä testauspvm:ää. Dokumentoi valinta.
- **Dry-run oletus** (listaa muutokset), `false` kirjoittaa. WriteBatch (max 400/erä). Aja **kaikille pilottiseuroille**, ei vain SJK.

### P0b — Juurisyy tuontiin (estä toistuminen)
- Selvitä **miksi 2.6/5.6-tuonti päivitti `hh_viimeisin`:in mutta ei `hh_pvm`:ää**. Excel_Tuonti `prosessoiExcel` (~2932) asettaa molemmat yhdessä (`profiiliUpdate.hh_viimeisin` + `profiiliUpdate.hh_pvm = pvmIso`) — mutta jokin polku (recalcHH? osittainen merge? historiapohja-tuonti §22 Moodi B?) päivitti arvot ilman pvm:ää. Tunnista polku ja **varmista invariantti: `hh_pvm` päivittyy AINA yhdessä `hh_viimeisin`:in kanssa** (sama test-doc:n pvm).
- **Invariantti kirjattava CLAUDE.md §26:een:** "pikakenttä-pari `hh_viimeisin` + `hh_pvm` päivitetään aina atomisesti samasta testituloksesta."
- (Sama tarkistus koskee `tki_viimeisin`/`tki_pvm` ja `tk_lajit_*`-pareja — varmista ettei sama drift toistu niissä.)

---

## P1 — 3. TSI-lukukohta (johdonmukaisuus, Coden flagi #60)

Syvänäkymän roster-taulun Tekninen-solun diagnostinen alarivi (VP_v25 ~rivi 4673) käyttää yhä pelkkää `tsi_viimeisin`-pikakenttää — toisin kuin `_jspModal` (5140) ja `_talenttiCod` (8956) joihin fallback lisättiin #60:ssä.
- **Korjaus:** sama fallback — kun `tsi_viimeisin` null, laske `laskeTSI(hh_viimeisin.sm_juoksu, hh_viimeisin.sm_pallo)` (§22). Yhtenäistää kaikki 3 kohtaa.

---

## P2 — Dimensiovälilehtien tyhjät/placeholder-tilat (nyt näkyvissä, kun tab-clip #60 korjattu)

### P2a — Peli-välilehti (D4) tyhjätila → CTA
Nyky: `f3 = 'Ei havaintoja vielä'` kun ei ADAR-dataa (SJK). §75-linjan mukaisesti → **tyhjätila-CTA**: "Ei pelihavaintoja vielä — Avaa ADAR-kenttätyökalu →" (linkki `TalentMaster_ADAR_Pikakortti.html?seuraId=` kuten muut ADAR-launcherit §26). Ei bare "Ei havaintoja vielä".

### P2b — Kehitys-välilehti: Bio-ikä-placeholder → bio-banding V1
Nyky: Bio-ikä-rivi = "Tulossa (KR-kertoimet)" (KR lukossa §25). **Korvaa oikealla datalla jota meillä JO on (bio-banding V1):**
- `kehitysvaihe_kaista` (pre/circa/post) + `kasvutahti_cm_v` + `kasvutahti_vyohyke` (pikakentät §25 bio-banding V1) kun saatavilla.
- PHV-vaihe (`phv_tila`) on jo rivillä — lisää kaista + kasvutahti sen viereen. Bio-ikä (KR) -rivi voi jäädä "Tulossa" tai poistua.
- Graceful: jos bio-banding-pikakenttiä ei ole → nykyinen "Ei mittausta"/"Tulossa".

---

## Guardrailit
- **P0 = datakorjaus** (Firestore-kirjoitus vain `hh_pvm`-kenttään; `hh_viimeisin`-arvot ja muut kentät ennallaan). Dry-run pakollinen ennen kirjoitusta. Ei muuta pikakenttiä.
- **P1–P2 = VP_v25.html-renderöinti**, pikakentistä (§26), ei uutta datahakua. Fallback vain renderöinnissä (P1) — ei kirjoiteta Firestoreen.
- §22 (`hh_pvm` = ikäluokka-/normipohja), §26 (pikakentät), §7.22/§28, brändi §5, tumma+vaalea teema, mobiili §6. Ei versionbumppia.
- Rajaus: P0 datafunktio + P1/P2 vain VP_v25. Ei kosketa syvänäkymän rakennetta (PR B) muuten.

## Testit / verifiointi
- **P0:** Vitest date-valinnalle (viimeisin testauspvm) jos irrotettavissa. Dry-run-tuloste tarkistettava ennen kirjoitusta. Claude ajaa jälkikäteen saman Firestore-vertailun (hh_pvm === viimeisin testitulos) → 0 ristiriitaa.
- **P1:** roster-taulun TSI näyttää arvon myös kun pikakenttä null (Ebah).
- **P2:** Peli-CTA näkyy tyhjällä ADAR:lla; Kehitys-välilehti näyttää kaista/kasvutahdin kun bio-banding-dataa on (SJK ~8 PHV-pelaajaa).
- `npm test` + lint + CI vihreät. Claude live-verify oikealla SJK-datalla mergen jälkeen.

## Skoopin tarkistus (ennen P0-backfillia)
Aja ristiriita-kysely **kaikille pilottiseuroille** (ei vain SJK): montako pelaajaa per seura joilla `hh_pvm !== viimeisin testitulos-pvm`. Antaa backfillin laajuuden + paljastaa jos sama drift on muissa seuroissa. (Claude voi ajaa tämän selaimesta ennen kuin backfill kirjoitetaan.)

## Ei tähän
- Khamis-Roche %PAH (V2, lukossa §25).
- Syvänäkymän rakennemuutokset (PR B tehty).
- Feature branch → PR → merge (P0 omana, P1–P2 voi niputtaa).
