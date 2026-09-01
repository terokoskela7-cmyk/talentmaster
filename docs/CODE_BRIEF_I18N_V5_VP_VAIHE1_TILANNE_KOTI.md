# Code-brief — i18n VAIHE 5 (henkilöstö) · VP_v25 · **VAIHE 1: Tilanne + Koti** (laskeutumisnäkymä sv)

> **Konteksti:** V0 (infra + aina-näkyvä chrome) on **kiinni ja live** — kieli-init (`seura.kieli`), kielivalitsin,
> topbar/sivupalkki/breadcrumb/login 100 % sv, viimeinen Google-login-aukko mukana (`vpT('Kirjaudu Google-tilillä')` →
> "Logga in med Google-konto"). `tm_vp_i18n.js?v=3` mainissa. **Nyt V1 = ensimmäinen SISÄLTÖnäkymä.**
>
> **Miksi Tilanne+Koti ensin:** se on laskeutumisnäkymä — ensivaikutelma sv-VP:lle (EIF/GrIFK/VIFK/Sibbo).
> Ohjelmasuunnitelman (CODE_BRIEF_I18N_V5_VP_OHJELMA…) V1-rivi.

---

## Skooppi — V1-funktiot (reititä nämä, EI muuta)

| Funktio | Rivit (n. mainissa) | Sisältö |
|---|---|---|
| `_renderKausipalkki` | ~3100 | kausipalkin labelit (Kausi/Viikko/% kaudesta käyty) |
| `_kpiPelaajatKonteksti` · `_kpiFleiTrendi` · `_kpiTestitKonteksti` | ~3112–3147 | KPI-alatekstit |
| `renderTilanne` | ~3149–3214 | hero-insight, KPI-labelit, review-lippu |
| `_greeting` · `_greetingNimi` | ~3228–3241 | tervehdys (Hyvää aamua/päivää…) |
| `renderDeadlinePalkki` | ~3260–3433 | aloitus-askeleet + seuraava-testi-palkki |
| `renderSignaalit` (moottori) + `_renderSignaaliLista` + `_sigRivi` + `_sigStub` | ~3306–3520 | **signaalimoottorin viestit** (otsikko/kuvaus/CTA + osio-otsikot) |
| `renderKotiVP` + `_ohSyytVP` | ~15979–16069 | **Koti-näkymä**: signaalikortit + suppilostrippi + muistutusflow |
| `renderVpAloitaKortti` | ~16073–16123 | "Aloita tästä" -onboarding-kortti + opas |

> **Rajaus (EI V1:ssä):** `renderKehitysLohko` · `renderTalentitLohko` · `renderPoikkeamat` (→ V2 Pelaajat) ·
> `renderIdpJono` (→ V6). renderTilanne KUTSUU näitä, mutta niiden **sisältö saa jäädä fi:ksi** kunnes niiden vaihe tulee
> (sama periaate kuin V0:ssa: kehys käännetään, upotettu ali-näkymä myöhemmin). ÄLÄ reititä niitä tässä.

---

## Arkkitehtuuri — KRIITTINEN ERO V0:aan

**V0 oli STAATTISTA HTML:ää** → `data-i18n`-attribuutti + `vpLokalisoi()`-sweep riitti.
**V1 on DYNAAMISTA JS-outputtia** — `renderTilanne`/`renderKotiVP`/`renderSignaalit` **rakentavat `innerHTML`:n joka
renderissä**. `data-i18n`-sweep EI tavoita näitä (ne luodaan uudelleen joka kerta). → **Reititä `vpT(fi)`:llä JS:ssä.**

- **`vpVaihdaKieli(lang)` re-renderöi jo nykyisen ws:n** (`setWs(_currentWs)`) → kun käärit fragmentit `vpT()`:hen,
  **kielenvaihto toimii automaattisesti** (Tilanne/Koti piirtyy uudelleen sv:nä). Ei uutta kytkentää tarvita.
