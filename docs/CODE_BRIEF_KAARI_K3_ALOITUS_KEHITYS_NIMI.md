# Kehityskaari K3 — Aloitus-siru + Kehitys-evidenssi + nimikorjaus (Jaksohistoria) · Code-brief

> **Miksi:** Kolme pientä kytkentää samaan komponenttiin, + nimitörmäyksen korjaus.
> **(A) Aloitus** = narratiivi → kompakti **siru** (minisparkline + arvo + suunta), klikkaus avaa täyden kaaren Mittauksessa.
> **(B) Kehitys TASO 2** = jaksofokuksen viereen **kohdennetun ominaisuuden mini-kaari** (jaksosidos) → fokusvalinta dataperusteinen.
> **(C) Nimikorjaus:** koodissa "Kehityskaari" tarkoittaa **kahta** asiaa — mitattua trendiä (`tm_kehityskaari.js`) JA jaksofokusten meso-historiaa
> (VP Kehitys **TASO 3**, `_vpMesoKaariHTML`). Varaa nimi *Kehityskaari* mitatulle trendille; **nimeä TASO 3 → "Jaksohistoria" (Player Journey)**.
> **Varmistettu:** TASO 3 render = `row('_accKaari','🗺','TASO 3 · HISTORIA','Kehityskaari', …)` (~5647). Reuse `tmKehityskaari` + `tmKaariJaksoSidos`. VP-only. Ei `?v`.

## CODE-SÄÄNNÖT
- **Poikkeama = ilmoita ENNEN.** Reuse `tmKehityskaari` (kompakti). **Älä koske:** kausitavoite/jaksofokus-logiikkaan · meso-historian dataan (vain otsikko/nimi muuttuu) · moottoriin.
- **§7.22/§22/§28** ennallaan. **Brändi §5:** teal ainoa aksentti, 0 pinkkiä.

## MUUTOS A — Aloitus-siru (kompakti kutsu)
Aloitus-välilehden yläosaan **rivi minisparkline-siruja** avainmittareista (30m · FLEI · TKI): sama data-mappaus kuin K1, mutta **kompakti muoto**.
- Käytä `tmKehityskaari`:n kompaktia tilaa jos `opts.kompakti` on (JOS ei ole → **ilmoita ENNEN**, lisätään pieni `opts.kompakti`-haara komponenttiin, tai käytä olemassa olevaa `_sparkline`-apuria + arvo/nuoli). **Älä tee omaa uutta sirua ohi komponentin.**
- Klikkaus → `onCta` = `_jspVaihda(<Mittaus-indeksi>)` (avaa täyden kaaren). Progressiivinen paljastus, ei numeromassaa Aloitukseen.

## MUUTOS B — Kehitys TASO 2: kaari jaksofokuksen viereen
Jaksofokus-editorin/yhteenvedon viereen (TASO 2) **kohdennetun ominaisuuden mini-kaari** + `tmKaariJaksoSidos`-delta aktiiviselle jaksolle
("tämän fokuksen aikana: 30m 4.80→4.62"). Domeeni→sarja-mappaus sama kuin K2 (fyysinen/teknis→sarja; psyykkinen/sosiaalinen→ei kaarta, rehellinen tyhjä).
→ valmentaja näkee **perusteen** fokukselle samassa näkymässä.

## MUUTOS C — nimikorjaus TASO 3 → "Jaksohistoria"
- Vaihda TASO 3 -haitarirvin **otsikko** `'Kehityskaari'` → **`'Jaksohistoria'`** (alaotsikko esim. "suljetut jaksofokukset · Player Journey").
  Rivi `row('_accKaari','🗺','TASO 3 · HISTORIA', 'Jaksohistoria', …)` (~5647). **Vain teksti/label** — `_vpMesoKaariHTML`-data ja -logiikka ennallaan.
- Tarkista muut käyttöpaikat joissa meso-historiaa kutsutaan "Kehityskaareksi" (esim. R1 suunnitelman kaari ~5811 "Kehityskaari"-label) → yhtenäistä "Jaksohistoria" **vain kun kyse on meso-historiasta**, EI kun kyse on mitatusta trendistä.

## INVARIANTIT + DoD
- **Yksi komponentti:** Aloitus-siru + Kehitys-evidenssi molemmat `tmKehityskaari`:sta (ei uutta sirua). Meso-historia (TASO 3) vain uudelleennimetty, data ennallaan.
- **Ei sekaannusta:** "Kehityskaari" = mitattu trendi kaikkialla; meso = "Jaksohistoria/Player Journey".
- **Brändi:** 0 pinkkiä, teal aksentti, molemmat teemat. **§7.22/§22/§28** ennallaan.
- **LIVE:** Aloituksessa siru-rivi (klikkaus → Mittaus) · Kehityksessä TASO 2:ssa jaksosidos-kaari · TASO 3 otsikko "Jaksohistoria" (sisältö ennallaan) · psyykkinen-jakso → ei kaarta. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ
- Pelaaja-variantti → K4. ADAR → K5. Jos `opts.kompakti` vaatii komponenttiin lisän → erillinen mini-muutos (ilmoita ENNEN).
