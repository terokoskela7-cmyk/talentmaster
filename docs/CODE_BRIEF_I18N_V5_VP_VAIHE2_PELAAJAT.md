# Code-brief — i18n VAIHE 5 · VP_v25 · **VAIHE 2: Pelaajat-näkymä + kortit sv**

> **Konteksti:** VP V0 · V1 · V1.1 · Vaihe 0 (common) · Vaihe 0.1 (glossaari-kanoni) mainissa ja verifioitu.
> Jaettu `lib/tm_i18n_common.js` on käytössä ja **`vpT` delegoi siihen** → jaetut/glossaaritermit resolvoituvat
> kanonisesti automaattisesti kun reitität ne. Nyt V2 = **Pelaajat-näkymä ja sen kortit** (käytetyin sisältönäkymä VP:ssä).
>
> **Vaihe 0 -etu tässä:** monet V2:n stringeistä ovat jo commonissa (Kehon valmius→Kroppslig beredskap ·
> Syöttö→Passning · Aktiivinen→Aktiv · roolit · yleisnapit). **Kun reitität ne `vpT()`:llä, ne kääntyvät kanonisesti
> ilman että lisäät mitään** (common voittaa). Lisää `tm_vp_i18n.js`:iin VAIN V2-spesifit body-stringit. **C1-portti
> kaataa buildin jos lisäät commonin avaimen VP-karttaan uudelleen** → jos avain on jo commonissa, älä lisää, reititä vain.

---

## Skooppi — V2-funktiot (reititä `vpT()`:llä JS:ssä)

| Funktio | Rivit (n.) | Sisältö |
|---|---|---|
| `renderPelaajatFiltered` | ~17670–17763 | **Pelaajataulukko** (rivit, signaalit, kalibraatio-CTA, mentoroi) |
| `renderFleiKortti` | ~16605–16656 | Kehon valmius -kortti (tila/CTA/trendi) |
| `renderKehitysKortti` | ~16657–16735 | TKI/TSI/Eerikkilä-kehityskortti + "Suunnittele TKK" |
| `renderKehitysLohko` | ~16736–16835 | skooppivalitsin (Koko seura/Talentit) + per-laji + kypsyysvihjeet |
| `renderTalentitLohko` | ~16836–17016 | Talentit-lista + Hidden Gem -ehdokkaat + taulukko-otsikot |
| `renderPoikkeamat` | ~17017–17098 | poikkeamasignaalit (alle normin/taso laskussa/hajonta…) + tuoreusvaroitus |

> **EI V2:ssa (rajaus):** `renderPelaajat_old` (~12459) = **kuollut koodi** (`playerTableBody`, ei kutsuta — `renderPelaajat`
> kutsuu `renderPelaajatFiltered`ia). Älä reititä; suositus poistaa erillisellä siivouscommitilla. `renderIdpJono`
> (kutsutaan, → V6). `avaaJoukkueSyvanakyma` + `_jsv*`-syvänäkymä (→ V3). `renderTeamPulse` (§26, oma).

---

## Arkkitehtuuri (sama kuin V1, nyt commonin päällä)
- Dynaamista JS-outputtia → **`vpT(fi)` JS:ssä** (ei data-i18n). Kielenvaihto re-renderöi (`vpVaihdaKieli → setWs`).
- **`vpT` → `tmI18nResolve(fi, TM_VP_I18N)`**: common voittaa → VP-sivukartta → fi. Glossaari/jaetut tulevat commonista.
- Interpolointi (§7.1): staattinen fragmentti `vpT()`:hen, arvo konkatenoituna. Sanajärjestys-templatet `{n}`/`{j}`
  placeholderilla kun ruotsin järjestys eroaa. Ei nested template literaleja.

---

## Reititettävä pinta (AUDIT — Layer 1)

