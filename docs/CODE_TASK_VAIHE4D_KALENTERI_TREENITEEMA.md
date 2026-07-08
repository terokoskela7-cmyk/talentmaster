# Vaihe 4d — Kalenteri ohjausjärjestelmänä: treeniteema (jaksofokus → harjoitus → läsnäolo → vaikutus)

> **Kalenteri = koko teknis-taktisen järjestelmän toteutuskerros.** Arviointi → jaksofokus (4a) → joukkueen teemakeskittymä (4c) → **suunniteltu teemaharjoitus (4d)** → läsnäolo (K2) → vaikutus (K5). 4d kytkee curriculumin (`lib/tm_teknistaktiset.js`) kalenteriin: harjoitus kantaa **treeniteemaa** (konsepti/joukkuetaktinen teema), ja kalenteri vastaa kysymykseen *"harjoittelemmeko sitä mihin sovimme keskittyvämme?"*. Kohde: **VP_v25** (+ Master_v16 luku). §35 (KALENTERI) · §26 · §4 · §7b · §34. Visuaali: `docs/mockups/vaihe4d_kalenteri_treeniteema_mockup.html`.

## 0. Periaate — miksi kalenteri on ohjausjärjestelmä
Ilman 4d:tä jaksofokus/teemakeskittymä (4a/4c) jää aikomukseksi. Kalenteri on ainoa paikka jossa **aikomus muuttuu tekemiseksi** (suunniteltu harjoitus) ja jossa **tekeminen kohtaa toteuman** (läsnäolo K2). Kun harjoitus kantaa teemaa, syntyy suljettu ketju: *sovittu fokus → suunniteltu teemaharjoitus → kuka oli paikalla → mikä vaikutus (K5).* Tämä on TalentMasterin erottautuja (§35 §2): kalenteri ei ole kirjanpito vaan valmennuksen ohjain. **EI riko §35-invariantteja:** yksi lähde `seurat/{sid}/kalenteri`, pehmeä poisto, K2/K3 komposioituvat (toistuva teemaharjoitus, läsnäolo per kerta).

## 1. Datamalli — additiivinen `treeniteema` kalenteritapahtumaan
Lisää harjoitus-tapahtumalle (`tyyppi:'harjoitus'`) valinnainen kenttä (muut tyypit ennallaan):
```
treeniteema: {
  tyyppi: 'yksilo_konsepti' | 'joukkue_teema',   // teknis-taktinen (youth/pelipaikka) TAI joukkuetaktinen
  avain, nimi, koodi,                             // viite libiin (tmTtItems / TM_TT_JOUKKUE)
  lahde: 'teemakeskittyma' | 'jaksofokus' | 'tki_gap' | 'manuaalinen',
  pelaajat_id: [ ... ]                            // keitä teema koskee (4c-klusteri tai valinta); tyhjä = koko joukkue
}
```
Puhtaasti additiivinen (ei migraatiota, ei riko olemassa olevaa `avaaUusiTapahtuma`-tallennusta). §26-henki: teema on tapahtuman pikakenttä, ei alikokoelmaa.

## 2.0 KORJATTAVA ENSIN — nykyinen treeniteema-reititys menee VÄÄRÄÄN paikkaan
**Löydös (2026-07-05):** `_jsvLuoTapahtuma(joukkue, teema)` (VP_v25 ~4659) avaa **`TalentMaster_Testaus_v9.html?...&teema=`** (mittaustyökalu) — EI luo `harjoitus`-tapahtumaa kalenteriin. Kaikki joukkue-syvänäkymän treeniteema-CTA:t ovat siis väärin reititetty:
- ~5111 "Luo tekniikkateema →", ~5528 "📋 Luo tekniikkateema", ~5931 "📋 Luo harjoitustapahtuma →", ~9466 "Luo treeniteema" → **kaikki → Testaus_v9 (VÄÄRIN, treeniteema ≠ mittaus).**
- ~5127 `phv → 'kasvumittaus'` → Testaus_v9 = **OIKEIN** (kasvumittaus on mittaus, jää ennalleen).