- Avainnamespace: **plain-text fi-merkkijono** on avain (kuten V0 login: `vpT('Kirjaudu Google-tilillä')`).

### Käännösmuisti — Kimin sv on jo olemassa, mutta VÄÄRÄSSÄ avainmuodossa
`docs/VP_SV_KAANNOSMUISTI.json` (2229 paria) + live `lib/tm_vp_i18n.js` (2234 avainta) sisältävät Kimin sv:n,
MUTTA **905 avainta on kokonaisia HTML-fragmentteja** (fork-diff-artefakteja, esim.
`"<span class=\"deadline-label\">Seuraava testi</span>": "<span…>Nästa test</span>"`). **`vpT('Seuraava testi')` EI
osu näihin** (se hakee plain-text-avaimella). → **Poimi plain-text-sv Kimin fragmenttiarvosta** ja lisää **plain-text-avain**
`TM_VP_I18N`:iin. Sv on siis jo käännetty — kaiva se fragmentista, älä käännä uudelleen. Esim:
- Kimillä: `"<span class=\"deadline-label\">Seuraava testi</span>" → "…Nästa test…"` → **lisää** `'Seuraava testi': 'Nästa test'`.
- Osa plain-avaimista on jo (`'Mentoroi'`, `'Aloita tästä'`); osa puuttuu (`'Seuraava testi'`, `'Vinkki'`, `'Kriittiset signaalit'`) → poimi/lisää.
- **Aidosti puuttuvat** (ei Kimillä missään muodossa) → käännä lukitulla sanastolla + **lisää `docs/VP_SV_KAANNOSMUISTI.json`:iin** (pidä kasvavana SSOT:na).

### Interpolointi (§7.1 — ei nested template literaleja)
Moni V1-stringi interpoloi arvoja (`n + ' pelaajaa lähellä pronssia'`). Reititä **staattinen fragmentti**, säilytä arvo:
- Yksi arvo: `n + ' ' + vpT('pelaajaa lähellä pronssia')` (ruotsi: "N spelare nära brons" — sanajärjestys OK jälkiliitteenä).
- Monta arvoa / sanajärjestys vaihtuu: **placeholder-template** `vpT('{n} pelaajaa · {j} joukkuetta').replace('{n}',n).replace('{j}',j)`
  → lisää template-avain karttaan. **Sanajärjestys ruotsiksi voi erota** — käytä template-muotoa aina kun sana tulee ennen/jälkeen lukua eri tavalla.
- **`+`-konkatenointi OK, nested template literaalit EIVÄT** (§7.1, Python-generoinnin double-encoding -riski).

---

## Reititettävä pinta (AUDIT — kielineutraali staattinen skannaus, Layer 1)

> Alla V1:n **näkyvät** merkkijonot ryhmiteltyinä. Tämä on skooppi. `{n}`/`{j}`/`{x}` = interpoloitu arvo.

### Kausipalkki + KPI
`Kausi {v}` · `Viikko {a}/{b} · {pct}% kaudesta käyty` · `{n} rekisteröity` · `↑ edellisestä mittauksesta` ·
`↓ edellisestä mittauksesta` · `→ ennallaan edellisestä` · `vanhin {pv} pv sitten` · `käsitelty tällä viikolla`.

### Tervehdys (_greeting)
`Hyvää yötä` · `Hyvää aamua` · `Hyvää päivää` · `Hyvää iltaa`. (`Super Admin` = säilytä; `valmentaja`-nimifallback → `tränare`.)

### Hero / review-lippu (renderTilanne)
`{n} vaatii toimenpiteitä` · `Ei kriittisiä havaintoja` · `🕐 {n} pelaajaa myöhässä reviewistä →`.

