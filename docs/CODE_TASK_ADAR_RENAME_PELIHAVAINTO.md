# ADAR → "Pelihavainto" — julkisen kielen UI-rename (§37)

> Lähde: Tero 2026-07-03. §37-jatko ("ADAR ei ole enää käytössä julkisena terminä"). **VAIN käyttäjälle näkyvä teksti muuttuu** — sisäiset kenttänimet, funktiot, kokoelmat ja doc-rakenteet säilyvät (sama pattern kuin FLEI→"Kehon valmius"). Ei datamigraatiota, ei Rules-muutosta, ei version.json-bumppia.

## 0. Tausta — yksi ADAR, yksi lähde
Koko järjestelmässä on **yksi** ADAR-kirjoituspiste: kenttätyökalu `ADAR_Pikakortti.html` `saveCard()` → `havainnot/{id}` (`tyyppi:'adar'`) + pikakenttä `adar_viimeisin` (§15/§26/§32). Kaikki muu (IDP-kortin peliäly, VP joukkuepulssi D4, 2c havaittu-peliäly) **lukee** samaa pikakenttää. "Pelihavainto" on siis yksi käsite, joka esiintyy monessa näkymässä — rename koskee kaikkia sen näkyviä esiintymiä.

## 1. INVARIANTTI — mikä EI muutu (kriittinen)
Säilytä ennallaan (ei-julkiset, rikkoutuisivat jos muuttaisi):
- Firestore-kentät: `adar_viimeisin`, `adar_pvm`, `adar_havaintoja`, `adar_vahvin`, `adar_heikoin`, `havainnot`-alikokoelma, `tyyppi:'adar'`, `pisteet {A,D,Act,R}`.
- Funktio-/muuttujanimet: `paivitaAdarPikakentat`, `_dimNorm5Adar`, `tmAdarHavaittu`, `ADAR_HAVAITTU_MAP`, `adarHav`, `adarBadge` jne.
- Tiedostonimi `TalentMaster_ADAR_Pikakortti.html` (linkitys + bundler-polut) — EI nimetä uudelleen tässä.
- Kommentit / `console.log` / CLAUDE.md-tekninen jargon — voi jättää "ADAR"-nimelle (sisäinen).

**Muuta vain merkkijonot jotka renderöityvät käyttäjälle** (napit, otsikot, selitteet, badge-tekstit, signaaliviestit, tooltipit).

## 2. Kohteet

### 2.1 `ADAR_Pikakortti.html` (työkalu itse)
- Näkyvä `<title>` + sivun pääotsikko "ADAR Pikakortti" → **"Pelihavainto"**.
- Näkyvät osiootsikot/napit: "ADAR Vision" → **"Pelihavainto — kuva"** (tai "Lisää kuva"), "ADAR-napit"/"ADAR 3) Pisteet" -tyyliset UI-tekstit → "Pelihavainto". Vaihe-korttien näkyvä ADAR-kirjaimisto (A/D/Act/R) säilyy (metodologia), mutta työkalun **nimi** = Pelihavainto.
- Käyttäjälle näkyvät toast/statusviestit ("ADAR-analyysi tallennettu") → "Pelihavainto tallennettu".
- **Bundler-huom (§15):** päälogiikka on `__bundler/template`-scriptissä JSON-enkoodattuna → tekstimuutokset template-stringiin **raw-string-indeksihaulla**, EI `json.loads/dumps` (double-encoding korruptoi). Jos rename osuu templateen, muokkaa `_pikakortti`-generointiskriptillä / raw-korvauksella.

### 2.2 Launcherit (Master_v16 + VP_v25)
- VP_v25 "Työkalut"-sidebar: "ADAR-kenttätyökalu" → **"Pelihavainto"** (napin teksti + kuvaus). Esiintymät mm. ~1812, ~2966, ~5498/5501 (launcher-malli). Linkki `ADAR_Pikakortti.html?seuraId=` säilyy.
- Master_v16 sidebar-launcher (ADAR-kenttätyökalu) → **"Pelihavainto"**.
- Näkyvät VP-signaalit/labelit: "ADAR · Peliäly" (~5226) → "Pelihavainto · Peliäly"; S9-signaaliteksti "ADAR-havainnointi…/ADAR-havaintoa viim. 30 pv" (~3061/3072) → "Pelihavaintoja…/pelihavaintoa viim. 30 pv". VAI+ komponenttilabelit joissa näkyvä "ADAR 30%…" → "Pelihavainto 30%…" (vain jos renderöityy VP:lle; kommentit ei).

### 2.3 2c-badge (VP_v25 arviointi — tulee PR #85:ssä)
PR #85 lisäsi käyttäjälle näkyvän "ADAR"-badgen + selitteet. Yhtenäistä:
- Badge-teksti `>ADAR<` (`.jsp-arv-adar`) → **"PELIH."** (mahtuu 8.5px-chippiin; tooltip = "Pelihavainto — kenttähavainnosta johdettu, klikkaa antaaksesi oman arvion").
- Selite-rivi "…<span…>ADAR</span> = kenttähavainnosta johdettu…" → "…**Pelihavainto** = kenttähavainnosta johdettu…".
- Tooltipit "ADAR-pohjainen — klikkaa arvioidaksesi itse" / "ADAR-pohjainen (kenttähavainto)…" → "Pelihavainnosta johdettu — klikkaa arvioidaksesi itse".
- CSS-luokka `jsp-arv-adar` + muuttuja `adarBadge`/`onAdar`/`lahde:'adar'` **säilyvät** (sisäisiä).

## 3. Nimikollision välttäminen
Repossa on jo `TalentMaster_Pelihavainto_Palloliitto.html` (Palloliiton **pelipaikkakohtainen** pelihavainto). Erottelu käyttöliittymässä:
- Kenttätyökalu (ADAR_Pikakortti) = **"Pelihavainto"** (nopea kenttähavainto, A/D/Act/R).
- Palloliiton työkalu = **"Pelihavainto (pelipaikkakohtainen)"** tai "Palloliiton pelihavainto" launcher-tekstissä, jos molemmat näkyvät samassa valikossa. Älä yhdistä tiedostoja.

## 4. Järjestys (tärkeä)
1. **Merkitse PR #85 (2c/2d) mainiin ensin** (se on verifioitu). 
2. Tämä rename off **päivitetystä mainista** → näkee 2c-badgen koodin samassa tiedostossa → yksi PR kattaa työkalun + launcherit + 2c-badgen. (Vältetään auki olevan #85:n editointi.)

## 5. Invariantit + verifiointi
§37 (julkinen kieli) · §15 (bundler raw-string, ei json.loads) · §26/§32 (yksi ADAR-lähde, ei datamuutosta) · ei Rules- eikä version.json-muutosta · sisäiset nimet ennallaan (§1). Linkit `ADAR_Pikakortti.html` toimivat.
- **Verifiointi:** grep varmistaa ettei käyttäjälle näkyvää "ADAR"-tekstiä jää launchereihin/työkaluun/2c-badgeen; sisäiset `adar_*`-osumat OK. `npm test` + lint vihreät (ei logiikkamuutosta → testit muuttumattomat). Live: VP "Työkalut" näyttää "Pelihavainto", työkalu aukeaa, tallennus toimii; 2c-badge = "PELIH.".
