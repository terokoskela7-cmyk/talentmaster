# Code-brief — i18n V5 · VP_v25 **alaerä V7d: Joukkueäly (`renderJoukkuealy`) [15770–15884]**

> **Konteksti:** V3–V7c mainissa, live-verifioitu (?v=24). Perit vahvan gaten: per-occurrence · staattinen-DOM · MEMBER_DISPLAY · `.textContent`/0B · resolves · `SETTER_FNS={toast,_setTxt,_dSet,idrow,kpi,fp,set,sel}` · ConditionalExpression-kävely · DISPLAY_PROPS={teksti} · **§0A PRODUCT-koko-literaali (ei substring)** · codeish rgba/BEM.
> **Kova opetus pätee: gate-vihreä EI riitä.** V7d:ssä on **kaksi uutta display-helperiä (`act`, `tier`) + concat-lauseita** → §0 alla. Reititä JA rekisteröi JA aja live.

## Scope
`renderJoukkuealy` [15770–15884] — seuratason Joukkueäly-dashboard: KPI-nauha, talenttijakauma (5D-radar + valmiusjakauma + talenttiportaat), pelipaikka-syvyys, RAE/PHV-kypsyys, potentiaali-projektio (scouting), toimenpide-kortit (`act`), ulosraportti-shell.
**Yläraja-lukko:** loppuu **15884** (`window.renderJoukkuealy = …`). `renderRaportointi`@15886 = **V7e** — ÄLÄ mene sinne.

## §0 (KRIITTINEN, ENSIN) — display-helper-rekisteröinnit
Lisää `SETTER_FNS`:iin (rivi ~121) — nämä helperit renderöivät label-argumentit näytöksi, gate on niille sokea kunnes rekisteröity:
| Helper | Rivi | Display-argumentit | Toimenpide |
|---|---|---|---|
| **`act`** | 15859 | `act(sev, teksti, sub, nappi, toiminto)` → `teksti`·`sub`·`nappi` näyttöä | **lisää `'act'`** + reititä (huom: `teksti` on usein **concat** `var + ' fi'` → fragmentti reititettävä) |
| **`tier`** | 15829 | `tier(n, l, col)` → `l` (talenttiporras-label) | **lisää `'tier'`** + reititä `l` |
| **`qcol`** | 15843 | `qcol(q, key)` — `q` on luku (data), `key`=enum → **ei display-labelia** | ei rekisteröintiä (tarkista) |
| **`phvBar`** | 15844 | `phvBar(lb, n, key)` → `lb` (PHV-vaihe-label) | reititä `lb` (`'Ennen'`·`'Kasvupyrähdyksessä'`·`'Jälki'` ym.) — jos bare-arg, **lisää `'phvBar'`** |

`kpi`/`fp` ovat jo SETTER_FNS:issä → niiden label-argit gate nappaa (reititä silti).

**Negatiivitesti per uusi helper:** `act('red','Raakateksti', vpT('ok'), vpT('ok'))` → gate failaa `Raakateksti`; `act('red', vpT('OK'), …)` → ei.

## §1 enum-raja (PYSYY fi — ÄLÄ reititä)
- **Status-enumit** (`r.status`, `sev`: `'red'/'amber'/'teal'`) · **RAE-kvartaalit** `'Q1'–'Q4'` (kartta-avaimet + vertailut) · **`_jaIka`-tokenit** (ikävaihe-suodatin-arvot) · **pelipaikka-avaimet** (`r.ryhma` jos Firestore/enum) · `key`-argit (qcol/phvBar).
- pelaajanimet (`_jaNimi`, `r.nimet`) · joukkue · id:t · `_jaIka`-token esc:ttynä · Firestore-arvot · tuotetermit (X-Factor/Hidden Gem/Scouting verbatim).

## Analysoidut näyttösitet (reititä; gate paljastaa loput §0:n jälkeen)
**Section-otsikot + subit (markup → gate näkee):** `Talenttitilanne` · `Talenttijakauma` (+ sub "Keitä meillä on — 5D-profiili vs. kansallinen normi…") · `Pelipaikka-syvyys` (+ "Missä on syvyyttä ja missä aukko — depth chart…") · `Suhteellinen ikä & kypsyys` (+ "Onko valinnassa vinoumaa — syntymäkvartaali (RAE)…") · `Kehitysmomentum & tuki seuralle` (+ "Ei pelkkä raportti — jokainen rivi on toime…") · `Ulosraportti` (+ "Seuratason koosto Head of Talentille / Palloliitolle…") · `Seurakooste` · `Joukkueen 5D vs. normi (taso 3)` · `Valmiusjakauma (FLEI)` · `Syntymäkvartaali` · `PHV-vaihe (kypsyys)` · `💎 Scouting-linssi · johto-only` (Scouting verbatim) · `Potentiaali-j…` · `Ei FLEI-dataa.` · `Ei vielä arvioit…` · `Pelipaikka kirjaamatta` · `Scouttausprojektio, ei kehitysarvio.`
**KPI-labelit** @15819–15822: `Pelaajia` · `Valmius ka` · `Talenttia HOT:lle` · `Review ajan tasalla` + subit (`▸ aseta kansallinen vertailu` · `… X-Factor · … Hidden Gem` (tuotetermit) · …).
**fp-suodatin** @15812: `Koko seura`.
**act-kortit** @15862–15871 (concat — fragmentit reititettävä): `' valmentajaa ilman mentorointikirjausta (14 pv)'` · `'oversight-signaali · vaikuttaa review-terveyteen'` · `'IDP-kattavuus '`+n+`' %'` · `' pelaajaa ilman ak…'` · `' = yleisin kehi…'` · `' pelaajaa jumissa — DVI ei etene'` · `'vaativat kehityskeskustelun (Review-cockpit)'` · `' pelaajaa odottaa sitoumuksen vahvistusta'` · `'pelaaja sitoutui → valmentaja/VP vahvistaa'` · napit `'Katso →'` · `'Vahvista →'` · `'M…'`. **§7.22-sävy + VP→UA-lukko** (VP→UA, valmentaja→tränare).
**phvBar-labelit:** `Ennen` · `Kasvupyrähdyksessä` · `Jälki` (tarkista tarkat arvot).

