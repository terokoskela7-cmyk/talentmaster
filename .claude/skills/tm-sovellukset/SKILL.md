---
name: tm-sovellukset
description: >-
  TalentMasterin sovelluskohtaiset yksityiskohdat: Cloud Functions -luettelo ja roolinvaihto, ADAR Pikakortti (bundler), Pelaaja_v7 (PIN, P6, perhekehu, tekniikkatavoite), Seura.html, Admin, VP_v25-dashboard, integraatiot (TASO, iCal), AI-arkkitehtuuri, viestiketju roolien välillä, kalenteri K1–K3, kortti-järjestelmä sekä julkinen kieli, roolimalli ja käyttäjäoppaat. Lataa ennen kuin muutat jotakin näistä sovelluksista tai funktioista.
---

# tm-sovellukset

> Siirretty juuren CLAUDE.md:stä 29.9.2026 (laiska lataus). Osiot SELLAISENAAN, alkuperäisellä numeroinnilla — ristiviittaukset (§N) toimivat. Ehdottomat säännöt sekä tietosuoja- ja turvasäännöt ovat juuressa (CLAUDE.md §0, §7, §12, §38, §39) ja voittavat ristiriidassa.

## 13. CLOUD FUNCTIONS (europe-west1)

| Funktio | Kuvaus |
|---|---|
| `lahetaRekisteriKutsu` | Yksittäinen kutsu huoltajalle |
| `luoKayttaja` | Luo Firebase Auth -käyttäjän (sama email eri rooli OK) |
| `lahetaHuoltajaKutsu` | Massakutsu huoltajille |
| `deaktivioiKayttaja` | Pehmeä poisto — data säilyy |
| `lahetaPelaajaSivuLinkki` | Linkki pelaajan näkymään |
| `haeOrLuoHuoltajaAuth` | Huoltajan autentikointi |
| `aiProxy` | AI-välitys: GPT-4o Vision, Whisper, narratiivi |
| `tasoHaeSeuranOttelut` | TASO-integraatio (deployattu) |
| `lahetaResetLinkki` | Henkilöstön salasana-reset-linkki (authz: SA/seuran johto `tarkistaOikeus`, kohde-email seuran kayttajat:issa) — ei datakirjoitusta |
| `vaihdaKayttajanRooli` | Vaihtaa käyttäjän roolin: `seurat/{seuraId}/kayttajat/{uid}.rooli` update + `setCustomUserClaims` + `revokeRefreshTokens` + vp_uid-hallinta. Params `{uid, seuraId, uusiRooli}`, sallitut `vp`/`valmentaja`/`talenttivalmentaja`/`seura_admin`. Authz `tarkistaOikeus` |
| `vahvistaSuostumus` | Suostumuksen vahvistus + Auth-luonti + reset-linkki. Admin SDK varmentaa huoltajaEmail-täsmäyksen (permission-denied jos ei) → kirjoittaa palvelinpuolella KOKO kutsuflow'n (suostumusTila 'annettu' + aux-kentät tila/antaja/bio-pituudet + kutsut→'hyvaksytty') koska Rekisterointi_Suostumus.html on autentikoimaton → haeOrLuoHuoltajaAuth → passwordResetLink. Kirjoittaa myös huoltajaEmail (vahvistus), syntymaaika+syntymaVuosi, sukupuoli (P/T→M/N), suostumukset[] + suostumus{}-objekti. Params: seuraId/pelaajaId/hEmail/suostumusTeksti/antaja/bioPituudet/kutsuId/syntyma/sukupuoli/suostumukset/suostumusMap/antajaRooli/aikaleima |

