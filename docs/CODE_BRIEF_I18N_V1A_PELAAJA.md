# Code-brief — i18n VAIHE 1-A · Pelaaja_v7 (konsolidointi + ydinpinta)

> **Konteksti:** V0 (tm_lang.js-putki) mainissa; V0.5 (suostumus) PR #398. Tämä = **V1-A**, Pelaaja_v7:n i18n.
> Perustuu Coden RECONiin (vahvistettu): Pelaaja_v7:ssä on **jo rinnakkainen i18n** — `STR`-taulukko (rivi 493, 18 avainta
> fi/en/sv/de), `T(k)`, `loc`/`localStorage['tm_loc']` (rivi 513), `setLoc(l)`→`draw()` (rivi 515), näkyvä `.loc-btn`-valitsin
> FI/EN/SV/DE (rivit 455–458). `tm_lang.js` on jo ladattu (rivi 435) mutta appi ei käytä sitä. → **Kaksi kielitilaa
> (`tm_loc` vs `tm_kieli`) = aktiivinen bugi:** V0:n kieli-init asettaa `tm_kieli`:n, mutta STR-UI lukee `tm_loc`:ia.
> Ristiriidassa `docs/I18N_RUOTSI_SUUNNITELMA.md` (periaate #1: yksi käännöslähde) voittaa.

## PÄÄTETYT LINJAUKSET (Tero 2026-08)
1. **Saksa (DE) pudotetaan** → valitsin **fi/sv/en**. Poista DE-nappi; migraatiossa **jätä `de`-arvot pois** (ei tm_lang:iin). Saksa palaa omana kv-vaiheena jos saksankielinen seura tulee.
2. **Vaiheistettu:** **PR A** = konsolidointi + ydinpinta. **PR A2** = syvemmät näkymät. (Ks. laajuus alla.)
3. **Migroi STR kokonaan tm_lang:iin** (periaate #1). Ei kahta rinnakkaista taulukkoa.

## OSA 1 — Konsolidointi (PR A, koko appi hyötyy)
### 1a. Migroi 18 STR-avainta → `lib/tm_lang.js`
Siirrä STR-avaimet (fi/sv/en, **DE pois**) tm_lang:iin. Käytä **`pelaaja.*`**-kategoriaa; **jaa selkeät yleisavaimet
`yleiset.*`:iin** (uudelleenkäyttö Vanhemmassa/Masterissa): `back`/`start`/`done`/`pause`/`resume`/`ready`/`backHm` → `yleiset.*`;
navilabelit `tanaan`/`mina`/`meista` → `nav.*`; loput → `pelaaja.*`. **Säilytä kaikki nykyiset kutsupaikat toimivina**
(1:1-mäppäys per STR-avain; duplikaatit `today`/`tanaan` ja `back`/`backHm` saa dedupata kunhan kutsut osoittavat oikeaan avaimeen).

### 1b. `T(k)` delegoi jaettuun `t()`:hen
`T(k)` palauttaa nyt STR:stä; muuta se hakemaan tm_lang:ista (esim. sisäinen avainmäppäys `T('mina') → t('nav.mina')`),
niin että olemassa olevat `T('...')`-kutsut toimivat muuttumatta. **Fallback sv→en→fi** hoituu `t()`:ssä.

### 1c. Yksi kielitila: `tm_kieli` (poista `tm_loc`)
- `loc` lukee `tmNykyinenKieli()`:n; **poista `localStorage['tm_loc']`** erillisenä tilana.
- `setLoc(l)` → **`tmAsetaKieli(l)`** (tallentaa `localStorage['tm_kieli']`) **+ säilytä olemassa oleva `draw()`-re-render**.
- **Kertamigraatio (tärkeä, ei nollaa käyttäjän valintaa):** jos `localStorage['tm_loc']` on olemassa JA `['tm_kieli']` puuttuu,
  kopioi arvo kerran `tm_kieli`:in (`'de'` → `'fi'`, koska DE pudotettu), sitten poista `tm_loc`. Näin ruotsin aiemmin valinnut käyttäjä säilyttää sen.
- **`.loc-btn`-valitsin säilyy** (aina näkyvissä, myös kirjautumisnäkymässä `rPin`) mutta **DE-nappi pois** → FI/SV/EN. Aktiivinen `on`-luokka heijastaa `tmNykyinenKieli()`:tä.
- **Prioriteetti (yksi totuus):** `localStorage['tm_kieli']` (käyttäjän valinta) → `seurat/{id}.kieli` (V0 kieli-init) → `'fi'`.

## ⚠ §7.22-KORJAUS migraatiossa (EHDOTON)
STR-avain **`xpHint: '+40 XP · pitää liekin palamassa'`** sisältää **XP-kieltä, joka on §7.22/§16:n mukaan KIELLETTY
pelaajalle näkyvissä** (XP tallennetaan vain AI-agentille, ei koskaan renderöidä lapselle; ei loss-aversion/liekki-uhkaa).
- **Älä migroi tätä sellaisenaan.** Jos merkkijono renderöityy pelaajalle nyt, tämä konsolidointi on hetki **poistaa tai korvata**
  se §7.22-turvallisella sanoituksella (ei numeroita, ei XP:tä, ei "menetät liekin" -kehystä — esim. positiivinen prosessikannuste).
- Tarkista muutkin migroitavat STR-arvot samalla linssillä (streak-teksti OK jos positiivinen, ei uhkaa). **Jos epävarma renderöidäänkö `xpHint` — ilmoita ENNEN**, älä oleta.

## OSA 2 — Ydinpinnan irrotus (PR A)
Irrota näkyvät kovakoodatut suomenkieliset merkkijonot **vain ydinpinnalta** → `t('pelaaja.*')` / `yleiset.*` / `nav.*`:
- **Kirjautuminen:** `rPin` (PIN-syöttö, ohje, virheet, "Unohtuiko PIN?") + kielivalitsin näkyvissä tässä.
- **Navigaatio:** `rTabs` (alanavin labelit).
- **TÄNÄÄN / koti:** `rMinaHero`, `rTrain`/`rTIntro`/`rTGo`/`rTDone` napit + otsikot (harjoitteen **sisältö/"miksi" = dynaaminen → V4**, merkitse `// i18n TODO V4`).
- **MINÄ (ydin):** `rMina`, `rMinaHero`, `rMinaProfiili` otsikot/labelit + `rMinaAsetukset` (kielivalitsin täälläkin).
- **Yleisnapit:** Takaisin/Aloita/Valmis/Tauko/Jatka (`yleiset.*`).

**PR A2 (myöhemmin, ei tässä):** `rMinaKokoelma` (kortit/merkit), `rMinaKehityskaari`, `rMinaTekniikkaprofiili`/`rMinaFyysinenTavoite`/
`rMinaTavoite` detaljit, `rMinaTestit`/`rMinaFLEI`/`rMinaMAS`, `rMinaKehitysvaihe`, `rMinaItsearvio`, `rMinaKonseptiFokus`,
`rJoukkue`, `rMeista`, `rHaaste`/`rAikajana`, `rVapaa`/`rRPE`/`rHaptic`, in-app aloitusopas. Näissä §7.22 erityisen tarkkaan (tekniikka/tavoite).

## §7.22-EHDOTON sv-sanoituksessa (koko appi)
Vahvuus ensin · prosessikehu · **EI** vertailua muihin, uhka-/menetyskehystä, XP/progressbar/loss aversion -kieltä, tasolukuja/percentiilejä/TKI-laskua. Ruotsi ei saa tuoda uhkakehystä jota suomessa ei ole. Tyhjätilat CTA:na.

## Tekninen kuri
- **§7.1 string-concat `+`** — EI nested template literaleja (Pelaaja_v7 synttäri-bugi).
- **`lib/tm_lang.js` `?v=1` → `?v=2`** (tiedosto muuttuu; päivitä kaikissa lataavissa apeissa jotka lataavat saman version).
- **SW:** bumppaa **`sw_pelaaja.js` `tm-pelaaja-v12` → `v13`** (HTML muuttuu). `tm_lang.js` on **jo SW-allowlistissa** (rivi 64) — ei allowlist-muutosta. PRECACHE minimaalisena (§27.4).
- Logiikka (`getIdToken(true)`, `draw()`, PIN-auth) koskematon — vain teksti + kielitila.
- **Suomi ei rikkoudu:** fallback pitää fi:n; testaa fi + sv (+ en).

## DoD (PR A)
- STR migroitu tm_lang:iin (18 avainta, **DE pois**); `T()` delegoi `t()`:hen; **yksi kielitila `tm_kieli`** (tm_loc poistettu + kertamigraatio); vanha `.loc-btn`+`draw()` toimii jaettuna, DE-nappi poissa.
- Ydinpinta (kirjautuminen + nav + TÄNÄÄN + MINÄ-ydin + yleisnapit) renderöityy **fi/sv/en**; kielivalitsin vaihtaa välittömästi + valinta säilyy reloadin yli; **fi-regressio ehjä**.
- **`xpHint`-XP-kieli poistettu/korvattu** pelaajapinnalta (§7.22).
- Dynaaminen sisältö merkitty `// i18n TODO V4`, jää fi:ksi, ei kaadu. 0 kiellettyä väriä, molemmat teemat. §7.1. `tm_lang.js ?v` + SW-cache bumpattu.
- Vitest + eslint vihreä.

## Verifiointi (Claude L3)
Live headless **fi + sv + en, molemmat teemat:** kielivalitsin (FI/SV/EN, **ei DE**) näkyy kirjautumisessa + asetuksissa, vaihtaa
ydinpinnan välittömästi, valinta säilyy reloadin yli (yksi tila `tm_kieli`); ruotsiseuran oletus toimii kieli-initistä; fi-regressio
ehjä; `xpHint`-XP-kieli poissa pelaajapinnalta; fallback ei kaada; 0 kiellettyä väriä; SW-cache v13. **Poikkeama = ilmoita ENNEN.**

## Seuraavat (ei tässä)
PR A2 (Pelaajan syvänäkymät) · V1-B (Vanhempi_v2 — **RECON alkuun: sama STR-tyyppinen rinnakkaisjärjestelmä mahdollinen**) · V2 Master · V3 VP+Seura · V4 dynaaminen.
