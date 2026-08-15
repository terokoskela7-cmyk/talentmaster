# R5.3 — Kuorma-viimeistely: monisessio-merkki (nauha) + tuplalaskenta-vartija (valmentaja-rivi) · Code-brief

> **Miksi (R5.2-tarkastuksen 2 avointa havaintoa, varmistettu koodista):**
> R5.2 toi kuorman summautumaan oikein (`_vpViikkoPaivaAU` summaa kaikki `sessiot[]`), mutta jätti kaksi asiaa:
> **(1)** briiffin MUUTOS 4 "· N sessiota" -merkki jäi tekemättä → valmentaja ei näe että päivän palkki on monen session summa;
> **(2)** `_vpViikkoLataa` hydratoi muokattavan rivin RPE:n/keston **`sessiot[0]`:sta** kun 'valmentaja'-sessiota ei ole
> (eli päivällä on vain **pelaajan oma** sessio) → jos valmentaja avaa ja tallentaa rivin, `_vpViikkoTallennaRivi` kirjoittaa
> **uuden 'valmentaja'-session pelaajan arvoilla** → pelaajan sessio + valmentaja-kopio **lasketaan molemmat = tuplalaskenta.**
> Yleistapaus (valmentajan joukkuesessio + pelaajan *oma erillinen* sessio) on jo oikein; tämä korjaa vain sen reunatapauksen
> jossa valmentaja "vahvistaa" pelaajan omaa sessiota.
> **Koskee VAIN `TalentMaster_VP_v25.html`** (luku + näyttö + tallennusvartija). **Ei Pelaaja_v7:ää → ei SW-nostoa. Ei `?v`.**
> **Invariantit ennallaan:** sRPE johdetaan (rpe×kesto), EI tallenneta · summan totuuslähde = `sessiot[]` · A5-`luotu` · §7.22/GDPR.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse yli reimplementoinnin. **Älä koske:** `_vpViikkoPaivaAU`/`_vpViikkoMergeSessio`/`_vpViikkoSessioSk`
  -summauslogiikkaan · morfosykli-nauhan Oura-koodaukseen · MD-ankkurointiin · §28-kuormaan · ACWR-guardiin · jaksofokus A/B/C:hen ·
  läsnäolo/ääni/katselmus. **Vain: nauhan monisessio-merkki + valmentaja-rivin hydraatio/tallennus.**
- **§7.22:** kuorma valmentajan työkalu, ei pelaajalle. **GDPR:** terveyssyy ei kirjauksiin. **A5-vartija:** `luotu` ennallaan.

---

## MUUTOS 1 (nauha) — hienovarainen "· N sessiota" -merkki (R5.2 MUUTOS 4, tekemättä)

Morfosykli-kortti pysyy **yksi kortti / päivä** (rauhallinen). Laske luku luvussa ja näytä se kortissa **vain kun > 1**:

**1a. `_vpViikkoLataa` — laske `row.sessio_lkm`** (ei-lepo-sessioiden määrä; fallback 1 kun litteä-dokki):
```
row.sessio_lkm = Array.isArray(row.sessiot) && row.sessiot.length
  ? row.sessiot.filter(function (s) { return s.tyyppi !== 'lepo'; }).length
  : ((row.rpe != null || row.kesto_min != null) ? 1 : 0);
```

**1b. `_vpViikkoNauhaHTML` — kortin sisään pieni mono-merkki kun `row.sessio_lkm > 1`:**
- Teksti: `· ' + row.sessio_lkm + ' sessiota'`, tyyli **mono, `var(--ink3)`, ei väriä, ei teal** (teal vain jaksofokus A:lle — ennallaan).
- Sijainti: kortin ala-/metatekstissä (samassa rivissä MD-leiman kanssa tai sen alla) — **ei uutta laatikkoa, ei väriä.** Kuormapalkki heijastaa jo summaa (R5.2, ennallaan).

## MUUTOS 2 (luku + tallennus) — tuplalaskenta-vartija: valmentaja-rivi vain valmentajan sessiosta

**2a. `_vpViikkoLataa` — muokattavan rivin kentät VAIN 'valmentaja'-sessiosta** (ei enää `sessiot[0]`-fallback pelaajan sessioon):
```
// R5.3 — muokattava rivi = VALMENTAJAN sessio; pelaajan oma sessio EI hydratoi valmentaja-kenttiä (estää tuplalaskennan).
const vSess = row.sessiot.length ? (row.sessiot.find(function (s) { return _vpViikkoSessioSk(s) === 'valmentaja'; }) || null) : null;
const legacyFlat = !row.sessiot.length;   // vanha dokki ilman sessiot[]-taulukkoa
row.rpe        = vSess ? (vSess.rpe != null ? vSess.rpe : null)        : (legacyFlat ? (d.rpe != null ? d.rpe : null) : null);
row.kesto_min  = vSess ? (vSess.kesto_min != null ? vSess.kesto_min : null) : (legacyFlat ? (d.kesto_min != null ? d.kesto_min : null) : row.kesto_min);
row.lahde      = vSess ? (vSess.lahde || 'valmentaja') : (legacyFlat ? (d.lahde || 'valmentaja') : 'valmentaja');
// fokus_nimi/konsepti_avain/tavoite_tag/sessioId/lepo: sama periaate — vSess ensin, sitten legacyFlat (d.*), muuten tyhjä.
```
→ Kun päivällä on **vain pelaajan sessio**, valmentaja-rivi on **aidosti tyhjä** (RPE/kesto null), mutta päivän AU (`_vpViikkoPaivaAU`) **summaa pelaajan session edelleen** (summan totuuslähde = `sessiot[]`, koskematon).

