# K4d — Fyysinen-kortin profiilitulkinta (CMJ × sprintti × kasirata)

Kaista: **Tero** (lib + VP-HTML). Pohja: origin/main 50574c65. Erä 88 (sv tyhjä, PM kirjoittaa). Ei Rules-muutoksia, ei uusia kenttiä. PR draftina, ei mergeä.

## Mitä
Kehitystyöpöydän Profiili-välilehden Fyysinen-kortti nimeää nyt vain heikoimman testin. K4d lisää yhdistelmätulkinnan: hyppytaso (CMJ) × sprinttitaso (30 m, muuten 10 m) × kasirata kertoo, *mitä* harjoitellaan. Peruste: KPV-data (221 pelaajaa) CMJ–30 m r = −0,78; kasirata–30 m r = 0,65 → suunnanmuutos on oma ominaisuutensa.

## Miten
- Uusi pure-lib `lib/tm_fyysinen_profiili.js` (`tmFyysinenProfiili(syote, phv)` → `{tyyppi, alue}` | null; `tmFyysinenSyote(rows, p)` kokoaa syötteen perTestTasot-riveistä). `lib/tm_todistekortit.js` on 480 r → logiikka omaan libiin (kuori/lib-katto ei ylity).
- Syöte = ikä- ja sukupuolinormitetut **tasot** (perTestTasot-ketju, testihetken ikä §14), ei raaka-arvoja. Testin mittauspäivä = testin oma piste hh_historiasta (jos uusin piste = hh_viimeisin-arvo), muuten hh_pvm.
- PHV luetaan vain `tmPhvTila`:n kautta (kortin `phv`).
- Kortti: tulkinta korvaa toisen virkkeen ("Vahvin …, heikoin …") → enintään 2 virkettä (D102). ⓘ: "Perustuu hyppytason ja sprinttitason eroon samanikäisiin verrattuna." Kehityskohde-linkki ennallaan. Vain henkilökunta (§7.22); pelaaja-/vanhempi-appit eivät lataa korttilibejä.
- VP:n ⓘ-ohje (`TM_TESTI_OHJEET.cmj.vinkki`) päivitetään samaan sanomaan. Vanhaa Masteria ei muuteta.

## Kynnysarvot (vakiot `KYNNYS`, yksi paikka)
| Ehto (tasot 1–5, järjestyksessä) | tyyppi |
|---|---|
| CMJ ≤ 2 ja sprintti ≤ 2 (`VOIMA_MAX` = 2) | voima |
| CMJ − sprintti ≥ 1,5 (`JUOKSU_EROTUS`) | juoksu |
| sprintti − kasirata ≥ 1,5 (`SUUNNANMUUTOS_EROTUS`) | suunnanmuutos |
| muuten / vertailu mahdoton | null |
Vertailu vain jos molemmat tasot olemassa ja mittaukset ≤ 30 pv toisistaan (`PAIVAT_MAX`).
Kasvuvaihe (§28): PH → ei tulkintaa; tuntematon/PRE/LAH → `voima` ei näy, `juoksu` ja `suunnanmuutos` saavat näkyä; POST/AN → kaikki.

## Toimintokartta (D158)
| Kortti | Mitä näkyy | Kuka näkee |
|---|---|---|
| Profiili → Fyysinen | toinen virke = tulkinta (voima/juoksu/suunnanmuutos) + ⓘ-selite | valmentaja, VP (henkilökunta) |
| VP testiohje (CMJ ⓘ) | sama sääntö sanoina | VP/valmentaja |
| Pelaaja-/vanhempi-appi | ei mitään | — |

## Tekstit
Erä 88: neljä uutta avainta (`tc_fy_tulk_voima|juoksu|suunnanmuutos|selite`), osio `lib.tm_todistekortit`, sv tyhjä; `ODOTTAVAT_ERAT` + `LIB_SV_ODOTTAA`.

## Testit
Neljä tyyppiä + rajatapaukset (ero 1,5; 30 m puuttuu → 10 m; > 30 pv → null); PHV PH → null; tuntematon + voima → null; tuntematon + juoksu → näkyy; kortti ≤ 2 virkettä, ei lukuja, ei pelaaja-/perhe-apeissa; kuvat 1280 + 390 kolmella fixturella (docs/ui-kuvat/k4d/).