**API-avaimet → Secret Manager + `runWith({secrets})` (2026-06-23 migraatio, docs/SECRET_MANAGER_MIGRAATIO.md).** `SENDGRID_API_KEY`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY` ovat Firebase Secret Managerissa; funktiot bindaavat ne `runWith({secrets:[...]})`-lohkossa → luetaan `process.env.X`:stä ajonaikaisesti. **EI enää plaintext-env-vareja eikä CI:n `.env`-injektiota avaimille** (vanha malli paljasti avaimet Console-Variablesissa). `SENDGRID_API_KEY` vain `lahetaSahkoposti`-kutsujilla (lahetaRekisteriKutsu/lahetaMuistutukset/luoKayttaja/lahetaPelaajaSivuLinkki/notifKoosteEmail); `OPENAI/ANTHROPIC` vain `aiProxy`:lla. **`SENDGRID_FROM_EMAIL` ei ole salainen** → committattu `functions/.env`. API-avaimet ei ikinä selaimessa. Uusi secret: `firebase functions:secrets:set X` ENNEN runWith-deployta (muuten deploy hylkää). (GEMINI_API_KEY pois — secret puuttuu + gemini-taskit ei käytössä.)
**Reset-linkin continueUrl (HOLD 2026-06-02):** `generatePasswordResetLink(email, {url, handleCodeInApp:false})` — `url` PAKOLLINEN (ilman → 500). Käyttäjä laskeutuu Firebasen reset-sivulle, sitten `url`. Yhtenäistä `url` halutuksi landingiksi `luoKayttaja`/`lahetaResetLinkki`/`lahetaPelaajaSivuLinkki`-funktioissa.

**Roolinvaihto-invariantit:**
- Roolinvaihto AINA `vaihdaKayttajanRooli`-CF:n kautta — ei suoraan Firestoreen.
- CF tekee aina: `Firestore.update` + `setCustomUserClaims` + `revokeRefreshTokens`.
- Ilman `setCustomUserClaims` Rules ei näe muutosta (Rules lukee `request.auth.token.rooli`-claimia).
- `revokeRefreshTokens` yksin EI pudota aktiivisia sessioita — defensiivinen UI-tarkistus (claims vs Firestore `kayttajat.rooli`, onAuthStateChanged) on välttämätön pari. Toteutettu VP_v25:ssä.
- `tarkistaOikeus` lukee `vp_uid`:tä eikä pelkkiä claimseja — stale `vp_uid` voi antaa palvelinpuolen VP-oikeudet demotoinnin jälkeen ~hetken. Tietoinen kompromissi, korjataan omassa sprintissä.

---

## 15. ADAR PIKAKORTTI — `TalentMaster_ADAR_Pikakortti.html`

### Bundler-rakenne (offline kentällä)
Fontit + Firebase SDK inlinena base64/gzip. Script-tyypit `__bundler/manifest`, `__bundler/ext_resources`,
`__bundler/template`. Päälogiikka on JSON-enkoodattuna `__bundler/template` -skriptissä.
```python
# OIKEIN — raw JSON-string indeksihaulla:
idx = template_raw.find("etsittava"); template_raw = template_raw[:start] + uusi + template_raw[end:]
# VÄÄRIN — json.loads()+json.dumps() → double-encoding korruptoi tiedoston
```

### Firebase-muuttujat
`window._tmDB` (Firestore) · `_tmAuth` · `_tmSeuraId` · `_tmRooli` · `_pelaajaMap {pelaajaId:{tunniste,nimi,joukkue}}`

### saveCard() → `seurat/{seuraId}/pelaajat/{pelaajaId}/havainnot/{id}`
```javascript
await havaintoRef.set({
  palloId, pelaajaId, seuraId, valmentajaUid: firebase.auth().currentUser?.uid,
  tila: 'valmis',          // Pelaaja-näkymä kuuntelee tätä
  pelaaja_lukenut: false, luotu: new Date().toISOString(),
  // ADAR-pisteet, narratiivi jne.
});
```

### ADAR Vision
- Kuva → Storage `seurat/{id}/havainnot/{id}/media_0.jpg`; `media[]` taulukko (video myöhemmin)
- `otettu: new Date().toISOString()` — EI serverTimestamp() (array-rajoitus!)
- `_pyydaAINarratiivi()` → aiProxy → GPT-4o Vision → `ai_narratiivi .update()`; `ai_luottamus:'matala'` aina (ihminen hyväksyy ennen kuin pelaaja näkee)

### Pikatila (3-vaiheinen)
`_pikaValitsePelaaja(id,nimi,seuraId,btn)` → `_pikaAdar(vaihe,btn)` → `_pikaSetPiste(piste,btn)` → `_pikaTallenna()` (→ `tila:'luonnos'`).

---

## 16. PELAAJAN APP — `TalentMaster_Pelaaja_v7.html` (v=25)

**Kirjautuminen:** `_kirjauduPinilla(pin)` → Anonymous Auth → haku `seurat/{id}/pelaajat` jossa `pin==arvo` → `_kaynnistaAppUI()`.
**`getIdToken(true)`** pakollinen ennen Firestore-kirjoitusta (sessio vanhentuu).

**Tekniikkatavoite (MINÄ → Tekniikkaprofiili, 2026-06-11, §34/§5.3):** tavoiterivit pikakentistä (§26) lapsen kielellä —
⭐vahvuus (`tki_vahvuus`; "kärkitasoa" vain jos taso erinomainen, `tkLajiViite`) · 🎯seuraava askel (välitavoite: gap≤3s→`viite.hyva`,
muuten arvo−3s/0.5s tarkkuus — **saavutettava askel, ei koko matka**) · 🏅mitalimatka VAIN positiivisena ja vain ≤15s · 📈abs-parannus
VAIN >0 · 🔥kultaikkuna ≤12v ILMAN uhkakehystä. Tyhjätila "Tekniikkakisa tulossa" (ei "Ei tuloksia"). TÄNÄÄN-T-kortti saa saatteen
kehityskohteesta (`_tekTavoiteSaate`). **§7.22-EHDOTON:** ei XP/progressbaria/loss aversion -kieltä ("menetät/putoat/sulkeutuu"),
ei vertailua muihin, **TKI-laskua EI näytetä pelaajalle lainkaan** (vain abs-parannus kun positiivinen, §34 §3.2). Pelaaja lataa
`docs/testit_indeksit.js` → funktiot `window.TM_TESTIT`:stä, EI inline-kopiota. SW `tm-pelaaja-v3` (§27.4).

**Perheviestintä (Vanhempi_v2 Kortti-tab, 2026-06-11, §34/§5.4):** vanhemmalle SAMA §7.22-kehys kuin pelaajalle +
"miten tukea" -kerros (`rVanhempiTekniikka`, `TUKIVINKIT`). Ei tasolukuja (T1–T5)/percentiilejä, ei vertailua muihin,
ei TKI-laskua/punaisia deltoja vanhemmallekaan — **painostusmekanismi**: lapsi ei ahdistu datasta vaan vanhemman
paineesta. AINA: vahvuus ensin · prosessikehu (Dweck) · autonomiaa tukevat vinkit (Deci & Ryan SDT). Data pikakentistä
(§26), `tkLajiViite`/`tkSekuntibudjetti` `window.TM_TESTIT`:stä (lib script-tagilla, ei inline). SW `tm-vanhempi-v4`.

**Kirjausrakenne:** `pelaajat/{id}/kirjaukset/{pvm}` — tyyppi 'T'|'D'|'S'|'P' (Tekniikka/Dual/Strength/Peli),
tehty, xp, kesto_min, rpe 1-10, fiilinki 1-5, aika ilta|aamu|paiva.

**Syntymäpäiväyllätys:** `_onkoSynttari(p)` / `_synttariKonfetti()` / `_synttariBanner(p)` —
**string concatenation `+`** (nested template literals rikkoivat parserin → musta ruutu v=23:ssa).

**PHV-kehitysvaihekortti:** lukee `phv_tila` (§25); KR-rivi "Tulossa myöhemmin".

### P6 — Valmentajan havainto + viesti → Pelaajan näkymä (✅ 2026-06-07)
```javascript
_p6KaynnistakuuntelIja(seuraId, pelaajaId)  // onSnapshot: tila=='valmis' && pelaaja_lukenut==false
// → "1 uutta" merkki → _avaaHavainnot() overlay narratiivilla (ei pisteitä) → _p6Luetuksi(): pelaaja_lukenut:true
// PIN success asettaa window._p7Pelaaja = {seuraId, pelaajaId} → kuuntelija käynnistyy
```
**Valmentajan viestit:** `tyyppi:'valmentaja_viesti'` + `tila:'valmis'` → P6-kuuntelija näkee automaattisesti.
Fallback: `h.teksti` (viesti) || `h.narratiivi` (ADAR). Tekijä: `h.valmentajaNimi` || `h.tekija_nimi`.

### Perhekehu ← Vanhempi (✅ toteutettu)
```javascript
_haePerhekehu()  // lukee seurat/{sid}/pelaajat/{pid}/kehut, luotu >= 48h, nahty==false
// → hav-card KOTI-näkymässä → _kuittaaKehu() → nahty:true
```

---

## 17. SEURAHALLINTA — `TalentMaster_Seura.html`

**Toiminnot:** Yhteenveto (4 KPI + pilottibanner + suostumus-%) · Pelaajat (suodattimet
Kaikki/Pilotti/Kutsu/Rekisteröity/Ilman PalloID + nimihaku) · Joukkueet · Henkilöstö · Sopimukset ·
Tuo Excel (xlsx GitHubista → SheetJS → Firestore) · Massakutsu (`lahetaHuoltajaKutsu`) ·
Talentit-välilehti (`talenttiOhjelma:true`, ryhmittely perus/laajennettu).
**Pilottiprosessi:** 1) Tuo → `pilotti` · 2) Kutsu → `odottaa` · 3) Suostumus → `annettu`.

**Muokkausmodaali:** etunimi, sukunimi, syntymäpäivä (→ syntymaVuosi auto), sukupuoli M/N, joukkueet
(checkboxit, monta), pelipaikka, huoltajaEmail, palloID, talenttiohjelma-toggle. SA lisäksi: sbl/sfl/ll/diag/dfl (1.0–3.0).

**Joukkueen nimen muokkaus:** `avaaJoukkueMuokkaus(id,nimi,ikaryhma,vuosi)` / `tallennaJoukkueMuutos(joukkueId,vanhanimi)`
— päivittää joukkueet-kokoelman dokumentin JA batch-päivittää kaikki pelaajat (sekä `joukkue`- että `joukkueet[]`-kenttä).

**Excel-pohja dynaaminen:** `lataaRekisteriPohja()` hakee seuran joukkueet Firestoresta, generoi Excelin
SheetJS:llä, joukkue-sarakkeessa valmis dropdown. Tiedosto `TalentMaster_{SeuraId}_{pvm}.xlsx`.

**Duplikaattisuoja tuonnissa:** 1) palloID-tarkistus, 2) etunimi+sukunimi+joukkue. Ohitetut `⏭`-merkillä
(`ohitettu`-laskuriin, ei virheisiin). Yhteenveto: `X tuotu · Y ohitettu · Z epäonnistui`.

---

## 18. ADMIN-NÄKYMÄ — `TalentMaster_Admin.html`

**Toiminnot:** Seurat (muokkaa/poista/"+Lisää seura" `avaaLisaaSeuraModal`) · Käyttäjät
(✏️ Hallinnoi → roolinmuutos + salasana-reset + PIN + deaktivointi) · Joukkueet (dynaaminen,
"+Lisää joukkue" POISTETTU → käytä Seura.html) · Tilastot (KPI + seurataulukko suostumuspalkilla) · Massakutsu.

**Massakutsu = kaksivaiheinen:** Vaihe 1 tallentaa `suostumusTila:'odottaa'`, EI lähetä sähköpostia.
Nappi "💾 Tuo pelaajat järjestelmään" + amber-varoitus "VAIHE 1/2". Vaihe 2 (tuleva): "Lähetä suostumuspyynnöt".

**KRIITTINEN:** Tilastot-funktio käyttää **string concatenationia** (`'<div>'+x+'</div>'`), EI template literaleja
(Python-generoinnin double-encoding rikkoo nested-literaalit).

---

## 19. VP-DASHBOARD — `TalentMaster_VP_v25.html` (käytössä; v22 on historiaa)

> **VP_v25 on kanoninen ja käytössä** (§8). `TalentMaster_VP_v22.html` on historiaa: alla olevat v22-maininnat kuvaavat alkuperäistä rakennetta, jonka v25 peri. Muutokset tehdään AINA v25:een.

**Työtilat:** Tilanne (kauden jakso + joukkuepulssi + signaalit + IDP-jono) · Valmentajat (profiilit +
mentorointi-paneeli + kalibraatiopaja + kehitysindeksit) · Pelaajat (IDP-jono + 6 suodatinta + taulukko) ·
Kalenteri (testitapahtumat + linkki Testaus) · Raportointi (Head of Talent -koosto + talenttisuositukset).
**Työkalut:** Arvioi harjoitus (Sprint 4). **Asetukset:** Metodologia · Kalibraatio · Kriteeristö · Benchmark.

**Syvänäkymä-analytiikka (VP_v25, 2026-06-11, §34):** joukkue-syvänäkymä (`avaaJoukkueSyvanakyma`) Yhteenveto-välilehti = TKI-histogrammi +
per-laji joukkueprofiili vs `tkLajiViite`-eliittiviite (label AINA `_lahde`-kentästä) + "lähellä merkkiä" (`tkSekuntibudjetti`) + kehitysvauhti
(abs + TKI, §3.2) + treeniteema-CTA (`_jsvLuoTapahtuma` esitäyttö). **Tuki**-välilehti = gap-järjestys + harjoitusryhmäjako (📋 leikepöytä) +
**aito taantuma -merkki (TKI<0 JA abs<0)**. Radar <3 dim → kompakti dimensiokortti. Per-pelaaja `_jspModal` Tekninen = per-laji + sekuntibudjetti
+ delta/vauhti + kultaikkuna (jaetut `_jsvPerLajiHTML`/`_jsvBudjettiRivi`; TSI-rivi piiloon kun ei SM-dataa). Joukkuekorttien suunta = H-H
ensisijainen → **TKI-fallback** (`lahde`-kenttä) → "2. mittaus puuttuu" vasta kun molemmat puuttuvat; pelaajalistan delta-badget (H-H + TKI).
Kanoniset TKI-funktiot + `TK_LAJIVIITTEET`/`TK_KOKONAISRAJAT` **inline-kopioituna VP:hen** (synkassa testit_indeksit.js:ään; `jsv-an-*` globaalit → toimivat myös `_jspModal`issa).

**Mentorointi-loop (natiivi):** VP → `seurat/{id}/viestit/` (kentät `lahettajaUid`, `vastaanottajaUid`, `teksti`, `aika`, `luettu`) → valmentajan Inbox (Master_v16 `_kuunteleVpViestit` onSnapshot). Ei sähköpostia/Slackia.

**Tekninen tila (2026-06-07):**
- **Kausipalkki dynaaminen:** `_laskeKausi(nyt)` — yksi totuuslähde (kevät 1.4–30.6, syksy 1.8–28.2). Ei kovakoodattua.
- **Pelaajalista-sarakkeet:** FLEI | TKI | Signaali | PHV. TKI pikakentästä `tki_viimeisin` (`_tkiSoluVP`), merkki `tki_merkki`-kentästä. Ei alikokoelmakyselyjä.
- **Signaalihehku:** `.signal-card.crit/.alert` → box-shadow rgba(201,64,64,.15); `.warn` → rgba(204,138,58,.12). Emojit → CSS-pisteet `.sig-dot--crit/--warn`.
- **KPI-kontekstitekstit** (vain ladatusta datasta): Pelaajia → joukkuejakauma · FLEI ka. → ↑/↓ trendi (`flei_historia`) · Avoimet testit → "vanhin X pv sitten".
- **Neliosainen joukkuepulssi** `renderTeamPulse` (§26) + **kattavuussignaalit S6–S9** `renderSignals` (§26).
- **Joukkueen syvänäkymä** `avaaJoukkueSyvanakyma`: pulssikortin klikkaus → modaali 3 välilehteä (Tekniikka TKI-ranking · Tuki ryhmittely kehityskohteittain · Yhteenveto TKI-jakauma). Vain pikakentistä. (Korvasi `avaaJoukkueTrendiModal`:n.)
  - **Dual-taso-radar (§28/§30, 2026-07-01):** Tavoitetaso-välilehden per-testi-radariin **Ikäluokka | Kehitysvaihe | Molemmat** -toggle (`_jsvRadarNayta`/`_jsvRadarSisalto`). Kehitysvaihe-taso `TM_KEHITYSVAIHE.kehitysvaiheTaso` per-pelaaja (offset=`biologinenIka_viimeisin.maturity_offset`) VAIN fyysisille akseleille (lin10m/lin30m/cmj/mas, MAS ÷3.6); SM-akselit → ikäluokka-arvo. `_tmRadar5D` sai additiivisen `opts.overlay`-sarjan (Molemmat = keh teal-täyttö + ika `--blue` viiva). **Graceful:** ei PHV/lib → toggle lukossa, ikäluokka-radar ennallaan (Sibbo TKI-only OK). Per-pelaaja Tekninen-osiossa **COD-raakadata** (`hh_viimeisin.sm_juoksu`→`sm_pallo`) + TSI §21-värillä.
  - **PR B (2026-07-02, live-verifioitu demo-DOM:issa):** välilehdet **4→3** — Yhteenveto+Tavoitetaso yhdistetty **"Tilanne"**-välilehdeksi (`_jsvTilanneHTML` = radar-hero `_jsvRadarBlokki` + painopiste-CTA + collapse[per-testi-jakaumat, oletus kiinni] + datapolku). Järjestys `Tilanne · Tuki · Pelaajat`, oletus Tilanne. Radar isompi (`_tmRadar5D` additiivinen `opts.maxW`, hero 420px; vasen 5D-radar 320 ennallaan). Ristiviitteet päivitetty (`_jsvBtn0→Pelaajat=2`, `_jsvBtn3→Tilanne=0`), `_jsvVaihda`-silmukka 4→3. Per-pelaaja TSI-otsikko "TSI (pallon hidastus)". **Jäljellä (pikku-polish):** vasemman vitals-kortin D1/D2-palkkien §28-tavoitetikki (nyt arvopohjainen väri kuten ennen).
- **VAI+ (5-komponenttinen):** ADAR 30% · Käynnit 20% · Harjoittelu 20% · Kontakti 15% · **Kehitys 15%** (joukkueen TKI/H-H Δ pelaajadatasta). Profiilipaneeli: UEFA-lisenssitaso (Grassroots/C/B/A/Pro) + erikoistuminen + CPD-tunnit + koulutushistoria. Lisenssibadge coach-kortissa.
- **Coach-modaali (2026-06-07):** `avaaCoachPanel(id)` → dynaaminen center-modal (`#coachModal`) 4 välilehteä: Profiili (lisenssi+CPD+koulutukset) | VAI+ (5 progress bar + hälytykset + kehitysinfo) | Harjoituslaatu (SPL 7 kriteeriä) | Mentorointi (viesti+historia). `_cmTab(idx)` vaihtaa tabit. Seuraa `avaaJoukkueSyvanakyma`-patternia. `suljePaneeli()` = `modal.remove()`.
- **Avoin:** Raportointi "Lähetä HoT:lle" = vain `toast()`.

