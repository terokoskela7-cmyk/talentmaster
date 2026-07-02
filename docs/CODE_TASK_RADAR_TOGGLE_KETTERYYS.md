# Code-tehtävä: Radar Fyysinen/Tekninen-toggle + kohortti-vakautus + ketteryys-korjaukset (VP_v25)

> Lähde: live-verify 2026-07-03 (Claude + Tero), Sibbo, PR #70:n jälkeen. Jatkoa `CODE_TASK_RADAR_TUKI_SEKADATA.md`:lle.
> Rajaus: VP_v25 joukkuesyvänäkymä (radar + Pelaajaraportti) + lib. §26 pikakentät, §5 tokenit, arviointilogiikka ennallaan.

## Tausta / oire
PR #70:n "rikkain patteristo voittaa" korjasi collapsen, mutta paljasti epävakauden: **radar-tyyppi vaihtuu kohortin (Paras/Top-5/Top-10/Koko joukkue) mukaan**, koska `tavoiteRadarAkselit` lasketaan kohortti-osajoukolle (`_jsvTilanneHTML(KP)` ~4757, `KP = valitseKohortti(pelaajat, _kohortti)` ~4682) ja akselimäärät ylittävät ≥3-kynnyksen eri osajoukoissa eri tavoin. Esim. T12: "Paras" (1 pel. Godt, HH3/TK<3) → fyysinen; "Top-5" (TK4) → tekninen. Lisäksi kolme pientä esitysvirhettä (alla).

## Osa A — Fyysinen | Tekninen -toggle + kohortti-vakautus (PÄÄTÖS: vaihtoehto A)
D1 Fyysinen ja D2 Tekninen ovat eri ulottuvuuksia eri akseleilla. Ratkaisu: **käyttäjän valitsema toggle**, tyyppi vakautettu joukkuetasolla.

1. **lib/tm_eerikkila_normit.js** — erota tyyppivalinta datasta:
   - Lisää `radarPatteristotSaatavilla(fullTeam)` → `{hh:bool, tk:bool}` (kumpi yltää ≥3 akseliin KOKO joukkueella). Käyttää olemassa olevaa `_radarAkselit`-helperiä.
   - Laajenna `tavoiteRadarAkselit(pelaajat, tyyppiPakotettu)` — jos `tyyppiPakotettu` ('hh'|'tk') annettu, palauta sen patteriston akselit annetuista `pelaajat`:ista (kohortti) ilman auto-valintaa (≥1 akseli → palauta, muuten null). Ilman parametria = nykyinen auto (taaksepäin-yhteensopiva).
2. **VP_v25 `_jsvRadarBlokki` / `_jsvTilanneHTML`:**
   - Laske saatavuus KERRAN KOKO joukkueesta (`pelaajat`, EI KP): `_jsvRadarSaatavilla = radarPatteristotSaatavilla(pelaajat)`. Tallenna joukkuekohtaisesti (nollaa kun joukkue vaihtuu, kuten `_jsvKohortti`).
   - Oletuspatteristo `window._jsvRadarBattery`: **'tk' jos tk saatavilla, muuten 'hh'** (SPL-primääri; §-metodologia: D2 kriittisin pre-PHV). Nollaa joukkueen vaihtuessa.
   - Radar piirretään `tavoiteRadarAkselit(KP, window._jsvRadarBattery)`:llä → **arvot kohortista, tyyppi vakaa**. Jos kohortilla ei ole valitun patteriston dataa → siisti tyhjä "Ei [teknistä/fyysistä] mittausta tässä kohortissa" (EI tyyppivaihtoa).
   - **Toggle:** jos molemmat saatavilla → segmentoitu `Fyysinen | Tekninen` -nappirivi radarin yllä (sama komponenttikuvio kuin Ikäluokka/Kehitysvaihe). `_jsvRadarBatteryNayta(b)` asettaa `window._jsvRadarBattery=b` + re-renderöi `#_jsvRadarSlot` (kuten `_jsvRadarNayta`). Vain toinen saatavilla → ei nappeja (SJK: fyysinen, ennallaan).
   - **Ika/keh-toggle** (olemassa) näkyy vain kun `battery==='hh'` ja kehitysvaihe saatavilla.
3. §5: napit teal-aktiivi/harmaa (kuten olemassa olevat togglet). Vakaa kohortista riippumatta = bugi korjattu.