**Korjaus (osa 4d):** erota kaksi intentiota selkeästi:
- **Harjoitusteema** (tekniikka/konsepti/per-laji-gap/jaksofokus/teemakeskittymä) → **`harjoitus`-tapahtuma kalenteriin** (`avaaUusiTapahtuma` esitäytettynä `tyyppi:'harjoitus'` + `treeniteema`), EI Testaus_v9.
- **Mittaus** (kasvumittaus, testiprotokolla hh_laaja ym.) → **Testaus_v9** (ennallaan).

Uusi apuri esim. `_jsvLuoHarjoitus(joukkue, teemaAvain)` (→ avaaUusiTapahtuma harjoitus+treeniteema) ja säilytä `_jsvLuoTapahtuma` VAIN mittaukselle (tai nimeä `_jsvLuoMittaus`). Päivitä 4 väärää CTA:ta uuteen. **TKI-per-laji-gap (`_jsvTreema`) = yksi treeniteeman lähde** (`lahde:'tki_gap'`) muiden rinnalla (jaksofokus/teemakeskittymä) — sama kohde (kalenterin harjoitus), ei enää mittaustyökalu.

## 2. Kolme kytkentäpistettä (rakennettava)
### 2.1 4c → 4d silta (teemakeskittymä → harjoitus) — TÄRKEIN
4c:n **"Ryhmäharjoite"-CTA** (≥3 pelaajaa samassa konseptissa) avaa `avaaUusiTapahtuma` **esitäytettynä:** `tyyppi:'harjoitus'`, `treeniteema` = kyseinen konsepti (`lahde:'teemakeskittyma'`), `pelaajat_id` = klusterin pelaajat. VP/valmentaja valitsee vain päivän → tallenna. Aikomus → kalenteriin yhdellä klikillä.

### 2.2 Uusi harjoitus → treeniteema-valitsin
`avaaUusiTapahtuma`-modaaliin (kun `tyyppi:'harjoitus'`) **treeniteema-valitsin** (custom-dropdown, aukeaa alas §37): ryhmitelty **Yksilökonseptit** (`tmTtItems` vaihe-gating) + **Joukkuetaktiset teemat** (`TM_TT_JOUKKUE`). Valittu teema → näyttää **konsepti→cue→harjoite-esikatselun** (reuse toimintakortti-sisältö `tmTtKysymykset`/`tmTtHarjoitteet`) → valmentaja näkee heti mitä vetää. Valinnainen (harjoitus voi olla teematon).

### 2.3 Tapahtumakortti = harjoitussuunnitelma
Kalenterikortti (harjoitus + treeniteema) näyttää **teemasirun** (ikoni + nimi). Tapahtuman avaus → **konseptipeli/harjoite libistä** (`tmTtHarjoitteet`) + cue → kortti ON harjoitussuunnitelma (§7b pelitilannelähtöinen). K2-läsnäolo per kerta jo olemassa.

## 3. Teemakattavuus — kalenterin ohjaussignaali (uusi lisäarvo)
Jakso-/viikkonäkymään **teemakattavuus-paneeli:** vertaa joukkueen **jaksofokukset/teemakeskittymä (4c)** vs **suunnitellut treeniteema-harjoitukset (4d)** valitulla jaksolla.
- **Signaali:** konsepti jossa ≥3 pelaajan fokus MUTTA 0 teemaharjoitusta jaksolla → 🟠 *"Kuljetus: 4 pelaajan fokus, ei harjoitusta tällä jaksolla."* → CTA "Suunnittele" (avaa 2.1-flow).
- **Positiivinen:** kate OK → 🟢 *"Fokusteemat katettu."*
- Laskenta pikakentistä: `jaksofokus` (4c) + `kalenteri`-tapahtumien `treeniteema` valitulta väliltä. Apuri `lib/tm_treeniteema.js` (PURE, dual-export, Vitest): `tmTtKate(pelaajat, tapahtumat, jaksoAlku, jaksoLoppu)` → per teema {fokus_n, harjoitus_n, kate:bool}.