### Kehon valmius -kortti (`renderFleiKortti`)
`mittausta ·` · `↑ nouseva` · `↓ laskeva` · `→ tasainen` · **`Kehon valmius -profiili`** (huom: "Kehon valmius" tulee
commonista → reititä koko fragmentti tai osa; sv "Kroppslig beredskap -profil") · `Ei vielä mittauksia` · `Avaa lomake →` ·
`{n}/5 ketjua` · `Viimeisin:` · `· 📍 päivitä` · `Täydennä profiili →` · `Päivitetty:`.

### Kehityskortti (`renderKehitysKortti`)
`{x}/100 · TKI` · `{t}/5 · Eerikkilä` · `TSI ka.` · `{n} pel.` · `Suunnittele TKK` · `{s} s · TSI` · `Aloita kartoitus` · `· koko seura`.

### Kehityslohko (`renderKehitysLohko`)
`Koko seura` · `Talentit ·` · **`Syöttö`** (common → Passning) · `Myöhäiskypsyjä — älä leikkaa` ·
`Varhaiskypsyjä — seuraa taitoa` · `Kehitä:` · title `TSI = pallon hidastus (pieni = vahva lajitekniikka)` (→ `data-i18n-title` tai `vpT` `title`-attribuuttiin).

### Talentit-lohko (`renderTalentitLohko`)
`Merkitse talenttipelaajat Seurahallinnassa — extra-valmennuksen kohteet` · `Talentit — extra-valmennuksen kohteet` ·
`{n} pelaajaa · ikäluokka → kehitysvaihe (kypsyyskorjattu, §28)` · **taulukko-otsikot** (Pelaaja · Jkl · Taso · D1 · D2 · TKI ·
Suunnanmuutos · Ikäluokka → Kehitysvaihe · Vauhti · H-H) · `Harkitse talenttiohjelmaan` ·
`Korkea tekniikka + matala fysiikka (Hidden Gem, §28) — ei vielä talenttiohjelmassa` · `H-H/Eerikkilä` · `★ nat.100`.

### Poikkeamat (`renderPoikkeamat`)
`aerobinen blokki` · `alle normin` · `jää jälkeen` · `Taso laskussa` · `→ tarkista kuormitus/motivaatio` ·
`Sisäinen hajonta` · `→ jakautunut joukkue` · `Talenttiydin alle normin` · `→ talent-ID-huoli` · `→ ei voi arvioida` ·
`{n} joukkuetta` · `Ikävaihe-odotetut (ei kiireellisiä)` · **`Joukkueilla on eri mittausajankohdat — vertaa varoen.`** ·
**`{n} joukkueen mittaus on yli 6 kk vanha.`** · `pre-PHV — biologisesti odotettua, ei kehityskohde` · `Päivitä mittaus` ·
`viimeksi {…} mitattu` · `2. mittaus puuttuu` · `⚠ Ikäharha Q1` · title-tekstit (`Joukkueen keskimääräinen TKI-muutos
edellisestä tekniikkakilpailusta` · `…H-H-muutos edellisestä testistä`) · `{n} parantunut)`.

### Pelaajataulukko (`renderPelaajatFiltered`)
`Hyväksy →` · `VP:n näkemykseen` · `tiimin yhteisnäkemykseen` · `{n} kalibraatio kertyy` · `· kaventuu ↓` · `Mentoroi →` ·
`— (kalibraatiot yhtenäisiä tai kertyvät)` · toast `Kalibraatiokutsu lähetetty`.
(Signaali-labelit **X-Factor · Hidden Gem · ⭐ Underdog** → ks. tuotetermit alla.)

> **§7.22/§34 metodologia:** V2 näyttää tasoluvut/TKI/TSI/Eerikkilä VP:lle (työkalu) — OK. **Säilytä data-tuoreuskehys**
> (`📍 päivitä` · `yli 6 kk vanha` · `eri mittausajankohdat — vertaa varoen`) merkitys; käännä neutraalisti, älä poista.
> §28-kypsyyskehys ("pre-PHV — biologisesti odotettua") säilyy — se on invariantti, käännä sisältö tarkasti.

---