## Osa D — Ketteryys puuttuu Pelaajaraportin Fyysinen-välilehdestä (VP_v25 ~5157–5162)
`friv(...)`-lista renderöi 10m/30m/CMJ/MAS/H-H kokonais mutta **ei kasirataa** (vaikka se on D1-fyysinen, §30 FYS). Lisää rivi (ehdollinen, `hv.kasirata != null`), CMJ/MAS-rivien seuraan:
```js
if (hv.kasirata != null) f1 += friv('Ketteryys', tasoOf('kasirata', hv.kasirata), hv.kasirata, 's', false, 'kasirata');
```
Sijoita loogisesti D1-fyysisten joukkoon (esim. MAS:n jälkeen, ennen H-H kokonais -riviä). Nimi **"Ketteryys"** (Osa E).

## Osa E — Näyttönimi "Kasirata" → "Ketteryys" (virallinen nimi; sisäinen id säilyy)
Vaihda VAIN näyttönimet, EI id/eerikkila/pikakenttä-avaimia (`kasirata` pysyy):
- `lib/tm_eerikkila_normit.js:942` radar-akseli `key: 'Kasirata'` → `'Ketteryys'`
- `lib/tm_eerikkila_normit.js:1401` `lisaaEer('kasirata', hv.kasirata, 'kasirata', 'Kasirata', ...)` → `'Ketteryys'` (per-testi-jakauma)
- `TalentMaster_Master_v16.html:2504` `nimi: 'Kasirata'` → `'Ketteryys'`
- `TalentMaster_VP_v25.html:3909` `label:'Käsirata'` → `'Ketteryys'` (korjaa myös kirjoitusvirhe)
- Osa D:n uusi friv-rivi käyttää 'Ketteryys'.
Tarkista grepillä ettei muita käyttäjänäkyviä 'Kasirata'/'Käsirata'-labeleita jää (esim. Testaus_v9 kenttäohjeet — jos on, vaihda nekin).

## Osa F — Desimaalien pyöristys näyttöön (liikaa: 5.227 s → 5.23 s)
Testiarvot renderöityvät raakana (`hv.lin30m` = 5.227). Lisää jaettu formatteri ja käytä KAIKISSA arvo-renderöinneissä:
- Helper (VP_v25, mielellään myös libiin jaettuna): `_fmtTestiArvo(arvo, yks)` → sekunnit **2 desimaalia** (5.227→"5.23"), cm **0–1 des**, km/h **1 des**, muut järkevästi. `Math.round`-pohjainen, ei float-artefakteja.
- Käyttökohteet: Osa D `friv` (VP ~5157–5162 arvot), VP per-testi-jakauma (lib `lisaaEer` → caller renderöi `arvo`; pyöristä renderissä), Pelaaja/Master per-testi-näkymät joissa raaka-aika näkyy (grep `+'s'`/`+' s'` renderöinnit). EI muuta tallennettua raakadataa — vain esitys.

## Osa G — lib ?v-nosto (jotta A+E+F deployautuu heti, ei 10 min cache-viivettä)
`tm_eerikkila_normit.js` muuttuu → nosta `?v=38` → `?v=39` KAIKISSA lataajissa (grep `tm_eerikkila_normit.js?v=`): VP_v25, Master_v16, Pelaaja_v7, Vanhempi_v2, Excel_Tuonti, Testaus_v9, muut. (Tämä on lib-cache-bust, ERI kuin version.json §33 — sitä EI bumpata.)

## Testit / verifiointi
- **Vitest** (`tests/eerikkila_normit.test.js`): `radarPatteristotSaatavilla` (HH5/TK0→{hh:true,tk:false}, HH3/TK4→both, HH2/TK4→{hh:false,tk:true}); `tavoiteRadarAkselit(team,'tk')` pakottaa TK vaikka HH rikkaampi; `tavoiteRadarAkselit(team,'hh')` pakottaa HH; kohortilla ilman TK-dataa + pakotettu 'tk' → null. `_fmtTestiArvo` (5.227→'5.23', 30→'30' cm, 18.4→'18.4' km/h). Aja `npm test` (kaikki vihreät) + `npm run lint`.
- **Live-verify** (Sibbo, SA): T12 — vaihda kohorttia Paras↔Top-5↔Koko joukkue → radar-tyyppi EI vaihdu (pysyy valitussa); Fyysinen|Tekninen-napit vaihtavat radaria; SJK ei nappeja (fyysinen). Pelaajaraportti Fyysinen-tab näyttää **Ketteryys**-rivin. Kaikki testiajat 2 desimaalia. Radar-akseli + jakauma lukevat "Ketteryys".

## Guardrailit
- Arviointi ennallaan (eerikkilaTaso/tkLajiTaso/normiIka). §26 pikakentät (`hh_viimeisin.kasirata` jne.), ei alikokoelmakyselyjä. §5 teal/amber. VP-facing → §7.22 ei koske. version.json EI bumpata (Osa G = lib-`?v`, eri asia). Feature branch → PR.