---

## 20. INTEGRAATIOARKKITEHTUURI — ekosysteemistrategia

Platform johon datalähteet konvergoivat; lock-in tulee datasta, ei sopimuksista.

**`lahde`-kenttä kaikkialle:** `lahde: 'manuaalinen'|'catapult'|'polar'|'taso'|'wyscout'|'palloliiton_api'`,
`lahde_id: string|null` (synkronointi + deduplikointi).

**TASO (osittain):** `tasoHaeSeuranOttelut` deployattu (passit, laukaukset, minuutit, arvosanat).
Puuttuva (Sprint 4–5): valmentaja lataa TASO-datan kalenteriin → kohderakenne:
```
seurat/{id}/tapahtumat/{otteluId}: tyyppi 'ottelu', vastustaja, pvm, joukkue, taso_ottelu_id
pelaajat/{id}/pelidata/{otteluId}: minuutit, laukaukset, passit, taso_arvosana, lahde 'taso', lahde_id
```
**iCal-vienti (Sprint 5):** CF → `/api/kalenteri/{seuraId}/{joukkue}.ics` → Google/Outlook/Apple.

**Prioriteetti:** 🔴 TASO→kalenteri+pelidata (4–5) · 🟡 iCal (5) · 🟡 Catapult/Polar (6–7) ·
🟢 Palloliiton API (8+) · 🟢 Wyscout/InStat (8+).