**2b. Näyttövihje kun päivällä on vain pelaajan sessio(t)** (rehellinen, neutraali — Oura):
- Merkitse `row.vain_pelaaja = (!vSess && row.sessiot.length > 0)`.
- `_vpViikkoNauhaHTML`: kun `row.vain_pelaaja` → kortin metatekstiin pieni mono **"📱 pelaajan oma"** (`var(--ink3)`, ei teal, ei väriä).
  Kortti ei ole tyhjä eikä esitä valmentajan sessioksi. Kuormapalkki näyttää summan (ennallaan).

**2c. `_vpViikkoTallennaRivi` — älä kirjoita haamu-'valmentaja'-sessiota tyhjästä rivistä:**
```
// R5.3 — valmentajan sessio kirjataan VAIN kun rivissä on valmentajan sisältöä (estää haamu-session + tuplalaskennan).
const _valmSisalto = (row.rpe != null || row.kesto_min != null || row.tavoite_tag || row.fokus_nimi || row.konsepti_avain || row.lepo);
```
- **Jos `_valmSisalto`** → kuten R5.2: `sessio = { sk:'valmentaja', ... }`, `data.sessiot = _vpViikkoMergeSessio(existing, sessio)`.
- **Jos EI** → **älä lisää** valmentaja-sessiota: säilytä olemassa olevat sessiot ennallaan
  (`data.sessiot = _vpViikkoMergeSessio(existing, /* poista vain vanha valmentaja */)` → käytännössä suodata pois `sk==='valmentaja'` ja **älä concattaa uutta**; tai jätä `data.sessiot` asettamatta jolloin `set({merge:true})` ei kosketa taulukkoa). **Valitse jälkimmäinen (yksinkertaisin) — ilmoita ENNEN jos epäselvää.**
- **A5-vartija:** `luotu`/`createdBy`-haara ennallaan (älä muuta).

---

## INVARIANTIT + DoD
- **Ei tuplalaskentaa:** päivä jossa vain pelaajan sessio → valmentaja avaa+tallentaa ilman syötettä → **AU säilyy samana** (ei valmentaja-kopiota). Pelaajan sessio ei katoa.
- **Summa ennallaan:** `_vpViikkoPaivaAU` = kaikkien `sessiot[]`-sessioiden sRPE-summa (koskematon). Monisessio (joukkue + pelaajan oma) summautuu kuten R5.2.
- **Nauha:** `sessio_lkm > 1` → "· N sessiota" (mono/ink3). `vain_pelaaja` → "📱 pelaajan oma" (mono/ink3). **0 pinkkiä · teal vain jaksofokus A:lle · amber vain aito varoitus.**
- **Taaksepäin­yhteensopiva:** vanhat litteä-`rpe`-dokit → 1 sessio, valmentaja-rivi hydratoituu litteästä (legacyFlat). Ei kaadu.
- **§7.22/GDPR/A5:** pelaaja ei näe ACWR:ää · terveyssyy ei kirjauksiin · `luotu` ennallaan. **VP-only → ei SW-nostoa · ei `?v`.**
- **LIVE ennen valmista (protokolla — molemmat teemat):**
  - **Vain pelaajan sessio + valmentaja tallentaa tyhjän rivin:** AU **ei muutu** (ei tuplaa), kortissa "📱 pelaajan oma".
  - **Joukkue + pelaajan oma (2 sessiota):** kortissa "· 2 sessiota", AU = summa (R5.2 ennallaan).
  - **Valmentaja kirjaa oikean session pelaajan session päivälle:** molemmat lasketaan (tarkoituksellinen — erillinen valmentaja-sessio; sessio-sovitus = §35 K5 -jatko, EI tässä).
  - **Regressio:** morfosykli-näyttö · MD · §28 · ACWR-guard · A/B/C · läsnäolo/ääni/katselmus ennallaan. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ (mahdollinen jatko)
- **Sessio-sovitus** (pelaaja raportoi RPE:n *samalle* valmentajan joukkuesessiolle → yksi sessio, ei kaksi): §35 K5 -erottautuja, oma briiffi.
- Monisessio-**erittely** kortin napautuksessa (mitkä sessiot summautuvat) — nyt vain lukumäärä + summa.