### Aloitus-askeleet + deadline (renderDeadlinePalkki)
`Aloita näistä kolmesta` · `Tarkista joukkuelistasi` · `✓ {n} pelaajaa tuotu` · `Suunnittele ensimmäinen testipäivä` ·
`Luo testi →` · `Kutsu valmentajat järjestelmään` · `Kutsu →` · `Seuraava testi` · `Testipäivä` (fallback) ·
`{n} päivää` · `Vinkki` · `Suunnittele toinen testipäivä vertailua varten`.

### Signaalimoottori (renderSignaalit — otsikko/kuvaus/CTA + aria-meta)
- `📍 Mitattu {kk} kk sitten) — päivitä mittaus ennen johtopäätöksiä.`
- `Harjoitettavuuskartoitus tekemättä — {j} joukkuetta` · `{n} pelaajalta puuttuu kehon valmius -profiili. Valmentajat eivät pysty yksilöllistämään harjoittelua ilman kartoitusta.` · `Avaa kartoituslomake →`
- `{j} joukkuetta — tekniikkataso tarvitsee tukea` · `TKI-keskiarvo {x}/100. Suositus: omatoimiharjoittelu-ohjelma valmentajalle.` · `Katso harjoitussuositukset →`
- `{n} IDP-ehdotusta odottaa hyväksyntää` · `Valmentaja on ehdottanut kehityspolkua — vahvista tai hylkää.` · `Avaa jono →`
- `{j} joukkuetta — TKI-data puuttuu osalta` · `{x}% pelaajista testattu. Lisää testipäivä ennen kauden loppua.`
- `{n} pelaajaa lähellä pronssia` · `TKI 35–54. Fokusoi omatoimiharjoittelu — pronssi on saavutettavissa seuraavassa kilpailussa.`
- `{n} pelaajaa ilman suostumusta` · `Huoltajille ei ole lähetetty rekisteröintikutsua tai suostumus on kesken.` · `Lähetä kutsut →`
- `{nimi} — seuran korkein TKI` · `Katso profiili →` · `{n} pelaajaa saavutti kulta- tai hopea-merkin`
- **aria/meta-variantit** (esim. `Tekniikkataso tarvitsee tukea · {j} joukkuetta`, `omatoimiharjoittelu-ohjelma valmentajille`,
  `TKI-data puuttuu osalta · {j} joukkuetta`, `lisää testipäivä ennen kauden loppua`, `TKI 35–54, pronssi saavutettavissa seuraavassa kilpailussa`) → **reititä nämäkin** (ruudunlukija/otsikko-attribuutit).

### Signaalilista + osiot (_renderSignaaliLista)
`Ei avoimia signaaleja tänään.` · `Seuranta` · `Onnistumiset` · `{n} vaatii toimenpidettä` · `Ei kriittisiä`.

### Signaali-stubit (_sigStub — toast/console)
`Harjoitettavuuskartoitus: {..} — tulossa` · `Harjoitussuositukset: …` · `IDP-jono — avaa Pelaajat-välilehti` ·
`Kutsut — avaa Seurahallinta` · `Katso profiili`.

### Koti-näkymä (renderKotiVP)
- `{n} valmentaja(a) ilman mentorointikirjausta ({pv} pv)` · `Mentoroi`
- `{n} Hidden Gem -nostoehdokasta (valmius ≥ {x})` · `Ehdota IDP`
- `{j} heikoin kehityskohde ({n} pelaajalla, mm. {x})` · `Luo treeniteema`
- `{n} pelaajaa kehon valmius alle 40 (klinikkalähetys)` · `Katso`
- `Rekisteröintikonversio {x} odottaa vastausta` · `Muistuta odottavia`
- `Valmentajan ja VP:n D3-arvio eroaa {n} pelaajalla → kalibraatio`
- suppilostrippi-labelit: `tuotu` · `kutsuttu` · `suostumus` · `konversio`
- `Kriittiset signaalit` · `✅ Ei kriittisiä signaaleja juuri nyt.` ·
  `Kun valmentaja hiljenee, nostoehdokas ilmaantuu tai kehityskohteita kasaantuu, näet ne täällä toimenpiteinä.` · `Aloita tästä →`