---

## 21. AI-ARKKITEHTUURI

**Behavioural Science -agentti (Sprint 6–8):** `Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä`.
Triggerit: streak katkeaa · 3pv streak · fiilinki matala 2pv · uusi viikko · PHV-huippu.
Käyttäytymistiede: habit loop (Duhigg), implementation intention (Gollwitzer), loss aversion, temptation bundling (Milkman).
Tekninen: `tm_ai.js` provider-agnostic wrapper, `TM_AI.call()` — ei suoria API-kutsuja UI:sta, CF = AI-proxy (API-avaimet ei selaimessa).

**RAG:** Firebase Vector Search (beta) tai Pinecone — aktivoidaan kun **500+ pelaajaa** usealta kaudelta, ei aiemmin.

**MCP / Open API:** Palloliiton MCP-server on jo (`jsvirtane/tulospalvelu-mcp`); TM rakentaa oman.
`llms.txt`: api.talentmasterid.com/llms.txt. Versiointi `/v1/`, OpenAPI 3.1.
Auth: API-avain (seurat) · OAuth 2.0 PKCE (scoutit) · JWT (Palloliitto). Rate: 1000/100/10000 per h.

---

## 32. VIESTIKETJU — roolien välinen kommunikaatio (2026-06-07)

> Kaikki viestintäpolut Firestore-pohjaisia (persistoituja). TMBus = demo-yhteensopivuus.
> Rules: `viestit/` (v2.3), `havainnot/` (v3.4) — molemmat livenä, ei deployta tarvita.

