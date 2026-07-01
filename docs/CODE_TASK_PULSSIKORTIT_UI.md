# Code-tehtävä: Joukkuepulssi-korttien visuaalinen selkeytys (VP Tilanne)

> Valmis brieffi Code-agentille. Rajaus: **VAIN joukkuepulssi-kortit** VP_v25:n Tilanne-näkymässä (`renderTeamPulse`, §19/§26/§29). EI syvänäkymää (`avaaJoukkueSyvanakyma`), EI muita sivuja, EI muita näkymiä.
> Tavoite: nykyinen "punainen meri" → selkeä, kalibroitu, hierarkkinen. **Tärkein ei ole kosmetiikka vaan §28-värikorjaus** (pre-PHV matala fyysinen EI ole punainen/negatiivinen).
> Visuaalinen tavoite: chat-mockup 2026-07-01 (nykyinen vs. ehdotus).

## Periaate — 4 muutosta
Kaikki **puhtaasti esitystapaa** — laskenta (pikakentät §26, `laskeD1/laskeD2`, `renderSignals`, suunta/delta §29) EI muutu, vain miten ne piirretään.

### 1. ⭐ §28-VÄRIKALIBROINTI (tärkein — korjaa metodologiaristiriidan)
Nykyisin palkin väri on **arvon** funktio (matala = punainen) → pre-PHV matala fyysinen näyttää "huonolta", vaikka §28 sanoo sen olevan **neutraali, biologisesti odotettua.**
- **Palkin täyttö = brändin teal** (`--teal` #28B090, `rgba(40,176,144,X)`) — **yksi rauhallinen väri, skaalattu arvolla** (leveys = arvo/max). EI arvopohjaista punaista/keltaista.
- **D1 (fyysinen), kun joukkueen kehitysvaihe on pre-PHV** (kaista `pre` / `phv_tila` PRE·LAH, tai onNeutraaliPrePHV-logiikka §28/§64): näytä **neutraalina** + mikrokopio *"pre-PHV — biologisesti odotettua, ei kehityskohde"*. **Ei punaista.**
- Punaista (`--rae`/danger) käytetään **VAIN aidosti kriittiseen** (esim. FLEI<40 klinikka, aito taantuma §29 TKI<0 JA abs<0). Ei "alle ikänormin" -tilaan joka on pre-PHV odotettua.

### 2. Erota ARVO ja STATUS
- **Arvo** = luku (iso, selkeä) + teal-palkki. Kertoo tason.
- **Status** = erillinen pieni **väripiste + 1 sana** (🟢 ok / 🟡 seuraa / 🔴 kriittinen) — vain kun huomiota tarvitaan. Ei enää yhtä väriä joka koodaa sekä arvoa että hälytystä.

### 3. Tavoite-tikki palkkiin
- Pieni pystyviiva **tasolla 3** (60 % max-leveydestä) jokaisessa D1/D2-palkissa → "etäisyys tavoitteeseen" näkyy heti ilman numeron tulkintaa. Väri: `--text2` / hillitty.

### 4. Hierarkia + chip-siivous
- **D1/D2-luku isommaksi** (esim. 18–20px, DM Sans 500), label pieneksi (12px `--text2`). Selkeä "otsikko per kortti".
- **Paksummat palkit** (~10px) + **vaaleampi ura** (esim. `rgba(255,255,255,0.08)` carbonilla) → täyttö luettavampi.
- **Chip-soppa → yksi pääsignaalirivi:** tärkein status esiin (piste + sana); loput (2. mittaus puuttuu, ikäharha) **hiljaisiksi ikoneiksi/tooltipeiksi** tai deep-view'hun. Max 1 näkyvä sekundäärimerkki.
- Suunta (↑/↓ §29): pidä, mutta ↓ hillittynä (ei punainen-hälytys jos delta on odotettua/pieni).

## Guardrailit
- **Rajaus ehdoton:** vain `renderTeamPulse`-kortit Tilanne-näkymässä. Ei syvänäkymä, ei Master, ei muut.
- **Laskenta ei muutu** — vain piirto. Pikakenttä-arkkitehtuuri (§26) ja signaalilogiikka (`renderSignals` S6–S9) ennallaan; muutetaan miten signaali *näytetään*, ei milloin se lasketaan.
- **§28-invariantti:** pre-PHV matala fyysinen = neutraali, ei punainen. Tämä on korrekti­us­korjaus, ei pelkkä tyyli.
- **Brändi §5:** `--teal` #28B090 (EI #3EC9A7), `--amber` #E0A040 varoituksiin, `--blue` #2A5DB0. Carbon-tausta #111110, kortti #161614. Fontit DM Sans (body) / Cormorant (otsikot). **Ei off-brand-värejä.**
- **Mobiili §6:** vain YKSI `@media(max-width:768px)`; älä riko mobiililayoutia (slide-in ym.).
- **§7.22:** VP/valmentaja-näkymä — rauhallisempi ei-hälyttävä kehys tukee filosofiaa.
- Ei uusia riippuvuuksia. Ei versionbumppia (auto-bump mainissa).

## Verifiointi
- **Screenshot ennen/jälkeen** SJK-datalla (P14/P15/T14 ym.) + katso: teal-palkit, tavoite-tikki, pre-PHV neutraali (ei punaista), yksi status-rivi, isompi luku.
- Tarkista tumma + (jos tuettu) vaalea teema.
- Ei konsoli­virheitä; inline-syntaksi puhdas (ESLint no-undef -portti §60).

## Ei tähän (myöhemmin, erikseen)
- Syvänäkymä-modaalin sama käsittely.
- Alaosan FYYSINEN/TEKNINEN/VALMIUS/PELI-kortit (sama periaate, oma kierros).
- Feature branch → PR → merge.