## 🔒 Kanoninen sv (⚠ = vahvista Terolta; [K]-kartta voittaa — dup-check ENSIN)
```
# KPI + suodatin
Pelaajia→Spelare · Valmius ka→Beredskap snitt · Talenttia HOT:lle→Talanger till HoT · Review ajan tasalla→Granskning uppdaterad · Koko seura→Hela föreningen
▸ aseta kansallinen vertailu→▸ ange nationell jämförelse
# section-otsikot
Talenttitilanne→Talangläge · Talenttijakauma→Talangfördelning · Pelipaikka-syvyys→Positionsdjup · Suhteellinen ikä & kypsyys→Relativ ålder & mognad
Kehitysmomentum & tuki seuralle→Utvecklingsmomentum & stöd till föreningen · Ulosraportti→Utrapport · Seurakooste→Föreningssammanställning
Joukkueen 5D vs. normi (taso 3)→Lagets 5D vs. norm (nivå 3) · Valmiusjakauma (FLEI)→Beredskapsfördelning (FLEI) · Syntymäkvartaali→Födelsekvartal · PHV-vaihe (kypsyys)→PHV-fas (mognad)
Potentiaali-jakauma→Potentialfördelning · Ei FLEI-dataa.→Ingen FLEI-data. · Pelipaikka kirjaamatta→Position ej registrerad
# PHV-vaiheet ⚠ domain
Ennen→Före · Kasvupyrähdyksessä→I tillväxtspurt · Jälki→Efter
# act-fragmentit (§7.22 · VP→UA)  ⚠ pitkiä — käännä sävy säilyttäen
valmentajaa ilman mentorointikirjausta→tränare utan mentorsanteckning · IDP-kattavuus→IDP-täckning
pelaajaa jumissa — DVI ei etene→spelare fast — DVI rör sig inte · pelaaja sitoutui → valmentaja/VP vahvistaa→spelare åtog sig → tränare/UA bekräftar
Katso →→Visa → · Vahvista →→Bekräfta →
```
(⚠ täydennä loput act-fragmentit + varmista talenttiportaat-labelit tier():ssä — X-Factor/Hidden Gem/Seuranta/Kehityskohde: tuotetermit verbatim, Seuranta→Uppföljning · Kehityskohde→Utvecklingsområde.)

## Domain-invariantit
- **§7.22-sävy:** act-kortit ovat **toimenpide-ohjeita, kannustava/ohjaava** — ei rankaisevaa. Säilytä sävy.
- **RAE / syntymäkvartaali:** Q4=ikäluokan nuorin (underdog-huomio), Q1=vanhin — säilytä RAE-kehys (§34). PHV-kypsyys §28.
- **Scouting-linssi (johto-only):** näkyvyyslogiikka ehjä. D3/VP→UA-lukko.

## render-gate RANGES + DoD
1. `RANGES += [[15770, 15884]]` (alle `renderRaportointi`@15886).
2. **SETTER_FNS** += `act`, `tier` (+ `phvBar` jos bare-label). PRODUCT/§0A jo paikallaan.
3. **Portit:** lint 0 · resolvi uusille (`R(k)!==k`) · C1 ∅ · sv-dup 0 · suite vihreä · inline-parse 0 · **5 vartijaa 0** (uudet negatiivitestatut) · `?v` +1.

## Verifiointi (Claude, per commit)
1. 5 vartijaa 0 · **riippumaton acorn-skanni [15770,15884]** (helper-arg + concat + §0A-korjattu PRODUCT) → 0 aitoa · lint 0 · C1 ∅ · resolvi.
2. **Live (demo sv) — PAKOLLINEN:** Raportit → Joukkueäly → 0 näkyvää fi (pl. tuotetermit); KPI:t/act-kortit/section-otsikot/PHV-vaiheet sv; enum ehjä (`sev`/`r.status`/`Q1–Q4`). Suodatin (Koko seura → Hela föreningen). 5D-radar-labelit tarkista.
3. Domain: §7.22-act-sävy · RAE/PHV-kehys · Scouting-näkyvyys · VP→UA.

## Seuraava
V7d 5 vartijaa 0 → merge + live → **V7e Nominees + tekstiraportti** (`renderRaportointi` 15886–~16080 + `lahetaRaportti`@15915 — kausikooste-`L.push`-tekstiraportti, huolellinen käännös; sulkee V7-klusterin) → **V8 Työkalut+Asetukset** viimeistelee koko VP:n sv:ksi.

> **Muistutus:** näyttöteksti vuotaa monta epäsuoraa reittiä (helper-argit, concat, ternaary→var, return-fi, object-property, lib-data). Rekisteröidyt helperit + MEMBER_DISPLAY + §0A kattavat suuren osan — **loput nappaa vain live.** Aja se ennen "valmis".