### Polut ja Firestore-rakenteet

| Suunta | Firestore-polku | Tyyppi/kenttä | Luku | Kirjoitus |
|---|---|---|---|---|
| **VP → Valmentaja** | `seurat/{sid}/viestit/{id}` | `lahettajaUid`, `vastaanottajaUid`, `teksti`, `aika`, `luettu`, `fromRole:'vp'` | Master_v16 `_kuunteleVpViestit()` (onSnapshot, `vastaanottajaUid==uid`) | VP_v25 `lahetaMentorointiViesti()` |
| **Valmentaja → Pelaaja+Vanhempi** | `seurat/{sid}/pelaajat/{pid}/havainnot/{id}` | `tyyppi:'valmentaja_viesti'`, `tila:'valmis'`, `teksti`, `valmentajaNimi`, `pelaaja_lukenut`, `vanhempi_lukenut` | Pelaaja_v7 `_p6KaynnistakuuntelIja` (onSnapshot) · Vanhempi_v2 `.where('tyyppi','==','valmentaja_viesti')` | Master_v16 `sendReply()` |
| **Pelaaja → Valmentaja** | `seurat/{sid}/pelaajat/{pid}/kirjaukset/{pvm}` | `tyyppi`, `kesto_min`, `fiilinki`, `rpe`, `lahde:'pelaaja'`, `paivitetty` (serverTimestamp) | Master_v16 `_lataaKirjaukset()` (`.orderBy('paivitetty')`) | Pelaaja_v7 `_tallennaKirjaus()` |
| **Vanhempi → Pelaaja** | `seurat/{sid}/pelaajat/{pid}/kehut/{id}` | `emoji`, `teksti`, `lahettaja:'Vanhempi'`, `luotu`, `nahty`, `kirjausId` | Pelaaja_v7 `_haePerhekehu()` (luotu>=48h, nahty==false) | Vanhempi_v2 `_lahetaKehu()` |
| **Vanhempi ← Valmentaja** | sama `havainnot/` kuin yllä | | Vanhempi_v2 Viestit-tab | (kuten yllä) |