## Tuotetermit — SÄILYTÄ englanniksi (§14), verifioi glossaarista
`X-Factor` · `Hidden Gem` · `Underdog` = **talenttisignaalien tuotenimet** — pidä ennallaan (kuten Hidden Gem VP:ssä jo).
Älä käännä ("Underdog" EI "Underdog→Outsider" tms.). Jos haluat lisätä ne commoniin identiteettikäännöksinä
(`'Underdog':'Underdog'`), se lukitsee ne — valinnainen. Vähintään: älä käännä.

## ⛔ ÄLÄ reititä (enum/logiikka)
- Signaali-enumit: `'xfactor'`, `'hidden'` (vertailuarvot `p.signaali === 'xfactor'`).
- Kalibraatiotila-enumit jos vertailtavia: tarkista `'yhtenäinen'/'lähenevä'/'eriävä'` — jos ne ovat **näyttö** (badge-teksti)
  → reititä; jos **vertailuavain** koodissa → **flagaa** (näytä-vs-avain, kuten Seura-riskilista). Oletus: näyttö → reititä,
  mutta varmista ettei niitä verrata stringinä muualla.
- ws-avaimet `setWs(...)`, DOM-id:t/CSS/onclick-nimet, `TalentMaster_Seura.html?seura=`-URL, `raw.githubusercontent…`-URL,
  `DM Mono` (fonttinimi), console-tagit `[kalib]`.

## Vartijat
- **fi ei rikkoudu; common+VP fallback → fi.** §5 ei tyylimuutoksia. §7.1 ei nested template literaleja.
- **Glossaari tulee commonista automaattisesti** (Kehon valmius/Syöttö/Aktiivinen/roolit) — **älä lisää niitä VP-karttaan**
  (C1-portti kaataa). Vain V2-spesifit stringit `tm_vp_i18n.js`:iin.
- **§26 ei alikokoelmakyselyjä** — et kosketa datapolkuun, vain näyttöön.

## Cache-bust (§27.4)
`tm_vp_i18n.js` muuttuu (uudet V2-avaimet) → **`?v=7 → ?v=8`**. Common ei muutu (jos et lisää sinne mitään) → `tm_i18n_common.js?v=2` ennallaan.

## DoD (Vaihe 2)
- **Pelaajat-näkymä + 5 korttia sv-tilassa 100 % ruotsiksi**: taulukko (signaalit/kalibraatio/mentoroi), Kehon valmius -kortti,
  kehityskortti (TKI/TSI/Eerikkilä), kehityslohko (skooppi + kypsyysvihjeet), Talentit-lohko (+ taulukko-otsikot), poikkeamat
  (+ tuoreusvaroitukset + §28-kehys). Tuotetermit (X-Factor/Hidden Gem/Underdog) ennallaan.
- Glossaaritermit resolvoituvat commonista kanonisesti (Kroppslig beredskap/Passning/Aktiv). C1-portti vihreä (VP∩common=∅).
- fi-regressio ehjä. Vitest: V2-avainkattavuus + fi-fallback + C1. `npm run lint` EXIT 0.

## Verifiointi (Claude — 4-kerrosportti)
1. Kielineutraali gate V2-funktioista → 0 reitittämätöntä näkyvää (kuolleen `renderPelaajat_old`:n saa jättää — merkitse poistoon).
2. Live fi/sv render-diffi (injektoitu seura.kieli='sv'): Pelaajat + kortit molemmilla kielillä.
3. Toast/alert-audit (kalibraatiokutsu ym.).
4. `${…} <literal>`-vierus + glossaari-portti: Kehon valmius→Kroppslig beredskap, Syöttö→Passning renderöityvät kanonisesti; 0 kiellettyä varianttia.

## Rajaus (EI V2:ssa)
V3 Joukkue-syvänäkymä (`avaaJoukkueSyvanakyma`+`_jsv*`) · V4 Kalenteri · V5 Valmentajat · V6 IDP/renderIdpJono · V7 Testit/Raportointi.
Kuollut `renderPelaajat_old` (erillinen siivous).