### Muistutusflow (_ohSyytVP)
ohitussyyt (näkyvät): `ei sähköpostia` · `liian pian edellisestä` · `max muistutukset täynnä` · `lähetysvirhe` ·
`Tarkistetaan…` · `Ei muistutettavia juuri nyt: kaikki {n} ohitetaan ({syyt})` ·
`🔔 Lähettää sähköpostimuistutuksen {n} huoltajalle (alaikäiset).` · `Ohitetaan {n}` · `Jatketaanko?` ·
`Lähetetään muistutuksia…` · `✓ Muistutus lähetetty {n} huoltajalle{ohitettu}` · `Muistutus epäonnistui: {x}` · `(ei oikeutta)`.

### Aloita tästä -kortti + opas (renderVpAloitaKortti)
askeleet: `Joukkueessa mitattuja pelaajia` · `Lue joukkuepulssi + signaalit` · `Tee harjoitusarviointi (malli A)` ·
`Avaa Pelaajaraportti` · `Lähetä mentorointiviesti valmentajalle` · `Näytä opas` · `Aloita tästä` · `Piilota opas` ·
`{n}/5 — valmis` · `{n}/5 askelta — klikkaa askelta siirtyäksesi.` · `📖 Näin johdat TalentMasterilla`.
**Opas-lohko** (koko sisältö, Kimillä valmiina fragmentteina): `Roolisi on nähdä kokonaisuus ja ohjata — …` ·
`1.1 Käynnistä datapolku` + sen `<ul>`-lista · `Johtamiskysymys: "Onko datapolkuni auki?"` · `1.2 Lue pulssi, tartu signaaleihin`
+ sen `<ul>`-lista · `Johtamiskysymys: "Mikä joukkue tarvitsee huomiotani tällä viikolla?"`.

---

## ⛔ ÄLÄ reititä (enum/logiikka/ws-avaimet — jätä ennalleen)
- **ws-avaimet** `setWs('...')`: `'koti'`, `'pelaajat'`, `'valmentajat'`, `'raportointi'` — navigaatioargumentteja, EI näyttöä.
- **Tila-/enum-arvot:** `'avoin'`, `'odottaa'`, `'annettu'`, `'pilotti'`, `'suunniteltu'` (testin tila) — vertailuarvoja.
- **Roolistringit:** `'valmentaja'` kun se on rooli-vertailu (EI kun se on tervehdyksen nimifallback → se käännetään).
- **Signaali-id:t / lähde-avaimet:** `'tekniikka_tuki'`, `'lahella_pronssi'`, `'tki_kattavuus'`, `'seuranta'`, `'positiivinen'`,
  `'kriittinen'`, `'kulta'`/`'hopea'` (merkki-enum), `'pos'`, sig-osio-id:t, `{lahde:'tki_gap'}` — logiikka-avaimia.
- **Virhekoodit:** `e.code || 'tuntematon'`, `'permission-denied'` — EI näyttöä (näytetään koodina).
- **DOM-id:t / CSS-luokat / onclick-funktionimet / CF-nimi `europe-west1`/`lahetaMuistutukset` / localStorage-avaimet.**

> **Käännä KYLLÄ nämä (näyttöfallbackit, EIVÄT enumeja):** joukkue `p.joukkue || 'Tuntematon'` → **`vpT('Tuntematon')` = "Okänt"** ·
> tervehdyksen nimifallback `'valmentaja'` → **`tränare`**.

---

## Vartijat
- **§7.22 / metodologia (henkilöstö):** VP on työkalu — tasoluvut/TKI/kattavuus saavat näkyä. MUTTA **säilytä
  data-tuoreuskehys** (`📍 Mitattu … kk sitten — päivitä mittaus ennen johtopäätöksiä.`) — käännä merkitys, älä pehmennä
  äläkä poista. EI "data vanhaa" -kieltä; sv = neutraali "päivitä mittaus" (esim. "Uppdatera mätningen före slutsatser.").