### Master_v16 Inbox — yhdistetty syöte
`_getInboxEvents()` yhdistää `_kirjaukset` (pelaajien omatoimiset) + `_vpViestit` (VP:n mentorointi),
järjestää aikaleiman mukaan. VP-viestit purple-tagilla `note.to_coach`, pelaajien kirjaukset fiilis-emojilla.
Reaktiot (❤️💪⭐🔥) + "Viestitä perheelle →" -nappi jokaisessa kortissa.

### Korjatut bugit (2026-06-07)
- **`fiilinki_paivitetty` → `paivitetty`** (Master_v16): kirjaukset eivät näkyneet valmentajalle koska orderBy-kenttä ei ollut olemassa. Lisätty Timestamp `toDate()`-käsittely.
- **`from/to` → `lahettajaUid/vastaanottajaUid`** (VP_v25): Security Rules odottivat eri kenttänimiä kuin koodi kirjoitti.

### Ei toteutettu (tietoinen rajaus)
- ✅ ADAR-pikakenttien kirjoituspiste KYTKETTY (2026-06-15): ADAR_Pikakortti `saveCard()` replikoi kanonisen logiikan (§26)
- Sähköposti-/push-notifikaatiot — pilotissa ei tarvita, lisätään Sprint 6–7
- Pelaaja ei voi vastata valmentajalle (yksisuuntainen toistaiseksi)

## 35. KALENTERI — YKSILÄHTEINEN (2026-06-24, K1+K2+K3 valmis)

> Täysi kanoninen doc: **[`docs/KALENTERI_ARKKITEHTUURI.md`](docs/KALENTERI_ARKKITEHTUURI.md)** (visio + K1–K6-suunnitelma + kv-benchmarkit + §12 K2/§13 K3). Ristiriidassa täysi doc voittaa. Tämä §35 = tislaus + invariantit.

**Yksi totuuslähde:** `seurat/{seuraId}/kalenteri/{tapahtumaId}` (konsolidoitu, **Rules v3.5**). **K1 (commit `d1bc8c7`) poisti kaikki legacy-kalenterilähteet** — sekä VP_v25 (`lataaMuutTapahtumat`/`lataaVpKalenteri`/`_muutTapahtumat`/`_vpKalenteri`/`vpAvaaMentorointiModal`) että Master_v16 (legacy `tapahtumat`-concat) → ei enää duplikaattilähdettä, ei hiljaisia kirjoituksia kuolleeseen kokoelmaan. **Live-verifioitu** (grep 0 legacy-symbolia, `renderKalenteri` ehjä).

**Invariantit:**
1. **Kalenteri renderöityy VAIN kahdesta lähteestä:** `kalenteri` (poistettu==false) + `testitapahtumat` (§22-testityökalu) + TASO-ottelut (§20). EI muita.
2. **Pehmeä poisto** (`poistettu:true`) — säilyttää audit-jäljen, ei hard-delete.
3. **11 KALENTERI_TYYPIT** (VP_v25 ~5911). `avaaUusiTapahtuma()` kirjoittaa `kalenteri.add()` (~6082). `renderKalenteri()` yhdistää `_tapahtumat`(testitapahtumat) + `_kalenteriTapahtumat`.
4. Master_v16 `_lataaKalenteriTapahtumat` lukee saman `kalenteri`-kokoelman; kuollut `_avaaUusiTapahtuma` (avasi arkistoidun Testaus_v8:n) poistettu (commit `e5f6944`) — ainoa määritelmä on ~6800.
5. **Rules v3.5:** kalenteri-event: johto = täysi CRUD · valmentaja/talenttivalmentaja = täysi omiin (`luoja_uid==auth.uid`) + field-level muiden (muistiinpanot+lasnaolo_kooste) · create vaatii `luoja_uid==auth.uid`. `lasnaolijat`: johto + valmentajaroolit merkitsee, pelaaja self-RSVP (K2b). **Deployattu Consolesta 2026-06-24.**

**✅ K2 LÄSNÄOLO VALMIS (2026-06-24, kolme merkitsijäroolia):** valmentaja merkitsee toteutuneen läsnäolon (paikalla/myöhässä/poissa+syy) tapahtumanäkymässä → `kalenteri/{tid}/lasnaolijat/{pelaajaId}` (`merkitsija_uid`, serverTimestamp) + denorm. `lasnaolo_kooste` event-dokkiin (kalenterikortti "X/N", §26 ei alikokoelmakyselyä). Roster 3 tapauksessa: `pelaajat_id[]` → joukkue/joukkueet[] (§18) → `talenttiOhjelma==true` (talenttien lisätreenit). **Master_v16** (valmentaja/talenttivalmentaja) + **VP_v25** (johto, tuplaroolit — VP myös valmentaa, ei roolinvaihtoa). Tapahtuman LUONTI nyt myös valmentajalle/talenttivalmentajalle (`luoja_uid`); täysi muokkaus omiin, field-level muiden. Spec KALENTERI §12.