## 4. Roolit + Rules (§4/§35)
- **Kuka suunnittelee:** valmentaja omalle joukkueelle (omistaa kentän) · talenttivalmentaja talenttiharjoitukset · VP oversight + voi luoda (§35 K2: luonti myös valmentaja/talenttivalmentaja `luoja_uid`).
- **Rules (§35 v3.5):** `treeniteema` on additiivinen kenttä harjoitustapahtumassa → kuuluu luojan täyteen CRUD:iin (jo sallittu). Varmista field-level-lista EI estä `treeniteema`:aa muiden-events-updatelle jos tarpeen (yleensä luoja asettaa luonnissa → ok). Ei uutta Rules-blokkia todennäköisesti; **tarkista + testaa** (`tests/rules/`).

## 5. §-invariantit
§35 (yksi `kalenteri`-lähde, pehmeä poisto, K2/K3 komposioituvat — EI uutta kalenterilähdettä) · §26 (treeniteema pikakenttä tapahtumassa, kate pikakentistä) · §4 (roolimalli: valmentaja/talenttivalmentaja/VP) · §7b (curriculum pelitilannelähtöinen; teema näyttää cue+harjoite) · §34 (sisältö libistä, ei kovakoodattu) · §5 · custom-dropdown (aukeaa alas §37) · §7.22 ei koske (valmentaja/VP-näkymä) · ei version.json-bumppia · lib `?v` (tm_treeniteema + mahd. tm_teknistaktiset).

## 6. Rakennusjärjestys (yksi PR, sisäinen priorisointi)
1. **§2.0 reitityskorjaus** — treeniteema-CTA:t → kalenterin `harjoitus` (ei Testaus_v9); mittaus jää Testaus_v9:ään. ← korjaa nykyisen virheen
2. **treeniteema-kenttä + 2.2 valitsin** (avaaUusiTapahtuma) + kortin teemasiru.
3. **2.1 4c→4d silta** (Ryhmäharjoite-CTA → esitäytetty harjoitus) + TKI-gap-CTA:t samaan kohteeseen. ← suurin arvo
4. **§3 teemakattavuus-signaali** (`tm_treeniteema.js` + jakso-/viikkonäkymän paneeli).
5. **2.3 tapahtumakortti = suunnitelma** (konseptipeli/cue libistä avattaessa).

## 7. Rajaus (EI 4d:ssä)
- **K5 kuorma/dropout-analytiikka** (läsnäolo → kuorma → vaikutus) = oma vaihe; 4d **tuottaa raakadatan** (teema + K2-läsnäolo) mutta ei analysoi.
- **K6 iCal-vienti** + ulkoinen synkka (Google/Outlook/Teams) = §35 §4.3–4.6, erikseen.
- **K4 muistutukset** = erikseen.
- Perhenäkymä treeneistä = myöhemmin.

## 8. Verifiointi
Vitest: `tm_treeniteema.js` (`tmTtKate` — fokus-n vs harjoitus-n per teema, jaksoraja, tyhjät). Live VP_v25: (1) 4c Ryhmäharjoite → esitäytetty harjoitus tallentuu `treeniteema`-kentällä → näkyy kalenterikortin teemasiruna; (2) uusi harjoitus → treeniteema-valitsin (aukeaa alas) → konsepti→cue→harjoite-esikatselu; (3) teemakattavuus-paneeli näyttää kate/gap oikein pikakentistä; (4) K2-läsnäolo toimii teemaharjoituksella. `npm test` + lint. Chrome-devtools -pariteetti. **Merge vasta kun Tero sanoo "live".**