- **Glossaari (§14/§34, KANONINEN):** `kehon valmius` (EI "FLEI"/"fascia") — käytä sv-vastinetta johdonmukaisesti
  (perhepinnan/lib_sv:n mukaisesti). `pelihavainto`, `Kehityskohde`, `Hidden Gem` (jätä tuotenimi ennalleen), `TKI`/`H-H`
  (indeksilyhenteet ennallaan). Lajitermit jos esiintyy: Jonglering / **Slalom** (EI Dribbling) / Passning.
  **Ristiriita Kimin muistin kanssa → kanoninen voittaa** (Kimissä on virheitä, esim. Pujottelu→"Dribbling").
- **fi ei rikkoudu, fallback ehdoton:** puuttuva sv-avain → `vpT()` palauttaa fi:n (ei tyhjää). fi-tila identtinen nykyiseen.
- **§5:** ei väri-/fonttimuutoksia. **§7.1:** ei nested template literaleja.

## Cache-bust (§27.4 — KRIITTINEN)
- `lib/tm_vp_i18n.js` muuttuu (uudet plain-avaimet) → **bumppaa VP:n `tm_vp_i18n.js?v=3 → ?v=4`** (rivi ~19).
  Sama `?v` = sama cachetettu tavu → uudet avaimet eivät tavoita cache-first/CDN-klienttejä. VP:llä ei omaa SW:tä (ei PWA).
- version.json auto-bump hoituu mainissa (§33) — **ÄLÄ aja `version:bump` feature-haarassa.**

## DoD (Vaihe 1)
- **Tilanne + Koti sv-tilassa 100 % ruotsiksi**: kausipalkki, KPI-alatekstit, tervehdys, hero, aloitus-askeleet,
  deadline-palkki, **kaikki signaaliviestit** (otsikko+kuvaus+CTA+aria), Koti-signaalikortit, suppilostrippi,
  muistutusflow, Aloita tästä -kortti + opas. fi/sv (en additiivinen jos Kimillä; muuten fi-fallback).
- Kielenvaihto FI↔SV re-renderöi Tilanne+Koti oikein (vpVaihdaKieli → setWs).
- **Rajatut ali-näkymät (Kehityslohko/Talentit/Poikkeamat/IdpJono) saavat jäädä fi:ksi** — se on V1:n odotettu tila.
- fi-regressio ehjä. Vitest laajennettu (V1 plain-avainkattavuus + fi-fallback + interpolointi-template). `npm run lint` EXIT 0.

## Verifiointi (Claude — KORJATTU 4-KERROSPORTTI)
1. **Kielineutraali staattinen skannaus** — V1-funktioista reitittämättömät `>teksti<`/literaalit (poista `${vpT(…)}`) = 0.
2. **Live fi/sv render-diffi** — Tilanne+Koti molemmilla kielillä (injektoitu `seura.kieli='sv'` / EIF-VP); sana identtinen
   molemmissa = universaali TAI reitittämätön → tutki.
3. **Toast/alert-audit** — jokainen `toast(`/`alert(`/`confirm(`-kutsupaikka V1:ssä (erit. `_ohSyytVP`-muistutusflow) sv.
4. **`${…} <literal>`-vierus-skannaus** — interpoloinnin viereiset kovakoodatut sanat (erit. `{n} pelaajaa …`-fragmentit).

## Rajaus (EI V1:ssä)
V2–V7-näkymät (Pelaajat/Joukkue-syvänäkymä/Kalenteri/Valmentajat/IDP/Testit). renderKehitysLohko/Talentit/Poikkeamat/IdpJono
(kutsutaan, sisältö fi). 905 kuollutta HTML-fragmentti-avainta `tm_vp_i18n.js`:ssä = **erillinen siivous, EI V1:ssä**
(ne eivät riko mitään; vpT ei osu niihin).