**✅ K3 TOISTUVAT VALMIS (2026-06-24):** jokainen toisto = aito `kalenteri`-dokki jaetulla `toistuvuus_sarja_id`:llä (EI virtuaali — K2-läsnäolo kiinnittyy per session). Jaettu `lib/tm_kalenteri.js` (`tmKalenteriOccurrences`/`tmToistuvuusPaiva`/`tmSarjaId`/`tmCadenceNimi`, 10 Vitest). Cadence viikoittain/2_viikottain/kuukausittain, cap 60, horisontti = kauden loppu. Muokkaus/poisto 3 skooppia (vain tämä `sarja_poikkeus` / tämä+seuraavat / koko sarja), poisto = soft-delete. Ei Rules-muutosta. Spec KALENTERI §13.

**Suunnitelma (KALENTERI_ARKKITEHTUURI §8/§11):** ✅ K1 konsolidointi · ✅ K2 läsnäolo (3 roolia) · ✅ K3 toistuvat → **jäljellä:** K4 muistutukset → **K5 kuorma+dropout-erottautuja** (läsnäolo→kuorma, ainutlaatuinen arvo — nyt avattu, K2+K3 tuottavat raakadatan) → K6 iCal-vienti (yksi feed kattaa Outlook+Teams). JOPOX-rajapinta = vain kirjanpito-API:t + TASO-ottelut (ei avointa kalenteri-API:a) §4.5; Outlook/Teams = jaettu M365-kalenteri → yksi iCal-feed, kaksisuuntainen Graph Sprint 8+ §4.6.

---

## 36. KORTTI-JÄRJESTELMÄ — keräilykortit (2026-06-24, Vaihe 0–1.5 rakennettu)

> Täydet docit: **[`docs/KORTTI_VISIO.md`](docs/KORTTI_VISIO.md)** (visio + SDT/Dweck-motivaatio + §10 3-kerros-arkkitehtuuri) + **[`docs/KORTTI_KATALOGI.md`](docs/KORTTI_KATALOGI.md)** (datavetoinen rekisteri, kaikki vaiheet). Ristiriidassa täydet docit voittavat.

**Periaate:** datavetoinen (`KORTTI_KATALOGI`-dataobjekti, EI kovakoodattu UI), ansainta **pikakentistä/teoista** (§26), EI vertailusta muihin (§7.22) eikä numero-grindistä lapselle näkyvänä (§22). Renderöinti pikakentistä — ei alikokoelmakyselyjä.

**Kolme keräilykerrosta (KORTTI_VISIO §10):**
- **Matkamerkit** (Vaihe 1) — tiheät pienet voitot, ratkaisee "pitkän odotuksen ennen avausta": saavutukset (`ach_*`), tekniikkamerkit per laji (pronssi→hopea→kulta = oma suhde `tkLajiViite`-viitetasoon + oma parannus), liekki-lepo (`liekki_tila`, väliin jäänyt päivä = lepopäivä, EI nollu).
- **Ennätykset (Vaihe 1.5)** — PB per testi, "voita oma itsesi". Uusi pikakenttä **`ennatykset: { <testi>: {paras, pvm, alusta} }`**, päivitetään kirjoitushetkellä (Excel_Tuonti/recalc/Testaus_v9). **Reunaehdot (pakolliset):** suunta per testi (`TK_LAJIT_META.kaanteinen`) · alustaherkkyys (§22, PB-vertailu vain saman alustan sisällä — tärkein vartija) · PHV-neutraalius (§28, ei "huononit"-kehystä) · kohina-kynnys.
- **Legendat (Vaihe 2)** + **Tähtikokoelma (Vaihe 3)** — arkkityypit (§14), EI oikeita nimiä (IP). Arvostetuin = **Sisukas** (sinnikkyys > lahjakkuus, Dweck) = tuotteen filosofia korttina. Idoli = lapsen oma valinta.

**Ikävaihe-gating (`_laskeStage`, §16):** leikkijä (U12) yksinkertaisin, **EI OVR-lukua**; rakentaja (U13–15); showcase (U16+). Saavutus-/merkki-/legendakortit toimivat KAIKISSA ikävaiheissa (positiivisia); vain pääkortin OVR-luku on ikägeitattu (gate ≥3 ulottuvuutta, OVR-lattia §28).

**Tila:** Vaihe 0 tasokortti (`naytaFcOverlay`, v3) ✅ · Vaihe 1 saavutukset+tekniikkamerkit+liekki-lepo (`rMinaKokoelma` Pelaaja_v7) ✅ · Vaihe 1.5 Ennätykset ✅. **Jäljellä:** Vaihe 2 legendat · Vaihe 3 tähtikokoelma · Vaihe 4 paljastus+kausi (pack-opening).

---

## 37. JULKINEN KIELI + KÄYTTÄJÄOPPAAT (2026-06-24)

**Termit julkisiksi (sisäinen jargon pois käyttöliittymästä):**
- **FLEI → "Kehon valmius"** (kehon valmiusindeksi, §14). Sisäinen `flei_*`-kenttänimi säilyy koodissa; vain UI-teksti vaihtuu. IDP "Fascia Load Efficiency Index" -jargon siivottu.
- **"Pelaajaraportti"** — EI "MDT" (termiä ei käytetä jalkapallossa). MDT = monialainen tiimi (terveydenhuollon termi), poistettu käyttäjäpinnasta. Spec: `docs/MDT_RAPORTTI_SPEC.md §0`.
- **Mittaus / Ottelu / Pelihavainto** — EI englanninkielisiä "Signs / Samples / SEO". (SEO=Sport Event Observation jne. = sisäisiä lyhenteitä, poistettu.)
- **ADAR ei ole enää käytössä** julkisena terminä (kenttähavainto-työkalu toimii silti §15/§26).

**Pelaajaraportti — roolit (§32, `docs/MDT_RAPORTTI_SPEC.md`):** valmentajalla on oikeus **omiin pelaajiinsa** — kirjaa tavoitteita + palautetta (Master_v16 Vaihe 2). VP näkee tavoitteet **read-only** (VP_v25 Vaihe 2.1, `_mdtJohtajaPaneeli`). VP + valmentaja keskustelevat näkökulmista. **Harjoitusarviointi-rooli (korjattu):** VP täyttää sekä malli A:n että malli B:n; **kalibraatio = ero valmentajan B-itsearvion ja VP:n B-havainnon välillä.**

**ROOLIMALLI-INVARIANTTI — pelitavoitteet (jaksofokus vs kausitavoite, 2026-07-05, PR #115 mainissa, `docs/CODE_TASK_VAIHE4A_ROOLIT_JA_DROPDOWN.md`):** kaksi tasoa, hyväksyntä oikeaan paikkaan. **Operatiivinen jaksofokus / teknis-taktinen pelitavoite (meso, Vaihe 4a toimintakortti)** = **valmentaja** asettaa omille pelaajilleen (omistaa kentän) · **talenttivalmentaja** talenteille · **VP** talenteille + oversight/override + näkee kaikki. **EI vaadi erillistä hyväksyntää** (ei byrokratisoida päivittäistä valmennusta). **Strateginen kausitavoite (makro, IDP 3a/3b)** = **VP asettaa/hyväksyy**; valmentaja ehdottaa Pelaajaraportissa. VP-hyväksyntä kohdistuu **kausitasoon, EI jokaiseen jaksoon.** Talenttipelaajilla (`talenttiOhjelma:true`) VP + talenttivalmentaja ensisijaiset. **Rules (deployattu):** field-level `jaksofokus`/`tt_positio_aktiivinen` -kirjoitus `onOmaSeura && (onValmentajaRooli()||onJohtoRooli())`. VP-toimintakortti talenteille (`_vpTtKorttiHTML`, `lahde:'vp'`). Konseptivalinta = **custom-dropdown** (`top:100%`, aukeaa alas — natiivi `<select>` aukesi ylös).

**ARVIOINTIKEHYS vs CURRICULUM -INVARIANTTI (2026-07-05, `docs/ARVIOINTIKEHYS_VS_CURRICULUM.md`):** kaksi eri kerrosta, EI yhdistetä. **Palloliitto-taksonomia** (`lib/tm_arviointi_taksonomia.js`, VP arviointi-välisivu, `ARVIOINTI_KEHYS_OLETUS='palloliitto'`) = **arviointikehys** — ~50 ominaisuutta D1–D5, mitattu 🟢 + havaittu 🔵 **1–5** ("mitä osaa", talenttivalmentajan profilointi). **OMA_VERSIO teknistaktinen** (`lib/tm_teknistaktiset.js`) = **valmennuskehys/curriculum** — konsepti→cue→harjoite **1–3** ("mitä harjoitellaan", toimintakortti/jaksofokus). Oma malli **EI tuoda arviointikehykseksi** (eri asteikko, eri tarkoitus). Kohtaavat vain suunnitellussa **silta-kytkennässä** (Palloliitto-heikko pääteema → ehdota OMA-konsepti+cue jaksofokukseksi = 4c/4d-alue, EI vielä rakennettu).

**Vaihe 4b — pelaajan cue-kerros (`docs/CODE_TASK_VAIHE4B_PELAAJA_CUE.md`, §0b jaettu ymmärrys):** valmentajan valitsema jaksofokus → pelaaja näkee **saman konseptin** Pelaaja_v7 MINÄ-näkymässä lapsen kielellä (mikä + miksi + **yksi cue-kysymys**). Uusi lib-helper `tmTtPelaaja(avain)` (ei KPI-lukuja) + `pelaaja_miksi`-sisältöpass 14 youth-konseptille. **§7.22:** ei tasolukuja/arvosanaa/vertailua. Data jaksofokus-pikakentästä (§26), fallback kehityskohde→vaihe-oletus. Perheen peilinäkymä = 3c-b/erikseen.

**Käyttäjäoppaat (`docs/`):**
- **OPAS_VP_JA_VALMENTAJA.md** — henkilöstön pelikirja (VP:n 5 johtamisaluetta · valmentaja · Pelaajaraportti+yhteistyö · data-herää-silmukka · in-app-suunnitelma).
- **OPAS_PERHE.md** — vanhempi+pelaaja (profiili rakentuu progressiivisesti · ikävaiheittain syvenevä data · Tänään-tehtävien alkuperä harjoitegeneraattorista + miksi · §7.22-turvallinen).
- **In-app aloitusopas** — 4 roolille (Pelaaja_v7 `_naytaTervetulo` · Vanhempi_v2 `_naytaVanhTervetulo` "kultainen sääntö: ei kavereihin" · VP/valmentaja "Aloita tästä" -kortit). Spec: `docs/INAPP_ALOITUSOPAS_SPEC.md`.

**Tänään-tehtävät (pelaaja-app):** tulevat `harjoitelogiikka_v4.js`-generaattorista (§A7/§7.25) — S-harjoite kohdistuu heikoimpaan FLEI-ketjuun, T-harjoite joka päivä. Oppaissa selitetty miksi ne näkyvät, mistä tulevat, miksi kannattaa tehdä — §7.22-kehyksessä (ei numeroita/vertailua lapselle).

---
